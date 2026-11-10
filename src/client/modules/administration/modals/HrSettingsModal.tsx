import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sliders,
  Utensils,
  Clock,
  Camera,
  MapPin,
  Fingerprint,
  ShieldCheck,
  Check,
  QrCode,
  KeyRound,
  ShieldAlert,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { HrGlobalSettings, DEFAULT_HR_SETTINGS } from '../../../../shared/types';

interface HrSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: HrGlobalSettings | null;
  onSave: (settings: Partial<HrGlobalSettings>) => Promise<void>;
}

export const HrSettingsModal: React.FC<HrSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const { apiFetch, toast } = useApp();
  const [formData, setFormData] = useState<HrGlobalSettings>(DEFAULT_HR_SETTINGS);
  const [saving, setSaving] = useState(false);

  // Estados de Google Authenticator
  const [showQrSetup, setShowQrSetup] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [tempSecret, setTempSecret] = useState<string | null>(null);
  const [testCode, setTestCode] = useState('');
  const [verifyingTotp, setVerifyingTotp] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings, isOpen]);

  const handleStartTotpSetup = async () => {
    setLoadingSetup(true);
    try {
      const data = await apiFetch<{
        secret: string;
        qrCodeDataUrl: string;
        otpAuthUri: string;
        configured: boolean;
      }>('/api/administration/hr/authenticator/setup', {
        method: 'POST',
      });
      setTempSecret(data.secret);
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setShowQrSetup(true);
    } catch (err: any) {
      toast(err.message || 'Error al iniciar configuración de Google Authenticator', 'error');
    } finally {
      setLoadingSetup(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!/^\d{6}$/.test(testCode.trim())) {
      toast('Ingresa un código numérico de 6 dígitos generado por tu app Google Authenticator', 'warning');
      return;
    }
    if (!tempSecret) return;

    setVerifyingTotp(true);
    try {
      await apiFetch('/api/administration/hr/authenticator/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: testCode.trim(),
          secret: tempSecret,
        }),
      });

      setFormData((prev) => ({
        ...prev,
        authenticatorSecret: tempSecret,
        strictTardinessLock: true,
      }));
      setShowQrSetup(false);
      setTestCode('');
      toast('¡Google Authenticator verificado y vinculado exitosamente!', 'success');
    } catch (err: any) {
      toast(err.message || 'Código incorrecto. Verifica la hora de tu celular.', 'error');
    } finally {
      setVerifyingTotp(false);
    }
  };

  const handleCopySecret = () => {
    if (tempSecret) {
      navigator.clipboard.writeText(tempSecret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast('Clave secreta copiada al portapapeles', 'info');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // Bloquear scroll del fondo y soportar tecla Escape mientras el modal esté abierto
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 inline-block mb-1">
              Configuración Global de RRHH
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Reglas de Asistencia & Horarios
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configura los horarios de refrigerio, tolerancia a tardanzas y validaciones de seguridad.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* 1. Refrigerio / Almuerzo */}
          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Hora y Duración de Refrigerio
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Inicio de Refrigerio
                </label>
                <input
                  type="time"
                  value={formData.lunchStartTime}
                  onChange={(e) => setFormData({ ...formData, lunchStartTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Fin de Refrigerio
                </label>
                <input
                  type="time"
                  value={formData.lunchEndTime}
                  onChange={(e) => setFormData({ ...formData, lunchEndTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Duración (Minutos)
                </label>
                <input
                  type="number"
                  min="15"
                  step="5"
                  value={formData.lunchDurationMinutes}
                  onChange={(e) => setFormData({ ...formData, lunchDurationMinutes: parseInt(e.target.value) || 60 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-hidden"
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. Horario por Defecto y Tolerancia */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              Horario General & Margen de Tolerancia
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Entrada General
                </label>
                <input
                  type="time"
                  value={formData.defaultEntryTime}
                  onChange={(e) => setFormData({ ...formData, defaultEntryTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Salida General
                </label>
                <input
                  type="time"
                  value={formData.defaultExitTime}
                  onChange={(e) => setFormData({ ...formData, defaultExitTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Tolerancia (Minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={formData.toleranceMinutes}
                  onChange={(e) => setFormData({ ...formData, toleranceMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  required
                />
                <span className="text-[10px] text-slate-400">Minutos antes de contar tardanza</span>
              </div>
            </div>
          </div>

          {/* 3. Validaciones de Seguridad y Controles */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Controles de Marcación Requeridos
            </h3>

            {/* Selfie Requerido */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Fotografía Selfie Obligatoria
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Exige al colaborador capturar una foto con la cámara al registrar su asistencia.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.requirePhoto}
                onChange={(e) => setFormData({ ...formData, requirePhoto: e.target.checked })}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Ubicación GPS Requerida */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Ubicación Satelital (GPS) Obligatoria
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Captura las coordenadas y precisión satelital del punto exacto donde marca.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.requireLocation}
                onChange={(e) => setFormData({ ...formData, requireLocation: e.target.checked })}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Biometría */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Permitir Validación Biométrica en Celular
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Habilita el sensor de huella digital y FaceID para validar la identidad en móvil.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.allowBiometrics}
                onChange={(e) => setFormData({ ...formData, allowBiometrics: e.target.checked })}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 4. Bloqueo Estricto de Tardanza & Google Authenticator (TOTP) */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                    Bloqueo Estricto por Tardanza
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bloquea al colaborador si supera la hora + tolerancia hasta que ingrese el código TOTP.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.strictTardinessLock}
                onChange={(e) => setFormData({ ...formData, strictTardinessLock: e.target.checked })}
                className="w-5 h-5 rounded-md text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </div>

            {/* Configuración Google Authenticator */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    Google Authenticator del Administrador
                  </span>
                </div>
                {formData.authenticatorSecret ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Sincronizado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    Pendiente
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Al habilitarse el bloqueo estricto, el colaborador no podrá ingresar ni desde otro dispositivo ni recargando la página. Deberá solicitarte el código de 6 dígitos de tu aplicación Google Authenticator para desbloquear su acceso.
              </p>

              {!showQrSetup ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartTotpSetup}
                    disabled={loadingSetup}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    {formData.authenticatorSecret
                      ? 'Ver Código QR / Reconfigurar App'
                      : 'Vincular Google Authenticator'}
                  </button>
                  {formData.authenticatorSecret && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          authenticatorSecret: undefined,
                          strictTardinessLock: false,
                        }))
                      }
                      className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition cursor-pointer"
                    >
                      Desvincular
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-purple-200/80 dark:border-purple-800/60 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-purple-600" />
                      Escanear con Google Authenticator
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQrSetup(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {qrCodeDataUrl ? (
                      <div className="p-2 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
                        <img
                          src={qrCodeDataUrl}
                          alt="Código QR Google Authenticator"
                          className="w-40 h-40 object-contain rounded-xl"
                        />
                      </div>
                    ) : (
                      <div className="w-40 h-40 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-400">
                        Generando QR...
                      </div>
                    )}

                    <div className="space-y-2 text-xs flex-1">
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                        <li>Abre <strong>Google Authenticator</strong> en tu teléfono.</li>
                        <li>Toca el botón <strong>+</strong> y selecciona <strong>Escanear un código QR</strong>.</li>
                        <li>Apunta al código de la izquierda o introduce la clave manual.</li>
                      </ol>

                      {tempSecret && (
                        <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
                          <span className="truncate select-all">{tempSecret}</span>
                          <button
                            type="button"
                            onClick={handleCopySecret}
                            className="p-1 hover:text-purple-600 text-slate-400 ml-2"
                            title="Copiar clave secreta"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input de confirmación */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                      Ingresa el código de 6 dígitos que muestra tu app para confirmar:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        pattern="\d*"
                        placeholder="Ej. 123456"
                        value={testCode}
                        onChange={(e) => setTestCode(e.target.value.replace(/\D/g, ''))}
                        className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-mono tracking-widest text-base font-extrabold focus:ring-2 focus:ring-purple-500 outline-hidden w-36"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyTotp}
                        disabled={verifyingTotp || testCode.length !== 6}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {verifyingTotp ? 'Verificando...' : 'Confirmar y Vincular'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pie */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
