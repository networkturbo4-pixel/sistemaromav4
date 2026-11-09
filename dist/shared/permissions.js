"use strict";
/**
 * REGLA GLOBAL DE ARQUITECTURA: SISTEMA DE PERMISOS GRANULARES MULTITENANT
 * ============================================================================
 * Todo módulo, vista, endpoint de API o acción de interfaz que se construya en
 * el sistema DEBE registrarse en este catálogo global y validarse tanto en:
 *   1. Backend: middleware `requirePermission('modulo.accion')`
 *   2. Frontend: hook `usePermissions().can('modulo.accion')` o `<PermissionGate>`
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PERMISSION_KEYS = exports.PERMISSIONS_CATALOG = void 0;
exports.hasPermission = hasPermission;
exports.hasAnyPermission = hasAnyPermission;
exports.PERMISSIONS_CATALOG = [
    // DASHBOARD
    {
        key: 'dashboard.view',
        label: 'Ver Dashboard Principal',
        description: 'Acceso a la vista principal tipo app y resumen operativo de la agencia.',
        module: 'dashboard',
        moduleLabel: 'Dashboard y Resumen',
    },
    {
        key: 'dashboard.metrics',
        label: 'Ver Indicadores y KPIs de Agencia',
        description: 'Visualizar contadores globales de clientes, marcas activas y métricas del tenant.',
        module: 'dashboard',
        moduleLabel: 'Dashboard y Resumen',
    },
    // CLIENTES Y MARCAS
    {
        key: 'clients.view',
        label: 'Ver Directorio de Clientes',
        description: 'Consultar el listado, buscador y ficha detallada de clientes del tenant.',
        module: 'clients',
        moduleLabel: 'Módulo de Clientes y Marcas',
    },
    {
        key: 'clients.create',
        label: 'Crear Nuevos Clientes',
        description: 'Registrar nuevos clientes con DNI/RUC, WhatsApp, correo opcional y marcas iniciales.',
        module: 'clients',
        moduleLabel: 'Módulo de Clientes y Marcas',
    },
    {
        key: 'clients.edit',
        label: 'Editar Datos de Clientes',
        description: 'Modificar nombre, documento DNI/RUC, WhatsApp, correo o estado de un cliente.',
        module: 'clients',
        moduleLabel: 'Módulo de Clientes y Marcas',
    },
    {
        key: 'clients.delete',
        label: 'Eliminar Clientes',
        description: 'Eliminar clientes y sus marcas asociadas del registro del tenant.',
        module: 'clients',
        moduleLabel: 'Módulo de Clientes y Marcas',
        isCritical: true,
    },
    {
        key: 'brands.view',
        label: 'Ver Marcas Asignadas',
        description: 'Visualizar las marcas, colores e identidad asignadas a cada cliente.',
        module: 'clients',
        moduleLabel: 'Módulo de Clientes y Marcas',
    },
    {
        key: 'brands.create',
        label: 'Crear y Asignar Marcas',
        description: 'Añadir nuevas marcas comerciales dentro de la cuenta de un cliente.',
        module: 'clients',
        moduleLabel: 'Módulo de Clientes y Marcas',
    },
    {
        key: 'brands.edit',
        label: 'Editar Marcas de Clientes',
        description: 'Actualizar nombre de marca, rubro, color identificador o redes de la marca.',
        module: 'clients',
        moduleLabel: 'Módulo de Clientes y Marcas',
    },
    {
        key: 'brands.delete',
        label: 'Eliminar Marcas de Clientes',
        description: 'Desvincular o eliminar una marca registrada en un cliente.',
        module: 'clients',
        moduleLabel: 'Módulo de Clientes y Marcas',
        isCritical: true,
    },
    // COTIZACIONES & PROPUESTAS COMERCIALES
    {
        key: 'quotes.view',
        label: 'Ver Módulo de Cotizaciones',
        description: 'Consultar el listado de cotizaciones, buscador, estados y montos.',
        module: 'quotes',
        moduleLabel: 'Módulo de Cotizaciones',
    },
    {
        key: 'quotes.create',
        label: 'Crear Cotizaciones y Propuestas',
        description: 'Generar nuevas propuestas comerciales con partidas, formato rico, tablas, Gantt y métodos de pago.',
        module: 'quotes',
        moduleLabel: 'Módulo de Cotizaciones',
    },
    {
        key: 'quotes.edit',
        label: 'Editar Cotizaciones',
        description: 'Modificar servicios, precios, fechas, temas visuales y condiciones de una cotización.',
        module: 'quotes',
        moduleLabel: 'Módulo de Cotizaciones',
    },
    {
        key: 'quotes.delete',
        label: 'Eliminar Cotizaciones',
        description: 'Eliminar propuestas comerciales del registro del tenant.',
        module: 'quotes',
        moduleLabel: 'Módulo de Cotizaciones',
        isCritical: true,
    },
    {
        key: 'quotes.send',
        label: 'Enviar y Compartir Propuestas Públicas',
        description: 'Compartir cotizaciones por WhatsApp y copiar enlaces de vista pública interactiva.',
        module: 'quotes',
        moduleLabel: 'Módulo de Cotizaciones',
    },
    // SERVICIOS DE AGENCIA
    {
        key: 'services.view',
        label: 'Ver Catálogo y Gestión de Servicios',
        description: 'Consultar el catálogo de servicios de la agencia, tarjetas y fichas.',
        module: 'services',
        moduleLabel: 'Módulo de Servicios',
    },
    {
        key: 'services.create',
        label: 'Crear Nuevos Servicios',
        description: 'Crear nuevos servicios con portada, paquetes, galería, contenidos, entregables y SEO.',
        module: 'services',
        moduleLabel: 'Módulo de Servicios',
    },
    {
        key: 'services.edit',
        label: 'Editar Servicios',
        description: 'Modificar datos generales, precios, galería, entregables, FAQs y configuración de servicios.',
        module: 'services',
        moduleLabel: 'Módulo de Servicios',
    },
    {
        key: 'services.delete',
        label: 'Eliminar Servicios',
        description: 'Eliminar servicios del catálogo de la agencia.',
        module: 'services',
        moduleLabel: 'Módulo de Servicios',
        isCritical: true,
    },
    {
        key: 'services.categories.manage',
        label: 'Gestionar Categorías de Servicios',
        description: 'Crear, editar y eliminar categorías para organizar los servicios.',
        module: 'services',
        moduleLabel: 'Módulo de Servicios',
    },
    // NOTAS DE PAGO & COBRANZAS
    {
        key: 'payments.view',
        label: 'Ver Notas de Pago y Cobranzas',
        description: 'Consultar listado, estados de cobranza y comprobantes de pago de la agencia.',
        module: 'payments',
        moduleLabel: 'Módulo de Notas de Pago',
    },
    {
        key: 'payments.create',
        label: 'Crear Notas de Pago',
        description: 'Generar nuevos comprobantes de cobro y recibos para clientes.',
        module: 'payments',
        moduleLabel: 'Módulo de Notas de Pago',
    },
    {
        key: 'payments.edit',
        label: 'Editar Notas de Pago',
        description: 'Modificar conceptos, montos, fechas y registrar abonos.',
        module: 'payments',
        moduleLabel: 'Módulo de Notas de Pago',
    },
    {
        key: 'payments.delete',
        label: 'Eliminar Notas de Pago',
        description: 'Anular o suprimir registros de notas de pago de la base de datos.',
        module: 'payments',
        moduleLabel: 'Módulo de Notas de Pago',
        isCritical: true,
    },
    {
        key: 'payments.send',
        label: 'Compartir y Notificar Pagos',
        description: 'Enviar enlaces públicos de pago por WhatsApp y exportar comprobantes.',
        module: 'payments',
        moduleLabel: 'Módulo de Notas de Pago',
    },
    // WORKSPACE (REDES SOCIALES & TAREAS)
    {
        key: 'workspace.view',
        label: 'Ver Workspace de Agencia',
        description: 'Acceder a la planificación de redes sociales y al tablero de tareas del equipo.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.social.view',
        label: 'Ver Redes Sociales & Calendario',
        description: 'Visualizar proyectos de redes sociales, campañas, meses y publicaciones programadas.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.social.manage',
        label: 'Gestionar Contenidos de Redes Sociales',
        description: 'Crear, programar, editar copies, estados y responsables de publicaciones de redes.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.tasks.view',
        label: 'Ver Tablero de Tareas',
        description: 'Consultar las tareas asignadas y el tablero Kanban operativo del equipo.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.tasks.manage',
        label: 'Gestionar Tareas y Flujo Operativo',
        description: 'Crear tareas operativas, mover estados Kanban, asignar colaboradores y prioridades.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.tools.view',
        label: 'Ver Herramientas Creativas',
        description: 'Visualizar generadores de paletas de color, códigos QR, códigos de barras y Biolinks.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.tools.manage',
        label: 'Gestionar Herramientas Creativas (Paletas, Códigos y Biolinks)',
        description: 'Generar y exportar paletas de color, códigos QR, códigos de barras y administrar perfiles de Biolink.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.forms.view',
        label: 'Ver Formularios Interactivos',
        description: 'Consultar formularios y respuestas recibidas de clientes.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.forms.manage',
        label: 'Gestionar Formularios Interactivos',
        description: 'Crear, editar, publicar y recolectar respuestas de formularios modernos personalizados.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.meetings.view',
        label: 'Ver Salas y Reuniones',
        description: 'Consultar salas virtuales, actas de reuniones y grabaciones del equipo.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.meetings.manage',
        label: 'Gestionar Salas, Actas y Acuerdos',
        description: 'Crear salas de reunión, registrar actas con Google Meet y convertir acuerdos en tareas operativas.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.whiteboards.view',
        label: 'Ver Pizarras Creativas',
        description: 'Consultar lienzos, diagramas y carpetas de pizarras colaborativas.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.whiteboards.manage',
        label: 'Gestionar Pizarras y Lienzos',
        description: 'Crear, editar, diseñar con herramientas visuales, exportar y compartir pizarras.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.brand_guidelines.view',
        label: 'Ver Manuales de Marca',
        description: 'Consultar manuales de identidad visual, logos, tipografías y recursos de marca.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.brand_guidelines.manage',
        label: 'Gestionar Manuales de Marca',
        description: 'Crear, editar y publicar directrices y manuales de marca interactivos.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.romita.view',
        label: 'Ver Romita AI & Historial',
        description: 'Acceder al copilot inteligente de Romita y consultar la bitácora de ejecuciones.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.romita.manage',
        label: 'Gestionar Romita AI & Acciones',
        description: 'Interactuar con el agente Romita, ejecutar acciones operativas automáticas y bitácora.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.emails.view',
        label: 'Ver Bandeja de Correos',
        description: 'Consultar buzón y leer correos corporativos SMTP/IMAP con tu dominio.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    {
        key: 'workspace.emails.manage',
        label: 'Gestionar Correos Corporativos',
        description: 'Redactar, enviar correos, adjuntar archivos y sincronizar cuentas corporativas.',
        module: 'workspace',
        moduleLabel: 'Workspace Operativo',
    },
    // ÓRDENES DE SERVICIO (OS)
    {
        key: 'service_orders.view',
        label: 'Ver Órdenes de Servicio (OS)',
        description: 'Consultar hojas de ruta y especificaciones operativas de los servicios contratados.',
        module: 'service_orders',
        moduleLabel: 'Órdenes de Servicio (OS)',
    },
    {
        key: 'service_orders.create',
        label: 'Crear Órdenes de Servicio',
        description: 'Generar nuevas órdenes con switchers por servicio (redes, branding, audiovisual, web) y entregables.',
        module: 'service_orders',
        moduleLabel: 'Órdenes de Servicio (OS)',
    },
    {
        key: 'service_orders.edit',
        label: 'Editar Órdenes de Servicio',
        description: 'Modificar especificaciones de servicio, asignación de responsables y avance de entregables.',
        module: 'service_orders',
        moduleLabel: 'Órdenes de Servicio (OS)',
    },
    {
        key: 'service_orders.delete',
        label: 'Eliminar Órdenes de Servicio',
        description: 'Suprimir órdenes de servicio canceladas o creadas por error.',
        module: 'service_orders',
        moduleLabel: 'Órdenes de Servicio (OS)',
        isCritical: true,
    },
    {
        key: 'service_orders.send',
        label: 'Compartir Enlace Público de la OS',
        description: 'Generar y enviar enlace público interactivo y adaptable a clientes por WhatsApp o correo.',
        module: 'service_orders',
        moduleLabel: 'Órdenes de Servicio (OS)',
    },
    // GOOGLE DRIVE Y GESTOR DE ARCHIVOS
    {
        key: 'drive.view',
        label: 'Ver Gestor de Archivos y Google Drive',
        description: 'Navegar por las carpetas del Drive central, ver archivos y previsualizar documentos de clientes y proyectos.',
        module: 'drive',
        moduleLabel: 'Archivos & Google Drive',
    },
    {
        key: 'drive.upload',
        label: 'Subir Archivos a Google Drive',
        description: 'Subir archivos de cualquier tamaño en segundo plano con alta velocidad nativa.',
        module: 'drive',
        moduleLabel: 'Archivos & Google Drive',
    },
    {
        key: 'drive.delete',
        label: 'Eliminar Archivos de Google Drive',
        description: 'Borrar archivos y documentos almacenados en las carpetas de Google Drive.',
        module: 'drive',
        moduleLabel: 'Archivos & Google Drive',
        isCritical: true,
    },
    {
        key: 'drive.manage_folders',
        label: 'Crear Carpetas y Aplicar Plantillas',
        description: 'Crear nuevas carpetas y desplegar estructuras de carpetas predefinidas (blueprints) para clientes u órdenes de servicio.',
        module: 'drive',
        moduleLabel: 'Archivos & Google Drive',
    },
    {
        key: 'drive.settings',
        label: 'Configurar Credenciales de Google Drive',
        description: 'Gestionar la conexión con la cuenta central de Google Drive, carpeta raíz y credenciales de servicio.',
        module: 'drive',
        moduleLabel: 'Archivos & Google Drive',
        isCritical: true,
    },
    // CONFIGURACIÓN
    {
        key: 'settings.view',
        label: 'Acceder al Módulo de Configuración',
        description: 'Permite abrir el centro de configuración del tenant.',
        module: 'settings',
        moduleLabel: 'Configuración y Seguridad Multitenant',
    },
    {
        key: 'settings.customization.manage',
        label: 'Gestionar Personalización Visual y Global',
        description: 'Modificar nombre global del cliente, moneda, logos (claro/oscuro/PWA/favicon), colores, tipografía, toasts y modales.',
        module: 'settings',
        moduleLabel: 'Configuración y Seguridad Multitenant',
    },
    {
        key: 'settings.company.manage',
        label: 'Gestionar Datos de la Empresa',
        description: 'Actualizar nombre comercial, razón social, RUC, correo, WhatsApp, dirección y redes sociales.',
        module: 'settings',
        moduleLabel: 'Configuración y Seguridad Multitenant',
    },
    {
        key: 'settings.users.view',
        label: 'Ver Usuarios del Equipo',
        description: 'Consultar la lista de usuarios, cargos y roles dentro del tenant.',
        module: 'settings',
        moduleLabel: 'Configuración y Seguridad Multitenant',
    },
    {
        key: 'settings.users.manage',
        label: 'Crear, Editar y Asignar PIN a Usuarios',
        description: 'Registrar usuarios, asignarles PIN de 8 dígitos, cambiar su rol o estado.',
        module: 'settings',
        moduleLabel: 'Configuración y Seguridad Multitenant',
        isCritical: true,
    },
    {
        key: 'settings.roles.view',
        label: 'Ver Roles y Matriz de Permisos',
        description: 'Inspeccionar los roles configurados y sus permisos granulares activos.',
        module: 'settings',
        moduleLabel: 'Configuración y Seguridad Multitenant',
    },
    {
        key: 'settings.roles.manage',
        label: 'Crear y Configurar Roles y Permisos Granulares',
        description: 'Crear nuevos roles, modificar permisos granulares y eliminar roles personalizados.',
        module: 'settings',
        moduleLabel: 'Configuración y Seguridad Multitenant',
        isCritical: true,
    },
    {
        key: 'settings.tenants.view',
        label: 'Ver y Cambiar de Tenants / Espacios de Trabajo',
        description: 'Ver listado de agencias/tenants creados y cambiar de espacio de trabajo rápidamente.',
        module: 'settings',
        moduleLabel: 'Configuración y Seguridad Multitenant',
    },
    {
        key: 'settings.tenants.manage',
        label: 'Crear, Editar y Eliminar Tenants / Agencias',
        description: 'Control maestro de espacios de trabajo: crear nuevas agencias, editar su configuración o eliminarlas.',
        module: 'settings',
        moduleLabel: 'Configuración y Seguridad Multitenant',
        isCritical: true,
    },
    {
        key: 'settings.system.update',
        label: 'Actualizaciones del Sistema en 1 Clic',
        description: 'Descargar actualizaciones del repositorio Git, ejecutar migraciones de base de datos y recompilar el sistema.',
        module: 'settings',
        moduleLabel: 'Configuración y Seguridad Multitenant',
        isCritical: true,
    },
    // ADMINISTRACIÓN (RRHH, FINANZAS, CONTABILIDAD)
    {
        key: 'administration.view',
        label: 'Acceso a Módulo de Administración',
        description: 'Acceder a la central de administración, RRHH, finanzas y contabilidad.',
        module: 'administration',
        moduleLabel: 'Administración y Gestión Empresarial',
    },
    {
        key: 'administration.hr.view',
        label: 'Ver Personal y Recursos Humanos',
        description: 'Ver lista de personal, salarios, horarios y asistencias.',
        module: 'administration',
        moduleLabel: 'Administración y Gestión Empresarial',
    },
    {
        key: 'administration.hr.manage',
        label: 'Gestionar Personal y Configuración RRHH',
        description: 'Crear o editar perfiles de personal, salarios, horarios y reglas de refrigerio/tardanza.',
        module: 'administration',
        moduleLabel: 'Administración y Gestión Empresarial',
        isCritical: true,
    },
    {
        key: 'administration.attendance.record',
        label: 'Registrar Marcación de Asistencia',
        description: 'Permite al usuario marcar entrada, inicio/fin de refrigerio y salida.',
        module: 'administration',
        moduleLabel: 'Administración y Gestión Empresarial',
    },
    {
        key: 'administration.attendance.manage',
        label: 'Gestionar y Auditar Historial de Asistencias',
        description: 'Editar, justificar o auditar las marcaciones y fotos de asistencia de todo el equipo.',
        module: 'administration',
        moduleLabel: 'Administración y Gestión Empresarial',
    },
    {
        key: 'administration.finances.view',
        label: 'Ver Módulo de Finanzas',
        description: 'Consultar flujo de caja, ingresos, egresos y balances.',
        module: 'administration',
        moduleLabel: 'Administración y Gestión Empresarial',
    },
    {
        key: 'administration.finances.manage',
        label: 'Gestionar Transacciones Financieras',
        description: 'Registrar, categorizar y modificar ingresos y gastos.',
        module: 'administration',
        moduleLabel: 'Administración y Gestión Empresarial',
    },
    {
        key: 'administration.accounting.view',
        label: 'Ver Contabilidad y Libros',
        description: 'Visualizar asientos contables y estados financieros.',
        module: 'administration',
        moduleLabel: 'Administración y Gestión Empresarial',
    },
    {
        key: 'administration.accounting.manage',
        label: 'Gestionar Asientos Contables',
        description: 'Crear y modificar asientos del libro diario.',
        module: 'administration',
        moduleLabel: 'Administración y Gestión Empresarial',
    },
];
exports.ALL_PERMISSION_KEYS = exports.PERMISSIONS_CATALOG.map((p) => p.key);
/**
 * Evalúa si una lista de permisos otorgados incluye el permiso granular requerido.
 */
