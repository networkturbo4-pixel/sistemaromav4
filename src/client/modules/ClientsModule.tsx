import React, { useState, useEffect, useRef } from 'react';
import { useApp, PermissionGate } from '../context/AppContext';
import { Client, ClientBrand, Service } from '../../shared/types';
import {
  Plus,
  Search,
  MessageCircle,
  Mail,
  FileText,
  Edit3,
  Trash2,
  Tags,
  Sparkles,
  X,
  Building,
  Building2,
  UserCheck,
  Globe,
  Check,
  ShieldCheck,
  Hash,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  LayoutGrid,
  Table as TableIcon,
  Package,
  DollarSign,
  Crown,
  Calendar,
  Clock,
  ChevronDown,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  computeInstallmentStatus,
  formatDueDate,
} from '../utils/paymentNoteUtils';

const BRAND_COLORS = [
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#0891b2',
  '#ea580c',
];

function useDialogLightDismissFallback(
  dialogRef: React.RefObject<HTMLDialogElement | null>,
  onCloseCallback: () => void
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onCloseCallback();
    dialog.addEventListener('close', handleClose);

    let handleBackdropClick: ((event: MouseEvent) => void) | null = null;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (handleBackdropClick) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, [dialogRef, onCloseCallback]);
}

export interface ClientBrandDraft {
  id?: string;
  name: string;
  industry: string;
  brandColor: string;
  logoUrl: string;
  socialHandle: string;
  description: string;
  logoInputMode: 'upload' | 'url';
  serviceType?: 'service' | 'membership';
  serviceName?: string;
  serviceDescription?: string;
  servicePrice?: number;
  serviceMonths?: number;
  servicePaymentDate?: string;
  servicePaymentDay?: number;
  includedServices?: string[];
}

export interface BrandServiceContractSectionProps {
  serviceType?: 'service' | 'membership';
  serviceName?: string;
  servicePrice?: number;
  serviceDescription?: string;
  serviceMonths?: number;
  servicePaymentDate?: string;
  servicePaymentDay?: number;
  includedServices?: string[];
  services: Service[];
  currencySymbol: string;
  onChange: (patch: {
    serviceType?: 'service' | 'membership';
    serviceName?: string;
    servicePrice?: number;
    serviceDescription?: string;
    serviceMonths?: number;
    servicePaymentDate?: string;
    servicePaymentDay?: number;
    includedServices?: string[];
  }) => void;
  toast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const BrandServiceContractSection: React.FC<BrandServiceContractSectionProps> = ({
  serviceType = 'service',
  serviceName = '',
  servicePrice,
  serviceDescription = '',
  serviceMonths = 1,
  servicePaymentDate = '',
  servicePaymentDay,
  includedServices = [],
  services,
  currencySymbol,
  onChange,
  toast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
        setShowCatalogDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentType = serviceType === 'membership' ? 'membership' : 'service';

  // Día de cobro acordado del mes (ej. 15, 7, 5, 18...)
  const currentBillingDay = servicePaymentDay || (servicePaymentDate && servicePaymentDate.includes('-') ? parseInt(servicePaymentDate.split('-')[2], 10) : 15);

  // Fecha representativa para calcular el estado en tiempo real con las reglas del sistema
  const currentDueDateCalculated = React.useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const lastDayThisMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const actualDay = Math.min(currentBillingDay, lastDayThisMonth);
    return new Date(curYear, curMonth, actualDay).toISOString().split('T')[0];
  }, [currentBillingDay]);

  const computedCurrentStatus = React.useMemo(() => {
    return computeInstallmentStatus('in_process', currentDueDateCalculated);
  }, [currentDueDateCalculated]);

  const handleSelectBillingDay = (day: number) => {
    const validDay = Math.max(1, Math.min(31, day));
    const now = new Date();
    const baseDate = servicePaymentDate && servicePaymentDate.includes('-')
      ? new Date(servicePaymentDate + 'T00:00:00')
      : now;
    const y = baseDate.getFullYear();
    const m = baseDate.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    const actualDay = Math.min(validDay, lastDay);
    const newDateStr = new Date(y, m, actualDay).toISOString().split('T')[0];

    onChange({
      servicePaymentDay: validDay,
      servicePaymentDate: newDateStr,
    });
  };

  const handleDateChange = (val: string) => {
    if (val && val.includes('-')) {
      const parts = val.split('-');
      const d = parseInt(parts[2], 10);
      onChange({
        servicePaymentDate: val,
        servicePaymentDay: !isNaN(d) ? d : currentBillingDay,
      });
    } else {
      onChange({ servicePaymentDate: val });
    }
  };

  const filteredServices = searchQuery.trim()
    ? services.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.briefDescription && s.briefDescription.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleIncludeSystemService = (srv: Service) => {
    const name = srv.title;
    if (includedServices.includes(name)) {
      toast('Este servicio ya está en la membresía.', 'warning');
      return;
    }
    onChange({
      includedServices: [...includedServices, name],
    });
    setSearchQuery('');
    setIsSearchFocused(false);
    setShowCatalogDropdown(false);
    toast(`Servicio "${name}" incluido en el paquete.`);
  };

