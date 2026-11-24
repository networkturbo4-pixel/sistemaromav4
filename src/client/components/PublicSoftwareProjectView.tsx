import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  KeyRound,
  Code2,
  Globe,
  Figma,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  Bug,
  ThumbsUp,
  AlertCircle,
  Sun,
  Moon,
  Paperclip,
  MessageCircle,
  X,
  FileCode2,
} from 'lucide-react';
import { SoftwareMilestone } from '../../shared/types';
import { MILESTONE_STATUS_META, PROJECT_STATUS_META } from '../modules/workspace/submodules/software/templates';

interface PublicSoftwareProjectData {
  id: string;
  code: string;
  name: string;
  description: string;
  projectType: string;
  status: keyof typeof PROJECT_STATUS_META;
  clientName: string;
  brandName?: string;
  techLeadName?: string;
  techStack: string[];
  environments: {
    figmaUrl?: string;
    stagingUrl?: string;
    productionUrl?: string;
    docsUrl?: string;
  };
  startDate: string;
  targetEndDate: string;
  totalProgress: number;
  milestones: SoftwareMilestone[];
  workItemsSummary: Record<string, { total: number; done: number; bugsOpen: number }>;
  publicToken: string;
  allowClientComments: boolean;
  allowClientBugReport: boolean;
}

interface PublicSoftwareProjectViewProps {
  token: string;
}

