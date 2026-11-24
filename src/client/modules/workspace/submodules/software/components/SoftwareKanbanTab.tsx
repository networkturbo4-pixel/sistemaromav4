import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Bug,
  Code2,
  CheckSquare,
  User as UserIcon,
  Search,
  Play,
  Pause,
  ShieldAlert,
  Zap,
  Layers,
  AlertTriangle,
  Check,
  X,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import {
  SoftwareProject,
  SoftwareWorkItem,
  SoftwareWorkItemStatus,
  SoftwareSprint,
  User,
} from '../../../../../../shared/types';
import {
  WORK_ITEM_COLUMNS,
  WORK_ITEM_TYPE_META,
  BUG_SEVERITY_META,
  PRIORITY_META,
} from '../templates';

interface SoftwareKanbanTabProps {
  project: SoftwareProject;
  teamUsers: User[];
  currentUserId?: string;
  canManage: boolean;
  onAddWorkItem: (milestoneId: string, type: 'task' | 'bug') => void;
  onQuickCreateWorkItem: (payload: Partial<SoftwareWorkItem>) => Promise<void>;
  onEditWorkItem: (item: SoftwareWorkItem) => void;
  onMoveWorkItem: (itemId: string, newStatus: SoftwareWorkItemStatus) => void;
  onToggleTimer: (itemId: string) => Promise<void>;
  onBulkUpdateItems: (itemIds: string[], updates: Partial<SoftwareWorkItem>) => Promise<void>;
  onUpdateWipLimits: (wipLimits: Partial<Record<SoftwareWorkItemStatus, number>>) => Promise<void>;
  onCreateSprint: (payload: Partial<SoftwareSprint>) => Promise<void>;
  onCloseSprint: (sprintId: string, rolloverToSprintId?: string) => Promise<void>;
}

type SwimlaneMode = 'none' | 'milestone' | 'assignee';

