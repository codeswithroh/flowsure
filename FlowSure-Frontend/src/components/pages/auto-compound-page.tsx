'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coins, TrendingUp, Zap, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { frothApi } from '@/lib/api-client';
import { autoCompoundApi } from '@/lib/api/auto-compound';
import { useWalletStore } from '@/store/wallet-store';
import { toast } from 'sonner';

const FREQUENCY_OPTIONS = [
  { value: '3600', label: 'Every Hour', seconds: 3600 },
  { value: '21600', label: 'Every 6 Hours', seconds: 21600 },
  { value: '86400', label: 'Daily', seconds: 86400 },
  { value: '604800', label: 'Weekly', seconds: 604800 },
];

export function AutoCompoundPage() {
  const { user } = useWalletStore();
  const queryClient = useQueryClient();
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState('86400');
  const [timeRemaining, setTimeRemaining] = useState('');

  const { data: stakerData, isLoading: stakerLoading } = useQuery({
    queryKey: ['froth-staker', user.addr],
    queryFn: () => frothApi.getStaker(user.addr!),
    enabled: !!user.addr,
    refetchInterval: 10000,
  });

  const { data: compoundConfig, isLoading: configLoading } = useQuery({
    queryKey: ['compound-config', user.addr],
    queryFn: () => autoCompoundApi.getConfig(user.addr!),
    enabled: !!user.addr,
    refetchInterval: 5000,
  });

  const { data: pendingRewards } = useQuery({
    queryKey: ['pending-rewards', user.addr],
    queryFn: () => autoCompoundApi.getPendingRewards(user.addr!),
    enabled: !!user.addr && !!compoundConfig?.enabled,
    refetchInterval: 5000,
  });

  const { data: globalStats } = useQuery({
    queryKey: ['global-stats'],
    queryFn: () => autoCompoundApi.getGlobalStats(),
    refetchInterval: 30000,
  });

  const stakeMutation = useMutation({
    mutationFn: (amount: number) => frothApi.stake(user.addr!, amount),
    onSuccess: () => {
      toast.success('Successfully staked FROTH!');
      setStakeAmount('');
      queryClient.invalidateQueries({ queryKey: ['froth-staker'] });
    },
    onError: () => {
      toast.error('Failed to stake FROTH');
    },
  });

  const enableMutation = useMutation({
    mutationFn: (frequency: number) => autoCompoundApi.enableAutoCompound(user.addr!, frequency),
    onSuccess: () => {
      toast.success('Auto-compound enabled!');
      queryClient.invalidateQueries({ queryKey: ['compound-config'] });
    },
    onError: () => {
      toast.error('Failed to enable auto-compound');
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => autoCompoundApi.disableAutoCompound(user.addr!),
    onSuccess: () => {
      toast.success('Auto-compound disabled');
      queryClient.invalidateQueries({ queryKey: ['compound-config'] });
    },
    onError: () => {
      toast.error('Failed to disable auto-compound');
    },
  });

  const compoundMutation = useMutation({
    mutationFn: () => autoCompoundApi.executeCompound(user.addr!),
    onSuccess: () => {
      toast.success('Rewards compounded!');
      queryClient.invalidateQueries({ queryKey: ['froth-staker', 'compound-config', 'pending-rewards'] });
    },
    onError: () => {
      toast.error('Failed to compound rewards');
    },
  });

  useEffect(() => {
    if (!compoundConfig?.enabled || !compoundConfig.nextCompoundTime) return;

    const interval = setInterval(() => {
      const now = Date.now() / 1000;
      const remaining = Math.max(0, compoundConfig.nextCompoundTime - now);
      
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = Math.floor(remaining % 60);
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [compoundConfig]);

  const handleStake = () => {
    const amount = parseFloat(stakeAmount);
    if (amount > 0) {
      stakeMutation.mutate(amount);
    }
  };

  const handleEnableAutoCompound = () => {
    const frequency = parseInt(selectedFrequency);
    enableMutation.mutate(frequency);
  };

  const projectedAPY = compoundConfig?.enabled
    ? autoCompoundApi.calculateProjectedAPY(0.12, compoundConfig.frequency) * 100
    : 12;

  if (!user.loggedIn) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to access auto-compound staking
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const isLoading = stakerLoading || configLoading;

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Auto-Compound Staking</h1>
          <p className="text-muted-foreground">
            Stake FROTH and automatically compound your rewards for maximum yield
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Staked</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : `${stakerData?.stakedAmount || 0} FROTH`}
              </div>
              <p className="text-xs text-muted-foreground">
                {stakerData?.discount ? `${(stakerData.discount * 100).toFixed(0)}% discount` : 'No discount'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingRewards ? `${pendingRewards.toFixed(4)} FROTH` : '0 FROTH'}
              </div>
              <p className="text-xs text-muted-foreground">Ready to compound</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projected APY</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectedAPY.toFixed(2)}%</div>
              <p className="text-xs text-green-600">With compounding</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-Compound</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {compoundConfig?.enabled ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Inactive</span>
                  </>
                )}
              </div>
              {compoundConfig?.enabled && (
                <p className="text-xs text-muted-foreground mt-1">Next: {timeRemaining}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stake FROTH</CardTitle>
              <CardDescription>Stake tokens to start earning rewards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stake-amount">Amount to Stake</Label>
                <Input
                  id="stake-amount"
                  type="number"
                  placeholder="0.00"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleStake}
                disabled={stakeMutation.isPending || !stakeAmount}
              >
                {stakeMutation.isPending ? 'Staking...' : 'Stake FROTH'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auto-Compound Settings</CardTitle>
              <CardDescription>Configure automatic reward compounding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!compoundConfig?.enabled ? (
                <>
                  <div className="space-y-2">
                    <Label>Compound Frequency</Label>
                    <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleEnableAutoCompound}
                    disabled={enableMutation.isPending || !stakerData?.stakedAmount}
                  >
                    {enableMutation.isPending ? 'Enabling...' : 'Enable Auto-Compound'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Status</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Frequency</span>
                      <span className="text-sm font-medium">
                        {FREQUENCY_OPTIONS.find(o => o.seconds === compoundConfig.frequency)?.label || 'Custom'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Compounded</span>
                      <span className="text-sm font-medium">{compoundConfig.totalCompounded.toFixed(4)} FROTH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Compound Count</span>
                      <span className="text-sm font-medium">{compoundConfig.compoundCount}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => compoundMutation.mutate()}
                      disabled={compoundMutation.isPending || !pendingRewards}
                    >
                      Compound Now
                    </Button>
                    <Button 
                      className="flex-1" 
                      variant="outline"
                      onClick={() => disableMutation.mutate()}
                      disabled={disableMutation.isPending}
                    >
                      Disable
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {globalStats && (
          <Card>
            <CardHeader>
              <CardTitle>Global Statistics</CardTitle>
              <CardDescription>Platform-wide auto-compound metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Staked</p>
                  <p className="text-2xl font-bold">{globalStats.totalStaked.toFixed(2)} FROTH</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Compounds</p>
                  <p className="text-2xl font-bold">{globalStats.totalCompounds}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Rewards Compounded</p>
                  <p className="text-2xl font-bold">{globalStats.totalRewardsCompounded.toFixed(2)} FROTH</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Avg Compound</p>
                  <p className="text-2xl font-bold">{globalStats.averageCompoundAmount.toFixed(4)} FROTH</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
