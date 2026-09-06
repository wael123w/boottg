import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface UserRecord {
  id: number;
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  referral_code: string;
  referred_by?: number;
  status: 'active' | 'banned' | 'frozen';
  created_at: string;
  updated_at: string;
}

export interface BalanceRecord {
  user_id: number;
  coins: number;
  available_balance: number;
  pending_withdrawal: number;
  total_earned: number;
  total_withdrawn: number;
  updated_at: string;
}

export interface EnergyRecord {
  user_id: number;
  current_energy: number;
  max_energy: number;
  regen_rate: number;
  regen_interval_seconds: number;
  last_energy_updated_at: string;
}

export interface LevelRecord {
  level: number;
  name: string;
  xp_required: number;
  tap_multiplier: number;
  max_energy: number;
  energy_regen_rate: number;
  daily_reward_multiplier: number;
}

export interface GameProfileRecord {
  user_id: number;
  level: number;
  current_xp: number;
  total_taps: number;
  daily_streak: number;
  last_daily_claim_date?: string;
  last_tap_at?: string;
  last_sequence: number;
}

export interface ActiveBoostRecord {
  id: string;
  user_id: number;
  boost_id: string;
  name: string;
  type: 'turbo' | 'double_profit' | 'tap_power' | 'full_energy';
  multiplier: number;
  expires_at: string;
}

export interface BoostRecord {
  id: string;
  name: string;
  description: string;
  type: 'turbo' | 'double_profit' | 'tap_power' | 'full_energy';
  duration_seconds: number;
  multiplier: number;
  cost: number;
  daily_limit: number;
  is_free: boolean;
  is_active: boolean;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  reward_coins: number;
  reward_xp: number;
  url: string;
  type: 'telegram_channel' | 'telegram_group' | 'website' | 'invite_friends' | 'daily_task' | 'custom';
  required_action: string;
  is_active: boolean;
}

export interface TaskCompletionRecord {
  id: string;
  user_id: number;
  task_id: string;
  completed_at: string;
}

export interface DailyRewardRecord {
  day: number;
  reward_coins: number;
  reward_xp: number;
}

export interface ReferralRecord {
  id: string;
  referrer_id: number;
  referred_id: number;
  tier: number; // 1, 2, or 3
  created_at: string;
}

