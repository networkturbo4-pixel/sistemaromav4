import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Code2,
  Plus,
  Search,
  Globe,
  Figma,
  GitBranch,
  Share2,
  Bug,
  Flag,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  ArrowRight,
  Copy,
  BookmarkPlus,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react';
import { SoftwareProject, SoftwareProjectStatus } from '../../../../../shared/types';
import { PROJECT_STATUS_META, SOFTWARE_PROJECT_TEMPLATES, MILESTONE_STATUS_META } from './templates';

interface SoftwareProjectsListViewProps {
  projects: SoftwareProject[];
  loading: boolean;
  canManage: boolean;
  onBackToHub: () => void;
  onSelectProject: (project: SoftwareProject) => void;
  onCreateProject: () => void;
  onEditProject: (project: SoftwareProject) => void;
  onDeleteProject: (project: SoftwareProject) => void;
  onShareProject: (project: SoftwareProject) => void;
  onCloneProject: (project: SoftwareProject) => void;
  onSaveAsTemplate: (project: SoftwareProject) => void;
}

export const SoftwareProjectsListView: React.FC<SoftwareProjectsListViewProps> = ({
  projects,
  loading,
  canManage,
  onBackToHub,
  onSelectProject,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onShareProject,
  onCloneProject,
  onSaveAsTemplate,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SoftwareProjectStatus>('all');
  const [listMode, setListMode] = useState<'projects' | 'weekly_milestones'>('projects');

  const weeklyMilestones = useMemo(() => {
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const in7Days = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const rows: Array<{
      project: SoftwareProject;
      milestone: SoftwareProject['milestones'][number];
      isOverdue: boolean;
      daysLeft: number;
    }> = [];
    projects.forEach((p) => {
      if (p.status === 'deployed' || p.status === 'paused') return;
      (p.milestones || []).forEach((m) => {
        if (m.status === 'approved' || !m.dueDate) return;
        if (m.dueDate <= in7Days) {
          const dMs = new Date(`${m.dueDate}T12:00:00`).getTime();
          const tMs = new Date(`${todayIso}T12:00:00`).getTime();
          const daysLeft = Math.round((dMs - tMs) / 86400000);
          rows.push({ project: p, milestone: m, isOverdue: m.dueDate < todayIso, daysLeft });
        }
      });
    });
    return rows.sort((a, b) => a.milestone.dueDate.localeCompare(b.milestone.dueDate));
  }, [projects]);

  const stats = useMemo(() => {
    const active = projects.filter(
      (p) => p.status !== 'deployed' && p.status !== 'paused'
    ).length;
    const inClientReview = projects.reduce(
      (acc, p) => acc + p.milestones.filter((m) => m.status === 'client_review').length,
      0
    );
    const openBugs = projects.reduce(
      (acc, p) => acc + p.workItems.filter((w) => w.type === 'bug' && w.status !== 'done').length,
      0
    );
    const avgProgress =
      projects.length > 0
        ? Math.round(projects.reduce((acc, p) => acc + (p.totalProgress || 0), 0) / projects.length)
        : 0;
    return { active, inClientReview, openBugs, avgProgress };
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        (p.brandName || '').toLowerCase().includes(q) ||
        p.techStack.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [projects, search, statusFilter]);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Cabecera */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onBackToHub}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al Hub de Workspace
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Desarrollo de Software
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Proyectos de ingeniería con hitos dinámicos, Kanban técnico, QA/Bugs, Gantt y aprobación de clientes.
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={onCreateProject}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Nuevo Proyecto de Software
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Proyectos Activos</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.active}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{projects.length} registrados en total</p>
        </div>
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Hitos en Revisión Cliente
          </p>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
            {stats.inClientReview}
          </p>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            Esperando feedback o aprobación
          </p>
        </div>
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4">
          <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Bugs QA Abiertos
          </p>
          <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">{stats.openBugs}</p>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
            Incidencias por resolver
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Avance Promedio
          </p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {stats.avgProgress}%
          </p>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
            Ponderado por hitos
          </p>
        </div>
      </div>

      {/* Buscador, filtros y switcher de vista comparativa multi-proyecto */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shrink-0">
          <button
            type="button"
            onClick={() => setListMode('projects')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition ${
              listMode === 'projects'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Proyectos ({filtered.length})
          </button>
          <button
            type="button"
            onClick={() => setListMode('weekly_milestones')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition ${
              listMode === 'weekly_milestones'
                ? 'bg-amber-600 text-white'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Vencimientos Semana ({weeklyMilestones.length})
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por proyecto, código, cliente, marca o tecnología..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
        >
          <option value="all">Todos los Estados</option>
          {(Object.keys(PROJECT_STATUS_META) as SoftwareProjectStatus[]).map((st) => (
            <option key={st} value={st}>
              {PROJECT_STATUS_META[st].label}
            </option>
          ))}
        </select>
      </div>

      {/* Vista Comparativa Multi-Proyecto: Hitos que vencen esta semana o vencidos */}
      {listMode === 'weekly_milestones' ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-3">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-amber-500" />
              Tablero Multi-Proyecto: Hitos Vencidos y Próximos 7 Días ({weeklyMilestones.length})
            </h3>
            <p className="text-xs text-slate-500">
              Vista ejecutiva de todas las entregas críticas de la agencia esta semana.
            </p>
          </div>
          {weeklyMilestones.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No hay hitos vencidos ni con entrega en los próximos 7 días. ¡Todo al día!
            </div>
          ) : (
            <div className="space-y-2">
              {weeklyMilestones.map(({ project, milestone, isOverdue, daysLeft }) => {
                const stMeta = MILESTONE_STATUS_META[milestone.status] || MILESTONE_STATUS_META.pending;
                return (
                  <div
                    key={`${project.id}-${milestone.id}`}
                    onClick={() => onSelectProject(project)}
                    className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition hover:shadow-sm ${
                      isOverdue
                        ? 'border-rose-300 dark:border-rose-800/70 bg-rose-50/40 dark:bg-rose-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
                          {project.code} · {milestone.code}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {milestone.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stMeta.badge}`}>
                          {stMeta.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Proyecto: <strong className="text-slate-700 dark:text-slate-200">{project.name}</strong> · Cliente: {project.clientName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                        {milestone.progress}%
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold ${
                          isOverdue
                            ? 'bg-rose-600 text-white'
                            : daysLeft === 0
                              ? 'bg-amber-500 text-white'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {isOverdue && <AlertTriangle className="w-3 h-3" />}
                        {isOverdue
                          ? `Vencido hace ${Math.abs(daysLeft)}d (${milestone.dueDate})`
                          : daysLeft === 0
                            ? `Vence HOY (${milestone.dueDate})`
                            : `En ${daysLeft}d (${milestone.dueDate})`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-56 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mx-auto">
            <Code2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            {projects.length === 0
              ? 'Crea tu primer proyecto de desarrollo de software'
              : 'No hay proyectos que coincidan con tu búsqueda'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Usa plantillas dinámicas de hitos para webs, e-commerce, apps móviles o sistemas a medida, y comparte el avance interactivo con tu cliente.
          </p>
          {canManage && projects.length === 0 && (
            <button
              type="button"
              onClick={onCreateProject}
              className="px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold cursor-pointer"
            >
              + Nuevo Proyecto de Software
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const stMeta = PROJECT_STATUS_META[project.status] || PROJECT_STATUS_META.planning;
            const tplLabel =
              SOFTWARE_PROJECT_TEMPLATES.find((t) => t.key === project.projectType)?.shortLabel ||
              'Software';
            const approvedMilestones = project.milestones.filter((m) => m.status === 'approved').length;
            const openBugs = project.workItems.filter(
              (w) => w.type === 'bug' && w.status !== 'done'
            ).length;

            return (
              <div
                key={project.id}
                className="group rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs hover:shadow-md hover:border-cyan-400/60 transition flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {project.code}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        {tplLabel}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stMeta.badge}`}>
                        {stMeta.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onShareProject(project)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                        title="Compartir enlace público /dev/:token"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => onCloneProject(project)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 cursor-pointer"
                            title="Clonar proyecto completo con fechas ajustadas"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSaveAsTemplate(project)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 cursor-pointer"
                            title="Guardar como plantilla reutilizable"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditProject(project)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer"
                            title="Editar proyecto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProject(project)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Eliminar proyecto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => onSelectProject(project)}
                      className="text-left text-base font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition line-clamp-1 cursor-pointer"
                    >
                      {project.name}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {project.clientName}
                      {project.brandName ? ` · ${project.brandName}` : ''}
                    </p>
                  </div>

                  {/* Barra de avance */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Flag className="w-3 h-3 text-indigo-500" />
                        {approvedMilestones}/{project.milestones.length} hitos aprobados
                      </span>
                      <span className="text-slate-900 dark:text-white font-black">
                        {project.totalProgress}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all duration-300"
                        style={{ width: `${project.totalProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Stack */}
                  {project.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.techStack.slice(0, 4).map((tech) => (
                        <span
                          key={tech}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {tech}
                        </span>
                      ))}
                      {project.techStack.length > 4 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          +{project.techStack.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Pie de tarjeta */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[11px]">
                    {openBugs > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                        <Bug className="w-3.5 h-3.5" /> {openBugs}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> QA OK
                      </span>
                    )}
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                      <Clock className="w-3 h-3" /> {project.targetEndDate || '—'}
                    </span>
                    <div className="flex items-center gap-1 ml-1">
                      {project.environments?.figmaUrl && (
                        <a
                          href={project.environments.figmaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-pink-500 hover:scale-110 transition"
                          title="Figma"
                        >
                          <Figma className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {project.environments?.stagingUrl && (
                        <a
                          href={project.environments.stagingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-500 hover:scale-110 transition"
                          title="Staging"
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {project.environments?.repoUrl && (
                        <a
                          href={project.environments.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-500 hover:scale-110 transition"
                          title="Repositorio"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectProject(project)}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    <span>Abrir</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
