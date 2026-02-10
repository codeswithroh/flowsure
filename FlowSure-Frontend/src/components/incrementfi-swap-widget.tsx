'use client';

import { useState, useEffect } from 'react';
import { useIncrementFiSwap } from '@/hooks/useIncrementFiSwap';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowDownUp, Shield, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';

export function IncrementFiSwapWidget() {
  const [inputAmount, setInputAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [retryLimit, setRetryLimit] = useState(3);
  const [swapResult, setSwapResult] = useState<any>(null);

  const {
    loading,
    error,
    quote,
    getSwapQuote,
    executeInsuredSwap,
    calculateMinimumReceived
  } = useIncrementFiSwap();

  // Get quote when input changes
  useEffect(() => {
    const amount = parseFloat(inputAmount);
    if (amount > 0) {
      const timer = setTimeout(() => {
        getSwapQuote(amount);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [inputAmount]);

  const handleSwap = async () => {
    const amount = parseFloat(inputAmount);
    if (!amount || !quote) return;

    const minReceived = calculateMinimumReceived(quote.outputAmount, slippage);
    const result = await executeInsuredSwap(amount, minReceived, slippage, retryLimit);
    
    if (result) {
      setSwapResult(result);
    }
  };

  const priceImpactColor = (impact: number) => {
    if (impact < 1) return 'text-green-600';
    if (impact < 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5" />
            <CardTitle>Insured Swap</CardTitle>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Protected
          </Badge>
        </div>
        <CardDescription>
          Swap tokens on IncrementFi with automatic retry protection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Amount */}
        <div className="space-y-2">
          <Label htmlFor="input-amount">You Pay</Label>
          <div className="relative">
            <Input
              id="input-amount"
              type="number"
              placeholder="0.0"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              className="pr-16 text-lg"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Badge variant="secondary">FLOW</Badge>
            </div>
          </div>
        </div>

        {/* Swap Arrow */}
        <div className="flex justify-center">
          <div className="rounded-full bg-gray-100 p-2">
            <ArrowDownUp className="h-4 w-4 text-gray-600" />
          </div>
        </div>

        {/* Output Amount */}
        <div className="space-y-2">
          <Label htmlFor="output-amount">You Receive (estimated)</Label>
          <div className="relative">
            <Input
              id="output-amount"
              type="text"
              value={quote ? quote.outputAmount.toFixed(4) : '0.0'}
              readOnly
              className="pr-16 text-lg bg-gray-50"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Badge variant="secondary">USDC</Badge>
            </div>
          </div>
        </div>

        {/* Quote Details */}
        {quote && quote.pairExists && (
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Price Impact</span>
              <span className={`font-medium ${priceImpactColor(quote.priceImpact)}`}>
                {quote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Trading Fee</span>
              <span className="font-medium">{quote.tradingFee.toFixed(4)} FLOW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Minimum Received</span>
              <span className="font-medium">{quote.minimumReceived.toFixed(4)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Route</span>
              <span className="font-medium text-xs">{quote.route.join(' → ')}</span>
            </div>
          </div>
        )}

        {/* Insurance Settings */}
        <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-900 font-medium text-sm">
            <Shield className="h-4 w-4" />
            Insurance Protection
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="slippage" className="text-xs text-blue-900">
                Slippage Tolerance
              </Label>
              <Input
                id="slippage"
                type="number"
                step="0.1"
                value={slippage}
                onChange={(e) => setSlippage(parseFloat(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="retry-limit" className="text-xs text-blue-900">
                Max Retries
              </Label>
              <Input
                id="retry-limit"
                type="number"
                min="1"
                max="5"
                value={retryLimit}
                onChange={(e) => setRetryLimit(parseInt(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="text-xs text-blue-700 flex items-start gap-2">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              If swap fails, it will automatically retry up to {retryLimit} times.
              If all retries fail, you'll receive compensation.
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {swapResult && swapResult.success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Swap Successful!</p>
              <p className="text-xs">Transaction ID: {swapResult.transactionId.slice(0, 16)}...</p>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={loading || !inputAmount || !quote || parseFloat(inputAmount) <= 0}
          className="w-full"
          size="lg"
        >
          {loading ? 'Processing...' : 'Execute Insured Swap'}
        </Button>

        {/* Info */}
        <div className="text-xs text-gray-500 text-center">
          Powered by IncrementFi • Protected by FlowSure
        </div>
      </CardContent>
    </Card>
  );
}
