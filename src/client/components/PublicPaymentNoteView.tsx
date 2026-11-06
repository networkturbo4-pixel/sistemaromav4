import React, { useEffect, useState, useRef, useMemo } from 'react';
import { PaymentNote, Tenant, QuotePaymentMethod } from '../../shared/types';
import {
  Receipt,
  CheckCircle2,
  Copy,
  Printer,
  MessageCircle,
  AlertCircle,
  CreditCard,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  Share2,
  ZoomIn,
  X,
  Crown,
  Paperclip,
  Eye,
  Download,
  Sparkles,
} from 'lucide-react';
import { copyTextToClipboard } from '../utils/clipboard';
import {
  computeInstallmentStatus,
  formatDueDate,
  calculatePaymentNoteActiveTotals,
} from '../utils/paymentNoteUtils';

interface PublicPaymentNoteData {
  paymentNote: PaymentNote;
  tenant: {
    id: string;
    name: string;
    slug: string;
    companyInfo: Tenant['companyInfo'];
    customization: Tenant['customization'];
  };
}

interface PublicPaymentNoteViewProps {
  token: string;
}

export const PublicPaymentNoteView: React.FC<PublicPaymentNoteViewProps> = ({ token }) => {
  const [data, setData] = useState<PublicPaymentNoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [zoomedQr, setZoomedQr] = useState<{ url: string; title: string } | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<{ url: string; name: string } | null>(null);
  const [showAllInstallments, setShowAllInstallments] = useState(false);
  const [installmentFilter, setInstallmentFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Forzar siempre modo claro en la vista pública
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    return () => {
      if (hadDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      }
    };
  }, []);

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/public/payment-notes/${encodeURIComponent(token)}`);
        if (!res.ok) {
          throw new Error('Comprobante de pago no encontrado o no disponible públicamente.');
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchNote();
    }
  }, [token]);

  const paymentNote = data?.paymentNote || (data as any)?.note;
  const tenant = data?.tenant;

  const activeTotals = useMemo(() => {
    if (!paymentNote) {
      return {
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        paidAmount: 0,
        balance: 0,
        status: 'pending' as const,
      };
    }
    return calculatePaymentNoteActiveTotals({
      isMembership: paymentNote.isMembership,
      membershipInstallments: paymentNote.membershipInstallments,
      extraItems: paymentNote.extraItems,
      items: paymentNote.items,
      includeTax: paymentNote.includeTax,
      taxRate: paymentNote.taxRate || 18,
      discountAmount: Number(paymentNote.discountAmount) || 0,
      manualPaidAmount: paymentNote.paidAmount,
    });
  }, [paymentNote]);

  const handleCopy = async (text: string, label: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedAccount(label);
      setTimeout(() => setCopiedAccount(null), 2500);
    }
  };

  const handlePrint = () => {
    setActionsMenuOpen(false);
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!data) return;
    setActionsMenuOpen(false);
    const paymentNote = data.paymentNote || (data as any).note;
    const { tenant } = data;
    const agencyName =
      tenant.companyInfo?.commercialName || tenant.companyInfo?.brandName || tenant.name;
    const message = encodeURIComponent(
      `Hola *${paymentNote.clientName}*,\n\nTe compartimos tu *Nota de Pago ${paymentNote.code}* de *${agencyName}* por un total de *${paymentNote.currencySymbol} ${Number(activeTotals.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}*.\n\nPuedes revisar y descargar tu comprobante en el siguiente enlace:\n${window.location.href}\n\n¡Muchas gracias!`
    );
    const phone = (paymentNote.whatsapp || '').replace(/[^0-9]/g, '');
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const handleNativeShareOrCopy = async () => {
    setActionsMenuOpen(false);
    if (!data) return;
    const paymentNote = data.paymentNote || (data as any).note;
    const agencyName =
      data.tenant.companyInfo?.commercialName ||
      data.tenant.companyInfo?.brandName ||
      data.tenant.name;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Comprobante ${paymentNote.code} - ${agencyName}`,
          text: `Comprobante de Pago ${paymentNote.code} (${paymentNote.currencySymbol} ${Number(activeTotals.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })})`,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to copy link
      }
    }
    await handleCopy(window.location.href, 'public-link');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-emerald-600/20 animate-pulse">
          R
        </div>
        <p className="text-xs font-bold text-slate-500 mt-4 tracking-wider uppercase">
          Cargando Comprobante de Pago...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Comprobante no disponible</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          {error || 'El comprobante que buscas no existe o el enlace ha caducado.'}
        </p>
        <a
          href="/"
          className="mt-5 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
        >
          Ir al Inicio
        </a>
      </div>
    );
  }

  if (!paymentNote || !tenant) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Comprobante incompleto</h2>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          No se pudieron cargar los datos del comprobante o la agencia.
        </p>
      </div>
    );
  }

  const company = tenant.companyInfo || ({} as Tenant['companyInfo']);
  const agencyName = company.commercialName || company.brandName || tenant.name;
  const agencyRuc = company.ruc || company.taxId || '';
  const agencyPhone = company.whatsapp || company.phone || '';

  const effectiveStatus = paymentNote.status === 'cancelled' ? 'cancelled' : activeTotals.status;
  const isPaid = effectiveStatus === 'paid';
  const isPartial = effectiveStatus === 'partial';
  const isPending = effectiveStatus === 'pending';
  const isCancelled = effectiveStatus === 'cancelled';

  // Regla global: priorizar cuentas activas de Datos de Empresa
  const accountsToDisplay: QuotePaymentMethod[] = (
    company.bankAccounts && company.bankAccounts.length > 0
      ? company.bankAccounts
      : paymentNote.bankAccounts || []
  ).filter((acc) => acc.isActive !== false);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-10 print:bg-white print:pb-0">
      {/* CABECERA FIJA / STICKY RESPONSIVE CON MENÚ DESPLEGABLE (NO SE IMPRIME) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs print:hidden">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Izquierda: Icono + Título de la Vista Pública */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                Comprobante de Pago Oficial
              </h1>
              <p className="text-[11px] text-slate-500 truncate">
                {agencyName} • <span className="font-mono font-bold text-slate-700">{paymentNote.code}</span>
              </p>
            </div>
          </div>

          {/* Derecha: Botón Desplegable de Imprimir y Compartir (Móvil y Desktop) */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setActionsMenuOpen((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Opciones</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  actionsMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {actionsMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Imprimir / Guardar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50/70 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Compartir por WhatsApp</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={handleNativeShareOrCopy}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                >
                  {copiedAccount === 'public-link' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-600">¡Enlace copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Copiar enlace directo</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CONTENEDOR DEL DOCUMENTO PRINCIPAL */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-8">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-10 space-y-6 sm:space-y-8 print:p-0 print:border-none print:shadow-none">
          {/* CABECERA: DATOS DE LA AGENCIA Y NÚMERO DE COMPROBANTE */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 pb-6 border-b border-slate-200">
            {/* Logo y Razón Social de la Agencia */}
            <div className="space-y-2">
              {tenant.customization?.logoLightUrl ? (
                <img
                  src={tenant.customization.logoLightUrl}
                  alt={agencyName}
                  className="h-9 sm:h-10 object-contain"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-extrabold text-sm">
                    {tenant.name.charAt(0)}
                  </div>
                  <span className="font-extrabold text-base tracking-tight text-slate-900">
                    {agencyName}
                  </span>
                </div>
              )}

              <div className="text-xs text-slate-500 leading-relaxed pt-1 space-y-0.5">
                <p className="font-bold text-slate-800">{company.legalName || agencyName}</p>
                {agencyRuc && <p className="font-mono text-[11px]">RUC: {agencyRuc}</p>}
                {company.address && <p>{company.address}</p>}
                {agencyPhone && <p>WhatsApp / Tel: {agencyPhone}</p>}
                {company.email && <p>Email: {company.email}</p>}
              </div>
            </div>

            {/* Tarjeta del Número de Nota de Pago y Fechas */}
            <div className="sm:text-right space-y-2.5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex sm:inline-flex flex-col sm:items-end justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                    COMPROBANTE DE PAGO
                  </span>
                  <span className="text-xl font-black text-slate-900 font-mono tracking-tight block">
                    {paymentNote.code}
                  </span>
                  {paymentNote.quoteCode && (
                    <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                      Cotización: <strong>{paymentNote.quoteCode}</strong>
                    </span>
                  )}
                </div>

                {/* STAMP / SELLO DE ESTADO */}
                <div className="pt-1">
                  {isPaid && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PAGADO</span>
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>PENDIENTE DE PAGO</span>
                    </span>
                  )}
                  {isPartial && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                      <Clock className="w-3.5 h-3.5" />
                      <span>ABONO PARCIAL</span>
                    </span>
                  )}
                  {isCancelled && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                      <span>ANULADO</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 sm:gap-0.5 text-xs text-slate-500 bg-slate-50/70 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-slate-200/60 sm:border-none">
                <p>
                  <span className="block sm:inline text-[10px] sm:text-xs uppercase sm:normal-case font-bold sm:font-normal text-slate-400 sm:text-slate-500">
                    Fecha de Emisión:{' '}
                  </span>
                  <strong className="text-slate-800 font-mono">{paymentNote.issueDate}</strong>
                </p>
                <p>
                  <span className="block sm:inline text-[10px] sm:text-xs uppercase sm:normal-case font-bold sm:font-normal text-slate-400 sm:text-slate-500">
                    Fecha de Vencimiento:{' '}
                  </span>
                  <strong className="text-slate-800 font-mono">{paymentNote.dueDate}</strong>
                </p>
                {paymentNote.paymentDate && (
                  <p>
                    <span className="block sm:inline text-[10px] sm:text-xs uppercase sm:normal-case font-bold sm:font-normal text-slate-400 sm:text-slate-500">
                      Fecha de Abono:{' '}
                    </span>
                    <strong className="text-emerald-700 font-mono">{paymentNote.paymentDate}</strong>
                  </p>
                )}
                {paymentNote.operationNumber && (
                  <p>
                    <span className="block sm:inline text-[10px] sm:text-xs uppercase sm:normal-case font-bold sm:font-normal text-slate-400 sm:text-slate-500">
                      N° Operación:{' '}
                    </span>
                    <strong className="text-slate-800 font-mono">{paymentNote.operationNumber}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* DATOS DEL CLIENTE / RECEPTOR */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2.5">
              INFORMACIÓN DEL CLIENTE
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Cliente / Razón Social</span>
                <p className="font-extrabold text-slate-900 text-sm">
                  {paymentNote.companyName || paymentNote.clientName}
                </p>
                {paymentNote.clientName && paymentNote.clientName !== paymentNote.companyName && (
                  <p className="text-slate-500 text-[11px] mt-0.5">Att: {paymentNote.clientName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:block gap-2 border-t sm:border-t-0 border-slate-200/70 pt-2.5 sm:pt-0">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {paymentNote.documentType || 'Documento'}
                  </span>
                  <p className="font-bold text-slate-800 font-mono text-xs sm:text-sm">
                    {paymentNote.documentNumber || 'No especificado'}
                  </p>
                </div>

                <div className="sm:hidden">
                  <span className="text-slate-400 block text-[11px]">Contacto</span>
                  <p className="font-semibold text-slate-800 text-xs">
                    {paymentNote.whatsapp || 'Sin teléfono'}
                  </p>
                </div>
              </div>

              <div className="hidden sm:block">
                <span className="text-slate-400 block text-[11px]">Contacto</span>
                <p className="font-medium text-slate-800">
                  {paymentNote.whatsapp || 'Sin teléfono'}
                </p>
                {paymentNote.email && (
                  <p className="text-slate-500 text-[11px] truncate">{paymentNote.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* DETALLE DEL COBRO / MESES DE MEMBRESÍA O SERVICIOS */}
          <div>
            {paymentNote.isMembership && paymentNote.membershipInstallments && paymentNote.membershipInstallments.length > 0 ? (() => {
              const installments = paymentNote.membershipInstallments;
              const totalMonths = installments.length;

              // Calcular estados dinámicos según reglas del negocio
              const computedList = installments.map((inst) => ({
                inst,
                comp: computeInstallmentStatus(inst.status, inst.dueDate),
              }));

              const paidCount = computedList.filter((x) => x.comp.status === 'paid').length;
              const delayedCount = computedList.filter((x) => x.comp.status === 'delayed').length;
              const inProcessCount = computedList.filter((x) => x.comp.status === 'in_process').length;
              const inactiveCount = computedList.filter((x) => x.comp.status === 'inactive').length;
              const pendingCount = totalMonths - paidCount;
              const percentPaid = totalMonths > 0 ? Math.round((paidCount / totalMonths) * 100) : 0;

              // Identificar meses visibles en vista compacta inteligente
              const visibleIndices = new Set<number>();
              if (showAllInstallments || installmentFilter !== 'all' || totalMonths <= 4) {
                installments.forEach((_, idx) => visibleIndices.add(idx));
              } else {
                const firstPendingIndex = computedList.findIndex((x) => x.comp.status !== 'paid');
                if (firstPendingIndex === -1) {
                  // Todos pagados: mostrar los últimos 4
                  for (let i = Math.max(0, totalMonths - 4); i < totalMonths; i++) visibleIndices.add(i);
                } else if (firstPendingIndex === 0) {
                  // Todos pendientes: mostrar los primeros 4
                  for (let i = 0; i < Math.min(totalMonths, 4); i++) visibleIndices.add(i);
                } else {
                  // En curso: mostrar 1 previo y hasta 3 siguientes
                  const start = Math.max(0, firstPendingIndex - 1);
                  const end = Math.min(totalMonths, start + 4);
                  for (let i = start; i < end; i++) visibleIndices.add(i);
                }
              }

              const isMatchFilter = (compStatus: string) => {
                if (installmentFilter === 'all') return true;
                if (installmentFilter === 'paid') return compStatus === 'paid';
                return compStatus !== 'paid';
              };

              return (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-purple-100 text-purple-700">
                        <Crown className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        MESES CONTRATADOS DE LA MEMBRESÍA ({totalMonths})
                      </span>
                    </div>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      {paymentNote.membershipPlanName || 'Plan Recurrente'}
                    </span>
                  </div>

                  {/* WIDGET DE RESUMEN Y PROGRESO (CUANDO SON MÁS DE 4 MESES) */}
                  {totalMonths > 4 && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50/80 via-slate-50 to-emerald-50/60 border border-purple-100/90 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-800">
                            Progreso del Contrato:
                          </span>
                          <span className="inline-flex items-center gap-1 font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {paidCount} {paidCount === 1 ? 'Pagado' : 'Pagados'}
                          </span>
                          {delayedCount > 0 && (
                            <span className="inline-flex items-center gap-1 font-black text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-300 text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              {delayedCount} {delayedCount === 1 ? 'Retrasado' : 'Retrasados'}
                            </span>
                          )}
                          {inProcessCount > 0 && (
                            <span className="inline-flex items-center gap-1 font-black text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300 text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              {inProcessCount} En Proceso
                            </span>
                          )}
                          {inactiveCount > 0 && (
                            <span className="inline-flex items-center gap-1 font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300 text-[11px]">
                              {inactiveCount} No Activos
                            </span>
                          )}
                        </div>
                        <span className="font-black text-purple-700 text-xs">
                          {percentPaid}% completado
                        </span>
                      </div>

                      {/* Barra de progreso */}
                      <div className="w-full bg-slate-200/90 rounded-full h-2.5 overflow-hidden p-0.5 shadow-inner flex">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 shadow-xs"
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* SELECTORES RÁPIDOS E INDICADOR DE MESES (PRINT:HIDDEN) */}
                  {totalMonths > 4 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 print:hidden">
                      <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setInstallmentFilter('all')}
                          className={`px-3 py-1 rounded-lg font-bold transition text-xs cursor-pointer ${
                            installmentFilter === 'all'
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Todos ({totalMonths})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInstallmentFilter('pending');
                            setShowAllInstallments(true);
                          }}
                          className={`px-3 py-1 rounded-lg font-bold transition text-xs cursor-pointer ${
                            installmentFilter === 'pending'
                              ? 'bg-white text-amber-800 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Pendientes ({pendingCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInstallmentFilter('paid');
                            setShowAllInstallments(true);
                          }}
                          className={`px-3 py-1 rounded-lg font-bold transition text-xs cursor-pointer ${
                            installmentFilter === 'paid'
                              ? 'bg-white text-emerald-800 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Pagados ({paidCount})
                        </button>
                      </div>

                      <div className="text-[11px] font-semibold text-slate-500">
                        {installmentFilter === 'all' && !showAllInstallments
                          ? `Vista compacta: ${visibleIndices.size} de ${totalMonths} meses clave`
                          : `Mostrando ${
                              installmentFilter === 'all'
                                ? totalMonths
                                : installmentFilter === 'paid'
                                ? paidCount
                                : pendingCount
                            } meses`}
                      </div>
                    </div>
                  )}

                  {/* LISTA RESPONSIVA Y MODERNA DE MESES CONTRATADOS (CARDS INTELIGENTES) */}
                  <div className="space-y-3">
                    {computedList.map(({ inst, comp }, idx) => {
                      const isSplit = Boolean(inst.isSplit && inst.subInstallments && inst.subInstallments.length > 0);
                      const monthTotal = Number(inst.amount) || 0;

                      // Si está fraccionado, filtramos según los sub-abonos si hay filtro activo
                      let visibleSubs = inst.subInstallments || [];
                      if (isSplit && installmentFilter !== 'all') {
                        visibleSubs = visibleSubs.filter((sub) => {
                          const sComp = computeInstallmentStatus(sub.status, sub.dueDate || inst.dueDate);
                          return isMatchFilter(sComp.status);
                        });
                        if (visibleSubs.length === 0) return null;
                      } else if (!isSplit) {
                        const matches = isMatchFilter(comp.status);
                        const isVisible = matches && (showAllInstallments || visibleIndices.has(idx) || installmentFilter !== 'all');
                        if (!isVisible) return null;
                      }

                      return (
                        <div
                          key={inst.id || idx}
                          className={`rounded-2xl border transition shadow-2xs overflow-hidden print:border print:shadow-none ${
                            isSplit
                              ? 'bg-purple-50/20 border-purple-200'
                              : comp.status === 'paid'
                              ? 'bg-emerald-50/15 border-emerald-200/80'
                              : comp.status === 'delayed'
                              ? 'bg-rose-50/15 border-rose-200/80'
                              : 'bg-white border-slate-200/90'
                          }`}
                        >
                          {/* Cabecera del Mes */}
                          <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 text-white shadow-2xs ${
                                  comp.status === 'paid'
                                    ? 'bg-emerald-600'
                                    : comp.status === 'delayed'
                                    ? 'bg-rose-600'
                                    : comp.status === 'in_process'
                                    ? 'bg-amber-500'
                                    : 'bg-purple-600'
                                }`}
                              >
                                {inst.monthNumber || idx + 1}
                              </span>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-slate-900 text-sm tracking-tight">
                                    {inst.periodName}
                                  </h4>
                                  {isSplit && (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-tight">
                                      {inst.subInstallments!.length} Abonos (Fraccionado)
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-slate-500 truncate">
                                  {inst.planName || paymentNote.membershipPlanName || 'Plan Recurrente'}
                                </p>
                                {inst.notes && !isSplit && (
                                  <p className="text-[11px] text-slate-400 italic mt-0.5">{inst.notes}</p>
                                )}
                              </div>
                            </div>

                            {/* Mes Estándar (No fraccionado): Detalles en línea en Desktop */}
                            {!isSplit ? (
                              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                  <span>
                                    Vence: <strong className="text-slate-800 font-semibold">{formatDueDate(inst.dueDate)}</strong>
                                  </span>
                                  {inst.operationNumber && (
                                    <span className="font-mono text-slate-600 font-semibold">
                                      Op: <strong>{inst.operationNumber}</strong>
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {inst.voucherUrl && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setViewingVoucher({
                                          url: inst.voucherUrl!,
                                          name: inst.voucherName || `Voucher_Mes_${idx + 1}`,
                                        })
                                      }
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition cursor-pointer shadow-2xs"
                                    >
                                      <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                                      <span>Ver Voucher</span>
                                    </button>
                                  )}

                                  <span className="font-mono font-black text-sm text-slate-900 bg-slate-50 sm:bg-white px-2.5 py-1 rounded-xl border border-slate-200 shrink-0">
                                    {paymentNote.currencySymbol} {monthTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                  </span>

                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                                      comp.status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                        : comp.status === 'delayed'
                                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                                        : comp.status === 'in_process'
                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                        : 'bg-slate-100 text-slate-500 border-slate-300'
                                    }`}
                                  >
                                    {comp.status === 'paid' ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>PAGADO</span>
                                      </>
                                    ) : comp.status === 'delayed' ? (
                                      <>
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                        <span>RETRASADO</span>
                                      </>
                                    ) : comp.status === 'in_process' ? (
                                      <>
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>EN PROCESO</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span>NO ACTIVO</span>
                                      </>
                                    )}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              /* Mes Fraccionado: Total del Mes */
                              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Total Mes:</span>
                                <span className="font-mono font-black text-sm text-purple-900 bg-purple-100/70 px-2.5 py-1 rounded-xl border border-purple-200 shrink-0">
                                  {paymentNote.currencySymbol} {monthTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Mes Fraccionado: Sub-cards de Abonos agrupados dentro de este Card */}
                          {isSplit && (
                            <div className="p-3 sm:p-4 space-y-2.5 bg-purple-50/20">
                              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5 px-0.5">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                Desglose de Abonos del Mes ({visibleSubs.length})
                              </span>

                              <div className="space-y-2">
                                {visibleSubs.map((sub, sIdx) => {
                                  const subComp = computeInstallmentStatus(sub.status, sub.dueDate || inst.dueDate);
                                  return (
                                    <div
                                      key={sub.id || sIdx}
                                      className="p-3 sm:p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-purple-300 transition"
                                    >
                                      {/* Título y badge del sub-abono */}
                                      <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                                        <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 font-black text-[10px] shrink-0">
                                          #{inst.monthNumber || idx + 1}.{sIdx + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <strong className="text-slate-800 text-xs block sm:inline font-bold">
                                            {sub.title}
                                          </strong>
                                          {sub.notes && (
                                            <span className="text-[11px] text-slate-400 italic sm:ml-2 block sm:inline">
                                              • {sub.notes}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Vencimiento y N° de Operación */}
                                      <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px] sm:px-2">
                                        <span>
                                          Vence: <strong className="text-slate-700 font-semibold">{formatDueDate(sub.dueDate || inst.dueDate)}</strong>
                                        </span>
                                        {sub.operationNumber && (
                                          <span className="font-mono text-slate-600">
                                            Op: <strong className="text-slate-700">{sub.operationNumber}</strong>
                                          </span>
                                        )}
                                      </div>

                                      {/* Voucher, Monto y Estado */}
                                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                        {sub.voucherUrl && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setViewingVoucher({
                                                url: sub.voucherUrl!,
                                                name: sub.voucherName || `Voucher_Mes_${idx + 1}_Sub_${sIdx + 1}`,
                                              })
                                            }
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold cursor-pointer transition shadow-2xs"
                                          >
                                            <Paperclip className="w-3 h-3 text-purple-600" />
                                            <span>Voucher</span>
                                          </button>
                                        )}

                                        <span className="font-mono font-black text-xs text-slate-900 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 shrink-0">
                                          {paymentNote.currencySymbol} {Number(sub.amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                        </span>

                                        <span
                                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider border shrink-0 ${
                                            subComp.status === 'paid'
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                              : subComp.status === 'delayed'
                                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                                              : subComp.status === 'in_process'
                                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                                              : 'bg-slate-100 text-slate-500 border-slate-300'
                                          }`}
                                        >
                                          {subComp.status === 'paid' ? (
                                            <>
                                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                              <span>PAGADO</span>
                                            </>
                                          ) : subComp.status === 'delayed' ? (
                                            <>
                                              <AlertCircle className="w-3 h-3 text-rose-600" />
                                              <span>RETRASADO</span>
                                            </>
                                          ) : subComp.status === 'in_process' ? (
                                            <>
                                              <Clock className="w-3 h-3 text-amber-600" />
                                              <span>EN PROCESO</span>
                                            </>
                                          ) : (
                                            <>
                                              <Clock className="w-3 h-3 text-slate-400" />
                                              <span>NO ACTIVO</span>
                                            </>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* BOTÓN COLAPSAR / EXPANDIR (PRINT:HIDDEN) */}
                  {installmentFilter === 'all' && totalMonths > 4 && (
                    <div className="pt-1 text-center print:hidden flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => setShowAllInstallments(!showAllInstallments)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-black transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-98"
                      >
                        {showAllInstallments ? (
                          <>
                            <ChevronUp className="w-4 h-4 text-purple-600" />
                            <span>Mostrar vista compacta ({visibleIndices.size} meses clave)</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 text-purple-600" />
                            <span>
                              Ver todos los {totalMonths} meses contratados ({totalMonths - visibleIndices.size} meses ocultos)
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* SERVICIOS ADICIONALES / EXTRAS FUERA DE PLAN (OPCIÓN 2) */}
                {paymentNote.extraItems && paymentNote.extraItems.length > 0 && (
                  <div className="pt-4 border-t border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-amber-100 text-amber-800">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          SERVICIOS ADICIONALES / EXTRAS FUERA DE PLAN ({paymentNote.extraItems.length})
                        </span>
                      </div>
                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Cobro Adicional
                      </span>
                    </div>

                    {/* VISTA MÓVIL EXTRAS */}
                    <div className="sm:hidden print:hidden space-y-2.5">
                      {paymentNote.extraItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/30 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-lg bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                +{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-900 text-xs leading-snug">
                                  {item.title || (item as any).name}
                                </p>
                                {item.operationNumber && (
                                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                    N° Op: <strong className="text-slate-700">{item.operationNumber}</strong>
                                  </p>
                                )}
                                {item.notes && (
                                  <p className="text-[10px] text-slate-500 italic mt-0.5">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="font-mono font-black text-xs text-amber-700 shrink-0 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                              {paymentNote.currencySymbol}{' '}
                              {Number(item.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-slate-600 text-[11px] leading-relaxed pl-7 whitespace-pre-line">
                              {item.description}
                            </p>
                          )}

                          <div className="pl-7 pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-amber-100">
                            <span>
                              Cantidad: <strong className="text-slate-700">{item.quantity}</strong> • P. Unit: {paymentNote.currencySymbol} {Number(item.unitPrice).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </span>
                            <span
                              className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                item.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {item.status === 'paid' ? 'Pagado' : 'En proceso'}
                            </span>
                          </div>

                          {item.voucherUrl && (
                            <div className="pl-7 pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingVoucher({
                                    url: item.voucherUrl!,
                                    name: item.voucherName || `Voucher_Extra_${idx + 1}`,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold cursor-pointer transition shadow-2xs"
                              >
                                <Paperclip className="w-3 h-3 text-amber-700" />
                                <span>Ver Voucher ({item.voucherName || 'Adjunto'})</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* VISTA DESKTOP E IMPRESIÓN EXTRAS */}
                    <div className="hidden sm:block print:block overflow-x-auto rounded-2xl border border-amber-200/80">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-amber-50/60 border-b border-amber-200/80 text-amber-900 font-extrabold text-[11px]">
                            <th className="py-3 px-4 w-12 text-center">#</th>
                            <th className="py-3 px-4">Servicio / Entregable Adicional</th>
                            <th className="py-3 px-4 text-center w-20">Cant.</th>
                            <th className="py-3 px-4 text-right w-28">P. Unitario</th>
                            <th className="py-3 px-4 text-right w-28">Total</th>
                            <th className="py-3 px-4 text-center w-28">Estado</th>
                            <th className="py-3 px-4 text-center w-28">Voucher</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100/60 bg-white">
                          {paymentNote.extraItems.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-amber-50/30">
                              <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                                +{idx + 1}
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {item.title || (item as any).name}
                                </p>
                                {item.description && (
                                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed whitespace-pre-line">
                                    {item.description}
                                  </p>
                                )}
                                {item.operationNumber && (
                                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                                    N° Op: <strong className="text-slate-700">{item.operationNumber}</strong>
                                  </p>
                                )}
                                {item.notes && (
                                  <p className="text-[10px] text-slate-500 italic mt-0.5">
                                    {item.notes}
                                  </p>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                                {item.quantity}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-600">
                                {paymentNote.currencySymbol}{' '}
                                {Number(item.unitPrice).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black text-amber-600">
                                {paymentNote.currencySymbol}{' '}
                                {Number(item.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                    item.status === 'paid'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                                  }`}
                                >
                                  {item.status === 'paid' ? 'Pagado' : 'En proceso'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {item.voucherUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingVoucher({
                                        url: item.voucherUrl!,
                                        name: item.voucherName || `Voucher_Extra_${idx + 1}`,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[11px] font-bold cursor-pointer transition shadow-2xs"
                                  >
                                    <Paperclip className="w-3 h-3 text-amber-600" />
                                    <span>Ver</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">
                                    Sin adjunto
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })() : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    DETALLE DEL COBRO / SERVICIOS ({paymentNote.items.length})
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Moneda: {paymentNote.currency} ({paymentNote.currencySymbol})
                  </span>
                </div>

                {/* VISTA MÓVIL: CARDS CLARAS Y FÁCILES DE ENTENDER */}
                <div className="sm:hidden print:hidden space-y-2.5">
                  {paymentNote.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="font-extrabold text-slate-900 text-xs leading-snug">
                            {item.title || (item as any).name}
                          </p>
                        </div>
                        <span className="font-mono font-black text-xs text-slate-900 shrink-0 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                          {paymentNote.currencySymbol}{' '}
                          {Number(item.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-slate-600 text-[11px] leading-relaxed pl-7 whitespace-pre-line">
                          {item.description}
                        </p>
                      )}

                      <div className="pl-7 pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60">
                        <span>
                          Cantidad: <strong className="text-slate-700">{item.quantity}</strong>
                        </span>
                        <span className="font-mono">
                          P. Unit: {paymentNote.currencySymbol}{' '}
                          {Number(item.unitPrice).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* VISTA DESKTOP E IMPRESIÓN: TABLA COMPLETA */}
                <div className="hidden sm:block print:block overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[11px]">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Concepto / Servicio</th>
                        <th className="py-3 px-4 text-center w-20">Cant.</th>
                        <th className="py-3 px-4 text-right w-28">P. Unitario</th>
                        <th className="py-3 px-4 text-right w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentNote.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">
                              {item.title || (item as any).name}
                            </p>
                            {item.description && (
                              <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed whitespace-pre-line">
                                {item.description}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                            {item.quantity}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-600 font-mono">
                            {paymentNote.currencySymbol}{' '}
                            {Number(item.unitPrice).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
                            {paymentNote.currencySymbol}{' '}
                            {Number(item.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* TOTALES Y OBSERVACIONES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 pt-1">
            {/* Liquidación de Totales (Primero en móvil para fácil lectura) */}
            <div className="sm:order-2 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block sm:hidden">
                RESUMEN DEL IMPORTE
              </span>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-bold font-mono">
                    {paymentNote.currencySymbol}{' '}
                    {Number(activeTotals.subtotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {paymentNote.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Descuento Aplicado:</span>
                    <span className="font-bold font-mono">
                      -{paymentNote.currencySymbol}{' '}
                      {Number(paymentNote.discountAmount).toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {paymentNote.includeTax && (
                  <div className="flex justify-between text-slate-600">
                    <span>IGV ({paymentNote.taxRate || 18}%):</span>
                    <span className="font-bold font-mono">
                      {paymentNote.currencySymbol}{' '}
                      {Number(activeTotals.taxAmount).toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase">
                    Total Facturado:
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                    {paymentNote.currencySymbol}{' '}
                    {Number(activeTotals.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {activeTotals.paidAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Monto Abonado:</span>
                    <span className="font-mono">
                      {paymentNote.currencySymbol}{' '}
                      {Number(activeTotals.paidAmount).toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-xs sm:text-sm font-black uppercase text-slate-900">
                    {activeTotals.balance <= 0 ? 'Total a Pagar / Saldo:' : 'Total a Pagar:'}
                  </span>
                  {activeTotals.balance <= 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl font-black text-emerald-600 font-mono">
                        {paymentNote.currencySymbol} 0.00
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                        PAGADO
                      </span>
                    </div>
                  ) : (
                    <span className="text-lg sm:text-xl font-black text-amber-600 font-mono">
                      {paymentNote.currencySymbol}{' '}
                      {Number(activeTotals.balance).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Observaciones o Notas */}
            <div className="sm:order-1 space-y-2 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                OBSERVACIONES & CONDICIONES
              </span>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 leading-relaxed text-xs">
                {paymentNote.notes ? (
                  <p className="whitespace-pre-line">{paymentNote.notes}</p>
                ) : (
                  <p>
                    Comprobante emitido por prestación de servicios profesionales de agencia. Gracias por confiar en nosotros.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CUENTAS BANCARIAS GLOBALES PARA EL ABONO */}
          {accountsToDisplay.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Cuentas Bancarias de la Agencia para Depósito o Transferencia
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {accountsToDisplay.map((acc, i) => {
                  const bankTitle = acc.name || (acc as any).bankName || 'Cuenta Bancaria';
                  const holder =
                    acc.beneficiary || (acc as any).holderName || company.legalName || agencyName;
                  const cciOrNotes = acc.notes || ((acc as any).cci ? `CCI: ${(acc as any).cci}` : '');

                  return (
                    <div
                      key={acc.id || i}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-3.5"
                    >
                      {acc.imageUrl ? (
                        <div
                          onClick={() => setZoomedQr({ url: acc.imageUrl!, title: bankTitle })}
                          className="relative w-14 h-14 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer group shadow-2xs"
                          title="Toca para ampliar el código QR"
                        >
                          <img
                            src={acc.imageUrl}
                            alt={bankTitle}
                            className="max-w-full max-h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <ZoomIn className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-emerald-600/10 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-600/20">
                          {acc.currency || 'PEN'}
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-slate-900 truncate">{bankTitle}</span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 shrink-0">
                            {acc.currency || 'PEN'}
                          </span>
                        </div>

                        {holder && (
                          <p className="text-[11px] text-slate-500 truncate">
                            Titular: <strong className="text-slate-700">{holder}</strong>
                          </p>
                        )}

                        {acc.accountNumber && (
                          <div className="flex items-center justify-between gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                            <span className="font-mono font-bold text-[11px] text-slate-800 break-all">
                              {acc.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(acc.accountNumber, `acc-${i}`)}
                              className="p-1 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 cursor-pointer shrink-0 transition"
                              title="Copiar N° de Cuenta"
                            >
                              {copiedAccount === `acc-${i}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}

                        {cciOrNotes && (
                          <div className="flex items-center justify-between gap-1.5 bg-white/70 px-2.5 py-1 rounded-xl border border-slate-200/70">
                            <span className="font-mono text-[11px] text-slate-600 break-all">
                              {cciOrNotes}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(cciOrNotes.replace(/^CCI:\s*/i, ''), `cci-${i}`)
                              }
                              className="p-1 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 cursor-pointer shrink-0 transition"
                              title="Copiar CCI / Detalle"
                            >
                              {copiedAccount === `cci-${i}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PIE DE PÁGINA */}
          <div className="pt-6 border-t border-slate-200 text-center text-[11px] text-slate-400 space-y-1">
            <p>
              Este documento constituye un comprobante administrativo emitido por{' '}
              <strong className="text-slate-600">{agencyName}</strong>.
            </p>
            <p>Generado a través de ROMA Creative SaaS • Todos los derechos reservados.</p>
          </div>
        </div>
      </div>

      {/* LIGHTBOX ZOOM PARA QR BANCARIO */}
      {zoomedQr && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
          onClick={() => setZoomedQr(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 truncate">{zoomedQr.title}</h4>
              <button
                type="button"
                onClick={() => setZoomedQr(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-center">
              <img
                src={zoomedQr.url}
                alt={zoomedQr.title}
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
      {/* LIGHTBOX ZOOM PARA VOUCHER / COMPROBANTE ADJUNTO */}
      {viewingVoucher && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-in fade-in"
          onClick={() => setViewingVoucher(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-5 space-y-4 shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-4 h-4 text-purple-600 shrink-0" />
                <h4 className="text-sm font-black text-slate-900 truncate">
                  {viewingVoucher.name || 'Comprobante / Voucher de Pago'}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingVoucher.url}
                  download={viewingVoucher.name || 'voucher-pago'}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 transition"
                  title="Descargar comprobante"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setViewingVoucher(null)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center max-h-[70vh] overflow-auto bg-slate-50 p-2 rounded-2xl border border-slate-100">
              {viewingVoucher.url.startsWith('data:application/pdf') ? (
                <iframe src={viewingVoucher.url} className="w-full h-[65vh] rounded-xl border-0" />
              ) : (
                <img
                  src={viewingVoucher.url}
                  alt="Voucher de pago"
                  className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setViewingVoucher(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
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