export interface TransactionRecord {
  id: string;
  user_id: number;
  type: 'tap' | 'daily_reward' | 'task' | 'referral' | 'boost' | 'bonus' | 'withdraw' | 'admin_adjustment' | 'penalty' | 'refund';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface WithdrawalRecord {
  id: string;
  user_id: number;
  amount: number;
  fee: number;
  net_amount: number;
  method: 'USDT_TRC20' | 'TON' | 'INTERNAL_WALLET' | 'CUSTOM';
  destination_address: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'cancelled';
  rejection_reason?: string;
  tx_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface AntiCheatRecord {
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

export interface AuditLogRecord {
  id: string;
  admin_username: string;
  action: string;
  target_type: string;
  target_id?: string | number;
  details: string;
  ip: string;
  created_at: string;
}

export interface AdminUserRecord {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: 'superadmin' | 'admin' | 'moderator';
  permissions: string[];
  status: 'active' | 'suspended';
  created_at: string;
}

export interface SettingsRecord {
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
  telegram_bot_token: string;
  telegram_bot_username: string;
  telegram_webhook_url: string;
}

class DatabaseEngine {
  private dataFile: string;
  public isInstalled: boolean = true;

  public users: Map<number, UserRecord> = new Map();
  public balances: Map<number, BalanceRecord> = new Map();
  public energy: Map<number, EnergyRecord> = new Map();
  public profiles: Map<number, GameProfileRecord> = new Map();
  public levels: LevelRecord[] = [];
  public dailyRewards: DailyRewardRecord[] = [];
  public boosts: BoostRecord[] = [];
  public activeBoosts: ActiveBoostRecord[] = [];
  public tasks: TaskRecord[] = [];
  public taskCompletions: TaskCompletionRecord[] = [];
  public referrals: ReferralRecord[] = [];
  public transactions: TransactionRecord[] = [];
  public withdrawals: WithdrawalRecord[] = [];
  public antiCheatEvents: AntiCheatRecord[] = [];
  public auditLogs: AuditLogRecord[] = [];
  public adminUsers: Map<number, AdminUserRecord> = new Map();
  public usedNonces: Set<string> = new Set();
  public settings: SettingsRecord;

  constructor() {
    this.dataFile = path.join(process.cwd(), 'data_store.json');
    this.settings = {
      game_name: 'TapEmpire',
      coin_name: 'Empire Coin',
      coin_symbol: 'EPC',
      tap_reward: 1,
      max_energy: 1000,
      energy_regen_rate: 1,
      energy_regen_interval: 3,
      tap_cost: 1,
      xp_per_tap: 1,
      referral_l1_percent: 10,
      referral_l2_percent: 3,
      referral_l3_percent: 1,
      min_withdrawal: 10000,
      withdrawal_fee_percent: 5,
      maintenance_mode: false,
      anti_cheat_enabled: true,
      max_taps_per_second: 12,
      telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
      telegram_bot_username: process.env.TELEGRAM_BOT_USERNAME || 'TapEmpireBot',
      telegram_webhook_url: (process.env.APP_URL || 'https://tapempire.app') + '/api/telegram/webhook',
    };

    this.seedDefaultConfiguration();
    this.seedDemoUser();
  }

  private seedDefaultConfiguration() {
    // 7 Game Levels
    this.levels = [
      { level: 1, name: 'Bronze Miner', xp_required: 0, tap_multiplier: 1, max_energy: 1000, energy_regen_rate: 1, daily_reward_multiplier: 1 },
      { level: 2, name: 'Silver Miner', xp_required: 500, tap_multiplier: 2, max_energy: 1500, energy_regen_rate: 2, daily_reward_multiplier: 1.2 },
      { level: 3, name: 'Gold Miner', xp_required: 2000, tap_multiplier: 3, max_energy: 2000, energy_regen_rate: 3, daily_reward_multiplier: 1.5 },
      { level: 4, name: 'Platinum Miner', xp_required: 6000, tap_multiplier: 4, max_energy: 3000, energy_regen_rate: 4, daily_reward_multiplier: 2.0 },
      { level: 5, name: 'Diamond Miner', xp_required: 15000, tap_multiplier: 5, max_energy: 4000, energy_regen_rate: 5, daily_reward_multiplier: 2.5 },
      { level: 6, name: 'Master Overlord', xp_required: 40000, tap_multiplier: 7, max_energy: 6000, energy_regen_rate: 7, daily_reward_multiplier: 3.0 },
      { level: 7, name: 'Empire Legend', xp_required: 100000, tap_multiplier: 10, max_energy: 10000, energy_regen_rate: 10, daily_reward_multiplier: 5.0 },
    ];

    // 7 Days Daily Rewards
    this.dailyRewards = [
      { day: 1, reward_coins: 1000, reward_xp: 50 },
      { day: 2, reward_coins: 2500, reward_xp: 100 },
      { day: 3, reward_coins: 6000, reward_xp: 200 },
      { day: 4, reward_coins: 12000, reward_xp: 400 },
      { day: 5, reward_coins: 20000, reward_xp: 750 },
      { day: 6, reward_coins: 35000, reward_xp: 1200 },
      { day: 7, reward_coins: 75000, reward_xp: 2500 },
    ];

    // Boosts
    this.boosts = [
      {
        id: 'boost_turbo',
        name: 'Turbo Tap 3X',
        description: 'Multiplies your tap power by 3x for 30 exciting seconds.',
        type: 'turbo',
        duration_seconds: 30,
        multiplier: 3,
        cost: 0,
        daily_limit: 3,
        is_free: true,
        is_active: true,
      },
      {
        id: 'boost_full_energy',
        name: 'Full Energy Recharge',
        description: 'Instantly fill your energy gauge back to 100% capacity.',
        type: 'full_energy',
        duration_seconds: 0,
        multiplier: 1,
        cost: 0,
        daily_limit: 3,
        is_free: true,
        is_active: true,
      },
      {
        id: 'boost_double_profit',
        name: 'Double Profit (2X)',
        description: 'Receive double coins for all taps for the next 5 minutes.',
        type: 'double_profit',
        duration_seconds: 300,
        multiplier: 2,
        cost: 2500,
        daily_limit: 10,
        is_free: false,
        is_active: true,
      },
      {
        id: 'boost_tap_power',
        name: 'Super Tap Power (+2)',
        description: 'Permanently enhances tap base coin extraction by +2.',
        type: 'tap_power',
        duration_seconds: 0,
        multiplier: 2,
        cost: 5000,
        daily_limit: 5,
        is_free: false,
        is_active: true,
      },
    ];

    // Tasks
    this.tasks = [
      {
        id: 'task_tg_channel',
        title: 'Join Official Announcements',
        description: 'Join the official Telegram broadcast channel to stay updated on drops and contests.',
        reward_coins: 5000,
        reward_xp: 150,
        url: 'https://t.me/telegram',
        type: 'telegram_channel',
        required_action: 'join_channel',
        is_active: true,
      },
      {
        id: 'task_tg_group',
        title: 'Join Global Chat Community',
        description: 'Chat with other miners, exchange tips, and share referral codes.',
        reward_coins: 5000,
        reward_xp: 150,
        url: 'https://t.me/telegram',
        type: 'telegram_group',
        required_action: 'join_group',
        is_active: true,
      },
      {
        id: 'task_invite_3',
        title: 'Invite 3 Friends',
        description: 'Share your referral link with at least 3 genuine friends.',
        reward_coins: 25000,
        reward_xp: 500,
        url: '',
        type: 'invite_friends',
        required_action: 'invite_3',
        is_active: true,
      },
      {
        id: 'task_visit_site',
        title: 'Visit Web Portal & Roadmap',
        description: 'Explore the project tokenomics, whitepaper, and future plans.',
        reward_coins: 3000,
        reward_xp: 100,
        url: 'https://telegram.org',
        type: 'website',
        required_action: 'visit_website',
        is_active: true,
      },
      {
        id: 'task_daily_active',
        title: 'Daily Miner Dedication',
        description: 'Perform at least 50 taps today to claim this extra daily bonus.',
        reward_coins: 2000,
        reward_xp: 80,
        url: '',
        type: 'daily_task',
        required_action: 'tap_50',
        is_active: true,
      },
    ];

    // Seed default Admin Users
    const adminSecret = process.env.ADMIN_JWT_SECRET || 'tap_empire_prod_secret_admin_key_9981247';
    const hashPass = (p: string) => crypto.createHmac('sha256', adminSecret).update(p).digest('hex');

    this.adminUsers.set(1, {
      id: 1,
      username: 'superadmin',
      email: 'admin@tapempire.io',
      password_hash: hashPass('SuperAdminPass2026!'),
      role: 'superadmin',
      permissions: ['*'],
      status: 'active',
      created_at: new Date().toISOString(),
    });

    this.adminUsers.set(2, {
      id: 2,
      username: 'admin',
      email: 'owner@tapempire.io',
      password_hash: hashPass('AdminSecurePass123!'),
      role: 'superadmin',
      permissions: ['*'],
      status: 'active',
      created_at: new Date().toISOString(),
    });

    this.adminUsers.set(3, {
      id: 3,
      username: 'moderator',
      email: 'mod@tapempire.io',
      password_hash: hashPass('ModSecurePass123!'),
      role: 'moderator',
      permissions: ['stats.view', 'users.view', 'withdrawals.view', 'anticheat.view'],
      status: 'active',
      created_at: new Date().toISOString(),
    });
  }

  private seedDemoUser() {
    const demoId = 1001;
    const now = new Date().toISOString();

    const demoUser: UserRecord = {
      id: demoId,
      telegram_id: 88776655,
      username: 'empire_miner',
      first_name: 'Alex',
      last_name: 'Vanguard',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      referral_code: 'EMPIRE99',
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    this.users.set(demoId, demoUser);

    this.balances.set(demoId, {
      user_id: demoId,
      coins: 125840,
      available_balance: 100000,
      pending_withdrawal: 25840,
      total_earned: 500000,
      total_withdrawn: 300000,
      updated_at: now,
    });

    this.energy.set(demoId, {
      user_id: demoId,
      current_energy: 843,
      max_energy: 1000,
      regen_rate: 1,
      regen_interval_seconds: 3,
      last_energy_updated_at: now,
    });

    this.profiles.set(demoId, {
      user_id: demoId,
      level: 3,
      current_xp: 2850,
      total_taps: 4120,
      daily_streak: 3,
      last_daily_claim_date: new Date(Date.now() - 26 * 3600 * 1000).toISOString().split('T')[0],
      last_sequence: 140,
    });

    // Seed some other leaderboard users for realism
    const mockLeaders = [
      { id: 2001, username: 'crypto_king', name: 'Satoshi R.', score: 489000, level: 6 },
      { id: 2002, username: 'ton_master', name: 'Pavel D.', score: 382000, level: 5 },
      { id: 2003, username: 'tap_legend', name: 'Elena V.', score: 265000, level: 4 },
      { id: 2004, username: 'speedy_fox', name: 'Tariq A.', score: 180000, level: 4 },
      { id: 2005, username: 'empire_miner', name: 'Alex Vanguard', score: 125840, level: 3 },
      { id: 2006, username: 'lunar_tap', name: 'Maria K.', score: 98000, level: 3 },
      { id: 2007, username: 'sol_hammer', name: 'John D.', score: 67400, level: 2 },
      { id: 2008, username: 'gold_rush', name: 'Omar B.', score: 42100, level: 2 },
    ];

    mockLeaders.forEach((l) => {
      if (l.id !== demoId) {
        this.users.set(l.id, {
          id: l.id,
          telegram_id: l.id + 700000,
          username: l.username,
          first_name: l.name,
          last_name: '',
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${l.username}`,
          referral_code: `REF_${l.id}`,
          status: 'active',
          created_at: now,
          updated_at: now,
        });

        this.balances.set(l.id, {
          user_id: l.id,
          coins: l.score,
          available_balance: l.score,
          pending_withdrawal: 0,
          total_earned: l.score * 1.5,
          total_withdrawn: 0,
          updated_at: now,
        });

        this.profiles.set(l.id, {
          user_id: l.id,
          level: l.level,
          current_xp: l.score / 10,
          total_taps: Math.floor(l.score / 2),
          daily_streak: 4,
          last_sequence: 10,
        });
      }
    });

    // Seed referrals for demo user
    this.referrals.push(
      { id: 'ref_1', referrer_id: demoId, referred_id: 2006, tier: 1, created_at: now },
      { id: 'ref_2', referrer_id: demoId, referred_id: 2007, tier: 1, created_at: now },
      { id: 'ref_3', referrer_id: 2006, referred_id: 2008, tier: 2, created_at: now }
    );

    // Seed initial transactions
    this.transactions.push(
      {
        id: 'tx_init_1',
        user_id: demoId,
        type: 'daily_reward',
        amount: 2500,
        balance_before: 123340,
        balance_after: 125840,
        reference: 'Day 3 Streak Claim',
        created_at: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      },
      {
        id: 'tx_init_2',
        user_id: demoId,
        type: 'withdraw',
        amount: -25840,
        balance_before: 151680,
        balance_after: 125840,
        reference: 'Withdrawal #WD-7819 Pending Approval',
        created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      },
      {
        id: 'tx_init_3',
        user_id: demoId,
        type: 'referral',
        amount: 3400,
        balance_before: 148280,
        balance_after: 151680,
        reference: 'Commission from Tier 1 Friend (lunar_tap)',
        created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      }
    );

    // Seed initial withdrawal
    this.withdrawals.push({
      id: 'WD-7819',
      user_id: demoId,
      amount: 25840,
      fee: 1292,
      net_amount: 24548,
      method: 'USDT_TRC20',
      destination_address: 'TXg9A3n8...Fq71Km',
      status: 'pending',
      created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    });
  }

  // --- Real-time Energy Calculation ---
  public getCalculatedEnergy(userId: number): EnergyRecord {
    const energy = this.energy.get(userId);
    const profile = this.profiles.get(userId);
    const levelInfo = this.getLevelInfo(profile?.level || 1);

    if (!energy) {
      const defaultEnergy: EnergyRecord = {
        user_id: userId,
        current_energy: levelInfo.max_energy,
        max_energy: levelInfo.max_energy,
        regen_rate: levelInfo.energy_regen_rate,
        regen_interval_seconds: this.settings.energy_regen_interval,
        last_energy_updated_at: new Date().toISOString(),
      };
      this.energy.set(userId, defaultEnergy);
      return defaultEnergy;
    }

    // Calculate regenerated energy from elapsed seconds
    const lastUpdate = new Date(energy.last_energy_updated_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((now - lastUpdate) / 1000));

    const intervals = Math.floor(elapsedSeconds / energy.regen_interval_seconds);
    if (intervals > 0) {
      const gained = intervals * energy.regen_rate;
      const newEnergy = Math.min(levelInfo.max_energy, energy.current_energy + gained);

      energy.current_energy = newEnergy;
      energy.max_energy = levelInfo.max_energy;
      energy.last_energy_updated_at = new Date(lastUpdate + intervals * energy.regen_interval_seconds * 1000).toISOString();
      this.energy.set(userId, energy);
    }

    return energy;
  }

  public getLevelInfo(levelNum: number): LevelRecord {
    return this.levels.find((l) => l.level === levelNum) || this.levels[0];
  }

  // Transaction Ledger Writer (Atomic Balance Movement)
  public recordTransaction(
    userId: number,
    type: TransactionRecord['type'],
    amount: number,
    reference: string,
    metadata?: Record<string, unknown>
  ): BalanceRecord {
    const balance = this.balances.get(userId) || {
      user_id: userId,
      coins: 0,
      available_balance: 0,
      pending_withdrawal: 0,
      total_earned: 0,
      total_withdrawn: 0,
      updated_at: new Date().toISOString(),
    };

    const before = balance.coins;
    const after = before + amount;

    balance.coins = after;
    if (amount > 0) {
      balance.total_earned += amount;
      balance.available_balance += amount;
    } else {
      balance.available_balance = Math.max(0, balance.available_balance + amount);
    }
    balance.updated_at = new Date().toISOString();
    this.balances.set(userId, balance);

    const tx: TransactionRecord = {
      id: 'tx_' + crypto.randomBytes(6).toString('hex'),
      user_id: userId,
      type,
      amount,
      balance_before: before,
      balance_after: after,
      reference,
      metadata,
      created_at: new Date().toISOString(),
    };
    this.transactions.unshift(tx);

    return balance;
  }
}

export const db = new DatabaseEngine();
