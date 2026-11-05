import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, Check, Copy, Moon, Sun, Lock, KeyRound, ChevronLeft, 
  ChevronRight, MessageSquare, Image as ImageIcon, Send, Paperclip, 
  Sparkles, ZoomIn, X, ExternalLink, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { UniversalMediaEmbed } from './UniversalMediaEmbed';

interface PublicWorkspaceMonthViewProps {
  token: string;
}

interface PublicPost {
  id: string;
  code?: string;
  title: string;
  concept?: string;
  copy?: string;
  caption?: string;
  designerBrief?: string;
  notes?: string;
  status: string;
  pillar?: string;
  scheduledDate?: string;
  finalArtMediaUrl?: string;
  referenceMediaUrl?: string;
  comments?: Array<{
    id: string;
    author: string;
    text: string;
    avatar?: string;
    createdAt: string;
  }>;
}

interface PublicMonthData {
  month: {
    id: string;
    name: string;
    month: number;
    year: number;
    status: string;
    requirePin?: boolean;
    publicPin?: string;
  };
  project?: {
    id: string;
    name: string;
    clientName?: string;
    brandName?: string;
  };
  posts: PublicPost[];
  tenant?: {
    name?: string;
    logoUrl?: string;
  };
}

export const PublicWorkspaceMonthView: React.FC<PublicWorkspaceMonthViewProps> = ({ token }) => {
  const [data, setData] = useState<PublicMonthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PIN security
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // View state
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState<'ref' | 'final'>('ref');
  const [copiedCopy, setCopiedCopy] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('roma_public_comment_author') || 'Cliente');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentAttachedImg, setCommentAttachedImg] = useState<string | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchMonth = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/public/workspace/months/${encodeURIComponent(token)}`);
        if (!res.ok) {
          throw new Error('No se pudo encontrar la grilla de contenidos o el enlace ha caducado.');
        }
        const json: PublicMonthData = await res.json();
        setData(json);

        // Check if PIN is required
        if (!json.month.requirePin || !json.month.publicPin) {
          setIsUnlocked(true);
        } else {
          // Check session storage
          const storedPin = sessionStorage.getItem(`workspace_pin_${token}`);
          if (storedPin === json.month.publicPin) {
            setIsUnlocked(true);
          }
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonth();
  }, [token]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.month.publicPin) {
      setIsUnlocked(true);
      return;
    }
    if (enteredPin.trim() === data.month.publicPin.trim()) {
      sessionStorage.setItem(`workspace_pin_${token}`, enteredPin.trim());
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCopy(true);
    setTimeout(() => setCopiedCopy(false), 2000);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() && !commentAttachedImg) return;
    const currentPost = data?.posts[currentPostIndex];
    if (!currentPost) return;

    try {
      setIsSendingComment(true);
      localStorage.setItem('roma_public_comment_author', authorName);

      let fullComment = commentText.trim();
      if (commentAttachedImg) {
        fullComment += `\n[Imagen Adjunta]: ${commentAttachedImg}`;
      }

      const res = await fetch(`/api/public/workspace/months/${encodeURIComponent(token)}/posts/${currentPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: authorName,
          text: fullComment
        })
      });

      if (res.ok) {
        const result = await res.json();
        // Update local state
        const updatedPosts = [...(data?.posts || [])];
        const targetPost = { ...updatedPosts[currentPostIndex] };
        targetPost.comments = [...(targetPost.comments || []), result.comment];
        updatedPosts[currentPostIndex] = targetPost;
        setData(prev => prev ? { ...prev, posts: updatedPosts } : null);

        setCommentText('');
        setCommentAttachedImg(null);
      }
    } catch (err) {
      console.error('Error al enviar comentario:', err);
    } finally {
      setIsSendingComment(false);
    }
  };

  // Paste image handler for comments
  const handleCommentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setCommentAttachedImg(event.target?.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 animate-pulse flex items-center justify-center text-white font-black text-xl shadow-lg">
          R
        </div>
        <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Cargando grilla de contenidos...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <X className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Enlace No Disponible</h2>
        <p className="text-sm text-slate-500 max-w-md">{error || 'La grilla de contenidos solicitada no existe o ya no es pública.'}</p>
      </div>
    );
  }

  // PIN Lock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Contenido Protegido</h2>
          <p className="text-xs text-slate-400 mb-6">
            Esta grilla de contenidos para <span className="text-blue-400 font-semibold">{data.project?.name || data.month.name}</span> requiere un PIN de acceso confidencial.
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(false);
                }}
                placeholder="Ingresa el PIN de acceso"
                autoFocus
                className={`w-full text-center tracking-[0.4em] text-2xl font-mono py-3 px-4 rounded-xl bg-slate-900 border ${
                  pinError ? 'border-red-500 text-red-400' : 'border-slate-700 text-white focus:border-blue-500'
                } outline-none transition-all`}
              />
              {pinError && (
                <p className="text-xs text-red-400 mt-2 font-medium">
                  El PIN ingresado es incorrecto. Vuelve a intentarlo.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Desbloquear Grilla</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            {data.tenant?.name || 'Roma Agencia'} • Sistema de Aprobación de Contenidos
          </div>
        </div>
      </div>
    );
  }

  const posts = data.posts || [];
  const currentPost = posts[currentPostIndex] || null;
  const currentMediaUrl = activeMediaTab === 'ref' 
    ? (currentPost?.referenceMediaUrl || currentPost?.finalArtMediaUrl) 
    : (currentPost?.finalArtMediaUrl || currentPost?.referenceMediaUrl);

  const comments = currentPost?.comments || [];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#f4f7fb] text-slate-800'} transition-colors flex flex-col font-sans`}>
      {/* Top Main Navigation Bar (Image 5 Header) */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: POST CODE, DATE, STATUS BADGE */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
              {currentPost?.code || `POST ${String(currentPostIndex + 1).padStart(2, '0')}`}
            </span>

            {currentPost?.scheduledDate && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>{currentPost.scheduledDate}</span>
              </div>
            )}

            <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {currentPost?.status || 'BORRADOR'}
            </span>
          </div>

          {/* Right: Theme switch and brand */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Cambiar tema claro/oscuro"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main 3-Column Content Body (Image 5 Layout) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-between">
        {currentPost ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 flex-1 items-stretch">
            {/* COLUMN 1: COPY DEL POST + IDEA CREATIVA (4 cols on lg) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Card 1: Copy del Post */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center gap-1.5">
                      <span className="w-2.5 h-1.5 bg-emerald-500 rounded-sm inline-block" />
                      COPY DEL POST
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyText(currentPost.caption || currentPost.copy || '')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    {copiedCopy ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCopy ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[380px] text-xs sm:text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-normal pr-1">
                  {currentPost.caption || currentPost.copy || (
                    <span className="text-slate-400 italic">No hay copy registrado para esta publicación.</span>
                  )}
                </div>
              </div>

              {/* Card 2: Idea / Referencia Creativa */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    IDEA / REFERENCIA CREATIVA
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto select-text">
                  {currentPost.concept || currentPost.designerBrief || currentPost.notes || (
                    <span className="text-slate-400 italic">Sin especificaciones creativas adicionales.</span>
                  )}
                </div>
              </div>
            </div>

            {/* COLUMN 2: MULTIMEDIA (5 cols on lg) */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col">
              {/* Header & Tabs */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    MULTIMEDIA
                  </span>
                </div>
                {currentMediaUrl && (
                  <button
                    onClick={() => setIsZoomOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Clic para zoom</span>
                  </button>
                )}
              </div>

              {/* Tabs Switcher: Referencia gráfica | Post Terminado (Exact Image 5) */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveMediaTab('ref')}
                  className={`py-2 rounded-lg transition-all ${
                    activeMediaTab === 'ref'
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  Referencia gráfica
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMediaTab('final')}
                  className={`py-2 rounded-lg transition-all ${
                    activeMediaTab === 'final'
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  Post Terminado
                </button>
              </div>

              {/* Media viewer */}
              <div className="flex-1 flex items-center justify-center min-h-[300px] sm:min-h-[420px] bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 p-2 sm:p-4 overflow-hidden">
                <UniversalMediaEmbed
                  url={currentMediaUrl}
                  alt={currentPost.title}
                  className="w-full max-h-[500px]"
                />
              </div>
            </div>

            {/* COLUMN 3: COMENTARIOS (3 cols on lg) */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      COMENTARIOS
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {comments.length} Mensajes
                  </span>
                </div>

                {/* Comment Feed */}
                <div className="space-y-3 overflow-y-auto max-h-[320px] pr-1">
                  {comments.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
                      <MessageSquare className="w-10 h-10 stroke-1 mb-2 opacity-40" />
                      <span className="text-xs">No hay comentarios registrados.</span>
                    </div>
                  ) : (
                    comments.map((comm) => (
                      <div key={comm.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800 dark:text-white">{comm.author}</span>
                          <span className="text-[10px] text-slate-400">
                            {comm.createdAt ? new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comm.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Comment Input Area (Exact Image 5) */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 space-y-2">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Tu Nombre / Empresa"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none"
                />

                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onPaste={handleCommentPaste}
                  placeholder="Escribe tu feedback o pega una imagen (Ctrl + V)..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none resize-none focus:ring-1 focus:ring-emerald-500"
                />

                {commentAttachedImg && (
                  <div className="relative inline-block border border-slate-300 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-800">
                    <img src={commentAttachedImg} alt="Adjunto" className="w-16 h-16 object-cover rounded" />
                    <button
                      onClick={() => setCommentAttachedImg(null)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => setCommentAttachedImg(event.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => commentFileInputRef.current?.click()}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Adjuntar imagen</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendComment}
                    disabled={isSendingComment || (!commentText.trim() && !commentAttachedImg)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSendingComment ? 'Enviando...' : 'Enviar'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400">
            No hay publicaciones en este mes.
          </div>
        )}

        {/* FOOTER: < ANTERIOR | POST X DE Y | SIGUIENTE > (Exact Image 5) */}
        <footer className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setCurrentPostIndex(prev => Math.max(0, prev - 1))}
            disabled={currentPostIndex === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <span className="text-slate-700 dark:text-slate-300 font-bold bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
            Post {currentPostIndex + 1} de {posts.length}
          </span>

          <button
            onClick={() => setCurrentPostIndex(prev => Math.min(posts.length - 1, prev + 1))}
            disabled={currentPostIndex >= posts.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </footer>
      </main>

      {/* Lightbox Zoom Modal */}
      {isZoomOpen && currentMediaUrl && (
        <div
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <button
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={currentMediaUrl}
            alt="Zoom"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
