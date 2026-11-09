import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  BookOpen,
  Sliders,
  ChevronLeft,
  Clock,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  EmployeeProfile,
  HrGlobalSettings,
  DEFAULT_HR_SETTINGS,
  AttendanceRecord,
  FinanceTransaction,
  AccountingEntry,
  User,
} from '../../shared/types';
import { AdministrationSubmodule, HrTab } from './administration/types';

// Submódulos
import { AdministrationHubView } from './administration/submodules/hub/AdministrationHubView';
import { HrEmployeesView } from './administration/submodules/hr/HrEmployeesView';
import { HrAttendanceHistoryView } from './administration/submodules/hr/HrAttendanceHistoryView';
import { HrSettingsView } from './administration/submodules/hr/HrSettingsView';
import { AttendanceActionWidget } from './administration/submodules/hr/components/AttendanceActionWidget';
import { FinancesView } from './administration/submodules/finances/FinancesView';
import { AccountingView } from './administration/submodules/accounting/AccountingView';

// Modales
import { EmployeeModal } from './administration/modals/EmployeeModal';
import { HrSettingsModal } from './administration/modals/HrSettingsModal';
import { EmployeePaymentModal } from './administration/modals/EmployeePaymentModal';
import { EmployeePaymentRecord } from '../../shared/types';

