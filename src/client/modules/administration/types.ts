import {
  EmployeeProfile,
  HrGlobalSettings,
  AttendanceRecord,
  AttendanceStamp,
  AttendanceActionType,
  AttendanceStatus,
  FinanceTransaction,
  AccountingEntry,
  User,
} from '../../../shared/types';

export type AdministrationSubmodule = 'hub' | 'hr' | 'finances' | 'accounting';
export type HrTab = 'employees' | 'attendance' | 'settings';

export interface AttendanceStats {
  totalEmployees: number;
  activeToday: number;
  onTimeToday: number;
  lateToday: number;
  onBreakToday: number;
  absentToday: number;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

export const ATTENDANCE_STATUS_LABELS: Record<
  AttendanceStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  present: {
    label: 'Puntual',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  late: {
    label: 'Tardanza',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  early_departure: {
    label: 'Salida Anticipada',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
  in_progress: {
    label: 'En Jornada',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  absent: {
    label: 'Falta',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
  },
  justified: {
    label: 'Justificado',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
};
