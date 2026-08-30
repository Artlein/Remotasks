'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HeaderBanner } from '@/components/HeaderBanner';
import { TaskLogTable, TaskItem } from '@/components/TaskLogTable';
import { DailySummaryTable } from '@/components/DailySummaryTable';
import { WeeklySummaryTable } from '@/components/WeeklySummaryTable';
import { TrendCharts } from '@/components/TrendCharts';
import { TaskEntryModal } from '@/components/TaskEntryModal';
import { ProjectManagerModal } from '@/components/ProjectManagerModal';
import { ImportExportModal } from '@/components/ImportExportModal';
import { SettingsModal } from '@/components/SettingsModal';
import { SmartReminder } from '@/components/SmartReminder';
import { LiveTimerWidget } from '@/components/LiveTimerWidget';
import { getLogicalDate } from '@/lib/logical-day';
import {
  DEFAULT_PROJECTS,
  DEFAULT_SETTINGS,
  loadStoredTasks,
  saveStoredTasks,
  loadStoredProjects,
  saveStoredProjects,
  loadStoredSettings,
  saveStoredSettings,
  computeDailyRollup,
  computeWeeklyRollup,
} from '@/lib/client-sync';
import { FileText, Calendar, CalendarRange, BarChart2, Plus } from 'lucide-react';
import { subDays } from 'date-fns';

interface Project {
  id: string;
  name: string;
  active: boolean;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'log' | 'daily' | 'weekly' | 'analytics'>('log');

  // Settings State
  const [cutoffHour, setCutoffHour] = useState<number>(DEFAULT_SETTINGS.logicalCutoffHour);
  const [dailyTargetHours, setDailyTargetHours] = useState<number>(DEFAULT_SETTINGS.dailyTargetHours);
  const [hourlyRate, setHourlyRate] = useState<number>(DEFAULT_SETTINGS.hourlyRate);

  // Data State
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  // Selected Date State for Header & Task Log Quick Nav
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  // Filter State for Task Log
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Daily Summary Preset State
  const [dailyPreset, setDailyPreset] = useState<'this_week' | 'last_week' | 'this_month' | 'all'>('this_week');

  // Modal Visibility States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Hydrate from LocalStorage on mount so data is 100% instant and survives refresh
  useEffect(() => {
    const storedSettings = loadStoredSettings();
    if (storedSettings) {
      setCutoffHour(storedSettings.logicalCutoffHour ?? 0);
      setDailyTargetHours(storedSettings.dailyTargetHours ?? 8.0);
      setHourlyRate(storedSettings.hourlyRate ?? 0.0);
    }

    const storedProjects = loadStoredProjects();
    if (storedProjects && storedProjects.length > 0) {
      setProjects(storedProjects);
    }

    const storedTasks = loadStoredTasks();
    if (storedTasks && storedTasks.length > 0) {
      setTasks(storedTasks);
    }
  }, []);

