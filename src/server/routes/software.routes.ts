import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { db } from '../db';
import {
  SoftwareProject,
  SoftwareMilestone,
  SoftwareWorkItem,
  SoftwareMilestoneComment,
  SoftwareCustomTemplate,
  SoftwareChangeRequest,
  SoftwareDeliverableItem,
  SoftwareMilestoneDateChange,
  SoftwareSprint,
  SoftwareTestCase,
  SoftwareRelease,
  SoftwareVaultCredential,
  SoftwareAuditEntry,
  SoftwareHealthCheckResult,
} from '../../shared/types';
import { notifyEvent } from '../services/notificationService';

let qrcodeModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  qrcodeModule = require('qrcode');
} catch {
  // fallback sin QR
}

const router = Router();

// Cifrado AES-256-GCM para Bóveda de Credenciales
const VAULT_KEY = crypto
  .createHash('sha256')
  .update(process.env.JWT_SECRET || process.env.SESSION_SECRET || 'roma-software-vault-v4-key')
  .digest();

function encryptVaultSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', VAULT_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptVaultSecret(payload: string): string {
  const parts = String(payload || '').split(':');
  if (parts.length !== 3) return '';
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const data = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', VAULT_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

function appendAudit(
  project: SoftwareProject,
  action: string,
  summary: string,
  actorName: string
): SoftwareAuditEntry[] {
  const entry: SoftwareAuditEntry = {
    id: `aud_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    action,
    summary,
    actorName,
    createdAt: new Date().toISOString(),
  };
  return [entry, ...(project.auditLog || [])].slice(0, 200);
}

async function pingUrlHealth(url: string): Promise<SoftwareHealthCheckResult> {
  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const resp = await fetch(url, { method: 'GET', signal: ctrl.signal });
    clearTimeout(timer);
    return {
      url,
      ok: resp.ok,
      statusCode: resp.status,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      url,
      ok: false,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      error: err?.name === 'AbortError' ? 'Timeout (>7s)' : err?.message || 'Error de conexión',
    };
  }
}

function sanitizeProjectForClient(project: SoftwareProject) {
  const visibleMilestones = (project.milestones || []).filter((m) => m.isVisibleToClient !== false);
  const visibleMilestoneIds = new Set(visibleMilestones.map((m) => m.id));
  const clientWorkItems = (project.workItems || []).filter(
    (w) => visibleMilestoneIds.has(w.milestoneId)
  );

  return {
    id: project.id,
    code: project.code,
    name: project.name,
    description: project.description,
    projectType: project.projectType,
    status: project.status,
    clientName: project.clientName,
    brandName: project.brandName,
    techLeadName: project.techLeadName,
    techStack: project.techStack || [],
    environments: {
      figmaUrl: project.environments?.figmaUrl || '',
      stagingUrl: project.environments?.stagingUrl || '',
      productionUrl: project.environments?.productionUrl || '',
      docsUrl: project.environments?.docsUrl || '',
    },
    startDate: project.startDate,
    targetEndDate: project.targetEndDate,
    totalProgress: project.totalProgress,
    milestones: visibleMilestones,
    workItemsSummary: visibleMilestones.reduce<
      Record<string, { total: number; done: number; bugsOpen: number }>
    >((acc, m) => {
      const mItems = clientWorkItems.filter((w) => w.milestoneId === m.id);
      acc[m.id] = {
        total: mItems.length,
        done: mItems.filter((w) => w.status === 'done').length,
        bugsOpen: mItems.filter((w) => w.type === 'bug' && w.status !== 'done').length,
      };
      return acc;
    }, {}),
    publicToken: project.publicToken,
    allowClientComments: project.allowClientComments !== false,
    allowClientBugReport: project.allowClientBugReport !== false,
    viewsCount: project.viewsCount || 0,
    updatedAt: project.updatedAt,
  };
}

function checkPublicPin(project: SoftwareProject, req: Request): boolean {
  if (!project.requirePin || !project.publicPin) return true;
  const providedPin =
    (req.query.pin as string) ||
    (req.headers['x-software-pin'] as string) ||
    (req.body?.pin as string) ||
    '';
  return providedPin.trim() === project.publicPin.trim();
}

// =============================================================================
// RUTAS PÃšBLICAS (CLIENTES / ESPECTADORES: /api/workspace/software/public/:token)
// =============================================================================

router.get('/public/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const project = await db.getSoftwareProjectByPublicToken(token);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Proyecto de software no encontrado o enlace vencido.' });
    }

    const tenant = await db.getTenantById(project.tenantId);

    if (!checkPublicPin(project, req)) {
      return res.json({
        success: true,
        isLocked: true,
        requirePin: true,
        meta: {
          name: project.name,
          code: project.code,
          clientName: project.clientName,
          brandName: project.brandName,
          status: project.status,
          totalProgress: project.totalProgress,
        },
        tenant: tenant
          ? {
              name: tenant.companyInfo?.commercialName || tenant.name,
              logoLightUrl: tenant.customization?.logoLightUrl || '',
              logoDarkUrl: tenant.customization?.logoDarkUrl || '',
              whatsapp: tenant.companyInfo?.whatsapp || '',
            }
          : null,
      });
    }

    const updated =
      (await db.updateSoftwareProject(project.id, project.tenantId, {
        viewsCount: (project.viewsCount || 0) + 1,
        lastViewedAt: new Date().toISOString(),
      })) || project;

    let qrDataUrl = '';
    if (qrcodeModule) {
      try {
        const host = req.get('x-forwarded-host') || req.get('host') || 'theromaagency.com';
        const proto = req.get('x-forwarded-proto') || 'https';
        const shareUrl = `${proto}://${host}/dev/${updated.publicToken}`;
        qrDataUrl = await qrcodeModule.toDataURL(shareUrl, {
          width: 240,
          margin: 1,
        });
      } catch {
        // omitir si falla
      }
    }

    return res.json({
      success: true,
      isLocked: false,
      project: sanitizeProjectForClient(updated),
      qrDataUrl,
      tenant: tenant
        ? {
            name: tenant.companyInfo?.commercialName || tenant.name,
            logoLightUrl: tenant.customization?.logoLightUrl || '',
            logoDarkUrl: tenant.customization?.logoDarkUrl || '',
            whatsapp: tenant.companyInfo?.whatsapp || '',
            primaryColor: tenant.customization?.lightPalette?.primary || '#6366f1',
          }
        : null,
    });
  } catch (err: any) {
    console.error('[Software Public GET] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error al cargar proyecto público' });
  }
});

