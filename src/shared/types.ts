import { PermissionKey } from './permissions';

export type TypographyScale = 'compact' | 'normal' | 'comfortable' | 'large';
export type ToastStyleVariant = 'glass' | 'minimal' | 'solid' | 'pill';
export type ToastAudioTheme = 'chime' | 'pop' | 'beep' | 'glass' | 'silent';
export type ToastPosition =
  | 'top-right'
  | 'top-center'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-center'
  | 'bottom-left';
export type ConfirmModalStyleVariant = 'modern-center' | 'glass-blur' | 'compact-sheet' | 'split-banner';

export interface ThemePalette {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  textPrimary: string;
  textMuted: string;
}

export type AppFontFamily =
  | 'Inter'
  | 'Space Grotesk'
  | 'Montserrat'
  | 'Plus Jakarta Sans'
  | 'Outfit'
  | 'Poppins';

export interface TenantCustomization {
  /** Nombre global con el que se nombra al módulo de clientes (ej: "Clientes", "Cuentas", "Socios", "Marcas Aliadas") */
  clientGlobalNamePlural: string;
  clientGlobalNameSingular: string;
  /** Moneda global del sistema */
  currencyCode: 'PEN' | 'USD' | 'EUR' | 'MXN' | 'COP' | 'CLP';
  currencySymbol: string;
  /** Identidad Visual */
  faviconUrl: string;
  logoLightUrl: string;
  logoDarkUrl: string;
  logoPwaUrl: string;
  /** Colores Modo Claro y Modo Oscuro */
  lightPalette: ThemePalette;
  darkPalette: ThemePalette;
  /** Tamaño de tipografía global del sistema */
  typographyScale: TypographyScale;
  /** Familia tipográfica global del sistema (Google Fonts) */
  fontFamily?: AppFontFamily;
  /** Estilo de Toast */
  toastStyle: ToastStyleVariant;
  toastPosition: ToastPosition;
  /** Tema sonoro de alertas toast */
  toastAudioTheme?: ToastAudioTheme;
  /** Apilar notificaciones múltiples en 3D para no saturar la vista */
  toastStacking?: boolean;
  /** Posiciones personalizadas de Toast por dispositivo (PC, Tablet, Móvil) */
  toastPositions?: {
    desktop: ToastPosition;
    tablet: ToastPosition;
    mobile: ToastPosition;
  };
  /** Estilo de Modal de Confirmación */
  confirmModalStyle: ConfirmModalStyleVariant;
}

export interface CompanySocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
  linkedin: string;
  behance: string;
  website: string;
}

export interface CompanyInfo {
  commercialName: string;
  legalName: string;
  ruc: string;
  email: string;
  whatsapp: string;
  address: string;
  socials: CompanySocialLinks;
  bankAccounts?: QuotePaymentMethod[];
}

