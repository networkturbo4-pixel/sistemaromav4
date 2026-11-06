import React from 'react';
import {
  Sliders,
  Utensils,
  Clock,
  Camera,
  MapPin,
  Fingerprint,
  ShieldCheck,
  Edit2,
  Calendar,
} from 'lucide-react';
import { HrGlobalSettings } from '../../../../../shared/types';

interface HrSettingsViewProps {
  settings: HrGlobalSettings;
  onOpenEditSettings: () => void;
}

export const HrSettingsView: React.FC<HrSettingsViewProps> = ({
  settings,
  onOpenEditSettings,
}) => {
  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn">
      {/* Tarjeta de Encabezado */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 inline-block mb-1.5">
            Políticas de Empresa
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Configuración Global de Recursos Humanos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Establece los parámetros que rigen a toda la organización: horarios de refrigerio,
            tolerancias para el cómputo de tardanzas y requisitos biométricos/satelitales.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenEditSettings}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
        >
          <Edit2 className="w-4 h-4" />
          Modificar Parámetros
        </button>
      </div>

      {/* Grid de Parámetros Activos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PARÁMETRO: REFRIGERIO */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Horario de Refrigerio / Almuerzo
              </h3>
              <p className="text-[11px] text-slate-500">Pausa diaria reglamentaria</p>
            </div>
          </div>

          <div className="pt-2 space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Horario oficial:</span>
              <strong className="text-slate-900 dark:text-white font-mono">
                {settings.lunchStartTime} - {settings.lunchEndTime}
              </strong>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Duración asignada:</span>
              <strong className="text-slate-900 dark:text-white">
                {settings.lunchDurationMinutes} minutos
              </strong>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Descuento de jornada:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Automático en cálculo neto
              </span>
            </div>
          </div>
        </div>

        {/* PARÁMETRO: HORARIO BASE & TOLERANCIA */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Horario Base & Tolerancia
              </h3>
              <p className="text-[11px] text-slate-500">Márgenes para colaboradores</p>
            </div>
          </div>

          <div className="pt-2 space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Entrada estándar:</span>
              <strong className="text-slate-900 dark:text-white font-mono">
                {settings.defaultEntryTime}
              </strong>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Salida estándar:</span>
              <strong className="text-slate-900 dark:text-white font-mono">
                {settings.defaultExitTime}
              </strong>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Margen de tolerancia:</span>
              <strong className="text-amber-600 dark:text-amber-400">
                {settings.toleranceMinutes} minutos tras la hora
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLES DE SEGURIDAD Y AUDITORÍA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Protocolos de Validación en Cada Marcación
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-pink-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                Foto Selfie
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                settings.requirePhoto
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}
            >
              {settings.requirePhoto ? 'Requerido' : 'Opcional'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                Ubicación Satelital
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                settings.requireLocation
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}
            >
              {settings.requireLocation ? 'Requerido' : 'Opcional'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                Sensor Biométrico
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                settings.allowBiometrics
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}
            >
              {settings.allowBiometrics ? 'Habilitado' : 'Desactivado'}
            </span>
          </div>
        </div>
      </div>

      {/* BLOQUEO ESTRICTO POR TARDANZA Y GOOGLE AUTHENTICATOR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Bloqueo Total por Tardanza & Google Authenticator
              </h3>
              <p className="text-[11px] text-slate-500">
                Seguridad reforzada: si el personal excede la tolerancia, el sistema se bloquea por completo.
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
              settings.strictTardinessLock
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {settings.strictTardinessLock ? 'Bloqueo Activo' : 'Inactivo'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Estado de Google Authenticator
            </span>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  settings.authenticatorSecret ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className="text-xs font-black text-slate-800 dark:text-white">
                {settings.authenticatorSecret
                  ? 'Vinculado y sincronizado (RFC 6238 TOTP)'
                  : 'Sin vincular aún'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {settings.authenticatorSecret
                ? 'Solo el código dinámico de la app del Administrador permite el desbloqueo del colaborador tardío.'
                : 'Configúralo en "Modificar Parámetros" para generar el QR oficial.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Comportamiento al Exceder Tolerancia
            </span>
            <p className="text-xs font-bold text-slate-800 dark:text-white">
              {settings.strictTardinessLock
                ? 'Bloqueo total de pantalla en cualquier dispositivo.'
                : 'Se registra tardanza pero se permite ingreso ordinario.'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Tolerancia asignada: <strong className="text-purple-600 dark:text-purple-400">{settings.toleranceMinutes} min</strong> después de la hora oficial ({settings.defaultEntryTime}).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
