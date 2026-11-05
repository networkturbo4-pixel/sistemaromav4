import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  Paintbrush,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Check,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Square,
  Circle,
  Star,
  MoveRight,
  Minus,
  Type,
  Scaling,
  Palette,
  RotateCcw,
} from 'lucide-react';

interface PaintCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageDataUrl: string) => void;
  initialImageUrl?: string;
  title?: string;
}

type ToolType = 'brush' | 'eraser' | 'rectangle' | 'circle' | 'star' | 'arrow' | 'line' | 'text';

interface CanvasPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  ratio: string;
}

const CANVAS_PRESETS: CanvasPreset[] = [
  { id: '1:1', label: 'Cuadrado (Post 1:1)', width: 1080, height: 1080, ratio: '1:1' },
  { id: '4:5', label: 'Retrato (Feed 4:5)', width: 1080, height: 1350, ratio: '4:5' },
  { id: '9:16', label: 'Historia / Reel (9:16)', width: 1080, height: 1920, ratio: '9:16' },
  { id: '16:9', label: 'Horizontal (Video 16:9)', width: 1920, height: 1080, ratio: '16:9' },
];

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#ffffff', // White
  '#000000', // Black
];

const STROKE_SIZES = [2, 4, 8, 14, 24, 36];
const FONT_SIZES = [18, 24, 32, 44, 60, 80];

