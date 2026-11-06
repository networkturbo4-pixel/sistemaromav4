import { MembershipMonthStatus, MembershipMonthItem, MembershipSubInstallment, PaymentNoteItem } from '../../shared/types';

export interface ComputedStatusResult {
  status: 'paid' | 'in_process' | 'delayed' | 'inactive';
  label: string;
  badgeClass: string;
}

/**
 * Calcula el estado dinámico de una cuota de membresía según las reglas de negocio:
 * 1. Si ya se pagó (status === 'paid' o tiene voucher verificado): PAGADO (verde)
 * 2. Si está explícitamente marcado como inactivo (status === 'inactive'): NO ACTIVO (gris)
 * 3. Si no tiene dueDate: usa el status almacenado (o 'in_process')
 * 4. Si pasaron más de 5 días de la fecha de pago sin pagar: RETRASADO (rojo)
 * 5. Si faltan de 5 a 7 días para la fecha de pago (y hasta el 5to día de vencido): EN PROCESO (ámbar)
 * 6. Si faltan más de 7 días para la fecha de pago: NO ACTIVO (gris/slate)
 */
export function computeInstallmentStatus(
  status: MembershipMonthStatus,
  dueDateStr?: string,
  now: Date = new Date()
): ComputedStatusResult {
  if (status === 'paid') {
    return {
      status: 'paid',
      label: 'PAGADO',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    };
  }

  if (status === 'inactive') {
    return {
      status: 'inactive',
      label: 'NO ACTIVO',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    };
  }

  if (!dueDateStr) {
    return {
      status: 'in_process',
      label: 'EN PROCESO',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    };
  }

  const parts = dueDateStr.split('-');
  if (parts.length !== 3) {
    return {
      status: 'in_process',
      label: 'EN PROCESO',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    };
  }

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    return {
      status: 'in_process',
      label: 'EN PROCESO',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    };
  }

  const dueDate = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = today.getTime() - dueDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Más de 5 días transcurridos desde la fecha de pago -> RETRASADO
  if (diffDays > 5) {
    return {
      status: 'delayed',
      label: 'RETRASADO',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    };
  }

  // Falta entre 5 a 7 días antes de su vencimiento (o durante los 5 días de gracia) -> EN PROCESO
  if (diffDays >= -7 && diffDays <= 5) {
    return {
      status: 'in_process',
      label: 'EN PROCESO',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    };
  }

  // Falta más de 7 días para la fecha de pago -> NO ACTIVO
  if (diffDays < -7) {
    return {
      status: 'inactive',
      label: 'NO ACTIVO',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    };
  }

  return {
    status: 'in_process',
    label: 'EN PROCESO',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  };
}

/** Formatea una fecha YYYY-MM-DD a DD/MM/YYYY */
export function formatDueDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Calcula los totales activos de un comprobante de pago:
 * Si el mes o abono está "NO ACTIVO" (inactive), no suma en el subtotal ni total a pagar.
 */
