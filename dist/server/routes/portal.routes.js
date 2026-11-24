"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const notificationService_1 = require("../services/notificationService");
const router = (0, express_1.Router)();
/**
 * Middleware exclusivo del Portal de Clientes:
 * Garantiza que la sesión pertenezca a un cliente autenticado por DNI y aísla sus datos por tenantId + clientId.
 */
async function requireClientPortal(req, res, next) {
    if (!req.auth?.user || !req.auth?.tenant) {
        res.status(401).json({ error: 'Sesión de cliente no autorizada.' });
        return;
    }
    const { user, tenant } = req.auth;
    if (!user.id.startsWith('client-user-')) {
        res.status(403).json({ error: 'Acceso exclusivo para cuentas del Portal de Clientes.' });
        return;
    }
    const clientId = user.id.replace(/^client-user-/, '');
    const client = await db_1.db.getClientById(clientId, tenant.id);
    if (!client || client.status !== 'active') {
        res.status(403).json({ error: 'Tu cuenta de cliente se encuentra inactiva o no existe.' });
        return;
    }
    req.clientPortal = { clientId, client };
    next();
}
router.use(auth_1.requireAuth, requireClientPortal);
/**
 * GET /api/portal/overview
 * Retorna toda la información consolidada del cliente autenticado (marcas, proyectos, entregables,
 * cotizaciones, órdenes de servicio, notas de pago, manuales de marca y catálogo de servicios).
 */
