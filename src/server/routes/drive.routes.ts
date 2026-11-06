import { Router, Response } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { google } from 'googleapis';
import {
  AuthenticatedRequest,
  requireAuth,
  requirePermission,
} from '../middleware/auth';
import { db } from '../db';
import { googleDriveService } from '../services/googleDriveService';
import { TenantDriveConfig, DriveConnectionStatus } from '../../shared/types';
import { notifyEvent } from '../services/notificationService';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB límite para upload directo por servidor; archivos mayores usan resumable directo
});

// =============================================================================
// 1. ESTADO DE CONEXIÓN Y CONFIGURACIÓN DINÁMICA DE GOOGLE DRIVE (CACHE ULTRA-RÁPIDO)
// =============================================================================

let cachedConfigHash = '';
let cachedStatus: DriveConnectionStatus | null = null;
let lastStatusFetchTime = 0;
let lastFullSyncTime = 0;
let activeSyncPromise: Promise<{ synced: boolean; activeFileIds: Set<string>; activeFolderIds: Set<string>; newFiles: any[]; newFolders: any[] }> | null = null;

async function ensureDriveConfig(req: AuthenticatedRequest) {
  try {
    const tenantId = req.auth?.tenant?.id;
    if (tenantId) {
      const tenant = await db.getTenantById(tenantId);
      const cfg = tenant?.driveConfig;
      if (cfg && cfg.authType && cfg.authType !== 'none') {
        const hash = `${cfg.authType}:${cfg.clientId || ''}:${cfg.refreshToken || ''}:${cfg.rootFolderId || ''}:${cfg.serviceAccountEmail || ''}`;
        if (!googleDriveService.isReady() || cachedConfigHash !== hash) {
          cachedConfigHash = hash;
          const status = await googleDriveService.testAndApplyConfig(cfg as any, true);
          cachedStatus = status;
          lastStatusFetchTime = Date.now();
        }
      }
    }
  } catch (err) {
    // Continuar y dejar que cada ruta maneje su respuesta
  }
}

async function getCachedStatus(req: AuthenticatedRequest, force = false): Promise<DriveConnectionStatus> {
  const now = Date.now();
  if (!force && cachedStatus && (now - lastStatusFetchTime < 60000)) {
    return cachedStatus;
  }
  await ensureDriveConfig(req);
  if (!googleDriveService.isReady()) {
    return {
      configured: false,
      connected: false,
      authType: 'none',
      error: 'Google Drive no configurado',
    };
  }
  cachedStatus = await googleDriveService.checkConnection();
  lastStatusFetchTime = now;
  return cachedStatus;
}

// Sincronización compartida (deduplicada) con Google Drive en segundo plano
async function runSharedGoogleSync(tenantId: string, force = false) {
  const now = Date.now();
  if (!force && now - lastFullSyncTime < 60000) {
    return;
  }

  if (!googleDriveService.isReady()) return;

  if (!activeSyncPromise) {
    activeSyncPromise = googleDriveService.getActiveItemsInRoot().finally(() => {
      activeSyncPromise = null;
      lastFullSyncTime = Date.now();
    });
  }

  try {
    const { synced, activeFileIds, activeFolderIds, newFiles, newFolders } = await activeSyncPromise;
    if (!synced) return;

    // Sincronizar archivos locales
    const localFiles = await db.getDriveFiles(tenantId);
    const localFileGoogleIds = new Set(localFiles.map((f) => f.googleFileId));

    for (const file of localFiles) {
      if (file.googleFileId && !activeFileIds.has(file.googleFileId)) {
        await db.deleteDriveFile(file.id, tenantId);
      }
    }

    const rootFolderId = googleDriveService.getRootFolderId() || '';
    const currentFolders = await db.getDriveFolders(tenantId);
    const tenantFolderGoogleIds = new Set([
      rootFolderId,
      ...currentFolders.map((f) => f.googleFolderId),
    ]);

    if (Array.isArray(newFiles)) {
      for (const gFile of newFiles) {
        if (!gFile.id) continue;
        const parentId = gFile.parents?.[0] || '';
        if (rootFolderId && (!parentId || !tenantFolderGoogleIds.has(parentId))) continue;

        const width = gFile.imageMediaMetadata?.width || gFile.videoMediaMetadata?.width;
        const height = gFile.imageMediaMetadata?.height || gFile.videoMediaMetadata?.height;
        const durationMillis = gFile.videoMediaMetadata?.durationMillis;

        if (!localFileGoogleIds.has(gFile.id)) {
          await db.createDriveFile({
            tenantId,
            googleFileId: gFile.id,
            name: gFile.name || 'archivo_drive',
            mimeType: gFile.mimeType || 'application/octet-stream',
            size: Number(gFile.size) || 0,
            webViewLink: gFile.webViewLink || '',
            webContentLink: gFile.webContentLink || '',
            thumbnailLink: gFile.thumbnailLink || '',
            parentFolderId: parentId,
            category: 'general',
            starred: Boolean(gFile.starred),
            width: width ? Number(width) : undefined,
            height: height ? Number(height) : undefined,
            durationMillis: durationMillis ? Number(durationMillis) : undefined,
            createdBy: 'Google Drive Sync',
          });
        }
      }
    }

    // Sincronizar carpetas
    const currentLocalFolders = await db.getDriveFolders(tenantId);
    const localGoogleIdMap = new Map<string, any>();
    for (const lf of currentLocalFolders) {
      localGoogleIdMap.set(lf.googleFolderId, lf);
      if (!activeFolderIds.has(lf.googleFolderId)) {
        await db.deleteDriveFolder(lf.googleFolderId, tenantId);
      }
    }

    const validParentIds = new Set([rootFolderId, ...Array.from(localGoogleIdMap.keys())]);
    for (let pass = 0; pass < 3; pass++) {
      let addedInPass = false;
      for (const gFolder of newFolders) {
        if (!localGoogleIdMap.has(gFolder.id)) {
          if (gFolder.id === rootFolderId) continue;
          const parentId = gFolder.parents?.[0] || '';
          if (rootFolderId && (!parentId || !validParentIds.has(parentId))) continue;

          const created = await db.createDriveFolder({
            tenantId,
            googleFolderId: gFolder.id,
            name: gFolder.name || 'Carpeta de Drive',
            parentGoogleFolderId: parentId,
            folderType: 'custom',
            color: gFolder.folderColorRgb || '',
            starred: Boolean(gFolder.starred),
            webViewLink: gFolder.webViewLink || '',
          });
          localGoogleIdMap.set(gFolder.id, created);
          validParentIds.add(gFolder.id);
          addedInPass = true;
        }
      }
      if (!addedInPass) break;
    }
  } catch (err: any) {
    console.warn('[Sync Background Warning]:', err.message);
  }
}

