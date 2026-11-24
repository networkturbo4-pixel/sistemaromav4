import React, { useState } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Globe,
  MessageSquare,
  Send,
  Bug,
  Code2,
  EyeOff,
  AlertTriangle,
  Paperclip,
  GripVertical,
  Scale,
  Link2,
  History,
  FileText,
  RefreshCw,
  CheckSquare,
  Square,
  GitPullRequestDraft,
  Check,
  X,
} from 'lucide-react';
import {
  SoftwareProject,
  SoftwareMilestone,
  SoftwareMilestoneStatus,
  SoftwareWorkItem,
  SoftwareChangeRequest,
  SoftwareChangeRequestStatus,
} from '../../../../../../shared/types';
import {
  MILESTONE_STATUS_META,
  WORK_ITEM_TYPE_META,
  BUG_SEVERITY_META,
} from '../templates';
import { openMilestoneActaPdf } from '../utils/milestoneActaPdf';
import { MarkdownText } from './MarkdownText';

interface MilestonesRoadmapTabProps {
  project: SoftwareProject;
  canManage: boolean;
  onAddMilestone: () => void;
  onEditMilestone: (milestone: SoftwareMilestone) => void;
  onDeleteMilestone: (milestone: SoftwareMilestone) => void;
  onReorderMilestones: (orderedIds: string[]) => void;
  onNormalizeWeights: () => void;
  onQuickMilestoneStatus: (milestoneId: string, status: SoftwareMilestoneStatus) => void;
  onToggleDeliverable: (milestone: SoftwareMilestone, deliverableId: string) => void;
  onAddWorkItem: (milestoneId: string, type: 'task' | 'bug') => void;
  onEditWorkItem: (item: SoftwareWorkItem) => void;
  onToggleWorkItemDone: (item: SoftwareWorkItem) => void;
  onAddComment: (milestoneId: string, text: string) => Promise<void>;
  onCreateChangeRequest: (payload: Partial<SoftwareChangeRequest>) => Promise<void>;
  onUpdateChangeRequest: (crId: string, updates: Partial<SoftwareChangeRequest>) => Promise<void>;
  onDeleteChangeRequest: (crId: string) => Promise<void>;
}

