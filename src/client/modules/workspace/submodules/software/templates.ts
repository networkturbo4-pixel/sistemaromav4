import {
  SoftwareProjectType,
  SoftwareProjectStatus,
  SoftwareMilestoneStatus,
  SoftwareWorkItemType,
  SoftwareWorkItemStatus,
  SoftwareBugSeverity,
  SoftwareMilestone,
  SoftwareCustomTemplate,
  TaskPriority,
} from '../../../../../shared/types';

export interface MilestoneTemplateSeed {
  title: string;
  description: string;
  deliverables: string[];
  durationDays: number;
  weightPercent: number;
}

export interface ProjectTemplateDefinition {
  key: SoftwareProjectType | 'blank';
  label: string;
  shortLabel: string;
  description: string;
  defaultStack: string[];
  milestones: MilestoneTemplateSeed[];
}

export const SOFTWARE_PROJECT_TEMPLATES: ProjectTemplateDefinition[] = [
  {
    key: 'custom_saas',
    label: 'Sistema Web / SaaS a Medida',
    shortLabel: 'SaaS / Sistema',
    description: 'Arquitectura completa, autenticación, módulos core, integraciones, QA y despliegue.',
    defaultStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
    milestones: [
      {
        title: 'Descubrimiento, BD y Arquitectura',
        description: 'Levantamiento funcional, diagrama ER, arquitectura API y wireframes UX/UI.',
        deliverables: ['Documento de alcance técnico', 'Modelo de base de datos', 'Prototipo navegable Figma'],
        durationDays: 7,
        weightPercent: 15,
      },
      {
        title: 'Core Backend, Auth y Roles',
        description: 'Configuración de servidor, autenticación segura, roles/permisos y estructura base.',
        deliverables: ['API de autenticación', 'Gestión de usuarios y roles', 'Entorno Staging activo'],
        durationDays: 10,
        weightPercent: 20,
      },
      {
        title: 'Módulos Operativos Principales',
        description: 'Desarrollo Frontend y Backend de los flujos críticos del negocio.',
        deliverables: ['CRUDs operativos completos', 'Panel principal y KPIs', 'Validaciones de negocio'],
        durationDays: 14,
        weightPercent: 30,
      },
      {
        title: 'Integraciones, Reportes y Automatizaciones',
        description: 'Conexión con APIs externas, exportación de reportes y notificaciones.',
        deliverables: ['Webhooks / APIs externas', 'Reportes descargables', 'Alertas en tiempo real'],
        durationDays: 10,
        weightPercent: 20,
      },
      {
        title: 'QA Integral, UAT con Cliente y Despliegue',
        description: 'Pruebas end-to-end, corrección de bugs, validación del cliente y pase a producción.',
        deliverables: ['Acta de QA sin críticos', 'Despliegue en producción + SSL', 'Manual y capacitación'],
        durationDays: 7,
        weightPercent: 15,
      },
    ],
  },
  {
    key: 'ecommerce',
    label: 'E-Commerce / Tienda Online',
    shortLabel: 'E-Commerce',
    description: 'Catálogo administrable, carrito, pasarela de pagos, logística y pruebas de compra real.',
    defaultStack: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Stripe / Culqi', 'PostgreSQL'],
    milestones: [
      {
        title: 'Diseño UI/UX y Arquitectura de Catálogo',
        description: 'Diseño de Home, ficha de producto, categorías, filtros y flujo de compra móvil.',
        deliverables: ['Prototipo UI Desktop & Mobile', 'Estructura de categorías y variantes'],
        durationDays: 7,
        weightPercent: 20,
      },
      {
        title: 'Catálogo, Buscador y Carrito',
        description: 'Implementación del catálogo dinámico, filtros, cupones y carrito persistente.',
        deliverables: ['Vitrina y ficha de producto', 'Carrito lateral interactivo', 'Gestión de stock'],
        durationDays: 10,
        weightPercent: 25,
      },
      {
        title: 'Checkout, Pasarela de Pagos y Envíos',
        description: 'Integración de pagos online, cálculo de envío y correos transaccionales.',
        deliverables: ['Checkout optimizado', 'Pasarela en modo sandbox y prod', 'Notificaciones de pedido'],
        durationDays: 10,
        weightPercent: 25,
      },
      {
        title: 'Panel Administrativo y SEO',
        description: 'Backoffice de pedidos, inventario, clientes y optimización de velocidad.',
        deliverables: ['Panel de pedidos', 'Optimización Core Web Vitals', 'Pixel / Analytics'],
        durationDays: 7,
        weightPercent: 15,
      },
      {
        title: 'Pruebas de Compra Real (QA/UAT) y Go-Live',
        description: 'Validación de compras reales, seguridad SSL y lanzamiento en dominio oficial.',
        deliverables: ['Test de compra exitoso', 'Dominio + SSL configurados', 'Guía de administración'],
        durationDays: 5,
        weightPercent: 15,
      },
    ],
  },
  {
    key: 'corporate_web',
    label: 'Sitio Web Corporativo',
    shortLabel: 'Web Corporativa',
    description: 'Web institucional multi-sección, autoadministrable, formularios y SEO técnico.',
    defaultStack: ['React', 'Tailwind CSS', 'Vite', 'SEO Técnico'],
    milestones: [
      {
        title: 'Arquitectura de Información y Diseño UI',
        description: 'Mapa del sitio, propuesta visual en Figma y aprobación de línea gráfica.',
        deliverables: ['Sitemap', 'Diseño Desktop & Mobile en Figma'],
        durationDays: 6,
        weightPercent: 25,
      },
      {
        title: 'Desarrollo Frontend Responsive',
        description: 'Maquetación de páginas internas, animaciones sutiles y adaptabilidad móvil.',
        deliverables: ['Home + páginas internas', 'Versión 100% responsive'],
        durationDays: 8,
        weightPercent: 35,
      },
      {
        title: 'Formularios, Integraciones y SEO',
        description: 'Conexión de formularios a correo/WhatsApp, metadatos OpenGraph y analítica.',
        deliverables: ['Formularios con anti-spam', 'Google Analytics / Meta Pixel', 'Sitemap & robots.txt'],
        durationDays: 5,
        weightPercent: 20,
      },
      {
        title: 'QA Cross-Browser y Lanzamiento',
        description: 'Pruebas en dispositivos reales, migración DNS, SSL y entrega final.',
        deliverables: ['Revisión Lighthouse > 90', 'Publicación en dominio oficial'],
        durationDays: 4,
        weightPercent: 20,
      },
    ],
  },
  {
    key: 'landing_web',
    label: 'Landing Page de Conversión',
    shortLabel: 'Landing Page',
    description: 'Página enfocada en captación de leads/ventas con velocidad extrema y tracking.',
    defaultStack: ['React', 'Tailwind CSS', 'Google Tag Manager'],
    milestones: [
      {
        title: 'Copywriting Estratégico y Diseño UI',
        description: 'Estructura persuasiva, jerarquía visual y prototipo responsive.',
        deliverables: ['Wireframe de conversión', 'Diseño final aprobado'],
        durationDays: 4,
        weightPercent: 30,
      },
      {
        title: 'Desarrollo, Formularios y Tracking',
        description: 'Maquetación ultra rápida, CTA WhatsApp/formulario y eventos de conversión.',
        deliverables: ['Landing en Staging', 'Integración de leads y píxeles'],
        durationDays: 5,
        weightPercent: 45,
      },
      {
        title: 'QA Móvil y Publicación',
        description: 'Verificación de carga rápida, pruebas de formulario y despliegue en dominio.',
        deliverables: ['Dominio + SSL', 'Checklist QA aprobado'],
        durationDays: 3,
        weightPercent: 25,
      },
    ],
  },
  {
    key: 'mobile_app',
    label: 'Aplicación Móvil (iOS / Android)',
    shortLabel: 'App Móvil',
    description: 'Prototipo móvil, API, pantallas core, beta testing y publicación en tiendas.',
    defaultStack: ['React Native', 'Expo', 'TypeScript', 'Node.js'],
    milestones: [
      {
        title: 'Prototipo Interactivo UI/UX',
        description: 'Flujos de usuario iOS/Android, sistema de componentes y navegación.',
        deliverables: ['Prototipo Figma interactivo', 'Guía de pantallas'],
        durationDays: 8,
        weightPercent: 20,
      },
      {
        title: 'Arquitectura API y Base de App',
        description: 'Backend, autenticación, navegación y almacenamiento local.',
        deliverables: ['Endpoints base', 'Login y sesión persistente'],
        durationDays: 10,
        weightPercent: 20,
      },
      {
        title: 'Funcionalidades Core y Notificaciones Push',
        description: 'Implementación de pantallas principales y alertas push en tiempo real.',
        deliverables: ['Módulos funcionales completos', 'Push notifications activas'],
        durationDays: 14,
        weightPercent: 30,
      },
      {
        title: 'Beta Testing (TestFlight / APK)',
        description: 'Distribución de versión beta a cliente, recolección de feedback y ajustes QA.',
        deliverables: ['Build Beta iOS/Android', 'Corrección de incidencias UAT'],
        durationDays: 7,
        weightPercent: 15,
      },
      {
        title: 'Publicación en App Store y Google Play',
        description: 'Preparación de fichas, capturas, revisión de tiendas y salida a producción.',
        deliverables: ['App publicada en tiendas', 'Documentación técnica'],
        durationDays: 7,
        weightPercent: 15,
      },
    ],
  },
  {
    key: 'api_integration',
    label: 'API / Automatización / Integración',
    shortLabel: 'API / Integración',
    description: 'Servicios backend, webhooks, sincronización entre plataformas y monitoreo.',
    defaultStack: ['Node.js', 'TypeScript', 'REST / Webhooks', 'PostgreSQL'],
    milestones: [
      {
        title: 'Especificación Técnica y Contratos API',
        description: 'Mapeo de endpoints, autenticación, payloads y manejo de errores.',
        deliverables: ['Especificación OpenAPI / Docs', 'Matriz de mapeo de datos'],
        durationDays: 5,
        weightPercent: 25,
      },
      {
        title: 'Desarrollo de Integración y Reintentos',
        description: 'Implementación de conectores, colas, logs y tolerancia a fallos.',
        deliverables: ['Servicio funcionando en Staging', 'Logs y alertas de error'],
        durationDays: 10,
        weightPercent: 45,
      },
      {
        title: 'Pruebas de Carga, QA y Producción',
        description: 'Validación con datos reales, monitoreo y pase a producción.',
        deliverables: ['Pruebas automatizadas', 'Despliegue en producción'],
        durationDays: 5,
        weightPercent: 30,
      },
    ],
  },
  {
    key: 'blank',
    label: 'Proyecto en Blanco (Hitos Personalizados)',
    shortLabel: 'Personalizado',
    description: 'Empieza sin hitos predefinidos y arma tu propia estructura dinámica.',
    defaultStack: [],
    milestones: [],
  },
];

