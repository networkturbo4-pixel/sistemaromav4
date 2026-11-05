import React, { useState } from 'react';
import { Service } from '../../../shared/types';
import { useApp } from '../../context/AppContext';
import {
  X,
  Copy,
  Check,
  MessageCircle,
  Share2,
  ExternalLink,
  QrCode,
  Sparkles,
} from 'lucide-react';

interface ShareServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
}

export const ShareServiceModal: React.FC<ShareServiceModalProps> = ({
  isOpen,
  onClose,
  service,
}) => {
  const { tenant, toast } = useApp();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen || !service) return null;

  // Enlace público del servicio
  const serviceSlug = service.seo?.slug || service.id;
  const baseUrl = window.location.origin;
  const publicUrl = `${baseUrl}/p/servicio/${serviceSlug}?tenant=${tenant.slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast('Enlace copiado al portapapeles', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast('No se pudo copiar el enlace', 'error');
    }
  };

  const handleShareWhatsApp = () => {
    const text = `¡Hola! Te comparto la información y propuesta del servicio: *${service.title}* de ${tenant.name}.\n\nPuedes ver todos los detalles, entregables y cotizar aquí:\n${publicUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: service.title,
          text: service.briefDescription || `Conoce más sobre ${service.title}`,
          url: publicUrl,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    publicUrl
  )}&color=0f172a&bgcolor=ffffff&qzone=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="tenant-surface tenant-border w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b tenant-border flex items-center justify-between bg-slate-500/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tenant-text">
                Compartir Servicio
              </h3>
              <p className="text-xs tenant-muted truncate max-w-xs">
                {service.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl tenant-muted hover:tenant-text hover:bg-slate-500/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Card preview preview */}
          <div className="p-3.5 rounded-2xl border tenant-border bg-slate-500/5 flex items-center gap-3">
            {service.coverImage ? (
              <img
                src={service.coverImage}
                alt={service.title}
                className="w-14 h-14 rounded-xl object-cover border tenant-border shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500">
                {service.categoryName || 'Servicio'}
              </span>
              <h4 className="font-extrabold text-xs sm:text-sm tenant-text truncate">
                {service.title}
              </h4>
              <p className="text-xs font-bold text-emerald-500">
                {service.currencySymbol}{' '}
                {service.basePrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Enlace Directo */}
          <div>
            <label className="block text-xs font-bold tenant-muted mb-1.5">
              Enlace Público del Servicio
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-mono border tenant-border bg-slate-500/5 tenant-text select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'text-white tenant-btn-primary shadow-sm'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Botones de acción rápida */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar por WhatsApp
            </button>

            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="p-3 rounded-2xl border tenant-border hover:bg-slate-500/10 font-bold text-xs tenant-text flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              {showQr ? 'Ocultar QR' : 'Mostrar QR'}
            </button>
          </div>

          {/* QR Code toggle */}
          {showQr && (
            <div className="p-4 rounded-2xl border tenant-border bg-white flex flex-col items-center justify-center animate-in zoom-in-95 duration-200">
              <img
                src={qrImageUrl}
                alt="Código QR del servicio"
                className="w-44 h-44 rounded-lg shadow-sm"
              />
              <p className="text-[11px] font-bold text-slate-600 mt-2 text-center">
                Escanea desde la cámara de tu celular para abrir directamente
              </p>
            </div>
          )}

          {/* Enlace abrir directo */}
          <div className="pt-2 flex items-center justify-between text-xs border-t tenant-border">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-violet-500 hover:underline flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir vista previa pública
            </a>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="font-semibold tenant-muted hover:tenant-text"
              >
                Más opciones...
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
