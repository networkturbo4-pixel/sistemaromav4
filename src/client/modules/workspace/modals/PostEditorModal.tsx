import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  LayoutGrid,
  Lightbulb,
  PenTool,
  CheckCircle2,
  Send,
  Archive,
  Check,
  X,
  Sparkles,
  MessageSquare,
  ChevronDown,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Smile,
  Hash,
  RefreshCw,
  ImageIcon,
  Eye,
  UploadCloud,
  Trash2,
  Link as LinkIcon,
  ClipboardPaste,
  ArrowRight,
  ArrowLeft,
  Download,
  ShieldCheck,
  Layers,
  Plus,
  Zap,
  Target,
  Palette,
  Wand2,
  Loader2,
  Maximize2,
  Tv,
  Smartphone,
  AlertCircle,
  Eraser,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import {
  WorkspacePost,
  SocialPostPlatform,
  SocialPostStatus,
} from '../../../../shared/types';
import { applyUnicodeFormatToTextarea, stripHtmlToCleanText } from '../../../utils/textFormat';
import { SocialFeedMockup } from './components/SocialFeedMockup';

interface PostEditorModalProps {
  isOpen: boolean;
  editingPost: Partial<WorkspacePost> | null;
  setEditingPost: React.Dispatch<React.SetStateAction<Partial<WorkspacePost> | null>>;
  onClose: () => void;
  onSavePost: () => void;
  postModalTab: 'grid_idea' | 'design' | 'approval' | 'comments';
  setPostModalTab: (tab: 'grid_idea' | 'design' | 'approval' | 'comments') => void;
  tenant: { name: string; logoUrl?: string };
  toast: (msg: string, type?: 'info' | 'success' | 'error') => void;
  isUploadingRef: boolean;
  isUploadingFinalArt: boolean;
  handleUploadMediaFile: (file: File, target: 'reference' | 'finalArt') => Promise<void>;
  onOpenLightbox: (url: string) => void;
  onOpenPaintModal: () => void;
}

