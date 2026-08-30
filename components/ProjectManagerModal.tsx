'use client';

import React, { useState } from 'react';
import { X, FolderPlus, Edit2, Archive, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  active: boolean;
}

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onRefresh: () => void;
}

export function ProjectManagerModal({
  isOpen,
  onClose,
  projects,
  onRefresh,
}: ProjectManagerModalProps) {
  const [newProjectName, setNewProjectName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add project');
      }

      setNewProjectName('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error adding project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameProject = async (id: string) => {
    if (!editingName.trim()) return;

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to rename project');
      }

      setEditingId(null);
      setEditingName('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error renaming project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update project status');
      }

      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg p-6 bg-slate-900/90 border-slate-700 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">Project Management</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Add Project Form */}
        <form onSubmit={handleAddProject} className="mb-6">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Add New Project
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name (e.g., Aloha_OTS_V2)"
              className="glass-input flex-1 text-sm"
              required
            />
            <button
              type="submit"
              disabled={isLoading || !newProjectName.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition"
            >
              Add Project
            </button>
          </div>
        </form>

        {/* Projects List */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Existing Projects ({projects.length})
          </label>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition"
              >
                {editingId === proj.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="glass-input text-xs py-1 flex-1"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRenameProject(proj.id)}
                      className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                      title="Save name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-200">
                      {proj.name}
                    </span>
                    {!proj.active && (
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-500 border border-slate-700">
                        Retired
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {editingId !== proj.id && (
                    <button
                      onClick={() => {
                        setEditingId(proj.id);
                        setEditingName(proj.name);
                      }}
                      className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                      title="Rename project"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleToggleActive(proj.id, proj.active)}
                    className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition ${
                      proj.active
                        ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                    }`}
                    title={proj.active ? 'Retire project' : 'Reactivate project'}
                  >
                    {proj.active ? (
                      <>
                        <Archive className="w-3.5 h-3.5" /> Retire
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" /> Reactivate
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-slate-800 hover:bg-slate-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