router.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const force = req.query.force === 'true';
    const status = await getCachedStatus(req, force);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/config', requireAuth, requirePermission('drive.settings'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenant = await db.getTenantById(req.auth!.tenant.id);
    const driveConfig = tenant?.driveConfig || { authType: 'none' };

    // Enmascarar claves privadas para que no viajen en texto plano al frontend
    const maskedConfig = {
      ...driveConfig,
      privateKey: driveConfig.privateKey ? '••••••••••••••••' : '',
      clientSecret: driveConfig.clientSecret ? '••••••••••••••••' : '',
      serviceAccountJson: driveConfig.serviceAccountJson ? '{"type":"service_account",... [CONFIGURADO]}' : '',
    };

    const status = await googleDriveService.checkConnection();

    res.json({
      config: maskedConfig,
      status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/config/test', requireAuth, requirePermission('drive.settings'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const testResult = await googleDriveService.testAndApplyConfig(req.body, false);
    res.json(testResult);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/config', requireAuth, requirePermission('drive.settings'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth!.tenant.id;
    const bodyConfig = req.body;

    // Si viene enmascarado y el tenant ya tenía la clave guardada, conservar la anterior
    const existingTenant = await db.getTenantById(tenantId);
    const prevConfig = (existingTenant?.driveConfig || {}) as Partial<TenantDriveConfig>;

    let resolvedPrivateKey = bodyConfig.privateKey;
    if (resolvedPrivateKey === '••••••••••••••••' || !resolvedPrivateKey) {
      resolvedPrivateKey = prevConfig.privateKey || '';
    }

    let resolvedClientSecret = bodyConfig.clientSecret;
    if (resolvedClientSecret === '••••••••••••••••' || !resolvedClientSecret) {
      resolvedClientSecret = prevConfig.clientSecret || '';
    }

    let resolvedJson = bodyConfig.serviceAccountJson;
    if (resolvedJson && resolvedJson.includes('[CONFIGURADO]')) {
      resolvedJson = prevConfig.serviceAccountJson || '';
    }

    // Si es JSON de Service Account, autocompletar email y privateKey si faltan
    let serviceAccountEmail = bodyConfig.serviceAccountEmail || prevConfig.serviceAccountEmail;
    if (bodyConfig.authType === 'service_account_json' && resolvedJson) {
      try {
        const parsed = JSON.parse(resolvedJson);
        if (parsed.client_email) serviceAccountEmail = parsed.client_email;
        if (parsed.private_key && (!resolvedPrivateKey || resolvedPrivateKey === '••••••••••••••••')) {
          resolvedPrivateKey = parsed.private_key;
        }
      } catch {}
    }

    const finalConfigToTest: any = {
      ...bodyConfig,
      serviceAccountEmail,
      privateKey: resolvedPrivateKey,
      clientSecret: resolvedClientSecret,
      serviceAccountJson: resolvedJson,
    };

    // 1. Probar y aplicar la configuración con Google Drive
    let result: any = { connected: false, configured: false, authType: bodyConfig.authType, error: '' };
    try {
      result = await googleDriveService.testAndApplyConfig(finalConfigToTest, true);
    } catch (testErr: any) {
      result = {
        connected: false,
        configured: true,
        authType: bodyConfig.authType,
        error: testErr.message || 'Error al validar con Google',
      };
    }

    // 2. SIEMPRE GUARDAR EN LA BASE DE DATOS DEL TENANT PARA NO PERDER DATOS AL RECARGAR
    const updatedTenant = await db.updateTenantDriveConfig(tenantId, {
      ...finalConfigToTest,
      rootFolderName: result.rootFolderName || finalConfigToTest.rootFolderName || 'Mi Unidad',
    });

    if (!result.connected) {
      return res.json({
        success: true,
        warning: true,
        message: 'Configuración guardada en el sistema, pero Google Drive reportó un detalle de conexión.',
        error: result.error || 'Credenciales guardadas. Revisa los permisos o activa la API en Google Cloud.',
        status: result,
        tenant: updatedTenant,
      });
    }

    res.json({
      success: true,
      status: result,
      message: '¡Configuración de Google Drive guardada y conectada con éxito!',
      tenant: updatedTenant,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 1.1 AUTORIZACIÓN AUTOMÁTICA OAUTH 2.0 (1 CLIC)
// =============================================================================

router.get(
  '/oauth/authorize',
  requireAuth,
  requirePermission('drive.settings'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const tenant = await db.getTenantById(tenantId);
      const prevConfig = (tenant?.driveConfig || {}) as Partial<TenantDriveConfig>;

      const clientId = (req.query.clientId as string)?.trim() || prevConfig.clientId;
      const clientSecret = (req.query.clientSecret as string)?.trim() || prevConfig.clientSecret;

      if (!clientId || !clientSecret) {
        res.status(400).json({ error: 'Debes ingresar Client ID y Client Secret antes de autorizar.' });
        return;
      }

      await db.updateTenantDriveConfig(tenantId, {
        ...prevConfig,
        clientId,
        clientSecret,
      });

      const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5173';
      const protocol = req.protocol || 'http';
      const frontendOrigin = (req.query.origin as string)?.trim() || `${protocol}://${host}`;
      const redirectUri =
        (req.query.redirectUri as string)?.trim() || `${frontendOrigin}/api/drive/oauth/callback`;

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

      const stateObj = {
        tenantId,
        redirectUri,
        frontendOrigin,
      };
      const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
        state,
      });

      res.json({ authUrl, redirectUri });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/oauth/callback', async (req, res) => {
  let fallbackOrigin = 'http://localhost:5173';
  try {
    const { code, state, error } = req.query;

    let parsedState: any = {};
    if (state) {
      try {
        parsedState = JSON.parse(Buffer.from(String(state), 'base64').toString('utf8'));
        if (parsedState.frontendOrigin) fallbackOrigin = parsedState.frontendOrigin;
      } catch {}
    }

    if (error) {
      const errMsg = `Google denegó el acceso: ${String(error)}`;
      return res.send(`
        <!DOCTYPE html>
        <html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#fff1f2;color:#9f1239;">
          <h2>Acceso Denegado</h2>
          <p>${errMsg}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'ROMA_GOOGLE_OAUTH_ERROR', error: '${errMsg}' }, '*');
              setTimeout(() => window.close(), 3000);
            } else {
              window.location.href = '${fallbackOrigin}/?module=settings&tab=drive&oauth=error&msg=' + encodeURIComponent('${errMsg}');
            }
          </script>
        </body></html>
      `);
    }

    if (!code || !state) {
      return res.redirect(`${fallbackOrigin}/?module=settings&tab=drive&oauth=error&msg=Faltan_parametros`);
    }

    const { tenantId, redirectUri } = parsedState;
    if (!tenantId) {
      return res.redirect(`${fallbackOrigin}/?module=settings&tab=drive&oauth=error&msg=Tenant_no_identificado`);
    }

    const tenant = await db.getTenantById(tenantId);
    if (!tenant || !tenant.driveConfig?.clientId || !tenant.driveConfig?.clientSecret) {
      return res.redirect(`${fallbackOrigin}/?module=settings&tab=drive&oauth=error&msg=Credenciales_no_encontradas`);
    }

    const oauth2Client = new google.auth.OAuth2(
      tenant.driveConfig.clientId,
      tenant.driveConfig.clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(String(code));
    const refreshToken = tokens.refresh_token || tenant.driveConfig.refreshToken;

    if (!refreshToken) {
      const tokenErr = 'Google no devolvió un Refresh Token. Revoca los permisos en myaccount.google.com/permissions y vuelve a intentarlo.';
      return res.send(`
        <!DOCTYPE html>
        <html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#fff1f2;color:#9f1239;">
          <h2>Atención</h2>
          <p>${tokenErr}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'ROMA_GOOGLE_OAUTH_ERROR', error: '${tokenErr}' }, '*');
              setTimeout(() => window.close(), 3500);
            } else {
              window.location.href = '${fallbackOrigin}/?module=settings&tab=drive&oauth=error&msg=' + encodeURIComponent('${tokenErr}');
            }
          </script>
        </body></html>
      `);
    }

    oauth2Client.setCredentials(tokens);
    let userEmail = 'Cuenta Google Conectada';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userinfo = await oauth2.userinfo.get();
      if (userinfo.data?.email) {
        userEmail = userinfo.data.email;
      }
    } catch {}

    await db.updateTenantDriveConfig(tenantId, {
      ...tenant.driveConfig,
      authType: 'oauth2',
      refreshToken,
      serviceAccountEmail: userEmail,
    });

    await googleDriveService.testAndApplyConfig(
      {
        authType: 'oauth2',
        clientId: tenant.driveConfig.clientId,
        clientSecret: tenant.driveConfig.clientSecret,
        refreshToken,
        rootFolderId: tenant.driveConfig.rootFolderId,
      },
      true
    );

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Conexión Exitosa</title><meta charset="UTF-8" /></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;background:#f0fdf4;color:#166534;">
        <h2 style="margin-bottom:8px;font-size:20px;font-weight:bold;">¡Google Drive Conectado con Éxito!</h2>
        <p style="font-size:14px;color:#15803d;margin-top:0;">Cuenta vinculada: <strong>${userEmail}</strong></p>
        <p style="font-size:12px;color:#4ade80;margin-top:16px;">Cerrando esta ventana y actualizando el sistema...</p>
        <script>
          try {
            if (window.opener) {
              window.opener.postMessage({ type: 'ROMA_GOOGLE_OAUTH_SUCCESS', email: '${userEmail}' }, '*');
              setTimeout(() => window.close(), 800);
            } else {
              window.location.href = '${fallbackOrigin}/?module=settings&tab=drive&oauth=success&email=' + encodeURIComponent('${userEmail}');
            }
          } catch(e) {
            window.location.href = '${fallbackOrigin}/?module=settings&tab=drive&oauth=success&email=' + encodeURIComponent('${userEmail}');
          }
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error('[OAuth Callback Error]:', err);
    return res.send(`
      <!DOCTYPE html>
      <html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#fff1f2;color:#9f1239;">
        <h2>Error al conectar con Google</h2>
        <p>${err.message || 'Error en autenticación'}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'ROMA_GOOGLE_OAUTH_ERROR', error: '${err.message || 'Error en autenticación'}' }, '*');
            setTimeout(() => window.close(), 3500);
          } else {
            window.location.href = '${fallbackOrigin}/?module=settings&tab=drive&oauth=error&msg=' + encodeURIComponent('${err.message || 'Error en autenticacion'}');
          }
        </script>
      </body></html>
    `);
  }
});

// =============================================================================
// 2. LISTAR ARCHIVOS REGISTRADOS (CON SINCRONIZACIÓN BIDIRECCIONAL)
// =============================================================================

router.get('/files', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth!.tenant.id;
    const { clientId, serviceOrderId, folderId, search, category } = req.query as {
      clientId?: string;
      serviceOrderId?: string;
      folderId?: string;
      search?: string;
      category?: string;
    };

    await ensureDriveConfig(req);

    // Sincronización inteligente no bloqueante: responde en <5ms desde BD local
    const forceSync = req.query.sync === 'true';
    if (forceSync) {
      await runSharedGoogleSync(tenantId, true);
    } else {
      runSharedGoogleSync(tenantId, false).catch(() => {});
    }

    const files = await db.getDriveFiles(tenantId, {
      clientId,
      serviceOrderId,
      folderId,
      search,
      category,
    });

    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// 3. INICIAR SESIÓN DE RESUMABLE UPLOAD (DIRECTO A GOOGLE DRIVE - 300MB A 1GB+)
// =============================================================================

router.post(
  '/upload-session',
  requireAuth,
  requirePermission('drive.upload'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fileName, mimeType, fileSize, parentFolderId, replaceFileId } = req.body;

      if (!fileName || !fileSize) {
        res.status(400).json({ error: 'fileName y fileSize son obligatorios.' });
        return;
      }

      await ensureDriveConfig(req);

      if (!googleDriveService.isReady()) {
        res.status(503).json({
          error:
            'Google Drive no está configurado o conectado en este espacio de trabajo. Configura las credenciales en Configuración > Google Drive & APIs.',
        });
        return;
      }

      const clientOrigin =
        req.get('origin') ||
        req.get('referer')?.replace(/\/$/, '') ||
        'http://localhost:5173';

      const session = await googleDriveService.initiateResumableUpload({
        fileName: fileName.trim(),
        mimeType: mimeType || 'application/octet-stream',
        fileSize: Number(fileSize),
        parentFolderId,
        replaceFileId,
        origin: clientOrigin,
      });

      res.json({
        uploadUrl: session.uploadUrl,
        parentFolderId: session.parentFolderId,
      });
    } catch (err: any) {
      const isQuotaOrClient =
        err.message?.includes('cuota') ||
        err.message?.includes('quota') ||
        err.message?.includes('OAuth') ||
        err.message?.includes('permiso');
      res.status(isQuotaOrClient ? 403 : 500).json({ error: err.message });
    }
  }
);

// =============================================================================
// 4. REGISTRAR ARCHIVO TRAS SUBIDA DIRECTA EXITOSA
// =============================================================================

router.post(
  '/register-file',
  requireAuth,
  requirePermission('drive.upload'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const {
        googleFileId,
        name,
        mimeType,
        size,
        parentFolderId,
        parentFolderName,
        clientId,
        clientName,
        serviceOrderId,
        serviceOrderCode,
        category,
        width,
        height,
        durationMillis,
      } = req.body;

      if (!googleFileId) {
        res.status(400).json({ error: 'googleFileId es obligatorio.' });
        return;
      }

      // Obtener metadatos oficiales y enlaces de visualización desde Google Drive si es posible
      let webViewLink = req.body.webViewLink || '';
      let webContentLink = req.body.webContentLink || '';
      let thumbnailLink = req.body.thumbnailLink || '';
      let actualSize = Number(size) || 0;
      let actualName = name;
      let actualMime = mimeType;
      let resolvedWidth = width ? Number(width) : undefined;
      let resolvedHeight = height ? Number(height) : undefined;
      let resolvedDuration = durationMillis ? Number(durationMillis) : undefined;

      if (googleDriveService.isReady()) {
        try {
          // Asignar permiso de lectura pública para previsualización inmediata
          await googleDriveService.makePubliclyReadable(googleFileId);
          const meta = await googleDriveService.getFileMetadata(googleFileId);
          if (meta) {
            webViewLink = meta.webViewLink || webViewLink;
            webContentLink = meta.webContentLink || webContentLink;
            thumbnailLink = meta.thumbnailLink || thumbnailLink;
            actualSize = Number(meta.size) || actualSize;
            actualName = meta.name || actualName;
            actualMime = meta.mimeType || actualMime;
            if (!resolvedWidth && (meta.imageMediaMetadata?.width || meta.videoMediaMetadata?.width)) {
              resolvedWidth = Number(meta.imageMediaMetadata?.width || meta.videoMediaMetadata?.width);
            }
            if (!resolvedHeight && (meta.imageMediaMetadata?.height || meta.videoMediaMetadata?.height)) {
              resolvedHeight = Number(meta.imageMediaMetadata?.height || meta.videoMediaMetadata?.height);
            }
            if (!resolvedDuration && meta.videoMediaMetadata?.durationMillis) {
              resolvedDuration = Number(meta.videoMediaMetadata.durationMillis);
            }
          }
        } catch (e) {
          console.warn('[Drive Register] No se pudieron sincronizar metadatos adicionales:', (e as Error).message);
        }
      }

      // Resolver nombres de cliente u orden de servicio si no se enviaron
      let resolvedClientName = clientName || '';
      if (clientId && !resolvedClientName) {
        const client = await db.getClientById(clientId, tenantId);
        if (client) resolvedClientName = client.name;
      }

      let resolvedSOCode = serviceOrderCode || '';
      if (serviceOrderId && !resolvedSOCode) {
        const order = await db.getServiceOrderById(serviceOrderId, tenantId);
        if (order) resolvedSOCode = order.code;
      }

      const created = await db.createDriveFile({
        tenantId,
        googleFileId,
        name: actualName || 'archivo_sin_nombre',
        mimeType: actualMime || 'application/octet-stream',
        size: actualSize,
        webViewLink,
        webContentLink,
        thumbnailLink,
        parentFolderId: parentFolderId || '',
        parentFolderName: parentFolderName || '',
        clientId: clientId || '',
        clientName: resolvedClientName,
        serviceOrderId: serviceOrderId || '',
        serviceOrderCode: resolvedSOCode,
        category: category || 'general',
        width: resolvedWidth,
        height: resolvedHeight,
        durationMillis: resolvedDuration,
        createdBy: req.auth!.user.name,
      });

      notifyEvent({
        tenantId,
        module: 'drive',
        type: 'info',
        title: 'Nuevo archivo en Drive',
        message: `Se subió el archivo "${created.name}"`,
        entityId: created.id,
        link: '/?module=drive',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.status(201).json({ file: created });
    } catch (err: any) {
      const isQuotaOrClient =
        err.message?.includes('cuota') ||
        err.message?.includes('quota') ||
        err.message?.includes('OAuth') ||
        err.message?.includes('permiso');
      res.status(isQuotaOrClient ? 403 : 500).json({ error: err.message });
    }
  }
);

// =============================================================================
// 5. SUBIDA POR STREAMING EN EL SERVIDOR (FALLBACK MULTIPART)
// =============================================================================

router.post(
  '/upload-stream',
  requireAuth,
  requirePermission('drive.upload'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No se envió ningún archivo en la petición.' });
        return;
      }

      await ensureDriveConfig(req);

      if (!googleDriveService.isReady()) {
        res.status(503).json({ error: 'Google Drive no está configurado o conectado en este espacio de trabajo.' });
        return;
      }

      const parentFolderId = req.body.parentFolderId as string | undefined;
      const parentFolderName = req.body.parentFolderName as string | undefined;
      const clientId = req.body.clientId as string | undefined;
      const clientName = req.body.clientName as string | undefined;
      const serviceOrderId = req.body.serviceOrderId as string | undefined;
      const serviceOrderCode = req.body.serviceOrderCode as string | undefined;
      const category = req.body.category as string | undefined;
      const replaceFileId = req.body.replaceFileId as string | undefined;
      const width = req.body.width ? Number(req.body.width) : undefined;
      const height = req.body.height ? Number(req.body.height) : undefined;
      const durationMillis = req.body.durationMillis ? Number(req.body.durationMillis) : undefined;

      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);

      const driveRes = await googleDriveService.uploadStream({
        fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        mimeType: file.mimetype,
        stream: readableStream,
        parentFolderId,
        replaceFileId,
      });

      // Resolver nombres
      let resolvedClientName = clientName || '';
      if (clientId && !resolvedClientName) {
        const client = await db.getClientById(clientId, tenantId);
        if (client) resolvedClientName = client.name;
      }

      let resolvedSOCode = serviceOrderCode || '';
      if (serviceOrderId && !resolvedSOCode) {
        const order = await db.getServiceOrderById(serviceOrderId, tenantId);
        if (order) resolvedSOCode = order.code;
      }

      const resolvedW = width || driveRes.imageMediaMetadata?.width || driveRes.videoMediaMetadata?.width;
      const resolvedH = height || driveRes.imageMediaMetadata?.height || driveRes.videoMediaMetadata?.height;
      const resolvedDur = durationMillis || driveRes.videoMediaMetadata?.durationMillis;

      const created = await db.createDriveFile({
        tenantId,
        googleFileId: driveRes.id,
        name: driveRes.name,
        mimeType: driveRes.mimeType || file.mimetype,
        size: Number(driveRes.size) || file.size,
        webViewLink: driveRes.webViewLink || '',
        webContentLink: driveRes.webContentLink || '',
        thumbnailLink: driveRes.thumbnailLink || '',
        parentFolderId: parentFolderId || '',
        parentFolderName: parentFolderName || '',
        clientId: clientId || '',
        clientName: resolvedClientName,
        serviceOrderId: serviceOrderId || '',
        serviceOrderCode: resolvedSOCode,
        category: (category as any) || 'general',
        width: resolvedW ? Number(resolvedW) : undefined,
        height: resolvedH ? Number(resolvedH) : undefined,
        durationMillis: resolvedDur ? Number(resolvedDur) : undefined,
        createdBy: req.auth!.user.name,
      });

      notifyEvent({
        tenantId,
        module: 'drive',
        type: 'info',
        title: 'Nuevo archivo en Drive',
        message: `Se subió el archivo "${created.name}"`,
        entityId: created.id,
        link: '/?module=drive',
        actorUserId: req.auth!.user.id,
        actorUserName: req.auth!.user.name,
      }).catch(() => {});

      res.status(201).json({ file: created });
    } catch (err: any) {
      const isQuotaOrClient =
        err.message?.includes('cuota') ||
        err.message?.includes('quota') ||
        err.message?.includes('OAuth') ||
        err.message?.includes('permiso');
      res.status(isQuotaOrClient ? 403 : 500).json({ error: err.message });
    }
  }
);

