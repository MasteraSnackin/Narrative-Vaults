import { Narrative } from '../types';

/**
 * Shared narratives configuration
 * Used across deposit service, agent loop, and API routes
 */
export const NARRATIVES: Narrative[] = [
  {
    id: 'sol-vs-eth',
    name: 'SOL vs ETH',
    description: 'Long Solana, Short Ethereum - Betting on Solana outperformance',
    long_basket: ['SOL'],
    short_basket: ['ETH'],
    min_level: 1,
    base_leverage: 2,
    max_drawdown: '15',
    risk_tier: 'medium'
  },
  {
    id: 'ai-vs-memes',
    name: 'AI vs Memes',
    description: 'Long AI tokens, Short Meme coins - Fundamentals over hype',
    long_basket: ['FET', 'RNDR', 'TAO'],
    short_basket: ['DOGE', 'SHIB', 'PEPE'],
    min_level: 2,
    base_leverage: 3,
    max_drawdown: '20',
    risk_tier: 'high'
  },
  {
    id: 'defi-vs-gamefi',
    name: 'DeFi vs GameFi',
    description: 'Long DeFi protocols, Short GameFi - Infrastructure over games',
    long_basket: ['UNI', 'AAVE', 'MKR'],
    short_basket: ['AXS', 'SAND', 'MANA'],
    min_level: 1,
    base_leverage: 2,
    max_drawdown: '15',
    risk_tier: 'medium'
  },
  {
    id: 'l2-wars',
    name: 'L2 Wars',
    description: 'Long Arbitrum, Short other L2s - Betting on ARB dominance',
    long_basket: ['ARB'],
    short_basket: ['OP', 'MATIC'],
    min_level: 3,
    base_leverage: 4,
    max_drawdown: '25',
    risk_tier: 'very-high'
  },
  {
    id: 'btc-dominance',
    name: 'BTC Dominance',
    description: 'Long Bitcoin, Short Altcoins - Flight to quality',
    long_basket: ['BTC'],
    short_basket: ['ETH', 'SOL', 'AVAX'],
    min_level: 2,
    base_leverage: 3,
    max_drawdown: '20',
    risk_tier: 'high'
  }
];

/**
 * Get a narrative by ID
 */
export function getNarrativeById(id: string): Narrative | undefined {
  return NARRATIVES.find(n => n.id === id);
}

/**
 * Get narratives available for a given user level
 */
export function getNarrativesForLevel(level: number): Narrative[] {
  return NARRATIVES.filter(n => n.min_level <= level);
}

/**
 * Validate if a narrative exists
 */
export function isValidNarrative(id: string): boolean {
  return NARRATIVES.some(n => n.id === id);
}
