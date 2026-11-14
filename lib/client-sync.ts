import { format, parseISO, startOfWeek, endOfWeek, subDays, startOfMonth, endOfMonth } from 'date-fns';

export interface TaskItem {
  id: string;
  date: string;
  projectId: string;
  project: {
    id: string;
    name: string;
  };
  description: string;
  durationMinutes: number;
  status: string;
  notes?: string | null;
}

export interface ProjectItem {
  id: string;
  name: string;
  active: boolean;
}

export interface SystemSettingsItem {
  id: string;
  logicalCutoffHour: number;
  dailyTargetHours: number;
  hourlyRate: number;
}

export const DEFAULT_PROJECTS: ProjectItem[] = [
  { id: 'fna1', name: 'FNA1', active: true },
  { id: 'crane_gamer', name: 'Crane_Gamer', active: true },
  { id: 'ego_vlm', name: 'Ego_VLM', active: true },
  { id: 'duck', name: 'Duck', active: true },
  { id: 'aloha_ots', name: 'Aloha_OTS', active: true },
  { id: 'cobra', name: 'Cobra', active: true },
];

export const DEFAULT_SETTINGS: SystemSettingsItem = {
  id: 'default',
  logicalCutoffHour: 0,
  dailyTargetHours: 8.0,
  hourlyRate: 0.0,
};

const PERMANENT_VAULT_KEY = 'remotasks_tasks_permanent_vault';

export function getSavedUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return localStorage.getItem('remotasks_active_user_id') || undefined;
  } catch {
    return undefined;
  }
}

export function getSavedUsername(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return localStorage.getItem('remotasks_active_username') || undefined;
  } catch {
    return undefined;
  }
}

function getStorageKeys(userId?: string) {
  const effectiveId = userId || getSavedUserId();
  const suffix = effectiveId ? `_${effectiveId}` : '';
  return {
    TASKS: `remotasks_tasks_v1${suffix}`,
    PROJECTS: `remotasks_projects_v1${suffix}`,
    SETTINGS: `remotasks_settings_v1${suffix}`,
  };
}

function STORAGE_KEYS() {
  if (typeof window === 'undefined') return getStorageKeys();
  const userId = ((window as any).__RT_USER_ID as string | undefined) || getSavedUserId();
  return getStorageKeys(userId);
}

/**
 * Load tasks from LocalStorage across all known keys and permanent vault.
 * Deduplicates and guarantees no October/November records are ever lost.
 */
export function loadStoredTasks(overrideUserId?: string, overrideUsername?: string): TaskItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const activeUserId = overrideUserId || ((window as any).__RT_USER_ID as string | undefined) || getSavedUserId();
    const activeUsername = overrideUsername || ((window as any).__RT_USERNAME as string | undefined) || getSavedUsername();
    const keys = getStorageKeys(activeUserId);

    const taskMap = new Map<string, TaskItem>();

    const collectTasks = (rawJson: string | null) => {
      if (!rawJson) return;
      try {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && typeof item === 'object' && item.date && item.durationMinutes) {
              const task: TaskItem = {
                id: String(item.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
                date: String(item.date),
                projectId: String(item.projectId || 'fna1'),
                project: item.project || { id: 'fna1', name: 'FNA1' },
                description: String(item.description || ''),
                durationMinutes: Math.round(Number(item.durationMinutes) || 0),
                status: String(item.status || 'Done'),
                notes: item.notes ? String(item.notes) : null,
              };

              // Deduplicate ONLY by unique task ID so identical audits (same duration/desc) are never discarded!
              if (!taskMap.has(task.id)) {
                taskMap.set(task.id, task);
              }
            }
          }
        }
      } catch {}
    };

    // 1. Collect from permanent vault
    collectTasks(localStorage.getItem(PERMANENT_VAULT_KEY));

    // 2. Collect from user-scoped key
    collectTasks(localStorage.getItem(keys.TASKS));

    // 3. Collect from legacy global key
    collectTasks(localStorage.getItem('remotasks_tasks_v1'));

    // 4. Scan all localStorage keys matching remotasks_tasks
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('remotasks_tasks')) {
        collectTasks(localStorage.getItem(k));
      }
    }

    const unifiedTasks = Array.from(taskMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    if (unifiedTasks.length > 0) {
      // Keep storage and permanent vault in sync
      try {
        localStorage.setItem(keys.TASKS, JSON.stringify(unifiedTasks));
        localStorage.setItem(PERMANENT_VAULT_KEY, JSON.stringify(unifiedTasks));
      } catch {}
      return unifiedTasks;
    }
  } catch (e) {
    console.error('Error loading stored tasks:', e);
  }
  return null;
}

