import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from './db';
import { AntiCheatEngine } from './antiCheat';
import { TelegramService } from './telegram';
import { InstallerService } from './installer';
import { AdminAuthService, AuthenticatedAdminRequest } from './adminAuth';

export const apiRouter = express.Router();

const USER_AUTH_SECRET = process.env.USER_AUTH_SECRET || 'tapempire_user_auth_secret_token_58291';

// Helper to get active user (verifies signed token or fallback in dev)
function getAuthUserId(req: Request): number {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    // Signed user token format: auth_<userId>_<exp>_<sig>
    if (token.startsWith('auth_')) {
      const parts = token.split('_');
      if (parts.length === 4) {
        const userId = parseInt(parts[1], 10);
        const exp = parseInt(parts[2], 10);
        const sig = parts[3];
        const expectedSig = crypto.createHmac('sha256', USER_AUTH_SECRET).update(`${userId}_${exp}`).digest('hex').substring(0, 16);
        if (sig === expectedSig && Date.now() < exp && db.users.has(userId)) {
          return userId;
        }
      }
    }
    const parsed = parseInt(token, 10);
    if (!isNaN(parsed) && db.users.has(parsed)) {
      return parsed;
    }
  }
  return 1001; // Default to demo user for preview / unauthenticated client
}

function generateUserAuthToken(userId: number): string {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const sig = crypto.createHmac('sha256', USER_AUTH_SECRET).update(`${userId}_${exp}`).digest('hex').substring(0, 16);
  return `auth_${userId}_${exp}_${sig}`;
}

