import React from 'react';
import {
  PaymentNoteItem,
  PaymentNoteStatus,
  MembershipMonthItem,
  QuotePaymentMethod,
  Tenant,
} from '../../shared/types';
import {
  Receipt,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  CreditCard,
  Layers,
  Sparkles,
  User,
  PanelRightClose,
  ShieldCheck,
  Check,
  AlertCircle,
  Crown,
  Paperclip,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  computeInstallmentStatus,
  formatDueDate,
  calculatePaymentNoteActiveTotals,
} from '../utils/paymentNoteUtils';

export interface PaymentNoteFormData {
  code: string;
  quoteId?: string;
  quoteCode?: string;
  clientId: string;
  clientName: string;
  companyName: string;
  brandId?: string;
  brandName?: string;
  documentType: string;
  documentNumber: string;
  whatsapp: string;
  email: string;
  issueDate: string;
  dueDate: string;
  paymentDate: string;
  paymentMethod: string;
  operationNumber: string;
  currency: 'PEN' | 'USD';
  currencySymbol: string;
  isMembership?: boolean;
  membershipPlanName?: string;
  membershipMonthsTotal?: number;
  membershipInstallments?: MembershipMonthItem[];
  extraItems?: PaymentNoteItem[];
  items: PaymentNoteItem[];
  subtotal: number;
  includeTax: boolean;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  status: PaymentNoteStatus;
  notes?: string;
  bankAccounts?: QuotePaymentMethod[];
}

interface PaymentNoteLivePreviewProps {
  formData: PaymentNoteFormData;
  tenant: Tenant | null;
  onClose?: () => void;
}

const STATUS_CONFIG: Record<
  PaymentNoteStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  paid: {
    label: 'PAGADO',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-800',
  },
  partial: {
    label: 'PAGO PARCIAL',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-800',
  },
  pending: {
    label: 'PENDIENTE DE PAGO',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-800',
  },
  cancelled: {
    label: 'ANULADO',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-300 dark:border-rose-800',
  },
};