// POST /api/workspace/software/public/:token/milestones/:milestoneId/review
router.post('/public/:token/milestones/:milestoneId/review', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const milestoneId = String(req.params.milestoneId);
    const project = await db.getSoftwareProjectByPublicToken(token);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Proyecto no encontrado.' });
    }
    if (!checkPublicPin(project, req)) {
      return res.status(403).json({ success: false, error: 'PIN inválido o requerido.' });
    }

    const decision: 'approved' | 'changes_requested' =
      req.body?.decision === 'changes_requested' ? 'changes_requested' : 'approved';
    const decidedBy = String(req.body?.decidedBy || project.clientName || 'Cliente').trim();
    const notes = String(req.body?.notes || '').trim();
    const now = new Date().toISOString();

    let targetMilestoneTitle = '';
    const updatedMilestones: SoftwareMilestone[] = project.milestones.map((m) => {
      if (m.id !== milestoneId) return m;
      targetMilestoneTitle = m.title;
      const newComments: SoftwareMilestoneComment[] = notes
        ? [
            ...(m.comments || []),
            {
              id: `swc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
              authorName: decidedBy,
              authorRole: 'client',
              text:
                decision === 'approved'
                  ? `âœ… Hito aprobado oficialmente: ${notes}`
                  : `ðŸ› ï¸ Solicitud de ajustes: ${notes}`,
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
          decidedBy,
          decidedAt: now,
          notes,
        },
        comments: newComments,
      };
    });

    if (!targetMilestoneTitle) {
      return res.status(404).json({ success: false, error: 'Hito no encontrado.' });
    }

    const updated = await db.updateSoftwareProject(project.id, project.tenantId, {
      milestones: updatedMilestones,
    });

    notifyEvent({
      tenantId: project.tenantId,
      title:
        decision === 'approved'
          ? `âœ… Hito aprobado: ${targetMilestoneTitle}`
          : `ðŸ› ï¸ Ajustes solicitados en ${targetMilestoneTitle}`,
      message: `${decidedBy} ${
        decision === 'approved' ? 'aprobó oficialmente' : 'solicitó cambios en'
      } el hito "${targetMilestoneTitle}" del proyecto ${project.name}.${notes ? ` Nota: ${notes}` : ''}`,
      type: decision === 'approved' ? 'success' : 'warning',
      module: 'workspace',
      entityId: project.id,
      action: decision === 'approved' ? 'milestone_approved' : 'milestone_changes_requested',
      actorUserName: decidedBy,
    }).catch(() => {});

    return res.json({
      success: true,
      project: updated ? sanitizeProjectForClient(updated) : null,
    });
  } catch (err: any) {
    console.error('[Software Public Review] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error al registrar revisión' });
  }
});

// POST /api/workspace/software/public/:token/milestones/:milestoneId/comment
router.post('/public/:token/milestones/:milestoneId/comment', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const milestoneId = String(req.params.milestoneId);
    const project = await db.getSoftwareProjectByPublicToken(token);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Proyecto no encontrado.' });
    }
    if (!checkPublicPin(project, req)) {
      return res.status(403).json({ success: false, error: 'PIN inválido o requerido.' });
    }

    const isBugReport = Boolean(req.body?.isBugReport);
    if (isBugReport && project.allowClientBugReport === false) {
      return res.status(403).json({ success: false, error: 'El reporte de observaciones QA está deshabilitado.' });
    }
    if (!isBugReport && project.allowClientComments === false) {
      return res.status(403).json({ success: false, error: 'Los comentarios están deshabilitados en este enlace.' });
    }

    const authorName = String(req.body?.authorName || project.clientName || 'Cliente').trim();
    const text = String(req.body?.text || '').trim();
    const attachmentUrl = String(req.body?.attachmentUrl || '').trim();
    const bugSeverity = (req.body?.severity as any) || 'major';

    if (!text) {
      return res.status(400).json({ success: false, error: 'El mensaje es obligatorio.' });
    }

    const targetMilestone = project.milestones.find((m) => m.id === milestoneId);
    if (!targetMilestone) {
      return res.status(404).json({ success: false, error: 'Hito no encontrado.' });
    }

    const now = new Date().toISOString();
    const newComment: SoftwareMilestoneComment = {
      id: `swc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      authorName,
      authorRole: 'client',
      text: isBugReport ? `ðŸž [Reporte QA Cliente] ${text}` : text,
      attachmentUrl: attachmentUrl || undefined,
      createdAt: now,
    };

    const updatedMilestones = project.milestones.map((m) =>
      m.id === milestoneId ? { ...m, comments: [...(m.comments || []), newComment] } : m
    );

    let updatedWorkItems = [...(project.workItems || [])];
    if (isBugReport) {
      const bugCount = updatedWorkItems.filter((w) => w.type === 'bug').length + 1;
      const newBug: SoftwareWorkItem = {
        id: `swi_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        milestoneId,
        code: `BUG-${String(bugCount).padStart(2, '0')}`,
        type: 'bug',
        title: text.length > 85 ? `${text.slice(0, 82)}...` : text,
        description: text,
        status: 'todo',
        priority: bugSeverity === 'critical' ? 'urgent' : bugSeverity === 'major' ? 'high' : 'medium',
        severity: ['critical', 'major', 'minor', 'cosmetic'].includes(bugSeverity) ? bugSeverity : 'major',
        stepsToReproduce: String(req.body?.stepsToReproduce || '').trim(),
        acceptanceCriteria: [],
        evidenceUrl: attachmentUrl || undefined,
        reportedByClient: true,
        createdAt: now,
        updatedAt: now,
      };
      updatedWorkItems = [newBug, ...updatedWorkItems];
    }

    const updated = await db.updateSoftwareProject(project.id, project.tenantId, {
      milestones: updatedMilestones,
      workItems: updatedWorkItems,
    });

    notifyEvent({
      tenantId: project.tenantId,
      title: isBugReport
        ? `ðŸž Bug UAT reportado por cliente en ${project.name}`
        : `ðŸ’¬ Nuevo comentario en ${targetMilestone.title}`,
      message: `${authorName}: "${text.slice(0, 140)}"`,
      type: isBugReport ? 'alert' : 'info',
      module: 'workspace',
      entityId: project.id,
      action: isBugReport ? 'client_bug_reported' : 'client_milestone_comment',
      actorUserName: authorName,
    }).catch(() => {});

    return res.json({
      success: true,
      project: updated ? sanitizeProjectForClient(updated) : null,
      comment: newComment,
    });
  } catch (err: any) {
    console.error('[Software Public Comment] Error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error al publicar comentario' });
  }
});

// =============================================================================
// RUTAS PRIVADAS (WORKSPACE OPERATIVO AUTENTICADO)
// =============================================================================

// GET /api/workspace/software
router.get(
  '/',
  requireAuth,
  requirePermission('workspace.software.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const projects = await db.getSoftwareProjects(tenantId, {
        search: req.query.q as string | undefined,
        status: req.query.status as string | undefined,
        projectType: req.query.projectType as string | undefined,
        clientId: req.query.clientId as string | undefined,
      });
      // En el listado, omitir dataUrl pesados de capturas/videos para respuesta instantánea
      const leanProjects = projects.map((p) => ({
        ...p,
        workItems: (p.workItems || []).map((w) =>
          w.bugMedia && w.bugMedia.length > 0
            ? {
                ...w,
                bugMedia: w.bugMedia.map((m) => ({
                  ...m,
                  dataUrl: m.dataUrl?.length > 10000 ? '' : m.dataUrl,
                })),
              }
            : w
        ),
      }));
      return res.json({ success: true, projects: leanProjects });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al obtener proyectos de software' });
    }
  }
);

// =============================================================================
// PLANTILLAS PERSONALIZADAS DE SOFTWARE (POR TENANT)
// =============================================================================

// GET /api/workspace/software/templates
router.get(
  '/templates',
  requireAuth,
  requirePermission('workspace.software.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const templates = await db.getSoftwareTemplates(tenantId);
      return res.json({ success: true, templates });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al obtener plantillas personalizadas' });
    }
  }
);

// POST /api/workspace/software/templates
router.post(
  '/templates',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const sourceProjectId = req.body?.sourceProjectId ? String(req.body.sourceProjectId) : '';
      let name = String(req.body?.name || '').trim();
      let description = String(req.body?.description || '').trim();
      let projectType = req.body?.projectType || 'custom_saas';
      let defaultStack: string[] = Array.isArray(req.body?.defaultStack) ? req.body.defaultStack : [];
      let milestones: SoftwareCustomTemplate['milestones'] = Array.isArray(req.body?.milestones)
        ? req.body.milestones
        : [];

      if (sourceProjectId) {
        const source = await db.getSoftwareProjectById(sourceProjectId, tenantId);
        if (!source) return res.status(404).json({ error: 'Proyecto origen no encontrado' });
        if (!name) name = `Plantilla: ${source.name}`;
        if (!description) description = source.description || `Basada en ${source.code}`;
        projectType = source.projectType;
        defaultStack = source.techStack || [];
        milestones = source.milestones.map((m) => {
          const s = new Date(`${m.startDate}T12:00:00`).getTime();
          const e = new Date(`${m.dueDate}T12:00:00`).getTime();
          const durationDays =
            Number.isFinite(s) && Number.isFinite(e) && e > s
              ? Math.max(1, Math.round((e - s) / 86400000))
              : 7;
          return {
            title: m.title,
            description: m.description || '',
            deliverables: (m.deliverableItems || []).map((d) => d.title),
            weightPercent: m.weightPercent || 20,
            durationDays,
            phaseTag: m.phaseTag,
            phaseColor: m.phaseColor,
            isRecurringSla: m.isRecurringSla,
            slaMonthlyHours: m.slaMonthlyHours,
          };
        });
      }

      if (!name) {
        return res.status(400).json({ error: 'El nombre de la plantilla es obligatorio.' });
      }

      const tpl: SoftwareCustomTemplate = {
        id: `swtpl_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        tenantId,
        name,
        description,
        projectType,
        defaultStack,
        milestones,
        createdBy: req.auth!.user.name,
        createdAt: new Date().toISOString(),
      };

      const created = await db.createSoftwareTemplate(tpl);
      return res.status(201).json({ success: true, template: created });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al guardar plantilla' });
    }
  }
);

// DELETE /api/workspace/software/templates/:templateId
router.delete(
  '/templates/:templateId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const deleted = await db.deleteSoftwareTemplate(String(req.params.templateId), tenantId);
      if (!deleted) return res.status(404).json({ error: 'Plantilla no encontrada' });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al eliminar plantilla' });
    }
  }
);

