import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from './db';
import { AntiCheatEngine } from './antiCheat';
import { TelegramService } from './telegram';
import { AdminAuthService, AuthenticatedAdminRequest, getUserAuthSecret } from './adminAuth';
import { InstallerService } from './installer';

export const apiRouter = Router();

/**
 * Robust User Authentication extraction and verification
 * Returns authenticated user ID or null if unauthenticated
 */
export async function getAuthUserId(req: Request): Promise<number | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '').trim();

  // Reject admin tokens or malformed tokens
  if (!token.startsWith('auth_')) {
    return null;
  }

  const parts = token.split('_');
  if (parts.length !== 4) {
    return null;
  }

  const userId = parseInt(parts[1], 10);
  const expiresAt = parseInt(parts[2], 10);
  const signature = parts[3];

  if (isNaN(userId) || isNaN(expiresAt) || Date.now() > expiresAt) {
    return null;
  }

  const expectedSig = crypto
    .createHmac('sha256', getUserAuthSecret())
    .update(`${userId}_${expiresAt}`)
    .digest('hex')
    .substring(0, 16);

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
  } catch {
    return null;
  }

  const user = await db.getUserById(userId);
  if (!user || user.status === 'banned') {
    return null;
  }

  return userId;
}

export function generateUserAuthToken(userId: number): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const sig = crypto
    .createHmac('sha256', getUserAuthSecret())
    .update(`${userId}_${expiresAt}`)
    .digest('hex')
    .substring(0, 16);
  return `auth_${userId}_${expiresAt}_${sig}`;
}

// ----------------------------------------------------
// 1. Telegram WebApp Authentication
// ----------------------------------------------------
apiRouter.post('/auth/telegram', async (req: Request, res: Response) => {
  const { initData } = req.body;

  if (!initData || typeof initData !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'MISSING_INIT_DATA',
      message: 'Telegram initData string is strictly required for authentication.',
    });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN || db.settings.telegram_bot_token;
  if (!botToken) {
    return res.status(500).json({
      success: false,
      error: 'BOT_TOKEN_UNCONFIGURED',
      message: 'Telegram Bot Token is not configured on the server. Please configure TELEGRAM_BOT_TOKEN.',
    });
  }

  const verification = TelegramService.verifyInitData(initData, botToken);
  if (!verification.isValid || !verification.user) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TELEGRAM_DATA',
      message: 'Telegram authentication failed: invalid, forged, or expired initData hash.',
    });
  }

  const tgUser = verification.user;

  try {
    let user = await db.getUserByTelegramId(tgUser.id);

    if (!user) {
      let referrerId: number | null = null;
      if (verification.startParam) {
        const referrer = await db.getUserByReferralCode(verification.startParam);
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      user = await db.createUser({
        telegram_id: tgUser.id,
        username: tgUser.username || `tg_${tgUser.id}`,
        first_name: tgUser.first_name || 'Miner',
        last_name: tgUser.last_name || null,
        avatar_url: tgUser.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${tgUser.username || tgUser.id}`,
        language_code: tgUser.language_code || 'en',
        referral_code: `REF_${tgUser.id}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        referred_by: referrerId,
        is_premium: Boolean(tgUser.is_premium),
      });

      if (referrerId) {
        await db.recordTransaction(
          referrerId,
          'referral',
          5000,
          `Direct referral bonus for recruiting @${user.username}`
        );
      }
    } else {
      // Update profile info
      await db.updateUser(user.id, {
        username: tgUser.username || user.username,
        first_name: tgUser.first_name || user.first_name,
        last_name: tgUser.last_name || user.last_name,
        avatar_url: tgUser.photo_url || user.avatar_url,
      });
      user = (await db.getUserById(user.id))!;
    }

    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_BANNED',
        message: 'Your account has been banned due to anti-cheat policy violations.',
      });
    }

    const token = generateUserAuthToken(user.id);
    const balance = await db.getBalance(user.id);
    const profile = await db.getProfile(user.id);

    return res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        token,
        user,
        balance,
        profile,
      },
    });
  } catch (err: any) {
    console.error('Telegram Auth Error:', err);
    return res.status(500).json({
      success: false,
      error: 'AUTH_FAILED',
      message: err.message || 'Authentication processing error.',
    });
  }
});

// ----------------------------------------------------
// 2. Player Profile & Game State
// ----------------------------------------------------
apiRouter.get('/me', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Valid Telegram user authentication token required.',
    });
  }

  const user = await db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User record not found.' });
  }

  const balance = await db.getBalance(userId);
  const profile = await db.getProfile(userId);
  const energy = await db.getCalculatedEnergy(userId);

  return res.json({
    success: true,
    data: {
      user,
      balance,
      profile,
      energy,
    },
  });
});

