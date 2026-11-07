"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const notificationService_1 = require("../services/notificationService");
let qrcodeModule = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    qrcodeModule = require('qrcode');
}
catch {
    // fallback
}
const router = (0, express_1.Router)();
// =============================================================================
// SEED DEFAULT: PITCH DECK INSPIRADO EN EL VIDEO (PIXELTRUCK / SWISS STYLE)
// =============================================================================
function createSampleBrandGuideline(tenantId) {
    return {
        tenantId,
        clientName: 'PixelTruck Logistics',
        brandName: 'PixelTruck',
        designerName: 'Roma Creative Studio',
        round: 'Round 1',
        date: 'Noviembre 2026',
        tagline: 'Modern Logistics & Scalable Tech Platform',
        requirePin: true,
        publicPin: '1234',
        themeDefault: 'dark',
        viewModeDefault: 'deck',
        status: 'in_review',
        comments: [],
        briefOverviewTitle: 'A brief project summary highlighting the purpose, key objectives, and goals of the redesign.',
        briefOverviewText: 'This project overview provides a concise summary of the rebranding project, outlining the purpose and key objectives of the redesign. It highlights the reasons for the rebrand, such as modernization, repositioning, and audience expansion, aligned with core brand values.',
        briefSecondaryText: 'Additionally, this section describes the desired look and feel of the new logo, any key elements retained or transformed, and how the new design seamlessly aligns with modern digital touchpoints.',
        goals: [
            {
                id: 'g1',
                number: '01',
                title: 'Modernization',
                description: 'Update the brand\'s visual and verbal identity to feel more current, relevant, and aligned with modern design standards and audience expectations.',
            },
            {
                id: 'g2',
                number: '02',
                title: 'Competitive Differentiation',
                description: 'Refine the brand to stand out clearly in the market by emphasizing unique positioning, values, and points of difference from competitors.',
            },
            {
                id: 'g3',
                number: '03',
                title: 'Simplification',
                description: 'Streamline complex or outdated brand elements into a cleaner, more cohesive system that improves recognition and usability across all touchpoints.',
            },
        ],
        directionName: 'Direction One',
        directionRationale: 'This direction provides a brief overview of the logo concept, focusing on its inspiration, design rationale, and core message. It explains the mark\'s meaning, how it represents the brand, and its intended impact with clarity and conciseness.',
        brandBeforeLabel: 'Legacy Brand Identity (2019)',
        clearspaceUnit: '1x',
        donts: [
            { id: 'd1', title: 'No deformar ni estirar horizontal/verticalmente', ruleType: 'stretch' },
            { id: 'd2', title: 'No inclinar ni rotar en ángulos arbitrarios', ruleType: 'rotate' },
            { id: 'd3', title: 'No alterar los colores oficiales de la marca', ruleType: 'recolor' },
            { id: 'd4', title: 'No aplicar sombras paralelas ni trazos invasivos', ruleType: 'shadow' },
            { id: 'd5', title: 'No usar sobre fondos sin contraste suficiente', ruleType: 'contrast' },
            { id: 'd6', title: 'No alterar la proporción entre isotipo y logotipo', ruleType: 'rearrange' },
        ],
        colors: [
            { id: 'c1', name: 'Pitch Black', hex: '#111111', role: 'dark', pantone: 'Black 6 C', rgb: '17, 17, 17', cmyk: '0, 0, 0, 93' },
            { id: 'c2', name: 'Slate Gray', hex: '#636569', role: 'secondary', pantone: 'Cool Gray 9 C', rgb: '99, 101, 105', cmyk: '6, 4, 0, 59' },
            { id: 'c3', name: 'Silver Mist', hex: '#CACBCE', role: 'neutral', pantone: 'Cool Gray 3 C', rgb: '202, 203, 206', cmyk: '2, 1, 0, 19' },
            { id: 'c4', name: 'Pure Canvas', hex: '#FFFFFF', role: 'light', pantone: 'Bright White', rgb: '255, 255, 255', cmyk: '0, 0, 0, 0' },
        ],
        typography: [
            {
                id: 'f1',
                role: 'headings',
                fontFamily: 'Inter',
                weight: 'Regular / SemiBold',
                sampleText: 'The quick brown fox jumps over the lazy dog',
            },
            {
                id: 'f2',
                role: 'body',
                fontFamily: 'Inter',
                weight: 'Regular',
                sampleText: 'The quick brown fox jumps over the lazy dog',
            },
        ],
        statNumber: '$2.5M',
        statLabel: 'Key performance metric & platform reach target',
        mockupMobileUrlWebsite: 'www.pixeltruck.com',
        merchItems: [
            { id: 'm1', type: 'sweatshirt', title: 'Crewneck Sweatshirt', variant: 'black' },
            { id: 'm2', type: 'tshirt', title: 'Minimalist T-Shirt', variant: 'black' },
            { id: 'm3', type: 'hoodie', title: 'Studio Hoodie', variant: 'black' },
            { id: 'm4', type: 'cap', title: 'Embroidered Cap', variant: 'black' },
            { id: 'm5', type: 'totebag', title: 'Heavy Canvas Tote', variant: 'black' },
            { id: 'm6', type: 'bottle', title: 'Matte Steel Thermos', variant: 'black' },
            { id: 'm7', type: 'badge', title: 'Corporate RFID Lanyard', variant: 'black' },
            { id: 'm8', type: 'laptop', title: 'Die-Cut MacBook Sticker', variant: 'gray' },
        ],
        otherIdeas: [
            { id: 'oi1', title: 'Modular Quadrant' },
            { id: 'oi2', title: 'Dynamic Checkered Matrix' },
            { id: 'oi3', title: 'Architectural Geometric Petals' },
            { id: 'oi4', title: 'Hourglass Convergence' },
            { id: 'oi5', title: 'Falcon Monogram Shield' },
            { id: 'oi6', title: 'Crossed Kinetic Ribbon' },
        ],
        nextSteps: [
            { id: 'ns1', step: '01', title: 'Review & Feedback', description: 'Share your thoughts on the logo design. Let us know if any refinements are needed.' },
            { id: 'ns2', step: '02', title: 'Revisions (if necessary)', description: 'We will refine the design based on your feedback and aesthetic priorities.' },
            { id: 'ns3', step: '03', title: 'Final Approval', description: 'Once approved, we will proceed with finalizing the logo suite and production vectors.' },
            { id: 'ns4', step: '04', title: 'File Delivery', description: 'You will receive all logo formats for print, digital, mobile, and branding guidelines.' },
        ],
    };
}
// =============================================================================
// RUTAS PRIVADAS (WORKSPACE / ADMIN)
// =============================================================================
const seededTenants = new Set();
// GET /api/workspace/brand-guidelines
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant no especificado' });
        }
        const search = req.query.q;
        let list = await db_1.db.getBrandGuidelines(tenantId, search);
        // Solo crear la guía demo la primera vez si nunca se ha inicializado en esta sesión y no hay búsqueda
        if (list.length === 0 && !search && !seededTenants.has(tenantId)) {
            seededTenants.add(tenantId);
            const sample = createSampleBrandGuideline(tenantId);
            const created = await db_1.db.createBrandGuideline(sample);
            list = [created];
        }
        else {
            seededTenants.add(tenantId);
        }
        return res.json({ success: true, guidelines: list });
    }
    catch (error) {
        console.error('Error fetching brand guidelines:', error);
        return res.status(500).json({ error: error.message || 'Error al obtener brand guidelines' });
    }
});
// GET /api/workspace/brand-guidelines/:id
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        const id = String(req.params.id);
        const guideline = await db_1.db.getBrandGuidelineById(id, tenantId);
        if (!guideline) {
            return res.status(404).json({ error: 'Brand guideline no encontrado' });
        }
        return res.json({ success: true, guideline });
    }
    catch (error) {
        console.error('Error fetching brand guideline:', error);
        return res.status(500).json({ error: error.message || 'Error al obtener brand guideline' });
    }
});
// POST /api/workspace/brand-guidelines
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant no especificado' });
        }
        const { brandName } = req.body;
        if (!brandName?.trim()) {
            return res.status(400).json({ error: 'El nombre de la marca es requerido' });
        }
        const newGuideline = await db_1.db.createBrandGuideline({
            ...req.body,
            tenantId,
            brandName: brandName.trim(),
            clientName: req.body.clientName?.trim() || 'Cliente',
            designerName: req.body.designerName?.trim() || '',
            round: req.body.round?.trim() || 'Round 1',
            requirePin: Boolean(req.body.requirePin),
            publicPin: req.body.publicPin ? String(req.body.publicPin).trim() : '',
            themeDefault: req.body.themeDefault === 'light' ? 'light' : 'dark',
            viewModeDefault: req.body.viewModeDefault === 'grid' ? 'grid' : 'deck',
        });
        return res.status(201).json({ success: true, guideline: newGuideline });
    }
    catch (error) {
        console.error('Error creating brand guideline:', error);
        return res.status(500).json({ error: error.message || 'Error al crear brand guideline' });
    }
});
// PUT /api/workspace/brand-guidelines/:id
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        const id = String(req.params.id);
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant no especificado' });
        }
        const updated = await db_1.db.updateBrandGuideline(id, tenantId, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Brand guideline no encontrado' });
        }
        return res.json({ success: true, guideline: updated });
    }
    catch (error) {
        console.error('Error updating brand guideline:', error);
        return res.status(500).json({ error: error.message || 'Error al actualizar brand guideline' });
    }
});
// DELETE /api/workspace/brand-guidelines/:id
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        const id = String(req.params.id);
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant no especificado' });
        }
        const deleted = await db_1.db.deleteBrandGuideline(id, tenantId);
        if (!deleted) {
            return res.status(404).json({ error: 'Brand guideline no encontrado' });
        }
        return res.json({ success: true, message: 'Brand guideline eliminado exitosamente' });
    }
    catch (error) {
        console.error('Error deleting brand guideline:', error);
        return res.status(500).json({ error: error.message || 'Error al eliminar brand guideline' });
    }
});
// POST /api/workspace/brand-guidelines/:id/new-round
router.post('/:id/new-round', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        const id = String(req.params.id);
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant no especificado' });
        }
        const existing = await db_1.db.getBrandGuidelineById(id, tenantId);
        if (!existing) {
            return res.status(404).json({ error: 'Brand guideline no encontrado' });
        }
        const currentRound = existing.round || 'Round 1';
        const matchNum = currentRound.match(/(\d+)/);
        const nextRoundName = req.body?.roundName?.trim() ||
            (matchNum ? `Round ${parseInt(matchNum[1], 10) + 1}` : 'Versión Final');
        const snapshot = {
            id: `rnd_${Date.now()}`,
            round: currentRound,
            savedAt: new Date().toISOString(),
            note: req.body?.note || `Snapshot automático de ${currentRound}`,
            logoPrimaryUrl: existing.logoPrimaryUrl,
            colors: existing.colors,
        };
        const updated = await db_1.db.updateBrandGuideline(id, tenantId, {
            round: nextRoundName,
            status: 'in_review',
            roundHistory: [snapshot, ...(existing.roundHistory || [])],
        });
        return res.json({ success: true, guideline: updated });
    }
    catch (error) {
        console.error('Error advancing brand round:', error);
        return res.status(500).json({ error: error.message || 'Error al crear nueva ronda' });
    }
});
// =============================================================================
// RUTAS PÚBLICAS (CLIENTES / ESPECTADORES)
// =============================================================================
// GET /api/workspace/brand-guidelines/public/:token
router.get('/public/:token', async (req, res) => {
    try {
        const token = String(req.params.token);
        const guideline = await db_1.db.getBrandGuidelineByPublicToken(token);
        if (!guideline) {
            return res.status(404).json({ error: 'Manual o presentación no encontrada' });
        }
        // Si tiene protección por PIN
        if (guideline.requirePin && guideline.publicPin) {
            const providedPin = req.query.pin || req.headers['x-brand-pin'];
            if (!providedPin || providedPin.trim() !== guideline.publicPin.trim()) {
                // Retornar vista bloqueada (solo metadatos indispensables)
                return res.json({
                    success: true,
                    isLocked: true,
                    requirePin: true,
                    meta: {
                        brandName: guideline.brandName,
                        clientName: guideline.clientName,
                        clientLogo: guideline.clientLogo,
                        themeDefault: guideline.themeDefault,
                        round: guideline.round,
                        date: guideline.date,
                    },
                });
            }
        }
        // Incrementar contador de aperturas reales
        const updatedGuideline = (await db_1.db.updateBrandGuideline(guideline.id, guideline.tenantId, {
            viewsCount: (guideline.viewsCount || 0) + 1,
            lastViewedAt: new Date().toISOString(),
        })) || guideline;
        // Generar QR Dinámico para el Lanyard / Compartir
        let qrDataUrl = '';
        if (qrcodeModule) {
            try {
                const targetUrl = updatedGuideline.mockupMobileUrlWebsite
                    ? (updatedGuideline.mockupMobileUrlWebsite.startsWith('http') ? updatedGuideline.mockupMobileUrlWebsite : `https://${updatedGuideline.mockupMobileUrlWebsite}`)
                    : `https://romaagencia.pe/brand/${updatedGuideline.publicToken}`;
                qrDataUrl = await qrcodeModule.toDataURL(targetUrl, {
                    width: 240,
                    margin: 1,
                    color: { dark: '#FFFFFF', light: '#00000000' },
                });
            }
            catch { }
        }
        return res.json({
            success: true,
            isLocked: false,
            guideline: updatedGuideline,
            qrDataUrl,
        });
    }
    catch (error) {
        console.error('Error fetching public brand guideline:', error);
        return res.status(500).json({ error: error.message || 'Error al cargar la presentación pública' });
    }
});
// POST /api/workspace/brand-guidelines/public/:token/verify-pin
router.post('/public/:token/verify-pin', async (req, res) => {
    try {
        const token = String(req.params.token);
        const { pin } = req.body;
        const guideline = await db_1.db.getBrandGuidelineByPublicToken(token);
        if (!guideline) {
            return res.status(404).json({ error: 'Presentación no encontrada' });
        }
        if (!guideline.requirePin || !guideline.publicPin) {
            return res.json({ success: true, isValid: true, guideline });
        }
        if (!pin || pin.trim() !== guideline.publicPin.trim()) {
            return res.status(401).json({
                success: false,
                isValid: false,
                error: 'El PIN ingresado es incorrecto. Vuelve a intentarlo.',
            });
        }
        let qrDataUrl = '';
        if (qrcodeModule) {
            try {
                const targetUrl = guideline.mockupMobileUrlWebsite
                    ? (guideline.mockupMobileUrlWebsite.startsWith('http') ? guideline.mockupMobileUrlWebsite : `https://${guideline.mockupMobileUrlWebsite}`)
                    : `https://romaagencia.pe/brand/${guideline.publicToken}`;
                qrDataUrl = await qrcodeModule.toDataURL(targetUrl, {
                    width: 240,
                    margin: 1,
                    color: { dark: '#FFFFFF', light: '#00000000' },
                });
            }
            catch { }
        }
        return res.json({
            success: true,
            isValid: true,
            guideline,
            qrDataUrl,
        });
    }
    catch (error) {
        console.error('Error verifying brand pin:', error);
        return res.status(500).json({ error: error.message || 'Error al validar PIN' });
    }
});
// POST /api/workspace/brand-guidelines/public/:token/comment
router.post('/public/:token/comment', async (req, res) => {
    try {
        const token = String(req.params.token);
        const { slideId, slideTitle, authorName, text } = req.body;
        if (!text?.trim()) {
            return res.status(400).json({ error: 'El comentario no puede estar vacío' });
        }
        const guideline = await db_1.db.getBrandGuidelineByPublicToken(token);
        if (!guideline) {
            return res.status(404).json({ error: 'Presentación no encontrada' });
        }
        const newComment = {
            id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            slideId: slideId || 'general',
            slideTitle: slideTitle || 'General',
            authorName: authorName?.trim() || guideline.clientName || 'Cliente',
            text: text.trim(),
            resolved: false,
            createdAt: new Date().toISOString(),
        };
        const existingComments = guideline.comments || [];
        const updated = await db_1.db.updateBrandGuideline(guideline.id, guideline.tenantId, {
            comments: [newComment, ...existingComments],
        });
        // Disparar notificación en tiempo real a la agencia
        try {
            await (0, notificationService_1.notifyEvent)({
                tenantId: guideline.tenantId,
                title: `💬 Feedback en Brand Guideline: ${guideline.brandName}`,
                message: `${newComment.authorName} comentó en [${newComment.slideTitle}]: "${newComment.text}"`,
                type: 'info',
                module: 'workspace',
                entityId: guideline.id,
                action: 'comment',
                link: `/?module=workspace`,
                actorUserName: newComment.authorName,
            });
        }
        catch { }
        return res.json({
            success: true,
            comment: newComment,
            guideline: updated,
        });
    }
    catch (error) {
        console.error('Error posting brand guideline comment:', error);
        return res.status(500).json({ error: error.message || 'Error al registrar comentario' });
    }
});
// POST /api/workspace/brand-guidelines/public/:token/approval
router.post('/public/:token/approval', async (req, res) => {
    try {
        const token = String(req.params.token);
        const { status, approvedBy, approvalNotes } = req.body;
        if (status !== 'approved' && status !== 'changes_requested') {
            return res.status(400).json({ error: 'Estado de decisión inválido' });
        }
        const guideline = await db_1.db.getBrandGuidelineByPublicToken(token);
        if (!guideline) {
            return res.status(404).json({ error: 'Presentación no encontrada' });
        }
        const actor = approvedBy?.trim() || guideline.clientName || 'Cliente';
        const now = new Date().toISOString();
        const updated = await db_1.db.updateBrandGuideline(guideline.id, guideline.tenantId, {
            status,
            approvedBy: actor,
            approvedAt: now,
            approvalNotes: approvalNotes?.trim() || '',
        });
        // Disparar notificación en tiempo real + Web Push a la agencia
        try {
            const isApproved = status === 'approved';
            await (0, notificationService_1.notifyEvent)({
                tenantId: guideline.tenantId,
                title: isApproved
                    ? `✅ ¡Identidad Aprobada!: ${guideline.brandName}`
                    : `⚠️ Ajustes Solicitados: ${guideline.brandName}`,
                message: isApproved
                    ? `${actor} ha aprobado oficialmente el Brand Guideline (${guideline.round}). ${approvalNotes ? `Nota: "${approvalNotes}"` : ''}`
                    : `${actor} solicitó revisiones en el Brand Guideline: "${approvalNotes || 'Revisar comentarios'}"`,
                type: isApproved ? 'success' : 'warning',
                module: 'workspace',
                entityId: guideline.id,
                action: status,
                link: `/?module=workspace`,
                actorUserName: actor,
            });
        }
        catch { }
        return res.json({
            success: true,
            guideline: updated,
        });
    }
    catch (error) {
        console.error('Error updating brand guideline approval:', error);
        return res.status(500).json({ error: error.message || 'Error al procesar decisión' });
    }
});
// POST /api/workspace/brand-guidelines/public/:token/telemetry
router.post('/public/:token/telemetry', async (req, res) => {
    try {
        const token = String(req.params.token);
        const { slideId, slideTitle, seconds } = req.body;
        if (!slideId) {
            return res.status(400).json({ error: 'slideId requerido' });
        }
        const guideline = await db_1.db.getBrandGuidelineByPublicToken(token);
        if (!guideline) {
            return res.status(404).json({ error: 'Presentación no encontrada' });
        }
        const analytics = { ...(guideline.slideAnalytics || {}) };
        const prev = analytics[slideId] || {
            slideId,
            slideTitle: slideTitle || slideId,
            views: 0,
            totalSeconds: 0,
        };
        analytics[slideId] = {
            slideId,
            slideTitle: slideTitle || prev.slideTitle,
            views: prev.views + 1,
            totalSeconds: prev.totalSeconds + Math.max(1, Math.min(120, Number(seconds) || 3)),
        };
        await db_1.db.updateBrandGuideline(guideline.id, guideline.tenantId, {
            slideAnalytics: analytics,
            lastViewedAt: new Date().toISOString(),
        });
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ error: error.message || 'Error en telemetría' });
    }
});
exports.default = router;
