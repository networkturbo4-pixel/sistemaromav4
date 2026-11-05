import React, { useState } from 'react';
import { Share2, X, Copy, Lock, ExternalLink, Send, Check } from 'lucide-react';
import { WorkspaceMonth } from '../../../../shared/types';

interface ShareMonthModalProps {
  isOpen: boolean;
  activeMonth: WorkspaceMonth | null;
  onClose: () => void;
  onSaveShareSettings: (requirePin: boolean, pinCode: string) => Promise<void>;
  toast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const ShareMonthModal: React.FC<ShareMonthModalProps> = ({
  isOpen,
  activeMonth,
  onClose,
  onSaveShareSettings,
  toast,
}) => {
  const [shareRequirePin, setShareRequirePin] = useState(activeMonth?.requirePin || false);
  const [sharePinCode, setSharePinCode] = useState(activeMonth?.publicPin || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !activeMonth) return null;

  const publicUrl = `${window.location.origin}?w=${activeMonth.publicToken || activeMonth.id}`;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveShareSettings(shareRequirePin, sharePinCode);
      toast('Configuración de enlace público guardada', 'success');
      onClose();
    } catch {
      toast('Error al guardar configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Compartir Vista Pública
              </h3>
              <p className="text-xs text-slate-400">{activeMonth.name} • Grilla de Aprobación</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Enlace Público */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Enlace Público del Mes
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 select-all font-mono"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast('Enlace copiado al portapapeles', 'success');
              }}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar</span>
            </button>
          </div>
        </div>

        {/* Switcher de PIN */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                  Proteger con PIN de acceso
                </h4>
                <p className="text-[11px] text-slate-400">
                  El cliente deberá ingresar este PIN para ver los posts
                </p>
              </div>
            </div>

            {/* Switcher Toggle Button */}
            <button
              type="button"
              onClick={() => setShareRequirePin(!shareRequirePin)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                shareRequirePin ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  shareRequirePin ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {shareRequirePin && (
            <div className="pt-2 animate-fadeIn">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Código PIN numérico (4 a 8 dígitos)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={sharePinCode}
                onChange={(e) => setSharePinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 1234"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono tracking-widest text-center text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Acciones del Modal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition text-slate-700 dark:text-slate-300"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir Vista</span>
          </a>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const text = `Hola! Aquí tienes la grilla de publicaciones de ${activeMonth.name}${shareRequirePin && sharePinCode ? ` (PIN de acceso: ${sharePinCode})` : ''}: ${publicUrl}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              }}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
