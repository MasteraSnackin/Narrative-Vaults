import Head from 'next/head';
import { useRouter } from 'next/router';
import { Fragment, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { NARRATIVES } from '../../utils/constants';
import LivePnLChart from '../../components/LivePnLChart';
import AdvancedChart from '../../components/AdvancedChart';
import ComparisonChart from '../../components/ComparisonChart';
import DepositModal from '../../components/DepositModal';
import WalletConnectButton from '../../components/WalletConnectButton';
import { api } from '../../utils/api';
import { Vault, VaultPosition, Narrative } from '../../types';
import { usePosition, useMarket } from '@pear-protocol/hyperliquid-sdk';

type ChartView = 'simple' | 'advanced';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export default function VaultDetail() {
  const router = useRouter();
  const { narrativeId } = router.query;
  const { address, isConnected } = useAccount();

  // Pear SDK hooks for real-time position and market data
  const { openPositions, isLoading: positionsLoading } = usePosition();
  const { allTokenMetadata, getAssetByName } = useMarket();

  const [vault, setVault] = useState<Vault | null>(null);
  const [position, setPosition] = useState<VaultPosition | null>(null);
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPreview, setWithdrawPreview] = useState<any>(null);
  const [chartView, setChartView] = useState<ChartView>('advanced');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');

  // Vault followers state
  const [isFollowingVault, setIsFollowingVault] = useState(false);
  const [vaultFollowers, setVaultFollowers] = useState<{ count: number; followers: any[] }>({ count: 0, followers: [] });
  const [followLoading, setFollowLoading] = useState(false);

  // Filter positions for this vault's assets
  const vaultPositions = (openPositions || []).filter((pos) => {
    if (!narrative) return false;
    // Check if any of the position's assets match the narrative's baskets
    const posLongAssets = pos.longAssets?.map(a => a.coin) || [];
    const posShortAssets = pos.shortAssets?.map(a => a.coin) || [];
    const allPosAssets = [...posLongAssets, ...posShortAssets];
    const narrativeAssets = [...narrative.long_basket, ...narrative.short_basket];
    return allPosAssets.some(asset => narrativeAssets.includes(asset));
  });

  // Calculate real-time P&L from SDK positions
  const liveUnrealizedPnl = vaultPositions.reduce((sum: number, pos) => {
    return sum + (pos.unrealizedPnl || 0);
  }, 0);

  // Find narrative from constants
  useEffect(() => {
    if (narrativeId && typeof narrativeId === 'string') {
      const found = NARRATIVES.find((n) => n.id === narrativeId);
      setNarrative(found || null);
    }
  }, [narrativeId]);

  // Fetch vault data
  useEffect(() => {
    if (narrativeId && typeof narrativeId === 'string') {
      fetchVaultData();
    }
  }, [narrativeId]);

  // Fetch user position when authenticated
  useEffect(() => {
    if (isAuthenticated && vault) {
      fetchUserPosition();
      fetchVaultFollowStatus();
    } else {
      setPosition(null);
      setIsFollowingVault(false);
    }
  }, [isAuthenticated, vault]);

  // Fetch vault followers
  useEffect(() => {
    if (vault) {
      fetchVaultFollowers();
    }
  }, [vault]);

  const fetchVaultData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all vaults and find the one matching this narrative
      const vaults = await api.getVaults();
      const matchingVault = vaults.find(v => v.narrative_id === narrativeId);

      if (matchingVault) {
        setVault(matchingVault);
      } else {
        // No vault exists yet for this narrative
        setVault(null);
      }
    } catch (err: any) {
      console.error('Error fetching vault:', err);
      setError(err.message || 'Failed to load vault data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosition = async () => {
    if (!vault) return;
    try {
      const pos = await api.getVaultPosition(vault.id);
      setPosition(pos);
    } catch {
      setPosition(null);
    }
  };

  const fetchVaultFollowers = async () => {
    if (!vault) return;
    try {
      const data = await api.getVaultFollowers(vault.id);
      setVaultFollowers(data);
    } catch {
      // Ignore errors
    }
  };

  const fetchVaultFollowStatus = async () => {
    if (!vault) return;
    try {
      const { following } = await api.isFollowingVault(vault.id);
      setIsFollowingVault(following);
    } catch {
      setIsFollowingVault(false);
    }
  };

  const handleFollowVault = async () => {
    if (!vault) return;
    setFollowLoading(true);
    try {
      if (isFollowingVault) {
        await api.unfollowVault(vault.id);
        setIsFollowingVault(false);
      } else {
        await api.followVault(vault.id);
        setIsFollowingVault(true);
      }
      await fetchVaultFollowers();
    } catch (err: any) {
      alert(err.message || 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDeposit = async (amount: number) => {
    if (!narrativeId || typeof narrativeId !== 'string') return;

    try {
      const result = await api.deposit(narrativeId, amount);
      alert(`Successfully deposited ${amount} USDC! Share tokens: ${result.shareTokensMinted.toFixed(4)}`);

      // Refresh data
      await fetchVaultData();
      if (isAuthenticated) {
        await fetchUserPosition();
      }
    } catch (err: any) {
      alert(`Deposit failed: ${err.message}`);
    }
  };

  const handlePreviewWithdraw = async () => {
    if (!vault || !withdrawAmount) return;
    const shares = parseFloat(withdrawAmount);
    if (isNaN(shares) || shares <= 0) return;

    try {
      const preview = await api.previewWithdrawal(vault.id, shares);
      setWithdrawPreview(preview);
    } catch (err: any) {
      alert(`Preview failed: ${err.message}`);
    }
  };

  const handleWithdraw = async () => {
    if (!vault || !withdrawAmount) return;
    const shares = parseFloat(withdrawAmount);
    if (isNaN(shares) || shares <= 0) return;

    setIsWithdrawing(true);
    try {
      const result = await api.withdraw(vault.id, shares);
      alert(`Withdrawal successful! Net amount: ${result.netAmount.toFixed(2)} USDC`);

      // Reset and refresh
      setWithdrawAmount('');
      setWithdrawPreview(null);
      await fetchVaultData();
      await fetchUserPosition();
    } catch (err: any) {
      alert(`Withdrawal failed: ${err.message}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  if (!narrative) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8">
        <p className="text-center text-xl">
          {loading ? 'Loading...' : 'Narrative not found.'}
        </p>
      </main>
    );
  }

  const tvl = vault ? Number(vault.total_deposits) : 0;
  const currentPnL = vault ? Number(vault.current_pnl) : 0;
  const userShares = position ? Number(position.share_tokens) : 0;
  const userDeposit = position ? Number(position.deposit_amount) : 0;

  return (
    <Fragment>
      <Head>
        <title>{narrative.name} Vault - Narrative Vaults</title>
      </Head>

      <main className="min-h-screen bg-gray-900 text-white p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">{narrative.name} Vault</h1>
          <WalletConnectButton onAuthChange={handleAuthChange} />
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 p-4 rounded-lg mb-8">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Vault Overview */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Vault Overview</h2>
            <div className="space-y-3">
              <p><span className="text-gray-400">Description:</span> {narrative.description}</p>
              <p><span className="text-gray-400">Total Deposits (TVL):</span> {tvl.toFixed(2)} USDC</p>
              <p>
                <span className="text-gray-400">Current P&L:</span>
                <span className={`ml-2 ${currentPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {currentPnL >= 0 ? '+' : ''}{currentPnL.toFixed(2)} USDC
                </span>
              </p>
              <p><span className="text-gray-400">Min Level Required:</span> {narrative.min_level}</p>
              <p><span className="text-gray-400">Base Leverage:</span> {narrative.base_leverage}x</p>
              <p><span className="text-gray-400">Max Drawdown:</span> {narrative.max_drawdown}</p>
              <p><span className="text-gray-400">Risk Tier:</span> <span className="capitalize">{narrative.risk_tier}</span></p>
              <p>
                <span className="text-gray-400">Status:</span>
                <span className={`ml-2 ${vault?.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {vault?.status || 'No vault yet'}
                </span>
              </p>
            </div>

            {/* Trading Pairs */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Trading Pairs</h3>
              <div className="flex gap-4">
                <div className="bg-green-900/30 p-3 rounded">
                  <p className="text-sm text-green-400 mb-1">Long</p>
                  <p className="font-mono">{narrative.long_basket.join(', ')}</p>
                </div>
                <div className="bg-red-900/30 p-3 rounded">
                  <p className="text-sm text-red-400 mb-1">Short</p>
                  <p className="font-mono">{narrative.short_basket.join(', ')}</p>
                </div>
              </div>
            </div>

            {/* Live Positions from Pear SDK */}
            {vaultPositions.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-600/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Live Positions (via Pear SDK)</h3>
                  <span className={`text-lg font-mono ${liveUnrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {liveUnrealizedPnl >= 0 ? '+' : ''}{liveUnrealizedPnl.toFixed(2)} USDC
                  </span>
                </div>
                <div className="space-y-2">
                  {vaultPositions.map((pos, idx) => {
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
                          <span className="text-sm font-mono">${(pos.positionValue || 0).toFixed(2)}</span>
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

            {/* Vault Followers */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Vault Followers</h3>
                  <p className="text-sm text-gray-400">{vaultFollowers.count} people following this vault</p>
                </div>
                {isAuthenticated && vault && (
                  <button
                    onClick={handleFollowVault}
                    disabled={followLoading}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      isFollowingVault
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {followLoading ? '...' : isFollowingVault ? 'Unfollow' : 'Follow Vault'}
                  </button>
                )}
              </div>

              {/* Recent Followers */}
              {vaultFollowers.followers.length > 0 && (
                <div className="flex -space-x-2 mt-3">
                  {vaultFollowers.followers.slice(0, 5).map((follower, idx) => (
                    <div
                      key={follower.id || idx}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-2 border-gray-800 flex items-center justify-center text-xs font-bold"
                      title={follower.username || follower.wallet_address}
                    >
                      {follower.username?.charAt(0).toUpperCase() || follower.wallet_address?.charAt(2).toUpperCase()}
                    </div>
                  ))}
                  {vaultFollowers.count > 5 && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-xs">
                      +{vaultFollowers.count - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions Panel */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Actions</h2>

            {!isConnected ? (
              <p className="text-gray-400">Connect your wallet to deposit or withdraw.</p>
            ) : !isAuthenticated ? (
              <p className="text-gray-400">Sign in with your wallet to deposit or withdraw.</p>
            ) : (
              <div className="space-y-6">
                {/* User Position */}
                {position && (
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Your Position</h3>
                    <p className="text-sm text-gray-300">Deposit: {userDeposit.toFixed(2)} USDC</p>
                    <p className="text-sm text-gray-300">Share Tokens: {userShares.toFixed(4)}</p>
                  </div>
                )}

                {/* Deposit Button */}
                <button
                  className="w-full px-6 py-3 bg-green-600 rounded-md hover:bg-green-700 text-white font-bold text-lg"
                  onClick={() => setIsDepositModalOpen(true)}
                >
                  Deposit USDC
                </button>

                {/* Withdraw Section */}
                {position && userShares > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Withdraw</h3>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Share tokens to withdraw"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-700 rounded-md text-white"
                        max={userShares}
                      />
                      <button
                        className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500"
                        onClick={() => setWithdrawAmount(userShares.toString())}
                      >
                        Max
                      </button>
                    </div>

                    <button
                      className="w-full px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700"
                      onClick={handlePreviewWithdraw}
                      disabled={!withdrawAmount}
                    >
                      Preview Withdrawal
                    </button>

                    {withdrawPreview && (
                      <div className="bg-gray-700 p-4 rounded-lg text-sm">
                        <p>Estimated USDC: {withdrawPreview.estimatedUsdcAmount?.toFixed(2) || withdrawPreview.estimatedUSDC?.toFixed(2)}</p>
                        <p>Fee: {withdrawPreview.estimatedFee?.toFixed(2) || withdrawPreview.fee?.toFixed(2)}</p>
                        <p>Net Amount: {withdrawPreview.estimatedNetAmount?.toFixed(2) || withdrawPreview.netAmount?.toFixed(2)}</p>
                      </div>
                    )}

                    <button
                      className="w-full px-6 py-3 bg-red-600 rounded-md hover:bg-red-700 text-white font-bold disabled:opacity-50"
                      onClick={handleWithdraw}
                      disabled={isWithdrawing || !withdrawAmount}
                    >
                      {isWithdrawing ? 'Processing...' : 'Confirm Withdrawal'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        {vault && (
          <section className="mb-12">
            {/* Chart View Toggle */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Performance Chart</h2>
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setChartView('advanced')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    chartView === 'advanced'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Advanced Chart
                </button>
                <button
                  onClick={() => setChartView('simple')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    chartView === 'simple'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Simple P&L
                </button>
              </div>
            </div>

            {/* Chart Content */}
            {chartView === 'advanced' ? (
              <AdvancedChart
                vaultId={vault.id}
                narrativeId={narrativeId as string}
                height={500}
                showVolume={true}
                showIndicators={true}
                onTimeframeChange={setSelectedTimeframe}
              />
            ) : (
              <LivePnLChart vaultId={vault.id} websocketEndpoint={WS_URL} />
            )}

            {/* Timeframe Info */}
            {chartView === 'advanced' && (
              <p className="text-sm text-gray-500 mt-2">
                Current timeframe: {selectedTimeframe} | Data updates in real-time via WebSocket
              </p>
            )}
          </section>
        )}

        {/* Basket Comparison Chart */}
        {vault && narrative && (
          <section className="mb-12">
            <ComparisonChart
              vaultId={vault.id}
              narrativeId={narrativeId as string}
              longBasket={narrative.long_basket}
              shortBasket={narrative.short_basket}
              height={400}
            />
          </section>
        )}

        {/* Deposit Modal */}
        <DepositModal
          narrative={narrative}
          onDeposit={handleDeposit}
          userBalance={10000} // TODO: Fetch actual USDC balance
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
        />
      </main>
    </Fragment>
  );
}
