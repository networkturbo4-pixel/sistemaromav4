import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  DollarSign,
  Calendar,
  Clock,
  Cake,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Link2,
  ExternalLink,
  Copy,
  Receipt,
  Check,
} from 'lucide-react';
import { EmployeeProfile, User } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface HrEmployeesViewProps {
  employees: EmployeeProfile[];
  users: User[];
  onOpenNewEmployee: () => void;
  onOpenEditEmployee: (emp: EmployeeProfile) => void;
  onDeleteEmployee: (emp: EmployeeProfile) => void;
  onOpenPaymentModal: (emp: EmployeeProfile) => void;
}

export const HrEmployeesView: React.FC<HrEmployeesViewProps> = ({
  employees,
  users,
  onOpenNewEmployee,
  onOpenEditEmployee,
  onDeleteEmployee,
  onOpenPaymentModal,
}) => {
  const { toast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      (emp.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.documentNumber || '').includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Usuarios del sistema sin ficha de personal
  const unassignedUsers = users.filter(
    (u) => !employees.some((e) => e.userId === u.id)
  );

  const handleCopyPublicLink = (emp: EmployeeProfile) => {
    const token = emp.publicToken || emp.id;
    const url = `${window.location.origin}/personal/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(emp.id);
    toast('¡Enlace público del historial de pagos copiado al portapapeles!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenPublicView = (emp: EmployeeProfile) => {
    const token = emp.publicToken || emp.id;
    window.open(`/personal/${token}`, '_blank');
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Barra de Filtros y Acción Principal */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar colaborador por nombre, cargo o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="vacation">Vacaciones</option>
            <option value="license">Licencia</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onOpenNewEmployee}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Añadir Personal
        </button>
      </div>

      {/* Alerta de usuarios sin ficha de personal */}
      {unassignedUsers.length > 0 && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Hay <strong>{unassignedUsers.length}</strong> {unassignedUsers.length === 1 ? 'usuario' : 'usuarios'} registrados en el sistema sin ficha de personal ni salario asignado.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenNewEmployee}
            className="text-amber-900 dark:text-amber-200 font-black hover:underline shrink-0 cursor-pointer"
          >
            Asignar ahora →
          </button>
        </div>
      )}

      {/* Grid de Colaboradores:
          PC (2xl / xl): 5 columnas
          Laptop (lg): 4 columnas
          Tablet (md): 3 columnas
          Celular: 1 columna */}
      {filteredEmployees.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            No se encontraron colaboradores
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'No hay resultados que coincidan con la búsqueda.'
              : 'Añade tu primer colaborador sincronizado con las cuentas de usuario de la plataforma.'}
          </p>
          {!searchTerm && (
            <button
              type="button"
              onClick={onOpenNewEmployee}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Registrar Ficha
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
          {filteredEmployees.map((emp) => {
            const paymentsCount = emp.payments?.length || 0;
            const currencySymbol = emp.salaryCurrency === 'USD' ? '$' : 'S/.';

            return (
              <div
                key={emp.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Encabezado: Avatar, Nombre y Badge Estado */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {emp.userAvatar ? (
                        <img
                          src={emp.userAvatar}
                          alt={emp.userName}
                          className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center shrink-0">
                          {(emp.userName || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate">
                          {emp.userName}
                        </h3>
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold truncate mt-0.5">
                          {emp.jobTitle || 'Colaborador'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                        emp.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : emp.status === 'vacation'
                          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                          : emp.status === 'license'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {emp.status === 'active'
                        ? 'Activo'
                        : emp.status === 'vacation'
                        ? 'Vacaciones'
                        : emp.status === 'license'
                        ? 'Licencia'
                        : 'Inactivo'}
                    </span>
                  </div>

                  {/* Bloque Salario Destacado */}
                  <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Salario Mensual
                    </span>
                    <div className="flex items-baseline justify-between mt-0.5">
                      <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                        {currencySymbol} {Number(emp.salary || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {paymentsCount} {paymentsCount === 1 ? 'pago' : 'pagos'}
                      </span>
                    </div>
                  </div>

                  {/* Chips de Información (Horario, Cumpleaños, Ingreso, DNI) */}
                  <div className="mt-3 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Horario:
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {emp.entryTime || '09:00'} - {emp.exitTime || '18:00'}
                      </span>
                    </div>

                    {emp.birthDate && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Cake className="w-3.5 h-3.5 text-pink-500" />
                          Cumpleaños:
                        </span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {emp.birthDate}
                        </span>
                      </div>
                    )}

                    {emp.hireDate && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          Ingreso:
                        </span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {emp.hireDate}
                        </span>
                      </div>
                    )}

                    {emp.documentNumber && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="text-slate-400">
                          {emp.documentType || 'DNI'}:
                        </span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {emp.documentNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones del Card: Registrar Pago, Copiar Enlace Público, Ver Historial, Editar, Eliminar */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                  {/* Botón Principal: Registrar Pago con OCR */}
                  <button
                    type="button"
                    onClick={() => onOpenPaymentModal(emp)}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Registrar Pago (OCR)</span>
                  </button>

                  {/* Fila de acciones secundarias */}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {/* Copiar Enlace Público */}
                    <button
                      type="button"
                      onClick={() => handleCopyPublicLink(emp)}
                      className={`p-1.5 rounded-lg transition cursor-pointer text-[10px] font-bold flex items-center gap-1 ${
                        copiedId === emp.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                          : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                      }`}
                      title="Copiar enlace de vista pública del historial de pagos"
                    >
                      {copiedId === emp.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Ver Vista Pública en nueva pestaña */}
                      <button
                        type="button"
                        onClick={() => handleOpenPublicView(emp)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Abrir historial público de pagos"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {/* Editar Ficha */}
                      <button
                        type="button"
                        onClick={() => onOpenEditEmployee(emp)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Editar ficha"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Eliminar Ficha */}
                      <button
                        type="button"
                        onClick={() => onDeleteEmployee(emp)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Eliminar colaborador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