  // Load Settings from API in background
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const newCutoff = data.logicalCutoffHour ?? 0;
        const newTarget = data.dailyTargetHours ?? 8.0;
        const newRate = data.hourlyRate ?? 0.0;
        setCutoffHour(newCutoff);
        setDailyTargetHours(newTarget);
        setHourlyRate(newRate);
        saveStoredSettings({
          id: 'default',
          logicalCutoffHour: newCutoff,
          dailyTargetHours: newTarget,
          hourlyRate: newRate,
        });
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  }, []);

  // Load Projects from API in background
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects?all=true');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          saveStoredProjects(data);
        }
      }
    } catch (e) {
      console.error('Error fetching projects:', e);
    }
  }, []);

  // Load Task Log from API in background
  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedProjectId !== 'ALL') params.append('projectId', selectedProjectId);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // If query parameters are active, only update filtered view
          const hasFilters = startDate || endDate || selectedProjectId !== 'ALL' || selectedStatus !== 'ALL' || searchQuery;
          if (!hasFilters) {
            setTasks((prev) => {
              // Merge stored and server tasks without losing client-side additions
              if (data.length === 0 && prev.length > 0) {
                return prev; // keep local tasks if server is cold-restarted
              }
              const mergedMap = new Map<string, TaskItem>();
              prev.forEach((t) => mergedMap.set(t.id, t));
              data.forEach((t: TaskItem) => mergedMap.set(t.id, t));
              const merged = Array.from(mergedMap.values()).sort((a, b) => b.date.localeCompare(a.date));
              saveStoredTasks(merged);
              return merged;
            });
          } else {
            setTasks(data);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching tasks:', e);
    }
  }, [startDate, endDate, selectedProjectId, selectedStatus, searchQuery]);

  // Initial Setup & Default Date Selection
  useEffect(() => {
    fetchSettings();
    fetchProjects();
    const todayLogical = getLogicalDate(new Date(), cutoffHour);
    setSelectedDateStr(todayLogical);
  }, [fetchSettings, fetchProjects, cutoffHour]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Dynamic Daily and Weekly Rollup calculations directly from tasks state
  const dailyRows = useMemo(() => {
    return computeDailyRollup(tasks, dailyTargetHours, dailyPreset, cutoffHour);
  }, [tasks, dailyTargetHours, dailyPreset, cutoffHour]);

  const weeklyRows = useMemo(() => {
    return computeWeeklyRollup(tasks, dailyTargetHours * 5);
  }, [tasks, dailyTargetHours]);

  // Keyboard Shortcuts Handler (Cmd+K / Ctrl+K / N -> open Task Entry)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setEditingTask(null);
        setIsTaskModalOpen(true);
      } else if (
        e.key.toLowerCase() === 'n' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setEditingTask(null);
        setIsTaskModalOpen(true);
      } else if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
        setIsProjectModalOpen(false);
        setIsImportExportModalOpen(false);
        setIsSettingsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRefreshAll = () => {
    fetchTasks();
    fetchProjects();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task entry?')) return;
    
    // Immediately delete from client state & local storage
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      saveStoredTasks(updated);
      return updated;
    });

    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Error deleting task:', e);
    }
  };

  // Calculate Streak Days
  const calculateStreak = (): number => {
    if (dailyRows.length === 0) return 0;
    const dailyMap = new Map<string, number>();
    dailyRows.forEach((r) => dailyMap.set(r.date, r.totalHours));

    let streak = 0;
    let checkDate = new Date();

    for (let i = 0; i < 365; i++) {
      const dateKey = getLogicalDate(checkDate, cutoffHour);
      const hours = dailyMap.get(dateKey) || 0;
      if (hours > 0) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else if (i === 0) {
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const todayLogicalStr = getLogicalDate(new Date(), cutoffHour);
  const activeDate = selectedDateStr || todayLogicalStr;

  // Selected Day Stats for Header
  const selectedDayTasks = tasks.filter((t) => t.date === activeDate);
  const selectedDayMinutes = selectedDayTasks.reduce((sum, t) => sum + t.durationMinutes, 0);

  const selectedDayProjectBreakdown: Record<string, number> = {};
  selectedDayTasks.forEach((t) => {
    const pName = t.project?.name || 'Unknown';
    selectedDayProjectBreakdown[pName] = (selectedDayProjectBreakdown[pName] || 0) + t.durationMinutes;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <SmartReminder tasks={tasks} cutoffHour={cutoffHour} />
      {/* Header Banner */}
      <HeaderBanner
        todayDateStr={todayLogicalStr}
        selectedDateStr={activeDate}
        onSelectDate={(d) => setSelectedDateStr(d)}
        cutoffHour={cutoffHour}
        todayMinutes={selectedDayMinutes}
        dailyTargetHours={dailyTargetHours}
        hourlyRate={hourlyRate}
        projectBreakdown={selectedDayProjectBreakdown}
        streakDays={calculateStreak()}
        onOpenTaskModal={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onOpenImportExportModal={() => setIsImportExportModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 mb-6 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'log', label: 'Task Log', icon: FileText },
            { id: 'daily', label: 'Daily Rollup', icon: Calendar },
            { id: 'weekly', label: 'Weekly Rollup', icon: CalendarRange },
            { id: 'analytics', label: 'Analytics & Trends', icon: BarChart2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <LiveTimerWidget 
            projects={projects}
            onStopTimer={(minutes, projectId) => {
              setEditingTask({
                id: '',
                date: activeDate,
                projectId: projectId,
                project: projects.find(p => p.id === projectId),
                description: '',
                durationMinutes: minutes,
                status: 'Done',
                notes: ''
              } as TaskItem);
              setIsTaskModalOpen(true);
            }}
          />
          <button
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            className="hidden sm:flex items-center gap-1.5 skeuo-button px-3.5 py-1.5 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Log Task
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <main>
        {activeTab === 'log' && (
          <TaskLogTable
            tasks={tasks}
            projects={projects}
            cutoffHour={cutoffHour}
            selectedDateStr={activeDate}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onTaskCreatedOrUpdated={handleRefreshAll}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onResetFilters={() => {
              setSearchQuery('');
              setSelectedProjectId('ALL');
              setSelectedStatus('ALL');
              setStartDate('');
              setEndDate('');
            }}
          />
        )}

        {activeTab === 'daily' && (
          <DailySummaryTable
            rows={dailyRows}
            projects={projects}
            targetHours={dailyTargetHours}
            hourlyRate={hourlyRate}
            activePreset={dailyPreset}
            onSelectPreset={(preset) => setDailyPreset(preset)}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklySummaryTable
            rows={weeklyRows}
            projects={projects}
            weeklyTargetHours={dailyTargetHours * 5}
            hourlyRate={hourlyRate}
          />
        )}

        {activeTab === 'analytics' && (
          <TrendCharts
            dailyRows={dailyRows}
            projects={projects}
            targetHours={dailyTargetHours}
            hourlyRate={hourlyRate}
          />
        )}
      </main>

      {/* Modals */}
      <TaskEntryModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        projects={projects}
        cutoffHour={cutoffHour}
        initialTask={editingTask}
        onSave={handleRefreshAll}
        onOpenProjectManager={() => setIsProjectModalOpen(true)}
      />

      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        projects={projects}
        onRefresh={handleRefreshAll}
      />

      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        onImportSuccess={handleRefreshAll}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        cutoffHour={cutoffHour}
        dailyTargetHours={dailyTargetHours}
        hourlyRate={hourlyRate}
        onSaveSuccess={() => {
          fetchSettings();
          handleRefreshAll();
        }}
      />
    </div>
  );
}
