import Head from 'next/head';
import Link from 'next/link';
import { Fragment, useState, useEffect } from 'react';
import WalletConnectButton from '../components/WalletConnectButton';
import { api } from '../utils/api';

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
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [vaults, setVaults] = useState<LeaderboardVault[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'vaults'>('users');

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      const [usersData, vaultsData] = await Promise.all([
        api.getUserLeaderboard(20),
        api.getVaultLeaderboard(20),
      ]);

      setUsers(usersData.users || []);
      setVaults(vaultsData.vaults || []);
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <Fragment>
      <Head>
        <title>Leaderboard - Narrative Vaults</title>
      </Head>

      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Leaderboard</h1>
          <WalletConnectButton />
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
                        <td className="py-4 px-6 font-mono">
                          {formatAddress(user.wallet_address)}
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
        ) : (
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
