import React, { useState, useEffect } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  CheckCircle2,
  Calendar,
  Sparkles,
  UserCheck,
  AlertCircle,
  MapPin,
  Camera,
  Fingerprint,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import {
  AttendanceRecord,
  AttendanceActionType,
  AttendanceStamp,
  HrGlobalSettings,
  EmployeeProfile,
} from '../../../../../../shared/types';
import { AttendanceRegisterModal } from '../../../modals/AttendanceRegisterModal';
import { useApp } from '../../../../../context/AppContext';

interface AttendanceActionWidgetProps {
  onRefreshHistory?: () => void;
  mode?: 'interactive' | 'info_only';
  onNavigateToDashboard?: () => void;
}

export const AttendanceActionWidget: React.FC<AttendanceActionWidgetProps> = ({
  onRefreshHistory,
  mode = 'interactive',
  onNavigateToDashboard,
}) => {
  const { user, apiFetch, toast } = useApp();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [hrSettings, setHrSettings] = useState<HrGlobalSettings | undefined>(undefined);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeModalAction, setActiveModalAction] = useState<AttendanceActionType | null>(null);

  // Reloj digital en vivo con segundos
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTodayData = async () => {
    try {
      const data = await apiFetch<{
        record: AttendanceRecord | null;
        hrSettings: HrGlobalSettings;
        profile: EmployeeProfile | null;
      }>('/api/administration/hr/attendance/today');
      setTodayRecord(data.record);
      setHrSettings(data.hrSettings);
      setEmployeeProfile(data.profile);
    } catch (err) {
      console.warn('Error cargando asistencia de hoy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayData();
  }, []);

  const handleConfirmStamp = async (stamp: AttendanceStamp) => {
    if (!activeModalAction) return;
    try {
      const res = await apiFetch<{ record: AttendanceRecord }>(
        '/api/administration/hr/attendance/stamp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: activeModalAction,
            stamp,
          }),
        }
      );
      setTodayRecord(res.record);
      toast('¡Marcación registrada correctamente!', 'success');
      if (onRefreshHistory) onRefreshHistory();
    } catch (err: any) {
      toast(err.message || 'Error al guardar la marcación', 'error');
      throw err;
    }
  };

  const hasCheckIn = !!todayRecord?.checkIn;
  const hasBreakStart = !!todayRecord?.breakStart;
  const hasBreakEnd = !!todayRecord?.breakEnd;
  const hasCheckOut = !!todayRecord?.checkOut;

  const isCurrentlyOnBreak = hasBreakStart && !hasBreakEnd;

  const hours12 = currentTime.getHours() % 12 || 12;
  const minutesStr = String(currentTime.getMinutes()).padStart(2, '0');
  const secondsStr = String(currentTime.getSeconds()).padStart(2, '0');
  const ampm = currentTime.getHours() >= 12 ? 'p. m.' : 'a. m.';

  const dateFormatted = currentTime.toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Modo informativo exclusivo para vista de RRHH en Administración
  if (mode === 'info_only') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {String(hours12).padStart(2, '0')}:{minutesStr}:{secondsStr} {ampm}
              </span>
              <span className="text-xs text-slate-400 font-medium capitalize hidden sm:inline">
                • {dateFormatted}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hora oficial del sistema • Las marcaciones activas se registran desde el <strong>Dashboard</strong>.
            </p>
          </div>
        </div>

        {onNavigateToDashboard && (
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <span>Ir a marcar al Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // MODO INTERACTIVO LLAMATIVO FULL-WIDTH PARA EL DASHBOARD
  return (
    <>
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-7 md:p-8 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
        {/* Glow dinámico de fondo */}
        <div
          className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            isCurrentlyOnBreak
              ? 'bg-amber-500/10'
              : hasCheckOut
              ? 'bg-purple-500/10'
              : hasCheckIn
              ? 'bg-emerald-500/10'
              : 'bg-indigo-500/10'
          }`}
        />

        {/* Encabezado Superior del Widget: Estado de Jornada & Colaborador */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3.5">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500/30 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-xs">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {user?.name}
                </h3>
                {employeeProfile?.jobTitle && (
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {employeeProfile.jobTitle}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {employeeProfile?.entryTime && employeeProfile?.exitTime
                  ? `Jornada asignada: ${employeeProfile.entryTime} - ${employeeProfile.exitTime}`
                  : 'Horario estándar: 09:00 - 18:00'}
              </p>
            </div>
          </div>

          {/* Badge de Estado en Vivo */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span
              className={`px-3 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border shadow-2xs ${
                hasCheckOut
                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : isCurrentlyOnBreak
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 animate-pulse'
                  : hasCheckIn
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  hasCheckOut
                    ? 'bg-purple-500'
                    : isCurrentlyOnBreak
                    ? 'bg-amber-500'
                    : hasCheckIn
                    ? 'bg-emerald-500'
                    : 'bg-indigo-500'
                }`}
              />
              {hasCheckOut
                ? 'Jornada Finalizada'
                : isCurrentlyOnBreak
                ? 'En Horario de Refrigerio'
                : hasCheckIn
                ? 'Jornada en Curso'
                : 'Pendiente de Entrada'}
            </span>
          </div>
        </div>

        {/* Zona Central: Reloj Digital de Gran Escala y Botones de Acción */}
        <div className="py-6 sm:py-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          {/* Reloj Digital Grande y Elegante */}
          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Hora Oficial del Sistema
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {String(hours12).padStart(2, '0')}:{minutesStr}
                <span className="text-indigo-600 dark:text-indigo-400 text-3xl sm:text-4xl">
                  :{secondsStr}
                </span>
              </h2>
              <span className="text-sm sm:text-base font-extrabold text-slate-500 dark:text-slate-400 uppercase font-mono">
                {ampm}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 capitalize font-medium pt-1">
              {dateFormatted}
            </p>
          </div>

          {/* Cuadrícula de Botones de Marcación Rápida */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 flex-1 max-w-2xl">
            {/* BOTÓN 1: ENTRADA */}
            <button
              type="button"
              disabled={hasCheckIn}
              onClick={() => setActiveModalAction('check_in')}
              className={`p-4 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all duration-200 text-center relative overflow-hidden group cursor-pointer ${
                hasCheckIn
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 opacity-90 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                  hasCheckIn
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white/20 text-white group-hover:scale-110'
                }`}
              >
                <LogIn className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-black uppercase tracking-wider">
                  Entrada
                </span>
                <span className="text-[11px] font-mono font-bold opacity-90">
                  {hasCheckIn ? todayRecord?.checkIn?.time.slice(0, 5) : 'Marcar Ahora'}
                </span>
              </div>
              {hasCheckIn && (
                <span className="absolute top-2 right-2 text-[9px] font-black uppercase bg-emerald-500 text-white px-1.5 py-0.2 rounded-md">
                  Listo ✓
                </span>
              )}
            </button>

            {/* BOTÓN 2: INICIO REFRIGERIO */}
            <button
              type="button"
              disabled={!hasCheckIn || hasBreakStart || hasCheckOut}
              onClick={() => setActiveModalAction('break_start')}
              className={`p-4 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all duration-200 text-center relative overflow-hidden group cursor-pointer ${
                hasBreakStart
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 opacity-90 cursor-default'
                  : !hasCheckIn || hasCheckOut
                  ? 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border border-slate-200/40 dark:border-slate-800/60 cursor-not-allowed opacity-70'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                  hasBreakStart
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-white/20 text-white group-hover:scale-110'
                }`}
              >
                <Coffee className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-black uppercase tracking-wider">
                  Refrigerio
                </span>
                <span className="text-[11px] font-mono font-bold opacity-90">
                  {hasBreakStart ? todayRecord?.breakStart?.time.slice(0, 5) : 'Iniciar'}
                </span>
              </div>
              {hasBreakStart && (
                <span className="absolute top-2 right-2 text-[9px] font-black uppercase bg-amber-500 text-white px-1.5 py-0.2 rounded-md">
                  Marcado ✓
                </span>
              )}
            </button>

            {/* BOTÓN 3: FIN REFRIGERIO */}
            <button
              type="button"
              disabled={!hasBreakStart || hasBreakEnd || hasCheckOut}
              onClick={() => setActiveModalAction('break_end')}
              className={`p-4 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all duration-200 text-center relative overflow-hidden group cursor-pointer ${
                hasBreakEnd
                  ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 opacity-90 cursor-default'
                  : !hasBreakStart || hasCheckOut
                  ? 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border border-slate-200/40 dark:border-slate-800/60 cursor-not-allowed opacity-70'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                  hasBreakEnd
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'bg-white/20 text-white group-hover:scale-110'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-black uppercase tracking-wider">
                  Fin Refrigerio
                </span>
                <span className="text-[11px] font-mono font-bold opacity-90">
                  {hasBreakEnd ? todayRecord?.breakEnd?.time.slice(0, 5) : 'Retornar'}
                </span>
              </div>
              {hasBreakEnd && (
                <span className="absolute top-2 right-2 text-[9px] font-black uppercase bg-blue-500 text-white px-1.5 py-0.2 rounded-md">
                  Listo ✓
                </span>
              )}
            </button>

            {/* BOTÓN 4: SALIDA */}
            <button
              type="button"
              disabled={!hasCheckIn || hasCheckOut || isCurrentlyOnBreak}
              onClick={() => setActiveModalAction('check_out')}
              className={`p-4 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all duration-200 text-center relative overflow-hidden group cursor-pointer ${
                hasCheckOut
                  ? 'bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 text-purple-700 dark:text-purple-300 opacity-90 cursor-default'
                  : !hasCheckIn || isCurrentlyOnBreak
                  ? 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 border border-slate-200/40 dark:border-slate-800/60 cursor-not-allowed opacity-70'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg hover:-translate-y-1'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                  hasCheckOut
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    : 'bg-white/20 text-white group-hover:scale-110'
                }`}
              >
                <LogOut className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-black uppercase tracking-wider">
                  Salida
                </span>
                <span className="text-[11px] font-mono font-bold opacity-90">
                  {hasCheckOut ? todayRecord?.checkOut?.time.slice(0, 5) : 'Cerrar Día'}
                </span>
              </div>
              {hasCheckOut && (
                <span className="absolute top-2 right-2 text-[9px] font-black uppercase bg-purple-500 text-white px-1.5 py-0.2 rounded-md">
                  Cerrado ✓
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Barra Inferior Informativa de Validación y Tiempos */}
        {hasCheckIn && (
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <LogIn className="w-4 h-4 text-emerald-500" />
                Entrada: <strong className="text-slate-900 dark:text-white font-mono">{todayRecord?.checkIn?.time}</strong>
                {todayRecord?.status === 'late' && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200 dark:border-amber-800 ml-1">
                    Tardanza
                  </span>
                )}
                {todayRecord?.status === 'present' && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800 ml-1">
                    Puntual
                  </span>
                )}
              </span>

              {hasBreakStart && (
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <Coffee className="w-4 h-4 text-amber-500" />
                  Almuerzo: <strong className="text-slate-900 dark:text-white font-mono">{todayRecord?.breakStart?.time.slice(0, 5)}</strong>
                  {hasBreakEnd && ` - ${todayRecord?.breakEnd?.time.slice(0, 5)}`}
                  {todayRecord?.breakMinutes ? ` (${todayRecord.breakMinutes} min)` : ''}
                </span>
              )}

              {hasCheckOut && (
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                  <LogOut className="w-4 h-4 text-purple-500" />
                  Salida: <strong className="text-slate-900 dark:text-white font-mono">{todayRecord?.checkOut?.time}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {todayRecord?.checkIn?.photoUrl && (
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-indigo-500" /> Selfie verificado
                </span>
              )}

              {todayRecord?.checkIn?.location && (
                <a
                  href={`https://www.google.com/maps?q=${todayRecord.checkIn.location.lat},${todayRecord.checkIn.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500" /> Ver Ubicación
                </a>
              )}

              {todayRecord?.totalWorkMinutes !== undefined && todayRecord.totalWorkMinutes > 0 && (
                <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold font-mono text-[11px]">
                  Neto: {Math.floor(todayRecord.totalWorkMinutes / 60)}h{' '}
                  {todayRecord.totalWorkMinutes % 60}m
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Marcación con Selfie, GPS y Biometría */}
      {activeModalAction && (
        <AttendanceRegisterModal
          isOpen={!!activeModalAction}
          onClose={() => setActiveModalAction(null)}
          actionType={activeModalAction}
          hrSettings={hrSettings}
          userName={user?.name || 'Colaborador'}
          onConfirmStamp={handleConfirmStamp}
        />
      )}
    </>
  );
};