function addDaysIso(startIso: string, days: number): string {
  const base = startIso ? new Date(`${startIso}T12:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 10);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export function buildMilestonesFromTemplate(
  templateKey: SoftwareProjectType | 'blank',
  startDateIso: string
): { milestones: SoftwareMilestone[]; suggestedEndDate: string; defaultStack: string[] } {
  const tpl = SOFTWARE_PROJECT_TEMPLATES.find((t) => t.key === templateKey);
  if (!tpl || tpl.milestones.length === 0) {
    return {
      milestones: [],
      suggestedEndDate: addDaysIso(startDateIso, 30),
      defaultStack: tpl?.defaultStack || [],
    };
  }

  let cursor = startDateIso || new Date().toISOString().slice(0, 10);
  const milestones: SoftwareMilestone[] = tpl.milestones.map((seed, idx) => {
    const mStart = cursor;
    const mEnd = addDaysIso(mStart, Math.max(1, seed.durationDays - 1));
    cursor = addDaysIso(mEnd, 1);
    return {
      id: `swm_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      orderIndex: idx,
      code: `H${idx + 1}`,
      title: seed.title,
      description: seed.description,
      deliverables: [...seed.deliverables],
      startDate: mStart,
      dueDate: mEnd,
      weightPercent: seed.weightPercent,
      progress: 0,
      autoCalculateProgress: true,
      status: idx === 0 ? 'in_progress' : 'pending',
      demoUrl: '',
      attachments: [],
      isVisibleToClient: true,
      clientApproval: { status: 'pending' },
      comments: [],
    };
  });

  const lastEnd = milestones[milestones.length - 1]?.dueDate || addDaysIso(startDateIso, 30);
  return {
    milestones,
    suggestedEndDate: lastEnd,
    defaultStack: tpl.defaultStack,
  };
}

