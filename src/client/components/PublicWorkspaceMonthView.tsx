import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar,
  Check,
  Copy,
  Moon,
  Sun,
  Lock,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Image as ImageIcon,
  Send,
  Sparkles,
  ZoomIn,
  X,
  LayoutGrid,
  AlignLeft,
  Search,
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
  const [activeMediaTab, setActiveMediaTab] = useState<'ref' | 'final'>('final');
  const [copiedCopy, setCopiedCopy] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Mobile navigation tabs: 'media' | 'copy' | 'comments'
  const [mobileTab, setMobileTab] = useState<'media' | 'copy' | 'comments'>('media');

  // Quick Post Selector Drawer / Modal
  const [isPostSelectorOpen, setIsPostSelectorOpen] = useState(false);
  const [postSearchQuery, setPostSearchQuery] = useState('');

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('roma_public_comment_author') || 'Cliente');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentAttachedImg, setCommentAttachedImg] = useState<string | null>(null);
  const [commentSuccessMsg, setCommentSuccessMsg] = useState(false);
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

  // Initial post index from URL hash or query param (e.g. #post-4 or ?post=4)
  useEffect(() => {
    if (!data?.posts?.length) return;
    const hash = window.location.hash;
    const hashMatch = hash.match(/#post-(\d+)/i);
    if (hashMatch) {
      const idx = parseInt(hashMatch[1], 10) - 1;
      if (idx >= 0 && idx < data.posts.length) {
        setCurrentPostIndex(idx);
        return;
      }
    }
    const params = new URLSearchParams(window.location.search);
    const postParam = params.get('post');
    if (postParam) {
      const idx = parseInt(postParam, 10) - 1;
      if (idx >= 0 && idx < data.posts.length) {
        setCurrentPostIndex(idx);
      }
    }
  }, [data]);

  const posts = data?.posts || [];
  const currentPost = posts[currentPostIndex] || null;

  // Auto-select media tab on post switch: if post has final art, show 'final', else 'ref'
  useEffect(() => {
    if (!currentPost) return;
    if (currentPost.finalArtMediaUrl) {
      setActiveMediaTab('final');
    } else {
      setActiveMediaTab('ref');
    }
  }, [currentPostIndex, currentPost?.id]);

  const currentMediaUrl =
    activeMediaTab === 'final'
      ? currentPost?.finalArtMediaUrl || currentPost?.referenceMediaUrl
      : currentPost?.referenceMediaUrl || currentPost?.finalArtMediaUrl;

  const comments = currentPost?.comments || [];

  const handleSelectPost = (idx: number) => {
    if (!posts.length) return;
    const clamped = Math.max(0, Math.min(posts.length - 1, idx));
    setCurrentPostIndex(clamped);
    try {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#post-${clamped + 1}`);
    } catch {
      // Ignore in iframe / strict environments
    }
  };

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
    if (!currentPost) return;

    try {
      setIsSendingComment(true);
      localStorage.setItem('roma_public_comment_author', authorName);

      let fullComment = commentText.trim();
      if (commentAttachedImg) {
        fullComment += `\n[Imagen Adjunta]: ${commentAttachedImg}`;
      }

      const res = await fetch(
        `/api/public/workspace/months/${encodeURIComponent(token)}/posts/${currentPost.id}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            author: authorName,
            text: fullComment,
          }),
        }
      );

      if (res.ok) {
        const result = await res.json();
        // Update local state
        const updatedPosts = [...(data?.posts || [])];
        const targetPost = { ...updatedPosts[currentPostIndex] };
        targetPost.comments = [...(targetPost.comments || []), result.comment];
        updatedPosts[currentPostIndex] = targetPost;
        setData((prev) => (prev ? { ...prev, posts: updatedPosts } : null));

        setCommentText('');
        setCommentAttachedImg(null);
        setCommentSuccessMsg(true);
        setTimeout(() => setCommentSuccessMsg(false), 3000);
      } else {
        alert('No se pudo guardar el comentario. Por favor, reintenta.');
      }
    } catch (err) {
      console.error('Error al enviar comentario:', err);
      alert('Error de conexión al enviar el comentario.');
    } finally {
      setIsSendingComment(false);
    }
  };

  // Paste image handler for comments (Ctrl + V)
  const handleCommentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
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

  // Helper to parse comments that may include an attached image
  const parseCommentText = (raw: string) => {
    const match = raw.match(/\n?\[Imagen Adjunta\]:\s*(\S+)/);
    if (match) {
      const cleanText = raw.replace(/\n?\[Imagen Adjunta\]:\s*\S+/, '').trim();
      return { text: cleanText, attachedImg: match[1] };
    }
    return { text: raw, attachedImg: null };
  };

  // Filter posts for quick search modal
  const filteredPosts = useMemo(() => {
    if (!postSearchQuery.trim()) {
      return posts.map((post, idx) => ({ post, originalIndex: idx }));
    }
    const q = postSearchQuery.toLowerCase().trim();
    return posts
      .map((post, idx) => ({ post, originalIndex: idx }))
      .filter(({ post, originalIndex }) => {
        const code = (post.code || `post ${originalIndex + 1}`).toLowerCase();
        const title = (post.title || '').toLowerCase();
        const copy = (post.copy || post.caption || '').toLowerCase();
        const concept = (post.concept || '').toLowerCase();
        return code.includes(q) || title.includes(q) || copy.includes(q) || concept.includes(q);
      });
  }, [posts, postSearchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 animate-pulse flex items-center justify-center text-white font-black text-xl shadow-lg">
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
        <p className="text-sm text-slate-500 max-w-md">
          {error || 'La grilla de contenidos solicitada no existe o ya no es pública.'}
        </p>
      </div>
    );
  }

  // PIN Lock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">Contenido Protegido</h2>
          <p className="text-xs text-slate-400 mb-6">
            Esta grilla de contenidos para{' '}
            <span className="text-indigo-400 font-semibold">{data.project?.name || data.month.name}</span> requiere un
            PIN de acceso confidencial.
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
                  pinError ? 'border-red-500 text-red-400' : 'border-slate-700 text-white focus:border-indigo-500'
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
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
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

  const isPublished = currentPost?.status === 'published';

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#eef2f6] text-slate-800'
      } transition-colors flex flex-col font-sans`}
    >
      {/* ========================================================================= */}
      {/* VISTA ESCRITORIO / PC (Image 4): Contenedor amplio, elegante y adaptativo */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-1 flex-col w-full max-w-[1720px] 2xl:max-w-[1850px] mx-auto p-4 sm:p-6 lg:p-7">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs flex-1 flex flex-col justify-between">
          {/* Header Superior: POST 04 | Fecha | PUBLICADO + Botones Sol/Luna y Grid */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800/80 mb-6">
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                {currentPost?.code || `POST ${String(currentPostIndex + 1).padStart(2, '0')}`}
              </span>

              {currentPost?.scheduledDate && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{currentPost.scheduledDate}</span>
                </div>
              )}

              <span
                className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${
                  isPublished
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                }`}
              >
                {isPublished ? 'PUBLICADO' : currentPost?.status?.toUpperCase() || 'BORRADOR'}
              </span>
            </div>

            {/* Acciones Header: Tema Claro/Oscuro y Buscador Rápido de Todos los Posts */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Cambiar tema claro / oscuro"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsPostSelectorOpen(true)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Ver y buscar todos los posts"
              >
                <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="hidden xl:inline">Todos los posts</span>
              </button>
            </div>
          </div>

          {/* Grilla 3 Columnas: COPY | MULTIMEDIA (Ancha) | COMENTARIOS */}
          {currentPost ? (
            <div className="grid grid-cols-12 gap-6 flex-1 items-stretch">
              {/* COLUMNA 1: COPY DEL POST + IDEA CREATIVA (Columna 3 de 12) */}
              <div className="col-span-3 flex flex-col gap-4">
                {/* Tarjeta Copy */}
                <div className="bg-slate-50/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <AlignLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
                        COPY DEL POST
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(currentPost.caption || currentPost.copy || '')}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
                    >
                      {copiedCopy ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCopy ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[380px] text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-normal pr-1">
                    {currentPost.caption || currentPost.copy || (
                      <span className="text-slate-400 italic">No hay copy registrado para esta publicación.</span>
                    )}
                  </div>
                </div>

                {/* Tarjeta Idea / Referencia Creativa */}
                <div className="bg-slate-50/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/70 dark:border-slate-800 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
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

              {/* COLUMNA 2: MULTIMEDIA ANCHA (Columna 6 de 12) */}
              <div className="col-span-6 bg-slate-50/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col">
                {/* Header Multimedia & Clic para zoom */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800 mb-3.5">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
                      MULTIMEDIA
                    </span>
                  </div>
                  {currentMediaUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setZoomImageUrl(currentMediaUrl);
                        setIsZoomOpen(true);
                      }}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Clic para zoom</span>
                    </button>
                  )}
                </div>

                {/* Switcher: Referencia gráfica | Post Terminado */}
                <div className="grid grid-cols-2 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl mb-3.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('ref')}
                    className={`py-2 rounded-lg transition-all cursor-pointer ${
                      activeMediaTab === 'ref'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Referencia gráfica
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('final')}
                    className={`py-2 rounded-lg transition-all cursor-pointer ${
                      activeMediaTab === 'final'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Post Terminado
                  </button>
                </div>

                {/* Visor de Arte/Imagen con altura generosa */}
                <div
                  onClick={() => {
                    if (currentMediaUrl) {
                      setZoomImageUrl(currentMediaUrl);
                      setIsZoomOpen(true);
                    }
                  }}
                  className="flex-1 flex items-center justify-center min-h-[440px] xl:min-h-[540px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2 sm:p-4 overflow-hidden cursor-zoom-in"
                >
                  <UniversalMediaEmbed
                    url={currentMediaUrl}
                    alt={currentPost.title}
                    className="w-full max-h-[560px]"
                  />
                </div>
              </div>

              {/* COLUMNA 3: COMENTARIOS (Columna 3 de 12) */}
              <div className="col-span-3 bg-slate-50/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800 mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
                        COMENTARIOS
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {comments.length} Mensajes
                    </span>
                  </div>

                  {/* Feed de Comentarios */}
                  <div className="space-y-2.5 overflow-y-auto max-h-[340px] pr-1">
                    {comments.length === 0 ? (
                      <div className="py-14 flex flex-col items-center justify-center text-center text-slate-400">
                        <MessageSquare className="w-9 h-9 stroke-1 mb-2 opacity-40" />
                        <span className="text-xs">No hay comentarios registrados.</span>
                      </div>
                    ) : (
                      comments.map((comm) => {
                        const { text: cleanText, attachedImg } = parseCommentText(comm.text);
                        return (
                          <div
                            key={comm.id}
                            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-xs shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-900 dark:text-white">{comm.author}</span>
                              <span className="text-[10px] text-slate-400">
                                {comm.createdAt
                                  ? new Date(comm.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                            </div>
                            {cleanText && (
                              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{cleanText}</p>
                            )}
                            {attachedImg && (
                              <div className="mt-2">
                                <img
                                  src={attachedImg}
                                  alt="Adjunto"
                                  onClick={() => {
                                    setZoomImageUrl(attachedImg);
                                    setIsZoomOpen(true);
                                  }}
                                  className="max-h-28 rounded-lg border border-slate-200 dark:border-slate-700 cursor-zoom-in hover:opacity-90 transition object-cover"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Input de Comentarios */}
                <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 mt-3 space-y-2">
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Tu Nombre / Empresa"
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                  />

                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onPaste={handleCommentPaste}
                    placeholder="Escribe tu feedback o pega una imagen (Ctrl + V)..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none resize-none focus:ring-1 focus:ring-emerald-500"
                  />

                  {commentAttachedImg && (
                    <div className="relative inline-block border border-slate-300 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-800">
                      <img src={commentAttachedImg} alt="Adjunto" className="w-14 h-14 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => setCommentAttachedImg(null)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {commentSuccessMsg && (
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Comentario registrado con éxito!</span>
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
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Adjuntar imagen</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendComment}
                      disabled={isSendingComment || (!commentText.trim() && !commentAttachedImg)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSendingComment ? 'Enviando...' : 'Enviar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">No hay publicaciones en este mes.</div>
          )}

          {/* Footer Desktop (Image 4): < Anterior | Post X de Y | Siguiente > */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => handleSelectPost(currentPostIndex - 1)}
              disabled={currentPostIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <span className="text-slate-800 dark:text-slate-200 font-extrabold bg-slate-50 dark:bg-slate-800 px-5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs">
              Post <span className="text-indigo-600 dark:text-indigo-400">{currentPostIndex + 1}</span> de{' '}
              {posts.length}
            </span>

            <button
              type="button"
              onClick={() => handleSelectPost(currentPostIndex + 1)}
              disabled={currentPostIndex >= posts.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISTA RESPONSIVE / MÓVIL (Image 2): Pestañas, botones fijos y contenido */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex flex-col min-h-screen">
        {/* Header Superior Móvil */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-black text-slate-900 dark:text-white uppercase">
                {currentPost?.code || `POST ${String(currentPostIndex + 1).padStart(2, '0')}`}
              </span>

              {currentPost?.scheduledDate && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>{currentPost.scheduledDate}</span>
                </div>
              )}

              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isPublished
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                }`}
              >
                {isPublished ? 'PUBLICADO' : currentPost?.status?.toUpperCase() || 'BORRADOR'}
              </span>
            </div>

            {/* Acciones Móvil: Modo Oscuro + Grid Modal */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsPostSelectorOpen(true)}
                className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Ver todos los posts"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Segmented 3-Way Tabs Móvil (Exact Image 2) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 mt-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMobileTab('media')}
              className={`py-2 px-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileTab === 'media'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Multimedia</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab('copy')}
              className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer text-center leading-tight ${
                mobileTab === 'copy'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Copy / Descrip.</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab('comments')}
              className={`py-2 px-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileTab === 'comments'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Comentarios</span>
              {comments.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {comments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Contenido según pestaña móvil activa */}
        <div className="flex-1 p-4 pb-20">
          {currentPost ? (
            <>
              {/* PESTAÑA MULTIMEDIA (Exact Image 2) */}
              {mobileTab === 'media' && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
                    {/* Header Multimedia */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
                          MULTIMEDIA
                        </span>
                      </div>
                      {currentMediaUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setZoomImageUrl(currentMediaUrl);
                            setIsZoomOpen(true);
                          }}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>Clic para zoom</span>
                        </button>
                      )}
                    </div>

                    {/* Switcher Referencia | Post Terminado */}
                    <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setActiveMediaTab('ref')}
                        className={`py-2 rounded-lg transition-all ${
                          activeMediaTab === 'ref'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Referencia gráfica
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMediaTab('final')}
                        className={`py-2 rounded-lg transition-all ${
                          activeMediaTab === 'final'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Post Terminado
                      </button>
                    </div>

                    {/* Visor de Arte Móvil */}
                    <div
                      onClick={() => {
                        if (currentMediaUrl) {
                          setZoomImageUrl(currentMediaUrl);
                          setIsZoomOpen(true);
                        }
                      }}
                      className="flex items-center justify-center min-h-[300px] bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 p-2 overflow-hidden cursor-zoom-in"
                    >
                      <UniversalMediaEmbed
                        url={currentMediaUrl}
                        alt={currentPost.title}
                        className="w-full max-h-[440px]"
                      />
                    </div>
                  </div>

                  {/* Banner inferior de estado verde grande (Image 2) */}
                  <div className="w-full py-2.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-black text-center text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-2xs">
                    <Check className="w-4 h-4" />
                    <span>
                      {isPublished ? 'PUBLICADO' : currentPost.status?.toUpperCase() || 'BORRADOR'}
                    </span>
                  </div>
                </div>
              )}

              {/* PESTAÑA COPY / DESCRIPCIÓN */}
              {mobileTab === 'copy' && (
                <div className="space-y-4">
                  {/* Tarjeta Copy */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                      <div className="flex items-center gap-2">
                        <AlignLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
                          COPY DEL POST
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(currentPost.caption || currentPost.copy || '')}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        {copiedCopy ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCopy ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-normal">
                      {currentPost.caption || currentPost.copy || (
                        <span className="text-slate-400 italic">No hay copy registrado para esta publicación.</span>
                      )}
                    </div>
                  </div>

                  {/* Tarjeta Idea Creativa */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
                        IDEA / REFERENCIA CREATIVA
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
                      {currentPost.concept || currentPost.designerBrief || currentPost.notes || (
                        <span className="text-slate-400 italic">Sin especificaciones creativas adicionales.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA COMENTARIOS */}
              {mobileTab === 'comments' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
                        COMENTARIOS
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {comments.length} Mensajes
                    </span>
                  </div>

                  {/* Feed de Comentarios Móvil */}
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No hay comentarios registrados. Escribe tu comentario abajo.
                      </div>
                    ) : (
                      comments.map((comm) => {
                        const { text: cleanText, attachedImg } = parseCommentText(comm.text);
                        return (
                          <div
                            key={comm.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-800 dark:text-white">{comm.author}</span>
                              <span className="text-[10px] text-slate-400">
                                {comm.createdAt
                                  ? new Date(comm.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                            </div>
                            {cleanText && (
                              <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{cleanText}</p>
                            )}
                            {attachedImg && (
                              <div className="mt-2">
                                <img
                                  src={attachedImg}
                                  alt="Adjunto"
                                  onClick={() => {
                                    setZoomImageUrl(attachedImg);
                                    setIsZoomOpen(true);
                                  }}
                                  className="max-h-24 rounded-lg border border-slate-200 dark:border-slate-700 cursor-zoom-in object-cover"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Formulario para agregar comentario */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Tu Nombre / Empresa"
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none"
                    />

                    <textarea
                      rows={2}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onPaste={handleCommentPaste}
                      placeholder="Escribe tu feedback o pega una imagen..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none resize-none"
                    />

                    {commentAttachedImg && (
                      <div className="relative inline-block border border-slate-300 dark:border-slate-700 rounded-lg p-1 bg-white dark:bg-slate-800">
                        <img src={commentAttachedImg} alt="Adjunto" className="w-14 h-14 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => setCommentAttachedImg(null)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {commentSuccessMsg && (
                      <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Comentario enviado!</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => commentFileInputRef.current?.click()}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Adjuntar</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendComment}
                        disabled={isSendingComment || (!commentText.trim() && !commentAttachedImg)}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs disabled:opacity-40"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSendingComment ? 'Enviando...' : 'Enviar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs">No hay publicaciones.</div>
          )}
        </div>

        {/* Footer Móvil FIJO abajo (Exact Image 2) */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 p-3 px-4 flex items-center justify-between shadow-lg">
          <button
            type="button"
            onClick={() => handleSelectPost(currentPostIndex - 1)}
            disabled={currentPostIndex === 0}
            className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
            Post <span className="text-indigo-600 dark:text-indigo-400">{currentPostIndex + 1}</span> de{' '}
            {posts.length}
          </span>

          <button
            type="button"
            onClick={() => handleSelectPost(currentPostIndex + 1)}
            disabled={currentPostIndex >= posts.length - 1}
            className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE BÚSQUEDA RÁPIDA Y VISOR DE TODOS LOS POSTS (Exact Image 3) */}
      {/* ========================================================================= */}
      {isPostSelectorOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header Modal (Image 3) */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {data.project?.name || data.tenant?.name || 'Redes Sociales'} - {data.month.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span>{posts.length} publicaciones</span>
                    <span>•</span>
                    <span className="text-emerald-500 font-semibold">{data.month.status || 'Activo'}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPostSelectorOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Búsqueda Rápida (Image 3) */}
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={postSearchQuery}
                  onChange={(e) => setPostSearchQuery(e.target.value)}
                  placeholder="Buscar post por número, título o copy..."
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  autoFocus
                />
                {postSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPostSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Grilla de Publicaciones Filtradas (Image 3) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {filteredPosts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                  No se encontraron publicaciones con "{postSearchQuery}".
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {filteredPosts.map(({ post, originalIndex }) => {
                    const isSelected = originalIndex === currentPostIndex;
                    const thumbUrl = post.finalArtMediaUrl || post.referenceMediaUrl;

                    return (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => {
                          handleSelectPost(originalIndex);
                          setIsPostSelectorOpen(false);
                        }}
                        className={`group text-left rounded-2xl p-2.5 transition-all flex flex-col justify-between border cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                        }`}
                      >
                        {/* Miniatura */}
                        <div className="w-full aspect-square rounded-xl bg-slate-100 dark:bg-slate-900 overflow-hidden mb-2.5 relative border border-slate-100 dark:border-slate-800">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                              <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                              <span className="text-[10px]">Sin imagen</span>
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                              ✓
                            </div>
                          )}
                        </div>

                        {/* Título & Badge de Estado */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                              {post.code || `POST ${String(originalIndex + 1).padStart(2, '0')}`}
                            </span>
                          </div>
                          <span className="inline-block text-[9.5px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            {post.status === 'published' ? 'PUBLICADO' : post.status?.toUpperCase() || 'BORRADOR'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ZOOM / LIGHTBOX */}
      {/* ========================================================================= */}
      {isZoomOpen && (zoomImageUrl || currentMediaUrl) && (
        <div
          onClick={() => {
            setIsZoomOpen(false);
            setZoomImageUrl(null);
          }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
        >
          <button
            type="button"
            onClick={() => {
              setIsZoomOpen(false);
              setZoomImageUrl(null);
            }}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomImageUrl || currentMediaUrl || ''}
            alt="Zoom"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
