import React, { useState, useEffect, useRef } from 'react';
import {
  Link as LinkIcon,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  ExternalLink,
  Share2,
  QrCode,
  Eye,
  TrendingUp,
  BarChart3,
  Sparkles,
  Smartphone,
  Layers,
  Palette,
  CheckCircle2,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Twitter,
  Mail,
  Phone,
  Music2,
  ArrowUpRight,
  MoveUp,
  MoveDown,
  X,
  Sliders,
  Download,
  MessageCircle,
  MapPin,
  FileText,
  Video,
  Image as ImageIcon,
  Star,
  ShoppingBag,
  Calendar,
  CreditCard,
  Folder,
  Zap,
  Heading,
  Minus,
  ChevronDown,
  UserCheck,
  Send,
  LucideIcon,
  HelpCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  BiolinkProfile,
  BiolinkBlock,
  BiolinkTheme,
  BiolinkButtonShape,
  BiolinkSocialLink,
  BiolinkBlockType,
} from '../../../../../shared/types';
import { useApp } from '../../../../../context/AppContext';

// Plantillas temáticas predefinidas
const THEMES_CONFIG: Record<
  BiolinkTheme,
  {
    name: string;
    bgClass: string;
    bgStyle?: React.CSSProperties;
    cardStyle: React.CSSProperties;
    textClass: string;
    accentClass: string;
    badgeStyle: React.CSSProperties;
  }
> = {
  roma_agency: {
    name: 'Roma Agency Brand',
    bgClass: 'bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950',
    cardStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      backdropFilter: 'blur(12px)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    textClass: 'text-white',
    accentClass: 'text-indigo-400',
    badgeStyle: { backgroundColor: '#4f46e5', color: '#ffffff' },
  },
  minimal_light: {
    name: 'Clean Minimal',
    bgClass: 'bg-slate-50',
    cardStyle: {
      backgroundColor: '#ffffff',
      color: '#0f172a',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    textClass: 'text-slate-900',
    accentClass: 'text-slate-600',
    badgeStyle: { backgroundColor: '#0f172a', color: '#ffffff' },
  },
  dark_slate: {
    name: 'Dark Obsidian',
    bgClass: 'bg-slate-950',
    cardStyle: {
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      border: '1px solid #1e293b',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    },
    textClass: 'text-white',
    accentClass: 'text-slate-400',
    badgeStyle: { backgroundColor: '#334155', color: '#ffffff' },
  },
  vibrant_gradient: {
    name: 'Vibrant Sunset',
    bgClass: 'bg-gradient-to-tr from-amber-500 via-rose-600 to-purple-700',
    cardStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      backdropFilter: 'blur(12px)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.3)',
    },
    textClass: 'text-white',
    accentClass: 'text-amber-200',
    badgeStyle: { backgroundColor: '#ffffff', color: '#e11d48' },
  },
  neon_cyber: {
    name: 'Cyberpunk Neon',
    bgClass: 'bg-black',
    cardStyle: {
      backgroundColor: '#0a0a0f',
      color: '#00f5ff',
      border: '1px solid #00f5ff',
      boxShadow: '0 0 15px rgba(0, 245, 255, 0.25)',
    },
    textClass: 'text-cyan-400',
    accentClass: 'text-pink-500',
    badgeStyle: { backgroundColor: '#ff007f', color: '#ffffff' },
  },
  glassmorphism: {
    name: 'Frosted Glass',
    bgClass: 'bg-gradient-to-r from-sky-400 to-indigo-500',
    cardStyle: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      backdropFilter: 'blur(16px)',
      color: '#ffffff',
      border: '1px solid rgba(255, 255, 255, 0.35)',
    },
    textClass: 'text-white',
    accentClass: 'text-sky-200',
    badgeStyle: { backgroundColor: '#ffffff', color: '#0284c7' },
  },
  luxury_gold: {
    name: 'Luxury Emerald & Gold',
    bgClass: 'bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950',
    cardStyle: {
      backgroundColor: '#06281e',
      color: '#fef08a',
      border: '1px solid #d97706',
      boxShadow: '0 4px 15px rgba(217, 119, 6, 0.2)',
    },
    textClass: 'text-amber-100',
    accentClass: 'text-amber-400',
    badgeStyle: { backgroundColor: '#d97706', color: '#ffffff' },
  },
  pastel_rose: {
    name: 'Pastel Blossom',
    bgClass: 'bg-gradient-to-b from-rose-50 to-purple-50',
    cardStyle: {
      backgroundColor: '#ffffff',
      color: '#831843',
      border: '1px solid #fbcfe8',
      boxShadow: '0 2px 10px rgba(244, 114, 182, 0.15)',
    },
    textClass: 'text-rose-950',
    accentClass: 'text-rose-600',
    badgeStyle: { backgroundColor: '#f43f5e', color: '#ffffff' },
  },
};

// Formas de botón
const BUTTON_SHAPE_CLASSES: Record<BiolinkButtonShape, string> = {
  rounded: 'rounded-2xl',
  pill: 'rounded-full',
  square: 'rounded-none',
  outline: 'rounded-xl border-2 bg-transparent',
  shadow_3d: 'rounded-2xl shadow-[0_5px_0_0_rgba(0,0,0,0.25)] active:translate-y-1',
};