/**
 * Save tasks to LocalStorage and Permanent Vault.
 * Unless isDeletion is explicitly true, it never drops existing tasks.
 */
export function saveStoredTasks(tasks: TaskItem[], isDeletion = false) {
  if (typeof window === 'undefined') return;
  try {
    const keys = STORAGE_KEYS();

    let finalTasks = tasks;

    if (!isDeletion) {
      // Merge with any existing tasks in vault so nothing is ever dropped
      const existing = loadStoredTasks();
      if (existing && existing.length > 0) {
        const map = new Map<string, TaskItem>();
        existing.forEach((t) => map.set(t.id, t));
        tasks.forEach((t) => map.set(t.id, t));
        finalTasks = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
      }
    }

    const json = JSON.stringify(finalTasks);
    localStorage.setItem(keys.TASKS, json);
    localStorage.setItem(PERMANENT_VAULT_KEY, json);
  } catch (e) {
    console.error('Error saving tasks to storage:', e);
  }
}

/**
 * Automatically sync local tasks to PostgreSQL with retries and batching.
 */
export async function syncLegacyTasksIfPresent(userId: string, username: string) {
  if (typeof window === 'undefined' || username !== 'arvin') return;
  try {
    const allTasks = loadStoredTasks(userId, username);
    if (!allTasks || allTasks.length === 0) return;

    // Retry up to 3 times
    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('/api/tasks/sync-legacy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: allTasks }),
        });

        if (res.ok) {
          success = true;
          break;
        }
      } catch {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }

    if (success) {
      const keys = getStorageKeys(userId);
      localStorage.setItem(keys.TASKS, JSON.stringify(allTasks));
      localStorage.setItem(PERMANENT_VAULT_KEY, JSON.stringify(allTasks));
    }
  } catch (err) {
    console.error('Error syncing legacy tasks to server:', err);
  }
}

/**
 * Load projects from LocalStorage
 */
export function loadStoredProjects(): ProjectItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS().PROJECTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading stored projects:', e);
  }
  return null;
}

/**
 * Save projects to LocalStorage
 */
export function saveStoredProjects(projects: ProjectItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS().PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error('Error saving projects to storage:', e);
  }
}

/**
 * Load settings from LocalStorage
 */
export function loadStoredSettings(): SystemSettingsItem | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS().SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.error('Error loading stored settings:', e);
  }
  return null;
}

/**
 * Save settings to LocalStorage
 */
export function saveStoredSettings(settings: SystemSettingsItem) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS().SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings to storage:', e);
  }
}

/**
 * Computes Daily Rollup Rows from task list
 */
