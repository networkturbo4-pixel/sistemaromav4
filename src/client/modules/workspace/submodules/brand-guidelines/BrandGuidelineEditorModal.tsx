import React, { useState, useEffect } from 'react';
import {
  X, Lock, KeyRound, Palette, Type, Plus, Trash2, Check, Sparkles,
  Smartphone, Monitor, Shirt, Upload, HardDrive, Image as ImageIcon,
  ShieldCheck, Sliders, FolderCheck, ExternalLink, Maximize2, Minimize2,
  ClipboardPaste, Eye, Search, Filter, Layers, Tag, PlusCircle, Wand2,
  SlidersHorizontal, CheckCircle2
} from 'lucide-react';
import {
  BrandGuideline,
  BrandGuidelineColor,
  BrandGuidelineDontRule,
  BrandGuidelineFont,
  BrandGuidelineGoal,
  BrandGuidelineOtherIdea,
  BrandGuidelineStep,
  BrandGuidelineLogoVersion,
  BrandGuidelineCustomMockup,
} from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';
import { DriveFolderPickerModal } from '../../../../components/DriveFolderPickerModal';

export interface MockupCatalogTemplate {
  id: string;
  title: string;
  category: 'textil' | 'vehiculos' | 'promocional' | 'papeleria' | 'packaging' | 'outdoor';
  categoryLabel: string;
  mockupImageUrl: string;
  defaultPosition: 'chest_left' | 'center_large' | 'back_print' | 'full' | 'subtle';
  defaultScale: number;
  defaultBlendMode: 'normal' | 'multiply' | 'screen';
  defaultLogoType: 'primary' | 'secondary' | 'symbol' | 'symbol_dark' | 'favicon';
  description: string;
}

export const MOCKUP_CATALOG_TEMPLATES: MockupCatalogTemplate[] = [
  {
    id: 'tpl_chaleco',
    title: 'Chaleco Corporativo Softshell',
    category: 'textil',
    categoryLabel: 'Textil & Indumentaria',
    mockupImageUrl: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'chest_left',
    defaultScale: 90,
    defaultBlendMode: 'screen',
    defaultLogoType: 'symbol',
    description: 'Chaleco técnico para staff y directiva con bordado en pecho izquierdo.',
  },
  {
    id: 'tpl_polo_negro',
    title: 'Polo Oversize Streetwear Negro 300g',
    category: 'textil',
    categoryLabel: 'Textil & Indumentaria',
    mockupImageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 100,
    defaultBlendMode: 'screen',
    defaultLogoType: 'primary',
    description: 'Camiseta de corte contemporáneo boxy con serigrafía tacto cero en pecho.',
  },
  {
    id: 'tpl_polo_blanco',
    title: 'Camiseta Algodón Peinado Blanca',
    category: 'textil',
    categoryLabel: 'Textil & Indumentaria',
    mockupImageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'chest_left',
    defaultScale: 85,
    defaultBlendMode: 'multiply',
    defaultLogoType: 'secondary',
    description: 'Prenda ligera de uso diario con estampado de escudo a color.',
  },
  {
    id: 'tpl_hoodie',
    title: 'Hoodie Canguro Heavyweight Franela',
    category: 'textil',
    categoryLabel: 'Textil & Indumentaria',
    mockupImageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 110,
    defaultBlendMode: 'screen',
    defaultLogoType: 'primary',
    description: 'Polera con capucha y bolsillo canguro, estampada en gran formato.',
  },
  {
    id: 'tpl_gorra',
    title: 'Gorra Estructurada 6 Paneles',
    category: 'textil',
    categoryLabel: 'Textil & Indumentaria',
    mockupImageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 80,
    defaultBlendMode: 'normal',
    defaultLogoType: 'symbol',
    description: 'Gorra deportiva estructurada con bordado frontal en relieve.',
  },
  {
    id: 'tpl_van',
    title: 'Furgoneta Comercial de Reparto (Van)',
    category: 'vehiculos',
    categoryLabel: 'Vehículos & Flota',
    mockupImageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'full',
    defaultScale: 95,
    defaultBlendMode: 'normal',
    defaultLogoType: 'primary',
    description: 'Rotulación integral de laterales para vehículos de transporte y distribución.',
  },
  {
    id: 'tpl_pickup',
    title: 'Camioneta Pickup de Operaciones',
    category: 'vehiculos',
    categoryLabel: 'Vehículos & Flota',
    mockupImageUrl: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 90,
    defaultBlendMode: 'normal',
    defaultLogoType: 'primary',
    description: 'Vehículo de terreno con distintivo institucional en puertas laterales.',
  },
  {
    id: 'tpl_llavero',
    title: 'Llavero Metálico Acero Grabado Láser',
    category: 'promocional',
    categoryLabel: 'Promocionales & Merch',
    mockupImageUrl: 'https://images.unsplash.com/photo-1614313511387-1436a4480ebb?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 75,
    defaultBlendMode: 'multiply',
    defaultLogoType: 'symbol_dark',
    description: 'Accesorio de merchandising premium con grabado láser en bajo relieve.',
  },
  {
    id: 'tpl_termo',
    title: 'Termo Metálico / Botella Inox 750ml',
    category: 'promocional',
    categoryLabel: 'Promocionales & Merch',
    mockupImageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 85,
    defaultBlendMode: 'screen',
    defaultLogoType: 'symbol',
    description: 'Botella térmica de doble capa para clientes VIP y bienvenida a colaboradores.',
  },
  {
    id: 'tpl_taza',
    title: 'Taza Cerámica de Café Mate 11oz',
    category: 'promocional',
    categoryLabel: 'Promocionales & Merch',
    mockupImageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 90,
    defaultBlendMode: 'multiply',
    defaultLogoType: 'secondary',
    description: 'Vajilla para oficina o locales gastronómicos con acabado esmaltado mate.',
  },
  {
    id: 'tpl_bolsa',
    title: 'Bolsa Kraft Ecológica con Asas Retorcidas',
    category: 'packaging',
    categoryLabel: 'Packaging & Bolsas',
    mockupImageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 100,
    defaultBlendMode: 'multiply',
    defaultLogoType: 'secondary',
    description: 'Bolsa de papel kraft reciclado 140g para compras retail y take away.',
  },
  {
    id: 'tpl_caja',
    title: 'Caja de Envíos E-Commerce Postal',
    category: 'packaging',
    categoryLabel: 'Packaging & Bolsas',
    mockupImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 105,
    defaultBlendMode: 'multiply',
    defaultLogoType: 'secondary',
    description: 'Empaque de cartón corrugado automontable con faja o cinta personalizada.',
  },
  {
    id: 'tpl_vaso',
    title: 'Vaso Doble Pared Térmico Take-Away 16oz',
    category: 'packaging',
    categoryLabel: 'Packaging & Bolsas',
    mockupImageUrl: 'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 85,
    defaultBlendMode: 'normal',
    defaultLogoType: 'primary',
    description: 'Vaso descartable compostable para cafetería con faja texturizada.',
  },
  {
    id: 'tpl_papeleria',
    title: 'Papelería Ejecutiva & Tarjetas de Presentación',
    category: 'papeleria',
    categoryLabel: 'Papelería Corporativa',
    mockupImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 90,
    defaultBlendMode: 'normal',
    defaultLogoType: 'secondary',
    description: 'Set de tarjetas en cartulina dúplex 600g con stamping y sobres a juego.',
  },
  {
    id: 'tpl_billboard',
    title: 'Valla Publicitaria Exterior (Billboard)',
    category: 'outdoor',
    categoryLabel: 'Publicidad Exterior (OOH)',
    mockupImageUrl: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=1000&auto=format&fit=crop&q=80',
    defaultPosition: 'center_large',
    defaultScale: 110,
    defaultBlendMode: 'screen',
    defaultLogoType: 'primary',
    description: 'Panel de gran formato urbano con iluminación nocturna y alto impacto.',
  },
];

interface BrandGuidelineEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  guideline?: BrandGuideline | null;
  onSaved: () => void;
}

// Conversor automático HEX -> RGB, CMYK y aproximación Pantone
export function hexToColorSpecs(hexInput: string): { rgb: string; cmyk: string; pantone: string } {
  const clean = hexInput.replace('#', '').trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return { rgb: '0, 0, 0', cmyk: '0, 0, 0, 100', pantone: 'Black C' };
  }
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const k = 1 - Math.max(rNorm, gNorm, bNorm);

  let c = 0;
  let m = 0;
  let y = 0;
  if (k < 1) {
    c = Math.round(((1 - rNorm - k) / (1 - k)) * 100);
    m = Math.round(((1 - gNorm - k) / (1 - k)) * 100);
    y = Math.round(((1 - bNorm - k) / (1 - k)) * 100);
  }
  const kPct = Math.round(k * 100);

  // Sugerencia inteligente de Pantone según luminosidad y matiz
  let pantone = 'PMS Custom C';
  if (r < 25 && g < 25 && b < 25) pantone = 'Black 6 C';
  else if (r > 240 && g > 240 && b > 240) pantone = 'Bright White';
  else if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12) {
    const grayLevel = Math.max(1, Math.min(11, Math.round(((255 - r) / 255) * 11)));
    pantone = `Cool Gray ${grayLevel} C`;
  } else {
    const code = ((r * 3 + g * 5 + b * 7) % 800) + 100;
    pantone = `PMS ${code} C`;
  }

  return {
    rgb: `${r}, ${g}, ${b}`,
    cmyk: `${c}, ${m}, ${y}, ${kPct}`,
    pantone,
  };
}

const GOOGLE_FONT_OPTIONS = [
  'Inter',
  'Space Grotesk',
  'Plus Jakarta Sans',
  'Montserrat',
  'Outfit',
  'Poppins',
  'Syne',
  'Playfair Display',
  'DM Sans',
];

