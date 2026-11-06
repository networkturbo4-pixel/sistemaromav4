import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  Tenant,
  TenantSummary,
  User,
  Role,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_COMPANY_INFO,
  ToastStyleVariant,
  ConfirmModalStyleVariant,
  TypographyScale,
  UserThemePreference,
  AppNotification,
  NotificationType,
} from '../../shared/types';
import { playNotificationChime } from '../utils/notificationSound';
import {
  PermissionKey,
  hasPermission,
  hasAnyPermission,
} from '../../shared/permissions';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  X,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  styleOverride?: ToastStyleVariant;
}

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  styleOverride?: ConfirmModalStyleVariant;
}

interface AppContextValue {
  token: string | null;
  user: User | null;
  role: Role | null;
  tenant: Tenant;
  engineInfo: { engine: string; isPostgresConnected: boolean };
  isLoading: boolean;
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  userThemePreference: UserThemePreference | null;
  setThemeMode: (mode: ThemeMode) => void;
  toggleQuickTheme: () => void;
  saveUserThemePreference: (pref: UserThemePreference | null) => Promise<void>;
  loginWithPin: (pin: string, tenantSlug?: string) => Promise<void>;
  logout: () => void;
  refreshSession: (options?: { silent?: boolean }) => Promise<void>;
  switchTenant: (targetTenantId: string) => Promise<void>;
  tenantsList: TenantSummary[];
  loadTenantsList: () => Promise<TenantSummary[]>;
  isSwitchingTenant: boolean;
  updateTenantState: (updatedTenant: Tenant) => void;
  applyLiveCustomizationPreview: (
    customization: Tenant['customization'],
    prefOverride?: UserThemePreference | null
  ) => void;
  can: (permission: PermissionKey) => boolean;
  canAny: (permissions: PermissionKey[]) => boolean;
  toast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    styleOverride?: ToastStyleVariant
  ) => void;
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning',
    styleOverride?: ToastStyleVariant
  ) => void;
  confirmAction: (options: ConfirmDialogOptions) => Promise<boolean>;
  apiFetch: <T = any>(url: string, options?: RequestInit) => Promise<T>;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  pushPermission: NotificationPermission;
  loadNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  enablePushNotifications: () => Promise<boolean>;
  disablePushNotifications: () => Promise<boolean>;
  sendTestPushNotification: () => Promise<void>;
  notifyModuleAction: (payload: {
    module: string;
    title: string;
    message: string;
    type?: NotificationType;
    entityId?: string;
    action?: string;
    link?: string;
    metadata?: Record<string, any>;
  }) => Promise<void>;
}

