import React, { useEffect, useState, useMemo } from 'react';
import { Service, ServicePackageTier, Tenant } from '../../shared/types';
import { parseVideoUrl } from '../utils/videoEmbed';
import { copyTextToClipboard } from '../utils/clipboard';
import {
  Sparkles,
  ArrowLeft,
  Share2,
  Clock,
  CheckCircle2,
  Flame,
  MessageCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  HelpCircle,
  FileCheck,
  Plus,
  Maximize2,
  X,
  ExternalLink,
  Shield,
  Zap,
  Tag,
  Star,
  CheckCheck,
} from 'lucide-react';

interface PublicServiceData {
  tenant: Tenant;
  service: Service;
  relatedServices: Service[];
}

interface PublicServiceDetailViewProps {
  slugOrId: string;
}

export const PublicServiceDetailView: React.FC<PublicServiceDetailViewProps> = ({ slugOrId }) => {
  const [data, setData] = useState<PublicServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados interactivos de la vista
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [isAnnualBilling, setIsAnnualBilling] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Contador de urgencia en vivo
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Detectar tenant slug de la URL
  const tenantSlug = useMemo(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('tenant') || '';
    } catch {
      return '';
    }
  }, []);

  // Forzar siempre modo claro en la vista pública de detalle
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    return () => {
      if (hadDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      }
    };
  }, []);

  useEffect(() => {
    const fetchService = async () => {
      try {
        setIsLoading(true);
        const url = tenantSlug
          ? `/api/public/services/${encodeURIComponent(slugOrId)}?tenant=${encodeURIComponent(tenantSlug)}`
          : `/api/public/services/${encodeURIComponent(slugOrId)}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('Servicio no encontrado o no disponible públicamente.');
        }
        const json = await res.json();
        setData(json);

        // Seleccionar paquete por defecto si tiene
        if (json.service?.pricingType === 'packages' && json.service?.packages?.length > 0) {
          const popular = json.service.packages.find((p: ServicePackageTier) => p.isPopular);
          setSelectedPackageId(popular ? popular.id : json.service.packages[0].id);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchService();
  }, [slugOrId, tenantSlug]);

  // Actualizar temporizador de urgencia en tiempo real
  useEffect(() => {
    if (!data?.service?.urgency?.enabled || !data?.service?.urgency?.endDate) return;

    const targetTime = new Date(data.service.urgency.endDate).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetTime - now;

      if (distance <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [data]);

  // Forzar siempre modo claro en la vista pública
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    return () => {
      if (hadDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      }
    };
  }, []);

  // Cálculos dinámicos de inversión según paquete y extras seleccionados
  const { currentBasePrice, totalExtrasPrice, finalPrice } = useMemo(() => {
    if (!data?.service) return { currentBasePrice: 0, totalExtrasPrice: 0, finalPrice: 0 };
    const s = data.service;

    let base = s.basePrice || 0;
    if (s.pricingType === 'packages' && s.packages?.length > 0) {
      const currentPkg = s.packages.find((p) => p.id === selectedPackageId) || s.packages[0];
      base = Number(currentPkg?.price) || 0;
    }

    if (s.pricingType === 'monthly' && isAnnualBilling && s.annualDiscount > 0) {
      base = base * (1 - s.annualDiscount / 100);
    }

    let extrasSum = 0;
    if (s.extras && s.extras.length > 0) {
      for (const extId of selectedExtraIds) {
        const item = s.extras.find((e) => e.id === extId);
        if (item) {
          extrasSum += Number(item.price) || 0;
        }
      }
    }

    return {
      currentBasePrice: base,
      totalExtrasPrice: extrasSum,
      finalPrice: base + extrasSum,
    };
  }, [data, selectedPackageId, selectedExtraIds, isAnnualBilling]);

  const handleToggleExtra = (id: string) => {
    if (selectedExtraIds.includes(id)) {
      setSelectedExtraIds(selectedExtraIds.filter((x) => x !== id));
    } else {
      setSelectedExtraIds([...selectedExtraIds, id]);
    }
  };

  const handleCopyShareLink = async () => {
    const ok = await copyTextToClipboard(window.location.href);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/20">
          <Sparkles className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="mt-4 text-xs font-bold tracking-widest uppercase text-slate-400">
          Cargando propuesta de servicio...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#080c14] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Servicio no disponible</h2>
        <p className="text-sm text-slate-400 mt-1 max-w-md">
          {error || 'El servicio que intentas ver no existe o ya no se encuentra público.'}
        </p>
        <a
          href={`/p/servicios?tenant=${tenantSlug}`}
          className="mt-5 px-5 py-2.5 rounded-2xl text-xs font-bold bg-violet-600 text-white shadow-lg inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Catálogo
        </a>
      </div>
    );
  }

  const { tenant, service, relatedServices } = data;
  const company = tenant.companyInfo || {};
  const activeLogo =
    tenant.customization?.logoLightUrl ||
    tenant.customization?.logoDarkUrl ||
    '';

  const selectedPkg = service.packages?.find((p) => p.id === selectedPackageId);

  // Armado del mensaje interactivo para WhatsApp
  let waMessage = `¡Hola! Vengo desde el enlace público de ${tenant.name} y deseo contratar / solicitar cotización formal de:\n\n*Servicio:* ${service.title}\n`;
  if (service.pricingType === 'packages' && selectedPkg) {
    waMessage += `*Paquete Elegido:* ${selectedPkg.name} (${service.currencySymbol} ${selectedPkg.price.toLocaleString('es-PE')})\n`;
  } else if (service.pricingType === 'monthly') {
    waMessage += `*Modalidad:* Mensual (${isAnnualBilling ? 'Facturación Anual con Descuento' : 'Facturación Estándar'})\n`;
  }

  if (selectedExtraIds.length > 0 && service.extras) {
    waMessage += `\n*Extras Seleccionados:*\n`;
    service.extras.forEach((ext) => {
      if (selectedExtraIds.includes(ext.id)) {
        waMessage += `• ${ext.title} (+${service.currencySymbol} ${ext.price})\n`;
      }
    });
  }

  waMessage += `\n*Inversión Total Estimada:* ${service.currencySymbol} ${finalPrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}\n`;
  waMessage += `\nPor favor, confirmarme disponibilidad y pasos para iniciar. ¡Muchas gracias!`;

  const waUrl = company.whatsapp
    ? `https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`
    : '';

  const parsedVideo = parseVideoUrl(service.video?.url);

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
      className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-600 selection:text-white font-sans pb-28 sm:pb-16 antialiased"
      style={{ fontFamily: activeFontFamily }}
    >
      {/* Top Bar Navegación Modo Claro */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 border-b border-slate-200/80 px-4 sm:px-8 py-3 flex items-center justify-between transition-all shadow-2xs">
        <div className="flex items-center gap-3">
          <a
            href={`/p/servicios?tenant=${tenant.slug}`}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Catálogo</span>
          </a>

          {activeLogo ? (
            <img
              src={activeLogo}
              alt={tenant.name}
              className="h-7 sm:h-8 object-contain max-w-[140px]"
            />
          ) : (
            <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate max-w-[160px]">
              {tenant.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Copiar Enlace */}
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Copiar enlace"
          >
            {copiedLink ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{copiedLink ? 'Copiado' : 'Compartir'}</span>
          </button>
        </div>
      </nav>

      {/* Hero Section Modo Claro */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10">
        {/* Banner de Urgencia en Vivo si está habilitado */}
        {service.urgency?.enabled && (
          <div className="rounded-3xl p-4 sm:p-5 bg-amber-50 border border-amber-200 text-amber-900 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  Oferta por tiempo limitado
                </span>
                <h4 className="font-extrabold text-sm sm:text-base leading-tight">
                  {service.urgency.badgeText || '¡Asegura tu cupo antes de que finalice la oferta!'}
                </h4>
              </div>
            </div>

            {/* Temporizador */}
            <div className="flex items-center gap-2 font-mono font-black text-center">
              <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-base sm:text-lg block leading-none text-slate-900">{String(timeLeft.days).padStart(2, '0')}</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Días</span>
              </div>
              <span className="text-amber-500 font-bold">:</span>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-base sm:text-lg block leading-none text-slate-900">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Hrs</span>
              </div>
              <span className="text-amber-500 font-bold">:</span>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-base sm:text-lg block leading-none text-slate-900">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Min</span>
              </div>
              <span className="text-amber-500 font-bold">:</span>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                <span className="text-base sm:text-lg block leading-none text-amber-600">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500">Seg</span>
              </div>
            </div>
          </div>
        )}

        {/* HERO HEADER & VIDEO DE PRESENTACIÓN */}
        <section className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                {service.categoryName || 'Servicio Profesional'}
              </span>

              {service.deliveryTime && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  {service.deliveryTime}
                </span>
              )}

              {service.inventory && service.inventory > 0 && !service.inventoryUnlimited && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Solo {service.inventory} cupos disponibles este mes
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {service.title}
            </h1>

            <p className="text-sm sm:text-lg text-slate-600 leading-relaxed max-w-3xl">
              {service.briefDescription}
            </p>
          </div>

          {/* Reproductor de Video Embebido o Imagen de Portada */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-[#0e1424] shadow-2xl">
            {service.video?.enabled && parsedVideo.isValid ? (
              <div className="relative aspect-video w-full bg-black">
                {parsedVideo.platform === 'direct' ? (
                  <video
                    src={parsedVideo.embedUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <iframe
                    src={parsedVideo.embedUrl}
                    title={service.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            ) : service.coverImage ? (
              <div className="relative h-64 sm:h-96 w-full overflow-hidden">
                <img
                  src={service.coverImage}
                  alt={service.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
            ) : null}
          </div>
        </section>

        {/* SELECTOR DE PAQUETES / MODELO DE PRECIOS */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {service.pricingType === 'packages'
                  ? 'Elige el paquete ideal para tu empresa'
                  : 'Inversión del Servicio'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Transparencia total sin costos ocultos.
              </p>
            </div>

            {/* Toggle Anual si aplica */}
            {service.pricingType === 'monthly' && service.annualDiscount > 0 && (
              <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsAnnualBilling(false)}
                  className={`px-3 py-1.5 rounded-xl transition ${
                    !isAnnualBilling ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnnualBilling(true)}
                  className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                    isAnnualBilling ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <span>Anual</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black">
                    -{service.annualDiscount}%
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Cards de Paquetes Comparativos */}
          {service.pricingType === 'packages' && service.packages?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {service.packages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`rounded-3xl p-6 border transition-all duration-200 cursor-pointer flex flex-col justify-between relative shadow-2xs ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20 scale-[1.01]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {pkg.badgeText && (
                      <span className="absolute -top-3 right-6 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-sm">
                        {pkg.badgeText}
                      </span>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-lg text-slate-900">{pkg.name}</h3>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 min-h-[2.5rem]">
                        {pkg.description}
                      </p>

                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900">
                          {service.currencySymbol}{' '}
                          {Number(pkg.price).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                        {pkg.deliveryTime && (
                          <span className="block text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-600" />
                            Entrega: {pkg.deliveryTime}
                          </span>
                        )}
                      </div>

                      {/* Lista de características */}
                      {pkg.features?.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          {pkg.features.map((feat, fIdx) => (
                            <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-700">
                              <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`mt-6 w-full py-2.5 rounded-2xl text-xs font-black transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ Paquete Seleccionado' : 'Seleccionar Este Paquete'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Precio Fijo o Mensual */
            <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 block mb-1">
                  {service.pricingType === 'monthly' ? 'Tarifa Mensual Recurrente' : 'Inversión Total'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                    {service.currencySymbol}{' '}
                    {currentBasePrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                  {service.pricingType === 'monthly' && (
                    <span className="text-sm font-bold text-slate-500">/ mes</span>
                  )}
                </div>
                {service.deliveryTime && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Tiempo estimado: <strong>{service.deliveryTime}</strong>
                  </p>
                )}
              </div>

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Solicitar este Servicio Ahora
                </a>
              )}
            </div>
          )}
        </section>

        {/* GALERÍA / PORTAFOLIO INTERACTIVO */}
        {service.gallery && service.gallery.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Portafolio & Muestra de Trabajos
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Haz clic en cualquier imagen para ampliar en alta resolución.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {service.gallery.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveLightboxImage(item.url)}
                  className="group relative h-40 sm:h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:shadow-md transition"
                >
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      {item.tag}
                    </span>
                    <h5 className="text-xs font-bold text-white truncate">{item.title}</h5>
                  </div>
                  <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* QUÉ ES LO QUE INCLUYE (CONTENIDOS) */}
        {service.features && service.features.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                ¿Qué es lo que incluye este servicio?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Cada elemento ha sido estructurado para garantizar resultados de máxima calidad.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {service.features.map((feat) => (
                <div
                  key={feat.id}
                  className="rounded-3xl p-5 border border-slate-200 bg-white space-y-2.5 shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {feat.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ENTREGABLES POR FASE */}
        {service.deliverables && service.deliverables.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Entregables & Fases de Trabajo
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Conoce paso a paso qué archivos y materiales recibirás.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {service.deliverables.map((del, dIdx) => (
                <div
                  key={del.id}
                  className="rounded-3xl p-5 border border-slate-200 bg-white space-y-2 relative shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {del.phase || `Fase ${dIdx + 1}`}
                    </span>
                    <Package className="w-4 h-4 text-slate-400" />
                  </div>
                  <h4 className="font-black text-sm text-slate-900 pt-1">{del.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{del.details}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* REQUISITOS PREVIOS */}
        {service.requirements && service.requirements.length > 0 && (
          <section className="rounded-3xl p-6 sm:p-8 border border-slate-200 bg-white space-y-4 shadow-2xs">
            <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              Requisitos Previos para Iniciar
            </h3>
            <p className="text-xs text-slate-500">
              Para garantizar el inicio fluido del proyecto, necesitaremos de tu parte:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {service.requirements.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 space-y-1"
                >
                  <h5 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    {req.title}
                  </h5>
                  <p className="text-[11px] text-slate-600 pl-4">{req.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* EXTRAS Y ADD-ONS INTERACTIVOS */}
        {service.extras && service.extras.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Extras & Personalizaciones Opcionales
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Marca los complementos adicionales que desees sumar a tu cotización.
                </p>
              </div>

              {totalExtrasPrice > 0 && (
                <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  +{service.currencySymbol} {totalExtrasPrice.toLocaleString('es-PE')} en extras
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {service.extras.map((ext) => {
                const isChecked = selectedExtraIds.includes(ext.id);
                return (
                  <div
                    key={ext.id}
                    onClick={() => handleToggleExtra(ext.id)}
                    className={`rounded-3xl p-5 border transition-all cursor-pointer flex items-start justify-between gap-3 shadow-2xs ${
                      isChecked
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900">{ext.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 pl-6 leading-relaxed">
                        {ext.description}
                      </p>
                      {ext.volumeDiscountText && (
                        <span className="inline-block text-[10px] font-bold text-amber-700 pl-6">
                          🏷️ {ext.volumeDiscountText}
                        </span>
                      )}
                    </div>

                    <span className="text-sm font-black text-emerald-700 shrink-0">
                      +{service.currencySymbol} {Number(ext.price).toLocaleString('es-PE')}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* PREGUNTAS FRECUENTES (FAQS) */}
        {service.faqs && service.faqs.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Preguntas Frecuentes
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Todo lo que necesitas saber antes de contratar.
              </p>
            </div>

            <div className="space-y-2.5">
              {service.faqs.map((faq, idx) => {
                const isOpen = activeFaqIndex === idx;
                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-900 hover:text-indigo-600 transition"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-in fade-in duration-200">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SERVICIOS RELACIONADOS */}
        {relatedServices && relatedServices.length > 0 && (
          <section className="space-y-4 pt-6 border-t border-slate-200">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Servicios Relacionados que te podrían interesar
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Complementa tu proyecto con otras soluciones de la agencia.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {relatedServices.map((rel) => {
                const relSlug = rel.seo?.slug || rel.id;
                return (
                  <a
                    key={rel.id}
                    href={`/p/servicio/${relSlug}?tenant=${tenant.slug}`}
                    className="group rounded-2xl border border-slate-200 bg-white overflow-hidden p-4 space-y-3 hover:border-slate-300 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      {rel.coverImage && (
                        <div className="h-32 rounded-xl overflow-hidden bg-slate-100">
                          <img
                            src={rel.coverImage}
                            alt={rel.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                      <span className="text-[10px] font-bold uppercase text-indigo-600">
                        {rel.categoryName}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-2">
                        {rel.title}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 font-black text-slate-900">
                      <span>{rel.currencySymbol} {rel.basePrice.toLocaleString('es-PE')}</span>
                      <span className="text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Ver <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* LIGHTBOX MODAL PARA FOTOGRAFÍAS */}
      {activeLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setActiveLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activeLightboxImage}
            alt="Muestra ampliada"
            className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* FLOATING ACTION BAR (STICKY APP BAR INFERIOR RESPONSIVE MODO CLARO) */}
      <aside className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-white/95 border-t border-slate-200/80 p-3 sm:p-4 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Inversión Total
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {service.currencySymbol}{' '}
                {finalPrice.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
              {service.pricingType === 'monthly' && (
                <span className="text-xs text-slate-500">/ mes</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Solicitar por WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
