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

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'approved' | 'in_review';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskFrequency = 'one_time' | 'daily' | 'daily_recurring' | 'weekly' | 'monthly';

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
  uploadedAt?: string;
}

export interface TaskMilestone {
  id: string;
  title: string;
  descriptionHtml?: string;
  completed: boolean;
  collapsed?: boolean;
  completedAt?: string;
  attachments?: TaskAttachment[];
}

export interface TaskAssignedMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  jobTitle?: string;
}

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
  projectId?: string;
  projectName?: string;
  monthId?: string;
  monthName?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedUserAvatar?: string;
  assignedUsers?: TaskAssignedMember[];
  startDate?: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  frequency?: TaskFrequency;
  tags?: string[];
  milestones?: TaskMilestone[];
  isPinned?: boolean;
  isArchived?: boolean;
  driveFolderId?: string;
  driveFolderName?: string;
  driveFolderUrl?: string;
  pastedImages?: string[];
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








// =============================================================================
// MÓDULO DE ADMINISTRACIÓN (RRHH, FINANZAS Y CONTABILIDAD)
// =============================================================================

export interface EmployeePaymentRecord {
  id: string;
  employeeId: string;
  tenantId: string;
  paymentDate: string; // YYYY-MM-DD
  paymentTime: string; // HH:mm
  amount: number;
  currency: 'PEN' | 'USD';
  periodConcept: string; // ej. "Sueldo Mes Noviembre 2026", "Quincena 1"
  paymentMethod: string;
  operationNumber?: string;
  voucherUrl?: string;
  voucherName?: string;
  notes?: string;
  createdAt: string;
}

export interface EmployeeProfile {
  id: string;
  tenantId: string;
  publicToken?: string; // Token único seguro para la vista pública de historial de pagos
  userId: string; // Enlace directo a la cuenta User
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  jobTitle?: string;
  documentNumber?: string; // DNI / RFC / CI
  documentType?: 'DNI' | 'RUC' | 'CE' | 'PASSPORT' | 'OTRO';
  birthDate?: string; // YYYY-MM-DD
  hireDate?: string; // YYYY-MM-DD
  salary: number; // Salario acordado
  salaryCurrency: 'PEN' | 'USD';
  paymentFrequency: 'monthly' | 'biweekly' | 'weekly';
  entryTime: string; // Formato HH:mm (ej. "09:00")
  exitTime: string; // Formato HH:mm (ej. "18:00")
  workDays: number[]; // 1: Lunes, 2: Martes, etc.
  department?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    cci?: string;
  };
  payments?: EmployeePaymentRecord[];
  status: 'active' | 'inactive' | 'vacation' | 'license';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrGlobalSettings {
  tenantId: string;
  lunchStartTime: string; // ej "13:00"
  lunchEndTime: string; // ej "14:00"
  lunchDurationMinutes: number; // ej 60
  toleranceMinutes: number; // Tolerancia tardanza en minutos ej 10 o 15
  defaultEntryTime: string; // ej "09:00"
  defaultExitTime: string; // ej "18:00"
  workDays: number[]; // [1, 2, 3, 4, 5]
  requirePhoto: boolean; // Obligatorio selfie al marcar
  requireLocation: boolean; // Obligatorio GPS
  allowBiometrics: boolean; // Permitir biometría táctil / FaceID
  strictTardinessLock: boolean; // Si pasa de la tolerancia, bloqueo total hasta código Google Authenticator
  authenticatorSecret?: string; // Secreto Base32 Google Authenticator
  overtimeAllowed: boolean;
  notificationOnLate: boolean;
  updatedAt: string;
}

export const DEFAULT_HR_SETTINGS: HrGlobalSettings = {
  tenantId: '',
  lunchStartTime: '13:00',
  lunchEndTime: '14:00',
  lunchDurationMinutes: 60,
  toleranceMinutes: 15,
  defaultEntryTime: '09:00',
  defaultExitTime: '18:00',
  workDays: [1, 2, 3, 4, 5],
  requirePhoto: true,
  requireLocation: true,
  allowBiometrics: true,
  strictTardinessLock: true,
  authenticatorSecret: '',
  overtimeAllowed: true,
  notificationOnLate: true,
  updatedAt: new Date().toISOString(),
};

export interface AttendanceStamp {
  timestamp: string; // ISO string
  time: string; // "09:04:22"
  photoUrl?: string;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
  };
  isBiometric?: boolean;
  deviceInfo?: string;
  notes?: string;
}

