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
  Zap,
  RefreshCw,
  Save,
  Bot,
  HelpCircle,
  Cpu,
  Layers,
} from 'lucide-react';

export const ConnectionsSettingsTab: React.FC = () => {
  const { apiFetch, showToast, tenant } = useApp();

  const [geminiApiKey, setGeminiApiKey] = useState('');
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
  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const data = await apiFetch<{
          config: {
            hasCustomKey: boolean;
            maskedKey: string;
            preferredModel: string;
            isActive: boolean;
          };
          status: 'connected' | 'unconfigured';
          usingEnvFallback: boolean;
        }>('/api/romita/config');

        if (isMounted) {
          if (data.config.maskedKey) {
            setGeminiApiKey(data.config.maskedKey);
          }
          if (data.config.preferredModel) {
            setPreferredModel(data.config.preferredModel);
          }
          setIsActive(data.config.isActive);
          setStatus(data.status);
        }
      } catch (err) {
        console.error('Error cargando configuración de conexiones:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, [apiFetch]);

  const parseFriendlyError = (err: any): string => {
    let msg = err?.message || String(err || '');
    try {
      const parsed = typeof msg === 'string' && msg.trim().startsWith('{') ? JSON.parse(msg) : null;
      if (parsed?.error?.message) {
        msg = parsed.error.message;
      }
    } catch {}

    if (msg.includes('CONSUMER_SUSPENDED') || msg.includes('has been suspended')) {
      return 'El proyecto de Google Cloud de esta API Key ha sido suspendido por Google (cuenta de prueba expirada o bloqueada). Por favor genera una nueva API Key en Google AI Studio (aistudio.google.com/app/apikey) con otra cuenta de Google activa.';
    }
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      return 'La API Key ingresada no es válida. Copia la clave completa desde Google AI Studio (comienza con "AIzaSy...").';
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
      return 'Límite de cuota de Gemini alcanzado temporalmente. Espera unos minutos antes de reintentar.';
    }
    return msg;
  };

  // Probar conexión en vivo
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await apiFetch<{
        ok: boolean;
        latencyMs: number;
        message: string;
      }>('/api/romita/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: geminiApiKey,
          model: preferredModel,
        }),
      });

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
      showToast(friendly, 'error', { duration: 8000 });
    } finally {
      setIsTesting(false);
    }
  };

  // Guardar configuración
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await apiFetch('/api/romita/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiApiKey,
          preferredModel,
          isActive,
        }),
      });

      showToast('Configuración de Conexiones guardada correctamente.', 'success');
      setStatus(geminiApiKey ? 'connected' : 'unconfigured');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

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
                : 'Motor Local Activo'}
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
            <span>Obtener API Key Gratis</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Input API Key */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold block" style={{ color: 'var(--app-text)' }}>
            Gemini API Key
          </label>
          <div className="relative flex items-center">
            <input
              type={showKey ? 'text' : 'password'}
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-mono transition focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              style={{
                backgroundColor: 'var(--app-bg)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
              title={showKey ? 'Ocultar clave' : 'Mostrar clave'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--app-muted)' }}>
            Tu clave se almacena de forma segura en la base de datos de tu espacio tenant y se enmascara para proteger tu privacidad.
          </p>
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
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Recomendado - Ultrarrápido y 1M Tokens)</option>
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Mayor velocidad y bajo costo)</option>
              <option value="gemini-4-argon">Gemini 4 Argon (Razonamiento complejo)</option>
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
            disabled={isTesting || !geminiApiKey}
            onClick={handleTestConnection}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-2 hover:bg-slate-500/10 disabled:opacity-50"
            style={{
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Probando conexión...' : 'Probar Conexión con Gemini'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveConfig}
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
