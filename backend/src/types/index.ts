export interface MarketConditions {
  max_volatility?: number;
  min_daily_volume?: number;
  trend_direction?: 'bullish' | 'bearish' | 'neutral';
}

export interface Narrative {
  id: string;
  name: string;
  description: string;
  long_basket: string[];
  short_basket: string[];
  min_level: number;
  base_leverage: number;
  max_drawdown: string;
  risk_tier: string;
  market_conditions?: MarketConditions;
}

export interface User {
  id: string;
  wallet_address: string;
  total_xp: number;
  current_level: number;
  referral_code: string | null;
  referred_by: string | null;
  created_at: Date;
  is_public?: boolean;
  copy_trading_enabled?: boolean;
  copy_trading_fee?: number;
}

export interface Vault {
  id: string;
  narrative_id: string;
  salt_account_address: string | null;
  total_deposits: number;
  current_pnl: number;
  active_position_id: string | null;
  status: string;
  created_at: Date;
}

export interface VaultPosition {
  id: string;
  user_id: string;
  vault_id: string;
  deposit_amount: number;
  share_tokens: number;
  entry_pnl: number;
  deposited_at: Date;
  withdrawn_at: Date | null;
}

export interface Trade {
  id: string;
  vault_id: string;
  pear_trade_id: string;
  narrative_id: string;
  long_tokens: string[];
  short_tokens: string[];
  leverage: number;
  entry_value: number;
  current_value: number;
  realized_pnl: number;
  status: string;
  opened_at: Date;
  closed_at: Date | null;
}

export interface XPEvent {
  id: string;
  user_id: string;
  vault_id: string | null;
  xp_earned: number;
  event_type: string;
  description: string;
  created_at: Date;
}

export interface RiskEvent {
  id: string;
  vault_id: string;
  event_type: string;
  current_drawdown: number;
  max_allowed_drawdown: number;
  action_taken: string;
  created_at: Date;
}