// GET /api/workspace/software/:id
router.get(
  '/:id',
  requireAuth,
  requirePermission('workspace.software.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) {
        return res.status(404).json({ error: 'Proyecto de software no encontrado' });
      }
      return res.json({ success: true, project });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al obtener el proyecto' });
    }
  }
);

// POST /api/workspace/software
router.post(
  '/',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      if (!req.body?.name?.trim()) {
        return res.status(400).json({ error: 'El nombre del proyecto es obligatorio.' });
      }
      const created = await db.createSoftwareProject({
        ...req.body,
        tenantId,
      });

      notifyEvent({
        tenantId,
        title: `ðŸ’» Nuevo proyecto de software: ${created.name}`,
        message: `${req.auth!.user.name} creó el proyecto ${created.code} para ${created.clientName} con ${created.milestones.length} hito(s).`,
        type: 'info',
        module: 'workspace',
        entityId: created.id,
        action: 'software_project_created',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      return res.status(201).json({ success: true, project: created });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al crear proyecto de software' });
    }
  }
);

// PUT /api/workspace/software/:id
router.put(
  '/:id',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const updated = await db.updateSoftwareProject(String(req.params.id), tenantId, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Proyecto de software no encontrado' });
      }
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al actualizar proyecto' });
    }
  }
);

// POST /api/workspace/software/:id/clone
router.post(
  '/:id/clone',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const source = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!source) return res.status(404).json({ error: 'Proyecto origen no encontrado' });

      const newStartDate = String(req.body?.startDate || new Date().toISOString().slice(0, 10));
      const newName = String(req.body?.name || `${source.name} (Copia)`).trim();

      const oldOriginMs = new Date(`${source.startDate || newStartDate}T12:00:00`).getTime();
      const newOriginMs = new Date(`${newStartDate}T12:00:00`).getTime();
      const shiftMs =
        Number.isFinite(oldOriginMs) && Number.isFinite(newOriginMs) ? newOriginMs - oldOriginMs : 0;

      const shiftIso = (iso?: string): string => {
        if (!iso) return newStartDate;
        const t = new Date(`${iso}T12:00:00`).getTime();
        if (!Number.isFinite(t)) return newStartDate;
        return new Date(t + shiftMs).toISOString().slice(0, 10);
      };

      const idMap = new Map<string, string>();
      source.milestones.forEach((m) => {
        idMap.set(m.id, `swm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`);
      });

      const clonedMilestones: SoftwareMilestone[] = source.milestones.map((m, idx) => {
        const newId = idMap.get(m.id)!;
        const sDate = shiftIso(m.startDate);
        const dDate = shiftIso(m.dueDate);
        const delItems: SoftwareDeliverableItem[] = (m.deliverableItems || []).map((d, dIdx) => ({
          id: `del_${newId}_${dIdx}`,
          title: d.title,
          completed: false,
        }));
        return {
          id: newId,
          orderIndex: idx,
          code: `H${idx + 1}`,
          title: m.title,
          description: m.description,
          deliverables: delItems.map((d) => d.title),
          deliverableItems: delItems,
          startDate: sDate,
          dueDate: dDate,
          baselineStartDate: sDate,
          baselineDueDate: dDate,
          dateHistory: [],
          dependsOnMilestoneIds: (m.dependsOnMilestoneIds || [])
            .map((oldDep) => idMap.get(oldDep))
            .filter(Boolean) as string[],
          phaseTag: m.phaseTag,
          phaseColor: m.phaseColor,
          isRecurringSla: m.isRecurringSla,
          slaMonthlyHours: m.slaMonthlyHours,
          slaUsedHours: 0,
          slaPeriodLabel: m.slaPeriodLabel,
          weightPercent: m.weightPercent,
          progress: 0,
          autoCalculateProgress: m.autoCalculateProgress !== false,
          status: 'pending',
          demoUrl: '',
          attachments: [],
          isVisibleToClient: m.isVisibleToClient !== false,
          clientApproval: { status: 'pending' },
          comments: [],
        };
      });

      const now = new Date().toISOString();
      const clonedWorkItems: SoftwareWorkItem[] = (source.workItems || [])
        .filter((w) => w.type !== 'bug')
        .map((w) => ({
          ...w,
          id: `swi_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          milestoneId: idMap.get(w.milestoneId) || clonedMilestones[0]?.id || '',
          status: 'todo',
          loggedHours: 0,
          dueDate: w.dueDate ? shiftIso(w.dueDate) : '',
          acceptanceCriteria: (w.acceptanceCriteria || []).map((c) => ({
            ...c,
            id: `ac_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
            completed: false,
          })),
          reportedByClient: false,
          createdAt: now,
          updatedAt: now,
        }));

      const created = await db.createSoftwareProject({
        tenantId,
        name: newName,
        description: source.description,
        projectType: source.projectType,
        status: 'planning',
        clientId: source.clientId,
        clientName: source.clientName,
        brandId: source.brandId,
        brandName: source.brandName,
        techLeadId: source.techLeadId,
        techLeadName: source.techLeadName,
        assignedUsers: source.assignedUsers,
        techStack: [...(source.techStack || [])],
        environments: {},
        startDate: newStartDate,
        targetEndDate: shiftIso(source.targetEndDate),
        milestones: clonedMilestones,
        workItems: clonedWorkItems,
        changeRequests: [],
      });

      return res.status(201).json({ success: true, project: created });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al clonar proyecto' });
    }
  }
);