export const PostEditorModal: React.FC<PostEditorModalProps> = ({
  isOpen,
  editingPost,
  setEditingPost,
  onClose,
  onSavePost,
  postModalTab,
  setPostModalTab,
  tenant,
  toast,
  isUploadingRef,
  isUploadingFinalArt,
  handleUploadMediaFile,
  onOpenLightbox,
  onOpenPaintModal,
}) => {
  const [commentsSubTab, setCommentsSubTab] = useState<'idea' | 'design'>('idea');
  const [previewTarget, setPreviewTarget] = useState<'final' | 'reference'>('final');
  const [isDraggingRef, setIsDraggingRef] = useState(false);
  const [isDraggingFinal, setIsDraggingFinal] = useState(false);
  const [romitaDropdownOpen, setRomitaDropdownOpen] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [rightColumnView, setRightColumnView] = useState<'reference' | 'social_preview'>('reference');
  const [feedPreviewPlatform, setFeedPreviewPlatform] = useState<'instagram' | 'facebook' | 'tiktok' | 'x'>('instagram');
  const [refImageError, setRefImageError] = useState(false);
  const [finalArtImageError, setFinalArtImageError] = useState(false);
  const [copyViewMode, setCopyViewMode] = useState<'edit' | 'preview'>('edit');
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);
  const [aiGenerationLabel, setAiGenerationLabel] = useState('');

  const { apiFetch } = useApp();

  useEffect(() => {
    if (isOpen && editingPost) {
      setRefImageError(false);
      setFinalArtImageError(false);
      let needsUpdate = false;
      let cleanCopy = editingPost.copy;
      let cleanBrief = editingPost.designerBrief;

      if (
        editingPost.copy &&
        (/<[a-z!][\s\S]*>/i.test(editingPost.copy) ||
          editingPost.copy.includes('data-path-to-node') ||
          editingPost.copy.includes('rn<'))
      ) {
        cleanCopy = stripHtmlToCleanText(editingPost.copy);
        needsUpdate = true;
      }
      if (
        editingPost.designerBrief &&
        (/<[a-z!][\s\S]*>/i.test(editingPost.designerBrief) ||
          editingPost.designerBrief.includes('data-path-to-node') ||
          editingPost.designerBrief.includes('rn<'))
      ) {
        cleanBrief = stripHtmlToCleanText(editingPost.designerBrief);
        needsUpdate = true;
      }

      if (needsUpdate) {
        setEditingPost((prev) =>
          prev ? { ...prev, copy: cleanCopy, designerBrief: cleanBrief } : null
        );
      }
    }
  }, [isOpen, editingPost?.id]);

  // Sincronización en tiempo real de comentarios en la modal del editor
  const knownEditorCommentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !editingPost?.id) return;

    // Inicializar IDs conocidos
    const idSet = new Set<string>();
    editingPost.comments?.forEach((c) => idSet.add(c.id));
    knownEditorCommentIdsRef.current = idSet;

    const interval = setInterval(async () => {
      try {
        const json = await apiFetch<{ post: any }>(`/api/workspace/posts/${editingPost.id}`).catch(() => null);
        if (!json || !json.post) return;
        const freshPost = json.post;
        if (!Array.isArray(freshPost.comments)) return;

        let hasNewComments = false;
        let latestComment: any = null;

        freshPost.comments.forEach((c: any) => {
          if (!knownEditorCommentIdsRef.current.has(c.id)) {
            knownEditorCommentIdsRef.current.add(c.id);
            hasNewComments = true;
            latestComment = c;
          }
        });

        if (hasNewComments) {
          setEditingPost((prev) => (prev ? { ...prev, comments: freshPost.comments } : null));

          // Chime de audio
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.28);
          } catch {}

          if (latestComment) {
            toast(`💬 Nuevo comentario de ${latestComment.author}`, 'info');

            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`💬 Nuevo comentario de ${latestComment.author}`, {
                  body: latestComment.text.replace(/\n?\[Imagen Adjunta\]:\s*\S+/, '').slice(0, 80),
                  icon: '/favicon.ico',
                });
              } catch {}
            }
          }
        }
      } catch {
        // Polling silencioso
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, editingPost?.id]);

  const STATUS_LIST: {
    id: SocialPostStatus;
    label: string;
    icon: React.ElementType;
    color: string;
    badge: string;
    desc: string;
  }[] = [
    {
      id: 'idea',
      label: '1. Idea / Borrador',
      icon: Lightbulb,
      color: 'text-amber-500',
      badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      desc: 'Concepto y copy en desarrollo',
    },
    {
      id: 'design',
      label: '2. En Diseño',
      icon: PenTool,
      color: 'text-indigo-500',
      badge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      desc: 'Producción gráfica en proceso',
    },
    {
      id: 'approved',
      label: '3. Aprobado Cliente',
      icon: CheckCircle2,
      color: 'text-emerald-500',
      badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      desc: 'Validado por el cliente',
    },
    {
      id: 'published',
      label: '4. Publicado',
      icon: Send,
      color: 'text-sky-500',
      badge: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      desc: 'En vivo en redes sociales',
    },
    {
      id: 'archived',
      label: 'Archivado',
      icon: Archive,
      color: 'text-slate-500',
      badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      desc: 'Guardado en histórico',
    },
  ];

  const currentStatusObj =
    STATUS_LIST.find((s) => s.id === (editingPost?.status || 'idea')) || STATUS_LIST[0];
  const CurrentStatusIcon = currentStatusObj.icon;

  const hasHtmlInCopy = /<[a-z][\s\S]*>/i.test(editingPost?.copy || '');

  const handleCleanCopyHtml = () => {
    if (!editingPost?.copy) return;
    const cleaned = stripHtmlToCleanText(editingPost.copy);
    setEditingPost((prev) => (prev ? { ...prev, copy: cleaned } : null));
    toast('Texto limpio de etiquetas HTML', 'success');
  };

  const getPlatformCharLimit = () => {
    const plats = editingPost?.platforms || [];
    if (plats.includes('x' as any)) return { name: 'X (Twitter)', limit: 280, strict: true };
    if (plats.includes('instagram' as any)) return { name: 'Instagram', limit: 2200, strict: false };
    if (plats.includes('tiktok' as any)) return { name: 'TikTok', limit: 2200, strict: false };
    if (plats.includes('linkedin' as any)) return { name: 'LinkedIn', limit: 3000, strict: false };
    return { name: 'Estándar', limit: 5000, strict: false };
  };

  const referenceFileInputRef = useRef<HTMLInputElement | null>(null);
  const finalArtFileInputRef = useRef<HTMLInputElement | null>(null);
  const milestoneFileInputRef = useRef<HTMLInputElement | null>(null);
  const copyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const briefTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  if (!isOpen || !editingPost) return null;

  const handleClipboardPaste = (e: React.ClipboardEvent) => {
    if (!e.clipboardData || !e.clipboardData.files || e.clipboardData.files.length === 0) return;
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      const target = postModalTab === 'grid_idea' ? 'reference' : 'finalArt';
      handleUploadMediaFile(file, target);
    }
  };

  const handleMilestoneFileUpload = (file?: File) => {
    if (!file || !activeMilestoneId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const updated = (editingPost?.milestones || []).map((m) => {
        if (m.id === activeMilestoneId) {
          const currentAtts = m.attachments || [];
          return {
            ...m,
            attachments: [...currentAtts, { name: file.name, url: dataUrl }],
          };
        }
        return m;
      });
      setEditingPost((prev) => (prev ? { ...prev, milestones: updated } : null));
      toast('Imagen adjuntada al avance', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleMilestonePaste = (e: React.ClipboardEvent, milestoneId: string) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            const updated = (editingPost?.milestones || []).map((m) => {
              if (m.id === milestoneId) {
                const currentAtts = m.attachments || [];
                return {
                  ...m,
                  attachments: [...currentAtts, { name: file.name || 'captura.png', url: dataUrl }],
                };
              }
              return m;
            });
            setEditingPost((prev) => (prev ? { ...prev, milestones: updated } : null));
            toast('Captura pegada en el avance', 'success');
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const removeMilestoneAttachment = (milestoneId: string, attIndex: number) => {
    const updated = (editingPost?.milestones || []).map((m) => {
      if (m.id === milestoneId) {
        const currentAtts = [...(m.attachments || [])];
        currentAtts.splice(attIndex, 1);
        return { ...m, attachments: currentAtts };
      }
      return m;
    });
    setEditingPost((prev) => (prev ? { ...prev, milestones: updated } : null));
  };

  const handleRomitaAIGenerate = async (mode: 'full' | 'hook' | 'cta' | 'aida' | 'brief' | 'improve') => {
    if (isGeneratingWithAI) return;
    setRomitaDropdownOpen(false);
    setIsGeneratingWithAI(true);

    const labels: Record<string, string> = {
      full: 'Copy Completo',
      hook: 'Ganchos Virales',
      cta: 'Llamados a la Acción',
      aida: 'Estructura AIDA',
      brief: 'Brief Creativo',
      improve: 'Mejora de Copy',
    };
    setAiGenerationLabel(labels[mode] || 'Copy Inteligente');

    try {
      const res = await apiFetch<{
        success: boolean;
        text: string;
        modelUsed?: string;
      }>('/api/romita/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingPost?.title || '',
          brandName: editingPost?.brandName || editingPost?.clientName || '',
          contentPillar: editingPost?.contentPillar || 'General',
          platforms: editingPost?.platforms || ['instagram'],
          existingCopy: editingPost?.copy || '',
          mode,
        }),
      });

      if (res?.text) {
        if (mode === 'brief') {
          // Si el usuario pidió brief creativo, lo volcamos en el campo de brief para diseñador
          setEditingPost((prev) => (prev ? { ...prev, designerBrief: res.text } : null));
          toast('Brief para diseñador generado por Romita IA', 'success');
        } else if (mode === 'hook' || mode === 'cta') {
          // Si es hook o cta, lo anexamos de forma limpia
          setEditingPost((prev) => {
            if (!prev) return null;
            const current = prev.copy || '';
            return {
              ...prev,
              copy: current ? `${res.text}\n\n${current}` : res.text,
            };
          });
          toast(`Opciones generadas con éxito por Romita IA`, 'success');
        } else {
          // Modo full o aida o improve: actualiza el copy
          setEditingPost((prev) => (prev ? { ...prev, copy: res.text } : null));
          toast('Copy inteligente redactado con Romita IA', 'success');
        }
      }
    } catch (err: any) {
      toast(err.message || 'Error al generar texto con IA', 'error');
    } finally {
      setIsGeneratingWithAI(false);
      setAiGenerationLabel('');
    }
  };

  const applyTextFormat = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    fieldName: 'copy' | 'designerBrief',
    format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'bullet' | 'number'
  ) => {
    const el = ref.current;
    if (!el) return;
    const currentVal = (editingPost?.[fieldName] as string) || '';
    applyUnicodeFormatToTextarea(el, format, currentVal, (newVal) => {
      setEditingPost((prev) => (prev ? { ...prev, [fieldName]: newVal } : null));
    });
  };

  const applyFormatToTextarea = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    fieldName: 'copy' | 'designerBrief',
    prefix: string,
    suffix: string = prefix,
    defaultPlaceholder: string = 'texto'
  ) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = (editingPost?.[fieldName] as string) || '';
    const selected = currentVal.substring(start, end);
    const middle = selected || defaultPlaceholder;
    const replacement = `${prefix}${middle}${suffix}`;
    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    setEditingPost((prev) => (prev ? { ...prev, [fieldName]: nextVal } : null));

    setTimeout(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
      } else {
        el.setSelectionRange(
          start + prefix.length,
          start + prefix.length + defaultPlaceholder.length
        );
      }
    }, 40);
  };

  return (
    <div
      onPaste={handleClipboardPaste}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-[98vw] 2xl:max-w-[1580px] h-[94vh] shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* 1. CABECERA SUPERIOR DEL MODAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingPost.id ? 'Editar Publicación' : 'Añadir Publicación'}
                </h3>
                {editingPost.id && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold">
                    #{editingPost.id.toString().slice(-4)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {editingPost.brandName || tenant.name} • {editingPost.contentPillar || 'Contenido General'}
              </p>
            </div>
          </div>

          {/* Acciones y Selector de Estado */}
          <div className="flex items-center gap-2.5">
            {/* Dropdown de Estado Unificado */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className={`px-3.5 py-2 rounded-2xl border font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs ${currentStatusObj.badge}`}
              >
                <CurrentStatusIcon className={`w-4 h-4 ${currentStatusObj.color}`} />
                <span>{currentStatusObj.label}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>

              {statusDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 z-40 space-y-1 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Cambiar Estado de la Publicación
                  </div>
                  {STATUS_LIST.map((step) => {
                    const StepIcon = step.icon;
                    const isSelected = (editingPost.status || 'idea') === step.id;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          setEditingPost({
                            ...editingPost,
                            status: step.id,
                            clientApprovalStatus: step.id as any,
                          });
                          setStatusDropdownOpen(false);
                          toast(`Estado cambiado a: ${step.label}`, 'info');
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${step.badge}`}>
                            <StepIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-extrabold text-[11px] leading-tight">{step.label}</p>
                            <p className="text-[10px] text-slate-400 font-normal leading-tight">{step.desc}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Botón Guardar */}
            <button
              type="button"
              onClick={onSavePost}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. PESTAÑAS HORIZONTALES SUPERIORES (RESPONSIVE TOUCH SCROLL) */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'grid_idea', label: '1. Grilla / Idea', icon: Sparkles },
            { id: 'design', label: '2. Diseño de Calendario', icon: PenTool },
            { id: 'approval', label: '3. Aprobación & Publicación', icon: CheckCircle2 },
            {
              id: 'comments',
              label: '4. Comentarios',
              icon: MessageSquare,
              count: editingPost.comments?.length || 0,
            },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isCurrent = postModalTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPostModalTab(tab.id as any)}
                className={`pb-3 px-3 font-extrabold text-xs flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isCurrent
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center justify-center font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. CONTENIDO PRINCIPAL: SIDEBAR IZQUIERDO PERSISTENTE + PANEL DE CONTENIDO (100% RESPONSIVE) */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
          {/* SIDEBAR IZQUIERDO PERSISTENTE */}
          <div className="w-full lg:w-72 2xl:w-80 p-4 sm:p-5 overflow-y-visible lg:overflow-y-auto space-y-4 sm:space-y-5 bg-white dark:bg-slate-900 shrink-0">
            {/* Concepto / Título */}
            <div className="space-y-1.5">
              <label className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                <span>Concepto / Título</span>
                <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Promoción Especial de Fin de Semana"
                value={editingPost.title || ''}
                onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Pilar de Contenido */}
            <div className="space-y-1.5">
              <label className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                <span>Pilar de Contenido</span>
                <span className="text-pink-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Educación',
                  'Ventas',
                  'Branding',
                  'Entretenimiento',
                  'Comunidad',
                  'Testimonial',
                ].map((pillar) => {
                  const isSelected = (editingPost.contentPillar || 'Educación') === pillar;
                  return (
                    <button
                      key={pillar}
                      type="button"
                      onClick={() => setEditingPost({ ...editingPost, contentPillar: pillar })}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                      <span>{pillar}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plataformas */}
            <div className="space-y-1.5">
              <label className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                <span>Plataformas de Difusión</span>
                <span className="text-pink-500">*</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  {
                    key: 'facebook',
                    label: 'FB',
                    name: 'Facebook',
                    activeStyle: 'bg-[#1877F2] border-[#1877F2] text-white shadow-xs',
                  },
                  {
                    key: 'instagram',
                    label: 'IG',
                    name: 'Instagram',
                    activeStyle:
                      'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 border-rose-500 text-white shadow-xs',
                  },
                  {
                    key: 'tiktok',
                    label: 'TT',
                    name: 'TikTok',
                    activeStyle:
                      'bg-black dark:bg-slate-950 border-slate-700 text-white shadow-xs ring-1 ring-pink-500/40',
                  },
                  {
                    key: 'linkedin',
                    label: 'IN',
                    name: 'LinkedIn',
                    activeStyle: 'bg-[#0A66C2] border-[#0A66C2] text-white shadow-xs',
                  },
                  {
                    key: 'x',
                    label: '𝕏',
                    name: 'X / Twitter',
                    activeStyle: 'bg-slate-950 border-slate-900 text-white shadow-xs',
                  },
                ].map((plat) => {
                  const isSelected = editingPost.platforms?.includes(plat.key as any);
                  return (
                    <button
                      key={plat.key}
                      type="button"
                      title={plat.name}
                      onClick={() => {
                        const cur = editingPost.platforms || [];
                        const next = isSelected
                          ? cur.filter((p) => p !== plat.key)
                          : [...cur, plat.key as SocialPostPlatform];
                        setEditingPost({ ...editingPost, platforms: next });
                      }}
                      className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                        isSelected
                          ? plat.activeStyle
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100'
                      }`}
                    >
                      {plat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fechas y Cronómetro */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400">
                  PROGRAMACIÓN & FECHAS
                </label>
                {editingPost.initialDate && (
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 font-semibold">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{editingPost.initialDate}</span>
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Fecha Límite / Entrega
                </span>
                <input
                  type="date"
                  value={editingPost.deliveryDate || editingPost.scheduledDate || ''}
                  onChange={(e) =>
                    setEditingPost({
                      ...editingPost,
                      deliveryDate: e.target.value,
                      scheduledDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Periodicidad
                  </span>
                  <select
                    value={editingPost.periodicity || 'Única vez'}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, periodicity: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold"
                  >
                    <option value="Única vez">Única vez</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Mensual">Mensual</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Recordatorio
                  </span>
                  <select
                    value={editingPost.reminder || 'Ninguno'}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, reminder: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold"
                  >
                    <option value="Ninguno">Ninguno</option>
                    <option value="1 hora antes">1 hora antes</option>
                    <option value="1 día antes">1 día antes</option>
                    <option value="2 días antes">2 días antes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* PANEL CENTRAL PRINCIPAL (RESPONSIVE EN MÓVILES) */}
          <div className="flex-1 overflow-y-visible lg:overflow-y-auto p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 bg-slate-50/40 dark:bg-slate-900/40">
            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 1: GRILLA / IDEA */}
            {/* ------------------------------------------------------------- */}
            {postModalTab === 'grid_idea' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Columna Centro: Copy + Brief */}
                  <div className="xl:col-span-8 space-y-5">
                    {/* Copy del Post */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <label className="font-extrabold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <span>Copy de la Publicación</span>
                            <span className="text-pink-500">*</span>
                          </label>

                          {/* Switcher: Editor / Vista Previa Formateada */}
                          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => setCopyViewMode('edit')}
                              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                copyViewMode === 'edit'
                                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                              }`}
                            >
                              ✏️ Editor
                            </button>
                            <button
                              type="button"
                              onClick={() => setCopyViewMode('preview')}
                              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                                copyViewMode === 'preview'
                                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                              }`}
                            >
                              👁️ Vista Previa Formateada
                            </button>
                          </div>
                        </div>

                        {/* Botón y Menú Romita IA */}
                        <div className="relative">
                          <button
                            type="button"
                            disabled={isGeneratingWithAI}
                            onClick={() => setRomitaDropdownOpen(!romitaDropdownOpen)}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-80 disabled:cursor-wait text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            {isGeneratingWithAI ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Redactando con Romita...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Hacer con Romita</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>

                          {romitaDropdownOpen && !isGeneratingWithAI && (
                            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-30 space-y-1 animate-in fade-in">
                              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Redacción con IA de Romita
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRomitaAIGenerate('full')}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-start gap-2.5 cursor-pointer"
                              >
                                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-bold">Redactar Copy Completo</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Gancho + Valor + CTA + 5 Hashtags</div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRomitaAIGenerate('hook')}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-pink-50 dark:hover:bg-pink-950/50 hover:text-pink-600 dark:hover:text-pink-400 transition flex items-start gap-2.5 cursor-pointer"
                              >
                                <Zap className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-bold">3 Ganchos Virales (Hooks)</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Detener el scroll en los primeros 2 seg.</div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRomitaAIGenerate('aida')}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:text-purple-600 dark:hover:text-purple-400 transition flex items-start gap-2.5 cursor-pointer"
                              >
                                <Target className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-bold">Estructura AIDA para Ventas</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Atención, Interés, Deseo y Acción</div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRomitaAIGenerate('cta')}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-600 dark:hover:text-sky-400 transition flex items-start gap-2.5 cursor-pointer"
                              >
                                <Send className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-bold">Llamados a la Acción (CTAs)</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Para DMs, enlace en bio o compras</div>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRomitaAIGenerate('brief')}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-600 dark:hover:text-amber-400 transition flex items-start gap-2.5 cursor-pointer"
                              >
                                <Palette className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-bold">Generar Brief para Diseñador</div>
                                  <div className="text-[10px] text-slate-400 font-normal">Rellena las indicaciones del arte visual</div>
                                </div>
                              </button>

                              {editingPost?.copy && (
                                <button
                                  type="button"
                                  onClick={() => handleRomitaAIGenerate('improve')}
                                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-start gap-2.5 cursor-pointer"
                                >
                                  <Wand2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-bold">Mejorar Copy Actual</div>
                                    <div className="text-[10px] text-slate-400 font-normal">Optimizar persuasión y fluidez</div>
                                  </div>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Alerta de detección de HTML */}
                      {hasHtmlInCopy && (
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="font-medium text-[11px]">
                              Detectamos etiquetas HTML en el texto. Puedes limpiarlo con un clic manteniendo emojis y saltos de línea.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCleanCopyHtml}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Eraser className="w-3.5 h-3.5" />
                            <span>Limpiar HTML</span>
                          </button>
                        </div>
                      )}

                      {/* Mini Toolbar */}
                      <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400">
                        <button
                          type="button"
                          onClick={() => {}}
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                          title="Deshacer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {}}
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                          title="Rehacer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button
                          type="button"
                          onClick={() => applyTextFormat(copyTextareaRef, 'copy', 'bold')}
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                          title="Negrita normal (Sin asteriscos)"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTextFormat(copyTextareaRef, 'copy', 'italic')}
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                          title="Cursiva normal (Sin guiones)"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTextFormat(copyTextareaRef, 'copy', 'underline')}
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                          title="Subrayado"
                        >
                          <Underline className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button
                          type="button"
                          onClick={() => applyTextFormat(copyTextareaRef, 'copy', 'bullet')}
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                          title="Lista con viñetas"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTextFormat(copyTextareaRef, 'copy', 'number')}
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                          title="Lista numerada"
                        >
                          <ListOrdered className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            applyFormatToTextarea(
                              copyTextareaRef,
                              'copy',
                              '✨ ',
                              '',
                              ''
                            )
                          }
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                          title="Emoji"
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button
                          type="button"
                          onClick={handleCleanCopyHtml}
                          className="p-1.5 hover:text-amber-600 rounded-lg transition"
                          title="Limpiar etiquetas HTML del copy"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isGeneratingWithAI ? (
                        <div className="w-full min-h-[175px] p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col justify-between animate-pulse">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                Romita IA redactando ({aiGenerationLabel})...
                              </span>
                            </div>
                            <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-full" />
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-5/6" />
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-4/5" />
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-2/3" />
                          </div>
                          <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            <span>Estructurando ganchos, llamada a la acción y contenido persuasivo...</span>
                            <span className="font-mono text-xs">● ● ●</span>
                          </div>
                        </div>
                      ) : copyViewMode === 'edit' ? (
                        <textarea
                          ref={copyTextareaRef}
                          rows={7}
                          placeholder="Escribe el texto de la publicación..."
                          value={editingPost.copy || ''}
                          onPaste={(e) => {
                            const html = e.clipboardData?.getData('text/html');
                            if (html && (html.includes('<p') || html.includes('<strong') || html.includes('<div') || html.includes('<span') || html.includes('data-path-to-node'))) {
                              e.preventDefault();
                              const cleaned = stripHtmlToCleanText(html);
                              const el = copyTextareaRef.current;
                              if (!el) return;
                              const start = el.selectionStart;
                              const end = el.selectionEnd;
                              const cur = editingPost.copy || '';
                              const next = cur.substring(0, start) + cleaned + cur.substring(end);
                              setEditingPost({ ...editingPost, copy: next });
                              toast('Texto pegado y limpiado automáticamente', 'success');
                            }
                          }}
                          onChange={(e) =>
                            setEditingPost({ ...editingPost, copy: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      ) : (
                        <div className="w-full min-h-[170px] max-h-[320px] overflow-y-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap font-sans">
                          {editingPost.copy ? (
                            stripHtmlToCleanText(editingPost.copy)
                          ) : (
                            <span className="text-slate-400 italic">Sin texto de copy redactado aún.</span>
                          )}
                        </div>
                      )}

                      {/* Contador de caracteres inteligente con límite por red */}
                      {(() => {
                        const limitInfo = getPlatformCharLimit();
                        const currentLen = (editingPost.copy || '').length;
                        const isOverLimit = limitInfo.limit && currentLen > limitInfo.limit;
                        const percentage = Math.min(100, Math.round((currentLen / limitInfo.limit) * 100));

                        return (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] pt-1">
                            <span className="flex items-center gap-1.5 text-indigo-500 font-semibold">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Usa Romita IA para estructurar ganchos y CTAs</span>
                            </span>

                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isOverLimit
                                      ? 'bg-rose-500'
                                      : percentage > 85
                                      ? 'bg-amber-500'
                                      : 'bg-indigo-600'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span
                                className={`font-mono text-[10px] font-bold ${
                                  isOverLimit ? 'text-rose-500' : 'text-slate-400'
                                }`}
                              >
                                {currentLen.toLocaleString()} / {limitInfo.limit.toLocaleString()} car. ({limitInfo.name})
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Indicaciones / Brief Creativo para el Diseñador */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="font-extrabold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
                          Indicaciones / Brief Creativo para el Diseñador
                        </label>
                        <span className="text-[10px] text-slate-400">
                          Composición, colores y lineamientos
                        </span>
                      </div>

                      {/* Mini Toolbar */}
                      <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400">
                        <button
                          type="button"
                          onClick={() => {}}
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {}}
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                        <button
                          type="button"
                          onClick={() => applyTextFormat(briefTextareaRef, 'designerBrief', 'bold')}
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                          title="Negrita normal (Sin asteriscos)"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTextFormat(briefTextareaRef, 'designerBrief', 'bullet')}
                          className="p-1.5 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
                          title="Lista con viñetas"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        ref={briefTextareaRef}
                        rows={4}
                        placeholder="Describe qué quieres transmitir, ideas de composición, colores, textos para el diseño o enfoque..."
                        value={editingPost.designerBrief || ''}
                        onChange={(e) =>
                          setEditingPost({ ...editingPost, designerBrief: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Columna Derecha: Referencia Visual / Boceto O Vista Previa Feed */}
                  <div className="xl:col-span-4 space-y-4">
                    {/* Switcher Superior entre Referencia y Vista Previa Social */}
                    <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setRightColumnView('reference')}
                        className={`flex-1 py-1.5 px-3 rounded-xl font-extrabold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          rightColumnView === 'reference'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Referencia / Boceto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRightColumnView('social_preview')}
                        className={`flex-1 py-1.5 px-3 rounded-xl font-extrabold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          rightColumnView === 'social_preview'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Vista Previa Red</span>
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                      </button>
                    </div>

                    {/* VISTA 1: REFERENCIA VISUAL */}
                    {rightColumnView === 'reference' && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <label className="font-extrabold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-200">
                                REFERENCIA VISUAL / BOCETO
                              </label>
                              <span className="text-[10px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md">
                                Fase 1: Idea
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                              Sube imágenes de inspiración, bocetos o enlaces para orientar al diseñador.
                            </p>
                          </div>
                        </div>

                        {/* Card Dropzone de Referencia con Soporte Drag & Drop */}
                        <div
                          onClick={() => referenceFileInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingRef(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDraggingRef(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingRef(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleUploadMediaFile(file, 'reference');
                          }}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer relative group flex flex-col items-center justify-center min-h-[200px] ${
                            isDraggingRef
                              ? 'border-amber-500 bg-amber-100/60 dark:bg-amber-900/40 ring-4 ring-amber-400/20 scale-[1.01]'
                              : 'border-amber-200 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-600 bg-amber-50/30 dark:bg-amber-950/20'
                          }`}
                        >
                          <input
                            type="file"
                            ref={referenceFileInputRef}
                            accept="image/*,video/mp4"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setRefImageError(false);
                                handleUploadMediaFile(file, 'reference');
                              }
                            }}
                          />

                          <span className="absolute top-3 left-3 text-[10px] font-black bg-amber-500 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                            ● Referencia
                          </span>

                          {isUploadingRef ? (
                            <div className="space-y-2 py-6">
                              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                Subiendo a Google Drive /REFERENCIAS...
                              </p>
                            </div>
                          ) : editingPost.referenceMediaUrl ? (
                            <div className="w-full space-y-2">
                              {!refImageError ? (
                                <div className="relative mx-auto max-w-[200px] max-h-[160px] overflow-hidden rounded-xl border border-amber-300 dark:border-amber-800 shadow-xs">
                                  <img
                                    src={editingPost.referenceMediaUrl}
                                    alt="Referencia"
                                    onError={() => setRefImageError(true)}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="p-3 rounded-xl bg-amber-100/60 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-center space-y-1">
                                  <ImageIcon className="w-6 h-6 text-amber-600 mx-auto" />
                                  <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                                    No se pudo mostrar la miniatura
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    Haz clic en &quot;Ver&quot; para abrir el archivo o vuelve a subirlo
                                  </p>
                                </div>
                              )}
                              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[220px] mx-auto">
                                {editingPost.referenceMediaName || 'Referencia cargada'}
                              </p>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                                <Check className="w-3 h-3" />
                                <span>Guardado en /REFERENCIAS</span>
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-2 py-4">
                              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                              <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                                Arrastra tu referencia o haz clic para subir
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Soporta JPG, PNG, WEBP, MP4 o pega con <strong>Ctrl + V</strong>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Acciones de Referencia */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (editingPost.referenceMediaUrl) {
                                onOpenLightbox(editingPost.referenceMediaUrl);
                              } else {
                                toast('No hay referencia subida para ver', 'info');
                              }
                            }}
                            className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => referenceFileInputRef.current?.click()}
                            className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Subir Ref.</span>
                          </button>
                          <button
                            type="button"
                            onClick={onOpenPaintModal}
                            className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Abrir pizarra tipo Paint para dibujar o anotar sobre el boceto"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Dibujar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingPost({
                                ...editingPost,
                                referenceMediaUrl: '',
                                referenceMediaName: '',
                                referenceMediaDriveId: '',
                              })
                            }
                            className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>

                        {/* Enlace Externo de Referencia */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <label className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" />
                            <span>ENLACE EXTERNO DE REFERENCIA</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="url"
                              placeholder="Pinterest, TikTok, Instagram, Drive o URL"
                              value={editingPost.referenceExternalLink || ''}
                              onChange={(e) =>
                                setEditingPost({
                                  ...editingPost,
                                  referenceExternalLink: e.target.value,
                                })
                              }
                              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const text = await navigator.clipboard.readText();
                                  if (text) {
                                    setEditingPost({
                                      ...editingPost,
                                      referenceExternalLink: text,
                                    });
                                    toast('Enlace pegado del portapapeles', 'success');
                                  }
                                } catch {
                                  toast('No se pudo acceder al portapapeles', 'info');
                                }
                              }}
                              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] transition flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <ClipboardPaste className="w-3.5 h-3.5" />
                              <span>Pegar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPost({ ...editingPost, referenceExternalLink: '' })
                              }
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VISTA 2: VISTA PREVIA DE RED SOCIAL (SIMULADOR EN VIVO) */}
                    {rightColumnView === 'social_preview' && (
                      <div className="bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between px-1">
                          <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Simulador de Feed en Vivo</span>
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            ● Tiempo Real
                          </span>
                        </div>

                        <SocialFeedMockup
                          post={editingPost}
                          tenant={tenant}
                          activePlatform={feedPreviewPlatform}
                          setActivePlatform={setFeedPreviewPlatform}
                          onOpenLightbox={onOpenLightbox}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Banner Inferior: ¿Idea y copy listos? Avanza a la pestaña de diseño */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200">
                        ¿Idea y copy listos?
                      </p>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                        Avanza a la pestaña de diseño para subir el arte final o gestionar los hitos.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPostModalTab('design')}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
                  >
                    <span>Pasar a Diseño</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 2: DISEÑO DE CALENDARIO */}
            {/* ------------------------------------------------------------- */}
            {postModalTab === 'design' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Columna Izquierda: Arte Final Terminado + Control de Calidad */}
                  <div className="xl:col-span-6 space-y-5">
                    {/* Arte Final Terminado (Sincronizado en Google Drive: /POST TERMINADOS) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-white">
                            ARTE FINAL TERMINADO
                          </label>
                          <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
                            Fase 2: Diseño
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Sube la pieza gráfica final aprobada por el equipo (1:1, 4:5, 9:16, carrusel o video)
                      </p>

                      {/* Dropzone de Arte Final con Soporte Drag & Drop */}
                      <div
                        onClick={() => finalArtFileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFinal(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setIsDraggingFinal(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFinal(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleUploadMediaFile(file, 'finalArt');
                        }}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer relative flex flex-col items-center justify-center min-h-[220px] ${
                          isDraggingFinal
                            ? 'border-indigo-600 bg-indigo-100/60 dark:bg-indigo-900/40 ring-4 ring-indigo-400/20 scale-[1.01]'
                            : 'border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                        }`}
                      >
                        <input
                          type="file"
                          ref={finalArtFileInputRef}
                          accept="image/*,video/mp4"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadMediaFile(file, 'finalArt');
                          }}
                        />

                        {isUploadingFinalArt ? (
                          <div className="space-y-2 py-6">
                            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              Subiendo a Google Drive /POST TERMINADOS...
                            </p>
                          </div>
                        ) : editingPost.finalArtMediaUrl ? (
                          <div className="w-full space-y-2">
                            {!finalArtImageError ? (
                              <div className="relative mx-auto max-w-[240px] max-h-[180px] overflow-hidden rounded-xl border border-indigo-300 dark:border-indigo-800 shadow-xs">
                                <img
                                  src={editingPost.finalArtMediaUrl}
                                  alt="Arte Final"
                                  onError={() => setFinalArtImageError(true)}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center space-y-1">
                                <ImageIcon className="w-6 h-6 text-indigo-500 mx-auto" />
                                <p className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200">
                                  Miniatura no disponible en servidor
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Haz clic en &quot;Ver&quot; para abrir o sube una nueva versión
                                </p>
                              </div>
                            )}
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[240px] mx-auto">
                              {editingPost.finalArtMediaName || 'Arte Final cargado'}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                              <Check className="w-3 h-3" />
                              <span>Guardado en /POST TERMINADOS</span>
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2 py-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
                              <PenTool className="w-6 h-6" />
                            </div>
                            <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                              Sube o arrastra el Arte Final aquí
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Formatos 1:1, 4:5, 9:16, Carrusel o Video MP4
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Acciones de Arte Final */}
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (editingPost.finalArtMediaUrl) {
                              onOpenLightbox(editingPost.finalArtMediaUrl);
                            } else {
                              toast('No hay arte final para visualizar', 'info');
                            }
                          }}
                          className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => finalArtFileInputRef.current?.click()}
                          className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Subir Arte</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toast('Puedes añadir correcciones en los hitos de la derecha', 'info')
                          }
                          className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>Corregir</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingPost.finalArtMediaUrl) {
                              window.open(editingPost.finalArtMediaUrl, '_blank');
                            } else {
                              toast('No hay archivo para descargar', 'info');
                            }
                          }}
                          className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPost({
                              ...editingPost,
                              finalArtMediaUrl: '',
                              finalArtMediaName: '',
                              finalArtDriveId: '',
                              mediaUrl: '',
                            })
                          }
                          className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 font-bold text-[10px] transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>

                      {/* Enlace Externo Canva/Figma */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          <span>ENLACE EXTERNO (GOOGLE DRIVE, CANVA, FIGMA O VIDEO)</span>
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="url"
                            placeholder="https://drive.google.com/..., Canva, Figma o URL..."
                            value={editingPost.finalArtExternalLink || ''}
                            onChange={(e) =>
                              setEditingPost({
                                ...editingPost,
                                finalArtExternalLink: e.target.value,
                              })
                            }
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const text = await navigator.clipboard.readText();
                                if (text) {
                                  setEditingPost({
                                    ...editingPost,
                                    finalArtExternalLink: text,
                                  });
                                  toast('Enlace pegado del portapapeles', 'success');
                                }
                              } catch {
                                toast('No se pudo acceder al portapapeles', 'info');
                              }
                            }}
                            className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] transition flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <ClipboardPaste className="w-3.5 h-3.5" />
                            <span>Pegar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingPost({ ...editingPost, finalArtExternalLink: '' })
                            }
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Control de Calidad Visual (QA Pre-Presentación) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
                      {(() => {
                        const qa = editingPost.qaChecklist || {
                          spelling: false,
                          logoIdentity: false,
                          formatResolution: false,
                          ctaLinks: false,
                        };
                        const count = [
                          qa.spelling,
                          qa.logoIdentity,
                          qa.formatResolution,
                          qa.ctaLinks,
                        ].filter(Boolean).length;

                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <label className="font-extrabold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                <span>Control de Calidad Visual (QA Pre-Presentación)</span>
                              </label>
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  count === 4
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {count}/4 {count === 4 ? 'Completado' : 'Pendiente'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingPost({
                                    ...editingPost,
                                    qaChecklist: { ...qa, spelling: !qa.spelling },
                                  })
                                }
                                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                                  qa.spelling
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center mt-0.5 shrink-0 ${
                                    qa.spelling
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                  }`}
                                >
                                  {qa.spelling && <Check className="w-3 h-3" />}
                                </span>
                                <div>
                                  <p className="font-extrabold text-[11px] text-slate-800 dark:text-white">
                                    Ortografía & Hashtags
                                  </p>
                                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                    Texto revisado en gráfica y copy, sin faltas ortográficas.
                                  </p>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingPost({
                                    ...editingPost,
                                    qaChecklist: { ...qa, logoIdentity: !qa.logoIdentity },
                                  })
                                }
                                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                                  qa.logoIdentity
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center mt-0.5 shrink-0 ${
                                    qa.logoIdentity
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                  }`}
                                >
                                  {qa.logoIdentity && <Check className="w-3 h-3" />}
                                </span>
                                <div>
                                  <p className="font-extrabold text-[11px] text-slate-800 dark:text-white">
                                    Logo & Identidad
                                  </p>
                                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                    Paleta corporativa y logotipo oficial bien integrado.
                                  </p>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingPost({
                                    ...editingPost,
                                    qaChecklist: {
                                      ...qa,
                                      formatResolution: !qa.formatResolution,
                                    },
                                  })
                                }
                                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                                  qa.formatResolution
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center mt-0.5 shrink-0 ${
                                    qa.formatResolution
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                  }`}
                                >
                                  {qa.formatResolution && <Check className="w-3 h-3" />}
                                </span>
                                <div>
                                  <p className="font-extrabold text-[11px] text-slate-800 dark:text-white">
                                    Formato & Resolución
                                  </p>
                                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                    Dimensiones adecuadas (1:1, 4:5, 9:16) y visuales nítidos.
                                  </p>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingPost({
                                    ...editingPost,
                                    qaChecklist: { ...qa, ctaLinks: !qa.ctaLinks },
                                  })
                                }
                                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                                  qa.ctaLinks
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center mt-0.5 shrink-0 ${
                                    qa.ctaLinks
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                  }`}
                                >
                                  {qa.ctaLinks && <Check className="w-3 h-3" />}
                                </span>
                                <div>
                                  <p className="font-extrabold text-[11px] text-slate-800 dark:text-white">
                                    Call to Action & Links
                                  </p>
                                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                    Llamado a la acción claro y enlaces verificados.
                                  </p>
                                </div>
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Columna Derecha: Hitos & Avances de Diseño */}
                  <div className="xl:col-span-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <span>HITOS & AVANCES DE DISEÑO</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          const cur = editingPost.milestones || [];
                          const nextNum = cur.length + 1;
                          const newM = {
                            id: `m-${Date.now()}`,
                            stepNumber: nextNum,
                            title: `Hito de Diseño: Avance #${nextNum}`,
                            completed: false,
                            description: '',
                          };
                          setEditingPost({ ...editingPost, milestones: [...cur, newM] });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir Hito / Avance</span>
                      </button>
                    </div>

                    {/* Lista de Hitos */}
                    <div className="space-y-4">
                      {(editingPost.milestones || []).map((m, idx) => (
                        <div
                          key={m.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                {m.stepNumber || idx + 1}
                              </div>
                              <input
                                type="text"
                                value={m.title}
                                onChange={(e) => {
                                  const updated = (editingPost.milestones || []).map((item) =>
                                    item.id === m.id ? { ...item, title: e.target.value } : item
                                  );
                                  setEditingPost({ ...editingPost, milestones: updated });
                                }}
                                className="font-black text-xs text-slate-800 dark:text-white bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (editingPost.milestones || []).map((item) =>
                                    item.id === m.id
                                      ? { ...item, completed: !item.completed }
                                      : item
                                  );
                                  setEditingPost({ ...editingPost, milestones: updated });
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border ${
                                  m.completed
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>{m.completed ? 'Completado' : 'Completar'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (editingPost.milestones || []).filter(
                                    (item) => item.id !== m.id
                                  );
                                  setEditingPost({ ...editingPost, milestones: updated });
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                              <span>Descripción & Criterios del Avance</span>
                              <span>Soporta tablas, listas y formato</span>
                            </div>

                            {/* Mini toolbar */}
                            <div className="flex items-center gap-1 p-1 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (editingPost.milestones || []).map((item) =>
                                    item.id === m.id
                                      ? {
                                          ...item,
                                          description: `${item.description || ''} **criterio**`,
                                        }
                                      : item
                                  );
                                  setEditingPost({ ...editingPost, milestones: updated });
                                }}
                                className="p-1 hover:text-slate-700 dark:hover:text-white rounded"
                              >
                                <Bold className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (editingPost.milestones || []).map((item) =>
                                    item.id === m.id
                                      ? {
                                          ...item,
                                          description: `${item.description || ''} _nota_`,
                                        }
                                      : item
                                  );
                                  setEditingPost({ ...editingPost, milestones: updated });
                                }}
                                className="p-1 hover:text-slate-700 dark:hover:text-white rounded"
                              >
                                <Italic className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (editingPost.milestones || []).map((item) =>
                                    item.id === m.id
                                      ? {
                                          ...item,
                                          description: `${item.description || ''}\n• `,
                                        }
                                      : item
                                  );
                                  setEditingPost({ ...editingPost, milestones: updated });
                                }}
                                className="p-1 hover:text-slate-700 dark:hover:text-white rounded"
                              >
                                <List className="w-3 h-3" />
                              </button>
                            </div>

                            <textarea
                              rows={3}
                              placeholder="Añade notas, especificaciones o criterios para esta etapa de diseño (puedes pegar capturas aquí)..."
                              value={m.description || ''}
                              onPaste={(e) => handleMilestonePaste(e, m.id)}
                              onChange={(e) => {
                                const updated = (editingPost.milestones || []).map((item) =>
                                  item.id === m.id
                                    ? { ...item, description: e.target.value }
                                    : item
                                );
                                setEditingPost({ ...editingPost, milestones: updated });
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Zona de Adjuntos y Capturas del Hito */}
                          <div
                            onPaste={(e) => handleMilestonePaste(e, m.id)}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 text-[10px] space-y-1.5"
                          >
                            <p>Pega capturas con <strong>ctrl + v</strong> o arrastra archivos aquí</p>
                            <div className="flex items-center justify-center gap-2 pt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const url = prompt('Ingresa la URL del avance o prototipo:');
                                  if (url) {
                                    const updated = (editingPost.milestones || []).map((item) =>
                                      item.id === m.id
                                        ? {
                                            ...item,
                                            attachments: [...(item.attachments || []), { name: 'Enlace Web', url }],
                                          }
                                        : item
                                    );
                                    setEditingPost({ ...editingPost, milestones: updated });
                                    toast('Enlace añadido al avance', 'success');
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
                              >
                                <LinkIcon className="w-3 h-3" />
                                <span>+ URL</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMilestoneId(m.id);
                                  milestoneFileInputRef.current?.click();
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
                              >
                                <UploadCloud className="w-3 h-3" />
                                <span>+ Adjuntar</span>
                              </button>
                            </div>

                            {/* Miniaturas de Adjuntos del Hito */}
                            {m.attachments && m.attachments.length > 0 && (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2 text-left">
                                {m.attachments.map((att, attIdx) => (
                                  <div
                                    key={attIdx}
                                    className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-xs"
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      onClick={() => onOpenLightbox(att.url)}
                                      className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeMilestoneAttachment(m.id, attIdx)}
                                      className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow"
                                      title="Eliminar miniatura"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-white text-[9px] truncate px-1 py-0.5">
                                      {att.name}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          const cur = editingPost.milestones || [];
                          const nextNum = cur.length + 1;
                          const newM = {
                            id: `m-${Date.now()}`,
                            stepNumber: nextNum,
                            title: `Hito de Diseño: Avance #${nextNum}`,
                            completed: false,
                            description: '',
                          };
                          setEditingPost({ ...editingPost, milestones: [...cur, newM] });
                        }}
                        className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir Nuevo Avance / Hito de Diseño</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botones de Navegación de Tab 2 */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPostModalTab('grid_idea')}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Regresar a Idea / Borrador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPostModalTab('approval')}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>Pasar a Aprobación Cliente</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 3: APROBACIÓN & PUBLICACIÓN */}
            {/* ------------------------------------------------------------- */}
            {postModalTab === 'approval' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Columna Izquierda: Vista Previa de Presentación al Cliente */}
                  <div className="xl:col-span-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-indigo-500" />
                        <span>VISTA PREVIA DE PRESENTACIÓN AL CLIENTE</span>
                      </label>

                      <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setPreviewTarget('final')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            previewTarget === 'final'
                              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                          }`}
                        >
                          Arte Final
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewTarget('reference')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            previewTarget === 'reference'
                              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                          }`}
                        >
                          Referencia
                        </button>
                      </div>
                    </div>

                    {/* Escenario de Presentación (Mock Frame Oscuro) */}
                    <div className="bg-slate-950 rounded-3xl p-6 min-h-[380px] flex flex-col items-center justify-center border border-slate-800 text-center relative overflow-hidden shadow-2xl">
                      {(() => {
                        const mediaToShow =
                          previewTarget === 'final'
                            ? editingPost.finalArtMediaUrl
                            : editingPost.referenceMediaUrl;

                        if (mediaToShow) {
                          return (
                            <div className="relative max-h-[340px] max-w-full flex items-center justify-center">
                              <img
                                src={mediaToShow}
                                alt="Vista Previa"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                                className="max-h-[340px] max-w-full object-contain rounded-2xl shadow-xl"
                              />
                              <button
                                type="button"
                                onClick={() => onOpenLightbox(mediaToShow)}
                                className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-900/80 backdrop-blur-md text-white hover:bg-slate-800 transition shadow-lg cursor-pointer"
                                title="Inspeccionar en alta resolución"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3 py-12">
                            <div className="w-16 h-16 rounded-3xl bg-slate-900 text-slate-600 flex items-center justify-center mx-auto border border-slate-800">
                              <ImageIcon className="w-8 h-8" />
                            </div>
                            <p className="text-sm font-bold text-slate-400">
                              {previewTarget === 'final'
                                ? 'Aún no se ha cargado el arte final terminado.'
                                : 'Aún no se ha cargado la referencia visual.'}
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Detalle del Copy y Título debajo del Preview */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {editingPost.title || 'Sin título'}
                        </h4>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          RESUMEN DE COPY
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {editingPost.copy || 'Sin texto de copy'}
                      </p>
                    </div>
                  </div>

                  {/* Columna Derecha: Estado de Validación & Enlace Mágico */}
                  <div className="xl:col-span-4 space-y-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
                      <div>
                        <label className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-white block">
                          ESTADO DE APROBACIÓN CON EL CLIENTE
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Selecciona en qué fase de validación se encuentra este contenido:
                        </p>
                      </div>

                      {/* 4 Cards Interactivas 2x2 */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { id: 'idea', label: '1. Idea / Borrador', icon: Lightbulb },
                          { id: 'in_design', label: '2. En Diseño / Revisión', icon: PenTool },
                          { id: 'client_approved', label: '3. Aprobado Cliente', icon: CheckCircle2 },
                          { id: 'published', label: '4. Programado / Publicado', icon: Send },
                        ].map((st) => {
                          const StIcon = st.icon;
                          const isSelected =
                            (editingPost.clientApprovalStatus || 'idea') === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() =>
                                setEditingPost({
                                  ...editingPost,
                                  clientApprovalStatus: st.id as any,
                                  status:
                                    st.id === 'idea'
                                      ? 'idea'
                                      : st.id === 'in_design'
                                      ? 'design'
                                      : st.id === 'client_approved'
                                      ? 'approved'
                                      : 'published',
                                })
                              }
                              className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                  : 'bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-700 text-slate-500'
                                }`}
                              >
                                <StIcon className="w-4 h-4" />
                              </div>
                              <span className="font-extrabold text-[11px] leading-tight">
                                {st.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Callout Flujo Flexible */}
                      <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-300 text-[11px] leading-relaxed">
                        <p className="font-bold flex items-center gap-1.5 mb-0.5">
                          <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Flujo Flexible</span>
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Puedes avanzar o regresar el post a cualquier etapa (Idea, Diseño, Aprobado o Publicado) en cualquier momento.
                        </p>
                      </div>

                      {/* Acciones de Validación */}
                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const dummyLink = `${window.location.origin}/portal/review/${editingPost.id || 'demo'}`;
                            navigator.clipboard.writeText(dummyLink);
                            toast('Enlace mágico copiado al portapapeles', 'success');
                          }}
                          className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <LinkIcon className="w-4 h-4" />
                          <span>Copiar Enlace Mágico para el Cliente</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const targetUrl =
                              editingPost.finalArtMediaUrl || editingPost.referenceMediaUrl;
                            if (targetUrl) {
                              onOpenLightbox(targetUrl);
                            } else {
                              toast('No hay arte cargado para modo presentación', 'info');
                            }
                          }}
                          className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Tv className="w-4 h-4 text-indigo-500" />
                          <span>Iniciar Modo Presentación</span>
                        </button>
                      </div>

                      {/* Botones de Navegación */}
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setPostModalTab('grid_idea')}
                          className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-[11px] text-slate-600 dark:text-slate-300 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Volver a Idea</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPostModalTab('design')}
                          className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-[11px] text-slate-600 dark:text-slate-300 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Volver a Diseño</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* PESTAÑA 4: COMENTARIOS */}
            {/* ------------------------------------------------------------- */}
            {postModalTab === 'comments' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6 min-h-[460px] flex flex-col justify-between">
                  {/* Sub-tabs de Comentarios */}
                  <div>
                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <button
                        type="button"
                        onClick={() => setCommentsSubTab('idea')}
                        className={`pb-1 font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
                          commentsSubTab === 'idea'
                            ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Contenido / Idea</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommentsSubTab('design')}
                        className={`pb-1 font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
                          commentsSubTab === 'design'
                            ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Fase de Diseño</span>
                      </button>
                    </div>

                    {/* Thread de Comentarios */}
                    <div className="pt-6">
                      {(() => {
                        const filteredComments = (editingPost.comments || []).filter(
                          (c) => c.tab === commentsSubTab
                        );

                        if (filteredComments.length === 0) {
                          return (
                            <div className="py-16 text-center max-w-sm mx-auto space-y-3">
                              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto">
                                <MessageSquare className="w-7 h-7" />
                              </div>
                              <h4 className="text-sm font-black text-slate-800 dark:text-white">
                                No hay comentarios para esta publicación
                              </h4>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                Cuando el cliente o el equipo dejen observaciones en esta etapa, aparecerán aquí.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {filteredComments.map((c) => {
                              const match = c.text?.match(/\n?\[Imagen Adjunta\]:\s*(\S+)/);
                              const cleanText = match ? c.text.replace(/\n?\[Imagen Adjunta\]:\s*\S+/, '').trim() : c.text;
                              const attachedImg = match ? match[1] : null;

                              let formattedDate = c.createdAt;
                              if (c.createdAt && c.createdAt.includes('T')) {
                                try {
                                  const d = new Date(c.createdAt);
                                  formattedDate = `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                } catch {}
                              }

                              return (
                                <div
                                  key={c.id}
                                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-xs text-slate-800 dark:text-white">
                                      {c.author}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {formattedDate}
                                    </span>
                                  </div>
                                  {cleanText && (
                                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                      {cleanText}
                                    </p>
                                  )}
                                  {attachedImg && (
                                    <div className="mt-2">
                                      <img
                                        src={attachedImg}
                                        alt="Adjunto"
                                        onClick={() => onOpenLightbox?.(attachedImg)}
                                        className="max-h-28 rounded-lg border border-slate-200 dark:border-slate-700 cursor-zoom-in hover:opacity-90 transition object-cover"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Compositor de Comentario */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Escribe un comentario sobre ${
                        commentsSubTab === 'idea' ? 'el copy / concepto' : 'el arte y diseño'
                      }...`}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCommentText.trim()) {
                          e.preventDefault();
                          const newC = {
                            id: `c-${Date.now()}`,
                            tab: commentsSubTab,
                            author: tenant.name.split(' ')[0] || 'Equipo ROMA',
                            text: newCommentText.trim(),
                            createdAt: new Date().toLocaleTimeString('es-PE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            }),
                          };
                          setEditingPost({
                            ...editingPost,
                            comments: [...(editingPost.comments || []), newC],
                          });
                          setNewCommentText('');
                          toast('Comentario añadido', 'success');
                        }
                      }}
                      className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newCommentText.trim()) return;
                        const newC = {
                          id: `c-${Date.now()}`,
                          tab: commentsSubTab,
                          author: tenant.name.split(' ')[0] || 'Equipo ROMA',
                          text: newCommentText.trim(),
                          createdAt: new Date().toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }),
                        };
                        setEditingPost({
                          ...editingPost,
                          comments: [...(editingPost.comments || []), newC],
                        });
                        setNewCommentText('');
                        toast('Comentario añadido', 'success');
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Comentario</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={milestoneFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleMilestoneFileUpload(e.target.files?.[0]);
          if (e.target) e.target.value = '';
        }}
      />
    </div>
  );
};
