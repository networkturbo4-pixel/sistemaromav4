import React from 'react';
import {
  ArrowLeft,
  Plus,
  FolderPlus,
  Hourglass,
  Newspaper,
  MessageSquare,
  Calendar,
  Clock,
  ChevronDown,
  Edit3,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { PermissionGate } from '../../../../context/AppContext';
import {
  WorkspaceMonth,
  WorkspaceProject,
  WorkspaceMonthStatus,
} from '../../../../shared/types';
import {
  calculateCountdown,
  formatMonthDateRange,
  formatCreatedDate,
} from '../../types';

interface SocialMonthsViewProps {
  months: WorkspaceMonth[];
  activeProject?: WorkspaceProject;
  selectedProjectId: string;
  currentTime: number;
  getMonthStats: (m: WorkspaceMonth) => {
    totalPosts: number;
    drafts: number;
    review: number;
    approved: number;
    published: number;
    comments: number;
    progressPercent: number;
  };
  onBackToProjects: () => void;
  onOpenNewMonth: () => void;
  onOpenEditMonth: (m: WorkspaceMonth) => void;
  onDeleteMonth: (m: WorkspaceMonth) => void;
  onUpdateMonthStatus: (monthId: string, status: WorkspaceMonthStatus) => void;
  onSelectMonth: (monthId: string) => void;
}

export const SocialMonthsView: React.FC<SocialMonthsViewProps> = ({
  months,
  activeProject,
  selectedProjectId,
  currentTime,
  getMonthStats,
  onBackToProjects,
  onOpenNewMonth,
  onOpenEditMonth,
  onDeleteMonth,
  onUpdateMonthStatus,
  onSelectMonth,
}) => {
  const projectMonths = months.filter((m) => m.projectId === selectedProjectId);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera del Proyecto y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {activeProject?.brandName || activeProject?.name}
            </span>
            {activeProject?.serviceOrderCode && (
              <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                {activeProject.serviceOrderCode}
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Campañas y Meses de Contenido
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Administra los meses del proyecto y sus 7 carpetas sincronizadas en Google Drive.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={onBackToProjects}
            className="flex-1 sm:flex-initial justify-center px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>Volver</span>
            <span className="hidden sm:inline">a Proyectos</span>
          </button>

          <PermissionGate permission="workspace.social.manage">
            <button
              type="button"
              onClick={onOpenNewMonth}
              className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nuevo Mes</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Grid de Meses */}
      {projectMonths.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <FolderPlus className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
            No hay meses creados para este proyecto
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            Crea tu primer mes de campaña para organizar publicaciones y generar automáticamente la estructura de 7 carpetas en Google Drive.
          </p>
          <button
            type="button"
            onClick={onOpenNewMonth}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primer Mes</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-6">
          {projectMonths.map((m) => {
            const stats = getMonthStats(m);
            const nameParts = m.name.split(' ');
            const titleFirst = nameParts[0] || m.name;
            const titleRest = nameParts.slice(1).join(' ') || `${m.year}`;

            return (
              <div
                key={m.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  {/* Cabecera del Card: Nombre + Countdown */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                        {titleFirst}
                      </h3>
                      <span className="text-xl font-black text-slate-900 dark:text-white leading-tight block">
                        {titleRest}
                      </span>
                    </div>

                    {/* Pill de cuenta regresiva con reloj de arena */}
                    <div className="bg-sky-50 dark:bg-sky-950/50 border border-sky-200/60 dark:border-sky-800/60 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-extrabold text-[11px] shrink-0">
                      <Hourglass className="w-3.5 h-3.5 shrink-0" />
                      <span className="tracking-tight font-mono">{calculateCountdown(m.endDate, currentTime)}</span>
                    </div>
                  </div>

                  {/* Fila 1: Estadísticas (Publicaciones & Comentarios) */}
                  <div className="grid grid-cols-2 gap-2.5 mt-4">
                    {/* Publicaciones */}
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-2.5 sm:p-3 flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Newspaper className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-lg font-black text-slate-900 dark:text-white leading-none">
                          {stats.totalPosts}
                        </div>
                        <div className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">
                          PUBLICACIONES
                        </div>
                      </div>
                    </div>

                    {/* Comentarios */}
                    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-2.5 sm:p-3 flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-lg font-black text-slate-900 dark:text-white leading-none">
                          {stats.comments}
                        </div>
                        <div className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mt-1 truncate">
                          COMENTARIOS
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Progreso General */}
                  <div className="mt-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-extrabold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                        PROGRESO GENERAL
                      </span>
                      <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                        {stats.progressPercent}%
                      </span>
                    </div>

                    {/* Barra */}
                    <div className="w-full h-1.5 bg-slate-200/70 dark:bg-slate-700/70 rounded-full my-2.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${stats.progressPercent}%` }}
                      />
                    </div>

                    {/* 4 estados */}
                    <div className="grid grid-cols-4 gap-1">
                      <div className="border border-slate-200/70 dark:border-slate-700 rounded-xl p-1.5 text-center bg-white dark:bg-slate-900">
                        <div className="text-xs font-black text-slate-700 dark:text-slate-200 leading-tight">{stats.drafts}</div>
                        <div className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider truncate">BORRADOR</div>
                      </div>
                      <div className="border border-slate-200/70 dark:border-slate-700 rounded-xl p-1.5 text-center bg-white dark:bg-slate-900">
                        <div className="text-xs font-black text-amber-500 leading-tight">{stats.review}</div>
                        <div className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider truncate">REVISIÓN</div>
                      </div>
                      <div className="border border-slate-200/70 dark:border-slate-700 rounded-xl p-1.5 text-center bg-white dark:bg-slate-900">
                        <div className="text-xs font-black text-blue-500 leading-tight">{stats.approved}</div>
                        <div className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider truncate">APROBADO</div>
                      </div>
                      <div className="border border-slate-200/70 dark:border-slate-700 rounded-xl p-1.5 text-center bg-white dark:bg-slate-900">
                        <div className="text-xs font-black text-emerald-500 leading-tight">{stats.published}</div>
                        <div className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider truncate">PUBLICADO</div>
                      </div>
                    </div>
                  </div>

                  {/* Fila 3: Fechas */}
                  <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-500 font-semibold px-0.5">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 truncate">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{formatMonthDateRange(m.startDate, m.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 shrink-0 ml-1">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{formatCreatedDate(m.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Divisor */}
                  <div className="my-3.5 border-t border-slate-100 dark:border-slate-800" />

                  {/* Fila 4: Acciones inferiores */}
                  <div className="flex items-center justify-between gap-1.5">
                    {/* Status Dropdown */}
                    <div className="relative">
                      <select
                        value={m.status}
                        onChange={(e) => onUpdateMonthStatus(m.id, e.target.value as WorkspaceMonthStatus)}
                        className={`appearance-none text-[11px] font-black px-2.5 py-1.5 pr-6 rounded-xl cursor-pointer transition border ${
                          m.status === 'completed'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : m.status === 'in_progress'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : 'bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        <option value="pending">PENDIENTE</option>
                        <option value="in_progress">EN PROCESO</option>
                        <option value="completed">COMPLETADO</option>
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                    </div>

                    {/* Botones de acción: Editar y Borrar */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenEditMonth(m)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        title="Editar mes"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMonth(m)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                        title="Eliminar mes"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Botón Principal: Entrar al Mes */}
                  <button
                    type="button"
                    onClick={() => onSelectMonth(m.id)}
                    className="w-full mt-3.5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>Entrar al Mes</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
