"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signSessionToken = signSessionToken;
exports.requireAuth = requireAuth;
exports.isRoleAdmin = isRoleAdmin;
exports.requirePermission = requirePermission;
exports.requireAnyPermission = requireAnyPermission;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const permissions_1 = require("../../shared/permissions");
const JWT_SECRET = process.env.JWT_SECRET || 'roma_saas_super_secret_key_2026_multitenant';
function signSessionToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const queryToken = typeof req.query.token === 'string' ? req.query.token : '';
        const token = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : queryToken;
        if (!token) {
            res.status(401).json({ error: 'Sesión no autorizada. Ingresa tu PIN de 8 dígitos.' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const context = await db_1.db.getSessionContext(decoded.userId, decoded.tenantId);
        if (!context) {
            res.status(401).json({ error: 'Sesión expirada o usuario inactivo en este tenant.' });
            return;
        }
        req.auth = context;
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Token de sesión inválido o expirado.' });
    }
}
function isRoleAdmin(role) {
    if (!role)
        return false;
    const nameLower = (role.name || '').toLowerCase();
    return (!!role.isSystem ||
        nameLower.includes('super') ||
        nameLower.includes('admin') ||
        (Array.isArray(role.permissions) && role.permissions.includes('*')));
}
/**
 * REGLA GLOBAL DE PERMISOS GRANULARES:
 * Middleware obligatorio para proteger cada acción del backend según el catálogo global.
 */
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.auth || !req.auth.role) {
            res.status(401).json({ error: 'No autenticado o rol no asignado.' });
            return;
        }
        const role = req.auth.role;
        if (isRoleAdmin(role)) {
            next();
            return;
        }
        const granted = role.permissions;
        if (!(0, permissions_1.hasPermission)(granted, permission)) {
            res.status(403).json({
                error: `Permiso granular denegado: Se requiere '${permission}' para realizar esta acción en tu rol (${role.name}).`,
                requiredPermission: permission,
            });
            return;
        }
        next();
    };
}
function requireAnyPermission(permissions) {
    return (req, res, next) => {
        if (!req.auth || !req.auth.role) {
            res.status(401).json({ error: 'No autenticado o rol no asignado.' });
            return;
        }
        const role = req.auth.role;
        if (isRoleAdmin(role)) {
            next();
            return;
        }
        const granted = role.permissions;
        if (!(0, permissions_1.hasAnyPermission)(granted, permissions)) {
            res.status(403).json({
                error: `Permiso granular denegado: Tu rol (${role.name}) no cuenta con los permisos requeridos.`,
                requiredPermissions: permissions,
            });
            return;
        }
        next();
    };
}