export const PaintCanvasModal: React.FC<PaintCanvasModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialImageUrl,
  title = 'Pizarra & Dibujo de Referencia Visual',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Estados principales de lienzo
  const [canvasWidth, setCanvasWidth] = useState<number>(1080);
  const [canvasHeight, setCanvasHeight] = useState<number>(1080);
  const [currentPreset, setCurrentPreset] = useState<string>('1:1');
  const [zoom, setZoom] = useState<number>(1);

  // Herramientas y estilos
  const [tool, setTool] = useState<ToolType>('brush');
  const [color, setColor] = useState<string>('#ef4444');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isFilled, setIsFilled] = useState<boolean>(false);

  // Estado de Dibujo en Curso
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  // Historial Undo / Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Modal / Popover de Texto
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textPosition, setTextPosition] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [textSize, setTextSize] = useState<number>(36);
  const [textWithBadge, setTextWithBadge] = useState<boolean>(true);
  const [isTextBold, setIsTextBold] = useState<boolean>(true);

  // Modal / Popover de Tamaño de Lienzo Personalizado
  const [isResizeModalOpen, setIsResizeModalOpen] = useState(false);
  const [customWidthInput, setCustomWidthInput] = useState('1080');
  const [customHeightInput, setCustomHeightInput] = useState('1080');

  // Ajustar el zoom inicial para que el lienzo quepa perfecto en la pantalla
  const fitZoomToScreen = useCallback((w: number, h: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const availableW = Math.max(300, rect.width - 40);
    const availableH = Math.max(300, rect.height - 40);

    const scale = Math.min(availableW / w, availableH / h, 1);
    setZoom(Math.max(0.2, Number(scale.toFixed(2))));
  }, []);

  // Inicializar o cargar lienzo con imagen previa
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (initialImageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const w = Math.max(400, img.width);
          const h = Math.max(400, img.height);
          setCanvasWidth(w);
          setCanvasHeight(h);
          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          const initialData = ctx.getImageData(0, 0, w, h);
          setHistory([initialData]);
          setHistoryIndex(0);
          fitZoomToScreen(w, h);
        };
        img.onerror = () => {
          setupBlankCanvas(1080, 1080);
        };
        img.src = initialImageUrl;
      } else {
        setupBlankCanvas(1080, 1080);
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen, initialImageUrl, fitZoomToScreen]);

  const setupBlankCanvas = (w: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setCanvasWidth(w);
    setCanvasHeight(h);
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const initialData = ctx.getImageData(0, 0, w, h);
    setHistory([initialData]);
    setHistoryIndex(0);
    fitZoomToScreen(w, h);
  };

  // Guardar estado en historial
  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    if (newHistory.length > 30) newHistory.shift();

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.putImageData(history[nextIndex], 0, 0);
      setHistoryIndex(nextIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.putImageData(history[nextIndex], 0, 0);
      setHistoryIndex(nextIndex);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  // Cambio de tamaño de lienzo respetando el dibujo actual
  const handleResizeCanvas = (newWidth: number, newHeight: number, presetId = 'custom') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crear buffer temporal con el contenido actual
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
    }

    // Actualizar dimensiones reales del canvas
    canvas.width = newWidth;
    canvas.height = newHeight;
    setCanvasWidth(newWidth);
    setCanvasHeight(newHeight);
    setCurrentPreset(presetId);

    // Rellenar fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newWidth, newHeight);

    // Centrar imagen anterior en el nuevo lienzo
    const offsetX = (newWidth - tempCanvas.width) / 2;
    const offsetY = (newHeight - tempCanvas.height) / 2;
    ctx.drawImage(tempCanvas, Math.max(0, offsetX), Math.max(0, offsetY));

    fitZoomToScreen(newWidth, newHeight);
    saveState();
  };

  // Coordenadas precisas escaladas al tamaño real del canvas
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Dibujar Estrella de 5 puntas
  const drawStarShape = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    fill: boolean
  ) => {
    const spikes = 5;
    const outerRadius = Math.max(4, radius);
    const innerRadius = outerRadius * 0.45;
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
  };

  // Dibujar Flecha
  const drawArrowShape = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) => {
    const headLen = Math.max(12, brushSize * 3);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLen * Math.cos(angle - Math.PI / 6),
      toY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLen * Math.cos(angle + Math.PI / 6),
      toY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  };

  // Inicio de trazo o forma
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    // Si es herramienta de texto, abrir modal de inserción en esa coordenada
    if (tool === 'text') {
      setTextPosition({ x: Math.round(x), y: Math.round(y) });
      setIsTextModalOpen(true);
      return;
    }

    setIsDrawing(true);
    setStartPos({ x, y });

    // Guardar snapshot para vista previa de formas
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setSnapshot(snap);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.fillStyle = color;

    if (tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  // Movimiento de dibujo (con preview en tiempo real de formas)
  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
      return;
    }

    // Para formas: restaurar snapshot para redibujar preview en tiempo real
    if (snapshot) {
      ctx.putImageData(snapshot, 0, 0);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    if (tool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'arrow') {
      drawArrowShape(ctx, startPos.x, startPos.y, x, y);
    } else if (tool === 'rectangle') {
      const rx = Math.min(startPos.x, x);
      const ry = Math.min(startPos.y, y);
      const rw = Math.abs(x - startPos.x);
      const rh = Math.abs(y - startPos.y);
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      if (isFilled) ctx.fill();
      ctx.stroke();
    } else if (tool === 'circle') {
      const cx = (startPos.x + x) / 2;
      const cy = (startPos.y + y) / 2;
      const radiusX = Math.abs(x - startPos.x) / 2;
      const radiusY = Math.abs(y - startPos.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, Math.PI * 2);
      if (isFilled) ctx.fill();
      ctx.stroke();
    } else if (tool === 'star') {
      const cx = (startPos.x + x) / 2;
      const cy = (startPos.y + y) / 2;
      const radius = Math.max(Math.abs(x - startPos.x), Math.abs(y - startPos.y)) / 2;
      drawStarShape(ctx, cx, cy, radius, isFilled);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setSnapshot(null);
    saveState();
  };

  // Inserción de Texto en el Lienzo
  const handleApplyText = () => {
    if (!textContent.trim()) {
      setIsTextModalOpen(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.font = `${isTextBold ? 'bold ' : ''}${textSize}px sans-serif`;
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(textContent);
    const textWidth = metrics.width;
    const paddingX = textSize * 0.35;
    const paddingY = textSize * 0.25;
    const badgeHeight = textSize + paddingY * 2;
    const badgeWidth = textWidth + paddingX * 2;

    if (textWithBadge) {
      // Fondo tipo sticker oscuro para máxima legibilidad
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      const bx = textPosition.x - paddingX;
      const by = textPosition.y - badgeHeight / 2;
      if (ctx.roundRect) {
        ctx.roundRect(bx, by, badgeWidth, badgeHeight, 10);
      } else {
        ctx.rect(bx, by, badgeWidth, badgeHeight);
      }
      ctx.fill();
    }

    ctx.fillStyle = color;
    ctx.fillText(textContent, textPosition.x, textPosition.y);
    ctx.restore();

    setTextContent('');
    setIsTextModalOpen(false);
    saveState();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 0.95);
    onSave(dataUrl);
    onClose();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `pizarra-boceto-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      {/* CONTENEDOR ANCHO EXPANDIDO A 90-94VH Y HASTA 1680PX */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[96vw] 2xl:max-w-[1680px] h-[92vh] max-h-[96vh] flex flex-col overflow-hidden text-xs">
        {/* 1. HEADER SUPERIOR */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Paintbrush className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400">
                Pizarra interactiva: formas, notas de texto, referencias y lienzos personalizados
              </p>
            </div>
          </div>

          {/* SELECTOR DE TAMAÑO DE LIENZO Y RATIOS */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            {CANVAS_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleResizeCanvas(preset.width, preset.height, preset.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  currentPreset === preset.id
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title={`${preset.label} (${preset.width}x${preset.height}px)`}
              >
                <span>{preset.ratio}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setCustomWidthInput(String(canvasWidth));
                setCustomHeightInput(String(canvasHeight));
                setIsResizeModalOpen(true);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                currentPreset === 'custom'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Personalizar dimensiones del lienzo"
            >
              <Scaling className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Medidas</span>
            </button>
          </div>

          {/* CONTROLES DE ZOOM Y CERRAR */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.2, Number((z - 0.1).toFixed(2))))}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                title="Alejar Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                title="Acercar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => fitZoomToScreen(canvasWidth, canvasHeight)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer border-l border-slate-200 dark:border-slate-700 ml-0.5"
                title="Ajustar a Pantalla"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. TOOLBAR COMPLETA DE HERRAMIENTAS, FORMAS, TEXTO Y COLORES */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-6 py-2.5 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
          {/* GRUPO 1: HERRAMIENTAS PRINCIPALES */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTool('brush')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                tool === 'brush'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Pincel libre"
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Pincel</span>
            </button>

            <button
              type="button"
              onClick={() => setTool('eraser')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                tool === 'eraser'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Borrador"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Borrador</span>
            </button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-0.5" />

            {/* HERRAMIENTA TEXTO */}
            <button
              type="button"
              onClick={() => {
                setTool('text');
                setTextPosition({ x: Math.round(canvasWidth / 2 - 100), y: Math.round(canvasHeight / 2) });
                setIsTextModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                tool === 'text'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Insertar texto en el lienzo"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Texto</span>
            </button>
          </div>

          {/* GRUPO 2: FORMAS GEOMÉTRICAS (CÍRCULOS, CUADRADOS, ESTRELLA, LÍNEA, FLECHA) */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setTool('rectangle')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                tool === 'rectangle'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Cuadrado / Rectángulo"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setTool('circle')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                tool === 'circle'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Círculo / Elipse"
            >
              <Circle className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setTool('star')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                tool === 'star'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Estrella (5 puntas)"
            >
              <Star className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setTool('arrow')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                tool === 'arrow'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Flecha de indicación"
            >
              <MoveRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setTool('line')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                tool === 'line'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Línea recta"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* TOGGLE RELLENO */}
            {['rectangle', 'circle', 'star'].includes(tool) && (
              <button
                type="button"
                onClick={() => setIsFilled(!isFilled)}
                className={`ml-1 px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer border ${
                  isFilled
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
                title="Alternar entre solo contorno o relleno sólido"
              >
                {isFilled ? '● Relleno' : '○ Borde'}
              </button>
            )}
          </div>

          {/* GRUPO 3: GROSOR DE TRAZO */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase mr-1">
              Grosor:
            </span>
            {STROKE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBrushSize(size)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  brushSize === size
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{
                    width: `${Math.min(size + 2, 14)}px`,
                    height: `${Math.min(size + 2, 14)}px`,
                  }}
                />
              </button>
            ))}
          </div>

          {/* GRUPO 4: PALETA DE COLORES */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  if (tool === 'eraser') setTool('brush');
                }}
                className={`w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 transition-transform cursor-pointer ${
                  color === c && tool !== 'eraser'
                    ? 'ring-2 ring-indigo-500 scale-125 shadow-xs'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                if (tool === 'eraser') setTool('brush');
              }}
              className="w-5 h-5 p-0 border-0 rounded-full cursor-pointer bg-transparent"
              title="Color Personalizado"
            />
          </div>

          {/* GRUPO 5: DESHACER, REHACER, LIMPIAR, DESCARGAR */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Deshacer (Ctrl + Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Rehacer (Ctrl + Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Descargar imagen PNG"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={clearCanvas}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              title="Limpiar todo el lienzo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. ÁREA DE LIENZO / WORKSPACE INTERACTIVO CON PATRÓN DE FONDO */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-900/90 dark:bg-slate-950 p-4 sm:p-8 overflow-auto flex items-center justify-center relative touch-none select-none cursor-crosshair"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div
            className="relative shadow-2xl transition-all duration-75 flex items-center justify-center"
            style={{
              width: `${canvasWidth * zoom}px`,
              height: `${canvasHeight * zoom}px`,
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full bg-white rounded-xl shadow-2xl border border-slate-700/50 block"
            />
          </div>
        </div>

        {/* 4. FOOTER INFERIOR CON DETALLES Y BOTONES DE ACCIÓN */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <span className="font-extrabold uppercase text-[10px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
              Herramienta: {tool} • Grosor: {brushSize}px
            </span>
            <span className="font-mono text-[11px] font-bold">
              {canvasWidth} × {canvasHeight} px ({currentPreset})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl shadow-sm transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Boceto en el Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL / DIÁLOGO FLOTANTE PARA INSERTAR TEXTO */}
      {/* ===================================================================== */}
      {isTextModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Insertar Texto en Lienzo
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Posición: X {textPosition.x}, Y {textPosition.y}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTextModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Texto a escribir *
              </label>
              <textarea
                rows={2}
                autoFocus
                placeholder="Escribe tu anotación o título aquí..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tamaño de Fuente
                </label>
                <select
                  value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  {FONT_SIZES.map((fs) => (
                    <option key={fs} value={fs}>
                      {fs} px
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Estilo de Texto
                </label>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsTextBold(!isTextBold)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                      isTextBold
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600'
                    }`}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextWithBadge(!textWithBadge)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition cursor-pointer border ${
                      textWithBadge
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                    title="Fondo tipo Sticker para que siempre sea legible"
                  >
                    Fondo
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Color del Texto
              </label>
              <div className="flex items-center gap-1.5 pt-0.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border border-slate-200 transition-transform ${
                      color === c ? 'ring-2 ring-indigo-500 scale-110 shadow-xs' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 p-0 border-0 rounded-full cursor-pointer bg-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsTextModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyText}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition cursor-pointer shadow-xs"
              >
                Insertar en Lienzo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DIMENSIONES PERSONALIZADAS DEL LIENZO */}
      {/* ===================================================================== */}
      {isResizeModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Scaling className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Dimensiones del Lienzo
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsResizeModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ancho (px)
                </label>
                <input
                  type="number"
                  min={300}
                  max={4000}
                  value={customWidthInput}
                  onChange={(e) => setCustomWidthInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Alto (px)
                </label>
                <input
                  type="number"
                  min={300}
                  max={4000}
                  value={customHeightInput}
                  onChange={(e) => setCustomHeightInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsResizeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const w = Math.max(300, Math.min(4000, Number(customWidthInput) || 1080));
                  const h = Math.max(300, Math.min(4000, Number(customHeightInput) || 1080));
                  handleResizeCanvas(w, h, 'custom');
                  setIsResizeModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition cursor-pointer shadow-xs"
              >
                Aplicar Dimensiones
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
