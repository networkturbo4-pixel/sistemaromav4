import React, { useState, useEffect, useRef } from 'react';
import { QuotePaymentMethod } from '../../shared/types';
import { useApp } from '../context/AppContext';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  X,
  Building,
  DollarSign,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Smartphone,
  QrCode,
  ShieldCheck,
  Save,
} from 'lucide-react';

export interface BankAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Cuentas actuales a editar
  initialAccounts: QuotePaymentMethod[];
  // Switcher de vista pública (opcional, cuando se usa dentro de una cotización)
  showPaymentMethods?: boolean;
  onToggleShowPaymentMethods?: (show: boolean) => void;
  // Callback al guardar
  onSave: (accounts: QuotePaymentMethod[], saveAsDefaultAgency: boolean) => Promise<void> | void;
  // Modo predeterminado de agencia (si se abre desde el listado general de cotizaciones o settings)
  isAgencyDefaultMode?: boolean;
}

const PRESET_BANKS = [
  { name: 'BCP Soles', currency: 'PEN', color: '#002a8f', logoLabel: 'BCP' },
  { name: 'BCP Dólares', currency: 'USD', color: '#002a8f', logoLabel: 'BCP $' },
  { name: 'BBVA Soles', currency: 'PEN', color: '#004481', logoLabel: 'BBVA' },
  { name: 'Interbank Soles', currency: 'PEN', color: '#009900', logoLabel: 'IBK' },
  { name: 'Scotiabank', currency: 'PEN', color: '#ec111a', logoLabel: 'SCOTIA' },
  { name: 'Yape Corporativo', currency: 'PEN', color: '#742284', logoLabel: 'YAPE' },
  { name: 'Plin', currency: 'PEN', color: '#00c3ff', logoLabel: 'PLIN' },
  { name: 'Banco de la Nación', currency: 'PEN', color: '#b91c1c', logoLabel: 'BN' },
];

