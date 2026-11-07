import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../../../context/AppContext';
import { RomitaMarkdownView } from '../../../../components/RomitaMarkdownView';
import {
  ArrowLeft,
  Bot,
  Sparkles,
  Send,
  Trash2,
  PlusCircle,
  Edit3,
  Check,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  MessageSquare,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  Layers,
  Search,
  Filter,
} from 'lucide-react';
import { PendingActionProposal, ChatMessage } from '../../../../components/RomitaAgentModal';

interface RomitaWorkspaceViewProps {
  onBackToHub: () => void;
}

interface ActionLogEntry {
  id: string;
  type: 'create' | 'update' | 'delete';
  module: string;
  title: string;
  description: string;
  payload: Record<string, any>;
  timestamp: string;
  user: string;
  status: string;
}

export const RomitaWorkspaceView: React.FC<RomitaWorkspaceViewProps> = ({ onBackToHub }) => {
  const { apiFetch, showToast, user, resolvedTheme } = useApp();
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');

  // Mensajes de chat
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem('roma_romita_chat_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }));
        }
      }
    } catch {}
    return [
      {
        id: 'welcome',
        role: 'assistant',
        text: `¡Hola ${user?.name ? user.name.split(' ')[0] : ''}! Soy **Romita**, tu asistente de IA dentro de **Workspace**. Puedo **crear clientes**, **asignar tareas**, **gestionar cotizaciones** o darte resúmenes y reportes detallados en tablas.`,
        timestamp: new Date(),
      },
    ];
  });

  // Historial de acciones ejecutadas
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem('roma_romita_action_history');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [activePendingAction, setActivePendingAction] = useState<PendingActionProposal | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'clients' | 'workspace_tasks' | 'quotes'>('all');
  const [historySearch, setHistorySearch] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const isDark = resolvedTheme === 'dark';

  // Guardar mensajes en localStorage y sincronizar
  useEffect(() => {
    try {
      localStorage.setItem('roma_romita_chat_history', JSON.stringify(messages));
      window.dispatchEvent(new CustomEvent('roma_romita_chat_updated', { detail: { source: 'workspace' } }));
    } catch {}
  }, [messages]);

  // Escuchar sincronización del modal flotante
  useEffect(() => {
    const handleChatSync = (e: any) => {
      if (e?.detail?.source === 'workspace') return;
      try {
        const stored = localStorage.getItem('roma_romita_chat_history');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setMessages(parsed.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })));
          }
        }
      } catch {}
    };

    const handleActionsSync = () => {
      try {
        const stored = localStorage.getItem('roma_romita_action_history');
        if (stored) setActionLogs(JSON.parse(stored));
      } catch {}
    };

    window.addEventListener('roma_romita_chat_updated', handleChatSync);
    window.addEventListener('roma_romita_actions_updated', handleActionsSync);
    return () => {
      window.removeEventListener('roma_romita_chat_updated', handleChatSync);
      window.removeEventListener('roma_romita_actions_updated', handleActionsSync);
    };
  }, []);

  // Auto-scroll al final del chat
  useEffect(() => {
    if (scrollRef.current && activeTab === 'chat') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, activePendingAction, activeTab]);

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
      const clean = text.replace(/[*_#`[\]()|]/g, ' ').replace(/\s+/g, ' ').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  const handleSendMessage = async (customText?: string) => {
    const query = (customText || prompt).trim();
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
          activeModule: 'workspace',
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

      // Guardar en bitácora de acciones
      const logEntry: ActionLogEntry = {
        id: action.id,
        type: action.type,
        module: action.module,
        title: action.title,
        description: action.description,
        payload: action.payload,
        timestamp: new Date().toISOString(),
        user: user?.name || 'Usuario',
        status: 'executed',
      };
      const updatedLogs = [logEntry, ...actionLogs.slice(0, 49)];
      setActionLogs(updatedLogs);
      localStorage.setItem('roma_romita_action_history', JSON.stringify(updatedLogs));
      window.dispatchEvent(new Event('roma_romita_actions_updated'));
    } catch (err: any) {
      showToast(err.message || 'Error al ejecutar acción', 'error');
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleClearHistory = () => {
    if (!window.confirm('¿Deseas reiniciar la conversación de Romita AI?')) return;
    const initialMsg: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      text: `Conversación reiniciada. ¿En qué te puedo ayudar hoy?`,
      timestamp: new Date(),
    };
    setMessages([initialMsg]);
    setActivePendingAction(null);
    localStorage.removeItem('roma_romita_chat_history');
    window.dispatchEvent(new CustomEvent('roma_romita_chat_updated', { detail: { source: 'workspace' } }));
    showToast('Conversación reiniciada', 'success');
  };

  const filteredLogs = actionLogs.filter((log) => {
    const matchFilter = historyFilter === 'all' || log.module === historyFilter;
    const matchSearch =
      !historySearch ||
      log.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      log.description.toLowerCase().includes(historySearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn">
      {/* CABECERA DEL SUBMÓDULO */}
      <div
        className="rounded-2xl border p-4 sm:p-6 shadow-xs transition-colors"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToHub}
              className="p-2 sm:p-2.5 rounded-xl border hover:bg-slate-500/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              style={{ borderColor: 'var(--app-border)' }}
              title="Volver al Workspace Hub"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  Workspace AI
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / Romita Copilot
                </span>
              </div>
              <h1
                className="text-lg sm:text-2xl font-black tracking-tight mt-0.5"
                style={{ color: 'var(--app-text)' }}
              >
                Romita AI & Historial Operativo
              </h1>
            </div>
          </div>

          {/* Selector de Pestañas y Acciones */}
          <div className="flex items-center gap-2">
            <div
              className="p-1 rounded-xl border flex items-center gap-1"
              style={{
                backgroundColor: 'var(--app-bg)',
                borderColor: 'var(--app-border)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat & Copilot</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Bitácora de Acciones ({actionLogs.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearHistory}
              className="p-2 rounded-xl border text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
              style={{ borderColor: 'var(--app-border)' }}
              title="Reiniciar chat de Romita"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: PESTAÑA CHAT */}
      {activeTab === 'chat' && (
        <div
          className="rounded-2xl border shadow-xs overflow-hidden flex flex-col h-[680px] transition-colors"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          {/* Barra de estado interna */}
          <div
            className="px-4 py-2.5 border-b flex items-center justify-between text-xs"
            style={{
              borderColor: 'var(--app-border)',
              backgroundColor: 'var(--app-bg)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs" style={{ color: 'var(--app-text)' }}>
                Romita AI
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
                Copilot Workspace
              </span>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-lg border font-medium bg-transparent cursor-pointer"
                style={{
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text)',
                }}
              >
                <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                <option value="romita-turbo">Motor Local ROMA</option>
              </select>

              <button
                type="button"
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  voiceEnabled
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title={voiceEnabled ? 'Voz activada' : 'Activar lectura por voz'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Área de mensajes con soporte Markdown & Tablas */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm scrollbar-thin"
            style={{ backgroundColor: 'var(--app-bg)' }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-3 leading-relaxed ${
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
                  <RomitaMarkdownView content={msg.text} />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                <span>Romita está pensando y analizando los datos...</span>
              </div>
            )}
          </div>

          {/* Tarjeta de Confirmación de Acción (Human-in-the-Loop) */}
          {activePendingAction && (
            <div
              className="mx-4 my-2 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor:
                  activePendingAction.type === 'delete'
                    ? 'rgba(244, 63, 94, 0.4)'
                    : 'rgba(56, 189, 248, 0.4)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    activePendingAction.type === 'delete'
                      ? 'bg-rose-500/10 text-rose-500'
                      : activePendingAction.type === 'create'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-amber-500/10 text-amber-500'
                  }`}
                >
                  {activePendingAction.type === 'delete' && <Trash2 className="w-5 h-5" />}
                  {activePendingAction.type === 'create' && <PlusCircle className="w-5 h-5" />}
                  {activePendingAction.type === 'update' && <Edit3 className="w-5 h-5" />}
                </div>

                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {activePendingAction.type}
                    </span>
                    <span className="text-xs sm:text-sm font-bold truncate" style={{ color: 'var(--app-text)' }}>
                      {activePendingAction.title}
                    </span>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--app-muted)' }}>
                    {activePendingAction.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={isExecutingAction}
                  onClick={() => setActivePendingAction(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  disabled={isExecutingAction}
                  onClick={() => handleExecutePendingAction(activePendingAction)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 text-white shadow-xs transition cursor-pointer ${
                    activePendingAction.type === 'delete'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {isExecutingAction ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Ejecutar Acción</span>
                </button>
              </div>
            </div>
          )}

          {/* Formulario de entrada limpio */}
          <div
            className="p-3 sm:p-4 border-t"
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
              className="flex items-center gap-2 rounded-2xl border px-3 py-2 transition focus-within:ring-2 focus-within:ring-sky-500/25"
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
                placeholder="Escribe una orden o consulta a Romita (ej: Crear cliente, crear tarea, dame una tabla resumen...)"
                className="flex-1 bg-transparent text-xs sm:text-sm focus:outline-none"
                style={{ color: 'var(--app-text)' }}
              />

              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={isListening ? 'Detener dictado' : 'Dictar por voz'}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                className="p-2 rounded-xl text-white transition disabled:opacity-40 cursor-pointer shrink-0"
                style={{
                  backgroundColor: 'var(--app-primary)',
                }}
                title="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL: PESTAÑA BITÁCORA DE ACCIONES */}
      {activeTab === 'history' && (
        <div
          className="rounded-2xl border shadow-xs p-5 sm:p-6 space-y-5 transition-colors"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--app-text)' }}>
                Bitácora de Acciones Ejecutadas por Romita
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Registro auditable de modificaciones y registros aplicados en el sistema mediante el agente.
              </p>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs"
                style={{
                  backgroundColor: 'var(--app-bg)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar en bitácora..."
                  className="bg-transparent focus:outline-none text-xs w-28 sm:w-44"
                  style={{ color: 'var(--app-text)' }}
                />
              </div>

              <select
                value={historyFilter}
                onChange={(e: any) => setHistoryFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-xl border bg-transparent font-medium cursor-pointer"
                style={{
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text)',
                }}
              >
                <option value="all">Todos los módulos</option>
                <option value="clients">Clientes</option>
                <option value="workspace_tasks">Tareas Workspace</option>
                <option value="quotes">Cotizaciones</option>
              </select>
            </div>
          </div>

          {/* Tabla de Acciones */}
          {filteredLogs.length > 0 ? (
            <div
              className="overflow-x-auto rounded-xl border border-[var(--app-border)] shadow-2xs"
              style={{ backgroundColor: 'var(--app-bg)' }}
            >
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--app-border)] bg-slate-500/10 font-bold" style={{ color: 'var(--app-text)' }}>
                    <th className="px-3.5 py-2.5">Fecha y Hora</th>
                    <th className="px-3.5 py-2.5">Tipo</th>
                    <th className="px-3.5 py-2.5">Módulo</th>
                    <th className="px-3.5 py-2.5">Acción</th>
                    <th className="px-3.5 py-2.5">Detalles</th>
                    <th className="px-3.5 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--app-border)]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString('es-ES', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            log.type === 'create'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : log.type === 'delete'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {log.type}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-medium" style={{ color: 'var(--app-text)' }}>
                        {log.module}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold" style={{ color: 'var(--app-text)' }}>
                        {log.title}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-400 max-w-xs truncate" title={log.description}>
                        {log.description}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ejecutada en DB</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="p-8 rounded-xl border border-dashed text-center space-y-2"
              style={{
                backgroundColor: 'var(--app-bg)',
                borderColor: 'var(--app-border)',
              }}
            >
              <History className="w-8 h-8 mx-auto text-slate-400" />
              <h3 className="text-sm font-bold" style={{ color: 'var(--app-text)' }}>
                No hay acciones registradas todavía
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Cuando apruebes y ejecutes acciones con Romita AI (como crear clientes o tareas), aparecerán aquí con su registro de auditoría.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
