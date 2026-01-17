import { Narrative } from '../types';

export const NARRATIVES: Narrative[] = [
  {
    "id": "sol_vs_eth",
    "name": "SOL Ecosystem vs ETH Ecosystem",
    "description": "Long SOL, JUP, PYTH vs Short ETH, LINK, UNI",
    "long_basket": ["SOL", "JUP", "PYTH"],
    "short_basket": ["ETH", "LINK", "UNI"],
    "min_level": 1,
    "base_leverage": 2,
    "max_drawdown": "15%",
    "risk_tier": "beginner"
  },
  {
    "id": "ai_vs_memes",
    "name": "AI Tokens vs Meme Coins",
    "description": "Long AI narrative vs Short meme volatility",
    "long_basket": ["TAO", "FET", "RNDR"],
    "short_basket": ["DOGE", "SHIB", "PEPE"],
    "min_level": 2,
    "base_leverage": 3,
    "max_drawdown": "20%",
    "risk_tier": "intermediate"
  },
  {
    "id": "defi_vs_gamefi",
    "name": "DeFi vs GameFi",
    "description": "Long AAVE, CRV, MKR vs Short AXS, SAND, GALA",
    "long_basket": ["AAVE", "CRV", "MKR"],
    "short_basket": ["AXS", "SAND", "GALA"],
    "min_level": 1,
    "base_leverage": 2,
    "max_drawdown": "15%",
    "risk_tier": "beginner"
  },
  {
    "id": "layer2_wars",
    "name": "L2 Wars - ARB vs OP",
    "description": "Long ARB vs Short OP",
    "long_basket": ["ARB"],
    "short_basket": ["OP"],
    "min_level": 3,
    "base_leverage": 4,
    "max_drawdown": "25%",
    "risk_tier": "advanced"
  },
  {
    "id": "btc_dominance",
    "name": "BTC Dominance Play",
    "description": "Long BTC vs Short ETH, SOL, AVAX",
    "long_basket": ["BTC"],
    "short_basket": ["ETH", "SOL", "AVAX"],
    "min_level": 2,
    "base_leverage": 3,
    "max_drawdown": "20%",
    "risk_tier": "intermediate"
  }
];