// Iconos Lucide disponibles para personalizar cada bloque
export const AVAILABLE_ICONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'globe', label: 'Web / URL', icon: Globe },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { key: 'phone', label: 'Teléfono', icon: Phone },
  { key: 'mail', label: 'Correo', icon: Mail },
  { key: 'map', label: 'Ubicación', icon: MapPin },
  { key: 'file', label: 'Catálogo / PDF', icon: FileText },
  { key: 'download', label: 'Descarga', icon: Download },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'banner', label: 'Imagen', icon: ImageIcon },
  { key: 'sparkles', label: 'Especial', icon: Sparkles },
  { key: 'star', label: 'Destacado', icon: Star },
  { key: 'shopping', label: 'Tienda', icon: ShoppingBag },
  { key: 'calendar', label: 'Agendar', icon: Calendar },
  { key: 'credit-card', label: 'Pagos', icon: CreditCard },
  { key: 'folder', label: 'Portafolio', icon: Folder },
  { key: 'instagram', label: 'Instagram', icon: Instagram },
  { key: 'facebook', label: 'Facebook', icon: Facebook },
  { key: 'youtube', label: 'YouTube', icon: Youtube },
  { key: 'music', label: 'Música', icon: Music2 },
];

// Helper para renderizar el icono Lucide de un bloque
export const renderBlockLucideIcon = (block: BiolinkBlock, className = 'w-4 h-4 shrink-0') => {
  const key = (block.icon || block.type || 'link').toLowerCase();
  switch (key) {
    case 'whatsapp':
    case 'message':
      return <MessageCircle className={className} />;
    case 'phone':
    case 'tel':
      return <Phone className={className} />;
    case 'mail':
    case 'email':
      return <Mail className={className} />;
    case 'map':
    case 'location':
      return <MapPin className={className} />;
    case 'file':
    case 'catalog':
      return <FileText className={className} />;
    case 'download':
      return <Download className={className} />;
    case 'video':
      return <Video className={className} />;
    case 'banner':
    case 'image':
      return <ImageIcon className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'shopping':
      return <ShoppingBag className={className} />;
    case 'calendar':
      return <Calendar className={className} />;
    case 'credit-card':
      return <CreditCard className={className} />;
    case 'folder':
      return <Folder className={className} />;
    case 'instagram':
      return <Instagram className={className} />;
    case 'facebook':
      return <Facebook className={className} />;
    case 'youtube':
      return <Youtube className={className} />;
    case 'music':
      return <Music2 className={className} />;
    case 'header':
      return <Heading className={className} />;
    case 'divider':
      return <Minus className={className} />;
    case 'globe':
    case 'link':
    default:
      return <Globe className={className} />;
  }
};

// Catálogo ampliado de tipos de bloques disponibles
export const BLOCK_PRESETS: {
  type: BiolinkBlockType;
  label: string;
  icon: LucideIcon;
  defaultTitle: string;
  defaultUrl: string;
  defaultSubtitle?: string;
  defaultIcon?: string;
  badge?: string;
  description: string;
  category: 'direct' | 'content' | 'layout';
}[] = [
  {
    type: 'whatsapp',
    label: 'WhatsApp Directo',
    icon: MessageCircle,
    defaultTitle: 'Chatear por WhatsApp',
    defaultUrl: 'https://wa.me/51987654321?text=Hola,%20quiero%20más%20información',
    defaultSubtitle: 'Respuesta inmediata por chat',
    defaultIcon: 'whatsapp',
    badge: 'Popular',
    description: 'Abre un chat con número y texto precargado',
    category: 'direct',
  },
  {
    type: 'link',
    label: 'Enlace Web Estándar',
    icon: Globe,
    defaultTitle: 'Nuevo Enlace Web',
    defaultUrl: 'https://',
    defaultIcon: 'globe',
    description: 'Lleva a tu sitio web, blog o tienda',
    category: 'content',
  },
  {
    type: 'phone',
    label: 'Llamada Telefónica',
    icon: Phone,
    defaultTitle: 'Llamar a Central Telefónica',
    defaultUrl: 'tel:+51987654321',
    defaultSubtitle: 'Atención personalizada',
    defaultIcon: 'phone',
    description: 'Inicia una llamada inmediata desde el móvil',
    category: 'direct',
  },
  {
    type: 'email',
    label: 'Correo Electrónico',
    icon: Mail,
    defaultTitle: 'Escríbenos un Correo',
    defaultUrl: 'mailto:contacto@daromagency.com',
    defaultSubtitle: 'Consultas y presupuestos formales',
    defaultIcon: 'mail',
    description: 'Abre el cliente de correo con tu dirección',
    category: 'direct',
  },
  {
    type: 'location',
    label: 'Ubicación Google Maps',
    icon: MapPin,
    defaultTitle: 'Cómo llegar a nuestra Sede',
    defaultUrl: 'https://maps.google.com/?q=Lima,Peru',
    defaultSubtitle: 'Abrir ubicación en Google Maps',
    defaultIcon: 'map',
    description: 'Guía a tus clientes directamente a tu local',
    category: 'direct',
  },
  {
    type: 'catalog',
    label: 'Catálogo / Archivo PDF',
    icon: FileText,
    defaultTitle: 'Descargar Catálogo de Servicios 2026',
    defaultUrl: 'https://daromagency.com/catalogo.pdf',
    defaultSubtitle: 'PDF oficial con tarifas y planes',
    defaultIcon: 'file',
    badge: 'Nuevo',
    description: 'Acceso directo a folletos, menús y catálogos',
    category: 'content',
  },
  {
    type: 'header',
    label: 'Título de Sección',
    icon: Heading,
    defaultTitle: 'SERVICIOS DESTACADOS',
    defaultUrl: '',
    defaultIcon: 'header',
    description: 'Organiza tus enlaces en secciones temáticas',
    category: 'layout',
  },
  {
    type: 'divider',
    label: 'Línea Separadora',
    icon: Minus,
    defaultTitle: 'Separador',
    defaultUrl: '',
    defaultIcon: 'divider',
    description: 'Línea decorativa para dar respiro al diseño',
    category: 'layout',
  },
  {
    type: 'banner',
    label: 'Banner con Imagen',
    icon: ImageIcon,
    defaultTitle: 'Campaña Exclusiva 2026',
    defaultUrl: 'https://daromagency.com/promo',
    defaultSubtitle: 'Haz clic para descubrir más',
    defaultIcon: 'banner',
    description: 'Tarjeta visual con imagen destacada y enlace',
    category: 'content',
  },
  {
    type: 'video',
    label: 'Video Embebido / Link',
    icon: Video,
    defaultTitle: 'Ver Showreel Institucional',
    defaultUrl: 'https://youtube.com',
    defaultSubtitle: 'Video en alta definición',
    defaultIcon: 'video',
    description: 'Enlaza a YouTube, TikTok o video promocional',
    category: 'content',
  },
];

