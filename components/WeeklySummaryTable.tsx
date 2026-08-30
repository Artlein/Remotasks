'use client';

import React from 'react';
import { CalendarRange, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';
import { formatMinutesToDuration, formatMinutesToFriendly } from '@/lib/logical-day';

interface Project {
  id: string;
  name: string;
  active: boolean;
}

interface WeeklyRow {
  weekStartKey: string;
  weekLabel: string;
  startDate: string;
  endDate: string;
  projectBreakdown: Record<string, number>;
  totalMinutes: number;
  totalHours: number;
  weeklyTargetHours: number;
  taskCount: number;
}

interface WeeklySummaryTableProps {
  rows: WeeklyRow[];
  projects: Project[];
  weeklyTargetHours: number;
  hourlyRate?: number;
}

export function WeeklySummaryTable({
  rows,
  projects,
  weeklyTargetHours,
  hourlyRate = 0,
}: WeeklySummaryTableProps) {
  const activeProjects = projects.filter((p) => p.active);

  return (
    <div className="skeuo-panel p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-cyan-400" />
            Weekly Rollup Summary
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Grouped Monday to Sunday (Target: {weeklyTargetHours}h/week baseline)
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-4 px-4">Week Period</th>
              {activeProjects.map((p) => (
                <th key={p.id} className="py-4 px-4 text-center">
                  {p.name}
                </th>
              ))}
              <th className="py-4 px-4 text-right">Weekly Total</th>
              {hourlyRate > 0 && <th className="py-4 px-4 text-right">Est. Weekly Earnings</th>}
              <th className="py-4 px-4 text-right">Target Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={activeProjects.length + (hourlyRate > 0 ? 4 : 3)}
                  className="py-12 text-center text-slate-500 font-sans"
                >
                  No weekly historical data recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isMet = row.totalHours >= weeklyTargetHours;
                const diffHours = Math.round((row.totalHours - weeklyTargetHours) * 100) / 100;
                const diffLabel = diffHours >= 0 ? `+${diffHours}h` : `${diffHours}h`;
                const earnings = (row.totalHours * hourlyRate).toFixed(2);

                return (
                  <tr
                    key={row.weekLabel}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-4 font-semibold text-slate-200 whitespace-nowrap font-sans">
                      {row.weekLabel}
                      <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                        {row.taskCount} tasks logged
                      </span>
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
                      {formatMinutesToFriendly(row.totalMinutes)}
                      <span className="text-slate-400 font-normal text-[11px] ml-1.5">
                        ({row.totalHours.toFixed(2)}h)
                      </span>
                    </td>
                    {hourlyRate > 0 && (
                      <td className="py-4 px-4 text-right font-bold text-emerald-400 whitespace-nowrap">
                        ${earnings}
                      </td>
                    )}
                    <td className="py-4 px-4 text-right whitespace-nowrap font-sans">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                          isMet
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {isMet ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
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
