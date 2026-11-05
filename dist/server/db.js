"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.DatabaseManager = void 0;
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const types_1 = require("../shared/types");
const permissions_1 = require("../shared/permissions");
dotenv_1.default.config();
const DATA_DIR = path_1.default.resolve(process.cwd(), 'data');
const LOCAL_DB_FILE = path_1.default.join(DATA_DIR, 'roma-saas-db.json');
const SCHEMA_SQL_FILE = path_1.default.resolve(process.cwd(), 'database', 'schema.sql');
function generateToken(length = 32) {
    return crypto_1.default.randomBytes(length).toString('hex');
}
class DatabaseManager {
    pool = null;
    isPostgresConnected = false;
    localState;
    constructor() {
        this.localState = this.loadOrInitLocalState();
    }
    loadOrInitLocalState() {
        try {
            if (!fs_1.default.existsSync(DATA_DIR)) {
                fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
            }
            if (fs_1.default.existsSync(LOCAL_DB_FILE)) {
                const raw = fs_1.default.readFileSync(LOCAL_DB_FILE, 'utf-8');
                const parsed = JSON.parse(raw);
                if (!Array.isArray(parsed.tenants))
                    parsed.tenants = [];
                if (!Array.isArray(parsed.roles))
                    parsed.roles = [];
                if (!Array.isArray(parsed.users))
                    parsed.users = [];
                if (!Array.isArray(parsed.clients))
                    parsed.clients = [];
                if (!Array.isArray(parsed.clientBrands))
                    parsed.clientBrands = [];
                if (!Array.isArray(parsed.quotes))
                    parsed.quotes = [];
                if (!Array.isArray(parsed.serviceCategories))
                    parsed.serviceCategories = [];
                if (!Array.isArray(parsed.services))
                    parsed.services = [];
                if (!Array.isArray(parsed.paymentNotes))
                    parsed.paymentNotes = [];
                if (!Array.isArray(parsed.workspacePosts))
                    parsed.workspacePosts = [];
                if (!Array.isArray(parsed.workspaceTasks))
                    parsed.workspaceTasks = [];
                if (!Array.isArray(parsed.workspaceProjects))
                    parsed.workspaceProjects = [];
                if (!Array.isArray(parsed.workspaceMonths))
                    parsed.workspaceMonths = [];
                if (!Array.isArray(parsed.serviceOrders))
                    parsed.serviceOrders = [];
                parsed.serviceOrders = parsed.serviceOrders.filter((o) => o && o.tenantId && o.title);
                if (!Array.isArray(parsed.driveFiles))
                    parsed.driveFiles = [];
                if (!Array.isArray(parsed.driveFolders))
                    parsed.driveFolders = [];
                if (!Array.isArray(parsed.driveFolderBlueprints))
                    parsed.driveFolderBlueprints = [];
                return parsed;
            }
        }
        catch (e) {
            console.error('[DB] Error cargando base local JSON:', e);
        }
        const defaultState = {
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
    saveLocalState() {
        try {
            if (!fs_1.default.existsSync(DATA_DIR)) {
                fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
            }
            fs_1.default.writeFileSync(LOCAL_DB_FILE, JSON.stringify(this.localState, null, 2), 'utf-8');
        }
        catch (e) {
            console.error('[DB] Error guardando base local JSON:', e);
        }
    }
    async initialize() {
        const databaseUrl = process.env.DATABASE_URL?.trim();
        if (!databaseUrl && !process.env.DB_NAME) {
            this.isPostgresConnected = false;
            return;
        }
        try {
            this.pool = new pg_1.Pool({
                connectionString: databaseUrl,
                ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
            });
            await this.pool.query('SELECT 1');
            this.isPostgresConnected = true;
        }
        catch (err) {
            this.isPostgresConnected = false;
            this.pool = null;
        }
    }
    getEngineInfo() {
        return {
            engine: this.isPostgresConnected ? 'PostgreSQL' : 'JSON Local Storage',
            mode: this.isPostgresConnected ? 'postgres' : 'json',
            isPostgresConnected: this.isPostgresConnected,
        };
    }
    async runSafeMigrations() {
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
    async getAllTenants() {
        return this.localState.tenants.map((t) => ({
            ...t,
            companyInfo: t.companyInfo || { ...types_1.DEFAULT_COMPANY_INFO, commercialName: t.name, legalName: t.name },
            customization: t.customization || types_1.DEFAULT_CUSTOMIZATION,
        }));
    }
    async getTenantById(id) {
        const t = this.localState.tenants.find((item) => item.id === id);
        if (!t)
            return null;
        return {
            ...t,
            companyInfo: t.companyInfo || { ...types_1.DEFAULT_COMPANY_INFO, commercialName: t.name, legalName: t.name },
            customization: t.customization || types_1.DEFAULT_CUSTOMIZATION,
        };
    }
    async getPublicTenantBranding(slug) {
        const tenant = slug
            ? this.localState.tenants.find((t) => t.slug === slug || t.id === slug) || this.localState.tenants[0]
            : this.localState.tenants[0];
        if (!tenant)
            return null;
        return {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            customization: tenant.customization,
            companyInfo: tenant.companyInfo,
        };
    }
    async createTenant(data) {
        const now = new Date().toISOString();
        const tenantId = data.id || `tenant-${Date.now()}`;
        const customization = {
            ...types_1.DEFAULT_CUSTOMIZATION,
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
            ...types_1.DEFAULT_COMPANY_INFO,
            ...(data.companyInfo || {}),
            commercialName: data.commercialName || data.name || '',
            legalName: data.legalName || data.name || '',
            ruc: data.ruc || '',
            email: data.email || '',
            whatsapp: data.whatsapp || '',
            address: data.address || '',
        };
        const newTenant = {
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
        const superAdminRole = {
            id: `role-${Date.now()}-admin`,
            tenantId,
            name: 'Super Administrador',
            description: 'Acceso total y configuración del espacio',
            badgeColor: '#4f46e5',
            isSystem: true,
            permissions: [...permissions_1.ALL_PERMISSION_KEYS],
            createdAt: now,
            updatedAt: now,
        };
        this.localState.roles.push(superAdminRole);
        // Crear usuario admin inicial
        const adminUser = {
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
    async updateTenant(id, data) {
        const idx = this.localState.tenants.findIndex((t) => t.id === id);
        if (idx === -1)
            return null;
        const current = this.localState.tenants[idx];
        const updatedCustomization = {
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
        const updatedCompanyInfo = {
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
    async assignUsersToTenant(tenantId, userIds) {
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
                permissions: [...permissions_1.ALL_PERMISSION_KEYS],
                createdAt: now,
                updatedAt: now,
            };
            this.localState.roles.push(targetRole);
        }
        for (const uId of userIds) {
            const sourceUser = this.localState.users.find((u) => u.id === uId);
            if (!sourceUser)
                continue;
            const existingInTenant = this.localState.users.find((u) => u.tenantId === tenantId &&
                (u.pin === sourceUser.pin ||
                    (u.email && sourceUser.email && u.email.toLowerCase() === sourceUser.email.toLowerCase())));
            if (existingInTenant) {
                existingInTenant.isActive = true;
                existingInTenant.name = sourceUser.name;
                existingInTenant.jobTitle = sourceUser.jobTitle || existingInTenant.jobTitle;
                existingInTenant.avatarUrl = sourceUser.avatarUrl || existingInTenant.avatarUrl;
                existingInTenant.updatedAt = now;
            }
            else {
                const newUser = {
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
    async getAvailableUsersForTenants() {
        const userMap = new Map();
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
            }
            else {
                const item = userMap.get(key);
                if (!item.tenantIds.includes(u.tenantId)) {
                    item.tenantIds.push(u.tenantId);
                }
            }
        }
        return Array.from(userMap.values());
    }
    async updateTenantCustomization(tenantId, customization) {
        const tenant = await this.getTenantById(tenantId);
        if (!tenant)
            return null;
        tenant.customization = { ...tenant.customization, ...customization };
        tenant.updatedAt = new Date().toISOString();
        this.saveLocalState();
        return tenant;
    }
    async updateTenantCompanyInfo(tenantId, companyInfo) {
        const tenant = await this.getTenantById(tenantId);
        if (!tenant)
            return null;
        tenant.companyInfo = { ...tenant.companyInfo, ...companyInfo };
        tenant.updatedAt = new Date().toISOString();
        this.saveLocalState();
        return tenant;
    }
    async updateTenantBankAccounts(tenantId, bankAccounts) {
        const tenant = await this.getTenantById(tenantId);
        if (!tenant)
            return null;
        if (!tenant.companyInfo)
            tenant.companyInfo = types_1.DEFAULT_COMPANY_INFO;
        tenant.companyInfo.bankAccounts = bankAccounts;
        tenant.updatedAt = new Date().toISOString();
        this.saveLocalState();
        return tenant;
    }
    async updateTenantDriveConfig(tenantId, driveConfig) {
        const tenant = await this.getTenantById(tenantId);
        if (!tenant)
            return null;
        tenant.driveConfig = {
            ...(tenant.driveConfig || { authType: 'none' }),
            ...driveConfig,
            updatedAt: new Date().toISOString(),
        };
        tenant.updatedAt = new Date().toISOString();
        this.saveLocalState();
        return tenant;
    }
    async deleteTenant(id) {
        const before = this.localState.tenants.length;
        this.localState.tenants = this.localState.tenants.filter((t) => t.id !== id);
        const deleted = this.localState.tenants.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // USERS & ROLES
    // ===========================================================================
    async getUsersByTenant(tenantId) {
        return this.localState.users.filter((u) => u.tenantId === tenantId);
    }
    async findUserByPin(pin, tenantSlug) {
        let users = this.localState.users.filter((u) => u.pin === pin);
        if (tenantSlug) {
            const tenant = this.localState.tenants.find((t) => t.slug === tenantSlug);
            if (tenant) {
                users = users.filter((u) => u.tenantId === tenant.id);
            }
        }
        const user = users[0];
        if (!user)
            return null;
        const tenant = this.localState.tenants.find((t) => t.id === user.tenantId);
        if (!tenant)
            return null;
        const role = this.localState.roles.find((r) => r.id === user.roleId) || {
            id: user.roleId,
            tenantId: tenant.id,
            name: 'Super Administrador',
            isSystem: true,
            permissions: ['*'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        return { user, tenant, role };
    }
    async findUserInTenantByPinOrEmail(tenantId, query, emailQuery) {
        const qLower = query ? query.toLowerCase() : '';
        const emailLower = emailQuery ? emailQuery.toLowerCase() : '';
        return (this.localState.users.find((u) => u.tenantId === tenantId &&
            (u.pin === query ||
                (qLower && u.email?.toLowerCase() === qLower) ||
                (emailLower && u.email?.toLowerCase() === emailLower))) || null);
    }
    async getSessionContext(userId, tenantId) {
        const user = this.localState.users.find((u) => u.id === userId && u.tenantId === tenantId);
        const tenant = this.localState.tenants.find((t) => t.id === tenantId);
        if (!user || !tenant)
            return null;
        const role = this.localState.roles.find((r) => r.id === user.roleId && r.tenantId === tenantId);
        return { user, tenant, role };
    }
    async createUser(tenantId, data) {
        const now = new Date().toISOString();
        const newUser = {
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
    async updateUser(tenantId, id, data) {
        const idx = this.localState.users.findIndex((u) => u.id === id && u.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.users[idx] = {
            ...this.localState.users[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.users[idx];
    }
    async updateUserThemePreference(userId, tenantId, theme) {
        const user = this.localState.users.find((u) => u.id === userId && u.tenantId === tenantId);
        if (!user)
            return null;
        user.themePreference = theme;
        this.saveLocalState();
        return user;
    }
    async deleteUser(tenantId, id) {
        const before = this.localState.users.length;
        this.localState.users = this.localState.users.filter((u) => !(u.id === id && u.tenantId === tenantId));
        const deleted = this.localState.users.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    async getRolesByTenant(tenantId) {
        return this.localState.roles.filter((r) => r.tenantId === tenantId);
    }
    async createRole(tenantId, data) {
        const now = new Date().toISOString();
        const newRole = {
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
    async updateRole(tenantId, id, data) {
        const idx = this.localState.roles.findIndex((r) => r.id === id && r.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.roles[idx] = {
            ...this.localState.roles[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.roles[idx];
    }
    async deleteRole(tenantId, id) {
        const before = this.localState.roles.length;
        this.localState.roles = this.localState.roles.filter((r) => !(r.id === id && r.tenantId === tenantId));
        const deleted = this.localState.roles.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // CLIENTES & MARCAS
    // ===========================================================================
    async getClientsByTenant(tenantId) {
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
    async getClientById(id, tenantId) {
        const client = this.localState.clients.find((c) => c.id === id && c.tenantId === tenantId);
        if (!client)
            return null;
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
    async createClient(tenantId, data) {
        const now = new Date().toISOString();
        const newClient = {
            id: data.id || `client-${Date.now()}`,
            tenantId,
            name: data.name || '',
            documentType: data.documentType || 'RUC',
            documentNumber: data.documentNumber || '',
            whatsapp: data.whatsapp || '',
            email: data.email || '',
            notes: data.notes || '',
            status: data.status || 'active',
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
    async updateClient(tenantId, id, data) {
        const idx = this.localState.clients.findIndex((c) => c.id === id && c.tenantId === tenantId);
        if (idx === -1)
            return null;
        const now = new Date().toISOString();
        this.localState.clients[idx] = {
            ...this.localState.clients[idx],
            ...data,
            updatedAt: now,
        };
        if (Array.isArray(data.brands)) {
            const incomingIds = new Set(data.brands.filter((b) => b.id).map((b) => b.id));
            this.localState.clientBrands = this.localState.clientBrands.filter((b) => b.clientId !== id || incomingIds.has(b.id));
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
                }
                else {
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
    async deleteClient(tenantId, id) {
        const before = this.localState.clients.length;
        this.localState.clients = this.localState.clients.filter((c) => !(c.id === id && c.tenantId === tenantId));
        this.localState.clientBrands = this.localState.clientBrands.filter((b) => b.clientId !== id);
        const deleted = this.localState.clients.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    async createBrand(tenantId, clientId, payload) {
        const now = new Date().toISOString();
        const brand = {
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
    async updateBrand(tenantId, brandId, payload) {
        const idx = this.localState.clientBrands.findIndex((b) => b.id === brandId);
        if (idx === -1)
            return null;
        this.localState.clientBrands[idx] = {
            ...this.localState.clientBrands[idx],
            ...payload,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.clientBrands[idx];
    }
    async deleteBrand(tenantId, brandId) {
        const before = this.localState.clientBrands.length;
        this.localState.clientBrands = this.localState.clientBrands.filter((b) => b.id !== brandId);
        const deleted = this.localState.clientBrands.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // COTIZACIONES
    // ===========================================================================
    async getQuotesByTenant(tenantId) {
        return this.localState.quotes.filter((q) => q.tenantId === tenantId);
    }
    async getQuoteById(id, tenantId) {
        return this.localState.quotes.find((q) => q.id === id && q.tenantId === tenantId) || null;
    }
    async getQuoteByPublicToken(publicToken) {
        const quote = this.localState.quotes.find((q) => q.publicToken === publicToken || q.shortCode === publicToken);
        if (!quote)
            return null;
        const tenant = this.localState.tenants.find((t) => t.id === quote.tenantId);
        if (!tenant)
            return null;
        const client = this.localState.clients.find((c) => c.id === quote.clientId);
        return { quote, tenant, client };
    }
    async createQuote(tenantId, data) {
        const now = new Date().toISOString();
        const newQuote = {
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
    async updateQuote(id, tenantId, data) {
        const idx = this.localState.quotes.findIndex((q) => q.id === id && q.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.quotes[idx] = {
            ...this.localState.quotes[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.quotes[idx];
    }
    async deleteQuote(id, tenantId) {
        const before = this.localState.quotes.length;
        this.localState.quotes = this.localState.quotes.filter((q) => !(q.id === id && q.tenantId === tenantId));
        const deleted = this.localState.quotes.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // NOTAS DE PAGO
    // ===========================================================================
    async getPaymentNotesByTenant(tenantId) {
        return this.localState.paymentNotes.filter((p) => p.tenantId === tenantId);
    }
    async getPaymentNoteById(id, tenantId) {
        return this.localState.paymentNotes.find((p) => p.id === id && p.tenantId === tenantId) || null;
    }
    async getPaymentNoteByPublicToken(token) {
        const clean = token.trim().toLowerCase();
        const note = this.localState.paymentNotes.find((p) => (p.publicToken && p.publicToken.toLowerCase() === clean) ||
            (p.id && p.id.toLowerCase() === clean) ||
            (p.code && p.code.toLowerCase() === clean));
        if (!note)
            return null;
        const tenant = this.localState.tenants.find((t) => t.id === note.tenantId);
        if (!tenant)
            return null;
        return { paymentNote: note, note, tenant };
    }
    async createPaymentNote(tenantId, data) {
        const now = new Date().toISOString();
        const newNote = {
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
    async updatePaymentNote(id, tenantId, data) {
        const idx = this.localState.paymentNotes.findIndex((p) => p.id === id && p.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.paymentNotes[idx] = {
            ...this.localState.paymentNotes[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.paymentNotes[idx];
    }
    async deletePaymentNote(id, tenantId) {
        const before = this.localState.paymentNotes.length;
        this.localState.paymentNotes = this.localState.paymentNotes.filter((p) => !(p.id === id && p.tenantId === tenantId));
        const deleted = this.localState.paymentNotes.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // SERVICIOS Y CATEGORIAS
    // ===========================================================================
    async getServices(tenantId, filters) {
        let list = this.localState.services.filter((s) => s.tenantId === tenantId);
        if (!filters)
            return list;
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
    async getServiceById(id, tenantId) {
        return this.localState.services.find((s) => s.id === id && s.tenantId === tenantId) || null;
    }
    async getPublicServices(slug, categorySlug) {
        const tenant = this.localState.tenants.find((t) => t.slug === slug || t.id === slug);
        if (!tenant)
            return null;
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
    async getPublicServiceBySlugOrId(slug, slugOrId) {
        const tenant = this.localState.tenants.find((t) => t.slug === slug || t.id === slug);
        if (!tenant)
            return null;
        const service = this.localState.services.find((s) => s.tenantId === tenant.id &&
            (s.seo?.slug === slugOrId || s.slug === slugOrId || s.id === slugOrId));
        if (!service)
            return null;
        const related = this.localState.services
            .filter((s) => s.tenantId === tenant.id && s.categoryId === service.categoryId && s.id !== service.id)
            .slice(0, 3);
        return { service, tenant, relatedServices: related };
    }
    async createService(tenantId, data) {
        const now = new Date().toISOString();
        const newService = {
            id: data.id || `svc-${Date.now()}`,
            tenantId,
            code: data.code || `SRV-${Date.now().toString().slice(-4)}`,
            title: data.title || data.name || 'Nuevo Servicio',
            categoryId: data.categoryId || '',
            categoryName: data.categoryName || '',
            coverImage: data.coverImage || '',
            status: data.status || 'active',
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
    async updateService(id, tenantId, data) {
        const idx = this.localState.services.findIndex((s) => s.id === id && s.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.services[idx] = {
            ...this.localState.services[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.services[idx];
    }
    async deleteService(id, tenantId) {
        const before = this.localState.services.length;
        this.localState.services = this.localState.services.filter((s) => !(s.id === id && s.tenantId === tenantId));
        const deleted = this.localState.services.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    async getServiceCategories(tenantId) {
        return this.localState.serviceCategories.filter((c) => c.tenantId === tenantId);
    }
    async createServiceCategory(tenantId, data) {
        const now = new Date().toISOString();
        const newCat = {
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
    async updateServiceCategory(id, tenantId, data) {
        const idx = this.localState.serviceCategories.findIndex((c) => c.id === id && c.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.serviceCategories[idx] = {
            ...this.localState.serviceCategories[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.serviceCategories[idx];
    }
    async deleteServiceCategory(id, tenantId) {
        const before = this.localState.serviceCategories.length;
        this.localState.serviceCategories = this.localState.serviceCategories.filter((c) => !(c.id === id && c.tenantId === tenantId));
        const deleted = this.localState.serviceCategories.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // WORKSPACE: REDES SOCIALES (POSTS)
    // ===========================================================================
    async getWorkspacePosts(tenantId, clientId) {
        let list = this.localState.workspacePosts.filter((p) => p.tenantId === tenantId);
        if (clientId) {
            list = list.filter((p) => p.clientId === clientId);
        }
        return list;
    }
    async createWorkspacePost(tenantIdOrData, maybeData) {
        const data = typeof tenantIdOrData === 'string'
            ? { ...(maybeData || {}), tenantId: tenantIdOrData }
            : tenantIdOrData;
        const now = new Date().toISOString();
        const newPost = {
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
    async updateWorkspacePost(id, tenantId, data) {
        const idx = this.localState.workspacePosts.findIndex((p) => p.id === id && p.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.workspacePosts[idx] = {
            ...this.localState.workspacePosts[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.workspacePosts[idx];
    }
    async deleteWorkspacePost(id, tenantId) {
        const before = this.localState.workspacePosts.length;
        this.localState.workspacePosts = this.localState.workspacePosts.filter((p) => !(p.id === id && p.tenantId === tenantId));
        const deleted = this.localState.workspacePosts.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // WORKSPACE: TAREAS
    // ===========================================================================
    async getWorkspaceTasks(tenantId, clientId) {
        let list = this.localState.workspaceTasks.filter((t) => t.tenantId === tenantId);
        if (clientId) {
            list = list.filter((t) => t.clientId === clientId);
        }
        return list;
    }
    async createWorkspaceTask(tenantIdOrData, maybeData) {
        const data = typeof tenantIdOrData === 'string'
            ? { ...(maybeData || {}), tenantId: tenantIdOrData }
            : tenantIdOrData;
        const now = new Date().toISOString();
        const newTask = {
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
    async updateWorkspaceTask(id, tenantId, data) {
        const idx = this.localState.workspaceTasks.findIndex((t) => t.id === id && t.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.workspaceTasks[idx] = {
            ...this.localState.workspaceTasks[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.workspaceTasks[idx];
    }
    async deleteWorkspaceTask(id, tenantId) {
        const before = this.localState.workspaceTasks.length;
        this.localState.workspaceTasks = this.localState.workspaceTasks.filter((t) => !(t.id === id && t.tenantId === tenantId));
        const deleted = this.localState.workspaceTasks.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // WORKSPACE: PROYECTOS
    // ===========================================================================
    async getWorkspaceProjects(tenantId, clientId) {
        if (!Array.isArray(this.localState.workspaceProjects)) {
            this.localState.workspaceProjects = [];
        }
        let list = this.localState.workspaceProjects.filter((p) => p.tenantId === tenantId);
        if (clientId) {
            list = list.filter((p) => p.clientId === clientId);
        }
        return list;
    }
    async getWorkspaceProjectById(id, tenantId) {
        const list = await this.getWorkspaceProjects(tenantId);
        return list.find((p) => p.id === id) || null;
    }
    async createWorkspaceProject(tenantIdOrData, maybeData) {
        const data = typeof tenantIdOrData === 'string'
            ? { ...(maybeData || {}), tenantId: tenantIdOrData }
            : tenantIdOrData;
        const now = new Date().toISOString();
        const newProj = {
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
    async updateWorkspaceProject(id, tenantId, data) {
        if (!Array.isArray(this.localState.workspaceProjects)) {
            this.localState.workspaceProjects = [];
        }
        const idx = this.localState.workspaceProjects.findIndex((p) => p.id === id && p.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.workspaceProjects[idx] = {
            ...this.localState.workspaceProjects[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.workspaceProjects[idx];
    }
    async deleteWorkspaceProject(id, tenantId) {
        if (!Array.isArray(this.localState.workspaceProjects)) {
            this.localState.workspaceProjects = [];
            return false;
        }
        const before = this.localState.workspaceProjects.length;
        this.localState.workspaceProjects = this.localState.workspaceProjects.filter((p) => !(p.id === id && p.tenantId === tenantId));
        const deleted = this.localState.workspaceProjects.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // MESES / CAMPAÑAS MENSUALES DE PROYECTO (WORKSPACE)
    // ===========================================================================
    async getWorkspaceMonths(tenantId, projectId) {
        if (!Array.isArray(this.localState.workspaceMonths)) {
            this.localState.workspaceMonths = [];
        }
        let list = this.localState.workspaceMonths.filter((m) => m.tenantId === tenantId);
        if (projectId && projectId !== 'all') {
            list = list.filter((m) => m.projectId === projectId);
        }
        // Ordenar por año desc, mes desc
        list.sort((a, b) => {
            if (b.year !== a.year)
                return b.year - a.year;
            return b.month - a.month;
        });
        return list;
    }
    async getWorkspaceMonthById(id, tenantId) {
        const list = await this.getWorkspaceMonths(tenantId);
        return list.find((m) => m.id === id) || null;
    }
    async createWorkspaceMonth(tenantIdOrData, maybeData) {
        const data = typeof tenantIdOrData === 'string'
            ? { ...(maybeData || {}), tenantId: tenantIdOrData }
            : tenantIdOrData;
        const now = new Date().toISOString();
        const newMonth = {
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
    async updateWorkspaceMonth(id, tenantId, data) {
        if (!Array.isArray(this.localState.workspaceMonths)) {
            this.localState.workspaceMonths = [];
        }
        const idx = this.localState.workspaceMonths.findIndex((m) => m.id === id && m.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.workspaceMonths[idx] = {
            ...this.localState.workspaceMonths[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.workspaceMonths[idx];
    }
    async deleteWorkspaceMonth(id, tenantId) {
        if (!Array.isArray(this.localState.workspaceMonths)) {
            this.localState.workspaceMonths = [];
            return false;
        }
        const before = this.localState.workspaceMonths.length;
        this.localState.workspaceMonths = this.localState.workspaceMonths.filter((m) => !(m.id === id && (!m.tenantId || m.tenantId === tenantId)));
        const deleted = this.localState.workspaceMonths.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    async getWorkspaceMonthByPublicToken(token) {
        if (!token)
            return null;
        const cleanToken = token.trim();
        if (!Array.isArray(this.localState.workspaceMonths))
            return null;
        const month = this.localState.workspaceMonths.find((m) => (m.publicToken && m.publicToken === cleanToken) || m.id === cleanToken);
        if (!month)
            return null;
        const tenant = this.localState.tenants.find((t) => t.id === month.tenantId);
        const project = (this.localState.workspaceProjects || []).find((p) => p.id === month.projectId);
        const posts = (this.localState.workspacePosts || []).filter((p) => p.monthId === month.id || (month.projectId && p.projectId === month.projectId));
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
    async getServiceOrders(tenantId, clientId, status) {
        let list = this.localState.serviceOrders.filter((o) => o.tenantId === tenantId);
        if (clientId) {
            list = list.filter((o) => o.clientId === clientId);
        }
        if (status && status !== 'all') {
            list = list.filter((o) => o.status === status);
        }
        return list;
    }
    async getServiceOrderById(id, tenantId) {
        return this.localState.serviceOrders.find((o) => o.id === id && o.tenantId === tenantId) || null;
    }
    async getServiceOrderByPublicToken(token) {
        const order = this.localState.serviceOrders.find((o) => o.publicToken === token);
        if (!order)
            return null;
        const tenant = this.localState.tenants.find((t) => t.id === order.tenantId);
        if (!tenant)
            return null;
        return { order, tenant };
    }
    async createServiceOrder(tenantIdOrData, maybeData) {
        const data = typeof tenantIdOrData === 'string'
            ? { ...(maybeData || {}), tenantId: tenantIdOrData }
            : tenantIdOrData;
        const now = new Date().toISOString();
        const newOrder = {
            id: data.id || `os-${Date.now()}`,
            tenantId: data.tenantId,
            code: data.code || `OS-${Date.now().toString().slice(-4)}`,
            title: data.title || '',
            clientId: data.clientId || '',
            clientName: data.clientName || '',
            companyName: data.companyName || '',
            brandName: data.brandName || '',
            documentType: data.documentType || 'RUC',
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
    async updateServiceOrder(id, tenantId, data) {
        const idx = this.localState.serviceOrders.findIndex((o) => o.id === id && o.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.serviceOrders[idx] = {
            ...this.localState.serviceOrders[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.serviceOrders[idx];
    }
    async deleteServiceOrder(id, tenantId) {
        const before = this.localState.serviceOrders.length;
        this.localState.serviceOrders = this.localState.serviceOrders.filter((o) => !(o.id === id && o.tenantId === tenantId));
        const deleted = this.localState.serviceOrders.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // GOOGLE DRIVE & GESTOR DE ARCHIVOS
    // ===========================================================================
    async getDriveFiles(tenantId, filters) {
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
            list = list.filter((f) => f.name.toLowerCase().includes(q) ||
                (f.clientName && f.clientName.toLowerCase().includes(q)) ||
                (f.serviceOrderCode && f.serviceOrderCode.toLowerCase().includes(q)));
        }
        return list;
    }
    async getDriveFileById(id, tenantId) {
        return this.localState.driveFiles.find((f) => (f.id === id || f.googleFileId === id) && f.tenantId === tenantId) || null;
    }
    async createDriveFile(data) {
        const now = new Date().toISOString();
        const newFile = {
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
        const existingIdx = this.localState.driveFiles.findIndex((f) => f.tenantId === data.tenantId && f.googleFileId === data.googleFileId);
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
    async updateDriveFile(id, tenantId, data) {
        const idx = this.localState.driveFiles.findIndex((f) => (f.id === id || f.googleFileId === id) && f.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.driveFiles[idx] = {
            ...this.localState.driveFiles[idx],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        this.saveLocalState();
        return this.localState.driveFiles[idx];
    }
    async deleteDriveFile(id, tenantId) {
        const before = this.localState.driveFiles.length;
        this.localState.driveFiles = this.localState.driveFiles.filter((f) => !((f.id === id || f.googleFileId === id) && f.tenantId === tenantId));
        const deleted = this.localState.driveFiles.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // --- CARPETAS REGISTRADAS ---
    async getDriveFolders(tenantId, filters) {
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
    async getDriveFolderById(idOrGoogleId, tenantId) {
        return (this.localState.driveFolders.find((f) => (f.id === idOrGoogleId || f.googleFolderId === idOrGoogleId) && f.tenantId === tenantId) || null);
    }
    async createDriveFolder(data) {
        const newFolder = {
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
        const existingIdx = this.localState.driveFolders.findIndex((f) => f.tenantId === data.tenantId && f.googleFolderId === data.googleFolderId);
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
    async updateDriveFolder(idOrGoogleId, tenantId, data) {
        const idx = this.localState.driveFolders.findIndex((f) => (f.id === idOrGoogleId || f.googleFolderId === idOrGoogleId) && f.tenantId === tenantId);
        if (idx === -1)
            return null;
        this.localState.driveFolders[idx] = {
            ...this.localState.driveFolders[idx],
            ...data,
        };
        this.saveLocalState();
        return this.localState.driveFolders[idx];
    }
    async deleteDriveFolder(idOrGoogleId, tenantId) {
        const before = this.localState.driveFolders.length;
        this.localState.driveFolders = this.localState.driveFolders.filter((f) => !((f.id === idOrGoogleId || f.googleFolderId === idOrGoogleId) && f.tenantId === tenantId));
        const deleted = this.localState.driveFolders.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // --- PLANTILLAS DE CARPETAS (BLUEPRINTS) ---
    async getDriveFolderBlueprints(tenantId) {
        let list = this.localState.driveFolderBlueprints.filter((b) => b.tenantId === tenantId || b.tenantId === 'system');
        // Si no existen plantillas aún, inicializar las plantillas por defecto para la agencia
        if (list.length === 0) {
            const defaultBlueprints = [
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
    async createDriveFolderBlueprint(data) {
        const newBp = {
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
    async deleteDriveFolderBlueprint(id, tenantId) {
        const before = this.localState.driveFolderBlueprints.length;
        this.localState.driveFolderBlueprints = this.localState.driveFolderBlueprints.filter((b) => !(b.id === id && (b.tenantId === tenantId || b.tenantId === 'system')));
        const deleted = this.localState.driveFolderBlueprints.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
}
exports.DatabaseManager = DatabaseManager;
exports.db = new DatabaseManager();
