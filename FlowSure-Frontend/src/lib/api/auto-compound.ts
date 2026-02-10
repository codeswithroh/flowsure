import { apiClient } from '../api-client';

export interface CompoundConfig {
  enabled: boolean;
  frequency: number;
  lastCompoundTime: number;
  nextCompoundTime: number;
  totalCompounded: number;
  compoundCount: number;
}

export interface PendingRewards {
  amount: number;
  timeUntilNext: string;
}

export interface GlobalStats {
  totalStaked: number;
  totalCompounds: number;
  totalRewardsCompounded: number;
  averageCompoundAmount: number;
}

export const autoCompoundApi = {
  async getConfig(address: string): Promise<CompoundConfig | null> {
    const response = await apiClient.get(`/auto-compound/config/${address}`);
    return response.data;
  },

  async getPendingRewards(address: string): Promise<number> {
    const response = await apiClient.get(`/auto-compound/rewards/${address}`);
    return response.data.amount;
  },

  async enableAutoCompound(address: string, frequency: number) {
    const response = await apiClient.post('/auto-compound/enable', {
      address,
      frequency
    });
    return response.data;
  },

  async disableAutoCompound(address: string) {
    const response = await apiClient.post('/auto-compound/disable', {
      address
    });
    return response.data;
  },

  async executeCompound(address: string) {
    const response = await apiClient.post('/auto-compound/execute', {
      address
    });
    return response.data;
  },

  async getGlobalStats(): Promise<GlobalStats> {
    const response = await apiClient.get('/auto-compound/stats');
    return response.data;
  },

  calculateProjectedAPY(baseAPR: number, compoundFrequency: number): number {
    const secondsPerYear = 31536000;
    const compoundsPerYear = secondsPerYear / compoundFrequency;
    return Math.pow(1 + (baseAPR / compoundsPerYear), compoundsPerYear) - 1;
  }
};
