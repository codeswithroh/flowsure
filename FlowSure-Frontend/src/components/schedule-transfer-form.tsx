'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduledTransfersApi, CreateScheduledTransferRequest } from '@/lib/api/scheduled-transfers';
import { useWalletStore } from '@/store/wallet-store';

interface ScheduleTransferFormProps {
  onSuccess?: () => void;
  selectedDate?: Date;
}

export function ScheduleTransferForm({ onSuccess, selectedDate }: ScheduleTransferFormProps) {
  const { user } = useWalletStore();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(
    selectedDate ? selectedDate.toISOString().split('T')[0] : ''
  );
  const [time, setTime] = useState('12:00');
  const [retryLimit, setRetryLimit] = useState('3');

  const createMutation = useMutation({
    mutationFn: (data: CreateScheduledTransferRequest) => scheduledTransfersApi.create(data),
    onSuccess: () => {
      toast.success('Transfer scheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['scheduled-transfers'] });
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to schedule transfer');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setRecipient('');
    setAmount('');
    setDate(selectedDate ? selectedDate.toISOString().split('T')[0] : '');
    setTime('12:00');
    setRetryLimit('3');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.addr) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!title || !recipient || !amount || !date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const scheduledDateTime = new Date(`${date}T${time}:00`);
    if (scheduledDateTime <= new Date()) {
      toast.error('Scheduled date must be in the future');
      return;
    }

    createMutation.mutate({
      userAddress: user.addr,
      title,
      description,
      recipient,
      amount: parseFloat(amount),
      scheduledDate: scheduledDateTime.toISOString(),
      retryLimit: parseInt(retryLimit),
    });
  };

  const baseFee = parseFloat(amount) * 0.02 || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Protected Transfer
        </CardTitle>
        <CardDescription>
          Schedule a FLOW transfer with automatic protection and retry logic
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Monthly Salary Payment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Add notes about this transfer"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (FLOW) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address *</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time *
              </Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="retries">Max Retries</Label>
            <Select value={retryLimit} onValueChange={setRetryLimit}>
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

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100 font-medium">
              <Shield className="h-4 w-4" />
              Auto-Protection Enabled
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <div className="flex justify-between">
                <span>Insurance Fee (2%):</span>
                <span className="font-medium">{baseFee.toFixed(4)} FLOW</span>
              </div>
              <p className="text-xs mt-2">
                This transfer will be automatically executed on the scheduled date with retry protection.
                You don't need to be online or sign the transaction.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={createMutation.isPending || !user?.loggedIn}
          >
            {createMutation.isPending ? 'Scheduling...' : 'Schedule Transfer'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
