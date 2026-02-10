import { useState, useEffect, useCallback, useRef } from 'react';

export interface FlowEvent {
  type: string;
  eventType: string;
  data: any;
  timestamp: number;
}

export interface TransactionUpdate {
  type: string;
  transactionId: string;
  status: string;
  details: any;
  timestamp: number;
}

export interface RetryScheduled {
  type: string;
  actionId: string;
  attempt: number;
  scheduledFor: number;
  timestamp: number;
}

type WebSocketMessage = FlowEvent | TransactionUpdate | RetryScheduled | any;

export function useRealtimeEvents() {
  const [events, setEvents] = useState<WebSocketMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws';

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to FlowSure');
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Subscribe to all channels
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'events' }));
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'transactions' }));
        ws.send(JSON.stringify({ type: 'subscribe', channel: 'retries' }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message);

          // Add to events list
          setEvents(prev => [message, ...prev].slice(0, 100)); // Keep last 100 events
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setConnected(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setError('Failed to connect after multiple attempts');
        }
      };
    } catch (err: any) {
      console.error('[WebSocket] Connection error:', err);
      setError(err.message);
    }
  }, [wsUrl]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message: not connected');
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Filter events by type
  const getEventsByType = useCallback((eventType: string) => {
    return events.filter(event => event.eventType === eventType);
  }, [events]);

  // Get transaction updates
  const getTransactionUpdates = useCallback(() => {
    return events.filter(event => event.type === 'transaction_update') as TransactionUpdate[];
  }, [events]);

  // Get retry scheduled events
  const getRetryScheduled = useCallback(() => {
    return events.filter(event => event.type === 'retry_scheduled') as RetryScheduled[];
  }, [events]);

  // Get compensation events
  const getCompensationEvents = useCallback(() => {
    return events.filter(event => event.eventType === 'compensation');
  }, [events]);

  // Get FROTH staking events
  const getFrothEvents = useCallback(() => {
    return events.filter(event => 
      event.eventType === 'frothStaked' || event.eventType === 'frothUnstaked'
    );
  }, [events]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    events,
    connected,
    error,
    connect,
    disconnect,
    sendMessage,
    clearEvents,
    getEventsByType,
    getTransactionUpdates,
    getRetryScheduled,
    getCompensationEvents,
    getFrothEvents
  };
}
