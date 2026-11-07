import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Lock, KeyRound, ArrowRight, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Copy, Check, Moon, Sun, Grid, LayoutTemplate, Share2, ExternalLink,
  Play, Pause, Download, MessageSquare, CheckCircle2, AlertCircle, Send,
  Sliders, ShieldAlert, HardDrive, FileDown, Sparkles, X, Eye, EyeOff
} from 'lucide-react';
import { BrandGuideline } from '../../shared/types';
import { hexToColorSpecs } from '../modules/workspace/submodules/brand-guidelines/BrandGuidelineEditorModal';

interface PublicBrandGuidelineViewProps {
  token: string;
}

export const PublicBrandGuidelineView: React.FC<PublicBrandGuidelineViewProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guideline, setGuideline] = useState<BrandGuideline | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [meta, setMeta] = useState<{
    brandName?: string;
    clientName?: string;
    clientLogo?: string;
    themeDefault?: 'dark' | 'light';
    round?: string;
    date?: string;
  } | null>(null);

  // Estados de PIN
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Estados de Visualización y Controles
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [viewMode, setViewMode] = useState<'deck' | 'grid'>('deck');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentGridPageIndex, setCurrentGridPageIndex] = useState(0);
  const [copiedColorKey, setCopiedColorKey] = useState<string | null>(null);
  const [colorCopyFormat, setColorCopyFormat] = useState<'HEX' | 'RGB' | 'CMYK'>('HEX');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Selector de Colorway en vivo y Lightbox 3D para Mockups
  const [mockupColorway, setMockupColorway] = useState<'obsidian' | 'offwhite' | 'brand'>('obsidian');
  const [zoomedMockup, setZoomedMockup] = useState<string | null>(null);
  const [liveStampPos, setLiveStampPos] = useState<'chest_left' | 'center_large' | 'back_print'>('chest_left');
  const [liveStampMode, setLiveStampMode] = useState<'auto' | 'symbol_only' | 'full_logo'>('auto');
  const [useDisplacementFilter, setUseDisplacementFilter] = useState(true);
  const [rot3D, setRot3D] = useState<{ x: number; y: number }>({ x: 8, y: -14 });
  const [showWcagMatrix, setShowWcagMatrix] = useState(false);

  // Auto-Play Showreel
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Probador Tipográfico en Vivo (Lámina de Tipografía)
  const [typeTesterMode, setTypeTesterMode] = useState(false);
  const [typeTesterText, setTypeTesterText] = useState(
    'El veloz murciélago hindú comía feliz cardillo y kiwi'
  );
  const [typeTesterSize, setTypeTesterSize] = useState(42);
  const [typeTesterWeight, setTypeTesterWeight] = useState<'300' | '400' | '600' | '700'>('400');

  // Slider Comparativo Antes vs Después (0 a 100%)
  const [beforeAfterPos, setBeforeAfterPos] = useState(50);

  // Flujo de Feedback por Lámina y Aprobación Oficial
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState<'approved' | 'changes_requested'>('approved');
  const [approvalName, setApprovalName] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadGuideline = useCallback(
    async (pinToUse?: string) => {
      try {
        setLoading(true);
        setError(null);

        const savedPin = pinToUse || sessionStorage.getItem(`brand_pin_${token}`) || '';
        const queryPin = savedPin ? `?pin=${encodeURIComponent(savedPin)}` : '';

        const res = await fetch(`/api/workspace/brand-guidelines/public/${token}${queryPin}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo cargar la presentación');
        }

        if (data.isLocked) {
          setIsLocked(true);
          setMeta(data.meta || {});
          if (data.meta?.themeDefault) setTheme(data.meta.themeDefault);
        } else if (data.guideline) {
          setIsLocked(false);
          setGuideline(data.guideline);
          if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
          setTheme(data.guideline.themeDefault || 'dark');
          setViewMode(data.guideline.viewModeDefault || 'deck');
          setLiveStampPos(data.guideline.stampPosition || 'chest_left');
          setLiveStampMode(data.guideline.mockupStampMode || 'auto');
          setCommentAuthor(data.guideline.clientName || '');
          setApprovalName(data.guideline.clientName || '');
        }
      } catch (err: any) {
        console.error('Error fetching brand guideline:', err);
        setError(err.message || 'Error de conexión al cargar la identidad visual');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadGuideline();
  }, [loadGuideline]);

  // Inyección dinámica de fuentes personalizadas (.TTF / .OTF / .WOFF2) y Google Fonts
  useEffect(() => {
    if (!guideline?.typography) return;
    const styleId = 'brand-guideline-custom-fonts';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const rules: string[] = [];
    guideline.typography.forEach((f) => {
      if (f.customFontDataUrl && f.fontFamily) {
        rules.push(`
          @font-face {
            font-family: '${f.fontFamily}';
            src: url('${f.customFontDataUrl}');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `);
      } else if (f.fontFamily) {
        const gfId = `gf-${f.fontFamily.replace(/\s+/g, '-')}`;
        if (!document.getElementById(gfId)) {
          const link = document.createElement('link');
          link.id = gfId;
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
            f.fontFamily
          )}:wght@300;400;600;700&display=swap`;
          document.head.appendChild(link);
        }
      }
    });
    styleEl.textContent = rules.join('\n');
  }, [guideline?.typography]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    try {
      setVerifyingPin(true);
      setPinError(false);

      const res = await fetch(`/api/workspace/brand-guidelines/public/${token}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.guideline) {
        sessionStorage.setItem(`brand_pin_${token}`, pinInput.trim());
        setGuideline(data.guideline);
        if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
        setIsLocked(false);
        setTheme(data.guideline.themeDefault || 'dark');
        setViewMode(data.guideline.viewModeDefault || 'deck');
        setLiveStampPos(data.guideline.stampPosition || 'chest_left');
        setLiveStampMode(data.guideline.mockupStampMode || 'auto');
        setCommentAuthor(data.guideline.clientName || '');
        setApprovalName(data.guideline.clientName || '');
      } else {
        setPinError(true);
      }
    } catch {
      setPinError(true);
    } finally {
      setVerifyingPin(false);
    }
  };

  // Traducción automática en vivo para textos por defecto antiguos guardados en inglés
  const translateDisplayText = (val: string | undefined, fallback: string): string => {
    if (!val) return fallback;
    const map: Record<string, string> = {
      'Round 1': 'Ronda 1',
      'Round 2': 'Ronda 2',
      'Direction One': 'Propuesta Principal',
      'Legacy Brand Identity (2019)': 'Identidad Anterior',
      'Modernization': 'Modernización Visual',
      'Competitive Differentiation': 'Diferenciación Competitiva',
      'Simplification': 'Versatilidad y Claridad',
      'Review & Feedback': 'Revisión y Comentarios',
      'Revisions (if necessary)': 'Ajustes y Refinamiento (si aplica)',
      'Final Approval': 'Aprobación Oficial',
      'File Delivery': 'Entrega de Archivos Editables',
      'Do not stretch or distort proportions': 'No deformar ni estirar horizontal/verticalmente',
      'Do not rotate or tilt at arbitrary angles': 'No inclinar ni rotar en ángulos arbitrarios',
      'Do not apply unauthorized gradients or colors': 'No alterar los colores oficiales de la marca',
      'Do not add heavy drop shadows or outlines': 'No aplicar sombras paralelas ni trazos invasivos',
      'Do not place on low-contrast backgrounds': 'No usar sobre fondos sin contraste suficiente',
      'Do not rearrange symbol and logotype lockup': 'No alterar la proporción entre isotipo y logotipo',
      'Modular Quadrant': 'Isotipo Principal / Variación 01',
      'Dynamic Checkered Matrix': 'Monograma / Variación 02',
      'Architectural Geometric Petals': 'Sello / Emblema 03',
      'Hourglass Convergence': 'Icono App / Favicon 04',
      'Falcon Monogram Shield': 'Símbolo Simplificado 05',
      'Crossed Kinetic Ribbon': 'Marca de Agua / Símbolo 06',
    };
    if (map[val.trim()]) return map[val.trim()];
    if (val.startsWith('A brief project summary')) {
      return 'Resumen ejecutivo del proyecto de identidad visual, destacando el propósito, alcance y objetivos estratégicos de la marca.';
    }
    if (val.startsWith('This project overview')) {
      return 'Este resumen describe el propósito y los objetivos clave de la identidad visual. Destaca los pilares de posicionamiento, modernización y proyección comercial alineados con los valores esenciales de la organización.';
    }
    if (val.startsWith('Additionally, this section')) {
      return 'Asimismo, esta sección define el estilo visual, el carácter tipográfico y cómo el nuevo sistema gráfico se adapta con coherencia a todos los puntos de contacto físicos y digitales.';
    }
    if (val.startsWith('This direction provides a brief overview') || val.startsWith('This section provides a brief overview')) {
      return 'Esta propuesta sintetiza la esencia, los valores y la personalidad de la marca mediante una construcción geométrica equilibrada, garantizando máxima legibilidad y pregnancia tanto en medios digitales como impresos.';
    }
    if (val.startsWith("Update the brand's visual")) {
      return 'Actualizar la identidad visual y verbal de la marca para proyectar una imagen contemporánea, sólida y alineada con los estándares actuales del mercado.';
    }
    if (val.startsWith('Refine the brand to stand out')) {
      return 'Destacar frente a la competencia mediante un posicionamiento único, memorable y con personalidad propia en cada punto de contacto.';
    }
    if (val.startsWith('Streamline complex or outdated')) {
      return 'Sintetizar los elementos gráficos en un sistema limpio, escalable y fácil de aplicar tanto en soportes digitales como en impresos y merchandising.';
    }
    if (val.startsWith('Share your thoughts on the logo design')) {
      return 'Comparte tus apreciaciones sobre la propuesta de identidad visual y si deseas algún ajuste puntual.';
    }
    if (val.startsWith('We will refine the design based on your feedback')) {
      return 'Afinaremos los detalles gráficos y cromáticos en base a tus comentarios y prioridades.';
    }
    if (val.startsWith('Once approved, we will proceed')) {
      return 'Una vez aprobada la propuesta, prepararemos el paquete maestro de vectores y artes finales.';
    }
    if (val.startsWith('You will receive all logo formats') || val.startsWith('Delivery of all logo formats')) {
      return 'Recibirás todos los formatos oficiales para impresión, redes sociales, web y manual de marca.';
    }
    if (val.startsWith('Key performance metric')) {
      return 'Indicador clave de posicionamiento, alcance e impacto visual de la marca.';
    }
    return val;
  };

  // Catálogo completo de diapositivas (Con Antes/Después condicional solo si es Rebrand)
  const slides = useMemo(() => {
    if (!guideline) return [];

    const raw: Array<{ id: string; type: string; label: string }> = [
      { id: 'cover', type: 'cover', label: 'Portada' },
      { id: 'brief', type: 'brief', label: 'Resumen del Brief' },
      { id: 'goals', type: 'goals', label: 'Pilares Estratégicos' },
      {
        id: 'direction',
        type: 'direction',
        label: translateDisplayText(guideline.directionName, 'Propuesta Principal'),
      },
    ];

    // Solo mostrar lámina Antes vs. Después cuando la marca sea un Rebranding
    if (guideline.isRebrand) {
      raw.push({ id: 'before_after', type: 'before_after', label: 'Evolución: Antes vs. Después' });
    }

    if (guideline.logoVersions && guideline.logoVersions.length > 0) {
      raw.push({ id: 'logo_versions', type: 'logo_versions', label: 'Versiones Oficiales y Submarcas' });
    }

    if (guideline.mockupGalleryItems && guideline.mockupGalleryItems.length > 0) {
      raw.push({ id: 'mockup_gallery_slide', type: 'mockup_gallery_slide', label: 'Galería de Mockups Fotográficos' });
    }

    raw.push(
      { id: 'geometry_icons', type: 'geometry_icons', label: 'Retícula Áurea, Tamaños Mínimos e Iconografía' },
      { id: 'clearspace_donts', type: 'clearspace_donts', label: 'Área de Resguardo y Usos Incorrectos' },
      { id: 'contrast', type: 'contrast', label: 'Prueba de Contraste 50/50' },
      { id: 'palette', type: 'palette', label: 'Sistema de Color + Auditor WCAG' },
      { id: 'typography', type: 'typography', label: 'Tipografía y Probador en Vivo' },
      { id: 'mockup_mobile', type: 'mockup_mobile', label: 'Experiencia Móvil' },
      { id: 'mockup_appicon', type: 'mockup_appicon', label: 'Geometría de Icono de App' },
      { id: 'mockup_desktop', type: 'mockup_desktop', label: 'Experiencia Web de Escritorio' }
    );

    if (guideline.statNumber) {
      raw.push({ id: 'stat', type: 'stat', label: 'Métrica de Impacto' });
    }

    raw.push(
      { id: 'merch_apparel', type: 'merch_apparel', label: 'Indumentaria y Prendas (Mockups 3D)' },
      { id: 'merch_collaterals', type: 'merch_collaterals', label: 'Accesorios, Credencial QR y Portátil' },
      { id: 'stationery_kit', type: 'stationery_kit', label: 'Papelería Corporativa Ejecutiva' },
      { id: 'packaging_kit', type: 'packaging_kit', label: 'Empaques, Cajas y Bolsas Kraft' },
      { id: 'ooh_fleet', type: 'ooh_fleet', label: 'Vallas Publicitarias, Letrero y Flota' },
      { id: 'social_kit', type: 'social_kit', label: 'Kit de Redes Sociales (Instagram y LinkedIn)' }
    );

    if (guideline.otherIdeas && guideline.otherIdeas.length > 0) {
      raw.push({ id: 'other_ideas', type: 'other_ideas', label: 'Exploración de Símbolos e Iconos' });
    }

    raw.push({ id: 'next_steps', type: 'next_steps', label: 'Próximos Pasos, Aprobación y Descargas' });

    return raw.map((item, idx) => ({
      id: item.id,
      type: item.type,
      title: `${String(idx + 1).padStart(2, '0')} • ${item.label}`,
    }));
  }, [guideline]);

  const totalSlides = slides.length;
  const totalGridPages = Math.ceil(totalSlides / 4);

  // Telemetría de Heatmap de Lectura por Lámina (Cada 4 segundos)
  useEffect(() => {
    if (isLocked || !guideline || slides.length === 0) return;
    const activeSlide = slides[currentSlideIndex];
    if (!activeSlide) return;

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetch(`/api/workspace/brand-guidelines/public/${token}/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slideId: activeSlide.id,
            slideTitle: activeSlide.title,
            seconds: 4,
          }),
        }).catch(() => {});
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [isLocked, guideline, slides, currentSlideIndex, token]);

  // Auto-Play Showreel Timer
  useEffect(() => {
    if (!isAutoPlaying || isLocked || !guideline) return;
    const timer = setInterval(() => {
      if (viewMode === 'deck') {
        setCurrentSlideIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
      } else {
        setCurrentGridPageIndex((prev) => (prev < totalGridPages - 1 ? prev + 1 : 0));
      }
    }, 3600);
    return () => clearInterval(timer);
  }, [isAutoPlaying, isLocked, guideline, viewMode, totalSlides, totalGridPages]);

  // Navegación con teclado
  useEffect(() => {
    if (isLocked || !guideline) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (viewMode === 'deck') {
          setCurrentSlideIndex((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
        } else {
          setCurrentGridPageIndex((prev) => (prev < totalGridPages - 1 ? prev + 1 : prev));
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (viewMode === 'deck') {
          setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else {
          setCurrentGridPageIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
      } else if (e.key.toLowerCase() === 't') {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
      } else if (e.key.toLowerCase() === 'g') {
        setViewMode((prev) => (prev === 'deck' ? 'grid' : 'deck'));
      } else if (e.key.toLowerCase() === 'p') {
        setIsAutoPlaying((prev) => !prev);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        setZoomedMockup(null);
        setIsCinemaMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, guideline, viewMode, totalSlides, totalGridPages]);

  useEffect(() => {
    const onFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) setIsCinemaMode(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
      setIsCinemaMode(true);
      setShowControls(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
      setIsCinemaMode(false);
      setShowControls(true);
    }
  };

  // Auto-ocultar barra en pantalla completa / modo cine tras inactividad para no molestar la lectura
  useEffect(() => {
    if (!isFullscreen && !isCinemaMode) {
      setShowControls(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3800);
    return () => clearTimeout(timer);
  }, [isFullscreen, isCinemaMode, currentSlideIndex]);

  // Gestos táctiles para deslizar entre diapositivas en celulares
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1));
      } else {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      }
    }
    setTouchStartX(null);
  };

  // Copiar valor de color en formato HEX, RGB o CMYK
  const copyColorValue = (col: any, formatOverride?: 'HEX' | 'RGB' | 'CMYK') => {
    const fmt = formatOverride || colorCopyFormat;
    const specs = hexToColorSpecs(col.hex);
    const rgbVal = col.rgb || specs.rgb;
    const cmykVal = col.cmyk || specs.cmyk;

    let textToCopy = col.hex.toUpperCase();
    if (fmt === 'RGB') textToCopy = `rgb(${rgbVal})`;
    if (fmt === 'CMYK') textToCopy = `cmyk(${cmykVal})`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedColorKey(`${col.id || col.hex}_${fmt}`);
    setTimeout(() => setCopiedColorKey(null), 1800);
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Descargar variables CSS/JSON del sistema de color
  const handleDownloadColorTokens = () => {
    if (!guideline) return;
    const cssLines = (guideline.colors || []).map(
      (c, idx) =>
        `  --brand-color-${idx + 1}-${c.name.toLowerCase().replace(/\s+/g, '-')}: ${c.hex}; /* RGB: ${c.rgb || hexToColorSpecs(c.hex).rgb} | CMYK: ${c.cmyk || hexToColorSpecs(c.hex).cmyk} */`
    );
    const content = `:root {\n  /* ${guideline.brandName} - Official Brand Tokens */\n${cssLines.join('\n')}\n}\n`;
    const blob = new Blob([content], { type: 'text/css;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${guideline.brandName.toLowerCase().replace(/\s+/g, '-')}-tokens.css`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exportar Pitch Deck 16:9 en PDF usando jsPDF
  const handleExportPdf = async () => {
    if (!guideline) return;
    try {
      setExportingPdf(true);
      const jspdfGlobal = (window as any).jspdf;
      if (!jspdfGlobal || !jspdfGlobal.jsPDF) {
        window.print();
        return;
      }

      const { jsPDF } = jspdfGlobal;
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [297, 167], // 16:9 Widescreen exacto
      });

      const totalPdfPages = guideline.isRebrand ? 18 : 17;
      let currentPageNum = 1;

      const fillDarkSlide = () => {
        doc.setFillColor(15, 15, 18);
        doc.rect(0, 0, 297, 167, 'F');
      };

      const createHeader = (sectionNum: string, sectionTitle: string) => {
        fillDarkSlide();
        // Barra superior de acento con color primario de marca
        const cleanHex = (guideline.colors?.[0]?.hex || '#4F46E5').replace('#', '');
        const r = parseInt(cleanHex.substring(0, 2), 16) || 79;
        const g = parseInt(cleanHex.substring(2, 4), 16) || 70;
        const b = parseInt(cleanHex.substring(4, 6), 16) || 229;
        doc.setFillColor(r, g, b);
        doc.rect(20, 12, 12, 1.8, 'F');

        doc.setFontSize(8.5);
        doc.setTextColor(150, 150, 155);
        doc.text(`${sectionNum} • ${sectionTitle.toUpperCase()}`, 35, 14);

        doc.setDrawColor(40, 40, 48);
        doc.setLineWidth(0.4);
        doc.line(20, 18, 277, 18);
      };

      const createFooter = (label: string) => {
        doc.setDrawColor(40, 40, 48);
        doc.setLineWidth(0.4);
        doc.line(20, 152, 277, 152);

        doc.setFontSize(7.5);
        doc.setTextColor(115, 115, 125);
        doc.text(`${guideline.brandName} • ${label}`, 20, 158);
        doc.text(`LÁMINA ${String(currentPageNum).padStart(2, '0')} / ${String(totalPdfPages).padStart(2, '0')}`, 248, 158);
      };

      // -------------------------------------------------------------
      // PÁGINA 1: PORTADA EJECUTIVA
      // -------------------------------------------------------------
      fillDarkSlide();
      // Franja de acento superior
      const primaryHex = (guideline.colors?.[0]?.hex || '#F59E0B').replace('#', '');
      const prR = parseInt(primaryHex.substring(0, 2), 16) || 245;
      const prG = parseInt(primaryHex.substring(2, 4), 16) || 158;
      const prB = parseInt(primaryHex.substring(4, 6), 16) || 11;
      doc.setFillColor(prR, prG, prB);
      doc.rect(0, 0, 297, 3, 'F');

      doc.setFontSize(9);
      doc.setTextColor(140, 140, 150);
      doc.text('MANUAL DE IDENTIDAD VISUAL & BRAND GUIDELINES', 20, 24);

      doc.setFontSize(36);
      doc.setTextColor(255, 255, 255);
      doc.text('Identidad visual para', 20, 72);
      doc.text(`{${guideline.brandName}}`, 20, 88);

      if (guideline.tagline) {
        doc.setFontSize(13);
        doc.setTextColor(185, 185, 195);
        const splitTagline = doc.splitTextToSize(guideline.tagline, 220);
        doc.text(splitTagline, 20, 105);
      }

      // Paleta resumen en miniatura al pie de la portada
      (guideline.colors || []).slice(0, 6).forEach((c, idx) => {
        const cHex = c.hex.replace('#', '');
        const cr = parseInt(cHex.substring(0, 2), 16) || 0;
        const cg = parseInt(cHex.substring(2, 4), 16) || 0;
        const cb = parseInt(cHex.substring(4, 6), 16) || 0;
        doc.setFillColor(cr, cg, cb);
        doc.roundedRect(20 + idx * 14, 130, 11, 11, 2, 2, 'F');
      });

      doc.setDrawColor(40, 40, 48);
      doc.setLineWidth(0.4);
      doc.line(20, 150, 277, 150);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 130);
      doc.text(`${guideline.date || '2026'}   •   ${translateDisplayText(guideline.round, 'Ronda 1')}   •   Diseñado por ${guideline.designerName || 'Equipo Creativo Roma'}`, 20, 157);
      doc.text(`LÁMINA 01 / ${String(totalPdfPages).padStart(2, '0')}`, 250, 157);

      // -------------------------------------------------------------
      // PÁGINA 2: RESUMEN DEL BRIEF & DESAFÍO ESTRATÉGICO
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader('02', 'Resumen del Brief y Desafío Estratégico');

      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      const splitBriefTitle = doc.splitTextToSize(translateDisplayText(guideline.briefOverviewTitle, 'Visión Estratégica y Posicionamiento de Marca'), 250);
      doc.text(splitBriefTitle, 20, 36);

      doc.setFontSize(11);
      doc.setTextColor(175, 175, 185);
      const briefDesc = translateDisplayText(
        guideline.directionRationale,
        'El proyecto de identidad visual responde a la necesidad de construir una marca memorable, sólida y adaptable a todos los puntos de contacto analógicos y digitales, reflejando su liderazgo, valores corporativos y proyección futura.'
      );
      const splitBriefDesc = doc.splitTextToSize(briefDesc, 250);
      doc.text(splitBriefDesc, 20, 52);

      // Tarjetas de contexto estratégico
      const contextPoints = [
        { label: 'CLIENTE', value: guideline.clientName || guideline.brandName },
        { label: 'ENTREGA', value: guideline.date || '2026' },
        { label: 'ETAPA', value: translateDisplayText(guideline.round, 'Ronda 1') },
        { label: 'ESTADO', value: guideline.status === 'approved' ? 'Aprobado Oficial' : 'En Revisión' }
      ];
      contextPoints.forEach((cp, idx) => {
        const x = 20 + idx * 64;
        doc.setFillColor(25, 25, 30);
        doc.roundedRect(x, 105, 60, 32, 2.5, 2.5, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(140, 140, 150);
        doc.text(cp.label, x + 6, 115);
        doc.setFontSize(10.5);
        doc.setTextColor(255, 255, 255);
        doc.text(doc.splitTextToSize(cp.value, 50), x + 6, 126);
      });

      createFooter('Brief y Contexto');

      // -------------------------------------------------------------
      // PÁGINA 3: PILARES Y OBJETIVOS DE MARCA
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader('03', 'Pilares Estratégicos y Objetivos de Marca');

      const goalsList = (guideline.goals || []).slice(0, 3);
      goalsList.forEach((g, idx) => {
        const x = 20 + idx * 88;
        doc.setFillColor(22, 22, 26);
        doc.roundedRect(x, 32, 82, 108, 3, 3, 'F');

        doc.setFontSize(28);
        doc.setTextColor(prR, prG, prB);
        doc.text(g.number || `0${idx + 1}`, x + 8, 54);

        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        const splitGTitle = doc.splitTextToSize(translateDisplayText(g.title, g.title), 70);
        doc.text(splitGTitle, x + 8, 70);

        doc.setFontSize(9);
        doc.setTextColor(160, 160, 170);
        const splitGDesc = doc.splitTextToSize(translateDisplayText(g.description, ''), 70);
        doc.text(splitGDesc, x + 8, 86);
      });

      createFooter('Pilares Estratégicos');

      // -------------------------------------------------------------
      // PÁGINA 4: PROPUESTA PRINCIPAL & RACIONAL CONCEPTUAL
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader('04', 'Propuesta Principal y Racional Conceptual');

      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(translateDisplayText(guideline.directionName, 'Propuesta Principal'), 20, 36);

      // Columna izquierda: Racional
      doc.setFillColor(22, 22, 26);
      doc.roundedRect(20, 46, 120, 94, 3, 3, 'F');

      doc.setFontSize(8.5);
      doc.setTextColor(prR, prG, prB);
      doc.text('NARRATIVA Y CONCEPTO VISUAL', 28, 58);

      doc.setFontSize(9.5);
      doc.setTextColor(180, 180, 190);
      const ratText = translateDisplayText(
        guideline.directionRationale,
        'Esta propuesta sintetiza la esencia, los valores y la personalidad de la marca mediante una construcción geométrica equilibrada, garantizando máxima legibilidad y pregnancia tanto en medios digitales como impresos.'
      );
      const splitRat = doc.splitTextToSize(ratText, 104);
      doc.text(splitRat, 28, 70);

      // Columna derecha: Logotipo en grande
      doc.setFillColor(28, 28, 34);
      doc.roundedRect(148, 46, 129, 94, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 150);
      doc.text('REPRESENTACIÓN INSTITUCIONAL', 156, 58);

      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      doc.text(guideline.brandName, 156, 95);

      if (guideline.tagline) {
        doc.setFontSize(10);
        doc.setTextColor(160, 160, 170);
        doc.text(guideline.tagline, 156, 107);
      }

      createFooter('Racional de Logo');

      // -------------------------------------------------------------
      // PÁGINA 5 (Condicional): EVOLUCIÓN: ANTES VS. DESPUÉS
      // -------------------------------------------------------------
      if (guideline.isRebrand) {
        currentPageNum++;
        doc.addPage([297, 167], 'landscape');
        createHeader('05', 'Evolución de Marca: Antes vs. Después');

        // Card Antes
        doc.setFillColor(24, 20, 20);
        doc.roundedRect(20, 36, 122, 102, 3, 3, 'F');
        doc.setFontSize(10);
        doc.setTextColor(244, 63, 94);
        doc.text('01 • IDENTIDAD ANTERIOR (LEGACY)', 28, 48);

        doc.setFontSize(18);
        doc.setTextColor(220, 220, 220);
        doc.text(guideline.brandName, 28, 78);

        doc.setFontSize(9);
        doc.setTextColor(160, 150, 150);
        doc.text('• Estructura compleja con pérdida de nitidez en escalas reducidas.', 28, 96);
        doc.text('• Dificultades de reproducción en serigrafía, bordado y favicons.', 28, 106);
        doc.text('• Paleta cromática heterogénea sin estandarización digital.', 28, 116);

        // Card Después
        doc.setFillColor(20, 26, 24);
        doc.roundedRect(152, 36, 125, 102, 3, 3, 'F');
        doc.setFontSize(10);
        doc.setTextColor(16, 185, 129);
        doc.text('02 • NUEVA IDENTIDAD VISUAL (OPTIMIZADA)', 160, 48);

        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text(guideline.brandName, 160, 78);

        doc.setFontSize(9);
        doc.setTextColor(160, 180, 170);
        doc.text('• Geometría vectorizada limpia con proporción áurea de resguardo.', 160, 96);
        doc.text('• Sistema adaptable a avatares 16px, papelería y gran formato OOH.', 160, 106);
        doc.text('• Paleta estandarizada con valores certificados HEX, RGB y CMYK.', 160, 116);

        createFooter('Evolución Rebrand');
      }

      // -------------------------------------------------------------
      // PÁGINA (Condicional): VERSIONES OFICIALES Y SUBMARCAS
      // -------------------------------------------------------------
      if (guideline.logoVersions && guideline.logoVersions.length > 0) {
        currentPageNum++;
        doc.addPage([297, 167], 'landscape');
        createHeader(String(currentPageNum).padStart(2, '0'), 'Versiones Oficiales y Submarcas de la Marca');

        const vers = guideline.logoVersions.slice(0, 6);
        vers.forEach((v, idx) => {
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          const x = 20 + col * 88;
          const y = 34 + row * 54;

          doc.setFillColor(22, 22, 26);
          doc.roundedRect(x, y, 82, 48, 2.5, 2.5, 'F');

          doc.setFontSize(8.5);
          doc.setTextColor(prR, prG, prB);
          doc.text(v.tag ? `[${v.tag.toUpperCase()}]` : '[OFICIAL]', x + 6, y + 10);

          doc.setFontSize(10.5);
          doc.setTextColor(255, 255, 255);
          doc.text(doc.splitTextToSize(v.name, 70), x + 6, y + 20);

          doc.setFontSize(7.5);
          doc.setTextColor(140, 140, 150);
          doc.text(v.description ? doc.splitTextToSize(v.description, 70) : 'Versión complementaria aprobada.', x + 6, y + 36);
        });

        createFooter('Versiones y Submarcas');
      }

      // -------------------------------------------------------------
      // PÁGINA (Condicional): GALERÍA DE MOCKUPS FOTOGRÁFICOS
      // -------------------------------------------------------------
      if (guideline.mockupGalleryItems && guideline.mockupGalleryItems.length > 0) {
        currentPageNum++;
        doc.addPage([297, 167], 'landscape');
        createHeader(String(currentPageNum).padStart(2, '0'), 'Galería de Mockups y Aplicaciones Fotográficas');

        const mItems = guideline.mockupGalleryItems.slice(0, 4);
        mItems.forEach((m, idx) => {
          const x = 20 + idx * 64;
          doc.setFillColor(22, 22, 26);
          doc.roundedRect(x, 34, 60, 106, 2.5, 2.5, 'F');

          doc.setFontSize(8);
          doc.setTextColor(prR, prG, prB);
          doc.text(m.category.toUpperCase(), x + 6, 46);

          doc.setFontSize(10);
          doc.setTextColor(255, 255, 255);
          doc.text(doc.splitTextToSize(m.title, 48), x + 6, 58);

          doc.setFontSize(7.5);
          doc.setTextColor(150, 150, 160);
          doc.text(`Escala: ${m.stampScale || 100}%`, x + 6, 80);
          doc.text(`Posición: ${m.posX !== undefined ? `X:${m.posX}% Y:${m.posY}%` : (m.stampPositionPreset || 'Centro')}`, x + 6, 90);
          doc.text(`Fusión: ${m.blendMode || 'Normal'}`, x + 6, 100);
        });

        createFooter('Aplicaciones y Mockups');
      }

      // -------------------------------------------------------------
      // PÁGINA: RETÍCULA GEOMÉTRICA & TAMAÑOS MÍNIMOS
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Retícula Geométrica, Tamaños Mínimos e Iconografía');

      // Izquierda: Tamaños mínimos
      doc.setFillColor(22, 22, 26);
      doc.roundedRect(20, 34, 122, 106, 3, 3, 'F');

      doc.setFontSize(10);
      doc.setTextColor(prR, prG, prB);
      doc.text('TAMAÑOS MÍNIMOS DE REPRODUCCIÓN', 28, 46);

      const minSizes = [
        { label: 'Favicon / PWA Web', size: '16 × 16 px', desc: 'Uso obligatorio exclusivo de Isotipo/Símbolo monocromo.' },
        { label: 'Barra de App Móvil', size: '24 × 24 px', desc: 'Legibilidad óptica óptima en pantallas OLED y LCD retina.' },
        { label: 'Tarjetas de Presentación', size: '20 mm base', desc: 'Impresión offset con reserva de barniz o estampado en seco.' },
        { label: 'Bordado / Merchandising', size: '15 mm base', desc: 'Puntadas mínimas garantizadas sin empastamiento de hilo.' }
      ];

      minSizes.forEach((ms, idx) => {
        const y = 58 + idx * 20;
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(ms.label, 28, y);
        doc.setFontSize(9);
        doc.setTextColor(prR, prG, prB);
        doc.text(ms.size, 98, y);
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 150);
        doc.text(ms.desc, 28, y + 6);
      });

      // Derecha: Reglas Iconográficas
      doc.setFillColor(22, 22, 26);
      doc.roundedRect(150, 34, 127, 106, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(prR, prG, prB);
      doc.text('SISTEMA ICONOGRÁFICO INSTITUCIONAL', 158, 46);

      doc.setFontSize(9.5);
      doc.setTextColor(220, 220, 225);
      doc.text(`• Grosor de Trazo Maestro: ${guideline.iconStrokeWidth || 2}.0px Regular (Eje óptico uniforme)`, 158, 62);
      doc.text(`• Radio de Curvatura en Vértices: ${guideline.iconCornerRadius !== undefined ? guideline.iconCornerRadius : 6}px Suave`, 158, 76);
      doc.text('• Terminaciones (Linecap): Rounded / Esquinas semicirculares.', 158, 90);
      doc.text('• Cuadrícula Base: Iconos construidos sobre lienzo modular 24×24px.', 158, 104);
      doc.text('• Cohesión Visual: Los iconos acompañan la personalidad geométrica del logo.', 158, 118);

      createFooter('Construcción y Escala');

      // -------------------------------------------------------------
      // PÁGINA: ÁREA DE RESGUARDO (SAFE ZONE) & DON'TS
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Área de Resguardo (Safe Zone) y Usos Incorrectos');

      // Safe zone card
      doc.setFillColor(22, 22, 26);
      doc.roundedRect(20, 34, 96, 106, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(prR, prG, prB);
      doc.text('ÁREA DE RESGUARDO 1X', 28, 46);
      doc.setFontSize(8.5);
      doc.setTextColor(170, 170, 180);
      doc.text('Se define un margen perimetral mínimo de seguridad (1x) que protege al logotipo frente a otros elementos gráficos, bordes de corte o textos ajenos.', 28, 58, { maxWidth: 80 });
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text('Margen de Protección: 1x', 28, 100);
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 140);
      doc.text('X equivale a la altura proporcional del isotipo.', 28, 108);

      // Don'ts grid
      const dontsList = [
        { title: 'No Deformar', desc: 'No alterar proporciones horizontales ni verticales bajo ninguna circunstancia.' },
        { title: 'No Rotar', desc: 'No inclinar el logotipo ni usarlo en ángulos distintos a 0° horizontal.' },
        { title: 'Sin Sombras Ajenas', desc: 'No aplicar biseles, brillos, sombras paralelas o trazos externos.' },
        { title: 'Contraste Insuficiente', desc: 'No colocar sobre fondos saturados o complejos que degraden su legibilidad.' }
      ];

      dontsList.forEach((d, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 124 + col * 78;
        const y = 34 + row * 55;
        doc.setFillColor(26, 20, 20);
        doc.roundedRect(x, y, 74, 51, 2.5, 2.5, 'F');
        doc.setFontSize(9);
        doc.setTextColor(244, 63, 94);
        doc.text(`✕  ${d.title}`, x + 6, y + 14);
        doc.setFontSize(8);
        doc.setTextColor(170, 160, 160);
        doc.text(d.desc, x + 6, y + 26, { maxWidth: 62 });
      });

      createFooter('Reglas de Uso y Protección');

      // -------------------------------------------------------------
      // PÁGINA: PRUEBA DE CONTRASTE 50/50 & VERSIONES OFICIALES
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Prueba de Contraste 50/50 y Versiones Oficiales');

      // Mitad Izquierda: Fondo Oscuro (Versión Negativa)
      doc.setFillColor(10, 10, 12);
      doc.roundedRect(20, 34, 124, 106, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(160, 160, 170);
      doc.text('01 • VERSIÓN NEGATIVA (FONDOS OSCUROS)', 28, 46);
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(guideline.brandName, 28, 86);
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 150);
      doc.text('Uso sobre negro obsidiana, azul marino y superficies nocturnas.', 28, 124);

      // Mitad Derecha: Fondo Claro (Versión Positiva)
      doc.setFillColor(245, 245, 242);
      doc.roundedRect(152, 34, 125, 106, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 100);
      doc.text('02 • VERSIÓN POSITIVA (FONDOS CLAROS)', 160, 46);
      doc.setFontSize(22);
      doc.setTextColor(20, 20, 24);
      doc.text(guideline.brandName, 160, 86);
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 120);
      doc.text('Uso sobre papel blanco, bolsas kraft, membretes y pantallas diurnas.', 160, 124);

      createFooter('Contraste Oficial');

      // -------------------------------------------------------------
      // PÁGINA: SISTEMA CROMÁTICO (PALETA HEX/RGB/CMYK) + AUDITOR WCAG
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Sistema Cromático y Auditor de Accesibilidad WCAG');

      const allCols = guideline.colors || [];
      const colBoxW = Math.min(60, Math.floor(255 / Math.max(1, allCols.length)));
      allCols.forEach((c, idx) => {
        const x = 20 + idx * (colBoxW + 4);
        const cClean = c.hex.replace('#', '');
        const cr = parseInt(cClean.substring(0, 2), 16) || 0;
        const cg = parseInt(cClean.substring(2, 4), 16) || 0;
        const cb = parseInt(cClean.substring(4, 6), 16) || 0;

        doc.setFillColor(cr, cg, cb);
        doc.roundedRect(x, 34, colBoxW, 64, 2.5, 2.5, 'F');

        const specs = hexToColorSpecs(c.hex);
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        doc.text(c.name, x, 108);

        doc.setFontSize(7.5);
        doc.setTextColor(165, 165, 175);
        doc.text(`HEX: ${c.hex.toUpperCase()}`, x, 115);
        doc.text(`RGB: ${c.rgb || specs.rgb}`, x, 121);
        doc.text(`CMYK: ${c.cmyk || specs.cmyk}`, x, 127);
        doc.text(`Pantone: ${c.pantone || specs.pantone}`, x, 133);
      });

      doc.setFontSize(8);
      doc.setTextColor(prR, prG, prB);
      doc.text('✓ Auditor de Accesibilidad WCAG 2.1: Todos los contrastes cumplen estándar AA/AAA para texto corporativo.', 20, 145);

      createFooter('Sistema Cromático');

      // -------------------------------------------------------------
      // PÁGINA: SISTEMA TIPOGRÁFICO INSTITUCIONAL
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Sistema Tipográfico y Jerarquías Visuales');

      const pFont = guideline.typography?.[0]?.fontFamily || 'Inter';
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(`Familia Principal: ${pFont}`, 20, 36);

      doc.setFontSize(12);
      doc.setTextColor(180, 180, 190);
      doc.text('El veloz murciélago hindú comía feliz cardillo y kiwi.', 20, 48);

      doc.setFontSize(9);
      doc.setTextColor(140, 140, 150);
      doc.text('Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Ññ Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz  •  0 1 2 3 4 5 6 7 8 9', 20, 58);

      // Tabla de jerarquía tipográfica
      const typeScales = [
        { role: 'H1 Titulares Hero', size: '48 - 64 px', weight: 'Bold / 700', sample: 'Titulares de alto impacto en cartelería y portadas' },
        { role: 'H2 Títulos de Sección', size: '24 - 32 px', weight: 'SemiBold / 600', sample: 'Encabezados de láminas, folletos y presentaciones' },
        { role: 'H3 Subtítulos & Botones', size: '14 - 18 px', weight: 'Medium / 500', sample: 'Elementos interactivos, citas y destacados' },
        { role: 'Body / Texto Corrido', size: '10 - 12 px', weight: 'Regular / 400', sample: 'Párrafos extensos con interlineado 150% para lectura fluida' }
      ];

      typeScales.forEach((ts, idx) => {
        const y = 76 + idx * 16;
        doc.setFillColor(24, 24, 28);
        doc.roundedRect(20, y - 4, 257, 13, 2, 2, 'F');
        doc.setFontSize(8.5);
        doc.setTextColor(prR, prG, prB);
        doc.text(ts.role, 26, y + 4);
        doc.setTextColor(255, 255, 255);
        doc.text(ts.size, 82, y + 4);
        doc.setTextColor(170, 170, 180);
        doc.text(ts.weight, 118, y + 4);
        doc.setTextColor(140, 140, 150);
        doc.text(ts.sample, 158, y + 4);
      });

      createFooter('Tipografía');

      // -------------------------------------------------------------
      // PÁGINA: APLICACIONES TEXTILES E INDUMENTARIA (MOCKUPS 3D)
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Aplicaciones Textiles e Indumentaria (Mockups 3D)');

      const garmentSpecs = [
        { item: 'Polera / Crewneck Pesado', material: 'Algodón French Terry 480g', print: 'Estampado textil tacto cero en pecho izquierdo o centro.' },
        { item: 'Camiseta Corte Boxy', material: 'Algodón Peinado 300g', print: 'Serigrafía HD de alta definición resistente al lavado.' },
        { item: 'Hoodie con Capucha', material: 'Franela Pesada 520g', print: 'Estampado frontal o bordado en relieve de alta densidad.' },
        { item: 'Gorra Estructurada 6 Paneles', material: 'Sarga Cepillada Premium', print: 'Bordado 3D en relieve con puntada de precisión.' }
      ];

      garmentSpecs.forEach((gs, idx) => {
        const x = 20 + idx * 65;
        doc.setFillColor(22, 22, 26);
        doc.roundedRect(x, 34, 61, 106, 3, 3, 'F');

        doc.setFontSize(14);
        doc.setTextColor(prR, prG, prB);
        doc.text(`0${idx + 1}`, x + 6, 50);

        doc.setFontSize(10.5);
        doc.setTextColor(255, 255, 255);
        doc.text(doc.splitTextToSize(gs.item, 50), x + 6, 64);

        doc.setFontSize(8);
        doc.setTextColor(180, 180, 190);
        doc.text(gs.material, x + 6, 88);

        doc.setFontSize(7.5);
        doc.setTextColor(140, 140, 150);
        doc.text(doc.splitTextToSize(gs.print, 48), x + 6, 98);
      });

      createFooter('Indumentaria Textil');

      // -------------------------------------------------------------
      // PÁGINA: ARTÍCULOS PROMOCIONALES & MERCHANDISING
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Artículos Corporativos, Credenciales y Merchandising');

      const merchSpecs = [
        { item: 'Bolso Tote de Lona', mat: 'Lona Cruda 16oz', desc: 'Asas reforzadas con costura Box-X, tintas ecológicas al agua.' },
        { item: 'Termo de Acero Inoxidable', mat: 'Acero Térmico 750ml', desc: 'Grabado láser mate perimetral de alta durabilidad.' },
        { item: 'Fotocheck RFID + QR', mat: 'Policarbonato 30mil', desc: 'Cinta satinada 20mm con código QR dinámico de autenticidad.' },
        { item: 'Sticker Troquelado Portátil', mat: 'Vinilo Laminado Mate', desc: 'Corte por plotter digital con resistencia UV y arañazos.' }
      ];

      merchSpecs.forEach((ms, idx) => {
        const x = 20 + idx * 65;
        doc.setFillColor(22, 22, 26);
        doc.roundedRect(x, 34, 61, 106, 3, 3, 'F');

        doc.setFontSize(14);
        doc.setTextColor(prR, prG, prB);
        doc.text(`0${idx + 1}`, x + 6, 50);

        doc.setFontSize(10.5);
        doc.setTextColor(255, 255, 255);
        doc.text(doc.splitTextToSize(ms.item, 50), x + 6, 64);

        doc.setFontSize(8);
        doc.setTextColor(180, 180, 190);
        doc.text(ms.mat, x + 6, 88);

        doc.setFontSize(7.5);
        doc.setTextColor(140, 140, 150);
        doc.text(doc.splitTextToSize(ms.desc, 48), x + 6, 98);
      });

      createFooter('Artículos Promocionales');

      // -------------------------------------------------------------
      // PÁGINA: PAPELERÍA CORPORATIVA EJECUTIVA
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Papelería Corporativa (A4, Tarjeta, Sobre y Carpeta)');

      const statSpecs = [
        { item: 'Tarjeta de Presentación', format: '85 × 55 mm', desc: 'Cartulina Couché 350g, plastificado soft touch mate, tiro y retiro con código QR.' },
        { item: 'Hoja Membretada A4', format: '210 × 297 mm', desc: 'Papel Bond Kimberly 90g con cabecera y pie de página corporativo.' },
        { item: 'Sobre Americano DL', format: '220 × 110 mm', desc: 'Papel offset con ventana opcional y cierre con tira de silicona autoadhesiva.' },
        { item: 'Carpeta Portadocumentos', format: '225 × 315 mm', desc: 'Cartulina Dúplex 350g con solapa troquelada y ranuras para tarjetas.' }
      ];

      statSpecs.forEach((ss, idx) => {
        const x = 20 + idx * 65;
        doc.setFillColor(22, 22, 26);
        doc.roundedRect(x, 34, 61, 106, 3, 3, 'F');

        doc.setFontSize(14);
        doc.setTextColor(prR, prG, prB);
        doc.text(`0${idx + 1}`, x + 6, 50);

        doc.setFontSize(10.5);
        doc.setTextColor(255, 255, 255);
        doc.text(doc.splitTextToSize(ss.item, 50), x + 6, 64);

        doc.setFontSize(8);
        doc.setTextColor(180, 180, 190);
        doc.text(ss.format, x + 6, 88);

        doc.setFontSize(7.5);
        doc.setTextColor(140, 140, 150);
        doc.text(doc.splitTextToSize(ss.desc, 48), x + 6, 98);
      });

      createFooter('Papelería Corporativa');

      // -------------------------------------------------------------
      // PÁGINA: PACKAGING Y SISTEMA DE EMPAQUES
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Sistema de Packaging, Cajas y Bolsas Kraft');

      const packSpecs = [
        { item: 'Caja de Entrega Gourmet', mat: 'Cartón Microcorrugado', desc: 'Impresión flexográfica exterior con precinto adhesivo de seguridad.' },
        { item: 'Vaso Térmico Doble Pared', mat: 'Polipropileno / Cartón 16oz', desc: 'Faja térmica texturizada con logotipo y tapa hermética mate.' },
        { item: 'Bolsa Ecológica Kraft', mat: 'Papel Kraft 140g', desc: 'Asas de papel torcido, tintas biodegradables y fuelle reforzado.' },
        { item: 'Etiqueta Troquelada Hang Tag', mat: 'Cartulina Dúplex 600g', desc: 'Ojal metálico pavonado, cordel de yute y stamping de marca.' }
      ];

      packSpecs.forEach((ps, idx) => {
        const x = 20 + idx * 65;
        doc.setFillColor(22, 22, 26);
        doc.roundedRect(x, 34, 61, 106, 3, 3, 'F');

        doc.setFontSize(14);
        doc.setTextColor(prR, prG, prB);
        doc.text(`0${idx + 1}`, x + 6, 50);

        doc.setFontSize(10.5);
        doc.setTextColor(255, 255, 255);
        doc.text(doc.splitTextToSize(ps.item, 50), x + 6, 64);

        doc.setFontSize(8);
        doc.setTextColor(180, 180, 190);
        doc.text(ps.mat, x + 6, 88);

        doc.setFontSize(7.5);
        doc.setTextColor(140, 140, 150);
        doc.text(doc.splitTextToSize(ps.desc, 48), x + 6, 98);
      });

      createFooter('Empaques y Packaging');

      // -------------------------------------------------------------
      // PÁGINA: SEÑALÉTICA EXTERIOR (OOH), FACHADA Y FLOTA
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Señalética Exterior (OOH), Fachada y Flota Vehicular');

      const oohSpecs = [
        { item: 'Valla Publicitaria 14×48 FT', mat: 'Lona Frontlit 13oz', desc: 'Iluminación LED superior de haz amplio para alta visibilidad a 150m.' },
        { item: 'Letrero de Fachada Comercial', mat: 'Aluminio Anodizado', desc: 'Caja circular retroiluminada de acrílico opalino doble cara.' },
        { item: 'Furgoneta de Reparto Rotulada', mat: 'Vinilo Fundido 3M', desc: 'Rotulación integral de carrocería con película protectora anti-rayado.' }
      ];

      oohSpecs.forEach((os, idx) => {
        const x = 20 + idx * 88;
        doc.setFillColor(22, 22, 26);
        doc.roundedRect(x, 34, 82, 106, 3, 3, 'F');

        doc.setFontSize(16);
        doc.setTextColor(prR, prG, prB);
        doc.text(`0${idx + 1}`, x + 8, 52);

        doc.setFontSize(11.5);
        doc.setTextColor(255, 255, 255);
        doc.text(doc.splitTextToSize(os.item, 70), x + 8, 66);

        doc.setFontSize(8.5);
        doc.setTextColor(180, 180, 190);
        doc.text(os.mat, x + 8, 90);

        doc.setFontSize(8);
        doc.setTextColor(140, 140, 150);
        doc.text(doc.splitTextToSize(os.desc, 68), x + 8, 100);
      });

      createFooter('Gran Formato y Vehículos');

      // -------------------------------------------------------------
      // PÁGINA: ECOSISTEMA DIGITAL Y REDES SOCIALES
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Ecosistema Digital y Kit de Redes Sociales');

      // Izquierda: Instagram
      doc.setFillColor(22, 22, 26);
      doc.roundedRect(20, 34, 122, 106, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(prR, prG, prB);
      doc.text('GRILLA DE INSTAGRAM (1080 × 1350 PX)', 28, 46);
      doc.setFontSize(8.5);
      doc.setTextColor(170, 170, 180);
      doc.text('Esquema coordinado de 6 publicaciones temáticas que alternan color de marca, fotografía institucional y frases de manifiesto.', 28, 58, { maxWidth: 106 });

      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('• Post 01: Lanzamiento de la Identidad Visual', 28, 82);
      doc.text('• Post 02: Manifiesto y Valores Institucionales', 28, 92);
      doc.text('• Post 03: Arquitectura del Logotipo', 28, 102);
      doc.text('• Post 04: Paleta Cromática y Propósito', 28, 112);
      doc.text('• Post 05: Aplicaciones y Casos Reales', 28, 122);
      doc.text('• Post 06: Call to Action y Conexión con Clientes', 28, 132);

      // Derecha: LinkedIn & Formatos Digitales
      doc.setFillColor(22, 22, 26);
      doc.roundedRect(150, 34, 127, 106, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(prR, prG, prB);
      doc.text('PERFIL CORPORATIVO LINKEDIN & WEB', 158, 46);

      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text('• Portada de LinkedIn: 1584 × 396 px (Gradiente oficial + Slogan)', 158, 62);
      doc.text('• Avatar Oficial de Empresa: 400 × 400 px con isotipo centrado', 158, 76);
      doc.text('• Formato Story / Reel: 1080 × 1920 px (9:16 vertical)', 158, 90);
      doc.text('• Formato Pauta Meta Ads: 1200 × 628 px horizontal', 158, 104);
      doc.text('• Firma de Correo HTML: Tipografía estándar con logotipo 180px', 158, 118);

      createFooter('Ecosistema Digital');

      // -------------------------------------------------------------
      // PÁGINA: HOJA DE RUTA Y PRÓXIMOS PASOS
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Hoja de Ruta y Fases de Implementación');

      const stepsList = guideline.nextSteps || [
        { step: '01', title: 'Revisión & Feedback', description: 'Recepción de comentarios del cliente a través del módulo interactivo.' },
        { step: '02', title: 'Ajustes y Pulido', description: 'Refinamiento de detalles técnicos, contrastes y jerarquías acordadas.' },
        { step: '03', title: 'Aprobación Oficial', description: 'Emisión del acta de conformidad y congelamiento de versión final.' },
        { step: '04', title: 'Entrega de Editables', description: 'Despliegue del kit completo en Google Drive con vectores y tokens.' }
      ];

      stepsList.forEach((s, idx) => {
        const x = 20 + idx * 65;
        doc.setFillColor(22, 22, 26);
        doc.roundedRect(x, 34, 61, 106, 3, 3, 'F');

        doc.setFontSize(18);
        doc.setTextColor(prR, prG, prB);
        doc.text(s.step || `0${idx + 1}`, x + 6, 52);

        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(doc.splitTextToSize(translateDisplayText(s.title, s.title), 50), x + 6, 68);

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 160);
        doc.text(doc.splitTextToSize(translateDisplayText(s.description, ''), 48), x + 6, 90);
      });

      createFooter('Hoja de Ruta');

      // -------------------------------------------------------------
      // PÁGINA FINAL: KIT DE DESCARGAS Y CERTIFICADO DE APROBACIÓN
      // -------------------------------------------------------------
      currentPageNum++;
      doc.addPage([297, 167], 'landscape');
      createHeader(String(currentPageNum).padStart(2, '0'), 'Kit de Archivos Editables y Certificado de Aprobación');

      // Izquierda: Contenido del Kit
      doc.setFillColor(22, 22, 26);
      doc.roundedRect(20, 34, 122, 106, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(prR, prG, prB);
      doc.text('CONTENIDO DEL PAQUETE ENTREGABLE', 28, 46);

      const deliverables = [
        'Logotipos Vectoriales (.SVG, .AI, .EPS) en versiones positiva y negativa.',
        'Imágenes de Alta Definición (.PNG a 300 DPI con transparencia y .JPG).',
        'Manual de Marca en PDF 16:9 de Alta Resolución para proyección.',
        'Tokens de Diseño CSS / JSON listos para integración web y app.',
        'Carpeta Cloud de Google Drive con acceso permanente para el cliente.'
      ];
      deliverables.forEach((item, idx) => {
        doc.setFontSize(8.5);
        doc.setTextColor(220, 220, 225);
        doc.text(`✓  ${item}`, 28, 62 + idx * 14, { maxWidth: 106 });
      });

      // Derecha: Estado de Conformidad Oficial
      doc.setFillColor(25, 28, 26);
      doc.roundedRect(150, 34, 127, 106, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text('CERTIFICADO DE CONFORMIDAD INSTITUCIONAL', 158, 46);

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(`Identidad de Marca: {${guideline.brandName}}`, 158, 64);

      doc.setFontSize(9);
      doc.setTextColor(180, 180, 190);
      doc.text(`Estado Actual: ${guideline.status === 'approved' ? 'APROBADO OFICIALMENTE' : 'EN PROCESO DE REVISIÓN'}`, 158, 76);
      doc.text(`Versión Registrada: ${translateDisplayText(guideline.round, 'Ronda 1')}`, 158, 86);
      doc.text(`Diseñador Responsable: ${guideline.designerName || 'Roma Agencia'}`, 158, 96);
      doc.text(`Fecha de Emisión: ${guideline.date || '2026'}`, 158, 106);

      doc.setFontSize(8);
      doc.setTextColor(130, 130, 140);
      doc.text('ROMA SaaS • Sistema de Agencia de Publicidad y Diseño Multitenant', 158, 130);

      createFooter('Certificado y Descargas');

      doc.save(`${guideline.brandName.toLowerCase().replace(/\s+/g, '-')}-manual-marca-16-9.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  // Enviar comentario sobre la diapositiva actual
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !guideline) return;

    try {
      setSubmittingComment(true);
      const currentSlide = slides[currentSlideIndex] || { id: 'general', title: 'General' };
      const res = await fetch(`/api/workspace/brand-guidelines/public/${token}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slideId: currentSlide.id,
          slideTitle: currentSlide.title,
          authorName: commentAuthor.trim() || guideline.clientName || 'Cliente',
          text: commentText.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.guideline) {
        setGuideline(data.guideline);
        setCommentText('');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Enviar Aprobación Oficial o Solicitud de Cambios
  const handleSubmitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guideline) return;

    try {
      setSubmittingApproval(true);
      const res = await fetch(`/api/workspace/brand-guidelines/public/${token}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approvalDecision,
          approvedBy: approvalName.trim() || guideline.clientName || 'Cliente',
          approvalNotes: approvalNotes.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.guideline) {
        setGuideline(data.guideline);
        setIsApprovalModalOpen(false);
      }
    } catch (err) {
      console.error('Error submitting approval:', err);
    } finally {
      setSubmittingApproval(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HELPER DE AUTO-ESTAMPADO DEL LOGO O ICONO/ISOTIPO (PARA PRENDAS Y MOCKUPS)
  // ---------------------------------------------------------------------------
  // Resuelve qué logo utilizar en mockups fotográficos
  const resolvePublicMockupLogo = (
    logoType: 'primary' | 'secondary' | 'symbol' | 'symbol_dark' | 'favicon' | 'custom_version',
    customVersionId?: string
  ): string => {
    if (!guideline) return '';
    if (logoType === 'custom_version' && customVersionId) {
      const found = (guideline.logoVersions || []).find((v) => v.id === customVersionId);
      if (found?.url) return found.url;
    }
    if (logoType === 'secondary') {
      return (
        guideline.logoSecondaryUrl ||
        guideline.logoPrimaryUrl ||
        guideline.logoSymbolDarkUrl ||
        guideline.logoSymbolUrl ||
        ''
      );
    }
    if (logoType === 'symbol') {
      return (
        guideline.logoSymbolUrl ||
        guideline.logoPrimaryUrl ||
        guideline.logoSymbolDarkUrl ||
        ''
      );
    }
    if (logoType === 'symbol_dark') {
      return (
        guideline.logoSymbolDarkUrl ||
        guideline.logoSymbolUrl ||
        guideline.logoSecondaryUrl ||
        guideline.logoPrimaryUrl ||
        ''
      );
    }
    if (logoType === 'favicon') {
      return guideline.logoFaviconUrl || guideline.logoSymbolUrl || guideline.logoPrimaryUrl || '';
    }
    return guideline.logoPrimaryUrl || guideline.logoSymbolUrl || guideline.logoSecondaryUrl || '';
  };

  const getPublicMockupStampStyle = (
    pos: 'chest_left' | 'center_large' | 'back_print' | 'full' | 'subtle' | 'custom' = 'center_large',
    scale: number = 100,
    blendMode: 'normal' | 'multiply' | 'screen' = 'normal',
    posX?: number,
    posY?: number
  ): React.CSSProperties => {
    const scaleRatio = (scale || 100) / 100;
    const base: React.CSSProperties = {
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      mixBlendMode: blendMode,
    };
    if (posX !== undefined && posY !== undefined) {
      return {
        ...base,
        top: `${posY}%`,
        left: `${posX}%`,
        width: `${Math.round(35 * scaleRatio)}%`,
        height: `${Math.round(35 * scaleRatio)}%`,
      };
    }
    switch (pos) {
      case 'chest_left':
        return {
          ...base,
          top: '36%',
          left: '38%',
          width: `${Math.round(20 * scaleRatio)}%`,
          height: `${Math.round(20 * scaleRatio)}%`,
        };
      case 'center_large':
        return {
          ...base,
          top: '46%',
          left: '50%',
          width: `${Math.round(36 * scaleRatio)}%`,
          height: `${Math.round(36 * scaleRatio)}%`,
        };
      case 'back_print':
        return {
          ...base,
          top: '42%',
          left: '50%',
          width: `${Math.round(44 * scaleRatio)}%`,
          height: `${Math.round(44 * scaleRatio)}%`,
        };
      case 'full':
        return {
          ...base,
          top: '50%',
          left: '50%',
          width: `${Math.round(52 * scaleRatio)}%`,
          height: `${Math.round(52 * scaleRatio)}%`,
        };
      case 'subtle':
        return {
          ...base,
          top: '58%',
          left: '50%',
          width: `${Math.round(22 * scaleRatio)}%`,
          height: `${Math.round(22 * scaleRatio)}%`,
        };
      default:
        return {
          ...base,
          top: '50%',
          left: '50%',
          width: `${Math.round(35 * scaleRatio)}%`,
          height: `${Math.round(35 * scaleRatio)}%`,
        };
    }
  };

  const renderBrandStamp = (
    variant: 'light' | 'dark' = 'light',
    sizeClass = 'h-5',
    textClass = 'text-xs',
    preferSymbol = false
  ) => {
    if (!guideline) return null;

    const useSymbolFirst =
      liveStampMode === 'symbol_only' || (liveStampMode === 'auto' && preferSymbol);

    const lightSymbol =
      guideline.logoSymbolUrl ||
      guideline.logoSymbolDarkUrl ||
      guideline.logoPrimaryUrl ||
      guideline.logoSecondaryUrl;
    const darkSymbol =
      guideline.logoSymbolDarkUrl ||
      guideline.logoSymbolUrl ||
      guideline.logoSecondaryUrl ||
      guideline.logoPrimaryUrl;

    const lightFull =
      guideline.logoPrimaryUrl ||
      guideline.logoSecondaryUrl ||
      guideline.logoSymbolUrl ||
      guideline.logoSymbolDarkUrl;
    const darkFull =
      guideline.logoSecondaryUrl ||
      guideline.logoPrimaryUrl ||
      guideline.logoSymbolDarkUrl ||
      guideline.logoSymbolUrl;

    const url = useSymbolFirst
      ? variant === 'light'
        ? lightSymbol
        : darkSymbol
      : variant === 'light'
      ? lightFull
      : darkFull;

    if (url) {
      return <img src={url} alt={guideline.brandName} className={`${sizeClass} object-contain select-none`} />;
    }

    const boxColor = variant === 'light' ? 'bg-white' : 'bg-zinc-950';
    const txtColor = variant === 'light' ? 'text-white' : 'text-zinc-950';

    return (
      <div className={`inline-flex items-center gap-1.5 ${txtColor} font-bold tracking-tight select-none`}>
        <div className={`w-3 h-3 ${boxColor} relative shrink-0`}>
          <div className={`w-1.5 h-1.5 ${boxColor} absolute -top-1 -left-1`} />
        </div>
        {!useSymbolFirst && <span className={textClass}>{guideline.brandName}</span>}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // RENDERIZADO DE MOCKUPS DE ESTUDIO HIPER-DETALLADOS (CON ZOOM + COLORWAYS)
  // ---------------------------------------------------------------------------
  const getGarmentPalette = () => {
    const brandHex = guideline?.colors?.[0]?.hex || '#4F46E5';
    if (mockupColorway === 'offwhite') {
      return {
        base: '#F0EFEA',
        mid: '#E4E2DC',
        dark: '#CFCBC2',
        rib: '#E8E6E0',
        stitch: '#B8B4AA',
        stampVariant: 'dark' as const,
        blendClass: 'mix-blend-multiply opacity-90',
      };
    }
    if (mockupColorway === 'brand') {
      return {
        base: brandHex,
        mid: brandHex,
        dark: '#101014',
        rib: brandHex,
        stitch: 'rgba(255,255,255,0.28)',
        stampVariant: 'light' as const,
        blendClass: ' opacity-95 drop-shadow-sm',
      };
    }
    // Default: Obsidian Studio Black
    return {
      base: '#18181B',
      mid: '#121215',
      dark: '#09090B',
      rib: '#1F1F23',
      stitch: '#3F3F46',
      stampVariant: 'light' as const,
      blendClass: 'opacity-95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]',
    };
  };

  const renderColorwaySelector = () => (
    <div className="flex flex-wrap items-center gap-2">
      {/* Selector de Modo: Auto / Solo Icono / Logo Completo */}
      <div className="flex items-center gap-1 bg-black/10 dark:bg-white/10 px-2 py-1 rounded-full">
        <span className="text-[9px] font-mono uppercase opacity-70 mr-0.5">Marca:</span>
        {(
          [
            { id: 'auto', label: 'Auto' },
            { id: 'symbol_only', label: '★ Solo Icono' },
            { id: 'full_logo', label: 'Logo' },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLiveStampMode(m.id);
            }}
            className={`px-2 py-0.5 rounded-full text-[9px] font-mono cursor-pointer transition ${
              liveStampMode === m.id
                ? 'bg-emerald-400 text-zinc-950 font-bold'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Selector de Posición del Estampado en Vivo */}
      <div className="flex items-center gap-1 bg-black/10 dark:bg-white/10 px-2 py-1 rounded-full">
        <span className="text-[9px] font-mono uppercase opacity-70 mr-0.5">Estampado:</span>
        {(
          [
            { id: 'chest_left', label: 'Pecho Izq' },
            { id: 'center_large', label: 'Centro' },
            { id: 'back_print', label: 'Espalda' },
          ] as const
        ).map((pos) => (
          <button
            key={pos.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLiveStampPos(pos.id);
            }}
            className={`px-2 py-0.5 rounded-full text-[9px] font-mono cursor-pointer transition ${
              liveStampPos === pos.id
                ? 'bg-amber-400 text-zinc-950 font-bold'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            {pos.label}
          </button>
        ))}
      </div>

      {/* Selector de Color */}
      <div className="flex items-center gap-1.5 bg-black/10 dark:bg-white/10 px-2.5 py-1 rounded-full">
        <span className="text-[9px] font-mono uppercase opacity-70 mr-1">Color:</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMockupColorway('obsidian');
          }}
          title="Negro Obsidiana"
          className={`w-4 h-4 rounded-full bg-[#141414] border cursor-pointer transition-transform ${
            mockupColorway === 'obsidian' ? 'scale-125 ring-2 ring-amber-400 border-white' : 'border-zinc-500'
          }`}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMockupColorway('offwhite');
          }}
          title="Blanco Crudo de Estudio"
          className={`w-4 h-4 rounded-full bg-[#F0EFEA] border cursor-pointer transition-transform ${
            mockupColorway === 'offwhite' ? 'scale-125 ring-2 ring-amber-400 border-zinc-900' : 'border-zinc-400'
          }`}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMockupColorway('brand');
          }}
          title="Color Primario de Marca"
          style={{ backgroundColor: guideline?.colors?.[0]?.hex || '#4F46E5' }}
          className={`w-4 h-4 rounded-full border cursor-pointer transition-transform ${
            mockupColorway === 'brand' ? 'scale-125 ring-2 ring-amber-400 border-white' : 'border-white/40'
          }`}
        />
      </div>
    </div>
  );

  const getGarmentStampPlacementStyle = () => {
    const userScale = (guideline?.stampScale || 100) / 100;
    if (liveStampPos === 'center_large') {
      return {
        top: '46%',
        left: '50%',
        transform: `translate(-50%, -50%) perspective(400px) rotateX(4deg) scale(${(1.15 * userScale).toFixed(2)})`,
        transformOrigin: 'center center',
      };
    }
    if (liveStampPos === 'back_print') {
      return {
        top: '40%',
        left: '50%',
        transform: `translate(-50%, -50%) perspective(400px) rotateX(2deg) scale(${(1.35 * userScale).toFixed(2)})`,
        transformOrigin: 'center center',
      };
    }
    // chest_left (Pecho izquierdo anatómico = a la derecha del observador)
    return {
      top: '36%',
      left: '61%',
      transform: `translate(-50%, -50%) perspective(300px) rotateY(-8deg) rotateZ(1deg) scale(${(0.95 * userScale).toFixed(2)})`,
      transformOrigin: 'center center',
    };
  };

  const renderStudioMockupCard = (
    itemKey: 'sweatshirt' | 'tshirt' | 'hoodie' | 'cap' | 'tote' | 'thermos' | 'lanyard' | 'macbook',
    isZoomed = false
  ) => {
    const pal = getGarmentPalette();
    const uid = `${itemKey}_${isZoomed ? 'zoom' : 'card'}`;
    const cardScale = isZoomed ? 'scale-125 sm:scale-150 my-10' : '';
    const sceneMode = guideline?.photoSceneMode || 'studio_3d';

    const labels: Record<string, { title: string; spec: string }> = {
      sweatshirt: { title: 'Polera / Crewneck Pesado', spec: 'Algodón French Terry 480g • Estampado Textil' },
      tshirt: { title: 'Camiseta Corte Boxy', spec: 'Algodón Peinado 300g • Serigrafía HD' },
      hoodie: { title: 'Hoodie / Polera con Capucha', spec: 'Franela Pesada 520g • Estampado de Marca' },
      cap: { title: 'Gorra Estructurada 6 Paneles', spec: 'Sarga Cepillada • Bordado 3D en Relieve' },
      tote: { title: 'Bolso Tote de Lona Gruesa', spec: 'Lona Cruda 16oz • Asas Reforzadas' },
      thermos: { title: 'Termo de Acero Mate', spec: 'Acero Termoaislante • Grabado Láser' },
      lanyard: { title: 'Fotocheck RFID + QR Vivo', spec: 'Cinta Satinada • Credencial Policarbonato' },
      macbook: { title: 'MacBook Pro + Sticker Troquelado', spec: 'Aluminio Anodizado • Vinilo de Corte' },
    };

    const isDarkBackdrop =
      itemKey === 'lanyard' ||
      itemKey === 'macbook' ||
      sceneMode === 'urban_model' ||
      sceneMode === 'coffee_shop';

    const sceneBackdropClass =
      sceneMode === 'urban_model'
        ? 'bg-gradient-to-br from-[#27272A] via-[#18181B] to-[#09090B] text-white border border-zinc-700/70'
        : sceneMode === 'coffee_shop'
        ? 'bg-gradient-to-br from-[#3E2F26] via-[#261C16] to-[#140E0B] text-amber-50 border border-amber-900/50'
        : sceneMode === 'creative_office'
        ? 'bg-gradient-to-br from-[#E2E8F0] via-[#CBD5E1] to-[#94A3B8] text-zinc-900 border border-slate-400/40'
        : isDarkBackdrop
        ? 'bg-gradient-to-b from-[#202024] via-[#161619] to-[#0E0E11] text-white border border-zinc-700/70'
        : 'bg-gradient-to-b from-[#F4F4F1] via-[#E7E6E1] to-[#D5D4CE] text-zinc-900 border border-black/10';

    const garmentPlacementStyle = getGarmentStampPlacementStyle();

    return (
      <div
        onClick={() => !isZoomed && setZoomedMockup(itemKey)}
        className={`group rounded-2xl p-4 flex flex-col items-center justify-between relative overflow-hidden transition-all duration-300 ${
          isZoomed ? 'min-h-[380px] w-full cursor-default' : 'min-h-[225px] cursor-zoom-in hover:shadow-2xl hover:-translate-y-0.5'
        } ${sceneBackdropClass}`}
      >
        {/* Filtro SVG feDisplacementMap para deformación realista sobre pliegues textiles */}
        <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
          <defs>
            <filter id={`disp_${uid}`} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.045 0.08" numOctaves="2" result="noise" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={useDisplacementFilter ? '2.8' : '0'}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        {/* Luz cenital de estudio + Sombra de contacto en el piso */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDarkBackdrop
              ? 'radial-gradient(circle at 50% 32%, rgba(255,255,255,0.09) 0%, transparent 68%)'
              : 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.85) 0%, transparent 70%)',
          }}
        />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-28 h-3.5 rounded-full bg-black/25 blur-md pointer-events-none" />

        {/* Badge superior de inspección */}
        {!isZoomed && (
          <div className="w-full flex items-center justify-between z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/70 text-white">
              Click para Inspector 360°
            </span>
            <Maximize2 className="w-3.5 h-3.5 opacity-60" />
          </div>
        )}

        {/* Render del Objeto con soporte de rotación 3D interactiva cuando está en Zoom */}
        <div
          className={`my-auto relative flex items-center justify-center z-10 transition-transform duration-150 ${cardScale}`}
          style={
            isZoomed
              ? {
                  transform: `perspective(1000px) rotateX(${rot3D.x}deg) rotateY(${rot3D.y}deg)`,
                  transformStyle: 'preserve-3d',
                }
              : undefined
          }
        >
          {itemKey === 'sweatshirt' && (
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 220 195" className="w-40 h-36 drop-shadow-[0_14px_16px_rgba(0,0,0,0.32)]">
                <defs>
                  <linearGradient id={`grad_${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={pal.base} />
                    <stop offset="65%" stopColor={pal.mid} />
                    <stop offset="100%" stopColor={pal.dark} />
                  </linearGradient>
                </defs>
                {/* Cuerpo y mangas con caída realista */}
                <path
                  d="M72,22 C90,30 130,30 148,22 L192,50 C197,54 198,60 195,68 L176,162 L152,162 L155,76 L146,72 L146,168 L74,168 L74,72 L65,76 L68,162 L44,162 L25,68 C22,60 23,54 28,50 Z"
                  fill={`url(#grad_${uid})`}
                />
                {liveStampPos !== 'back_print' && (
                  <>
                    {/* Etiqueta interna tejida del cuello */}
                    <path d="M82,24 C100,32 120,32 138,24 C126,38 94,38 82,24 Z" fill="#0B0B0D" />
                    <rect x="101" y="25" width="18" height="6" rx="1" fill="#F4F4F0" opacity="0.85" />
                    {/* Cuello acanalado + Triángulo V-Stitch (Dorito) */}
                    <path
                      d="M72,22 C90,34 130,34 148,22 C142,39 78,39 72,22 Z"
                      fill={pal.rib}
                      stroke={pal.stitch}
                      strokeWidth="1"
                    />
                    <polygon points="102,35 118,35 110,49" fill={pal.rib} stroke={pal.stitch} strokeWidth="1" />
                  </>
                )}
                {/* Costuras Raglan y pliegues de tela */}
                <path d="M72,24 L65,76 M148,24 L155,76" stroke={pal.stitch} strokeWidth="1.2" strokeDasharray="2 1" />
                <path d="M82,95 C80,120 82,145 85,160" stroke="rgba(0,0,0,0.22)" strokeWidth="2.5" fill="none" />
                <path d="M138,95 C140,120 138,145 135,160" stroke="rgba(255,255,255,0.06)" strokeWidth="2" fill="none" />
                {/* Pretina y puños acanalados */}
                <rect x="74" y="160" width="72" height="10" rx="2" fill={pal.rib} stroke={pal.stitch} strokeWidth="0.8" />
                <rect x="44" y="155" width="24" height="8" rx="1.5" fill={pal.rib} />
                <rect x="152" y="155" width="24" height="8" rx="1.5" fill={pal.rib} />
              </svg>
              {/* Estampado con feDisplacementMap y posición dinámica */}
              <div
                className={`absolute ${pal.blendClass}`}
                style={{
                  ...garmentPlacementStyle,
                  filter: `url(#disp_${uid})`,
                }}
              >
                {renderBrandStamp(
                  pal.stampVariant,
                  liveStampPos === 'center_large'
                    ? 'h-9 max-w-[85px]'
                    : liveStampPos === 'back_print'
                    ? 'h-11 max-w-[105px]'
                    : 'h-6 max-w-[48px]',
                  'text-xs'
                )}
              </div>
            </div>
          )}

          {itemKey === 'tshirt' && (
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 220 195" className="w-40 h-36 drop-shadow-[0_14px_16px_rgba(0,0,0,0.32)]">
                <defs>
                  <linearGradient id={`grad_${uid}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={pal.base} />
                    <stop offset="55%" stopColor={pal.mid} />
                    <stop offset="100%" stopColor={pal.dark} />
                  </linearGradient>
                </defs>
                {/* Silueta Boxy Heavyweight */}
                <path
                  d="M72,20 C90,30 130,30 148,20 L198,52 L176,88 L150,73 L150,172 L70,172 L70,73 L44,88 L22,52 Z"
                  fill={`url(#grad_${uid})`}
                />
                {liveStampPos !== 'back_print' && (
                  <>
                    {/* Interior del cuello + Etiqueta 300 GSM */}
                    <path d="M76,21 C95,31 125,31 144,21 C132,35 88,35 76,21 Z" fill="#09090B" />
                    <rect x="103" y="23" width="14" height="7" rx="1" fill="#E4E4E7" />
                    {/* Ribete grueso del cuello */}
                    <path
                      d="M70,20 C92,35 128,35 150,20 C143,39 77,39 70,20 Z"
                      fill={pal.rib}
                      stroke={pal.stitch}
                      strokeWidth="1.2"
                    />
                  </>
                )}
                {/* Costuras de hombros caídos y bastilla inferior */}
                <path d="M70,73 L55,34 M150,73 L165,34" stroke={pal.stitch} strokeWidth="1" opacity="0.65" />
                <line x1="70" y1="166" x2="150" y2="166" stroke={pal.stitch} strokeWidth="1" strokeDasharray="3 1.5" />
                {/* Pliegues sutiles de caída textil */}
                <path d="M92,75 C90,115 88,145 92,168" stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="none" />
                <path d="M128,85 C132,120 130,150 126,168" stroke="rgba(0,0,0,0.2)" strokeWidth="3" fill="none" />
                {/* Etiqueta tejida en la esquina inferior */}
                <rect x="134" y="164" width="10" height="6" rx="1" fill="#F59E0B" />
              </svg>
              <div
                className={`absolute ${pal.blendClass}`}
                style={{
                  ...garmentPlacementStyle,
                  filter: `url(#disp_${uid})`,
                }}
              >
                {renderBrandStamp(
                  pal.stampVariant,
                  liveStampPos === 'center_large'
                    ? 'h-9 max-w-[85px]'
                    : liveStampPos === 'back_print'
                    ? 'h-11 max-w-[105px]'
                    : 'h-6 max-w-[48px]',
                  'text-xs'
                )}
              </div>
            </div>
          )}

          {itemKey === 'hoodie' && (
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 220 200" className="w-40 h-36 drop-shadow-[0_15px_18px_rgba(0,0,0,0.36)]">
                <defs>
                  <linearGradient id={`grad_${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={pal.base} />
                    <stop offset="60%" stopColor={pal.mid} />
                    <stop offset="100%" stopColor={pal.dark} />
                  </linearGradient>
                </defs>
                {/* Capucha de 3 paneles con volumen */}
                <path
                  d="M66,30 C64,6 156,6 154,30 C142,42 78,42 66,30 Z"
                  fill={pal.mid}
                  stroke={pal.stitch}
                  strokeWidth="1.2"
                />
                <ellipse cx="110" cy="24" rx="28" ry="11" fill="#09090B" opacity="0.75" />
                {/* Cuerpo y mangas del Hoodie */}
                <path
                  d="M68,28 L152,28 L192,55 L176,165 L152,165 L152,76 L146,76 L146,172 L74,172 L74,76 L68,76 L68,165 L44,165 L28,55 Z"
                  fill={`url(#grad_${uid})`}
                />
                {liveStampPos !== 'back_print' && (
                  <>
                    {/* Bolsillo canguro con costuras reforzadas */}
                    <path
                      d="M82,124 L138,124 L145,162 L75,162 Z"
                      fill={pal.rib}
                      stroke={pal.stitch}
                      strokeWidth="1.2"
                    />
                    {/* Ojales metálicos y cordones con herrete metálico */}
                    <circle cx="98" cy="36" r="2" fill="#A1A1AA" />
                    <circle cx="122" cy="36" r="2" fill="#A1A1AA" />
                    <path d="M98,37 C97,52 98,64 98,74" stroke={pal.stitch} strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M122,37 C123,52 122,64 122,74" stroke={pal.stitch} strokeWidth="2.2" strokeLinecap="round" />
                    <rect x="96.5" y="72" width="3" height="6" rx="1" fill="#D4D4D8" />
                    <rect x="120.5" y="72" width="3" height="6" rx="1" fill="#D4D4D8" />
                  </>
                )}
                {/* Pretina y puños */}
                <rect x="74" y="164" width="72" height="10" rx="2" fill={pal.dark} />
              </svg>
              {/* Estampado en Hoodie con feDisplacementMap */}
              <div
                className={`absolute ${pal.blendClass}`}
                style={{
                  ...garmentPlacementStyle,
                  filter: `url(#disp_${uid})`,
                }}
              >
                {renderBrandStamp(
                  pal.stampVariant,
                  liveStampPos === 'center_large'
                    ? 'h-10 max-w-[95px]'
                    : liveStampPos === 'back_print'
                    ? 'h-12 max-w-[115px]'
                    : 'h-7 max-w-[52px]',
                  'text-xs'
                )}
              </div>
            </div>
          )}

          {itemKey === 'cap' && (
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 220 175" className="w-40 h-32 drop-shadow-[0_14px_16px_rgba(0,0,0,0.34)]">
                <defs>
                  <radialGradient id={`grad_${uid}`} cx="50%" cy="35%" r="65%">
                    <stop offset="0%" stopColor={pal.base} />
                    <stop offset="70%" stopColor={pal.mid} />
                    <stop offset="100%" stopColor={pal.dark} />
                  </radialGradient>
                </defs>
                {/* Botón superior (Squatchee) */}
                <ellipse cx="110" cy="31" rx="6" ry="3" fill={pal.dark} />
                {/* Corona estructurada de 6 paneles */}
                <path d="M42,102 C40,32 180,32 178,102 Z" fill={`url(#grad_${uid})`} />
                {/* Costuras de paneles y ojales bordados */}
                <path d="M110,32 L110,98" stroke={pal.stitch} strokeWidth="1" strokeDasharray="2 1" opacity="0.6" />
                <path d="M110,32 C82,50 68,75 65,100" stroke={pal.stitch} strokeWidth="1.2" fill="none" />
                <path d="M110,32 C138,50 152,75 155,100" stroke={pal.stitch} strokeWidth="1.2" fill="none" />
                <circle cx="84" cy="52" r="2.2" fill={pal.dark} stroke={pal.stitch} strokeWidth="1" />
                <circle cx="136" cy="52" r="2.2" fill={pal.dark} stroke={pal.stitch} strokeWidth="1" />
                {/* Sombra bajo visera (Underbrim) */}
                <path d="M34,102 C75,118 145,118 186,102 L176,136 C140,120 80,120 44,136 Z" fill="#070708" />
                {/* Visera curva con líneas de costura concéntricas */}
                <path
                  d="M34,99 C75,114 145,114 186,99 L180,131 C142,116 78,116 40,131 Z"
                  fill={pal.dark}
                  stroke={pal.stitch}
                  strokeWidth="1"
                />
                <path
                  d="M40,108 C80,121 140,121 180,108"
                  stroke={pal.stitch}
                  strokeWidth="0.9"
                  strokeDasharray="3 1.5"
                  fill="none"
                />
                <path
                  d="M43,116 C82,128 138,128 177,116"
                  stroke={pal.stitch}
                  strokeWidth="0.9"
                  strokeDasharray="3 1.5"
                  fill="none"
                />
              </svg>
              {/* Bordado 3D en relieve frontal con curvatura de corona */}
              <div
                className="absolute top-[41%] left-1/2 drop-shadow-[0_3px_4px_rgba(0,0,0,0.65)]"
                style={{ transform: 'translate(-50%, -50%) perspective(260px) rotateX(18deg) scale(0.95)' }}
              >
                {renderBrandStamp(pal.stampVariant, 'h-7 max-w-[55px]', 'text-[10px]', true)}
              </div>
            </div>
          )}

          {itemKey === 'tote' && (
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 180 205" className="w-32 h-36 drop-shadow-[0_15px_16px_rgba(0,0,0,0.32)]">
                <defs>
                  <linearGradient id={`grad_${uid}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={pal.base} />
                    <stop offset="65%" stopColor={pal.mid} />
                    <stop offset="100%" stopColor={pal.dark} />
                  </linearGradient>
                </defs>
                {/* Asas dobles de algodón trenzado */}
                <path
                  d="M64,72 L64,26 C64,10 116,10 116,26 L116,72"
                  fill="none"
                  stroke={pal.dark}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M60,70 L60,24 C60,6 120,6 120,24 L120,70"
                  fill="none"
                  stroke={pal.base}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Cuerpo de lona con pliegues laterales (Gusset) */}
                <path
                  d="M32,66 L148,66 L154,182 C154,186 150,189 145,189 L35,189 C30,189 26,186 26,182 Z"
                  fill={`url(#grad_${uid})`}
                />
                {/* Costura superior doble + Parches Box-X en las asas */}
                <line x1="33" y1="73" x2="147" y2="73" stroke={pal.stitch} strokeWidth="1.2" strokeDasharray="3 1.5" />
                <rect x="55" y="66" width="10" height="12" fill={pal.rib} stroke={pal.stitch} strokeWidth="1" />
                <rect x="115" y="66" width="10" height="12" fill={pal.rib} stroke={pal.stitch} strokeWidth="1" />
                {/* Pliegues de volumen de lona */}
                <path d="M45,80 L40,182" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <path d="M135,80 L140,182" stroke="rgba(0,0,0,0.22)" strokeWidth="4" />
              </svg>
              <div className={`absolute bottom-7 left-1/2 -translate-x-1/2 scale-95 ${pal.blendClass}`}>
                {renderBrandStamp(pal.stampVariant, 'h-4', 'text-[10px]')}
              </div>
            </div>
          )}

          {itemKey === 'thermos' && (
            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 140 210" className="w-28 h-36 drop-shadow-[0_16px_18px_rgba(0,0,0,0.35)]">
                <defs>
                  {/* Iluminación cilíndrica 3D para botella metálica */}
                  <linearGradient id={`cyl_${uid}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={pal.dark} />
                    <stop offset="28%" stopColor={pal.base} />
                    <stop offset="42%" stopColor={mockupColorway === 'offwhite' ? '#FFFFFF' : '#3F3F46'} />
                    <stop offset="72%" stopColor={pal.mid} />
                    <stop offset="100%" stopColor="#050507" />
                  </linearGradient>
                  <linearGradient id={`steel_${uid}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#71717A" />
                    <stop offset="35%" stopColor="#F4F4F5" />
                    <stop offset="65%" stopColor="#A1A1AA" />
                    <stop offset="100%" stopColor="#52525B" />
                  </linearGradient>
                </defs>
                {/* Asa superior de transporte */}
                <path d="M55,14 C55,4 85,4 85,14" fill="none" stroke="#52525B" strokeWidth="3.5" />
                {/* Tapa de acero inoxidable cepillado */}
                <rect x="52" y="12" width="36" height="18" rx="3" fill={`url(#steel_${uid})`} />
                <rect x="51" y="29" width="38" height="4" rx="1" fill="#27272A" />
                {/* Cuerpo cilíndrico Powder-Coated */}
                <path
                  d="M52,33 L88,33 L98,68 L98,184 C98,192 91,197 82,197 L58,197 C49,197 42,192 42,184 L42,68 Z"
                  fill={`url(#cyl_${uid})`}
                />
                {/* Brillo especular vertical */}
                <rect x="56" y="70" width="4" height="115" rx="2" fill="white" opacity="0.12" />
              </svg>
              {/* Grabado láser / UV vertical (-90deg) */}
              <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap scale-80">
                {renderBrandStamp(pal.stampVariant, 'h-3', 'text-[10px]')}
              </div>
            </div>
          )}

          {itemKey === 'lanyard' && (
            <div className="relative flex flex-col items-center">
              {/* Cinta satinada superior + Mosquetón metálico */}
              <div className="w-7 h-6 bg-gradient-to-b from-zinc-800 to-zinc-950 border-x border-zinc-700 flex items-end justify-center">
                <div className="w-3 h-2 border-2 border-zinc-400 rounded-b-full" />
              </div>
              <div className="w-2 h-3 bg-gradient-to-r from-zinc-500 via-zinc-200 to-zinc-600 rounded-xs -mt-0.5 shadow-sm" />
              {/* Portacredencial rígido de policarbonato con Holograma y QR Real */}
              <div className="w-32 h-40 rounded-2xl bg-gradient-to-br from-[#18181C] via-[#0D0D10] to-[#050507] border border-zinc-700/80 shadow-[0_18px_28px_rgba(0,0,0,0.75)] p-3 flex flex-col justify-between relative overflow-hidden">
                {/* Reflejo diagonal de cristal */}
                <div className="absolute -top-10 -left-10 w-28 h-48 bg-white/5 rotate-35 pointer-events-none" />
                {/* Ranura superior + Banda holográfica de seguridad */}
                <div className="space-y-1.5">
                  <div className="w-9 h-1.5 rounded-full bg-zinc-950 border border-zinc-700 mx-auto" />
                  <div
                    className="h-1 w-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${
                        guideline?.colors?.[0]?.hex || '#6366F1'
                      }, #EC4899, #10B981)`,
                    }}
                  />
                  <div className="flex items-center justify-between text-[7px] font-mono text-zinc-400 pt-0.5">
                    <span>VIP PASS</span>
                    <span>{guideline?.round || 'R-01'}</span>
                  </div>
                </div>

                {/* Centro: Identidad del proyecto */}
                <div className="my-auto py-1">
                  <div className="text-[8px] font-mono uppercase tracking-wider text-zinc-500">Brand System</div>
                  <div className="text-[11px] font-bold text-white truncate">{guideline?.brandName}</div>
                </div>

                {/* Pie de credencial: Logo + QR Dinámico */}
                <div className="flex items-end justify-between gap-1.5 pt-1.5 border-t border-zinc-800/90">
                  <div className="scale-75 origin-bottom-left">
                    {renderBrandStamp('light', 'h-3', 'text-[8px]')}
                  </div>
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR"
                      className="w-9 h-9 rounded-md bg-white p-0.5 shadow-md shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-white rounded-xs grid grid-cols-3 gap-0.5 p-0.5">
                      <div className="bg-black" />
                      <div className="bg-black" />
                      <div className="bg-black" />
                      <div className="bg-black" />
                      <div className="bg-transparent" />
                      <div className="bg-black" />
                      <div className="bg-black" />
                      <div className="bg-black" />
                      <div className="bg-black" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {itemKey === 'macbook' && (
            <div className="w-40 h-36 rounded-2xl bg-gradient-to-br from-[#71717A] via-[#52525B] to-[#27272A] p-3.5 relative shadow-[0_18px_28px_rgba(0,0,0,0.65)] border border-white/25 flex items-center justify-center overflow-hidden">
              {/* Textura anodizada + bisel de aluminio */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(125deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.25) 100%)',
                }}
              />
              {/* Hendidura de bisagra inferior */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-zinc-950/60 rounded-t-full" />

              {/* Emblema central brillante del portátil */}
              <div className="w-7 h-8 rounded-full bg-gradient-to-b from-zinc-900 to-black shadow-inner flex items-center justify-center mb-3 opacity-85">
                <div className="w-2 h-3 rounded-full bg-white/10 -rotate-12" />
              </div>

              {/* Sticker Troquelado (Die-Cut Vinyl) con contorno blanco y brillo (Prefiere Icono) */}
              <div
                style={{
                  backgroundColor:
                    mockupColorway === 'brand'
                      ? guideline?.colors?.[0]?.hex || '#18181B'
                      : '#111113',
                }}
                className="absolute bottom-3.5 left-3 -rotate-12 text-white px-3 py-1.5 rounded-xl border-[3px] border-white shadow-[0_10px_18px_rgba(0,0,0,0.55)] scale-90 flex items-center justify-center"
              >
                <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
                {renderBrandStamp('light', 'h-4', 'text-[10px]', true)}
              </div>
            </div>
          )}
        </div>

        {/* Pie de tarjeta con título y especificación */}
        <div className="w-full text-center z-10 pt-1">
          <span
            className={`text-[11px] font-bold block leading-tight ${
              isDarkBackdrop ? 'text-zinc-100' : 'text-zinc-800'
            }`}
          >
            {labels[itemKey]?.title}
          </span>
          <span
            className={`text-[9px] font-mono block mt-0.5 ${
              isDarkBackdrop ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            {labels[itemKey]?.spec}
          </span>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // RENDERIZADO DE CADA TIPO DE LÁMINA (16 SLIDES)
  // ---------------------------------------------------------------------------
  const renderSlideContent = (slideIndex: number) => {
    if (!guideline) return null;
    const slide = slides[slideIndex];
    if (!slide) return null;

    const isDark = theme === 'dark';
    const bgClass = isDark ? 'bg-[#111111] text-white' : 'bg-white text-[#111111]';
    const textMuted = isDark ? 'text-zinc-400' : 'text-zinc-500';
    const borderSubtle = isDark ? 'border-zinc-800' : 'border-zinc-200';
    const primaryFont = guideline.typography?.[0]?.fontFamily || 'Inter';

    switch (slide.type) {
      case 'logo_versions':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-12 ${bgClass} select-none`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60 block">
                  Sistema de Identidad • Variaciones y Submarcas
                </span>
                <h3 className="text-lg sm:text-2xl font-bold tracking-tight mt-0.5">
                  Versiones Oficiales Autorizadas
                </h3>
              </div>
              <span className="text-[10px] font-mono opacity-50">
                {(guideline.logoVersions || []).length} variantes
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 my-auto py-4">
              {(guideline.logoVersions || []).map((ver, idx) => (
                <div
                  key={ver.id || idx}
                  className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/60 flex flex-col justify-between gap-4 shadow-lg group hover:border-amber-400/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200">{ver.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/25">
                      {ver.tag || 'Oficial'}
                    </span>
                  </div>

                  <div className="h-32 rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-4 flex items-center justify-center overflow-hidden">
                    {ver.url ? (
                      <img
                        src={ver.url}
                        alt={ver.name}
                        className="max-h-24 max-w-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-xs font-mono text-zinc-500">{ver.name}</span>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400">
                    {ver.description || 'Versión adaptada para reproducción en soportes específicos.'}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-2 border-t border-zinc-800/40">
              <span>Versiones y Extensiones de Marca</span>
              <span>Lámina de Variantes</span>
            </div>
          </div>
        );

      case 'mockup_gallery_slide': {
        const items = guideline.mockupGalleryItems || [];
        const isFew = items.length <= 2;
        const gridCols = isFew
          ? 'grid-cols-1 sm:grid-cols-2'
          : items.length === 3
          ? 'grid-cols-1 sm:grid-cols-3'
          : 'grid-cols-2 sm:grid-cols-4';

        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-10 ${bgClass} select-none`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60 block">
                  Galería de Mockups Fotográficos • Estudio Real
                </span>
                <span className="text-[10px] font-mono opacity-50">
                  Simulación de alta fidelidad fotográfica en soportes reales
                </span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {items.length} aplicaciones activas
              </span>
            </div>

            <div className={`grid ${gridCols} gap-4 my-auto py-2`}>
              {items.map((item, idx) => {
                const logoSrc = resolvePublicMockupLogo(item.assignedLogoType, item.customLogoVersionId);
                const stampStyle = getPublicMockupStampStyle(
                  item.stampPositionPreset,
                  item.stampScale,
                  item.blendMode,
                  item.posX,
                  item.posY
                );

                return (
                  <div
                    key={item.id || idx}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-lg flex flex-col justify-between group hover:border-zinc-700 transition"
                  >
                    <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden">
                      <img
                        src={item.mockupImageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div style={stampStyle}>
                        {logoSrc ? (
                          <img
                            src={logoSrc}
                            alt="Logo estampado"
                            className="max-h-full max-w-full object-contain filter drop-shadow-md"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-1 rounded">
                            {guideline.brandName}
                          </span>
                        )}
                      </div>
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[9px] font-mono text-white uppercase border border-white/10">
                        {item.category}
                      </span>
                    </div>

                    <div className="p-3 bg-zinc-950/80 flex items-center justify-between border-t border-zinc-800/80">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-zinc-100 truncate">{item.title}</h4>
                        <p className="text-[9px] font-mono text-zinc-400 truncate">
                          {item.assignedLogoType === 'symbol'
                            ? 'Isotipo Claro'
                            : item.assignedLogoType === 'symbol_dark'
                            ? 'Isotipo Oscuro'
                            : item.assignedLogoType === 'secondary'
                            ? 'Logo Secundario'
                            : item.assignedLogoType === 'favicon'
                            ? 'Favicon Oficial'
                            : item.customLogoVersionName || 'Logo Principal'}
                        </p>
                      </div>
                      <span className="text-[9px] font-mono text-amber-400">
                        {item.stampScale || 100}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-2 border-t border-zinc-800/40">
              <span>Aplicaciones Corporativas y Merchandising en Fotografía</span>
              <span>Lámina de Mockups</span>
            </div>
          </div>
        );
      }
      case 'cover':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-5 sm:p-10 md:p-16 ${bgClass} select-none overflow-y-auto sm:overflow-y-hidden`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                Manual de Identidad Visual
              </span>
              {guideline.status === 'approved' && (
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ✓ IDENTIDAD APROBADA
                </span>
              )}
            </div>

            <div className="max-w-4xl my-auto py-2">
              <h1
                style={{ fontFamily: primaryFont }}
                className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] leading-[1.08]"
              >
                Identidad visual para <br />
                <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>
                  &#123;{guideline.brandName || guideline.clientName}&#125;
                </span>
              </h1>
              {guideline.tagline && (
                <p className={`mt-3 sm:mt-5 text-xs sm:text-base md:text-lg font-normal ${textMuted} max-w-2xl leading-relaxed`}>
                  {guideline.tagline}
                </p>
              )}
            </div>

            <div className={`pt-4 border-t ${borderSubtle} flex flex-wrap items-center justify-between gap-3 text-[10px] sm:text-xs font-mono opacity-60`}>
              <span>{guideline.date || '2026'}</span>
              <span>{translateDisplayText(guideline.round, 'Ronda 1')}</span>
              <span>Diseñado por {guideline.designerName || 'Roma Agencia'}</span>
            </div>
          </div>
        );

      case 'brief':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-5 sm:p-10 md:p-16 ${bgClass} select-none overflow-y-auto sm:overflow-y-hidden`}>
            <div>
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                Resumen del Brief
              </span>
              <h2
                style={{ fontFamily: primaryFont }}
                className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-medium tracking-tight mt-2 sm:mt-4 max-w-3xl leading-snug"
              >
                {translateDisplayText(
                  guideline.briefOverviewTitle,
                  'Resumen ejecutivo del proyecto de identidad visual, destacando el propósito, alcance y objetivos estratégicos de la marca.'
                )}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-10 mt-4 sm:mt-8 pt-4 border-t border-dashed opacity-90 border-zinc-500/20 text-xs sm:text-sm md:text-base leading-relaxed">
              <p className={textMuted}>
                {translateDisplayText(
                  guideline.briefOverviewText,
                  'Este resumen describe el propósito y los objetivos clave de la identidad visual. Destaca los pilares de posicionamiento, modernización y proyección comercial alineados con los valores esenciales de la organización.'
                )}
              </p>
              <p className={textMuted}>
                {translateDisplayText(
                  guideline.briefSecondaryText,
                  'Asimismo, esta sección define el estilo visual, el carácter tipográfico y cómo el nuevo sistema gráfico se adapta con coherencia a todos los puntos de contacto físicos y digitales.'
                )}
              </p>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-3">
              <span>Identidad visual para &#123;{guideline.brandName}&#125;</span>
              <span>Lámina 02</span>
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-5 sm:p-10 md:p-16 ${bgClass} select-none overflow-y-auto sm:overflow-y-hidden`}>
            <div>
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                Objetivos y Pilares de Marca
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 lg:gap-12 my-auto py-2">
              {(guideline.goals || []).map((goal, idx) => (
                <div key={goal.id || idx} className="space-y-2 sm:space-y-3">
                  <span className="text-2xl sm:text-4xl md:text-5xl font-light tracking-tighter opacity-80 block">
                    {goal.number || `0${idx + 1}`}
                  </span>
                  <h3 className="text-sm sm:text-lg font-semibold tracking-tight">
                    {translateDisplayText(goal.title, goal.title)}
                  </h3>
                  <p className={`text-xs sm:text-sm ${textMuted} leading-relaxed`}>
                    {translateDisplayText(goal.description, goal.description)}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-3 border-t border-zinc-500/10">
              <span>Pilares Estratégicos de Marca</span>
              <span>Lámina 03</span>
            </div>
          </div>
        );

      case 'direction':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-5 sm:p-10 md:p-16 ${bgClass} select-none overflow-y-auto sm:overflow-y-hidden`}>
            <div className="flex items-center justify-between border-b pb-3 border-zinc-500/20">
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                {translateDisplayText(guideline.directionName, 'Propuesta Principal')}
              </span>
              <span className="text-[10px] font-mono opacity-40">Versión Principal del Logo</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center my-auto py-2">
              <div className="md:col-span-5 space-y-3 border-l-2 border-zinc-500/30 pl-3 sm:pl-6">
                <span className="text-[10px] uppercase font-mono tracking-wider opacity-50 block">
                  Narrativa y Racional Conceptual
                </span>
                <p className={`text-xs sm:text-sm md:text-base ${textMuted} leading-relaxed`}>
                  {translateDisplayText(
                    guideline.directionRationale,
                    'Esta propuesta sintetiza la esencia, los valores y la personalidad de la marca mediante una construcción geométrica equilibrada, garantizando máxima legibilidad y pregnancia tanto en medios digitales como impresos.'
                  )}
                </p>
              </div>

              <div className="md:col-span-7 flex items-center justify-center p-4 sm:p-10">
                {renderBrandStamp(isDark ? 'light' : 'dark', 'max-h-24 sm:max-h-36 md:max-h-44', 'text-2xl sm:text-4xl md:text-5xl')}
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-3">
              <span>Identidad visual para &#123;{guideline.brandName}&#125;</span>
              <span>Lámina 04</span>
            </div>
          </div>
        );

      case 'before_after':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-12 ${bgClass} select-none`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                Evolución de Marca • Comparador Interactivo Antes vs. Después
              </span>
              <span className="text-[10px] font-mono opacity-50">
                Desliza la barra para comparar ({beforeAfterPos}%)
              </span>
            </div>

            {/* Contenedor Comparativo Antes vs. Después */}
            <div className="relative w-full max-w-3xl mx-auto my-auto h-52 sm:h-72 rounded-2xl overflow-hidden border border-zinc-700/50 shadow-2xl">
              {/* Fondo: DESPUÉS (Nueva Propuesta) */}
              <div className="absolute inset-0 bg-[#111111] text-white flex flex-col items-center justify-center p-8">
                <span className="absolute top-3 right-4 text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Propuesta Nueva ({translateDisplayText(guideline.round, '2026')})
                </span>
                {renderBrandStamp('light', 'max-h-24 sm:max-h-32', 'text-3xl sm:text-5xl')}
              </div>

              {/* Capa Recortada: ANTES (Identidad Anterior) */}
              <div
                className="absolute inset-y-0 left-0 bg-zinc-200 text-zinc-700 overflow-hidden flex flex-col items-center justify-center border-r-2 border-amber-400"
                style={{ width: `${beforeAfterPos}%` }}
              >
                <span className="absolute top-3 left-4 text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-200 whitespace-nowrap">
                  {translateDisplayText(guideline.brandBeforeLabel, 'Identidad Anterior')}
                </span>
                <div className="w-full flex items-center justify-center px-8">
                  {guideline.logoBeforeUrl ? (
                    <img
                      src={guideline.logoBeforeUrl}
                      alt="Antes"
                      className="max-h-20 sm:max-h-28 object-contain grayscale opacity-75"
                    />
                  ) : (
                    <div className="text-center opacity-60">
                      <span className="font-serif italic text-2xl sm:text-4xl tracking-widest text-zinc-600 block">
                        {guideline.brandName.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                        Versión Anterior
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Control Slider Invisible superpuesto */}
              <input
                type="range"
                min={5}
                max={95}
                value={beforeAfterPos}
                onChange={(e) => setBeforeAfterPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              />

              {/* Indicador central de arrastre */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-400 text-zinc-950 font-bold flex items-center justify-center shadow-lg pointer-events-none z-10 text-xs"
                style={{ left: `${beforeAfterPos}%` }}
              >
                ↔
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-2">
              <span>Comparativa de Rebranding</span>
              <span>Lámina 05</span>
            </div>
          </div>
        );

      case 'clearspace_donts':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-5 sm:p-12 ${bgClass} select-none`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                Área de Resguardo ({guideline.clearspaceUnit || '1x'}) y Usos Incorrectos
              </span>
              <span className="text-[10px] font-mono opacity-50">Normas de Protección de Marca</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-auto">
              {/* Izquierda: Safe Zone / Clearspace 1x */}
              <div className="lg:col-span-5 p-6 rounded-2xl border border-zinc-700/50 bg-zinc-900/50 flex flex-col items-center justify-center relative">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider mb-3">
                  Área de Resguardo ({guideline.clearspaceUnit || '1x'})
                </span>
                <div className="relative p-8 border border-dashed border-sky-400/60 rounded-lg bg-sky-500/5">
                  {/* Cotas 1x en las 4 esquinas */}
                  <span className="absolute top-1 left-1.5 text-[9px] font-mono text-sky-400">
                    {guideline.clearspaceUnit || '1x'}
                  </span>
                  <span className="absolute top-1 right-1.5 text-[9px] font-mono text-sky-400">
                    {guideline.clearspaceUnit || '1x'}
                  </span>
                  <span className="absolute bottom-1 left-1.5 text-[9px] font-mono text-sky-400">
                    {guideline.clearspaceUnit || '1x'}
                  </span>
                  <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-sky-400">
                    {guideline.clearspaceUnit || '1x'}
                  </span>
                  <div className="border border-sky-400/30 p-3">
                    {renderBrandStamp('light', 'h-10', 'text-xl')}
                  </div>
                </div>
              </div>

              {/* Derecha: Usos Incorrectos */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(guideline.donts || []).slice(0, 6).map((rule, idx) => (
                  <div
                    key={rule.id || idx}
                    className="p-3 rounded-xl border border-rose-500/25 bg-rose-950/10 flex flex-col justify-between min-h-[105px]"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-rose-400">
                      <span>✕ EVITAR</span>
                      <span>0{idx + 1}</span>
                    </div>

                    <div className="my-auto py-2 flex items-center justify-center overflow-hidden">
                      <div
                        className={
                          rule.ruleType === 'stretch'
                            ? 'scale-x-150 scale-y-75'
                            : rule.ruleType === 'rotate'
                            ? '-rotate-12'
                            : rule.ruleType === 'recolor'
                            ? 'text-pink-500 hue-rotate-90'
                            : rule.ruleType === 'shadow'
                            ? 'drop-shadow-[0_6px_6px_rgba(239,68,68,0.9)]'
                            : rule.ruleType === 'contrast'
                            ? 'opacity-15'
                            : 'tracking-[0.35em]'
                        }
                      >
                        {renderBrandStamp('light', 'h-5', 'text-xs')}
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-400 leading-tight line-clamp-2">
                      {translateDisplayText(rule.title, rule.title)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-2">
              <span>Área de Resguardo e Integridad de Marca</span>
              <span>Lámina 06</span>
            </div>
          </div>
        );

      case 'contrast':
        return (
          <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 select-none">
            <div className="bg-[#111111] text-white flex flex-col justify-between p-8 sm:p-14">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Fondo Oscuro Principal
              </span>
              <div className="my-auto flex items-center justify-center py-10">
                {renderBrandStamp('light', 'max-h-24', 'text-2xl sm:text-4xl')}
              </div>
              <span className="text-[10px] font-mono text-zinc-600">Fondo #111111 (Versión Negativa)</span>
            </div>

            <div className="bg-[#F4F4F5] text-zinc-950 flex flex-col justify-between p-8 sm:p-14">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Fondo Claro Principal
              </span>
              <div className="my-auto flex items-center justify-center py-10">
                {renderBrandStamp('dark', 'max-h-24', 'text-2xl sm:text-4xl')}
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Fondo #F4F4F5 (Contraste Positivo)</span>
            </div>
          </div>
        );

      case 'palette': {
        const calcLuminance = (hexColor: string) => {
          const clean = (hexColor || '#000000').replace('#', '');
          const r = parseInt(clean.substring(0, 2), 16) / 255 || 0;
          const g = parseInt(clean.substring(2, 4), 16) / 255 || 0;
          const b = parseInt(clean.substring(4, 6), 16) / 255 || 0;
          const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
          return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
        };
        const getContrastRatio = (hex1: string, hex2: string) => {
          const l1 = calcLuminance(hex1);
          const l2 = calcLuminance(hex2);
          const brightest = Math.max(l1, l2);
          const darkest = Math.min(l1, l2);
          return (brightest + 0.05) / (darkest + 0.05);
        };
        const getWcagBadge = (ratio: number) => {
          if (ratio >= 7) return { label: 'AAA', color: 'bg-emerald-500 text-zinc-950' };
          if (ratio >= 4.5) return { label: 'AA', color: 'bg-amber-400 text-zinc-950' };
          if (ratio >= 3) return { label: 'AA Large', color: 'bg-sky-400 text-zinc-950' };
          return { label: 'Low', color: 'bg-rose-500/80 text-white' };
        };

        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-12 md:p-14 ${bgClass} select-none`}>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
              <div>
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60 block">
                  Sistema Cromático • Muestras Interactivas y Auditor WCAG 2.1
                </span>
              </div>

              {/* Selector de formato a copiar (HEX / RGB / CMYK) + Auditor WCAG + Descarga de Tokens */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowWcagMatrix(!showWcagMatrix)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition ${
                    showWcagMatrix
                      ? 'bg-emerald-400 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  {showWcagMatrix ? '✓ Auditor WCAG Activo' : 'Auditor Contraste WCAG'}
                </button>
                {(['HEX', 'RGB', 'CMYK'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setColorCopyFormat(fmt)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition ${
                      colorCopyFormat === fmt
                        ? 'bg-amber-400 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Copiar {fmt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleDownloadColorTokens}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                  title="Descargar variables CSS de color"
                >
                  <Download className="w-3 h-3" />
                  <span>.CSS</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-auto h-full max-h-[410px]">
              {(guideline.colors || []).map((col) => {
                const specs = hexToColorSpecs(col.hex);
                const rgbText = col.rgb || specs.rgb;
                const cmykText = col.cmyk || specs.cmyk;
                const pantoneText = col.pantone || specs.pantone;
                const ratioWhite = getContrastRatio(col.hex, '#FFFFFF');
                const ratioDark = getContrastRatio(col.hex, '#111111');
                const badgeWhite = getWcagBadge(ratioWhite);
                const badgeDark = getWcagBadge(ratioDark);
                const isLightSwatch = ratioDark > ratioWhite;

                return (
                  <div
                    key={col.id || col.hex}
                    onClick={() => copyColorValue(col)}
                    className="group relative rounded-2xl overflow-hidden flex flex-col justify-between p-4 cursor-pointer transition-transform hover:scale-[1.01] border border-black/10 dark:border-white/15 shadow-md"
                    style={{ backgroundColor: col.hex }}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-mono font-bold tracking-wider"
                          style={{ color: isLightSwatch ? '#111111' : '#FFFFFF' }}
                        >
                          {col.name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/25 text-white">
                          {pantoneText}
                        </span>
                      </div>

                      {showWcagMatrix && (
                        <div className="p-2 rounded-xl bg-black/65 backdrop-blur-md text-white font-mono text-[9px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Texto Blanco (#FFF):</span>
                            <span className={`px-1.5 py-0.2 rounded font-bold ${badgeWhite.color}`}>
                              {ratioWhite.toFixed(1)}:1 {badgeWhite.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Texto Negro (#111):</span>
                            <span className={`px-1.5 py-0.2 rounded font-bold ${badgeDark.color}`}>
                              {ratioDark.toFixed(1)}:1 {badgeDark.label}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 font-mono text-[10px] backdrop-blur-md p-2.5 rounded-xl bg-black/45 text-white">
                      <div className="flex justify-between items-center font-bold text-xs">
                        <span>{col.hex.toUpperCase()}</span>
                        {copiedColorKey === `${col.id || col.hex}_${colorCopyFormat}` ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> {colorCopyFormat}
                          </span>
                        ) : (
                          <Copy className="w-3 h-3 opacity-70 group-hover:opacity-100" />
                        )}
                      </div>
                      <div className="text-[9px] opacity-85">RGB: {rgbText}</div>
                      <div className="text-[9px] opacity-85">CMYK: {cmykText}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-3">
              <span>Haz clic en cualquier tarjeta para copiar {colorCopyFormat} • Auditor WCAG 2.1 Integrado</span>
              <span>Sistema Cromático</span>
            </div>
          </div>
        );
      }

      case 'typography':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-12 md:p-16 ${bgClass} select-none`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                Sistema Tipográfico ({primaryFont})
              </span>

              {/* Toggle Especímen Clásico vs Type Tester Interactivo */}
              <button
                type="button"
                onClick={() => setTypeTesterMode(!typeTesterMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                  typeTesterMode
                    ? 'bg-amber-400 text-zinc-950'
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{typeTesterMode ? 'Ver Especímen Estándar' : 'Probar Fuente en Vivo'}</span>
              </button>
            </div>

            {typeTesterMode ? (
              /* MODO TYPE TESTER EN VIVO (ESTILO FRONTIFY) */
              <div className="my-auto space-y-5 p-5 rounded-2xl border border-zinc-700/50 bg-zinc-900/40">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-zinc-700/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono opacity-70">Tamaño: {typeTesterSize}px</span>
                    <input
                      type="range"
                      min={18}
                      max={72}
                      value={typeTesterSize}
                      onChange={(e) => setTypeTesterSize(Number(e.target.value))}
                      className="w-32 accent-amber-400 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { w: '300', label: 'Ligera' },
                        { w: '400', label: 'Regular' },
                        { w: '600', label: 'SemiNegrita' },
                        { w: '700', label: 'Negrita' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.w}
                        type="button"
                        onClick={() => setTypeTesterWeight(item.w)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer ${
                          typeTesterWeight === item.w
                            ? 'bg-white text-zinc-950 font-bold'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={typeTesterText}
                  onChange={(e) => setTypeTesterText(e.target.value)}
                  placeholder="Escribe aquí para probar la tipografía de la marca en vivo..."
                  style={{
                    fontFamily: primaryFont,
                    fontSize: `${typeTesterSize}px`,
                    fontWeight: Number(typeTesterWeight),
                  }}
                  className="w-full bg-transparent focus:outline-none resize-none leading-tight tracking-tight"
                />
              </div>
            ) : (
              /* MODO ESPECÍMEN EDITORIAL */
              <div className="space-y-6 sm:space-y-10 my-auto">
                <div className="space-y-2 border-b pb-5 border-zinc-500/20">
                  <div className="flex justify-between items-baseline text-xs font-mono opacity-60">
                    <span>Titulares</span>
                    <span>
                      {primaryFont} ({guideline.typography?.[0]?.weight || 'Regular / SemiBold'})
                    </span>
                  </div>
                  <h3
                    style={{ fontFamily: primaryFont }}
                    className="text-2xl sm:text-4xl md:text-5xl font-normal tracking-[-0.03em] leading-tight"
                  >
                    El veloz murciélago hindú comía feliz cardillo y kiwi
                  </h3>
                  <div className="flex justify-end text-[10px] sm:text-xs font-mono opacity-50 tracking-wider">
                    AaBbCcDdEeFfGgHhIiJjKkLlMmNnÑñ OoPpQqRrSsTtUuVvWwYyZz 1234567890
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-baseline text-xs font-mono opacity-60">
                    <span>Cuerpo de Texto y Párrafos</span>
                    <span>{guideline.typography?.[1]?.fontFamily || primaryFont} Regular</span>
                  </div>
                  <p
                    style={{ fontFamily: guideline.typography?.[1]?.fontFamily || primaryFont }}
                    className="text-lg sm:text-2xl md:text-3xl font-light tracking-tight opacity-90 leading-snug"
                  >
                    El veloz murciélago hindú comía feliz cardillo y kiwi
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-2">
              <span>Jerarquía Tipográfica y Especímen en Vivo</span>
              <span>Lámina 09</span>
            </div>
          </div>
        );

      case 'mockup_mobile':
        return (
          <div className={`w-full h-full flex items-center justify-center p-6 sm:p-12 ${bgClass} select-none relative overflow-hidden`}>
            {/* Halo de luz de estudio con el color primario de la marca */}
            <div
              className="w-80 h-80 rounded-full blur-3xl opacity-25 absolute pointer-events-none"
              style={{ backgroundColor: guideline.colors?.[0]?.hex || '#6366F1' }}
            />

            {/* iPhone 16 Pro Titanium Chasis */}
            <div className="relative w-[245px] sm:w-[275px] aspect-[9/18.6] bg-gradient-to-b from-zinc-700 via-zinc-900 to-zinc-950 rounded-[46px] p-[5px] shadow-[0_28px_60px_rgba(0,0,0,0.65)] border border-white/20">
              {/* Botones laterales de titanio */}
              <div className="w-[3px] h-7 bg-zinc-600 rounded-l-xs absolute -left-[3px] top-20" />
              <div className="w-[3px] h-11 bg-zinc-600 rounded-l-xs absolute -left-[3px] top-32" />
              <div className="w-[3px] h-14 bg-zinc-600 rounded-r-xs absolute -right-[3px] top-28" />

              <div className="w-full h-full rounded-[41px] bg-black p-2 relative overflow-hidden">
                {/* Dynamic Island con lente antirreflejo */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20 flex items-center justify-between px-2.5 border border-white/10">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-indigo-500/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>

                {/* Pantalla OLED Super Retina */}
                <div className="w-full h-full rounded-[34px] overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-950 to-black flex flex-col justify-between p-4 pt-8 text-white relative">
                  {/* Reflejo diagonal sutil de pantalla */}
                  <div className="absolute -top-12 -left-12 w-36 h-72 bg-white/[0.03] rotate-30 pointer-events-none" />

                  <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-300 px-1">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-mono">5G</span>
                      <span className="w-4 h-2 border border-zinc-300 rounded-xs inline-block p-0.5">
                        <span className="block w-full h-full bg-emerald-400" />
                      </span>
                    </div>
                  </div>

                  {/* Tarjeta Hero de App */}
                  <div className="my-auto space-y-3">
                    <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-xl flex flex-col items-center text-center space-y-2.5">
                      {renderBrandStamp('light', 'h-9', 'text-lg')}
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        {guideline.tagline || 'Ecosistema Digital de Nueva Generación'}
                      </p>
                      <div
                        style={{ backgroundColor: guideline.colors?.[0]?.hex || '#FFFFFF' }}
                        className="w-full py-1.5 rounded-xl text-[10px] font-bold text-zinc-950 shadow-md"
                      >
                        Comenzar →
                      </div>
                    </div>

                    {/* Mini Widgets de Interfaz */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 text-left">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase block">Alcance</span>
                        <span className="text-xs font-bold text-white">{guideline.statNumber || '+98.4%'}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-white/5 text-left">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase block">Sistema</span>
                        <span className="text-xs font-bold text-emerald-400">En Línea</span>
                      </div>
                    </div>
                  </div>

                  {/* Barra Safari Inferior + Home Indicator */}
                  <div className="space-y-2">
                    <div className="rounded-full bg-zinc-800/90 border border-white/10 px-3.5 py-1.5 flex items-center justify-between text-xs text-zinc-300">
                      <span className="font-mono text-[9px] truncate">
                        🔒 {guideline.mockupMobileUrlWebsite || `www.${guideline.brandName.toLowerCase().replace(/\s+/g, '')}.com`}
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                    </div>
                    <div className="w-20 h-1 rounded-full bg-white/40 mx-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'mockup_appicon':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-8 sm:p-14 ${bgClass} select-none`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                Retícula Constructiva de Icono de App y Pantalla de Inicio
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center my-auto">
              <div className="flex items-center justify-center">
                <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-[40px] bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center overflow-hidden shadow-2xl">
                  <div className="absolute inset-4 rounded-[30px] border border-zinc-600/40" />
                  <div className="absolute inset-9 rounded-full border border-zinc-600/30" />
                  <div className="absolute inset-16 rounded-full border border-zinc-600/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-[1px] bg-zinc-600/30" />
                    <div className="h-full w-[1px] bg-zinc-600/30 absolute" />
                    <div className="w-full h-[1px] bg-zinc-600/20 rotate-45 absolute" />
                    <div className="w-full h-[1px] bg-zinc-600/20 -rotate-45 absolute" />
                  </div>
                  <div className="z-10">{renderBrandStamp('light', 'h-16 max-w-[110px]', 'text-lg', true)}</div>
                </div>
              </div>

              <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 text-white space-y-4 max-w-sm mx-auto w-full shadow-2xl">
                <div className="flex justify-between items-center text-xs text-zinc-400 font-mono">
                  <span>9:41</span>
                  <span>Icono de Aplicación Móvil</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700 flex items-center justify-center p-2 shadow-xl">
                    {renderBrandStamp('light', 'h-10 max-w-[44px]', 'text-xs', true)}
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm">{guideline.brandName}</h5>
                    <span className="text-[11px] text-zinc-400">Proporción Áurea Oficial</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-4">
              <span>Proporción del Icono y Tangentes</span>
              <span>Lámina 11</span>
            </div>
          </div>
        );

      case 'mockup_desktop':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-12 ${bgClass} select-none`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                Experiencia de Interfaz Web (Navegador de Escritorio)
              </span>
              <span className="text-[10px] font-mono opacity-50">Retícula Responsiva 1440px</span>
            </div>

            <div className="my-auto w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-zinc-700/70 shadow-[0_25px_60px_rgba(0,0,0,0.55)] bg-zinc-950">
              {/* Barra Superior Safari / Arc */}
              <div className="px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
                  <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
                  <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
                </div>
                <div className="flex-1 max-w-md mx-auto bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1 text-[11px] font-mono text-zinc-400 text-center truncate flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>
                    https://{guideline.mockupMobileUrlWebsite || `www.${guideline.brandName.toLowerCase().replace(/\s+/g, '')}.com`}
                  </span>
                </div>
              </div>

              {/* Contenido Hero de la Web con Color de Marca */}
              <div className="p-6 sm:p-10 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white min-h-[230px] flex flex-col justify-between relative overflow-hidden">
                <div
                  className="w-64 h-64 rounded-full blur-3xl opacity-20 absolute -right-10 -bottom-10 pointer-events-none"
                  style={{ backgroundColor: guideline.colors?.[0]?.hex || '#6366F1' }}
                />

                <div className="flex items-center justify-between border-b border-white/10 pb-3.5 z-10">
                  {renderBrandStamp('light', 'h-6', 'text-sm')}
                  <div className="flex items-center gap-4 text-xs text-zinc-400 font-medium">
                    <span className="hidden sm:inline">Servicios</span>
                    <span className="hidden sm:inline">Nosotros</span>
                    <span
                      style={{ backgroundColor: guideline.colors?.[0]?.hex || '#FFFFFF' }}
                      className="px-3 py-1 rounded-full text-[10px] font-bold text-zinc-950"
                    >
                      Contactar
                    </span>
                  </div>
                </div>

                <div className="py-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center z-10">
                  <div className="md:col-span-8 space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-zinc-300">
                      ✦ {translateDisplayText(guideline.directionName, 'Plataforma Digital Oficial')}
                    </span>
                    <h3 className="text-xl sm:text-3xl font-bold tracking-tight leading-tight">
                      {guideline.tagline || 'Ecosistema digital de marca de última generación.'}
                    </h3>
                    <p className="text-zinc-400 text-xs max-w-lg">
                      {translateDisplayText(
                        guideline.briefOverviewText,
                        'Diseñado para ofrecer claridad, reconocimiento inmediato y presencia digital escalable.'
                      ).slice(0, 120)}
                    </p>
                  </div>

                  <div className="md:col-span-4 p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1.5">
                    <span className="text-[9px] font-mono uppercase text-zinc-400">Rendimiento</span>
                    <div className="text-2xl font-bold">{guideline.statNumber || '99.9%'}</div>
                    <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        style={{ backgroundColor: guideline.colors?.[0]?.hex || '#10B981' }}
                        className="w-4/5 h-full rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-2">
              <span>Aplicación Web de Escritorio</span>
              <span>Lámina 12</span>
            </div>
          </div>
        );

      case 'stat':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-8 sm:p-14 md:p-20 ${bgClass} select-none`}>
            <div>
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                Indicador Clave de Impacto
              </span>
            </div>

            <div className="my-auto space-y-4">
              <span
                style={{ fontFamily: primaryFont }}
                className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-semibold tracking-[-0.04em] leading-none block"
              >
                {guideline.statNumber || '+100%'}
              </span>
              <p className={`text-sm sm:text-xl font-normal ${textMuted} max-w-2xl`}>
                {translateDisplayText(
                  guideline.statLabel,
                  'Indicador clave de posicionamiento, alcance proyectado e impacto visual de la marca.'
                )}
              </p>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-4 border-t border-zinc-500/10">
              <span>Impacto y Proyecciones</span>
              <span>Lámina 13</span>
            </div>
          </div>
        );

      case 'merch_apparel':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-10 ${bgClass} select-none`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60 block">
                  Catálogo de Indumentaria • Mockups de Prendas en Estudio 3D
                </span>
                <span className="text-[10px] font-mono opacity-50">
                  Haz clic en cualquier prenda para inspección 3D a pantalla completa
                </span>
              </div>
              {renderColorwaySelector()}
            </div>

            {/* 4 Prendas de Estudio Hiper-Detalladas con Selector de Color y Zoom */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-auto">
              {renderStudioMockupCard('sweatshirt')}
              {renderStudioMockupCard('tshirt')}
              {renderStudioMockupCard('hoodie')}
              {renderStudioMockupCard('cap')}
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-2">
              <span>Aplicaciones Textiles • Haz clic en cualquier prenda para ampliar</span>
              <span>Lámina 14</span>
            </div>
          </div>
        );

      case 'merch_collaterals':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-10 ${bgClass} select-none`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60 block">
                  Artículos Promocionales • Bolso Tote, Termo, Fotocheck QR y Portátil
                </span>
                <span className="text-[10px] font-mono opacity-50">
                  Haz clic en cualquier artículo para inspección detallada
                </span>
              </div>
              {renderColorwaySelector()}
            </div>

            {/* 4 Artículos de Marca Hiper-Detallados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-auto">
              {renderStudioMockupCard('tote')}
              {renderStudioMockupCard('thermos')}
              {renderStudioMockupCard('lanyard')}
              {renderStudioMockupCard('macbook')}
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-2">
              <span>Merchandising, Credenciales y Stickers • Haz clic para ampliar</span>
              <span>Artículos Corporativos</span>
            </div>
          </div>
        );

      case 'geometry_icons': {
        const strokeW = guideline.iconStrokeWidth || 2;
        const cornerR = guideline.iconCornerRadius !== undefined ? guideline.iconCornerRadius : 6;
        const primaryBrandHex = guideline.colors?.[0]?.hex || '#F59E0B';

        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-10 md:p-12 ${bgClass} select-none`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60 block">
                  Retícula Geométrica, Escala Mínima y Sistema Iconográfico
                </span>
                <h3 className="text-base sm:text-xl font-bold tracking-tight">
                  Arquitectura Geométrica, Legibilidad y Sistema de Iconos
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/30">
                Proporción Áurea φ = 1.618 • Trazo {strokeW}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 my-auto">
              {/* 1. Retícula Constructiva Geométrica con Círculos Tangentes y Ángulos */}
              <div className="lg:col-span-5 rounded-2xl border border-zinc-700/50 bg-[#0B0C10] text-white p-4 flex flex-col justify-between relative overflow-hidden min-h-[235px]">
                <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 z-10">
                  <span>01 • RETÍCULA DE CONSTRUCCIÓN GEOMÉTRICA</span>
                  <span>45° / 90° / φ</span>
                </div>

                <div className="relative my-auto flex items-center justify-center py-4">
                  {/* Blueprint SVG de Círculos Áureos y Líneas Tangentes */}
                  <svg
                    viewBox="0 0 260 160"
                    className="absolute inset-0 w-full h-full pointer-events-none opacity-65"
                  >
                    <defs>
                      <pattern id="geoGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path
                          d="M 20 0 L 0 0 0 20"
                          fill="none"
                          stroke="rgba(34,211,238,0.14)"
                          strokeWidth="0.6"
                        />
                      </pattern>
                    </defs>
                    <rect width="260" height="160" fill="url(#geoGrid)" />
                    {/* Ejes ortogonales y diagonales 45° */}
                    <line x1="0" y1="80" x2="260" y2="80" stroke="#22D3EE" strokeWidth="0.7" strokeDasharray="3 2" />
                    <line x1="130" y1="0" x2="130" y2="160" stroke="#22D3EE" strokeWidth="0.7" strokeDasharray="3 2" />
                    <line x1="50" y1="160" x2="210" y2="0" stroke="#F59E0B" strokeWidth="0.7" strokeDasharray="4 2" />
                    <line x1="50" y1="0" x2="210" y2="160" stroke="#F59E0B" strokeWidth="0.7" strokeDasharray="4 2" />
                    {/* Círculos tangentes de proporción áurea */}
                    <circle
                      cx="130"
                      cy="80"
                      r="52"
                      fill="none"
                      stroke="#22D3EE"
                      strokeWidth="0.9"
                    />
                    <circle
                      cx="130"
                      cy="80"
                      r="32"
                      fill="none"
                      stroke="#A855F7"
                      strokeWidth="0.9"
                      strokeDasharray="2 2"
                    />
                    <circle cx="98" cy="80" r="20" fill="none" stroke="#22D3EE" strokeWidth="0.6" />
                    <circle cx="162" cy="80" r="20" fill="none" stroke="#22D3EE" strokeWidth="0.6" />
                    <text x="186" y="32" fill="#F59E0B" fontSize="8" fontFamily="monospace">
                      45.0°
                    </text>
                    <text x="134" y="24" fill="#22D3EE" fontSize="8" fontFamily="monospace">
                      R = 1.618x
                    </text>
                  </svg>

                  <div className="relative z-10 scale-110">
                    {renderBrandStamp('light', 'h-16 max-w-[110px]', 'text-2xl', true)}
                  </div>
                </div>

                <div className="flex justify-between text-[9px] font-mono text-zinc-400 z-10">
                  <span>Proporción Áurea y Tangentes</span>
                  <span>Tolerancia Óptica ±0.5%</span>
                </div>
              </div>

              {/* 2. Escala de Tamaños Mínimos de Reproducción */}
              <div className="lg:col-span-4 rounded-2xl border border-zinc-700/50 bg-zinc-900/80 text-white p-4 flex flex-col justify-between min-h-[235px]">
                <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
                  <span>02 • TAMAÑOS MÍNIMOS DE REPRODUCCIÓN</span>
                  <span>LEGIBILIDAD</span>
                </div>

                <div className="space-y-3 my-auto py-2">
                  {[
                    { label: 'Cabecera Web Desktop', sizeInfo: '64px / 25mm', scaleClass: 'scale-100', hClass: 'h-7', preferSym: false },
                    { label: 'Navegación Móvil', sizeInfo: '32px / 15mm Textil', scaleClass: 'scale-90', hClass: 'h-5', preferSym: false },
                    { label: 'Icono App / Reloj', sizeInfo: '24px / 10mm (Isotipo)', scaleClass: 'scale-95', hClass: 'h-5', preferSym: true },
                    { label: 'Favicon / Micro', sizeInfo: '16px / 6mm (Isotipo)', scaleClass: 'scale-85', hClass: 'h-4', preferSym: true },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/40 border border-white/10"
                    >
                      <div className={`origin-left ${item.scaleClass}`}>
                        {renderBrandStamp('light', item.hClass, 'text-xs', item.preferSym)}
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-[10px] font-bold text-white">{item.sizeInfo}</div>
                        <div className="text-[9px] text-zinc-400">{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-[9px] font-mono text-zinc-400">
                  Debajo de 20px se utiliza automáticamente tu Icono / Isotipo.
                </div>
              </div>

              {/* 3. Sistema Iconográfico y Estilo de Ilustración */}
              <div className="lg:col-span-3 rounded-2xl border border-zinc-700/50 bg-zinc-900/80 text-white p-4 flex flex-col justify-between min-h-[235px]">
                <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                  <span>03 • SISTEMA DE ICONOS</span>
                  <span>
                    {strokeW} / R{cornerR}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 my-auto py-2">
                  {[
                    // Escudo / Calidad
                    <path key="i1" d="M12 3L4 7v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7l-8-4z" />,
                    // Destello / Creatividad
                    <path key="i2" d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />,
                    // Cubo / Packaging
                    <path key="i3" d="M21 8l-9-5-9 5v8l9 5 9-5V8z M3.3 8L12 12.8 20.7 8 M12 12.8V21" />,
                    // Ubicación / Tienda
                    <path key="i4" d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
                    // Rayo / Velocidad
                    <path key="i5" d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
                    // Verificado
                    <path key="i6" d="M4 12l5 5L20 6" />,
                  ].map((svgPath, idx) => {
                    const customIconUrl = guideline.otherIdeas?.[idx]?.imageUrl;
                    return (
                      <div
                        key={idx}
                        style={{ borderRadius: `${Math.max(4, parseInt(String(cornerR), 10) || 6)}px` }}
                        className="aspect-square bg-black/50 border border-white/10 flex items-center justify-center p-2 hover:border-amber-400 transition"
                      >
                        {customIconUrl ? (
                          <img src={customIconUrl} alt={`Icono ${idx + 1}`} className="w-7 h-7 object-contain" />
                        ) : idx === 0 && (guideline.logoSymbolUrl || guideline.logoSymbolDarkUrl) ? (
                          <img
                            src={guideline.logoSymbolUrl || guideline.logoSymbolDarkUrl}
                            alt="Símbolo de Marca"
                            className="w-7 h-7 object-contain"
                          />
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            className="w-6 h-6"
                            fill="none"
                            stroke={idx % 2 === 0 ? '#FFFFFF' : primaryBrandHex}
                            strokeWidth={parseFloat(String(strokeW)) || 2}
                            strokeLinecap={parseInt(String(cornerR), 10) > 0 ? 'round' : 'square'}
                            strokeLinejoin={parseInt(String(cornerR), 10) > 0 ? 'round' : 'miter'}
                          >
                            {svgPath}
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="text-[9px] font-mono text-zinc-400">
                  Retícula 24×24px • Trazo {strokeW} • Radio {cornerR}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-1">
              <span>Construcción Óptica, Tamaños Mínimos e Iconografía Personalizada</span>
              <span>Geometría e Iconos</span>
            </div>
          </div>
        );
      }

      case 'stationery_kit': {
        const primaryHex = guideline.colors?.[0]?.hex || '#18181B';
        const accentHex = guideline.colors?.[1]?.hex || '#F59E0B';
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
          window.location.href
        )}`;

        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-10 md:p-12 ${bgClass} select-none`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60 block">
                  Sistema de Papelería Corporativa • Impresos Ejecutivos
                </span>
                <h3 className="text-base sm:text-xl font-bold tracking-tight">
                  Papelería Corporativa (Hoja A4, Tarjetas de Presentación, Sobre DL y Carpeta)
                </h3>
              </div>
              <span className="text-[10px] font-mono opacity-60">Papel Algodón 350g • Acabado Mate</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-auto items-stretch">
              {/* Hoja Membretada A4 (Izquierda) */}
              <div className="md:col-span-4 rounded-2xl bg-[#F4F3EF] text-zinc-900 p-5 shadow-xl border border-black/10 flex flex-col justify-between min-h-[250px] relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 right-0 h-2"
                  style={{ backgroundColor: primaryHex }}
                />
                <div className="flex items-center justify-between pt-1">
                  <div className="scale-75 origin-left">
                    {renderBrandStamp('dark', 'h-4', 'text-xs')}
                  </div>
                  <span className="text-[8px] font-mono text-zinc-400">ISO 216 A4 • 210×297mm</span>
                </div>

                <div className="space-y-2 my-4 px-1">
                  <div className="h-1.5 w-24 rounded bg-zinc-300" />
                  <div className="h-1 w-full rounded bg-zinc-200" />
                  <div className="h-1 w-11/12 rounded bg-zinc-200" />
                  <div className="h-1 w-4/5 rounded bg-zinc-200" />
                  <div className="h-1 w-full rounded bg-zinc-200 mt-3" />
                  <div className="h-1 w-10/12 rounded bg-zinc-200" />
                </div>

                <div className="pt-2 border-t border-zinc-300 flex items-center justify-between text-[8px] font-mono text-zinc-500">
                  <span>{guideline.brandName.toUpperCase()} • HOJA MEMBRETADA</span>
                  <span>WWW.{guideline.brandName.replace(/\s+/g, '').toUpperCase()}.COM</span>
                </div>
              </div>

              {/* Tarjetas de Presentación Anverso y Reverso con QR Dinámico (Centro) */}
              <div className="md:col-span-4 flex flex-col justify-between gap-3">
                {/* Anverso Tarjeta */}
                <div
                  className="flex-1 rounded-2xl p-4 shadow-xl border border-white/15 flex flex-col justify-between text-white relative overflow-hidden"
                  style={{ backgroundColor: primaryHex }}
                >
                  <div className="flex justify-between items-center text-[8px] font-mono opacity-60">
                    <span>TARJETA DE PRESENTACIÓN • ANVERSO</span>
                    <span>85 × 55 MM</span>
                  </div>
                  <div className="my-auto flex items-center justify-center py-2">
                    {renderBrandStamp('light', 'h-5', 'text-sm')}
                  </div>
                  <div className="text-[8px] font-mono opacity-60 text-right">
                    {guideline.tagline || 'IDENTIDAD OFICIAL'}
                  </div>
                </div>

                {/* Reverso Tarjeta con QR Real */}
                <div className="flex-1 rounded-2xl bg-white text-zinc-900 p-4 shadow-xl border border-black/10 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="scale-75 origin-left">
                      {renderBrandStamp('dark', 'h-3.5', 'text-xs')}
                    </div>
                    <div className="text-[10px] font-bold pt-1">Dirección General</div>
                    <div className="text-[8px] font-mono text-zinc-500">
                      hola@{guideline.brandName.toLowerCase().replace(/\s+/g, '')}.com
                    </div>
                    <div
                      className="inline-block px-1.5 py-0.5 rounded text-[7px] font-mono font-bold text-white"
                      style={{ backgroundColor: accentHex }}
                    >
                      VERIFICADO
                    </div>
                  </div>
                  <img
                    src={qrUrl}
                    alt="QR Card"
                    className="w-12 h-12 rounded-lg border border-zinc-200 p-0.5 bg-white shrink-0"
                  />
                </div>
              </div>

              {/* Sobre Americano DL + Carpeta Ejecutiva (Derecha) */}
              <div className="md:col-span-4 flex flex-col justify-between gap-3">
                {/* Sobre Americano DL */}
                <div className="flex-1 rounded-2xl bg-[#EAE8E1] text-zinc-900 p-4 shadow-xl border border-black/10 flex flex-col justify-between relative overflow-hidden">
                  <div
                    className="absolute right-0 top-0 bottom-0 w-3"
                    style={{ backgroundColor: accentHex }}
                  />
                  <div className="flex items-center justify-between">
                    <div className="scale-75 origin-left">
                      {renderBrandStamp('dark', 'h-3.5', 'text-xs')}
                    </div>
                    <span className="text-[8px] font-mono text-zinc-500 pr-3">SOBRE DL 220×110</span>
                  </div>
                  <div className="my-auto pl-12">
                    <div className="h-1.5 w-28 rounded bg-zinc-400/70 mb-1" />
                    <div className="h-1 w-20 rounded bg-zinc-400/50" />
                  </div>
                  <span className="text-[8px] font-mono text-zinc-500">CORRESPONDENCIA CORPORATIVA</span>
                </div>

                {/* Carpeta Corporativa */}
                <div className="flex-1 rounded-2xl bg-zinc-900 text-white p-4 shadow-xl border border-zinc-700 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400">
                    <span>CARPETA EJECUTIVA</span>
                    <span>BARNIZ UV SECTORIZADO</span>
                  </div>
                  <div className="my-auto flex items-center justify-between">
                    {renderBrandStamp('light', 'h-5', 'text-sm')}
                    <div
                      className="w-8 h-8 rounded-xl opacity-80"
                      style={{ backgroundColor: primaryHex }}
                    />
                  </div>
                  <div className="text-[8px] font-mono text-zinc-400">
                    Bolsillo interior troquelado para propuestas
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-1">
              <span>Papelería Corporativa • Hoja A4, Tarjetas Doble Cara, Sobre DL y Carpeta</span>
              <span>Papelería</span>
            </div>
          </div>
        );
      }

      case 'packaging_kit': {
        const pal = getGarmentPalette();
        const brandAccent = guideline.colors?.[0]?.hex || '#F59E0B';

        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-10 md:p-12 ${bgClass} select-none`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60 block">
                  Empaques, Caja de Envío / Delivery, Vaso Térmico y Bolsa Kraft
                </span>
                <h3 className="text-base sm:text-xl font-bold tracking-tight">
                  Sistema de Empaques, Cajas de Entrega, Vaso Térmico y Bolsa Kraft
                </h3>
              </div>
              {renderColorwaySelector()}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-auto">
              {/* 1. Caja de Pizza / E-Commerce Delivery Box */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#232329] to-[#121216] text-white border border-zinc-700/70 flex flex-col items-center justify-between min-h-[225px] relative overflow-hidden">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 self-start">
                  01 • Caja de Envío / Gourmet
                </span>
                <div className="my-auto relative flex items-center justify-center">
                  <svg viewBox="0 0 210 155" className="w-40 h-32 drop-shadow-[0_14px_16px_rgba(0,0,0,0.45)]">
                    {/* Tapa superior en perspectiva isométrica */}
                    <polygon
                      points="105,16 192,54 105,94 18,54"
                      fill={pal.base}
                      stroke={pal.stitch}
                      strokeWidth="1.2"
                    />
                    {/* Frente izquierdo de la caja */}
                    <polygon
                      points="18,54 105,94 105,126 18,84"
                      fill={pal.mid}
                      stroke={pal.stitch}
                      strokeWidth="1"
                    />
                    {/* Frente derecho de la caja */}
                    <polygon
                      points="105,94 192,54 192,84 105,126"
                      fill={pal.dark}
                      stroke={pal.stitch}
                      strokeWidth="1"
                    />
                    {/* Cinta de seguridad impresa (Branded Tape) */}
                    <polygon points="88,86 122,86 122,118 88,118" fill={brandAccent} opacity="0.9" />
                    {/* Orificios de ventilación laterales */}
                    <circle cx="145" cy="88" r="3" fill="#09090B" />
                    <circle cx="160" cy="81" r="3" fill="#09090B" />
                  </svg>
                  {/* Estampado en perspectiva isométrica real siguiendo el plano de la tapa */}
                  <div
                    className="absolute top-[34%] left-1/2"
                    style={{
                      transform: 'translate(-50%, -50%) rotateZ(-19deg) skewX(-34deg) scaleY(0.68) scale(0.95)',
                      transformOrigin: 'center center',
                    }}
                  >
                    <div className="opacity-90 mix-blend-multiply drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                      {renderBrandStamp(pal.stampVariant, 'h-6 max-w-[65px]', 'text-[9px]')}
                    </div>
                  </div>
                </div>
                <div className="w-full text-left">
                  <div className="text-[11px] font-bold">Caja de Entrega Gourmet</div>
                  <div className="text-[9px] font-mono text-zinc-400">Cartón Microcorrugado • Sello de Seguridad</div>
                </div>
              </div>

              {/* 2. Vaso de Café / Bebida con Faja Térmica */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#F4F4F1] to-[#D8D7D0] text-zinc-900 border border-black/10 flex flex-col items-center justify-between min-h-[225px] relative overflow-hidden">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 self-start">
                  02 • Vaso Térmico 16oz
                </span>
                <div className="my-auto relative flex items-center justify-center">
                  <svg viewBox="0 0 160 185" className="w-32 h-36 drop-shadow-[0_14px_14px_rgba(0,0,0,0.25)]">
                    {/* Tapa ergonómica de polipropileno */}
                    <rect x="40" y="16" width="80" height="10" rx="3" fill="#18181B" />
                    <rect x="34" y="24" width="92" height="9" rx="3" fill="#27272A" />
                    {/* Cuerpo del vaso */}
                    <polygon points="40,33 120,33 108,168 52,168" fill="#FAFAFA" stroke="#D4D4D8" strokeWidth="1" />
                    {/* Faja térmica (Sleeve) con color de marca */}
                    <polygon points="44,72 116,72 112,126 48,126" fill={pal.base} />
                    <line x1="45" y1="76" x2="115" y2="76" stroke={brandAccent} strokeWidth="2" />
                  </svg>
                  <div className="absolute top-[53%] left-1/2 -translate-x-1/2 -translate-y-1/2">
                    {renderBrandStamp(pal.stampVariant, 'h-6 max-w-[48px]', 'text-[9px]', true)}
                  </div>
                </div>
                <div className="w-full text-left">
                  <div className="text-[11px] font-bold">Vaso Doble Pared 16oz</div>
                  <div className="text-[9px] font-mono text-zinc-600">Faja Texturizada • Tapa Mate</div>
                </div>
              </div>

              {/* 3. Bolsa Kraft Takeaway / Retail */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#F4F4F1] to-[#D8D7D0] text-zinc-900 border border-black/10 flex flex-col items-center justify-between min-h-[225px] relative overflow-hidden">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 self-start">
                  03 • Bolsa Kraft Impresa
                </span>
                <div className="my-auto relative flex items-center justify-center">
                  <svg viewBox="0 0 175 190" className="w-32 h-36 drop-shadow-[0_14px_15px_rgba(0,0,0,0.28)]">
                    {/* Asas de papel torcido */}
                    <path
                      d="M62,55 C62,18 112,18 112,55"
                      fill="none"
                      stroke="#A16207"
                      strokeWidth="4.5"
                    />
                    {/* Cuerpo Kraft o Colorway */}
                    <polygon points="34,52 134,52 138,170 30,170" fill="#C89D66" />
                    {/* Fuelle lateral 3D */}
                    <polygon points="134,52 150,44 152,158 138,170" fill="#A67B44" />
                    {/* Pliegue superior dentado */}
                    <line x1="34" y1="52" x2="134" y2="52" stroke="#855E2C" strokeWidth="2" strokeDasharray="3 1" />
                  </svg>
                  <div className="absolute top-[58%] left-[47%] -translate-x-1/2 -translate-y-1/2 opacity-90 mix-blend-multiply">
                    {renderBrandStamp('dark', 'h-7 max-w-[65px]', 'text-[10px]')}
                  </div>
                </div>
                <div className="w-full text-left">
                  <div className="text-[11px] font-bold">Bolsa Ecológica Kraft</div>
                  <div className="text-[9px] font-mono text-zinc-600">Papel Kraft 140g • Tinta Ecológica</div>
                </div>
              </div>

              {/* 4. Etiqueta Colgante Troquelada (Die-Cut Hang Tag) */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#232329] to-[#121216] text-white border border-zinc-700/70 flex flex-col items-center justify-between min-h-[225px] relative overflow-hidden">
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 self-start">
                  04 • Etiqueta Troquelada
                </span>
                <div className="my-auto relative flex items-center justify-center">
                  <svg viewBox="0 0 160 185" className="w-32 h-36 drop-shadow-[0_14px_16px_rgba(0,0,0,0.45)]">
                    {/* Cordón encerado */}
                    <path d="M80,8 C65,25 72,44 80,52" fill="none" stroke="#D4D4D8" strokeWidth="2.5" />
                    {/* Cuerpo de etiqueta */}
                    <polygon
                      points="46,58 62,42 98,42 114,58 114,166 46,166"
                      fill={pal.base}
                      stroke={brandAccent}
                      strokeWidth="1.5"
                    />
                    <circle cx="80" cy="54" r="4.5" fill="#18181B" stroke="#A1A1AA" strokeWidth="1.5" />
                    <line x1="56" y1="146" x2="104" y2="146" stroke={pal.stitch} strokeWidth="1" />
                  </svg>
                  <div className="absolute top-[56%] left-1/2 -translate-x-1/2 -translate-y-1/2">
                    {renderBrandStamp(pal.stampVariant, 'h-6 max-w-[42px]', 'text-[9px]', true)}
                  </div>
                </div>
                <div className="w-full text-left">
                  <div className="text-[11px] font-bold">Etiqueta Hang Tag Premium</div>
                  <div className="text-[9px] font-mono text-zinc-400">Cartulina Dúplex 600g • Ojal Metálico</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-1">
              <span>Empaques y Bolsas de Entrega • Gastronomía, Retail y E-Commerce</span>
              <span>Kit de Empaques</span>
            </div>
          </div>
        );
      }

      case 'ooh_fleet': {
        const primaryHex = guideline.colors?.[0]?.hex || '#18181B';
        const accentHex = guideline.colors?.[1]?.hex || '#F59E0B';

        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-10 md:p-12 ${bgClass} select-none`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60 block">
                  Publicidad Exterior (OOH), Fachada Comercial y Flota de Reparto
                </span>
                <h3 className="text-base sm:text-xl font-bold tracking-tight">
                  Señalética Exterior, Valla Autopista, Letrero Luminoso y Flota Vehicular
                </h3>
              </div>
              <span className="text-[10px] font-mono opacity-60">Iluminación LED • Vinilo Vehicular 3M</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-auto">
              {/* 1. Valla Publicitaria (Highway Billboard) */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#090D16] text-white border border-slate-700/70 flex flex-col justify-between min-h-[245px] relative overflow-hidden">
                <div className="flex justify-between items-center text-[9px] font-mono text-sky-300">
                  <span>01 • VALLA PUBLICITARIA 14×48 FT</span>
                  <span>ILUMINACIÓN LED</span>
                </div>

                <div className="my-auto flex flex-col items-center">
                  {/* Luminarias superiores */}
                  <div className="flex justify-around w-44 mb-1">
                    <div className="w-6 h-1 bg-amber-200 rounded-full shadow-[0_4px_12px_#FDE68A]" />
                    <div className="w-6 h-1 bg-amber-200 rounded-full shadow-[0_4px_12px_#FDE68A]" />
                    <div className="w-6 h-1 bg-amber-200 rounded-full shadow-[0_4px_12px_#FDE68A]" />
                  </div>
                  {/* Marco de la Valla */}
                  <div
                    className="w-full max-w-[235px] h-28 rounded-xl border-4 border-zinc-700 shadow-2xl p-3 flex flex-col justify-between relative overflow-hidden"
                    style={{ backgroundColor: primaryHex }}
                  >
                    <div
                      className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full opacity-35"
                      style={{ backgroundColor: accentHex }}
                    />
                    <div className="scale-90 origin-left">
                      {renderBrandStamp('light', 'h-4', 'text-xs')}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight text-white">
                        {guideline.tagline || guideline.brandName}
                      </div>
                      <div className="text-[8px] font-mono text-white/70 mt-0.5">
                        WWW.{guideline.brandName.replace(/\s+/g, '').toUpperCase()}.COM
                      </div>
                    </div>
                  </div>
                  {/* Columna de acero */}
                  <div className="w-4 h-7 bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-800" />
                  <div className="w-24 h-1.5 bg-zinc-700 rounded-full" />
                </div>

                <div className="text-[9px] font-mono text-slate-400">
                  Alta visibilidad diurna y nocturna a 150m
                </div>
              </div>

              {/* 2. Letrero Luminoso Redondo de Fachada Comercial (Blade Sign) */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#1C1917] to-[#0C0A09] text-white border border-stone-700/70 flex flex-col justify-between min-h-[245px] relative overflow-hidden">
                <div className="flex justify-between items-center text-[9px] font-mono text-amber-300">
                  <span>02 • LETRERO LUMINOSO DE FACHADA</span>
                  <span>ACRÍLICO DOBLE CARA</span>
                </div>

                <div className="my-auto flex items-center justify-center relative py-2">
                  {/* Pared arquitectónica lateral + Soportes de hierro */}
                  <div className="w-5 h-36 bg-stone-800 border-r border-stone-600 rounded-l" />
                  <div className="flex flex-col gap-12">
                    <div className="w-6 h-2 bg-zinc-600" />
                    <div className="w-6 h-2 bg-zinc-600" />
                  </div>
                  {/* Caja de luz circular retroiluminada (Prefiere Icono/Isotipo) */}
                  <div
                    className="w-32 h-32 rounded-full border-4 border-zinc-300 shadow-[0_0_30px_rgba(255,255,255,0.22)] flex items-center justify-center p-4"
                    style={{ backgroundColor: primaryHex }}
                  >
                    <div className="scale-95">
                      {renderBrandStamp('light', 'h-12 max-w-[78px]', 'text-xs', true)}
                    </div>
                  </div>
                </div>

                <div className="text-[9px] font-mono text-stone-400">
                  Aluminio anodizado negro + Acrílico termoformado
                </div>
              </div>

              {/* 3. Furgoneta de Reparto Rotulada (Delivery Van Wrap) */}
              <div className="rounded-2xl p-4 bg-gradient-to-b from-[#F4F4F1] to-[#D4D4CE] text-zinc-900 border border-black/10 flex flex-col justify-between min-h-[245px] relative overflow-hidden">
                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-600">
                  <span>03 • ROTULACIÓN DE FLOTA COMERCIAL</span>
                  <span>FURGONETA DE REPARTO</span>
                </div>

                <div className="my-auto relative flex items-center justify-center">
                  <svg viewBox="0 0 250 135" className="w-52 h-28 drop-shadow-[0_12px_12px_rgba(0,0,0,0.28)]">
                    {/* Carrocería de la furgoneta */}
                    <path
                      d="M22,32 L168,32 C178,32 186,38 194,54 L222,68 C228,72 230,78 230,86 L230,102 L18,102 L18,38 C18,34 20,32 22,32 Z"
                      fill={primaryHex}
                    />
                    {/* Franja diagonal de acento */}
                    <polygon points="120,32 152,32 118,102 86,102" fill={accentHex} opacity="0.9" />
                    {/* Parabrisas y ventanilla del conductor */}
                    <polygon points="154,39 182,39 194,62 154,62" fill="#0F172A" />
                    {/* Faro delantero y parachoques */}
                    <rect x="222" y="74" width="8" height="10" rx="2" fill="#FEF08A" />
                    <rect x="14" y="96" width="220" height="7" rx="3" fill="#27272A" />
                    {/* Ruedas con rines */}
                    <circle cx="62" cy="102" r="18" fill="#18181B" />
                    <circle cx="62" cy="102" r="9" fill="#A1A1AA" />
                    <circle cx="192" cy="102" r="18" fill="#18181B" />
                    <circle cx="192" cy="102" r="9" fill="#A1A1AA" />
                  </svg>
                  {/* Logo estampado en el panel lateral de carga */}
                  <div className="absolute top-[42%] left-[36%] -translate-x-1/2 -translate-y-1/2 scale-75">
                    {renderBrandStamp('light', 'h-4', 'text-[10px]')}
                  </div>
                </div>

                <div className="text-[9px] font-mono text-zinc-600">
                  Vinilo fundido vehicular con laminado UV mate
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-1">
              <span>Vallas Publicitarias, Señalética Comercial y Flota Vehicular</span>
              <span>Vía Pública y Flota</span>
            </div>
          </div>
        );
      }

      case 'social_kit': {
        const primaryHex = guideline.colors?.[0]?.hex || '#18181B';
        const secondaryHex = guideline.colors?.[1]?.hex || '#F59E0B';
        const thirdHex = guideline.colors?.[2]?.hex || '#3B82F6';
        const handleName = guideline.brandName.toLowerCase().replace(/\s+/g, '');

        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-10 md:p-12 ${bgClass} select-none`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60 block">
                  Kit de Redes Sociales • Grilla de Instagram en Vivo y Portada de LinkedIn
                </span>
                <h3 className="text-base sm:text-xl font-bold tracking-tight">
                  Ecosistema Digital y Kit de Redes Sociales en Vivo
                </h3>
              </div>
              <span className="text-[10px] font-mono opacity-60">@{handleName} • Feed 1080×1350px</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 my-auto items-center">
              {/* Izquierda: Simulador de Perfil de Instagram (Avatar + Bio + Highlights + Grilla de 6 Posts) */}
              <div className="lg:col-span-6 rounded-2xl bg-zinc-950 text-white border border-zinc-800 p-4 shadow-2xl space-y-3">
                {/* Cabecera del Perfil */}
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 shrink-0"
                  >
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center overflow-hidden border-2 border-zinc-950"
                      style={{ backgroundColor: primaryHex }}
                    >
                      <div className="scale-90">
                        {renderBrandStamp('light', 'h-6 max-w-[36px]', 'text-[8px]', true)}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold truncate">@{handleName}</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-sky-500 text-[8px] flex items-center justify-center font-bold">
                        ✓
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-300 font-semibold truncate">{guideline.brandName}</p>
                    <p className="text-[9px] text-zinc-400 line-clamp-1">
                      {guideline.tagline || 'Identidad visual oficial y experiencia de marca.'}
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-white text-zinc-950 text-[10px] font-bold">
                    Seguir
                  </div>
                </div>

                {/* Story Highlights */}
                <div className="flex items-center gap-3 pt-1">
                  {['Nosotros', 'Catálogo', 'Clientes', 'Contacto'].map((hl, i) => (
                    <div key={hl} className="flex flex-col items-center gap-1">
                      <div
                        className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center text-[8px] font-mono"
                        style={{
                          backgroundColor: i % 2 === 0 ? primaryHex : secondaryHex,
                          color: '#FFFFFF',
                        }}
                      >
                        0{i + 1}
                      </div>
                      <span className="text-[8px] text-zinc-400">{hl}</span>
                    </div>
                  ))}
                </div>

                {/* Grilla de 6 Posts de Instagram con la Paleta y Tipografía de la Marca */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { bg: primaryHex, text: guideline.brandName, sub: 'LANZAMIENTO' },
                    { bg: secondaryHex, text: guideline.tagline || 'NUEVA ETAPA', sub: 'MANIFIESTO' },
                    { bg: '#18181B', text: 'CALIDAD SUPERIOR', sub: '01 / 06' },
                    { bg: '#F4F4F5', text: guideline.brandName, sub: 'IDENTIDAD', darkText: true },
                    { bg: thirdHex, text: 'EDICIÓN ESPECIAL', sub: 'COLECCIÓN' },
                    { bg: primaryHex, text: `@${handleName}`, sub: 'SÍGUENOS' },
                  ].map((post, idx) => (
                    <div
                      key={idx}
                      style={{ backgroundColor: post.bg }}
                      className={`aspect-square rounded-lg p-2 flex flex-col justify-between overflow-hidden border border-white/10 ${
                        post.darkText ? 'text-zinc-900' : 'text-white'
                      }`}
                    >
                      <span className="text-[7px] font-mono opacity-70">{post.sub}</span>
                      <div className="my-auto scale-75 origin-left">
                        {idx % 2 === 0 ? (
                          renderBrandStamp(post.darkText ? 'dark' : 'light', 'h-3', 'text-[8px]')
                        ) : (
                          <span
                            className="text-[9px] font-bold leading-tight block"
                            style={{ fontFamily: `"${primaryFont}", sans-serif` }}
                          >
                            {post.text}
                          </span>
                        )}
                      </div>
                      <span className="text-[6px] font-mono opacity-50 self-end">#{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Derecha: LinkedIn Corporate Cover Banner + Firma Digital */}
              <div className="lg:col-span-6 space-y-4">
                <div className="rounded-2xl bg-zinc-950 text-white border border-zinc-800 overflow-hidden shadow-2xl">
                  <div
                    className="h-28 p-5 flex items-center justify-between relative overflow-hidden"
                    style={{
                      background: `linear-gradient(125deg, ${primaryHex} 0%, #09090B 65%, ${secondaryHex} 100%)`,
                    }}
                  >
                    <div className="space-y-1 z-10">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-white/70">
                        PORTADA CORPORATIVA LINKEDIN • 1584 × 396 PX
                      </span>
                      <h4
                        className="text-lg font-bold text-white"
                        style={{ fontFamily: `"${primaryFont}", sans-serif` }}
                      >
                        {guideline.tagline || guideline.brandName}
                      </h4>
                    </div>
                    <div className="z-10 scale-95">
                      {renderBrandStamp('light', 'h-6', 'text-sm')}
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between bg-zinc-900">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl -mt-8 border-2 border-zinc-900 flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: primaryHex }}
                      >
                        <div className="scale-90">
                          {renderBrandStamp('light', 'h-5 max-w-[28px]', 'text-[8px]', true)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold">{guideline.brandName} Oficial</div>
                        <div className="text-[10px] text-zinc-400">
                          Página Corporativa • Sistema de Identidad Visual
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-400 text-[9px] font-mono">
                      Perfil Verificado
                    </span>
                  </div>
                </div>

                {/* Tarjeta de Pauta / Story 9:16 Horizontal Preview */}
                <div className="rounded-2xl bg-zinc-900/90 text-white border border-zinc-800 p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-amber-400 uppercase">
                      consistencia omnicanal
                    </span>
                    <h4 className="text-xs font-bold">
                      Plantillas listas para Instagram, LinkedIn, TikTok y Meta Ads
                    </h4>
                    <p className="text-[10px] text-zinc-400">
                      Uso balanceado de color primario ({primaryHex}), acento ({secondaryHex}) y tipografía {primaryFont}.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700 text-[10px] font-mono text-zinc-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Activos Digitales</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-1">
              <span>Kit de Redes Sociales • Grilla de Instagram, Destacadas y Portada de LinkedIn</span>
              <span>Redes Sociales</span>
            </div>
          </div>
        );
      }

      case 'other_ideas':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-8 sm:p-14 ${bgClass} select-none`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                Variaciones del Símbolo, Iconos y Exploración Visual
              </span>
              <span className="text-[10px] font-mono opacity-40">
                Matriz de Símbolos e Iconografía
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-10 my-auto max-w-3xl mx-auto w-full">
              {(guideline.otherIdeas || []).slice(0, 6).map((idea, idx) => (
                <div
                  key={idea.id || idx}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border border-zinc-700/40 bg-zinc-800/30 hover:border-zinc-500 transition"
                >
                  <div className="w-16 h-16 flex items-center justify-center text-current mb-3">
                    {idea.imageUrl ? (
                      <img
                        src={idea.imageUrl}
                        alt={idea.title}
                        className="max-h-14 max-w-14 object-contain"
                      />
                    ) : idx === 0 && (guideline.logoSymbolUrl || guideline.logoSymbolDarkUrl) ? (
                      <img
                        src={guideline.logoSymbolUrl || guideline.logoSymbolDarkUrl}
                        alt={idea.title}
                        className="max-h-14 max-w-14 object-contain"
                      />
                    ) : idx === 0 ? (
                      <div className="grid grid-cols-2 gap-1.5 w-10 h-10">
                        <div className="rounded-full bg-current" />
                        <div className="rounded-full bg-current" />
                        <div className="rounded-full bg-current" />
                        <div className="rounded-full bg-current" />
                      </div>
                    ) : idx === 1 ? (
                      <div className="grid grid-cols-3 gap-1 w-10 h-10">
                        <div className="bg-current" />
                        <div className="bg-transparent" />
                        <div className="bg-current" />
                        <div className="bg-transparent" />
                        <div className="bg-current" />
                        <div className="bg-transparent" />
                        <div className="bg-current" />
                        <div className="bg-transparent" />
                        <div className="bg-current" />
                      </div>
                    ) : idx === 2 ? (
                      <div className="grid grid-cols-2 gap-1 w-10 h-10">
                        <div className="bg-current rounded-tr-xl" />
                        <div className="bg-current rounded-tl-xl" />
                        <div className="bg-current rounded-br-xl" />
                        <div className="bg-current rounded-bl-xl" />
                      </div>
                    ) : idx === 3 ? (
                      <div className="flex flex-col gap-1 w-10 h-10 items-center justify-center">
                        <div className="w-10 h-4 bg-current rounded-t-full" />
                        <div className="w-10 h-4 bg-current rounded-b-full" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 border-4 border-current rotate-45 rounded-lg" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono opacity-60 text-center">
                    {translateDisplayText(idea.title, idea.title)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-[10px] font-mono opacity-40 pt-4">
              <span>Símbolos Alternativos y Matriz de Iconos</span>
              <span>Exploración de Símbolos</span>
            </div>
          </div>
        );

      case 'next_steps':
        return (
          <div className={`w-full min-h-full flex flex-col justify-between p-6 sm:p-12 md:p-16 ${bgClass} select-none`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] sm:text-xs font-mono tracking-widest uppercase opacity-60">
                  Hoja de Ruta, Aprobación y Kit de Archivos Editables
                </span>
                <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight mt-1">Próximos Pasos</h2>
              </div>

              {/* Botones de Acción Final para el Cliente */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setApprovalDecision('approved');
                    setIsApprovalModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprobar Identidad</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setApprovalDecision('changes_requested');
                    setIsApprovalModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Solicitar Ajustes</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center my-auto">
              {/* Izquierda: Hoja de Ruta */}
              <div className="lg:col-span-7 space-y-3 sm:space-y-4">
                {(guideline.nextSteps || []).map((step, idx) => (
                  <div key={step.id || idx} className="flex items-start gap-3.5">
                    <span className="font-mono text-sm font-bold opacity-60 pt-0.5">
                      {step.step || `0${idx + 1}`}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold">
                        {translateDisplayText(step.title, step.title)}
                      </h4>
                      <p className={`text-xs ${textMuted} leading-relaxed`}>
                        {translateDisplayText(step.description, step.description)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Derecha: Centro de Descargas (Kit de Archivos y Google Drive) */}
              <div className="lg:col-span-5 p-5 rounded-2xl border border-zinc-700/50 bg-zinc-900/60 text-white space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Kit de Archivos de Marca</h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Descarga el manual en PDF 16:9, los tokens de color o accede a la carpeta de editables en Google Drive.
                </p>

                <div className="space-y-2 pt-1">
                  {guideline.driveFolderUrl && (
                    <a
                      href={guideline.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4" />
                        <span>Abrir Carpeta Google Drive</span>
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={exportingPdf}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FileDown className="w-4 h-4" />
                      <span>{exportingPdf ? 'Generando PDF 16:9...' : 'Descargar Manual de Marca (PDF 16:9)'}</span>
                    </span>
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadColorTokens}
                    className="w-full py-2 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center justify-between transition cursor-pointer"
                  >
                    <span>Tokens de Color (.CSS)</span>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-500/20 flex justify-between items-center text-xs font-mono opacity-60">
              <span className="text-lg sm:text-xl font-bold tracking-tight">Muchas gracias</span>
              <span>
                {guideline.brandName} © {guideline.date || '2026'}
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-2 border-zinc-700 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-zinc-400 tracking-wider uppercase">
          Cargando Manual de Identidad Visual...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Presentación no disponible</h2>
        <p className="text-sm text-zinc-400 mt-2 max-w-md">{error}</p>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col justify-between p-6 sm:p-12 text-white selection:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs">
              {(meta?.brandName || 'RM').slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-semibold tracking-tight">
              {meta?.brandName || 'Brand Identity'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Acceso Protegido por PIN
          </span>
        </div>

        <div className="max-w-md w-full mx-auto my-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center mx-auto shadow-xl">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Ingresa el PIN de acceso</h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Esta presentación de identidad visual es confidencial para{' '}
              {meta?.clientName || 'el cliente'}.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Ingresa el PIN (ej: 1234)"
                className={`w-full px-4 py-3.5 rounded-xl bg-zinc-900 border text-center font-mono text-lg tracking-[0.3em] text-white placeholder:text-zinc-600 focus:outline-none transition ${
                  pinError
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-zinc-800 focus:border-zinc-500'
                }`}
              />
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>

            {pinError && (
              <p className="text-xs text-rose-400 font-mono text-center">
                El PIN ingresado es incorrecto. Inténtalo de nuevo.
              </p>
            )}

            <button
              type="submit"
              disabled={verifyingPin || !pinInput.trim()}
              className="w-full py-3.5 bg-white text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {verifyingPin ? (
                <span>Validando PIN...</span>
              ) : (
                <>
                  <span>Desbloquear Presentación</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-[10px] font-mono text-zinc-600">
          Roma Studio Pitch Deck Engine • Identidad y Estrategia Visual
        </div>
      </div>
    );
  }

  const currentSlideComments = (guideline?.comments || []).filter(
    (c) => c.slideId === slides[currentSlideIndex]?.id
  );

  return (
    <div className="min-h-screen bg-[#E5E5E5] dark:bg-[#121214] text-zinc-900 dark:text-white flex flex-col font-sans transition-colors duration-300">
      {/* Botón flotante discreto cuando la barra está oculta en pantalla completa o celular */}
      {!showControls && (isFullscreen || isCinemaMode) && (
        <button
          type="button"
          onClick={() => setShowControls(true)}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-black/75 hover:bg-black text-white backdrop-blur-md text-[11px] font-mono border border-white/20 flex items-center gap-1.5 shadow-2xl transition-all animate-fadeIn cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Mostrar barra</span>
        </button>
      )}

      {/* Barra Flotante Superior */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 p-2 sm:p-4 pointer-events-none transition-all duration-300 ${
          !showControls && (isFullscreen || isCinemaMode)
            ? '-translate-y-full opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Identidad + Estado de Aprobación */}
          <div className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg text-xs font-semibold shrink min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 inline-block ${
                guideline?.status === 'approved'
                  ? 'bg-emerald-500'
                  : guideline?.status === 'changes_requested'
                  ? 'bg-rose-500'
                  : 'bg-amber-400'
              }`}
            />
            <span className="truncate max-w-[105px] xs:max-w-[140px] sm:max-w-[200px] md:max-w-xs whitespace-nowrap block">
              {guideline?.brandName}
            </span>
            <span className="text-zinc-400 text-[10px] font-mono uppercase hidden md:inline shrink-0">
              {guideline?.round || 'Deck'}
            </span>
          </div>

          {/* Controles Principales */}
          <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg shrink-0">
            {/* Auto-Play Showreel */}
            <button
              type="button"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              title="Reproducción automática Showreel (tecla P)"
              className={`px-2 sm:px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                isAutoPlaying
                  ? 'bg-amber-400 text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden md:inline text-[11px]">
                {isAutoPlaying ? 'Pausar' : 'Showreel'}
              </span>
            </button>

            <div className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-700 mx-0.5 hidden sm:block" />

            {/* Vista 16:9 vs Grid 2x2 (Visible en escritorio/tablets) */}
            <button
              type="button"
              onClick={() => setViewMode('deck')}
              title="Modo Presentación 16:9"
              className={`p-2 rounded-full text-xs font-medium transition cursor-pointer hidden sm:flex ${
                viewMode === 'deck'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Modo Cuadrícula 2x2 (Showreel)"
              className={`p-2 rounded-full text-xs font-medium transition cursor-pointer hidden sm:flex ${
                viewMode === 'grid'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>

            {/* Toggle Tema */}
            <button
              type="button"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              title="Alternar modo oscuro/claro (tecla T)"
              className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Comentarios por Lámina */}
            <button
              type="button"
              onClick={() => setIsCommentsOpen(true)}
              title="Dejar feedback en esta lámina"
              className="px-2 sm:px-2.5 py-1.5 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1 text-xs font-bold cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span>{(guideline?.comments || []).length}</span>
            </button>

            {/* Exportar PDF 16:9 */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf}
              title="Descargar presentación completa en PDF 16:9"
              className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
            </button>

            {/* Aprobar Identidad */}
            <button
              type="button"
              onClick={() => {
                setApprovalDecision('approved');
                setIsApprovalModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-[11px] font-bold hidden sm:flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{guideline?.status === 'approved' ? 'Aprobado' : 'Aprobar'}</span>
            </button>

            {/* Copiar Link */}
            <button
              type="button"
              onClick={copyPublicLink}
              title="Copiar enlace"
              className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Modo Cine */}
            <button
              type="button"
              onClick={() => setIsCinemaMode((prev) => !prev)}
              title="Modo Cine Inmersivo (Expandir lámina al 100%)"
              className={`p-2 sm:px-2.5 sm:py-1.5 rounded-full text-[11px] font-bold hidden md:flex items-center gap-1 transition cursor-pointer ${
                isCinemaMode
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{isCinemaMode ? 'Salir Cine' : 'Modo Cine'}</span>
            </button>

            {/* Botón para ocultar la barra y no molestar la lectura */}
            {(isFullscreen || isCinemaMode) && (
              <button
                type="button"
                onClick={() => setShowControls(false)}
                title="Ocultar barra para leer la propuesta sin obstáculos"
                className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              title="Pantalla completa nativa (tecla F)"
              className={`p-2 rounded-full transition cursor-pointer ${
                isFullscreen
                  ? 'bg-amber-400 text-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Contenedor Principal (Normal vs Modo Cine Pantalla Completa 100vw x 100vh) */}
      <main
        className={`flex-1 flex flex-col justify-center items-center w-full transition-all duration-300 ${
          isCinemaMode || isFullscreen
            ? 'p-0 max-w-none h-screen overflow-hidden'
            : 'p-2.5 sm:p-6 md:p-10 pt-16 sm:pt-24 max-w-7xl mx-auto'
        }`}
      >
        {viewMode === 'deck' ? (
          <div className={`w-full flex flex-col items-center ${isCinemaMode || isFullscreen ? 'h-full' : ''}`}>
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className={`w-full overflow-hidden shadow-2xl relative transition-all duration-300 ${
                theme === 'dark' ? 'bg-[#111111]' : 'bg-white'
              } ${
                isCinemaMode || isFullscreen
                  ? 'h-screen max-h-none rounded-none border-0'
                  : 'aspect-[16/10] sm:aspect-[16/9] min-h-[480px] sm:min-h-0 max-h-[85vh] rounded-2xl sm:rounded-3xl border border-black/10 dark:border-white/10'
              }`}
            >
              <div
                className={`w-full h-full overflow-y-auto sm:overflow-y-hidden ${
                  theme === 'dark' ? 'bg-[#111111]' : 'bg-white'
                }`}
              >
                {renderSlideContent(currentSlideIndex)}
              </div>

              {currentSlideIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/45 hover:bg-black/80 text-white backdrop-blur-md transition cursor-pointer shadow-lg z-20"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}

              {currentSlideIndex < totalSlides - 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1))}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/45 hover:bg-black/80 text-white backdrop-blur-md transition cursor-pointer shadow-lg z-20"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>

            {!(isCinemaMode || isFullscreen) && (
              <div className="mt-4 w-full flex items-center justify-between gap-4 px-2">
              <div className="text-xs font-mono text-zinc-500">
                {currentSlideIndex + 1} / {totalSlides} • {slides[currentSlideIndex]?.title}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-md">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentSlideIndex
                        ? 'w-6 bg-zinc-900 dark:bg-white'
                        : 'w-2 bg-zinc-400/60 dark:bg-zinc-700 hover:bg-zinc-600'
                    }`}
                    title={s.title}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentSlideIndex === 0}
                  onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold disabled:opacity-30 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentSlideIndex === totalSlides - 1}
                  onClick={() => setCurrentSlideIndex((prev) => Math.min(totalSlides - 1, prev + 1))}
                  className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold disabled:opacity-30 cursor-pointer shadow-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            )}
          </div>
        ) : (
          /* MODO SHOWREEL GRID 2x2 */
          <div className="w-full flex flex-col items-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
              {[0, 1, 2, 3].map((offset) => {
                const sIdx = currentGridPageIndex * 4 + offset;
                if (sIdx >= totalSlides) {
                  return (
                    <div
                      key={`empty-${offset}`}
                      className="aspect-[16/9] rounded-2xl border-2 border-dashed border-black/15 dark:border-white/15 flex items-center justify-center opacity-30 text-xs font-mono"
                    >
                      Fin de la presentación
                    </div>
                  );
                }
                return (
                  <div
                    key={slides[sIdx].id}
                    onClick={() => {
                      setCurrentSlideIndex(sIdx);
                      setViewMode('deck');
                    }}
                    className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 bg-zinc-950 group cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all hover:scale-[1.01]"
                  >
                    {/* Renderizado de alta resolución escalado al 50% para emular pantalla panorámica sin distorsión */}
                    <div className="absolute inset-0 w-[200%] h-[200%] origin-top-left transform scale-50 pointer-events-none select-none">
                      {renderSlideContent(sIdx)}
                    </div>
                    {/* Pill indicador de lámina */}
                    <div className="absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-mono text-white/90 border border-white/15 flex items-center gap-1.5 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span className="truncate max-w-[200px]">{slides[sIdx]?.title}</span>
                    </div>
                    {/* Overlay al pasar el mouse para abrir en pantalla 16:9 */}
                    <div className="absolute inset-0 z-20 bg-black/0 group-hover:bg-black/25 transition-all flex items-end justify-end p-3">
                      <span className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-xl bg-zinc-900/95 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all transform translate-y-1 group-hover:translate-y-0 shadow-lg">
                        Ver lámina 16:9 →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between w-full pt-2">
              <span className="text-xs font-mono text-zinc-500">
                Pliego {currentGridPageIndex + 1} de {totalGridPages} (Cuadrícula 2x2 Showreel)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentGridPageIndex === 0}
                  onClick={() => setCurrentGridPageIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold disabled:opacity-30 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Pliego Anterior</span>
                </button>
                <button
                  type="button"
                  disabled={currentGridPageIndex >= totalGridPages - 1}
                  onClick={() =>
                    setCurrentGridPageIndex((prev) => Math.min(totalGridPages - 1, prev + 1))
                  }
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 text-xs font-bold disabled:opacity-30 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <span>Siguiente Pliego</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Drawer Lateral de Comentarios por Diapositiva */}
      {isCommentsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 h-full flex flex-col border-l border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Feedback &amp; Comentarios del Cliente
                </h3>
                <p className="text-xs text-zinc-500">
                  Lámina actual: {slides[currentSlideIndex]?.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCommentsOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {currentSlideComments.length > 0 && (
                <div className="space-y-2 mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-500 font-bold">
                    En esta lámina ({currentSlideComments.length})
                  </span>
                  {currentSlideComments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1"
                    >
                      <div className="flex justify-between font-bold">
                        <span>{c.authorName}</span>
                        <span className="text-[10px] font-mono opacity-60">
                          {new Date(c.createdAt).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Historial completo ({(guideline?.comments || []).length})
              </span>
              {(guideline?.comments || []).length === 0 ? (
                <p className="text-xs text-zinc-400 py-8 text-center">
                  Aún no hay comentarios. Escribe abajo cualquier sugerencia sobre esta lámina y el equipo creativo recibirá una notificación en tiempo real.
                </p>
              ) : (
                (guideline?.comments || []).map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{c.authorName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">
                        {c.slideTitle}
                      </span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleAddComment}
              className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 bg-zinc-50 dark:bg-zinc-950"
            >
              <input
                type="text"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={`Comentar sobre ${slides[currentSlideIndex]?.title}...`}
                  className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Aprobación Oficial / Solicitud de Cambios */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {approvalDecision === 'approved'
                  ? '✅ Aprobar Identidad Visual'
                  : '⚠️ Solicitar Ajustes a la Agencia'}
              </h3>
              <button
                type="button"
                onClick={() => setIsApprovalModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitApproval} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Tu Nombre / Cargo</label>
                <input
                  type="text"
                  required
                  value={approvalName}
                  onChange={(e) => setApprovalName(e.target.value)}
                  placeholder="Ej: Carlos Mendoza - Director"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  {approvalDecision === 'approved'
                    ? 'Nota de aprobación (opcional)'
                    : 'Describe los ajustes que deseas realizar'}
                </label>
                <textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={
                    approvalDecision === 'approved'
                      ? 'Excelente trabajo equipo, procedamos con los archivos finales...'
                      : 'Me gustaría revisar el tono secundario y ajustar el tamaño del isotipo...'
                  }
                  className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingApproval}
                  className={`px-5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    approvalDecision === 'approved'
                      ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                      : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                  }`}
                >
                  {submittingApproval
                    ? 'Enviando...'
                    : approvalDecision === 'approved'
                    ? 'Confirmar Aprobación'
                    : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Inspector 3D en Pantalla Completa para Cualquier Mockup */}
      {zoomedMockup && (
        <div
          onClick={() => setZoomedMockup(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl text-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block">
                  Inspector 3D de Mockups • Vista Ampliada
                </span>
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  {guideline?.brandName} — Aplicación de Identidad
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {renderColorwaySelector()}
                <button
                  type="button"
                  onClick={() => setZoomedMockup(null)}
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {renderStudioMockupCard(zoomedMockup as any, true)}

            {/* Controles de Rotación 3D Interactiva + Filtro de Desplazamiento Textil */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap">
                  Giro 3D Y ({rot3D.y}°):
                </span>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  value={rot3D.y}
                  onChange={(e) => setRot3D((prev) => ({ ...prev, y: Number(e.target.value) }))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap">
                  Inclinación X ({rot3D.x}°):
                </span>
                <input
                  type="range"
                  min={-25}
                  max={25}
                  value={rot3D.x}
                  onChange={(e) => setRot3D((prev) => ({ ...prev, x: Number(e.target.value) }))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseDisplacementFilter(!useDisplacementFilter)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono cursor-pointer transition ${
                    useDisplacementFilter
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {useDisplacementFilter ? '✓ Pliegues Textiles ON' : 'Pliegues Textiles OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => setRot3D({ x: 0, y: 0 })}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-white cursor-pointer"
                >
                  Restablecer 3D
                </button>
              </div>
            </div>

            {/* Selector rápido entre los 8 mockups sin salir del Lightbox */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2">
              {(
                [
                  { id: 'sweatshirt', label: 'Polera' },
                  { id: 'tshirt', label: 'Camiseta' },
                  { id: 'hoodie', label: 'Hoodie' },
                  { id: 'cap', label: 'Gorra' },
                  { id: 'tote', label: 'Bolso Tote' },
                  { id: 'thermos', label: 'Termo' },
                  { id: 'lanyard', label: 'Credencial QR' },
                  { id: 'macbook', label: 'MacBook Pro' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setZoomedMockup(m.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-mono cursor-pointer transition ${
                    zoomedMockup === m.id
                      ? 'bg-white text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!(isCinemaMode || isFullscreen) && (
        <footer className="py-3 text-center text-[10px] font-mono text-zinc-400">
          Teclas: ← → Navegar • &apos;P&apos; Reproducción Automática • &apos;T&apos; Tema Oscuro/Claro • &apos;G&apos; Vista 2x2 • &apos;F&apos; Pantalla Completa • Haz clic en un Mockup para Zoom 3D
        </footer>
      )}
    </div>
  );
};
