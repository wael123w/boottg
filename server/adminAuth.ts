import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, AdminUserRecord } from './db';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'tap_empire_prod_secret_admin_key_9981247';

export interface AuthenticatedAdminRequest extends Request {
  adminUser?: AdminUserRecord;
}

export class AdminAuthService {
  /**
   * Hash password with SHA-256 and internal salt
   */
  public static hashPassword(password: string): string {
    return crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(password).digest('hex');
  }

  /**
   * Generate signed session token for an authenticated admin
   * Format: adm_<adminId>_<role>_<expiresAt>_<signature>
   */
  public static generateAdminToken(admin: AdminUserRecord): string {
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const payload = `${admin.id}:${admin.role}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(payload).digest('hex');
    return `adm_${admin.id}_${admin.role}_${expiresAt}_${signature}`;
  }

  /**
   * Verify an admin token
   */
  public static verifyAdminToken(token: string): { isValid: boolean; admin?: AdminUserRecord; error?: string } {
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
    const expectedSignature = crypto.createHmac('sha256', ADMIN_JWT_SECRET).update(payload).digest('hex');

    if (signature !== expectedSignature) {
      return { isValid: false, error: 'SIGNATURE_MISMATCH' };
    }

    const admin = db.adminUsers.get(adminId);
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
    return (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
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

      const verification = AdminAuthService.verifyAdminToken(token);
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
        const isSuperAdmin = admin.role === 'superadmin';
        const hasPermission = admin.permissions.includes(requiredPermission) || admin.permissions.includes('*');

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
