import { db, AntiCheatEventRecord } from './db';
import crypto from 'crypto';

export interface AntiCheatValidationResult {
  isValid: boolean;
  errorCode?: string;
  errorMessage?: string;
  actionTaken?: 'none' | 'flag' | 'ban';
}

export class AntiCheatEngine {
  private static userTapSpeedHistory: Map<number, { count: number; windowStart: number }> = new Map();

  /**
   * Validate tap sync batch payload against multi-layer anti-cheat checks using MySQL
   */
  public static async validateTapSync(
    userId: number,
    tapsCount: number,
    nonce: string,
    sequence: number,
    timestamp: number,
    clientIp: string
  ): Promise<AntiCheatValidationResult> {
    const user = await db.getUserById(userId);
    const profile = await db.getProfile(userId);
    const now = Date.now();

    if (!user || user.status === 'banned') {
      return { isValid: false, errorCode: 'USER_BANNED', errorMessage: 'Account has been banned due to policy violations.' };
    }

    const username = user.username || `user_${userId}`;

    // 1. Taps Count & Type Validation (Negative, Zero, Non-integer, Huge values)
    if (!Number.isInteger(tapsCount) || tapsCount <= 0) {
      await this.logIncident(userId, username, 'impossible_score', 'high', `Invalid or negative taps value submitted: ${tapsCount}`, clientIp);
      return { isValid: false, errorCode: 'INVALID_TAPS_COUNT', errorMessage: 'Invalid taps parameter.' };
    }

    // Maximum taps allowable in a single sync batch (2 seconds window * 12 TPS = 24 taps max)
    if (tapsCount > 24) {
      await this.logIncident(userId, username, 'impossible_score', 'critical', `Exceeded batch tap limit: ${tapsCount} taps in single request`, clientIp);
      return { isValid: false, errorCode: 'BATCH_OVERFLOW', errorMessage: 'Tap batch exceeds maximum allowed threshold.' };
    }

    // 2. Anti-Replay Nonce Validation
    if (!nonce || typeof nonce !== 'string' || nonce.length < 8) {
      await this.logIncident(userId, username, 'duplicate_nonce', 'medium', 'Missing or malformed nonce token', clientIp);
      return { isValid: false, errorCode: 'INVALID_NONCE', errorMessage: 'Invalid request signature.' };
    }

    // 3. Timestamp Skew Protection (Future timestamps & clock skew)
    if (timestamp > now + 3000) {
      await this.logIncident(userId, username, 'timestamp_skew', 'high', `Future timestamp detected: ${timestamp - now}ms in the future`, clientIp);
      return { isValid: false, errorCode: 'FUTURE_TIMESTAMP', errorMessage: 'Client clock is ahead of server.' };
    }

    const timeDelta = Math.abs(now - timestamp);
    if (timeDelta > 60 * 1000) {
      await this.logIncident(userId, username, 'timestamp_skew', 'high', `Clock skew ${timeDelta}ms exceeds tolerance threshold`, clientIp);
      return { isValid: false, errorCode: 'TIMESTAMP_SKEW', errorMessage: 'Client clock out of sync.' };
    }

    // 4. Sequence Progression Check
    if (profile && sequence <= profile.last_sequence) {
      await this.logIncident(userId, username, 'duplicate_nonce', 'high', `Out of order sequence: client=${sequence}, server=${profile.last_sequence}`, clientIp);
      return { isValid: false, errorCode: 'SEQUENCE_VIOLATION', errorMessage: 'Out-of-order sync packet.' };
    }

    // 5. Click Speed / Taps-Per-Second (Strict 12 TPS Limit)
    const maxTps = db.settings.max_taps_per_second || 12;
    const history = this.userTapSpeedHistory.get(userId) || { count: 0, windowStart: now };

    if (now - history.windowStart > 2000) {
      history.count = tapsCount;
      history.windowStart = now;
    } else {
      history.count += tapsCount;
    }
    this.userTapSpeedHistory.set(userId, history);

    const activeSeconds = Math.max(0.5, (now - history.windowStart) / 1000);
    const measuredTps = history.count / activeSeconds;

    if (measuredTps > maxTps) {
      await this.logIncident(
        userId,
        username,
        'speed_hack',
        measuredTps > maxTps * 2 ? 'critical' : 'high',
        `Autoclicker / speedhack pattern detected. Rate: ${measuredTps.toFixed(1)} taps/sec (Strict Max: ${maxTps} TPS)`,
        clientIp
      );

      if (measuredTps > maxTps * 2.5) {
        await db.updateUser(userId, { status: 'banned' });
        return { isValid: false, errorCode: 'SPEED_HACK_BANNED', errorMessage: 'Unnatural tap frequency detected. Account banned.', actionTaken: 'ban' };
      }

      return { isValid: false, errorCode: 'TAP_LIMIT_EXCEEDED', errorMessage: `Strict rate limit of ${maxTps} taps/sec exceeded. Slow down.`, actionTaken: 'flag' };
    }

    // 6. Energy Depletion Consistency Check
    const calculatedEnergy = await db.getCalculatedEnergy(userId);
    const energyNeeded = tapsCount * db.settings.tap_cost;
    if (calculatedEnergy.current_energy < energyNeeded) {
      await this.logIncident(
        userId,
        username,
        'energy_tamper',
        'high',
        `Attempted to spend ${energyNeeded} energy with only ${calculatedEnergy.current_energy} available`,
        clientIp
      );
      return { isValid: false, errorCode: 'INSUFFICIENT_ENERGY', errorMessage: 'Server energy insufficient for submitted taps.' };
    }

    return { isValid: true };
  }

  private static async logIncident(
    userId: number,
    username: string,
    type: AntiCheatEventRecord['type'],
    severity: AntiCheatEventRecord['severity'],
    details: string,
    clientIp: string
  ) {
    try {
      await db.logAntiCheatEvent({
        user_id: userId,
        username,
        type,
        severity,
        details,
        client_ip: clientIp || '127.0.0.1',
        status: severity === 'critical' ? 'banned' : 'flagged',
      });
    } catch (err: any) {
      console.error('[AntiCheatEngine] Failed to log anti-cheat event to MySQL:', err.message);
    }
  }
}
