import React from 'react';
import {
  ArrowLeft,
  PlayCircle,
  Share2,
  HardDrive,
  Plus,
  Search,
  Check,
  ExternalLink,
  Inbox,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  ListChecks,
  Calendar,
  Flag,
} from 'lucide-react';
import { PermissionGate } from '../../../../context/AppContext';
import {
  WorkspacePost,
  WorkspaceProject,
  WorkspaceMonth,
  SocialPostStatus,
} from '../../../../shared/types';
import {
  POST_STATUS_MAP,
  POST_THEMES,
  formatChipDate,
  calculateCountdown,
  formatMonthDateRange,
} from '../../types';

interface SocialPostsGridViewProps {
  posts: WorkspacePost[];
  activeProject?: WorkspaceProject;
  activeMonth?: WorkspaceMonth;
  selectedProjectId: string;
  selectedMonthId: string | null;
  loading: boolean;
  projects: WorkspaceProject[];
  socialSearch: string;
  setSocialSearch: (val: string) => void;
  socialStatusFilter: string;
  setSocialStatusFilter: (val: string) => void;
  setSelectedProjectId: (id: string) => void;
  onBackToMonths: () => void;
  onOpenNewPost: () => void;
  onOpenEditPost: (post: WorkspacePost) => void;
  onQuickChangePostStatus: (post: WorkspacePost, nextStatus: SocialPostStatus) => void;
  onPublicPreviewPost: (post: WorkspacePost) => void;
  onToggleArchivePost: (post: WorkspacePost) => void;
  onSharePost: (post: WorkspacePost) => void;
  onDeletePost: (postId: string, title: string) => void;
  onOpenPresentation: () => void;
  onOpenShareMonth: () => void;
  onOpenDriveUpload: () => void;
}