function diffDaysIso(baseIso?: string, currentIso?: string): number {
  if (!baseIso || !currentIso || baseIso === currentIso) return 0;
  const a = new Date(`${baseIso}T12:00:00`).getTime();
  const b = new Date(`${currentIso}T12:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}

export const MilestonesRoadmapTab: React.FC<MilestonesRoadmapTabProps> = ({
  project,
  canManage,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onReorderMilestones,
  onNormalizeWeights,
  onQuickMilestoneStatus,
  onToggleDeliverable,
  onAddWorkItem,
  onEditWorkItem,
  onToggleWorkItemDone,
  onAddComment,
  onCreateChangeRequest,
  onUpdateChangeRequest,
  onDeleteChangeRequest,
}) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (project.milestones[0]) initial[project.milestones[0].id] = true;
    const active = project.milestones.find(
      (m) => m.status === 'in_progress' || m.status === 'client_review' || m.status === 'qa'
    );
    if (active) initial[active.id] = true;
    return initial;
  });
  const [historyOpenIds, setHistoryOpenIds] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [sendingCommentId, setSendingCommentId] = useState<string | null>(null);

  // Drag & drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Dependency warning banner
  const [depWarning, setDepWarning] = useState<{
    milestoneId: string;
    targetStatus: SoftwareMilestoneStatus;
    pendingPredecessors: string[];
  } | null>(null);

  // Change Request form state
  const [showCrForm, setShowCrForm] = useState(false);
  const [crTitle, setCrTitle] = useState('');
  const [crDesc, setCrDesc] = useState('');
  const [crMilestoneId, setCrMilestoneId] = useState('');
  const [crDays, setCrDays] = useState(2);
  const [crCost, setCrCost] = useState(0);
  const [crCurrency, setCrCurrency] = useState<'PEN' | 'USD'>('PEN');
  const [savingCr, setSavingCr] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const moveMilestone = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= project.milestones.length) return;
    const ids = project.milestones.map((m) => m.id);
    [ids[index], ids[targetIdx]] = [ids[targetIdx], ids[index]];
    onReorderMilestones(ids);
  };

  const handleDropOnMilestone = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const ids = project.milestones.map((m) => m.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, draggedId);
      onReorderMilestones(ids);
    }
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleStatusChangeRequest = (m: SoftwareMilestone, nextStatus: SoftwareMilestoneStatus) => {
    const deps = m.dependsOnMilestoneIds || [];
    if (
      deps.length > 0 &&
      (nextStatus === 'in_progress' || nextStatus === 'qa' || nextStatus === 'client_review' || nextStatus === 'approved')
    ) {
      const pendingPredecessors = deps
        .map((depId) => project.milestones.find((pm) => pm.id === depId))
        .filter((pm): pm is SoftwareMilestone => Boolean(pm) && pm!.status !== 'approved')
        .map((pm) => `${pm.code} (${pm.title})`);
      if (pendingPredecessors.length > 0) {
        setDepWarning({ milestoneId: m.id, targetStatus: nextStatus, pendingPredecessors });
        return;
      }
    }
    onQuickMilestoneStatus(m.id, nextStatus);
  };

  const handleSendComment = async (milestoneId: string) => {
    const text = (commentDrafts[milestoneId] || '').trim();
    if (!text) return;
    setSendingCommentId(milestoneId);
    try {
      await onAddComment(milestoneId, text);
      setCommentDrafts((prev) => ({ ...prev, [milestoneId]: '' }));
    } finally {
      setSendingCommentId(null);
    }
  };

  const handleSubmitCr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crTitle.trim()) return;
    setSavingCr(true);
    try {
      await onCreateChangeRequest({
        title: crTitle.trim(),
        description: crDesc.trim(),
        milestoneId: crMilestoneId,
        impactDays: Number(crDays) || 0,
        additionalCost: Number(crCost) || 0,
        currency: crCurrency,
      });
      setCrTitle('');
      setCrDesc('');
      setCrMilestoneId('');
      setCrDays(2);
      setCrCost(0);
      setShowCrForm(false);
    } finally {
      setSavingCr(false);
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const totalWeight = project.milestones.reduce((acc, m) => acc + (Number(m.weightPercent) || 0), 0);
  const weightNeedsFix = project.milestones.length > 0 && totalWeight !== 100;
  const milestoneById = new Map(project.milestones.map((m) => [m.id, m]));
  const changeRequests = project.changeRequests || [];
  const approvedCrDays = changeRequests
    .filter((cr) => cr.status === 'approved')
    .reduce((acc, cr) => acc + (Number(cr.impactDays) || 0), 0);
  const approvedCrPen = changeRequests
    .filter((cr) => cr.status === 'approved' && cr.currency === 'PEN')
    .reduce((acc, cr) => acc + (Number(cr.additionalCost) || 0), 0);
  const approvedCrUsd = changeRequests
    .filter((cr) => cr.status === 'approved' && cr.currency === 'USD')
    .reduce((acc, cr) => acc + (Number(cr.additionalCost) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
            Roadmap de Hitos Dinámicos ({project.milestones.length})
          </h3>
          <p className="text-xs text-slate-500">
            Arrastra los hitos para reordenarlos, marca entregables individuales o genera el acta PDF de entrega.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={onAddMilestone}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Nuevo Hito Dinámico
          </button>
        )}
      </div>

      {/* Validador de Suma de Pesos (%) */}
      {weightNeedsFix && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <Scale className="w-4 h-4 shrink-0" />
            <span>
              La suma actual de pesos de los hitos es <strong>{totalWeight}%</strong> (lo ideal es <strong>100%</strong> para un cálculo exacto de avance ponderado).
            </span>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={onNormalizeWeights}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold cursor-pointer shrink-0"
            >
              Normalizar al 100%
            </button>
          )}
        </div>
      )}

      {/* Alerta de Dependencias Pendientes */}
      {depWarning && (
        <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50/85 dark:bg-rose-950/35 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-extrabold">Dependencias predecesoras aún no aprobadas</p>
              <p className="opacity-90 mt-0.5">
                Este hito depende de: <strong>{depWarning.pendingPredecessors.join(', ')}</strong>. ¿Deseas cambiar el estado de todas formas?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDepWarning(null)}
              className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-700 text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onQuickMilestoneStatus(depWarning.milestoneId, depWarning.targetStatus);
                setDepWarning(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer"
            >
              Continuar de todas formas
            </button>
          </div>
        </div>
      )}

      {project.milestones.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-3 bg-white dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Este proyecto aún no tiene hitos definidos.
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Crea hitos dinámicos para dividir el desarrollo en entregas verificables y compartir el avance en vivo con tu cliente.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={onAddMilestone}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
            >
              + Crear Primer Hito
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {project.milestones.map((m, idx) => {
            const isExpanded = Boolean(expandedIds[m.id]);
            const isHistoryOpen = Boolean(historyOpenIds[m.id]);
            const mItems = project.workItems.filter((w) => w.milestoneId === m.id);
            const doneCount = mItems.filter((w) => w.status === 'done').length;
            const openBugs = mItems.filter((w) => w.type === 'bug' && w.status !== 'done');
            const stMeta = MILESTONE_STATUS_META[m.status] || MILESTONE_STATUS_META.pending;
            const isOverdue = m.dueDate && m.dueDate < todayIso && m.status !== 'approved';
            const delItems =
              m.deliverableItems && m.deliverableItems.length > 0
                ? m.deliverableItems
                : (m.deliverables || []).map((title, dIdx) => ({
                    id: `del_${m.id}_${dIdx}`,
                    title,
                    completed: m.status === 'approved',
                  }));
            const delDoneCount = delItems.filter((d) => d.completed).length;
            const baselineDiff = diffDaysIso(m.baselineDueDate, m.dueDate);
            const depMilestones = (m.dependsOnMilestoneIds || [])
              .map((dId) => milestoneById.get(dId))
              .filter(Boolean) as SoftwareMilestone[];
            const slaPct =
              m.isRecurringSla && m.slaMonthlyHours
                ? Math.min(100, Math.round(((m.slaUsedHours || 0) / m.slaMonthlyHours) * 100))
                : 0;

            return (
              <div
                key={m.id}
                draggable={canManage}
                onDragStart={() => setDraggedId(m.id)}
                onDragOver={(e) => {
                  if (!canManage) return;
                  e.preventDefault();
                  if (dragOverId !== m.id) setDragOverId(m.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === m.id) setDragOverId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnMilestone(m.id);
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                className={`rounded-3xl border bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition ${
                  dragOverId === m.id && draggedId !== m.id
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-slate-200/90 dark:border-slate-800'
                } ${draggedId === m.id ? 'opacity-60' : ''}`}
              >
                {/* Cabecera del Hito */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Drag handle + flechas */}
                    {canManage && (
                      <div className="flex items-center gap-0.5 pt-0.5 shrink-0">
                        <span
                          className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing"
                          title="Arrastrar para reordenar"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveMilestone(idx, -1)}
                            className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 disabled:opacity-25 cursor-pointer"
                            title="Subir hito"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === project.milestones.length - 1}
                            onClick={() => moveMilestone(idx, 1)}
                            className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 disabled:opacity-25 cursor-pointer"
                            title="Bajar hito"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black">
                          {m.code}
                        </span>
                        {m.phaseTag && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white"
                            style={{ backgroundColor: m.phaseColor || '#6366f1' }}
                          >
                            {m.phaseTag}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleExpand(m.id)}
                          className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left cursor-pointer"
                        >
                          {m.title}
                        </button>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stMeta.badge}`}>
                          {stMeta.label}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                          Peso {m.weightPercent}%
                        </span>
                        {m.isRecurringSla && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                            <RefreshCw className="w-3 h-3" /> SLA {m.slaUsedHours || 0}/{m.slaMonthlyHours || 0}h
                          </span>
                        )}
                        {!m.isVisibleToClient && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-500">
                            <EyeOff className="w-3 h-3" /> Interno
                          </span>
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" /> Vencido
                          </span>
                        )}
                        {baselineDiff !== 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setHistoryOpenIds((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                            }
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                              baselineDiff > 0
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                            }`}
                            title="Ver historial Baseline vs. Real"
                          >
                            <History className="w-3 h-3" />
                            {baselineDiff > 0 ? `+${baselineDiff}d vs baseline` : `${baselineDiff}d vs baseline`}
                          </button>
                        )}
                        {openBugs.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <Bug className="w-3 h-3" /> {openBugs.length} bug{openBugs.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {m.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {m.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {m.startDate || '—'} → {m.dueDate || '—'}
                        </span>
                        <span className="font-semibold">
                          {doneCount}/{mItems.length} ítems · {delDoneCount}/{delItems.length} entregables
                        </span>
                        {depMilestones.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                            <Link2 className="w-3.5 h-3.5" />
                            Depende de: {depMilestones.map((d) => d.code).join(', ')}
                          </span>
                        )}
                        {m.comments.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                            {m.comments.length}
                          </span>
                        )}
                        {m.demoUrl && (
                          <a
                            href={m.demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                          >
                            <Globe className="w-3.5 h-3.5" /> Demo / Staging
                          </a>
                        )}
                      </div>

                      {/* Barra de bolsa SLA si aplica */}
                      {m.isRecurringSla && m.slaMonthlyHours && (
                        <div className="max-w-xs pt-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-0.5">
                            <span>Bolsa SLA {m.slaPeriodLabel ? `(${m.slaPeriodLabel})` : ''}</span>
                            <span>{m.slaUsedHours || 0} / {m.slaMonthlyHours}h ({slaPct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-emerald-500/15 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${slaPct >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${slaPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Controles de progreso y acciones */}
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
                    <div className="w-24 sm:w-28">
                      <div className="flex items-center justify-between text-[10px] font-extrabold mb-1">
                        <span className="text-slate-400">Avance</span>
                        <span className="text-slate-900 dark:text-white">{m.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${stMeta.barColor}`}
                          style={{ width: `${m.progress}%` }}
                        />
                      </div>
                    </div>

                    {canManage && (
                      <select
                        value={m.status}
                        onChange={(e) =>
                          handleStatusChangeRequest(m, e.target.value as SoftwareMilestoneStatus)
                        }
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold cursor-pointer"
                      >
                        {(Object.keys(MILESTONE_STATUS_META) as SoftwareMilestoneStatus[]).map((st) => (
                          <option key={st} value={st}>
                            {MILESTONE_STATUS_META[st].label}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() => openMilestoneActaPdf(project, m)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 cursor-pointer"
                      title="Generar Acta PDF de Entrega / Cierre"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditMilestone(m)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 cursor-pointer"
                          title="Editar hito"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMilestone(m)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-300 cursor-pointer"
                          title="Eliminar hito"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(m.id)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Historial de Fechas Baseline vs. Real */}
                {isHistoryOpen && m.dateHistory && m.dateHistory.length > 0 && (
                  <div className="mx-4 sm:mx-5 mb-3 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" /> Historial de Fechas (Baseline: {m.baselineStartDate} → {m.baselineDueDate})
                      </span>
                      <button
                        type="button"
                        onClick={() => setHistoryOpenIds((prev) => ({ ...prev, [m.id]: false }))}
                        className="text-amber-600 hover:text-amber-800 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <ul className="space-y-1">
                      {m.dateHistory.map((h) => (
                        <li key={h.id} className="text-[11px] text-slate-600 dark:text-slate-300 flex flex-wrap justify-between gap-2">
                          <span>
                            <strong>{h.previousDueDate} → {h.newDueDate}</strong> · {h.reason}
                          </span>
                          <span className="text-slate-400">
                            {h.changedBy} · {new Date(h.changedAt).toLocaleDateString('es-PE')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sello de aprobación del cliente si existe */}
                {m.clientApproval && m.clientApproval.status !== 'pending' && (
                  <div
                    className={`mx-4 sm:mx-5 mb-3 px-3.5 py-2.5 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                      m.clientApproval.status === 'approved'
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {m.clientApproval.status === 'approved'
                        ? `Aprobado oficialmente por ${m.clientApproval.decidedBy || 'Cliente'}`
                        : `Ajustes solicitados por ${m.clientApproval.decidedBy || 'Cliente'}`}
                      {m.clientApproval.notes ? ` — "${m.clientApproval.notes}"` : ''}
                    </span>
                    {m.clientApproval.decidedAt && (
                      <span className="text-[10px] opacity-80">
                        {new Date(m.clientApproval.decidedAt).toLocaleString('es-PE')}
                      </span>
                    )}
                  </div>
                )}

                {/* Cuerpo expandido: entregables con check, tareas/bugs y comentarios */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Columna izquierda: Entregables + Tareas/Bugs */}
                    <div className="lg:col-span-7 space-y-4">
                      {delItems.length > 0 && (
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                            Entregables del Hito ({delDoneCount}/{delItems.length} completados)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {delItems.map((del) => (
                              <button
                                key={del.id}
                                type="button"
                                disabled={!canManage}
                                onClick={() => onToggleDeliverable(m, del.id)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition ${
                                  del.completed
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                                } ${canManage ? 'cursor-pointer hover:border-indigo-400' : 'cursor-default'}`}
                              >
                                {del.completed ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className={del.completed ? 'line-through opacity-80' : ''}>{del.title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {m.attachments && m.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {m.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline"
                            >
                              <Paperclip className="w-3.5 h-3.5" /> {att.name}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                            Tareas Técnicas & Bugs ({mItems.length})
                          </p>
                          {canManage && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onAddWorkItem(m.id, 'task')}
                                className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-bold hover:bg-sky-500/20 flex items-center gap-1 cursor-pointer"
                              >
                                <Code2 className="w-3 h-3" /> + Tarea
                              </button>
                              <button
                                type="button"
                                onClick={() => onAddWorkItem(m.id, 'bug')}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-bold hover:bg-rose-500/20 flex items-center gap-1 cursor-pointer"
                              >
                                <Bug className="w-3 h-3" /> + Bug QA
                              </button>
                            </div>
                          )}
                        </div>

                        {mItems.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2">
                            Aún no hay tareas ni incidencias vinculadas a este hito.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {mItems.map((item) => {
                              const isDone = item.status === 'done';
                              const typeMeta = WORK_ITEM_TYPE_META[item.type] || WORK_ITEM_TYPE_META.task;
                              const sevMeta = item.severity ? BUG_SEVERITY_META[item.severity] : null;
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/50 transition"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={isDone}
                                      disabled={!canManage}
                                      onChange={() => onToggleWorkItemDone(item)}
                                      className="w-4 h-4 accent-emerald-600 cursor-pointer shrink-0"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => onEditWorkItem(item)}
                                      className="text-left min-w-0 flex-1 cursor-pointer"
                                    >
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-mono font-bold text-slate-400">
                                          {item.code}
                                        </span>
                                        <span
                                          className={`text-xs font-bold truncate ${
                                            isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'
                                          }`}
                                        >
                                          {item.title}
                                        </span>
                                      </div>
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta.badge}`}>
                                      {typeMeta.label}
                                    </span>
                                    {sevMeta && (
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sevMeta.badge}`}>
                                        {sevMeta.label}
                                      </span>
                                    )}
                                    {item.assignedUserName && (
                                      <span className="hidden sm:inline text-[10px] font-semibold text-slate-400">
                                        {item.assignedUserName.split(' ')[0]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Columna derecha: Hilo de comentarios equipo <-> cliente */}
                    <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 space-y-3">
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                          Conversación y Feedback ({m.comments.length})
                        </p>

                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                          {m.comments.length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">
                              Sin comentarios todavía. Los mensajes del cliente también aparecerán aquí.
                            </p>
                          ) : (
                            m.comments.map((c) => (
                              <div
                                key={c.id}
                                className={`p-2.5 rounded-xl text-xs border ${
                                  c.authorRole === 'client'
                                    ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/60'
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-100">
                                    {c.authorName}
                                    <span className="ml-1.5 text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-500">
                                      {c.authorRole === 'client' ? 'Cliente' : 'Equipo'}
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(c.createdAt).toLocaleDateString('es-PE', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                                  </span>
                                </div>
                                <MarkdownText
                                  text={c.text}
                                  className="text-slate-600 dark:text-slate-300"
                                />
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={commentDrafts[m.id] || ''}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSendComment(m.id);
                            }
                          }}
                          placeholder="Escribir avance o respuesta al cliente..."
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                        />
                        <button
                          type="button"
                          disabled={sendingCommentId === m.id || !(commentDrafts[m.id] || '').trim()}
                          onClick={() => handleSendComment(m.id)}
                          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Control de Cambios de Alcance (Change Requests) */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <GitPullRequestDraft className="w-4 h-4 text-violet-500" />
              Control de Cambios de Alcance — Change Requests ({changeRequests.length})
            </h4>
            <p className="text-xs text-slate-500">
              Registra solicitudes fuera del alcance original con impacto en días y costo adicional.
              {approvedCrDays > 0 || approvedCrPen > 0 || approvedCrUsd > 0 ? (
                <span className="ml-1.5 font-bold text-violet-600 dark:text-violet-400">
                  Aprobados: +{approvedCrDays}d
                  {approvedCrPen > 0 ? ` · +S/ ${approvedCrPen.toFixed(2)}` : ''}
                  {approvedCrUsd > 0 ? ` · +$ ${approvedCrUsd.toFixed(2)}` : ''}
                </span>
              ) : null}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowCrForm((v) => !v)}
              className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Solicitud de Cambio
            </button>
          )}
        </div>

        {showCrForm && canManage && (
          <form
            onSubmit={handleSubmitCr}
            className="p-3.5 rounded-2xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-950/20 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <input
                type="text"
                required
                value={crTitle}
                onChange={(e) => setCrTitle(e.target.value)}
                placeholder="Título del cambio (ej. Integración con Culqi)"
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              />
              <select
                value={crMilestoneId}
                onChange={(e) => setCrMilestoneId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="">Hito afectado (opcional)</option>
                {project.milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.title}
                  </option>
                ))}
              </select>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={crDays}
                  onChange={(e) => setCrDays(Number(e.target.value))}
                  placeholder="Días"
                  title="Impacto en días"
                  className="w-16 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
                <select
                  value={crCurrency}
                  onChange={(e) => setCrCurrency(e.target.value as 'PEN' | 'USD')}
                  className="px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="PEN">S/</option>
                  <option value="USD">$</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={crCost}
                  onChange={(e) => setCrCost(Number(e.target.value))}
                  placeholder="Costo"
                  className="flex-1 min-w-0 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>
              <input
                type="text"
                value={crDesc}
                onChange={(e) => setCrDesc(e.target.value)}
                placeholder="Detalle técnico o alcance adicional..."
                className="sm:col-span-2 lg:col-span-3 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCrForm(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCr || !crTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold disabled:opacity-50 cursor-pointer"
                >
                  {savingCr ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </form>
        )}

        {changeRequests.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Sin cambios de alcance registrados. El proyecto se mantiene dentro del alcance inicial.
          </p>
        ) : (
          <div className="space-y-2">
            {changeRequests.map((cr) => {
              const affectedMilestone = cr.milestoneId ? milestoneById.get(cr.milestoneId) : null;
              const statusPill: Record<SoftwareChangeRequestStatus, string> = {
                pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
                approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
                rejected: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
              };
              return (
                <div
                  key={cr.id}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300">
                        {cr.code}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">{cr.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusPill[cr.status]}`}>
                        {cr.status === 'approved' ? 'Aprobado' : cr.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                      {affectedMilestone && (
                        <span className="text-[10px] font-bold text-slate-400">
                          · {affectedMilestone.code}
                        </span>
                      )}
                    </div>
                    {cr.description && <p className="text-[11px] text-slate-500">{cr.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      +{cr.impactDays}d · {cr.currency === 'USD' ? '$' : 'S/'} {Number(cr.additionalCost || 0).toFixed(2)}
                    </span>
                    {canManage && cr.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onUpdateChangeRequest(cr.id, { status: 'approved' })}
                          className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 cursor-pointer"
                          title="Aprobar cambio"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateChangeRequest(cr.id, { status: 'rejected' })}
                          className="p-1.5 rounded-xl bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 cursor-pointer"
                          title="Rechazar cambio"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => onDeleteChangeRequest(cr.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 cursor-pointer"
                        title="Eliminar CR"
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
    </div>
  );
};
