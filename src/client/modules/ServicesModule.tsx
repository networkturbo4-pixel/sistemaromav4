import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Service,
  ServiceCategory,
  ServicePricingType,
  ServiceCurrency,
  ServiceStatus,
  ServiceVisibility,
  ServicePackageTier,
  ServiceGalleryItem,
  ServiceFeatureItem,
  ServiceDeliverableItem,
  ServiceRequirementItem,
  ServiceFaqItem,
  ServiceExtraItem,
} from '../../shared/types';
import { parseVideoUrl } from '../utils/videoEmbed';
import { CategoryManagerModal } from './services/CategoryManagerModal';
import { ShareServiceModal } from './services/ShareServiceModal';
import {
  Plus,
  ArrowLeft,
  Search,
  Filter,
  Layers,
  Sparkles,
  Edit2,
  Trash2,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Eye,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  FolderPlus,
  Globe,
  Tag,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  X,
  Flame,
  HelpCircle,
  FileCheck,
  Package,
  ListPlus,
  Upload,
  ArrowRight,
  Maximize2,
  Info,
  Shield,
  Palette,
  Compass,
} from 'lucide-react';

const COVER_PRESETS = [
  'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
];

type EditorTab = 'general' | 'gallery' | 'features' | 'deliverables' | 'extras' | 'seo';

