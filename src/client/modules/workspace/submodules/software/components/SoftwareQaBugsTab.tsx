import React, { useState, useMemo } from 'react';
import {
  Bug,
  Plus,
  CheckCircle2,
  ExternalLink,
  AlertOctagon,
  RotateCcw,
  ShieldCheck,
  FileDown,
  FileSpreadsheet,
  ClipboardCheck,
  Rocket,
  BarChart3,
  Trash2,
  CheckSquare,
  Square,
  Lock,
  Terminal,
} from 'lucide-react';
import {
  SoftwareProject,
  SoftwareWorkItem,
  SoftwareBugSeverity,
  SoftwareQaVerificationStatus,
  SoftwareTestCase,
  SoftwareGoLiveItem,
} from '../../../../../../shared/types';
import { BUG_SEVERITY_META } from '../templates';
import { exportQaReportCsv, exportQaReportPdf } from '../utils/qaReportExport';

const DEFAULT_GOLIVE_ITEMS: Array<{ category: SoftwareGoLiveItem['category']; label: string }> = [
  { category: 'security', label: 'Certificado SSL/HTTPS activo y redirección forzada' },
  { category: 'security', label: 'Variables de entorno de producción y secretos verificados' },
  { category: 'security', label: 'Roles, permisos, CORS y rate-limit validados' },
  { category: 'infra', label: 'Backups automáticos de base de datos configurados' },
  { category: 'infra', label: 'Dominio DNS, correos SMTP y webhooks apuntando a producción' },
  { category: 'seo', label: 'Meta tags, OpenGraph, sitemap.xml y robots.txt configurados' },
  { category: 'seo', label: 'Favicon, títulos dinámicos y páginas 404/500 personalizadas' },
  { category: 'analytics', label: 'Google Analytics / Tag Manager / Pixel verificados' },
  { category: 'ux', label: 'Pruebas responsive (móvil, tablet, desktop) aprobadas' },
  { category: 'performance', label: 'Imágenes optimizadas, caché y Lighthouse > 85' },
];

interface SoftwareQaBugsTabProps {
  project: SoftwareProject;
  canManage: boolean;
  onAddBug: (prefill?: Partial<SoftwareWorkItem>) => void;
  onEditWorkItem: (item: SoftwareWorkItem) => void;
  onUpdateWorkItem: (itemId: string, updates: Partial<SoftwareWorkItem>) => Promise<void>;
  onToggleBlockOnCriticalBugs: (enabled: boolean) => Promise<void>;
  onCreateTestCase: (payload: Partial<SoftwareTestCase>) => Promise<void>;
  onUpdateTestCase: (tcId: string, updates: Partial<SoftwareTestCase>) => Promise<void>;
  onDeleteTestCase: (tcId: string) => Promise<void>;
  onSaveGoLiveChecklist: (items: SoftwareGoLiveItem[]) => Promise<void>;
}

