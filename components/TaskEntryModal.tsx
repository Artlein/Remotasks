'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Folder, FileText, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { getLogicalDate, parseDurationToMinutes, formatMinutesToDuration } from '@/lib/logical-day';

interface Project {
  id: string;
  name: string;
  active: boolean;
}

interface TaskEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  cutoffHour: number;
  initialTask?: {
    id?: string;
    date: string;
    projectId: string;
    description: string;
    durationMinutes: number;
    status: string;
    notes?: string | null;
  } | null;
  onSave: () => void;
  onOpenProjectManager: () => void;
}

export function TaskEntryModal({
  isOpen,
  onClose,
  projects,
  cutoffHour,
  initialTask,
  onSave,
  onOpenProjectManager,
}: TaskEntryModalProps) {
  const [date, setDate] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [durationStr, setDurationStr] = useState<string>('1:00');
  const [status, setStatus] = useState<string>('Done');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setDate(initialTask.date);
        setProjectId(initialTask.projectId);
        setDescription(initialTask.description);
        
        const hrs = Math.floor(initialTask.durationMinutes / 60);
        const mins = initialTask.durationMinutes % 60;
        setDurationStr(`${hrs}:${mins.toString().padStart(2, '0')}`);

        setStatus(initialTask.status || 'Done');
        setNotes(initialTask.notes || '');
      } else {
        setDate(getLogicalDate(new Date(), cutoffHour));
        const activeProjs = projects.filter((p) => p.active);
        if (activeProjs.length > 0) {
          setProjectId(activeProjs[0].id);
        }
        setDescription('');
        setDurationStr('1:00');
        setStatus('Done');
        setNotes('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialTask, projects, cutoffHour]);

  if (!isOpen) return null;

  const handleQuickDuration = (minutesToAdd: number, setDirectly: boolean = false) => {
    if (setDirectly) {
      setDurationStr(formatMinutesToDuration(minutesToAdd));
    } else {
      const currentMins = parseDurationToMinutes(durationStr);
      setDurationStr(formatMinutesToDuration(currentMins + minutesToAdd));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!projectId) {
      setErrorMsg('Please select a project.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please enter a task description.');
      return;
    }

    const minutes = parseDurationToMinutes(durationStr);
    if (minutes <= 0) {
      setErrorMsg('Please enter a valid duration (e.g. 1:30 or 0:45).');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        date: date || getLogicalDate(new Date(), cutoffHour),
        projectId,
        description: description.trim(),
        durationStr,
        durationMinutes: minutes,
        status,
        notes: notes.trim() || undefined,
      };

      const url = initialTask?.id ? `/api/tasks/${initialTask.id}` : '/api/tasks';
      const method = initialTask?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save task');
      }

      onSave();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeProjects = projects.filter((p) => p.active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="skeuo-panel w-full max-w-lg p-6 bg-slate-900 border-slate-700 shadow-2xl relative rounded-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {initialTask?.id ? 'Edit Task Entry' : 'Log New Task'}
              </h2>
              <p className="text-xs text-slate-400">Record work details & duration manually</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Logical Work Date */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Work Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full glass-input text-sm cursor-pointer"
                required
              />
            </div>

            {/* Project Select */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  Project
                </label>
                <button
                  type="button"
                  onClick={onOpenProjectManager}
                  className="text-xs text-blue-400 hover:underline font-medium"
                >
                  + Manage List
                </button>
              </div>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full glass-input text-sm bg-slate-900 cursor-pointer"
                required
              >
                <option value="" disabled>Select Project...</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Task Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Audited robotics arm trajectory dataset #1042"
              className="w-full glass-input text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Duration Manual Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Duration (H:MM)
              </label>
              <input
                type="text"
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                placeholder="1:30 or 0:45"
                className="w-full glass-input text-sm font-mono"
                required
              />

              {/* Quick Duration Pills */}
              <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-0.5">
                {[
                  { label: '30m', mins: 30 },
                  { label: '45m', mins: 45 },
                  { label: '1h', mins: 60 },
                  { label: '1:30', mins: 90 },
                  { label: '2h', mins: 120 },
                ].map((pill) => (
                  <button
                    key={pill.label}
                    type="button"
                    onClick={() => handleQuickDuration(pill.mins, true)}
                    className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800/90 text-slate-300 hover:bg-blue-600 hover:text-white border border-slate-700/80 transition"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full glass-input text-sm bg-slate-900 cursor-pointer"
              >
                <option value="Done" className="bg-slate-900 text-emerald-400">Done</option>
                <option value="Review" className="bg-slate-900 text-amber-400">Review</option>
                <option value="Pending" className="bg-slate-900 text-slate-400">Pending</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context, edge cases, or platform ticket IDs..."
              rows={2}
              className="w-full glass-input text-sm resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="skeuo-button-secondary px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="skeuo-button px-5 py-2 text-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialTask?.id ? 'Update Task' : 'Log Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
