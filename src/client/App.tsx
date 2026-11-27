import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { PermissionKey } from '../shared/permissions';
import { PinLoginScreen } from './components/PinLoginScreen';
import { AppShell, ActiveModule } from './components/AppShell';
import type { SettingsTab } from './modules/SettingsModule';
import { DriveUploadProvider } from './context/DriveUploadContext';
import { AttendanceGateModal } from './components/AttendanceGateModal';
import { MusicPlayerProvider } from './context/MusicPlayerContext';
import { YouTubeAudioEngine } from './components/music/YouTubeAudioEngine';

// Code-splitting por módulo y vistas públicas para carga inicial ultrarrápida
const DashboardModule = lazy(() => import('./modules/DashboardModule').then((m) => ({ default: m.DashboardModule })));
const ClientsModule = lazy(() => import('./modules/ClientsModule').then((m) => ({ default: m.ClientsModule })));
const QuotesModule = lazy(() => import('./modules/QuotesModule').then((m) => ({ default: m.QuotesModule })));
const ServicesModule = lazy(() => import('./modules/ServicesModule').then((m) => ({ default: m.ServicesModule })));
const PaymentNotesModule = lazy(() => import('./modules/PaymentNotesModule').then((m) => ({ default: m.PaymentNotesModule })));
const WorkspaceModule = lazy(() => import('./modules/WorkspaceModule').then((m) => ({ default: m.WorkspaceModule })));
const ServiceOrdersModule = lazy(() => import('./modules/ServiceOrdersModule').then((m) => ({ default: m.ServiceOrdersModule })));
const DriveModule = lazy(() => import('./modules/DriveModule').then((m) => ({ default: m.DriveModule })));
const SettingsModule = lazy(() => import('./modules/SettingsModule').then((m) => ({ default: m.SettingsModule })));
const AdministrationModule = lazy(() => import('./modules/AdministrationModule').then((m) => ({ default: m.AdministrationModule })));
const ClientPortal = lazy(() => import('./modules/ClientPortal').then((m) => ({ default: m.ClientPortal })));

const PublicQuoteView = lazy(() => import('./components/PublicQuoteView').then((m) => ({ default: m.PublicQuoteView })));
const PublicServicesCatalogView = lazy(() => import('./components/PublicServicesCatalogView').then((m) => ({ default: m.PublicServicesCatalogView })));
const PublicServiceDetailView = lazy(() => import('./components/PublicServiceDetailView').then((m) => ({ default: m.PublicServiceDetailView })));
const PublicPaymentNoteView = lazy(() => import('./components/PublicPaymentNoteView').then((m) => ({ default: m.PublicPaymentNoteView })));
const PublicServiceOrderView = lazy(() => import('./components/PublicServiceOrderView').then((m) => ({ default: m.PublicServiceOrderView })));
const PublicWorkspaceMonthView = lazy(() => import('./components/PublicWorkspaceMonthView').then((m) => ({ default: m.PublicWorkspaceMonthView })));
const PublicBiolinkView = lazy(() => import('./components/PublicBiolinkView').then((m) => ({ default: m.PublicBiolinkView })));
const PublicEmployeePaymentsView = lazy(() => import('./components/PublicEmployeePaymentsView').then((m) => ({ default: m.PublicEmployeePaymentsView })));
const PublicFormView = lazy(() => import('./components/PublicFormView').then((m) => ({ default: m.PublicFormView })));
const PublicBrandGuidelineView = lazy(() => import('./components/PublicBrandGuidelineView').then((m) => ({ default: m.PublicBrandGuidelineView })));
const PublicSoftwareProjectView = lazy(() => import('./components/PublicSoftwareProjectView').then((m) => ({ default: m.PublicSoftwareProjectView })));

const RouteFallback: React.FC = () => (
  <div className="min-h-dvh tenant-bg tenant-text flex flex-col items-center justify-center gap-3">
    <div className="w-10 h-10 rounded-2xl tenant-btn-primary animate-pulse flex items-center justify-center font-extrabold text-white text-lg shadow-lg">
      R
    </div>
    <p className="text-xs font-semibold tenant-muted">Cargando módulo...</p>
  </div>
);

