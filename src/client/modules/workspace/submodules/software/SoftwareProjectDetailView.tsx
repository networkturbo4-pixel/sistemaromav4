import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Flag,
  Columns3,
  Bug,
  CalendarRange,
  Share2,
  Edit2,
  Globe,
  Figma,
  GitBranch,
  FolderOpen,
  FileCode2,
  Copy,
  BookmarkPlus,
  Server,
  ShieldCheck,
  Keyboard,
} from 'lucide-react';
import {
  SoftwareProject,
  SoftwareMilestone,
  SoftwareMilestoneStatus,
  SoftwareWorkItem,
  SoftwareWorkItemStatus,
  SoftwareChangeRequest,
  SoftwareSprint,
  SoftwareTestCase,
  SoftwareGoLiveItem,
  SoftwareProjectRoleAssignment,
  User,
} from '../../../../../shared/types';
import { PROJECT_STATUS_META } from './templates';
import { MilestonesRoadmapTab } from './components/MilestonesRoadmapTab';
import { SoftwareKanbanTab } from './components/SoftwareKanbanTab';
import { SoftwareQaBugsTab } from './components/SoftwareQaBugsTab';
import { SoftwareGanttTab } from './components/SoftwareGanttTab';
import { SoftwareDevOpsTab } from './components/SoftwareDevOpsTab';
import { SoftwareAuditTab } from './components/SoftwareAuditTab';

type ProjectDetailTab = 'milestones' | 'kanban' | 'qa' | 'gantt' | 'devops' | 'audit';

interface SoftwareProjectDetailViewProps {
  project: SoftwareProject;
  teamUsers: User[];
  currentUserId?: string;
  canManage: boolean;
  onBack: () => void;
  onEditProject: () => void;
  onShareProject: () => void;
  onCloneProject: () => void;
  onSaveAsTemplate: () => void;
  onAddMilestone: () => void;
  onEditMilestone: (milestone: SoftwareMilestone) => void;
  onDeleteMilestone: (milestone: SoftwareMilestone) => void;
  onReorderMilestones: (orderedIds: string[]) => void;
  onNormalizeWeights: () => void;
  onQuickMilestoneStatus: (milestoneId: string, status: SoftwareMilestoneStatus) => void;
  onUpdateMilestoneDates: (milestoneId: string, startDate: string, dueDate: string) => Promise<void>;
  onLoadTeamAvailability: () => Promise<{
    absencesByUser: Record<string, Array<{ date: string; status: string; notes?: string }>>;
    capacityByUser: Record<string, { weeklyHours: number; status: string }>;
  } | null>;
  onToggleDeliverable: (milestone: SoftwareMilestone, deliverableId: string) => void;
  onAddWorkItem: (milestoneId: string, type: 'task' | 'bug', prefill?: Partial<SoftwareWorkItem>) => void;
  onQuickCreateWorkItem: (payload: Partial<SoftwareWorkItem>) => Promise<void>;
  onEditWorkItem: (item: SoftwareWorkItem) => void;
  onUpdateWorkItem: (itemId: string, updates: Partial<SoftwareWorkItem>) => Promise<void>;
  onMoveWorkItem: (itemId: string, newStatus: SoftwareWorkItemStatus) => void;
  onToggleTimer: (itemId: string) => Promise<void>;
  onBulkUpdateItems: (itemIds: string[], updates: Partial<SoftwareWorkItem>) => Promise<void>;
  onUpdateWipLimits: (wipLimits: Partial<Record<SoftwareWorkItemStatus, number>>) => Promise<void>;
  onCreateSprint: (payload: Partial<SoftwareSprint>) => Promise<void>;
  onCloseSprint: (sprintId: string, rolloverToSprintId?: string) => Promise<void>;
  onToggleBlockOnCriticalBugs: (enabled: boolean) => Promise<void>;
  onCreateTestCase: (payload: Partial<SoftwareTestCase>) => Promise<void>;
  onUpdateTestCase: (tcId: string, updates: Partial<SoftwareTestCase>) => Promise<void>;
  onDeleteTestCase: (tcId: string) => Promise<void>;
  onSaveGoLiveChecklist: (items: SoftwareGoLiveItem[]) => Promise<void>;
  onAddComment: (milestoneId: string, text: string) => Promise<void>;
  onCreateChangeRequest: (payload: Partial<SoftwareChangeRequest>) => Promise<void>;
  onUpdateChangeRequest: (crId: string, updates: Partial<SoftwareChangeRequest>) => Promise<void>;
  onDeleteChangeRequest: (crId: string) => Promise<void>;
  // Fase 5 & 6
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
  onUpdateProjectRoles: (roles: SoftwareProjectRoleAssignment[]) => Promise<void>;
  onEscapeModals?: () => void;
}

