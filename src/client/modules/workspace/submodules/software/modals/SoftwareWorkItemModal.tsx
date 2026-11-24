import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Bug,
  Code2,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  ShieldAlert,
  Tag,
  Zap,
  ImagePlus,
  Paintbrush,
  Terminal,
  Copy,
  Check,
  AlertTriangle,
  Monitor,
} from 'lucide-react';
import {
  SoftwareWorkItem,
  SoftwareWorkItemType,
  SoftwareWorkItemStatus,
  SoftwareBugSeverity,
  SoftwareQaVerificationStatus,
  SoftwareBugEnvironment,
  SoftwareBugMedia,
  SoftwareMilestone,
  SoftwareSprint,
  SoftwareAcceptanceCriterion,
  TaskPriority,
  User,
} from '../../../../../../shared/types';
import {
  WORK_ITEM_COLUMNS,
  WORK_ITEM_TYPE_META,
  BUG_SEVERITY_META,
  PRIORITY_META,
} from '../templates';
import { PaintCanvasModal } from '../../../../../components/PaintCanvasModal';

const TECH_TAG_PRESETS = ['frontend', 'backend', 'db', 'devops', 'ui', 'api', 'seguridad', 'urgente'];
const STORY_POINT_PRESETS = [1, 2, 3, 5, 8, 13];

interface SoftwareWorkItemModalProps {
  isOpen: boolean;
  editingItem: Partial<SoftwareWorkItem> | null;
  milestones: SoftwareMilestone[];
  sprints?: SoftwareSprint[];
  existingWorkItems?: SoftwareWorkItem[];
  teamUsers: User[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: Partial<SoftwareWorkItem>) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
}