export const PROJECT_STATUS_META: Record<
  SoftwareProjectStatus,
  { label: string; badge: string; dot: string }
> = {
  planning: {
    label: 'Planificación',
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
    dot: 'bg-slate-400',
  },
  in_development: {
    label: 'En Desarrollo',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
    dot: 'bg-sky-500',
  },
  qa_testing: {
    label: 'En QA / Pruebas',
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25',
    dot: 'bg-violet-500',
  },
  uat_review: {
    label: 'Revisión Cliente',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    dot: 'bg-amber-500',
  },
  deployed: {
    label: 'Desplegado',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    dot: 'bg-emerald-500',
  },
  maintenance: {
    label: 'Mantenimiento',
    badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25',
    dot: 'bg-teal-500',
  },
  paused: {
    label: 'Pausado',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    dot: 'bg-rose-500',
  },
};

export const MILESTONE_STATUS_META: Record<
  SoftwareMilestoneStatus,
  { label: string; badge: string; barColor: string }
> = {
  pending: {
    label: 'Pendiente',
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
    barColor: 'bg-slate-400',
  },
  in_progress: {
    label: 'En Desarrollo',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
    barColor: 'bg-sky-500',
  },
  qa: {
    label: 'En QA / Testing',
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25',
    barColor: 'bg-violet-500',
  },
  client_review: {
    label: 'Revisión Cliente',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    barColor: 'bg-amber-500',
  },
  approved: {
    label: 'Aprobado',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    barColor: 'bg-emerald-500',
  },
  blocked: {
    label: 'Bloqueado',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    barColor: 'bg-rose-500',
  },
};