router.get('/overview', async (req, res) => {
    try {
        const tenantId = req.auth.tenant.id;
        const { clientId, client } = req.clientPortal;
        const brands = client.brands || [];
        const brandIds = new Set(brands.map((b) => b.id));
        const brandNamesLower = new Set(brands.map((b) => b.name.trim().toLowerCase()));
        const [allQuotes, allPaymentNotes, allServiceOrders, allProjects, allMonths, allPosts, clientTasks, allBrandGuidelines, allBiolinks, allServices, allSoftwareProjects,] = await Promise.all([
            db_1.db.getQuotesByTenant(tenantId),
            db_1.db.getPaymentNotesByTenant(tenantId),
            db_1.db.getServiceOrders(tenantId, clientId),
            db_1.db.getWorkspaceProjects(tenantId),
            db_1.db.getWorkspaceMonths(tenantId),
            db_1.db.getWorkspacePosts(tenantId),
            db_1.db.getWorkspaceTasks(tenantId, clientId),
            db_1.db.getBrandGuidelines(tenantId),
            db_1.db.getBiolinks(tenantId),
            db_1.db.getServices(tenantId),
            db_1.db.getSoftwareProjects(tenantId),
        ]);
        const clientProjects = allProjects.filter((p) => p.clientId === clientId ||
            (p.brandId && brandIds.has(p.brandId)) ||
            (p.brandName && brandNamesLower.has(p.brandName.trim().toLowerCase())));
        const projectIds = new Set(clientProjects.map((p) => p.id));
        const clientPosts = allPosts.filter((p) => p.clientId === clientId ||
            (p.projectId && projectIds.has(p.projectId)) ||
            (p.brandId && brandIds.has(p.brandId)) ||
            (p.brandName && brandNamesLower.has(p.brandName.trim().toLowerCase())));
        const quotes = allQuotes
            .filter((q) => q.clientId === clientId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const paymentNotes = allPaymentNotes
            .filter((p) => p.clientId === clientId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const serviceOrders = allServiceOrders
            .filter((so) => so.clientId === clientId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const workspaceMonths = allMonths
            .filter((m) => projectIds.has(m.projectId))
            .sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
        const brandGuidelines = allBrandGuidelines.filter((bg) => bg.clientId === clientId ||
            (bg.projectId && projectIds.has(bg.projectId)) ||
            (bg.brandName && brandNamesLower.has(bg.brandName.trim().toLowerCase())));
        const biolinks = allBiolinks.filter((b) => {
            if (b.clientId && b.clientId === clientId)
                return true;
            if (b.brandId && brandIds.has(b.brandId))
                return true;
            if (b.title && brandNamesLower.has(String(b.title).trim().toLowerCase()))
                return true;
            return false;
        });
        const activeServices = allServices.filter((s) => s.status === 'active');
        const softwareProjects = allSoftwareProjects
            .filter((sp) => sp.clientId === clientId ||
            (sp.brandId && brandIds.has(sp.brandId)) ||
            (sp.brandName && brandNamesLower.has(sp.brandName.trim().toLowerCase())))
            .map((sp) => ({
            ...sp,
            milestones: (sp.milestones || []).filter((m) => m.isVisibleToClient !== false),
        }));
        const milestonesInReviewCount = softwareProjects.reduce((acc, sp) => acc + sp.milestones.filter((m) => m.status === 'client_review').length, 0);
        const pendingQuotesCount = quotes.filter((q) => q.status === 'sent').length;
        const pendingPaymentsCount = paymentNotes.filter((p) => p.status === 'pending' || p.status === 'partial').length;
        const postsInReviewCount = clientPosts.filter((p) => p.status === 'review').length;
        res.json({
            client: {
                id: client.id,
                name: client.name,
                documentType: client.documentType,
                documentNumber: client.documentNumber,
                whatsapp: client.whatsapp,
                email: client.email,
                status: client.status,
            },
            brands,
            summary: {
                brandsCount: brands.length,
                activeProjectsCount: clientProjects.filter((p) => p.status === 'active').length +
                    softwareProjects.filter((sp) => sp.status !== 'paused' && sp.status !== 'deployed').length,
                pendingQuotesCount,
                pendingPaymentsCount,
                postsInReviewCount,
                milestonesInReviewCount,
                totalPostsCount: clientPosts.length,
                approvedPostsCount: clientPosts.filter((p) => p.status === 'approved' || p.status === 'published').length,
            },
            quotes,
            paymentNotes,
            serviceOrders,
            workspaceProjects: clientProjects,
            workspaceMonths,
            workspacePosts: clientPosts.sort((a, b) => new Date(b.scheduledDate || b.createdAt).getTime() - new Date(a.scheduledDate || a.createdAt).getTime()),
            workspaceTasks: clientTasks,
            brandGuidelines,
            biolinks,
            servicesCatalog: activeServices,
            softwareProjects,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/portal/quotes/:id/respond
 * Permite al cliente aprobar o solicitar cambios en una de sus cotizaciones.
 */
router.post('/quotes/:id/respond', async (req, res) => {
    try {
        const tenantId = req.auth.tenant.id;
        const { clientId } = req.clientPortal;
        const id = String(req.params.id);
        const { action, comment } = req.body;
        if (action !== 'approve' && action !== 'reject') {
            res.status(400).json({ error: 'Acción inválida. Usa "approve" o "reject".' });
            return;
        }
        const quote = await db_1.db.getQuoteById(id, tenantId);
        if (!quote || quote.clientId !== clientId) {
            res.status(404).json({ error: 'Cotización no encontrada para tu cuenta.' });
            return;
        }
        const nextStatus = action === 'approve' ? 'approved' : 'rejected';
        const clientFeedbackNote = comment?.trim()
            ? `${quote.additionalNotes ? quote.additionalNotes + '\n' : ''}[Portal Cliente]: ${comment.trim()}`
            : quote.additionalNotes;
        const updated = await db_1.db.updateQuote(id, tenantId, {
            status: nextStatus,
            additionalNotes: clientFeedbackNote,
        });
        res.json({ quote: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/portal/workspace-posts/:id/feedback
 * Permite al cliente aprobar o enviar observaciones sobre un entregable/publicación.
 */
router.post('/workspace-posts/:id/feedback', async (req, res) => {
    try {
        const tenantId = req.auth.tenant.id;
        const { clientId, client } = req.clientPortal;
        const id = String(req.params.id);
        const { action, feedback } = req.body;
        if (action !== 'approve' && action !== 'changes') {
            res.status(400).json({ error: 'Acción inválida. Usa "approve" o "changes".' });
            return;
        }
        const brands = client.brands || [];
        const brandIds = new Set(brands.map((b) => b.id));
        const brandNamesLower = new Set(brands.map((b) => b.name.trim().toLowerCase()));
        const allProjects = await db_1.db.getWorkspaceProjects(tenantId);
        const projectIds = new Set(allProjects
            .filter((p) => p.clientId === clientId ||
            (p.brandId && brandIds.has(p.brandId)) ||
            (p.brandName && brandNamesLower.has(p.brandName.trim().toLowerCase())))
            .map((p) => p.id));
        const posts = await db_1.db.getWorkspacePosts(tenantId);
        const post = posts.find((p) => p.id === id &&
            (p.clientId === clientId ||
                (p.projectId && projectIds.has(p.projectId)) ||
                (p.brandId && brandIds.has(p.brandId)) ||
                (p.brandName && brandNamesLower.has(p.brandName.trim().toLowerCase()))));
        if (!post) {
            res.status(404).json({ error: 'Entregable no encontrado para tu cuenta.' });
            return;
        }
        const nextStatus = action === 'approve' ? 'approved' : 'design';
        const updated = await db_1.db.updateWorkspacePost(id, tenantId, {
            status: nextStatus,
            ...(feedback?.trim() ? { clientFeedback: feedback.trim() } : {}),
        });
        res.json({ post: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/portal/software/:projectId/milestones/:milestoneId/review
 * Permite al cliente aprobar o solicitar ajustes en un hito de desarrollo de software.
 */
router.post('/software/:projectId/milestones/:milestoneId/review', async (req, res) => {
    try {
        const tenantId = req.auth.tenant.id;
        const { clientId, client } = req.clientPortal;
        const projectId = String(req.params.projectId);
        const milestoneId = String(req.params.milestoneId);
        const project = await db_1.db.getSoftwareProjectById(projectId, tenantId);
        const brands = client.brands || [];
        const brandIds = new Set(brands.map((b) => b.id));
        const brandNamesLower = new Set(brands.map((b) => b.name.trim().toLowerCase()));
        const belongsToClient = project &&
            (project.clientId === clientId ||
                (project.brandId && brandIds.has(project.brandId)) ||
                (project.brandName && brandNamesLower.has(project.brandName.trim().toLowerCase())));
        if (!project || !belongsToClient) {
            res.status(404).json({ error: 'Proyecto de software no encontrado para tu cuenta.' });
            return;
        }
        const decision = req.body?.decision === 'changes_requested' ? 'changes_requested' : 'approved';
        const notes = String(req.body?.notes || '').trim();
        const now = new Date().toISOString();
        let milestoneTitle = '';
        const updatedMilestones = project.milestones.map((m) => {
            if (m.id !== milestoneId)
                return m;
            milestoneTitle = m.title;
            const commentList = notes
                ? [
                    ...(m.comments || []),
                    {
                        id: `swc_${Date.now()}_${crypto_1.default.randomBytes(3).toString('hex')}`,
                        authorName: client.name,
                        authorRole: 'client',
                        text: decision === 'approved'
                            ? `✅ Hito aprobado desde Portal de Clientes: ${notes}`
                            : `🛠️ Ajustes solicitados desde Portal de Clientes: ${notes}`,
                        createdAt: now,
                    },
                ]
                : m.comments || [];
            return {
                ...m,
                status: decision === 'approved' ? 'approved' : 'in_progress',
                completedAt: decision === 'approved' ? now : m.completedAt,
                clientApproval: {
                    status: decision,
                    decidedBy: client.name,
                    decidedAt: now,
                    notes,
                },
                comments: commentList,
            };
        });
        if (!milestoneTitle) {
            res.status(404).json({ error: 'Hito no encontrado.' });
            return;
        }
        const updated = await db_1.db.updateSoftwareProject(project.id, tenantId, {
            milestones: updatedMilestones,
        });
        (0, notificationService_1.notifyEvent)({
            tenantId,
            title: decision === 'approved'
                ? `✅ Hito aprobado en Portal: ${milestoneTitle}`
                : `🛠️ Ajustes solicitados en Portal: ${milestoneTitle}`,
            message: `${client.name} ${decision === 'approved' ? 'aprobó' : 'solicitó ajustes en'} "${milestoneTitle}" (${project.name}).`,
            type: decision === 'approved' ? 'success' : 'warning',
            module: 'workspace',
            entityId: project.id,
            action: decision === 'approved' ? 'portal_milestone_approved' : 'portal_milestone_changes',
            actorUserName: client.name,
        }).catch(() => { });
        res.json({ success: true, project: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * POST /api/portal/software/:projectId/milestones/:milestoneId/comment
 * Permite al cliente comentar o reportar un detalle QA sobre un hito desde su Portal.
 */
router.post('/software/:projectId/milestones/:milestoneId/comment', async (req, res) => {
    try {
        const tenantId = req.auth.tenant.id;
        const { clientId, client } = req.clientPortal;
        const projectId = String(req.params.projectId);
        const milestoneId = String(req.params.milestoneId);
        const project = await db_1.db.getSoftwareProjectById(projectId, tenantId);
        const brands = client.brands || [];
        const brandIds = new Set(brands.map((b) => b.id));
        const brandNamesLower = new Set(brands.map((b) => b.name.trim().toLowerCase()));
        const belongsToClient = project &&
            (project.clientId === clientId ||
                (project.brandId && brandIds.has(project.brandId)) ||
                (project.brandName && brandNamesLower.has(project.brandName.trim().toLowerCase())));
        if (!project || !belongsToClient) {
            res.status(404).json({ error: 'Proyecto de software no encontrado.' });
            return;
        }
        const text = String(req.body?.text || '').trim();
        const isBugReport = Boolean(req.body?.isBugReport);
        if (!text) {
            res.status(400).json({ error: 'Escribe un mensaje antes de enviar.' });
            return;
        }
        const now = new Date().toISOString();
        const newComment = {
            id: `swc_${Date.now()}_${crypto_1.default.randomBytes(3).toString('hex')}`,
            authorName: client.name,
            authorRole: 'client',
            text: isBugReport ? `🐞 [Reporte QA Portal] ${text}` : text,
            createdAt: now,
        };
        const updatedMilestones = project.milestones.map((m) => m.id === milestoneId ? { ...m, comments: [...(m.comments || []), newComment] } : m);
        let updatedWorkItems = [...(project.workItems || [])];
        if (isBugReport) {
            const bugCount = updatedWorkItems.filter((w) => w.type === 'bug').length + 1;
            const newBug = {
                id: `swi_${Date.now()}_${crypto_1.default.randomBytes(3).toString('hex')}`,
                milestoneId,
                code: `BUG-${String(bugCount).padStart(2, '0')}`,
                type: 'bug',
                title: text.length > 85 ? `${text.slice(0, 82)}...` : text,
                description: text,
                status: 'todo',
                priority: 'high',
                severity: 'major',
                acceptanceCriteria: [],
                reportedByClient: true,
                createdAt: now,
                updatedAt: now,
            };
            updatedWorkItems = [newBug, ...updatedWorkItems];
        }
        const updated = await db_1.db.updateSoftwareProject(project.id, tenantId, {
            milestones: updatedMilestones,
            workItems: updatedWorkItems,
        });
        res.json({ success: true, project: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
