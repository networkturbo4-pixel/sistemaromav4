"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleDriveService = exports.GoogleDriveService = void 0;
const googleapis_1 = require("googleapis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class GoogleDriveService {
    driveClient = null;
    authClient = null;
    authType = 'none';
    accountEmail = '';
    customRootFolderId = null;
    constructor() {
        this.initAuth();
    }
    /**
     * Inicializa la autenticación con Google APIs soportando Service Account u OAuth2 Refresh Token
     */
    initAuth() {
        try {
            // 1. Probar con Service Account JSON String en variable de entorno
            const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
            if (serviceAccountJson) {
                let credentials;
                try {
                    credentials = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
                }
                catch {
                    // Si es base64
                    try {
                        const decoded = Buffer.from(serviceAccountJson, 'base64').toString('utf-8');
                        credentials = JSON.parse(decoded);
                    }
                    catch { }
                }
                if (credentials && credentials.client_email && credentials.private_key) {
                    const jwtClient = new googleapis_1.google.auth.JWT({
                        email: credentials.client_email,
                        key: credentials.private_key,
                        scopes: ['https://www.googleapis.com/auth/drive'],
                    });
                    this.authClient = jwtClient;
                    this.driveClient = googleapis_1.google.drive({ version: 'v3', auth: jwtClient });
                    this.authType = 'service_account';
                    this.accountEmail = credentials.client_email;
                    return true;
                }
            }
            // 2. Probar con variables individuales de Service Account
            const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
            const privateKey = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;
            if (clientEmail && privateKey) {
                const jwtClient = new googleapis_1.google.auth.JWT({
                    email: clientEmail,
                    key: privateKey,
                    scopes: ['https://www.googleapis.com/auth/drive'],
                });
                this.authClient = jwtClient;
                this.driveClient = googleapis_1.google.drive({ version: 'v3', auth: jwtClient });
                this.authType = 'service_account';
                this.accountEmail = clientEmail;
                return true;
            }
            // 3. Probar con OAuth2 Refresh Token (Cuenta Central de la Agencia)
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
            const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
            if (clientId && clientSecret && refreshToken) {
                const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret);
                oauth2Client.setCredentials({ refresh_token: refreshToken });
                this.authClient = oauth2Client;
                this.driveClient = googleapis_1.google.drive({ version: 'v3', auth: oauth2Client });
                this.authType = 'oauth2';
                this.accountEmail = 'Cuenta Central OAuth2';
                return true;
            }
            // Si no hay credenciales configuradas
            this.authClient = null;
            this.driveClient = null;
            this.authType = 'none';
            return false;
        }
        catch (err) {
            console.error('[GoogleDriveService] Error inicializando credenciales:', err);
            this.authClient = null;
            this.driveClient = null;
            this.authType = 'none';
            return false;
        }
    }
    isReady() {
        return this.driveClient !== null && this.authClient !== null;
    }
    getRootFolderId() {
        return this.customRootFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || undefined;
    }
    setCustomRootFolderId(folderId) {
        this.customRootFolderId = folderId ? folderId.trim() : null;
    }
    /**
     * Valida credenciales dinámicas en tiempo real y opcionalmente las aplica al servicio
     */
    async testAndApplyConfig(config, save = false) {
        try {
            let testAuthClient = null;
            let testDriveClient = null;
            let resolvedEmail = '';
            let resolvedAuthType = 'none';
            if (config.authType === 'env') {
                const ok = this.initAuth();
                if (!ok) {
                    return {
                        configured: false,
                        connected: false,
                        authType: 'none',
                        error: 'No se encontraron variables de entorno válidas en el archivo .env',
                    };
                }
                return await this.checkConnection();
            }
            if (config.authType === 'service_account_json') {
                if (!config.serviceAccountJson || !config.serviceAccountJson.trim()) {
                    throw new Error('Debes pegar el contenido JSON de la cuenta de servicio de Google Cloud.');
                }
                let parsed;
                try {
                    parsed = JSON.parse(config.serviceAccountJson.trim());
                }
                catch {
                    throw new Error('El texto ingresado no es un JSON válido.');
                }
                if (!parsed.client_email || !parsed.private_key) {
                    throw new Error('El JSON no contiene los campos client_email o private_key obligatorios.');
                }
                testAuthClient = new googleapis_1.google.auth.JWT({
                    email: parsed.client_email,
                    key: parsed.private_key,
                    scopes: ['https://www.googleapis.com/auth/drive'],
                });
                testDriveClient = googleapis_1.google.drive({ version: 'v3', auth: testAuthClient });
                resolvedEmail = parsed.client_email;
                resolvedAuthType = 'service_account';
            }
            else if (config.authType === 'service_account_fields') {
                if (!config.serviceAccountEmail || !config.privateKey) {
                    throw new Error('El email de servicio y la clave privada (Private Key) son obligatorios.');
                }
                const formattedKey = config.privateKey.replace(/\\n/g, '\n').trim();
                testAuthClient = new googleapis_1.google.auth.JWT({
                    email: config.serviceAccountEmail.trim(),
                    key: formattedKey,
                    scopes: ['https://www.googleapis.com/auth/drive'],
                });
                testDriveClient = googleapis_1.google.drive({ version: 'v3', auth: testAuthClient });
                resolvedEmail = config.serviceAccountEmail.trim();
                resolvedAuthType = 'service_account';
            }
            else if (config.authType === 'oauth2') {
                if (!config.clientId || !config.clientSecret || !config.refreshToken) {
                    throw new Error('Client ID, Client Secret y Refresh Token son obligatorios.');
                }
                testAuthClient = new googleapis_1.google.auth.OAuth2(config.clientId.trim(), config.clientSecret.trim());
                testAuthClient.setCredentials({ refresh_token: config.refreshToken.trim() });
                testDriveClient = googleapis_1.google.drive({ version: 'v3', auth: testAuthClient });
                resolvedEmail = 'Cuenta Central OAuth2';
                resolvedAuthType = 'oauth2';
            }
            else {
                throw new Error('Selecciona un tipo de autenticación válido.');
            }
            // Validar conexión haciendo una consulta mínima de prueba
            await testDriveClient.files.list({
                pageSize: 1,
                fields: 'files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });
            // Si especificó una carpeta raíz, verificar que exista y tengamos acceso de lectura
            let rootFolderName = 'Mi Unidad / Root';
            const targetRootId = config.rootFolderId?.trim();
            if (targetRootId) {
                try {
                    const folderRes = await testDriveClient.files.get({
                        fileId: targetRootId,
                        fields: 'id, name',
                        supportsAllDrives: true,
                    });
                    if (folderRes.data?.name) {
                        rootFolderName = folderRes.data.name;
                    }
                }
                catch (fErr) {
                    throw new Error(`Conexión exitosa con Google, pero no se pudo acceder a la carpeta raíz "${targetRootId}". Asegúrate de haber compartido esa carpeta con "${resolvedEmail}" con rol de Editor.`);
                }
            }
            // Si se indicó guardar, actualizar el cliente en memoria inmediatamente
            if (save) {
                this.authClient = testAuthClient;
                this.driveClient = testDriveClient;
                this.accountEmail = resolvedEmail;
                this.authType = resolvedAuthType;
                this.customRootFolderId = targetRootId || null;
            }
            return {
                configured: true,
                connected: true,
                authType: resolvedAuthType,
                accountEmail: resolvedEmail,
                rootFolderId: targetRootId,
                rootFolderName,
            };
        }
        catch (err) {
            return {
                configured: true,
                connected: false,
                authType: config.authType,
                error: err.message || 'Error desconocido al validar credenciales.',
            };
        }
    }
    /**
     * Obtiene un Access Token fresco para peticiones de subida directa
     */
    async getAccessToken() {
        if (!this.authClient) {
            throw new Error('Google Drive no está autenticado en el servidor.');
        }
        const tokenInfo = await this.authClient.getAccessToken();
        if (typeof tokenInfo === 'string')
            return tokenInfo;
        if (tokenInfo && tokenInfo.token)
            return tokenInfo.token;
        throw new Error('No se pudo obtener el token de acceso de Google.');
    }
    /**
     * Comprueba el estado de la conexión con Google Drive
     */
    async checkConnection() {
        if (!this.isReady()) {
            return {
                configured: false,
                connected: false,
                authType: this.authType,
                error: 'No se han configurado credenciales de Google Drive en las variables de entorno.',
            };
        }
        try {
            const rootFolderId = this.getRootFolderId();
            let rootFolderName = 'Mi Unidad / Root';
            if (rootFolderId) {
                try {
                    const res = await this.driveClient.files.get({
                        fileId: rootFolderId,
                        fields: 'id, name',
                        supportsAllDrives: true,
                    });
                    if (res.data?.name) {
                        rootFolderName = res.data.name;
                    }
                }
                catch {
                    rootFolderName = `Carpeta (${rootFolderId})`;
                }
            }
            // Probar consulta simple de cuota o listar 1 archivo
            await this.driveClient.files.list({
                pageSize: 1,
                fields: 'files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });
            return {
                configured: true,
                connected: true,
                authType: this.authType,
                accountEmail: this.accountEmail,
                rootFolderId: rootFolderId,
                rootFolderName: rootFolderName,
            };
        }
        catch (err) {
            return {
                configured: true,
                connected: false,
                authType: this.authType,
                accountEmail: this.accountEmail,
                error: err?.message || 'Error al conectar con la API de Google Drive',
            };
        }
    }
    /**
     * Inicia una sesión de Resumable Upload (para subidas directas ultrarrápidas de 300MB - 1GB+)
     * El cliente recibirá la session URL para subir directo a los servidores de Google con progreso en tiempo real.
     */
    async initiateResumableUpload(params) {
        if (!this.isReady()) {
            throw new Error('Google Drive no está configurado en el servidor.');
        }
        const accessToken = await this.getAccessToken();
        const targetParentId = params.parentFolderId || this.getRootFolderId();
        const metadata = {
            name: params.fileName,
            mimeType: params.mimeType,
        };
        if (targetParentId && !params.replaceFileId) {
            metadata.parents = [targetParentId];
        }
        const requestHeaders = {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': params.mimeType,
            'X-Upload-Content-Length': params.fileSize.toString(),
        };
        if (params.origin) {
            requestHeaders['Origin'] = params.origin;
        }
        const endpointUrl = params.replaceFileId
            ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(params.replaceFileId)}?uploadType=resumable&supportsAllDrives=true`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true';
        const response = await fetch(endpointUrl, {
            method: params.replaceFileId ? 'PATCH' : 'POST',
            headers: requestHeaders,
            body: JSON.stringify(metadata),
        });
        if (!response.ok) {
            const errText = await response.text();
            let cleanMessage = errText;
            try {
                const parsed = JSON.parse(errText);
                if (parsed.error?.message) {
                    cleanMessage = parsed.error.message;
                }
            }
            catch { }
            if (cleanMessage.includes('storageQuotaExceeded') || cleanMessage.includes('storage quota')) {
                cleanMessage =
                    'Google Drive rechazó la subida por límite de cuota: Las Cuentas de Servicio (Service Account) tienen 0 MB de cuota en Google Drive personal. Para subir archivos grandes, la carpeta debe estar en una "Unidad Compartida" (Shared Drive) de Google Workspace o conectar mediante OAuth 2.0 en Configuración > Google Drive & APIs.';
            }
            throw new Error(cleanMessage);
        }
        const sessionUri = response.headers.get('location');
        if (!sessionUri) {
            throw new Error('Google Drive no devolvió la cabecera Location para la sesión de subida.');
        }
        return {
            uploadUrl: sessionUri,
            parentFolderId: targetParentId || '',
        };
    }
    /**
     * Subida estándar de respaldo vía stream para peticiones multipart del backend
     */
    async uploadStream(params) {
        if (!this.isReady()) {
            throw new Error('Google Drive no está configurado en el servidor.');
        }
        const targetParentId = params.parentFolderId || this.getRootFolderId();
        const requestBody = {
            name: params.fileName,
            mimeType: params.mimeType,
        };
        if (targetParentId && !params.replaceFileId) {
            requestBody.parents = [targetParentId];
        }
        let res;
        try {
            if (params.replaceFileId) {
                res = await this.driveClient.files.update({
                    fileId: params.replaceFileId,
                    requestBody,
                    media: {
                        mimeType: params.mimeType,
                        body: params.stream,
                    },
                    fields: 'id, name, mimeType, size, starred, webViewLink, webContentLink, iconLink, thumbnailLink, imageMediaMetadata(width,height), videoMediaMetadata(width,height,durationMillis)',
                    supportsAllDrives: true,
                });
            }
            else {
                res = await this.driveClient.files.create({
                    requestBody,
                    media: {
                        mimeType: params.mimeType,
                        body: params.stream,
                    },
                    fields: 'id, name, mimeType, size, starred, webViewLink, webContentLink, iconLink, thumbnailLink, imageMediaMetadata(width,height), videoMediaMetadata(width,height,durationMillis)',
                    supportsAllDrives: true,
                });
            }
        }
        catch (createErr) {
            let msg = createErr.message || 'Error al subir archivo a Google Drive';
            if (msg.includes('storageQuotaExceeded') || msg.includes('storage quota')) {
                msg =
                    'Google Drive rechazó la subida por límite de cuota: Las Cuentas de Servicio tienen 0 MB de cuota en Google Drive personal. Para subir archivos grandes, la carpeta debe estar en una "Unidad Compartida" (Shared Drive) de Google Workspace o conectar mediante OAuth 2.0 en Configuración > Google Drive & APIs.';
            }
            throw new Error(msg);
        }
        // Otorgar permiso de lectura pública para previsualización inmediata si es deseado
        try {
            await this.makePubliclyReadable(res.data.id);
        }
        catch { }
        return res.data;
    }
    /**
     * Obtiene los metadatos completos de un archivo ya subido en Google Drive
     */
    async getFileMetadata(fileId) {
        if (!this.isReady()) {
            throw new Error('Google Drive no está configurado.');
        }
        const res = await this.driveClient.files.get({
            fileId,
            fields: 'id, name, mimeType, size, starred, folderColorRgb, webViewLink, webContentLink, iconLink, thumbnailLink, parents, imageMediaMetadata(width,height), videoMediaMetadata(width,height,durationMillis)',
            supportsAllDrives: true,
        });
        return res.data;
    }
    /**
     * Asigna permiso de lectura pública para que el link webViewLink / thumbnail funcione en el sistema
     */
    async makePubliclyReadable(fileId) {
        if (!this.isReady())
            return;
        try {
            await this.driveClient.permissions.create({
                fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
                supportsAllDrives: true,
            });
        }
        catch (e) {
            // Ignorar si la política del dominio no permite 'anyone'
            console.warn(`[GoogleDrive] No se pudo hacer público el archivo ${fileId}:`, e.message);
        }
    }
    /**
     * Crea una carpeta en Google Drive
     */
    async createFolder(name, parentFolderId) {
        if (!this.isReady()) {
            throw new Error('Google Drive no está configurado en el servidor.');
        }
        const targetParentId = parentFolderId || this.getRootFolderId();
        const requestBody = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
        };
        if (targetParentId) {
            requestBody.parents = [targetParentId];
        }
        const res = await this.driveClient.files.create({
            requestBody,
            fields: 'id, name, webViewLink',
            supportsAllDrives: true,
        });
        try {
            await this.makePubliclyReadable(res.data.id);
        }
        catch { }
        return {
            id: res.data.id,
            name: res.data.name,
            webViewLink: res.data.webViewLink,
        };
    }
    /**
     * Crea una estructura de carpetas jerárquica predefinida (Blueprint)
     * Ej: Carpeta Principal: "[Cliente] ABC Corp"
     *     Subcarpetas: "01_Brief_y_Contratos", "02_Identidad_y_Logos", "03_Entregables_Finales", "04_Facturacion"
     */
    async createBlueprintHierarchy(parentName, subfolderNames, rootFolderId) {
        // 1. Crear carpeta contenedora
        const mainFolder = await this.createFolder(parentName, rootFolderId);
        // 2. Crear las subcarpetas dentro de la carpeta contenedora en paralelo
        const subfolderPromises = subfolderNames.map(async (name) => {
            const created = await this.createFolder(name, mainFolder.id);
            return created;
        });
        const subfolders = await Promise.all(subfolderPromises);
        return {
            mainFolder,
            subfolders,
        };
    }
    /**
     * Renombra un archivo o carpeta en Google Drive
     */
    async renameFileOrFolder(fileId, newName) {
        if (!this.isReady()) {
            throw new Error('Google Drive no está configurado en el servidor.');
        }
        const res = await this.driveClient.files.update({
            fileId,
            requestBody: {
                name: newName,
            },
            fields: 'id, name',
            supportsAllDrives: true,
        });
        return {
            id: res.data.id,
            name: res.data.name,
        };
    }
    /**
     * Actualiza metadatos de un archivo o carpeta (nombre, destacado/starred, color de carpeta)
     */
    async updateItemMetadata(fileId, updates) {
        if (!this.isReady()) {
            throw new Error('Google Drive no está configurado en el servidor.');
        }
        const requestBody = {};
        if (updates.name !== undefined)
            requestBody.name = updates.name;
        if (updates.starred !== undefined)
            requestBody.starred = updates.starred;
        if (updates.folderColorRgb !== undefined)
            requestBody.folderColorRgb = updates.folderColorRgb;
        const res = await this.driveClient.files.update({
            fileId,
            requestBody,
            fields: 'id, name, starred, folderColorRgb',
            supportsAllDrives: true,
        });
        return res.data;
    }
    /**
     * Mueve un archivo o carpeta a una nueva carpeta padre en Google Drive
     */
    async moveFileOrFolder(fileId, newParentId, oldParentId) {
        if (!this.isReady()) {
            throw new Error('Google Drive no está configurado en el servidor.');
        }
        let removeParents = oldParentId || '';
        if (!removeParents) {
            try {
                const meta = await this.driveClient.files.get({
                    fileId,
                    fields: 'parents',
                    supportsAllDrives: true,
                });
                if (meta.data.parents && meta.data.parents.length > 0) {
                    removeParents = meta.data.parents.join(',');
                }
            }
            catch { }
        }
        const res = await this.driveClient.files.update({
            fileId,
            addParents: newParentId,
            ...(removeParents ? { removeParents } : {}),
            fields: 'id, name, parents',
            supportsAllDrives: true,
        });
        return res.data;
    }
    /**
     * Obtiene respuesta de streaming directo (con soporte HTTP Range 206) para Video, Audio, PDF e Imágenes
     */
    async streamFileMedia(fileId, rangeHeader) {
        if (!this.isReady()) {
            throw new Error('Google Drive no está configurado en el servidor.');
        }
        const accessToken = await this.getAccessToken();
        const headers = {
            Authorization: `Bearer ${accessToken}`,
        };
        if (rangeHeader) {
            headers['Range'] = rangeHeader;
        }
        const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
        return fetch(url, {
            method: 'GET',
            headers,
        });
    }
    /**
     * Obtiene miniatura real de alta resolución (para .psd, .ai, .indd, .pdf, videos e imágenes)
     */
    async fetchHighResThumbnail(fileId, size = 1000) {
        if (!this.isReady())
            return null;
        try {
            const accessToken = await this.getAccessToken();
            const meta = await this.driveClient.files.get({
                fileId,
                fields: 'id, mimeType, thumbnailLink',
                supportsAllDrives: true,
            });
            let thumbUrl = meta.data?.thumbnailLink;
            if (thumbUrl) {
                thumbUrl = thumbUrl.replace(/=s\d+.*$/, `=s${size}`);
                const res = await fetch(thumbUrl, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (res.ok) {
                    const arr = await res.arrayBuffer();
                    return {
                        buffer: Buffer.from(arr),
                        contentType: res.headers.get('content-type') || 'image/jpeg',
                    };
                }
            }
            // Si es imagen directa y no devolvió thumbnailLink aún, usar alt=media
            if (meta.data?.mimeType?.startsWith('image/')) {
                const mediaRes = await this.streamFileMedia(fileId);
                if (mediaRes.ok) {
                    const arr = await mediaRes.arrayBuffer();
                    return {
                        buffer: Buffer.from(arr),
                        contentType: mediaRes.headers.get('content-type') || meta.data.mimeType,
                    };
                }
            }
        }
        catch (err) {
            console.warn(`[GoogleDrive] No se pudo obtener miniatura para ${fileId}:`, err.message);
        }
        return null;
    }
    /**
     * Elimina un archivo o carpeta de Google Drive
     */
    async deleteFileOrFolder(fileId) {
        if (!this.isReady()) {
            throw new Error('Google Drive no está configurado en el servidor.');
        }
        await this.driveClient.files.delete({
            fileId,
            supportsAllDrives: true,
        });
    }
    /**
     * Lista archivos y carpetas directamente desde Google Drive dentro de una carpeta dada
     */
    async listGoogleDriveContents(parentFolderId) {
        if (!this.isReady()) {
            throw new Error('Google Drive no está configurado en el servidor.');
        }
        const targetFolderId = parentFolderId || this.getRootFolderId();
        let q = "trashed = false";
        if (targetFolderId) {
            q += ` and '${targetFolderId}' in parents`;
        }
        const res = await this.driveClient.files.list({
            q,
            fields: 'files(id, name, mimeType, size, starred, folderColorRgb, webViewLink, webContentLink, iconLink, thumbnailLink, createdTime, modifiedTime, imageMediaMetadata(width,height), videoMediaMetadata(width,height,durationMillis))',
            pageSize: 100,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            orderBy: 'folder, modifiedTime desc',
        });
        return res.data.files || [];
    }
    /**
     * Sincronización bidireccional: obtiene los IDs de archivos y carpetas no eliminados en Google Drive
     */
    async getActiveItemsInRoot() {
        if (!this.isReady()) {
            return { synced: false, activeFolderIds: new Set(), activeFileIds: new Set(), newFolders: [], newFiles: [] };
        }
        try {
            const rootId = this.getRootFolderId();
            const res = await this.driveClient.files.list({
                q: 'trashed = false',
                fields: 'files(id, name, mimeType, size, starred, folderColorRgb, parents, trashed, webViewLink, webContentLink, thumbnailLink, imageMediaMetadata(width,height), videoMediaMetadata(width,height,durationMillis))',
                pageSize: 1000,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });
            const files = res.data.files || [];
            const activeFolderIds = new Set();
            const activeFileIds = new Set();
            const newFolders = [];
            const newFiles = [];
            for (const item of files) {
                if (!item.id || item.id === rootId)
                    continue;
                if (item.mimeType === 'application/vnd.google-apps.folder') {
                    activeFolderIds.add(item.id);
                    newFolders.push(item);
                }
                else {
                    activeFileIds.add(item.id);
                    newFiles.push(item);
                }
            }
            return { synced: true, activeFolderIds, activeFileIds, newFolders, newFiles };
        }
        catch (err) {
            console.warn('[Google Drive Sync] Error listando items activos:', err);
            return { synced: false, activeFolderIds: new Set(), activeFileIds: new Set(), newFolders: [], newFiles: [] };
        }
    }
}
exports.GoogleDriveService = GoogleDriveService;
exports.googleDriveService = new GoogleDriveService();
