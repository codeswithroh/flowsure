'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coins, TrendingUp, Award, Wallet, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { fcl } from '@/lib/flow-config';
import { createStaker, stakeFlow, unstakeFlow, claimRewards, getStakingSummary, getFlowBalance } from '@/lib/staking-transactions';

export function StakingPage() {
  const [user, setUser] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [stakingData, setStakingData] = useState<any>(null);
  const [flowBalance, setFlowBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasStaker, setHasStaker] = useState(false);

  useEffect(() => {
    fcl.currentUser.subscribe(setUser);
  }, []);

  useEffect(() => {
    if (user?.addr) {
      loadStakingData();
      loadFlowBalance();
      const interval = setInterval(loadStakingData, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.addr]);

  const loadStakingData = async () => {
    if (!user?.addr) return;
    
    try {
      const data = await getStakingSummary(user.addr);
      setStakingData(data);
      setHasStaker(!!data);
    } catch (error) {
      console.error('Error loading staking data:', error);
      setHasStaker(false);
    }
  };

  const loadFlowBalance = async () => {
    if (!user?.addr) return;
    
    try {
      const balance = await getFlowBalance(user.addr);
      setFlowBalance(balance);
    } catch (error) {
      console.error('Error loading FLOW balance:', error);
    }
  };

  const handleCreateStaker = async () => {
    setLoading(true);
    try {
      await createStaker();
      toast.success('Staker created successfully!');
      await loadStakingData();
    } catch (error: any) {
      console.error('Error creating staker:', error);
      toast.error(error.message || 'Failed to create staker');
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > flowBalance) {
      toast.error('Insufficient FLOW balance');
      return;
    }

    setLoading(true);
    try {
      await stakeFlow(amount);
      toast.success(`Successfully staked ${amount} FLOW!`);
      setStakeAmount('');
      await loadStakingData();
      await loadFlowBalance();
    } catch (error: any) {
      console.error('Error staking:', error);
      toast.error(error.message || 'Failed to stake FLOW');
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    const amount = parseFloat(unstakeAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > (stakingData?.stakedAmount || 0)) {
      toast.error('Insufficient staked balance');
      return;
    }

    setLoading(true);
    try {
      await unstakeFlow(amount);
      toast.success(`Successfully unstaked ${amount} FLOW!`);
      setUnstakeAmount('');
      await loadStakingData();
      await loadFlowBalance();
    } catch (error: any) {
      console.error('Error unstaking:', error);
      toast.error(error.message || 'Failed to unstake FLOW');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!stakingData?.pendingRewards || parseFloat(stakingData.pendingRewards) <= 0) {
      toast.error('No rewards to claim');
      return;
    }

    setLoading(true);
    try {
      await claimRewards();
      toast.success('Rewards claimed successfully!');
      await loadStakingData();
      await loadFlowBalance();
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      toast.error(error.message || 'Failed to claim rewards');
    } finally {
      setLoading(false);
    }
  };

  const getDiscountTier = () => {
    const staked = stakingData?.stakedAmount ? parseFloat(stakingData.stakedAmount) : 0;
    if (staked >= 100) return { tier: 'Gold', discount: '20%', color: 'bg-yellow-500' };
    if (staked >= 50) return { tier: 'Silver', discount: '10%', color: 'bg-gray-400' };
    return { tier: 'Bronze', discount: '0%', color: 'bg-orange-600' };
  };

  const discountTier = getDiscountTier();

  if (!user?.loggedIn) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>Please connect your wallet to access staking</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => fcl.authenticate()}>
                Connect Wallet
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!hasStaker) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Setup Staking</CardTitle>
              <CardDescription>Create your staker account to start earning rewards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Benefits:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Earn 5% APY on staked FLOW</li>
                  <li>• Get up to 20% discount on insurance fees</li>
                  <li>• No lock-up period - unstake anytime</li>
                </ul>
              </div>
              <Button 
                className="w-full" 
                onClick={handleCreateStaker}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Staker Account'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">FLOW Staking</h1>
          <p className="text-muted-foreground">Stake FLOW tokens to unlock insurance discounts and earn 5% APY rewards</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{flowBalance.toFixed(2)} FLOW</div>
              <p className="text-xs text-muted-foreground">Available to stake</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Staked</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stakingData?.stakedAmount ? parseFloat(stakingData.stakedAmount).toFixed(2) : '0.00'} FLOW</div>
              <p className="text-xs text-muted-foreground">Earning 5% APY</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stakingData?.pendingRewards ? parseFloat(stakingData.pendingRewards).toFixed(8) : '0.00000000'} FLOW</div>
              <p className="text-xs text-muted-foreground">Ready to claim</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Discount</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{discountTier.discount}</div>
              <Badge className={discountTier.color}>{discountTier.tier} Tier</Badge>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stake / Unstake</CardTitle>
              <CardDescription>Manage your FLOW staking position</CardDescription>
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
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">Balance: {flowBalance.toFixed(2)} FLOW</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setStakeAmount((flowBalance * 0.25).toFixed(2))}>25%</Button>
                    <Button size="sm" variant="outline" onClick={() => setStakeAmount((flowBalance * 0.5).toFixed(2))}>50%</Button>
                    <Button size="sm" variant="outline" onClick={() => setStakeAmount((flowBalance * 0.75).toFixed(2))}>75%</Button>
                    <Button size="sm" variant="outline" onClick={() => setStakeAmount((flowBalance * 0.99).toFixed(2))}>Max</Button>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleStake}
                    disabled={loading || !stakeAmount}
                  >
                    {loading ? 'Staking...' : 'Stake FLOW'}
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
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">Staked: {stakingData?.stakedAmount ? parseFloat(stakingData.stakedAmount).toFixed(2) : '0.00'} FLOW</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setUnstakeAmount(((parseFloat(stakingData?.stakedAmount || '0')) * 0.25).toFixed(2))}>25%</Button>
                    <Button size="sm" variant="outline" onClick={() => setUnstakeAmount(((parseFloat(stakingData?.stakedAmount || '0')) * 0.5).toFixed(2))}>50%</Button>
                    <Button size="sm" variant="outline" onClick={() => setUnstakeAmount(((parseFloat(stakingData?.stakedAmount || '0')) * 0.75).toFixed(2))}>75%</Button>
                    <Button size="sm" variant="outline" onClick={() => setUnstakeAmount((parseFloat(stakingData?.stakedAmount || '0')).toFixed(2))}>Max</Button>
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={handleUnstake}
                    disabled={loading || !unstakeAmount}
                  >
                    {loading ? 'Unstaking...' : 'Unstake FLOW'}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rewards & Benefits</CardTitle>
              <CardDescription>Your staking benefits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Current Discount</span>
                <Badge variant="default" className="text-lg">{discountTier.discount}</Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Pending Rewards</span>
                <span className="text-lg font-bold">{stakingData?.pendingRewards ? parseFloat(stakingData.pendingRewards).toFixed(8) : '0.00000000'} FLOW</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">APY</span>
                <span className="text-lg font-bold text-green-600">5.00%</span>
              </div>
              <Button 
                className="w-full"
                onClick={handleClaimRewards}
                disabled={loading || !stakingData?.pendingRewards || parseFloat(stakingData.pendingRewards) <= 0}
              >
                {loading ? 'Claiming...' : 'Claim Rewards'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Discount Tiers</CardTitle>
            <CardDescription>Stake more to unlock higher discounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                  <Badge className="bg-orange-600">Bronze</Badge>
                  <div>
                    <p className="font-medium">0 - 49 FLOW</p>
                    <p className="text-sm text-muted-foreground">No discount</p>
                  </div>
                </div>
                <Badge variant="outline">0% discount</Badge>
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                  <Badge className="bg-gray-400">Silver</Badge>
                  <div>
                    <p className="font-medium">50 - 99 FLOW</p>
                    <p className="text-sm text-muted-foreground">Good savings</p>
                  </div>
                </div>
                <Badge variant="outline">10% discount</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge className="bg-yellow-500">Gold</Badge>
                  <div>
                    <p className="font-medium">100+ FLOW</p>
                    <p className="text-sm text-muted-foreground">Maximum savings</p>
                  </div>
                </div>
                <Badge variant="outline">20% discount</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global Stats</CardTitle>
            <CardDescription>Network-wide staking statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Total Staked</span>
                <span className="text-lg font-bold">{stakingData?.totalStakedGlobal ? parseFloat(stakingData.totalStakedGlobal).toFixed(2) : '0.00'} FLOW</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Total Stakers</span>
                <span className="text-lg font-bold">{stakingData?.totalStakersGlobal || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
