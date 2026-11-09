"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const emailService_1 = require("../services/emailService");
const permissions_1 = require("../../shared/permissions");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.use((req, res, next) => {
    const rolePerms = req.auth?.role?.permissions;
    const isAdm = req.auth?.role?.isSystem || (req.auth?.role?.name && req.auth.role.name.toLowerCase().includes('admin'));
    if (isAdm || (0, permissions_1.hasPermission)(rolePerms, 'workspace.emails.view') || (0, permissions_1.hasPermission)(rolePerms, 'workspace.emails.manage')) {
        return next();
    }
    return res.status(403).json({ error: 'No tienes permisos para acceder a la bandeja de correos corporativos.' });
});
// Multer storage for email attachments
const emailUploadStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const dir = path_1.default.resolve(process.cwd(), 'uploads', 'emails');
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || '';
        const safeName = path_1.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        cb(null, `${safeName}-${unique}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage: emailUploadStorage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max email attachment
});
// =============================================================================
// CUENTAS DE CORREO (SMTP / IMAP)
// =============================================================================
// GET /api/workspace/emails/accounts
router.get('/accounts', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant no especificado' });
        const accounts = await db_1.db.getEmailAccounts(tenantId);
        // Ocultar contraseñas en respuesta por seguridad
        const safeAccounts = accounts.map((acc) => ({
            ...acc,
            smtpPassword: acc.smtpPassword ? '••••••••' : '',
            imapPassword: acc.imapPassword ? '••••••••' : '',
        }));
        return res.json({ success: true, accounts: safeAccounts });
    }
    catch (err) {
        console.error('Error fetching email accounts:', err);
        return res.status(500).json({ error: err.message || 'Error al obtener cuentas' });
    }
});
// POST /api/workspace/emails/accounts
router.post('/accounts', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        const userId = req.auth?.user?.id;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant no especificado' });
        const { id, name, email, senderName, signatureHtml, isDefault, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword, imapHost, imapPort, imapSecure, imapUser, imapPassword, provider, } = req.body;
        if (!email || !smtpHost) {
            return res.status(400).json({ error: 'El correo electrónico y el host SMTP son requeridos.' });
        }
        // Si la contraseña viene como máscara '••••••••', no sobreescribirla
        const cleanSmtpPassword = smtpPassword === '••••••••' ? undefined : smtpPassword;
        const cleanImapPassword = imapPassword === '••••••••' ? undefined : imapPassword;
        const account = await db_1.db.saveEmailAccount({
            id,
            tenantId,
            userId,
            name: name || email.split('@')[0],
            email: email.trim().toLowerCase(),
            senderName: senderName || name,
            signatureHtml: signatureHtml || '',
            isDefault: Boolean(isDefault),
            smtpHost: smtpHost.trim(),
            smtpPort: Number(smtpPort) || 465,
            smtpSecure: smtpSecure !== undefined ? Boolean(smtpSecure) : true,
            smtpUser: (smtpUser || email).trim(),
            smtpPassword: cleanSmtpPassword,
            imapHost: (imapHost || smtpHost).trim(),
            imapPort: Number(imapPort) || 993,
            imapSecure: imapSecure !== undefined ? Boolean(imapSecure) : true,
            imapUser: (imapUser || smtpUser || email).trim(),
            imapPassword: cleanImapPassword || cleanSmtpPassword,
            provider: provider || 'custom',
        });
        return res.json({
            success: true,
            account: {
                ...account,
                smtpPassword: account.smtpPassword ? '••••••••' : '',
                imapPassword: account.imapPassword ? '••••••••' : '',
            },
        });
    }
    catch (err) {
        console.error('Error saving email account:', err);
        return res.status(500).json({ error: err.message || 'Error al guardar cuenta' });
    }
});
// DELETE /api/workspace/emails/accounts/:id
router.delete('/accounts/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant no especificado' });
        const accountId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const success = await db_1.db.deleteEmailAccount(accountId, tenantId);
        return res.json({ success });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error al eliminar cuenta' });
    }
});
// POST /api/workspace/emails/test-connection
router.post('/test-connection', auth_1.requireAuth, async (req, res) => {
    try {
        const { type, host, port, secure, user, pass, accountId } = req.body;
        let testUser = user;
        let testPass = pass;
        // Si pasaron accountId y el password es máscara, cargar la real de BD
        if (accountId && (!pass || pass === '••••••••')) {
            const tenantId = req.auth?.tenant?.id;
            if (tenantId) {
                const acc = await db_1.db.getEmailAccountById(accountId, tenantId);
                if (acc) {
                    testUser = testUser || (type === 'imap' ? acc.imapUser : acc.smtpUser);
                    testPass = type === 'imap' ? acc.imapPassword : acc.smtpPassword;
                }
            }
        }
        if (!host || !testUser || !testPass) {
            return res.status(400).json({
                ok: false,
                message: 'Faltan parámetros requeridos (host, usuario y contraseña) para la prueba.',
            });
        }
        if (type === 'imap') {
            const result = await emailService_1.emailService.testImap({
                host,
                port: Number(port) || 993,
                secure: Boolean(secure),
                user: testUser,
                pass: testPass,
            });
            return res.json(result);
        }
        else {
            const result = await emailService_1.emailService.testSmtp({
                host,
                port: Number(port) || 465,
                secure: Boolean(secure),
                user: testUser,
                pass: testPass,
            });
            return res.json(result);
        }
    }
    catch (err) {
        return res.status(500).json({ ok: false, message: err.message || 'Error en prueba de conexión' });
    }
});
// =============================================================================
// MENSAJES Y BANDEJAS
// =============================================================================
// GET /api/workspace/emails/messages
router.get('/messages', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant no especificado' });
        const accountId = req.query.accountId;
        const folder = req.query.folder || 'inbox';
        const search = req.query.search;
        const limit = Number(req.query.limit) || 40;
        const offset = Number(req.query.offset) || 0;
        const refresh = req.query.refresh === 'true';
        const accounts = await db_1.db.getEmailAccounts(tenantId);
        if (accounts.length === 0) {
            return res.json({
                success: true,
                messages: [],
                total: 0,
                unreadCount: 0,
                accounts: [],
                hasAccounts: false,
            });
        }
        const currentAccount = accountId
            ? accounts.find((a) => a.id === accountId) || accounts[0]
            : accounts.find((a) => a.isDefault) || accounts[0];
        // Si se solicita sincronización fresca (refresh) y la carpeta es inbox
        let syncError = null;
        if (refresh && folder === 'inbox' && currentAccount?.imapHost && currentAccount?.imapPassword) {
            try {
                await emailService_1.emailService.syncInbox(currentAccount, 20);
            }
            catch (err) {
                console.error('[Emails Route] Error sincronizando inbox:', err);
                syncError = err.message || 'Error al conectar con servidor IMAP';
            }
        }
        const result = await db_1.db.getEmailMessages(tenantId, {
            accountId: currentAccount?.id,
            folder,
            search,
            limit,
            offset,
        });
        return res.json({
            success: true,
            currentAccountId: currentAccount?.id,
            messages: result.messages,
            total: result.total,
            unreadCount: result.unreadCount,
            syncError,
        });
    }
    catch (err) {
        console.error('Error fetching email messages:', err);
        return res.status(500).json({ error: err.message || 'Error al cargar mensajes' });
    }
});
// GET /api/workspace/emails/messages/:id
router.get('/messages/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant no especificado' });
        const msgId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const msg = await db_1.db.getEmailMessageById(msgId, tenantId);
        if (!msg)
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        // Marcar como leído automáticamente
        if (!msg.isRead) {
            await db_1.db.updateEmailMessage(msg.id, tenantId, { isRead: true });
            msg.isRead = true;
        }
        return res.json({ success: true, message: msg });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error al obtener mensaje' });
    }
});
// POST /api/workspace/emails/send
router.post('/send', auth_1.requireAuth, upload.array('attachments', 10), async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant no especificado' });
        const { accountId, to, cc, bcc, subject, bodyHtml, bodyText, replyTo, } = req.body;
        if (!to || !subject) {
            return res.status(400).json({ error: 'Destinatario y asunto son requeridos.' });
        }
        const accounts = await db_1.db.getEmailAccounts(tenantId);
        const account = accountId
            ? accounts.find((a) => a.id === accountId)
            : accounts.find((a) => a.isDefault) || accounts[0];
        if (!account) {
            return res.status(400).json({ error: 'No hay ninguna cuenta de correo configurada para enviar.' });
        }
        // Parsear destinatarios
        const parseRecipients = (raw) => {
            if (!raw)
                return [];
            if (Array.isArray(raw))
                return raw.map((r) => String(r).trim()).filter(Boolean);
            return String(raw)
                .split(/[,;]/)
                .map((r) => r.trim())
                .filter(Boolean);
        };
        const toList = parseRecipients(to);
        const ccList = parseRecipients(cc);
        const bccList = parseRecipients(bcc);
        if (toList.length === 0) {
            return res.status(400).json({ error: 'Debes especificar al menos un destinatario válido.' });
        }
        // Manejo de adjuntos subidos
        const files = req.files || [];
        const mailAttachments = files.map((f) => ({
            filename: f.originalname,
            path: f.path,
            contentType: f.mimetype,
        }));
        // Enviar a través de SMTP
        const sendResult = await emailService_1.emailService.sendEmail(account, {
            to: toList,
            cc: ccList,
            bcc: bccList,
            replyTo,
            subject,
            html: bodyHtml || bodyText,
            text: bodyText || '',
            attachments: mailAttachments,
        });
        // Guardar copia local en la carpeta 'sent'
        const savedSent = await db_1.db.saveEmailMessage({
            tenantId,
            accountId: account.id,
            folder: 'sent',
            messageId: sendResult.messageId,
            from: account.email,
            fromName: account.senderName,
            to: toList,
            cc: ccList,
            bcc: bccList,
            subject,
            snippet: (bodyText || '').substring(0, 140).trim(),
            bodyHtml: bodyHtml || '',
            bodyText: bodyText || '',
            isRead: true,
            isStarred: false,
            hasAttachments: mailAttachments.length > 0,
            attachments: files.map((f) => ({
                filename: f.originalname,
                contentType: f.mimetype,
                size: f.size,
                url: `/uploads/emails/${path_1.default.basename(f.path)}`,
            })),
            date: new Date().toISOString(),
        });
        return res.json({
            success: true,
            messageId: sendResult.messageId,
            sentMessage: savedSent,
            message: 'Correo enviado correctamente',
        });
    }
    catch (err) {
        console.error('Error enviando correo:', err);
        return res.status(500).json({ error: err.message || 'Error al enviar el correo' });
    }
});
// POST /api/workspace/emails/draft
router.post('/draft', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant no especificado' });
        const { id, accountId, to, subject, bodyHtml, bodyText } = req.body;
        const accounts = await db_1.db.getEmailAccounts(tenantId);
        const account = accountId
            ? accounts.find((a) => a.id === accountId)
            : accounts.find((a) => a.isDefault) || accounts[0];
        const parseRecipients = (raw) => {
            if (!raw)
                return [];
            if (Array.isArray(raw))
                return raw;
            return String(raw)
                .split(/[,;]/)
                .map((r) => r.trim())
                .filter(Boolean);
        };
        const draft = await db_1.db.saveEmailMessage({
            id,
            tenantId,
            accountId: account?.id || 'draft-acc',
            folder: 'drafts',
            from: account?.email || '',
            fromName: account?.senderName || '',
            to: parseRecipients(to),
            subject: subject || '(Borrador sin título)',
            snippet: (bodyText || '').substring(0, 140).trim(),
            bodyHtml: bodyHtml || '',
            bodyText: bodyText || '',
            isRead: true,
            isStarred: false,
            hasAttachments: false,
            date: new Date().toISOString(),
        });
        return res.json({ success: true, draft });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error al guardar borrador' });
    }
});
// PUT /api/workspace/emails/messages/:id/read
router.put('/messages/:id/read', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant no especificado' });
        const msgId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { isRead } = req.body;
        const updated = await db_1.db.updateEmailMessage(msgId, tenantId, {
            isRead: Boolean(isRead),
        });
        return res.json({ success: true, message: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error al actualizar lectura' });
    }
});
// PUT /api/workspace/emails/messages/:id/star
router.put('/messages/:id/star', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant no especificado' });
        const msgId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const msg = await db_1.db.getEmailMessageById(msgId, tenantId);
        if (!msg)
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        const newStarred = req.body.isStarred !== undefined ? Boolean(req.body.isStarred) : !msg.isStarred;
        const updated = await db_1.db.updateEmailMessage(msg.id, tenantId, {
            isStarred: newStarred,
        });
        return res.json({ success: true, message: updated });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error al actualizar favorito' });
    }
});
// DELETE /api/workspace/emails/messages/:id
router.delete('/messages/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const tenantId = req.auth?.tenant?.id;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant no especificado' });
        const msgId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const hardDelete = req.query.hard === 'true';
        const success = await db_1.db.deleteEmailMessage(msgId, tenantId, hardDelete);
        return res.json({ success });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'Error al eliminar correo' });
    }
});
exports.default = router;
