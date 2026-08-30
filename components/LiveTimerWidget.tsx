'use client';

import React, { useState, useEffect } from 'react';
import { Play, Square } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface LiveTimerWidgetProps {
  projects: Project[];
  onStopTimer: (minutes: number, projectId: string) => void;
}

export function LiveTimerWidget({ projects, onStopTimer }: LiveTimerWidgetProps) {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Default to the first active project if available
  const defaultProjectId = projects.length > 0 ? projects[0].id : '';
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId);

  // Initialize from local storage on mount (in case of page reload)
  useEffect(() => {
    const storedStartTime = localStorage.getItem('live_timer_start');
    const storedProjectId = localStorage.getItem('live_timer_project');
    
    if (storedStartTime) {
      setStartTime(parseInt(storedStartTime, 10));
      setIsActive(true);
      if (storedProjectId) {
        setSelectedProjectId(storedProjectId);
      }
    }
    
    // Ensure selectedProjectId is valid if we didn't have one stored but projects loaded
    if (!storedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  // Tick the timer every second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - startTime) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, startTime]);

  const handleStart = () => {
    if (!selectedProjectId) return;
    
    const now = Date.now();
    setStartTime(now);
    setIsActive(true);
    
    localStorage.setItem('live_timer_start', now.toString());
    localStorage.setItem('live_timer_project', selectedProjectId);
  };

  const handleStop = () => {
    if (!startTime) return;
    
    const now = Date.now();
    const totalSeconds = Math.floor((now - startTime) / 1000);
    
    // Convert to minutes (round up to 1 if it's less than 60s but they clicked stop)
    let totalMinutes = Math.round(totalSeconds / 60);
    if (totalSeconds > 0 && totalMinutes === 0) totalMinutes = 1;
    
    // Clean up state and storage
    setIsActive(false);
    setStartTime(null);
    setElapsedSeconds(0);
    localStorage.removeItem('live_timer_start');
    localStorage.removeItem('live_timer_project');
    
    // Trigger callback
    onStopTimer(totalMinutes, selectedProjectId);
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 p-1.5 pl-3 rounded-xl border transition-all duration-300 shadow-sm ${isActive ? 'bg-emerald-950/40 border-emerald-500/40 shadow-emerald-900/20' : 'bg-slate-900/60 border-slate-700/60'}`}>
      
      {/* Timer Display */}
      <div className={`font-mono text-sm font-bold w-[50px] text-center tracking-wider ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
        {formatTime(elapsedSeconds)}
      </div>

      {/* Project Selector (disabled when running) */}
      <select
        value={selectedProjectId}
        onChange={(e) => setSelectedProjectId(e.target.value)}
        disabled={isActive}
        className={`bg-transparent text-xs outline-none cursor-pointer border-none font-semibold truncate max-w-[100px] ${isActive ? 'text-emerald-200/60' : 'text-slate-300'}`}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
            {p.name}
          </option>
        ))}
      </select>

      {/* Controls */}
      <div className="flex items-center">
        {!isActive ? (
          <button
            onClick={handleStart}
            disabled={!selectedProjectId}
            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
            title="Start Timer"
          >
            <Play className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all animate-pulse hover:animate-none"
            title="Stop Timer & Log"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        )}
      </div>
    </div>
  );
}
