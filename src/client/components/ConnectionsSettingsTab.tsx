import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Bot,
  Cpu,
  Trash2,
  Check,
  Info,
} from 'lucide-react';

interface AiConfigResponse {
  hasCustomKey: boolean;
  maskedKey: string;
  keyPrefix: string;
  keySuffix: string;
  preferredModel: string;
  isActive: boolean;
  updatedAt?: string | null;
}

export const ConnectionsSettingsTab: React.FC = () => {
  const { apiFetch, showToast } = useApp();

  // Configuración guardada en el servidor
  const [savedConfig, setSavedConfig] = useState<AiConfigResponse>({
    hasCustomKey: false,
    maskedKey: '',
    keyPrefix: '',
    keySuffix: '',
    preferredModel: 'gemini-3.8-flash',
    isActive: true,
    updatedAt: null,
  });

  // Campos del formulario
  const [newApiKey, setNewApiKey] = useState('');
  const [preferredModel, setPreferredModel] = useState('gemini-3.8-flash');
  const [isActive, setIsActive] = useState(true);
  const [showKey, setShowKey] = useState(false);

  // Estados de carga y prueba
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<'connected' | 'unconfigured' | 'error'>('unconfigured');
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Cargar configuración de conexiones
  const loadConfig = async () => {
    try {
      const data = await apiFetch<{
        config: AiConfigResponse;
        status: 'connected' | 'unconfigured';
        usingEnvFallback: boolean;
      }>('/api/romita/config');

      if (data?.config) {
        setSavedConfig(data.config);
        if (data.config.preferredModel) {
          setPreferredModel(data.config.preferredModel);
        }
        setIsActive(data.config.isActive);
        setStatus(data.status);
      }
    } catch (err) {
      console.error('Error cargando configuración de conexiones:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const parseFriendlyError = (err: any): string => {
    let msg = err?.message || String(err || '');
    try {
      const parsed = typeof msg === 'string' && msg.trim().startsWith('{') ? JSON.parse(msg) : null;
      if (parsed?.error?.message) {
        msg = parsed.error.message;
      }
    } catch {}

    if (msg.includes('CONSUMER_SUSPENDED') || msg.includes('has been suspended')) {
      return 'El proyecto de Google Cloud asociado a esta clave ha sido suspendido por Google. Genera una nueva API Key en Google AI Studio (aistudio.google.com/app/apikey) con otra cuenta de Google.';
    }
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      return 'La API Key ingresada no es válida. Copia la clave completa desde Google AI Studio (inicia con "AIzaSy...").';
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
      return 'Límite de cuota de Gemini alcanzado temporalmente. Espera unos momentos antes de reintentar.';
    }
    if (msg.includes('is no longer available to new users')) {
      return 'Ese modelo ya no está disponible para cuentas nuevas. Selecciona Gemini 3.8 Flash o 3.5 Flash Lite.';
    }
    return msg;
  };

  // Probar conexión en vivo
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Si el usuario escribió una clave nueva en el input, probamos esa.
      // Si no, enviamos vacío para probar la clave ya guardada en base de datos.
      const keyToSend = newApiKey.trim();

      const res = await apiFetch<{
        ok: boolean;
        latencyMs?: number;
        message?: string;
        error?: string;
      }>('/api/romita/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: keyToSend || undefined,
          model: preferredModel,
        }),
      });

      if (!res.ok) {
        const friendly = parseFriendlyError(res.error);
        setTestResult({
          ok: false,
          message: friendly,
        });
        setStatus('error');
        showToast(friendly, 'warning', { duration: 7000 });
        return;
      }

      setTestResult({
        ok: true,
        message: res.message || 'Conexión con Gemini verificada con éxito.',
        latencyMs: res.latencyMs,
      });
      setStatus('connected');
      showToast('¡Conexión con Gemini exitosa!', 'success');
    } catch (err: any) {
      const friendly = parseFriendlyError(err);
      setTestResult({
        ok: false,
        message: friendly,
      });
      setStatus('error');
      showToast(friendly, 'warning', { duration: 7000 });
    } finally {
      setIsTesting(false);
    }
  };

  // Guardar configuración
  const handleSaveConfig = async (overrideKey?: string) => {
    setIsSaving(true);
    try {
      const keyToSend = overrideKey !== undefined ? overrideKey : (newApiKey.trim() || undefined);

      const res = await apiFetch<{
        success: boolean;
        message: string;
        config?: AiConfigResponse;
        status?: 'connected' | 'unconfigured';
      }>('/api/romita/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiApiKey: keyToSend,
          preferredModel,
          isActive,
        }),
      });

      if (res.config) {
        setSavedConfig(res.config);
        setStatus(res.status || (res.config.hasCustomKey ? 'connected' : 'unconfigured'));
      } else {
        await loadConfig();
      }

      setNewApiKey('');
      showToast(
        keyToSend === '__REMOVE__'
          ? 'API Key eliminada correctamente.'
          : 'Configuración de Conexiones guardada con éxito.',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Error al guardar configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!window.confirm('¿Deseas desvincular la API Key de Gemini guardada?')) return;
    await handleSaveConfig('__REMOVE__');
  };

  const isFormatAIzaSy = newApiKey.trim().startsWith('AIzaSy');
  const isSuspiciousOAuth = newApiKey.trim().startsWith('AQ.');
  const hasInput = newApiKey.trim().length > 0;
  const canTest = hasInput || savedConfig.hasCustomKey;

  return (
    <div className="space-y-6">
      {/* TARJETA PRINCIPAL DE CABECERA */}
      <div
        className="rounded-2xl border p-5 sm:p-6 transition-colors shadow-xs"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-500 flex items-center justify-center shrink-0 border border-sky-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="font-bold text-base sm:text-lg"
                  style={{ color: 'var(--app-text)' }}
                >
                  Conexiones & APIs de Inteligencia Artificial
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                  GEMINI AI
                </span>
              </div>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--app-muted)' }}>
                Configura los tokens de integración para Romita AI y modelos de lenguaje de Google.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                status === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : status === 'error'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : status === 'error'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
              {status === 'connected'
                ? 'Gemini Conectado'
                : status === 'error'
                ? 'Error de Token'
                : 'Sin Configurar (Motor Local)'}
            </span>
          </div>
        </div>

        {/* MÉTRICAS / RESUMEN RÁPIDO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-[var(--app-border)]">
          <div
            className="p-3.5 rounded-xl border flex items-center gap-3"
            style={{
              backgroundColor: 'var(--app-bg)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium block truncate" style={{ color: 'var(--app-muted)' }}>
                Agente ROMA
              </span>
              <span className="text-xs font-bold block truncate" style={{ color: 'var(--app-text)' }}>
                Romita Copilot (Ctrl + J)
              </span>
            </div>
          </div>

          <div
            className="p-3.5 rounded-xl border flex items-center gap-3"
            style={{
              backgroundColor: 'var(--app-bg)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium block truncate" style={{ color: 'var(--app-muted)' }}>
                Modelo Predeterminado
              </span>
              <span className="text-xs font-bold block truncate" style={{ color: 'var(--app-text)' }}>
                {preferredModel} (1M Tokens)
              </span>
            </div>
          </div>

          <div
            className="p-3.5 rounded-xl border flex items-center gap-3"
            style={{
              backgroundColor: 'var(--app-bg)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium block truncate" style={{ color: 'var(--app-muted)' }}>
                Aprobación de Acciones
              </span>
              <span className="text-xs font-bold block truncate text-emerald-600 dark:text-emerald-400">
                Human-in-the-Loop Activo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FORMULARIO DE CREDENCIALES GEMINI */}
      <div
        className="rounded-2xl border p-5 sm:p-6 transition-colors shadow-xs space-y-5"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)]">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-sky-500" />
            <h4 className="font-bold text-sm" style={{ color: 'var(--app-text)' }}>
              Credencial de Google Gemini API
            </h4>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>Obtener API Key en AI Studio</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* ESTADO DE CLAVE GUARDADA ACTUAL */}
        {savedConfig.hasCustomKey ? (
          <div
            className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{
              backgroundColor: 'var(--app-bg)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-bold" style={{ color: 'var(--app-text)' }}>
                  Clave Activa Guardada en Base de Datos:
                </span>
                <code className="text-xs font-mono px-2 py-0.5 rounded bg-slate-500/10 text-sky-600 dark:text-sky-400 font-bold">
                  {savedConfig.maskedKey || `${savedConfig.keyPrefix}••••${savedConfig.keySuffix}`}
                </code>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
                {savedConfig.updatedAt
                  ? `Guardada el ${new Date(savedConfig.updatedAt).toLocaleString('es-ES')}`
                  : 'Sincronizada con el espacio de trabajo.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRemoveKey}
              className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1.5 self-start sm:self-auto font-medium px-2 py-1 rounded-lg hover:bg-rose-500/10 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Desvincular clave</span>
            </button>
          </div>
        ) : (
          <div
            className="p-4 rounded-xl border border-dashed flex items-center gap-3 text-xs"
            style={{
              backgroundColor: 'var(--app-bg)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-muted)',
            }}
          >
            <Info className="w-4 h-4 text-sky-500 shrink-0" />
            <span>
              Aún no tienes una API Key personalizada guardada. Pega a continuación tu clave obtenida en <strong>Google AI Studio</strong> para activar todas las capacidades de Romita.
            </span>
          </div>
        )}

        {/* Input API Key Nueva */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold block" style={{ color: 'var(--app-text)' }}>
            {savedConfig.hasCustomKey ? 'Reemplazar por una nueva API Key' : 'Ingresa tu Gemini API Key'}
          </label>
          <div className="relative flex items-center">
            <input
              type={showKey ? 'text' : 'password'}
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder={savedConfig.hasCustomKey ? 'Pega aquí una nueva clave para reemplazar la actual (ej: AIzaSy...)' : 'Pega aquí tu clave de AI Studio (ej: AIzaSy...)'}
              className="w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-mono transition focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              style={{
                backgroundColor: 'var(--app-bg)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)',
              }}
            />
            {newApiKey && (
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
                title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Retroalimentación en vivo sobre la clave ingresada */}
          {hasInput && (
            <div className="pt-1">
              {isFormatAIzaSy ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Formato reconocido de Google AI Studio (comienza con AIzaSy).</span>
                </div>
              ) : isSuspiciousOAuth ? (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Esta clave parece un token OAuth (inicia con AQ...). Las API Keys de AI Studio inician con &quot;AIzaSy...&quot;.</span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">
                  Longitud: {newApiKey.trim().length} caracteres.
                </div>
              )}
            </div>
          )}

          {!hasInput && savedConfig.hasCustomKey && (
            <p className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
              Deja este campo en blanco para conservar la clave activa guardada actualmente.
            </p>
          )}
        </div>

        {/* Selector de Modelo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold block" style={{ color: 'var(--app-text)' }}>
              Modelo de Inteligencia Artificial
            </label>
            <select
              value={preferredModel}
              onChange={(e) => setPreferredModel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              style={{
                backgroundColor: 'var(--app-bg)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)',
              }}
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Recomendado - Multimodal y 1M Tokens)</option>
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Ultra Rápido y Alta Frecuencia)</option>
              <option value="gemini-4-argon">Gemini 4 Argon (Razonamiento Complejo)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold block" style={{ color: 'var(--app-text)' }}>
              Estado del Agente Romita
            </label>
            <div className="flex items-center gap-3 pt-1">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500" />
              </label>
              <span className="text-xs font-medium" style={{ color: 'var(--app-text)' }}>
                {isActive ? 'Habilitado en todo el SaaS' : 'Pausado'}
              </span>
            </div>
          </div>
        </div>

        {/* ALERTA DE RESULTADO DE PRUEBA */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
              testResult.ok
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            )}
            <div className="space-y-0.5">
              <span className="font-bold block">
                {testResult.ok ? 'Prueba exitosa' : 'Fallo en la prueba'}
              </span>
              <p>{testResult.message}</p>
            </div>
          </div>
        )}

        {/* BOTONES DE ACCIÓN: PROBAR Y GUARDAR */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-[var(--app-border)]">
          <button
            type="button"
            disabled={isTesting || !canTest}
            onClick={handleTestConnection}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 hover:bg-slate-500/10 disabled:opacity-50"
            style={{
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Probando conexión...' : hasInput ? 'Probar Clave Escrita' : 'Probar Conexión Guardada'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveConfig()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
            style={{
              backgroundColor: 'var(--app-primary)',
            }}
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Guardando...' : 'Guardar Conexión'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
