import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { TenantDriveConfig, DriveConnectionStatus } from '../../shared/types';
import {
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  KeyRound,
  FileCode,
  ShieldCheck,
  ExternalLink,
  Info,
  Folder,
  Mail,
  Lock,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export const GoogleDriveSettingsTab: React.FC = () => {
  const { token, showToast, tenant } = useApp();
  const notify = showToast || ((msg: string) => console.log(msg));

  const [authType, setAuthType] = useState<TenantDriveConfig['authType']>('service_account_json');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [rootFolderId, setRootFolderId] = useState('');

  // Estados de conexión y carga
  const [status, setStatus] = useState<DriveConnectionStatus | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<DriveConnectionStatus | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Cargar configuración actual desde el servidor
  const loadConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch('/api/drive/config', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status) setStatus(data.status);
        if (data.config) {
          const cfg = data.config;
          setAuthType(cfg.authType || 'service_account_json');
          setServiceAccountJson(cfg.serviceAccountJson || '');
          setServiceAccountEmail(cfg.serviceAccountEmail || '');
          setPrivateKey(cfg.privateKey || '');
          setClientId(cfg.clientId || '');
          setClientSecret(cfg.clientSecret || '');
          setRefreshToken(cfg.refreshToken || '');
          setRootFolderId(cfg.rootFolderId || '');
        }
      }
    } catch (err: any) {
      notify('Error cargando configuración de Google Drive: ' + err.message, 'error');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const handleOAuthAuthorize = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const cleanClientId = clientId.trim();
    const cleanSecret = clientSecret.trim();

    if (!cleanClientId || !cleanSecret) {
      notify('Ingresa el Client ID y Client Secret antes de autorizar con Google.', 'warning');
      return;
    }

    setIsAuthorizing(true);
    try {
      const origin = window.location.origin;
      const redirectUri = `${origin}/api/drive/oauth/callback`;
      const query = new URLSearchParams({
        clientId: cleanClientId,
        clientSecret: cleanSecret,
        origin,
        redirectUri,
      });

      const res = await fetch(`/api/drive/oauth/authorize?${query.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión OAuth');
      }

      if (data.authUrl) {
        const width = 560;
        const height = 680;
        const left = Math.max(0, (window.innerWidth - width) / 2 + window.screenX);
        const top = Math.max(0, (window.innerHeight - height) / 2 + window.screenY);

        const popup = window.open(
          data.authUrl,
          'GoogleOAuthWindow',
          `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
        );

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          // Si el navegador bloqueó la ventana emergente, redirigir en la pestaña actual
          window.location.href = data.authUrl;
        }
      }
    } catch (err: any) {
      notify(err.message, 'error');
      setIsAuthorizing(false);
    }
  };

  useEffect(() => {
    loadConfig();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ROMA_GOOGLE_OAUTH_SUCCESS') {
        const email = event.data.email || 'tu cuenta Google';
        notify(`¡Cuenta ${email} conectada con éxito mediante OAuth 2.0!`, 'success');
        setIsAuthorizing(false);
        loadConfig();
      } else if (event.data?.type === 'ROMA_GOOGLE_OAUTH_ERROR') {
        notify(`Error al conectar con Google: ${event.data.error || 'Acceso denegado'}`, 'error');
        setIsAuthorizing(false);
      }
    };

    window.addEventListener('message', handleMessage);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('oauth') === 'success') {
        const email = urlParams.get('email') || 'tu cuenta Google';
        notify(`¡Cuenta ${decodeURIComponent(email)} conectada con éxito mediante OAuth 2.0!`, 'success');
        window.history.replaceState({}, '', window.location.pathname + '?module=settings&tab=drive');
        loadConfig();
      } else if (urlParams.get('oauth') === 'error') {
        const msg = urlParams.get('msg') || 'No se pudo completar la autorización.';
        notify(`Error al vincular cuenta Google: ${decodeURIComponent(msg)}`, 'error');
        window.history.replaceState({}, '', window.location.pathname + '?module=settings&tab=drive');
      }
    } catch {}

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Auto-parsear JSON cuando el usuario pega el archivo de Service Account
  const handleJsonChange = (text: string) => {
    setServiceAccountJson(text);
    if (!text.trim()) return;

    try {
      const parsed = JSON.parse(text.trim());
      if (parsed.client_email) {
        setServiceAccountEmail(parsed.client_email);
      }
      if (parsed.private_key) {
        setPrivateKey(parsed.private_key);
      }
    } catch {
      // Ignorar si aún no termina de pegar o es inválido
    }
  };

  // Preparar payload de configuración
  const buildPayload = (): Partial<TenantDriveConfig> => {
    return {
      authType,
      serviceAccountJson: authType === 'service_account_json' ? serviceAccountJson.trim() : undefined,
      serviceAccountEmail:
        authType === 'service_account_fields'
          ? serviceAccountEmail.trim()
          : authType === 'service_account_json'
          ? serviceAccountEmail.trim()
          : undefined,
      privateKey:
        authType === 'service_account_fields'
          ? privateKey.trim()
          : authType === 'service_account_json'
          ? privateKey.trim()
          : undefined,
      clientId: authType === 'oauth2' ? clientId.trim() : undefined,
      clientSecret: authType === 'oauth2' ? clientSecret.trim() : undefined,
      refreshToken: authType === 'oauth2' ? refreshToken.trim() : undefined,
      rootFolderId: rootFolderId.trim() || undefined,
    };
  };

  // Probar conexión sin guardar
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const payload = buildPayload();
      const res = await fetch('/api/drive/config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setTestResult(data);

      if (data.connected) {
        showToast(
          `¡Conexión Exitosa con Google Drive! Carpeta detectada: "${data.rootFolderName || 'Mi Unidad'}"`,
          'success'
        );
      } else {
        showToast(`Error de conexión: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast('Error al probar conexión: ' + err.message, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Guardar configuración en el sistema
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = buildPayload();
      const res = await fetch('/api/drive/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar la configuración.');
      }

      setStatus(data.status);
      setTestResult(data.status);
      if (data.warning) {
        showToast(
          `Datos guardados. Aviso de Google: ${data.error || 'Verifica permisos de cuenta.'}`,
          'warning'
        );
      } else {
        showToast('¡Configuración de Google Drive guardada y activada con éxito!', 'success');
      }
      loadConfig();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar la configuración', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-7">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Google Drive & Cloud APIs
              </h2>
              {status?.connected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Conectado & Activo
                </span>
              ) : status?.configured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="w-3 h-3" /> Error de Conexión
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Info className="w-3 h-3" /> No Configurado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Conecta tu cuenta central de Google Drive para permitir subidas directas de 300MB a 1GB+ y creación automática de carpetas.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          {showGuide ? 'Ocultar Guía' : 'Ver Guía Paso a Paso'}
        </button>
      </div>

      {/* GUÍA INTERACTIVA PASO A PASO */}
      {showGuide && (
        <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
          <h4 className="font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            ¿Cómo obtener tus credenciales en Google Cloud Console en 5 minutos?
          </h4>
          <ol className="list-decimal list-inside space-y-2 pl-1 leading-relaxed">
            <li>
              Entra a{' '}
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-indigo-600 dark:text-indigo-400 underline inline-flex items-center gap-0.5"
              >
                Google Cloud Console <ExternalLink className="w-3 h-3" />
              </a>{' '}
              y crea o selecciona un proyecto (ej: <em>Roma Agencia Drive</em>).
            </li>
            <li>
              Ve a <strong>APIs & Servicios &gt; Biblioteca</strong>, busca <strong>Google Drive API</strong> y haz clic en <strong>Habilitar</strong>.
            </li>
            <li>
              Ve a <strong>APIs & Servicios &gt; Credenciales</strong>, haz clic en <strong>Crear Credenciales &gt; Cuenta de Servicio (Service Account)</strong>.
            </li>
            <li>
              Asígnale un nombre (ej: <code>agencia-roma-service</code>), finaliza la creación y luego haz clic en la cuenta creada &gt; pestaña <strong>Claves &gt; Agregar Clave &gt; Crear Clave Nueva (JSON)</strong>.
            </li>
            <li>
              Se descargará un archivo <code>.json</code>. Abre ese archivo, copia todo su texto y pégalo en la opción <strong>"Google Service Account (Pegar archivo JSON)"</strong> abajo.
            </li>
            <li>
              <strong className="text-amber-600 dark:text-amber-400 font-bold">Paso Clave:</strong> En tu Google Drive, crea una carpeta (ej: <em>SISTEMA ROMA</em>), haz clic derecho en ella &gt; <strong>Compartir</strong> y agrega el correo de la cuenta de servicio (terminado en <code>@...gserviceaccount.com</code>) con rol de <strong>Editor</strong>. Pega el ID de esa carpeta abajo.
            </li>
          </ol>
        </div>
      )}

      {/* ESTADO ACTUAL Y TARJETA INFORMATIVA */}
      {status && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Estado de la API
            </span>
            <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              {status.connected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Operativo & Sincronizado
                </>
              ) : status.configured ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Error al conectar
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Pendiente de credenciales
                </>
              )}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Cuenta Conectada
            </span>
            <span className="font-mono text-slate-700 dark:text-slate-300 truncate block" title={status.accountEmail}>
              {status.accountEmail || 'Sin cuenta vinculada'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Carpeta Raíz en Drive
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              {status.rootFolderName || 'Mi Unidad'}
            </span>
          </div>
        </div>
      )}

      {/* FORMULARIO DE CONFIGURACIÓN */}
      <form onSubmit={handleSaveConfig} className="space-y-6">
        {/* Selector de Método de Autenticación */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            1. Método de Conexión con Google Drive
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setAuthType('service_account_json')}
              className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                authType === 'service_account_json'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/30'
                  : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileCode className="w-4 h-4 text-amber-500" />
                {authType === 'service_account_json' && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </div>
              <span className="text-xs font-extrabold mt-1">Service Account (JSON)</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Pega directamente el archivo .json descargado (Recomendado).
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAuthType('service_account_fields')}
              className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                authType === 'service_account_fields'
                  ? 'bg-indigo-500/10 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/30'
                  : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <KeyRound className="w-4 h-4 text-indigo-500" />
                {authType === 'service_account_fields' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
              <span className="text-xs font-extrabold mt-1">Campos Individuales</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Ingresa el correo y la clave privada manualmente.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAuthType('oauth2')}
              className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                authType === 'oauth2'
                  ? 'bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/30'
                  : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Lock className="w-4 h-4 text-purple-500" />
                {authType === 'oauth2' && <Check className="w-3.5 h-3.5 text-purple-600" />}
              </div>
              <span className="text-xs font-extrabold mt-1">OAuth 2.0 Central</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Client ID, Secret y Refresh Token de la agencia.
              </span>
            </button>
          </div>
        </div>

        {/* CAMPOS SEGÚN EL MÉTODO */}
        {authType === 'service_account_json' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-amber-500" />
                Contenido JSON de la Cuenta de Servicio
              </label>
              {serviceAccountEmail && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-xs">
                  Email detectado: {serviceAccountEmail}
                </span>
              )}
            </div>
            <textarea
              rows={6}
              required
              placeholder={`{\n  "type": "service_account",\n  "project_id": "mi-proyecto",\n  "client_email": "cuenta@mi-proyecto.iam.gserviceaccount.com",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n..."\n}`}
              value={serviceAccountJson}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-slate-400">
              Al pegar el archivo JSON descargado, el sistema auto-detectará el correo y la clave privada de forma segura.
            </p>
          </div>
        )}

        {authType === 'service_account_fields' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Correo de la Cuenta de Servicio (Client Email)
              </label>
              <input
                type="email"
                required
                placeholder="ej: agencia-drive@mi-proyecto.iam.gserviceaccount.com"
                value={serviceAccountEmail}
                onChange={(e) => setServiceAccountEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Clave Privada (Private Key)
              </label>
              <textarea
                rows={4}
                required
                placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {authType === 'oauth2' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Client ID de OAuth 2.0
                </label>
                <input
                  type="text"
                  required
                  placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Client Secret
                </label>
                <input
                  type="text"
                  required
                  placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* TARJETA DE CONEXIÓN OAUTH 1-CLIC */}
            <div className="p-4 bg-purple-50/80 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Vincular Cuenta de Google Personal (1 Clic)
                </p>
                <p className="text-[11px] text-purple-700 dark:text-purple-300">
                  Ingresa tu Client ID y Secret arriba, y haz clic en este botón para autorizar tu Google Drive personal automáticamente sin copiar tokens a mano.
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  <strong>Paso previo en Google Cloud Console:</strong> en tu ID de cliente de OAuth, agrega en <em>URIs de redireccionamiento autorizados</em>:{' '}
                  <code className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-[10px] select-all font-mono">
                    http://localhost:5173/api/drive/oauth/callback
                  </code>
                </p>
              </div>

              <button
                type="button"
                onClick={handleOAuthAuthorize}
                disabled={!clientId.trim() || !clientSecret.trim() || isAuthorizing}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                {isAuthorizing ? 'Abriendo Google...' : 'Autorizar con Google (1 Clic)'}
              </button>
            </div>

            {/* Opción avanzada de token manual si ya lo tiene */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Refresh Token (Opcional si usaste el botón de 1 Clic arriba)
              </label>
              <input
                type="text"
                placeholder="1//xxxxxxxxxxxxxxxxxxxx (Se autocompleta con el botón de 1 Clic)"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        {/* CAMPO DE CARPETA RAÍZ DE GOOGLE DRIVE */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            2. ID de la Carpeta Raíz en Google Drive (Recomendado)
          </label>
          <div className="relative">
            <Folder className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" />
            <input
              type="text"
              placeholder="Ej: 1AbCdEfGhIjKlMnOpQrStUvWxYz (Dejar vacío para usar Mi Unidad)"
              value={rootFolderId}
              onChange={(e) => setRootFolderId(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Puedes obtener el ID de la URL de tu carpeta en el navegador:{' '}
            <code>drive.google.com/drive/folders/<strong>1AbCdEfGhIjKlMnOpQrStUvWxYz</strong></code>.
          </p>
        </div>

        {/* RESULTADO DE LA PRUEBA EN VIVO */}
        {testResult && (
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
              testResult.connected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
            }`}
          >
            {testResult.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-extrabold">
                {testResult.connected ? '¡Prueba Exitosa!' : 'Fallo en la prueba de conexión'}
              </p>
              <p className="text-[11px] opacity-90">
                {testResult.connected
                  ? `Se estableció comunicación con Google Drive. Carpeta raíz accesible: "${testResult.rootFolderName}". Puedes guardar los cambios ahora.`
                  : testResult.error}
              </p>
            </div>
          </div>
        )}

        {/* BOTONES DE ACCIÓN */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                Probando Conexión...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-indigo-500" />
                Probar Conexión con Google Drive
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={isSaving || isTesting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/25 transition-all"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Guardando y Activando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Configuración
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
