'use client';

import { useEffect, useState } from 'react';
import { TaskItem } from '@/components/TaskLogTable';
import { getLogicalDate } from '@/lib/logical-day';

interface SmartReminderProps {
  tasks: TaskItem[];
  cutoffHour: number;
}

export function SmartReminder({ tasks, cutoffHour }: SmartReminderProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Request permission on mount
    if ('Notification' in window) {
      Notification.requestPermission().then((perm) => {
        setPermission(perm);
      });
    }
  }, []);

  useEffect(() => {
    if (permission !== 'granted') return;

    const checkReminder = () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Target 5:00 PM (17:00)
      if (hour >= 17) {
        const todayLogical = getLogicalDate(now, cutoffHour);
        const hasLoggedToday = tasks.some(t => t.date === todayLogical);
        
        if (!hasLoggedToday) {
          const lastSentKey = 'remotasks_reminder_date';
          const lastSentDate = localStorage.getItem(lastSentKey);
          
          if (lastSentDate !== todayLogical) {
            // Trigger native notification
            new Notification('Time to log your tasks! 🕒', {
              body: "It's past 5 PM and you haven't logged any time today. Don't forget to update your Remotasks tracker!",
              icon: '/icon.jpg',
            });
            
            // Mark as sent for today
            localStorage.setItem(lastSentKey, todayLogical);
          }
        }
      }
    };

    // Check immediately, then every 5 minutes
    checkReminder();
    const intervalId = setInterval(checkReminder, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [permission, tasks, cutoffHour]);

  return null; // This is a logic-only component
}
