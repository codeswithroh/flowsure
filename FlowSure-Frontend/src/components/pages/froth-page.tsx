'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, TrendingUp, Award } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { frothApi } from '@/lib/api-client';
import { useWalletStore } from '@/store/wallet-store';
import { toast } from 'sonner';

export function FrothPage() {
  const { user } = useWalletStore();
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  const { data: priceData } = useQuery({
    queryKey: ['froth-price'],
    queryFn: () => frothApi.getPrice(),
  });

  const { data: stakerData } = useQuery({
    queryKey: ['froth-staker', user.addr],
    queryFn: () => frothApi.getStaker(user.addr!),
    enabled: !!user.addr,
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ['froth-leaderboard'],
    queryFn: () => frothApi.getLeaderboard(),
  });

  const stakeMutation = useMutation({
    mutationFn: (amount: number) => frothApi.stake(user.addr!, amount),
    onSuccess: () => {
      toast.success('Successfully staked FROTH!');
      setStakeAmount('');
    },
    onError: () => {
      toast.error('Failed to stake FROTH');
    },
  });

  const unstakeMutation = useMutation({
    mutationFn: (amount: number) => frothApi.unstake(user.addr!, amount),
    onSuccess: () => {
      toast.success('Successfully unstaked FROTH!');
      setUnstakeAmount('');
    },
    onError: () => {
      toast.error('Failed to unstake FROTH');
    },
  });

  const handleStake = () => {
    const amount = parseFloat(stakeAmount);
    if (amount > 0) {
      stakeMutation.mutate(amount);
    }
  };

  const handleUnstake = () => {
    const amount = parseFloat(unstakeAmount);
    if (amount > 0) {
      unstakeMutation.mutate(amount);
    }
  };

  const mockLeaderboard = [
    { rank: 1, address: '0x1234...5678', staked: '10,000 FROTH', discount: '20%' },
    { rank: 2, address: '0xabcd...efgh', staked: '8,500 FROTH', discount: '18%' },
    { rank: 3, address: '0x9876...5432', staked: '7,200 FROTH', discount: '16%' },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">FROTH Staking</h1>
          <p className="text-muted-foreground">Stake FROTH tokens to unlock insurance discounts and earn rewards</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">FROTH Price</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$0.45</div>
              <p className="text-xs text-green-600">+5.2% (24h)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Staked</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,500 FROTH</div>
              <p className="text-xs text-muted-foreground">≈ $675</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Discount</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12%</div>
              <p className="text-xs text-muted-foreground">On insurance fees</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stake / Unstake</CardTitle>
              <CardDescription>Manage your FROTH staking position</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="stake">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="stake">Stake</TabsTrigger>
                  <TabsTrigger value="unstake">Unstake</TabsTrigger>
                </TabsList>
                <TabsContent value="stake" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="stake-amount">Amount to Stake</Label>
                    <Input
                      id="stake-amount"
                      type="number"
                      placeholder="0.00"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Balance: 5,000 FROTH</p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleStake}
                    disabled={!user.loggedIn || stakeMutation.isPending}
                  >
                    {stakeMutation.isPending ? 'Staking...' : 'Stake FROTH'}
                  </Button>
                </TabsContent>
                <TabsContent value="unstake" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="unstake-amount">Amount to Unstake</Label>
                    <Input
                      id="unstake-amount"
                      type="number"
                      placeholder="0.00"
                      value={unstakeAmount}
                      onChange={(e) => setUnstakeAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Staked: 1,500 FROTH</p>
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handleUnstake}
                    disabled={!user.loggedIn || unstakeMutation.isPending}
                  >
                    {unstakeMutation.isPending ? 'Unstaking...' : 'Unstake FROTH'}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rewards Summary</CardTitle>
              <CardDescription>Your staking benefits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Current Discount</span>
                <Badge variant="default" className="text-lg">12%</Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Total Saved</span>
                <span className="text-lg font-bold">45 FLOW</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Staking Rewards</span>
                <span className="text-lg font-bold">12.5 FROTH</span>
              </div>
              <Button className="w-full">Claim Rewards</Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>Top FROTH stakers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockLeaderboard.map((entry) => (
                <div key={entry.rank} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div className="flex items-center gap-4">
                    <Badge variant={entry.rank === 1 ? 'default' : 'secondary'}>
                      #{entry.rank}
                    </Badge>
                    <div>
                      <p className="font-medium">{entry.address}</p>
                      <p className="text-sm text-muted-foreground">{entry.staked}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{entry.discount} discount</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
