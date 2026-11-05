import { MembershipMonthStatus } from '../../shared/types';

export interface ComputedStatusResult {
  status: 'paid' | 'in_process' | 'delayed' | 'inactive';
  label: string;
  badgeClass: string;
}

/**
 * Calcula el estado dinámico de una cuota de membresía según las reglas de negocio:
 * 1. Si ya se pagó (status === 'paid' o tiene voucher verificado): PAGADO (verde)
 * 2. Si no tiene dueDate: usa el status almacenado (o 'in_process')
 * 3. Si pasaron más de 5 días de la fecha de pago sin pagar: RETRASADO (rojo)
 * 4. Si faltan de 5 a 7 días para la fecha de pago (y hasta el 5to día de vencido): EN PROCESO (ámbar)
 * 5. Si faltan más de 7 días para la fecha de pago: NO ACTIVO (gris/slate)
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
