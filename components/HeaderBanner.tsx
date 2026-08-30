'use client';

import React from 'react';
import { Clock, Target, Calendar, Plus, Download, FolderPlus, Settings, ChevronLeft, ChevronRight, Flame, Sparkles, DollarSign } from 'lucide-react';
import { formatMinutesToFriendly, formatMinutesToDecimal } from '@/lib/logical-day';
import { addDays, subDays, parseISO, format } from 'date-fns';
import Image from 'next/image';

interface HeaderBannerProps {
  todayDateStr: string;
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  cutoffHour: number;
  todayMinutes: number;
  dailyTargetHours: number;
  hourlyRate: number;
  projectBreakdown: Record<string, number>;
  streakDays: number;
  onOpenTaskModal: () => void;
  onOpenProjectModal: () => void;
  onOpenImportExportModal: () => void;
  onOpenSettingsModal: () => void;
}

export function HeaderBanner({
  todayDateStr,
  selectedDateStr,
  onSelectDate,
  cutoffHour,
  todayMinutes,
  dailyTargetHours,
  hourlyRate,
  projectBreakdown,
  streakDays,
  onOpenTaskModal,
  onOpenProjectModal,
  onOpenImportExportModal,
  onOpenSettingsModal,
}: HeaderBannerProps) {
  const todayHours = formatMinutesToDecimal(todayMinutes);
  const targetMinutes = dailyTargetHours * 60;
  const progressPercent = Math.min(100, Math.round((todayMinutes / targetMinutes) * 100));

  const isTargetMet = todayMinutes >= targetMinutes;
  const remainingMinutes = Math.max(0, targetMinutes - todayMinutes);
  const isViewingToday = selectedDateStr === todayDateStr;

  const estimatedEarnings = (todayHours * hourlyRate).toFixed(2);

  const handlePrevDay = () => {
    const d = parseISO(selectedDateStr);
    if (!isNaN(d.getTime())) {
      onSelectDate(format(subDays(d, 1), 'yyyy-MM-dd'));
    }
  };

  const handleNextDay = () => {
    const d = parseISO(selectedDateStr);
    if (!isNaN(d.getTime())) {
      onSelectDate(format(addDays(d, 1), 'yyyy-MM-dd'));
    }
  };

  const handleResetToToday = () => {
    onSelectDate(todayDateStr);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* 1. Top Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/90">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-xl shadow-blue-500/25 border-2 border-blue-400/30 shrink-0">
            <Image
              src="/logo.png"
              alt="Remotasks QA Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                Remotasks QA Time Console
              </h1>
              <span className="led-indicator led-emerald" title="System Active" />
              {streakDays > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1 shadow-sm">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> {streakDays}d Streak
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-400" />
              Auditor Timesheet & Quality Control Console
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenTaskModal}
            className="skeuo-button px-4 py-2.5 text-xs font-bold flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Log Task <span className="text-[10px] opacity-75 font-mono bg-black/40 px-1.5 py-0.5 rounded">Cmd+K</span>
          </button>

          <button
            onClick={onOpenProjectModal}
            className="skeuo-button-secondary px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-cyan-400" />
            Projects
          </button>

          <button
            onClick={onOpenImportExportModal}
            className="skeuo-button-secondary px-3.5 py-2.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export / Import
          </button>

          <button
            onClick={onOpenSettingsModal}
            className="skeuo-button-secondary p-2.5 text-slate-300"
            title="Workday & Rate Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Balanced 2-Column Hero Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: Target Progress, Date Picker & Earnings Badge */}
        <div className="skeuo-panel p-6 relative">
          <div className="flex items-center justify-between mb-4">
            {/* Workday Date Selector */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
                <button
                  onClick={handlePrevDay}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 px-2 font-mono text-xs text-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <strong className="text-white">{selectedDateStr}</strong>
                  {isViewingToday && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-blue-500/20 text-blue-400 font-bold uppercase tracking-wider">
                      Today
                    </span>
                  )}
                </div>
                <button
                  onClick={handleNextDay}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {!isViewingToday && (
                <button
                  onClick={handleResetToToday}
                  className="text-xs text-blue-400 hover:underline font-semibold"
                >
                  Today
                </button>
              )}
            </div>

            <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Reset: {cutoffHour === 0 ? '12 AM' : `${cutoffHour} AM`}
            </span>
          </div>

          {/* Today's Hours & Target Stat + EARNINGS BADGE */}
          <div className="skeuo-screen p-5 mb-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
              <span className="flex items-center gap-1.5 text-slate-200 tracking-wider">
                <Target className="w-4 h-4 text-blue-400" />
                DAILY TARGET PROGRESS
              </span>
              <span className={isTargetMet ? 'text-emerald-400 font-bold flex items-center gap-1' : 'text-slate-400'}>
                {isTargetMet ? (
                  <>
                    <span className="led-indicator led-emerald" /> 8h Goal Met!
                  </>
                ) : (
                  `${formatMinutesToFriendly(remainingMinutes)} remaining`
                )}
              </span>
            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white font-mono tracking-tight">
                  {formatMinutesToFriendly(todayMinutes)}
                </span>
                <span className="text-sm text-slate-400 font-mono">
                  ({todayHours.toFixed(2)} hrs)
                </span>
              </div>

              {/* EARNINGS DISPLAY BADGE */}
              <div
                onClick={onOpenSettingsModal}
                className="text-right cursor-pointer group bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded-xl transition"
                title="Click gear icon or click here to set your $/hr rate"
              >
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Est. Earnings {hourlyRate > 0 ? `($${hourlyRate}/hr)` : '(Set Rate)'}
                </span>
                <span className="text-base font-black text-emerald-300 font-mono flex items-center gap-0.5 justify-end">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  {estimatedEarnings}
                </span>
              </div>
            </div>

            {/* Analog Gauge Bar */}
            <div className="analog-meter-container mb-2">
              <div
                className={`analog-meter-bar ${
                  isTargetMet
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 font-mono px-0.5">
              <span>0h</span>
              <span>2h</span>
              <span>4h</span>
              <span>6h</span>
              <span className="text-blue-400 font-bold">8h Goal</span>
              <span>10h+</span>
            </div>
          </div>
        </div>

        {/* Card B: Project Breakdown for Selected Day */}
        <div className="skeuo-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="led-indicator led-blue" />
                Selected Day Breakdown
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {Object.keys(projectBreakdown).length} active projects
              </span>
            </div>

            {Object.keys(projectBreakdown).length === 0 ? (
              <div className="skeuo-screen p-8 text-center text-slate-500 text-xs my-auto">
                No tasks logged for {selectedDateStr}. Use Fast-Log or click "Log Task" to add work.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[170px] overflow-y-auto pr-1">
                {Object.entries(projectBreakdown).map(([pName, mins]) => (
                  <div
                    key={pName}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between shadow-inner"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-200 truncate">{pName}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white shrink-0">
                      {formatMinutesToFriendly(mins)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
