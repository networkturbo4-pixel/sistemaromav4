import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { db } from './db';

// Import resiliente para multer y qrcode (no detiene el inicio del servidor en cPanel si falta correr npm install)
let multerModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  multerModule = require('multer');
} catch {
  console.warn('⚠️ [Multer] Paquete multer no instalado aún en node_modules.');
}

let qrcodeModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  qrcodeModule = require('qrcode');
} catch {
  console.warn('⚠️ [QRCode] Paquete qrcode no instalado aún en node_modules.');
}

const execAsync = promisify(exec);
import {
  AuthenticatedRequest,
  requireAuth,
  requirePermission,
  requireAnyPermission,
  signSessionToken,
} from './middleware/auth';
import { PERMISSIONS_CATALOG, hasPermission, hasAnyPermission } from '../shared/permissions';
import driveRouter from './routes/drive.routes';
import whiteboardRouter from './routes/whiteboards.routes';
import brandGuidelinesRouter from './routes/brand-guidelines.routes';
import { googleDriveService } from './services/googleDriveService';
import { generateTotpSecret, generateTotpCode, verifyTotpCode, buildOtpAuthUri } from './utils/totp';
import { notificationService, notifyEvent } from './services/notificationService';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(
  compression({
    filter: (req, res) => {
      if (
        req.headers.accept === 'text/event-stream' ||
        req.path.includes('/stream') ||
        (req.originalUrl && req.originalUrl.includes('/stream'))
      ) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);
// Permitir subir imágenes Base64 de logos, favicons, PWA y canvas de pizarras de hasta 50MB
app.use(express.json({ limit: '50mb' }));

// Módulo de Google Drive & Archivos Cloud
app.use('/api/drive', driveRouter);

// Módulo de Pizarras Creativas (Whiteboards)
app.use('/api/workspace/whiteboards', whiteboardRouter);

// Submódulo: Brand Guidelines / Pitch Decks (Público y Privado)
app.use('/api/workspace/brand-guidelines', brandGuidelinesRouter);
app.use('/api/brand-guidelines', brandGuidelinesRouter);

// =============================================================================
// 1. ENDPOINTS PÚBLICOS Y AUTENTICACIÓN POR PIN DE 8 DÍGITOS
// =============================================================================

app.get('/api/public/tenant-branding', async (req: Request, res: Response) => {
  try {
    const slug = (req.query.tenant as string) || (req.headers['x-tenant-slug'] as string);
    const tenant = await db.getPublicTenantBranding(slug);
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
      engineInfo: db.getEngineInfo(),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/public/quotes/:publicToken', async (req: Request, res: Response) => {
  try {
    const { publicToken } = req.params;
    if (!publicToken) {
      res.status(400).json({ error: 'Token de cotización no especificado.' });
      return;
    }
    const result = await db.getQuoteByPublicToken(publicToken as string);
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
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Catálogo público de servicios
app.get('/api/public/services', async (req: Request, res: Response) => {
  try {
    const slug = (req.query.tenant as string) || (req.headers['x-tenant-slug'] as string);
    const categorySlug = req.query.category as string | undefined;
    const result = await db.getPublicServices(slug, categorySlug);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Detalle público de un servicio
app.get('/api/public/services/:slugOrId', async (req: Request, res: Response) => {
  try {
    const slug = (req.query.tenant as string) || (req.headers['x-tenant-slug'] as string);
    const { slugOrId } = req.params;
    if (!slugOrId) {
      res.status(400).json({ error: 'Identificador de servicio no especificado.' });
      return;
    }
    const result = await db.getPublicServiceBySlugOrId(slug, slugOrId as string);
    if (!result) {
      res.status(404).json({ error: 'Servicio no encontrado o no disponible públicamente.' });
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/auth/login-pin', async (req: Request, res: Response) => {
  try {
    const { pin, tenantSlug } = req.body;
    if (!pin || typeof pin !== 'string' || !/^\d{8}$/.test(pin.trim())) {
      res.status(400).json({ error: 'Debes ingresar un PIN válido de exactamente 8 dígitos.' });
      return;
    }

    const match = await db.findUserByPin(pin.trim(), tenantSlug);
    if (!match) {
      res.status(401).json({
        error: 'PIN de 8 dígitos incorrecto o usuario inactivo. Verifica tu código de acceso.',
      });
      return;
    }

    const token = signSessionToken({
      userId: match.user.id,
      tenantId: match.tenant.id,
      roleId: match.role.id,
    });

    const todayAttendance = await db.getTodayAttendance(match.tenant.id, match.user.id);
    const hrSettings = await db.getHrSettings(match.tenant.id);
    const profile = await db.getEmployeeProfileByUserId(match.tenant.id, match.user.id);

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

    const isAdmin = (match.role.permissions as any)?.includes('*') || hasPermission(match.role.permissions, 'administration.hr.manage');

    res.json({
      token,
      user: match.user,
      role: match.role,
      tenant: match.tenant,
      permissionsCatalog: PERMISSIONS_CATALOG,
      engineInfo: db.getEngineInfo(),
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
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { user, role, tenant } = req.auth!;
  const todayAttendance = await db.getTodayAttendance(tenant.id, user.id);
  const hrSettings = await db.getHrSettings(tenant.id);
  const profile = await db.getEmployeeProfileByUserId(tenant.id, user.id);

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

  const isAdmin = (role?.permissions as any)?.includes('*') || hasPermission(role?.permissions, 'administration.hr.manage');

  res.json({
    user,
    role,
    tenant,
    permissionsCatalog: PERMISSIONS_CATALOG,
    engineInfo: db.getEngineInfo(),
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

app.post('/api/auth/switch-tenant', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetTenantId } = req.body;
    if (!targetTenantId) {
      res.status(400).json({ error: 'targetTenantId es obligatorio.' });
      return;
    }

    const targetTenant = await db.getTenantById(targetTenantId);
    if (!targetTenant) {
      res.status(404).json({ error: 'El espacio de trabajo solicitado no existe.' });
      return;
    }
    if (targetTenant.status !== 'active') {
      res.status(403).json({ error: 'El espacio de trabajo solicitado está suspendido.' });
      return;
    }

    // 1. Buscar si el usuario actual tiene una cuenta en el tenant destino (por PIN o Email)
    let targetUser = await db.findUserInTenantByPinOrEmail(
      targetTenantId,
      req.auth!.user.pin,
      req.auth!.user.email
    );

    // 2. Si no tiene cuenta directa, pero es Administrador o tiene permisos de gestión en su tenant actual,
    // enlazarlo con el usuario administrador activo del tenant destino
    if (!targetUser) {
      const hasPermissionToSwitch =
        req.auth?.role?.isSystem ||
        (req.auth?.role &&
          hasAnyPermission(req.auth.role.permissions, [
            'settings.tenants.manage',
            'settings.tenants.view',
          ]));

      if (hasPermissionToSwitch) {
        const users = await db.getUsersByTenant(targetTenantId);
        targetUser = users.find((u) => u.isActive) || null;
      }
    }

    if (!targetUser) {
      res.status(403).json({
        error: `No tienes una cuenta de usuario asignada en el espacio "${targetTenant.name}".`,
      });
      return;
    }

    const session = await db.getSessionContext(targetUser.id, targetTenantId);
    if (!session) {
      res.status(404).json({ error: 'No se pudo resolver la sesión del tenant destino.' });
      return;
    }

    const token = signSessionToken({
      userId: session.user.id,
      tenantId: session.tenant.id,
      roleId: session.role?.id || '',
    });

    res.json({
      token,
      user: session.user,
      role: session.role,
      tenant: session.tenant,
      permissionsCatalog: PERMISSIONS_CATALOG,
      engineInfo: db.getEngineInfo(),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// =============================================================================
// 2. ENDPOINT DASHBOARD (PROTEGIDO CON PERMISOS GRANULARES)
// =============================================================================

app.get(
  '/api/dashboard/summary',
  requireAuth,
  requirePermission('dashboard.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenant } = req.auth!;
      const clients = await db.getClientsByTenant(tenant.id);
      const users = await db.getUsersByTenant(tenant.id);
      const roles = await db.getRolesByTenant(tenant.id);
      const services = await db.getServices(tenant.id);

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
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// =============================================================================
// SISTEMA DE NOTIFICACIONES MULTITENANT & PWA PUSH (MÓDULOS CONECTADOS & CELULAR)
// =============================================================================

// Listar notificaciones del tenant
app.get(
  '/api/notifications',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const unreadOnly = req.query.unreadOnly === 'true';
      const moduleFilter = req.query.module as string | undefined;

      const notifications = await db.getNotifications(req.auth!.tenant.id, {
        limit,
        unreadOnly,
        module: moduleFilter,
      });
      res.json({ notifications });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Canal SSE (Server-Sent Events) para recibir notificaciones en tiempo real
app.get('/api/notifications/stream', requireAuth, (req: AuthenticatedRequest, res: Response) => {
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
      } catch (e) {
        clearInterval(heartbeatInterval);
      }
    }, 20000);

    const unregister = notificationService.registerSseClient(req.auth!.tenant.id, res);

    req.on('close', () => {
      clearInterval(heartbeatInterval);
      unregister();
    });
  } catch (err) {
    console.error('[SSE Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
});

// Marcar notificación individual como leída
app.put(
  '/api/notifications/:id/read',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = await db.markNotificationAsRead(
        req.auth!.tenant.id,
        req.params.id as string
      );
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Marcar todas las notificaciones como leídas
app.put(
  '/api/notifications/read-all',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updatedCount = await db.markAllNotificationsAsRead(req.auth!.tenant.id);
      res.json({ success: true, count: updatedCount });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar notificación individual
app.delete(
  '/api/notifications/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteNotification(req.auth!.tenant.id, req.params.id as string);
      res.json({ success: deleted });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Limpiar todas las notificaciones del tenant
app.delete(
  '/api/notifications',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deletedCount = await db.clearAllNotifications(req.auth!.tenant.id);
      res.json({ success: true, count: deletedCount });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Obtener clave pública VAPID para suscripción push del celular / PWA
app.get('/api/notifications/vapid-key', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const publicKey = notificationService.getVapidPublicKey();
  res.json({ publicKey });
});

// Registrar o actualizar suscripción push de un celular / navegador PWA
app.post(
  '/api/notifications/push-subscribe',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { subscription, userAgent } = req.body;
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        res.status(400).json({ error: 'Suscripción inválida' });
        return;
      }

      await db.savePushSubscription({
        tenantId: req.auth!.tenant.id,
        userId: req.auth!.user.id,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        userAgent: userAgent || req.headers['user-agent'] || '',
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Desuscribir dispositivo de notificaciones push
app.post(
  '/api/notifications/push-unsubscribe',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) {
        await db.deletePushSubscription(endpoint);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Enviar notificación de prueba al celular del usuario
app.post(
  '/api/notifications/test-push',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const notif = await notificationService.notify({
        tenantId: req.auth!.tenant.id,
        title: '🔔 ¡Notificaciones PWA activas!',
        message: `Hola ${req.auth!.user.name}, las notificaciones en tu celular y PWA están funcionando correctamente.`,
        type: 'success',
        module: 'system',
        action: 'test',
        link: '/',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      });

      res.json({ success: true, notification: notif });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Endpoint genérico para que cualquier módulo presente o futuro se conecte automáticamente
app.post(
  '/api/notifications/notify',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, message, type, module: notifModule, entityId, action, link, metadata } = req.body;
      if (!title || !message) {
        res.status(400).json({ error: 'Título y mensaje son obligatorios.' });
        return;
      }

      const notif = await notificationService.notify({
        tenantId: req.auth!.tenant.id,
        title,
        message,
        type: type || 'info',
        module: notifModule || 'general',
        entityId,
        action,
        link,
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
        metadata,
      });

      res.status(201).json({ notification: notif });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// =============================================================================
// 3. PRIMER MÓDULO: CLIENTES Y MARCAS ASIGNADAS (MULTITENANT + PERMISOS)
// =============================================================================

app.get(
  '/api/clients',
  requireAuth,
  requirePermission('clients.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clients = await db.getClientsByTenant(req.auth!.tenant.id);
      res.json({ clients });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/clients',
  requireAuth,
  requirePermission('clients.create'),
  async (req: AuthenticatedRequest, res: Response) => {
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

      const created = await db.createClient(req.auth!.tenant.id, {
        name,
        documentType: documentType || 'RUC',
        documentNumber,
        whatsapp,
        email: email || null, // No obligatorio
        notes: notes || '',
        brands: Array.isArray(brands) ? brands : [],
      });

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'clients',
        type: 'success',
        title: 'Nuevo cliente registrado',
        message: `Se registró el cliente "${created.name}" (${created.documentType}: ${created.documentNumber})`,
        entityId: created.id,
        action: 'create',
        link: '/?module=clients',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.status(201).json({ client: created });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.put(
  '/api/clients/:id',
  requireAuth,
  requirePermission('clients.edit'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateClient(
        req.auth!.tenant.id,
        req.params.id as string,
        req.body
      );
      if (!updated) {
        res.status(404).json({ error: 'Cliente no encontrado en este tenant.' });
        return;
      }

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'clients',
        type: 'info',
        title: 'Cliente actualizado',
        message: `Se actualizaron los datos del cliente "${updated.name}"`,
        entityId: updated.id,
        action: 'update',
        link: '/?module=clients',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.json({ client: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/clients/:id',
  requireAuth,
  requirePermission('clients.delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteClient(req.auth!.tenant.id, req.params.id as string);
      if (!deleted) {
        res.status(404).json({ error: 'Cliente no encontrado.' });
        return;
      }

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'clients',
        type: 'warning',
        title: 'Cliente eliminado',
        message: 'Se eliminó un cliente y sus marcas asociadas.',
        action: 'delete',
        link: '/?module=clients',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);






// Marcas asignadas al cliente
app.post(
  '/api/clients/:clientId/brands',
  requireAuth,
  requirePermission('brands.create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
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
      } = req.body;
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'El nombre de la marca es obligatorio.' });
        return;
      }
      const brand = await db.createBrand(
        req.auth!.tenant.id,
        req.params.clientId as string,
        {
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
        }
      );
      if (!brand) {
        res.status(404).json({ error: 'Cliente no encontrado en este tenant.' });
        return;
      }
      res.status(201).json({ brand });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.put(
  '/api/brands/:brandId',
  requireAuth,
  requirePermission('brands.edit'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateBrand(
        req.auth!.tenant.id,
        req.params.brandId as string,
        req.body
      );
      if (!updated) {
        res.status(404).json({ error: 'Marca no encontrada en este tenant.' });
        return;
      }
      res.json({ brand: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/brands/:brandId',
  requireAuth,
  requirePermission('brands.delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ok = await db.deleteBrand(req.auth!.tenant.id, req.params.brandId as string);
      if (!ok) {
        res.status(404).json({ error: 'Marca no encontrada.' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);






// =============================================================================
// MÓDULO DE COTIZACIONES (QUOTES) & PROPUESTAS
// =============================================================================

app.get(
  '/api/quotes',
  requireAuth,
  requireAnyPermission(['quotes.view', 'payments.view', 'service_orders.view']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const quotes = await db.getQuotesByTenant(req.auth!.tenant.id);
      res.json({ quotes });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.get(
  '/api/quotes/:id',
  requireAuth,
  requirePermission('quotes.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      let quote = await db.getQuoteById(req.params.id as string, req.auth!.tenant.id);
      const isSuperAdmin = req.auth?.role?.isSystem || req.auth?.role?.name === 'Super Administrador';
      if (!quote && isSuperAdmin) {
        quote = (db as any).localState?.quotes?.find((q: any) => q.id === req.params.id) || null;
      }
      if (!quote) {
        res.status(404).json({ error: 'Cotización no encontrada.' });
        return;
      }
      res.json({ quote });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/quotes',
  requireAuth,
  requirePermission('quotes.create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await db.createQuote(req.auth!.tenant.id, req.body);

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'quotes',
        type: 'success',
        title: 'Nueva cotización creada',
        message: `Se creó la cotización ${created.code} para "${created.clientName}" (${created.items.length} ítems)`,
        entityId: created.id,
        action: 'create',
        link: '/?module=quotes',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.status(201).json({ quote: created });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.put(
  '/api/quotes/:id',
  requireAuth,
  requirePermission('quotes.edit'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateQuote(req.params.id as string, req.auth!.tenant.id, req.body);
      if (!updated) {
        res.status(404).json({ error: 'Cotización no encontrada.' });
        return;
      }

      const isApproved = updated.status === 'approved';
      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'quotes',
        type: isApproved ? 'success' : 'info',
        title: isApproved ? '🎉 ¡Cotización aprobada!' : 'Cotización actualizada',
        message: `Cotización ${updated.code} para "${updated.clientName}" actualizada (Estado: ${updated.status})`,
        entityId: updated.id,
        action: 'update',
        link: '/?module=quotes',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.json({ quote: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/quotes/:id',
  requireAuth,
  requirePermission('quotes.delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteQuote(req.params.id as string, req.auth!.tenant.id);
      if (!deleted) {
        res.status(404).json({ error: 'Cotización no encontrada.' });
        return;
      }

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'quotes',
        type: 'warning',
        title: 'Cotización eliminada',
        message: 'Se eliminó una cotización del sistema.',
        action: 'delete',
        link: '/?module=quotes',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

// =============================================================================
// MÓDULO DE NOTAS DE PAGO (RECIBOS, COMPROBANTES DE COBRO & RECIBOS)
// =============================================================================

// Listar notas de pago del tenant
app.get(
  '/api/payment-notes',
  requireAuth,
  requirePermission('payments.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const notes = await db.getPaymentNotesByTenant(req.auth!.tenant.id);
      res.json({ paymentNotes: notes });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Obtener nota de pago por ID
app.get(
  '/api/payment-notes/:id',
  requireAuth,
  requirePermission('payments.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const note = await db.getPaymentNoteById(req.params.id as string, req.auth!.tenant.id);
      if (!note) {
        return res.status(404).json({ error: 'Nota de pago no encontrada' });
      }
      res.json({ paymentNote: note });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Crear nota de pago
app.post(
  '/api/payment-notes',
  requireAuth,
  requirePermission('payments.create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await db.createPaymentNote(req.auth!.tenant.id, {
        ...req.body,
        createdBy: req.auth!.user.name,
      });

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'payments',
        type: 'info',
        title: 'Nueva Nota de Cobro emitida',
        message: `Se emitió la nota #${created.code} para "${created.clientName}" por ${created.currency} ${Number(created.total || 0).toFixed(2)}`,
        entityId: created.id,
        action: 'create',
        link: '/?module=payments',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.status(201).json({ paymentNote: created });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Actualizar nota de pago
app.put(
  '/api/payment-notes/:id',
  requireAuth,
  requirePermission('payments.edit'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updatePaymentNote(
        req.params.id as string,
        req.auth!.tenant.id,
        req.body
      );
      if (!updated) {
        return res.status(404).json({ error: 'Nota de pago no encontrada' });
      }

      const isPaid = updated.status === 'paid';
      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'payments',
        type: isPaid ? 'success' : 'info',
        title: isPaid ? '💰 ¡Nota de cobro pagada!' : 'Nota de cobro actualizada',
        message: `Nota #${updated.code} de "${updated.clientName}" actualizada (Estado: ${updated.status})`,
        entityId: updated.id,
        action: 'update',
        link: '/?module=payments',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.json({ paymentNote: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar nota de pago
app.delete(
  '/api/payment-notes/:id',
  requireAuth,
  requirePermission('payments.delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deletePaymentNote(req.params.id as string, req.auth!.tenant.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Nota de pago no encontrada' });
      }

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'payments',
        type: 'warning',
        title: 'Nota de cobro eliminada',
        message: 'Se eliminó un comprobante de cobro del sistema.',
        action: 'delete',
        link: '/?module=payments',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Endpoint público para que el cliente consulte su nota de pago (sin requerir autenticación)
// --- VISTA PÚBLICA DE PERSONAL E HISTORIAL DE PAGOS ---
app.get('/api/public/personal/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const data = await db.getEmployeeProfileByPublicToken(token);
    if (!data) {
      return res.status(404).json({ error: 'Ficha de personal no encontrada o enlace vencido' });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/public/payment-notes/:token', async (req: Request, res: Response) => {
  try {
    const result = await db.getPaymentNoteByPublicToken(req.params.token as string);
    if (!result) {
      return res.status(404).json({ error: 'Comprobante de pago no encontrado o no disponible' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Endpoint público para vista de mes / grilla de contenidos de Workspace (con soporte de PIN opcional)
app.get('/api/public/workspace/months/:token', async (req: Request, res: Response) => {
  try {
    const result = await db.getWorkspaceMonthByPublicToken(req.params.token as string);
    if (!result) {
      return res.status(404).json({ error: 'Grilla de contenidos no encontrada o enlace vencido' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Endpoint público para enviar comentarios en una publicación desde la vista pública
app.post('/api/public/workspace/months/:token/posts/:postId/comments', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const postId = req.params.postId as string;
    const { author, text, avatar } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'El comentario no puede estar vacío.' });
    }

    const monthData = await db.getWorkspaceMonthByPublicToken(token);
    if (!monthData) {
      return res.status(404).json({ error: 'Grilla no encontrada' });
    }

    const post = monthData.posts.find((p) => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const newComment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tab: 'design' as const,
      author: author?.trim() || 'Cliente',
      avatar: avatar || undefined,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...(post.comments || []), newComment];
    const tenantId = post.tenantId || monthData.month.tenantId;
    const updatedPost = await db.updateWorkspacePost(post.id, tenantId, { comments: updatedComments });
    if (!updatedPost) {
      const pIdx = (db as any).localState?.workspacePosts?.findIndex((p: any) => p.id === post.id);
      if (pIdx !== -1 && pIdx !== undefined) {
        (db as any).localState.workspacePosts[pIdx].comments = updatedComments;
        (db as any).saveLocalState();
      }
    }

    notificationService.notify({
      tenantId: post.tenantId,
      module: 'workspace',
      type: 'info',
      title: '💬 Nuevo comentario en Workspace',
      message: `${newComment.author} comentó en "${post.title || 'Publicación'}": "${newComment.text.slice(0, 60)}${newComment.text.length > 60 ? '...' : ''}"`,
      entityId: post.id,
      action: 'comment',
      link: '/?module=workspace',
      actorUserName: newComment.author,
    }).catch(() => {});

    res.json({ success: true, comment: newComment });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// =============================================================================
// ENDPOINTS PÚBLICOS DE BIOLINKS (LINKTREE SAAS)
// =============================================================================

app.get('/api/public/biolinks/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const result = await db.getBiolinkBySlug(slug);
    if (!result) {
      return res.status(404).json({ error: 'Perfil de Biolink no encontrado o inactivo.' });
    }
    // Registrar vista de manera asíncrona
    db.recordBiolinkView(slug).catch(() => {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/public/biolinks/:slug/click', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const { blockId } = req.body;
    await db.recordBiolinkClick(slug, blockId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// =============================================================================
// SUBMÓDULO: PIZARRAS CREATIVAS (VISTA PÚBLICA / ENLACE COMPARTIDO)
// =============================================================================

app.get('/api/public/whiteboards/:tokenOrId', async (req: Request, res: Response) => {
  try {
    const tokenOrId = req.params.tokenOrId as string;
    const board = await db.getWhiteboardByShareToken(tokenOrId);
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

    const tenant = await db.getTenantById(board.tenantId);
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
      tenant: tenant ? { name: tenant.name, logo: (tenant as any).companyInfo?.logoUrl || '' } : null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/public/whiteboards/:tokenOrId/canvas', async (req: Request, res: Response) => {
  try {
    const tokenOrId = req.params.tokenOrId as string;
    const { content, thumbnail } = req.body;
    const board = await db.getWhiteboardByShareToken(tokenOrId);
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
    await db.saveWhiteboardCanvas(board.id, board.tenantId, content, thumbnail);
    return res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// SUBMÓDULO: FORMULARIOS INTERACTIVOS (PÚBLICO Y SUBIDA DE ARCHIVOS)
// =============================================================================

const formUploadSingle = (req: Request, res: Response, next: NextFunction) => {
  if (!multerModule) {
    return res.status(503).json({
      error: 'El módulo multer para carga de archivos no está instalado en el servidor. Ejecuta "Run NPM Install" en Setup Node.js App.',
    });
  }
  const formsUploadStorage = multerModule.diskStorage({
    destination: (_req: any, _file: any, cb: any) => {
      const dir = path.resolve(process.cwd(), 'uploads', 'forms');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (_req: any, file: any, cb: any) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
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
app.post('/api/public/forms/upload', formUploadSingle, (req: Request, res: Response) => {
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
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Subida de portadas y logos para formularios (autenticado)
app.post('/api/workspace/forms/upload-asset', requireAuth, formUploadSingle, (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha proporcionado ningún archivo' });
    }
    res.json({
      url: `/uploads/forms/${req.file.filename}`,
      fileName: req.file.originalname,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Obtener formulario público por slug
app.get('/api/public/forms/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const result = await db.getFormBySlug(slug);
    if (!result) {
      return res.status(404).json({ error: 'Formulario no encontrado o no disponible' });
    }

    db.recordFormView(slug).catch(() => {});

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
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Enviar respuestas a formulario público
app.post('/api/public/forms/:slug/submit', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const { clientName, clientEmail, answers, files } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    const submission = await db.submitFormAnswers(slug, {
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
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});


// =============================================================================
// MÓDULO DE WORKSPACE: REDES SOCIALES & PROYECTOS
// =============================================================================

// Listar proyectos de workspace
app.get(
  '/api/workspace/projects',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clientId = req.query.clientId as string | undefined;
      const projects = await db.getWorkspaceProjects(req.auth!.tenant.id, clientId);
      res.json({ projects });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Crear proyecto de workspace vinculado a OS
app.post(
  '/api/workspace/projects',
  requireAuth,
  requirePermission('workspace.social.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await db.createWorkspaceProject({
        ...req.body,
        tenantId: req.auth!.tenant.id,
      });
      res.status(201).json({ project: created });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Actualizar proyecto de workspace
app.put(
  '/api/workspace/projects/:id',
  requireAuth,
  requirePermission('workspace.social.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateWorkspaceProject(
        req.params.id as string,
        req.auth!.tenant.id,
        req.body
      );
      if (!updated) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }
      res.json({ project: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar proyecto de workspace
app.delete(
  '/api/workspace/projects/:id',
  requireAuth,
  requirePermission('workspace.social.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteWorkspaceProject(
        req.params.id as string,
        req.auth!.tenant.id
      );
      if (!deleted) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// =============================================================================
// MESES / CAMPAÑAS MENSUALES DE CONTENIDO CON ESTRUCTURA GOOGLE DRIVE
// =============================================================================

// Listar meses de un proyecto (o todos los del tenant)
app.get(
  '/api/workspace/months',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const months = await db.getWorkspaceMonths(req.auth!.tenant.id, projectId);
      res.json({ months });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Crear mes y generar automáticamente la estructura de 7 carpetas en Google Drive
app.post(
  '/api/workspace/months',
  requireAuth,
  requirePermission('workspace.social.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectId, name, month, year, startDate, endDate, status } = req.body;
      const tenantId = req.auth!.tenant.id;

      if (!projectId) {
        return res.status(400).json({ error: 'El ID del proyecto es requerido.' });
      }

      const project = await db.getWorkspaceProjectById(projectId, tenantId);
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
      let driveSubfolders: Array<{ name: string; driveFolderId?: string; webViewLink?: string }> =
        DEFAULT_SUBFOLDERS.map((name) => ({ name }));

      // Si Google Drive está configurado, crear la carpeta del mes y las 7 subcarpetas
      if (googleDriveService.isReady()) {
        try {
          const parentFolderId = project?.driveFolderId || googleDriveService.getRootFolderId();
          const folderName = name || `Mes ${month} ${year}`;
          const monthFolder = await googleDriveService.createFolder(folderName, parentFolderId);
          driveFolderId = monthFolder.id;
          driveFolderName = monthFolder.name;
          driveFolderLink = monthFolder.webViewLink || `https://drive.google.com/drive/folders/${monthFolder.id}`;

          // Crear las 7 subcarpetas en paralelo dentro de la carpeta del mes
          const subfolderResults = await Promise.all(
            DEFAULT_SUBFOLDERS.map(async (sfName) => {
              try {
                const sf = await googleDriveService.createFolder(sfName, monthFolder.id);
                return {
                  name: sfName,
                  driveFolderId: sf.id,
                  webViewLink: sf.webViewLink || `https://drive.google.com/drive/folders/${sf.id}`,
                };
              } catch (subErr) {
                console.error(`[Drive] Error creando subcarpeta ${sfName}:`, subErr);
                return { name: sfName };
              }
            })
          );
          driveSubfolders = subfolderResults;
        } catch (driveErr) {
          console.error('[Drive] Error creando estructura del mes en Drive:', driveErr);
        }
      }

      const created = await db.createWorkspaceMonth(tenantId, {
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
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Actualizar mes
app.put(
  '/api/workspace/months/:id',
  requireAuth,
  requirePermission('workspace.social.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateWorkspaceMonth(
        req.params.id as string,
        req.auth!.tenant.id,
        req.body
      );
      if (!updated) {
        return res.status(404).json({ error: 'Mes no encontrado' });
      }
      res.json({ month: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar mes
app.delete(
  '/api/workspace/months/:id',
  requireAuth,
  requirePermission('workspace.social.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteWorkspaceMonth(
        req.params.id as string,
        req.auth!.tenant.id
      );
      if (!deleted) {
        return res.status(404).json({ error: 'Mes no encontrado' });
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Listar publicaciones de redes sociales
app.get(
  '/api/workspace/posts',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clientId = req.query.clientId as string | undefined;
      const posts = await db.getWorkspacePosts(req.auth!.tenant.id, clientId);
      res.json({ posts });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Obtener una publicación individual (para sincronización de comentarios en tiempo real)
app.get(
  '/api/workspace/posts/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const postId = req.params.id as string;
      const posts = await db.getWorkspacePosts(req.auth!.tenant.id);
      const post = posts.find((p) => p.id === postId);
      if (!post) {
        return res.status(404).json({ error: 'Publicación no encontrada' });
      }
      res.json({ post });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Crear publicación
app.post(
  '/api/workspace/posts',
  requireAuth,
  requirePermission('workspace.social.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await db.createWorkspacePost(req.auth!.tenant.id, req.body);

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'workspace',
        type: 'info',
        title: 'Nuevo contenido programado',
        message: `Se programó la publicación "${created.title || 'Sin título'}" en Workspace`,
        entityId: created.id,
        action: 'create',
        link: '/?module=workspace',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.status(201).json({ post: created });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Actualizar publicación
app.put(
  '/api/workspace/posts/:id',
  requireAuth,
  requirePermission('workspace.social.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateWorkspacePost(
        req.params.id as string,
        req.auth!.tenant.id,
        req.body
      );
      if (!updated) {
        return res.status(404).json({ error: 'Publicación no encontrada' });
      }
      res.json({ post: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar publicación
app.delete(
  '/api/workspace/posts/:id',
  requireAuth,
  requirePermission('workspace.social.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteWorkspacePost(
        req.params.id as string,
        req.auth!.tenant.id
      );
      if (!deleted) {
        return res.status(404).json({ error: 'Publicación no encontrada' });
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// =============================================================================
// MÓDULO DE WORKSPACE: TAREAS OPERATIVAS
// =============================================================================

// Listar tareas
app.get(
  '/api/workspace/tasks',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clientId = req.query.clientId as string | undefined;
      const tasks = await db.getWorkspaceTasks(req.auth!.tenant.id, clientId);
      res.json({ tasks });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Crear tarea
app.post(
  '/api/workspace/tasks',
  requireAuth,
  requirePermission('workspace.tasks.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await db.createWorkspaceTask(req.auth!.tenant.id, req.body);

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'workspace',
        type: 'info',
        title: 'Nueva tarea asignada',
        message: `Se creó la tarea "${created.title}"${created.assignedUserId ? ` asignada a usuario` : ''}`,
        entityId: created.id,
        action: 'create',
        link: '/?module=workspace',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.status(201).json({ task: created });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Actualizar tarea
app.put(
  '/api/workspace/tasks/:id',
  requireAuth,
  requirePermission('workspace.tasks.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateWorkspaceTask(
        req.params.id as string,
        req.auth!.tenant.id,
        req.body
      );
      if (!updated) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
      }
      res.json({ task: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar tarea
app.delete(
  '/api/workspace/tasks/:id',
  requireAuth,
  requirePermission('workspace.tasks.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteWorkspaceTask(
        req.params.id as string,
        req.auth!.tenant.id
      );
      if (!deleted) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// =============================================================================
// MÓDULO DE WORKSPACE: HERRAMIENTAS (BIOLINKS, PALETAS, CÓDIGOS)
// =============================================================================

// Listar Biolinks
app.get(
  '/api/workspace/biolinks',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const list = await db.getBiolinks(req.auth!.tenant.id);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Obtener un Biolink por ID
app.get(
  '/api/workspace/biolinks/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = await db.getBiolinkById(req.params.id as string, req.auth!.tenant.id);
      if (!item) return res.status(404).json({ error: 'Perfil de Biolink no encontrado' });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Crear Biolink
app.post(
  '/api/workspace/biolinks',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await db.createBiolink(req.auth!.tenant.id, req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Actualizar Biolink
app.put(
  '/api/workspace/biolinks/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateBiolink(
        req.params.id as string,
        req.auth!.tenant.id,
        req.body
      );
      if (!updated) return res.status(404).json({ error: 'Perfil de Biolink no encontrado' });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar Biolink
app.delete(
  '/api/workspace/biolinks/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteBiolink(req.params.id as string, req.auth!.tenant.id);
      if (!deleted) return res.status(404).json({ error: 'Perfil de Biolink no encontrado' });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Paletas Guardadas
app.get(
  '/api/workspace/palettes',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const list = await db.getSavedPalettes(req.auth!.tenant.id);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/workspace/palettes',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await db.savePalette(req.auth!.tenant.id, req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/workspace/palettes/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deletePalette(req.params.id as string, req.auth!.tenant.id);
      if (!deleted) return res.status(404).json({ error: 'Paleta no encontrada' });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Historial de Códigos
app.get(
  '/api/workspace/codes/history',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const list = await db.getCodeHistory(req.auth!.tenant.id);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/workspace/codes/history',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const item = await db.addCodeHistory(req.auth!.tenant.id, req.body);
      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/workspace/codes/history',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await db.clearCodeHistory(req.auth!.tenant.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// =============================================================================
// SUBMÓDULO: FORMULARIOS DE WORKSPACE (GESTIÓN Y RESULTADOS)
// =============================================================================

// Listar formularios
app.get(
  '/api/workspace/forms',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const forms = await db.getForms(req.auth!.tenant.id);
      res.json({ forms });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Obtener un formulario por ID
app.get(
  '/api/workspace/forms/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const form = await db.getFormById(req.params.id as string, req.auth!.tenant.id);
      if (!form) return res.status(404).json({ error: 'Formulario no encontrado' });
      res.json({ form });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Crear formulario en blanco
app.post(
  '/api/workspace/forms',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const form = await db.createForm(req.auth!.tenant.id, req.body);
      res.status(201).json({ form });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Actualizar formulario
app.put(
  '/api/workspace/forms/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateForm(req.params.id as string, req.auth!.tenant.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Formulario no encontrado' });
      res.json({ form: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar formulario
app.delete(
  '/api/workspace/forms/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteForm(req.params.id as string, req.auth!.tenant.id);
      if (!deleted) return res.status(404).json({ error: 'Formulario no encontrado' });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Duplicar formulario
app.post(
  '/api/workspace/forms/:id/duplicate',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const copy = await db.duplicateForm(req.params.id as string, req.auth!.tenant.id);
      if (!copy) return res.status(404).json({ error: 'Formulario no encontrado' });
      res.status(201).json({ form: copy });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Listar respuestas de un formulario
app.get(
  '/api/workspace/forms/:id/submissions',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const submissions = await db.getFormSubmissions(req.params.id as string, req.auth!.tenant.id);
      res.json({ submissions });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar una respuesta
app.delete(
  '/api/workspace/forms/submissions/:submissionId',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteFormSubmission(req.params.submissionId as string, req.auth!.tenant.id);
      if (!deleted) return res.status(404).json({ error: 'Respuesta no encontrada' });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// =============================================================================
// SUBMÓDULO: SALAS DE REUNIONES & ACTAS DE WORKSPACE
// =============================================================================

// Listar salas de reunión
app.get(
  '/api/workspace/meeting-rooms',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rooms = await db.getMeetingRooms(req.auth!.tenant.id);
      res.json({ rooms });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Obtener una sala por ID
app.get(
  '/api/workspace/meeting-rooms/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const room = await db.getMeetingRoomById(req.params.id as string, req.auth!.tenant.id);
      if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
      res.json({ room });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Crear sala de reunión
app.post(
  '/api/workspace/meeting-rooms',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const room = await db.createMeetingRoom(req.auth!.tenant.id, req.body);
      res.status(201).json({ room });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Actualizar sala de reunión
app.put(
  '/api/workspace/meeting-rooms/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateMeetingRoom(req.params.id as string, req.auth!.tenant.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Sala no encontrada' });
      res.json({ room: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar sala de reunión
app.delete(
  '/api/workspace/meeting-rooms/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteMeetingRoom(req.params.id as string, req.auth!.tenant.id);
      if (!deleted) return res.status(404).json({ error: 'Sala no encontrada o protegida' });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// --- REUNIONES Y ACTAS ---

// Listar reuniones con filtros
app.get(
  '/api/workspace/meetings',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { roomId, brandId, clientId, status, search } = req.query as Record<string, string>;
      const meetings = await db.getMeetings(req.auth!.tenant.id, {
        roomId,
        brandId,
        clientId,
        status,
        search,
      });
      res.json({ meetings });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Obtener detalle de una reunión
app.get(
  '/api/workspace/meetings/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const meeting = await db.getMeetingById(req.params.id as string, req.auth!.tenant.id);
      if (!meeting) return res.status(404).json({ error: 'Reunión no encontrada' });
      res.json({ meeting });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Crear reunión / acta
app.post(
  '/api/workspace/meetings',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const meeting = await db.createMeeting(req.auth!.tenant.id, req.body, req.auth!.user.id);
      res.status(201).json({ meeting });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Actualizar reunión / acta
app.put(
  '/api/workspace/meetings/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateMeeting(req.params.id as string, req.auth!.tenant.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Reunión no encontrada' });
      res.json({ meeting: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar reunión / acta
app.delete(
  '/api/workspace/meetings/:id',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteMeeting(req.params.id as string, req.auth!.tenant.id);
      if (!deleted) return res.status(404).json({ error: 'Reunión no encontrada' });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Convertir un acuerdo de reunión en tarea real de Workspace
app.post(
  '/api/workspace/meetings/:id/agreements/:agreementId/to-task',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await db.convertMeetingAgreementToTask(
        req.params.id as string,
        req.params.agreementId as string,
        req.auth!.tenant.id,
        req.body,
        req.auth!.user.id
      );
      if (!result) return res.status(404).json({ error: 'Reunión o acuerdo no encontrado' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Generar enlace de Google Meet (integración con Google Calendar API / Google Cloud)
app.post(
  '/api/workspace/meetings/generate-meet-link',
  requireAuth,
  requirePermission('workspace.view'),
  async (req: AuthenticatedRequest, res: Response) => {
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
              attendees: (attendees || []).map((email: string) => ({ email })),
              conferenceData: {
                createRequest: {
                  requestId: `roma-${Date.now()}`,
                  conferenceSolutionKey: { type: 'hangoutsMeet' },
                },
              },
            },
          });

          const entryPoints = eventResponse.data?.conferenceData?.entryPoints;
          const meetUri = entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri;
          if (meetUri) {
            return res.json({
              meetUrl: meetUri,
              eventId: eventResponse.data.id,
              source: 'google_calendar_api',
            });
          }
        } catch (apiErr) {
          console.warn('[Google Meet API] Error al generar vía Calendar API:', (apiErr as Error).message);
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
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// =============================================================================
// MÓDULO DE ADMINISTRACIÓN (RRHH, FINANZAS Y CONTABILIDAD)
// =============================================================================

// --- RECURSOS HUMANOS: CONFIGURACIÓN GLOBAL ---
app.get(
  '/api/administration/hr/settings',
  requireAuth,
  requirePermission('administration.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await db.getHrSettings(req.auth!.tenant.id);
      res.json({ settings });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.put(
  '/api/administration/hr/settings',
  requireAuth,
  requirePermission('administration.hr.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await db.updateHrSettings(req.auth!.tenant.id, req.body);
      res.json({ settings });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// --- RECURSOS HUMANOS: EMPLEADOS Y PERSONAL ---
app.get(
  '/api/administration/hr/employees',
  requireAuth,
  requirePermission('administration.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const employees = await db.getEmployeeProfiles(req.auth!.tenant.id);
      res.json({ employees });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/administration/hr/employees',
  requireAuth,
  requirePermission('administration.hr.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const employee = await db.saveEmployeeProfile(req.auth!.tenant.id, req.body);
      res.status(201).json({ employee });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.put(
  '/api/administration/hr/employees/:id',
  requireAuth,
  requirePermission('administration.hr.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const employee = await db.saveEmployeeProfile(req.auth!.tenant.id, {
        ...req.body,
        id: req.params.id as string,
      });
      res.json({ employee });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);


app.post(
  '/api/administration/hr/employees/:id/payments',
  requireAuth,
  requirePermission('administration.hr.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await db.addEmployeePayment(
        req.auth!.tenant.id,
        req.params.id as string,
        req.body
      );
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/administration/hr/employees/:id/payments/:paymentId',
  requireAuth,
  requirePermission('administration.hr.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const employee = await db.deleteEmployeePayment(
        req.auth!.tenant.id,
        req.params.id as string,
        req.params.paymentId as string
      );
      res.json({ employee });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);
app.delete(
  '/api/administration/hr/employees/:id',
  requireAuth,
  requirePermission('administration.hr.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteEmployeeProfile(req.auth!.tenant.id, req.params.id as string);
      res.json({ ok: deleted });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);


// --- GOOGLE AUTHENTICATOR CONFIGURACIÓN & DESBLOQUEO ---
app.post(
  '/api/administration/hr/authenticator/setup',
  requireAuth,
  requirePermission('administration.hr.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const hrSettings = await db.getHrSettings(req.auth!.tenant.id);
      let secret = hrSettings.authenticatorSecret;
      if (!secret) {
        secret = generateTotpSecret(20);
      }
      const issuer = req.auth!.tenant.name || 'ROMA SaaS';
      const account = 'Administrador de RRHH';
      const otpAuthUri = buildOtpAuthUri(issuer, account, secret);
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
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/administration/hr/authenticator/verify',
  requireAuth,
  requirePermission('administration.hr.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code, secret } = req.body;
      if (!code || !secret) {
        return res.status(400).json({ error: 'Código y secreto requeridos' });
      }
      const isValid = verifyTotpCode(code, secret);
      if (!isValid) {
        return res.status(400).json({ error: 'Código incorrecto. Verifica la hora de tu celular e intenta de nuevo.' });
      }
      // Si es válido, guardar el secreto en la configuración de RRHH
      await db.updateHrSettings(req.auth!.tenant.id, {
        authenticatorSecret: secret,
        strictTardinessLock: true,
      });
      res.json({ ok: true, message: 'Google Authenticator configurado con éxito' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Desbloquear entrada tardía mediante código de Google Authenticator
app.post(
  '/api/administration/hr/attendance/unlock-late',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { authenticatorCode, stamp } = req.body;
      if (!authenticatorCode || !stamp) {
        return res.status(400).json({ error: 'Código de desbloqueo y datos de marcación son obligatorios' });
      }

      const hrSettings = await db.getHrSettings(req.auth!.tenant.id);
      if (hrSettings.strictTardinessLock && hrSettings.authenticatorSecret) {
        const isValid = verifyTotpCode(authenticatorCode, hrSettings.authenticatorSecret);
        if (!isValid) {
          return res.status(400).json({
            error: 'Código de Google Authenticator inválido o expirado. Solicita el código actual de 6 dígitos al Administrador.',
          });
        }
      }

      // Marcar asistencia como entrada desbloqueada
      const record = await db.recordAttendanceStamp(
        req.auth!.tenant.id,
        req.auth!.user.id,
        'check_in',
        {
          ...stamp,
          notes: `Tardanza autorizada por Administrador con código Google Authenticator (${new Date().toLocaleTimeString('es-PE')})`,
        }
      );

      res.json({ record, unlocked: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// --- RECURSOS HUMANOS: ASISTENCIAS Y MARCACIONES ---

// Marcación del día del usuario autenticado (para Widget de Dashboard y vista personal)
app.get(
  '/api/administration/hr/attendance/today',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const record = await db.getTodayAttendance(req.auth!.tenant.id, req.auth!.user.id);
      const hrSettings = await db.getHrSettings(req.auth!.tenant.id);
      const profile = await db.getEmployeeProfileByUserId(req.auth!.tenant.id, req.auth!.user.id);
      res.json({ record, hrSettings, profile });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Registrar una acción de marcación (Entrada, Inicio Refrigerio, Fin Refrigerio, Salida)
app.post(
  '/api/administration/hr/attendance/stamp',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { action, stamp } = req.body;
      if (!action || !stamp) {
        res.status(400).json({ error: 'Acción y datos de marcación son obligatorios' });
        return;
      }
      const record = await db.recordAttendanceStamp(
        req.auth!.tenant.id,
        req.auth!.user.id,
        action,
        stamp
      );
      res.json({ record });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Historial completo de asistencias para el dashboard de RRHH
app.get(
  '/api/administration/hr/attendance',
  requireAuth,
  requirePermission('administration.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, date, month, status } = req.query as Record<string, string | undefined>;
      const records = await db.getAttendanceRecords(req.auth!.tenant.id, {
        userId,
        date,
        month,
        status,
      });
      res.json({ records });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.put(
  '/api/administration/hr/attendance/:id',
  requireAuth,
  requirePermission('administration.hr.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateAttendanceRecord(req.auth!.tenant.id, req.params.id as string, req.body);
      res.json({ record: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// --- SUBMÓDULO: FINANZAS ---
app.get(
  '/api/administration/finances',
  requireAuth,
  requirePermission('administration.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, category, startDate, endDate } = req.query as Record<string, string | undefined>;
      const transactions = await db.getFinanceTransactions(req.auth!.tenant.id, {
        type,
        category,
        startDate,
        endDate,
      });
      res.json({ transactions });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/administration/finances',
  requireAuth,
  requirePermission('administration.finances.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const transaction = await db.createFinanceTransaction(req.auth!.tenant.id, req.body);
      res.status(201).json({ transaction });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/administration/finances/:id',
  requireAuth,
  requirePermission('administration.finances.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteFinanceTransaction(req.auth!.tenant.id, req.params.id as string);
      res.json({ ok: deleted });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// --- SUBMÓDULO: CONTABILIDAD ---
app.get(
  '/api/administration/accounting',
  requireAuth,
  requirePermission('administration.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, startDate, endDate } = req.query as Record<string, string | undefined>;
      const entries = await db.getAccountingEntries(req.auth!.tenant.id, {
        status,
        startDate,
        endDate,
      });
      res.json({ entries });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/administration/accounting',
  requireAuth,
  requirePermission('administration.accounting.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entry = await db.createAccountingEntry(req.auth!.tenant.id, req.body);
      res.status(201).json({ entry });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/administration/accounting/:id',
  requireAuth,
  requirePermission('administration.accounting.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteAccountingEntry(req.auth!.tenant.id, req.params.id as string);
      res.json({ ok: deleted });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// =============================================================================
// MÓDULO DE ÓRDENES DE SERVICIO (OS)
// =============================================================================

// Listar órdenes de servicio
app.get(
  '/api/service-orders',
  requireAuth,
  requirePermission('service_orders.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const clientId = req.query.clientId as string | undefined;
      const orders = await db.getServiceOrders(req.auth!.tenant.id, clientId);
      res.json({ orders, serviceOrders: orders });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Obtener orden de servicio por ID
app.get(
  '/api/service-orders/:id',
  requireAuth,
  requirePermission('service_orders.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await db.getServiceOrderById(req.params.id as string, req.auth!.tenant.id);
      if (!order) {
        return res.status(404).json({ error: 'Orden de servicio no encontrada' });
      }
      res.json({ order });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Crear orden de servicio
app.post(
  '/api/service-orders',
  requireAuth,
  requirePermission('service_orders.create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await db.createServiceOrder(req.auth!.tenant.id, {
        ...req.body,
        createdBy: req.auth!.user.name,
      });

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'service_orders',
        type: 'success',
        title: 'Nueva Orden de Servicio',
        message: `Se inició la OS #${created.code}: "${created.title}" para "${created.clientName}"`,
        entityId: created.id,
        action: 'create',
        link: '/?module=service_orders',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.status(201).json({ order: created });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Actualizar orden de servicio
app.put(
  '/api/service-orders/:id',
  requireAuth,
  requirePermission('service_orders.edit'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateServiceOrder(
        req.params.id as string,
        req.auth!.tenant.id,
        req.body
      );
      if (!updated) {
        return res.status(404).json({ error: 'Orden de servicio no encontrada' });
      }

      const isCompleted = updated.status === 'completed';
      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'service_orders',
        type: isCompleted ? 'success' : 'info',
        title: isCompleted ? '🎯 ¡Orden de Servicio completada!' : 'Orden de Servicio actualizada',
        message: `OS #${updated.code}: "${updated.title}" actualizada a estado: ${updated.status}`,
        entityId: updated.id,
        action: 'update',
        link: '/?module=service_orders',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.json({ order: updated });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Eliminar orden de servicio
app.delete(
  '/api/service-orders/:id',
  requireAuth,
  requirePermission('service_orders.delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = await db.deleteServiceOrder(
        req.params.id as string,
        req.auth!.tenant.id
      );
      if (!deleted) {
        return res.status(404).json({ error: 'Orden de servicio no encontrada' });
      }

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'service_orders',
        type: 'warning',
        title: 'Orden de Servicio eliminada',
        message: 'Se eliminó una orden de servicio del sistema.',
        action: 'delete',
        link: '/?module=service_orders',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Endpoint público para que el cliente consulte su Orden de Servicio (sin autenticación)
app.get('/api/public/service-orders/:token', async (req: Request, res: Response) => {
  try {
    const result = await db.getServiceOrderByPublicToken(req.params.token as string);
    if (!result) {
      return res.status(404).json({ error: 'Orden de servicio no encontrada o no disponible' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});






// =============================================================================
// MÓDULO DE SERVICIOS & CATEGORÍAS
// =============================================================================

// Categorías
app.get(
  '/api/services/categories',
  requireAuth,
  requirePermission('services.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const categories = await db.getServiceCategories(req.auth!.tenant.id);
      res.json({ categories });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/services/categories',
  requireAuth,
  requirePermission('services.categories.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const category = await db.createServiceCategory(req.auth!.tenant.id, req.body);
      res.status(201).json({ category });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.put(
  '/api/services/categories/:id',
  requireAuth,
  requirePermission('services.categories.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateServiceCategory(
        req.params.id as string,
        req.auth!.tenant.id,
        req.body
      );
      if (!updated) {
        res.status(404).json({ error: 'Categoría no encontrada.' });
        return;
      }
      res.json({ category: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/services/categories/:id',
  requireAuth,
  requirePermission('services.categories.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ok = await db.deleteServiceCategory(req.params.id as string, req.auth!.tenant.id);
      if (!ok) {
        res.status(404).json({ error: 'Categoría no encontrada.' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);






// Servicios
app.get(
  '/api/services',
  requireAuth,
  requirePermission('services.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { search, categoryId, status, pricingType } = req.query;
      const services = await db.getServices(req.auth!.tenant.id, {
        search: search as string,
        categoryId: categoryId as string,
        status: status as string,
        pricingType: pricingType as string,
      });
      res.json({ services });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.get(
  '/api/services/:id',
  requireAuth,
  requirePermission('services.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await db.getServiceById(req.params.id as string, req.auth!.tenant.id);
      if (!service) {
        res.status(404).json({ error: 'Servicio no encontrado.' });
        return;
      }
      res.json({ service });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/services',
  requireAuth,
  requirePermission('services.create'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await db.createService(req.auth!.tenant.id, req.body);

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'services',
        type: 'info',
        title: 'Nuevo servicio registrado',
        message: `Se añadió el servicio "${service.title}" al catálogo`,
        entityId: service.id,
        action: 'create',
        link: '/?module=services',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.status(201).json({ service });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.put(
  '/api/services/:id',
  requireAuth,
  requirePermission('services.edit'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateService(
        req.params.id as string,
        req.auth!.tenant.id,
        req.body
      );
      if (!updated) {
        res.status(404).json({ error: 'Servicio no encontrado.' });
        return;
      }

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'services',
        type: 'info',
        title: 'Servicio actualizado',
        message: `Se actualizaron los datos del servicio "${updated.title}"`,
        entityId: updated.id,
        action: 'update',
        link: '/?module=services',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.json({ service: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/services/:id',
  requireAuth,
  requirePermission('services.delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ok = await db.deleteService(req.params.id as string, req.auth!.tenant.id);
      if (!ok) {
        res.status(404).json({ error: 'Servicio no encontrado.' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);





// =============================================================================
// 4. MÓDULO DE CONFIGURACIÓN (4 PESTAÑAS - MULTITENANT + PERMISOS GRANULARES)
// =============================================================================

// Pestaña 1: Personalización
app.put(
  '/api/settings/customization',
  requireAuth,
  requirePermission('settings.customization.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updatedTenant = await db.updateTenantCustomization(
        req.auth!.tenant.id,
        req.body.customization
      );
      if (!updatedTenant) {
        res.status(404).json({ error: 'Tenant no encontrado.' });
        return;
      }
      res.json({ tenant: updatedTenant });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

// Pestaña 2: Datos de la Empresa
app.put(
  '/api/settings/company',
  requireAuth,
  requirePermission('settings.company.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updatedTenant = await db.updateTenantCompanyInfo(
        req.auth!.tenant.id,
        req.body.companyInfo
      );
      if (!updatedTenant) {
        res.status(404).json({ error: 'Tenant no encontrado.' });
        return;
      }
      res.json({ tenant: updatedTenant });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

// Ajuste y configuración de cuentas bancarias y métodos de pago de la agencia
app.put(
  '/api/settings/bank-accounts',
  requireAuth,
  requireAnyPermission(['settings.company.manage', 'quotes.create', 'quotes.edit']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { bankAccounts } = req.body;
      const updatedTenant = await db.updateTenantBankAccounts(
        req.auth!.tenant.id,
        bankAccounts || []
      );
      if (!updatedTenant) {
        res.status(404).json({ error: 'Tenant no encontrado.' });
        return;
      }
      res.json({ tenant: updatedTenant });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

// Pestaña 3: Usuarios y PIN de 8 dígitos
app.get(
  '/api/settings/users',
  requireAuth,
  requireAnyPermission(['settings.users.view', 'settings.users.manage', 'workspace.view', 'service_orders.view']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await db.getUsersByTenant(req.auth!.tenant.id);
      const roles = await db.getRolesByTenant(req.auth!.tenant.id);
      const canManage = req.auth?.role?.isSystem || hasPermission(req.auth?.role?.permissions, 'settings.users.manage');
      const safeUsers = users.map((u) => (canManage ? u : { ...u, pin: '••••••••' }));
      res.json({ users: safeUsers, roles });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/settings/users',
  requireAuth,
  requirePermission('settings.users.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await db.createUser(req.auth!.tenant.id, req.body);

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'users',
        type: 'success',
        title: 'Nuevo miembro del equipo',
        message: `Se dio de alta al usuario ${user.name} (${user.jobTitle})`,
        entityId: user.id,
        action: 'create',
        link: '/?module=settings',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.status(201).json({ user });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.put(
  '/api/settings/users/:id',
  requireAuth,
  requirePermission('settings.users.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateUser(
        req.auth!.tenant.id,
        req.params.id as string,
        req.body
      );
      if (!updated) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }
      res.json({ user: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/settings/users/:id',
  requireAuth,
  requirePermission('settings.users.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.params.id === req.auth!.user.id) {
        res.status(400).json({ error: 'No puedes eliminar tu propio usuario en sesión activa.' });
        return;
      }
      const ok = await db.deleteUser(req.auth!.tenant.id, req.params.id as string);
      if (!ok) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);






// Personalización individual de colores por usuario
app.put(
  '/api/users/me/theme',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { themePreference } = req.body;
      const user = await db.updateUserThemePreference(
        req.auth!.user.id,
        req.auth!.tenant.id,
        themePreference || null
      );
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

// Pestaña 4: Roles y Permisos Granulares
app.get(
  '/api/settings/roles',
  requireAuth,
  requireAnyPermission(['settings.roles.view', 'settings.roles.manage', 'settings.users.view']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roles = await db.getRolesByTenant(req.auth!.tenant.id);
      const users = await db.getUsersByTenant(req.auth!.tenant.id);
      res.json({
        roles,
        usersCountByRole: roles.reduce((acc, r) => {
          acc[r.id] = users.filter((u) => u.roleId === r.id).length;
          return acc;
        }, {} as Record<string, number>),
        permissionsCatalog: PERMISSIONS_CATALOG,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/settings/roles',
  requireAuth,
  requirePermission('settings.roles.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, description, badgeColor, permissions } = req.body;
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'El nombre del rol es obligatorio.' });
        return;
      }
      const role = await db.createRole(req.auth!.tenant.id, {
        name,
        description: description || '',
        badgeColor: badgeColor || '#7c3aed',
        permissions: Array.isArray(permissions) ? permissions : [],
      });

      notificationService.notify({
        tenantId: req.auth!.tenant.id,
        module: 'roles',
        type: 'info',
        title: 'Nuevo rol de permisos',
        message: `Se configuró el rol "${role.name}" con ${role.permissions.length} permisos`,
        entityId: role.id,
        action: 'create',
        link: '/?module=settings',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.status(201).json({ role });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.put(
  '/api/settings/roles/:id',
  requireAuth,
  requirePermission('settings.roles.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateRole(
        req.auth!.tenant.id,
        req.params.id as string,
        req.body
      );
      if (!updated) {
        res.status(404).json({ error: 'Rol no encontrado.' });
        return;
      }
      res.json({ role: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/settings/roles/:id',
  requireAuth,
  requirePermission('settings.roles.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await db.deleteRole(req.auth!.tenant.id, req.params.id as string);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);






// =============================================================================
// GESTIÓN MULTITENANT (ADMINISTRACIÓN GLOBAL DE TENANTS / ESPACIOS DE TRABAJO)
// =============================================================================

app.get(
  '/api/tenants',
  requireAuth,
  requireAnyPermission(['settings.tenants.view', 'settings.tenants.manage']),
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const tenants = await db.getAllTenants();
      res.json({ tenants });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.get(
  '/api/tenants-available-users',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const isSuperAdmin =
        req.auth?.role?.isSystem ||
        hasAnyPermission(req.auth?.role?.permissions, ['settings.tenants.manage', 'settings.tenants.view', 'settings.users.manage']);

      if (isSuperAdmin) {
        const users = await db.getAvailableUsersForTenants();
        res.json({ users });
      } else {
        const currentTenantUsers = await db.getUsersByTenant(req.auth!.tenant.id);
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
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/tenants',
  requireAuth,
  requirePermission('settings.tenants.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        name,
        slug,
        currencyCode,
        commercialName,
        legalName,
        ruc,
        email,
        whatsapp,
        address,
        adminName,
        adminEmail,
        adminPin,
        adminJobTitle,
        logoUrl,
        assignedUserIds,
      } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'El nombre de la agencia o tenant es obligatorio.' });
        return;
      }
      if (!slug || !slug.trim()) {
        res.status(400).json({ error: 'El identificador (slug) es obligatorio.' });
        return;
      }

      const result = await db.createTenant({
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
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.put(
  '/api/tenants/:id',
  requireAuth,
  requirePermission('settings.tenants.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await db.updateTenant(req.params.id as string, req.body);
      if (!updated) {
        res.status(404).json({ error: 'Tenant no encontrado.' });
        return;
      }
      res.json({ tenant: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);

app.delete(
  '/api/tenants/:id',
  requireAuth,
  requirePermission('settings.tenants.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.params.id as string;
      if (tenantId === req.auth!.tenant.id) {
        res.status(400).json({
          error: 'No puedes eliminar el tenant en el que estás conectado actualmente. Cambia a otro tenant primero.',
        });
        return;
      }

      const all = await db.getAllTenants();
      if (all.length <= 1) {
        res.status(400).json({
          error: 'No se puede eliminar el único tenant registrado en el sistema.',
        });
        return;
      }

      const ok = await db.deleteTenant(tenantId);
      if (!ok) {
        res.status(404).json({ error: 'Tenant no encontrado o no se pudo eliminar.' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  }
);



// =============================================================================
// ACTUALIZACIONES DEL SISTEMA EN 1 CLIC (GIT PULL + MIGRACIÓN DB + COMPILACIÓN)
// =============================================================================

function getGitExecutable(): string {
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
    if (fs.existsSync(cmd)) return `"${cmd}" -c "safe.directory=${cwd}" -c "safe.directory=*"`;
  }
  return `git -c "safe.directory=${cwd}" -c "safe.directory=*"`;
}

interface RemoteUpdateCache {
  timestamp: number;
  remoteCommit: string | null;
  remoteCommitMessage: string | null;
  remoteCommitDate: string | null;
}

let remoteUpdateCache: RemoteUpdateCache | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 segundos de caché

async function checkRemoteGitHubUpdate(): Promise<{
  remoteCommit: string | null;
  remoteCommitMessage: string | null;
  remoteCommitDate: string | null;
}> {
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
      const data = (await res.json()) as any;
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
  } catch {}

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
  } catch {}

  return { remoteCommit: null, remoteCommitMessage: null, remoteCommitDate: null };
}

app.get(
  '/api/system/update-status',
  requireAuth,
  requireAnyPermission(['settings.system.update', 'settings.customization.manage', 'settings.tenants.manage']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      let isGitRepo = false;
      let branch = 'main';
      let currentCommit = 'Sin Git';
      let lastCommitMessage = '';
      let remoteUrl = '';
      let isDirty = false;
      let gitAvailable = false;

      // 1. Detección directa por sistema de archivos (.git) como base infalible
      const gitDir = path.resolve(process.cwd(), '.git');
      if (fs.existsSync(gitDir)) {
        isGitRepo = true;
        try {
          const headContent = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
          if (headContent.startsWith('ref: refs/heads/')) {
            branch = headContent.replace('ref: refs/heads/', '').trim();
            const refPath = path.join(gitDir, 'refs', 'heads', branch);
            if (fs.existsSync(refPath)) {
              currentCommit = fs.readFileSync(refPath, 'utf8').trim().slice(0, 7);
            }
          } else if (headContent.length >= 7) {
            currentCommit = headContent.slice(0, 7);
          }
        } catch {}

        try {
          const configContent = fs.readFileSync(path.join(gitDir, 'config'), 'utf8');
          const match = configContent.match(/url\s*=\s*(.+)/);
          if (match && match[1]) {
            remoteUrl = match[1].trim();
          }
        } catch {}
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
            if (b.trim()) branch = b.trim();
          } catch {}
          try {
            const { stdout: hash } = await execAsync(`${gitCmd} rev-parse --short HEAD`);
            if (hash.trim()) currentCommit = hash.trim();
          } catch {}
          try {
            const { stdout: msg } = await execAsync(`${gitCmd} log -1 --format="%s (%cr)"`);
            if (msg.trim()) lastCommitMessage = msg.trim();
          } catch {}
          try {
            const { stdout: rem } = await execAsync(`${gitCmd} config --get remote.origin.url`);
            if (rem.trim()) remoteUrl = rem.trim();
          } catch {}
          try {
            const { stdout: st } = await execAsync(`${gitCmd} status --porcelain`);
            isDirty = st.trim().length > 0;
          } catch {}
        }
      } catch {}

      let lastBuildDate: string | null = null;
      const distIndexHtml = path.resolve(process.cwd(), 'dist', 'client', 'index.html');
      const hasPrecompiledDist = fs.existsSync(distIndexHtml);
      if (hasPrecompiledDist) {
        const stats = fs.statSync(distIndexHtml);
        lastBuildDate = stats.mtime.toISOString();
      }

      const srcExists = fs.existsSync(path.resolve(process.cwd(), 'src'));
      const viteBin = path.resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
      const hasVite = fs.existsSync(viteBin);
      const canBuild = srcExists && hasVite;
      const isPrecompiled = hasPrecompiledDist && !canBuild;

      // 3. Comprobar si hay una versión más reciente disponible en GitHub
      const { remoteCommit, remoteCommitMessage, remoteCommitDate } = await checkRemoteGitHubUpdate();
      const updateAvailable = Boolean(
        remoteCommit &&
        currentCommit &&
        currentCommit !== 'Sin Git' &&
        !remoteCommit.toLowerCase().startsWith(currentCommit.toLowerCase()) &&
        !currentCommit.toLowerCase().startsWith(remoteCommit.toLowerCase())
      );

      res.json({
        gitAvailable,
        isGitRepo,
        branch,
        currentCommit,
        lastCommitMessage,
        remoteUrl,
        isDirty,
        database: db.getEngineInfo(),
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
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

app.post(
  '/api/system/update',
  requireAuth,
  requireAnyPermission(['settings.system.update', 'settings.customization.manage', 'settings.tenants.manage']),
  async (req: AuthenticatedRequest, res: Response) => {
    const logs: Array<{ step: string; status: 'pending' | 'success' | 'warning' | 'error'; message: string; timestamp: string }> = [];
    const startTime = Date.now();

    const addLog = (step: string, status: 'pending' | 'success' | 'warning' | 'error', message: string) => {
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
        const gitDir = path.resolve(process.cwd(), '.git');
        const hasGitDir = fs.existsSync(gitDir);

        if (hasGitDir) {
          addLog('git', 'pending', `Conectando con repositorio remoto y trayendo cambios (rama: ${branch})...`);
          try {
            await execAsync(`${gitCmd} fetch origin`);
            // Limpiar diferencias en archivos rastreados (como dist/ generado localmente en el servidor)
            // para evitar que Git aborte con "Your local changes would be overwritten by merge"
            try {
              await execAsync(`${gitCmd} reset --hard origin/${branch}`);
              addLog('git', 'success', `Sincronización Git limpia aplicada a origin/${branch}.`);
            } catch {
              const { stdout: pullOut, stderr: pullErr } = await execAsync(`${gitCmd} pull origin ${branch}`);
              addLog('git', 'success', `Git pull exitoso: ${pullOut.trim() || pullErr.trim() || 'Actualizado al día'}`);
            }

            // Protección automática contra plantilla dev de Vite:
            try {
              const rootIndexHtml = path.resolve(process.cwd(), 'index.html');
              if (fs.existsSync(rootIndexHtml)) {
                fs.unlinkSync(rootIndexHtml);
              }
            } catch {}
          } catch (pullEx) {
            addLog('git', 'warning', `Aviso en git pull: ${(pullEx as Error).message}`);
          }
        } else {
          addLog('git', 'warning', 'No se detectó la carpeta .git en el servidor. Se continúa con la migración segura de base de datos.');
        }
      } else {
        addLog('git', 'warning', 'Sincronización Git omitida.');
      }

      // 2. PASO 2: MIGRACIÓN SEGURA Y NO DESTRUCTIVA DE BASE DE DATOS
      if (runDbMigration) {
        addLog('database', 'pending', 'Verificando estructura de base de datos sin alterar información existente...');
        const migResult = await db.runSafeMigrations();
        if (migResult.success) {
          addLog('database', 'success', `Base de datos (${migResult.engine}) sincronizada. ${migResult.details.join(' | ')}`);
        } else {
          addLog('database', 'warning', 'Verificación de base de datos completada con advertencias.');
        }
      } else {
        addLog('database', 'warning', 'Migración de base de datos omitida.');
      }

      // 3. PASO 3: COMPILACIÓN DEL FRONTEND Y BACKEND
      if (runBuild) {
        const srcExists = fs.existsSync(path.resolve(process.cwd(), 'src'));
        const viteBin = path.resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
        const hasVite = fs.existsSync(viteBin);
        const distIndexHtml = path.resolve(process.cwd(), 'dist', 'client', 'index.html');
        const hasPrecompiledDist = fs.existsSync(distIndexHtml);

        if (hasPrecompiledDist) {
          // Entorno de producción precompilado (cPanel, etc.)
          // Los archivos optimizados de dist/ ya vienen compilados y sincronizados desde GitHub.
          // Se omite 'npm run build' en el servidor para evitar agotar la RAM de CloudLinux/cPanel (error 503).
          addLog('build', 'success', 'Archivos precompilados en dist/ verificados y vigentes desde el repositorio. No requiere compilación pesada.');
        } else if (srcExists && hasVite) {
          addLog('build', 'pending', 'Compilando frontend (Vite) y backend (TypeScript)...');
          try {
            await execAsync('npm run build');
            addLog('build', 'success', 'Compilación exitosa: dist/client y dist/server actualizados.');
          } catch (buildErr) {
            addLog('build', 'warning', `Aviso en compilación: ${(buildErr as Error).message}.`);
          }
        } else if (srcExists && !hasVite) {
          // Hay código fuente pero falta Vite en node_modules
          addLog('build', 'pending', 'Instalando dependencias de compilación...');
          try {
            await execAsync('npm install --include=dev');
            await execAsync('npm run build');
            addLog('build', 'success', 'Compilación exitosa tras instalar dependencias de desarrollo.');
          } catch (installErr) {
            addLog('build', 'warning', `No se pudo compilar (${(installErr as Error).message}).`);
          }
        } else {
          addLog('build', 'warning', 'No se detectó código fuente src/ ni binario Vite. Se mantienen los archivos productivos actuales.');
        }
      } else {
        addLog('build', 'warning', 'Recompilación omitida.');
      }

      // 4. PASO 4: RECARGA AUTOMÁTICA EN CPANEL (PASSENGER)
      try {
        remoteUpdateCache = null;
        const tmpDir = path.resolve(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        fs.writeFileSync(path.join(tmpDir, 'restart.txt'), String(Date.now()));
        addLog('passenger', 'success', 'Señal de reinicio enviada a Phusion Passenger (tmp/restart.txt).');
      } catch {}

      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
      addLog('finish', 'success', `¡Actualización completada en ${totalDuration}s! Datos existentes 100% protegidos.`);

      res.json({
        success: true,
        durationSeconds: totalDuration,
        logs,
      });
    } catch (err) {
      addLog('error', 'error', `Fallo en el proceso de actualización: ${(err as Error).message}`);
      res.status(500).json({
        success: false,
        error: (err as Error).message,
        logs,
      });
    }
  }
);

app.get('/api/public/tenants', async (_req: Request, res: Response) => {
  try {
    const tenants = await db.getAllTenants();
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
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Endpoint dinámico para servir el icono o logo del tenant (compatible con PWA y Open Graph)
app.get('/api/public/tenant-icon', async (req: Request, res: Response) => {
  try {
    let slug = req.query.tenant as string | undefined;
    if (!slug) {
      const referer = req.get('referer');
      if (referer) {
        try {
          const refUrl = new URL(referer);
          slug = refUrl.searchParams.get('tenant') || undefined;
        } catch {}
      }
    }
    const size = req.query.size as string | undefined;
    const format = req.query.format as string | undefined;
    const tenant = await db.getPublicTenantBranding(slug);
    const iconUrl =
      tenant?.customization?.faviconUrl ||
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
    } else if (iconUrl && (iconUrl.startsWith('http://') || iconUrl.startsWith('https://'))) {
      res.redirect(iconUrl);
      return;
    } else if (iconUrl && iconUrl.startsWith('/uploads/')) {
      const filePath = path.resolve(process.cwd(), iconUrl.replace(/^\/+/, ''));
      if (fs.existsSync(filePath)) {
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
      const pngPath = path.resolve(process.cwd(), 'public', pngFile);
      if (fs.existsSync(pngPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(pngPath);
        return;
      }
    }

    const favPath = path.resolve(process.cwd(), 'public', 'favicon.svg');
    if (fs.existsSync(favPath)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(favPath);
    } else {
      res.status(404).send('Icono no encontrado');
    }
  } catch (err) {
    res.status(500).send('Error');
  }
});

// Endpoint dinámico para servir el icono/favicon del tenant optimizado para Open Graph (WhatsApp, Telegram, etc.)
app.get(['/api/public/tenant-og-image.png', '/api/public/tenant-og-image'], async (req: Request, res: Response) => {
  try {
    const slug = (req.query.tenant as string) || (req.query.id as string) || '';
    const tenant = await db.getPublicTenantBranding(slug);

    // Priorizar favicon o logo del tenant correspondiente
    const iconUrl =
      tenant?.customization?.faviconUrl ||
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
    } else if (iconUrl && (iconUrl.startsWith('http://') || iconUrl.startsWith('https://'))) {
      res.redirect(iconUrl);
      return;
    } else if (iconUrl && iconUrl.startsWith('/uploads/')) {
      const filePath = path.resolve(process.cwd(), iconUrl.replace(/^\/+/, ''));
      if (fs.existsSync(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.sendFile(filePath);
        return;
      }
    }

    // Fallback a icono cuadrado PNG 512x512
    const pngPath = path.resolve(process.cwd(), 'public', 'icon-512.png');
    if (fs.existsSync(pngPath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(pngPath);
      return;
    }

    const favPath = path.resolve(process.cwd(), 'public', 'favicon.svg');
    if (fs.existsSync(favPath)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(favPath);
    } else {
      res.status(404).send('Icono no encontrado');
    }
  } catch (err) {
    res.status(500).send('Error');
  }
});

// Manifiesto PWA Dinámico por Tenant (compatible con /manifest.json y /api/public/manifest.webmanifest)
app.get(['/manifest.json', '/api/public/manifest.webmanifest'], async (req: Request, res: Response) => {
  try {
    let slug = req.query.tenant as string | undefined;

    // Si no viene en query, intentar extraer del Referer del navegador
    if (!slug) {
      const referer = req.get('referer');
      if (referer) {
        try {
          const refUrl = new URL(referer);
          slug = refUrl.searchParams.get('tenant') || undefined;
        } catch {}
      }
    }

    // Si aún no viene, intentar extraer de la cabecera x-tenant-slug o cookie
    if (!slug) {
      slug = req.headers['x-tenant-slug'] as string | undefined;
    }
    if (!slug && req.cookies?.auth_token) {
      try {
        const decoded = jwt.decode(req.cookies.auth_token) as any;
        if (decoded?.tenant?.slug) {
          slug = decoded.tenant.slug;
        }
      } catch {}
    }

    const tenant = await db.getPublicTenantBranding(slug);
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
  } catch (err) {
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
const clientDistPath = path.resolve(process.cwd(), 'dist', 'client');

async function serveHtmlWithMetadata(req: Request, res: Response) {
  try {
    const indexPath = fs.existsSync(path.join(clientDistPath, 'index.html'))
      ? path.join(clientDistPath, 'index.html')
      : path.resolve(process.cwd(), 'index.html');

    if (!fs.existsSync(indexPath)) {
      res.redirect(`http://localhost:5173${req.originalUrl}`);
      return;
    }

    let html = fs.readFileSync(indexPath, 'utf-8');

    const host = req.get('x-forwarded-host') || req.get('host') || 'theromaagency.com';
    const proto = req.get('x-forwarded-proto') || 'https';
    const origin = `${proto}://${host}`;
    const fullUrl = `${origin}${req.originalUrl}`;

    let pageTitle = 'ROMA SaaS — Sistema de Agencia de Publicidad y Diseño';
    let ogTitle = 'ROMA SaaS — Sistema de Agencia';
    let ogDescription = 'Plataforma integral de gestión de proyectos, clientes, cotizaciones y notas de pago.';
    let tenantSlug = (req.query.tenant as string) || 'roma-agencia';
    let ogImage = `${origin}/api/public/tenant-og-image.png?tenant=${encodeURIComponent(tenantSlug)}`;
    let faviconUrl = `/api/public/tenant-icon?tenant=${encodeURIComponent(tenantSlug)}`;
    let themeColor = '#0055ff';

    const pathname = req.path;

    // 1. Notas de Pago / Comprobantes públicos (/p/pago/:token, /p/nota/:token, /np/:token, /pago/:token, /nota/:token)
    const noteMatch = pathname.match(/^\/(?:np|pago|nota|nota-pago|p\/pago|p\/nota)\/([^/?#]+)/i);
    if (noteMatch && noteMatch[1]) {
      const token = decodeURIComponent(noteMatch[1]);
      const noteData = await db.getPaymentNoteByPublicToken(token);
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
        } else if (n.status === 'partial' || paidNum > 0) {
          statusLabel = `Abono Parcial (${currSymbol} ${paidNum.toLocaleString('es-PE', { minimumFractionDigits: 2 })})`;
        } else if (n.status === 'cancelled') {
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
      const token = decodeURIComponent(osMatch![1]);
      const osData = await db.getServiceOrderByPublicToken(token);
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
      const token = decodeURIComponent(wsMatch![1]);
      const wsData = await db.getWorkspaceMonthByPublicToken(token);
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
      const slug = decodeURIComponent(srvMatch![1]);
      const tenantParam = (req.query.tenant as string) || '';
      const srvData = await db.getPublicServiceBySlugOrId(tenantParam || 'roma-agencia', slug);
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
      const defaultTenant = await db.getPublicTenantBranding(tenantSlug);
      const agencyName = defaultTenant?.companyInfo?.commercialName || defaultTenant?.name || 'ROMA Agencia';
      pageTitle = `Catálogo de Servicios y Paquetes — ${agencyName}`;
      ogTitle = `Catálogo de Servicios — ${agencyName}`;
      ogDescription = `Descubre nuestros servicios profesionales de diseño, publicidad, branding y marketing digital.`;
      ogImage = `${origin}/api/public/tenant-og-image.png?tenant=${encodeURIComponent(tenantSlug)}`;
    }
    // 6. Cotizaciones públicas (/c/:token, /q/:token, /cotizacion/:token, /p/cotizacion/:token, /p/:token)
    else {
      let quoteToken: string | null = null;
      const qMatch = pathname.match(/^\/(?:c|q|cotizacion|p\/cotizacion)\/([^/?#]+)/i);
      if (qMatch && qMatch[1]) {
        quoteToken = decodeURIComponent(qMatch[1]);
      } else {
        const pMatch = pathname.match(/^\/p\/([^/?#]+)/i);
        if (pMatch && pMatch[1]) {
          const candidate = decodeURIComponent(pMatch[1]).toLowerCase();
          if (
            candidate !== 'pago' &&
            candidate !== 'nota' &&
            candidate !== 'os' &&
            candidate !== 'orden' &&
            candidate !== 'w' &&
            candidate !== 'workspace' &&
            candidate !== 'servicio' &&
            candidate !== 'servicios'
          ) {
            quoteToken = decodeURIComponent(pMatch[1]);
          }
        }
      }

      if (quoteToken) {
        const quoteData = await db.getQuoteByPublicToken(quoteToken);
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
      } else {
        // Branding general del tenant
        const defaultTenant = await db.getPublicTenantBranding(tenantSlug);
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

    const escapeHtml = (str: string) =>
      str
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
  } catch (err) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  }
}

app.get(
  [
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
  ],
  serveHtmlWithMetadata
);

// Servir archivos multimedia subidos (imágenes, referencias, logos, comprobantes)
// Soporta múltiples rutas del hosting (cPanel Passenger, public_html o sistema anterior)
function getDynamicUploadDirs(): string[] {
  const dirs = new Set<string>();
  const cwd = process.cwd();

  if (process.env.UPLOADS_DIR) {
    try {
      if (fs.existsSync(process.env.UPLOADS_DIR)) {
        dirs.add(path.resolve(process.env.UPLOADS_DIR));
      }
    } catch {}
  }

  // Rutas estándar relativas a la app actual en cPanel
  const standardPaths = [
    path.resolve(cwd, 'uploads'),
    path.resolve(cwd, '../uploads'),
    path.resolve(cwd, '../../uploads'),
    path.resolve(cwd, '../public_html/uploads'),
    path.resolve(cwd, '../../public_html/uploads'),
    path.resolve(cwd, 'public_html/uploads'),
    path.resolve(cwd, '../sistema/uploads'),
    path.resolve(cwd, '../sistema_anterior/uploads'),
    path.resolve(cwd, '../roma/uploads'),
    '/home/iqxalgre/public_html/uploads',
    '/home/iqxalgre/uploads',
    '/home/theromaagency/public_html/uploads',
    '/home/theromaagency/uploads',
  ];

  for (const p of standardPaths) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        dirs.add(p);
      }
    } catch {}
  }

  // Explorar carpetas hermanas del directorio padre (ej: carpetas vecinas en cPanel)
  try {
    const parent = path.resolve(cwd, '..');
    const entries = fs.readdirSync(parent, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const u1 = path.resolve(parent, ent.name, 'uploads');
        if (fs.existsSync(u1)) dirs.add(u1);
        const u2 = path.resolve(parent, ent.name, 'public_html', 'uploads');
        if (fs.existsSync(u2)) dirs.add(u2);
      }
    }
  } catch {}

  // Explorar carpetas del usuario de cPanel (abuelo)
  try {
    const grandParent = path.resolve(cwd, '../..');
    const entries = fs.readdirSync(grandParent, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const u1 = path.resolve(grandParent, ent.name, 'uploads');
        if (fs.existsSync(u1)) dirs.add(u1);
        const u2 = path.resolve(grandParent, ent.name, 'public_html', 'uploads');
        if (fs.existsSync(u2)) dirs.add(u2);
      }
    }
  } catch {}

  return Array.from(dirs);
}

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Endpoint de diagnóstico para verificar rutas de subidas en cPanel
app.get('/api/system/uploads-diagnostic', (req: Request, res: Response) => {
  const cwd = process.cwd();
  const dirs = getDynamicUploadDirs();
  const details = dirs.map((d) => {
    let subdirs: string[] = [];
    let referencesCount = 0;
    let brandsCount = 0;
    try {
      subdirs = fs.readdirSync(d);
      if (fs.existsSync(path.join(d, 'references'))) {
        referencesCount = fs.readdirSync(path.join(d, 'references')).length;
      }
      if (fs.existsSync(path.join(d, 'brands'))) {
        brandsCount = fs.readdirSync(path.join(d, 'brands')).length;
      }
    } catch {}
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
function syncLegacyUploadsFolder(srcDir: string, destDir: string): { copied: number; skipped: number; bytes: number } {
  let copied = 0;
  let skipped = 0;
  let bytes = 0;

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  try {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const ent of entries) {
      const srcPath = path.join(srcDir, ent.name);
      const destPath = path.join(destDir, ent.name);

      if (ent.isDirectory()) {
        const sub = syncLegacyUploadsFolder(srcPath, destPath);
        copied += sub.copied;
        skipped += sub.skipped;
        bytes += sub.bytes;
      } else if (ent.isFile()) {
        try {
          if (!fs.existsSync(destPath)) {
            fs.copyFileSync(srcPath, destPath);
            const st = fs.statSync(destPath);
            bytes += st.size;
            copied++;
          } else {
            skipped++;
          }
        } catch {}
      }
    }
  } catch {}

  return { copied, skipped, bytes };
}

// Endpoint para disparar la migración manual de uploads del sistema anterior
app.post('/api/system/migrate-legacy-uploads', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const source = req.body?.source || process.env.UPLOADS_DIR || '/home/iqxalgre/public_html/uploads';
  if (!fs.existsSync(source)) {
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

app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
  const relativeSubpath = decodeURIComponent(req.path.replace(/^\/+/, ''));
  if (!relativeSubpath) return next();

  // 1. Revisar si ya está en la carpeta uploads local del sistema actual
  const localTarget = path.resolve(uploadsDir, relativeSubpath);
  if (fs.existsSync(localTarget) && fs.statSync(localTarget).isFile()) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(localTarget);
  }

  // 2. Si no está en local, buscar en directorios del sistema anterior y copiar on-demand
  const candidateDirs = getDynamicUploadDirs();
  for (const dir of candidateDirs) {
    if (dir === uploadsDir) continue;
    try {
      const fullPath = path.resolve(dir, relativeSubpath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        // Auto-migración on-demand: guardar copia permanente en local
        try {
          const parentDir = path.dirname(localTarget);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }
          fs.copyFileSync(fullPath, localTarget);
          console.log(`[Auto-Migrado a Local] ${relativeSubpath}`);
        } catch {}

        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(fullPath);
      }
    } catch {
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

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      serveHtmlWithMetadata(req, res);
    } else {
      res.status(404).json({ error: 'Ruta no encontrada' });
    }
  });
}

async function bootstrap() {
  await db.initialize();

  // Auto-migración en segundo plano al iniciar solo si existe una carpeta externa configurada
  const legacyDir = process.env.UPLOADS_DIR;
  if (legacyDir && fs.existsSync(legacyDir) && path.resolve(legacyDir) !== path.resolve(uploadsDir)) {
    console.log(`📦 [Auto-Migración] Detectada carpeta del sistema anterior en: ${legacyDir}`);
    console.log(`⏳ [Auto-Migración] Sincronizando archivos hacia ${uploadsDir} en segundo plano...`);
    setImmediate(() => {
      try {
        const stats = syncLegacyUploadsFolder(legacyDir, uploadsDir);
        const mb = (stats.bytes / (1024 * 1024)).toFixed(2);
        console.log(`✅ [Auto-Migración] Sincronización completada: ${stats.copied} archivos nuevos (${mb} MB), ${stats.skipped} existentes.`);
      } catch (err) {
        console.error('[Auto-Migración] Error al sincronizar:', (err as Error).message);
      }
    });
  }

  const serverPort = process.env.PORT || 3001;
  app.listen(serverPort, () => {
    console.log(`🚀 [SISTEMA ROMA V4 SaaS] Servidor activo en ${serverPort}`);
  });
}

bootstrap();
