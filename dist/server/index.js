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
const db_1 = require("./db");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const auth_1 = require("./middleware/auth");
const permissions_1 = require("../shared/permissions");
const drive_routes_1 = __importDefault(require("./routes/drive.routes"));
const googleDriveService_1 = require("./services/googleDriveService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT || 3001);
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
// Permitir subir imágenes Base64 de logos, favicons y PWA de hasta 10MB
app.use(express_1.default.json({ limit: '10mb' }));
// Módulo de Google Drive & Archivos Cloud
app.use('/api/drive', drive_routes_1.default);
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
app.post('/api/auth/login-pin', async (req, res) => {
    try {
        const { pin, tenantSlug } = req.body;
        if (!pin || typeof pin !== 'string' || !/^\d{8}$/.test(pin.trim())) {
            res.status(400).json({ error: 'Debes ingresar un PIN válido de exactamente 8 dígitos.' });
            return;
        }
        const match = await db_1.db.findUserByPin(pin.trim(), tenantSlug);
        if (!match) {
            res.status(401).json({
                error: 'PIN de 8 dígitos incorrecto o usuario inactivo. Verifica tu código de acceso.',
            });
            return;
        }
        const token = (0, auth_1.signSessionToken)({
            userId: match.user.id,
            tenantId: match.tenant.id,
            roleId: match.role.id,
        });
        res.json({
            token,
            user: match.user,
            role: match.role,
            tenant: match.tenant,
            permissionsCatalog: permissions_1.PERMISSIONS_CATALOG,
            engineInfo: db_1.db.getEngineInfo(),
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/auth/me', auth_1.requireAuth, async (req, res) => {
    const { user, role, tenant } = req.auth;
    res.json({
        user,
        role,
        tenant,
        permissionsCatalog: permissions_1.PERMISSIONS_CATALOG,
        engineInfo: db_1.db.getEngineInfo(),
    });
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
        // 2. Si no tiene cuenta directa, pero es Administrador o tiene permisos de gestión en su tenant actual,
        // enlazarlo con el usuario administrador activo del tenant destino
        if (!targetUser) {
            const hasPermissionToSwitch = req.auth?.role?.isSystem ||
                (req.auth?.role &&
                    (0, permissions_1.hasAnyPermission)(req.auth.role.permissions, [
                        'settings.tenants.manage',
                        'settings.tenants.view',
                    ]));
            if (hasPermissionToSwitch) {
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
// 3. PRIMER MÓDULO: CLIENTES Y MARCAS ASIGNADAS (MULTITENANT + PERMISOS)
// =============================================================================
app.get('/api/clients', auth_1.requireAuth, (0, auth_1.requirePermission)('clients.view'), async (req, res) => {
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
        const quote = await db_1.db.getQuoteById(req.params.id, req.auth.tenant.id);
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
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Endpoint público para que el cliente consulte su nota de pago (sin requerir autenticación)
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
        await db_1.db.updateWorkspacePost(post.id, post.tenantId, { comments: updatedComments });
        res.json({ success: true, comment: newComment });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// =============================================================================
// MÓDULO DE WORKSPACE: REDES SOCIALES & PROYECTOS
// =============================================================================
// Listar proyectos de workspace
app.get('/api/workspace/projects', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.view'), async (req, res) => {
    try {
        const clientId = req.query.clientId;
        const projects = await db_1.db.getWorkspaceProjects(req.auth.tenant.id, clientId);
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
        const months = await db_1.db.getWorkspaceMonths(req.auth.tenant.id, projectId);
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
        const posts = await db_1.db.getWorkspacePosts(req.auth.tenant.id, clientId);
        res.json({ posts });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Crear publicación
app.post('/api/workspace/posts', auth_1.requireAuth, (0, auth_1.requirePermission)('workspace.social.manage'), async (req, res) => {
    try {
        const created = await db_1.db.createWorkspacePost(req.auth.tenant.id, req.body);
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
// MÓDULO DE ÓRDENES DE SERVICIO (OS)
// =============================================================================
// Listar órdenes de servicio
app.get('/api/service-orders', auth_1.requireAuth, (0, auth_1.requirePermission)('service_orders.view'), async (req, res) => {
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
        const updated = await db_1.db.updateServiceCategory(req.auth.tenant.id, req.params.id, req.body);
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
        const ok = await db_1.db.deleteServiceCategory(req.auth.tenant.id, req.params.id);
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
        const service = await db_1.db.getServiceById(req.auth.tenant.id, req.params.id);
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
        res.status(201).json({ service });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.put('/api/services/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('services.edit'), async (req, res) => {
    try {
        const updated = await db_1.db.updateService(req.auth.tenant.id, req.params.id, req.body);
        if (!updated) {
            res.status(404).json({ error: 'Servicio no encontrado.' });
            return;
        }
        res.json({ service: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.delete('/api/services/:id', auth_1.requireAuth, (0, auth_1.requirePermission)('services.delete'), async (req, res) => {
    try {
        const ok = await db_1.db.deleteService(req.auth.tenant.id, req.params.id);
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
app.post('/api/tenants', auth_1.requireAuth, (0, auth_1.requirePermission)('settings.tenants.manage'), async (req, res) => {
    try {
        const { name, slug, currencyCode, commercialName, legalName, ruc, email, whatsapp, address, adminName, adminEmail, adminPin, adminJobTitle, } = req.body;
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
    const candidates = [
        '/usr/bin/git',
        '/usr/local/bin/git',
        '/usr/local/cpanel/3rdparty/bin/git',
        '/opt/cpanel/ea-git/bin/git',
    ];
    for (const cmd of candidates) {
        if (fs_1.default.existsSync(cmd))
            return `"${cmd}" -c safe.directory=*`;
    }
    return 'git -c safe.directory=*';
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
            try {
                const { stdout: insideWorkTree } = await execAsync(`${gitCmd} rev-parse --is-inside-work-tree`);
                if (insideWorkTree.trim() === 'true' || fs_1.default.existsSync(path_1.default.resolve(process.cwd(), '.git'))) {
                    addLog('git', 'pending', `Conectando con repositorio remoto y trayendo cambios (rama: ${branch})...`);
                    try {
                        await execAsync(`${gitCmd} fetch origin`);
                        const { stdout: pullOut, stderr: pullErr } = await execAsync(`${gitCmd} pull origin ${branch}`);
                        addLog('git', 'success', `Git pull exitoso: ${pullOut.trim() || pullErr.trim() || 'Actualizado al día'}`);
                    }
                    catch (pullEx) {
                        addLog('git', 'warning', `Aviso en git pull: ${pullEx.message}`);
                    }
                }
                else {
                    addLog('git', 'warning', 'No se detectó un repositorio Git local (.git). Se continúa con la migración segura de base de datos.');
                }
            }
            catch {
                addLog('git', 'warning', 'Entorno Git no inicializado localmente. Se continúa con la migración segura de base de datos.');
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
            if (srcExists && hasVite) {
                addLog('build', 'pending', 'Compilando frontend (Vite) y backend (TypeScript)...');
                try {
                    await execAsync('npm run build');
                    addLog('build', 'success', 'Compilación exitosa: dist/client y dist/server actualizados.');
                }
                catch (buildErr) {
                    if (hasPrecompiledDist) {
                        addLog('build', 'warning', `Aviso en compilación: ${buildErr.message}. Se conservan los archivos optimizados vigentes en dist/.`);
                    }
                    else {
                        throw buildErr;
                    }
                }
            }
            else if (hasPrecompiledDist) {
                // Entorno de producción precompilado (cPanel, etc.)
                addLog('build', 'success', 'Entorno de producción precompilado: Archivos optimizados en dist/ verificados y vigentes. No se requiere compilar en el servidor.');
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
                    if (hasPrecompiledDist) {
                        addLog('build', 'warning', `No se pudo compilar (${installErr.message}), pero dist/ se mantiene activo.`);
                    }
                    else {
                        throw installErr;
                    }
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
// Manifiesto PWA Dinámico por Tenant
app.get('/api/public/manifest.webmanifest', async (req, res) => {
    try {
        const slug = req.query.tenant;
        const tenant = await db_1.db.getPublicTenantBranding(slug);
        const name = tenant?.companyInfo?.commercialName || tenant?.name || 'ROMA Agencia';
        const shortName = name.slice(0, 15);
        const desc = `Sistema SaaS de Gestión para Agencia de Publicidad y Diseño - ${name}`;
        // Los navegadores exigen URLs válidas para icons en webmanifest, no strings base64 pesados
        let iconSrc = '/favicon.svg';
        const customIcon = tenant?.customization?.logoPwaUrl || tenant?.customization?.faviconUrl;
        if (customIcon && (customIcon.startsWith('http://') || customIcon.startsWith('https://') || (customIcon.startsWith('/') && !customIcon.startsWith('data:')))) {
            iconSrc = customIcon;
        }
        res.setHeader('Content-Type', 'application/manifest+json');
        res.setHeader('Cache-Control', 'public, max-age=60');
        return res.json({
            name,
            short_name: shortName,
            description: desc,
            start_url: '/',
            display: 'standalone',
            background_color: tenant?.customization?.darkPalette?.background || '#090d16',
            theme_color: tenant?.customization?.lightPalette?.primary || '#0055ff',
            icons: [
                {
                    src: iconSrc,
                    sizes: '192x192',
                    type: iconSrc.endsWith('.png') ? 'image/png' : 'image/svg+xml',
                    purpose: 'any maskable',
                },
                {
                    src: iconSrc,
                    sizes: '512x512',
                    type: iconSrc.endsWith('.png') ? 'image/png' : 'image/svg+xml',
                    purpose: 'any maskable',
                },
            ],
        });
    }
    catch (err) {
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
// Rutas cortas de cotización pública y catálogo de servicios (/q/:token, /servicios, /s/:slug)
const clientDistPath = path_1.default.resolve(process.cwd(), 'dist', 'client');
app.get([
    '/q/:token',
    '/p/:token',
    '/cotizacion/:token',
    '/servicios',
    '/p/servicios',
    '/s/:slug',
    '/servicio/:slug',
    '/p/servicio/:slug',
], (req, res) => {
    if (fs_1.default.existsSync(clientDistPath)) {
        res.sendFile(path_1.default.join(clientDistPath, 'index.html'));
    }
    else {
        // Modo desarrollo: redirigir al dev server de Vite con la misma ruta
        res.redirect(`http://localhost:5173${req.originalUrl}`);
    }
});
// Servir archivos multimedia subidos (imágenes, referencias, logos, comprobantes)
const uploadsDir = path_1.default.resolve(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express_1.default.static(uploadsDir));
if (fs_1.default.existsSync(clientDistPath)) {
    app.use(express_1.default.static(clientDistPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path_1.default.join(clientDistPath, 'index.html'));
        }
    });
}
async function bootstrap() {
    await db_1.db.initialize();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 [SISTEMA ROMA V4 SaaS] Servidor activo en http://localhost:${PORT}`);
    });
}
bootstrap();
