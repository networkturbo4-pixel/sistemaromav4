import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ActiveModule } from './AppShell';
import { SettingsTab } from '../modules/SettingsModule';
import {
  Search,
  Zap,
  Users,
  FileText,
  Package,
  CreditCard,
  ClipboardList,
  FolderKanban,
  HardDrive,
  Settings,
  Plus,
  Tags,
  Palette,
  ShieldCheck,
  Building2,
  Sun,
  Moon,
  LogOut,
  X,
  CornerDownLeft,
  ChevronRight,
  Sparkles,
  Command,
} from 'lucide-react';

export interface CommandPaletteAction {
  id: string;
  title: string;
  subtitle?: string;
  category: 'creators' | 'modules' | 'settings';
  icon: React.ReactNode;
  badge?: string;
  keywords?: string[];
  perform: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreator: () => void;
  onSelectModule: (module: ActiveModule) => void;
  onSelectSettingsTab?: (tab: SettingsTab) => void;
  onCycleTheme: () => void;
  onLogout: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenCreator,
  onSelectModule,
  onSelectSettingsTab,
  onCycleTheme,
  onLogout,
}) => {
  const { tenant, resolvedTheme, can } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Focus input when opened and reset query
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const clientSingular = tenant.customization?.clientGlobalNameSingular || 'Cliente';
  const clientPlural = tenant.customization?.clientGlobalNamePlural || 'Clientes';

  // Catálogo completo de comandos y acciones
  const actions: CommandPaletteAction[] = useMemo(() => {
    const list: CommandPaletteAction[] = [
      // 1. CREADORES Y ACCIONES RÁPIDAS
      {
        id: 'creator-integral',
        title: 'El Creador Integral: Cliente + Membresía/Servicio + OS y Pago',
        subtitle: 'Flujo completo: Busca o crea cliente, define servicio o membresía por meses y emite OS y Nota de Pago',
        category: 'creators',
        icon: <Zap className="w-4 h-4 text-amber-500" />,
        badge: '⚡ Recomendado',
        keywords: ['creador', 'onboarding', 'cliente', 'membresia', 'servicio', 'os', 'pago', 'nota', 'nuevo', 'flujo'],
        perform: () => {
          onClose();
          onOpenCreator();
        },
      },
      {
        id: 'quick-new-client',
        title: `Nuevo ${clientSingular}`,
        subtitle: `Registra una nueva cuenta de ${clientSingular.toLowerCase()} y su primera marca`,
        category: 'creators',
        icon: <Plus className="w-4 h-4 text-emerald-500" />,
        keywords: ['nuevo cliente', 'registrar cliente', 'crear cliente', 'alta'],
        perform: () => {
          onClose();
          onSelectModule('clients');
        },
      },
      {
        id: 'quick-new-quote',
        title: 'Nueva Cotización',
        subtitle: 'Genera una propuesta comercial o cotización interactiva',
        category: 'creators',
        icon: <FileText className="w-4 h-4 text-blue-500" />,
        keywords: ['cotizar', 'nueva cotizacion', 'propuesta', 'proforma'],
        perform: () => {
          onClose();
          onSelectModule('quotes');
        },
      },
      {
        id: 'quick-new-payment-note',
        title: 'Nueva Nota de Pago',
        subtitle: 'Emite un comprobante o nota de liquidación para un cliente',
        category: 'creators',
        icon: <CreditCard className="w-4 h-4 text-indigo-500" />,
        keywords: ['pago', 'nueva nota de pago', 'comprobante', 'recibo'],
        perform: () => {
          onClose();
          onSelectModule('payments');
        },
      },
      {
        id: 'quick-new-service-order',
        title: 'Nueva Orden de Servicio (OS)',
        subtitle: 'Crea una hoja de ruta operativa con entregables y enlace interactivo',
        category: 'creators',
        icon: <ClipboardList className="w-4 h-4 text-amber-500" />,
        keywords: ['nueva orden', 'os', 'orden de servicio', 'operaciones', 'briefing'],
        perform: () => {
          onClose();
          onSelectModule('service_orders');
        },
      },
      {
        id: 'quick-new-service',
        title: 'Nuevo Servicio en Catálogo',
        subtitle: 'Añade un servicio empaquetado al catálogo global del sistema',
        category: 'creators',
        icon: <Package className="w-4 h-4 text-purple-500" />,
        keywords: ['crear servicio', 'nuevo servicio', 'catalogo', 'paquete'],
        perform: () => {
          onClose();
          onSelectModule('services');
        },
      },

      // 2. MÓDULOS DEL SISTEMA
      {
        id: 'mod-dashboard',
        title: 'Ir al Dashboard',
        subtitle: 'Métricas clave, cotizaciones recientes y resumen financiero',
        category: 'modules',
        icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
        keywords: ['inicio', 'home', 'panel', 'resumen', 'metricas'],
        perform: () => {
          onClose();
          onSelectModule('dashboard');
        },
      },
      {
        id: 'mod-clients',
        title: `Módulo de ${clientPlural}`,
        subtitle: 'Directorio de empresas, marcas asociadas y contratos',
        category: 'modules',
        icon: <Users className="w-4 h-4 text-emerald-500" />,
        keywords: ['clientes', 'marcas', 'directorio', 'empresas'],
        perform: () => {
          onClose();
          onSelectModule('clients');
        },
      },
      {
        id: 'mod-quotes',
        title: 'Módulo de Cotizaciones',
        subtitle: 'Historial de cotizaciones, estados y enlaces interactivos',
        category: 'modules',
        icon: <FileText className="w-4 h-4 text-blue-500" />,
        keywords: ['cotizaciones', 'cotizar', 'presupuestos', 'proformas'],
        perform: () => {
          onClose();
          onSelectModule('quotes');
        },
      },
      {
        id: 'mod-services',
        title: 'Catálogo de Servicios',
        subtitle: 'Planes, tarifas y alcance de servicios del tenant',
        category: 'modules',
        icon: <Package className="w-4 h-4 text-purple-500" />,
        keywords: ['servicios', 'catalogo', 'precios', 'tarifas', 'planes'],
        perform: () => {
          onClose();
          onSelectModule('services');
        },
      },
      {
        id: 'mod-payments',
        title: 'Notas de Pago & Comprobantes',
        subtitle: 'Control de cobros, pagos pendientes y conciliación',
        category: 'modules',
        icon: <CreditCard className="w-4 h-4 text-indigo-500" />,
        keywords: ['pagos', 'notas de pago', 'cobranzas', 'recibos', 'ingresos'],
        perform: () => {
          onClose();
          onSelectModule('payments');
        },
      },
      {
        id: 'mod-service-orders',
        title: 'Órdenes de Servicio (OS)',
        subtitle: 'Seguimiento de producción, cronogramas y entregables',
        category: 'modules',
        icon: <ClipboardList className="w-4 h-4 text-amber-500" />,
        keywords: ['ordenes de servicio', 'os', 'roadmap', 'hoja de ruta', 'entregables'],
        perform: () => {
          onClose();
          onSelectModule('service_orders');
        },
      },
      {
        id: 'mod-workspace',
        title: 'Workspace & Tareas Kanban',
        subtitle: 'Tableros de trabajo colaborativo para el equipo',
        category: 'modules',
        icon: <FolderKanban className="w-4 h-4 text-teal-500" />,
        keywords: ['workspace', 'kanban', 'tareas', 'actividades', 'flujo'],
        perform: () => {
          onClose();
          onSelectModule('workspace');
        },
      },
      {
        id: 'mod-drive',
        title: 'Google Drive & Archivos',
        subtitle: 'Explorador en la nube y repositorio de entregables',
        category: 'modules',
        icon: <HardDrive className="w-4 h-4 text-rose-500" />,
        keywords: ['drive', 'archivos', 'google drive', 'cloud', 'documentos'],
        perform: () => {
          onClose();
          onSelectModule('drive');
        },
      },

      // 3. CONFIGURACIÓN Y ACCIONES DEL SISTEMA
      {
        id: 'set-appearance',
        title: 'Apariencia & Paleta de Colores',
        subtitle: 'Personaliza los colores del tenant y la interfaz',
        category: 'settings',
        icon: <Palette className="w-4 h-4 text-purple-500" />,
        keywords: ['tema', 'colores', 'apariencia', 'modo oscuro', 'interfaz'],
        perform: () => {
          onClose();
          onSelectSettingsTab?.('appearance');
        },
      },
      {
        id: 'set-identity',
        title: 'Identidad & Logos',
        subtitle: 'Logotipo claro, oscuro, favicon e ícono PWA',
        category: 'settings',
        icon: <Tags className="w-4 h-4 text-indigo-500" />,
        keywords: ['logo', 'identidad', 'marca blanca', 'icono', 'favicon'],
        perform: () => {
          onClose();
          onSelectSettingsTab?.('identity');
        },
      },
      {
        id: 'set-company',
        title: 'Datos de la Empresa / Agencia',
        subtitle: 'Razón social, RUC, cuentas bancarias y redes sociales',
        category: 'settings',
        icon: <Building2 className="w-4 h-4 text-blue-500" />,
        keywords: ['empresa', 'datos', 'cuentas', 'bancos', 'ruc', 'razon social'],
        perform: () => {
          onClose();
          onSelectSettingsTab?.('company');
        },
      },
      {
        id: 'set-users',
        title: 'Usuarios del Equipo',
        subtitle: 'Gestión de miembros, accesos y cargos',
        category: 'settings',
        icon: <Users className="w-4 h-4 text-emerald-500" />,
        keywords: ['usuarios', 'equipo', 'miembros', 'colaboradores'],
        perform: () => {
          onClose();
          onSelectSettingsTab?.('users');
        },
      },
      {
        id: 'set-roles',
        title: 'Roles & Permisos',
        subtitle: 'Control granular de permisos y privilegios',
        category: 'settings',
        icon: <ShieldCheck className="w-4 h-4 text-amber-500" />,
        keywords: ['roles', 'permisos', 'seguridad', 'accesos'],
        perform: () => {
          onClose();
          onSelectSettingsTab?.('roles');
        },
      },
      {
        id: 'act-toggle-theme',
        title: 'Alternar Tema Claro / Oscuro',
        subtitle: `Actualmente en modo ${resolvedTheme === 'dark' ? 'oscuro' : 'claro'}`,
        category: 'settings',
        icon: resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
        keywords: ['tema', 'modo oscuro', 'modo claro', 'light', 'dark'],
        perform: () => {
          onClose();
          onCycleTheme();
        },
      },
      {
        id: 'act-logout',
        title: 'Cerrar Sesión',
        subtitle: 'Bloquear espacio de trabajo y volver a la pantalla de PIN',
        category: 'settings',
        icon: <LogOut className="w-4 h-4 text-rose-500" />,
        keywords: ['salir', 'cerrar sesion', 'logout', 'bloquear'],
        perform: () => {
          onClose();
          onLogout();
        },
      },
    ];

    return list;
  }, [clientSingular, clientPlural, resolvedTheme, onClose, onOpenCreator, onSelectModule, onSelectSettingsTab, onCycleTheme, onLogout]);

  // Filtrado de acciones según el texto ingresado
  const filteredActions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return actions;
    return actions.filter((act) => {
      const inTitle = act.title.toLowerCase().includes(q);
      const inSubtitle = act.subtitle ? act.subtitle.toLowerCase().includes(q) : false;
      const inKeywords = act.keywords ? act.keywords.some((k) => k.toLowerCase().includes(q)) : false;
      return inTitle || inSubtitle || inKeywords;
    });
  }, [actions, query]);

  // Asegurar que selectedIndex no desborde
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredActions]);

  // Scroll automático hacia el elemento seleccionado con el teclado
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Manejador de teclado para navegar en la paleta
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].perform();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-3 sm:px-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-colors duration-200 animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* BARRA DE BÚSQUEDA */}
        <div
          className="flex items-center px-4 sm:px-5 py-3.5 border-b gap-3 shrink-0"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe un comando, módulo o busca una acción..."
            className="w-full bg-transparent text-sm sm:text-base font-bold outline-none placeholder:text-slate-400 placeholder:font-normal"
            style={{ color: 'var(--app-text)' }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd
              className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold text-slate-400"
              style={{ borderColor: 'var(--app-border)' }}
            >
              ESC
            </kbd>
          )}
        </div>

        {/* LISTA DE COMANDOS */}
        <div
          ref={listRef}
          className="max-h-[55vh] overflow-y-auto p-2 sm:p-2.5 space-y-1 overscroll-contain"
        >
          {filteredActions.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <p className="text-xs font-bold text-slate-400">
                No se encontraron comandos para "{query}"
              </p>
              <p className="text-[11px] text-slate-500">
                Intenta buscar "cliente", "membresía", "cotización", "os" o "drive"
              </p>
            </div>
          ) : (
            filteredActions.map((act, idx) => {
              const isSelected = selectedIndex === idx;
              const isCreator = act.id === 'creator-integral';

              return (
                <div
                  key={act.id}
                  data-index={idx}
                  onClick={act.perform}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition text-xs select-none ${
                    isSelected
                      ? isCreator
                        ? 'bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-slate-900 dark:text-white ring-2 ring-indigo-500/40'
                        : 'bg-indigo-600 text-white shadow-xs'
                      : isCreator
                      ? 'bg-amber-500/5 hover:bg-amber-500/10 text-slate-800 dark:text-slate-200'
                      : 'hover:bg-slate-500/10 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected && !isCreator
                          ? 'bg-white/20 border-white/30 text-white'
                          : 'bg-slate-500/10 border-slate-500/15'
                      }`}
                    >
                      {act.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold truncate ${isSelected && !isCreator ? 'text-white' : ''}`}>
                          {act.title}
                        </p>
                        {act.badge && (
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full shrink-0 ${
                              isSelected && !isCreator
                                ? 'bg-white/20 text-white'
                                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {act.badge}
                          </span>
                        )}
                      </div>
                      {act.subtitle && (
                        <p
                          className={`text-[10px] truncate mt-0.5 ${
                            isSelected && !isCreator ? 'text-indigo-100' : 'text-slate-400'
                          }`}
                        >
                          {act.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected && (
                      <kbd
                        className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          !isCreator
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-500/20 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <CornerDownLeft className="w-3 h-3" />
                        <span>Enter</span>
                      </kbd>
                    )}
                    <ChevronRight
                      className={`w-4 h-4 opacity-50 ${isSelected ? 'translate-x-0.5 opacity-100' : ''}`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PIE DE LA PALETA (SHORTCUTS HINTS) */}
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between text-[11px] text-slate-400 shrink-0 font-medium"
          style={{
            borderColor: 'var(--app-border)',
            backgroundColor: 'color-mix(in srgb, var(--app-surface) 95%, var(--app-bg) 5%)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                ↵
              </kbd>{' '}
              Ejecutar
            </span>
          </div>

          <span className="text-[10px] flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Roma Command System</span>
          </span>
        </div>
      </div>
    </div>
  );
};
