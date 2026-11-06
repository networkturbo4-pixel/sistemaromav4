import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  Tag,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { FinanceTransaction } from '../../../../../shared/types';

interface FinancesViewProps {
  transactions: FinanceTransaction[];
  onCreateTransaction: (data: Partial<FinanceTransaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export const FinancesView: React.FC<FinancesViewProps> = ({
  transactions,
  onCreateTransaction,
  onDeleteTransaction,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  const [formData, setFormData] = useState<Partial<FinanceTransaction>>({
    type: 'income',
    category: 'Ventas de Servicios',
    amount: 0,
    currency: 'PEN',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'Transferencia Bancaria',
    reference: '',
    status: 'completed',
  });

  const [saving, setSaving] = useState(false);

  // Cálculos
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const balance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.reference || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }
    setSaving(true);
    try {
      await onCreateTransaction(formData);
      setIsModalOpen(false);
      setFormData({
        type: 'income',
        category: 'Ventas de Servicios',
        amount: 0,
        currency: 'PEN',
        date: new Date().toISOString().split('T')[0],
        description: '',
        paymentMethod: 'Transferencia Bancaria',
        reference: '',
        status: 'completed',
      });
    } catch (err: any) {
      alert(err.message || 'Error al guardar la transacción');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tarjetas de Métricas de Finanzas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Ingresos Totales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            S/. {totalIncome.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cobros y entradas registradas</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Egresos / Gastos</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            S/. {totalExpense.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Costos operativos y pagos</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Flujo de Caja Neto</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono ${
              balance >= 0
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            S/. {balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Balance neto en caja</p>
        </div>
      </div>

      {/* Barra de Filtros y Acción */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por descripción o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                typeFilter === 'income'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ingresos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                typeFilter === 'expense'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Egresos
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Registrar Movimiento
        </button>
      </div>

      {/* Tabla de Movimientos */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl">
          <DollarSign className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            Sin transacciones registradas
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Comienza registrando tus primeros ingresos de clientes o egresos de la agencia.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Descripción</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Método</th>
                  <th className="py-3.5 px-4 text-right">Monto</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                  >
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {t.date}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          t.type === 'income'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {t.type === 'income' ? '+ Ingreso' : '- Egreso'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {t.description}
                      {t.reference && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Ref: {t.reference}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{t.category}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {t.paymentMethod || 'Transferencia'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-sm">
                      <span
                        className={
                          t.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {t.type === 'income' ? '+' : '-'} {t.currency === 'USD' ? '$' : 'S/.'}{' '}
                        {Number(t.amount || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(t.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Eliminar movimiento"
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

      {/* Modal Nuevo Movimiento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Registrar Movimiento Financiero
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'income' })}
                  className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                    formData.type === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  + Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'expense' })}
                  className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                    formData.type === 'expense'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  - Egreso
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Monto</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">Descripción</label>
                <input
                  type="text"
                  placeholder="Ej. Pago mensual de cliente o Suscripción Adobe"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="Servicios, Herramientas, Nómina"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden focus:ring-2 focus:ring-emerald-500"
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
                  className="px-4 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
