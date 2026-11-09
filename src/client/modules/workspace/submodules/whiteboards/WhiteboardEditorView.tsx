import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Check,
  Share2,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Hand,
  MousePointer,
  Pencil,
  Highlighter,
  Eraser,
  Type,
  StickyNote,
  Square,
  Circle,
  Triangle,
  MoveRight,
  Minus,
  Sparkles,
  Image as ImageIcon,
  Grid,
  ChevronDown,
  FileDown,
  FileCode,
  LayoutTemplate,
  Kanban,
  Columns,
  Layers,
  SmilePlus,
  HelpCircle,
  Keyboard,
  Laptop,
  Maximize,
  Diamond,
  X,
} from 'lucide-react';
import { Whiteboard, WhiteboardFolder } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';
import { WhiteboardShareModal } from './WhiteboardShareModal';

// Parche preventivo para error de CanvasTextBaseline en Fabric 5.3.1
if (typeof window !== 'undefined' && typeof CanvasRenderingContext2D !== 'undefined') {
  try {
    const proto = CanvasRenderingContext2D.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'textBaseline');
    if (desc && desc.set) {
      Object.defineProperty(proto, 'textBaseline', {
        ...desc,
        set(val: string) {
          return desc.set!.call(this, val === 'alphabetical' ? 'alphabetic' : val);
        },
      });
    }
  } catch {}
}

interface WhiteboardEditorViewProps {
  whiteboardId: string;
  onBack: () => void;
  folder?: WhiteboardFolder | null;
}

type ActiveTool =
  | 'select'
  | 'pan'
  | 'draw'
  | 'highlighter'
  | 'eraser'
  | 'text'
  | 'sticky'
  | 'shape'
  | 'frame';

type BgType = 'dots' | 'grid' | 'lines' | 'solid';

type ShapeFillMode = 'soft' | 'solid-white' | 'solid-color' | 'outline';

// Paleta de colores para notas adhesivas (Post-its) con Tailwind
export interface StickyColorOption {
  id: string;
  name: string;
  bg: string;
  border: string;
  text: string;
  tape: string;
  dotColor: string;
}

export const STICKY_COLORS: StickyColorOption[] = [
  { id: 'yellow', name: 'Canario', bg: '#fef08a', border: '#fde047', text: '#713f12', tape: '#fef9c3', dotColor: 'bg-yellow-300' },
  { id: 'orange', name: 'Melocotón', bg: '#fed7aa', border: '#fdba74', text: '#7c2d12', tape: '#ffedd5', dotColor: 'bg-orange-300' },
  { id: 'pink', name: 'Rosa Coral', bg: '#fbcfe8', border: '#f472b6', text: '#831843', tape: '#fdf2f8', dotColor: 'bg-pink-300' },
  { id: 'purple', name: 'Lavanda', bg: '#e9d5ff', border: '#c084fc', text: '#581c87', tape: '#f3e8ff', dotColor: 'bg-purple-300' },
  { id: 'blue', name: 'Azul Cielo', bg: '#bae6fd', border: '#38bdf8', text: '#0c4a6e', tape: '#e0f2fe', dotColor: 'bg-sky-300' },
  { id: 'green', name: 'Menta', bg: '#bbf7d0', border: '#4ade80', text: '#064e3b', tape: '#dcfce7', dotColor: 'bg-emerald-300' },
  { id: 'slate', name: 'Grafito', bg: '#1e293b', border: '#334155', text: '#f8fafc', tape: '#475569', dotColor: 'bg-slate-800' },
];

// Stickers interactivos: Emojis y Badges de trabajo
interface StickerItem {
  id: string;
  label: string;
  emoji?: string;
  badge?: {
    text: string;
    bg: string;
    textColor: string;
    border: string;
  };
  category: 'reactions' | 'badges';
}

const STICKERS_CATALOG: StickerItem[] = [
  { id: 'fire', label: 'Fuego', emoji: '🔥', category: 'reactions' },
  { id: 'star', label: 'Estrella', emoji: '⭐', category: 'reactions' },
  { id: 'rocket', label: 'Cohete', emoji: '🚀', category: 'reactions' },
  { id: 'heart', label: 'Amor', emoji: '❤️', category: 'reactions' },
  { id: 'bulb', label: 'Idea', emoji: '💡', category: 'reactions' },
  { id: 'target', label: 'Objetivo', emoji: '🎯', category: 'reactions' },
  { id: 'check', label: 'Listo', emoji: '✅', category: 'reactions' },
  { id: 'party', label: 'Celebración', emoji: '🎉', category: 'reactions' },
  { id: 'pin', label: 'Fijar', emoji: '📌', category: 'reactions' },
  { id: 'warning', label: 'Atención', emoji: '⚠️', category: 'reactions' },
  { id: 'clap', label: 'Aplausos', emoji: '👏', category: 'reactions' },
  { id: 'lightning', label: 'Rápido', emoji: '⚡', category: 'reactions' },
  { id: 'gem', label: 'Calidad', emoji: '💎', category: 'reactions' },
  { id: 'chart', label: 'Métrica', emoji: '📈', category: 'reactions' },
  { id: 'trophy', label: 'Premio', emoji: '🏆', category: 'reactions' },
  { id: 'comment', label: 'Mensaje', emoji: '💬', category: 'reactions' },
  { id: 'eyes', label: 'Revisando', emoji: '👀', category: 'reactions' },
  { id: 'palette', label: 'Diseño', emoji: '🎨', category: 'reactions' },
  { id: 'crown', label: 'Destacado', emoji: '👑', category: 'reactions' },
  { id: 'clock', label: 'A tiempo', emoji: '⏰', category: 'reactions' },

  {
    id: 'b-approved',
    label: 'Aprobado',
    category: 'badges',
    badge: { text: '✓ APROBADO', bg: '#ecfdf5', textColor: '#047857', border: '#10b981' },
  },
  {
    id: 'b-urgent',
    label: 'Urgente',
    category: 'badges',
    badge: { text: '🔥 URGENTE', bg: '#fef2f2', textColor: '#b91c1c', border: '#ef4444' },
  },
  {
    id: 'b-review',
    label: 'En Revisión',
    category: 'badges',
    badge: { text: '⏳ EN REVISIÓN', bg: '#fffbeb', textColor: '#b45309', border: '#f59e0b' },
  },
  {
    id: 'b-draft',
    label: 'Borrador',
    category: 'badges',
    badge: { text: '✏️ BORRADOR', bg: '#f8fafc', textColor: '#475569', border: '#94a3b8' },
  },
  {
    id: 'b-idea',
    label: 'Idea Top',
    category: 'badges',
    badge: { text: '💡 IDEA TOP', bg: '#faf5ff', textColor: '#7e22ce', border: '#a855f7' },
  },
  {
    id: 'b-feedback',
    label: 'Feedback',
    category: 'badges',
    badge: { text: '💬 FEEDBACK', bg: '#eff6ff', textColor: '#1d4ed8', border: '#3b82f6' },
  },
];

interface ActiveStickyEditor {
  group: any;
  text: string;
  color: StickyColorOption;
  screenX: number;
  screenY: number;
  width: number;
  height: number;
}

