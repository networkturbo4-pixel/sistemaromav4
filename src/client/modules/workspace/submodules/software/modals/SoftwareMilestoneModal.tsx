import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Flag, Plus, Trash2, Eye, EyeOff, Globe, Paperclip, Link2, RefreshCw, Tag, CheckSquare, Square } from 'lucide-react';
import {
  SoftwareMilestone,
  SoftwareMilestoneStatus,
  SoftwareMilestoneAttachment,
  SoftwareDeliverableItem,
} from '../../../../../../shared/types';
import { MILESTONE_STATUS_META, PHASE_TAG_PRESETS } from '../templates';

interface SoftwareMilestoneModalProps {
  isOpen: boolean;
  editingMilestone: Partial<SoftwareMilestone> | null;
  allMilestones?: SoftwareMilestone[];
  defaultStartDate: string;
  defaultDueDate: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: Partial<SoftwareMilestone> & { dateChangeReason?: string }) => Promise<void>;
}

export const SoftwareMilestoneModal: React.FC<SoftwareMilestoneModalProps> = ({
  isOpen,
  editingMilestone,
  allMilestones = [],
  defaultStartDate,
  defaultDueDate,
  isSaving,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(editingMilestone?.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [dateChangeReason, setDateChangeReason] = useState('');
  const [weightPercent, setWeightPercent] = useState(20);
  const [status, setStatus] = useState<SoftwareMilestoneStatus>('pending');
  const [autoCalculateProgress, setAutoCalculateProgress] = useState(true);
  const [progress, setProgress] = useState(0);
  const [demoUrl, setDemoUrl] = useState('');
  const [isVisibleToClient, setIsVisibleToClient] = useState(true);
  const [deliverableItems, setDeliverableItems] = useState<SoftwareDeliverableItem[]>([]);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [attachments, setAttachments] = useState<SoftwareMilestoneAttachment[]>([]);
  const [attName, setAttName] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [dependsOnMilestoneIds, setDependsOnMilestoneIds] = useState<string[]>([]);
  const [phaseTag, setPhaseTag] = useState('');
  const [phaseColor, setPhaseColor] = useState('#6366f1');
  const [isRecurringSla, setIsRecurringSla] = useState(false);
  const [slaMonthlyHours, setSlaMonthlyHours] = useState<number>(10);
  const [slaUsedHours, setSlaUsedHours] = useState<number>(0);
  const [slaPeriodLabel, setSlaPeriodLabel] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingMilestone && editingMilestone.id) {
      setTitle(editingMilestone.title || '');
      setDescription(editingMilestone.description || '');
      setStartDate(editingMilestone.startDate || defaultStartDate);
      setDueDate(editingMilestone.dueDate || defaultDueDate);
      setWeightPercent(editingMilestone.weightPercent ?? 20);
      setStatus(editingMilestone.status || 'pending');
      setAutoCalculateProgress(editingMilestone.autoCalculateProgress !== false);
      setProgress(editingMilestone.progress ?? 0);
      setDemoUrl(editingMilestone.demoUrl || '');
      setIsVisibleToClient(editingMilestone.isVisibleToClient !== false);
      const items: SoftwareDeliverableItem[] =
        Array.isArray(editingMilestone.deliverableItems) && editingMilestone.deliverableItems.length > 0
          ? editingMilestone.deliverableItems
          : (editingMilestone.deliverables || []).map((t, idx) => ({
              id: `del_${editingMilestone.id}_${idx}`,
              title: t,
              completed: editingMilestone.status === 'approved',
            }));
      setDeliverableItems(items);
      setAttachments(editingMilestone.attachments || []);
      setDependsOnMilestoneIds(editingMilestone.dependsOnMilestoneIds || []);
      setPhaseTag(editingMilestone.phaseTag || '');
      setPhaseColor(editingMilestone.phaseColor || '#6366f1');
      setIsRecurringSla(Boolean(editingMilestone.isRecurringSla));
      setSlaMonthlyHours(editingMilestone.slaMonthlyHours ?? 10);
      setSlaUsedHours(editingMilestone.slaUsedHours ?? 0);
      setSlaPeriodLabel(editingMilestone.slaPeriodLabel || '');
    } else {
      setTitle('');
      setDescription('');
      setStartDate(defaultStartDate);
      setDueDate(defaultDueDate);
      setWeightPercent(20);
      setStatus('pending');
      setAutoCalculateProgress(true);
      setProgress(0);
      setDemoUrl('');
      setIsVisibleToClient(true);
      setDeliverableItems([]);
      setAttachments([]);
      setDependsOnMilestoneIds([]);
      setPhaseTag('');
      setPhaseColor('#6366f1');
      setIsRecurringSla(false);
      setSlaMonthlyHours(10);
      setSlaUsedHours(0);
      setSlaPeriodLabel('');
    }
    setDateChangeReason('');
    setNewDeliverable('');
    setAttName('');
    setAttUrl('');
  }, [isOpen, editingMilestone, defaultStartDate, defaultDueDate]);

  if (!isOpen) return null;

  const datesChanged =
    isEditing &&
    (startDate !== (editingMilestone?.startDate || defaultStartDate) ||
      dueDate !== (editingMilestone?.dueDate || defaultDueDate));

  const otherMilestones = allMilestones.filter((m) => m.id !== editingMilestone?.id);

  const toggleDependency = (mId: string) => {
    setDependsOnMilestoneIds((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  const addDeliverable = () => {
    const clean = newDeliverable.trim();
    if (!clean) return;
    setDeliverableItems((prev) => [
      ...prev,
      { id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, title: clean, completed: false },
    ]);
    setNewDeliverable('');
  };

  const addAttachment = () => {
    const cleanUrl = attUrl.trim();
    if (!cleanUrl) return;
    setAttachments((prev) => [
      ...prev,
      {
        id: `att_${Date.now()}`,
        name: attName.trim() || 'Recurso adjunto',
        url: cleanUrl,
      },
    ]);
    setAttName('');
    setAttUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSave({
      ...(editingMilestone?.id ? { id: editingMilestone.id } : {}),
      title: title.trim(),
      description: description.trim(),
      startDate,
      dueDate,
      weightPercent: Math.max(1, Math.min(100, Number(weightPercent) || 10)),
      status,
      autoCalculateProgress,
      progress: autoCalculateProgress ? editingMilestone?.progress ?? 0 : progress,
      demoUrl: demoUrl.trim(),
      isVisibleToClient,
      deliverables: deliverableItems.map((d) => d.title),
      deliverableItems,
      attachments,
      dependsOnMilestoneIds,
      phaseTag: phaseTag.trim(),
      phaseColor: phaseTag.trim() ? phaseColor : '',
      isRecurringSla,
      slaMonthlyHours: isRecurringSla ? Math.max(1, Number(slaMonthlyHours) || 10) : undefined,
      slaUsedHours: isRecurringSla ? Math.max(0, Number(slaUsedHours) || 0) : undefined,
      slaPeriodLabel: isRecurringSla ? slaPeriodLabel.trim() : '',
      ...(datesChanged ? { dateChangeReason: dateChangeReason.trim() || 'Ajuste de cronograma' } : {}),
    });
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isEditing ? 'Editar Hito Dinámico' : 'Nuevo Hito del Proyecto'}
              </h2>
              <p className="text-xs text-slate-500">Define entregables, fechas, peso y enlace de demo.</p>
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

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Título del Hito *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Módulo de Pagos y Checkout"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Descripción / Alcance del Hito
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qué quedará listo y verificable al cerrar este hito..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Entrega
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
              />
            </div>

            {datesChanged && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">
                  Motivo de reprogramación (se guardará en el historial Baseline vs. Real)
                </label>
                <input
                  type="text"
                  value={dateChangeReason}
                  onChange={(e) => setDateChangeReason(e.target.value)}
                  placeholder="Ej. Cliente solicitó ajustes adicionales en el flujo de pagos..."
                  className="w-full px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estado del Hito
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SoftwareMilestoneStatus)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
              >
                {(Object.keys(MILESTONE_STATUS_META) as SoftwareMilestoneStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {MILESTONE_STATUS_META[st].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Peso en el Proyecto (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={weightPercent}
                onChange={(e) => setWeightPercent(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-amber-500" /> URL de Demo / Staging del Hito
              </label>
              <input
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://staging.cliente.com/checkout"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
            </div>
          </div>

          {/* Control de avance y visibilidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCalculateProgress}
                onChange={(e) => setAutoCalculateProgress(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Calcular avance automático
                </span>
                <span className="text-[11px] text-slate-500">
                  Según tareas y bugs completados del hito.
                </span>
              </div>
            </label>

            <button
              type="button"
              onClick={() => setIsVisibleToClient((v) => !v)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                isVisibleToClient
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {isVisibleToClient ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {isVisibleToClient ? 'Visible al Cliente' : 'Solo Interno'}
              </span>
              <span className="text-[10px] uppercase">{isVisibleToClient ? 'ON' : 'OFF'}</span>
            </button>

            {!autoCalculateProgress && (
              <div className="sm:col-span-2 pt-1">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>Avance Manual del Hito</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            )}
          </div>

          {/* Etiqueta de Fase */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-500" /> Etiqueta de Fase (Personalizable)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PHASE_TAG_PRESETS.map((preset) => {
                const active = phaseTag === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setPhaseTag(active ? '' : preset.label);
                      setPhaseColor(preset.color);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      active ? 'text-white border-transparent shadow-xs' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900'
                    }`}
                    style={active ? { backgroundColor: preset.color } : undefined}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={phaseTag}
                onChange={(e) => setPhaseTag(e.target.value)}
                placeholder="O escribe una fase personalizada..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                type="color"
                value={phaseColor}
                onChange={(e) => setPhaseColor(e.target.value)}
                title="Color de fase"
                className="w-9 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
              />
            </div>
          </div>

          {/* Dependencias entre Hitos */}
          {otherMilestones.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-amber-500" /> Dependencias (Bloqueado por Hitos Predecesores)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {otherMilestones.map((om) => {
                  const checked = dependsOnMilestoneIds.includes(om.id);
                  return (
                    <button
                      key={om.id}
                      type="button"
                      onClick={() => toggleDependency(om.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        checked
                          ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {om.code}: {om.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hito Recurrente / Bolsa de Mantenimiento SLA */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-500" /> Hito Recurrente / Bolsa Mensual de Mantenimiento (SLA)
              </span>
              <input
                type="checkbox"
                checked={isRecurringSla}
                onChange={(e) => setIsRecurringSla(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
            </label>
            {isRecurringSla && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Horas Mensuales (SLA)</label>
                  <input
                    type="number"
                    min={1}
                    value={slaMonthlyHours}
                    onChange={(e) => setSlaMonthlyHours(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Horas Consumidas</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={slaUsedHours}
                    onChange={(e) => setSlaUsedHours(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Periodo (Ej. Nov 2026)</label>
                  <input
                    type="text"
                    value={slaPeriodLabel}
                    onChange={(e) => setSlaPeriodLabel(e.target.value)}
                    placeholder="Mensual / Nov 2026"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Entregables */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Entregables Incluidos (con check individual)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addDeliverable();
                  }
                }}
                placeholder="Ej. Integración de pasarela en sandbox y producción"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
              <button
                type="button"
                onClick={addDeliverable}
                className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir
              </button>
            </div>
            {deliverableItems.length > 0 && (
              <ul className="space-y-1.5">
                {deliverableItems.map((del) => (
                  <li
                    key={del.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setDeliverableItems((prev) =>
                          prev.map((item) =>
                            item.id === del.id ? { ...item, completed: !item.completed } : item
                          )
                        )
                      }
                      className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer"
                    >
                      {del.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className={`truncate ${del.completed ? 'line-through text-slate-400' : ''}`}>
                        {del.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliverableItems((prev) => prev.filter((item) => item.id !== del.id))}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Enlaces / Evidencias adjuntas */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" /> Enlaces o Evidencias (Loom, Figma, Drive)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={attName}
                onChange={(e) => setAttName(e.target.value)}
                placeholder="Título (ej. Video Loom Demo)"
                className="sm:col-span-5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
              <input
                type="url"
                value={attUrl}
                onChange={(e) => setAttUrl(e.target.value)}
                placeholder="https://..."
                className="sm:col-span-5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
              <button
                type="button"
                onClick={addAttachment}
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                + Adjuntar
              </button>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((att) => (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-semibold"
                  >
                    {att.name}
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                      className="hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          </div>

          <div className="shrink-0 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-end gap-2">
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Guardando...' : isEditing ? 'Actualizar Hito' : 'Agregar Hito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
