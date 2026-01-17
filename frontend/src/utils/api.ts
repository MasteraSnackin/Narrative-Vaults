import { Narrative, User, Vault, VaultPosition, Trade, XPEvent } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
  message: string;
  status: number;
}

interface AuthHeaders {
  walletAddress: string;
  signature: string;
  timestamp: number;
}

class ApiClient {
  private baseUrl: string;
  private authHeaders: AuthHeaders | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication credentials for authenticated requests
   */
  setAuth(walletAddress: string, signature: string, timestamp: number) {
    this.authHeaders = { walletAddress, signature, timestamp };
  }

  /**
   * Clear authentication credentials
   */
  clearAuth() {
    this.authHeaders = null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authHeaders) {
      headers['x-wallet-address'] = this.authHeaders.walletAddress;
      headers['x-signature'] = this.authHeaders.signature;
      headers['x-timestamp'] = this.authHeaders.timestamp.toString();
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = {
        message: 'An error occurred',
        status: response.status,
      };

      try {
        const data = await response.json();
        error.message = data.message || error.message;
      } catch {
        // Ignore JSON parse errors
      }

      throw error;
    }

    return response.json();
  }

  // ==========================================
  // Narrative Endpoints
  // ==========================================

  async getNarratives(): Promise<Narrative[]> {
    return this.request<Narrative[]>('/api/narratives');
  }

  // ==========================================
  // User Endpoints
  // ==========================================

  async getUser(walletAddress: string): Promise<User> {
    return this.request<User>(`/api/user/${walletAddress}`);
  }

  async getUserWithdrawals(limit: number = 20): Promise<any[]> {
    return this.request<any[]>(`/api/user/withdrawals?limit=${limit}`);
  }

  // ==========================================
  // Vault Endpoints
  // ==========================================

  async getVaults(): Promise<Vault[]> {
    return this.request<Vault[]>('/api/vaults');
  }

  async getVault(vaultId: string): Promise<Vault & { narrative?: Narrative; VaultPositions?: VaultPosition[]; Trades?: Trade[] }> {
    return this.request(`/api/vaults/${vaultId}`);
  }

  async deposit(
    narrativeId: string,
    depositAmount: number
  ): Promise<{ message: string; vaultId: string; shareTokensMinted: number }> {
    return this.request(`/api/vaults/${narrativeId}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ depositAmount }),
    });
  }

  async withdraw(
    vaultId: string,
    shareTokensToBurn: number
  ): Promise<{
    message: string;
    grossAmount: number;
    fee: number;
    netAmount: number;
    realizedPnL: number;
    txHash: string;
  }> {
    return this.request(`/api/vaults/${vaultId}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ shareTokensToBurn }),
    });
  }

  async previewWithdrawal(
    vaultId: string,
    shareTokensToBurn: number
  ): Promise<{
    shareTokensToBurn: number;
    estimatedUSDC: number;
    fee: number;
    netAmount: number;
    pnlRealized: number;
    currentShareValue: number;
  }> {
    return this.request(`/api/vaults/${vaultId}/withdraw/preview?shares=${shareTokensToBurn}`);
  }

  async getVaultPosition(vaultId: string): Promise<VaultPosition | null> {
    try {
      return await this.request<VaultPosition>(`/api/vaults/${vaultId}/position`);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getPnLHistory(
    vaultId: string,
    limit: number = 30
  ): Promise<{ timestamp: string; pnl: number; value: number }[]> {
    return this.request(`/api/vaults/${vaultId}/pnl-history?limit=${limit}`);
  }

  // ==========================================
  // Leaderboard Endpoints
  // ==========================================

  async getUserLeaderboard(limit: number = 10): Promise<{
    users: { wallet_address: string; total_xp: number; current_level: number }[];
  }> {
    return this.request(`/api/leaderboard?type=users&limit=${limit}`);
  }

  async getVaultLeaderboard(limit: number = 10): Promise<{
    vaults: { id: string; narrative_id: string; current_pnl: number; total_deposits: number }[];
  }> {
    return this.request(`/api/leaderboard?type=vaults&limit=${limit}`);
  }

  // ==========================================
  // Admin Endpoints
  // ==========================================

  async emergencyPause(): Promise<{ message: string; status: string }> {
    return this.request('/api/admin/emergency-pause', { method: 'POST' });
  }

  async resumeVaults(): Promise<{ message: string; status: string }> {
    return this.request('/api/admin/resume', { method: 'POST' });
  }

  // ==========================================
  // Health Check
  // ==========================================

  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    services?: { salt: any; hyperliquid: any };
  }> {
    return this.request('/health');
  }

  async apiHealthCheck(): Promise<{
    status: string;
    timestamp: string;
    version: string;
  }> {
    return this.request('/api/health');
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Export class for custom instances
export { ApiClient };

// Helper function to generate auth message for signing
export function getAuthMessage(timestamp: number): string {
  return `Sign this message to authenticate with Narrative Vaults: ${timestamp}`;
}

// Helper hook utilities for React
export async function authenticateWithWallet(
  signMessage: (message: string) => Promise<string>,
  walletAddress: string
): Promise<void> {
  const timestamp = Date.now();
  const message = getAuthMessage(timestamp);
  const signature = await signMessage(message);
  api.setAuth(walletAddress, signature, timestamp);
}