export type AttendanceActionType = 'check_in' | 'break_start' | 'break_end' | 'check_out';

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'early_departure'
  | 'in_progress'
  | 'absent'
  | 'justified';

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  jobTitle?: string;
  date: string; // YYYY-MM-DD
  checkIn?: AttendanceStamp;
  breakStart?: AttendanceStamp;
  breakEnd?: AttendanceStamp;
  checkOut?: AttendanceStamp;
  totalWorkMinutes?: number;
  breakMinutes?: number;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceTransaction {
  id: string;
  tenantId: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  currency: 'PEN' | 'USD';
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod?: string;
  reference?: string;
  status: 'completed' | 'pending' | 'cancelled';
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingEntry {
  id: string;
  tenantId: string;
  entryNumber: string;
  date: string; // YYYY-MM-DD
  concept: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  status: 'draft' | 'posted';
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// SUBMÓDULO: FORMULARIOS INTERACTIVOS DE AGENCIA (WORKSPACE)
// =============================================================================
export type FormFieldType =
  | 'text'
  | 'paragraph'
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'file'
  | 'date'
  | 'scale'
  | 'range'
  | 'color'
  | 'cards'
  | 'comparative'
  | 'section';

export interface FormCardOption {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  badge?: string;
}

export interface FormComparativeOption {
  id: string;
  title: string;
  tagline?: string;
  price?: string;
  isPopular?: boolean;
  features: string[];
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // Para radio, checkbox, select, presets de color
  cardOptions?: FormCardOption[]; // Para 'cards'
  comparativeOptions?: FormComparativeOption[]; // Para 'comparative'
  // Configuración de subida de archivos
  maxFileSizeMb?: number; // e.g. 5, 10, 25, 50, 100
  maxFilesCount?: number; // e.g. 1 a 10
  allowedFileTypes?: string[]; // e.g. ['image/*', 'application/pdf', '.doc,.docx', '.zip']
  // Configuración de escalas (rating)
  scaleMin?: number; // 1
  scaleMax?: number; // 5 o 10
  scaleMinLabel?: string; // e.g. "Poco probable" / "Malo"
  scaleMaxLabel?: string; // e.g. "Muy probable" / "Excelente"
  // Configuración de rango
  rangeMin?: number; // 0
  rangeMax?: number; // 100
  rangeStep?: number; // 1
  rangeUnit?: string; // e.g. "%", "USD", "pts"
  defaultValue?: any;
}

export interface FormWelcomeScreen {
  enabled: boolean;
  title: string;
  description: string;
  buttonText: string;
}

export interface FormThankYouScreen {
  title: string;
  message: string;
  buttonText?: string;
  buttonUrl?: string;
}

export interface FormCustomization {
  coverImage?: string;
  logoUrl?: string;
  primaryColor?: string; // hex
  themeMode?: 'light' | 'dark' | 'auto';
  borderRadius?: 'rounded-none' | 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl';
  fontFamily?: 'sans' | 'serif' | 'mono';
  bgPattern?: 'none' | 'dots' | 'grid' | 'gradient' | 'mesh';
}

export interface FormSettings {
  collectClientName: boolean;
  collectClientEmail: boolean;
  showAgencyLogo: boolean;
  isMultiStep: boolean;
  welcomeScreen: FormWelcomeScreen;
  thankYouScreen: FormThankYouScreen;
}

export type FormStatus = 'draft' | 'published' | 'closed';

export interface WorkspaceForm {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  slug: string; // Enlace corto amigable (ej: "brief-marca-2026")
  status: FormStatus;
  fields: FormField[];
  customization: FormCustomization;
  settings: FormSettings;
  viewsCount: number;
  submissionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmissionFile {
  fieldId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
}

export interface FormSubmission {
  id: string;
  tenantId: string;
  formId: string;
  formTitle: string;
  clientName?: string;
  clientEmail?: string;
  answers: Record<string, any>;
  files?: FormSubmissionFile[];
  submittedAt: string;
  ip?: string;
  userAgent?: string;
}

// =============================================================================
// SUBMÓDULO DE WORKSPACE: SALAS DE REUNIONES & ACTAS
// =============================================================================

export type MeetingRoomStatus = 'available' | 'in_meeting' | 'reserved';
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MeetingRecordingType = 'drive' | 'loom' | 'youtube' | 'file' | 'other';

export interface WorkspaceMeetingRoom {
  id: string;
  tenantId: string;
  code: string; // ej: "SALA-01", "CREATIVA"
  name: string;
  description?: string;
  color: string; // Hex color o preset de acento
  icon: string; // Nombre del icono de Lucide (Video, Users, Sparkles, etc.)
  meetUrl?: string; // Enlace permanente de Google Meet
  isPreset?: boolean; // Si es una de las salas predeterminadas fijas
  status: MeetingRoomStatus;
  currentMeetingId?: string;
  recordingsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMeetingAgreement {
  id: string;
  title: string;
  description?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  dueDate?: string; // YYYY-MM-DD
  completed: boolean;
  createdTaskId?: string; // ID de la WorkspaceTask si fue convertida a tarea
}

export interface WorkspaceMeetingRecording {
  id: string;
  title: string;
  url: string;
  type: MeetingRecordingType;
  recordedAt?: string;
  durationMinutes?: number;
  notes?: string;
}

export interface WorkspaceMeeting {
  id: string;
  tenantId: string;
  roomId?: string;
  roomName?: string;
  title: string; // Motivo de la reunión
  clientId?: string;
  clientName?: string;
  brandId?: string;
  brandName?: string;
  brandLogo?: string;
  scheduledAt: string; // ISO DateTime
  durationMinutes?: number;
  status: MeetingStatus;
  meetUrl?: string;
  googleCalendarEventId?: string;
  attendeeUserIds: string[];
  attendeeClientEmails?: string[];
  agenda?: string;
  summary?: string;
  agreements: WorkspaceMeetingAgreement[];
  recordings: WorkspaceMeetingRecording[];
  attachments?: Array<{ name: string; url: string; size?: number }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// SUBMÓDULO DE WORKSPACE: PIZARRAS CREATIVAS (WHITEBOARDS)
// =============================================================================

export interface WhiteboardTag {
  name: string;
  color: string;
}

export interface WhiteboardUserAccess {
  userId: string;
  userName?: string;
  userAvatar?: string;
  email?: string;
  role: 'editor' | 'viewer';
}

export interface WhiteboardInvitation {
  id: string;
  whiteboardId: string;
  email: string;
  role: 'editor' | 'viewer';
  token: string;
  createdAt: string;
}

export interface WhiteboardFolder {
  id: string;
  tenantId: string;
  name: string;
  color: string;
  createdBy: string;
  createdAt: string;
}

export type WhiteboardAccessType = 'restricted' | 'public';
export type WhiteboardPublicRole = 'viewer' | 'editor';

export interface Whiteboard {
  id: string;
  tenantId: string;
  title: string;
  content?: string; // Fabric.js JSON serialized canvas
  thumbnail?: string; // Base64 data URL
  profilePic?: string; // Cover / thumbnail image URL
  folderId?: string | null;
  tags: WhiteboardTag[];
  accessType: WhiteboardAccessType;
  publicRole: WhiteboardPublicRole;
  shareToken?: string;
  createdBy: string;
  createdByName?: string;
  createdByAvatar?: string;
  assignedUsers: WhiteboardUserAccess[];
  invitations?: WhiteboardInvitation[];
  createdAt: string;
  updatedAt: string;
}



// =============================================================================
// SUBMÓDULO: BRAND GUIDELINES / PITCH DECKS DE IDENTIDAD VISUAL
// =============================================================================

export interface BrandGuidelineColor {
  id: string;
  name: string;
  hex: string;
  pantone?: string;
  cmyk?: string;
  rgb?: string;
  role?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'dark' | 'light';
}

export interface BrandGuidelineFont {
  id: string;
  role: 'headings' | 'body' | 'accent';
  fontFamily: string;
  weight: string;
  sampleText?: string;
  customFontDataUrl?: string;
  customFontFileName?: string;
}

export interface BrandGuidelineSlideStat {
  slideId: string;
  slideTitle: string;
  views: number;
  totalSeconds: number;
}

export interface BrandGuidelineRoundSnapshot {
  id: string;
  round: string;
  savedAt: string;
  note?: string;
  logoPrimaryUrl?: string;
  colors?: BrandGuidelineColor[];
}

export interface BrandGuidelineGoal {
  id: string;
  number: string; // ej: "01", "02", "03"
  title: string;
  description: string;
}

export interface BrandGuidelineMerchItem {
  id: string;
  type: 'sweatshirt' | 'tshirt' | 'hoodie' | 'cap' | 'totebag' | 'bottle' | 'badge' | 'laptop' | 'custom';
  title: string;
  imageUrl?: string;
  variant?: 'black' | 'white' | 'gray';
}

export interface BrandGuidelineOtherIdea {
  id: string;
  title: string;
  svgIcon?: string;
  imageUrl?: string;
}

export interface BrandGuidelineStep {
  id: string;
  step: string; // ej: "01", "02", "03", "04"
  title: string;
  description: string;
}

export interface BrandGuidelineDontRule {
  id: string;
  title: string;
  ruleType: 'stretch' | 'rotate' | 'recolor' | 'shadow' | 'contrast' | 'rearrange';
}

export interface BrandGuidelineComment {
  id: string;
  slideId: string;
  slideTitle: string;
  authorName: string;
  text: string;
  resolved?: boolean;
  createdAt: string;
}

export type BrandGuidelineStatus = 'draft' | 'in_review' | 'approved' | 'changes_requested';

export interface BrandGuideline {
  id: string;
  tenantId: string;
  projectId?: string | null;
  projectName?: string;
  clientId?: string | null;
  clientName: string;
  clientLogo?: string;
  brandName: string;
  designerName?: string;
  round?: string; // ej: "Round 1", "Versión Final"
  date?: string;
  tagline?: string;
  publicToken: string;
  requirePin: boolean;
  publicPin?: string;
  themeDefault: 'dark' | 'light';
  viewModeDefault: 'deck' | 'grid'; // 'deck' (16:9 carrusel) o 'grid' (2x2 showreel como en el video)
  
  // Estado de aprobación y feedback del cliente
  status?: BrandGuidelineStatus;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  comments?: BrandGuidelineComment[];

  // Contenidos editoriales
  briefOverviewTitle?: string;
  briefOverviewText?: string;
  briefSecondaryText?: string;
  
  // Pilares estratégicos
  goals: BrandGuidelineGoal[];
  
  // Dirección de logotipo y Comparador Antes / Después
  directionName?: string; // ej: "Direction One"
  directionRationale?: string;
  logoPrimaryUrl?: string; // Logo blanco sobre fondo oscuro
  logoSecondaryUrl?: string; // Logo oscuro sobre fondo claro
  logoSymbolUrl?: string; // Icono / Isotipo aislado (versión clara o principal)
  logoSymbolDarkUrl?: string; // Icono / Isotipo aislado (versión oscura sobre fondo claro)
  mockupStampMode?: 'auto' | 'symbol_only' | 'full_logo'; // Qué estampar en mockups
  isRebrand?: boolean; // Si es false (Marca Nueva), no se muestra la lámina comparativa Antes vs Después
  logoBeforeUrl?: string; // Logo anterior para slider comparativo Antes vs Después
  brandBeforeLabel?: string; // Etiqueta para estado anterior (ej: "Identidad Anterior 2019")
  clearspaceUnit?: string; // ej: "1x"
  donts?: BrandGuidelineDontRule[];
  stampPosition?: 'chest_left' | 'center_large' | 'back_print';
  stampScale?: number; // 60 a 150 (porcentaje)
  photoSceneMode?: 'studio_3d' | 'urban_model' | 'coffee_shop' | 'creative_office';
  iconStrokeWidth?: string; // ej: "2px"
  iconCornerRadius?: string; // ej: "6px"

  // Analítica (Heatmap) e Historial de Rondas
  viewsCount?: number;
  lastViewedAt?: string;
  slideAnalytics?: Record<string, BrandGuidelineSlideStat>;
  roundHistory?: BrandGuidelineRoundSnapshot[];
  
  // Paleta de colores
  colors: BrandGuidelineColor[];
  
  // Tipografías
  typography: BrandGuidelineFont[];
  
  // Métrica / KPI destacada
  statNumber?: string; // ej: "$2.5M", "+180%"
  statLabel?: string; // ej: "Key performance metric"
  
  // Mockups digitales
  mockupAppIconUrl?: string;
  mockupMobileScreenUrl?: string;
  mockupMobileUrlWebsite?: string; // ej: "www.pixel-truck.com"
  mockupDesktopScreenUrl?: string;
  
  // Merchandising y aplicaciones
  merchItems: BrandGuidelineMerchItem[];
  
  // Otras ideas / Isotipos alternativos
  otherIdeas: BrandGuidelineOtherIdea[];
  
  // Próximos pasos
  nextSteps: BrandGuidelineStep[];

  // Kit de Descarga / Google Drive
  driveFolderId?: string;
  driveFolderName?: string;
  driveFolderUrl?: string;
  
  createdAt: string;
  updatedAt: string;
}
