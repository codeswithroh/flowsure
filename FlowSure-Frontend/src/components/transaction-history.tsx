'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowRightLeft, Coins, Send, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { transactionApi } from '@/lib/api-client';
import { useWalletStore } from '@/store/wallet-store';

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'swap':
      return ArrowRightLeft;
    case 'mint':
      return Coins;
    case 'transfer':
      return Send;
    default:
      return ArrowRightLeft;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'SUCCESS':
      return CheckCircle2;
    case 'FAILED':
      return XCircle;
    case 'PENDING':
    case 'RETRYING':
      return Clock;
    case 'COMPENSATED':
      return AlertCircle;
    default:
      return Clock;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SUCCESS':
      return 'default';
    case 'FAILED':
      return 'destructive';
    case 'PENDING':
      return 'secondary';
    case 'RETRYING':
      return 'outline';
    case 'COMPENSATED':
      return 'default';
    default:
      return 'secondary';
  }
};

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
};

interface Transaction {
  actionId: string;
  actionType: string;
  status: string;
  amount: number;
  retries: number;
  maxRetries: number;
  createdAt: number;
  txHash?: string;
}

export function TransactionHistory() {
  const { user } = useWalletStore();

  const { data: userActionsData, isLoading } = useQuery({
    queryKey: ['user-actions', user?.addr],
    queryFn: () => transactionApi.getUserActions(user.addr!),
    enabled: !!user?.addr,
    refetchInterval: 5000,
  });

  const transactions: Transaction[] = userActionsData?.data?.actions || [];

  const openFlowScan = (txHash: string) => {
    window.open(`https://testnet.flowscan.io/tx/${txHash}`, '_blank');
  };

  if (!user?.loggedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Connect your wallet to view transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Please connect your wallet to see your transactions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>All your protected transactions with retry status</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Execute a protected transaction to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => {
              const ActionIcon = getActionIcon(tx.actionType);
              const StatusIcon = getStatusIcon(tx.status);
              
              return (
                <div
                  key={tx.actionId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 rounded-full bg-primary/10">
                      <ActionIcon className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium capitalize">{tx.actionType}</p>
                        <Badge variant={getStatusColor(tx.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {tx.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{tx.amount} FLOW</span>
                        <span>•</span>
                        <span>{formatTimestamp(tx.createdAt)}</span>
                        {tx.retries > 0 && (
                          <>
                            <span>•</span>
                            <span>Retries: {tx.retries}/{tx.maxRetries}</span>
                          </>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                        ID: {tx.actionId}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {tx.txHash && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openFlowScan(tx.txHash!)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View on FlowScan
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