export const SoftwareKanbanTab: React.FC<SoftwareKanbanTabProps> = ({
  project,
  teamUsers,
  currentUserId,
  canManage,
  onAddWorkItem,
  onQuickCreateWorkItem,
  onEditWorkItem,
  onMoveWorkItem,
  onToggleTimer,
  onBulkUpdateItems,
  onUpdateWipLimits,
  onCreateSprint,
  onCloseSprint,
}) => {
  const [search, setSearch] = useState('');
  const [milestoneFilter, setMilestoneFilter] = useState<string>('all');
  const [sprintFilter, setSprintFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<'none' | 'mine' | 'unassigned' | 'overdue' | 'blocked'>('none');
  const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneMode>('none');

  // Drag & drop
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Inline quick add per column
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, string>>({});
  const [creatingCol, setCreatingCol] = useState<string | null>(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkMilestone, setBulkMilestone] = useState<string>('');
  const [bulkSprint, setBulkSprint] = useState<string>('');
  const [bulkAssignee, setBulkAssignee] = useState<string>('');

  // Sprint creation & close modals (inline drawers)
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [spName, setSpName] = useState('');
  const [spGoal, setSpGoal] = useState('');
  const [spStart, setSpStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [spEnd, setSpEnd] = useState(() => new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10));

  // WIP limits editor
  const [showWipEditor, setShowWipEditor] = useState(false);
  const [wipDraft, setWipDraft] = useState<Partial<Record<SoftwareWorkItemStatus, number>>>(
    project.wipLimits || {}
  );

  // Live clock tick for active timers
  const [nowTick, setNowTick] = useState(Date.now());
  const hasRunningTimer = useMemo(
    () => project.workItems.some((w) => Boolean(w.activeTimerStartedAt)),
    [project.workItems]
  );

  useEffect(() => {
    if (!hasRunningTimer) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasRunningTimer]);

  useEffect(() => {
    setWipDraft(project.wipLimits || {});
  }, [project.wipLimits]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const sprints = project.sprints || [];
  const activeSprint = sprints.find((s) => s.status === 'active') || null;

  const milestoneById = useMemo(
    () => new Map(project.milestones.map((m) => [m.id, m])),
    [project.milestones]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    project.workItems.forEach((w) => (w.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [project.workItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return project.workItems.filter((item) => {
      if (milestoneFilter !== 'all' && item.milestoneId !== milestoneFilter) return false;
      if (sprintFilter === 'backlog' && item.sprintId) return false;
      if (sprintFilter !== 'all' && sprintFilter !== 'backlog' && item.sprintId !== sprintFilter) return false;
      if (typeFilter === 'bugs' && item.type !== 'bug') return false;
      if (typeFilter === 'tasks' && item.type === 'bug') return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (tagFilter !== 'all' && !(item.tags || []).includes(tagFilter)) return false;
      if (quickFilter === 'mine' && item.assignedUserId !== currentUserId) return false;
      if (quickFilter === 'unassigned' && item.assignedUserId) return false;
      if (quickFilter === 'overdue' && (!item.dueDate || item.dueDate >= todayIso || item.status === 'done')) return false;
      if (quickFilter === 'blocked' && !item.isBlocked) return false;
      if (q) {
        const hay = `${item.code} ${item.title} ${item.description || ''} ${item.assignedUserName || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    project.workItems,
    milestoneFilter,
    sprintFilter,
    typeFilter,
    severityFilter,
    tagFilter,
    quickFilter,
    currentUserId,
    todayIso,
    search,
  ]);

  const sprintVelocity = useMemo(() => {
    const scope =
      sprintFilter !== 'all' && sprintFilter !== 'backlog'
        ? project.workItems.filter((w) => w.sprintId === sprintFilter)
        : activeSprint
          ? project.workItems.filter((w) => w.sprintId === activeSprint.id)
          : filteredItems;
    const totalPts = scope.reduce((acc, w) => acc + (Number(w.storyPoints) || 0), 0);
    const donePts = scope
      .filter((w) => w.status === 'done')
      .reduce((acc, w) => acc + (Number(w.storyPoints) || 0), 0);
    return { totalPts, donePts };
  }, [project.workItems, sprintFilter, activeSprint, filteredItems]);

  const swimlanes = useMemo(() => {
    if (swimlaneMode === 'none') {
      return [{ id: 'all', label: '', items: filteredItems }];
    }
    if (swimlaneMode === 'milestone') {
      const groups: Array<{ id: string; label: string; items: SoftwareWorkItem[] }> = [];
      project.milestones.forEach((m) => {
        const items = filteredItems.filter((w) => w.milestoneId === m.id);
        if (items.length > 0) groups.push({ id: m.id, label: `${m.code} — ${m.title}`, items });
      });
      const orphans = filteredItems.filter((w) => !milestoneById.has(w.milestoneId));
      if (orphans.length > 0) groups.push({ id: 'unlinked', label: 'Sin Hito', items: orphans });
      return groups;
    }
    const byUser = new Map<string, { label: string; items: SoftwareWorkItem[] }>();
    filteredItems.forEach((w) => {
      const key = w.assignedUserId || '__unassigned__';
      const label = w.assignedUserName || 'Sin asignar';
      if (!byUser.has(key)) byUser.set(key, { label, items: [] });
      byUser.get(key)!.items.push(w);
    });
    return Array.from(byUser.entries()).map(([id, g]) => ({ id, ...g }));
  }, [swimlaneMode, filteredItems, project.milestones, milestoneById]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleApplyBulk = async () => {
    if (selectedIds.length === 0) return;
    const updates: Partial<SoftwareWorkItem> = {};
    if (bulkStatus) updates.status = bulkStatus as SoftwareWorkItemStatus;
    if (bulkMilestone) updates.milestoneId = bulkMilestone;
    if (bulkSprint === '__backlog__') updates.sprintId = '';
    else if (bulkSprint) updates.sprintId = bulkSprint;
    if (bulkAssignee === '__none__') {
      updates.assignedUserId = '';
      updates.assignedUserName = '';
      updates.assignedUserAvatar = '';
    } else if (bulkAssignee) {
      const u = teamUsers.find((usr) => usr.id === bulkAssignee);
      if (u) {
        updates.assignedUserId = u.id;
        updates.assignedUserName = u.name;
        updates.assignedUserAvatar = u.avatarUrl || '';
      }
    }
    if (Object.keys(updates).length === 0) return;
    await onBulkUpdateItems(selectedIds, updates);
    setSelectedIds([]);
    setBulkStatus('');
    setBulkMilestone('');
    setBulkSprint('');
    setBulkAssignee('');
  };

  const handleInlineAdd = async (colStatus: SoftwareWorkItemStatus) => {
    const title = (inlineDrafts[colStatus] || '').trim();
    if (!title) return;
    setCreatingCol(colStatus);
    try {
      await onQuickCreateWorkItem({
        title,
        status: colStatus,
        type: 'task',
        milestoneId:
          milestoneFilter !== 'all' ? milestoneFilter : project.milestones[0]?.id || '',
        sprintId:
          sprintFilter !== 'all' && sprintFilter !== 'backlog'
            ? sprintFilter
            : activeSprint?.id || '',
      });
      setInlineDrafts((prev) => ({ ...prev, [colStatus]: '' }));
    } finally {
      setCreatingCol(null);
    }
  };

  const handleCreateSprintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateSprint({
      name: spName.trim() || `Sprint ${sprints.length + 1}`,
      goal: spGoal.trim(),
      startDate: spStart,
      endDate: spEnd,
    });
    setSpName('');
    setSpGoal('');
    setShowSprintForm(false);
  };

  const formatTimer = (item: SoftwareWorkItem) => {
    const baseHours = Number(item.loggedHours) || 0;
    if (!item.activeTimerStartedAt) return `${baseHours.toFixed(1)}h`;
    const elapsedSec = Math.max(0, Math.floor((nowTick - new Date(item.activeTimerStartedAt).getTime()) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const renderCard = (item: SoftwareWorkItem) => {
    const ms = milestoneById.get(item.milestoneId);
    const typeMeta = WORK_ITEM_TYPE_META[item.type] || WORK_ITEM_TYPE_META.task;
    const sevMeta = item.severity ? BUG_SEVERITY_META[item.severity] : null;
    const prioMeta = PRIORITY_META[item.priority] || PRIORITY_META.medium;
    const criteriaTotal = item.acceptanceCriteria?.length || 0;
    const criteriaDone = item.acceptanceCriteria?.filter((c) => c.completed).length || 0;
    const criteriaPct = criteriaTotal > 0 ? Math.round((criteriaDone / criteriaTotal) * 100) : 0;
    const isRunning = Boolean(item.activeTimerStartedAt);
    const isSelected = selectedIds.includes(item.id);
    const isOverdue = item.dueDate && item.dueDate < todayIso && item.status !== 'done';

    return (
      <div
        key={item.id}
        draggable={canManage}
        onDragStart={() => setDraggedId(item.id)}
        onDragEnd={() => {
          setDraggedId(null);
          setDragOverCol(null);
        }}
        onClick={() => onEditWorkItem(item)}
        className={`p-3 rounded-2xl border transition cursor-pointer shadow-2xs hover:shadow-sm space-y-2 ${
          item.isBlocked
            ? 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-400 dark:border-rose-700'
            : isSelected
              ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-indigo-400/60'
        } ${draggedId === item.id ? 'opacity-50' : ''}`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            {canManage && (
              <input
                type="checkbox"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelect(item.id)}
                className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                title="Seleccionar para acción en lote"
              />
            )}
            <span className="text-[10px] font-mono font-black text-slate-400">{item.code}</span>
          </div>
          <div className="flex items-center gap-1">
            {item.storyPoints !== undefined && item.storyPoints > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[9px] font-black">
                {item.storyPoints} pts
              </span>
            )}
            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${typeMeta.badge}`}>
              {typeMeta.label}
            </span>
          </div>
        </div>

        <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
          {item.title}
        </p>

        {item.isBlocked && (
          <div className="px-2 py-1 rounded-lg bg-rose-600/15 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.blockedReason || 'Bloqueado'}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1">
          {ms && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {ms.code}
            </span>
          )}
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${prioMeta.badge}`}>
            {prioMeta.label}
          </span>
          {sevMeta && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sevMeta.badge}`}>
              {sevMeta.label}
            </span>
          )}
          {isOverdue && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400">
              Vencida
            </span>
          )}
          {(item.tags || []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Barra de subtareas / criterios de aceptación */}
        {criteriaTotal > 0 && (
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
              <span className="inline-flex items-center gap-1">
                <CheckSquare className="w-3 h-3 text-emerald-500" />
                {criteriaDone}/{criteriaTotal}
              </span>
              <span>{criteriaPct}%</span>
            </div>
            <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${criteriaPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1 truncate font-semibold">
            <UserIcon className="w-3 h-3 shrink-0" />
            {item.assignedUserName ? item.assignedUserName.split(' ')[0] : 'Sin asignar'}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {canManage ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTimer(item.id);
                }}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg font-mono font-bold cursor-pointer transition ${
                  isRunning
                    ? 'bg-emerald-600 text-white animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                }`}
                title={isRunning ? 'Pausar cronómetro y guardar horas' : 'Iniciar cronómetro'}
              >
                {isRunning ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                {formatTimer(item)}
              </button>
            ) : (
              item.loggedHours ? (
                <span className="inline-flex items-center gap-0.5 font-mono">
                  <Clock className="w-2.5 h-2.5" /> {item.loggedHours}h
                </span>
              ) : null
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Barra de Sprints Ágiles y Velocidad */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
              <Zap className="w-4 h-4 text-indigo-500" /> Sprints:
            </span>
            <select
              value={sprintFilter}
              onChange={(e) => setSprintFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
            >
              <option value="all">Todos los ítems ({project.workItems.length})</option>
              <option value="backlog">Solo Backlog ({project.workItems.filter((w) => !w.sprintId).length})</option>
              {sprints.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name} [{sp.status === 'active' ? 'Activo' : sp.status === 'completed' ? 'Cerrado' : 'Planificado'}] ({sp.startDate} → {sp.endDate})
                </option>
              ))}
            </select>

            <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-[11px] font-extrabold">
              Velocidad: {sprintVelocity.donePts}/{sprintVelocity.totalPts} pts
            </span>

            {activeSprint && canManage && (
              <button
                type="button"
                onClick={() => {
                  const nextPlanned = sprints.find((s) => s.status === 'planned');
                  onCloseSprint(activeSprint.id, nextPlanned?.id);
                }}
                className="px-2.5 py-1 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-500/20 cursor-pointer"
                title="Cierra el sprint activo y mueve tareas pendientes al siguiente sprint o backlog"
              >
                Cerrar {activeSprint.name} (Rollover)
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setShowSprintForm((v) => !v)}
                  className="px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-500/20 cursor-pointer"
                >
                  + Nuevo Sprint
                </button>
                <button
                  type="button"
                  onClick={() => setShowWipEditor((v) => !v)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" /> WIP Limits
                </button>
              </>
            )}
          </div>
        </div>

        {/* Formulario Nuevo Sprint */}
        {showSprintForm && canManage && (
          <form
            onSubmit={handleCreateSprintSubmit}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60"
          >
            <input
              type="text"
              value={spName}
              onChange={(e) => setSpName(e.target.value)}
              placeholder={`Sprint ${sprints.length + 1}`}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            />
            <input
              type="text"
              value={spGoal}
              onChange={(e) => setSpGoal(e.target.value)}
              placeholder="Objetivo del sprint..."
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
            <input
              type="date"
              value={spStart}
              onChange={(e) => setSpStart(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
            <input
              type="date"
              value={spEnd}
              onChange={(e) => setSpEnd(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
            <div className="flex gap-1.5 justify-end">
              <button
                type="button"
                onClick={() => setShowSprintForm(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold cursor-pointer"
              >
                Crear
              </button>
            </div>
          </form>
        )}

        {/* Editor de WIP Limits */}
        {showWipEditor && canManage && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                Límites WIP por Columna (0 = sin límite)
              </span>
              <button
                type="button"
                onClick={async () => {
                  await onUpdateWipLimits(wipDraft);
                  setShowWipEditor(false);
                }}
                className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer"
              >
                Guardar WIP
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {WORK_ITEM_COLUMNS.map((col) => (
                <div key={col.id} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block truncate">{col.label}</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={wipDraft[col.id] ?? 0}
                    onChange={(e) =>
                      setWipDraft((prev) => ({ ...prev, [col.id]: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filtros Kanban + Búsqueda + Swimlanes */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-software-search="true"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, título, responsable o #tag..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={milestoneFilter}
              onChange={(e) => setMilestoneFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
            >
              <option value="all">Todos los Hitos</option>
              {project.milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.title}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
            >
              <option value="all">Todos los Tipos</option>
              <option value="tasks">Solo Tareas</option>
              <option value="bugs">Solo Bugs QA</option>
            </select>

            {allTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
              >
                <option value="all">Todas las #Tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            )}

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
            >
              <option value="all">Severidad</option>
              <option value="critical">Crítico</option>
              <option value="major">Mayor</option>
              <option value="minor">Menor</option>
              <option value="cosmetic">Cosmético</option>
            </select>

            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={swimlaneMode}
                onChange={(e) => setSwimlaneMode(e.target.value as SwimlaneMode)}
                className="bg-transparent text-xs font-bold focus:outline-none"
                title="Agrupar por Swimlanes"
              >
                <option value="none">Sin Swimlanes</option>
                <option value="milestone">Carriles por Hito</option>
                <option value="assignee">Carriles por Dev</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filtros rápidos + botones crear */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: 'none', label: 'Todos' },
                { key: 'mine', label: 'Mis tareas' },
                { key: 'unassigned', label: 'Sin asignar' },
                { key: 'overdue', label: 'Vencidas' },
                { key: 'blocked', label: 'Bloqueadas' },
              ] as const
            ).map((qf) => (
              <button
                key={qf.key}
                type="button"
                onClick={() => setQuickFilter(qf.key)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                  quickFilter === qf.key
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {qf.label}
              </button>
            ))}
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onAddWorkItem(
                    milestoneFilter !== 'all' ? milestoneFilter : project.milestones[0]?.id || '',
                    'task'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" /> + Nueva Tarea
              </button>
              <button
                type="button"
                onClick={() =>
                  onAddWorkItem(
                    milestoneFilter !== 'all' ? milestoneFilter : project.milestones[0]?.id || '',
                    'bug'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <Bug className="w-3.5 h-3.5" /> + Reportar Bug
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Acciones en Lote (Bulk Actions) */}
      {canManage && selectedIds.length > 0 && (
        <div className="rounded-2xl border border-indigo-400 dark:border-indigo-700 bg-indigo-50/90 dark:bg-indigo-950/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-800 dark:text-indigo-200">
            <span>{selectedIds.length} seleccionados</span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-indigo-500 hover:text-indigo-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="">Cambiar estado...</option>
              {WORK_ITEM_COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={bulkMilestone}
              onChange={(e) => setBulkMilestone(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="">Cambiar hito...</option>
              {project.milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.title}
                </option>
              ))}
            </select>
            <select
              value={bulkSprint}
              onChange={(e) => setBulkSprint(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="">Cambiar sprint...</option>
              <option value="__backlog__">Mover a Backlog</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={bulkAssignee}
              onChange={(e) => setBulkAssignee(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="">Reasignar dev...</option>
              <option value="__none__">Sin asignar</option>
              {teamUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplyBulk}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Aplicar
            </button>
          </div>
        </div>
      )}

      {/* Tablero Kanban (con o sin Swimlanes) */}
      <div className="space-y-5">
        {swimlanes.map((lane) => (
          <div key={lane.id} className="space-y-2">
            {lane.label && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  {lane.label}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {lane.items.length}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
              {WORK_ITEM_COLUMNS.map((col) => {
                const colItems = lane.items.filter((i) => i.status === col.id);
                const totalColCount = filteredItems.filter((i) => i.status === col.id).length;
                const wipLimit = Number(project.wipLimits?.[col.id] || 0);
                const wipExceeded = wipLimit > 0 && totalColCount > wipLimit;
                const dropKey = `${lane.id}:${col.id}`;
                const isOver = dragOverCol === dropKey;

                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => {
                      if (!canManage) return;
                      e.preventDefault();
                      setDragOverCol(dropKey);
                    }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverCol(null);
                      if (draggedId && canManage) {
                        onMoveWorkItem(draggedId, col.id);
                      }
                      setDraggedId(null);
                    }}
                    className={`rounded-2xl border p-2.5 flex flex-col min-h-[300px] transition ${
                      wipExceeded
                        ? 'border-rose-400 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/20'
                        : isOver
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-slate-50/80 dark:bg-slate-950/60'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 px-1 pb-2.5 mb-2 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dot}`} />
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                          {col.label}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          wipExceeded
                            ? 'bg-rose-600 text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                        title={wipExceeded ? `Límite WIP (${wipLimit}) superado` : undefined}
                      >
                        {wipExceeded && <AlertTriangle className="w-2.5 h-2.5" />}
                        {colItems.length}
                        {wipLimit > 0 ? `/${wipLimit}` : ''}
                      </span>
                    </div>

                    <div className="space-y-2 flex-1">
                      {colItems.map(renderCard)}

                      {colItems.length === 0 && (
                        <div className="h-16 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-[11px] text-slate-400">
                          Arrastra aquí
                        </div>
                      )}
                    </div>

                    {/* Creación rápida inline al pie de la columna */}
                    {canManage && swimlaneMode === 'none' && (
                      <div className="pt-2 mt-2 border-t border-slate-200/70 dark:border-slate-800/80 flex gap-1">
                        <input
                          type="text"
                          value={inlineDrafts[col.id] || ''}
                          onChange={(e) =>
                            setInlineDrafts((prev) => ({ ...prev, [col.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleInlineAdd(col.id);
                            }
                          }}
                          placeholder="+ Tarea rápida..."
                          disabled={creatingCol === col.id}
                          className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]"
                        />
                        {(inlineDrafts[col.id] || '').trim() && (
                          <button
                            type="button"
                            onClick={() => handleInlineAdd(col.id)}
                            disabled={creatingCol === col.id}
                            className="p-1.5 rounded-lg bg-indigo-600 text-white cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