const MainRouter: React.FC = () => {
  const { user, role, isLoading, can, logout, attendanceCheck, setAttendanceCheck } = useApp();

  // 1. Detección de enlace público de catálogo de servicios
  const [isPublicCatalog] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (
        urlParams.get('catalogo') === 'servicios' ||
        urlParams.get('modulo') === 'servicios-publico' ||
        urlParams.has('servicios') ||
        urlParams.has('catalogo')
      ) {
        return true;
      }
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      if (path === '/servicios' || path === '/p/servicios') {
        return true;
      }
    } catch {}
    return false;
  });

  // 2. Detección de enlace público de detalle de servicio
  const [publicServiceSlug] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const s = urlParams.get('servicio') || urlParams.get('s') || urlParams.get('service');
      if (s) return s;

      const path = window.location.pathname;
      const match = path.match(/^\/(?:s|servicio|p\/servicio)\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
    return null;
  });

  // 3. Detección de enlace público de cotización para clientes (sin requerir PIN de acceso)
  const [publicQuoteToken] = useState<string | null>(() => {
    try {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      // Excluir expresamente rutas del catálogo y detalle de servicios
      if (
        path === '/servicios' ||
        path === '/p/servicios' ||
        path.startsWith('/servicio/') ||
        path.startsWith('/p/servicio/') ||
        path.startsWith('/s/')
      ) {
        return null;
      }

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('servicios') || urlParams.has('catalogo') || urlParams.has('servicio')) {
        return null;
      }

      const q =
        urlParams.get('q') ||
        urlParams.get('quote') ||
        urlParams.get('c') ||
        urlParams.get('cotizacion');
      if (q) return q;

      const pathMatch = window.location.pathname.match(/^\/(?:q|c|cotizacion|p\/cotizacion)\/([^/?#]+)/i);
      if (pathMatch && pathMatch[1]) {
        return decodeURIComponent(pathMatch[1]);
      }

      // /p/:token pero excluyendo expresamente "servicios" y "servicio"
      const pMatch = window.location.pathname.match(/^\/p\/([^/?#]+)/i);
      if (pMatch && pMatch[1]) {
        const candidate = decodeURIComponent(pMatch[1]).toLowerCase();
        if (
          candidate !== 'servicios' &&
          candidate !== 'servicio' &&
          candidate !== 'dev' &&
          !candidate.startsWith('pago') &&
          !candidate.startsWith('nota')
        ) {
          return decodeURIComponent(pMatch[1]);
        }
      }
    } catch {}
    return null;
  });

  // 4. Detección de enlace público de nota de pago
  const [publicPaymentNoteToken] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const p = urlParams.get('np') || urlParams.get('pago') || urlParams.get('nota');
      if (p) return p;

      const path = window.location.pathname;
      const match = path.match(/^\/(?:np|pago|nota|p\/pago|p\/nota)\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
    return null;
  });

  // 5. Detección de enlace público de Orden de Servicio (OS)
  const [publicServiceOrderToken] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const os = urlParams.get('os') || urlParams.get('orden') || urlParams.get('servicio_orden');
      if (os) return os;

      const path = window.location.pathname;
      const match = path.match(/^\/(?:os|orden|p\/os|p\/orden)\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
    return null;
  });

  // 6. Detección de enlace público de Workspace (grilla mensual de contenidos de redes sociales)
  const [publicWorkspaceToken] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const w = urlParams.get('w') || urlParams.get('workspace') || urlParams.get('grilla');
      if (w) return w;

      const path = window.location.pathname;
      const match = path.match(/^\/(?:w|grilla|p\/w|p\/workspace)\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
    return null;
  });

  // 8. Detección de enlace público de historial de pagos de colaborador
  const [publicPersonalToken] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const p = urlParams.get('personal') || urlParams.get('payroll') || urlParams.get('colaborador');
      if (p) return p;

      const path = window.location.pathname;
      const match = path.match(/^\/(?:personal|payroll|pago-personal|p\/personal)\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
    return null;
  });

  // 7. Detección de enlace público de Biolink (tipo Linktree /b/:slug)
  const [publicBiolinkSlug] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const bio = urlParams.get('b') || urlParams.get('bio') || urlParams.get('linktree') || urlParams.get('biolink');
      if (bio) return bio;

      const path = window.location.pathname;
      const match = path.match(/^\/(?:b|bio|linktree)\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
    return null;
  });

  // 9. Detección de enlace público de Formulario (/f/:slug o /form/:slug o ?f=:slug)
  const [publicFormSlug] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const f = urlParams.get('f') || urlParams.get('form') || urlParams.get('formulario');
      if (f) return f;

      const path = window.location.pathname;
      const match = path.match(/^\/(?:f|form|formulario)\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
    return null;
  });

  // 10. Detección de enlace público de Brand Guidelines / Pitch Deck (/brand/:token o /p/brand/:token o ?brand=:token)
  const [publicBrandToken] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const b = urlParams.get('brand') || urlParams.get('deck') || urlParams.get('guideline');
      if (b) return b;

      const path = window.location.pathname;
      const match = path.match(/^\/(?:brand|deck|guidelines|p\/brand|p\/deck)\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
    return null;
  });

  // 11. Detección de enlace público de Proyecto de Desarrollo de Software (/dev/:token o /p/dev/:token o ?dev=:token)
  const [publicSoftwareToken] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const d = urlParams.get('dev') || urlParams.get('software');
      if (d) return d;

      const path = window.location.pathname;
      const match = path.match(/^\/(?:dev|p\/dev)\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {}
    return null;
  });

  // Persistencia de módulo activo al recargar la página (F5 o navegación)
  const [activeModule, setActiveModuleState] = useState<ActiveModule>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const mod = urlParams.get('module') as ActiveModule | null;
      if (
        mod &&
        [
          'dashboard',
          'clients',
          'quotes',
          'services',
          'payments',
          'workspace',
          'service_orders',
          'drive',
          'settings',
        ].includes(mod)
      ) {
        return mod;
      }
      const saved = localStorage.getItem('roma_saas_active_module') as ActiveModule | null;
      if (
        saved &&
        [
          'dashboard',
          'clients',
          'quotes',
          'services',
          'payments',
          'workspace',
          'service_orders',
          'drive',
          'settings',
        ].includes(saved)
      ) {
        return saved;
      }
    } catch {}
    return 'dashboard';
  });

  // Persistencia de sub-pestaña de configuración al recargar o guardar entidades
  const [settingsSubTab, setSettingsSubTabState] = useState<SettingsTab>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab') as SettingsTab | null;
      if (tab && ['identity', 'appearance', 'dialogs', 'company', 'users', 'roles', 'tenants', 'system-update', 'drive'].includes(tab)) {
        return tab;
      }
      const saved = localStorage.getItem('roma_saas_settings_tab') as SettingsTab | null;
      if (saved && ['identity', 'appearance', 'dialogs', 'company', 'users', 'roles', 'tenants', 'system-update', 'drive'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'appearance';
  });

  const setActiveModule = (mod: ActiveModule) => {
    setActiveModuleState(mod);
    try {
      localStorage.setItem('roma_saas_active_module', mod);
      const url = new URL(window.location.href);
      url.searchParams.set('module', mod);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  const setSettingsSubTab = (tab: SettingsTab) => {
    setSettingsSubTabState(tab);
    try {
      localStorage.setItem('roma_saas_settings_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  // Redirigir al primer módulo permitido si el usuario no tiene acceso al módulo seleccionado
  // (IMPORTANTE: Este Hook debe estar al inicio antes de cualquier return condicional)
  useEffect(() => {
    if (!user || isLoading) return;
    const modulePermissionMap: Record<ActiveModule, PermissionKey> = {
      dashboard: 'dashboard.view',
      clients: 'clients.view',
      quotes: 'quotes.view',
      services: 'services.view',
      payments: 'payments.view',
      service_orders: 'service_orders.view',
      workspace: 'workspace.view',
      drive: 'drive.view',
      settings: 'settings.view',
      administration: 'administration.view',
    };

    const requiredPerm = modulePermissionMap[activeModule];
    if (requiredPerm && !can(requiredPerm)) {
      const firstAllowed = (Object.keys(modulePermissionMap) as ActiveModule[]).find(
        (mod) => can(modulePermissionMap[mod])
      );
      if (firstAllowed && firstAllowed !== activeModule) {
        setActiveModule(firstAllowed);
      }
    }
  }, [activeModule, user, isLoading, can]);

  // 1. Si es el catálogo público de servicios, mostrar sin exigir PIN
  if (isPublicCatalog) {
    return <PublicServicesCatalogView />;
  }

  // 2. Si es una vista pública de detalle de servicio, mostrar sin exigir PIN
  if (publicServiceSlug) {
    return <PublicServiceDetailView slugOrId={publicServiceSlug} />;
  }

  // 3. Si es una vista pública de cotización, mostrar directamente sin exigir PIN
  if (publicQuoteToken) {
    return <PublicQuoteView publicToken={publicQuoteToken} />;
  }

  // 4. Si es una vista pública de comprobante / nota de pago, mostrar directamente sin exigir PIN
  if (publicPaymentNoteToken) {
    return <PublicPaymentNoteView token={publicPaymentNoteToken} />;
  }

  // 5. Si es una vista pública de Orden de Servicio (OS), mostrar directamente sin exigir PIN
  if (publicServiceOrderToken) {
    return <PublicServiceOrderView token={publicServiceOrderToken} />;
  }

  // 6. Si es una vista pública de Workspace / Grilla de contenidos, mostrar con soporte de PIN
  if (publicWorkspaceToken) {
    return <PublicWorkspaceMonthView token={publicWorkspaceToken} />;
  }

  // 7. Si es una vista pública de Biolink (tipo Linktree /b/:slug), mostrar directamente sin exigir PIN
  if (publicBiolinkSlug) {
    return <PublicBiolinkView slug={publicBiolinkSlug} />;
  }

// 8. Vista pública de historial de pagos de personal
  if (publicPersonalToken) {
    return <PublicEmployeePaymentsView token={publicPersonalToken} />;
  }

  // 9. Vista pública de Formulario interactivo
  if (publicFormSlug) {
    return <PublicFormView slug={publicFormSlug} />;
  }

  // 10. Vista pública de Brand Guidelines / Pitch Deck de Identidad Visual
  if (publicBrandToken) {
    return <PublicBrandGuidelineView token={publicBrandToken} />;
  }

  // 11. Vista pública de Proyecto de Desarrollo de Software (/dev/:token)
  if (publicSoftwareToken) {
    return <PublicSoftwareProjectView token={publicSoftwareToken} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh tenant-bg tenant-text flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl tenant-btn-primary animate-pulse flex items-center justify-center font-extrabold text-white text-xl shadow-xl">
          R
        </div>
        <p className="text-xs font-bold tenant-muted tracking-wider uppercase">
          Cargando entorno SaaS Multitenant...
        </p>
      </div>
    );
  }

  if (!user) {
    return <PinLoginScreen />;
  }

  const isClientPortalUser =
    user.id.startsWith('client-user-') || !!role?.id?.startsWith('role-cliente-');

  if (isClientPortalUser) {
    return <ClientPortal />;
  }

  const isAdmin =
    user.role === 'admin' ||
    role?.id === 'admin' ||
    role?.isSystem ||
    role?.permissions?.includes('*');

  // Si no es admin y requiere marcación obligatoria al entrar
  const requiresAttendanceModal = !isAdmin && !!attendanceCheck?.requiresAttendanceCheckIn;

  const handleNavigate = (
    mod: ActiveModule,
    subTab?: SettingsTab
  ) => {
    setActiveModule(mod);
    if (subTab) {
      setSettingsSubTab(subTab);
    }
  };

  return (
    <>
      {requiresAttendanceModal && (
        <AttendanceGateModal
          isOpen={true}
          onSuccess={(record) => {
            setAttendanceCheck((prev: any) => ({
              ...(prev || {}),
              alreadyCheckedInToday: true,
              requiresAttendanceCheckIn: false,
              todayAttendance: record,
            }));
          }}
          onLogout={logout}
        />
      )}
      <AppShell
        activeModule={activeModule}
        activeSettingsTab={settingsSubTab}
        onSelectModule={setActiveModule}
        onSelectSettingsTab={(tab) => {
          setActiveModule('settings');
          setSettingsSubTab(tab);
        }}
      >
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center py-24">
              <div className="w-8 h-8 rounded-xl tenant-btn-primary animate-pulse flex items-center justify-center font-extrabold text-white text-sm shadow-md">
                R
              </div>
            </div>
          }
        >
          {activeModule === 'dashboard' && can('dashboard.view') && (
            <DashboardModule onNavigate={handleNavigate} />
          )}
          {activeModule === 'clients' && can('clients.view') && <ClientsModule />}
          {activeModule === 'quotes' && can('quotes.view') && <QuotesModule />}
          {activeModule === 'services' && can('services.view') && (
            <ServicesModule onNavigate={handleNavigate} />
          )}
          {activeModule === 'payments' && can('payments.view') && <PaymentNotesModule />}
          {activeModule === 'service_orders' && can('service_orders.view') && <ServiceOrdersModule />}
          {activeModule === 'workspace' && can('workspace.view') && <WorkspaceModule />}
          {activeModule === 'administration' && can('administration.view') && <AdministrationModule />}
          {activeModule === 'drive' && can('drive.view') && <DriveModule />}
          {activeModule === 'settings' && can('settings.view') && (
            <SettingsModule
              initialTab={settingsSubTab}
              onTabChange={(tab) => setSettingsSubTab(tab)}
            />
          )}
        </Suspense>
      </AppShell>
      <YouTubeAudioEngine />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <DriveUploadProvider>
        <MusicPlayerProvider>
          <Suspense fallback={<RouteFallback />}>
            <MainRouter />
          </Suspense>
        </MusicPlayerProvider>
      </DriveUploadProvider>
    </AppProvider>
  );
};

export default App;
