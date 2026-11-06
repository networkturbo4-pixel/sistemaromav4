import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { db } from '../db';
import { AppNotification, NotificationType, PushSubscriptionRecord } from '../../shared/types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const VAPID_KEYS_FILE = path.join(DATA_DIR, 'vapid-keys.json');

export interface NotifyParams {
  tenantId: string;
  title: string;
  message: string;
  type?: NotificationType;
  module: string;
  entityId?: string;
  action?: string;
  link?: string;
  actorUserId?: string;
  actorUserName?: string;
  metadata?: Record<string, any>;
}

class NotificationService {
  private vapidPublicKey = '';
  private vapidPrivateKey = '';
  private vapidSubject = 'mailto:soporte@roma-saas.com';
  private sseClients = new Map<string, Set<Response>>();

  constructor() {
    this.initVapid();
  }

  private initVapid(): void {
    // 1. Revisar si existen en variables de entorno
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY.trim();
      this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY.trim();
      if (process.env.VAPID_SUBJECT) {
        this.vapidSubject = process.env.VAPID_SUBJECT.trim();
      }
    } else {
      // 2. Revisar si fueron generadas y guardadas previamente en disco
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (fs.existsSync(VAPID_KEYS_FILE)) {
          const keys = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, 'utf-8'));
          if (keys.publicKey && keys.privateKey) {
            this.vapidPublicKey = keys.publicKey;
            this.vapidPrivateKey = keys.privateKey;
          }
        }
      } catch (err) {
        console.warn('[NotificationService] No se pudieron leer claves VAPID guardadas:', err);
      }

      // 3. Si no existen, generar un par de claves VAPID único y persistirlo
      if (!this.vapidPublicKey || !this.vapidPrivateKey) {
        try {
          const generated = webpush.generateVAPIDKeys();
          this.vapidPublicKey = generated.publicKey;
          this.vapidPrivateKey = generated.privateKey;
          fs.writeFileSync(
            VAPID_KEYS_FILE,
            JSON.stringify(
              {
                publicKey: this.vapidPublicKey,
                privateKey: this.vapidPrivateKey,
                createdAt: new Date().toISOString(),
              },
              null,
              2
            ),
            'utf-8'
          );
          console.log('[NotificationService] Nuevas claves VAPID generadas y guardadas correctamente.');
        } catch (err) {
          console.error('[NotificationService] Error generando claves VAPID:', err);
        }
      }
    }

    if (this.vapidPublicKey && this.vapidPrivateKey) {
      try {
        webpush.setVapidDetails(this.vapidSubject, this.vapidPublicKey, this.vapidPrivateKey);
      } catch (err) {
        console.error('[NotificationService] Error configurando webpush:', err);
      }
    }
  }

  public getVapidPublicKey(): string {
    return this.vapidPublicKey;
  }

  /**
   * Suscribe un cliente al canal SSE (Server-Sent Events) de su tenant
   * para recibir notificaciones instantáneas en segundo plano.
   */
  public registerSseClient(tenantId: string, res: Response): () => void {
    if (!this.sseClients.has(tenantId)) {
      this.sseClients.set(tenantId, new Set());
    }
    const clientSet = this.sseClients.get(tenantId)!;
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
  private broadcastSse(tenantId: string, notification: AppNotification): void {
    const clients = this.sseClients.get(tenantId);
    if (!clients || clients.size === 0) return;

    const payload = `data: ${JSON.stringify({ type: 'notification', notification })}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch (e) {
        // En caso de socket caído
      }
    }
  }

  /**
   * Envía la notificación Web Push a todos los celulares / dispositivos PWA suscritos
   */
  public async sendPushToTenant(
    tenantId: string,
    notification: AppNotification
  ): Promise<{ sent: number; failed: number }> {
    if (!this.vapidPublicKey || !this.vapidPrivateKey) {
      return { sent: 0, failed: 0 };
    }

    const subscriptions = await db.getPushSubscriptions(tenantId);
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

    await Promise.all(
      subscriptions.map(async (sub) => {
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
        } catch (err: any) {
          failed++;
          // Si el endpoint ya no existe (404 o 410 GONE), borrar la suscripción obsoleta
          if (err.statusCode === 404 || err.statusCode === 410) {
            await db.deletePushSubscription(sub.endpoint);
          }
        }
      })
    );

    return { sent, failed };
  }

  /**
   * Crea una notificación, la guarda en la base de datos, la envía por SSE
   * y despacha un Push Notification a todos los celulares con la PWA instalada.
   */
  public async notify(params: NotifyParams): Promise<AppNotification> {
    const notification = await db.createNotification({
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

export const notificationService = new NotificationService();

/**
 * Función global utilitaria para conectar cualquier módulo presente o futuro
 * con el sistema de notificaciones en 1 sola línea de código.
 */
export async function notifyEvent(params: NotifyParams): Promise<AppNotification> {
  return notificationService.notify(params);
}
