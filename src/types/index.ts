export type Language = 'en' | 'ar';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface UserProfile {
  id: number;
  telegram_id: number;
  username: string;
  first_name: string;
  last_name?: string;
  avatar_url?: string;
  referral_code: string;
  referred_by?: number;
  status: 'active' | 'banned' | 'frozen';
  created_at: string;
}

export interface BalanceState {
  coins: number;
  available_balance: number;
  pending_withdrawal: number;
  total_earned: number;
  total_withdrawn: number;
}

export interface EnergyState {
  current_energy: number;
  max_energy: number;
  regen_rate: number; // energy points per interval
  regen_interval_seconds: number;
  last_energy_updated_at: string;
}

export interface LevelInfo {
  level: number;
  name: string;
  xp_required: number;
  tap_multiplier: number;
  max_energy: number;
  energy_regen_rate: number;
  daily_reward_multiplier: number;
}

export interface GameState {
  user: UserProfile;
  balance: BalanceState;
  energy: EnergyState;
  level: LevelInfo;
  current_xp: number;
  next_level_xp: number;
  rank: number;
  active_boosts: ActiveBoost[];
  daily_streak: number;
  can_claim_daily: boolean;
  settings: GameSettings;
}

export interface ActiveBoost {
  boost_id: string;
  name: string;
  multiplier: number;
  expires_at: string;
  type: 'turbo' | 'double_profit' | 'tap_power' | 'full_energy';
}

export interface Boost {
  id: string;
  name: string;
  description: string;
  type: 'turbo' | 'double_profit' | 'tap_power' | 'full_energy';
  duration_seconds: number;
  multiplier: number;
  cost: number;
  daily_limit: number;
  used_today: number;
  is_free: boolean;
  is_active: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  reward_coins: number;
  reward_xp: number;
  url: string;
  type: 'telegram_channel' | 'telegram_group' | 'website' | 'invite_friends' | 'daily_task' | 'custom';
  required_action: string;
  is_completed: boolean;
  is_verifying?: boolean;
}

export interface DailyRewardDay {
  day: number;
  reward_coins: number;
  reward_xp: number;
  is_claimed: boolean;
  is_current: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  first_name: string;
  avatar_url?: string;
  score: number;
  level: number;
  is_current_user?: boolean;
}

export interface ReferralStats {
  referral_code: string;
  referral_link: string;
  total_invited: number;
  active_invited: number;
  total_earned_referral: number;
  tiers: {
    l1: { count: number; percentage: number; earned: number };
    l2: { count: number; percentage: number; earned: number };
    l3: { count: number; percentage: number; earned: number };
  };
  recent_referrals: {
    username: string;
    level: number;
    joined_at: string;
    tier: number;
    earned: number;
  }[];
}

export type TransactionType =
  | 'tap'
  | 'daily_reward'
  | 'task'
  | 'referral'
  | 'boost'
  | 'bonus'
  | 'withdraw'
  | 'admin_adjustment'
  | 'penalty'
  | 'refund';

export interface LedgerTransaction {
  id: string;
  user_id: number;
  type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: number;
  amount: number;
  fee: number;
  net_amount: number;
  method: 'USDT_TRC20' | 'TON' | 'INTERNAL_WALLET' | 'CUSTOM';
  destination_address: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'cancelled';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface GameSettings {
  game_name: string;
  coin_name: string;
  coin_symbol: string;
  tap_reward: number;
  max_energy: number;
  energy_regen_rate: number;
  energy_regen_interval: number;
  tap_cost: number;
  xp_per_tap: number;
  referral_l1_percent: number;
  referral_l2_percent: number;
  referral_l3_percent: number;
  min_withdrawal: number;
  withdrawal_fee_percent: number;
  maintenance_mode: boolean;
  anti_cheat_enabled: boolean;
  max_taps_per_second: number;
}

export interface AntiCheatIncident {
  id: string;
  user_id: number;
  username: string;
  type: 'speed_hack' | 'energy_tamper' | 'duplicate_nonce' | 'timestamp_skew' | 'impossible_score';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  client_ip: string;
  status: 'logged' | 'flagged' | 'banned';
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  active_today: number;
  new_users_today: number;
  total_taps: number;
  total_coins_minted: number;
  total_withdrawn_amount: number;
  pending_withdrawals_count: number;
  pending_withdrawals_amount: number;
  suspicious_users_count: number;
  revenue_simulated: number;
}

export interface SystemSettings {
  game_name: string;
  coin_name: string;
  coin_symbol: string;
  tap_reward: number;
  max_energy: number;
  energy_regen_rate: number;
  energy_regen_interval: number;
  tap_cost: number;
  xp_per_tap: number;
  referral_l1_percent: number;
  referral_l2_percent: number;
  referral_l3_percent: number;
  min_withdrawal: number;
  withdrawal_fee_percent: number;
  is_maintenance: boolean;
  anti_cheat_enabled: boolean;
  max_taps_per_second: number;
  telegram_bot_username?: string;
}

export interface AdminOverviewStats {
  total_users: number;
  active_users_today: number;
  total_taps: number;
  total_coins_mined: number;
  total_coins_withdrawn: number;
  pending_withdrawals_count: number;
  anti_cheat_flags: number;
  system_health: string;
}

export interface InstallerStatus {
  step: number;
  requirements: {
    php: { required: string; current: string; status: boolean };
    mysql: { required: string; current: string; status: boolean };
    node: { required: string; current: string; status: boolean };
  };
  extensions: Record<string, boolean>;
  is_installed: boolean;
}

