import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Bell,
  BellRing,
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

// Helper: Formatear estados al español
export const formatStatusSpanish = (status?: string): string => {
  if (!status) return 'Borrador';
  const s = status.toLowerCase().trim();
  switch (s) {
    case 'idea':
    case 'draft':
      return 'Borrador';
    case 'design':
      return 'En Diseño';
    case 'in_progress':
    case 'progress':
      return 'En Progreso';
    case 'review':
      return 'En Revisión';
    case 'client_approved':
    case 'approved':
      return 'Aprobado';
    case 'published':
      return 'Publicado';
    case 'archived':
      return 'Archivado';
    default:
      return status.replace(/_/g, ' ');
  }
};

// Helper: Estilos visuales del badge de estado
export const getStatusBadgeStyle = (status?: string) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'published') {
    return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800';
  }
  if (s === 'review') {
    return 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800';
  }
  if (s === 'client_approved' || s === 'approved') {
    return 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border-teal-300 dark:border-teal-800';
  }
  if (s === 'design' || s === 'in_progress') {
    return 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800';
  }
  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
};

// Chime de sonido nativo mediante Web Audio API (sin dependencias de archivos externos)
const playChimeSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // Re5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // La5
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.28);
  } catch {
    // Audio bloqueado antes de interacción del usuario
  }
};

