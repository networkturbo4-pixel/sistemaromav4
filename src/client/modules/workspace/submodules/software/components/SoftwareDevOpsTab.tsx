import React, { useState } from 'react';
import {
  Activity,
  GitBranch,
  Tag,
  Lock,
  Eye,
  EyeOff,
  Server,
  FolderOpen,
  FileWarning,
  Plug,
  CheckSquare,
  Square,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  GitPullRequest,
  Shield,
} from 'lucide-react';
import {
  SoftwareProject,
  SoftwareInfraItem,
  SoftwarePostMortem,
  SoftwareExternalIntegration,
  SoftwarePrChecklistItem,
} from '../../../../../../shared/types';

interface SoftwareDevOpsTabProps {
  project: SoftwareProject;
  canManage: boolean;
  onUpdateProjectFields: (updates: Partial<SoftwareProject>) => Promise<void>;
  onRotateWebhookSecret: () => Promise<void>;
  onRunHealthCheck: () => Promise<void>;
  onCreateRelease: (payload: {
    version: string;
    environment: 'staging' | 'production';
    notes: string;
    workItemIds: string[];
  }) => Promise<void>;
  onDeleteRelease: (releaseId: string) => Promise<void>;
  onCreateVaultCredential: (payload: {
    label: string;
    category: string;
    hostOrUrl?: string;
    username?: string;
    secret: string;
    notes?: string;
  }) => Promise<void>;
  onRevealVaultCredential: (credId: string) => Promise<string | null>;
  onDeleteVaultCredential: (credId: string) => Promise<void>;
  onScaffoldDriveSubfolders: () => Promise<void>;
}

const DEFAULT_PR_CHECKLIST = [
  'Código compila sin errores ni warnings de TypeScript',
  'Pruebas unitarias / QA manual pasadas en Staging',
  'Sin credenciales ni claves privadas hardcodeadas',
  'Revisión de seguridad (permisos, validación de inputs, SQL/XSS)',
  'Responsive y modo oscuro verificados',
];

