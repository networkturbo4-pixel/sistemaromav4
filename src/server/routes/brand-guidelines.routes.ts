import { Router, Request, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { db } from '../db';
import { BrandGuideline, BrandGuidelineComment } from '../../shared/types';
import { notifyEvent } from '../services/notificationService';

let qrcodeModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  qrcodeModule = require('qrcode');
} catch {
  // fallback
}

const router = Router();

// =============================================================================
// SEED DEFAULT: PITCH DECK INSPIRADO EN EL VIDEO (PIXELTRUCK / SWISS STYLE)
// =============================================================================
function createSampleBrandGuideline(tenantId: string): Partial<BrandGuideline> & { tenantId: string } {
  return {
    tenantId,
    clientName: 'PixelTruck Logística',
    brandName: 'PixelTruck',
    designerName: 'Equipo Creativo Roma',
    round: 'Ronda 1',
    date: 'Noviembre 2026',
    tagline: 'Plataforma Tecnológica & Logística Escalable',
    requirePin: true,
    publicPin: '1234',
    themeDefault: 'dark',
    viewModeDefault: 'deck',
    status: 'in_review',
    comments: [],
    briefOverviewTitle:
      'Resumen ejecutivo del proyecto de identidad visual, destacando el propósito, alcance y objetivos estratégicos de la marca.',
    briefOverviewText:
      'Este resumen describe el propósito y los objetivos clave de la identidad visual. Destaca los pilares de posicionamiento, modernización y proyección comercial alineados con los valores esenciales de la organización.',
    briefSecondaryText:
      'Asimismo, esta sección define el estilo visual, el carácter tipográfico y cómo el nuevo sistema gráfico se adapta con coherencia a todos los puntos de contacto físicos y digitales.',
    goals: [
      {
        id: 'g1',
        number: '01',
        title: 'Modernización Visual',
        description:
          'Actualizar la identidad visual y verbal de la marca para proyectar una imagen contemporánea, sólida y alineada con los estándares actuales del mercado.',
      },
      {
        id: 'g2',
        number: '02',
        title: 'Diferenciación Competitiva',
        description:
          'Destacar frente a la competencia mediante un posicionamiento único, memorable y con personalidad propia en cada punto de contacto.',
      },
      {
        id: 'g3',
        number: '03',
        title: 'Versatilidad y Claridad',
        description:
          'Sintetizar los elementos gráficos en un sistema limpio, escalable y fácil de aplicar tanto en soportes digitales como en impresos y merchandising.',
      },
    ],
    directionName: 'Propuesta Principal',
    directionRationale:
      'Esta propuesta sintetiza la esencia, los valores y la personalidad de la marca mediante una construcción geométrica equilibrada, garantizando máxima legibilidad y pregnancia tanto en medios digitales como impresos.',
    brandBeforeLabel: 'Identidad Anterior (2019)',
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
      { id: 'c1', name: 'Negro Obsidiana', hex: '#111111', role: 'dark', pantone: 'Black 6 C', rgb: '17, 17, 17', cmyk: '0, 0, 0, 93' },
      { id: 'c2', name: 'Gris Pizarra', hex: '#636569', role: 'secondary', pantone: 'Cool Gray 9 C', rgb: '99, 101, 105', cmyk: '6, 4, 0, 59' },
      { id: 'c3', name: 'Plata Neblina', hex: '#CACBCE', role: 'neutral', pantone: 'Cool Gray 3 C', rgb: '202, 203, 206', cmyk: '2, 1, 0, 19' },
      { id: 'c4', name: 'Lienzo Puro', hex: '#FFFFFF', role: 'light', pantone: 'Bright White', rgb: '255, 255, 255', cmyk: '0, 0, 0, 0' },
    ],
    typography: [
      {
        id: 'f1',
        role: 'headings',
        fontFamily: 'Inter',
        weight: 'Regular / SemiBold',
        sampleText: 'El veloz murciélago hindú comía feliz cardillo y kiwi',
      },
      {
        id: 'f2',
        role: 'body',
        fontFamily: 'Inter',
        weight: 'Regular',
        sampleText: 'El veloz murciélago hindú comía feliz cardillo y kiwi',
      },
    ],
    statNumber: '+100%',
    statLabel: 'Indicador clave de posicionamiento, alcance e impacto visual de la marca',
    mockupMobileUrlWebsite: 'www.pixeltruck.com',
    merchItems: [
      { id: 'm1', type: 'sweatshirt', title: 'Polera / Crewneck', variant: 'black' },
      { id: 'm2', type: 'tshirt', title: 'Camiseta Minimalista', variant: 'black' },
      { id: 'm3', type: 'hoodie', title: 'Hoodie Corporativo', variant: 'black' },
      { id: 'm4', type: 'cap', title: 'Gorra Bordada', variant: 'black' },
      { id: 'm5', type: 'totebag', title: 'Bolso Tote de Lona', variant: 'black' },
      { id: 'm6', type: 'bottle', title: 'Termo de Acero Mate', variant: 'black' },
      { id: 'm7', type: 'badge', title: 'Fotocheck & Lanyard RFID', variant: 'black' },
      { id: 'm8', type: 'laptop', title: 'Sticker Troquelado MacBook', variant: 'gray' },
    ],
    otherIdeas: [
      { id: 'oi1', title: 'Isotipo Principal / Variación 01' },
      { id: 'oi2', title: 'Monograma / Variación 02' },
      { id: 'oi3', title: 'Sello / Emblema 03' },
      { id: 'oi4', title: 'Icono App / Favicon 04' },
      { id: 'oi5', title: 'Símbolo Simplificado 05' },
      { id: 'oi6', title: 'Marca de Agua / Símbolo 06' },
    ],
    nextSteps: [
      {
        id: 'ns1',
        step: '01',
        title: 'Revisión y Comentarios',
        description: 'Comparte tus apreciaciones sobre la propuesta de identidad visual y si deseas algún ajuste puntual.',
      },
      {
        id: 'ns2',
        step: '02',
        title: 'Ajustes y Refinamiento (si aplica)',
        description: 'Afinaremos los detalles gráficos y cromáticos en base a tus comentarios y prioridades.',
      },
      {
        id: 'ns3',
        step: '03',
        title: 'Aprobación Oficial',
        description: 'Una vez aprobada la propuesta, prepararemos el paquete maestro de vectores y artes finales.',
      },
      {
        id: 'ns4',
        step: '04',
        title: 'Entrega de Archivos Editables',
        description: 'Recibirás todos los formatos oficiales para impresión, redes sociales, web y manual de marca.',
      },
    ],
  };
}