// DELETE /api/workspace/software/:id
router.delete(
  '/:id',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const deleted = await db.deleteSoftwareProject(String(req.params.id), tenantId);
      if (!deleted) {
        return res.status(404).json({ error: 'Proyecto de software no encontrado' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al eliminar proyecto' });
    }
  }
);

// =============================================================================
// OPERACIONES ATÃ“MICAS DE HITOS DINÃMICOS
// =============================================================================

// POST /api/workspace/software/:id/milestones
router.post(
  '/:id/milestones',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const nextIndex = project.milestones.length;
      const today = new Date().toISOString().slice(0, 10);
      const rawDeliverables: string[] = Array.isArray(req.body?.deliverables) ? req.body.deliverables : [];
      const newId = `swm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const deliverableItems: SoftwareDeliverableItem[] = Array.isArray(req.body?.deliverableItems)
        ? req.body.deliverableItems
        : rawDeliverables.map((title, idx) => ({
            id: `del_${newId}_${idx}`,
            title,
            completed: false,
          }));
      const sDate = req.body?.startDate || project.startDate || today;
      const dDate = req.body?.dueDate || project.targetEndDate || today;

      const newMilestone: SoftwareMilestone = {
        id: newId,
        orderIndex: nextIndex,
        code: req.body?.code?.trim() || `H${nextIndex + 1}`,
        title: req.body?.title?.trim() || `Hito ${nextIndex + 1}`,
        description: req.body?.description || '',
        deliverables: deliverableItems.map((d) => d.title),
        deliverableItems,
        startDate: sDate,
        dueDate: dDate,
        baselineStartDate: sDate,
        baselineDueDate: dDate,
        dateHistory: [],
        dependsOnMilestoneIds: Array.isArray(req.body?.dependsOnMilestoneIds) ? req.body.dependsOnMilestoneIds : [],
        phaseTag: req.body?.phaseTag || '',
        phaseColor: req.body?.phaseColor || '',
        isRecurringSla: Boolean(req.body?.isRecurringSla),
        slaMonthlyHours: req.body?.slaMonthlyHours !== undefined ? Number(req.body.slaMonthlyHours) : undefined,
        slaUsedHours: req.body?.slaUsedHours !== undefined ? Number(req.body.slaUsedHours) : 0,
        slaPeriodLabel: req.body?.slaPeriodLabel || '',
        weightPercent: Number(req.body?.weightPercent) || 20,
        progress: Number(req.body?.progress) || 0,
        autoCalculateProgress: req.body?.autoCalculateProgress !== false,
        status: req.body?.status || 'pending',
        demoUrl: req.body?.demoUrl || '',
        attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : [],
        isVisibleToClient: req.body?.isVisibleToClient !== false,
        clientApproval: { status: 'pending' },
        comments: [],
      };

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        milestones: [...project.milestones, newMilestone],
      });
      return res.status(201).json({ success: true, project: updated, milestone: newMilestone });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al crear hito' });
    }
  }
);

// PUT /api/workspace/software/:id/milestones-reorder
router.put(
  '/:id/milestones-reorder',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const orderedIds: string[] = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
      const byId = new Map(project.milestones.map((m) => [m.id, m]));
      const reordered: SoftwareMilestone[] = [];

      orderedIds.forEach((mId) => {
        const found = byId.get(mId);
        if (found) {
          reordered.push(found);
          byId.delete(mId);
        }
      });
      byId.forEach((remaining) => reordered.push(remaining));

      const normalized = reordered.map((m, idx) => ({
        ...m,
        orderIndex: idx,
        code: `H${idx + 1}`,
      }));

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        milestones: normalized,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al reordenar hitos' });
    }
  }
);

// PUT /api/workspace/software/:id/milestones-normalize-weights
router.put(
  '/:id/milestones-normalize-weights',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const count = project.milestones.length;
      if (count === 0) return res.json({ success: true, project });

      const sum = project.milestones.reduce((acc, m) => acc + Math.max(0, Number(m.weightPercent) || 0), 0);
      let remaining = 100;
      const normalized = project.milestones.map((m, idx) => {
        if (idx === count - 1) {
          return { ...m, weightPercent: Math.max(1, remaining) };
        }
        const raw = sum > 0 ? Math.round(((Math.max(0, Number(m.weightPercent) || 0) / sum) * 100)) : Math.floor(100 / count);
        const w = Math.max(1, Math.min(raw, remaining - (count - 1 - idx)));
        remaining -= w;
        return { ...m, weightPercent: w };
      });

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        milestones: normalized,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al normalizar pesos' });
    }
  }
);

// PUT /api/workspace/software/:id/milestones/:milestoneId
router.put(
  '/:id/milestones/:milestoneId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const milestoneId = String(req.params.milestoneId);
      const exists = project.milestones.some((m) => m.id === milestoneId);
      if (!exists) return res.status(404).json({ error: 'Hito no encontrado' });

      const { dateChangeReason, ...payload } = req.body || {};

      // Bloqueo configurable de cierre de hito si existen bugs Críticos abiertos
      if (payload?.status === 'approved' && project.blockMilestoneCloseOnCriticalBugs) {
        const criticalOpen = (project.workItems || []).filter(
          (w) =>
            w.milestoneId === milestoneId &&
            w.type === 'bug' &&
            w.severity === 'critical' &&
            w.status !== 'done'
        );
        if (criticalOpen.length > 0) {
          return res.status(400).json({
            error: `No se puede aprobar este hito: existen ${criticalOpen.length} bug(s) de severidad Crítica aún abiertos (${criticalOpen
              .map((b) => b.code)
              .join(', ')}).`,
          });
        }
      }

      const updatedMilestones = project.milestones.map((m) => {
        if (m.id !== milestoneId) return m;

        const nextStart = payload.startDate !== undefined ? payload.startDate : m.startDate;
        const nextDue = payload.dueDate !== undefined ? payload.dueDate : m.dueDate;
        let dateHistory = Array.isArray(m.dateHistory) ? [...m.dateHistory] : [];

        if (nextStart !== m.startDate || nextDue !== m.dueDate) {
          const entry: SoftwareMilestoneDateChange = {
            id: `dh_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
            previousStartDate: m.startDate,
            previousDueDate: m.dueDate,
            newStartDate: nextStart,
            newDueDate: nextDue,
            reason: String(dateChangeReason || 'Ajuste de cronograma').trim(),
            changedBy: req.auth!.user.name,
            changedAt: new Date().toISOString(),
          };
          dateHistory = [entry, ...dateHistory];
        }

        const deliverableItems = Array.isArray(payload.deliverableItems)
          ? payload.deliverableItems
          : Array.isArray(payload.deliverables)
            ? payload.deliverables.map((title: string, idx: number) => {
                const prev = (m.deliverableItems || []).find((d) => d.title === title);
                return prev || { id: `del_${m.id}_${Date.now()}_${idx}`, title, completed: false };
              })
            : m.deliverableItems;

        return {
          ...m,
          ...payload,
          id: m.id,
          baselineStartDate: m.baselineStartDate || m.startDate,
          baselineDueDate: m.baselineDueDate || m.dueDate,
          dateHistory,
          deliverableItems,
          deliverables: deliverableItems ? deliverableItems.map((d: SoftwareDeliverableItem) => d.title) : m.deliverables,
          completedAt:
            payload?.status === 'approved' && !m.completedAt
              ? new Date().toISOString()
              : m.completedAt,
        };
      });

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        milestones: updatedMilestones,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al actualizar hito' });
    }
  }
);

