import React from 'react';
import Link from 'next/link';
import { Narrative } from '../types';

interface VaultCardProps {
  narrative: Narrative;
  currentPnL: number;
  tvl: number;
  status?: string;
  isLocked?: boolean;
  userLevel?: number;
}

const VaultCard: React.FC<VaultCardProps> = ({
  narrative,
  currentPnL,
  tvl,
  status = 'active',
  isLocked = false,
  userLevel = 1,
}) => {
  const pnlColorClass = currentPnL >= 0 ? 'text-green-500' : 'text-red-500';
  const isUserLocked = userLevel < narrative.min_level;
  const locked = isLocked || isUserLocked;
  const roi = tvl > 0 ? (currentPnL / tvl) * 100 : 0;

  return (
    <div className={`relative bg-gray-800 p-6 rounded-lg shadow-lg transition hover:bg-gray-750 ${locked ? 'opacity-60' : ''}`}>
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        <span className={`text-xs px-2 py-1 rounded ${
          status === 'active' ? 'bg-green-900/50 text-green-400' :
          status === 'paused' ? 'bg-yellow-900/50 text-yellow-400' :
          'bg-red-900/50 text-red-400'
        }`}>
          {status}
        </span>
      </div>

      {/* Lock Overlay */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/75 rounded-lg z-10">
          <div className="text-center">
            <span className="text-4xl block mb-2">🔒</span>
            <span className="text-sm text-gray-400">Level {narrative.min_level} Required</span>
          </div>
        </div>
      )}

      {/* Header */}
      <h2 className="text-xl font-semibold mb-2 pr-16">{narrative.name}</h2>
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{narrative.description}</p>

      {/* Trading Pairs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {narrative.long_basket && narrative.long_basket.length > 0 && (
          <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
            Long: {narrative.long_basket.join(', ')}
          </span>
        )}
        {narrative.short_basket && narrative.short_basket.length > 0 && (
          <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded">
            Short: {narrative.short_basket.join(', ')}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">TVL:</span>
          <span className="font-bold">${tvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">P&L:</span>
          <span className={`font-bold ${pnlColorClass}`}>
            {currentPnL >= 0 ? '+' : ''}{currentPnL.toFixed(2)} USDC
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">ROI:</span>
          <span className={`font-bold ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Risk Info */}
      <div className="flex justify-between text-xs text-gray-500 mb-4">
        <span>{narrative.base_leverage}x Leverage</span>
        <span>Max DD: {narrative.max_drawdown}</span>
        <span className="capitalize">{narrative.risk_tier}</span>
      </div>

      {/* Action Button */}
      <Link
        href={`/vault/${narrative.id}`}
        className={`block w-full text-center px-4 py-2 rounded-md font-semibold transition ${
          locked
            ? 'bg-gray-700 cursor-not-allowed text-gray-400'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        onClick={(e) => locked && e.preventDefault()}
      >
        {locked ? `Unlock at Level ${narrative.min_level}` : 'View Vault'}
      </Link>
    </div>
  );
};

export default VaultCard;
