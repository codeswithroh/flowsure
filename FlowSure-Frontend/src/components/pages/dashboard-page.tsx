'use client';

import { MainLayout } from '@/components/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, DollarSign, Vault, Calendar, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { metricsApi, transactionApi } from '@/lib/api-client';
import { useWalletStore } from '@/store/wallet-store';
import { scheduledTransfersApi, ScheduledTransfer } from '@/lib/api/scheduled-transfers';
import { getStakingSummary } from '@/lib/staking-transactions';

export function DashboardPage() {
  const { user } = useWalletStore();

  const { data: vaultData } = useQuery({
    queryKey: ['vault-metrics'],
    queryFn: () => metricsApi.getVault(),
    enabled: !!user?.loggedIn,
  });

  const { data: stakingSummary } = useQuery({
    queryKey: ['staking-summary', user?.addr],
    queryFn: () => getStakingSummary(user!.addr!),
    enabled: !!user?.addr,
    refetchInterval: 10000,
  });

  const { data: protectionData } = useQuery({
    queryKey: ['protection-metrics'],
    queryFn: () => metricsApi.getProtection(),
    enabled: !!user?.loggedIn,
  });

  const { data: userActionsData } = useQuery({
    queryKey: ['user-actions', user?.addr],
    queryFn: () => transactionApi.getUserActions(user.addr!),
    enabled: !!user?.addr,
    refetchInterval: 5000,
  });

  const { data: schedAll } = useQuery({
    queryKey: ['scheduled-transfers', user?.addr],
    queryFn: () => scheduledTransfersApi.getByUser(user!.addr!),
    enabled: !!user?.addr,
    refetchInterval: 10000,
  });

  const { data: schedUpcoming } = useQuery({
    queryKey: ['scheduled-transfers-upcoming', user?.addr],
    queryFn: () => scheduledTransfersApi.getUpcoming(user!.addr!),
    enabled: !!user?.addr,
    refetchInterval: 10000,
  });

  const actions = userActionsData?.data?.actions || [];
  const stats = userActionsData?.data?.stats || { pending: 0, success: 0, failed: 0 };

  const activeProtections = actions.filter((a: any) => a.status === 'PENDING' || a.status === 'RETRYING');
  const retryQueue = actions.filter((a: any) => a.status === 'RETRYING');
  const compensations = actions.filter((a: any) => a.status === 'COMPENSATED');

  const transfers: ScheduledTransfer[] = schedAll?.data || [];
  const upcoming: ScheduledTransfer[] = schedUpcoming?.data || [];
  const schedStats = {
    total: transfers.length,
    scheduled: transfers.filter(t => t.status === 'scheduled').length,
    executing: transfers.filter(t => t.status === 'executing').length,
    completed: transfers.filter(t => t.status === 'completed').length,
    failed: transfers.filter(t => t.status === 'failed').length,
  };

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
  const nextGrouped = groupedUpcoming[0];
  const totalUpcomingAmount = upcoming.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Transfers overview (last 7 days)
  const nowSec = Math.floor(Date.now() / 1000);
  const sevenDaysAgo = nowSec - 7 * 24 * 60 * 60;
  const recentActions = actions.filter((a: any) => (a.createdAt || 0) >= sevenDaysAgo);
  const recentTransfers = recentActions.filter((a: any) => (a.amount || 0) > 0 && (a.status === 'SUCCESS' || a.status === 'COMPLETED'));
  const transfersCount7d = recentTransfers.length;
  const transfersVolume7d = recentTransfers.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);

  // Staking overview
  const stakedAmount = stakingSummary?.stakedAmount ? parseFloat(stakingSummary.stakedAmount) : 0;
  const pendingRewards = stakingSummary?.pendingRewards ? parseFloat(stakingSummary.pendingRewards) : 0;

  const recentList = [...recentActions].sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your protected transactions and vault status</p>
        </div>

        <div />

        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 mt-2"><Calendar className="h-4 w-4" /> Overview</h2>
          <div className="grid gap-4 md:grid-cols-4 mt-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{schedStats.scheduled}</div>
                <p className="text-xs text-muted-foreground">Pending execution</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transfers (7d)</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transfersCount7d}</div>
                <p className="text-xs text-muted-foreground">{transfersVolume7d.toFixed(2)} FLOW volume</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staking</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stakedAmount.toFixed(2)} FLOW</div>
                <p className="text-xs text-muted-foreground">Rewards: {pendingRewards.toFixed(4)} FLOW</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Upcoming</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUpcomingAmount.toFixed(2)} FLOW</div>
                <p className="text-xs text-muted-foreground">Next 7 days</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Next Scheduled</CardTitle>
                <CardDescription>Grouped by event</CardDescription>
              </CardHeader>
              <CardContent>
                {nextGrouped ? (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium truncate">{nextGrouped.rep.title}{nextGrouped.items.length > 1 ? ` × ${nextGrouped.items.length}` : ''}</p>
                      <p className="text-sm text-muted-foreground">{new Date(nextGrouped.rep.scheduledDate).toLocaleString()}</p>
                    </div>
                    <Badge variant="secondary">{nextGrouped.status.toUpperCase()}</Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming transfers</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity (last 5)</CardTitle>
                <CardDescription>Transfers and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentList.map((action: any) => (
                    <div key={action.actionId || `${action.actionType}-${action.createdAt}`} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium truncate max-w-[170px]">{action.actionType}</p>
                        <p className="text-xs text-muted-foreground">{formatTimestamp(action.createdAt || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{action.amount ? `${action.amount} FLOW` : '-'}</p>
                        <Badge variant="outline">{(action.status || '').toString()}</Badge>
                      </div>
                    </div>
                  ))}
                  {recentList.length === 0 && (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div />
      </div>
    </MainLayout>
  );
}