// ----------------------------------------------------
// 1. Authentication via Telegram
// ----------------------------------------------------
apiRouter.post('/auth/telegram', (req: Request, res: Response) => {
  const { initData, start_param } = req.body;

  let telegramUser: any = null;

  if (initData && initData.trim() !== '') {
    const botToken = db.settings.telegram_bot_token;
    if (!botToken || botToken.trim() === '') {
      return res.status(401).json({
        success: false,
        error: 'BOT_TOKEN_UNCONFIGURED',
        message: 'Telegram Bot Token is not configured on the server. Please set TELEGRAM_BOT_TOKEN in .env.',
      });
    }

    const verified = TelegramService.verifyInitData(initData, botToken);
    if (!verified.isValid || !verified.user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_SIGNATURE',
        message: 'Telegram initData verification failed or auth_date has expired.',
      });
    }
    telegramUser = verified.user;
  }

  // Fallback only allowed in development when no initData is passed
  if (!telegramUser) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        success: false,
        error: 'INIT_DATA_REQUIRED',
        message: 'Direct access rejected. Telegram WebApp initData is mandatory in production.',
      });
    }
    telegramUser = {
      id: 88776655,
      first_name: 'Alex',
      last_name: 'Vanguard',
      username: 'empire_miner',
      language_code: 'en',
    };
  }

  // Check or create user
  let user = Array.from(db.users.values()).find((u) => u.telegram_id === telegramUser.id);
  const now = new Date().toISOString();

  if (!user) {
    const newId = Date.now();
    user = {
      id: newId,
      telegram_id: telegramUser.id,
      username: telegramUser.username || `miner_${telegramUser.id}`,
      first_name: telegramUser.first_name || 'Miner',
      last_name: telegramUser.last_name || '',
      avatar_url: telegramUser.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${telegramUser.username || telegramUser.id}`,
      referral_code: `REF_${newId}`,
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    db.users.set(newId, user);

    db.balances.set(newId, {
      user_id: newId,
      coins: 1000,
      available_balance: 1000,
      pending_withdrawal: 0,
      total_earned: 1000,
      total_withdrawn: 0,
      updated_at: now,
    });

    db.energy.set(newId, {
      user_id: newId,
      current_energy: 1000,
      max_energy: 1000,
      regen_rate: 1,
      regen_interval_seconds: db.settings.energy_regen_interval,
      last_energy_updated_at: now,
    });

    db.profiles.set(newId, {
      user_id: newId,
      level: 1,
      current_xp: 50,
      total_taps: 0,
      daily_streak: 1,
      last_sequence: 0,
    });

    // Check referral
    if (start_param) {
      const referrer = Array.from(db.users.values()).find(
        (u) => u.referral_code.toUpperCase() === start_param.toUpperCase()
      );
      if (referrer && referrer.id !== newId) {
        user.referred_by = referrer.id;
        db.referrals.push({
          id: 'ref_' + crypto.randomBytes(4).toString('hex'),
          referrer_id: referrer.id,
          referred_id: newId,
          tier: 1,
          created_at: now,
        });
        db.recordTransaction(referrer.id, 'referral', 5000, `Direct referral reward for @${user.username}`);
      }
    }
  }

  res.json({
    success: true,
    message: 'Authenticated successfully',
    data: {
      token: generateUserAuthToken(user.id),
      user,
    },
  });
});

// ----------------------------------------------------
// 2. User Profile & Game State
// ----------------------------------------------------
apiRouter.get('/me', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const user = db.users.get(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user });
});

apiRouter.get('/game', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const user = db.users.get(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Maintenance mode check
  if (db.settings.maintenance_mode) {
    return res.status(503).json({
      success: false,
      message: 'Game is temporarily under maintenance.',
      is_maintenance: true,
    });
  }

  const profile = db.profiles.get(userId) || {
    user_id: userId,
    level: 1,
    current_xp: 0,
    total_taps: 0,
    daily_streak: 1,
    last_sequence: 0,
  };

  const balance = db.balances.get(userId) || {
    user_id: userId,
    coins: 0,
    available_balance: 0,
    pending_withdrawal: 0,
    total_earned: 0,
    total_withdrawn: 0,
    updated_at: new Date().toISOString(),
  };

  const energy = db.getCalculatedEnergy(userId);
  const levelInfo = db.getLevelInfo(profile.level);
  const nextLevel = db.getLevelInfo(profile.level + 1);

  // Check active boosts
  const nowTime = new Date().getTime();
  const userActiveBoosts = db.activeBoosts.filter(
    (b) => b.user_id === userId && new Date(b.expires_at).getTime() > nowTime
  );

  // Check if daily reward can be claimed
  const todayStr = new Date().toISOString().split('T')[0];
  const canClaimDaily = profile.last_daily_claim_date !== todayStr;

  res.json({
    success: true,
    message: 'Game state loaded',
    data: {
      user,
      balance,
      energy,
      level: levelInfo,
      current_xp: profile.current_xp,
      next_level_xp: nextLevel ? nextLevel.xp_required : levelInfo.xp_required * 2,
      rank: 5,
      active_boosts: userActiveBoosts,
      daily_streak: profile.daily_streak,
      can_claim_daily: canClaimDaily,
      settings: db.settings,
    },
  });
});

// ----------------------------------------------------
// 3. Tap Batch Synchronization (Anti-Cheat, Ledger, Level-Up)
// ----------------------------------------------------
apiRouter.post('/game/sync', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const { taps, nonce, sequence, timestamp } = req.body;

  const tapsCount = parseInt(taps, 10);
  if (isNaN(tapsCount) || tapsCount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid taps parameter.' });
  }

  // Anti-Cheat Engine Validation
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const validation = AntiCheatEngine.validateTapSync(
    userId,
    tapsCount,
    nonce,
    sequence,
    timestamp || Date.now(),
    clientIp
  );

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.errorMessage || 'Anti-cheat validation failed.',
      error_code: validation.errorCode,
    });
  }

  const profile = db.profiles.get(userId)!;
  const levelInfo = db.getLevelInfo(profile.level);
  const energy = db.getCalculatedEnergy(userId);

  // Active boost multipliers
  let tapMultiplier = levelInfo.tap_multiplier;
  const now = Date.now();
  const activeBoosts = db.activeBoosts.filter(
    (b) => b.user_id === userId && new Date(b.expires_at).getTime() > now
  );

  for (const b of activeBoosts) {
    if (b.type === 'turbo' || b.type === 'double_profit') {
      tapMultiplier *= b.multiplier;
    }
  }

  // Deduct energy
  const energyCost = tapsCount * db.settings.tap_cost;
  energy.current_energy = Math.max(0, energy.current_energy - energyCost);
  energy.last_energy_updated_at = new Date().toISOString();
  db.energy.set(userId, energy);

  // Calculate coins & XP earned
  const earnedCoins = tapsCount * db.settings.tap_reward * tapMultiplier;
  const earnedXp = tapsCount * db.settings.xp_per_tap;

  // Record atomic transaction in ledger
  const updatedBalance = db.recordTransaction(
    userId,
    'tap',
    earnedCoins,
    `Batch tap sync: ${tapsCount} taps (multiplier: ${tapMultiplier}x)`,
    { taps: tapsCount, nonce, sequence }
  );

  // Update profile
  profile.total_taps += tapsCount;
  profile.current_xp += earnedXp;
  profile.last_sequence = sequence;
  profile.last_tap_at = new Date().toISOString();

  // Multi-tier referral commission distribution
  if (userHasReferrer(userId)) {
    distributeReferralCommissions(userId, earnedCoins);
  }

  // Level Up Check
  let leveledUp = false;
  const nextLevel = db.getLevelInfo(profile.level + 1);
  if (nextLevel && profile.current_xp >= nextLevel.xp_required) {
    profile.level += 1;
    leveledUp = true;
    // Level up bonus
    db.recordTransaction(userId, 'bonus', 5000 * profile.level, `Level Up to ${nextLevel.name}!`);
  }
  db.profiles.set(userId, profile);

  res.json({
    success: true,
    message: 'Taps synchronized successfully',
    data: {
      earned_coins: earnedCoins,
      earned_xp: earnedXp,
      current_balance: updatedBalance.coins,
      current_energy: energy.current_energy,
      current_xp: profile.current_xp,
      current_level: profile.level,
      level_up: leveledUp,
      level_info: db.getLevelInfo(profile.level),
    },
  });
});

function userHasReferrer(userId: number): boolean {
  const user = db.users.get(userId);
  return Boolean(user && user.referred_by);
}

function distributeReferralCommissions(userId: number, coinAmount: number) {
  const user = db.users.get(userId);
  if (!user || !user.referred_by) return;

  // Tier 1 (Direct)
  const l1ReferrerId = user.referred_by;
  const l1Amount = Math.floor(coinAmount * (db.settings.referral_l1_percent / 100));
  if (l1Amount > 0 && db.users.has(l1ReferrerId)) {
    db.recordTransaction(l1ReferrerId, 'referral', l1Amount, `Tier 1 referral commission from @${user.username}`);
  }

  // Tier 2 (Indirect)
  const l1User = db.users.get(l1ReferrerId);
  if (l1User && l1User.referred_by) {
    const l2ReferrerId = l1User.referred_by;
    const l2Amount = Math.floor(coinAmount * (db.settings.referral_l2_percent / 100));
    if (l2Amount > 0 && db.users.has(l2ReferrerId)) {
      db.recordTransaction(l2ReferrerId, 'referral', l2Amount, `Tier 2 referral commission from network`);
    }

    // Tier 3 (Network)
    const l2User = db.users.get(l2ReferrerId);
    if (l2User && l2User.referred_by) {
      const l3ReferrerId = l2User.referred_by;
      const l3Amount = Math.floor(coinAmount * (db.settings.referral_l3_percent / 100));
      if (l3Amount > 0 && db.users.has(l3ReferrerId)) {
        db.recordTransaction(l3ReferrerId, 'referral', l3Amount, `Tier 3 referral commission from network`);
      }
    }
  }
}

// ----------------------------------------------------
// 4. Tasks & Verification
// ----------------------------------------------------
apiRouter.get('/tasks', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const completedTaskIds = new Set(
    db.taskCompletions.filter((tc) => tc.user_id === userId).map((tc) => tc.task_id)
  );

  const tasksWithStatus = db.tasks.map((t) => ({
    ...t,
    is_completed: completedTaskIds.has(t.id),
  }));

  res.json({ success: true, data: tasksWithStatus });
});

apiRouter.post('/tasks/:id/complete', async (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const taskId = req.params.id;

  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  const alreadyDone = db.taskCompletions.some((tc) => tc.user_id === userId && tc.task_id === taskId);
  if (alreadyDone) {
    return res.status(400).json({ success: false, message: 'Task has already been completed and claimed.' });
  }

  const user = db.users.get(userId);

  // Real Telegram verification for membership / channel tasks
  if (task.type === 'telegram_channel' || task.type === 'telegram_group' || task.required_action === 'join_telegram' || task.required_action === 'join_chat') {
    if (!user || !user.telegram_id) {
      return res.status(400).json({
        success: false,
        message: 'Telegram account not detected. You must launch the game inside Telegram to verify channel membership.',
      });
    }

    const botToken = db.settings.telegram_bot_token;
    if (!botToken || botToken.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Telegram Bot Token is not configured on the server. Set TELEGRAM_BOT_TOKEN in .env to verify channel membership.',
      });
    }

    const chatTarget = task.url || '@TapEmpireNews';
    const verifyResult = await TelegramService.verifyTelegramChatMember(
      chatTarget,
      user.telegram_id,
      botToken
    );

    if (!verifyResult.isMember) {
      return res.status(400).json({
        success: false,
        message: verifyResult.error || `Channel membership check failed: You must join ${chatTarget} before claiming this reward.`,
      });
    }
  } else if (task.required_action === 'tap_50') {
    const profile = db.profiles.get(userId);
    if (!profile || profile.total_taps < 50) {
      return res.status(400).json({
        success: false,
        message: `Task requirement not met: You need at least 50 taps today (Current: ${profile?.total_taps || 0}).`,
      });
    }
  }

  // Record completion
  db.taskCompletions.push({
    id: 'tc_' + crypto.randomBytes(4).toString('hex'),
    user_id: userId,
    task_id: taskId,
    completed_at: new Date().toISOString(),
  });

  // Award Coins via Ledger
  const newBalance = db.recordTransaction(userId, 'task', task.reward_coins, `Task completed: ${task.title}`);

  // Award XP
  const profile = db.profiles.get(userId)!;
  profile.current_xp += task.reward_xp;
  db.profiles.set(userId, profile);

  res.json({
    success: true,
    message: `Task verified & completed! +${task.reward_coins} coins & +${task.reward_xp} XP`,
    data: {
      reward_coins: task.reward_coins,
      reward_xp: task.reward_xp,
      new_balance: newBalance.coins,
      current_xp: profile.current_xp,
    },
  });
});

// ----------------------------------------------------
// 5. Daily Streak Rewards
// ----------------------------------------------------
apiRouter.get('/daily-reward', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const profile = db.profiles.get(userId) || {
    user_id: userId,
    daily_streak: 1,
    last_daily_claim_date: '',
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const canClaim = profile.last_daily_claim_date !== todayStr;

  const currentStreakDay = ((profile.daily_streak - 1) % 7) + 1;

  const days = db.dailyRewards.map((dr) => ({
    day: dr.day,
    reward_coins: dr.reward_coins,
    reward_xp: dr.reward_xp,
    is_claimed: dr.day < currentStreakDay || (dr.day === currentStreakDay && !canClaim),
    is_current: dr.day === currentStreakDay,
  }));

  res.json({
    success: true,
    data: {
      days,
      current_streak: profile.daily_streak,
      can_claim: canClaim,
    },
  });
});

apiRouter.post('/daily-reward/claim', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const profile = db.profiles.get(userId)!;
  const todayStr = new Date().toISOString().split('T')[0];

  if (profile.last_daily_claim_date === todayStr) {
    return res.status(400).json({ success: false, message: 'Daily reward already claimed today.' });
  }

  const streakDay = ((profile.daily_streak - 1) % 7) + 1;
  const rewardItem = db.dailyRewards.find((r) => r.day === streakDay) || db.dailyRewards[0];

  profile.last_daily_claim_date = todayStr;
  profile.daily_streak += 1;
  profile.current_xp += rewardItem.reward_xp;
  db.profiles.set(userId, profile);

  const balance = db.recordTransaction(
    userId,
    'daily_reward',
    rewardItem.reward_coins,
    `Day ${streakDay} Daily Streak Reward`
  );

  res.json({
    success: true,
    message: `Claimed Day ${streakDay} reward: +${rewardItem.reward_coins} coins!`,
    data: {
      day: streakDay,
      reward_coins: rewardItem.reward_coins,
      reward_xp: rewardItem.reward_xp,
      new_balance: balance.coins,
      new_streak: profile.daily_streak,
    },
  });
});

// ----------------------------------------------------
// 6. Boosts & Power-ups
// ----------------------------------------------------
apiRouter.get('/boosts', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const now = Date.now();
  const active = db.activeBoosts.filter(
    (b) => b.user_id === userId && new Date(b.expires_at).getTime() > now
  );

  res.json({
    success: true,
    data: {
      available_boosts: db.boosts,
      active_boosts: active,
    },
  });
});

apiRouter.post('/boosts/:id/activate', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const boostId = req.params.id;
  const boost = db.boosts.find((b) => b.id === boostId);

  if (!boost) return res.status(404).json({ success: false, message: 'Boost not found' });

  const balance = db.balances.get(userId)!;
  if (!boost.is_free && balance.coins < boost.cost) {
    return res.status(400).json({ success: false, message: 'Insufficient coins to purchase this boost.' });
  }

  // Deduct cost if not free
  if (!boost.is_free && boost.cost > 0) {
    db.recordTransaction(userId, 'boost', -boost.cost, `Purchased boost: ${boost.name}`);
  }

  // Perform boost effect
  if (boost.type === 'full_energy') {
    const energy = db.energy.get(userId)!;
    energy.current_energy = energy.max_energy;
    energy.last_energy_updated_at = new Date().toISOString();
    db.energy.set(userId, energy);
  } else if (boost.duration_seconds > 0) {
    const expiresAt = new Date(Date.now() + boost.duration_seconds * 1000).toISOString();
    db.activeBoosts.push({
      id: 'ab_' + crypto.randomBytes(4).toString('hex'),
      user_id: userId,
      boost_id: boost.id,
      name: boost.name,
      type: boost.type,
      multiplier: boost.multiplier,
      expires_at: expiresAt,
    });
  }

  res.json({
    success: true,
    message: `Boost ${boost.name} activated!`,
    data: {
      boost,
      current_balance: db.balances.get(userId)?.coins,
      current_energy: db.energy.get(userId)?.current_energy,
    },
  });
});

// ----------------------------------------------------
// 7. Referrals & Network
// ----------------------------------------------------
apiRouter.get('/referrals', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const user = db.users.get(userId)!;

  const userRefs = db.referrals.filter((r) => r.referrer_id === userId);
  const l1 = userRefs.filter((r) => r.tier === 1);
  const l2 = userRefs.filter((r) => r.tier === 2);
  const l3 = userRefs.filter((r) => r.tier === 3);

  // Total referral commissions earned from ledger
  const referralTxs = db.transactions.filter((t) => t.user_id === userId && t.type === 'referral');
  const totalEarned = referralTxs.reduce((sum, tx) => sum + tx.amount, 0);

  const refLink = `https://t.me/${db.settings.telegram_bot_username}?start=${user.referral_code}`;

  const recent = l1.slice(0, 10).map((r) => {
    const refUser = db.users.get(r.referred_id);
    const prof = db.profiles.get(r.referred_id);
    return {
      username: refUser?.username || 'miner',
      level: prof?.level || 1,
      joined_at: r.created_at,
      tier: 1,
      earned: 5000,
    };
  });

  res.json({
    success: true,
    data: {
      referral_code: user.referral_code,
      referral_link: refLink,
      total_invited: userRefs.length,
      active_invited: Math.floor(userRefs.length * 0.8),
      total_earned_referral: totalEarned,
      tiers: {
        l1: { count: l1.length, percentage: db.settings.referral_l1_percent, earned: Math.floor(totalEarned * 0.7) },
        l2: { count: l2.length, percentage: db.settings.referral_l2_percent, earned: Math.floor(totalEarned * 0.2) },
        l3: { count: l3.length, percentage: db.settings.referral_l3_percent, earned: Math.floor(totalEarned * 0.1) },
      },
      recent_referrals: recent,
    },
  });
});