// =============================================================================
// CONTROL DE CAMBIOS DE ALCANCE (CHANGE REQUESTS)
// =============================================================================

// POST /api/workspace/software/:id/change-requests
router.post(
  '/:id/change-requests',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const existing = Array.isArray(project.changeRequests) ? project.changeRequests : [];
      const cr: SoftwareChangeRequest = {
        id: `cr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        code: `CR-${String(existing.length + 1).padStart(2, '0')}`,
        title: String(req.body?.title || 'Solicitud de cambio').trim(),
        description: String(req.body?.description || '').trim(),
        milestoneId: req.body?.milestoneId || '',
        impactDays: Number(req.body?.impactDays) || 0,
        additionalCost: Number(req.body?.additionalCost) || 0,
        currency: req.body?.currency === 'USD' ? 'USD' : 'PEN',
        status: req.body?.status || 'pending',
        requestedBy: String(req.body?.requestedBy || req.auth!.user.name).trim(),
        createdAt: new Date().toISOString(),
      };

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        changeRequests: [cr, ...existing],
      });
      return res.status(201).json({ success: true, project: updated, changeRequest: cr });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al crear solicitud de cambio' });
    }
  }
);

// PUT /api/workspace/software/:id/change-requests/:crId
router.put(
  '/:id/change-requests/:crId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const crId = String(req.params.crId);
      const existing = Array.isArray(project.changeRequests) ? project.changeRequests : [];
      const updatedList = existing.map((cr) => {
        if (cr.id !== crId) return cr;
        const nextStatus = req.body?.status || cr.status;
        const decided =
          nextStatus !== 'pending' && cr.status === 'pending'
            ? { decidedBy: req.auth!.user.name, decidedAt: new Date().toISOString() }
            : {};
        return {
          ...cr,
          ...req.body,
          ...decided,
          id: cr.id,
        };
      });

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        changeRequests: updatedList,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al actualizar solicitud de cambio' });
    }
  }
);

// DELETE /api/workspace/software/:id/change-requests/:crId
router.delete(
  '/:id/change-requests/:crId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const crId = String(req.params.crId);
      const updatedList = (project.changeRequests || []).filter((cr) => cr.id !== crId);
      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        changeRequests: updatedList,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al eliminar solicitud de cambio' });
    }
  }
);

// DELETE /api/workspace/software/:id/milestones/:milestoneId
router.delete(
  '/:id/milestones/:milestoneId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const milestoneId = String(req.params.milestoneId);
      const remaining = project.milestones
        .filter((m) => m.id !== milestoneId)
        .map((m, idx) => ({ ...m, orderIndex: idx, code: `H${idx + 1}` }));
      const remainingItems = project.workItems.filter((w) => w.milestoneId !== milestoneId);

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        milestones: remaining,
        workItems: remainingItems,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al eliminar hito' });
    }
  }
);

// POST /api/workspace/software/:id/milestones/:milestoneId/comments
router.post(
  '/:id/milestones/:milestoneId/comments',
  requireAuth,
  requirePermission('workspace.software.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const milestoneId = String(req.params.milestoneId);
      const text = String(req.body?.text || '').trim();
      if (!text) return res.status(400).json({ error: 'El comentario no puede estar vacío.' });

      const newComment: SoftwareMilestoneComment = {
        id: `swc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        authorName: req.auth!.user.name,
        authorRole: 'team',
        authorAvatar: req.auth!.user.avatarUrl || '',
        text,
        attachmentUrl: req.body?.attachmentUrl || undefined,
        createdAt: new Date().toISOString(),
      };

      const updatedMilestones = project.milestones.map((m) =>
        m.id === milestoneId ? { ...m, comments: [...(m.comments || []), newComment] } : m
      );

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        milestones: updatedMilestones,
      });

      // Detectar menciones @usuario en el comentario y enviar notificación interna
      const mentionMatches = text.match(/@([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9._-]+)/g);
      if (mentionMatches && mentionMatches.length > 0) {
        const targetMilestone = project.milestones.find((m) => m.id === milestoneId);
        notifyEvent({
          tenantId,
          title: `💬 Mención en ${project.code} (${targetMilestone?.code || 'Hito'})`,
          message: `${req.auth!.user.name} mencionó a ${mentionMatches.join(', ')}: "${text.slice(0, 140)}"`,
          type: 'info',
          module: 'workspace',
          entityId: project.id,
          action: 'software_comment_mention',
          actorUserId: req.auth!.user.id,
          actorUserName: req.auth!.user.name,
        }).catch(() => {});
      }

      return res.status(201).json({ success: true, project: updated, comment: newComment });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al agregar comentario' });
    }
  }
);

// =============================================================================
// OPERACIONES ATÃ“MICAS DE TAREAS TÃ‰CNICAS & BUGS QA
// =============================================================================

