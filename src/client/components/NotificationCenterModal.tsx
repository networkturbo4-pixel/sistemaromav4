import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AppNotification, NotificationModule } from '../../shared/types';
import { ActiveModule } from './AppShell';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Smartphone,
  CheckCircle2,
  Users,
  FileText,
  Receipt,
  ClipboardList,
  FolderKanban,
  HardDrive,
  Sparkles,
  UserCheck,
  Shield,
  Layers,
  ExternalLink,
  Info,
  AlertTriangle,
  Send,
  Volume2,
} from 'lucide-react';
import { playNotificationChime } from '../utils/notificationSound';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateModule?: (module: ActiveModule) => void;
}

const MODULE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; bg: string; color: string }
> = {
  clients: {
    label: 'Clientes',
    icon: <Users className="w-4 h-4" />,
    bg: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',
    color: 'text-indigo-500',
  },
  quotes: {
    label: 'Cotizaciones',
    icon: <FileText className="w-4 h-4" />,
    bg: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    color: 'text-amber-500',
  },
  payments: {
    label: 'Pagos & Cobros',
    icon: <Receipt className="w-4 h-4" />,
    bg: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    color: 'text-emerald-500',
  },
  service_orders: {
    label: 'Órdenes de Servicio',
    icon: <ClipboardList className="w-4 h-4" />,
    bg: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    color: 'text-blue-500',
  },
  workspace: {
    label: 'Workspace',
    icon: <FolderKanban className="w-4 h-4" />,
    bg: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
    color: 'text-purple-500',
  },
  drive: {
    label: 'Google Drive',
    icon: <HardDrive className="w-4 h-4" />,
    bg: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
    color: 'text-cyan-500',
  },
  services: {
    label: 'Servicios',
    icon: <Sparkles className="w-4 h-4" />,
    bg: 'bg-pink-500/15 text-pink-500 border-pink-500/30',
    color: 'text-pink-500',
  },
  users: {
    label: 'Equipo',
    icon: <UserCheck className="w-4 h-4" />,
    bg: 'bg-teal-500/15 text-teal-500 border-teal-500/30',
    color: 'text-teal-500',
  },
  roles: {
    label: 'Permisos',
    icon: <Shield className="w-4 h-4" />,
    bg: 'bg-violet-500/15 text-violet-500 border-violet-500/30',
    color: 'text-violet-500',
  },
  onboarding: {
    label: 'El Creador',
    icon: <Sparkles className="w-4 h-4" />,
    bg: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    color: 'text-amber-500',
  },
  system: {
    label: 'Sistema',
    icon: <Layers className="w-4 h-4" />,
    bg: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
    color: 'text-slate-500',
  },
};

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  } catch (e) {
    return dateStr;
  }
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigateModule,
}) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    isPushSupported,
    isPushSubscribed,
    pushPermission,
    enablePushNotifications,
    sendTestPushNotification,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [isActivatingPush, setIsActivatingPush] = useState<boolean>(false);

  // Lista de módulos únicos presentes en las notificaciones actuales
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach((n) => {
      if (n.module) set.add(n.module);
    });
    return Array.from(set);
  }, [notifications]);

  // Filtrado de notificaciones
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeTab === 'unread' && notif.isRead) return false;
      if (selectedModule !== 'all' && notif.module !== selectedModule) return false;
      return true;
    });
  }, [notifications, activeTab, selectedModule]);

  if (!isOpen) return null;

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.isRead) {
      markNotificationAsRead(notif.id);
    }
    if (notif.module && onNavigateModule) {
      const validModules: ActiveModule[] = [
        'dashboard',
        'clients',
        'quotes',
        'services',
        'payments',
        'workspace',
        'service_orders',
        'drive',
        'settings',
      ];
      if (validModules.includes(notif.module as ActiveModule)) {
        onNavigateModule(notif.module as ActiveModule);
        onClose();
      }
    }
  };

  const handleActivatePush = async () => {
    setIsActivatingPush(true);
    try {
      await enablePushNotifications();
    } finally {
      setIsActivatingPush(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal / Sliding Container */}
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 animate-slideUp"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)',
        }}
      >
        {/* 1. HEADER MODAL */}
        <div
          className="p-4 sm:p-5 border-b flex items-center justify-between gap-3 shrink-0"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: 'var(--app-primary)' }}
              >
                <Bell className="w-5 h-5" />
              </div>
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Centro de Notificaciones
                </h2>
                <button
                  type="button"
                  onClick={() => playNotificationChime()}
                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-500/10 transition cursor-pointer"
                  title="Probar sonido de notificación"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                {unreadNotificationsCount === 0
                  ? 'Todas las acciones al día en tu agencia'
                  : `Tienes ${unreadNotificationsCount} alerta${unreadNotificationsCount > 1 ? 's' : ''} pendiente${unreadNotificationsCount > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {notifications.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => markAllNotificationsAsRead()}
                  className="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  style={{ borderColor: 'var(--app-border)' }}
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Marcar leídas</span>
                </button>

                <button
                  type="button"
                  onClick={() => clearAllNotifications()}
                  className="p-1.5 rounded-xl border text-slate-400 hover:text-rose-500 hover:border-rose-500/40 hover:bg-rose-500/10 transition cursor-pointer shadow-2xs"
                  style={{ borderColor: 'var(--app-border)' }}
                  title="Limpiar todo el historial"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-500/10 transition cursor-pointer shadow-2xs ml-1"
              style={{ borderColor: 'var(--app-border)' }}
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. CARD DE PUSH NOTIFICATIONS / PWA EN CELULAR */}
        <div className="p-3.5 sm:p-4 border-b shrink-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent" style={{ borderColor: 'var(--app-border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                    Notificaciones en tu Celular (PWA)
                  </span>
                  {isPushSubscribed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Activas en este dispositivo
                    </span>
                  ) : pushPermission === 'denied' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Bloqueadas en navegador
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      Pendiente de activar
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {isPushSubscribed
                    ? 'Recibirás avisos de pagos, cotizaciones y órdenes de servicio aunque tengas el celular bloqueado.'
                    : 'Activa alertas automáticas en tu teléfono móvil o pantalla de bloqueo al descargar la PWA.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {isPushSubscribed ? (
                <button
                  type="button"
                  onClick={() => sendTestPushNotification()}
                  className="px-3 py-1.5 rounded-xl border border-indigo-500/40 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  title="Enviar notificación de prueba a mi celular"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Probar en mi celular</span>
                </button>
              ) : isPushSupported ? (
                <button
                  type="button"
                  disabled={isActivatingPush}
                  onClick={handleActivatePush}
                  className="px-3.5 py-1.5 rounded-xl text-white text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  style={{ backgroundColor: 'var(--app-primary)' }}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{isActivatingPush ? 'Activando...' : 'Activar en mi Celular'}</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  Añade a Inicio (PWA) para activar
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. FILTROS (TABS + CHIPS DE MÓDULOS) */}
        <div
          className="p-3 sm:px-5 border-b flex flex-col gap-2 shrink-0 bg-slate-500/5"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Tabs Todas / No leídas */}
            <div className="flex items-center gap-1 bg-slate-500/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'unread'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span>No leídas</span>
                {unreadNotificationsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-500 text-white">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            </div>

            <span className="text-[11px] font-medium text-slate-400">
              {filteredNotifications.length} resultado{filteredNotifications.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Chips por Módulo */}
          {availableModules.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedModule('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer ${
                  selectedModule === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20'
                }`}
              >
                Todos los módulos
              </button>
              {availableModules.map((mod) => {
                const conf = MODULE_CONFIG[mod] || {
                  label: mod.charAt(0).toUpperCase() + mod.slice(1),
                  icon: <Layers className="w-3.5 h-3.5" />,
                  bg: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
                };
                const isSel = selectedModule === mod;
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => setSelectedModule(mod)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                      isSel
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20'
                    }`}
                  >
                    {conf.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. LISTADO DE NOTIFICACIONES */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/40">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-slate-500/10 text-slate-400 mx-auto flex items-center justify-center">
                <Bell className="w-7 h-7 opacity-50" />
              </div>
              <div className="max-w-xs mx-auto">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {activeTab === 'unread'
                    ? '¡Todo leído!'
                    : 'No hay notificaciones aún'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Cualquier acción realizada en clientes, cotizaciones, órdenes de servicio o pagos aparecerá aquí al instante.
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const conf = MODULE_CONFIG[notif.module] || {
                label: notif.module || 'General',
                icon: <Layers className="w-4 h-4" />,
                bg: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
                color: 'text-slate-500',
              };

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`pt-2.5 first:pt-0 p-3 rounded-2xl transition cursor-pointer group flex items-start gap-3 border ${
                    !notif.isRead
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-500/30'
                      : 'hover:bg-slate-500/5 border-transparent'
                  }`}
                >
                  {/* Ícono del módulo */}
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${conf.bg}`}
                  >
                    {conf.icon}
                  </div>

                  {/* Detalle */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-500/10 text-slate-500 dark:text-slate-400">
                          {conf.label}
                        </span>
                        {notif.actorUserName && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            por {notif.actorUserName}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-1 leading-snug">
                      {notif.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Acciones de la fila */}
                    <div className="flex items-center justify-between pt-2 mt-1">
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1">
                        <span>Ver detalle</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationAsRead(notif.id);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-500/10 transition"
                            title="Marcar como leída"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                          title="Eliminar notificación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Indicador de no leído */}
                  {!notif.isRead && (
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-1 shadow-xs animate-pulse" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 5. FOOTER CON CONSEJO PWA */}
        <div
          className="p-3 sm:px-5 border-t flex items-center justify-between text-xs text-slate-400 shrink-0 bg-slate-500/5"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="text-[11px]">
              Cualquier módulo nuevo creado se conecta automáticamente.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-xl text-xs font-bold border hover:bg-slate-500/10 transition cursor-pointer"
            style={{ borderColor: 'var(--app-border)' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