const FALLBACK_TENANT: Tenant = {
  id: 'tenant-roma-01',
  slug: 'roma-agencia',
  name: 'ROMA Agencia Creativa & Diseño',
  status: 'active',
  customization: DEFAULT_CUSTOMIZATION,
  companyInfo: DEFAULT_COMPANY_INFO,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const FONT_SIZE_MAP: Record<TypographyScale, string> = {
  compact: '14px',
  normal: '15px',
  comfortable: '16px',
  large: '17.5px',
};

const FONT_FAMILY_MAP: Record<string, string> = {
  'Inter': "'Inter', system-ui, -apple-system, sans-serif",
  'Space Grotesk': "'Space Grotesk', system-ui, -apple-system, sans-serif",
  'Montserrat': "'Montserrat', system-ui, -apple-system, sans-serif",
  'Plus Jakarta Sans': "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  'Outfit': "'Outfit', system-ui, -apple-system, sans-serif",
  'Poppins': "'Poppins', system-ui, -apple-system, sans-serif",
};

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('roma_saas_token')
  );
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [tenant, setTenant] = useState<Tenant>(FALLBACK_TENANT);
  const [engineInfo, setEngineInfo] = useState({
    engine: 'PostgreSQL Ready',
    isPostgresConnected: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Gestión de Tema (Light / Dark / System) siguiendo modern-web-guidance
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('color-scheme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'system';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handler);

    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'color-scheme') {
        const val = e.newValue;
        setThemeModeState(val === 'light' || val === 'dark' ? val : 'system');
        const meta = document.querySelector('meta[name="color-scheme"]');
        if (meta) meta.setAttribute('content', val ?? 'light dark');
      }
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      mq.removeEventListener('change', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : themeMode;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    root.style.colorScheme = resolvedTheme;

    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.setAttribute(
        'content',
        themeMode === 'system' ? 'light dark' : resolvedTheme
      );
    }
  }, [resolvedTheme, themeMode]);

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      try {
        if (mode === 'system') {
          localStorage.removeItem('color-scheme');
        } else {
          localStorage.setItem('color-scheme', mode);
        }
      } catch {}
      setThemeModeState(mode);
    },
    []
  );

  // Two-state toggle para el navbar según modern-web-guidance
  const toggleQuickTheme = useCallback(() => {
    const currentSys: 'light' | 'dark' = systemPrefersDark ? 'dark' : 'light';
    const target: 'light' | 'dark' = resolvedTheme === 'dark' ? 'light' : 'dark';
    if (target === currentSys) {
      setThemeMode('system');
    } else {
      setThemeMode(target);
    }
  }, [resolvedTheme, systemPrefersDark, setThemeMode]);

  // Estado del Tema Personal por Usuario
  const [userThemePreference, setUserThemePreference] = useState<UserThemePreference | null>(null);

  useEffect(() => {
    if (user?.id) {
      try {
        const saved = localStorage.getItem(`roma_user_theme_${user.id}`);
        if (saved) {
          setUserThemePreference(JSON.parse(saved));
          return;
        }
      } catch {}
      if (user.themePreference) {
        setUserThemePreference(user.themePreference);
        try {
          localStorage.setItem(`roma_user_theme_${user.id}`, JSON.stringify(user.themePreference));
        } catch {}
        return;
      }
    }
    setUserThemePreference(null);
  }, [user?.id, user?.themePreference]);

  // Inyección dinámica de variables CSS, tipografía, favicon y título del Tenant
  const applyLiveCustomizationPreview = useCallback(
    (cust: Tenant['customization'], prefOverride?: UserThemePreference | null) => {
      const root = document.documentElement;
      const pref = prefOverride !== undefined ? prefOverride : userThemePreference;

      const ltPrimary = pref?.lightPalette?.primary || cust.lightPalette.primary;
      const ltSecondary = pref?.lightPalette?.secondary || cust.lightPalette.secondary;
      const ltBg = pref?.lightPalette?.background || cust.lightPalette.background;
      const ltSurface = pref?.lightPalette?.surface || cust.lightPalette.surface;
      const ltText = pref?.lightPalette?.textPrimary || cust.lightPalette.textPrimary;
      const ltMuted = pref?.lightPalette?.textMuted || cust.lightPalette.textMuted;

      const dkPrimary = pref?.darkPalette?.primary || cust.darkPalette.primary;
      const dkSecondary = pref?.darkPalette?.secondary || cust.darkPalette.secondary;
      const dkBg = pref?.darkPalette?.background || cust.darkPalette.background;
      const dkSurface = pref?.darkPalette?.surface || cust.darkPalette.surface;
      const dkText = pref?.darkPalette?.textPrimary || cust.darkPalette.textPrimary;
      const dkMuted = pref?.darkPalette?.textMuted || cust.darkPalette.textMuted;

      // Paleta Modo Claro
      root.style.setProperty('--lt-primary', ltPrimary);
      root.style.setProperty('--lt-secondary', ltSecondary);
      root.style.setProperty('--lt-bg', ltBg);
      root.style.setProperty('--lt-surface', ltSurface);
      root.style.setProperty('--lt-text', ltText);
      root.style.setProperty('--lt-muted', ltMuted);

      // Paleta Modo Oscuro
      root.style.setProperty('--dk-primary', dkPrimary);
      root.style.setProperty('--dk-secondary', dkSecondary);
      root.style.setProperty('--dk-bg', dkBg);
      root.style.setProperty('--dk-surface', dkSurface);
      root.style.setProperty('--dk-text', dkText);
      root.style.setProperty('--dk-muted', dkMuted);

      // Determinamos el modo activo real
      const isDark = resolvedTheme === 'dark';
      const activePrimary = isDark ? dkPrimary : ltPrimary;
      const activeSecondary = isDark ? dkSecondary : ltSecondary;
      const activeBg = isDark ? dkBg : ltBg;
      const activeSurface = isDark ? dkSurface : ltSurface;
      const activeText = isDark ? dkText : ltText;
      const activeMuted = isDark ? dkMuted : ltMuted;
      const activeBorder = isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(15, 23, 42, 0.09)';

      // Variables unificadas del sistema activo
      root.style.setProperty('--app-primary', activePrimary);
      root.style.setProperty('--app-secondary', activeSecondary);
      root.style.setProperty('--app-bg', activeBg);
      root.style.setProperty('--app-surface', activeSurface);
      root.style.setProperty('--app-text', activeText);
      root.style.setProperty('--app-muted', activeMuted);
      root.style.setProperty('--app-border', activeBorder);

      // Overrides dinámicos en tiempo real para las clases de Tailwind v4
      if (isDark) {
        root.style.setProperty('--color-slate-950', dkBg);
        root.style.setProperty('--color-slate-900', dkSurface);
        root.style.setProperty('--color-slate-850', dkSurface);
        root.style.setProperty(
          '--color-slate-800',
          `color-mix(in srgb, ${dkSurface} 80%, white 20%)`
        );
        root.style.setProperty('--color-indigo-600', dkPrimary);
        root.style.setProperty('--color-indigo-500', dkPrimary);
        root.style.setProperty('--color-indigo-400', dkPrimary);
      } else {
        root.style.setProperty('--color-slate-50', ltBg);
        root.style.setProperty('--color-slate-950', '#020617');
        root.style.setProperty('--color-slate-900', '#0f172a');
        root.style.setProperty('--color-slate-800', '#1e293b');
        root.style.setProperty('--color-indigo-600', ltPrimary);
        root.style.setProperty('--color-indigo-500', ltPrimary);
        root.style.setProperty('--color-indigo-400', ltPrimary);
      }

      // Tamaño y familia de tipografía global
      const typo = pref?.typographyScale || cust.typographyScale;
      root.style.setProperty(
        '--app-font-size',
        FONT_SIZE_MAP[typo] || '15px'
      );
      const fontKey = pref?.fontFamily || cust.fontFamily || 'Inter';
      root.style.setProperty(
        '--app-font-family',
        FONT_FAMILY_MAP[fontKey] || FONT_FAMILY_MAP['Inter']
      );

      // Favicon dinámico & Manifest PWA por Tenant
      const activeFavicon =
        cust.faviconUrl ||
        cust.logoPwaUrl ||
        cust.logoLightUrl ||
        cust.logoDarkUrl ||
        `/api/public/tenant-icon?tenant=${encodeURIComponent(tenant.slug)}`;

      const fav = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
      if (fav) fav.href = activeFavicon;

      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = activeFavicon;

      const manifest = document.getElementById('dynamic-manifest') as HTMLLinkElement | null;
      if (manifest) {
        manifest.href = `/api/public/manifest.webmanifest?tenant=${encodeURIComponent(tenant.slug)}`;
      }
    },
    [userThemePreference, resolvedTheme, tenant.slug]
  );

  useEffect(() => {
    applyLiveCustomizationPreview(tenant.customization, userThemePreference);
    document.title = `${tenant.companyInfo.commercialName || tenant.name} — Sistema SaaS`;
  }, [tenant, userThemePreference, resolvedTheme, applyLiveCustomizationPreview]);

  // Sistema de Toasts Configurables
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'success',
      styleOverride?: ToastStyleVariant
    ) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type, styleOverride }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3800);
    },
    []
  );

  // Sistema de Modal de Confirmación Nativo (<dialog closedby="any"> + fallback)
  const confirmDialogRef = useRef<HTMLDialogElement | null>(null);
  const confirmResolverRef = useRef<((accepted: boolean) => void) | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmDialogOptions>({
    title: 'Confirmar acción',
    message: '¿Estás seguro de continuar?',
  });

  // Fallback obligatorio de light-dismiss para navegadores sin soporte nativo de closedBy
  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      if (confirmResolverRef.current) {
        confirmResolverRef.current(false);
        confirmResolverRef.current = null;
      }
    };
    dialog.addEventListener('close', handleClose);

    let handleBackdropClick: ((event: MouseEvent) => void) | null = null;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (handleBackdropClick) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, []);

  const confirmAction = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
      const dialog = confirmDialogRef.current;
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
    });
  }, []);

  const handleConfirmDecision = (accepted: boolean) => {
    if (confirmResolverRef.current) {
      confirmResolverRef.current(accepted);
      confirmResolverRef.current = null;
    }
    confirmDialogRef.current?.close();
  };

  // Helper de llamadas API con Token Multitenant
  const apiFetch = useCallback(
    async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status} en la solicitud.`);
      }
      return data as T;
    },
    [token]
  );

  const refreshSession = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoading(true);
      }
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tenantParam = urlParams.get('tenant') || undefined;

        if (!token) {
          const pub = await fetch(
            `/api/public/tenant-branding${tenantParam ? `?tenant=${tenantParam}` : ''}`
          ).then((r) => r.json());
          if (pub?.tenant) setTenant(pub.tenant);
          if (pub?.engineInfo) setEngineInfo(pub.engineInfo);
          setUser(null);
          setRole(null);
          return;
        }

        const data = await apiFetch('/api/auth/me');
        setUser(data.user);
        setRole(data.role);
        setTenant(data.tenant);
        if (data.engineInfo) setEngineInfo(data.engineInfo);
      } catch {
        localStorage.removeItem('roma_saas_token');
        setToken(null);
        setUser(null);
        setRole(null);
      } finally {
        if (!options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [token, apiFetch]
  );

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const [isSwitchingTenant, setIsSwitchingTenant] = useState<boolean>(false);
  const [tenantsList, setTenantsList] = useState<TenantSummary[]>([]);

  const loadTenantsList = useCallback(async (): Promise<TenantSummary[]> => {
    const hasTenantPerm =
      role?.isSystem ||
      role?.permissions?.includes('*') ||
      role?.permissions?.includes('settings.tenants.view') ||
      role?.permissions?.includes('settings.tenants.manage');

    if (token && user && hasTenantPerm) {
      try {
        const data = await apiFetch('/api/tenants');
        if (Array.isArray(data.tenants)) {
          setTenantsList(data.tenants);
          return data.tenants;
        }
      } catch {}
    }

    try {
      const pub = await fetch('/api/public/tenants').then((r) => r.json());
      if (Array.isArray(pub.tenants)) {
        const normalized = pub.tenants.map((t: any) => ({
          ...t,
          customization: t.customization || {
            currencyCode: t.currencyCode || 'PEN',
            currencySymbol: t.currencySymbol || 'S/',
            logoLightUrl: t.logoLightUrl || '',
            logoDarkUrl: t.logoDarkUrl || '',
          },
        }));
        setTenantsList(normalized);
        return normalized;
      }
    } catch {}
    return [];
  }, [apiFetch, token, user, role]);

  useEffect(() => {
    if (token && user) {
      loadTenantsList();
    }
  }, [token, user, loadTenantsList]);

  const switchTenant = useCallback(
    async (targetTenantId: string) => {
      if (targetTenantId === tenant.id) return;
      setIsSwitchingTenant(true);
      try {
        const data = await apiFetch('/api/auth/switch-tenant', {
          method: 'POST',
          body: JSON.stringify({ targetTenantId }),
        });
        localStorage.setItem('roma_saas_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setRole(data.role);
        setTenant(data.tenant);
        if (data.engineInfo) setEngineInfo(data.engineInfo);
        toast(`Espacio cambiado a "${data.tenant.name}"`);
        loadTenantsList();
      } catch (err) {
        toast((err as Error).message, 'error');
      } finally {
        setIsSwitchingTenant(false);
      }
    },
    [tenant.id, apiFetch, toast, loadTenantsList]
  );

  const loginWithPin = async (pin: string, tenantSlug?: string) => {
    const data = await apiFetch('/api/auth/login-pin', {
      method: 'POST',
      body: JSON.stringify({ pin, tenantSlug }),
    });
    localStorage.setItem('roma_saas_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setRole(data.role);
    setTenant(data.tenant);
    if (data.engineInfo) setEngineInfo(data.engineInfo);
    toast(`¡Bienvenido, ${data.user.name.split(' ')[0]}! Conectado a ${data.tenant.name}`);
    loadTenantsList();
  };

  const logout = () => {
    localStorage.removeItem('roma_saas_token');
    setToken(null);
    setUser(null);
    setRole(null);
    setUserThemePreference(null);
    toast('Sesión finalizada correctamente', 'info');
  };

  const updateTenantState = (updatedTenant: Tenant) => {
    setTenant(updatedTenant);
  };

  const saveUserThemePreference = useCallback(
    async (pref: UserThemePreference | null) => {
      if (!user) return;
      setUserThemePreference(pref);
      try {
        if (pref) {
          localStorage.setItem(`roma_user_theme_${user.id}`, JSON.stringify(pref));
        } else {
          localStorage.removeItem(`roma_user_theme_${user.id}`);
        }
      } catch {}

      applyLiveCustomizationPreview(tenant.customization, pref);

      try {
        await apiFetch('/api/users/me/theme', {
          method: 'PUT',
          body: JSON.stringify({ themePreference: pref }),
        });
        if (pref) {
          toast(`Estilo visual personal guardado para ${user.name.split(' ')[0]}`);
        } else {
          toast('Se restableció el estilo institucional del tenant.');
        }
      } catch (err) {
        toast((err as Error).message, 'error');
      }
    },
    [user, tenant.customization, applyLiveCustomizationPreview, apiFetch, toast]
  );

  const can = useCallback(
    (permission: PermissionKey): boolean => {
      if (
        role?.isSystem ||
        role?.name.toLowerCase().includes('super') ||
        role?.name.toLowerCase().includes('admin')
      ) {
        return true;
      }
      return hasPermission(role?.permissions, permission);
    },
    [role]
  );

  const canAny = useCallback(
    (permissions: PermissionKey[]): boolean => {
      if (
        role?.isSystem ||
        role?.name.toLowerCase().includes('super') ||
        role?.name.toLowerCase().includes('admin')
      ) {
        return true;
      }
      return hasAnyPermission(role?.permissions, permissions);
    },
    [role]
  );

  // ===========================================================================
  // SISTEMA DE NOTIFICACIONES MULTITENANT & PWA PUSH
  // ===========================================================================

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const isPushSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  // Convertir clave VAPID de base64 a Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Cargar estado de suscripción Push al inicio
  useEffect(() => {
    if (!isPushSupported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsPushSubscribed(!!sub);
      })
      .catch(() => {});
  }, [isPushSupported]);

  // Cargar notificaciones desde el backend
  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<{ notifications: AppNotification[] }>(
        '/api/notifications?limit=50'
      );
      if (res && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.warn('[Notifications] Error cargando notificaciones:', err);
    }
  }, [token, apiFetch]);

  // Marcar una notificación como leída
  const markNotificationAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      try {
        await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      } catch (err) {
        console.warn('[Notifications] Error al marcar leída:', err);
      }
    },
    [apiFetch]
  );

  // Marcar todas las notificaciones como leídas
  const markAllNotificationsAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      toast('Todas las notificaciones marcadas como leídas', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }, [apiFetch, toast]);

  // Eliminar una notificación
  const deleteNotification = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      try {
        await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('[Notifications] Error eliminando notificación:', err);
      }
    },
    [apiFetch]
  );

  // Limpiar todo el historial de notificaciones
  const clearAllNotifications = useCallback(async () => {
    const confirmed = await confirmAction({
      title: '¿Limpiar todas las notificaciones?',
      message: 'Se eliminará el historial de alertas registradas en este espacio.',
      confirmText: 'Sí, limpiar todo',
      danger: true,
    });
    if (!confirmed) return;

    setNotifications([]);
    try {
      await apiFetch('/api/notifications', { method: 'DELETE' });
      toast('Historial de notificaciones limpiado', 'info');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }, [apiFetch, confirmAction, toast]);

  // Activar notificaciones push para el celular / PWA
  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported) {
      toast(
        'Tu dispositivo o navegador no soporta notificaciones push. En iPhone, añade la web a la Pantalla de Inicio (PWA) primero.',
        'warning'
      );
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== 'granted') {
        toast(
          'Permiso no concedido. Ve a los ajustes del navegador y autoriza las notificaciones.',
          'warning'
        );
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await apiFetch<{ publicKey: string }>(
        '/api/notifications/vapid-key'
      );
      if (!publicKey) {
        throw new Error('No se pudo obtener la clave VAPID pública del servidor');
      }

      const convertedKey = urlBase64ToUint8Array(publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      await apiFetch('/api/notifications/push-subscribe', {
        method: 'POST',
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
        }),
      });

      setIsPushSubscribed(true);
      toast('🔔 ¡Notificaciones móviles activadas exitosamente en este celular!', 'success');

      // Enviar una prueba inmediata para verificar que suene/vibre en el celular
      setTimeout(() => {
        apiFetch('/api/notifications/test-push', { method: 'POST' }).catch(() => {});
      }, 500);

      return true;
    } catch (err: any) {
      toast('Error al activar notificaciones móviles: ' + err.message, 'error');
      return false;
    }
  }, [isPushSupported, apiFetch, toast]);

  // Desactivar notificaciones push
  const disablePushNotifications = useCallback(async (): Promise<boolean> => {
    if (!isPushSupported) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await apiFetch('/api/notifications/push-unsubscribe', {
          method: 'POST',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
      }
      setIsPushSubscribed(false);
      toast('Notificaciones push desactivadas en este dispositivo.', 'info');
      return true;
    } catch (err: any) {
      toast('Error al desactivar notificaciones: ' + err.message, 'error');
      return false;
    }
  }, [isPushSupported, apiFetch, toast]);

  // Enviar notificación de prueba al celular
  const sendTestPushNotification = useCallback(async () => {
    try {
      await apiFetch('/api/notifications/test-push', { method: 'POST' });
      toast('🚀 Notificación de prueba enviada a tu celular.', 'success');
    } catch (err: any) {
      toast('Error al enviar prueba: ' + err.message, 'error');
    }
  }, [apiFetch, toast]);

  // Conexión universal para que CUALQUIER módulo nuevo o presente dispare notificaciones
  const notifyModuleAction = useCallback(
    async (payload: {
      module: string;
      title: string;
      message: string;
      type?: NotificationType;
      entityId?: string;
      action?: string;
      link?: string;
      metadata?: Record<string, any>;
    }) => {
      try {
        const res = await apiFetch<{ notification: AppNotification }>(
          '/api/notifications/notify',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        if (res?.notification) {
          setNotifications((prev) => [res.notification, ...prev]);
          playNotificationChime();
        }
      } catch (err) {
        console.warn('[Notifications] Error notificando acción:', err);
      }
    },
    [apiFetch]
  );

  // Escucha en tiempo real (Server-Sent Events) con reconexión automática y polling de respaldo
  useEffect(() => {
    if (!token || !user) return;

    loadNotifications();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(
        `/api/notifications/stream?token=${encodeURIComponent(token)}`
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification' && data.notification) {
            const newNotif = data.notification as AppNotification;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });

            // Reproducir sonido chime
            playNotificationChime();

            // Si fue otra persona o el sistema, mostrar Toast
            if (newNotif.actorUserId !== user.id) {
              toast(`${newNotif.title}: ${newNotif.message}`, newNotif.type);
            }
          }
        } catch (e) {}
      };
    } catch (e) {
      console.warn('[SSE] EventSource no disponible:', e);
    }

    // Polling de respaldo cada 30 segundos
    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(pollInterval);
    };
  }, [token, user?.id, loadNotifications, toast]);

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  // Posición dinámica y responsive del contenedor de Toasts por dispositivo (PC, Tablet, Celular)
  const desktopToastPos =
    tenant.customization.toastPositions?.desktop ||
    tenant.customization.toastPosition ||
    'top-right';
  const tabletToastPos =
    tenant.customization.toastPositions?.tablet ||
    tenant.customization.toastPosition ||
    'top-center';
  const mobileToastPos =
    tenant.customization.toastPositions?.mobile ||
    'top-center';

  const getResponsiveToastClasses = (
    mobilePos: ToastPosition,
    tabletPos: ToastPosition,
    desktopPos: ToastPosition
  ): string => {
    const getMobile = (p: ToastPosition) => {
      switch (p) {
        case 'top-left':
          return 'top-4 left-4 items-start';
        case 'top-center':
          return 'top-4 left-1/2 -translate-x-1/2 items-center';
        case 'bottom-left':
          return 'bottom-20 left-4 items-start';
        case 'bottom-center':
          return 'bottom-20 left-1/2 -translate-x-1/2 items-center';
        case 'bottom-right':
          return 'bottom-20 right-4 items-end';
        case 'top-right':
        default:
          return 'top-4 right-4 items-end';
      }
    };

    const getTablet = (p: ToastPosition) => {
      switch (p) {
        case 'top-left':
          return 'md:top-5 md:left-5 md:right-auto md:bottom-auto md:translate-x-0 md:items-start';
        case 'top-center':
          return 'md:top-5 md:left-1/2 md:right-auto md:bottom-auto md:-translate-x-1/2 md:items-center';
        case 'bottom-left':
          return 'md:bottom-6 md:left-5 md:top-auto md:right-auto md:translate-x-0 md:items-start';
        case 'bottom-center':
          return 'md:bottom-6 md:left-1/2 md:top-auto md:right-auto md:-translate-x-1/2 md:items-center';
        case 'bottom-right':
          return 'md:bottom-6 md:right-5 md:top-auto md:left-auto md:translate-x-0 md:items-end';
        case 'top-right':
        default:
          return 'md:top-5 md:right-5 md:left-auto md:bottom-auto md:translate-x-0 md:items-end';
      }
    };

    const getDesktop = (p: ToastPosition) => {
      switch (p) {
        case 'top-left':
          return 'lg:top-6 lg:left-6 lg:right-auto lg:bottom-auto lg:translate-x-0 lg:items-start';
        case 'top-center':
          return 'lg:top-6 lg:left-1/2 lg:right-auto lg:bottom-auto lg:-translate-x-1/2 lg:items-center';
        case 'bottom-left':
          return 'lg:bottom-6 lg:left-6 lg:top-auto lg:right-auto lg:translate-x-0 lg:items-start';
        case 'bottom-center':
          return 'lg:bottom-6 lg:left-1/2 lg:top-auto lg:right-auto lg:-translate-x-1/2 lg:items-center';
        case 'bottom-right':
          return 'lg:bottom-6 lg:right-6 lg:top-auto lg:left-auto lg:translate-x-0 lg:items-end';
        case 'top-right':
        default:
          return 'lg:top-6 lg:right-6 lg:left-auto lg:bottom-auto lg:translate-x-0 lg:items-end';
      }
    };

    return `${getMobile(mobilePos)} ${getTablet(tabletPos)} ${getDesktop(desktopPos)}`;
  };

  const toastPosClass = getResponsiveToastClasses(mobileToastPos, tabletToastPos, desktopToastPos);

  const activeModalStyle =
    confirmState.styleOverride || tenant.customization.confirmModalStyle;

  return (
    <AppContext.Provider
      value={{
        token,
        user,
        role,
        tenant,
        engineInfo,
        isLoading,
        themeMode,
        resolvedTheme,
        userThemePreference,
        setThemeMode,
        toggleQuickTheme,
        saveUserThemePreference,
        loginWithPin,
        logout,
        refreshSession,
        switchTenant,
        tenantsList,
        loadTenantsList,
        isSwitchingTenant,
        updateTenantState,
        applyLiveCustomizationPreview,
        can,
        canAny,
        toast,
        showToast: toast,
        confirmAction,
        apiFetch,
        notifications,
        unreadNotificationsCount,
        isPushSupported,
        isPushSubscribed,
        pushPermission,
        loadNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
        enablePushNotifications,
        disablePushNotifications,
        sendTestPushNotification,
        notifyModuleAction,
      }}
    >
      {children}

      {/* CONTENEDOR GLOBAL DE TOASTS PERSONALIZABLES POR TENANT */}
      <div
        className={`fixed z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4 sm:px-0 ${toastPosClass}`}
      >
        {toasts.map((item) => {
          const styleVariant = item.styleOverride || tenant.customization.toastStyle;
          const icon =
            item.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : item.type === 'error' ? (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : item.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-sky-400 shrink-0" />
            );

          let variantClass = '';
          if (styleVariant === 'glass') {
            variantClass =
              'backdrop-blur-xl bg-slate-900/85 dark:bg-slate-900/90 text-white border border-white/15 rounded-2xl shadow-2xl px-4 py-3.5';
          } else if (styleVariant === 'minimal') {
            variantClass =
              'tenant-surface tenant-text border-l-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg px-4 py-3';
          } else if (styleVariant === 'solid') {
            variantClass =
              item.type === 'error'
                ? 'bg-rose-600 text-white rounded-xl shadow-xl px-4 py-3.5 font-medium'
                : 'tenant-btn-primary text-white rounded-xl shadow-xl px-4 py-3.5 font-medium';
          } else {
            // 'pill'
            variantClass =
              'backdrop-blur-md bg-slate-950/90 text-white border border-purple-500/30 rounded-full shadow-2xl px-5 py-2.5';
          }

          return (
            <div
              key={item.id}
              style={
                styleVariant === 'minimal'
                  ? { borderLeftColor: 'var(--app-primary)' }
                  : undefined
              }
              className={`pointer-events-auto flex items-center gap-3 transition-all duration-200 ${variantClass}`}
            >
              {icon}
              <p className="text-sm leading-snug flex-1">{item.message}</p>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== item.id))
                }
                className="opacity-70 hover:opacity-100 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL DE CONFIRMACIÓN NATIVO (<dialog closedby="any">) PERSONALIZABLE POR TENANT */}
      <dialog
        ref={confirmDialogRef}
        closedby="any"
        aria-labelledby="confirm-dialog-title"
        className={`m-auto p-0 border-0 outline-none bg-transparent max-w-md w-[92vw] ${
          activeModalStyle === 'compact-sheet' ? 'max-w-sm' : 'max-w-md'
        }`}
      >
        <div
          className={`overflow-hidden transition-all ${
            activeModalStyle === 'glass-blur'
              ? 'backdrop-blur-2xl bg-slate-900/85 text-white border border-white/15 rounded-3xl shadow-2xl p-6'
              : activeModalStyle === 'split-banner'
              ? 'tenant-surface tenant-text border tenant-border rounded-3xl shadow-2xl'
              : activeModalStyle === 'compact-sheet'
              ? 'tenant-surface tenant-text border tenant-border rounded-2xl shadow-xl p-5'
              : 'tenant-surface tenant-text border tenant-border rounded-3xl shadow-2xl p-6 text-center'
          }`}
        >
          {activeModalStyle === 'split-banner' && (
            <div
              className={`px-6 py-4 flex items-center gap-3 text-white ${
                confirmState.danger
                  ? 'bg-rose-600'
                  : 'tenant-btn-primary'
              }`}
            >
              {confirmState.danger ? (
                <ShieldAlert className="w-6 h-6 shrink-0" />
              ) : (
                <Sparkles className="w-6 h-6 shrink-0" />
              )}
              <h3 id="confirm-dialog-title" className="font-bold text-base">
                {confirmState.title}
              </h3>
            </div>
          )}

          <div className={activeModalStyle === 'split-banner' ? 'p-6' : ''}>
            {activeModalStyle !== 'split-banner' && (
              <div
                className={`flex items-center gap-3 mb-3 ${
                  activeModalStyle === 'modern-center'
                    ? 'flex-col justify-center'
                    : 'flex-row'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    confirmState.danger
                      ? 'bg-rose-500/15 text-rose-500'
                      : 'bg-purple-500/15 text-purple-500'
                  }`}
                >
                  {confirmState.danger ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : (
                    <Sparkles className="w-6 h-6" />
                  )}
                </div>
                <h3 id="confirm-dialog-title" className="font-bold text-lg">
                  {confirmState.title}
                </h3>
              </div>
            )}

            <p
              className={`text-sm leading-relaxed mb-6 ${
                activeModalStyle === 'glass-blur' ? 'text-slate-300' : 'tenant-muted'
              }`}
            >
              {confirmState.message}
            </p>

            <div
              className={`flex gap-3 ${
                activeModalStyle === 'modern-center' ? 'justify-center' : 'justify-end'
              }`}
            >
              <button
                type="button"
                onClick={() => handleConfirmDecision(false)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                  activeModalStyle === 'glass-blur'
                    ? 'border-white/20 text-white hover:bg-white/10'
                    : 'tenant-border hover:bg-slate-500/10'
                }`}
              >
                {confirmState.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDecision(true)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition ${
                  confirmState.danger
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'tenant-btn-primary'
                }`}
              >
                {confirmState.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe utilizarse dentro de <AppProvider>');
  return ctx;
}

/**
 * Componente declarativo global para proteger secciones o botones según permisos granulares
 */
export const PermissionGate: React.FC<{
  permission: PermissionKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ permission, fallback = null, children }) => {
  const { can } = useApp();
  if (!can(permission)) return <>{fallback}</>;
  return <>{children}</>;
};
