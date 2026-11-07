import React, { useState, useRef } from 'react';
import {
  X,
  Send,
  Paperclip,
  Trash2,
  FileText,
  Loader2,
  Sparkles,
  ChevronDown,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { WorkspaceEmailAccount, WorkspaceEmailMessage } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface EmailComposerModalProps {
  isOpen: boolean;
  accounts: WorkspaceEmailAccount[];
  currentAccountId?: string;
  initialReplyTo?: WorkspaceEmailMessage | null;
  onClose: () => void;
  onSent: () => void;
}

export const EmailComposerModal: React.FC<EmailComposerModalProps> = ({
  isOpen,
  accounts,
  currentAccountId,
  initialReplyTo,
  onClose,
  onSent,
}) => {
  const { toast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accountId, setAccountId] = useState<string>(() => {
    if (currentAccountId) return currentAccountId;
    const def = accounts.find((a) => a.isDefault);
    return def ? def.id : accounts[0]?.id || '';
  });

  const [to, setTo] = useState<string>(() => {
    if (initialReplyTo) return initialReplyTo.from;
    return '';
  });
  const [showCc, setShowCc] = useState(false);
  const [cc, setCc] = useState('');
  const [showBcc, setShowBcc] = useState(false);
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState<string>(() => {
    if (initialReplyTo) {
      return initialReplyTo.subject.startsWith('Re:')
        ? initialReplyTo.subject
        : `Re: ${initialReplyTo.subject}`;
    }
    return '';
  });
  const [body, setBody] = useState<string>(() => {
    if (initialReplyTo) {
      return `\n\n\n--- El ${new Date(initialReplyTo.date).toLocaleString()} <${initialReplyTo.from}> escribió: ---\n> ${initialReplyTo.snippet || ''}`;
    }
    return '';
  });
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInsertTemplate = (type: 'quote' | 'followup' | 'welcome') => {
    if (type === 'quote') {
      setSubject((prev) => prev || 'Propuesta de Servicios - Agencia Roma');
      setBody(
        (prev) =>
          prev +
          `\n\nEstimado/a cliente,\n\nEs un placer saludarte. Adjunto a este mensaje encontrarás la propuesta detallada con los alcances del servicio conversado.\n\nQuedamos a tu entera disposición para resolver cualquier duda o coordinar una llamada de revisión.\n\nSaludos cordiales,\n`
      );
    } else if (type === 'followup') {
      setSubject((prev) => prev || 'Seguimiento de Proyecto / Estado de Avance');
      setBody(
        (prev) =>
          prev +
          `\n\nHola,\n\nTe escribimos para comentarte que tu proyecto se encuentra en progreso según el cronograma acordado. Estamos ultimando los detalles visuales de la siguiente entrega.\n\n¡Seguimos en contacto!\n`
      );
    } else if (type === 'welcome') {
      setSubject((prev) => prev || '¡Bienvenido/a a la Agencia Roma!');
      setBody(
        (prev) =>
          prev +
          `\n\n¡Bienvenido/a a bordo!\n\nEstamos muy emocionados de comenzar a colaborar contigo. Tu panel y accesos han sido configurados correctamente.\n\nCualquier consulta no dudes en responder directamente a este correo.\n`
      );
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) {
      toast('Ingresa al menos un destinatario', 'error');
      return;
    }
    if (!subject.trim()) {
      toast('Ingresa un asunto', 'error');
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('roma_saas_token');
      const formData = new FormData();
      formData.append('accountId', accountId);
      formData.append('to', to);
      if (cc) formData.append('cc', cc);
      if (bcc) formData.append('bcc', bcc);
      formData.append('subject', subject);
      formData.append('bodyText', body);
      formData.append('bodyHtml', body.replace(/\n/g, '<br/>'));

      files.forEach((f) => {
        formData.append('attachments', f);
      });

      const res = await fetch('/api/workspace/emails/send', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar correo');
      }

      toast('Correo enviado exitosamente', 'success');
      onSent();
      onClose();
    } catch (err: any) {
      toast(err.message || 'No se pudo enviar el correo', 'error');
    } finally {
      setSending(false);
    }
  };

  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];

  return (
    <div
      className={`fixed z-50 transition-all duration-200 ${
        isMinimized
          ? 'bottom-4 right-4 w-72 sm:w-80'
          : 'inset-x-2 bottom-2 sm:bottom-6 sm:right-6 sm:inset-x-auto sm:w-[640px] max-w-full'
      }`}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 text-white dark:bg-slate-950 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2 text-xs font-semibold truncate">
            <Send className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="truncate">
              {subject.trim() ? subject : 'Mensaje Nuevo'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content (hidden if minimized) */}
        {!isMinimized && (
          <form onSubmit={handleSend} className="p-3 sm:p-4 flex flex-col flex-1 overflow-hidden space-y-3">
            {/* Account Selector */}
            {accounts.length > 1 && (
              <div className="flex items-center gap-2 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-semibold text-slate-600 dark:text-slate-400">De:</span>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.senderName || acc.name} &lt;{acc.email}&gt;
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Recipients */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="font-semibold text-slate-500 w-12 shrink-0">Para:</span>
                <input
                  type="text"
                  required
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="ej: cliente@gmail.com, contacto@empresa.com"
                  className="flex-1 bg-transparent text-slate-900 dark:text-white focus:outline-hidden"
                />
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="hover:text-blue-500 transition-colors cursor-pointer font-medium"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="hover:text-blue-500 transition-colors cursor-pointer font-medium"
                    >
                      Cco
                    </button>
                  )}
                </div>
              </div>

              {showCc && (
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 animate-fadeIn">
                  <span className="font-semibold text-slate-500 w-12 shrink-0">Cc:</span>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="Con copia a..."
                    className="flex-1 bg-transparent text-slate-900 dark:text-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCc(false);
                      setCc('');
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {showBcc && (
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 animate-fadeIn">
                  <span className="font-semibold text-slate-500 w-12 shrink-0">Cco:</span>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="Copia oculta..."
                    className="flex-1 bg-transparent text-slate-900 dark:text-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowBcc(false);
                      setBcc('');
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Subject */}
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="font-semibold text-slate-500 w-12 shrink-0">Asunto:</span>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Escribe el asunto del correo..."
                  className="flex-1 bg-transparent font-medium text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Quick Templates Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-[11px]">
              <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3 text-amber-500" /> Plantillas:
              </span>
              <button
                type="button"
                onClick={() => handleInsertTemplate('quote')}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 transition-colors shrink-0 cursor-pointer font-medium"
              >
                + Enviar Propuesta
              </button>
              <button
                type="button"
                onClick={() => handleInsertTemplate('followup')}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50 transition-colors shrink-0 cursor-pointer font-medium"
              >
                + Seguimiento de Avance
              </button>
              <button
                type="button"
                onClick={() => handleInsertTemplate('welcome')}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/50 transition-colors shrink-0 cursor-pointer font-medium"
              >
                + Bienvenida Cliente
              </button>
            </div>

            {/* Message Body */}
            <div className="flex-1 min-h-[160px] sm:min-h-[220px]">
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                className="w-full h-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
              />
            </div>

            {/* Attachments List */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs border border-blue-200 dark:border-blue-900"
                  >
                    <Paperclip className="w-3 h-3 shrink-0" />
                    <span className="max-w-[140px] truncate">{file.name}</span>
                    <span className="text-[10px] text-blue-500 font-mono">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(i)}
                      className="ml-1 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Footer Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  <span>Adjuntar archivos</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Enviar</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