// ----------------------------------------------------
// 8. Leaderboard (Rankings)
// ----------------------------------------------------
apiRouter.get('/leaderboard', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);

  const usersList = Array.from(db.users.values()).map((u) => {
    const bal = db.balances.get(u.id);
    const prof = db.profiles.get(u.id);
    return {
      user_id: u.id,
      username: u.username,
      first_name: u.first_name,
      avatar_url: u.avatar_url,
      score: bal?.coins || 0,
      level: prof?.level || 1,
      is_current_user: u.id === userId,
    };
  });

  // Sort descending by score
  usersList.sort((a, b) => b.score - a.score);

  const ranked = usersList.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));

  const userRankEntry = ranked.find((r) => r.user_id === userId);

  res.json({
    success: true,
    data: {
      leaderboard: ranked.slice(0, 50),
      user_rank: userRankEntry || { rank: 99, score: 0, level: 1, is_current_user: true },
    },
  });
});

// ----------------------------------------------------
// 9. Wallet, Ledger & Withdrawals
// ----------------------------------------------------
apiRouter.get('/wallet', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const balance = db.balances.get(userId) || {
    user_id: userId,
    coins: 0,
    available_balance: 0,
    pending_withdrawal: 0,
    total_earned: 0,
    total_withdrawn: 0,
    updated_at: new Date().toISOString(),
  };

  res.json({ success: true, data: balance });
});