export const PublicWorkspaceMonthView: React.FC<PublicWorkspaceMonthViewProps> = ({ token }) => {
  const [data, setData] = useState<PublicMonthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Seguridad por PIN
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Navegación de post
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState<'ref' | 'final'>('final');
  const [copiedCopy, setCopiedCopy] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Pestañas móviles: 'media' | 'copy' | 'comments'
  const [mobileTab, setMobileTab] = useState<'media' | 'copy' | 'comments'>('media');

  // Off-Canvas Drawer para Buscador Rápido de Posts
  const [isOffCanvasOpen, setIsOffCanvasOpen] = useState(false);
  const [postSearchQuery, setPostSearchQuery] = useState('');

  // Comentarios
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentAttachedImg, setCommentAttachedImg] = useState<string | null>(null);
  const [commentSuccessMsg, setCommentSuccessMsg] = useState(false);
  const commentFileInputRef = useRef<HTMLInputElement | null>(null);

  // Notificaciones en tiempo real
  const [liveToast, setLiveToast] = useState<{ title: string; message: string } | null>(null);
  const [notificationsGranted, setNotificationsGranted] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });
  const knownCommentIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Solicitar permiso de notificación del navegador
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotificationsGranted(true);
          playChimeSound();
        }
      } catch {
        // Ignorar si el usuario rechaza
      }
    }
  }, []);

  // Cargar datos iniciales
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

        // Inicializar IDs de comentarios conocidos
        const idSet = new Set<string>();
        json.posts?.forEach((p) => {
          p.comments?.forEach((c) => idSet.add(c.id));
        });
        knownCommentIdsRef.current = idSet;
        initialLoadDoneRef.current = true;

        // Comprobar PIN si es necesario
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

  // Sincronización de comentarios en TIEMPO REAL (Polling cada 3.5 segundos)
  useEffect(() => {
    if (!isUnlocked || !data) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/public/workspace/months/${encodeURIComponent(token)}`);
        if (!res.ok) return;
        const fresh: PublicMonthData = await res.json();

        // Detectar nuevos comentarios que no hayamos visto
        let hasNewComments = false;
        let latestNewComment: { author: string; text: string; postTitle?: string } | null = null;

        fresh.posts?.forEach((freshPost) => {
          freshPost.comments?.forEach((c) => {
            if (!knownCommentIdsRef.current.has(c.id)) {
              knownCommentIdsRef.current.add(c.id);
              hasNewComments = true;
              latestNewComment = {
                author: c.author,
                text: c.text,
                postTitle: freshPost.title || freshPost.code,
              };
            }
          });
        });

        if (hasNewComments && initialLoadDoneRef.current) {
          setData(fresh);
          playChimeSound();

          if (latestNewComment) {
            const commentObj = latestNewComment as { author: string; text: string; postTitle?: string };
            const cleanPreview = commentObj.text.replace(/\n?\[Imagen Adjunta\]:\s*\S+/, '').trim() || 'Adjuntó una imagen';
            const toastTitle = `💬 Nuevo comentario de ${commentObj.author}`;
            const toastBody = `En ${commentObj.postTitle || 'la publicación'}: "${cleanPreview.slice(0, 70)}${cleanPreview.length > 70 ? '...' : ''}"`;

            // Mostrar toast visual en pantalla
            setLiveToast({ title: toastTitle, message: toastBody });
            setTimeout(() => setLiveToast(null), 5000);

            // Mostrar notificación nativa del navegador
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(toastTitle, {
                  body: toastBody,
                  icon: data.tenant?.logoUrl || '/favicon.ico',
                });
              } catch {
                // Notificación bloqueada
              }
            }
          }
        }
      } catch {
        // Error silencioso en background polling
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [token, isUnlocked, data]);

  // Selección de post inicial mediante hash (#post-4) o query param (?post=4)
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

  // Auto-seleccionar 'Post Terminado' si existe, sino 'Referencia gráfica'
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
      // Ignorar en iframes
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

  // Enviar comentario (sin campo de autor visible: se envía 'Cliente' directamente)
  const handleSendComment = async () => {
    if (!commentText.trim() && !commentAttachedImg) return;
    if (!currentPost) return;

    try {
      setIsSendingComment(true);

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
            author: 'Cliente',
            text: fullComment,
          }),
        }
      );

      if (res.ok) {
        const result = await res.json();
        knownCommentIdsRef.current.add(result.comment.id);

        const updatedPosts = [...(data?.posts || [])];
        const targetPost = { ...updatedPosts[currentPostIndex] };
        targetPost.comments = [...(targetPost.comments || []), result.comment];
        updatedPosts[currentPostIndex] = targetPost;
        setData((prev) => (prev ? { ...prev, posts: updatedPosts } : null));

        setCommentText('');
        setCommentAttachedImg(null);
        setCommentSuccessMsg(true);
        setTimeout(() => setCommentSuccessMsg(false), 3000);

        // Pedir permiso para notificaciones si aún no está configurado
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          requestNotificationPermission();
        }
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

  // Pegar imagen directamente desde el portapapeles (Ctrl + V)
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

  // Helper para renderizar comentarios con imágenes adjuntas
  const parseCommentText = (raw: string) => {
    const match = raw.match(/\n?\[Imagen Adjunta\]:\s*(\S+)/);
    if (match) {
      const cleanText = raw.replace(/\n?\[Imagen Adjunta\]:\s*\S+/, '').trim();
      return { text: cleanText, attachedImg: match[1] };
    }
    return { text: raw, attachedImg: null };
  };

  // Filtrado de publicaciones para el Buscador Off-Canvas
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
        const statusSpan = formatStatusSpanish(post.status).toLowerCase();
        return (
          code.includes(q) ||
          title.includes(q) ||
          copy.includes(q) ||
          concept.includes(q) ||
          statusSpan.includes(q)
        );
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

  // Pantalla de bloqueo por PIN
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

  const statusLabel = formatStatusSpanish(currentPost?.status);
  const statusBadgeClass = getStatusBadgeStyle(currentPost?.status);

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-[#eef2f6] text-slate-800'
      } transition-colors flex flex-col font-sans`}
    >
      {/* Toast flotante de notificación en tiempo real */}
      {liveToast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/40 backdrop-blur-md animate-bounce">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-400 text-indigo-400 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-indigo-300">{liveToast.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-snug">{liveToast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA ESCRITORIO / PC: Contenedor amplio, elegante y adaptativo */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-1 flex-col w-full max-w-[1720px] 2xl:max-w-[1850px] mx-auto p-4 sm:p-6 lg:p-7">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs flex-1 flex flex-col justify-between">
          {/* Header Superior: POST 04 | Fecha de publicación: X | ESTADO EN ESPAÑOL */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800/80 mb-6">
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                {currentPost?.code || `POST ${String(currentPostIndex + 1).padStart(2, '0')}`}
              </span>

              {/* Badge de Fecha: "Fecha de publicación: [FECHA]" */}
              {currentPost?.scheduledDate && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>
                    Fecha de publicación:{' '}
                    <strong className="font-extrabold text-slate-900 dark:text-white">
                      {currentPost.scheduledDate}
                    </strong>
                  </span>
                </div>
              )}

              {/* Badge de Estado en ESPAÑOL */}
              <span
                className={`px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase border ${statusBadgeClass}`}
              >
                {statusLabel.toUpperCase()}
              </span>
            </div>

            {/* Acciones Header: Notificaciones, Modo Claro/Oscuro y Buscador Rápido Off-Canvas */}
            <div className="flex items-center gap-2">
              {!notificationsGranted && (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  title="Activar notificaciones en el navegador para nuevos comentarios"
                >
                  <Bell className="w-4 h-4" />
                  <span className="hidden xl:inline">Activar avisos</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Cambiar tema claro / oscuro"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Botón para abrir el Buscador Off-Canvas */}
              <button
                type="button"
                onClick={() => setIsOffCanvasOpen(true)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-2xs"
                title="Abrir buscador y panel de posts"
              >
                <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Todos los posts</span>
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

              {/* COLUMNA 3: COMENTARIOS EN TIEMPO REAL (Columna 3 de 12) */}
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

                  {/* Feed de Comentarios (Sincronizado en tiempo real) */}
                  <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
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

                {/* Input de Comentarios SIN el campo de nombre (Eliminado según Imagen 4) */}
                <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 mt-3 space-y-2">
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onPaste={handleCommentPaste}
                    placeholder="Escribe tu feedback o pega una imagen (Ctrl + V)..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none resize-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
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

          {/* Footer Desktop: < Anterior | Post X de Y | Siguiente > */}
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
      {/* VISTA RESPONSIVE / MÓVIL: Pestañas, botones fijos y contenido */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex flex-col min-h-screen">
        {/* Header Superior Móvil */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-black text-slate-900 dark:text-white uppercase">
                {currentPost?.code || `POST ${String(currentPostIndex + 1).padStart(2, '0')}`}
              </span>

              {/* Badge de Fecha Móvil */}
              {currentPost?.scheduledDate && (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Calendar className="w-3 h-3 text-indigo-500" />
                  <span>
                    Fecha de publicación: <strong>{currentPost.scheduledDate}</strong>
                  </span>
                </div>
              )}

              {/* Badge de Estado Móvil en ESPAÑOL */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadgeClass}`}
              >
                {statusLabel.toUpperCase()}
              </span>
            </div>

            {/* Acciones Móvil: Notificaciones, Modo Oscuro + Botón Off-Canvas */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!notificationsGranted && (
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40"
                  title="Activar notificaciones"
                >
                  <Bell className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOffCanvasOpen(true)}
                className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Abrir buscador de posts"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Segmented 3-Way Tabs Móvil */}
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
              {/* PESTAÑA MULTIMEDIA */}
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

                  {/* Banner inferior de estado en español */}
                  <div
                    className={`w-full py-2.5 rounded-full font-black text-center text-xs tracking-wider uppercase flex items-center justify-center gap-2 border shadow-2xs ${statusBadgeClass}`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{statusLabel.toUpperCase()}</span>
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

              {/* PESTAÑA COMENTARIOS EN TIEMPO REAL */}
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

                  {/* Formulario para agregar comentario (SIN campo de nombre según Imagen 4) */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
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

        {/* Footer Móvil FIJO abajo */}
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
      {/* OFF-CANVAS SIDEBAR: BUSCADOR RÁPIDO DE POSTS (Panel Deslizante Lateral) */}
      {/* ========================================================================= */}
      {isOffCanvasOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
          {/* Fondo oscuro traslúcido con clic para cerrar */}
          <div
            onClick={() => setIsOffCanvasOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
          />

          {/* Panel deslizante lateral desde la derecha (Off-Canvas auténtico) */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <div className="w-screen max-w-md sm:max-w-lg lg:max-w-xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
              {/* Header del Off-Canvas */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                      {data.project?.name || data.tenant?.name || 'Redes Sociales'} - {data.month.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                      <span>{posts.length} publicaciones</span>
                      <span>•</span>
                      <span className="text-emerald-500 font-bold capitalize">
                        {formatStatusSpanish(data.month.status)}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOffCanvasOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Cerrar panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de Búsqueda Rápida fija */}
              <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={postSearchQuery}
                    onChange={(e) => setPostSearchQuery(e.target.value)}
                    placeholder="Buscar post por número, título, copy o estado..."
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
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

              {/* Grilla Scrollable de Publicaciones */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/40 dark:bg-slate-950/20">
                {filteredPosts.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs font-semibold">
                    No se encontraron publicaciones que coincidan con "{postSearchQuery}".
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-3.5">
                    {filteredPosts.map(({ post, originalIndex }) => {
                      const isSelected = originalIndex === currentPostIndex;
                      const thumbUrl = post.finalArtMediaUrl || post.referenceMediaUrl;
                      const pStatusLabel = formatStatusSpanish(post.status);
                      const pBadgeStyle = getStatusBadgeStyle(post.status);

                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => {
                            handleSelectPost(originalIndex);
                            setIsOffCanvasOpen(false);
                          }}
                          className={`group text-left rounded-2xl p-2.5 transition-all flex flex-col justify-between border cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/40 dark:bg-indigo-950/40 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                          }`}
                        >
                          {/* Miniatura */}
                          <div className="w-full aspect-square rounded-xl bg-slate-100 dark:bg-slate-900 overflow-hidden mb-2 relative border border-slate-100 dark:border-slate-800">
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
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                                ✓
                              </div>
                            )}
                          </div>

                          {/* Título & Badge de Estado en Español */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-900 dark:text-white uppercase truncate">
                                {post.code || `POST ${String(originalIndex + 1).padStart(2, '0')}`}
                              </span>
                            </div>
                            <span
                              className={`inline-block text-[9.5px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border ${pBadgeStyle}`}
                            >
                              {pStatusLabel.toUpperCase()}
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
