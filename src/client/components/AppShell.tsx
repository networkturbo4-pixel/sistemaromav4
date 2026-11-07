import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Settings,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ShieldCheck,
  Building2,
  Coins,
  Palette,
  ChevronRight,
  Menu,
  X,
  UserCheck,
  KeyRound,
  Shield,
  Sliders,
  Sparkles,
  ChevronsUpDown,
  Check,
  Plus,
  Layers,
  Smartphone,
  FileText,
  Receipt,
  FolderKanban,
  ClipboardList,
  Share2,
  ListTodo,
  ArrowRight,
  ChevronUp,
  MoreHorizontal,
  HardDrive,
  Search,
  Zap,
  RefreshCw,
  Bell,
  Video,
} from 'lucide-react';
import { SettingsTab } from '../modules/SettingsModule';
import { CommandPalette } from './CommandPalette';
import { ErrorBoundary } from './ErrorBoundary';
import { QuickOnboardingCreatorModal } from './QuickOnboardingCreatorModal';
import { NotificationCenterModal } from './NotificationCenterModal';

export type ActiveModule =
  | 'dashboard'
  | 'clients'
  | 'quotes'
  | 'services'
  | 'payments'
  | 'workspace'
  | 'service_orders'
  | 'drive'
  | 'settings'
  | 'administration';

interface AppShellProps {
  activeModule: ActiveModule;
  activeSettingsTab?: SettingsTab;
  onSelectModule: (mod: ActiveModule) => void;
  onSelectSettingsTab?: (tab: SettingsTab) => void;
  children: React.ReactNode;
}

const SETTINGS_TAB_NAMES: Record<SettingsTab, string> = {
  appearance: 'Apariencia & Colores',
  dialogs: 'Toasts & Modales',
  identity: 'Identidad & Logos',
  company: 'Datos de Empresa',
  users: 'Usuarios del Equipo',
  roles: 'Roles y Permisos',
  tenants: 'Tenants & Agencias',
  'system-update': 'Actualización del Sistema',
  drive: 'Google Drive & APIs',
};

