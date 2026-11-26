import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { PublicPaymentNoteView } from '../components/PublicPaymentNoteView';
import { UniversalMediaEmbed } from '../components/UniversalMediaEmbed';
import { getPlatformIcon } from './workspace/types';
import {
  ClientBrand,
  Quote,
  PaymentNote,
  ServiceOrder,
  WorkspaceProject,
  WorkspaceMonth,
  WorkspacePost,
  WorkspaceTask,
  BrandGuideline,
  BiolinkProfile,
  Service,
  SoftwareProject,
} from '../../shared/types';
import {
  Home,
  Layers,
  Sparkles,
  FileText,
  CreditCard,
  Sun,
  Moon,
  LogOut,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  MessageCircle,
  Calendar,
  ArrowRight,
  ThumbsUp,
  MessageSquare,
  Building2,
  Palette,
  Link2,
  Package,
  RefreshCw,
  X,
  ArrowLeft,
  Share2,
  Code2,
  Globe,
} from 'lucide-react';

type PortalTab = 'inicio' | 'proyectos' | 'marca' | 'cotizaciones' | 'pagos';

interface PortalOverviewData {
  client: {
    id: string;
    name: string;
    documentType: string;
    documentNumber: string;
    whatsapp: string;
    email: string | null;
    status: string;
  };
  brands: ClientBrand[];
  summary: {
    brandsCount: number;
    activeProjectsCount: number;
    pendingQuotesCount: number;
    pendingPaymentsCount: number;
    postsInReviewCount: number;
    milestonesInReviewCount?: number;
    totalPostsCount: number;
    approvedPostsCount: number;
  };
  quotes: Quote[];
  paymentNotes: PaymentNote[];
  serviceOrders: ServiceOrder[];
  workspaceProjects: WorkspaceProject[];
  workspaceMonths: WorkspaceMonth[];
  workspacePosts: WorkspacePost[];
  workspaceTasks: WorkspaceTask[];
  brandGuidelines: BrandGuideline[];
  biolinks: BiolinkProfile[];
  servicesCatalog: Service[];
  softwareProjects?: SoftwareProject[];
}