export const BankAccountsModal: React.FC<BankAccountsModalProps> = ({
  isOpen,
  onClose,
  initialAccounts,
  showPaymentMethods = true,
  onToggleShowPaymentMethods,
  onSave,
  isAgencyDefaultMode = false,
}) => {
  const { tenant, toast } = useApp();
  const [accounts, setAccounts] = useState<QuotePaymentMethod[]>([]);
  const [localShowPublic, setLocalShowPublic] = useState<boolean>(showPaymentMethods);
  const [saveAsDefaultAgency, setSaveAsDefaultAgency] = useState<boolean>(isAgencyDefaultMode);
  const [saving, setSaving] = useState<boolean>(false);

  // Estado para formulario de edición/creación de cuenta individual
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  // Campos del formulario individual
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    beneficiary: string;
    accountNumber: string;
    notes: string;
    imageUrl: string;
    imageInputMode: 'upload' | 'url';
    currency: string;
    isActive: boolean;
  }>({
    id: '',
    name: '',
    beneficiary: '',
    accountNumber: '',
    notes: '',
    imageUrl: '',
    imageInputMode: 'upload',
    currency: 'PEN',
    isActive: true,
  });

  const [previewImageZoom, setPreviewImageZoom] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sincronizar cuentas al abrir modal
  useEffect(() => {
    if (isOpen) {
      const cloned = Array.isArray(initialAccounts) ? JSON.parse(JSON.stringify(initialAccounts)) : [];
      setAccounts(cloned);
      setLocalShowPublic(showPaymentMethods !== false);
      setSaveAsDefaultAgency(isAgencyDefaultMode);
      setIsFormOpen(false);
      setEditingIndex(null);
    }
  }, [isOpen, initialAccounts, showPaymentMethods, isAgencyDefaultMode]);

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    setEditingIndex(null);
    setFormData({
      id: `pm-${Date.now()}`,
      name: '',
      beneficiary: tenant.companyInfo?.legalName || tenant.companyInfo?.commercialName || tenant.name,
      accountNumber: '',
      notes: '',
      imageUrl: '',
      imageInputMode: 'upload',
      currency: tenant.customization?.currencyCode || 'PEN',
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (index: number) => {
    const target = accounts[index];
    setEditingIndex(index);
    setFormData({
      id: target.id || `pm-${Date.now()}`,
      name: target.name || '',
      beneficiary: target.beneficiary || '',
      accountNumber: target.accountNumber || '',
      notes: target.notes || '',
      imageUrl: target.imageUrl || '',
      imageInputMode: target.imageUrl && target.imageUrl.startsWith('http') ? 'url' : 'upload',
      currency: target.currency || 'PEN',
      isActive: target.isActive !== false,
    });
    setIsFormOpen(true);
  };

  const handleApplyPresetBank = (preset: typeof PRESET_BANKS[0]) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      currency: preset.currency,
      notes: preset.name.includes('Yape') || preset.name.includes('Plin')
        ? 'Enviar constancia o captura de pantalla al WhatsApp oficial.'
        : prev.notes || 'CCI: 002-...',
    }));
  };

  const handleFileUpload = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WEBP).', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('La imagen supera el límite de 5MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, imageUrl: base64 }));
      toast('Imagen/código QR cargado con éxito.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFormAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast('El nombre del banco o método de pago es requerido.', 'warning');
      return;
    }
    if (!formData.accountNumber.trim()) {
      toast('El número de cuenta, CCI o celular es requerido.', 'warning');
      return;
    }

    const newPm: QuotePaymentMethod = {
      id: formData.id || `pm-${Date.now()}`,
      name: formData.name.trim(),
      beneficiary: formData.beneficiary.trim(),
      accountNumber: formData.accountNumber.trim(),
      notes: formData.notes.trim(),
      imageUrl: formData.imageUrl.trim(),
      imageType: formData.imageInputMode,
      currency: formData.currency,
      isActive: formData.isActive,
    };

    if (editingIndex !== null) {
      // Actualizar existente
      setAccounts((prev) => {
        const next = [...prev];
        next[editingIndex] = newPm;
        return next;
      });
      toast(`Cuenta "${newPm.name}" actualizada.`);
    } else {
      // Agregar nueva
      setAccounts((prev) => [...prev, newPm]);
      toast(`Cuenta "${newPm.name}" añadida.`);
    }

    setIsFormOpen(false);
    setEditingIndex(null);
  };

  const handleDeleteAccount = (index: number) => {
    const target = accounts[index];
    setAccounts((prev) => prev.filter((_, i) => i !== index));
    toast(`Cuenta "${target.name}" eliminada.`);
  };

  const handleToggleAccountActive = (index: number) => {
    setAccounts((prev) => {
      const next = [...prev];
      const cur = next[index];
      next[index] = { ...cur, isActive: cur.isActive === false ? true : false };
      return next;
    });
  };

  const handleFinalSave = async () => {
    setSaving(true);
    try {
      if (onToggleShowPaymentMethods) {
        onToggleShowPaymentMethods(localShowPublic);
      }
      await onSave(accounts, saveAsDefaultAgency);
      onClose();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABECERA DEL MODAL */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <span>Ajuste de Cuentas Bancarias & Pagos</span>
                <span className="text-[10px] uppercase font-mono-pin font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                  {accounts.length} {accounts.length === 1 ? 'cuenta' : 'cuentas'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isAgencyDefaultMode
                  ? 'Configura las cuentas predeterminadas de la agencia para cotizaciones'
                  : 'Administra las cuentas y códigos QR para esta propuesta'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENIDO SCROLLEABLE */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* SWITCHER MAESTRO: MOSTRAR U OCULTAR EN VISTA PÚBLICA */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-slate-100">
                  Mostrar cuentas en la vista pública
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    localShowPublic
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {localShowPublic ? 'Visible para el cliente' : 'Oculto para el cliente'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {localShowPublic
                  ? 'El cliente podrá ver los números de cuenta, CCI y códigos QR al abrir el enlace público.'
                  : 'Los datos bancarios y QRs NO aparecerán en el enlace público compartido con el cliente.'}
              </p>
            </div>

            {/* SWITCHER TOGGLE PILL */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 self-start sm:self-auto">
              <input
                type="checkbox"
                checked={localShowPublic}
                onChange={(e) => setLocalShowPublic(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* VISTA 1: FORMULARIO PARA CREAR O EDITAR CUENTA INDIVIDUAL */}
          {isFormOpen ? (
            <form
              onSubmit={handleSaveFormAccount}
              className="p-5 rounded-3xl border-2 border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40 pb-2.5">
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                  <CreditCard className="w-3.5 h-3.5" />
                  {editingIndex !== null ? 'Editar Cuenta Bancaria' : 'Añadir Nueva Cuenta Bancaria'}
                </span>

                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>

              {/* Botones rápidos de bancos peruanos / billeteras */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Selección Rápida de Entidad Financiera
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_BANKS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleApplyPresetBank(preset)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span>{preset.logoLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Nombre y Moneda */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Banco / Plataforma de Pago <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. BCP Soles, BBVA, Yape Corporativo..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Moneda
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold outline-none cursor-pointer"
                  >
                    <option value="PEN">Soles (S/ - PEN)</option>
                    <option value="USD">Dólares ($ - USD)</option>
                    <option value="EUR">Euros (€ - EUR)</option>
                  </select>
                </div>
              </div>

              {/* Titular */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Titular de la Cuenta / Razón Social
                  </label>
                  {tenant.companyInfo?.legalName && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          beneficiary: tenant.companyInfo?.legalName || tenant.name,
                        })
                      }
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Usar razón social de la agencia
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.beneficiary}
                  onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
                  placeholder="Ej. ROMA STUDIO PUBLICIDAD Y DISEÑO S.A.C."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold outline-none focus:border-indigo-500"
                />
              </div>

              {/* Número de Cuenta y CCI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Número de Cuenta / Teléfono Yape <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="194-98765432-0-11 o +51 987 654 321"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CCI / Detalles de Transferencia
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="CCI: 002-1940098765432011-92"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-[11px] outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* FOTO, LOGO O CÓDIGO QR (SUBIDA O ENLACE URL) */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                    Imagen, Logo o Código QR de Pago
                  </span>

                  {/* Selector de modo: Subir Archivo vs Enlace URL */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageInputMode: 'upload' })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        formData.imageInputMode === 'upload'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3 h-3 inline mr-1" />
                      Subir Imagen
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageInputMode: 'url' })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        formData.imageInputMode === 'url'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3 inline mr-1" />
                      Enlace URL
                    </button>
                  </div>
                </div>

                {formData.imageInputMode === 'upload' ? (
                  /* OPCIÓN 1: SUBIR ARCHIVO */
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-950/40 hover:bg-indigo-50/20"
                    >
                      <Upload className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                        Haz clic para subir imagen o código QR
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PNG, JPG, SVG o WEBP (máx. 5MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  /* OPCIÓN 2: PEGAR ENLACE URL */
                  <div className="space-y-1.5">
                    <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="https://tudominio.com/qr-yape.png"
                        className="w-full bg-transparent text-xs font-medium outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Pega la URL pública directa de la imagen o comprobante.
                    </p>
                  </div>
                )}

                {/* VISTA PREVIA DE LA IMAGEN O QR CARGADO */}
                {formData.imageUrl && (
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={formData.imageUrl}
                        alt="Preview QR"
                        onClick={() => setPreviewImageZoom(formData.imageUrl)}
                        className="w-12 h-12 rounded-lg object-contain bg-white dark:bg-slate-900 border p-1 shrink-0 cursor-pointer hover:scale-105 transition"
                        title="Ver en grande"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          Imagen asignada
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          ✓ Lista para mostrar en la cotización
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, imageUrl: '' })}
                      className="px-2.5 py-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-bold transition cursor-pointer"
                    >
                      Quitar imagen
                    </button>
                  </div>
                )}
              </div>

              {/* Botones de guardar cuenta individual */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingIndex !== null ? 'Actualizar Cuenta' : 'Guardar Cuenta'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* BOTÓN PARA ABRIR FORMULARIO DE NUEVA CUENTA */
            <div className="flex items-center justify-between">
              <span className="font-extrabold uppercase tracking-wider text-slate-400 text-[11px]">
                Cuentas Configuradas
              </span>

              <button
                type="button"
                onClick={handleOpenAddForm}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Cuenta Bancaria</span>
              </button>
            </div>
          )}

          {/* LISTADO DE CUENTAS BANCARIAS CONFIGURADAS */}
          {!isFormOpen && (
            <div className="space-y-3">
              {accounts.length === 0 ? (
                <div className="p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-center space-y-2">
                  <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    No hay cuentas bancarias agregadas
                  </p>
                  <p className="text-slate-400 text-[11px] max-w-sm mx-auto">
                    Añade cuentas de bancos (BCP, BBVA, Interbank) o billeteras digitales (Yape, Plin) con sus respectivos códigos QR.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddForm}
                    className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Primera Cuenta</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {accounts.map((acc, idx) => (
                    <div
                      key={acc.id || idx}
                      className={`p-3.5 rounded-2xl border transition relative group flex flex-col justify-between ${
                        acc.isActive !== false
                          ? 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs'
                          : 'border-slate-200/40 dark:border-slate-800/40 bg-slate-50/60 dark:bg-slate-950/30 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Thumbnail QR o Icono */}
                        {acc.imageUrl ? (
                          <img
                            src={acc.imageUrl}
                            alt={acc.name}
                            onClick={() => setPreviewImageZoom(acc.imageUrl || null)}
                            className="w-11 h-11 rounded-xl object-contain bg-white dark:bg-slate-900 border p-1 shrink-0 cursor-pointer hover:scale-105 transition"
                            title="Ver imagen en grande"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">
                            $$
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                              {acc.name}
                            </p>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                              {acc.currency || 'PEN'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {acc.beneficiary || 'Sin titular'}
                          </p>

                          <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 select-all truncate">
                            {acc.accountNumber}
                          </p>

                          {acc.notes && (
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                              {acc.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Acciones de la card */}
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleAccountActive(idx)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer transition ${
                            acc.isActive !== false
                              ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {acc.isActive !== false ? 'Activo' : 'Desactivado'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditForm(idx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Editar cuenta"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(idx)}
                            className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                            title="Eliminar cuenta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CHECKBOX: GUARDAR COMO PREDETERMINADAS DE LA AGENCIA */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsDefaultAgency}
                onChange={(e) => setSaveAsDefaultAgency(e.target.checked)}
                className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Guardar como cuentas predeterminadas de la agencia
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Se cargarán automáticamente cada vez que se cree una nueva cotización.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* PIE DEL MODAL CON BOTONES DE ACCIÓN */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/60 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleFinalSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Guardando...' : 'Guardar y Aplicar'}</span>
          </button>
        </div>
      </div>

      {/* MODAL DE ZOOM DE IMAGEN O QR */}
      {previewImageZoom && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImageZoom(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl max-w-sm w-full space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black">Vista Previa Código QR / Imagen</span>
              <button
                type="button"
                onClick={() => setPreviewImageZoom(null)}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Cerrar
              </button>
            </div>
            <img
              src={previewImageZoom}
              alt="QR Preview"
              className="w-full h-auto rounded-2xl object-contain border p-2 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