export const ServicesModule: React.FC = () => {
  const { tenant, apiFetch, toast, confirmAction, can } = useApp();

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedPricingTypeFilter, setSelectedPricingTypeFilter] = useState('all');

  // Modales
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [serviceToShare, setServiceToShare] = useState<Service | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('general');

  // Feedback de copiar
  const [copiedServiceId, setCopiedServiceId] = useState<string | null>(null);

  // Form State del Editor de Servicios
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formCoverImage, setFormCoverImage] = useState('');
  const [formStatus, setFormStatus] = useState<ServiceStatus>('active');
  const [formIcon, setFormIcon] = useState('Sparkles');
  const [formPricingType, setFormPricingType] = useState<ServicePricingType>('fixed');
  const [formCurrency, setFormCurrency] = useState<ServiceCurrency>('PEN');
  const [formCurrencySymbol, setFormCurrencySymbol] = useState('S/');
  const [formVisibility, setFormVisibility] = useState<ServiceVisibility>('public');
  const [formBasePrice, setFormBasePrice] = useState<number>(1500);
  const [formAnnualDiscount, setFormAnnualDiscount] = useState<number>(0);
  const [formDeliveryTime, setFormDeliveryTime] = useState('3 a 5 días hábiles');
  const [formInventoryUnlimited, setFormInventoryUnlimited] = useState(true);
  const [formInventory, setFormInventory] = useState<number | ''>('');
  
  // Urgencia
  const [formUrgencyEnabled, setFormUrgencyEnabled] = useState(false);
  const [formUrgencyEndDate, setFormUrgencyEndDate] = useState('');
  const [formUrgencyBadgeText, setFormUrgencyBadgeText] = useState('¡Cupos limitados con descuento especial!');

  // Video
  const [formVideoEnabled, setFormVideoEnabled] = useState(false);
  const [formVideoUrl, setFormVideoUrl] = useState('');

  // Descripciones
  const [formBriefDescription, setFormBriefDescription] = useState('');
  const [formFullDescription, setFormFullDescription] = useState('');

  // Listas Dinámicas
  const [formPackages, setFormPackages] = useState<ServicePackageTier[]>([]);
  const [formGallery, setFormGallery] = useState<ServiceGalleryItem[]>([]);
  const [formFeatures, setFormFeatures] = useState<ServiceFeatureItem[]>([]);
  const [formDeliverables, setFormDeliverables] = useState<ServiceDeliverableItem[]>([]);
  const [formRequirements, setFormRequirements] = useState<ServiceRequirementItem[]>([]);
  const [formFaqs, setFormFaqs] = useState<ServiceFaqItem[]>([]);
  const [formExtras, setFormExtras] = useState<ServiceExtraItem[]>([]);
  
  // SEO & Redes Sociales
  const [formSeoSlug, setFormSeoSlug] = useState('');
  const [formSeoMetaTitle, setFormSeoMetaTitle] = useState('');
  const [formSeoMetaDescription, setFormSeoMetaDescription] = useState('');
  const [formSeoOgImage, setFormSeoOgImage] = useState('');
  const [formRelatedServiceIds, setFormRelatedServiceIds] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  // Carga inicial
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [catsRes, srvRes] = await Promise.all([
        apiFetch<{ categories: ServiceCategory[] }>('/api/services/categories'),
        apiFetch<{ services: Service[] }>('/api/services'),
      ]);
      setCategories(catsRes.categories || []);
      setServices(srvRes.services || []);
    } catch (err) {
      toast((err as Error).message || 'Error cargando servicios', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenant.id]);

  // Sincronizar símbolo de moneda según la moneda elegida
  useEffect(() => {
    if (formCurrency === 'USD') setFormCurrencySymbol('$');
    else if (formCurrency === 'EUR') setFormCurrencySymbol('€');
    else setFormCurrencySymbol('S/');
  }, [formCurrency]);

  // Manejo de abrir nuevo servicio
  const handleOpenCreateService = () => {
    setEditingServiceId(null);
    setActiveTab('general');

    const nextCount = services.length + 1;
    const autoCode = `SRV-${String(nextCount).padStart(3, '0')}`;
    setFormCode(autoCode);
    setFormTitle('');
    setFormCategoryId(categories[0]?.id || '');
    setFormCoverImage(COVER_PRESETS[0]);
    setFormStatus('active');
    setFormIcon('Sparkles');
    setFormPricingType('fixed');
    setFormCurrency((tenant.customization?.currencyCode as ServiceCurrency) || 'PEN');
    setFormCurrencySymbol(tenant.customization?.currencySymbol || 'S/');
    setFormVisibility('public');
    setFormBasePrice(1200);
    setFormAnnualDiscount(0);
    setFormDeliveryTime('3 a 5 días hábiles');
    setFormInventoryUnlimited(true);
    setFormInventory('');

    setFormUrgencyEnabled(false);
    setFormUrgencyEndDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setFormUrgencyBadgeText('¡Oferta de temporada con descuento exclusivo!');

    setFormVideoEnabled(false);
    setFormVideoUrl('');

    setFormBriefDescription('');
    setFormFullDescription('');

    setFormPackages([
      {
        id: 'pkg-1',
        name: 'Paquete Básico',
        description: 'Ideal para iniciar con los entregables esenciales',
        price: 1200,
        deliveryTime: '5 días hábiles',
        features: ['Diagnóstico inicial', 'Entregables clave en digital', '1 ronda de revisión'],
        isPopular: false,
      },
      {
        id: 'pkg-2',
        name: 'Paquete Pro',
        description: 'Nuestra solución más recomendada y completa',
        price: 2200,
        deliveryTime: '10 días hábiles',
        features: ['Todo lo del Básico', 'Archivos maestros editables', 'Soporte prioritario', '3 rondas de revisiones'],
        isPopular: true,
        badgeText: 'MÁS RECOMENDADO',
      },
    ]);

    setFormGallery([
      {
        id: 'gal-init-1',
        url: COVER_PRESETS[0],
        title: 'Muestra Principal del Proyecto',
        tag: 'Resultado Final',
      },
    ]);

    setFormFeatures([
      {
        id: 'feat-1',
        title: 'Estrategia y Diagnóstico',
        description: 'Analizamos a fondo los objetivos de tu marca antes de comenzar la producción.',
        icon: 'Compass',
      },
      {
        id: 'feat-2',
        title: 'Archivos Maestros de Alta Calidad',
        description: 'Entregamos recursos listos para utilizar en medios digitales e impresos.',
        icon: 'CheckCircle2',
      },
    ]);

    setFormDeliverables([
      {
        id: 'del-1',
        title: 'Propuesta Conceptual',
        phase: 'Fase 1: Bocetado',
        details: 'Presentación interactiva con las líneas conceptuales para aprobación.',
      },
      {
        id: 'del-2',
        title: 'Archivos Finales y Manual',
        phase: 'Fase 2: Producción',
        details: 'Entrega en nube compartida con estructura organizada por carpetas.',
      },
    ]);

    setFormRequirements([
      {
        id: 'req-1',
        title: 'Cuestionario de Enfoque Inicial',
        description: 'Llenado de cuestionario breve con referencias e información clave de la empresa.',
      },
    ]);

    setFormFaqs([
      {
        id: 'faq-1',
        question: '¿Cómo iniciamos el servicio?',
        answer: 'Una vez confirmada la contratación y el abono inicial, agendamos una llamada de briefing de 30 minutos.',
      },
    ]);

    setFormExtras([
      {
        id: 'ext-1',
        title: 'Entrega Express en 48 Horas',
        description: 'Prioridad máxima de nuestro equipo creativo.',
        price: 450,
        volumeDiscountText: '',
      },
    ]);

    setFormSeoSlug('');
    setFormSeoMetaTitle('');
    setFormSeoMetaDescription('');
    setFormSeoOgImage(COVER_PRESETS[0]);
    setFormRelatedServiceIds([]);

    setIsEditorOpen(true);
  };

  // Manejo de abrir edición de servicio
  const handleOpenEditService = (service: Service) => {
    setEditingServiceId(service.id);
    setActiveTab('general');

    setFormCode(service.code || '');
    setFormTitle(service.title || '');
    setFormCategoryId(service.categoryId || categories[0]?.id || '');
    setFormCoverImage(service.coverImage || COVER_PRESETS[0]);
    setFormStatus(service.status || 'active');
    setFormIcon(service.icon || 'Sparkles');
    setFormPricingType(service.pricingType || 'fixed');
    setFormCurrency(service.currency || 'PEN');
    setFormCurrencySymbol(service.currencySymbol || 'S/');
    setFormVisibility(service.visibility || 'public');
    setFormBasePrice(service.basePrice || 0);
    setFormAnnualDiscount(service.annualDiscount || 0);
    setFormDeliveryTime(service.deliveryTime || '');
    setFormInventoryUnlimited(service.inventoryUnlimited ?? true);
    setFormInventory(service.inventory !== null && service.inventory !== undefined ? service.inventory : '');

    setFormUrgencyEnabled(Boolean(service.urgency?.enabled));
    setFormUrgencyEndDate(service.urgency?.endDate || '');
    setFormUrgencyBadgeText(service.urgency?.badgeText || '');

    setFormVideoEnabled(Boolean(service.video?.enabled));
    setFormVideoUrl(service.video?.url || '');

    setFormBriefDescription(service.briefDescription || '');
    setFormFullDescription(service.fullDescription || '');

    setFormPackages(Array.isArray(service.packages) ? service.packages : []);
    setFormGallery(Array.isArray(service.gallery) ? service.gallery : []);
    setFormFeatures(Array.isArray(service.features) ? service.features : []);
    setFormDeliverables(Array.isArray(service.deliverables) ? service.deliverables : []);
    setFormRequirements(Array.isArray(service.requirements) ? service.requirements : []);
    setFormFaqs(Array.isArray(service.faqs) ? service.faqs : []);
    setFormExtras(Array.isArray(service.extras) ? service.extras : []);

    setFormSeoSlug(service.seo?.slug || '');
    setFormSeoMetaTitle(service.seo?.metaTitle || '');
    setFormSeoMetaDescription(service.seo?.metaDescription || '');
    setFormSeoOgImage(service.seo?.ogImageUrl || service.coverImage || '');
    setFormRelatedServiceIds(Array.isArray(service.relatedServiceIds) ? service.relatedServiceIds : []);

    setIsEditorOpen(true);
  };

  // Autogenerar slug y SEO cuando cambia el título
  const handleTitleChange = (val: string) => {
    setFormTitle(val);
    if (!editingServiceId) {
      const generatedSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormSeoSlug(generatedSlug);
      setFormSeoMetaTitle(`${val} | ${tenant.name}`);
      if (!formBriefDescription) {
        setFormSeoMetaDescription(`Conoce más sobre nuestro servicio de ${val} y solicita tu cotización personalizada.`);
      }
    }
  };

  // Guardar servicio
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast('El título del servicio es obligatorio', 'warning');
      setActiveTab('general');
      return;
    }

    try {
      setIsSaving(true);
      const parsedVideo = parseVideoUrl(formVideoUrl);

      const finalSlug =
        formSeoSlug.trim() ||
        formTitle
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') ||
        `servicio-${Date.now()}`;

      const payload: Partial<Service> = {
        code: formCode.trim(),
        title: formTitle.trim(),
        categoryId: formCategoryId,
        coverImage: formCoverImage.trim(),
        status: formStatus,
        icon: formIcon,
        pricingType: formPricingType,
        currency: formCurrency,
        currencySymbol: formCurrencySymbol,
        visibility: formVisibility,
        basePrice: Number(formBasePrice) || 0,
        annualDiscount: Number(formAnnualDiscount) || 0,
        deliveryTime: formDeliveryTime.trim(),
        inventory: formInventoryUnlimited ? null : (formInventory === '' ? null : Number(formInventory)),
        inventoryUnlimited: formInventoryUnlimited,
        urgency: {
          enabled: formUrgencyEnabled,
          endDate: formUrgencyEndDate,
          badgeText: formUrgencyBadgeText.trim(),
        },
        video: {
          enabled: formVideoEnabled && parsedVideo.isValid,
          url: formVideoUrl.trim(),
          platform: parsedVideo.platform,
        },
        briefDescription: formBriefDescription.trim(),
        fullDescription: formFullDescription.trim(),
        packages: formPackages,
        gallery: formGallery,
        features: formFeatures,
        deliverables: formDeliverables,
        requirements: formRequirements,
        faqs: formFaqs,
        extras: formExtras,
        seo: {
          slug: finalSlug,
          metaTitle: formSeoMetaTitle.trim() || `${formTitle} | ${tenant.name}`,
          metaDescription: formSeoMetaDescription.trim() || formBriefDescription.trim(),
          ogImageUrl: formSeoOgImage.trim() || formCoverImage.trim(),
        },
        relatedServiceIds: formRelatedServiceIds,
      };

      if (editingServiceId) {
        await apiFetch(`/api/services/${editingServiceId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast('Servicio actualizado con éxito', 'success');
      } else {
        await apiFetch('/api/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast('Nuevo servicio creado con éxito', 'success');
      }

      setIsEditorOpen(false);
      loadData();
    } catch (err) {
      toast((err as Error).message || 'Error guardando servicio', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar servicio
  const handleDeleteService = async (service: Service) => {
    const confirmed = await confirmAction({
      title: `¿Eliminar "${service.title}"?`,
      message: 'Esta acción borrará el servicio del catálogo de tu agencia y no se podrá deshacer.',
      confirmText: 'Sí, eliminar servicio',
      cancelText: 'Cancelar',
      danger: true,
    });

    if (!confirmed) return;

    try {
      await apiFetch(`/api/services/${service.id}`, {
        method: 'DELETE',
      });
      toast('Servicio eliminado', 'success');
      loadData();
    } catch (err) {
      toast((err as Error).message || 'Error eliminando servicio', 'error');
    }
  };

  // Copiar enlace directo
  const handleCopyLink = async (service: Service) => {
    const slug = service.seo?.slug || service.id;
    const url = `${window.location.origin}/p/servicio/${slug}?tenant=${tenant.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedServiceId(service.id);
      toast('Enlace copiado al portapapeles', 'success');
      setTimeout(() => setCopiedServiceId(null), 2500);
    } catch {
      toast('No se pudo copiar el enlace', 'error');
    }
  };

  // Filtrado de servicios
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      // Búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchDesc = (s.briefDescription || '').toLowerCase().includes(q);
        const matchCode = (s.code || '').toLowerCase().includes(q);
        const matchCat = (s.categoryName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCode && !matchCat) return false;
      }
      // Categoría
      if (selectedCategoryFilter !== 'all' && s.categoryId !== selectedCategoryFilter) {
        return false;
      }
      // Estado
      if (selectedStatusFilter !== 'all' && s.status !== selectedStatusFilter) {
        return false;
      }
      // Tipo de precio
      if (selectedPricingTypeFilter !== 'all' && s.pricingType !== selectedPricingTypeFilter) {
        return false;
      }
      return true;
    });
  }, [services, searchQuery, selectedCategoryFilter, selectedStatusFilter, selectedPricingTypeFilter]);

  const activeCount = services.filter((s) => s.status === 'active').length;
  const publicCount = services.filter((s) => s.visibility === 'public').length;

  // =============================================================================
  // VISTA 1: LISTADO EN TABLA/GRID DE SERVICIOS
  // =============================================================================
  if (!isEditorOpen) {
    return (
      <div className="space-y-5 pb-12 animate-in fade-in duration-200">
      {/* CABECERA ESTANDARIZADA (IDÉNTICA A COTIZACIONES, SIN DEGRADADO, DESCRIPCIÓN ULTRA CORTA) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gestión de Catálogo & Servicios</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Servicios de la Agencia
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {services.length} servicios registrados • {activeCount} activos
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Ver Catálogo Público */}
          <a
            href={`/p/servicios?tenant=${tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
            title="Abrir vista pública del catálogo de la agencia"
          >
            <Globe className="w-4 h-4 text-slate-500" />
            <span>Ver Catálogo Público</span>
          </a>

          {/* Crear Categorías */}
          {can('services.categories.manage') && (
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-indigo-500" />
              <span>Categorías ({categories.length})</span>
            </button>
          )}

          {/* Nuevo Servicio */}
          {can('services.create') && (
            <button
              type="button"
              onClick={handleOpenCreateService}
              className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center justify-center gap-2 shrink-0 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Servicio</span>
            </button>
          )}
        </div>
      </div>

      {/* METRICAS KPI / RESUMEN EN 4 COLUMNAS (IDÉNTICO A COTIZACIONES) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Servicios</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {services.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Activos</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {activeCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Con Paquetes</span>
            <div className="text-xl sm:text-2xl font-black text-violet-600 dark:text-violet-400 mt-0.5">
              {services.filter(s => s.pricingType === 'packages').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Catálogo Web</span>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {publicCount}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Globe className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 sm:p-5 rounded-3xl border tenant-border tenant-surface shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 tenant-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar servicio por nombre, descripción, código o categoría..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-medium border tenant-border bg-slate-500/5 tenant-text placeholder:tenant-muted focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs tenant-muted hover:tenant-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Estado */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-bold border tenant-border bg-slate-500/5 tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activos</option>
              <option value="draft">Borradores</option>
              <option value="paused">Pausados</option>
            </select>

            {/* Filtro por Tipo de Precio */}
            <select
              value={selectedPricingTypeFilter}
              onChange={(e) => setSelectedPricingTypeFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl text-xs font-bold border tenant-border bg-slate-500/5 tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">Todo tipo de precio</option>
              <option value="fixed">Precio Fijo</option>
              <option value="starting_at">Precio Desde</option>
              <option value="monthly">Mensual / Recurrente</option>
              <option value="packages">Múltiples Paquetes</option>
            </select>
          </div>
        </div>

        {/* Pills de Categorías (Deslizables en móviles) */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'tenant-muted hover:tenant-text hover:bg-slate-500/10'
              }`}
            >
              Todas ({services.length})
            </button>
            {categories.map((c) => {
              const isSelected = selectedCategoryFilter === c.id;
              const count = services.filter((s) => s.categoryId === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(c.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'tenant-muted hover:tenant-text hover:bg-slate-500/10'
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: c.badgeColor || '#7c3aed' }}
                  />
                  <span>{c.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid de Cards de Servicios */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 rounded-3xl border tenant-border bg-slate-500/5 animate-pulse"
            />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed tenant-border tenant-surface">
          <div className="w-16 h-16 rounded-3xl bg-violet-500/10 text-violet-500 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-extrabold tenant-text">
            No se encontraron servicios
          </h3>
          <p className="text-xs sm:text-sm tenant-muted mt-1 max-w-md mx-auto">
            {searchQuery || selectedCategoryFilter !== 'all' || selectedStatusFilter !== 'all'
              ? 'Prueba cambiando o limpiando los filtros seleccionados arriba.'
              : 'Empieza a publicar los servicios de tu agencia creativa para exhibirlos en tu catálogo público.'}
          </p>
          {can('services.create') && (
            <button
              type="button"
              onClick={handleOpenCreateService}
              className="mt-5 px-5 py-2.5 rounded-2xl text-xs font-bold text-white tenant-btn-primary shadow-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Crear Nuevo Servicio Ahora
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredServices.map((service) => {
            const category = categories.find((c) => c.id === service.categoryId);
            const badgeColor = category?.badgeColor || '#7c3aed';
            const isCopied = copiedServiceId === service.id;

            // Formato de precio según tipo
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

            return (
              <div
                key={service.id}
                className="group rounded-3xl border tenant-border tenant-surface overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:border-violet-500/40 relative"
              >
                <div>
                  {/* Portada con Badges */}
                  <div className="relative h-40 sm:h-44 w-full bg-slate-900 overflow-hidden">
                    {service.coverImage ? (
                      <img
                        src={service.coverImage}
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
                        <Sparkles className="w-10 h-10 opacity-50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/25" />

                    {/* Badge de Categoría */}
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-md text-white flex items-center gap-1"
                        style={{ backgroundColor: `${badgeColor}` }}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[120px]">{service.categoryName || 'General'}</span>
                      </span>
                    </div>

                    {/* Badge de Estado & Visibilidad */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-md ${
                          service.status === 'active'
                            ? 'bg-emerald-600 text-white'
                            : service.status === 'draft'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        {service.status === 'active'
                          ? 'Activo'
                          : service.status === 'draft'
                          ? 'Borrador'
                          : 'Pausado'}
                      </span>
                      {service.visibility === 'private' && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-900/90 text-white border border-slate-700">
                          Privado
                        </span>
                      )}
                    </div>

                    {/* Banner de Urgencia si aplica */}
                    {service.urgency?.enabled && (
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="px-2 py-0.5 rounded-lg bg-amber-600 text-white text-[9px] font-bold flex items-center gap-1 shadow-md">
                          <Flame className="w-3 h-3 shrink-0" />
                          <span className="truncate">{service.urgency.badgeText || '¡Oferta Especial!'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo de la Card */}
                  <div className="p-4 space-y-2.5">
                    {/* Código y Paquete / Modelo */}
                    <div className="flex items-center justify-between text-[10px] tenant-muted font-bold">
                      <span className="font-mono text-violet-500">{service.code}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-500/10 text-[9px]">
                        {service.pricingType === 'packages'
                          ? `${service.packages?.length || 0} Paquetes`
                          : service.pricingType === 'monthly'
                          ? 'Mensual'
                          : service.pricingType === 'starting_at'
                          ? 'Desde'
                          : 'Fijo'}
                      </span>
                    </div>

                    {/* Título del Servicio */}
                    <h3 className="font-black text-sm sm:text-base tenant-text leading-snug line-clamp-2" title={service.title}>
                      {service.title}
                    </h3>

                    {/* Breve descripción mostrando solamente las tres primeras líneas (REQUERIMIENTO EXACTO) */}
                    <p className="text-xs leading-relaxed tenant-muted line-clamp-3 min-h-[3.75rem]">
                      {service.briefDescription ||
                        'Servicio profesional diseñado a medida para elevar los resultados de tu empresa.'}
                    </p>

                    {/* Precio y Descuento Anual */}
                    <div className="pt-2 border-t tenant-border flex items-baseline justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold tenant-muted block">
                          Inversión
                        </span>
                        <span className="text-base sm:text-lg font-black text-emerald-500 tracking-tight">
                          {priceLabel}
                        </span>
                      </div>

                      {service.annualDiscount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[9px] font-extrabold">
                          -{service.annualDiscount}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer de Botones de Acción (REQUERIMIENTO EXACTO: copiar enlace, eliminar, editar o compartir) */}
                <div className="p-2.5 pt-2 border-t tenant-border bg-slate-500/5 grid grid-cols-4 gap-1">
                  {/* Copiar enlace */}
                  <button
                    type="button"
                    onClick={() => handleCopyLink(service)}
                    className="p-2 rounded-xl text-xs font-bold border tenant-border hover:bg-slate-500/10 tenant-text flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                    title="Copiar enlace público"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[9px]">{isCopied ? 'Copiado' : 'Enlace'}</span>
                  </button>

                  {/* Compartir */}
                  <button
                    type="button"
                    onClick={() => setServiceToShare(service)}
                    className="p-2 rounded-xl text-xs font-bold border tenant-border hover:bg-slate-500/10 tenant-text flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                    title="Compartir por WhatsApp o redes"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="text-[9px]">Compartir</span>
                  </button>

                  {/* Editar */}
                  {can('services.edit') ? (
                    <button
                      type="button"
                      onClick={() => handleOpenEditService(service)}
                      className="p-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer shadow-sm"
                      title="Editar servicio completo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="text-[9px]">Editar</span>
                    </button>
                  ) : <div />}

                  {/* Eliminar */}
                  {can('services.delete') ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteService(service)}
                      className="p-2 rounded-xl text-xs font-bold border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                      title="Eliminar servicio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[9px]">Eliminar</span>
                    </button>
                  ) : <div />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE GESTIÓN DE CATEGORÍAS */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onCategoriesUpdated={loadData}
      />

      {/* MODAL DE COMPARTIR SERVICIO */}
      <ShareServiceModal
        isOpen={Boolean(serviceToShare)}
        onClose={() => setServiceToShare(null)}
        service={serviceToShare}
      />
    </div>
  );
}

// =============================================================================
// VISTA 2: EDITOR DE SERVICIO TIPO SPA (ESPACIOSO, MODERNO, RESPONSIVE)
// =============================================================================
return (
  <div className="space-y-5 pb-12 animate-in fade-in duration-200">
    {/* CABECERA SPA ESTANDARIZADA */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => {
            setIsEditorOpen(false);
            setEditingServiceId(null);
          }}
          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 shadow-xs transition cursor-pointer"
          title="Volver al catálogo de servicios"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{editingServiceId ? 'Edición de Servicio' : 'Nuevo Servicio de la Agencia'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 max-w-xl truncate">
            {formTitle || (editingServiceId ? 'Servicio sin título' : 'Crear Nuevo Servicio')}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {editingServiceId && (
          <a
            href={`/p/servicio/${formSeoSlug || editingServiceId}?tenant=${tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
            title="Abrir vista pública del servicio"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            <span>Vista Previa</span>
          </a>
        )}

        <button
          type="button"
          onClick={() => {
            setIsEditorOpen(false);
            setEditingServiceId(null);
          }}
          className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition cursor-pointer"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleSaveService}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>{isSaving ? 'Guardando...' : editingServiceId ? 'Guardar Cambios' : 'Publicar Servicio'}</span>
        </button>
      </div>
    </div>

    {/* PESTAÑAS MODERNAS HORIZONTALES CON BADGES */}
    <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-x-auto no-scrollbar">
      {[
        { id: 'general', label: '1. Portada & Datos Generales', icon: Sparkles },
        { id: 'gallery', label: '2. Galería & Portafolio', icon: ImageIcon, count: formGallery.length },
        { id: 'features', label: '3. Qué Incluye', icon: CheckCircle2, count: formFeatures.length },
        { id: 'deliverables', label: '4. Entregables por Fase', icon: Package, count: formDeliverables.length },
        { id: 'extras', label: '5. Paquetes, FAQs & Extras', icon: HelpCircle, count: (formPackages.length + formFaqs.length) },
        { id: 'seo', label: '6. SEO & Redes', icon: Globe },
      ].map((tab) => {
        const TabIcon = tab.icon;
        const isCurrent = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as EditorTab)}
            className={`py-2.5 px-4 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              isCurrent
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <TabIcon className="w-4 h-4" />
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isCurrent
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>

    {/* CONTENEDOR ESPACIOSO DEL FORMULARIO SPA */}
    <form onSubmit={handleSaveService} className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
              {/* ============================================================== */}
              {/* PESTAÑA 1: PORTADA & DATOS GENERALES */}
              {/* ============================================================== */}
              {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Fila 1: Portada del Servicio con selector de presets y preview */}
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider tenant-muted mb-2">
                      Portada del Servicio (Imagen Principal) *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Preview Box */}
                      <div className="relative w-full sm:w-60 h-36 rounded-2xl overflow-hidden border tenant-border bg-slate-900 shrink-0">
                        {formCoverImage ? (
                          <img
                            src={formCoverImage}
                            alt="Portada"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/50">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[9px] font-bold text-white">
                          Vista previa
                        </span>
                      </div>

                      {/* Inputs de URL & Presets */}
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={formCoverImage}
                          onChange={(e) => setFormCoverImage(e.target.value)}
                          placeholder="Pega la URL de la imagen de portada o selecciona un preset abajo..."
                          className="w-full px-3.5 py-2.5 rounded-2xl text-xs border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />

                        {/* Presets rápidos */}
                        <div>
                          <span className="text-[11px] font-bold tenant-muted block mb-1.5">
                            O selecciona una fotografía sugerida:
                          </span>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {COVER_PRESETS.map((p, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setFormCoverImage(p)}
                                className={`w-12 h-10 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                                  formCoverImage === p ? 'border-violet-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                                }`}
                              >
                                <img src={p} alt="Preset" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Título, Código y Categoría */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-extrabold tenant-muted mb-1.5">
                        Título del Servicio *
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Ej. Branding 360° & Manual de Identidad Corporativa"
                        required
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold tenant-muted mb-1.5">
                        Código Identificador
                      </label>
                      <input
                        type="text"
                        value={formCode}
                        onChange={(e) => setFormCode(e.target.value)}
                        placeholder="SRV-001"
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono font-bold border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  {/* Fila 3: Categoría, Estado y Visibilidad */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold tenant-muted mb-1.5">
                        Categoría del Servicio *
                      </label>
                      <select
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold border tenant-border bg-slate-500/5 tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold tenant-muted mb-1.5">
                        Estado del Servicio
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as ServiceStatus)}
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold border tenant-border bg-slate-500/5 tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="active">Activo (Visible para cotizar)</option>
                        <option value="draft">Borrador (En preparación)</option>
                        <option value="paused">Pausado (No disponible temporalmente)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold tenant-muted mb-1.5">
                        Visibilidad
                      </label>
                      <select
                        value={formVisibility}
                        onChange={(e) => setFormVisibility(e.target.value as ServiceVisibility)}
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold border tenant-border bg-slate-500/5 tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="public">Público (Aparece en catálogo web)</option>
                        <option value="private">Privado (Solo por enlace directo)</option>
                      </select>
                    </div>
                  </div>

                  {/* Fila 4: Tipo de Precio, Moneda, Precio Base y Descuento Anual */}
                  <div className="p-4 rounded-3xl border tenant-border bg-slate-500/5 space-y-4">
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-violet-500 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      Modelo de Precios & Tarifas
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold tenant-muted mb-1">
                          Tipo de Precio
                        </label>
                        <select
                          value={formPricingType}
                          onChange={(e) => setFormPricingType(e.target.value as ServicePricingType)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-bold border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="fixed">Precio Fijo</option>
                          <option value="starting_at">Precio Desde</option>
                          <option value="monthly">Precio Mensual (Suscripción)</option>
                          <option value="packages">Múltiples Paquetes (Tiers)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold tenant-muted mb-1">
                          Moneda
                        </label>
                        <select
                          value={formCurrency}
                          onChange={(e) => setFormCurrency(e.target.value as ServiceCurrency)}
                          className="w-full px-3 py-2 rounded-xl text-xs font-bold border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="PEN">Soles (S/)</option>
                          <option value="USD">Dólares ($)</option>
                          <option value="EUR">Euros (€)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold tenant-muted mb-1">
                          Precio Base / Estimado
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold tenant-muted">
                            {formCurrencySymbol}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formBasePrice}
                            onChange={(e) => setFormBasePrice(Number(e.target.value))}
                            className="w-full pl-8 pr-3 py-2 rounded-xl text-xs font-black border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold tenant-muted mb-1">
                          Descuento Anual (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={formAnnualDiscount}
                            onChange={(e) => setFormAnnualDiscount(Number(e.target.value))}
                            placeholder="0"
                            className="w-full pr-8 pl-3 py-2 rounded-xl text-xs font-bold border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold tenant-muted">
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Si seleccionó Múltiples Paquetes, mostrar editor de tiers aquí */}
                    {formPricingType === 'packages' && (
                      <div className="pt-3 border-t tenant-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold tenant-text">
                            Paquetes Disponibles ({formPackages.length})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormPackages([
                                ...formPackages,
                                {
                                  id: `pkg-${Date.now()}`,
                                  name: `Paquete ${formPackages.length + 1}`,
                                  description: 'Descripción del alcance de este plan',
                                  price: formBasePrice,
                                  deliveryTime: '7 días hábiles',
                                  features: ['Característica 1', 'Característica 2'],
                                  isPopular: false,
                                },
                              ])
                            }
                            className="text-xs font-bold text-violet-500 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Añadir Paquete
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {formPackages.map((pkg, pIdx) => (
                            <div
                              key={pkg.id}
                              className="p-3.5 rounded-2xl border tenant-border bg-slate-500/5 space-y-2.5 relative"
                            >
                              <div className="flex items-center justify-between">
                                <input
                                  type="text"
                                  value={pkg.name}
                                  onChange={(e) => {
                                    const next = [...formPackages];
                                    next[pIdx].name = e.target.value;
                                    setFormPackages(next);
                                  }}
                                  placeholder="Nombre del paquete (ej. Pro)"
                                  className="text-xs font-extrabold border-b tenant-border bg-transparent tenant-text focus:outline-none w-36"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormPackages(formPackages.filter((_, i) => i !== pIdx));
                                  }}
                                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] tenant-muted font-bold block">
                                    Precio ({formCurrencySymbol})
                                  </label>
                                  <input
                                    type="number"
                                    value={pkg.price}
                                    onChange={(e) => {
                                      const next = [...formPackages];
                                      next[pIdx].price = Number(e.target.value);
                                      setFormPackages(next);
                                    }}
                                    className="w-full px-2 py-1 rounded-lg text-xs font-black border tenant-border bg-transparent tenant-text"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] tenant-muted font-bold block">
                                    Entrega
                                  </label>
                                  <input
                                    type="text"
                                    value={pkg.deliveryTime}
                                    onChange={(e) => {
                                      const next = [...formPackages];
                                      next[pIdx].deliveryTime = e.target.value;
                                      setFormPackages(next);
                                    }}
                                    className="w-full px-2 py-1 rounded-lg text-xs border tenant-border bg-transparent tenant-text"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] tenant-muted font-bold block">
                                  Características incluidas (separadas por coma)
                                </label>
                                <textarea
                                  rows={2}
                                  value={pkg.features.join(', ')}
                                  onChange={(e) => {
                                    const next = [...formPackages];
                                    next[pIdx].features = e.target.value
                                      .split(',')
                                      .map((f) => f.trim())
                                      .filter(Boolean);
                                    setFormPackages(next);
                                  }}
                                  className="w-full px-2 py-1 rounded-lg text-[11px] border tenant-border bg-transparent tenant-text"
                                />
                              </div>

                              <label className="flex items-center gap-2 cursor-pointer text-xs tenant-text font-bold">
                                <input
                                  type="checkbox"
                                  checked={Boolean(pkg.isPopular)}
                                  onChange={(e) => {
                                    const next = [...formPackages];
                                    next[pIdx].isPopular = e.target.checked;
                                    setFormPackages(next);
                                  }}
                                  className="rounded text-violet-600 focus:ring-violet-500"
                                />
                                <span>Marcar como "Más Elegido / Popular"</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fila 5: Tiempo de entrega, Inventario/Cupos y Contador de Urgencia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tiempo de entrega e Inventario */}
                    <div className="p-4 rounded-3xl border tenant-border bg-slate-500/5 space-y-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-violet-500 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        Tiempos & Disponibilidad
                      </h4>

                      <div>
                        <label className="block text-xs font-bold tenant-muted mb-1">
                          Tiempo de Entrega Estimado
                        </label>
                        <input
                          type="text"
                          value={formDeliveryTime}
                          onChange={(e) => setFormDeliveryTime(e.target.value)}
                          placeholder="ej. 3 a 5 días hábiles"
                          className="w-full px-3 py-2 rounded-xl text-xs font-semibold border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold tenant-text mb-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formInventoryUnlimited}
                            onChange={(e) => setFormInventoryUnlimited(e.target.checked)}
                            className="rounded text-violet-600"
                          />
                          <span>Cupos Ilimitados</span>
                        </label>
                        {!formInventoryUnlimited && (
                          <input
                            type="number"
                            min="1"
                            value={formInventory}
                            onChange={(e) =>
                              setFormInventory(e.target.value === '' ? '' : Number(e.target.value))
                            }
                            placeholder="Ej. 5 cupos disponibles por mes"
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold border tenant-border bg-transparent tenant-text mt-1"
                          />
                        )}
                      </div>
                    </div>

                    {/* Contador de Fecha de Urgencia */}
                    <div className="p-4 rounded-3xl border tenant-border bg-slate-500/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                          <Flame className="w-4 h-4" />
                          Contador de Urgencia / Oferta
                        </h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formUrgencyEnabled}
                            onChange={(e) => setFormUrgencyEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500" />
                        </label>
                      </div>

                      {formUrgencyEnabled && (
                        <div className="space-y-2.5 animate-in fade-in duration-200">
                          <div>
                            <label className="block text-xs font-bold tenant-muted mb-1">
                              Fecha Fin de la Oferta *
                            </label>
                            <input
                              type="date"
                              value={formUrgencyEndDate.split('T')[0]}
                              onChange={(e) => setFormUrgencyEndDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl text-xs font-bold border tenant-border bg-transparent tenant-text focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold tenant-muted mb-1">
                              Texto del Badge de Urgencia
                            </label>
                            <input
                              type="text"
                              value={formUrgencyBadgeText}
                              onChange={(e) => setFormUrgencyBadgeText(e.target.value)}
                              placeholder="¡Oferta exclusiva hasta agotar stock!"
                              className="w-full px-3 py-2 rounded-xl text-xs border tenant-border bg-transparent tenant-text focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fila 6: Video de Presentación (Soporta YouTube, Vimeo, Google Drive, Loom, Video directo) */}
                  <div className="p-4 rounded-3xl border tenant-border bg-slate-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-violet-500" />
                        <span className="font-extrabold text-xs uppercase tracking-wider tenant-text">
                          Video de Presentación del Servicio
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formVideoEnabled}
                          onChange={(e) => setFormVideoEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
                      </label>
                    </div>

                    {formVideoEnabled && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <p className="text-xs tenant-muted">
                          Soporta enlaces de <strong>YouTube</strong>, <strong>Vimeo</strong>, <strong>Google Drive</strong>, <strong>Loom</strong> o videos directos (.mp4).
                        </p>
                        <input
                          type="text"
                          value={formVideoUrl}
                          onChange={(e) => setFormVideoUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/... o Google Drive"
                          className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />

                        {/* Previsualización del Video */}
                        {formVideoUrl && (
                          <div className="mt-3">
                            <span className="text-[11px] font-bold tenant-muted block mb-1.5">
                              Previsualización en Vivo:
                            </span>
                            {(() => {
                              const parsed = parseVideoUrl(formVideoUrl);
                              if (!parsed.isValid) {
                                return (
                                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs">
                                    Enlace de video no reconocido. Verifica que sea una URL de YouTube, Vimeo, Google Drive o archivo de video válido.
                                  </div>
                                );
                              }
                              return (
                                <div className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden border tenant-border bg-black shadow-lg">
                                  {parsed.platform === 'direct' ? (
                                    <video
                                      src={parsed.embedUrl}
                                      controls
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <iframe
                                      src={parsed.embedUrl}
                                      title="Video preview"
                                      className="w-full h-full border-0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fila 7: Descripción Breve (3 Líneas) y Completa */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-extrabold tenant-muted">
                          Descripción Breve del Servicio (Se muestra en las tarjetas de catálogo) *
                        </label>
                        <span className="text-[11px] tenant-muted font-mono">
                          {formBriefDescription.length} caracteres
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={formBriefDescription}
                        onChange={(e) => setFormBriefDescription(e.target.value)}
                        placeholder="Resume en 2 o 3 líneas atractivas el impacto y objetivo principal de este servicio..."
                        required
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold tenant-muted mb-1.5">
                        Descripción Detallada / Pitch Comercial
                      </label>
                      <textarea
                        rows={5}
                        value={formFullDescription}
                        onChange={(e) => setFormFullDescription(e.target.value)}
                        placeholder="Explica a fondo la propuesta de valor, metodología de trabajo, experiencia y beneficios..."
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* PESTAÑA 2: GALERÍA & PORTAFOLIO */}
              {/* ============================================================== */}
              {activeTab === 'gallery' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b tenant-border">
                    <div>
                      <h3 className="font-extrabold text-sm tenant-text">
                        Galería de Trabajos & Portafolio del Servicio
                      </h3>
                      <p className="text-xs tenant-muted">
                        Agrega fotografías de proyectos reales para que los clientes vean de forma interactiva la calidad de la agencia.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFormGallery([
                          ...formGallery,
                          {
                            id: `gal-${Date.now()}`,
                            url: COVER_PRESETS[Math.floor(Math.random() * COVER_PRESETS.length)],
                            title: `Fotografía de Proyecto ${formGallery.length + 1}`,
                            tag: 'Diseño',
                          },
                        ])
                      }
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white tenant-btn-primary flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Añadir Fotografía
                    </button>
                  </div>

                  {/* Grid de Imágenes de la Galería */}
                  {formGallery.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed tenant-border">
                      <ImageIcon className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
                      <p className="text-xs font-bold tenant-text">No has añadido fotos a la galería</p>
                      <p className="text-[11px] tenant-muted mt-0.5">
                        Agrega al menos 2 o 3 imágenes para que el cliente pueda explorar tu trabajo en el visualizador tipo app.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {formGallery.map((item, idx) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border tenant-border bg-slate-500/5 overflow-hidden flex flex-col justify-between group"
                        >
                          <div className="relative h-36 bg-slate-900 overflow-hidden">
                            <img
                              src={item.url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormGallery(formGallery.filter((_, i) => i !== idx));
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-rose-400 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="p-3 space-y-2">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const next = [...formGallery];
                                next[idx].title = e.target.value;
                                setFormGallery(next);
                              }}
                              placeholder="Título / Pie de foto"
                              className="w-full px-2 py-1 rounded-lg text-xs font-bold border tenant-border bg-transparent tenant-text focus:outline-none"
                            />

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item.tag}
                                onChange={(e) => {
                                  const next = [...formGallery];
                                  next[idx].tag = e.target.value;
                                  setFormGallery(next);
                                }}
                                placeholder="Tag (ej. Packaging)"
                                className="w-24 px-2 py-1 rounded-lg text-[10px] font-mono border tenant-border bg-transparent tenant-text focus:outline-none"
                              />

                              <input
                                type="text"
                                value={item.url}
                                onChange={(e) => {
                                  const next = [...formGallery];
                                  next[idx].url = e.target.value;
                                  setFormGallery(next);
                                }}
                                placeholder="URL de la imagen"
                                className="flex-1 px-2 py-1 rounded-lg text-[10px] border tenant-border bg-transparent tenant-text focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* PESTAÑA 3: CONTENIDOS / QUÉ INCLUYE */}
              {/* ============================================================== */}
              {activeTab === 'features' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b tenant-border">
                    <div>
                      <h3 className="font-extrabold text-sm tenant-text">
                        Contenidos & Qué es lo que Incluye el Servicio
                      </h3>
                      <p className="text-xs tenant-muted">
                        Muestra con tarjetas visuales cada una de las características incluidas en el servicio.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFormFeatures([
                          ...formFeatures,
                          {
                            id: `feat-${Date.now()}`,
                            title: `Característica ${formFeatures.length + 1}`,
                            description: 'Detalle claro de este beneficio o aspecto incluido.',
                            icon: 'CheckCircle2',
                          },
                        ])
                      }
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white tenant-btn-primary flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Añadir Característica
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {formFeatures.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border tenant-border bg-slate-500/5 space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-500">
                            Card #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormFeatures(formFeatures.filter((_, i) => i !== idx));
                            }}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold tenant-muted mb-1">
                            Título de la Característica *
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const next = [...formFeatures];
                              next[idx].title = e.target.value;
                              setFormFeatures(next);
                            }}
                            placeholder="Ej. Formatos Vectoriales Editables"
                            className="w-full px-3 py-1.5 rounded-xl text-xs font-bold border tenant-border bg-transparent tenant-text focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold tenant-muted mb-1">
                            Descripción de la Característica
                          </label>
                          <textarea
                            rows={2}
                            value={item.description}
                            onChange={(e) => {
                              const next = [...formFeatures];
                              next[idx].description = e.target.value;
                              setFormFeatures(next);
                            }}
                            placeholder="Explica qué recibirá el cliente o qué problema soluciona..."
                            className="w-full px-3 py-1.5 rounded-xl text-xs border tenant-border bg-transparent tenant-text focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* PESTAÑA 4: ENTREGABLES */}
              {/* ============================================================== */}
              {activeTab === 'deliverables' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b tenant-border">
                    <div>
                      <h3 className="font-extrabold text-sm tenant-text">
                        Entregables por Fase del Proyecto
                      </h3>
                      <p className="text-xs tenant-muted">
                        Define los entregables tangibles organizados por fases (título, fase y detalles).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFormDeliverables([
                          ...formDeliverables,
                          {
                            id: `del-${Date.now()}`,
                            title: `Entregable ${formDeliverables.length + 1}`,
                            phase: `Fase ${formDeliverables.length + 1}: Ejecución`,
                            details: 'Archivos y documentos entregados al cliente.',
                          },
                        ])
                      }
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white tenant-btn-primary flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Añadir Entregable
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {formDeliverables.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border tenant-border bg-slate-500/5 space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">
                            Entregable #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormDeliverables(formDeliverables.filter((_, i) => i !== idx));
                            }}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold tenant-muted mb-1">
                              Fase del Proyecto
                            </label>
                            <input
                              type="text"
                              value={item.phase}
                              onChange={(e) => {
                                const next = [...formDeliverables];
                                next[idx].phase = e.target.value;
                                setFormDeliverables(next);
                              }}
                              placeholder="Fase 1: Diagnóstico"
                              className="w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border tenant-border bg-transparent tenant-text focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold tenant-muted mb-1">
                              Título del Entregable *
                            </label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const next = [...formDeliverables];
                                next[idx].title = e.target.value;
                                setFormDeliverables(next);
                              }}
                              placeholder="Manual de Marca PDF"
                              className="w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border tenant-border bg-transparent tenant-text focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold tenant-muted mb-1">
                            Detalles del Entregable (Qué recibe, especificaciones)
                          </label>
                          <textarea
                            rows={2}
                            value={item.details}
                            onChange={(e) => {
                              const next = [...formDeliverables];
                              next[idx].details = e.target.value;
                              setFormDeliverables(next);
                            }}
                            placeholder="Formatos de entrega, especificaciones de color, rondas de cambio..."
                            className="w-full px-2.5 py-1.5 rounded-xl text-xs border tenant-border bg-transparent tenant-text focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* PESTAÑA 5: REQUISITOS, FAQS & EXTRAS */}
              {/* ============================================================== */}
              {activeTab === 'extras' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* SECCIÓN 1: REQUISITOS PREVIOS */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b tenant-border">
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-violet-500">
                          1. Requisitos Previos para el Cliente
                        </h4>
                        <p className="text-[11px] tenant-muted">
                          ¿Qué materiales o accesos debe entregar el cliente antes de iniciar?
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setFormRequirements([
                            ...formRequirements,
                            {
                              id: `req-${Date.now()}`,
                              title: 'Material requerido',
                              description: 'Instrucciones claras para el cliente.',
                            },
                          ])
                        }
                        className="text-xs font-bold text-violet-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir Requisito
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formRequirements.map((req, rIdx) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-xl border tenant-border bg-slate-500/5 flex items-start gap-3"
                        >
                          <div className="flex-1 space-y-1.5">
                            <input
                              type="text"
                              value={req.title}
                              onChange={(e) => {
                                const next = [...formRequirements];
                                next[rIdx].title = e.target.value;
                                setFormRequirements(next);
                              }}
                              placeholder="Título del requisito (ej. Logo en formato vectorial)"
                              className="w-full text-xs font-bold border-b tenant-border bg-transparent tenant-text focus:outline-none"
                            />
                            <textarea
                              rows={1}
                              value={req.description}
                              onChange={(e) => {
                                const next = [...formRequirements];
                                next[rIdx].description = e.target.value;
                                setFormRequirements(next);
                              }}
                              placeholder="Instrucciones detalladas de formato o acceso..."
                              className="w-full text-[11px] border tenant-border rounded-lg p-1 bg-transparent tenant-text focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setFormRequirements(formRequirements.filter((_, i) => i !== rIdx));
                            }}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECCIÓN 2: PREGUNTAS FRECUENTES (FAQs) */}
                  <div className="space-y-3 pt-3 border-t tenant-border">
                    <div className="flex items-center justify-between pb-1 border-b tenant-border">
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-violet-500">
                          2. Preguntas Frecuentes (FAQ)
                        </h4>
                        <p className="text-[11px] tenant-muted">
                          Resuelve dudas habituales antes de que el cliente las pregunte.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setFormFaqs([
                            ...formFaqs,
                            {
                              id: `faq-${Date.now()}`,
                              question: '¿Pregunta frecuente?',
                              answer: 'Respuesta clara y convincente.',
                            },
                          ])
                        }
                        className="text-xs font-bold text-violet-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir FAQ
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {formFaqs.map((faq, fIdx) => (
                        <div
                          key={faq.id}
                          className="p-3 rounded-xl border tenant-border bg-slate-500/5 space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={faq.question}
                              onChange={(e) => {
                                const next = [...formFaqs];
                                next[fIdx].question = e.target.value;
                                setFormFaqs(next);
                              }}
                              placeholder="¿Pregunta frecuente?"
                              className="flex-1 text-xs font-bold border-b tenant-border bg-transparent tenant-text focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormFaqs(formFaqs.filter((_, i) => i !== fIdx));
                              }}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer ml-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <textarea
                            rows={2}
                            value={faq.answer}
                            onChange={(e) => {
                              const next = [...formFaqs];
                              next[fIdx].answer = e.target.value;
                              setFormFaqs(next);
                            }}
                            placeholder="Respuesta a la pregunta..."
                            className="w-full text-xs p-2 rounded-lg border tenant-border bg-transparent tenant-text focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECCIÓN 3: EXTRAS, ADD-ONS & DESCUENTO POR VOLUMEN */}
                  <div className="space-y-3 pt-3 border-t tenant-border">
                    <div className="flex items-center justify-between pb-1 border-b tenant-border">
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-500">
                          3. Extras, Add-ons & Descuento por Volumen
                        </h4>
                        <p className="text-[11px] tenant-muted">
                          Servicios adicionales que el cliente puede sumar al carrito para escalar su proyecto.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setFormExtras([
                            ...formExtras,
                            {
                              id: `ext-${Date.now()}`,
                              title: 'Extra adicional',
                              description: 'Detalle del extra opcional.',
                              price: 300,
                              volumeDiscountText: '10% dto. a partir de 3 unidades',
                            },
                          ])
                        }
                        className="text-xs font-bold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir Extra
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {formExtras.map((ext, eIdx) => (
                        <div
                          key={ext.id}
                          className="p-3.5 rounded-2xl border tenant-border bg-slate-500/5 space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={ext.title}
                              onChange={(e) => {
                                const next = [...formExtras];
                                next[eIdx].title = e.target.value;
                                setFormExtras(next);
                              }}
                              placeholder="Nombre del extra (ej. Entrega express)"
                              className="text-xs font-bold border-b tenant-border bg-transparent tenant-text focus:outline-none w-36"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFormExtras(formExtras.filter((_, i) => i !== eIdx));
                              }}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] tenant-muted font-bold block">
                                Precio Extra ({formCurrencySymbol})
                              </label>
                              <input
                                type="number"
                                value={ext.price}
                                onChange={(e) => {
                                  const next = [...formExtras];
                                  next[eIdx].price = Number(e.target.value);
                                  setFormExtras(next);
                                }}
                                className="w-full px-2 py-1 rounded-lg text-xs font-black border tenant-border bg-transparent tenant-text"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] tenant-muted font-bold block">
                                Descuento por Volumen
                              </label>
                              <input
                                type="text"
                                value={ext.volumeDiscountText || ''}
                                onChange={(e) => {
                                  const next = [...formExtras];
                                  next[eIdx].volumeDiscountText = e.target.value;
                                  setFormExtras(next);
                                }}
                                placeholder="ej. 20% off desde 3 uds."
                                className="w-full px-2 py-1 rounded-lg text-[10px] border tenant-border bg-transparent tenant-text"
                              />
                            </div>
                          </div>

                          <textarea
                            rows={1}
                            value={ext.description}
                            onChange={(e) => {
                              const next = [...formExtras];
                              next[eIdx].description = e.target.value;
                              setFormExtras(next);
                            }}
                            placeholder="Descripción breve del extra..."
                            className="w-full text-[11px] p-1.5 rounded-lg border tenant-border bg-transparent tenant-text"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* PESTAÑA 6: SEO & REDES SOCIALES & RELACIONADOS */}
              {/* ============================================================== */}
              {activeTab === 'seo' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="space-y-4">
                    {/* Slug / URL amigable */}
                    <div>
                      <label className="block text-xs font-extrabold tenant-muted mb-1">
                        URL Amigable / Slug Corto *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono tenant-muted px-2.5 py-2 rounded-xl bg-slate-500/10">
                          /p/servicio/
                        </span>
                        <input
                          type="text"
                          value={formSeoSlug}
                          onChange={(e) => setFormSeoSlug(e.target.value)}
                          placeholder="branding-completo-360"
                          required
                          className="flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>

                    {/* Meta Título */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-extrabold tenant-muted">
                          Meta Título (Google & Navegador)
                        </label>
                        <span
                          className={`text-[10px] font-mono ${
                            formSeoMetaTitle.length > 60 ? 'text-amber-500' : 'tenant-muted'
                          }`}
                        >
                          {formSeoMetaTitle.length} / 60 caracteres recomendados
                        </span>
                      </div>
                      <input
                        type="text"
                        value={formSeoMetaTitle}
                        onChange={(e) => setFormSeoMetaTitle(e.target.value)}
                        placeholder={`${formTitle || 'Servicio'} | ${tenant.name}`}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    {/* Meta Descripción */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-extrabold tenant-muted">
                          Meta Descripción
                        </label>
                        <span
                          className={`text-[10px] font-mono ${
                            formSeoMetaDescription.length > 160 ? 'text-amber-500' : 'tenant-muted'
                          }`}
                        >
                          {formSeoMetaDescription.length} / 160 caracteres recomendados
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={formSeoMetaDescription}
                        onChange={(e) => setFormSeoMetaDescription(e.target.value)}
                        placeholder="Descripción para el snippet de Google y previsualización de enlaces..."
                        className="w-full px-3 py-2 rounded-xl text-xs border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    {/* Imagen para Redes Sociales (OG Image) */}
                    <div>
                      <label className="block text-xs font-extrabold tenant-muted mb-1">
                        Imagen para Redes Sociales (Open Graph)
                      </label>
                      <input
                        type="text"
                        value={formSeoOgImage}
                        onChange={(e) => setFormSeoOgImage(e.target.value)}
                        placeholder="URL de la imagen (deja en blanco para usar la portada)"
                        className="w-full px-3 py-2 rounded-xl text-xs border tenant-border bg-transparent tenant-text focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* PREVISUALIZACIONES INTERACTIVAS: GOOGLE Y WHATSAPP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t tenant-border">
                    {/* Previsualización en Google */}
                    <div className="space-y-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-violet-500 flex items-center gap-1.5">
                        <Globe className="w-4 h-4" />
                        Previsualización en Google
                      </span>
                      <div className="p-4 rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[8px] flex items-center justify-center font-bold">
                            R
                          </span>
                          <span className="truncate">
                            {window.location.origin}/p/servicio/{formSeoSlug || 'servicio'}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer line-clamp-1">
                          {formSeoMetaTitle || `${formTitle || 'Servicio'} | ${tenant.name}`}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {formSeoMetaDescription ||
                            formBriefDescription ||
                            'Conoce todos los detalles, entregables y paquetes de este servicio profesional.'}
                        </p>
                      </div>
                    </div>

                    {/* Previsualización en WhatsApp */}
                    <div className="space-y-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4" />
                        Previsualización en WhatsApp
                      </span>
                      <div className="p-3 rounded-2xl bg-[#0b141a] text-slate-200 max-w-sm shadow-md">
                        <div className="rounded-xl overflow-hidden bg-[#202c33] border border-white/10">
                          <div className="h-28 w-full bg-slate-800 overflow-hidden">
                            <img
                              src={formSeoOgImage || formCoverImage || COVER_PRESETS[0]}
                              alt="Social preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-2.5 space-y-1">
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {window.location.hostname}
                            </span>
                            <h5 className="font-bold text-xs text-white line-clamp-1">
                              {formSeoMetaTitle || formTitle || 'Servicio de Agencia'}
                            </h5>
                            <p className="text-[11px] text-slate-300 line-clamp-2 leading-tight">
                              {formSeoMetaDescription || formBriefDescription || 'Haz clic para ver la propuesta...'}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <span className="text-[9px] text-slate-400">12:00 PM</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Servicios Relacionados (Multi-selector) */}
                  <div className="pt-4 border-t tenant-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-violet-500">
                          Servicios Relacionados Recomendados
                        </h4>
                        <p className="text-[11px] tenant-muted">
                          Selecciona otros servicios para recomendar al cliente al final de la página pública.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {services
                        .filter((s) => s.id !== editingServiceId)
                        .map((otherSrv) => {
                          const isSelected = formRelatedServiceIds.includes(otherSrv.id);
                          return (
                            <button
                              key={otherSrv.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setFormRelatedServiceIds(
                                    formRelatedServiceIds.filter((id) => id !== otherSrv.id)
                                  );
                                } else {
                                  setFormRelatedServiceIds([...formRelatedServiceIds, otherSrv.id]);
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                                isSelected
                                  ? 'border-violet-500 bg-violet-500/10 font-bold tenant-text'
                                  : 'tenant-border hover:bg-slate-500/5 tenant-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {otherSrv.coverImage && (
                                  <img
                                    src={otherSrv.coverImage}
                                    alt=""
                                    className="w-7 h-7 rounded-lg object-cover shrink-0"
                                  />
                                )}
                                <span className="text-xs truncate">{otherSrv.title}</span>
                              </div>
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-violet-600 border-violet-600 text-white'
                                    : 'tenant-border'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

          </div>

          {/* BARRA INFERIOR STICKY */}
          <div className="sticky bottom-4 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xl">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Código: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formCode}</span> • Moneda: {formCurrency} ({formCurrencySymbol}) • Estado: <span className="font-bold text-indigo-600 dark:text-indigo-400 capitalize">{formStatus}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingServiceId(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
              >
                Descartar cambios
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Guardando...' : editingServiceId ? 'Guardar Cambios' : 'Publicar Servicio'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Modal de Categorías accesible también desde el Editor */}
        <CategoryManagerModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          categories={categories}
          onCategoriesUpdated={loadData}
        />
      </div>
    );
};