export interface TenantDriveConfig {
  authType: 'service_account_json' | 'service_account_fields' | 'oauth2' | 'env' | 'none';
  serviceAccountEmail?: string;
  privateKey?: string;
  serviceAccountJson?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  rootFolderId?: string;
  rootFolderName?: string;
  updatedAt?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: 'active' | 'suspended';
  customization: TenantCustomization;
  companyInfo: CompanyInfo;
  driveConfig?: TenantDriveConfig;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSummary extends Tenant {
  usersCount: number;
  clientsCount: number;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  badgeColor: string;
  isSystem: boolean;
  permissions: PermissionKey[];
  createdAt: string;
  updatedAt: string;
}

export interface UserThemePreference {
  lightPalette?: {
    primary?: string;
    secondary?: string;
    background?: string;
    surface?: string;
    textPrimary?: string;
    textMuted?: string;
  };
  darkPalette?: {
    primary?: string;
    secondary?: string;
    background?: string;
    surface?: string;
    textPrimary?: string;
    textMuted?: string;
  };
  typographyScale?: TypographyScale;
  fontFamily?: AppFontFamily;
}

export interface User {
  id: string;
  tenantId: string;
  roleId: string;
  roleName?: string;
  roleBadgeColor?: string;
  permissions?: PermissionKey[];
  name: string;
  jobTitle: string;
  email: string;
  whatsapp: string;
  pin: string; // 8 dígitos exactos
  avatarUrl: string;
  isActive: boolean;
  lastLoginAt: string | null;
  themePreference?: UserThemePreference;
  createdAt: string;
  updatedAt: string;
}

export interface ClientBrand {
  id: string;
  tenantId: string;
  clientId: string;
  name: string;
  industry: string;
  brandColor: string;
  logoUrl: string;
  socialHandle: string;
  description: string;
  // Servicio adquirido / contratado por la marca
  serviceType?: 'service' | 'membership';
  serviceName?: string;
  serviceDescription?: string;
  servicePrice?: number;
  serviceMonths?: number;
  servicePaymentDate?: string;
  servicePaymentDay?: number;
  includedServices?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  documentType: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE';
  documentNumber: string;
  whatsapp: string;
  email: string | null; // No obligatorio
  notes: string;
  status: 'active' | 'inactive';
  brands: ClientBrand[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CUSTOMIZATION: TenantCustomization = {
  clientGlobalNamePlural: 'Clientes',
  clientGlobalNameSingular: 'Cliente',
  currencyCode: 'PEN',
  currencySymbol: 'S/',
  faviconUrl: '',
  logoLightUrl: '',
  logoDarkUrl: '',
  logoPwaUrl: '',
  lightPalette: {
    primary: '#7c3aed',
    secondary: '#ec4899',
    background: '#f8fafc',
    surface: '#ffffff',
    textPrimary: '#0f172a',
    textMuted: '#64748b',
  },
  darkPalette: {
    primary: '#a78bfa',
    secondary: '#f472b6',
    background: '#090d16',
    surface: '#111827',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
  },
  typographyScale: 'normal',
  fontFamily: 'Inter',
  toastStyle: 'glass',
  toastPosition: 'top-right',
  toastAudioTheme: 'chime',
  toastStacking: true,
  toastPositions: {
    desktop: 'top-right',
    tablet: 'top-center',
    mobile: 'top-center',
  },
  confirmModalStyle: 'modern-center',
};

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  commercialName: 'ROMA Agencia Creativa & Diseño',
  legalName: 'ROMA STUDIO PUBLICIDAD Y DISEÑO S.A.C.',
  ruc: '20609845123',
  email: 'hola@romaagencia.pe',
  whatsapp: '+51 987 654 321',
  address: 'Av. Primavera 1450, Of. 602, Santiago de Surco, Lima',
  socials: {
    instagram: '@roma.agenciacreativa',
    facebook: 'facebook.com/romaagenciacreativa',
    tiktok: '@roma.studio',
    linkedin: 'linkedin.com/company/roma-agencia',
    behance: 'behance.net/romastudio',
    website: 'https://romaagencia.pe',
  },
  bankAccounts: [
    {
      id: 'pm-bcp-default',
      name: 'Banco de Crédito del Perú (BCP Soles)',
      beneficiary: 'ROMA STUDIO PUBLICIDAD Y DISEÑO S.A.C.',
      accountNumber: '194-98765432-0-11',
      notes: 'CCI: 002-1940098765432011-92 (RUC: 20609845123)',
      imageUrl: '',
      currency: 'PEN',
      isActive: true,
    },
    {
      id: 'pm-yape-default',
      name: 'Yape / Plin Corporativo',
      beneficiary: 'César Augusto (Director General)',
      accountNumber: '+51 987 654 321',
      notes: 'Adjuntar constancia o captura al WhatsApp oficial.',
      imageUrl: '',
      currency: 'PEN',
      isActive: true,
    },
  ],
};

// =============================================================================
// MÓDULO DE COTIZACIONES & PROPUESTAS COMERCIALES
// =============================================================================

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export type ProposalTheme =
  | 'corporate-blue'
  | 'emerald-executive'
  | 'modern-violet'
  | 'minimal-black'
  | 'amber-luxury'
  | 'crimson-red'
  | 'tech-cyan'
  | 'roma-gradient';

export interface QuoteItem {
  id: string;
  title: string;
  description: string; // Formato enriquecido (HTML con negrita, cursiva, tablas de Excel, etc.)
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface QuoteGanttPhase {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  progress: number; // 0 - 100
  color: string;
  deliverables?: string;
}

export interface QuotePaymentMethod {
  id: string;
  name: string; // ej. BCP Soles, BBVA, Yape / Plin
  beneficiary: string; // Titular de la cuenta
  accountNumber: string; // Número de cuenta / CCI / Celular
  notes?: string;
  imageUrl?: string; // Foto, logo de banco o código QR (Base64 o URL)
  imageType?: 'url' | 'upload'; // Tipo de imagen (URL o Subida)
  currency?: string; // ej. PEN, USD
  isActive?: boolean; // Habilitado / Visible en cotización
}

export interface Quote {
  id: string;
  tenantId: string;
  code: string; // ej. COT-2026-001
  clientId?: string | null;
  clientName: string;
  companyName: string;
  documentType: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | 'OTRO';
  documentNumber: string;
  whatsapp: string;
  email: string;
  