// POST /api/workspace/software/:id/items
router.post(
  '/:id/items',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const type = req.body?.type || 'task';
      const prefix = type === 'bug' ? 'BUG' : type === 'qa_check' ? 'QA' : 'DEV';
      const samePrefixCount =
        project.workItems.filter((w) => (w.code || '').startsWith(prefix)).length + 1;
      const now = new Date().toISOString();

      const newItem: SoftwareWorkItem = {
        id: `swi_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        milestoneId: req.body?.milestoneId || project.milestones[0]?.id || '',
        sprintId: req.body?.sprintId || '',
        code: `${prefix}-${String(samePrefixCount).padStart(2, '0')}`,
        type,
        title: String(req.body?.title || 'Nueva tarea técnica').trim(),
        description: String(req.body?.description || ''),
        status: req.body?.status || 'todo',
        priority: req.body?.priority || 'medium',
        severity: type === 'bug' ? req.body?.severity || 'major' : undefined,
        qaVerificationStatus: type === 'bug' ? req.body?.qaVerificationStatus || 'open' : undefined,
        reopenCount: type === 'bug' ? Number(req.body?.reopenCount) || 0 : undefined,
        bugEnvironment: type === 'bug' ? req.body?.bugEnvironment || undefined : undefined,
        bugMedia: Array.isArray(req.body?.bugMedia) ? req.body.bugMedia : undefined,
        consoleLogs: req.body?.consoleLogs || '',
        storyPoints: req.body?.storyPoints !== undefined && req.body?.storyPoints !== '' ? Number(req.body.storyPoints) : undefined,
        tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
        isBlocked: Boolean(req.body?.isBlocked),
        blockedReason: String(req.body?.blockedReason || ''),
        stepsToReproduce: req.body?.stepsToReproduce || '',
        expectedBehavior: req.body?.expectedBehavior || '',
        actualBehavior: req.body?.actualBehavior || '',
        acceptanceCriteria: Array.isArray(req.body?.acceptanceCriteria) ? req.body.acceptanceCriteria : [],
        assignedUserId: req.body?.assignedUserId || '',
        assignedUserName: req.body?.assignedUserName || '',
        assignedUserAvatar: req.body?.assignedUserAvatar || '',
        estimatedHours: req.body?.estimatedHours !== undefined ? Number(req.body.estimatedHours) : undefined,
        loggedHours: req.body?.loggedHours !== undefined ? Number(req.body.loggedHours) : 0,
        dueDate: req.body?.dueDate || '',
        evidenceUrl: req.body?.evidenceUrl || '',
        reportedByClient: Boolean(req.body?.reportedByClient),
        createdAt: now,
        updatedAt: now,
      };

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        workItems: [newItem, ...project.workItems],
      });
      return res.status(201).json({ success: true, project: updated, item: newItem });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al crear ítem de trabajo' });
    }
  }
);

// PUT /api/workspace/software/:id/items/:itemId
router.put(
  '/:id/items/:itemId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const itemId = String(req.params.itemId);
      const prevItem = project.workItems.find((w) => w.id === itemId);
      if (!prevItem) return res.status(404).json({ error: 'Ítem no encontrado' });

      const updatedItems = project.workItems.map((w) => {
        if (w.id !== itemId) return w;
        const nowIso = new Date().toISOString();
        const nextQa = req.body?.qaVerificationStatus ?? w.qaVerificationStatus;
        const nextStatus = req.body?.status ?? w.status;
        let reopenCount = w.reopenCount || 0;
        if (nextQa === 'reopened' && w.qaVerificationStatus !== 'reopened') {
          reopenCount += 1;
        }
        const resolvedAt =
          (nextStatus === 'done' || nextQa === 'dev_resolved' || nextQa === 'qa_verified') && !w.resolvedAt
            ? nowIso
            : nextQa === 'reopened'
              ? undefined
              : w.resolvedAt;
        return {
          ...w,
          ...req.body,
          id: w.id,
          reopenCount: w.type === 'bug' ? reopenCount : w.reopenCount,
          resolvedAt,
          updatedAt: nowIso,
        };
      });

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        workItems: updatedItems,
      });

      // Alerta al Tech Lead cuando una tarea se marca como Bloqueada
      if (req.body?.isBlocked === true && !prevItem.isBlocked) {
        notifyEvent({
          tenantId,
          title: `🚧 Tarea bloqueada en ${project.code}: ${prevItem.code}`,
          message: `${req.auth!.user.name} marcó "${prevItem.title}" como bloqueada. Motivo: ${
            req.body?.blockedReason || 'Sin motivo especificado'
          }`,
          type: 'alert',
          module: 'workspace',
          entityId: project.id,
          action: 'software_item_blocked',
          actorUserId: req.auth!.user.id,
          actorUserName: req.auth!.user.name,
        }).catch(() => {});
      }

      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al actualizar ítem' });
    }
  }
);

// PUT /api/workspace/software/:id/items-bulk
router.put(
  '/:id/items-bulk',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const itemIds: string[] = Array.isArray(req.body?.itemIds) ? req.body.itemIds : [];
      const updates = req.body?.updates || {};
      if (itemIds.length === 0) return res.status(400).json({ error: 'Selecciona al menos un ítem.' });

      const idSet = new Set(itemIds);
      const now = new Date().toISOString();
      const updatedItems = project.workItems.map((w) =>
        idSet.has(w.id) ? { ...w, ...updates, id: w.id, updatedAt: now } : w
      );

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        workItems: updatedItems,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error en actualización masiva' });
    }
  }
);

// POST /api/workspace/software/:id/items/:itemId/timer
router.post(
  '/:id/items/:itemId/timer',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const itemId = String(req.params.itemId);
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();

      const updatedItems = project.workItems.map((w) => {
        if (w.id !== itemId) return w;
        if (w.activeTimerStartedAt) {
          const startedMs = new Date(w.activeTimerStartedAt).getTime();
          const elapsedHours = Number.isFinite(startedMs)
            ? Math.max(0.01, (nowMs - startedMs) / 3600000)
            : 0;
          const nextLogged = Math.round(((Number(w.loggedHours) || 0) + elapsedHours) * 100) / 100;
          return {
            ...w,
            activeTimerStartedAt: '',
            loggedHours: nextLogged,
            updatedAt: nowIso,
          };
        }
        return {
          ...w,
          activeTimerStartedAt: nowIso,
          updatedAt: nowIso,
        };
      });

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        workItems: updatedItems,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al controlar cronómetro' });
    }
  }
);

// =============================================================================
// SPRINTS ÁGILES (ITERACIONES 1-2 SEMANAS + ROLLOVER)
// =============================================================================

// POST /api/workspace/software/:id/sprints
router.post(
  '/:id/sprints',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const existing = Array.isArray(project.sprints) ? project.sprints : [];
      const today = new Date().toISOString().slice(0, 10);
      const in14Days = new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10);

      const newSprint: SoftwareSprint = {
        id: `spr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        name: String(req.body?.name || `Sprint ${existing.length + 1}`).trim(),
        goal: String(req.body?.goal || '').trim(),
        startDate: req.body?.startDate || today,
        endDate: req.body?.endDate || in14Days,
        status: req.body?.status || (existing.some((s) => s.status === 'active') ? 'planned' : 'active'),
        createdAt: new Date().toISOString(),
      };

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        sprints: [...existing, newSprint],
      });
      return res.status(201).json({ success: true, project: updated, sprint: newSprint });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al crear sprint' });
    }
  }
);

// POST /api/workspace/software/:id/sprints/:sprintId/close
router.post(
  '/:id/sprints/:sprintId/close',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const sprintId = String(req.params.sprintId);
      const nextSprintId = String(req.body?.rolloverToSprintId || '');
      const sprintItems = project.workItems.filter((w) => w.sprintId === sprintId);
      const completedPoints = sprintItems
        .filter((w) => w.status === 'done')
        .reduce((acc, w) => acc + (Number(w.storyPoints) || 0), 0);

      const updatedSprints = (project.sprints || []).map((s) =>
        s.id === sprintId
          ? {
              ...s,
              status: 'completed' as const,
              completedPoints,
              completedAt: new Date().toISOString(),
            }
          : s.id === nextSprintId && s.status === 'planned'
            ? { ...s, status: 'active' as const }
            : s
      );

      const updatedItems = project.workItems.map((w) =>
        w.sprintId === sprintId && w.status !== 'done'
          ? { ...w, sprintId: nextSprintId || '', updatedAt: new Date().toISOString() }
          : w
      );

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        sprints: updatedSprints,
        workItems: updatedItems,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al cerrar sprint' });
    }
  }
);

