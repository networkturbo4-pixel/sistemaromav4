import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  ArrowUpRight,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Twitter,
  Phone,
  Music2,
  Share2,
  Check,
  Copy,
  QrCode,
  X,
  Sparkles,
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
  Send,
  LucideIcon,
} from 'lucide-react';
import { BiolinkProfile, BiolinkBlock, BiolinkTheme, BiolinkButtonShape } from '../../shared/types';

interface PublicBiolinkViewProps {
  slug: string;
}

const THEMES_CONFIG: Record<
  BiolinkTheme,
  {
    name: string;
    bgClass: string;
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
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
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
      boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
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

const BUTTON_SHAPE_CLASSES: Record<BiolinkButtonShape, string> = {
  rounded: 'rounded-2xl',
  pill: 'rounded-full',
  square: 'rounded-none',
  outline: 'rounded-xl border-2 bg-transparent',
  shadow_3d: 'rounded-2xl shadow-[0_5px_0_0_rgba(0,0,0,0.25)] active:translate-y-1',
};

const renderPublicBlockLucideIcon = (block: BiolinkBlock, className = 'w-4 h-4 shrink-0') => {
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
      return <DownloadLucideIcon className={className} />;
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

const DownloadLucideIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const PublicBiolinkView: React.FC<PublicBiolinkViewProps> = ({ slug }) => {
  const [profile, setProfile] = useState<BiolinkProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    const fetchBiolink = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/biolinks/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setProfile(data.profile || data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchBiolink();
  }, [slug]);

  const handleBlockClick = (blockId: string, url?: string) => {
    if (!url) return;
    try {
      fetch(`/api/public/biolinks/${encodeURIComponent(slug)}/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId }),
      }).catch(() => {});
    } catch {}
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-bold">Cargando perfil oficial...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center mb-4">
          <X className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white">Perfil no disponible</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          El enlace /b/{slug} no existe o fue despublicado recientemente.
        </p>
      </div>
    );
  }

  const theme = THEMES_CONFIG[profile.theme] || THEMES_CONFIG.roma_agency;
  const shapeClass = BUTTON_SHAPE_CLASSES[profile.buttonShape || 'rounded'];

  return (
    <div className={`min-h-screen flex flex-col justify-between py-10 px-4 ${theme.bgClass} animate-fadeIn`}>
      {/* Botón flotante para compartir */}
      <div className="fixed top-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsShareOpen(true)}
          className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border border-white/20 transition-all cursor-pointer shadow-lg"
          title="Compartir perfil"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Contenedor Central */}
      <div className="w-full max-w-md mx-auto space-y-6 text-center">
        {/* Avatar / Logo con Insignia de Verificación */}
        <div className="relative inline-block mx-auto">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white/60 shadow-2xl mx-auto">
            <img
              src={
                profile.avatarUrl ||
                'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?auto=format&fit=crop&w=300&q=80'
              }
              alt={profile.title}
              className="w-full h-full object-cover"
            />
          </div>
          {profile.verified && (
            <div
              className="absolute bottom-1 right-2 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-black shadow-md border-2 border-white"
              title="Cuenta Verificada"
            >
              <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
            </div>
          )}
        </div>

        {/* Título y Biografía */}
        <div className="space-y-2">
          <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${theme.textClass}`}>
            {profile.title}
          </h1>
          {profile.bio && (
            <p className={`text-xs sm:text-sm opacity-85 max-w-xs mx-auto leading-relaxed ${theme.textClass}`}>
              {profile.bio}
            </p>
          )}
        </div>

        {/* Redes Sociales Iconos */}
        {profile.socialLinks && profile.socialLinks.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {profile.socialLinks.map((s, idx) => (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-transform hover:scale-110 shadow-sm"
              >
                {s.platform === 'instagram' && <Instagram className="w-4 h-4" />}
                {s.platform === 'whatsapp' && <MessageCircle className="w-4 h-4" />}
                {s.platform === 'website' && <Globe className="w-4 h-4" />}
                {s.platform === 'tiktok' && <Music2 className="w-4 h-4" />}
                {s.platform === 'youtube' && <Youtube className="w-4 h-4" />}
                {s.platform === 'facebook' && <Facebook className="w-4 h-4" />}
                {s.platform === 'linkedin' && <Linkedin className="w-4 h-4" />}
                {s.platform === 'twitter' && <Twitter className="w-4 h-4" />}
                {s.platform === 'phone' && <Phone className="w-4 h-4" />}
              </a>
            ))}
          </div>
        )}

        {/* Lista de Enlaces / Bloques */}
        <div className="space-y-3 pt-4">
          {(profile.blocks || [])
            .filter((b) => b.isActive)
            .map((block) => {
              // Caso 1: Título de Sección
              if (block.type === 'header') {
                return (
                  <div key={block.id} className="pt-3 pb-1 text-center">
                    <span className={`text-xs uppercase font-black tracking-wider opacity-75 ${theme.textClass}`}>
                      {block.title}
                    </span>
                  </div>
                );
              }

              // Caso 2: Divisor
              if (block.type === 'divider') {
                return (
                  <div key={block.id} className="my-2 border-t border-white/20" />
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
                    onClick={() => handleBlockClick(block.id, block.url)}
                    style={theme.cardStyle}
                    className={`w-full overflow-hidden block text-left transition-all hover:scale-[1.02] cursor-pointer group shadow-sm ${shapeClass}`}
                  >
                    {block.imageUrl ? (
                      <img src={block.imageUrl} alt={block.title} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-24 bg-white/10 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 opacity-60" />
                      </div>
                    )}
                    <div className="p-3.5 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <span className="block text-sm font-black truncate">{block.title}</span>
                        {block.subtitle && (
                          <span className="block text-[11px] opacity-75 truncate mt-0.5">
                            {block.subtitle}
                          </span>
                        )}
                      </div>
                      <ArrowUpRight className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-all shrink-0 ml-2" />
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
                  onClick={() => handleBlockClick(block.id, block.url)}
                  style={theme.cardStyle}
                  className={`w-full py-3.5 px-5 flex items-center justify-between text-left transition-all hover:scale-[1.02] cursor-pointer group shadow-sm ${shapeClass} ${
                    block.animation === 'pulse' ? 'animate-pulse' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0">
                      {renderPublicBlockLucideIcon(block, 'w-4 h-4')}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-sm font-black truncate">
                        {block.title}
                      </span>
                      {block.subtitle && (
                        <span className="block text-[11px] opacity-75 truncate mt-0.5">
                          {block.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {block.badgeText ? (
                    <span
                      style={theme.badgeStyle}
                      className="px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ml-2 shadow-xs"
                    >
                      {block.badgeText}
                    </span>
                  ) : (
                    <ArrowUpRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
                  )}
                </a>
              );
            })}
        </div>
      </div>

      {/* Footer Branding Sutil */}
      <footer className="pt-12 text-center text-xs opacity-60 text-white font-bold">
        <span>Creado con </span>
        <span className="underline decoration-indigo-400 underline-offset-4">
          Roma Agency Studio
        </span>
      </footer>

      {/* Modal de Compartir */}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Compartir Perfil Oficial
              </h3>
              <button
                type="button"
                onClick={() => setIsShareOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 truncate">
                  {window.location.href}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 ml-2 shrink-0 cursor-pointer"
                >
                  {copied ? (
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

              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Conoce nuestro perfil oficial: ${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Perfil Oficial Roma')}`}
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
