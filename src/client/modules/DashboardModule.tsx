import React, { useEffect, useState } from 'react';
import { useApp, PermissionGate } from '../context/AppContext';
import { Client } from '../../shared/types';
import { ActiveModule } from '../components/AppShell';
import {
  Users,
  Tags,
  ShieldCheck,
  UserCheck,
  Plus,
  Palette,
  Building2,
  ArrowUpRight,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Coins,
  Layers,
  ArrowRight,
} from 'lucide-react';

import { SettingsTab } from './SettingsModule';

interface DashboardProps {
  onNavigate: (mod: ActiveModule, subTab?: SettingsTab) => void;
}

export const DashboardModule: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, role, tenant, apiFetch, can } = useApp();
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    activeClients: 0,
    totalBrands: 0,
    activeUsers: 0,
    totalRoles: 0,
  });
  const [recentClients, setRecentClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const clientPlural = tenant.customization.clientGlobalNamePlural || 'Clientes';
  const clientSingular = tenant.customization.clientGlobalNameSingular || 'Cliente';

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiFetch('/api/dashboard/summary')
      .then((res) => {
        if (!mounted) return;
        setMetrics(res.metrics);
        setRecentClients(res.recentClients || []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [apiFetch]);

  const formatWhatsAppUrl = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return `https://wa.me/${digits}`;
  };

  return (
    <div className="space-y-6">
      {/* BANNER PRINCIPAL ELEVADO */}
      <section className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workspace Activo • {tenant.companyInfo.commercialName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Hola, {user?.name.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Gestiona tu cartera de <strong>{clientPlural.toLowerCase()}</strong>, sus marcas
              comerciales asignadas, la identidad visual y los permisos granulares de tu agencia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PermissionGate permission="clients.create">
              <button
                type="button"
                onClick={() => onNavigate('clients')}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo {clientSingular} / Marca</span>
              </button>
            </PermissionGate>

            <PermissionGate permission="services.view">
              <button
                type="button"
                onClick={() => onNavigate('services')}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 shadow-md flex items-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Servicios de Agencia</span>
              </button>
            </PermissionGate>

            <PermissionGate permission="settings.view">
              <button
                type="button"
                onClick={() => onNavigate('settings', 'appearance')}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer"
              >
                <Palette className="w-4 h-4 text-indigo-500" />
                <span>Personalizar Sistema</span>
              </button>
            </PermissionGate>
          </div>
        </div>
      </section>

      {/* TARJETAS KPI CON ICONOS EN CONTENEDORES TINTADOS */}
      <PermissionGate permission="dashboard.metrics">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => can('clients.view') && onNavigate('clients')}
            className="cursor-pointer group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-indigo-500/40 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {loading ? '...' : metrics.totalClients}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              {clientPlural} Registrados
            </p>
          </div>

          <div
            onClick={() => can('clients.view') && onNavigate('clients')}
            className="cursor-pointer group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-pink-500/40 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                <Tags className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {loading ? '...' : metrics.totalBrands}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              Marcas Asignadas Activas
            </p>
          </div>

          <div
            onClick={() => can('settings.view') && onNavigate('settings', 'users')}
            className="cursor-pointer group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-sky-500/40 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {loading ? '...' : metrics.activeUsers}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              Usuarios con PIN 8 Dígitos
            </p>
          </div>

          <div
            onClick={() => can('settings.view') && onNavigate('settings', 'roles')}
            className="cursor-pointer group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-amber-500/40 transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {loading ? '...' : metrics.totalRoles}
            </p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              Roles Granulares del Tenant
            </p>
          </div>
        </section>
      </PermissionGate>

      {/* CONTENIDO PRINCIPAL: DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Clientes Recientes */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>{clientPlural} y sus Marcas Comerciales</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resumen de cuentas gestionadas en este espacio
              </p>
            </div>
            <PermissionGate permission="clients.view">
              <button
                type="button"
                onClick={() => onNavigate('clients')}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
              >
                Ver todos ({metrics.totalClients})
              </button>
            </PermissionGate>
          </div>

          <div className="space-y-3">
            {recentClients.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <p className="text-sm font-bold">Aún no hay {clientPlural.toLowerCase()} registrados</p>
                <p className="text-xs text-slate-400 mt-1">
                  Crea el primer {clientSingular.toLowerCase()} y asígnale sus marcas.
                </p>
              </div>
            ) : (
              recentClients.map((client) => (
                <div
                  key={client.id}
                  className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-900/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm truncate text-slate-900 dark:text-slate-100">
                        {client.name}
                      </span>
                      <span className="text-[11px] font-mono-pin font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {client.documentType}: {client.documentNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {client.brands.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">
                          Sin marcas asignadas aún
                        </span>
                      ) : (
                        client.brands.map((brand) => (
                          <span
                            key={brand.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                            style={{
                              backgroundColor: `${brand.brandColor}15`,
                              borderColor: `${brand.brandColor}40`,
                              color: brand.brandColor,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: brand.brandColor }}
                            />
                            {brand.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <a
                    href={formatWhatsAppUrl(client.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition self-start sm:self-auto shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{client.whatsapp}</span>
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ficha de Agencia Activa */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Agencia Activa
                </h3>
                <p className="text-xs text-slate-400">Espacio Multitenant</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Nombre Comercial:</span>
                <span className="font-bold text-right text-slate-800 dark:text-slate-200">
                  {tenant.companyInfo.commercialName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RUC:</span>
                <span className="font-mono-pin font-bold text-slate-800 dark:text-slate-200">
                  {tenant.companyInfo.ruc}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Moneda Global:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {tenant.customization.currencyCode} ({tenant.customization.currencySymbol})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Clientes Global:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{clientPlural}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estilos UI:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {tenant.customization.toastStyle} / {tenant.customization.confirmModalStyle}
                </span>
              </div>
            </div>

            <PermissionGate permission="settings.view">
              <button
                type="button"
                onClick={() => onNavigate('settings', 'appearance')}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5"
              >
                <span>Configurar Sistema</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </PermissionGate>
          </div>

          {/* Permisos Granulares Activos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Permisos Granulares
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${role?.badgeColor || '#4f46e5'}20`,
                  color: role?.badgeColor || '#4f46e5',
                }}
              >
                {role?.name}
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Regla global activa: botones y endpoints validan tus {role?.permissions.length} permisos
              en vivo.
            </p>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {role?.permissions.map((perm) => (
                <span
                  key={perm}
                  className="text-[10px] font-mono-pin font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
