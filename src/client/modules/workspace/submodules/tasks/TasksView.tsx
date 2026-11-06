import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ListTodo,
  Kanban,
  List,
  Plus,
  Search,
  Clock,
  Edit3,
  Trash2,
  HardDrive,
  ExternalLink,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Layers,
  Tag,
  Filter,
  Users,
  FolderOpen,
  Calendar,
} from 'lucide-react';
import { PermissionGate } from '../../../../context/AppContext';
import {
  WorkspaceTask,
  Client,
  TaskStatus,
  WorkspaceProject,
  User as UserType,
} from '../../../../shared/types';
import { TASK_STATUS_MAP } from '../../types';

interface TasksViewProps {
  tasks: WorkspaceTask[];
  clients: Client[];
  projects?: WorkspaceProject[];
  teamUsers?: UserType[];
  currentUser?: UserType | null;
  taskSearch: string;
  setTaskSearch: (val: string) => void;
  taskClientFilter: string;
  setTaskClientFilter: (val: string) => void;
  taskPriorityFilter: string;
  setTaskPriorityFilter: (val: string) => void;
  tasksViewMode: 'kanban' | 'list';
  setTasksViewMode: (mode: 'kanban' | 'list') => void;
  onBackToHub: () => void;
  onOpenNewTask: (status?: TaskStatus) => void;
  onOpenEditTask: (task: WorkspaceTask) => void;
  onDeleteTask: (taskId: string, title: string) => void;
  onUpdateTaskStatus?: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTogglePinTask?: (taskId: string) => Promise<void>;
}

const COLUMN_FLOW: TaskStatus[] = ['pending', 'in_progress', 'completed', 'approved'];

