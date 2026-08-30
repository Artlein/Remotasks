'use client';

import React, { useState } from 'react';
import { Search, Calendar, Edit3, Trash2, ChevronLeft, ChevronRight, FileText, RefreshCw, XCircle, Filter, Plus, AlertCircle, Zap, Copy } from 'lucide-react';
import { formatMinutesToDuration, formatMinutesToFriendly, formatMinutesToDecimal, parseDurationToMinutes, getLogicalDate } from '@/lib/logical-day';

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

interface Project {
  id: string;
  name: string;
  active: boolean;
}

interface TaskLogTableProps {
  tasks: TaskItem[];
  projects: Project[];
  cutoffHour: number;
  selectedDateStr: string;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskCreatedOrUpdated: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  selectedStatus: string;
  setSelectedStatus: (s: string) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  onResetFilters: () => void;
}

export function TaskLogTable({
  tasks,
  projects,
  cutoffHour,
  selectedDateStr,
  onEditTask,
  onDeleteTask,
  onTaskCreatedOrUpdated,
  searchQuery,
  setSearchQuery,
  selectedProjectId,
  setSelectedProjectId,
  selectedStatus,
  setSelectedStatus,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onResetFilters,
}: TaskLogTableProps) {
  // Fast-Log Bar State
  const [fastProjectId, setFastProjectId] = useState<string>('');
  const [fastDescription, setFastDescription] = useState<string>('');
  const [fastDurationStr, setFastDurationStr] = useState<string>('30m');
  const [fastStatus, setFastStatus] = useState<string>('Done');
  const [isFastSubmitting, setIsFastSubmitting] = useState(false);
  const [fastError, setFastError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const FALLBACK_PROJECTS: Project[] = [
    { id: 'fna1', name: 'FNA1', active: true },
    { id: 'crane_gamer', name: 'Crane_Gamer', active: true },
    { id: 'ego_vlm', name: 'Ego_VLM', active: true },
    { id: 'duck', name: 'Duck', active: true },
    { id: 'aloha_ots', name: 'Aloha_OTS', active: true },
    { id: 'cobra', name: 'Cobra', active: true },
  ];

  // Active Projects List
  const activeProjects = projects.length > 0 ? projects.filter((p) => p.active) : FALLBACK_PROJECTS;
  const filterProjects = projects.length > 0 ? projects : FALLBACK_PROJECTS;

  // Set default project ID for fast log if empty
  React.useEffect(() => {
    if ((!fastProjectId || !activeProjects.some(p => p.id === fastProjectId)) && activeProjects.length > 0) {
      setFastProjectId(activeProjects[0].id);
    }
  }, [activeProjects, fastProjectId]);

  // Handle Fast-Log Submission
  const handleFastLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFastError(null);

    if (!fastProjectId) {
      setFastError('Select project');
      return;
    }

    if (!fastDescription.trim()) {
      setFastError('Enter task description');
      return;
    }

    const minutes = parseDurationToMinutes(fastDurationStr);
    if (minutes <= 0) {
      setFastError('Enter valid duration (e.g. 1h 30m or 45m)');
      return;
    }

    setIsFastSubmitting(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDateStr || getLogicalDate(new Date(), cutoffHour),
          projectId: fastProjectId,
          description: fastDescription.trim(),
          durationStr: fastDurationStr,
          durationMinutes: minutes,
          status: fastStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add task');
      }

      setFastDescription('');
      onTaskCreatedOrUpdated();
    } catch (err: any) {
      setFastError(err.message || 'Error logging task');
    } finally {
      setIsFastSubmitting(false);
    }
  };

  // Feature 3: Duplicate Task -> Pre-fill Fast Log bar
  const handleDuplicateTask = (task: TaskItem) => {
    setFastProjectId(task.projectId);
    setFastDescription(task.description);
    setFastDurationStr(task.durationMinutes < 60 ? `${task.durationMinutes}m` : formatMinutesToDuration(task.durationMinutes));
    setFastStatus(task.status || 'Done');

    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Toggle Status directly on table row (Done -> Review -> Pending -> Done)
  const handleToggleStatus = async (task: TaskItem) => {
    const statusCycle: Record<string, string> = {
      Done: 'Review',
      Review: 'Pending',
      Pending: 'Done',
    };
    const nextStatus = statusCycle[task.status] || 'Done';

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        onTaskCreatedOrUpdated();
      }
    } catch (e) {
      console.error('Failed to toggle status:', e);
    }
  };

  const totalMinutes = tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const totalHours = formatMinutesToDecimal(totalMinutes);

  // Pagination calculation
  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const paginatedTasks = tasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: string, onClick?: () => void) => {
    switch (status) {
      case 'Done':
        return (
          <button
            onClick={onClick}
            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1.5 hover:bg-emerald-500/20 transition cursor-pointer"
            title="Click to toggle status (Done -> Review -> Pending)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Done
          </button>
        );
      case 'Review':
        return (
          <button
            onClick={onClick}
            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25 inline-flex items-center gap-1.5 hover:bg-amber-500/20 transition cursor-pointer"
            title="Click to toggle status (Review -> Pending -> Done)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Review
          </button>
        );
      case 'Pending':
        return (
          <button
            onClick={onClick}
            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/25 inline-flex items-center gap-1.5 hover:bg-slate-500/20 transition cursor-pointer"
            title="Click to toggle status (Pending -> Done -> Review)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Pending
          </button>
        );
      default:
        return (
          <button
            onClick={onClick}
            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/25 cursor-pointer"
          >
            {status}
          </button>
        );
    }
  };

  const hasActiveFilters = searchQuery || selectedProjectId !== 'ALL' || selectedStatus !== 'ALL' || startDate || endDate;

  return (
    <div className="space-y-5">
      {/* 1. Fast-Log Bar */}
      <div className="skeuo-panel p-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Fast-Log Task</span>
            <span className="text-[11px] text-slate-400">Target Date: <strong className="text-slate-200">{selectedDateStr}</strong></span>
          </div>

          {fastError && (
            <span className="text-xs text-rose-400 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {fastError}
            </span>
          )}
        </div>

        <form onSubmit={handleFastLogSubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Project Select */}
          <select
            value={fastProjectId}
            onChange={(e) => setFastProjectId(e.target.value)}
            className="glass-input text-xs bg-slate-900 py-2 w-full sm:w-[150px] shrink-0 cursor-pointer"
            required
          >
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                {p.name}
              </option>
            ))}
          </select>

          {/* Description Input */}
          <input
            type="text"
            value={fastDescription}
            onChange={(e) => setFastDescription(e.target.value)}
            placeholder="Type task description and hit Enter..."
            className="glass-input text-xs py-2 flex-1 w-full"
            required
          />

          {/* Duration Input */}
          <input
            type="text"
            value={fastDurationStr}
            onChange={(e) => setFastDurationStr(e.target.value)}
            placeholder="e.g. 20m or 45"
            className="glass-input text-xs py-2 font-mono w-full sm:w-[110px] shrink-0"
            required
          />

          {/* Status */}
          <select
            value={fastStatus}
            onChange={(e) => setFastStatus(e.target.value)}
            className="glass-input text-xs bg-slate-900 py-2 w-full sm:w-[100px] shrink-0 cursor-pointer"
          >
            <option value="Done" className="bg-slate-900 text-emerald-400">Done</option>
            <option value="Review" className="bg-slate-900 text-amber-400">Review</option>
            <option value="Pending" className="bg-slate-900 text-slate-400">Pending</option>
          </select>

          {/* Fast Submit Button */}
          <button
            type="submit"
            disabled={isFastSubmitting}
            className="skeuo-button px-4 py-2 text-xs font-semibold shrink-0 w-full sm:w-auto flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add
          </button>
        </form>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="skeuo-panel p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Task Log ({tasks.length} entries — {totalHours.toFixed(2)}h)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search tasks..."
                className="w-full glass-input text-xs !pl-9.5 !pr-8 py-2"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Single Clean Project Filter Dropdown */}
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setCurrentPage(1);
              }}
              className="glass-input text-xs bg-slate-900 py-2 min-w-[140px] cursor-pointer"
            >
              <option value="ALL">All Projects</option>
              {filterProjects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="glass-input text-xs bg-slate-900 py-2 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Done">Done</option>
              <option value="Review">Review</option>
              <option value="Pending">Pending</option>
            </select>

            {/* Date Range Picker */}
            <div className="flex items-center gap-1.5 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none w-[110px]"
              />
              <span className="text-slate-500 font-medium">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none w-[110px]"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={onResetFilters}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition flex items-center gap-1"
                title="Clear all filters"
              >
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Task Log Table */}
      <div className="skeuo-panel p-5">
        <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-4">Date</th>
                <th className="py-4 px-4">Project</th>
                <th className="py-4 px-4">Task Description</th>
                <th className="py-4 px-4">Duration</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Notes</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="font-semibold text-slate-300 text-sm">No task entries found</p>
                      <p className="text-xs text-slate-500">
                        {hasActiveFilters
                          ? 'Try clearing your active filters.'
                          : 'Use Fast-Log above to log your first work task!'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-4 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {task.date}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-slate-200 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        {task.project?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-200 font-medium max-w-md break-words">
                      {task.description}
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-blue-400 font-bold whitespace-nowrap">
                      {formatMinutesToDuration(task.durationMinutes)}
                      <span className="text-slate-500 font-normal ml-1.5 text-[11px]">
                        ({formatMinutesToFriendly(task.durationMinutes)})
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getStatusBadge(task.status, () => handleToggleStatus(task))}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-400 max-w-xs truncate">
                      {task.notes || '—'}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        {/* Duplicate Button (Feature 3) */}
                        <button
                          onClick={() => handleDuplicateTask(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                          title="Re-log / Duplicate this task"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditTask(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                          title="Edit task"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, tasks.length)} of {tasks.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-200">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
