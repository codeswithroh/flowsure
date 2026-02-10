const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface Recipient {
  _id?: string;
  address: string;
  name?: string;
  addedAt?: string;
}

export interface RecipientList {
  _id?: string;
  id?: string;
  userAddress: string;
  name: string;
  description?: string;
  recipients: Recipient[];
  tags?: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export const recipientListsApi = {
  async create(data: Omit<RecipientList, '_id' | 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<RecipientList>> {
    const response = await fetch(`${API_BASE_URL}/recipient-lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create recipient list');
    return response.json();
  },

  async getByUser(userAddress: string, includeInactive = false): Promise<ApiResponse<RecipientList[]>> {
    const url = new URL(`${API_BASE_URL}/recipient-lists/user/${userAddress}`);
    if (includeInactive) url.searchParams.set('includeInactive', 'true');
    
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to fetch recipient lists');
    return response.json();
  },

  async getById(id: string): Promise<ApiResponse<RecipientList>> {
    const response = await fetch(`${API_BASE_URL}/recipient-lists/${id}`);
    if (!response.ok) throw new Error('Failed to fetch recipient list');
    return response.json();
  },

  async update(id: string, data: Partial<RecipientList>): Promise<ApiResponse<RecipientList>> {
    const response = await fetch(`${API_BASE_URL}/recipient-lists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update recipient list');
    return response.json();
  },

  async addRecipients(id: string, recipients: Recipient[]): Promise<ApiResponse<RecipientList>> {
    const response = await fetch(`${API_BASE_URL}/recipient-lists/${id}/recipients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients }),
    });
    if (!response.ok) throw new Error('Failed to add recipients');
    return response.json();
  },

  async removeRecipient(id: string, recipientId: string): Promise<ApiResponse<RecipientList>> {
    const response = await fetch(`${API_BASE_URL}/recipient-lists/${id}/recipients/${recipientId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove recipient');
    return response.json();
  },

  async delete(id: string): Promise<ApiResponse<RecipientList>> {
    const response = await fetch(`${API_BASE_URL}/recipient-lists/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete recipient list');
    return response.json();
  },
};