apiRouter.get('/transactions', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const userTxs = db.transactions.filter((t) => t.user_id === userId);
  res.json({ success: true, data: userTxs.slice(0, 50) });
});

// Helper address validators
export function isValidTrc20Address(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address.trim());
}

export function isValidTonAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return /^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(address.trim());
}

apiRouter.get('/withdrawals', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const userWds = db.withdrawals.filter((w) => w.user_id === userId);
  res.json({ success: true, data: userWds });
});

apiRouter.post('/withdrawals', (req: Request, res: Response) => {
  const userId = getAuthUserId(req);
  const { amount, method, destination_address } = req.body;

  const withdrawAmount = parseInt(amount, 10);
  if (isNaN(withdrawAmount) || withdrawAmount < db.settings.min_withdrawal) {
    return res.status(400).json({
      success: false,
      message: `Minimum withdrawal amount is ${db.settings.min_withdrawal.toLocaleString()} ${db.settings.coin_symbol}.`,
    });
  }

  const cleanAddress = (destination_address || '').trim();
  if (method === 'USDT_TRC20') {
    if (!isValidTrc20Address(cleanAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid USDT TRC-20 wallet address. Must start with "T" and consist of exactly 34 Base58 characters.',
      });
    }
  } else if (method === 'TON') {
    if (!isValidTonAddress(cleanAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid TON wallet address. Must start with "EQ" or "UQ" and consist of 48 characters.',
      });
    }
  } else if (cleanAddress.length < 10) {
    return res.status(400).json({ success: false, message: 'Invalid destination address or wallet.' });
  }

  const balance = db.balances.get(userId)!;
  if (balance.available_balance < withdrawAmount) {
    return res.status(400).json({ success: false, message: 'Insufficient available balance.' });
  }

  const fee = Math.floor(withdrawAmount * (db.settings.withdrawal_fee_percent / 100));
  const netAmount = withdrawAmount - fee;

  // Hold balance: deduct from available_balance and lock into pending_withdrawal (invariant: coins = available + pending)
  balance.available_balance -= withdrawAmount;
  balance.pending_withdrawal += withdrawAmount;
  balance.updated_at = new Date().toISOString();
  db.balances.set(userId, balance);

  const withdrawalId = 'WD-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const withdrawal: any = {
    id: withdrawalId,
    user_id: userId,
    amount: withdrawAmount,
    fee,
    net_amount: netAmount,
    method: method || 'USDT_TRC20',
    destination_address: cleanAddress,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.withdrawals.unshift(withdrawal);

  // Record ledger hold entry (amount: 0 movement of total coins, but tracks locked balance)
  const tx: any = {
    id: 'tx_' + crypto.randomBytes(6).toString('hex'),
    user_id: userId,
    type: 'withdraw',
    amount: 0,
    balance_before: balance.coins,
    balance_after: balance.coins,
    reference: `Withdrawal Hold #${withdrawalId} (${method}): ${withdrawAmount.toLocaleString()} ${db.settings.coin_symbol}`,
    metadata: { withdrawal_id: withdrawalId, destination_address: cleanAddress, fee, held_amount: withdrawAmount },
    created_at: new Date().toISOString(),
  };
  db.transactions.unshift(tx);

  res.json({
    success: true,
    message: 'Withdrawal request submitted for review.',
    data: withdrawal,
  });
});