  // Fechas y Moneda
  issueDate: string;
  validUntil: string;
  currency: 'PEN' | 'USD' | 'EUR';
  currencySymbol: string;
  
  // Estado y Estilo Visual
  status: QuoteStatus;
  theme: ProposalTheme;
  
  // Partidas / Servicios
  items: QuoteItem[];
  
  // Resumen Financiero
  subtotal: number;
  includeTax: boolean; // IGV 18%
  taxRate: number; // 18%
  taxAmount: number;
  discountAmount: number;
  total: number;
  
  // Cronograma Gantt
  showGantt: boolean; // Mostrar / ocultar en vista pública
  ganttPhases: QuoteGanttPhase[];
  
  // Notas y Condiciones (con texto enriquecido y tablas)
  additionalNotes: string;
  termsAndConditions: string;
  
  // Métodos de Pago y Switcher para Vista Pública
  showPaymentMethods: boolean; // Switcher: Mostrar / ocultar cuentas bancarias en vista pública
  paymentMethods: QuotePaymentMethod[];
  
  // Token público y código corto para enlace
  publicToken: string;
  shortCode?: string; // Código corto (ej: 6 a 8 caracteres)
  
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MÓDULO DE SERVICIOS DE AGENCIA
// =============================================================================

export interface ServiceCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string;
  badgeColor: string;
  icon: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type ServicePricingType = 'fixed' | 'starting_at' | 'monthly' | 'packages';
export type ServiceCurrency = 'PEN' | 'USD' | 'EUR';
export type ServiceStatus = 'active' | 'draft' | 'paused';
export type ServiceVisibility = 'public' | 'private';

export interface ServicePackageTier {
  id: string;
  name: string;
  description: string;
  price: number;
  deliveryTime: string;
  features: string[];
  isPopular?: boolean;
  badgeText?: string;
}

export interface ServiceGalleryItem {
  id: string;
  url: string;
  title: string;
  tag: string;
}

export interface ServiceFeatureItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface ServiceDeliverableItem {
  id: string;
  title: string;
  phase: string;
  details: string;
}

export interface ServiceRequirementItem {
  id: string;
  title: string;
  description: string;
}

export interface ServiceFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface ServiceExtraItem {
  id: string;
  title: string;
  description: string;
  price: number;
  volumeDiscountText?: string;
}

export interface ServiceUrgency {
  enabled: boolean;
  endDate: string;
  badgeText: string;
}

export interface ServiceVideo {
  enabled: boolean;
  url: string;
  platform: 'youtube' | 'vimeo' | 'drive' | 'loom' | 'direct' | 'other' | 'iframe' | 'unknown';
}

export interface ServiceSeo {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
}

export interface Service {
  id: string;
  tenantId: string;
  code: string;
  title: string;
  categoryId: string;
  categoryName?: string;
  coverImage: string;
  status: ServiceStatus;
  icon: string;
  pricingType: ServicePricingType;
  currency: ServiceCurrency;
  currencySymbol: string;
  visibility: ServiceVisibility;
  basePrice: number;
  annualDiscount: number;
  deliveryTime: string;
  inventory: number | null;
  inventoryUnlimited: boolean;
  urgency: ServiceUrgency;
  video: ServiceVideo;
  briefDescription: string;
  fullDescription: string;
  packages: ServicePackageTier[];
  gallery: ServiceGalleryItem[];
  features: ServiceFeatureItem[];
  deliverables: ServiceDeliverableItem[];
  requirements: ServiceRequirementItem[];
  faqs: ServiceFaqItem[];
  extras: ServiceExtraItem[];
  seo: ServiceSeo;
  relatedServiceIds: string[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MÓDULO DE NOTAS DE PAGO (RECIBOS, COMPROBANTES DE COBRO INTERNOS)
// =============================================================================
export type PaymentNoteStatus = 'pending' | 'paid' | 'partial' | 'cancelled';

export type MembershipMonthStatus = 'paid' | 'in_process' | 'overdue' | 'delayed' | 'inactive';

export interface MembershipSubInstallment {
  id: string;
  title: string;
  amount: number;
  percentage?: number;
  status: MembershipMonthStatus;
  dueDate?: string;
  paidDate?: string;
  operationNumber?: string;
  voucherUrl?: string;
  voucherName?: string;
  notes?: string;
}

export interface MembershipMonthItem {
  id: string;
  monthNumber: number;
  planName: string;
  periodName: string;
  amount: number;
  dueDate?: string;
  voucherUrl?: string;
  voucherName?: string;
  status: MembershipMonthStatus;
  paidDate?: string;
  operationNumber?: string;
  notes?: string;
  isSplit?: boolean;
  subInstallments?: MembershipSubInstallment[];
}

export interface PaymentNoteItem {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status?: 'paid' | 'in_process';
  voucherUrl?: string;
  voucherName?: string;
  operationNumber?: string;
  paidDate?: string;
  notes?: string;
  linkedMonthId?: string;
}

export interface PaymentNote {
  id: string;
  tenantId: string;
  code: string;
  quoteId?: string;
  quoteCode?: string;
  clientId: string;
  clientName: string;
  companyName: string;
  brandId?: string;
  brandName?: string;
  documentType: 'RUC' | 'DNI' | 'CE' | 'PASSPORT' | 'OTRO';
  documentNumber: string;
  whatsapp: string;
  email: string;
  issueDate: string;
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: string;
  operationNumber?: string;
  currency: 'PEN' | 'USD';
  currencySymbol: string;
  isMembership?: boolean;
  membershipPlanName?: string;
  membershipMonthsTotal?: number;
  membershipInstallments?: MembershipMonthItem[];
  extraItems?: PaymentNoteItem[];
  items: PaymentNoteItem[];
  subtotal: number;
  includeTax: boolean;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  status: PaymentNoteStatus;
  notes?: string;
  bankAccounts?: QuotePaymentMethod[];
  publicToken: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MÓDULO DE WORKSPACE (REDES SOCIALES & TAREAS OPERATIVAS)
// =============================================================================

export type SocialPostPlatform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'youtube' | 'x';
export type SocialPostFormat = 'reel' | 'post' | 'carousel' | 'story' | 'video' | 'ad';
export type SocialPostStatus = 'idea' | 'writing' | 'design' | 'review' | 'approved' | 'published';

export type WorkspaceProjectStatus = 'active' | 'archived' | 'completed';

export interface WorkspaceProject {
  id: string;
  tenantId: string;
  serviceOrderId?: string;
  serviceOrderCode?: string;
  serviceOrderToken?: string;
  name: string;
  clientId: string;
  clientName: string;
  companyName?: string;
  brandId?: string;
  brandName?: string;
  periodStart?: string;
  periodEnd?: string;
  status: WorkspaceProjectStatus;
  budget?: number;
  budgetCurrency?: string;
  platforms?: SocialPostPlatform[];
  contractedPosts?: number;
  contractedReels?: number;
  contractedStories?: number;
  assignedUsers?: Array<{
    id: string;
    name: string;
    role?: string;
  }>;
  notes?: string;
  driveFolderId?: string;
  driveFolderName?: string;
  driveFolderLink?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkspaceMonthStatus = 'pending' | 'in_progress' | 'completed';

export interface WorkspaceMonthSubfolder {
  name: string;
  driveFolderId?: string;
  webViewLink?: string;
}

export interface WorkspaceMonth {
  id: string;
  tenantId: string;
  projectId: string;
  name: string; // e.g., "Noviembre 2026"
  month: number; // 1 - 12
  year: number; // e.g. 2026
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: WorkspaceMonthStatus;
  driveFolderId?: string;
  driveFolderName?: string;
  driveFolderLink?: string;
  driveSubfolders?: WorkspaceMonthSubfolder[];
  publicToken?: string;
  requirePin?: boolean;
  publicPin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostMilestone {
  id: string;
  stepNumber: number;
  title: string;
  completed: boolean;
  description: string;
  attachments?: Array<{ name: string; url: string; driveFileId?: string }>;
}

export interface PostComment {
  id: string;
  tab: 'idea' | 'design';
  author: string;
  avatar?: string;
  text: string;
  createdAt: string;
}

export interface PostQAChecklist {
  spelling: boolean;
  logoIdentity: boolean;
  formatResolution: boolean;
  ctaLinks: boolean;
}

export interface WorkspacePost {
  id: string;
  tenantId: string;
  projectId?: string;
  monthId?: string;
  clientId: string;
  clientName: string;
  brandId?: string;
  brandName?: string;
  title: string;
  platforms: SocialPostPlatform[];
  format: SocialPostFormat;
  copy: string;
  hashtags?: string;
  mediaUrl?: string;
  scheduledDate: string; // YYYY-MM-DD
  status: SocialPostStatus;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedUserRole?: string;
  assignedUserAvatar?: string;
  budget?: number; // Presupuesto de pauta publicitaria si aplica
  notes?: string;
  driveFolderId?: string;
  driveFolderName?: string;
  driveFolderLink?: string;
  // Campos del editor de ancho completo
  contentPillar?: string; // Educación, Ventas, Branding, Entretenimiento, Comunidad, Testimonial
  initialDate?: string;
  deliveryDate?: string;
  periodicity?: string; // Única vez, Semanal, etc.
  reminder?: string; // Ninguno, 1 hora antes, etc.
  designerBrief?: string;
  // Referencias (Google Drive: REFERENCIAS)
  referenceMediaUrl?: string;
  referenceMediaName?: string;
  referenceMediaDriveId?: string;
  referenceExternalLink?: string;
  // Arte Final (Google Drive: POST TERMINADOS)
  finalArtMediaUrl?: string;
  finalArtMediaName?: string;
  finalArtDriveId?: string;
  finalArtExternalLink?: string;
  // Control de Calidad Visual
  qaChecklist?: PostQAChecklist;
  // Hitos & Avances de Diseño
  milestones?: PostMilestone[];
  // Pizarra & Dibujo de Referencia Visual
  paintData?: string;
  drawingData?: string;
  // Notas del Presentador (Modo PPT)
  presenterNotes?: string;
  // Aprobación y publicación
  clientApprovalStatus?: 'idea' | 'in_design' | 'client_approved' | 'published' | 'archived';
  // Comentarios
  comments?: PostComment[];
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkspaceTask {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string; // Redes Sociales, Identidad Visual, Audiovisual, Web, Estrategia, General
  clientId?: string;
  clientName?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedUserAvatar?: string;
  dueDate?: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MÓDULO DE ORDEN DE SERVICIO (OS) - GUÍA TÉCNICA Y OPERATIVA DE SERVICIOS
// =============================================================================

export type ServiceOrderStatus = 'draft' | 'active' | 'in_review' | 'completed' | 'cancelled';
export type ServiceOrderCategory = 'social_media' | 'branding' | 'audiovisual' | 'web' | 'general';
export type DeliverableStatus = 'pending' | 'in_progress' | 'review' | 'completed';

export interface OSSocialMediaConfig {
  enabled: boolean; // Switcher principal Redes Sociales
  hasBudget: boolean; // Switcher: ¿Tiene presupuesto de pauta?
  budgetAmount: number; // Monto asignado a pauta
  budgetCurrency: 'PEN' | 'USD';
  budgetManagedBy: 'client' | 'agency'; // Quién administra la tarjeta / cuenta
  platforms: SocialPostPlatform[]; // Redes a manejar
  postsCount: number; // Cantidad de contenidos / publicaciones mensuales
  reelsCount: number; // Reels mensuales
  storiesCount: number; // Historias mensuales
  scopeNotes: string; // Alcance detallado
}

export interface OSBrandingConfig {
  enabled: boolean; // Switcher principal Identidad / Branding
  deliverablesList: string[]; // Manual de marca, logo principal y variantes, paleta, tipografía, papelería, etc.
  initialProposalsCount: number; // Propuestas iniciales
  reviewRoundsCount: number; // Rondas de cambios
  scopeNotes: string;
}

export interface OSAudiovisualConfig {
  enabled: boolean; // Switcher principal Audiovisual
  deliverablesList: string[]; // Reels, spot comercial, video corporativo, sesión fotográfica, etc.
  shootingHours: number; // Horas de rodaje
  location: string; // Locación
  scopeNotes: string;
}

export interface OSWebConfig {
  enabled: boolean; // Switcher principal Página Web
  deliverablesList: string[]; // UI/UX, Landing Page, Corporativa, E-commerce, Pasarelas de pago, etc.
  platform: string; // WordPress, React/Next, Shopify, etc.
  includesHosting: boolean; // Switcher hosting y dominio
  domainName: string;
  scopeNotes: string;
}

export interface ServiceOrderDeliverable {
  id: string;
  category: ServiceOrderCategory;
  title: string;
  description: string;
  quantity: number;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedUserRole?: string;
  assignedUserAvatar?: string;
  status: DeliverableStatus;
  dueDate: string;
  completedAt?: string;
  deliverableUrl?: string; // Enlace Drive, Figma, Staging, etc.
}

export interface ServiceOrder {
  id: string;
  tenantId: string;
  code: string; // ej: OS-2026-001
  title: string;
  clientId: string;
  clientName: string;
  companyName: string;
  brandName: string;
  documentType: 'RUC' | 'DNI' | 'CE' | 'PASSPORT' | 'OTRO';
  documentNumber: string;
  whatsapp: string;
  email: string;
  quoteId?: string;
  quoteCode?: string;
  startDate: string; // YYYY-MM-DD
  deliveryDate: string; // YYYY-MM-DD
  projectManagerId?: string;
  projectManagerName?: string;
  status: ServiceOrderStatus;
  totalProgress: number; // 0 a 100
  
  // Switchers y configuraciones específicas por servicio
  socialMedia: OSSocialMediaConfig;
  branding: OSBrandingConfig;
  audiovisual: OSAudiovisualConfig;
  web: OSWebConfig;

  // Lista detallada de entregables y responsables
  deliverables: ServiceOrderDeliverable[];

  publicToken: string;
  notes: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// 13. GOOGLE DRIVE & GESTOR DE ARCHIVOS CLOUD
// =============================================================================

export type DriveFileCategory =
  | 'general'
  | 'brief'
  | 'deliverable'
  | 'brand'
  | 'invoice'
  | 'raw_asset'
  | 'revision';

export interface DriveFile {
  id: string;
  tenantId: string;
  googleFileId: string;
  name: string;
  mimeType: string;
  size: number; // bytes
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
  parentFolderId?: string;
  parentFolderName?: string;
  clientId?: string;
  clientName?: string;
  serviceOrderId?: string;
  serviceOrderCode?: string;
  category: DriveFileCategory;
  starred?: boolean;
  width?: number;
  height?: number;
  durationMillis?: number;
  version?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type DriveFolderType = 'client_root' | 'os_root' | 'blueprint_subfolder' | 'custom';

export interface DriveFolder {
  id: string;
  tenantId: string;
  googleFolderId: string;
  name: string;
  parentGoogleFolderId?: string;
  clientId?: string;
  serviceOrderId?: string;
  folderType: DriveFolderType;
  color?: string;
  starred?: boolean;
  webViewLink?: string;
  createdAt: string;
}

export interface FolderBlueprintItem {
  name: string;
  category?: DriveFileCategory;
  subfolders?: string[];
}

export interface DriveFolderBlueprint {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  module: 'clients' | 'service_orders' | 'workspace' | 'general';
  structure: FolderBlueprintItem[];
  isDefault: boolean;
  createdAt: string;
}

export interface DriveConnectionStatus {
  configured: boolean;
  connected: boolean;
  authType: 'service_account' | 'oauth2' | 'none';
  accountEmail?: string;
  rootFolderId?: string;
  rootFolderName?: string;
  error?: string;
}

export interface DriveUploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  folderId?: string;
  folderName?: string;
  clientId?: string;
  clientName?: string;
  serviceOrderId?: string;
  serviceOrderCode?: string;
  category?: DriveFileCategory;
  progress: number; // 0 a 100
  bytesUploaded: number;
  speed: string; // ej. "14.2 MB/s"
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error' | 'cancelled';
  error?: string;
  sessionUri?: string;
  googleFileId?: string;
  webViewLink?: string;
  width?: number;
  height?: number;
  durationMillis?: number;
  replaceGoogleFileId?: string;
  startedAt: number;
}

// =============================================================================
// SISTEMA DE NOTIFICACIONES MULTITENANT & PWA PUSH
// =============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'alert';

export type NotificationModule =
  | 'clients'
  | 'quotes'
  | 'services'
  | 'service_orders'
  | 'payments'
  | 'workspace'
  | 'drive'
  | 'users'
  | 'roles'
  | 'settings'
  | 'onboarding'
  | string;

export interface AppNotification {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  type: NotificationType;
  module: NotificationModule;
  entityId?: string;
  action?: string;
  link?: string;
  actorUserId?: string;
  actorUserName?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionRecord {
  id: string;
  tenantId: string;
  userId?: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// HERRAMIENTAS: PALETAS DE COLOR, GENERADOR DE CÓDIGOS & BIOLINKS
// =============================================================================

export interface SavedColorPalette {
  id: string;
  tenantId: string;
  name: string;
  primaryShade: number; // e.g. 500 or 700
  shades: {
    shade: number; // 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
    hex: string;
  }[];
  createdAt: string;
}

export interface GeneratedCodeHistoryItem {
  id: string;
  tenantId: string;
  type: 'qr' | 'barcode';
  subType: string;
  value: string;
  label?: string;
  createdAt: string;
}

export type BiolinkTheme =
  | 'minimal_light'
  | 'dark_slate'
  | 'roma_agency'
  | 'vibrant_gradient'
  | 'neon_cyber'
  | 'glassmorphism'
  | 'luxury_gold'
  | 'pastel_rose';

export type BiolinkButtonShape = 'rounded' | 'pill' | 'square' | 'outline' | 'shadow_3d';

export interface BiolinkSocialLink {
  platform: 'instagram' | 'whatsapp' | 'tiktok' | 'youtube' | 'facebook' | 'linkedin' | 'twitter' | 'spotify' | 'website' | 'email' | 'phone';
  url: string;
}

export type BiolinkBlockType =
  | 'link'
  | 'whatsapp'
  | 'phone'
  | 'email'
  | 'location'
  | 'catalog'
  | 'header'
  | 'divider'
  | 'banner'
  | 'video'
  | 'contact';

export interface BiolinkBlock {
  id: string;
  type: BiolinkBlockType;
  title: string;
  url?: string;
  subtitle?: string;
  icon?: string;
  badgeText?: string;
  animation?: 'none' | 'pulse' | 'bounce' | 'glow';
  imageUrl?: string;
  videoUrl?: string;
  isActive: boolean;
  clicksCount: number;
}

export interface BiolinkDailyStat {
  date: string; // YYYY-MM-DD
  views: number;
  clicks: number;
}

export interface BiolinkProfile {
  id: string;
  tenantId: string;
  slug: string; // e.g. "roma", "pizzakhallessi"
  title: string;
  bio: string;
  avatarUrl?: string;
  verified: boolean;
  theme: BiolinkTheme;
  buttonShape: BiolinkButtonShape;
  customBgColor?: string;
  customTextColor?: string;
  customAccentColor?: string;
  socialLinks: BiolinkSocialLink[];
  blocks: BiolinkBlock[];
  viewsCount: number;
  clicksCount: number;
  viewsHistory?: BiolinkDailyStat[];
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}






