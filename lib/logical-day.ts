import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';

/**
 * Calculates the logical work date for a given Date object based on a cutoff hour.
 * Default cutoff is 0 (12:00 AM midnight reset).
 * If cutoff is e.g. 8 (8:00 AM), any time between 00:00 and 07:59 belongs to the previous calendar day.
 */
export function getLogicalDate(dateInput: Date | string = new Date(), cutoffHour: number = 0): string {
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
  
  if (isNaN(date.getTime())) {
    return format(new Date(), 'yyyy-MM-dd');
  }

  const hours = date.getHours();
  
  if (cutoffHour > 0 && hours < cutoffHour) {
    const previousDay = subDays(date, 1);
    return format(previousDay, 'yyyy-MM-dd');
  }
  
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parses user typed duration string in natural formats:
 * e.g. "1h 30m", "1h30m", "2h", "45m", "1.5h", "1:30", "0.75", "90" into duration_minutes integer.
 */
export function parseDurationToMinutes(durationStr: string): number {
  if (!durationStr || typeof durationStr !== 'string') return 0;

  const trimmed = durationStr.trim().toLowerCase();
  
  // Natural language format: e.g., "1h 30m", "1h30m", "2h", "45m", "1.5h"
  if (trimmed.includes('h') || trimmed.includes('m')) {
    let hours = 0;
    let minutes = 0;

    const hMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/);
    if (hMatch) {
      hours = parseFloat(hMatch[1]) || 0;
    }

    const mMatch = trimmed.match(/(\d+)\s*m/);
    if (mMatch) {
      minutes = parseInt(mMatch[1], 10) || 0;
    }

    if (!hMatch && mMatch) {
      return minutes;
    }

    return Math.max(0, Math.round(hours * 60 + minutes));
  }

  // Format H:MM or HH:MM
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return Math.max(0, hours * 60 + minutes);
  }

  // Format standard float hours like "1.5" or "0.75"
  if (trimmed.includes('.')) {
    const floatVal = parseFloat(trimmed) || 0;
    return Math.max(0, Math.round(floatVal * 60));
  }

  // Plain integer minutes or hours
  const intVal = parseInt(trimmed, 10) || 0;
  if (intVal > 0 && intVal <= 24) {
    return intVal * 60; // Assume hours if <= 24 (e.g. 1 -> 60m, 2 -> 120m)
  }

  return Math.max(0, intVal);
}

/**
 * Formats minutes into "H:MM" format (e.g., 90 -> "1:30")
 */
export function formatMinutesToDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  const hrs = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Formats minutes into human friendly string (e.g., 90 -> "1h 30m", 45 -> "45m")
 */
export function formatMinutesToFriendly(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  const hrs = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Formats minutes into decimal hours formatted to 2 decimals (e.g., 90 -> "1.50")
 */
export function formatMinutesToDecimal(minutes: number): number {
  const safeMinutes = Math.max(0, minutes || 0);
  return Math.round((safeMinutes / 60) * 100) / 100;
}

/**
 * Quick date range calculator using logical date conventions.
 * Workweek starts on Tuesday (weekStartsOn: 2) and ends on Monday to match Remotasks pay cycle.
 */
export function getDateRangePreset(
  preset: 'today' | 'this_week' | 'last_week' | 'this_month' | 'all',
  cutoffHour: number = 0
): { startDate?: string; endDate?: string } {
  const todayLogicalStr = getLogicalDate(new Date(), cutoffHour);
  const todayDate = parseISO(todayLogicalStr);

  switch (preset) {
    case 'today':
      return { startDate: todayLogicalStr, endDate: todayLogicalStr };
    case 'this_week': {
      const start = startOfWeek(todayDate, { weekStartsOn: 2 }); // Tuesday
      const end = endOfWeek(todayDate, { weekStartsOn: 2 }); // Monday
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      };
    }
    case 'last_week': {
      const lastWeekDate = subDays(todayDate, 7);
      const start = startOfWeek(lastWeekDate, { weekStartsOn: 2 }); // Tuesday
      const end = endOfWeek(lastWeekDate, { weekStartsOn: 2 }); // Monday
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      };
    }
    case 'this_month': {
      const start = startOfMonth(todayDate);
      const end = endOfMonth(todayDate);
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
      };
    }
    case 'all':
    default:
      return {};
  }
}
