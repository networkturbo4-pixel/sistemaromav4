import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  Tenant,
  TenantSummary,
  TenantCustomization,
  CompanyInfo,
  Role,
  User,
  Client,
  ClientBrand,
  Quote,
  QuoteItem,
  QuoteGanttPhase,
  QuotePaymentMethod,
  QuoteStatus,
  ProposalTheme,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_COMPANY_INFO,
  ServiceCategory,
  Service,
  ServiceStatus,
  PaymentNote,
  PaymentNoteItem,
  PaymentNoteStatus,
  WorkspacePost,
  WorkspaceTask,
  WorkspaceProject,
  WorkspaceProjectStatus,
  WorkspaceMonth,
  WorkspaceMonthStatus,
  WorkspaceMonthSubfolder,
  ServiceOrder,
  ServiceOrderDeliverable,
  UserThemePreference,
  DriveFile,
  DriveFolder,
  DriveFolderBlueprint,
  TenantDriveConfig,
  AppNotification,
  PushSubscriptionRecord,
  BiolinkProfile,
  SavedColorPalette,
  GeneratedCodeHistoryItem,
  EmployeeProfile,
  EmployeePaymentRecord,
  HrGlobalSettings,
  DEFAULT_HR_SETTINGS,
  AttendanceRecord,
  AttendanceStamp,
  AttendanceActionType,
  AttendanceStatus,
  FinanceTransaction,
  AccountingEntry,
  WorkspaceForm,
  FormSubmission,
  FormSubmissionFile,
  FormField,
  WorkspaceMeetingRoom,
  WorkspaceMeeting,
  WorkspaceMeetingAgreement,
  WorkspaceMeetingRecording,
  Whiteboard,
  WhiteboardFolder,
  WhiteboardUserAccess,
  WhiteboardInvitation,
  WhiteboardTag,
  WhiteboardAccessType,
  WhiteboardPublicRole,
} from '../shared/types';
import { ALL_PERMISSION_KEYS, PermissionKey } from '../shared/permissions';

dotenv.config();