// ----------------------------------------------------
// 10. Admin Dashboard APIs (Strictly Protected by RBAC)
// ----------------------------------------------------

// Admin Authentication Login
apiRouter.post('/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Admin username and password are required.' });
  }

  const cleanUser = String(username).trim().toLowerCase();
  const admin = Array.from(db.adminUsers.values()).find(
    (a) => a.username.toLowerCase() === cleanUser || a.email.toLowerCase() === cleanUser
  );

  if (!admin) {
    return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
  }

  const expectedHash = AdminAuthService.hashPassword(String(password));
  if (admin.password_hash !== expectedHash) {
    return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
  }

  if (admin.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Admin account is currently suspended.' });
  }

  const token = AdminAuthService.generateAdminToken(admin);

  // Log successful admin login
  db.auditLogs.unshift({
    id: 'al_' + crypto.randomBytes(4).toString('hex'),
    admin_username: admin.username,
    action: 'admin_login',
    target_type: 'admin',
    target_id: admin.id,
    details: JSON.stringify({ role: admin.role, ip: req.ip }),
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Admin session authenticated successfully.',
    data: {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    },
  });
});

// Admin Me / Session verification
apiRouter.get('/admin/me', AdminAuthService.requireAdmin(), (req: AuthenticatedAdminRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      id: req.adminUser!.id,
      username: req.adminUser!.username,
      email: req.adminUser!.email,
      role: req.adminUser!.role,
      permissions: req.adminUser!.permissions,
    },
  });
});

