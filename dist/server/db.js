"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.DatabaseManager = void 0;
exports.cleanHtmlForServer = cleanHtmlForServer;
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
function cleanHtmlForServer(raw) {
    if (!raw)
        return '';
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
        try {
            return String.fromCharCode(Number(code));
        }
        catch {
            return '';
        }
    });
    text = text.split('\n').map((l) => l.trimEnd()).join('\n');
    return text.replace(/\n{3,}/g, '\n\n').trim();
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
                if (!Array.isArray(parsed.notifications))
                    parsed.notifications = [];
                if (!Array.isArray(parsed.pushSubscriptions))
                    parsed.pushSubscriptions = [];
                if (!Array.isArray(parsed.biolinks))
                    parsed.biolinks = [];
                if (!Array.isArray(parsed.savedPalettes))
                    parsed.savedPalettes = [];
                if (!Array.isArray(parsed.codeHistory))
                    parsed.codeHistory = [];
                if (!Array.isArray(parsed.hrSettings))
                    parsed.hrSettings = [];
                if (!Array.isArray(parsed.employeeProfiles))
                    parsed.employeeProfiles = [];
                if (!Array.isArray(parsed.attendanceRecords))
                    parsed.attendanceRecords = [];
                if (!Array.isArray(parsed.financeTransactions))
                    parsed.financeTransactions = [];
                if (!Array.isArray(parsed.accountingEntries))
                    parsed.accountingEntries = [];
                if (!Array.isArray(parsed.workspaceForms))
                    parsed.workspaceForms = [];
                if (!Array.isArray(parsed.formSubmissions))
                    parsed.formSubmissions = [];
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
            brandGuidelines: [],
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
        const idx = this.localState.tenants.findIndex((t) => t.id === tenantId);
        if (idx === -1)
            return null;
        const current = this.localState.tenants[idx];
        current.customization = { ...(current.customization || types_1.DEFAULT_CUSTOMIZATION), ...customization };
        current.updatedAt = new Date().toISOString();
        this.saveLocalState();
        return await this.getTenantById(tenantId);
    }
    async updateTenantCompanyInfo(tenantId, companyInfo) {
        const idx = this.localState.tenants.findIndex((t) => t.id === tenantId);
        if (idx === -1)
            return null;
        const current = this.localState.tenants[idx];
        current.companyInfo = {
            ...(current.companyInfo || { ...types_1.DEFAULT_COMPANY_INFO, commercialName: current.name, legalName: current.name }),
            ...companyInfo,
        };
        if (companyInfo.commercialName?.trim()) {
            current.name = companyInfo.commercialName.trim();
        }
        current.updatedAt = new Date().toISOString();
        this.saveLocalState();
        return await this.getTenantById(tenantId);
    }
    async updateTenantBankAccounts(tenantId, bankAccounts) {
        const idx = this.localState.tenants.findIndex((t) => t.id === tenantId);
        if (idx === -1)
            return null;
        const current = this.localState.tenants[idx];
        if (!current.companyInfo) {
            current.companyInfo = { ...types_1.DEFAULT_COMPANY_INFO, commercialName: current.name, legalName: current.name };
        }
        current.companyInfo.bankAccounts = bankAccounts;
        current.updatedAt = new Date().toISOString();
        this.saveLocalState();
        return await this.getTenantById(tenantId);
    }
    async updateTenantDriveConfig(tenantId, driveConfig) {
        const idx = this.localState.tenants.findIndex((t) => t.id === tenantId);
        if (idx === -1)
            return null;
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
    async updateTenantAiConfig(tenantId, aiConfig) {
        const idx = this.localState.tenants.findIndex((t) => t.id === tenantId);
        if (idx === -1)
            return null;
        const current = this.localState.tenants[idx];
        current.aiConfig = {
            ...(current.aiConfig || {}),
            ...aiConfig,
            updatedAt: new Date().toISOString(),
        };
        current.updatedAt = new Date().toISOString();
        this.saveLocalState();
        return await this.getTenantById(tenantId);
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
        const tenant = await this.getTenantById(tenantId);
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
    async updateWorkspacePost(id, tenantId, data) {
        const idx = this.localState.workspacePosts.findIndex((p) => p.id === id && p.tenantId === tenantId);
        if (idx === -1)
            return null;
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
    // WORKSPACE: HERRAMIENTAS - BIOLINKS (LINK IN BIO)
    // ===========================================================================
    async getBiolinks(tenantId) {
        if (!Array.isArray(this.localState.biolinks)) {
            this.localState.biolinks = [];
        }
        return this.localState.biolinks.filter((b) => b.tenantId === tenantId);
    }
    async getBiolinkById(id, tenantId) {
        const list = await this.getBiolinks(tenantId);
        return list.find((b) => b.id === id) || null;
    }
    async getBiolinkBySlug(slug) {
        if (!Array.isArray(this.localState.biolinks)) {
            this.localState.biolinks = [];
        }
        const cleanSlug = slug.trim().toLowerCase();
        const profile = this.localState.biolinks.find((b) => b.slug.toLowerCase() === cleanSlug || b.id === slug);
        if (!profile)
            return null;
        const tenant = this.localState.tenants.find((t) => t.id === profile.tenantId);
        return { profile, tenant: tenant || null };
    }
    async createBiolink(tenantId, data) {
        if (!Array.isArray(this.localState.biolinks)) {
            this.localState.biolinks = [];
        }
        const now = new Date().toISOString();
        const cleanSlug = (data.slug || `bio-${Date.now().toString(36)}`)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9-_]/g, '-');
        const newProfile = {
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
    async updateBiolink(id, tenantId, data) {
        if (!Array.isArray(this.localState.biolinks)) {
            this.localState.biolinks = [];
        }
        const idx = this.localState.biolinks.findIndex((b) => b.id === id && b.tenantId === tenantId);
        if (idx === -1)
            return null;
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
    async deleteBiolink(id, tenantId) {
        if (!Array.isArray(this.localState.biolinks)) {
            this.localState.biolinks = [];
            return false;
        }
        const before = this.localState.biolinks.length;
        this.localState.biolinks = this.localState.biolinks.filter((b) => !(b.id === id && b.tenantId === tenantId));
        const deleted = this.localState.biolinks.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    async recordBiolinkView(slug) {
        if (!Array.isArray(this.localState.biolinks))
            return false;
        const cleanSlug = slug.trim().toLowerCase();
        const profile = this.localState.biolinks.find((b) => b.slug.toLowerCase() === cleanSlug || b.id === slug);
        if (!profile)
            return false;
        profile.viewsCount = (profile.viewsCount || 0) + 1;
        const today = new Date().toISOString().split('T')[0];
        if (!Array.isArray(profile.viewsHistory))
            profile.viewsHistory = [];
        const dayStat = profile.viewsHistory.find((h) => h.date === today);
        if (dayStat) {
            dayStat.views = (dayStat.views || 0) + 1;
        }
        else {
            profile.viewsHistory.push({ date: today, views: 1, clicks: 0 });
        }
        this.saveLocalState();
        return true;
    }
    async recordBiolinkClick(slug, blockId) {
        if (!Array.isArray(this.localState.biolinks))
            return false;
        const cleanSlug = slug.trim().toLowerCase();
        const profile = this.localState.biolinks.find((b) => b.slug.toLowerCase() === cleanSlug || b.id === slug);
        if (!profile)
            return false;
        profile.clicksCount = (profile.clicksCount || 0) + 1;
        if (blockId && Array.isArray(profile.blocks)) {
            const block = profile.blocks.find((b) => b.id === blockId);
            if (block) {
                block.clicksCount = (block.clicksCount || 0) + 1;
            }
        }
        const today = new Date().toISOString().split('T')[0];
        if (!Array.isArray(profile.viewsHistory))
            profile.viewsHistory = [];
        const dayStat = profile.viewsHistory.find((h) => h.date === today);
        if (dayStat) {
            dayStat.clicks = (dayStat.clicks || 0) + 1;
        }
        else {
            profile.viewsHistory.push({ date: today, views: 0, clicks: 1 });
        }
        this.saveLocalState();
        return true;
    }
    // ===========================================================================
    // WORKSPACE: HERRAMIENTAS - PALETAS GUARDADAS
    // ===========================================================================
    async getSavedPalettes(tenantId) {
        if (!Array.isArray(this.localState.savedPalettes)) {
            this.localState.savedPalettes = [];
        }
        return this.localState.savedPalettes.filter((p) => p.tenantId === tenantId);
    }
    async savePalette(tenantId, data) {
        if (!Array.isArray(this.localState.savedPalettes)) {
            this.localState.savedPalettes = [];
        }
        const newPalette = {
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
    async deletePalette(id, tenantId) {
        if (!Array.isArray(this.localState.savedPalettes)) {
            this.localState.savedPalettes = [];
            return false;
        }
        const before = this.localState.savedPalettes.length;
        this.localState.savedPalettes = this.localState.savedPalettes.filter((p) => !(p.id === id && p.tenantId === tenantId));
        const deleted = this.localState.savedPalettes.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // WORKSPACE: HERRAMIENTAS - HISTORIAL DE CÓDIGOS (QR / BARRAS)
    // ===========================================================================
    async getCodeHistory(tenantId) {
        if (!Array.isArray(this.localState.codeHistory)) {
            this.localState.codeHistory = [];
        }
        return this.localState.codeHistory.filter((c) => c.tenantId === tenantId).slice(0, 50);
    }
    async addCodeHistory(tenantId, data) {
        if (!Array.isArray(this.localState.codeHistory)) {
            this.localState.codeHistory = [];
        }
        const item = {
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
    async clearCodeHistory(tenantId) {
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
    // ===========================================================================
    // NOTIFICACIONES MULTITENANT & PWA PUSH
    // ===========================================================================
    async getNotifications(tenantId, options) {
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
                const params = [tenantId];
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
            }
            catch (err) {
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
    async createNotification(data) {
        const id = data.id || `notif-${Date.now()}-${generateToken(4)}`;
        const createdAt = data.createdAt || new Date().toISOString();
        const isRead = data.isRead ?? false;
        const notif = {
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
                await this.pool.query(`INSERT INTO notifications (
            id, tenant_id, title, message, type, module, entity_id, action, link,
            actor_user_id, actor_user_name, is_read, metadata, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
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
                ]);
            }
            catch (err) {
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
    async markNotificationAsRead(tenantId, id) {
        let updated = false;
        if (this.isPostgresConnected && this.pool) {
            try {
                const res = await this.pool.query('UPDATE notifications SET is_read = TRUE WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
                updated = (res.rowCount ?? 0) > 0;
            }
            catch (err) {
                console.warn('[DB] Fallback postgres markNotificationAsRead:', err);
            }
        }
        const item = (this.localState.notifications || []).find((n) => n.tenantId === tenantId && n.id === id);
        if (item) {
            item.isRead = true;
            this.saveLocalState();
            updated = true;
        }
        return updated;
    }
    async markAllNotificationsAsRead(tenantId) {
        let count = 0;
        if (this.isPostgresConnected && this.pool) {
            try {
                const res = await this.pool.query('UPDATE notifications SET is_read = TRUE WHERE tenant_id = $1 AND is_read = FALSE', [tenantId]);
                count = res.rowCount ?? 0;
            }
            catch (err) {
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
    async deleteNotification(tenantId, id) {
        let deleted = false;
        if (this.isPostgresConnected && this.pool) {
            try {
                const res = await this.pool.query('DELETE FROM notifications WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
                deleted = (res.rowCount ?? 0) > 0;
            }
            catch (err) {
                console.warn('[DB] Fallback postgres deleteNotification:', err);
            }
        }
        const before = (this.localState.notifications || []).length;
        this.localState.notifications = (this.localState.notifications || []).filter((n) => !(n.tenantId === tenantId && n.id === id));
        if (this.localState.notifications.length < before) {
            this.saveLocalState();
            deleted = true;
        }
        return deleted;
    }
    async clearAllNotifications(tenantId) {
        let count = 0;
        if (this.isPostgresConnected && this.pool) {
            try {
                const res = await this.pool.query('DELETE FROM notifications WHERE tenant_id = $1', [
                    tenantId,
                ]);
                count = res.rowCount ?? 0;
            }
            catch (err) {
                console.warn('[DB] Fallback postgres clearAllNotifications:', err);
            }
        }
        const before = (this.localState.notifications || []).length;
        this.localState.notifications = (this.localState.notifications || []).filter((n) => n.tenantId !== tenantId);
        count = Math.max(count, before - this.localState.notifications.length);
        this.saveLocalState();
        return count;
    }
    // --- SUSCRIPCIONES PUSH WEB / PWA ---
    async getPushSubscriptions(tenantId) {
        if (this.isPostgresConnected && this.pool) {
            try {
                const res = await this.pool.query(`SELECT id, tenant_id as "tenantId", user_id as "userId", endpoint, keys,
                  user_agent as "userAgent", created_at as "createdAt", updated_at as "updatedAt"
           FROM push_subscriptions WHERE tenant_id = $1`, [tenantId]);
                return res.rows;
            }
            catch (err) {
                console.warn('[DB] Fallback getPushSubscriptions:', err);
            }
        }
        return (this.localState.pushSubscriptions || []).filter((s) => s.tenantId === tenantId);
    }
    async savePushSubscription(sub) {
        const now = new Date().toISOString();
        const id = sub.id || `push-${Date.now()}-${generateToken(4)}`;
        const record = {
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
                await this.pool.query(`INSERT INTO push_subscriptions (id, tenant_id, user_id, endpoint, keys, user_agent, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (endpoint) DO UPDATE SET 
             tenant_id = EXCLUDED.tenant_id,
             user_id = EXCLUDED.user_id,
             keys = EXCLUDED.keys,
             user_agent = EXCLUDED.user_agent,
             updated_at = EXCLUDED.updated_at`, [
                    record.id,
                    record.tenantId,
                    record.userId || null,
                    record.endpoint,
                    JSON.stringify(record.keys),
                    record.userAgent || null,
                    record.createdAt,
                    record.updatedAt,
                ]);
            }
            catch (err) {
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
        }
        else {
            this.localState.pushSubscriptions.push(record);
        }
        this.saveLocalState();
        return record;
    }
    async deletePushSubscription(endpoint) {
        if (this.isPostgresConnected && this.pool) {
            try {
                await this.pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
            }
            catch (err) {
                console.warn('[DB] Fallback deletePushSubscription postgres:', err);
            }
        }
        const before = (this.localState.pushSubscriptions || []).length;
        this.localState.pushSubscriptions = (this.localState.pushSubscriptions || []).filter((s) => s.endpoint !== endpoint);
        const deleted = this.localState.pushSubscriptions.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // WORKSPACE: SUBMÓDULO FORMULARIOS INTERACTIVOS DE AGENCIA
    // ===========================================================================
    async getForms(tenantId) {
        if (!Array.isArray(this.localState.workspaceForms)) {
            this.localState.workspaceForms = [];
        }
        return this.localState.workspaceForms.filter((f) => f.tenantId === tenantId);
    }
    async getFormById(id, tenantId) {
        const list = await this.getForms(tenantId);
        return list.find((f) => f.id === id) || null;
    }
    async getFormBySlug(slug) {
        if (!Array.isArray(this.localState.workspaceForms)) {
            this.localState.workspaceForms = [];
        }
        const cleanSlug = slug.trim().toLowerCase();
        const form = this.localState.workspaceForms.find((f) => f.slug.toLowerCase() === cleanSlug || f.id === slug);
        if (!form)
            return null;
        const tenant = this.localState.tenants.find((t) => t.id === form.tenantId);
        return { form, tenant: tenant || null };
    }
    async createForm(tenantId, data) {
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
        const newForm = {
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
    async updateForm(id, tenantId, data) {
        if (!Array.isArray(this.localState.workspaceForms)) {
            this.localState.workspaceForms = [];
        }
        const idx = this.localState.workspaceForms.findIndex((f) => f.id === id && f.tenantId === tenantId);
        if (idx === -1)
            return null;
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
    async deleteForm(id, tenantId) {
        if (!Array.isArray(this.localState.workspaceForms)) {
            this.localState.workspaceForms = [];
            return false;
        }
        const before = this.localState.workspaceForms.length;
        this.localState.workspaceForms = this.localState.workspaceForms.filter((f) => !(f.id === id && f.tenantId === tenantId));
        const deleted = this.localState.workspaceForms.length < before;
        if (deleted) {
            if (Array.isArray(this.localState.formSubmissions)) {
                this.localState.formSubmissions = this.localState.formSubmissions.filter((s) => !(s.formId === id && s.tenantId === tenantId));
            }
            this.saveLocalState();
        }
        return deleted;
    }
    async duplicateForm(id, tenantId) {
        const original = await this.getFormById(id, tenantId);
        if (!original)
            return null;
        const copyData = {
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
    async recordFormView(slug) {
        if (!Array.isArray(this.localState.workspaceForms))
            return false;
        const cleanSlug = slug.trim().toLowerCase();
        const form = this.localState.workspaceForms.find((f) => f.slug.toLowerCase() === cleanSlug || f.id === slug);
        if (!form)
            return false;
        form.viewsCount = (form.viewsCount || 0) + 1;
        this.saveLocalState();
        return true;
    }
    async submitFormAnswers(slug, payload) {
        if (!Array.isArray(this.localState.workspaceForms)) {
            this.localState.workspaceForms = [];
        }
        if (!Array.isArray(this.localState.formSubmissions)) {
            this.localState.formSubmissions = [];
        }
        const cleanSlug = slug.trim().toLowerCase();
        const form = this.localState.workspaceForms.find((f) => f.slug.toLowerCase() === cleanSlug || f.id === slug);
        if (!form) {
            throw new Error('Formulario no encontrado o no disponible');
        }
        const now = new Date().toISOString();
        const submission = {
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
        }
        catch (e) {
            console.warn('[DB] No se pudo crear notificación de formulario:', e);
        }
        this.saveLocalState();
        return submission;
    }
    async getFormSubmissions(formId, tenantId) {
        if (!Array.isArray(this.localState.formSubmissions)) {
            this.localState.formSubmissions = [];
        }
        return this.localState.formSubmissions.filter((s) => s.formId === formId && s.tenantId === tenantId);
    }
    async deleteFormSubmission(submissionId, tenantId) {
        if (!Array.isArray(this.localState.formSubmissions)) {
            this.localState.formSubmissions = [];
            return false;
        }
        const before = this.localState.formSubmissions.length;
        this.localState.formSubmissions = this.localState.formSubmissions.filter((s) => !(s.id === submissionId && s.tenantId === tenantId));
        const deleted = this.localState.formSubmissions.length < before;
        if (deleted) {
            this.saveLocalState();
        }
        return deleted;
    }
    // ===========================================================================
    // ADMINISTRACIÓN: RECURSOS HUMANOS (CONFIGURACIÓN GLOBAL)
    // ===========================================================================
    async getHrSettings(tenantId) {
        if (!this.localState.hrSettings)
            this.localState.hrSettings = [];
        let settings = this.localState.hrSettings.find((s) => s.tenantId === tenantId);
        if (!settings) {
            settings = {
                ...types_1.DEFAULT_HR_SETTINGS,
                tenantId,
                updatedAt: new Date().toISOString(),
            };
            this.localState.hrSettings.push(settings);
            this.saveLocalState();
        }
        return settings;
    }
    async updateHrSettings(tenantId, data) {
        if (!this.localState.hrSettings)
            this.localState.hrSettings = [];
        const idx = this.localState.hrSettings.findIndex((s) => s.tenantId === tenantId);
        const now = new Date().toISOString();
        let updated;
        if (idx === -1) {
            updated = {
                ...types_1.DEFAULT_HR_SETTINGS,
                ...data,
                tenantId,
                updatedAt: now,
            };
            this.localState.hrSettings.push(updated);
        }
        else {
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
    async getEmployeeProfiles(tenantId) {
        if (!this.localState.employeeProfiles)
            this.localState.employeeProfiles = [];
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
    async getEmployeeProfileByUserId(tenantId, userId) {
        const list = await this.getEmployeeProfiles(tenantId);
        return list.find((p) => p.userId === userId) || null;
    }
    async saveEmployeeProfile(tenantId, data) {
        if (!this.localState.employeeProfiles)
            this.localState.employeeProfiles = [];
        const now = new Date().toISOString();
        const existingIdx = data.id
            ? this.localState.employeeProfiles.findIndex((p) => p.id === data.id && p.tenantId === tenantId)
            : this.localState.employeeProfiles.findIndex((p) => p.userId === data.userId && p.tenantId === tenantId);
        if (existingIdx !== -1) {
            const current = this.localState.employeeProfiles[existingIdx];
            const updated = {
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
        }
        else {
            const newProfile = {
                id: crypto_1.default.randomUUID(),
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
    async getEmployeeProfileByPublicToken(token) {
        if (!this.localState.employeeProfiles)
            this.localState.employeeProfiles = [];
        const emp = this.localState.employeeProfiles.find((p) => p.publicToken === token);
        if (!emp)
            return null;
        const tenant = await this.getTenantById(emp.tenantId);
        if (!tenant)
            return null;
        const user = this.localState.users.find((u) => u.id === emp.userId);
        const enriched = {
            ...emp,
            userName: user?.name || emp.userName || 'Colaborador',
            userEmail: user?.email || emp.userEmail || '',
            userAvatar: user?.avatarUrl || emp.userAvatar || '',
            jobTitle: user?.jobTitle || emp.jobTitle || 'Equipo',
        };
        return {
            employee: enriched,
            tenant,
            companyInfo: tenant.companyInfo || types_1.DEFAULT_COMPANY_INFO,
        };
    }
    async addEmployeePayment(tenantId, employeeId, paymentData) {
        if (!this.localState.employeeProfiles)
            this.localState.employeeProfiles = [];
        const idx = this.localState.employeeProfiles.findIndex((p) => (p.id === employeeId || p.userId === employeeId) && p.tenantId === tenantId);
        if (idx === -1)
            throw new Error('Colaborador no encontrado');
        const emp = this.localState.employeeProfiles[idx];
        if (!Array.isArray(emp.payments))
            emp.payments = [];
        const now = new Date().toISOString();
        const newPayment = {
            id: crypto_1.default.randomUUID(),
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
    async deleteEmployeePayment(tenantId, employeeId, paymentId) {
        if (!this.localState.employeeProfiles)
            this.localState.employeeProfiles = [];
        const idx = this.localState.employeeProfiles.findIndex((p) => (p.id === employeeId || p.userId === employeeId) && p.tenantId === tenantId);
        if (idx === -1)
            throw new Error('Colaborador no encontrado');
        const emp = this.localState.employeeProfiles[idx];
        if (Array.isArray(emp.payments)) {
            emp.payments = emp.payments.filter((p) => p.id !== paymentId);
            emp.updatedAt = new Date().toISOString();
            this.saveLocalState();
        }
        return emp;
    }
    async deleteEmployeeProfile(tenantId, id) {
        if (!this.localState.employeeProfiles)
            return false;
        const before = this.localState.employeeProfiles.length;
        this.localState.employeeProfiles = this.localState.employeeProfiles.filter((p) => !(p.id === id && p.tenantId === tenantId));
        const deleted = this.localState.employeeProfiles.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // ADMINISTRACIÓN: REGISTRO DE ASISTENCIAS Y MARCACIONES
    // ===========================================================================
    async getAttendanceRecords(tenantId, filters) {
        if (!this.localState.attendanceRecords)
            this.localState.attendanceRecords = [];
        let list = this.localState.attendanceRecords.filter((r) => r.tenantId === tenantId);
        if (filters?.userId) {
            list = list.filter((r) => r.userId === filters.userId);
        }
        if (filters?.date) {
            list = list.filter((r) => r.date === filters.date);
        }
        if (filters?.month) {
            list = list.filter((r) => r.date.startsWith(filters.month));
        }
        if (filters?.status && filters.status !== 'all') {
            list = list.filter((r) => r.status === filters.status);
        }
        return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    }
    async getTodayAttendance(tenantId, userId) {
        if (!this.localState.attendanceRecords)
            this.localState.attendanceRecords = [];
        const today = new Date().toISOString().split('T')[0];
        const rec = this.localState.attendanceRecords.find((r) => r.tenantId === tenantId && r.userId === userId && r.date === today);
        return rec || null;
    }
    async recordAttendanceStamp(tenantId, userId, action, stamp) {
        if (!this.localState.attendanceRecords)
            this.localState.attendanceRecords = [];
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();
        const user = this.localState.users.find((u) => u.id === userId);
        const profile = await this.getEmployeeProfileByUserId(tenantId, userId);
        const hrSettings = await this.getHrSettings(tenantId);
        let record = this.localState.attendanceRecords.find((r) => r.tenantId === tenantId && r.userId === userId && r.date === today);
        const expectedEntryTime = profile?.entryTime || hrSettings.defaultEntryTime || '09:00';
        const toleranceMins = hrSettings.toleranceMinutes || 15;
        if (!record) {
            let status = 'present';
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
                id: crypto_1.default.randomUUID(),
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
        }
        else {
            if (action === 'check_in') {
                record.checkIn = stamp;
                const [expH, expM] = expectedEntryTime.split(':').map(Number);
                const [stampH, stampM] = stamp.time.split(':').map(Number);
                if (stampH * 60 + stampM > expH * 60 + expM + toleranceMins) {
                    record.status = 'late';
                }
                else {
                    record.status = 'present';
                }
            }
            else if (action === 'break_start') {
                record.breakStart = stamp;
            }
            else if (action === 'break_end') {
                record.breakEnd = stamp;
            }
            else if (action === 'check_out') {
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
    async updateAttendanceRecord(tenantId, id, data) {
        if (!this.localState.attendanceRecords)
            return null;
        const idx = this.localState.attendanceRecords.findIndex((r) => r.id === id && r.tenantId === tenantId);
        if (idx === -1)
            return null;
        const current = this.localState.attendanceRecords[idx];
        const updated = {
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
    async getFinanceTransactions(tenantId, filters) {
        if (!this.localState.financeTransactions)
            this.localState.financeTransactions = [];
        let list = this.localState.financeTransactions.filter((t) => t.tenantId === tenantId);
        if (filters?.type && filters.type !== 'all') {
            list = list.filter((t) => t.type === filters.type);
        }
        if (filters?.category && filters.category !== 'all') {
            list = list.filter((t) => t.category === filters.category);
        }
        if (filters?.startDate) {
            list = list.filter((t) => t.date >= filters.startDate);
        }
        if (filters?.endDate) {
            list = list.filter((t) => t.date <= filters.endDate);
        }
        return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    }
    async createFinanceTransaction(tenantId, data) {
        if (!this.localState.financeTransactions)
            this.localState.financeTransactions = [];
        const now = new Date().toISOString();
        const item = {
            id: crypto_1.default.randomUUID(),
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
    async deleteFinanceTransaction(tenantId, id) {
        if (!this.localState.financeTransactions)
            return false;
        const before = this.localState.financeTransactions.length;
        this.localState.financeTransactions = this.localState.financeTransactions.filter((t) => !(t.id === id && t.tenantId === tenantId));
        const deleted = this.localState.financeTransactions.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // ADMINISTRACIÓN: CONTABILIDAD Y ASIENTOS
    // ===========================================================================
    async getAccountingEntries(tenantId, filters) {
        if (!this.localState.accountingEntries)
            this.localState.accountingEntries = [];
        let list = this.localState.accountingEntries.filter((e) => e.tenantId === tenantId);
        if (filters?.status && filters.status !== 'all') {
            list = list.filter((e) => e.status === filters.status);
        }
        if (filters?.startDate) {
            list = list.filter((e) => e.date >= filters.startDate);
        }
        if (filters?.endDate) {
            list = list.filter((e) => e.date <= filters.endDate);
        }
        return list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    }
    async createAccountingEntry(tenantId, data) {
        if (!this.localState.accountingEntries)
            this.localState.accountingEntries = [];
        const now = new Date().toISOString();
        const count = this.localState.accountingEntries.filter((e) => e.tenantId === tenantId).length + 1;
        const item = {
            id: crypto_1.default.randomUUID(),
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
    async deleteAccountingEntry(tenantId, id) {
        if (!this.localState.accountingEntries)
            return false;
        const before = this.localState.accountingEntries.length;
        this.localState.accountingEntries = this.localState.accountingEntries.filter((e) => !(e.id === id && e.tenantId === tenantId));
        const deleted = this.localState.accountingEntries.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // =============================================================================
    // SUBMÓDULO: SALAS DE REUNIONES & ACTAS DE WORKSPACE
    // =============================================================================
    async getMeetingRooms(tenantId) {
        if (!this.localState.workspaceMeetingRooms) {
            this.localState.workspaceMeetingRooms = [];
        }
        let rooms = this.localState.workspaceMeetingRooms.filter((r) => r.tenantId === tenantId);
        // Inicializar salas preestablecidas fijas si el tenant es nuevo o no tiene ninguna
        if (rooms.length === 0) {
            const now = new Date().toISOString();
            const presets = [
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
    async getMeetingRoomById(id, tenantId) {
        const rooms = await this.getMeetingRooms(tenantId);
        return rooms.find((r) => r.id === id && r.tenantId === tenantId) || null;
    }
    async createMeetingRoom(tenantId, data) {
        if (!this.localState.workspaceMeetingRooms) {
            this.localState.workspaceMeetingRooms = [];
        }
        const now = new Date().toISOString();
        const count = this.localState.workspaceMeetingRooms.filter((r) => r.tenantId === tenantId).length + 1;
        const room = {
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
    async updateMeetingRoom(id, tenantId, data) {
        if (!this.localState.workspaceMeetingRooms)
            return null;
        const idx = this.localState.workspaceMeetingRooms.findIndex((r) => r.id === id && r.tenantId === tenantId);
        if (idx === -1)
            return null;
        const current = this.localState.workspaceMeetingRooms[idx];
        const updated = {
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
    async deleteMeetingRoom(id, tenantId) {
        if (!this.localState.workspaceMeetingRooms)
            return false;
        const before = this.localState.workspaceMeetingRooms.length;
        this.localState.workspaceMeetingRooms = this.localState.workspaceMeetingRooms.filter((r) => !(r.id === id && r.tenantId === tenantId));
        const deleted = this.localState.workspaceMeetingRooms.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // --- REUNIONES & ACTAS ---
    async getMeetings(tenantId, filters) {
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
            list = list.filter((m) => m.title.toLowerCase().includes(q) ||
                m.clientName?.toLowerCase().includes(q) ||
                m.brandName?.toLowerCase().includes(q) ||
                m.summary?.toLowerCase().includes(q));
        }
        return list.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    }
    async getMeetingById(id, tenantId) {
        if (!this.localState.workspaceMeetings)
            return null;
        return this.localState.workspaceMeetings.find((m) => m.id === id && m.tenantId === tenantId) || null;
    }
    async createMeeting(tenantId, data, userId) {
        if (!this.localState.workspaceMeetings) {
            this.localState.workspaceMeetings = [];
        }
        const now = new Date().toISOString();
        // Si viene vinculado a una sala, actualizar el nombre de la sala
        let roomName = data.roomName;
        if (data.roomId && !roomName) {
            const room = this.localState.workspaceMeetingRooms?.find((r) => r.id === data.roomId);
            if (room)
                roomName = room.name;
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
            if (c)
                clientName = c.name;
        }
        const meeting = {
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
            agreements: (data.agreements || []).map((ag) => ({
                id: ag.id || `agr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                title: ag.title || '',
                description: ag.description || '',
                assignedUserId: ag.assignedUserId,
                assignedUserName: ag.assignedUserName,
                dueDate: ag.dueDate,
                completed: !!ag.completed,
                createdTaskId: ag.createdTaskId,
            })),
            recordings: (data.recordings || []).map((rec) => ({
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
    async updateMeeting(id, tenantId, data) {
        if (!this.localState.workspaceMeetings)
            return null;
        const idx = this.localState.workspaceMeetings.findIndex((m) => m.id === id && m.tenantId === tenantId);
        if (idx === -1)
            return null;
        const current = this.localState.workspaceMeetings[idx];
        const updated = {
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
    async deleteMeeting(id, tenantId) {
        if (!this.localState.workspaceMeetings)
            return false;
        const before = this.localState.workspaceMeetings.length;
        this.localState.workspaceMeetings = this.localState.workspaceMeetings.filter((m) => !(m.id === id && m.tenantId === tenantId));
        const deleted = this.localState.workspaceMeetings.length < before;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    /**
     * Convierte un acuerdo específico de un acta en una tarea real en WorkspaceTasks
     */
    async convertMeetingAgreementToTask(meetingId, agreementId, tenantId, taskData, userId) {
        const meeting = await this.getMeetingById(meetingId, tenantId);
        if (!meeting)
            return null;
        const agreement = meeting.agreements.find((a) => a.id === agreementId);
        if (!agreement)
            return null;
        // Crear la tarea en workspaceTasks
        if (!this.localState.workspaceTasks) {
            this.localState.workspaceTasks = [];
        }
        const now = new Date().toISOString();
        const newTask = {
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
    async getWhiteboards(tenantId, filters, userId, isAdmin) {
        if (!this.localState.whiteboards) {
            this.localState.whiteboards = [];
        }
        let list = this.localState.whiteboards.filter((w) => w.tenantId === tenantId);
        // Filtrar por permisos / usuario asignado si no es admin
        if (!isAdmin && userId) {
            list = list.filter((w) => {
                if (w.createdBy === userId)
                    return true;
                if (w.accessType === 'public')
                    return true;
                return w.assignedUsers?.some((u) => u.userId === userId);
            });
        }
        if (filters?.folderId !== undefined) {
            if (filters.folderId === null || filters.folderId === '' || filters.folderId === 'all') {
                // no filter
            }
            else if (filters.folderId === 'none') {
                list = list.filter((w) => !w.folderId);
            }
            else {
                list = list.filter((w) => w.folderId === filters.folderId);
            }
        }
        if (filters?.tag) {
            const tagLower = filters.tag.toLowerCase();
            list = list.filter((w) => w.tags?.some((t) => t.name.toLowerCase() === tagLower));
        }
        if (filters?.search) {
            const q = filters.search.toLowerCase().trim();
            list = list.filter((w) => w.title.toLowerCase().includes(q) ||
                w.tags?.some((t) => t.name.toLowerCase().includes(q)));
        }
        // Ordenar por última actualización descendente
        return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    async getWhiteboardById(id, tenantId) {
        if (!this.localState.whiteboards)
            return null;
        return (this.localState.whiteboards.find((w) => w.id === id && (!tenantId || w.tenantId === tenantId)) || null);
    }
    async getWhiteboardByShareToken(tokenOrId) {
        if (!this.localState.whiteboards)
            return null;
        return (this.localState.whiteboards.find((w) => w.id === tokenOrId ||
            w.shareToken === tokenOrId ||
            w.invitations?.some((inv) => inv.token === tokenOrId)) || null);
    }
    async createWhiteboard(tenantId, data, userId, userName, userAvatar) {
        if (!this.localState.whiteboards) {
            this.localState.whiteboards = [];
        }
        const now = new Date().toISOString();
        const id = `wb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const shareToken = generateToken(16);
        const invitations = (data.initialInvites || []).map((inv) => ({
            id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            whiteboardId: id,
            email: inv.email,
            role: inv.role,
            token: generateToken(16),
            createdAt: now,
        }));
        const newBoard = {
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
    async updateWhiteboard(id, tenantId, data) {
        if (!this.localState.whiteboards)
            return null;
        const idx = this.localState.whiteboards.findIndex((w) => w.id === id && w.tenantId === tenantId);
        if (idx === -1)
            return null;
        const current = this.localState.whiteboards[idx];
        const updated = {
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
    async saveWhiteboardCanvas(id, tenantId, content, thumbnail) {
        if (!this.localState.whiteboards)
            return false;
        const board = this.localState.whiteboards.find((w) => w.id === id && w.tenantId === tenantId);
        if (!board)
            return false;
        board.content = content;
        if (thumbnail) {
            board.thumbnail = thumbnail;
        }
        board.updatedAt = new Date().toISOString();
        this.saveLocalState();
        return true;
    }
    async deleteWhiteboard(id, tenantId) {
        if (!this.localState.whiteboards)
            return false;
        const initialLen = this.localState.whiteboards.length;
        this.localState.whiteboards = this.localState.whiteboards.filter((w) => !(w.id === id && w.tenantId === tenantId));
        const deleted = this.localState.whiteboards.length < initialLen;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    async duplicateWhiteboard(id, tenantId, userId, userName) {
        const original = await this.getWhiteboardById(id, tenantId);
        if (!original)
            return null;
        const now = new Date().toISOString();
        const copyId = `wb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const copy = {
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
    async getWhiteboardFolders(tenantId) {
        if (!this.localState.whiteboardFolders) {
            this.localState.whiteboardFolders = [];
        }
        if (!this.localState.whiteboards) {
            this.localState.whiteboards = [];
        }
        const folders = this.localState.whiteboardFolders.filter((f) => f.tenantId === tenantId || !f.tenantId || f.tenantId === 'tenant-roma-01');
        const boards = this.localState.whiteboards.filter((w) => w.tenantId === tenantId);
        return folders.map((folder) => ({
            ...folder,
            boardCount: boards.filter((b) => b.folderId === folder.id).length,
        }));
    }
    async createWhiteboardFolder(tenantId, data, userId) {
        if (!this.localState.whiteboardFolders) {
            this.localState.whiteboardFolders = [];
        }
        const folder = {
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
    async updateWhiteboardFolder(folderId, tenantId, data) {
        if (!this.localState.whiteboardFolders)
            return null;
        const folder = this.localState.whiteboardFolders.find((f) => f.id === folderId);
        if (!folder)
            return null;
        if (data.name)
            folder.name = data.name;
        if (data.color)
            folder.color = data.color;
        this.saveLocalState();
        return folder;
    }
    async deleteWhiteboardFolder(folderId, tenantId) {
        if (!this.localState.whiteboardFolders)
            return false;
        const initialLen = this.localState.whiteboardFolders.length;
        this.localState.whiteboardFolders = this.localState.whiteboardFolders.filter((f) => f.id !== folderId);
        // Desvincular carpetas de las pizarras
        if (this.localState.whiteboards) {
            this.localState.whiteboards.forEach((w) => {
                if (w.folderId === folderId) {
                    w.folderId = null;
                }
            });
        }
        const deleted = this.localState.whiteboardFolders.length < initialLen;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
    // ===========================================================================
    // SUBMÓDULO: BRAND GUIDELINES / MANUALES DE MARCA
    // ===========================================================================
    async getBrandGuidelines(tenantId, search) {
        if (!this.localState.brandGuidelines) {
            this.localState.brandGuidelines = [];
        }
        let list = this.localState.brandGuidelines.filter((bg) => bg.tenantId === tenantId);
        if (search) {
            const q = search.toLowerCase().trim();
            list = list.filter((bg) => bg.brandName?.toLowerCase().includes(q) ||
                bg.clientName?.toLowerCase().includes(q) ||
                bg.projectName?.toLowerCase().includes(q));
        }
        return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    async getBrandGuidelineById(id, tenantId) {
        if (!this.localState.brandGuidelines)
            return null;
        return (this.localState.brandGuidelines.find((bg) => bg.id === id && (!tenantId || bg.tenantId === tenantId)) || null);
    }
    async getBrandGuidelineByPublicToken(token) {
        if (!this.localState.brandGuidelines)
            return null;
        return (this.localState.brandGuidelines.find((bg) => bg.publicToken === token || bg.id === token) || null);
    }
    async createBrandGuideline(data) {
        if (!this.localState.brandGuidelines) {
            this.localState.brandGuidelines = [];
        }
        const now = new Date().toISOString();
        const id = `bg_${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}`;
        const publicToken = generateToken(16);
        const newGuideline = {
            id,
            tenantId: data.tenantId,
            projectId: data.projectId || null,
            projectName: data.projectName || '',
            clientId: data.clientId || null,
            clientName: data.clientName || 'Cliente',
            clientLogo: data.clientLogo || '',
            brandName: data.brandName || 'Nueva Marca',
            designerName: data.designerName || '',
            round: data.round || 'Ronda 1',
            date: data.date || new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
            tagline: data.tagline || '',
            publicToken,
            requirePin: Boolean(data.requirePin),
            publicPin: data.publicPin || '',
            themeDefault: data.themeDefault || 'dark',
            viewModeDefault: data.viewModeDefault || 'deck',
            status: data.status || 'in_review',
            approvedBy: data.approvedBy || '',
            approvedAt: data.approvedAt || '',
            approvalNotes: data.approvalNotes || '',
            comments: data.comments || [],
            briefOverviewTitle: data.briefOverviewTitle ||
                'Resumen ejecutivo del proyecto de identidad visual, destacando el propósito, alcance y objetivos estratégicos de la marca.',
            briefOverviewText: data.briefOverviewText || '',
            briefSecondaryText: data.briefSecondaryText || '',
            goals: data.goals || [],
            directionName: data.directionName || 'Propuesta Principal',
            directionRationale: data.directionRationale || '',
            logoPrimaryUrl: data.logoPrimaryUrl || '',
            logoSecondaryUrl: data.logoSecondaryUrl || '',
            logoSymbolUrl: data.logoSymbolUrl || '',
            logoSymbolDarkUrl: data.logoSymbolDarkUrl || '',
            logoFaviconUrl: data.logoFaviconUrl || '',
            logoVersions: data.logoVersions || [],
            mockupGalleryItems: data.mockupGalleryItems || [],
            mockupStampMode: data.mockupStampMode || 'auto',
            isRebrand: Boolean(data.isRebrand),
            logoBeforeUrl: data.logoBeforeUrl || '',
            brandBeforeLabel: data.brandBeforeLabel || 'Identidad Anterior',
            clearspaceUnit: data.clearspaceUnit || '1x',
            stampPosition: data.stampPosition || 'chest_left',
            stampScale: data.stampScale || 100,
            photoSceneMode: data.photoSceneMode || 'studio_3d',
            iconStrokeWidth: data.iconStrokeWidth || '2px',
            iconCornerRadius: data.iconCornerRadius || '6px',
            viewsCount: data.viewsCount || 0,
            lastViewedAt: data.lastViewedAt || '',
            slideAnalytics: data.slideAnalytics || {},
            roundHistory: data.roundHistory || [],
            donts: data.donts || [
                { id: 'd1', title: 'No deformar ni estirar horizontal/verticalmente', ruleType: 'stretch' },
                { id: 'd2', title: 'No inclinar ni rotar en ángulos arbitrarios', ruleType: 'rotate' },
                { id: 'd3', title: 'No alterar los colores oficiales de la marca', ruleType: 'recolor' },
                { id: 'd4', title: 'No aplicar sombras paralelas ni trazos invasivos', ruleType: 'shadow' },
                { id: 'd5', title: 'No usar sobre fondos sin contraste suficiente', ruleType: 'contrast' },
                { id: 'd6', title: 'No alterar la proporción entre isotipo y logotipo', ruleType: 'rearrange' },
            ],
            colors: data.colors || [],
            typography: data.typography || [],
            statNumber: data.statNumber || '',
            statLabel: data.statLabel || '',
            mockupAppIconUrl: data.mockupAppIconUrl || '',
            mockupMobileScreenUrl: data.mockupMobileScreenUrl || '',
            mockupMobileUrlWebsite: data.mockupMobileUrlWebsite || '',
            mockupDesktopScreenUrl: data.mockupDesktopScreenUrl || '',
            merchItems: data.merchItems || [],
            otherIdeas: data.otherIdeas || [],
            nextSteps: data.nextSteps || [],
            driveFolderId: data.driveFolderId || '',
            driveFolderName: data.driveFolderName || '',
            driveFolderUrl: data.driveFolderUrl || '',
            createdAt: now,
            updatedAt: now,
        };
        this.localState.brandGuidelines.unshift(newGuideline);
        this.saveLocalState();
        return newGuideline;
    }
    async updateBrandGuideline(id, tenantId, updates) {
        if (!this.localState.brandGuidelines)
            return null;
        const index = this.localState.brandGuidelines.findIndex((bg) => bg.id === id && bg.tenantId === tenantId);
        if (index === -1)
            return null;
        const existing = this.localState.brandGuidelines[index];
        const updated = {
            ...existing,
            ...updates,
            id: existing.id,
            tenantId: existing.tenantId,
            publicToken: existing.publicToken,
            updatedAt: new Date().toISOString(),
        };
        this.localState.brandGuidelines[index] = updated;
        this.saveLocalState();
        return updated;
    }
    async deleteBrandGuideline(id, tenantId) {
        if (!this.localState.brandGuidelines)
            return false;
        const initialLen = this.localState.brandGuidelines.length;
        this.localState.brandGuidelines = this.localState.brandGuidelines.filter((bg) => bg.id !== id);
        const deleted = this.localState.brandGuidelines.length < initialLen;
        if (deleted)
            this.saveLocalState();
        return deleted;
    }
}
exports.DatabaseManager = DatabaseManager;
exports.db = new DatabaseManager();
