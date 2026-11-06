import React, { useState, useEffect } from 'react';
import { useApp, PermissionGate } from '../context/AppContext';
import {
  ServiceOrder,
  ServiceOrderDeliverable,
  ServiceOrderStatus,
  ServiceOrderCategory,
  SocialPostPlatform,
  Client,
  Quote,
  User as UserType,
} from '../../shared/types';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Share2,
  Trash2,
  Edit3,
  MessageCircle,
  Sparkles,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Globe,
  Video,
  Palette,
  DollarSign,
  AlertCircle,
  FileText,
  X,
  CheckCircle2,
  Layers,
  ChevronRight,
  Eye,
} from 'lucide-react';

const INITIAL_DELIVERABLES_BRANDING = [
  'Manual de Identidad Visual',
  'Logotipo principal y versiones secundarias',
  'Paleta cromática oficial y tipografías',
  'Kit de plantillas editables para redes sociales',
  'Papelería corporativa digital (hojas membretadas, tarjetas)',
  'Mockups de presentación y aplicación de marca',
];

const INITIAL_DELIVERABLES_AUDIOVISUAL = [
  'Reels / TikToks producidos en alta resolución (4K)',
  'Spot publicitario comercial para pauta',
  'Sesión fotográfica de productos / platillos (editadas)',
  'Video corporativo / institucional',
  'Animación de logotipo (Motion Logo)',
];

const INITIAL_DELIVERABLES_WEB = [
  'Diseño UI/UX interactivo en Figma',
  'Landing page de alta conversión optimizada',
  'Sitio Web Corporativo multipágina',
  'Tienda Virtual E-commerce con catálogo',
  'Integración de pasarelas de pago',
  'Configuración de Dominio, Hosting y SSL',
  'Optimización SEO y velocidad de carga',
];

