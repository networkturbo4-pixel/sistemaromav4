import React, { useEffect, useState, useRef } from 'react';
import { ServiceOrder, Tenant } from '../../shared/types';
import {
  ClipboardCheck,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  User,
  Share2,
  Copy,
  Printer,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Layers,
  Sparkles,
  Check,
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
  BadgePercent,
  CheckCircle,
  ChevronDown,
} from 'lucide-react';
import { copyTextToClipboard } from '../utils/clipboard';

interface PublicServiceOrderData {
  order: ServiceOrder;
  tenant: {
    id: string;
    name: string;
    slug: string;
    companyInfo: Tenant['companyInfo'];
    customization: Tenant['customization'];
  };
}

export const PublicServiceOrderView: React.FC<{ token: string }> = ({ token }) => {
  const [data, setData] = useState<PublicServiceOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(`/api/public/service-orders/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Orden de servicio no encontrada o enlace inválido.');
        }
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setData(json);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const copyPublicUrl = async () => {
    setActionsMenuOpen(false);
    const ok = await copyTextToClipboard(window.location.href);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    setActionsMenuOpen(false);
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 animate-pulse flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-500/20 mb-4">
          OS
        </div>
        <p className="text-sm font-semibold text-slate-300 tracking-wider uppercase animate-pulse">
          Cargando Orden de Servicio...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold mb-2">Orden de Servicio no disponible</h1>
        <p className="text-slate-400 text-sm max-w-md mb-6">
          {error || 'El enlace que intentas abrir ha caducado o no existe.'}
        </p>
        <button
          onClick={() => (window.location.href = '/')}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const { order, tenant } = data;
  const company = tenant.companyInfo;

  const STATUS_CONFIG: Record<
    string,
    { label: string; bg: string; text: string; border: string }
  > = {
    draft: {
      label: 'Borrador / Preparación',
      bg: 'bg-slate-500/10 dark:bg-slate-500/20',
      text: 'text-slate-600 dark:text-slate-300',
      border: 'border-slate-300 dark:border-slate-700',
    },
    active: {
      label: 'En Ejecución Activa',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-300 dark:border-emerald-700',
    },
    in_review: {
      label: 'En Revisión / Aprobaciones',
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-300 dark:border-amber-700',
    },
    completed: {
      label: 'Servicio Finalizado & Entregado',
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-700',
    },
    cancelled: {
      label: 'Cancelado',
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-300 dark:border-rose-700',
    },
  };

  const statusStyle = STATUS_CONFIG[order.status] || STATUS_CONFIG.active;

  const getPlatformBadge = (plat: string) => {
    switch (plat?.toLowerCase()) {
      case 'instagram':
        return {
          label: 'Instagram',
          color: 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white',
          icon: <Instagram className="w-3.5 h-3.5" />,
        };
      case 'facebook':
        return {
          label: 'Facebook',
          color: 'bg-blue-600 text-white',
          icon: <Facebook className="w-3.5 h-3.5" />,
        };
      case 'tiktok':
        return {
          label: 'TikTok',
          color: 'bg-slate-900 text-white',
          icon: (
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.3 6.3 0 0 0 1.87-4.49V8.5a8.28 8.28 0 0 0 4.9 1.6V6.69z" />
            </svg>
          ),
        };
      case 'linkedin':
        return {
          label: 'LinkedIn',
          color: 'bg-sky-700 text-white',
          icon: <Linkedin className="w-3.5 h-3.5" />,
        };
      case 'youtube':
        return {
          label: 'YouTube',
          color: 'bg-red-600 text-white',
          icon: <Youtube className="w-3.5 h-3.5" />,
        };
      case 'x':
      case 'twitter':
        return {
          label: 'X (Twitter)',
          color: 'bg-black text-white',
          icon: (
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          ),
        };
      default:
        return {
          label: plat,
          color: 'bg-slate-700 text-white',
          icon: <Check className="w-3.5 h-3.5" />,
        };
    }
  };

  const getDeliverableStatusBadge = (st: string) => {
    switch (st) {
      case 'completed':
        return {
          label: 'Completado',
          badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'in_progress':
        return {
          label: 'En Proceso',
          badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'review':
        return {
          label: 'En Revisión',
          badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      default:
        return {
          label: 'Pendiente',
          badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const cleanWhatsappNumber = (company.whatsapp || '').replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanWhatsappNumber}?text=${encodeURIComponent(
    `Hola ${company.commercialName}, me comunico respecto a la Orden de Servicio ${order.code} (${order.title}).`
  )}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Barra de Acciones Superior Fija con Menú Desplegable */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-2xs print:hidden">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
              OS
            </span>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate block">
                Orden de Servicio Oficial
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate block">
                {order.code} • {company.commercialName || tenant.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {company.whatsapp && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Contactar Agencia</span>
              </a>
            )}

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setActionsMenuOpen((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Opciones</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    actionsMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {actionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={handlePrint}
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Imprimir / Guardar PDF</span>
                  </button>

                  <button
                    onClick={copyPublicUrl}
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-emerald-600">¡Enlace copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Compartir / Copiar enlace</span>
                      </>
                    )}
                  </button>

                  {company.whatsapp && (
                    <>
                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setActionsMenuOpen(false)}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Contactar por WhatsApp</span>
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Cabecera y Resumen de la Orden */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-mono">
                  {order.code}
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                >
                  {statusStyle.label}
                </span>
                {order.quoteCode && (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Ref: {order.quoteCode}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {order.title}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Hoja de ruta y especificación operativa de los servicios contratados con la agencia.
              </p>
            </div>

            {/* Datos de la Agencia */}
            <div className="text-left md:text-right shrink-0">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                {company.commercialName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">RUC: {company.ruc}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{company.address}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{company.email}</p>
            </div>
          </div>

          {/* Metadatos Principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Cliente / Marca
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {order.clientName}
              </p>
              {order.brandName && (
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Marca: {order.brandName}
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Periodo del Servicio
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{order.startDate}</span>
                <span className="text-slate-400">hasta</span>
                <span>{order.deliveryDate}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Project Manager Asignado
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {order.projectManagerName || 'Equipo Directivo Roma'}
                  </p>
                  <p className="text-[10px] text-slate-400">Líder de Proyecto</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FICHAS DETALLADAS SEGÚN SWITCHERS ACTIVADOS */}
        <div className="space-y-6">
          {/* 1. MÓDULO REDES SOCIALES */}
          {order.socialMedia?.enabled && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Gestión de Redes Sociales & Social Media
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Canales oficiales, piezas de contenido programadas y estrategia de pauta publicitaria.
                  </p>
                </div>
              </div>

              {/* Redes que se van a manejar */}
              <div className="mb-6">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Redes Sociales que se van a Administrar:
                </span>
                <div className="flex flex-wrap gap-2">
                  {order.socialMedia.platforms && order.socialMedia.platforms.length > 0 ? (
                    order.socialMedia.platforms.map((plat) => {
                      const p = getPlatformBadge(plat);
                      return (
                        <span
                          key={plat}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-xs flex items-center gap-1.5 ${p.color}`}
                        >
                          {p.icon}
                          {p.label}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic">No se especificaron redes.</span>
                  )}
                </div>
              </div>

              {/* Métricas de Contenidos y Presupuesto de Pauta */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block mb-1">
                    Contenidos Mensuales
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {order.socialMedia.postsCount || 0}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">piezas de feed / carruseles</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                    <p>• {order.socialMedia.reelsCount || 0} Reels / Videos dinámicos</p>
                    <p>• {order.socialMedia.storiesCount || 0} Historias / Stories interactivas</p>
                  </div>
                </div>

                {/* Switcher de Presupuesto / Pauta Publicitaria */}
                <div
                  className={`p-4 rounded-2xl border col-span-1 md:col-span-2 ${
                    order.socialMedia.hasBudget
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                        order.socialMedia.hasBudget
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-400'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Presupuesto de Pauta Publicitaria (Ads)
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        order.socialMedia.hasBudget
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {order.socialMedia.hasBudget ? 'Pauta Activa Incluida' : 'Sin Presupuesto Asignado'}
                    </span>
                  </div>

                  {order.socialMedia.hasBudget ? (
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                          {order.socialMedia.budgetCurrency === 'USD' ? '$' : 'S/'}{' '}
                          {(order.socialMedia.budgetAmount || 0).toLocaleString('es-PE', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          / Inversión mensual en pauta publicitaria
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <strong>Administración de la cuenta:</strong>{' '}
                        {order.socialMedia.budgetManagedBy === 'agency'
                          ? 'Gestionada y monitoreada por la Agencia ROMA'
                          : 'Tarjeta / Cuenta a cargo directo del Cliente'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      El plan contratado se enfoca en alcance orgánico, contenidos de valor y comunidad. Si
                      desea activar pauta publicitaria más adelante, puede coordinarlo con su Project Manager.
                    </p>
                  )}
                </div>
              </div>

              {order.socialMedia.scopeNotes && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-200 block mb-1">
                    Detalle y Alcance Operativo:
                  </strong>
                  {order.socialMedia.scopeNotes}
                </div>
              )}
            </section>
          )}

          {/* 2. MÓDULO IDENTIDAD VISUAL & BRANDING */}
          {order.branding?.enabled && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Identidad Visual & Branding Corporativo
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Construcción conceptual, manual de marca, diseño de logotipo y aplicaciones gráficas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-2 space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                    Entregables de Marca Incluidos:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {order.branding.deliverablesList && order.branding.deliverablesList.length > 0 ? (
                      order.branding.deliverablesList.map((item, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Entregables según brief de marca.</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block mb-1">
                      Propuestas Iniciales
                    </span>
                    <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                      {order.branding.initialProposalsCount || 2} caminos visuales
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Rondas de ajustes incluidas: {order.branding.reviewRoundsCount || 2} rondas.
                    </p>
                  </div>
                </div>
              </div>

              {order.branding.scopeNotes && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-200 block mb-1">
                    Criterios y Directrices de Identidad:
                  </strong>
                  {order.branding.scopeNotes}
                </div>
              )}
            </section>
          )}

          {/* 3. MÓDULO AUDIOVISUAL */}
          {order.audiovisual?.enabled && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Producción Audiovisual & Fotografía Profesional
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Rodaje, dirección de arte, fotografía publicitaria y postproducción de video.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-2 space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                    Entregables de Producción:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {order.audiovisual.deliverablesList && order.audiovisual.deliverablesList.length > 0 ? (
                      order.audiovisual.deliverablesList.map((item, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Piezas audiovisuales acordadas.</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block mb-1">
                      Horas de Rodaje Estimadas
                    </span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      {order.audiovisual.shootingHours || 0} Horas
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Locación: {order.audiovisual.location || 'Local del cliente / Estudio'}
                    </p>
                  </div>
                </div>
              </div>

              {order.audiovisual.scopeNotes && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-200 block mb-1">
                    Equipamiento y Condiciones de Rodaje:
                  </strong>
                  {order.audiovisual.scopeNotes}
                </div>
              )}
            </section>
          )}

          {/* 4. MÓDULO PÁGINA WEB */}
          {order.web?.enabled && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Desarrollo Web, UI/UX & Plataformas Digitales
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Diseño responsive, arquitectura web, pasarelas de pago y despliegue en servidor.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-2 space-y-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                    Entregables y Módulos Web:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {order.web.deliverablesList && order.web.deliverablesList.length > 0 ? (
                      order.web.deliverablesList.map((item, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Desarrollo web a medida.</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
                    <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block mb-1">
                      Plataforma & Hosting
                    </span>
                    <span className="text-base font-black text-sky-600 dark:text-sky-400">
                      {order.web.platform || 'WordPress / Modern Stack'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Dominio / Hosting:{' '}
                      {order.web.includesHosting ? 'Incluido por la agencia' : 'Gestionado por el cliente'}
                    </p>
                    {order.web.domainName && (
                      <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                        {order.web.domainName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {order.web.scopeNotes && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-800 dark:text-slate-200 block mb-1">
                    Especificaciones Técnicas y Accesos:
                  </strong>
                  {order.web.scopeNotes}
                </div>
              )}
            </section>
          )}
        </div>

        {/* TABLA DE ENTREGABLES Y RESPONSABLES ASIGNADOS */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-indigo-500" />
                <span>Desglose de Entregables & Responsables Asignados</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cada hito cuenta con un especialista creativo a cargo para garantizar la máxima calidad.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Total: {order.deliverables?.length || 0} entregables
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Entregable & Alcance</th>
                  <th className="py-3 px-4">Responsable de Agencia</th>
                  <th className="py-3 px-4">Fecha Límite</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Recurso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {order.deliverables && order.deliverables.length > 0 ? (
                  order.deliverables.map((del) => {
                    const st = getDeliverableStatusBadge(del.status);
                    return (
                      <tr key={del.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4 max-w-sm">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{del.title}</p>
                          {del.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {del.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {del.assignedUserName ? del.assignedUserName.charAt(0) : 'R'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {del.assignedUserName || 'Especialista Roma'}
                              </p>
                              {del.assignedUserRole && (
                                <p className="text-[10px] text-slate-400">{del.assignedUserRole}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">
                          {del.dueDate || 'Por coordinar'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${st.badge}`}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          {del.deliverableUrl ? (
                            <a
                              href={del.deliverableUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                            >
                              <span>Ver Archivo</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      No hay entregables individuales registrados en esta orden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* NOTAS Y ACUERDOS */}
        {order.notes && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Acuerdos y Condiciones del Servicio</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {order.notes}
            </p>
          </section>
        )}

        {/* Pie de Página */}
        <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
          <p className="font-bold text-slate-600 dark:text-slate-300">
            {company.commercialName} • RUC {company.ruc}
          </p>
          <p className="mt-1">
            Plataforma SaaS Multitenant de Gestión de Agencia y Producción Creativa.
          </p>
        </footer>
      </main>
    </div>
  );
};