const KANBAN_COLUMNS: {
  id: TaskStatus;
  label: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  borderHover: string;
}[] = [
  {
    id: 'pending',
    label: 'Nuevo',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    borderHover: 'hover:border-blue-400 dark:hover:border-blue-700',
  },
  {
    id: 'in_progress',
    label: 'Pendiente / En Curso',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    borderHover: 'hover:border-amber-400 dark:hover:border-amber-700',
  },
  {
    id: 'completed',
    label: 'Terminado',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderHover: 'hover:border-emerald-400 dark:hover:border-emerald-700',
  },
  {
    id: 'approved',
    label: 'Aprobado',
    dotColor: 'bg-teal-500',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/60',
    badgeText: 'text-teal-700 dark:text-teal-300',
    borderHover: 'hover:border-teal-400 dark:hover:border-teal-700',
  },
];

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  clients,
  projects = [],
  teamUsers = [],
  currentUser,
  taskSearch,
  setTaskSearch,
  taskClientFilter,
  setTaskClientFilter,
  taskPriorityFilter,
  setTaskPriorityFilter,
  tasksViewMode,
  setTasksViewMode,
  onBackToHub,
  onOpenNewTask,
  onOpenEditTask,
  onDeleteTask,
  onUpdateTaskStatus,
  onTogglePinTask,
}) => {
  // Additional Filters
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all'); // 'all' | 'me' | userId
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'pinned' | 'daily' | 'weekly' | 'drive'>('all');

  // Drag and Drop States
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Collapsed Cards (completed cards or manually collapsed cards)
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // Compute all available unique tags from tasks with counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      (t.tags || []).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [tasks]);

  const uniqueTags = useMemo(() => Object.keys(tagCounts), [tagCounts]);

  // Toggle card collapsed state
  const toggleCardCollapse = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedCards((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Helper to determine if a card is collapsed
  const isCardCollapsed = (task: WorkspaceTask) => {
    if (collapsedCards[task.id] !== undefined) {
      return collapsedCards[task.id];
    }
    // By default, completed or approved tasks start collapsed to lighten visualization
    return task.status === 'completed' || task.status === 'approved';
  };

  // Filtering Logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Exclude archived tasks
      if (t.isArchived) return false;

      // Search Query
      if (taskSearch) {
        const q = taskSearch.toLowerCase();
        const matchTitle = t.title?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchClient = t.clientName?.toLowerCase().includes(q);
        const matchProject = t.projectName?.toLowerCase().includes(q);
        const matchTags = t.tags?.some((tag) => tag.toLowerCase().includes(q));
        const matchMilestones = t.milestones?.some((m) =>
          m.title.toLowerCase().includes(q)
        );
        if (
          !matchTitle &&
          !matchDesc &&
          !matchClient &&
          !matchProject &&
          !matchTags &&
          !matchMilestones
        ) {
          return false;
        }
      }

      // Client Filter
      if (taskClientFilter && t.clientId !== taskClientFilter) return false;

      // Project Filter
      if (selectedProjectFilter !== 'all' && t.projectId !== selectedProjectFilter) {
        return false;
      }

      // User Filter
      if (selectedUserFilter === 'me') {
        if (!currentUser) return false;
        const isAssigned =
          t.assignedUserId === currentUser.id ||
          t.assignedUsers?.some((u) => u.id === currentUser.id);
        if (!isAssigned) return false;
      } else if (selectedUserFilter !== 'all') {
        const isAssigned =
          t.assignedUserId === selectedUserFilter ||
          t.assignedUsers?.some((u) => u.id === selectedUserFilter);
        if (!isAssigned) return false;
      }

      // Priority Filter
      if (taskPriorityFilter !== 'all' && t.priority !== taskPriorityFilter) {
        return false;
      }

      // Tag Filter
      if (selectedTagFilter !== 'all') {
        if (!t.tags || !t.tags.includes(selectedTagFilter)) return false;
      }

      // Quick Filters
      if (quickFilter === 'pinned' && !t.isPinned) return false;
      if (quickFilter === 'daily' && t.frequency !== 'daily' && t.frequency !== 'daily_recurring') {
        return false;
      }
      if (quickFilter === 'weekly' && t.frequency !== 'weekly') return false;
      if (quickFilter === 'drive' && !t.driveFolderId) return false;

      return true;
    });
  }, [
    tasks,
    taskSearch,
    taskClientFilter,
    selectedProjectFilter,
    selectedUserFilter,
    taskPriorityFilter,
    selectedTagFilter,
    quickFilter,
    currentUser,
  ]);

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnStatus: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnStatus) {
      setDragOverColumn(columnStatus);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);

    if (taskId && onUpdateTaskStatus) {
      await onUpdateTaskStatus(taskId, targetStatus);
    }
  };

  // Quick move card across columns using `<` and `>`
  const handleQuickMove = async (
    e: React.MouseEvent,
    task: WorkspaceTask,
    direction: 'prev' | 'next'
  ) => {
    e.stopPropagation();
    if (!onUpdateTaskStatus) return;

    const currentStatus = (task.status === 'in_review' ? 'in_progress' : task.status) as TaskStatus;
    const currentIndex = COLUMN_FLOW.indexOf(currentStatus);
    if (currentIndex === -1) return;

    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < COLUMN_FLOW.length) {
      const nextStatus = COLUMN_FLOW[newIndex];
      await onUpdateTaskStatus(task.id, nextStatus);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHub}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver a Workspace</span>
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Centro de Tareas</span>
            </h2>
            <p className="text-xs text-slate-400">
              Tablero Kanban interactivo, arrastrar y soltar, hitos y archivos en Drive
            </p>
          </div>
        </div>

        {/* View Mode & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-end lg:self-auto">
          {/* View switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setTasksViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                tasksViewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Vista Tablero Kanban"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Tablero</span>
            </button>
            <button
              type="button"
              onClick={() => setTasksViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                tasksViewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Vista Lista Detallada"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <PermissionGate permission="workspace.tasks.manage">
            <button
              type="button"
              onClick={() => onOpenNewTask('pending')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Tarea</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título, cliente, proyecto, hitos o etiquetas..."
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* User Filter Dropdown */}
          <div className="w-full md:w-auto min-w-[150px]">
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
            >
              <option value="all">Todos los Miembros</option>
              {currentUser && <option value="me">Solo yo ({currentUser.name.split(' ')[0]})</option>}
              {teamUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter Dropdown */}
          <div className="w-full md:w-auto min-w-[160px]">
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
            >
              <option value="all">Todos los Proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="w-full md:w-auto min-w-[140px]">
            <select
              value={taskPriorityFilter}
              onChange={(e) => setTaskPriorityFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
            >
              <option value="all">Todas las Prioridades</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
        </div>

        {/* Tags and Quick Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setSelectedTagFilter('all');
              setQuickFilter('all');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
              selectedTagFilter === 'all' && quickFilter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            Todas ({tasks.length})
          </button>

          {/* Dynamic Tags */}
          {uniqueTags.slice(0, 6).map((tag) => {
            const isSelected = selectedTagFilter === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setSelectedTagFilter((prev) => (prev === tag ? 'all' : tag))
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{tag}</span>
                <span className="text-[10px] opacity-75 font-normal">
                  ({tagCounts[tag]})
                </span>
              </button>
            );
          })}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1" />

          {/* Quick Filters */}
          <button
            type="button"
            onClick={() =>
              setQuickFilter((prev) => (prev === 'pinned' ? 'all' : 'pinned'))
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border flex items-center gap-1 ${
              quickFilter === 'pinned'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            <span>Fijadas</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setQuickFilter((prev) => (prev === 'daily' ? 'all' : 'daily'))
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
              quickFilter === 'daily'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            Tareas Diarias
          </button>

          <button
            type="button"
            onClick={() =>
              setQuickFilter((prev) => (prev === 'weekly' ? 'all' : 'weekly'))
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
              quickFilter === 'weekly'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            Semanales
          </button>

          <button
            type="button"
            onClick={() =>
              setQuickFilter((prev) => (prev === 'drive' ? 'all' : 'drive'))
            }
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border flex items-center gap-1 ${
              quickFilter === 'drive'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/80 hover:bg-blue-100'
            }`}
          >
            <HardDrive className="w-3 h-3" />
            <span>Google Drive</span>
          </button>
        </div>
      </div>

      {/* Main Kanban Board View */}
      {tasksViewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            // Group tasks for this column (map legacy in_review to in_progress)
            const columnTasks = filteredTasks.filter((t) => {
              if (col.id === 'in_progress') {
                return t.status === 'in_progress' || t.status === 'in_review';
              }
              return t.status === col.id;
            });

            const isDropTarget = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`bg-slate-50/80 dark:bg-slate-900/50 border rounded-3xl p-3 sm:p-4 flex flex-col min-h-[580px] transition-all duration-200 ${
                  isDropTarget
                    ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} shrink-0`} />
                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider truncate">
                      {col.label}
                    </h3>
                    <span className="text-xs font-bold text-slate-400">
                      ({columnTasks.length})
                    </span>
                  </div>

                  <PermissionGate permission="workspace.tasks.manage">
                    <button
                      type="button"
                      onClick={() => onOpenNewTask(col.id)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                      title={`Añadir tarea en ${col.label}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </PermissionGate>
                </div>

                {/* Task Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnTasks.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl">
                      Sin tareas en esta etapa
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const collapsed = isCardCollapsed(task);
                      const priorityColor =
                        task.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : task.priority === 'high'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          : task.priority === 'medium'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';

                      const isDragging = draggedTaskId === task.id;
                      const hasMilestones = (task.milestones?.length || 0) > 0;
                      const completedMilestonesCount = (task.milestones || []).filter(
                        (m) => m.completed
                      ).length;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => onOpenEditTask(task)}
                          className={`group bg-white dark:bg-slate-900 border rounded-2xl transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md select-none ${
                            isDragging ? 'opacity-40 scale-95' : 'opacity-100'
                          } ${
                            task.isPinned
                              ? 'border-amber-300 dark:border-amber-700/80'
                              : 'border-slate-200/90 dark:border-slate-800'
                          } ${collapsed ? 'p-3' : 'p-4 space-y-2.5'}`}
                        >
                          {/* COLLAPSED VIEW */}
                          {collapsed ? (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {task.status === 'completed' || task.status === 'approved' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      task.priority === 'urgent'
                                        ? 'bg-rose-500'
                                        : 'bg-indigo-500'
                                    } shrink-0`}
                                  />
                                )}
                                <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                  {task.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${priorityColor}`}
                                >
                                  {task.priority}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => toggleCardCollapse(task.id, e)}
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                  title="Desplegar tarjeta"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* EXPANDED FULL VIEW */
                            <>
                              {/* Top Bar inside Card */}
                              <div className="flex items-center justify-between gap-1 text-[10px]">
                                <div className="flex flex-wrap items-center gap-1 min-w-0">
                                  {/* Priority Badge */}
                                  <span
                                    className={`font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${priorityColor}`}
                                  >
                                    {task.priority}
                                  </span>

                                  {/* Frequency Badge */}
                                  {task.frequency && task.frequency !== 'one_time' && (
                                    <span className="font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 uppercase">
                                      {task.frequency === 'daily' || task.frequency === 'daily_recurring'
                                        ? 'Diaria'
                                        : task.frequency === 'weekly'
                                        ? 'Semanal'
                                        : 'Mensual'}
                                    </span>
                                  )}

                                  {/* Pinned Badge */}
                                  {task.isPinned && (
                                    <span className="font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 flex items-center gap-0.5">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      <span>FIJADA</span>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  {/* Pin toggle button */}
                                  {onTogglePinTask && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onTogglePinTask(task.id);
                                      }}
                                      className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                                        task.isPinned
                                          ? 'text-amber-500'
                                          : 'text-slate-300 hover:text-slate-500'
                                      }`}
                                      title={task.isPinned ? 'Desfijar' : 'Fijar'}
                                    >
                                      <Star
                                        className={`w-3.5 h-3.5 ${
                                          task.isPinned ? 'fill-current' : ''
                                        }`}
                                      />
                                    </button>
                                  )}

                                  {/* Collapse Toggle */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleCardCollapse(task.id, e)}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                    title="Contraer tarjeta"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Task Title */}
                              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                                {task.title}
                              </h4>

                              {/* Project / Client association */}
                              {(task.projectName || task.clientName) && (
                                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                                  {task.projectName
                                    ? `Proyecto: ${task.projectName}`
                                    : task.clientName}
                                </div>
                              )}

                              {/* Tags Pills */}
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {task.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Milestones / Hitos Progress Pill */}
                              {hasMilestones && (
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                                  <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span>
                                    {completedMilestonesCount} de{' '}
                                    {task.milestones!.length} hitos completados
                                  </span>
                                </div>
                              )}

                              {/* Drive pill if linked */}
                              {task.driveFolderId && (
                                <div className="pt-0.5">
                                  <a
                                    href={task.driveFolderUrl || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 transition"
                                  >
                                    <HardDrive className="w-3 h-3 text-blue-500" />
                                    <span>Drive</span>
                                    <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                                  </a>
                                </div>
                              )}

                              {/* Card Bottom Row: Due date, Assigned users & Controls */}
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                                {/* Due Date */}
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{task.dueDate || 'Sin fecha'}</span>
                                </div>

                                {/* Assigned Members Avatars */}
                                <div className="flex items-center -space-x-1.5 overflow-hidden">
                                  {task.assignedUsers && task.assignedUsers.length > 0 ? (
                                    task.assignedUsers.slice(0, 3).map((u) => (
                                      <span
                                        key={u.id}
                                        className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-black border border-white dark:border-slate-900 shrink-0"
                                        title={u.name}
                                      >
                                        {u.name.charAt(0).toUpperCase()}
                                      </span>
                                    ))
                                  ) : task.assignedUserName ? (
                                    <span
                                      className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white text-[9px] flex items-center justify-center font-bold"
                                      title={task.assignedUserName}
                                    >
                                      {task.assignedUserName.charAt(0).toUpperCase()}
                                    </span>
                                  ) : null}
                                </div>

                                {/* Quick Move Buttons (< >) & Actions */}
                                <div className="flex items-center gap-1">
                                  <PermissionGate permission="workspace.tasks.manage">
                                    {/* Move left */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleQuickMove(e, task, 'prev')}
                                      disabled={col.id === 'pending'}
                                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                      title="Mover a etapa anterior"
                                    >
                                      <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Move right */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleQuickMove(e, task, 'next')}
                                      disabled={col.id === 'approved'}
                                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                      title="Avanzar a siguiente etapa"
                                    >
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenEditTask(task);
                                      }}
                                      className="p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                      title="Editar tarea"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteTask(task.id, task.title);
                                      }}
                                      className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                      title="Eliminar tarea"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </PermissionGate>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed List View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Tarea</th>
                  <th className="py-3 px-4">Proyecto / Cliente</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Prioridad</th>
                  <th className="py-3 px-4">Hitos</th>
                  <th className="py-3 px-4">Asignados</th>
                  <th className="py-3 px-4">Fecha Límite</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No se encontraron tareas con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => onOpenEditTask(task)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">
                        <div className="flex items-center gap-2">
                          {task.isPinned && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                          <span>{task.title}</span>
                          {task.driveFolderId && (
                            <HardDrive className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {task.projectName || task.clientName || 'General'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            TASK_STATUS_MAP[task.status]?.bg || 'bg-slate-100'
                          } ${TASK_STATUS_MAP[task.status]?.text || 'text-slate-700'}`}
                        >
                          {TASK_STATUS_MAP[task.status]?.label || task.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold uppercase text-[10px]">
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {task.milestones?.length
                          ? `${task.milestones.filter((m) => m.completed).length}/${task.milestones.length}`
                          : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center -space-x-1">
                          {task.assignedUsers?.slice(0, 3).map((u) => (
                            <span
                              key={u.id}
                              className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold border border-white dark:border-slate-900"
                              title={u.name}
                            >
                              {u.name.charAt(0)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {task.dueDate || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onOpenEditTask(task)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id, task.title)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
