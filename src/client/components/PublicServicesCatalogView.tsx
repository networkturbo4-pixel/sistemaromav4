import React, { useEffect, useState, useMemo } from 'react';
import { Service, ServiceCategory, Tenant } from '../../shared/types';
import {
  Sparkles,
  Search,
  Tag,
  ArrowRight,
  MessageCircle,
  Clock,
  Flame,
  Globe,
  CheckCircle2,
  ExternalLink,
  Shield,
  Layers,
  Zap,
} from 'lucide-react';

interface PublicCatalogData {
  tenant: Tenant;
  categories: ServiceCategory[];
  services: Service[];
}

export const PublicServicesCatalogView: React.FC = () => {
  const [data, setData] = useState<PublicCatalogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Detectar tenant slug de la URL
  const tenantSlug = useMemo(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('tenant') || '';
    } catch {
      return '';
    }
  }, []);

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

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setIsLoading(true);
        const url = tenantSlug
          ? `/api/public/services?tenant=${encodeURIComponent(tenantSlug)}`
          : '/api/public/services';
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error('No se pudo cargar el catálogo de servicios.');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCatalog();
  }, [tenantSlug]);

  const filteredServices = useMemo(() => {
    if (!data?.services) return [];
    return data.services.filter((s) => {
      if (selectedCategory !== 'all' && s.categoryId !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchDesc = (s.briefDescription || '').toLowerCase().includes(q);
        const matchCat = (s.categoryName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [data, selectedCategory, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/20">
          <Sparkles className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="mt-4 text-xs font-bold tracking-widest uppercase text-slate-500">
          Cargando Catálogo de Servicios...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mb-3">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Catálogo no disponible</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md">
          {error || 'El espacio de trabajo solicitado no existe o se encuentra inactivo.'}
        </p>
      </div>
    );
  }

  const { tenant, categories } = data;
  const company = tenant.companyInfo || {};
  // Preferir logo para modo claro
  const activeLogo =
    tenant.customization?.logoLightUrl ||
    tenant.customization?.logoDarkUrl ||
    '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Header Sticky SaaS Modo Claro */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all shadow-2xs">
        {/* Logo / Nombre de Agencia */}
        <div className="flex items-center gap-3">
          {activeLogo ? (
            <img
              src={activeLogo}
              alt={tenant.name}
              className="h-8 sm:h-9 object-contain max-w-[160px]"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-xs">
                {tenant.name.charAt(0)}
              </div>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                {tenant.name}
              </span>
            </div>
          )}
          <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Catálogo Oficial
          </span>
        </div>

        {/* WhatsApp & Contacto Directo */}
        <div className="flex items-center gap-2.5">
          {company.whatsapp && (
            <a
              href={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                `¡Hola! Estoy visitando el catálogo de servicios de ${tenant.name} y deseo más información.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Oficial</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* HERO CORPORATIVO SAAS MODO CLARO (SIN DEGRADADOS) */}
        <section className="relative rounded-3xl p-6 sm:p-10 border border-slate-200/80 bg-white shadow-xs">
          <div className="max-w-3xl space-y-3.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              Soluciones Creativas & Estratégicas
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Servicios profesionales diseñados para escalar tu empresa
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
              Explora nuestra cartera de servicios de consultoría, diseño, desarrollo web, producción audiovisual y marketing. Metodología ágil y entregables con garantía de satisfacción.
            </p>

            {/* Badges de Garantía Corporativa */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Metodología Ágil</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Entregables de Calidad</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                <span>Propiedad Intelectual 100%</span>
              </div>
            </div>
          </div>
        </section>

        {/* BUSCADOR Y FILTROS POR CATEGORÍA TIPO PILLS HORIZONTALES */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Input de Búsqueda */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar servicio por nombre, entregable o categoría..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm font-medium border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Pills de categorías con scroll horizontal suave (Mobile friendly) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200'
              }`}
            >
              Todos los Servicios ({data.services.length})
            </button>

            {categories.map((c) => {
              const isSelected = selectedCategory === c.id;
              const count = data.services.filter((s) => s.categoryId === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 border shadow-2xs ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border-slate-200'
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: c.badgeColor || '#6366f1' }}
                  />
                  <span>{c.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* LISTADO DE SERVICIOS EN CARDS CORPORATIVAS SAAS */}
        <section>
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 bg-white">
              <Sparkles className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <h3 className="text-base font-bold text-slate-900">No hay servicios en esta categoría</h3>
              <p className="text-xs text-slate-500 mt-1">
                Prueba seleccionando otra categoría o cambiando el término de búsqueda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredServices.map((service) => {
                const category = categories.find((c) => c.id === service.categoryId);
                const badgeColor = category?.badgeColor || '#6366f1';
                const serviceSlug = service.seo?.slug || service.id;
                const detailUrl = `/p/servicio/${serviceSlug}?tenant=${tenant.slug}`;

                // Formateo de precio
                let priceLabel = '';
                if (service.pricingType === 'monthly') {
                  priceLabel = `${service.currencySymbol} ${service.basePrice.toLocaleString('es-PE')}/mes`;
                } else if (service.pricingType === 'starting_at') {
                  priceLabel = `Desde ${service.currencySymbol} ${service.basePrice.toLocaleString('es-PE')}`;
                } else if (service.pricingType === 'packages' && service.packages?.length > 0) {
                  const minPrice = Math.min(...service.packages.map((p) => Number(p.price) || 0));
                  priceLabel = `Desde ${service.currencySymbol} ${minPrice.toLocaleString('es-PE')}`;
                } else {
                  priceLabel = `${service.currencySymbol} ${service.basePrice.toLocaleString('es-PE')}`;
                }

                // WhatsApp Link con mensaje pre-armado
                const waText = `¡Hola! Vengo desde el catálogo web de ${tenant.name} y me gustaría cotizar el servicio: *${service.title}* (${priceLabel}).`;
                const waLink = company.whatsapp
                  ? `https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      waText
                    )}`
                  : '';

                return (
                  <div
                    key={service.id}
                    className="group rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-2xs relative"
                  >
                    <div>
                      {/* Portada */}
                      <a href={detailUrl} className="block relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
                        {service.coverImage ? (
                          <img
                            src={service.coverImage}
                            alt={service.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                            <Sparkles className="w-12 h-12" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10" />

                        {/* Tag de Categoría */}
                        <div className="absolute top-3 left-3">
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-sm flex items-center gap-1.5"
                            style={{ backgroundColor: `${badgeColor}` }}
                          >
                            <Tag className="w-3 h-3" />
                            {service.categoryName || 'General'}
                          </span>
                        </div>

                        {/* Badge de Urgencia si aplica */}
                        {service.urgency?.enabled && (
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                              <Flame className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                {service.urgency.badgeText || '¡Oferta por tiempo limitado!'}
                              </span>
                            </div>
                          </div>
                        )}
                      </a>

                      {/* Info del servicio */}
                      <div className="p-5 sm:p-6 space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-slate-700">
                            {service.pricingType === 'packages'
                              ? `${service.packages?.length || 0} Paquetes`
                              : service.pricingType === 'monthly'
                              ? 'Mensual'
                              : service.pricingType === 'starting_at'
                              ? 'A medida'
                              : 'Tarifa Fija'}
                          </span>
                          {service.deliveryTime && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Clock className="w-3 h-3 text-indigo-600" />
                              {service.deliveryTime}
                            </span>
                          )}
                        </div>

                        {/* Título */}
                        <a href={detailUrl} className="block group-hover:text-indigo-600 transition-colors">
                          <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-snug line-clamp-2">
                            {service.title}
                          </h3>
                        </a>

                        {/* Breve descripción mostrando sólo 3 líneas */}
                        <p className="text-xs leading-relaxed text-slate-600 line-clamp-3 min-h-[3.75rem]">
                          {service.briefDescription ||
                            'Servicio profesional con enfoque estratégico para potenciar tu marca.'}
                        </p>

                        {/* Inversión & Descuento */}
                        <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Inversión
                            </span>
                            <span className="text-lg font-bold text-slate-900 tracking-tight">
                              {priceLabel}
                            </span>
                          </div>

                          {service.annualDiscount > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                              -{service.annualDiscount}% Anual
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="p-4 sm:p-5 pt-0 grid grid-cols-2 gap-2">
                      <a
                        href={detailUrl}
                        className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 transition flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        Ver Detalle
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>

                      {waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Cotizar
                        </a>
                      ) : (
                        <a
                          href={detailUrl}
                          className="py-2.5 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          Cotizar
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer Moderno de Agencia */}
      <footer className="mt-16 border-t border-slate-200 bg-white text-slate-500 text-xs py-10 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="font-extrabold text-sm text-slate-900">{tenant.name}</span>
            {company.commercialName && (
              <span className="text-[11px] text-slate-500">{company.commercialName}</span>
            )}
            {company.ruc && (
              <span className="text-[10px] text-slate-400 font-mono">RUC: {company.ruc}</span>
            )}
          </div>

          <div className="text-center md:text-right space-y-1">
            <p className="text-[11px]">
              © {new Date().getFullYear()} Todos los derechos reservados.
            </p>
            <p className="text-[10px] text-slate-400">
              Arquitectura SaaS Corporativa.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
