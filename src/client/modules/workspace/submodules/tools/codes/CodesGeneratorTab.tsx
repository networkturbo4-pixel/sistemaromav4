import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import {
  QrCode,
  Barcode,
  Copy,
  Check,
  Download,
  Share2,
  Trash2,
  Sparkles,
  Link,
  MessageCircle,
  Send,
  Mail,
  Calendar,
  Wifi,
  User,
  MapPin,
  FileText,
  Upload,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  X,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import {
  calculateEan13Checksum,
  calculateUpcAChecksum,
  formatOrFixEan13,
  formatOrFixUpcA,
  generateSmartBarcode,
  generateBatchBarcodes,
  BatchBarcodeItem,
} from './barcodeUtils';
import { useApp } from '../../../../../context/AppContext';

// Tipos de contenido para QR
type QrContentType =
  | 'url'
  | 'whatsapp'
  | 'telegram'
  | 'email'
  | 'event'
  | 'wifi'
  | 'vcard'
  | 'geo'
  | 'text';

// Formatos de códigos de barra soportados
type BarcodeFormat = 'CODE128' | 'EAN13' | 'UPCA' | 'CODE39';

interface CodeHistoryEntry {
  id: string;
  type: 'qr' | 'barcode';
  subType: string;
  value: string;
  label?: string;
  time: string;
}

export const CodesGeneratorTab: React.FC = () => {
  const { toast, apiFetch } = useApp();

  // Modo principal: QR o Código de Barras (exacto a la imagen 2)
  const [activeMode, setActiveMode] = useState<'qr' | 'barcode'>('qr');

  // =========================================================================
  // ESTADOS DEL CÓDIGO QR
  // =========================================================================
  const [qrType, setQrType] = useState<QrContentType>('url');

  // Campos específicos según qrType
  const [urlValue, setUrlValue] = useState<string>('https://romaagencia.com');
  const [waPhone, setWaPhone] = useState<string>('+51987654321');
  const [waMessage, setWaMessage] = useState<string>('¡Hola! Me gustaría cotizar un servicio con Roma Agencia.');
  const [tgUsername, setTgUsername] = useState<string>('romaagencia');
  const [emailTo, setEmailTo] = useState<string>('contacto@romaagencia.com');
  const [emailSubject, setEmailSubject] = useState<string>('Consulta de Servicios');
  const [emailBody, setEmailBody] = useState<string>('Hola equipo, quiero más información sobre sus servicios.');
  const [eventTitle, setEventTitle] = useState<string>('Lanzamiento de Campaña Roma');
  const [eventLocation, setEventLocation] = useState<string>('Oficinas Roma / Zoom');
  const [eventStart, setEventStart] = useState<string>('2026-11-20T10:00');
  const [eventEnd, setEventEnd] = useState<string>('2026-11-20T12:00');
  const [wifiSsid, setWifiSsid] = useState<string>('Roma_Agencia_5G');
  const [wifiPass, setWifiPass] = useState<string>('RomaCreativa2026');
  const [wifiEncryption, setWifiEncryption] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [wifiHidden, setWifiHidden] = useState<boolean>(false);
  const [vcardFirst, setVcardFirst] = useState<string>('César');
  const [vcardLast, setVcardLast] = useState<string>('Agencia Roma');
  const [vcardOrg, setVcardOrg] = useState<string>('Roma Agencia Creativa');
  const [vcardTitle, setVcardTitle] = useState<string>('Director Creativo');
  const [vcardPhone, setVcardPhone] = useState<string>('+51 987 654 321');
  const [vcardEmail, setVcardEmail] = useState<string>('cesar@romaagencia.com');
  const [vcardWeb, setVcardWeb] = useState<string>('https://romaagencia.com');
  const [geoLat, setGeoLat] = useState<string>('-12.046374');
  const [geoLng, setGeoLng] = useState<string>('-77.042793');
  const [textFree, setTextFree] = useState<string>('Bienvenidos a la experiencia Roma Studio');

  // Personalización QR (Imagen 2)
  const [qrColorPrimary, setQrColorPrimary] = useState<string>('#000000');
  const [qrColorBg, setQrColorBg] = useState<string>('#FFFFFF');
  const [qrTransparentBg, setQrTransparentBg] = useState<boolean>(false);
  const [qrDotStyle, setQrDotStyle] = useState<'square' | 'rounded' | 'dots' | 'diamond'>('square');
  const [qrCornerStyle, setQrCornerStyle] = useState<'square' | 'rounded' | 'circle'>('square');
  const [qrErrorCorrection, setQrErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [qrFrame, setQrFrame] = useState<'none' | 'scan_me_top' | 'scan_me_bottom' | 'minimal_card' | 'badge_circle'>('none');
  const [qrFrameText, setQrFrameText] = useState<string>('ESCANÉAME');

  // Logo Central
  const [qrLogoUrl, setQrLogoUrl] = useState<string | null>(null);
  const [qrLogoSize, setQrLogoSize] = useState<number>(22); // porcentaje
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // =========================================================================
  // ESTADOS DEL CÓDIGO DE BARRAS
  // =========================================================================
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128');
  const [barcodeValue, setBarcodeValue] = useState<string>('ROMA-2026-X89');
  const [barcodePrefix, setBarcodePrefix] = useState<string>('775');
  const [barcodeShowText, setBarcodeShowText] = useState<boolean>(true);
  const [barcodeColor, setBarcodeColor] = useState<string>('#000000');
  const [barcodeBg, setBarcodeBg] = useState<string>('#FFFFFF');
  const [barcodeTransparentBg, setBarcodeTransparentBg] = useState<boolean>(false);
  const [barcodeHeight, setBarcodeHeight] = useState<number>(75);
  const [barcodeWidth, setBarcodeWidth] = useState<number>(2);

  // Generación Masiva por Lote
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchCount, setBatchCount] = useState<number>(10);
  const [batchMode, setBatchMode] = useState<'sequential' | 'random'>('sequential');
  const [generatedBatch, setGeneratedBatch] = useState<BatchBarcodeItem[]>([]);

  // =========================================================================
  // EXPORTACIÓN & HISTORIAL
  // =========================================================================
  const [exportQuality, setExportQuality] = useState<'1x' | '2x' | '4x'>('2x');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [history, setHistory] = useState<CodeHistoryEntry[]>([
    {
      id: 'h-1',
      type: 'qr',
      subType: 'URL',
      value: 'https://romaagencia.com',
      time: '23:09:56',
    },
    {
      id: 'h-2',
      type: 'qr',
      subType: 'URL',
      value: 'https://pizzakhallessi.com',
      time: '11:23:54',
    },
    {
      id: 'h-3',
      type: 'barcode',
      subType: 'CODE128',
      value: 'ROMA-9847120',
      time: '10:15:32',
    },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  // Computar el texto real codificado en el QR según el tipo
  const getCompiledQrText = (): string => {
    switch (qrType) {
      case 'url':
        return urlValue.trim() || 'https://romaagencia.com';
      case 'whatsapp': {
        const cleanPhone = waPhone.replace(/[^\d+]/g, '');
        const msg = encodeURIComponent(waMessage);
        return `https://wa.me/${cleanPhone}${msg ? `?text=${msg}` : ''}`;
      }
      case 'telegram': {
        const cleanUser = tgUsername.replace('@', '').trim();
        return `https://t.me/${cleanUser}`;
      }
      case 'email':
        return `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      case 'event': {
        const s = eventStart.replace(/[-:]/g, '');
        const e = eventEnd.replace(/[-:]/g, '');
        return `BEGIN:VEVENT\nSUMMARY:${eventTitle}\nLOCATION:${eventLocation}\nDTSTART:${s}00Z\nDTEND:${e}00Z\nEND:VEVENT`;
      }
      case 'wifi':
        return `WIFI:S:${wifiSsid};T:${wifiEncryption};P:${wifiPass};H:${wifiHidden ? 'true' : 'false'};;`;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nN:${vcardLast};${vcardFirst};;;\nFN:${vcardFirst} ${vcardLast}\nORG:${vcardOrg}\nTITLE:${vcardTitle}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nURL:${vcardWeb}\nEND:VCARD`;
      case 'geo':
        return `geo:${geoLat},${geoLng}?q=${geoLat},${geoLng}`;
      case 'text':
      default:
        return textFree || 'Roma Studio';
    }
  };

  // Renderizar QR en el Canvas
  const renderQrCode = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rawText = getCompiledQrText();
    const scaleFactor = exportQuality === '4x' ? 4 : exportQuality === '2x' ? 2 : 1;
    const baseSize = 400 * scaleFactor;

    try {
      // 1. Generar código QR básico
      await QRCode.toCanvas(canvas, rawText, {
        width: baseSize,
        margin: qrFrame !== 'none' ? 4 : 2,
        errorCorrectionLevel: qrErrorCorrection,
        color: {
          dark: qrColorPrimary,
          light: qrTransparentBg ? '#00000000' : qrColorBg,
        },
      });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 2. Si tiene logo central, dibujarlo en el centro con recuadro protector
      if (qrLogoUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = qrLogoUrl;
        img.onload = () => {
          const logoPixelSize = (baseSize * (qrLogoSize / 100));
          const x = (baseSize - logoPixelSize) / 2;
          const y = (baseSize - logoPixelSize) / 2;

          // Fondo blanco redondeado para que el logo no se mezcle con los puntos
          const pad = 8 * scaleFactor;
          ctx.fillStyle = qrTransparentBg ? '#FFFFFF' : qrColorBg;
          ctx.beginPath();
          ctx.roundRect(x - pad, y - pad, logoPixelSize + pad * 2, logoPixelSize + pad * 2, 12 * scaleFactor);
          ctx.fill();

          ctx.strokeStyle = qrColorPrimary;
          ctx.lineWidth = 2 * scaleFactor;
          ctx.stroke();

          // Dibujar imagen centrada
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, logoPixelSize, logoPixelSize, 8 * scaleFactor);
          ctx.clip();
          ctx.drawImage(img, x, y, logoPixelSize, logoPixelSize);
          ctx.restore();
        };
      }

      // 3. Si tiene marco superior o inferior con texto
      if (qrFrame === 'scan_me_bottom' || qrFrame === 'scan_me_top') {
        const frameHeight = 44 * scaleFactor;
        ctx.fillStyle = qrColorPrimary;
        const fy = qrFrame === 'scan_me_bottom' ? baseSize - frameHeight : 0;
        ctx.fillRect(0, fy, baseSize, frameHeight);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${16 * scaleFactor}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(qrFrameText || 'ESCANÉAME', baseSize / 2, fy + frameHeight / 2);
      }
    } catch (err) {
      console.error('Error al generar QR:', err);
    }
  };

  // Renderizar Código de Barras en SVG / Canvas
  const renderBarcode = () => {
    if (!barcodeSvgRef.current) return;
    try {
      JsBarcode(barcodeSvgRef.current, barcodeValue || '00000000', {
        format: barcodeFormat,
        lineColor: barcodeColor,
        background: barcodeTransparentBg ? 'transparent' : barcodeBg,
        width: barcodeWidth,
        height: barcodeHeight,
        displayValue: barcodeShowText,
        fontSize: 14,
        margin: 10,
      });
    } catch (err) {
      console.warn('Error en formato de código de barras:', err);
    }
  };

  useEffect(() => {
    if (activeMode === 'qr') {
      renderQrCode();
    } else {
      renderBarcode();
    }
  }, [
    activeMode,
    qrType,
    urlValue,
    waPhone,
    waMessage,
    tgUsername,
    emailTo,
    emailSubject,
    emailBody,
    eventTitle,
    eventLocation,
    eventStart,
    eventEnd,
    wifiSsid,
    wifiPass,
    wifiEncryption,
    wifiHidden,
    vcardFirst,
    vcardLast,
    vcardOrg,
    vcardTitle,
    vcardPhone,
    vcardEmail,
    vcardWeb,
    geoLat,
    geoLng,
    textFree,
    qrColorPrimary,
    qrColorBg,
    qrTransparentBg,
    qrDotStyle,
    qrCornerStyle,
    qrErrorCorrection,
    qrFrame,
    qrFrameText,
    qrLogoUrl,
    qrLogoSize,
    exportQuality,
    barcodeFormat,
    barcodeValue,
    barcodeShowText,
    barcodeColor,
    barcodeBg,
    barcodeTransparentBg,
    barcodeHeight,
    barcodeWidth,
  ]);

  // Manejar subida de logo central
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setQrLogoUrl(event.target?.result as string);
      toast({
        title: 'Logo cargado',
        description: 'El logo central se añadió al código QR.',
        variant: 'default',
      });
    };
    reader.readAsDataURL(file);
  };

  // Copiar valor de texto del código
  const handleCopyText = () => {
    const textToCopy = activeMode === 'qr' ? getCompiledQrText() : barcodeValue;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSuccess(true);
    toast({
      title: 'Texto copiado',
      description: 'El contenido del código se copió al portapapeles.',
      variant: 'default',
    });
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Descargar PNG en alta calidad
  const handleDownloadPng = () => {
    if (activeMode === 'qr') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `codigo-qr-${Date.now()}.png`;
      a.click();
      recordHistory('qr', qrType.toUpperCase(), getCompiledQrText());
    } else {
      const svg = barcodeSvgRef.current;
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      img.onload = () => {
        canvas.width = img.width * (exportQuality === '4x' ? 4 : exportQuality === '2x' ? 2 : 1);
        canvas.height = img.height * (exportQuality === '4x' ? 4 : exportQuality === '2x' ? 2 : 1);
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `codigo-barras-${barcodeFormat}-${Date.now()}.png`;
        a.click();
        recordHistory('barcode', barcodeFormat, barcodeValue);
      };
    }
  };

  // Descargar SVG Vectorial
  const handleDownloadSvg = async () => {
    if (activeMode === 'qr') {
      try {
        const svgString = await QRCode.toString(getCompiledQrText(), {
          type: 'svg',
          errorCorrectionLevel: qrErrorCorrection,
          color: {
            dark: qrColorPrimary,
            light: qrTransparentBg ? '#00000000' : qrColorBg,
          },
        });
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `codigo-qr-vector-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        toast({ title: 'Error', description: 'No se pudo generar el vector SVG', variant: 'destructive' });
      }
    } else {
      const svg = barcodeSvgRef.current;
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codigo-barras-${barcodeFormat}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Descargar PDF Folleto Imprimible Profesional
  const handleDownloadPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let imgSrc = '';
    if (activeMode === 'qr' && canvasRef.current) {
      imgSrc = canvasRef.current.toDataURL('image/png');
    } else if (barcodeSvgRef.current) {
      const svgData = new XMLSerializer().serializeToString(barcodeSvgRef.current);
      imgSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }

    const title = activeMode === 'qr' ? 'CÓDIGO QR OFICIAL' : `CÓDIGO DE BARRAS ${barcodeFormat}`;
    const value = activeMode === 'qr' ? getCompiledQrText() : barcodeValue;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Roma Studio</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; color: #0f172a; padding: 40px; }
            .card { max-width: 480px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 24px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
            .logo { font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #4f46e5; margin-bottom: 24px; }
            .code-img { width: 300px; height: auto; margin: 0 auto 24px auto; display: block; }
            .title { font-size: 18px; font-weight: 800; margin-bottom: 8px; }
            .desc { font-size: 12px; color: #64748b; word-break: break-all; margin-bottom: 24px; }
            .footer { font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">ROMA STUDIO</div>
            <img src="${imgSrc}" class="code-img" />
            <div class="title">${title}</div>
            <div class="desc">${value}</div>
            <div class="footer">Generado con Roma Agency Workspace Studio • Uso comercial y publicitario</div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Copiar imagen al portapapeles
  const handleCopyImage = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
          toast({
            title: 'Imagen copiada',
            description: 'Código copiado como imagen para pegar en WhatsApp o Canva.',
            variant: 'default',
          });
        });
      });
    } catch {
      toast({
        title: 'Navegador no compatible',
        description: 'Usa "Descargar PNG" para guardar la imagen.',
        variant: 'destructive',
      });
    }
  };

  // Registrar en historial
  const recordHistory = (type: 'qr' | 'barcode', subType: string, value: string) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const newEntry: CodeHistoryEntry = {
      id: `h-${Date.now()}`,
      type,
      subType,
      value,
      time: timeStr,
    };
    setHistory((prev) => [newEntry, ...prev.slice(0, 19)]);
  };

  // Generador inteligente de código de barras
  const handleGenerateSmartBarcode = () => {
    const generated = generateSmartBarcode(barcodeFormat, barcodePrefix);
    setBarcodeValue(generated);
    toast({
      title: 'Código Inteligente Creado',
      description: `${barcodeFormat}: ${generated} (Checksum verificado)`,
      variant: 'default',
    });
  };

  // Generación Masiva por Lote
  const handleRunBatchGeneration = () => {
    const list = generateBatchBarcodes(barcodeFormat, barcodePrefix, batchCount, batchMode);
    setGeneratedBatch(list);
    setIsBatchModalOpen(true);
  };

  // Exportar Hoja de Etiquetas A4 para imprimir
  const handlePrintBatchStickers = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lote de Etiquetas - ${barcodeFormat}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: sans-serif; margin: 0; padding: 0; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; }
            .sticker { border: 1px dashed #cbd5e1; padding: 4mm; text-align: center; border-radius: 4mm; page-break-inside: avoid; }
            .sticker-title { font-size: 10px; font-weight: bold; margin-bottom: 2mm; color: #475569; }
            svg { width: 100% !important; max-height: 25mm; }
          </style>
        </head>
        <body>
          <div class="grid">
            ${generatedBatch
              .map(
                (item, idx) => `
              <div class="sticker">
                <div class="sticker-title">${item.label || `Ítem #${idx + 1}`} - ${item.code}</div>
                <svg id="barcode-${idx}"></svg>
              </div>
            `
              )
              .join('')}
          </div>
          <script>
            window.onload = () => {
              ${generatedBatch
                .map(
                  (item, idx) => `
                JsBarcode("#barcode-${idx}", "${item.code}", {
                  format: "${item.format}",
                  width: 1.5,
                  height: 40,
                  displayValue: true,
                  fontSize: 10
                });
              `
                )
                .join('')}
              setTimeout(() => { window.print(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Exportar CSV del lote
  const handleExportBatchCsv = () => {
    const header = 'ID,Formato,Código,Etiqueta\n';
    const rows = generatedBatch.map((b) => `${b.id},${b.format},${b.code},"${b.label || ''}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lote-codigos-${barcodeFormat}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ===================================================================== */}
      {/* 1. SELECTOR SUPERIOR: CÓDIGO QR / CÓDIGO DE BARRAS (EXACTO A IMAGEN 2) */}
      {/* ===================================================================== */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveMode('qr')}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-xs ${
            activeMode === 'qr'
              ? 'bg-indigo-600 text-white shadow-indigo-500/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Código QR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('barcode')}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer shadow-xs ${
            activeMode === 'barcode'
              ? 'bg-indigo-600 text-white shadow-indigo-500/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Código de Barras</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 2. LAYOUT PRINCIPAL: PANEL DE CONFIGURACIÓN (IZQ) & PREVIEW (DER) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================== PANEL IZQUIERDO ==================== */}
        <div className="lg:col-span-5 space-y-5">
          {/* PANEL QR */}
          {activeMode === 'qr' ? (
            <>
              {/* SECCIÓN 1: TIPO Y FORMATO QR */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Tipo y Formato QR
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    Dinámico
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                    Contenido / Destino
                  </label>
                  <select
                    value={qrType}
                    onChange={(e) => setQrType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="url">Enlace / URL</option>
                    <option value="whatsapp">WhatsApp Directo</option>
                    <option value="telegram">Telegram</option>
                    <option value="email">Correo Electrónico</option>
                    <option value="event">Evento / Calendario</option>
                    <option value="wifi">Red Wi-Fi</option>
                    <option value="vcard">Contacto vCard</option>
                    <option value="geo">Geolocalización</option>
                    <option value="text">Texto Libre</option>
                  </select>
                </div>

                {/* Campos dinámicos según el tipo seleccionado */}
                {qrType === 'url' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">
                      Introduce el enlace (URL)
                    </label>
                    <div className="relative">
                      <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="url"
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        placeholder="https://romaagencia.com"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {qrType === 'whatsapp' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">
                        Número de Teléfono (con código de país)
                      </label>
                      <input
                        type="text"
                        value={waPhone}
                        onChange={(e) => setWaPhone(e.target.value)}
                        placeholder="+51987654321"
                        className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1">
                        Mensaje Predeterminado
                      </label>
                      <textarea
                        rows={2}
                        value={waMessage}
                        onChange={(e) => setWaMessage(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {qrType === 'telegram' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">
                      Usuario de Telegram (@usuario)
                    </label>
                    <input
                      type="text"
                      value={tgUsername}
                      onChange={(e) => setTgUsername(e.target.value)}
                      placeholder="romaagencia"
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {qrType === 'email' && (
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="correo@cliente.com"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Asunto"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                    <textarea
                      rows={2}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Cuerpo del mensaje"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                  </div>
                )}

                {qrType === 'wifi' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="Nombre de Red Wi-Fi (SSID)"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                    <input
                      type="text"
                      value={wifiPass}
                      onChange={(e) => setWifiPass(e.target.value)}
                      placeholder="Contraseña"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <select
                        value={wifiEncryption}
                        onChange={(e) => setWifiEncryption(e.target.value as any)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent"
                      >
                        <option value="WPA">WPA / WPA2 / WPA3</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">Sin Contraseña</option>
                      </select>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wifiHidden}
                          onChange={(e) => setWifiHidden(e.target.checked)}
                        />
                        <span>Red Oculta</span>
                      </label>
                    </div>
                  </div>
                )}

                {qrType === 'vcard' && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      value={vcardFirst}
                      onChange={(e) => setVcardFirst(e.target.value)}
                      placeholder="Nombre"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                    <input
                      type="text"
                      value={vcardLast}
                      onChange={(e) => setVcardLast(e.target.value)}
                      placeholder="Apellido"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                    <input
                      type="text"
                      value={vcardOrg}
                      onChange={(e) => setVcardOrg(e.target.value)}
                      placeholder="Empresa / Agencia"
                      className="col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                    <input
                      type="text"
                      value={vcardPhone}
                      onChange={(e) => setVcardPhone(e.target.value)}
                      placeholder="Teléfono"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                    <input
                      type="email"
                      value={vcardEmail}
                      onChange={(e) => setVcardEmail(e.target.value)}
                      placeholder="Email"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                  </div>
                )}

                {qrType === 'text' && (
                  <textarea
                    rows={3}
                    value={textFree}
                    onChange={(e) => setTextFree(e.target.value)}
                    placeholder="Escribe el texto libre..."
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent"
                  />
                )}
              </div>

              {/* SECCIÓN 2: PERSONALIZACIÓN QR (EXACTO A IMAGEN 2) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Personalización QR
                  </h3>
                </div>

                {/* Color Principal */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Color Principal
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={qrColorPrimary}
                      onChange={(e) => setQrColorPrimary(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={qrColorPrimary}
                      onChange={(e) => setQrColorPrimary(e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg text-xs font-mono font-bold border border-slate-200 dark:border-slate-800 text-center uppercase"
                    />
                  </div>
                </div>

                {/* Color Fondo */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                      Color Fondo
                    </span>
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer mt-0.5">
                      <input
                        type="checkbox"
                        checked={qrTransparentBg}
                        onChange={(e) => setQrTransparentBg(e.target.checked)}
                      />
                      <span>Transparente</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      disabled={qrTransparentBg}
                      value={qrColorBg}
                      onChange={(e) => setQrColorBg(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 disabled:opacity-30"
                    />
                    <input
                      type="text"
                      disabled={qrTransparentBg}
                      value={qrTransparentBg ? 'TRANSPARENT' : qrColorBg}
                      onChange={(e) => setQrColorBg(e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg text-xs font-mono font-bold border border-slate-200 dark:border-slate-800 text-center uppercase disabled:opacity-30"
                    />
                  </div>
                </div>

                {/* Nivel de Corrección */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Nivel Corrección
                  </span>
                  <select
                    value={qrErrorCorrection}
                    onChange={(e) => setQrErrorCorrection(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="L">L (7% Recuperación)</option>
                    <option value="M">M (15% Recuperación)</option>
                    <option value="Q">Q (25% Recuperación)</option>
                    <option value="H">H (30% Recomendado con logo)</option>
                  </select>
                </div>

                {/* Añadir Marco */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Añadir Marco
                  </span>
                  <select
                    value={qrFrame}
                    onChange={(e) => setQrFrame(e.target.value as any)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="none">Sin Marco</option>
                    <option value="scan_me_bottom">Marco Inferior (SCAN ME)</option>
                    <option value="scan_me_top">Marco Superior (ESCANÉAME)</option>
                  </select>
                </div>

                {qrFrame !== 'none' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      Texto del Marco
                    </label>
                    <input
                      type="text"
                      value={qrFrameText}
                      onChange={(e) => setQrFrameText(e.target.value)}
                      placeholder="ESCANÉAME"
                      className="w-full px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-transparent uppercase"
                    />
                  </div>
                )}
              </div>

              {/* SECCIÓN 3: LOGO CENTRAL (OPCIONAL) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Logo Central (Opcional)
                  </h3>
                  {qrLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setQrLogoUrl(null)}
                      className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
                    >
                      Quitar Logo
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/60 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Seleccionar archivo</span>
                  </button>
                  <span className="text-[11px] text-slate-400 truncate">
                    {qrLogoUrl ? 'Logo cargado ✓' : 'Ningún archivo seleccionado'}
                  </span>
                </div>

                {/* Presets rápidos de logos */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-400 block mb-2">
                    O elige un isotipo prediseñado:
                  </span>
                  <div className="flex items-center gap-2">
                    {[
                      {
                        name: 'WhatsApp',
                        url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
                      },
                      {
                        name: 'Instagram',
                        url: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
                      },
                      {
                        name: 'TikTok',
                        url: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png',
                      },
                      {
                        name: 'Web',
                        url: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png',
                      },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setQrLogoUrl(preset.url)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-white dark:bg-slate-800 cursor-pointer"
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-5 h-5 object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ==================== PANEL CÓDIGO DE BARRAS ==================== */
            <>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Formato de Código de Barras
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    Retail & Logística
                  </span>
                </div>

                {/* Selector de formato: Code 128, EAN 13, UPCA, Code 39 */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'CODE128', label: 'CODE 128', desc: 'Universal / Alfanumérico' },
                    { id: 'EAN13', label: 'EAN 13', desc: '13 dígitos (Retail internacional)' },
                    { id: 'UPCA', label: 'UPC-A', desc: '12 dígitos (Comercial / USA)' },
                    { id: 'CODE39', label: 'CODE 39', desc: 'Industrial / Inventarios' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => {
                        setBarcodeFormat(fmt.id as any);
                        if (fmt.id === 'EAN13') setBarcodeValue(formatOrFixEan13(barcodeValue));
                        if (fmt.id === 'UPCA') setBarcodeValue(formatOrFixUpcA(barcodeValue));
                      }}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        barcodeFormat === fmt.id
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold'
                      }`}
                    >
                      <span className="block text-xs">{fmt.label}</span>
                      <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                        {fmt.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Valor del Código */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Valor del Código de Barras
                  </label>
                  <input
                    type="text"
                    value={barcodeValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (barcodeFormat === 'EAN13') {
                        setBarcodeValue(v.replace(/\D/g, '').slice(0, 13));
                      } else if (barcodeFormat === 'UPCA') {
                        setBarcodeValue(v.replace(/\D/g, '').slice(0, 12));
                      } else {
                        setBarcodeValue(v);
                      }
                    }}
                    placeholder="Introduce el código..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-white"
                  />
                  {barcodeFormat === 'EAN13' && barcodeValue.length === 12 && (
                    <span className="text-[10px] text-indigo-600 font-bold mt-1 block">
                      Checksum calculado automático: {calculateEan13Checksum(barcodeValue)} (Total 13 dígitos)
                    </span>
                  )}
                </div>

                {/* Generador de Código Aleatorio Inteligente */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Generador Inteligente
                    </span>
                    <span className="text-[10px] text-slate-400">Prefijo personalizable</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-24 shrink-0">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        Prefijo
                      </label>
                      <input
                        type="text"
                        value={barcodePrefix}
                        onChange={(e) => setBarcodePrefix(e.target.value.replace(/\D/g, ''))}
                        placeholder="775"
                        className="w-full px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold border border-slate-200 dark:border-slate-800 text-center"
                        title="Prefijo inicial, ej: 775 para Perú"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateSmartBarcode}
                      className="flex-1 mt-3 px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generar Código Inteligente</span>
                    </button>
                  </div>
                </div>

                {/* Generaciones Masivas por Lote */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleRunBatchGeneration}
                    className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Generación Masiva por Lote (Imprimir Hoja)</span>
                  </button>
                </div>
              </div>

              {/* Personalización Estética de Barras */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-300">Mostrar número/texto</span>
                  <input
                    type="checkbox"
                    checked={barcodeShowText}
                    onChange={(e) => setBarcodeShowText(e.target.checked)}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600 dark:text-slate-300">Color de Barras</span>
                  <input
                    type="color"
                    value={barcodeColor}
                    onChange={(e) => setBarcodeColor(e.target.value)}
                    className="w-7 h-7 rounded border-0 p-0 cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ==================== PANEL DERECHO: CANVAS PREVIEW & EXPORT ==================== */}
        <div className="lg:col-span-7 space-y-5">
          {/* Tarjeta Canvas de Vista Previa (Exacto a Imagen 2) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col justify-between relative overflow-hidden">
            {/* Header del Preview */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  {activeMode === 'qr' ? `QR · ${qrType.toUpperCase()}` : `Barras · ${barcodeFormat}`}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {activeMode === 'qr'
                    ? `${getCompiledQrText().length} caracteres`
                    : `${barcodeValue.length} caracteres`}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                {copiedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>
            </div>

            {/* Canvas / SVG Render Central con fondo de cuadrícula punteada */}
            <div className="my-8 flex items-center justify-center p-6 sm:p-10 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 min-h-[340px]">
              {activeMode === 'qr' ? (
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto drop-shadow-md rounded-xl transition-all"
                  style={{ width: '280px', height: '280px' }}
                />
              ) : (
                <div className="bg-white p-6 rounded-2xl shadow-sm max-w-full overflow-x-auto">
                  <svg ref={barcodeSvgRef} className="max-w-full" />
                </div>
              )}
            </div>

            {/* OPCIONES DE EXPORTACIÓN (EXACTO A IMAGEN 2) */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Opciones de Exportación
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Calidad:</span>
                  <select
                    value={exportQuality}
                    onChange={(e) => setExportQuality(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="1x">1x (Estándar)</option>
                    <option value="2x">2x (Alta Definición)</option>
                    <option value="4x">4x (Ultra HD Imprenta)</option>
                  </select>
                </div>
              </div>

              {/* Botones de acción principales */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="px-3 py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  <span>SVG (Vector)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  <span>PDF (Folleto)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar Imagen</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors col-span-2 sm:col-span-1"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Compartir</span>
                </button>
              </div>
            </div>
          </div>

          {/* HISTORIAL RECIENTE (EXACTO A IMAGEN 2) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Historial Reciente
                </span>
                <span className="text-xs text-slate-400">({history.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-xs font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                Limpiar Historial
              </button>
            </div>

            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.type === 'qr') {
                      setActiveMode('qr');
                      setUrlValue(item.value);
                    } else {
                      setActiveMode('barcode');
                      setBarcodeValue(item.value);
                    }
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                      {item.type === 'qr' ? (
                        <QrCode className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Barcode className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {item.type.toUpperCase()} · {item.subType}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm">
                        {item.value}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 shrink-0 ml-3">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. MODAL DE GENERACIÓN MASIVA POR LOTE DE CÓDIGOS DE BARRA */}
      {/* ===================================================================== */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[88vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Generación Masiva por Lote
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lote de {generatedBatch.length} códigos ({barcodeFormat}) listos para imprimir o exportar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Controles de Lote */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Cantidad:</span>
                  {[5, 10, 20, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setBatchCount(num);
                        const list = generateBatchBarcodes(barcodeFormat, barcodePrefix, num, batchMode);
                        setGeneratedBatch(list);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        batchCount === num
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setBatchMode('sequential');
                      const list = generateBatchBarcodes(barcodeFormat, barcodePrefix, batchCount, 'sequential');
                      setGeneratedBatch(list);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      batchMode === 'sequential'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Secuencial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchMode('random');
                      const list = generateBatchBarcodes(barcodeFormat, barcodePrefix, batchCount, 'random');
                      setGeneratedBatch(list);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      batchMode === 'random'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Aleatorio
                  </button>
                </div>
              </div>

              {/* Grilla de Códigos Generados */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[48vh] overflow-y-auto pr-1">
                {generatedBatch.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-center space-y-1"
                  >
                    <span className="text-[10px] font-bold text-slate-400 block">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-mono font-black text-slate-900 dark:text-white block">
                      {item.code}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botones de Descarga del Lote */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleExportBatchCsv}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Descargar CSV</span>
              </button>
              <button
                type="button"
                onClick={handlePrintBatchStickers}
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Hoja de Etiquetas A4</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