// =============================================================================
// 6. GESTIÓN DE CARPETAS Y BLUEPRINTS (CON SINCRONIZACIÓN BIDIRECCIONAL)
// =============================================================================

router.get('/folders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth!.tenant.id;
    const { clientId, serviceOrderId } = req.query as {
      clientId?: string;
      serviceOrderId?: string;
    };

    // 1. Asegurar credenciales activas del tenant
    await ensureDriveConfig(req);

    // 2. Sincronización inteligente no bloqueante: responde en <5ms desde BD local
    const forceSync = req.query.sync === 'true';
    if (forceSync) {
      await runSharedGoogleSync(tenantId, true);
    } else {
      runSharedGoogleSync(tenantId, false).catch(() => {});
    }

    const folders = await db.getDriveFolders(tenantId, { clientId, serviceOrderId });
    res.json({ folders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/folders',
  requireAuth,
  requirePermission('drive.manage_folders'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const { name, parentFolderId, clientId, serviceOrderId, folderType, color } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'El nombre de la carpeta es obligatorio.' });
        return;
      }

      await ensureDriveConfig(req);

      if (!googleDriveService.isReady()) {
        res.status(503).json({ error: 'Google Drive no está configurado.' });
        return;
      }

      // Si ya existe la subcarpeta con el mismo nombre en ese padre, devolver la existente (ideal para Directory Drop recursivo)
      const existingFolders = await db.getDriveFolders(tenantId);
      const targetParent = parentFolderId || googleDriveService.getRootFolderId() || '';
      const duplicateFolder = existingFolders.find(
        (f) =>
          f.name.toLowerCase() === name.trim().toLowerCase() &&
          (f.parentGoogleFolderId || '') === targetParent
      );
      if (duplicateFolder) {
        res.status(200).json({ folder: duplicateFolder });
        return;
      }

      const createdFolder = await googleDriveService.createFolder(name.trim(), parentFolderId);

      if (color && googleDriveService.isReady()) {
        try {
          await googleDriveService.updateItemMetadata(createdFolder.id, { folderColorRgb: color });
        } catch {}
      }

      const saved = await db.createDriveFolder({
        tenantId,
        googleFolderId: createdFolder.id,
        name: createdFolder.name,
        parentGoogleFolderId: targetParent,
        clientId: clientId || '',
        serviceOrderId: serviceOrderId || '',
        folderType: folderType || 'custom',
        color: color || '',
        starred: false,
        webViewLink: createdFolder.webViewLink || '',
      });

      res.status(201).json({ folder: saved });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.patch(
  '/folders/:id',
  requireAuth,
  requirePermission('drive.manage_folders'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const id = req.params.id as string;
      const { name, color, starred, parentFolderId, clientId, serviceOrderId } = req.body;

      await ensureDriveConfig(req);

      const folder = await db.getDriveFolderById(id, tenantId);
      if (!folder) {
        res.status(404).json({ error: 'Carpeta no encontrada.' });
        return;
      }

      if (googleDriveService.isReady() && folder.googleFolderId) {
        try {
          if (name !== undefined || color !== undefined || starred !== undefined) {
            await googleDriveService.updateItemMetadata(folder.googleFolderId, {
              ...(name && name.trim() ? { name: name.trim() } : {}),
              ...(color !== undefined && color ? { folderColorRgb: color } : {}),
              ...(starred !== undefined ? { starred: Boolean(starred) } : {}),
            });
          }
          if (parentFolderId && parentFolderId !== folder.parentGoogleFolderId) {
            await googleDriveService.moveFileOrFolder(
              folder.googleFolderId,
              parentFolderId,
              folder.parentGoogleFolderId
            );
          }
        } catch (gErr) {
          console.warn('[Drive Folder Patch] Aviso actualizando en Google Drive:', (gErr as Error).message);
        }
      }

      const updated = await db.updateDriveFolder(folder.id, tenantId, {
        ...(name && name.trim() ? { name: name.trim() } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(starred !== undefined ? { starred: Boolean(starred) } : {}),
        ...(parentFolderId !== undefined ? { parentGoogleFolderId: parentFolderId } : {}),
        ...(clientId !== undefined ? { clientId } : {}),
        ...(serviceOrderId !== undefined ? { serviceOrderId } : {}),
      });

      res.json({ folder: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Crear estructura de carpetas predefinida (Blueprint) para un Cliente u Orden de Servicio
router.post(
  '/blueprint/apply',
  requireAuth,
  requirePermission('drive.manage_folders'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const {
        targetName,
        module,
        clientId,
        serviceOrderId,
        customSubfolders,
        blueprintId,
      } = req.body;

      if (!targetName || !targetName.trim()) {
        res.status(400).json({ error: 'El nombre de la carpeta principal es obligatorio.' });
        return;
      }

      if (!googleDriveService.isReady()) {
        res.status(503).json({ error: 'Google Drive no está configurado.' });
        return;
      }

      let subfoldersToCreate: string[] = [];

      if (Array.isArray(customSubfolders) && customSubfolders.length > 0) {
        subfoldersToCreate = customSubfolders;
      } else {
        const blueprints = await db.getDriveFolderBlueprints(tenantId);
        let bp = blueprints.find((b) => b.id === blueprintId);
        if (!bp) {
          bp = blueprints.find((b) => b.module === module && b.isDefault) || blueprints[0];
        }
        if (bp && bp.structure) {
          subfoldersToCreate = bp.structure.map((item) => item.name);
        }
      }

      if (subfoldersToCreate.length === 0) {
        subfoldersToCreate = [
          '01_Brief_y_Referencias',
          '02_Editables_y_Recursos',
          '03_Entregables_Finales',
        ];
      }

      // 1. Crear jerarquía en Google Drive
      const result = await googleDriveService.createBlueprintHierarchy(
        targetName.trim(),
        subfoldersToCreate,
        googleDriveService.getRootFolderId()
      );

      // 2. Registrar carpeta principal en BD
      const mainSaved = await db.createDriveFolder({
        tenantId,
        googleFolderId: result.mainFolder.id,
        name: result.mainFolder.name,
        parentGoogleFolderId: googleDriveService.getRootFolderId() || '',
        clientId: clientId || '',
        serviceOrderId: serviceOrderId || '',
        folderType: module === 'clients' ? 'client_root' : 'os_root',
        webViewLink: result.mainFolder.webViewLink || '',
      });

      // 3. Registrar subcarpetas en BD
      const subSavedList = [];
      for (const sub of result.subfolders) {
        const subSaved = await db.createDriveFolder({
          tenantId,
          googleFolderId: sub.id,
          name: sub.name,
          parentGoogleFolderId: result.mainFolder.id,
          clientId: clientId || '',
          serviceOrderId: serviceOrderId || '',
          folderType: 'blueprint_subfolder',
          webViewLink: sub.webViewLink || '',
        });
        subSavedList.push(subSaved);
      }

      res.status(201).json({
        mainFolder: mainSaved,
        subfolders: subSavedList,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Listar plantillas de carpetas (Blueprints)
router.get('/blueprints', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth!.tenant.id;
    const blueprints = await db.getDriveFolderBlueprints(tenantId);
    res.json({ blueprints });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/blueprints',
  requireAuth,
  requirePermission('drive.manage_folders'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const { name, description, module, structure, isDefault } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'El nombre de la plantilla es obligatorio.' });
        return;
      }

      const created = await db.createDriveFolderBlueprint({
        tenantId,
        name: name.trim(),
        description: description || '',
        module: module || 'general',
        structure: structure || [],
        isDefault: Boolean(isDefault),
      });

      res.status(201).json({ blueprint: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete(
  '/blueprints/:id',
  requireAuth,
  requirePermission('drive.manage_folders'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const ok = await db.deleteDriveFolderBlueprint(req.params.id as string, tenantId);
      if (!ok) {
        res.status(404).json({ error: 'Plantilla no encontrada.' });
        return;
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// =============================================================================
// 7. OPERACIONES DE ARCHIVOS: RENOMBRAR, ELIMINAR, ETC.
// =============================================================================

router.patch(
  '/files/:id',
  requireAuth,
  requirePermission('drive.upload'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const id = req.params.id as string;
      const {
        name,
        category,
        clientId,
        clientName,
        serviceOrderId,
        serviceOrderCode,
        starred,
        parentFolderId,
        parentFolderName,
        width,
        height,
        durationMillis,
      } = req.body;

      await ensureDriveConfig(req);

      const file = await db.getDriveFileById(id, tenantId);
      if (!file) {
        res.status(404).json({ error: 'Archivo no encontrado.' });
        return;
      }

      // Si cambió el nombre, renombrar en Google Drive
      if (name && name.trim() && name.trim() !== file.name && googleDriveService.isReady()) {
        try {
          await googleDriveService.renameFileOrFolder(file.googleFileId, name.trim());
        } catch (e) {
          console.warn('[Drive Rename] Error renombrando en Google:', (e as Error).message);
        }
      }

      // Si cambió starred
      if (starred !== undefined && googleDriveService.isReady()) {
        try {
          await googleDriveService.updateItemMetadata(file.googleFileId, { starred: Boolean(starred) });
        } catch (e) {
          console.warn('[Drive Star] Error destacando en Google:', (e as Error).message);
        }
      }

      // Si se movió a otra carpeta
      if (parentFolderId && parentFolderId !== file.parentFolderId && googleDriveService.isReady()) {
        try {
          await googleDriveService.moveFileOrFolder(file.googleFileId, parentFolderId, file.parentFolderId);
        } catch (e) {
          console.warn('[Drive Move] Error moviendo en Google:', (e as Error).message);
        }
      }

      const updated = await db.updateDriveFile(id, tenantId, {
        ...(name ? { name: name.trim() } : {}),
        ...(category ? { category } : {}),
        ...(clientId !== undefined ? { clientId, clientName } : {}),
        ...(serviceOrderId !== undefined ? { serviceOrderId, serviceOrderCode } : {}),
        ...(starred !== undefined ? { starred: Boolean(starred) } : {}),
        ...(parentFolderId ? { parentFolderId, parentFolderName: parentFolderName || file.parentFolderName } : {}),
        ...(width !== undefined ? { width: Number(width) } : {}),
        ...(height !== undefined ? { height: Number(height) } : {}),
        ...(durationMillis !== undefined ? { durationMillis: Number(durationMillis) } : {}),
      });

      res.json({ file: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete(
  '/files/:id',
  requireAuth,
  requirePermission('drive.delete'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const id = req.params.id as string;

      await ensureDriveConfig(req);

      const file = await db.getDriveFileById(id, tenantId);
      if (!file) {
        res.status(404).json({ error: 'Archivo no encontrado.' });
        return;
      }

      // Eliminar de Google Drive
      if (googleDriveService.isReady() && file.googleFileId) {
        try {
          await googleDriveService.deleteFileOrFolder(file.googleFileId);
        } catch (e: any) {
          console.warn('[Drive Delete] No se pudo borrar en Google Drive:', e.message);
        }
      }

      await db.deleteDriveFile(id, tenantId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete(
  '/folders/:id',
  requireAuth,
  requirePermission('drive.manage_folders'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const id = req.params.id as string;

      await ensureDriveConfig(req);

      const folders = await db.getDriveFolders(tenantId);
      const folder = folders.find((f) => f.id === id || f.googleFolderId === id);
      const targetGoogleId = folder?.googleFolderId || id;

      // Borrar de Google Drive
      if (googleDriveService.isReady()) {
        try {
          await googleDriveService.deleteFileOrFolder(targetGoogleId);
        } catch (e: any) {
          console.warn('[Drive Folder Delete] Error borrando en Google:', e.message);
        }
      }

      await db.deleteDriveFolder(targetGoogleId, tenantId);
      if (folder && folder.id !== targetGoogleId) {
        await db.deleteDriveFolder(folder.id, tenantId);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ACCIONES EN LOTE (BATCH): Mover, Eliminar, Destacar o Reasignar múltiples archivos/carpetas
router.post(
  '/batch',
  requireAuth,
  requirePermission('drive.upload'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.auth!.tenant.id;
      const { action, fileIds = [], folderIds = [], targetFolderId, targetFolderName, starred, clientId, clientName, serviceOrderId, serviceOrderCode, category } = req.body;

      await ensureDriveConfig(req);

      let processedCount = 0;

      if (action === 'move' && targetFolderId) {
        // Mover archivos
        for (const fId of fileIds) {
          const file = await db.getDriveFileById(fId, tenantId);
          if (file) {
            if (googleDriveService.isReady()) {
              try {
                await googleDriveService.moveFileOrFolder(file.googleFileId, targetFolderId, file.parentFolderId);
              } catch (e) {
                console.warn('[Batch Move File Error]:', e);
              }
            }
            await db.updateDriveFile(file.id, tenantId, {
              parentFolderId: targetFolderId,
              parentFolderName: targetFolderName || '',
            });
            processedCount++;
          }
        }

        // Mover carpetas
        for (const fldId of folderIds) {
          const fld = await db.getDriveFolderById(fldId, tenantId);
          if (fld && fld.googleFolderId !== targetFolderId) {
            if (googleDriveService.isReady()) {
              try {
                await googleDriveService.moveFileOrFolder(fld.googleFolderId, targetFolderId, fld.parentGoogleFolderId);
              } catch (e) {
                console.warn('[Batch Move Folder Error]:', e);
              }
            }
            await db.updateDriveFolder(fld.id, tenantId, { parentGoogleFolderId: targetFolderId });
            processedCount++;
          }
        }
      } else if (action === 'delete') {
        for (const fId of fileIds) {
          const file = await db.getDriveFileById(fId, tenantId);
          if (file) {
            if (googleDriveService.isReady() && file.googleFileId) {
              try { await googleDriveService.deleteFileOrFolder(file.googleFileId); } catch {}
            }
            await db.deleteDriveFile(file.id, tenantId);
            processedCount++;
          }
        }
        for (const fldId of folderIds) {
          const fld = await db.getDriveFolderById(fldId, tenantId);
          const gId = fld?.googleFolderId || fldId;
          if (googleDriveService.isReady()) {
            try { await googleDriveService.deleteFileOrFolder(gId); } catch {}
          }
          await db.deleteDriveFolder(gId, tenantId);
          processedCount++;
        }
      } else if (action === 'star') {
        const isStarred = Boolean(starred);
        for (const fId of fileIds) {
          const file = await db.getDriveFileById(fId, tenantId);
          if (file) {
            if (googleDriveService.isReady()) {
              try { await googleDriveService.updateItemMetadata(file.googleFileId, { starred: isStarred }); } catch {}
            }
            await db.updateDriveFile(file.id, tenantId, { starred: isStarred });
            processedCount++;
          }
        }
        for (const fldId of folderIds) {
          const fld = await db.getDriveFolderById(fldId, tenantId);
          if (fld) {
            if (googleDriveService.isReady()) {
              try { await googleDriveService.updateItemMetadata(fld.googleFolderId, { starred: isStarred }); } catch {}
            }
            await db.updateDriveFolder(fld.id, tenantId, { starred: isStarred });
            processedCount++;
          }
        }
      } else if (action === 'assign') {
        for (const fId of fileIds) {
          const file = await db.getDriveFileById(fId, tenantId);
          if (file) {
            await db.updateDriveFile(file.id, tenantId, {
              ...(clientId !== undefined ? { clientId, clientName } : {}),
              ...(serviceOrderId !== undefined ? { serviceOrderId, serviceOrderCode } : {}),
              ...(category ? { category } : {}),
            });
            processedCount++;
          }
        }
      }

      res.json({ success: true, processedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// STREAMING MULTIMEDIA NATIVO (HTTP Range 206 para Video, Audio y PDF)
router.get('/files/:id/stream', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth!.tenant.id;
    const id = req.params.id as string;

    await ensureDriveConfig(req);

    const file = await db.getDriveFileById(id, tenantId);
    if (!file) {
      res.status(404).json({ error: 'Archivo no encontrado.' });
      return;
    }

    if (!googleDriveService.isReady()) {
      res.status(503).json({ error: 'Google Drive no configurado.' });
      return;
    }

    const rangeHeader = req.headers.range;
    const driveRes = await googleDriveService.streamFileMedia(file.googleFileId, rangeHeader);

    res.status(driveRes.status);
    driveRes.headers.forEach((value, key) => {
      // Evitar re-enviar transfer-encoding chunked conflictivo
      if (key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });

    if (file.mimeType && !res.getHeader('content-type')) {
      res.setHeader('content-type', file.mimeType);
    }
    res.setHeader('accept-ranges', 'bytes');

    if (!driveRes.body) {
      res.end();
      return;
    }

    // Pipe WebStream to Node response stream
    const reader = driveRes.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } catch (streamErr) {
        res.destroy();
      }
    };
    pump();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// PROXY DE MINIATURA EN ALTA RESOLUCIÓN (Para .psd, .ai, .indd, .pdf, imágenes)
router.get('/files/:id/thumbnail', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.auth!.tenant.id;
    const id = req.params.id as string;
    const size = Number(req.query.size) || 1000;

    await ensureDriveConfig(req);

    const file = await db.getDriveFileById(id, tenantId);
    if (!file) {
      res.status(404).json({ error: 'Archivo no encontrado.' });
      return;
    }

    const thumb = await googleDriveService.fetchHighResThumbnail(file.googleFileId, size);
    if (!thumb) {
      res.status(404).json({ error: 'Miniatura no disponible.' });
      return;
    }

    res.setHeader('Content-Type', thumb.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(thumb.buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Contenidos directos de una carpeta en Google Drive (para sincronización)
router.get('/google-contents', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!googleDriveService.isReady()) {
      res.status(503).json({ error: 'Google Drive no está configurado.' });
      return;
    }
    const folderId = req.query.folderId as string | undefined;
    const items = await googleDriveService.listGoogleDriveContents(folderId);
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
