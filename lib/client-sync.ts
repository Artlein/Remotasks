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

function getStorageKeys(userId?: string) {
  const suffix = userId ? `_${userId}` : '';
  return {
    TASKS: `remotasks_tasks_v1${suffix}`,
    PROJECTS: `remotasks_projects_v1${suffix}`,
    SETTINGS: `remotasks_settings_v1${suffix}`,
  };
}

// Resolved at runtime from window so it always reflects the active user
function STORAGE_KEYS() {
  if (typeof window === 'undefined') return getStorageKeys();
  const userId = (window as any).__RT_USER_ID as string | undefined;
  return getStorageKeys(userId);
}

/**
 * Load tasks from LocalStorage
 */
export function loadStoredTasks(overrideUserId?: string, overrideUsername?: string): TaskItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const activeUserId = overrideUserId || ((window as any).__RT_USER_ID as string | undefined);
    const activeUsername = overrideUsername || ((window as any).__RT_USERNAME as string | undefined);
    const keys = getStorageKeys(activeUserId);
    let raw = localStorage.getItem(keys.TASKS);

    // ALL legacy pre-multiuser logs belong strictly to Arvin!
    // Never allow other users (e.g. Jude) or unauthenticated states to read legacy data.
    if (!raw && activeUsername === 'arvin') {
      const legacyRaw = localStorage.getItem('remotasks_tasks_v1');
      if (legacyRaw) {
        raw = legacyRaw;
        localStorage.setItem(keys.TASKS, legacyRaw);
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading stored tasks:', e);
  }
  return null;
}

/**
 * Automatically sync any legacy local tasks to the database under Arvin
 */
export async function syncLegacyTasksIfPresent(userId: string, username: string) {
  if (typeof window === 'undefined' || username !== 'arvin') return;
  try {
    const legacyRaw = localStorage.getItem('remotasks_tasks_v1');
    const userKeys = getStorageKeys(userId);
    let tasksToSync: TaskItem[] = [];

    if (legacyRaw) {
      try {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          tasksToSync = parsed;
        }
      } catch {}
    }

    // Also include user's locally stored tasks if any
    const currentRaw = localStorage.getItem(userKeys.TASKS);
    if (currentRaw) {
      try {
        const parsed = JSON.parse(currentRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const ids = new Set(tasksToSync.map((t) => t.id));
          parsed.forEach((t) => {
            if (!ids.has(t.id)) tasksToSync.push(t);
          });
        }
      } catch {}
    }

    if (tasksToSync.length > 0) {
      const res = await fetch('/api/tasks/sync-legacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: tasksToSync }),
      });
      if (res.ok) {
        // Once synced to PostgreSQL, migrate to Arvin's scoped storage and clear legacy key
        localStorage.setItem(userKeys.TASKS, JSON.stringify(tasksToSync));
        localStorage.removeItem('remotasks_tasks_v1');
      }
    }
  } catch (err) {
    console.error('Error syncing legacy tasks to server:', err);
  }
}

/**
 * Save tasks to LocalStorage
 */
export function saveStoredTasks(tasks: TaskItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS().TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Error saving tasks to storage:', e);
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
  // Determine date bounds
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

  // Filter tasks by date if bounds exist
  const filteredTasks = tasks.filter((t) => {
    if (minDate && t.date < minDate) return false;
    if (maxDate && t.date > maxDate) return false;
    return true;
  });

  // Group by date
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
