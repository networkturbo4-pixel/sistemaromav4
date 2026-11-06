import React, { useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Plus,
  FolderKanban,
  FileText,
  Folder,
  FolderPlus,
  Edit3,
  Archive,
  ArchiveRestore,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { PermissionGate } from '../../../../context/AppContext';
import { WorkspaceProject, Client } from '../../../../shared/types';

interface SocialProjectsViewProps {
  projects: WorkspaceProject[];
  clients: Client[];
  loading: boolean;
  tenant: any;
  onBackToHub: () => void;
  onOpenNewProject: () => void;
  onOpenEditProject: (proj: WorkspaceProject) => void;
  onToggleArchiveProject: (proj: WorkspaceProject) => void;
  onDeleteProject: (proj: WorkspaceProject) => void;
  onOpenOsWebView: (proj: WorkspaceProject) => void;
  onAssignDriveFolder: (proj: WorkspaceProject) => void;
  onEnterProjectBoard: (projectId: string) => void;
}

interface ProjectBrandLogoProps {
  logoUrl?: string;
  name: string;
  brandColor?: string;
}

const ProjectBrandLogo: React.FC<ProjectBrandLogoProps> = ({ logoUrl, name, brandColor }) => {
  const [hasError, setHasError] = useState(false);

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={() => setHasError(true)}
        className="w-12 h-12 rounded-2xl object-cover shrink-0 border border-slate-100 dark:border-slate-800 shadow-2xs"
      />
    );
  }

  return (
    <div
      style={{ backgroundColor: brandColor || '#881337' }}
      className="w-12 h-12 rounded-2xl text-white font-black text-lg flex items-center justify-center shrink-0 shadow-2xs uppercase"
    >
      {(name || 'P').charAt(0).toUpperCase()}
    </div>
  );
};

