"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
exports.notifyEvent = notifyEvent;
// Import seguro y resiliente de web-push (no detiene ni crashea el servidor si aún no se corrió npm install en cPanel)
let webpush = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    webpush = require('web-push');
}
catch {
    console.warn('⚠️ [NotificationService] Paquete web-push no instalado en node_modules. Las notificaciones SSE y en base de datos continuarán operando con normalidad.');
}
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const DATA_DIR = path_1.default.resolve(process.cwd(), 'data');
const VAPID_KEYS_FILE = path_1.default.join(DATA_DIR, 'vapid-keys.json');
class NotificationService {
    vapidPublicKey = '';
    vapidPrivateKey = '';
    vapidSubject = 'mailto:soporte@roma-saas.com';
    sseClients = new Map();
    constructor() {
        this.initVapid();
    }
    initVapid() {
        // 1. Revisar si existen en variables de entorno
        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
            this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY.trim();
            this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY.trim();
            if (process.env.VAPID_SUBJECT) {
                this.vapidSubject = process.env.VAPID_SUBJECT.trim();
            }
        }
        else {
            // 2. Revisar si fueron generadas y guardadas previamente en disco
            try {
                if (!fs_1.default.existsSync(DATA_DIR)) {
                    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
                }
                if (fs_1.default.existsSync(VAPID_KEYS_FILE)) {
                    const keys = JSON.parse(fs_1.default.readFileSync(VAPID_KEYS_FILE, 'utf-8'));
                    if (keys.publicKey && keys.privateKey) {
                        this.vapidPublicKey = keys.publicKey;
                        this.vapidPrivateKey = keys.privateKey;
                    }
                }
            }
            catch (err) {
                console.warn('[NotificationService] No se pudieron leer claves VAPID guardadas:', err);
            }
            // 3. Si no existen, generar un par de claves VAPID único y persistirlo
            if (!this.vapidPublicKey || !this.vapidPrivateKey) {
                if (!webpush) {
                    return;
                }
                try {
                    const generated = webpush.generateVAPIDKeys();
                    this.vapidPublicKey = generated.publicKey;
                    this.vapidPrivateKey = generated.privateKey;
                    fs_1.default.writeFileSync(VAPID_KEYS_FILE, JSON.stringify({
                        publicKey: this.vapidPublicKey,
                        privateKey: this.vapidPrivateKey,
                        createdAt: new Date().toISOString(),
                    }, null, 2), 'utf-8');
                    console.log('[NotificationService] Nuevas claves VAPID generadas y guardadas correctamente.');
                }
                catch (err) {
                    console.error('[NotificationService] Error generando claves VAPID:', err);
                }
            }
        }
        if (webpush && this.vapidPublicKey && this.vapidPrivateKey) {
            try {
                webpush.setVapidDetails(this.vapidSubject, this.vapidPublicKey, this.vapidPrivateKey);
            }
            catch (err) {
                console.error('[NotificationService] Error configurando webpush:', err);
            }
        }
    }
    getVapidPublicKey() {
        return this.vapidPublicKey;
    }
    /**
     * Suscribe un cliente al canal SSE (Server-Sent Events) de su tenant
     * para recibir notificaciones instantáneas en segundo plano.
     */
    registerSseClient(tenantId, res) {
        if (!this.sseClients.has(tenantId)) {
            this.sseClients.set(tenantId, new Set());
        }
        const clientSet = this.sseClients.get(tenantId);
        clientSet.add(res);
        // Enviar evento de conexión exitosa
        res.write(`data: ${JSON.stringify({ type: 'connected', tenantId })}\n\n`);
        return () => {
            clientSet.delete(res);
            if (clientSet.size === 0) {
                this.sseClients.delete(tenantId);
            }
        };
    }
    /**
     * Emite la notificación a través de Server-Sent Events a todas las pestañas activas
     */
    broadcastSse(tenantId, notification) {
        const clients = this.sseClients.get(tenantId);
        if (!clients || clients.size === 0)
            return;
        const payload = `data: ${JSON.stringify({ type: 'notification', notification })}\n\n`;
        for (const res of clients) {
            try {
                res.write(payload);
            }
            catch (e) {
                // En caso de socket caído
            }
        }
    }
    /**
     * Envía la notificación Web Push a todos los celulares / dispositivos PWA suscritos
     */
    async sendPushToTenant(tenantId, notification) {
        if (!webpush || !this.vapidPublicKey || !this.vapidPrivateKey) {
            return { sent: 0, failed: 0 };
        }
        const subscriptions = await db_1.db.getPushSubscriptions(tenantId);
        if (subscriptions.length === 0) {
            return { sent: 0, failed: 0 };
        }
        // Obtener ícono del tenant o ícono por defecto
        const iconUrl = `/api/public/tenant-icon?tenant=${encodeURIComponent(tenantId)}&size=192`;
        const pushPayload = JSON.stringify({
            title: notification.title,
            body: notification.message,
            icon: iconUrl,
            badge: '/favicon.svg',
            tag: `roma-notif-${notification.id}`,
            renotify: true,
            vibrate: [200, 100, 200],
            data: {
                id: notification.id,
                link: notification.link || '/',
                module: notification.module,
                entityId: notification.entityId,
                createdAt: notification.createdAt,
            },
        });
        let sent = 0;
        let failed = 0;
        await Promise.all(subscriptions.map(async (sub) => {
            try {
                const pushSub = {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.keys.p256dh,
                        auth: sub.keys.auth,
                    },
                };
                await webpush.sendNotification(pushSub, pushPayload, {
                    TTL: 60 * 60 * 24, // 24 horas
                    urgency: 'high',
                });
                sent++;
            }
            catch (err) {
                failed++;
                // Si el endpoint ya no existe (404 o 410 GONE), borrar la suscripción obsoleta
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await db_1.db.deletePushSubscription(sub.endpoint);
                }
            }
        }));
        return { sent, failed };
    }
    /**
     * Crea una notificación, la guarda en la base de datos, la envía por SSE
     * y despacha un Push Notification a todos los celulares con la PWA instalada.
     */
    async notify(params) {
        const notification = await db_1.db.createNotification({
            tenantId: params.tenantId,
            title: params.title,
            message: params.message,
            type: params.type || 'info',
            module: params.module,
            entityId: params.entityId,
            action: params.action,
            link: params.link,
            actorUserId: params.actorUserId,
            actorUserName: params.actorUserName,
            metadata: params.metadata || {},
        });
        // 1. Broadcast SSE instantáneo a navegadores abiertos
        this.broadcastSse(params.tenantId, notification);
        // 2. Broadcast Web Push a dispositivos móviles PWA en segundo plano
        this.sendPushToTenant(params.tenantId, notification).catch((err) => {
            console.warn('[NotificationService] Error enviando Web Push:', err);
        });
        return notification;
    }
}
exports.notificationService = new NotificationService();
/**
 * Función global utilitaria para conectar cualquier módulo presente o futuro
 * con el sistema de notificaciones en 1 sola línea de código.
 */
async function notifyEvent(params) {
    return exports.notificationService.notify(params);
}
