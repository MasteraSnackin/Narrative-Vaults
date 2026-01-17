import Head from 'next/head';
import Link from 'next/link';
import { Fragment, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import XPProgressBar from '../components/XPProgressBar';
import WalletConnectButton from '../components/WalletConnectButton';
import { api } from '../utils/api';
import { User, Vault, VaultPosition } from '../types';

// Level thresholds for XP progress
const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 501,
  3: 2001,
  4: 5001,
  5: 10001,
};

function getNextLevelThreshold(currentLevel: number): number {
  return LEVEL_THRESHOLDS[currentLevel + 1] || LEVEL_THRESHOLDS[5];
}

interface PositionWithVault extends VaultPosition {
  vault?: Vault;
  narrativeName?: string;
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const [positions, setPositions] = useState<PositionWithVault[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch user data and positions when authenticated
  useEffect(() => {
    if (isAuthenticated && address) {
      fetchUserData();
    } else {
      setUser(null);
      setPositions([]);
      setLoading(false);
    }
  }, [isAuthenticated, address]);

  // Fetch vaults on mount
  useEffect(() => {
    fetchVaults();
  }, []);

  const fetchUserData = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const userData = await api.getUser(address);
      setUser(userData);

      // Fetch user's positions across all vaults
      const vaultsData = await api.getVaults();
      const userPositions: PositionWithVault[] = [];

      for (const vault of vaultsData) {
        try {
          const position = await api.getVaultPosition(vault.id);
          if (position) {
            userPositions.push({
              ...position,
              vault,
              narrativeName: vault.narrative_id,
            });
          }
        } catch {
          // No position in this vault
        }
      }

      setPositions(userPositions);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVaults = async () => {
    try {
      const vaultsData = await api.getVaults();
      setVaults(vaultsData);
    } catch (error) {
      console.error('Error fetching vaults:', error);
    }
  };

  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  // Calculate total portfolio value
  const totalDeposits = positions.reduce((sum, p) => sum + p.deposit_amount, 0);
  const totalPnL = positions.reduce((sum, p) => {
    const vault = p.vault;
    if (!vault) return sum;
    // Calculate user's share of vault PnL
    const sharePercentage = p.share_tokens / (vault.total_deposits || 1);
    return sum + (vault.current_pnl * sharePercentage);
  }, 0);

  return (
    <Fragment>
      <Head>
        <title>Dashboard - Narrative Vaults</title>
      </Head>

      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Your Dashboard</h1>
          <WalletConnectButton onAuthChange={handleAuthChange} />
        </div>

        {!isConnected ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">Connect your wallet to view your dashboard and positions.</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-gray-400 mb-8">Please sign in with your wallet to access your dashboard.</p>
          </div>
        ) : loading ? (
          <div className="text-center py-20">
            <p className="text-gray-400">Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {/* XP & Level Section */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">XP & Level</h2>
              {user && (
                <>
                  <XPProgressBar
                    currentXP={user.total_xp}
                    currentLevel={user.current_level}
                    nextLevelThreshold={getNextLevelThreshold(user.current_level)}
                  />
                  <p className="text-gray-400 mt-2">
                    You are Level {user.current_level}.
                    {user.current_level < 5
                      ? ` ${getNextLevelThreshold(user.current_level) - user.total_xp} XP to Level ${user.current_level + 1}!`
                      : ' Max level reached!'}
                  </p>
                </>
              )}
            </section>

            {/* Portfolio Summary */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Portfolio Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg">
                  <p className="text-gray-400 text-sm">Total Deposited</p>
                  <p className="text-2xl font-bold">${totalDeposits.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                  <p className="text-gray-400 text-sm">Total P&L</p>
                  <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USDC
                  </p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg">
                  <p className="text-gray-400 text-sm">Active Positions</p>
                  <p className="text-2xl font-bold">{positions.length}</p>
                </div>
              </div>
            </section>

            {/* Active Positions */}
            <section className="mb-12">
              <h2 className="text-2xl font-semibold mb-4">Active Positions</h2>
              {positions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {positions.map((position) => {
                    const vault = position.vault;
                    const pnlShare = vault
                      ? (vault.current_pnl * (position.share_tokens / (vault.total_deposits || 1)))
                      : 0;

                    return (
                      <div key={position.id} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-semibold mb-2 capitalize">
                          {position.narrativeName?.replace(/-/g, ' ') || 'Unknown Narrative'}
                        </h3>
                        <div className="space-y-2 text-gray-300">
                          <p>Deposit: <span className="text-white">{position.deposit_amount.toFixed(2)} USDC</span></p>
                          <p>Share Tokens: <span className="text-white">{position.share_tokens.toFixed(4)}</span></p>
                          <p>
                            Your P&L:
                            <span className={`ml-2 ${pnlShare >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {pnlShare >= 0 ? '+' : ''}{pnlShare.toFixed(2)} USDC
                            </span>
                          </p>
                          <p>
                            Vault Status:
                            <span className={`ml-2 ${vault?.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                              {vault?.status || 'unknown'}
                            </span>
                          </p>
                        </div>
                        <Link
                          href={`/vault/${position.narrativeName}`}
                          className="mt-4 inline-block px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          View Details
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-gray-800 p-8 rounded-lg text-center">
                  <p className="text-gray-400 mb-4">No active positions yet.</p>
                  <Link
                    href="/"
                    className="px-6 py-3 bg-green-600 rounded-md hover:bg-green-700 font-semibold"
                  >
                    Explore Narratives
                  </Link>
                </div>
              )}
            </section>

            {/* Available Vaults */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Available Vaults</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {vaults.map((vault) => (
                  <Link
                    key={vault.id}
                    href={`/vault/${vault.narrative_id}`}
                    className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition"
                  >
                    <h3 className="font-semibold capitalize">{vault.narrative_id.replace(/-/g, ' ')}</h3>
                    <p className="text-sm text-gray-400">TVL: ${Number(vault.total_deposits).toFixed(2)}</p>
                    <p className={`text-sm ${vault.current_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      P&L: {vault.current_pnl >= 0 ? '+' : ''}{Number(vault.current_pnl).toFixed(2)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </Fragment>
  );
}
