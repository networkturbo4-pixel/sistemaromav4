import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Send,
  FileText,
  Star,
  Trash2,
  AlertOctagon,
  Search,
  RefreshCw,
  Plus,
  Settings,
  Mail,
  ChevronLeft,
  Paperclip,
  Reply,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  Clock,
  User,
  ShieldCheck,
} from 'lucide-react';
import {
  WorkspaceEmailAccount,
  WorkspaceEmailMessage,
  EmailFolder,
} from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';
import { EmailConfigModal } from './EmailConfigModal';
import { EmailComposerModal } from './EmailComposerModal';

interface EmailsSubmoduleViewProps {
  onBackToHub?: () => void;
}

export const EmailsSubmoduleView: React.FC<EmailsSubmoduleViewProps> = ({ onBackToHub }) => {
  const { toast, confirmAction, apiFetch } = useApp();

  // Estados de datos
  const [accounts, setAccounts] = useState<WorkspaceEmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [currentFolder, setCurrentFolder] = useState<EmailFolder>('inbox');
  const [messages, setMessages] = useState<WorkspaceEmailMessage[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<WorkspaceEmailMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Estados de interfaz y búsqueda
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Modales
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<WorkspaceEmailAccount> | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState<WorkspaceEmailMessage | null>(null);

  // Cargar cuentas configuradas
  const loadAccounts = useCallback(async () => {
    try {
      const res: any = await apiFetch('/api/workspace/emails/accounts');
      if (res && res.success) {
        setAccounts(res.accounts || []);
        if (res.accounts && res.accounts.length > 0) {
          const defaultAcc = res.accounts.find((a: WorkspaceEmailAccount) => a.isDefault) || res.accounts[0];
          setSelectedAccountId((prev) => prev || defaultAcc.id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching email accounts:', err);
    }
  }, [apiFetch]);

  // Cargar mensajes con filtros
  const loadMessages = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const queryParams = new URLSearchParams();
        if (selectedAccountId) queryParams.set('accountId', selectedAccountId);
        queryParams.set('folder', currentFolder);
        if (search.trim()) queryParams.set('search', search.trim());
        if (refresh) queryParams.set('refresh', 'true');

        const res: any = await apiFetch(`/api/workspace/emails/messages?${queryParams.toString()}`);
        if (res && res.success) {
          setMessages(res.messages || []);
          setUnreadCount(res.unreadCount || 0);

          if (res.syncError) {
            toast(`Sincronización IMAP: ${res.syncError}`, 'info');
          } else if (refresh) {
            toast('Bandeja actualizada', 'success');
          }

          // Si hay mensaje seleccionado, actualizarlo en memoria
          if (selectedMessageId) {
            const found = (res.messages || []).find((m: WorkspaceEmailMessage) => m.id === selectedMessageId);
            if (found) setSelectedMessage(found);
          }
        }
      } catch (err: any) {
        console.error('Error fetching messages:', err);
        toast('Error al cargar correos', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiFetch, selectedAccountId, currentFolder, search, selectedMessageId, toast]
  );

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadMessages();
  }, [selectedAccountId, currentFolder, loadMessages]);

  // Abrir detalle de un mensaje
  const handleSelectMessage = async (msg: WorkspaceEmailMessage) => {
    setSelectedMessageId(msg.id);
    setSelectedMessage(msg);

    // Marcar como leído en backend
    if (!msg.isRead) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await apiFetch(`/api/workspace/emails/messages/${msg.id}/read`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
      } catch {}
    }
  };

  // Alternar favorito (Star)
  const handleToggleStar = async (msg: WorkspaceEmailMessage, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStarred = !msg.isStarred;
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isStarred: nextStarred } : m))
    );
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage((prev) => (prev ? { ...prev, isStarred: nextStarred } : null));
    }

    try {
      await apiFetch(`/api/workspace/emails/messages/${msg.id}/star`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: nextStarred }),
      });
    } catch {}
  };

  // Eliminar mensaje
  const handleDeleteMessage = async (msg: WorkspaceEmailMessage) => {
    const isTrash = currentFolder === 'trash';
    const ok = await confirmAction({
      title: isTrash ? '¿Eliminar permanentemente?' : '¿Mover a la papelera?',
      message: isTrash
        ? 'El mensaje será borrado permanentemente de la base de datos.'
        : 'El mensaje se moverá a la papelera.',
      confirmText: isTrash ? 'Sí, eliminar' : 'Mover',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/workspace/emails/messages/${msg.id}${isTrash ? '?hard=true' : ''}`, {
        method: 'DELETE',
      });
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      if (selectedMessageId === msg.id) {
        setSelectedMessageId(null);
        setSelectedMessage(null);
      }
      toast(isTrash ? 'Mensaje eliminado' : 'Mensaje movido a papelera', 'success');
    } catch {
      toast('Error al eliminar mensaje', 'error');
    }
  };

  // Responder mensaje
  const handleReply = (msg: WorkspaceEmailMessage) => {
    setReplyMessage(msg);
    setIsComposerOpen(true);
  };

  const foldersList: Array<{ id: EmailFolder; label: string; icon: React.ReactNode }> = [
    { id: 'inbox', label: 'Bandeja de entrada', icon: <Inbox className="w-4 h-4" /> },
    { id: 'starred', label: 'Destacados', icon: <Star className="w-4 h-4" /> },
    { id: 'sent', label: 'Enviados', icon: <Send className="w-4 h-4" /> },
    { id: 'drafts', label: 'Borradores', icon: <FileText className="w-4 h-4" /> },
    { id: 'trash', label: 'Papelera', icon: <Trash2 className="w-4 h-4" /> },
  ];

  const currentAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra Superior / Header del Módulo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBackToHub && (
            <button
              type="button"
              onClick={onBackToHub}
              className="p-2 -ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Volver a Workspace Hub"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Correos Corporativos
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500 text-white">
                  {unreadCount} nuevos
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentAccount
                ? `${currentAccount.name} (${currentAccount.email})`
                : 'Conexión SMTP / IMAP directa con tu dominio'}
            </p>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Botón sincronizar bajo demanda */}
          <button
            type="button"
            onClick={() => loadMessages(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Sincronizar bandeja IMAP ahora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Selector de Cuentas */}
          {accounts.length > 1 && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.email})
                </option>
              ))}
            </select>
          )}

          {/* Configuración de SMTP/IMAP */}
          <button
            type="button"
            onClick={() => {
              setEditingAccount(currentAccount || null);
              setIsConfigOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="Configurar servidor y dominio"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Configurar SMTP</span>
          </button>

          {/* Botón Redactar (Desktop) */}
          <button
            type="button"
            onClick={() => {
              setReplyMessage(null);
              setIsComposerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Redactar</span>
          </button>
        </div>
      </div>

      {/* Alerta si no hay cuentas configuradas */}
      {accounts.length === 0 && !loading && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Aún no has configurado una cuenta de correo
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                Ingresa los datos de tu servidor SMTP y correo con tu dominio para enviar y recibir mensajes directamente.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingAccount(null);
              setIsConfigOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer shrink-0"
          >
            Configurar Ahora
          </button>
        </div>
      )}

      {/* Contenedor Principal: Layout Responsivo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden flex flex-col lg:flex-row min-h-[620px] max-h-[calc(100vh-210px)]">
        {/* Barra Lateral Izquierda (Carpetas) - Ocultable en móvil */}
        <div
          className={`lg:w-64 border-r border-slate-100 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50 ${
            mobileDrawerOpen ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div className="space-y-4">
            {/* Botón Redactar en Sidebar */}
            <button
              type="button"
              onClick={() => {
                setReplyMessage(null);
                setIsComposerOpen(true);
                setMobileDrawerOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Redactar Correo</span>
            </button>

            {/* Lista de Carpetas */}
            <nav className="space-y-1">
              {foldersList.map((folder) => {
                const isActive = currentFolder === folder.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      setCurrentFolder(folder.id);
                      setSelectedMessageId(null);
                      setSelectedMessage(null);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}>
                        {folder.icon}
                      </span>
                      <span>{folder.label}</span>
                    </div>
                    {folder.id === 'inbox' && unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Pie del Sidebar: Info de cuenta activa */}
          {currentAccount && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>SMTP: {currentAccount.smtpHost}:{currentAccount.smtpPort}</span>
              </div>
              <div className="truncate text-slate-400 font-mono text-[10px]">
                {currentAccount.email}
              </div>
            </div>
          )}
        </div>

        {/* Panel Central: Lista de Mensajes */}
        <div
          className={`flex-1 flex flex-col border-r border-slate-100 dark:border-slate-800 overflow-hidden ${
            selectedMessageId ? 'hidden md:flex md:w-80 lg:w-96' : 'flex'
          }`}
        >
          {/* Barra de Filtros y Búsqueda */}
          <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-900 shrink-0">
            {/* Toggle mobile drawer */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              {mobileDrawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadMessages()}
                placeholder="Buscar por asunto, remitente..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Lista de Mensajes con Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span>Cargando mensajes...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
                <Inbox className="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-600" />
                <span>No hay correos en esta bandeja</span>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelected = selectedMessageId === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-3.5 sm:p-4 transition-colors cursor-pointer flex items-start gap-3 select-none ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-blue-500'
                        : !msg.isRead
                        ? 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Botón Favorito */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleStar(msg, e)}
                      className="mt-0.5 text-slate-300 hover:text-amber-400 dark:text-slate-600 transition-colors cursor-pointer shrink-0"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          msg.isStarred ? 'fill-amber-400 text-amber-400' : ''
                        }`}
                      />
                    </button>

                    {/* Contenido Resumen */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-xs truncate ${
                            !msg.isRead
                              ? 'font-black text-slate-900 dark:text-white'
                              : 'font-semibold text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {msg.fromName || msg.from}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {new Date(msg.date).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <h4
                        className={`text-xs truncate mb-1 ${
                          !msg.isRead
                            ? 'font-bold text-slate-900 dark:text-white'
                            : 'font-normal text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {msg.subject || '(Sin Asunto)'}
                      </h4>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {msg.snippet || 'Sin vista previa de texto'}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        {msg.hasAttachments && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Paperclip className="w-3 h-3" />
                            {msg.attachments?.length || 1}
                          </span>
                        )}
                        {!msg.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel Derecho: Vista de Detalle / Lectura */}
        <div
          className={`flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900 ${
            !selectedMessageId ? 'hidden md:flex items-center justify-center text-slate-400 text-xs' : 'flex'
          }`}
        >
          {selectedMessage ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden animate-fadeIn">
              {/* Header del Mensaje */}
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0 bg-slate-50/40 dark:bg-slate-900/40">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Botón Volver para Mobile */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMessageId(null);
                      setSelectedMessage(null);
                    }}
                    className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                    {(selectedMessage.fromName || selectedMessage.from || 'U')[0]}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                      {selectedMessage.subject || '(Sin Asunto)'}
                    </h2>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {selectedMessage.fromName || selectedMessage.from}
                      </span>
                      <span>&lt;{selectedMessage.from}&gt;</span>
                      <span>•</span>
                      <span className="font-mono text-[11px]">
                        {new Date(selectedMessage.date).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Para: {selectedMessage.to?.join(', ') || 'Mí'}
                    </div>
                  </div>
                </div>

                {/* Acciones Rápidas */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReply(selectedMessage)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 transition-colors cursor-pointer"
                    title="Responder a este correo"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Responder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(selectedMessage)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    title="Eliminar mensaje"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Adjuntos del Mensaje */}
              {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                <div className="p-3 sm:px-6 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 mr-2">
                    <Paperclip className="w-3.5 h-3.5" /> Adjuntos:
                  </span>
                  {selectedMessage.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 transition-colors shadow-2xs"
                    >
                      <Download className="w-3 h-3 text-slate-400" />
                      <span className="max-w-[140px] truncate">{att.filename}</span>
                      {att.size ? (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({(att.size / 1024).toFixed(0)} KB)
                        </span>
                      ) : null}
                    </a>
                  ))}
                </div>
              )}

              {/* Cuerpo del Correo (HTML o Texto) */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                {selectedMessage.bodyHtml ? (
                  <div
                    className="email-body-content prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans"
                    dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    {selectedMessage.bodyText || '(Este mensaje no tiene contenido)'}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Mail className="w-12 h-12 stroke-1 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs">Selecciona un correo para visualizar su contenido</p>
            </div>
          )}
        </div>
      </div>

      {/* Botón Flotante para Redactar en Móvil (FAB) */}
      <button
        type="button"
        onClick={() => {
          setReplyMessage(null);
          setIsComposerOpen(true);
        }}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
        title="Redactar nuevo correo"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Modal de Configuración SMTP / IMAP */}
      <EmailConfigModal
        isOpen={isConfigOpen}
        accounts={accounts}
        editingAccount={editingAccount}
        onClose={() => setIsConfigOpen(false)}
        onSaved={() => {
          loadAccounts();
          loadMessages();
        }}
      />

      {/* Modal / Sheet para Redactar Correo */}
      <EmailComposerModal
        isOpen={isComposerOpen}
        accounts={accounts}
        currentAccountId={selectedAccountId}
        initialReplyTo={replyMessage}
        onClose={() => {
          setIsComposerOpen(false);
          setReplyMessage(null);
        }}
        onSent={() => {
          if (currentFolder === 'sent') loadMessages();
        }}
      />
    </div>
  );
};
