import Head from 'next/head';
import { Fragment } from 'react';

export default function HowItWorks() {
  return (
    <Fragment>
      <Head>
        <title>How it Works - Narrative Vaults</title>
      </Head>

      <main className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-4xl font-bold text-center mb-12">How Narrative Vaults Works</h1>

        <section className="mb-12 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">The Problem: Complex Pair Trading</h2>
          <p className="text-gray-300 mb-4">
            Pair trading and basket trading are powerful strategies, but they often require deep market knowledge,
            constant monitoring, and complex execution. Manually managing long and short legs, calculating ratios,
            and monitoring risk can be intimidating and time-consuming for most users.
          </p>
        </section>

        <section className="mb-12 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Our Solution: Gamified Narrative Betting</h2>
          <p className="text-gray-300 mb-4">
            Narrative Vaults simplifies this by turning complex trading into an engaging game. Instead of individual assets,
            users "bet" on market narratives like "AI vs Memes" or "SOL vs ETH." You deposit USDC, and our intelligent backend agent
            handles all the intricate trading operations for you.
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li><strong>Connect Wallet:</strong> Securely connect your wallet to HyperEVM (Chain ID: 999).</li>
            <li><strong>Browse Narratives:</strong> Explore various vault cards, each representing a unique market narrative.</li>
            <li><strong>Deposit USDC:</strong> Deposit your desired amount of USDC into a vault. You'll receive proportional vault share tokens.</li>
            <li><strong>Auto-Trading Starts:</strong> Our backend agent immediately executes the underlying pair or basket trade via the Pear Protocol Execution API on Hyperliquid.</li>
            <li><strong>Earn XP & Level Up:</strong> Real-time XP accumulation based on vault performance and time held. Level up to unlock new narratives and higher leverage opportunities.</li>
            <li><strong>Withdraw Anytime:</strong> Redeem your share tokens for your proportional P&L whenever you choose.</li>
          </ul>
        </section>

        <section className="mb-12 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Key Integrations & Security</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li><strong>Pear Protocol:</strong> Used for efficient and reliable execution of pair and basket trades on Hyperliquid.</li>
            <li><strong>Salt Programmable Capital:</strong> Each vault is a Salt policy-controlled account. These accounts enforce strict, non-custodial risk rules, such as maximum leverage and drawdown limits, ensuring your capital is protected.</li>
            <li><strong>Hyperliquid:</strong> The underlying exchange where all trades are executed.</li>
            <li><strong>Security:</strong> Private keys are securely managed, and all Salt policies are rigorously audited to ensure compliance and safety.</li>
          </ul>
        </section>

        <section className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Gamification: Beyond Trading</h2>
          <p className="text-gray-300 mb-4">
            We believe that learning and engaging with advanced trading strategies should be fun. Our XP and leveling system
            rewards conviction, performance, and early participation. Progress through levels, unlock exclusive narratives,
            and achieve VIP status for reduced fees and priority execution.
          </p>
          <p className="text-gray-300">
            Experience an arcade/retro gaming aesthetic with pixel art badges, dynamic progress bars,
            and instant achievement notifications as you navigate the Narrative Vaults.
          </p>
        </section>
      </main>
    </Fragment>
  );
}
