import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Filter,
  UserCheck,
  AlertCircle,
  MapPin,
  Camera,
  Fingerprint,
  Coffee,
  LogIn,
  LogOut,
  ExternalLink,
  ChevronDown,
  X,
  Sparkles,
} from 'lucide-react';
import { AttendanceRecord, EmployeeProfile } from '../../../../../shared/types';
import { ATTENDANCE_STATUS_LABELS } from '../../types';

interface HrAttendanceHistoryViewProps {
  records: AttendanceRecord[];
  employees: EmployeeProfile[];
  onRefresh: () => void;
}

export const HrAttendanceHistoryView: React.FC<HrAttendanceHistoryViewProps> = ({
  records,
  employees,
  onRefresh,
}) => {
  const [selectedUser, setSelectedUser] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [inspectPhotoUrl, setInspectPhotoUrl] = useState<string | null>(null);

  // Filtrado
  const filteredRecords = records.filter((r) => {
    const matchesUser = selectedUser === 'all' || r.userId === selectedUser;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesDate = !dateFilter || r.date === dateFilter;
    const matchesMonth = !monthFilter || r.date.startsWith(monthFilter);
    return matchesUser && matchesStatus && matchesDate && matchesMonth;
  });

  // Métricas del historial filtrado
  const totalRecords = filteredRecords.length;
  const onTimeCount = filteredRecords.filter((r) => r.status === 'present').length;
  const lateCount = filteredRecords.filter((r) => r.status === 'late').length;
  const onTimeRate = totalRecords > 0 ? Math.round((onTimeCount / totalRecords) * 100) : 100;

  const totalWorkedMinutes = filteredRecords.reduce(
    (acc, r) => acc + (r.totalWorkMinutes || 0),
    0
  );
  const totalWorkedHours = (totalWorkedMinutes / 60).toFixed(1);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Tarjetas de Métricas de Asistencia */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Marcaciones</span>
            <UserCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalRecords}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Registros en el período</p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Puntualidad</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {onTimeRate}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{onTimeCount} llegadas a tiempo</p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tardanzas</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {lateCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Excedieron tolerancia</p>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Horas Laboradas</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {totalWorkedHours}h
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Horas netas registradas</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Filtro Mes */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setDateFilter('');
              }}
              className="bg-transparent text-slate-900 dark:text-white text-xs font-bold outline-hidden cursor-pointer"
            />
          </div>

          {/* Filtro Colaborador */}
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
          >
            <option value="all">Todos los colaboradores</option>
            {employees.map((emp) => (
              <option key={emp.userId} value={emp.userId}>
                {emp.userName || 'Usuario'} ({emp.jobTitle})
              </option>
            ))}
          </select>

          {/* Filtro Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
          >
            <option value="all">Todos los estados</option>
            <option value="present">Puntual</option>
            <option value="late">Tardanza</option>
            <option value="in_progress">En jornada</option>
            <option value="absent">Falta</option>
          </select>

          {/* Filtro Fecha Específica */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
            title="Filtrar por día exacto"
          />

          {(dateFilter || selectedUser !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setDateFilter('');
                setSelectedUser('all');
                setStatusFilter('all');
              }}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          Actualizar datos
        </button>
      </div>

      {/* Tabla de Asistencias */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            Sin registros de asistencia
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            No se han encontrado registros de marcaciones que coincidan con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3.5 px-4">Colaborador</th>
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Entrada</th>
                  <th className="py-3.5 px-4">Refrigerio</th>
                  <th className="py-3.5 px-4">Salida</th>
                  <th className="py-3.5 px-4">Horas Netas</th>
                  <th className="py-3.5 px-4">Validación</th>
                  <th className="py-3.5 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredRecords.map((r) => {
                  const statusMeta = ATTENDANCE_STATUS_LABELS[r.status] || ATTENDANCE_STATUS_LABELS.present;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition"
                    >
                      {/* Colaborador */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {r.userAvatar ? (
                            <img
                              src={r.userAvatar}
                              alt={r.userName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs">
                              {r.userName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white block leading-tight">
                              {r.userName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {r.jobTitle || 'Equipo'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono">
                        {r.date}
                      </td>

                      {/* Entrada con Foto Thumbnail */}
                      <td className="py-3 px-4">
                        {r.checkIn ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {r.checkIn.time}
                            </span>
                            {r.checkIn.photoUrl && (
                              <button
                                type="button"
                                onClick={() => setInspectPhotoUrl(r.checkIn!.photoUrl!)}
                                className="w-6 h-6 rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 hover:scale-110 transition cursor-zoom-in"
                                title="Ver foto selfie de entrada"
                              >
                                <img
                                  src={r.checkIn.photoUrl}
                                  alt="Selfie"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Refrigerio */}
                      <td className="py-3 px-4">
                        {r.breakStart ? (
                          <div className="text-slate-700 dark:text-slate-300 font-mono">
                            <span>{r.breakStart.time.slice(0, 5)}</span>
                            {r.breakEnd ? (
                              <span> - {r.breakEnd.time.slice(0, 5)}</span>
                            ) : (
                              <span className="text-amber-500 font-bold ml-1">(En curso)</span>
                            )}
                            {r.breakMinutes ? (
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({r.breakMinutes}m)
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Salida */}
                      <td className="py-3 px-4">
                        {r.checkOut ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {r.checkOut.time}
                            </span>
                            {r.checkOut.photoUrl && (
                              <button
                                type="button"
                                onClick={() => setInspectPhotoUrl(r.checkOut!.photoUrl!)}
                                className="w-6 h-6 rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 hover:scale-110 transition cursor-zoom-in"
                                title="Ver foto selfie de salida"
                              >
                                <img
                                  src={r.checkOut.photoUrl}
                                  alt="Selfie"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Horas Netas */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {r.totalWorkMinutes !== undefined && r.totalWorkMinutes > 0 ? (
                          `${Math.floor(r.totalWorkMinutes / 60)}h ${r.totalWorkMinutes % 60}m`
                        ) : (
                          <span className="text-slate-400 font-normal">En curso</span>
                        )}
                      </td>

                      {/* Validación (GPS / Biometría / Dispositivo) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {r.checkIn?.location && (
                            <a
                              href={`https://www.google.com/maps?q=${r.checkIn.location.lat},${r.checkIn.location.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-rose-500 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title={`Ubicación GPS: ${r.checkIn.location.lat.toFixed(4)}, ${r.checkIn.location.lng.toFixed(4)}`}
                            >
                              <MapPin className="w-4 h-4" />
                            </a>
                          )}
                          {r.checkIn?.isBiometric && (
                            <span
                              className="text-indigo-500 p-1"
                              title="Validado biométricamente con huella/FaceID"
                            >
                              <Fingerprint className="w-4 h-4" />
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                            {r.checkIn?.deviceInfo || 'Web'}
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lightbox para inspección de Selfie de Marcación */}
      {inspectPhotoUrl && (
        <div
          onClick={() => setInspectPhotoUrl(null)}
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-3 shadow-2xl">
            <img
              src={inspectPhotoUrl}
              alt="Inspección de marcación"
              className="w-full aspect-4/3 object-cover rounded-2xl"
            />
            <button
              type="button"
              onClick={() => setInspectPhotoUrl(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition cursor-pointer shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="p-3 text-center">
              <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                Foto Selfie Registrada al Marcar
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
