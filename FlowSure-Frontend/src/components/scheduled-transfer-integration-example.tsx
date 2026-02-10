'use client';

/**
 * Example integration of Flow's native scheduled transactions
 * This shows how to use the new system in your components
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useWalletStore } from '@/store/wallet-store';
import {
  initializeScheduledTransferHandler,
  scheduleTransfer,
  checkHandlerInitialized
} from '@/lib/scheduled-transfer-auth';

export function ScheduledTransferIntegrationExample() {
  const { user } = useWalletStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if handler is initialized on mount
  useEffect(() => {
    if (user?.addr) {
      checkHandlerInitialized(user.addr)
        .then(setIsInitialized)
        .finally(() => setIsChecking(false));
    }
  }, [user?.addr]);

  // Step 1: Initialize Handler (one-time setup)
  const handleInitialize = async () => {
    if (!user?.addr) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      const txId = await initializeScheduledTransferHandler();
      toast.success(`Handler initialized! TX: ${txId.slice(0, 8)}...`);
      setIsInitialized(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize handler');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Schedule a Transfer
  const handleScheduleTransfer = async (
    recipient: string,
    amount: number,
    scheduledDate: Date
  ) => {
    if (!user?.addr) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!isInitialized) {
      toast.error('Please initialize handler first');
      return;
    }

    // Calculate delay in seconds
    const delaySeconds = Math.floor((scheduledDate.getTime() - Date.now()) / 1000);
    
    if (delaySeconds <= 0) {
      toast.error('Scheduled date must be in the future');
      return;
    }

    setIsLoading(true);
    try {
      const txId = await scheduleTransfer(recipient, amount, delaySeconds);
      toast.success(`Transfer scheduled! TX: ${txId.slice(0, 8)}...`);
      
      // Optionally save to MongoDB for UI tracking
      // await scheduledTransfersApi.create({ ... });
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule transfer');
    } finally {
      setIsLoading(false);
    }
  };

  // Example: Schedule a transfer for 2 minutes from now
  const handleQuickTest = () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
    handleScheduleTransfer(
      '0x1234567890abcdef', // Replace with actual recipient
      1.0, // 1 FLOW
      futureDate
    );
  };

  if (!user?.addr) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Transfers</CardTitle>
          <CardDescription>Connect your wallet to get started</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isChecking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checking initialization...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flow Native Scheduled Transfers</CardTitle>
        <CardDescription>
          {isInitialized
            ? 'Your handler is initialized. You can now schedule transfers!'
            : 'Initialize your handler to start scheduling transfers'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isInitialized ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This is a one-time setup. You'll sign a transaction to create a Handler
              resource in your account that allows Flow's blockchain to execute scheduled
              transfers on your behalf.
            </p>
            <Button
              onClick={handleInitialize}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Initializing...' : 'Initialize Handler'}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              ✅ Handler initialized! You can now schedule transfers.
            </p>
            <Button
              onClick={handleQuickTest}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Scheduling...' : 'Test: Schedule Transfer (2 min)'}
            </Button>
            <p className="text-xs text-muted-foreground">
              This will schedule a 1 FLOW transfer to execute in 2 minutes.
              Flow's blockchain will automatically execute it.
            </p>
          </div>
        )}

        <div className="pt-4 border-t space-y-2">
          <h4 className="font-semibold text-sm">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>You sign a transaction to schedule the transfer</li>
            <li>You pay gas fees upfront (~0.001-0.01 FLOW)</li>
            <li>Flow's blockchain automatically executes at scheduled time</li>
            <li>Transfer comes directly from your wallet</li>
            <li>No backend service needed!</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
