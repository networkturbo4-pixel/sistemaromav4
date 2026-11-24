import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Download,
  Printer,
  Flame,
  Users,
  TrendingDown,
  CalendarPlus,
  Clock,
} from 'lucide-react';
import { SoftwareProject, SoftwareMilestone, User } from '../../../../../../shared/types';
import { MILESTONE_STATUS_META } from '../templates';

interface SoftwareGanttTabProps {
  project: SoftwareProject;
  teamUsers: User[];
  canManage: boolean;
  onSelectMilestone: (milestone: SoftwareMilestone) => void;
  onUpdateMilestoneDates: (milestoneId: string, startDate: string, dueDate: string) => Promise<void>;
  onLoadTeamAvailability?: () => Promise<{
    absencesByUser: Record<string, Array<{ date: string; status: string; notes?: string }>>;
    capacityByUser: Record<string, { weeklyHours: number; status: string }>;
  } | null>;
}

type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

const DAY_MS = 86400000;

function toTs(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function addDays(iso: string, delta: number): string {
  const ts = toTs(iso) || Date.now();
  return new Date(ts + delta * DAY_MS).toISOString().slice(0, 10);
}

function diffDays(a?: string, b?: string): number {
  const ta = toTs(a);
  const tb = toTs(b);
  if (!ta || !tb) return 0;
  return Math.round((tb - ta) / DAY_MS);
}

export const SoftwareGanttTab: React.FC<SoftwareGanttTabProps> = ({
  project,
  teamUsers,
  canManage,
  onSelectMilestone,
  onUpdateMilestoneDates,
  onLoadTeamAvailability,
}) => {
  const [subTab, setSubTab] = useState<'gantt' | 'workload' | 'burndown'>('gantt');
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Drag/resize state for milestone bars
  const [dragState, setDragState] = useState<{
    milestoneId: string;
    mode: 'move' | 'resize-left' | 'resize-right';
    originX: number;
    origStart: string;
    origDue: string;
    previewStart: string;
    previewDue: string;
  } | null>(null);

  // HR Availability state
  const [hrAvailability, setHrAvailability] = useState<{
    absencesByUser: Record<string, Array<{ date: string; status: string; notes?: string }>>;
    capacityByUser: Record<string, { weeklyHours: number; status: string }>;
  }>({ absencesByUser: {}, capacityByUser: {} });

  useEffect(() => {
    if (subTab === 'workload' && onLoadTeamAvailability) {
      onLoadTeamAvailability().then((res) => {
        if (res) setHrAvailability(res);
      });
    }
  }, [subTab, onLoadTeamAvailability]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayTs = toTs(todayIso) || Date.now();

  const pxPerDay = zoom === 'day' ? 38 : zoom === 'week' ? 22 : zoom === 'month' ? 12 : 6;

  const timeline = useMemo(() => {
    const timestamps: number[] = [];
    const pStart = toTs(project.startDate);
    const pEnd = toTs(project.targetEndDate);
    if (pStart) timestamps.push(pStart);
    if (pEnd) timestamps.push(pEnd);
    project.milestones.forEach((m) => {
      const s = toTs(m.startDate);
      const e = toTs(m.dueDate);
      if (s) timestamps.push(s);
      if (e) timestamps.push(e);
    });
    if (timestamps.length === 0) {
      const minTs = todayTs - 3 * DAY_MS;
      const maxTs = todayTs + 30 * DAY_MS;
      return { minTs, maxTs, totalDays: 33, totalWidth: 33 * pxPerDay, ticks: [] as Array<{ label: string; leftPx: number }> };
    }
    const minTs = Math.min(...timestamps) - 4 * DAY_MS;
    const maxTs = Math.max(...timestamps, minTs + 14 * DAY_MS) + 6 * DAY_MS;
    const totalDays = Math.max(14, Math.ceil((maxTs - minTs) / DAY_MS));
    const totalWidth = Math.max(640, totalDays * pxPerDay);
    const stepDays = zoom === 'day' ? 2 : zoom === 'week' ? 7 : zoom === 'month' ? 14 : 30;
    const ticks: Array<{ label: string; leftPx: number }> = [];
    for (let d = 0; d <= totalDays; d += stepDays) {
      const ts = minTs + d * DAY_MS;
      ticks.push({
        label: new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
        leftPx: d * pxPerDay,
      });
    }
    return { minTs, maxTs, totalDays, totalWidth, ticks };
  }, [project.milestones, project.startDate, project.targetEndDate, pxPerDay, zoom, todayTs]);

  const todayLeftPx = ((todayTs - timeline.minTs) / DAY_MS) * pxPerDay;

  const scrollToToday = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTo({
      left: Math.max(0, todayLeftPx - scrollContainerRef.current.clientWidth / 2),
      behavior: 'smooth',
    });
  };

  // Pointer drag listeners for resizing/moving milestone bars
  useEffect(() => {
    if (!dragState) return;
    const onMove = (e: MouseEvent) => {
      const deltaDays = Math.round((e.clientX - dragState.originX) / pxPerDay);
      if (dragState.mode === 'move') {
        setDragState((prev) =>
          prev
            ? {
                ...prev,
                previewStart: addDays(prev.origStart, deltaDays),
                previewDue: addDays(prev.origDue, deltaDays),
              }
            : null
        );
      } else if (dragState.mode === 'resize-left') {
        const nextStart = addDays(dragState.origStart, deltaDays);
        if (nextStart <= dragState.origDue) {
          setDragState((prev) => (prev ? { ...prev, previewStart: nextStart } : null));
        }
      } else {
        const nextDue = addDays(dragState.origDue, deltaDays);
        if (nextDue >= dragState.origStart) {
          setDragState((prev) => (prev ? { ...prev, previewDue: nextDue } : null));
        }
      }
    };
    const onUp = () => {
      const finished = dragState;
      setDragState(null);
      if (finished.previewStart !== finished.origStart || finished.previewDue !== finished.origDue) {
        onUpdateMilestoneDates(finished.milestoneId, finished.previewStart, finished.previewDue);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragState, pxPerDay, onUpdateMilestoneDates]);

  // Ruta crítica (hitos con mayor fecha fin o cadena de dependencias hasta el último hito)
  const criticalMilestoneIds = useMemo(() => {
    const set = new Set<string>();
    if (project.milestones.length === 0) return set;
    const byId = new Map(project.milestones.map((m) => [m.id, m]));
    let latest = project.milestones[0];
    project.milestones.forEach((m) => {
      if ((m.dueDate || '') >= (latest.dueDate || '')) latest = m;
    });
    const walk = (m?: SoftwareMilestone) => {
      if (!m || set.has(m.id)) return;
      set.add(m.id);
      (m.dependsOnMilestoneIds || []).forEach((depId) => walk(byId.get(depId)));
    };
    walk(latest);
    // También incluir hitos vencidos no aprobados
    project.milestones.forEach((m) => {
      if (m.dueDate && m.dueDate < todayIso && m.status !== 'approved') set.add(m.id);
    });
    return set;
  }, [project.milestones, todayIso]);

  // Schedule Variance global (días de desviación vs baseline)
  const scheduleVarianceDays = useMemo(() => {
    if (project.milestones.length === 0) return 0;
    const latestCurrent = project.milestones.reduce((acc, m) => (m.dueDate > acc ? m.dueDate : acc), '');
    const latestBaseline = project.milestones.reduce(
      (acc, m) => ((m.baselineDueDate || m.dueDate) > acc ? m.baselineDueDate || m.dueDate : acc),
      ''
    );
    return diffDays(latestBaseline, latestCurrent);
  }, [project.milestones]);

  // Exportar hitos como archivo .ics (Google Calendar / Outlook)
  const handleExportIcs = () => {
    const formatIcsDate = (iso: string) => iso.replace(/-/g, '');
    const events = project.milestones
      .filter((m) => m.dueDate)
      .map((m) => [
        'BEGIN:VEVENT',
        `UID:${m.id}@sistemaroma.app`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
        `DTSTART;VALUE=DATE:${formatIcsDate(m.startDate || m.dueDate)}`,
        `DTEND;VALUE=DATE:${formatIcsDate(addDays(m.dueDate, 1))}`,
        `SUMMARY:[${project.code}] ${m.code} - ${m.title}`,
        `DESCRIPTION:${(m.description || '').replace(/\n/g, '\\n')} (Avance: ${m.progress}%)`,
        'END:VEVENT',
      ].join('\r\n'));

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SISTEMA ROMA V4//Software Gantt//ES',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cronograma_${project.code}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Workload por desarrollador
  const workloadRows = useMemo(() => {
    const devMap = new Map<
      string,
      {
        id: string;
        name: string;
        openTasks: number;
        estimatedHours: number;
        loggedHours: number;
        weeklyCapacity: number;
        absences: Array<{ date: string; status: string; notes?: string }>;
      }
    >();

    const registerUser = (id: string, name: string) => {
      if (!devMap.has(id)) {
        devMap.set(id, {
          id,
          name,
          openTasks: 0,
          estimatedHours: 0,
          loggedHours: 0,
          weeklyCapacity: hrAvailability.capacityByUser[id]?.weeklyHours || 40,
          absences: hrAvailability.absencesByUser[id] || [],
        });
      }
      return devMap.get(id)!;
    };

    (project.assignedUsers || []).forEach((u) => registerUser(u.id, u.name));
    project.workItems.forEach((w) => {
      const uid = w.assignedUserId || '__unassigned__';
      const uname = w.assignedUserName || teamUsers.find((u) => u.id === uid)?.name || 'Sin asignar';
      const row = registerUser(uid, uname);
      if (w.status !== 'done') {
        row.openTasks += 1;
        row.estimatedHours += Number(w.estimatedHours) || 2;
      }
      row.loggedHours += Number(w.loggedHours) || 0;
    });

    return Array.from(devMap.values()).sort((a, b) => b.estimatedHours - a.estimatedHours);
  }, [project.assignedUsers, project.workItems, teamUsers, hrAvailability]);

  // Datos Burndown / Burnup
  const burndownData = useMemo(() => {
    const total = project.workItems.length || 1;
    const done = project.workItems.filter((w) => w.status === 'done').length;
    const remaining = total - done;
    const points = 6;
    const ideal: number[] = [];
    const actualRemaining: number[] = [];
    const actualBurnup: number[] = [];
    for (let i = 0; i <= points; i++) {
      const ratio = i / points;
      ideal.push(Math.round(total * (1 - ratio)));
      const doneAtStep = Math.round(done * ratio);
      actualBurnup.push(doneAtStep);
      actualRemaining.push(Math.max(0, total - doneAtStep));
    }
    return { total, done, remaining, ideal, actualRemaining, actualBurnup };
  }, [project.workItems]);

  return (
    <div className="space-y-4">
      {/* Sub-navegación + Schedule Variance + Exportaciones */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'gantt' as const, label: 'Gantt Interactivo', icon: Calendar },
            { id: 'workload' as const, label: 'Carga del Equipo & RR.HH.', icon: Users },
            { id: 'burndown' as const, label: 'Burndown / Burnup', icon: TrendingDown },
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
          <span
            className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${
              scheduleVarianceDays > 0
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25'
                : scheduleVarianceDays < 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            Desviación vs Baseline:{' '}
            {scheduleVarianceDays > 0
              ? `+${scheduleVarianceDays}d atraso`
              : scheduleVarianceDays < 0
                ? `${Math.abs(scheduleVarianceDays)}d adelanto`
                : 'En fecha (0d)'}
          </span>

          <button
            type="button"
            onClick={handleExportIcs}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
            title="Descargar eventos para Google Calendar / Outlook"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-indigo-500" /> .ICS Calendar
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* SUBTAB 1: GANTT INTERACTIVO */}
      {subTab === 'gantt' && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Cronograma Gantt Interactivo
              </h3>
              <p className="text-xs text-slate-500">
                Arrastra una barra o sus bordes laterales para reprogramar fechas. Expande un hito para ver sus tareas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-950">
                {(
                  [
                    { id: 'day', label: 'Día' },
                    { id: 'week', label: 'Semana' },
                    { id: 'month', label: 'Mes' },
                    { id: 'quarter', label: 'Trim.' },
                  ] as const
                ).map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setZoom(z.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                      zoom === z.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={scrollToToday}
                className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" /> Ir a Hoy
              </button>

              <button
                type="button"
                onClick={() => setShowCriticalPath((v) => !v)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                  showCriticalPath
                    ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <Flame className="w-3.5 h-3.5" /> Ruta Crítica
              </button>
            </div>
          </div>

          {project.milestones.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              Agrega hitos al proyecto para visualizar el cronograma Gantt.
            </p>
          ) : (
            <div ref={scrollContainerRef} className="overflow-x-auto pb-2 select-none">
              <div style={{ width: `${timeline.totalWidth + 240}px` }} className="relative">
                {/* Eje temporal */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                  <div className="w-[240px] shrink-0 text-[10px] font-extrabold uppercase text-slate-400 px-2">
                    Hito / Tareas
                  </div>
                  <div className="relative flex-1 h-5">
                    {timeline.ticks.map((tick, idx) => (
                      <span
                        key={idx}
                        style={{ left: `${tick.leftPx}px` }}
                        className="absolute text-[10px] font-bold text-slate-400 whitespace-nowrap"
                      >
                        {tick.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Filas de Hitos + Tareas expandibles */}
                <div className="relative space-y-2">
                  {/* Línea vertical de HOY */}
                  {todayLeftPx >= 0 && todayLeftPx <= timeline.totalWidth && (
                    <div
                      style={{ left: `${240 + todayLeftPx}px` }}
                      className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80 z-20 pointer-events-none"
                    />
                  )}

                  {project.milestones.map((m) => {
                    const isDragging = dragState?.milestoneId === m.id;
                    const sIso = isDragging ? dragState.previewStart : m.startDate || todayIso;
                    const eIso = isDragging ? dragState.previewDue : m.dueDate || sIso;
                    const sTs = toTs(sIso) || timeline.minTs;
                    const eTs = Math.max(sTs + DAY_MS, (toTs(eIso) || sTs) + DAY_MS);
                    const leftPx = Math.max(0, ((sTs - timeline.minTs) / DAY_MS) * pxPerDay);
                    const widthPx = Math.max(28, ((eTs - sTs) / DAY_MS) * pxPerDay);
                    const stMeta = MILESTONE_STATUS_META[m.status] || MILESTONE_STATUS_META.pending;
                    const isCritical = showCriticalPath && criticalMilestoneIds.has(m.id);
                    const isExpanded = Boolean(expandedMilestones[m.id]);
                    const mItems = project.workItems.filter((w) => w.milestoneId === m.id);
                    const hasDeps = (m.dependsOnMilestoneIds || []).length > 0;

                    return (
                      <div key={m.id} className="space-y-1">
                        <div className="flex items-center">
                          {/* Columna izquierda: título */}
                          <div className="w-[240px] shrink-0 pr-3 flex items-center gap-1.5 min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedMilestones((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                              }
                              className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer shrink-0"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectMilestone(m)}
                              className="text-left min-w-0 flex-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono font-black text-slate-400">{m.code}</span>
                                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                                  {m.title}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {sIso} → {eIso} · {m.progress}%
                                {hasDeps && ' · 🔗'}
                              </div>
                            </button>
                          </div>

                          {/* Track de barra */}
                          <div className="relative flex-1 h-9 rounded-xl bg-slate-100/70 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800">
                            <div
                              style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                              onMouseDown={(e) => {
                                if (!canManage) return;
                                e.stopPropagation();
                                setDragState({
                                  milestoneId: m.id,
                                  mode: 'move',
                                  originX: e.clientX,
                                  origStart: m.startDate || todayIso,
                                  origDue: m.dueDate || m.startDate || todayIso,
                                  previewStart: m.startDate || todayIso,
                                  previewDue: m.dueDate || m.startDate || todayIso,
                                });
                              }}
                              className={`absolute top-1 bottom-1 rounded-lg overflow-hidden flex items-center px-2 text-[10px] font-extrabold text-white shadow-xs transition-shadow ${
                                stMeta.barColor
                              } ${canManage ? 'cursor-grab active:cursor-grabbing' : ''} ${
                                isCritical ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-900' : ''
                              }`}
                              title={`${m.code} ${m.title} (${sIso} → ${eIso})`}
                            >
                              {/* Handle izquierdo */}
                              {canManage && (
                                <div
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setDragState({
                                      milestoneId: m.id,
                                      mode: 'resize-left',
                                      originX: e.clientX,
                                      origStart: m.startDate || todayIso,
                                      origDue: m.dueDate || m.startDate || todayIso,
                                      previewStart: m.startDate || todayIso,
                                      previewDue: m.dueDate || m.startDate || todayIso,
                                    });
                                  }}
                                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40"
                                />
                              )}
                              <span className="truncate pointer-events-none">
                                {m.code} ({m.progress}%)
                              </span>
                              {/* Handle derecho */}
                              {canManage && (
                                <div
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setDragState({
                                      milestoneId: m.id,
                                      mode: 'resize-right',
                                      originX: e.clientX,
                                      origStart: m.startDate || todayIso,
                                      origDue: m.dueDate || m.startDate || todayIso,
                                      previewStart: m.startDate || todayIso,
                                      previewDue: m.dueDate || m.startDate || todayIso,
                                    });
                                  }}
                                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40"
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tareas expandibles del hito */}
                        {isExpanded && mItems.length > 0 && (
                          <div className="space-y-1 pl-6">
                            {mItems.map((item) => {
                              const iEndTs = toTs(item.dueDate) || eTs;
                              const iStartTs = Math.min(iEndTs - DAY_MS, sTs);
                              const iLeft = Math.max(0, ((iStartTs - timeline.minTs) / DAY_MS) * pxPerDay);
                              const iWidth = Math.max(20, ((iEndTs - iStartTs) / DAY_MS) * pxPerDay);
                              return (
                                <div key={item.id} className="flex items-center">
                                  <div className="w-[216px] shrink-0 pr-3 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                                    <span className="font-mono text-[10px] text-slate-400 mr-1">{item.code}</span>
                                    {item.title}
                                  </div>
                                  <div className="relative flex-1 h-5 rounded-md bg-slate-50 dark:bg-slate-950/40">
                                    <div
                                      style={{ left: `${iLeft}px`, width: `${iWidth}px` }}
                                      className={`absolute top-0.5 bottom-0.5 rounded px-1.5 text-[9px] font-bold text-white flex items-center truncate ${
                                        item.status === 'done'
                                          ? 'bg-emerald-500/80'
                                          : item.type === 'bug'
                                            ? 'bg-rose-500/80'
                                            : 'bg-sky-500/80'
                                      }`}
                                    >
                                      {item.assignedUserName ? item.assignedUserName.split(' ')[0] : item.status}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: MAPA DE CARGA DE TRABAJO (WORKLOAD) + CRUCE RR.HH. */}
      {subTab === 'workload' && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Mapa de Carga de Trabajo y Disponibilidad RR.HH.
            </h3>
            <p className="text-xs text-slate-500">
              Horas estimadas pendientes vs. capacidad semanal, cruzado con ausencias/vacaciones registradas en Asistencia de ROMA.
            </p>
          </div>

          {workloadRows.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No hay tareas asignadas aún.</p>
          ) : (
            <div className="space-y-3">
              {workloadRows.map((row) => {
                const pct = Math.min(140, Math.round((row.estimatedHours / Math.max(1, row.weeklyCapacity)) * 100));
                const overloaded = pct > 100;
                return (
                  <div
                    key={row.id}
                    className={`p-4 rounded-2xl border space-y-2 ${
                      overloaded
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white">{row.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {row.openTasks} tareas abiertas · {row.loggedHours.toFixed(1)}h registradas
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${overloaded ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}>
                          {row.estimatedHours.toFixed(1)}h / {row.weeklyCapacity}h ({pct}%)
                        </span>
                        {overloaded && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold">
                            Sobrecargado
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          overloaded ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    {row.absences.length > 0 && (
                      <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Novedades RR.HH.:</span>
                        {row.absences.slice(0, 4).map((ab, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/25">
                            {ab.date} ({ab.status})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: BURNDOWN / BURNUP */}
      {subTab === 'burndown' && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-indigo-500" />
                Curva Burndown & Burnup del Proyecto
              </h3>
              <p className="text-xs text-slate-500">
                Comparativa entre el ritmo ideal y los ítems completados ({burndownData.done}/{burndownData.total}).
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 text-slate-400">
                <span className="w-3 h-0.5 bg-slate-400 inline-block" /> Ideal
              </span>
              <span className="inline-flex items-center gap-1 text-rose-500">
                <span className="w-3 h-0.5 bg-rose-500 inline-block" /> Pendientes (Burndown)
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-500">
                <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Completados (Burnup)
              </span>
            </div>
          </div>

          <svg viewBox="0 0 600 220" className="w-full h-56 overflow-visible">
            {[0, 0.25, 0.5, 0.75, 1].map((r) => (
              <line
                key={r}
                x1="40"
                y1={20 + r * 170}
                x2="580"
                y2={20 + r * 170}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeDasharray="4 4"
              />
            ))}
            {/* Ideal */}
            <polyline
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="6 4"
              points={burndownData.ideal
                .map((v, i) => `${40 + (i / (burndownData.ideal.length - 1)) * 540},${190 - (v / burndownData.total) * 170}`)
                .join(' ')}
            />
            {/* Burndown */}
            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth="3"
              points={burndownData.actualRemaining
                .map((v, i) => `${40 + (i / (burndownData.actualRemaining.length - 1)) * 540},${190 - (v / burndownData.total) * 170}`)
                .join(' ')}
            />
            {/* Burnup */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              points={burndownData.actualBurnup
                .map((v, i) => `${40 + (i / (burndownData.actualBurnup.length - 1)) * 540},${190 - (v / burndownData.total) * 170}`)
                .join(' ')}
            />
          </svg>
        </div>
      )}
    </div>
  );
};
