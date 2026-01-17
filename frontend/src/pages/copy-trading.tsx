import Head from 'next/head';
import Link from 'next/link';
import { Fragment, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import WalletConnectButton from '../components/WalletConnectButton';
import { api } from '../utils/api';
import { UserProfile, CopyTrade } from '../types';
import { usePosition, useMarket } from '@pear-protocol/hyperliquid-sdk';

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getLevelBadge(level: number): { color: string; label: string } {
  const badges: Record<number, { color: string; label: string }> = {
    1: { color: 'bg-gray-600', label: 'Novice' },
    2: { color: 'bg-green-600', label: 'Trader' },
    3: { color: 'bg-blue-600', label: 'Expert' },
    4: { color: 'bg-purple-600', label: 'Master' },
    5: { color: 'bg-yellow-600', label: 'Legend' },
  };
  return badges[level] || badges[1];
}

export default function CopyTradingPage() {
  const router = useRouter();
  const { leader: leaderIdQuery } = router.query;
  const { address, isConnected } = useAccount();

  // Pear SDK hooks for real-time position data
  const { openPositions, isLoading: positionsLoading } = usePosition();
  const { allTokenMetadata, getAssetByName } = useMarket();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [topTraders, setTopTraders] = useState<UserProfile[]>([]);
  const [myCopyTrades, setMyCopyTrades] = useState<CopyTrade[]>([]);
  const [myCopiers, setMyCopiers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'discover' | 'my-trades' | 'my-copiers'>('discover');

  // Copy trade modal state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<UserProfile | null>(null);
  const [allocationAmount, setAllocationAmount] = useState('1000');
  const [maxPositionSize, setMaxPositionSize] = useState('500');
  const [copyAllVaults, setCopyAllVaults] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Calculate real-time portfolio stats from SDK positions
  const portfolioStats = (openPositions || []).reduce(
    (acc, pos) => {
      const pnl = pos.unrealizedPnl || 0;
      const value = pos.positionValue || 0;
      return {
        totalValue: acc.totalValue + value,
        totalPnl: acc.totalPnl + pnl,
        positionCount: acc.positionCount + 1,
      };
    },
    { totalValue: 0, totalPnl: 0, positionCount: 0 }
  );

  useEffect(() => {
    fetchData();
  }, [isAuthenticated]);

  useEffect(() => {
    // Auto-open modal if leader query param is present
    if (leaderIdQuery && topTraders.length > 0) {
      const trader = topTraders.find(t => t.id === leaderIdQuery);
      if (trader) {
        setSelectedTrader(trader);
        setShowCopyModal(true);
      }
    }
  }, [leaderIdQuery, topTraders]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const traders = await api.getTopTraders(20);
      setTopTraders(traders);

      if (isAuthenticated) {
        const [trades, copiers] = await Promise.all([
          api.getMyCopyTrades(),
          api.getMyCopiers(),
        ]);
        setMyCopyTrades(trades);
        setMyCopiers(copiers);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCopyTrading = async () => {
    if (!selectedTrader) return;

    setSubmitting(true);
    try {
      await api.startCopyTrading({
        leaderId: selectedTrader.id,
        allocationAmount: parseFloat(allocationAmount),
        allocationPercent: 0,
        maxPositionSize: parseFloat(maxPositionSize),
        copyAllVaults,
      });

      alert('Copy trading started successfully!');
      setShowCopyModal(false);
      await fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to start copy trading');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopCopyTrading = async (leaderId: string) => {
    if (!confirm('Are you sure you want to stop copy trading this user?')) return;

    try {
      await api.stopCopyTrading(leaderId);
      await fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to stop copy trading');
    }
  };

  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  return (
    <Fragment>
      <Head>
        <title>Copy Trading - Narrative Vaults</title>
      </Head>

      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Copy Trading</h1>
            <p className="text-gray-400 mt-2">Follow top traders and automatically mirror their vault positions</p>
          </div>
          <WalletConnectButton onAuthChange={handleAuthChange} />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'discover'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Discover Traders
          </button>
          <button
            onClick={() => setActiveTab('my-trades')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'my-trades'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            My Copy Trades ({myCopyTrades.length})
          </button>
          <button
            onClick={() => setActiveTab('my-copiers')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'my-copiers'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            My Copiers ({myCopiers.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : activeTab === 'discover' ? (
          /* Top Traders Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topTraders.map((trader) => {
              const badge = getLevelBadge(trader.current_level);
              const isCopying = myCopyTrades.some(ct => ct.leader_id === trader.id && ct.is_active);

              return (
                <div key={trader.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold">
                      {trader.username?.charAt(0).toUpperCase() || trader.wallet_address.charAt(2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <Link
                        href={`/profile/${trader.wallet_address}`}
                        className="font-semibold text-lg hover:text-blue-400"
                      >
                        {trader.username || shortenAddress(trader.wallet_address)}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 ${badge.color} text-white text-xs rounded-full`}>
                          {badge.label}
                        </span>
                        <span className="text-gray-400 text-sm">{trader.total_xp.toLocaleString()} XP</span>
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

                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <span>{trader.follower_count} followers</span>
                    <span>Level {trader.current_level}</span>
                  </div>

                  {isAuthenticated ? (
                    isCopying ? (
                      <button
                        onClick={() => handleStopCopyTrading(trader.id)}
                        className="w-full py-3 bg-red-900/50 text-red-400 rounded-lg font-medium hover:bg-red-900"
                      >
                        Stop Copying
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedTrader(trader);
                          setShowCopyModal(true);
                        }}
                        className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                      >
                        Start Copying
                      </button>
                    )
                  ) : (
                    <p className="text-center text-gray-500 text-sm">Connect wallet to copy trade</p>
                  )}
                </div>
              );
            })}

            {topTraders.length === 0 && (
              <div className="col-span-full text-center py-12 bg-gray-800 rounded-lg">
                <p className="text-gray-400">No traders with copy trading enabled yet.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'my-trades' ? (
          /* My Copy Trades */
          <div className="space-y-6">
            {/* Real-time Portfolio Stats from Pear SDK */}
            {isAuthenticated && openPositions && openPositions.length > 0 && (
              <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-6 border border-blue-600/30">
                <h3 className="text-lg font-semibold mb-4">Live Positions (via Pear SDK)</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-400">Active Positions</p>
                    <p className="text-2xl font-bold">{portfolioStats.positionCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Value</p>
                    <p className="text-2xl font-bold font-mono">${portfolioStats.totalValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Unrealized P&L</p>
                    <p className={`text-2xl font-bold font-mono ${portfolioStats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {portfolioStats.totalPnl >= 0 ? '+' : ''}{portfolioStats.totalPnl.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Individual Positions */}
                <div className="mt-4 space-y-2">
                  {openPositions.slice(0, 5).map((pos, idx) => {
                    const longAssetNames = pos.longAssets?.map(a => a.coin).join('/') || '';
                    const shortAssetNames = pos.shortAssets?.map(a => a.coin).join('/') || '';
                    const displayName = `${longAssetNames} / ${shortAssetNames}`;
                    return (
                      <div key={pos.positionId || idx} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 text-xs rounded bg-purple-900/50 text-purple-400">
                            PAIR
                          </span>
                          <span className="font-mono text-sm">{displayName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-400">${pos.positionValue?.toFixed(0) || 0}</span>
                          <span className={`font-mono ${(pos.unrealizedPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(pos.unrealizedPnl || 0) >= 0 ? '+' : ''}{(pos.unrealizedPnl || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {myCopyTrades.length > 0 ? (
              myCopyTrades.map((trade) => (
                <div key={trade.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
                        {trade.leader?.username?.charAt(0).toUpperCase() || trade.leader?.wallet_address.charAt(2).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/profile/${trade.leader?.wallet_address}`}
                          className="font-semibold text-lg hover:text-blue-400"
                        >
                          {trade.leader?.username || shortenAddress(trade.leader?.wallet_address || '')}
                        </Link>
                        <p className="text-sm text-gray-400">
                          Level {trade.leader?.current_level} • {trade.leader?.copy_trading_fee}% fee
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Allocation</p>
                        <p className="font-mono">${Number(trade.allocation_amount).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Copied P&L</p>
                        <p className={`font-mono ${Number(trade.total_copied_pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {Number(trade.total_copied_pnl) >= 0 ? '+' : ''}{Number(trade.total_copied_pnl).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Fees Paid</p>
                        <p className="font-mono text-yellow-400">${Number(trade.fees_paid).toFixed(2)}</p>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-sm ${
                        trade.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'
                      }`}>
                        {trade.is_active ? 'Active' : 'Stopped'}
                      </span>

                      {trade.is_active && (
                        <button
                          onClick={() => handleStopCopyTrading(trade.leader_id)}
                          className="px-4 py-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900"
                        >
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <p className="text-gray-400 mb-4">You're not copy trading anyone yet.</p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="px-6 py-2 bg-blue-600 rounded-lg font-medium hover:bg-blue-700"
                >
                  Discover Traders
                </button>
              </div>
            )}
          </div>
        ) : (
          /* My Copiers */
          <div className="space-y-4">
            {myCopiers.length > 0 ? (
              myCopiers.map((copier) => (
                <div key={copier.id} className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
                        {copier.follower?.username?.charAt(0).toUpperCase() || copier.follower?.wallet_address.charAt(2).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/profile/${copier.follower?.wallet_address}`}
                          className="font-semibold text-lg hover:text-blue-400"
                        >
                          {copier.follower?.username || shortenAddress(copier.follower?.wallet_address || '')}
                        </Link>
                        <p className="text-sm text-gray-400">
                          Level {copier.follower?.current_level}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Allocation</p>
                        <p className="font-mono">${Number(copier.allocation_amount).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Started</p>
                        <p className="text-sm text-gray-400">{new Date(copier.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <p className="text-gray-400 mb-4">No one is copying your trades yet.</p>
                <Link
                  href="/settings"
                  className="px-6 py-2 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 inline-block"
                >
                  Enable Copy Trading
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Copy Trading Modal */}
        {showCopyModal && selectedTrader && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
              <h2 className="text-2xl font-bold mb-4">Start Copy Trading</h2>

              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-900/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">
                  {selectedTrader.username?.charAt(0).toUpperCase() || selectedTrader.wallet_address.charAt(2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">
                    {selectedTrader.username || shortenAddress(selectedTrader.wallet_address)}
                  </p>
                  <p className="text-sm text-gray-400">
                    Level {selectedTrader.current_level} • {selectedTrader.copy_trading_fee}% fee
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Allocation Amount (USDC)</label>
                  <input
                    type="number"
                    value={allocationAmount}
                    onChange={(e) => setAllocationAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
                    placeholder="1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Total amount to allocate for copy trading</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Max Position Size (USDC)</label>
                  <input
                    type="number"
                    value={maxPositionSize}
                    onChange={(e) => setMaxPositionSize(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white"
                    placeholder="500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum size per individual position</p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="copyAllVaults"
                    checked={copyAllVaults}
                    onChange={(e) => setCopyAllVaults(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700"
                  />
                  <label htmlFor="copyAllVaults" className="text-sm">
                    Copy all vault positions
                  </label>
                </div>
              </div>

              <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-6">
                <p className="text-yellow-400 text-sm">
                  <strong>Fee Notice:</strong> A {selectedTrader.copy_trading_fee}% performance fee will be charged on profits
                  generated from copy trading this user.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCopyModal(false)}
                  className="flex-1 py-3 bg-gray-700 rounded-lg font-medium hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartCopyTrading}
                  disabled={submitting}
                  className="flex-1 py-3 bg-green-600 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Starting...' : 'Start Copying'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Fragment>
  );
}
