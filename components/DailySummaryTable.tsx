'use client';

import React from 'react';
import { Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatMinutesToDuration } from '@/lib/logical-day';

interface Project {
  id: string;
  name: string;
  active: boolean;
}

interface DailyRow {
  date: string;
  projectBreakdown: Record<string, number>;
  totalMinutes: number;
  totalHours: number;
  targetHours: number;
  targetDiffHours: number;
  taskCount: number;
}

interface DailySummaryTableProps {
  rows: DailyRow[];
  projects: Project[];
  targetHours: number;
  onSelectPreset: (preset: 'this_week' | 'last_week' | 'this_month' | 'all') => void;
  activePreset: string;
}

export function DailySummaryTable({
  rows,
  projects,
  targetHours,
  onSelectPreset,
  activePreset,
}: DailySummaryTableProps) {
  const activeProjects = projects.filter((p) => p.active);

  return (
    <div className="skeuo-panel p-6">
      {/* Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Daily Rollup Summary
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-calculated per logical workday (Target: {targetHours}h/day)
          </p>
        </div>

        {/* Date Presets */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'this_week', label: 'This Week' },
            { id: 'last_week', label: 'Last Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'all', label: 'All History' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                activePreset === preset.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pivot Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-4 px-4">Date</th>
              {activeProjects.map((p) => (
                <th key={p.id} className="py-4 px-4 text-center">
                  {p.name}
                </th>
              ))}
              <th className="py-4 px-4 text-right">Daily Total</th>
              <th className="py-4 px-4 text-right">Target Diff ({targetHours}h)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={activeProjects.length + 3}
                  className="py-12 text-center text-slate-500 font-sans"
                >
                  No daily totals found for selected range.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isMet = row.totalHours >= targetHours;
                const diffLabel = row.targetDiffHours > 0
                  ? `+${row.targetDiffHours.toFixed(2)}h`
                  : `${row.targetDiffHours.toFixed(2)}h`;

                return (
                  <tr
                    key={row.date}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-4 font-semibold text-slate-200 whitespace-nowrap">
                      {row.date}
                    </td>
                    {activeProjects.map((p) => {
                      const mins = row.projectBreakdown[p.name] || 0;
                      return (
                        <td
                          key={p.id}
                          className="py-4 px-4 text-center whitespace-nowrap"
                        >
                          {mins > 0 ? (
                            <span className="text-slate-200 font-medium">
                              {formatMinutesToDuration(mins)}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-4 px-4 text-right font-bold text-white whitespace-nowrap">
                      {formatMinutesToDuration(row.totalMinutes)}
                      <span className="text-slate-400 font-normal text-[11px] ml-1.5">
                        ({row.totalHours.toFixed(2)}h)
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                          isMet
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {isMet ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        {diffLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
