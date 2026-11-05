import React from 'react';
import { X } from 'lucide-react';
import {
  WorkspaceTask,
  TaskStatus,
  TaskPriority,
  Client,
  User as UserType,
} from '../../../../shared/types';

interface TaskModalProps {
  isOpen: boolean;
  editingTask: Partial<WorkspaceTask> | null;
  setEditingTask: React.Dispatch<React.SetStateAction<Partial<WorkspaceTask> | null>>;
  clients: Client[];
  teamUsers: UserType[];
  onClose: () => void;
  onSaveTask: (e: React.FormEvent) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  editingTask,
  setEditingTask,
  clients,
  teamUsers,
  onClose,
  onSaveTask,
}) => {
  if (!isOpen || !editingTask) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            {editingTask.id ? 'Editar Tarea' : 'Nueva Tarea Operativa'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSaveTask} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Título de la Tarea *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Diseñar plantillas para stories de Instagram"
              value={editingTask.title || ''}
              onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Descripción o Criterios de Aceptación
            </label>
            <textarea
              rows={3}
              placeholder="Detalles sobre lo que se debe hacer..."
              value={editingTask.description || ''}
              onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Cliente Asociado
              </label>
              <select
                value={editingTask.clientId || ''}
                onChange={(e) => {
                  const c = clients.find((item) => item.id === e.target.value);
                  setEditingTask({
                    ...editingTask,
                    clientId: e.target.value,
                    clientName: c ? c.name : '',
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <option value="">Cliente General / Interno</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Categoría / Área
              </label>
              <select
                value={editingTask.category || 'Redes Sociales'}
                onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <option value="Redes Sociales">Redes Sociales</option>
                <option value="Identidad Visual">Identidad Visual</option>
                <option value="Audiovisual">Audiovisual</option>
                <option value="Desarrollo Web">Desarrollo Web</option>
                <option value="Estrategia & Pauta">Estrategia & Pauta</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Estado Kanban
              </label>
              <select
                value={editingTask.status || 'pending'}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <option value="pending">Por Iniciar</option>
                <option value="in_progress">En Proceso</option>
                <option value="in_review">En Revisión</option>
                <option value="completed">Completada</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Prioridad
              </label>
              <select
                value={editingTask.priority || 'medium'}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Fecha Límite
              </label>
              <input
                type="date"
                value={editingTask.dueDate || ''}
                onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Colaborador Asignado
            </label>
            <select
              value={editingTask.assignedUserId || ''}
              onChange={(e) => {
                const u = teamUsers.find((user) => user.id === e.target.value);
                setEditingTask({
                  ...editingTask,
                  assignedUserId: e.target.value,
                  assignedUserName: u ? u.name : '',
                });
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            >
              <option value="">Sin Asignar</option>
              {teamUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.jobTitle})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Guardar Tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
