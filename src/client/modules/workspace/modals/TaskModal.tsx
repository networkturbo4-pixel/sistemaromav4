import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  HardDrive,
  ExternalLink,
  Calendar,
  Clock,
  UserPlus,
  Users,
  Tag,
  Paperclip,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Star,
  Archive,
  Image as ImageIcon,
  FolderOpen,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';
import {
  WorkspaceTask,
  TaskStatus,
  TaskPriority,
  TaskFrequency,
  TaskMilestone,
  TaskAttachment,
  Client,
  WorkspaceProject,
  User as UserType,
} from '../../../../shared/types';
import { MONTH_NAMES } from '../types';
import { RichTextEditor } from '../../../components/RichTextEditor';
import { DriveFolderPickerModal } from '../../../components/DriveFolderPickerModal';

interface TaskModalProps {
  isOpen: boolean;
  editingTask: Partial<WorkspaceTask> | null;
  setEditingTask: React.Dispatch<React.SetStateAction<Partial<WorkspaceTask> | null>>;
  clients: Client[];
  teamUsers: UserType[];
  projects?: WorkspaceProject[];
  onClose: () => void;
  onSaveTask: (e: React.FormEvent) => void;
  onDeleteTask?: (id: string, title: string) => void;
  onArchiveTask?: (id: string) => void;
}

const SUGGESTED_TAGS = [
  'Diseño',
  'Revisión',
  'Web',
  'Video',
  'Urgente',
  'Contenido',
  'Campaña',
  'Copywriting',
  'Estrategia',
  'Logotipo',
];