export const BiolinkTab: React.FC = () => {
  const { apiFetch, toast } = useApp();

  // Estados principales
  const [profiles, setProfiles] = useState<BiolinkProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sub-pestaña de edición: 'content' | 'design' | 'analytics'
  const [editorSubTab, setEditorSubTab] = useState<'content' | 'design' | 'analytics'>('content');

  // Modales
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);
  const [newProfileSlug, setNewProfileSlug] = useState('');
  const [newProfileTitle, setNewProfileTitle] = useState('');
  const [isBlockPickerModalOpen, setIsBlockPickerModalOpen] = useState(false);

  const [editingBlock, setEditingBlock] = useState<BiolinkBlock | null>(null);
  const [isEditBlockModalOpen, setIsEditBlockModalOpen] = useState(false);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cargar lista de perfiles
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/workspace/biolinks');
      if (Array.isArray(res) && res.length > 0) {
        setProfiles(res);
        setSelectedProfileId(res[0].id);
      } else {
        createDefaultProfile();
      }
    } catch {
      createDefaultProfile();
    } finally {
      setLoading(false);
    }
  };

  const createDefaultProfile = async () => {
    const defaultProf: Partial<BiolinkProfile> = {
      slug: 'roma-agencia',
      title: 'Roma Agencia Creativa',
      bio: 'Publicidad de Alto Impacto, Diseño Gráfico & Producción Audiovisual',
      avatarUrl: 'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&w=300&q=80',
      verified: true,
      theme: 'roma_agency',
      buttonShape: 'rounded',
      socialLinks: [
        { platform: 'instagram', url: 'https://instagram.com/romaagencia' },
        { platform: 'whatsapp', url: 'https://wa.me/51987654321' },
        { platform: 'tiktok', url: 'https://tiktok.com/@romaagencia' },
        { platform: 'website', url: 'https://romaagencia.com' },
      ],
      blocks: [
        {
          id: 'b-1',
          type: 'whatsapp',
          title: 'Cotizar Proyecto por WhatsApp',
          url: 'https://wa.me/51987654321?text=Hola%20Roma%20Agencia,%20quiero%20cotizar%20un%20servicio',
          subtitle: 'Respuesta inmediata de nuestro equipo',
          badgeText: 'Recomendado',
          animation: 'pulse',
          icon: 'whatsapp',
          isActive: true,
          clicksCount: 342,
        },
        {
          id: 'b-2',
          type: 'catalog',
          title: 'Ver Catálogo de Servicios 2026',
          url: 'https://romaagencia.com/servicios',
          subtitle: 'Paquetes de Redes, Branding y Audiovisual',
          badgeText: 'Nuevo',
          animation: 'none',
          icon: 'file',
          isActive: true,
          clicksCount: 215,
        },
        {
          id: 'b-3',
          type: 'link',
          title: 'Portafolio de Casos de Éxito',
          url: 'https://romaagencia.com',
          subtitle: 'Más de 150 marcas impulsadas en toda la región',
          animation: 'none',
          icon: 'folder',
          isActive: true,
          clicksCount: 128,
        },
      ],
      viewsCount: 1420,
      clicksCount: 685,
      viewsHistory: [
        { date: '2026-10-30', views: 180, clicks: 85 },
        { date: '2026-10-31', views: 210, clicks: 98 },
        { date: '2026-11-01', views: 195, clicks: 92 },
        { date: '2026-11-02', views: 240, clicks: 120 },
        { date: '2026-11-03', views: 220, clicks: 110 },
        { date: '2026-11-04', views: 185, clicks: 88 },
        { date: '2026-11-05', views: 190, clicks: 92 },
      ],
    };

    try {
      const created = await apiFetch('/api/workspace/biolinks', {
        method: 'POST',
        body: JSON.stringify(defaultProf),
      });
      setProfiles([created]);
      setSelectedProfileId(created.id);
    } catch {
      const local = { ...defaultProf, id: 'bio-demo-1' } as BiolinkProfile;
      setProfiles([local]);
      setSelectedProfileId(local.id);
    }
  };

  const currentProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  // Actualizar perfil local y remotamente
  const updateCurrentProfile = async (updates: Partial<BiolinkProfile>) => {
    if (!currentProfile) return;
    const updated = { ...currentProfile, ...updates };
    setProfiles((prev) => prev.map((p) => (p.id === currentProfile.id ? updated : p)));

    try {
      await apiFetch(`/api/workspace/biolinks/${currentProfile.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      console.warn('Guardado en caché local');
    }
  };

  // Crear nuevo perfil
  const handleCreateProfile = async () => {
    if (!newProfileSlug.trim()) {
      toast('Introduce un identificador (slug) para la URL.', 'warning');
      return;
    }
    const cleanSlug = newProfileSlug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
    const newProf: Partial<BiolinkProfile> = {
      slug: cleanSlug,
      title: newProfileTitle.trim() || cleanSlug,
      bio: 'Enlace en Bio oficial',
      theme: 'roma_agency',
      buttonShape: 'rounded',
      verified: true,
      socialLinks: [],
      blocks: [],
      viewsCount: 0,
      clicksCount: 0,
    };

    try {
      const created = await apiFetch('/api/workspace/biolinks', {
        method: 'POST',
        body: JSON.stringify(newProf),
      });
      setProfiles((prev) => [created, ...prev]);
      setSelectedProfileId(created.id);
      setIsNewProfileModalOpen(false);
      setNewProfileSlug('');
      setNewProfileTitle('');
      toast(`Perfil de Biolink creado: /b/${created.slug}`, 'success');
    } catch {
      toast('No se pudo crear el perfil', 'error');
    }
  };

  // Añadir un nuevo bloque desde un preset
  const handleAddBlockPreset = (presetType: BiolinkBlockType = 'link') => {
    const preset = BLOCK_PRESETS.find((p) => p.type === presetType) || BLOCK_PRESETS[0];
    const newBlock: BiolinkBlock = {
      id: `block-${Date.now()}`,
      type: preset.type,
      title: preset.defaultTitle,
      url: preset.defaultUrl,
      subtitle: preset.defaultSubtitle || '',
      badgeText: preset.badge || '',
      icon: preset.defaultIcon || 'globe',
      animation: 'none',
      isActive: true,
      clicksCount: 0,
    };
    const updatedBlocks = [newBlock, ...(currentProfile?.blocks || [])];
    updateCurrentProfile({ blocks: updatedBlocks });
    setEditingBlock(newBlock);
    setIsBlockPickerModalOpen(false);
    setIsEditBlockModalOpen(true);
  };

  // Guardar bloque editado
  const handleSaveBlock = () => {
    if (!editingBlock || !currentProfile) return;
    const updatedBlocks = currentProfile.blocks.map((b) =>
      b.id === editingBlock.id ? ({ ...b, ...editingBlock } as BiolinkBlock) : b
    );
    updateCurrentProfile({ blocks: updatedBlocks });
    setIsEditBlockModalOpen(false);
    setEditingBlock(null);
    toast('Bloque actualizado con éxito', 'success');
  };

  // Eliminar un bloque
  const handleDeleteBlock = (blockId: string) => {
    if (!currentProfile) return;
    const updatedBlocks = currentProfile.blocks.filter((b) => b.id !== blockId);
    updateCurrentProfile({ blocks: updatedBlocks });
    toast('Bloque eliminado', 'info');
  };

  // Mover bloque arriba/abajo
  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (!currentProfile) return;
    const blocks = [...currentProfile.blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const temp = blocks[index];
    blocks[index] = blocks[targetIndex];
    blocks[targetIndex] = temp;
    updateCurrentProfile({ blocks });
  };

  // URL pública limpia: daromagency.com/b/slug
  const origin = window.location.origin;
  const publicShareUrl = `${origin}/b/${currentProfile?.slug || 'bio'}`;

  // Copiar enlace al portapapeles
  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(publicShareUrl);
    setCopiedLink(true);
    toast(`Enlace copiado al portapapeles: ${publicShareUrl}`, 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Generar QR para el modal del Biolink
  useEffect(() => {
    if (isQrModalOpen && qrCanvasRef.current && currentProfile) {
      QRCode.toCanvas(qrCanvasRef.current, publicShareUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    }
  }, [isQrModalOpen, publicShareUrl, currentProfile]);

  const activeTheme = currentProfile
    ? THEMES_CONFIG[currentProfile.theme] || THEMES_CONFIG.roma_agency
    : THEMES_CONFIG.roma_agency;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ===================================================================== */}
      {/* 1. BARRA SUPERIOR DE BIOLINKS: PERFILES, ENLACE LIMPIO Y ACCIONES */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de Perfil */}
              <select
                value={selectedProfileId || ''}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="px-4 py-2 rounded-2xl text-sm font-black bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-indigo-500"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (/b/{p.slug})
                  </option>
                ))}
              </select>

              {/* Botón Crear Nuevo Perfil */}
              <button
                type="button"
                onClick={() => setIsNewProfileModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Perfil</span>
              </button>
            </div>

            {/* URL pública limpia */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Enlace público:</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>{publicShareUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyPublicLink}
                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 cursor-pointer"
                title="Copiar enlace"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Botones de acción derecha */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={publicShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Vista Pública</span>
            </a>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <QrCode className="w-4 h-4 text-indigo-500" />
              <span>QR del Biolink</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-5 py-2.5 rounded-2xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white inline-flex items-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir</span>
            </button>
          </div>
        </div>

        {/* Pestañas de configuración: Contenido / Diseño / Analíticas */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'content', label: 'Enlaces & Bloques', icon: Layers },
            { id: 'design', label: 'Diseño & Plantillas', icon: Palette },
            { id: 'analytics', label: 'Diagrama de Vistas', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = editorSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEditorSubTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. CONTENIDO PRINCIPAL: EDITOR (IZQUIERDA) & SMARTPHONE MOCKUP (DERECHA) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL DE EDICIÓN (7 COLUMNAS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SUB-PESTAÑA 1: ENLACES & CONTENIDOS */}
          {editorSubTab === 'content' && (
            <div className="space-y-4">
              {/* Barra de creación rápida y más opciones */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Bloques de Enlaces</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        {currentProfile?.blocks?.length || 0}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Botones interactivos, WhatsApp directo, llamadas, mapas, catálogos y secciones.
                    </p>
                  </div>

                  {/* Botón principal para abrir catálogo completo */}
                  <button
                    type="button"
                    onClick={() => setIsBlockPickerModalOpen(true)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Añadir Bloque</span>
                  </button>
                </div>

                {/* Accesos directos rápidos a los tipos más frecuentes */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Acceso Rápido:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddBlockPreset('whatsapp')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddBlockPreset('link')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Enlace Web</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddBlockPreset('phone')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Llamada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddBlockPreset('catalog')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Catálogo PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddBlockPreset('location')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Ubicación</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddBlockPreset('header')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Heading className="w-3.5 h-3.5" />
                    <span>Sección</span>
                  </button>
                </div>
              </div>

              {/* Lista de Bloques Reordenables */}
              <div className="space-y-3">
                {currentProfile?.blocks?.map((block: BiolinkBlock, idx: number) => {
                  const isHeader = block.type === 'header';
                  const isDivider = block.type === 'divider';

                  return (
                    <div
                      key={block.id}
                      className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-xs transition-all flex items-center justify-between gap-3 ${
                        block.isActive
                          ? isHeader
                            ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20'
                            : 'border-slate-200/90 dark:border-slate-800'
                          : 'border-slate-100 dark:border-slate-800/40 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Reordenar */}
                        <div className="flex flex-col gap-0.5 text-slate-300">
                          <button
                            type="button"
                            onClick={() => handleMoveBlock(idx, 'up')}
                            disabled={idx === 0}
                            className="hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                            title="Subir"
                          >
                            <MoveUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveBlock(idx, 'down')}
                            disabled={idx === currentProfile.blocks.length - 1}
                            className="hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                            title="Bajar"
                          >
                            <MoveDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Icono Lucide distintivo del bloque */}
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                          {renderBlockLucideIcon(block, 'w-4 h-4')}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={`text-xs font-black truncate ${
                                isHeader
                                  ? 'text-indigo-600 dark:text-indigo-400 uppercase tracking-wide'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {block.title}
                            </h4>

                            {block.badgeText && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                {block.badgeText}
                              </span>
                            )}

                            {block.animation === 'pulse' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-500" /> Pulse
                              </span>
                            )}
                            {block.animation === 'bounce' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-blue-500" /> Bounce
                              </span>
                            )}
                            {block.animation === 'glow' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-purple-500" /> Glow
                              </span>
                            )}
                          </div>

                          {!isHeader && !isDivider && (
                            <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5 font-mono">
                              {block.url || 'Sin URL asignada'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Clics registrados */}
                        {!isHeader && !isDivider && (
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                            {block.clicksCount || 0} clics
                          </span>
                        )}

                        {/* Switch activo */}
                        <input
                          type="checkbox"
                          checked={block.isActive}
                          onChange={(e) => {
                            const updated = currentProfile.blocks.map((b: BiolinkBlock) =>
                              b.id === block.id ? { ...b, isActive: e.target.checked } : b
                            );
                            updateCurrentProfile({ blocks: updated });
                          }}
                          className="cursor-pointer"
                          title="Activar o desactivar este botón"
                        />

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBlock(block);
                            setIsEditBlockModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Eliminar */}
                        <button
                          type="button"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-rose-500 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {(!currentProfile?.blocks || currentProfile.blocks.length === 0) && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-xs">
                    No hay enlaces en este perfil todavía. Haz clic en "Añadir Bloque" para comenzar.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-PESTAÑA 2: DISEÑO & PLANTILLAS */}
          {editorSubTab === 'design' && (
            <div className="space-y-6">
              {/* Selector de Plantilla */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Plantillas de Diseño
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecciona una estética visual profesional inspirada en marcas de alto impacto.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.keys(THEMES_CONFIG) as BiolinkTheme[]).map((thmKey) => {
                    const t = THEMES_CONFIG[thmKey];
                    const selected = currentProfile?.theme === thmKey;

                    return (
                      <button
                        key={thmKey}
                        type="button"
                        onClick={() => updateCurrentProfile({ theme: thmKey })}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                          selected
                            ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-full h-16 rounded-xl mb-2.5 ${t.bgClass} flex items-center justify-center p-2`}>
                          <div
                            style={t.cardStyle}
                            className="w-full py-1 text-[9px] font-bold text-center rounded-lg shadow-xs"
                          >
                            Demo
                          </div>
                        </div>
                        <span className="block text-xs font-black text-slate-900 dark:text-white truncate">
                          {t.name}
                        </span>
                        {selected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Forma de los botones */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Forma & Estilo de los Botones
                </h3>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {[
                    { id: 'rounded', label: 'Redondeado' },
                    { id: 'pill', label: 'Píldora' },
                    { id: 'square', label: 'Cuadrado' },
                    { id: 'outline', label: 'Línea / Outline' },
                    { id: 'shadow_3d', label: 'Sombra 3D' },
                  ].map((shape) => {
                    const selected = (currentProfile?.buttonShape || 'rounded') === shape.id;
                    return (
                      <button
                        key={shape.id}
                        type="button"
                        onClick={() => updateCurrentProfile({ buttonShape: shape.id as any })}
                        className={`py-3 px-2 text-center border rounded-2xl transition-all cursor-pointer text-xs font-extrabold ${
                          selected
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {shape.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Configuración de Perfil: Título, Bio, Avatar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Información del Perfil
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Nombre o Título</label>
                    <input
                      type="text"
                      value={currentProfile?.title || ''}
                      onChange={(e) => updateCurrentProfile({ title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Biografía / Tagline</label>
                    <textarea
                      rows={2}
                      value={currentProfile?.bio || ''}
                      onChange={(e) => updateCurrentProfile({ bio: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">URL de Avatar / Logo</label>
                    <input
                      type="url"
                      value={currentProfile?.avatarUrl || ''}
                      onChange={(e) => updateCurrentProfile({ avatarUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Insignia de Cuenta Verificada
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <input
                      type="checkbox"
                      checked={currentProfile?.verified || false}
                      onChange={(e) => updateCurrentProfile({ verified: e.target.checked })}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-PESTAÑA 3: DIAGRAMA DE VISTAS & ANALÍTICAS */}
          {editorSubTab === 'analytics' && (
            <div className="space-y-6">
              {/* Tarjetas KPI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 block">Vistas Totales</span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {currentProfile?.viewsCount || 0}
                  </h3>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 block">Clics Totales</span>
                  <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {currentProfile?.clicksCount || 0}
                  </h3>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 block">Tasa CTR</span>
                  <h3 className="text-2xl font-black text-emerald-600 mt-1">
                    {currentProfile?.viewsCount
                      ? ((currentProfile.clicksCount / currentProfile.viewsCount) * 100).toFixed(1)
                      : '0'}
                    %
                  </h3>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 block">Enlaces Activos</span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {currentProfile?.blocks?.filter((b) => b.isActive).length || 0}
                  </h3>
                </div>
              </div>

              {/* Diagrama de Vistas por Día (Gráfico SVG) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Diagrama de Vistas & Clics (Últimos 7 días)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Comportamiento del tráfico que llega desde Instagram, TikTok y campañas.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1 text-indigo-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      Vistas
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Clics
                    </span>
                  </div>
                </div>

                {/* Gráfico de Barras */}
                <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
                  {(currentProfile?.viewsHistory || []).map((stat, idx) => {
                    const maxVal = Math.max(
                      ...((currentProfile?.viewsHistory || []).map((s) => s.views) || [100])
                    );
                    const viewHeight = Math.round((stat.views / maxVal) * 100);
                    const clickHeight = Math.round((stat.clicks / maxVal) * 100);

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="w-full flex items-end justify-center gap-1.5 h-36">
                          {/* Barra de Vistas */}
                          <div
                            style={{ height: `${viewHeight}%` }}
                            className="w-full max-w-[18px] bg-indigo-600 rounded-t-lg transition-all group-hover:brightness-110 relative"
                          >
                            <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded-md pointer-events-none transition-opacity">
                              {stat.views}
                            </span>
                          </div>
                          {/* Barra de Clics */}
                          <div
                            style={{ height: `${clickHeight}%` }}
                            className="w-full max-w-[18px] bg-emerald-500 rounded-t-lg transition-all group-hover:brightness-110 relative"
                          >
                            <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded-md pointer-events-none transition-opacity">
                              {stat.clicks}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 block truncate">
                          {stat.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desglose de Clics Botón por Botón */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Rendimiento de cada Enlace
                </h3>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentProfile?.blocks?.map((block) => (
                    <div key={block.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {renderBlockLucideIcon(block, 'w-3.5 h-3.5 text-slate-400')}
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {block.title}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        {block.clicksCount || 0} clics
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PANEL DERECHO: SMARTPHONE MOCKUP INTERACTIVO (5 COLUMNAS) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="w-full max-w-[340px] mx-auto bg-slate-900 dark:bg-black rounded-[46px] p-3 shadow-2xl border-4 border-slate-800 relative">
            {/* Altavoz y Cámara Frontal (Dynamic Island) */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            </div>

            {/* Pantalla del Celular */}
            <div
              className={`w-full rounded-[38px] min-h-[580px] max-h-[640px] overflow-y-auto px-5 pt-12 pb-8 flex flex-col justify-between relative ${activeTheme.bgClass}`}
            >
              <div className="space-y-5 text-center relative z-10">
                {/* Avatar / Logo con Insignia Verificada */}
                <div className="relative inline-block mx-auto mt-2">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/50 mx-auto shadow-md">
                    <img
                      src={
                        currentProfile?.avatarUrl ||
                        'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&w=300&q=80'
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {currentProfile?.verified && (
                    <div className="absolute bottom-0 right-1 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900">
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Título & Bio */}
                <div>
                  <h3 className={`text-base font-black ${activeTheme.textClass}`}>
                    {currentProfile?.title || 'Mi Biolink'}
                  </h3>
                  <p className={`text-xs opacity-80 mt-1 max-w-[240px] mx-auto leading-relaxed ${activeTheme.textClass}`}>
                    {currentProfile?.bio || 'Enlace en Bio oficial'}
                  </p>
                </div>

                {/* Redes Sociales Iconos */}
                {currentProfile?.socialLinks && currentProfile.socialLinks.length > 0 && (
                  <div className="flex items-center justify-center gap-3 pt-1">
                    {currentProfile.socialLinks.map((s: BiolinkSocialLink, idx: number) => (
                      <span
                        key={idx}
                        className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white text-xs hover:scale-110 transition-transform"
                      >
                        {s.platform === 'instagram' && <Instagram className="w-3.5 h-3.5" />}
                        {s.platform === 'whatsapp' && <Phone className="w-3.5 h-3.5" />}
                        {s.platform === 'website' && <Globe className="w-3.5 h-3.5" />}
                        {s.platform === 'tiktok' && <Music2 className="w-3.5 h-3.5" />}
                      </span>
                    ))}
                  </div>
                )}

                {/* Lista de Botones / Bloques en el Mockup */}
                <div className="space-y-2.5 pt-2">
                  {currentProfile?.blocks
                    ?.filter((b: BiolinkBlock) => b.isActive)
                    .map((block: BiolinkBlock) => {
                      // Caso 1: Título de Sección
                      if (block.type === 'header') {
                        return (
                          <div key={block.id} className="pt-2 pb-0.5 text-center">
                            <span className="text-[11px] font-black uppercase tracking-wider opacity-70">
                              {block.title}
                            </span>
                          </div>
                        );
                      }

                      // Caso 2: Separador
                      if (block.type === 'divider') {
                        return (
                          <div key={block.id} className="my-1.5 border-t border-current opacity-20" />
                        );
                      }

                      // Caso 3: Banner con Imagen
                      if (block.type === 'banner') {
                        return (
                          <a
                            key={block.id}
                            href={block.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={activeTheme.cardStyle}
                            className={`w-full overflow-hidden block text-left transition-transform hover:scale-[1.02] cursor-pointer ${
                              BUTTON_SHAPE_CLASSES[currentProfile.buttonShape || 'rounded']
                            }`}
                          >
                            {block.imageUrl ? (
                              <img src={block.imageUrl} alt={block.title} className="w-full h-20 object-cover" />
                            ) : (
                              <div className="w-full h-16 bg-white/10 flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 opacity-60" />
                              </div>
                            )}
                            <div className="p-2.5">
                              <span className="block text-xs font-black truncate">{block.title}</span>
                              {block.subtitle && (
                                <span className="block text-[10px] opacity-75 truncate">{block.subtitle}</span>
                              )}
                            </div>
                          </a>
                        );
                      }

                      // Caso 4: Botón interactivo estándar
                      return (
                        <a
                          key={block.id}
                          href={block.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={activeTheme.cardStyle}
                          className={`w-full py-3 px-4 flex items-center justify-between text-left transition-transform hover:scale-[1.02] cursor-pointer group ${
                            BUTTON_SHAPE_CLASSES[currentProfile.buttonShape || 'rounded']
                          } ${block.animation === 'pulse' ? 'animate-pulse' : ''}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0">
                              {renderBlockLucideIcon(block, 'w-3.5 h-3.5')}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-black truncate">
                                {block.title}
                              </span>
                              {block.subtitle && (
                                <span className="block text-[10px] opacity-75 truncate">
                                  {block.subtitle}
                                </span>
                              )}
                            </div>
                          </div>

                          {block.badgeText ? (
                            <span
                              style={activeTheme.badgeStyle}
                              className="px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ml-2"
                            >
                              {block.badgeText}
                            </span>
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0 ml-2" />
                          )}
                        </a>
                      );
                    })}
                </div>
              </div>

              {/* Footer sutil */}
              <div className="pt-6 text-center text-[10px] opacity-60 text-white relative z-10 font-bold">
                Roma Studio • Link in Bio
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. MODALES: NUEVO PERFIL, CATÁLOGO DE BLOQUES, EDITAR BLOQUE, QR, COMPARTIR */}
      {/* ===================================================================== */}

      {/* MODAL: CREAR NUEVO PERFIL */}
      {isNewProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Crear Nuevo Perfil Biolink
              </h3>
              <button
                type="button"
                onClick={() => setIsNewProfileModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Nombre de Marca o Negocio
                </label>
                <input
                  type="text"
                  value={newProfileTitle}
                  onChange={(e) => {
                    setNewProfileTitle(e.target.value);
                    if (!newProfileSlug) {
                      setNewProfileSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')
                      );
                    }
                  }}
                  placeholder="Ej: Roma Café Specialty"
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  Identificador URL (Slug)
                </label>
                <div className="flex items-center px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-xs text-slate-400 font-mono">/b/</span>
                  <input
                    type="text"
                    value={newProfileSlug}
                    onChange={(e) => setNewProfileSlug(e.target.value)}
                    placeholder="roma-cafe"
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white outline-none ml-1"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateProfile}
                className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer mt-2"
              >
                Crear Perfil Biolink
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CATÁLOGO EXPANDIDO DE TIPOS DE BLOQUES */}
      {isBlockPickerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Añadir Bloque al Biolink
                </h3>
                <p className="text-xs text-slate-500">
                  Elige el tipo de elemento interactivo que deseas agregar a tu perfil.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBlockPickerModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {BLOCK_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={() => handleAddBlockPreset(preset.type)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-left transition-all group flex items-start gap-3 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                          {preset.label}
                        </span>
                        {preset.badge && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            {preset.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR BLOQUE */}
      {isEditBlockModalOpen && editingBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  {renderBlockLucideIcon(editingBlock, 'w-4 h-4')}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Configurar Bloque
                  </h3>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">
                    Tipo: {editingBlock.type}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditBlockModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Selector de Tipo de Bloque */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Tipo de Elemento</label>
                <select
                  value={editingBlock.type}
                  onChange={(e) => {
                    const newType = e.target.value as BiolinkBlockType;
                    const preset = BLOCK_PRESETS.find((p) => p.type === newType);
                    setEditingBlock({
                      ...editingBlock,
                      type: newType,
                      icon: preset?.defaultIcon || editingBlock.icon || 'globe',
                      title: editingBlock.title || preset?.defaultTitle || 'Nuevo Bloque',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                >
                  {BLOCK_PRESETS.map((p) => (
                    <option key={p.type} value={p.type}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Título */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  {editingBlock.type === 'header' ? 'Texto del Encabezado' : 'Título del Botón'}
                </label>
                <input
                  type="text"
                  value={editingBlock.title || ''}
                  onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
                  placeholder="Ej: Cotizar por WhatsApp / Ver Menú"
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                />
              </div>

              {/* Subtítulo (solo si no es divisor ni header) */}
              {editingBlock.type !== 'header' && editingBlock.type !== 'divider' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Subtítulo (Opcional)</label>
                  <input
                    type="text"
                    value={editingBlock.subtitle || ''}
                    onChange={(e) => setEditingBlock({ ...editingBlock, subtitle: e.target.value })}
                    placeholder="Ej: Catálogo actualizado 2026"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* URL / Destino */}
              {editingBlock.type !== 'header' && editingBlock.type !== 'divider' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">
                    {editingBlock.type === 'whatsapp'
                      ? 'Enlace WhatsApp (https://wa.me/NUMERO?text=MENSAJE)'
                      : editingBlock.type === 'phone'
                      ? 'Teléfono (tel:+51987654321)'
                      : editingBlock.type === 'email'
                      ? 'Correo (mailto:correo@dominio.com)'
                      : editingBlock.type === 'location'
                      ? 'URL de Google Maps'
                      : 'URL de Destino'}
                  </label>
                  <input
                    type="text"
                    value={editingBlock.url || ''}
                    onChange={(e) => setEditingBlock({ ...editingBlock, url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Selector de Icono Lucide */}
              {editingBlock.type !== 'divider' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">
                    Icono Representativo (Lucide)
                  </label>
                  <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    {AVAILABLE_ICONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = (editingBlock.icon || editingBlock.type) === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setEditingBlock({ ...editingBlock, icon: item.key })}
                          title={item.label}
                          className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs scale-105'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Insignia y Animación */}
              {editingBlock.type !== 'header' && editingBlock.type !== 'divider' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Insignia (Badge)</label>
                    <input
                      type="text"
                      value={editingBlock.badgeText || ''}
                      onChange={(e) => setEditingBlock({ ...editingBlock, badgeText: e.target.value })}
                      placeholder="Nuevo / Destacado"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Efecto Visual</label>
                    <select
                      value={editingBlock.animation || 'none'}
                      onChange={(e) => setEditingBlock({ ...editingBlock, animation: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                    >
                      <option value="none">Sin Animación</option>
                      <option value="pulse">Pulse (Latido)</option>
                      <option value="bounce">Bounce (Rebote)</option>
                      <option value="glow">Glow (Resplandor)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Si es Banner con Imagen */}
              {editingBlock.type === 'banner' && (
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">URL de la Imagen Banner</label>
                  <input
                    type="url"
                    value={editingBlock.imageUrl || ''}
                    onChange={(e) => setEditingBlock({ ...editingBlock, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveBlock}
                className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer pt-2"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QR DEL BIOLINK */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Código QR de tu Biolink
              </h3>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <canvas ref={qrCanvasRef} className="max-w-[220px] max-h-[220px] rounded-xl" />
            </div>

            <p className="text-xs text-slate-500 font-mono break-all">{publicShareUrl}</p>

            <button
              type="button"
              onClick={() => {
                if (!qrCanvasRef.current) return;
                const link = document.createElement('a');
                link.download = `qr-biolink-${currentProfile?.slug || 'roma'}.png`;
                link.href = qrCanvasRef.current.toDataURL('image/png');
                link.click();
                toast('Código QR descargado', 'success');
              }}
              className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Código QR PNG</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: COMPARTIR ENLACE */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Compartir Perfil Oficial
              </h3>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 truncate">
                  {publicShareUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPublicLink}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 ml-2 shrink-0 cursor-pointer"
                >
                  {copiedLink ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Copiado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </span>
                  )}
                </button>
              </div>

              {/* Botones de Redes Sociales */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Conoce nuestro perfil oficial: ${publicShareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(publicShareUrl)}&text=${encodeURIComponent('Perfil Oficial Roma')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold text-xs inline-flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
