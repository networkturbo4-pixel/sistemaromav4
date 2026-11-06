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
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
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
      border: '1px solid rgba(255, 255, 255, 0.4)',
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
      boxShadow: '0 4px 15px rgba(217, 119, 6, 0.15)',
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
      boxShadow: '0 4px 10px rgba(244, 114, 182, 0.1)',
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
  shadow_3d: 'rounded-2xl shadow-[0_6px_0_0_rgba(0,0,0,0.2)] active:translate-y-1',
};

export const BiolinkTab: React.FC = () => {
  const { toast, apiFetch } = useApp();

  // Lista de perfiles y perfil actualmente seleccionado
  const [profiles, setProfiles] = useState<BiolinkProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sub-pestaña de edición: 'content' | 'design' | 'analytics'
  const [editorSubTab, setEditorSubTab] = useState<'content' | 'design' | 'analytics'>('content');

  // Modales
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);
  const [isEditBlockModalOpen, setIsEditBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Partial<BiolinkBlock> | null>(null);

  // Formulario nuevo perfil
  const [newProfileSlug, setNewProfileSlug] = useState('');
  const [newProfileTitle, setNewProfileTitle] = useState('');

  // Estados de copia
  const [copiedLink, setCopiedLink] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cargar perfiles desde backend
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/workspace/biolinks');
      if (Array.isArray(res) && res.length > 0) {
        setProfiles(res);
        setSelectedProfileId(res[0].id);
      } else {
        // Crear perfil inicial por defecto si está vacío
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
      bio: 'Publicidad de Alto Impacto, Diseño Gráfico & Producción Audiovisual 🚀',
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
          isActive: true,
          clicksCount: 342,
        },
        {
          id: 'b-2',
          type: 'link',
          title: 'Ver Catálogo de Servicios 2026',
          url: 'https://romaagencia.com/servicios',
          subtitle: 'Paquetes de Redes, Branding y Audiovisual',
          badgeText: 'Nuevo',
          animation: 'none',
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

  // Actualizar perfil localmente y en backend
  const updateCurrentProfile = async (updates: Partial<BiolinkProfile>) => {
    if (!currentProfile) return;
    const updated = { ...currentProfile, ...updates };
    setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

    try {
      await apiFetch(`/api/workspace/biolinks/${currentProfile.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('Guardado en caché local');
    }
  };

  // Crear nuevo perfil
  const handleCreateProfile = async () => {
    if (!newProfileSlug.trim()) {
      toast({ title: 'Slug requerido', description: 'Introduce un identificador para la URL.', variant: 'destructive' });
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
      toast({
        title: 'Perfil de Biolink Creado',
        description: `URL activa: /b/${created.slug}`,
        variant: 'default',
      });
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo crear el perfil', variant: 'destructive' });
    }
  };

  // Añadir un nuevo bloque de enlace
  const handleAddBlock = (type: BiolinkBlockType = 'link') => {
    const newBlock: BiolinkBlock = {
      id: `block-${Date.now()}`,
      type,
      title: type === 'whatsapp' ? 'Chatear por WhatsApp' : 'Nuevo Enlace',
      url: type === 'whatsapp' ? 'https://wa.me/51987654321' : 'https://',
      subtitle: '',
      badgeText: '',
      animation: 'none',
      isActive: true,
      clicksCount: 0,
    };
    const updatedBlocks = [newBlock, ...(currentProfile?.blocks || [])];
    updateCurrentProfile({ blocks: updatedBlocks });
    setEditingBlock(newBlock);
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
  };

  // Eliminar un bloque
  const handleDeleteBlock = (blockId: string) => {
    if (!currentProfile) return;
    const updatedBlocks = currentProfile.blocks.filter((b) => b.id !== blockId);
    updateCurrentProfile({ blocks: updatedBlocks });
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

  // URL pública limpia sugerida por el usuario: daromagency.com/b/slug
  const origin = window.location.origin;
  const publicShareUrl = `${origin}/b/${currentProfile?.slug || 'bio'}`;

  // Copiar enlace al portapapeles
  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(publicShareUrl);
    setCopiedLink(true);
    toast({
      title: 'Enlace Copiado',
      description: `${publicShareUrl} listo para compartir.`,
      variant: 'default',
    });
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

  const activeTheme = currentProfile ? THEMES_CONFIG[currentProfile.theme] || THEMES_CONFIG.roma_agency : THEMES_CONFIG.roma_agency;

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
                className="px-3.5 py-1.5 rounded-xl text-base font-black border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (/b/{p.slug})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsNewProfileModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Perfil</span>
              </button>
            </div>

            {/* Enlace limpio estilo Linktree */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Enlace público:</span>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-bold">{publicShareUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyPublicLink}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Copiar enlace"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Botones de acción derecha */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={publicShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-800"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Vista Pública</span>
            </a>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-800 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-400" />
              <span>QR del Biolink</span>
            </button>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartir</span>
            </button>
          </div>
        </div>

        {/* Pestañas de configuración: Contenido / Diseño / Analíticas */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          {[
            { id: 'content', label: 'Enlaces & Bloques', icon: LinkIcon },
            { id: 'design', label: 'Diseño & Plantillas', icon: Palette },
            { id: 'analytics', label: 'Diagrama de Vistas', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = editorSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setEditorSubTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
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
              {/* Botón Añadir Bloque */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Bloques de Enlaces ({currentProfile?.blocks?.length || 0})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Añade botones interactivos, enlaces a WhatsApp o accesos a tu portafolio.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddBlock('whatsapp')}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    + WhatsApp Directo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBlock('link')}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Enlace</span>
                  </button>
                </div>
              </div>

              {/* Lista de Bloques Reordenables */}
              <div className="space-y-3">
                {currentProfile?.blocks?.map((block: BiolinkBlock, idx: number) => (
                  <div
                    key={block.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-xs transition-all flex items-center justify-between gap-3 ${
                      block.isActive
                        ? 'border-slate-200/90 dark:border-slate-800'
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
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveBlock(idx, 'down')}
                          disabled={idx === (currentProfile.blocks.length - 1)}
                          className="hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {block.title}
                          </h4>
                          {block.badgeText && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                              {block.badgeText}
                            </span>
                          )}
                          {block.animation !== 'none' && (
                            <span className="text-[10px] text-amber-500 font-bold">
                              ⚡ {block.animation}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-md">
                          {block.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Clics registrados */}
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">
                        {block.clicksCount || 0} clics
                      </span>

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
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-500 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => handleDeleteBlock(block.id)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {(!currentProfile?.blocks || currentProfile.blocks.length === 0) && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-xs">
                    No hay enlaces en este perfil todavía. Haz clic en "Añadir Enlace" para comenzar.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-PESTAÑA 2: DISEÑO & PLANTILLAS */}
          {editorSubTab === 'design' && (
            <div className="space-y-6">
              {/* Plantillas Visuales Inspiradas en Linktree */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Plantillas de Diseño
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.keys(THEMES_CONFIG) as BiolinkTheme[]).map((themeKey) => {
                    const theme = THEMES_CONFIG[themeKey];
                    const isSelected = currentProfile?.theme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => updateCurrentProfile({ theme: themeKey })}
                        className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between h-28 relative overflow-hidden ${
                          isSelected
                            ? 'ring-2 ring-indigo-500 border-transparent shadow-md'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                        }`}
                      >
                        {/* Mini preview fondo */}
                        <div className={`absolute inset-0 ${theme.bgClass} opacity-80`} />
                        <div className="relative z-10 flex justify-between items-start">
                          <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-xs">
                            {theme.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-black/60" />
                          )}
                        </div>
                        <div className="relative z-10 w-full h-3 rounded-full bg-white/40" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Forma de los botones */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Estilo y Forma de los Botones
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'rounded', label: 'Redondeado' },
                    { id: 'pill', label: 'Píldora' },
                    { id: 'square', label: 'Cuadrado' },
                    { id: 'outline', label: 'Borde Fino' },
                    { id: 'shadow_3d', label: 'Sombra 3D' },
                  ].map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => updateCurrentProfile({ buttonShape: shape.id as any })}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                        currentProfile?.buttonShape === shape.id
                          ? 'bg-indigo-600 text-white border-transparent'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Datos de Cabecera (Avatar, Nombre, Bio, Verificado) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Cabecera del Perfil
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Nombre de Marca o Perfil</label>
                    <input
                      type="text"
                      value={currentProfile?.title || ''}
                      onChange={(e) => updateCurrentProfile({ title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">Biografía / Tagline</label>
                    <textarea
                      rows={2}
                      value={currentProfile?.bio || ''}
                      onChange={(e) => updateCurrentProfile({ bio: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-1">URL de Avatar / Logo</label>
                    <input
                      type="url"
                      value={currentProfile?.avatarUrl || ''}
                      onChange={(e) => updateCurrentProfile({ avatarUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Insignia de Cuenta Verificada ✓
                    </span>
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
                      : '0'}%
                  </h3>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 block">Enlaces Activos</span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {(currentProfile?.blocks || []).filter((b: BiolinkBlock) => b.isActive).length}
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
                    <p className="text-xs text-slate-400">
                      Comportamiento del tráfico que llega desde Instagram, TikTok y campañas.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      Vistas
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Clics
                    </span>
                  </div>
                </div>

                {/* Gráfico de Barras */}
                <div className="h-48 pt-6 flex items-end justify-between gap-3 px-2 border-b border-slate-100 dark:border-slate-800">
                  {(currentProfile?.viewsHistory || []).map((day: any, idx: number) => {
                    const max = 250;
                    const viewHeight = Math.min(100, Math.round((day.views / max) * 100));
                    const clickHeight = Math.min(100, Math.round((day.clicks / max) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="w-full flex items-end justify-center gap-1 h-full">
                          <div
                            className="w-4 rounded-t-lg bg-indigo-600 group-hover:opacity-80 transition-all"
                            style={{ height: `${viewHeight}%` }}
                            title={`${day.views} vistas`}
                          />
                          <div
                            className="w-4 rounded-t-lg bg-emerald-500 group-hover:opacity-80 transition-all"
                            style={{ height: `${clickHeight}%` }}
                            title={`${day.clicks} clics`}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {day.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desglose de Clics Botón por Botón */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Rendimiento por Enlace
                </h3>
                <div className="space-y-2">
                  {currentProfile?.blocks?.map((block: BiolinkBlock) => (
                    <div
                      key={block.id}
                      className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-extrabold text-slate-900 dark:text-white block truncate">
                          {block.title}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">{block.url}</span>
                      </div>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 ml-3">
                        {block.clicksCount || 0} clics
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PANEL DERECHO: SMARTPHONE MOCKUP EN TIEMPO REAL (5 COLUMNAS) */}
        <div className="lg:col-span-5 flex justify-center sticky top-6">
          <div className="w-[320px] sm:w-[340px] rounded-[48px] p-3.5 bg-slate-900 dark:bg-slate-950 border-4 border-slate-700/60 shadow-2xl relative select-none">
            {/* Notch / Dynamic Island */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 rounded-full bg-black z-30 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 mr-2" />
            </div>

            {/* Pantalla del Celular */}
            <div
              className={`w-full rounded-[38px] min-h-[580px] max-h-[640px] overflow-y-auto px-5 pt-12 pb-8 flex flex-col justify-between relative ${activeTheme.bgClass}`}
            >
              <div className="space-y-5 text-center relative z-10">
                {/* Avatar / Logo */}
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
                    <div className="absolute bottom-0 right-1 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                      ✓
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
                <div className="space-y-3 pt-2">
                  {currentProfile?.blocks
                    ?.filter((b: BiolinkBlock) => b.isActive)
                    .map((block: BiolinkBlock) => (
                      <a
                        key={block.id}
                        href={block.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={activeTheme.cardStyle}
                        className={`w-full py-3 px-4 flex items-center justify-between text-left transition-transform hover:scale-[1.02] cursor-pointer group ${
                          BUTTON_SHAPE_CLASSES[currentProfile.buttonShape || 'rounded']
                        } ${block.animation === 'pulse' ? 'animate-pulse' : ''}`}
                      >
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
                    ))}
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
      {/* 3. MODALES: NUEVO PERFIL, EDITAR BLOQUE, QR MODAL, COMPARTIR */}
      {/* ===================================================================== */}

      {/* MODAL: NUEVO PERFIL BIOLINK */}
      {isNewProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Crear Nuevo Perfil de Biolink
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
                <label className="text-xs font-bold text-slate-500 block mb-1">Nombre de la Marca o Negocio</label>
                <input
                  type="text"
                  value={newProfileTitle}
                  onChange={(e) => {
                    setNewProfileTitle(e.target.value);
                    if (!newProfileSlug) {
                      setNewProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  placeholder="Ej: Pizza Khallessi"
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Slug URL (/b/tu-marca)</label>
                <div className="flex items-center">
                  <span className="px-3 py-2 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-800 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800">
                    daromagency.com/b/
                  </span>
                  <input
                    type="text"
                    value={newProfileSlug}
                    onChange={(e) => setNewProfileSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                    placeholder="pizzakhallessi"
                    className="flex-1 px-3 py-2 rounded-r-xl text-xs font-mono font-bold border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateProfile}
                className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
              >
                Crear Perfil Biolink
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR BLOQUE */}
      {isEditBlockModalOpen && editingBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Configurar Botón / Bloque
              </h3>
              <button
                type="button"
                onClick={() => setIsEditBlockModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Título del Botón</label>
                <input
                  type="text"
                  value={editingBlock.title || ''}
                  onChange={(e) => setEditingBlock({ ...editingBlock, title: e.target.value })}
                  placeholder="Ej: Ver Servicios"
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                />
              </div>

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

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">URL de Destino</label>
                <input
                  type="url"
                  value={editingBlock.url || ''}
                  onChange={(e) => setEditingBlock({ ...editingBlock, url: e.target.value })}
                  placeholder="https://wa.me/51987654321"
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Insignia (Badge)</label>
                  <input
                    type="text"
                    value={editingBlock.badgeText || ''}
                    onChange={(e) => setEditingBlock({ ...editingBlock, badgeText: e.target.value })}
                    placeholder="Nuevo / 50% OFF"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Animación</label>
                  <select
                    value={editingBlock.animation || 'none'}
                    onChange={(e) => setEditingBlock({ ...editingBlock, animation: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                  >
                    <option value="none">Sin Animación</option>
                    <option value="pulse">Pulse (Destacado)</option>
                    <option value="bounce">Bounce</option>
                    <option value="glow">Glow Resplandor</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveBlock}
                className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
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
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center">
              <canvas ref={qrCanvasRef} className="max-w-full rounded-xl" />
            </div>

            <p className="text-xs text-slate-400 font-mono break-all">
              {publicShareUrl}
            </p>

            <button
              type="button"
              onClick={() => {
                const canvas = qrCanvasRef.current;
                if (!canvas) return;
                const a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = `qr-biolink-${currentProfile?.slug}.png`;
                a.click();
              }}
              className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Código QR PNG</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: COMPARTIR */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Compartir Biolink
              </h3>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
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
                  {copiedLink ? 'Copiado ✓' : 'Copiar'}
                </button>
              </div>

              {/* Botones de Redes Sociales */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`¡Conoce nuestro perfil oficial! Visita: ${publicShareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs inline-flex items-center justify-center gap-2"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(publicShareUrl)}&text=${encodeURIComponent('Perfil Oficial Roma')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold text-xs inline-flex items-center justify-center gap-2"
                >
                  <Globe className="w-3.5 h-3.5" />
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
