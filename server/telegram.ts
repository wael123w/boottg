import crypto from 'crypto';
import { db, UserRecord } from './db';

export interface TelegramAuthData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
  };
  auth_date: number;
  hash: string;
  start_param?: string;
}

export class TelegramService {
  /**
   * Official Telegram WebApp initData HMAC-SHA256 Verification
   */
  public static verifyInitData(initDataRaw: string, botToken: string): { isValid: boolean; user?: TelegramAuthData['user']; startParam?: string } {
    if (!initDataRaw) {
      return { isValid: false };
    }

    try {
      const urlParams = new URLSearchParams(initDataRaw);
      const hash = urlParams.get('hash');
      if (!hash) return { isValid: false };

      urlParams.delete('hash');

      // Sort keys alphabetically
      const paramsArray: string[] = [];
      Array.from(urlParams.keys())
        .sort()
        .forEach((key) => {
          paramsArray.push(`${key}=${urlParams.get(key)}`);
        });

      const dataCheckString = paramsArray.join('\n');

      // Telegram Secret Key: HMAC-SHA256 of botToken with constant "WebAppData"
      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      // Safe timing comparison
      const isValid = crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash));
      if (!isValid) return { isValid: false };

      // Check auth_date expiration (maximum 86400 seconds = 24 hours old)
      const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (!authDate || (nowSeconds - authDate > 86400) || (authDate > nowSeconds + 60)) {
        return { isValid: false };
      }

      let userObj: TelegramAuthData['user'];
      const userParam = urlParams.get('user');
      if (userParam) {
        userObj = JSON.parse(userParam);
      }