// =============================================================================
// RUTAS PRIVADAS (WORKSPACE / ADMIN)
// =============================================================================

const seededTenants = new Set<string>();

// GET /api/workspace/brand-guidelines
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }

    const search = req.query.q as string | undefined;
    let list = await db.getBrandGuidelines(tenantId, search);

    // Solo crear la guía demo la primera vez si nunca se ha inicializado en esta sesión y no hay búsqueda
    if (list.length === 0 && !search && !seededTenants.has(tenantId)) {
      seededTenants.add(tenantId);
      const sample = createSampleBrandGuideline(tenantId);
      const created = await db.createBrandGuideline(sample);
      list = [created];
    } else {
      seededTenants.add(tenantId);
    }

    return res.json({ success: true, guidelines: list });
  } catch (error: any) {
    console.error('Error fetching brand guidelines:', error);
    return res.status(500).json({ error: error.message || 'Error al obtener brand guidelines' });
  }
});

// GET /api/workspace/brand-guidelines/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const id = String(req.params.id);
    const guideline = await db.getBrandGuidelineById(id, tenantId);
    if (!guideline) {
      return res.status(404).json({ error: 'Brand guideline no encontrado' });
    }
    return res.json({ success: true, guideline });
  } catch (error: any) {
    console.error('Error fetching brand guideline:', error);
    return res.status(500).json({ error: error.message || 'Error al obtener brand guideline' });
  }
});

