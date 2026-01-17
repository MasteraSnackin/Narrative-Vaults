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
}

export interface User {
  id: string;
  wallet_address: string;
  total_xp: number;
  current_level: number;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
}

export interface Vault {
  id: string;
  narrative_id: string;
  salt_account_address: string | null;
  total_deposits: number;
  current_pnl: number;
  active_position_id: string | null;
  status: string;
  created_at: string;
}

export interface VaultPosition {
  id: string;
  user_id: string;
  vault_id: string;
  deposit_amount: number;
  share_tokens: number;
  entry_pnl: number;
  deposited_at: string;
  withdrawn_at: string | null;
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
  opened_at: string;
  closed_at: string | null;
}

export interface XPEvent {
  id: string;
  user_id: string;
  vault_id: string;
  xp_earned: number;
  event_type: string;
  description: string;
  created_at: string;
}

export interface RiskEvent {
  id: string;
  vault_id: string;
  event_type: string;
  current_drawdown: number;
  max_allowed_drawdown: number;
  action_taken: string;
  created_at: string;
}

// Social Features

export interface UserProfile {
  id: string;
  wallet_address: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  total_xp: number;
  current_level: number;
  is_public: boolean;
  copy_trading_enabled: boolean;
  copy_trading_fee: number;
  follower_count: number;
  following_count: number;
  total_pnl: number;
  is_following?: boolean;
  is_copy_trading?: boolean;
}

export interface FollowStats {
  followers: number;
  following: number;
  vault_follows: number;
  copy_traders: number;
  copying_from: number;
}

export interface CopyTrade {
  id: string;
  follower_id: string;
  leader_id: string;
  allocation_amount: number;
  allocation_percent: number;
  max_position_size: number;
  is_active: boolean;
  copy_all_vaults: boolean;
  vault_ids: string[];
  total_copied_pnl: number;
  fees_paid: number;
  created_at: string;
  updated_at: string;
  leader?: {
    id: string;
    wallet_address: string;
    username: string | null;
    avatar_url: string | null;
    current_level: number;
    copy_trading_fee: number;
  };
}

export interface CopyTradeSettings {
  leaderId: string;
  allocationAmount: number;
  allocationPercent: number;
  maxPositionSize: number;
  copyAllVaults: boolean;
  vaultIds?: string[];
}