export const BrandGuidelineEditorModal: React.FC<BrandGuidelineEditorModalProps> = ({
  isOpen,
  onClose,
  guideline,
  onSaved,
}) => {
  const { toast, apiFetch } = useApp();
  const isEditing = Boolean(guideline);

  const [activeTab, setActiveTab] = useState<
    'general' | 'logos' | 'mockup_gallery' | 'pillars' | 'colors' | 'typography' | 'mockups' | 'steps'
  >('general');
  const [saving, setSaving] = useState(false);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [isModalFullscreen, setIsModalFullscreen] = useState(false);

  // Campos Generales
  const [brandName, setBrandName] = useState('');
  const [clientName, setClientName] = useState('');
  const [designerName, setDesignerName] = useState('');
  const [round, setRound] = useState('Round 1');
  const [date, setDate] = useState('');
  const [tagline, setTagline] = useState('');
  const [themeDefault, setThemeDefault] = useState<'dark' | 'light'>('dark');
  const [viewModeDefault, setViewModeDefault] = useState<'deck' | 'grid'>('deck');

  // SEGURIDAD / SWITCHER DE PIN
  const [requirePin, setRequirePin] = useState(false);
  const [publicPin, setPublicPin] = useState('');

  // Logos, Iconos/Isotipos, Favicon, Versiones Personalizadas y Reglas
  const [directionName, setDirectionName] = useState('Direction One');
  const [directionRationale, setDirectionRationale] = useState('');
  const [logoPrimaryUrl, setLogoPrimaryUrl] = useState('');
  const [logoSecondaryUrl, setLogoSecondaryUrl] = useState('');
  const [logoSymbolUrl, setLogoSymbolUrl] = useState('');
  const [logoSymbolDarkUrl, setLogoSymbolDarkUrl] = useState('');
  const [logoFaviconUrl, setLogoFaviconUrl] = useState('');
  const [logoVersions, setLogoVersions] = useState<BrandGuidelineLogoVersion[]>([]);
  const [mockupStampMode, setMockupStampMode] = useState<'auto' | 'symbol_only' | 'full_logo'>('auto');
  const [otherIdeas, setOtherIdeas] = useState<BrandGuidelineOtherIdea[]>([]);
  const [activePasteSlot, setActivePasteSlot] = useState<string>('symbol');
  const [livePreviewColorway, setLivePreviewColorway] = useState<'obsidian' | 'offwhite' | 'brand'>('obsidian');
  const [isRebrand, setIsRebrand] = useState(false);
  const [logoBeforeUrl, setLogoBeforeUrl] = useState('');
  const [brandBeforeLabel, setBrandBeforeLabel] = useState('Identidad Anterior');
  const [clearspaceUnit, setClearspaceUnit] = useState('1x');
  const [stampPosition, setStampPosition] = useState<'chest_left' | 'center_large' | 'back_print'>('chest_left');
  const [stampScale, setStampScale] = useState(100);
  const [photoSceneMode, setPhotoSceneMode] = useState<'studio_3d' | 'urban_model' | 'coffee_shop' | 'creative_office'>('studio_3d');
  const [iconStrokeWidth, setIconStrokeWidth] = useState('2px');
  const [iconCornerRadius, setIconCornerRadius] = useState('6px');
  const [donts, setDonts] = useState<BrandGuidelineDontRule[]>([]);

  // Galería de Mockups Fotográficos
  const [mockupGalleryItems, setMockupGalleryItems] = useState<BrandGuidelineCustomMockup[]>([]);
  const [mockupSearchQuery, setMockupSearchQuery] = useState('');
  const [mockupCategoryFilter, setMockupCategoryFilter] = useState<string>('todos');
  const [activeMockupConfig, setActiveMockupConfig] = useState<BrandGuidelineCustomMockup | null>(null);

  // Brief
  const [briefOverviewTitle, setBriefOverviewTitle] = useState('');
  const [briefOverviewText, setBriefOverviewText] = useState('');
  const [briefSecondaryText, setBriefSecondaryText] = useState('');

  // Pilares
  const [goals, setGoals] = useState<BrandGuidelineGoal[]>([]);

  // Colores
  const [colors, setColors] = useState<BrandGuidelineColor[]>([]);

  // Tipografías
  const [typography, setTypography] = useState<BrandGuidelineFont[]>([]);

  // KPI, Mockups y Google Drive Kit
  const [statNumber, setStatNumber] = useState('');
  const [statLabel, setStatLabel] = useState('');
  const [mockupMobileUrlWebsite, setMockupMobileUrlWebsite] = useState('');
  const [mockupMobileScreenUrl, setMockupMobileScreenUrl] = useState('');
  const [mockupDesktopScreenUrl, setMockupDesktopScreenUrl] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveFolderName, setDriveFolderName] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');

  // Próximos pasos
  const [nextSteps, setNextSteps] = useState<BrandGuidelineStep[]>([]);

  const DEFAULT_SPANISH_STEPS: BrandGuidelineStep[] = [
    {
      id: 'ns1',
      step: '01',
      title: 'Revisión y Comentarios',
      description: 'Comparte tus apreciaciones sobre la propuesta de identidad visual y sus aplicaciones.',
    },
    {
      id: 'ns2',
      step: '02',
      title: 'Ajustes y Refinamiento (si aplica)',
      description: 'Realizaremos los ajustes necesarios según tus comentarios y prioridades de marca.',
    },
    {
      id: 'ns3',
      step: '03',
      title: 'Aprobación Oficial',
      description: 'Una vez aprobada la identidad, prepararemos los artes finales y vectores de producción.',
    },
    {
      id: 'ns4',
      step: '04',
      title: 'Entrega de Archivos Editables',
      description: 'Entrega del kit completo de marca (.AI, .SVG, .PNG, .PDF, fuentes y manual de uso).',
    },
  ];

  const DEFAULT_SPANISH_GOALS: BrandGuidelineGoal[] = [
    {
      id: 'g1',
      number: '01',
      title: 'Modernización Visual',
      description:
        'Actualizar la identidad visual y verbal de la marca para proyectar solidez, modernidad y cercanía con su audiencia actual.',
    },
    {
      id: 'g2',
      number: '02',
      title: 'Diferenciación Competitiva',
      description:
        'Destacar con claridad en el mercado enfatizando el posicionamiento único, los valores y la propuesta de valor frente a la competencia.',
    },
    {
      id: 'g3',
      number: '03',
      title: 'Versatilidad y Claridad',
      description:
        'Consolidar un sistema gráfico limpio, memorable y adaptable a soportes digitales, impresos, textiles y redes sociales.',
    },
  ];

  const translateLegacyStep = (s: BrandGuidelineStep, idx: number): BrandGuidelineStep => {
    const t = (s.title || '').trim();
    const d = (s.description || '').trim();
    const mapTitle: Record<string, string> = {
      'Review & Feedback': 'Revisión y Comentarios',
      'Revisions (if necessary)': 'Ajustes y Refinamiento (si aplica)',
      'Final Approval': 'Aprobación Oficial',
      'File Delivery': 'Entrega de Archivos Editables',
    };
    const mapDesc: Record<string, string> = {
      'Share your thoughts on the logo design.':
        'Comparte tus apreciaciones sobre la propuesta de identidad visual y sus aplicaciones.',
      'Share your thoughts on the logo design. Let us know if any refinements are needed.':
        'Comparte tus apreciaciones sobre la propuesta de identidad visual y sus aplicaciones.',
      'We will refine the design based on your feedback.':
        'Realizaremos los ajustes necesarios según tus comentarios y prioridades de marca.',
      'We will refine the design based on your feedback and aesthetic priorities.':
        'Realizaremos los ajustes necesarios según tus comentarios y prioridades de marca.',
      'Once approved, we will proceed with finalizing vectors.':
        'Una vez aprobada la identidad, prepararemos los artes finales y vectores de producción.',
      'Once approved, we will proceed with finalizing the logo suite and production vectors.':
        'Una vez aprobada la identidad, prepararemos los artes finales y vectores de producción.',
      'Delivery of all logo formats and production assets.':
        'Entrega del kit completo de marca (.AI, .SVG, .PNG, .PDF, fuentes y manual de uso).',
      'You will receive all logo formats for print, digital, mobile, and branding guidelines.':
        'Entrega del kit completo de marca (.AI, .SVG, .PNG, .PDF, fuentes y manual de uso).',
    };
    return {
      ...s,
      id: s.id || `ns_${idx + 1}`,
      step: s.step || String(idx + 1).padStart(2, '0'),
      title: mapTitle[t] || t,
      description: mapDesc[d] || d,
    };
  };

  const translateLegacyGoal = (g: BrandGuidelineGoal, idx: number): BrandGuidelineGoal => {
    const t = (g.title || '').trim();
    const mapTitle: Record<string, { title: string; desc: string }> = {
      Modernization: {
        title: 'Modernización Visual',
        desc: 'Actualizar la identidad visual y verbal de la marca para proyectar solidez, modernidad y cercanía con su audiencia actual.',
      },
      'Competitive Differentiation': {
        title: 'Diferenciación Competitiva',
        desc: 'Destacar con claridad en el mercado enfatizando el posicionamiento único, los valores y la propuesta de valor frente a la competencia.',
      },
      Simplification: {
        title: 'Versatilidad y Claridad',
        desc: 'Consolidar un sistema gráfico limpio, memorable y adaptable a soportes digitales, impresos, textiles y redes sociales.',
      },
    };
    if (mapTitle[t]) {
      return {
        ...g,
        id: g.id || `g_${idx + 1}`,
        number: g.number || String(idx + 1).padStart(2, '0'),
        title: mapTitle[t].title,
        description: mapTitle[t].desc,
      };
    }
    return g;
  };

  useEffect(() => {
    if (guideline) {
      setBrandName(guideline.brandName || '');
      setClientName(guideline.clientName || '');
      setDesignerName(guideline.designerName || '');
      setRound(
        guideline.round === 'Round 1' ? 'Ronda 1' : guideline.round || 'Ronda 1'
      );
      setDate(guideline.date || '');
      setTagline(guideline.tagline || '');
      setThemeDefault(guideline.themeDefault || 'dark');
      setViewModeDefault(guideline.viewModeDefault || 'deck');
      setRequirePin(Boolean(guideline.requirePin));
      setPublicPin(guideline.publicPin || '');
      setDirectionName(
        !guideline.directionName || guideline.directionName === 'Direction One'
          ? 'Propuesta Principal'
          : guideline.directionName
      );
      setDirectionRationale(
        !guideline.directionRationale ||
          guideline.directionRationale.startsWith('This direction provides a brief overview')
          ? 'Esta propuesta sintetiza la esencia, los valores y la personalidad de la marca mediante una construcción geométrica equilibrada, garantizando máxima legibilidad y pregnancia tanto en medios digitales como impresos.'
          : guideline.directionRationale
      );
      setLogoPrimaryUrl(guideline.logoPrimaryUrl || '');
      setLogoSecondaryUrl(guideline.logoSecondaryUrl || '');
      setLogoSymbolUrl(guideline.logoSymbolUrl || '');
      setLogoSymbolDarkUrl(guideline.logoSymbolDarkUrl || '');
      setLogoFaviconUrl(guideline.logoFaviconUrl || '');
      setLogoVersions(guideline.logoVersions || []);
      setMockupGalleryItems(guideline.mockupGalleryItems || []);
      setMockupStampMode(guideline.mockupStampMode || 'auto');
      setOtherIdeas(
        guideline.otherIdeas && guideline.otherIdeas.length > 0
          ? guideline.otherIdeas.map((idea, idx) => ({
              ...idea,
              title:
                idea.title === 'Modular Quadrant'
                  ? 'Isotipo Principal 01'
                  : idea.title === 'Dynamic Checkered Matrix'
                  ? 'Monograma 02'
                  : idea.title === 'Architectural Geometric Petals'
                  ? 'Sello / Emblema 03'
                  : idea.title === 'Hourglass Convergence'
                  ? 'Icono App / Favicon 04'
                  : idea.title === 'Falcon Monogram Shield'
                  ? 'Símbolo Simplificado 05'
                  : idea.title === 'Crossed Kinetic Ribbon'
                  ? 'Marca de Agua 06'
                  : idea.title || `Icono 0${idx + 1}`,
            }))
          : [
              { id: 'oi1', title: 'Isotipo Principal / Variación 01', imageUrl: '' },
              { id: 'oi2', title: 'Monograma / Variación 02', imageUrl: '' },
              { id: 'oi3', title: 'Sello / Emblema 03', imageUrl: '' },
              { id: 'oi4', title: 'Icono App / Favicon 04', imageUrl: '' },
              { id: 'oi5', title: 'Símbolo Simplificado 05', imageUrl: '' },
              { id: 'oi6', title: 'Marca de Agua / Símbolo 06', imageUrl: '' },
            ]
      );
      setIsRebrand(Boolean(guideline.isRebrand));
      setLogoBeforeUrl(guideline.logoBeforeUrl || '');
      setBrandBeforeLabel(
        !guideline.brandBeforeLabel || guideline.brandBeforeLabel.startsWith('Legacy Brand')
          ? 'Identidad Anterior'
          : guideline.brandBeforeLabel
      );
      setClearspaceUnit(guideline.clearspaceUnit || '1x');
      setStampPosition(guideline.stampPosition || 'chest_left');
      setStampScale(guideline.stampScale || 100);
      setPhotoSceneMode(guideline.photoSceneMode || 'studio_3d');
      setIconStrokeWidth(guideline.iconStrokeWidth || '2px');
      setIconCornerRadius(guideline.iconCornerRadius || '6px');
      setDonts(
        guideline.donts && guideline.donts.length > 0
          ? guideline.donts.map((d) => ({
              ...d,
              title:
                d.title === 'Do not stretch or distort proportions'
                  ? 'No deformar ni estirar horizontal/verticalmente'
                  : d.title === 'Do not rotate or tilt at arbitrary angles'
                  ? 'No inclinar ni rotar en ángulos arbitrarios'
                  : d.title === 'Do not apply unauthorized gradients or colors'
                  ? 'No alterar los colores oficiales de la marca'
                  : d.title === 'Do not add heavy drop shadows or outlines'
                  ? 'No aplicar sombras paralelas ni trazos invasivos'
                  : d.title === 'Do not place on low-contrast backgrounds'
                  ? 'No usar sobre fondos sin contraste suficiente'
                  : d.title === 'Do not rearrange symbol and logotype lockup'
                  ? 'No alterar la proporción entre isotipo y logotipo'
                  : d.title,
            }))
          : [
              { id: 'd1', title: 'No deformar ni estirar horizontal/verticalmente', ruleType: 'stretch' },
              { id: 'd2', title: 'No inclinar ni rotar en ángulos arbitrarios', ruleType: 'rotate' },
              { id: 'd3', title: 'No alterar los colores oficiales de la marca', ruleType: 'recolor' },
              { id: 'd4', title: 'No aplicar sombras paralelas ni trazos invasivos', ruleType: 'shadow' },
              { id: 'd5', title: 'No usar sobre fondos sin contraste suficiente', ruleType: 'contrast' },
              { id: 'd6', title: 'No alterar la proporción entre isotipo y logotipo', ruleType: 'rearrange' },
            ]
      );
      setBriefOverviewTitle(
        !guideline.briefOverviewTitle ||
          guideline.briefOverviewTitle.startsWith('A brief project summary')
          ? 'Resumen ejecutivo del proyecto de identidad visual, destacando el propósito, alcance y objetivos estratégicos de la marca.'
          : guideline.briefOverviewTitle
      );
      setBriefOverviewText(
        !guideline.briefOverviewText ||
          guideline.briefOverviewText.startsWith('This project overview provides')
          ? 'Este resumen describe el propósito y los objetivos clave de la identidad visual. Destaca los pilares de posicionamiento, modernización y proyección comercial alineados con los valores esenciales de la organización.'
          : guideline.briefOverviewText
      );
      setBriefSecondaryText(
        !guideline.briefSecondaryText ||
          guideline.briefSecondaryText.startsWith('Additionally, this section describes')
          ? 'Asimismo, esta sección define el estilo visual, el carácter tipográfico y cómo el nuevo sistema gráfico se adapta con coherencia a todos los puntos de contacto físicos y digitales.'
          : guideline.briefSecondaryText
      );
      setGoals(
        guideline.goals && guideline.goals.length > 0
          ? guideline.goals.map(translateLegacyGoal)
          : DEFAULT_SPANISH_GOALS
      );
      setColors(guideline.colors || []);
      setTypography(
        (guideline.typography || []).map((f) => ({
          ...f,
          sampleText:
            !f.sampleText || f.sampleText.startsWith('The quick brown fox')
              ? 'El veloz murciélago hindú comía feliz cardillo y kiwi'
              : f.sampleText,
        }))
      );
      setStatNumber(guideline.statNumber || '+100%');
      setStatLabel(
        !guideline.statLabel || guideline.statLabel.startsWith('Key performance metric')
          ? 'Indicador clave de posicionamiento, alcance e impacto visual de la marca'
          : guideline.statLabel
      );
      setMockupMobileUrlWebsite(guideline.mockupMobileUrlWebsite || '');
      setMockupMobileScreenUrl(guideline.mockupMobileScreenUrl || '');
      setMockupDesktopScreenUrl(guideline.mockupDesktopScreenUrl || '');
      setDriveFolderId(guideline.driveFolderId || '');
      setDriveFolderName(guideline.driveFolderName || '');
      setDriveFolderUrl(guideline.driveFolderUrl || '');
      setNextSteps(
        guideline.nextSteps && guideline.nextSteps.length > 0
          ? guideline.nextSteps.map(translateLegacyStep)
          : DEFAULT_SPANISH_STEPS
      );
    } else {
      setBrandName('');
      setClientName('');
      setDesignerName('Equipo Creativo Roma');
      setRound('Ronda 1');
      setDate(new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
      setTagline('');
      setThemeDefault('dark');
      setViewModeDefault('deck');
      setRequirePin(true);
      setPublicPin('1234');
      setDirectionName('Propuesta Principal');
      setDirectionRationale(
        'Esta propuesta sintetiza la esencia, los valores y la personalidad de la marca mediante una construcción geométrica equilibrada, garantizando máxima legibilidad y pregnancia tanto en medios digitales como impresos.'
      );
      setLogoPrimaryUrl('');
      setLogoSecondaryUrl('');
      setLogoSymbolUrl('');
      setLogoSymbolDarkUrl('');
      setLogoFaviconUrl('');
      setLogoVersions([]);
      setMockupGalleryItems([]);
      setMockupStampMode('auto');
      setOtherIdeas([
        { id: 'oi1', title: 'Isotipo Principal / Variación 01', imageUrl: '' },
        { id: 'oi2', title: 'Monograma / Variación 02', imageUrl: '' },
        { id: 'oi3', title: 'Sello / Emblema 03', imageUrl: '' },
        { id: 'oi4', title: 'Icono App / Favicon 04', imageUrl: '' },
        { id: 'oi5', title: 'Símbolo Simplificado 05', imageUrl: '' },
        { id: 'oi6', title: 'Marca de Agua / Símbolo 06', imageUrl: '' },
      ]);
      setIsRebrand(false);
      setLogoBeforeUrl('');
      setBrandBeforeLabel('Identidad Anterior');
      setClearspaceUnit('1x');
      setStampPosition('chest_left');
      setStampScale(100);
      setPhotoSceneMode('studio_3d');
      setIconStrokeWidth('2px');
      setIconCornerRadius('6px');
      setDonts([
        { id: 'd1', title: 'No deformar ni estirar horizontal/verticalmente', ruleType: 'stretch' },
        { id: 'd2', title: 'No inclinar ni rotar en ángulos arbitrarios', ruleType: 'rotate' },
        { id: 'd3', title: 'No alterar los colores oficiales de la marca', ruleType: 'recolor' },
        { id: 'd4', title: 'No aplicar sombras paralelas ni trazos invasivos', ruleType: 'shadow' },
        { id: 'd5', title: 'No usar sobre fondos sin contraste suficiente', ruleType: 'contrast' },
        { id: 'd6', title: 'No alterar la proporción entre isotipo y logotipo', ruleType: 'rearrange' },
      ]);
      setBriefOverviewTitle(
        'Resumen ejecutivo del proyecto de identidad visual, destacando el propósito, alcance y objetivos estratégicos de la marca.'
      );
      setBriefOverviewText(
        'Este resumen describe el propósito y los objetivos clave de la identidad visual. Destaca los pilares de posicionamiento, modernización y proyección comercial alineados con los valores esenciales de la organización.'
      );
      setBriefSecondaryText(
        'Asimismo, esta sección define el estilo visual, el carácter tipográfico y cómo el nuevo sistema gráfico se adapta con coherencia a todos los puntos de contacto físicos y digitales.'
      );
      setGoals(DEFAULT_SPANISH_GOALS);
      setColors([
        { id: '1', name: 'Negro Obsidiana', hex: '#111111', role: 'dark', pantone: 'Black 6 C', rgb: '17, 17, 17', cmyk: '0, 0, 0, 93' },
        { id: '2', name: 'Gris Pizarra', hex: '#636569', role: 'secondary', pantone: 'Cool Gray 9 C', rgb: '99, 101, 105', cmyk: '6, 4, 0, 59' },
        { id: '3', name: 'Plata Neblina', hex: '#CACBCE', role: 'neutral', pantone: 'Cool Gray 3 C', rgb: '202, 203, 206', cmyk: '2, 1, 0, 19' },
        { id: '4', name: 'Lienzo Puro', hex: '#FFFFFF', role: 'light', pantone: 'Bright White', rgb: '255, 255, 255', cmyk: '0, 0, 0, 0' },
      ]);
      setTypography([
        {
          id: '1',
          role: 'headings',
          fontFamily: 'Inter',
          weight: 'Regular / SemiBold',
          sampleText: 'El veloz murciélago hindú comía feliz cardillo y kiwi',
        },
        {
          id: '2',
          role: 'body',
          fontFamily: 'Inter',
          weight: 'Regular',
          sampleText: 'El veloz murciélago hindú comía feliz cardillo y kiwi',
        },
      ]);
      setStatNumber('+100%');
      setStatLabel('Indicador clave de posicionamiento, alcance e impacto visual de la marca');
      setMockupMobileUrlWebsite('www.mimarca.com');
      setMockupMobileScreenUrl('');
      setMockupDesktopScreenUrl('');
      setDriveFolderId('');
      setDriveFolderName('');
      setDriveFolderUrl('');
      setNextSteps(DEFAULT_SPANISH_STEPS);
    }
  }, [guideline, isOpen]);

  // Resuelve qué imagen de logo usar según la selección
  const resolveMockupLogoUrl = (
    logoType: 'primary' | 'secondary' | 'symbol' | 'symbol_dark' | 'favicon' | 'custom_version',
    customVersionId?: string
  ): string => {
    if (logoType === 'custom_version' && customVersionId) {
      const found = logoVersions.find((v) => v.id === customVersionId);
      if (found?.url) return found.url;
    }
    if (logoType === 'secondary') {
      return logoSecondaryUrl || logoPrimaryUrl || logoSymbolDarkUrl || logoSymbolUrl;
    }
    if (logoType === 'symbol') {
      return logoSymbolUrl || logoPrimaryUrl || logoSymbolDarkUrl;
    }
    if (logoType === 'symbol_dark') {
      return logoSymbolDarkUrl || logoSymbolUrl || logoSecondaryUrl || logoPrimaryUrl;
    }
    if (logoType === 'favicon') {
      return logoFaviconUrl || logoSymbolUrl || logoPrimaryUrl;
    }
    return logoPrimaryUrl || logoSymbolUrl || logoSecondaryUrl;
  };

  // Posiciona y escala el estampado en el mockup
  const getMockupStampStyle = (
    pos: 'chest_left' | 'center_large' | 'back_print' | 'full' | 'subtle' = 'center_large',
    scale: number = 100,
    blendMode: 'normal' | 'multiply' | 'screen' = 'normal'
  ): React.CSSProperties => {
    const scaleRatio = (scale || 100) / 100;
    const base: React.CSSProperties = {
      position: 'absolute',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      mixBlendMode: blendMode,
    };
    switch (pos) {
      case 'chest_left':
        return {
          ...base,
          top: '36%',
          left: '38%',
          width: `${Math.round(20 * scaleRatio)}%`,
          height: `${Math.round(20 * scaleRatio)}%`,
        };
      case 'center_large':
        return {
          ...base,
          top: '46%',
          left: '50%',
          width: `${Math.round(36 * scaleRatio)}%`,
          height: `${Math.round(36 * scaleRatio)}%`,
        };
      case 'back_print':
        return {
          ...base,
          top: '42%',
          left: '50%',
          width: `${Math.round(44 * scaleRatio)}%`,
          height: `${Math.round(44 * scaleRatio)}%`,
        };
      case 'full':
        return {
          ...base,
          top: '50%',
          left: '50%',
          width: `${Math.round(52 * scaleRatio)}%`,
          height: `${Math.round(52 * scaleRatio)}%`,
        };
      case 'subtle':
        return {
          ...base,
          top: '58%',
          left: '50%',
          width: `${Math.round(22 * scaleRatio)}%`,
          height: `${Math.round(22 * scaleRatio)}%`,
        };
      default:
        return {
          ...base,
          top: '50%',
          left: '50%',
          width: `${Math.round(35 * scaleRatio)}%`,
          height: `${Math.round(35 * scaleRatio)}%`,
        };
    }
  };

  // Auto-rellena de forma inteligente todo el manual según el nombre de la marca
  const handleAutoFillFromBrandName = () => {
    if (!brandName.trim()) {
      toast('Ingresa primero el nombre de la marca en el campo de texto', 'error');
      return;
    }
    const name = brandName.trim();
    const lower = name.toLowerCase();

    let generatedTagline = `Identidad, propósito y excelencia visual para ${name}`;
    let generatedRationale = `La identidad visual de ${name} nace de la convergencia armónica entre vanguardia, solidez y propósito. Su símbolo sintetiza los pilares estratégicos de la marca mediante una estructura geométrica equilibrada y altamente legible en cualquier soporte digital, editorial o promocional.`;
    let bTitle = `Manual de Identidad Visual & Lineamientos de Marca — ${name}`;
    let bText1 = `El presente proyecto de identidad visual establece los estándares normativos para la correcta implementación y consistencia de ${name}. Se enfoca en consolidar una imagen distintiva, moderna y reconocible en todos los puntos de contacto con sus audiencias.`;
    let bText2 = `El sistema combina sobriedad tipográfica y flexibilidad cromática para proyectar confianza, calidad y profesionalismo tanto en aplicaciones impresas y textiles como en plataformas digitales de alto impacto.`;

    let g1Title = 'Modernización y Vanguardia';
    let g1Desc = `Proyectar la nueva etapa de ${name} con una presencia visual moderna, sólida y competitiva.`;
    let g2Title = 'Diferenciación y Memoria';
    let g2Desc = `Destacar con una identidad memorable que conecte de forma inmediata con clientes y aliados.`;
    let g3Title = 'Versatilidad Omnicanal';
    let g3Desc = `Garantizar legibilidad óptima desde formatos mínimos (favicons, app icon) hasta gran escala (rotulación, OOH).`;

    if (
      lower.includes('pizza') ||
      lower.includes('burger') ||
      lower.includes('cafe') ||
      lower.includes('food') ||
      lower.includes('rest') ||
      lower.includes('khalessi')
    ) {
      generatedTagline = `Sabor auténtico, tradición y pasión culinaria`;
      generatedRationale = `El imagotipo de ${name} transmite calidez, apetencia y cercanía a través de líneas fluidas y armonía orgánica, invitando a una experiencia gastronómica memorable y familiar.`;
      g1Title = 'Apetencia y Calidez Visual';
      g1Desc = 'Generar un impacto visual seductor y acogedor que transmita frescura y excelencia culinaria.';
      g2Title = 'Fidelización y Cercanía';
      g2Desc = 'Consolidar un vínculo afectivo duradero entre los comensales y la esencia de la marca.';
      g3Title = 'Empaques y Delivery Premium';
      g3Desc = 'Garantizar que cajas, vasos y bolsas generen una experiencia de unboxing impecable.';
    } else if (
      lower.includes('comercio') ||
      lower.includes('camara') ||
      lower.includes('turismo') ||
      lower.includes('industria') ||
      lower.includes('piura') ||
      lower.includes('huancabamba')
    ) {
      generatedTagline = `Conectamos el potencial productivo y el desarrollo territorial`;
      generatedRationale = `La identidad visual de ${name} nace de la conexión entre el territorio, la representación empresarial y la visión de futuro. Su símbolo aporta solidez institucional y proyección económica sostenible.`;
      g1Title = 'Solidez Institucional';
      g1Desc = 'Transmitir respaldo, representatividad y liderazgo empresarial en toda la región.';
      g2Title = 'Impulso Económico y Red';
      g2Desc = 'Fomentar la cooperación entre socios estratégicos, emprendedores y organismos públicos.';
      g3Title = 'Proyección y Turismo Sostenible';
      g3Desc = 'Poner en valor la riqueza territorial, turística y productiva con estándares de vanguardia.';
    }

    setTagline(generatedTagline);
    setDirectionName('Propuesta Principal');
    setDirectionRationale(generatedRationale);
    setBriefOverviewTitle(bTitle);
    setBriefOverviewText(bText1);
    setBriefSecondaryText(bText2);
    setGoals([
      { id: `g_af1`, number: '01', title: g1Title, description: g1Desc },
      { id: `g_af2`, number: '02', title: g2Title, description: g2Desc },
      { id: `g_af3`, number: '03', title: g3Title, description: g3Desc },
    ]);
    setNextSteps(DEFAULT_SPANISH_STEPS);
    toast(`✨ ¡Todo el manual ha sido auto-rellenado para "${name}"! Puedes personalizar cada pestaña.`, 'success');
  };

  if (!isOpen) return null;

  // Extraer paleta dominante desde un logo cargado usando HTML5 Canvas
  const extractColorsFromLogo = (imgSrc?: string) => {
    const source = imgSrc || logoPrimaryUrl || logoSecondaryUrl || logoSymbolUrl;
    if (!source) {
      toast('Primero sube un logo (PNG/SVG/JPG) para extraer sus colores', 'error');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        const buckets: Record<string, { r: number; g: number; b: number; count: number }> = {};
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 110) continue; // Ignorar píxeles transparentes
          // Cuantizar en bloques de 24 para agrupar tonos cercanos
          const rq = Math.min(255, Math.round(data[i] / 24) * 24);
          const gq = Math.min(255, Math.round(data[i + 1] / 24) * 24);
          const bq = Math.min(255, Math.round(data[i + 2] / 24) * 24);
          const key = `${rq}_${gq}_${bq}`;
          if (!buckets[key]) buckets[key] = { r: rq, g: gq, b: bq, count: 0 };
          buckets[key].count++;
        }

        const sorted = Object.values(buckets)
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        if (sorted.length === 0) {
          toast('No se detectaron colores sólidos suficientes en la imagen', 'error');
          return;
        }

        const roleNames = ['Color Primario', 'Color Secundario', 'Tono de Acento', 'Neutro de Superficie'];
        const extracted: BrandGuidelineColor[] = sorted.map((item, idx) => {
          const hex = `#${item.r.toString(16).padStart(2, '0')}${item.g
            .toString(16)
            .padStart(2, '0')}${item.b.toString(16).padStart(2, '0')}`.toUpperCase();
          const specs = hexToColorSpecs(hex);
          return {
            id: `ext_${Date.now()}_${idx}`,
            name: roleNames[idx] || `Color de Marca ${idx + 1}`,
            hex,
            rgb: specs.rgb,
            cmyk: specs.cmyk,
            pantone: specs.pantone,
          };
        });

        // Asegurar contraste base si hay menos de 4
        if (extracted.length < 4) {
          const darkSpecs = hexToColorSpecs('#111111');
          extracted.push({
            id: `ext_${Date.now()}_dark`,
            name: 'Negro Obsidiana',
            hex: '#111111',
            rgb: darkSpecs.rgb,
            cmyk: darkSpecs.cmyk,
            pantone: darkSpecs.pantone,
          });
        }

        setColors(extracted);
        toast(`¡${extracted.length} colores dominantes extraídos del logo con RGB/CMYK/Pantone!`, 'success');
      } catch {
        toast('No se pudo analizar la imagen automáticamente', 'error');
      }
    };
    img.src = source;
  };

  // Subir archivo local desde PC (PNG/SVG/JPG -> DataURL)
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast('El archivo supera el límite de 15MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
        toast('Imagen cargada y lista para estampar en mockups', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Convierte código XML <svg> (copiado desde Adobe Illustrator o Figma) a DataURL vectorial
  const svgStringToDataUrl = (rawText: string): string | null => {
    const trimmed = rawText.trim();
    const svgMatch = trimmed.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) return null;
    let svgCode = svgMatch[0];
    if (!/xmlns=/i.test(svgCode)) {
      svgCode = svgCode.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    try {
      const encoded = window.btoa(unescape(encodeURIComponent(svgCode)));
      return `data:image/svg+xml;base64,${encoded}`;
    } catch {
      return `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;
    }
  };

  // Pegar con Ctrl+V directamente sobre cualquier caja (Soporta Adobe Illustrator SVG y Capturas de Pantalla PNG)
  const handleClipboardPasteEvent = (
    e: React.ClipboardEvent,
    setter: (val: string) => void,
    slotLabel: string
  ) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // 1. Verificar si viene texto con <svg> (Adobe Illustrator / Figma / Inkscape)
    const plainText = clipboardData.getData('text/plain') || clipboardData.getData('image/svg+xml');
    if (plainText) {
      const svgUrl = svgStringToDataUrl(plainText);
      if (svgUrl) {
        e.preventDefault();
        setter(svgUrl);
        toast(`✨ Vector SVG pegado desde Illustrator en "${slotLabel}"`, 'success');
        return;
      }
      if (/^data:image\//i.test(plainText.trim()) || /^https?:\/\/.+/i.test(plainText.trim())) {
        e.preventDefault();
        setter(plainText.trim());
        toast(`Imagen pegada en "${slotLabel}"`, 'success');
        return;
      }
    }

    // 2. Verificar si viene una imagen o captura de pantalla (Win+Shift+S / PrtScn / Copiar imagen)
    const items = clipboardData.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                setter(reader.result);
                toast(`📸 Captura / Imagen pegada en "${slotLabel}"`, 'success');
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    }
  };

  // Botón directo "Pegar (Illustrator / Captura)" usando la API navigator.clipboard
  const handlePasteButtonClick = async (setter: (val: string) => void, slotLabel: string) => {
    try {
      // 1. Intentar leer items binarios o SVG del portapapeles (Capturas de pantalla o imágenes copiadas)
      if (navigator.clipboard && navigator.clipboard.read) {
        try {
          const clipboardItems = await navigator.clipboard.read();
          for (const item of clipboardItems) {
            // Si hay texto plano con <svg> (Adobe Illustrator copia el vector como texto XML <svg>)
            if (item.types.includes('text/plain')) {
              const textBlob = await item.getType('text/plain');
              const textContent = await textBlob.text();
              const svgUrl = svgStringToDataUrl(textContent);
              if (svgUrl) {
                setter(svgUrl);
                toast(`✨ Vector SVG pegado desde Illustrator en "${slotLabel}"`, 'success');
                return;
              }
            }
            // Si hay imagen PNG/JPEG/SVG (Captura de pantalla Win+Shift+S o copia de imagen)
            const imgType = item.types.find((t) => t.startsWith('image/'));
            if (imgType) {
              const blob = await item.getType(imgType);
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  setter(reader.result);
                  toast(`📸 Captura / Imagen pegada en "${slotLabel}"`, 'success');
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        } catch {
          // Si falla read(), probamos readText() debajo
        }
      }

      // 2. Fallback a navigator.clipboard.readText() para vectores SVG de Illustrator
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const svgUrl = svgStringToDataUrl(text);
          if (svgUrl) {
            setter(svgUrl);
            toast(`✨ Vector SVG pegado desde Illustrator en "${slotLabel}"`, 'success');
            return;
          }
          if (/^data:image\//i.test(text.trim()) || /^https?:\/\/.+/i.test(text.trim())) {
            setter(text.trim());
            toast(`Imagen pegada en "${slotLabel}"`, 'success');
            return;
          }
        }
      }

      toast(
        'Haz clic en el recuadro y presiona Ctrl+V para pegar desde Illustrator o una captura de pantalla',
        'error'
      );
    } catch {
      toast(
        'Haz clic en el recuadro y presiona Ctrl+V en tu teclado para pegar tu vector o captura',
        'error'
      );
    }
  };

  // Soporte Drag & Drop sobre cualquier caja de logo/icono
  const handleDropFile = (
    e: React.DragEvent,
    setter: (val: string) => void,
    slotLabel: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
        toast(`Archivo cargado en "${slotLabel}"`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Subir fuente personalizada (.TTF / .OTF / .WOFF2) desde PC
  const handleCustomFontUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    fontIdx: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      toast('El archivo de fuente supera el límite de 12MB', 'error');
      return;
    }
    const cleanName = file.name.replace(/\.(ttf|otf|woff2|woff)$/i, '').replace(/[^a-zA-Z0-9_-]/g, ' ');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const updated = [...typography];
        updated[fontIdx] = {
          ...updated[fontIdx],
          fontFamily: cleanName || 'CustomBrandFont',
          customFontDataUrl: reader.result,
          customFontFileName: file.name,
        };
        setTypography(updated);
        toast(`Fuente "${file.name}" cargada para el Type Tester y láminas`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      toast('Ingresa el nombre de la marca', 'error');
      return;
    }
    if (requirePin && !publicPin.trim()) {
      toast('Ingresa un PIN numérico o desactiva la protección por PIN', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        brandName: brandName.trim(),
        clientName: clientName.trim() || 'Cliente',
        designerName: designerName.trim(),
        round: round.trim(),
        date: date.trim(),
        tagline: tagline.trim(),
        themeDefault,
        viewModeDefault,
        requirePin,
        publicPin: publicPin.trim(),
        directionName: directionName.trim(),
        directionRationale: directionRationale.trim(),
        logoPrimaryUrl,
        logoSecondaryUrl,
        logoSymbolUrl,
        logoSymbolDarkUrl,
        logoFaviconUrl,
        logoVersions,
        mockupGalleryItems,
        mockupStampMode,
        otherIdeas,
        isRebrand,
        logoBeforeUrl,
        brandBeforeLabel: brandBeforeLabel.trim(),
        clearspaceUnit: clearspaceUnit.trim() || '1x',
        stampPosition,
        stampScale,
        photoSceneMode,
        iconStrokeWidth,
        iconCornerRadius,
        donts,
        briefOverviewTitle,
        briefOverviewText,
        briefSecondaryText,
        goals,
        colors,
        typography,
        statNumber,
        statLabel,
        mockupMobileUrlWebsite,
        mockupMobileScreenUrl,
        mockupDesktopScreenUrl,
        driveFolderId,
        driveFolderName,
        driveFolderUrl,
        nextSteps,
      };

      const url = isEditing
        ? `/api/workspace/brand-guidelines/${guideline!.id}`
        : '/api/workspace/brand-guidelines';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res && res.success) {
        toast(isEditing ? 'Brand Guideline actualizado' : 'Brand Guideline creado exitosamente', 'success');
        onSaved();
        onClose();
      } else {
        throw new Error(res?.error || 'Error al guardar');
      }
    } catch (err: any) {
      console.error('Error saving brand guideline:', err);
      toast(err.message || 'Error al guardar la presentación', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addColor = () => {
    const specs = hexToColorSpecs('#3B82F6');
    setColors([
      ...colors,
      {
        id: `c_${Date.now()}`,
        name: 'Color de Acento',
        hex: '#3B82F6',
        role: 'accent',
        rgb: specs.rgb,
        cmyk: specs.cmyk,
        pantone: specs.pantone,
      },
    ]);
  };

  const removeColor = (id: string) => {
    setColors(colors.filter((c) => c.id !== id));
  };

  // Actualiza color y recalcula automáticamente RGB, CMYK y Pantone si cambia el HEX
  const updateColor = (id: string, field: keyof BrandGuidelineColor, value: string) => {
    setColors(
      colors.map((c) => {
        if (c.id !== id) return c;
        if (field === 'hex') {
          const specs = hexToColorSpecs(value);
          return {
            ...c,
            hex: value,
            rgb: specs.rgb,
            cmyk: specs.cmyk,
            pantone: specs.pantone,
          };
        }
        return { ...c, [field]: value };
      })
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fadeIn ${
        isModalFullscreen ? 'p-0' : 'p-2 sm:p-4 md:p-6'
      }`}
    >
      <div
        className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl overflow-hidden transition-all duration-200 ${
          isModalFullscreen
            ? 'w-screen h-screen max-w-none max-h-none rounded-none border-0'
            : 'w-[96vw] max-w-[1440px] h-[92vh] rounded-3xl'
        }`}
      >
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-bold shadow-md">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                {isEditing
                  ? `Configurar Brand Guideline: ${brandName || guideline?.brandName}`
                  : 'Nuevo Brand Guideline / Pitch Deck Studio'}
              </h3>
              <p className="text-xs text-zinc-500">
                Estudio Widescreen • Auto-estampado en mockups 3D, conversión HEX/RGB/CMYK, Type Tester, Safe Zone y Drive Kit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && guideline?.publicToken && (
              <a
                href={`/brand/${guideline.publicToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ver Vista Pública</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setIsModalFullscreen(!isModalFullscreen)}
              title={isModalFullscreen ? 'Restaurar ventana' : 'Maximizar a pantalla completa'}
              className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition"
            >
              {isModalFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Layout Principal Widescreen: Sidebar Lateral + Panel de Edición */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar de Navegación (Sin barra de scroll horizontal) */}
          <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 p-3 sm:p-4 flex lg:flex-col justify-between shrink-0 overflow-x-auto lg:overflow-y-auto gap-2">
            <div className="flex lg:flex-col gap-1.5 w-full">
              {[
                { id: 'general', label: '1. General y PIN', desc: 'Identidad, cliente y acceso' },
                { id: 'logos', label: '2. Logos y Versiones', desc: `${logoVersions.length} versiones + Favicon` },
                { id: 'mockup_gallery', label: '3. Galería de Mockups', desc: `${mockupGalleryItems.length} mockups activos` },
                { id: 'pillars', label: '4. Brief y Pilares', desc: 'Objetivos y narrativa' },
                { id: 'colors', label: '5. Paleta (Auto RGB/CMYK)', desc: `${colors.length} colores activos` },
                { id: 'typography', label: '6. Tipografía & Tester', desc: `${typography[0]?.fontFamily || 'Inter'}` },
                { id: 'mockups', label: '7. Drive Kit & Web', desc: driveFolderName ? 'Drive vinculado' : 'Entregables y URLs' },
                { id: 'steps', label: '8. Próximos Pasos', desc: `${nextSteps.length} etapas de cierre` },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3.5 py-2.5 rounded-2xl text-left transition cursor-pointer shrink-0 lg:w-full flex flex-col ${
                      isActive
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold whitespace-nowrap">{tab.label}</span>
                    <span
                      className={`text-[10px] hidden lg:block truncate mt-0.5 ${
                        isActive ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'
                      }`}
                    >
                      {tab.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tarjeta de Resumen en Vivo en el Sidebar (Desktop) */}
            <div className="hidden lg:flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900 text-white border border-zinc-800 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  Vista Previa Rápida
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    requirePin
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {requirePin ? `PIN: ${publicPin || 'Activo'}` : 'Público'}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                  {logoSymbolUrl || logoPrimaryUrl ? (
                    <img
                      src={logoSymbolUrl || logoPrimaryUrl}
                      alt="Logo"
                      className="h-6 w-6 object-contain"
                    />
                  ) : (
                    <span className="text-xs font-bold">
                      {(brandName || 'BR').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{brandName || 'Sin nombre'}</p>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {clientName || 'Cliente'} • {round}
                  </p>
                </div>
              </div>

              {/* Mini muestras de color */}
              <div className="flex items-center gap-1 pt-1">
                {colors.slice(0, 6).map((c, i) => (
                  <div
                    key={c.id || i}
                    style={{ backgroundColor: c.hex }}
                    title={`${c.name} (${c.hex})`}
                    className="h-5 flex-1 rounded-md border border-white/15"
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* Contenido Principal Scrolleable y Amplio */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 space-y-6">
          {/* =============================================================== */}
          {/* TAB 1: GENERAL Y SWITCHER DE PIN                                */}
          {/* =============================================================== */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* SECCIÓN DESTACADA: SWITCHER DE PROTECCIÓN CON PIN */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 text-white border border-zinc-800 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold tracking-tight">
                        Proteger Vista Pública con PIN
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Si está activo, el cliente deberá ingresar este PIN confidencial para ver el Pitch Deck.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRequirePin(!requirePin)}
                    className={`w-12 h-6.5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${
                      requirePin ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                        requirePin ? 'translate-x-5.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {requirePin && (
                  <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3 animate-fadeIn">
                    <label className="text-xs font-mono text-zinc-300 shrink-0">
                      PIN de Acceso Confidencial:
                    </label>
                    <div className="relative flex-1 max-w-xs">
                      <input
                        type="text"
                        value={publicPin}
                        onChange={(e) => setPublicPin(e.target.value.replace(/\s+/g, ''))}
                        placeholder="Ej: 1234"
                        maxLength={8}
                        className="w-full px-3.5 py-2 pl-9 rounded-xl bg-zinc-950 border border-zinc-700 font-mono text-sm tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                      <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      (Sugerido: 4 a 8 dígitos)
                    </span>
                  </div>
                )}
              </div>

              {/* Datos de la Marca */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Nombre de la Marca *
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoFillFromBrandName}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                      title="Genera automáticamente eslogan, narrativa, brief y pilares adaptados a este nombre"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>✨ Auto-rellenar todo el manual</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="Ej: PixelTruck"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Cliente / Empresa
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: PixelTruck Logistics SAC"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Diseñador / Estudio Responsable
                  </label>
                  <input
                    type="text"
                    value={designerName}
                    onChange={(e) => setDesignerName(e.target.value)}
                    placeholder="Ej: Roma Agencia Creativa"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Ronda / Versión
                  </label>
                  <input
                    type="text"
                    value={round}
                    onChange={(e) => setRound(e.target.value)}
                    placeholder="Ej: Round 1, Versión Final"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Eslogan o Propuesta de Valor Corta
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Ej: Modern Logistics & Scalable Tech Platform"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Tema Inicial por Defecto
                  </label>
                  <select
                    value={themeDefault}
                    onChange={(e) => setThemeDefault(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none"
                  >
                    <option value="dark">Dark Deck (#111111 - Como en el video)</option>
                    <option value="light">Light Deck (Blanco Inmaculado)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Modo de Visualización por Defecto
                  </label>
                  <select
                    value={viewModeDefault}
                    onChange={(e) => setViewModeDefault(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none"
                  >
                    <option value="deck">Presentación 16:9 (Diapositiva por diapositiva)</option>
                    <option value="grid">Cuadrícula 2x2 (Showreel pliego de 4 slides)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: LOGOS, ICONOS/ISOTIPOS, VISUALIZADOR EN VIVO Y REGLAS    */}
          {/* =============================================================== */}
          {activeTab === 'logos' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 shrink-0" />
                  <span>
                    <strong>Auto-Branding + Pegado directo (Ctrl+V):</strong> Puedes subir PNG/SVG o{' '}
                    <strong>copiar desde Adobe Illustrator (Ctrl+C) / hacer captura de pantalla y pegar (Ctrl+V)</strong>{' '}
                    directamente en cada recuadro de Logo o Icono/Isotipo.
                  </span>
                </div>
                {(logoPrimaryUrl || logoSecondaryUrl || logoSymbolUrl || logoSymbolDarkUrl) && (
                  <button
                    type="button"
                    onClick={() =>
                      extractColorsFromLogo(
                        logoSymbolUrl || logoSymbolDarkUrl || logoPrimaryUrl || logoSecondaryUrl
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-400 transition shrink-0"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Extraer Paleta del Logo / Icono</span>
                  </button>
                )}
              </div>

              {/* SWITCHER: ¿MARCA NUEVA O REBRANDING (ANTES VS DESPUÉS)? */}
              <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                    ¿Es un Rebranding (Comparar Antes vs. Después)?
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Si es una <strong>Marca Nueva desde cero</strong>, mantenlo desactivado para ocultar la lámina comparativa &quot;Antes vs. Después&quot;. Actívalo solo cuando rediseñes un logo existente.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-zinc-500">
                    {isRebrand ? 'Rebranding (Muestra Antes/Después)' : 'Marca Nueva (Sin Antes/Después)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRebrand(!isRebrand)}
                    className={`w-12 h-6.5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
                      isRebrand ? 'bg-amber-500' : 'bg-zinc-400 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
                        isRebrand ? 'translate-x-5.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* =========================================================== */}
              {/* 4 CAJAS DE IDENTIDAD: LOGOS COMPLETOS + ICONOS / ISOTIPOS   */}
              {/* =========================================================== */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    1. Archivos de Identidad: Logo Completo + Icono / Isotipo (Símbolo para Mockups y Presentación)
                  </h4>
                  <span className="text-[11px] font-mono text-amber-500">
                    💡 Haz clic en cualquier recuadro y presiona Ctrl+V para pegar desde Illustrator o Captura
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* 1. Logo Principal Claro (Sobre fondo oscuro) */}
                  <div
                    tabIndex={0}
                    onFocus={() => setActivePasteSlot('primary')}
                    onPaste={(e) => handleClipboardPasteEvent(e, setLogoPrimaryUrl, 'Logo Principal (Claro)')}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropFile(e, setLogoPrimaryUrl, 'Logo Principal (Claro)')}
                    className={`p-3.5 rounded-2xl border transition bg-zinc-950 text-white space-y-2.5 outline-none ${
                      activePasteSlot === 'primary'
                        ? 'border-amber-400 ring-2 ring-amber-400/25'
                        : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Logo Principal (Claro)</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        Fondo Oscuro
                      </span>
                    </div>
                    <div
                      onClick={() => setActivePasteSlot('primary')}
                      className="h-24 rounded-xl border border-dashed border-zinc-700 hover:border-amber-400/60 flex flex-col items-center justify-center p-2 bg-[#111111] cursor-pointer relative"
                    >
                      {logoPrimaryUrl ? (
                        <img src={logoPrimaryUrl} alt="Logo claro" className="max-h-16 object-contain" />
                      ) : (
                        <div className="text-center space-y-1">
                          <span className="text-[10px] font-mono text-zinc-400 block">
                            Clic aquí + Ctrl+V
                          </span>
                          <span className="text-[9px] text-zinc-500 block">
                            (Illustrator / Captura / Archivo)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="flex-1 py-1.5 px-2 rounded-xl bg-white text-zinc-950 text-[11px] font-bold text-center cursor-pointer hover:bg-zinc-200 transition flex items-center justify-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setLogoPrimaryUrl)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePasteButtonClick(setLogoPrimaryUrl, 'Logo Principal (Claro)')}
                        className="py-1.5 px-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Pegar vector copiado de Adobe Illustrator o captura de pantalla"
                      >
                        <ClipboardPaste className="w-3 h-3" />
                        <span>Pegar</span>
                      </button>
                      {logoPrimaryUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoPrimaryUrl('')}
                          className="p-1.5 rounded-xl bg-zinc-800 text-rose-400 hover:bg-zinc-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. Logo Secundario Oscuro (Sobre fondo claro) */}
                  <div
                    tabIndex={0}
                    onFocus={() => setActivePasteSlot('secondary')}
                    onPaste={(e) => handleClipboardPasteEvent(e, setLogoSecondaryUrl, 'Logo Secundario (Oscuro)')}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropFile(e, setLogoSecondaryUrl, 'Logo Secundario (Oscuro)')}
                    className={`p-3.5 rounded-2xl border transition bg-zinc-100 text-zinc-900 space-y-2.5 outline-none ${
                      activePasteSlot === 'secondary'
                        ? 'border-amber-500 ring-2 ring-amber-500/25'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Logo Secundario (Oscuro)</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600">
                        Fondo Claro
                      </span>
                    </div>
                    <div
                      onClick={() => setActivePasteSlot('secondary')}
                      className="h-24 rounded-xl border border-dashed border-zinc-300 hover:border-amber-500 flex flex-col items-center justify-center p-2 bg-white cursor-pointer"
                    >
                      {logoSecondaryUrl ? (
                        <img src={logoSecondaryUrl} alt="Logo oscuro" className="max-h-16 object-contain" />
                      ) : (
                        <div className="text-center space-y-1">
                          <span className="text-[10px] font-mono text-zinc-500 block">
                            Clic aquí + Ctrl+V
                          </span>
                          <span className="text-[9px] text-zinc-400 block">
                            (Illustrator / Captura / Archivo)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="flex-1 py-1.5 px-2 rounded-xl bg-zinc-900 text-white text-[11px] font-bold text-center cursor-pointer hover:bg-black transition flex items-center justify-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setLogoSecondaryUrl)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePasteButtonClick(setLogoSecondaryUrl, 'Logo Secundario (Oscuro)')}
                        className="py-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Pegar vector copiado de Adobe Illustrator o captura de pantalla"
                      >
                        <ClipboardPaste className="w-3 h-3" />
                        <span>Pegar</span>
                      </button>
                      {logoSecondaryUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoSecondaryUrl('')}
                          className="p-1.5 rounded-xl bg-zinc-200 text-rose-600 hover:bg-zinc-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3. ICONO / ISOTIPO AISLADO (CLARO / PRINCIPAL) */}
                  <div
                    tabIndex={0}
                    onFocus={() => setActivePasteSlot('symbol')}
                    onPaste={(e) => handleClipboardPasteEvent(e, setLogoSymbolUrl, 'Icono / Isotipo (Claro)')}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropFile(e, setLogoSymbolUrl, 'Icono / Isotipo (Claro)')}
                    className={`p-3.5 rounded-2xl border transition bg-zinc-950 text-white space-y-2.5 outline-none ${
                      activePasteSlot === 'symbol'
                        ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                        : 'border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">★ Icono / Isotipo (Claro)</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        Símbolo Mockups
                      </span>
                    </div>
                    <div
                      onClick={() => setActivePasteSlot('symbol')}
                      className="h-24 rounded-xl border border-dashed border-emerald-500/40 hover:border-emerald-400 flex flex-col items-center justify-center p-2 bg-[#111111] cursor-pointer"
                    >
                      {logoSymbolUrl ? (
                        <img src={logoSymbolUrl} alt="Icono claro" className="max-h-16 object-contain" />
                      ) : (
                        <div className="text-center space-y-1">
                          <span className="text-[10px] font-mono text-emerald-400 block font-bold">
                            Pegar Icono / Símbolo (Ctrl+V)
                          </span>
                          <span className="text-[9px] text-zinc-400 block">
                            Para Gorra, App Icon, Prendas, Retícula
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-500 text-zinc-950 text-[11px] font-bold text-center cursor-pointer hover:bg-emerald-400 transition flex items-center justify-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Subir Icono</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setLogoSymbolUrl)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePasteButtonClick(setLogoSymbolUrl, 'Icono / Isotipo (Claro)')}
                        className="py-1.5 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Pegar icono desde Adobe Illustrator (Ctrl+C) o captura"
                      >
                        <ClipboardPaste className="w-3 h-3" />
                        <span>Pegar</span>
                      </button>
                      {logoSymbolUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoSymbolUrl('')}
                          className="p-1.5 rounded-xl bg-zinc-800 text-rose-400 hover:bg-zinc-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4. ICONO / ISOTIPO AISLADO (OSCURO / COLOR SOBRE FONDO CLARO) */}
                  <div
                    tabIndex={0}
                    onFocus={() => setActivePasteSlot('symbolDark')}
                    onPaste={(e) => handleClipboardPasteEvent(e, setLogoSymbolDarkUrl, 'Icono / Isotipo (Oscuro)')}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropFile(e, setLogoSymbolDarkUrl, 'Icono / Isotipo (Oscuro)')}
                    className={`p-3.5 rounded-2xl border transition bg-zinc-100 text-zinc-900 space-y-2.5 outline-none ${
                      activePasteSlot === 'symbolDark'
                        ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                        : 'border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">★ Icono / Isotipo (Oscuro)</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-600/15 text-emerald-800">
                        Fondo Claro
                      </span>
                    </div>
                    <div
                      onClick={() => setActivePasteSlot('symbolDark')}
                      className="h-24 rounded-xl border border-dashed border-emerald-600/40 hover:border-emerald-600 flex flex-col items-center justify-center p-2 bg-white cursor-pointer"
                    >
                      {logoSymbolDarkUrl ? (
                        <img src={logoSymbolDarkUrl} alt="Icono oscuro" className="max-h-16 object-contain" />
                      ) : (
                        <div className="text-center space-y-1">
                          <span className="text-[10px] font-mono text-emerald-700 block font-bold">
                            Pegar Icono Oscuro (Ctrl+V)
                          </span>
                          <span className="text-[9px] text-zinc-500 block">
                            Para prendas blancas, papelería, bolsas
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="flex-1 py-1.5 px-2 rounded-xl bg-zinc-900 text-white text-[11px] font-bold text-center cursor-pointer hover:bg-black transition flex items-center justify-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Subir Icono</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setLogoSymbolDarkUrl)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePasteButtonClick(setLogoSymbolDarkUrl, 'Icono / Isotipo (Oscuro)')}
                        className="py-1.5 px-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-900 border border-emerald-600/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Pegar icono desde Adobe Illustrator (Ctrl+C) o captura"
                      >
                        <ClipboardPaste className="w-3 h-3" />
                        <span>Pegar</span>
                      </button>
                      {logoSymbolDarkUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoSymbolDarkUrl('')}
                          className="p-1.5 rounded-xl bg-zinc-200 text-rose-600 hover:bg-zinc-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 5. Favicon Oficial (16x16 / 32x32) */}
                  <div
                    tabIndex={0}
                    onFocus={() => setActivePasteSlot('favicon')}
                    onPaste={(e) => handleClipboardPasteEvent(e, setLogoFaviconUrl, 'Favicon Oficial')}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropFile(e, setLogoFaviconUrl, 'Favicon Oficial')}
                    className={`p-3.5 rounded-2xl border transition bg-zinc-950 text-white space-y-2.5 outline-none ${
                      activePasteSlot === 'favicon'
                        ? 'border-cyan-400 ring-2 ring-cyan-400/30'
                        : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400">Favicon Oficial</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        16×16 / Web
                      </span>
                    </div>
                    <div
                      onClick={() => setActivePasteSlot('favicon')}
                      className="h-24 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-400 flex flex-col items-center justify-center p-2 bg-[#111111] cursor-pointer"
                    >
                      {logoFaviconUrl ? (
                        <img src={logoFaviconUrl} alt="Favicon" className="max-h-12 max-w-12 object-contain" />
                      ) : (
                        <div className="text-center space-y-1">
                          <span className="text-[10px] font-mono text-cyan-400 block font-bold">
                            Pegar Favicon (Ctrl+V)
                          </span>
                          <span className="text-[9px] text-zinc-500 block">
                            Icono Web &amp; PWA
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="flex-1 py-1.5 px-2 rounded-xl bg-cyan-500 text-zinc-950 text-[11px] font-bold text-center cursor-pointer hover:bg-cyan-400 transition flex items-center justify-center gap-1">
                        <Upload className="w-3 h-3" />
                        <span>Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setLogoFaviconUrl)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePasteButtonClick(setLogoFaviconUrl, 'Favicon Oficial')}
                        className="py-1.5 px-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Pegar icono desde Illustrator o captura"
                      >
                        <ClipboardPaste className="w-3 h-3" />
                        <span>Pegar</span>
                      </button>
                      {logoFaviconUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoFaviconUrl('')}
                          className="p-1.5 rounded-xl bg-zinc-800 text-rose-400 hover:bg-zinc-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logo Anterior (Solo visible si es Rebranding) */}
                {isRebrand && (
                  <div
                    tabIndex={0}
                    onPaste={(e) => handleClipboardPasteEvent(e, setLogoBeforeUrl, 'Logo Anterior (Antes)')}
                    className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn"
                  >
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        Logo Anterior (Para Slider Comparativo Antes vs. Después)
                      </span>
                      <span className="text-[11px] text-zinc-500 block">
                        Sube o pega con Ctrl+V el logo antiguo del cliente para compararlo con la nueva propuesta.
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-28 h-14 rounded-xl border border-dashed border-zinc-400 flex items-center justify-center p-2 bg-white/60 dark:bg-zinc-900">
                        {logoBeforeUrl ? (
                          <img src={logoBeforeUrl} alt="Logo antes" className="max-h-10 object-contain" />
                        ) : (
                          <span className="text-[9px] font-mono text-zinc-400">Sin imagen</span>
                        )}
                      </div>
                      <label className="py-2 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setLogoBeforeUrl)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePasteButtonClick(setLogoBeforeUrl, 'Logo Anterior')}
                        className="py-2 px-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>Pegar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* =========================================================== */}
              {/* 2. VERSIONES PERSONALIZADAS DEL LOGO & SUBMARCAS            */}
              {/* =========================================================== */}
              <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-500" />
                      <span>2. Versiones Personalizadas del Logo &amp; Submarcas ({logoVersions.length})</span>
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Agrega cuantas versiones adicionales necesites (ej. Versión Monocroma 1 Tinta, Versión Emblema Circular, Submarcas, Bordado). Podrás asignarlas a cualquier mockup de la galería.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextId = `lv_${Date.now()}`;
                      setLogoVersions([
                        ...logoVersions,
                        {
                          id: nextId,
                          name: `Versión Personalizada ${logoVersions.length + 1}`,
                          tag: '1 Tinta',
                          url: '',
                        },
                      ]);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Versión Personalizada</span>
                  </button>
                </div>

                {logoVersions.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-1.5 bg-white/40 dark:bg-zinc-900/40">
                    <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                      No hay versiones personalizadas adicionales creadas.
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Haz clic en <strong>+ Agregar Versión Personalizada</strong> si tienes variantes del logo (horizontales, sellos, submarcas o bordados).
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {logoVersions.map((ver, vIdx) => {
                      const updateVerUrl = (newUrl: string) => {
                        const next = [...logoVersions];
                        next[vIdx] = { ...next[vIdx], url: newUrl };
                        setLogoVersions(next);
                      };
                      const updateVerName = (newName: string) => {
                        const next = [...logoVersions];
                        next[vIdx] = { ...next[vIdx], name: newName };
                        setLogoVersions(next);
                      };
                      const updateVerTag = (newTag: string) => {
                        const next = [...logoVersions];
                        next[vIdx] = { ...next[vIdx], tag: newTag };
                        setLogoVersions(next);
                      };
                      const removeVer = () => {
                        setLogoVersions(logoVersions.filter((_, i) => i !== vIdx));
                      };
                      const slotId = `custom_ver_${ver.id}`;

                      return (
                        <div
                          key={ver.id}
                          tabIndex={0}
                          onFocus={() => setActivePasteSlot(slotId)}
                          onPaste={(e) => handleClipboardPasteEvent(e, updateVerUrl, ver.name)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropFile(e, updateVerUrl, ver.name)}
                          className={`p-3.5 rounded-2xl border transition bg-zinc-950 text-white space-y-2.5 outline-none ${
                            activePasteSlot === slotId
                              ? 'border-amber-400 ring-2 ring-amber-400/25'
                              : 'border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={ver.name}
                              onChange={(e) => updateVerName(e.target.value)}
                              placeholder="Nombre de la versión"
                              className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs font-bold text-white flex-1 min-w-0"
                            />
                            <input
                              type="text"
                              value={ver.tag || ''}
                              onChange={(e) => updateVerTag(e.target.value)}
                              placeholder="Tag / Tipo"
                              className="w-20 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-amber-300 text-center"
                            />
                            <button
                              type="button"
                              onClick={removeVer}
                              className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer"
                              title="Eliminar versión"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div
                            onClick={() => setActivePasteSlot(slotId)}
                            className="h-24 rounded-xl border border-dashed border-zinc-700 hover:border-amber-400/60 bg-[#111111] flex items-center justify-center p-2 cursor-pointer relative"
                          >
                            {ver.url ? (
                              <img src={ver.url} alt={ver.name} className="max-h-16 max-w-full object-contain" />
                            ) : (
                              <div className="text-center space-y-1">
                                <span className="text-[10px] font-mono text-zinc-400 block font-bold">
                                  Clic + Ctrl+V
                                </span>
                                <span className="text-[9px] text-zinc-500 block">
                                  (Illustrator / Captura / Archivo)
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <label className="flex-1 py-1.5 px-2 rounded-xl bg-white text-zinc-950 text-[11px] font-bold text-center cursor-pointer hover:bg-zinc-200 transition flex items-center justify-center gap-1">
                              <Upload className="w-3 h-3" />
                              <span>Subir</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, updateVerUrl)}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handlePasteButtonClick(updateVerUrl, ver.name)}
                              className="py-1.5 px-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Pegar desde portapapeles"
                            >
                              <ClipboardPaste className="w-3 h-3" />
                              <span>Pegar</span>
                            </button>
                            {ver.url && (
                              <button
                                type="button"
                                onClick={() => updateVerUrl('')}
                                className="p-1.5 rounded-xl bg-zinc-800 text-rose-400 hover:bg-zinc-700 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Concepto y Área de Resguardo */}              {/* Concepto y Área de Resguardo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Título de la Propuesta
                  </label>
                  <input
                    type="text"
                    value={directionName}
                    onChange={(e) => setDirectionName(e.target.value)}
                    placeholder="Direction One"
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold"
                  />
                </div>
                {isRebrand && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Etiqueta Slider &quot;Antes&quot;
                    </label>
                    <input
                      type="text"
                      value={brandBeforeLabel}
                      onChange={(e) => setBrandBeforeLabel(e.target.value)}
                      placeholder="Identidad Anterior (2019)"
                      className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Unidad de Safe Zone (Clearspace)
                  </label>
                  <input
                    type="text"
                    value={clearspaceUnit}
                    onChange={(e) => setClearspaceUnit(e.target.value)}
                    placeholder="1x"
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Racional / Narrativa Conceptual del Logo
                </label>
                <textarea
                  rows={3}
                  value={directionRationale}
                  onChange={(e) => setDirectionRationale(e.target.value)}
                  className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                />
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: GALERÍA DE MOCKUPS FOTOGRÁFICOS REALES (MOCKUP STUDIO)   */}
          {/* =============================================================== */}
          {activeTab === 'mockup_gallery' && (
            <div className="space-y-6">
              {/* Header de la Galería */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 text-white">
                <div>
                  <h4 className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Galería de Mockups Fotográficos Reales</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                    Selecciona plantillas fotográficas de estudio de alta resolución o sube tus propias fotos. Elige exactamente qué logo estampar en cada una y agrégalas a la presentación pública.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-md">
                    <Upload className="w-4 h-4" />
                    <span>+ Subir Mockup Personalizado</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            const newCustom: BrandGuidelineCustomMockup = {
                              id: `cm_${Date.now()}`,
                              title: file.name.replace(/\.[^/.]+$/, ''),
                              category: 'textil',
                              mockupImageUrl: reader.result,
                              assignedLogoType: 'primary',
                              stampPositionPreset: 'center_large',
                              stampScale: 100,
                              blendMode: 'normal',
                            };
                            setActiveMockupConfig(newCustom);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Barra de Búsqueda y Filtros de Categoría */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={mockupSearchQuery}
                    onChange={(e) => setMockupSearchQuery(e.target.value)}
                    placeholder="Buscar mockup (ej. polo, chaleco, carro, llavero, termo, taza)..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs"
                  />
                  {mockupSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMockupSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'textil', label: 'Textil & Indumentaria' },
                    { id: 'vehiculos', label: 'Vehículos & Flota' },
                    { id: 'promocional', label: 'Promocionales & Merch' },
                    { id: 'packaging', label: 'Packaging & Bolsas' },
                    { id: 'papeleria', label: 'Papelería' },
                    { id: 'outdoor', label: 'Exterior OOH' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setMockupCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        mockupCategoryFilter === cat.id
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                          : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* MOCKUPS ACTIVOS EN LA PRESENTACIÓN */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                    <span>Mockups Activos en la Presentación ({mockupGalleryItems.length})</span>
                    <span className="text-[10px] font-normal text-zinc-400">
                      (Se mostrarán en la lámina de Galería Fotográfica del Brand Book)
                    </span>
                  </h4>
                  {mockupGalleryItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMockupGalleryItems([])}
                      className="text-rose-500 hover:text-rose-600 text-xs font-bold cursor-pointer"
                    >
                      Limpiar Todos
                    </button>
                  )}
                </div>

                {mockupGalleryItems.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-2 bg-zinc-50 dark:bg-zinc-950/40">
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      No hay mockups añadidos a la presentación todavía.
                    </p>
                    <p className="text-[11px] text-zinc-500 max-w-md mx-auto">
                      Elige abajo cualquiera de las plantillas fotográficas (chalecos, polos, furgonetas, llaveros, termos, etc.) o sube tus propias fotos para estampar tu logo y agregarlas.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {mockupGalleryItems.map((item, idx) => {
                      const logoSrc = resolveMockupLogoUrl(item.assignedLogoType, item.customLogoVersionId);
                      const stampStyle = getMockupStampStyle(
                        item.stampPositionPreset,
                        item.stampScale,
                        item.blendMode
                      );

                      return (
                        <div
                          key={item.id || idx}
                          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm flex flex-col justify-between group"
                        >
                          {/* Preview Fotográfico con el logo estampado en tiempo real */}
                          <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden">
                            <img
                              src={item.mockupImageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {/* Logo estampado */}
                            <div style={stampStyle}>
                              {logoSrc ? (
                                <img
                                  src={logoSrc}
                                  alt="Logo"
                                  className="max-h-full max-w-full object-contain filter drop-shadow-md"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-white uppercase px-2 py-1 bg-black/60 rounded">
                                  {brandName || 'LOGO'}
                                </span>
                              )}
                            </div>
                            {/* Pill categoría */}
                            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono text-white uppercase border border-white/10">
                              {item.category}
                            </span>
                            {/* Botón eliminar */}
                            <button
                              type="button"
                              onClick={() => {
                                setMockupGalleryItems(mockupGalleryItems.filter((_, i) => i !== idx));
                                toast('Mockup retirado de la presentación', 'success');
                              }}
                              className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/70 text-rose-400 hover:bg-rose-600 hover:text-white backdrop-blur-md cursor-pointer transition"
                              title="Eliminar este mockup"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Controles del mockup en la tarjeta */}
                          <div className="p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {item.stampScale || 100}%
                              </span>
                            </div>

                            {/* Selector rápido de qué logo estampar */}
                            <div>
                              <label className="block text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">
                                Logo asignado:
                              </label>
                              <select
                                value={
                                  item.assignedLogoType === 'custom_version'
                                    ? `custom_${item.customLogoVersionId}`
                                    : item.assignedLogoType
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = [...mockupGalleryItems];
                                  if (val.startsWith('custom_')) {
                                    const cId = val.replace('custom_', '');
                                    const cVer = logoVersions.find((v) => v.id === cId);
                                    updated[idx] = {
                                      ...updated[idx],
                                      assignedLogoType: 'custom_version',
                                      customLogoVersionId: cId,
                                      customLogoVersionName: cVer?.name || 'Versión Personalizada',
                                    };
                                  } else {
                                    updated[idx] = {
                                      ...updated[idx],
                                      assignedLogoType: val as any,
                                      customLogoVersionId: undefined,
                                      customLogoVersionName: undefined,
                                    };
                                  }
                                  setMockupGalleryItems(updated);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold"
                              >
                                <option value="primary">Logo Principal (Claro)</option>
                                <option value="secondary">Logo Secundario (Oscuro)</option>
                                <option value="symbol">★ Icono / Isotipo Claro</option>
                                <option value="symbol_dark">★ Icono / Isotipo Oscuro</option>
                                {logoFaviconUrl && <option value="favicon">Favicon Oficial</option>}
                                {logoVersions.map((v) => (
                                  <option key={v.id} value={`custom_${v.id}`}>
                                    {v.name} ({v.tag || 'Versión'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Selector de posición y botón editar */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                              <select
                                value={item.stampPositionPreset || 'center_large'}
                                onChange={(e) => {
                                  const updated = [...mockupGalleryItems];
                                  updated[idx] = { ...updated[idx], stampPositionPreset: e.target.value as any };
                                  setMockupGalleryItems(updated);
                                }}
                                className="px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[10px]"
                              >
                                <option value="chest_left">Pecho Izq</option>
                                <option value="center_large">Centro Grande</option>
                                <option value="back_print">Espalda</option>
                                <option value="full">Completo</option>
                                <option value="subtle">Sutil</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => setActiveMockupConfig(item)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer"
                              >
                                Ajustar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CATÁLOGO DE PLANTILLAS FOTOGRÁFICAS DE ESTUDIO */}
              <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Catálogo de Plantillas Fotográficas de Estudio
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Haz clic en &quot;Elegir y Configurar Logo&quot; para seleccionar qué versión de tu identidad irá sobre esta prenda o soporte.
                  </p>
                </div>

                {(() => {
                  const filtered = MOCKUP_CATALOG_TEMPLATES.filter((tpl) => {
                    const matchCat =
                      mockupCategoryFilter === 'todos' || tpl.category === mockupCategoryFilter;
                    const matchQ =
                      !mockupSearchQuery.trim() ||
                      tpl.title.toLowerCase().includes(mockupSearchQuery.toLowerCase()) ||
                      tpl.description.toLowerCase().includes(mockupSearchQuery.toLowerCase());
                    return matchCat && matchQ;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl">
                        No se encontraron plantillas con &quot;{mockupSearchQuery}&quot;. Intenta otra búsqueda o sube tu propia foto arriba.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filtered.map((tpl) => {
                        return (
                          <div
                            key={tpl.id}
                            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                          >
                            <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden">
                              <img
                                src={tpl.mockupImageUrl}
                                alt={tpl.title}
                                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              />
                              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono text-white uppercase border border-white/10">
                                {tpl.categoryLabel}
                              </span>
                            </div>

                            <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                              <div>
                                <h5 className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                                  {tpl.title}
                                </h5>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                                  {tpl.description}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const newItem: BrandGuidelineCustomMockup = {
                                    id: `cm_${Date.now()}`,
                                    title: tpl.title,
                                    category: tpl.category,
                                    mockupImageUrl: tpl.mockupImageUrl,
                                    assignedLogoType: tpl.defaultLogoType,
                                    stampPositionPreset: tpl.defaultPosition,
                                    stampScale: tpl.defaultScale,
                                    blendMode: tpl.defaultBlendMode,
                                  };
                                  setActiveMockupConfig(newItem);
                                }}
                                className="w-full mt-2 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Elegir y Configurar Logo</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* MODAL / DRAWER INTERACTIVO DE CONFIGURACIÓN DEL MOCKUP */}
              {activeMockupConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
                    {/* Visualizador en vivo con el logo */}
                    <div className="w-full md:w-1/2 bg-zinc-950 p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[300px]">
                      <img
                        src={activeMockupConfig.mockupImageUrl}
                        alt="Mockup"
                        className="max-h-72 w-full object-cover rounded-2xl shadow-lg"
                      />
                      <div
                        style={getMockupStampStyle(
                          activeMockupConfig.stampPositionPreset,
                          activeMockupConfig.stampScale,
                          activeMockupConfig.blendMode
                        )}
                      >
                        {resolveMockupLogoUrl(
                          activeMockupConfig.assignedLogoType,
                          activeMockupConfig.customLogoVersionId
                        ) ? (
                          <img
                            src={resolveMockupLogoUrl(
                              activeMockupConfig.assignedLogoType,
                              activeMockupConfig.customLogoVersionId
                            )}
                            alt="Logo estampado"
                            className="max-h-full max-w-full object-contain filter drop-shadow-md"
                          />
                        ) : (
                          <span className="text-xs font-bold text-white bg-black/60 px-2.5 py-1 rounded">
                            {brandName || 'TU LOGO'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 mt-3">
                        Vista previa con logo estampado en tiempo real
                      </span>
                    </div>

                    {/* Controles de Configuración */}
                    <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-4 overflow-y-auto">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                              Configurar Estampado del Mockup
                            </h4>
                            <p className="text-[11px] text-zinc-500">
                              Define qué logo usar y su posición en este soporte.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveMockupConfig(null)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Título del Mockup */}
                        <div>
                          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                            Título en la Lámina
                          </label>
                          <input
                            type="text"
                            value={activeMockupConfig.title}
                            onChange={(e) =>
                              setActiveMockupConfig({
                                ...activeMockupConfig,
                                title: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold"
                          />
                        </div>

                        {/* ¿Qué logo estampar? */}
                        <div>
                          <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                            ¿Qué Logo Estampar en este Mockup?
                          </label>
                          <select
                            value={
                              activeMockupConfig.assignedLogoType === 'custom_version'
                                ? `custom_${activeMockupConfig.customLogoVersionId}`
                                : activeMockupConfig.assignedLogoType
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.startsWith('custom_')) {
                                const cId = val.replace('custom_', '');
                                const cVer = logoVersions.find((v) => v.id === cId);
                                setActiveMockupConfig({
                                  ...activeMockupConfig,
                                  assignedLogoType: 'custom_version',
                                  customLogoVersionId: cId,
                                  customLogoVersionName: cVer?.name || 'Versión Personalizada',
                                });
                              } else {
                                setActiveMockupConfig({
                                  ...activeMockupConfig,
                                  assignedLogoType: val as any,
                                  customLogoVersionId: undefined,
                                  customLogoVersionName: undefined,
                                });
                              }
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-500/50 bg-white dark:bg-zinc-800 text-xs font-bold text-zinc-900 dark:text-white"
                          >
                            <option value="primary">Logo Principal (Claro / Fondo Oscuro)</option>
                            <option value="secondary">Logo Secundario (Oscuro / Fondo Claro)</option>
                            <option value="symbol">★ Icono / Isotipo Claro</option>
                            <option value="symbol_dark">★ Icono / Isotipo Oscuro</option>
                            {logoFaviconUrl && <option value="favicon">Favicon Oficial</option>}
                            {logoVersions.map((v) => (
                              <option key={v.id} value={`custom_${v.id}`}>
                                {v.name} ({v.tag || 'Versión Personalizada'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Posición y Escala */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                              Posición del Logo
                            </label>
                            <select
                              value={activeMockupConfig.stampPositionPreset || 'center_large'}
                              onChange={(e) =>
                                setActiveMockupConfig({
                                  ...activeMockupConfig,
                                  stampPositionPreset: e.target.value as any,
                                })
                              }
                              className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold"
                            >
                              <option value="chest_left">Pecho Izq (Escudo)</option>
                              <option value="center_large">Pecho Centro Grande</option>
                              <option value="back_print">Espalda Completa</option>
                              <option value="full">Completo</option>
                              <option value="subtle">Sutil / Pequeño</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                              Modo de Fusión
                            </label>
                            <select
                              value={activeMockupConfig.blendMode || 'normal'}
                              onChange={(e) =>
                                setActiveMockupConfig({
                                  ...activeMockupConfig,
                                  blendMode: e.target.value as any,
                                })
                              }
                              className="w-full px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold"
                            >
                              <option value="normal">Normal (Directo)</option>
                              <option value="multiply">Multiply (Sombras / Telas Claras)</option>
                              <option value="screen">Screen (Telas Oscuras)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs font-bold mb-1">
                            <span className="text-zinc-700 dark:text-zinc-300">
                              Escala del Estampado
                            </span>
                            <span className="font-mono text-amber-500">
                              {activeMockupConfig.stampScale || 100}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={40}
                            max={160}
                            value={activeMockupConfig.stampScale || 100}
                            onChange={(e) =>
                              setActiveMockupConfig({
                                ...activeMockupConfig,
                                stampScale: Number(e.target.value),
                              })
                            }
                            className="w-full accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setActiveMockupConfig(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const existsIdx = mockupGalleryItems.findIndex(
                              (m) => m.id === activeMockupConfig.id
                            );
                            if (existsIdx >= 0) {
                              const updated = [...mockupGalleryItems];
                              updated[existsIdx] = activeMockupConfig;
                              setMockupGalleryItems(updated);
                              toast(`Mockup "${activeMockupConfig.title}" actualizado`, 'success');
                            } else {
                              setMockupGalleryItems([...mockupGalleryItems, activeMockupConfig]);
                              toast(
                                `✨ Mockup "${activeMockupConfig.title}" agregado a la presentación`,
                                'success'
                              );
                            }
                            setActiveMockupConfig(null);
                          }}
                          className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md cursor-pointer transition flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Guardar en Presentación</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: BRIEF Y PILARES                                         */}
          {/* =============================================================== */}
          {activeTab === 'pillars' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Titular del Brief
                </label>
                <input
                  type="text"
                  value={briefOverviewTitle}
                  onChange={(e) => setBriefOverviewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Columna 1: Resumen y Objetivos
                  </label>
                  <textarea
                    rows={4}
                    value={briefOverviewText}
                    onChange={(e) => setBriefOverviewText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Columna 2: Look & Feel y Mensaje
                  </label>
                  <textarea
                    rows={4}
                    value={briefSecondaryText}
                    onChange={(e) => setBriefSecondaryText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Pilares Estratégicos de Marca ({goals.length})
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Puedes agregar, editar o eliminar pilares de la marca.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGoals(DEFAULT_SPANISH_GOALS.map((g) => ({ ...g })))}
                      className="px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition"
                    >
                      Restaurar por Defecto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextIndex = goals.length + 1;
                        setGoals([
                          ...goals,
                          {
                            id: `g_${Date.now()}`,
                            number: nextIndex < 10 ? `0${nextIndex}` : String(nextIndex),
                            title: 'Nuevo Pilar de Marca',
                            description: 'Describe el objetivo estratégico o valor diferencial de este pilar.',
                          },
                        ]);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Pilar</span>
                    </button>
                  </div>
                </div>

                {goals.map((g, idx) => (
                  <div
                    key={g.id || idx}
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 space-y-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="text"
                        value={g.number || (idx + 1 < 10 ? `0${idx + 1}` : String(idx + 1))}
                        onChange={(e) => {
                          const updated = [...goals];
                          updated[idx] = { ...updated[idx], number: e.target.value };
                          setGoals(updated);
                        }}
                        className="w-12 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono font-bold text-xs text-center text-zinc-600 dark:text-zinc-300"
                      />
                      <input
                        type="text"
                        value={g.title}
                        onChange={(e) => {
                          const updated = [...goals];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setGoals(updated);
                        }}
                        placeholder="Título del Pilar"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = goals.filter((_, i) => i !== idx);
                          setGoals(
                            filtered.map((item, i) => ({
                              ...item,
                              number: i + 1 < 10 ? `0${i + 1}` : String(i + 1),
                            }))
                          );
                        }}
                        title="Eliminar pilar"
                        className="p-2 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={g.description}
                      onChange={(e) => {
                        const updated = [...goals];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setGoals(updated);
                      }}
                      placeholder="Descripción del pilar estratégico"
                      className="w-full p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 5: PALETA DE COLOR CON CONVERSIÓN AUTOMÁTICA HEX->RGB/CMYK  */}
          {/* =============================================================== */}
          {activeTab === 'colors' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Sistema Cromático Inteligente (HEX → RGB / CMYK / Pantone)
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Al seleccionar un color o escribir un código HEX, se calculan automáticamente sus valores RGB, CMYK y Pantone.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => extractColorsFromLogo()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Extraer del Logo Subido</span>
                  </button>
                  <button
                    type="button"
                    onClick={addColor}
                    className="px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Color</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {colors.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-start gap-3"
                  >
                    <input
                      type="color"
                      value={c.hex}
                      onChange={(e) => updateColor(c.id, 'hex', e.target.value)}
                      className="w-14 h-14 rounded-xl cursor-pointer border border-zinc-300 dark:border-zinc-700 shrink-0"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => updateColor(c.id, 'name', e.target.value)}
                          placeholder="Nombre del tono"
                          className="flex-1 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={c.hex}
                          onChange={(e) => updateColor(c.id, 'hex', e.target.value)}
                          placeholder="#000000"
                          className="w-24 px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <span className="text-[9px] font-mono text-zinc-400 block">RGB</span>
                          <input
                            type="text"
                            value={c.rgb || ''}
                            onChange={(e) => updateColor(c.id, 'rgb', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-[10px] font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-zinc-400 block">CMYK (%)</span>
                          <input
                            type="text"
                            value={c.cmyk || ''}
                            onChange={(e) => updateColor(c.id, 'cmyk', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-[10px] font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-zinc-400 block">Pantone</span>
                          <input
                            type="text"
                            value={c.pantone || ''}
                            onChange={(e) => updateColor(c.id, 'pantone', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-[10px] font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeColor(c.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 6: TIPOGRAFÍA Y GOOGLE FONTS                                */}
          {/* =============================================================== */}
          {activeTab === 'typography' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                Sistema Tipográfico (Google Fonts + Type Tester en Vivo)
              </h4>
              <p className="text-xs text-zinc-500">
                Selecciona la familia tipográfica para titulares y cuerpo. En la vista pública el cliente podrá probar la fuente en vivo con un slider de tamaño.
              </p>

              {typography.map((f, idx) => (
                <div
                  key={f.id || idx}
                  className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      {f.role === 'headings' ? 'Titulares / Headings' : 'Párrafos / Body'}
                    </span>

                    <div className="flex items-center gap-2">
                      {f.customFontFileName && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                          ✓ Fuente propia: {f.customFontFileName}
                        </span>
                      )}
                      <label className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold cursor-pointer hover:opacity-90 transition flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Fuente (.TTF / .OTF / .WOFF2)</span>
                        <input
                          type="file"
                          accept=".ttf,.otf,.woff,.woff2"
                          className="hidden"
                          onChange={(e) => handleCustomFontUpload(e, idx)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 mb-1">
                        Familia Tipográfica (Google Fonts o Fuente Subida)
                      </label>
                      <select
                        value={f.fontFamily}
                        onChange={(e) => {
                          const updated = [...typography];
                          updated[idx].fontFamily = e.target.value;
                          setTypography(updated);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold"
                      >
                        {f.customFontDataUrl && !GOOGLE_FONT_OPTIONS.includes(f.fontFamily) && (
                          <option value={f.fontFamily}>★ {f.fontFamily} (Fuente Propia)</option>
                        )}
                        {GOOGLE_FONT_OPTIONS.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 mb-1">
                        Pesos recomendados
                      </label>
                      <input
                        type="text"
                        value={f.weight}
                        onChange={(e) => {
                          const updated = [...typography];
                          updated[idx].weight = e.target.value;
                          setTypography(updated);
                        }}
                        placeholder="Ej: Regular / SemiBold / Bold"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 7: KIT DE DESCARGA GOOGLE DRIVE, CAPTURAS Y MÉTRICA KPI     */}
          {/* =============================================================== */}
          {activeTab === 'mockups' && (
            <div className="space-y-6">
              {/* Carpeta Entregable de Google Drive */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                        Centro de Descargas & Brand Assets Kit (Google Drive)
                      </h4>
                      <p className="text-xs text-zinc-500">
                        Vincula la carpeta de Google Drive con los editables (.AI, .EPS, .SVG, fuentes) para que el cliente los descargue al final del manual.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDrivePickerOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <FolderCheck className="w-4 h-4" />
                    <span>{driveFolderId ? 'Cambiar Carpeta Drive' : 'Elegir Carpeta de Drive'}</span>
                  </button>
                </div>

                {driveFolderName && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 text-xs">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      📁 {driveFolderName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDriveFolderId('');
                        setDriveFolderName('');
                        setDriveFolderUrl('');
                      }}
                      className="text-rose-500 text-[11px] font-bold cursor-pointer"
                    >
                      Desvincular
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-mono text-zinc-500 mb-1">
                    O pega directamente el enlace de descarga (Google Drive / WeTransfer / Dropbox):
                  </label>
                  <input
                    type="text"
                    value={driveFolderUrl}
                    onChange={(e) => setDriveFolderUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Métrica KPI y URL Web */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Métrica / KPI Gigante
                  </label>
                  <input
                    type="text"
                    value={statNumber}
                    onChange={(e) => setStatNumber(e.target.value)}
                    placeholder="Ej: $2.5M"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Descripción del KPI
                  </label>
                  <input
                    type="text"
                    value={statLabel}
                    onChange={(e) => setStatLabel(e.target.value)}
                    placeholder="Ej: Métrica clave de rendimiento y alcance"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Dominio Web (iPhone / macOS / QR)
                  </label>
                  <input
                    type="text"
                    value={mockupMobileUrlWebsite}
                    onChange={(e) => setMockupMobileUrlWebsite(e.target.value)}
                    placeholder="www.tumarca.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 8: PRÓXIMOS PASOS (HOJA DE RUTA EDITABLE Y ELIMINABLE)      */}
          {/* =============================================================== */}
          {activeTab === 'steps' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Hoja de Ruta / Cierre del Proyecto ({nextSteps.length} etapas)
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Agrega, edita o elimina los pasos de cierre que verá el cliente en la última lámina de la presentación.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNextSteps(DEFAULT_SPANISH_STEPS.map((s) => ({ ...s })))}
                    className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition"
                  >
                    Restaurar Pasos en Español
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = nextSteps.length + 1;
                      setNextSteps([
                        ...nextSteps,
                        {
                          id: `ns_${Date.now()}`,
                          step: nextIdx < 10 ? `0${nextIdx}` : String(nextIdx),
                          title: 'Nueva Etapa de Entrega',
                          description: 'Descripción detallada de este paso dentro de la hoja de ruta.',
                        },
                      ]);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Paso</span>
                  </button>
                </div>
              </div>

              {nextSteps.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center space-y-2">
                  <p className="text-xs text-zinc-500">
                    No hay etapas en la hoja de ruta. Haz clic en <strong>Agregar Paso</strong> o en <strong>Restaurar Pasos en Español</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {nextSteps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex items-center gap-2.5 sm:w-5/12">
                        <input
                          type="text"
                          value={step.step || (idx + 1 < 10 ? `0${idx + 1}` : String(idx + 1))}
                          onChange={(e) => {
                            const updated = [...nextSteps];
                            updated[idx] = { ...updated[idx], step: e.target.value };
                            setNextSteps(updated);
                          }}
                          title="Número de paso"
                          className="w-12 px-2 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono font-bold text-xs text-center text-zinc-600 dark:text-zinc-300 shrink-0"
                        />
                        <input
                          type="text"
                          value={step.title}
                          onChange={(e) => {
                            const updated = [...nextSteps];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setNextSteps(updated);
                          }}
                          placeholder="Título de la etapa (ej. Revisión y Comentarios)"
                          className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-900 dark:text-white"
                        />
                      </div>

                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={step.description}
                          onChange={(e) => {
                            const updated = [...nextSteps];
                            updated[idx] = { ...updated[idx], description: e.target.value };
                            setNextSteps(updated);
                          }}
                          placeholder="Descripción de la etapa..."
                          className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = nextSteps.filter((_, i) => i !== idx);
                            setNextSteps(
                              filtered.map((item, i) => ({
                                ...item,
                                step: i + 1 < 10 ? `0${i + 1}` : String(i + 1),
                              }))
                            );
                          }}
                          title="Eliminar este paso"
                          className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

            </div>

            {/* Footer Modal Acciones Fijo */}
            <div className="px-6 sm:px-8 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Brand Guideline'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Selector de Carpetas de Google Drive */}
      <DriveFolderPickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        currentSelectedId={driveFolderId}
        title="Vincular Carpeta de Editables (Brand Assets Kit)"
        subtitle="Elige la carpeta de Google Drive que contiene los logos vectoriales y fuentes para el cliente."
        onSelect={(folder) => {
          setDriveFolderId(folder.id);
          setDriveFolderName(folder.name);
          setDriveFolderUrl(
            folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`
          );
          setIsDrivePickerOpen(false);
          toast(`Carpeta "${folder.name}" vinculada al Brand Kit`, 'success');
        }}
      />
    </div>
  );
};