const QA_STATUS_META: Record<SoftwareQaVerificationStatus, { label: string; cls: string }> = {
  open: { label: 'Abierto', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
  dev_resolved: { label: 'Resuelto por Dev', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
  qa_verified: { label: 'Verificado por QA', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  reopened: { label: 'Reabierto', cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' },
};

export const SoftwareQaBugsTab: React.FC<SoftwareQaBugsTabProps> = ({
  project,
  canManage,
  onAddBug,
  onEditWorkItem,
  onUpdateWorkItem,
  onToggleBlockOnCriticalBugs,
  onCreateTestCase,
  onUpdateTestCase,
  onDeleteTestCase,
  onSaveGoLiveChecklist,
}) => {
  const [subTab, setSubTab] = useState<'bugs' | 'test_cases' | 'go_live' | 'metrics'>('bugs');
  const [severityFilter, setSeverityFilter] = useState<'all' | SoftwareBugSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'all'>('open');

  // Test case form
  const [tcTitle, setTcTitle] = useState('');
  const [tcSteps, setTcSteps] = useState('');
  const [tcExpected, setTcExpected] = useState('');
  const [tcMilestoneId, setTcMilestoneId] = useState(project.milestones[0]?.id || '');

  // Go-live custom item
  const [newGoLiveLabel, setNewGoLiveLabel] = useState('');
  const [newGoLiveCat, setNewGoLiveCat] = useState<SoftwareGoLiveItem['category']>('infra');

  const milestoneById = useMemo(
    () => new Map(project.milestones.map((m) => [m.id, m])),
    [project.milestones]
  );

  const allBugs = useMemo(
    () => project.workItems.filter((w) => w.type === 'bug'),
    [project.workItems]
  );

  const counts = useMemo(() => {
    const open = allBugs.filter((b) => b.status !== 'done');
    return {
      critical: open.filter((b) => b.severity === 'critical').length,
      major: open.filter((b) => b.severity === 'major').length,
      minor: open.filter((b) => b.severity === 'minor').length,
      cosmetic: open.filter((b) => b.severity === 'cosmetic').length,
      resolved: allBugs.filter((b) => b.status === 'done').length,
    };
  }, [allBugs]);

  const visibleBugs = useMemo(() => {
    return allBugs.filter((b) => {
      if (statusFilter === 'open' && b.status === 'done') return false;
      if (statusFilter === 'resolved' && b.status !== 'done') return false;
      if (severityFilter !== 'all' && b.severity !== severityFilter) return false;
      return true;
    });
  }, [allBugs, statusFilter, severityFilter]);

  const testCases = project.testCases || [];
  const goLiveItems = project.goLiveChecklist || [];

  // Métricas de calidad por hito
  const qualityMetrics = useMemo(() => {
    const byMilestone = project.milestones.map((m) => {
      const mItems = project.workItems.filter((w) => w.milestoneId === m.id);
      const features = mItems.filter((w) => w.type !== 'bug').length;
      const bugs = mItems.filter((w) => w.type === 'bug');
      const reopened = bugs.filter((b) => (b.reopenCount || 0) > 0).length;
      const resolvedDiffs = bugs
        .filter((b) => b.resolvedAt && b.createdAt)
        .map((b) => (new Date(b.resolvedAt!).getTime() - new Date(b.createdAt).getTime()) / 3600000)
        .filter((h) => Number.isFinite(h) && h >= 0);
      const mttr =
        resolvedDiffs.length > 0
          ? resolvedDiffs.reduce((a, b) => a + b, 0) / resolvedDiffs.length
          : null;
      return {
        milestone: m,
        bugsCount: bugs.length,
        openCount: bugs.filter((b) => b.status !== 'done').length,
        bugsPerFeature: features > 0 ? (bugs.length / features).toFixed(2) : bugs.length > 0 ? '∞' : '0.00',
        mttrHours: mttr !== null ? `${mttr.toFixed(1)}h` : '—',
        reopenRate: bugs.length > 0 ? `${Math.round((reopened / bugs.length) * 100)}%` : '0%',
      };
    });

    const allDiffs = allBugs
      .filter((b) => b.resolvedAt && b.createdAt)
      .map((b) => (new Date(b.resolvedAt!).getTime() - new Date(b.createdAt).getTime()) / 3600000)
      .filter((h) => Number.isFinite(h) && h >= 0);
    const globalMttr =
      allDiffs.length > 0 ? `${(allDiffs.reduce((a, b) => a + b, 0) / allDiffs.length).toFixed(1)}h` : '—';
    const totalReopened = allBugs.filter((b) => (b.reopenCount || 0) > 0).length;
    const globalReopenRate = allBugs.length > 0 ? `${Math.round((totalReopened / allBugs.length) * 100)}%` : '0%';
    const totalFeatures = project.workItems.filter((w) => w.type !== 'bug').length;
    const globalBugsPerFeature = totalFeatures > 0 ? (allBugs.length / totalFeatures).toFixed(2) : '0.00';

    return { byMilestone, globalMttr, globalReopenRate, globalBugsPerFeature };
  }, [project.milestones, project.workItems, allBugs]);

  const handleInitGoLive = async () => {
    const seeded: SoftwareGoLiveItem[] = DEFAULT_GOLIVE_ITEMS.map((item, idx) => ({
      id: `gl_${Date.now()}_${idx}`,
      category: item.category,
      label: item.label,
      completed: false,
    }));
    await onSaveGoLiveChecklist(seeded);
  };

  const handleToggleGoLive = async (id: string) => {
    const next = goLiveItems.map((g) =>
      g.id === id
        ? { ...g, completed: !g.completed, checkedAt: !g.completed ? new Date().toISOString() : undefined }
        : g
    );
    await onSaveGoLiveChecklist(next);
  };

  const handleAddGoLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoLiveLabel.trim()) return;
    const next: SoftwareGoLiveItem[] = [
      ...goLiveItems,
      {
        id: `gl_${Date.now()}`,
        category: newGoLiveCat,
        label: newGoLiveLabel.trim(),
        completed: false,
      },
    ];
    await onSaveGoLiveChecklist(next);
    setNewGoLiveLabel('');
  };

  return (
    <div className="space-y-4">
      {/* Sub-navegación QA + Exportaciones + Política de Bloqueo Crítico */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'bugs' as const, label: `Bugs & Re-test (${allBugs.length})`, icon: Bug },
            { id: 'test_cases' as const, label: `Casos de Prueba (${testCases.length})`, icon: ClipboardCheck },
            { id: 'go_live' as const, label: `Go-Live (${goLiveItems.filter((g) => g.completed).length}/${goLiveItems.length})`, icon: Rocket },
            { id: 'metrics' as const, label: 'Métricas QA', icon: BarChart3 },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition ${
                  subTab === t.id
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <label
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-rose-500/25 bg-rose-500/5 text-[11px] font-bold text-rose-700 dark:text-rose-300 cursor-pointer"
              title="Impide aprobar un hito si tiene bugs de severidad Crítica abiertos"
            >
              <input
                type="checkbox"
                checked={Boolean(project.blockMilestoneCloseOnCriticalBugs)}
                onChange={(e) => onToggleBlockOnCriticalBugs(e.target.checked)}
                className="w-3.5 h-3.5 accent-rose-600"
              />
              <Lock className="w-3 h-3" /> Bloquear cierre con Críticos
            </label>
          )}
          <button
            type="button"
            onClick={() => exportQaReportPdf(project)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-rose-500" /> PDF
          </button>
          <button
            type="button"
            onClick={() => exportQaReportCsv(project)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Excel
          </button>
        </div>
      </div>

      {/* SUBTAB 1: BUGS & RE-TESTING */}
      {subTab === 'bugs' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(
              [
                { key: 'critical', label: 'Críticos', val: counts.critical, color: 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/5' },
                { key: 'major', label: 'Mayores', val: counts.major, color: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5' },
                { key: 'minor', label: 'Menores', val: counts.minor, color: 'text-sky-600 dark:text-sky-400 border-sky-500/25 bg-sky-500/5' },
                { key: 'cosmetic', label: 'Cosméticos', val: counts.cosmetic, color: 'text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 bg-slate-500/5' },
              ] as const
            ).map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => setSeverityFilter((prev) => (prev === card.key ? 'all' : card.key))}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${card.color} ${
                  severityFilter === card.key ? 'ring-2 ring-indigo-500/40' : ''
                }`}
              >
                <p className="text-[11px] font-bold opacity-80">{card.label}</p>
                <p className="text-2xl font-black mt-0.5">{card.val}</p>
              </button>
            ))}

            <div className="p-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
              <p className="text-[11px] font-bold opacity-80">Verificados / Resueltos</p>
              <p className="text-2xl font-black mt-0.5">{counts.resolved}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'open', label: 'Abiertos' },
                  { id: 'resolved', label: 'Resueltos' },
                  { id: 'all', label: 'Todos' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => onAddBug()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Reportar Bug / QA
              </button>
            )}
          </div>

          {visibleBugs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
              <AlertOctagon className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-extrabold text-slate-800 dark:text-white">
                ¡Sin bugs pendientes en esta vista!
              </p>
              <p className="text-xs text-slate-500">
                Puedes reportar incidencias con capturas Ctrl+V, anotaciones, entorno y logs cURL.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleBugs.map((bug) => {
                const sevMeta = BUG_SEVERITY_META[bug.severity || 'major'];
                const qaSt = bug.qaVerificationStatus || (bug.status === 'done' ? 'qa_verified' : 'open');
                const qaMeta = QA_STATUS_META[qaSt];
                const ms = milestoneById.get(bug.milestoneId);
                return (
                  <div
                    key={bug.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          {bug.code}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sevMeta.badge}`}>
                          {sevMeta.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${qaMeta.cls}`}>
                          {qaMeta.label}
                        </span>
                        {(bug.reopenCount || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                            Reabierto {bug.reopenCount}x
                          </span>
                        )}
                        {ms && (
                          <span className="text-[10px] font-bold text-slate-400">· {ms.code}</span>
                        )}
                        {bug.bugEnvironment?.browser && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {bug.bugEnvironment.browser}
                            {bug.bugEnvironment.os ? ` / ${bug.bugEnvironment.os}` : ''}
                            {bug.bugEnvironment.buildVersion ? ` · ${bug.bugEnvironment.buildVersion}` : ''}
                          </span>
                        )}
                        {bug.consoleLogs && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                            <Terminal className="w-3 h-3" /> logs
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onEditWorkItem(bug)}
                        className="text-sm font-extrabold text-slate-900 dark:text-white hover:text-indigo-600 text-left cursor-pointer"
                      >
                        {bug.title}
                      </button>

                      {bug.stepsToReproduce && (
                        <p className="text-xs text-slate-500 line-clamp-1">{bug.stepsToReproduce}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {bug.evidenceUrl && (
                        <a
                          href={bug.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600"
                          title="Abrir evidencia"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {canManage && qaSt !== 'dev_resolved' && bug.status !== 'done' && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateWorkItem(bug.id, {
                              qaVerificationStatus: 'dev_resolved',
                              status: 'qa_testing',
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[11px] font-bold hover:bg-sky-500/25 cursor-pointer"
                        >
                          Resuelto Dev
                        </button>
                      )}
                      {canManage && bug.status !== 'done' && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateWorkItem(bug.id, {
                              qaVerificationStatus: 'qa_verified',
                              status: 'done',
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Verificar QA
                        </button>
                      )}
                      {canManage && (qaSt === 'dev_resolved' || bug.status === 'done') && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateWorkItem(bug.id, {
                              qaVerificationStatus: 'reopened',
                              status: 'todo',
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[11px] font-bold hover:bg-rose-500/25 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Reabrir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SUBTAB 2: MATRIZ DE CASOS DE PRUEBA (TEST CASES) */}
      {subTab === 'test_cases' && (
        <div className="space-y-4">
          {canManage && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!tcTitle.trim()) return;
                await onCreateTestCase({
                  milestoneId: tcMilestoneId || project.milestones[0]?.id || '',
                  title: tcTitle.trim(),
                  steps: tcSteps.trim(),
                  expectedResult: tcExpected.trim(),
                });
                setTcTitle('');
                setTcSteps('');
                setTcExpected('');
              }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
            >
              <input
                type="text"
                required
                value={tcTitle}
                onChange={(e) => setTcTitle(e.target.value)}
                placeholder="Caso de prueba (ej. Login con 2FA)"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
              />
              <select
                value={tcMilestoneId}
                onChange={(e) => setTcMilestoneId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
              >
                {project.milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.title}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={tcSteps}
                onChange={(e) => setTcSteps(e.target.value)}
                placeholder="Pasos breves..."
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tcExpected}
                  onChange={(e) => setTcExpected(e.target.value)}
                  placeholder="Resultado esperado..."
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold cursor-pointer shrink-0"
                >
                  + Caso
                </button>
              </div>
            </form>
          )}

          {testCases.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-xs text-slate-400">
              Aún no hay casos de prueba registrados. Agrega los escenarios clave de cada hito para validar Pass / Fail.
            </div>
          ) : (
            <div className="space-y-2">
              {testCases.map((tc) => {
                const ms = milestoneById.get(tc.milestoneId);
                return (
                  <div
                    key={tc.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          {tc.code}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">{tc.title}</span>
                        {ms && <span className="text-[10px] font-bold text-slate-400">· {ms.code}</span>}
                      </div>
                      {(tc.steps || tc.expectedResult) && (
                        <p className="text-[11px] text-slate-500">
                          {tc.steps ? `Pasos: ${tc.steps}` : ''}
                          {tc.steps && tc.expectedResult ? ' · ' : ''}
                          {tc.expectedResult ? `Esperado: ${tc.expectedResult}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {(
                        [
                          { st: 'pass', label: 'Pass', cls: 'bg-emerald-600 text-white' },
                          { st: 'fail', label: 'Fail', cls: 'bg-rose-600 text-white' },
                          { st: 'pending', label: 'Pending', cls: 'bg-slate-600 text-white' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.st}
                          type="button"
                          disabled={!canManage}
                          onClick={() => onUpdateTestCase(tc.id, { status: opt.st })}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition ${
                            tc.status === opt.st
                              ? opt.cls
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}

                      {tc.status === 'fail' && canManage && (
                        <button
                          type="button"
                          onClick={() =>
                            onAddBug({
                              type: 'bug',
                              milestoneId: tc.milestoneId,
                              title: `[${tc.code}] Fallo en: ${tc.title}`,
                              stepsToReproduce: tc.steps,
                              expectedBehavior: tc.expectedResult,
                              severity: 'major',
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[11px] font-extrabold hover:bg-rose-500/25 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Bug className="w-3 h-3" /> Crear Bug
                        </button>
                      )}

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onDeleteTestCase(tc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: CHECKLIST GO-LIVE / PRE-PRODUCCIÓN */}
      {subTab === 'go_live' && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Rocket className="w-4 h-4 text-emerald-500" />
                Checklist de Go-Live y Pase a Producción
              </h4>
              <p className="text-xs text-slate-500">
                Verifica SEO, SSL, backups, analítica, variables de entorno y seguridad antes de lanzar.
              </p>
            </div>
            {goLiveItems.length === 0 && canManage && (
              <button
                type="button"
                onClick={handleInitGoLive}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
              >
                Cargar Checklist Estándar (10 puntos)
              </button>
            )}
          </div>

          {goLiveItems.length > 0 && (
            <div className="space-y-2">
              {goLiveItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition ${
                    item.completed
                      ? 'bg-emerald-500/5 border-emerald-500/25'
                      : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() => handleToggleGoLive(item.id)}
                    className="flex items-center gap-2.5 text-left flex-1 cursor-pointer"
                  >
                    {item.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                      {item.category}
                    </span>
                    <span className={`text-xs font-bold ${item.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {item.label}
                    </span>
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onSaveGoLiveChecklist(goLiveItems.filter((g) => g.id !== item.id))}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canManage && (
            <form onSubmit={handleAddGoLive} className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <select
                value={newGoLiveCat}
                onChange={(e) => setNewGoLiveCat(e.target.value as SoftwareGoLiveItem['category'])}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
              >
                <option value="infra">Infra</option>
                <option value="security">Seguridad</option>
                <option value="seo">SEO</option>
                <option value="performance">Rendimiento</option>
                <option value="ux">UX / Responsive</option>
                <option value="analytics">Analytics</option>
              </select>
              <input
                type="text"
                value={newGoLiveLabel}
                onChange={(e) => setNewGoLiveLabel(e.target.value)}
                placeholder="Agregar verificación personalizada de Go-Live..."
                className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold cursor-pointer"
              >
                + Añadir
              </button>
            </form>
          )}
        </div>
      )}

      {/* SUBTAB 4: MÉTRICAS DE CALIDAD POR HITO */}
      {subTab === 'metrics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Bugs por Feature</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {qualityMetrics.globalBugsPerFeature}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase">MTTR (Tiempo Medio Resolución)</p>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {qualityMetrics.globalMttr}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase">Ratio de Reapertura QA</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {qualityMetrics.globalReopenRate}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="text-left px-4 py-3 font-extrabold">Hito</th>
                  <th className="text-center px-3 py-3 font-extrabold">Bugs Total</th>
                  <th className="text-center px-3 py-3 font-extrabold">Abiertos</th>
                  <th className="text-center px-3 py-3 font-extrabold">Bugs / Feature</th>
                  <th className="text-center px-3 py-3 font-extrabold">MTTR</th>
                  <th className="text-center px-3 py-3 font-extrabold">Reapertura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {qualityMetrics.byMilestone.map((row) => (
                  <tr key={row.milestone.id}>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">
                      {row.milestone.code} — {row.milestone.title}
                    </td>
                    <td className="text-center px-3 py-3 font-black">{row.bugsCount}</td>
                    <td className="text-center px-3 py-3 font-bold text-rose-600">{row.openCount}</td>
                    <td className="text-center px-3 py-3">{row.bugsPerFeature}</td>
                    <td className="text-center px-3 py-3 font-mono">{row.mttrHours}</td>
                    <td className="text-center px-3 py-3">{row.reopenRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