export const SoftwareProjectDetailView: React.FC<SoftwareProjectDetailViewProps> = ({
  project,
  teamUsers,
  currentUserId,
  canManage,
  onBack,
  onEditProject,
  onShareProject,
  onCloneProject,
  onSaveAsTemplate,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onReorderMilestones,
  onNormalizeWeights,
  onQuickMilestoneStatus,
  onUpdateMilestoneDates,
  onLoadTeamAvailability,
  onToggleDeliverable,
  onAddWorkItem,
  onQuickCreateWorkItem,
  onEditWorkItem,
  onUpdateWorkItem,
  onMoveWorkItem,
  onToggleTimer,
  onBulkUpdateItems,
  onUpdateWipLimits,
  onCreateSprint,
  onCloseSprint,
  onToggleBlockOnCriticalBugs,
  onCreateTestCase,
  onUpdateTestCase,
  onDeleteTestCase,
  onSaveGoLiveChecklist,
  onAddComment,
  onCreateChangeRequest,
  onUpdateChangeRequest,
  onDeleteChangeRequest,
  onUpdateProjectFields,
  onRotateWebhookSecret,
  onRunHealthCheck,
  onCreateRelease,
  onDeleteRelease,
  onCreateVaultCredential,
  onRevealVaultCredential,
  onDeleteVaultCredential,
  onScaffoldDriveSubfolders,
  onUpdateProjectRoles,
  onEscapeModals,
}) => {
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('milestones');
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);

  // Permisos granulares por proyecto: si el usuario tiene rol 'viewer', queda solo lectura
  const myProjectRole = (project.projectRoles || []).find((r) => r.userId === currentUserId)?.projectRole;
  const effectiveCanManage = canManage && myProjectRole !== 'viewer';
  const effectiveCanQa = effectiveCanManage || myProjectRole === 'qa_tester';

  // Atajos de teclado globales (N nueva tarea, B nuevo bug, / buscar, Esc cerrar, ? ayuda)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        setShowShortcutsHint(false);
        onEscapeModals?.();
        return;
      }
      if (isInput || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key.toLowerCase() === 'n' && effectiveCanManage) {
        e.preventDefault();
        onAddWorkItem(project.milestones[0]?.id || '', 'task');
      } else if (e.key.toLowerCase() === 'b' && effectiveCanQa) {
        e.preventDefault();
        onAddWorkItem(project.milestones[0]?.id || '', 'bug');
      } else if (e.key === '/') {
        e.preventDefault();
        setActiveTab('kanban');
        setTimeout(() => {
          const el = document.querySelector<HTMLInputElement>('[data-software-search="true"]');
          el?.focus();
        }, 60);
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsHint((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [effectiveCanManage, effectiveCanQa, onAddWorkItem, onEscapeModals, project.milestones]);
  const stMeta = PROJECT_STATUS_META[project.status] || PROJECT_STATUS_META.planning;
  const openBugsCount = project.workItems.filter(
    (w) => w.type === 'bug' && w.status !== 'done'
  ).length;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Cabecera ejecutiva */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-cyan-600 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Todos los Proyectos de Software
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
                {project.code}
              </span>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {project.name}
              </h1>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${stMeta.badge}`}>
                {stMeta.label}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cliente: <strong className="text-slate-700 dark:text-slate-200">{project.clientName}</strong>
              {project.brandName ? ` · Marca: ${project.brandName}` : ''}
              {project.techLeadName ? ` · Tech Lead: ${project.techLeadName}` : ''}
              {project.serviceOrderCode ? ` · OS: ${project.serviceOrderCode}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onShareProject}
              className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" /> Compartir con Cliente
            </button>
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={onCloneProject}
                  className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                  title="Clonar proyecto completo"
                >
                  <Copy className="w-3.5 h-3.5" /> Clonar
                </button>
                <button
                  type="button"
                  onClick={onSaveAsTemplate}
                  className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                  title="Guardar estructura como plantilla reutilizable"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" /> Plantilla
                </button>
                <button
                  type="button"
                  onClick={onEditProject}
                  className="px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Configurar Proyecto
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progreso + Accesos directos a Entornos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="lg:col-span-5">
            <div className="flex items-center justify-between text-xs font-extrabold mb-1.5">
              <span className="text-slate-500">Avance Global Ponderado</span>
              <span className="text-cyan-600 dark:text-cyan-400">{project.totalProgress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all duration-300"
                style={{ width: `${project.totalProgress}%` }}
              />
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-wrap items-center lg:justify-end gap-2">
            {project.environments?.figmaUrl && (
              <a
                href={project.environments.figmaUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-pink-500/20"
              >
                <Figma className="w-3.5 h-3.5" /> Figma
              </a>
            )}
            {project.environments?.stagingUrl && (
              <a
                href={project.environments.stagingUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-amber-500/20"
              >
                <Globe className="w-3.5 h-3.5" /> Staging / QA
              </a>
            )}
            {project.environments?.productionUrl && (
              <a
                href={project.environments.productionUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-emerald-500/20"
              >
                <Globe className="w-3.5 h-3.5" /> Producción
              </a>
            )}
            {project.environments?.repoUrl && (
              <a
                href={project.environments.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-indigo-500/20"
              >
                <GitBranch className="w-3.5 h-3.5" /> Repositorio
              </a>
            )}
            {project.environments?.docsUrl && (
              <a
                href={project.environments.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-sky-500/20"
              >
                <FileCode2 className="w-3.5 h-3.5" /> Docs
              </a>
            )}
            {project.driveFolderLink && (
              <a
                href={project.driveFolderLink}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-blue-500/20"
              >
                <FolderOpen className="w-3.5 h-3.5" /> Drive
              </a>
            )}
          </div>
        </div>

        {/* Pestañas internas */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {[
            { id: 'milestones' as const, label: `Hitos Dinámicos (${project.milestones.length})`, icon: Flag },
            { id: 'kanban' as const, label: `Kanban Técnico (${project.workItems.length})`, icon: Columns3 },
            { id: 'qa' as const, label: `QA & Bugs (${openBugsCount})`, icon: Bug },
            { id: 'gantt' as const, label: 'Cronograma Gantt', icon: CalendarRange },
            { id: 'devops' as const, label: 'DevOps & Bóveda', icon: Server },
            { id: 'audit' as const, label: 'Auditoría & Roles', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                  active
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowShortcutsHint((v) => !v)}
            className="ml-auto px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer shrink-0"
            title="Atajos de teclado (?)"
          >
            <Keyboard className="w-3.5 h-3.5" /> Atajos (?)
          </button>
        </div>

        {showShortcutsHint && (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="font-extrabold text-slate-900 dark:text-white">Atajos:</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold">N</kbd> Nueva tarea</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold">B</kbd> Reportar bug</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold">/</kbd> Buscar en Kanban</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold">Esc</kbd> Cerrar modales</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border font-mono font-bold">?</kbd> Mostrar/ocultar esta guía</span>
          </div>
        )}
      </div>

      {/* Contenido de pestaña activa */}
      {activeTab === 'milestones' && (
        <MilestonesRoadmapTab
          project={project}
          canManage={canManage}
          onAddMilestone={onAddMilestone}
          onEditMilestone={onEditMilestone}
          onDeleteMilestone={onDeleteMilestone}
          onReorderMilestones={onReorderMilestones}
          onNormalizeWeights={onNormalizeWeights}
          onQuickMilestoneStatus={onQuickMilestoneStatus}
          onToggleDeliverable={onToggleDeliverable}
          onAddWorkItem={onAddWorkItem}
          onEditWorkItem={onEditWorkItem}
          onToggleWorkItemDone={(item) =>
            onMoveWorkItem(item.id, item.status === 'done' ? 'todo' : 'done')
          }
          onAddComment={onAddComment}
          onCreateChangeRequest={onCreateChangeRequest}
          onUpdateChangeRequest={onUpdateChangeRequest}
          onDeleteChangeRequest={onDeleteChangeRequest}
        />
      )}

      {activeTab === 'kanban' && (
        <SoftwareKanbanTab
          project={project}
          teamUsers={teamUsers}
          currentUserId={currentUserId}
          canManage={canManage}
          onAddWorkItem={onAddWorkItem}
          onQuickCreateWorkItem={onQuickCreateWorkItem}
          onEditWorkItem={onEditWorkItem}
          onMoveWorkItem={onMoveWorkItem}
          onToggleTimer={onToggleTimer}
          onBulkUpdateItems={onBulkUpdateItems}
          onUpdateWipLimits={onUpdateWipLimits}
          onCreateSprint={onCreateSprint}
          onCloseSprint={onCloseSprint}
        />
      )}

      {activeTab === 'qa' && (
        <SoftwareQaBugsTab
          project={project}
          canManage={canManage}
          onAddBug={(prefill) =>
            onAddWorkItem(prefill?.milestoneId || project.milestones[0]?.id || '', 'bug', prefill)
          }
          onEditWorkItem={onEditWorkItem}
          onUpdateWorkItem={onUpdateWorkItem}
          onToggleBlockOnCriticalBugs={onToggleBlockOnCriticalBugs}
          onCreateTestCase={onCreateTestCase}
          onUpdateTestCase={onUpdateTestCase}
          onDeleteTestCase={onDeleteTestCase}
          onSaveGoLiveChecklist={onSaveGoLiveChecklist}
        />
      )}

      {activeTab === 'gantt' && (
        <SoftwareGanttTab
          project={project}
          teamUsers={teamUsers}
          canManage={effectiveCanManage}
          onSelectMilestone={(m) => {
            if (effectiveCanManage) onEditMilestone(m);
          }}
          onUpdateMilestoneDates={onUpdateMilestoneDates}
          onLoadTeamAvailability={onLoadTeamAvailability}
        />
      )}

      {activeTab === 'devops' && (
        <SoftwareDevOpsTab
          project={project}
          canManage={effectiveCanManage}
          onUpdateProjectFields={onUpdateProjectFields}
          onRotateWebhookSecret={onRotateWebhookSecret}
          onRunHealthCheck={onRunHealthCheck}
          onCreateRelease={onCreateRelease}
          onDeleteRelease={onDeleteRelease}
          onCreateVaultCredential={onCreateVaultCredential}
          onRevealVaultCredential={onRevealVaultCredential}
          onDeleteVaultCredential={onDeleteVaultCredential}
          onScaffoldDriveSubfolders={onScaffoldDriveSubfolders}
        />
      )}

      {activeTab === 'audit' && (
        <SoftwareAuditTab
          project={project}
          teamUsers={teamUsers}
          canManage={effectiveCanManage}
          onUpdateProjectRoles={onUpdateProjectRoles}
        />
      )}
    </div>
  );
};
