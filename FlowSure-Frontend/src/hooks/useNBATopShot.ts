import { useState, useEffect } from 'react';
import axios from 'axios';

export interface NBAMoment {
  id: string;
  flowId: string;
  player: {
    name: string;
    team: string;
    position: string;
  };
  play: {
    category: string;
    date: string;
    description: string;
  };
  set: {
    id: string;
    name: string;
    series: number;
  };
  serialNumber: number;
  price: number;
  listingOrderID: string | null;
  isListed: boolean;
  owner: string | null;
  value?: number;
  protection?: ProtectionRecommendation;
  isProtected?: boolean;
  protectionId?: string | null;
}

export interface ProtectionRecommendation {
  recommended: boolean;
  reason: string;
  suggestedCoverage: number;
  suggestedFee: number;
  priority: 'high' | 'medium' | 'low';
}

export function useNBATopShot() {
  const [moments, setMoments] = useState<NBAMoment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  // Fetch user's moments
  const fetchUserMoments = async (address: string): Promise<NBAMoment[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${apiUrl}/nba-topshot/moments/${address}`);
      
      if (response.data.success) {
        setMoments(response.data.data);
        return response.data.data;
      } else {
        throw new Error('Failed to fetch moments');
      }
    } catch (err: any) {
      console.error('Error fetching NBA Top Shot moments:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch moment details
  const fetchMomentDetails = async (momentId: string): Promise<NBAMoment | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${apiUrl}/nba-topshot/moment/${momentId}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error('Moment not found');
      }
    } catch (err: any) {
      console.error('Error fetching moment details:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch protected moments
  const fetchProtectedMoments = async (address: string): Promise<NBAMoment[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${apiUrl}/nba-topshot/protected/${address}`);
      
      if (response.data.success) {
        setMoments(response.data.data);
        return response.data.data;
      } else {
        throw new Error('Failed to fetch protected moments');
      }
    } catch (err: any) {
      console.error('Error fetching protected moments:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get moment value and protection recommendation
  const getMomentValue = async (momentId: string) => {
    try {
      const response = await axios.get(`${apiUrl}/nba-topshot/value/${momentId}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (err: any) {
      console.error('Error getting moment value:', err);
      return null;
    }
  };

  // Fetch marketplace listings
  const fetchMarketplaceListings = async (filters?: {
    playerName?: string;
    setName?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.playerName) params.append('playerName', filters.playerName);
      if (filters?.setName) params.append('setName', filters.setName);
      if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await axios.get(`${apiUrl}/nba-topshot/marketplace?${params.toString()}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (err: any) {
      console.error('Error fetching marketplace listings:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Filter moments by criteria
  const filterMoments = (criteria: {
    minValue?: number;
    maxValue?: number;
    player?: string;
    set?: string;
    isListed?: boolean;
    isProtected?: boolean;
  }): NBAMoment[] => {
    return moments.filter(moment => {
      if (criteria.minValue && (moment.value || 0) < criteria.minValue) return false;
      if (criteria.maxValue && (moment.value || 0) > criteria.maxValue) return false;
      if (criteria.player && !moment.player.name.toLowerCase().includes(criteria.player.toLowerCase())) return false;
      if (criteria.set && !moment.set.name.toLowerCase().includes(criteria.set.toLowerCase())) return false;
      if (criteria.isListed !== undefined && moment.isListed !== criteria.isListed) return false;
      if (criteria.isProtected !== undefined && moment.isProtected !== criteria.isProtected) return false;
      return true;
    });
  };

  // Get high-value moments (recommended for protection)
  const getHighValueMoments = (): NBAMoment[] => {
    return moments.filter(moment => 
      moment.protection?.recommended && 
      moment.protection.priority === 'high'
    );
  };

  // Get unprotected valuable moments
  const getUnprotectedValuableMoments = (): NBAMoment[] => {
    return moments.filter(moment => 
      !moment.isProtected && 
      moment.protection?.recommended
    );
  };

  // Calculate total portfolio value
  const getTotalPortfolioValue = (): number => {
    return moments.reduce((total, moment) => total + (moment.value || 0), 0);
  };

  // Get protection coverage percentage
  const getProtectionCoverage = (): number => {
    const totalValue = getTotalPortfolioValue();
    if (totalValue === 0) return 0;

    const protectedValue = moments
      .filter(m => m.isProtected)
      .reduce((total, moment) => total + (moment.value || 0), 0);

    return (protectedValue / totalValue) * 100;
  };

  return {
    moments,
    loading,
    error,
    fetchUserMoments,
    fetchMomentDetails,
    fetchProtectedMoments,
    getMomentValue,
    fetchMarketplaceListings,
    filterMoments,
    getHighValueMoments,
    getUnprotectedValuableMoments,
    getTotalPortfolioValue,
    getProtectionCoverage
  };
}