// POST /api/workspace/brand-guidelines
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }

    const { brandName } = req.body;
    if (!brandName?.trim()) {
      return res.status(400).json({ error: 'El nombre de la marca es requerido' });
    }

    const newGuideline = await db.createBrandGuideline({
      ...req.body,
      tenantId,
      brandName: brandName.trim(),
      clientName: req.body.clientName?.trim() || 'Cliente',
      designerName: req.body.designerName?.trim() || '',
      round: req.body.round?.trim() || 'Ronda 1',
      requirePin: Boolean(req.body.requirePin),
      publicPin: req.body.publicPin ? String(req.body.publicPin).trim() : '',
      themeDefault: req.body.themeDefault === 'light' ? 'light' : 'dark',
      viewModeDefault: req.body.viewModeDefault === 'grid' ? 'grid' : 'deck',
    });

    return res.status(201).json({ success: true, guideline: newGuideline });
  } catch (error: any) {
    console.error('Error creating brand guideline:', error);
    return res.status(500).json({ error: error.message || 'Error al crear brand guideline' });
  }
});

// PUT /api/workspace/brand-guidelines/:id
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const id = String(req.params.id);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }

    const updated = await db.updateBrandGuideline(id, tenantId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Brand guideline no encontrado' });
    }

    return res.json({ success: true, guideline: updated });
  } catch (error: any) {
    console.error('Error updating brand guideline:', error);
    return res.status(500).json({ error: error.message || 'Error al actualizar brand guideline' });
  }
});

// DELETE /api/workspace/brand-guidelines/:id
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const id = String(req.params.id);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }

    const deleted = await db.deleteBrandGuideline(id, tenantId);
    if (!deleted) {
      return res.status(404).json({ error: 'Brand guideline no encontrado' });
    }

    return res.json({ success: true, message: 'Brand guideline eliminado exitosamente' });
  } catch (error: any) {
    console.error('Error deleting brand guideline:', error);
    return res.status(500).json({ error: error.message || 'Error al eliminar brand guideline' });
  }
});

// POST /api/workspace/brand-guidelines/:id/new-round
router.post('/:id/new-round', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth?.tenant?.id;
    const id = String(req.params.id);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant no especificado' });
    }

    const existing = await db.getBrandGuidelineById(id, tenantId);
    if (!existing) {
      return res.status(404).json({ error: 'Brand guideline no encontrado' });
    }

    const currentRound = existing.round || 'Ronda 1';
    const matchNum = currentRound.match(/(\d+)/);
    const nextRoundName =
      req.body?.roundName?.trim() ||
      (matchNum ? `Ronda ${parseInt(matchNum[1], 10) + 1}` : 'Versión Final');

    const snapshot = {
      id: `rnd_${Date.now()}`,
      round: currentRound,
      savedAt: new Date().toISOString(),
      note: req.body?.note || `Snapshot automático de ${currentRound}`,
      logoPrimaryUrl: existing.logoPrimaryUrl,
      colors: existing.colors,
    };

    const updated = await db.updateBrandGuideline(id, tenantId, {
      round: nextRoundName,
      status: 'in_review',
      roundHistory: [snapshot, ...(existing.roundHistory || [])],
    });

    return res.json({ success: true, guideline: updated });
  } catch (error: any) {
    console.error('Error advancing brand round:', error);
    return res.status(500).json({ error: error.message || 'Error al crear nueva ronda' });
  }
});

// =============================================================================
// RUTAS PÚBLICAS (CLIENTES / ESPECTADORES)
// =============================================================================

