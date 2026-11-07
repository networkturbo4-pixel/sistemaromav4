import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RemoveFormatting,
  Bot,
  Wand2,
  CornerDownLeft,
  Check,
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
  const { toast, apiFetch } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const autocompleteTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const [htmlContent, setHtmlContent] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Estados de Romita AI
  const [showRomita, setShowRomita] = useState(false);
  const [romitaPrompt, setRomitaPrompt] = useState('');
  const [romitaTone, setRomitaTone] = useState<'formal' | 'amable' | 'comercial' | 'urgente'>('formal');
  const [generatingWithRomita, setGeneratingWithRomita] = useState(false);

  // Autocomplete con tecla TAB (Smart Compose)
  const [currentSuggestion, setCurrentSuggestion] = useState<string>('');
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);

  // Inicializar contenido en el editor
  useEffect(() => {
    if (isOpen && editorRef.current) {
      let initialHtml = '';
      if (initialReplyTo) {
        initialHtml = `<p><br/></p><p><br/></p><hr style="border:none;border-top:1px solid #cbd5e1;margin:16px 0;"/><p style="color:#64748b;font-size:12px;"><strong>El ${new Date(
          initialReplyTo.date
        ).toLocaleString()} &lt;${initialReplyTo.from}&gt; escribió:</strong></p><blockquote style="border-left:3px solid #3b82f6;padding-left:10px;margin-left:0;color:#475569;">${
          initialReplyTo.bodyHtml || initialReplyTo.snippet || ''
        }</blockquote>`;
      }
      editorRef.current.innerHTML = initialHtml;
      setHtmlContent(initialHtml);
    }
  }, [isOpen, initialReplyTo]);

  const handleEditorInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setHtmlContent(html);
      triggerAutocomplete(editorRef.current.innerText || '');
    }
  };

  // Autocompletado inteligente mientras el usuario escribe
  const triggerAutocomplete = useCallback(
    (plainText: string) => {
      if (autocompleteTimerRef.current) {
        clearTimeout(autocompleteTimerRef.current);
      }

      const trimmed = plainText.trim();
      if (trimmed.length < 5) {
        setCurrentSuggestion('');
        return;
      }

      autocompleteTimerRef.current = setTimeout(async () => {
        try {
          setIsFetchingSuggestion(true);
          const res: any = await apiFetch('/api/romita/autocomplete-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              textBefore: trimmed,
              subject: subject.trim(),
            }),
          });
          if (res && res.completion) {
            setCurrentSuggestion(res.completion);
          } else {
            setCurrentSuggestion('');
          }
        } catch {
          setCurrentSuggestion('');
        } finally {
          setIsFetchingSuggestion(false);
        }
      }, 400);
    },
    [apiFetch, subject]
  );

  // Insertar texto en el punto del cursor
  const insertTextAtCursor = (text: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorRef.current.innerHTML += text;
    }
    handleEditorInput();
  };

  // Aceptar sugerencia con TAB
  const handleAcceptSuggestion = () => {
    if (!currentSuggestion) return;
    insertTextAtCursor(currentSuggestion);
    setCurrentSuggestion('');
  };

  // Manejar eventos de teclado (TAB para autocompletar)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab' && currentSuggestion) {
      e.preventDefault();
      handleAcceptSuggestion();
      return;
    }
    if (e.key === 'Escape' && currentSuggestion) {
      setCurrentSuggestion('');
      return;
    }
  };

  // Generar correo con Romita AI
  const handleGenerateWithRomita = async (customAction = 'compose') => {
    if (!romitaPrompt.trim() && !subject.trim() && customAction === 'compose') {
      toast('Escribe una breve instrucción para Romita (ej: Cobrar factura, Enviar propuesta...)', 'info');
      return;
    }

    setGeneratingWithRomita(true);
    try {
      const plainText = editorRef.current?.innerText || '';
      const res: any = await apiFetch('/api/romita/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: romitaPrompt.trim(),
          tone: romitaTone,
          recipient: to.trim(),
          currentSubject: subject.trim(),
          existingBody: plainText,
          action: customAction,
        }),
      });

      if (res && res.success) {
        if (res.subject && !subject.trim()) {
          setSubject(res.subject);
        }
        if (res.bodyHtml && editorRef.current) {
          editorRef.current.innerHTML = res.bodyHtml;
          setHtmlContent(res.bodyHtml);
          editorRef.current.focus();
        }
        toast('Correo redactado exitosamente por Romita AI ✨', 'success');
        setShowRomita(false);
        setRomitaPrompt('');
      } else {
        throw new Error(res?.error || 'No se pudo generar el correo');
      }
    } catch (err: any) {
      toast(err.message || 'Error al conectar con Romita AI', 'error');
    } finally {
      setGeneratingWithRomita(false);
    }
  };

  // Ejecutar comando de estilo en el texto
  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleEditorInput();
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Ingresa la URL del enlace (ej: https://romaagencia.com):');
    if (url) {
      execCmd('createLink', url.startsWith('http') ? url : `https://${url}`);
    }
  };

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
    let tplHtml = '';
    if (type === 'quote') {
      setSubject((prev) => prev || 'Propuesta de Servicios - Agencia Roma');
      tplHtml = `
        <p>Estimado/a cliente,</p>
        <p>Es un placer saludarte. Adjunto a este mensaje encontrarás la <strong>propuesta detallada</strong> con los alcances del servicio y la cotización correspondiente.</p>
        <p>Quedamos a tu entera disposición para resolver cualquier duda o coordinar una llamada de revisión.</p>
        <p>Saludos cordiales,<br/><strong>Equipo Agencia Roma</strong></p>
      `;
    } else if (type === 'followup') {
      setSubject((prev) => prev || 'Seguimiento de Proyecto / Estado de Avance');
      tplHtml = `
        <p>Hola,</p>
        <p>Te escribimos para comentarte que tu proyecto se encuentra en <strong>progreso activo</strong> según el cronograma acordado. Estamos ultimando los detalles visuales de la siguiente entrega.</p>
        <p>¡Seguimos en constante comunicación!</p>
        <p>Atentamente,<br/><strong>Agencia Roma</strong></p>
      `;
    } else if (type === 'welcome') {
      setSubject((prev) => prev || '¡Bienvenido/a a la Agencia Roma!');
      tplHtml = `
        <p>¡Bienvenido/a a bordo!</p>
        <p>Estamos muy emocionados de comenzar a colaborar contigo. Tu panel y accesos a las carpetas del proyecto han sido configurados correctamente.</p>
        <p>Cualquier consulta o requerimiento no dudes en responder directamente a este correo.</p>
        <p>Un cordial saludo,<br/><strong>Dirección de Cuentas</strong></p>
      `;
    }

    if (editorRef.current) {
      editorRef.current.innerHTML = tplHtml;
      setHtmlContent(tplHtml);
      editorRef.current.focus();
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

    const currentHtml = editorRef.current?.innerHTML || htmlContent;
    const plainText = editorRef.current?.innerText || '';

    if (!plainText.trim() && !currentHtml.trim()) {
      toast('El cuerpo del correo no puede estar vacío', 'error');
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
      formData.append('bodyText', plainText);
      formData.append('bodyHtml', currentHtml);

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

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-200 ${
        isMinimized
          ? 'bottom-24 right-4 sm:bottom-6 sm:right-6 w-72 sm:w-80'
          : 'inset-0 sm:inset-x-auto sm:inset-y-auto sm:bottom-6 sm:right-6 sm:w-[720px] max-w-full'
      }`}
    >
      <div className="bg-white dark:bg-slate-900 sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh]">
        {/* Cabecera */}
        <div className="px-4 py-3 bg-slate-900 text-white dark:bg-slate-950 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2 text-xs font-semibold truncate">
            <Send className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="truncate">
              {subject.trim() ? subject : 'Redactar Correo'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botón Romita AI en cabecera */}
            <button
              type="button"
              onClick={() => setShowRomita(!showRomita)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Bot className="w-3.5 h-3.5 text-sky-200" />
              <span>Romita AI</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="hidden sm:inline-flex p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title={isMinimized ? 'Maximizar' : 'Minimizar'}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Contenido (oculto si minimizado) */}
        {!isMinimized && (
          <form onSubmit={handleSend} className="p-3 sm:p-4 flex flex-col flex-1 overflow-y-auto space-y-3">
            {/* Panel Desplegable de Romita AI */}
            {showRomita && (
              <div className="bg-gradient-to-br from-indigo-50/80 via-blue-50/60 to-purple-50/80 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-purple-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-3 sm:p-4 space-y-2.5 animate-scaleIn shadow-xs shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Romita Copilot de Redacción</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRomita(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={romitaPrompt}
                    onChange={(e) => setRomitaPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGenerateWithRomita('compose'))}
                    placeholder="¿Qué deseas redactar? (ej: Enviar cotización con 10% de descuento, cobro cordial...)"
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <select
                    value={romitaTone}
                    onChange={(e: any) => setRomitaTone(e.target.value)}
                    className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700/60 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                  >
                    <option value="formal">👔 Formal</option>
                    <option value="amable">🤝 Amable</option>
                    <option value="comercial">🚀 Comercial</option>
                    <option value="urgente">⚡ Urgente</option>
                  </select>
                </div>

                {/* Acciones Rápidas con Romita */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setRomitaPrompt('Cobro formal y cordial de factura pendiente');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-800 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-indigo-100 dark:border-indigo-900 font-medium"
                    >
                      💼 Cobro
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRomitaPrompt('Propuesta de servicios con llamado a reunión');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-800 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-indigo-100 dark:border-indigo-900 font-medium"
                    >
                      📄 Cotización
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRomitaPrompt('Seguimiento de entrega y estatus de avance');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-800 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-indigo-100 dark:border-indigo-900 font-medium"
                    >
                      🤝 Seguimiento
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateWithRomita('improve')}
                      className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 hover:bg-amber-100 transition-colors cursor-pointer border border-amber-200 dark:border-amber-800 font-medium flex items-center gap-1"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Pulir borrador actual</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateWithRomita('compose')}
                    disabled={generatingWithRomita}
                    className="px-3.5 py-1.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ml-auto"
                  >
                    {generatingWithRomita ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>Generar con Romita</span>
                  </button>
                </div>
              </div>
            )}

            {/* Selector de Remitente (De:) */}
            {accounts.length > 1 && (
              <div className="flex items-center gap-2 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="font-semibold text-slate-600 dark:text-slate-400 shrink-0">De:</span>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer truncate"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.senderName || acc.name} &lt;{acc.email}&gt;
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Destinatarios */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="font-semibold text-slate-500 w-12 shrink-0">Para:</span>
                <input
                  type="text"
                  required
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="destinatario@ejemplo.com"
                  className="flex-1 bg-transparent text-slate-900 dark:text-white focus:outline-hidden"
                />
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
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

              {/* Asunto */}
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

            {/* Plantillas Rápidas */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none text-[11px] shrink-0">
              <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3 text-amber-500" /> Plantillas:
              </span>
              <button
                type="button"
                onClick={() => handleInsertTemplate('quote')}
                className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 transition-colors shrink-0 cursor-pointer font-medium"
              >
                + Enviar Propuesta
              </button>
              <button
                type="button"
                onClick={() => handleInsertTemplate('followup')}
                className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50 transition-colors shrink-0 cursor-pointer font-medium"
              >
                + Seguimiento de Avance
              </button>
              <button
                type="button"
                onClick={() => handleInsertTemplate('welcome')}
                className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/50 transition-colors shrink-0 cursor-pointer font-medium"
              >
                + Bienvenida Cliente
              </button>
            </div>

            {/* Barra de Estilos de Texto (Rich Text Toolbar) */}
            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1.5 flex flex-wrap items-center gap-0.5 border border-slate-200 dark:border-slate-700/60 shrink-0 text-slate-700 dark:text-slate-300 select-none">
              <button
                type="button"
                onClick={() => execCmd('bold')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Negrita"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('italic')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Cursiva"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('underline')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Subrayado"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('strikeThrough')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Tachado"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => execCmd('formatBlock', '<h2>')}
                className="px-1.5 py-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                title="Encabezado 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => execCmd('formatBlock', '<h3>')}
                className="px-1.5 py-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                title="Encabezado 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => execCmd('formatBlock', '<p>')}
                className="px-1.5 py-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                title="Texto normal"
              >
                P
              </button>

              <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => execCmd('insertUnorderedList')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Lista con viñetas"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('insertOrderedList')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Lista numerada"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('formatBlock', '<blockquote>')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Cita"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => execCmd('justifyLeft')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Alinear izquierda"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyCenter')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Centrar"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('justifyRight')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Alinear derecha"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>

              <span className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={handleInsertLink}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Insertar enlace"
              >
                <Link2 className="w-3.5 h-3.5 text-blue-500" />
              </button>
              <button
                type="button"
                onClick={() => execCmd('removeFormat')}
                className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                title="Limpiar formato"
              >
                <RemoveFormatting className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Editor de Contenido WYSIWYG con Autocomplete de Tecla TAB */}
            <div className="flex-1 min-h-[180px] sm:min-h-[220px] flex flex-col relative">
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                onKeyDown={handleKeyDown}
                className="w-full flex-1 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden overflow-y-auto leading-relaxed font-sans prose dark:prose-invert max-w-none min-h-[160px]"
                style={{ outline: 'none' }}
              />

              {/* Banner / Sugerencia Flotante de Autorelleno con TAB */}
              {currentSuggestion && (
                <div
                  onClick={handleAcceptSuggestion}
                  className="mt-1.5 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs flex items-center justify-between gap-2 cursor-pointer shadow-xs animate-fadeIn hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                  title="Haz clic o presiona la tecla TAB para insertar"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-2xs">
                      Tab ↹
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 shrink-0 font-medium">Romita sugiere:</span>
                    <span className="font-semibold italic text-blue-900 dark:text-blue-100 truncate">
                      "{currentSuggestion.trim()}"
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Autorellenar</span>
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Adjuntos */}
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

            {/* Barra Inferior de Envío */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  <span>Adjuntar</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
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