const CATEGORIES = [
  'General / Operativa',
  'Redes Sociales',
  'Identidad Visual',
  'Audiovisual',
  'Desarrollo Web',
  'Estrategia & Pauta',
  'Diseño Gráfico',
  'Administrativo',
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  editingTask,
  setEditingTask,
  clients,
  teamUsers,
  projects = [],
  onClose,
  onSaveTask,
  onDeleteTask,
  onArchiveTask,
}) => {
  const [mobileTab, setMobileTab] = useState<'content' | 'settings'>('content');
  const [tagInput, setTagInput] = useState('');
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeMilestoneForUpload, setActiveMilestoneForUpload] = useState<string | null>(null);

  // Keyboard shortcut listener: Esc to close, Ctrl+Enter to save
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        onSaveTask(fakeEvent);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSaveTask, onClose]);

  // Global paste handler to paste images directly from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || !editingTask) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const dataUrl = uploadEvent.target?.result as string;
            if (!dataUrl) return;

            const newAttachment: TaskAttachment = {
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: `Captura-${new Date().toLocaleTimeString().replace(/:/g, '-')}.png`,
              url: dataUrl,
              type: 'image/png',
              size: file.size,
              uploadedAt: new Date().toISOString(),
            };

            setEditingTask((prev) => {
              if (!prev) return prev;
              const milestones = prev.milestones || [];
              if (milestones.length > 0) {
                // Attach to first or active milestone
                const updated = milestones.map((m, idx) => {
                  if (idx === 0) {
                    return {
                      ...m,
                      attachments: [...(m.attachments || []), newAttachment],
                    };
                  }
                  return m;
                });
                return { ...prev, milestones: updated };
              } else {
                return {
                  ...prev,
                  pastedImages: [...(prev.pastedImages || []), dataUrl],
                };
              }
            });
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  if (!isOpen || !editingTask) return null;

  const milestones: TaskMilestone[] = editingTask.milestones || [];
  const taskTags: string[] = editingTask.tags || [];
  const assignedUsers = editingTask.assignedUsers || [];

  // Add Milestone
  const handleAddMilestone = () => {
    const nextNumber = milestones.length + 1;
    const defaultTitle =
      nextNumber === 1
        ? 'Requerimientos & Briefing Inicial'
        : nextNumber === 2
        ? 'Desarrollo Creativo & Bocetos'
        : `Hito ${nextNumber}: Revisión & Entrega`;

    const newMilestone: TaskMilestone = {
      id: `ms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: defaultTitle,
      descriptionHtml: '',
      completed: false,
      collapsed: false,
      attachments: [],
    };

    setEditingTask({
      ...editingTask,
      milestones: [...milestones, newMilestone],
    });
  };

  // Toggle milestone completion & contract/collapse
  const handleToggleMilestoneComplete = (id: string) => {
    const updated = milestones.map((m) => {
      if (m.id === id) {
        const nextCompleted = !m.completed;
        return {
          ...m,
          completed: nextCompleted,
          // Collapse automatically when completed, reopen when uncompleted
          collapsed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
        };
      }
      return m;
    });
    setEditingTask({ ...editingTask, milestones: updated });
  };

  // Toggle milestone collapse manually
  const handleToggleMilestoneCollapse = (id: string) => {
    const updated = milestones.map((m) =>
      m.id === id ? { ...m, collapsed: !m.collapsed } : m
    );
    setEditingTask({ ...editingTask, milestones: updated });
  };

  // Update milestone fields
  const handleUpdateMilestone = (
    id: string,
    field: keyof TaskMilestone,
    value: any
  ) => {
    const updated = milestones.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );
    setEditingTask({ ...editingTask, milestones: updated });
  };

  // Delete milestone
  const handleDeleteMilestone = (id: string) => {
    const updated = milestones.filter((m) => m.id !== id);
    setEditingTask({ ...editingTask, milestones: updated });
  };

  // Attach files to a milestone
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeMilestoneForUpload) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const newAttachment: TaskAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          url: dataUrl,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };

        setEditingTask((prev) => {
          if (!prev) return prev;
          const currentMilestones = prev.milestones || [];
          const updated = currentMilestones.map((m) => {
            if (m.id === activeMilestoneForUpload) {
              return {
                ...m,
                attachments: [...(m.attachments || []), newAttachment],
              };
            }
            return m;
          });
          return { ...prev, milestones: updated };
        });
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove attachment from milestone
  const handleRemoveAttachment = (milestoneId: string, attachmentId: string) => {
    const updated = milestones.map((m) => {
      if (m.id === milestoneId) {
        return {
          ...m,
          attachments: (m.attachments || []).filter((a) => a.id !== attachmentId),
        };
      }
      return m;
    });
    setEditingTask({ ...editingTask, milestones: updated });
  };

  // Tag management
  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!taskTags.includes(trimmed)) {
      setEditingTask({ ...editingTask, tags: [...taskTags, trimmed] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditingTask({
      ...editingTask,
      tags: taskTags.filter((t) => t !== tagToRemove),
    });
  };

  const handleToggleTag = (tag: string) => {
    if (taskTags.includes(tag)) {
      handleRemoveTag(tag);
    } else {
      handleAddTag(tag);
    }
  };

  // Members assignment
  const handleAddMember = (userId: string) => {
    if (!userId) return;
    const user = teamUsers.find((u) => u.id === userId);
    if (!user) return;

    if (!assignedUsers.some((u) => u.id === user.id)) {
      const updatedAssigned = [
        ...assignedUsers,
        {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          jobTitle: user.jobTitle,
        },
      ];
      setEditingTask({
        ...editingTask,
        assignedUsers: updatedAssigned,
        // Legacy single user support
        assignedUserId: updatedAssigned[0]?.id,
        assignedUserName: updatedAssigned[0]?.name,
        assignedUserAvatar: updatedAssigned[0]?.avatar,
      });
    }
  };

  const handleRemoveMember = (userId: string) => {
    const updated = assignedUsers.filter((u) => u.id !== userId);
    setEditingTask({
      ...editingTask,
      assignedUsers: updated,
      assignedUserId: updated[0]?.id || '',
      assignedUserName: updated[0]?.name || '',
      assignedUserAvatar: updated[0]?.avatar || '',
    });
  };

  return (
    <div
      onPaste={handlePaste}
      className="fixed inset-0 z-50 h-[100dvh] w-screen max-w-full bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 animate-fadeIn"
    >
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 h-[100dvh] w-full flex flex-col overflow-hidden shadow-2xl">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.psd,.ai,.eps,.svg"
        />

        {/* Modal Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 truncate">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {editingTask.id ? `Editar Tarea` : 'Nueva Tarea Operativa'}
              </h2>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Gestor de Tareas
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Fijar en Tablero Toggle */}
            <button
              type="button"
              onClick={() =>
                setEditingTask({ ...editingTask, isPinned: !editingTask.isPinned })
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                editingTask.isPinned
                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200'
              }`}
              title="Fijar en el Tablero"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  editingTask.isPinned ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                }`}
              />
              <span className="hidden sm:inline">
                {editingTask.isPinned ? 'Fijada en Tablero' : 'Fijar en Tablero'}
              </span>
            </button>

            {/* Archivar / Eliminar si edita */}
            {editingTask.id && (
              <>
                {onArchiveTask && (
                  <button
                    type="button"
                    onClick={() => onArchiveTask(editingTask.id!)}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                    title={editingTask.isArchived ? 'Desarchivar' : 'Archivar Tarea'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">
                      {editingTask.isArchived ? 'Desarchivar' : 'Archivar'}
                    </span>
                  </button>
                )}

                {onDeleteTask && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDeleteTask(editingTask.id!, editingTask.title || 'esta tarea');
                    }}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer border border-rose-200 dark:border-rose-900"
                    title="Eliminar Tarea"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Eliminar</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 gap-2">
          <button
            type="button"
            onClick={() => setMobileTab('content')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              mobileTab === 'content'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Contenido & Hitos
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('settings')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              mobileTab === 'settings'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Configuración & Drive
          </button>
        </div>

        {/* Modal Form & Scrollable Body */}
        <form
          onSubmit={onSaveTask}
          className="flex-1 flex flex-col lg:grid lg:grid-cols-12 overflow-hidden"
        >
          {/* Main Left Column (Content & Milestones) */}
          <div
            className={`lg:col-span-8 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 ${
              mobileTab === 'content' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Task Title */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xs">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                Título de la Tarea *
              </label>
              <input
                type="text"
                required
                placeholder="¿Qué necesitas lograr? Escribe el título aquí..."
                value={editingTask.title || ''}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, title: e.target.value })
                }
                className="w-full text-base sm:text-xl font-black text-slate-900 dark:text-white bg-transparent outline-none placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            {/* Milestones / Hitos Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>Línea de Tiempo & Avances</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {milestones.length} {milestones.length === 1 ? 'HITO' : 'HITOS'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddMilestone}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Hito / Avance</span>
                </button>
              </div>

              {/* List of Milestones */}
              {milestones.length === 0 ? (
                <div className="border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 rounded-2xl p-8 text-center space-y-3">
                  <p className="text-xs text-slate-500">
                    Aún no hay hitos definidos para esta tarea. Añade hitos para
                    estructurar los avances, adjuntar entregables y seguir el proceso.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 dark:text-indigo-300 font-bold text-xs inline-flex items-center gap-2 cursor-pointer border border-indigo-200 dark:border-indigo-800 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Añadir Primer Hito (Requerimientos & Briefing)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone, idx) => (
                    <div
                      key={milestone.id}
                      className={`bg-white dark:bg-slate-900 border rounded-2xl transition-all duration-200 overflow-hidden shadow-xs ${
                        milestone.completed
                          ? 'border-emerald-200/80 dark:border-emerald-900/80 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : 'border-slate-200/90 dark:border-slate-800'
                      }`}
                    >
                      {/* Milestone Header */}
                      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/90">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleMilestoneComplete(milestone.id)}
                            className="cursor-pointer shrink-0 transition"
                            title={
                              milestone.completed
                                ? 'Marcar como pendiente'
                                : 'Marcar como completado (contrae el hito)'
                            }
                          >
                            {milestone.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-400 hover:text-indigo-600" />
                            )}
                          </button>

                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-black text-slate-400 shrink-0">
                              Hito {idx + 1}:
                            </span>
                            <input
                              type="text"
                              value={milestone.title}
                              onChange={(e) =>
                                handleUpdateMilestone(
                                  milestone.id,
                                  'title',
                                  e.target.value
                                )
                              }
                              className={`text-xs sm:text-sm font-extrabold bg-transparent outline-none flex-1 truncate ${
                                milestone.completed
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800 dark:text-white'
                              }`}
                              placeholder="Nombre del hito..."
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Completion button */}
                          <button
                            type="button"
                            onClick={() => handleToggleMilestoneComplete(milestone.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                              milestone.completed
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {milestone.completed ? '✓ Completado' : 'Completar'}
                          </button>

                          {/* Collapse / Expand Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleMilestoneCollapse(milestone.id)}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            title={
                              milestone.collapsed ? 'Expandir hito' : 'Contraer hito'
                            }
                          >
                            {milestone.collapsed ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronUp className="w-4 h-4" />
                            )}
                          </button>

                          {/* Delete Milestone */}
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(milestone.id)}
                            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Eliminar hito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Milestone Collapsed Bar Notice */}
                      {milestone.collapsed ? (
                        <div
                          onClick={() => handleToggleMilestoneCollapse(milestone.id)}
                          className="px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer flex items-center justify-between"
                        >
                          <span className="italic truncate max-w-md">
                            {milestone.completed
                              ? 'Hito completado. Clic para desplegar detalles y adjuntos.'
                              : 'Hito contraído. Clic para editar criterios y notas.'}
                          </span>
                          {(milestone.attachments?.length || 0) > 0 && (
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              <span>{milestone.attachments!.length} adjuntos</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Milestone Expanded Body */
                        <div className="p-4 sm:p-5 space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Descripción & Criterios del Hito</span>
                              </label>
                              <span className="text-[10px] font-medium text-slate-400">
                                Soporta tablas, listas y formato
                              </span>
                            </div>

                            <RichTextEditor
                              value={milestone.descriptionHtml || ''}
                              onChange={(val) =>
                                handleUpdateMilestone(
                                  milestone.id,
                                  'descriptionHtml',
                                  val
                                )
                              }
                              placeholder="Añade notas, especificaciones o criterios de aceptación para esta etapa..."
                              minHeight="140px"
                            />
                          </div>

                          {/* Attachments Section */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  Pega capturas con{' '}
                                  <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono border border-slate-200 dark:border-slate-700">
                                    Ctrl + V
                                  </kbd>{' '}
                                  o haz clic para adjuntar (Imágenes, Adobe, Docs, EPS,
                                  SVG)
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMilestoneForUpload(milestone.id);
                                  fileInputRef.current?.click();
                                }}
                                className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Adjuntar</span>
                              </button>
                            </div>

                            {/* Attachments Grid */}
                            {milestone.attachments &&
                              milestone.attachments.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                                  {milestone.attachments.map((att) => {
                                    const isImg =
                                      att.type?.startsWith('image/') ||
                                      att.url?.startsWith('data:image');
                                    return (
                                      <div
                                        key={att.id}
                                        className="group relative bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden p-2 flex flex-col justify-between text-center"
                                      >
                                        {isImg ? (
                                          <div className="h-16 w-full flex items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-900 mb-1">
                                            <img
                                              src={att.url}
                                              alt={att.name}
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                        ) : (
                                          <div className="h-16 w-full flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 mb-1">
                                            <Paperclip className="w-6 h-6" />
                                          </div>
                                        )}

                                        <p
                                          className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate"
                                          title={att.name}
                                        >
                                          {att.name}
                                        </p>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveAttachment(
                                              milestone.id,
                                              att.id
                                            )
                                          }
                                          className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition shadow-xs cursor-pointer"
                                          title="Eliminar adjunto"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Parameters Sidebar */}
          <div
            className={`lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-y-auto p-4 sm:p-6 space-y-5 ${
              mobileTab === 'settings' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* GOOGLE DRIVE SECTION */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Google Drive
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                  Nube
                </span>
              </div>

              {editingTask.driveFolderId ? (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {editingTask.driveFolderName || 'Carpeta conectada'}
                      </span>
                    </div>
                    {editingTask.driveFolderUrl && (
                      <a
                        href={editingTask.driveFolderUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 shrink-0"
                        title="Abrir en Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDrivePickerOpen(true)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer text-center"
                    >
                      Cambiar Carpeta
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingTask({
                          ...editingTask,
                          driveFolderId: undefined,
                          driveFolderName: undefined,
                          driveFolderUrl: undefined,
                        })
                      }
                      className="py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 text-xs font-bold transition cursor-pointer"
                      title="Desvincular carpeta"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsDrivePickerOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Conectar / Crear en Drive</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">
                    Almacena archivos pesados y proyectos Adobe sin saturar el servidor
                  </p>
                </div>
              )}
            </div>

            {/* ESTADO & PRIORIDAD */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Estado
                </label>
                <select
                  value={editingTask.status || 'pending'}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      status: e.target.value as TaskStatus,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="pending">Nuevo</option>
                  <option value="in_progress">Pendiente / En Curso</option>
                  <option value="completed">Terminado</option>
                  <option value="approved">Aprobado</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Prioridad
                </label>
                <select
                  value={editingTask.priority || 'medium'}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      priority: e.target.value as TaskPriority,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            {/* FECHAS & CRONÓMETRO */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fecha Inicio</span>
                </label>
                <input
                  type="date"
                  value={editingTask.startDate || ''}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fecha Límite</span>
                </label>
                <input
                  type="date"
                  value={editingTask.dueDate || ''}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, dueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* ASIGNADOS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Asignados</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  {assignedUsers.length}
                </span>
              </div>

              {/* Assigned Users Chips */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                {assignedUsers.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">
                    Sin miembros asignados
                  </span>
                ) : (
                  assignedUsers.map((user) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs"
                    >
                      <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-black">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                      <span>{user.name.split(' ')[0]}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(user.id)}
                        className="text-slate-400 hover:text-rose-500 ml-0.5 cursor-pointer"
                        title="Quitar miembro"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add member dropdown */}
              <select
                value=""
                onChange={(e) => handleAddMember(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value="">+ Asignar a un miembro...</option>
                {teamUsers
                  .filter((u) => !assignedUsers.some((au) => au.id === u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.jobTitle ? `(${u.jobTitle})` : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* CLASIFICACIÓN & CONTEXTO */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Clasificación & Contexto
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Frecuencia
                  </label>
                  <select
                    value={editingTask.frequency || 'one_time'}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        frequency: e.target.value as TaskFrequency,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="one_time">Puntual / Por Entrega</option>
                    <option value="daily">Diaria</option>
                    <option value="daily_recurring">Diaria Recurrente</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Área
                  </label>
                  <select
                    value={editingTask.category || 'General / Operativa'}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, category: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Cliente
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
                  <option value="">-- Sin Cliente / Interno --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Proyecto Vinculado
                </label>
                <select
                  value={editingTask.projectId || ''}
                  onChange={(e) => {
                    const p = projects.find((item) => item.id === e.target.value);
                    setEditingTask({
                      ...editingTask,
                      projectId: e.target.value,
                      projectName: p ? p.title : '',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <option value="">-- Sin Vincular / General --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.clientName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Mes Activo
                </label>
                <select
                  value={editingTask.monthName || ''}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, monthName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <option value="">-- Seleccionar Mes de Calendario --</option>
                  {MONTH_NAMES.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ETIQUETAS (TAGS) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Etiquetas</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400">
                  {taskTags.length}
                </span>
              </div>

              {/* Active Tags */}
              <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                {taskTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-rose-500 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Tag Input */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Etiqueta y presiona Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                  title="Añadir etiqueta"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Suggested Tags */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Sugeridas:
                </span>
                <div className="flex flex-wrap gap-1">
                  {SUGGESTED_TAGS.map((tag) => {
                    const isSelected = taskTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer (Sticky Bottom) */}
          <div className="lg:col-span-12 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0">
            {/* Keyboard hints (desktop) */}
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] border border-slate-200 dark:border-slate-700">
                  Esc
                </kbd>
                <span>Cancelar</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] border border-slate-200 dark:border-slate-700">
                  Ctrl + Enter
                </kbd>
                <span>Guardar</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] border border-slate-200 dark:border-slate-700">
                  Ctrl + V
                </kbd>
                <span>Pegar Captura</span>
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-sm hover:shadow"
              >
                {editingTask.id ? 'Guardar Cambios' : 'Crear Tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Google Drive Picker Modal */}
      <DriveFolderPickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        onSelect={(folder) => {
          setEditingTask((prev) =>
            prev
              ? {
                  ...prev,
                  driveFolderId: folder.id,
                  driveFolderName: folder.name,
                  driveFolderUrl: folder.webViewLink,
                }
              : prev
          );
          setIsDrivePickerOpen(false);
        }}
        currentSelectedId={editingTask.driveFolderId}
        title="Vincular Carpeta de Google Drive para la Tarea"
      />
    </div>
  );
};
