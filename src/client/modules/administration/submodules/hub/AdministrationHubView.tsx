import React from 'react';
import {
  Building2,
  Users,
  DollarSign,
  BookOpen,
  ArrowRight,
  Clock,
  ShieldCheck,
  TrendingUp,
  Scale,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { AdministrationSubmodule } from '../../types';
import { EmployeeProfile, AttendanceRecord, FinanceTransaction, AccountingEntry } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface AdministrationHubViewProps {
  employees: EmployeeProfile[];
  todayAttendanceRecords: AttendanceRecord[];
  transactions: FinanceTransaction[];
  accountingEntries: AccountingEntry[];
  onSelectSubmodule: (submodule: AdministrationSubmodule) => void;
}

export const AdministrationHubView: React.FC<AdministrationHubViewProps> = ({
  employees,
  todayAttendanceRecords,
  transactions,
  accountingEntries,
  onSelectSubmodule,
}) => {
  const { can, user } = useApp();
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const canAccessHr =
    isSuperAdmin ||
    can('administration.hr.view') ||
    can('administration.hr.manage') ||
    can('administration.attendance.record') ||
    can('administration.attendance.manage');

  const canAccessFinances =
    isSuperAdmin ||
    can('administration.finances.view') ||
    can('administration.finances.manage');

  const canAccessAccounting =
    isSuperAdmin ||
    can('administration.accounting.view') ||
    can('administration.accounting.manage');

  const hasAnyAccess = canAccessHr || canAccessFinances || canAccessAccounting;
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const netBalance = totalIncome - totalExpense;

  const totalDebit = accountingEntries.reduce((acc, e) => acc + (e.debit || 0), 0);
  const totalCredit = accountingEntries.reduce((acc, e) => acc + (e.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera Principal */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-8 rounded-3xl shadow-xs relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 inline-block mb-3">
          Gestión Empresarial
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Módulo de Administración
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
          Centro de control operativo y corporativo de la agencia. Gestiona el personal y marcaciones
          de asistencia con biometría/GPS, el flujo de caja financiero y el libro diario contable.
        </p>
      </div>

      {/* Accesos Directos a los 3 Submódulos */}
      {!hasAnyAccess ? (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-8 text-center max-w-2xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-200">
            Sin submódulos de administración asignados
          </h3>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80 max-w-md mx-auto leading-relaxed">
            Tu rol no cuenta con permisos específicos para Recursos Humanos, Finanzas ni Contabilidad.
            Solicita a un administrador que habilite los accesos correspondientes a tu perfil.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-6xl">
          {/* SUBMÓDULO 1: RECURSOS HUMANOS */}
          {canAccessHr && (
            <button
              type="button"
              onClick={() => onSelectSubmodule('hr')}
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 text-left shadow-xs hover:shadow-md hover:border-purple-400 dark:hover:border-purple-600 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>

                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-bold text-slate-400">
                    {employees.length} {employees.length === 1 ? 'colaborador' : 'colaboradores'} •{' '}
                    {todayAttendanceRecords.length} asistencias hoy
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  Recursos Humanos
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Personal, salarios, horarios, control de refrigerio, dashboard de horas de entrada y
                  marcación biométrica/GPS.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
                <span>Ingresar a RRHH</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}

          {/* SUBMÓDULO 2: FINANZAS */}
          {canAccessFinances && (
            <button
              type="button"
              onClick={() => onSelectSubmodule('finances')}
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 text-left shadow-xs hover:shadow-md hover:border-emerald-400 dark:hover:border-emerald-600 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <DollarSign className="w-6 h-6" />
                </div>

                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-bold text-slate-400 font-mono">
                    Balance: S/. {netBalance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Finanzas
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Flujo de caja, control de ingresos por servicios, egresos, gastos operativos y balances
                  monetarios.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span>Ingresar a Finanzas</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}

          {/* SUBMÓDULO 3: CONTABILIDAD */}
          {canAccessAccounting && (
            <button
              type="button"
              onClick={() => onSelectSubmodule('accounting')}
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 text-left shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>

                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-bold text-slate-400">
                    {accountingEntries.length} {accountingEntries.length === 1 ? 'asiento' : 'asientos'} •{' '}
                    {isBalanced ? '✓ Cuadrado' : '⚠ Descuadre'}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Contabilidad
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Libro diario, asientos contables de partida doble, catálogo de cuentas y cuadre de debe y
                  haber.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                <span>Ingresar a Contabilidad</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