apiRouter.get('/game', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Valid Telegram user authentication token required.',
    });
  }

  const user = await db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User record not found.' });
  }

  const balance = await db.getBalance(userId);
  const profile = await db.getProfile(userId);
  const energy = await db.getCalculatedEnergy(userId);
  const levelInfo = db.getLevelInfo(profile.level);
  const nextLevel = db.getLevelInfo(profile.level + 1);
  const boosts = await db.getBoosts(userId);

  const todayStr = new Date().toISOString().split('T')[0];
  const canClaimDaily = profile.last_daily_claim_date !== todayStr;

  return res.json({
    success: true,
    message: 'Game state loaded',
    data: {
      user,
      balance,
      energy,
      level: levelInfo,
      current_xp: profile.current_xp,
      next_level_xp: nextLevel ? nextLevel.xp_required : levelInfo.xp_required * 2,
      rank: 1,
      active_boosts: boosts.activeBoosts,
      daily_streak: profile.daily_streak,
      can_claim_daily: canClaimDaily,
      settings: db.settings,
    },
  });
});

// ----------------------------------------------------
// 3. Tap Batch Synchronization (Anti-Cheat, Ledger, Level-Up)
// ----------------------------------------------------
apiRouter.post('/game/sync', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please authenticate via Telegram.',
    });
  }

  const { taps, nonce, sequence, timestamp } = req.body;

  const tapsCount = parseInt(taps, 10);
  if (isNaN(tapsCount) || tapsCount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid taps parameter.' });
  }

  // Anti-Cheat Engine Validation
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const validation = await AntiCheatEngine.validateTapSync(
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

  try {
    const result = await db.syncTaps(userId, tapsCount, nonce, sequence);

    return res.json({
      success: true,
      message: 'Taps synchronized successfully',
      data: {
        earned_coins: result.earnedCoins,
        earned_xp: result.earnedXp,
        current_balance: result.currentBalance,
        current_energy: result.currentEnergy,
        current_xp: result.currentXp,
        current_level: result.currentLevel,
        level_up: result.leveledUp,
        level_info: result.levelInfo,
      },
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Sync failed.',
    });
  }
});

// ----------------------------------------------------
// 4. Tasks & Verification
// ----------------------------------------------------
apiRouter.get('/tasks', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  const tasksWithStatus = await db.getTasks(userId);
  return res.json({ success: true, data: tasksWithStatus });
});

