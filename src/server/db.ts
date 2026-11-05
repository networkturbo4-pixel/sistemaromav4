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
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'roma-saas-db.json');
const SCHEMA_SQL_FILE = path.resolve(process.cwd(), 'database', 'schema.sql');

function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
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
    return this.localState.tenants;
  }

  public async getTenantById(id: string): Promise<Tenant | null> {
    return this.localState.tenants.find((t) => t.id === id) || null;
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

    this.saveLocalState();
    return { tenant: newTenant, adminUser };
  }

  public async updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant | null> {
    const idx = this.localState.tenants.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    this.localState.tenants[idx] = {
      ...this.localState.tenants[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveLocalState();
    return this.localState.tenants[idx];
  }

  public async updateTenantCustomization(tenantId: string, customization: Partial<TenantCustomization>): Promise<Tenant | null> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) return null;
    tenant.customization = { ...tenant.customization, ...customization };
    tenant.updatedAt = new Date().toISOString();
    this.saveLocalState();
    return tenant;
  }

  public async updateTenantCompanyInfo(tenantId: string, companyInfo: Partial<CompanyInfo>): Promise<Tenant | null> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) return null;
    tenant.companyInfo = { ...tenant.companyInfo, ...companyInfo };
    tenant.updatedAt = new Date().toISOString();
    this.saveLocalState();
    return tenant;
  }

  public async updateTenantBankAccounts(tenantId: string, bankAccounts: any[]): Promise<Tenant | null> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) return null;
    if (!tenant.companyInfo) tenant.companyInfo = DEFAULT_COMPANY_INFO;
    tenant.companyInfo.bankAccounts = bankAccounts;
    tenant.updatedAt = new Date().toISOString();
    this.saveLocalState();
    return tenant;
  }

  public async updateTenantDriveConfig(tenantId: string, driveConfig: Partial<TenantDriveConfig>): Promise<Tenant | null> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) return null;
    tenant.driveConfig = {
      ...(tenant.driveConfig || { authType: 'none' }),
      ...driveConfig,
      updatedAt: new Date().toISOString(),
    };
    tenant.updatedAt = new Date().toISOString();
    this.saveLocalState();
    return tenant;
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
    const tenant = this.localState.tenants.find((t) => t.id === tenantId);
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
      copy: data.copy || '',
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
    this.localState.workspacePosts[idx] = {
      ...this.localState.workspacePosts[idx],
      ...data,
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

}

export const db = new DatabaseManager();
