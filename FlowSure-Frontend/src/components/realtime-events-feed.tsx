'use client';

import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, CheckCircle, XCircle, Clock, Zap, DollarSign } from 'lucide-react';

export function RealtimeEventsFeed() {
  const { 
    events, 
    connected, 
    error, 
    clearEvents,
    getRetryScheduled,
    getCompensationEvents 
  } = useRealtimeEvents();

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'ActionSuccessEvent':
      case 'frothStaked':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ActionFailureEvent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'RetryScheduledEvent':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'CompensationEvent':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'ActionSuccessEvent':
      case 'frothStaked':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ActionFailureEvent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'RetryScheduledEvent':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CompensationEvent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const retryScheduled = getRetryScheduled();
  const compensationEvents = getCompensationEvents();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <CardTitle>Real-time Events</CardTitle>
            <Badge variant={connected ? 'default' : 'destructive'}>
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={clearEvents}>
            Clear
          </Button>
        </div>
        <CardDescription>
          Live blockchain events from FlowSure contracts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Retries Scheduled</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 mt-1">{retryScheduled.length}</p>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Compensations</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">{compensationEvents.length}</p>
          </div>
        </div>

        {/* Events Feed */}
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Activity className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No events yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Events will appear here in real-time
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${getEventColor(event.eventType)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getEventIcon(event.eventType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold truncate">
                          {event.eventType || event.type}
                        </p>
                        <span className="text-xs opacity-75">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>
                      
                      {/* Event-specific data */}
                      {event.type === 'retry_scheduled' && (
                        <div className="text-xs space-y-1">
                          <p>Action: {event.actionId}</p>
                          <p>Attempt: {event.attempt}</p>
                          <p>Scheduled: {new Date(event.scheduledFor * 1000).toLocaleTimeString()}</p>
                        </div>
                      )}
                      
                      {event.type === 'transaction_update' && (
                        <div className="text-xs space-y-1">
                          <p>Transaction: {event.transactionId?.slice(0, 16)}...</p>
                          <p>Status: {event.status}</p>
                        </div>
                      )}
                      
                      {event.type === 'event' && event.data && (
                        <div className="text-xs space-y-1">
                          {Object.entries(event.data).slice(0, 3).map(([key, value]) => (
                            <p key={key}>
                              <span className="font-medium">{key}:</span>{' '}
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