apiRouter.post('/tasks/:id/complete', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  const taskId = req.params.id;
  const tasks = await db.getTasks(userId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' });
  }

  if (task.is_completed) {
    return res.status(400).json({ success: false, message: 'Task has already been completed and claimed.' });
  }

  const user = await db.getUserById(userId);

  // Real Telegram verification for membership / channel tasks
  if (
    task.type === 'telegram_channel' ||
    task.type === 'telegram_group' ||
    task.required_action === 'join_channel' ||
    task.required_action === 'join_group'
  ) {
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
    const verifyResult = await TelegramService.verifyTelegramChatMember(chatTarget, user.telegram_id, botToken);

    if (!verifyResult.isMember) {
      return res.status(400).json({
        success: false,
        message: verifyResult.error || `Channel membership check failed: You must join ${chatTarget} before claiming this reward.`,
      });
    }
  } else if (task.required_action === 'tap_50') {
    const profile = await db.getProfile(userId);
    if (!profile || profile.total_taps < 50) {
      return res.status(400).json({
        success: false,
        message: `Task requirement not met: You need at least 50 taps today (Current: ${profile?.total_taps || 0}).`,
      });
    }
  }

  try {
    const result = await db.completeTask(userId, taskId);
    return res.json({
      success: true,
      message: `Task verified & completed! +${result.rewardCoins} coins & +${result.rewardXp} XP`,
      data: {
        reward_coins: result.rewardCoins,
        reward_xp: result.rewardXp,
        new_balance: result.newBalance,
        current_xp: result.newXp,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 5. Daily Streak Rewards
// ----------------------------------------------------
apiRouter.get('/daily-reward', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  const profile = await db.getProfile(userId);
  const rewards = await db.getDailyRewards();

  const todayStr = new Date().toISOString().split('T')[0];
  const canClaim = profile.last_daily_claim_date !== todayStr;
  const currentStreakDay = ((profile.daily_streak - 1) % 7) + 1;

  return res.json({
    success: true,
    data: {
      streak: profile.daily_streak,
      current_day: currentStreakDay,
      can_claim: canClaim,
      rewards,
    },
  });
});

apiRouter.post('/daily-reward/claim', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  try {
    const result = await db.claimDailyReward(userId);
    return res.json({
      success: true,
      message: `Daily reward claimed! +${result.rewardCoins} coins and +${result.rewardXp} XP`,
      data: {
        reward_coins: result.rewardCoins,
        reward_xp: result.rewardXp,
        streak: result.streak,
        new_balance: result.newBalance,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 6. Boosts Engine
// ----------------------------------------------------
apiRouter.get('/boosts', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  const data = await db.getBoosts(userId);
  return res.json({
    success: true,
    data: {
      available_boosts: data.boosts,
      active_boosts: data.activeBoosts,
    },
  });
});

apiRouter.post('/boosts/activate', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  const { boost_id } = req.body;
  if (!boost_id) {
    return res.status(400).json({ success: false, message: 'Missing boost_id' });
  }

  try {
    const activated = await db.activateBoost(userId, boost_id);
    const balance = await db.getBalance(userId);
    const energy = await db.getCalculatedEnergy(userId);

    return res.json({
      success: true,
      message: 'Boost activated successfully!',
      data: {
        boost: activated,
        current_energy: energy.current_energy,
        current_balance: balance.coins,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 7. Multi-Tier Referral Network
// ----------------------------------------------------
apiRouter.get('/referrals', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  const stats = await db.getReferralStats(userId);
  const botUsername = db.settings.telegram_bot_username || 'TapEmpireBot';
  const referralLink = `https://t.me/${botUsername}?start=${stats.referralCode}`;

  return res.json({
    success: true,
    data: {
      referral_code: stats.referralCode,
      referral_link: referralLink,
      total_referrals: stats.totalReferrals,
      total_earned: stats.totalEarned,
      referrals: stats.referrals,
      rates: {
        tier_1: db.settings.referral_l1_percent,
        tier_2: db.settings.referral_l2_percent,
        tier_3: db.settings.referral_l3_percent,
      },
    },
  });
});

// ----------------------------------------------------
// 8. Global Leaderboard
// ----------------------------------------------------
apiRouter.get('/leaderboard', async (req: Request, res: Response) => {
  const leaderboard = await db.getLeaderboard(50);
  return res.json({ success: true, data: leaderboard });
});

// ----------------------------------------------------
// 9. Wallet & Withdrawals (Transactions & Integrity)
// ----------------------------------------------------
apiRouter.get('/wallet', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  const balance = await db.getBalance(userId);
  const methods = await db.getWithdrawalMethods();
  const withdrawals = await db.getWithdrawals(userId);

  return res.json({
    success: true,
    data: {
      balance,
      methods,
      withdrawals,
      min_withdrawal: db.settings.min_withdrawal,
      fee_percent: db.settings.withdrawal_fee_percent,
    },
  });
});

apiRouter.post('/wallet/withdraw', async (req: Request, res: Response) => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  const { method_id, amount, destination_address } = req.body;
  const numAmount = parseInt(amount, 10);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
  }

  if (!method_id || !destination_address) {
    return res.status(400).json({ success: false, message: 'Missing payment method or destination address.' });
  }

  try {
    const withdrawal = await db.createWithdrawal(userId, method_id, numAmount, destination_address);
    const balance = await db.getBalance(userId);

    return res.json({
      success: true,
      message: 'Withdrawal request created successfully and awaiting approval.',
      data: {
        withdrawal,
        balance,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 10. Telegram Bot Webhook
// ----------------------------------------------------
apiRouter.post('/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const reply = await TelegramService.handleBotUpdate(req.body);
    return res.json({ ok: true, ...reply });
  } catch (err: any) {
    return res.json({ ok: false, error: err.message });
  }
});

// ----------------------------------------------------
// 11. Production Installer Routes
// ----------------------------------------------------
apiRouter.get('/installer/status', (req: Request, res: Response) => {
  return res.json({ success: true, data: InstallerService.getInstallerStatus() });
});

apiRouter.get('/installer/requirements', (req: Request, res: Response) => {
  return res.json({ success: true, data: InstallerService.getSystemRequirements() });
});

apiRouter.post('/installer/test-db', async (req: Request, res: Response) => {
  const result = await InstallerService.testDatabaseConnection(req.body);
  return res.json(result);
});

apiRouter.post('/installer/test-telegram', (req: Request, res: Response) => {
  const result = InstallerService.testTelegram(req.body);
  return res.json(result);
});

apiRouter.post('/installer/install', async (req: Request, res: Response) => {
  const result = await InstallerService.runInstallation(req.body);
  return res.json(result);
});

// ----------------------------------------------------
// 12. Admin Management Endpoints
// ----------------------------------------------------
apiRouter.post('/admin/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const admin = await db.getAdminByUsername(username);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'Invalid admin username or password.' });
  }

  const isValidPassword = AdminAuthService.verifyPassword(password, admin.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ success: false, message: 'Invalid admin username or password.' });
  }

  if (admin.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Admin account has been suspended.' });
  }

  const token = AdminAuthService.generateAdminToken(admin);
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  await db.logAudit(admin.id, 'login', 'admin_user', String(admin.id), { username }, clientIp);

  return res.json({
    success: true,
    message: 'Admin authentication successful.',
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

apiRouter.get('/admin/stats', AdminAuthService.requireAdmin(), async (req: Request, res: Response) => {
  const stats = await db.getAdminStats();
  return res.json({ success: true, data: stats });
});

apiRouter.get('/admin/users', AdminAuthService.requireAdmin('users.view'), async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const users = await db.getUsersAdminList(limit, offset);
  return res.json({ success: true, data: users });
});

apiRouter.post('/admin/users/:id/action', AdminAuthService.requireAdmin('users.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const { action, status, coin_adjustment, reason } = req.body;

  const user = await db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  if (action === 'update_status' && status) {
    await db.updateUser(userId, { status });
    await db.logAudit(req.adminUser?.id || null, 'update_status', 'user', String(userId), { status, reason }, clientIp);
    return res.json({ success: true, message: `User status changed to ${status}.` });
  }

  if (action === 'adjust_coins' && coin_adjustment !== undefined) {
    const amount = parseInt(coin_adjustment, 10);
    if (isNaN(amount) || amount === 0) {
      return res.status(400).json({ success: false, message: 'Invalid coin adjustment amount.' });
    }

    await db.recordTransaction(
      userId,
      'admin_adjustment',
      amount,
      reason || `Administrative adjustment by @${req.adminUser?.username}`
    );

    await db.logAudit(req.adminUser?.id || null, 'adjust_coins', 'user', String(userId), { amount, reason }, clientIp);
    return res.json({ success: true, message: `Coin balance adjusted by ${amount > 0 ? '+' : ''}${amount}.` });
  }

  return res.status(400).json({ success: false, message: 'Unrecognized admin action.' });
});

apiRouter.get('/admin/withdrawals', AdminAuthService.requireAdmin('withdrawals.view'), async (req: Request, res: Response) => {
  const withdrawals = await db.getWithdrawals();
  return res.json({ success: true, data: withdrawals });
});

apiRouter.post('/admin/withdrawals/:id/action', AdminAuthService.requireAdmin('withdrawals.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const withdrawalId = req.params.id;
  const { action, reason, tx_hash } = req.body;

  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject".' });
  }

  try {
    await db.updateWithdrawalStatus(withdrawalId, action, req.adminUser!.id, reason, tx_hash);
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await db.logAudit(req.adminUser!.id, `withdrawal_${action}`, 'withdrawal', withdrawalId, { reason, tx_hash }, clientIp);

    return res.json({ success: true, message: `Withdrawal ${withdrawalId} ${action}d successfully.` });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

apiRouter.get('/admin/settings', AdminAuthService.requireAdmin('settings.view'), async (req: Request, res: Response) => {
  const settings = await db.refreshSettings();
  return res.json({ success: true, data: settings });
});

apiRouter.post('/admin/settings', AdminAuthService.requireAdmin('settings.manage'), async (req: AuthenticatedAdminRequest, res: Response) => {
  const updates = req.body;
  const pool = db.getPool();

  for (const [key, val] of Object.entries(updates)) {
    await pool.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      [key, String(val), String(val)]
    );
  }

  await db.refreshSettings();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  await db.logAudit(req.adminUser?.id || null, 'update_settings', 'settings', 'global', updates, clientIp);

  return res.json({ success: true, message: 'Settings saved to MySQL database successfully.', data: db.settings });
});

apiRouter.get('/admin/anticheat', AdminAuthService.requireAdmin('anticheat.view'), async (req: Request, res: Response) => {
  const events = await db.getAntiCheatEvents(100);
  return res.json({ success: true, data: events });
});

apiRouter.get('/admin/logs', AdminAuthService.requireAdmin('logs.view'), async (req: Request, res: Response) => {
  const pool = db.getPool();
  const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
  return res.json({ success: true, data: rows });
});