export const ServiceOrdersModule: React.FC = () => {
  const { tenant, apiFetch, toast, confirmAction, can } = useApp();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [teamUsers, setTeamUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal y Edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<ServiceOrder> | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, clientsRes, quotesRes, usersRes] = await Promise.all([
        apiFetch<{ orders: ServiceOrder[] }>('/api/service-orders').catch(() => ({ orders: [] })),
        apiFetch<{ clients: Client[] }>('/api/clients').catch(() => ({ clients: [] })),
        apiFetch<{ quotes: Quote[] }>('/api/quotes').catch(() => ({ quotes: [] })),
        apiFetch<{ users: UserType[] }>('/api/settings/users').catch(() => ({ users: [] })),
      ]);
      setOrders(ordersRes.orders || []);
      setClients(clientsRes.clients || []);
      setQuotes(quotesRes.quotes || []);
      setTeamUsers(usersRes.users || []);
    } catch {
      toast('Error al cargar órdenes de servicio', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNewOrder = () => {
    const firstClient = clients[0];
    const year = new Date().getFullYear();
    const autoCode = `OS-${year}-${String(orders.length + 1).padStart(3, '0')}`;

    setEditingOrder({
      code: autoCode,
      title: 'Plan Integral de Servicios Creativos',
      clientId: firstClient ? firstClient.id : '',
      clientName: firstClient ? firstClient.name : '',
      companyName: firstClient ? firstClient.name : '',
      brandName: firstClient?.brands?.[0]?.name || '',
      documentType: (firstClient?.documentType as any) || 'RUC',
      documentNumber: firstClient?.documentNumber || '',
      whatsapp: firstClient?.whatsapp || '',
      email: firstClient?.email || '',
      startDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      projectManagerId: teamUsers[0]?.id || '',
      projectManagerName: teamUsers[0]?.name || '',
      status: 'active',
      totalProgress: 0,
      socialMedia: {
        enabled: true,
        hasBudget: false,
        budgetAmount: 0,
        budgetCurrency: 'PEN',
        budgetManagedBy: 'agency',
        platforms: ['instagram', 'facebook'],
        postsCount: 12,
        reelsCount: 4,
        storiesCount: 15,
        scopeNotes:
          'Estrategia de contenidos, redacción de copys, diseño gráfico, edición de reels dinámicos y reportes mensuales.',
      },
      branding: {
        enabled: false,
        deliverablesList: [...INITIAL_DELIVERABLES_BRANDING],
        initialProposalsCount: 2,
        reviewRoundsCount: 2,
        scopeNotes: 'Exploración visual, concepto y manual de directrices de identidad corporativa.',
      },
      audiovisual: {
        enabled: false,
        deliverablesList: [...INITIAL_DELIVERABLES_AUDIOVISUAL],
        shootingHours: 4,
        location: 'Local comercial del cliente / Estudio Roma',
        scopeNotes: 'Dirección de arte, jornada de rodaje con cámaras 4K e iluminación profesional.',
      },
      web: {
        enabled: false,
        deliverablesList: [...INITIAL_DELIVERABLES_WEB],
        platform: 'WordPress + Elementor Pro',
        includesHosting: true,
        domainName: '',
        scopeNotes: 'Estructura responsive, certificado SSL, optimización de velocidad y SEO on-page.',
      },
      deliverables: [
        {
          id: `del-${Date.now()}-1`,
          category: 'social_media',
          title: 'Planificación de Grilla Mensual & Estrategia',
          description: 'Pilares de contenido y temas semanales',
          quantity: 1,
          assignedUserId: teamUsers[0]?.id || '',
          assignedUserName: teamUsers[0]?.name || '',
          assignedUserRole: teamUsers[0]?.jobTitle || '',
          status: 'in_progress',
          dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        },
      ],
      notes:
        'Reuniones de sincronización semanales vía Google Meet. Entregas de avances por canal de WhatsApp oficial.',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditOrder = (order: ServiceOrder) => {
    setEditingOrder(JSON.parse(JSON.stringify(order)));
    setIsModalOpen(true);
  };

  // Escuchar navegación dirigida desde Command Palette
  useEffect(() => {
    if (orders.length === 0) return;

    const handleTarget = (target: { entityId?: string; id?: string; code?: string; query?: string }) => {
      const targetId = target.entityId || target.id;
      const found = orders.find(
        (o) =>
          (targetId && o.id === targetId) ||
          (target.code && o.code?.toLowerCase() === target.code.toLowerCase())
      );
      if (found) {
        handleOpenEditOrder(found);
      } else if (target.query) {
        setSearch(target.query);
      }
    };

    try {
      const raw = sessionStorage.getItem('roma_open_target');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.module === 'service_orders') {
          sessionStorage.removeItem('roma_open_target');
          handleTarget(parsed);
        }
      }
    } catch {}

    const listener = (e: any) => {
      if (e.detail?.module === 'service_orders') {
        sessionStorage.removeItem('roma_open_target');
        handleTarget(e.detail);
      }
    };
    window.addEventListener('roma:open-target', listener);
    return () => window.removeEventListener('roma:open-target', listener);
  }, [orders]);

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !editingOrder.title?.trim() || !editingOrder.clientId) {
      toast('Por favor ingrese el título y seleccione un cliente', 'warning');
      return;
    }

    try {
      if (editingOrder.id) {
        const res = await apiFetch<{ order: ServiceOrder }>(
          `/api/service-orders/${editingOrder.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingOrder),
          }
        );
        setOrders((prev) => prev.map((o) => (o.id === res.order.id ? res.order : o)));
        toast('Orden de Servicio actualizada correctamente', 'success');
      } else {
        const res = await apiFetch<{ order: ServiceOrder }>('/api/service-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingOrder),
        });
        setOrders((prev) => [res.order, ...prev]);
        toast('Orden de Servicio creada exitosamente', 'success');
      }
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (err: any) {
      toast(err.message || 'Error al guardar la orden de servicio', 'error');
    }
  };

  const handleDeleteOrder = async (id: string, code: string) => {
    const ok = await confirmAction({
      title: '¿Eliminar Orden de Servicio?',
      message: `¿Estás seguro de eliminar la orden ${code}? Se perderá la hoja de ruta y el enlace público.`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/service-orders/${id}`, { method: 'DELETE' });
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast('Orden de Servicio eliminada', 'success');
    } catch {
      toast('Error al eliminar orden de servicio', 'error');
    }
  };

  const copyPublicLink = (token: string) => {
    const url = `${window.location.origin}/?os=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
    toast('Enlace público copiado al portapapeles', 'info');
  };

  const handleSendWhatsApp = (order: ServiceOrder) => {
    const phone = (order.whatsapp || '').replace(/[^0-9]/g, '');
    const publicUrl = `${window.location.origin}/?os=${order.publicToken}`;
    const text = `Hola *${order.clientName}*, te compartimos tu *Orden de Servicio Oficial* (${order.code}) de *${tenant.companyInfo.commercialName}*.\n\nPuedes revisar la guía detallada de tus servicios, entregables y avances en el siguiente enlace:\n${publicUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Manejadores para entregables en el modal
  const handleAddDeliverable = () => {
    if (!editingOrder) return;
    const newDel: ServiceOrderDeliverable = {
      id: `del-${Date.now()}`,
      category: 'social_media',
      title: 'Nuevo Entregable',
      description: '',
      quantity: 1,
      assignedUserId: teamUsers[0]?.id || '',
      assignedUserName: teamUsers[0]?.name || '',
      assignedUserRole: teamUsers[0]?.jobTitle || '',
      status: 'pending',
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    };
    setEditingOrder({
      ...editingOrder,
      deliverables: [...(editingOrder.deliverables || []), newDel],
    });
  };

  const handleRemoveDeliverable = (delId: string) => {
    if (!editingOrder) return;
    setEditingOrder({
      ...editingOrder,
      deliverables: (editingOrder.deliverables || []).filter((d) => d.id !== delId),
    });
  };

  // Filtrado
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      (o.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.brandName || '').toLowerCase().includes(search.toLowerCase());
    const matchClient = !clientFilter || o.clientId === clientFilter;
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchClient && matchStatus;
  });

  const STATUS_LABELS: Record<ServiceOrderStatus, { label: string; bg: string; text: string }> = {
    draft: {
      label: 'Borrador',
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-600 dark:text-slate-400',
    },
    active: {
      label: 'En Ejecución',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-400',
    },
    in_review: {
      label: 'En Revisión',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-400',
    },
    completed: {
      label: 'Finalizada',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-400',
    },
    cancelled: {
      label: 'Cancelada',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-400',
    },
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Módulo de Operaciones & Clientes
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Órdenes de Servicio (OS)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Guía técnica y operativa detallada de los servicios contratados por cada cliente. Con
            switchers por servicio y vista pública interactiva.
          </p>
        </div>

        <PermissionGate permission="service_orders.create">
          <button
            type="button"
            onClick={handleOpenNewOrder}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Orden de Servicio</span>
          </button>
        </PermissionGate>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Órdenes
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{orders.length}</p>
          <p className="text-[11px] text-slate-500">Registradas en el tenant</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block mb-1">
            En Ejecución
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {orders.filter((o) => o.status === 'active').length}
          </p>
          <p className="text-[11px] text-slate-500">Servicios activos en curso</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
            En Revisión / QA
          </span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {orders.filter((o) => o.status === 'in_review').length}
          </p>
          <p className="text-[11px] text-slate-500">Por aprobación del cliente</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block mb-1">
            Finalizadas
          </span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {orders.filter((o) => o.status === 'completed').length}
          </p>
          <p className="text-[11px] text-slate-500">Servicios concluidos</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, título, cliente o marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value="">Todos los Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">En Ejecución</option>
            <option value="in_review">En Revisión</option>
            <option value="completed">Finalizada</option>
            <option value="draft">Borrador</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Listado de Órdenes */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Cargando órdenes de servicio...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No se encontraron órdenes de servicio
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Crea la primera Orden de Servicio para detallar las especificaciones y entregables de cada
            cliente.
          </p>
          <button
            type="button"
            onClick={handleOpenNewOrder}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-500 transition cursor-pointer"
          >
            Crear Orden de Servicio
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const st = STATUS_LABELS[order.status] || STATUS_LABELS.active;
            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Info Principal */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-mono">
                      {order.code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                    {order.quoteCode && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        Cotización: {order.quoteCode}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    {order.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {order.clientName}
                    </span>
                    {order.brandName && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        • {order.brandName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {order.startDate} al {order.deliveryDate}
                    </span>
                  </div>

                  {/* Switchers Activos (Badges) */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {order.socialMedia?.enabled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center gap-1 border border-pink-200 dark:border-pink-800">
                        <Instagram className="w-3 h-3" />
                        <span>Redes ({order.socialMedia.postsCount || 0} posts)</span>
                        {order.socialMedia.hasBudget && (
                          <span className="text-[9px] bg-pink-600 text-white px-1 rounded-sm ml-0.5">
                            Pauta
                          </span>
                        )}
                      </span>
                    )}

                    {order.branding?.enabled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center gap-1 border border-purple-200 dark:border-purple-800">
                        <Palette className="w-3 h-3" />
                        <span>Branding ({order.branding.deliverablesList?.length || 0})</span>
                      </span>
                    )}

                    {order.audiovisual?.enabled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-1 border border-rose-200 dark:border-rose-800">
                        <Video className="w-3 h-3" />
                        <span>Audiovisual ({order.audiovisual.shootingHours || 0}h)</span>
                      </span>
                    )}

                    {order.web?.enabled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center gap-1 border border-sky-200 dark:border-sky-800">
                        <Globe className="w-3 h-3" />
                        <span>Web ({order.web.platform || 'Site'})</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    {/* Botón Ver Vista Pública */}
                    <a
                      href={`/?os=${order.publicToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Abrir vista pública del cliente"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Vista Pública</span>
                    </a>

                    {/* Copiar Enlace */}
                    <button
                      type="button"
                      onClick={() => copyPublicLink(order.publicToken)}
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                      title="Copiar enlace para el cliente"
                    >
                      {copiedToken === order.publicToken ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Enviar WhatsApp */}
                    {order.whatsapp && (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(order)}
                        className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 transition cursor-pointer"
                        title="Enviar enlace por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}

                    {/* Editar */}
                    <PermissionGate permission="service_orders.edit">
                      <button
                        type="button"
                        onClick={() => handleOpenEditOrder(order)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 transition cursor-pointer"
                        title="Editar orden de servicio"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </PermissionGate>

                    {/* Eliminar */}
                    <PermissionGate permission="service_orders.delete">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(order.id, order.code)}
                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                        title="Eliminar orden de servicio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL CREAR / EDITAR ORDEN DE SERVICIO CON TODOS LOS SWITCHERS */}
      {/* ===================================================================== */}
      {isModalOpen && editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-4xl shadow-2xl max-h-[92vh] overflow-y-auto space-y-6">
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                  Especificación de Servicio
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {editingOrder.id ? `Editar Orden: ${editingOrder.code}` : 'Nueva Orden de Servicio (OS)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="space-y-6 text-xs">
              {/* 1. DATOS GENERALES */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Datos Generales del Servicio</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Código de OS *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingOrder.code || ''}
                      onChange={(e) => setEditingOrder({ ...editingOrder, code: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Título / Nombre del Proyecto *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Plan Integral de Redes Sociales & Identidad de Marca"
                      value={editingOrder.title || ''}
                      onChange={(e) => setEditingOrder({ ...editingOrder, title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Cliente *
                    </label>
                    <select
                      required
                      value={editingOrder.clientId || ''}
                      onChange={(e) => {
                        const c = clients.find((item) => item.id === e.target.value);
                        setEditingOrder({
                          ...editingOrder,
                          clientId: e.target.value,
                          clientName: c ? c.name : '',
                          companyName: c ? c.name : '',
                          brandName: c?.brands?.[0]?.name || '',
                          documentType: (c?.documentType as any) || 'RUC',
                          documentNumber: c?.documentNumber || '',
                          whatsapp: c?.whatsapp || '',
                          email: c?.email || '',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <option value="">Selecciona un cliente</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Marca Asignada
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre de la marca comercial"
                      value={editingOrder.brandName || ''}
                      onChange={(e) => setEditingOrder({ ...editingOrder, brandName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Cotización Vinculada (Opcional)
                    </label>
                    <select
                      value={editingOrder.quoteId || ''}
                      onChange={(e) => {
                        const q = quotes.find((quote) => quote.id === e.target.value);
                        setEditingOrder({
                          ...editingOrder,
                          quoteId: e.target.value,
                          quoteCode: q ? q.code : '',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <option value="">Ninguna</option>
                      {quotes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.code} - {q.clientName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={editingOrder.startDate || ''}
                      onChange={(e) => setEditingOrder({ ...editingOrder, startDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Fecha Entrega / Fin Ciclo
                    </label>
                    <input
                      type="date"
                      value={editingOrder.deliveryDate || ''}
                      onChange={(e) => setEditingOrder({ ...editingOrder, deliveryDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Project Manager
                    </label>
                    <select
                      value={editingOrder.projectManagerId || ''}
                      onChange={(e) => {
                        const u = teamUsers.find((user) => user.id === e.target.value);
                        setEditingOrder({
                          ...editingOrder,
                          projectManagerId: e.target.value,
                          projectManagerName: u ? u.name : '',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <option value="">Sin Asignar</option>
                      {teamUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Estado de la OS
                    </label>
                    <select
                      value={editingOrder.status || 'active'}
                      onChange={(e) =>
                        setEditingOrder({
                          ...editingOrder,
                          status: e.target.value as ServiceOrderStatus,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <option value="draft">Borrador</option>
                      <option value="active">En Ejecución Activa</option>
                      <option value="in_review">En Revisión</option>
                      <option value="completed">Finalizada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* =============================================================== */}
              {/* 2. SECCIÓN DE SWITCHERS POR SERVICIO */}
              {/* =============================================================== */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-500" />
                    <span>Servicios Contratados (Switchers Dinámicos)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Activa los servicios que incluye este cliente
                  </span>
                </div>

                {/* 2.1 SWITCHER REDES SOCIALES */}
                <div
                  className={`p-5 rounded-3xl border transition ${
                    editingOrder.socialMedia?.enabled
                      ? 'bg-pink-50/20 dark:bg-pink-950/10 border-pink-300 dark:border-pink-800'
                      : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-pink-600 text-white flex items-center justify-center">
                        <Instagram className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                          Servicio de Redes Sociales
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Grilla de contenidos, reels, stories y estrategia digital.
                        </p>
                      </div>
                    </div>

                    {/* Switcher Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        setEditingOrder({
                          ...editingOrder,
                          socialMedia: {
                            ...editingOrder.socialMedia!,
                            enabled: !editingOrder.socialMedia?.enabled,
                          },
                        })
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        editingOrder.socialMedia?.enabled ? 'bg-pink-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          editingOrder.socialMedia?.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {editingOrder.socialMedia?.enabled && (
                    <div className="space-y-4 pt-3 border-t border-pink-100 dark:border-pink-900/40">
                      {/* Switcher de Presupuesto / Pauta */}
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                            ¿Lleva Presupuesto de Pauta Publicitaria (Ads)?
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingOrder({
                                ...editingOrder,
                                socialMedia: {
                                  ...editingOrder.socialMedia!,
                                  hasBudget: !editingOrder.socialMedia?.hasBudget,
                                },
                              })
                            }
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              editingOrder.socialMedia?.hasBudget ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                editingOrder.socialMedia?.hasBudget ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {editingOrder.socialMedia?.hasBudget && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            <div>
                              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                Monto Inversión Mensual
                              </label>
                              <input
                                type="number"
                                min="0"
                                placeholder="1500.00"
                                value={editingOrder.socialMedia.budgetAmount || 0}
                                onChange={(e) =>
                                  setEditingOrder({
                                    ...editingOrder,
                                    socialMedia: {
                                      ...editingOrder.socialMedia!,
                                      budgetAmount: parseFloat(e.target.value) || 0,
                                    },
                                  })
                                }
                                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                Moneda de Pauta
                              </label>
                              <select
                                value={editingOrder.socialMedia.budgetCurrency || 'PEN'}
                                onChange={(e) =>
                                  setEditingOrder({
                                    ...editingOrder,
                                    socialMedia: {
                                      ...editingOrder.socialMedia!,
                                      budgetCurrency: e.target.value as any,
                                    },
                                  })
                                }
                                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                              >
                                <option value="PEN">Soles (PEN)</option>
                                <option value="USD">Dólares (USD)</option>
                              </select>
                            </div>

                            <div>
                              <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                                Tarjeta Administrada Por
                              </label>
                              <select
                                value={editingOrder.socialMedia.budgetManagedBy || 'agency'}
                                onChange={(e) =>
                                  setEditingOrder({
                                    ...editingOrder,
                                    socialMedia: {
                                      ...editingOrder.socialMedia!,
                                      budgetManagedBy: e.target.value as any,
                                    },
                                  })
                                }
                                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                              >
                                <option value="agency">Agencia Roma</option>
                                <option value="client">Cuenta Directa del Cliente</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Redes a manejar */}
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          ¿Qué redes sociales se van a manejar?
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'x'] as SocialPostPlatform[]).map(
                            (plat) => {
                              const active = editingOrder.socialMedia?.platforms?.includes(plat);
                              return (
                                <button
                                  key={plat}
                                  type="button"
                                  onClick={() => {
                                    const current = editingOrder.socialMedia?.platforms || [];
                                    const next = active
                                      ? current.filter((p) => p !== plat)
                                      : [...current, plat];
                                    setEditingOrder({
                                      ...editingOrder,
                                      socialMedia: {
                                        ...editingOrder.socialMedia!,
                                        platforms: next,
                                      },
                                    });
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    active
                                      ? 'bg-pink-600 text-white shadow-xs'
                                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {active && <Check className="w-3.5 h-3.5" />}
                                  <span className="capitalize">{plat}</span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {/* Métricas de contenidos */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            N° Posts / Carruseles Mes
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editingOrder.socialMedia.postsCount || 0}
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                socialMedia: {
                                  ...editingOrder.socialMedia!,
                                  postsCount: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            N° Reels / Videos Mes
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editingOrder.socialMedia.reelsCount || 0}
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                socialMedia: {
                                  ...editingOrder.socialMedia!,
                                  reelsCount: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            N° Historias / Stories Mes
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editingOrder.socialMedia.storiesCount || 0}
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                socialMedia: {
                                  ...editingOrder.socialMedia!,
                                  storiesCount: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Detalle y Qué se va a hacer en Redes
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Redacción de copies, diseño de parrilla, community management..."
                          value={editingOrder.socialMedia.scopeNotes || ''}
                          onChange={(e) =>
                            setEditingOrder({
                              ...editingOrder,
                              socialMedia: {
                                ...editingOrder.socialMedia!,
                                scopeNotes: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2.2 SWITCHER IDENTIDAD VISUAL / BRANDING */}
                <div
                  className={`p-5 rounded-3xl border transition ${
                    editingOrder.branding?.enabled
                      ? 'bg-purple-50/20 dark:bg-purple-950/10 border-purple-300 dark:border-purple-800'
                      : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                        <Palette className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                          Servicio de Identidad Visual & Branding
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Manual de marca, logotipo, tipografías y piezas corporativas.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingOrder({
                          ...editingOrder,
                          branding: {
                            ...editingOrder.branding!,
                            enabled: !editingOrder.branding?.enabled,
                          },
                        })
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        editingOrder.branding?.enabled ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          editingOrder.branding?.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {editingOrder.branding?.enabled && (
                    <div className="space-y-4 pt-3 border-t border-purple-100 dark:border-purple-900/40">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          ¿Qué tipo de entregables se van a hacer?
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {INITIAL_DELIVERABLES_BRANDING.map((item) => {
                            const isChecked = editingOrder.branding?.deliverablesList?.includes(item);
                            return (
                              <label
                                key={item}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const current = editingOrder.branding?.deliverablesList || [];
                                    const next = e.target.checked
                                      ? [...current, item]
                                      : current.filter((x) => x !== item);
                                    setEditingOrder({
                                      ...editingOrder,
                                      branding: {
                                        ...editingOrder.branding!,
                                        deliverablesList: next,
                                      },
                                    });
                                  }}
                                  className="rounded text-purple-600 focus:ring-purple-500"
                                />
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                  {item}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            N° Propuestas Iniciales
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editingOrder.branding.initialProposalsCount || 2}
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                branding: {
                                  ...editingOrder.branding!,
                                  initialProposalsCount: parseInt(e.target.value) || 2,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Rondas de Ajustes Incluidas
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editingOrder.branding.reviewRoundsCount || 2}
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                branding: {
                                  ...editingOrder.branding!,
                                  reviewRoundsCount: parseInt(e.target.value) || 2,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Alcance & Criterios de Branding
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Arquetipos, estilo visual, paleta de colores preferida..."
                          value={editingOrder.branding.scopeNotes || ''}
                          onChange={(e) =>
                            setEditingOrder({
                              ...editingOrder,
                              branding: {
                                ...editingOrder.branding!,
                                scopeNotes: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2.3 SWITCHER AUDIOVISUAL */}
                <div
                  className={`p-5 rounded-3xl border transition ${
                    editingOrder.audiovisual?.enabled
                      ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-300 dark:border-rose-800'
                      : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                        <Video className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                          Servicio Audiovisual & Fotografía
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Rodaje en 4K, sesiones fotográficas, spots y postproducción de video.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingOrder({
                          ...editingOrder,
                          audiovisual: {
                            ...editingOrder.audiovisual!,
                            enabled: !editingOrder.audiovisual?.enabled,
                          },
                        })
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        editingOrder.audiovisual?.enabled ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          editingOrder.audiovisual?.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {editingOrder.audiovisual?.enabled && (
                    <div className="space-y-4 pt-3 border-t border-rose-100 dark:border-rose-900/40">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          ¿Qué tipo de entregables se van a hacer?
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {INITIAL_DELIVERABLES_AUDIOVISUAL.map((item) => {
                            const isChecked = editingOrder.audiovisual?.deliverablesList?.includes(item);
                            return (
                              <label
                                key={item}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const current = editingOrder.audiovisual?.deliverablesList || [];
                                    const next = e.target.checked
                                      ? [...current, item]
                                      : current.filter((x) => x !== item);
                                    setEditingOrder({
                                      ...editingOrder,
                                      audiovisual: {
                                        ...editingOrder.audiovisual!,
                                        deliverablesList: next,
                                      },
                                    });
                                  }}
                                  className="rounded text-rose-600 focus:ring-rose-500"
                                />
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                  {item}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Horas de Rodaje Estimadas
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editingOrder.audiovisual.shootingHours || 0}
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                audiovisual: {
                                  ...editingOrder.audiovisual!,
                                  shootingHours: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Locación del Rodaje
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Local comercial del cliente / Estudio Roma"
                            value={editingOrder.audiovisual.location || ''}
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                audiovisual: {
                                  ...editingOrder.audiovisual!,
                                  location: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2.4 SWITCHER PÁGINA WEB */}
                <div
                  className={`p-5 rounded-3xl border transition ${
                    editingOrder.web?.enabled
                      ? 'bg-sky-50/20 dark:bg-sky-950/10 border-sky-300 dark:border-sky-800'
                      : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                          Servicio de Página Web & Desarrollo Digital
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Diseño UI/UX, desarrollo responsive, pasarelas de pago y hosting.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingOrder({
                          ...editingOrder,
                          web: {
                            ...editingOrder.web!,
                            enabled: !editingOrder.web?.enabled,
                          },
                        })
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        editingOrder.web?.enabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          editingOrder.web?.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {editingOrder.web?.enabled && (
                    <div className="space-y-4 pt-3 border-t border-sky-100 dark:border-sky-900/40">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          ¿Qué tipo de entregables se van a hacer?
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {INITIAL_DELIVERABLES_WEB.map((item) => {
                            const isChecked = editingOrder.web?.deliverablesList?.includes(item);
                            return (
                              <label
                                key={item}
                                className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const current = editingOrder.web?.deliverablesList || [];
                                    const next = e.target.checked
                                      ? [...current, item]
                                      : current.filter((x) => x !== item);
                                    setEditingOrder({
                                      ...editingOrder,
                                      web: {
                                        ...editingOrder.web!,
                                        deliverablesList: next,
                                      },
                                    });
                                  }}
                                  className="rounded text-sky-600 focus:ring-sky-500"
                                />
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                  {item}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Plataforma / CMS
                          </label>
                          <input
                            type="text"
                            placeholder="WordPress + Elementor / React"
                            value={editingOrder.web.platform || ''}
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                web: {
                                  ...editingOrder.web!,
                                  platform: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Dominio Previsto
                          </label>
                          <input
                            type="text"
                            placeholder="ej: www.marca.pe"
                            value={editingOrder.web.domainName || ''}
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                web: {
                                  ...editingOrder.web!,
                                  domainName: e.target.value,
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            ¿Incluye Hosting y Dominio?
                          </label>
                          <select
                            value={editingOrder.web.includesHosting ? 'yes' : 'no'}
                            onChange={(e) =>
                              setEditingOrder({
                                ...editingOrder,
                                web: {
                                  ...editingOrder.web!,
                                  includesHosting: e.target.value === 'yes',
                                },
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                          >
                            <option value="yes">Sí, provisto por Roma</option>
                            <option value="no">No, por cuenta del cliente</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* =============================================================== */}
              {/* 3. DESGLOSE DE ENTREGABLES Y RESPONSABLES ASIGNADOS */}
              {/* =============================================================== */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4 text-amber-500" />
                      <span>Entregables Específicos & Asignación de Responsables</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Detalla cada hito y qué especialista del equipo lo ejecutará.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddDeliverable}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Ítem</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(editingOrder.deliverables || []).map((del, idx) => (
                    <div
                      key={del.id || idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Ítem #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDeliverable(del.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Eliminar este entregable"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            Título del Entregable *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Propuesta de logotipo o Diseño de 12 piezas"
                            value={del.title}
                            onChange={(e) => {
                              const list = [...(editingOrder.deliverables || [])];
                              list[idx].title = e.target.value;
                              setEditingOrder({ ...editingOrder, deliverables: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            Servicio / Tipo
                          </label>
                          <select
                            value={del.category}
                            onChange={(e) => {
                              const list = [...(editingOrder.deliverables || [])];
                              list[idx].category = e.target.value as ServiceOrderCategory;
                              setEditingOrder({ ...editingOrder, deliverables: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                          >
                            <option value="social_media">Redes Sociales</option>
                            <option value="branding">Identidad / Branding</option>
                            <option value="audiovisual">Audiovisual</option>
                            <option value="web">Página Web</option>
                            <option value="general">General</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            Responsable Asignado *
                          </label>
                          <select
                            value={del.assignedUserId || ''}
                            onChange={(e) => {
                              const u = teamUsers.find((user) => user.id === e.target.value);
                              const list = [...(editingOrder.deliverables || [])];
                              list[idx].assignedUserId = e.target.value;
                              list[idx].assignedUserName = u ? u.name : '';
                              list[idx].assignedUserRole = u ? u.jobTitle : '';
                              setEditingOrder({ ...editingOrder, deliverables: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400"
                          >
                            <option value="">Selecciona Colaborador</option>
                            {teamUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name} ({u.jobTitle})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            Fecha Límite
                          </label>
                          <input
                            type="date"
                            value={del.dueDate || ''}
                            onChange={(e) => {
                              const list = [...(editingOrder.deliverables || [])];
                              list[idx].dueDate = e.target.value;
                              setEditingOrder({ ...editingOrder, deliverables: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            Estado del Ítem
                          </label>
                          <select
                            value={del.status}
                            onChange={(e) => {
                              const list = [...(editingOrder.deliverables || [])];
                              list[idx].status = e.target.value as any;
                              setEditingOrder({ ...editingOrder, deliverables: list });
                            }}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                          >
                            <option value="pending">Pendiente</option>
                            <option value="in_progress">En Proceso</option>
                            <option value="review">En Revisión</option>
                            <option value="completed">Completado</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(editingOrder.deliverables || []).length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      No has agregado entregables específicos aún. Haz clic en "Agregar Ítem" para
                      asignar tareas y responsables.
                    </div>
                  )}
                </div>
              </div>

              {/* 4. NOTAS Y ACUERDOS */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notas Generales, Pautas y Acuerdos de Trabajo
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles sobre canales de comunicación, horarios de atención, entregas..."
                  value={editingOrder.notes || ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed"
                />
              </div>

              {/* Botones de Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 py-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Guardar Orden de Servicio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
