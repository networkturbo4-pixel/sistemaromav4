import React from 'react';
import { Share2, ListTodo, HardDrive, ArrowRight, Sparkles, Wrench, FileText, Video, Bot, Mail, ShieldAlert, Headphones } from 'lucide-react';
import { WorkspaceProject, WorkspaceTask } from '../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface WorkspaceHubViewProps {
  projects: WorkspaceProject[];
  tasks: WorkspaceTask[];
  formsCount?: number;
  meetingsCount?: number;
  whiteboardsCount?: number;
  onSelectSubmodule: (view: 'social' | 'tasks' | 'drive' | 'tools' | 'forms' | 'meetings' | 'whiteboards' | 'brand-guidelines' | 'romita' | 'emails' | 'music') => void;
}

export const WorkspaceHubView: React.FC<WorkspaceHubViewProps> = ({
  projects,
  tasks,
  formsCount = 0,
  meetingsCount = 0,
  whiteboardsCount = 0,
  onSelectSubmodule,
}) => {
  const { can, user, role } = useApp();
  const isAdm = user?.role === 'superadmin' || user?.role === 'admin' || !!role?.isSystem || role?.name?.toLowerCase().includes('admin') || role?.name?.toLowerCase().includes('super');

  const canAccessSocial = isAdm || can('workspace.social.manage') || can('workspace.social.view');
  const canAccessTasks = isAdm || can('workspace.tasks.manage') || can('workspace.tasks.view');
  const canAccessDrive = isAdm || can('drive.view');
  const canAccessTools = isAdm || can('workspace.tools.manage') || can('workspace.tools.view');
  const canAccessForms = isAdm || can('workspace.forms.manage') || can('workspace.forms.view');
  const canAccessMeetings = isAdm || can('workspace.meetings.view') || can('workspace.meetings.manage');
  const canAccessWhiteboards = isAdm || can('workspace.whiteboards.view') || can('workspace.whiteboards.manage');
  const canAccessBrandGuidelines = isAdm || can('workspace.brand_guidelines.view') || can('workspace.brand_guidelines.manage');
  const canAccessRomita = isAdm || can('workspace.romita.view') || can('workspace.romita.manage');
  const canAccessEmails = isAdm || can('workspace.emails.view') || can('workspace.emails.manage');

  const anyAccess =
    canAccessSocial ||
    canAccessTasks ||
    canAccessDrive ||
    canAccessTools ||
    canAccessForms ||
    canAccessMeetings ||
    canAccessWhiteboards ||
    canAccessBrandGuidelines ||
    canAccessRomita ||
    canAccessEmails;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Cabecera */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-xs">
        <span className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 inline-block mb-2 sm:mb-3">
          Workspace Operativo
        </span>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Espacio de Trabajo de Agencia
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 sm:mt-2 max-w-2xl leading-relaxed">
          Selecciona un submódulo para gestionar proyectos vinculados a Órdenes de Servicio activas,
          grillas de publicaciones, producción creativa, tareas, salas de reuniones virtuales, formularios interactivos y archivos en la nube.
        </p>
      </div>

      {/* Accesos Directos Responsivos */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
        {/* SUBMÓDULO 1: REDES SOCIALES */}
        {canAccessSocial && (
          <button
            type="button"
            onClick={() => onSelectSubmodule('social')}
            className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left shadow-xs hover:shadow-md hover:border-pink-400 dark:hover:border-pink-600 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-pink-50 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-800 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 group-hover:bg-pink-600 group-hover:text-white transition-colors duration-200">
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                  {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}
                </span>
              </div>

              <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors line-clamp-1">
                Redes Sociales
              </h3>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight sm:leading-relaxed">
                Proyectos con OS activas, grillas de contenidos, pauta y flujos de aprobación.
              </p>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-pink-600 dark:text-pink-400">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* SUBMÓDULO 2: TAREAS OPERATIVAS */}
        {canAccessTasks && (
          <button
            type="button"
            onClick={() => onSelectSubmodule('tasks')}
            className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left shadow-xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                <ListTodo className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                  {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'}
                </span>
              </div>

              <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                Tareas
              </h3>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight sm:leading-relaxed">
                Tablero Kanban operativo, prioridades y asignación de colaboradores.
              </p>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* SUBMÓDULO 3: ARCHIVOS & DRIVE */}
        {canAccessDrive && (
          <button
            type="button"
            onClick={() => onSelectSubmodule('drive')}
            className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                <HardDrive className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                  Cloud central & Drive
                </span>
              </div>

              <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                Archivos & Drive
              </h3>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight sm:leading-relaxed">
                Carpetas de clientes, entregables finales y Google Drive.
              </p>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* SUBMÓDULO 4: HERRAMIENTAS CREATIVAS (PALETAS, CÓDIGOS, BIOLINKS) */}
        {canAccessTools && (
          <button
            type="button"
            onClick={() => onSelectSubmodule('tools')}
            className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left shadow-xs hover:shadow-md hover:border-purple-400 dark:hover:border-purple-600 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-200">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                  Paletas, Códigos & Biolinks
                </span>
              </div>

              <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                Herramientas
              </h3>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight sm:leading-relaxed">
                Generador de paletas de color, códigos QR, códigos de barras y perfiles Biolink.
              </p>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-purple-600 dark:text-purple-400">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* SUBMÓDULO 5: FORMULARIOS */}
        {canAccessForms && (
          <button
            type="button"
            onClick={() => onSelectSubmodule('forms')}
            className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left shadow-xs hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-600 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                  {formsCount} {formsCount === 1 ? 'formulario' : 'formularios'}
                </span>
              </div>

              <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                Formularios
              </h3>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight sm:leading-relaxed">
                Briefs interactivos, encuestas, cotizadores a medida y recolección de respuestas.
              </p>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* SUBMÓDULO 6: SALAS & REUNIONES */}
        {canAccessMeetings && (
          <button
            type="button"
            onClick={() => onSelectSubmodule('meetings')}
            className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left shadow-xs hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                <Video className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                  {meetingsCount} {meetingsCount === 1 ? 'reunión' : 'reuniones'}
                </span>
              </div>

              <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                Salas & Reuniones
              </h3>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight sm:leading-relaxed">
                Salas virtuales Bento, Google Meet flotante, minutas de acuerdos y actas.
              </p>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* SUBMÓDULO 7: PIZARRAS CREATIVAS */}
        {canAccessWhiteboards && (
          <button
            type="button"
            onClick={() => onSelectSubmodule('whiteboards')}
            className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left shadow-xs hover:shadow-md hover:border-purple-500 dark:hover:border-purple-500 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-200">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                  {whiteboardsCount} {whiteboardsCount === 1 ? 'pizarra' : 'pizarras'}
                </span>
              </div>

              <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                Pizarras
              </h3>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight sm:leading-relaxed">
                Lienzos infinitos, diagramas interactivos, notas visuales y bocetos en vivo.
              </p>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-purple-600 dark:text-purple-400">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* SUBMÓDULO 8: BRAND GUIDELINES & PITCH DECKS */}
        {canAccessBrandGuidelines && (
          <button
            type="button"
            onClick={() => onSelectSubmodule('brand-guidelines')}
            className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left shadow-xs hover:shadow-md hover:border-amber-500 dark:hover:border-amber-500 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-200">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                  Swiss Style 16:9
                </span>
              </div>

              <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                Brand Guidelines
              </h3>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight sm:leading-relaxed">
                Manuales de identidad, pitch decks minimalistas, vistas 2x2 y protección con PIN.
              </p>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-amber-600 dark:text-amber-400">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* SUBMÓDULO 9: ROMITA AI & HISTORIAL */}
        {canAccessRomita && (
          <button
            type="button"
            onClick={() => onSelectSubmodule('romita')}
            className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left shadow-xs hover:shadow-md hover:border-sky-400 dark:hover:border-sky-600 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 group-hover:bg-sky-600 group-hover:text-white transition-colors duration-200">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                  Copilot & Bitácora
                </span>
              </div>

              <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-1">
                Romita AI & Historial
              </h3>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight sm:leading-relaxed">
                Agente con permisos de acción, historial de chats y bitácora de ejecuciones del SaaS.
              </p>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-sky-600 dark:text-sky-400">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* SUBMÓDULO 10: BANDEJA DE CORREOS CORPORATIVOS */}
        {canAccessEmails && (
          <button
            type="button"
            onClick={() => onSelectSubmodule('emails')}
            className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left shadow-xs hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>

              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                  SMTP & IMAP Dominio
                </span>
              </div>

              <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                Correos
              </h3>

              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight sm:leading-relaxed">
                Bandeja moderna y buzón corporativo con tu dominio. Redacta, recibe y adjunta archivos.
              </p>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        {/* SUBMÓDULO 11: MÚSICA & SOUNDIFY */}
        <button
          type="button"
          onClick={() => onSelectSubmodule('music')}
          className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 text-left shadow-xs hover:shadow-md hover:border-rose-500 dark:hover:border-rose-500 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
        >
          <div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 group-hover:bg-rose-600 group-hover:text-white transition-colors duration-200">
              <Headphones className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400">
                Playlists & YouTube
              </span>
            </div>

            <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-1">
              Música
            </h3>

            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight sm:leading-relaxed">
              Crea playlists, busca música para concentrarte y reproduce en segundo plano mientras trabajas.
            </p>
          </div>

          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-rose-600 dark:text-rose-400">
            <span>Ingresar</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {!anyAccess && (
          <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
              Sin submódulos asignados en Workspace
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Tu rol actual no tiene acceso a submódulos específicos de este espacio de trabajo. Solicita a un administrador que te asigne permisos de Redes Sociales, Tareas o Pizarras.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
