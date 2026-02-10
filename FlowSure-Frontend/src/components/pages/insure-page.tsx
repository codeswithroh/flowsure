'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Coins, Send, Shield, Percent, Loader2 } from 'lucide-react';
import { useWalletStore } from '@/store/wallet-store';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionApi } from '@/lib/api-client';
import { executeInsuredAction } from '@/lib/flow-transactions';
import { getStakingSummary } from '@/lib/staking-transactions';
import { TransactionHistory } from '@/components/transaction-history';

type ActionType = 'mint' | 'transfer';

export function InsurePage() {
  const { user } = useWalletStore();
  const queryClient = useQueryClient();
  const [actionType, setActionType] = useState<ActionType>('transfer');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [retries, setRetries] = useState('3');

  const { data: stakingData } = useQuery({
    queryKey: ['staking-summary', user?.addr],
    queryFn: () => getStakingSummary(user.addr!),
    enabled: !!user?.addr,
  });

  const flowStaked = stakingData?.stakedAmount ? parseFloat(stakingData.stakedAmount) : 0;
  const discountDecimal = stakingData?.discount ? parseFloat(stakingData.discount) : 0;
  const discountPercent = discountDecimal * 100;

  const baseFee = parseFloat(amount) * 0.02 || 0;
  const finalFee = baseFee * (1 - discountDecimal);
  const savings = baseFee - finalFee;

  const executeMutation = useMutation({
    mutationFn: async () => {
      const result = await executeInsuredAction(
        actionType,
        parseFloat(amount),
        recipient || user.addr!,
        parseInt(retries)
      );
      
      await transactionApi.execute(
        user.addr!,
        actionType,
        parseFloat(amount),
        recipient || undefined,
        parseInt(retries),
        result.transactionId,
        result.status
      );
      
      return result;
    },
    onSuccess: (result) => {
      toast.success(`Transaction protected! TX ID: ${result.transactionId}`);
      setAmount('');
      setRecipient('');
      queryClient.invalidateQueries({ queryKey: ['user-actions', user.addr] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to execute transaction');
    },
  });

  const handleExecute = () => {
    if (!user.loggedIn) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    executeMutation.mutate();
  };

  const actionIcons = {
    mint: Coins,
    transfer: Send,
  };

  const ActionIcon = actionIcons[actionType];

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Insure Transaction</h1>
          <p className="text-muted-foreground">Wrap your transaction with automatic retry protection</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card 
            className={`cursor-pointer transition-all ${actionType === 'mint' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActionType('mint')}
          >
            <CardHeader className="text-center">
              <Coins className="h-8 w-8 mx-auto mb-2" />
              <CardTitle>Mint</CardTitle>
              <CardDescription>NFT minting</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${actionType === 'transfer' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActionType('transfer')}
          >
            <CardHeader className="text-center">
              <Send className="h-8 w-8 mx-auto mb-2" />
              <CardTitle>Transfer</CardTitle>
              <CardDescription>Asset transfers</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ActionIcon className="h-5 w-5" />
                Transaction Parameters
              </CardTitle>
              <CardDescription>Configure your protected transaction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="action-type">Action Type</Label>
                <Select value={actionType} onValueChange={(value) => setActionType(value as ActionType)}>
                  <SelectTrigger id="action-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mint">Mint</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {actionType === 'transfer' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (FLOW)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipient">Recipient Address</Label>
                    <Input
                      id="recipient"
                      type="text"
                      placeholder="0x..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {actionType === 'mint' && (
                <>
                  {/* Collection Selection Card */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Select Collection</Label>
                    <Select defaultValue="topshot">
                      <SelectTrigger className="h-auto p-4 border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="topshot">
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold">
                              🏀
                            </div>
                            <div className="text-left">
                              <div className="font-semibold">NBA Top Shot</div>
                              <div className="text-xs text-muted-foreground">Official NBA Moments</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="allday">
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                              🏈
                            </div>
                            <div className="text-left">
                              <div className="font-semibold">NFL All Day</div>
                              <div className="text-xs text-muted-foreground">Official NFL Moments</div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="disney">
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold">
                              ✨
                            </div>
                            <div className="text-left">
                              <div className="font-semibold">Disney Pinnacle</div>
                              <div className="text-xs text-muted-foreground">Disney Digital Collectibles</div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mint Details Card */}
                  <div className="border rounded-xl p-4 bg-muted/50 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Mint Price per NFT</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="text-2xl font-semibold h-auto py-2 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">F</div>
                          <span className="font-medium">FLOW</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const qty = parseInt((document.getElementById('quantity') as HTMLInputElement)?.value || '1');
                              if (qty > 1) (document.getElementById('quantity') as HTMLInputElement).value = (qty - 1).toString();
                            }}
                          >
                            -
                          </Button>
                          <Input
                            id="quantity"
                            type="number"
                            defaultValue="1"
                            min="1"
                            max="10"
                            className="w-16 text-center h-8"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const qty = parseInt((document.getElementById('quantity') as HTMLInputElement)?.value || '1');
                              if (qty < 10) (document.getElementById('quantity') as HTMLInputElement).value = (qty + 1).toString();
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Cost */}
                  {amount && parseFloat(amount) > 0 && (
                    <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Cost</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{parseFloat(amount).toFixed(2)} FLOW</div>
                          <div className="text-xs text-muted-foreground">≈ ${(parseFloat(amount) * 2.5).toFixed(2)} USD (simulated rate)</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}


              <div className="space-y-2">
                <Label htmlFor="retries">Max Retries</Label>
                <Select value={retries} onValueChange={setRetries}>
                  <SelectTrigger id="retries">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 retry</SelectItem>
                    <SelectItem value="2">2 retries</SelectItem>
                    <SelectItem value="3">3 retries</SelectItem>
                    <SelectItem value="5">5 retries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Fee Calculator
              </CardTitle>
              <CardDescription>Insurance cost with FLOW staking discount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Base Fee (2%)</span>
                  <span className="font-bold">{baseFee.toFixed(4)} FLOW</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    <span className="text-sm font-medium">FLOW Staking Discount</span>
                  </div>
                  <Badge variant="default">{discountPercent.toFixed(1)}%</Badge>
                </div>

                <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">You Save</span>
                  <span className="font-bold text-green-700 dark:text-green-300">
                    {savings.toFixed(4)} FLOW
                  </span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Final Fee</span>
                    <span className="text-2xl font-bold">{finalFee.toFixed(4)} FLOW</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your FLOW Staked</span>
                  <span className="font-medium">{flowStaked.toFixed(2)} FLOW</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Retries</span>
                  <span className="font-medium">{retries}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Gas</span>
                  <span className="font-medium">0.001 FLOW</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleExecute}
                disabled={!user.loggedIn || !amount || executeMutation.isPending}
              >
                {executeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Execute Protected Transaction
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <TransactionHistory />

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Configure Protection</h4>
                  <p className="text-sm text-muted-foreground">
                    Set your transaction parameters and retry limits
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Auto Retry</h4>
                  <p className="text-sm text-muted-foreground">
                    If transaction fails, we automatically retry up to your limit
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Get Compensated</h4>
                  <p className="text-sm text-muted-foreground">
                    If all retries fail, receive compensation from the vault
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