export const PublicSoftwareProjectView: React.FC<PublicSoftwareProjectViewProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [meta, setMeta] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [project, setProject] = useState<PublicSoftwareProjectData | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  // Comentarios y reportes QA por hito
  const [authorName, setAuthorName] = useState('');
  const [commentTextByMilestone, setCommentTextByMilestone] = useState<Record<string, string>>({});
  const [isBugModeByMilestone, setIsBugModeByMilestone] = useState<Record<string, boolean>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);

  // Modal de Aprobación / Solicitud de Ajustes
  const [reviewModal, setReviewModal] = useState<{
    milestone: SoftwareMilestone;
    decision: 'approved' | 'changes_requested';
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const loadProject = useCallback(
    async (explicitPin?: string) => {
      setLoading(true);
      setError(null);
      try {
        const savedPin = explicitPin ?? sessionStorage.getItem(`dev_pin_${token}`) ?? '';
        const query = savedPin ? `?pin=${encodeURIComponent(savedPin)}` : '';
        const res = await fetch(`/api/workspace/software/public/${encodeURIComponent(token)}${query}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo cargar el proyecto.');
        }

        setTenant(data.tenant || null);

        if (data.isLocked) {
          setIsLocked(true);
          setMeta(data.meta || {});
          if (explicitPin) setPinError(true);
        } else if (data.project) {
          setIsLocked(false);
          setPinError(false);
          if (explicitPin) {
            sessionStorage.setItem(`dev_pin_${token}`, explicitPin);
          }
          setProject(data.project);
          setAuthorName((prev) => prev || data.project.clientName || '');
        }
      } catch (err: any) {
        setError(err.message || 'Error de conexión al cargar el roadmap.');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    await loadProject(pinInput.trim());
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal || !project) return;
    setSubmittingReview(true);
    try {
      const savedPin = sessionStorage.getItem(`dev_pin_${token}`) || '';
      const res = await fetch(
        `/api/workspace/software/public/${encodeURIComponent(token)}/milestones/${reviewModal.milestone.id}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(savedPin ? { 'x-software-pin': savedPin } : {}),
          },
          body: JSON.stringify({
            decision: reviewModal.decision,
            decidedBy: authorName.trim() || project.clientName || 'Cliente',
            notes: reviewNotes.trim(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo registrar tu respuesta.');
      if (data.project) setProject(data.project);
      setFeedbackBanner(
        reviewModal.decision === 'approved'
          ? `¡Hito "${reviewModal.milestone.title}" aprobado oficialmente! El equipo ha sido notificado.`
          : `Hemos enviado tus observaciones de "${reviewModal.milestone.title}" al equipo de desarrollo.`
      );
      setReviewModal(null);
      setReviewNotes('');
    } catch (err: any) {
      alert(err.message || 'Error al enviar revisión.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSendComment = async (milestoneId: string) => {
    const text = (commentTextByMilestone[milestoneId] || '').trim();
    if (!text || !project) return;
    setSubmittingCommentId(milestoneId);
    try {
      const savedPin = sessionStorage.getItem(`dev_pin_${token}`) || '';
      const isBugReport = Boolean(isBugModeByMilestone[milestoneId]);
      const res = await fetch(
        `/api/workspace/software/public/${encodeURIComponent(token)}/milestones/${milestoneId}/comment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(savedPin ? { 'x-software-pin': savedPin } : {}),
          },
          body: JSON.stringify({
            authorName: authorName.trim() || project.clientName || 'Cliente',
            text,
            isBugReport,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al publicar mensaje.');
      if (data.project) setProject(data.project);
      setCommentTextByMilestone((prev) => ({ ...prev, [milestoneId]: '' }));
      setIsBugModeByMilestone((prev) => ({ ...prev, [milestoneId]: false }));
      if (isBugReport) {
        setFeedbackBanner('Reporte QA registrado en el tablero del equipo de desarrollo.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al enviar comentario.');
    } finally {
      setSubmittingCommentId(null);
    }
  };

  const bgClass = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardClass = darkMode
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200/90';

  if (loading) {
    return (
      <div className={`min-h-dvh ${bgClass} flex flex-col items-center justify-center gap-3 p-6`}>
        <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center animate-pulse shadow-lg">
          <Code2 className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold opacity-70 uppercase tracking-wider">
          Cargando roadmap de desarrollo...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-dvh ${bgClass} flex items-center justify-center p-6`}>
        <div className={`max-w-md w-full rounded-3xl border p-8 text-center space-y-3 ${cardClass}`}>
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h1 className="text-lg font-black">Enlace no disponible</h1>
          <p className="text-xs opacity-70">{error}</p>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className={`min-h-dvh ${bgClass} flex items-center justify-center p-6`}>
        <div className={`max-w-md w-full rounded-3xl border p-7 shadow-xl space-y-5 ${cardClass}`}>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-cyan-500">
              {tenant?.name || 'Roadmap de Software'}
            </p>
            <h1 className="text-xl font-black">{meta?.name || 'Acceso Protegido'}</h1>
            <p className="text-xs opacity-70">
              Ingresa el PIN proporcionado por la agencia para consultar el avance y aprobar hitos.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3">
            <div className="relative">
              <KeyRound className="w-4 h-4 opacity-50 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Ingresa el PIN de acceso"
                autoFocus
                className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                  darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>
            {pinError && (
              <p className="text-xs font-bold text-rose-500 text-center">
                PIN incorrecto. Verifica con tu gestor de proyecto.
              </p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold cursor-pointer"
            >
              Desbloquear Roadmap
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const pStatus = PROJECT_STATUS_META[project.status] || PROJECT_STATUS_META.in_development;
  const approvedCount = project.milestones.filter((m) => m.status === 'approved').length;
  const reviewCount = project.milestones.filter((m) => m.status === 'client_review').length;
  const cleanWhatsapp = (tenant?.whatsapp || '').replace(/[^\d]/g, '');

  return (
    <div className={`min-h-dvh ${bgClass} pb-16 transition-colors duration-200`}>
      {/* Barra superior */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          darkMode ? 'bg-slate-950/85 border-slate-800' : 'bg-white/85 border-slate-200'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {(darkMode ? tenant?.logoDarkUrl || tenant?.logoLightUrl : tenant?.logoLightUrl || tenant?.logoDarkUrl) ? (
              <img
                src={darkMode ? tenant?.logoDarkUrl || tenant?.logoLightUrl : tenant?.logoLightUrl || tenant?.logoDarkUrl}
                alt={tenant?.name}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-black">
                <Code2 className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-black truncate">{tenant?.name || 'Desarrollo de Software'}</p>
              <p className="text-[10px] opacity-60 font-mono truncate">{project.code}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cleanWhatsapp && (
              <a
                href={`https://wa.me/${cleanWhatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 text-xs font-bold"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Contactar Agencia
              </a>
            )}
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className={`p-2 rounded-xl border cursor-pointer ${
                darkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
              }`}
              title="Cambiar tema"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {feedbackBanner && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 px-4 py-3 text-xs font-bold flex items-center justify-between gap-3">
            <span>{feedbackBanner}</span>
            <button type="button" onClick={() => setFeedbackBanner(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hero del proyecto */}
        <section className={`rounded-3xl border p-6 sm:p-8 shadow-sm space-y-5 ${cardClass}`}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${pStatus.badge}`}>
                  {pStatus.label}
                </span>
                <span className="text-xs opacity-60 font-semibold">
                  Cliente: {project.clientName}
                  {project.brandName ? ` · ${project.brandName}` : ''}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{project.name}</h1>
              {project.description && (
                <p className="text-xs sm:text-sm opacity-75 max-w-2xl leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>

            <div className="shrink-0 text-left md:text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">Avance Total</p>
              <p className="text-4xl font-black text-cyan-500">{project.totalProgress}%</p>
              <p className="text-[11px] opacity-60">
                {approvedCount} de {project.milestones.length} hitos aprobados
              </p>
            </div>
          </div>

          <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all duration-500"
              style={{ width: `${project.totalProgress}%` }}
            />
          </div>

          {/* Enlaces rápidos de prueba */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex flex-wrap gap-2">
              {project.environments?.stagingUrl && (
                <a
                  href={project.environments.stagingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Globe className="w-4 h-4" /> Probar Demo / Staging
                </a>
              )}
              {project.environments?.productionUrl && (
                <a
                  href={project.environments.productionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Globe className="w-4 h-4" /> Ver en Producción
                </a>
              )}
              {project.environments?.figmaUrl && (
                <a
                  href={project.environments.figmaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-2xl bg-pink-500/15 text-pink-500 border border-pink-500/25 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Figma className="w-4 h-4" /> Prototipo Figma
                </a>
              )}
              {project.environments?.docsUrl && (
                <a
                  href={project.environments.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-2xl bg-sky-500/15 text-sky-500 border border-sky-500/25 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <FileCode2 className="w-4 h-4" /> Documentación
                </a>
              )}
            </div>

            <div className="text-[11px] opacity-60 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Inicio: {project.startDate || '—'} · Entrega estimada: {project.targetEndDate || '—'}
            </div>
          </div>
        </section>

        {/* Banner si hay hitos esperando revisión del cliente */}
        {reviewCount > 0 && (
          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-300">
              Tienes {reviewCount} {reviewCount === 1 ? 'hito listo' : 'hitos listos'} para tu revisión y aprobación oficial.
            </p>
          </div>
        )}

        {/* Campo de identificación del cliente para comentarios/aprobaciones */}
        {(project.allowClientComments || project.allowClientBugReport) && (
          <div className={`rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${cardClass}`}>
            <span className="text-xs font-bold opacity-75">Tu nombre para comentarios y aprobaciones:</span>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Ej. Carlos Mendoza"
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold sm:w-64 ${
                darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>
        )}

        {/* Timeline de Hitos */}
        <section className="space-y-4">
          <h2 className="text-base sm:text-lg font-black">Roadmap de Hitos y Entregables</h2>
          {project.milestones.map((m) => {
            const stMeta = MILESTONE_STATUS_META[m.status] || MILESTONE_STATUS_META.pending;
            const summary = project.workItemsSummary?.[m.id];
            const needsReview = m.status === 'client_review';
            const isBugMode = Boolean(isBugModeByMilestone[m.id]);

            return (
              <article
                key={m.id}
                className={`rounded-3xl border p-5 sm:p-6 space-y-4 transition ${cardClass} ${
                  needsReview ? 'ring-2 ring-amber-500/40 border-amber-500/50' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-cyan-600 text-white text-[10px] font-black">
                        {m.code}
                      </span>
                      <h3 className="text-base sm:text-lg font-black">{m.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stMeta.badge}`}>
                        {stMeta.label}
                      </span>
                    </div>
                    {m.description && <p className="text-xs opacity-75">{m.description}</p>}
                    <p className="text-[11px] opacity-60 font-semibold">
                      Ventana: {m.startDate || '—'} → {m.dueDate || '—'}
                      {summary && summary.total > 0
                        ? ` · ${summary.done}/${summary.total} tareas técnicas completadas`
                        : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {m.demoUrl && (
                      <a
                        href={m.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Globe className="w-3.5 h-3.5" /> Probar Hito
                      </a>
                    )}
                    {m.status !== 'approved' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setReviewModal({ milestone: m, decision: 'approved' })}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> Aprobar Hito
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewModal({ milestone: m, decision: 'changes_requested' })}
                          className="px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 text-xs font-bold cursor-pointer"
                        >
                          Pedir Ajustes
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progreso del hito */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="opacity-65">Progreso del Hito</span>
                    <span>{m.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stMeta.barColor}`}
                      style={{ width: `${m.progress}%` }}
                    />
                  </div>
                </div>

                {/* Sello de aprobación */}
                {m.clientApproval && m.clientApproval.status === 'approved' && (
                  <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Aprobado oficialmente por {m.clientApproval.decidedBy}
                      {m.clientApproval.notes ? `: "${m.clientApproval.notes}"` : ''}
                    </span>
                    {m.clientApproval.decidedAt && (
                      <span className="text-[10px] opacity-75">
                        {new Date(m.clientApproval.decidedAt).toLocaleString('es-PE')}
                      </span>
                    )}
                  </div>
                )}

                {/* Entregables con estado individual */}
                {((m.deliverableItems && m.deliverableItems.length > 0) ||
                  (m.deliverables && m.deliverables.length > 0)) && (
                  <div className="flex flex-wrap gap-1.5">
                    {(m.deliverableItems && m.deliverableItems.length > 0
                      ? m.deliverableItems
                      : (m.deliverables || []).map((title, idx) => ({
                          id: `${m.id}-d-${idx}`,
                          title,
                          completed: m.status === 'approved',
                        }))
                    ).map((del) => (
                      <span
                        key={del.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-medium ${
                          del.completed
                            ? darkMode
                              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : darkMode
                              ? 'bg-slate-950 border-slate-800 text-slate-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            del.completed ? 'text-emerald-500' : 'text-slate-400 opacity-50'
                          }`}
                        />
                        {del.title}
                      </span>
                    ))}
                  </div>
                )}

                {/* Adjuntos */}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {m.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-500 text-xs font-bold hover:underline"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> {att.name}
                      </a>
                    ))}
                  </div>
                )}

                {/* Comentarios y reporte QA */}
                {(project.allowClientComments || project.allowClientBugReport || m.comments.length > 0) && (
                  <div
                    className={`rounded-2xl border p-3.5 space-y-3 ${
                      darkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                        Comentarios y Revisiones ({m.comments.length})
                      </span>
                      {project.allowClientBugReport && (
                        <button
                          type="button"
                          onClick={() =>
                            setIsBugModeByMilestone((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                          }
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 cursor-pointer transition ${
                            isBugMode
                              ? 'bg-rose-600 text-white'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}
                        >
                          <Bug className="w-3 h-3" />
                          {isBugMode ? 'Modo Reporte Bug UAT Activo' : 'Reportar Detalle QA'}
                        </button>
                      )}
                    </div>

                    {m.comments.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {m.comments.map((c) => (
                          <div
                            key={c.id}
                            className={`p-2.5 rounded-xl text-xs border ${
                              c.authorRole === 'client'
                                ? 'bg-amber-500/10 border-amber-500/25'
                                : darkMode
                                  ? 'bg-slate-900 border-slate-800'
                                  : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                              <span>
                                {c.authorName}{' '}
                                <span className="opacity-60">
                                  ({c.authorRole === 'client' ? 'Cliente' : 'Equipo'})
                                </span>
                              </span>
                              <span className="opacity-50">
                                {new Date(c.createdAt).toLocaleDateString('es-PE', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                            <p className="opacity-90 whitespace-pre-line">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {(project.allowClientComments || isBugMode) && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentTextByMilestone[m.id] || ''}
                          onChange={(e) =>
                            setCommentTextByMilestone((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSendComment(m.id);
                            }
                          }}
                          placeholder={
                            isBugMode
                              ? 'Describe el error o detalle visual que encontraste al probar...'
                              : 'Escribe un comentario o consulta sobre este hito...'
                          }
                          className={`flex-1 px-3 py-2 rounded-xl border text-xs ${
                            darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                          }`}
                        />
                        <button
                          type="button"
                          disabled={
                            submittingCommentId === m.id || !(commentTextByMilestone[m.id] || '').trim()
                          }
                          onClick={() => handleSendComment(m.id)}
                          className={`px-3.5 py-2 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer ${
                            isBugMode ? 'bg-rose-600 hover:bg-rose-700' : 'bg-cyan-600 hover:bg-cyan-700'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </main>

      {/* Modal de Aprobación / Solicitud de Ajustes */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl ${cardClass}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black">
                {reviewModal.decision === 'approved'
                  ? `Aprobar ${reviewModal.milestone.code}`
                  : `Solicitar Ajustes en ${reviewModal.milestone.code}`}
              </h3>
              <button
                type="button"
                onClick={() => setReviewModal(null)}
                className="p-1.5 rounded-xl opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs opacity-75">
              Hito: <strong>{reviewModal.milestone.title}</strong>
            </p>
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">Tu Nombre *</label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold ${
                    darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">
                  {reviewModal.decision === 'approved'
                    ? 'Comentario de conformidad (opcional)'
                    : 'Detalla los ajustes requeridos *'}
                </label>
                <textarea
                  rows={3}
                  required={reviewModal.decision === 'changes_requested'}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewModal.decision === 'approved'
                      ? 'Todo conforme, podemos avanzar al siguiente hito.'
                      : 'Indica qué pantalla o flujo necesita ajuste...'
                  }
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs resize-none ${
                    darkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-500/30 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-extrabold cursor-pointer disabled:opacity-50 ${
                    reviewModal.decision === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {submittingReview
                    ? 'Enviando...'
                    : reviewModal.decision === 'approved'
                      ? 'Confirmar Aprobación'
                      : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