export function computeDailyRollup(
  tasks: TaskItem[],
  targetHours: number,
  preset: 'this_week' | 'last_week' | 'this_month' | 'all' = 'this_week',
  cutoffHour: number = 0
) {
  const todayDate = new Date();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  if (preset === 'this_week') {
    const start = startOfWeek(todayDate, { weekStartsOn: 2 }); // Tuesday
    const end = endOfWeek(todayDate, { weekStartsOn: 2 }); // Monday
    minDate = format(start, 'yyyy-MM-dd');
    maxDate = format(end, 'yyyy-MM-dd');
  } else if (preset === 'last_week') {
    const lastWeekDate = subDays(todayDate, 7);
    const start = startOfWeek(lastWeekDate, { weekStartsOn: 2 });
    const end = endOfWeek(lastWeekDate, { weekStartsOn: 2 });
    minDate = format(start, 'yyyy-MM-dd');
    maxDate = format(end, 'yyyy-MM-dd');
  } else if (preset === 'this_month') {
    const start = startOfMonth(todayDate);
    const end = endOfMonth(todayDate);
    minDate = format(start, 'yyyy-MM-dd');
    maxDate = format(end, 'yyyy-MM-dd');
  }

  const filteredTasks = tasks.filter((t) => {
    if (minDate && t.date < minDate) return false;
    if (maxDate && t.date > maxDate) return false;
    return true;
  });

  const dateMap: Record<
    string,
    { breakdown: Record<string, number>; totalMinutes: number; taskCount: number }
  > = {};

  for (const t of filteredTasks) {
    if (!dateMap[t.date]) {
      dateMap[t.date] = { breakdown: {}, totalMinutes: 0, taskCount: 0 };
    }
    const pName = t.project?.name || 'Unknown';
    dateMap[t.date].breakdown[pName] =
      (dateMap[t.date].breakdown[pName] || 0) + t.durationMinutes;
    dateMap[t.date].totalMinutes += t.durationMinutes;
    dateMap[t.date].taskCount += 1;
  }

  const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));

  return sortedDates.map((d) => {
    const item = dateMap[d];
    const totalHours = Math.round((item.totalMinutes / 60) * 100) / 100;
    const targetDiffHours = Math.round((totalHours - targetHours) * 100) / 100;

    return {
      date: d,
      projectBreakdown: item.breakdown,
      totalMinutes: item.totalMinutes,
      totalHours,
      targetHours,
      targetDiffHours,
      taskCount: item.taskCount,
    };
  });
}

/**
 * Computes Weekly Rollup Rows from task list (Tuesday to Monday Remotasks Pay Cycle)
 */
export function computeWeeklyRollup(tasks: TaskItem[], weeklyTargetHours: number) {
  const weeklyMap: Record<
    string,
    {
      weekLabel: string;
      startDate: string;
      endDate: string;
      breakdown: Record<string, number>;
      totalMinutes: number;
      taskCount: number;
    }
  > = {};

  for (const task of tasks) {
    const taskDate = parseISO(task.date);
    if (isNaN(taskDate.getTime())) continue;

    const weekStart = startOfWeek(taskDate, { weekStartsOn: 2 }); // Tuesday
    const weekEnd = endOfWeek(taskDate, { weekStartsOn: 2 }); // Monday

    const weekStartKey = format(weekStart, 'yyyy-MM-dd');
    const weekEndKey = format(weekEnd, 'yyyy-MM-dd');
    const label = `${format(weekStart, 'EEE, MMM d')} - ${format(weekEnd, 'EEE, MMM d, yyyy')}`;

    if (!weeklyMap[weekStartKey]) {
      weeklyMap[weekStartKey] = {
        weekLabel: label,
        startDate: weekStartKey,
        endDate: weekEndKey,
        breakdown: {},
        totalMinutes: 0,
        taskCount: 0,
      };
    }

    const projName = task.project?.name || 'Unknown';
    weeklyMap[weekStartKey].breakdown[projName] =
      (weeklyMap[weekStartKey].breakdown[projName] || 0) + task.durationMinutes;
    weeklyMap[weekStartKey].totalMinutes += task.durationMinutes;
    weeklyMap[weekStartKey].taskCount += 1;
  }

  const weekKeys = Object.keys(weeklyMap).sort((a, b) => b.localeCompare(a));

  return weekKeys.map((weekKey) => {
    const item = weeklyMap[weekKey];
    const totalHours = Math.round((item.totalMinutes / 60) * 100) / 100;

    return {
      weekStartKey: weekKey,
      weekLabel: item.weekLabel,
      startDate: item.startDate,
      endDate: item.endDate,
      projectBreakdown: item.breakdown,
      totalMinutes: item.totalMinutes,
      totalHours,
      weeklyTargetHours,
      taskCount: item.taskCount,
    };
  });
}