const QUOTE_STATUS_META: Record<string, { label: string; badge: string }> = {
  draft: { label: 'Borrador', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20' },
  sent: { label: 'Por aprobar', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  approved: { label: 'Aprobada', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  rejected: { label: 'Con observaciones', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  expired: { label: 'Expirada', badge: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' },
};

const PAYMENT_STATUS_META: Record<string, { label: string; badge: string }> = {
  pending: { label: 'Pendiente', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  partial: { label: 'Pago parcial', badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  paid: { label: 'Pagado', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  cancelled: { label: 'Anulado', badge: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' },
};

const POST_STATUS_META: Record<string, { label: string; badge: string }> = {
  idea: { label: 'Idea', badge: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  writing: { label: 'Redacción', badge: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  design: { label: 'En diseño', badge: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
  review: { label: 'Por aprobar', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  approved: { label: 'Aprobado', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  published: { label: 'Publicado', badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
};

function formatCurrency(amount: number | undefined, symbol = 'S/'): string {
  const value = Number(amount || 0);
  return `${symbol} ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const ClientPortal: React.FC = () => {
  const { tenant, user, logout, apiFetch, toast, resolvedTheme, toggleQuickTheme } = useApp();
  const [activeTab, setActiveTab] = useState<PortalTab>('inicio');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState<PortalOverviewData | null>(null);
  const [activePaymentNoteToken, setActivePaymentNoteToken] = useState<string | null>(null);
  const [postStatusFilter, setPostStatusFilter] = useState<'all' | 'review' | 'approved' | 'production'>('all');
  const [previewPost, setPreviewPost] = useState<WorkspacePost | null>(null);

  // Modal de respuesta a cotización, entregable o hito de software
  const [feedbackModal, setFeedbackModal] = useState<{
    type: 'quote' | 'post' | 'software_milestone';
    id: string;
    projectId?: string;
    title: string;
    action: 'approve' | 'reject' | 'changes';
  } | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState<boolean>(false);

  const isDark = resolvedTheme === 'dark';
  const currencySymbol = tenant?.customization?.currencySymbol || 'S/';
  const commercialName = tenant?.companyInfo?.commercialName || tenant?.name || 'ROMA';
  const logoUrl = isDark
    ? tenant?.customization?.logoDarkUrl || tenant?.customization?.logoLightUrl
    : tenant?.customization?.logoLightUrl || tenant?.customization?.logoDarkUrl;

  const loadOverview = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await apiFetch<PortalOverviewData>('/api/portal/overview');
        setData(res);
      } catch (err) {
        toast((err as Error).message || 'No se pudo cargar tu portal.', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiFetch, toast]
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const brands = data?.brands || [];
  const activeBrand = useMemo(
    () => (selectedBrandId === 'all' ? null : brands.find((b) => b.id === selectedBrandId) || null),
    [brands, selectedBrandId]
  );

  // Filtrado por marca seleccionada
  const filteredPosts = useMemo(() => {
    const list = data?.workspacePosts || [];
    if (selectedBrandId === 'all') return list;
    return list.filter(
      (p) =>
        p.brandId === selectedBrandId ||
        (activeBrand && p.brandName?.toLowerCase() === activeBrand.name.toLowerCase())
    );
  }, [data?.workspacePosts, selectedBrandId, activeBrand]);

  const filteredProjects = useMemo(() => {
    const list = data?.workspaceProjects || [];
    if (selectedBrandId === 'all') return list;
    return list.filter(
      (p) =>
        p.brandId === selectedBrandId ||
        (activeBrand && p.brandName?.toLowerCase() === activeBrand.name.toLowerCase())
    );
  }, [data?.workspaceProjects, selectedBrandId, activeBrand]);

  const filteredSoftwareProjects = useMemo(() => {
    const list = data?.softwareProjects || [];
    if (selectedBrandId === 'all') return list;
    return list.filter(
      (p) =>
        p.brandId === selectedBrandId ||
        (activeBrand && p.brandName?.toLowerCase() === activeBrand.name.toLowerCase())
    );
  }, [data?.softwareProjects, selectedBrandId, activeBrand]);

  const filteredMonths = useMemo(() => {
    const list = data?.workspaceMonths || [];
    if (selectedBrandId === 'all') return list;
    const projectIds = new Set(filteredProjects.map((p) => p.id));
    return list.filter((m) => projectIds.has(m.projectId));
  }, [data?.workspaceMonths, selectedBrandId, filteredProjects]);

  const filteredPaymentNotes = useMemo(() => {
    const list = data?.paymentNotes || [];
    if (selectedBrandId === 'all') return list;
    return list.filter(
      (p) =>
        !p.brandId ||
        p.brandId === selectedBrandId ||
        (activeBrand && p.brandName?.toLowerCase() === activeBrand.name.toLowerCase())
    );
  }, [data?.paymentNotes, selectedBrandId, activeBrand]);

  const filteredServiceOrders = useMemo(() => {
    const list = data?.serviceOrders || [];
    if (selectedBrandId === 'all' || !activeBrand) return list;
    return list.filter(
      (so) => !so.brandName || so.brandName.toLowerCase() === activeBrand.name.toLowerCase()
    );
  }, [data?.serviceOrders, selectedBrandId, activeBrand]);

  const filteredBrandGuidelines = useMemo(() => {
    const list = data?.brandGuidelines || [];
    if (selectedBrandId === 'all' || !activeBrand) return list;
    return list.filter(
      (bg) => bg.brandName?.toLowerCase() === activeBrand.name.toLowerCase()
    );
  }, [data?.brandGuidelines, selectedBrandId, activeBrand]);

  const handleConfirmFeedback = async () => {
    if (!feedbackModal) return;
    setSubmittingFeedback(true);
    try {
      if (feedbackModal.type === 'quote') {
        await apiFetch(`/api/portal/quotes/${feedbackModal.id}/respond`, {
          method: 'POST',
          body: JSON.stringify({
            action: feedbackModal.action === 'approve' ? 'approve' : 'reject',
            comment: feedbackText,
          }),
        });
        toast(
          feedbackModal.action === 'approve'
            ? 'Cotización aprobada correctamente.'
            : 'Observaciones enviadas a la agencia.',
          'success'
        );
      } else if (feedbackModal.type === 'software_milestone' && feedbackModal.projectId) {
        await apiFetch(
          `/api/portal/software/${feedbackModal.projectId}/milestones/${feedbackModal.id}/review`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              decision: feedbackModal.action === 'approve' ? 'approved' : 'changes_requested',
              notes: feedbackText,
            }),
          }
        );
        toast(
          feedbackModal.action === 'approve'
            ? '¡Hito de software aprobado oficialmente!'
            : 'Solicitud de ajustes enviada al equipo de desarrollo.',
          'success'
        );
      } else {
        await apiFetch(`/api/portal/workspace-posts/${feedbackModal.id}/feedback`, {
          method: 'POST',
          body: JSON.stringify({
            action: feedbackModal.action === 'approve' ? 'approve' : 'changes',
            feedback: feedbackText,
          }),
        });
        toast(
          feedbackModal.action === 'approve'
            ? 'Entregable aprobado.'
            : 'Solicitud de cambios enviada.',
          'success'
        );
      }
      setFeedbackModal(null);
      setFeedbackText('');
      await loadOverview(true);
    } catch (err) {
      toast((err as Error).message || 'No se pudo enviar tu respuesta.', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const navItems: Array<{ id: PortalTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }> = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    {
      id: 'proyectos',
      label: filteredSoftwareProjects.length > 0 ? 'Proyectos' : 'Redes Sociales',
      icon: Layers,
      badge:
        (data?.summary.postsInReviewCount || 0) + (data?.summary.milestonesInReviewCount || 0) ||
        undefined,
    },
    { id: 'marca', label: 'Marca', icon: Sparkles },
    {
      id: 'cotizaciones',
      label: 'Cotizaciones',
      icon: FileText,
      badge: data?.summary.pendingQuotesCount || undefined,
    },
    {
      id: 'pagos',
      label: 'Pagos',
      icon: CreditCard,
      badge: data?.summary.pendingPaymentsCount || undefined,
    },
  ];

  const agencyWhatsapp = tenant?.companyInfo?.phone?.replace(/\D/g, '');
  const attentionCount =
    (data?.summary.pendingQuotesCount || 0) +
    (data?.summary.pendingPaymentsCount || 0) +
    (data?.summary.postsInReviewCount || 0) +
    (data?.summary.milestonesInReviewCount || 0);

  if (loading && !data) {
    return (
      <div className="min-h-dvh tenant-bg tenant-text flex flex-col items-center justify-center gap-3">
        <div className="w-11 h-11 rounded-2xl tenant-btn-primary animate-pulse flex items-center justify-center font-extrabold text-white text-lg shadow-lg">
          {commercialName.charAt(0)}
        </div>
        <p className="text-xs font-bold tenant-muted tracking-wider uppercase">
          Cargando tu Portal de Cliente...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh tenant-bg tenant-text pb-24 md:pb-12">
      {/* ===================================================================== */}
      {/* TOPBAR MINIMALISTA (SIN SIDEBAR)                                      */}
      {/* ===================================================================== */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl transition-colors"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--app-surface) 84%, transparent)',
          borderColor: 'var(--app-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Izquierda: Logo + Selector de Marca */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={commercialName} className="h-7 w-auto max-w-[110px] object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-xl tenant-btn-primary flex items-center justify-center font-black text-white text-sm">
                  {commercialName.charAt(0)}
                </div>
              )}
              <span className="hidden xl:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                Portal Cliente
              </span>
            </div>

            {brands.length === 1 ? (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold max-w-[150px] truncate"
                style={{
                  backgroundColor: 'var(--app-bg)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: brands[0].brandColor || '#4f46e5' }}
                />
                <span className="truncate">{brands[0].name}</span>
              </div>
            ) : brands.length > 1 ? (
              <div className="relative flex items-center">
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  aria-label="Filtrar por marca"
                  className="appearance-none text-[11px] font-bold pl-2.5 pr-6 py-1.5 rounded-xl border cursor-pointer outline-none max-w-[140px] sm:max-w-[170px] truncate"
                  style={{
                    backgroundColor: 'var(--app-bg)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text)',
                  }}
                >
                  <option value="all">Marcas ({brands.length})</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 tenant-muted absolute right-1.5 pointer-events-none" />
              </div>
            ) : null}
          </div>

          {/* Centro: Navegación por píldoras (Desktop) */}
          <nav
            aria-label="Navegación principal del portal"
            className="hidden lg:flex items-center gap-1 p-1 rounded-2xl border shrink-0"
            style={{
              backgroundColor: 'var(--app-bg)',
              borderColor: 'var(--app-border)',
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setActivePaymentNoteToken(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'tenant-btn-primary text-white shadow-sm'
                      : 'tenant-muted hover:text-[var(--app-text)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Derecha: Acciones de sesión y tema */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadOverview(true)}
              title="Actualizar información"
              className="p-2 rounded-xl border tenant-muted hover:text-[var(--app-text)] transition cursor-pointer"
              style={{ borderColor: 'var(--app-border)' }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={toggleQuickTheme}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="p-2 rounded-xl border tenant-muted hover:text-[var(--app-text)] transition cursor-pointer"
              style={{ borderColor: 'var(--app-border)' }}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border"
              style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-bg)' }}
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-black">
                {(data?.client.name || user?.name || 'C').charAt(0).toUpperCase()}
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-bold max-w-[120px] truncate">
                  {data?.client.name || user?.name}
                </p>
                <p className="text-[9px] tenant-muted font-mono-pin">
                  {data?.client.documentType || 'DNI'}: {data?.client.documentNumber || '—'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => logout()}
              title="Cerrar sesión"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Sub-barra de navegación para tablets (md..lg) */}
        <div className="hidden md:flex lg:hidden max-w-7xl mx-auto px-4 pb-2.5 gap-1.5 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'tenant-btn-primary text-white'
                    : 'tenant-muted border border-[var(--app-border)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ===================================================================== */}
      {/* CONTENIDO PRINCIPAL CENTRADO                                          */}
      {/* ===================================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* =================================================================== */}
        {/* TAB 1: INICIO (BENTO HUB)                                           */}
        {/* =================================================================== */}
        {activeTab === 'inicio' && data && (
          <div className="space-y-6">
            {/* Hero de Bienvenida */}
            <section
              className="rounded-3xl border p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="space-y-2 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bienvenido a tu espacio en {commercialName}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Hola, {data.client.name.split(' ')[0]}
                </h1>
                <p className="text-sm tenant-muted max-w-2xl">
                  {activeBrand
                    ? `Estás viendo el resumen de ${activeBrand.name}. Aquí tienes tus entregables, aprobaciones y estado de cuenta.`
                    : `Centraliza el seguimiento de tus ${brands.length} ${brands.length === 1 ? 'marca' : 'marcas'}, aprobaciones creativas, manuales de identidad y pagos en un solo lugar.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0 relative z-10">
                {agencyWhatsapp && (
                  <a
                    href={`https://wa.me/${agencyWhatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-bold hover:bg-emerald-500/20 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Hablar con la agencia</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('proyectos')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl tenant-btn-primary text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <span>Ver entregables</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>

            {/* Franja: Requiere tu atención */}
            {attentionCount > 0 && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Tienes {attentionCount} {attentionCount === 1 ? 'pendiente' : 'pendientes'} por revisar</p>
                    <p className="text-xs tenant-muted">
                      {data.summary.postsInReviewCount > 0 && `${data.summary.postsInReviewCount} entregable(s) por aprobar · `}
                      {data.summary.pendingQuotesCount > 0 && `${data.summary.pendingQuotesCount} cotización(es) por confirmar · `}
                      {data.summary.pendingPaymentsCount > 0 && `${data.summary.pendingPaymentsCount} nota(s) de pago pendiente(s)`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.summary.postsInReviewCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('proyectos')}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Revisar piezas
                    </button>
                  )}
                  {data.summary.pendingQuotesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('cotizaciones')}
                      className="px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold cursor-pointer"
                    >
                      Ver cotizaciones
                    </button>
                  )}
                  {data.summary.pendingPaymentsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('pagos')}
                      className="px-3 py-1.5 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold cursor-pointer"
                    >
                      Ver pagos
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Bento KPI Grid */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveTab('marca')}
                className="rounded-2xl border p-4 cursor-pointer hover:border-indigo-500/40 transition"
                style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold tenant-muted">Mis Marcas</span>
                  <Building2 className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-black">{data.summary.brandsCount}</p>
                <p className="text-[11px] tenant-muted mt-1">
                  {data.brandGuidelines.length} manual(es) de identidad
                </p>
              </div>

              <div
                onClick={() => setActiveTab('proyectos')}
                className="rounded-2xl border p-4 cursor-pointer hover:border-indigo-500/40 transition"
                style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold tenant-muted">Entregables</span>
                  <Layers className="w-4 h-4 text-violet-500" />
                </div>
                <p className="text-2xl font-black">
                  {data.summary.approvedPostsCount}
                  <span className="text-sm font-bold tenant-muted"> / {data.summary.totalPostsCount}</span>
                </p>
                <p className="text-[11px] tenant-muted mt-1">
                  {data.summary.postsInReviewCount} esperando tu aprobación
                </p>
              </div>

              <div
                onClick={() => setActiveTab('cotizaciones')}
                className="rounded-2xl border p-4 cursor-pointer hover:border-indigo-500/40 transition"
                style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold tenant-muted">Cotizaciones</span>
                  <FileText className="w-4 h-4 text-pink-500" />
                </div>
                <p className="text-2xl font-black">{data.quotes.length}</p>
                <p className="text-[11px] tenant-muted mt-1">
                  {data.summary.pendingQuotesCount} por aprobar · {data.serviceOrders.length} orden(es)
                </p>
              </div>

              <div
                onClick={() => setActiveTab('pagos')}
                className="rounded-2xl border p-4 cursor-pointer hover:border-indigo-500/40 transition"
                style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold tenant-muted">Notas de Pago</span>
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-black">{data.paymentNotes.length}</p>
                <p className="text-[11px] tenant-muted mt-1">
                  {data.summary.pendingPaymentsCount} pendiente(s) de pago
                </p>
              </div>
            </section>

            {/* Bento Detalle: Actividad Reciente + Marcas */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Entregables recientes */}
              <div
                className="lg:col-span-7 rounded-3xl border p-5 space-y-4"
                style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold">Últimos Entregables</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('proyectos')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Ver todos
                  </button>
                </div>
                {filteredPosts.length === 0 ? (
                  <p className="text-xs tenant-muted py-6 text-center">
                    Aún no hay entregables publicados para esta selección.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {filteredPosts.slice(0, 4).map((post) => {
                      const meta = POST_STATUS_META[post.status] || POST_STATUS_META.idea;
                      return (
                        <div
                          key={post.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-2xl border"
                          style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-bg)' }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {post.mediaUrl ? (
                              <img
                                src={post.mediaUrl}
                                alt={post.title}
                                className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/10"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                                <Layers className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{post.title}</p>
                              <p className="text-[11px] tenant-muted truncate">
                                {post.brandName || 'Marca'} · {formatDate(post.scheduledDate)}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${meta.badge}`}>
                            {meta.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Catálogo de Servicios / Descubre más */}
              <div
                className="lg:col-span-5 rounded-3xl border p-5 space-y-4"
                style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold">Servicios de {commercialName}</h2>
                  <a
                    href="/?catalogo=servicios"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <span>Catálogo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {data.servicesCatalog.length === 0 ? (
                  <p className="text-xs tenant-muted py-6 text-center">
                    Explora nuestros servicios disponibles desde el catálogo.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {data.servicesCatalog.slice(0, 4).map((srv) => (
                      <div
                        key={srv.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-2xl border"
                        style={{ borderColor: 'var(--app-border)', backgroundColor: 'var(--app-bg)' }}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{srv.name}</p>
                          <p className="text-[11px] tenant-muted truncate">{srv.categoryName || 'Servicio'}</p>
                        </div>
                        <span className="text-xs font-black shrink-0">
                          {formatCurrency(srv.price, currencySymbol)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: REDES SOCIALES Y ENTREGABLES                                 */}
        {/* =================================================================== */}
        {activeTab === 'proyectos' && data && (() => {
          const displayedPosts = filteredPosts.filter((post) => {
            if (postStatusFilter === 'review') return post.status === 'review';
            if (postStatusFilter === 'approved') return post.status === 'approved' || post.status === 'published';
            if (postStatusFilter === 'production') return post.status === 'idea' || post.status === 'writing' || post.status === 'design';
            return true;
          });
          const reviewCount = filteredPosts.filter((p) => p.status === 'review').length;
          const approvedCount = filteredPosts.filter((p) => p.status === 'approved' || p.status === 'published').length;
          const productionCount = filteredPosts.filter((p) => p.status === 'idea' || p.status === 'writing' || p.status === 'design').length;

          return (
          <div className="space-y-6">
            {/* Proyectos de Desarrollo de Software & Hitos */}
            {filteredSoftwareProjects.length > 0 && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                      <Code2 className="w-6 h-6 text-cyan-500" />
                      <span>Desarrollo de Software & Hitos</span>
                    </h1>
                    <p className="text-xs tenant-muted mt-1">
                      Revisa el avance en vivo de tus proyectos de software, prueba las demos y aprueba cada hito.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredSoftwareProjects.map((sw) => (
                    <div
                      key={sw.id}
                      className="rounded-3xl border p-5 sm:p-6 space-y-4"
                      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                              {sw.code}
                            </span>
                            <h2 className="text-base sm:text-lg font-black">{sw.name}</h2>
                          </div>
                          <p className="text-xs tenant-muted">
                            Entrega estimada: {formatDate(sw.targetEndDate)} · Avance global: <strong>{sw.totalProgress}%</strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {sw.environments?.stagingUrl && (
                            <a
                              href={sw.environments.stagingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-xs font-bold inline-flex items-center gap-1"
                            >
                              <Globe className="w-3.5 h-3.5" /> Demo Staging
                            </a>
                          )}
                          <a
                            href={`/dev/${sw.publicToken}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Abrir Roadmap
                          </a>
                        </div>
                      </div>

                      <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600"
                          style={{ width: `${sw.totalProgress}%` }}
                        />
                      </div>

                      <div className="space-y-2.5">
                        {sw.milestones.map((m) => (
                          <div
                            key={m.id}
                            className="p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                                  {m.code}
                                </span>
                                <span className="text-xs sm:text-sm font-extrabold">{m.title}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                  {m.progress}%
                                </span>
                                {m.status === 'approved' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                    Aprobado
                                  </span>
                                )}
                                {m.status === 'client_review' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    Esperando tu aprobación
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] tenant-muted">
                                {formatDate(m.startDate)} → {formatDate(m.dueDate)}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              {m.demoUrl && (
                                <a
                                  href={m.demoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 rounded-xl border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold inline-flex items-center gap-1"
                                >
                                  <Globe className="w-3.5 h-3.5" /> Probar
                                </a>
                              )}
                              {m.status !== 'approved' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFeedbackModal({
                                        type: 'software_milestone',
                                        projectId: sw.id,
                                        id: m.id,
                                        title: `${m.code}: ${m.title}`,
                                        action: 'approve',
                                      })
                                    }
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" /> Aprobar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFeedbackModal({
                                        type: 'software_milestone',
                                        projectId: sw.id,
                                        id: m.id,
                                        title: `${m.code}: ${m.title}`,
                                        action: 'changes',
                                      })
                                    }
                                    className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold cursor-pointer"
                                  >
                                    Pedir Ajustes
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black tracking-tight">Redes Sociales y Entregables</h1>
                <p className="text-xs tenant-muted mt-1">
                  Supervisa tus proyectos de redes, calendario mensual y aprueba cada pieza creativa.
                </p>
              </div>
              {filteredMonths.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {filteredMonths.slice(0, 3).map((month) => (
                    <div
                      key={month.id}
                      className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border text-xs"
                      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                    >
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-bold">{month.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        {month.status === 'completed'
                          ? 'Completado'
                          : month.status === 'in_progress'
                          ? 'En curso'
                          : 'Pendiente'}
                      </span>
                      {month.publicToken && (
                        <a
                          href={`/?mes=${encodeURIComponent(month.publicToken)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir calendario interactivo"
                          className="text-indigo-600 dark:text-indigo-400 hover:opacity-80"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Proyectos de Redes Sociales asignados */}
            {filteredProjects.length === 0 ? (
              <div
                className="rounded-2xl border p-6 text-center"
                style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
              >
                <p className="text-xs tenant-muted">
                  Aún no tienes proyectos de redes sociales asignados a esta marca.
                </p>
              </div>
            ) : (
              <div className={`grid gap-4 ${filteredProjects.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                {filteredProjects.map((proj) => {
                  const projPosts = filteredPosts.filter((p) => p.projectId === proj.id || p.brandId === proj.brandId);
                  const projApproved = projPosts.filter((p) => p.status === 'approved' || p.status === 'published').length;
                  const totalContracted = (proj.contractedPosts || 0) + (proj.contractedReels || 0) + (proj.contractedStories || 0);
                  const denominator = Math.max(totalContracted, projPosts.length, 1);
                  const progressPct = Math.min(100, Math.round((projApproved / denominator) * 100));

                  return (
                    <div
                      key={proj.id}
                      className="rounded-3xl border p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                    >
                      <div className="space-y-2.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Share2 className="w-3 h-3" />
                            <span>{proj.brandName || 'Marca'}</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              proj.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : proj.status === 'paused'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                            }`}
                          >
                            {proj.status === 'active'
                              ? 'Activo'
                              : proj.status === 'paused'
                              ? 'Pausado'
                              : proj.status === 'completed'
                              ? 'Completado'
                              : 'Archivado'}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-black tracking-tight">{proj.name}</h3>
                          {(proj.periodStart || proj.periodEnd) && (
                            <p className="text-xs tenant-muted mt-0.5">
                              Período: {formatDate(proj.periodStart)} — {formatDate(proj.periodEnd)}
                            </p>
                          )}
                        </div>

                        {proj.platforms && proj.platforms.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {proj.platforms.map((plat) => (
                              <span
                                key={plat}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border"
                                style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }}
                              >
                                {getPlatformIcon(plat)}
                                <span className="capitalize">{plat}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 lg:min-w-[320px]">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div
                            className="rounded-2xl border py-2.5 px-3"
                            style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }}
                          >
                            <p className="text-base font-black">{proj.contractedPosts || 0}</p>
                            <p className="text-[10px] tenant-muted font-bold">Posts / mes</p>
                          </div>
                          <div
                            className="rounded-2xl border py-2.5 px-3"
                            style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }}
                          >
                            <p className="text-base font-black">{proj.contractedReels || 0}</p>
                            <p className="text-[10px] tenant-muted font-bold">Reels / mes</p>
                          </div>
                          <div
                            className="rounded-2xl border py-2.5 px-3"
                            style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }}
                          >
                            <p className="text-base font-black">{proj.contractedStories || 0}</p>
                            <p className="text-[10px] tenant-muted font-bold">Stories / mes</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="tenant-muted">Avance de aprobaciones</span>
                            <span>
                              {projApproved} / {totalContracted || projPosts.length} piezas ({progressPct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Barra de Filtros + Entregables / Publicaciones */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wider tenant-muted">
                  Piezas y Entregables ({displayedPosts.length})
                </h2>

                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all' as const, label: `Todas (${filteredPosts.length})` },
                    { id: 'review' as const, label: `Por aprobar (${reviewCount})` },
                    { id: 'approved' as const, label: `Aprobadas (${approvedCount})` },
                    { id: 'production' as const, label: `En producción (${productionCount})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPostStatusFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                        postStatusFilter === f.id
                          ? 'tenant-btn-primary text-white shadow-xs'
                          : 'border tenant-muted hover:text-[var(--app-text)]'
                      }`}
                      style={
                        postStatusFilter === f.id
                          ? undefined
                          : { backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }
                      }
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {displayedPosts.length === 0 ? (
                <div
                  className="rounded-3xl border p-10 text-center"
                  style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                >
                  <Layers className="w-8 h-8 tenant-muted mx-auto mb-2" />
                  <p className="text-sm font-bold">No hay entregables en esta vista</p>
                  <p className="text-xs tenant-muted mt-1">
                    Prueba cambiando el filtro o espera a que el equipo publique nuevas piezas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {displayedPosts.map((post) => {
                    const meta = POST_STATUS_META[post.status] || POST_STATUS_META.idea;
                    const canReview = post.status === 'review' || post.status === 'design';
                    return (
                      <article
                        key={post.id}
                        className="rounded-3xl border overflow-hidden flex flex-col group transition hover:shadow-lg"
                        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                      >
                        {post.mediaUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewPost(post)}
                            className="relative aspect-square bg-slate-950/5 dark:bg-black/30 overflow-hidden cursor-pointer text-left"
                          >
                            <img
                              src={post.mediaUrl}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            />
                            <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-md shadow-xs ${meta.badge}`}>
                              {meta.label}
                            </span>
                          </button>
                        ) : (
                          <div className="relative h-36 bg-gradient-to-br from-indigo-500/15 to-pink-500/15 flex items-center justify-center">
                            <Layers className="w-8 h-8 text-indigo-500/60" />
                            <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full border ${meta.badge}`}>
                              {meta.label}
                            </span>
                          </div>
                        )}
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold tenant-muted uppercase tracking-wide">
                                {post.brandName || 'Marca'} · {post.format}
                              </span>
                              <span className="text-[11px] tenant-muted font-medium">
                                {formatDate(post.scheduledDate)}
                              </span>
                            </div>
                            <h3
                              onClick={() => setPreviewPost(post)}
                              className="text-sm font-extrabold leading-snug cursor-pointer hover:text-indigo-500 transition"
                            >
                              {post.title}
                            </h3>
                            {post.copy && (
                              <p className="text-xs tenant-muted line-clamp-3 leading-relaxed">{post.copy}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--app-border)' }}>
                            <button
                              type="button"
                              onClick={() => setPreviewPost(post)}
                              className="px-3 py-2 rounded-xl border text-xs font-bold hover:border-indigo-500/40 transition cursor-pointer"
                              style={{ borderColor: 'var(--app-border)' }}
                            >
                              Ver completo
                            </button>
                            {canReview && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFeedbackModal({
                                      type: 'post',
                                      id: post.id,
                                      title: post.title,
                                      action: 'approve',
                                    })
                                  }
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition cursor-pointer"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                  <span>Aprobar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFeedbackModal({
                                      type: 'post',
                                      id: post.id,
                                      title: post.title,
                                      action: 'changes',
                                    })
                                  }
                                  className="inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl border text-xs font-bold hover:bg-amber-500/10 transition cursor-pointer"
                                  style={{ borderColor: 'var(--app-border)' }}
                                  title="Solicitar cambios"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tareas del equipo */}
            {data.workspaceTasks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wider tenant-muted">
                  Tareas en Curso ({data.workspaceTasks.length})
                </h2>
                <div
                  className="rounded-3xl border divide-y"
                  style={{
                    backgroundColor: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                  }}
                >
                  {data.workspaceTasks.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className="p-4 flex items-center justify-between gap-3"
                      style={{ borderColor: 'var(--app-border)' }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{task.title}</p>
                        <p className="text-[11px] tenant-muted">
                          {task.category} {task.dueDate ? `· Entrega: ${formatDate(task.dueDate)}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 shrink-0">
                        {task.status === 'completed' || task.status === 'approved'
                          ? 'Completada'
                          : task.status === 'in_progress'
                          ? 'En progreso'
                          : 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* =================================================================== */}
        {/* TAB 3: MARCA (BRAND HUB)                                            */}
        {/* =================================================================== */}
        {activeTab === 'marca' && data && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Tu Marca & Identidad</h1>
              <p className="text-xs tenant-muted mt-1">
                Accede a tus marcas registradas, manuales de identidad visual y biolinks.
              </p>
            </div>

            {/* Marcas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="rounded-3xl border p-5 space-y-4"
                  style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                >
                  <div className="flex items-center gap-3">
                    {brand.logoUrl ? (
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        className="w-12 h-12 rounded-2xl object-cover border"
                        style={{ borderColor: 'var(--app-border)' }}
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg"
                        style={{ backgroundColor: brand.brandColor || '#4f46e5' }}
                      >
                        {brand.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold truncate">{brand.name}</h3>
                      <p className="text-xs tenant-muted truncate">
                        {brand.industry || 'Marca'} {brand.socialHandle ? `· ${brand.socialHandle}` : ''}
                      </p>
                    </div>
                  </div>
                  {brand.description && (
                    <p className="text-xs tenant-muted line-clamp-2">{brand.description}</p>
                  )}
                  {brand.serviceName && (
                    <div
                      className="p-3 rounded-2xl border flex items-center justify-between text-xs"
                      style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }}
                    >
                      <span className="font-bold flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-indigo-500" />
                        {brand.serviceName}
                      </span>
                      {brand.servicePrice ? (
                        <span className="font-black">{formatCurrency(brand.servicePrice, currencySymbol)}</span>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Manuales de Marca */}
            <div className="space-y-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider tenant-muted">
                Manuales de Marca (Brand Guidelines)
              </h2>
              {filteredBrandGuidelines.length === 0 ? (
                <div
                  className="rounded-3xl border p-8 text-center"
                  style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                >
                  <Palette className="w-7 h-7 tenant-muted mx-auto mb-2" />
                  <p className="text-xs tenant-muted">
                    Aún no hay un Manual de Marca publicado para esta cuenta.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBrandGuidelines.map((bg) => (
                    <div
                      key={bg.id}
                      className="rounded-3xl border p-5 flex items-center justify-between gap-4"
                      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                          {bg.round || 'Identidad Visual'}
                        </span>
                        <h3 className="text-base font-extrabold mt-1.5 truncate">{bg.brandName}</h3>
                        <p className="text-xs tenant-muted truncate">{bg.tagline || bg.clientName}</p>
                      </div>
                      <a
                        href={`/?brand=${encodeURIComponent(bg.publicToken)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl tenant-btn-primary text-white text-xs font-bold shrink-0"
                      >
                        <span>Ver Manual</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Biolinks */}
            {data.biolinks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wider tenant-muted">
                  Biolinks Activos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.biolinks.map((bio) => (
                    <div
                      key={bio.id}
                      className="rounded-2xl border p-4 flex items-center justify-between gap-3"
                      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{bio.title}</p>
                        <p className="text-xs tenant-muted truncate">/b/{bio.slug}</p>
                      </div>
                      <a
                        href={`/b/${encodeURIComponent(bio.slug)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl border hover:border-indigo-500/40 transition"
                        style={{ borderColor: 'var(--app-border)' }}
                      >
                        <Link2 className="w-4 h-4 text-indigo-500" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: COTIZACIONES Y ÓRDENES DE SERVICIO                           */}
        {/* =================================================================== */}
        {activeTab === 'cotizaciones' && data && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Cotizaciones y Órdenes</h1>
              <p className="text-xs tenant-muted mt-1">
                Consulta tus propuestas comerciales, apruébalas en línea y sigue el avance de tus órdenes.
              </p>
            </div>

            {/* Cotizaciones */}
            <div className="space-y-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider tenant-muted">
                Cotizaciones ({data.quotes.length})
              </h2>
              {data.quotes.length === 0 ? (
                <div
                  className="rounded-3xl border p-8 text-center"
                  style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                >
                  <p className="text-xs tenant-muted">No tienes cotizaciones registradas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.quotes.map((q) => {
                    const meta = QUOTE_STATUS_META[q.status] || QUOTE_STATUS_META.draft;
                    return (
                      <div
                        key={q.id}
                        className="rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono-pin text-xs font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                              {q.code}
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-sm font-bold">{q.companyName || q.clientName}</p>
                          <p className="text-xs tenant-muted">
                            Emitida: {formatDate(q.issueDate)} · Válida hasta: {formatDate(q.validUntil)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className="text-base font-black mr-2">
                            {formatCurrency(q.total, q.currency === 'USD' ? '$' : currencySymbol)}
                          </span>
                          {q.publicToken && (
                            <a
                              href={`/?cotizacion=${encodeURIComponent(q.publicToken)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold hover:border-indigo-500/40 transition"
                              style={{ borderColor: 'var(--app-border)' }}
                            >
                              <span>Ver detalle</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {q.status === 'sent' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setFeedbackModal({
                                    type: 'quote',
                                    id: q.id,
                                    title: q.code,
                                    action: 'approve',
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprobar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setFeedbackModal({
                                    type: 'quote',
                                    id: q.id,
                                    title: q.code,
                                    action: 'reject',
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold hover:bg-rose-500/10 transition cursor-pointer"
                                style={{ borderColor: 'var(--app-border)' }}
                              >
                                <span>Observar</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Órdenes de Servicio */}
            <div className="space-y-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider tenant-muted">
                Órdenes de Servicio ({filteredServiceOrders.length})
              </h2>
              {filteredServiceOrders.length === 0 ? (
                <div
                  className="rounded-3xl border p-8 text-center"
                  style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                >
                  <p className="text-xs tenant-muted">No tienes órdenes de servicio activas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredServiceOrders.map((so) => (
                    <div
                      key={so.id}
                      className="rounded-2xl border p-4 space-y-3"
                      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono-pin text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                          {so.code}
                        </span>
                        <span className="text-xs font-bold">{so.totalProgress || 0}% avance</span>
                      </div>
                      <p className="text-sm font-bold">{so.title}</p>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, so.totalProgress || 0))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] tenant-muted">Inicio: {formatDate(so.startDate)}</span>
                        {so.publicToken && (
                          <a
                            href={`/?os=${encodeURIComponent(so.publicToken)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <span>Ver orden</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: PAGOS (CON VISTA INTEGRADA EN LA MISMA PESTAÑA)              */}
        {/* =================================================================== */}
        {activeTab === 'pagos' && data && (
          <div className="space-y-6">
            {activePaymentNoteToken ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePaymentNoteToken(null);
                      loadOverview(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold hover:border-indigo-500/40 transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver a mis Pagos</span>
                  </button>
                </div>
                <div
                  className="rounded-3xl border overflow-hidden"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  <PublicPaymentNoteView token={activePaymentNoteToken} />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">Estado de Pagos</h1>
                  <p className="text-xs tenant-muted mt-1">
                    Consulta tus notas de pago, cronograma de cuotas y descarga o reporta comprobantes aquí mismo.
                  </p>
                </div>

                {filteredPaymentNotes.length === 0 ? (
                  <div
                    className="rounded-3xl border p-10 text-center"
                    style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                  >
                    <CreditCard className="w-8 h-8 tenant-muted mx-auto mb-2" />
                    <p className="text-sm font-bold">No tienes notas de pago registradas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPaymentNotes.map((pn) => {
                      const meta = PAYMENT_STATUS_META[pn.status] || PAYMENT_STATUS_META.pending;
                      return (
                        <div
                          key={pn.id}
                          className="rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono-pin text-xs font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                {pn.code}
                              </span>
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                                {meta.label}
                              </span>
                              {pn.brandName && (
                                <span className="text-[11px] font-semibold tenant-muted">· {pn.brandName}</span>
                              )}
                            </div>
                            <p className="text-sm font-bold">{pn.companyName || pn.clientName}</p>
                            <p className="text-xs tenant-muted flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Emisión: {formatDate(pn.issueDate)}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3 sm:justify-end">
                            <div className="text-right">
                              <p className="text-base font-black">
                                {formatCurrency(pn.total, pn.currency === 'USD' ? '$' : currencySymbol)}
                              </p>
                              {typeof pn.balanceDue === 'number' && pn.balanceDue > 0 && pn.status !== 'paid' && (
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                                  Saldo: {formatCurrency(pn.balanceDue, pn.currency === 'USD' ? '$' : currencySymbol)}
                                </p>
                              )}
                            </div>
                            {pn.publicToken && (
                              <button
                                type="button"
                                onClick={() => setActivePaymentNoteToken(pn.publicToken)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl tenant-btn-primary text-white text-xs font-bold shrink-0 cursor-pointer"
                              >
                                <span>Ver / Pagar</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* ===================================================================== */}
      {/* BOTTOM NAVIGATION BAR SOLO EN MÓVIL (SIN SIDEBAR)                     */}
      {/* ===================================================================== */}
      <nav
        aria-label="Navegación móvil del portal"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-xl px-2 py-1.5 flex items-center justify-around"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--app-surface) 92%, transparent)',
          borderColor: 'var(--app-border)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'tenant-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.badge ? (
                <span className="absolute top-0.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* ===================================================================== */}
      {/* MODAL DE CONFIRMACIÓN / FEEDBACK DE CLIENTE                           */}
      {/* ===================================================================== */}
      {feedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl"
            style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold">
                {feedbackModal.action === 'approve'
                  ? `Aprobar ${feedbackModal.title}`
                  : `Observaciones para ${feedbackModal.title}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setFeedbackModal(null);
                  setFeedbackText('');
                }}
                className="p-1.5 rounded-lg tenant-muted hover:text-[var(--app-text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs tenant-muted">
              {feedbackModal.action === 'approve'
                ? 'Puedes agregar un comentario opcional antes de confirmar la aprobación.'
                : 'Cuéntanos qué ajustes o cambios necesitas para que el equipo los realice.'}
            </p>
            <textarea
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={
                feedbackModal.action === 'approve'
                  ? 'Comentario opcional...'
                  : 'Describe los cambios solicitados...'
              }
              className="w-full rounded-2xl border p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/30"
              style={{
                backgroundColor: 'var(--app-bg)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)',
              }}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setFeedbackModal(null);
                  setFeedbackText('');
                }}
                className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                style={{ borderColor: 'var(--app-border)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={submittingFeedback || (feedbackModal.action !== 'approve' && !feedbackText.trim())}
                onClick={handleConfirmFeedback}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50 ${
                  feedbackModal.action === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'tenant-btn-primary'
                }`}
              >
                {submittingFeedback ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL LIGHTBOX DE VISTA COMPLETA DE PIEZA CREATIVA                    */}
      {/* ===================================================================== */}
      {previewPost && (
        <div
          onClick={() => setPreviewPost(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl rounded-3xl border overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12 max-h-[90vh]"
            style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
          >
            <div className="md:col-span-7 bg-slate-950 flex items-center justify-center p-4 max-h-[55vh] md:max-h-[85vh]">
              {previewPost.mediaUrl ? (
                <UniversalMediaEmbed
                  url={previewPost.mediaUrl}
                  fileName={previewPost.finalArtMediaName || previewPost.referenceMediaName}
                  alt={previewPost.title}
                  autoplay
                  className="w-full max-h-full bg-transparent!"
                  mediaClassName="max-w-full max-h-full object-contain rounded-xl"
                />
              ) : (
                <Layers className="w-12 h-12 text-slate-600" />
              )}
            </div>
            <div className="md:col-span-5 p-6 flex flex-col justify-between gap-4 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {previewPost.brandName || 'Marca'} · {previewPost.format}
                    </span>
                    <h3 className="text-lg font-black mt-0.5 leading-snug">{previewPost.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewPost(null)}
                    className="p-1.5 rounded-lg tenant-muted hover:text-[var(--app-text)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      (POST_STATUS_META[previewPost.status] || POST_STATUS_META.idea).badge
                    }`}
                  >
                    {(POST_STATUS_META[previewPost.status] || POST_STATUS_META.idea).label}
                  </span>
                  <span className="text-[11px] tenant-muted">
                    Programado: {formatDate(previewPost.scheduledDate)}
                  </span>
                </div>

                {previewPost.copy && (
                  <div
                    className="rounded-2xl border p-3.5 text-xs leading-relaxed whitespace-pre-wrap"
                    style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }}
                  >
                    {previewPost.copy}
                  </div>
                )}

                {previewPost.hashtags && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    {previewPost.hashtags}
                  </p>
                )}
              </div>

              {(previewPost.status === 'review' || previewPost.status === 'design') && (
                <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'var(--app-border)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const target = previewPost;
                      setPreviewPost(null);
                      setFeedbackModal({
                        type: 'post',
                        id: target.id,
                        title: target.title,
                        action: 'approve',
                      });
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Aprobar pieza</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = previewPost;
                      setPreviewPost(null);
                      setFeedbackModal({
                        type: 'post',
                        id: target.id,
                        title: target.title,
                        action: 'changes',
                      });
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border text-xs font-bold hover:bg-amber-500/10 transition cursor-pointer"
                    style={{ borderColor: 'var(--app-border)' }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Pedir cambios</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
