'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HeaderBanner } from '@/components/HeaderBanner';
import { TaskLogTable, TaskItem } from '@/components/TaskLogTable';
import { DailySummaryTable } from '@/components/DailySummaryTable';
import { WeeklySummaryTable } from '@/components/WeeklySummaryTable';
import { TrendCharts } from '@/components/TrendCharts';
import { TaskEntryModal } from '@/components/TaskEntryModal';
import { ProjectManagerModal } from '@/components/ProjectManagerModal';
import { ImportExportModal } from '@/components/ImportExportModal';
import { SettingsModal } from '@/components/SettingsModal';
import { getLogicalDate, getDateRangePreset } from '@/lib/logical-day';
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
  const [cutoffHour, setCutoffHour] = useState<number>(0);
  const [dailyTargetHours, setDailyTargetHours] = useState<number>(8.0);
  const [hourlyRate, setHourlyRate] = useState<number>(0.0);

  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [dailyRows, setDailyRows] = useState<any[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<any[]>([]);

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

  // Load Settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setCutoffHour(data.logicalCutoffHour ?? 0);
        setDailyTargetHours(data.dailyTargetHours ?? 8.0);
        setHourlyRate(data.hourlyRate ?? 0.0);
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  }, []);

  // Load Projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects?all=true');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      console.error('Error fetching projects:', e);
    }
  }, []);

  // Load Task Log
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
        setTasks(data);
      }
    } catch (e) {
      console.error('Error fetching tasks:', e);
    }
  }, [startDate, endDate, selectedProjectId, selectedStatus, searchQuery]);

  // Load Daily Summary
  const fetchDailySummary = useCallback(async () => {
    try {
      const { startDate: pStart, endDate: pEnd } = getDateRangePreset(dailyPreset, cutoffHour);
      const params = new URLSearchParams();
      if (pStart) params.append('startDate', pStart);
      if (pEnd) params.append('endDate', pEnd);

      const res = await fetch(`/api/summary/daily?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDailyRows(data.rows || []);
      }
    } catch (e) {
      console.error('Error fetching daily summary:', e);
    }
  }, [dailyPreset, cutoffHour]);

  // Load Weekly Summary
  const fetchWeeklySummary = useCallback(async () => {
    try {
      const res = await fetch('/api/summary/weekly');
      if (res.ok) {
        const data = await res.json();
        setWeeklyRows(data.rows || []);
      }
    } catch (e) {
      console.error('Error fetching weekly summary:', e);
    }
  }, []);

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

  useEffect(() => {
    fetchDailySummary();
  }, [fetchDailySummary]);

  useEffect(() => {
    fetchWeeklySummary();
  }, [fetchWeeklySummary]);

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
    fetchDailySummary();
    fetchWeeklySummary();
    fetchProjects();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task entry?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        handleRefreshAll();
      }
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
            activePreset={dailyPreset}
            onSelectPreset={(preset) => setDailyPreset(preset)}
          />
        )}

        {activeTab === 'weekly' && (
          <WeeklySummaryTable
            rows={weeklyRows}
            projects={projects}
            weeklyTargetHours={dailyTargetHours * 5}
          />
        )}

        {activeTab === 'analytics' && (
          <TrendCharts
            dailyRows={dailyRows}
            projects={projects}
            targetHours={dailyTargetHours}
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
