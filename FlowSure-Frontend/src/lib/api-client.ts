import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;

export const frothApi = {
  getPrice: () => apiClient.get('/froth/price'),
  stake: (address: string, amount: number) => apiClient.post('/froth/stake', { address, amount }),
  unstake: (address: string, amount: number) => apiClient.post('/froth/unstake', { address, amount }),
  getStaker: (address: string) => apiClient.get(`/froth/staker/${address}`),
  getLeaderboard: () => apiClient.get('/froth/leaderboard'),
};

export const dapperApi = {
  getAssets: (address: string) => apiClient.get(`/dapper/assets/${address}`),
  insure: (address: string, nftId: string) => apiClient.post('/dapper/insure', { address, nftId }),
  getHistory: (address: string) => apiClient.get(`/dapper/history/${address}`),
};

export const metricsApi = {
  getStaking: () => apiClient.get('/metrics/staking'),
  getProtection: () => apiClient.get('/metrics/protection'),
  getVault: () => apiClient.get('/metrics/vault'),
};

export const transactionApi = {
  execute: (user: string, actionType: string, amount: number, recipient?: string, retryLimit?: number, txHash?: string, status?: string) => 
    apiClient.post('/transactions/execute', { user, actionType, amount, recipient, retryLimit, txHash, status }),
  getActionStatus: (actionId: string) => apiClient.get(`/transactions/action/${actionId}`),
  getUserActions: (address: string) => apiClient.get(`/transactions/user/${address}`),
};
