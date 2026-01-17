import Head from 'next/head';
import Link from 'next/link';
import { Fragment, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import WalletConnectButton from '../components/WalletConnectButton';
import { api } from '../utils/api';
import { UserProfile } from '../types';

interface LeaderboardUser {
  wallet_address: string;
  total_xp: number;
  current_level: number;
}

interface LeaderboardVault {
  id: string;
  narrative_id: string;
  current_pnl: number;
  total_deposits: number;
}

export default function Leaderboard() {
  const { address } = useAccount();

  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [vaults, setVaults] = useState<LeaderboardVault[]>([]);
  const [topTraders, setTopTraders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'vaults' | 'traders'>('users');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      const [usersData, vaultsData, tradersData] = await Promise.all([
        api.getUserLeaderboard(20),
        api.getVaultLeaderboard(20),
        api.getTopTraders(20),
      ]);

      setUsers(usersData.users || []);
      setVaults(vaultsData.vaults || []);
      setTopTraders(tradersData || []);

      // Build following map from top traders data
      const map: Record<string, boolean> = {};
      tradersData.forEach((t: UserProfile) => {
        map[t.wallet_address] = t.is_following || false;
      });
      setFollowingMap(map);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (walletAddress: string) => {
    setFollowLoading(walletAddress);
    try {
      if (followingMap[walletAddress]) {
        await api.unfollowUser(walletAddress);
        setFollowingMap(prev => ({ ...prev, [walletAddress]: false }));
      } else {
        await api.followUser(walletAddress);
        setFollowingMap(prev => ({ ...prev, [walletAddress]: true }));
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(null);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getLevelBadge = (level: number): { color: string; label: string } => {
    const badges: Record<number, { color: string; label: string }> = {
      1: { color: 'bg-gray-600', label: 'Novice' },
      2: { color: 'bg-green-600', label: 'Trader' },
      3: { color: 'bg-blue-600', label: 'Expert' },
      4: { color: 'bg-purple-600', label: 'Master' },
      5: { color: 'bg-yellow-600', label: 'Legend' },
    };
    return badges[level] || badges[1];
  };

  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  return (
    <Fragment>
      <Head>
        <title>Leaderboard - Narrative Vaults</title>
      </Head>

      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Leaderboard</h1>
          <WalletConnectButton onAuthChange={handleAuthChange} />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8">
          <button
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('users')}
          >
            Top Users
          </button>
          <button
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'vaults'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('vaults')}
          >
            Top Vaults
          </button>
          <button
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'traders'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            onClick={() => setActiveTab('traders')}
          >
            Copy Traders
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-400">Loading leaderboard...</p>
          </div>
        ) : activeTab === 'users' ? (
          <section>
            <h2 className="text-2xl font-semibold mb-6">Top Users by XP</h2>
            {users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800 rounded-lg shadow-lg">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="py-4 px-6 text-left text-gray-300">Rank</th>
                      <th className="py-4 px-6 text-left text-gray-300">Wallet</th>
                      <th className="py-4 px-6 text-left text-gray-300">Total XP</th>
                      <th className="py-4 px-6 text-left text-gray-300">Level</th>
                      <th className="py-4 px-6 text-left text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr
                        key={user.wallet_address}
                        className={`border-b border-gray-700 last:border-b-0 ${
                          index < 3 ? 'bg-gray-750' : ''
                        }`}
                      >
                        <td className="py-4 px-6 text-xl">
                          {getRankBadge(index + 1)}
                        </td>
                        <td className="py-4 px-6">
                          <Link
                            href={`/profile/${user.wallet_address}`}
                            className="font-mono text-blue-400 hover:text-blue-300"
                          >
                            {formatAddress(user.wallet_address)}
                          </Link>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-yellow-400 font-bold">{user.total_xp.toLocaleString()}</span>
                          <span className="text-gray-500 ml-1">XP</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="bg-blue-600 px-3 py-1 rounded-full text-sm">
                            Level {user.current_level}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {isAuthenticated && user.wallet_address.toLowerCase() !== address?.toLowerCase() && (
                            <button
                              onClick={() => handleFollow(user.wallet_address)}
                              disabled={followLoading === user.wallet_address}
                              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                followingMap[user.wallet_address]
                                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              {followLoading === user.wallet_address
                                ? '...'
                                : followingMap[user.wallet_address]
                                ? 'Unfollow'
                                : 'Follow'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-800 p-8 rounded-lg text-center">
                <p className="text-gray-400">No users yet. Be the first to earn XP!</p>
              </div>
            )}
          </section>
        ) : activeTab === 'vaults' ? (
          <section>
            <h2 className="text-2xl font-semibold mb-6">Top Vaults by P&L</h2>
            {vaults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800 rounded-lg shadow-lg">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="py-4 px-6 text-left text-gray-300">Rank</th>
                      <th className="py-4 px-6 text-left text-gray-300">Narrative</th>
                      <th className="py-4 px-6 text-left text-gray-300">Current P&L</th>
                      <th className="py-4 px-6 text-left text-gray-300">TVL</th>
                      <th className="py-4 px-6 text-left text-gray-300">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaults.map((vault, index) => {
                      const pnl = Number(vault.current_pnl);
                      const tvl = Number(vault.total_deposits);
                      const roi = tvl > 0 ? (pnl / tvl) * 100 : 0;

                      return (
                        <tr
                          key={vault.id}
                          className={`border-b border-gray-700 last:border-b-0 hover:bg-gray-750 cursor-pointer ${
                            index < 3 ? 'bg-gray-750' : ''
                          }`}
                        >
                          <td className="py-4 px-6 text-xl">
                            {getRankBadge(index + 1)}
                          </td>
                          <td className="py-4 px-6">
                            <Link
                              href={`/vault/${vault.narrative_id}`}
                              className="text-blue-400 hover:text-blue-300 capitalize"
                            >
                              {vault.narrative_id.replace(/-/g, ' ')}
                            </Link>
                          </td>
                          <td className={`py-4 px-6 font-bold ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} USDC
                          </td>
                          <td className="py-4 px-6">
                            ${tvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`py-4 px-6 ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-800 p-8 rounded-lg text-center">
                <p className="text-gray-400">No vaults yet. Create the first vault by depositing!</p>
              </div>
            )}
          </section>
        ) : (
          /* Top Traders for Copy Trading */
          <section>
            <h2 className="text-2xl font-semibold mb-2">Top Copy Traders</h2>
            <p className="text-gray-400 mb-6">Follow and copy trades from top-performing traders</p>

            {topTraders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topTraders.map((trader, index) => {
                  const badge = getLevelBadge(trader.current_level);

                  return (
                    <div key={trader.id} className="bg-gray-800 rounded-lg p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold">
                            {trader.username?.charAt(0).toUpperCase() || trader.wallet_address.charAt(2).toUpperCase()}
                          </div>
                          {index < 3 && (
                            <div className="absolute -top-1 -right-1 text-lg">
                              {getRankBadge(index + 1)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <Link
                            href={`/profile/${trader.wallet_address}`}
                            className="font-semibold text-lg hover:text-blue-400"
                          >
                            {trader.username || formatAddress(trader.wallet_address)}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 ${badge.color} text-white text-xs rounded-full`}>
                              {badge.label}
                            </span>
                            <span className="text-gray-400 text-sm">{trader.follower_count} followers</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-900/50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500">Total P&L</p>
                          <p className={`text-lg font-mono ${trader.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {trader.total_pnl >= 0 ? '+' : ''}{trader.total_pnl.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-gray-900/50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500">Copy Fee</p>
                          <p className="text-lg font-mono text-white">{trader.copy_trading_fee}%</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {isAuthenticated && trader.wallet_address.toLowerCase() !== address?.toLowerCase() && (
                          <button
                            onClick={() => handleFollow(trader.wallet_address)}
                            disabled={followLoading === trader.wallet_address}
                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                              followingMap[trader.wallet_address]
                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {followLoading === trader.wallet_address
                              ? '...'
                              : followingMap[trader.wallet_address]
                              ? 'Following'
                              : 'Follow'}
                          </button>
                        )}
                        <Link
                          href={`/copy-trading?leader=${trader.id}`}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium text-center"
                        >
                          Copy Trade
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-800 p-8 rounded-lg text-center">
                <p className="text-gray-400 mb-4">No traders with copy trading enabled yet.</p>
                <Link
                  href="/settings"
                  className="px-6 py-2 bg-green-600 rounded-lg font-medium hover:bg-green-700 inline-block"
                >
                  Enable Copy Trading
                </Link>
              </div>
            )}
          </section>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchLeaderboards}
            className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
          >
            Refresh Leaderboard
          </button>
        </div>
      </main>
    </Fragment>
  );
}