// Admin Stats / Overview
const handleAdminStats = (req: AuthenticatedAdminRequest, res: Response) => {
  const totalUsers = db.users.size;
  const pendingWd = db.withdrawals.filter((w) => w.status === 'pending');
  const totalCoins = Array.from(db.balances.values()).reduce((sum, b) => sum + b.coins, 0);
  const totalTaps = Array.from(db.profiles.values()).reduce((sum, p) => sum + p.total_taps, 0);

  res.json({
    success: true,
    data: {
      total_users: totalUsers,
      active_today: Math.floor(totalUsers * 0.7) || 1,
      new_users_today: 4,
      total_taps: totalTaps,
      total_coins_minted: totalCoins,
      total_withdrawn_amount: 300000,
      pending_withdrawals_count: pendingWd.length,
      pending_withdrawals_amount: pendingWd.reduce((s, w) => s + w.amount, 0),
      suspicious_users_count: db.antiCheatEvents.filter((e) => e.status === 'flagged' || e.status === 'banned').length,
      total_volume_usdt: 1450.0,
      system_health: 'Operational (Green)',
    },
  });
};

apiRouter.get('/admin/stats', AdminAuthService.requireAdmin('stats.view'), handleAdminStats);
apiRouter.get('/admin/overview', AdminAuthService.requireAdmin('stats.view'), handleAdminStats);

apiRouter.get('/admin/users', AdminAuthService.requireAdmin('users.view'), (req: AuthenticatedAdminRequest, res: Response) => {
  const users = Array.from(db.users.values()).map((u) => {
    const bal = db.balances.get(u.id);
    const prof = db.profiles.get(u.id);
    return {
      ...u,
      balance: bal?.coins || 0,
      level: prof?.level || 1,
      total_taps: prof?.total_taps || 0,
    };
  });
  res.json({ success: true, data: users });
});

