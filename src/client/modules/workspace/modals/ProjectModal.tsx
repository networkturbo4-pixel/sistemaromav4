import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Folder,
  FolderPlus,
  ExternalLink,
  Users,
  Check,
  Search,
} from 'lucide-react';
import {
  WorkspaceProject,
  WorkspaceProjectStatus,
  ServiceOrder,
  SocialPostPlatform,
  Client,
} from '../../../../shared/types';
import { getPlatformIcon } from '../types';
import { useApp } from '../../../context/AppContext';

interface ProjectModalProps {
  isOpen: boolean;
  editingProject: Partial<WorkspaceProject> | null;
  setEditingProject: React.Dispatch<React.SetStateAction<Partial<WorkspaceProject> | null>>;
  serviceOrders: ServiceOrder[];
  clients?: Client[];
  teamUsers?: any[];
  isSavingProject?: boolean;
  onClose: () => void;
  onSaveProject: (e: React.FormEvent) => void;
  onSelectServiceOrder: (osId: string) => void;
  onTogglePlatform?: (plat: SocialPostPlatform) => void;
  onOpenDrivePicker: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  editingProject,
  setEditingProject,
  serviceOrders,
  clients,
  teamUsers,
  isSavingProject,
  onClose,
  onSaveProject,
  onSelectServiceOrder,
  onTogglePlatform,
  onOpenDrivePicker,
}) => {
  const { apiFetch } = useApp();
  const [internalUsers, setInternalUsers] = useState<any[]>(teamUsers || []);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (teamUsers && teamUsers.length > 0) {
      setInternalUsers(teamUsers);
    } else {
      apiFetch<{ users: any[] }>('/api/settings/users')
        .then((res) => {
          if (Array.isArray(res.users)) setInternalUsers(res.users);
        })
        .catch(() => {});
    }
  }, [teamUsers, apiFetch]);

  if (!isOpen || !editingProject) return null;

  const usersList = (internalUsers.length > 0 ? internalUsers : (teamUsers || [])).filter((u: any) => {
    if (!userSearch.trim()) return true;
    const term = userSearch.toLowerCase();
    const name = (u.fullName || u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const job = (u.jobTitle || '').toLowerCase();
    return name.includes(term) || email.includes(term) || job.includes(term);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {editingProject.id ? 'Editar Proyecto de Redes' : 'Nuevo Proyecto con Orden de Servicio'}
            </h3>
            <p className="text-xs text-slate-400">
              Vincular a una OS activa jala automáticamente cliente, marca, pauta y equipo asignado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSaveProject} className="space-y-4 text-xs">
          {/* Selector de Orden de Servicio Activa */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
            <label className="font-extrabold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Seleccionar Orden de Servicio (OS) Activa</span>
            </label>
            <select
              value={editingProject.serviceOrderId || ''}
              onChange={(e) => onSelectServiceOrder(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Seleccionar Orden de Servicio --</option>
              {serviceOrders.map((os) => (
                <option key={os.id} value={os.id}>
                  {os.code} • {os.brandName || os.clientName} ({os.clientName})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
              Al elegir una OS, se llenan los datos del cliente, marca, entregables contratados y equipo.
            </p>
          </div>

          {/* Nombre del Proyecto */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Inka Gourmet SAC - Campaña Verano"
              value={editingProject.name || ''}
              onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Cliente y Marca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Cliente / Razón Social
              </label>
              <input
                type="text"
                readOnly
                value={editingProject.clientName || ''}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Marca Asignada
              </label>
              <input
                type="text"
                value={editingProject.brandName || ''}
                onChange={(e) => setEditingProject({ ...editingProject, brandName: e.target.value })}
                placeholder="Ej: Inka Gourmet"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Fechas de Campaña / Período */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Fecha de Inicio
              </label>
              <input
                type="date"
                value={editingProject.periodStart || ''}
                onChange={(e) => setEditingProject({ ...editingProject, periodStart: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Fecha de Finalización
              </label>
              <input
                type="date"
                value={editingProject.periodEnd || ''}
                onChange={(e) => setEditingProject({ ...editingProject, periodEnd: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>
          </div>

          {/* Cuotas de Contenido (Posts, Reels, Stories) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
              Entregables Contratados por Mes
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Posts
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingProject.contractedPosts || 0}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      contractedPosts: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Reels
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingProject.contractedReels || 0}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      contractedReels: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Stories
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingProject.contractedStories || 0}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      contractedStories: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Presupuesto de Pauta Publicitaria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Presupuesto de Pauta ({editingProject.budgetCurrency || 'PEN'})
              </label>
              <input
                type="number"
                min="0"
                value={editingProject.budget || 0}
                onChange={(e) =>
                  setEditingProject({
                    ...editingProject,
                    budget: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Estado del Proyecto
              </label>
              <select
                value={editingProject.status || 'active'}
                onChange={(e) =>
                  setEditingProject({
                    ...editingProject,
                    status: e.target.value as WorkspaceProjectStatus,
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                <option value="active">Activo</option>
                <option value="archived">Archivado</option>
                <option value="completed">Completado</option>
              </select>
            </div>
          </div>

          {/* Plataformas */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Redes Sociales Activas
            </label>
            <div className="flex flex-wrap gap-2">
              {(['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'x'] as SocialPostPlatform[]).map(
                (plat) => {
                  const isSelected = editingProject.platforms?.includes(plat);
                  return (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => {
                        if (onTogglePlatform) {
                          onTogglePlatform(plat);
                        } else {
                          const current = editingProject.platforms || [];
                          const next = isSelected
                            ? current.filter((p) => p !== plat)
                            : [...current, plat];
                          setEditingProject({ ...editingProject, platforms: next });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {getPlatformIcon(plat)}
                      <span className="capitalize">{plat}</span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Asignación de Usuarios / Equipo con Acceso al Proyecto */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Equipo Asignado con Acceso al Proyecto</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Los usuarios asignados podrán ver y gestionar este proyecto. Los usuarios no asignados (salvo administradores) no podrán ver este proyecto.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 self-start sm:self-auto shrink-0">
                {(editingProject.assignedUsers || []).length} asignado(s)
              </span>
            </div>

            {internalUsers.length > 4 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar miembros por nombre, correo o cargo..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {usersList.length > 0 ? (
                usersList.map((u: any) => {
                  const isAssigned = (editingProject.assignedUsers || []).some(
                    (au: any) => (typeof au === 'string' ? au === u.id : au?.id === u.id)
                  );
                  const displayName = u.fullName || u.name || u.email || 'Usuario';
                  const job = u.jobTitle || 'Miembro del equipo';
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        const current = editingProject.assignedUsers || [];
                        let next;
                        if (isAssigned) {
                          next = current.filter((au: any) =>
                            typeof au === 'string' ? au !== u.id : au?.id !== u.id
                          );
                        } else {
                          next = [...current, { id: u.id, name: displayName, role: job }];
                        }
                        setEditingProject({
                          ...editingProject,
                          assignedUsers: next,
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition cursor-pointer ${
                        isAssigned
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 text-indigo-950 dark:text-indigo-100 shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 uppercase shadow-2xs ${
                            isAssigned
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {displayName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate leading-tight">{displayName}</p>
                          <p className="text-[10px] text-slate-400 truncate leading-tight">{job}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition ${
                          isAssigned
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-transparent'
                        }`}
                      >
                        {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic col-span-2 text-center py-2">
                  No se encontraron miembros del equipo.
                </p>
              )}
            </div>
          </div>

          {/* Asignación de Carpeta en Google Drive */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                Carpeta de Google Drive para este Proyecto
              </label>
              <button
                type="button"
                onClick={onOpenDrivePicker}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{editingProject.driveFolderId ? 'Cambiar Carpeta' : 'Asignar Carpeta'}</span>
              </button>
            </div>

            {editingProject.driveFolderId ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-xs shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                    <Folder className="w-4 h-4 fill-amber-500/30" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 truncate" title={editingProject.driveFolderName}>
                      {editingProject.driveFolderName || 'Carpeta asignada'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Todos los artes, reels y entregables de este proyecto se guardarán aquí.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {editingProject.driveFolderLink && (
                    <a
                      href={editingProject.driveFolderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Abrir en Google Drive"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProject({
                        ...editingProject,
                        driveFolderId: '',
                        driveFolderName: '',
                        driveFolderLink: '',
                      });
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    title="Desvincular carpeta"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Asigna una carpeta de Google Drive para guardar y organizar automáticamente todos los contenidos y recursos de este proyecto.
              </p>
            )}
          </div>

          {/* Botones de acción */}
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
              Guardar Proyecto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