      return {
        isValid: true,
        user: userObj,
        startParam: urlParams.get('start_param') || undefined,
      };
    } catch {
      return { isValid: false };
    }
  }

  /**
   * Real Telegram Bot API check using getChatMember
   */
  public static async verifyTelegramChatMember(
    chatIdentifier: string,
    telegramUserId: number,
    botToken: string
  ): Promise<{ isMember: boolean; status?: string; error?: string }> {
    if (!botToken || botToken.trim() === '') {
      return {
        isMember: false,
        error: 'Telegram Bot Token is not configured on the server. Please set TELEGRAM_BOT_TOKEN in .env.',
      };
    }

    if (!telegramUserId) {
      return {
        isMember: false,
        error: 'User has no linked Telegram ID. Please launch the game from inside Telegram to verify membership.',
      };
    }

    // Format chat_id properly (e.g. '@channel' or '-100...')
    let formattedChat = chatIdentifier.trim();
    if (formattedChat.startsWith('https://t.me/')) {
      formattedChat = '@' + formattedChat.replace('https://t.me/', '').split('/')[0];
    } else if (!formattedChat.startsWith('@') && !formattedChat.startsWith('-')) {
      formattedChat = '@' + formattedChat;
    }

    const apiUrl = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(formattedChat)}&user_id=${telegramUserId}`;

    try {
      const response = await fetch(apiUrl, { method: 'GET', headers: { Accept: 'application/json' } });
      const data: any = await response.json();

      if (!data.ok) {
        return {
          isMember: false,
          error: data.description || 'Telegram API returned an error verifying membership.',
        };
      }

      const status = data.result?.status;
      const validStatuses = ['creator', 'administrator', 'member', 'restricted'];
      const isMember = validStatuses.includes(status);

      return {
        isMember,
        status,
        error: isMember ? undefined : `User status is "${status}". You must be an active member of ${formattedChat}.`,
      };
    } catch (err: any) {
      return {
        isMember: false,
        error: 'Network error connecting to Telegram Bot API: ' + (err?.message || 'Connection failed'),
      };
    }
  }

  /**
   * Handle incoming Webhook from Telegram Bot using MySQL persistence
   */
  public static async handleBotUpdate(update: any): Promise<{ replyText: string; replyMarkup?: any }> {
    const message = update?.message;
    if (!message) return { replyText: 'No message received' };

    const text = message.text?.trim() || '';
    const from = message.from || {};
    const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL || (db.settings.telegram_webhook_url ? db.settings.telegram_webhook_url.replace('/api/telegram/webhook', '') : 'https://t.me');

    // Deep link start param (e.g., /start REF_1001)
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const referralCode = parts.length > 1 ? parts[1].trim() : null;

      // Register or find user in MySQL
      if (from.id) {
        let existingUser = await db.getUserByTelegramId(from.id);
        if (!existingUser) {
          let referrerId: number | null = null;
          if (referralCode) {
            const referrer = await db.getUserByReferralCode(referralCode);
            if (referrer) {
              referrerId = referrer.id;
            }
          }

          existingUser = await db.createUser({
            telegram_id: from.id,
            username: from.username || `user_${from.id}`,
            first_name: from.first_name || 'Miner',
            last_name: from.last_name || null,
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${from.username || from.id}`,
            language_code: from.language_code || 'en',
            referral_code: `REF_${from.id}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
            referred_by: referrerId,
            is_premium: Boolean(from.is_premium),
          });

          if (referrerId) {
            await db.recordTransaction(
              referrerId,
              'referral',
              5000,
              `Welcome bonus for referring @${existingUser.username}`
            );
          }
        }
      }

      return {
        replyText: `🎮 Welcome to ${db.settings.game_name}!\n\nTap the coin, complete tasks and invite your friends to earn internal ${db.settings.coin_name} (${db.settings.coin_symbol}).\n\n⚡ Level up your mine, unlock Turbo multipliers, and claim daily streak rewards!`,
        replyMarkup: {
          inline_keyboard: [
            [{ text: '🎮 PLAY NOW', web_app: { url: miniAppUrl } }],
            [
              { text: '💰 WALLET', callback_data: 'cmd_wallet' },
              { text: '👥 REFERRALS', callback_data: 'cmd_referrals' },
            ],
            [
              { text: '📋 TASKS', callback_data: 'cmd_tasks' },
              { text: '🏆 LEADERBOARD', callback_data: 'cmd_leaderboard' },
            ],
          ],
        },
      };
    }

    if (text === '/help') {
      return {
        replyText: `📖 ${db.settings.game_name} Commands:\n\n/start - Open menu and launch Mini App\n/game - Play the tap game\n/balance - Check your current coin balance\n/tasks - View available reward tasks\n/referral - Get your unique invite link\n/withdraw - Check withdrawal requests\n/leaderboard - Top rankings`,
      };
    }

    if (text === '/game') {
      return {
        replyText: `🚀 Launch the ${db.settings.game_name} Mini App:`,
        replyMarkup: {
          inline_keyboard: [[{ text: '🎮 PLAY NOW', web_app: { url: miniAppUrl } }]],
        },
      };
    }

    if (text === '/balance') {
      let balance = 0;
      if (from.id) {
        const user = await db.getUserByTelegramId(from.id);
        if (user) {
          const bal = await db.getBalance(user.id);
          balance = bal.coins;
        }
      }
      return {
        replyText: `💰 Your Current Balance:\n\n${balance.toLocaleString()} ${db.settings.coin_symbol} (${db.settings.coin_name})\n\nKeep tapping and claiming tasks to reach the next level!`,
      };
    }

    if (text === '/referral') {
      let code = 'EMPIRE';
      if (from.id) {
        const user = await db.getUserByTelegramId(from.id);
        if (user) {
          code = user.referral_code;
        }
      }
      const refLink = `https://t.me/${db.settings.telegram_bot_username}?start=${code}`;
      return {
        replyText: `👥 Your Referral Link:\n\n${refLink}\n\nInvite friends and earn:\n• Tier 1: 10% commission\n• Tier 2: 3% commission\n• Tier 3: 1% commission`,
      };
    }

    return {
      replyText: `Command received. Tap "PLAY NOW" to start playing!`,
      replyMarkup: {
        inline_keyboard: [[{ text: '🎮 PLAY NOW', web_app: { url: miniAppUrl } }]],
      },
    };
  }
}
