import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, AdminUserRecord } from './db';

export function getAdminJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: ADMIN_JWT_SECRET environment variable is missing in production.');
    }
    // Dynamic runtime secret during development if missing
    return 'dev_runtime_admin_key_' + (process.env.APP_KEY || 'dynamic_fallback_dev_seed');
  }
  return secret;
}

export function getUserAuthSecret(): string {
  const secret = process.env.USER_AUTH_SECRET;
  if (!secret || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: USER_AUTH_SECRET environment variable is missing in production.');
    }
    return 'dev_runtime_user_key_' + (process.env.APP_KEY || 'dynamic_fallback_dev_seed');
  }
  return secret;
}

export interface AuthenticatedAdminRequest extends Request {
  adminUser?: AdminUserRecord;
}

export class AdminAuthService {
  /**
   * Securely hash password with SHA-512 PBKDF2 with unique cryptographic salt
   */
  public static hashPassword(password: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
    return `${actualSalt}:${hash}`;
  }

  /**
   * Constant-time comparison for password verification
   */
  public static verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash) return false;
    if (!storedHash.includes(':')) {
      try {
        const hmacHash = crypto.createHmac('sha256', getAdminJwtSecret()).update(password).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(hmacHash), Buffer.from(storedHash));
      } catch {
        return false;
      }
    }
    const [salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
    } catch {
      return false;
    }
  }

  /**
   * Generate signed session token for an authenticated admin
   * Format: adm_<adminId>_<role>_<expiresAt>_<signature>
   */
  public static generateAdminToken(admin: AdminUserRecord): string {
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const payload = `${admin.id}:${admin.role}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', getAdminJwtSecret()).update(payload).digest('hex');
    return `adm_${admin.id}_${admin.role}_${expiresAt}_${signature}`;
  }

  /**
   * Verify an admin token asynchronously against database
   */
  public static async verifyAdminToken(token: string): Promise<{ isValid: boolean; admin?: AdminUserRecord; error?: string }> {
    if (!token || !token.startsWith('adm_')) {
      return { isValid: false, error: 'INVALID_TOKEN_FORMAT' };
    }

    const parts = token.split('_');
    if (parts.length !== 5) {
      return { isValid: false, error: 'MALFORMED_TOKEN' };
    }

    const adminId = parseInt(parts[1], 10);
    const role = parts[2];
    const expiresAt = parseInt(parts[3], 10);
    const signature = parts[4];

    if (isNaN(adminId) || isNaN(expiresAt)) {
      return { isValid: false, error: 'INVALID_TOKEN_DATA' };
    }

    if (Date.now() > expiresAt) {
      return { isValid: false, error: 'TOKEN_EXPIRED' };
    }

    const payload = `${adminId}:${role}:${expiresAt}`;
    const expectedSignature = crypto.createHmac('sha256', getAdminJwtSecret()).update(payload).digest('hex');

    if (signature !== expectedSignature) {
      return { isValid: false, error: 'SIGNATURE_MISMATCH' };
    }

    const admin = await db.getAdminById(adminId);
    if (!admin) {
      return { isValid: false, error: 'ADMIN_NOT_FOUND' };
    }

    if (admin.status !== 'active') {
      return { isValid: false, error: 'ADMIN_SUSPENDED' };
    }

    return { isValid: true, admin };
  }

  /**
   * Express middleware to enforce admin authentication and granular permissions
   */
  public static requireAdmin(requiredPermission?: string) {
    return async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization || (req.headers['x-admin-token'] as string);

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Admin authorization header required (Bearer <admin_token> or x-admin-token).',
        });
      }

      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

      // Reject normal user IDs or plain tokens directly with 403 Forbidden
      if (!token.startsWith('adm_')) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN_USER_TOKEN',
          message: 'Access denied. Telegram user tokens cannot access the Admin API.',
        });
      }

      const verification = await AdminAuthService.verifyAdminToken(token);
      if (!verification.isValid || !verification.admin) {
        return res.status(401).json({
          success: false,
          error: verification.error || 'INVALID_ADMIN_TOKEN',
          message: 'Invalid, forged, or expired admin session token.',
        });
      }

      const admin = verification.admin;

      // Permission check
      if (requiredPermission) {
        const isSuperAdmin = admin.role === 'superadmin' || admin.role === 'super_admin';
        const permissions = admin.permissions || [];
        const hasPermission = permissions.includes(requiredPermission) || permissions.includes('*');

        if (!isSuperAdmin && !hasPermission) {
          return res.status(403).json({
            success: false,
            error: 'PERMISSION_DENIED',
            message: `Admin role "${admin.role}" lacks required permission: "${requiredPermission}".`,
          });
        }
      }

      req.adminUser = admin;
      next();
    };
  }
}
