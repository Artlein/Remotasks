'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Clock, Target, DollarSign, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cutoffHour: number;
  dailyTargetHours: number;
  hourlyRate: number;
  onSaveSuccess: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  cutoffHour,
  dailyTargetHours,
  hourlyRate,
  onSaveSuccess,
}: SettingsModalProps) {
  const [selectedCutoff, setSelectedCutoff] = useState<number>(0);
  const [targetHours, setTargetHours] = useState<number>(8.0);
  const [rate, setRate] = useState<number>(0.0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedCutoff(cutoffHour);
      setTargetHours(dailyTargetHours);
      setRate(hourlyRate);
      setErrorMsg(null);
    }
  }, [isOpen, cutoffHour, dailyTargetHours, hourlyRate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logicalCutoffHour: selectedCutoff,
          dailyTargetHours: targetHours,
          hourlyRate: rate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="skeuo-panel w-full max-w-md p-6 bg-slate-900 border-slate-700 shadow-2xl relative rounded-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">Workday & Target Settings</h2>
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Workday Cutoff Hour */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Logical Workday Cutoff Hour
            </label>
            <select
              value={selectedCutoff}
              onChange={(e) => setSelectedCutoff(parseInt(e.target.value, 10))}
              className="w-full glass-input text-sm bg-slate-900 cursor-pointer"
            >
              <option value={0} className="bg-slate-900 text-white">12:00 AM (Midnight reset - Default)</option>
              <option value={3} className="bg-slate-900 text-white">3:00 AM</option>
              <option value={4} className="bg-slate-900 text-white">4:00 AM</option>
              <option value={5} className="bg-slate-900 text-white">5:00 AM</option>
              <option value={6} className="bg-slate-900 text-white">6:00 AM</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
              Controls when a workday resets. If set to e.g. 4:00 AM, work logged between 12 AM and 4 AM belongs to the previous logical date.
            </p>
          </div>

          {/* Daily Target Hours */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-400" />
              Personal Daily Target Hours
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="24"
              value={targetHours}
              onChange={(e) => setTargetHours(parseFloat(e.target.value) || 8.0)}
              className="w-full glass-input text-sm"
              required
            />
          </div>

          {/* Hourly Rate ($/hr) for Earnings Estimator */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Hourly Audit Rate ($/hr - Optional)
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              placeholder="e.g. 15.00 or 20.00"
              value={rate || ''}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              className="w-full glass-input text-sm font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Used to calculate live estimated earnings on your dashboard banner and weekly rollups.
            </p>
          </div>

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
              disabled={isSaving}
              className="skeuo-button px-5 py-2 text-sm disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