function hasPermission(grantedPermissions, requiredPermission) {
    if (!grantedPermissions || !Array.isArray(grantedPermissions))
        return false;
    if (grantedPermissions.includes('*'))
        return true;
    if (grantedPermissions.includes(requiredPermission))
        return true;
    // Si tiene cualquier permiso de workspace, se le permite acceso a la navegación general de workspace
    if (requiredPermission === 'workspace.view' &&
        grantedPermissions.some((p) => p.startsWith('workspace.'))) {
        return true;
    }
    // Si tiene cualquier permiso de administración, se le permite acceso a la navegación general de administración
    if (requiredPermission === 'administration.view' &&
        grantedPermissions.some((p) => p.startsWith('administration.'))) {
        return true;
    }
    // Herencia y coherencia entre gestión (manage) y visualización (view) de submódulos
    if (requiredPermission === 'workspace.social.view' &&
        grantedPermissions.includes('workspace.social.manage'))
        return true;
    if (requiredPermission === 'workspace.tasks.view' &&
        grantedPermissions.includes('workspace.tasks.manage'))
        return true;
    if (requiredPermission === 'workspace.tools.view' &&
        grantedPermissions.includes('workspace.tools.manage'))
        return true;
    if (requiredPermission === 'workspace.forms.view' &&
        grantedPermissions.includes('workspace.forms.manage'))
        return true;
    if (requiredPermission === 'workspace.meetings.view' &&
        grantedPermissions.includes('workspace.meetings.manage'))
        return true;
    if (requiredPermission === 'workspace.whiteboards.view' &&
        grantedPermissions.includes('workspace.whiteboards.manage'))
        return true;
    if (requiredPermission === 'workspace.brand_guidelines.view' &&
        grantedPermissions.includes('workspace.brand_guidelines.manage'))
        return true;
    if (requiredPermission === 'workspace.romita.view' &&
        grantedPermissions.includes('workspace.romita.manage'))
        return true;
    if (requiredPermission === 'workspace.emails.view' &&
        grantedPermissions.includes('workspace.emails.manage'))
        return true;
    if (requiredPermission === 'administration.hr.view' &&
        (grantedPermissions.includes('administration.hr.manage') ||
            grantedPermissions.includes('administration.attendance.record') ||
            grantedPermissions.includes('administration.attendance.manage')))
        return true;
    if (requiredPermission === 'administration.finances.view' &&
        grantedPermissions.includes('administration.finances.manage'))
        return true;
    if (requiredPermission === 'administration.accounting.view' &&
        grantedPermissions.includes('administration.accounting.manage'))
        return true;
    return false;
}
/**
 * Evalúa si el usuario posee al menos uno de los permisos indicados.
 */
function hasAnyPermission(grantedPermissions, requiredPermissions) {
    return requiredPermissions.some((perm) => hasPermission(grantedPermissions, perm));
}
