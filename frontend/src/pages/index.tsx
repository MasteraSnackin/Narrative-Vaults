import Head from 'next/head';
import Link from 'next/link';
import { Fragment, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import WalletConnectButton from '../components/WalletConnectButton';
import VaultCard from '../components/VaultCard';
import { api } from '../utils/api';
import { NARRATIVES } from '../utils/constants';
import { Vault, Narrative } from '../types';

interface VaultWithNarrative extends Vault {
  narrative?: Narrative;
}

export default function Home() {
  const { isConnected } = useAccount();
  const [vaults, setVaults] = useState<VaultWithNarrative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVaults();
  }, []);

  const fetchVaults = async () => {
    setLoading(true);
    try {
      const vaultsData = await api.getVaults();

      // Combine vaults with narrative info
      const vaultsWithNarratives = vaultsData.map((vault) => ({
        ...vault,
        narrative: NARRATIVES.find((n) => n.id === vault.narrative_id),
      }));

      setVaults(vaultsWithNarratives);
    } catch (error) {
      console.error('Error fetching vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get narratives that don't have vaults yet
  const narrativesWithoutVaults = NARRATIVES.filter(
    (n) => !vaults.find((v) => v.narrative_id === n.id)
  );

  return (
    <Fragment>
      <Head>
        <title>Narrative Vaults - Gamified Pair Trading</title>
        <meta name="description" content="Bet on market narratives, earn XP, and level up!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="flex justify-between items-center p-6 border-b border-gray-800">
          <Link href="/" className="text-2xl font-bold">
            Narrative Vaults
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-blue-400 transition">
              Dashboard
            </Link>
            <Link href="/leaderboard" className="hover:text-blue-400 transition">
              Leaderboard
            </Link>
            <Link href="/how-it-works" className="hover:text-blue-400 transition">
              How It Works
            </Link>
            <WalletConnectButton />
          </nav>
        </header>

        {/* Hero Section */}
        <section className="text-center py-20 px-8">
          <h1 className="text-5xl font-bold mb-6">
            Trade Market Narratives
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join narrative-based pair trading vaults, earn XP for profitable trades,
            and level up to unlock advanced strategies. Powered by Salt, Pear Protocol, and Hyperliquid.
          </p>
          {!isConnected && (
            <div className="flex justify-center gap-4">
              <Link
                href="/how-it-works"
                className="px-8 py-4 bg-gray-700 text-lg font-semibold rounded-lg hover:bg-gray-600 transition"
              >
                Learn More
              </Link>
            </div>
          )}
        </section>

        {/* Active Vaults Section */}
        <section className="px-8 pb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Active Vaults</h2>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Loading vaults...</p>
            </div>
          ) : vaults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {vaults.map((vault) => (
                <VaultCard
                  key={vault.id}
                  narrative={vault.narrative || {
                    id: vault.narrative_id,
                    name: vault.narrative_id.replace(/-/g, ' '),
                    description: '',
                    long_basket: [],
                    short_basket: [],
                    min_level: 1,
                    base_leverage: 2,
                    max_drawdown: '15',
                    risk_tier: 'medium',
                  }}
                  tvl={Number(vault.total_deposits)}
                  currentPnL={Number(vault.current_pnl)}
                  status={vault.status}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No active vaults yet. Be the first to create one!</p>
            </div>
          )}
        </section>

        {/* Available Narratives (without vaults) */}
        {narrativesWithoutVaults.length > 0 && (
          <section className="px-8 pb-16 bg-gray-800/50">
            <div className="max-w-7xl mx-auto py-12">
              <h2 className="text-3xl font-bold mb-4 text-center">Available Narratives</h2>
              <p className="text-gray-400 text-center mb-8">
                These narratives don't have active vaults yet. Deposit first to create a vault!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {narrativesWithoutVaults.map((narrative) => (
                  <div
                    key={narrative.id}
                    className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700"
                  >
                    <h3 className="text-xl font-semibold mb-2">{narrative.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">{narrative.description}</p>

                    <div className="flex gap-2 mb-4">
                      <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded">
                        Long: {narrative.long_basket.join(', ')}
                      </span>
                      <span className="text-xs bg-red-900/50 text-red-400 px-2 py-1 rounded">
                        Short: {narrative.short_basket.join(', ')}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm text-gray-500 mb-4">
                      <span>Level {narrative.min_level}+</span>
                      <span>{narrative.base_leverage}x Leverage</span>
                      <span className="capitalize">{narrative.risk_tier}</span>
                    </div>

                    <Link
                      href={`/vault/${narrative.id}`}
                      className="block w-full text-center px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 transition"
                    >
                      Create Vault
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="px-8 py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="text-4xl mb-4">1</div>
                <h3 className="text-xl font-semibold mb-2">Choose a Narrative</h3>
                <p className="text-gray-400">
                  Pick a market thesis you believe in - AI vs Memes, SOL vs ETH, DeFi vs GameFi, and more.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="text-4xl mb-4">2</div>
                <h3 className="text-xl font-semibold mb-2">Deposit USDC</h3>
                <p className="text-gray-400">
                  Deposit into a vault to get share tokens. Your funds are used to execute pair trades on Hyperliquid.
                </p>
              </div>

              <div className="text-center p-6">
                <div className="text-4xl mb-4">3</div>
                <h3 className="text-xl font-semibold mb-2">Earn XP & Level Up</h3>
                <p className="text-gray-400">
                  Earn XP based on vault performance. Level up to unlock higher leverage narratives.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-8 px-8">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <p className="text-gray-500">Narrative Vaults</p>
            <div className="flex gap-4 text-gray-500">
              <span>Powered by Salt + Pear + Hyperliquid</span>
            </div>
          </div>
        </footer>
      </main>
    </Fragment>
  );
}
