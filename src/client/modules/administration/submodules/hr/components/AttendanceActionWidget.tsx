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

  // Modo informativo exclusivo para vista de RRHH en Administración (Estilo Apple macOS)
  if (mode === 'info_only') {
    return (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 rounded-[28px] p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-white/80 dark:ring-white/[0.05] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[20px] bg-slate-100/80 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-100 flex items-center justify-center shrink-0 shadow-inner">
            <Clock className="w-6 h-6 animate-pulse text-[#007AFF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tabular-nums tracking-tight font-sans">
                {String(hours12).padStart(2, '0')}:{minutesStr}
                <span className="text-slate-400 dark:text-slate-500 font-light text-base sm:text-lg">:{secondsStr}</span>
                <span className="ml-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{ampm}</span>
              </span>
              <span className="text-xs text-slate-400 font-medium capitalize hidden sm:inline">
                • {dateFormatted}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hora oficial del sistema • Marcaciones disponibles desde el <strong>Dashboard</strong>.
            </p>
          </div>
        </div>

        {onNavigateToDashboard && (
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold tracking-tight transition-all shadow-sm active:scale-95 flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <span>Ir a marcar al Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // MODO INTERACTIVO FULL-WIDTH ESTILO APPLE / MACOS PARA EL DASHBOARD
  return (
    <>
      <div className="w-full bg-white/80 dark:bg-[#1c1c1e]/85 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.12] rounded-[32px] p-6 sm:p-7 md:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/90 dark:ring-white/[0.06] relative overflow-hidden transition-all">
        {/* Glow sutil difuminado estilo Apple */}
        <div
          className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${
            isCurrentlyOnBreak
              ? 'bg-[#FF9500]/12 dark:bg-[#FF9500]/15'
              : hasCheckOut
              ? 'bg-[#AF52DE]/12 dark:bg-[#AF52DE]/15'
              : hasCheckIn
              ? 'bg-[#34C759]/12 dark:bg-[#34C759]/15'
              : 'bg-[#007AFF]/10 dark:bg-[#007AFF]/15'
          }`}
        />

        {/* Encabezado Superior macOS: Traffic Lights & Dynamic Island Pill */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            {/* macOS Window Controls (Traffic Lights) */}
            <div className="hidden sm:flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/40 shadow-xs inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/40 shadow-xs inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/40 shadow-xs inline-block" />
            </div>

            {/* Avatar estilo Apple Squircle */}
            <div className="relative">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-12 h-12 rounded-[18px] object-cover ring-2 ring-black/[0.06] dark:ring-white/10 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white font-bold text-lg flex items-center justify-center shadow-sm">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {/* Apple status mini dot */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-[#1c1c1e] ${
                  hasCheckOut
                    ? 'bg-[#AF52DE]'
                    : isCurrentlyOnBreak
                    ? 'bg-[#FF9500]'
                    : hasCheckIn
                    ? 'bg-[#34C759]'
                    : 'bg-slate-400'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
                  {user?.name}
                </h3>
                {employeeProfile?.jobTitle && (
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-black/[0.04] dark:bg-white/10 px-2.5 py-0.5 rounded-full border border-black/[0.06] dark:border-white/10">
                    {employeeProfile.jobTitle}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 font-normal">
                <Calendar className="w-3 h-3 opacity-70" />
                {employeeProfile?.entryTime && employeeProfile?.exitTime
                  ? `Jornada asignada: ${employeeProfile.entryTime} - ${employeeProfile.exitTime}`
                  : 'Horario estándar: 09:00 - 18:00'}
              </p>
            </div>
          </div>

          {/* Badge de Estado estilo Apple Dynamic Island */}
          <div className="self-start md:self-auto">
            <div className="bg-slate-950/90 dark:bg-black/95 text-white px-3.5 py-1.5 rounded-full border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.2)] flex items-center gap-2 backdrop-blur-md">
              <span
                className={`w-2 h-2 rounded-full relative flex items-center justify-center`}
              >
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                    hasCheckOut
                      ? 'bg-[#AF52DE]'
                      : isCurrentlyOnBreak
                      ? 'bg-[#FF9500]'
                      : hasCheckIn
                      ? 'bg-[#34C759]'
                      : 'bg-indigo-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    hasCheckOut
                      ? 'bg-[#AF52DE]'
                      : isCurrentlyOnBreak
                      ? 'bg-[#FF9500]'
                      : hasCheckIn
                      ? 'bg-[#34C759]'
                      : 'bg-indigo-400'
                  }`}
                />
              </span>
              <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-100 font-sans">
                {hasCheckOut
                  ? 'Jornada Finalizada'
                  : isCurrentlyOnBreak
                  ? 'En Refrigerio'
                  : hasCheckIn
                  ? 'Jornada en Curso'
                  : 'Pendiente de Entrada'}
              </span>
            </div>
          </div>
        </div>

        {/* Zona Central: Reloj Digital Apple & Control Center Buttons */}
        <div className="py-6 sm:py-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          {/* Reloj Digital Apple Widget */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-[11px] font-medium text-slate-600 dark:text-slate-300 border border-black/[0.04] dark:border-white/[0.06]">
              <Clock className="w-3.5 h-3.5 text-[#007AFF]" />
              <span>Hora Oficial del Sistema</span>
              <span className="text-slate-400 dark:text-slate-500">• GMT-5</span>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-slate-900 dark:text-white tabular-nums tracking-tight font-sans">
                {String(hours12).padStart(2, '0')}:{minutesStr}
                <span className="text-2xl sm:text-3xl font-light text-slate-400 dark:text-slate-500 ml-1">
                  :{secondsStr}
                </span>
              </h2>
              <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase bg-black/[0.04] dark:bg-white/10 px-2 py-0.5 rounded-md">
                {ampm}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 capitalize font-normal">
              {dateFormatted}
            </p>
          </div>

          {/* Cuadrícula de Botones estilo Apple Control Center */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5 flex-1 max-w-2xl">
            {/* BOTÓN 1: ENTRADA (Apple Green) */}
            <button
              type="button"
              disabled={hasCheckIn}
              onClick={() => setActiveModalAction('check_in')}
              className={`p-4 sm:p-4.5 rounded-[22px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 text-center relative overflow-hidden group cursor-pointer ${
                hasCheckIn
                  ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 cursor-default'
                  : 'bg-gradient-to-b from-[#34C759] to-[#2EBD50] hover:brightness-105 active:scale-[0.96] text-white shadow-[0_6px_20px_rgba(52,199,89,0.32)] border border-[#34C759]/60 ring-1 ring-inset ring-white/30'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-[16px] flex items-center justify-center transition-all ${
                  hasCheckIn
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white/20 text-white group-hover:scale-105 shadow-inner'
                }`}
              >
                <LogIn className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-semibold tracking-tight uppercase">
                  Entrada
                </span>
                <span className="text-[11px] font-mono font-medium opacity-90">
                  {hasCheckIn ? todayRecord?.checkIn?.time.slice(0, 5) : 'Marcar Ahora'}
                </span>
              </div>
              {hasCheckIn && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-semibold uppercase bg-emerald-500 text-white px-1.5 py-0.2 rounded-full shadow-2xs">
                  Listo ✓
                </span>
              )}
            </button>

            {/* BOTÓN 2: INICIO REFRIGERIO (Apple Orange/Amber) */}
            <button
              type="button"
              disabled={!hasCheckIn || hasBreakStart || hasCheckOut}
              onClick={() => setActiveModalAction('break_start')}
              className={`p-4 sm:p-4.5 rounded-[22px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 text-center relative overflow-hidden group cursor-pointer ${
                hasBreakStart
                  ? 'bg-amber-500/[0.08] dark:bg-amber-500/[0.12] border border-amber-500/25 text-amber-800 dark:text-amber-300 cursor-default'
                  : !hasCheckIn || hasCheckOut
                  ? 'bg-slate-100/60 dark:bg-white/[0.04] text-slate-400 dark:text-slate-600 border border-slate-200/50 dark:border-white/[0.06] cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-b from-[#FF9500] to-[#E68600] hover:brightness-105 active:scale-[0.96] text-white shadow-[0_6px_20px_rgba(255,149,0,0.32)] border border-[#FF9500]/60 ring-1 ring-inset ring-white/30'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-[16px] flex items-center justify-center transition-all ${
                  hasBreakStart
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-white/20 text-white group-hover:scale-105 shadow-inner'
                }`}
              >
                <Coffee className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-semibold tracking-tight uppercase">
                  Refrigerio
                </span>
                <span className="text-[11px] font-mono font-medium opacity-90">
                  {hasBreakStart ? todayRecord?.breakStart?.time.slice(0, 5) : 'Iniciar'}
                </span>
              </div>
              {hasBreakStart && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-semibold uppercase bg-amber-500 text-white px-1.5 py-0.2 rounded-full shadow-2xs">
                  Listo ✓
                </span>
              )}
            </button>

            {/* BOTÓN 3: FIN REFRIGERIO (Apple Blue) */}
            <button
              type="button"
              disabled={!hasBreakStart || hasBreakEnd || hasCheckOut}
              onClick={() => setActiveModalAction('break_end')}
              className={`p-4 sm:p-4.5 rounded-[22px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 text-center relative overflow-hidden group cursor-pointer ${
                hasBreakEnd
                  ? 'bg-blue-500/[0.08] dark:bg-blue-500/[0.12] border border-blue-500/25 text-blue-800 dark:text-blue-300 cursor-default'
                  : !hasBreakStart || hasCheckOut
                  ? 'bg-slate-100/60 dark:bg-white/[0.04] text-slate-400 dark:text-slate-600 border border-slate-200/50 dark:border-white/[0.06] cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-b from-[#007AFF] to-[#006EE5] hover:brightness-105 active:scale-[0.96] text-white shadow-[0_6px_20px_rgba(0,122,255,0.32)] border border-[#007AFF]/60 ring-1 ring-inset ring-white/30'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-[16px] flex items-center justify-center transition-all ${
                  hasBreakEnd
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    : 'bg-white/20 text-white group-hover:scale-105 shadow-inner'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-semibold tracking-tight uppercase">
                  Retorno
                </span>
                <span className="text-[11px] font-mono font-medium opacity-90">
                  {hasBreakEnd ? todayRecord?.breakEnd?.time.slice(0, 5) : 'Finalizar'}
                </span>
              </div>
              {hasBreakEnd && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-semibold uppercase bg-blue-500 text-white px-1.5 py-0.2 rounded-full shadow-2xs">
                  Listo ✓
                </span>
              )}
            </button>

            {/* BOTÓN 4: SALIDA (Apple Purple/Indigo) */}
            <button
              type="button"
              disabled={!hasCheckIn || hasCheckOut || isCurrentlyOnBreak}
              onClick={() => setActiveModalAction('check_out')}
              className={`p-4 sm:p-4.5 rounded-[22px] flex flex-col items-center justify-center gap-2.5 transition-all duration-200 text-center relative overflow-hidden group cursor-pointer ${
                hasCheckOut
                  ? 'bg-purple-500/[0.08] dark:bg-purple-500/[0.12] border border-purple-500/25 text-purple-800 dark:text-purple-300 cursor-default'
                  : !hasCheckIn || isCurrentlyOnBreak
                  ? 'bg-slate-100/60 dark:bg-white/[0.04] text-slate-400 dark:text-slate-600 border border-slate-200/50 dark:border-white/[0.06] cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-b from-[#5856D6] to-[#4F4DC4] hover:brightness-105 active:scale-[0.96] text-white shadow-[0_6px_20px_rgba(88,86,214,0.32)] border border-[#5856D6]/60 ring-1 ring-inset ring-white/30'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-[16px] flex items-center justify-center transition-all ${
                  hasCheckOut
                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                    : 'bg-white/20 text-white group-hover:scale-105 shadow-inner'
                }`}
              >
                <LogOut className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-semibold tracking-tight uppercase">
                  Salida
                </span>
                <span className="text-[11px] font-mono font-medium opacity-90">
                  {hasCheckOut ? todayRecord?.checkOut?.time.slice(0, 5) : 'Cerrar Día'}
                </span>
              </div>
              {hasCheckOut && (
                <span className="absolute top-2.5 right-2.5 text-[9px] font-semibold uppercase bg-purple-500 text-white px-1.5 py-0.2 rounded-full shadow-2xs">
                  Listo ✓
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Barra Inferior Informativa estilo macOS Dock / Toolstrip */}
        {hasCheckIn && (
          <div className="mt-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-black/[0.03] dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-black/[0.04] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                <LogIn className="w-3.5 h-3.5 text-[#34C759]" />
                Entrada: <strong className="text-slate-900 dark:text-white font-mono">{todayRecord?.checkIn?.time}</strong>
                {todayRecord?.status === 'late' && (
                  <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 ml-1">
                    Tardanza
                  </span>
                )}
                {todayRecord?.status === 'present' && (
                  <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ml-1">
                    Puntual
                  </span>
                )}
              </span>

              {hasBreakStart && (
                <span className="bg-black/[0.03] dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-black/[0.04] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                  <Coffee className="w-3.5 h-3.5 text-[#FF9500]" />
                  Refrigerio: <strong className="text-slate-900 dark:text-white font-mono">{todayRecord?.breakStart?.time.slice(0, 5)}</strong>
                  {hasBreakEnd && ` - ${todayRecord?.breakEnd?.time.slice(0, 5)}`}
                  {todayRecord?.breakMinutes ? ` (${todayRecord.breakMinutes} min)` : ''}
                </span>
              )}

              {hasCheckOut && (
                <span className="bg-black/[0.03] dark:bg-white/[0.06] px-3 py-1.5 rounded-full border border-black/[0.04] dark:border-white/[0.08] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                  <LogOut className="w-3.5 h-3.5 text-[#5856D6]" />
                  Salida: <strong className="text-slate-900 dark:text-white font-mono">{todayRecord?.checkOut?.time}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {todayRecord?.checkIn?.photoUrl && (
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-black/[0.03] dark:bg-white/[0.06] px-2.5 py-1 rounded-full border border-black/[0.04] dark:border-white/[0.08] flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-[#007AFF]" /> Selfie verificado
                </span>
              )}

              {todayRecord?.checkIn?.location && (
                <a
                  href={`https://www.google.com/maps?q=${todayRecord.checkIn.location.lat},${todayRecord.checkIn.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-medium text-[#007AFF] hover:underline bg-[#007AFF]/10 dark:bg-[#007AFF]/15 px-2.5 py-1 rounded-full border border-[#007AFF]/20 flex items-center gap-1"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#FF3B30]" /> GPS Verificado
                </a>
              )}

              {todayRecord?.totalWorkMinutes !== undefined && todayRecord.totalWorkMinutes > 0 && (
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold font-mono text-[11px] shadow-xs">
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