// DELETE /api/workspace/software/:id/sprints/:sprintId
router.delete(
  '/:id/sprints/:sprintId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const sprintId = String(req.params.sprintId);
      const updatedSprints = (project.sprints || []).filter((s) => s.id !== sprintId);
      const updatedItems = project.workItems.map((w) =>
        w.sprintId === sprintId ? { ...w, sprintId: '' } : w
      );

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        sprints: updatedSprints,
        workItems: updatedItems,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al eliminar sprint' });
    }
  }
);

// DELETE /api/workspace/software/:id/items/:itemId
router.delete(
  '/:id/items/:itemId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const itemId = String(req.params.itemId);
      const updatedItems = project.workItems.filter((w) => w.id !== itemId);
      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        workItems: updatedItems,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al eliminar ítem' });
    }
  }
);

// =============================================================================
// QA: MATRIZ DE CASOS DE PRUEBA (TEST CASES) Y CHECKLIST GO-LIVE
// =============================================================================

// POST /api/workspace/software/:id/test-cases
router.post(
  '/:id/test-cases',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const existing = Array.isArray(project.testCases) ? project.testCases : [];
      const tc: SoftwareTestCase = {
        id: `tc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        code: `TC-${String(existing.length + 1).padStart(2, '0')}`,
        milestoneId: req.body?.milestoneId || project.milestones[0]?.id || '',
        title: String(req.body?.title || 'Caso de prueba').trim(),
        steps: String(req.body?.steps || '').trim(),
        expectedResult: String(req.body?.expectedResult || '').trim(),
        status: req.body?.status || 'pending',
      };

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        testCases: [tc, ...existing],
      });
      return res.status(201).json({ success: true, project: updated, testCase: tc });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al crear caso de prueba' });
    }
  }
);

// PUT /api/workspace/software/:id/test-cases/:tcId
router.put(
  '/:id/test-cases/:tcId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const tcId = String(req.params.tcId);
      const updatedCases = (project.testCases || []).map((tc) =>
        tc.id === tcId
          ? {
              ...tc,
              ...req.body,
              id: tc.id,
              executedBy: req.body?.status && req.body.status !== 'pending' ? req.auth!.user.name : tc.executedBy,
              executedAt: req.body?.status && req.body.status !== 'pending' ? new Date().toISOString() : tc.executedAt,
            }
          : tc
      );

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        testCases: updatedCases,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al actualizar caso de prueba' });
    }
  }
);

// DELETE /api/workspace/software/:id/test-cases/:tcId
router.delete(
  '/:id/test-cases/:tcId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const tcId = String(req.params.tcId);
      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        testCases: (project.testCases || []).filter((tc) => tc.id !== tcId),
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al eliminar caso de prueba' });
    }
  }
);

// PUT /api/workspace/software/:id/go-live
router.put(
  '/:id/go-live',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const goLiveChecklist = Array.isArray(req.body?.goLiveChecklist) ? req.body.goLiveChecklist : [];
      const updated = await db.updateSoftwareProject(project.id, tenantId, { goLiveChecklist });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al guardar checklist Go-Live' });
    }
  }
);

// =============================================================================
// CAPACIDAD DEL EQUIPO Y CRUCE CON ASISTENCIA / PERMISOS DE RR.HH.
// =============================================================================

// GET /api/workspace/software/:id/team-availability
router.get(
  '/:id/team-availability',
  requireAuth,
  requirePermission('workspace.software.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const state = (db as any).localState || {};
      const attendanceRecords: any[] = Array.isArray(state.attendanceRecords)
        ? state.attendanceRecords.filter((r: any) => r.tenantId === tenantId)
        : [];
      const employeeProfiles: any[] = Array.isArray(state.employeeProfiles)
        ? state.employeeProfiles.filter((e: any) => e.tenantId === tenantId)
        : [];

      const sinceIso = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
      const absencesByUser: Record<string, Array<{ date: string; status: string; notes?: string }>> = {};

      attendanceRecords.forEach((rec) => {
        const uid = rec.userId;
        const date = rec.date || (rec.createdAt ? String(rec.createdAt).slice(0, 10) : '');
        const status = String(rec.status || '').toLowerCase();
        if (!uid || !date || date < sinceIso) return;
        if (['absent', 'vacation', 'leave', 'medical_leave', 'permission', 'justified_absence'].includes(status)) {
          if (!absencesByUser[uid]) absencesByUser[uid] = [];
          absencesByUser[uid].push({ date, status, notes: rec.notes || '' });
        }
      });

      const capacityByUser: Record<string, { weeklyHours: number; status: string }> = {};
      employeeProfiles.forEach((emp) => {
        if (!emp.userId) return;
        capacityByUser[emp.userId] = {
          weeklyHours: Number(emp.weeklyHours) || 40,
          status: emp.status || 'active',
        };
      });

      return res.json({ success: true, absencesByUser, capacityByUser });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al consultar disponibilidad RR.HH.' });
    }
  }
);

// =============================================================================
// FASE 5 & 6: DEVOPS, GIT WEBHOOK, RELEASES, HEALTH CHECK, BÓVEDA CIFRADA, DRIVE Y AUDITORÍA
// =============================================================================

// POST /api/workspace/software/webhooks/git/:projectId/:secret (PÚBLICO para GitHub/GitLab/Bitbucket)
router.post('/webhooks/git/:projectId/:secret', async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const secret = String(req.params.secret);
    const project = await db.getSoftwareProjectById(projectId);
    if (!project || !project.gitWebhookSecret || project.gitWebhookSecret !== secret) {
      return res.status(403).json({ success: false, error: 'Webhook secret inválido' });
    }

    const body = req.body || {};
    const commits: Array<{ message?: string; author?: { name?: string }; id?: string }> =
      Array.isArray(body.commits) ? body.commits : [];
    const prTitle = body.pull_request?.title || body.object_attributes?.title || '';
    const prMerged = Boolean(body.pull_request?.merged || body.object_attributes?.state === 'merged');
    const provider = req.headers['x-github-event']
      ? 'GitHub'
      : req.headers['x-gitlab-event']
        ? 'GitLab'
        : req.headers['x-event-key']
          ? 'Bitbucket'
          : 'Git';

    const messages = [
      ...commits.map((c) => c.message || ''),
      prTitle,
    ].filter(Boolean);
    const combinedText = messages.join('\n');
    const codeRegex = /\b((?:DEV|BUG|QA)-\d+)\b/gi;
    const matchedCodes = Array.from(new Set((combinedText.match(codeRegex) || []).map((c) => c.toUpperCase())));

    const nowIso = new Date().toISOString();
    let movedCount = 0;
    const updatedItems = project.workItems.map((w) => {
      if (!matchedCodes.includes((w.code || '').toUpperCase())) return w;
      const lower = combinedText.toLowerCase();
      let nextStatus = w.status;
      if (prMerged || /\b(qa|ready for qa|test)\b/i.test(lower)) {
        nextStatus = 'qa_testing';
      } else if (/\b(fix|fixes|closes|resolves)\b/i.test(lower)) {
        nextStatus = 'qa_testing';
      } else if (w.status === 'backlog' || w.status === 'todo') {
        nextStatus = 'in_progress';
      }
      if (nextStatus !== w.status) movedCount++;
      return { ...w, status: nextStatus, updatedAt: nowIso };
    });

    const author =
      body.pusher?.name ||
      body.user_name ||
      commits[0]?.author?.name ||
      'Git Webhook';
    const ref = String(body.ref || body.pull_request?.head?.ref || 'main');
    const summaryMsg = messages[0]?.slice(0, 140) || 'Evento Git recibido';

    const gitEvent = {
      id: `git_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      provider,
      ref,
      message: summaryMsg,
      author,
      matchedCodes,
      receivedAt: nowIso,
    };

    const auditLog = appendAudit(
      project,
      'git_webhook',
      `${provider} (${ref}): "${summaryMsg}"${matchedCodes.length > 0 ? ` → [${matchedCodes.join(', ')}]` : ''}`,
      author
    );

    await db.updateSoftwareProject(project.id, project.tenantId, {
      workItems: updatedItems,
      gitEvents: [gitEvent, ...(project.gitEvents || [])].slice(0, 40),
      auditLog,
    });

    return res.json({ success: true, matchedCodes, movedCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error procesando webhook Git' });
  }
});

