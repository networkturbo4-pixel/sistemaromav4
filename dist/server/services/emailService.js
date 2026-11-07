"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const imapflow_1 = require("imapflow");
const mailparser_1 = require("mailparser");
const db_1 = require("../db");
class EmailService {
    /**
     * Probar conexión SMTP saliente (ej: Namecheap, BanaHosting, etc.)
     */
    async testSmtp(config) {
        try {
            const transporter = nodemailer_1.default.createTransport({
                host: config.host.trim(),
                port: Number(config.port),
                secure: Boolean(config.secure),
                auth: {
                    user: config.user.trim(),
                    pass: config.pass,
                },
                tls: {
                    rejectUnauthorized: false,
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
            });
            await transporter.verify();
            return { ok: true, message: 'Conexión SMTP exitosa. El servidor saliente está listo para enviar.' };
        }
        catch (err) {
            console.error('[EmailService] Error verificando SMTP:', err);
            return {
                ok: false,
                message: err.message || 'No se pudo conectar al servidor SMTP. Revisa el host, puerto y credenciales.',
            };
        }
    }
    /**
     * Probar conexión IMAP entrante
     */
    async testImap(config) {
        const client = new imapflow_1.ImapFlow({
            host: config.host.trim(),
            port: Number(config.port),
            secure: Boolean(config.secure),
            auth: {
                user: config.user.trim(),
                pass: config.pass,
            },
            tls: {
                rejectUnauthorized: false,
            },
            logger: false,
            emitLogs: false,
        });
        try {
            await client.connect();
            await client.logout();
            return { ok: true, message: 'Conexión IMAP exitosa. El servidor entrante está listo para recibir.' };
        }
        catch (err) {
            console.error('[EmailService] Error verificando IMAP:', err);
            try {
                await client.close();
            }
            catch { }
            return {
                ok: false,
                message: err.message || 'No se pudo conectar al servidor IMAP. Revisa el host, puerto y credenciales.',
            };
        }
    }
    /**
     * Enviar un correo electrónico vía SMTP
     */
    async sendEmail(account, options) {
        if (!account.smtpHost || !account.smtpUser) {
            throw new Error('La cuenta no tiene configurado el servidor SMTP.');
        }
        const transporter = nodemailer_1.default.createTransport({
            host: account.smtpHost.trim(),
            port: Number(account.smtpPort) || 465,
            secure: account.smtpSecure !== undefined ? account.smtpSecure : true,
            auth: {
                user: account.smtpUser.trim(),
                pass: account.smtpPassword || '',
            },
            tls: {
                rejectUnauthorized: false,
            },
            connectionTimeout: 15000,
        });
        const senderDisplay = account.senderName
            ? `"${account.senderName.replace(/"/g, '')}" <${account.email}>`
            : account.email;
        const info = await transporter.sendMail({
            from: senderDisplay,
            to: options.to.join(', '),
            cc: options.cc && options.cc.length > 0 ? options.cc.join(', ') : undefined,
            bcc: options.bcc && options.bcc.length > 0 ? options.bcc.join(', ') : undefined,
            replyTo: options.replyTo || account.email,
            subject: options.subject,
            text: options.text,
            html: options.html,
            attachments: options.attachments,
        });
        return { success: true, messageId: info.messageId || `msg-${Date.now()}` };
    }
    /**
     * Sincronizar bajo demanda los últimos correos (IMAP) de forma ultraligera
     * Evita saturar el servidor o memoria de BanaHosting limitando el escaneo a los últimos N mensajes.
     */
    async syncInbox(account, limit = 20) {
        if (!account.imapHost || !account.imapUser || !account.imapPassword) {
            return { fetchedCount: 0, newMessagesCount: 0 };
        }
        const client = new imapflow_1.ImapFlow({
            host: account.imapHost.trim(),
            port: Number(account.imapPort) || 993,
            secure: account.imapSecure !== undefined ? account.imapSecure : true,
            auth: {
                user: account.imapUser.trim(),
                pass: account.imapPassword,
            },
            tls: {
                rejectUnauthorized: false,
            },
            logger: false,
            emitLogs: false,
        });
        let fetchedCount = 0;
        let newMessagesCount = 0;
        try {
            await client.connect();
            // Abrir INBOX en modo solo lectura
            const lock = await client.getMailboxLock('INBOX');
            try {
                const status = await client.status('INBOX', { messages: true });
                const totalInServer = status && typeof status === 'object' && status.messages ? status.messages : 0;
                if (totalInServer > 0) {
                    // Tomar solo los últimos `limit` mensajes (ej. los 20 más recientes)
                    const startSeq = Math.max(1, totalInServer - limit + 1);
                    const range = `${startSeq}:${totalInServer}`;
                    // Descargar estructura y encabezados
                    for await (const message of client.fetch(range, {
                        envelope: true,
                        source: true,
                        uid: true,
                        flags: true,
                    })) {
                        fetchedCount++;
                        if (!message.source)
                            continue;
                        try {
                            // Parsear mensaje completo
                            const parsed = await (0, mailparser_1.simpleParser)(message.source);
                            const fromAddress = parsed.from?.value?.[0]?.address || account.email;
                            const fromName = parsed.from?.value?.[0]?.name || '';
                            const toAddresses = parsed.to
                                ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]).flatMap((t) => t.value ? t.value.map((v) => v.address || '') : [])
                                : [];
                            const msgDate = parsed.date ? new Date(parsed.date).toISOString() : new Date().toISOString();
                            const isRead = message.flags ? message.flags.has('\\Seen') : false;
                            const isStarred = message.flags ? message.flags.has('\\Flagged') : false;
                            // Manejo de adjuntos ligeros (guardar nombres y tamaños)
                            const attachments = (parsed.attachments || []).map((att) => ({
                                filename: att.filename || 'adjunto',
                                contentType: att.contentType || 'application/octet-stream',
                                size: att.size || 0,
                                contentId: att.contentId,
                            }));
                            const savedMsg = await db_1.db.saveEmailMessage({
                                tenantId: account.tenantId,
                                accountId: account.id,
                                folder: 'inbox',
                                uid: message.uid,
                                messageId: parsed.messageId || `uid-${message.uid}`,
                                from: fromAddress,
                                fromName: fromName,
                                to: toAddresses.filter(Boolean),
                                subject: parsed.subject || '(Sin Asunto)',
                                snippet: (parsed.text || '').substring(0, 150).replace(/\s+/g, ' ').trim(),
                                bodyHtml: parsed.html || (parsed.textAsHtml || parsed.text || ''),
                                bodyText: parsed.text || '',
                                isRead: isRead,
                                isStarred: isStarred,
                                hasAttachments: attachments.length > 0,
                                attachments: attachments,
                                date: msgDate,
                            });
                            if (savedMsg) {
                                newMessagesCount++;
                            }
                        }
                        catch (err) {
                            console.error('[EmailService] Error parseando mensaje individual:', err);
                        }
                    }
                }
            }
            finally {
                lock.release();
            }
            await client.logout();
            // Actualizar timestamp de última sincronización
            await db_1.db.saveEmailAccount({
                id: account.id,
                tenantId: account.tenantId,
                email: account.email,
                name: account.name,
                lastSyncedAt: new Date().toISOString(),
            });
        }
        catch (err) {
            console.error('[EmailService] Error en syncInbox:', err);
            try {
                await client.close();
            }
            catch { }
            throw err;
        }
        return { fetchedCount, newMessagesCount };
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