  const handleAddCustomService = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (includedServices.includes(trimmed)) {
      toast('Este entregable ya está en la lista.', 'warning');
      return;
    }
    onChange({
      includedServices: [...includedServices, trimmed],
    });
    setSearchQuery('');
    setIsSearchFocused(false);
    toast(`Servicio personalizado agregado al paquete.`);
  };

  const handleRemoveService = (index: number) => {
    const next = includedServices.filter((_, i) => i !== index);
    onChange({ includedServices: next });
  };

  const handleSyncToDescription = () => {
    if (includedServices.length === 0) {
      toast('No hay servicios incluidos para agregar.', 'warning');
      return;
    }
    const listText = `Entregables y servicios incluidos (${serviceMonths || 1} meses):\n` +
      includedServices.map((it) => `• ${it}`).join('\n');
    const existing = serviceDescription.trim();
    const combined = existing ? `${existing}\n\n${listText}` : listText;
    onChange({ serviceDescription: combined });
    toast('Entregables copiados a la descripción.');
  };

  return (
    <div
      className="p-3 sm:p-3.5 rounded-xl border space-y-3 transition-colors"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--app-surface) 40%, var(--app-bg) 60%)',
        borderColor: 'var(--app-border)',
      }}
    >
      {/* 1. SELECCIÓN DE TIPO DE CONTRATACIÓN (SERVICIOS DEL SISTEMA VS MEMBRESÍAS) */}
      <div className="space-y-2 border-b pb-2.5" style={{ borderColor: 'var(--app-border)' }}>
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-black flex items-center gap-1.5" style={{ color: 'var(--app-text)' }}>
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Contratación del Cliente para esta Marca</span>
          </label>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400">
            {currentType === 'membership' ? 'Membresía / Paquete' : 'Servicio del Sistema'}
          </span>
        </div>

        {/* Switcher segmented */}
        <div
          className="p-1 rounded-xl border grid grid-cols-2 gap-1.5"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <button
            type="button"
            onClick={() => onChange({ serviceType: 'service' })}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              currentType === 'service'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-500/10'
            }`}
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Servicios del Sistema</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onChange({
                serviceType: 'membership',
                serviceMonths: serviceMonths && serviceMonths > 0 ? serviceMonths : 3,
              })
            }
            className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              currentType === 'membership'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-500/10'
            }`}
          >
            <Crown className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Agregar Membresías</span>
          </button>
        </div>
      </div>

      {/* CASO A: SERVICIOS DEL SISTEMA */}
      {currentType === 'service' ? (
        <div className="space-y-2.5 animate-in fade-in duration-150">
          {/* Selector para jalar servicio registrado */}
          {services.length > 0 && (
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-xl border bg-slate-500/5"
              style={{ borderColor: 'var(--app-border)' }}
            >
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Jalar del catálogo del sistema:</span>
              </span>
              <div className="relative w-full sm:w-auto min-w-0 max-w-full sm:max-w-[280px]">
                <select
                  value=""
                  onChange={(e) => {
                    const srv = services.find((s) => s.id === e.target.value);
                    if (!srv) return;
                    onChange({
                      serviceName: srv.title,
                      servicePrice: Number(srv.basePrice) || 0,
                      serviceDescription:
                        srv.briefDescription ||
                        (srv.fullDescription ? srv.fullDescription.replace(/<[^>]+>/g, ' ').slice(0, 160) : ''),
                    });
                    toast(`Servicio "${srv.title}" cargado a la marca.`);
                  }}
                  className="w-full pl-2.5 pr-8 py-1.5 rounded-lg border text-xs font-bold cursor-pointer outline-none bg-white dark:bg-slate-900 appearance-none truncate transition focus:ring-2 focus:ring-indigo-500/20"
                  style={{ borderColor: 'var(--app-border)', color: 'var(--app-text)' }}
                >
                  <option value="" className="text-slate-400">Seleccionar del catálogo...</option>
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {srv.title} ({currencySymbol}{srv.basePrice})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Nombre del Servicio */}
            <div className="sm:col-span-8">
              <label className="block text-[11px] font-bold mb-1 text-slate-600 dark:text-slate-300">
                Nombre del Servicio
              </label>
              <div
                className="flex items-center rounded-xl border px-3 py-1.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <Package className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => onChange({ serviceName: e.target.value })}
                  placeholder="Ej. Plan Social Media Pro, Branding 360°, Web Ecommerce..."
                  className="w-full bg-transparent text-xs font-semibold outline-none"
                  style={{ color: 'var(--app-text)' }}
                />
              </div>
            </div>

            {/* Precio / Inversión */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold mb-1 text-slate-600 dark:text-slate-300">
                Inversión / Precio ({currencySymbol})
              </label>
              <div
                className="flex items-center rounded-xl border px-3 py-1.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <DollarSign className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={servicePrice ?? ''}
                  onChange={(e) => onChange({ servicePrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full bg-transparent text-xs font-mono font-bold outline-none"
                  style={{ color: 'var(--app-text)' }}
                />
              </div>
            </div>
          </div>

          {/* Descripción del Servicio */}
          <div>
            <label className="block text-[11px] font-bold mb-1 text-slate-600 dark:text-slate-300">
              Descripción / Alcance del Servicio
            </label>
            <textarea
              rows={2}
              value={serviceDescription}
              onChange={(e) => onChange({ serviceDescription: e.target.value })}
              placeholder="Entregables incluidos, periodicidad, reuniones de asesoría, alcance acordado..."
              className="w-full rounded-xl border px-3 py-1.5 text-xs font-medium outline-none resize-none transition focus:ring-2 focus:ring-indigo-500/20"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)',
              }}
            />
          </div>
        </div>
      ) : (
        /* CASO B: MEMBRESÍAS / PAQUETES */
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Título de la Membresía */}
            <div className="sm:col-span-12">
              <label className="block text-[11px] font-bold mb-1 text-slate-600 dark:text-slate-300">
                Título o Nombre de la Membresía / Paquete <span className="text-rose-500">*</span>
              </label>
              <div
                className="flex items-center rounded-xl border px-3 py-1.5 transition focus-within:ring-2 focus-within:ring-purple-500/20"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <Crown className="w-3.5 h-3.5 text-purple-500 mr-2 shrink-0" />
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => onChange({ serviceName: e.target.value })}
                  placeholder="Ej. Membresía Growth 360°, Plan Semestral Redes & Ads, Retainer Mensual..."
                  className="w-full bg-transparent text-xs font-semibold outline-none"
                  style={{ color: 'var(--app-text)' }}
                />
              </div>
            </div>

            {/* Duración en Meses */}
            <div className="sm:col-span-6">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Duración del Paquete (Meses)
                </label>
                <div className="flex items-center gap-1">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onChange({ serviceMonths: m })}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                        serviceMonths === m
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'bg-slate-500/10 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="flex items-center rounded-xl border px-3 py-1.5 transition focus-within:ring-2 focus-within:ring-purple-500/20"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <Clock className="w-3.5 h-3.5 text-purple-500 mr-2 shrink-0" />
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={serviceMonths || 1}
                  onChange={(e) => onChange({ serviceMonths: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full bg-transparent text-xs font-mono font-bold outline-none"
                  style={{ color: 'var(--app-text)' }}
                />
                <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1">mes(es)</span>
              </div>
            </div>

            {/* Inversión / Precio de la Membresía */}
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-bold mb-1 text-slate-600 dark:text-slate-300">
                Inversión / Precio del Paquete ({currencySymbol})
              </label>
              <div
                className="flex items-center rounded-xl border px-3 py-1.5 transition focus-within:ring-2 focus-within:ring-purple-500/20"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <DollarSign className="w-3.5 h-3.5 text-purple-500 mr-1.5 shrink-0" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={servicePrice ?? ''}
                  onChange={(e) => onChange({ servicePrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="w-full bg-transparent text-xs font-mono font-bold outline-none"
                  style={{ color: 'var(--app-text)' }}
                />
              </div>
            </div>

            {/* Si es Membresía: Día de Cobro Mensual Acordado y Reglas de Estado */}
            {currentType === 'membership' ? (
              <div className="sm:col-span-12 p-3 sm:p-4 rounded-2xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-black text-purple-950 dark:text-purple-200 uppercase tracking-tight">
                      Día de Cobro Acordado (Membresía Mensual)
                    </span>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                    Se cobra los {currentBillingDay} de cada mes
                  </span>
                </div>

                {/* Selector rápido de días de cobro comunes */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    Seleccionar día de cobro pactado:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 7, 10, 15, 18, 20, 25, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSelectBillingDay(d)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                          currentBillingDay === d
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                        }`}
                      >
                        Los {d} de c/mes
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-purple-100 dark:border-purple-900/40">
                  {/* Input numérico personalizado de día */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Día exacto del mes (1 al 31)
                    </label>
                    <div
                      className="flex items-center rounded-xl border px-3 py-1.5 bg-white dark:bg-slate-900"
                      style={{ borderColor: 'var(--app-border)' }}
                    >
                      <span className="text-xs text-purple-600 font-bold mr-1.5">Día</span>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={currentBillingDay}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1 && val <= 31) {
                            handleSelectBillingDay(val);
                          }
                        }}
                        className="w-full bg-transparent text-xs font-mono font-bold outline-none"
                        style={{ color: 'var(--app-text)' }}
                      />
                      <span className="text-[10px] text-slate-400 shrink-0">de cada mes</span>
                    </div>
                  </div>

                  {/* Fecha de Inicio / Primer Cobro */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Fecha del 1er Cobro / Inicio
                    </label>
                    <div
                      className="flex items-center rounded-xl border px-3 py-1.5 bg-white dark:bg-slate-900"
                      style={{ borderColor: 'var(--app-border)' }}
                    >
                      <Calendar className="w-3.5 h-3.5 text-purple-500 mr-2 shrink-0" />
                      <input
                        type="date"
                        value={servicePaymentDate || ''}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="w-full bg-transparent text-xs font-semibold outline-none"
                        style={{ color: 'var(--app-text)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Explicación y Estado en Tiempo Real según reglas del sistema */}
                <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-purple-100 dark:border-purple-900/40 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Sincronización de Reglas de Estado Roma:
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${computedCurrentStatus.badgeClass}`}>
                      {computedCurrentStatus.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    • <strong>No Activo</strong>: Si faltan más de 7 días para el día {currentBillingDay} (no suma en el total del comprobante).<br />
                    • <strong>En Proceso</strong>: Si faltan entre 5 a 7 días de vencer (periodo activo de cobranza).<br />
                    • <strong>Retrasado</strong>: Si han pasado más de 5 días de la fecha pactada sin haber registrado pago.<br />
                    • <strong>Pagado</strong>: Al registrar el voucher de pago o número de operación.
                  </p>
                </div>
              </div>
            ) : (
              /* Si es Servicio Estándar: Fecha de Vencimiento de Entrega */
              <div className="sm:col-span-12">
                <label className="block text-[11px] font-bold mb-1 text-slate-600 dark:text-slate-300">
                  Fecha Acordada de Pago / Entrega
                </label>
                <div
                  className="flex items-center rounded-xl border px-3 py-1.5 transition focus-within:ring-2 focus-within:ring-purple-500/20"
                  style={{
                    backgroundColor: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                  }}
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-500 mr-2 shrink-0" />
                  <input
                    type="date"
                    value={servicePaymentDate || ''}
                    onChange={(e) => onChange({ servicePaymentDate: e.target.value })}
                    className="w-full bg-transparent text-xs font-semibold outline-none"
                    style={{ color: 'var(--app-text)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Descripción / Condiciones del Paquete */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Descripción / Condiciones del Paquete
              </label>
              {includedServices.length > 0 && (
                <button
                  type="button"
                  onClick={handleSyncToDescription}
                  className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  + Copiar entregables aquí
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={serviceDescription}
              onChange={(e) => onChange({ serviceDescription: e.target.value })}
              placeholder="Detalle general, periodicidad de reuniones de informe, cláusulas de renovación..."
              className="w-full rounded-xl border px-3 py-1.5 text-xs font-medium outline-none resize-none transition focus:ring-2 focus:ring-purple-500/20"
              style={{
                backgroundColor: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)',
              }}
            />
          </div>

          {/* BUSCADOR DE SERVICIOS DEL SISTEMA O CREAR SERVICIO PERSONALIZADO */}
          <div
            ref={searchContainerRef}
            className="p-3 rounded-xl border space-y-2.5 relative"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--app-surface) 80%, var(--app-bg) 20%)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                <span>Servicios y Entregables del Paquete</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {includedServices.length} incluido(s)
              </span>
            </div>

            {/* Barra de búsqueda interactiva con botón para agregar personalizado */}
            <div className="flex items-center gap-1.5">
              <div
                className="flex-1 flex items-center rounded-xl border px-2.5 py-1.5 transition focus-within:ring-2 focus-within:ring-purple-500/20"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredServices.length === 1) {
                        handleIncludeSystemService(filteredServices[0]);
                      } else if (searchQuery.trim()) {
                        handleAddCustomService(searchQuery);
                      }
                    }
                  }}
                  placeholder="Buscar servicio del sistema o escribir personalizado..."
                  className="w-full bg-transparent text-xs font-semibold outline-none"
                  style={{ color: 'var(--app-text)' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Botón rápido para agregar personalizado */}
              <button
                type="button"
                onClick={() => handleAddCustomService(searchQuery)}
                disabled={!searchQuery.trim()}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 disabled:hover:bg-purple-600 transition cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                title="Agregar como servicio exclusivo de esta membresía"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Personalizado</span>
              </button>

              {/* Botón selector del catálogo completo */}
              {services.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCatalogDropdown(!showCatalogDropdown)}
                  className="px-2 py-1.5 rounded-xl border text-xs font-bold transition hover:bg-slate-500/10 cursor-pointer flex items-center gap-1 shrink-0"
                  style={{ borderColor: 'var(--app-border)', color: 'var(--app-text)' }}
                  title="Ver todo el catálogo del sistema"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>

            {/* POPUP / DROPDOWN DE BÚSQUEDA FLOTANTE */}
            {isSearchFocused && searchQuery.trim().length > 0 && (
              <div
                className="absolute left-3 right-3 top-16 z-30 rounded-xl border shadow-xl p-2 max-h-56 overflow-y-auto space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                {/* Resultados coincidentes del catálogo */}
                {filteredServices.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Servicios del Catálogo del Sistema ({filteredServices.length})
                    </div>
                    {filteredServices.map((srv) => (
                      <div
                        key={srv.id}
                        onClick={() => handleIncludeSystemService(srv)}
                        className="px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 hover:bg-indigo-500/10 cursor-pointer transition text-xs group"
                      >
                        <div className="min-w-0">
                          <p className="font-bold truncate text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {srv.title}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {currencySymbol}{srv.basePrice}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
                          + Incluir
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Opción para crear servicio personalizado (no aparecerá en servicios del sistema) */}
                <div
                  onClick={() => handleAddCustomService(searchQuery)}
                  className="p-2 rounded-lg border border-dashed border-purple-500/30 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer transition text-xs"
                >
                  <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>Agregar entregable personalizado: "{searchQuery}"</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Exclusivo para este paquete. No se guardará en los servicios del sistema.
                  </p>
                </div>
              </div>
            )}

            {/* POPUP DE TODO EL CATÁLOGO SI EL USUARIO HACE CLIC EN EL BOTÓN DE CAPAS */}
            {showCatalogDropdown && (
              <div
                className="absolute left-3 right-3 top-16 z-30 rounded-xl border shadow-xl p-2 max-h-56 overflow-y-auto space-y-1 animate-in fade-in duration-150"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Todos los Servicios del Sistema ({services.length})
                </div>
                {services.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => handleIncludeSystemService(srv)}
                    className="px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2 hover:bg-indigo-500/10 cursor-pointer transition text-xs"
                  >
                    <span className="font-bold truncate text-slate-800 dark:text-slate-100">
                      {srv.title}
                    </span>
                    <span className="font-mono-pin text-[10px] text-slate-400 shrink-0">
                      {currencySymbol}{srv.basePrice}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Lista de Servicios / Entregables Agregados */}
            {includedServices.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic text-center py-1.5">
                Aún no has agregado entregables a esta membresía. Busca servicios del sistema o escribe entregables personalizados arriba.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {includedServices.map((item, idx) => {
                  const isFromSystem = services.some((s) => s.title.toLowerCase() === item.toLowerCase());
                  return (
                    <div
                      key={idx}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition ${
                        isFromSystem
                          ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25'
                          : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25'
                      }`}
                    >
                      {isFromSystem ? (
                        <Package className="w-3 h-3 text-indigo-500 shrink-0" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                      )}
                      <span className="max-w-[200px] truncate">{item}</span>
                      <span className="text-[9px] opacity-75 font-normal">
                        ({isFromSystem ? 'Catálogo' : 'Personalizado'})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(idx)}
                        className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-0.5 ml-0.5"
                        title="Quitar de la membresía"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ClientsModule: React.FC = () => {
  const { tenant, apiFetch, toast, confirmAction, can } = useApp();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [docFilter, setDocFilter] = useState<'ALL' | 'RUC' | 'DNI'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Estado del Modal de Cliente (Crear / Editar)
  const clientDialogRef = useRef<HTMLDialogElement | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({
    name: '',
    documentType: 'RUC' as 'DNI' | 'RUC' | 'CE' | 'PASAPORTE',
    documentNumber: '',
    whatsapp: '',
    email: '',
    notes: '',
    brands: [] as ClientBrandDraft[],
  });
  const [savingClient, setSavingClient] = useState<boolean>(false);

  // Helper para crear una nueva marca vacía
  const createEmptyBrandDraft = (index: number = 0): ClientBrandDraft => ({
    name: '',
    industry: 'Branding & Diseño',
    brandColor: BRAND_COLORS[index % BRAND_COLORS.length],
    logoUrl: '',
    socialHandle: '',
    description: '',
    logoInputMode: 'upload',
    serviceType: 'service',
    serviceName: '',
    serviceDescription: '',
    servicePrice: 0,
    serviceMonths: 1,
    servicePaymentDate: '',
    servicePaymentDay: 15,
    includedServices: [],
  });

  const handleAddBrandDraft = () => {
    setClientForm((prev) => ({
      ...prev,
      brands: [...prev.brands, createEmptyBrandDraft(prev.brands.length)],
    }));
  };

  const handleRemoveBrandDraft = (index: number) => {
    setClientForm((prev) => {
      const nextBrands = prev.brands.filter((_, i) => i !== index);
      return {
        ...prev,
        brands: nextBrands.length > 0 ? nextBrands : [createEmptyBrandDraft(0)],
      };
    });
  };

  const handleUpdateBrandDraft = (index: number, patch: Partial<ClientBrandDraft>) => {
    setClientForm((prev) => {
      const nextBrands = [...prev.brands];
      if (nextBrands[index]) {
        nextBrands[index] = { ...nextBrands[index], ...patch };
      }
      return { ...prev, brands: nextBrands };
    });
  };

  const handleBrandDraftLogoFileUpload = (index: number, file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('El archivo no debe superar los 5MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      handleUpdateBrandDraft(index, { logoUrl: reader.result as string });
      toast('Logo de la marca cargado.');
    };
    reader.readAsDataURL(file);
  };

  // Estado del Modal de Marca Asignada
  const brandDialogRef = useRef<HTMLDialogElement | null>(null);
  const [targetClientForBrand, setTargetClientForBrand] = useState<Client | null>(null);
  const [editingBrand, setEditingBrand] = useState<ClientBrand | null>(null);
  const [brandLogoInputMode, setBrandLogoInputMode] = useState<'upload' | 'url'>('upload');
  const [brandForm, setBrandForm] = useState({
    name: '',
    industry: 'Publicidad & Branding',
    brandColor: '#4f46e5',
    logoUrl: '',
    socialHandle: '',
    description: '',
    serviceType: 'service' as 'service' | 'membership',
    serviceName: '',
    serviceDescription: '',
    servicePrice: 0,
    serviceMonths: 1,
    servicePaymentDate: '',
    servicePaymentDay: 15,
    includedServices: [] as string[],
  });
  const [savingBrand, setSavingBrand] = useState<boolean>(false);

  const handleBrandLogoFileUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('El archivo no debe superar los 5MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBrandForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      toast('Logo de la marca cargado.');
    };
    reader.readAsDataURL(file);
  };

  useDialogLightDismissFallback(clientDialogRef, () => {
    setEditingClient(null);
  });

  useDialogLightDismissFallback(brandDialogRef, () => {
    setEditingBrand(null);
    setTargetClientForBrand(null);
  });

  const clientPlural = tenant.customization.clientGlobalNamePlural || 'Clientes';
  const clientSingular = tenant.customization.clientGlobalNameSingular || 'Cliente';

  const loadClients = async () => {
    setLoading(true);
    try {
      const [clientsData, servicesData] = await Promise.all([
        apiFetch<{ clients: Client[] }>('/api/clients'),
        apiFetch<{ services: Service[] }>('/api/services').catch(() => ({ services: [] })),
      ]);
      setClients(clientsData.clients || []);
      setServices(servicesData.services || []);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openCreateClientModal = () => {
    setEditingClient(null);
    setClientForm({
      name: '',
      documentType: 'RUC',
      documentNumber: '',
      whatsapp: '+51 ',
      email: '',
      notes: '',
      brands: [createEmptyBrandDraft(0)],
    });
    clientDialogRef.current?.showModal();
  };

  const openEditClientModal = (client: Client) => {
    setEditingClient(client);
    const mappedBrands: ClientBrandDraft[] =
      client.brands && client.brands.length > 0
        ? client.brands.map((b, idx) => ({
            id: b.id,
            name: b.name,
            industry: b.industry || 'Branding & Diseño',
            brandColor: b.brandColor || BRAND_COLORS[idx % BRAND_COLORS.length],
            logoUrl: b.logoUrl || '',
            socialHandle: b.socialHandle || '',
            description: b.description || '',
            logoInputMode: b.logoUrl?.startsWith('data:') ? 'upload' : 'url',
            serviceType: b.serviceType || ((b.serviceMonths && b.serviceMonths > 0) ? 'membership' : 'service'),
            serviceName: b.serviceName || '',
            serviceDescription: b.serviceDescription || '',
            servicePrice: b.servicePrice || 0,
            serviceMonths: b.serviceMonths || 1,
            includedServices: b.includedServices || [],
          }))
        : [createEmptyBrandDraft(0)];

    setClientForm({
      name: client.name,
      documentType: client.documentType,
      documentNumber: client.documentNumber,
      whatsapp: client.whatsapp,
      email: client.email || '',
      notes: client.notes || '',
      brands: mappedBrands,
    });
    clientDialogRef.current?.showModal();
  };

  // Escuchar navegación dirigida desde Command Palette
  useEffect(() => {
    if (clients.length === 0) return;

    const handleTarget = (target: { entityId?: string; id?: string; code?: string; query?: string }) => {
      const targetId = target.entityId || target.id;
      const found = clients.find(
        (c) =>
          (targetId && c.id === targetId) ||
          (target.code && (c.name.toLowerCase() === target.code.toLowerCase() || c.documentNumber === target.code))
      );
      if (found) {
        openEditClientModal(found);
      } else if (target.query) {
        setSearchQuery(target.query);
      }
    };

    try {
      const raw = sessionStorage.getItem('roma_open_target');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.module === 'clients') {
          sessionStorage.removeItem('roma_open_target');
          handleTarget(parsed);
        }
      }
    } catch {}

    const listener = (e: any) => {
      if (e.detail?.module === 'clients') {
        sessionStorage.removeItem('roma_open_target');
        handleTarget(e.detail);
      }
    };
    window.addEventListener('roma:open-target', listener);
    return () => window.removeEventListener('roma:open-target', listener);
  }, [clients]);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name.trim() || !clientForm.documentNumber.trim() || !clientForm.whatsapp.trim()) {
      toast('Completa el nombre, DNI/RUC y WhatsApp obligatorio.', 'warning');
      return;
    }

    setSavingClient(true);
    try {
      // Filtrar marcas con nombre válido
      const validBrands = clientForm.brands
        .filter((b) => b.name.trim() !== '')
        .map((b, idx) => ({
          id: b.id,
          name: b.name.trim(),
          industry: (b.industry || 'Branding & Diseño').trim(),
          brandColor: b.brandColor || BRAND_COLORS[idx % BRAND_COLORS.length],
          logoUrl: (b.logoUrl || '').trim(),
          socialHandle: (b.socialHandle || '').trim(),
          description: (b.description || '').trim(),
          serviceType: b.serviceType || 'service',
          serviceName: (b.serviceName || '').trim() || undefined,
          serviceDescription: (b.serviceDescription || '').trim() || undefined,
          servicePrice: typeof b.servicePrice === 'number' ? b.servicePrice : (b.servicePrice ? Number(b.servicePrice) : 0),
          serviceMonths: b.serviceMonths ? Number(b.serviceMonths) : undefined,
          includedServices: Array.isArray(b.includedServices) ? b.includedServices : [],
        }));

      if (editingClient) {
        // Actualizar datos del cliente y sincronizar sus marcas
        await apiFetch(`/api/clients/${editingClient.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: clientForm.name,
            documentType: clientForm.documentType,
            documentNumber: clientForm.documentNumber,
            whatsapp: clientForm.whatsapp,
            email: clientForm.email.trim() || null,
            notes: clientForm.notes,
            brands: validBrands,
          }),
        });

        toast(
          validBrands.length > 0
            ? `${clientSingular} actualizado con sus ${validBrands.length} marca(s).`
            : `${clientSingular} actualizado.`
        );
      } else {
        await apiFetch('/api/clients', {
          method: 'POST',
          body: JSON.stringify({
            name: clientForm.name,
            documentType: clientForm.documentType,
            documentNumber: clientForm.documentNumber,
            whatsapp: clientForm.whatsapp,
            email: clientForm.email.trim() || null,
            notes: clientForm.notes,
            brands: validBrands,
          }),
        });

        toast(
          `${clientSingular} registrado exitosamente${
            validBrands.length > 0 ? ` con ${validBrands.length} marca(s) asociadas` : ''
          }.`
        );
      }
      clientDialogRef.current?.close();
      await loadClients();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingClient(false);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    const ok = await confirmAction({
      title: `¿Eliminar ${clientSingular.toLowerCase()} "${client.name}"?`,
      message: `Se eliminará junto con sus ${client.brands.length} marca(s) asociadas. Esta acción no se puede deshacer.`,
      confirmText: `Sí, eliminar ${clientSingular.toLowerCase()}`,
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/clients/${client.id}`, { method: 'DELETE' });
      toast(`${clientSingular} eliminado.`, 'info');
      await loadClients();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const openCreateBrandModal = (client: Client) => {
    setTargetClientForBrand(client);
    setEditingBrand(null);
    setBrandLogoInputMode('upload');
    const brandsCount = client.brands?.length || 0;
    setBrandForm({
      name: '',
      industry: 'Publicidad & Redes',
      brandColor: BRAND_COLORS[brandsCount % BRAND_COLORS.length],
      logoUrl: '',
      socialHandle: '@',
      description: '',
      serviceType: 'service',
      serviceName: '',
      serviceDescription: '',
      servicePrice: 0,
      serviceMonths: 1,
      servicePaymentDate: '',
      servicePaymentDay: 15,
      includedServices: [],
    });
    brandDialogRef.current?.showModal();
  };

  const openEditBrandModal = (client: Client, brand: ClientBrand) => {
    setTargetClientForBrand(client);
    setEditingBrand(brand);
    setBrandLogoInputMode(brand.logoUrl?.startsWith('data:') ? 'upload' : 'url');
    setBrandForm({
      name: brand.name,
      industry: brand.industry,
      brandColor: brand.brandColor || BRAND_COLORS[0],
      logoUrl: brand.logoUrl || '',
      socialHandle: brand.socialHandle || '',
      description: brand.description || '',
      serviceType: brand.serviceType || ((brand.serviceMonths && brand.serviceMonths > 0) ? 'membership' : 'service'),
      serviceName: brand.serviceName || '',
      serviceDescription: brand.serviceDescription || '',
      servicePrice: brand.servicePrice || 0,
      serviceMonths: brand.serviceMonths || 1,
      servicePaymentDate: brand.servicePaymentDate || '',
      servicePaymentDay: brand.servicePaymentDay || (brand.servicePaymentDate && brand.servicePaymentDate.includes('-') ? parseInt(brand.servicePaymentDate.split('-')[2], 10) : 15),
      includedServices: brand.includedServices || [],
    });
    brandDialogRef.current?.showModal();
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) {
      toast('El nombre de la marca es obligatorio.', 'warning');
      return;
    }

    setSavingBrand(true);
    try {
      if (editingBrand) {
        await apiFetch(`/api/brands/${editingBrand.id}`, {
          method: 'PUT',
          body: JSON.stringify(brandForm),
        });
        toast(`Marca "${brandForm.name}" actualizada.`);
      } else if (targetClientForBrand) {
        await apiFetch(`/api/clients/${targetClientForBrand.id}/brands`, {
          method: 'POST',
          body: JSON.stringify(brandForm),
        });
        toast(`Marca "${brandForm.name}" asignada.`);
      }
      brandDialogRef.current?.close();
      await loadClients();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingBrand(false);
    }
  };

  const handleDeleteBrand = async (brand: ClientBrand) => {
    const ok = await confirmAction({
      title: `¿Eliminar la marca "${brand.name}"?`,
      message: 'La marca será desvinculada de este cliente permanentemente.',
      confirmText: 'Eliminar marca',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/brands/${brand.id}`, { method: 'DELETE' });
      toast(`Marca "${brand.name}" eliminada.`, 'info');
      await loadClients();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const filteredClients = clients.filter((c) => {
    if (docFilter !== 'ALL' && c.documentType !== docFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchClient =
      (c.name || '').toLowerCase().includes(q) ||
      String(c.documentNumber || '').toLowerCase().includes(q) ||
      String(c.whatsapp || '').toLowerCase().includes(q) ||
      (c.email ? String(c.email).toLowerCase().includes(q) : false);
    const matchBrand = (c.brands || []).some(
      (b) =>
        (b.name || '').toLowerCase().includes(q) ||
        String(b.industry || '').toLowerCase().includes(q) ||
        String(b.socialHandle || '').toLowerCase().includes(q)
    );
    return matchClient || matchBrand;
  });

  const totalBrandsCount = clients.reduce((acc, c) => acc + (c.brands?.length || 0), 0);

  return (
    <div className="space-y-5">
      {/* CABECERA ESTANDARIZADA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Directorio de Clientes & Marcas Comerciales</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {clientPlural} de la Agencia
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {clients.length} {clientPlural.toLowerCase()} registrados • {totalBrandsCount} marcas
            activas en {tenant.name}
          </p>
        </div>

        <PermissionGate permission="clients.create">
          <button
            type="button"
            onClick={openCreateClientModal}
            className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center justify-center gap-2 shrink-0 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo {clientSingular}</span>
          </button>
        </PermissionGate>
      </div>

      {/* METRICAS KPI / RESUMEN EN 4 COLUMNAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Clientes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between transition hover:border-indigo-500/30">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total {clientPlural}</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {clients.length}
            </div>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-0.5">
              <Check className="w-3 h-3" /> Cuentas registradas
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Marcas Activas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between transition hover:border-pink-500/30">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Marcas Activas</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {totalBrandsCount}
            </div>
            <span className="text-[10px] font-bold text-pink-500 flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3" /> Portafolio comercial
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold shrink-0">
            <Tags className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Empresas (RUC) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between transition hover:border-blue-500/30">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Empresas (RUC)</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {clients.filter((c) => c.documentType === 'RUC').length}
            </div>
            <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" /> Personas jurídicas
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
            <Building className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Clientes DNI / Naturales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between transition hover:border-emerald-500/30">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Naturales (DNI)</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {clients.filter((c) => c.documentType === 'DNI' || c.documentType === 'CE' || c.documentType === 'PASAPORTE').length}
            </div>
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-0.5">
              <UserCheck className="w-3 h-3" /> Personas naturales
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA, FILTROS Y VISTAS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Buscar por nombre de ${clientSingular.toLowerCase()}, DNI/RUC, WhatsApp o marca...`}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500 transition shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            {(['ALL', 'RUC', 'DNI'] as const).map((type) => {
              const count =
                type === 'ALL'
                  ? clients.length
                  : clients.filter((c) => c.documentType === type).length;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDocFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    docFilter === type
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{type === 'ALL' ? 'Todos' : type}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      docFilter === type
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selector de Vista: 4 Columnas vs Tabla */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Vista Cuadrícula (4 Columnas)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Vista Tabla"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: SKELETON, ESTADO VACÍO O VISTAS */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="h-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse p-4"
            />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
            <Building className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
            No se encontraron {clientPlural.toLowerCase()}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Registra un nuevo {clientSingular.toLowerCase()} y asígnale marcas comerciales.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* VISTA 4 COLUMNAS MODERNA TIPO APP */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClients.map((client) => {
            const cleanWa = String(client.whatsapp || '').replace(/\D/g, '');
            return (
              <article
                key={client.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-lg hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between gap-3.5 group"
              >
                <div className="space-y-3">
                  {/* Encabezado de la Tarjeta */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0 ring-2 ring-indigo-500/10">
                        {client.name
                          .split(' ')
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2
                          className="font-extrabold text-sm truncate text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition"
                          title={client.name}
                        >
                          {client.name}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-mono-pin font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {client.documentType}: {client.documentNumber}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                            {client.brands.length} {client.brands.length === 1 ? 'marca' : 'marcas'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <PermissionGate permission="clients.edit">
                        <button
                          type="button"
                          onClick={() => openEditClientModal(client)}
                          className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
                          title="Editar cliente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </PermissionGate>

                      <PermissionGate permission="clients.delete">
                        <button
                          type="button"
                          onClick={() => handleDeleteClient(client)}
                          className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-800 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition cursor-pointer"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </PermissionGate>
                    </div>
                  </div>

                  {/* Canales de Comunicación Directa */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <a
                      href={`https://wa.me/${cleanWa}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition truncate"
                      title={`Escribir por WhatsApp a ${client.whatsapp}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{client.whatsapp}</span>
                    </a>
                    {client.email && (
                      <a
                        href={`mailto:${client.email}`}
                        className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition shrink-0"
                        title={`Enviar correo a ${client.email}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Notas / Observaciones */}
                  {client.notes && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-950/60 rounded-xl px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-800/60 flex items-start gap-1.5 line-clamp-2">
                      <FileText className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="truncate">{client.notes}</span>
                    </div>
                  )}
                </div>

                {/* MARCAS ASIGNADAS */}
                <PermissionGate permission="brands.view">
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Tags className="w-3 h-3 text-pink-500" />
                        Marcas ({client.brands.length})
                      </span>

                      <PermissionGate permission="brands.create">
                        <button
                          type="button"
                          onClick={() => openCreateBrandModal(client)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Asignar</span>
                        </button>
                      </PermissionGate>
                    </div>

                    {client.brands.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => openCreateBrandModal(client)}
                        className="w-full py-2.5 px-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-center text-xs text-slate-400 hover:text-indigo-500 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Asignar marca comercial</span>
                      </button>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                        {client.brands.map((brand) => (
                          <div
                            key={brand.id}
                            className="group/brand relative p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between gap-2 transition hover:border-slate-300 dark:hover:border-slate-700"
                            style={{
                              borderLeftWidth: '3px',
                              borderLeftColor: brand.brandColor || '#4f46e5',
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {brand.logoUrl ? (
                                <img
                                  src={brand.logoUrl}
                                  alt={brand.name}
                                  className="w-7 h-7 rounded-lg object-contain bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-0.5 shrink-0"
                                />
                              ) : (
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] text-white shrink-0 shadow-2xs"
                                  style={{ backgroundColor: brand.brandColor || '#4f46e5' }}
                                >
                                  {brand.name.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-xs truncate text-slate-900 dark:text-slate-100">
                                  {brand.name}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-slate-400 truncate">
                                    {brand.industry || 'General'}
                                  </span>
                                  {brand.serviceName && (
                                    <span
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border truncate max-w-[175px] ${
                                        brand.serviceType === 'membership'
                                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                      }`}
                                      title={brand.serviceName}
                                    >
                                      {brand.serviceType === 'membership' ? (
                                        <Crown className="w-2.5 h-2.5 shrink-0 text-purple-500" />
                                      ) : (
                                        <Package className="w-2.5 h-2.5 shrink-0 text-indigo-500" />
                                      )}
                                      <span className="truncate">
                                        {brand.serviceType === 'membership' && brand.serviceMonths
                                          ? `[${brand.serviceMonths}m] ${brand.serviceName}`
                                          : brand.serviceName}
                                      </span>
                                      {Boolean(brand.servicePrice) && (
                                        <span className="font-mono-pin font-black ml-0.5">
                                          {tenant.customization?.currencySymbol || 'S/'}{brand.servicePrice}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5 opacity-40 group-hover/brand:opacity-100 transition shrink-0">
                              {can('brands.edit') && (
                                <button
                                  type="button"
                                  onClick={() => openEditBrandModal(client, brand)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Editar marca"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                              {can('brands.delete') && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBrand(brand)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                  title="Eliminar marca"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </PermissionGate>
              </article>
            );
          })}
        </div>
      ) : (
        /* VISTA TABLA EMPRESARIAL MODERNA */
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Cliente / Razón Social</th>
                  <th className="py-3.5 px-4">Documento</th>
                  <th className="py-3.5 px-4">Contacto Directo</th>
                  <th className="py-3.5 px-4">Marcas Asociadas</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredClients.map((client) => {
                  const cleanWa = String(client.whatsapp || '').replace(/\D/g, '');
                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition group"
                    >
                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {client.name
                              .split(' ')
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {client.name}
                            </p>
                            {client.notes && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs">
                                {client.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Documento */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[10px] font-mono-pin font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {client.documentType}: {client.documentNumber}
                        </span>
                      </td>

                      {/* Contacto */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://wa.me/${cleanWa}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>{client.whatsapp}</span>
                          </a>
                          {client.email && (
                            <a
                              href={`mailto:${client.email}`}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title={client.email}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Marcas */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {client.brands.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">Sin marcas</span>
                          ) : (
                            client.brands.map((brand) => (
                              <div
                                key={brand.id}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-bold text-slate-800 dark:text-slate-200"
                              >
                                {brand.logoUrl ? (
                                  <img
                                    src={brand.logoUrl}
                                    alt={brand.name}
                                    className="w-4 h-4 rounded object-contain"
                                  />
                                ) : (
                                  <div
                                    className="w-3.5 h-3.5 rounded-full"
                                    style={{ backgroundColor: brand.brandColor }}
                                  />
                                )}
                                <span>{brand.name}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <PermissionGate permission="brands.create">
                            <button
                              type="button"
                              onClick={() => openCreateBrandModal(client)}
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
                              title="Asignar Marca"
                            >
                              + Marca
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="clients.edit">
                            <button
                              type="button"
                              onClick={() => openEditClientModal(client)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="clients.delete">
                            <button
                              type="button"
                              onClick={() => handleDeleteClient(client)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NATIVO CLIENTE (ESTILO TIPO APP MODERNO PROFESIONAL) */}
      <dialog
        ref={clientDialogRef}
        closedby="any"
        aria-labelledby="modal-client-title"
        className="m-auto p-0 border-0 outline-none bg-transparent max-w-4xl w-[95vw] sm:w-[880px]"
      >
        <div
          className="border rounded-[24px] sm:rounded-[28px] shadow-2xl overflow-hidden h-[85vh] max-h-[85vh] flex flex-col transition-colors duration-200"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Barra Handle Móvil tipo Sheet */}
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 sm:hidden shrink-0" />

          {/* CABECERA TIPO APP */}
          <div
            className="px-5 sm:px-6 py-3.5 sm:py-4.5 border-b flex items-center justify-between gap-3 shrink-0"
            style={{ borderColor: 'var(--app-border)' }}
          >
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--app-primary) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--app-primary) 25%, transparent)',
                  color: 'var(--app-primary)',
                }}
              >
                {editingClient ? <Edit3 className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--app-primary) 12%, transparent)',
                      color: 'var(--app-primary)',
                    }}
                  >
                    {editingClient ? 'MODO EDICIÓN' : 'NUEVA CUENTA'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px] sm:max-w-[220px]">
                    • {tenant.companyInfo?.commercialName || tenant.name}
                  </span>
                </div>
                <h3 id="modal-client-title" className="text-base sm:text-lg font-black tracking-tight mt-0.5 truncate">
                  {editingClient ? `Editar ${clientSingular}` : `Nuevo ${clientSingular}`}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  Registra la razón social, datos tributarios y canales de comunicación directa.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => clientDialogRef.current?.close()}
              className="w-8 h-8 rounded-full border flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition shrink-0 cursor-pointer hover:bg-slate-500/10"
              style={{
                borderColor: 'var(--app-border)',
              }}
              title="Cerrar modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* FORMULARIO ESTRUCTURADO TIPO APP */}
          <form onSubmit={handleSaveClient} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* CUERPO SCROLLEABLE */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 overscroll-contain">
            {/* SECCIÓN 1: IDENTIFICACIÓN FISCAL */}
            <div
              className="p-4 rounded-2xl border space-y-3.5 transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--app-border)' }}>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" style={{ color: 'var(--app-primary)' }} />
                  1. Razón Social & Tributación
                </span>
                <span className="text-[10px] font-bold text-slate-400">Requerido</span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                  Nombre Completo / Razón Social <span className="text-rose-500">*</span>
                </label>
                <div
                  className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                  style={{
                    backgroundColor: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                  }}
                >
                  <Building className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    required
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    placeholder="Ej. Corporación Creativa S.A.C."
                    className="w-full bg-transparent text-xs font-semibold outline-none"
                    style={{ color: 'var(--app-text)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Tipo de Documento <span className="text-rose-500">*</span>
                  </label>
                  <div
                    className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20 relative"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <FileText className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <select
                      value={clientForm.documentType}
                      onChange={(e) =>
                        setClientForm({ ...clientForm, documentType: e.target.value as any })
                      }
                      className="w-full bg-transparent text-xs font-semibold outline-none cursor-pointer appearance-none pr-6"
                      style={{ color: 'var(--app-text)' }}
                    >
                      <option value="RUC" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">RUC (Empresa)</option>
                      <option value="DNI" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">DNI (Persona)</option>
                      <option value="CE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Carné Extranjería</option>
                      <option value="PASAPORTE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Pasaporte</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
                  </div>
                </div>

                <div className="sm:col-span-7">
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Número de {clientForm.documentType} <span className="text-rose-500">*</span>
                  </label>
                  <div
                    className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <Hash className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      required
                      value={clientForm.documentNumber}
                      onChange={(e) =>
                        setClientForm({ ...clientForm, documentNumber: e.target.value })
                      }
                      placeholder={clientForm.documentType === 'RUC' ? '20601234567' : '71234567'}
                      className="w-full bg-transparent font-mono-pin text-xs font-bold outline-none tracking-wider"
                      style={{ color: 'var(--app-text)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: CANALES DE CONTACTO */}
            <div
              className="p-4 rounded-2xl border space-y-3.5 transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--app-border)' }}>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                  2. Canales de Contacto Directo
                </span>
                <span className="text-[10px] font-bold text-slate-400">Atención & Notificaciones</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    WhatsApp Comercial <span className="text-rose-500">*</span>
                  </label>
                  <div
                    className="flex items-center rounded-xl border overflow-hidden transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <div
                      className="px-2.5 py-2.5 bg-emerald-500/10 border-r flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-black shrink-0"
                      style={{ borderColor: 'var(--app-border)' }}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WA</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={clientForm.whatsapp}
                      onChange={(e) =>
                        setClientForm({ ...clientForm, whatsapp: e.target.value })
                      }
                      placeholder="+51 999 888 777"
                      className="w-full px-3 py-2.5 bg-transparent text-xs font-semibold outline-none"
                      style={{ color: 'var(--app-text)' }}
                    />
                  </div>
                </div>

                {/* Correo Electrónico */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Correo Electrónico <span className="text-[11px] font-normal text-slate-400">(Opcional)</span>
                  </label>
                  <div
                    className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="email"
                      value={clientForm.email}
                      onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                      placeholder="contacto@empresa.com"
                      className="w-full bg-transparent text-xs font-semibold outline-none"
                      style={{ color: 'var(--app-text)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: MARCAS COMERCIALES ASIGNADAS */}
            <div
              className="p-4 sm:p-5 rounded-2xl border space-y-4 transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--app-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Tags className="w-3.5 h-3.5 text-indigo-500" />
                    3. Marcas Comerciales & Portafolio
                  </span>
                  <span
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--app-primary) 12%, transparent)',
                      color: 'var(--app-primary)',
                    }}
                  >
                    {clientForm.brands.filter((b) => b.name.trim()).length} {clientForm.brands.filter((b) => b.name.trim()).length === 1 ? 'marca activa' : 'marcas activas'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddBrandDraft}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold text-white shadow-2xs transition flex items-center gap-1 cursor-pointer hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: 'var(--app-primary)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Marca</span>
                </button>
              </div>

              {/* LISTA DE MARCAS DEL CLIENTE */}
              <div className="space-y-3.5">
                {clientForm.brands.map((brand, bIdx) => (
                  <div
                    key={brand.id || `brand-draft-${bIdx}`}
                    className="p-3.5 sm:p-4 rounded-xl border space-y-3 transition-all relative group"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                      borderLeftWidth: '4px',
                      borderLeftColor: brand.brandColor || BRAND_COLORS[bIdx % BRAND_COLORS.length],
                    }}
                  >
                    {/* Encabezado de la Marca Individual */}
                    <div className="flex items-center justify-between gap-2 border-b pb-2" style={{ borderColor: 'var(--app-border)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-2xs"
                          style={{ backgroundColor: brand.brandColor || BRAND_COLORS[bIdx % BRAND_COLORS.length] }}
                        >
                          {bIdx + 1}
                        </span>
                        <span className="font-extrabold text-xs truncate" style={{ color: 'var(--app-text)' }}>
                          {brand.name.trim() ? brand.name : `Marca #${bIdx + 1} (Sin Nombre)`}
                        </span>
                        {bIdx === 0 && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                            Principal
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {clientForm.brands.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBrandDraft(bIdx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                            title="Quitar esta marca del cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nombre de la Marca */}
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                        Nombre de la Marca Comercial <span className="text-rose-500">*</span>
                      </label>
                      <div
                        className="flex items-center rounded-xl border px-3 py-2 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                          borderColor: 'var(--app-border)',
                        }}
                      >
                        <Tags className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                        <input
                          type="text"
                          value={brand.name}
                          onChange={(e) => handleUpdateBrandDraft(bIdx, { name: e.target.value })}
                          placeholder="Ej. Nike Perú, Café Roma, Studio Glow..."
                          className="w-full bg-transparent text-xs font-semibold outline-none"
                          style={{ color: 'var(--app-text)' }}
                        />
                      </div>
                    </div>

                    {/* Logo de la Marca */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>Logo de la Marca</span>
                        </label>

                        {/* Switcher Upload vs URL */}
                        <div
                          className="p-0.5 rounded-lg border flex items-center gap-1 text-[10px] font-bold"
                          style={{
                            borderColor: 'var(--app-border)',
                            backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleUpdateBrandDraft(bIdx, { logoInputMode: 'upload' })}
                            className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                              brand.logoInputMode === 'upload'
                                ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                            }`}
                          >
                            <Upload className="w-3 h-3" />
                            <span>Subir Imagen</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateBrandDraft(bIdx, { logoInputMode: 'url' })}
                            className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                              brand.logoInputMode === 'url'
                                ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                            }`}
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Enlace / URL</span>
                          </button>
                        </div>
                      </div>

                      {brand.logoInputMode === 'upload' ? (
                        <label
                          className="border-2 border-dashed rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition hover:border-indigo-500 hover:bg-slate-500/5 group"
                          style={{ borderColor: 'var(--app-border)' }}
                        >
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            onChange={(e) => handleBrandDraftLogoFileUpload(bIdx, e.target.files?.[0])}
                            className="hidden"
                          />
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Upload className="w-3.5 h-3.5" />
                          </div>
                          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                            Subir imagen de logo (PNG, JPG, SVG o WebP hasta 5MB)
                          </p>
                        </label>
                      ) : (
                        <div
                          className="flex items-center rounded-xl border px-3 py-2 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                            borderColor: 'var(--app-border)',
                          }}
                        >
                          <Globe className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                          <input
                            type="url"
                            value={brand.logoUrl}
                            onChange={(e) => handleUpdateBrandDraft(bIdx, { logoUrl: e.target.value })}
                            placeholder="https://ejemplo.com/logos/mi-marca.png"
                            className="w-full bg-transparent text-xs font-semibold outline-none"
                            style={{ color: 'var(--app-text)' }}
                          />
                        </div>
                      )}

                      {brand.logoUrl && (
                        <div
                          className="p-2 rounded-xl border flex items-center justify-between gap-2.5"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                            borderColor: 'var(--app-border)',
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg border bg-white dark:bg-slate-900 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                              <img
                                src={brand.logoUrl}
                                alt="Vista previa del logo"
                                className="max-h-full max-w-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                  Logo cargado
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-[280px] font-mono mt-0.5">
                                {brand.logoUrl.startsWith('data:') ? 'Imagen Base64 cargada' : brand.logoUrl}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUpdateBrandDraft(bIdx, { logoUrl: '' })}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer text-xs font-bold flex items-center gap-1 shrink-0"
                            title="Quitar logo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Quitar</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Rubro y Color Identificador */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                          Rubro o Giro
                        </label>
                        <div
                          className="flex items-center rounded-xl border px-3 py-1.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                            borderColor: 'var(--app-border)',
                          }}
                        >
                          <Building className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                          <input
                            type="text"
                            value={brand.industry}
                            onChange={(e) => handleUpdateBrandDraft(bIdx, { industry: e.target.value })}
                            placeholder="Moda, Gastronomía, Tech..."
                            className="w-full bg-transparent text-xs font-semibold outline-none"
                            style={{ color: 'var(--app-text)' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                          Color Identificador
                        </label>
                        <div
                          className="flex items-center gap-1.5 p-1 rounded-xl border"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                            borderColor: 'var(--app-border)',
                          }}
                        >
                          {BRAND_COLORS.slice(0, 6).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => handleUpdateBrandDraft(bIdx, { brandColor: c })}
                              className={`w-5 h-5 rounded-full transition cursor-pointer ${
                                (brand.brandColor || BRAND_COLORS[bIdx % BRAND_COLORS.length]).toLowerCase() === c.toLowerCase()
                                  ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-2xs'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                          <input
                            type="color"
                            value={brand.brandColor || BRAND_COLORS[bIdx % BRAND_COLORS.length]}
                            onChange={(e) => handleUpdateBrandDraft(bIdx, { brandColor: e.target.value })}
                            className="w-6 h-6 rounded-md cursor-pointer border-0 bg-transparent shrink-0 ml-auto"
                            title="Color personalizado"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Red Social / Web */}
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                        Red Social / Web <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
                      </label>
                      <div
                        className="flex items-center rounded-xl border px-3 py-1.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                          borderColor: 'var(--app-border)',
                        }}
                      >
                        <Globe className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                        <input
                          type="text"
                          value={brand.socialHandle}
                          onChange={(e) => handleUpdateBrandDraft(bIdx, { socialHandle: e.target.value })}
                          placeholder="@marca_oficial o https://..."
                          className="w-full bg-transparent text-xs font-semibold outline-none"
                          style={{ color: 'var(--app-text)' }}
                        />
                      </div>
                    </div>

                    {/* SERVICIO CONTRATADO O MEMBRESÍA DE LA MARCA */}
                    <BrandServiceContractSection
                      serviceType={brand.serviceType}
                      serviceName={brand.serviceName}
                      servicePrice={brand.servicePrice}
                      serviceDescription={brand.serviceDescription}
                      serviceMonths={brand.serviceMonths}
                      servicePaymentDate={brand.servicePaymentDate}
                      servicePaymentDay={brand.servicePaymentDay}
                      includedServices={brand.includedServices}
                      services={services}
                      currencySymbol={tenant.customization?.currencySymbol || 'S/'}
                      onChange={(patch) => handleUpdateBrandDraft(bIdx, patch)}
                      toast={toast}
                    />
                  </div>
                ))}
              </div>

              {/* Botón Grande "+ Agregar otra marca" */}
              <button
                type="button"
                onClick={handleAddBrandDraft}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-indigo-400/40 hover:border-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar otra marca a este cliente</span>
              </button>
            </div>

            {/* SECCIÓN 4: NOTAS Y OBSERVACIONES */}
            <div
              className="p-4 rounded-2xl border space-y-2.5 transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                borderColor: 'var(--app-border)',
              }}
            >
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  4. Notas, Acuerdos u Observaciones Internas
                </span>
                <span className="text-[10px] font-normal text-slate-400">Opcional</span>
              </label>
              <textarea
                rows={2}
                value={clientForm.notes}
                onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                placeholder="Condiciones comerciales, horarios de contacto, preferencias creativas..."
                className="w-full rounded-xl border px-3.5 py-2.5 text-xs font-medium outline-none resize-none transition focus:ring-2 focus:ring-indigo-500/20"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text)',
                }}
              />
            </div>

            </div>

            {/* BARRA DE ACCIÓN TIPO APP (FOOTER FIJO EN LA BASE) */}
            <div
              className="shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 border-t flex items-center justify-between gap-3"
              style={{
                borderColor: 'var(--app-border)',
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 97%, var(--app-bg) 3%)',
              }}
            >
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="hidden sm:inline">Aislado para el tenant activo</span>
                <span className="sm:hidden text-[10px]">* Requerido</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => clientDialogRef.current?.close()}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs font-bold transition hover:bg-slate-500/10 cursor-pointer"
                  style={{
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text)',
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingClient}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--app-primary)',
                  }}
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>
                    {savingClient
                      ? 'Guardando...'
                      : editingClient
                      ? 'Actualizar Ficha'
                      : `Guardar ${clientSingular}`}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </dialog>

      {/* OFFCANVAS DERECHA MARCA (DRAWER SLIDE-IN A LA DERECHA) */}
      <dialog
        ref={brandDialogRef}
        closedby="any"
        aria-labelledby="offcanvas-brand-title"
        className="offcanvas-right fixed inset-y-0 right-0 m-0 ml-auto h-screen h-[100dvh] max-h-[100dvh] w-full sm:w-[540px] md:w-[600px] max-w-full p-0 border-0 outline-none bg-transparent"
      >
        <div
          className="h-full w-full border-l shadow-2xl flex flex-col transition-colors duration-200 overflow-hidden"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
            boxShadow: '-15px 0 50px -10px rgba(0, 0, 0, 0.45)',
          }}
        >
          {/* Header Marca */}
          <div
            className="px-5 sm:px-6 py-4 border-b flex items-center justify-between gap-3 shrink-0"
            style={{ borderColor: 'var(--app-border)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--app-primary) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--app-primary) 25%, transparent)',
                  color: 'var(--app-primary)',
                }}
              >
                <Tags className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--app-primary) 12%, transparent)',
                      color: 'var(--app-primary)',
                    }}
                  >
                    IDENTIDAD VISUAL
                  </span>
                  {targetClientForBrand && (
                    <span className="text-[11px] font-bold text-slate-400 truncate hidden sm:inline">
                      • {targetClientForBrand.name}
                    </span>
                  )}
                </div>
                <h3 id="offcanvas-brand-title" className="text-base font-black tracking-tight mt-0.5 truncate">
                  {editingBrand ? 'Editar Marca' : 'Nueva Marca Asignada'}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => brandDialogRef.current?.close()}
              className="w-8 h-8 rounded-full border flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition shrink-0 cursor-pointer hover:bg-slate-500/10"
              style={{ borderColor: 'var(--app-border)' }}
              title="Cerrar panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveBrand} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 overscroll-contain">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                  Nombre de la Marca <span className="text-rose-500">*</span>
                </label>
                <div
                  className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                    borderColor: 'var(--app-border)',
                  }}
                >
                  <Tags className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    required
                    value={brandForm.name}
                    onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                    placeholder="Ej. Nova Drinks, Studio Glow..."
                    className="w-full bg-transparent text-xs font-semibold outline-none"
                    style={{ color: 'var(--app-text)' }}
                  />
                </div>
              </div>

              {/* Logo de la Marca: Subir archivo o Enlace URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Logo de la Marca</span>
                  </label>

                  {/* Switcher: Subir Archivo vs Enlace URL */}
                  <div
                    className="p-0.5 rounded-lg border flex items-center gap-1 text-[10px] font-bold"
                    style={{
                      borderColor: 'var(--app-border)',
                      backgroundColor: 'var(--app-surface)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setBrandLogoInputMode('upload')}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        brandLogoInputMode === 'upload'
                          ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Subir Imagen</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBrandLogoInputMode('url')}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        brandLogoInputMode === 'url'
                          ? 'bg-indigo-600 text-white shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>Enlace / URL</span>
                    </button>
                  </div>
                </div>

                {/* Opción 1: Subida de archivo */}
                {brandLogoInputMode === 'upload' ? (
                  <label
                    className="border-2 border-dashed rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition hover:border-indigo-500 hover:bg-slate-500/5 group"
                    style={{ borderColor: 'var(--app-border)' }}
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => handleBrandLogoFileUpload(e.target.files?.[0])}
                      className="hidden"
                    />
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Haz clic aquí para subir la imagen del logo
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PNG, JPG, SVG o WebP (Hasta 5MB)
                      </p>
                    </div>
                  </label>
                ) : (
                  /* Opción 2: Enlace URL */
                  <div
                    className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <Globe className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="url"
                      value={brandForm.logoUrl}
                      onChange={(e) => setBrandForm({ ...brandForm, logoUrl: e.target.value })}
                      placeholder="https://ejemplo.com/logos/mi-marca.png"
                      className="w-full bg-transparent text-xs font-semibold outline-none"
                      style={{ color: 'var(--app-text)' }}
                    />
                  </div>
                )}

                {/* Previsualización del Logo si existe */}
                {brandForm.logoUrl && (
                  <div
                    className="p-2.5 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in duration-150"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg border bg-white dark:bg-slate-900 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        <img
                          src={brandForm.logoUrl}
                          alt="Vista previa del logo"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Logo de marca cargado
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-[280px] font-mono mt-0.5">
                          {brandForm.logoUrl.startsWith('data:') ? 'Imagen Base64 cargada' : brandForm.logoUrl}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBrandForm({ ...brandForm, logoUrl: '' })}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer text-xs font-bold flex items-center gap-1 shrink-0"
                      title="Quitar logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Quitar</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Rubro o Giro
                  </label>
                  <div
                    className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <Building className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      value={brandForm.industry}
                      onChange={(e) => setBrandForm({ ...brandForm, industry: e.target.value })}
                      placeholder="Gastronomía, Moda..."
                      className="w-full bg-transparent text-xs font-semibold outline-none"
                      style={{ color: 'var(--app-text)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Red Social / Web
                  </label>
                  <div
                    className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <Globe className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      value={brandForm.socialHandle}
                      onChange={(e) => setBrandForm({ ...brandForm, socialHandle: e.target.value })}
                      placeholder="@marca_oficial"
                      className="w-full bg-transparent text-xs font-semibold outline-none"
                      style={{ color: 'var(--app-text)' }}
                    />
                  </div>
                </div>
              </div>

              {/* SERVICIO CONTRATADO O MEMBRESÍA DE LA MARCA */}
              <BrandServiceContractSection
                serviceType={brandForm.serviceType}
                serviceName={brandForm.serviceName}
                servicePrice={brandForm.servicePrice}
                serviceDescription={brandForm.serviceDescription}
                serviceMonths={brandForm.serviceMonths}
                servicePaymentDate={brandForm.servicePaymentDate}
                servicePaymentDay={brandForm.servicePaymentDay}
                includedServices={brandForm.includedServices}
                services={services}
                currencySymbol={tenant.customization?.currencySymbol || 'S/'}
                onChange={(patch) => setBrandForm((prev) => ({ ...prev, ...patch }))}
                toast={toast}
              />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Color Identificador
                  </label>
                  <span className="font-mono-pin text-[11px] font-bold text-slate-400">
                    {brandForm.brandColor || BRAND_COLORS[0]}
                  </span>
                </div>
                <div
                  className="p-3 rounded-2xl border flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                    borderColor: 'var(--app-border)',
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {BRAND_COLORS.slice(0, 7).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBrandForm({ ...brandForm, brandColor: c })}
                        className={`w-6 h-6 rounded-full transition ${
                          (brandForm.brandColor || BRAND_COLORS[0]).toLowerCase() === c.toLowerCase()
                            ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-xs'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={brandForm.brandColor || BRAND_COLORS[0]}
                    onChange={(e) => setBrandForm({ ...brandForm, brandColor: e.target.value })}
                    className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                    title="Color personalizado"
                  />
                </div>
              </div>
            </div>

            {/* BARRA DE ACCIÓN TIPO APP (FOOTER FIJO EN LA BASE) */}
            <div
              className="shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 border-t flex items-center justify-end gap-2.5"
              style={{
                borderColor: 'var(--app-border)',
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 97%, var(--app-bg) 3%)',
              }}
            >
              <button
                type="button"
                onClick={() => brandDialogRef.current?.close()}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs font-bold transition hover:bg-slate-500/10 cursor-pointer"
                style={{
                  borderColor: 'var(--app-border)',
                  color: 'var(--app-text)',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingBrand}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--app-primary)' }}
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{savingBrand ? 'Guardando...' : editingBrand ? 'Actualizar Marca' : 'Asignar Marca'}</span>
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
};
