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
} from '../../shared/types';
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

      // Favicon dinámico
      if (cust.faviconUrl) {
        const fav = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
        if (fav) fav.href = cust.faviconUrl;
      }
    },
    [userThemePreference, resolvedTheme]
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

  // Posición dinámica del contenedor de Toasts según configuración del Tenant
  const toastPosClass =
    tenant.customization.toastPosition === 'top-right'
      ? 'top-5 right-5 items-end'
      : tenant.customization.toastPosition === 'top-center'
      ? 'top-5 left-1/2 -translate-x-1/2 items-center'
      : 'bottom-20 md:bottom-6 right-5 items-end';

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
