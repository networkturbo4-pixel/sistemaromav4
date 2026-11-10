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
import { RichTextEditor } from '../components/RichTextEditor';
import { PublicServiceDetailView } from '../components/PublicServiceDetailView';
import { navigateToEntity } from '../utils/navigationEvents';
import { ActiveModule } from '../components/AppShell';
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
  ChevronUp,
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
  Wand2,
  Smartphone,
  Monitor,
  FileText,
  Briefcase,
  Zap,
  Award,
  Target,
  Cpu,
  TrendingUp,
  Megaphone,
  PenTool,
} from 'lucide-react';

const COVER_PRESETS = [
  'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
];

const FEATURE_ICON_OPTIONS: {
  name: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { name: 'Compass', label: 'Estrategia', Icon: Compass },
  { name: 'CheckCircle2', label: 'Calidad', Icon: CheckCircle2 },
  { name: 'Sparkles', label: 'Creatividad', Icon: Sparkles },
  { name: 'Palette', label: 'Diseño', Icon: Palette },
  { name: 'Layers', label: 'Sistema', Icon: Layers },
  { name: 'Shield', label: 'Garantía', Icon: Shield },
  { name: 'Zap', label: 'Velocidad', Icon: Zap },
  { name: 'Video', label: 'Audiovisual', Icon: Video },
  { name: 'Globe', label: 'Web / Digital', Icon: Globe },
  { name: 'Package', label: 'Entregable', Icon: Package },
  { name: 'FileCheck', label: 'Manual / Doc', Icon: FileCheck },
  { name: 'Target', label: 'Objetivos', Icon: Target },
  { name: 'TrendingUp', label: 'Crecimiento', Icon: TrendingUp },
  { name: 'Megaphone', label: 'Campañas', Icon: Megaphone },
  { name: 'PenTool', label: 'Vector / Arte', Icon: PenTool },
  { name: 'Award', label: 'Premium', Icon: Award },
];

type EditorTab = 'general' | 'gallery' | 'features' | 'deliverables' | 'extras' | 'seo';

interface ServicesModuleProps {
  onNavigate?: (mod: ActiveModule) => void;
}