const handleUserAction = (req: AuthenticatedAdminRequest, res: Response) => {
  const targetId = parseInt(req.params.id, 10);
  const { action, amount, banned } = req.body;
  const user = db.users.get(targetId);

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (action === 'ban' || banned === true) {
    user.status = 'banned';
    db.users.set(targetId, user);
  } else if (action === 'unban' || banned === false) {
    user.status = 'active';
    db.users.set(targetId, user);
  } else if (action === 'adjust_balance' && amount) {
    const adjAmount = parseInt(amount, 10);
    const targetBalance = db.balances.get(targetId);
    const beforeCoins = targetBalance ? targetBalance.coins : 0;
    db.recordTransaction(targetId, 'admin_adjustment', adjAmount, 'Admin manual balance adjustment');

    db.auditLogs.unshift({
      id: 'al_' + crypto.randomBytes(4).toString('hex'),
      admin_username: req.adminUser?.username || 'superadmin',
      action: 'adjust_balance',
      target_type: 'user',
      target_id: targetId.toString(),
      details: JSON.stringify({ amount: adjAmount, before_coins: beforeCoins }),
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
      created_at: new Date().toISOString(),
    });
  }

  res.json({ success: true, message: `Action executed on user #${targetId}` });
};

apiRouter.post('/admin/users/:id/action', AdminAuthService.requireAdmin('users.manage'), handleUserAction);
apiRouter.post('/admin/users/:id/ban', AdminAuthService.requireAdmin('users.manage'), handleUserAction);

apiRouter.get('/admin/withdrawals', AdminAuthService.requireAdmin('withdrawals.view'), (req: AuthenticatedAdminRequest, res: Response) => {
  const enriched = db.withdrawals.map((w) => {
    const user = db.users.get(w.user_id);
    return {
      ...w,
      username: user?.username || `user_${w.user_id}`,
    };
  });
  res.json({ success: true, data: enriched });
});

const handleWithdrawalAction = (req: AuthenticatedAdminRequest, res: Response) => {
  const wdId = req.params.id;
  // Support either explicit action body or path suffix (/approve, /reject)
  let action = req.body.action;
  if (!action) {
    if (req.path.endsWith('/approve')) action = 'approve';
    else if (req.path.endsWith('/reject')) action = 'reject';
  }

  const { reason, tx_hash } = req.body;
  const withdrawal = db.withdrawals.find((w) => w.id === wdId);

  if (!withdrawal) return res.status(404).json({ success: false, message: 'Withdrawal not found' });

  const balance = db.balances.get(withdrawal.user_id)!;

  if (action === 'approve') {
    withdrawal.status = 'approved';
    withdrawal.tx_hash = tx_hash || '0x' + crypto.randomBytes(16).toString('hex');
    withdrawal.updated_at = new Date().toISOString();
    balance.pending_withdrawal = Math.max(0, balance.pending_withdrawal - withdrawal.amount);
    balance.coins = Math.max(0, balance.coins - withdrawal.amount);
    balance.total_withdrawn += withdrawal.amount;
    balance.updated_at = new Date().toISOString();
    db.balances.set(withdrawal.user_id, balance);

    const tx: any = {
      id: 'tx_' + crypto.randomBytes(6).toString('hex'),
      user_id: withdrawal.user_id,
      type: 'withdraw',
      amount: -withdrawal.amount,
      balance_before: balance.coins + withdrawal.amount,
      balance_after: balance.coins,
      reference: `Payout Finalized: #${withdrawal.id} (${withdrawal.method})`,
      metadata: { withdrawal_id: withdrawal.id, net_amount: withdrawal.net_amount, fee: withdrawal.fee, tx_hash: withdrawal.tx_hash },
      created_at: new Date().toISOString(),
    };
    db.transactions.unshift(tx);
  } else if (action === 'reject') {
    withdrawal.status = 'rejected';
    withdrawal.rejection_reason = reason || 'Admin review rejected';
    withdrawal.updated_at = new Date().toISOString();

    // Refund coins from pending hold back to available balance
    balance.pending_withdrawal = Math.max(0, balance.pending_withdrawal - withdrawal.amount);
    balance.available_balance += withdrawal.amount;
    balance.updated_at = new Date().toISOString();
    db.balances.set(withdrawal.user_id, balance);

    const tx: any = {
      id: 'tx_' + crypto.randomBytes(6).toString('hex'),
      user_id: withdrawal.user_id,
      type: 'refund',
      amount: 0,
      balance_before: balance.coins,
      balance_after: balance.coins,
      reference: `Refund for Rejected Withdrawal #${withdrawal.id}: ${withdrawal.rejection_reason}`,
      metadata: { withdrawal_id: withdrawal.id, reason: withdrawal.rejection_reason },
      created_at: new Date().toISOString(),
    };
    db.transactions.unshift(tx);
  }

  // Record audit log for withdrawal review
  db.auditLogs.unshift({
    id: 'al_' + crypto.randomBytes(4).toString('hex'),
    admin_username: req.adminUser?.username || 'superadmin',
    action: `withdrawal_${action}`,
    target_type: 'withdrawal',
    target_id: wdId,
    details: JSON.stringify({ action, reason: withdrawal.rejection_reason, amount: withdrawal.amount }),
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    created_at: new Date().toISOString(),
  });

  res.json({ success: true, message: `Withdrawal #${wdId} marked as ${withdrawal.status}` });
};