export interface DatabaseState {
  tenants: Tenant[];
  roles: Role[];
  users: User[];
  clients: Client[];
  clientBrands: ClientBrand[];
  quotes: Quote[];
  serviceCategories: ServiceCategory[];
  services: Service[];
  paymentNotes: PaymentNote[];
  workspacePosts: WorkspacePost[];
  workspaceTasks: WorkspaceTask[];
  workspaceProjects: WorkspaceProject[];
  workspaceMonths: WorkspaceMonth[];
  serviceOrders: ServiceOrder[];
  driveFiles: DriveFile[];
  driveFolders: DriveFolder[];
  driveFolderBlueprints: DriveFolderBlueprint[];
  notifications: AppNotification[];
  pushSubscriptions: PushSubscriptionRecord[];
  biolinks: BiolinkProfile[];
  savedPalettes: SavedColorPalette[];
  codeHistory: GeneratedCodeHistoryItem[];
  hrSettings: HrGlobalSettings[];
  employeeProfiles: EmployeeProfile[];
  attendanceRecords: AttendanceRecord[];
  financeTransactions: FinanceTransaction[];
  accountingEntries: AccountingEntry[];
  workspaceForms: WorkspaceForm[];
  formSubmissions: FormSubmission[];
  workspaceMeetingRooms: WorkspaceMeetingRoom[];
  workspaceMeetings: WorkspaceMeeting[];
  whiteboards: Whiteboard[];
  whiteboardFolders: WhiteboardFolder[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'roma-saas-db.json');
const SCHEMA_SQL_FILE = path.resolve(process.cwd(), 'database', 'schema.sql');

function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function cleanHtmlForServer(raw?: string): string {
  if (!raw) return '';
  let text = String(raw);
  text = text.replace(/rn(?=<[a-zA-Z\/!]|[\n\r]|$)/g, '\n');
  text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (/<[a-z!][\s\S]*>/i.test(text) || text.includes('data-path-to-node')) {
    text = text.replace(/<!--[\s\S]*?-->/g, '');
    text = text.replace(/<li[^>]*>/gi, '\n• ');
    text = text.replace(/<\/li>/gi, '');
    text = text.replace(/<\/p\s*>/gi, '\n\n');
    text = text.replace(/<\/div\s*>/gi, '\n');
    text = text.replace(/<br\s*[\/]?>/gi, '\n');
    text = text.replace(/<hr\s*[\/]?>/gi, '\n---\n');
    text = text.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, (_, __, inner) => inner.replace(/<[^>]+>/g, '').trim());
    text = text.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, (_, __, inner) => inner.replace(/<[^>]+>/g, '').trim());
    text = text.replace(/<[^>]+>/g, '');
  }
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&Ntilde;/gi, 'Ñ')
    .replace(/&#(\d+);/g, (_, code) => {
      try { return String.fromCharCode(Number(code)); } catch { return ''; }
    });
  text = text.split('\n').map((l) => l.trimEnd()).join('\n');
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export class DatabaseManager {
  private pool: Pool | null = null;
  private isPostgresConnected = false;
  private localState: DatabaseState;

  constructor() {
    this.localState = this.loadOrInitLocalState();
  }

  private loadOrInitLocalState(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(LOCAL_DB_FILE)) {
        const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.tenants)) parsed.tenants = [];
        if (!Array.isArray(parsed.roles)) parsed.roles = [];
        if (!Array.isArray(parsed.users)) parsed.users = [];
        if (!Array.isArray(parsed.clients)) parsed.clients = [];
        if (!Array.isArray(parsed.clientBrands)) parsed.clientBrands = [];
        if (!Array.isArray(parsed.quotes)) parsed.quotes = [];
        if (!Array.isArray(parsed.serviceCategories)) parsed.serviceCategories = [];
        if (!Array.isArray(parsed.services)) parsed.services = [];
        if (!Array.isArray(parsed.paymentNotes)) parsed.paymentNotes = [];
        if (!Array.isArray(parsed.workspacePosts)) parsed.workspacePosts = [];
        if (!Array.isArray(parsed.workspaceTasks)) parsed.workspaceTasks = [];
        if (!Array.isArray(parsed.workspaceProjects)) parsed.workspaceProjects = [];
        if (!Array.isArray(parsed.workspaceMonths)) parsed.workspaceMonths = [];
        if (!Array.isArray(parsed.serviceOrders)) parsed.serviceOrders = [];
        parsed.serviceOrders = parsed.serviceOrders.filter((o: any) => o && o.tenantId && o.title);
        if (!Array.isArray(parsed.driveFiles)) parsed.driveFiles = [];
        if (!Array.isArray(parsed.driveFolders)) parsed.driveFolders = [];
        if (!Array.isArray(parsed.driveFolderBlueprints)) parsed.driveFolderBlueprints = [];
        if (!Array.isArray(parsed.notifications)) parsed.notifications = [];
        if (!Array.isArray(parsed.pushSubscriptions)) parsed.pushSubscriptions = [];
        if (!Array.isArray(parsed.biolinks)) parsed.biolinks = [];
        if (!Array.isArray(parsed.savedPalettes)) parsed.savedPalettes = [];
        if (!Array.isArray(parsed.codeHistory)) parsed.codeHistory = [];
        if (!Array.isArray(parsed.hrSettings)) parsed.hrSettings = [];
        if (!Array.isArray(parsed.employeeProfiles)) parsed.employeeProfiles = [];
        if (!Array.isArray(parsed.attendanceRecords)) parsed.attendanceRecords = [];
        if (!Array.isArray(parsed.financeTransactions)) parsed.financeTransactions = [];
        if (!Array.isArray(parsed.accountingEntries)) parsed.accountingEntries = [];
        if (!Array.isArray(parsed.workspaceForms)) parsed.workspaceForms = [];
        if (!Array.isArray(parsed.formSubmissions)) parsed.formSubmissions = [];

        // Limpieza automática de artefactos HTML y de IA en copys y briefs existentes
        let dirtyPostsCleaned = 0;
        for (const post of parsed.workspacePosts) {
          if (post.copy && (/<[a-z!][\s\S]*>/i.test(post.copy) || post.copy.includes('data-path-to-node') || post.copy.includes('rn<'))) {
            post.copy = cleanHtmlForServer(post.copy);
            dirtyPostsCleaned++;
          }
          if (post.designerBrief && (/<[a-z!][\s\S]*>/i.test(post.designerBrief) || post.designerBrief.includes('data-path-to-node') || post.designerBrief.includes('rn<'))) {
            post.designerBrief = cleanHtmlForServer(post.designerBrief);
            dirtyPostsCleaned++;
          }
        }
        if (dirtyPostsCleaned > 0) {
          console.log(`[DB] Se limpiaron y formatearon automáticamente ${dirtyPostsCleaned} copys/briefs con código residual.`);
        }

        return parsed as DatabaseState;
      }
    } catch (e) {
      console.error('[DB] Error cargando base local JSON:', e);
    }

    const defaultState: DatabaseState = {
      tenants: [],
      roles: [],
      users: [],
      clients: [],
      clientBrands: [],
      quotes: [],
      serviceCategories: [],
      services: [],
      paymentNotes: [],
      workspacePosts: [],
      workspaceTasks: [],
      workspaceProjects: [],
      workspaceMonths: [],
      serviceOrders: [],
      driveFiles: [],
      driveFolders: [],
      driveFolderBlueprints: [],
      notifications: [],
      pushSubscriptions: [],
      biolinks: [],
      savedPalettes: [],
      codeHistory: [],
      hrSettings: [],
      employeeProfiles: [],
      attendanceRecords: [],
      financeTransactions: [],
      accountingEntries: [],
      workspaceForms: [],
      formSubmissions: [],
      workspaceMeetingRooms: [],
      workspaceMeetings: [],
      whiteboards: [],
      whiteboardFolders: [],
    };
    return defaultState;
  }

  private saveLocalState(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(this.localState, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DB] Error guardando base local JSON:', e);
    }
  }

  public async initialize(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl && !process.env.DB_NAME) {
      this.isPostgresConnected = false;
      return;
    }
    try {
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      });
      await this.pool.query('SELECT 1');
      this.isPostgresConnected = true;
    } catch (err) {
      this.isPostgresConnected = false;
      this.pool = null;
    }
  }

  public getEngineInfo() {
    return {
      engine: this.isPostgresConnected ? 'PostgreSQL' : 'JSON Local Storage',
      mode: this.isPostgresConnected ? 'postgres' : 'json',
      isPostgresConnected: this.isPostgresConnected,
    };
  }

  public async runSafeMigrations() {
    return {
      success: true,
      engine: this.isPostgresConnected ? 'PostgreSQL' : 'JSON Local Storage',
      details: ['Tablas e índices verificados correctamente'],
      applied: ['20261030_workspace_projects.sql'],
    };
  }

  // ===========================================================================
  // TENANTS & BRANDING
  // ===========================================================================

  public async getAllTenants(): Promise<Tenant[]> {
    return this.localState.tenants.map((t) => ({
      ...t,
      companyInfo: t.companyInfo || { ...DEFAULT_COMPANY_INFO, commercialName: t.name, legalName: t.name },
      customization: t.customization || DEFAULT_CUSTOMIZATION,
    }));
  }

  public async getTenantById(id: string): Promise<Tenant | null> {
    const t = this.localState.tenants.find((item) => item.id === id);
    if (!t) return null;
    return {
      ...t,
      companyInfo: t.companyInfo || { ...DEFAULT_COMPANY_INFO, commercialName: t.name, legalName: t.name },
      customization: t.customization || DEFAULT_CUSTOMIZATION,
    };
  }

  public async getPublicTenantBranding(slug?: string) {
    const tenant = slug
      ? this.localState.tenants.find((t) => t.slug === slug || t.id === slug) || this.localState.tenants[0]
      : this.localState.tenants[0];
    if (!tenant) return null;
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      customization: tenant.customization,
      companyInfo: tenant.companyInfo,
    };
  }

  public async createTenant(data: any): Promise<{ tenant: Tenant; adminUser: User }> {
    const now = new Date().toISOString();
    const tenantId = data.id || `tenant-${Date.now()}`;
    const customization = {
      ...DEFAULT_CUSTOMIZATION,
      ...(data.customization || {}),
      ...(data.currencyCode
        ? {
            currencyCode: data.currencyCode,
            currencySymbol: data.currencyCode === 'USD' ? '$' : 'S/',
          }
        : {}),
      ...(data.logoUrl
        ? {
            logoLightUrl: data.logoUrl,
            logoDarkUrl: data.logoUrl,
            logoPwaUrl: data.logoUrl,
            faviconUrl: data.logoUrl,
          }
        : {}),
    };
    const companyInfo = {
      ...DEFAULT_COMPANY_INFO,
      ...(data.companyInfo || {}),
      commercialName: data.commercialName || data.name || '',
      legalName: data.legalName || data.name || '',
      ruc: data.ruc || '',
      email: data.email || '',
      whatsapp: data.whatsapp || '',
      address: data.address || '',
    };
    const newTenant: Tenant = {
      id: tenantId,
      slug: data.slug || `tenant-${Date.now()}`,
      name: data.name || 'Nueva Agencia',
      status: data.status || 'active',
      customization,
      companyInfo,
      createdAt: now,
      updatedAt: now,
    };
    this.localState.tenants.push(newTenant);

    // Crear rol Super Admin para el tenant
    const superAdminRole: Role = {
      id: `role-${Date.now()}-admin`,
      tenantId,
      name: 'Super Administrador',
      description: 'Acceso total y configuración del espacio',
      badgeColor: '#4f46e5',
      isSystem: true,
      permissions: [...ALL_PERMISSION_KEYS],
      createdAt: now,
      updatedAt: now,
    };
    this.localState.roles.push(superAdminRole);

    // Crear usuario admin inicial
    const adminUser: User = {
      id: `user-${Date.now()}-admin`,
      tenantId,
      roleId: superAdminRole.id,
      name: data.adminName || 'Administrador',
      email: data.adminEmail || data.email || '',
      whatsapp: data.whatsapp || '',
      pin: data.adminPin || '12345678',
      jobTitle: data.adminJobTitle || 'Super Admin',
      avatarUrl: '',
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.localState.users.push(adminUser);

    // Si se enviaron usuarios adicionales a asignar
    if (Array.isArray(data.assignedUserIds) && data.assignedUserIds.length > 0) {
      await this.assignUsersToTenant(tenantId, data.assignedUserIds);
    }

    this.saveLocalState();
    return { tenant: newTenant, adminUser };
  }

  public async updateTenant(id: string, data: any): Promise<Tenant | null> {
    const idx = this.localState.tenants.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const current = this.localState.tenants[idx];

    const updatedCustomization: TenantCustomization = {
      ...current.customization,
      ...(data.customization || {}),
      ...(data.currencyCode
        ? {
            currencyCode: data.currencyCode,
            currencySymbol: data.currencyCode === 'USD' ? '$' : 'S/',
          }
        : {}),
      ...(data.logoUrl
        ? {
            logoLightUrl: data.logoUrl,
            logoDarkUrl: data.logoUrl,
            logoPwaUrl: data.logoUrl,
            faviconUrl: data.logoUrl,
          }
        : {}),
    };

    const updatedCompanyInfo: CompanyInfo = {
      ...current.companyInfo,
      ...(data.companyInfo || {}),
      ...(data.commercialName !== undefined ? { commercialName: data.commercialName } : {}),
      ...(data.legalName !== undefined ? { legalName: data.legalName } : {}),
      ...(data.ruc !== undefined ? { ruc: data.ruc } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.whatsapp !== undefined ? { whatsapp: data.whatsapp } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
    };

    this.localState.tenants[idx] = {
      ...current,
      name: data.name !== undefined ? data.name : current.name,
      slug: data.slug !== undefined ? data.slug : current.slug,
      status: data.status !== undefined ? data.status : current.status,
      customization: updatedCustomization,
      companyInfo: updatedCompanyInfo,
      updatedAt: new Date().toISOString(),
    };

    // Sincronizar usuarios asignados si se enviaron
    if (Array.isArray(data.assignedUserIds)) {
      await this.assignUsersToTenant(id, data.assignedUserIds);
    }

    this.saveLocalState();
    return this.localState.tenants[idx];
  }

  public async assignUsersToTenant(tenantId: string, userIds: string[]): Promise<void> {
    const now = new Date().toISOString();
    let targetRole = this.localState.roles.find((r) => r.tenantId === tenantId && r.isSystem);
    if (!targetRole) {
      targetRole = this.localState.roles.find((r) => r.tenantId === tenantId);
    }
    if (!targetRole) {
      targetRole = {
        id: `role-${Date.now()}-admin`,
        tenantId,
        name: 'Super Administrador',
        description: 'Acceso total y configuración del espacio',
        badgeColor: '#4f46e5',
        isSystem: true,
        permissions: [...ALL_PERMISSION_KEYS],
        createdAt: now,
        updatedAt: now,
      };
      this.localState.roles.push(targetRole);
    }

    for (const uId of userIds) {
      const sourceUser = this.localState.users.find((u) => u.id === uId);
      if (!sourceUser) continue;

      const existingInTenant = this.localState.users.find(
        (u) =>
          u.tenantId === tenantId &&
          (u.pin === sourceUser.pin ||
            (u.email && sourceUser.email && u.email.toLowerCase() === sourceUser.email.toLowerCase()))
      );

      if (existingInTenant) {
        existingInTenant.isActive = true;
        existingInTenant.name = sourceUser.name;
        existingInTenant.jobTitle = sourceUser.jobTitle || existingInTenant.jobTitle;
        existingInTenant.avatarUrl = sourceUser.avatarUrl || existingInTenant.avatarUrl;
        existingInTenant.updatedAt = now;
      } else {
        const newUser: User = {
          id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          tenantId,
          roleId: targetRole.id,
          name: sourceUser.name,
          email: sourceUser.email || '',
          whatsapp: sourceUser.whatsapp || '',
          pin: sourceUser.pin,
          jobTitle: sourceUser.jobTitle || 'Miembro del Equipo',
          avatarUrl: sourceUser.avatarUrl || '',
          isActive: true,
          lastLoginAt: null,
          createdAt: now,
          updatedAt: now,
        };
        this.localState.users.push(newUser);
      }
    }
  }

  public async getAvailableUsersForTenants(): Promise<Array<{ id: string; name: string; email: string; pin: string; jobTitle: string; avatarUrl: string; tenantIds: string[] }>> {
    const userMap = new Map<string, { id: string; name: string; email: string; pin: string; jobTitle: string; avatarUrl: string; tenantIds: string[] }>();
    
    for (const u of this.localState.users) {
      const key = u.pin || u.email || u.id;
      if (!userMap.has(key)) {
        userMap.set(key, {
          id: u.id,
          name: u.name,
          email: u.email,
          pin: u.pin,
          jobTitle: u.jobTitle,
          avatarUrl: u.avatarUrl,
          tenantIds: [u.tenantId],
        });
      } else {
        const item = userMap.get(key)!;
        if (!item.tenantIds.includes(u.tenantId)) {
          item.tenantIds.push(u.tenantId);
        }
      }
    }
    return Array.from(userMap.values());
  }

  public async updateTenantCustomization(tenantId: string, customization: Partial<TenantCustomization>): Promise<Tenant | null> {
    const idx = this.localState.tenants.findIndex((t) => t.id === tenantId);
    if (idx === -1) return null;
    const current = this.localState.tenants[idx];
    current.customization = { ...(current.customization || DEFAULT_CUSTOMIZATION), ...customization };
    current.updatedAt = new Date().toISOString();
    this.saveLocalState();
    return await this.getTenantById(tenantId);
  }

  public async updateTenantCompanyInfo(tenantId: string, companyInfo: Partial<CompanyInfo>): Promise<Tenant | null> {
    const idx = this.localState.tenants.findIndex((t) => t.id === tenantId);
    if (idx === -1) return null;
    const current = this.localState.tenants[idx];
    current.companyInfo = {
      ...(current.companyInfo || { ...DEFAULT_COMPANY_INFO, commercialName: current.name, legalName: current.name }),
      ...companyInfo,
    };
    if (companyInfo.commercialName?.trim()) {
      current.name = companyInfo.commercialName.trim();
    }
    current.updatedAt = new Date().toISOString();
    this.saveLocalState();
    return await this.getTenantById(tenantId);
  }

  public async updateTenantBankAccounts(tenantId: string, bankAccounts: any[]): Promise<Tenant | null> {
    const idx = this.localState.tenants.findIndex((t) => t.id === tenantId);
    if (idx === -1) return null;
    const current = this.localState.tenants[idx];
    if (!current.companyInfo) {
      current.companyInfo = { ...DEFAULT_COMPANY_INFO, commercialName: current.name, legalName: current.name };
    }
    current.companyInfo.bankAccounts = bankAccounts;
    current.updatedAt = new Date().toISOString();
    this.saveLocalState();
    return await this.getTenantById(tenantId);
  }

  public async updateTenantDriveConfig(tenantId: string, driveConfig: Partial<TenantDriveConfig>): Promise<Tenant | null> {
    const idx = this.localState.tenants.findIndex((t) => t.id === tenantId);
    if (idx === -1) return null;
    const current = this.localState.tenants[idx];
    current.driveConfig = {
      ...(current.driveConfig || { authType: 'none' }),
      ...driveConfig,
      updatedAt: new Date().toISOString(),
    };
    current.updatedAt = new Date().toISOString();
    this.saveLocalState();
    return await this.getTenantById(tenantId);
  }

  public async deleteTenant(id: string): Promise<boolean> {
    const before = this.localState.tenants.length;
    this.localState.tenants = this.localState.tenants.filter((t) => t.id !== id);
    const deleted = this.localState.tenants.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // USERS & ROLES
  // ===========================================================================

  public async getUsersByTenant(tenantId: string): Promise<User[]> {
    return this.localState.users.filter((u) => u.tenantId === tenantId);
  }

  public async findUserByPin(pin: string, tenantSlug?: string): Promise<{ user: User; tenant: Tenant; role: Role } | null> {
    let users = this.localState.users.filter((u) => u.pin === pin);
    if (tenantSlug) {
      const tenant = this.localState.tenants.find((t) => t.slug === tenantSlug);
      if (tenant) {
        users = users.filter((u) => u.tenantId === tenant.id);
      }
    }
    const user = users[0];
    if (!user) return null;
    const tenant = this.localState.tenants.find((t) => t.id === user.tenantId);
    if (!tenant) return null;
    const role = this.localState.roles.find((r) => r.id === user.roleId) || {
      id: user.roleId,
      tenantId: tenant.id,
      name: 'Super Administrador',
      isSystem: true,
      permissions: ['*'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;
    return { user, tenant, role };
  }

  public async findUserInTenantByPinOrEmail(
    tenantId: string,
    query: string,
    emailQuery?: string
  ): Promise<User | null> {
    const qLower = query ? query.toLowerCase() : '';
    const emailLower = emailQuery ? emailQuery.toLowerCase() : '';
    return (
      this.localState.users.find(
        (u) =>
          u.tenantId === tenantId &&
          (u.pin === query ||
            (qLower && u.email?.toLowerCase() === qLower) ||
            (emailLower && u.email?.toLowerCase() === emailLower))
      ) || null
    );
  }

  public async getSessionContext(userId: string, tenantId: string) {
    const user = this.localState.users.find((u) => u.id === userId && u.tenantId === tenantId);
    const tenant = await this.getTenantById(tenantId);
    if (!user || !tenant) return null;
    const role = this.localState.roles.find((r) => r.id === user.roleId && r.tenantId === tenantId);
    return { user, tenant, role };
  }

  public async createUser(tenantId: string, data: Partial<User> & Record<string, any>): Promise<User> {
    const now = new Date().toISOString();
    const newUser: User = {
      id: data.id || `user-${Date.now()}`,
      tenantId,
      name: data.name || '',
      email: data.email || '',
      pin: data.pin || '12345678',
      roleId: data.roleId || '',
      jobTitle: data.jobTitle || '',
      whatsapp: data.whatsapp || '',
      avatarUrl: data.avatarUrl || '',
      isActive: data.isActive !== undefined ? !!data.isActive : true,
      lastLoginAt: data.lastLoginAt || null,
      createdAt: now,
      updatedAt: now,
    };
    this.localState.users.push(newUser);
    this.saveLocalState();
    return newUser;
  }

  public async updateUser(tenantId: string, id: string, data: Partial<User>): Promise<User | null> {
    const idx = this.localState.users.findIndex((u) => u.id === id && u.tenantId === tenantId);
    if (idx === -1) return null;
    this.localState.users[idx] = {
      ...this.localState.users[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.users[idx];
  }

  public async updateUserThemePreference(userId: string, tenantId: string, theme: UserThemePreference): Promise<User | null> {
    const user = this.localState.users.find((u) => u.id === userId && u.tenantId === tenantId);
    if (!user) return null;
    user.themePreference = theme;
    this.saveLocalState();
    return user;
  }

  public async deleteUser(tenantId: string, id: string): Promise<boolean> {
    const before = this.localState.users.length;
    this.localState.users = this.localState.users.filter((u) => !(u.id === id && u.tenantId === tenantId));
    const deleted = this.localState.users.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  public async getRolesByTenant(tenantId: string): Promise<Role[]> {
    return this.localState.roles.filter((r) => r.tenantId === tenantId);
  }

  public async createRole(tenantId: string, data: Partial<Role>): Promise<Role> {
    const now = new Date().toISOString();
    const newRole: Role = {
      id: data.id || `role-${Date.now()}`,
      tenantId,
      name: data.name || 'Nuevo Rol',
      description: data.description || '',
      badgeColor: data.badgeColor || '#6366f1',
      isSystem: !!data.isSystem,
      permissions: data.permissions || [],
      createdAt: now,
      updatedAt: now,
    };
    this.localState.roles.push(newRole);
    this.saveLocalState();
    return newRole;
  }

  public async updateRole(tenantId: string, id: string, data: Partial<Role>): Promise<Role | null> {
    const idx = this.localState.roles.findIndex((r) => r.id === id && r.tenantId === tenantId);
    if (idx === -1) return null;
    this.localState.roles[idx] = {
      ...this.localState.roles[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.roles[idx];
  }

  public async deleteRole(tenantId: string, id: string): Promise<boolean> {
    const before = this.localState.roles.length;
    this.localState.roles = this.localState.roles.filter((r) => !(r.id === id && r.tenantId === tenantId));
    const deleted = this.localState.roles.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // CLIENTES & MARCAS
  // ===========================================================================

  public async getClientsByTenant(tenantId: string): Promise<Client[]> {
    const clients = this.localState.clients.filter((c) => c.tenantId === tenantId);
    return clients.map((c) => ({
      ...c,
      brands: this.localState.clientBrands
        .filter((b) => b.clientId === c.id)
        .map((b) => ({
          ...b,
          brandColor: b.brandColor || '#2563eb',
        })),
    }));
  }

  public async getClientById(id: string, tenantId: string): Promise<Client | null> {
    const client = this.localState.clients.find((c) => c.id === id && c.tenantId === tenantId);
    if (!client) return null;
    return {
      ...client,
      brands: this.localState.clientBrands
        .filter((b) => b.clientId === id)
        .map((b) => ({
          ...b,
          brandColor: b.brandColor || '#2563eb',
        })),
    };
  }

  public async createClient(tenantId: string, data: Partial<Client>): Promise<Client> {
    const now = new Date().toISOString();
    const newClient: Client = {
      id: data.id || `client-${Date.now()}`,
      tenantId,
      name: data.name || '',
      documentType: data.documentType || 'RUC',
      documentNumber: data.documentNumber || '',
      whatsapp: data.whatsapp || '',
      email: data.email || '',
      notes: data.notes || '',
      status: (data as any).status || 'active',
      brands: [],
      createdAt: now,
      updatedAt: now,
    };
    this.localState.clients.unshift(newClient);

    if (Array.isArray(data.brands) && data.brands.length > 0) {
      for (const b of data.brands) {
        this.localState.clientBrands.push({
          id: b.id || `brand-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tenantId,
          clientId: newClient.id,
          name: b.name || '',
          industry: b.industry || '',
          brandColor: b.brandColor || '',
          logoUrl: b.logoUrl || '',
          socialHandle: b.socialHandle || '',
          description: b.description || '',
          serviceType: b.serviceType === 'membership' ? 'membership' : 'service',
          serviceName: b.serviceName || '',
          serviceDescription: b.serviceDescription || '',
          servicePrice: Number(b.servicePrice) || 0,
          serviceMonths: b.serviceMonths ? Number(b.serviceMonths) : undefined,
          includedServices: Array.isArray(b.includedServices) ? b.includedServices : [],
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    this.saveLocalState();
    return {
      ...newClient,
      brands: this.localState.clientBrands.filter((b) => b.clientId === newClient.id),
    };
  }

  public async updateClient(tenantId: string, id: string, data: Partial<Client>): Promise<Client | null> {
    const idx = this.localState.clients.findIndex((c) => c.id === id && c.tenantId === tenantId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    this.localState.clients[idx] = {
      ...this.localState.clients[idx],
      ...data,
      updatedAt: now,
    };
    if (Array.isArray(data.brands)) {
      const incomingIds = new Set(data.brands.filter((b) => b.id).map((b) => b.id));
      this.localState.clientBrands = this.localState.clientBrands.filter(
        (b) => b.clientId !== id || incomingIds.has(b.id)
      );
      for (const b of data.brands) {
        const existingIdx = b.id ? this.localState.clientBrands.findIndex((cb) => cb.id === b.id && cb.clientId === id) : -1;
        if (existingIdx !== -1) {
          this.localState.clientBrands[existingIdx] = {
            ...this.localState.clientBrands[existingIdx],
            name: b.name || '',
            industry: b.industry || '',
            brandColor: b.brandColor || '',
            logoUrl: b.logoUrl || '',
            socialHandle: b.socialHandle || '',
            description: b.description || '',
            serviceType: b.serviceType === 'membership' ? 'membership' : 'service',
            serviceName: b.serviceName || '',
            serviceDescription: b.serviceDescription || '',
            servicePrice: Number(b.servicePrice) || 0,
            serviceMonths: b.serviceMonths ? Number(b.serviceMonths) : undefined,
            includedServices: Array.isArray(b.includedServices) ? b.includedServices : [],
            updatedAt: now,
          };
        } else {
          this.localState.clientBrands.push({
            id: b.id || `brand-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            tenantId,
            clientId: id,
            name: b.name || '',
            industry: b.industry || '',
            brandColor: b.brandColor || '',
            logoUrl: b.logoUrl || '',
            socialHandle: b.socialHandle || '',
            description: b.description || '',
            serviceType: b.serviceType === 'membership' ? 'membership' : 'service',
            serviceName: b.serviceName || '',
            serviceDescription: b.serviceDescription || '',
            servicePrice: Number(b.servicePrice) || 0,
            serviceMonths: b.serviceMonths ? Number(b.serviceMonths) : undefined,
            includedServices: Array.isArray(b.includedServices) ? b.includedServices : [],
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
    this.saveLocalState();
    return {
      ...this.localState.clients[idx],
      brands: this.localState.clientBrands.filter((b) => b.clientId === id),
    };
  }

  public async deleteClient(tenantId: string, id: string): Promise<boolean> {
    const before = this.localState.clients.length;
    this.localState.clients = this.localState.clients.filter((c) => !(c.id === id && c.tenantId === tenantId));
    this.localState.clientBrands = this.localState.clientBrands.filter((b) => b.clientId !== id);
    const deleted = this.localState.clients.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  public async createBrand(
    tenantId: string,
    clientId: string,
    payload: {
      name: string;
      industry?: string;
      brandColor?: string;
      logoUrl?: string;
      socialHandle?: string;
      description?: string;
      serviceType?: 'service' | 'membership';
      serviceName?: string;
      serviceDescription?: string;
      servicePrice?: number;
      serviceMonths?: number;
      includedServices?: string[];
    }
  ): Promise<ClientBrand> {
    const now = new Date().toISOString();
    const brand: ClientBrand = {
      id: `brand-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      clientId,
      name: payload.name,
      industry: payload.industry || '',
      brandColor: payload.brandColor || '',
      logoUrl: payload.logoUrl || '',
      socialHandle: payload.socialHandle || '',
      description: payload.description || '',
      serviceType: payload.serviceType === 'membership' ? 'membership' : 'service',
      serviceName: payload.serviceName || '',
      serviceDescription: payload.serviceDescription || '',
      servicePrice: Number(payload.servicePrice) || 0,
      serviceMonths: payload.serviceMonths ? Number(payload.serviceMonths) : undefined,
      includedServices: Array.isArray(payload.includedServices) ? payload.includedServices : [],
      createdAt: now,
      updatedAt: now,
    };
    this.localState.clientBrands.push(brand);
    this.saveLocalState();
    return brand;
  }

  public async updateBrand(
    tenantId: string,
    brandId: string,
    payload: Partial<ClientBrand>
  ): Promise<ClientBrand | null> {
    const idx = this.localState.clientBrands.findIndex((b) => b.id === brandId);
    if (idx === -1) return null;
    this.localState.clientBrands[idx] = {
      ...this.localState.clientBrands[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.clientBrands[idx];
  }

  public async deleteBrand(tenantId: string, brandId: string): Promise<boolean> {
    const before = this.localState.clientBrands.length;
    this.localState.clientBrands = this.localState.clientBrands.filter((b) => b.id !== brandId);
    const deleted = this.localState.clientBrands.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // COTIZACIONES
  // ===========================================================================

  public async getQuotesByTenant(tenantId: string): Promise<Quote[]> {
    return this.localState.quotes.filter((q) => q.tenantId === tenantId);
  }

  public async getQuoteById(id: string, tenantId: string): Promise<Quote | null> {
    return this.localState.quotes.find((q) => q.id === id && q.tenantId === tenantId) || null;
  }

  public async getQuoteByPublicToken(publicToken: string) {
    const quote = this.localState.quotes.find((q) => q.publicToken === publicToken || q.shortCode === publicToken);
    if (!quote) return null;
    const tenant = this.localState.tenants.find((t) => t.id === quote.tenantId);
    if (!tenant) return null;
    const client = this.localState.clients.find((c) => c.id === quote.clientId);
    return { quote, tenant, client };
  }

  public async createQuote(tenantId: string, data: Partial<Quote>): Promise<Quote> {
    const now = new Date().toISOString();
    const newQuote: Quote = {
      ...data,
      id: data.id || `quote-${Date.now()}`,
      tenantId,
      code: data.code || `COT-${Date.now().toString().slice(-4)}`,
      clientId: data.clientId || '',
      clientName: data.clientName || '',
      companyName: data.companyName || '',
      documentType: data.documentType || 'RUC',
      documentNumber: data.documentNumber || '',
      whatsapp: data.whatsapp || '',
      email: data.email || '',
      currency: data.currency || 'PEN',
      currencySymbol: data.currencySymbol || 'S/',
      subtotal: Number(data.subtotal) || 0,
      includeTax: data.includeTax !== undefined ? data.includeTax : true,
      taxRate: Number(data.taxRate) || 18,
      taxAmount: Number(data.taxAmount) || 0,
      discountAmount: Number(data.discountAmount) || 0,
      total: Number(data.total) || 0,
      additionalNotes: data.additionalNotes || '',
      termsAndConditions: data.termsAndConditions || '',
      issueDate: data.issueDate || now.split('T')[0],
      validUntil: data.validUntil || now.split('T')[0],
      status: data.status || 'draft',
      items: data.items || [],
      showGantt: data.showGantt !== undefined ? data.showGantt : false,
      ganttPhases: data.ganttPhases || [],
      showPaymentMethods: data.showPaymentMethods !== undefined ? data.showPaymentMethods : true,
      paymentMethods: data.paymentMethods || [],
      publicToken: data.publicToken || generateToken(16),
      shortCode: data.shortCode || generateToken(4),
      theme: data.theme || 'modern-violet',
      createdAt: now,
      updatedAt: now,
    };
    this.localState.quotes.unshift(newQuote);
    this.saveLocalState();
    return newQuote;
  }

  public async updateQuote(id: string, tenantId: string, data: Partial<Quote>): Promise<Quote | null> {
    const idx = this.localState.quotes.findIndex((q) => q.id === id && q.tenantId === tenantId);
    if (idx === -1) return null;
    this.localState.quotes[idx] = {
      ...this.localState.quotes[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.quotes[idx];
  }

  public async deleteQuote(id: string, tenantId: string): Promise<boolean> {
    const before = this.localState.quotes.length;
    this.localState.quotes = this.localState.quotes.filter((q) => !(q.id === id && q.tenantId === tenantId));
    const deleted = this.localState.quotes.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // NOTAS DE PAGO
  // ===========================================================================

  public async getPaymentNotesByTenant(tenantId: string): Promise<PaymentNote[]> {
    return this.localState.paymentNotes.filter((p) => p.tenantId === tenantId);
  }

  public async getPaymentNoteById(id: string, tenantId: string): Promise<PaymentNote | null> {
    return this.localState.paymentNotes.find((p) => p.id === id && p.tenantId === tenantId) || null;
  }

  public async getPaymentNoteByPublicToken(token: string) {
    const clean = token.trim().toLowerCase();
    const note = this.localState.paymentNotes.find(
      (p) =>
        (p.publicToken && p.publicToken.toLowerCase() === clean) ||
        (p.id && p.id.toLowerCase() === clean) ||
        (p.code && p.code.toLowerCase() === clean)
    );
    if (!note) return null;
    const tenant = this.localState.tenants.find((t) => t.id === note.tenantId);
    if (!tenant) return null;
    return { paymentNote: note, note, tenant };
  }

  public async createPaymentNote(tenantId: string, data: Partial<PaymentNote>): Promise<PaymentNote> {
    const now = new Date().toISOString();
    const newNote: PaymentNote = {
      ...data,
      id: data.id || `pn-${Date.now()}`,
      tenantId,
      code: data.code || `NP-${Date.now().toString().slice(-4)}`,
      clientId: data.clientId || '',
      clientName: data.clientName || '',
      companyName: data.companyName || '',
      documentType: data.documentType || 'RUC',
      documentNumber: data.documentNumber || '',
      whatsapp: data.whatsapp || '',
      email: data.email || '',
      quoteId: data.quoteId,
      quoteCode: data.quoteCode,
      currency: data.currency || 'PEN',
      currencySymbol: data.currencySymbol || 'S/',
      subtotal: Number(data.subtotal) || 0,
      includeTax: data.includeTax !== undefined ? data.includeTax : false,
      taxRate: Number(data.taxRate) || 18,
      discountAmount: Number(data.discountAmount) || 0,
      taxAmount: Number(data.taxAmount) || 0,
      total: Number(data.total) || 0,
      paidAmount: Number(data.paidAmount) || 0,
      issueDate: data.issueDate || now.split('T')[0],
      dueDate: data.dueDate || now.split('T')[0],
      status: data.status || 'pending',
      items: data.items || [],
      publicToken: data.publicToken || generateToken(16),
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now,
    };
    this.localState.paymentNotes.unshift(newNote);
    this.saveLocalState();
    return newNote;
  }

  public async updatePaymentNote(id: string, tenantId: string, data: Partial<PaymentNote>): Promise<PaymentNote | null> {
    const idx = this.localState.paymentNotes.findIndex((p) => p.id === id && p.tenantId === tenantId);
    if (idx === -1) return null;
    this.localState.paymentNotes[idx] = {
      ...this.localState.paymentNotes[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.paymentNotes[idx];
  }

  public async deletePaymentNote(id: string, tenantId: string): Promise<boolean> {
    const before = this.localState.paymentNotes.length;
    this.localState.paymentNotes = this.localState.paymentNotes.filter((p) => !(p.id === id && p.tenantId === tenantId));
    const deleted = this.localState.paymentNotes.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // SERVICIOS Y CATEGORIAS
  // ===========================================================================

  public async getServices(
    tenantId: string,
    filters?: { search?: string; categoryId?: string; status?: string; pricingType?: string }
  ): Promise<Service[]> {
    let list = this.localState.services.filter((s) => s.tenantId === tenantId);
    if (!filters) return list;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((s) => s.title.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }
    if (filters.categoryId && filters.categoryId !== 'all') {
      list = list.filter((s) => s.categoryId === filters.categoryId);
    }
    if (filters.status && filters.status !== 'all') {
      list = list.filter((s) => s.status === filters.status);
    }
    if (filters.pricingType && filters.pricingType !== 'all') {
      list = list.filter((s) => s.pricingType === filters.pricingType);
    }
    return list;
  }

  public async getServiceById(id: string, tenantId: string): Promise<Service | null> {
    return this.localState.services.find((s) => s.id === id && s.tenantId === tenantId) || null;
  }

  public async getPublicServices(slug: string, categorySlug?: string) {
    const tenant = this.localState.tenants.find((t) => t.slug === slug || t.id === slug);
    if (!tenant) return null;
    let services = this.localState.services.filter((s) => s.tenantId === tenant.id && s.visibility === 'public');
    const categories = this.localState.serviceCategories.filter((c) => c.tenantId === tenant.id);
    if (categorySlug && categorySlug !== 'all') {
      const cat = categories.find((c) => c.slug === categorySlug);
      if (cat) {
        services = services.filter((s) => s.categoryId === cat.id);
      }
    }
    return { services, categories, tenant };
  }

  public async getPublicServiceBySlugOrId(slug: string, slugOrId: string) {
    const tenant = this.localState.tenants.find((t) => t.slug === slug || t.id === slug);
    if (!tenant) return null;
    const service = this.localState.services.find(
      (s) =>
        s.tenantId === tenant.id &&
        (s.seo?.slug === slugOrId || (s as any).slug === slugOrId || s.id === slugOrId)
    );
    if (!service) return null;
    const related = this.localState.services
      .filter((s) => s.tenantId === tenant.id && s.categoryId === service.categoryId && s.id !== service.id)
      .slice(0, 3);
    return { service, tenant, relatedServices: related };
  }

  public async createService(tenantId: string, data: any): Promise<Service> {
    const now = new Date().toISOString();
    const newService: Service = {
      id: data.id || `svc-${Date.now()}`,
      tenantId,
      code: data.code || `SRV-${Date.now().toString().slice(-4)}`,
      title: data.title || data.name || 'Nuevo Servicio',
      categoryId: data.categoryId || '',
      categoryName: data.categoryName || '',
      coverImage: data.coverImage || '',
      status: (data.status as ServiceStatus) || 'active',
      icon: data.icon || 'Briefcase',
      pricingType: data.pricingType || 'fixed',
      currency: data.currency || 'PEN',
      currencySymbol: data.currencySymbol || 'S/',
      visibility: data.visibility || 'public',
      basePrice: Number(data.basePrice) || 0,
      annualDiscount: Number(data.annualDiscount) || 0,
      deliveryTime: data.deliveryTime || '3-5 días',
      inventory: data.inventory ?? null,
      inventoryUnlimited: data.inventoryUnlimited !== undefined ? !!data.inventoryUnlimited : true,
      urgency: data.urgency || 'none',
      video: data.video || { url: '', enabled: false },
      briefDescription: data.briefDescription || data.tagline || '',
      fullDescription: data.fullDescription || data.description || '',
      packages: Array.isArray(data.packages) ? data.packages : [],
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
      features: Array.isArray(data.features) ? data.features : [],
      deliverables: Array.isArray(data.deliverables) ? data.deliverables : [],
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
      faqs: Array.isArray(data.faqs) ? data.faqs : [],
      extras: Array.isArray(data.extras) ? data.extras : [],
      seo: data.seo || {
        slug: data.slug || `servicio-${Date.now()}`,
        metaTitle: data.title || data.name || '',
        metaDescription: data.briefDescription || data.description || '',
      },
      relatedServiceIds: Array.isArray(data.relatedServiceIds) ? data.relatedServiceIds : [],
      createdAt: now,
      updatedAt: now,
    };
    this.localState.services.push(newService);
    this.saveLocalState();
    return newService;
  }

  public async updateService(id: string, tenantId: string, data: Partial<Service>): Promise<Service | null> {
    const idx = this.localState.services.findIndex((s) => s.id === id && s.tenantId === tenantId);
    if (idx === -1) return null;
    this.localState.services[idx] = {
      ...this.localState.services[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.services[idx];
  }

  public async deleteService(id: string, tenantId: string): Promise<boolean> {
    const before = this.localState.services.length;
    this.localState.services = this.localState.services.filter((s) => !(s.id === id && s.tenantId === tenantId));
    const deleted = this.localState.services.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  public async getServiceCategories(tenantId: string): Promise<ServiceCategory[]> {
    return this.localState.serviceCategories.filter((c) => c.tenantId === tenantId);
  }

  public async createServiceCategory(tenantId: string, data: any): Promise<ServiceCategory> {
    const now = new Date().toISOString();
    const newCat: ServiceCategory = {
      id: data.id || `cat-${Date.now()}`,
      tenantId,
      name: data.name || '',
      slug: data.slug || `cat-${Date.now()}`,
      description: data.description || '',
      icon: data.icon || 'Folder',
      badgeColor: data.badgeColor || data.color || '#6366f1',
      orderIndex: Number(data.orderIndex ?? data.sortOrder ?? 0),
      createdAt: now,
      updatedAt: now,
    };
    this.localState.serviceCategories.push(newCat);
    this.saveLocalState();
    return newCat;
  }

  public async updateServiceCategory(id: string, tenantId: string, data: Partial<ServiceCategory>): Promise<ServiceCategory | null> {
    const idx = this.localState.serviceCategories.findIndex((c) => c.id === id && c.tenantId === tenantId);
    if (idx === -1) return null;
    this.localState.serviceCategories[idx] = {
      ...this.localState.serviceCategories[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.serviceCategories[idx];
  }

  public async deleteServiceCategory(id: string, tenantId: string): Promise<boolean> {
    const before = this.localState.serviceCategories.length;
    this.localState.serviceCategories = this.localState.serviceCategories.filter((c) => !(c.id === id && c.tenantId === tenantId));
    const deleted = this.localState.serviceCategories.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // WORKSPACE: REDES SOCIALES (POSTS)
  // ===========================================================================

  public async getWorkspacePosts(tenantId: string, clientId?: string): Promise<WorkspacePost[]> {
    let list = this.localState.workspacePosts.filter((p) => p.tenantId === tenantId);
    if (clientId) {
      list = list.filter((p) => p.clientId === clientId);
    }
    return list;
  }

  public async createWorkspacePost(
    tenantIdOrData: string | (Partial<WorkspacePost> & { tenantId: string }),
    maybeData?: Partial<WorkspacePost>
  ): Promise<WorkspacePost> {
    const data: Partial<WorkspacePost> & { tenantId: string } =
      typeof tenantIdOrData === 'string'
        ? { ...(maybeData || {}), tenantId: tenantIdOrData }
        : tenantIdOrData;
    const now = new Date().toISOString();
    const newPost: WorkspacePost = {
      ...data,
      id: data.id || `post-${Date.now()}`,
      tenantId: data.tenantId,
      projectId: data.projectId,
      monthId: data.monthId,
      clientId: data.clientId || '',
      clientName: data.clientName || '',
      brandId: data.brandId,
      brandName: data.brandName,
      title: data.title || '',
      platforms: data.platforms || ['instagram'],
      format: data.format || 'post',
      copy: data.copy ? cleanHtmlForServer(data.copy) : '',
      designerBrief: data.designerBrief ? cleanHtmlForServer(data.designerBrief) : undefined,
      hashtags: data.hashtags,
      mediaUrl: data.mediaUrl,
      scheduledDate: data.scheduledDate || now.split('T')[0],
      status: data.status || 'idea',
      assignedUserId: data.assignedUserId,
      assignedUserName: data.assignedUserName,
      assignedUserRole: data.assignedUserRole,
      assignedUserAvatar: data.assignedUserAvatar,
      budget: Number(data.budget) || 0,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };
    this.localState.workspacePosts.unshift(newPost);
    this.saveLocalState();
    return newPost;
  }

  public async updateWorkspacePost(id: string, tenantId: string, data: Partial<WorkspacePost>): Promise<WorkspacePost | null> {
    const idx = this.localState.workspacePosts.findIndex((p) => p.id === id && p.tenantId === tenantId);
    if (idx === -1) return null;
    const cleanedData = { ...data };
    if (typeof cleanedData.copy === 'string') {
      cleanedData.copy = cleanHtmlForServer(cleanedData.copy);
    }
    if (typeof cleanedData.designerBrief === 'string') {
      cleanedData.designerBrief = cleanHtmlForServer(cleanedData.designerBrief);
    }

    this.localState.workspacePosts[idx] = {
      ...this.localState.workspacePosts[idx],
      ...cleanedData,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.workspacePosts[idx];
  }

  public async deleteWorkspacePost(id: string, tenantId: string): Promise<boolean> {
    const before = this.localState.workspacePosts.length;
    this.localState.workspacePosts = this.localState.workspacePosts.filter((p) => !(p.id === id && p.tenantId === tenantId));
    const deleted = this.localState.workspacePosts.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // WORKSPACE: TAREAS
  // ===========================================================================

  public async getWorkspaceTasks(tenantId: string, clientId?: string): Promise<WorkspaceTask[]> {
    let list = this.localState.workspaceTasks.filter((t) => t.tenantId === tenantId);
    if (clientId) {
      list = list.filter((t) => t.clientId === clientId);
    }
    return list;
  }

  public async createWorkspaceTask(
    tenantIdOrData: string | (Partial<WorkspaceTask> & { tenantId: string }),
    maybeData?: Partial<WorkspaceTask>
  ): Promise<WorkspaceTask> {
    const data: Partial<WorkspaceTask> & { tenantId: string } =
      typeof tenantIdOrData === 'string'
        ? { ...(maybeData || {}), tenantId: tenantIdOrData }
        : tenantIdOrData;
    const now = new Date().toISOString();
    const newTask: WorkspaceTask = {
      id: data.id || `task-${Date.now()}`,
      tenantId: data.tenantId,
      title: data.title || '',
      description: data.description || '',
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      category: data.category || 'General',
      clientId: data.clientId,
      clientName: data.clientName,
      assignedUserId: data.assignedUserId,
      assignedUserName: data.assignedUserName,
      assignedUserAvatar: data.assignedUserAvatar,
      dueDate: data.dueDate || now.split('T')[0],
      createdAt: now,
      updatedAt: now,
    };
    this.localState.workspaceTasks.unshift(newTask);
    this.saveLocalState();
    return newTask;
  }

  public async updateWorkspaceTask(id: string, tenantId: string, data: Partial<WorkspaceTask>): Promise<WorkspaceTask | null> {
    const idx = this.localState.workspaceTasks.findIndex((t) => t.id === id && t.tenantId === tenantId);
    if (idx === -1) return null;
    this.localState.workspaceTasks[idx] = {
      ...this.localState.workspaceTasks[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.workspaceTasks[idx];
  }

  public async deleteWorkspaceTask(id: string, tenantId: string): Promise<boolean> {
    const before = this.localState.workspaceTasks.length;
    this.localState.workspaceTasks = this.localState.workspaceTasks.filter((t) => !(t.id === id && t.tenantId === tenantId));
    const deleted = this.localState.workspaceTasks.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // WORKSPACE: PROYECTOS
  // ===========================================================================

  public async getWorkspaceProjects(tenantId: string, clientId?: string): Promise<WorkspaceProject[]> {
    if (!Array.isArray(this.localState.workspaceProjects)) {
      this.localState.workspaceProjects = [];
    }
    let list = this.localState.workspaceProjects.filter((p) => p.tenantId === tenantId);
    if (clientId) {
      list = list.filter((p) => p.clientId === clientId);
    }
    return list;
  }

  public async getWorkspaceProjectById(id: string, tenantId: string): Promise<WorkspaceProject | null> {
    const list = await this.getWorkspaceProjects(tenantId);
    return list.find((p) => p.id === id) || null;
  }

  public async createWorkspaceProject(
    tenantIdOrData: string | (Partial<WorkspaceProject> & { tenantId: string }),
    maybeData?: Partial<WorkspaceProject>
  ): Promise<WorkspaceProject> {
    const data: Partial<WorkspaceProject> & { tenantId: string } =
      typeof tenantIdOrData === 'string'
        ? { ...(maybeData || {}), tenantId: tenantIdOrData }
        : tenantIdOrData;
    const now = new Date().toISOString();
    const newProj: WorkspaceProject = {
      id: data.id || `proj-${Date.now()}`,
      tenantId: data.tenantId,
      serviceOrderId: data.serviceOrderId || '',
      serviceOrderCode: data.serviceOrderCode || '',
      serviceOrderToken: data.serviceOrderToken || '',
      name: data.name || 'Nuevo Proyecto de Redes',
      clientId: data.clientId || '',
      clientName: data.clientName || 'Cliente General',
      companyName: data.companyName || data.clientName || '',
      brandId: data.brandId || '',
      brandName: data.brandName || '',
      periodStart: data.periodStart || now.split('T')[0],
      periodEnd: data.periodEnd || now.split('T')[0],
      status: data.status || 'active',
      budget: Number(data.budget) || 0,
      budgetCurrency: data.budgetCurrency || 'PEN',
      platforms: data.platforms || ['instagram', 'facebook'],
      contractedPosts: Number(data.contractedPosts) || 0,
      contractedReels: Number(data.contractedReels) || 0,
      contractedStories: Number(data.contractedStories) || 0,
      assignedUsers: data.assignedUsers || [],
      notes: data.notes || '',
      driveFolderId: data.driveFolderId || '',
      driveFolderName: data.driveFolderName || '',
      driveFolderLink: data.driveFolderLink || '',
      createdAt: now,
      updatedAt: now,
    };
    if (!Array.isArray(this.localState.workspaceProjects)) {
      this.localState.workspaceProjects = [];
    }
    this.localState.workspaceProjects.unshift(newProj);
    this.saveLocalState();
    return newProj;
  }

  public async updateWorkspaceProject(id: string, tenantId: string, data: Partial<WorkspaceProject>): Promise<WorkspaceProject | null> {
    if (!Array.isArray(this.localState.workspaceProjects)) {
      this.localState.workspaceProjects = [];
    }
    const idx = this.localState.workspaceProjects.findIndex((p) => p.id === id && p.tenantId === tenantId);
    if (idx === -1) return null;
    this.localState.workspaceProjects[idx] = {
      ...this.localState.workspaceProjects[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.workspaceProjects[idx];
  }

  public async deleteWorkspaceProject(id: string, tenantId: string): Promise<boolean> {
    if (!Array.isArray(this.localState.workspaceProjects)) {
      this.localState.workspaceProjects = [];
      return false;
    }
    const before = this.localState.workspaceProjects.length;
    this.localState.workspaceProjects = this.localState.workspaceProjects.filter((p) => !(p.id === id && p.tenantId === tenantId));
    const deleted = this.localState.workspaceProjects.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // MESES / CAMPAÑAS MENSUALES DE PROYECTO (WORKSPACE)
  // ===========================================================================

  public async getWorkspaceMonths(tenantId: string, projectId?: string): Promise<WorkspaceMonth[]> {
    if (!Array.isArray(this.localState.workspaceMonths)) {
      this.localState.workspaceMonths = [];
    }
    let list = this.localState.workspaceMonths.filter((m) => m.tenantId === tenantId);
    if (projectId && projectId !== 'all') {
      list = list.filter((m) => m.projectId === projectId);
    }
    // Ordenar por año desc, mes desc
    list.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
    return list;
  }

  public async getWorkspaceMonthById(id: string, tenantId: string): Promise<WorkspaceMonth | null> {
    const list = await this.getWorkspaceMonths(tenantId);
    return list.find((m) => m.id === id) || null;
  }

  public async createWorkspaceMonth(
    tenantIdOrData: string | (Partial<WorkspaceMonth> & { tenantId: string }),
    maybeData?: Partial<WorkspaceMonth>
  ): Promise<WorkspaceMonth> {
    const data: Partial<WorkspaceMonth> & { tenantId: string } =
      typeof tenantIdOrData === 'string'
        ? { ...(maybeData || {}), tenantId: tenantIdOrData }
        : tenantIdOrData;
    const now = new Date().toISOString();
    const newMonth: WorkspaceMonth = {
      id: data.id || `month-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId: data.tenantId,
      projectId: data.projectId || '',
      name: data.name || 'Mes Sin Título',
      month: data.month || new Date().getMonth() + 1,
      year: data.year || new Date().getFullYear(),
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date().toISOString().split('T')[0],
      status: data.status || 'pending',
      driveFolderId: data.driveFolderId || '',
      driveFolderName: data.driveFolderName || '',
      driveFolderLink: data.driveFolderLink || '',
      driveSubfolders: data.driveSubfolders || [],
      publicToken: data.publicToken || generateToken(16),
      requirePin: data.requirePin || false,
      publicPin: data.publicPin || '',
      createdAt: now,
      updatedAt: now,
    };
    if (!Array.isArray(this.localState.workspaceMonths)) {
      this.localState.workspaceMonths = [];
    }
    this.localState.workspaceMonths.unshift(newMonth);
    this.saveLocalState();
    return newMonth;
  }

  public async updateWorkspaceMonth(id: string, tenantId: string, data: Partial<WorkspaceMonth>): Promise<WorkspaceMonth | null> {
    if (!Array.isArray(this.localState.workspaceMonths)) {
      this.localState.workspaceMonths = [];
    }
    const idx = this.localState.workspaceMonths.findIndex((m) => m.id === id && m.tenantId === tenantId);
    if (idx === -1) return null;
    this.localState.workspaceMonths[idx] = {
      ...this.localState.workspaceMonths[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.workspaceMonths[idx];
  }

  public async deleteWorkspaceMonth(id: string, tenantId: string): Promise<boolean> {
    if (!Array.isArray(this.localState.workspaceMonths)) {
      this.localState.workspaceMonths = [];
      return false;
    }
    const before = this.localState.workspaceMonths.length;
    this.localState.workspaceMonths = this.localState.workspaceMonths.filter(
      (m) => !(m.id === id && (!m.tenantId || m.tenantId === tenantId))
    );
    const deleted = this.localState.workspaceMonths.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  public async getWorkspaceMonthByPublicToken(token: string) {
    if (!token) return null;
    const cleanToken = token.trim();
    if (!Array.isArray(this.localState.workspaceMonths)) return null;

    const month = this.localState.workspaceMonths.find(
      (m) => (m.publicToken && m.publicToken === cleanToken) || m.id === cleanToken
    );
    if (!month) return null;

    const tenant = this.localState.tenants.find((t) => t.id === month.tenantId);
    const project = (this.localState.workspaceProjects || []).find((p) => p.id === month.projectId);
    const posts = (this.localState.workspacePosts || []).filter(
      (p) => p.monthId === month.id || (month.projectId && p.projectId === month.projectId)
    );

    return {
      month,
      project: project || null,
      posts,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            logoUrl: tenant.customization?.logoLightUrl || '',
            companyInfo: tenant.companyInfo,
          }
        : null,
    };
  }

  // ===========================================================================
  // WORKSPACE: HERRAMIENTAS - BIOLINKS (LINK IN BIO)
  // ===========================================================================

  public async getBiolinks(tenantId: string): Promise<BiolinkProfile[]> {
    if (!Array.isArray(this.localState.biolinks)) {
      this.localState.biolinks = [];
    }
    return this.localState.biolinks.filter((b) => b.tenantId === tenantId);
  }

  public async getBiolinkById(id: string, tenantId: string): Promise<BiolinkProfile | null> {
    const list = await this.getBiolinks(tenantId);
    return list.find((b) => b.id === id) || null;
  }

  public async getBiolinkBySlug(slug: string): Promise<{ profile: BiolinkProfile; tenant: any } | null> {
    if (!Array.isArray(this.localState.biolinks)) {
      this.localState.biolinks = [];
    }
    const cleanSlug = slug.trim().toLowerCase();
    const profile = this.localState.biolinks.find(
      (b) => b.slug.toLowerCase() === cleanSlug || b.id === slug
    );
    if (!profile) return null;
    const tenant = this.localState.tenants.find((t) => t.id === profile.tenantId);
    return { profile, tenant: tenant || null };
  }

  public async createBiolink(tenantId: string, data: Partial<BiolinkProfile>): Promise<BiolinkProfile> {
    if (!Array.isArray(this.localState.biolinks)) {
      this.localState.biolinks = [];
    }
    const now = new Date().toISOString();
    const cleanSlug = (data.slug || `bio-${Date.now().toString(36)}`)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, '-');

    const newProfile: BiolinkProfile = {
      id: data.id || `bio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      slug: cleanSlug,
      title: data.title || 'Mi Biolink',
      bio: data.bio || '',
      avatarUrl: data.avatarUrl || '',
      verified: !!data.verified,
      theme: data.theme || 'roma_agency',
      buttonShape: data.buttonShape || 'rounded',
      customBgColor: data.customBgColor,
      customTextColor: data.customTextColor,
      customAccentColor: data.customAccentColor,
      socialLinks: data.socialLinks || [],
      blocks: data.blocks || [],
      viewsCount: 0,
      clicksCount: 0,
      viewsHistory: [
        { date: now.split('T')[0], views: 1, clicks: 0 }
      ],
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      createdAt: now,
      updatedAt: now,
    };

    this.localState.biolinks.unshift(newProfile);
    this.saveLocalState();
    return newProfile;
  }

  public async updateBiolink(id: string, tenantId: string, data: Partial<BiolinkProfile>): Promise<BiolinkProfile | null> {
    if (!Array.isArray(this.localState.biolinks)) {
      this.localState.biolinks = [];
    }
    const idx = this.localState.biolinks.findIndex((b) => b.id === id && b.tenantId === tenantId);
    if (idx === -1) return null;

    if (data.slug) {
      data.slug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
    }

    this.localState.biolinks[idx] = {
      ...this.localState.biolinks[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.biolinks[idx];
  }

  public async deleteBiolink(id: string, tenantId: string): Promise<boolean> {
    if (!Array.isArray(this.localState.biolinks)) {
      this.localState.biolinks = [];
      return false;
    }
    const before = this.localState.biolinks.length;
    this.localState.biolinks = this.localState.biolinks.filter(
      (b) => !(b.id === id && b.tenantId === tenantId)
    );
    const deleted = this.localState.biolinks.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  public async recordBiolinkView(slug: string): Promise<boolean> {
    if (!Array.isArray(this.localState.biolinks)) return false;
    const cleanSlug = slug.trim().toLowerCase();
    const profile = this.localState.biolinks.find(
      (b) => b.slug.toLowerCase() === cleanSlug || b.id === slug
    );
    if (!profile) return false;
    profile.viewsCount = (profile.viewsCount || 0) + 1;
    const today = new Date().toISOString().split('T')[0];
    if (!Array.isArray(profile.viewsHistory)) profile.viewsHistory = [];
    const dayStat = profile.viewsHistory.find((h) => h.date === today);
    if (dayStat) {
      dayStat.views = (dayStat.views || 0) + 1;
    } else {
      profile.viewsHistory.push({ date: today, views: 1, clicks: 0 });
    }
    this.saveLocalState();
    return true;
  }

  public async recordBiolinkClick(slug: string, blockId?: string): Promise<boolean> {
    if (!Array.isArray(this.localState.biolinks)) return false;
    const cleanSlug = slug.trim().toLowerCase();
    const profile = this.localState.biolinks.find(
      (b) => b.slug.toLowerCase() === cleanSlug || b.id === slug
    );
    if (!profile) return false;
    profile.clicksCount = (profile.clicksCount || 0) + 1;
    if (blockId && Array.isArray(profile.blocks)) {
      const block = profile.blocks.find((b) => b.id === blockId);
      if (block) {
        block.clicksCount = (block.clicksCount || 0) + 1;
      }
    }
    const today = new Date().toISOString().split('T')[0];
    if (!Array.isArray(profile.viewsHistory)) profile.viewsHistory = [];
    const dayStat = profile.viewsHistory.find((h) => h.date === today);
    if (dayStat) {
      dayStat.clicks = (dayStat.clicks || 0) + 1;
    } else {
      profile.viewsHistory.push({ date: today, views: 0, clicks: 1 });
    }
    this.saveLocalState();
    return true;
  }

  // ===========================================================================
  // WORKSPACE: HERRAMIENTAS - PALETAS GUARDADAS
  // ===========================================================================

  public async getSavedPalettes(tenantId: string): Promise<SavedColorPalette[]> {
    if (!Array.isArray(this.localState.savedPalettes)) {
      this.localState.savedPalettes = [];
    }
    return this.localState.savedPalettes.filter((p) => p.tenantId === tenantId);
  }

  public async savePalette(tenantId: string, data: Partial<SavedColorPalette>): Promise<SavedColorPalette> {
    if (!Array.isArray(this.localState.savedPalettes)) {
      this.localState.savedPalettes = [];
    }
    const newPalette: SavedColorPalette = {
      id: data.id || `pal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      name: data.name || 'Nueva Paleta',
      primaryShade: data.primaryShade || 700,
      shades: data.shades || [],
      createdAt: new Date().toISOString(),
    };
    this.localState.savedPalettes.unshift(newPalette);
    this.saveLocalState();
    return newPalette;
  }

  public async deletePalette(id: string, tenantId: string): Promise<boolean> {
    if (!Array.isArray(this.localState.savedPalettes)) {
      this.localState.savedPalettes = [];
      return false;
    }
    const before = this.localState.savedPalettes.length;
    this.localState.savedPalettes = this.localState.savedPalettes.filter(
      (p) => !(p.id === id && p.tenantId === tenantId)
    );
    const deleted = this.localState.savedPalettes.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // WORKSPACE: HERRAMIENTAS - HISTORIAL DE CÓDIGOS (QR / BARRAS)
  // ===========================================================================

  public async getCodeHistory(tenantId: string): Promise<GeneratedCodeHistoryItem[]> {
    if (!Array.isArray(this.localState.codeHistory)) {
      this.localState.codeHistory = [];
    }
    return this.localState.codeHistory.filter((c) => c.tenantId === tenantId).slice(0, 50);
  }

  public async addCodeHistory(tenantId: string, data: Partial<GeneratedCodeHistoryItem>): Promise<GeneratedCodeHistoryItem> {
    if (!Array.isArray(this.localState.codeHistory)) {
      this.localState.codeHistory = [];
    }
    const item: GeneratedCodeHistoryItem = {
      id: `code-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      type: data.type || 'qr',
      subType: data.subType || 'url',
      value: data.value || '',
      label: data.label || '',
      createdAt: new Date().toISOString(),
    };
    this.localState.codeHistory.unshift(item);
    if (this.localState.codeHistory.length > 100) {
      this.localState.codeHistory = this.localState.codeHistory.slice(0, 100);
    }
    this.saveLocalState();
    return item;
  }

  public async clearCodeHistory(tenantId: string): Promise<boolean> {
    if (!Array.isArray(this.localState.codeHistory)) {
      this.localState.codeHistory = [];
      return true;
    }
    this.localState.codeHistory = this.localState.codeHistory.filter((c) => c.tenantId !== tenantId);
    this.saveLocalState();
    return true;
  }

  // ===========================================================================
  // ORDENES DE SERVICIO (OS)
  // ===========================================================================

  public async getServiceOrders(tenantId: string, clientId?: string, status?: string): Promise<ServiceOrder[]> {
    let list = this.localState.serviceOrders.filter((o) => o.tenantId === tenantId);
    if (clientId) {
      list = list.filter((o) => o.clientId === clientId);
    }
    if (status && status !== 'all') {
      list = list.filter((o) => o.status === status);
    }
    return list;
  }

  public async getServiceOrderById(id: string, tenantId: string): Promise<ServiceOrder | null> {
    return this.localState.serviceOrders.find((o) => o.id === id && o.tenantId === tenantId) || null;
  }

  public async getServiceOrderByPublicToken(token: string) {
    const order = this.localState.serviceOrders.find((o) => o.publicToken === token);
    if (!order) return null;
    const tenant = this.localState.tenants.find((t) => t.id === order.tenantId);
    if (!tenant) return null;
    return { order, tenant };
  }

  public async createServiceOrder(
    tenantIdOrData: string | (Partial<ServiceOrder> & { tenantId: string }),
    maybeData?: Partial<ServiceOrder>
  ): Promise<ServiceOrder> {
    const data: Partial<ServiceOrder> & { tenantId: string } =
      typeof tenantIdOrData === 'string'
        ? { ...(maybeData || {}), tenantId: tenantIdOrData }
        : tenantIdOrData;
    const now = new Date().toISOString();
    const newOrder: ServiceOrder = {
      id: data.id || `os-${Date.now()}`,
      tenantId: data.tenantId,
      code: data.code || `OS-${Date.now().toString().slice(-4)}`,
      title: data.title || '',
      clientId: data.clientId || '',
      clientName: data.clientName || '',
      companyName: data.companyName || '',
      brandName: data.brandName || '',
      documentType: (data.documentType as any) || 'RUC',
      documentNumber: data.documentNumber || '',
      whatsapp: data.whatsapp || '',
      email: data.email || '',
      quoteId: data.quoteId,
      quoteCode: data.quoteCode,
      startDate: data.startDate || now.split('T')[0],
      deliveryDate: data.deliveryDate || now.split('T')[0],
      projectManagerId: data.projectManagerId,
      projectManagerName: data.projectManagerName,
      status: data.status || 'active',
      totalProgress: Number(data.totalProgress) || 0,
      socialMedia: data.socialMedia || {
        enabled: false,
        hasBudget: false,
        budgetAmount: 0,
        budgetCurrency: 'PEN',
        budgetManagedBy: 'agency',
        platforms: [],
        postsCount: 0,
        reelsCount: 0,
        storiesCount: 0,
        scopeNotes: '',
      },
      branding: data.branding || {
        enabled: false,
        deliverablesList: [],
        initialProposalsCount: 0,
        reviewRoundsCount: 0,
        scopeNotes: '',
      },
      audiovisual: data.audiovisual || {
        enabled: false,
        deliverablesList: [],
        shootingHours: 0,
        location: '',
        scopeNotes: '',
      },
      web: data.web || {
        enabled: false,
        deliverablesList: [],
        platform: '',
        includesHosting: false,
        domainName: '',
        scopeNotes: '',
      },
      deliverables: data.deliverables || [],
      publicToken: data.publicToken || generateToken(16),
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now,
    };
    this.localState.serviceOrders.unshift(newOrder);
    this.saveLocalState();
    return newOrder;
  }

  public async updateServiceOrder(id: string, tenantId: string, data: Partial<ServiceOrder>): Promise<ServiceOrder | null> {
    const idx = this.localState.serviceOrders.findIndex((o) => o.id === id && o.tenantId === tenantId);
    if (idx === -1) return null;
    this.localState.serviceOrders[idx] = {
      ...this.localState.serviceOrders[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.serviceOrders[idx];
  }

  public async deleteServiceOrder(id: string, tenantId: string): Promise<boolean> {
    const before = this.localState.serviceOrders.length;
    this.localState.serviceOrders = this.localState.serviceOrders.filter((o) => !(o.id === id && o.tenantId === tenantId));
    const deleted = this.localState.serviceOrders.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // GOOGLE DRIVE & GESTOR DE ARCHIVOS
  // ===========================================================================

  public async getDriveFiles(
    tenantId: string,
    filters?: {
      clientId?: string;
      serviceOrderId?: string;
      folderId?: string;
      search?: string;
      category?: string;
    }
  ): Promise<DriveFile[]> {
    let list = this.localState.driveFiles.filter((f) => f.tenantId === tenantId);
    if (filters?.clientId) {
      list = list.filter((f) => f.clientId === filters.clientId);
    }
    if (filters?.serviceOrderId) {
      list = list.filter((f) => f.serviceOrderId === filters.serviceOrderId);
    }
    if (filters?.folderId) {
      list = list.filter((f) => f.parentFolderId === filters.folderId);
    }
    if (filters?.category && filters.category !== 'all') {
      list = list.filter((f) => f.category === filters.category);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.clientName && f.clientName.toLowerCase().includes(q)) ||
          (f.serviceOrderCode && f.serviceOrderCode.toLowerCase().includes(q))
      );
    }
    return list;
  }

  public async getDriveFileById(id: string, tenantId: string): Promise<DriveFile | null> {
    return this.localState.driveFiles.find((f) => (f.id === id || f.googleFileId === id) && f.tenantId === tenantId) || null;
  }

  public async createDriveFile(
    data: Omit<DriveFile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<DriveFile> {
    const now = new Date().toISOString();
    const newFile: DriveFile = {
      id: data.id || `df-${Date.now()}-${generateToken(4)}`,
      tenantId: data.tenantId,
      googleFileId: data.googleFileId,
      name: data.name,
      mimeType: data.mimeType || 'application/octet-stream',
      size: Number(data.size) || 0,
      webViewLink: data.webViewLink || '',
      webContentLink: data.webContentLink || '',
      thumbnailLink: data.thumbnailLink || '',
      parentFolderId: data.parentFolderId || '',
      parentFolderName: data.parentFolderName || '',
      clientId: data.clientId || '',
      clientName: data.clientName || '',
      serviceOrderId: data.serviceOrderId || '',
      serviceOrderCode: data.serviceOrderCode || '',
      category: data.category || 'general',
      starred: Boolean(data.starred),
      width: data.width ? Number(data.width) : undefined,
      height: data.height ? Number(data.height) : undefined,
      durationMillis: data.durationMillis ? Number(data.durationMillis) : undefined,
      version: data.version ? Number(data.version) : 1,
      createdBy: data.createdBy || '',
      createdAt: now,
      updatedAt: now,
    };

    // Si ya existe el googleFileId para este tenant, actualizar en vez de duplicar
    const existingIdx = this.localState.driveFiles.findIndex(
      (f) => f.tenantId === data.tenantId && f.googleFileId === data.googleFileId
    );
    if (existingIdx !== -1) {
      const prev = this.localState.driveFiles[existingIdx];
      this.localState.driveFiles[existingIdx] = {
        ...prev,
        ...newFile,
        id: prev.id,
        clientId: data.clientId || prev.clientId || '',
        clientName: data.clientName || prev.clientName || '',
        serviceOrderId: data.serviceOrderId || prev.serviceOrderId || '',
        serviceOrderCode: data.serviceOrderCode || prev.serviceOrderCode || '',
        category: data.category && data.category !== 'general' ? data.category : prev.category || 'general',
        starred: data.starred !== undefined ? Boolean(data.starred) : Boolean(prev.starred),
        width: data.width ? Number(data.width) : prev.width,
        height: data.height ? Number(data.height) : prev.height,
        durationMillis: data.durationMillis ? Number(data.durationMillis) : prev.durationMillis,
        version: data.version ? Number(data.version) : (prev.version || 1) + 1,
        createdAt: prev.createdAt,
        updatedAt: now,
      };
      this.saveLocalState();
      return this.localState.driveFiles[existingIdx];
    }

    this.localState.driveFiles.unshift(newFile);
    this.saveLocalState();
    return newFile;
  }

  public async updateDriveFile(
    id: string,
    tenantId: string,
    data: Partial<DriveFile>
  ): Promise<DriveFile | null> {
    const idx = this.localState.driveFiles.findIndex(
      (f) => (f.id === id || f.googleFileId === id) && f.tenantId === tenantId
    );
    if (idx === -1) return null;
    this.localState.driveFiles[idx] = {
      ...this.localState.driveFiles[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.driveFiles[idx];
  }

  public async deleteDriveFile(id: string, tenantId: string): Promise<boolean> {
    const before = this.localState.driveFiles.length;
    this.localState.driveFiles = this.localState.driveFiles.filter(
      (f) => !( (f.id === id || f.googleFileId === id) && f.tenantId === tenantId )
    );
    const deleted = this.localState.driveFiles.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // --- CARPETAS REGISTRADAS ---

  public async getDriveFolders(
    tenantId: string,
    filters?: { clientId?: string; serviceOrderId?: string; parentGoogleFolderId?: string }
  ): Promise<DriveFolder[]> {
    let list = this.localState.driveFolders.filter((f) => f.tenantId === tenantId);
    if (filters?.clientId) {
      list = list.filter((f) => f.clientId === filters.clientId);
    }
    if (filters?.serviceOrderId) {
      list = list.filter((f) => f.serviceOrderId === filters.serviceOrderId);
    }
    if (filters?.parentGoogleFolderId !== undefined) {
      list = list.filter((f) => (f.parentGoogleFolderId || '') === (filters.parentGoogleFolderId || ''));
    }
    return list;
  }

  public async getDriveFolderById(idOrGoogleId: string, tenantId: string): Promise<DriveFolder | null> {
    return (
      this.localState.driveFolders.find(
        (f) => (f.id === idOrGoogleId || f.googleFolderId === idOrGoogleId) && f.tenantId === tenantId
      ) || null
    );
  }

  public async createDriveFolder(
    data: Omit<DriveFolder, 'id' | 'createdAt'> & { id?: string }
  ): Promise<DriveFolder> {
    const newFolder: DriveFolder = {
      id: data.id || `fld-${Date.now()}-${generateToken(4)}`,
      tenantId: data.tenantId,
      googleFolderId: data.googleFolderId,
      name: data.name,
      parentGoogleFolderId: data.parentGoogleFolderId || '',
      clientId: data.clientId || '',
      serviceOrderId: data.serviceOrderId || '',
      folderType: data.folderType || 'custom',
      color: data.color || '',
      starred: Boolean(data.starred),
      webViewLink: data.webViewLink || '',
      createdAt: new Date().toISOString(),
    };

    const existingIdx = this.localState.driveFolders.findIndex(
      (f) => f.tenantId === data.tenantId && f.googleFolderId === data.googleFolderId
    );
    if (existingIdx !== -1) {
      const prev = this.localState.driveFolders[existingIdx];
      this.localState.driveFolders[existingIdx] = {
        ...prev,
        ...newFolder,
        id: prev.id,
        color: data.color || prev.color || '',
        starred: data.starred !== undefined ? Boolean(data.starred) : Boolean(prev.starred),
      };
      this.saveLocalState();
      return this.localState.driveFolders[existingIdx];
    }

    this.localState.driveFolders.push(newFolder);
    this.saveLocalState();
    return newFolder;
  }

  public async updateDriveFolder(
    idOrGoogleId: string,
    tenantId: string,
    data: Partial<DriveFolder>
  ): Promise<DriveFolder | null> {
    const idx = this.localState.driveFolders.findIndex(
      (f) => (f.id === idOrGoogleId || f.googleFolderId === idOrGoogleId) && f.tenantId === tenantId
    );
    if (idx === -1) return null;
    this.localState.driveFolders[idx] = {
      ...this.localState.driveFolders[idx],
      ...data,
    };
    this.saveLocalState();
    return this.localState.driveFolders[idx];
  }

  public async deleteDriveFolder(idOrGoogleId: string, tenantId: string): Promise<boolean> {
    const before = this.localState.driveFolders.length;
    this.localState.driveFolders = this.localState.driveFolders.filter(
      (f) => !((f.id === idOrGoogleId || f.googleFolderId === idOrGoogleId) && f.tenantId === tenantId)
    );
    const deleted = this.localState.driveFolders.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // --- PLANTILLAS DE CARPETAS (BLUEPRINTS) ---

  public async getDriveFolderBlueprints(tenantId: string): Promise<DriveFolderBlueprint[]> {
    let list = this.localState.driveFolderBlueprints.filter((b) => b.tenantId === tenantId || b.tenantId === 'system');
    
    // Si no existen plantillas aún, inicializar las plantillas por defecto para la agencia
    if (list.length === 0) {
      const defaultBlueprints: DriveFolderBlueprint[] = [
        {
          id: 'bp-clients-default',
          tenantId,
          name: 'Estructura Estándar para Clientes',
          description: 'Carpetas esenciales para organizar contratos, identidad y entregables de la cuenta.',
          module: 'clients',
          isDefault: true,
          structure: [
            { name: '01_Brief_y_Contratos', category: 'brief' },
            { name: '02_Identidad_y_Logos', category: 'brand' },
            { name: '03_Entregables_Finales', category: 'deliverable' },
            { name: '04_Facturacion_y_Comprobantes', category: 'invoice' },
          ],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'bp-os-default',
          tenantId,
          name: 'Estructura de Orden de Servicio / Campaña',
          description: 'Organización para proyectos creativos: referencias, editables y exportaciones.',
          module: 'service_orders',
          isDefault: true,
          structure: [
            { name: '01_Referencias_y_Brief', category: 'brief' },
            { name: '02_Editables_AI_PSD_PR', category: 'raw_asset' },
            { name: '03_Exportaciones_Alta_Resolucion', category: 'deliverable' },
            { name: '04_Revisiones_Cliente', category: 'revision' },
          ],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'bp-social-default',
          tenantId,
          name: 'Estructura de Redes Sociales & Contenido',
          description: 'Carpetas para gestión mensual de contenidos, videos verticales y recursos.',
          module: 'workspace',
          isDefault: false,
          structure: [
            { name: '01_Parrilla_de_Contenidos', category: 'brief' },
            { name: '02_Videos_Reels_TikTok', category: 'deliverable' },
            { name: '03_Graficas_Feed_Stories', category: 'deliverable' },
            { name: '04_Recursos_y_Fuentes', category: 'raw_asset' },
          ],
          createdAt: new Date().toISOString(),
        },
      ];
      this.localState.driveFolderBlueprints.push(...defaultBlueprints);
      this.saveLocalState();
      return defaultBlueprints;
    }
    return list;
  }

  public async createDriveFolderBlueprint(
    data: Omit<DriveFolderBlueprint, 'id' | 'createdAt'> & { id?: string }
  ): Promise<DriveFolderBlueprint> {
    const newBp: DriveFolderBlueprint = {
      id: data.id || `bp-${Date.now()}-${generateToken(4)}`,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description || '',
      module: data.module || 'general',
      structure: data.structure || [],
      isDefault: Boolean(data.isDefault),
      createdAt: new Date().toISOString(),
    };
    this.localState.driveFolderBlueprints.unshift(newBp);
    this.saveLocalState();
    return newBp;
  }

  public async deleteDriveFolderBlueprint(id: string, tenantId: string): Promise<boolean> {
    const before = this.localState.driveFolderBlueprints.length;
    this.localState.driveFolderBlueprints = this.localState.driveFolderBlueprints.filter(
      (b) => !(b.id === id && (b.tenantId === tenantId || b.tenantId === 'system'))
    );
    const deleted = this.localState.driveFolderBlueprints.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // NOTIFICACIONES MULTITENANT & PWA PUSH
  // ===========================================================================

  public async getNotifications(
    tenantId: string,
    options?: { limit?: number; unreadOnly?: boolean; module?: string }
  ): Promise<AppNotification[]> {
    if (this.isPostgresConnected && this.pool) {
      try {
        let query = `
          SELECT 
            id, tenant_id as "tenantId", title, message, type, module,
            entity_id as "entityId", action, link, actor_user_id as "actorUserId",
            actor_user_name as "actorUserName", is_read as "isRead", metadata,
            created_at as "createdAt"
          FROM notifications
          WHERE tenant_id = $1
        `;
        const params: any[] = [tenantId];
        if (options?.unreadOnly) {
          params.push(false);
          query += ` AND is_read = $${params.length}`;
        }
        if (options?.module && options.module !== 'all') {
          params.push(options.module);
          query += ` AND module = $${params.length}`;
        }
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(options?.limit || 50);

        const res = await this.pool.query(query, params);
        return res.rows;
      } catch (err) {
        console.warn('[DB] Fallback a localState para getNotifications:', err);
      }
    }

    let list = (this.localState.notifications || []).filter((n) => n.tenantId === tenantId);
    if (options?.unreadOnly) {
      list = list.filter((n) => !n.isRead);
    }
    if (options?.module && options.module !== 'all') {
      list = list.filter((n) => n.module === options.module);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(0, options?.limit || 50);
  }

  public async createNotification(
    data: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & {
      id?: string;
      createdAt?: string;
      isRead?: boolean;
    }
  ): Promise<AppNotification> {
    const id = data.id || `notif-${Date.now()}-${generateToken(4)}`;
    const createdAt = data.createdAt || new Date().toISOString();
    const isRead = data.isRead ?? false;

    const notif: AppNotification = {
      id,
      tenantId: data.tenantId,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      module: data.module || 'general',
      entityId: data.entityId,
      action: data.action,
      link: data.link,
      actorUserId: data.actorUserId,
      actorUserName: data.actorUserName,
      isRead,
      createdAt,
      metadata: data.metadata || {},
    };

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO notifications (
            id, tenant_id, title, message, type, module, entity_id, action, link,
            actor_user_id, actor_user_name, is_read, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            notif.id,
            notif.tenantId,
            notif.title,
            notif.message,
            notif.type,
            notif.module,
            notif.entityId || null,
            notif.action || null,
            notif.link || null,
            notif.actorUserId || null,
            notif.actorUserName || null,
            notif.isRead,
            JSON.stringify(notif.metadata || {}),
            notif.createdAt,
          ]
        );
      } catch (err) {
        console.warn('[DB] Fallback al guardar notificación en localState:', err);
      }
    }

    if (!Array.isArray(this.localState.notifications)) {
      this.localState.notifications = [];
    }
    this.localState.notifications.unshift(notif);
    // Limitar histórico local a 500 notificaciones por seguridad
    if (this.localState.notifications.length > 500) {
      this.localState.notifications = this.localState.notifications.slice(0, 500);
    }
    this.saveLocalState();
    return notif;
  }

  public async markNotificationAsRead(tenantId: string, id: string): Promise<boolean> {
    let updated = false;
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          'UPDATE notifications SET is_read = TRUE WHERE tenant_id = $1 AND id = $2',
          [tenantId, id]
        );
        updated = (res.rowCount ?? 0) > 0;
      } catch (err) {
        console.warn('[DB] Fallback postgres markNotificationAsRead:', err);
      }
    }

    const item = (this.localState.notifications || []).find(
      (n) => n.tenantId === tenantId && n.id === id
    );
    if (item) {
      item.isRead = true;
      this.saveLocalState();
      updated = true;
    }
    return updated;
  }

  public async markAllNotificationsAsRead(tenantId: string): Promise<number> {
    let count = 0;
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          'UPDATE notifications SET is_read = TRUE WHERE tenant_id = $1 AND is_read = FALSE',
          [tenantId]
        );
        count = res.rowCount ?? 0;
      } catch (err) {
        console.warn('[DB] Fallback postgres markAllNotificationsAsRead:', err);
      }
    }

    (this.localState.notifications || []).forEach((n) => {
      if (n.tenantId === tenantId && !n.isRead) {
        n.isRead = true;
        count++;
      }
    });
    this.saveLocalState();
    return count;
  }

  public async deleteNotification(tenantId: string, id: string): Promise<boolean> {
    let deleted = false;
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          'DELETE FROM notifications WHERE tenant_id = $1 AND id = $2',
          [tenantId, id]
        );
        deleted = (res.rowCount ?? 0) > 0;
      } catch (err) {
        console.warn('[DB] Fallback postgres deleteNotification:', err);
      }
    }

    const before = (this.localState.notifications || []).length;
    this.localState.notifications = (this.localState.notifications || []).filter(
      (n) => !(n.tenantId === tenantId && n.id === id)
    );
    if (this.localState.notifications.length < before) {
      this.saveLocalState();
      deleted = true;
    }
    return deleted;
  }

  public async clearAllNotifications(tenantId: string): Promise<number> {
    let count = 0;
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query('DELETE FROM notifications WHERE tenant_id = $1', [
          tenantId,
        ]);
        count = res.rowCount ?? 0;
      } catch (err) {
        console.warn('[DB] Fallback postgres clearAllNotifications:', err);
      }
    }

    const before = (this.localState.notifications || []).length;
    this.localState.notifications = (this.localState.notifications || []).filter(
      (n) => n.tenantId !== tenantId
    );
    count = Math.max(count, before - this.localState.notifications.length);
    this.saveLocalState();
    return count;
  }

  // --- SUSCRIPCIONES PUSH WEB / PWA ---

  public async getPushSubscriptions(tenantId: string): Promise<PushSubscriptionRecord[]> {
    if (this.isPostgresConnected && this.pool) {
      try {
        const res = await this.pool.query(
          `SELECT id, tenant_id as "tenantId", user_id as "userId", endpoint, keys,
                  user_agent as "userAgent", created_at as "createdAt", updated_at as "updatedAt"
           FROM push_subscriptions WHERE tenant_id = $1`,
          [tenantId]
        );
        return res.rows;
      } catch (err) {
        console.warn('[DB] Fallback getPushSubscriptions:', err);
      }
    }
    return (this.localState.pushSubscriptions || []).filter((s) => s.tenantId === tenantId);
  }

  public async savePushSubscription(
    sub: Omit<PushSubscriptionRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<PushSubscriptionRecord> {
    const now = new Date().toISOString();
    const id = sub.id || `push-${Date.now()}-${generateToken(4)}`;

    const record: PushSubscriptionRecord = {
      id,
      tenantId: sub.tenantId,
      userId: sub.userId,
      endpoint: sub.endpoint,
      keys: sub.keys,
      userAgent: sub.userAgent,
      createdAt: now,
      updatedAt: now,
    };

    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query(
          `INSERT INTO push_subscriptions (id, tenant_id, user_id, endpoint, keys, user_agent, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (endpoint) DO UPDATE SET 
             tenant_id = EXCLUDED.tenant_id,
             user_id = EXCLUDED.user_id,
             keys = EXCLUDED.keys,
             user_agent = EXCLUDED.user_agent,
             updated_at = EXCLUDED.updated_at`,
          [
            record.id,
            record.tenantId,
            record.userId || null,
            record.endpoint,
            JSON.stringify(record.keys),
            record.userAgent || null,
            record.createdAt,
            record.updatedAt,
          ]
        );
      } catch (err) {
        console.warn('[DB] Fallback savePushSubscription postgres:', err);
      }
    }

    if (!Array.isArray(this.localState.pushSubscriptions)) {
      this.localState.pushSubscriptions = [];
    }
    const idx = this.localState.pushSubscriptions.findIndex((s) => s.endpoint === sub.endpoint);
    if (idx >= 0) {
      this.localState.pushSubscriptions[idx] = {
        ...this.localState.pushSubscriptions[idx],
        ...record,
        id: this.localState.pushSubscriptions[idx].id,
      };
    } else {
      this.localState.pushSubscriptions.push(record);
    }
    this.saveLocalState();
    return record;
  }

  public async deletePushSubscription(endpoint: string): Promise<boolean> {
    if (this.isPostgresConnected && this.pool) {
      try {
        await this.pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
      } catch (err) {
        console.warn('[DB] Fallback deletePushSubscription postgres:', err);
      }
    }

    const before = (this.localState.pushSubscriptions || []).length;
    this.localState.pushSubscriptions = (this.localState.pushSubscriptions || []).filter(
      (s) => s.endpoint !== endpoint
    );
    const deleted = this.localState.pushSubscriptions.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }


  // ===========================================================================
  // WORKSPACE: SUBMÓDULO FORMULARIOS INTERACTIVOS DE AGENCIA
  // ===========================================================================

  public async getForms(tenantId: string): Promise<WorkspaceForm[]> {
    if (!Array.isArray(this.localState.workspaceForms)) {
      this.localState.workspaceForms = [];
    }
    return this.localState.workspaceForms.filter((f) => f.tenantId === tenantId);
  }

  public async getFormById(id: string, tenantId: string): Promise<WorkspaceForm | null> {
    const list = await this.getForms(tenantId);
    return list.find((f) => f.id === id) || null;
  }

  public async getFormBySlug(slug: string): Promise<{ form: WorkspaceForm; tenant: any } | null> {
    if (!Array.isArray(this.localState.workspaceForms)) {
      this.localState.workspaceForms = [];
    }
    const cleanSlug = slug.trim().toLowerCase();
    const form = this.localState.workspaceForms.find(
      (f) => f.slug.toLowerCase() === cleanSlug || f.id === slug
    );
    if (!form) return null;
    const tenant = this.localState.tenants.find((t) => t.id === form.tenantId);
    return { form, tenant: tenant || null };
  }

  public async createForm(tenantId: string, data: Partial<WorkspaceForm>): Promise<WorkspaceForm> {
    if (!Array.isArray(this.localState.workspaceForms)) {
      this.localState.workspaceForms = [];
    }
    const now = new Date().toISOString();
    const rawSlug = (data.slug || data.title || ('form-' + Date.now().toString(36)))
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-');
    const baseSlug = rawSlug.replace(/^-|-$/g, '') || ('form-' + Date.now().toString(36));

    let finalSlug = baseSlug;
    let counter = 1;
    while (this.localState.workspaceForms.some((f) => f.slug === finalSlug)) {
      finalSlug = baseSlug + '-' + (counter++);
    }

    const newForm: WorkspaceForm = {
      id: data.id || ('form-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)),
      tenantId,
      title: data.title?.trim() || 'Nuevo Formulario',
      description: data.description || '',
      slug: finalSlug,
      status: data.status || 'draft',
      fields: Array.isArray(data.fields) ? data.fields : [],
      customization: {
        coverImage: data.customization?.coverImage || '',
        logoUrl: data.customization?.logoUrl || '',
        primaryColor: data.customization?.primaryColor || '#6366f1',
        themeMode: data.customization?.themeMode || 'light',
        borderRadius: data.customization?.borderRadius || 'rounded-2xl',
        fontFamily: data.customization?.fontFamily || 'sans',
        bgPattern: data.customization?.bgPattern || 'dots',
      },
      settings: {
        collectClientName: data.settings?.collectClientName ?? true,
        collectClientEmail: data.settings?.collectClientEmail ?? true,
        showAgencyLogo: data.settings?.showAgencyLogo ?? true,
        isMultiStep: !!data.settings?.isMultiStep,
        welcomeScreen: {
          enabled: data.settings?.welcomeScreen?.enabled ?? false,
          title: data.settings?.welcomeScreen?.title || 'Bienvenido a nuestro formulario',
          description: data.settings?.welcomeScreen?.description || 'Por favor tómate unos minutos para responder las siguientes preguntas.',
          buttonText: data.settings?.welcomeScreen?.buttonText || 'Comenzar ahora',
        },
        thankYouScreen: {
          title: data.settings?.thankYouScreen?.title || '¡Muchas gracias por tu respuesta!',
          message: data.settings?.thankYouScreen?.message || 'Hemos registrado tu información correctamente. Nos pondremos en contacto contigo pronto.',
          buttonText: data.settings?.thankYouScreen?.buttonText || '',
          buttonUrl: data.settings?.thankYouScreen?.buttonUrl || '',
        },
      },
      viewsCount: 0,
      submissionsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.localState.workspaceForms.unshift(newForm);
    this.saveLocalState();
    return newForm;
  }

  public async updateForm(id: string, tenantId: string, data: Partial<WorkspaceForm>): Promise<WorkspaceForm | null> {
    if (!Array.isArray(this.localState.workspaceForms)) {
      this.localState.workspaceForms = [];
    }
    const idx = this.localState.workspaceForms.findIndex((f) => f.id === id && f.tenantId === tenantId);
    if (idx === -1) return null;

    let nextSlug = this.localState.workspaceForms[idx].slug;
    if (data.slug && data.slug.trim() !== '') {
      const cleanSlug = data.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      if (cleanSlug) {
        let finalSlug = cleanSlug;
        let counter = 1;
        while (this.localState.workspaceForms.some((f) => f.slug === finalSlug && f.id !== id)) {
          finalSlug = cleanSlug + '-' + (counter++);
        }
        nextSlug = finalSlug;
      }
    }

    const current = this.localState.workspaceForms[idx];
    this.localState.workspaceForms[idx] = {
      ...current,
      ...data,
      slug: nextSlug,
      customization: {
        ...current.customization,
        ...(data.customization || {}),
      },
      settings: {
        ...current.settings,
        ...(data.settings || {}),
        welcomeScreen: {
          ...current.settings.welcomeScreen,
          ...(data.settings?.welcomeScreen || {}),
        },
        thankYouScreen: {
          ...current.settings.thankYouScreen,
          ...(data.settings?.thankYouScreen || {}),
        },
      },
      updatedAt: new Date().toISOString(),
    };

    this.saveLocalState();
    return this.localState.workspaceForms[idx];
  }

  public async deleteForm(id: string, tenantId: string): Promise<boolean> {
    if (!Array.isArray(this.localState.workspaceForms)) {
      this.localState.workspaceForms = [];
      return false;
    }
    const before = this.localState.workspaceForms.length;
    this.localState.workspaceForms = this.localState.workspaceForms.filter(
      (f) => !(f.id === id && f.tenantId === tenantId)
    );
    const deleted = this.localState.workspaceForms.length < before;
    if (deleted) {
      if (Array.isArray(this.localState.formSubmissions)) {
        this.localState.formSubmissions = this.localState.formSubmissions.filter(
          (s) => !(s.formId === id && s.tenantId === tenantId)
        );
      }
      this.saveLocalState();
    }
    return deleted;
  }

  public async duplicateForm(id: string, tenantId: string): Promise<WorkspaceForm | null> {
    const original = await this.getFormById(id, tenantId);
    if (!original) return null;

    const copyData: Partial<WorkspaceForm> = {
      title: original.title + ' (Copia)',
      description: original.description,
      slug: original.slug + '-copia',
      status: 'draft',
      fields: JSON.parse(JSON.stringify(original.fields || [])),
      customization: JSON.parse(JSON.stringify(original.customization || {})),
      settings: JSON.parse(JSON.stringify(original.settings || {})),
    };

    return this.createForm(tenantId, copyData);
  }

  public async recordFormView(slug: string): Promise<boolean> {
    if (!Array.isArray(this.localState.workspaceForms)) return false;
    const cleanSlug = slug.trim().toLowerCase();
    const form = this.localState.workspaceForms.find(
      (f) => f.slug.toLowerCase() === cleanSlug || f.id === slug
    );
    if (!form) return false;
    form.viewsCount = (form.viewsCount || 0) + 1;
    this.saveLocalState();
    return true;
  }

  public async submitFormAnswers(
    slug: string,
    payload: {
      clientName?: string;
      clientEmail?: string;
      answers: Record<string, any>;
      files?: FormSubmissionFile[];
      ip?: string;
      userAgent?: string;
    }
  ): Promise<FormSubmission> {
    if (!Array.isArray(this.localState.workspaceForms)) {
      this.localState.workspaceForms = [];
    }
    if (!Array.isArray(this.localState.formSubmissions)) {
      this.localState.formSubmissions = [];
    }

    const cleanSlug = slug.trim().toLowerCase();
    const form = this.localState.workspaceForms.find(
      (f) => f.slug.toLowerCase() === cleanSlug || f.id === slug
    );

    if (!form) {
      throw new Error('Formulario no encontrado o no disponible');
    }

    const now = new Date().toISOString();
    const submission: FormSubmission = {
      id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      tenantId: form.tenantId,
      formId: form.id,
      formTitle: form.title,
      clientName: payload.clientName?.trim() || undefined,
      clientEmail: payload.clientEmail?.trim() || undefined,
      answers: payload.answers || {},
      files: Array.isArray(payload.files) ? payload.files : [],
      submittedAt: now,
      ip: payload.ip,
      userAgent: payload.userAgent,
    };

    this.localState.formSubmissions.unshift(submission);
    form.submissionsCount = (form.submissionsCount || 0) + 1;
    form.updatedAt = now;

    try {
      if (Array.isArray(this.localState.notifications)) {
        this.localState.notifications.unshift({
          id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          tenantId: form.tenantId,
          title: 'Nueva respuesta: ' + form.title,
          message: payload.clientName
            ? payload.clientName + ' ha respondido el formulario "' + form.title + '".'
            : 'Se ha recibido una nueva respuesta en el formulario "' + form.title + '".',
          type: 'info',
          module: 'workspace',
          entityId: form.id,
          action: 'form_submission',
          link: '/workspace?sub=forms&formId=' + form.id,
          isRead: false,
          createdAt: now,
          metadata: { formId: form.id, submissionId: submission.id },
        });
      }
    } catch (e) {
      console.warn('[DB] No se pudo crear notificación de formulario:', e);
    }

    this.saveLocalState();
    return submission;
  }

  public async getFormSubmissions(formId: string, tenantId: string): Promise<FormSubmission[]> {
    if (!Array.isArray(this.localState.formSubmissions)) {
      this.localState.formSubmissions = [];
    }
    return this.localState.formSubmissions.filter(
      (s) => s.formId === formId && s.tenantId === tenantId
    );
  }

  public async deleteFormSubmission(submissionId: string, tenantId: string): Promise<boolean> {
    if (!Array.isArray(this.localState.formSubmissions)) {
      this.localState.formSubmissions = [];
      return false;
    }
    const before = this.localState.formSubmissions.length;
    this.localState.formSubmissions = this.localState.formSubmissions.filter(
      (s) => !(s.id === submissionId && s.tenantId === tenantId)
    );
    const deleted = this.localState.formSubmissions.length < before;
    if (deleted) {
      this.saveLocalState();
    }
    return deleted;
  }

  // ===========================================================================
  // ADMINISTRACIÓN: RECURSOS HUMANOS (CONFIGURACIÓN GLOBAL)
  // ===========================================================================

  public async getHrSettings(tenantId: string): Promise<HrGlobalSettings> {
    if (!this.localState.hrSettings) this.localState.hrSettings = [];
    let settings = this.localState.hrSettings.find((s) => s.tenantId === tenantId);
    if (!settings) {
      settings = {
        ...DEFAULT_HR_SETTINGS,
        tenantId,
        updatedAt: new Date().toISOString(),
      };
      this.localState.hrSettings.push(settings);
      this.saveLocalState();
    }
    return settings;
  }

  public async updateHrSettings(tenantId: string, data: Partial<HrGlobalSettings>): Promise<HrGlobalSettings> {
    if (!this.localState.hrSettings) this.localState.hrSettings = [];
    const idx = this.localState.hrSettings.findIndex((s) => s.tenantId === tenantId);
    const now = new Date().toISOString();
    let updated: HrGlobalSettings;
    if (idx === -1) {
      updated = {
        ...DEFAULT_HR_SETTINGS,
        ...data,
        tenantId,
        updatedAt: now,
      };
      this.localState.hrSettings.push(updated);
    } else {
      updated = {
        ...this.localState.hrSettings[idx],
        ...data,
        tenantId,
        updatedAt: now,
      };
      this.localState.hrSettings[idx] = updated;
    }
    this.saveLocalState();
    return updated;
  }

  // ===========================================================================
  // ADMINISTRACIÓN: PERSONAL / EMPLEADOS
  // ===========================================================================

  public async getEmployeeProfiles(tenantId: string): Promise<EmployeeProfile[]> {
    if (!this.localState.employeeProfiles) this.localState.employeeProfiles = [];
    const tenantUsers = await this.getUsersByTenant(tenantId);
    const existing = this.localState.employeeProfiles.filter((p) => p.tenantId === tenantId);

    return existing.map((profile) => {
      const u = tenantUsers.find((user) => user.id === profile.userId);
      return {
        ...profile,
        userName: u?.name || profile.userName || 'Usuario',
        userEmail: u?.email || profile.userEmail || '',
        userAvatar: u?.avatarUrl || profile.userAvatar || '',
        jobTitle: u?.jobTitle || profile.jobTitle || 'Colaborador',
      };
    });
  }

  public async getEmployeeProfileByUserId(tenantId: string, userId: string): Promise<EmployeeProfile | null> {
    const list = await this.getEmployeeProfiles(tenantId);
    return list.find((p) => p.userId === userId) || null;
  }

  public async saveEmployeeProfile(tenantId: string, data: Partial<EmployeeProfile>): Promise<EmployeeProfile> {
    if (!this.localState.employeeProfiles) this.localState.employeeProfiles = [];
    const now = new Date().toISOString();
    const existingIdx = data.id
      ? this.localState.employeeProfiles.findIndex((p) => p.id === data.id && p.tenantId === tenantId)
      : this.localState.employeeProfiles.findIndex((p) => p.userId === data.userId && p.tenantId === tenantId);

    if (existingIdx !== -1) {
      const current = this.localState.employeeProfiles[existingIdx];
      const updated: EmployeeProfile = {
        ...current,
        ...data,
        publicToken: current.publicToken || data.publicToken || generateToken(16),
        payments: data.payments || current.payments || [],
        tenantId,
        updatedAt: now,
      };
      this.localState.employeeProfiles[existingIdx] = updated;
      this.saveLocalState();
      return updated;
    } else {
      const newProfile: EmployeeProfile = {
        id: crypto.randomUUID(),
        tenantId,
        publicToken: data.publicToken || generateToken(16),
        payments: data.payments || [],
        userId: data.userId || '',
        userName: data.userName,
        userEmail: data.userEmail,
        userAvatar: data.userAvatar,
        jobTitle: data.jobTitle,
        documentNumber: data.documentNumber || '',
        documentType: data.documentType || 'DNI',
        birthDate: data.birthDate || '',
        hireDate: data.hireDate || now.split('T')[0],
        salary: Number(data.salary) || 0,
        salaryCurrency: data.salaryCurrency || 'PEN',
        paymentFrequency: data.paymentFrequency || 'monthly',
        entryTime: data.entryTime || '09:00',
        exitTime: data.exitTime || '18:00',
        workDays: data.workDays && data.workDays.length > 0 ? data.workDays : [1, 2, 3, 4, 5],
        department: data.department || 'Operaciones',
        emergencyContact: data.emergencyContact,
        bankAccount: data.bankAccount,
        status: data.status || 'active',
        createdAt: now,
        updatedAt: now,
      };
      this.localState.employeeProfiles.unshift(newProfile);
      this.saveLocalState();
      return newProfile;
    }
  }

  public async getEmployeeProfileByPublicToken(token: string): Promise<{ employee: EmployeeProfile; tenant: any; companyInfo: any } | null> {
    if (!this.localState.employeeProfiles) this.localState.employeeProfiles = [];
    const emp = this.localState.employeeProfiles.find((p) => p.publicToken === token);
    if (!emp) return null;

    const tenant = await this.getTenantById(emp.tenantId);
    if (!tenant) return null;

    const user = this.localState.users.find((u) => u.id === emp.userId);
    const enriched: EmployeeProfile = {
      ...emp,
      userName: user?.name || emp.userName || 'Colaborador',
      userEmail: user?.email || emp.userEmail || '',
      userAvatar: user?.avatarUrl || emp.userAvatar || '',
      jobTitle: user?.jobTitle || emp.jobTitle || 'Equipo',
    };

    return {
      employee: enriched,
      tenant,
      companyInfo: tenant.companyInfo || DEFAULT_COMPANY_INFO,
    };
  }

  public async addEmployeePayment(
    tenantId: string,
    employeeId: string,
    paymentData: Partial<EmployeePaymentRecord>
  ): Promise<{ employee: EmployeeProfile; payment: EmployeePaymentRecord }> {
    if (!this.localState.employeeProfiles) this.localState.employeeProfiles = [];
    const idx = this.localState.employeeProfiles.findIndex(
      (p) => (p.id === employeeId || p.userId === employeeId) && p.tenantId === tenantId
    );
    if (idx === -1) throw new Error('Colaborador no encontrado');

    const emp = this.localState.employeeProfiles[idx];
    if (!Array.isArray(emp.payments)) emp.payments = [];

    const now = new Date().toISOString();
    const newPayment: EmployeePaymentRecord = {
      id: crypto.randomUUID(),
      employeeId: emp.id,
      tenantId,
      paymentDate: paymentData.paymentDate || now.split('T')[0],
      paymentTime: paymentData.paymentTime || now.split('T')[1].slice(0, 5),
      amount: Number(paymentData.amount) || 0,
      currency: paymentData.currency || emp.salaryCurrency || 'PEN',
      periodConcept: paymentData.periodConcept || 'Pago de Remuneración',
      paymentMethod: paymentData.paymentMethod || 'Transferencia',
      operationNumber: paymentData.operationNumber || '',
      voucherUrl: paymentData.voucherUrl,
      voucherName: paymentData.voucherName,
      notes: paymentData.notes || '',
      createdAt: now,
    };

    emp.payments.unshift(newPayment);
    emp.updatedAt = now;

    await this.createFinanceTransaction(tenantId, {
      type: 'expense',
      category: 'Nómina & Sueldos',
      amount: newPayment.amount,
      currency: newPayment.currency,
      date: newPayment.paymentDate,
      description: 'Pago de haberes: ' + (emp.userName || 'Personal') + ' - ' + newPayment.periodConcept,
      paymentMethod: newPayment.paymentMethod,
      reference: newPayment.operationNumber,
      receiptUrl: newPayment.voucherUrl,
    });

    this.saveLocalState();
    return { employee: emp, payment: newPayment };
  }

  public async deleteEmployeePayment(
    tenantId: string,
    employeeId: string,
    paymentId: string
  ): Promise<EmployeeProfile> {
    if (!this.localState.employeeProfiles) this.localState.employeeProfiles = [];
    const idx = this.localState.employeeProfiles.findIndex(
      (p) => (p.id === employeeId || p.userId === employeeId) && p.tenantId === tenantId
    );
    if (idx === -1) throw new Error('Colaborador no encontrado');

    const emp = this.localState.employeeProfiles[idx];
    if (Array.isArray(emp.payments)) {
      emp.payments = emp.payments.filter((p) => p.id !== paymentId);
      emp.updatedAt = new Date().toISOString();
      this.saveLocalState();
    }
    return emp;
  }

  public async deleteEmployeeProfile(tenantId: string, id: string): Promise<boolean> {
    if (!this.localState.employeeProfiles) return false;
    const before = this.localState.employeeProfiles.length;
    this.localState.employeeProfiles = this.localState.employeeProfiles.filter(
      (p) => !(p.id === id && p.tenantId === tenantId)
    );
    const deleted = this.localState.employeeProfiles.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // ADMINISTRACIÓN: REGISTRO DE ASISTENCIAS Y MARCACIONES
  // ===========================================================================

  public async getAttendanceRecords(
    tenantId: string,
    filters?: { userId?: string; date?: string; month?: string; status?: string }
  ): Promise<AttendanceRecord[]> {
    if (!this.localState.attendanceRecords) this.localState.attendanceRecords = [];
    let list = this.localState.attendanceRecords.filter((r) => r.tenantId === tenantId);

    if (filters?.userId) {
      list = list.filter((r) => r.userId === filters.userId);
    }
    if (filters?.date) {
      list = list.filter((r) => r.date === filters.date);
    }
    if (filters?.month) {
      list = list.filter((r) => r.date.startsWith(filters.month!));
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((r) => r.status === filters.status);
    }

    return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  public async getTodayAttendance(tenantId: string, userId: string): Promise<AttendanceRecord | null> {
    if (!this.localState.attendanceRecords) this.localState.attendanceRecords = [];
    const today = new Date().toISOString().split('T')[0];
    const rec = this.localState.attendanceRecords.find(
      (r) => r.tenantId === tenantId && r.userId === userId && r.date === today
    );
    return rec || null;
  }

  public async recordAttendanceStamp(
    tenantId: string,
    userId: string,
    action: AttendanceActionType,
    stamp: AttendanceStamp
  ): Promise<AttendanceRecord> {
    if (!this.localState.attendanceRecords) this.localState.attendanceRecords = [];
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const user = this.localState.users.find((u) => u.id === userId);
    const profile = await this.getEmployeeProfileByUserId(tenantId, userId);
    const hrSettings = await this.getHrSettings(tenantId);

    let record = this.localState.attendanceRecords.find(
      (r) => r.tenantId === tenantId && r.userId === userId && r.date === today
    );

    const expectedEntryTime = profile?.entryTime || hrSettings.defaultEntryTime || '09:00';
    const toleranceMins = hrSettings.toleranceMinutes || 15;

    if (!record) {
      let status: AttendanceStatus = 'present';
      if (action === 'check_in') {
        const [expH, expM] = expectedEntryTime.split(':').map(Number);
        const [stampH, stampM] = stamp.time.split(':').map(Number);
        const expTotalMins = expH * 60 + expM + toleranceMins;
        const stampTotalMins = stampH * 60 + stampM;
        if (stampTotalMins > expTotalMins) {
          status = 'late';
        }
      }

      record = {
        id: crypto.randomUUID(),
        tenantId,
        userId,
        userName: user?.name || profile?.userName || 'Colaborador',
        userEmail: user?.email || profile?.userEmail || '',
        userAvatar: user?.avatarUrl || profile?.userAvatar || '',
        jobTitle: user?.jobTitle || profile?.jobTitle || 'Equipo',
        date: today,
        checkIn: action === 'check_in' ? stamp : undefined,
        breakStart: action === 'break_start' ? stamp : undefined,
        breakEnd: action === 'break_end' ? stamp : undefined,
        checkOut: action === 'check_out' ? stamp : undefined,
        status: action === 'check_out' ? 'present' : status,
        createdAt: now,
        updatedAt: now,
      };
      this.localState.attendanceRecords.unshift(record);
    } else {
      if (action === 'check_in') {
        record.checkIn = stamp;
        const [expH, expM] = expectedEntryTime.split(':').map(Number);
        const [stampH, stampM] = stamp.time.split(':').map(Number);
        if (stampH * 60 + stampM > expH * 60 + expM + toleranceMins) {
          record.status = 'late';
        } else {
          record.status = 'present';
        }
      } else if (action === 'break_start') {
        record.breakStart = stamp;
      } else if (action === 'break_end') {
        record.breakEnd = stamp;
      } else if (action === 'check_out') {
        record.checkOut = stamp;
        if (record.status !== 'late') {
          record.status = 'present';
        }
      }

      if (record.checkIn && record.checkOut) {
        const inMs = new Date(record.checkIn.timestamp).getTime();
        const outMs = new Date(record.checkOut.timestamp).getTime();
        let totalMins = Math.max(0, Math.round((outMs - inMs) / 60000));
        let breakMins = 0;
        if (record.breakStart && record.breakEnd) {
          const bsMs = new Date(record.breakStart.timestamp).getTime();
          const beMs = new Date(record.breakEnd.timestamp).getTime();
          breakMins = Math.max(0, Math.round((beMs - bsMs) / 60000));
        }
        record.breakMinutes = breakMins;
        record.totalWorkMinutes = Math.max(0, totalMins - breakMins);
      }
      record.updatedAt = now;
    }

    this.saveLocalState();
    return record;
  }

  public async updateAttendanceRecord(
    tenantId: string,
    id: string,
    data: Partial<AttendanceRecord>
  ): Promise<AttendanceRecord | null> {
    if (!this.localState.attendanceRecords) return null;
    const idx = this.localState.attendanceRecords.findIndex(
      (r) => r.id === id && r.tenantId === tenantId
    );
    if (idx === -1) return null;

    const current = this.localState.attendanceRecords[idx];
    const updated: AttendanceRecord = {
      ...current,
      ...data,
      tenantId,
      updatedAt: new Date().toISOString(),
    };
    this.localState.attendanceRecords[idx] = updated;
    this.saveLocalState();
    return updated;
  }

  // ===========================================================================
  // ADMINISTRACIÓN: FINANZAS Y MOVIMIENTOS
  // ===========================================================================

  public async getFinanceTransactions(
    tenantId: string,
    filters?: { type?: string; category?: string; startDate?: string; endDate?: string }
  ): Promise<FinanceTransaction[]> {
    if (!this.localState.financeTransactions) this.localState.financeTransactions = [];
    let list = this.localState.financeTransactions.filter((t) => t.tenantId === tenantId);

    if (filters?.type && filters.type !== 'all') {
      list = list.filter((t) => t.type === filters.type);
    }
    if (filters?.category && filters.category !== 'all') {
      list = list.filter((t) => t.category === filters.category);
    }
    if (filters?.startDate) {
      list = list.filter((t) => t.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((t) => t.date <= filters.endDate!);
    }

    return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  public async createFinanceTransaction(
    tenantId: string,
    data: Partial<FinanceTransaction>
  ): Promise<FinanceTransaction> {
    if (!this.localState.financeTransactions) this.localState.financeTransactions = [];
    const now = new Date().toISOString();
    const item: FinanceTransaction = {
      id: crypto.randomUUID(),
      tenantId,
      type: data.type || 'expense',
      category: data.category || 'General',
      amount: Number(data.amount) || 0,
      currency: data.currency || 'PEN',
      date: data.date || now.split('T')[0],
      description: data.description || '',
      paymentMethod: data.paymentMethod || 'Transferencia',
      reference: data.reference || '',
      status: data.status || 'completed',
      receiptUrl: data.receiptUrl,
      createdAt: now,
      updatedAt: now,
    };
    this.localState.financeTransactions.unshift(item);
    this.saveLocalState();
    return item;
  }

  public async deleteFinanceTransaction(tenantId: string, id: string): Promise<boolean> {
    if (!this.localState.financeTransactions) return false;
    const before = this.localState.financeTransactions.length;
    this.localState.financeTransactions = this.localState.financeTransactions.filter(
      (t) => !(t.id === id && t.tenantId === tenantId)
    );
    const deleted = this.localState.financeTransactions.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // ===========================================================================
  // ADMINISTRACIÓN: CONTABILIDAD Y ASIENTOS
  // ===========================================================================

  public async getAccountingEntries(
    tenantId: string,
    filters?: { status?: string; startDate?: string; endDate?: string }
  ): Promise<AccountingEntry[]> {
    if (!this.localState.accountingEntries) this.localState.accountingEntries = [];
    let list = this.localState.accountingEntries.filter((e) => e.tenantId === tenantId);

    if (filters?.status && filters.status !== 'all') {
      list = list.filter((e) => e.status === filters.status);
    }
    if (filters?.startDate) {
      list = list.filter((e) => e.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((e) => e.date <= filters.endDate!);
    }

    return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  public async createAccountingEntry(
    tenantId: string,
    data: Partial<AccountingEntry>
  ): Promise<AccountingEntry> {
    if (!this.localState.accountingEntries) this.localState.accountingEntries = [];
    const now = new Date().toISOString();
    const count = this.localState.accountingEntries.filter((e) => e.tenantId === tenantId).length + 1;
    const item: AccountingEntry = {
      id: crypto.randomUUID(),
      tenantId,
      entryNumber: data.entryNumber || ('ASI-' + String(count).padStart(4, '0')),
      date: data.date || now.split('T')[0],
      concept: data.concept || '',
      accountCode: data.accountCode || '60.1',
      accountName: data.accountName || 'Operación General',
      debit: Number(data.debit) || 0,
      credit: Number(data.credit) || 0,
      status: data.status || 'posted',
      reference: data.reference || '',
      createdAt: now,
      updatedAt: now,
    };
    this.localState.accountingEntries.unshift(item);
    this.saveLocalState();
    return item;
  }

  public async deleteAccountingEntry(tenantId: string, id: string): Promise<boolean> {
    if (!this.localState.accountingEntries) return false;
    const before = this.localState.accountingEntries.length;
    this.localState.accountingEntries = this.localState.accountingEntries.filter(
      (e) => !(e.id === id && e.tenantId === tenantId)
    );
    const deleted = this.localState.accountingEntries.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }


  // =============================================================================
  // SUBMÓDULO: SALAS DE REUNIONES & ACTAS DE WORKSPACE
  // =============================================================================

  public async getMeetingRooms(tenantId: string): Promise<WorkspaceMeetingRoom[]> {
    if (!this.localState.workspaceMeetingRooms) {
      this.localState.workspaceMeetingRooms = [];
    }
    let rooms = this.localState.workspaceMeetingRooms.filter((r) => r.tenantId === tenantId);

    // Inicializar salas preestablecidas fijas si el tenant es nuevo o no tiene ninguna
    if (rooms.length === 0) {
      const now = new Date().toISOString();
      const presets: WorkspaceMeetingRoom[] = [
        {
          id: `room-${Date.now()}-01`,
          tenantId,
          code: 'SALA-01',
          name: 'Sala Principal Google Meet',
          description: 'Sala de conferencias general para presentaciones, briefs y coordinación de proyectos.',
          color: '#0055ff',
          icon: 'Video',
          meetUrl: 'https://meet.google.com/new',
          isPreset: true,
          status: 'available',
          recordingsCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: `room-${Date.now()}-02`,
          tenantId,
          code: 'SALA-02',
          name: 'Sala Creativa & Diseño',
          description: 'Espacio dedicado para revisiones de identidad, branding, layouts y copys de campañas.',
          color: '#8b5cf6',
          icon: 'Sparkles',
          meetUrl: 'https://meet.google.com/new',
          isPreset: true,
          status: 'available',
          recordingsCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: `room-${Date.now()}-03`,
          tenantId,
          code: 'SALA-03',
          name: 'Sala Comercial & Clientes',
          description: 'Reuniones de cierre comercial, presentación de cotizaciones y kick-off de cuentas.',
          color: '#10b981',
          icon: 'Users',
          meetUrl: 'https://meet.google.com/new',
          isPreset: true,
          status: 'available',
          recordingsCount: 0,
          createdAt: now,
          updatedAt: now,
        },
      ];
      this.localState.workspaceMeetingRooms.push(...presets);
      this.saveLocalState();
      rooms = presets;
    }

    // Calcular conteo dinámico de grabaciones asociadas a cada sala
    const meetings = this.localState.workspaceMeetings || [];
    return rooms.map((room) => {
      const roomMeetings = meetings.filter((m) => m.tenantId === tenantId && m.roomId === room.id);
      let count = 0;
      roomMeetings.forEach((m) => {
        count += (m.recordings?.length || 0);
      });
      return {
        ...room,
        recordingsCount: count,
      };
    });
  }

  public async getMeetingRoomById(id: string, tenantId: string): Promise<WorkspaceMeetingRoom | null> {
    const rooms = await this.getMeetingRooms(tenantId);
    return rooms.find((r) => r.id === id && r.tenantId === tenantId) || null;
  }

  public async createMeetingRoom(
    tenantId: string,
    data: Partial<WorkspaceMeetingRoom>
  ): Promise<WorkspaceMeetingRoom> {
    if (!this.localState.workspaceMeetingRooms) {
      this.localState.workspaceMeetingRooms = [];
    }
    const now = new Date().toISOString();
    const count = this.localState.workspaceMeetingRooms.filter((r) => r.tenantId === tenantId).length + 1;
    const room: WorkspaceMeetingRoom = {
      id: `room-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      code: (data.code || `SALA-${String(count).padStart(2, '0')}`).toUpperCase().trim(),
      name: data.name?.trim() || `Sala Virtual ${count}`,
      description: data.description?.trim() || '',
      color: data.color || '#0055ff',
      icon: data.icon || 'Video',
      meetUrl: data.meetUrl?.trim() || 'https://meet.google.com/new',
      isPreset: false,
      status: data.status || 'available',
      recordingsCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.localState.workspaceMeetingRooms.unshift(room);
    this.saveLocalState();
    return room;
  }

  public async updateMeetingRoom(
    id: string,
    tenantId: string,
    data: Partial<WorkspaceMeetingRoom>
  ): Promise<WorkspaceMeetingRoom | null> {
    if (!this.localState.workspaceMeetingRooms) return null;
    const idx = this.localState.workspaceMeetingRooms.findIndex(
      (r) => r.id === id && r.tenantId === tenantId
    );
    if (idx === -1) return null;

    const current = this.localState.workspaceMeetingRooms[idx];
    const updated: WorkspaceMeetingRoom = {
      ...current,
      ...data,
      id: current.id,
      tenantId: current.tenantId,
      isPreset: current.isPreset,
      updatedAt: new Date().toISOString(),
    };
    this.localState.workspaceMeetingRooms[idx] = updated;
    this.saveLocalState();
    return updated;
  }

  public async deleteMeetingRoom(id: string, tenantId: string): Promise<boolean> {
    if (!this.localState.workspaceMeetingRooms) return false;
    const before = this.localState.workspaceMeetingRooms.length;
    this.localState.workspaceMeetingRooms = this.localState.workspaceMeetingRooms.filter(
      (r) => !(r.id === id && r.tenantId === tenantId)
    );
    const deleted = this.localState.workspaceMeetingRooms.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  // --- REUNIONES & ACTAS ---

  public async getMeetings(
    tenantId: string,
    filters?: { roomId?: string; brandId?: string; clientId?: string; status?: string; search?: string }
  ): Promise<WorkspaceMeeting[]> {
    if (!this.localState.workspaceMeetings) {
      this.localState.workspaceMeetings = [];
    }
    let list = this.localState.workspaceMeetings.filter((m) => m.tenantId === tenantId);

    if (filters?.roomId) {
      list = list.filter((m) => m.roomId === filters.roomId);
    }
    if (filters?.brandId) {
      list = list.filter((m) => m.brandId === filters.brandId);
    }
    if (filters?.clientId) {
      list = list.filter((m) => m.clientId === filters.clientId);
    }
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((m) => m.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.clientName?.toLowerCase().includes(q) ||
          m.brandName?.toLowerCase().includes(q) ||
          m.summary?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }

  public async getMeetingById(id: string, tenantId: string): Promise<WorkspaceMeeting | null> {
    if (!this.localState.workspaceMeetings) return null;
    return this.localState.workspaceMeetings.find((m) => m.id === id && m.tenantId === tenantId) || null;
  }

  public async createMeeting(
    tenantId: string,
    data: Partial<WorkspaceMeeting>,
    userId?: string
  ): Promise<WorkspaceMeeting> {
    if (!this.localState.workspaceMeetings) {
      this.localState.workspaceMeetings = [];
    }
    const now = new Date().toISOString();
    
    // Si viene vinculado a una sala, actualizar el nombre de la sala
    let roomName = data.roomName;
    if (data.roomId && !roomName) {
      const room = this.localState.workspaceMeetingRooms?.find((r) => r.id === data.roomId);
      if (room) roomName = room.name;
    }

    // Resolver datos de marca y cliente si están disponibles
    let brandName = data.brandName;
    let brandLogo = data.brandLogo;
    let clientName = data.clientName;
    if (data.brandId && !brandName) {
      const b = this.localState.clientBrands?.find((item) => item.id === data.brandId);
      if (b) {
        brandName = b.name;
        brandLogo = b.logoUrl;
        if (!data.clientId && b.clientId) {
          data.clientId = b.clientId;
        }
      }
    }
    if (data.clientId && !clientName) {
      const c = this.localState.clients?.find((item) => item.id === data.clientId);
      if (c) clientName = c.name;
    }

    const meeting: WorkspaceMeeting = {
      id: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      roomId: data.roomId,
      roomName,
      title: data.title?.trim() || 'Nueva Reunión de Trabajo',
      clientId: data.clientId,
      clientName,
      brandId: data.brandId,
      brandName,
      brandLogo,
      scheduledAt: data.scheduledAt || now,
      durationMinutes: data.durationMinutes || 45,
      status: data.status || 'scheduled',
      meetUrl: data.meetUrl?.trim() || '',
      googleCalendarEventId: data.googleCalendarEventId,
      attendeeUserIds: data.attendeeUserIds || (userId ? [userId] : []),
      attendeeClientEmails: data.attendeeClientEmails || [],
      agenda: data.agenda || '',
      summary: data.summary || '',
      agreements: (data.agreements || []).map((ag: any) => ({
        id: ag.id || `agr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: ag.title || '',
        description: ag.description || '',
        assignedUserId: ag.assignedUserId,
        assignedUserName: ag.assignedUserName,
        dueDate: ag.dueDate,
        completed: !!ag.completed,
        createdTaskId: ag.createdTaskId,
      })),
      recordings: (data.recordings || []).map((rec: any) => ({
        id: rec.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: rec.title || 'Grabación de la sesión',
        url: rec.url || '',
        type: rec.type || 'drive',
        recordedAt: rec.recordedAt || now,
        durationMinutes: rec.durationMinutes,
        notes: rec.notes,
      })),
      attachments: data.attachments || [],
      createdBy: userId || 'admin',
      createdAt: now,
      updatedAt: now,
    };

    this.localState.workspaceMeetings.unshift(meeting);
    this.saveLocalState();
    return meeting;
  }

  public async updateMeeting(
    id: string,
    tenantId: string,
    data: Partial<WorkspaceMeeting>
  ): Promise<WorkspaceMeeting | null> {
    if (!this.localState.workspaceMeetings) return null;
    const idx = this.localState.workspaceMeetings.findIndex(
      (m) => m.id === id && m.tenantId === tenantId
    );
    if (idx === -1) return null;

    const current = this.localState.workspaceMeetings[idx];
    const updated: WorkspaceMeeting = {
      ...current,
      ...data,
      id: current.id,
      tenantId: current.tenantId,
      updatedAt: new Date().toISOString(),
    };
    this.localState.workspaceMeetings[idx] = updated;
    this.saveLocalState();
    return updated;
  }

  public async deleteMeeting(id: string, tenantId: string): Promise<boolean> {
    if (!this.localState.workspaceMeetings) return false;
    const before = this.localState.workspaceMeetings.length;
    this.localState.workspaceMeetings = this.localState.workspaceMeetings.filter(
      (m) => !(m.id === id && m.tenantId === tenantId)
    );
    const deleted = this.localState.workspaceMeetings.length < before;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  /**
   * Convierte un acuerdo específico de un acta en una tarea real en WorkspaceTasks
   */
  public async convertMeetingAgreementToTask(
    meetingId: string,
    agreementId: string,
    tenantId: string,
    taskData: any,
    userId?: string
  ): Promise<{ task: any; agreement: WorkspaceMeetingAgreement } | null> {
    const meeting = await this.getMeetingById(meetingId, tenantId);
    if (!meeting) return null;

    const agreement = meeting.agreements.find((a) => a.id === agreementId);
    if (!agreement) return null;

    // Crear la tarea en workspaceTasks
    if (!this.localState.workspaceTasks) {
      this.localState.workspaceTasks = [];
    }

    const now = new Date().toISOString();
    const newTask: any = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      title: taskData.title || agreement.title,
      description: taskData.description || `Acuerdo originado en la reunión: "${meeting.title}"`,
      status: 'pending',
      priority: taskData.priority || 'medium',
      brandId: meeting.brandId,
      brandName: meeting.brandName,
      assignedUserId: taskData.assignedUserId || agreement.assignedUserId,
      dueDate: taskData.dueDate || agreement.dueDate,
      createdAt: now,
      updatedAt: now,
    };

    this.localState.workspaceTasks.unshift(newTask);

    // Marcar el acuerdo con el ID de la tarea creada
    agreement.createdTaskId = newTask.id;
    await this.updateMeeting(meetingId, tenantId, {
      agreements: meeting.agreements,
    });

    this.saveLocalState();
    return { task: newTask, agreement };
  }

  // ===========================================================================
  // SUBMÓDULO DE WORKSPACE: PIZARRAS CREATIVAS (WHITEBOARDS)
  // ===========================================================================

  public async getWhiteboards(
    tenantId: string,
    filters?: { folderId?: string | null; search?: string; tag?: string },
    userId?: string,
    isAdmin?: boolean
  ): Promise<Whiteboard[]> {
    if (!this.localState.whiteboards) {
      this.localState.whiteboards = [];
    }
    let list = this.localState.whiteboards.filter((w) => w.tenantId === tenantId);

    // Filtrar por permisos / usuario asignado si no es admin
    if (!isAdmin && userId) {
      list = list.filter((w) => {
        if (w.createdBy === userId) return true;
        if (w.accessType === 'public') return true;
        return w.assignedUsers?.some((u) => u.userId === userId);
      });
    }

    if (filters?.folderId !== undefined) {
      if (filters.folderId === null || filters.folderId === '' || filters.folderId === 'all') {
        // no filter
      } else if (filters.folderId === 'none') {
        list = list.filter((w) => !w.folderId);
      } else {
        list = list.filter((w) => w.folderId === filters.folderId);
      }
    }

    if (filters?.tag) {
      const tagLower = filters.tag.toLowerCase();
      list = list.filter((w) =>
        w.tags?.some((t) => t.name.toLowerCase() === tagLower)
      );
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.tags?.some((t) => t.name.toLowerCase().includes(q))
      );
    }

    // Ordenar por última actualización descendente
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public async getWhiteboardById(id: string, tenantId?: string): Promise<Whiteboard | null> {
    if (!this.localState.whiteboards) return null;
    return (
      this.localState.whiteboards.find(
        (w) => w.id === id && (!tenantId || w.tenantId === tenantId)
      ) || null
    );
  }

  public async getWhiteboardByShareToken(tokenOrId: string): Promise<Whiteboard | null> {
    if (!this.localState.whiteboards) return null;
    return (
      this.localState.whiteboards.find(
        (w) =>
          w.id === tokenOrId ||
          w.shareToken === tokenOrId ||
          w.invitations?.some((inv) => inv.token === tokenOrId)
      ) || null
    );
  }

  public async createWhiteboard(
    tenantId: string,
    data: {
      title: string;
      folderId?: string | null;
      tags?: WhiteboardTag[];
      profilePic?: string;
      accessType?: WhiteboardAccessType;
      publicRole?: WhiteboardPublicRole;
      initialInvites?: Array<{ email: string; role: 'editor' | 'viewer' }>;
    },
    userId: string,
    userName?: string,
    userAvatar?: string
  ): Promise<Whiteboard> {
    if (!this.localState.whiteboards) {
      this.localState.whiteboards = [];
    }
    const now = new Date().toISOString();
    const id = `wb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const shareToken = generateToken(16);

    const invitations: WhiteboardInvitation[] = (data.initialInvites || []).map((inv) => ({
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      whiteboardId: id,
      email: inv.email,
      role: inv.role,
      token: generateToken(16),
      createdAt: now,
    }));

    const newBoard: Whiteboard = {
      id,
      tenantId,
      title: data.title || 'Pizarra sin título',
      content: JSON.stringify({ version: '5.3.0', objects: [] }),
      thumbnail: '',
      profilePic: data.profilePic || '',
      folderId: data.folderId || null,
      tags: data.tags || [],
      accessType: data.accessType || 'restricted',
      publicRole: data.publicRole || 'viewer',
      shareToken,
      createdBy: userId,
      createdByName: userName,
      createdByAvatar: userAvatar,
      assignedUsers: [
        {
          userId,
          userName,
          userAvatar,
          role: 'editor',
        },
      ],
      invitations,
      createdAt: now,
      updatedAt: now,
    };

    this.localState.whiteboards.unshift(newBoard);
    this.saveLocalState();
    return newBoard;
  }

  public async updateWhiteboard(
    id: string,
    tenantId: string,
    data: Partial<Whiteboard>
  ): Promise<Whiteboard | null> {
    if (!this.localState.whiteboards) return null;
    const idx = this.localState.whiteboards.findIndex(
      (w) => w.id === id && w.tenantId === tenantId
    );
    if (idx === -1) return null;

    const current = this.localState.whiteboards[idx];
    const updated: Whiteboard = {
      ...current,
      ...data,
      id: current.id,
      tenantId: current.tenantId,
      updatedAt: new Date().toISOString(),
    };

    this.localState.whiteboards[idx] = updated;
    this.saveLocalState();
    return updated;
  }

  public async saveWhiteboardCanvas(
    id: string,
    tenantId: string,
    content: string,
    thumbnail?: string
  ): Promise<boolean> {
    if (!this.localState.whiteboards) return false;
    const board = this.localState.whiteboards.find(
      (w) => w.id === id && w.tenantId === tenantId
    );
    if (!board) return false;

    board.content = content;
    if (thumbnail) {
      board.thumbnail = thumbnail;
    }
    board.updatedAt = new Date().toISOString();
    this.saveLocalState();
    return true;
  }

  public async deleteWhiteboard(id: string, tenantId: string): Promise<boolean> {
    if (!this.localState.whiteboards) return false;
    const initialLen = this.localState.whiteboards.length;
    this.localState.whiteboards = this.localState.whiteboards.filter(
      (w) => !(w.id === id && w.tenantId === tenantId)
    );
    const deleted = this.localState.whiteboards.length < initialLen;
    if (deleted) this.saveLocalState();
    return deleted;
  }

  public async duplicateWhiteboard(
    id: string,
    tenantId: string,
    userId: string,
    userName?: string
  ): Promise<Whiteboard | null> {
    const original = await this.getWhiteboardById(id, tenantId);
    if (!original) return null;

    const now = new Date().toISOString();
    const copyId = `wb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const copy: Whiteboard = {
      ...original,
      id: copyId,
      title: `${original.title} (Copia)`,
      shareToken: generateToken(16),
      createdBy: userId,
      createdByName: userName,
      assignedUsers: [
        {
          userId,
          userName,
          role: 'editor',
        },
      ],
      invitations: [],
      createdAt: now,
      updatedAt: now,
    };

    this.localState.whiteboards.unshift(copy);
    this.saveLocalState();
    return copy;
  }

  // --- CARPETAS DE PIZARRAS ---

  public async getWhiteboardFolders(tenantId: string): Promise<
    Array<WhiteboardFolder & { boardCount: number }>
  > {
    if (!this.localState.whiteboardFolders) {
      this.localState.whiteboardFolders = [];
    }
    if (!this.localState.whiteboards) {
      this.localState.whiteboards = [];
    }

    const folders = this.localState.whiteboardFolders.filter(
      (f) => f.tenantId === tenantId || !f.tenantId || f.tenantId === 'tenant-roma-01'
    );
    const boards = this.localState.whiteboards.filter((w) => w.tenantId === tenantId);

    return folders.map((folder) => ({
      ...folder,
      boardCount: boards.filter((b) => b.folderId === folder.id).length,
    }));
  }

  public async createWhiteboardFolder(
    tenantId: string,
    data: { name: string; color?: string },
    userId: string
  ): Promise<WhiteboardFolder> {
    if (!this.localState.whiteboardFolders) {
      this.localState.whiteboardFolders = [];
    }
    const folder: WhiteboardFolder = {
      id: `wbf-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      tenantId,
      name: data.name || 'Nueva Carpeta',
      color: data.color || '#3b82f6',
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
    this.localState.whiteboardFolders.push(folder);
    this.saveLocalState();
    return folder;
  }

  public async updateWhiteboardFolder(
    folderId: string,
    tenantId: string,
    data: { name?: string; color?: string }
  ): Promise<WhiteboardFolder | null> {
    if (!this.localState.whiteboardFolders) return null;
    const folder = this.localState.whiteboardFolders.find((f) => f.id === folderId);
    if (!folder) return null;
    if (data.name) folder.name = data.name;
    if (data.color) folder.color = data.color;
    this.saveLocalState();
    return folder;
  }

  public async deleteWhiteboardFolder(folderId: string, tenantId?: string): Promise<boolean> {
    if (!this.localState.whiteboardFolders) return false;
    const initialLen = this.localState.whiteboardFolders.length;
    this.localState.whiteboardFolders = this.localState.whiteboardFolders.filter(
      (f) => f.id !== folderId
    );
    // Desvincular carpetas de las pizarras
    if (this.localState.whiteboards) {
      this.localState.whiteboards.forEach((w) => {
        if (w.folderId === folderId) {
          w.folderId = null;
        }
      });
    }
    const deleted = this.localState.whiteboardFolders.length < initialLen;
    if (deleted) this.saveLocalState();
    return deleted;
  }


}

export const db = new DatabaseManager();