export const SoftwareDevOpsTab: React.FC<SoftwareDevOpsTabProps> = ({
  project,
  canManage,
  onUpdateProjectFields,
  onRotateWebhookSecret,
  onRunHealthCheck,
  onCreateRelease,
  onDeleteRelease,
  onCreateVaultCredential,
  onRevealVaultCredential,
  onDeleteVaultCredential,
  onScaffoldDriveSubfolders,
}) => {
  const [section, setSection] = useState<'overview' | 'releases' | 'vault' | 'infra' | 'postmortems'>('overview');
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Release form
  const [relVersion, setRelVersion] = useState('');
  const [relEnv, setRelEnv] = useState<'staging' | 'production'>('production');
  const [relNotes, setRelNotes] = useState('');
  const [relItemIds, setRelItemIds] = useState<string[]>([]);

  // Vault form & reveal state
  const [vLabel, setVLabel] = useState('');
  const [vCat, setVCat] = useState('server');
  const [vHost, setVHost] = useState('');
  const [vUser, setVUser] = useState('');
  const [vSecret, setVSecret] = useState('');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});

  // Infra form
  const [infCat, setInfCat] = useState<SoftwareInfraItem['category']>('hosting');
  const [infProvider, setInfProvider] = useState('');
  const [infVersion, setInfVersion] = useState('');
  const [infNotes, setInfNotes] = useState('');

  // External integrations form
  const [intName, setIntName] = useState('');
  const [intCat, setIntCat] = useState<SoftwareExternalIntegration['category']>('payment');
  const [intMode, setIntMode] = useState<SoftwareExternalIntegration['mode']>('sandbox');
  const [intVars, setIntVars] = useState('');

  // Post-mortem form
  const [pmTitle, setPmTitle] = useState('');
  const [pmSev, setPmSev] = useState<SoftwarePostMortem['severity']>('sev2');
  const [pmRoot, setPmRoot] = useState('');
  const [pmActions, setPmActions] = useState('');

  // PR checklist custom
  const [newPrItem, setNewPrItem] = useState('');

  const webhookUrl = project.gitWebhookSecret
    ? `${window.location.origin}/api/workspace/software/webhooks/git/${project.id}/${project.gitWebhookSecret}`
    : '';

  const prChecklist = project.prChecklist || [];
  const infraList = project.infrastructureInventory || [];
  const integrations = project.externalIntegrations || [];
  const postMortems = project.postMortems || [];
  const releases = project.releases || [];
  const vaultList = project.vaultCredentials || [];

  const handleHealth = async () => {
    setCheckingHealth(true);
    try {
      await onRunHealthCheck();
    } finally {
      setCheckingHealth(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-navegación DevOps */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3">
        {[
          { id: 'overview' as const, label: 'Uptime, Git Webhook & Drive', icon: Activity },
          { id: 'releases' as const, label: `Releases (${releases.length}) & PR`, icon: Tag },
          { id: 'vault' as const, label: `Bóveda Cifrada (${vaultList.length})`, icon: Lock },
          { id: 'infra' as const, label: `Infra (${infraList.length}) & APIs (${integrations.length})`, icon: Server },
          { id: 'postmortems' as const, label: `Post-mortems (${postMortems.length})`, icon: FileWarning },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSection(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition ${
                section === t.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* 1. UPTIME + GIT WEBHOOK + DRIVE SUBFOLDERS */}
      {section === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Monitor Uptime / Health Check */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" /> Monitor de Uptime / Health Check
                </h4>
                <p className="text-xs text-slate-500">Verifica disponibilidad HTTP y latencia de Staging y Producción.</p>
              </div>
              <button
                type="button"
                disabled={checkingHealth}
                onClick={handleHealth}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
                Verificar ahora
              </button>
            </div>

            {(['staging', 'production'] as const).map((envKey) => {
              const url = envKey === 'staging' ? project.environments?.stagingUrl : project.environments?.productionUrl;
              const check = project.healthChecks?.[envKey];
              return (
                <div
                  key={envKey}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 capitalize">
                      {envKey === 'staging' ? 'Staging / Pruebas' : 'Producción'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{url || 'URL no configurada en el proyecto'}</p>
                  </div>
                  {check ? (
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          check.ok
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${check.ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {check.ok ? `ONLINE (${check.statusCode})` : check.error || `HTTP ${check.statusCode}`}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {check.latencyMs}ms · {new Date(check.checkedAt).toLocaleTimeString('es-PE')}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">Sin verificar</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Subcarpetas automáticas Google Drive */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-500" /> Estructura de Subcarpetas Drive
                </h4>
                <p className="text-xs text-slate-500">
                  Organiza automáticamente 01_Discovery, 02_Diseño, 03_Entregables y 04_QA.
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={onScaffoldDriveSubfolders}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold cursor-pointer shrink-0"
                >
                  Generar Carpetas
                </button>
              )}
            </div>

            {project.driveSubfolders && project.driveSubfolders.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {project.driveSubfolders.map((sf) => (
                  <a
                    key={sf.id}
                    href={sf.webViewLink || project.driveFolderLink || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-2xl border border-blue-500/25 bg-blue-500/5 hover:bg-blue-500/10 flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-300"
                  >
                    <FolderOpen className="w-4 h-4 shrink-0" />
                    <span className="truncate">{sf.name}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">
                Aún no se han generado las subcarpetas estándar para este proyecto.
              </p>
            )}
          </div>

          {/* Webhook GitHub / GitLab / Bitbucket */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-indigo-500" /> Webhook Git (GitHub / GitLab / Bitbucket)
                </h4>
                <p className="text-xs text-slate-500">
                  Menciona el código de tarea (ej. <code>DEV-04</code> o <code>fixes BUG-02</code>) en tus commits o PRs para mover tarjetas automáticamente.
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={onRotateWebhookSecret}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold cursor-pointer shrink-0"
                >
                  {webhookUrl ? 'Rotar Secret' : 'Generar URL de Webhook'}
                </button>
              )}
            </div>

            {webhookUrl && (
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl).catch(() => {});
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 1800);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedWebhook ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}

            {project.gitEvents && project.gitEvents.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-extrabold uppercase text-slate-400">Últimos Eventos Git Recibidos</p>
                {project.gitEvents.slice(0, 6).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="truncate">
                      <strong className="text-indigo-600 dark:text-indigo-400">[{ev.provider}]</strong> {ev.message}{' '}
                      {ev.matchedCodes.length > 0 && (
                        <span className="font-mono font-bold text-emerald-600">({ev.matchedCodes.join(', ')})</span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {ev.author} · {new Date(ev.receivedAt).toLocaleString('es-PE')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. RELEASES & CHECKLIST PR */}
      {section === 'releases' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-500" /> Historial de Releases / Versiones
            </h4>

            {canManage && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!relVersion.trim()) return;
                  await onCreateRelease({
                    version: relVersion.trim(),
                    environment: relEnv,
                    notes: relNotes.trim(),
                    workItemIds: relItemIds,
                  });
                  setRelVersion('');
                  setRelNotes('');
                  setRelItemIds([]);
                }}
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={relVersion}
                    onChange={(e) => setRelVersion(e.target.value)}
                    placeholder="Versión (ej. v1.2.0)"
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                  <select
                    value={relEnv}
                    onChange={(e) => setRelEnv(e.target.value as 'staging' | 'production')}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value="staging">Staging</option>
                    <option value="production">Producción</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
                  >
                    + Publicar Release
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={relNotes}
                  onChange={(e) => setRelNotes(e.target.value)}
                  placeholder="Notas de release (cambios incluidos, migraciones, etc.)..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs resize-none"
                />
                {project.workItems.filter((w) => w.status === 'done').length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.workItems
                      .filter((w) => w.status === 'done')
                      .slice(0, 14)
                      .map((w) => {
                        const active = relItemIds.includes(w.id);
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() =>
                              setRelItemIds((prev) =>
                                prev.includes(w.id) ? prev.filter((x) => x !== w.id) : [...prev, w.id]
                              )
                            }
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${
                              active
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {w.code}
                          </button>
                        );
                      })}
                  </div>
                )}
              </form>
            )}

            <div className="space-y-2">
              {releases.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin releases registrados todavía.</p>
              ) : (
                releases.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-mono text-xs font-black">
                          {rel.version}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            rel.environment === 'production'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {rel.environment}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {rel.deployedBy} · {new Date(rel.deployedAt).toLocaleDateString('es-PE')}
                        </span>
                      </div>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onDeleteRelease(rel.id)}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {rel.notes && <p className="text-xs text-slate-600 dark:text-slate-300">{rel.notes}</p>}
                    {rel.workItemIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {rel.workItemIds.map((wid) => {
                          const item = project.workItems.find((w) => w.id === wid);
                          return item ? (
                            <span key={wid} className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                              {item.code}: {item.title}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checklist de Pull Request / Code Review */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-indigo-500" /> Checklist PR / Code Review
              </h4>
              {prChecklist.length === 0 && canManage && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateProjectFields({
                      prChecklist: DEFAULT_PR_CHECKLIST.map((label, idx) => ({
                        id: `pr_${Date.now()}_${idx}`,
                        label,
                        completed: false,
                      })),
                    })
                  }
                  className="text-[11px] font-extrabold text-indigo-600 hover:underline cursor-pointer"
                >
                  Cargar estándar
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {prChecklist.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() =>
                      onUpdateProjectFields({
                        prChecklist: prChecklist.map((p) =>
                          p.id === item.id ? { ...p, completed: !p.completed } : p
                        ),
                      })
                    }
                    className="flex items-center gap-2 text-left flex-1 cursor-pointer"
                  >
                    {item.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className={item.completed ? 'line-through text-slate-400' : ''}>{item.label}</span>
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateProjectFields({
                          prChecklist: prChecklist.filter((p) => p.id !== item.id),
                        })
                      }
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canManage && (
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newPrItem}
                  onChange={(e) => setNewPrItem(e.target.value)}
                  placeholder="Agregar regla de Code Review..."
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPrItem.trim()) return;
                    const next: SoftwarePrChecklistItem[] = [
                      ...prChecklist,
                      { id: `pr_${Date.now()}`, label: newPrItem.trim(), completed: false },
                    ];
                    onUpdateProjectFields({ prChecklist: next });
                    setNewPrItem('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. BÓVEDA CIFRADA DE CREDENCIALES (AES-256-GCM) */}
      {section === 'vault' && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" /> Bóveda Cifrada de Credenciales (AES-256-GCM)
            </h4>
            <p className="text-xs text-slate-500">
              Accesos de servidor, BD, cPanel y cuentas de prueba cifrados en servidor. Cada revelación queda registrada en la Auditoría.
            </p>
          </div>

          {canManage && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!vLabel.trim() || !vSecret) return;
                await onCreateVaultCredential({
                  label: vLabel.trim(),
                  category: vCat,
                  hostOrUrl: vHost.trim(),
                  username: vUser.trim(),
                  secret: vSecret,
                });
                setVLabel('');
                setVHost('');
                setVUser('');
                setVSecret('');
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20"
            >
              <input
                type="text"
                required
                value={vLabel}
                onChange={(e) => setVLabel(e.target.value)}
                placeholder="Etiqueta (ej. VPS Prod SSH)"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              />
              <select
                value={vCat}
                onChange={(e) => setVCat(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value="server">Servidor / SSH</option>
                <option value="database">Base de Datos</option>
                <option value="cpanel">cPanel / Hosting</option>
                <option value="api_key">API Key</option>
                <option value="test_account">Cuenta Prueba</option>
              </select>
              <input
                type="text"
                value={vHost}
                onChange={(e) => setVHost(e.target.value)}
                placeholder="Host / URL"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                type="text"
                value={vUser}
                onChange={(e) => setVUser(e.target.value)}
                placeholder="Usuario"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                type="password"
                required
                value={vSecret}
                onChange={(e) => setVSecret(e.target.value)}
                placeholder="Contraseña / Secret *"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold cursor-pointer"
              >
                + Guardar
              </button>
            </form>
          )}

          <div className="space-y-2">
            {vaultList.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Bóveda vacía.</p>
            ) : (
              vaultList.map((cred) => {
                const plain = revealedSecrets[cred.id];
                return (
                  <div
                    key={cred.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          {cred.category}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">{cred.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {cred.hostOrUrl ? `${cred.hostOrUrl} · ` : ''}
                        {cred.username ? `user: ${cred.username} · ` : ''}
                        secret: {plain ? <strong className="text-emerald-600 dark:text-emerald-400">{plain}</strong> : '••••••••••••'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              if (plain) {
                                setRevealedSecrets((prev) => {
                                  const next = { ...prev };
                                  delete next[cred.id];
                                  return next;
                                });
                              } else {
                                const dec = await onRevealVaultCredential(cred.id);
                                if (dec !== null) {
                                  setRevealedSecrets((prev) => ({ ...prev, [cred.id]: dec }));
                                }
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            {plain ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {plain ? 'Ocultar' : 'Revelar'}
                          </button>
                          {plain && (
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(plain).catch(() => {})}
                              className="p-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 cursor-pointer"
                              title="Copiar secreto"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteVaultCredential(cred.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. INVENTARIO DE INFRAESTRUCTURA + MATRIZ DE INTEGRACIONES EXTERNAS */}
      {section === 'infra' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-500" /> Inventario de Infraestructura
            </h4>
            {canManage && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={infCat}
                  onChange={(e) => setInfCat(e.target.value as SoftwareInfraItem['category'])}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                >
                  <option value="hosting">Hosting / VPS</option>
                  <option value="dns">DNS / Dominio</option>
                  <option value="database">Base de Datos</option>
                  <option value="cicd">CI/CD</option>
                  <option value="runtime">Runtime / Stack</option>
                  <option value="storage">Storage / CDN</option>
                </select>
                <input
                  type="text"
                  value={infProvider}
                  onChange={(e) => setInfProvider(e.target.value)}
                  placeholder="Proveedor (AWS, Vercel, Cloudflare...)"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
                <input
                  type="text"
                  value={infVersion}
                  onChange={(e) => setInfVersion(e.target.value)}
                  placeholder="Versión / Plan (Node 22, PG 16...)"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={infNotes}
                    onChange={(e) => setInfNotes(e.target.value)}
                    placeholder="Región / Notas"
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!infProvider.trim()) return;
                      onUpdateProjectFields({
                        infrastructureInventory: [
                          ...infraList,
                          {
                            id: `inf_${Date.now()}`,
                            category: infCat,
                            provider: infProvider.trim(),
                            versionOrPlan: infVersion.trim(),
                            notes: infNotes.trim(),
                          },
                        ],
                      });
                      setInfProvider('');
                      setInfVersion('');
                      setInfNotes('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-extrabold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              {infraList.map((inf) => (
                <div key={inf.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 mr-1.5">
                      {inf.category}
                    </span>
                    <strong>{inf.provider}</strong> {inf.versionOrPlan && `· ${inf.versionOrPlan}`}
                    {inf.notes && <span className="text-slate-400"> ({inf.notes})</span>}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateProjectFields({
                          infrastructureInventory: infraList.filter((x) => x.id !== inf.id),
                        })
                      }
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Matriz de Integraciones Externas (Sandbox / Producción) */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Plug className="w-4 h-4 text-violet-500" /> Matriz de Variables e Integraciones
            </h4>
            {canManage && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={intName}
                  onChange={(e) => setIntName(e.target.value)}
                  placeholder="Servicio (Stripe, Culqi, Resend...)"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
                <select
                  value={intMode}
                  onChange={(e) => setIntMode(e.target.value as SoftwareExternalIntegration['mode'])}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                >
                  <option value="sandbox">Sandbox / Test</option>
                  <option value="production">Producción</option>
                  <option value="pending">Pendiente</option>
                </select>
                <input
                  type="text"
                  value={intVars}
                  onChange={(e) => setIntVars(e.target.value)}
                  placeholder="Variables ENV (STRIPE_KEY, SMTP_HOST)"
                  className="col-span-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono"
                />
                <select
                  value={intCat}
                  onChange={(e) => setIntCat(e.target.value as SoftwareExternalIntegration['category'])}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                >
                  <option value="payment">Pasarela Pago</option>
                  <option value="smtp">SMTP / Correo</option>
                  <option value="webhook">Webhook</option>
                  <option value="api">API Tercero</option>
                  <option value="auth">Auth / OAuth</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!intName.trim()) return;
                    onUpdateProjectFields({
                      externalIntegrations: [
                        ...integrations,
                        {
                          id: `ext_${Date.now()}`,
                          name: intName.trim(),
                          category: intCat,
                          mode: intMode,
                          envVars: intVars.trim(),
                        },
                      ],
                    });
                    setIntName('');
                    setIntVars('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-extrabold cursor-pointer"
                >
                  + Añadir Integración
                </button>
              </div>
            )}
            <div className="space-y-1.5">
              {integrations.map((ext) => (
                <div key={ext.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <strong>{ext.name}</strong>
                      <button
                        type="button"
                        disabled={!canManage}
                        onClick={() => {
                          const nextMode = ext.mode === 'sandbox' ? 'production' : ext.mode === 'production' ? 'pending' : 'sandbox';
                          onUpdateProjectFields({
                            externalIntegrations: integrations.map((x) =>
                              x.id === ext.id ? { ...x, mode: nextMode } : x
                            ),
                          });
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase cursor-pointer ${
                          ext.mode === 'production'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : ext.mode === 'sandbox'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {ext.mode}
                      </button>
                    </div>
                    {ext.envVars && <p className="text-[10px] font-mono text-slate-400 truncate">{ext.envVars}</p>}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateProjectFields({
                          externalIntegrations: integrations.filter((x) => x.id !== ext.id),
                        })
                      }
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. REGISTRO DE POST-MORTEMS */}
      {section === 'postmortems' && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-rose-500" /> Post-mortems (Incidentes Post-Lanzamiento)
          </h4>

          {canManage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/20">
              <input
                type="text"
                value={pmTitle}
                onChange={(e) => setPmTitle(e.target.value)}
                placeholder="Título del incidente (ej. Caída webhook pagos 15 min)"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              />
              <select
                value={pmSev}
                onChange={(e) => setPmSev(e.target.value as SoftwarePostMortem['severity'])}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value="sev1">SEV-1 (Crítico / Caída Total)</option>
                <option value="sev2">SEV-2 (Degradación Parcial)</option>
                <option value="sev3">SEV-3 (Menor)</option>
              </select>
              <textarea
                rows={2}
                value={pmRoot}
                onChange={(e) => setPmRoot(e.target.value)}
                placeholder="Causa raíz..."
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs resize-none"
              />
              <textarea
                rows={2}
                value={pmActions}
                onChange={(e) => setPmActions(e.target.value)}
                placeholder="Acciones preventivas..."
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs resize-none"
              />
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!pmTitle.trim()) return;
                    const pm: SoftwarePostMortem = {
                      id: `pm_${Date.now()}`,
                      title: pmTitle.trim(),
                      severity: pmSev,
                      occurredAt: new Date().toISOString(),
                      rootCause: pmRoot.trim(),
                      preventiveActions: pmActions.trim(),
                      authorName: 'Equipo',
                      createdAt: new Date().toISOString(),
                    };
                    onUpdateProjectFields({ postMortems: [pm, ...postMortems] });
                    setPmTitle('');
                    setPmRoot('');
                    setPmActions('');
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer"
                >
                  + Registrar Post-mortem
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {postMortems.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sin incidentes post-lanzamiento registrados.</p>
            ) : (
              postMortems.map((pm) => (
                <div key={pm.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black uppercase">
                        {pm.severity}
                      </span>
                      <strong className="text-slate-900 dark:text-white">{pm.title}</strong>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProjectFields({
                            postMortems: postMortems.filter((x) => x.id !== pm.id),
                          })
                        }
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {pm.rootCause && (
                    <p className="text-slate-600 dark:text-slate-300">
                      <strong>Causa raíz:</strong> {pm.rootCause}
                    </p>
                  )}
                  {pm.preventiveActions && (
                    <p className="text-emerald-700 dark:text-emerald-300">
                      <strong>Acciones preventivas:</strong> {pm.preventiveActions}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