export const SocialPostsGridView: React.FC<SocialPostsGridViewProps> = ({
  posts,
  activeProject,
  activeMonth,
  selectedProjectId,
  selectedMonthId,
  loading,
  projects,
  socialSearch,
  setSocialSearch,
  socialStatusFilter,
  setSocialStatusFilter,
  setSelectedProjectId,
  onBackToMonths,
  onOpenNewPost,
  onOpenEditPost,
  onQuickChangePostStatus,
  onPublicPreviewPost,
  onToggleArchivePost,
  onSharePost,
  onDeletePost,
  onOpenPresentation,
  onOpenShareMonth,
  onOpenDriveUpload,
}) => {
  return (
    <div className="space-y-6">
      {/* Cabecera del Mes con Breadcrumb de retorno */}
      {selectedMonthId && activeMonth && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          {/* Contenedor Superior/Izquierdo */}
          <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3.5 min-w-0">
            {/* Fila móvil: Volver + OS Badge */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <button
                type="button"
                onClick={onBackToMonths}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Volver</span>
                <span className="hidden sm:inline">a Meses</span>
              </button>

              {/* En móvil mostramos el badge OS a la derecha del botón Volver para dar espacio */}
              {activeProject?.serviceOrderCode && (
                <span className="sm:hidden text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-lg shrink-0">
                  {activeProject.serviceOrderCode}
                </span>
              )}
            </div>

            <div className="h-7 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

            {/* Título del Mes, Marca y Fechas */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 truncate max-w-[140px] sm:max-w-none">
                  {activeProject?.brandName || activeProject?.name}
                </span>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  {activeMonth.name}
                </h3>
                {activeProject?.serviceOrderCode && (
                  <span className="hidden sm:inline-flex text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-lg shrink-0">
                    {activeProject.serviceOrderCode}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatMonthDateRange(activeMonth.startDate, activeMonth.endDate)}
                </span>
                <span>•</span>
                <span className="font-mono text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-md border border-sky-100 dark:border-sky-900/50">
                  ⏳ {calculateCountdown(activeMonth.endDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Acciones */}
          <div className="flex items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 shrink-0">
            {/* Opciones secundarias */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onOpenPresentation}
                className="p-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                title="Presentación interactiva tipo diapositivas PPT"
              >
                <PlayCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span className="hidden md:inline">Presentación</span>
              </button>

              <button
                type="button"
                onClick={onOpenShareMonth}
                className="p-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                title="Compartir vista pública del mes (con switch de PIN)"
              >
                <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="hidden md:inline">Compartir</span>
              </button>

              <button
                type="button"
                onClick={onOpenDriveUpload}
                className="p-2 sm:px-3.5 sm:py-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                title="Elegir carpeta de Google Drive y subir archivos"
              >
                <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="hidden lg:inline">Drive</span>
              </button>
            </div>

            <PermissionGate permission="workspace.social.manage">
              <button
                type="button"
                onClick={onOpenNewPost}
                className="flex-1 sm:flex-initial justify-center px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition flex items-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Nueva Publicación</span>
              </button>
            </PermissionGate>
          </div>
        </div>
      )}

      {/* Barra de Filtros (Solo visible en vista general fuera del mes) */}
      {!selectedMonthId && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Filtro por Proyecto */}
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
            >
              <option value="all">Todos los Proyectos</option>
              {projects.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.brandName || pr.name} ({pr.serviceOrderCode || 'Sin OS'})
                </option>
              ))}
            </select>

            {/* Buscador */}
            <div className="relative min-w-[180px] flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por título, copy o cliente..."
                value={socialSearch}
                onChange={(e) => setSocialSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filtro Estado */}
            <select
              value={socialStatusFilter}
              onChange={(e) => setSocialStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              <option value="all">Todos los Estados</option>
              <option value="idea">Idea / Borrador</option>
              <option value="writing">En Redacción</option>
              <option value="design">En Diseño</option>
              <option value="review">Por Aprobar</option>
              <option value="approved">Aprobado</option>
              <option value="published">Publicado</option>
            </select>
          </div>
        </div>
      )}

      {/* Grid Responsivo de Publicaciones */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Cargando publicaciones...</div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <Share2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No hay contenidos registrados
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Crea una publicación para programar copies, diseños, pauta y fechas de publicación.
          </p>
          <button
            type="button"
            onClick={onOpenNewPost}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition cursor-pointer"
          >
            Crear Primer Contenido
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-6">
          {posts.map((post, idx) => {
            const st = POST_STATUS_MAP[post.status] || POST_STATUS_MAP.idea;
            const theme = POST_THEMES[post.status] || POST_THEMES.idea;
            const postNum = String(idx + 1).padStart(2, '0');
            const displayImg =
              post.finalArtMediaUrl || post.mediaUrl || post.referenceMediaUrl;
            const qaCount = post.qaChecklist
              ? [
                  post.qaChecklist.spelling,
                  post.qaChecklist.logoIdentity,
                  post.qaChecklist.formatResolution,
                  post.qaChecklist.ctaLinks,
                ].filter(Boolean).length
              : 0;

            const createdChipDate = formatChipDate(post.createdAt || post.initialDate);
            const deadlineChipDate = formatChipDate(
              post.deliveryDate || post.scheduledDate
            );

            return (
              <div
                key={post.id}
                onClick={() => onOpenEditPost(post)}
                className={`rounded-[28px] border p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between ${theme.outerBg} ${theme.outerBorder} group cursor-pointer`}
              >
                {/* 1. Cabecera de la Tarjeta: Post 01 | [✓ APROBADO] y Botones Circulares */}
                <div>
                  <div className="flex items-center justify-between gap-2 pb-1.5">
                    <div className="flex items-center gap-2 min-w-0 shrink-0">
                      <span
                        className={`font-black text-sm md:text-base tracking-tight whitespace-nowrap shrink-0 ${theme.postNumberColor}`}
                      >
                        Post {postNum}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickChangePostStatus(post, st.next);
                        }}
                        title={`Cambiar estado: actual ${st.label}, clic para avanzar a ${POST_STATUS_MAP[st.next].label}`}
                        className={`px-2.5 py-0.5 rounded-full font-black text-[10px] flex items-center gap-1 border whitespace-nowrap shrink-0 transition hover:scale-105 cursor-pointer shadow-2xs ${theme.headerBadgeBg} ${theme.headerBadgeText} ${theme.headerBadgeBorder}`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>{theme.label}</span>
                      </button>
                    </div>

                    {/* 4 Botones Circulares Blancos */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* 1. Vista Pública */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPublicPreviewPost(post);
                        }}
                        className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center shadow-2xs hover:shadow-xs transition cursor-pointer"
                        title="Abrir en la vista pública"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {/* 2. Archivar / Desarchivar */}
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await onToggleArchivePost(post);
                        }}
                        className={`w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shadow-2xs hover:shadow-xs transition cursor-pointer ${
                          post.status === 'archived'
                            ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
                            : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                        title={
                          post.status === 'archived'
                            ? 'Desarchivar contenido'
                            : 'Archivar contenido'
                        }
                      >
                        <Inbox className="w-3.5 h-3.5" />
                      </button>

                      {/* 3. Compartir Post */}
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await onSharePost(post);
                        }}
                        className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center shadow-2xs hover:shadow-xs transition cursor-pointer"
                        title="Compartir publicación"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* 4. Eliminar Contenido */}
                      <PermissionGate permission="workspace.social.manage">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePost(post.id, post.title);
                          }}
                          className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-500 hover:text-rose-600 flex items-center justify-center shadow-2xs hover:shadow-xs transition cursor-pointer"
                          title="Eliminar contenido"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </PermissionGate>
                    </div>
                  </div>

                  {/* 2. Área de Imagen / Multimedia */}
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-xs my-3 flex items-center justify-center">
                    {displayImg ? (
                      <img
                        src={displayImg}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-center p-4 space-y-1.5 text-slate-500">
                        <ImageIcon className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                        <span className="text-[11px] font-bold block text-slate-400">
                          Sin arte cargado
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                          {post.format}
                        </span>
                      </div>
                    )}

                    {/* Badge sobre la imagen en la esquina superior derecha */}
                    <div
                      className={`absolute top-2.5 right-2.5 px-3 py-1 rounded-full text-white font-extrabold text-[10px] flex items-center gap-1 shadow-md ${theme.imageOverlayBg}`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{theme.imageLabel}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Tarjeta Interior Blanca con Datos, Chips y Copy */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs space-y-2.5 border border-slate-100 dark:border-slate-800/80">
                  {/* Fila de Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Chip Pilar */}
                    <span className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-extrabold text-[10px] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      <span>{post.contentPillar || 'Branding'}</span>
                    </span>

                    {/* Chip QA */}
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-extrabold text-[10px] flex items-center gap-1">
                      <ListChecks className="w-3 h-3 text-slate-500" />
                      <span>QA {qaCount}/4</span>
                    </span>

                    {/* Chip Fecha Creación */}
                    {createdChipDate && (
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[10px] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{createdChipDate}</span>
                      </span>
                    )}

                    {/* Chip Fecha Entrega */}
                    {deadlineChipDate && (
                      <span className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-extrabold text-[10px] flex items-center gap-1">
                        <Flag className="w-3 h-3 text-sky-500" />
                        <span>{deadlineChipDate}</span>
                      </span>
                    )}

                    {/* Chip Formato */}
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-[10px] uppercase tracking-wider">
                      {post.format}
                    </span>
                  </div>

                  {/* Título de la Publicación */}
                  <h4 className="font-black text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug pt-1">
                    {post.title || 'Sin Título'}
                  </h4>

                  {/* Copy Redactado */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {post.copy || 'Sin texto de copy redactado.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