export const PaymentNoteLivePreview: React.FC<PaymentNoteLivePreviewProps> = ({
  formData,
  tenant,
  onClose,
}) => {
  const [showAllInstallments, setShowAllInstallments] = React.useState(false);
  const company = tenant?.companyInfo || {};
  const commercialName = company.commercialName || company.brandName || tenant?.name || 'ROMA Agencia';
  const companyRuc = company.ruc || company.taxId || '';
  const logoUrl = tenant?.customization?.logoLightUrl || tenant?.customization?.logoDarkUrl;

  const liveActiveTotals = React.useMemo(() => {
    return calculatePaymentNoteActiveTotals({
      isMembership: formData.isMembership,
      membershipInstallments: formData.membershipInstallments,
      extraItems: formData.extraItems,
      items: formData.items,
      includeTax: formData.includeTax,
      taxRate: formData.taxRate || 18,
      discountAmount: Number(formData.discountAmount) || 0,
      manualPaidAmount: formData.paidAmount,
    });
  }, [
    formData.isMembership,
    formData.membershipInstallments,
    formData.extraItems,
    formData.items,
    formData.includeTax,
    formData.taxRate,
    formData.discountAmount,
    formData.paidAmount,
  ]);

  const statusConfig = STATUS_CONFIG[liveActiveTotals.status] || STATUS_CONFIG.pending;

  const accountsToDisplay = (
    company.bankAccounts && company.bankAccounts.length > 0
      ? company.bankAccounts
      : formData.bankAccounts || []
  ).filter((acc) => acc.isActive !== false);

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
      {/* HEADER DEL PANEL DE PREVISUALIZACIÓN */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Vista Previa del Comprobante
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
            En vivo
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Ocultar previsualización"
            className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <PanelRightClose className="w-4 h-4" />
            <span className="hidden sm:inline">Ocultar</span>
          </button>
        )}
      </div>

      {/* CUERPO DEL COMPROBANTE SIMULADO */}
      <div className="p-4 sm:p-6 space-y-5 text-slate-800 dark:text-slate-200 text-xs">
        
        {/* Cabecera de la Agencia */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={commercialName} className="h-9 max-w-[140px] object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-white text-base shadow-sm">
                R
              </div>
            )}
            <div>
              <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {commercialName}
              </h3>
              {companyRuc && (
                <p className="text-[11px] text-slate-500 font-medium">RUC: {companyRuc}</p>
              )}
              {company.address && (
                <p className="text-[10px] text-slate-400">{company.address}</p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-[11px] font-black uppercase tracking-wider border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
            >
              {statusConfig.label}
            </span>
            <h4 className="text-xs font-black font-mono text-slate-900 dark:text-white">
              {formData.code || 'NP-2026-XXX'}
            </h4>
            <div className="text-[10px] text-slate-400 space-y-0.5">
              <p>Emisión: {formData.issueDate || '—'}</p>
              <p>Vencimiento: {formData.dueDate || '—'}</p>
            </div>
          </div>
        </div>

        {/* Tarjeta de Cliente y Marca */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Datos del Cliente / Facturado a</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">Cliente / Contacto</p>
              <p className="font-extrabold text-slate-900 dark:text-slate-100">
                {formData.clientName || 'Cliente no especificado'}
              </p>
            </div>
            {formData.companyName && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Empresa / Razón Social</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {formData.companyName}
                </p>
              </div>
            )}
            {formData.brandName && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Marca Asociada</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formData.brandName}
                </p>
              </div>
            )}
            {formData.documentNumber && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{formData.documentType || 'Doc'}</p>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {formData.documentNumber}
                </p>
              </div>
            )}
            {formData.whatsapp && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">WhatsApp</p>
                <p className="font-medium text-slate-700 dark:text-slate-300">{formData.whatsapp}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabla / Lista de Conceptos a Cobrar O Meses de Membresía */}
        {formData.isMembership && formData.membershipInstallments && formData.membershipInstallments.length > 0 ? (() => {
          const installments = formData.membershipInstallments;
          const totalMonths = installments.length;
          const paidCount = installments.filter((i) => i.status === 'paid').length;
          const pendingCount = installments.filter((i) => i.status !== 'paid').length;
          const percentPaid = totalMonths > 0 ? Math.round((paidCount / totalMonths) * 100) : 0;

          const visibleIndices = new Set<number>();
          if (showAllInstallments || totalMonths <= 4) {
            installments.forEach((_, idx) => visibleIndices.add(idx));
          } else {
            const firstPendingIndex = installments.findIndex((i) => i.status !== 'paid');
            if (firstPendingIndex === -1) {
              for (let i = Math.max(0, totalMonths - 4); i < totalMonths; i++) visibleIndices.add(i);
            } else if (firstPendingIndex === 0) {
              for (let i = 0; i < Math.min(totalMonths, 4); i++) visibleIndices.add(i);
            } else {
              const start = Math.max(0, firstPendingIndex - 1);
              const end = Math.min(totalMonths, start + 4);
              for (let i = start; i < end; i++) visibleIndices.add(i);
            }
          }

          return (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  Meses Contratados ({totalMonths})
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  {formData.membershipPlanName || 'Plan Recurrente'}
                </span>
              </div>

              {totalMonths > 4 && (
                <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Avance: <strong className="text-emerald-600 dark:text-emerald-400">{paidCount} pagados</strong> • <strong className="text-amber-600 dark:text-amber-400">{pendingCount} pendientes</strong>
                    </span>
                    <span className="font-black text-purple-600 dark:text-purple-400">
                      {percentPaid}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-1.5 transition-all duration-300"
                      style={{ width: `${percentPaid}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {installments.map((inst, idx) => {
                  if (!showAllInstallments && !visibleIndices.has(idx)) return null;
                  const comp = computeInstallmentStatus(inst.status, inst.dueDate);

                  if (inst.isSplit && inst.subInstallments && inst.subInstallments.length > 0) {
                    return (
                      <div
                        key={inst.id || idx}
                        className="p-3 rounded-2xl bg-purple-50/20 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/60 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/40 pb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                              {inst.monthNumber || idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h5 className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                                {inst.periodName}
                              </h5>
                              <p className="text-[10px] font-semibold text-slate-400">
                                {inst.planName}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                            {inst.subInstallments.length} Abonos (50/50)
                          </span>
                        </div>

                        <div className="space-y-1.5 pl-1">
                          {inst.subInstallments.map((sub, sIdx) => {
                            const subComp = computeInstallmentStatus(sub.status, sub.dueDate || inst.dueDate);
                            return (
                              <div
                                key={sub.id || sIdx}
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 space-y-1"
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-[9px]">
                                        #{inst.monthNumber || idx + 1}.{sIdx + 1}
                                      </span>
                                      <strong className="text-slate-800 dark:text-slate-200 text-[11px] truncate">
                                        {sub.title}
                                      </strong>
                                    </div>
                                    {sub.notes && (
                                      <p className="text-[9px] text-slate-400 italic mt-0.5 pl-0.5">
                                        {sub.notes}
                                      </p>
                                    )}
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 block">
                                      {formData.currencySymbol} {(Number(sub.amount) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span
                                      className={`inline-block mt-0.5 text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                        subComp.status === 'paid'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                                          : subComp.status === 'delayed'
                                          ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                                          : subComp.status === 'in_process'
                                          ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                                          : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                      }`}
                                    >
                                      {subComp.label}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-850">
                                  <span>Vence: <strong className="text-slate-600 dark:text-slate-300">{formatDueDate(sub.dueDate || inst.dueDate)}</strong></span>
                                  {sub.operationNumber && (
                                    <span className="font-mono">Op: {sub.operationNumber}</span>
                                  )}
                                </div>

                                {sub.voucherName && (
                                  <div className="pt-0.5 flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <Paperclip className="w-2.5 h-2.5" />
                                    <span className="truncate">Voucher: {sub.voucherName}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={inst.id || idx}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                            {inst.monthNumber || idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h5 className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                              {inst.periodName}
                            </h5>
                            <p className="text-[10px] font-semibold text-slate-400">
                              {inst.planName}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 block">
                            {formData.currencySymbol} {(Number(inst.amount) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                          <span
                            className={`inline-block mt-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                              comp.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                                : comp.status === 'delayed'
                                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                                : comp.status === 'in_process'
                                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                                : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            {comp.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pl-7 pt-0.5 border-t border-slate-100 dark:border-slate-800">
                        <span>Vence: <strong className="text-slate-600 dark:text-slate-300">{formatDueDate(inst.dueDate)}</strong></span>
                        {inst.operationNumber && (
                          <span className="font-mono">Op: {inst.operationNumber}</span>
                        )}
                      </div>

                      {inst.notes && (
                        <div className="pt-0.5 text-[10px] text-slate-500 italic pl-7 line-clamp-2">
                          Nota: {inst.notes}
                        </div>
                      )}

                      {inst.voucherName && (
                        <div className="pt-1 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold pl-7">
                          <Paperclip className="w-3 h-3" />
                          <span className="truncate">Voucher: {inst.voucherName}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalMonths > 4 && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllInstallments(!showAllInstallments)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold transition shadow-2xs cursor-pointer"
                  >
                    {showAllInstallments ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Vista reducida</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Ver los {totalMonths} meses ({totalMonths - visibleIndices.size} ocultos)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* SERVICIOS ADICIONALES / EXTRAS EN VISTA PREVIA (OPCIÓN 2) */}
            {formData.extraItems && formData.extraItems.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Servicios Extras Fuera de Plan ({formData.extraItems.length})
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    Cobro Adicional
                  </span>
                </div>

                <div className="space-y-2">
                  {formData.extraItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 rounded-2xl bg-amber-50/30 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                            +{idx + 1}
                          </span>
                          <h5 className="font-black text-xs text-slate-900 dark:text-slate-100">
                            {item.title || 'Servicio Extra'}
                          </h5>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400 block">
                            {formData.currencySymbol} {(item.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                          <span
                            className={`inline-block mt-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                              item.status === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {item.status === 'paid' ? 'Pagado' : 'En proceso'}
                          </span>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {item.operationNumber && (
                        <div className="pt-0.5 text-[10px] text-slate-500 font-mono pl-7">
                          N° Op: <span className="font-bold text-slate-700 dark:text-slate-300">{item.operationNumber}</span>
                        </div>
                      )}

                      {item.notes && (
                        <div className="pt-0.5 text-[10px] text-slate-500 italic pl-7 line-clamp-2">
                          Nota: {item.notes}
                        </div>
                      )}

                      {item.voucherName && (
                        <div className="pt-1 flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 font-semibold pl-7">
                          <Paperclip className="w-3 h-3" />
                          <span className="truncate">Voucher: {item.voucherName}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pl-7 text-[10px] text-slate-400">
                        <span>
                          Cant: {item.quantity || 1} × {formData.currencySymbol}{' '}
                          {(item.unitPrice || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })() : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Conceptos a Cobrar / Entregables ({formData.items.length})
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Moneda: {formData.currency} ({formData.currencySymbol})
              </span>
            </div>

            {formData.items.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                No hay conceptos agregados aún.
              </div>
            ) : (
              <div className="space-y-2">
                {formData.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                          {idx + 1}
                        </span>
                        <h5 className="font-black text-xs text-slate-900 dark:text-slate-100">
                          {item.title || 'Concepto sin título'}
                        </h5>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100">
                          {formData.currencySymbol} {(item.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7 line-clamp-3">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pl-7 text-[10px] text-slate-400">
                      <span>Cant: {item.quantity || 1} × {formData.currencySymbol} {(item.unitPrice || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resumen Financiero */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex justify-between text-slate-500 font-medium">
            <span>Subtotal</span>
            <span className="font-mono">
              {formData.currencySymbol} {liveActiveTotals.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {formData.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Descuento Especial</span>
              <span className="font-mono">
                -{formData.currencySymbol} {formData.discountAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {formData.includeTax && (
            <div className="flex justify-between text-slate-500 font-medium">
              <span>IGV ({formData.taxRate || 18}%)</span>
              <span className="font-mono">
                {formData.currencySymbol} {liveActiveTotals.taxAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline font-black text-sm">
            <span className="text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Total Comprobante
            </span>
            <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formData.currencySymbol} {liveActiveTotals.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {(formData.isMembership || liveActiveTotals.paidAmount > 0) && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1 text-xs">
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Monto Abonado:</span>
                <span className="font-mono">
                  {formData.currencySymbol} {liveActiveTotals.paidAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
                <span>Saldo Pendiente:</span>
                <span className="font-mono">
                  {formData.currencySymbol} {liveActiveTotals.balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cuentas Bancarias Globales */}
        {accountsToDisplay.length > 0 && (
          <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5 bg-white dark:bg-slate-950">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              Cuentas para Abono o Transferencia
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {accountsToDisplay.map((acc, idx) => (
                <div
                  key={acc.id || idx}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5 text-[11px]"
                >
                  {acc.imageUrl ? (
                    <img
                      src={acc.imageUrl}
                      alt={acc.name || acc.bankName}
                      className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0">
                      {acc.currency || 'PEN'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {acc.name || acc.bankName || acc.type}
                      </p>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                        {acc.currency || 'PEN'}
                      </span>
                    </div>
                    {(acc.beneficiary || acc.holderName) && (
                      <p className="text-[10px] text-slate-500 truncate">
                        Titular: {acc.beneficiary || acc.holderName}
                      </p>
                    )}
                    <p className="font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200 break-all mt-0.5">
                      {acc.accountNumber}
                    </p>
                    {(acc.notes || acc.cci) && (
                      <p className="font-mono text-[10px] text-slate-400 break-all">
                        {acc.notes || `CCI: ${acc.cci}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instrucciones & Observaciones */}
        {formData.notes && (
          <div className="text-[11px] p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
            <p className="font-bold text-[10px] uppercase text-slate-400 mb-0.5">Instrucciones para el Cliente:</p>
            <p className="whitespace-pre-line">{formData.notes}</p>
          </div>
        )}

        {/* Pie Oficial */}
        <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Comprobante emitido por {commercialName}</span>
        </div>

      </div>
    </div>
  );
};
