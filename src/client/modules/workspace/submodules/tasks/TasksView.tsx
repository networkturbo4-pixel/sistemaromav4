import React from 'react';
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
} from 'lucide-react';
import { PermissionGate } from '../../../../context/AppContext';
import { WorkspaceTask, Client, TaskStatus } from '../../../../shared/types';
import { TASK_STATUS_MAP } from '../../types';

interface TasksViewProps {
  tasks: WorkspaceTask[];
  clients: Client[];
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
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  clients,
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
}) => {
  const filteredTasks = tasks.filter((t) => {
    if (taskSearch) {
      const q = taskSearch.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchClient = t.clientName?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchClient) return false;
    }
    if (taskClientFilter && t.clientId !== taskClientFilter) return false;
    if (taskPriorityFilter !== 'all' && t.priority !== taskPriorityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Barra de Navegación de Retorno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 md:p-5 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToHub}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Workspace</span>
          </button>
          <div className="h-6 w-px bg-slate-200 dark:border-slate-800 hidden sm:block" />
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-indigo-500" />
              <span>Tareas Operativas</span>
            </h2>
            <p className="text-xs text-slate-400">Tablero Kanban y gestión de flujo de trabajo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setTasksViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                tasksViewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Vista Tablero Kanban"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTasksViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                tasksViewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Vista Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <PermissionGate permission="workspace.tasks.manage">
            <button
              type="button"
              onClick={() => onOpenNewTask('pending')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Tarea</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Filtros de Tareas */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar tareas por título, descripción o cliente..."
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={taskClientFilter}
            onChange={(e) => setTaskClientFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value="">Todos los Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={taskPriorityFilter}
            onChange={(e) => setTaskPriorityFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value="all">Todas las Prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>
      </div>

      {/* Kanban / Lista */}
      {tasksViewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['pending', 'in_progress', 'in_review', 'completed'] as TaskStatus[]).map((status) => {
            const statusTasks = filteredTasks.filter((t) => t.status === status);
            const info = TASK_STATUS_MAP[status];

            return (
              <div
                key={status}
                className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-4 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${info.bg} ${info.text}`}>
                      {info.label}
                    </span>
                    <span className="text-xs font-bold text-slate-400">({statusTasks.length})</span>
                  </div>
                  <PermissionGate permission="workspace.tasks.manage">
                    <button
                      type="button"
                      onClick={() => onOpenNewTask(status)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                      title="Añadir tarea en esta columna"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </PermissionGate>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {statusTasks.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      Sin tareas en esta etapa
                    </div>
                  ) : (
                    statusTasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[120px]">
                            {task.clientName || 'General'}
                          </span>
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded-md uppercase ${
                              task.priority === 'urgent'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : task.priority === 'high'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{task.dueDate}</span>
                          </span>

                          <div className="flex items-center gap-1">
                            <PermissionGate permission="workspace.tasks.manage">
                              <button
                                type="button"
                                onClick={() => onOpenEditTask(task)}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                title="Editar tarea"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTask(task.id, task.title)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Eliminar tarea"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </PermissionGate>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTasks.map((task) => (
              <div key={task.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white">{task.title}</h4>
                  <p className="text-slate-400 text-[11px]">{task.clientName} • Vence: {task.dueDate}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${TASK_STATUS_MAP[task.status].bg} ${TASK_STATUS_MAP[task.status].text}`}>
                  {TASK_STATUS_MAP[task.status].label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
