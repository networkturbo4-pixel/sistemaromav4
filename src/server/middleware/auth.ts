import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { PermissionKey, hasPermission, hasAnyPermission } from '../../shared/permissions';
import { User, Role, Tenant } from '../../shared/types';

const JWT_SECRET = process.env.JWT_SECRET || 'roma_saas_super_secret_key_2026_multitenant';

export interface AuthenticatedRequest extends Request {
  auth?: {
    user: User;
    role?: Role;
    tenant: Tenant;
  };
}

export function signSessionToken(payload: { userId: string; tenantId: string; roleId: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const queryToken = typeof req.query.token === 'string' ? req.query.token : '';
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : queryToken;

    if (!token) {
      res.status(401).json({ error: 'Sesión no autorizada. Ingresa tu PIN de 8 dígitos.' });
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      tenantId: string;
      roleId: string;
    };

    const context = await db.getSessionContext(decoded.userId, decoded.tenantId);
    if (!context) {
      res.status(401).json({ error: 'Sesión expirada o usuario inactivo en este tenant.' });
      return;
    }

    req.auth = context;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token de sesión inválido o expirado.' });
  }
}

/**
 * REGLA GLOBAL DE PERMISOS GRANULARES:
 * Middleware obligatorio para proteger cada acción del backend según el catálogo global.
 */
export function requirePermission(permission: PermissionKey) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth || !req.auth.role) {
      res.status(401).json({ error: 'No autenticado o rol no asignado.' });
      return;
    }
    const role = req.auth.role;
    if (role.isSystem || role.name === 'Super Administrador') {
      next();
      return;
    }
    const granted = role.permissions;
    if (!hasPermission(granted, permission)) {
      res.status(403).json({
        error: `Permiso granular denegado: Se requiere '${permission}' para realizar esta acción en tu rol (${role.name}).`,
        requiredPermission: permission,
      });
      return;
    }
    next();
  };
}

export function requireAnyPermission(permissions: PermissionKey[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth || !req.auth.role) {
      res.status(401).json({ error: 'No autenticado o rol no asignado.' });
      return;
    }
    const role = req.auth.role;
    if (role.isSystem || role.name === 'Super Administrador') {
      next();
      return;
    }
    const granted = role.permissions;
    if (!hasAnyPermission(granted, permissions)) {
      res.status(403).json({
        error: `Permiso granular denegado: Tu rol (${role.name}) no cuenta con los permisos requeridos.`,
        requiredPermissions: permissions,
      });
      return;
    }
    next();
  };
}