export const WORK_ITEM_COLUMNS: Array<{
  id: SoftwareWorkItemStatus;
  label: string;
  accent: string;
  dot: string;
}> = [
  { id: 'backlog', label: 'Backlog', accent: 'border-slate-300 dark:border-slate-700', dot: 'bg-slate-400' },
  { id: 'todo', label: 'Por Hacer', accent: 'border-blue-300 dark:border-blue-800', dot: 'bg-blue-500' },
  { id: 'in_progress', label: 'En Desarrollo', accent: 'border-sky-300 dark:border-sky-800', dot: 'bg-sky-500' },
  { id: 'code_review', label: 'Code Review', accent: 'border-indigo-300 dark:border-indigo-800', dot: 'bg-indigo-500' },
  { id: 'qa_testing', label: 'QA / Testing', accent: 'border-violet-300 dark:border-violet-800', dot: 'bg-violet-500' },
  { id: 'done', label: 'Completado', accent: 'border-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500' },
];

export const WORK_ITEM_TYPE_META: Record<
  SoftwareWorkItemType,
  { label: string; badge: string }
> = {
  feature: { label: 'Feature', badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  task: { label: 'Tarea', badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  bug: { label: 'Bug / Incidencia', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25' },
  improvement: { label: 'Mejora', badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' },
  qa_check: { label: 'Check QA', badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
};

export const BUG_SEVERITY_META: Record<
  SoftwareBugSeverity,
  { label: string; badge: string; ring: string }
> = {
  critical: {
    label: 'Crítico',
    badge: 'bg-rose-600 text-white border-rose-700',
    ring: 'border-rose-500/40 bg-rose-500/5',
  },
  major: {
    label: 'Mayor',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    ring: 'border-amber-500/30 bg-amber-500/5',
  },
  minor: {
    label: 'Menor',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    ring: 'border-sky-500/25 bg-sky-500/5',
  },
  cosmetic: {
    label: 'Cosmético',
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
    ring: 'border-slate-500/20 bg-slate-500/5',
  },
};

export const PRIORITY_META: Record<TaskPriority, { label: string; badge: string }> = {
  low: { label: 'Baja', badge: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  medium: { label: 'Media', badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  high: { label: 'Alta', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25' },
  urgent: { label: 'Urgente', badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
};

export const PHASE_TAG_PRESETS: Array<{ label: string; color: string }> = [
  { label: 'Discovery', color: '#8b5cf6' },
  { label: 'Arquitectura', color: '#0ea5e9' },
  { label: 'Diseño UI/UX', color: '#ec4899' },
  { label: 'Backend', color: '#6366f1' },
  { label: 'Frontend', color: '#06b6d4' },
  { label: 'QA / UAT', color: '#f59e0b' },
  { label: 'Go-Live', color: '#10b981' },
  { label: 'Mantenimiento SLA', color: '#64748b' },
];

export function buildMilestonesFromCustomTemplate(
  tpl: SoftwareCustomTemplate,
  startDateIso: string
): { milestones: SoftwareMilestone[]; suggestedEndDate: string; defaultStack: string[] } {
  if (!tpl || !tpl.milestones || tpl.milestones.length === 0) {
    return {
      milestones: [],
      suggestedEndDate: addDaysIso(startDateIso, 30),
      defaultStack: tpl?.defaultStack || [],
    };
  }

  let cursor = startDateIso || new Date().toISOString().slice(0, 10);
  const milestones: SoftwareMilestone[] = tpl.milestones.map((seed, idx) => {
    const mStart = cursor;
    const mEnd = addDaysIso(mStart, Math.max(1, (seed.durationDays || 7) - 1));
    cursor = addDaysIso(mEnd, 1);
    const id = `swm_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
    const deliverables = Array.isArray(seed.deliverables) ? [...seed.deliverables] : [];
    return {
      id,
      orderIndex: idx,
      code: `H${idx + 1}`,
      title: seed.title,
      description: seed.description || '',
      deliverables,
      deliverableItems: deliverables.map((title, dIdx) => ({
        id: `del_${id}_${dIdx}`,
        title,
        completed: false,
      })),
      startDate: mStart,
      dueDate: mEnd,
      baselineStartDate: mStart,
      baselineDueDate: mEnd,
      dateHistory: [],
      dependsOnMilestoneIds: [],
      phaseTag: seed.phaseTag || '',
      phaseColor: seed.phaseColor || '',
      isRecurringSla: Boolean(seed.isRecurringSla),
      slaMonthlyHours: seed.slaMonthlyHours,
      slaUsedHours: 0,
      weightPercent: seed.weightPercent || 20,
      progress: 0,
      autoCalculateProgress: true,
      status: idx === 0 ? 'in_progress' : 'pending',
      demoUrl: '',
      attachments: [],
      isVisibleToClient: true,
      clientApproval: { status: 'pending' },
      comments: [],
    };
  });

  return {
    milestones,
    suggestedEndDate: milestones[milestones.length - 1]?.dueDate || addDaysIso(startDateIso, 30),
    defaultStack: [...(tpl.defaultStack || [])],
  };
}
