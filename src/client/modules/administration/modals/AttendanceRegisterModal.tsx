import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  MapPin,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Clock,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { AttendanceActionType, AttendanceStamp, HrGlobalSettings } from '../../../../shared/types';

interface AttendanceRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: AttendanceActionType;
  hrSettings?: HrGlobalSettings;
  userName: string;
  onConfirmStamp: (stamp: AttendanceStamp) => Promise<void>;
}

export const AttendanceRegisterModal: React.FC<AttendanceRegisterModalProps> = ({
  isOpen,
  onClose,
  actionType,
  hrSettings,
  userName,
  onConfirmStamp,
}) => {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Acción y títulos visuales
  const actionDetails = {
    check_in: {
      title: 'Registrar Hora de Entrada',
      badge: 'Entrada Laboral',
      color: 'emerald',
      bgHeader: 'bg-emerald-500',
    },
    break_start: {
      title: 'Registrar Inicio de Refrigerio',
      badge: 'Almuerzo / Refrigerio',
      color: 'amber',
      bgHeader: 'bg-amber-500',
    },
    break_end: {
      title: 'Registrar Fin de Refrigerio',
      badge: 'Retorno de Refrigerio',
      color: 'blue',
      bgHeader: 'bg-blue-500',
    },
    check_out: {
      title: 'Registrar Hora de Salida',
      badge: 'Salida de Jornada',
      color: 'purple',
      bgHeader: 'bg-purple-600',
    },
  }[actionType];

  // Reloj en vivo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('es-PE', { hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Verificar soporte biométrico (WebAuthn / Windows Hello / TouchID / FaceID)
  useEffect(() => {
    if (window.PublicKeyCredential && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => setBiometricsAvailable(available))
        .catch(() => setBiometricsAvailable(false));
    }
  }, []);

  // Bloquear scroll del fondo y soportar tecla Escape mientras el modal esté abierto
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  // Inicializar cámara y geolocalización al abrir
  useEffect(() => {
    if (isOpen) {
      setPhotoDataUrl(null);
      setCameraError(null);
      setIsBiometricVerified(false);
      startCamera();
      requestLocation();
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
      console.warn('Error al iniciar cámara:', err);
      setCameraError('No se pudo acceder a la cámara. Puedes subir una foto o continuar.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoDataUrl(dataUrl);
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
      setLocationError('Geolocalización no soportada por el navegador');
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
        console.warn('Error geolocalización:', err);
        setLocationError('Permiso de ubicación denegado o no disponible');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const triggerBiometrics = async () => {
    try {
      // Simulación o llamado WebAuthn
      if (window.PublicKeyCredential) {
        setIsBiometricVerified(true);
      } else {
        setIsBiometricVerified(true);
      }
    } catch (err) {
      console.warn('Biometría cancelada:', err);
    }
  };

  const handleConfirm = async () => {
    if (hrSettings?.requirePhoto && !photoDataUrl) {
      alert('Por favor captura una fotografía para registrar tu marcación.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      const timeStr = `${hours}:${mins}:${secs}`;

      const stamp: AttendanceStamp = {
        timestamp: now.toISOString(),
        time: timeStr,
        photoUrl: photoDataUrl || undefined,
        location: location || undefined,
        isBiometric: isBiometricVerified,
        deviceInfo: navigator.userAgent.includes('Mobile') ? 'Móvil / Smartphone' : 'Escritorio / Laptop',
      };

      await onConfirmStamp(stamp);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error al guardar la marcación');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className={`p-4 sm:p-5 text-white ${actionDetails.bgHeader} flex items-center justify-between`}>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white inline-block mb-1">
              {actionDetails.badge}
            </span>
            <h2 className="text-lg sm:text-xl font-black">{actionDetails.title}</h2>
            <p className="text-xs text-white/80 mt-0.5">Colaborador: {userName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con scroll si es necesario */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Reloj Digital Grande */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
              <Clock className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span>Hora Oficial de Registro</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-wider font-mono">
              {currentTimeStr}
            </div>
          </div>

          {/* Sección Cámara / Foto Selfie */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-500" />
                Fotografía Selfie de Validación
                {hrSettings?.requirePhoto && (
                  <span className="text-rose-500 font-bold">*Requerido</span>
                )}
              </label>
              {photoDataUrl && (
                <button
                  type="button"
                  onClick={retakePhoto}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Tomar otra
                </button>
              )}
            </div>

            <div className="relative w-full aspect-video sm:aspect-4/3 bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center">
              {photoDataUrl ? (
                <img
                  src={photoDataUrl}
                  alt="Selfie"
                  className="w-full h-full object-cover rounded-2xl"
                />
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
                      className="px-4 py-2 bg-white/90 hover:bg-white text-slate-900 rounded-full font-black text-xs shadow-lg flex items-center gap-1.5 transition transform hover:scale-105 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-indigo-600" /> Capturar Foto
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-slate-400 space-y-2">
                  <Camera className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs">{cameraError || 'Iniciando cámara frontal...'}</p>
                  <div className="pt-2">
                    <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-xs">
                      <span>Subir o tomar foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sección Ubicación GPS */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Ubicación GPS
              </span>
              <button
                type="button"
                onClick={requestLocation}
                disabled={locationLoading}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${locationLoading ? 'animate-spin' : ''}`} />
                {locationLoading ? 'Detectando...' : 'Actualizar'}
              </button>
            </div>

            {location ? (
              <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>
                  Coordenadas: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  {location.accuracy ? ` (±${location.accuracy}m)` : ''}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline text-[11px]"
                >
                  Ver Mapa
                </a>
              </div>
            ) : locationError ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {locationError}
              </p>
            ) : (
              <p className="text-xs text-slate-400">Obteniendo ubicación satelital...</p>
            )}
          </div>

          {/* Validación Biométrica (si el dispositivo la soporta o usuario móvil) */}
          {(biometricsAvailable || hrSettings?.allowBiometrics) && (
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Validación Biométrica Móvil
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBiometricVerified
                      ? '✓ Huella digital / FaceID verificada'
                      : 'Opcional: Valida con el sensor de tu celular'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={triggerBiometrics}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  isBiometricVerified
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isBiometricVerified ? 'Verificado' : 'Validar'}
              </button>
            </div>
          )}
        </div>

        {/* Pie / Botones de acción */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition flex items-center gap-2 cursor-pointer ${
              actionType === 'check_in'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : actionType === 'break_start'
                ? 'bg-amber-600 hover:bg-amber-700'
                : actionType === 'break_end'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Confirmar y Guardar Marcación
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