export const WhiteboardEditorView: React.FC<WhiteboardEditorViewProps> = ({
  whiteboardId,
  onBack,
  folder,
}) => {
  const { toast, apiFetch } = useApp();
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estados de datos
  const [board, setBoard] = useState<Whiteboard | null>(null);
  const [boardTitle, setBoardTitle] = useState('Pizarra Creativa');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estados de herramientas
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');
  const [currentColor, setCurrentColor] = useState('#2563eb');
  const [selectedStickyColor, setSelectedStickyColor] = useState<StickyColorOption>(STICKY_COLORS[0]);
  const [brushWidth, setBrushWidth] = useState(3);
  const [shapeFillMode, setShapeFillMode] = useState<ShapeFillMode>('soft');
  const [canvasBg, setCanvasBg] = useState<BgType>('dots');
  const [solidBgColor, setSolidBgColor] = useState('#f8fafc');

  // Menús desplegables y modales
  const [showBgDropdown, setShowBgDropdown] = useState(false);
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);
  const [showFramesDropdown, setShowFramesDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showTemplatesSidebar, setShowTemplatesSidebar] = useState(false);
  const [showStickersModal, setShowStickersModal] = useState(false);
  const [stickersCategory, setStickersCategory] = useState<'reactions' | 'badges'>('reactions');
  const [showStickyPalette, setShowStickyPalette] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showZoomDropdown, setShowZoomDropdown] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  // Estados para Edición de Notas Adhesivas (Post-its)
  const [editingSticky, setEditingSticky] = useState<ActiveStickyEditor | null>(null);
  const [tempStickyText, setTempStickyText] = useState('');
  const [selectedStickyGroup, setSelectedStickyGroup] = useState<any | null>(null);

  // Zoom & Panning
  const [zoomLevel, setZoomLevel] = useState(100);
  const prevToolBeforeSpace = useRef<ActiveTool>('select');

  // Guardado & Historial Undo/Redo
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);
  const autoSaveTimerRef = useRef<any>(null);

  // Determinar si un objeto es una nota adhesiva
  const isStickyObject = useCallback((obj: any) => {
    if (!obj) return false;
    if (obj.isSticky) return true;
    if (obj.type === 'group' && obj.getObjects) {
      return (
        obj.stickyText != null ||
        obj.getObjects().some((o: any) => o.type === 'textbox' || o.type === 'text')
      );
    }
    return false;
  }, []);

  // Abrir editor de nota adhesiva
  const openStickyEditor = useCallback((group: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !group) return;

    let stickyText = (group as any).stickyText;
    let bgRect = (group as any).stickyBg;

    if (!stickyText || !bgRect) {
      if (group.getObjects) {
        const objs = group.getObjects();
        stickyText = objs.find((o: any) => o.type === 'textbox' || o.type === 'i-text' || o.type === 'text');
        bgRect = objs.find((o: any) => o.type === 'rect');
        (group as any).stickyText = stickyText;
        (group as any).stickyBg = bgRect;
        (group as any).isSticky = true;
      }
    }

    const currentText = stickyText?.text || '';
    const currentBg = bgRect?.fill || selectedStickyColor.bg;
    const matchedColor = STICKY_COLORS.find((c) => c.bg === currentBg) || selectedStickyColor;

    const bound = group.getBoundingRect(true, true);

    setTempStickyText(currentText === 'Escribe tu nota aquí...' ? '' : currentText);
    setEditingSticky({
      group,
      text: currentText,
      color: matchedColor,
      screenX: bound.left,
      screenY: bound.top,
      width: Math.max(200, bound.width),
      height: Math.max(180, bound.height),
    });
  }, [selectedStickyColor]);

  // Actualizar apariencia visual de una nota
  const updateStickyVisuals = useCallback((group: any, colorOpt: StickyColorOption) => {
    const canvas = fabricCanvasRef.current;
    if (!group || !canvas) return;

    let bgRect = (group as any).stickyBg;
    let stickyText = (group as any).stickyText;
    let tape = null;

    if (group.getObjects) {
      const objs = group.getObjects();
      if (!bgRect) bgRect = objs.find((o: any) => o.type === 'rect');
      if (!stickyText) stickyText = objs.find((o: any) => o.type === 'textbox' || o.type === 'text');
      tape = objs.find((o: any) => o !== bgRect && o !== stickyText);
    }

    if (bgRect) {
      bgRect.set({
        fill: colorOpt.bg,
        stroke: colorOpt.border,
      });
    }

    if (stickyText) {
      stickyText.set({
        fill: colorOpt.text,
      });
    }

    if (tape && colorOpt.tape) {
      tape.set({
        fill: colorOpt.tape,
      });
    }

    group.setCoords();
    canvas.requestRenderAll();
  }, []);

  // Guardar texto y color editado de la nota adhesiva
  const handleSaveSticky = useCallback((newText: string, colorOpt: StickyColorOption) => {
    if (!editingSticky) return;
    const canvas = fabricCanvasRef.current;
    const group = editingSticky.group;

    if (group && canvas) {
      let stickyText = (group as any).stickyText;
      let bgRect = (group as any).stickyBg;
      let tape = null;

      if (group.getObjects) {
        const objs = group.getObjects();
        if (!stickyText) stickyText = objs.find((o: any) => o.type === 'textbox' || o.type === 'text');
        if (!bgRect) bgRect = objs.find((o: any) => o.type === 'rect');
        tape = objs.find((o: any) => o !== bgRect && o !== stickyText);
      }

      if (stickyText) {
        stickyText.set({
          text: newText.trim() === '' ? 'Nota...' : newText,
          fill: colorOpt.text,
        });
      }

      if (bgRect) {
        bgRect.set({
          fill: colorOpt.bg,
          stroke: colorOpt.border,
        });
      }

      if (tape && colorOpt.tape) {
        tape.set({
          fill: colorOpt.tape,
        });
      }

      group.setCoords();
      canvas.requestRenderAll();
      triggerAutoSave();
      pushHistoryState();
      updateMinimap();
    }

    setEditingSticky(null);
  }, [editingSticky]);

  // Cargar Pizarra desde el Backend
  const loadWhiteboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/workspace/whiteboards/${whiteboardId}`);
      if (res && res.whiteboard) {
        setBoard(res.whiteboard);
        setBoardTitle(res.whiteboard.title);
        initFabricCanvas(res.whiteboard.content);
      }
    } catch (err: any) {
      toast('error', 'Error al cargar la pizarra: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [whiteboardId]);

  useEffect(() => {
    loadWhiteboard();
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [loadWhiteboard]);

  // Inicializar Fabric Canvas de forma segura y robusta
  const initFabricCanvas = (initialContent?: string) => {
    const fabric = (window as any).fabric;
    if (!fabric) {
      setTimeout(() => initFabricCanvas(initialContent), 150);
      return;
    }

    const container = containerRef.current;
    if (!container) {
      setTimeout(() => initFabricCanvas(initialContent), 100);
      return;
    }

    // Limpiar instancia previa de Fabric de manera segura
    if (fabricCanvasRef.current) {
      try {
        fabricCanvasRef.current.dispose();
      } catch (e) {
        console.warn('Error al limpiar canvas previo:', e);
      }
      fabricCanvasRef.current = null;
    }

    // Limpiar wrappers previos dentro del contenedor
    container.innerHTML = '';

    // Crear un elemento <canvas> fresco y limpio
    const canvasEl = document.createElement('canvas');
    canvasEl.className = 'touch-none';
    container.appendChild(canvasEl);
    canvasElRef.current = canvasEl;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const canvas = new fabric.Canvas(canvasEl, {
      width,
      height,
      selection: true,
      preserveObjectStacking: true,
      fireRightClick: true,
      stopContextMenu: true,
      renderOnAddRemove: true,
    });

    fabricCanvasRef.current = canvas;

    applyBackground(canvasBg, solidBgColor);

    if (initialContent) {
      try {
        const json = typeof initialContent === 'string' ? JSON.parse(initialContent) : initialContent;
        canvas.loadFromJSON(json, () => {
          canvas.renderAll();
          pushHistoryState();
          updateMinimap();
        });
      } catch (e) {
        console.warn('Error parsing canvas json:', e);
      }
    } else {
      pushHistoryState();
    }

    // Eventos de cambios para historial y autosave
    canvas.on('object:added', () => {
      if (!isUndoRedoAction.current) {
        triggerAutoSave();
        pushHistoryState();
        updateMinimap();
      }
    });

    canvas.on('object:modified', () => {
      if (!isUndoRedoAction.current) {
        triggerAutoSave();
        pushHistoryState();
        updateMinimap();
      }
    });

    canvas.on('object:removed', () => {
      if (!isUndoRedoAction.current) {
        triggerAutoSave();
        pushHistoryState();
        updateMinimap();
      }
    });

    // DOBLE CLIC EN EL LIENZO: Editar nota adhesiva inmediatamente
    canvas.on('mouse:dblclick', (opt: any) => {
      const target = opt.target;
      if (!target) return;
      if (isStickyObject(target)) {
        openStickyEditor(target);
      }
    });

    // Selección de objetos
    canvas.on('selection:created', (opt: any) => {
      const sel = opt.selected?.[0];
      if (sel && isStickyObject(sel)) {
        setSelectedStickyGroup(sel);
      } else {
        setSelectedStickyGroup(null);
      }
    });

    canvas.on('selection:updated', (opt: any) => {
      const sel = opt.selected?.[0];
      if (sel && isStickyObject(sel)) {
        setSelectedStickyGroup(sel);
      } else {
        setSelectedStickyGroup(null);
      }
    });

    canvas.on('selection:cleared', () => {
      setSelectedStickyGroup(null);
    });

    // -------------------------------------------------------------
    // SOPORTE DE RATÓN Y TRACKPAD DE LAPTOP (SMART WHEEL & PAN)
    // -------------------------------------------------------------
    canvas.on('mouse:wheel', (opt: any) => {
      const evt = opt.e;
      evt.preventDefault();
      evt.stopPropagation();

      // Cerrar editor si está abierto durante zoom o pan
      if (editingSticky) {
        handleSaveSticky(tempStickyText, editingSticky.color);
      }

      if (evt.ctrlKey || evt.metaKey) {
        const zoomDelta = Math.pow(0.994, evt.deltaY);
        let zoom = canvas.getZoom() * zoomDelta;
        if (zoom > 5) zoom = 5;
        if (zoom < 0.1) zoom = 0.1;
        canvas.zoomToPoint({ x: evt.offsetX, y: evt.offsetY }, zoom);
        setZoomLevel(Math.round(zoom * 100));
        updateMinimap();
      } else {
        const vpt = canvas.viewportTransform;
        vpt[4] -= evt.deltaX;
        vpt[5] -= evt.deltaY;
        canvas.setViewportTransform(vpt);
        canvas.requestRenderAll();
        updateMinimap();
      }
    });

    // Paneo con botón medio del ratón, tecla Espacio, o herramienta 'pan'
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on('mouse:down', (opt: any) => {
      const evt = opt.e;
      if (activeTool === 'pan' || evt.spaceKey || evt.altKey || evt.button === 1) {
        isPanning = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      } else if (activeTool === 'eraser' && opt.target) {
        canvas.remove(opt.target);
        canvas.renderAll();
      }
    });

    canvas.on('mouse:move', (opt: any) => {
      if (isPanning) {
        const evt = opt.e;
        const vpt = canvas.viewportTransform;
        vpt[4] += evt.clientX - lastPosX;
        vpt[5] += evt.clientY - lastPosY;
        canvas.requestRenderAll();
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        updateMinimap();
      }
    });

    canvas.on('mouse:up', () => {
      if (isPanning) {
        isPanning = false;
        canvas.setViewportTransform(canvas.viewportTransform);
        if (activeTool === 'select') {
          canvas.selection = true;
        }
      }
    });

    // -------------------------------------------------------------
    // SOPORTE MULTITÁCTIL PARA LAPTOPS TOUCHSCREEN Y PANTALLAS
    // -------------------------------------------------------------
    const containerEl = containerRef.current;
    if (containerEl) {
      let touchStartDist = 0;
      let touchStartZoom = 1;
      let touchStartCenter = { x: 0, y: 0 };
      let touchStartVpt = [1, 0, 0, 1, 0, 0];

      const getTouchDistAndCenter = (t1: Touch, t2: Touch) => {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const dist = Math.hypot(dx, dy);
        const center = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
        return { dist, center };
      };

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const { dist, center } = getTouchDistAndCenter(e.touches[0], e.touches[1]);
          touchStartDist = dist;
          touchStartZoom = canvas.getZoom();
          touchStartCenter = center;
          touchStartVpt = [...canvas.viewportTransform];
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const { dist, center } = getTouchDistAndCenter(e.touches[0], e.touches[1]);
          if (touchStartDist > 0) {
            const scale = dist / touchStartDist;
            let newZoom = touchStartZoom * scale;
            if (newZoom > 5) newZoom = 5;
            if (newZoom < 0.1) newZoom = 0.1;

            const rect = containerEl.getBoundingClientRect();
            const canvasPoint = {
              x: center.x - rect.left,
              y: center.y - rect.top,
            };

            const panDx = center.x - touchStartCenter.x;
            const panDy = center.y - touchStartCenter.y;

            canvas.zoomToPoint(canvasPoint, newZoom);
            const vpt = canvas.viewportTransform;
            vpt[4] = touchStartVpt[4] + panDx;
            vpt[5] = touchStartVpt[5] + panDy;
            canvas.setViewportTransform(vpt);
            canvas.requestRenderAll();
            setZoomLevel(Math.round(newZoom * 100));
            updateMinimap();
          }
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
          touchStartDist = 0;
        }
      };

      containerEl.addEventListener('touchstart', handleTouchStart, { passive: false });
      containerEl.addEventListener('touchmove', handleTouchMove, { passive: false });
      containerEl.addEventListener('touchend', handleTouchEnd);
    }

    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      canvas.setWidth(containerRef.current.clientWidth);
      canvas.setHeight(containerRef.current.clientHeight);
      canvas.renderAll();
      updateMinimap();
    };
    window.addEventListener('resize', handleResize);
  };

  // Aplicar patrones de fondo
  const applyBackground = (type: BgType, solidColor = '#f8fafc') => {
    const bgContainer = containerRef.current;
    if (!bgContainer) return;

    if (type === 'dots') {
      bgContainer.style.backgroundColor = '#f8fafc';
      bgContainer.style.backgroundImage = 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)';
      bgContainer.style.backgroundSize = '24px 24px';
    } else if (type === 'grid') {
      bgContainer.style.backgroundColor = '#f8fafc';
      bgContainer.style.backgroundImage =
        'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)';
      bgContainer.style.backgroundSize = '24px 24px';
    } else if (type === 'lines') {
      bgContainer.style.backgroundColor = '#f8fafc';
      bgContainer.style.backgroundImage =
        'linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)';
      bgContainer.style.backgroundSize = '100% 28px';
    } else {
      bgContainer.style.backgroundColor = solidColor;
      bgContainer.style.backgroundImage = 'none';
    }
  };

  // Cambio de herramienta activa
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const fabric = (window as any).fabric;
    if (!canvas || !fabric) return;

    canvas.isDrawingMode = false;
    canvas.selection = activeTool === 'select';
    canvas.defaultCursor = 'default';

    if (activeTool === 'select') {
      canvas.defaultCursor = 'default';
    } else if (activeTool === 'pan') {
      canvas.defaultCursor = 'grab';
    } else if (activeTool === 'draw') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = currentColor;
      canvas.freeDrawingBrush.width = brushWidth;
    } else if (activeTool === 'highlighter') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      const r = parseInt(currentColor.slice(1, 3) || 'ff', 16) || 250;
      const g = parseInt(currentColor.slice(3, 5) || 'cc', 16) || 204;
      const b = parseInt(currentColor.slice(5, 7) || '00', 16) || 21;
      canvas.freeDrawingBrush.color = `rgba(${r}, ${g}, ${b}, 0.35)`;
      canvas.freeDrawingBrush.width = 24;
    } else if (activeTool === 'eraser') {
      canvas.defaultCursor = 'crosshair';
    }
  }, [activeTool, currentColor, brushWidth]);

  useEffect(() => {
    applyBackground(canvasBg, solidBgColor);
  }, [canvasBg, solidBgColor]);

  // Centro de pantalla del canvas
  const getCanvasCenter = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return { x: 400, y: 300 };
    const zoom = canvas.getZoom();
    const vpt = canvas.viewportTransform;
    return {
      x: (canvas.getWidth() / 2 - vpt[4]) / zoom,
      y: (canvas.getHeight() / 2 - vpt[5]) / zoom,
    };
  };

  // -------------------------------------------------------------
  // ATAJOS DE TECLADO COMPLETOS
  // -------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si estamos editando el post-it en el textarea HTML, NO interceptar
      if (editingSticky) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const canvas = fabricCanvasRef.current;
      const activeObj = canvas?.getActiveObject();
      if (activeObj && (activeObj as any).isEditing) {
        return;
      }

      const key = e.key.toLowerCase();
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Deshacer / Rehacer
      if (isCtrlOrMeta && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if (isCtrlOrMeta && key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Guardar: Ctrl + S
      if (isCtrlOrMeta && key === 's') {
        e.preventDefault();
        saveCanvasData();
        toast('info', 'Guardando cambios...');
        return;
      }

      // Editar nota adhesiva con tecla Enter
      if (key === 'enter' && activeObj && isStickyObject(activeObj)) {
        e.preventDefault();
        openStickyEditor(activeObj);
        return;
      }

      // Zoom Rápido: Teclas + y -
      if ((isCtrlOrMeta && (key === '+' || key === '=')) || key === '+') {
        e.preventDefault();
        applyZoom(0.2);
        return;
      }
      if ((isCtrlOrMeta && (key === '-' || key === '_')) || key === '-') {
        e.preventDefault();
        applyZoom(-0.2);
        return;
      }
      if ((isCtrlOrMeta && key === '0') || key === '0') {
        e.preventDefault();
        resetZoom();
        return;
      }

      // Ajustar al contenido: F o Shift + 1
      if (!isCtrlOrMeta && (key === 'f' || (e.shiftKey && key === '!'))) {
        e.preventDefault();
        fitToContent();
        return;
      }

      // Ayuda / Atajos: ?
      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }

      // Eliminar: Delete o Backspace
      if (key === 'delete' || key === 'backspace') {
        if (activeObj) {
          e.preventDefault();
          canvas.remove(activeObj);
          canvas.discardActiveObject();
          canvas.renderAll();
          setSelectedStickyGroup(null);
          triggerAutoSave();
          pushHistoryState();
          updateMinimap();
        }
        return;
      }

      // Escape: Salir de modales o deseleccionar
      if (key === 'escape') {
        e.preventDefault();
        setShowStickersModal(false);
        setShowShapesDropdown(false);
        setShowFramesDropdown(false);
        setShowTemplatesSidebar(false);
        setShowExportDropdown(false);
        setShowBgDropdown(false);
        setShowZoomDropdown(false);
        setShowShortcutsModal(false);
        if (activeObj) {
          canvas.discardActiveObject();
          canvas.renderAll();
          setSelectedStickyGroup(null);
        } else {
          setActiveTool('select');
        }
        return;
      }

      // Mover elemento seleccionado con flechas (Nudge)
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key) && activeObj) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 3;
        if (key === 'arrowup') activeObj.top = (activeObj.top || 0) - step;
        if (key === 'arrowdown') activeObj.top = (activeObj.top || 0) + step;
        if (key === 'arrowleft') activeObj.left = (activeObj.left || 0) - step;
        if (key === 'arrowright') activeObj.left = (activeObj.left || 0) + step;
        activeObj.setCoords();
        canvas.requestRenderAll();
        triggerAutoSave();
        return;
      }

      // Herramientas directas con teclado
      if (!isCtrlOrMeta && !e.altKey) {
        if (key === 'v') {
          setActiveTool('select');
        } else if (key === 'h') {
          setActiveTool('pan');
        } else if (key === 'p' || key === 'd') {
          setActiveTool('draw');
        } else if (key === 'b') {
          setActiveTool('highlighter');
        } else if (key === 'e') {
          setActiveTool('eraser');
        } else if (key === 't') {
          addText();
        } else if (key === 's' || key === 'n') {
          addStickyNote();
        } else if (key === 'r') {
          addShape('rect');
        } else if (key === 'q') {
          addShape('square');
        } else if (key === 'c') {
          addShape('circle');
        } else if (key === 'k') {
          setShowStickersModal((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, historyStack, selectedStickyColor, currentColor, editingSticky, isStickyObject, openStickyEditor]);

  // Mantener barra espaciadora para mover el lienzo temporalmente
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space' && !e.repeat && activeTool !== 'pan') {
        prevToolBeforeSpace.current = activeTool;
        setActiveTool('pan');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && activeTool === 'pan') {
        setActiveTool(prevToolBeforeSpace.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTool]);

  // 1. Agregar Texto
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    const fabric = (window as any).fabric;
    if (!canvas || !fabric) return;

    const center = getCanvasCenter();
    const text = new fabric.IText('Escribe tu idea aquí...', {
      left: center.x,
      top: center.y,
      fontSize: 24,
      fontFamily: 'Inter, sans-serif',
      fill: currentColor === '#ffffff' ? '#0f172a' : currentColor,
      originX: 'center',
      originY: 'center',
      editable: true,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    canvas.renderAll();
    setActiveTool('select');
  };

  // 2. Agregar Nota Adhesiva (Sticky Note) con edición inmediata
  const addStickyNote = (colorOpt: StickyColorOption = selectedStickyColor) => {
    const canvas = fabricCanvasRef.current;
    const fabric = (window as any).fabric;
    if (!canvas || !fabric) return;

    const center = getCanvasCenter();
    const size = 190;

    const bgRect = new fabric.Rect({
      width: size,
      height: size,
      fill: colorOpt.bg,
      stroke: colorOpt.border,
      strokeWidth: 1,
      rx: 10,
      ry: 10,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.12)',
        blur: 14,
        offsetX: 2,
        offsetY: 6,
      }),
    });

    const tape = new fabric.Rect({
      width: 52,
      height: 14,
      fill: colorOpt.tape,
      rx: 3,
      ry: 3,
      opacity: 0.85,
      top: 0,
      left: size / 2 - 26,
    });

    const stickyText = new fabric.Textbox('Escribe tu nota aquí...', {
      width: size - 32,
      fontSize: 16,
      fontFamily: 'Inter, sans-serif',
      fontWeight: '500',
      fill: colorOpt.text,
      top: 24,
      left: 16,
      textAlign: 'left',
      splitByGrapheme: true,
    });

    const group = new fabric.Group([bgRect, tape, stickyText], {
      left: center.x,
      top: center.y,
      originX: 'center',
      originY: 'center',
      subTargetCheck: true,
    });

    (group as any).isSticky = true;
    (group as any).stickyBg = bgRect;
    (group as any).stickyText = stickyText;

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    setActiveTool('select');
    setShowStickyPalette(false);
    setSelectedStickyGroup(group);

    // Abrir automáticamente el editor interactivo
    setTimeout(() => {
      openStickyEditor(group);
    }, 60);
  };

  // 3. Agregar Stickers / Emojis & Badges de Trabajo
  const addSticker = (sticker: StickerItem) => {
    const canvas = fabricCanvasRef.current;
    const fabric = (window as any).fabric;
    if (!canvas || !fabric) return;

    const center = getCanvasCenter();

    if (sticker.emoji) {
      const circleBg = new fabric.Circle({
        radius: 36,
        fill: '#ffffff',
        stroke: '#e2e8f0',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        shadow: new fabric.Shadow({
          color: 'rgba(0,0,0,0.12)',
          blur: 14,
          offsetX: 0,
          offsetY: 6,
        }),
      });

      const emojiText = new fabric.Text(sticker.emoji, {
        fontSize: 38,
        originX: 'center',
        originY: 'center',
        top: 2,
      });

      const group = new fabric.Group([circleBg, emojiText], {
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
      });

      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.renderAll();
    } else if (sticker.badge) {
      const padX = 22;
      const padY = 10;
      const fontSize = 15;

      const badgeText = new fabric.Text(sticker.badge.text, {
        fontSize,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 'bold',
        fill: sticker.badge.textColor,
        originX: 'center',
        originY: 'center',
      });

      const textWidth = badgeText.width || 120;
      const textHeight = badgeText.height || 20;

      const badgeBg = new fabric.Rect({
        width: textWidth + padX * 2,
        height: textHeight + padY * 2,
        fill: sticker.badge.bg,
        stroke: sticker.badge.border,
        strokeWidth: 2,
        rx: 16,
        ry: 16,
        originX: 'center',
        originY: 'center',
        shadow: new fabric.Shadow({
          color: 'rgba(0,0,0,0.1)',
          blur: 12,
          offsetX: 0,
          offsetY: 4,
        }),
      });

      const group = new fabric.Group([badgeBg, badgeText], {
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
      });

      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.renderAll();
    }

    setShowStickersModal(false);
    setActiveTool('select');
    toast('success', `Sticker ${sticker.label} añadido`);
  };

  // 4. Agregar Formas Geométricas
  const addShape = (shapeType: 'rect' | 'square' | 'circle' | 'triangle' | 'diamond' | 'arrow' | 'line') => {
    const canvas = fabricCanvasRef.current;
    const fabric = (window as any).fabric;
    if (!canvas || !fabric) return;

    const center = getCanvasCenter();
    let obj: any = null;

    let shapeFill = '#ffffff';
    let strokeColor = currentColor === '#ffffff' ? '#0f172a' : currentColor;

    if (shapeFillMode === 'soft') {
      const r = parseInt(strokeColor.slice(1, 3) || '25', 16) || 37;
      const g = parseInt(strokeColor.slice(3, 5) || '63', 16) || 99;
      const b = parseInt(strokeColor.slice(5, 7) || 'eb', 16) || 235;
      shapeFill = `rgba(${r}, ${g}, ${b}, 0.12)`;
    } else if (shapeFillMode === 'outline') {
      shapeFill = 'transparent';
    } else if (shapeFillMode === 'solid-color') {
      shapeFill = strokeColor;
    }

    if (shapeType === 'rect') {
      obj = new fabric.Rect({
        left: center.x,
        top: center.y,
        width: 180,
        height: 110,
        fill: shapeFill,
        stroke: strokeColor,
        strokeWidth: 2.5,
        rx: 12,
        ry: 12,
        originX: 'center',
        originY: 'center',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.08)', blur: 10, offsetY: 3 }),
      });
    } else if (shapeType === 'square') {
      obj = new fabric.Rect({
        left: center.x,
        top: center.y,
        width: 140,
        height: 140,
        fill: shapeFill,
        stroke: strokeColor,
        strokeWidth: 2.5,
        rx: 12,
        ry: 12,
        originX: 'center',
        originY: 'center',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.08)', blur: 10, offsetY: 3 }),
      });
    } else if (shapeType === 'circle') {
      obj = new fabric.Circle({
        left: center.x,
        top: center.y,
        radius: 65,
        fill: shapeFill,
        stroke: strokeColor,
        strokeWidth: 2.5,
        originX: 'center',
        originY: 'center',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.08)', blur: 10, offsetY: 3 }),
      });
    } else if (shapeType === 'triangle') {
      obj = new fabric.Triangle({
        left: center.x,
        top: center.y,
        width: 130,
        height: 115,
        fill: shapeFill,
        stroke: strokeColor,
        strokeWidth: 2.5,
        originX: 'center',
        originY: 'center',
      });
    } else if (shapeType === 'diamond') {
      const diamond = new fabric.Rect({
        width: 110,
        height: 110,
        angle: 45,
        fill: shapeFill,
        stroke: strokeColor,
        strokeWidth: 2.5,
        rx: 6,
        ry: 6,
        originX: 'center',
        originY: 'center',
      });
      obj = new fabric.Group([diamond], {
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
      });
    } else if (shapeType === 'line') {
      obj = new fabric.Line([center.x - 90, center.y, center.x + 90, center.y], {
        stroke: strokeColor,
        strokeWidth: 3,
        strokeLineCap: 'round',
      });
    } else if (shapeType === 'arrow') {
      const line = new fabric.Line([0, 0, 150, 0], {
        stroke: strokeColor,
        strokeWidth: 3.5,
        originX: 'center',
        originY: 'center',
      });
      const triangle = new fabric.Triangle({
        width: 18,
        height: 20,
        fill: strokeColor,
        left: 75,
        top: 0,
        angle: 90,
        originX: 'center',
        originY: 'center',
      });
      obj = new fabric.Group([line, triangle], {
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
      });
    }

    if (obj) {
      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.renderAll();
      setActiveTool('select');
      setShowShapesDropdown(false);
    }
  };

  // 5. Agregar Marcos (Frames)
  const addFrame = (frameType: '16:9' | '1:1' | '9:16' | 'a4') => {
    const canvas = fabricCanvasRef.current;
    const fabric = (window as any).fabric;
    if (!canvas || !fabric) return;

    const center = getCanvasCenter();
    let w = 1920;
    let h = 1080;
    let label = 'Presentación (16:9)';

    if (frameType === '1:1') {
      w = 1080;
      h = 1080;
      label = 'Post Cuadrado (1:1)';
    } else if (frameType === '9:16') {
      w = 1080;
      h = 1920;
      label = 'Móvil / Reel (9:16)';
    } else if (frameType === 'a4') {
      w = 1240;
      h = 1754;
      label = 'Documento A4';
    }

    const frameRect = new fabric.Rect({
      left: center.x,
      top: center.y,
      width: w,
      height: h,
      fill: '#ffffff',
      stroke: '#94a3b8',
      strokeWidth: 1.5,
      strokeDashArray: [8, 6],
      originX: 'center',
      originY: 'center',
      rx: 12,
      ry: 12,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.06)',
        blur: 20,
        offsetY: 8,
      }),
    });

    const frameLabel = new fabric.Text(label, {
      left: center.x - w / 2,
      top: center.y - h / 2 - 24,
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      fontWeight: 'bold',
      fill: '#64748b',
    });

    canvas.add(frameRect);
    canvas.add(frameLabel);
    canvas.setActiveObject(frameRect);
    canvas.renderAll();
    setActiveTool('select');
  };

  // 6. Inserción de Plantillas Prediseñadas
  const insertTemplate = (templateType: 'kanban' | 'swot' | 'rotulo') => {
    const canvas = fabricCanvasRef.current;
    const fabric = (window as any).fabric;
    if (!canvas || !fabric) return;

    const center = getCanvasCenter();

    if (templateType === 'kanban') {
      const colWidth = 260;
      const colHeight = 500;
      const gap = 20;
      const cols = [
        { title: 'Por Hacer', color: '#ef4444' },
        { title: 'En Proceso', color: '#f59e0b' },
        { title: 'Terminado', color: '#10b981' },
      ];

      cols.forEach((c, idx) => {
        const x = center.x - 300 + idx * (colWidth + gap);
        const y = center.y;

        const colRect = new fabric.Rect({
          width: colWidth,
          height: colHeight,
          fill: '#f1f5f9',
          rx: 12,
          ry: 12,
          stroke: '#cbd5e1',
          strokeWidth: 1,
        });

        const colHeader = new fabric.Rect({
          width: colWidth,
          height: 44,
          fill: c.color,
          rx: 12,
          ry: 12,
        });

        const colTitle = new fabric.Text(c.title, {
          fontSize: 16,
          fontWeight: 'bold',
          fill: '#ffffff',
          left: 16,
          top: 12,
          fontFamily: 'Inter, sans-serif',
        });

        const colGroup = new fabric.Group([colRect, colHeader, colTitle], {
          left: x,
          top: y,
          originX: 'center',
          originY: 'center',
        });

        canvas.add(colGroup);
      });
    } else if (templateType === 'swot') {
      const size = 320;
      const quadrants = [
        { label: 'Fortalezas (F)', color: '#dcfce7', textCol: '#15803d', x: -170, y: -170 },
        { label: 'Oportunidades (O)', color: '#dbeafe', textCol: '#1d4ed8', x: 170, y: -170 },
        { label: 'Debilidades (D)', color: '#fee2e2', textCol: '#b91c1c', x: -170, y: 170 },
        { label: 'Amenazas (A)', color: '#fef3c7', textCol: '#b45309', x: 170, y: 170 },
      ];

      quadrants.forEach((q) => {
        const box = new fabric.Rect({
          width: size,
          height: size,
          fill: q.color,
          rx: 16,
          ry: 16,
          stroke: '#cbd5e1',
          strokeWidth: 1,
        });

        const label = new fabric.Text(q.label, {
          fontSize: 18,
          fontWeight: 'bold',
          fill: q.textCol,
          left: 20,
          top: 20,
          fontFamily: 'Inter, sans-serif',
        });

        const group = new fabric.Group([box, label], {
          left: center.x + q.x,
          top: center.y + q.y,
          originX: 'center',
          originY: 'center',
        });

        canvas.add(group);
      });
    } else if (templateType === 'rotulo') {
      const box = new fabric.Rect({
        width: 320,
        height: 110,
        fill: '#0f172a',
        rx: 12,
        ry: 12,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.15)', blur: 12, offsetY: 4 }),
      });

      const title = new fabric.Text(boardTitle.toUpperCase(), {
        fontSize: 18,
        fontWeight: 'bold',
        fill: '#ffffff',
        left: 20,
        top: 20,
        fontFamily: 'Inter, sans-serif',
      });

      const sub = new fabric.Text(
        `CLIENTE: ${folder?.name || 'ROMA AGENCIA'} • ${new Date().toLocaleDateString()}`,
        {
          fontSize: 11,
          fontWeight: 'bold',
          fill: '#94a3b8',
          left: 20,
          top: 55,
          fontFamily: 'Inter, sans-serif',
        }
      );

      const group = new fabric.Group([box, title, sub], {
        left: center.x,
        top: center.y,
        originX: 'center',
        originY: 'center',
      });

      canvas.add(group);
    }

    canvas.renderAll();
    setShowTemplatesSidebar(false);
    toast('success', 'Plantilla insertada en el lienzo');
  };

  // 7. Subir imagen al lienzo
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      toast('info', 'Subiendo imagen...');
      const res = await apiFetch('/api/workspace/whiteboards/upload-asset', {
        method: 'POST',
        body: formData,
      });

      if (res && res.url) {
        insertImageOnCanvas(res.url);
      }
    } catch (err: any) {
      toast('error', 'Error al subir imagen: ' + err.message);
    }
  };

  const insertImageOnCanvas = (url: string) => {
    const canvas = fabricCanvasRef.current;
    const fabric = (window as any).fabric;
    if (!canvas || !fabric) return;

    fabric.Image.fromURL(
      url,
      (img: any) => {
        if (!img) return;
        const center = getCanvasCenter();
        img.scaleToWidth(Math.min(450, canvas.getWidth() * 0.4));
        img.set({
          left: center.x,
          top: center.y,
          originX: 'center',
          originY: 'center',
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetY: 4 }),
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        toast('success', 'Imagen insertada');
      },
      { crossOrigin: 'anonymous' }
    );
  };

  // Guardar Canvas (Autosave & Manual)
  const saveCanvasData = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      setSaveStatus('saving');
      const contentJson = JSON.stringify(canvas.toJSON(['id', 'isSticky', 'isFrame']));
      const thumbnail = canvas.toDataURL({
        format: 'jpeg',
        quality: 0.6,
        multiplier: 0.25,
      });

      await apiFetch(`/api/workspace/whiteboards/${whiteboardId}/canvas`, {
        method: 'PUT',
        body: JSON.stringify({
          content: contentJson,
          thumbnail,
        }),
      });

      setSaveStatus('saved');
    } catch (err) {
      console.error('Error saving canvas:', err);
      setSaveStatus('unsaved');
    }
  };

  const triggerAutoSave = () => {
    setSaveStatus('unsaved');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      saveCanvasData();
    }, 2500);
  };

  // Historial Undo / Redo
  const pushHistoryState = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    setHistoryStack((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(json);
      return next.slice(-25);
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    isUndoRedoAction.current = true;
    const targetState = historyStack[historyIndex - 1];
    canvas.loadFromJSON(JSON.parse(targetState), () => {
      canvas.renderAll();
      setHistoryIndex((prev) => prev - 1);
      isUndoRedoAction.current = false;
      updateMinimap();
    });
  };

  const handleRedo = () => {
    if (historyIndex >= historyStack.length - 1) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    isUndoRedoAction.current = true;
    const targetState = historyStack[historyIndex + 1];
    canvas.loadFromJSON(JSON.parse(targetState), () => {
      canvas.renderAll();
      setHistoryIndex((prev) => prev + 1);
      isUndoRedoAction.current = false;
      updateMinimap();
    });
  };

  // -------------------------------------------------------------
  // CONTROLES DE ZOOM RÁPIDO & AJUSTE AL CONTENIDO
  // -------------------------------------------------------------
  const applyZoom = (delta: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    let zoom = canvas.getZoom() + delta;
    if (zoom < 0.1) zoom = 0.1;
    if (zoom > 5) zoom = 5;
    canvas.setZoom(zoom);
    setZoomLevel(Math.round(zoom * 100));
    canvas.renderAll();
    updateMinimap();
  };

  const setExactZoom = (percent: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const zoom = percent / 100;
    canvas.setZoom(zoom);
    setZoomLevel(percent);
    canvas.renderAll();
    updateMinimap();
    setShowZoomDropdown(false);
  };

  const resetZoom = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setZoom(1);
    setZoomLevel(100);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();
    updateMinimap();
    setShowZoomDropdown(false);
  };

  const fitToContent = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length === 0) {
      resetZoom();
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    objects.forEach((obj: any) => {
      const bound = obj.getBoundingRect(true, true);
      minX = Math.min(minX, bound.left);
      minY = Math.min(minY, bound.top);
      maxX = Math.max(maxX, bound.left + bound.width);
      maxY = Math.max(maxY, bound.top + bound.height);
    });

    const padding = 100;
    const objWidth = Math.max(120, maxX - minX + padding * 2);
    const objHeight = Math.max(120, maxY - minY + padding * 2);
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    const scaleX = canvasWidth / objWidth;
    const scaleY = canvasHeight / objHeight;
    let newZoom = Math.min(scaleX, scaleY, 1.4);
    newZoom = Math.max(0.15, Math.min(newZoom, 3));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const vpt = canvas.viewportTransform;
    vpt[0] = newZoom;
    vpt[3] = newZoom;
    vpt[4] = canvasWidth / 2 - centerX * newZoom;
    vpt[5] = canvasHeight / 2 - centerY * newZoom;

    canvas.setViewportTransform(vpt);
    setZoomLevel(Math.round(newZoom * 100));
    canvas.renderAll();
    updateMinimap();
    setShowZoomDropdown(false);
    toast('info', 'Vista ajustada a los elementos');
  };

  // Minimapa de navegación
  const updateMinimap = () => {
    const canvas = fabricCanvasRef.current;
    const miniCanvas = minimapCanvasRef.current;
    if (!canvas || !miniCanvas || !showMinimap) return;

    const ctx = miniCanvas.getContext('2d');
    if (!ctx) return;

    const miniW = (miniCanvas.width = 160);
    const miniH = (miniCanvas.height = 100);

    ctx.clearRect(0, 0, miniW, miniH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, miniW, miniH);

    const objects = canvas.getObjects();
    const scale = 0.05;

    ctx.fillStyle = '#94a3b8';
    objects.forEach((obj: any) => {
      const left = (obj.left || 0) * scale + miniW / 2;
      const top = (obj.top || 0) * scale + miniH / 2;
      const w = Math.max(2, (obj.width || 20) * scale);
      const h = Math.max(2, (obj.height || 20) * scale);
      ctx.fillRect(left, top, w, h);
    });

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(miniW / 2 - 30, miniH / 2 - 20, 60, 40);
  };

  // Exportar Canvas
  const handleExport = (type: 'png' | 'jpeg' | 'pdf' | 'json') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setShowExportDropdown(false);

    if (type === 'png' || type === 'jpeg') {
      const dataUrl = canvas.toDataURL({
        format: type,
        multiplier: 2,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${boardTitle.replace(/\s+/g, '_')}.${type}`;
      a.click();
      toast('success', `Exportado como ${type.toUpperCase()}`);
    } else if (type === 'pdf') {
      const jsPDF = (window as any).jspdf?.jsPDF || (window as any).jsPDF;
      if (!jsPDF) {
        toast('error', 'Biblioteca jsPDF no disponible');
        return;
      }
      const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier: 1.5 });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.getWidth(), canvas.getHeight()] });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, canvas.getWidth(), canvas.getHeight());
      pdf.save(`${boardTitle.replace(/\s+/g, '_')}.pdf`);
      toast('success', 'Exportado como PDF');
    } else if (type === 'json') {
      const json = JSON.stringify(canvas.toJSON(), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${boardTitle.replace(/\s+/g, '_')}.roma.json`;
      a.click();
      toast('success', 'JSON exportado');
    }
  };

  // Limpiar lienzo
  const handleClearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (window.confirm('¿Seguro que deseas limpiar todo el lienzo?')) {
      canvas.clear();
      applyBackground(canvasBg, solidBgColor);
      setSelectedStickyGroup(null);
      setEditingSticky(null);
      triggerAutoSave();
      pushHistoryState();
      updateMinimap();
      toast('info', 'Lienzo reiniciado');
    }
  };

  // Guardar Título
  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    if (!boardTitle.trim()) return;
    try {
      await apiFetch(`/api/workspace/whiteboards/${whiteboardId}`, {
        method: 'PUT',
        body: JSON.stringify({ title: boardTitle.trim() }),
      });
      toast('success', 'Título guardado');
    } catch (err: any) {
      toast('error', 'Error al guardar título');
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden select-none">
      {/* 1. BARRA SUPERIOR DE NAVEGACIÓN Y ACCIONES */}
      <div className="h-14 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 flex items-center justify-between z-30 shrink-0 shadow-xs">
        {/* Izquierda: Volver, Título y Carpeta */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Pizarras</span>
          </button>

          {folder && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: folder.color }} />
              <span>{folder.name}</span>
            </div>
          )}

          {/* Título editable */}
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <input
                type="text"
                autoFocus
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="px-2 py-1 rounded-lg border-2 border-purple-500 bg-white dark:bg-slate-800 text-xs font-black text-slate-900 dark:text-white outline-none ring-2 ring-purple-500/20"
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 hover:underline truncate max-w-[180px] sm:max-w-xs transition"
                title="Haz clic para renombrar"
              >
                {boardTitle}
              </h2>
            )}
          </div>

          {/* Deshacer / Rehacer */}
          <div className="hidden md:flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-3">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer"
              title="Deshacer (Ctrl + Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= historyStack.length - 1}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer"
              title="Rehacer (Ctrl + Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Derecha: Indicador Guardado, Fondo, Ayuda Atajos, Compartir y Exportar */}
        <div className="flex items-center gap-2">
          {/* Indicador de Autosave */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {saveStatus === 'saved' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 font-extrabold">Guardado</span>
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="hidden sm:inline text-amber-600">Guardando...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <button
                  type="button"
                  onClick={saveCanvasData}
                  className="hover:underline font-black text-amber-600 dark:text-amber-400 cursor-pointer"
                >
                  Guardar (Ctrl+S)
                </button>
              </>
            )}
          </div>

          {/* Selector de Fondo */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBgDropdown(!showBgDropdown)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Fondo del lienzo"
            >
              <Grid className="w-4 h-4" />
            </button>

            {showBgDropdown && (
              <div
                onMouseLeave={() => setShowBgDropdown(false)}
                className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-2 space-y-1 animate-fadeIn"
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                  Patrón de Fondo
                </div>
                {(['dots', 'grid', 'lines', 'solid'] as BgType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setCanvasBg(type);
                      setShowBgDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      canvasBg === type
                        ? 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>
                      {type === 'dots'
                        ? 'Puntos'
                        : type === 'grid'
                        ? 'Cuadrícula'
                        : type === 'lines'
                        ? 'Líneas'
                        : 'Sólido'}
                    </span>
                    {canvasBg === type && <Check className="w-3.5 h-3.5 text-purple-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón de Ayuda de Atajos y Gestos de Laptop */}
          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Atajos de teclado y gestos de laptop (?)"
          >
            <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </button>

          {/* Compartir */}
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-100 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compartir</span>
          </button>

          {/* Exportar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showExportDropdown && (
              <div
                onMouseLeave={() => setShowExportDropdown(false)}
                className="absolute right-0 top-full mt-1.5 w-52 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-2 space-y-1 animate-fadeIn"
              >
                <button
                  type="button"
                  onClick={() => handleExport('png')}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-emerald-500" />
                  <span>Imagen PNG (Alta Calidad)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('jpeg')}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-blue-500" />
                  <span>Imagen JPEG</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-red-500" />
                  <span>Documento PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-purple-500" />
                  <span>Exportar JSON (ROMA)</span>
                </button>
              </div>
            )}
          </div>

          {/* Limpiar lienzo */}
          <button
            type="button"
            onClick={handleClearCanvas}
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
            title="Limpiar todo el lienzo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. ÁREA DE LIENZO Y HERRAMIENTAS FLOTANTES */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>

        {/* ----------------------------------------------------------------- */}
        {/* BARRA CONTEXTUAL FLOTANTE PARA NOTA ADHESIVA SELECCIONADA         */}
        {/* ----------------------------------------------------------------- */}
        {selectedStickyGroup && !editingSticky && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl px-3 py-1.5 shadow-2xl flex items-center gap-2 animate-fadeIn">
            <button
              type="button"
              onClick={() => openStickyEditor(selectedStickyGroup)}
              className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar Texto (Doble Clic / Enter)</span>
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-1.5">
              {STICKY_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    updateStickyVisuals(selectedStickyGroup, c);
                    triggerAutoSave();
                  }}
                  className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-125 transition transform cursor-pointer"
                  style={{ backgroundColor: c.bg }}
                  title={`Cambiar color a ${c.name}`}
                />
              ))}
            </div>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
            <button
              type="button"
              onClick={() => {
                const canvas = fabricCanvasRef.current;
                if (canvas && selectedStickyGroup) {
                  canvas.remove(selectedStickyGroup);
                  canvas.discardActiveObject();
                  canvas.renderAll();
                  setSelectedStickyGroup(null);
                  triggerAutoSave();
                  pushHistoryState();
                  updateMinimap();
                }
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
              title="Eliminar nota"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* EDITOR INTERACTIVO INLINE DE NOTA ADHESIVA (POST-IT)             */}
        {/* ----------------------------------------------------------------- */}
        {editingSticky && (
          <div
            className="absolute z-50 animate-scaleUp"
            style={{
              left: Math.max(16, Math.min((containerRef.current?.clientWidth || 800) - 260, editingSticky.screenX)),
              top: Math.max(16, Math.min((containerRef.current?.clientHeight || 600) - 240, editingSticky.screenY)),
              width: Math.max(210, editingSticky.width),
            }}
          >
            {/* Barra superior de la nota: Paleta de color y botón Listo */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 mb-1.5 shadow-xl">
              <div className="flex items-center gap-1.5">
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setEditingSticky((prev) => (prev ? { ...prev, color: c } : null));
                      updateStickyVisuals(editingSticky.group, c);
                    }}
                    className={`w-4 h-4 rounded-full border transition transform hover:scale-125 cursor-pointer ${
                      editingSticky.color.id === c.id ? 'ring-2 ring-purple-600 scale-110' : 'border-slate-300 dark:border-slate-600'
                    }`}
                    style={{ backgroundColor: c.bg }}
                    title={c.name}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleSaveSticky(tempStickyText, editingSticky.color)}
                className="px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Listo</span>
              </button>
            </div>

            {/* Cuadro de texto interactivo con estilo Tailwind */}
            <div
              className="p-3.5 rounded-2xl shadow-2xl border transition-all"
              style={{
                backgroundColor: editingSticky.color.bg,
                borderColor: editingSticky.color.border,
              }}
            >
              <div
                className="w-12 h-3 mx-auto mb-2 rounded-xs opacity-75"
                style={{ backgroundColor: editingSticky.color.tape }}
              />
              <textarea
                autoFocus
                value={tempStickyText}
                onChange={(e) => setTempStickyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleSaveSticky(tempStickyText, editingSticky.color);
                  } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSaveSticky(tempStickyText, editingSticky.color);
                  }
                }}
                placeholder="Escribe tu nota aquí..."
                rows={4}
                className="w-full bg-transparent resize-none outline-none text-sm font-medium leading-relaxed"
                style={{
                  color: editingSticky.color.text,
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              <div
                className="flex items-center justify-between text-[10px] font-semibold opacity-60 mt-1"
                style={{ color: editingSticky.color.text }}
              >
                <span>Ctrl + Enter para guardar</span>
                <span>Esc para salir</span>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* 3. TOOLBAR FLOTANTE DE HERRAMIENTAS (MODERNA CON TAILWIND GLASS)   */}
        {/* ----------------------------------------------------------------- */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1 max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar">
          {/* Herramienta: Seleccionar [V] */}
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            className={`relative p-2.5 rounded-xl transition cursor-pointer ${
              activeTool === 'select'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Seleccionar y mover objetos [V]"
          >
            <MousePointer className="w-4 h-4" />
          </button>

          {/* Herramienta: Manito / Pan [H] */}
          <button
            type="button"
            onClick={() => setActiveTool('pan')}
            className={`relative p-2.5 rounded-xl transition cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Mover lienzo libremente [H] o mantén la barra Espacio"
          >
            <Hand className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Herramienta: Lápiz [P / D] */}
          <button
            type="button"
            onClick={() => setActiveTool('draw')}
            className={`p-2.5 rounded-xl transition cursor-pointer ${
              activeTool === 'draw'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Dibujo a mano alzada [P / D]"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Herramienta: Resaltador [B] */}
          <button
            type="button"
            onClick={() => setActiveTool('highlighter')}
            className={`p-2.5 rounded-xl transition cursor-pointer ${
              activeTool === 'highlighter'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Resaltador translúcido [B]"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Herramienta: Borrador [E] */}
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-2.5 rounded-xl transition cursor-pointer ${
              activeTool === 'eraser'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Borrador de elementos [E]"
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* Selector de Color */}
          <div className="relative flex items-center gap-1 px-1">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
              title="Paleta completa de colores"
            />
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Herramienta: Texto [T] */}
          <button
            type="button"
            onClick={addText}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Insertar texto enriquecido [T]"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Herramienta: Notas Adhesivas (Post-its) [N / S] */}
          <div className="relative">
            <button
              type="button"
              onClick={() => addStickyNote(selectedStickyColor)}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowStickyPalette(!showStickyPalette);
              }}
              className="p-2.5 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer flex items-center gap-1"
              title="Nota Adhesiva (Post-It) [N / S] — Clic derecho para cambiar color"
            >
              <StickyNote className="w-4 h-4" />
              <span className={`w-2 h-2 rounded-full ${selectedStickyColor.dotColor}`} />
            </button>

            {showStickyPalette && (
              <div
                onMouseLeave={() => setShowStickyPalette(false)}
                className="absolute bottom-full left-0 mb-2 w-44 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-2 space-y-1 animate-fadeIn"
              >
                <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">
                  Color de Nota
                </div>
                {STICKY_COLORS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedStickyColor(opt);
                      addStickyNote(opt);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md border border-slate-300 dark:border-slate-600" style={{ backgroundColor: opt.bg }} />
                      <span>{opt.name}</span>
                    </div>
                    {selectedStickyColor.id === opt.id && <Check className="w-3.5 h-3.5 text-purple-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Herramienta: Stickers & Emojis [K] */}
          <button
            type="button"
            onClick={() => setShowStickersModal(!showStickersModal)}
            className={`p-2.5 rounded-xl transition cursor-pointer ${
              showStickersModal
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
            }`}
            title="Stickers y Emojis de Reacción [K]"
          >
            <SmilePlus className="w-4 h-4" />
          </button>

          {/* Herramienta: Formas Geométricas */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowShapesDropdown(!showShapesDropdown)}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-0.5"
              title="Formas Geométricas: Rectángulos [R], Cuadrados [Q], Círculos [C]"
            >
              <Square className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showShapesDropdown && (
              <div
                onMouseLeave={() => setShowShapesDropdown(false)}
                className="absolute bottom-full left-0 mb-2 w-52 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 p-2 space-y-1.5 animate-fadeIn"
              >
                <div className="text-[10px] font-black uppercase text-slate-400 px-2 pt-1">
                  Formas Geométricas
                </div>

                <button
                  type="button"
                  onClick={() => addShape('rect')}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Square className="w-4 h-4 text-purple-600" />
                    <span>Rectángulo</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">R</span>
                </button>

                <button
                  type="button"
                  onClick={() => addShape('square')}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Square className="w-4 h-4 text-indigo-600" />
                    <span>Cuadrado 1:1</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Q</span>
                </button>

                <button
                  type="button"
                  onClick={() => addShape('circle')}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Circle className="w-4 h-4 text-emerald-600" />
                    <span>Círculo</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">C</span>
                </button>

                <button
                  type="button"
                  onClick={() => addShape('triangle')}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Triangle className="w-4 h-4 text-amber-600" />
                  <span>Triángulo</span>
                </button>

                <button
                  type="button"
                  onClick={() => addShape('diamond')}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Diamond className="w-4 h-4 text-pink-600" />
                  <span>Rombo / Decisión</span>
                </button>

                <button
                  type="button"
                  onClick={() => addShape('arrow')}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <MoveRight className="w-4 h-4 text-cyan-600" />
                  <span>Flecha Conectora</span>
                </button>

                <button
                  type="button"
                  onClick={() => addShape('line')}
                  className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <Minus className="w-4 h-4 text-slate-600" />
                  <span>Línea Divisoria</span>
                </button>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-[10px] font-black uppercase text-slate-400 px-2 mb-1">
                    Estilo de Relleno
                  </div>
                  <div className="grid grid-cols-2 gap-1 px-1">
                    <button
                      type="button"
                      onClick={() => setShapeFillMode('soft')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center transition cursor-pointer ${
                        shapeFillMode === 'soft'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      Suave (15%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShapeFillMode('solid-white')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center transition cursor-pointer ${
                        shapeFillMode === 'solid-white'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      Blanco
                    </button>
                    <button
                      type="button"
                      onClick={() => setShapeFillMode('outline')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center transition cursor-pointer ${
                        shapeFillMode === 'outline'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      Solo Borde
                    </button>
                    <button
                      type="button"
                      onClick={() => setShapeFillMode('solid-color')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold text-center transition cursor-pointer ${
                        shapeFillMode === 'solid-color'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      Sólido Color
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Herramienta: Marcos (Frames) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFramesDropdown(!showFramesDropdown)}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Marcos de Presentación y Medios (16:9, 1:1, 9:16)"
            >
              <Columns className="w-4 h-4" />
            </button>

            {showFramesDropdown && (
              <div
                onMouseLeave={() => setShowFramesDropdown(false)}
                className="absolute bottom-full left-0 mb-2 w-48 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-2 space-y-1 animate-fadeIn"
              >
                <button
                  type="button"
                  onClick={() => {
                    addFrame('16:9');
                    setShowFramesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Presentación (16:9)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addFrame('1:1');
                    setShowFramesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Post Cuadrado (1:1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addFrame('9:16');
                    setShowFramesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Móvil / Story (9:16)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addFrame('a4');
                    setShowFramesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Documento A4
                </button>
              </div>
            )}
          </div>

          {/* Herramienta: Subir Imagen */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Subir imagen al lienzo"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadImage}
            accept="image/*"
            className="hidden"
          />

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Plantillas Prediseñadas */}
          <button
            type="button"
            onClick={() => setShowTemplatesSidebar(!showTemplatesSidebar)}
            className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition cursor-pointer"
            title="Plantillas y Componentes rápidos"
          >
            <LayoutTemplate className="w-4 h-4" />
          </button>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* 4. MODAL FLOTANTE DE STICKERS (REACCIONES Y BADGES TAILWIND)      */}
        {/* ----------------------------------------------------------------- */}
        {showStickersModal && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 rounded-3xl p-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStickersCategory('reactions')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    stickersCategory === 'reactions'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Reacciones
                </button>
                <button
                  type="button"
                  onClick={() => setStickersCategory('badges')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    stickersCategory === 'badges'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sellos / Badges
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowStickersModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {stickersCategory === 'reactions' ? (
              <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto p-1">
                {STICKERS_CATALOG.filter((s) => s.category === 'reactions').map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => addSticker(sticker)}
                    className="h-12 flex items-center justify-center text-2xl rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:scale-115 transition transform cursor-pointer border border-slate-100 dark:border-slate-800"
                    title={sticker.label}
                  >
                    {sticker.emoji}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto p-1">
                {STICKERS_CATALOG.filter((s) => s.category === 'badges').map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => addSticker(sticker)}
                    className="w-full p-2.5 rounded-2xl text-left font-bold text-xs transition cursor-pointer flex items-center justify-between border hover:scale-[1.02] transform shadow-xs"
                    style={{
                      backgroundColor: sticker.badge?.bg,
                      color: sticker.badge?.textColor,
                      borderColor: sticker.badge?.border,
                    }}
                  >
                    <span>{sticker.badge?.text}</span>
                    <span className="text-[10px] opacity-75 font-mono uppercase">Insertar</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* 5. CONTROLES DE ZOOM RÁPIDO FLOTANTES (BOTTOM RIGHT)              */}
        {/* ----------------------------------------------------------------- */}
        <div className="absolute bottom-6 right-6 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => applyZoom(-0.2)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Alejar [-]"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowZoomDropdown(!showZoomDropdown)}
              className="px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer flex items-center gap-1"
              title="Ajustar nivel de zoom"
            >
              <span>{zoomLevel}%</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showZoomDropdown && (
              <div
                onMouseLeave={() => setShowZoomDropdown(false)}
                className="absolute bottom-full right-0 mb-2 w-44 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 p-2 space-y-1 animate-fadeIn"
              >
                <button
                  type="button"
                  onClick={fitToContent}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 flex items-center justify-between cursor-pointer"
                >
                  <span>Ajustar al contenido</span>
                  <span className="text-[10px] font-mono text-slate-400">F</span>
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                {[25, 50, 75, 100, 150, 200].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setExactZoom(val)}
                    className={`w-full px-3 py-1 rounded-lg text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      zoomLevel === val
                        ? 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{val}%</span>
                    {zoomLevel === val && <Check className="w-3.5 h-3.5 text-purple-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => applyZoom(0.2)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Acercar [+]"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={fitToContent}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Ajustar y encuadrar todo [F]"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* 6. MINIMAPA DE NAVEGACIÓN FLOTANTE                                */}
        {/* ----------------------------------------------------------------- */}
        {showMinimap && (
          <div className="absolute bottom-20 right-6 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xl hidden md:block">
            <canvas ref={minimapCanvasRef} className="rounded-xl border border-slate-100 dark:border-slate-800" />
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* 7. SIDEBAR FLOTANTE DE PLANTILLAS                                 */}
        {/* ----------------------------------------------------------------- */}
        {showTemplatesSidebar && (
          <div className="absolute top-4 left-4 bottom-24 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl z-30 flex flex-col overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Plantillas & Bloques
              </h3>
              <button
                type="button"
                onClick={() => setShowTemplatesSidebar(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => insertTemplate('kanban')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-left transition flex items-center gap-3 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center shrink-0">
                  <Kanban className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600">
                    Tablero Kanban (3 Col)
                  </h4>
                  <p className="text-[10px] text-slate-400">Por hacer, En proceso, Terminado</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => insertTemplate('swot')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-left transition flex items-center gap-3 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600">
                    Matriz FODA / SWOT
                  </h4>
                  <p className="text-[10px] text-slate-400">Fortalezas, Oportunidades, etc.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => insertTemplate('rotulo')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-left transition flex items-center gap-3 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600">
                    Rótulo de Proyecto
                  </h4>
                  <p className="text-[10px] text-slate-400">Ficha técnica y nombre de campaña</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* 8. MODAL DE AYUDA DE ATAJOS Y GESTOS DE LAPTOP / TOUCH           */}
        {/* ----------------------------------------------------------------- */}
        {showShortcutsModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scaleUp">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Navegación Rápida & Gestos
                    </h3>
                    <p className="text-xs text-slate-500">Diseñado para teclado, mouse y laptops con trackpad/touch</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShortcutsModal(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-purple-600 dark:text-purple-400 mb-2">
                    <Laptop className="w-4 h-4" />
                    <span>Trackpad de Laptop & Pantalla Touch</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white">2 Dedos Deslizar</div>
                      <div className="text-slate-500 text-[11px]">Paneo fluido y continuo por el lienzo</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white">Pellizcar (Pinch to Zoom)</div>
                      <div className="text-slate-500 text-[11px]">Zoom instantáneo centrado en tu cursor</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white">Espacio + Arrastre</div>
                      <div className="text-slate-500 text-[11px]">Mover lienzo sin cambiar de herramienta</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white">Rueda central de mouse</div>
                      <div className="text-slate-500 text-[11px]">Clic y arrastre para paneo rápido</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 mb-2">
                    <Keyboard className="w-4 h-4" />
                    <span>Atajos de Teclado Esenciales</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Seleccionar / Mover</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">V</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Mano de Paneo</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">H o Espacio</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Lápiz / Pincel</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">P o D</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Resaltador / Borrador</span>
                      <div className="flex gap-1">
                        <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">B</kbd>
                        <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">E</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Texto / Nota Adhesiva (Post-It)</span>
                      <div className="flex gap-1">
                        <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">T</kbd>
                        <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">N o S</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Editar Nota Seleccionada</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">Doble Clic o Enter</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Rectángulo / Cuadrado / Círculo</span>
                      <div className="flex gap-1">
                        <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">R</kbd>
                        <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">Q</kbd>
                        <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">C</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Stickers y Emojis</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">K</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Ajustar al Contenido / Zoom 100%</span>
                      <div className="flex gap-1">
                        <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">F</kbd>
                        <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">0</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Deshacer / Rehacer</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">Ctrl + Z / Ctrl + Y</kbd>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Guardar Pizarra</span>
                      <kbd className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-mono text-[11px] font-bold shadow-xs">Ctrl + S</kbd>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowShortcutsModal(false)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-purple-500/20"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Compartir */}
      {showShareModal && (
        <WhiteboardShareModal
          isOpen={showShareModal}
          whiteboardId={whiteboardId}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};