export const ServicesModule: React.FC<ServicesModuleProps> = ({ onNavigate }) => {
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
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState(false);
  const [livePreviewDevice, setLivePreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isDirty, setIsDirty] = useState(false);
  const [newPkgFeatureText, setNewPkgFeatureText] = useState<Record<string, string>>({});

  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const ogFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Escuchar navegación dirigida desde Command Palette u otros módulos
  useEffect(() => {
    if (services.length === 0) return;
    const handleTarget = (target: { entityId?: string; id?: string; code?: string; query?: string }) => {
      const targetId = target.entityId || target.id;
      const found = services.find(
        (s) =>
          (targetId && s.id === targetId) ||
          (target.code && s.code?.toLowerCase() === target.code.toLowerCase())
      );
      if (found) {
        handleOpenEditService(found);
      } else if (target.query) {
        setSearchQuery(target.query);
      }
    };

    try {
      const raw = sessionStorage.getItem('roma_open_target');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.module === 'services') {
          sessionStorage.removeItem('roma_open_target');
          handleTarget(parsed);
        }
      }
    } catch {}

    const listener = (e: any) => {
      if (e.detail?.module === 'services') {
        sessionStorage.removeItem('roma_open_target');
        handleTarget(e.detail);
      }
    };
    window.addEventListener('roma:open-target', listener);
    return () => window.removeEventListener('roma:open-target', listener);
  }, [services]);

  // Sincronizar símbolo de moneda según la moneda elegida
  useEffect(() => {
    if (formCurrency === 'USD') setFormCurrencySymbol('$');
    else if (formCurrency === 'EUR') setFormCurrencySymbol('€');
    else setFormCurrencySymbol('S/');
  }, [formCurrency]);

  // Helper para subir imagen al servidor
  const uploadServiceImageFile = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      const token = localStorage.getItem('roma_saas_token') || '';
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/services/upload-image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error subiendo imagen');
      }
      setIsDirty(true);
      return data.url as string;
    } catch (err) {
      toast((err as Error).message || 'No se pudo subir la imagen', 'error');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Subida múltiple para Galería
  const handleGalleryFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const uploadedItems: ServiceGalleryItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = await uploadServiceImageFile(file);
      if (url) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        uploadedItems.push({
          id: `gal-${Date.now()}-${i}`,
          url,
          title: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
          tag: 'Portafolio',
        });
      }
    }
    if (uploadedItems.length > 0) {
      setFormGallery((prev) => [...prev, ...uploadedItems]);
      toast(`${uploadedItems.length} imagen(es) añadida(s) a la galería`, 'success');
    }
  };

  // Reordenar elementos en cualquier lista dinámica
  const moveItem = <T,>(list: T[], index: number, direction: 'up' | 'down'): T[] => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return list;
    const next = [...list];
    const [removed] = next.splice(index, 1);
    next.splice(targetIndex, 0, removed);
    setIsDirty(true);
    return next;
  };

  // Autocompletar todo el servicio con Romita IA / Gemini
  const handleGenerateWithAi = async () => {
    if (!formTitle.trim()) {
      toast('Escribe primero el Título del Servicio para que Romita IA estructure la propuesta', 'warning');
      setActiveTab('general');
      return;
    }

    try {
      setIsGeneratingAi(true);
      const selectedCat = categories.find((c) => c.id === formCategoryId);
      const res = await apiFetch<{ generated: any; source: string }>('/api/services/ai-generate', {
        method: 'POST',
        body: JSON.stringify({
          title: formTitle.trim(),
          categoryName: selectedCat?.name || 'Servicios Creativos',
          basePrice: formBasePrice,
          currencySymbol: formCurrencySymbol,
          pricingType: formPricingType,
          deliveryTime: formDeliveryTime,
        }),
      });

      const gen = res.generated;
      if (!gen) throw new Error('No se recibió respuesta del generador');

      if (gen.briefDescription) setFormBriefDescription(gen.briefDescription);
      if (gen.fullDescription) setFormFullDescription(gen.fullDescription);
      if (gen.deliveryTime) setFormDeliveryTime(gen.deliveryTime);

      if (Array.isArray(gen.features) && gen.features.length > 0) {
        setFormFeatures(
          gen.features.map((f: any, idx: number) => ({
            id: `feat-ai-${Date.now()}-${idx}`,
            title: f.title || `Característica ${idx + 1}`,
            description: f.description || '',
            icon: f.icon || 'CheckCircle2',
          }))
        );
      }

      if (Array.isArray(gen.deliverables) && gen.deliverables.length > 0) {
        setFormDeliverables(
          gen.deliverables.map((d: any, idx: number) => ({
            id: `del-ai-${Date.now()}-${idx}`,
            phase: d.phase || `Fase ${idx + 1}`,
            title: d.title || `Entregable ${idx + 1}`,
            details: d.details || '',
          }))
        );
      }

      if (Array.isArray(gen.packages) && gen.packages.length > 0) {
        setFormPackages(
          gen.packages.map((p: any, idx: number) => ({
            id: `pkg-ai-${Date.now()}-${idx}`,
            name: p.name || `Paquete ${idx + 1}`,
            description: p.description || '',
            price: Number(p.price) || formBasePrice,
            deliveryTime: p.deliveryTime || formDeliveryTime,
            features: Array.isArray(p.features) ? p.features : [],
            isPopular: Boolean(p.isPopular),
            badgeText: p.badgeText || (p.isPopular ? 'MÁS RECOMENDADO' : ''),
          }))
        );
      }

      if (Array.isArray(gen.requirements) && gen.requirements.length > 0) {
        setFormRequirements(
          gen.requirements.map((r: any, idx: number) => ({
            id: `req-ai-${Date.now()}-${idx}`,
            title: r.title || 'Requisito',
            description: r.description || '',
          }))
        );
      }

      if (Array.isArray(gen.faqs) && gen.faqs.length > 0) {
        setFormFaqs(
          gen.faqs.map((q: any, idx: number) => ({
            id: `faq-ai-${Date.now()}-${idx}`,
            question: q.question || '',
            answer: q.answer || '',
          }))
        );
      }

      if (Array.isArray(gen.extras) && gen.extras.length > 0) {
        setFormExtras(
          gen.extras.map((x: any, idx: number) => ({
            id: `ext-ai-${Date.now()}-${idx}`,
            title: x.title || 'Extra',
            description: x.description || '',
            price: Number(x.price) || 250,
            volumeDiscountText: x.volumeDiscountText || '',
          }))
        );
      }

      if (gen.seo) {
        if (gen.seo.metaTitle) setFormSeoMetaTitle(gen.seo.metaTitle);
        if (gen.seo.metaDescription) setFormSeoMetaDescription(gen.seo.metaDescription);
      }
      if (!formSeoSlug.trim()) {
        const slug = formTitle
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        setFormSeoSlug(slug);
      }

      setIsDirty(true);
      toast('¡Estructura completa generada con Romita IA! Revisa las pestañas.', 'success');
    } catch (err) {
      toast((err as Error).message || 'Error generando estructura con IA', 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Cerrar editor con confirmación si hay cambios sin guardar
  const handleCloseEditor = async () => {
    if (isDirty) {
      const ok = await confirmAction({
        title: '¿Descartar cambios sin guardar?',
        message: 'Tienes modificaciones en este servicio que aún no han sido guardadas.',
        confirmText: 'Sí, descartar cambios',
        cancelText: 'Seguir editando',
        danger: true,
      });
      if (!ok) return;
    }
    setIsEditorOpen(false);
    setEditingServiceId(null);
    setIsDirty(false);
  };

  // Clonar / Duplicar servicio existente
  const handleDuplicateService = async (service: Service) => {
    try {
      const nextCount = services.length + 1;
      const autoCode = `SRV-${String(nextCount).padStart(3, '0')}`;
      const baseSlug = service.seo?.slug || service.id;
      const clonedPayload: Partial<Service> = {
        ...service,
        id: undefined,
        code: autoCode,
        title: `${service.title} (Copia)`,
        status: 'draft',
        seo: {
          slug: `${baseSlug}-copia-${Date.now().toString().slice(-3)}`,
          metaTitle: `${service.title} (Copia) | ${tenant.name}`,
          metaDescription: service.seo?.metaDescription || service.briefDescription || '',
          ogImageUrl: service.seo?.ogImageUrl || service.coverImage || '',
        },
      };
      await apiFetch('/api/services', {
        method: 'POST',
        body: JSON.stringify(clonedPayload),
      });
      toast(`Servicio duplicado como borrador (${autoCode})`, 'success');
      loadData();
    } catch (err) {
      toast((err as Error).message || 'Error duplicando servicio', 'error');
    }
  };

  // Puente directo: Crear Cotización a partir de un servicio
  const handleCreateQuoteFromService = (service: Service) => {
    if (!onNavigate) {
      toast('Navegación no disponible en este contexto', 'warning');
      return;
    }
    navigateToEntity(
      {
        module: 'quotes',
        entityType: 'quote',
        entityId: service.id,
        action: 'create_from_service',
        serviceData: service,
      },
      onNavigate
    );
  };

  // Puente directo: Crear Orden de Servicio (OS) a partir de un servicio
  const handleCreateOrderFromService = (service: Service) => {
    if (!onNavigate) {
      toast('Navegación no disponible en este contexto', 'warning');
      return;
    }
    navigateToEntity(
      {
        module: 'service_orders',
        entityType: 'service_order',
        entityId: service.id,
        action: 'create_from_service',
        serviceData: service,
      },
      onNavigate
    );
  };

  // Objeto Service en tiempo real para Vista Previa y Puentes Comerciales desde el editor
  const livePreviewServiceObject = useMemo<Service>(() => {
    const parsedVideo = parseVideoUrl(formVideoUrl);
    const cat = categories.find((c) => c.id === formCategoryId);
    const finalSlug =
      formSeoSlug.trim() ||
      formTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
      'vista-previa';
    return {
      id: editingServiceId || 'preview-service',
      tenantId: tenant.id,
      code: formCode || 'SRV-001',
      title: formTitle || 'Título del Servicio (Vista Previa)',
      categoryId: formCategoryId,
      categoryName: cat?.name || 'Servicio Profesional',
      coverImage: formCoverImage || COVER_PRESETS[0],
      status: formStatus,
      icon: formIcon,
      pricingType: formPricingType,
      currency: formCurrency,
      currencySymbol: formCurrencySymbol,
      visibility: formVisibility,
      basePrice: Number(formBasePrice) || 0,
      annualDiscount: Number(formAnnualDiscount) || 0,
      deliveryTime: formDeliveryTime,
      inventory: formInventoryUnlimited ? null : Number(formInventory) || null,
      inventoryUnlimited: formInventoryUnlimited,
      urgency: {
        enabled: formUrgencyEnabled,
        endDate: formUrgencyEndDate,
        badgeText: formUrgencyBadgeText,
      },
      video: {
        enabled: formVideoEnabled && parsedVideo.isValid,
        url: formVideoUrl,
        platform: parsedVideo.platform,
      },
      briefDescription:
        formBriefDescription ||
        'Resumen ejecutivo del servicio que se mostrará tanto en las tarjetas del catálogo como en la cabecera de la página.',
      fullDescription: formFullDescription,
      packages: formPackages,
      gallery: formGallery,
      features: formFeatures,
      deliverables: formDeliverables,
      requirements: formRequirements,
      faqs: formFaqs,
      extras: formExtras,
      seo: {
        slug: finalSlug,
        metaTitle: formSeoMetaTitle || `${formTitle || 'Servicio'} | ${tenant.name}`,
        metaDescription: formSeoMetaDescription || formBriefDescription,
        ogImageUrl: formSeoOgImage || formCoverImage || COVER_PRESETS[0],
      },
      relatedServiceIds: formRelatedServiceIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [
    editingServiceId,
    tenant,
    categories,
    formCode,
    formTitle,
    formCategoryId,
    formCoverImage,
    formStatus,
    formIcon,
    formPricingType,
    formCurrency,
    formCurrencySymbol,
    formVisibility,
    formBasePrice,
    formAnnualDiscount,
    formDeliveryTime,
    formInventoryUnlimited,
    formInventory,
    formUrgencyEnabled,
    formUrgencyEndDate,
    formUrgencyBadgeText,
    formVideoEnabled,
    formVideoUrl,
    formBriefDescription,
    formFullDescription,
    formPackages,
    formGallery,
    formFeatures,
    formDeliverables,
    formRequirements,
    formFaqs,
    formExtras,
    formSeoSlug,
    formSeoMetaTitle,
    formSeoMetaDescription,
    formSeoOgImage,
    formRelatedServiceIds,
  ]);

  // Puntaje de completitud del servicio (0 - 100%)
  const completenessInfo = useMemo(() => {
    const checks = [
      { label: 'Título del servicio', ok: Boolean(formTitle.trim()), tab: 'general' as EditorTab },
      { label: 'Descripción breve', ok: Boolean(formBriefDescription.trim()), tab: 'general' as EditorTab },
      { label: 'Pitch detallado', ok: Boolean(formFullDescription.replace(/<[^>]*>/g, '').trim()), tab: 'general' as EditorTab },
      { label: 'Galería (mín. 1 foto)', ok: formGallery.length > 0, tab: 'gallery' as EditorTab },
      { label: 'Qué incluye (mín. 2 cards)', ok: formFeatures.length >= 2, tab: 'features' as EditorTab },
      { label: 'Entregables por fase', ok: formDeliverables.length > 0, tab: 'deliverables' as EditorTab },
      { label: 'Requisitos y FAQs', ok: formRequirements.length > 0 && formFaqs.length > 0, tab: 'extras' as EditorTab },
      { label: 'Slug SEO', ok: Boolean(formSeoSlug.trim() || formTitle.trim()), tab: 'seo' as EditorTab },
    ];
    const done = checks.filter((c) => c.ok).length;
    const score = Math.round((done / checks.length) * 100);
    const missing = checks.filter((c) => !c.ok);
    return { score, checks, missing };
  }, [
    formTitle,
    formBriefDescription,
    formFullDescription,
    formGallery.length,
    formFeatures.length,
    formDeliverables.length,
    formRequirements.length,
    formFaqs.length,
    formSeoSlug,
  ]);

  // Manejo de abrir nuevo servicio
  const handleOpenCreateService = () => {
    setEditingServiceId(null);
    setActiveTab('general');
    setIsDirty(false);

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
    setIsDirty(false);

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
    setIsDirty(true);
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

  // Guardar servicio (con opción de forzar estado Borrador o Activo)
  const handleSaveService = async (e?: React.FormEvent, forcedStatus?: ServiceStatus) => {
    if (e) e.preventDefault();
    const targetStatus = forcedStatus || formStatus;

    if (!formTitle.trim()) {
      toast('El título del servicio es obligatorio en la Pestaña 1', 'warning');
      setActiveTab('general');
      return;
    }

    if (targetStatus === 'active' && !formBriefDescription.trim()) {
      toast('Agrega una Descripción Breve (Pestaña 1) antes de publicar el servicio', 'warning');
      setActiveTab('general');
      return;
    }

    if (formPricingType === 'packages' && formPackages.length === 0) {
      toast('Has elegido "Múltiples Paquetes", añade al menos 1 paquete en Modelo de Precios', 'warning');
      setActiveTab('general');
      return;
    }

    try {
      setIsSaving(true);
      const parsedVideo = parseVideoUrl(formVideoUrl);
      const selectedCat = categories.find((c) => c.id === formCategoryId);

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
        code: formCode.trim() || `SRV-${String(services.length + 1).padStart(3, '0')}`,
        title: formTitle.trim(),
        categoryId: formCategoryId,
        categoryName: selectedCat?.name || '',
        coverImage: formCoverImage.trim() || COVER_PRESETS[0],
        status: targetStatus,
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
          ogImageUrl: formSeoOgImage.trim() || formCoverImage.trim() || COVER_PRESETS[0],
        },
        relatedServiceIds: formRelatedServiceIds,
      };

      if (editingServiceId) {
        await apiFetch(`/api/services/${editingServiceId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast(
          targetStatus === 'draft'
            ? 'Servicio guardado como borrador'
            : 'Servicio actualizado con éxito',
          'success'
        );
      } else {
        await apiFetch('/api/services', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast(
          targetStatus === 'draft'
            ? 'Borrador de servicio guardado'
            : 'Nuevo servicio publicado con éxito',
          'success'
        );
      }

      setIsDirty(false);
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div
              key={i}
              className="h-80 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-500/5 animate-pulse"
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {filteredServices.map((service) => {
            const category = categories.find((c) => c.id === service.categoryId);
            const badgeColor = category?.badgeColor || '#6366f1';
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
                className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between hover:border-indigo-500/40 relative hover:-translate-y-0.5"
              >
                <div>
                  {/* Portada con Badges */}
                  <div className="relative h-44 sm:h-48 w-full bg-slate-950 overflow-hidden">
                    {service.coverImage ? (
                      <img
                        src={service.coverImage}
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center">
                        <Sparkles className="w-9 h-9 opacity-40 text-indigo-400 mb-1" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Sin Portada
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                    {/* Código en la portada */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[9px] font-bold bg-black/60 text-white border border-white/10 backdrop-blur-md shadow-xs">
                        {service.code}
                      </span>
                    </div>

                    {/* Badge de Estado & Visibilidad */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${
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
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/70 text-slate-200 border border-white/20 backdrop-blur-md">
                          Privado
                        </span>
                      )}
                    </div>

                    {/* Banner de Urgencia si aplica */}
                    {service.urgency?.enabled && (
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="px-2 py-0.5 rounded-lg bg-amber-500/90 text-white text-[9px] font-bold flex items-center gap-1 shadow-md backdrop-blur-xs">
                          <Flame className="w-3 h-3 shrink-0" />
                          <span className="truncate">{service.urgency.badgeText || '¡Oferta Especial!'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo de la Card (Estilo Imagen 2) */}
                  <div className="p-4 sm:p-5 space-y-2.5">
                    {/* Badge de Categoría & Tipo de Cobro */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-2xs flex items-center gap-1"
                        style={{
                          backgroundColor: `${badgeColor}15`,
                          color: badgeColor,
                        }}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[130px]">{service.categoryName || 'General'}</span>
                      </span>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
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
                    <h3
                      className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 min-h-[2.5rem]"
                      title={service.title}
                    >
                      {service.title}
                    </h3>

                    {/* Breve descripción mostrando sólo 3 líneas */}
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3 min-h-[3.25rem]">
                      {service.briefDescription ||
                        'Servicio profesional diseñado a medida para elevar los resultados de tu empresa.'}
                    </p>

                    {/* Inversión & Descuento estilo Imagen 2 */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 block">
                          PRECIO
                        </span>
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                          {priceLabel}
                        </span>
                      </div>

                      {service.annualDiscount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                          -{service.annualDiscount}% Anual
                        </span>
                      )}
                    </div>

                    {/* Métricas de Conversión y Puentes Comerciales */}
                    <div className="pt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100/80 dark:border-slate-800/80">
                      <div className="flex items-center gap-2.5 font-mono">
                        <span className="inline-flex items-center gap-1" title="Vistas al enlace público">
                          <Eye className="w-3 h-3 text-indigo-500" />
                          {service.viewsCount || 0}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Clics a WhatsApp">
                          <MessageCircle className="w-3 h-3 text-emerald-500" />
                          {service.whatsappClicksCount || 0}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Cotizaciones generadas">
                          <FileText className="w-3 h-3 text-violet-500" />
                          {service.quotesCount || 0}
                        </span>
                      </div>

                      {onNavigate && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCreateQuoteFromService(service)}
                            className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white transition cursor-pointer"
                            title="Crear Cotización con las fases y precios de este servicio"
                          >
                            + Cotizar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateOrderFromService(service)}
                            className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                            title="Crear Orden de Servicio con entregables y requisitos"
                          >
                            + OS
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer de Botones de Acción Administrativos */}
                <div className="p-2 sm:p-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 grid grid-cols-5 gap-1">
                  {/* Copiar enlace */}
                  <button
                    type="button"
                    onClick={() => handleCopyLink(service)}
                    className="p-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex flex-col items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
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
                    className="p-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex flex-col items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                    title="Compartir por WhatsApp o redes"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="text-[9px]">Compartir</span>
                  </button>

                  {/* Duplicar */}
                  {can('services.create') ? (
                    <button
                      type="button"
                      onClick={() => handleDuplicateService(service)}
                      className="p-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 flex flex-col items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                      title="Clonar / Duplicar servicio"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span className="text-[9px]">Clonar</span>
                    </button>
                  ) : <div />}

                  {/* Editar */}
                  {can('services.edit') ? (
                    <button
                      type="button"
                      onClick={() => handleOpenEditService(service)}
                      className="p-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer shadow-xs"
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
                      className="p-1.5 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex flex-col items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
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
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          type="button"
          onClick={handleCloseEditor}
          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 shadow-xs transition cursor-pointer shrink-0"
          title="Volver al catálogo de servicios"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{editingServiceId ? 'Edición de Servicio' : 'Nuevo Servicio de la Agencia'}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                completenessInfo.score === 100
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
              title={
                completenessInfo.missing.length > 0
                  ? `Falta completar: ${completenessInfo.missing.map((m) => m.label).join(', ')}`
                  : 'Todos los bloques recomendados están completos'
              }
            >
              {completenessInfo.score}% completo
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 max-w-xl truncate">
            {formTitle || (editingServiceId ? 'Servicio sin título' : 'Crear Nuevo Servicio')}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Botón Autocompletar con Romita IA */}
        <button
          type="button"
          onClick={handleGenerateWithAi}
          disabled={isGeneratingAi}
          className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-violet-700 dark:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          title="Generar pitch comercial, qué incluye, entregables por fase, paquetes, FAQs y SEO automáticamente"
        >
          <Wand2 className={`w-4 h-4 text-violet-600 dark:text-violet-400 ${isGeneratingAi ? 'animate-spin' : ''}`} />
          <span>{isGeneratingAi ? 'Generando con IA...' : 'Autocompletar con IA'}</span>
        </button>

        {/* Botón Vista Previa en Vivo (Funciona sin necesidad de guardar antes) */}
        <button
          type="button"
          onClick={() => setIsLivePreviewOpen(true)}
          className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          title="Ver cómo se verá el servicio en vivo en computadora y celular"
        >
          <Eye className="w-4 h-4 text-indigo-500" />
          <span>Vista Previa en Vivo</span>
        </button>

        {editingServiceId && (
          <a
            href={`/p/servicio/${formSeoSlug || editingServiceId}?tenant=${tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs flex items-center justify-center transition cursor-pointer"
            title="Abrir enlace público publicado en nueva pestaña"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
          </a>
        )}

        <button
          type="button"
          onClick={handleCloseEditor}
          className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition cursor-pointer"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={() => handleSaveService(undefined, 'draft')}
          disabled={isSaving}
          className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer disabled:opacity-50"
          title="Guardar avance como borrador sin hacerlo visible aún"
        >
          Guardar Borrador
        </button>

        <button
          type="button"
          onClick={() => handleSaveService(undefined, editingServiceId ? formStatus : 'active')}
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
        {
          id: 'extras',
          label: '5. Requisitos, FAQs & Extras',
          icon: HelpCircle,
          count: formRequirements.length + formFaqs.length + formExtras.length,
        },
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
    <form onSubmit={(e) => handleSaveService(e)} className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
              {/* ============================================================== */}
              {/* PESTAÑA 1: PORTADA & DATOS GENERALES */}
              {/* ============================================================== */}
              {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Fila 1: Portada del Servicio con subida directa, drag & drop, presets y preview */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-extrabold uppercase tracking-wider tenant-muted">
                        Portada del Servicio (Imagen Principal) *
                      </label>
                      <input
                        ref={coverFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = await uploadServiceImageFile(file);
                            if (url) {
                              setFormCoverImage(url);
                              if (!formSeoOgImage || COVER_PRESETS.includes(formSeoOgImage)) {
                                setFormSeoOgImage(url);
                              }
                              toast('Portada subida con éxito', 'success');
                            }
                          }
                          e.target.value = '';
                        }}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Preview Box con Drag & Drop */}
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith('image/')) {
                            const url = await uploadServiceImageFile(file);
                            if (url) {
                              setFormCoverImage(url);
                              toast('Portada actualizada', 'success');
                            }
                          }
                        }}
                        onClick={() => coverFileInputRef.current?.click()}
                        className="relative w-full sm:w-64 h-36 rounded-2xl overflow-hidden border tenant-border bg-slate-900 shrink-0 group cursor-pointer"
                        title="Haz clic o arrastra una imagen aquí para cambiar la portada"
                      >
                        {formCoverImage ? (
                          <img
                            src={formCoverImage}
                            alt="Portada"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/50">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1">
                          <Upload className="w-5 h-5" />
                          <span>{isUploadingImage ? 'Subiendo...' : 'Subir o arrastrar foto'}</span>
                        </div>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[9px] font-bold text-white">
                          Vista previa
                        </span>
                      </div>

                      {/* Inputs de URL, Botón Subir desde PC & Presets */}
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={formCoverImage}
                            onChange={(e) => {
                              setFormCoverImage(e.target.value);
                              setIsDirty(true);
                            }}
                            placeholder="Pega la URL de la imagen de portada o sube un archivo desde tu PC..."
                            className="flex-1 px-3.5 py-2.5 rounded-2xl text-xs border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                          />
                          <button
                            type="button"
                            onClick={() => coverFileInputRef.current?.click()}
                            disabled={isUploadingImage}
                            className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isUploadingImage ? 'Subiendo...' : 'Subir desde PC'}</span>
                          </button>
                        </div>

                        {/* Presets rápidos (todos verificados y funcionales) */}
                        <div>
                          <span className="text-[11px] font-bold tenant-muted block mb-1.5">
                            O selecciona una fotografía sugerida:
                          </span>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {COVER_PRESETS.map((p, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setFormCoverImage(p);
                                  setIsDirty(true);
                                }}
                                className={`w-12 h-10 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                                  formCoverImage === p ? 'border-violet-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                                }`}
                              >
                                <img src={p} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Título (con botón rápido IA), Código Identificador */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-extrabold tenant-muted">
                          Título del Servicio *
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateWithAi}
                          disabled={isGeneratingAi}
                          className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Wand2 className="w-3 h-3" />
                          <span>{isGeneratingAi ? 'Redactando estructura...' : 'Autocompletar pestañas con IA'}</span>
                        </button>
                      </div>
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
                        onChange={(e) => {
                          setFormCode(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="SRV-001"
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono font-bold border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  {/* Fila 3: Categoría (con botón + Nueva/Gestionar), Estado y Visibilidad */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-extrabold tenant-muted">
                          Categoría del Servicio *
                        </label>
                        {can('services.categories.manage') && (
                          <button
                            type="button"
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <FolderPlus className="w-3 h-3" />
                            <span>+ Gestionar</span>
                          </button>
                        )}
                      </div>
                      <select
                        value={formCategoryId}
                        onChange={(e) => {
                          setFormCategoryId(e.target.value);
                          setIsDirty(true);
                        }}
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

                    {/* Si seleccionó Múltiples Paquetes, mostrar editor mejorado de tiers aquí */}
                    {formPricingType === 'packages' && (
                      <div className="pt-3 border-t tenant-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold tenant-text">
                            Paquetes / Planes Comparativos ({formPackages.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormPackages([
                                ...formPackages,
                                {
                                  id: `pkg-${Date.now()}`,
                                  name: `Paquete ${formPackages.length + 1}`,
                                  description: 'Descripción del alcance de este plan',
                                  price: formBasePrice,
                                  deliveryTime: '7 días hábiles',
                                  features: ['Diagnóstico inicial', 'Entregables editables'],
                                  isPopular: false,
                                },
                              ]);
                              setIsDirty(true);
                            }}
                            className="text-xs font-bold text-violet-500 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Añadir Paquete
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {formPackages.map((pkg, pIdx) => (
                            <div
                              key={pkg.id}
                              className={`p-4 rounded-2xl border space-y-3 relative transition ${
                                pkg.isPopular
                                  ? 'border-violet-500/60 bg-violet-500/5'
                                  : 'tenant-border bg-slate-500/5'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={pkg.name}
                                  onChange={(e) => {
                                    const next = [...formPackages];
                                    next[pIdx].name = e.target.value;
                                    setFormPackages(next);
                                    setIsDirty(true);
                                  }}
                                  placeholder="Nombre del paquete (ej. Pro)"
                                  className="text-xs font-extrabold border-b tenant-border bg-transparent tenant-text focus:outline-none flex-1"
                                />
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={pIdx === 0}
                                    onClick={() => setFormPackages(moveItem(formPackages, pIdx, 'up'))}
                                    className="p-1 rounded-lg tenant-muted hover:tenant-text disabled:opacity-30 cursor-pointer"
                                    title="Mover paquete a la izquierda"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={pIdx === formPackages.length - 1}
                                    onClick={() => setFormPackages(moveItem(formPackages, pIdx, 'down'))}
                                    className="p-1 rounded-lg tenant-muted hover:tenant-text disabled:opacity-30 cursor-pointer"
                                    title="Mover paquete a la derecha"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormPackages(formPackages.filter((_, i) => i !== pIdx));
                                      setIsDirty(true);
                                    }}
                                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                    title="Eliminar paquete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="text-[10px] tenant-muted font-bold block mb-0.5">
                                  Subtítulo / Resumen del Plan
                                </label>
                                <input
                                  type="text"
                                  value={pkg.description || ''}
                                  onChange={(e) => {
                                    const next = [...formPackages];
                                    next[pIdx].description = e.target.value;
                                    setFormPackages(next);
                                    setIsDirty(true);
                                  }}
                                  placeholder="Ej. Ideal para marcas en expansión"
                                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border tenant-border bg-transparent tenant-text"
                                />
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
                                      setIsDirty(true);
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
                                      setIsDirty(true);
                                    }}
                                    className="w-full px-2 py-1 rounded-lg text-xs border tenant-border bg-transparent tenant-text"
                                  />
                                </div>
                              </div>

                              {/* Lista interactiva de características del paquete */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] tenant-muted font-bold block">
                                  Beneficios incluidos ({pkg.features.length})
                                </label>
                                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                  {pkg.features.map((featText, fIdx) => (
                                    <div key={fIdx} className="flex items-center gap-1.5">
                                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                      <input
                                        type="text"
                                        value={featText}
                                        onChange={(e) => {
                                          const next = [...formPackages];
                                          const copyFeats = [...next[pIdx].features];
                                          copyFeats[fIdx] = e.target.value;
                                          next[pIdx].features = copyFeats;
                                          setFormPackages(next);
                                          setIsDirty(true);
                                        }}
                                        className="flex-1 text-[11px] px-2 py-0.5 rounded border tenant-border bg-transparent tenant-text focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = [...formPackages];
                                          next[pIdx].features = next[pIdx].features.filter((_, i) => i !== fIdx);
                                          setFormPackages(next);
                                          setIsDirty(true);
                                        }}
                                        className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                                        title="Quitar ítem"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-1.5 pt-1">
                                  <input
                                    type="text"
                                    value={newPkgFeatureText[pkg.id] || ''}
                                    onChange={(e) =>
                                      setNewPkgFeatureText((prev) => ({ ...prev, [pkg.id]: e.target.value }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = (newPkgFeatureText[pkg.id] || '').trim();
                                        if (!val) return;
                                        const next = [...formPackages];
                                        next[pIdx].features = [...next[pIdx].features, val];
                                        setFormPackages(next);
                                        setNewPkgFeatureText((prev) => ({ ...prev, [pkg.id]: '' }));
                                        setIsDirty(true);
                                      }
                                    }}
                                    placeholder="Añadir ítem y pulsar Enter..."
                                    className="flex-1 px-2 py-1 rounded-lg text-[11px] border tenant-border bg-transparent tenant-text focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const val = (newPkgFeatureText[pkg.id] || '').trim();
                                      if (!val) return;
                                      const next = [...formPackages];
                                      next[pIdx].features = [...next[pIdx].features, val];
                                      setFormPackages(next);
                                      setNewPkgFeatureText((prev) => ({ ...prev, [pkg.id]: '' }));
                                      setIsDirty(true);
                                    }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-violet-600 text-white cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div className="pt-1 border-t tenant-border flex items-center justify-between gap-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs tenant-text font-bold">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(pkg.isPopular)}
                                    onChange={(e) => {
                                      const next = [...formPackages];
                                      next[pIdx].isPopular = e.target.checked;
                                      if (e.target.checked && !next[pIdx].badgeText) {
                                        next[pIdx].badgeText = 'MÁS ELEGIDO';
                                      }
                                      setFormPackages(next);
                                      setIsDirty(true);
                                    }}
                                    className="rounded text-violet-600 focus:ring-violet-500"
                                  />
                                  <span>Destacar plan</span>
                                </label>
                                {pkg.isPopular && (
                                  <input
                                    type="text"
                                    value={pkg.badgeText || ''}
                                    onChange={(e) => {
                                      const next = [...formPackages];
                                      next[pIdx].badgeText = e.target.value;
                                      setFormPackages(next);
                                      setIsDirty(true);
                                    }}
                                    placeholder="MÁS RECOMENDADO"
                                    className="w-32 px-2 py-0.5 rounded text-[10px] font-bold border border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-300"
                                  />
                                )}
                              </div>
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
                          onChange={(e) => {
                            setFormDeliveryTime(e.target.value);
                            setIsDirty(true);
                          }}
                          placeholder="ej. 3 a 5 días hábiles"
                          className="w-full px-3 py-2 rounded-xl text-xs font-semibold border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-xs font-bold tenant-text mb-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formInventoryUnlimited}
                            onChange={(e) => {
                              setFormInventoryUnlimited(e.target.checked);
                              setIsDirty(true);
                            }}
                            className="rounded text-violet-600"
                          />
                          <span>Cupos Ilimitados</span>
                        </label>
                        {!formInventoryUnlimited && (
                          <input
                            type="number"
                            min="1"
                            value={formInventory}
                            onChange={(e) => {
                              setFormInventory(e.target.value === '' ? '' : Number(e.target.value));
                              setIsDirty(true);
                            }}
                            placeholder="Ej. 5 cupos disponibles por mes"
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold border tenant-border bg-transparent tenant-text mt-1"
                          />
                        )}
                      </div>
                    </div>

                    {/* Contador de Fecha de Urgencia */}
                    <div className="p-4 rounded-3xl border tenant-border bg-slate-500/5 space-y-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                          <Flame className="w-4 h-4" />
                          Contador de Urgencia / Oferta
                        </h4>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formUrgencyEnabled}
                            onChange={(e) => {
                              setFormUrgencyEnabled(e.target.checked);
                              setIsDirty(true);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500" />
                        </label>
                      </div>

                      {formUrgencyEnabled ? (
                        <div className="space-y-2.5 animate-in fade-in duration-200">
                          <div>
                            <label className="block text-xs font-bold tenant-muted mb-1">
                              Fecha Fin de la Oferta *
                            </label>
                            <input
                              type="date"
                              value={formUrgencyEndDate.split('T')[0]}
                              onChange={(e) => {
                                setFormUrgencyEndDate(e.target.value);
                                setIsDirty(true);
                              }}
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
                              onChange={(e) => {
                                setFormUrgencyBadgeText(e.target.value);
                                setIsDirty(true);
                              }}
                              placeholder="¡Oferta exclusiva hasta agotar stock!"
                              className="w-full px-3 py-2 rounded-xl text-xs border tenant-border bg-transparent tenant-text focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-xs tenant-muted flex items-center justify-between gap-3">
                          <p className="leading-relaxed">
                            Activa una cuenta regresiva en vivo en la página pública para acelerar el cierre comercial de campañas o promociones.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setFormUrgencyEnabled(true);
                              setIsDirty(true);
                            }}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 shrink-0 cursor-pointer"
                          >
                            Activar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fila 6: Video de Presentación (Soporta YouTube, Vimeo, Google Drive, Loom, Video directo) */}
                  <div className="p-4 rounded-3xl border tenant-border bg-slate-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-violet-500" />
                        <div>
                          <span className="font-extrabold text-xs uppercase tracking-wider tenant-text block">
                            Video de Presentación del Servicio
                          </span>
                          {!formVideoEnabled && (
                            <span className="text-[11px] tenant-muted">
                              Opcional: incrusta un reel o video explicativo de YouTube, Vimeo, Loom o Google Drive en la cabecera.
                            </span>
                          )}
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formVideoEnabled}
                          onChange={(e) => {
                            setFormVideoEnabled(e.target.checked);
                            setIsDirty(true);
                          }}
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
                          onChange={(e) => {
                            setFormVideoUrl(e.target.value);
                            setIsDirty(true);
                          }}
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

                  {/* Fila 7: Descripción Breve (3 Líneas) y Pitch Comercial con Editor Enriquecido */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-extrabold tenant-muted">
                          Descripción Breve del Servicio (Se muestra en las tarjetas de catálogo) *
                        </label>
                        <span
                          className={`text-[11px] font-mono ${
                            formBriefDescription.length > 220 ? 'text-amber-500' : 'tenant-muted'
                          }`}
                        >
                          {formBriefDescription.length} / 220 caracteres recomendados
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={formBriefDescription}
                        onChange={(e) => {
                          setFormBriefDescription(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Resume en 2 o 3 líneas atractivas el impacto y objetivo principal de este servicio..."
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-extrabold tenant-muted">
                          Descripción Detallada / Pitch Comercial (Soporta formato enriquecido y tablas)
                        </label>
                        <span className="text-[10px] tenant-muted">
                          Se muestra en la sección ejecutiva de la página pública
                        </span>
                      </div>
                      <RichTextEditor
                        value={formFullDescription}
                        onChange={(val) => {
                          setFormFullDescription(val);
                          setIsDirty(true);
                        }}
                        placeholder="Explica a fondo la propuesta de valor, metodología de trabajo, experiencia, tablas comparativas y beneficios..."
                        minHeight="160px"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* PESTAÑA 2: GALERÍA & PORTAFOLIO */}
              {/* ============================================================== */}
              {activeTab === 'gallery' && (
                <div
                  className="space-y-6 animate-in fade-in duration-200"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleGalleryFilesUpload(e.dataTransfer.files);
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b tenant-border">
                    <div>
                      <h3 className="font-extrabold text-sm tenant-text">
                        Galería de Trabajos & Portafolio del Servicio
                      </h3>
                      <p className="text-xs tenant-muted">
                        Sube o arrastra fotografías de proyectos reales desde tu PC o pega URLs para mostrar la calidad de la agencia.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        ref={galleryFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          handleGalleryFilesUpload(e.target.files);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => galleryFileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingImage ? 'Subiendo...' : 'Subir fotos desde PC'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormGallery([
                            ...formGallery,
                            {
                              id: `gal-${Date.now()}`,
                              url: COVER_PRESETS[formGallery.length % COVER_PRESETS.length],
                              title: `Fotografía de Proyecto ${formGallery.length + 1}`,
                              tag: 'Diseño',
                            },
                          ]);
                          setIsDirty(true);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white tenant-btn-primary flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Añadir por URL
                      </button>
                    </div>
                  </div>

                  {/* Grid de Imágenes de la Galería */}
                  {formGallery.length === 0 ? (
                    <div
                      onClick={() => galleryFileInputRef.current?.click()}
                      className="p-10 text-center rounded-2xl border border-dashed tenant-border hover:border-indigo-500/50 transition cursor-pointer"
                    >
                      <Upload className="w-10 h-10 mx-auto text-indigo-400 mb-2 opacity-70" />
                      <p className="text-xs font-bold tenant-text">
                        Haz clic aquí o arrastra imágenes para poblar el portafolio
                      </p>
                      <p className="text-[11px] tenant-muted mt-0.5">
                        Agrega al menos 2 o 3 imágenes para que el cliente pueda explorar tu trabajo en el visualizador interactivo.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {formGallery.map((item, idx) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border tenant-border bg-slate-500/5 overflow-hidden flex flex-col justify-between group"
                        >
                          <div className="relative h-40 bg-slate-900 overflow-hidden">
                            <img
                              src={item.url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono font-bold">
                              #{idx + 1}
                            </div>
                            <div className="absolute top-2 right-2 flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => setFormGallery(moveItem(formGallery, idx, 'up'))}
                                className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 disabled:opacity-30 transition cursor-pointer"
                                title="Mover antes"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === formGallery.length - 1}
                                onClick={() => setFormGallery(moveItem(formGallery, idx, 'down'))}
                                className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 disabled:opacity-30 transition cursor-pointer"
                                title="Mover después"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormGallery(formGallery.filter((_, i) => i !== idx));
                                  setIsDirty(true);
                                }}
                                className="p-1.5 rounded-lg bg-black/60 text-rose-400 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                                title="Eliminar fotografía"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="p-3 space-y-2">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const next = [...formGallery];
                                next[idx].title = e.target.value;
                                setFormGallery(next);
                                setIsDirty(true);
                              }}
                              placeholder="Título / Pie de foto"
                              className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border tenant-border bg-transparent tenant-text focus:outline-none"
                            />

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item.tag}
                                onChange={(e) => {
                                  const next = [...formGallery];
                                  next[idx].tag = e.target.value;
                                  setFormGallery(next);
                                  setIsDirty(true);
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
                                  setIsDirty(true);
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
              {/* PESTAÑA 3: CONTENIDOS / QUÉ INCLUYE (CON SELECTOR DE ÍCONOS Y ORDEN) */}
              {/* ============================================================== */}
              {activeTab === 'features' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b tenant-border">
                    <div>
                      <h3 className="font-extrabold text-sm tenant-text">
                        Contenidos & Qué es lo que Incluye el Servicio
                      </h3>
                      <p className="text-xs tenant-muted">
                        Muestra con tarjetas visuales e íconos personalizados cada una de las características incluidas.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFormFeatures([
                          ...formFeatures,
                          {
                            id: `feat-${Date.now()}`,
                            title: `Característica ${formFeatures.length + 1}`,
                            description: 'Detalle claro de este beneficio o aspecto incluido.',
                            icon: FEATURE_ICON_OPTIONS[formFeatures.length % FEATURE_ICON_OPTIONS.length].name,
                          },
                        ]);
                        setIsDirty(true);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white tenant-btn-primary flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Añadir Característica
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {formFeatures.map((item, idx) => {
                      const activeIconOption =
                        FEATURE_ICON_OPTIONS.find((o) => o.name === item.icon) || FEATURE_ICON_OPTIONS[1];
                      const ActiveCardIcon = activeIconOption.Icon;

                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl border tenant-border bg-slate-500/5 space-y-3 relative group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <ActiveCardIcon className="w-4 h-4" />
                              </div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-500">
                                Card #{idx + 1}
                              </span>
                            </div>

                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => setFormFeatures(moveItem(formFeatures, idx, 'up'))}
                                className="p-1 rounded-lg tenant-muted hover:tenant-text disabled:opacity-30 cursor-pointer"
                                title="Subir"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === formFeatures.length - 1}
                                onClick={() => setFormFeatures(moveItem(formFeatures, idx, 'down'))}
                                className="p-1 rounded-lg tenant-muted hover:tenant-text disabled:opacity-30 cursor-pointer"
                                title="Bajar"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormFeatures(formFeatures.filter((_, i) => i !== idx));
                                  setIsDirty(true);
                                }}
                                className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Selector visual rápido de ícono */}
                          <div>
                            <label className="block text-[10px] font-bold tenant-muted mb-1">
                              Ícono de la Tarjeta
                            </label>
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                              {FEATURE_ICON_OPTIONS.map((opt) => {
                                const OptIcon = opt.Icon;
                                const isSelected = (item.icon || 'CheckCircle2') === opt.name;
                                return (
                                  <button
                                    key={opt.name}
                                    type="button"
                                    onClick={() => {
                                      const next = [...formFeatures];
                                      next[idx].icon = opt.name;
                                      setFormFeatures(next);
                                      setIsDirty(true);
                                    }}
                                    title={opt.label}
                                    className={`p-1.5 rounded-lg border transition shrink-0 cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                        : 'tenant-border tenant-muted hover:tenant-text hover:bg-slate-500/10'
                                    }`}
                                  >
                                    <OptIcon className="w-3.5 h-3.5" />
                                  </button>
                                );
                              })}
                            </div>
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
                                setIsDirty(true);
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
                                setIsDirty(true);
                              }}
                              placeholder="Explica qué recibirá el cliente o qué problema soluciona..."
                              className="w-full px-3 py-1.5 rounded-xl text-xs border tenant-border bg-transparent tenant-text focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* PESTAÑA 4: ENTREGABLES POR FASE */}
              {/* ============================================================== */}
              {activeTab === 'deliverables' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b tenant-border">
                    <div>
                      <h3 className="font-extrabold text-sm tenant-text">
                        Entregables por Fase del Proyecto
                      </h3>
                      <p className="text-xs tenant-muted">
                        Define los entregables organizados por fases; se sincronizan con el Gantt de Cotizaciones y Órdenes de Servicio.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {onNavigate && (
                        <button
                          type="button"
                          onClick={() => handleCreateQuoteFromService(livePreviewServiceObject)}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 border border-violet-500/30 flex items-center gap-1.5 cursor-pointer"
                          title="Llevar estas fases directamente a una nueva Cotización"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Cotizar con estas fases</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setFormDeliverables([
                            ...formDeliverables,
                            {
                              id: `del-${Date.now()}`,
                              title: `Entregable ${formDeliverables.length + 1}`,
                              phase: `Fase ${formDeliverables.length + 1}: Ejecución`,
                              details: 'Archivos y documentos entregados al cliente.',
                            },
                          ]);
                          setIsDirty(true);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white tenant-btn-primary flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Añadir Entregable
                      </button>
                    </div>
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
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => setFormDeliverables(moveItem(formDeliverables, idx, 'up'))}
                              className="p-1 rounded-lg tenant-muted hover:tenant-text disabled:opacity-30 cursor-pointer"
                              title="Mover fase arriba"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === formDeliverables.length - 1}
                              onClick={() => setFormDeliverables(moveItem(formDeliverables, idx, 'down'))}
                              className="p-1 rounded-lg tenant-muted hover:tenant-text disabled:opacity-30 cursor-pointer"
                              title="Mover fase abajo"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormDeliverables(formDeliverables.filter((_, i) => i !== idx));
                                setIsDirty(true);
                              }}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                                setIsDirty(true);
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
                                setIsDirty(true);
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
                              setIsDirty(true);
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
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b tenant-border">
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-violet-500">
                          1. Requisitos Previos para el Cliente ({formRequirements.length})
                        </h4>
                        <p className="text-[11px] tenant-muted">
                          ¿Qué materiales o accesos debe entregar el cliente antes de iniciar?
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCreateOrderFromService(livePreviewServiceObject)}
                          className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-1 cursor-pointer transition"
                          title="Crear una Orden de Servicio con estos requisitos y entregables"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>+ Crear OS con estos requisitos</span>
                        </button>
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
                    </div>

                    <div className="space-y-2">
                      {formRequirements.map((req, rIdx) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-xl border tenant-border bg-slate-500/5 flex items-start gap-3"
                        >
                          <div className="flex flex-col gap-0.5 pt-0.5">
                            <button
                              type="button"
                              disabled={rIdx === 0}
                              onClick={() => setFormRequirements(moveItem(formRequirements, rIdx, 'up'))}
                              className="p-1 rounded-md border tenant-border hover:bg-slate-500/10 disabled:opacity-30 cursor-pointer"
                              title="Subir requisito"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={rIdx === formRequirements.length - 1}
                              onClick={() => setFormRequirements(moveItem(formRequirements, rIdx, 'down'))}
                              className="p-1 rounded-md border tenant-border hover:bg-slate-500/10 disabled:opacity-30 cursor-pointer"
                              title="Bajar requisito"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>

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
                              className="w-full text-[11px] border tenant-border rounded-lg p-1.5 bg-transparent tenant-text focus:outline-none"
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
                          2. Preguntas Frecuentes (FAQ) ({formFaqs.length})
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
                          <div className="flex items-center justify-between gap-2">
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
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={fIdx === 0}
                                onClick={() => setFormFaqs(moveItem(formFaqs, fIdx, 'up'))}
                                className="p-1 rounded-md border tenant-border hover:bg-slate-500/10 disabled:opacity-30 cursor-pointer"
                                title="Subir FAQ"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={fIdx === formFaqs.length - 1}
                                onClick={() => setFormFaqs(moveItem(formFaqs, fIdx, 'down'))}
                                className="p-1 rounded-md border tenant-border hover:bg-slate-500/10 disabled:opacity-30 cursor-pointer"
                                title="Bajar FAQ"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormFaqs(formFaqs.filter((_, i) => i !== fIdx));
                                }}
                                className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
                          3. Extras, Add-ons & Descuento por Volumen ({formExtras.length})
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
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={ext.title}
                              onChange={(e) => {
                                const next = [...formExtras];
                                next[eIdx].title = e.target.value;
                                setFormExtras(next);
                              }}
                              placeholder="Nombre del extra (ej. Entrega express)"
                              className="text-xs font-bold border-b tenant-border bg-transparent tenant-text focus:outline-none flex-1"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={eIdx === 0}
                                onClick={() => setFormExtras(moveItem(formExtras, eIdx, 'up'))}
                                className="p-1 rounded-md border tenant-border hover:bg-slate-500/10 disabled:opacity-30 cursor-pointer"
                                title="Mover antes"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={eIdx === formExtras.length - 1}
                                onClick={() => setFormExtras(moveItem(formExtras, eIdx, 'down'))}
                                className="p-1 rounded-md border tenant-border hover:bg-slate-500/10 disabled:opacity-30 cursor-pointer"
                                title="Mover después"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={formSeoOgImage}
                          onChange={(e) => setFormSeoOgImage(e.target.value)}
                          placeholder="URL de la imagen (deja en blanco para usar la portada)"
                          className="flex-1 min-w-[220px] px-3 py-2 rounded-xl text-xs border tenant-border bg-transparent tenant-text focus:outline-none"
                        />
                        <input
                          ref={ogFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const url = await uploadServiceImageFile(f);
                              if (url) {
                                setFormSeoOgImage(url);
                                toast('Imagen Open Graph subida con éxito', 'success');
                              }
                            }
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => ogFileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingImage ? 'Subiendo...' : 'Subir desde PC'}</span>
                        </button>
                      </div>
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
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex flex-wrap items-center gap-2">
              <span>Código: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formCode}</span></span>
              <span>•</span>
              <span>Moneda: {formCurrency} ({formCurrencySymbol})</span>
              <span>•</span>
              <span>Estado: <span className="font-bold text-indigo-600 dark:text-indigo-400 capitalize">{formStatus}</span></span>
              <span>•</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{completenessInfo.score}% completado</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsLivePreviewOpen(true)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                <span>Vista Previa en Vivo</span>
              </button>
              <button
                type="button"
                onClick={handleCloseEditor}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer"
              >
                Descartar cambios
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveService(undefined, 'draft')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer disabled:opacity-50"
              >
                Guardar Borrador
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

        {/* MODAL INTERACTIVO DE VISTA PREVIA EN VIVO (DESKTOP / MOBILE) */}
        {isLivePreviewOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900 border-b border-white/10 text-white shrink-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                  <Eye className="w-3.5 h-3.5" />
                  Simulador de Landing Pública en Tiempo Real
                </span>
                <span className="text-xs text-slate-400 hidden md:inline truncate max-w-md">
                  {formTitle || 'Servicio sin título'} ({formCode})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-slate-800 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setLivePreviewDevice('desktop')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      livePreviewDevice === 'desktop'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLivePreviewDevice('mobile')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      livePreviewDevice === 'mobile'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Móvil</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLivePreviewOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cerrar Vista Previa</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 sm:p-6 flex justify-center">
              <div
                className={`w-full transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-slate-950 ${
                  livePreviewDevice === 'mobile' ? 'max-w-[412px]' : 'max-w-7xl'
                }`}
              >
                <PublicServiceDetailView
                  slugOrId={formSeoSlug || 'preview'}
                  isPreviewMode={true}
                  previewData={{
                    tenant,
                    service: livePreviewServiceObject,
                    relatedServices: services.filter((s) => formRelatedServiceIds.includes(s.id)),
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
};