// GET /api/workspace/brand-guidelines/public/:token
router.get('/public/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const guideline = await db.getBrandGuidelineByPublicToken(token);

    if (!guideline) {
      return res.status(404).json({ error: 'Manual o presentación no encontrada' });
    }

    // Si tiene protección por PIN
    if (guideline.requirePin && guideline.publicPin) {
      const providedPin = (req.query.pin as string) || (req.headers['x-brand-pin'] as string);

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
    const updatedGuideline =
      (await db.updateBrandGuideline(guideline.id, guideline.tenantId, {
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
      } catch {}
    }

    return res.json({
      success: true,
      isLocked: false,
      guideline: updatedGuideline,
      qrDataUrl,
    });
  } catch (error: any) {
    console.error('Error fetching public brand guideline:', error);
    return res.status(500).json({ error: error.message || 'Error al cargar la presentación pública' });
  }
});

// POST /api/workspace/brand-guidelines/public/:token/verify-pin
router.post('/public/:token/verify-pin', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const { pin } = req.body;

    const guideline = await db.getBrandGuidelineByPublicToken(token);
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
      } catch {}
    }

    return res.json({
      success: true,
      isValid: true,
      guideline,
      qrDataUrl,
    });
  } catch (error: any) {
    console.error('Error verifying brand pin:', error);
    return res.status(500).json({ error: error.message || 'Error al validar PIN' });
  }
});

// POST /api/workspace/brand-guidelines/public/:token/comment
router.post('/public/:token/comment', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const { slideId, slideTitle, authorName, text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: 'El comentario no puede estar vacío' });
    }

    const guideline = await db.getBrandGuidelineByPublicToken(token);
    if (!guideline) {
      return res.status(404).json({ error: 'Presentación no encontrada' });
    }

    const newComment: BrandGuidelineComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      slideId: slideId || 'general',
      slideTitle: slideTitle || 'General',
      authorName: authorName?.trim() || guideline.clientName || 'Cliente',
      text: text.trim(),
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    const existingComments = guideline.comments || [];
    const updated = await db.updateBrandGuideline(guideline.id, guideline.tenantId, {
      comments: [newComment, ...existingComments],
    });

    // Disparar notificación en tiempo real a la agencia
    try {
      await notifyEvent({
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
    } catch {}

    return res.json({
      success: true,
      comment: newComment,
      guideline: updated,
    });
  } catch (error: any) {
    console.error('Error posting brand guideline comment:', error);
    return res.status(500).json({ error: error.message || 'Error al registrar comentario' });
  }
});

// POST /api/workspace/brand-guidelines/public/:token/approval
router.post('/public/:token/approval', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const { status, approvedBy, approvalNotes } = req.body;

    if (status !== 'approved' && status !== 'changes_requested') {
      return res.status(400).json({ error: 'Estado de decisión inválido' });
    }

    const guideline = await db.getBrandGuidelineByPublicToken(token);
    if (!guideline) {
      return res.status(404).json({ error: 'Presentación no encontrada' });
    }

    const actor = approvedBy?.trim() || guideline.clientName || 'Cliente';
    const now = new Date().toISOString();

    const updated = await db.updateBrandGuideline(guideline.id, guideline.tenantId, {
      status,
      approvedBy: actor,
      approvedAt: now,
      approvalNotes: approvalNotes?.trim() || '',
    });

    // Disparar notificación en tiempo real + Web Push a la agencia
    try {
      const isApproved = status === 'approved';
      await notifyEvent({
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
    } catch {}

    return res.json({
      success: true,
      guideline: updated,
    });
  } catch (error: any) {
    console.error('Error updating brand guideline approval:', error);
    return res.status(500).json({ error: error.message || 'Error al procesar decisión' });
  }
});

// POST /api/workspace/brand-guidelines/public/:token/telemetry
router.post('/public/:token/telemetry', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const { slideId, slideTitle, seconds } = req.body;
    if (!slideId) {
      return res.status(400).json({ error: 'slideId requerido' });
    }

    const guideline = await db.getBrandGuidelineByPublicToken(token);
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

    await db.updateBrandGuideline(guideline.id, guideline.tenantId, {
      slideAnalytics: analytics,
      lastViewedAt: new Date().toISOString(),
    });

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error en telemetría' });
  }
});

export default router;
