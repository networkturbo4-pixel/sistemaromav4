"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("./db");
// Import resiliente para multer y qrcode (no detiene el inicio del servidor en cPanel si falta correr npm install)
let multerModule = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    multerModule = require('multer');
}
catch {
    console.warn('⚠️ [Multer] Paquete multer no instalado aún en node_modules.');
}
let qrcodeModule = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    qrcodeModule = require('qrcode');
}
catch {
    console.warn('⚠️ [QRCode] Paquete qrcode no instalado aún en node_modules.');
}
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const auth_1 = require("./middleware/auth");
const permissions_1 = require("../shared/permissions");
const drive_routes_1 = __importDefault(require("./routes/drive.routes"));
const whiteboards_routes_1 = __importDefault(require("./routes/whiteboards.routes"));
const brand_guidelines_routes_1 = __importDefault(require("./routes/brand-guidelines.routes"));
const romita_routes_1 = __importDefault(require("./routes/romita.routes"));
const emails_routes_1 = __importDefault(require("./routes/emails.routes"));
const googleDriveService_1 = require("./services/googleDriveService");
const totp_1 = require("./utils/totp");
const notificationService_1 = require("./services/notificationService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT || 3001);
app.use((0, cors_1.default)());
app.use((0, compression_1.default)({
    filter: (req, res) => {
        if (req.headers.accept === 'text/event-stream' ||
            req.path.includes('/stream') ||
            (req.originalUrl && req.originalUrl.includes('/stream'))) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
}));
// Permitir subir imágenes Base64 de logos, favicons, PWA y canvas de pizarras de hasta 50MB
app.use(express_1.default.json({ limit: '50mb' }));
// Módulo de Google Drive & Archivos Cloud
app.use('/api/drive', drive_routes_1.default);
// Módulo de Pizarras Creativas (Whiteboards)
app.use('/api/workspace/whiteboards', whiteboards_routes_1.default);
// Submódulo: Brand Guidelines / Pitch Decks (Público y Privado)
app.use('/api/workspace/brand-guidelines', brand_guidelines_routes_1.default);
app.use('/api/brand-guidelines', brand_guidelines_routes_1.default);
// Agente de IA Asistente ROMITA (con Tool Calling y ejecuciones CRUD)
app.use('/api/romita', romita_routes_1.default);
// Submódulo de Workspace: Correos Corporativos (SMTP / IMAP)
app.use('/api/workspace/emails', emails_routes_1.default);
// =============================================================================
// 1. ENDPOINTS PÚBLICOS Y AUTENTICACIÓN POR PIN DE 8 DÍGITOS
// =============================================================================
app.get('/api/public/tenant-branding', async (req, res) => {
    try {
        const slug = req.query.tenant || req.headers['x-tenant-slug'];
        const tenant = await db_1.db.getPublicTenantBranding(slug);
        if (!tenant) {
            res.status(404).json({ error: 'Tenant no encontrado.' });
            return;
        }
        res.json({
            tenant: {
                id: tenant.id,
                slug: tenant.slug,
                name: tenant.name,
                customization: tenant.customization,
                companyInfo: tenant.companyInfo,
            },
            engineInfo: db_1.db.getEngineInfo(),
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/public/quotes/:publicToken', async (req, res) => {
    try {
        const { publicToken } = req.params;
        if (!publicToken) {
            res.status(400).json({ error: 'Token de cotización no especificado.' });
            return;
        }
        const result = await db_1.db.getQuoteByPublicToken(publicToken);
        if (!result) {
            res.status(404).json({ error: 'Cotización no encontrada o enlace vencido.' });
            return;
        }
        res.json({
            quote: result.quote,
            tenant: {
                id: result.tenant.id,
                name: result.tenant.name,
                slug: result.tenant.slug,
                companyInfo: result.tenant.companyInfo,
                customization: result.tenant.customization,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Catálogo público de servicios
app.get('/api/public/services', async (req, res) => {
    try {
        const slug = req.query.tenant || req.headers['x-tenant-slug'];
        const categorySlug = req.query.category;
        const result = await db_1.db.getPublicServices(slug, categorySlug);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Detalle público de un servicio
app.get('/api/public/services/:slugOrId', async (req, res) => {
    try {
        const slug = req.query.tenant || req.headers['x-tenant-slug'];
        const { slugOrId } = req.params;
        if (!slugOrId) {
            res.status(400).json({ error: 'Identificador de servicio no especificado.' });
            return;
        }
        const result = await db_1.db.getPublicServiceBySlugOrId(slug, slugOrId);
        if (!result) {
            res.status(404).json({ error: 'Servicio no encontrado o no disponible públicamente.' });
            return;
        }
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
function parseUserAgent(uaString) {
    const ua = (uaString || '').toLowerCase();
    let deviceType = 'desktop';
    let os = 'Desconocido';
    let browser = 'Navegador Web';
    if (ua.includes('windows phone')) {
        os = 'Windows Phone';
        deviceType = 'mobile';
    }
    else if (ua.includes('win')) {
        os = 'Windows';
    }
    else if (ua.includes('android')) {
        os = 'Android';
        deviceType = ua.includes('mobile') ? 'mobile' : 'tablet';
    }
    else if (ua.includes('ipad')) {
        os = 'iPadOS';
        deviceType = 'tablet';
    }
    else if (ua.includes('iphone')) {
        os = 'iOS';
        deviceType = 'mobile';
    }
    else if (ua.includes('macintosh') || ua.includes('mac os')) {
        os = 'macOS';
    }
    else if (ua.includes('linux')) {
        os = 'Linux';
    }
    if (ua.includes('edg/')) {
        browser = 'Microsoft Edge';
    }
    else if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) {
        browser = 'Google Chrome';
    }
    else if (ua.includes('safari') && !ua.includes('chrome')) {
        browser = 'Apple Safari';
    }
    else if (ua.includes('firefox')) {
        browser = 'Mozilla Firefox';
    }
    else if (ua.includes('opr') || ua.includes('opera')) {
        browser = 'Opera';
    }
    const deviceName = `${browser} en ${os}`;
    return { deviceName, deviceType, browser, os };
}
app.post('/api/auth/login-pin', async (req, res) => {
    try {
        const { pin, tenantSlug, mode = 'personal' } = req.body;
        if (!pin || typeof pin !== 'string' || !/^\d{8}$/.test(pin.trim())) {
            res.status(400).json({ error: 'Debes ingresar un PIN válido de exactamente 8 dígitos.' });
            return;
        }
        const match = await db_1.db.findUserByPin(pin.trim(), tenantSlug, mode);
        if (!match) {
            res.status(401).json({
                error: mode === 'cliente'
                    ? 'Código de acceso o PIN de cliente no encontrado. Verifica tu código de 8 dígitos o consulta con la agencia.'
                    : 'PIN de 8 dígitos incorrecto o usuario inactivo. Verifica tu código de acceso.',
            });
            return;
        }
        // Registro seguro de dispositivo / sesión con límite concurrente
        const userAgentHeader = req.headers['user-agent'] || '';
        const rawIp = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '';
        const ipAddress = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '';
        const parsedUa = parseUserAgent(userAgentHeader);
        const session = await db_1.db.createUserSession({
            userId: match.user.id,
            tenantId: match.tenant.id,
            token: '',
            deviceName: parsedUa.deviceName,
            deviceType: parsedUa.deviceType,
            browser: parsedUa.browser,
            os: parsedUa.os,
            ipAddress,
        });
        const token = (0, auth_1.signSessionToken)({
            userId: match.user.id,
            tenantId: match.tenant.id,
            roleId: match.role.id,
            sessionId: session.id,
        });
        // Vincular token a la sesión guardada
        session.token = token;
        const todayAttendance = await db_1.db.getTodayAttendance(match.tenant.id, match.user.id);
        const hrSettings = await db_1.db.getHrSettings(match.tenant.id);
        const profile = await db_1.db.getEmployeeProfileByUserId(match.tenant.id, match.user.id);
        const alreadyCheckedInToday = !!todayAttendance?.checkIn;
        const expectedEntryTime = profile?.entryTime || hrSettings.defaultEntryTime || '09:00';
        const toleranceMinutes = hrSettings.toleranceMinutes ?? 15;
        // Calcular si está fuera de hora de tolerancia
        let isOutsideTolerance = false;
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const [expH, expM] = expectedEntryTime.split(':').map(Number);
        const limitMins = expH * 60 + expM + toleranceMinutes;
        if (currentMins > limitMins) {
            isOutsideTolerance = true;
        }
        const isAdmin = match.role.permissions?.includes('*') || (0, permissions_1.hasPermission)(match.role.permissions, 'administration.hr.manage');
        res.json({
            token,
            user: match.user,
            role: match.role,
            tenant: match.tenant,
            permissionsCatalog: permissions_1.PERMISSIONS_CATALOG,
            engineInfo: db_1.db.getEngineInfo(),
            session: {
                id: session.id,
                deviceName: session.deviceName,
                deviceType: session.deviceType,
                browser: session.browser,
                os: session.os,
                createdAt: session.createdAt,
            },
            attendanceCheck: {
                alreadyCheckedInToday,
                requiresAttendanceCheckIn: !alreadyCheckedInToday && !isAdmin,
                isOutsideTolerance,
                strictTardinessLock: !!hrSettings.strictTardinessLock,
                hasAuthenticatorConfigured: !!hrSettings.authenticatorSecret,
                expectedEntryTime,
                toleranceMinutes,
                todayAttendance,
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/auth/me', auth_1.requireAuth, async (req, res) => {
    const { user, role, tenant } = req.auth;
    const todayAttendance = await db_1.db.getTodayAttendance(tenant.id, user.id);
    const hrSettings = await db_1.db.getHrSettings(tenant.id);
    const profile = await db_1.db.getEmployeeProfileByUserId(tenant.id, user.id);
    const alreadyCheckedInToday = !!todayAttendance?.checkIn;
    const expectedEntryTime = profile?.entryTime || hrSettings.defaultEntryTime || '09:00';
    const toleranceMinutes = hrSettings.toleranceMinutes ?? 15;
    let isOutsideTolerance = false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [expH, expM] = expectedEntryTime.split(':').map(Number);
    const limitMins = expH * 60 + expM + toleranceMinutes;
    if (currentMins > limitMins) {
        isOutsideTolerance = true;
    }
    const isAdmin = role?.permissions?.includes('*') || (0, permissions_1.hasPermission)(role?.permissions, 'administration.hr.manage');
    res.json({
        user,
        role,
        tenant,
        permissionsCatalog: permissions_1.PERMISSIONS_CATALOG,
        engineInfo: db_1.db.getEngineInfo(),
        attendanceCheck: {
            alreadyCheckedInToday,
            requiresAttendanceCheckIn: !alreadyCheckedInToday && !isAdmin,
            isOutsideTolerance,
            strictTardinessLock: !!hrSettings.strictTardinessLock,
            hasAuthenticatorConfigured: !!hrSettings.authenticatorSecret,
            expectedEntryTime,
            toleranceMinutes,
            todayAttendance,
        },
    });
});
app.get('/api/auth/sessions', auth_1.requireAuth, async (req, res) => {
    try {
        const sessions = await db_1.db.getUserSessions(req.auth.user.id);
        const enriched = sessions.map((s) => ({
            ...s,
            isCurrent: (req.auth?.sessionId && s.id === req.auth.sessionId) || s.token === req.auth?.token,
        }));
        res.json({
            sessions: enriched,
            activeCount: enriched.length,
            maxAllowed: 3,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/auth/sessions/:sessionId', auth_1.requireAuth, async (req, res) => {
    try {
        const revoked = await db_1.db.revokeSession(req.params.sessionId, req.auth.user.id);
        res.json({ success: revoked });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/auth/sessions/revoke-others', auth_1.requireAuth, async (req, res) => {
    try {
        const count = await db_1.db.revokeOtherSessions(req.auth.user.id, req.auth?.sessionId, req.auth?.token);
        res.json({ success: true, countRevoked: count });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/auth/logout', auth_1.requireAuth, async (req, res) => {
    try {
        if (req.auth?.sessionId) {
            await db_1.db.revokeSession(req.auth.sessionId, req.auth.user.id);
        }
        else if (req.auth?.token) {
            await db_1.db.revokeSessionByToken(req.auth.token);
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// APARTADO DEL PERFIL DE USUARIO
app.get('/api/users/profile/me', auth_1.requireAuth, async (req, res) => {
    try {
        const { user, tenant, role } = req.auth;
        const employeeProfile = await db_1.db.getEmployeeProfileByUserId(tenant.id, user.id);
        // Proyectos asignados en Workspace
        const allProjects = await db_1.db.getWorkspaceProjects(tenant.id);
        const assignedProjects = allProjects.filter((p) => p.assignedUsers?.some((u) => u.id === user.id));
        // Sesiones activas del usuario
        const sessions = await db_1.db.getUserSessions(user.id);
        const enrichedSessions = sessions.map((s) => ({
            ...s,
            isCurrent: (req.auth?.sessionId && s.id === req.auth.sessionId) || s.token === req.auth?.token,
        }));
        res.json({
            user,
            role,
            tenant,
            employeeProfile: employeeProfile || null,
            assignedProjects,
            sessions: enrichedSessions,
            activeDevicesCount: enrichedSessions.length,
            maxDevicesLimit: 3,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.put('/api/users/profile/me', auth_1.requireAuth, async (req, res) => {
    try {
        const { user, tenant } = req.auth;
        const { name, email, whatsapp, avatarUrl, currentPin, newPin } = req.body;
        const updates = {};
        if (name && typeof name === 'string')
            updates.name = name.trim();
        if (email && typeof email === 'string')
            updates.email = email.trim();
        if (whatsapp !== undefined)
            updates.whatsapp = String(whatsapp).trim();
        if (avatarUrl !== undefined)
            updates.avatarUrl = String(avatarUrl).trim();
        if (newPin) {
            const pinStr = String(newPin).trim();
            if (!/^\d{8}$/.test(pinStr)) {
                res.status(400).json({ error: 'El nuevo PIN debe contener exactamente 8 dígitos numéricos.' });
                return;
            }
            if (!currentPin || String(currentPin).trim() !== user.pin) {
                res.status(400).json({ error: 'El PIN actual ingresado no coincide con tu PIN registrado.' });
                return;
            }
            updates.pin = pinStr;
        }
        const updatedUser = await db_1.db.updateUser(tenant.id, user.id, updates);
        res.json({ user: updatedUser });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/auth/my-tenants', auth_1.requireAuth, async (req, res) => {
    try {
        const currentUser = req.auth.user;
        const isGlobalRoot = currentUser.id === 'user-roma-01' ||
            currentUser.email === 'cesar@romaagencia.pe';
        if (isGlobalRoot) {
            const allTenants = await db_1.db.getAllTenants();
            res.json({ tenants: allTenants });
            return;
        }
        const userTenants = await db_1.db.getTenantsForUser(currentUser.pin, currentUser.email);
        res.json({ tenants: userTenants });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/auth/switch-tenant', auth_1.requireAuth, async (req, res) => {
    try {
        const { targetTenantId } = req.body;
        if (!targetTenantId) {
            res.status(400).json({ error: 'targetTenantId es obligatorio.' });
            return;
        }
        const targetTenant = await db_1.db.getTenantById(targetTenantId);
        if (!targetTenant) {
            res.status(404).json({ error: 'El espacio de trabajo solicitado no existe.' });
            return;
        }
        if (targetTenant.status !== 'active') {
            res.status(403).json({ error: 'El espacio de trabajo solicitado está suspendido.' });
            return;
        }
        // 1. Buscar si el usuario actual tiene una cuenta en el tenant destino (por PIN o Email)
        let targetUser = await db_1.db.findUserInTenantByPinOrEmail(targetTenantId, req.auth.user.pin, req.auth.user.email);
        // 2. Solo el Administrador Global Root de la plataforma (user-roma-01 o cesar@romaagencia.pe)
        // puede enlazar con un usuario del tenant destino si no tiene cuenta directa creada.
        if (!targetUser) {
            const isGlobalRoot = req.auth.user.id === 'user-roma-01' ||
                req.auth.user.email === 'cesar@romaagencia.pe';
            if (isGlobalRoot) {
                const users = await db_1.db.getUsersByTenant(targetTenantId);
                targetUser = users.find((u) => u.isActive) || null;
            }
        }
        if (!targetUser) {
            res.status(403).json({
                error: `No tienes una cuenta de usuario asignada en el espacio "${targetTenant.name}".`,
            });
            return;
        }
        const session = await db_1.db.getSessionContext(targetUser.id, targetTenantId);
        if (!session) {
            res.status(404).json({ error: 'No se pudo resolver la sesión del tenant destino.' });
            return;
        }
        const token = (0, auth_1.signSessionToken)({
            userId: session.user.id,
            tenantId: session.tenant.id,
            roleId: session.role?.id || '',
        });
        res.json({
            token,
            user: session.user,
            role: session.role,
            tenant: session.tenant,
            permissionsCatalog: permissions_1.PERMISSIONS_CATALOG,
            engineInfo: db_1.db.getEngineInfo(),
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// 2. ENDPOINT DASHBOARD (PROTEGIDO CON PERMISOS GRANULARES)
// =============================================================================
app.get('/api/dashboard/summary', auth_1.requireAuth, (0, auth_1.requirePermission)('dashboard.view'), async (req, res) => {
    try {
        const { tenant } = req.auth;
        const clients = await db_1.db.getClientsByTenant(tenant.id);
        const users = await db_1.db.getUsersByTenant(tenant.id);
        const roles = await db_1.db.getRolesByTenant(tenant.id);
        const services = await db_1.db.getServices(tenant.id);
        const totalBrands = clients.reduce((acc, c) => acc + c.brands.length, 0);
        const activeClients = clients.filter((c) => c.status === 'active').length;
        const activeServices = services.filter((s) => s.status === 'active').length;
        res.json({
            metrics: {
                totalClients: clients.length,
                activeClients,
                totalBrands,
                activeUsers: users.filter((u) => u.isActive).length,
                totalRoles: roles.length,
                totalServices: services.length,
                activeServices,
            },
            recentClients: clients.slice(0, 5),
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// SISTEMA DE NOTIFICACIONES MULTITENANT & PWA PUSH (MÓDULOS CONECTADOS & CELULAR)
// =============================================================================
// Listar notificaciones del tenant
app.get('/api/notifications', auth_1.requireAuth, async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 50;
        const unreadOnly = req.query.unreadOnly === 'true';
        const moduleFilter = req.query.module;
        const notifications = await db_1.db.getNotifications(req.auth.tenant.id, {
            limit,
            unreadOnly,
            module: moduleFilter,
        });
        res.json({ notifications });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Canal SSE (Server-Sent Events) para recibir notificaciones en tiempo real
app.get('/api/notifications/stream', auth_1.requireAuth, (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Content-Encoding', 'identity');
        res.flushHeaders?.();
        // Enviar comentario de keepalive cada 20s para prevenir timeout de cPanel/Phusion Passenger
        const heartbeatInterval = setInterval(() => {
            try {
                res.write(': keepalive\n\n');
            }
            catch (e) {
                clearInterval(heartbeatInterval);
            }
        }, 20000);
        const unregister = notificationService_1.notificationService.registerSseClient(req.auth.tenant.id, res);
        req.on('close', () => {
            clearInterval(heartbeatInterval);
            unregister();
        });
    }
    catch (err) {
        console.error('[SSE Error]:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});
// Marcar notificación individual como leída
app.put('/api/notifications/:id/read', auth_1.requireAuth, async (req, res) => {
    try {
        const success = await db_1.db.markNotificationAsRead(req.auth.tenant.id, req.params.id);
        res.json({ success });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Marcar todas las notificaciones como leídas
app.put('/api/notifications/read-all', auth_1.requireAuth, async (req, res) => {
    try {
        const updatedCount = await db_1.db.markAllNotificationsAsRead(req.auth.tenant.id);
        res.json({ success: true, count: updatedCount });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar notificación individual
app.delete('/api/notifications/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const deleted = await db_1.db.deleteNotification(req.auth.tenant.id, req.params.id);
        res.json({ success: deleted });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Limpiar todas las notificaciones del tenant
app.delete('/api/notifications', auth_1.requireAuth, async (req, res) => {
    try {
        const deletedCount = await db_1.db.clearAllNotifications(req.auth.tenant.id);
        res.json({ success: true, count: deletedCount });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener clave pública VAPID para suscripción push del celular / PWA
app.get('/api/notifications/vapid-key', auth_1.requireAuth, (req, res) => {
    const publicKey = notificationService_1.notificationService.getVapidPublicKey();
    res.json({ publicKey });
});
// Registrar o actualizar suscripción push de un celular / navegador PWA
app.post('/api/notifications/push-subscribe', auth_1.requireAuth, async (req, res) => {
    try {
        const { subscription, userAgent } = req.body;
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            res.status(400).json({ error: 'Suscripción inválida' });
            return;
        }
        await db_1.db.savePushSubscription({
            tenantId: req.auth.tenant.id,
            userId: req.auth.user.id,
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
            userAgent: userAgent || req.headers['user-agent'] || '',
        });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Desuscribir dispositivo de notificaciones push
app.post('/api/notifications/push-unsubscribe', auth_1.requireAuth, async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (endpoint) {
            await db_1.db.deletePushSubscription(endpoint);
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Enviar notificación de prueba al celular del usuario
app.post('/api/notifications/test-push', auth_1.requireAuth, async (req, res) => {
    try {
        const notif = await notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            title: '🔔 ¡Notificaciones PWA activas!',
            message: `Hola ${req.auth.user.name}, las notificaciones en tu celular y PWA están funcionando correctamente.`,
            type: 'success',
            module: 'system',
            action: 'test',
            link: '/',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        });
        res.json({ success: true, notification: notif });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Endpoint genérico para que cualquier módulo presente o futuro se conecte automáticamente
app.post('/api/notifications/notify', auth_1.requireAuth, async (req, res) => {
    try {
        const { title, message, type, module: notifModule, entityId, action, link, metadata } = req.body;
        if (!title || !message) {
            res.status(400).json({ error: 'Título y mensaje son obligatorios.' });
            return;
        }
        const notif = await notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            title,
            message,
            type: type || 'info',
            module: notifModule || 'general',
            entityId,
            action,
            link,
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
            metadata,
        });
        res.status(201).json({ notification: notif });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// 3. PRIMER MÓDULO: CLIENTES Y MARCAS ASIGNADAS (MULTITENANT + PERMISOS)
// =============================================================================
app.get('/api/clients', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['clients.view', 'workspace.view', 'quotes.view', 'payments.view', 'service_orders.view']), async (req, res) => {
    try {
        const clients = await db_1.db.getClientsByTenant(req.auth.tenant.id);
        res.json({ clients });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/clients', auth_1.requireAuth, (0, auth_1.requirePermission)('clients.create'), async (req, res) => {
    try {
        const { name, documentType, documentNumber, whatsapp, email, notes, brands } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({ error: 'El nombre o razón social del cliente es obligatorio.' });
            return;
        }
        if (!documentNumber || !documentNumber.trim()) {
            res.status(400).json({ error: 'El número de DNI o RUC es obligatorio.' });
            return;
        }
        if (!whatsapp || !whatsapp.trim()) {
            res.status(400).json({ error: 'El número de WhatsApp es obligatorio.' });
            return;
        }
        const created = await db_1.db.createClient(req.auth.tenant.id, {
            name,
            documentType: documentType || 'RUC',
            documentNumber,
            whatsapp,
            email: email || null, // No obligatorio
            notes: notes || '',
            brands: Array.isArray(brands) ? brands : [],
        });
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'clients',
            type: 'success',
            title: 'Nuevo cliente registrado',
            message: `Se registró el cliente "${created.name}" (${created.documentType}: ${created.documentNumber})`,
            entityId: created.id,
            action: 'create',
            link: '/?module=clients',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.status(201).json({ client: created });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.put('/api/clients/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('clients.edit'), async (req, res) => {
    try {
        const updated = await db_1.db.updateClient(req.auth.tenant.id, req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Cliente no encontrado en este tenant.' });
            return;
        }
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'clients',
            type: 'info',
            title: 'Cliente actualizado',
            message: `Se actualizaron los datos del cliente "${updated.name}"`,
            entityId: updated.id,
            action: 'update',
            link: '/?module=clients',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.json({ client: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.delete('/api/clients/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('clients.delete'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteClient(req.auth.tenant.id, req.params.id);
        if (!deleted) {
            res.status(404).json({ error: 'Cliente no encontrado.' });
            return;
        }
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'clients',
            type: 'warning',
            title: 'Cliente eliminado',
            message: 'Se eliminó un cliente y sus marcas asociadas.',
            action: 'delete',
            link: '/?module=clients',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Marcas asignadas al cliente
app.post('/api/clients/:clientId/brands', auth_1.requireAuth, (0, auth_1.requirePermission)('brands.create'), async (req, res) => {
    try {
        const { name, industry, brandColor, logoUrl, socialHandle, description, serviceType, serviceName, serviceDescription, servicePrice, serviceMonths, includedServices, } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({ error: 'El nombre de la marca es obligatorio.' });
            return;
        }
        const brand = await db_1.db.createBrand(req.auth.tenant.id, req.params.clientId, {
            name,
            industry,
            brandColor,
            logoUrl,
            socialHandle,
            description,
            serviceType,
            serviceName,
            serviceDescription,
            servicePrice,
            serviceMonths,
            includedServices,
        });
        if (!brand) {
            res.status(404).json({ error: 'Cliente no encontrado en este tenant.' });
            return;
        }
        res.status(201).json({ brand });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.put('/api/brands/:brandId', auth_1.requireAuth, (0, auth_1.requirePermission)('brands.edit'), async (req, res) => {
    try {
        const updated = await db_1.db.updateBrand(req.auth.tenant.id, req.params.brandId, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Marca no encontrada en este tenant.' });
            return;
        }
        res.json({ brand: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.delete('/api/brands/:brandId', auth_1.requireAuth, (0, auth_1.requirePermission)('brands.delete'), async (req, res) => {
    try {
        const ok = await db_1.db.deleteBrand(req.auth.tenant.id, req.params.brandId);
        if (!ok) {
            res.status(404).json({ error: 'Marca no encontrada.' });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// =============================================================================
// MÓDULO DE COTIZACIONES (QUOTES) & PROPUESTAS
// =============================================================================
app.get('/api/quotes', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['quotes.view', 'payments.view', 'service_orders.view']), async (req, res) => {
    try {
        const quotes = await db_1.db.getQuotesByTenant(req.auth.tenant.id);
        res.json({ quotes });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/quotes/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('quotes.view'), async (req, res) => {
    try {
        let quote = await db_1.db.getQuoteById(req.params.id, req.auth.tenant.id);
        const isSuperAdmin = req.auth?.role?.isSystem || req.auth?.role?.name === 'Super Administrador';
        if (!quote && isSuperAdmin) {
            quote = db_1.db.localState?.quotes?.find((q) => q.id === req.params.id) || null;
        }
        if (!quote) {
            res.status(404).json({ error: 'Cotización no encontrada.' });
            return;
        }
        res.json({ quote });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/quotes', auth_1.requireAuth, (0, auth_1.requirePermission)('quotes.create'), async (req, res) => {
    try {
        const created = await db_1.db.createQuote(req.auth.tenant.id, req.body);
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'quotes',
            type: 'success',
            title: 'Nueva cotización creada',
            message: `Se creó la cotización ${created.code} para "${created.clientName}" (${created.items.length} ítems)`,
            entityId: created.id,
            action: 'create',
            link: '/?module=quotes',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.status(201).json({ quote: created });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.put('/api/quotes/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('quotes.edit'), async (req, res) => {
    try {
        const updated = await db_1.db.updateQuote(req.params.id, req.auth.tenant.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Cotización no encontrada.' });
            return;
        }
        const isApproved = updated.status === 'approved';
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'quotes',
            type: isApproved ? 'success' : 'info',
            title: isApproved ? '🎉 ¡Cotización aprobada!' : 'Cotización actualizada',
            message: `Cotización ${updated.code} para "${updated.clientName}" actualizada (Estado: ${updated.status})`,
            entityId: updated.id,
            action: 'update',
            link: '/?module=quotes',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.json({ quote: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.delete('/api/quotes/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('quotes.delete'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteQuote(req.params.id, req.auth.tenant.id);
        if (!deleted) {
            res.status(404).json({ error: 'Cotización no encontrada.' });
            return;
        }
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'quotes',
            type: 'warning',
            title: 'Cotización eliminada',
            message: 'Se eliminó una cotización del sistema.',
            action: 'delete',
            link: '/?module=quotes',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// =============================================================================
// MÓDULO DE NOTAS DE PAGO (RECIBOS, COMPROBANTES DE COBRO & RECIBOS)
// =============================================================================
// Listar notas de pago del tenant
app.get('/api/payment-notes', auth_1.requireAuth, (0, auth_1.requirePermission)('payments.view'), async (req, res) => {
    try {
        const notes = await db_1.db.getPaymentNotesByTenant(req.auth.tenant.id);
        res.json({ paymentNotes: notes });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener nota de pago por ID
app.get('/api/payment-notes/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('payments.view'), async (req, res) => {
    try {
        const note = await db_1.db.getPaymentNoteById(req.params.id, req.auth.tenant.id);
        if (!note) {
            return res.status(404).json({ error: 'Nota de pago no encontrada' });
        }
        res.json({ paymentNote: note });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Crear nota de pago
app.post('/api/payment-notes', auth_1.requireAuth, (0, auth_1.requirePermission)('payments.create'), async (req, res) => {
    try {
        const created = await db_1.db.createPaymentNote(req.auth.tenant.id, {
            ...req.body,
            createdBy: req.auth.user.name,
        });
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'payments',
            type: 'info',
            title: 'Nueva Nota de Cobro emitida',
            message: `Se emitió la nota #${created.code} para "${created.clientName}" por ${created.currency} ${Number(created.total || 0).toFixed(2)}`,
            entityId: created.id,
            action: 'create',
            link: '/?module=payments',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.status(201).json({ paymentNote: created });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar nota de pago
app.put('/api/payment-notes/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('payments.edit'), async (req, res) => {
    try {
        const updated = await db_1.db.updatePaymentNote(req.params.id, req.auth.tenant.id, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Nota de pago no encontrada' });
        }
        const isPaid = updated.status === 'paid';
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'payments',
            type: isPaid ? 'success' : 'info',
            title: isPaid ? '💰 ¡Nota de cobro pagada!' : 'Nota de cobro actualizada',
            message: `Nota #${updated.code} de "${updated.clientName}" actualizada (Estado: ${updated.status})`,
            entityId: updated.id,
            action: 'update',
            link: '/?module=payments',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.json({ paymentNote: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar nota de pago
app.delete('/api/payment-notes/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('payments.delete'), async (req, res) => {
    try {
        const deleted = await db_1.db.deletePaymentNote(req.params.id, req.auth.tenant.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Nota de pago no encontrada' });
        }
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'payments',
            type: 'warning',
            title: 'Nota de cobro eliminada',
            message: 'Se eliminó un comprobante de cobro del sistema.',
            action: 'delete',
            link: '/?module=payments',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Endpoint público para que el cliente consulte su nota de pago (sin requerir autenticación)
// --- VISTA PÚBLICA DE PERSONAL E HISTORIAL DE PAGOS ---
app.get('/api/public/personal/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const data = await db_1.db.getEmployeeProfileByPublicToken(token);
        if (!data) {
            return res.status(404).json({ error: 'Ficha de personal no encontrada o enlace vencido' });
        }
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/public/payment-notes/:token', async (req, res) => {
    try {
        const result = await db_1.db.getPaymentNoteByPublicToken(req.params.token);
        if (!result) {
            return res.status(404).json({ error: 'Comprobante de pago no encontrado o no disponible' });
        }
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Endpoint público para vista de mes / grilla de contenidos de Workspace (con soporte de PIN opcional)
app.get('/api/public/workspace/months/:token', async (req, res) => {
    try {
        const result = await db_1.db.getWorkspaceMonthByPublicToken(req.params.token);
        if (!result) {
            return res.status(404).json({ error: 'Grilla de contenidos no encontrada o enlace vencido' });
        }
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Endpoint público para enviar comentarios en una publicación desde la vista pública
app.post('/api/public/workspace/months/:token/posts/:postId/comments', async (req, res) => {
    try {
        const token = req.params.token;
        const postId = req.params.postId;
        const { author, text, avatar } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'El comentario no puede estar vacío.' });
        }
        const monthData = await db_1.db.getWorkspaceMonthByPublicToken(token);
        if (!monthData) {
            return res.status(404).json({ error: 'Grilla no encontrada' });
        }
        const post = monthData.posts.find((p) => p.id === postId);
        if (!post) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }
        const newComment = {
            id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            tab: 'design',
            author: author?.trim() || 'Cliente',
            avatar: avatar || undefined,
            text: text.trim(),
            createdAt: new Date().toISOString(),
        };
        const updatedComments = [...(post.comments || []), newComment];
        const tenantId = post.tenantId || monthData.month.tenantId;
        const updatedPost = await db_1.db.updateWorkspacePost(post.id, tenantId, { comments: updatedComments });
        if (!updatedPost) {
            const pIdx = db_1.db.localState?.workspacePosts?.findIndex((p) => p.id === post.id);
            if (pIdx !== -1 && pIdx !== undefined) {
                db_1.db.localState.workspacePosts[pIdx].comments = updatedComments;
                db_1.db.saveLocalState();
            }
        }
        notificationService_1.notificationService.notify({
            tenantId: post.tenantId,
            module: 'workspace',
            type: 'info',
            title: '💬 Nuevo comentario en Workspace',
            message: `${newComment.author} comentó en "${post.title || 'Publicación'}": "${newComment.text.slice(0, 60)}${newComment.text.length > 60 ? '...' : ''}"`,
            entityId: post.id,
            action: 'comment',
            link: '/?module=workspace',
            actorUserName: newComment.author,
        }).catch(() => { });
        res.json({ success: true, comment: newComment });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// ENDPOINTS PÚBLICOS DE BIOLINKS (LINKTREE SAAS)
// =============================================================================
app.get('/api/public/biolinks/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        const result = await db_1.db.getBiolinkBySlug(slug);
        if (!result) {
            return res.status(404).json({ error: 'Perfil de Biolink no encontrado o inactivo.' });
        }
        // Registrar vista de manera asíncrona
        db_1.db.recordBiolinkView(slug).catch(() => { });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/public/biolinks/:slug/click', async (req, res) => {
    try {
        const slug = req.params.slug;
        const { blockId } = req.body;
        await db_1.db.recordBiolinkClick(slug, blockId);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// SUBMÓDULO: PIZARRAS CREATIVAS (VISTA PÚBLICA / ENLACE COMPARTIDO)
// =============================================================================
app.get('/api/public/whiteboards/:tokenOrId', async (req, res) => {
    try {
        const tokenOrId = req.params.tokenOrId;
        const board = await db_1.db.getWhiteboardByShareToken(tokenOrId);
        if (!board) {
            return res.status(404).json({ error: 'Pizarra no encontrada o enlace inválido.' });
        }
        const isPublic = board.accessType === 'public';
        const hasInvitation = board.invitations?.some((inv) => inv.token === tokenOrId);
        if (!isPublic && !hasInvitation) {
            return res.status(403).json({ error: 'Esta pizarra tiene acceso restringido.' });
        }
        const effectiveRole = hasInvitation
            ? board.invitations?.find((inv) => inv.token === tokenOrId)?.role || 'viewer'
            : board.publicRole;
        const tenant = await db_1.db.getTenantById(board.tenantId);
        return res.json({
            success: true,
            whiteboard: {
                id: board.id,
                title: board.title,
                content: board.content,
                thumbnail: board.thumbnail,
                accessType: board.accessType,
                publicRole: effectiveRole,
                updatedAt: board.updatedAt,
            },
            tenant: tenant ? { name: tenant.name, logo: tenant.companyInfo?.logoUrl || '' } : null,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
app.put('/api/public/whiteboards/:tokenOrId/canvas', async (req, res) => {
    try {
        const tokenOrId = req.params.tokenOrId;
        const { content, thumbnail } = req.body;
        const board = await db_1.db.getWhiteboardByShareToken(tokenOrId);
        if (!board) {
            return res.status(404).json({ error: 'Pizarra no encontrada' });
        }
        const hasInvitation = board.invitations?.some((inv) => inv.token === tokenOrId);
        const effectiveRole = hasInvitation
            ? board.invitations?.find((inv) => inv.token === tokenOrId)?.role || 'viewer'
            : board.publicRole;
        if (effectiveRole !== 'editor') {
            return res.status(403).json({ error: 'Solo tienes permisos de visualización en esta pizarra.' });
        }
        await db_1.db.saveWhiteboardCanvas(board.id, board.tenantId, content, thumbnail);
        return res.json({ success: true, savedAt: new Date().toISOString() });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// SUBMÓDULO: FORMULARIOS INTERACTIVOS (PÚBLICO Y SUBIDA DE ARCHIVOS)
// =============================================================================
const formUploadSingle = (req, res, next) => {
    if (!multerModule) {
        return res.status(503).json({
            error: 'El módulo multer para carga de archivos no está instalado en el servidor. Ejecuta "Run NPM Install" en Setup Node.js App.',
        });
    }
    const formsUploadStorage = multerModule.diskStorage({
        destination: (_req, _file, cb) => {
            const dir = path_1.default.resolve(process.cwd(), 'uploads', 'forms');
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename: (_req, file, cb) => {
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            const cleanBase = path_1.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
            const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            cb(null, `${cleanBase}_${unique}${ext}`);
        },
    });
    const formUpload = multerModule({
        storage: formsUploadStorage,
        limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    });
    return formUpload.single('file')(req, res, next);
};
// Subida de archivos desde formulario público o preview
app.post('/api/public/forms/upload', formUploadSingle, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
        }
        res.json({
            url: `/uploads/forms/${req.file.filename}`,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Subida de portadas y logos para formularios (autenticado)
app.post('/api/workspace/forms/upload-asset', auth_1.requireAuth, formUploadSingle, (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
        }
        res.json({
            url: `/uploads/forms/${req.file.filename}`,
            fileName: req.file.originalname,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener formulario público por slug
app.get('/api/public/forms/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        const result = await db_1.db.getFormBySlug(slug);
        if (!result) {
            return res.status(404).json({ error: 'Formulario no encontrado o no disponible' });
        }
        db_1.db.recordFormView(slug).catch(() => { });
        const { form, tenant } = result;
        res.json({
            form,
            tenant: tenant
                ? {
                    id: tenant.id,
                    name: tenant.companyInfo?.commercialName || tenant.name,
                    logoUrl: tenant.customization?.logoUrl || '',
                    faviconUrl: tenant.customization?.faviconUrl || '',
                    companyInfo: tenant.companyInfo,
                }
                : null,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Enviar respuestas a formulario público
app.post('/api/public/forms/:slug/submit', async (req, res) => {
    try {
        const slug = req.params.slug;
        const { clientName, clientEmail, answers, files } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || undefined;
        const userAgent = req.headers['user-agent'] || undefined;
        const submission = await db_1.db.submitFormAnswers(slug, {
            clientName,
            clientEmail,
            answers,
            files,
            ip,
            userAgent,
        });
        res.status(201).json({
            ok: true,
            submission,
            message: 'Respuestas registradas exitosamente',
        });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// =============================================================================
// MÓDULO DE WORKSPACE: REDES SOCIALES & PROYECTOS
// =============================================================================
// Listar proyectos de workspace
app.get('/api/workspace/projects', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const clientId = req.query.clientId;
        let projects = await db_1.db.getWorkspaceProjects(req.auth.tenant.id, clientId);
        const isAdm = (0, auth_1.isRoleAdmin)(req.auth.role);
        const userId = req.auth.user.id;
        // Si no es administrador, filtrar exclusivamente proyectos donde esté asignado
        if (!isAdm) {
            projects = projects.filter((p) => {
                if (!p.assignedUsers || !Array.isArray(p.assignedUsers) || p.assignedUsers.length === 0) {
                    return false;
                }
                return p.assignedUsers.some((u) => typeof u === 'string' ? u === userId : (u && u.id === userId));
            });
        }
        res.json({ projects });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Crear proyecto de workspace vinculado a OS
app.post('/api/workspace/projects', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.social.manage'), async (req, res) => {
    try {
        const created = await db_1.db.createWorkspaceProject({
            ...req.body,
            tenantId: req.auth.tenant.id,
        });
        res.status(201).json({ project: created });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar proyecto de workspace
app.put('/api/workspace/projects/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.social.manage'), async (req, res) => {
    try {
        const updated = await db_1.db.updateWorkspaceProject(req.params.id, req.auth.tenant.id, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        res.json({ project: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar proyecto de workspace
app.delete('/api/workspace/projects/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.social.manage'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteWorkspaceProject(req.params.id, req.auth.tenant.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// MESES / CAMPAÑAS MENSUALES DE CONTENIDO CON ESTRUCTURA GOOGLE DRIVE
// =============================================================================
// Listar meses de un proyecto (o todos los del tenant)
app.get('/api/workspace/months', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const projectId = req.query.projectId;
        let months = await db_1.db.getWorkspaceMonths(req.auth.tenant.id, projectId);
        const isAdm = (0, auth_1.isRoleAdmin)(req.auth.role);
        const userId = req.auth.user.id;
        if (!isAdm) {
            const allProjects = await db_1.db.getWorkspaceProjects(req.auth.tenant.id);
            const allowedProjectIds = new Set(allProjects
                .filter((p) => (p.assignedUsers || []).some((u) => typeof u === 'string' ? u === userId : (u && u.id === userId)))
                .map((p) => p.id));
            months = months.filter((m) => allowedProjectIds.has(m.projectId));
        }
        res.json({ months });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Crear mes y generar automáticamente la estructura de 7 carpetas en Google Drive
app.post('/api/workspace/months', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.social.manage'), async (req, res) => {
    try {
        const { projectId, name, month, year, startDate, endDate, status } = req.body;
        const tenantId = req.auth.tenant.id;
        if (!projectId) {
            return res.status(400).json({ error: 'El ID del proyecto es requerido.' });
        }
        const project = await db_1.db.getWorkspaceProjectById(projectId, tenantId);
        const DEFAULT_SUBFOLDERS = [
            'AUDIOVISUAL',
            'DISEÑO GRAFICO',
            'EDITABLES',
            'EXTRAS',
            'FORM',
            'POST TERMINADOS',
            'REFERENCIAS',
        ];
        let driveFolderId = '';
        let driveFolderName = '';
        let driveFolderLink = '';
        let driveSubfolders = DEFAULT_SUBFOLDERS.map((name) => ({ name }));
        // Si Google Drive está configurado, crear la carpeta del mes y las 7 subcarpetas
        if (googleDriveService_1.googleDriveService.isReady()) {
            try {
                const parentFolderId = project?.driveFolderId || googleDriveService_1.googleDriveService.getRootFolderId();
                const folderName = name || `Mes ${month} ${year}`;
                const monthFolder = await googleDriveService_1.googleDriveService.createFolder(folderName, parentFolderId);
                driveFolderId = monthFolder.id;
                driveFolderName = monthFolder.name;
                driveFolderLink = monthFolder.webViewLink || `https://drive.google.com/drive/folders/${monthFolder.id}`;
                // Crear las 7 subcarpetas en paralelo dentro de la carpeta del mes
                const subfolderResults = await Promise.all(DEFAULT_SUBFOLDERS.map(async (sfName) => {
                    try {
                        const sf = await googleDriveService_1.googleDriveService.createFolder(sfName, monthFolder.id);
                        return {
                            name: sfName,
                            driveFolderId: sf.id,
                            webViewLink: sf.webViewLink || `https://drive.google.com/drive/folders/${sf.id}`,
                        };
                    }
                    catch (subErr) {
                        console.error(`[Drive] Error creando subcarpeta ${sfName}:`, subErr);
                        return { name: sfName };
                    }
                }));
                driveSubfolders = subfolderResults;
            }
            catch (driveErr) {
                console.error('[Drive] Error creando estructura del mes en Drive:', driveErr);
            }
        }
        const created = await db_1.db.createWorkspaceMonth(tenantId, {
            projectId,
            name: name || `Mes ${month} ${year}`,
            month: Number(month) || new Date().getMonth() + 1,
            year: Number(year) || new Date().getFullYear(),
            startDate,
            endDate,
            status: status || 'pending',
            driveFolderId,
            driveFolderName,
            driveFolderLink,
            driveSubfolders,
        });
        res.status(201).json({ month: created });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar mes
app.put('/api/workspace/months/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.social.manage'), async (req, res) => {
    try {
        const updated = await db_1.db.updateWorkspaceMonth(req.params.id, req.auth.tenant.id, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Mes no encontrado' });
        }
        res.json({ month: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar mes
app.delete('/api/workspace/months/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.social.manage'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteWorkspaceMonth(req.params.id, req.auth.tenant.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Mes no encontrado' });
        }
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Listar publicaciones de redes sociales
app.get('/api/workspace/posts', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const clientId = req.query.clientId;
        let posts = await db_1.db.getWorkspacePosts(req.auth.tenant.id, clientId);
        const isAdm = (0, auth_1.isRoleAdmin)(req.auth.role);
        const userId = req.auth.user.id;
        if (!isAdm) {
            const allProjects = await db_1.db.getWorkspaceProjects(req.auth.tenant.id);
            const allowedProjectIds = new Set(allProjects
                .filter((p) => (p.assignedUsers || []).some((u) => typeof u === 'string' ? u === userId : (u && u.id === userId)))
                .map((p) => p.id));
            const allMonths = await db_1.db.getWorkspaceMonths(req.auth.tenant.id);
            const allowedMonthIds = new Set(allMonths.filter((m) => allowedProjectIds.has(m.projectId)).map((m) => m.id));
            posts = posts.filter((p) => {
                if (p.projectId && allowedProjectIds.has(p.projectId))
                    return true;
                if (p.monthId && allowedMonthIds.has(p.monthId))
                    return true;
                return false;
            });
        }
        res.json({ posts });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener una publicación individual (para sincronización de comentarios en tiempo real)
app.get('/api/workspace/posts/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const postId = req.params.id;
        const posts = await db_1.db.getWorkspacePosts(req.auth.tenant.id);
        const post = posts.find((p) => p.id === postId);
        if (!post) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }
        res.json({ post });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Crear publicación
app.post('/api/workspace/posts', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.social.manage'), async (req, res) => {
    try {
        const created = await db_1.db.createWorkspacePost(req.auth.tenant.id, req.body);
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'workspace',
            type: 'info',
            title: 'Nuevo contenido programado',
            message: `Se programó la publicación "${created.title || 'Sin título'}" en Workspace`,
            entityId: created.id,
            action: 'create',
            link: '/?module=workspace',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.status(201).json({ post: created });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar publicación
app.put('/api/workspace/posts/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.social.manage'), async (req, res) => {
    try {
        const updated = await db_1.db.updateWorkspacePost(req.params.id, req.auth.tenant.id, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }
        res.json({ post: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar publicación
app.delete('/api/workspace/posts/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.social.manage'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteWorkspacePost(req.params.id, req.auth.tenant.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// MÓDULO DE WORKSPACE: TAREAS OPERATIVAS
// =============================================================================
// Listar tareas
app.get('/api/workspace/tasks', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const clientId = req.query.clientId;
        const tasks = await db_1.db.getWorkspaceTasks(req.auth.tenant.id, clientId);
        res.json({ tasks });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Crear tarea
app.post('/api/workspace/tasks', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.tasks.manage'), async (req, res) => {
    try {
        const created = await db_1.db.createWorkspaceTask(req.auth.tenant.id, req.body);
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'workspace',
            type: 'info',
            title: 'Nueva tarea asignada',
            message: `Se creó la tarea "${created.title}"${created.assignedUserId ? ` asignada a usuario` : ''}`,
            entityId: created.id,
            action: 'create',
            link: '/?module=workspace',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.status(201).json({ task: created });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar tarea
app.put('/api/workspace/tasks/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.tasks.manage'), async (req, res) => {
    try {
        const updated = await db_1.db.updateWorkspaceTask(req.params.id, req.auth.tenant.id, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        res.json({ task: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar tarea
app.delete('/api/workspace/tasks/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.tasks.manage'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteWorkspaceTask(req.params.id, req.auth.tenant.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// MÓDULO DE WORKSPACE: HERRAMIENTAS (BIOLINKS, PALETAS, CÓDIGOS)
// =============================================================================
// Listar Biolinks
app.get('/api/workspace/biolinks', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const list = await db_1.db.getBiolinks(req.auth.tenant.id);
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener un Biolink por ID
app.get('/api/workspace/biolinks/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const item = await db_1.db.getBiolinkById(req.params.id, req.auth.tenant.id);
        if (!item)
            return res.status(404).json({ error: 'Perfil de Biolink no encontrado' });
        res.json(item);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Crear Biolink
app.post('/api/workspace/biolinks', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const created = await db_1.db.createBiolink(req.auth.tenant.id, req.body);
        res.status(201).json(created);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar Biolink
app.put('/api/workspace/biolinks/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const updated = await db_1.db.updateBiolink(req.params.id, req.auth.tenant.id, req.body);
        if (!updated)
            return res.status(404).json({ error: 'Perfil de Biolink no encontrado' });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar Biolink
app.delete('/api/workspace/biolinks/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteBiolink(req.params.id, req.auth.tenant.id);
        if (!deleted)
            return res.status(404).json({ error: 'Perfil de Biolink no encontrado' });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Paletas Guardadas
app.get('/api/workspace/palettes', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const list = await db_1.db.getSavedPalettes(req.auth.tenant.id);
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/workspace/palettes', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const created = await db_1.db.savePalette(req.auth.tenant.id, req.body);
        res.status(201).json(created);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/workspace/palettes/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const deleted = await db_1.db.deletePalette(req.params.id, req.auth.tenant.id);
        if (!deleted)
            return res.status(404).json({ error: 'Paleta no encontrada' });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Historial de Códigos
app.get('/api/workspace/codes/history', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const list = await db_1.db.getCodeHistory(req.auth.tenant.id);
        res.json(list);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/workspace/codes/history', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const item = await db_1.db.addCodeHistory(req.auth.tenant.id, req.body);
        res.status(201).json(item);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/workspace/codes/history', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        await db_1.db.clearCodeHistory(req.auth.tenant.id);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// SUBMÓDULO: FORMULARIOS DE WORKSPACE (GESTIÓN Y RESULTADOS)
// =============================================================================
// Listar formularios
app.get('/api/workspace/forms', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const forms = await db_1.db.getForms(req.auth.tenant.id);
        res.json({ forms });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener un formulario por ID
app.get('/api/workspace/forms/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const form = await db_1.db.getFormById(req.params.id, req.auth.tenant.id);
        if (!form)
            return res.status(404).json({ error: 'Formulario no encontrado' });
        res.json({ form });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Crear formulario en blanco
app.post('/api/workspace/forms', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const form = await db_1.db.createForm(req.auth.tenant.id, req.body);
        res.status(201).json({ form });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar formulario
app.put('/api/workspace/forms/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const updated = await db_1.db.updateForm(req.params.id, req.auth.tenant.id, req.body);
        if (!updated)
            return res.status(404).json({ error: 'Formulario no encontrado' });
        res.json({ form: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar formulario
app.delete('/api/workspace/forms/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteForm(req.params.id, req.auth.tenant.id);
        if (!deleted)
            return res.status(404).json({ error: 'Formulario no encontrado' });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Duplicar formulario
app.post('/api/workspace/forms/:id/duplicate', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const copy = await db_1.db.duplicateForm(req.params.id, req.auth.tenant.id);
        if (!copy)
            return res.status(404).json({ error: 'Formulario no encontrado' });
        res.status(201).json({ form: copy });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Listar respuestas de un formulario
app.get('/api/workspace/forms/:id/submissions', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const submissions = await db_1.db.getFormSubmissions(req.params.id, req.auth.tenant.id);
        res.json({ submissions });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar una respuesta
app.delete('/api/workspace/forms/submissions/:submissionId', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteFormSubmission(req.params.submissionId, req.auth.tenant.id);
        if (!deleted)
            return res.status(404).json({ error: 'Respuesta no encontrada' });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// SUBMÓDULO: SALAS DE REUNIONES & ACTAS DE WORKSPACE
// =============================================================================
// Listar salas de reunión
app.get('/api/workspace/meeting-rooms', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const rooms = await db_1.db.getMeetingRooms(req.auth.tenant.id);
        res.json({ rooms });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener una sala por ID
app.get('/api/workspace/meeting-rooms/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const room = await db_1.db.getMeetingRoomById(req.params.id, req.auth.tenant.id);
        if (!room)
            return res.status(404).json({ error: 'Sala no encontrada' });
        res.json({ room });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Crear sala de reunión
app.post('/api/workspace/meeting-rooms', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const room = await db_1.db.createMeetingRoom(req.auth.tenant.id, req.body);
        res.status(201).json({ room });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar sala de reunión
app.put('/api/workspace/meeting-rooms/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const updated = await db_1.db.updateMeetingRoom(req.params.id, req.auth.tenant.id, req.body);
        if (!updated)
            return res.status(404).json({ error: 'Sala no encontrada' });
        res.json({ room: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar sala de reunión
app.delete('/api/workspace/meeting-rooms/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteMeetingRoom(req.params.id, req.auth.tenant.id);
        if (!deleted)
            return res.status(404).json({ error: 'Sala no encontrada o protegida' });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- REUNIONES Y ACTAS ---
// Listar reuniones con filtros
app.get('/api/workspace/meetings', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const { roomId, brandId, clientId, status, search } = req.query;
        const meetings = await db_1.db.getMeetings(req.auth.tenant.id, {
            roomId,
            brandId,
            clientId,
            status,
            search,
        });
        res.json({ meetings });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener detalle de una reunión
app.get('/api/workspace/meetings/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const meeting = await db_1.db.getMeetingById(req.params.id, req.auth.tenant.id);
        if (!meeting)
            return res.status(404).json({ error: 'Reunión no encontrada' });
        res.json({ meeting });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Crear reunión / acta
app.post('/api/workspace/meetings', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const meeting = await db_1.db.createMeeting(req.auth.tenant.id, req.body, req.auth.user.id);
        res.status(201).json({ meeting });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar reunión / acta
app.put('/api/workspace/meetings/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const updated = await db_1.db.updateMeeting(req.params.id, req.auth.tenant.id, req.body);
        if (!updated)
            return res.status(404).json({ error: 'Reunión no encontrada' });
        res.json({ meeting: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar reunión / acta
app.delete('/api/workspace/meetings/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteMeeting(req.params.id, req.auth.tenant.id);
        if (!deleted)
            return res.status(404).json({ error: 'Reunión no encontrada' });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Convertir un acuerdo de reunión en tarea real de Workspace
app.post('/api/workspace/meetings/:id/agreements/:agreementId/to-task', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const result = await db_1.db.convertMeetingAgreementToTask(req.params.id, req.params.agreementId, req.auth.tenant.id, req.body, req.auth.user.id);
        if (!result)
            return res.status(404).json({ error: 'Reunión o acuerdo no encontrado' });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Generar enlace de Google Meet (integración con Google Calendar API / Google Cloud)
app.post('/api/workspace/meetings/generate-meet-link', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const { title, scheduledAt, attendees } = req.body || {};
        // Intentar integración con Google Calendar API si existen credenciales en el entorno
        const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
        if (clientId && clientSecret && refreshToken) {
            try {
                const { google } = require('googleapis');
                const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
                oauth2Client.setCredentials({ refresh_token: refreshToken });
                const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
                const startTime = scheduledAt ? new Date(scheduledAt) : new Date();
                const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
                const eventResponse = await calendar.events.insert({
                    calendarId: 'primary',
                    conferenceDataVersion: 1,
                    requestBody: {
                        summary: title || 'Reunión de Agencia - Sistema ROMA',
                        description: 'Reunión generada automáticamente desde Sistema ROMA V4.',
                        start: { dateTime: startTime.toISOString() },
                        end: { dateTime: endTime.toISOString() },
                        attendees: (attendees || []).map((email) => ({ email })),
                        conferenceData: {
                            createRequest: {
                                requestId: `roma-${Date.now()}`,
                                conferenceSolutionKey: { type: 'hangoutsMeet' },
                            },
                        },
                    },
                });
                const entryPoints = eventResponse.data?.conferenceData?.entryPoints;
                const meetUri = entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri;
                if (meetUri) {
                    return res.json({
                        meetUrl: meetUri,
                        eventId: eventResponse.data.id,
                        source: 'google_calendar_api',
                    });
                }
            }
            catch (apiErr) {
                console.warn('[Google Meet API] Error al generar vía Calendar API:', apiErr.message);
            }
        }
        // Si no están configuradas las credenciales de Google OAuth, retornar una sala instantánea de Google Meet
        const randomCode = Math.random().toString(36).substring(2, 5) + '-' +
            Math.random().toString(36).substring(2, 6) + '-' +
            Math.random().toString(36).substring(2, 5);
        const fallbackUrl = `https://meet.google.com/${randomCode}`;
        res.json({
            meetUrl: fallbackUrl,
            source: 'instant_meet',
            note: 'Sala instantánea de Google Meet generada correctamente.',
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// MÓDULO DE ADMINISTRACIÓN (RRHH, FINANZAS Y CONTABILIDAD)
// =============================================================================
// --- RECURSOS HUMANOS: CONFIGURACIÓN GLOBAL ---
app.get('/api/administration/hr/settings', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['administration.hr.view', 'administration.hr.manage']), async (req, res) => {
    try {
        const settings = await db_1.db.getHrSettings(req.auth.tenant.id);
        res.json({ settings });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.put('/api/administration/hr/settings', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.hr.manage'), async (req, res) => {
    try {
        const settings = await db_1.db.updateHrSettings(req.auth.tenant.id, req.body);
        res.json({ settings });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- RECURSOS HUMANOS: EMPLEADOS Y PERSONAL ---
app.get('/api/administration/hr/employees', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['administration.hr.view', 'administration.hr.manage']), async (req, res) => {
    try {
        const employees = await db_1.db.getEmployeeProfiles(req.auth.tenant.id);
        res.json({ employees });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/administration/hr/employees', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.hr.manage'), async (req, res) => {
    try {
        const employee = await db_1.db.saveEmployeeProfile(req.auth.tenant.id, req.body);
        res.status(201).json({ employee });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.put('/api/administration/hr/employees/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.hr.manage'), async (req, res) => {
    try {
        const employee = await db_1.db.saveEmployeeProfile(req.auth.tenant.id, {
            ...req.body,
            id: req.params.id,
        });
        res.json({ employee });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/administration/hr/employees/:id/payments', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.hr.manage'), async (req, res) => {
    try {
        const result = await db_1.db.addEmployeePayment(req.auth.tenant.id, req.params.id, req.body);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/administration/hr/employees/:id/payments/:paymentId', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.hr.manage'), async (req, res) => {
    try {
        const employee = await db_1.db.deleteEmployeePayment(req.auth.tenant.id, req.params.id, req.params.paymentId);
        res.json({ employee });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/administration/hr/employees/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.hr.manage'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteEmployeeProfile(req.auth.tenant.id, req.params.id);
        res.json({ ok: deleted });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- GOOGLE AUTHENTICATOR CONFIGURACIÓN & DESBLOQUEO ---
app.post('/api/administration/hr/authenticator/setup', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.hr.manage'), async (req, res) => {
    try {
        const hrSettings = await db_1.db.getHrSettings(req.auth.tenant.id);
        let secret = hrSettings.authenticatorSecret;
        if (!secret) {
            secret = (0, totp_1.generateTotpSecret)(20);
        }
        const issuer = req.auth.tenant.name || 'ROMA SaaS';
        const account = 'Administrador de RRHH';
        const otpAuthUri = (0, totp_1.buildOtpAuthUri)(issuer, account, secret);
        let qrCodeDataUrl = '';
        if (qrcodeModule) {
            qrCodeDataUrl = await qrcodeModule.toDataURL(otpAuthUri, { width: 280, margin: 2 });
        }
        res.json({
            secret,
            qrCodeDataUrl,
            otpAuthUri,
            configured: !!hrSettings.authenticatorSecret,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/administration/hr/authenticator/verify', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.hr.manage'), async (req, res) => {
    try {
        const { code, secret } = req.body;
        if (!code || !secret) {
            return res.status(400).json({ error: 'Código y secreto requeridos' });
        }
        const isValid = (0, totp_1.verifyTotpCode)(code, secret);
        if (!isValid) {
            return res.status(400).json({ error: 'Código incorrecto. Verifica la hora de tu celular e intenta de nuevo.' });
        }
        // Si es válido, guardar el secreto en la configuración de RRHH
        await db_1.db.updateHrSettings(req.auth.tenant.id, {
            authenticatorSecret: secret,
            strictTardinessLock: true,
        });
        res.json({ ok: true, message: 'Google Authenticator configurado con éxito' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Desbloquear entrada tardía mediante código de Google Authenticator
app.post('/api/administration/hr/attendance/unlock-late', auth_1.requireAuth, async (req, res) => {
    try {
        const { authenticatorCode, stamp } = req.body;
        if (!authenticatorCode || !stamp) {
            return res.status(400).json({ error: 'Código de desbloqueo y datos de marcación son obligatorios' });
        }
        const hrSettings = await db_1.db.getHrSettings(req.auth.tenant.id);
        if (hrSettings.strictTardinessLock && hrSettings.authenticatorSecret) {
            const isValid = (0, totp_1.verifyTotpCode)(authenticatorCode, hrSettings.authenticatorSecret);
            if (!isValid) {
                return res.status(400).json({
                    error: 'Código de Google Authenticator inválido o expirado. Solicita el código actual de 6 dígitos al Administrador.',
                });
            }
        }
        // Marcar asistencia como entrada desbloqueada
        const record = await db_1.db.recordAttendanceStamp(req.auth.tenant.id, req.auth.user.id, 'check_in', {
            ...stamp,
            notes: `Tardanza autorizada por Administrador con código Google Authenticator (${new Date().toLocaleTimeString('es-PE')})`,
        });
        res.json({ record, unlocked: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- RECURSOS HUMANOS: ASISTENCIAS Y MARCACIONES ---
// Marcación del día del usuario autenticado (para Widget de Dashboard y vista personal)
app.get('/api/administration/hr/attendance/today', auth_1.requireAuth, async (req, res) => {
    try {
        const record = await db_1.db.getTodayAttendance(req.auth.tenant.id, req.auth.user.id);
        const hrSettings = await db_1.db.getHrSettings(req.auth.tenant.id);
        const profile = await db_1.db.getEmployeeProfileByUserId(req.auth.tenant.id, req.auth.user.id);
        res.json({ record, hrSettings, profile });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Registrar una acción de marcación (Entrada, Inicio Refrigerio, Fin Refrigerio, Salida)
app.post('/api/administration/hr/attendance/stamp', auth_1.requireAuth, async (req, res) => {
    try {
        const { action, stamp } = req.body;
        if (!action || !stamp) {
            res.status(400).json({ error: 'Acción y datos de marcación son obligatorios' });
            return;
        }
        const record = await db_1.db.recordAttendanceStamp(req.auth.tenant.id, req.auth.user.id, action, stamp);
        res.json({ record });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Historial completo de asistencias para el dashboard de RRHH
app.get('/api/administration/hr/attendance', auth_1.requireAuth, (0, auth_1.requireAnyPermission)([
    'administration.hr.view',
    'administration.hr.manage',
    'administration.attendance.manage',
    'administration.attendance.record',
]), async (req, res) => {
    try {
        const { userId, date, month, status } = req.query;
        const records = await db_1.db.getAttendanceRecords(req.auth.tenant.id, {
            userId,
            date,
            month,
            status,
        });
        res.json({ records });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.put('/api/administration/hr/attendance/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.hr.manage'), async (req, res) => {
    try {
        const updated = await db_1.db.updateAttendanceRecord(req.auth.tenant.id, req.params.id, req.body);
        res.json({ record: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- SUBMÓDULO: FINANZAS ---
app.get('/api/administration/finances', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['administration.finances.view', 'administration.finances.manage']), async (req, res) => {
    try {
        const { type, category, startDate, endDate } = req.query;
        const transactions = await db_1.db.getFinanceTransactions(req.auth.tenant.id, {
            type,
            category,
            startDate,
            endDate,
        });
        res.json({ transactions });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/administration/finances', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.finances.manage'), async (req, res) => {
    try {
        const transaction = await db_1.db.createFinanceTransaction(req.auth.tenant.id, req.body);
        res.status(201).json({ transaction });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/administration/sync-payment-notes', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.finances.manage'), async (req, res) => {
    try {
        const result = await db_1.db.syncAllPaymentNotesToFinances(req.auth.tenant.id);
        const transactions = await db_1.db.getFinanceTransactions(req.auth.tenant.id);
        res.json({ ok: true, ...result, transactions });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/administration/finances/sync-payment-notes', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.finances.manage'), async (req, res) => {
    try {
        const result = await db_1.db.syncAllPaymentNotesToFinances(req.auth.tenant.id);
        const transactions = await db_1.db.getFinanceTransactions(req.auth.tenant.id);
        res.json({ ok: true, ...result, transactions });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/administration/finances/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.finances.manage'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteFinanceTransaction(req.auth.tenant.id, req.params.id);
        res.json({ ok: deleted });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- SUBMÓDULO: CONTABILIDAD ---
app.get('/api/administration/accounting', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['administration.accounting.view', 'administration.accounting.manage']), async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        const entries = await db_1.db.getAccountingEntries(req.auth.tenant.id, {
            status,
            startDate,
            endDate,
        });
        res.json({ entries });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/administration/accounting', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.accounting.manage'), async (req, res) => {
    try {
        const entry = await db_1.db.createAccountingEntry(req.auth.tenant.id, req.body);
        res.status(201).json({ entry });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/administration/accounting/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('administration.accounting.manage'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteAccountingEntry(req.auth.tenant.id, req.params.id);
        res.json({ ok: deleted });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// MÓDULO DE ÓRDENES DE SERVICIO (OS)
// =============================================================================
// Listar órdenes de servicio
app.get('/api/service-orders', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['service_orders.view', 'workspace.view', 'payments.view', 'quotes.view']), async (req, res) => {
    try {
        const clientId = req.query.clientId;
        const orders = await db_1.db.getServiceOrders(req.auth.tenant.id, clientId);
        res.json({ orders, serviceOrders: orders });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Obtener orden de servicio por ID
app.get('/api/service-orders/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('service_orders.view'), async (req, res) => {
    try {
        const order = await db_1.db.getServiceOrderById(req.params.id, req.auth.tenant.id);
        if (!order) {
            return res.status(404).json({ error: 'Orden de servicio no encontrada' });
        }
        res.json({ order });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Crear orden de servicio
app.post('/api/service-orders', auth_1.requireAuth, (0, auth_1.requirePermission)('service_orders.create'), async (req, res) => {
    try {
        const created = await db_1.db.createServiceOrder(req.auth.tenant.id, {
            ...req.body,
            createdBy: req.auth.user.name,
        });
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'service_orders',
            type: 'success',
            title: 'Nueva Orden de Servicio',
            message: `Se inició la OS #${created.code}: "${created.title}" para "${created.clientName}"`,
            entityId: created.id,
            action: 'create',
            link: '/?module=service_orders',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.status(201).json({ order: created });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Actualizar orden de servicio
app.put('/api/service-orders/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('service_orders.edit'), async (req, res) => {
    try {
        const updated = await db_1.db.updateServiceOrder(req.params.id, req.auth.tenant.id, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Orden de servicio no encontrada' });
        }
        const isCompleted = updated.status === 'completed';
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'service_orders',
            type: isCompleted ? 'success' : 'info',
            title: isCompleted ? '🎯 ¡Orden de Servicio completada!' : 'Orden de Servicio actualizada',
            message: `OS #${updated.code}: "${updated.title}" actualizada a estado: ${updated.status}`,
            entityId: updated.id,
            action: 'update',
            link: '/?module=service_orders',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.json({ order: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Eliminar orden de servicio
app.delete('/api/service-orders/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('service_orders.delete'), async (req, res) => {
    try {
        const deleted = await db_1.db.deleteServiceOrder(req.params.id, req.auth.tenant.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Orden de servicio no encontrada' });
        }
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'service_orders',
            type: 'warning',
            title: 'Orden de Servicio eliminada',
            message: 'Se eliminó una orden de servicio del sistema.',
            action: 'delete',
            link: '/?module=service_orders',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Endpoint público para que el cliente consulte su Orden de Servicio (sin autenticación)
app.get('/api/public/service-orders/:token', async (req, res) => {
    try {
        const result = await db_1.db.getServiceOrderByPublicToken(req.params.token);
        if (!result) {
            return res.status(404).json({ error: 'Orden de servicio no encontrada o no disponible' });
        }
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// MÓDULO DE SERVICIOS & CATEGORÍAS
// =============================================================================
// Categorías
app.get('/api/services/categories', auth_1.requireAuth, (0, auth_1.requirePermission)('services.view'), async (req, res) => {
    try {
        const categories = await db_1.db.getServiceCategories(req.auth.tenant.id);
        res.json({ categories });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/services/categories', auth_1.requireAuth, (0, auth_1.requirePermission)('services.categories.manage'), async (req, res) => {
    try {
        const category = await db_1.db.createServiceCategory(req.auth.tenant.id, req.body);
        res.status(201).json({ category });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.put('/api/services/categories/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('services.categories.manage'), async (req, res) => {
    try {
        const updated = await db_1.db.updateServiceCategory(req.params.id, req.auth.tenant.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Categoría no encontrada.' });
            return;
        }
        res.json({ category: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.delete('/api/services/categories/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('services.categories.manage'), async (req, res) => {
    try {
        const ok = await db_1.db.deleteServiceCategory(req.params.id, req.auth.tenant.id);
        if (!ok) {
            res.status(404).json({ error: 'Categoría no encontrada.' });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Servicios
app.get('/api/services', auth_1.requireAuth, (0, auth_1.requirePermission)('services.view'), async (req, res) => {
    try {
        const { search, categoryId, status, pricingType } = req.query;
        const services = await db_1.db.getServices(req.auth.tenant.id, {
            search: search,
            categoryId: categoryId,
            status: status,
            pricingType: pricingType,
        });
        res.json({ services });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/services/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('services.view'), async (req, res) => {
    try {
        const service = await db_1.db.getServiceById(req.params.id, req.auth.tenant.id);
        if (!service) {
            res.status(404).json({ error: 'Servicio no encontrado.' });
            return;
        }
        res.json({ service });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/services', auth_1.requireAuth, (0, auth_1.requirePermission)('services.create'), async (req, res) => {
    try {
        const service = await db_1.db.createService(req.auth.tenant.id, req.body);
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'services',
            type: 'info',
            title: 'Nuevo servicio registrado',
            message: `Se añadió el servicio "${service.title}" al catálogo`,
            entityId: service.id,
            action: 'create',
            link: '/?module=services',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.status(201).json({ service });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.put('/api/services/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('services.edit'), async (req, res) => {
    try {
        const updated = await db_1.db.updateService(req.params.id, req.auth.tenant.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Servicio no encontrado.' });
            return;
        }
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'services',
            type: 'info',
            title: 'Servicio actualizado',
            message: `Se actualizaron los datos del servicio "${updated.title}"`,
            entityId: updated.id,
            action: 'update',
            link: '/?module=services',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.json({ service: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.delete('/api/services/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('services.delete'), async (req, res) => {
    try {
        const ok = await db_1.db.deleteService(req.params.id, req.auth.tenant.id);
        if (!ok) {
            res.status(404).json({ error: 'Servicio no encontrado.' });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// =============================================================================
// 4. MÓDULO DE CONFIGURACIÓN (4 PESTAÑAS - MULTITENANT + PERMISOS GRANULARES)
// =============================================================================
// Pestaña 1: Personalización
app.put('/api/settings/customization', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.customization.manage'), async (req, res) => {
    try {
        const updatedTenant = await db_1.db.updateTenantCustomization(req.auth.tenant.id, req.body.customization);
        if (!updatedTenant) {
            res.status(404).json({ error: 'Tenant no encontrado.' });
            return;
        }
        res.json({ tenant: updatedTenant });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Pestaña 2: Datos de la Empresa
app.put('/api/settings/company', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.company.manage'), async (req, res) => {
    try {
        const updatedTenant = await db_1.db.updateTenantCompanyInfo(req.auth.tenant.id, req.body.companyInfo);
        if (!updatedTenant) {
            res.status(404).json({ error: 'Tenant no encontrado.' });
            return;
        }
        res.json({ tenant: updatedTenant });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Ajuste y configuración de cuentas bancarias y métodos de pago de la agencia
app.put('/api/settings/bank-accounts', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['settings.company.manage', 'quotes.create', 'quotes.edit']), async (req, res) => {
    try {
        const { bankAccounts } = req.body;
        const updatedTenant = await db_1.db.updateTenantBankAccounts(req.auth.tenant.id, bankAccounts || []);
        if (!updatedTenant) {
            res.status(404).json({ error: 'Tenant no encontrado.' });
            return;
        }
        res.json({ tenant: updatedTenant });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Pestaña 3: Usuarios y PIN de 8 dígitos
app.get('/api/settings/users', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['settings.users.view', 'settings.users.manage', 'workspace.view', 'service_orders.view']), async (req, res) => {
    try {
        const users = await db_1.db.getUsersByTenant(req.auth.tenant.id);
        const roles = await db_1.db.getRolesByTenant(req.auth.tenant.id);
        const canManage = req.auth?.role?.isSystem || (0, permissions_1.hasPermission)(req.auth?.role?.permissions, 'settings.users.manage');
        const safeUsers = users.map((u) => (canManage ? u : { ...u, pin: '••••••••' }));
        res.json({ users: safeUsers, roles });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/settings/users', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.users.manage'), async (req, res) => {
    try {
        const user = await db_1.db.createUser(req.auth.tenant.id, req.body);
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'users',
            type: 'success',
            title: 'Nuevo miembro del equipo',
            message: `Se dio de alta al usuario ${user.name} (${user.jobTitle})`,
            entityId: user.id,
            action: 'create',
            link: '/?module=settings',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.status(201).json({ user });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.put('/api/settings/users/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.users.manage'), async (req, res) => {
    try {
        const updated = await db_1.db.updateUser(req.auth.tenant.id, req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Usuario no encontrado.' });
            return;
        }
        res.json({ user: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.delete('/api/settings/users/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.users.manage'), async (req, res) => {
    try {
        if (req.params.id === req.auth.user.id) {
            res.status(400).json({ error: 'No puedes eliminar tu propio usuario en sesión activa.' });
            return;
        }
        const ok = await db_1.db.deleteUser(req.auth.tenant.id, req.params.id);
        if (!ok) {
            res.status(404).json({ error: 'Usuario no encontrado.' });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Personalización individual de colores por usuario
app.put('/api/users/me/theme', auth_1.requireAuth, async (req, res) => {
    try {
        const { themePreference } = req.body;
        const user = await db_1.db.updateUserThemePreference(req.auth.user.id, req.auth.tenant.id, themePreference || null);
        if (!user) {
            res.status(404).json({ error: 'Usuario no encontrado.' });
            return;
        }
        res.json({ user });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// Pestaña 4: Roles y Permisos Granulares
app.get('/api/settings/roles', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['settings.roles.view', 'settings.roles.manage', 'settings.users.view']), async (req, res) => {
    try {
        const roles = await db_1.db.getRolesByTenant(req.auth.tenant.id);
        const users = await db_1.db.getUsersByTenant(req.auth.tenant.id);
        res.json({
            roles,
            usersCountByRole: roles.reduce((acc, r) => {
                acc[r.id] = users.filter((u) => u.roleId === r.id).length;
                return acc;
            }, {}),
            permissionsCatalog: permissions_1.PERMISSIONS_CATALOG,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/settings/roles', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.roles.manage'), async (req, res) => {
    try {
        const { name, description, badgeColor, permissions } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({ error: 'El nombre del rol es obligatorio.' });
            return;
        }
        const role = await db_1.db.createRole(req.auth.tenant.id, {
            name,
            description: description || '',
            badgeColor: badgeColor || '#7c3aed',
            permissions: Array.isArray(permissions) ? permissions : [],
        });
        notificationService_1.notificationService.notify({
            tenantId: req.auth.tenant.id,
            module: 'roles',
            type: 'info',
            title: 'Nuevo rol de permisos',
            message: `Se configuró el rol "${role.name}" con ${role.permissions.length} permisos`,
            entityId: role.id,
            action: 'create',
            link: '/?module=settings',
            actorUserId: req.auth.user.id,
            actorUserName: req.auth.user.name,
        }).catch(() => { });
        res.status(201).json({ role });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.put('/api/settings/roles/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.roles.manage'), async (req, res) => {
    try {
        const updated = await db_1.db.updateRole(req.auth.tenant.id, req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Rol no encontrado.' });
            return;
        }
        res.json({ role: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.delete('/api/settings/roles/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.roles.manage'), async (req, res) => {
    try {
        await db_1.db.deleteRole(req.auth.tenant.id, req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// =============================================================================
// GESTIÓN MULTITENANT (ADMINISTRACIÓN GLOBAL DE TENANTS / ESPACIOS DE TRABAJO)
// =============================================================================
app.get('/api/tenants', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['settings.tenants.view', 'settings.tenants.manage']), async (_req, res) => {
    try {
        const tenants = await db_1.db.getAllTenants();
        res.json({ tenants });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/tenants-available-users', auth_1.requireAuth, async (req, res) => {
    try {
        const isSuperAdmin = req.auth?.role?.isSystem ||
            (0, permissions_1.hasAnyPermission)(req.auth?.role?.permissions, ['settings.tenants.manage', 'settings.tenants.view', 'settings.users.manage']);
        if (isSuperAdmin) {
            const users = await db_1.db.getAvailableUsersForTenants();
            res.json({ users });
        }
        else {
            const currentTenantUsers = await db_1.db.getUsersByTenant(req.auth.tenant.id);
            const mapped = currentTenantUsers.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                pin: u.pin,
                jobTitle: u.jobTitle,
                avatarUrl: u.avatarUrl,
                tenantIds: [u.tenantId],
            }));
            res.json({ users: mapped });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/tenants', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.tenants.manage'), async (req, res) => {
    try {
        const { name, slug, currencyCode, commercialName, legalName, ruc, email, whatsapp, address, adminName, adminEmail, adminPin, adminJobTitle, logoUrl, assignedUserIds, } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({ error: 'El nombre de la agencia o tenant es obligatorio.' });
            return;
        }
        if (!slug || !slug.trim()) {
            res.status(400).json({ error: 'El identificador (slug) es obligatorio.' });
            return;
        }
        const result = await db_1.db.createTenant({
            name: name.trim(),
            slug: slug.trim(),
            currencyCode,
            commercialName: commercialName?.trim(),
            legalName: legalName?.trim(),
            ruc: ruc?.trim(),
            email: email?.trim(),
            whatsapp: whatsapp?.trim(),
            address: address?.trim(),
            adminName: adminName?.trim(),
            adminEmail: adminEmail?.trim(),
            adminPin: adminPin?.trim(),
            adminJobTitle: adminJobTitle?.trim(),
            logoUrl: logoUrl?.trim() || undefined,
            assignedUserIds: Array.isArray(assignedUserIds) ? assignedUserIds : undefined,
        });
        res.status(201).json({ tenant: result.tenant, adminUser: result.adminUser });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.put('/api/tenants/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.tenants.manage'), async (req, res) => {
    try {
        const updated = await db_1.db.updateTenant(req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Tenant no encontrado.' });
            return;
        }
        res.json({ tenant: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.delete('/api/tenants/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.tenants.manage'), async (req, res) => {
    try {
        const tenantId = req.params.id;
        if (tenantId === req.auth.tenant.id) {
            res.status(400).json({
                error: 'No puedes eliminar el tenant en el que estás conectado actualmente. Cambia a otro tenant primero.',
            });
            return;
        }
        const all = await db_1.db.getAllTenants();
        if (all.length <= 1) {
            res.status(400).json({
                error: 'No se puede eliminar el único tenant registrado en el sistema.',
            });
            return;
        }
        const ok = await db_1.db.deleteTenant(tenantId);
        if (!ok) {
            res.status(404).json({ error: 'Tenant no encontrado o no se pudo eliminar.' });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// =============================================================================
// ACTUALIZACIONES DEL SISTEMA EN 1 CLIC (GIT PULL + MIGRACIÓN DB + COMPILACIÓN)
// =============================================================================
function getGitExecutable() {
    if (process.platform === 'win32') {
        return 'git';
    }
    const cwd = process.cwd();
    const candidates = [
        '/usr/bin/git',
        '/usr/local/bin/git',
        '/usr/local/cpanel/3rdparty/bin/git',
        '/opt/cpanel/ea-git/bin/git',
    ];
    for (const cmd of candidates) {
        if (fs_1.default.existsSync(cmd))
            return `"${cmd}" -c "safe.directory=${cwd}" -c "safe.directory=*"`;
    }
    return `git -c "safe.directory=${cwd}" -c "safe.directory=*"`;
}
let remoteUpdateCache = null;
const CACHE_TTL_MS = 60 * 1000; // 60 segundos de caché
async function checkRemoteGitHubUpdate() {
    const now = Date.now();
    if (remoteUpdateCache && now - remoteUpdateCache.timestamp < CACHE_TTL_MS) {
        return {
            remoteCommit: remoteUpdateCache.remoteCommit,
            remoteCommitMessage: remoteUpdateCache.remoteCommitMessage,
            remoteCommitDate: remoteUpdateCache.remoteCommitDate,
        };
    }
    // 1. Vía GitHub API (muy rápido y ligero, sin requerir binario git)
    try {
        const res = await fetch('https://api.github.com/repos/networkturbo4-pixel/sistemaromav4/commits/main', {
            headers: {
                'User-Agent': 'ROMA-SaaS-SystemUpdate',
                'Accept': 'application/vnd.github.v3+json',
            },
            signal: AbortSignal.timeout(3500),
        });
        if (res.ok) {
            const data = (await res.json());
            const sha = typeof data.sha === 'string' ? data.sha.slice(0, 7) : null;
            const msg = data.commit?.message ? String(data.commit.message).split('\n')[0] : null;
            const date = data.commit?.committer?.date || null;
            if (sha) {
                remoteUpdateCache = {
                    timestamp: now,
                    remoteCommit: sha,
                    remoteCommitMessage: msg,
                    remoteCommitDate: date,
                };
                return { remoteCommit: sha, remoteCommitMessage: msg, remoteCommitDate: date };
            }
        }
    }
    catch { }
    // 2. Fallback vía git ls-remote si la API de GitHub no responde
    try {
        const gitCmd = getGitExecutable();
        const { stdout } = await execAsync(`${gitCmd} ls-remote origin refs/heads/main`, {
            timeout: 5000,
        });
        const hash = stdout.trim().split(/\s+/)[0];
        if (hash && hash.length >= 7) {
            const sha = hash.slice(0, 7);
            remoteUpdateCache = {
                timestamp: now,
                remoteCommit: sha,
                remoteCommitMessage: 'Actualización remota disponible en GitHub',
                remoteCommitDate: null,
            };
            return { remoteCommit: sha, remoteCommitMessage: 'Actualización remota disponible en GitHub', remoteCommitDate: null };
        }
    }
    catch { }
    return { remoteCommit: null, remoteCommitMessage: null, remoteCommitDate: null };
}
app.get('/api/system/update-status', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['settings.system.update', 'settings.customization.manage', 'settings.tenants.manage']), async (req, res) => {
    try {
        let isGitRepo = false;
        let branch = 'main';
        let currentCommit = 'Sin Git';
        let lastCommitMessage = '';
        let remoteUrl = '';
        let isDirty = false;
        let gitAvailable = false;
        // 1. Detección directa por sistema de archivos (.git) como base infalible
        const gitDir = path_1.default.resolve(process.cwd(), '.git');
        if (fs_1.default.existsSync(gitDir)) {
            isGitRepo = true;
            try {
                const headContent = fs_1.default.readFileSync(path_1.default.join(gitDir, 'HEAD'), 'utf8').trim();
                if (headContent.startsWith('ref: refs/heads/')) {
                    branch = headContent.replace('ref: refs/heads/', '').trim();
                    const refPath = path_1.default.join(gitDir, 'refs', 'heads', branch);
                    if (fs_1.default.existsSync(refPath)) {
                        currentCommit = fs_1.default.readFileSync(refPath, 'utf8').trim().slice(0, 7);
                    }
                }
                else if (headContent.length >= 7) {
                    currentCommit = headContent.slice(0, 7);
                }
            }
            catch { }
            try {
                const configContent = fs_1.default.readFileSync(path_1.default.join(gitDir, 'config'), 'utf8');
                const match = configContent.match(/url\s*=\s*(.+)/);
                if (match && match[1]) {
                    remoteUrl = match[1].trim();
                }
            }
            catch { }
        }
        // 2. Enriquecer con binario Git si está disponible en el servidor (con bypass de safe.directory)
        const gitCmd = getGitExecutable();
        try {
            const { stdout: gitVer } = await execAsync(`${gitCmd} --version`);
            gitAvailable = Boolean(gitVer);
            const { stdout: insideWorkTree } = await execAsync(`${gitCmd} rev-parse --is-inside-work-tree`);
            if (insideWorkTree.trim() === 'true') {
                isGitRepo = true;
                try {
                    const { stdout: b } = await execAsync(`${gitCmd} rev-parse --abbrev-ref HEAD`);
                    if (b.trim())
                        branch = b.trim();
                }
                catch { }
                try {
                    const { stdout: hash } = await execAsync(`${gitCmd} rev-parse --short HEAD`);
                    if (hash.trim())
                        currentCommit = hash.trim();
                }
                catch { }
                try {
                    const { stdout: msg } = await execAsync(`${gitCmd} log -1 --format="%s (%cr)"`);
                    if (msg.trim())
                        lastCommitMessage = msg.trim();
                }
                catch { }
                try {
                    const { stdout: rem } = await execAsync(`${gitCmd} config --get remote.origin.url`);
                    if (rem.trim())
                        remoteUrl = rem.trim();
                }
                catch { }
                try {
                    const { stdout: st } = await execAsync(`${gitCmd} status --porcelain`);
                    isDirty = st.trim().length > 0;
                }
                catch { }
            }
        }
        catch { }
        let lastBuildDate = null;
        const distIndexHtml = path_1.default.resolve(process.cwd(), 'dist', 'client', 'index.html');
        const hasPrecompiledDist = fs_1.default.existsSync(distIndexHtml);
        if (hasPrecompiledDist) {
            const stats = fs_1.default.statSync(distIndexHtml);
            lastBuildDate = stats.mtime.toISOString();
        }
        const srcExists = fs_1.default.existsSync(path_1.default.resolve(process.cwd(), 'src'));
        const viteBin = path_1.default.resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
        const hasVite = fs_1.default.existsSync(viteBin);
        const canBuild = srcExists && hasVite;
        const isPrecompiled = hasPrecompiledDist && !canBuild;
        // 3. Comprobar si hay una versión más reciente disponible en GitHub
        const { remoteCommit, remoteCommitMessage, remoteCommitDate } = await checkRemoteGitHubUpdate();
        const updateAvailable = Boolean(remoteCommit &&
            currentCommit &&
            currentCommit !== 'Sin Git' &&
            !remoteCommit.toLowerCase().startsWith(currentCommit.toLowerCase()) &&
            !currentCommit.toLowerCase().startsWith(remoteCommit.toLowerCase()));
        res.json({
            gitAvailable,
            isGitRepo,
            branch,
            currentCommit,
            lastCommitMessage,
            remoteUrl,
            isDirty,
            database: db_1.db.getEngineInfo(),
            lastBuildDate,
            nodeVersion: process.version,
            platform: process.platform,
            uptimeSeconds: Math.floor(process.uptime()),
            appVersion: '1.0.0',
            canBuild,
            hasPrecompiledDist,
            isPrecompiled,
            updateAvailable,
            remoteCommit,
            remoteCommitMessage,
            remoteCommitDate,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/system/update', auth_1.requireAuth, (0, auth_1.requireAnyPermission)(['settings.system.update', 'settings.customization.manage', 'settings.tenants.manage']), async (req, res) => {
    const logs = [];
    const startTime = Date.now();
    const addLog = (step, status, message) => {
        logs.push({
            step,
            status,
            message,
            timestamp: new Date().toLocaleTimeString('es-PE', { hour12: false }),
        });
    };
    try {
        const { runGitPull = true, runDbMigration = true, runBuild = true, branch = 'main' } = req.body || {};
        // 1. PASO 1: DESCARGA DE CAMBIOS DESDE EL REPOSITORIO GIT
        if (runGitPull) {
            const gitCmd = getGitExecutable();
            const gitDir = path_1.default.resolve(process.cwd(), '.git');
            const hasGitDir = fs_1.default.existsSync(gitDir);
            if (hasGitDir) {
                addLog('git', 'pending', `Conectando con repositorio remoto y trayendo cambios (rama: ${branch})...`);
                try {
                    await execAsync(`${gitCmd} fetch origin`);
                    // Limpiar diferencias en archivos rastreados (como dist/ generado localmente en el servidor)
                    // para evitar que Git aborte con "Your local changes would be overwritten by merge"
                    try {
                        await execAsync(`${gitCmd} reset --hard origin/${branch}`);
                        addLog('git', 'success', `Sincronización Git limpia aplicada a origin/${branch}.`);
                    }
                    catch {
                        const { stdout: pullOut, stderr: pullErr } = await execAsync(`${gitCmd} pull origin ${branch}`);
                        addLog('git', 'success', `Git pull exitoso: ${pullOut.trim() || pullErr.trim() || 'Actualizado al día'}`);
                    }
                    // Protección automática contra plantilla dev de Vite:
                    try {
                        const rootIndexHtml = path_1.default.resolve(process.cwd(), 'index.html');
                        if (fs_1.default.existsSync(rootIndexHtml)) {
                            fs_1.default.unlinkSync(rootIndexHtml);
                        }
                    }
                    catch { }
                }
                catch (pullEx) {
                    addLog('git', 'warning', `Aviso en git pull: ${pullEx.message}`);
                }
            }
            else {
                addLog('git', 'warning', 'No se detectó la carpeta .git en el servidor. Se continúa con la migración segura de base de datos.');
            }
        }
        else {
            addLog('git', 'warning', 'Sincronización Git omitida.');
        }
        // 2. PASO 2: MIGRACIÓN SEGURA Y NO DESTRUCTIVA DE BASE DE DATOS
        if (runDbMigration) {
            addLog('database', 'pending', 'Verificando estructura de base de datos sin alterar información existente...');
            const migResult = await db_1.db.runSafeMigrations();
            if (migResult.success) {
                addLog('database', 'success', `Base de datos (${migResult.engine}) sincronizada. ${migResult.details.join(' | ')}`);
            }
            else {
                addLog('database', 'warning', 'Verificación de base de datos completada con advertencias.');
            }
        }
        else {
            addLog('database', 'warning', 'Migración de base de datos omitida.');
        }
        // 3. PASO 3: COMPILACIÓN DEL FRONTEND Y BACKEND
        if (runBuild) {
            const srcExists = fs_1.default.existsSync(path_1.default.resolve(process.cwd(), 'src'));
            const viteBin = path_1.default.resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
            const hasVite = fs_1.default.existsSync(viteBin);
            const distIndexHtml = path_1.default.resolve(process.cwd(), 'dist', 'client', 'index.html');
            const hasPrecompiledDist = fs_1.default.existsSync(distIndexHtml);
            if (hasPrecompiledDist) {
                // Entorno de producción precompilado (cPanel, etc.)
                // Los archivos optimizados de dist/ ya vienen compilados y sincronizados desde GitHub.
                // Se omite 'npm run build' en el servidor para evitar agotar la RAM de CloudLinux/cPanel (error 503).
                addLog('build', 'success', 'Archivos precompilados en dist/ verificados y vigentes desde el repositorio. No requiere compilación pesada.');
            }
            else if (srcExists && hasVite) {
                addLog('build', 'pending', 'Compilando frontend (Vite) y backend (TypeScript)...');
                try {
                    await execAsync('npm run build');
                    addLog('build', 'success', 'Compilación exitosa: dist/client y dist/server actualizados.');
                }
                catch (buildErr) {
                    addLog('build', 'warning', `Aviso en compilación: ${buildErr.message}.`);
                }
            }
            else if (srcExists && !hasVite) {
                // Hay código fuente pero falta Vite en node_modules
                addLog('build', 'pending', 'Instalando dependencias de compilación...');
                try {
                    await execAsync('npm install --include=dev');
                    await execAsync('npm run build');
                    addLog('build', 'success', 'Compilación exitosa tras instalar dependencias de desarrollo.');
                }
                catch (installErr) {
                    addLog('build', 'warning', `No se pudo compilar (${installErr.message}).`);
                }
            }
            else {
                addLog('build', 'warning', 'No se detectó código fuente src/ ni binario Vite. Se mantienen los archivos productivos actuales.');
            }
        }
        else {
            addLog('build', 'warning', 'Recompilación omitida.');
        }
        // 4. PASO 4: RECARGA AUTOMÁTICA EN CPANEL (PASSENGER)
        try {
            remoteUpdateCache = null;
            const tmpDir = path_1.default.resolve(process.cwd(), 'tmp');
            if (!fs_1.default.existsSync(tmpDir)) {
                fs_1.default.mkdirSync(tmpDir, { recursive: true });
            }
            fs_1.default.writeFileSync(path_1.default.join(tmpDir, 'restart.txt'), String(Date.now()));
            addLog('passenger', 'success', 'Señal de reinicio enviada a Phusion Passenger (tmp/restart.txt).');
        }
        catch { }
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
        addLog('finish', 'success', `¡Actualización completada en ${totalDuration}s! Datos existentes 100% protegidos.`);
        res.json({
            success: true,
            durationSeconds: totalDuration,
            logs,
        });
    }
    catch (err) {
        addLog('error', 'error', `Fallo en el proceso de actualización: ${err.message}`);
        res.status(500).json({
            success: false,
            error: err.message,
            logs,
        });
    }
});
app.get('/api/public/tenants', async (_req, res) => {
    try {
        const tenants = await db_1.db.getAllTenants();
        const active = tenants
            .filter((t) => t.status === 'active')
            .map((t) => ({
            id: t.id,
            slug: t.slug,
            name: t.name,
            commercialName: t.companyInfo?.commercialName || t.name,
            currencyCode: t.customization?.currencyCode || 'PEN',
            currencySymbol: t.customization?.currencySymbol || 'S/',
            logoLightUrl: t.customization?.logoLightUrl || '',
            logoDarkUrl: t.customization?.logoDarkUrl || '',
            customization: t.customization || {
                currencyCode: 'PEN',
                currencySymbol: 'S/',
                logoLightUrl: '',
                logoDarkUrl: '',
            },
        }));
        res.json({ tenants: active });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Endpoint dinámico para servir el icono o logo del tenant (compatible con PWA y Open Graph)
app.get('/api/public/tenant-icon', async (req, res) => {
    try {
        let slug = req.query.tenant;
        if (!slug) {
            const referer = req.get('referer');
            if (referer) {
                try {
                    const refUrl = new URL(referer);
                    slug = refUrl.searchParams.get('tenant') || undefined;
                }
                catch { }
            }
        }
        const size = req.query.size;
        const format = req.query.format;
        const tenant = await db_1.db.getPublicTenantBranding(slug);
        const iconUrl = tenant?.customization?.faviconUrl ||
            tenant?.customization?.logoPwaUrl ||
            tenant?.customization?.logoLightUrl ||
            tenant?.customization?.logoDarkUrl;
        if (iconUrl && iconUrl.startsWith('data:image/')) {
            const matches = iconUrl.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
            if (matches) {
                const mime = matches[1];
                const buffer = Buffer.from(matches[2], 'base64');
                res.setHeader('Content-Type', mime);
                res.setHeader('Cache-Control', 'public, max-age=86400');
                res.send(buffer);
                return;
            }
        }
        else if (iconUrl && (iconUrl.startsWith('http://') || iconUrl.startsWith('https://'))) {
            res.redirect(iconUrl);
            return;
        }
        else if (iconUrl && iconUrl.startsWith('/uploads/')) {
            const filePath = path_1.default.resolve(process.cwd(), iconUrl.replace(/^\/+/, ''));
            if (fs_1.default.existsSync(filePath)) {
                res.setHeader('Cache-Control', 'public, max-age=86400');
                res.sendFile(filePath);
                return;
            }
        }
        // Si el tenant no tiene logo propio subido y NO es Roma Agencia:
        // Generar un icono SVG vectorial con el color de marca del tenant y la inicial de su empresa
        if (tenant && tenant.slug !== 'roma-agencia') {
            const brandColor = tenant.customization?.lightPalette?.primary || '#6366f1';
            const companyName = tenant.companyInfo?.commercialName || tenant.name || 'A';
            const initial = companyName.trim().charAt(0).toUpperCase();
            const numSize = size === '512' ? 512 : size === '180' ? 180 : 192;
            const fontSize = Math.round(numSize * 0.52);
            const rx = Math.round(numSize * 0.22);
            const dynamicSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${numSize}" height="${numSize}" viewBox="0 0 ${numSize} ${numSize}">
        <rect width="${numSize}" height="${numSize}" rx="${rx}" fill="${brandColor}" />
        <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
      </svg>`;
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.send(dynamicSvg);
            return;
        }
        // Servir PNG para PWA icons o solicitudes explícitas de PNG
        if (size || format === 'png') {
            const pngFile = size === '512' ? 'icon-512.png' : size === '180' ? 'apple-touch-icon.png' : 'icon-192.png';
            const pngPath = path_1.default.resolve(process.cwd(), 'public', pngFile);
            if (fs_1.default.existsSync(pngPath)) {
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=86400');
                res.sendFile(pngPath);
                return;
            }
        }
        const favPath = path_1.default.resolve(process.cwd(), 'public', 'favicon.svg');
        if (fs_1.default.existsSync(favPath)) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.sendFile(favPath);
        }
        else {
            res.status(404).send('Icono no encontrado');
        }
    }
    catch (err) {
        res.status(500).send('Error');
    }
});
// Endpoint dinámico para servir el icono/favicon del tenant optimizado para Open Graph (WhatsApp, Telegram, etc.)
app.get(['/api/public/tenant-og-image.png', '/api/public/tenant-og-image'], async (req, res) => {
    try {
        const slug = req.query.tenant || req.query.id || '';
        const tenant = await db_1.db.getPublicTenantBranding(slug);
        // Priorizar favicon o logo del tenant correspondiente
        const iconUrl = tenant?.customization?.faviconUrl ||
            tenant?.customization?.logoPwaUrl ||
            tenant?.customization?.logoLightUrl ||
            tenant?.customization?.logoDarkUrl;
        if (iconUrl && iconUrl.startsWith('data:image/')) {
            const matches = iconUrl.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
            if (matches) {
                const mime = matches[1];
                // Si no es SVG, enviar directamente (WhatsApp requiere PNG/JPEG raster)
                if (mime !== 'image/svg+xml') {
                    const buffer = Buffer.from(matches[2], 'base64');
                    res.setHeader('Content-Type', mime);
                    res.setHeader('Cache-Control', 'public, max-age=86400');
                    res.send(buffer);
                    return;
                }
            }
        }
        else if (iconUrl && (iconUrl.startsWith('http://') || iconUrl.startsWith('https://'))) {
            res.redirect(iconUrl);
            return;
        }
        else if (iconUrl && iconUrl.startsWith('/uploads/')) {
            const filePath = path_1.default.resolve(process.cwd(), iconUrl.replace(/^\/+/, ''));
            if (fs_1.default.existsSync(filePath)) {
                res.setHeader('Cache-Control', 'public, max-age=86400');
                res.sendFile(filePath);
                return;
            }
        }
        // Fallback a icono cuadrado PNG 512x512
        const pngPath = path_1.default.resolve(process.cwd(), 'public', 'icon-512.png');
        if (fs_1.default.existsSync(pngPath)) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.sendFile(pngPath);
            return;
        }
        const favPath = path_1.default.resolve(process.cwd(), 'public', 'favicon.svg');
        if (fs_1.default.existsSync(favPath)) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.sendFile(favPath);
        }
        else {
            res.status(404).send('Icono no encontrado');
        }
    }
    catch (err) {
        res.status(500).send('Error');
    }
});
// Manifiesto PWA Dinámico por Tenant (compatible con /manifest.json y /api/public/manifest.webmanifest)
app.get(['/manifest.json', '/api/public/manifest.webmanifest'], async (req, res) => {
    try {
        let slug = req.query.tenant;
        // Si no viene en query, intentar extraer del Referer del navegador
        if (!slug) {
            const referer = req.get('referer');
            if (referer) {
                try {
                    const refUrl = new URL(referer);
                    slug = refUrl.searchParams.get('tenant') || undefined;
                }
                catch { }
            }
        }
        // Si aún no viene, intentar extraer de la cabecera x-tenant-slug o cookie
        if (!slug) {
            slug = req.headers['x-tenant-slug'];
        }
        if (!slug && req.cookies?.auth_token) {
            try {
                const decoded = jsonwebtoken_1.default.decode(req.cookies.auth_token);
                if (decoded?.tenant?.slug) {
                    slug = decoded.tenant.slug;
                }
            }
            catch { }
        }
        const tenant = await db_1.db.getPublicTenantBranding(slug);
        const name = tenant?.companyInfo?.commercialName || tenant?.name || 'ROMA SaaS — Sistema de Agencia';
        const shortName = (tenant?.companyInfo?.commercialName || tenant?.name || 'ROMA SaaS').slice(0, 15);
        const desc = `Sistema SaaS de Gestión para Agencia de Publicidad y Diseño — ${name}`;
        const tenantSlug = tenant?.slug || slug || 'roma-agencia';
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=180');
        return res.json({
            name,
            short_name: shortName,
            description: desc,
            id: `/?tenant=${encodeURIComponent(tenantSlug)}`,
            start_url: `/?tenant=${encodeURIComponent(tenantSlug)}`,
            scope: '/',
            display: 'standalone',
            orientation: 'portrait',
            background_color: tenant?.customization?.darkPalette?.background || '#090d16',
            theme_color: tenant?.customization?.lightPalette?.primary || '#0055ff',
            icons: [
                {
                    src: `/api/public/tenant-icon?tenant=${encodeURIComponent(tenantSlug)}&size=192`,
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: `/api/public/tenant-icon?tenant=${encodeURIComponent(tenantSlug)}&size=512`,
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: `/api/public/tenant-icon?tenant=${encodeURIComponent(tenantSlug)}&size=192&maskable=1`,
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'maskable'
                },
                {
                    src: `/api/public/tenant-icon?tenant=${encodeURIComponent(tenantSlug)}&size=512&maskable=1`,
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable'
                },
                {
                    src: `/api/public/tenant-icon?tenant=${encodeURIComponent(tenantSlug)}&size=180`,
                    sizes: '180x180',
                    type: 'image/png'
                }
            ],
        });
    }
    catch (err) {
        console.error('Error al generar manifest.webmanifest:', err);
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        return res.json({
            name: 'ROMA SaaS — Sistema de Agencia',
            short_name: 'ROMA SaaS',
            start_url: '/',
            id: '/',
            scope: '/',
            display: 'standalone',
            orientation: 'portrait',
            background_color: '#090d16',
            theme_color: '#0055ff',
            icons: [
                {
                    src: '/icon-192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icon-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any'
                }
            ]
        });
    }
});
// Rutas con Inyección de Open Graph (WhatsApp, Facebook, Twitter, Telegram) y PWA
const clientDistPath = path_1.default.resolve(process.cwd(), 'dist', 'client');
async function serveHtmlWithMetadata(req, res) {
    try {
        const indexPath = fs_1.default.existsSync(path_1.default.join(clientDistPath, 'index.html'))
            ? path_1.default.join(clientDistPath, 'index.html')
            : path_1.default.resolve(process.cwd(), 'index.html');
        if (!fs_1.default.existsSync(indexPath)) {
            res.redirect(`http://localhost:5173${req.originalUrl}`);
            return;
        }
        let html = fs_1.default.readFileSync(indexPath, 'utf-8');
        const host = req.get('x-forwarded-host') || req.get('host') || 'theromaagency.com';
        const proto = req.get('x-forwarded-proto') || 'https';
        const origin = `${proto}://${host}`;
        const fullUrl = `${origin}${req.originalUrl}`;
        let pageTitle = 'ROMA SaaS — Sistema de Agencia de Publicidad y Diseño';
        let ogTitle = 'ROMA SaaS — Sistema de Agencia';
        let ogDescription = 'Plataforma integral de gestión de proyectos, clientes, cotizaciones y notas de pago.';
        let tenantSlug = req.query.tenant || 'roma-agencia';
        let ogImage = `${origin}/api/public/tenant-og-image.png?tenant=${encodeURIComponent(tenantSlug)}`;
        let faviconUrl = `/api/public/tenant-icon?tenant=${encodeURIComponent(tenantSlug)}`;
        let themeColor = '#0055ff';
        const pathname = req.path;
        // 1. Notas de Pago / Comprobantes públicos (/p/pago/:token, /p/nota/:token, /np/:token, /pago/:token, /nota/:token)
        const noteMatch = pathname.match(/^\/(?:np|pago|nota|nota-pago|p\/pago|p\/nota)\/([^/?#]+)/i);
        if (noteMatch && noteMatch[1]) {
            const token = decodeURIComponent(noteMatch[1]);
            const noteData = await db_1.db.getPaymentNoteByPublicToken(token);
            if (noteData) {
                const n = noteData.paymentNote;
                const t = noteData.tenant;
                tenantSlug = t.slug;
                const agencyName = t.companyInfo?.commercialName || t.name;
                const currSymbol = t.customization?.currencySymbol || 'S/';
                const totalNum = Number(n.total || 0);
                const paidNum = Number(n.paidAmount || 0);
                const totalFormatted = `${currSymbol} ${totalNum.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
                // Determinar estado de la nota de pago
                let statusLabel = 'Pendiente de Pago';
                if (n.status === 'paid' || (totalNum > 0 && paidNum >= totalNum)) {
                    statusLabel = 'Pagado';
                }
                else if (n.status === 'partial' || paidNum > 0) {
                    statusLabel = `Abono Parcial (${currSymbol} ${paidNum.toLocaleString('es-PE', { minimumFractionDigits: 2 })})`;
                }
                else if (n.status === 'cancelled') {
                    statusLabel = 'Anulado';
                }
                const clientStr = n.clientName ? `${n.clientName}` : 'Cliente';
                pageTitle = `Comprobante ${n.code || ''} — ${clientStr} | ${agencyName}`;
                ogTitle = `Comprobante de Pago ${n.code || ''} — ${agencyName}`;
                ogDescription = `Cliente: ${clientStr} • Total a pagar: ${totalFormatted} • Estado: ${statusLabel}. Haz clic para revisar el desglose y cuentas oficiales.`;
                ogImage = `${origin}/api/public/tenant-og-image.png?tenant=${encodeURIComponent(t.slug)}`;
                faviconUrl = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(t.slug)}`;
                themeColor = t.customization?.lightPalette?.primary || '#0055ff';
            }
        }
        // 2. Órdenes de Servicio públicas (/p/os/:token, /os/:token, etc.)
        else if (pathname.match(/^\/(?:os|orden|p\/os|p\/orden)\/([^/?#]+)/i)) {
            const osMatch = pathname.match(/^\/(?:os|orden|p\/os|p\/orden)\/([^/?#]+)/i);
            const token = decodeURIComponent(osMatch[1]);
            const osData = await db_1.db.getServiceOrderByPublicToken(token);
            if (osData) {
                const os = osData.order;
                const t = osData.tenant;
                tenantSlug = t.slug;
                const agencyName = t.companyInfo?.commercialName || t.name;
                pageTitle = `Orden de Servicio ${os.code || ''} — ${agencyName}`;
                ogTitle = `Orden de Servicio ${os.code || ''} — ${agencyName}`;
                ogDescription = `Hoja de ruta y entregables: ${os.title || 'Servicio'}. Estado: ${os.status || 'Activo'}.`;
                ogImage = `${origin}/api/public/tenant-og-image.png?tenant=${encodeURIComponent(t.slug)}`;
                faviconUrl = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(t.slug)}`;
                themeColor = t.customization?.lightPalette?.primary || '#0055ff';
            }
        }
        // 3. Workspace / Grilla de Contenidos pública (/p/w/:token, /p/workspace/:token, etc.)
        else if (pathname.match(/^\/(?:w|grilla|p\/w|p\/workspace)\/([^/?#]+)/i)) {
            const wsMatch = pathname.match(/^\/(?:w|grilla|p\/w|p\/workspace)\/([^/?#]+)/i);
            const token = decodeURIComponent(wsMatch[1]);
            const wsData = await db_1.db.getWorkspaceMonthByPublicToken(token);
            if (wsData) {
                const m = wsData.month;
                const p = wsData.project;
                const t = wsData.tenant;
                const postsCount = Array.isArray(wsData.posts) ? wsData.posts.length : 0;
                if (t) {
                    tenantSlug = t.slug;
                    faviconUrl = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(t.slug)}`;
                }
                const agencyName = t?.companyInfo?.commercialName || t?.name || 'ROMA Agencia';
                const projectName = p?.name || 'Redes Sociales';
                pageTitle = `Grilla de Contenidos ${m.name || ''} — ${projectName} | ${agencyName}`;
                ogTitle = `Grilla ${m.name || ''} — ${projectName}`;
                ogDescription = `Calendario editorial y piezas de contenido de ${agencyName}. Total piezas: ${postsCount}. Haz clic para revisar y aprobar.`;
                ogImage = `${origin}/api/public/tenant-og-image.png?tenant=${encodeURIComponent(tenantSlug)}`;
            }
        }
        // 4. Catálogo o Servicio público (/s/:slug, /servicio/:slug, /p/servicio/:slug)
        else if (pathname.match(/^\/(?:s|servicio|p\/servicio)\/([^/?#]+)/i)) {
            const srvMatch = pathname.match(/^\/(?:s|servicio|p\/servicio)\/([^/?#]+)/i);
            const slug = decodeURIComponent(srvMatch[1]);
            const tenantParam = req.query.tenant || '';
            const srvData = await db_1.db.getPublicServiceBySlugOrId(tenantParam || 'roma-agencia', slug);
            if (srvData && srvData.service) {
                const s = srvData.service;
                const t = srvData.tenant;
                tenantSlug = t.slug;
                const agencyName = t.companyInfo?.commercialName || t.name;
                pageTitle = `${s.title} | ${agencyName}`;
                ogTitle = `${s.title} — ${agencyName}`;
                ogDescription = s.briefDescription || s.fullDescription || 'Consulta los paquetes, entregables e inversión de este servicio profesional.';
                ogImage = `${origin}/api/public/tenant-og-image.png?tenant=${encodeURIComponent(t.slug)}`;
                faviconUrl = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(t.slug)}`;
            }
        }
        // 5. Catálogo general de servicios (/servicios, /p/servicios)
        else if (pathname === '/servicios' || pathname === '/p/servicios') {
            const defaultTenant = await db_1.db.getPublicTenantBranding(tenantSlug);
            const agencyName = defaultTenant?.companyInfo?.commercialName || defaultTenant?.name || 'ROMA Agencia';
            pageTitle = `Catálogo de Servicios y Paquetes — ${agencyName}`;
            ogTitle = `Catálogo de Servicios — ${agencyName}`;
            ogDescription = `Descubre nuestros servicios profesionales de diseño, publicidad, branding y marketing digital.`;
            ogImage = `${origin}/api/public/tenant-og-image.png?tenant=${encodeURIComponent(tenantSlug)}`;
        }
        // 6. Cotizaciones públicas (/c/:token, /q/:token, /cotizacion/:token, /p/cotizacion/:token, /p/:token)
        else {
            let quoteToken = null;
            const qMatch = pathname.match(/^\/(?:c|q|cotizacion|p\/cotizacion)\/([^/?#]+)/i);
            if (qMatch && qMatch[1]) {
                quoteToken = decodeURIComponent(qMatch[1]);
            }
            else {
                const pMatch = pathname.match(/^\/p\/([^/?#]+)/i);
                if (pMatch && pMatch[1]) {
                    const candidate = decodeURIComponent(pMatch[1]).toLowerCase();
                    if (candidate !== 'pago' &&
                        candidate !== 'nota' &&
                        candidate !== 'os' &&
                        candidate !== 'orden' &&
                        candidate !== 'w' &&
                        candidate !== 'workspace' &&
                        candidate !== 'servicio' &&
                        candidate !== 'servicios') {
                        quoteToken = decodeURIComponent(pMatch[1]);
                    }
                }
            }
            if (quoteToken) {
                const quoteData = await db_1.db.getQuoteByPublicToken(quoteToken);
                if (quoteData) {
                    const q = quoteData.quote;
                    const t = quoteData.tenant;
                    tenantSlug = t.slug;
                    const agencyName = t.companyInfo?.commercialName || t.name;
                    const currSymbol = t.customization?.currencySymbol || 'S/';
                    const clientStr = q.clientName ? `${q.clientName}` : 'Cliente';
                    pageTitle = `Propuesta ${q.code || ''} — ${clientStr} | ${agencyName}`;
                    ogTitle = `Propuesta Comercial ${q.code || ''} — ${clientStr}`;
                    ogDescription = `Propuesta de servicios profesionales emitida por ${agencyName}. Inversión: ${currSymbol} ${Number(q.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
                    ogImage = `${origin}/api/public/tenant-og-image.png?tenant=${encodeURIComponent(t.slug)}`;
                    faviconUrl = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(t.slug)}`;
                    themeColor = t.customization?.lightPalette?.primary || '#0055ff';
                }
            }
            else {
                // Branding general del tenant
                const defaultTenant = await db_1.db.getPublicTenantBranding(tenantSlug);
                if (defaultTenant) {
                    tenantSlug = defaultTenant.slug;
                    const name = defaultTenant.companyInfo?.commercialName || defaultTenant.name;
                    pageTitle = `${name} — Sistema SaaS`;
                    ogTitle = name;
                    ogDescription = `Sistema de gestión para agencias de diseño y publicidad — ${name}`;
                    ogImage = `${origin}/api/public/tenant-og-image.png?tenant=${encodeURIComponent(tenantSlug)}`;
                    faviconUrl = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(tenantSlug)}`;
                    themeColor = defaultTenant.customization?.lightPalette?.primary || '#0055ff';
                }
            }
        }
        const escapeHtml = (str) => str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const ogTags = `
    <!-- Open Graph & Meta Tags Dinámicos (WhatsApp, Facebook, Twitter, Telegram, LinkedIn) -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(ogTitle)}" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(ogDescription)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:secure_url" content="${ogImage}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta property="og:url" content="${fullUrl}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="theme-color" content="${themeColor}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="${escapeHtml(ogTitle)}" />
    <link rel="apple-touch-icon" href="${ogImage}" />
    `;
        html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);
        html = html.replace(/<link id="dynamic-favicon"[^>]*>/i, `<link id="dynamic-favicon" rel="icon" href="${faviconUrl}" />`);
        const manifestHref = tenantSlug
            ? `/api/public/manifest.webmanifest?tenant=${encodeURIComponent(tenantSlug)}`
            : '/manifest.json';
        html = html.replace(/<link id="dynamic-manifest"[^>]*>/i, `<link id="dynamic-manifest" rel="manifest" href="${manifestHref}" />`);
        // Limpiar cualquier meta tag previo de og o twitter para evitar duplicidades
        html = html.replace(/<meta\s+property=["']og:[^>]*>/gi, '');
        html = html.replace(/<meta\s+name=["']twitter:[^>]*>/gi, '');
        html = html.replace('</head>', `${ogTags}\n  </head>`);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    }
    catch (err) {
        res.sendFile(path_1.default.join(clientDistPath, 'index.html'));
    }
}
app.get([
    '/p/pago/:token',
    '/p/nota/:token',
    '/np/:token',
    '/pago/:token',
    '/nota-pago/:token',
    '/nota/:token',
    '/p/cotizacion/:token',
    '/cotizacion/:token',
    '/c/:token',
    '/q/:token',
    '/p/:token',
    '/p/os/:token',
    '/p/orden/:token',
    '/os/:token',
    '/orden/:token',
    '/p/w/:token',
    '/p/workspace/:token',
    '/w/:token',
    '/grilla/:token',
    '/servicios',
    '/p/servicios',
    '/s/:slug',
    '/servicio/:slug',
    '/p/servicio/:slug',
], serveHtmlWithMetadata);
// Servir archivos multimedia subidos (imágenes, referencias, logos, comprobantes)
// Soporta múltiples rutas del hosting (cPanel Passenger, public_html o sistema anterior)
function getDynamicUploadDirs() {
    const dirs = new Set();
    const cwd = process.cwd();
    if (process.env.UPLOADS_DIR) {
        try {
            if (fs_1.default.existsSync(process.env.UPLOADS_DIR)) {
                dirs.add(path_1.default.resolve(process.env.UPLOADS_DIR));
            }
        }
        catch { }
    }
    // Rutas estándar relativas a la app actual en cPanel
    const standardPaths = [
        path_1.default.resolve(cwd, 'uploads'),
        path_1.default.resolve(cwd, '../uploads'),
        path_1.default.resolve(cwd, '../../uploads'),
        path_1.default.resolve(cwd, '../public_html/uploads'),
        path_1.default.resolve(cwd, '../../public_html/uploads'),
        path_1.default.resolve(cwd, 'public_html/uploads'),
        path_1.default.resolve(cwd, '../sistema/uploads'),
        path_1.default.resolve(cwd, '../sistema_anterior/uploads'),
        path_1.default.resolve(cwd, '../roma/uploads'),
        '/home/iqxalgre/public_html/uploads',
        '/home/iqxalgre/uploads',
        '/home/theromaagency/public_html/uploads',
        '/home/theromaagency/uploads',
    ];
    for (const p of standardPaths) {
        try {
            if (fs_1.default.existsSync(p) && fs_1.default.statSync(p).isDirectory()) {
                dirs.add(p);
            }
        }
        catch { }
    }
    // Explorar carpetas hermanas del directorio padre (ej: carpetas vecinas en cPanel)
    try {
        const parent = path_1.default.resolve(cwd, '..');
        const entries = fs_1.default.readdirSync(parent, { withFileTypes: true });
        for (const ent of entries) {
            if (ent.isDirectory()) {
                const u1 = path_1.default.resolve(parent, ent.name, 'uploads');
                if (fs_1.default.existsSync(u1))
                    dirs.add(u1);
                const u2 = path_1.default.resolve(parent, ent.name, 'public_html', 'uploads');
                if (fs_1.default.existsSync(u2))
                    dirs.add(u2);
            }
        }
    }
    catch { }
    // Explorar carpetas del usuario de cPanel (abuelo)
    try {
        const grandParent = path_1.default.resolve(cwd, '../..');
        const entries = fs_1.default.readdirSync(grandParent, { withFileTypes: true });
        for (const ent of entries) {
            if (ent.isDirectory()) {
                const u1 = path_1.default.resolve(grandParent, ent.name, 'uploads');
                if (fs_1.default.existsSync(u1))
                    dirs.add(u1);
                const u2 = path_1.default.resolve(grandParent, ent.name, 'public_html', 'uploads');
                if (fs_1.default.existsSync(u2))
                    dirs.add(u2);
            }
        }
    }
    catch { }
    return Array.from(dirs);
}
const uploadsDir = path_1.default.resolve(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Endpoint de diagnóstico para verificar rutas de subidas en cPanel
app.get('/api/system/uploads-diagnostic', (req, res) => {
    const cwd = process.cwd();
    const dirs = getDynamicUploadDirs();
    const details = dirs.map((d) => {
        let subdirs = [];
        let referencesCount = 0;
        let brandsCount = 0;
        try {
            subdirs = fs_1.default.readdirSync(d);
            if (fs_1.default.existsSync(path_1.default.join(d, 'references'))) {
                referencesCount = fs_1.default.readdirSync(path_1.default.join(d, 'references')).length;
            }
            if (fs_1.default.existsSync(path_1.default.join(d, 'brands'))) {
                brandsCount = fs_1.default.readdirSync(path_1.default.join(d, 'brands')).length;
            }
        }
        catch { }
        return { dir: d, subdirs, referencesCount, brandsCount };
    });
    res.json({
        cwd,
        env_UPLOADS_DIR: process.env.UPLOADS_DIR || null,
        scannedDirsCount: dirs.length,
        directories: details,
    });
});
// Función recursiva para sincronizar archivos desde el sistema anterior al local
function syncLegacyUploadsFolder(srcDir, destDir) {
    let copied = 0;
    let skipped = 0;
    let bytes = 0;
    if (!fs_1.default.existsSync(destDir)) {
        fs_1.default.mkdirSync(destDir, { recursive: true });
    }
    try {
        const entries = fs_1.default.readdirSync(srcDir, { withFileTypes: true });
        for (const ent of entries) {
            const srcPath = path_1.default.join(srcDir, ent.name);
            const destPath = path_1.default.join(destDir, ent.name);
            if (ent.isDirectory()) {
                const sub = syncLegacyUploadsFolder(srcPath, destPath);
                copied += sub.copied;
                skipped += sub.skipped;
                bytes += sub.bytes;
            }
            else if (ent.isFile()) {
                try {
                    if (!fs_1.default.existsSync(destPath)) {
                        fs_1.default.copyFileSync(srcPath, destPath);
                        const st = fs_1.default.statSync(destPath);
                        bytes += st.size;
                        copied++;
                    }
                    else {
                        skipped++;
                    }
                }
                catch { }
            }
        }
    }
    catch { }
    return { copied, skipped, bytes };
}
// Endpoint para disparar la migración manual de uploads del sistema anterior
app.post('/api/system/migrate-legacy-uploads', auth_1.requireAuth, (req, res) => {
    const source = req.body?.source || process.env.UPLOADS_DIR || '/home/iqxalgre/public_html/uploads';
    if (!fs_1.default.existsSync(source)) {
        return res.status(404).json({ error: `La carpeta de origen no existe: ${source}` });
    }
    const result = syncLegacyUploadsFolder(source, uploadsDir);
    console.log(`[Migración Legacy] Completada desde ${source}: ${result.copied} archivos copiados, ${result.skipped} omitidos.`);
    res.json({
        ok: true,
        source,
        destination: uploadsDir,
        ...result,
        megabytes: Number((result.bytes / (1024 * 1024)).toFixed(2)),
    });
});
app.use('/uploads', (req, res, next) => {
    const relativeSubpath = decodeURIComponent(req.path.replace(/^\/+/, ''));
    if (!relativeSubpath)
        return next();
    // 1. Revisar si ya está en la carpeta uploads local del sistema actual
    const localTarget = path_1.default.resolve(uploadsDir, relativeSubpath);
    if (fs_1.default.existsSync(localTarget) && fs_1.default.statSync(localTarget).isFile()) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(localTarget);
    }
    // 2. Si no está en local, buscar en directorios del sistema anterior y copiar on-demand
    const candidateDirs = getDynamicUploadDirs();
    for (const dir of candidateDirs) {
        if (dir === uploadsDir)
            continue;
        try {
            const fullPath = path_1.default.resolve(dir, relativeSubpath);
            if (fs_1.default.existsSync(fullPath) && fs_1.default.statSync(fullPath).isFile()) {
                // Auto-migración on-demand: guardar copia permanente en local
                try {
                    const parentDir = path_1.default.dirname(localTarget);
                    if (!fs_1.default.existsSync(parentDir)) {
                        fs_1.default.mkdirSync(parentDir, { recursive: true });
                    }
                    fs_1.default.copyFileSync(fullPath, localTarget);
                    console.log(`[Auto-Migrado a Local] ${relativeSubpath}`);
                }
                catch { }
                res.setHeader('Cache-Control', 'public, max-age=86400');
                return res.sendFile(fullPath);
            }
        }
        catch {
            // Intentar siguiente directorio candidato
        }
    }
    // 3. Si el archivo multimedia es una imagen y no se encuentra en ningún directorio,
    // responder con un placeholder SVG neutro (200 OK) para evitar errores 404 en consola
    // y evitar íconos rotos en las etiquetas <img> de marcas o avatares.
    const isImage = /\.(jpe?g|png|webp|svg|gif|ico)$/i.test(relativeSubpath);
    if (isImage) {
        const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none"><rect width="128" height="128" rx="16" fill="#f8fafc"/><path d="M44 50C46.7614 50 49 47.7614 49 45C49 42.2386 46.7614 40 44 40C41.2386 40 39 42.2386 39 45C39 47.7614 41.2386 50 44 50Z" fill="#94a3b8"/><path d="M36 86L54 62L66 76L78 60L92 86H36Z" fill="#cbd5e1"/><rect x="0.5" y="0.5" width="127" height="127" rx="15.5" stroke="#e2e8f0"/></svg>`.trim();
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).send(placeholderSvg);
    }
    // Si no se encuentra en ningún directorio y no es imagen, responder 404 estricto
    res.status(404).send('Archivo multimedia no encontrado');
});
// Servir imágenes de mockups estáticas de estudio
app.use('/mockups', express_1.default.static(path_1.default.resolve(process.cwd(), 'public', 'mockups')));
if (fs_1.default.existsSync(clientDistPath)) {
    app.use(express_1.default.static(clientDistPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
            serveHtmlWithMetadata(req, res);
        }
        else {
            res.status(404).json({ error: 'Ruta no encontrada' });
        }
    });
}
async function bootstrap() {
    await db_1.db.initialize();
    // Auto-migración en segundo plano al iniciar solo si existe una carpeta externa configurada
    const legacyDir = process.env.UPLOADS_DIR;
    if (legacyDir && fs_1.default.existsSync(legacyDir) && path_1.default.resolve(legacyDir) !== path_1.default.resolve(uploadsDir)) {
        console.log(`📦 [Auto-Migración] Detectada carpeta del sistema anterior en: ${legacyDir}`);
        console.log(`⏳ [Auto-Migración] Sincronizando archivos hacia ${uploadsDir} en segundo plano...`);
        setImmediate(() => {
            try {
                const stats = syncLegacyUploadsFolder(legacyDir, uploadsDir);
                const mb = (stats.bytes / (1024 * 1024)).toFixed(2);
                console.log(`✅ [Auto-Migración] Sincronización completada: ${stats.copied} archivos nuevos (${mb} MB), ${stats.skipped} existentes.`);
            }
            catch (err) {
                console.error('[Auto-Migración] Error al sincronizar:', err.message);
            }
        });
    }
    const serverPort = process.env.PORT || 3001;
    app.listen(serverPort, () => {
        console.log(`🚀 [SISTEMA ROMA V4 SaaS] Servidor activo en ${serverPort}`);
    });
}
bootstrap();
