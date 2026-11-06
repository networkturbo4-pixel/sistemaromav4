import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Scale,
  Trash2,
  Calendar,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { AccountingEntry } from '../../../../../shared/types';

interface AccountingViewProps {
  entries: AccountingEntry[];
  onCreateEntry: (data: Partial<AccountingEntry>) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  entries,
  onCreateEntry,
  onDeleteEntry,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<AccountingEntry>>({
    date: new Date().toISOString().split('T')[0],
    concept: '',
    accountCode: '60.1',
    accountName: 'Servicios de Terceros / Operativo',
    debit: 0,
    credit: 0,
    status: 'posted',
    reference: '',
  });

  const [saving, setSaving] = useState(false);

  const totalDebit = entries.reduce((acc, e) => acc + (e.debit || 0), 0);
  const totalCredit = entries.reduce((acc, e) => acc + (e.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const filteredEntries = entries.filter((e) => {
    return (
      (e.concept || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.accountCode || '').includes(searchTerm) ||
      (e.accountName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.entryNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.concept?.trim()) {
      alert('Ingresa el concepto del asiento');
      return;
    }
    setSaving(true);
    try {
      await onCreateEntry(formData);
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        concept: '',
        accountCode: '60.1',
        accountName: 'Servicios de Terceros / Operativo',
        debit: 0,
        credit: 0,
        status: 'posted',
        reference: '',
      });
    } catch (err: any) {
      alert(err.message || 'Error al guardar el asiento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tarjetas de Balance Contable */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Debe</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            S/. {totalDebit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sumatoria de cargos</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Haber</span>
            <BookOpen className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            S/. {totalCredit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sumatoria de abonos</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Estado de Cuadre</span>
            <Scale className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isBalanced
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {isBalanced ? '✓ Libro Cuadrado' : '⚠ Descuadre'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Partida doble verificada</p>
        </div>
      </div>

      {/* Barra de Filtros y Acción */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por concepto, cuenta o N° de asiento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nuevo Asiento Contable
        </button>
      </div>

      {/* Tabla de Asientos */}
      {filteredEntries.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            Sin asientos en el libro diario
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Registra asientos contables con partida doble para el control fiscal y contable de la agencia.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3.5 px-4">N° Asiento</th>
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Concepto / Glosa</th>
                  <th className="py-3.5 px-4">Cuenta</th>
                  <th className="py-3.5 px-4 text-right">Debe</th>
                  <th className="py-3.5 px-4 text-right">Haber</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredEntries.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {e.entryNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {e.date}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {e.concept}
                      {e.reference && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Doc: {e.reference}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <span className="font-mono font-bold">{e.accountCode}</span> - {e.accountName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {e.debit > 0 ? `S/. ${Number(e.debit).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {e.credit > 0 ? `S/. ${Number(e.credit).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(e.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Eliminar asiento"
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

      {/* Modal Nuevo Asiento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Nuevo Asiento en Libro Diario
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Concepto / Glosa</label>
                <input
                  type="text"
                  placeholder="Ej. Reconocimiento de ingreso por campaña mensual"
                  value={formData.concept || ''}
                  onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Código Cuenta</label>
                  <input
                    type="text"
                    placeholder="70.1 o 63.1"
                    value={formData.accountCode || ''}
                    onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-hidden focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Nombre de Cuenta</label>
                <input
                  type="text"
                  placeholder="Ej. Ingresos por servicios de publicidad"
                  value={formData.accountName || ''}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Debe (Cargo)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.debit}
                    onChange={(e) => setFormData({ ...formData, debit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Haber (Abono)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.credit}
                    onChange={(e) => setFormData({ ...formData, credit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  {saving ? 'Guardando...' : 'Crear Asiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
