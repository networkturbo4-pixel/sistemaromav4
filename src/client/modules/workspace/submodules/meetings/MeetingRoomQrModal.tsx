import React, { useEffect, useState } from 'react';
import { X, QrCode, ExternalLink, Copy, Check, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';
import { WorkspaceMeetingRoom } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface MeetingRoomQrModalProps {
  room: WorkspaceMeetingRoom | null;
  onClose: () => void;
}

export const MeetingRoomQrModal: React.FC<MeetingRoomQrModalProps> = ({ room, onClose }) => {
  const { toast } = useApp();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (room?.meetUrl) {
      QRCode.toDataURL(room.meetUrl, { width: 320, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    } else {
      setQrDataUrl('');
    }
  }, [room]);

  if (!room) return null;

  const handleCopy = () => {
    if (!room.meetUrl) return;
    navigator.clipboard.writeText(room.meetUrl);
    setCopied(true);
    toast('Enlace copiado al portapapeles', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center space-y-4">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-xs"
              style={{ backgroundColor: room.color || '#0055ff' }}
            >
              <QrCode className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{room.name}</h4>
              <span className="text-[10px] font-mono text-slate-400">{room.code}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Display */}
        <div className="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Código QR de la sala" className="w-52 h-52 rounded-xl shadow-xs" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
              Generando código QR...
            </div>
          )}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
            <span>Escanea para unirte desde tu smartphone</span>
          </div>
        </div>

        {/* Enlace y acciones */}
        <div className="space-y-2">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate">
            {room.meetUrl || 'Enlace no configurado'}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!room.meetUrl}
              className="py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <a
              href={room.meetUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Meet</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
