'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/main-layout';
import { CalendarView } from '@/components/calendar-view';
import { EnhancedScheduleTransferForm } from '@/components/enhanced-schedule-transfer-form';
import { RecipientListManager } from '@/components/recipient-list-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Send, Shield, ExternalLink, Trash2, Users, Repeat } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduledTransfersApi, ScheduledTransfer } from '@/lib/api/scheduled-transfers';
import { useWalletStore } from '@/store/wallet-store';
import { toast } from 'sonner';

export function ScheduledTransfersPage() {
  const { user } = useWalletStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTransfer, setSelectedTransfer] = useState<ScheduledTransfer | null>(null);

  const { data: transfersData, isLoading } = useQuery({
    queryKey: ['scheduled-transfers', user?.addr],
    queryFn: () => scheduledTransfersApi.getByUser(user.addr!),
    enabled: !!user?.addr,
    refetchInterval: 10000,
  });

  const { data: upcomingData } = useQuery({
    queryKey: ['scheduled-transfers-upcoming', user?.addr],
    queryFn: () => scheduledTransfersApi.getUpcoming(user.addr!),
    enabled: !!user?.addr,
    refetchInterval: 10000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => scheduledTransfersApi.cancel(id),
    onSuccess: () => {
      toast.success('Transfer cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['scheduled-transfers'] });
      setSelectedTransfer(null);
    },
    onError: () => {
      toast.error('Failed to cancel transfer');
    },
  });

  const transfers = transfersData?.data || [];
  const upcoming = upcomingData?.data || [];
  // Group upcoming transfers so multi-recipient schedules appear as a single event
  const groupedUpcoming = Object.values(
    (upcoming || []).reduce((acc, t) => {
      const key = `${t.title}|${new Date(t.scheduledDate).toISOString()}`;
      if (!acc[key]) acc[key] = { items: [] as ScheduledTransfer[], rep: t, status: t.status };
      acc[key].items.push(t);
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

  const stats = {
    total: transfers.length,
    scheduled: transfers.filter(t => t.status === 'scheduled').length,
    completed: transfers.filter(t => t.status === 'completed').length,
    failed: transfers.filter(t => t.status === 'failed').length,
  };

  // Selected group for dialog aggregation (same title + exact scheduledDate)
  const selectedGroupItems = selectedTransfer
    ? transfers.filter(t =>
        t.title === selectedTransfer.title &&
        new Date(t.scheduledDate).toISOString() === new Date(selectedTransfer.scheduledDate).toISOString()
      )
    : [];

  const groupCount = selectedGroupItems.length;
  const aggregatedRecipients = selectedGroupItems.map(t => t.recipient).filter(Boolean) as string[];
  const aggregatedTxIds = selectedGroupItems.map(t => t.transactionId).filter(Boolean) as string[];
  const totalGroupAmount = selectedGroupItems.reduce((sum, t) => sum + (t.amount || 0), 0);
  const aggregatedStatus: ScheduledTransfer['status'] = (() => {
    const baseForStatus = groupCount > 0 ? selectedGroupItems : (selectedTransfer ? [selectedTransfer] : []);
    const statuses = baseForStatus.map(t => t.status);
    if (statuses.length === 0) return 'scheduled';
    const allCompleted = statuses.every(s => s === 'completed');
    const allFailed = statuses.every(s => s === 'failed');
    const hasExecuting = statuses.includes('executing');
    const hasScheduled = statuses.includes('scheduled');
    return allCompleted
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
  })();

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowForm(true);
  };

  const handleTransferClick = (transfer: ScheduledTransfer) => {
    setSelectedTransfer(transfer);
  };

  const handleCancelTransfer = () => {
    if (selectedTransfer && selectedTransfer.status === 'scheduled') {
      const id = selectedTransfer._id || selectedTransfer.id;
      if (id) cancelMutation.mutate(id);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: ScheduledTransfer['status']) => {
    const variants: Record<ScheduledTransfer['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
      scheduled: 'default',
      executing: 'secondary',
      completed: 'outline',
      failed: 'destructive',
      cancelled: 'secondary',
    };
    return <Badge variant={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  if (!user?.loggedIn) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>Please connect your wallet to schedule transfers</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Scheduled Transfers</h1>
            <p className="text-muted-foreground">
              Schedule protected FLOW transfers with batch payouts and recurring options
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Transfer
          </Button>
        </div>

        <Tabs defaultValue="transfers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="transfers">
              <Calendar className="h-4 w-4 mr-2" />
              Transfers
            </TabsTrigger>
            <TabsTrigger value="recipients">
              <Users className="h-4 w-4 mr-2" />
              Recipient Lists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transfers" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Scheduled</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.scheduled}</div>
                  <p className="text-xs text-muted-foreground">Pending execution</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completed}</div>
                  <p className="text-xs text-green-600">Successfully executed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.failed}</div>
                  <p className="text-xs text-muted-foreground">With compensation</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                {isLoading ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <p className="text-muted-foreground">Loading calendar...</p>
                    </CardContent>
                  </Card>
                ) : (
                  <CalendarView
                    transfers={transfers}
                    onDateClick={handleDateClick}
                    onTransferClick={handleTransferClick}
                  />
                )}
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Transfers</CardTitle>
                    <CardDescription>Next 7 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {groupedUpcoming.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8 text-sm">
                        No upcoming transfers
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {groupedUpcoming.map(group => (
                          <div
                            key={(group.rep._id || group.rep.id) as string}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => handleTransferClick(group.rep)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-medium text-sm truncate">{group.rep.title}{group.items.length > 1 ? ` × ${group.items.length}` : ''}</p>
                                {group.rep.isRecurring && (
                                  <Badge variant="outline" className="mt-1">
                                    <Repeat className="h-3 w-3 mr-1" />
                                    {group.rep.recurringFrequency}
                                  </Badge>
                                )}
                              </div>
                              {getStatusBadge(group.status)}
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDateTime(group.rep.scheduledDate)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Send className="h-3 w-3" />
                                {group.rep.amount} FLOW
                                {group.items.length > 1 && (
                                  <span>× {group.items.length}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recipients">
            <RecipientListManager />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule New Transfer</DialogTitle>
            <DialogDescription>
              Set up a protected transfer with batch payouts and recurring options
            </DialogDescription>
          </DialogHeader>
          <EnhancedScheduleTransferForm
            selectedDate={selectedDate}
            onSuccess={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTransfer} onOpenChange={() => setSelectedTransfer(null)}>
        <DialogContent className="sm:max-w-lg w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{selectedTransfer?.title}</DialogTitle>
            <DialogDescription>Transfer Details</DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(aggregatedStatus)}
              </div>

              {selectedTransfer.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedTransfer.description}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Amount</p>
                  <p className="font-medium">
                    {groupCount > 1 ? `${totalGroupAmount} FLOW (total)` : `${selectedTransfer.amount} FLOW`}
                  </p>
                  {groupCount > 1 && (
                    <p className="text-xs text-muted-foreground">Per transfer: {selectedTransfer.amount} FLOW × {groupCount}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Max Retries</p>
                  <p className="font-medium">{selectedTransfer.retryLimit}</p>
                </div>
              </div>

              {groupCount <= 1 && selectedTransfer.recipient && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Recipient</p>
                  <p className="font-mono text-sm break-all">{selectedTransfer.recipient}</p>
                </div>
              )}

              {selectedTransfer.recipients && selectedTransfer.recipients.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Recipients ({selectedTransfer.recipients.length})
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTransfer.recipients.map((r, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="font-medium">{r.name || 'Unnamed'}</p>
                        <p className="font-mono text-xs text-muted-foreground break-all">{r.address}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groupCount > 1 && aggregatedRecipients.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Recipients ({aggregatedRecipients.length})</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {aggregatedRecipients.map((addr, idx) => (
                      <p key={idx} className="font-mono text-xs text-muted-foreground break-all">{addr}</p>
                    ))}
                  </div>
                </div>
              )}

              {selectedTransfer.isRecurring && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Recurring</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      <Repeat className="h-3 w-3 mr-1" />
                      {selectedTransfer.recurringFrequency}
                    </Badge>
                    {selectedTransfer.recurringEndDate && (
                      <span className="text-sm">
                        Until {formatDateTime(selectedTransfer.recurringEndDate)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Scheduled For</p>
                <p className="font-medium">{formatDateTime(selectedTransfer.scheduledDate)}</p>
              </div>

              {selectedTransfer.executedAt && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Executed At</p>
                  <p className="font-medium">{formatDateTime(selectedTransfer.executedAt)}</p>
                </div>
              )}

              {groupCount <= 1 && selectedTransfer.transactionId && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Transaction ID</p>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <p className="font-mono text-sm truncate w-0 flex-1">{selectedTransfer.transactionId}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => window.open(`https://testnet.flowscan.io/tx/${selectedTransfer.transactionId}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {groupCount > 1 && aggregatedTxIds.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Transaction IDs ({aggregatedTxIds.length})</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {aggregatedTxIds.map((tx, idx) => (
                      <div key={idx} className="flex items-center gap-2 overflow-hidden">
                        <p className="font-mono text-sm truncate w-0 flex-1">{tx}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={() => window.open(`https://testnet.flowscan.io/tx/${tx}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTransfer.status === 'scheduled' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleCancelTransfer}
                    disabled={cancelMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancel Transfer
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
