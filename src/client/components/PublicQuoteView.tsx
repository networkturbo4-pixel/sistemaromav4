import React, { useEffect, useState, useRef } from 'react';
import { Quote, Tenant, QuotePaymentMethod } from '../../shared/types';
import {
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  Copy,
  Printer,
  MessageCircle,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  QrCode,
  Layers,
  Sparkles,
  Check,
  User,
  ExternalLink,
  Share2,
  Maximize2,
  X,
  Clock,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { copyTextToClipboard } from '../utils/clipboard';

interface PublicQuoteData {
  quote: Quote;
  tenant: {
    id: string;
    name: string;
    slug: string;
    companyInfo: Tenant['companyInfo'];
    customization: Tenant['customization'];
  };
}

// Paletas sobrias y corporativas (SIN degradados ni efectos estridentes)
const THEME_ACCENTS: Record<
  string,
  {
    primary: string;
    badgeBg: string;
    badgeText: string;
    border: string;
  }
> = {
  'corporate-blue': {
    primary: '#1d4ed8',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeText: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-600',
  },
  'emerald-executive': {
    primary: '#047857',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-600',
  },
  'modern-violet': {
    primary: '#4f46e5',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-600',
  },
  'minimal-black': {
    primary: '#0f172a',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-800 dark:text-slate-200',
    border: 'border-slate-800 dark:border-slate-300',
  },
  'amber-luxury': {
    primary: '#b45309',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-600',
  },
  'crimson-red': {
    primary: '#be123c',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeText: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-600',
  },
  'tech-cyan': {
    primary: '#0e7490',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-600',
  },
  'roma-gradient': {
    // Reemplazado por un sólido azul marino / índigo ejecutivo sin degradado
    primary: '#1e293b',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-800 dark:text-slate-200',
    border: 'border-slate-800',
  },
};

export const PublicQuoteView: React.FC<{ publicToken: string }> = ({ publicToken }) => {
  const [data, setData] = useState<PublicQuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [selectedImageModal, setSelectedImageModal] = useState<{ url: string; title: string } | null>(null);
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
    const fetchQuote = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/quotes/${publicToken}`);
        if (!res.ok) {
          throw new Error('La cotización no fue encontrada o el enlace ha caducado.');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [publicToken]);

  const copyToClipboard = async (text: string, id: string) => {
    if (!text) return;
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedBankId(id);
      setTimeout(() => setCopiedBankId(null), 2500);
    }
  };

  const handleShareLink = async () => {
    setActionsMenuOpen(false);
    if (typeof window !== 'undefined') {
      const ok = await copyTextToClipboard(window.location.href);
      if (ok) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-lg flex items-center justify-center shadow-sm animate-pulse mb-4">
          ROMA
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Cargando propuesta comercial...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Propuesta no disponible
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed">
          {error || 'El enlace que intentas abrir no existe o ha sido deshabilitado.'}
        </p>
      </div>
    );
  }

  const { quote, tenant } = data;
  const theme = THEME_ACCENTS[quote.theme] || THEME_ACCENTS['modern-violet'];

  // Obtener logo limpio sin bordes ni fondos añadidos
  const agencyLogo =
    tenant.customization?.logoLightUrl ||
    tenant.customization?.logoDarkUrl ||
    tenant.customization?.faviconUrl;

  const agencyWhatsAppClean = (tenant.companyInfo?.whatsapp || '').replace(/\D/g, '');
  const acceptMessage = encodeURIComponent(
    `¡Hola! He revisado la propuesta comercial ${quote.code} (${quote.companyName || quote.clientName}) por ${quote.currencySymbol} ${quote.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })} y deseo proceder con su aprobación.`
  );
  const waAcceptUrl = `https://wa.me/${agencyWhatsAppClean}?text=${acceptMessage}`;

  // Métodos de pago autorizados (Regla Global desde Configuración > Datos de Empresa):
  const rawAccounts: QuotePaymentMethod[] =
    tenant.companyInfo?.bankAccounts && tenant.companyInfo.bankAccounts.length > 0
      ? (tenant.companyInfo.bankAccounts as QuotePaymentMethod[])
      : quote.paymentMethods || [];

  const activePaymentMethods = rawAccounts.filter((pm) => pm.isActive !== false);
  const showPayments = quote.showPaymentMethods !== false && activePaymentMethods.length > 0;

  const fontKey = tenant.customization?.fontFamily || 'Inter';
  const fontFamilies: Record<string, string> = {
    'Inter': "'Inter', system-ui, -apple-system, sans-serif",
    'Space Grotesk': "'Space Grotesk', system-ui, -apple-system, sans-serif",
    'Montserrat': "'Montserrat', system-ui, -apple-system, sans-serif",
    'Plus Jakarta Sans': "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    'Outfit': "'Outfit', system-ui, -apple-system, sans-serif",
    'Poppins': "'Poppins', system-ui, -apple-system, sans-serif",
  };
  const activeFontFamily = fontFamilies[fontKey] || fontFamilies['Inter'];

  return (
    <div
      className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-800 dark:text-slate-100 antialiased pb-24 print:pb-0 print:bg-white print:text-black"
      style={{ fontFamily: activeFontFamily }}
    >
      {/* 1. BARRA SUPERIOR FIJA DE ACCIONES CON MENÚ DESPLEGABLE (NO IMPRIME) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs print:hidden">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  Propuesta Comercial
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shrink-0">
                  {quote.code}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {tenant.companyInfo?.commercialName || tenant.name} • {quote.companyName || quote.clientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Aceptar por WhatsApp (Visible en Desktop) */}
            <a
              href={waAcceptUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Aceptar por WhatsApp</span>
            </a>

            {/* Menú Desplegable de Imprimir y Compartir */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setActionsMenuOpen((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      window.print();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Imprimir / Guardar PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareLink}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-emerald-600">¡Enlace copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>Compartir / Copiar enlace</span>
                      </>
                    )}
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  <a
                    href={waAcceptUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setActionsMenuOpen(false)}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Aceptar por WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. CONTENEDOR PRINCIPAL */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* CABECERA CORPORATIVA DE LA PROPUESTA (SIN DEGRADADOS, LOGO LIMPIO Y LIBRE) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Logo de la empresa e información principal */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {tenant.customization?.logoLightUrl || tenant.customization?.logoDarkUrl ? (
                <div className="shrink-0 flex items-center justify-center">
                  {tenant.customization?.logoLightUrl && (
                    <img
                      src={tenant.customization.logoLightUrl}
                      alt={tenant.name}
                      className="h-10 sm:h-12 md:h-14 w-auto max-w-[220px] object-contain block dark:hidden"
                    />
                  )}
                  {tenant.customization?.logoDarkUrl ? (
                    <img
                      src={tenant.customization.logoDarkUrl}
                      alt={tenant.name}
                      className={`h-10 sm:h-12 md:h-14 w-auto max-w-[220px] object-contain ${
                        tenant.customization?.logoLightUrl ? 'hidden dark:block' : 'block'
                      }`}
                    />
                  ) : tenant.customization?.logoLightUrl ? (
                    <img
                      src={tenant.customization.logoLightUrl}
                      alt={tenant.name}
                      className="h-10 sm:h-12 md:h-14 w-auto max-w-[220px] object-contain hidden dark:block"
                    />
                  ) : null}
                </div>
              ) : agencyLogo ? (
                <div className="shrink-0 flex items-center justify-center">
                  <img
                    src={agencyLogo}
                    alt={tenant.name}
                    className="h-10 sm:h-12 md:h-14 w-auto max-w-[220px] object-contain block"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-base flex items-center justify-center shrink-0">
                  {tenant.name.substring(0, 2).toUpperCase()}
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Propuesta Comercial
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {tenant.companyInfo?.commercialName || tenant.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {tenant.companyInfo?.ruc && (
                    <span>RUC: {tenant.companyInfo.ruc}</span>
                  )}
                  {tenant.companyInfo?.email && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span>{tenant.companyInfo.email}</span>
                    </>
                  )}
                  {tenant.companyInfo?.whatsapp && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span>{tenant.companyInfo.whatsapp}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Ficha de Código y Fechas */}
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-left sm:text-right self-stretch md:self-auto min-w-[210px] space-y-2">
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Código
                </span>
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                  {quote.code}
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-slate-400 text-[11px]">Emisión:</span>
                <span className="font-semibold">{quote.issueDate}</span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                <span className="text-slate-400 text-[11px]">Válido hasta:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {quote.validUntil}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* DIRIGIDO A / INFORMACIÓN DEL CLIENTE */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Building className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Dirigido a
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Empresa / Razón Social</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {quote.companyName || quote.clientName}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Contacto / Representante</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {quote.clientName}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Documento Fiscal</p>
              <p className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {quote.documentType}: {quote.documentNumber || 'No especificado'}
              </p>
            </div>
          </div>
        </section>

        {/* SERVICIOS & ENTREGABLES INCLUIDOS (SIN BORDECITO IZQUIERDO DE COLOR) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Servicios & Entregables Incluidos</span>
            </h2>
            <span className="text-xs font-medium text-slate-400">
              {quote.items.length} {quote.items.length === 1 ? 'partida' : 'partidas'}
            </span>
          </div>

          <div className="space-y-3.5">
            {quote.items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      Partida #{idx + 1}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                      {item.title}
                    </h3>
                  </div>

                  <div className="sm:text-right shrink-0 bg-slate-50 dark:bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Importe
                    </span>
                    <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      {quote.currencySymbol}{' '}
                      {item.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                    {item.discount > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-600 block mt-0.5">
                        Desc. -{quote.currencySymbol}{' '}
                        {item.discount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>

                {/* DESCRIPCIÓN CON ESTILOS RICOS LIMPIOS Y TABLAS */}
                {item.description && (
                  <div
                    className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-3.5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-slate-800 dark:[&_strong]:text-slate-200 [&_table]:w-full [&_table]:my-3 [&_table]:border-collapse [&_th]:border [&_th]:border-slate-200 dark:[&_th]:border-slate-700 [&_th]:p-2.5 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800 [&_th]:font-bold [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-slate-700 [&_td]:p-2.5 overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* RESUMEN FINANCIERO / TOTALES (SIN DEGRADADO EN EL TOTAL) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              Inversión del Proyecto
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Precios expresados en{' '}
              {quote.currency === 'PEN'
                ? 'Soles (PEN)'
                : quote.currency === 'USD'
                ? 'Dólares Americanos (USD)'
                : 'Euros (EUR)'}
              .{quote.includeTax ? ' Incluye IGV según normativa fiscal.' : ' Precios netos.'}
            </p>
          </div>

          <div className="w-full sm:w-72 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Subtotal:</span>
              <span className="font-semibold">
                {quote.currencySymbol}{' '}
                {quote.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {quote.discountAmount > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                <span>Descuento Comercial:</span>
                <span className="font-semibold">
                  -{quote.currencySymbol}{' '}
                  {quote.discountAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {quote.includeTax && (
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>IGV (18%):</span>
                <span className="font-semibold">
                  {quote.currencySymbol}{' '}
                  {quote.taxAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Total:
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {quote.currencySymbol}{' '}
                {quote.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </section>

        {/* CRONOGRAMA GANTT DE ACTIVIDADES (SI APLICA) */}
        {quote.showGantt && quote.ganttPhases && quote.ganttPhases.length > 0 && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Cronograma de Ejecución (Fases de Trabajo)</span>
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {quote.ganttPhases.length} fases
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {quote.ganttPhases.map((phase, idx) => (
                <div
                  key={phase.id || idx}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {phase.name}
                    </span>
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      <span>
                        {phase.startDate} al {phase.endDate}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {phase.progress}% avance
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 bg-slate-900 dark:bg-slate-300"
                      style={{
                        width: `${Math.max(5, Math.min(100, phase.progress))}%`,
                        backgroundColor: phase.color || undefined,
                      }}
                    />
                  </div>

                  {phase.deliverables && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Entregable:</span>{' '}
                      {phase.deliverables}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. MÉTODOS Y CUENTAS BANCARIAS DE PAGO (ELEGANTE, RESPONSIVE, COPIABLE Y FOTOS/QR) */}
        {showPayments && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span>Cuentas Bancarias & Métodos de Pago Autorizados</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Realiza tu depósito o transferencia a cualquiera de nuestras cuentas oficiales.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md self-start sm:self-auto border border-emerald-200/60 dark:border-emerald-800/60">
                Abono Seguro
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {activePaymentMethods.map((pm, idx) => {
                const isCopiedAccount = copiedBankId === `acc-${pm.id || idx}`;
                const isCopiedCci = copiedBankId === `cci-${pm.id || idx}`;
                const hasImage = Boolean(pm.imageUrl);

                return (
                  <div
                    key={pm.id || idx}
                    className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex flex-col justify-between gap-3.5 transition hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div>
                      {/* Cabecera del método de pago */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {hasImage ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedImageModal({
                                  url: pm.imageUrl!,
                                  title: pm.name,
                                })
                              }
                              className="relative group shrink-0 cursor-pointer"
                              title="Toca para ver la imagen o QR ampliado"
                            >
                              <img
                                src={pm.imageUrl}
                                alt={pm.name}
                                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-contain bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 group-hover:scale-105 transition"
                              />
                              <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Maximize2 className="w-3.5 h-3.5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                              <CreditCard className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                              {pm.name}
                            </h3>
                            {pm.currency && (
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                Moneda: {pm.currency === 'USD' ? 'Dólares ($)' : 'Soles (S/)'}
                              </span>
                            )}
                          </div>
                        </div>

                        {hasImage && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedImageModal({
                                url: pm.imageUrl!,
                                title: pm.name,
                              })
                            }
                            className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ver QR</span>
                          </button>
                        )}
                      </div>

                      {/* Titular */}
                      {pm.beneficiary && (
                        <div className="mb-2 text-xs">
                          <span className="text-slate-400 text-[11px] block font-medium">Titular:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {pm.beneficiary}
                          </span>
                        </div>
                      )}

                      {/* Número de Cuenta Principal */}
                      {pm.accountNumber && (
                        <div className="mb-2">
                          <span className="text-slate-400 text-[11px] block font-medium">
                            Número de Cuenta:
                          </span>
                          <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 mt-1">
                            <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 select-all truncate">
                              {pm.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(pm.accountNumber, `acc-${pm.id || idx}`)}
                              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition flex items-center gap-1 shrink-0 cursor-pointer"
                              title="Copiar número de cuenta"
                            >
                              {isCopiedAccount ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">¡Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* CCI / Notas de Transferencia */}
                      {pm.notes && (
                        <div>
                          <span className="text-slate-400 text-[11px] block font-medium">
                            CCI / Detalle Adicional:
                          </span>
                          <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 mt-1">
                            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 select-all truncate">
                              {pm.notes}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(pm.notes!, `cci-${pm.id || idx}`)}
                              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition flex items-center gap-1 shrink-0 cursor-pointer"
                              title="Copiar CCI o detalle"
                            >
                              {isCopiedCci ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">¡Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* NOTAS ADICIONALES & TÉRMINOS */}
        {(quote.additionalNotes || quote.termsAndConditions) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quote.additionalNotes && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  Notas & Consideraciones
                </h3>
                <div
                  className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: quote.additionalNotes }}
                />
              </div>
            )}

            {quote.termsAndConditions && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Términos & Condiciones
                </h3>
                <div
                  className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: quote.termsAndConditions }}
                />
              </div>
            )}
          </section>
        )}

        {/* LLAMADO A LA ACCIÓN / CONFIRMACIÓN AL PIE DE PÁGINA */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-3 print:hidden">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            ¿Deseas confirmar o consultar sobre esta propuesta?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Puedes aprobarla directamente a través de nuestro canal de WhatsApp o solicitar información adicional con nuestro equipo.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href={waAcceptUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Aceptar Propuesta por WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Descargar / Imprimir en PDF</span>
            </button>
          </div>
        </section>

        {/* PIE DE PÁGINA FORMAL */}
        <footer className="text-center py-6 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            {tenant.companyInfo?.commercialName || tenant.name}
          </p>
          <p>
            {tenant.companyInfo?.address && `${tenant.companyInfo.address} • `}
            {tenant.companyInfo?.email}
          </p>
          <p className="text-[11px] text-slate-400">
            Documento electrónico emitido con validez comercial.
          </p>
        </footer>
      </main>

      {/* MODAL LIGHTBOX PARA AMPLIAR IMAGEN / QR */}
      {selectedImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedImageModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 cursor-default border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {selectedImageModal.title}
              </span>
              <button
                type="button"
                onClick={() => setSelectedImageModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center bg-white p-3 rounded-xl border border-slate-200">
              <img
                src={selectedImageModal.url}
                alt={selectedImageModal.title}
                className="max-h-72 w-auto object-contain rounded-lg"
              />
            </div>

            <div className="text-center">
              <p className="text-[11px] text-slate-400">
                Escanea desde tu app bancaria o guarda la imagen para transferir.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
