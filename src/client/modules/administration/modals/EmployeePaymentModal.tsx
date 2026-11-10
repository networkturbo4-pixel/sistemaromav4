import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  DollarSign,
  Calendar,
  Clock,
  UploadCloud,
  FileText,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  CreditCard,
  Building,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { EmployeeProfile, EmployeePaymentRecord } from '../../../../shared/types';
import { parseVoucherWithOcr } from '../../../utils/voucherOcr';

interface EmployeePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeProfile | null;
  onSavePayment: (employeeId: string, payment: Partial<EmployeePaymentRecord>) => Promise<void>;
}

export const EmployeePaymentModal: React.FC<EmployeePaymentModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSavePayment,
}) => {
  const [formData, setFormData] = useState<Partial<EmployeePaymentRecord>>({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentTime: new Date().toLocaleTimeString('es-PE', { hour12: false }).slice(0, 5),
    amount: employee?.salary || 0,
    currency: employee?.salaryCurrency || 'PEN',
    periodConcept: `Sueldo ${new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}`,
    paymentMethod: 'Transferencia Bancaria',
    operationNumber: '',
    voucherUrl: '',
    voucherName: '',
    notes: '',
  });

  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [ocrSuccess, setOcrSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Al abrir el modal, inicializar datos
  React.useEffect(() => {
    if (employee && isOpen) {
      setFormData({
        paymentDate: new Date().toISOString().split('T')[0],
        paymentTime: new Date().toLocaleTimeString('es-PE', { hour12: false }).slice(0, 5),
        amount: employee.salary || 0,
        currency: employee.salaryCurrency || 'PEN',
        periodConcept: `Sueldo ${new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}`,
        paymentMethod: 'Transferencia Bancaria',
        operationNumber: '',
        voucherUrl: '',
        voucherName: '',
        notes: '',
      });
      setOcrSuccess(false);
      setOcrStatusText('');
    }
  }, [employee, isOpen]);

  // Manejador de subida de archivo con OCR
  const handleVoucherFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convertir a DataURL para guardar y mostrar preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        voucherUrl: dataUrl,
        voucherName: file.name,
      }));

      // Iniciar reconocimiento OCR si es imagen
      if (file.type.startsWith('image/')) {
        setIsOcrProcessing(true);
        setOcrSuccess(false);
        try {
          const result = await parseVoucherWithOcr(file, (_pct, msg) => {
            setOcrStatusText(msg);
          });

          // Actualizar formulario con los datos detectados
          setFormData((prev) => ({
            ...prev,
            amount: result.amount && result.amount > 0 ? result.amount : prev.amount,
            paymentDate: result.date || prev.paymentDate,
            paymentTime: result.time || prev.paymentTime,
            operationNumber: result.operationNumber || prev.operationNumber,
            paymentMethod: result.bankDetected
              ? `Transferencia ${result.bankDetected}`
              : prev.paymentMethod,
          }));

          setOcrSuccess(true);
          setOcrStatusText('¡Datos detectados y autorrellenados con éxito!');
        } catch (err) {
          console.warn('OCR error:', err);
          setOcrStatusText('No se pudieron leer automáticamente todos los datos. Puedes ingresarlos manualmente.');
        } finally {
          setIsOcrProcessing(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    if (!formData.amount || formData.amount <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }

    setSaving(true);
    try {
      await onSavePayment(employee.id, formData);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error al registrar el pago');
    } finally {
      setSaving(false);
    }
  };

  // Bloquear scroll del fondo y soportar tecla Escape mientras el modal esté abierto
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, saving, onClose]);

  if (!isOpen || !employee) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 inline-block mb-1">
              Registro de Pago • Nómina
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Registrar Pago a {employee.userName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sube el voucher para autorrellenar fecha, hora y monto con OCR inteligente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario con Scroll */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Zona de Subida y OCR de Voucher */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-emerald-500" />
              Comprobante / Voucher de Transferencia (Lectura OCR)
            </label>

            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 text-center transition relative">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleVoucherFile}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />

              {formData.voucherUrl ? (
                <div className="flex items-center justify-center gap-3">
                  {(formData.voucherUrl.startsWith('data:image') || formData.voucherUrl.startsWith('/uploads/')) && (
                    <img
                      src={formData.voucherUrl}
                      alt="Voucher preview"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                  )}
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs">
                      {formData.voucherName || 'Comprobante adjunto'}
                    </p>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                      ✓ Archivo cargado (Clic para cambiar)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Arrastra o haz clic para subir el voucher
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Formatos JPG, PNG, WebP o PDF • Lectura automática con OCR
                  </p>
                </div>
              )}
            </div>

            {/* Estado del OCR */}
            {isOcrProcessing && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-300 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-indigo-600" />
                <span>{ocrStatusText || 'Analizando comprobante con inteligencia OCR...'}</span>
              </div>
            )}

            {ocrSuccess && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{ocrStatusText}</span>
              </div>
            )}
          </div>

          {/* Monto y Moneda */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Monto Pagado *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-sm outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Moneda
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="PEN">Soles (PEN S/.)</option>
                <option value="USD">Dólares (USD $)</option>
              </select>
            </div>
          </div>

          {/* Fecha y Hora del Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Fecha del Pago *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={formData.paymentDate || ''}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Hora del Pago
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  value={formData.paymentTime || ''}
                  onChange={(e) => setFormData({ ...formData, paymentTime: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Concepto / Período */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Concepto / Período *
            </label>
            <input
              type="text"
              placeholder="Ej. Sueldo Mes Noviembre 2026, Quincena 1, Bono Productividad"
              value={formData.periodConcept || ''}
              onChange={(e) => setFormData({ ...formData, periodConcept: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-hidden focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Método de Pago y N° de Operación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                Método de Pago
              </label>
              <input
                type="text"
                placeholder="Transferencia BCP, Yape, BBVA"
                value={formData.paymentMethod || ''}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                N° de Operación Bancaria
              </label>
              <input
                type="text"
                placeholder="Ej. 1827364"
                value={formData.operationNumber || ''}
                onChange={(e) => setFormData({ ...formData, operationNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-medium outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
              Notas u Observaciones
            </label>
            <textarea
              rows={2}
              placeholder="Detalle adicional del pago, descuentos o bonos aplicados..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Pie */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Guardando Pago...' : 'Registrar Pago de Sueldo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
