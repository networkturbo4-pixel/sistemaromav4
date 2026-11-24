import { SoftwareProject, SoftwareWorkItem } from '../../../../../../shared/types';
import { BUG_SEVERITY_META } from '../templates';

function esc(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function exportQaReportCsv(project: SoftwareProject): void {
  const msById = new Map(project.milestones.map((m) => [m.id, m]));
  const bugs = project.workItems.filter((w) => w.type === 'bug');
  const headers = [
    'Codigo',
    'Titulo',
    'Hito',
    'Severidad',
    'Estado Kanban',
    'Estado QA',
    'Reaperturas',
    'Responsable',
    'Navegador',
    'SO',
    'Dispositivo',
    'Build',
    'Creado',
    'Resuelto',
  ];

  const rows = bugs.map((b) => [
    b.code,
    b.title,
    msById.get(b.milestoneId)?.code || '',
    b.severity || 'major',
    b.status,
    b.qaVerificationStatus || 'open',
    String(b.reopenCount || 0),
    b.assignedUserName || 'Sin asignar',
    b.bugEnvironment?.browser || '',
    b.bugEnvironment?.os || '',
    b.bugEnvironment?.device || '',
    b.bugEnvironment?.buildVersion || '',
    b.createdAt?.slice(0, 10) || '',
    b.resolvedAt?.slice(0, 10) || '',
  ]);

  const csvCell = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `QA_Reporte_${project.code}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportQaReportPdf(project: SoftwareProject): void {
  const msById = new Map(project.milestones.map((m) => [m.id, m]));
  const bugs = project.workItems.filter((w) => w.type === 'bug');
  const openBugs = bugs.filter((b) => b.status !== 'done');
  const resolvedBugs = bugs.filter((b) => b.status === 'done');
  const testCases = project.testCases || [];
  const goLive = project.goLiveChecklist || [];

  const mttrHours = (() => {
    const diffs = bugs
      .filter((b) => b.resolvedAt && b.createdAt)
      .map((b) => (new Date(b.resolvedAt!).getTime() - new Date(b.createdAt).getTime()) / 3600000)
      .filter((h) => Number.isFinite(h) && h >= 0);
    if (diffs.length === 0) return 'N/A';
    return `${(diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1)}h`;
  })();

  const bugRow = (b: SoftwareWorkItem) => `
    <tr>
      <td><strong>${esc(b.code)}</strong></td>
      <td>${esc(b.title)}${b.bugEnvironment?.browser ? `<div style="font-size:10px;color:#64748b;">${esc(b.bugEnvironment.browser)} · ${esc(b.bugEnvironment.os || '')} ${esc(b.bugEnvironment.device || '')}</div>` : ''}</td>
      <td>${esc(msById.get(b.milestoneId)?.code || '—')}</td>
      <td>${esc(b.severity ? BUG_SEVERITY_META[b.severity]?.label : 'Mayor')}</td>
      <td>${esc(b.qaVerificationStatus || (b.status === 'done' ? 'qa_verified' : 'open'))}</td>
      <td>${b.reopenCount || 0}</td>
      <td>${esc(b.assignedUserName || 'Sin asignar')}</td>
    </tr>`;

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Reporte QA — ${esc(project.code)} ${esc(project.name)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; padding: 28px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 13px; text-transform: uppercase; color: #475569; margin: 22px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; }
    .kpi span { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .kpi strong { font-size: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #e2e8f0; padding: 7px 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: 800; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:right;margin-bottom:10px;">
    <button onclick="window.print()" style="background:#0f172a;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-weight:700;cursor:pointer;">Imprimir / Guardar PDF</button>
  </div>
  <h1>Reporte Ejecutivo de Calidad (QA) — ${esc(project.code)}</h1>
  <div style="font-size:12px;color:#475569;">Proyecto: <strong>${esc(project.name)}</strong> · Cliente: <strong>${esc(project.clientName)}</strong> · Fecha: ${new Date().toLocaleString('es-PE')}</div>

  <div class="kpis">
    <div class="kpi"><span>Bugs Abiertos</span><strong>${openBugs.length}</strong></div>
    <div class="kpi"><span>Bugs Resueltos</span><strong>${resolvedBugs.length}</strong></div>
    <div class="kpi"><span>MTTR Promedio</span><strong>${mttrHours}</strong></div>
    <div class="kpi"><span>Test Cases Pass</span><strong>${testCases.filter((t) => t.status === 'pass').length}/${testCases.length}</strong></div>
  </div>

  <h2>Incidencias y Bugs (${bugs.length})</h2>
  ${
    bugs.length > 0
      ? `<table><thead><tr><th>Código</th><th>Incidencia</th><th>Hito</th><th>Severidad</th><th>QA</th><th>Reaperturas</th><th>Responsable</th></tr></thead><tbody>${bugs.map(bugRow).join('')}</tbody></table>`
      : '<p style="font-size:12px;color:#64748b;">Sin bugs registrados.</p>'
  }

  ${
    testCases.length > 0
      ? `<h2>Casos de Prueba (${testCases.length})</h2><table><thead><tr><th>Código</th><th>Caso</th><th>Hito</th><th>Resultado</th></tr></thead><tbody>${testCases
          .map(
            (tc) =>
              `<tr><td><strong>${esc(tc.code)}</strong></td><td>${esc(tc.title)}</td><td>${esc(msById.get(tc.milestoneId)?.code || '—')}</td><td><strong>${esc(tc.status.toUpperCase())}</strong></td></tr>`
          )
          .join('')}</tbody></table>`
      : ''
  }

  ${
    goLive.length > 0
      ? `<h2>Checklist Go-Live (${goLive.filter((g) => g.completed).length}/${goLive.length})</h2><ul style="font-size:12px;">${goLive
          .map((g) => `<li>${g.completed ? '✅' : '⬜'} [${esc(g.category.toUpperCase())}] ${esc(g.label)}</li>`)
          .join('')}</ul>`
      : ''
  }
</body>
</html>`;

  const win = window.open('', '_blank', 'width=940,height=780');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}
