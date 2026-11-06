import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Check,
  Share2,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
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
  Star,
  MoveRight,
  Minus,
  Sparkles,
  Image as ImageIcon,
  Grid,
  Palette,
  ChevronDown,
  FileDown,
  FileCode,
  LayoutTemplate,
  Kanban,
  Columns,
  Layers,
  Presentation,
  Flame,
} from 'lucide-react';
import { Whiteboard, WhiteboardFolder } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';
import { WhiteboardShareModal } from './WhiteboardShareModal';

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
  | 'frame'
  | 'laser';

type BgType = 'dots' | 'grid' | 'lines' | 'solid';

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
  const [currentStickyColor, setCurrentStickyColor] = useState('#fef08a'); // Amarillo post-it por defecto
  const [brushWidth, setBrushWidth] = useState(3);
  const [activeShape, setActiveShape] = useState<'rect' | 'circle' | 'triangle' | 'star' | 'arrow' | 'line'>('rect');
  const [activeFrame, setActiveFrame] = useState<'16:9' | '1:1' | '9:16' | 'a4'>('16:9');
  const [canvasBg, setCanvasBg] = useState<BgType>('dots');
  const [solidBgColor, setSolidBgColor] = useState('#f8fafc');

  // Menús desplegables
  const [showBgDropdown, setShowBgDropdown] = useState(false);
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);
  const [showFramesDropdown, setShowFramesDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showTemplatesSidebar, setShowTemplatesSidebar] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Zoom & Panning
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Estado de guardado y Undo/Redo
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);
  const autoSaveTimerRef = useRef<any>(null);

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

  // Inicializar Fabric Canvas
  const initFabricCanvas = (initialContent?: string) => {
    const fabric = (window as any).fabric;
    if (!fabric) {
      setTimeout(() => initFabricCanvas(initialContent), 200);
      return;
    }

    if (!canvasElRef.current || !containerRef.current) return;

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width,
      height,
      selection: true,
      preserveObjectStacking: true,
      fireRightClick: true,
      stopContextMenu: true,
      renderOnAddRemove: true,
    });

    fabricCanvasRef.current = canvas;

    // Configurar fondo inicial
    applyBackground(canvas, canvasBg, solidBgColor);

    // Cargar contenido previo si existe
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

    // Eventos de Fabric
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

    // Panning con Rueda de Ratón o Drag
    canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 5) zoom = 5;
      if (zoom < 0.1) zoom = 0.1;
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      setZoomLevel(Math.round(zoom * 100));
      opt.e.preventDefault();
      opt.e.stopPropagation();
      updateMinimap();
    });

    // Soporte Panning con Espacio o Herramienta 'pan'
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on('mouse:down', (opt: any) => {
      const evt = opt.e;
      if (activeTool === 'pan' || evt.spaceKey || evt.altKey) {
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
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        vpt[4] += e.clientX - lastPosX;
        vpt[5] += e.clientY - lastPosY;
        canvas.requestRenderAll();
        lastPosX = e.clientX;
        lastPosY = e.clientY;
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

    // Redimensionamiento responsivo
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
  const applyBackground = (canvas: any, type: BgType, solidColor = '#f8fafc') => {
    if (!canvas) return;
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

    // Resetear modos
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
      // Aplicar color con opacidad 40%
      const r = parseInt(currentColor.slice(1, 3) || 'ff', 16) || 250;
      const g = parseInt(currentColor.slice(3, 5) || 'cc', 16) || 204;
      const b = parseInt(currentColor.slice(5, 7) || '00', 16) || 21;
      canvas.freeDrawingBrush.color = `rgba(${r}, ${g}, ${b}, 0.35)`;
      canvas.freeDrawingBrush.width = 24;
    } else if (activeTool === 'eraser') {
      canvas.defaultCursor = 'crosshair';
    } else if (activeTool === 'laser') {
      canvas.defaultCursor = 'crosshair';
    }
  }, [activeTool, currentColor, brushWidth]);

  // Actualizar fondo al cambiar estado
  useEffect(() => {
    if (fabricCanvasRef.current) {
      applyBackground(fabricCanvasRef.current, canvasBg, solidBgColor);
    }
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

  // 2. Agregar Nota Adhesiva (Sticky Note) con sombra y efecto doblado
  const addStickyNote = (stickyColor = currentStickyColor) => {
    const canvas = fabricCanvasRef.current;
    const fabric = (window as any).fabric;
    if (!canvas || !fabric) return;

    const center = getCanvasCenter();
    const size = 180;

    const bgRect = new fabric.Rect({
      width: size,
      height: size,
      fill: stickyColor,
      rx: 4,
      ry: 4,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.12)',
        blur: 10,
        offsetX: 2,
        offsetY: 4,
      }),
    });

    const stickyText = new fabric.Textbox('Nota rápida...', {
      width: size - 30,
      fontSize: 16,
      fontFamily: 'Inter, cursive, sans-serif',
      fill: '#1e293b',
      top: 15,
      left: 15,
      textAlign: 'left',
      splitByGrapheme: true,
    });

    const group = new fabric.Group([bgRect, stickyText], {
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
  };

  // 3. Agregar Formas Geométricas
  const addShape = (shapeType: 'rect' | 'circle' | 'triangle' | 'star' | 'arrow' | 'line') => {
    const canvas = fabricCanvasRef.current;
    const fabric = (window as any).fabric;
    if (!canvas || !fabric) return;

    const center = getCanvasCenter();
    let obj: any = null;

    if (shapeType === 'rect') {
      obj = new fabric.Rect({
        left: center.x,
        top: center.y,
        width: 160,
        height: 100,
        fill: '#ffffff',
        stroke: currentColor,
        strokeWidth: 2,
        rx: 8,
        ry: 8,
        originX: 'center',
        originY: 'center',
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 6, offsetY: 2 }),
      });
    } else if (shapeType === 'circle') {
      obj = new fabric.Circle({
        left: center.x,
        top: center.y,
        radius: 60,
        fill: '#ffffff',
        stroke: currentColor,
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
      });
    } else if (shapeType === 'triangle') {
      obj = new fabric.Triangle({
        left: center.x,
        top: center.y,
        width: 120,
        height: 110,
        fill: '#ffffff',
        stroke: currentColor,
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
      });
    } else if (shapeType === 'line') {
      obj = new fabric.Line([center.x - 80, center.y, center.x + 80, center.y], {
        stroke: currentColor,
        strokeWidth: 3,
        strokeLineCap: 'round',
      });
    } else if (shapeType === 'arrow') {
      const line = new fabric.Line([0, 0, 140, 0], {
        stroke: currentColor,
        strokeWidth: 3,
        originX: 'center',
        originY: 'center',
      });
      const triangle = new fabric.Triangle({
        width: 16,
        height: 18,
        fill: currentColor,
        left: 70,
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
    }
  };

  // 4. Agregar Marcos (Frames)
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
      label = 'Post Social (1:1)';
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

  // 5. Inserción de Plantillas Prediseñadas
  const insertTemplate = (templateType: 'kanban' | 'swot' | 'rotulo' | 'wireframe' | 'funnel') => {
    const canvas = fabricCanvasRef.current;
    const fabric = (window as any).fabric;
    if (!canvas || !fabric) return;

    const center = getCanvasCenter();

    if (templateType === 'kanban') {
      // Tablero Kanban 3 Columnas
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
      // Matriz FODA (SWOT)
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
      // Rótulo de Proyecto
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

  // 6. Subir imagen al lienzo
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
      // Generar miniatura en base64 de tamaño óptimo
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
      return next.slice(-25); // Mantener últimos 25 estados
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

  // Zoom Controls
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

  const resetZoom = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setZoom(1);
    setZoomLevel(100);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();
    updateMinimap();
  };

  // Actualizar Minimapa flotante
  const updateMinimap = () => {
    const canvas = fabricCanvasRef.current;
    const miniCanvas = minimapCanvasRef.current;
    if (!canvas || !miniCanvas) return;

    const ctx = miniCanvas.getContext('2d');
    if (!ctx) return;

    const miniW = (miniCanvas.width = 160);
    const miniH = (miniCanvas.height = 100);

    ctx.clearRect(0, 0, miniW, miniH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, miniW, miniH);

    // Dibujar miniatura simplificada de objetos
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

    // Marco del viewport
    ctx.strokeStyle = '#3b82f6';
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
        multiplier: 2, // Doble resolución para alta nitidez
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
      applyBackground(canvas, canvasBg, solidBgColor);
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
    <div
      className={`fixed inset-0 z-40 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden select-none ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      {/* 1. BARRA SUPERIOR DE NAVEGACIÓN Y ACCIONES */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0 shadow-xs">
        {/* Izquierda: Volver, Título y Carpeta */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Pizarras</span>
          </button>

          {folder && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color }} />
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
                className="px-2 py-1 rounded-lg border border-purple-500 bg-white dark:bg-slate-800 text-xs font-black text-slate-900 dark:text-white outline-none"
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white cursor-pointer hover:underline truncate max-w-[180px] sm:max-w-xs"
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
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= historyStack.length - 1}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Derecha: Guardado, Fondo, Compartir, Exportar y Zoom */}
        <div className="flex items-center gap-2">
          {/* Indicador de Autosave */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {saveStatus === 'saved' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Guardado</span>
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="hidden sm:inline">Guardando...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <button
                  type="button"
                  onClick={saveCanvasData}
                  className="hover:underline font-black text-amber-600 dark:text-amber-400"
                >
                  Guardar
                </button>
              </>
            )}
          </div>

          {/* Selector de Fondo */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBgDropdown(!showBgDropdown)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Fondo del lienzo"
            >
              <Grid className="w-4 h-4" />
            </button>

            {showBgDropdown && (
              <div
                onMouseLeave={() => setShowBgDropdown(false)}
                className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-2 space-y-1 animate-fadeIn"
              >
                <div className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">
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
                    className={`w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold transition flex items-center justify-between ${
                      canvasBg === type
                        ? 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="capitalize">
                      {type === 'dots'
                        ? 'Puntos'
                        : type === 'grid'
                        ? 'Cuadrícula'
                        : type === 'lines'
                        ? 'Líneas'
                        : 'Sólido'}
                    </span>
                    {canvasBg === type && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compartir */}
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compartir</span>
          </button>

          {/* Exportar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {showExportDropdown && (
              <div
                onMouseLeave={() => setShowExportDropdown(false)}
                className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-2 space-y-1 animate-fadeIn"
              >
                <button
                  type="button"
                  onClick={() => handleExport('png')}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4 text-emerald-500" />
                  <span>Imagen PNG (Alta Calidad)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('jpeg')}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4 text-blue-500" />
                  <span>Imagen JPEG</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4 text-red-500" />
                  <span>Documento PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
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
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
            title="Limpiar todo el lienzo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. ÁREA DE LIENZO Y TOOLBAR FLOTANTE */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        {/* Canvas de Fabric.js */}
        <canvas ref={canvasElRef} className="absolute inset-0 touch-none" />

        {/* 3. TOOLBAR FLOTANTE DE HERRAMIENTAS */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl flex items-center gap-1">
          {/* Herramienta 1: Seleccionar */}
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            className={`p-2.5 rounded-xl transition ${
              activeTool === 'select'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Seleccionar y mover objetos (V)"
          >
            <MousePointer className="w-4 h-4" />
          </button>

          {/* Herramienta 2: Manito / Pan */}
          <button
            type="button"
            onClick={() => setActiveTool('pan')}
            className={`p-2.5 rounded-xl transition ${
              activeTool === 'pan'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Mover lienzo libremente (H o mantener Espacio)"
          >
            <Hand className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-slate-200 dark:border-slate-800 mx-0.5" />

          {/* Herramienta 3: Lápiz / Pincel */}
          <button
            type="button"
            onClick={() => setActiveTool('draw')}
            className={`p-2.5 rounded-xl transition ${
              activeTool === 'draw'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Dibujo a mano alzada (D)"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Herramienta 4: Resaltador */}
          <button
            type="button"
            onClick={() => setActiveTool('highlighter')}
            className={`p-2.5 rounded-xl transition ${
              activeTool === 'highlighter'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Resaltador fluorescente"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Herramienta 5: Borrador */}
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            className={`p-2.5 rounded-xl transition ${
              activeTool === 'eraser'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Borrador de elementos (E)"
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* Selector de Color rápido */}
          <div className="relative flex items-center mx-1">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
              title="Color de trazo y formas"
            />
          </div>

          <div className="w-px h-6 bg-slate-200 dark:border-slate-800 mx-0.5" />

          {/* Herramienta 6: Texto */}
          <button
            type="button"
            onClick={addText}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Insertar texto enriquecido (T)"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Herramienta 7: Nota Adhesiva (Sticky Note) */}
          <button
            type="button"
            onClick={() => addStickyNote(currentStickyColor)}
            className="p-2.5 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
            title="Insertar Nota Adhesiva (Post-It)"
          >
            <StickyNote className="w-4 h-4" />
          </button>

          {/* Herramienta 8: Formas Geométricas */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowShapesDropdown(!showShapesDropdown)}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Formas geométricas"
            >
              <Square className="w-4 h-4" />
            </button>

            {showShapesDropdown && (
              <div
                onMouseLeave={() => setShowShapesDropdown(false)}
                className="absolute bottom-full left-0 mb-2 w-40 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 p-2 space-y-1 animate-fadeIn"
              >
                <button
                  type="button"
                  onClick={() => {
                    addShape('rect');
                    setShowShapesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Rectángulo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addShape('circle');
                    setShowShapesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Circle className="w-3.5 h-3.5" />
                  <span>Círculo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addShape('triangle');
                    setShowShapesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Triangle className="w-3.5 h-3.5" />
                  <span>Triángulo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addShape('arrow');
                    setShowShapesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <MoveRight className="w-3.5 h-3.5" />
                  <span>Flecha</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addShape('line');
                    setShowShapesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Línea</span>
                </button>
              </div>
            )}
          </div>

          {/* Herramienta 9: Marcos (Frames) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFramesDropdown(!showFramesDropdown)}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Marcos de Presentación y Medios"
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
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Presentación (16:9)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addFrame('1:1');
                    setShowFramesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Post Cuadrado (1:1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addFrame('9:16');
                    setShowFramesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Móvil / Story (9:16)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addFrame('a4');
                    setShowFramesDropdown(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Documento A4
                </button>
              </div>
            )}
          </div>

          {/* Herramienta 10: Subir Imagen */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Subir imagen"
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

          <div className="w-px h-6 bg-slate-200 dark:border-slate-800 mx-0.5" />

          {/* Plantillas Prediseñadas */}
          <button
            type="button"
            onClick={() => setShowTemplatesSidebar(!showTemplatesSidebar)}
            className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition"
            title="Plantillas y Componentes rápidos"
          >
            <LayoutTemplate className="w-4 h-4" />
          </button>
        </div>

        {/* 4. CONTROLES DE ZOOM FLOTANTES */}
        <div className="absolute bottom-6 right-6 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => applyZoom(-0.15)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={resetZoom}
            className="px-2.5 py-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Restablecer al 100%"
          >
            {zoomLevel}%
          </button>

          <button
            type="button"
            onClick={() => applyZoom(0.15)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* 5. MINIMAPA DE NAVEGACIÓN FLOTANTE */}
        <div className="absolute bottom-20 right-6 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xl hidden md:block">
          <canvas ref={minimapCanvasRef} className="rounded-xl border border-slate-100 dark:border-slate-800" />
        </div>

        {/* 6. SIDEBAR FLOTANTE DE PLANTILLAS */}
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
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {/* Plantilla: Tablero Kanban */}
              <button
                type="button"
                onClick={() => insertTemplate('kanban')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-left transition flex items-center gap-3 group"
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

              {/* Plantilla: Matriz FODA */}
              <button
                type="button"
                onClick={() => insertTemplate('swot')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-left transition flex items-center gap-3 group"
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

              {/* Plantilla: Rótulo de Proyecto */}
              <button
                type="button"
                onClick={() => insertTemplate('rotulo')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 text-left transition flex items-center gap-3 group"
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
