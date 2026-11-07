import React, { useState } from 'react';
import {
  X,
  Mail,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Send,
  Inbox,
  Trash2,
} from 'lucide-react';
import { WorkspaceEmailAccount } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface EmailConfigModalProps {
  isOpen: boolean;
  accounts: WorkspaceEmailAccount[];
  editingAccount: Partial<WorkspaceEmailAccount> | null;
  onClose: () => void;
  onSaved: () => void;
}

export const EmailConfigModal: React.FC<EmailConfigModalProps> = ({
  isOpen,
  accounts,
  editingAccount,
  onClose,
  onSaved,
}) => {
  const { toast, apiFetch } = useApp();

  const [formData, setFormData] = useState<Partial<WorkspaceEmailAccount>>(() => {
    return (
      editingAccount || {
        name: 'Principal',
        email: '',
        senderName: '',
        isDefault: true,
        smtpHost: '',
        smtpPort: 465,
        smtpSecure: true,
        smtpUser: '',
        smtpPassword: '',
        imapHost: '',
        imapPort: 993,
        imapSecure: true,
        imapUser: '',
        imapPassword: '',
        provider: 'banahosting',
      }
    );
  });

  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const [testingImap, setTestingImap] = useState(false);
  const [imapStatus, setImapStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  // Preset selector
  const handleApplyPreset = (preset: 'banahosting' | 'namecheap' | 'gmail' | 'custom') => {
    let domain = '';
    if (formData.email && formData.email.includes('@')) {
      domain = formData.email.split('@')[1];
    }

    if (preset === 'banahosting') {
      const host = domain ? `mail.${domain}` : '';
      setFormData((prev) => ({
        ...prev,
        provider: 'banahosting',
        smtpHost: host,
        smtpPort: 465,
        smtpSecure: true,
        smtpUser: prev.email || '',
        imapHost: host,
        imapPort: 993,
        imapSecure: true,
        imapUser: prev.email || '',
      }));
    } else if (preset === 'namecheap') {
      setFormData((prev) => ({
        ...prev,
        provider: 'namecheap',
        smtpHost: 'mail.privateemail.com',
        smtpPort: 465,
        smtpSecure: true,
        smtpUser: prev.email || '',
        imapHost: 'mail.privateemail.com',
        imapPort: 993,
        imapSecure: true,
        imapUser: prev.email || '',
      }));
    } else if (preset === 'gmail') {
      setFormData((prev) => ({
        ...prev,
        provider: 'gmail',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpSecure: true,
        smtpUser: prev.email || '',
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapSecure: true,
        imapUser: prev.email || '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        provider: 'custom',
      }));
    }
  };

  const handleTestSmtp = async () => {
    if (!formData.smtpHost || !formData.smtpUser) {
      toast('Ingresa el servidor y usuario SMTP', 'error');
      return;
    }
    setTestingSmtp(true);
    setSmtpStatus(null);
    try {
      const res: any = await apiFetch('/api/workspace/emails/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'smtp',
          host: formData.smtpHost,
          port: formData.smtpPort,
          secure: formData.smtpSecure,
          user: formData.smtpUser,
          pass: formData.smtpPassword,
          accountId: formData.id,
        }),
      });
      setSmtpStatus(res);
      if (res.ok) {
        toast('SMTP verificado correctamente', 'success');
      } else {
        toast(res.message || 'Fallo en la conexión SMTP', 'error');
      }
    } catch (err: any) {
      setSmtpStatus({ ok: false, message: err.message || 'Error al conectar con SMTP' });
      toast('Error al probar SMTP', 'error');
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestImap = async () => {
    if (!formData.imapHost || !formData.imapUser) {
      toast('Ingresa el servidor y usuario IMAP', 'error');
      return;
    }
    setTestingImap(true);
    setImapStatus(null);
    try {
      const res: any = await apiFetch('/api/workspace/emails/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'imap',
          host: formData.imapHost,
          port: formData.imapPort,
          secure: formData.imapSecure,
          user: formData.imapUser,
          pass: formData.imapPassword || formData.smtpPassword,
          accountId: formData.id,
        }),
      });
      setImapStatus(res);
      if (res.ok) {
        toast('IMAP verificado correctamente', 'success');
      } else {
        toast(res.message || 'Fallo en la conexión IMAP', 'error');
      }
    } catch (err: any) {
      setImapStatus({ ok: false, message: err.message || 'Error al conectar con IMAP' });
      toast('Error al probar IMAP', 'error');
    } finally {
      setTestingImap(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.smtpHost) {
      toast('Correo electrónico y Host SMTP son obligatorios', 'error');
      return;
    }

    setSaving(true);
    try {
      const res: any = await apiFetch('/api/workspace/emails/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.success) {
        toast('Configuración de correo guardada con éxito', 'success');
        onSaved();
        onClose();
      }
    } catch (err: any) {
      toast(err.message || 'Error al guardar la configuración', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-scaleIn flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {formData.id ? 'Editar Cuenta de Correo' : 'Configurar Cuenta de Correo'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Conecta tu dominio personalizado vía SMTP / IMAP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Presets Rápidos */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              Plantilla / Proveedor de Hospedaje
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset('banahosting')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  formData.provider === 'banahosting'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                BanaHosting (cPanel)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('namecheap')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  formData.provider === 'namecheap'
                    ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Namecheap Email
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('gmail')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  formData.provider === 'gmail'
                    ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Google / Gmail
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('custom')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                  formData.provider === 'custom'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>

          {/* Información General */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Nombre de la Cuenta *
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ej: Principal, Ventas, Gerencia"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                value={formData.email || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const domain = val.includes('@') ? val.split('@')[1] : '';
                  setFormData((prev) => ({
                    ...prev,
                    email: val,
                    smtpUser: prev.smtpUser || val,
                    imapUser: prev.imapUser || val,
                    smtpHost: prev.provider === 'banahosting' && domain ? `mail.${domain}` : prev.smtpHost,
                    imapHost: prev.provider === 'banahosting' && domain ? `mail.${domain}` : prev.imapHost,
                  }));
                }}
                placeholder="contacto@tudominio.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Nombre del Remitente (Alias)
              </label>
              <input
                type="text"
                value={formData.senderName || ''}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                placeholder="ej: Agencia Roma Publicidad"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(formData.isDefault)}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                />
                Cuenta predeterminada para envíos
              </label>
            </div>
          </div>

          {/* Servidor Saliente SMTP */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wide">
                <Send className="w-4 h-4 text-blue-500" />
                Servidor Saliente (SMTP - Envío)
              </div>
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {testingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Probar SMTP
              </button>
            </div>

            {smtpStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  smtpStatus.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {smtpStatus.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{smtpStatus.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Host SMTP *
                </label>
                <input
                  type="text"
                  required
                  value={formData.smtpHost || ''}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  placeholder="ej: mail.tudominio.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Puerto SMTP
                </label>
                <input
                  type="number"
                  value={formData.smtpPort || 465}
                  onChange={(e) => setFormData({ ...formData, smtpPort: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Usuario SMTP
                </label>
                <input
                  type="text"
                  value={formData.smtpUser || ''}
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                  placeholder="contacto@tudominio.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Contraseña SMTP
                </label>
                <input
                  type="password"
                  value={formData.smtpPassword || ''}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="smtpSecure"
                checked={Boolean(formData.smtpSecure)}
                onChange={(e) => setFormData({ ...formData, smtpSecure: e.target.checked })}
                className="w-3.5 h-3.5 rounded-sm text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
              />
              <label htmlFor="smtpSecure" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                Conexión segura SSL/TLS (recomendado para puerto 465)
              </label>
            </div>
          </div>

          {/* Servidor Entrante IMAP */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wide">
                <Inbox className="w-4 h-4 text-emerald-500" />
                Servidor Entrante (IMAP - Recepción)
              </div>
              <button
                type="button"
                onClick={handleTestImap}
                disabled={testingImap}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {testingImap ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Probar IMAP
              </button>
            </div>

            {imapStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  imapStatus.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {imapStatus.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <span>{imapStatus.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Host IMAP
                </label>
                <input
                  type="text"
                  value={formData.imapHost || ''}
                  onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                  placeholder="ej: mail.tudominio.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Puerto IMAP
                </label>
                <input
                  type="number"
                  value={formData.imapPort || 993}
                  onChange={(e) => setFormData({ ...formData, imapPort: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Usuario IMAP
                </label>
                <input
                  type="text"
                  value={formData.imapUser || ''}
                  onChange={(e) => setFormData({ ...formData, imapUser: e.target.value })}
                  placeholder="contacto@tudominio.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Contraseña IMAP (Dejar en blanco para usar la de SMTP)
                </label>
                <input
                  type="password"
                  value={formData.imapPassword || ''}
                  onChange={(e) => setFormData({ ...formData, imapPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="imapSecure"
                checked={Boolean(formData.imapSecure)}
                onChange={(e) => setFormData({ ...formData, imapSecure: e.target.checked })}
                className="w-3.5 h-3.5 rounded-sm text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
              />
              <label htmlFor="imapSecure" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                Conexión segura SSL/TLS (recomendado para puerto 993)
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {formData.id ? 'Guardar Cambios' : 'Conectar Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
