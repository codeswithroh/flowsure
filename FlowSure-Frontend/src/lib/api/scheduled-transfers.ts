import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Recipient {
  address: string;
  name?: string;
}

export interface TransactionResult {
  recipient: string;
  transactionId: string;
  status: string;
  error?: string;
}

export interface ScheduledTransfer {
  id?: string;
  _id?: string; // MongoDB ID
  userAddress: string;
  title: string;
  description?: string;
  recipient?: string;
  recipients?: Recipient[];
  recipientListId?: string;
  amount: number;
  amountPerRecipient?: boolean;
  scheduledDate: string; // ISO date string
  status: 'scheduled' | 'executing' | 'completed' | 'failed' | 'cancelled';
  retryLimit: number;
  createdAt: string;
  updatedAt?: string;
  executedAt?: string;
  transactionId?: string;
  transactionIds?: TransactionResult[];
  errorMessage?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  recurringEndDate?: string;
  parentRecurringId?: string;
  nextScheduledDate?: string;
}

export interface CreateScheduledTransferRequest {
  userAddress: string;
  title: string;
  description?: string;
  recipient?: string;
  recipients?: Recipient[];
  recipientListId?: string;
  amount: number;
  amountPerRecipient?: boolean;
  scheduledDate: string;
  retryLimit: number;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  recurringEndDate?: string;
}

export interface RecurringCostCalculation {
  occurrences: number;
  costPerTransfer: number;
  totalCost: number;
  estimatedOnly: boolean;
}

export interface FlowScheduledTransferRequest {
  userAddress: string;
  title: string;
  description?: string;
  recipient: string;
  amount: number;
  scheduledDate: string;
  transactionId: string;
}

export const scheduledTransfersApi = {
  // Save Flow-scheduled transfer for tracking
  saveFlowScheduled: async (data: FlowScheduledTransferRequest): Promise<{ data: ScheduledTransfer }> => {
    const response = await axios.post(`${API_BASE_URL}/scheduled-transfers/flow-scheduled`, data);
    return response.data;
  },

  // Create a new scheduled transfer
  create: async (data: CreateScheduledTransferRequest): Promise<{ data: ScheduledTransfer }> => {
    const response = await axios.post(`${API_BASE_URL}/scheduled-transfers`, data);
    return response.data;
  },

  // Get all scheduled transfers for a user
  getByUser: async (userAddress: string): Promise<{ data: ScheduledTransfer[] }> => {
    const response = await axios.get(`${API_BASE_URL}/scheduled-transfers/user/${userAddress}`);
    return response.data;
  },

  // Get scheduled transfers for a specific month
  getByMonth: async (userAddress: string, year: number, month: number): Promise<{ data: ScheduledTransfer[] }> => {
    const response = await axios.get(`${API_BASE_URL}/scheduled-transfers/user/${userAddress}/month`, {
      params: { year, month }
    });
    return response.data;
  },

  // Get a single scheduled transfer
  getById: async (id: string): Promise<{ data: ScheduledTransfer }> => {
    const response = await axios.get(`${API_BASE_URL}/scheduled-transfers/${id}`);
    return response.data;
  },

  // Update a scheduled transfer
  update: async (id: string, data: Partial<CreateScheduledTransferRequest>): Promise<{ data: ScheduledTransfer }> => {
    const response = await axios.put(`${API_BASE_URL}/scheduled-transfers/${id}`, data);
    return response.data;
  },

  // Cancel a scheduled transfer
  cancel: async (id: string): Promise<{ data: ScheduledTransfer }> => {
    const response = await axios.delete(`${API_BASE_URL}/scheduled-transfers/${id}`);
    return response.data;
  },

  // Get upcoming scheduled transfers (next 7 days)
  getUpcoming: async (userAddress: string): Promise<{ data: ScheduledTransfer[] }> => {
    const response = await axios.get(`${API_BASE_URL}/scheduled-transfers/user/${userAddress}/upcoming`);
    return response.data;
  },

  // Calculate recurring transfer cost
  calculateRecurringCost: async (data: {
    amount: number;
    amountPerRecipient: boolean;
    recipientCount: number;
    startDate: string;
    frequency: string;
    endDate?: string;
  }): Promise<{ data: RecurringCostCalculation }> => {
    const response = await axios.post(`${API_BASE_URL}/scheduled-transfers/recurring/calculate-cost`, data);
    return response.data;
  },

  // Validate balance for recurring transfer
  validateRecurringBalance: async (data: {
    userAddress: string;
    amount: number;
    amountPerRecipient: boolean;
    recipientCount: number;
    startDate: string;
    frequency: string;
    endDate?: string;
  }): Promise<{ data: RecurringCostCalculation & { isValid: boolean } }> => {
    const response = await axios.post(`${API_BASE_URL}/scheduled-transfers/recurring/validate-balance`, data);
    return response.data;
  },

  // Cancel recurring transfer
  cancelRecurring: async (id: string): Promise<{ data: any; message: string }> => {
    const response = await axios.delete(`${API_BASE_URL}/scheduled-transfers/recurring/${id}`);
    return response.data;
  },

  // Get recurring transfer instances
  getRecurringInstances: async (parentId: string): Promise<{ data: ScheduledTransfer[] }> => {
    const response = await axios.get(`${API_BASE_URL}/scheduled-transfers/recurring/${parentId}/instances`);
    return response.data;
  },
};
