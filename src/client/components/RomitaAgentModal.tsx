import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Trash2,
  PlusCircle,
  Edit3,
  Check,
  ChevronDown,
  Minimize2,
  Maximize2,
  Bot,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export interface PendingActionProposal {
  id: string;
  type: 'create' | 'update' | 'delete';
  module: 'clients' | 'quotes' | 'workspace_tasks' | 'services';
  title: string;
  description: string;
  payload: Record<string, any>;
  permissionRequired: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  pendingAction?: PendingActionProposal | null;
  executed?: boolean;
}

interface RomitaAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: string;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', badge: 'Recomendado' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', badge: 'Rápido' },
  { id: 'romita-turbo', name: 'Motor Local ROMA', badge: 'Instantáneo' },
];

export const RomitaAgentModal: React.FC<RomitaAgentModalProps> = ({
  isOpen,
  onClose,
  activeModule,
}) => {
  const { apiFetch, showToast, user, resolvedTheme } = useApp();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: `¡Hola ${user?.name ? user.name.split(' ')[0] : ''}! Soy **Romita**, tu asistente de IA. Puedo **crear clientes**, **asignar tareas**, **gestionar cotizaciones** o darte resúmenes del sistema.`,
      timestamp: new Date(),
    },
  ]);

  const [activePendingAction, setActivePendingAction] = useState<PendingActionProposal | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const isDark = resolvedTheme === 'dark';

  // Auto-scroll al final
  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activePendingAction, isLoading, isMinimized]);

  // Enfocar input al abrir
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMinimized]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-ES';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      showToast('Reconocimiento de voz no soportado en este navegador.', 'warning');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error reconocimiento de voz:', err);
      }
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*#_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || prompt).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setIsLoading(true);

    try {
      const res = await apiFetch('/api/romita/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          activeModule,
          modelPreference: selectedModel,
        }),
      });

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        text: res.reply || 'He procesado tu solicitud.',
        timestamp: new Date(),
        pendingAction: res.pendingAction || null,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.pendingAction) {
        setActivePendingAction(res.pendingAction);
      }
      speakText(res.reply);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        text: `Lo siento, ocurrió un error: ${err.message || 'Error de conexión'}.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecutePendingAction = async (action: PendingActionProposal) => {
    setIsExecutingAction(true);
    try {
      const res = await apiFetch('/api/romita/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      showToast(res.message || 'Acción ejecutada correctamente', 'success');

      setMessages((prev) =>
        prev.map((m) =>
          m.pendingAction?.id === action.id ? { ...m, executed: true } : m
        )
      );

      setActivePendingAction(null);

      const confirmMsg: ChatMessage = {
        id: `conf_${Date.now()}`,
        role: 'assistant',
        text: `✅ **Operación completada:** ${action.title} ha sido registrado en la base de datos de ROMA.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);
      speakText('Operación completada con éxito.');

      window.dispatchEvent(new CustomEvent('roma-data-mutated', { detail: action }));
    } catch (err: any) {
      showToast(err.message || 'Error al ejecutar la acción', 'error');
    } finally {
      setIsExecutingAction(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Romita AI Assistant"
      className="fixed bottom-[88px] inset-x-3 max-w-md mx-auto sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:max-w-[calc(100vw-2.5rem)] z-50 pointer-events-auto select-none transition-all duration-200"
    >
      <div className="relative">
        
        {/* ========================================================
            EL HALO LUMINOSO ANIMADO (Adaptado a Modo Claro / Oscuro)
           ======================================================== */}
        <div
          className="absolute -inset-3 sm:-inset-4 pointer-events-none -z-10 animate-romita-halo transition-opacity duration-300"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse 70% 60% at 50% 115%, #0284c7 0%, #38bdf8 30%, #6366f1 65%, transparent 100%)'
              : 'radial-gradient(ellipse 70% 60% at 50% 115%, rgba(56, 189, 248, 0.45) 0%, rgba(99, 102, 241, 0.35) 40%, transparent 100%)',
            opacity: isDark ? 0.85 : 0.65,
          }}
        />

        {/* Aura secundaria sutil en la base */}
        <div
          className="absolute -bottom-3 left-1/4 right-1/4 h-12 pointer-events-none -z-10 blur-2xl opacity-60"
          style={{
            background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
          }}
        />

        {/* ========================================================
            CONTENEDOR PRINCIPAL FLOTANTE A LA DERECHA (DISEÑO ROMA)
           ======================================================== */}
        <div
          className="rounded-2xl border shadow-xl overflow-hidden flex flex-col transition-all duration-200"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
          }}
        >
          {/* HEADER MINIMALISTA: Título, Estado y Controles */}
          <div
            className="flex items-center justify-between px-3.5 py-2.5 border-b"
            style={{
              borderColor: 'var(--app-border)',
              backgroundColor: isDark
                ? 'color-mix(in srgb, var(--app-surface) 92%, white 8%)'
                : 'color-mix(in srgb, var(--app-surface) 94%, black 6%)',
            }}
          >
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 relative" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs tracking-tight flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  Romita AI
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  Copilot
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Voz */}
              <button
                type="button"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  voiceEnabled
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={voiceEnabled ? 'Voz activada' : 'Activar lectura por voz'}
              >
                {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Micrófono */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={isListening ? 'Escuchando... clic para parar' : 'Dictar por voz'}
              >
                {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>

              {/* Minimizar */}
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Cerrar */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
                title="Cerrar (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CUERPO DEL CHAT (Se oculta al minimizar) */}
          {!isMinimized && (
            <>
              {/* HISTORIAL DE MENSAJES */}
              <div
                ref={scrollRef}
                className="overflow-y-auto p-3.5 space-y-2.5 max-h-[185px] sm:max-h-[300px] text-xs scrollbar-thin"
                style={{
                  backgroundColor: 'var(--app-bg)',
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-xl px-3 py-2 leading-relaxed ${
                        msg.role === 'user'
                          ? 'text-white font-medium rounded-br-xs shadow-xs'
                          : 'rounded-bl-xs border shadow-2xs'
                      }`}
                      style={{
                        backgroundColor:
                          msg.role === 'user' ? 'var(--app-primary)' : 'var(--app-surface)',
                        borderColor:
                          msg.role === 'user' ? 'transparent' : 'var(--app-border)',
                        color: msg.role === 'user' ? '#ffffff' : 'var(--app-text)',
                      }}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
                    <span>Romita está procesando...</span>
                  </div>
                )}
              </div>

              {/* TARJETA DE CONFIRMACIÓN DE ACCIÓN (HUMAN-IN-THE-LOOP) */}
              {activePendingAction && (
                <div
                  className="mx-3 my-2 p-3 rounded-xl border flex items-center justify-between gap-2.5 shadow-sm animate-in fade-in"
                  style={{
                    backgroundColor: 'var(--app-surface)',
                    borderColor:
                      activePendingAction.type === 'delete'
                        ? 'rgba(244, 63, 94, 0.4)'
                        : 'rgba(56, 189, 248, 0.4)',
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        activePendingAction.type === 'delete'
                          ? 'bg-rose-500/10 text-rose-500'
                          : activePendingAction.type === 'create'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {activePendingAction.type === 'delete' && <Trash2 className="w-4 h-4" />}
                      {activePendingAction.type === 'create' && <PlusCircle className="w-4 h-4" />}
                      {activePendingAction.type === 'update' && <Edit3 className="w-4 h-4" />}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {activePendingAction.type}
                        </span>
                        <span className="text-xs font-bold truncate" style={{ color: 'var(--app-text)' }}>
                          {activePendingAction.title}
                        </span>
                      </div>
                      <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--app-muted)' }}>
                        {activePendingAction.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isExecutingAction}
                      onClick={() => setActivePendingAction(null)}
                      className="px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                      Descartar
                    </button>
                    <button
                      type="button"
                      disabled={isExecutingAction}
                      onClick={() => handleExecutePendingAction(activePendingAction)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 text-white shadow-xs transition cursor-pointer ${
                        activePendingAction.type === 'delete'
                          ? 'bg-rose-600 hover:bg-rose-500'
                          : 'bg-emerald-600 hover:bg-emerald-500'
                      }`}
                    >
                      {isExecutingAction ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span>Ejecutar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CHIPS DE ACCIÓN RÁPIDA */}
              <div
                className="px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto text-[10px] border-t scrollbar-none"
                style={{
                  borderColor: 'var(--app-border)',
                  backgroundColor: 'var(--app-surface)',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSendMessage('Crear nuevo cliente corporativo')}
                  className="px-2 py-0.5 rounded-md border text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition shrink-0 cursor-pointer"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  + Cliente
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Crear tarea urgente: Revisar contrato')}
                  className="px-2 py-0.5 rounded-md border text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition shrink-0 cursor-pointer"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  + Tarea
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Dame un resumen de cotizaciones y clientes')}
                  className="px-2 py-0.5 rounded-md border text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition shrink-0 cursor-pointer"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  📊 Resumen
                </button>
              </div>

              {/* BARRA DE ENTRADA (PROMPT BOX) */}
              <div
                className="p-2.5 border-t"
                style={{
                  borderColor: 'var(--app-border)',
                  backgroundColor: 'var(--app-surface)',
                }}
              >
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-1.5 rounded-xl border px-2.5 py-1 transition focus-within:ring-2 focus-within:ring-sky-500/25"
                  style={{
                    backgroundColor: 'var(--app-bg)',
                    borderColor: 'var(--app-border)',
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Escribe una orden o consulta... (Ctrl+J)"
                    className="w-full bg-transparent text-xs py-1 focus:outline-none placeholder-slate-400"
                    style={{ color: 'var(--app-text)' }}
                  />

                  <button
                    type="submit"
                    disabled={!prompt.trim() || isLoading}
                    className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                      prompt.trim() && !isLoading
                        ? 'text-white'
                        : 'text-slate-400 cursor-not-allowed opacity-50'
                    }`}
                    style={{
                      backgroundColor: prompt.trim() && !isLoading ? 'var(--app-primary)' : 'transparent',
                    }}
                    title="Enviar a Romita"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* PILL INFERIOR DE STATUS & MODELO */}
                <div className="mt-2 flex items-center justify-between text-[11px] px-1 relative">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowModelMenu(!showModelMenu)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium transition cursor-pointer"
                      style={{
                        backgroundColor: 'var(--app-bg)',
                        borderColor: 'var(--app-border)',
                        color: 'var(--app-muted)',
                      }}
                    >
                      <Sparkles className="w-3 h-3 text-sky-500" />
                      <span>
                        {AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name || 'Gemini 3.8 Flash'}
                      </span>
                      <ChevronDown className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                    </button>

                    {showModelMenu && (
                      <div
                        className="absolute bottom-full mb-1 left-0 w-56 rounded-xl border shadow-xl p-1 z-30 animate-in fade-in"
                        style={{
                          backgroundColor: 'var(--app-surface)',
                          borderColor: 'var(--app-border)',
                        }}
                      >
                        {AVAILABLE_MODELS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m.id);
                              setShowModelMenu(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                              selectedModel === m.id
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold'
                                : 'hover:bg-slate-500/10 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <span>{m.name}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-500/10 opacity-70">
                              {m.badge}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Turbo
                    </span>
                    <kbd
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono border"
                      style={{
                        backgroundColor: 'var(--app-bg)',
                        borderColor: 'var(--app-border)',
                      }}
                    >
                      Ctrl+J
                    </kbd>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
