import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ActiveModule } from './AppShell';
import { SettingsTab } from '../modules/SettingsModule';
import { Client, Quote, PaymentNote, ServiceOrder, Service } from '../../shared/types';
import { calculatePaymentNoteActiveTotals } from '../utils/paymentNoteUtils';
import { navigateToEntity } from '../utils/navigationEvents';
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
  ExternalLink,
  Globe,
  Edit2,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';

export type CommandPaletteFilter =
  | 'ALL'
  | 'clients'
  | 'quotes'
  | 'payments'
  | 'service_orders'
  | 'services'
  | 'commands';

export interface CommandPaletteItem {
  id: string;
  type: 'action' | 'client' | 'quote' | 'payment_note' | 'service_order' | 'service';
  title: string;
  subtitle?: string;
  category: 'clients' | 'quotes' | 'payments' | 'service_orders' | 'services' | 'creators' | 'modules' | 'settings';
  categoryLabel: string;
  icon: React.ReactNode;
  badge?: string;
  badgeClass?: string;
  keywords?: string[];
  publicUrl?: string;
  publicUrlLabel?: string;
  perform: () => void;
  openPublic?: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreator: () => void;
  onOpenRomita?: () => void;
  onSelectModule: (module: ActiveModule) => void;
  onSelectSettingsTab?: (tab: SettingsTab) => void;
  onCycleTheme: () => void;
  onLogout: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenCreator,
  onOpenRomita,
  onSelectModule,
  onSelectSettingsTab,
  onCycleTheme,
  onLogout,
}) => {
  const { tenant, resolvedTheme, can, apiFetch } = useApp();
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<CommandPaletteFilter>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Entidades dinámicas del tenant
  const [entities, setEntities] = useState<{
    clients: Client[];
    quotes: Quote[];
    paymentNotes: PaymentNote[];
    serviceOrders: ServiceOrder[];
    services: Service[];
  }>({
    clients: [],
    quotes: [],
    paymentNotes: [],
    serviceOrders: [],
    services: [],
  });
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Cargar entidades cuando se abre la paleta
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedFilter('ALL');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      const fetchEntities = async () => {
        setLoadingEntities(true);
        try {
          const promises = [
            can('clients.view')
              ? apiFetch<{ clients: Client[] }>('/api/clients').catch(() => ({ clients: [] }))
              : Promise.resolve({ clients: [] }),
            can('quotes.view')
              ? apiFetch<{ quotes: Quote[] }>('/api/quotes').catch(() => ({ quotes: [] }))
              : Promise.resolve({ quotes: [] }),
            can('payments.view')
              ? apiFetch<{ paymentNotes: PaymentNote[] }>('/api/payment-notes').catch(() => ({ paymentNotes: [] }))
              : Promise.resolve({ paymentNotes: [] }),
            can('service_orders.view')
              ? apiFetch<{ orders: ServiceOrder[] }>('/api/service-orders').catch(() => ({ orders: [] }))
              : Promise.resolve({ orders: [] }),
            can('services.view')
              ? apiFetch<{ services: Service[] }>('/api/services').catch(() => ({ services: [] }))
              : Promise.resolve({ services: [] }),
          ];

          const [clientsRes, quotesRes, notesRes, ordersRes, servicesRes] = await Promise.all(promises);

          setEntities({
            clients: (clientsRes as any).clients || [],
            quotes: (quotesRes as any).quotes || [],
            paymentNotes: (notesRes as any).paymentNotes || [],
            serviceOrders: (ordersRes as any).orders || (ordersRes as any).serviceOrders || [],
            services: (servicesRes as any).services || [],
          });
        } catch (err) {
          console.error('Error fetching entities for CommandPalette:', err);
        } finally {
          setLoadingEntities(false);
        }
      };

      fetchEntities();
    }
  }, [isOpen]);

  const clientSingular = tenant.customization?.clientGlobalNameSingular || 'Cliente';
  const clientPlural = tenant.customization?.clientGlobalNamePlural || 'Clientes';

  // Helper para asegurar que todas las palabras clave sean strings no vacíos y evitar errores de toLowerCase
  const cleanKeywords = (...args: (string | undefined | null | number | boolean)[]): string[] => {
    return args
      .filter((k): k is string | number => k !== undefined && k !== null && typeof k !== 'boolean')
      .map((k) => String(k).trim())
      .filter((k) => k.length > 0);
  };

  // Catálogo completo de items: Acciones estáticas + Entidades dinámicas
  const allItems: CommandPaletteItem[] = useMemo(() => {
    const list: CommandPaletteItem[] = [];

    // =========================================================================
    // 1. CLIENTES (Búsqueda en tiempo real)
    // =========================================================================
    entities.clients.forEach((c) => {
      const brandsText = c.brands?.map((b) => b.name).filter(Boolean).join(', ') || '';
      const servicesContracted = c.brands?.map((b) => b.serviceName).filter(Boolean).join(', ') || '';

      list.push({
        id: `client-${c.id}`,
        type: 'client',
        title: `${c.name || 'Cliente sin nombre'}${c.brands && c.brands.length > 0 ? ` • ${c.brands.map((b) => b.name).filter(Boolean).join(', ')}` : ''}`,
        subtitle: `${c.documentType || 'DOC'}: ${c.documentNumber || '-'}${c.whatsapp ? ` • WA: ${c.whatsapp}` : ''}${servicesContracted ? ` • ${servicesContracted}` : ''}`,
        category: 'clients',
        categoryLabel: clientPlural,
        icon: <Users className="w-4 h-4 text-emerald-500" />,
        badge: c.status === 'active' ? 'Activo' : 'Inactivo',
        badgeClass:
          c.status === 'active'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
        keywords: cleanKeywords(
          c.name,
          c.documentNumber,
          c.whatsapp,
          c.email,
          brandsText,
          servicesContracted,
          'cliente',
          'marca'
        ),
        perform: () => {
          navigateToEntity(
            { module: 'clients', entityType: 'client', entityId: c.id, code: c.name, action: 'edit' },
            onSelectModule
          );
          onClose();
        },
      });
    });

    // =========================================================================
    // 2. COTIZACIONES
    // =========================================================================
    entities.quotes.forEach((q) => {
      const publicUrl = `/cotizacion/${q.publicToken || q.id}`;
      const statusLabel =
        q.status === 'approved'
          ? 'Aprobada'
          : q.status === 'sent'
          ? 'Enviada'
          : q.status === 'draft'
          ? 'Borrador'
          : q.status === 'rejected'
          ? 'Rechazada'
          : q.status || 'Cotización';

      list.push({
        id: `quote-${q.id}`,
        type: 'quote',
        title: `${q.code || 'COT'} • ${q.clientName || q.companyName || 'Sin cliente'}`,
        subtitle: `Cotización • ${q.currencySymbol || 'S/'} ${Number(q.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}${q.items?.length ? ` • ${q.items.length} partidas` : ''}`,
        category: 'quotes',
        categoryLabel: 'Cotizaciones',
        icon: <FileText className="w-4 h-4 text-blue-500" />,
        badge: statusLabel,
        badgeClass:
          q.status === 'approved'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
            : q.status === 'rejected'
            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
        publicUrl,
        publicUrlLabel: 'Vista Pública',
        keywords: cleanKeywords(
          q.code,
          q.clientName,
          q.companyName,
          q.documentNumber,
          q.whatsapp,
          q.email,
          'cotizacion',
          'propuesta',
          'proforma'
        ),
        perform: () => {
          navigateToEntity(
            { module: 'quotes', entityType: 'quote', entityId: q.id, code: q.code, action: 'edit' },
            onSelectModule
          );
          onClose();
        },
        openPublic: () => {
          window.open(publicUrl, '_blank');
          onClose();
        },
      });
    });

    // =========================================================================
    // 3. NOTAS DE PAGO (Con totales activos precisos)
    // =========================================================================
    entities.paymentNotes.forEach((n) => {
      const calc = calculatePaymentNoteActiveTotals({
        isMembership: n.isMembership,
        membershipInstallments: n.membershipInstallments,
        extraItems: n.extraItems,
        items: n.items,
        includeTax: n.includeTax,
        taxRate: n.taxRate,
        discountAmount: Number(n.discountAmount) || 0,
        manualPaidAmount: n.paidAmount,
      });

      const effectiveTotal = calc.total;
      const pendingBalance = calc.balance;
      const isPaid = pendingBalance <= 0 && effectiveTotal > 0;
      const publicUrl = `/pago/${n.publicToken || n.id}`;

      list.push({
        id: `note-${n.id}`,
        type: 'payment_note',
        title: `${n.code || 'NP'} • ${n.clientName || n.companyName || 'Sin cliente'}`,
        subtitle: `Nota de Pago • Total: ${n.currencySymbol || 'S/'} ${Number(effectiveTotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}${isPaid ? ' • 100% Pagado' : ` • Saldo: ${n.currencySymbol || 'S/'} ${pendingBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}`,
        category: 'payments',
        categoryLabel: 'Notas de Pago',
        icon: <CreditCard className="w-4 h-4 text-indigo-500" />,
        badge: isPaid ? 'PAGADO' : n.status === 'partial' ? 'EN PROCESO' : 'PENDIENTE',
        badgeClass: isPaid
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
          : n.status === 'partial'
          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400'
          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
        publicUrl,
        publicUrlLabel: 'Comprobante',
        keywords: cleanKeywords(
          n.code,
          n.clientName,
          n.companyName,
          n.brandName,
          n.documentNumber,
          'pago',
          'nota de pago',
          'comprobante',
          'recibo',
          'cobranza'
        ),
        perform: () => {
          navigateToEntity(
            { module: 'payments', entityType: 'payment_note', entityId: n.id, code: n.code, action: 'edit' },
            onSelectModule
          );
          onClose();
        },
        openPublic: () => {
          window.open(publicUrl, '_blank');
          onClose();
        },
      });
    });

    // =========================================================================
    // 4. ÓRDENES DE SERVICIO (OS)
    // =========================================================================
    entities.serviceOrders.forEach((o) => {
      const publicUrl = `/os/${o.publicToken || o.id}`;
      const statusLabel =
        o.status === 'completed'
          ? 'Completado'
          : o.status === 'in_progress'
          ? 'En Producción'
          : 'Pendiente';

      list.push({
        id: `order-${o.id}`,
        type: 'service_order',
        title: `${o.code || 'OS'} • ${o.title || 'Orden de Servicio'}`,
        subtitle: `Orden de Servicio • Cliente: ${o.clientName || o.companyName || '-'}${o.deliverables?.length ? ` • ${o.deliverables.length} entregables` : ''}`,
        category: 'service_orders',
        categoryLabel: 'Órdenes de Servicio',
        icon: <ClipboardList className="w-4 h-4 text-amber-500" />,
        badge: statusLabel,
        badgeClass:
          o.status === 'completed'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
        publicUrl,
        publicUrlLabel: 'Hoja de Ruta',
        keywords: cleanKeywords(
          o.code,
          o.title,
          o.clientName,
          o.companyName,
          o.brandName,
          'os',
          'orden de servicio',
          'entregables',
          'roadmap'
        ),
        perform: () => {
          navigateToEntity(
            { module: 'service_orders', entityType: 'service_order', entityId: o.id, code: o.code, action: 'edit' },
            onSelectModule
          );
          onClose();
        },
        openPublic: () => {
          window.open(publicUrl, '_blank');
          onClose();
        },
      });
    });

    // =========================================================================
    // 5. SERVICIOS DEL CATÁLOGO
    // =========================================================================
    entities.services.forEach((s) => {
      const publicUrl = `/servicio/${s.slug || s.id}`;

      list.push({
        id: `service-${s.id}`,
        type: 'service',
        title: `${s.title || 'Servicio'}${s.code ? ` (${s.code})` : ''}`,
        subtitle: `Servicio • ${tenant.customization?.currencySymbol || 'S/'} ${Number(s.price || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })} • ${s.pricingType === 'monthly' ? 'Mensual' : 'Pago Único'}`,
        category: 'services',
        categoryLabel: 'Servicios',
        icon: <Package className="w-4 h-4 text-purple-500" />,
        badge: s.status === 'active' ? 'Activo' : 'Inactivo',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
        publicUrl,
        publicUrlLabel: 'Ver Detalle',
        keywords: cleanKeywords(
          s.title,
          s.code,
          s.shortDescription,
          s.categoryName,
          'servicio',
          'catalogo',
          'paquete'
        ),
        perform: () => {
          onSelectModule('services');
          onClose();
        },
        openPublic: () => {
          window.open(publicUrl, '_blank');
          onClose();
        },
      });
    });

    // =========================================================================
    // 6. CREADORES RÁPIDOS & AGENTE IA
    // =========================================================================
    list.push(
      {
        id: 'agent-romita',
        type: 'action',
        title: 'Abrir Agente Romita IA (Ctrl + J)',
        subtitle: 'Asistente de IA con permisos de acción: crear, editar o eliminar clientes, tareas y cotizaciones',
        category: 'creators',
        categoryLabel: 'Inteligencia Artificial',
        icon: <Sparkles className="w-4 h-4 text-sky-400" />,
        badge: '✨ Romita IA',
        badgeClass: 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30',
        keywords: ['romita', 'ia', 'ai', 'agente', 'crear', 'eliminar', 'editar', 'gemini', 'inteligencia', 'chat', 'asistente'],
        perform: () => {
          onClose();
          onOpenRomita?.();
        },
      },
      {
        id: 'creator-integral',
        type: 'action',
        title: 'El Creador Integral: Cliente + Membresía/Servicio + OS y Pago',
        subtitle: 'Flujo completo: Busca o crea cliente, define servicio o membresía por meses y emite OS y Nota de Pago',
        category: 'creators',
        categoryLabel: 'Creador Rápido',
        icon: <Zap className="w-4 h-4 text-amber-500" />,
        badge: '⚡ Recomendado',
        badgeClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
        keywords: ['creador', 'onboarding', 'cliente', 'membresia', 'servicio', 'os', 'pago', 'nota', 'nuevo', 'flujo'],
        perform: () => {
          onClose();
          onOpenCreator();
        },
      },
      {
        id: 'quick-new-client',
        type: 'action',
        title: `Nuevo ${clientSingular}`,
        subtitle: `Registra una nueva cuenta de ${clientSingular.toLowerCase()} y su primera marca`,
        category: 'creators',
        categoryLabel: 'Acciones Rápidas',
        icon: <Plus className="w-4 h-4 text-emerald-500" />,
        keywords: ['nuevo cliente', 'registrar cliente', 'crear cliente', 'alta'],
        perform: () => {
          onClose();
          onSelectModule('clients');
        },
      },
      {
        id: 'quick-new-quote',
        type: 'action',
        title: 'Nueva Cotización',
        subtitle: 'Genera una propuesta comercial o cotización interactiva',
        category: 'creators',
        categoryLabel: 'Acciones Rápidas',
        icon: <FileText className="w-4 h-4 text-blue-500" />,
        keywords: ['cotizar', 'nueva cotizacion', 'propuesta', 'proforma'],
        perform: () => {
          onClose();
          onSelectModule('quotes');
        },
      },
      {
        id: 'quick-new-payment-note',
        type: 'action',
        title: 'Nueva Nota de Pago',
        subtitle: 'Emite un comprobante o nota de liquidación para un cliente',
        category: 'creators',
        categoryLabel: 'Acciones Rápidas',
        icon: <CreditCard className="w-4 h-4 text-indigo-500" />,
        keywords: ['pago', 'nueva nota de pago', 'comprobante', 'recibo'],
        perform: () => {
          onClose();
          onSelectModule('payments');
        },
      },
      {
        id: 'quick-new-service-order',
        type: 'action',
        title: 'Nueva Orden de Servicio (OS)',
        subtitle: 'Crea una hoja de ruta operativa con entregables y enlace interactivo',
        category: 'creators',
        categoryLabel: 'Acciones Rápidas',
        icon: <ClipboardList className="w-4 h-4 text-amber-500" />,
        keywords: ['nueva orden', 'os', 'orden de servicio', 'operaciones', 'briefing'],
        perform: () => {
          onClose();
          onSelectModule('service_orders');
        },
      }
    );

    // =========================================================================
    // 7. MÓDULOS DEL SISTEMA
    // =========================================================================
    list.push(
      {
        id: 'mod-dashboard',
        type: 'action',
        title: 'Ir al Dashboard',
        subtitle: 'Métricas clave, cotizaciones recientes y resumen financiero',
        category: 'modules',
        categoryLabel: 'Módulos',
        icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
        keywords: ['inicio', 'home', 'panel', 'resumen', 'metricas'],
        perform: () => {
          onClose();
          onSelectModule('dashboard');
        },
      },
      {
        id: 'mod-clients',
        type: 'action',
        title: `Módulo de ${clientPlural}`,
        subtitle: 'Directorio de empresas, marcas asociadas y contratos',
        category: 'modules',
        categoryLabel: 'Módulos',
        icon: <Users className="w-4 h-4 text-emerald-500" />,
        keywords: ['clientes', 'marcas', 'directorio', 'empresas'],
        perform: () => {
          onClose();
          onSelectModule('clients');
        },
      },
      {
        id: 'mod-quotes',
        type: 'action',
        title: 'Módulo de Cotizaciones',
        subtitle: 'Historial de cotizaciones, estados y enlaces interactivos',
        category: 'modules',
        categoryLabel: 'Módulos',
        icon: <FileText className="w-4 h-4 text-blue-500" />,
        keywords: ['cotizaciones', 'cotizar', 'presupuestos', 'proformas'],
        perform: () => {
          onClose();
          onSelectModule('quotes');
        },
      },
      {
        id: 'mod-services',
        type: 'action',
        title: 'Catálogo de Servicios',
        subtitle: 'Planes, tarifas y alcance de servicios del tenant',
        category: 'modules',
        categoryLabel: 'Módulos',
        icon: <Package className="w-4 h-4 text-purple-500" />,
        keywords: ['servicios', 'catalogo', 'precios', 'tarifas', 'planes'],
        perform: () => {
          onClose();
          onSelectModule('services');
        },
      },
      {
        id: 'mod-payments',
        type: 'action',
        title: 'Notas de Pago & Comprobantes',
        subtitle: 'Control de cobros, pagos pendientes y conciliación',
        category: 'modules',
        categoryLabel: 'Módulos',
        icon: <CreditCard className="w-4 h-4 text-indigo-500" />,
        keywords: ['pagos', 'notas de pago', 'cobranzas', 'recibos', 'ingresos'],
        perform: () => {
          onClose();
          onSelectModule('payments');
        },
      },
      {
        id: 'mod-service-orders',
        type: 'action',
        title: 'Órdenes de Servicio (OS)',
        subtitle: 'Seguimiento de producción, cronogramas y entregables',
        category: 'modules',
        categoryLabel: 'Módulos',
        icon: <ClipboardList className="w-4 h-4 text-amber-500" />,
        keywords: ['ordenes de servicio', 'os', 'roadmap', 'hoja de ruta', 'entregables'],
        perform: () => {
          onClose();
          onSelectModule('service_orders');
        },
      },
      {
        id: 'mod-workspace',
        type: 'action',
        title: 'Workspace & Tareas Kanban',
        subtitle: 'Tableros de trabajo colaborativo para el equipo',
        category: 'modules',
        categoryLabel: 'Módulos',
        icon: <FolderKanban className="w-4 h-4 text-teal-500" />,
        keywords: ['workspace', 'kanban', 'tareas', 'actividades', 'flujo'],
        perform: () => {
          onClose();
          onSelectModule('workspace');
        },
      },
      {
        id: 'mod-drive',
        type: 'action',
        title: 'Google Drive & Archivos',
        subtitle: 'Explorador en la nube y repositorio de entregables',
        category: 'modules',
        categoryLabel: 'Módulos',
        icon: <HardDrive className="w-4 h-4 text-rose-500" />,
        keywords: ['drive', 'archivos', 'google drive', 'cloud', 'documentos'],
        perform: () => {
          onClose();
          onSelectModule('drive');
        },
      }
    );

    // =========================================================================
    // 8. CONFIGURACIÓN Y ACCIONES DEL SISTEMA
    // =========================================================================
    list.push(
      {
        id: 'set-appearance',
        type: 'action',
        title: 'Apariencia & Paleta de Colores',
        subtitle: 'Personaliza los colores del tenant y la interfaz',
        category: 'settings',
        categoryLabel: 'Configuración',
        icon: <Palette className="w-4 h-4 text-purple-500" />,
        keywords: ['tema', 'colores', 'apariencia', 'modo oscuro', 'interfaz'],
        perform: () => {
          onClose();
          onSelectSettingsTab?.('appearance');
        },
      },
      {
        id: 'set-identity',
        type: 'action',
        title: 'Identidad & Logos',
        subtitle: 'Logotipo claro, oscuro, favicon e ícono PWA',
        category: 'settings',
        categoryLabel: 'Configuración',
        icon: <Tags className="w-4 h-4 text-indigo-500" />,
        keywords: ['logo', 'identidad', 'marca blanca', 'icono', 'favicon'],
        perform: () => {
          onClose();
          onSelectSettingsTab?.('identity');
        },
      },
      {
        id: 'set-company',
        type: 'action',
        title: 'Datos de la Empresa / Agencia',
        subtitle: 'Razón social, RUC, cuentas bancarias y redes sociales',
        category: 'settings',
        categoryLabel: 'Configuración',
        icon: <Building2 className="w-4 h-4 text-blue-500" />,
        keywords: ['empresa', 'datos', 'cuentas', 'bancos', 'ruc', 'razon social'],
        perform: () => {
          onClose();
          onSelectSettingsTab?.('company');
        },
      },
      {
        id: 'act-toggle-theme',
        type: 'action',
        title: 'Alternar Tema Claro / Oscuro',
        subtitle: `Actualmente en modo ${resolvedTheme === 'dark' ? 'oscuro' : 'claro'}`,
        category: 'settings',
        categoryLabel: 'Preferencia',
        icon: resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
        keywords: ['tema', 'modo oscuro', 'modo claro', 'light', 'dark'],
        perform: () => {
          onClose();
          onCycleTheme();
        },
      },
      {
        id: 'act-logout',
        type: 'action',
        title: 'Cerrar Sesión',
        subtitle: 'Bloquear espacio de trabajo y volver a la pantalla de PIN',
        category: 'settings',
        categoryLabel: 'Sesión',
        icon: <LogOut className="w-4 h-4 text-rose-500" />,
        keywords: ['salir', 'cerrar sesion', 'logout', 'bloquear'],
        perform: () => {
          onClose();
          onLogout();
        },
      }
    );

    return list;
  }, [
    entities,
    clientSingular,
    clientPlural,
    resolvedTheme,
    tenant.customization?.currencySymbol,
    onClose,
    onOpenCreator,
    onSelectModule,
    onSelectSettingsTab,
    onCycleTheme,
    onLogout,
  ]);

  // Filtrado según búsqueda y pestaña seleccionada
  const filteredItems = useMemo(() => {
    const q = (query || '').toLowerCase().trim();

    return allItems.filter((item) => {
      if (!item) return false;

      // Filtro de pestaña superior
      if (selectedFilter === 'clients' && item.type !== 'client') return false;
      if (selectedFilter === 'quotes' && item.type !== 'quote') return false;
      if (selectedFilter === 'payments' && item.type !== 'payment_note') return false;
      if (selectedFilter === 'service_orders' && item.type !== 'service_order') return false;
      if (selectedFilter === 'services' && item.type !== 'service') return false;
      if (selectedFilter === 'commands' && item.type !== 'action') return false;

      // Filtro de texto
      if (!q) return true;

      const inTitle = typeof item.title === 'string' && item.title.toLowerCase().includes(q);
      const inSubtitle = typeof item.subtitle === 'string' && item.subtitle.toLowerCase().includes(q);
      const inKeywords =
        Array.isArray(item.keywords) &&
        item.keywords.some((k) => typeof k === 'string' && k.toLowerCase().includes(q));
      const inCategory = typeof item.categoryLabel === 'string' && item.categoryLabel.toLowerCase().includes(q);

      return inTitle || inSubtitle || inKeywords || inCategory;
    });
  }, [allItems, query, selectedFilter]);

  // Resetear índice seleccionado al cambiar filtros o query
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

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
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (!current) return;

      // Ctrl + Enter abre la vista pública si existe
      if (e.ctrlKey && current.openPublic) {
        current.openPublic();
      } else {
        current.perform();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Contadores para pestañas rápidas
  const counts = useMemo(() => {
    return {
      clients: entities.clients.length,
      quotes: entities.quotes.length,
      payments: entities.paymentNotes.length,
      serviceOrders: entities.serviceOrders.length,
      services: entities.services.length,
    };
  }, [entities]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] sm:pt-[12vh] px-3 sm:px-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-colors duration-200 animate-in zoom-in-95 duration-150"
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
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca un cliente, cotización, nota de pago, orden o comando..."
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

        {/* PESTAÑAS DE FILTRO RÁPIDO */}
        <div
          className="px-4 py-2 border-b flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-xs font-semibold"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <button
            type="button"
            onClick={() => setSelectedFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              selectedFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-500 hover:bg-slate-500/10'
            }`}
          >
            Todos
          </button>

          {counts.clients > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilter('clients')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                selectedFilter === 'clients'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-500/10'
              }`}
            >
              <span>{clientPlural}</span>
              <span className="text-[10px] opacity-80">({counts.clients})</span>
            </button>
          )}

          {counts.quotes > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilter('quotes')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                selectedFilter === 'quotes'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-500/10'
              }`}
            >
              <span>Cotizaciones</span>
              <span className="text-[10px] opacity-80">({counts.quotes})</span>
            </button>
          )}

          {counts.payments > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilter('payments')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                selectedFilter === 'payments'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-500/10'
              }`}
            >
              <span>Notas de Pago</span>
              <span className="text-[10px] opacity-80">({counts.payments})</span>
            </button>
          )}

          {counts.serviceOrders > 0 && (
            <button
              type="button"
              onClick={() => setSelectedFilter('service_orders')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                selectedFilter === 'service_orders'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:bg-slate-500/10'
              }`}
            >
              <span>Órdenes OS</span>
              <span className="text-[10px] opacity-80">({counts.serviceOrders})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSelectedFilter('commands')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              selectedFilter === 'commands'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-500 hover:bg-slate-500/10'
            }`}
          >
            Comandos
          </button>
        </div>

        {/* LISTA DE RESULTADOS */}
        <div
          ref={listRef}
          className="max-h-[55vh] overflow-y-auto p-2 sm:p-2.5 space-y-1 overscroll-contain"
        >
          {loadingEntities && filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-400">Indexando clientes, comprobantes y cotizaciones...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center space-y-1">
              <p className="text-xs font-bold text-slate-400">
                No se encontraron resultados para "{query}"
              </p>
              <p className="text-[11px] text-slate-500">
                Prueba buscando por nombre de cliente, código (COT-..., NP-..., OS-...) o RUC.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              const isCreator = item.id === 'creator-integral';

              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={item.perform}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition text-xs select-none group/item ${
                    isSelected
                      ? isCreator
                        ? 'bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-slate-900 dark:text-white ring-2 ring-indigo-500/40'
                        : 'bg-indigo-600 text-white shadow-md'
                      : isCreator
                      ? 'bg-amber-500/5 hover:bg-amber-500/10 text-slate-800 dark:text-slate-200'
                      : 'hover:bg-slate-500/10 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {/* LADO IZQUIERDO: Ícono + Título + Subtítulo */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition ${
                        isSelected && !isCreator
                          ? 'bg-white/20 border-white/30 text-white'
                          : 'bg-slate-500/10 border-slate-500/15'
                      }`}
                    >
                      {item.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-black text-xs sm:text-sm truncate ${
                            isSelected && !isCreator ? 'text-white' : ''
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 border shadow-2xs ${
                              isSelected && !isCreator
                                ? 'bg-white/20 text-white border-white/30'
                                : item.badgeClass || 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {item.subtitle && (
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected && !isCreator ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* LADO DERECHO: Botones de Acción Rápida */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Botón Vista Pública (si aplica a cotización, nota de pago, orden o servicio) */}
                    {item.publicUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.openPublic) item.openPublic();
                        }}
                        title={`${item.publicUrlLabel || 'Vista Pública'} (Abrir en nueva pestaña)`}
                        className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl font-bold text-[11px] flex items-center gap-1 transition cursor-pointer border ${
                          isSelected && !isCreator
                            ? 'bg-white/20 hover:bg-white/30 text-white border-white/30'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 dark:border-emerald-800'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{item.publicUrlLabel || 'Público'}</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </button>
                    )}

                    {/* Botón Editar / Abrir Módulo */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        item.perform();
                      }}
                      title="Ir y editar en su módulo"
                      className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl font-bold text-[11px] flex items-center gap-1 transition cursor-pointer border ${
                        isSelected && !isCreator
                          ? 'bg-white text-indigo-700 border-white shadow-2xs font-extrabold'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800'
                      }`}
                    >
                      <Edit2 className="w-3 h-3" />
                      <span className="hidden sm:inline">
                        {item.type === 'action' ? 'Ejecutar' : 'Editar'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PIE DE LA PALETA: ATAJOS DE TECLADO */}
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between text-[11px] text-slate-400 shrink-0 font-medium"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd
                className="px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold"
                style={{ borderColor: 'var(--app-border)' }}
              >
                ↑↓
              </kbd>
              Navegar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd
                className="px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold"
                style={{ borderColor: 'var(--app-border)' }}
              >
                ↵
              </kbd>
              Editar / Abrir
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd
                className="px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold"
                style={{ borderColor: 'var(--app-border)' }}
              >
                Ctrl + ↵
              </kbd>
              Vista Pública
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Roma Command System</span>
          </div>
        </div>
      </div>
    </div>
  );
};
