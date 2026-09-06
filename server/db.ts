import 'dotenv/config';
import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import crypto from 'crypto';

export interface UserRecord {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
  language_code: string;
  referral_code: string;
  referred_by: number | null;
  status: 'active' | 'flagged' | 'banned' | 'frozen';
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface GameProfileRecord {
  id: number;
  user_id: number;
  level: number;
  current_xp: number;
  total_taps: number;
  daily_streak: number;
  last_daily_claim_date: string | null;
  last_sequence: number;
  last_tap_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BalanceRecord {
  id: number;
  user_id: number;
  coins: number;
  available_balance: number;
  pending_withdrawal: number;
  total_earned: number;
  total_withdrawn: number;
  updated_at: string;
}

export interface EnergyStateRecord {
  id: number;
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

export interface BoostRecord {
  id: string;
  name: string;
  description: string;
  type: 'full_energy' | 'turbo' | 'double_profit' | 'auto_bot' | 'tap_power';
  multiplier: number;
  duration_seconds: number;
  cost: number;
  is_free: boolean;
  daily_limit: number;
  is_active: boolean;
}

export interface ActiveBoostRecord {
  id: number;
  user_id: number;
  boost_id: string;
  type: string;
  activated_at: string;
  expires_at: string;
  multiplier: number;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  category: 'telegram' | 'social' | 'in_game' | 'partner';
  type: string;
  required_action: string;
  reward_coins: number;
  reward_xp: number;
  url: string | null;
  verification_type: 'instant' | 'telegram_channel' | 'telegram_group' | 'manual_code';
  verification_payload: string | null;
  is_active: boolean;
}

export interface TaskCompletionRecord {
  id: number;
  user_id: number;
  task_id: string;
  completed_at: string;
}

export interface DailyRewardRecord {
  day: number;
  reward_coins: number;
  reward_xp: number;
  is_special: boolean;
}

export interface ReferralRecord {
  id: number;
  referrer_id: number;
  referred_id: number;
  tier: number;
  created_at: string;
  referred_username?: string;
  referred_first_name?: string;
  total_commission?: number;
}

export interface WithdrawalMethodRecord {
  id: string;
  name: string;
  network: string;
  symbol: string;
  min_amount: number;
  fee_percent: number;
  is_active: boolean;
}

export interface WithdrawalRecord {
  id: string;
  user_id: number;
  method_id: string;
  destination_address: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'cancelled';
  rejection_reason: string | null;
  tx_hash: string | null;
  processed_by: number | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  username?: string;
}

export interface TransactionRecord {
  id: string;
  user_id: number;
  type: 'tap' | 'task' | 'daily_reward' | 'referral' | 'boost' | 'withdraw' | 'refund' | 'bonus' | 'admin_adjustment';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference: string;
  metadata_json: any;
  created_at: string;
}

export interface AntiCheatEventRecord {
  id: string;
  user_id: number;
  username: string;
  type: 'duplicate_nonce' | 'speed_hack' | 'timestamp_skew' | 'energy_tamper' | 'impossible_score' | 'ip_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  client_ip: string;
  status: 'flagged' | 'banned' | 'reviewed' | 'cleared';
  created_at: string;
}

export interface AuditLogRecord {
  id: number;
  admin_user_id: number | null;
  action: string;
  target_type: string;
  target_id: string;
  details_json: any;
  ip_address: string;
  created_at: string;
}

export interface AdminUserRecord {
  id: number;
  role_id: number | null;
  role: string;
  username: string;
  email: string;
  password_hash: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'banned';
  last_login_at: string | null;
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
  telegram_bot_token: string;
  telegram_bot_username: string;
  telegram_webhook_url: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
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
  telegram_bot_token: '',
  telegram_bot_username: 'TapEmpireBot',
  telegram_webhook_url: '',
};

export const DEFAULT_LEVELS: LevelRecord[] = [
  { level: 1, name: 'Bronze Miner', xp_required: 0, tap_multiplier: 1, max_energy: 1000, energy_regen_rate: 1, daily_reward_multiplier: 1.0 },
  { level: 2, name: 'Silver Miner', xp_required: 500, tap_multiplier: 2, max_energy: 1500, energy_regen_rate: 2, daily_reward_multiplier: 1.2 },
  { level: 3, name: 'Gold Miner', xp_required: 2000, tap_multiplier: 3, max_energy: 2000, energy_regen_rate: 3, daily_reward_multiplier: 1.5 },
  { level: 4, name: 'Platinum Miner', xp_required: 6000, tap_multiplier: 4, max_energy: 3000, energy_regen_rate: 4, daily_reward_multiplier: 2.0 },
  { level: 5, name: 'Diamond Miner', xp_required: 15000, tap_multiplier: 5, max_energy: 4000, energy_regen_rate: 5, daily_reward_multiplier: 2.5 },
  { level: 6, name: 'Master Overlord', xp_required: 40000, tap_multiplier: 7, max_energy: 6000, energy_regen_rate: 7, daily_reward_multiplier: 3.0 },
  { level: 7, name: 'Empire Legend', xp_required: 100000, tap_multiplier: 10, max_energy: 10000, energy_regen_rate: 10, daily_reward_multiplier: 5.0 },
];

export class DatabaseEngine {
  private pool: Pool | null = null;
  public settings: GameSettings = { ...DEFAULT_SETTINGS };
  private levelsCache: LevelRecord[] = [...DEFAULT_LEVELS];

  constructor() {
    // Lazy pool initialization on demand
  }

  /**
   * Get or initialize MySQL connection pool
   */
  public getPool(): Pool {
    if (!this.pool) {
      const host = process.env.DB_HOST || '127.0.0.1';
      const port = Number(process.env.DB_PORT) || 3306;
      const database = process.env.DB_DATABASE || 'tapempire';
      const user = process.env.DB_USERNAME || 'tap_user';
      const password = process.env.DB_PASSWORD || '';

      this.pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        timezone: '+00:00',
        dateStrings: true,
      });
    }
    return this.pool;
  }

  /**
   * Set custom pool (used by installer after dynamic config)
   */
  public setPool(newPool: Pool) {
    if (this.pool) {
      this.pool.end().catch(() => {});
    }
    this.pool = newPool;
  }

  /**
   * Verify MySQL connectivity and load settings
   */
  public async init(): Promise<boolean> {
    try {
      const pool = this.getPool();
      const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 as connected');
      if (!rows || rows.length === 0) {
        throw new Error('MySQL connection test query failed.');
      }
      await this.refreshSettings();
      await this.refreshLevels();
      return true;
    } catch (err: any) {
      console.error('[TapEmpire DatabaseEngine] MySQL Connection Failure:', err.message);
      throw err;
    }
  }

  /**
   * Reload settings from MySQL
   */
  public async refreshSettings(): Promise<GameSettings> {
    try {
      const pool = this.getPool();
      const [rows] = await pool.query<RowDataPacket[]>('SELECT setting_key, setting_value FROM settings');
      const loaded: any = { ...DEFAULT_SETTINGS };

      for (const row of rows) {
        const key = row.setting_key;
        const val = row.setting_value;
        if (key in loaded) {
          if (typeof (DEFAULT_SETTINGS as any)[key] === 'number') {
            loaded[key] = Number(val);
          } else if (typeof (DEFAULT_SETTINGS as any)[key] === 'boolean') {
            loaded[key] = val === 'true' || val === '1';
          } else {
            loaded[key] = val;
          }
        }
      }

      this.settings = loaded;
      return this.settings;
    } catch {
      return this.settings;
    }
  }

  public async refreshLevels(): Promise<LevelRecord[]> {
    try {
      const pool = this.getPool();
      const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM levels ORDER BY level ASC');
      if (rows && rows.length > 0) {
        this.levelsCache = rows.map((r: any) => ({
          level: Number(r.level),
          name: String(r.name),
          xp_required: Number(r.xp_required),
          tap_multiplier: Number(r.tap_multiplier),
          max_energy: Number(r.max_energy),
          energy_regen_rate: Number(r.energy_regen_rate),
          daily_reward_multiplier: Number(r.daily_reward_multiplier),
        }));
      }
    } catch {}
    return this.levelsCache;
  }

  public getLevelInfo(levelNumber: number): LevelRecord {
    const found = this.levelsCache.find((l) => l.level === levelNumber);
    if (found) return found;
    const maxLevel = this.levelsCache[this.levelsCache.length - 1] || DEFAULT_LEVELS[DEFAULT_LEVELS.length - 1];
    return maxLevel;
  }

  // ===========================================================================
  // USERS
  // ===========================================================================

  public async getUserById(id: number): Promise<UserRecord | null> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) return null;
    return this.mapUser(rows[0]);
  }

  public async getUserByTelegramId(telegramId: number): Promise<UserRecord | null> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE telegram_id = ? LIMIT 1', [telegramId]);
    if (!rows || rows.length === 0) return null;
    return this.mapUser(rows[0]);
  }

  public async getUserByReferralCode(code: string): Promise<UserRecord | null> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE referral_code = ? LIMIT 1', [code]);
    if (!rows || rows.length === 0) return null;
    return this.mapUser(rows[0]);
  }

  public async createUser(data: {
    telegram_id: number;
    username?: string | null;
    first_name: string;
    last_name?: string | null;
    avatar_url?: string | null;
    language_code?: string;
    referral_code: string;
    referred_by?: number | null;
    is_premium?: boolean;
  }): Promise<UserRecord> {
    const pool = this.getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [userResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO users 
          (telegram_id, username, first_name, last_name, avatar_url, language_code, referral_code, referred_by, status, is_premium, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())`,
        [
          data.telegram_id,
          data.username || null,
          data.first_name,
          data.last_name || null,
          data.avatar_url || null,
          data.language_code || 'en',
          data.referral_code,
          data.referred_by || null,
          data.is_premium ? 1 : 0,
        ]
      );

      const userId = userResult.insertId;

      // Initialize Balances
      await conn.query(
        `INSERT INTO balances (user_id, coins, available_balance, pending_withdrawal, total_earned, total_withdrawn, updated_at)
         VALUES (?, 0, 0, 0, 0, 0, NOW())`,
        [userId]
      );

      // Initialize Energy State
      await conn.query(
        `INSERT INTO energy_states (user_id, current_energy, max_energy, regen_rate, regen_interval_seconds, last_energy_updated_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          this.settings.max_energy,
          this.settings.max_energy,
          this.settings.energy_regen_rate,
          this.settings.energy_regen_interval,
        ]
      );

      // Initialize Game Profile
      await conn.query(
        `INSERT INTO game_profiles (user_id, level, current_xp, total_taps, daily_streak, last_daily_claim_date, last_sequence, last_tap_at, created_at, updated_at)
         VALUES (?, 1, 0, 0, 1, NULL, 0, NULL, NOW(), NOW())`,
        [userId]
      );

      // If referred, create referral tier link
      if (data.referred_by) {
        await conn.query(
          `INSERT IGNORE INTO referrals (referrer_id, referred_id, tier, created_at)
           VALUES (?, ?, 1, NOW())`,
          [data.referred_by, userId]
        );
      }

      await conn.commit();

      const [createdRows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [userId]);
      return this.mapUser(createdRows[0]);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  public async updateUser(id: number, fields: Partial<UserRecord>): Promise<void> {
    const pool = this.getPool();
    const allowed = ['username', 'first_name', 'last_name', 'avatar_url', 'language_code', 'status', 'is_premium'];
    const updates: string[] = [];
    const values: any[] = [];

    for (const key of allowed) {
      if (key in fields) {
        updates.push(`\`${key}\` = ?`);
        const val = (fields as any)[key];
        values.push(key === 'is_premium' ? (val ? 1 : 0) : val);
      }
    }

    if (updates.length === 0) return;
    updates.push('updated_at = NOW()');
    values.push(id);

    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
  }

  // ===========================================================================
  // BALANCES & DOUBLE-ENTRY LEDGER
  // ===========================================================================

  public async getBalance(userId: number): Promise<BalanceRecord> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM balances WHERE user_id = ? LIMIT 1', [userId]);
    if (!rows || rows.length === 0) {
      // Create if missing
      await pool.query(
        'INSERT IGNORE INTO balances (user_id, coins, available_balance, pending_withdrawal, total_earned, total_withdrawn, updated_at) VALUES (?, 0, 0, 0, 0, 0, NOW())',
        [userId]
      );
      return {
        id: 0,
        user_id: userId,
        coins: 0,
        available_balance: 0,
        pending_withdrawal: 0,
        total_earned: 0,
        total_withdrawn: 0,
        updated_at: new Date().toISOString(),
      };
    }
    return this.mapBalance(rows[0]);
  }

  /**
   * Atomic balance update with double-entry ledger verification
   */
  public async recordTransaction(
    userId: number,
    type: 'tap' | 'task' | 'daily_reward' | 'referral' | 'boost' | 'withdraw' | 'refund' | 'bonus' | 'admin_adjustment',
    amount: number,
    reference: string,
    metadata?: any,
    existingConn?: PoolConnection
  ): Promise<BalanceRecord> {
    const conn = existingConn || (await this.getPool().getConnection());
    const shouldCommit = !existingConn;

    try {
      if (shouldCommit) {
        await conn.beginTransaction();
      }

      // Lock balance row FOR UPDATE
      const [rows] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM balances WHERE user_id = ? FOR UPDATE',
        [userId]
      );

      let balanceBefore = 0;
      let availableBefore = 0;
      let totalEarnedBefore = 0;

      if (!rows || rows.length === 0) {
        await conn.query(
          'INSERT INTO balances (user_id, coins, available_balance, pending_withdrawal, total_earned, total_withdrawn, updated_at) VALUES (?, 0, 0, 0, 0, 0, NOW())',
          [userId]
        );
      } else {
        balanceBefore = Number(rows[0].coins);
        availableBefore = Number(rows[0].available_balance);
        totalEarnedBefore = Number(rows[0].total_earned);
      }

      const balanceAfter = balanceBefore + amount;
      const availableAfter = availableBefore + amount;

      if (balanceAfter < 0 || availableAfter < 0) {
        throw new Error(`Insufficient funds: cannot deduct ${Math.abs(amount)} from balance ${balanceBefore}.`);
      }

      const totalEarnedAfter = amount > 0 ? totalEarnedBefore + amount : totalEarnedBefore;

      // Update balances table
      await conn.query(
        `UPDATE balances 
         SET coins = ?, available_balance = ?, total_earned = ?, updated_at = NOW() 
         WHERE user_id = ?`,
        [balanceAfter, availableAfter, totalEarnedAfter, userId]
      );

      // Insert transaction ledger record
      const txId = 'tx_' + crypto.randomBytes(12).toString('hex');
      await conn.query(
        `INSERT INTO transactions 
          (id, user_id, type, amount, balance_before, balance_after, reference, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          txId,
          userId,
          type,
          amount,
          balanceBefore,
          balanceAfter,
          reference,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );

      if (shouldCommit) {
        await conn.commit();
      }

      return {
        id: rows && rows.length > 0 ? Number(rows[0].id) : 0,
        user_id: userId,
        coins: balanceAfter,
        available_balance: availableAfter,
        pending_withdrawal: rows && rows.length > 0 ? Number(rows[0].pending_withdrawal) : 0,
        total_earned: totalEarnedAfter,
        total_withdrawn: rows && rows.length > 0 ? Number(rows[0].total_withdrawn) : 0,
        updated_at: new Date().toISOString(),
      };
    } catch (err) {
      if (shouldCommit) {
        await conn.rollback();
      }
      throw err;
    } finally {
      if (shouldCommit) {
        conn.release();
      }
    }
  }

  // ===========================================================================
  // ENERGY & REGENERATION
  // ===========================================================================

  public async getCalculatedEnergy(userId: number, conn?: PoolConnection): Promise<EnergyStateRecord> {
    const executor = conn || this.getPool();
    const [rows] = await executor.query<RowDataPacket[]>(
      conn
        ? 'SELECT * FROM energy_states WHERE user_id = ? FOR UPDATE'
        : 'SELECT * FROM energy_states WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!rows || rows.length === 0) {
      const defaultEnergy: EnergyStateRecord = {
        id: 0,
        user_id: userId,
        current_energy: this.settings.max_energy,
        max_energy: this.settings.max_energy,
        regen_rate: this.settings.energy_regen_rate,
        regen_interval_seconds: this.settings.energy_regen_interval,
        last_energy_updated_at: new Date().toISOString(),
      };
      await (conn || this.getPool()).query(
        'INSERT IGNORE INTO energy_states (user_id, current_energy, max_energy, regen_rate, regen_interval_seconds, last_energy_updated_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [
          userId,
          defaultEnergy.current_energy,
          defaultEnergy.max_energy,
          defaultEnergy.regen_rate,
          defaultEnergy.regen_interval_seconds,
        ]
      );
      return defaultEnergy;
    }

    const row = rows[0];
    const maxEnergy = Number(row.max_energy);
    const regenRate = Number(row.regen_rate);
    const intervalSec = Number(row.regen_interval_seconds) || 3;
    let currentEnergy = Number(row.current_energy);

    const lastTime = new Date(row.last_energy_updated_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((now - lastTime) / 1000));

    if (elapsedSeconds >= intervalSec && currentEnergy < maxEnergy) {
      const ticks = Math.floor(elapsedSeconds / intervalSec);
      const regenerated = Math.min(maxEnergy, currentEnergy + ticks * regenRate);
      if (regenerated !== currentEnergy) {
        currentEnergy = regenerated;
        const newTimestamp = new Date(lastTime + ticks * intervalSec * 1000).toISOString();
        await (conn || this.getPool()).query(
          'UPDATE energy_states SET current_energy = ?, last_energy_updated_at = ? WHERE user_id = ?',
          [currentEnergy, newTimestamp, userId]
        );
      }
    }

    return {
      id: Number(row.id),
      user_id: userId,
      current_energy: currentEnergy,
      max_energy: maxEnergy,
      regen_rate: regenRate,
      regen_interval_seconds: intervalSec,
      last_energy_updated_at: row.last_energy_updated_at,
    };
  }

  // ===========================================================================
  // GAME PROFILE
  // ===========================================================================

  public async getProfile(userId: number): Promise<GameProfileRecord> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM game_profiles WHERE user_id = ? LIMIT 1', [userId]);
    if (!rows || rows.length === 0) {
      await pool.query(
        'INSERT IGNORE INTO game_profiles (user_id, level, current_xp, total_taps, daily_streak, last_daily_claim_date, last_sequence, last_tap_at, created_at, updated_at) VALUES (?, 1, 0, 0, 1, NULL, 0, NULL, NOW(), NOW())',
        [userId]
      );
      return {
        id: 0,
        user_id: userId,
        level: 1,
        current_xp: 0,
        total_taps: 0,
        daily_streak: 1,
        last_daily_claim_date: null,
        last_sequence: 0,
        last_tap_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    return this.mapProfile(rows[0]);
  }

  // ===========================================================================
  // ATOMIC TAP BATCH SYNCHRONIZATION
  // ===========================================================================

  public async syncTaps(
    userId: number,
    tapsCount: number,
    nonce: string,
    sequence: number
  ): Promise<{
    earnedCoins: number;
    earnedXp: number;
    currentBalance: number;
    currentEnergy: number;
    currentXp: number;
    currentLevel: number;
    leveledUp: boolean;
    levelInfo: LevelRecord;
  }> {
    const pool = this.getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1. Anti-Replay: check and register nonce
      try {
        await conn.query(
          'INSERT INTO used_nonces (nonce, user_id, created_at) VALUES (?, ?, NOW())',
          [nonce, userId]
        );
      } catch (nonceErr: any) {
        if (nonceErr.code === 'ER_DUP_ENTRY') {
          throw new Error('REPLAY_ATTACK: Nonce has already been processed.');
        }
        throw nonceErr;
      }

      // 2. Lock and fetch Profile
      const [pRows] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM game_profiles WHERE user_id = ? FOR UPDATE',
        [userId]
      );
      if (!pRows || pRows.length === 0) {
        throw new Error('Game profile not found for user.');
      }
      const profile = this.mapProfile(pRows[0]);

      // 3. Lock and calculate Energy
      const energy = await this.getCalculatedEnergy(userId, conn);
      const energyCost = tapsCount * this.settings.tap_cost;
      if (energy.current_energy < energyCost) {
        throw new Error(`Insufficient energy. Required: ${energyCost}, Available: ${energy.current_energy}`);
      }

      // 4. Determine Active Multiplier from Boosts
      const [boostRows] = await conn.query<RowDataPacket[]>(
        `SELECT b.type, ub.multiplier 
         FROM user_boosts ub 
         JOIN boosts b ON b.id = ub.boost_id 
         WHERE ub.user_id = ? AND ub.expires_at > NOW()`,
        [userId]
      );

      const levelInfo = this.getLevelInfo(profile.level);
      let tapMultiplier = levelInfo.tap_multiplier;
      for (const b of boostRows) {
        if (b.type === 'turbo' || b.type === 'double_profit') {
          tapMultiplier *= Number(b.multiplier);
        }
      }

      // 5. Deduct energy
      const remainingEnergy = Math.max(0, energy.current_energy - energyCost);
      await conn.query(
        'UPDATE energy_states SET current_energy = ?, last_energy_updated_at = NOW() WHERE user_id = ?',
        [remainingEnergy, userId]
      );

      // 6. Calculate Coins and XP
      const earnedCoins = tapsCount * this.settings.tap_reward * tapMultiplier;
      const earnedXp = tapsCount * this.settings.xp_per_tap;

      // 7. Record balance transaction
      const balanceRecord = await this.recordTransaction(
        userId,
        'tap',
        earnedCoins,
        `Batch tap sync: ${tapsCount} taps (${tapMultiplier}x)`,
        { taps: tapsCount, nonce, sequence },
        conn
      );

      // 8. Update Profile & Check Level Up
      let newLevel = profile.level;
      let newXp = profile.current_xp + earnedXp;
      let leveledUp = false;

      const nextLevel = this.getLevelInfo(newLevel + 1);
      if (nextLevel && newXp >= nextLevel.xp_required && nextLevel.level > newLevel) {
        newLevel = nextLevel.level;
        leveledUp = true;
        // Award level-up bonus
        await this.recordTransaction(
          userId,
          'bonus',
          5000 * newLevel,
          `Level Up Bonus: Promoted to ${nextLevel.name}!`,
          { level: newLevel },
          conn
        );
      }

      await conn.query(
        `UPDATE game_profiles 
         SET total_taps = total_taps + ?, 
             current_xp = ?, 
             level = ?, 
             last_sequence = ?, 
             last_tap_at = NOW(), 
             updated_at = NOW() 
         WHERE user_id = ?`,
        [tapsCount, newXp, newLevel, sequence, userId]
      );

      // 9. Multi-Tier Referral Commissions
      await this.distributeReferralCommissionsInternal(userId, earnedCoins, conn);

      await conn.commit();

      return {
        earnedCoins,
        earnedXp,
        currentBalance: balanceRecord.coins,
        currentEnergy: remainingEnergy,
        currentXp: newXp,
        currentLevel: newLevel,
        leveledUp,
        levelInfo: this.getLevelInfo(newLevel),
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ===========================================================================
  // REFERRALS
  // ===========================================================================

  private async distributeReferralCommissionsInternal(userId: number, coinAmount: number, conn: PoolConnection): Promise<void> {
    const [uRows] = await conn.query<RowDataPacket[]>('SELECT referred_by, username FROM users WHERE id = ?', [userId]);
    if (!uRows || uRows.length === 0 || !uRows[0].referred_by) return;

    const l1ReferrerId = Number(uRows[0].referred_by);
    const originUsername = uRows[0].username || `user_${userId}`;

    // Tier 1 (Direct)
    const l1Percent = this.settings.referral_l1_percent;
    const l1Amount = Math.floor(coinAmount * (l1Percent / 100));
    if (l1Amount > 0) {
      await this.recordTransaction(
        l1ReferrerId,
        'referral',
        l1Amount,
        `Tier 1 referral commission from @${originUsername}`,
        { tier: 1, source_user_id: userId },
        conn
      );
    }

    // Tier 2 (Indirect)
    const [l1Rows] = await conn.query<RowDataPacket[]>('SELECT referred_by FROM users WHERE id = ?', [l1ReferrerId]);
    if (!l1Rows || l1Rows.length === 0 || !l1Rows[0].referred_by) return;

    const l2ReferrerId = Number(l1Rows[0].referred_by);
    const l2Percent = this.settings.referral_l2_percent;
    const l2Amount = Math.floor(coinAmount * (l2Percent / 100));
    if (l2Amount > 0) {
      await this.recordTransaction(
        l2ReferrerId,
        'referral',
        l2Amount,
        `Tier 2 referral commission from network`,
        { tier: 2, source_user_id: userId },
        conn
      );
    }

    // Tier 3 (Network)
    const [l2Rows] = await conn.query<RowDataPacket[]>('SELECT referred_by FROM users WHERE id = ?', [l2ReferrerId]);
    if (!l2Rows || l2Rows.length === 0 || !l2Rows[0].referred_by) return;

    const l3ReferrerId = Number(l2Rows[0].referred_by);
    const l3Percent = this.settings.referral_l3_percent;
    const l3Amount = Math.floor(coinAmount * (l3Percent / 100));
    if (l3Amount > 0) {
      await this.recordTransaction(
        l3ReferrerId,
        'referral',
        l3Amount,
        `Tier 3 referral commission from network`,
        { tier: 3, source_user_id: userId },
        conn
      );
    }
  }

  public async getReferralStats(userId: number): Promise<{
    referralCode: string;
    totalReferrals: number;
    totalEarned: number;
    referrals: ReferralRecord[];
  }> {
    const pool = this.getPool();
    const user = await this.getUserById(userId);
    const referralCode = user ? user.referral_code : '';

    const [refRows] = await pool.query<RowDataPacket[]>(
      `SELECT r.*, u.username as referred_username, u.first_name as referred_first_name
       FROM referrals r
       JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const [txRows] = await pool.query<RowDataPacket[]>(
      `SELECT COALESCE(SUM(amount), 0) as total_earned 
       FROM transactions 
       WHERE user_id = ? AND type = 'referral'`,
      [userId]
    );

    const totalEarned = txRows && txRows.length > 0 ? Number(txRows[0].total_earned) : 0;

    return {
      referralCode,
      totalReferrals: refRows.length,
      totalEarned,
      referrals: refRows.map((r: any) => ({
        id: Number(r.id),
        referrer_id: Number(r.referrer_id),
        referred_id: Number(r.referred_id),
        tier: Number(r.tier),
        created_at: r.created_at,
        referred_username: r.referred_username,
        referred_first_name: r.referred_first_name,
      })),
    };
  }

  // ===========================================================================
  // TASKS
  // ===========================================================================

  public async getTasks(userId: number): Promise<Array<TaskRecord & { is_completed: boolean }>> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*, 
        (CASE WHEN tc.id IS NOT NULL THEN 1 ELSE 0 END) as is_completed 
       FROM tasks t
       LEFT JOIN task_completions tc ON tc.task_id = t.id AND tc.user_id = ?
       WHERE t.is_active = 1
       ORDER BY t.created_at ASC`,
      [userId]
    );

    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      type: r.type || r.category,
      required_action: r.required_action || 'instant',
      reward_coins: Number(r.reward_coins),
      reward_xp: Number(r.reward_xp),
      url: r.url,
      verification_type: r.verification_type,
      verification_payload: r.verification_payload,
      is_active: Boolean(r.is_active),
      is_completed: Boolean(r.is_completed),
    }));
  }

  public async completeTask(
    userId: number,
    taskId: string
  ): Promise<{ rewardCoins: number; rewardXp: number; newBalance: number; newXp: number }> {
    const pool = this.getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Check task
      const [taskRows] = await conn.query<RowDataPacket[]>('SELECT * FROM tasks WHERE id = ? LIMIT 1', [taskId]);
      if (!taskRows || taskRows.length === 0) {
        throw new Error('Task not found.');
      }
      const task = taskRows[0];

      // Check if already completed
      const [compRows] = await conn.query<RowDataPacket[]>(
        'SELECT id FROM task_completions WHERE user_id = ? AND task_id = ? LIMIT 1 FOR UPDATE',
        [userId, taskId]
      );
      if (compRows && compRows.length > 0) {
        throw new Error('Task has already been completed.');
      }

      // Record completion
      await conn.query(
        'INSERT INTO task_completions (user_id, task_id, completed_at) VALUES (?, ?, NOW())',
        [userId, taskId]
      );

      // Award coins via ledger
      const rewardCoins = Number(task.reward_coins);
      const rewardXp = Number(task.reward_xp);

      const bal = await this.recordTransaction(
        userId,
        'task',
        rewardCoins,
        `Task completed: ${task.title}`,
        { task_id: taskId },
        conn
      );

      // Award XP
      await conn.query(
        'UPDATE game_profiles SET current_xp = current_xp + ?, updated_at = NOW() WHERE user_id = ?',
        [rewardXp, userId]
      );

      const [pRows] = await conn.query<RowDataPacket[]>(
        'SELECT current_xp FROM game_profiles WHERE user_id = ?',
        [userId]
      );

      await conn.commit();

      return {
        rewardCoins,
        rewardXp,
        newBalance: bal.coins,
        newXp: pRows && pRows.length > 0 ? Number(pRows[0].current_xp) : rewardXp,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ===========================================================================
  // DAILY REWARDS
  // ===========================================================================

  public async getDailyRewards(): Promise<DailyRewardRecord[]> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM daily_rewards ORDER BY day ASC');
    return rows.map((r: any) => ({
      day: Number(r.day),
      reward_coins: Number(r.reward_coins),
      reward_xp: Number(r.reward_xp),
      is_special: Boolean(r.is_special),
    }));
  }

  public async claimDailyReward(userId: number): Promise<{
    rewardCoins: number;
    rewardXp: number;
    streak: number;
    newBalance: number;
  }> {
    const pool = this.getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [pRows] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM game_profiles WHERE user_id = ? FOR UPDATE',
        [userId]
      );
      if (!pRows || pRows.length === 0) throw new Error('User profile not found.');

      const profile = this.mapProfile(pRows[0]);
      const todayStr = new Date().toISOString().split('T')[0];

      if (profile.last_daily_claim_date === todayStr) {
        throw new Error('Daily reward already claimed today.');
      }

      // Check if streak continues
      let newStreak = 1;
      if (profile.last_daily_claim_date) {
        const lastDate = new Date(profile.last_daily_claim_date);
        const todayDate = new Date(todayStr);
        const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak = profile.daily_streak + 1;
        }
      }

      const streakDay = ((newStreak - 1) % 7) + 1;

      // Get reward amount
      const [rRows] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM daily_rewards WHERE day = ? LIMIT 1',
        [streakDay]
      );
      const rewardCoins = rRows && rRows.length > 0 ? Number(rRows[0].reward_coins) : 1000 * streakDay;
      const rewardXp = rRows && rRows.length > 0 ? Number(rRows[0].reward_xp) : 50 * streakDay;

      // Insert claim record
      await conn.query(
        'INSERT INTO daily_reward_claims (user_id, day, claim_date, reward_coins, reward_xp, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [userId, streakDay, todayStr, rewardCoins, rewardXp]
      );

      // Record transaction
      const bal = await this.recordTransaction(
        userId,
        'daily_reward',
        rewardCoins,
        `Day ${streakDay} Daily Streak Reward`,
        { streak: newStreak, day: streakDay },
        conn
      );

      // Update profile
      await conn.query(
        'UPDATE game_profiles SET daily_streak = ?, last_daily_claim_date = ?, current_xp = current_xp + ?, updated_at = NOW() WHERE user_id = ?',
        [newStreak, todayStr, rewardXp, userId]
      );

      await conn.commit();

      return {
        rewardCoins,
        rewardXp,
        streak: newStreak,
        newBalance: bal.coins,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ===========================================================================
  // BOOSTS
  // ===========================================================================

  public async getBoosts(userId: number): Promise<{ boosts: BoostRecord[]; activeBoosts: ActiveBoostRecord[] }> {
    const pool = this.getPool();
    const [bRows] = await pool.query<RowDataPacket[]>('SELECT * FROM boosts WHERE is_active = 1 ORDER BY cost ASC');
    const [ubRows] = await pool.query<RowDataPacket[]>(
      `SELECT ub.*, b.type 
       FROM user_boosts ub 
       JOIN boosts b ON b.id = ub.boost_id 
       WHERE ub.user_id = ? AND ub.expires_at > NOW()`,
      [userId]
    );

    return {
      boosts: bRows.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        type: r.type,
        multiplier: Number(r.multiplier),
        duration_seconds: Number(r.duration_seconds),
        cost: Number(r.cost),
        is_free: Boolean(r.is_free),
        daily_limit: Number(r.daily_limit),
        is_active: Boolean(r.is_active),
      })),
      activeBoosts: ubRows.map((r: any) => ({
        id: Number(r.id),
        user_id: Number(r.user_id),
        boost_id: r.boost_id,
        type: r.type,
        activated_at: r.activated_at,
        expires_at: r.expires_at,
        multiplier: Number(r.multiplier),
      })),
    };
  }

  public async activateBoost(userId: number, boostId: string): Promise<ActiveBoostRecord> {
    const pool = this.getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [bRows] = await conn.query<RowDataPacket[]>('SELECT * FROM boosts WHERE id = ? LIMIT 1', [boostId]);
      if (!bRows || bRows.length === 0) throw new Error('Boost not found.');
      const boost = bRows[0];

      // Check daily limit
      const [todayUses] = await conn.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM user_boosts WHERE user_id = ? AND boost_id = ? AND DATE(activated_at) = CURDATE()',
        [userId, boostId]
      );
      if (todayUses && Number(todayUses[0].count) >= Number(boost.daily_limit)) {
        throw new Error(`Daily limit of ${boost.daily_limit} reached for this boost.`);
      }

      // Deduct coins if not free
      const cost = Number(boost.cost);
      if (cost > 0) {
        await this.recordTransaction(
          userId,
          'boost',
          -cost,
          `Activated boost: ${boost.name}`,
          { boost_id: boostId },
          conn
        );
      }

      // Handle full_energy
      if (boost.type === 'full_energy') {
        await conn.query(
          'UPDATE energy_states SET current_energy = max_energy, last_energy_updated_at = NOW() WHERE user_id = ?',
          [userId]
        );
      }

      // Insert active boost
      const durationSeconds = Number(boost.duration_seconds) || 0;
      const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ');

      const [res] = await conn.query<ResultSetHeader>(
        `INSERT INTO user_boosts (user_id, boost_id, activated_at, expires_at, multiplier)
         VALUES (?, ?, NOW(), ?, ?)`,
        [userId, boostId, expiresAt, Number(boost.multiplier) || 1]
      );

      await conn.commit();

      return {
        id: res.insertId,
        user_id: userId,
        boost_id: boostId,
        type: boost.type,
        activated_at: new Date().toISOString(),
        expires_at: expiresAt,
        multiplier: Number(boost.multiplier) || 1,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ===========================================================================
  // WITHDRAWALS & WALLET
  // ===========================================================================

  public async getWithdrawalMethods(): Promise<WithdrawalMethodRecord[]> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM withdrawal_methods WHERE is_active = 1');
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      network: r.network,
      symbol: r.symbol,
      min_amount: Number(r.min_amount),
      fee_percent: Number(r.fee_percent),
      is_active: Boolean(r.is_active),
    }));
  }

  public async getWithdrawals(userId?: number): Promise<WithdrawalRecord[]> {
    const pool = this.getPool();
    const query = userId
      ? 'SELECT w.*, u.username FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE w.user_id = ? ORDER BY w.created_at DESC'
      : 'SELECT w.*, u.username FROM withdrawals w JOIN users u ON u.id = w.user_id ORDER BY w.created_at DESC';
    const params = userId ? [userId] : [];
    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows.map((r: any) => ({
      id: r.id,
      user_id: Number(r.user_id),
      method_id: r.method_id,
      destination_address: r.destination_address,
      amount: Number(r.amount),
      fee: Number(r.fee),
      net_amount: Number(r.net_amount),
      status: r.status,
      rejection_reason: r.rejection_reason,
      tx_hash: r.tx_hash,
      processed_by: r.processed_by ? Number(r.processed_by) : null,
      processed_at: r.processed_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      username: r.username,
    }));
  }

  public async createWithdrawal(
    userId: number,
    methodId: string,
    amount: number,
    destinationAddress: string
  ): Promise<WithdrawalRecord> {
    const pool = this.getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      if (amount < this.settings.min_withdrawal) {
        throw new Error(`Minimum withdrawal threshold is ${this.settings.min_withdrawal} coins.`);
      }

      // Lock balance
      const [balRows] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM balances WHERE user_id = ? FOR UPDATE',
        [userId]
      );
      if (!balRows || balRows.length === 0) throw new Error('Balance record not found.');
      const available = Number(balRows[0].available_balance);

      if (available < amount) {
        throw new Error(`Insufficient available balance. You requested ${amount}, but have ${available}.`);
      }

      // Calculate fee
      const feePercent = this.settings.withdrawal_fee_percent;
      const fee = Math.floor(amount * (feePercent / 100));
      const netAmount = amount - fee;

      // Lock funds: deduct available_balance, increment pending_withdrawal
      await conn.query(
        `UPDATE balances 
         SET available_balance = available_balance - ?, 
             pending_withdrawal = pending_withdrawal + ?, 
             updated_at = NOW() 
         WHERE user_id = ?`,
        [amount, amount, userId]
      );

      const withdrawalId = 'wd_' + crypto.randomBytes(8).toString('hex');
      await conn.query(
        `INSERT INTO withdrawals 
          (id, user_id, method_id, destination_address, amount, fee, net_amount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [withdrawalId, userId, methodId, destinationAddress, amount, fee, netAmount]
      );

      // Ledger record for hold
      await conn.query(
        `INSERT INTO transactions 
          (id, user_id, type, amount, balance_before, balance_after, reference, created_at)
         VALUES (?, ?, 'withdraw', ?, ?, ?, ?, NOW())`,
        [
          'tx_' + crypto.randomBytes(12).toString('hex'),
          userId,
          -amount,
          available,
          available - amount,
          `Withdrawal request created: ${withdrawalId}`,
        ]
      );

      await conn.commit();

      return {
        id: withdrawalId,
        user_id: userId,
        method_id: methodId,
        destination_address: destinationAddress,
        amount,
        fee,
        net_amount: netAmount,
        status: 'pending',
        rejection_reason: null,
        tx_hash: null,
        processed_by: null,
        processed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  public async updateWithdrawalStatus(
    withdrawalId: string,
    action: 'approve' | 'reject',
    adminId: number,
    rejectionReason?: string,
    txHash?: string
  ): Promise<void> {
    const pool = this.getPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [wRows] = await conn.query<RowDataPacket[]>(
        'SELECT * FROM withdrawals WHERE id = ? FOR UPDATE',
        [withdrawalId]
      );
      if (!wRows || wRows.length === 0) throw new Error('Withdrawal request not found.');
      const withdrawal = wRows[0];

      if (withdrawal.status !== 'pending') {
        throw new Error(`Withdrawal is already in '${withdrawal.status}' state.`);
      }

      const userId = Number(withdrawal.user_id);
      const amount = Number(withdrawal.amount);

      if (action === 'approve') {
        // Deduct coins & pending_withdrawal, increase total_withdrawn
        await conn.query(
          `UPDATE balances 
           SET coins = coins - ?, 
               pending_withdrawal = pending_withdrawal - ?, 
               total_withdrawn = total_withdrawn + ?, 
               updated_at = NOW() 
           WHERE user_id = ?`,
          [amount, amount, amount, userId]
        );

        await conn.query(
          `UPDATE withdrawals 
           SET status = 'approved', tx_hash = ?, processed_by = ?, processed_at = NOW(), updated_at = NOW() 
           WHERE id = ?`,
          [txHash || 'tx_' + crypto.randomBytes(8).toString('hex'), adminId, withdrawalId]
        );
      } else {
        // Refund available_balance, decrease pending_withdrawal
        await conn.query(
          `UPDATE balances 
           SET available_balance = available_balance + ?, 
               pending_withdrawal = pending_withdrawal - ?, 
               updated_at = NOW() 
           WHERE user_id = ?`,
          [amount, amount, userId]
        );

        await conn.query(
          `UPDATE withdrawals 
           SET status = 'rejected', rejection_reason = ?, processed_by = ?, processed_at = NOW(), updated_at = NOW() 
           WHERE id = ?`,
          [rejectionReason || 'Rejected by administrator', adminId, withdrawalId]
        );

        // Record refund in ledger
        const [balRows] = await conn.query<RowDataPacket[]>('SELECT coins, available_balance FROM balances WHERE user_id = ?', [userId]);
        const coins = balRows && balRows.length > 0 ? Number(balRows[0].coins) : 0;

        await conn.query(
          `INSERT INTO transactions 
            (id, user_id, type, amount, balance_before, balance_after, reference, created_at)
           VALUES (?, ?, 'refund', ?, ?, ?, ?, NOW())`,
          [
            'tx_' + crypto.randomBytes(12).toString('hex'),
            userId,
            amount,
            coins - amount,
            coins,
            `Refund for rejected withdrawal: ${withdrawalId}`,
          ]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ===========================================================================
  // LEADERBOARD
  // ===========================================================================

  public async getLeaderboard(limit = 50): Promise<Array<{
    rank: number;
    user_id: number;
    username: string;
    first_name: string;
    coins: number;
    level: number;
  }>> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id as user_id, u.username, u.first_name, b.coins, gp.level
       FROM users u
       JOIN balances b ON b.user_id = u.id
       JOIN game_profiles gp ON gp.user_id = u.id
       WHERE u.status != 'banned'
       ORDER BY b.coins DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map((r: any, idx: number) => ({
      rank: idx + 1,
      user_id: Number(r.user_id),
      username: r.username || `Player_${r.user_id}`,
      first_name: r.first_name || 'Miner',
      coins: Number(r.coins),
      level: Number(r.level),
    }));
  }

  // ===========================================================================
  // ANTI-CHEAT EVENTS & REPLAY PROTECTION
  // ===========================================================================

  public async logAntiCheatEvent(event: Omit<AntiCheatEventRecord, 'id' | 'created_at'>): Promise<void> {
    const pool = this.getPool();
    const id = 'ac_' + crypto.randomBytes(8).toString('hex');
    await pool.query(
      `INSERT INTO anti_cheat_events 
        (id, user_id, username, type, severity, details, client_ip, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, event.user_id, event.username, event.type, event.severity, event.details, event.client_ip, event.status]
    );
  }

  public async getAntiCheatEvents(limit = 50): Promise<AntiCheatEventRecord[]> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM anti_cheat_events ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows.map((r: any) => ({
      id: r.id,
      user_id: Number(r.user_id),
      username: r.username,
      type: r.type,
      severity: r.severity,
      details: r.details,
      client_ip: r.client_ip,
      status: r.status,
      created_at: r.created_at,
    }));
  }

  // ===========================================================================
  // ADMIN AUTH & MANAGEMENT
  // ===========================================================================

  public async getAdminByUsername(username: string): Promise<AdminUserRecord | null> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM admin_users WHERE username = ? LIMIT 1', [username]);
    if (!rows || rows.length === 0) return null;
    return this.mapAdmin(rows[0]);
  }

  public async getAdminById(id: number): Promise<AdminUserRecord | null> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM admin_users WHERE id = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) return null;
    return this.mapAdmin(rows[0]);
  }

  public async createAdminUser(data: {
    username: string;
    email: string;
    password_hash: string;
    role?: string;
    permissions?: string[];
  }): Promise<AdminUserRecord> {
    const pool = this.getPool();
    const role = data.role || 'superadmin';
    const perms = data.permissions || ['*'];

    const [res] = await pool.query<ResultSetHeader>(
      `INSERT INTO admin_users (role, username, email, password_hash, permissions_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [role, data.username, data.email, data.password_hash, JSON.stringify(perms)]
    );

    return {
      id: res.insertId,
      role_id: 1,
      role,
      username: data.username,
      email: data.email,
      password_hash: data.password_hash,
      permissions: perms,
      status: 'active',
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  public async getAdminStats(): Promise<{
    total_users: number;
    total_coins: number;
    total_taps: number;
    pending_withdrawals: number;
    flagged_users: number;
  }> {
    const pool = this.getPool();
    const [uRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM users');
    const [bRows] = await pool.query<RowDataPacket[]>('SELECT COALESCE(SUM(coins), 0) as total FROM balances');
    const [pRows] = await pool.query<RowDataPacket[]>('SELECT COALESCE(SUM(total_taps), 0) as total FROM game_profiles');
    const [wRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'");
    const [acRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as count FROM anti_cheat_events WHERE status = 'flagged'");

    return {
      total_users: Number(uRows[0]?.count || 0),
      total_coins: Number(bRows[0]?.total || 0),
      total_taps: Number(pRows[0]?.total || 0),
      pending_withdrawals: Number(wRows[0]?.count || 0),
      flagged_users: Number(acRows[0]?.count || 0),
    };
  }

  public async getUsersAdminList(limit = 100, offset = 0): Promise<any[]> {
    const pool = this.getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.telegram_id, u.username, u.first_name, u.status, u.created_at,
              b.coins, b.available_balance, b.pending_withdrawal,
              gp.level, gp.total_taps, gp.daily_streak
       FROM users u
       LEFT JOIN balances b ON b.user_id = u.id
       LEFT JOIN game_profiles gp ON gp.user_id = u.id
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return rows.map((r: any) => ({
      id: Number(r.id),
      telegram_id: Number(r.telegram_id),
      username: r.username,
      first_name: r.first_name,
      status: r.status,
      created_at: r.created_at,
      coins: Number(r.coins || 0),
      available_balance: Number(r.available_balance || 0),
      pending_withdrawal: Number(r.pending_withdrawal || 0),
      level: Number(r.level || 1),
      total_taps: Number(r.total_taps || 0),
      daily_streak: Number(r.daily_streak || 1),
    }));
  }

  public async logAudit(adminId: number | null, action: string, targetType: string, targetId: string, details?: any, ip = '127.0.0.1'): Promise<void> {
    try {
      const pool = this.getPool();
      await pool.query(
        'INSERT INTO audit_logs (admin_user_id, action, target_type, target_id, details_json, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [adminId, action, targetType, targetId, details ? JSON.stringify(details) : null, ip]
      );
    } catch {}
  }

  // ===========================================================================
  // MAPPERS
  // ===========================================================================

  private mapUser(r: any): UserRecord {
    return {
      id: Number(r.id),
      telegram_id: Number(r.telegram_id),
      username: r.username,
      first_name: r.first_name,
      last_name: r.last_name,
      avatar_url: r.avatar_url,
      language_code: r.language_code,
      referral_code: r.referral_code,
      referred_by: r.referred_by ? Number(r.referred_by) : null,
      status: r.status,
      is_premium: Boolean(r.is_premium),
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private mapBalance(r: any): BalanceRecord {
    return {
      id: Number(r.id),
      user_id: Number(r.user_id),
      coins: Number(r.coins),
      available_balance: Number(r.available_balance),
      pending_withdrawal: Number(r.pending_withdrawal),
      total_earned: Number(r.total_earned),
      total_withdrawn: Number(r.total_withdrawn),
      updated_at: r.updated_at,
    };
  }

  private mapProfile(r: any): GameProfileRecord {
    return {
      id: Number(r.id),
      user_id: Number(r.user_id),
      level: Number(r.level),
      current_xp: Number(r.current_xp),
      total_taps: Number(r.total_taps),
      daily_streak: Number(r.daily_streak),
      last_daily_claim_date: r.last_daily_claim_date,
      last_sequence: Number(r.last_sequence),
      last_tap_at: r.last_tap_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private mapAdmin(r: any): AdminUserRecord {
    let permissions: string[] = ['*'];
    if (r.permissions_json) {
      try {
        permissions = JSON.parse(r.permissions_json);
      } catch {}
    }
    return {
      id: Number(r.id),
      role_id: r.role_id ? Number(r.role_id) : 1,
      role: r.role || 'superadmin',
      username: r.username,
      email: r.email,
      password_hash: r.password_hash,
      permissions,
      status: r.status,
      last_login_at: r.last_login_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }
}

export const db = new DatabaseEngine();