export const SocialProjectsView: React.FC<SocialProjectsViewProps> = ({
  projects,
  clients,
  loading,
  tenant,
  onBackToHub,
  onOpenNewProject,
  onOpenEditProject,
  onToggleArchiveProject,
  onDeleteProject,
  onOpenOsWebView,
  onAssignDriveFolder,
  onEnterProjectBoard,
}) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Barra de Navegación Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
          <div className="flex items-center justify-between sm:justify-start">
            <button
              type="button"
              onClick={onBackToHub}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
              <span className="hidden sm:inline">al workspace</span>
            </button>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:border-slate-800 hidden sm:block shrink-0" />
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-pink-500 shrink-0" />
              <span>Redes Sociales</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Proyectos activos y planificación vinculada a Órdenes de Servicio (OS)
            </p>
          </div>
        </div>

        <PermissionGate permission="workspace.social.manage">
          <button
            type="button"
            onClick={onOpenNewProject}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proyecto</span>
          </button>
        </PermissionGate>
      </div>

      {/* Grid Responsivo de Proyectos */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Cargando proyectos...</div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No hay proyectos de redes sociales registrados
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Crea un proyecto vinculado a una Orden de Servicio activa para coordinar equipo,
            entregables y contenidos.
          </p>
          <button
            type="button"
            onClick={onOpenNewProject}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition cursor-pointer"
          >
            Crear Primer Proyecto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-6">
          {projects.map((proj) => {
            const isArchived = proj.status === 'archived';
            const clientObj = clients.find((c) => c.id === proj.clientId);
            const allBrands = clients.flatMap((c) => c.brands || []);
            const brandObj =
              clientObj?.brands?.find(
                (b) => b.id === proj.brandId || b.name === proj.brandName || b.name === proj.name
              ) ||
              allBrands.find(
                (b) =>
                  (proj.brandId && b.id === proj.brandId) ||
                  (proj.brandName && b.name.toLowerCase() === proj.brandName.toLowerCase()) ||
                  (b.name && b.name.toLowerCase() === proj.name.toLowerCase())
              );

            return (
              <div
                key={proj.id}
                className={`bg-white dark:bg-slate-900 border rounded-[28px] p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 ${
                  isArchived
                    ? 'border-slate-200/60 dark:border-slate-800/60 opacity-80'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Fila 1: Logo Marca + Título y Cliente con ancho completo */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <ProjectBrandLogo
                      logoUrl={brandObj?.logoUrl}
                      name={proj.brandName || proj.name}
                      brandColor={brandObj?.brandColor}
                    />
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-base font-black text-slate-900 dark:text-white truncate"
                        title={proj.brandName || proj.name}
                      >
                        {proj.brandName || proj.name}
                      </h3>
                      <p
                        className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5"
                        title={proj.clientName}
                      >
                        {proj.clientName || 'Servicio General'}
                      </p>
                    </div>
                  </div>

                  {/* Fila 2: Badge OS + Badge ACTIVO en la misma línea */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {proj.serviceOrderCode ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-black shadow-2xs">
                        <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>OS: {proj.serviceOrderCode}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 text-xs font-semibold">
                        <span>Sin OS</span>
                      </div>
                    )}

                    {/* Badge Estado ACTIVO */}
                    <span
                      className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 border ${
                        isArchived
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isArchived ? 'bg-slate-400' : 'bg-emerald-500'
                        }`}
                      />
                      <span>{isArchived ? 'ARCHIVADO' : 'ACTIVO'}</span>
                    </span>
                  </div>

                  {/* Fila 3: EQUIPO ASIGNADO */}
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                      EQUIPO ASIGNADO
                    </span>
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {proj.assignedUsers && proj.assignedUsers.length > 0 ? (
                        proj.assignedUsers.slice(0, 3).map((u, idx) => (
                          <div
                            key={idx}
                            className="w-7 h-7 rounded-full bg-indigo-600 text-white border-2 border-white dark:border-slate-900 font-extrabold text-xs flex items-center justify-center uppercase shrink-0 shadow-2xs"
                            title={`${u.name} (${u.role || 'Equipo'})`}
                          >
                            {u.name.charAt(0)}
                          </div>
                        ))
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center uppercase shrink-0">
                          {(tenant.companyInfo?.commercialName || 'A').charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fila 4: Acciones Toolbar: [Drive] [Ver OS] [Editar] [Archivar] [Eliminar] */}
                  <div className="py-2.5 px-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-around text-slate-400">
                    {/* Google Drive Folder */}
                    {proj.driveFolderId ? (
                      <a
                        href={proj.driveFolderLink || `/files?folder=${proj.driveFolderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg text-amber-500 hover:text-amber-600 transition cursor-pointer"
                        title={`Carpeta en Drive: ${proj.driveFolderName || 'Proyecto'}`}
                      >
                        <Folder className="w-4 h-4 fill-amber-500/20" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAssignDriveFolder(proj)}
                        className="p-1 rounded-lg hover:text-amber-500 transition cursor-pointer"
                        title="Asignar carpeta de Google Drive"
                      >
                        <FolderPlus className="w-4 h-4" />
                      </button>
                    )}

                    {/* Ver OS */}
                    <button
                      type="button"
                      onClick={() => onOpenOsWebView(proj)}
                      className="p-1 rounded-lg hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                      title="Ver Hoja de Ruta / Orden de Servicio"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    <PermissionGate permission="workspace.social.manage">
                      {/* Editar */}
                      <button
                        type="button"
                        onClick={() => onOpenEditProject(proj)}
                        className="p-1 rounded-lg hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                        title="Editar Proyecto"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Archivar / Desarchivar */}
                      <button
                        type="button"
                        onClick={() => onToggleArchiveProject(proj)}
                        className="p-1 rounded-lg hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer"
                        title={isArchived ? 'Desarchivar' : 'Archivar'}
                      >
                        {isArchived ? (
                          <ArchiveRestore className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                      </button>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => onDeleteProject(proj)}
                        className="p-1 rounded-lg hover:text-rose-600 transition cursor-pointer"
                        title="Eliminar Proyecto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </PermissionGate>
                  </div>
                </div>

                {/* Fila 5: Botón Principal "Entrar al Tablero ->" */}
                <button
                  type="button"
                  onClick={() => onEnterProjectBoard(proj.id)}
                  className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Entrar al Tablero</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