// POST /api/workspace/software/:id/webhook-secret (generar o rotar secret)
router.post(
  '/:id/webhook-secret',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const gitWebhookSecret = crypto.randomBytes(16).toString('hex');
      const auditLog = appendAudit(project, 'webhook_secret_rotated', 'Generó/rotó el secret del Webhook Git', req.auth!.user.name);
      const updated = await db.updateSoftwareProject(project.id, tenantId, { gitWebhookSecret, auditLog });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al generar webhook secret' });
    }
  }
);

// POST /api/workspace/software/:id/health-check
router.post(
  '/:id/health-check',
  requireAuth,
  requirePermission('workspace.software.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const stagingUrl = project.environments?.stagingUrl?.trim();
      const productionUrl = project.environments?.productionUrl?.trim();

      const [staging, production] = await Promise.all([
        stagingUrl ? pingUrlHealth(stagingUrl) : Promise.resolve(undefined),
        productionUrl ? pingUrlHealth(productionUrl) : Promise.resolve(undefined),
      ]);

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        healthChecks: { staging, production },
      });
      return res.json({ success: true, project: updated, healthChecks: { staging, production } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al verificar uptime' });
    }
  }
);

// POST /api/workspace/software/:id/releases
router.post(
  '/:id/releases',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const version = String(req.body?.version || '').trim();
      if (!version) return res.status(400).json({ error: 'La versión es obligatoria (ej. v1.0.0).' });

      const release: SoftwareRelease = {
        id: `rel_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        version,
        environment: req.body?.environment === 'production' ? 'production' : 'staging',
        notes: String(req.body?.notes || '').trim(),
        workItemIds: Array.isArray(req.body?.workItemIds) ? req.body.workItemIds : [],
        deployedBy: req.auth!.user.name,
        deployedAt: new Date().toISOString(),
      };

      const auditLog = appendAudit(
        project,
        'release_published',
        `Publicó release ${release.version} en ${release.environment} (${release.workItemIds.length} ítems)`,
        req.auth!.user.name
      );

      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        releases: [release, ...(project.releases || [])],
        auditLog,
      });
      return res.status(201).json({ success: true, project: updated, release });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al registrar release' });
    }
  }
);

// DELETE /api/workspace/software/:id/releases/:releaseId
router.delete(
  '/:id/releases/:releaseId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const relId = String(req.params.releaseId);
      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        releases: (project.releases || []).filter((r) => r.id !== relId),
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al eliminar release' });
    }
  }
);

// POST /api/workspace/software/:id/vault (Guardar credencial cifrada AES-256-GCM)
router.post(
  '/:id/vault',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const label = String(req.body?.label || '').trim();
      const secret = String(req.body?.secret || '');
      if (!label || !secret) return res.status(400).json({ error: 'Etiqueta y secreto son obligatorios.' });

      const cred: SoftwareVaultCredential = {
        id: `vlt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        label,
        category: req.body?.category || 'server',
        hostOrUrl: String(req.body?.hostOrUrl || '').trim(),
        username: String(req.body?.username || '').trim(),
        encryptedSecret: encryptVaultSecret(secret),
        notes: String(req.body?.notes || '').trim(),
        createdBy: req.auth!.user.name,
        createdAt: new Date().toISOString(),
      };

      const auditLog = appendAudit(project, 'vault_created', `Agregó credencial cifrada "${label}"`, req.auth!.user.name);
      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        vaultCredentials: [cred, ...(project.vaultCredentials || [])],
        auditLog,
      });
      return res.status(201).json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al guardar credencial' });
    }
  }
);

// POST /api/workspace/software/:id/vault/:credId/reveal (Revelar secreto + registrar en Audit Trail)
router.post(
  '/:id/vault/:credId/reveal',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const cred = (project.vaultCredentials || []).find((c) => c.id === String(req.params.credId));
      if (!cred) return res.status(404).json({ error: 'Credencial no encontrada' });

      const secret = decryptVaultSecret(cred.encryptedSecret);
      const auditLog = appendAudit(
        project,
        'vault_revealed',
        `Reveló el secreto de "${cred.label}"`,
        req.auth!.user.name
      );
      await db.updateSoftwareProject(project.id, tenantId, { auditLog });
      return res.json({ success: true, secret });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al descifrar credencial' });
    }
  }
);

// DELETE /api/workspace/software/:id/vault/:credId
router.delete(
  '/:id/vault/:credId',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const credId = String(req.params.credId);
      const target = (project.vaultCredentials || []).find((c) => c.id === credId);
      const auditLog = appendAudit(
        project,
        'vault_deleted',
        `Eliminó credencial "${target?.label || credId}"`,
        req.auth!.user.name
      );
      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        vaultCredentials: (project.vaultCredentials || []).filter((c) => c.id !== credId),
        auditLog,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al eliminar credencial' });
    }
  }
);

// POST /api/workspace/software/:id/drive-scaffold (Crear estructura estándar de subcarpetas Drive)
router.post(
  '/:id/drive-scaffold',
  requireAuth,
  requirePermission('workspace.software.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const project = await db.getSoftwareProjectById(String(req.params.id), tenantId);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

      const folderNames = ['01_Discovery', '02_Diseño', '03_Entregables', '04_QA'];
      const baseLink = project.driveFolderLink || '';
      const subfolders = folderNames.map((name, idx) => ({
        id: `drvsub_${project.id}_${idx}`,
        name,
        webViewLink: baseLink || '',
      }));

      const auditLog = appendAudit(
        project,
        'drive_scaffold',
        `Generó estructura de subcarpetas Drive (${folderNames.join(', ')})`,
        req.auth!.user.name
      );
      const updated = await db.updateSoftwareProject(project.id, tenantId, {
        driveSubfolders: subfolders,
        auditLog,
      });
      return res.json({ success: true, project: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error al generar subcarpetas Drive' });
    }
  }
);

export default router;