export const AppShell: React.FC<AppShellProps> = ({
  activeModule,
  activeSettingsTab = 'appearance',
  onSelectModule,
  onSelectSettingsTab,
  children,
}) => {
  const {
    user,
    role,
    tenant,
    engineInfo,
    resolvedTheme,
    themeMode,
    setThemeMode,
    logout,
    can,
    confirmAction,
    switchTenant,
    tenantsList,
    isSwitchingTenant,
    apiFetch,
    toast,
    unreadNotificationsCount,
  } = useApp();

  const [notificationModalOpen, setNotificationModalOpen] = useState(false);

  // Detección automática en segundo plano de actualizaciones en GitHub
  const [updateAvailableInfo, setUpdateAvailableInfo] = useState<{
    available: boolean;
    remoteCommit?: string | null;
    remoteCommitMessage?: string | null;
  }>({ available: false });
  const hasNotifiedUpdateRef = useRef(false);

  useEffect(() => {
    if (!can('settings.view') && !can('settings.system.update')) return;

    let isMounted = true;
    const checkUpdates = async () => {
      try {
        const data = await apiFetch<{
          updateAvailable?: boolean;
          remoteCommit?: string | null;
          remoteCommitMessage?: string | null;
        }>('/api/system/update-status');

        if (!isMounted) return;

        if (data.updateAvailable) {
          setUpdateAvailableInfo({
            available: true,
            remoteCommit: data.remoteCommit,
            remoteCommitMessage: data.remoteCommitMessage,
          });

          if (!hasNotifiedUpdateRef.current) {
            hasNotifiedUpdateRef.current = true;
            toast(
              `🚀 ¡Nueva actualización disponible del sistema! (${data.remoteCommit || 'GitHub'}). Ve a Configuración para actualizar en 1 Clic.`,
              'success'
            );
          }
        } else {
          setUpdateAvailableInfo({ available: false });
        }
      } catch {}
    };

    const initialTimer = setTimeout(checkUpdates, 2000);
    const intervalTimer = setInterval(checkUpdates, 4 * 60 * 1000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [can, apiFetch, toast]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarWorkspaceOpen, setSidebarWorkspaceOpen] = useState(false);
  const [headerUserOpen, setHeaderUserOpen] = useState(false);
  const [mobileWorkspaceSheetOpen, setMobileWorkspaceSheetOpen] = useState(false);
  const [mobileMoreSheetOpen, setMobileMoreSheetOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);

  // Atajo de teclado global para abrir Command Palette (Ctrl + K / Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sidebarWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const headerUserRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        sidebarWorkspaceRef.current &&
        !sidebarWorkspaceRef.current.contains(target)
      ) {
        setSidebarWorkspaceOpen(false);
      }
      if (
        headerUserRef.current &&
        !headerUserRef.current.contains(target)
      ) {
        setHeaderUserOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Soporte de instalación PWA (Móvil y Escritorio)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsAppInstalled(true);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Para instalar ROMA SaaS:\n\n• En PC (Chrome / Edge): Haz clic en el icono "Instalar" en la parte derecha de la barra de direcciones.\n• En Android: Toca el menú de 3 puntos del navegador > "Instalar aplicación".\n• En iPhone / iPad (Safari): Toca el botón Compartir > "Agregar a pantalla de inicio".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsAppInstalled(true);
    }
  };

  const clientPluralLabel =
    tenant.customization.clientGlobalNamePlural || 'Clientes';

  const activeLogo =
    resolvedTheme === 'dark'
      ? tenant.customization.logoDarkUrl || tenant.customization.logoLightUrl
      : tenant.customization.logoLightUrl || tenant.customization.logoDarkUrl;

  const handleLogoutClick = async () => {
    const confirmed = await confirmAction({
      title: '¿Cerrar sesión en el sistema?',
      message: `Saldrás del espacio de trabajo de ${tenant.name}. Para volver a ingresar necesitarás tu PIN de 8 dígitos.`,
      confirmText: 'Sí, salir ahora',
      cancelText: 'Seguir trabajando',
      danger: false,
    });
    if (confirmed) logout();
  };

  const cycleTheme = () => {
    if (themeMode === 'light') setThemeMode('dark');
    else if (themeMode === 'dark') setThemeMode('system');
    else setThemeMode('light');
  };

  const getThemeDetails = () => {
    switch (themeMode) {
      case 'light':
        return {
          icon: <Sun className="w-4 h-4 text-amber-500" />,
          label: 'Modo Claro',
          nextLabel: 'Cambiar a modo oscuro',
        };
      case 'dark':
        return {
          icon: <Moon className="w-4 h-4 text-indigo-400" />,
          label: 'Modo Oscuro',
          nextLabel: 'Cambiar a modo automático',
        };
      case 'system':
      default:
        return {
          icon: <Monitor className="w-4 h-4 text-sky-400" />,
          label: 'Automático',
          nextLabel: 'Cambiar a modo claro',
        };
    }
  };

  const navItems: Array<{
    id: ActiveModule;
    label: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
    allowed: boolean;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Métricas y resumen operativo',
      icon: <LayoutDashboard className="w-4 h-4 text-indigo-500" />,
      iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      allowed: can('dashboard.view'),
    },
    {
      id: 'clients',
      label: clientPluralLabel,
      description: 'Cuentas y marcas asignadas',
      icon: <Users className="w-4 h-4 text-emerald-500" />,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      allowed: can('clients.view'),
    },
    {
      id: 'quotes',
      label: 'Cotizaciones',
      description: 'Propuestas y enlaces públicos',
      icon: <FileText className="w-4 h-4 text-blue-500" />,
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
      allowed: can('quotes.view'),
    },
    {
      id: 'services',
      label: 'Servicios',
      description: 'Catálogo, paquetes y entregables',
      icon: <Sparkles className="w-4 h-4 text-violet-500" />,
      iconBg: 'bg-violet-500/10 dark:bg-violet-500/20',
      allowed: can('services.view'),
    },
    {
      id: 'payments',
      label: 'Notas de Pago',
      description: 'Comprobantes, cobros y recibos',
      icon: <Receipt className="w-4 h-4 text-emerald-500" />,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      allowed: can('payments.view'),
    },
    {
      id: 'service_orders',
      label: 'Órdenes de Servicio',
      description: 'Hojas de ruta, switchers y entregables',
      icon: <ClipboardList className="w-4 h-4 text-amber-500" />,
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      allowed: can('service_orders.view'),
    },
    {
      id: 'workspace',
      label: 'Workspace',
      description: 'Redes sociales & tareas de equipo',
      icon: <FolderKanban className="w-4 h-4 text-cyan-500" />,
      iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      allowed: can('workspace.view'),
    },
    {
      id: 'administration',
      label: 'Administración',
      description: 'RRHH, Finanzas y Contabilidad',
      icon: <Building2 className="w-4 h-4 text-purple-500" />,
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
      allowed: can('administration.view'),
    },
    {
      id: 'settings',
      label: 'Configuración',
      description: 'Identidad, empresa y accesos',
      icon: <Settings className="w-4 h-4 text-purple-500" />,
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
      allowed: can('settings.view'),
    },
  ];

  const renderWorkspaceMenu = (onClose: () => void) => (
    <div className="p-1 space-y-1">
      {/* Cabecera limpia con contador numérico sin desbordes */}
      <div className="px-2.5 py-1.5 flex items-center justify-between text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider truncate">
            Espacios de Trabajo
          </span>
        </div>
        <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 shrink-0">
          {tenantsList.length}
        </span>
      </div>

      {/* Lista de Tenants */}
      <div className="max-h-56 overflow-y-auto space-y-1 p-0.5">
        {tenantsList.map((t) => {
          const isCurrent = t.id === tenant.id;
          const tFavicon = t.customization?.faviconUrl;
          const currency = t.customization?.currencySymbol || (t as any).currencySymbol || 'S/';

          return (
            <button
              key={t.id}
              type="button"
              disabled={isSwitchingTenant}
              onClick={async () => {
                onClose();
                if (!isCurrent) {
                  await switchTenant(t.id);
                }
              }}
              className={`w-full p-2 rounded-xl flex items-center justify-between gap-2.5 text-left text-xs transition cursor-pointer border ${
                isCurrent
                  ? 'bg-indigo-50/90 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30 text-indigo-950 dark:text-indigo-200 font-bold shadow-2xs'
                  : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {tFavicon ? (
                  <img
                    src={tFavicon}
                    alt={t.name}
                    className="w-8 h-8 rounded-lg object-contain p-0.5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs shrink-0"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                    {t.companyInfo?.commercialName || t.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    /{t.slug}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500">
                  {currency}
                </span>
                {isCurrent && (
                  <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Acciones inferiores */}
      <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
        {can('settings.tenants.manage') && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectModule('settings');
              onSelectSettingsTab?.('tenants');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('roma-open-new-tenant-modal'));
              }, 100);
            }}
            className="w-full px-3 py-2 rounded-xl text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition flex items-center justify-center gap-1.5 cursor-pointer border border-dashed border-indigo-200 dark:border-indigo-800/80"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Nueva Agencia / Tenant</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onClose();
            onSelectModule('settings');
            onSelectSettingsTab?.('tenants');
          }}
          className="w-full px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Gestionar Workspaces</span>
        </button>
      </div>
    </div>
  );

  const renderSidebarContent = () => (
    <div
      className="flex flex-col h-full justify-between p-4 sm:p-5 select-none transition-colors duration-200"
      style={{
        backgroundColor: 'var(--app-surface)',
      }}
    >
      {/* 1. SECCIÓN SUPERIOR: WORKSPACE / TENANT SWITCHER PROFESIONAL */}
      <div className="space-y-4">
        {/* Cabecera Principal con Switcher de Tenant */}
        <div className="relative" ref={sidebarWorkspaceRef}>
          <button
            type="button"
            onClick={() => setSidebarWorkspaceOpen((prev) => !prev)}
            className="w-full p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800/80 hover:border-indigo-500/40 transition-all duration-200 text-left cursor-pointer group flex items-center justify-between gap-2.5 shadow-2xs hover:shadow-xs"
            title="Cambiar de Agencia / Tenant"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {tenant.customization?.faviconUrl ? (
                <img
                  src={tenant.customization.faviconUrl}
                  alt={tenant.name}
                  className="w-9 h-9 rounded-xl object-contain p-1 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs shrink-0"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shrink-0 shadow-2xs text-white bg-gradient-to-br from-indigo-500 to-violet-600"
                >
                  {tenant.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="font-extrabold text-xs block truncate text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  {tenant.companyInfo.commercialName || tenant.name}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="font-mono font-bold truncate">/{tenant.slug}</span>
                  <span>•</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {tenant.customization.currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition shrink-0">
              <ChevronsUpDown className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Menú Flotante de Espacios de Trabajo */}
          {sidebarWorkspaceOpen && (
            <div
              className="absolute left-0 right-0 top-full mt-1.5 z-50 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 backdrop-blur-xl bg-white/98 dark:bg-slate-900/98 animate-in fade-in zoom-in-95 duration-150"
            >
              {renderWorkspaceMenu(() => setSidebarWorkspaceOpen(false))}
            </div>
          )}
        </div>

        {/* 2. MENÚ DE NAVEGACIÓN */}
        <div className="space-y-1.5 pt-2">
          <p className="px-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Navegación
          </p>

          <nav className="space-y-1.5">
            {navItems
              .filter((item) => item.allowed)
              .map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectModule(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50/80 dark:bg-indigo-500/15 border border-indigo-200/80 dark:border-indigo-500/30 shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-extrabold block truncate ${
                              isActive
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.id === 'settings' && updateAvailableInfo.available && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white animate-pulse shadow-xs">
                              1-CLIC
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                          {item.id === 'settings' && updateAvailableInfo.available
                            ? '¡Nueva versión disponible!'
                            : item.description}
                        </span>
                      </div>
                    </div>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>
                );
              })}
          </nav>
        </div>
      </div>

      {/* 3. SECCIÓN INFERIOR: TEMA, USUARIO & CIERRE DE SESIÓN */}
      <div className="pt-4 space-y-3 border-t border-slate-100 dark:border-slate-800">
        {/* Selector de Tema */}
        <div className="p-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setThemeMode('light')}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              themeMode === 'light'
                ? 'bg-white shadow-xs text-amber-500 font-extrabold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Modo Claro"
          >
            <Sun className="w-3.5 h-3.5 mr-1" />
            <span className="text-[11px]">Claro</span>
          </button>

          <button
            type="button"
            onClick={() => setThemeMode('dark')}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              themeMode === 'dark'
                ? 'bg-slate-900 shadow-xs text-indigo-400 font-extrabold'
                : 'text-slate-500 hover:text-slate-200'
            }`}
            title="Modo Oscuro"
          >
            <Moon className="w-3.5 h-3.5 mr-1" />
            <span className="text-[11px]">Oscuro</span>
          </button>

          <button
            type="button"
            onClick={() => setThemeMode('system')}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              themeMode === 'system'
                ? 'bg-white dark:bg-slate-900 shadow-xs text-sky-500 font-extrabold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Automático"
          >
            <Monitor className="w-3.5 h-3.5 mr-1" />
            <span className="text-[11px]">Auto</span>
          </button>
        </div>

        {/* Tarjeta de Usuario con Centro de Notificaciones Integrado */}
        {user && role && (
          <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center font-extrabold text-xs text-white shadow-sm shrink-0">
                  {user.name
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-xs truncate leading-tight text-slate-900 dark:text-slate-100">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {user.jobTitle}
                  </p>
                </div>
              </div>

              {/* Centro de Notificaciones en el Sidebar */}
              <button
                type="button"
                onClick={() => setNotificationModalOpen(true)}
                className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs group flex items-center justify-center shrink-0"
                title="Centro de Notificaciones & Alertas"
                aria-label="Abrir centro de notificaciones"
              >
                <Bell className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${role.badgeColor}20`,
                  color: role.badgeColor,
                }}
              >
                <ShieldCheck className="w-3 h-3" />
                {role.name}
              </span>

              <span className="text-[10px] font-mono-pin text-slate-400 font-bold">
                {role.permissions.length} perms
              </span>
            </div>
          </div>
        )}

        {/* Botón Salir */}
        <button
          type="button"
          onClick={handleLogoutClick}
          className="w-full py-2.5 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-dvh flex flex-col md:flex-row relative transition-colors duration-200"
      style={{
        backgroundColor: 'var(--app-bg)',
        color: 'var(--app-text)',
      }}
    >
      {/* 1. SIDEBAR MODERNO IZQUIERDO (DESKTOP) */}
      <aside
        className="hidden md:flex md:w-64 lg:w-72 shrink-0 h-dvh sticky top-0 border-r flex-col z-30 shadow-xs transition-colors duration-200"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }}
      >
        {renderSidebarContent()}
      </aside>

      {/* 2. DRAWER MÓVIL */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 flex flex-col overflow-y-auto transition-colors duration-200 animate-in slide-in-from-left duration-200"
            style={{
              backgroundColor: 'var(--app-surface)',
            }}
          >
            {renderSidebarContent()}
          </div>

          {/* Botón de Cierre fuera del sidebar */}
          <div className="relative z-20 p-3 self-start">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 backdrop-blur-md shadow-xl flex items-center justify-center cursor-pointer transition-all active:scale-95"
              aria-label="Cerrar menú móvil"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. COLUMNA PRINCIPAL DE APLICACIÓN (HEADER MODERNO + CONTENIDO) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-dvh">
        {/* HEADER MODERNO EN MÓVIL (LIMPIO, SIN DUPLICADOS) */}
        <header
          className="md:hidden sticky top-0 z-30 w-full border-b transition-colors duration-200 backdrop-blur-xl"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--app-surface) 88%, transparent)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="px-3 sm:px-4 h-14 sm:h-15 flex items-center justify-between gap-2.5">
            {/* LADO IZQUIERDO: DISPARADOR MÓVIL */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl border hover:bg-slate-500/10 active:scale-95 transition cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
              style={{
                borderColor: 'var(--app-border)',
                backgroundColor: 'color-mix(in srgb, var(--app-bg) 60%, transparent)',
              }}
              title="Abrir menú de navegación"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5" style={{ color: 'var(--app-text)' }} />
            </button>

            {/* CENTRO: TRIGGER COMMAND PALETTE EXPANDIDO (MÁS ESPACIO PARA EL BUSCADOR) */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex-1 min-w-0 flex items-center justify-between px-3 py-2 rounded-xl border text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer hover:border-indigo-500/40 shadow-2xs group"
              style={{
                backgroundColor: 'var(--app-bg)',
                borderColor: 'var(--app-border)',
              }}
              title="Abrir Command Palette (Ctrl + K)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition shrink-0" />
                <span className="font-medium truncate text-slate-400 dark:text-slate-500">
                  Buscar clientes, servicios o comandos...
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/15 shrink-0 ml-1">
                Ctrl K
              </kbd>
            </button>

            {/* LADO DERECHO: NOTIFICACIONES + PERFIL DE USUARIO */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setNotificationModalOpen(true)}
                className="relative p-2 rounded-xl border hover:border-indigo-500/40 transition cursor-pointer shadow-2xs group flex items-center justify-center shrink-0"
                style={{
                  borderColor: 'var(--app-border)',
                  backgroundColor: 'var(--app-bg)',
                }}
                title="Centro de Notificaciones"
                aria-label="Abrir centro de notificaciones"
              >
                <Bell className="w-4 h-4 text-slate-500 group-hover:text-indigo-500 transition" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {user && role && (
                <div className="relative" ref={headerUserRef}>
                <button
                  type="button"
                  onClick={() => setHeaderUserOpen((prev) => !prev)}
                  className="p-1 rounded-xl border hover:border-indigo-500/40 transition cursor-pointer shadow-xs group flex items-center"
                  style={{
                    borderColor: 'var(--app-border)',
                    backgroundColor: 'var(--app-bg)',
                  }}
                  title="Perfil de Usuario y Sesión"
                >
                  <div className="relative">
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-extrabold text-[11px] text-white shadow-xs shrink-0"
                      style={{ backgroundColor: 'var(--app-primary)' }}
                    >
                      {user.name
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 absolute -bottom-0.5 -right-0.5" />
                  </div>
                </button>

                {headerUserOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-64 z-50 border rounded-2xl shadow-2xl p-3 space-y-3 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    {/* Tarjeta del usuario */}
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm shrink-0"
                        style={{ backgroundColor: 'var(--app-primary)' }}
                      >
                        {user.name
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-xs truncate text-slate-900 dark:text-slate-100">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {user.jobTitle}
                        </p>
                        <span
                          className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full mt-1"
                          style={{
                            backgroundColor: `${role.badgeColor}20`,
                            color: role.badgeColor,
                          }}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {role.name}
                        </span>
                      </div>
                    </div>

                    {/* Acciones directas */}
                    <div className="space-y-1 text-xs">
                      {can('settings.view') && (
                        <button
                          type="button"
                          onClick={() => {
                            setHeaderUserOpen(false);
                            onSelectModule('settings');
                          }}
                          className="w-full p-2 rounded-xl flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-bold"
                        >
                          <Settings className="w-4 h-4 text-purple-500" />
                          <span>Configuración General</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setHeaderUserOpen(false);
                          setMobileMenuOpen(true);
                        }}
                        className="w-full p-2 rounded-xl flex items-center gap-2.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer font-medium"
                      >
                        <Menu className="w-4 h-4 text-indigo-500" />
                        <span>Ver menú completo</span>
                      </button>
                    </div>

                    {/* Botón Salir y PWA Móvil */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      {!isAppInstalled && (
                        <button
                          type="button"
                          onClick={() => {
                            setHeaderUserOpen(false);
                            handleInstallClick();
                          }}
                          className="w-full py-2 px-3 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30 transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>Instalar App PWA</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setHeaderUserOpen(false);
                          handleLogoutClick();
                        }}
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/30 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL CON ESPACIADO INFERIOR ÓPTIMO Y MÁRGENES RESPONSIVE AJUSTADOS */}
        <main
          className="flex-1 min-w-0 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 sm:pb-36 md:pb-12 transition-colors duration-200"
          style={{
            backgroundColor: 'var(--app-bg)',
            color: 'var(--app-text)',
          }}
        >
          <div className="w-full max-w-[1680px] mx-auto space-y-4">
            {/* BANNER NOTIFICACIÓN DE ACTUALIZACIÓN DEL SISTEMA */}
            {updateAvailableInfo.available && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">
                        ¡Nueva actualización del sistema disponible!
                      </span>
                      {updateAvailableInfo.remoteCommit && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-white">
                          {updateAvailableInfo.remoteCommit}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {updateAvailableInfo.remoteCommitMessage || 'Mejoras y nuevas funciones listas en GitHub.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectModule('settings');
                    onSelectSettingsTab?.('system-update');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shrink-0 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualizar en 1 Clic</span>
                </button>
              </div>
            )}

            {children}
          </div>
        </main>
      </div>

      {/* 4. NAVBAR RESPONSIVE MODERNO (5 POSICIONES: 2 IZQ, 1 CENTRO WORKSPACE, 2 DER) */}
      
      {/* 4.1 SHEET DESPLEGABLE DE WORKSPACE (ACCESOS DIRECTOS) */}
      {mobileWorkspaceSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          {/* Backdrop click to close */}
          <div
            className="flex-1"
            onClick={() => setMobileWorkspaceSheetOpen(false)}
          />

          <div
            className="w-full max-w-md mx-auto rounded-t-3xl border-t border-x border-slate-200 dark:border-slate-800 p-5 pb-8 space-y-4 shadow-2xl animate-slideUp"
            style={{
              backgroundColor: 'var(--app-surface)',
              color: 'var(--app-text)',
            }}
          >
            {/* Header del Sheet */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Workspace de Agencia
                  </h3>
                  <p className="text-[11px] text-slate-400">Selecciona el submódulo al que deseas entrar</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileWorkspaceSheetOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Accesos Directos de Workspace */}
            <div className="grid grid-cols-2 gap-3">
              {/* Acceso Directo 1: Redes Sociales */}
              <button
                type="button"
                onClick={() => {
                  setMobileWorkspaceSheetOpen(false);
                  onSelectModule('workspace');
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent('roma-open-workspace-subview', { detail: 'social' })
                    );
                  }, 50);
                }}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-pink-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/60 border border-pink-200 dark:border-pink-800 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-2.5">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    Redes Sociales
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                    Grilla mensual, copies y pauta.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                  <span>Abrir</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Acceso Directo 2: Tareas */}
              <button
                type="button"
                onClick={() => {
                  setMobileWorkspaceSheetOpen(false);
                  onSelectModule('workspace');
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent('roma-open-workspace-subview', { detail: 'tasks' })
                    );
                  }, 50);
                }}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-indigo-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    Tareas
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                    Tablero Kanban y entregas.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <span>Abrir</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Acceso Directo 3: Archivos & Drive */}
              <button
                type="button"
                onClick={() => {
                  setMobileWorkspaceSheetOpen(false);
                  onSelectModule('workspace');
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent('roma-open-workspace-subview', { detail: 'drive' })
                    );
                  }, 50);
                }}
                className="col-span-2 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-blue-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Archivos & Drive
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Cloud central, almacenamiento y Google Drive.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 shrink-0">
                  <span>Abrir</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Botón Herramientas Creativas */}
              <button
                type="button"
                onClick={() => {
                  setMobileWorkspaceSheetOpen(false);
                  onSelectModule('workspace');
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent('roma-open-workspace-subview', { detail: 'tools' })
                    );
                  }, 50);
                }}
                className="col-span-2 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-purple-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Herramientas Studio
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Paletas de color, códigos QR, barras y Biolinks.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 shrink-0">
                  <span>Abrir</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Botón Formularios */}
              <button
                type="button"
                onClick={() => {
                  setMobileWorkspaceSheetOpen(false);
                  onSelectModule('workspace');
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent('roma-open-workspace-subview', { detail: 'forms' })
                    );
                  }, 50);
                }}
                className="col-span-2 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-emerald-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Formularios de Agencia
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Briefs interactivos, encuestas y captación de clientes.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                  <span>Abrir</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Botón Salas & Reuniones */}
              <button
                type="button"
                onClick={() => {
                  setMobileWorkspaceSheetOpen(false);
                  onSelectModule('workspace');
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent('roma-open-workspace-subview', { detail: 'meetings' })
                    );
                  }, 50);
                }}
                className="col-span-2 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-blue-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Salas & Reuniones
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Salas virtuales Bento, Google Meet flotante y acuerdos.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 shrink-0">
                  <span>Abrir</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Botón Pizarras Creativas */}
              <button
                type="button"
                onClick={() => {
                  setMobileWorkspaceSheetOpen(false);
                  onSelectModule('workspace');
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent('roma-open-workspace-subview', { detail: 'whiteboards' })
                    );
                  }, 50);
                }}
                className="col-span-2 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-purple-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Pizarras Creativas
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Lienzos infinitos, diagramas interactivos y notas visuales.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 shrink-0">
                  <span>Abrir</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Botón Brand Guidelines (Pitch Decks) */}
              <button
                type="button"
                onClick={() => {
                  setMobileWorkspaceSheetOpen(false);
                  onSelectModule('workspace');
                  setTimeout(() => {
                    window.dispatchEvent(
                      new CustomEvent('roma-open-workspace-subview', { detail: 'brand-guidelines' })
                    );
                  }, 50);
                }}
                className="col-span-2 p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-amber-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                      Brand Guidelines
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Pitch decks 16:9, diseño suizo, modo 2x2 y vistas públicas con PIN.
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0">
                  <span>Abrir</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            </div>

            {/* Botón Ver Hub General de Workspace */}
            <button
              type="button"
              onClick={() => {
                setMobileWorkspaceSheetOpen(false);
                onSelectModule('workspace');
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent('roma-open-workspace-subview', { detail: 'hub' })
                  );
                }, 50);
              }}
              className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ver Pantalla Principal del Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4.2 SHEET DE MÓDULOS ADICIONALES (MÁS) */}
      {mobileMoreSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="flex-1"
            onClick={() => setMobileMoreSheetOpen(false)}
          />

          <div
            className="w-full max-w-md mx-auto rounded-t-3xl border-t border-x border-slate-200 dark:border-slate-800 p-5 pb-8 space-y-3 shadow-2xl"
            style={{
              backgroundColor: 'var(--app-surface)',
              color: 'var(--app-text)',
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-extrabold text-xs uppercase tracking-wider text-slate-400">
                Más Módulos Roma
              </span>
              <button
                type="button"
                onClick={() => setMobileMoreSheetOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Notas de Pago */}
              {can('payments.view') && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreSheetOpen(false);
                    onSelectModule('payments');
                  }}
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    activeModule === 'payments'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Receipt className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-xs">Notas de Pago</span>
                </button>
              )}

              {/* Órdenes de Servicio */}
              {can('service_orders.view') && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreSheetOpen(false);
                    onSelectModule('service_orders');
                  }}
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    activeModule === 'service_orders'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs">Órdenes (OS)</span>
                </button>
              )}

              {/* Servicios */}
              {can('services.view') && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreSheetOpen(false);
                    onSelectModule('services');
                  }}
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    activeModule === 'services'
                      ? 'bg-violet-50 dark:bg-violet-950/50 border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
                  <span className="text-xs">Servicios</span>
                </button>
              )}

                            {/* Administración */}
              {can('administration.view') && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreSheetOpen(false);
                    onSelectModule('administration');
                  }}
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    activeModule === 'administration'
                      ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="text-xs">Administración</span>
                </button>
              )}

              {/* Configuración */}
              {can('settings.view') && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreSheetOpen(false);
                    onSelectModule('settings');
                  }}
                  className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    activeModule === 'settings'
                      ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Settings className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="text-xs">Configuración</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4.3 BARRA INFERIOR FLOTANTE PRINCIPAL (5 BOTONES) */}
      <nav
        aria-label="Navegación Móvil"
        className="md:hidden fixed bottom-3 inset-x-3 max-w-md mx-auto z-40 rounded-3xl border shadow-xl p-1.5 transition-all duration-200 flex items-center justify-between select-none"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }}
      >
        {/* BOTÓN 1 (IZQ 1): DASHBOARD */}
        <button
          type="button"
          onClick={() => {
            setMobileWorkspaceSheetOpen(false);
            setMobileMoreSheetOpen(false);
            onSelectModule('dashboard');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition cursor-pointer ${
            activeModule === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Dashboard</span>
        </button>

        {/* BOTÓN 2 (IZQ 2): CLIENTES */}
        <button
          type="button"
          onClick={() => {
            setMobileWorkspaceSheetOpen(false);
            setMobileMoreSheetOpen(false);
            onSelectModule('clients');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition cursor-pointer ${
            activeModule === 'clients'
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight truncate max-w-[64px]">
            {clientPluralLabel.split(' ')[0]}
          </span>
        </button>

        {/* BOTÓN 3 (CENTRO - ELEVADO): WORKSPACE */}
        <div className="relative -top-3 shrink-0 px-1">
          <button
            type="button"
            onClick={() => {
              setMobileMoreSheetOpen(false);
              setMobileWorkspaceSheetOpen(!mobileWorkspaceSheetOpen);
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
              activeModule === 'workspace' || mobileWorkspaceSheetOpen
                ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
                : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white'
            }`}
            title="Abrir accesos directos de Workspace"
          >
            <FolderKanban className="w-6 h-6" />
          </button>
        </div>

        {/* BOTÓN 4 (DER 1): COTIZACIONES */}
        <button
          type="button"
          onClick={() => {
            setMobileWorkspaceSheetOpen(false);
            setMobileMoreSheetOpen(false);
            onSelectModule('quotes');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition cursor-pointer ${
            activeModule === 'quotes'
              ? 'text-blue-600 dark:text-blue-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Cotizar</span>
        </button>

        {/* BOTÓN 5 (DER 2): MÁS / MÓDULOS RESTANTES */}
        <button
          type="button"
          onClick={() => {
            setMobileWorkspaceSheetOpen(false);
            setMobileMoreSheetOpen(!mobileMoreSheetOpen);
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition cursor-pointer ${
            ['payments', 'service_orders', 'services', 'settings', 'administration'].includes(activeModule) || mobileMoreSheetOpen
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          {activeModule === 'payments' ? (
            <Receipt className="w-5 h-5 mb-0.5 text-emerald-500" />
          ) : activeModule === 'service_orders' ? (
            <ClipboardList className="w-5 h-5 mb-0.5 text-amber-500" />
          ) : activeModule === 'administration' ? (
            <Building2 className="w-5 h-5 mb-0.5 text-purple-500" />
          ) : (
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
          )}
          <span className="text-[10px] tracking-tight">
            {activeModule === 'payments'
              ? 'Pagos'
              : activeModule === 'service_orders'
              ? 'Órdenes'
              : activeModule === 'administration'
              ? 'Admin'
              : 'Más'}
          </span>
        </button>
      </nav>

      {/* 5. COMMAND PALETTE (CTRL + K / CMD + K) */}
      <ErrorBoundary fallbackTitle="Error en Command Palette">
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onOpenCreator={() => setCreatorModalOpen(true)}
          onSelectModule={onSelectModule}
          onSelectSettingsTab={onSelectSettingsTab}
          onCycleTheme={cycleTheme}
          onLogout={handleLogoutClick}
        />
      </ErrorBoundary>

      {/* 6. CREADOR INTEGRAL RÁPIDO (CLIENTE + MEMBRESÍA/SERVICIO + OS Y PAGO) */}
      <QuickOnboardingCreatorModal
        isOpen={creatorModalOpen}
        onClose={() => setCreatorModalOpen(false)}
        onNavigate={onSelectModule}
      />

      {/* 7. CENTRO DE NOTIFICACIONES MULTITENANT & PWA */}
      <NotificationCenterModal
        isOpen={notificationModalOpen}
        onClose={() => setNotificationModalOpen(false)}
        onNavigateModule={onSelectModule}
      />
    </div>
  );
};
