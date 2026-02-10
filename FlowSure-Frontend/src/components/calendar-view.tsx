'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ScheduledTransfer } from '@/lib/api/scheduled-transfers';

interface CalendarViewProps {
  transfers: ScheduledTransfer[];
  onDateClick?: (date: Date) => void;
  onTransferClick?: (transfer: ScheduledTransfer) => void;
}

export function CalendarView({ transfers, onDateClick, onTransferClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getTransfersForDate = (day: number): ScheduledTransfer[] => {
    return transfers.filter(transfer => {
      const transferDate = new Date(transfer.scheduledDate);
      return (
        transferDate.getDate() === day &&
        transferDate.getMonth() === month &&
        transferDate.getFullYear() === year
      );
    });
  };

  const getStatusColor = (status: ScheduledTransfer['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'executing':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: ScheduledTransfer['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'failed':
        return <XCircle className="h-3 w-3" />;
      case 'executing':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isPast = (day: number) => {
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {monthNames[month]} {year}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {dayNames.map(day => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayTransfers = getTransfersForDate(day);
            // Group transfers by title and exact scheduledDate so multi-recipient schedules appear as one event
            const grouped = Object.values(
              dayTransfers.reduce((acc, t) => {
                const key = `${t.title}|${new Date(t.scheduledDate).toISOString()}`;
                if (!acc[key]) acc[key] = { items: [] as ScheduledTransfer[], rep: t, status: t.status };
                acc[key].items.push(t);
                // derive aggregated status
                const statuses = acc[key].items.map(i => i.status);
                const allCompleted = statuses.every(s => s === 'completed');
                const allFailed = statuses.every(s => s === 'failed');
                const hasExecuting = statuses.includes('executing');
                const hasScheduled = statuses.includes('scheduled');
                acc[key].status = allCompleted
                  ? 'completed'
                  : allFailed
                  ? 'failed'
                  : hasExecuting
                  ? 'executing'
                  : hasScheduled
                  ? 'scheduled'
                  : statuses.includes('completed')
                  ? 'completed'
                  : 'scheduled';
                return acc;
              }, {} as Record<string, { items: ScheduledTransfer[]; rep: ScheduledTransfer; status: ScheduledTransfer['status'] }>)
            );
            const hasTransfers = grouped.length > 0;

            return (
              <div
                key={day}
                className={`
                  aspect-square border rounded-lg p-2 cursor-pointer transition-colors
                  ${isToday(day) ? 'border-primary border-2 bg-primary/5' : 'border-border'}
                  ${isPast(day) ? 'bg-muted/50' : 'hover:bg-muted'}
                  ${hasTransfers ? 'bg-blue-50 dark:bg-blue-950' : ''}
                `}
                onClick={() => onDateClick?.(new Date(year, month, day))}
              >
                <div className="flex flex-col h-full">
                  <div className="text-sm font-medium mb-1">{day}</div>
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {grouped.slice(0, 3).map((group, index) => (
                      <div
                        key={(group.rep._id || group.rep.id || `${day}-${index}`) as string}
                        className={`
                          text-xs px-1 py-0.5 rounded truncate cursor-pointer
                          ${getStatusColor(group.status)} text-white
                          hover:opacity-80 transition-opacity
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTransferClick?.(group.rep);
                        }}
                        title={group.rep.title}
                      >
                        <div className="flex items-center gap-1">
                          {getStatusIcon(group.status)}
                          <span className="truncate">{group.rep.title}{group.items.length > 1 ? ` × ${group.items.length}` : ''}</span>
                        </div>
                      </div>
                    ))}
                    {grouped.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{grouped.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span>Executing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span>Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-500" />
            <span>Cancelled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