export function calculatePaymentNoteActiveTotals(params: {
  isMembership?: boolean;
  membershipInstallments?: MembershipMonthItem[];
  extraItems?: PaymentNoteItem[];
  items?: PaymentNoteItem[];
  includeTax: boolean;
  taxRate: number;
  discountAmount: number;
  manualPaidAmount?: number;
}) {
  let subtotal = 0;
  let paidAmount = 0;

  if (params.isMembership && params.membershipInstallments && params.membershipInstallments.length > 0) {
    params.membershipInstallments.forEach((inst) => {
      if (inst.isSplit && inst.subInstallments && inst.subInstallments.length > 0) {
        inst.subInstallments.forEach((sub) => {
          const comp = computeInstallmentStatus(sub.status, sub.dueDate);
          // Si no está inactivo, suma al subtotal
          if (comp.status !== 'inactive') {
            const amt = Number(sub.amount) || 0;
            subtotal += amt;
            if (comp.status === 'paid') {
              paidAmount += amt;
            }
          }
        });
      } else {
        const comp = computeInstallmentStatus(inst.status, inst.dueDate);
        // Si no está inactivo, suma al subtotal
        if (comp.status !== 'inactive') {
          const amt = Number(inst.amount) || 0;
          subtotal += amt;
          if (comp.status === 'paid') {
            paidAmount += amt;
          }
        }
      }
    });

    // Sumar servicios adicionales / extras si existen
    if (params.extraItems && params.extraItems.length > 0) {
      params.extraItems.forEach((extra) => {
        const amt = Number(extra.total) || 0;
        subtotal += amt;
        if (extra.status === 'paid') {
          paidAmount += amt;
        }
      });
    }
  } else {
    // Conceptos estándar
    const itemsList = params.items || [];
    subtotal = itemsList.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    paidAmount = Number(params.manualPaidAmount) || 0;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const taxAmount = params.includeTax
    ? Math.round(subtotal * (params.taxRate / 100) * 100) / 100
    : 0;
  const discount = Number(params.discountAmount) || 0;
  const total = Math.max(0, Math.round((subtotal + taxAmount - discount) * 100) / 100);
  paidAmount = Math.round(paidAmount * 100) / 100;
  const balance = Math.max(0, Math.round((total - paidAmount) * 100) / 100);

  let status: 'paid' | 'partial' | 'pending' = 'pending';
  if (total > 0 && paidAmount >= total) {
    status = 'paid';
  } else if (paidAmount > 0) {
    status = 'partial';
  }

  return {
    subtotal,
    taxAmount,
    total,
    paidAmount,
    balance,
    status,
  };
}

export interface FlattenedInstallmentRow {
  rowKey: string;
  displayNumber: string;
  monthNumber: number;
  isSub: boolean;
  planName: string;
  periodName: string;
  notes?: string;
  amount: number;
  dueDate?: string;
  operationNumber?: string;
  paidDate?: string;
  voucherUrl?: string;
  voucherName?: string;
  status: MembershipMonthStatus;
  computed: ComputedStatusResult;
}

/**
 * Aplana los meses e sub-abonos para representación consistente en tablas públicas y previews
 */
export function flattenInstallmentsForDisplay(
  installments: MembershipMonthItem[]
): FlattenedInstallmentRow[] {
  const rows: FlattenedInstallmentRow[] = [];

  installments.forEach((inst, mIdx) => {
    const monthNum = inst.monthNumber || mIdx + 1;

    if (inst.isSplit && inst.subInstallments && inst.subInstallments.length > 0) {
      inst.subInstallments.forEach((sub, sIdx) => {
        const comp = computeInstallmentStatus(sub.status, sub.dueDate);
        rows.push({
          rowKey: `${inst.id || mIdx}-sub-${sub.id || sIdx}`,
          displayNumber: `${monthNum}.${sIdx + 1}`,
          monthNumber: monthNum,
          isSub: true,
          planName: inst.planName,
          periodName: `${inst.periodName} • ${sub.title}`,
          notes: sub.notes || inst.notes,
          amount: Number(sub.amount) || 0,
          dueDate: sub.dueDate || inst.dueDate,
          operationNumber: sub.operationNumber,
          paidDate: sub.paidDate,
          voucherUrl: sub.voucherUrl,
          voucherName: sub.voucherName,
          status: sub.status,
          computed: comp,
        });
      });
    } else {
      const comp = computeInstallmentStatus(inst.status, inst.dueDate);
      rows.push({
        rowKey: inst.id || `inst-${mIdx}`,
        displayNumber: `${monthNum}`,
        monthNumber: monthNum,
        isSub: false,
        planName: inst.planName,
        periodName: inst.periodName,
        notes: inst.notes,
        amount: Number(inst.amount) || 0,
        dueDate: inst.dueDate,
        operationNumber: inst.operationNumber,
        paidDate: inst.paidDate,
        voucherUrl: inst.voucherUrl,
        voucherName: inst.voucherName,
        status: inst.status,
        computed: comp,
      });
    }
  });

  return rows;
}
