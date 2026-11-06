import express, { Request, Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { db } from './db';

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
import { googleDriveService } from './services/googleDriveService';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(compression());
// Permitir subir imágenes Base64 de logos, favicons y PWA de hasta 10MB
app.use(express.json({ limit: '10mb' }));

// Módulo de Google Drive & Archivos Cloud
app.use('/api/drive', driveRouter);

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

    res.json({
      token,
      user: match.user,
      role: match.role,
      tenant: match.tenant,
      permissionsCatalog: PERMISSIONS_CATALOG,
      engineInfo: db.getEngineInfo(),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { user, role, tenant } = req.auth!;
  res.json({
    user,
    role,
    tenant,
    permissionsCatalog: PERMISSIONS_CATALOG,
    engineInfo: db.getEngineInfo(),
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
      const quote = await db.getQuoteById(req.params.id as string, req.auth!.tenant.id);
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
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Endpoint público para que el cliente consulte su nota de pago (sin requerir autenticación)
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
    await db.updateWorkspacePost(post.id, post.tenantId, { comments: updatedComments });

    res.json({ success: true, comment: newComment });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
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

// Crear publicación
app.post(
  '/api/workspace/posts',
  requireAuth,
  requirePermission('workspace.social.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await db.createWorkspacePost(req.auth!.tenant.id, req.body);
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
            const { stdout: pullOut, stderr: pullErr } = await execAsync(`${gitCmd} pull origin ${branch}`);
            addLog('git', 'success', `Git pull exitoso: ${pullOut.trim() || pullErr.trim() || 'Actualizado al día'}`);

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

        if (srcExists && hasVite) {
          addLog('build', 'pending', 'Compilando frontend (Vite) y backend (TypeScript)...');
          try {
            await execAsync('npm run build');
            addLog('build', 'success', 'Compilación exitosa: dist/client y dist/server actualizados.');
          } catch (buildErr) {
            if (hasPrecompiledDist) {
              addLog('build', 'warning', `Aviso en compilación: ${(buildErr as Error).message}. Se conservan los archivos optimizados vigentes en dist/.`);
            } else {
              throw buildErr;
            }
          }
        } else if (hasPrecompiledDist) {
          // Entorno de producción precompilado (cPanel, etc.)
          addLog('build', 'success', 'Entorno de producción precompilado: Archivos optimizados en dist/ verificados y vigentes. No se requiere compilar en el servidor.');
        } else if (srcExists && !hasVite) {
          // Hay código fuente pero falta Vite en node_modules
          addLog('build', 'pending', 'Instalando dependencias de compilación...');
          try {
            await execAsync('npm install --include=dev');
            await execAsync('npm run build');
            addLog('build', 'success', 'Compilación exitosa tras instalar dependencias de desarrollo.');
          } catch (installErr) {
            if (hasPrecompiledDist) {
              addLog('build', 'warning', `No se pudo compilar (${(installErr as Error).message}), pero dist/ se mantiene activo.`);
            } else {
              throw installErr;
            }
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
    const slug = req.query.tenant as string | undefined;
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

// Manifiesto PWA Dinámico por Tenant
app.get('/api/public/manifest.webmanifest', async (req: Request, res: Response) => {
  try {
    const slug = req.query.tenant as string | undefined;
    const tenant = await db.getPublicTenantBranding(slug);
    const name = tenant?.companyInfo?.commercialName || tenant?.name || 'ROMA Agencia';
    const shortName = name.slice(0, 15);
    const desc = `Sistema SaaS de Gestión para Agencia de Publicidad y Diseño - ${name}`;
    const tenantSlug = tenant?.slug || slug || 'roma-agencia';
    const iconUrl = `/api/public/tenant-icon?tenant=${encodeURIComponent(tenantSlug)}`;

    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({
      name,
      short_name: shortName,
      description: desc,
      start_url: `/?tenant=${encodeURIComponent(tenantSlug)}`,
      scope: '/',
      display: 'standalone',
      background_color: tenant?.customization?.darkPalette?.background || '#090d16',
      theme_color: tenant?.customization?.lightPalette?.primary || '#0055ff',
      icons: [
        {
          src: `${iconUrl}&size=192`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: `${iconUrl}&size=512`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    });
  } catch (err) {
    console.error('Error al generar manifest.webmanifest:', err);
    res.setHeader('Content-Type', 'application/manifest+json');
    return res.json({
      name: 'ROMA Agencia',
      short_name: 'ROMA',
      start_url: '/',
      display: 'standalone',
      background_color: '#090d16',
      theme_color: '#0055ff',
      icons: [
        {
          src: '/favicon.svg',
          sizes: '192x192',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
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
    let ogImage = `${origin}/favicon.svg`;
    let faviconUrl = '/favicon.svg';
    let themeColor = '#0055ff';
    let tenantSlug = (req.query.tenant as string) || '';

    const pathname = req.path;

    // 1. Cotizaciones públicas (/c/:token, /q/:token, /p/:token, /cotizacion/:token)
    if (
      pathname.startsWith('/c/') ||
      pathname.startsWith('/q/') ||
      pathname.startsWith('/p/') ||
      pathname.startsWith('/cotizacion/')
    ) {
      const parts = pathname.split('/');
      const token = parts[2] || parts[1];
      if (token) {
        const quoteData = await db.getQuoteByPublicToken(token);
        if (quoteData) {
          const q = quoteData.quote;
          const t = quoteData.tenant;
          tenantSlug = t.slug;
          const agencyName = t.companyInfo?.commercialName || t.name;
          const currSymbol = t.customization?.currencySymbol || 'S/';
          pageTitle = `Propuesta ${q.code || ''} — ${q.clientName || 'Cliente'} | ${agencyName}`;
          ogTitle = `Propuesta Comercial ${q.code || ''} — ${q.clientName || 'Cliente'}`;
          ogDescription = `Propuesta de servicios profesionales emitida por ${agencyName}. Inversión: ${currSymbol} ${Number(q.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
          ogImage = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(t.slug)}`;
          faviconUrl = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(t.slug)}`;
          themeColor = t.customization?.lightPalette?.primary || '#0055ff';
        }
      }
    }
    // 2. Notas de Pago / Comprobantes públicos (/np/:id, /pago/:id, /nota-pago/:id)
    else if (
      pathname.startsWith('/np/') ||
      pathname.startsWith('/pago/') ||
      pathname.startsWith('/nota-pago/')
    ) {
      const parts = pathname.split('/');
      const token = parts[2] || parts[1];
      if (token) {
        const noteData = await db.getPaymentNoteByPublicToken(token);
        if (noteData) {
          const n = noteData.paymentNote;
          const t = noteData.tenant;
          tenantSlug = t.slug;
          const agencyName = t.companyInfo?.commercialName || t.name;
          const currSymbol = t.customization?.currencySymbol || 'S/';
          pageTitle = `Comprobante de Pago ${n.code || ''} — ${n.clientName || 'Cliente'} | ${agencyName}`;
          ogTitle = `Comprobante Oficial de Pago ${n.code || ''}`;
          ogDescription = `Comprobante emitido para ${n.clientName || 'Cliente'} por ${agencyName}. Total: ${currSymbol} ${Number(n.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
          ogImage = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(t.slug)}`;
          faviconUrl = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(t.slug)}`;
          themeColor = t.customization?.lightPalette?.primary || '#0055ff';
        }
      }
    }
    // 3. Catálogo o Servicio público (/s/:slug, /servicio/:slug)
    else if (
      pathname.startsWith('/s/') ||
      pathname.startsWith('/servicio/') ||
      pathname.startsWith('/p/servicio/')
    ) {
      const parts = pathname.split('/');
      const slug = parts[2] || parts[1];
      const tenantParam = (req.query.tenant as string) || '';
      if (slug) {
        const srvData = await db.getPublicServiceBySlugOrId(tenantParam || 'roma-agencia', slug);
        if (srvData && srvData.service) {
          const s = srvData.service;
          const t = srvData.tenant;
          tenantSlug = t.slug;
          const agencyName = t.companyInfo?.commercialName || t.name;
          pageTitle = `${s.title} | ${agencyName}`;
          ogTitle = `${s.title} — ${agencyName}`;
          ogDescription = s.briefDescription || s.fullDescription || 'Consulta los paquetes, entregables e inversión de este servicio profesional.';
          ogImage = s.coverImage || `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(t.slug)}`;
          faviconUrl = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(t.slug)}`;
        }
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
        ogImage = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(tenantSlug)}`;
        faviconUrl = `${origin}/api/public/tenant-icon?tenant=${encodeURIComponent(tenantSlug)}`;
        themeColor = defaultTenant.customization?.lightPalette?.primary || '#0055ff';
      }
    }

    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const ogTags = `
    <!-- Open Graph & Meta Tags Dinámicos (WhatsApp, Facebook, Twitter, Telegram) -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${escapeHtml(ogTitle)}" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(ogDescription)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:url" content="${fullUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="theme-color" content="${themeColor}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="${escapeHtml(ogTitle)}" />
    <link rel="apple-touch-icon" href="${faviconUrl}" />
    `;

    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);
    html = html.replace(/<link id="dynamic-favicon"[^>]*>/i, `<link id="dynamic-favicon" rel="icon" href="${faviconUrl}" />`);
    const manifestHref = tenantSlug
      ? `/api/public/manifest.webmanifest?tenant=${encodeURIComponent(tenantSlug)}`
      : '/api/public/manifest.webmanifest';
    html = html.replace(/<link id="dynamic-manifest"[^>]*>/i, `<link id="dynamic-manifest" rel="manifest" href="${manifestHref}" />`);

    html = html.replace('</head>', `${ogTags}\n  </head>`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  }
}

app.get(
  [
    '/c/:token',
    '/q/:token',
    '/p/:token',
    '/cotizacion/:token',
    '/np/:token',
    '/pago/:token',
    '/nota-pago/:token',
    '/servicios',
    '/p/servicios',
    '/s/:slug',
    '/servicio/:slug',
    '/p/servicio/:slug',
  ],
  serveHtmlWithMetadata
);

// Servir archivos multimedia subidos (imágenes, referencias, logos, comprobantes)
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      serveHtmlWithMetadata(req, res);
    }
  });
}

async function bootstrap() {
  await db.initialize();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [SISTEMA ROMA V4 SaaS] Servidor activo en http://localhost:${PORT}`);
  });
}

bootstrap();