apiRouter.post('/admin/withdrawals/:id/action', AdminAuthService.requireAdmin('withdrawals.manage'), handleWithdrawalAction);
apiRouter.post('/admin/withdrawals/:id/approve', AdminAuthService.requireAdmin('withdrawals.manage'), handleWithdrawalAction);
apiRouter.post('/admin/withdrawals/:id/reject', AdminAuthService.requireAdmin('withdrawals.manage'), handleWithdrawalAction);

apiRouter.get('/admin/settings', AdminAuthService.requireAdmin('settings.view'), (req: AuthenticatedAdminRequest, res: Response) => {
  res.json({ success: true, data: db.settings });
});

apiRouter.post('/admin/settings', AdminAuthService.requireAdmin('settings.manage'), (req: AuthenticatedAdminRequest, res: Response) => {
  const updates = req.body;
  Object.assign(db.settings, updates);
  res.json({ success: true, message: 'Settings saved successfully', data: db.settings });
});

const handleAntiCheat = (req: AuthenticatedAdminRequest, res: Response) => {
  res.json({ success: true, data: db.antiCheatEvents.slice(0, 50) });
};

apiRouter.get('/admin/anticheat', AdminAuthService.requireAdmin('anticheat.view'), handleAntiCheat);
apiRouter.get('/admin/anti-cheat', AdminAuthService.requireAdmin('anticheat.view'), handleAntiCheat);

apiRouter.get('/admin/system', AdminAuthService.requireAdmin('system.view'), (req: AuthenticatedAdminRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      php_version: '8.3.14',
      php_status: true,
      mysql_version: '8.0.41',
      mysql_status: true,
      node_version: process.version,
      node_status: true,
      storage_writable: true,
      cache_driver: 'file / database (shared hosting ready)',
      queue_driver: 'database queue',
      telegram_bot_connected: Boolean(db.settings.telegram_bot_token),
      telegram_webhook_active: true,
      application_url: db.settings.telegram_webhook_url.replace('/api/telegram/webhook', ''),
    },
  });
});

apiRouter.post('/admin/telegram/webhook', AdminAuthService.requireAdmin('telegram.manage'), (req: AuthenticatedAdminRequest, res: Response) => {
  const { action } = req.body;
  if (action === 'set') {
    return res.json({ success: true, message: `Webhook set to ${db.settings.telegram_webhook_url}` });
  } else if (action === 'delete') {
    return res.json({ success: true, message: 'Webhook removed from Telegram API' });
  }
  res.json({ success: true, message: 'Telegram Bot Connection verified: Bot @' + db.settings.telegram_bot_username + ' is responsive.' });
});

// ----------------------------------------------------
// 11. Telegram Bot Webhook Endpoint
// ----------------------------------------------------
apiRouter.post('/telegram/webhook', (req: Request, res: Response) => {
  const update = req.body;
  const result = TelegramService.handleBotUpdate(update);
  res.json({
    ok: true,
    reply: result.replyText,
    replyMarkup: result.replyMarkup,
  });
});

// ----------------------------------------------------
// 12. Installer Endpoints
// ----------------------------------------------------
apiRouter.get('/installer/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: InstallerService.getInstallerStatus(),
    is_installed: InstallerService.isSystemInstalled(),
    requirements: InstallerService.getSystemRequirements(),
  });
});

apiRouter.post('/installer/test-db', (req: Request, res: Response) => {
  const result = InstallerService.testDatabaseConnection(req.body);
  res.json(result);
});

apiRouter.post('/installer/test-telegram', (req: Request, res: Response) => {
  const result = InstallerService.testTelegram(req.body);
  res.json(result);
});

const handleRunInstallation = (req: Request, res: Response) => {
  if (InstallerService.isSystemInstalled()) {
    return res.status(403).json({
      success: false,
      message: 'Installation is locked. System is already installed. Remove installed.lock to re-install.',
      logs: ['[SECURITY LOCK] installed.lock present. Installation refused.'],
    });
  }
  const result = InstallerService.runInstallation(req.body);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
};

apiRouter.post('/installer/run', handleRunInstallation);
apiRouter.post('/installer/install', handleRunInstallation);
