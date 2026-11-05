import React from 'react';
import {
  Globe,
  Share2,
  X,
  Maximize2,
  Image as ImageIcon,
  ExternalLink,
  Calendar,
  Copy,
  Check,
} from 'lucide-react';
import { WorkspacePost } from '../../../../shared/types';
import { POST_STATUS_MAP } from '../types';

interface PostPublicPreviewModalProps {
  post: WorkspacePost | null;
  onClose: () => void;
  onSharePost: (post: WorkspacePost) => void;
  onApprovePost: (postId: string) => Promise<void>;
  onOpenLightbox: (url: string) => void;
  toast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const PostPublicPreviewModal: React.FC<PostPublicPreviewModalProps> = ({
  post,
  onClose,
  onSharePost,
  onApprovePost,
  onOpenLightbox,
  toast,
}) => {
  if (!post) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-xs"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                  Vista Pública para el Cliente
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-bold text-slate-500 text-xs">
                  {POST_STATUS_MAP[post.status]?.label || 'En Revisión'}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5 truncate max-w-md">
                {post.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSharePost(post)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Copiar enlace directo"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Visual / Arte Final */}
            <div className="md:col-span-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center min-h-[300px]">
              {post.finalArtMediaUrl || post.referenceMediaUrl || post.mediaUrl ? (
                <div className="w-full relative group">
                  <img
                    src={post.finalArtMediaUrl || post.referenceMediaUrl || post.mediaUrl}
                    alt={post.title}
                    className="w-full max-h-[420px] rounded-xl object-contain mx-auto shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onOpenLightbox(
                        post.finalArtMediaUrl ||
                          post.referenceMediaUrl ||
                          post.mediaUrl ||
                          ''
                      )
                    }
                    className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-950/70 text-white hover:bg-slate-900 transition shadow-md cursor-pointer"
                    title="Ver en pantalla completa"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 space-y-2">
                  <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="font-bold text-slate-400">Sin archivo visual adjunto</p>
                </div>
              )}

              {post.finalArtExternalLink && (
                <a
                  href={post.finalArtExternalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-center font-bold text-xs hover:bg-indigo-100 transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir recurso externo (Canva / Drive / Figma)</span>
                </a>
              )}
            </div>

            {/* Detalles y Copy */}
            <div className="md:col-span-6 space-y-4">
              {/* Meta chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase text-[10px] border border-indigo-200 dark:border-indigo-800">
                  {post.pillar || 'Contenido'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{post.deliveryDate || post.scheduledDate || 'Fecha por programar'}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase">
                  {post.format || 'post'}
                </span>
              </div>

              {/* Redes Sociales activas */}
              {post.platforms && post.platforms.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Canales:</span>
                  {post.platforms.map((plat) => (
                    <span
                      key={plat}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-[10px] uppercase"
                    >
                      {plat}
                    </span>
                  ))}
                </div>
              )}

              {/* Copy del Post */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold uppercase tracking-wider text-[11px] text-slate-500">
                    Texto / Copy del Post
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (post.copy) {
                        navigator.clipboard.writeText(post.copy);
                        toast('Copy copiado al portapapeles', 'success');
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar Copy</span>
                  </button>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto">
                  {post.copy || 'Sin copy redactado todavía.'}
                </div>
              </div>

              {/* Acciones de Aprobación */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await onApprovePost(post.id);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Aprobar Publicación</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
