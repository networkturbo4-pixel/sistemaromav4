import { SoftwareMilestone, SoftwareProject } from '../../../../../../shared/types';
import { MILESTONE_STATUS_META } from '../templates';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function openMilestoneActaPdf(project: SoftwareProject, milestone: SoftwareMilestone): void {
  const deliverables =
    milestone.deliverableItems && milestone.deliverableItems.length > 0
      ? milestone.deliverableItems
      : (milestone.deliverables || []).map((title, idx) => ({
          id: `d_${idx}`,
          title,
          completed: milestone.status === 'approved',
        }));

  const mItems = (project.workItems || []).filter((w) => w.milestoneId === milestone.id);
  const doneItems = mItems.filter((w) => w.status === 'done');
  const statusLabel = MILESTONE_STATUS_META[milestone.status]?.label || milestone.status;
  const approval = milestone.clientApproval;
  const nowStr = new Date().toLocaleString('es-PE');

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Acta de Hito ${escapeHtml(milestone.code)} - ${escapeHtml(project.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 32px; background: #fff; }
    .sheet { max-width: 820px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #e0e7ff; color: #3730a3; }
    h1 { margin: 6px 0 4px; font-size: 20px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin: 22px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; font-size: 12px; }
    .meta div span { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .meta div strong { font-size: 13px; color: #0f172a; }
    ul.list { list-style: none; padding: 0; margin: 0; }
    ul.list li { padding: 7px 10px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 6px; font-size: 12px; display: flex; justify-content: space-between; }
    .ok { color: #059669; font-weight: 700; }
    .pending { color: #d97706; font-weight: 700; }
    .approval-box { margin-top: 20px; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; background: #f8fafc; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 38px; }
    .sig-line { border-top: 1px solid #334155; padding-top: 6px; font-size: 11px; color: #475569; text-align: center; }
    .footer { margin-top: 28px; font-size: 10px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 16px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="no-print" style="text-align:right;margin-bottom:12px;">
      <button onclick="window.print()" style="background:#0f172a;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;">Imprimir / Guardar PDF</button>
    </div>
    <div class="header">
      <div>
        <span class="badge">ACTA FORMAL DE ENTREGA Y CIERRE DE HITO</span>
        <h1>${escapeHtml(milestone.code)} — ${escapeHtml(milestone.title)}</h1>
        <div style="font-size:12px;color:#475569;">Proyecto: <strong>${escapeHtml(project.code)} · ${escapeHtml(project.name)}</strong></div>
      </div>
      <div style="text-align:right;font-size:12px;">
        <div><strong>Estado:</strong> ${escapeHtml(statusLabel)}</div>
        <div><strong>Avance:</strong> ${milestone.progress}% (Peso ${milestone.weightPercent}%)</div>
        <div style="color:#64748b;margin-top:4px;">Emitido: ${escapeHtml(nowStr)}</div>
      </div>
    </div>

    <div class="meta">
      <div><span>Cliente</span><strong>${escapeHtml(project.clientName)}${project.brandName ? ` (${escapeHtml(project.brandName)})` : ''}</strong></div>
      <div><span>Tech Lead</span><strong>${escapeHtml(project.techLeadName || 'Equipo de Ingeniería')}</strong></div>
      <div><span>Orden de Servicio</span><strong>${escapeHtml(project.serviceOrderCode || 'N/A')}</strong></div>
      <div><span>Inicio / Entrega</span><strong>${escapeHtml(milestone.startDate)} → ${escapeHtml(milestone.dueDate)}</strong></div>
      <div><span>Baseline Original</span><strong>${escapeHtml(milestone.baselineStartDate || milestone.startDate)} → ${escapeHtml(milestone.baselineDueDate || milestone.dueDate)}</strong></div>
      <div><span>Enlace Demo / Staging</span><strong>${milestone.demoUrl ? escapeHtml(milestone.demoUrl) : 'No especificado'}</strong></div>
    </div>

    ${milestone.description ? `<h2>Alcance del Hito</h2><p style="font-size:12px;line-height:1.6;margin:0;">${escapeHtml(milestone.description)}</p>` : ''}

    <h2>Entregables Incluidos (${deliverables.filter((d) => d.completed).length}/${deliverables.length})</h2>
    ${
      deliverables.length > 0
        ? `<ul class="list">${deliverables
            .map(
              (d) =>
                `<li><span>${escapeHtml(d.title)}</span><span class="${d.completed ? 'ok' : 'pending'}">${
                  d.completed ? '✓ Completado' : '○ Pendiente'
                }</span></li>`
            )
            .join('')}</ul>`
        : '<p style="font-size:12px;color:#64748b;">Sin entregables listados.</p>'
    }

    <h2>Resumen Técnico (${doneItems.length}/${mItems.length} tareas/bugs completados)</h2>
    ${
      mItems.length > 0
        ? `<ul class="list">${mItems
            .map(
              (w) =>
                `<li><span><strong>${escapeHtml(w.code)}</strong> — ${escapeHtml(w.title)}</span><span class="${
                  w.status === 'done' ? 'ok' : 'pending'
                }">${escapeHtml(w.status)}</span></li>`
            )
            .join('')}</ul>`
        : '<p style="font-size:12px;color:#64748b;">Sin ítems técnicos asociados.</p>'
    }

    ${
      milestone.attachments && milestone.attachments.length > 0
        ? `<h2>Evidencias y Recursos Adjuntos</h2><ul class="list">${milestone.attachments
            .map((a) => `<li><span>${escapeHtml(a.name)}</span><span style="color:#2563eb;">${escapeHtml(a.url)}</span></li>`)
            .join('')}</ul>`
        : ''
    }

    <div class="approval-box">
      <div style="font-size:12px;font-weight:800;margin-bottom:6px;">Conformidad y Aprobación del Cliente</div>
      <div style="font-size:12px;color:#334155;">
        Estado de conformidad: <strong>${
          approval?.status === 'approved'
            ? 'APROBADO POR EL CLIENTE'
            : approval?.status === 'changes_requested'
              ? 'CON OBSERVACIONES'
              : 'PENDIENTE DE APROBACIÓN'
        }</strong>
        ${approval?.decidedBy ? ` · Aprobado por: <strong>${escapeHtml(approval.decidedBy)}</strong>` : ''}
        ${approval?.decidedAt ? ` · Fecha: <strong>${escapeHtml(new Date(approval.decidedAt).toLocaleString('es-PE'))}</strong>` : ''}
      </div>
      ${approval?.notes ? `<p style="font-size:12px;margin:8px 0 0;color:#475569;"><strong>Notas:</strong> ${escapeHtml(approval.notes)}</p>` : ''}
      <div class="signatures">
        <div class="sig-line"><strong>${escapeHtml(project.techLeadName || 'Responsable de Ingeniería')}</strong><br/>Agencia / Desarrollo de Software</div>
        <div class="sig-line"><strong>${escapeHtml(approval?.decidedBy || project.clientName)}</strong><br/>Conformidad del Cliente</div>
      </div>
    </div>

    <div class="footer">Documento generado desde SISTEMA ROMA V4 — Módulo de Desarrollo de Software</div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=920,height=780');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
