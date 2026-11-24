import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Share2,
  Copy,
  Check,
  Lock,
  ExternalLink,
  MessageCircle,
  Bug,
  MessageSquare,
} from 'lucide-react';
import { SoftwareProject } from '../../../../../../shared/types';

interface SoftwareShareModalProps {
  isOpen: boolean;
  project: SoftwareProject | null;
  isSaving: boolean;
  onClose: () => void;
  onSaveSettings: (updates: Partial<SoftwareProject>) => Promise<void>;
}

export const SoftwareShareModal: React.FC<SoftwareShareModalProps> = ({
  isOpen,
  project,
  isSaving,
  onClose,
  onSaveSettings,
}) => {
  const [requirePin, setRequirePin] = useState(false);
  const [publicPin, setPublicPin] = useState('');
  const [allowClientComments, setAllowClientComments] = useState(true);
  const [allowClientBugReport, setAllowClientBugReport] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !project) return;
    setRequirePin(Boolean(project.requirePin));
    setPublicPin(project.publicPin || '');
    setAllowClientComments(project.allowClientComments !== false);
    setAllowClientBugReport(project.allowClientBugReport !== false);
    setCopied(false);
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const publicUrl = `${window.location.origin}/dev/${project.publicToken}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleWhatsAppShare = () => {
    const pinLine = requirePin && publicPin ? `\n🔐 PIN de acceso: *${publicPin}*` : '';
    const msg = `Hola! Aquí tienes el enlace en vivo del roadmap y avances de *${project.name}* (${project.totalProgress}% completado):\n\n🔗 ${publicUrl}${pinLine}\n\nDesde ahí podrás probar las entregas, dejar comentarios y aprobar cada hito.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      requirePin,
      publicPin: requirePin ? publicPin.trim() : '',
      allowClientComments,
      allowClientBugReport,
    });
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Compartir Roadmap Interactivo
              </h2>
              <p className="text-xs text-slate-500 truncate max-w-[260px]">{project.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* URL pública */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Enlace Público para el Cliente
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-600 dark:text-slate-300"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir Vista Pública
              </a>
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Enviar por WhatsApp
              </button>
            </div>
          </div>

          {/* Seguridad PIN */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Lock className="w-4 h-4 text-amber-500" />
                Proteger enlace con PIN de acceso
              </span>
              <input
                type="checkbox"
                checked={requirePin}
                onChange={(e) => setRequirePin(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
            </label>
            {requirePin && (
              <input
                type="text"
                value={publicPin}
                onChange={(e) => setPublicPin(e.target.value)}
                placeholder="Ej. 2026 o 1234"
                maxLength={12}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-sm font-mono font-bold tracking-widest"
              />
            )}
          </div>

          {/* Permisos del Cliente */}
          <div className="space-y-2.5">
            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <MessageSquare className="w-4 h-4 text-sky-500" />
                Permitir comentarios del cliente por hito
              </span>
              <input
                type="checkbox"
                checked={allowClientComments}
                onChange={(e) => setAllowClientComments(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Bug className="w-4 h-4 text-rose-500" />
                Permitir reportar observaciones QA / Bugs UAT
              </span>
              <input
                type="checkbox"
                checked={allowClientBugReport}
                onChange={(e) => setAllowClientBugReport(e.target.checked)}
                className="w-4 h-4 accent-indigo-600"
              />
            </label>
          </div>

          </div>

          <div className="shrink-0 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
