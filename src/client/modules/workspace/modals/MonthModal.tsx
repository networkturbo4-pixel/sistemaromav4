import React from 'react';
import { Calendar, X, Folder, Trash2, RefreshCw } from 'lucide-react';
import {
  WorkspaceMonth,
  WorkspaceMonthStatus,
  WorkspaceProject,
} from '../../../../shared/types';
import {
  MONTH_NAMES,
  DEFAULT_MONTH_SUBFOLDERS,
  getMonthDateDefaults,
} from '../types';

export interface MonthFormData {
  month: number;
  year: number;
  name: string;
  startDate: string;
  endDate: string;
  status: WorkspaceMonthStatus;
  isEditing?: boolean;
  editingId?: string;
}

interface MonthModalProps {
  isOpen: boolean;
  monthForm: MonthFormData;
  setMonthForm: React.Dispatch<React.SetStateAction<MonthFormData>>;
  activeProject: WorkspaceProject | null;
  months: WorkspaceMonth[];
  isSubmittingMonth: boolean;
  onClose: () => void;
  onSaveMonth: (e: React.FormEvent) => void;
  onDeleteMonth: (m: WorkspaceMonth) => void;
}

export const MonthModal: React.FC<MonthModalProps> = ({
  isOpen,
  monthForm,
  setMonthForm,
  activeProject,
  months,
  isSubmittingMonth,
  onClose,
  onSaveMonth,
  onDeleteMonth,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {monthForm.isEditing ? 'Editar Mes de Contenido' : 'Nuevo Mes de Contenido'}
              </h3>
              <p className="text-xs text-slate-400">
                {activeProject?.brandName || activeProject?.name} ({activeProject?.serviceOrderCode || 'OS'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={onSaveMonth} className="space-y-4">
          {/* Selector de Mes y Año */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mes *
              </label>
              <select
                value={monthForm.month}
                onChange={(e) => {
                  const newMonth = Number(e.target.value);
                  const defaults = getMonthDateDefaults(newMonth, monthForm.year);
                  setMonthForm((prev) => ({
                    ...prev,
                    month: newMonth,
                    name: defaults.name,
                    startDate: defaults.startDate,
                    endDate: defaults.endDate,
                  }));
                }}
                className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Año *
              </label>
              <select
                value={monthForm.year}
                onChange={(e) => {
                  const newYear = Number(e.target.value);
                  const defaults = getMonthDateDefaults(monthForm.month, newYear);
                  setMonthForm((prev) => ({
                    ...prev,
                    year: newYear,
                    name: defaults.name,
                    startDate: defaults.startDate,
                    endDate: defaults.endDate,
                  }));
                }}
                className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nombre de la Campaña / Mes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nombre de la Campaña / Mes
            </label>
            <input
              type="text"
              required
              value={monthForm.name}
              onChange={(e) => setMonthForm({ ...monthForm, name: e.target.value })}
              placeholder="Ej: Noviembre 2026 o Noviembre - Black Friday"
              className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Fechas: Inicio y Límite */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                required
                value={monthForm.startDate}
                onChange={(e) => setMonthForm({ ...monthForm, startDate: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha Límite / Entrega *
              </label>
              <input
                type="date"
                required
                value={monthForm.endDate}
                onChange={(e) => setMonthForm({ ...monthForm, endDate: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Estado del Mes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Estado
            </label>
            <select
              value={monthForm.status}
              onChange={(e) => setMonthForm({ ...monthForm, status: e.target.value as WorkspaceMonthStatus })}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
            >
              <option value="pending">PENDIENTE</option>
              <option value="in_progress">EN PROCESO</option>
              <option value="completed">COMPLETADO</option>
            </select>
          </div>

          {/* Banner de Estructura de Carpetas en Google Drive */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 text-xs space-y-2">
            <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300">
              <Folder className="w-4 h-4 fill-amber-400 text-amber-600" />
              <span>Estructura automática en Google Drive</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Al crear este mes se generará automáticamente su carpeta y las siguientes 7 subcarpetas organizadas en la nube:
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {DEFAULT_MONTH_SUBFOLDERS.map((sf) => (
                <div
                  key={sf}
                  className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-slate-700 dark:text-slate-300"
                >
                  <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                  <span className="truncate">{sf}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {monthForm.isEditing && monthForm.editingId ? (
              <button
                type="button"
                onClick={() => {
                  const m = months.find((x) => x.id === monthForm.editingId);
                  if (m) {
                    onClose();
                    onDeleteMonth(m);
                  }
                }}
                className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Mes</span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmittingMonth}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingMonth}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingMonth ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Creando en Drive...</span>
                  </>
                ) : (
                  <span>{monthForm.isEditing ? 'Actualizar Mes' : 'Crear Mes y Carpetas'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