export const SoftwareWorkItemModal: React.FC<SoftwareWorkItemModalProps> = ({
  isOpen,
  editingItem,
  milestones,
  sprints = [],
  existingWorkItems = [],
  teamUsers,
  isSaving,
  onClose,
  onSave,
  onDelete,
}) => {
  const isEditing = Boolean(editingItem?.id);

  const [type, setType] = useState<SoftwareWorkItemType>('task');
  const [milestoneId, setMilestoneId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<SoftwareWorkItemStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [severity, setSeverity] = useState<SoftwareBugSeverity>('major');
  const [qaVerificationStatus, setQaVerificationStatus] = useState<SoftwareQaVerificationStatus>('open');
  const [bugEnv, setBugEnv] = useState<SoftwareBugEnvironment>({});
  const [bugMedia, setBugMedia] = useState<SoftwareBugMedia[]>([]);
  const [annotatingMediaId, setAnnotatingMediaId] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState('');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [storyPoints, setStoryPoints] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [loggedHours, setLoggedHours] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [criteria, setCriteria] = useState<SoftwareAcceptanceCriterion[]>([]);
  const [newCriterion, setNewCriterion] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setType(editingItem?.type || 'task');
    setMilestoneId(editingItem?.milestoneId || milestones[0]?.id || '');
    setSprintId(editingItem?.sprintId || '');
    setTitle(editingItem?.title || '');
    setDescription(editingItem?.description || '');
    setStatus(editingItem?.status || 'todo');
    setPriority(editingItem?.priority || 'medium');
    setSeverity(editingItem?.severity || 'major');
    setQaVerificationStatus(editingItem?.qaVerificationStatus || 'open');
    setBugEnv(editingItem?.bugEnvironment || {});
    setBugMedia(Array.isArray(editingItem?.bugMedia) ? editingItem.bugMedia : []);
    setAnnotatingMediaId(null);
    setConsoleLogs(editingItem?.consoleLogs || '');
    setCopiedLogs(false);
    setStoryPoints(editingItem?.storyPoints !== undefined ? String(editingItem.storyPoints) : '');
    setTags(Array.isArray(editingItem?.tags) ? editingItem.tags : []);
    setCustomTag('');
    setIsBlocked(Boolean(editingItem?.isBlocked));
    setBlockedReason(editingItem?.blockedReason || '');
    setStepsToReproduce(editingItem?.stepsToReproduce || '');
    setExpectedBehavior(editingItem?.expectedBehavior || '');
    setActualBehavior(editingItem?.actualBehavior || '');
    setAssignedUserId(editingItem?.assignedUserId || '');
    setEstimatedHours(editingItem?.estimatedHours !== undefined ? String(editingItem.estimatedHours) : '');
    setLoggedHours(editingItem?.loggedHours !== undefined ? String(editingItem.loggedHours) : '');
    setDueDate(editingItem?.dueDate || '');
    setEvidenceUrl(editingItem?.evidenceUrl || '');
    setCriteria(editingItem?.acceptanceCriteria || []);
    setNewCriterion('');
  }, [isOpen, editingItem, milestones]);

  if (!isOpen) return null;

  // Detección de bugs duplicados en tiempo real
  const similarBugs =
    type === 'bug' && title.trim().length >= 4
      ? existingWorkItems
          .filter((w) => w.type === 'bug' && w.id !== editingItem?.id && w.status !== 'done')
          .filter((w) => {
            const words = title
              .toLowerCase()
              .split(/\s+/)
              .filter((t) => t.length >= 3);
            const target = `${w.title} ${w.description || ''}`.toLowerCase();
            return words.some((word) => target.includes(word));
          })
          .slice(0, 3)
      : [];

  const handleMediaFile = (file: File) => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isImage && !isVideo) return;
    if (file.size > 6 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      setBugMedia((prev) => [
        ...prev,
        {
          id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          type: isVideo ? 'video' : 'image',
          name: file.name || (isVideo ? 'video-qa.mp4' : 'captura-qa.png'),
          dataUrl,
          createdAt: new Date().toISOString(),
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
        const file = item.getAsFile();
        if (file) handleMediaFile(file);
      }
    }
  };

  const annotatingMedia = annotatingMediaId
    ? bugMedia.find((m) => m.id === annotatingMediaId) || null
    : null;

  const toggleTag = (tag: string) => {
    const clean = tag.trim().toLowerCase();
    if (!clean) return;
    setTags((prev) => (prev.includes(clean) ? prev.filter((t) => t !== clean) : [...prev, clean]));
  };

  const addCriterion = () => {
    const clean = newCriterion.trim();
    if (!clean) return;
    setCriteria((prev) => [
      ...prev,
      { id: `ac_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, text: clean, completed: false },
    ]);
    setNewCriterion('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const assignee = teamUsers.find((u) => u.id === assignedUserId);
    await onSave({
      ...(editingItem?.id ? { id: editingItem.id } : {}),
      type,
      milestoneId,
      sprintId,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      severity: type === 'bug' ? severity : undefined,
      qaVerificationStatus: type === 'bug' ? qaVerificationStatus : undefined,
      bugEnvironment: type === 'bug' ? bugEnv : undefined,
      bugMedia: bugMedia.length > 0 ? bugMedia : undefined,
      consoleLogs: consoleLogs.trim() || undefined,
      storyPoints: storyPoints !== '' ? Number(storyPoints) : undefined,
      tags,
      isBlocked,
      blockedReason: isBlocked ? blockedReason.trim() : '',
      stepsToReproduce: type === 'bug' ? stepsToReproduce.trim() : '',
      expectedBehavior: type === 'bug' ? expectedBehavior.trim() : '',
      actualBehavior: type === 'bug' ? actualBehavior.trim() : '',
      acceptanceCriteria: criteria,
      assignedUserId: assignee?.id || '',
      assignedUserName: assignee?.name || '',
      assignedUserAvatar: assignee?.avatarUrl || '',
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      loggedHours: loggedHours ? Number(loggedHours) : 0,
      dueDate,
      evidenceUrl: evidenceUrl.trim(),
    });
  };

  const isBug = type === 'bug';

  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isBug
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
              }`}
            >
              {isBug ? <Bug className="w-5 h-5" /> : <Code2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEditing
                  ? `${editingItem?.code || ''} — Editar ${WORK_ITEM_TYPE_META[type].label}`
                  : isBug
                    ? 'Reportar Bug / Incidencia QA'
                    : 'Nueva Tarea Técnica'}
              </h2>
              <p className="text-xs text-slate-500">
                Se sincroniza automáticamente con el Kanban y el progreso del Hito.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} onPaste={handlePaste} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Selector de Tipo */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(WORK_ITEM_TYPE_META) as SoftwareWorkItemType[]).map((tKey) => (
              <button
                key={tKey}
                type="button"
                onClick={() => setType(tKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  type === tKey
                    ? tKey === 'bug'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {WORK_ITEM_TYPE_META[tKey].label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Título *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  isBug
                    ? 'Ej. Error 500 al aplicar cupón con descuento mayor al subtotal'
                    : 'Ej. Implementar endpoint de webhook de pagos y validación HMAC'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold"
              />
              {similarBugs.length > 0 && (
                <div className="mt-1.5 p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-[11px] space-y-1">
                  <p className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Posibles bugs duplicados abiertos:
                  </p>
                  {similarBugs.map((sb) => (
                    <div key={sb.id} className="text-amber-700 dark:text-amber-200 truncate">
                      <strong>{sb.code}</strong> — {sb.title}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hito Asociado
              </label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
              >
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Columna Kanban
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SoftwareWorkItemStatus)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
              >
                {WORK_ITEM_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
              >
                {(Object.keys(PRIORITY_META) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </div>

            {isBug ? (
              <div>
                <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
                  Severidad del Bug
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as SoftwareBugSeverity)}
                  className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30 text-xs font-bold text-rose-700 dark:text-rose-300"
                >
                  {(Object.keys(BUG_SEVERITY_META) as SoftwareBugSeverity[]).map((sv) => (
                    <option key={sv} value={sv}>
                      {BUG_SEVERITY_META[sv].label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Responsable
                </label>
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
                >
                  <option value="">-- Sin asignar --</option>
                  {teamUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isBug && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Responsable de Corrección
                </label>
                <select
                  value={assignedUserId}
                  onChange={(e) => setAssignedUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
                >
                  <option value="">-- Sin asignar --</option>
                  {teamUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha Límite
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Est. (hrs)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="4"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reales (hrs)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={loggedHours}
                  onChange={(e) => setLoggedHours(e.target.value)}
                  placeholder="2"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Descripción Técnica
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles técnicos, contexto o notas de implementación..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs resize-none"
              />
            </div>
          </div>

          {/* Bloque específico de QA para Bugs */}
          {isBug && (
            <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
              <p className="text-xs font-extrabold text-rose-700 dark:text-rose-300">
                Detalle de Reproducción QA
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Pasos para reproducir
                </label>
                <textarea
                  rows={2}
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  placeholder="1. Ir al carrito... 2. Ingresar cupón... 3. Clic en pagar..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Resultado Esperado
                  </label>
                  <input
                    type="text"
                    value={expectedBehavior}
                    onChange={(e) => setExpectedBehavior(e.target.value)}
                    placeholder="Debería mostrar mensaje de validación"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Resultado Actual
                  </label>
                  <input
                    type="text"
                    value={actualBehavior}
                    onChange={(e) => setActualBehavior(e.target.value)}
                    placeholder="Lanza error 500 y limpia el formulario"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Flujo QA Re-testing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Estado de Verificación QA {editingItem?.reopenCount ? `(Reabierto ${editingItem.reopenCount}x)` : ''}
                  </label>
                  <select
                    value={qaVerificationStatus}
                    onChange={(e) => setQaVerificationStatus(e.target.value as SoftwareQaVerificationStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value="open">Abierto (Pendiente Dev)</option>
                    <option value="dev_resolved">Resuelto por Dev (Listo para Re-test QA)</option>
                    <option value="qa_verified">Verificado por QA (Aprobado)</option>
                    <option value="reopened">Reabierto (Falló Re-test)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-rose-500" /> Versión / Build
                  </label>
                  <input
                    type="text"
                    value={bugEnv.buildVersion || ''}
                    onChange={(e) => setBugEnv((prev) => ({ ...prev, buildVersion: e.target.value }))}
                    placeholder="Ej. v1.4.2 / commit a8f3c"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Entorno de reproducción */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={bugEnv.browser || ''}
                  onChange={(e) => setBugEnv((prev) => ({ ...prev, browser: e.target.value }))}
                  placeholder="Navegador (Chrome 130)"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                />
                <input
                  type="text"
                  value={bugEnv.os || ''}
                  onChange={(e) => setBugEnv((prev) => ({ ...prev, os: e.target.value }))}
                  placeholder="SO (Windows 11 / iOS 18)"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                />
                <input
                  type="text"
                  value={bugEnv.device || ''}
                  onChange={(e) => setBugEnv((prev) => ({ ...prev, device: e.target.value }))}
                  placeholder="Dispositivo (iPhone 15)"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                />
                <input
                  type="text"
                  value={bugEnv.resolution || ''}
                  onChange={(e) => setBugEnv((prev) => ({ ...prev, resolution: e.target.value }))}
                  placeholder="Resolución (1440x900)"
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                />
              </div>

              {/* Capturas Ctrl+V / Videos + Anotador PaintCanvasModal */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <ImagePlus className="w-3.5 h-3.5 text-rose-500" /> Capturas (Ctrl+V) o Videos Cortos (máx 6MB)
                  </label>
                  <label className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    + Subir Archivo
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleMediaFile(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                {bugMedia.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {bugMedia.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden relative group"
                      >
                        {m.type === 'video' ? (
                          <video src={m.dataUrl} controls className="w-full h-24 object-cover" />
                        ) : (
                          <img src={m.dataUrl} alt={m.name} className="w-full h-24 object-cover" />
                        )}
                        <div className="p-1.5 flex items-center justify-between gap-1 text-[10px]">
                          {m.type === 'image' ? (
                            <button
                              type="button"
                              onClick={() => setAnnotatingMediaId(m.id)}
                              className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              <Paintbrush className="w-3 h-3" /> Anotar
                            </button>
                          ) : (
                            <span className="text-slate-400 truncate">{m.name}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setBugMedia((prev) => prev.filter((x) => x.id !== m.id))}
                            className="text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logs de consola / cURL */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5 text-slate-500" /> Logs de Consola / Stacktrace / cURL
                  </label>
                  {consoleLogs.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(consoleLogs).catch(() => {});
                        setCopiedLogs(true);
                        setTimeout(() => setCopiedLogs(false), 1800);
                      }}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLogs ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedLogs ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={consoleLogs}
                  onChange={(e) => setConsoleLogs(e.target.value)}
                  placeholder="TypeError: Cannot read properties of undefined... o curl -X POST ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-emerald-300 font-mono text-[11px] resize-y"
                />
              </div>
            </div>
          )}

          {/* Sprint, Story Points, Etiquetas Técnicas y Bloqueador */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" /> Sprint Asignado
                </label>
                <select
                  value={sprintId}
                  onChange={(e) => setSprintId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="">Backlog (Sin Sprint)</option>
                  {sprints.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} ({sp.status === 'active' ? 'Activo' : sp.status === 'completed' ? 'Cerrado' : 'Planificado'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Story Points (Estimación Ágil)
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  {STORY_POINT_PRESETS.map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setStoryPoints(storyPoints === String(pt) ? '' : String(pt))}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-black border cursor-pointer transition ${
                        storyPoints === String(pt)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(e.target.value)}
                    placeholder="Pts"
                    className="w-14 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-cyan-500" /> Etiquetas Técnicas
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TECH_TAG_PRESETS.map((t) => {
                  const active = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        active
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      #{t}
                    </button>
                  );
                })}
                {tags
                  .filter((t) => !TECH_TAG_PRESETS.includes(t))
                  .map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 text-white border border-indigo-600 cursor-pointer"
                    >
                      #{t} ×
                    </button>
                  ))}
              </div>
              <div className="flex gap-1.5 pt-0.5">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (customTag.trim()) {
                        toggleTag(customTag);
                        setCustomTag('');
                      }
                    }
                  }}
                  placeholder="Agregar etiqueta personalizada..."
                  className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customTag.trim()) {
                      toggleTag(customTag);
                      setCustomTag('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  + Tag
                </button>
              </div>
            </div>

            <div className="pt-1 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Marcar como Bloqueado (alerta al Tech Lead)
                </span>
                <input
                  type="checkbox"
                  checked={isBlocked}
                  onChange={(e) => setIsBlocked(e.target.checked)}
                  className="w-4 h-4 accent-rose-600"
                />
              </label>
              {isBlocked && (
                <input
                  type="text"
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  placeholder="Motivo del bloqueo (ej. Falta credencial SMTP del cliente)..."
                  className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-xs"
                />
              )}
            </div>
          </div>

          {/* Evidencia URL */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Enlace de Evidencia / Captura / PR (Opcional)
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://loom.com/... o https://github.com/.../pull/12"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
            />
          </div>

          {/* Criterios de Aceptación */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Criterios de Aceptación / Checklist QA
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCriterion}
                onChange={(e) => setNewCriterion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCriterion();
                  }
                }}
                placeholder="Ej. Funciona en Safari iOS y Chrome Android sin desborde"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
              <button
                type="button"
                onClick={addCriterion}
                className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir
              </button>
            </div>
            {criteria.length > 0 && (
              <div className="space-y-1.5">
                {criteria.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCriteria((prev) =>
                          prev.map((item) =>
                            item.id === c.id ? { ...item, completed: !item.completed } : item
                          )
                        )
                      }
                      className="flex items-center gap-2 text-left flex-1 cursor-pointer"
                    >
                      {c.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className={c.completed ? 'line-through text-slate-400' : ''}>{c.text}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCriteria((prev) => prev.filter((item) => item.id !== c.id))}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          </div>

          <div className="shrink-0 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between gap-2">
            <div>
              {isEditing && onDelete && editingItem?.id && (
                <button
                  type="button"
                  onClick={() => onDelete(editingItem.id!)}
                  className="px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/20 cursor-pointer"
                >
                  Eliminar
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || !title.trim()}
                className={`px-5 py-2 rounded-xl text-white text-xs font-extrabold disabled:opacity-50 cursor-pointer ${
                  isBug ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isSaving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Ítem'}
              </button>
            </div>
          </div>
        </form>
      </div>
      {annotatingMedia && (
        <PaintCanvasModal
          isOpen={Boolean(annotatingMedia)}
          initialImageUrl={annotatingMedia.dataUrl}
          title={`Anotar captura QA — ${annotatingMedia.name}`}
          onClose={() => setAnnotatingMediaId(null)}
          onSave={(annotatedUrl) => {
            setBugMedia((prev) =>
              prev.map((m) => (m.id === annotatingMedia.id ? { ...m, dataUrl: annotatedUrl } : m))
            );
            setAnnotatingMediaId(null);
          }}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
