import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  MapPin,
  Lock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Clock,
  KeyRound,
  AlertTriangle,
  X,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AttendanceStamp, AttendanceRecord } from '../shared/types';

interface AttendanceGateModalProps {
  isOpen: boolean;
  onSuccess: (record: AttendanceRecord) => void;
  onLogout: () => void;
}

export const AttendanceGateModal: React.FC<AttendanceGateModalProps> = ({
  isOpen,
  onSuccess,
  onLogout,
}) => {
  const { user, tenant, apiFetch, toast } = useApp();

  const [loading, setLoading] = useState(true);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [isOutsideTolerance, setIsOutsideTolerance] = useState(false);
  const [strictLockActive, setStrictLockActive] = useState(false);
  const [expectedTime, setExpectedTime] = useState('09:00');
  const [toleranceMinutes, setToleranceMinutes] = useState(15);

  // Cámara y Foto
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Ubicación GPS
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Google Authenticator Código
  const [authenticatorCode, setAuthenticatorCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Reloj digital en vivo
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('es-PE', { hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Verificar estado de asistencia al abrir
  const checkStatus = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        record: AttendanceRecord | null;
        hrSettings: any;
        profile: any;
      }>('/api/administration/hr/attendance/today');

      const hasCheckIn = !!data.record?.checkIn;
      setAlreadyCheckedIn(hasCheckIn);

      if (hasCheckIn) {
        // Ya marcó hoy, pasar de largo
        onSuccess(data.record!);
        return;
      }

      const exp = data.profile?.entryTime || data.hrSettings?.defaultEntryTime || '09:00';
      const tol = data.hrSettings?.toleranceMinutes ?? 15;
      const strict = !!data.hrSettings?.strictTardinessLock;

      setExpectedTime(exp);
      setToleranceMinutes(tol);
      setStrictLockActive(strict);

      // Evaluar hora actual
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const [expH, expM] = exp.split(':').map(Number);
      const limitMins = expH * 60 + expM + tol;

      if (currentMins > limitMins && strict) {
        setIsOutsideTolerance(true);
      } else {
        setIsOutsideTolerance(false);
      }

      startCamera();
      requestLocation();
    } catch (err) {
      console.warn('Error verificando asistencia:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Error cámara:', err);
      setCameraError('Cámara bloqueada o no disponible. Puedes subir una foto.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoDataUrl(url);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setPhotoDataUrl(null);
    startCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoDataUrl(event.target?.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalización no soportada');
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          address: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        });
        setLocationLoading(false);
      },
      (err) => {
        setLocationError('Permiso de ubicación satelital requerido');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 1. Registro regular si está dentro de tolerancia
  const handleRegularCheckIn = async () => {
    if (!photoDataUrl) {
      alert('Debes tomarte una foto selfie antes de ingresar al sistema.');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-PE', { hour12: false });
      const stamp: AttendanceStamp = {
        timestamp: now.toISOString(),
        time: timeStr,
        photoUrl: photoDataUrl,
        location: location || undefined,
        deviceInfo: navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Escritorio',
      };

      const res = await apiFetch<{ record: AttendanceRecord }>(
        '/api/administration/hr/attendance/stamp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_in', stamp }),
        }
      );

      toast('¡Asistencia registrada con éxito! Bienvenido al sistema.', 'success');
      onSuccess(res.record);
    } catch (err: any) {
      toast(err.message || 'Error al registrar asistencia', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Desbloqueo mediante Google Authenticator si está fuera de tolerancia
  const handleUnlockWithAuthenticator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(authenticatorCode.trim())) {
      setCodeError('El código debe tener exactamente 6 dígitos numéricos');
      return;
    }
    if (!photoDataUrl) {
      alert('Debes capturar tu foto selfie para registrar la tardanza autorizada.');
      return;
    }

    setIsVerifyingCode(true);
    setCodeError(null);

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-PE', { hour12: false });
      const stamp: AttendanceStamp = {
        timestamp: now.toISOString(),
        time: timeStr,
        photoUrl: photoDataUrl,
        location: location || undefined,
        deviceInfo: navigator.userAgent.includes('Mobile') ? 'Móvil' : 'Escritorio',
      };

      const res = await apiFetch<{ record: AttendanceRecord; unlocked: boolean }>(
        '/api/administration/hr/attendance/unlock-late',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authenticatorCode: authenticatorCode.trim(),
            stamp,
          }),
        }
      );

      toast('¡Código de Google Authenticator verificado! Acceso desbloqueado.', 'success');
      onSuccess(res.record);
    } catch (err: any) {
      setCodeError(err.message || 'Código de Google Authenticator incorrecto o expirado.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Bloquear scroll de fondo mientras esté activo
  useEffect(() => {
    if (!isOpen || alreadyCheckedIn) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, alreadyCheckedIn]);

  if (!isOpen || alreadyCheckedIn) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        {/* CABECERA: MODALIDAD DE ACCESO O BLOQUEO TOTAL */}
        <div
          className={`p-5 text-white flex items-center justify-between ${
            isOutsideTolerance
              ? 'bg-rose-600'
              : 'bg-emerald-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              {isOutsideTolerance ? (
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                {isOutsideTolerance ? 'Bloqueo Estricto de Seguridad' : 'Registro de Jornada Obligatorio'}
              </span>
              <h2 className="text-lg font-black leading-tight mt-0.5">
                {isOutsideTolerance
                  ? 'Acceso Bloqueado por Tardanza'
                  : 'Registra tu Asistencia para Ingresar'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition text-xs font-bold flex items-center gap-1 cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Reloj y Datos de Horario */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Hora Oficial
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                {currentTimeStr}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Hora Entrada Pactada
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                {expectedTime} (Tol: +{toleranceMinutes}m)
              </span>
            </div>
          </div>

          {/* MENSAJE CRÍTICO SI ESTÁ FUERA DE TOLERANCIA */}
          {isOutsideTolerance ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-black text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Límite de tolerancia excedido</span>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed">
                El sistema se encuentra bloqueado totalmente. No puedes acceder desde este ni ningún
                otro dispositivo. Solicita al <strong>Administrador</strong> el código dinámico de 6
                dígitos de su aplicación <strong>Google Authenticator</strong> para autorizar tu ingreso.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Para validar tu jornada laboral, captura tu foto selfie y confirma tu ubicación GPS.
            </p>
          )}

          {/* FOTO SELFIE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-500" />
                Foto Selfie Obligatoria *
              </span>
              {photoDataUrl && (
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Tomar otra
                </button>
              )}
            </div>

            <div className="relative w-full aspect-video sm:aspect-4/3 bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center">
              {photoDataUrl ? (
                <img src={photoDataUrl} alt="Selfie" className="w-full h-full object-cover rounded-2xl" />
              ) : isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute bottom-3 inset-x-0 flex justify-center">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-4 py-2 bg-white text-slate-900 rounded-full font-black text-xs shadow-lg flex items-center gap-1.5 hover:scale-105 transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-indigo-600" /> Capturar Foto
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-slate-400 space-y-2">
                  <Camera className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">{cameraError || 'Iniciando cámara...'}</p>
                  <label className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1">
                    <span>Subir selfie</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* UBICACIÓN GPS */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Ubicación GPS
                </span>
                <span className="text-[11px] text-slate-400">
                  {location
                    ? `Coordenadas: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                    : locationError || 'Obteniendo señal GPS...'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={requestLocation}
              disabled={locationLoading}
              className="text-[11px] font-bold text-indigo-600 hover:underline"
            >
              {locationLoading ? 'Detectando...' : 'Reintentar'}
            </button>
          </div>

          {/* CAMPO DE GOOGLE AUTHENTICATOR SI ESTÁ BLOQUEADO POR TARDANZA */}
          {isOutsideTolerance && (
            <form onSubmit={handleUnlockWithAuthenticator} className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 text-white space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  Código de 6 dígitos Google Authenticator
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    placeholder="000000"
                    value={authenticatorCode}
                    onChange={(e) => setAuthenticatorCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-widest text-2xl font-mono font-black py-2.5 px-4 rounded-xl bg-slate-800 border border-slate-600 text-white outline-hidden focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                    required
                  />
                </div>

                {codeError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {codeError}
                  </p>
                )}

                <p className="text-[11px] text-slate-400">
                  Pide este código en tiempo real al administrador de la agencia.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cerrar Sesión
                </button>

                <button
                  type="submit"
                  disabled={isVerifyingCode || !photoDataUrl || authenticatorCode.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingCode ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  <span>Desbloquear y Entrar</span>
                </button>
              </div>
            </form>
          )}

          {/* BOTÓN REGULAR SI ESTÁ DENTRO DE TOLERANCIA */}
          {!isOutsideTolerance && (
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cerrar Sesión
              </button>

              <button
                type="button"
                onClick={handleRegularCheckIn}
                disabled={loading || !photoDataUrl}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Entrada y Entrar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
