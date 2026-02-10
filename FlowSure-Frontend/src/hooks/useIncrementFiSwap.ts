import { useState } from 'react';
import { fcl } from '@/lib/flow-config';

export interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
  tradingFee: number;
  minimumReceived: number;
  pairExists: boolean;
  route: string[];
}

export interface SwapResult {
  success: boolean;
  message: string;
  actionId: string;
  transactionId: string;
  estimatedOutput: number;
}

export function useIncrementFiSwap() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapQuote | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_FLOW_CONTRACT_ACCOUNT || '0x8401ed4fc6788c8a';

  // Get swap quote
  const getSwapQuote = async (amountIn: number): Promise<SwapQuote | null> => {
    setLoading(true);
    setError(null);

    const script = `
      import FlowToken from 0x7e60df042a9c0868
      import IncrementFiConnector from ${contractAddress}

      access(all) fun main(amountIn: UFix64): SwapQuote {
        let tokenIn = Type<@FlowToken.Vault>()
        let tokenOut = Type<@FlowToken.Vault>()
        
        let pairExists = IncrementFiConnector.pairExists(
          tokenA: tokenIn,
          tokenB: tokenOut
        )
        
        if !pairExists {
          return SwapQuote(
            inputAmount: amountIn,
            outputAmount: 0.0,
            priceImpact: 0.0,
            tradingFee: 0.0,
            minimumReceived: 0.0,
            pairExists: false,
            route: []
          )
        }
        
        let outputAmount = IncrementFiConnector.getSwapQuote(
          tokenIn: tokenIn,
          tokenOut: tokenOut,
          amountIn: amountIn
        )
        
        let tradingFee = amountIn * 0.003
        let priceImpact = ((amountIn - outputAmount) / amountIn) * 100.0
        let slippage = 0.5
        let minimumReceived = outputAmount * (1.0 - (slippage / 100.0))
        
        return SwapQuote(
          inputAmount: amountIn,
          outputAmount: outputAmount,
          priceImpact: priceImpact,
          tradingFee: tradingFee,
          minimumReceived: minimumReceived,
          pairExists: true,
          route: ["FLOW", "USDC"]
        )
      }

      access(all) struct SwapQuote {
        access(all) let inputAmount: UFix64
        access(all) let outputAmount: UFix64
        access(all) let priceImpact: UFix64
        access(all) let tradingFee: UFix64
        access(all) let minimumReceived: UFix64
        access(all) let pairExists: Bool
        access(all) let route: [String]
        
        init(
          inputAmount: UFix64,
          outputAmount: UFix64,
          priceImpact: UFix64,
          tradingFee: UFix64,
          minimumReceived: UFix64,
          pairExists: Bool,
          route: [String]
        ) {
          self.inputAmount = inputAmount
          self.outputAmount = outputAmount
          self.priceImpact = priceImpact
          self.tradingFee = tradingFee
          self.minimumReceived = minimumReceived
          self.pairExists = pairExists
          self.route = route
        }
      }
    `;

    try {
      const result = await fcl.query({
        cadence: script,
        args: (arg, t) => [arg(amountIn.toFixed(8), t.UFix64)]
      });

      const quoteData: SwapQuote = {
        inputAmount: parseFloat(result.inputAmount),
        outputAmount: parseFloat(result.outputAmount),
        priceImpact: parseFloat(result.priceImpact),
        tradingFee: parseFloat(result.tradingFee),
        minimumReceived: parseFloat(result.minimumReceived),
        pairExists: result.pairExists,
        route: result.route
      };

      setQuote(quoteData);
      return quoteData;
    } catch (err: any) {
      console.error('Error getting swap quote:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Execute insured swap
  const executeInsuredSwap = async (
    amountIn: number,
    amountOutMin: number,
    slippageTolerance: number = 0.5,
    retryLimit: number = 3
  ): Promise<SwapResult | null> => {
    setLoading(true);
    setError(null);

    const transaction = `
      import FlowToken from 0x7e60df042a9c0868
      import FungibleToken from 0x9a0766d93b6608b7
      import IncrementFiConnector from ${contractAddress}
      import FrothRewards from ${contractAddress}
      import IFlowSureAction from ${contractAddress}

      transaction(
        amountIn: UFix64,
        amountOutMin: UFix64,
        slippageTolerance: UFix64,
        retryLimit: UInt8
      ) {
        let swapAction: IncrementFiConnector.IncrementFiSwapAction
        let insuranceFee: UFix64
        let estimatedOutput: UFix64
        
        prepare(signer: auth(BorrowValue) &Account) {
          self.swapAction = IncrementFiConnector.createInsuredSwap(
            tokenInType: Type<@FlowToken.Vault>(),
            tokenOutType: Type<@FlowToken.Vault>(),
            amountIn: amountIn,
            amountOutMin: amountOutMin,
            slippageTolerance: slippageTolerance,
            baseFee: 1.0,
            compensationAmount: 5.0,
            retryLimit: retryLimit,
            retryDelay: 30.0
          )
          
          self.insuranceFee = self.swapAction.estimateFees(user: signer.address)
          self.estimatedOutput = self.swapAction.estimateOutput(inputAmount: amountIn)
          
          log("Swap Action ID: ".concat(self.swapAction.uniqueID))
          log("Estimated Output: ".concat(self.estimatedOutput.toString()))
        }
        
        execute {
          let params: {String: AnyStruct} = {
            "inputAmount": amountIn,
            "minOutputAmount": amountOutMin
          }
          
          let result = self.swapAction.execute(
            user: self.swapAction.timestamp as! Address,
            params: params
          )
          
          log("Swap Result: ".concat(result.message))
        }
      }
    `;

    try {
      const transactionId = await fcl.mutate({
        cadence: transaction,
        args: (arg, t) => [
          arg(amountIn.toFixed(8), t.UFix64),
          arg(amountOutMin.toFixed(8), t.UFix64),
          arg(slippageTolerance.toFixed(2), t.UFix64),
          arg(retryLimit.toString(), t.UInt8)
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 9999
      });

      const tx = await fcl.tx(transactionId).onceSealed();

      const result: SwapResult = {
        success: tx.statusCode === 0,
        message: tx.statusCode === 0 ? 'Swap executed successfully' : 'Swap failed',
        actionId: transactionId,
        transactionId: transactionId,
        estimatedOutput: quote?.outputAmount || 0
      };

      return result;
    } catch (err: any) {
      console.error('Error executing swap:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Calculate price impact
  const calculatePriceImpact = (inputAmount: number, outputAmount: number): number => {
    if (inputAmount === 0) return 0;
    return ((inputAmount - outputAmount) / inputAmount) * 100;
  };

  // Calculate minimum received with slippage
  const calculateMinimumReceived = (outputAmount: number, slippageTolerance: number): number => {
    return outputAmount * (1 - slippageTolerance / 100);
  };

  return {
    loading,
    error,
    quote,
    getSwapQuote,
    executeInsuredSwap,
    calculatePriceImpact,
    calculateMinimumReceived
  };
}