export const AdministrationModule: React.FC = () => {
  const { tenant, toast, confirmAction, apiFetch, can } = useApp();

  // Submódulo actual
  const [currentSubmodule, setCurrentSubmodule] = useState<AdministrationSubmodule>('hub');
  // Pestaña en RRHH
  const [currentHrTab, setCurrentHrTab] = useState<HrTab>('attendance');

  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [hrSettings, setHrSettings] = useState<HrGlobalSettings>(DEFAULT_HR_SETTINGS);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [accountingEntries, setAccountingEntries] = useState<AccountingEntry[]>([]);

  // Modales
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<EmployeeProfile> | null>(null);

  const [isHrSettingsModalOpen, setIsHrSettingsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetEmployee, setPaymentTargetEmployee] = useState<EmployeeProfile | null>(null);

  // Cargar datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [
        usersRes,
        employeesRes,
        settingsRes,
        attendanceRes,
        financesRes,
        accountingRes,
      ] = await Promise.all([
        apiFetch<{ users: User[] }>('/api/settings/users').catch(() => ({ users: [] })),
        apiFetch<{ employees: EmployeeProfile[] }>('/api/administration/hr/employees').catch(() => ({ employees: [] })),
        apiFetch<{ settings: HrGlobalSettings }>('/api/administration/hr/settings').catch(() => ({ settings: DEFAULT_HR_SETTINGS })),
        apiFetch<{ records: AttendanceRecord[] }>('/api/administration/hr/attendance').catch(() => ({ records: [] })),
        apiFetch<{ transactions: FinanceTransaction[] }>('/api/administration/finances').catch(() => ({ transactions: [] })),
        apiFetch<{ entries: AccountingEntry[] }>('/api/administration/accounting').catch(() => ({ entries: [] })),
      ]);

      setUsers(usersRes.users || []);
      setEmployees(employeesRes.employees || []);
      setHrSettings(settingsRes.settings || DEFAULT_HR_SETTINGS);
      setAttendanceRecords(attendanceRes.records || []);
      setTransactions(financesRes.transactions || []);
      setAccountingEntries(accountingRes.entries || []);
    } catch (err: any) {
      toast('Error al sincronizar datos de administración', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers Personal
  const handleSaveEmployee = async (data: Partial<EmployeeProfile>) => {
    try {
      if (data.id) {
        const res = await apiFetch<{ employee: EmployeeProfile }>(
          `/api/administration/hr/employees/${data.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        );
        setEmployees((prev) => prev.map((e) => (e.id === res.employee.id ? res.employee : e)));
        toast('Ficha de personal actualizada correctamente', 'success');
      } else {
        const res = await apiFetch<{ employee: EmployeeProfile }>(
          '/api/administration/hr/employees',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        );
        setEmployees((prev) => [res.employee, ...prev]);
        toast('Colaborador registrado exitosamente en RRHH', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Error al guardar personal', 'error');
      throw err;
    }
  };

  const handleDeleteEmployee = async (emp: EmployeeProfile) => {
    const ok = await confirmAction({
      title: '¿Eliminar ficha de personal?',
      message: `¿Estás seguro de quitar a "${emp.userName}" del registro de personal? Esto no eliminará su usuario del sistema, solo su ficha laboral.`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/administration/hr/employees/${emp.id}`, { method: 'DELETE' });
      setEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      toast('Ficha de personal eliminada', 'info');
    } catch {
      toast('Error al eliminar personal', 'error');
    }
  };

  // Handler Registrar Pago a Colaborador
  const handleSaveEmployeePayment = async (
    employeeId: string,
    paymentData: Partial<EmployeePaymentRecord>
  ) => {
    try {
      const res = await apiFetch<{ employee: EmployeeProfile; payment: EmployeePaymentRecord }>(
        `/api/administration/hr/employees/${employeeId}/payments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentData),
        }
      );
      setEmployees((prev) => prev.map((e) => (e.id === res.employee.id ? res.employee : e)));
      // Refrescar finanzas para ver el egreso registrado
      apiFetch<{ transactions: FinanceTransaction[] }>('/api/administration/finances')
        .then((data) => setTransactions(data.transactions || []))
        .catch(() => {});
      toast('¡Pago registrado con éxito y reflejado en el portal del colaborador!', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al registrar el pago', 'error');
      throw err;
    }
  };

  // Handlers Configuración RRHH
  const handleSaveHrSettings = async (settingsData: Partial<HrGlobalSettings>) => {
    try {
      const res = await apiFetch<{ settings: HrGlobalSettings }>(
        '/api/administration/hr/settings',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsData),
        }
      );
      setHrSettings(res.settings);
      toast('Configuración global de RRHH actualizada con éxito', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al guardar configuración', 'error');
      throw err;
    }
  };

  // Handlers Finanzas
  const handleCreateTransaction = async (data: Partial<FinanceTransaction>) => {
    try {
      const res = await apiFetch<{ transaction: FinanceTransaction }>(
        '/api/administration/finances',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      setTransactions((prev) => [res.transaction, ...prev]);
      toast('Movimiento financiero registrado con éxito', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al registrar movimiento', 'error');
      throw err;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await apiFetch(`/api/administration/finances/${id}`, { method: 'DELETE' });
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast('Movimiento eliminado', 'info');
    } catch {
      toast('Error al eliminar movimiento', 'error');
    }
  };

  const handleSyncPaymentNotes = async () => {
    try {
      const res = await apiFetch<any>('/api/administration/sync-payment-notes', { method: 'POST' });
      if (res?.transactions) {
        setTransactions(res.transactions);
      } else {
        await loadData();
      }
      toast(`✨ ${res?.syncedCount ?? 0} notas de cobro sincronizadas con éxito`, 'success');
    } catch (err: any) {
      toast(err.message || 'Error al sincronizar notas de cobro', 'error');
    }
  };

  // Handlers Contabilidad
  const handleCreateAccountingEntry = async (data: Partial<AccountingEntry>) => {
    try {
      const res = await apiFetch<{ entry: AccountingEntry }>(
        '/api/administration/accounting',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );
      setAccountingEntries((prev) => [res.entry, ...prev]);
      toast('Asiento contable creado con éxito', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al crear asiento contable', 'error');
      throw err;
    }
  };

  const handleDeleteAccountingEntry = async (id: string) => {
    try {
      await apiFetch(`/api/administration/accounting/${id}`, { method: 'DELETE' });
      setAccountingEntries((prev) => prev.filter((e) => e.id !== id));
      toast('Asiento contable eliminado', 'info');
    } catch {
      toast('Error al eliminar asiento', 'error');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendanceList = attendanceRecords.filter((r) => r.date === todayStr);

  return (
    <div className="space-y-6">
      {/* Barra de Navegación de Submódulos cuando no estamos en Hub */}
      {currentSubmodule !== 'hub' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentSubmodule('hub')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Hub</span>
            </button>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            {/* Selector de Submódulos */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1">
              <button
                type="button"
                onClick={() => setCurrentSubmodule('hr')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  currentSubmodule === 'hr'
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Recursos Humanos
              </button>

              <button
                type="button"
                onClick={() => setCurrentSubmodule('finances')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  currentSubmodule === 'finances'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Finanzas
              </button>

              <button
                type="button"
                onClick={() => setCurrentSubmodule('accounting')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  currentSubmodule === 'accounting'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Contabilidad
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* VISTA 0: HUB CENTRAL DE BIENVENIDA */}
      {currentSubmodule === 'hub' && (
        <AdministrationHubView
          employees={employees}
          todayAttendanceRecords={todayAttendanceList}
          transactions={transactions}
          accountingEntries={accountingEntries}
          onSelectSubmodule={(sub) => setCurrentSubmodule(sub)}
        />
      )}

      {/* VISTA 1: RECURSOS HUMANOS (CON TABS INTERNAS) */}
      {currentSubmodule === 'hr' && (
        <div className="space-y-6">
          {/* Widget Informativo de Hora en RRHH (Marcación activa centralizada en Dashboard) */}
          <AttendanceActionWidget
            mode="info_only"
            onNavigateToDashboard={() => {
              window.location.search = '?module=dashboard';
            }}
          />

          {/* Selector de Pestañas de RRHH */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
            <button
              type="button"
              onClick={() => setCurrentHrTab('attendance')}
              className={`pb-3 px-3 text-xs font-black transition relative flex items-center gap-1.5 cursor-pointer ${
                currentHrTab === 'attendance'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              Dashboard de Horas de Entrada & Asistencias
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-mono">
                {attendanceRecords.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentHrTab('employees')}
              className={`pb-3 px-3 text-xs font-black transition relative flex items-center gap-1.5 cursor-pointer ${
                currentHrTab === 'employees'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Personal & Salarios
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                {employees.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentHrTab('settings')}
              className={`pb-3 px-3 text-xs font-black transition relative flex items-center gap-1.5 cursor-pointer ${
                currentHrTab === 'settings'
                  ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Configuración Global de RRHH
            </button>
          </div>

          {/* Contenido según pestaña de RRHH */}
          {currentHrTab === 'attendance' && (
            <HrAttendanceHistoryView
              records={attendanceRecords}
              employees={employees}
              onRefresh={loadData}
            />
          )}

          {currentHrTab === 'employees' && (
            <HrEmployeesView
              employees={employees}
              users={users}
              onOpenNewEmployee={() => {
                setEditingEmployee(null);
                setIsEmployeeModalOpen(true);
              }}
              onOpenEditEmployee={(emp) => {
                setEditingEmployee(emp);
                setIsEmployeeModalOpen(true);
              }}
              onDeleteEmployee={handleDeleteEmployee}
              onOpenPaymentModal={(emp) => {
                setPaymentTargetEmployee(emp);
                setIsPaymentModalOpen(true);
              }}
            />
          )}

          {currentHrTab === 'settings' && (
            <HrSettingsView
              settings={hrSettings}
              onOpenEditSettings={() => setIsHrSettingsModalOpen(true)}
            />
          )}
        </div>
      )}

      {/* VISTA 2: FINANZAS */}
      {currentSubmodule === 'finances' && (
        <FinancesView
          transactions={transactions}
          onCreateTransaction={handleCreateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onSyncPaymentNotes={handleSyncPaymentNotes}
        />
      )}

      {/* VISTA 3: CONTABILIDAD */}
      {currentSubmodule === 'accounting' && (
        <AccountingView
          entries={accountingEntries}
          onCreateEntry={handleCreateAccountingEntry}
          onDeleteEntry={handleDeleteAccountingEntry}
        />
      )}

      {/* MODAL EDITAR / CREAR PERSONAL */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        users={users}
        existingEmployeeUserIds={employees.map((e) => e.userId)}
        onSave={handleSaveEmployee}
      />

      {/* MODAL CONFIGURACIÓN GLOBAL RRHH */}
      <HrSettingsModal
        isOpen={isHrSettingsModalOpen}
        onClose={() => setIsHrSettingsModalOpen(false)}
        settings={hrSettings}
        onSave={handleSaveHrSettings}
      />
      {/* MODAL REGISTRAR PAGO CON OCR */}
      <EmployeePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentTargetEmployee(null);
        }}
        employee={paymentTargetEmployee}
        onSavePayment={handleSaveEmployeePayment}
      />
    </div>
  );
};
