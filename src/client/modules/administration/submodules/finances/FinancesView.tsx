import React, { useState, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  Tag,
  CreditCard,
  FileSpreadsheet,
  Camera,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  Loader2,
  Eye,
  X,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { FinanceTransaction } from '../../../../../shared/types';
import { parseVoucherWithOcr } from '../../../../utils/voucherOcr';

interface FinancesViewProps {
  transactions: FinanceTransaction[];
  onCreateTransaction: (data: Partial<FinanceTransaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onSyncPaymentNotes?: () => Promise<void>;
}

const INCOME_CATEGORIES = [
  'Ventas de Servicios',
  'Membresías Mensuales',
  'Desarrollo Web & Software',
  'Campañas & Publicidad',
  'Branding y Diseño',
  'Asesoría & Consultoría',
  'Otros Ingresos',
];

const EXPENSE_CATEGORIES = [
  'Nómina & Sueldos',
  'Proveedores y Freelancers',
  'Software y Licencias (SaaS)',
  'Publicidad & Marketing',
  'Alquiler & Oficina',
  'Servicios Básicos (Luz, Internet)',
  'Impuestos & Legal',
  'Gastos Operativos',
  'Otros Gastos',
];

const PAYMENT_METHODS = [
  'Transferencia Bancaria',
  'Yape (BCP)',
  'Plin',
  'BCP',
  'BBVA',
  'Interbank',
  'Scotiabank',
  'Efectivo',
  'Tarjeta de Crédito / Débito',
];

export const FinancesView: React.FC<FinancesViewProps> = ({
  transactions,
  onCreateTransaction,
  onDeleteTransaction,
  onSyncPaymentNotes,
}) => {
  const [isSyncingNotes, setIsSyncingNotes] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [onlyWithReceipt, setOnlyWithReceipt] = useState(false);

  // Modal para ver comprobante en grande
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Referencias a inputs de archivos
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Estados del Formulario
  const [formData, setFormData] = useState<Partial<FinanceTransaction>>({
    type: 'income',
    category: 'Ventas de Servicios',
    amount: 0,
    currency: 'PEN',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'Transferencia Bancaria',
    reference: '',
    status: 'completed',
    receiptUrl: '',
  });

  // Estados del OCR
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [ocrSuccessData, setOcrSuccessData] = useState<{
    amount?: number;
    date?: string;
    operationNumber?: string;
    bank?: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  // Cálculos financieros
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const balance = totalIncome - totalExpense;

  // Filtrado de transacciones
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.paymentMethod || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesReceipt = !onlyWithReceipt || Boolean(t.receiptUrl);
    return matchesSearch && matchesType && matchesReceipt;
  });

  // Procesamiento del comprobante con OCR
  const handleVoucherFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        receiptUrl: dataUrl,
      }));

      if (file.type.startsWith('image/')) {
        setIsOcrProcessing(true);
        setOcrStatusText('Iniciando escaneo inteligente...');
        setOcrSuccessData(null);

        try {
          const result = await parseVoucherWithOcr(file, (_pct: number, msg: string) => {
            setOcrStatusText(msg);
          });

          const detectedAmount = result.amount && result.amount > 0 ? result.amount : undefined;
          const detectedDate = result.date || undefined;
          const detectedOp = result.operationNumber || undefined;
          const detectedBank = result.bankDetected || undefined;

          setFormData((prev) => ({
            ...prev,
            amount: detectedAmount ?? prev.amount,
            date: detectedDate ?? prev.date,
            reference: detectedOp ?? prev.reference,
            paymentMethod: detectedBank
              ? (detectedBank.includes('Yape') ? 'Yape (BCP)' : detectedBank.includes('Plin') ? 'Plin' : detectedBank)
              : prev.paymentMethod,
            description: prev.description || (detectedBank ? `Movimiento vía ${detectedBank}` : prev.description),
          }));

          setOcrSuccessData({
            amount: detectedAmount,
            date: detectedDate,
            operationNumber: detectedOp,
            bank: detectedBank,
          });

          setOcrStatusText('¡Lectura OCR completada con éxito!');
        } catch (err) {
          console.warn('OCR error:', err);
          setOcrStatusText('No se pudieron extraer todos los datos. Puedes ajustarlos manualmente.');
        } finally {
          setIsOcrProcessing(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const openModalWithDefaults = (type: 'income' | 'expense', triggerCamera = false) => {
    setFormData({
      type,
      category: type === 'income' ? 'Ventas de Servicios' : 'Gastos Operativos',
      amount: 0,
      currency: 'PEN',
      date: new Date().toISOString().split('T')[0],
      description: '',
      paymentMethod: 'Transferencia Bancaria',
      reference: '',
      status: 'completed',
      receiptUrl: '',
    });
    setOcrSuccessData(null);
    setOcrStatusText('');
    setIsModalOpen(true);

    if (triggerCamera) {
      setTimeout(() => {
        cameraInputRef.current?.click();
      }, 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }
    setSaving(true);
    try {
      await onCreateTransaction(formData);
      setIsModalOpen(false);
      setFormData({
        type: 'income',
        category: 'Ventas de Servicios',
        amount: 0,
        currency: 'PEN',
        date: new Date().toISOString().split('T')[0],
        description: '',
        paymentMethod: 'Transferencia Bancaria',
        reference: '',
        status: 'completed',
        receiptUrl: '',
      });
      setOcrSuccessData(null);
    } catch (err: any) {
      alert(err.message || 'Error al guardar la transacción');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Botones de Acción Rápida (Mobile & Desktop Friendly) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-300 backdrop-blur-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Módulo de Finanzas & Caja
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Control de Ingresos, Egresos y Vouchers
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Registra movimientos manuales o escanea comprobantes (Yape, Plin, BCP, BBVA) con OCR instantáneo desde tu móvil o PC.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <button
            type="button"
            onClick={() => openModalWithDefaults('income')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" /> + Ingreso Rápido
          </button>

          <button
            type="button"
            onClick={() => openModalWithDefaults('expense')}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black shadow-lg shadow-rose-500/25 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <TrendingDown className="w-4 h-4" /> - Egreso Rápido
          </button>

          <button
            type="button"
            onClick={() => openModalWithDefaults('income', true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer border border-indigo-400/30"
            title="Escanear voucher con la cámara de tu celular"
          >
            <Camera className="w-4 h-4" /> Escanear Voucher (OCR)
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Finanzas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Ingresos Totales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            S/. {totalIncome.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cobros y entradas registradas</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Egresos / Gastos</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            S/. {totalExpense.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Costos operativos y pagos</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Flujo de Caja Neto</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              balance >= 0
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            S/. {balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Balance neto en caja</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por descripción, ref, banco..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos ({transactions.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                typeFilter === 'income'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ingresos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                typeFilter === 'expense'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Egresos
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOnlyWithReceipt(!onlyWithReceipt)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
              onlyWithReceipt
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> Con comprobante
          </button>

          {onSyncPaymentNotes && (
            <button
              type="button"
              disabled={isSyncingNotes}
              onClick={async () => {
                setIsSyncingNotes(true);
                try {
                  await onSyncPaymentNotes();
                } finally {
                  setIsSyncingNotes(false);
                }
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Sincronizar cobros registrados en Notas de Pago"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNotes ? 'animate-spin' : ''}`} />
              {isSyncingNotes ? 'Sincronizando...' : 'Sincronizar Notas de Pago'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => openModalWithDefaults('income')}
          className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nuevo Movimiento
        </button>
      </div>

      {/* Tabla de Movimientos */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl">
          <DollarSign className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            Sin transacciones registradas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Comienza registrando tus primeros ingresos o egresos con el formulario rápido o escaneando un voucher.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => openModalWithDefaults('income')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              + Registrar Ingreso
            </button>
            <button
              type="button"
              onClick={() => openModalWithDefaults('expense')}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
            >
              - Registrar Egreso
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Descripción</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Método / Banco</th>
                  <th className="py-3.5 px-4 text-center">Voucher</th>
                  <th className="py-3.5 px-4 text-right">Monto</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                  >
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {t.date}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          t.type === 'income'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {t.type === 'income' ? '+ Ingreso' : '- Egreso'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{t.description || 'Sin descripción'}</span>
                        {t.sourceModule === 'payment_notes' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            Nota de Cobro
                          </span>
                        )}
                      </div>
                      {t.reference && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Op / Ref: {t.reference}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px]">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {t.paymentMethod || 'Transferencia'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {t.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewReceiptUrl(t.receiptUrl || null)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-[11px] font-bold transition cursor-pointer"
                          title="Ver comprobante escaneado"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-sm">
                      <span
                        className={
                          t.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {t.type === 'income' ? '+' : '-'} {t.currency === 'USD' ? '$' : 'S/.'}{' '}
                        {Number(t.amount || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(t.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Eliminar movimiento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nuevo Movimiento con OCR Inteligente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Registrar Movimiento Financiero</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Completa los datos manualmente o escanea el comprobante con OCR automático.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo de movimiento: Ingreso o Egreso */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: 'income',
                      category:
                        formData.type === 'expense' && formData.category === 'Gastos Operativos'
                          ? 'Ventas de Servicios'
                          : formData.category,
                    })
                  }
                  className={`py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    formData.type === 'income'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" /> + Ingreso
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: 'expense',
                      category:
                        formData.type === 'income' && formData.category === 'Ventas de Servicios'
                          ? 'Gastos Operativos'
                          : formData.category,
                    })
                  }
                  className={`py-2.5 rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    formData.type === 'expense'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" /> - Egreso / Gasto
                </button>
              </div>

              {/* SECCIÓN OCR: Escaneo inteligente de comprobante */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Escáner OCR de Voucher / Comprobante
                  </label>
                  {isOcrProcessing && (
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando OCR...
                    </span>
                  )}
                </div>

                {/* Inputs ocultos para archivo normal y captura directa de cámara móvil */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleVoucherFile}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleVoucherFile}
                  className="hidden"
                />

                {/* Botones para disparar Cámara o Galería */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isOcrProcessing}
                    className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    Tomar Foto (Cámara Móvil)
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={isOcrProcessing}
                    className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4 text-slate-500" />
                    Subir Voucher / Captura
                  </button>
                </div>

                {/* Estado y resultado del OCR */}
                {ocrStatusText && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                      ocrSuccessData
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : isOcrProcessing
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {ocrSuccessData ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    ) : isOcrProcessing ? (
                      <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin text-indigo-600" />
                    ) : (
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{ocrStatusText}</p>
                      {ocrSuccessData && (
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-mono">
                          {ocrSuccessData.amount && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 rounded">
                              Monto: S/ {ocrSuccessData.amount.toFixed(2)}
                            </span>
                          )}
                          {ocrSuccessData.operationNumber && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 rounded">
                              Op: {ocrSuccessData.operationNumber}
                            </span>
                          )}
                          {ocrSuccessData.bank && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 rounded">
                              Banco: {ocrSuccessData.bank}
                            </span>
                          )}
                          {ocrSuccessData.date && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 rounded">
                              Fecha: {ocrSuccessData.date}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Previsualización del comprobante adjunto */}
                {formData.receiptUrl && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <img
                        src={formData.receiptUrl}
                        alt="Comprobante"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div>
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          Comprobante cargado
                        </p>
                        <button
                          type="button"
                          onClick={() => setPreviewReceiptUrl(formData.receiptUrl || null)}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                          Ver imagen completa
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, receiptUrl: '' })}
                      className="p-1 text-slate-400 hover:text-rose-500"
                      title="Quitar comprobante"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Campos del Formulario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Monto y Moneda */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Monto
                  </label>
                  <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                    <select
                      value={formData.currency || 'PEN'}
                      onChange={(e) =>
                        setFormData({ ...formData, currency: e.target.value as 'PEN' | 'USD' })
                      }
                      className="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 outline-hidden"
                    >
                      <option value="PEN">S/.</option>
                      <option value="USD">$</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={formData.amount || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-sm outline-hidden"
                      required
                    />
                  </div>
                </div>

                {/* Fecha */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Descripción o Concepto
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cobro cliente ABC, Pago suscripción Canva, Hosting mensual..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Categoría con Sugerencias Rápidas */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Categoría
                  </label>
                  <span className="text-[10px] text-slate-400">Selecciona o escribe una personalizada</span>
                </div>
                <input
                  type="text"
                  placeholder="Categoría del movimiento"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500 mb-1.5"
                  required
                />
                <div className="flex flex-wrap gap-1.5">
                  {(formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          formData.category === cat
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Método de Pago y N° Operación / Referencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Método de Pago / Banco
                  </label>
                  <select
                    value={formData.paymentMethod || 'Transferencia Bancaria'}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    N° de Operación / Referencia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 12849301 (Auto-leído con OCR)"
                    value={formData.reference || ''}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || isOcrProcessing}
                  className={`px-5 py-2.5 text-xs font-black text-white rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    formData.type === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                    </>
                  ) : formData.type === 'income' ? (
                    <>
                      <Plus className="w-4 h-4" /> Guardar Ingreso
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Guardar Egreso
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lightbox para Visualizar Comprobante */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-4 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-500" />
                Comprobante Escaneado
              </span>
              <button
                type="button"
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-auto rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-950 flex items-center justify-center">
              <img
                src={previewReceiptUrl}
                alt="Comprobante"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href={previewReceiptUrl}
                target="_blank"
                rel="noreferrer"
                download="comprobante.png"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir imagen completa
              </a>
              <button
                type="button"
                onClick={() => setPreviewReceiptUrl(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
