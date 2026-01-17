import { useState, useEffect, useCallback } from 'react';
import { api, getAuthMessage } from '../utils/api';
import { Narrative, User, Vault, VaultPosition } from '../types';

// Generic fetch hook
export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

// Narratives hook
export function useNarratives() {
  return useApiQuery<Narrative[]>(() => api.getNarratives(), []);
}

// User hook
export function useUser(walletAddress: string | undefined) {
  return useApiQuery<User | null>(
    async () => {
      if (!walletAddress) return null;
      try {
        return await api.getUser(walletAddress);
      } catch {
        return null;
      }
    },
    [walletAddress]
  );
}

// Vaults hook
export function useVaults() {
  return useApiQuery<Vault[]>(() => api.getVaults(), []);
}

// Single vault hook
export function useVault(vaultId: string | undefined) {
  return useApiQuery(
    async () => {
      if (!vaultId) return null;
      return api.getVault(vaultId);
    },
    [vaultId]
  );
}

// Vault position hook
export function useVaultPosition(vaultId: string | undefined) {
  return useApiQuery<VaultPosition | null>(
    async () => {
      if (!vaultId) return null;
      return api.getVaultPosition(vaultId);
    },
    [vaultId]
  );
}

// PnL history hook
export function usePnLHistory(vaultId: string | undefined, limit: number = 30) {
  return useApiQuery(
    async () => {
      if (!vaultId) return [];
      return api.getPnLHistory(vaultId, limit);
    },
    [vaultId, limit]
  );
}

// Leaderboard hooks
export function useUserLeaderboard(limit: number = 10) {
  return useApiQuery(() => api.getUserLeaderboard(limit), [limit]);
}

export function useVaultLeaderboard(limit: number = 10) {
  return useApiQuery(() => api.getVaultLeaderboard(limit), [limit]);
}

// Authentication hook
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const authenticate = useCallback(
    async (
      walletAddress: string,
      signMessage: (message: string) => Promise<string>
    ) => {
      setAuthenticating(true);
      try {
        const timestamp = Date.now();
        const message = getAuthMessage(timestamp);
        const signature = await signMessage(message);
        api.setAuth(walletAddress, signature, timestamp);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication failed:', error);
        throw error;
      } finally {
        setAuthenticating(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    api.clearAuth();
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, authenticating, authenticate, logout };
}

// Deposit mutation hook
export function useDeposit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deposit = useCallback(
    async (narrativeId: string, amount: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.deposit(narrativeId, amount);
        return result;
      } catch (err: any) {
        setError(err.message || 'Deposit failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { deposit, loading, error };
}

// Withdraw mutation hook
export function useWithdraw() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withdraw = useCallback(
    async (vaultId: string, shareTokens: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.withdraw(vaultId, shareTokens);
        return result;
      } catch (err: any) {
        setError(err.message || 'Withdrawal failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const previewWithdraw = useCallback(
    async (vaultId: string, shareTokens: number) => {
      try {
        return await api.previewWithdrawal(vaultId, shareTokens);
      } catch (err: any) {
        throw err;
      }
    },
    []
  );

  return { withdraw, previewWithdraw, loading, error };
}
