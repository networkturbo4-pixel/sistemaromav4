import React from 'react';
import {
  QuoteItem,
  QuoteGanttPhase,
  QuotePaymentMethod,
  ProposalTheme,
  QuoteStatus,
  Tenant,
} from '../../shared/types';
import {
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  CreditCard,
  Layers,
  Sparkles,
  User,
  PanelRightClose,
  ShieldCheck,
  Check,
} from 'lucide-react';

export interface QuoteFormData {
  code: string;
  clientId: string;
  clientName: string;
  companyName: string;
  documentType: string;
  documentNumber: string;
  whatsapp: string;
  email: string;
  issueDate: string;
  validUntil: string;
  currency: 'PEN' | 'USD' | 'EUR';
  currencySymbol: string;
  status: QuoteStatus;
  theme: ProposalTheme;
  items: QuoteItem[];
  subtotal: number;
  includeTax: boolean;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  showGantt: boolean;
  ganttPhases: QuoteGanttPhase[];
  additionalNotes: string;
  termsAndConditions: string;
  showPaymentMethods: boolean;
  paymentMethods: QuotePaymentMethod[];
}

interface QuoteLivePreviewProps {
  formData: QuoteFormData;
  tenant: Tenant | null;
  onClose?: () => void;
}

const THEME_ACCENTS: Record<string, { primary: string; lightBg: string; text: string; border: string }> = {
  'corporate-blue': { primary: '#1d4ed8', lightBg: 'bg-blue-50/80', text: 'text-blue-700', border: 'border-blue-600' },
  'emerald-executive': { primary: '#047857', lightBg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-600' },
  'modern-violet': { primary: '#7c3aed', lightBg: 'bg-indigo-50/80', text: 'text-indigo-700', border: 'border-indigo-600' },
  'minimal-black': { primary: '#0f172a', lightBg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-800' },
  'amber-luxury': { primary: '#b45309', lightBg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-600' },
  'crimson-red': { primary: '#be123c', lightBg: 'bg-rose-50/80', text: 'text-rose-700', border: 'border-rose-600' },
  'tech-cyan': { primary: '#0e7490', lightBg: 'bg-cyan-50/80', text: 'text-cyan-700', border: 'border-cyan-600' },
  'roma-gradient': { primary: '#1e293b', lightBg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-800' },
};

const STATUS_LABELS: Record<QuoteStatus, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  sent: { label: 'Enviado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { label: 'Aprobado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rechazado', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  expired: { label: 'Vencido', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const QuoteLivePreview: React.FC<QuoteLivePreviewProps> = ({
  formData,
  tenant,
  onClose,
}) => {
  const company = tenant?.companyInfo || {};
  const commercialName = company.commercialName || company.brandName || tenant?.name || 'ROMA Agencia';
  const logoUrl = tenant?.customization?.logoLightUrl || tenant?.customization?.logoDarkUrl;
  const themeAccent = THEME_ACCENTS[formData.theme] || THEME_ACCENTS['modern-violet'];
  const statusInfo = STATUS_LABELS[formData.status] || STATUS_LABELS.draft;

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
      {/* HEADER DEL PANEL DE PREVISUALIZACIÓN */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Vista Previa de Cotización
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
            En vivo
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Ocultar previsualización"
            className="p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <PanelRightClose className="w-4 h-4" />
            <span className="hidden sm:inline">Ocultar</span>
          </button>
        )}
      </div>

      {/* CUERPO DEL DOCUMENTO SIMULADO (ESTILO PAPEL EJECUTIVO) */}
      <div className="p-4 sm:p-6 space-y-5 text-slate-800 dark:text-slate-200 text-xs">
        
        {/* Cabecera de la Agencia */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={commercialName} className="h-9 max-w-[140px] object-contain" />
            ) : (
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-sm"
                style={{ backgroundColor: themeAccent.primary }}
              >
                R
              </div>
            )}
            <div>
              <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {commercialName}
              </h3>
              {company.taxId && (
                <p className="text-[11px] text-slate-500 font-medium">RUC: {company.taxId}</p>
              )}
              {company.email && (
                <p className="text-[10px] text-slate-400">{company.email}</p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-[11px] font-black uppercase tracking-wider border ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
            <h4 className="text-xs font-black font-mono text-slate-900 dark:text-white">
              {formData.code || 'COT-2026-XXX'}
            </h4>
            <div className="text-[10px] text-slate-400 space-y-0.5">
              <p>Emisión: {formData.issueDate || '—'}</p>
              <p>Válido hasta: {formData.validUntil || '—'}</p>
            </div>
          </div>
        </div>

        {/* Tarjeta de Cliente */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
            <User className="w-3.5 h-3.5" style={{ color: themeAccent.primary }} />
            <span>Datos del Cliente / Destinatario</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold">Cliente / Contacto</p>
              <p className="font-extrabold text-slate-900 dark:text-slate-100">
                {formData.clientName || 'Cliente no especificado'}
              </p>
            </div>
            {formData.companyName && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">Empresa / Razón Social</p>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  {formData.companyName}
                </p>
              </div>
            )}
            {formData.documentNumber && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{formData.documentType || 'Doc'}</p>
                <p className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {formData.documentNumber}
                </p>
              </div>
            )}
            {formData.whatsapp && (
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">WhatsApp</p>
                <p className="font-medium text-slate-700 dark:text-slate-300">{formData.whatsapp}</p>
              </div>
            )}
          </div>
        </div>

        {/* Partidas / Entregables */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" style={{ color: themeAccent.primary }} />
              Partidas & Servicios ({formData.items.length})
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              Moneda: {formData.currency} ({formData.currencySymbol})
            </span>
          </div>

          {formData.items.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
              No hay partidas agregadas aún.
            </div>
          ) : (
            <div className="space-y-2">
              {formData.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                        style={{ backgroundColor: themeAccent.primary }}
                      >
                        {idx + 1}
                      </span>
                      <h5 className="font-black text-xs text-slate-900 dark:text-slate-100">
                        {item.title || 'Entregable sin título'}
                      </h5>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100">
                        {formData.currencySymbol} {(item.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {item.description && (
                    <div
                      className="text-[11px] text-slate-600 dark:text-slate-300 pl-7 prose prose-xs dark:prose-invert max-w-none [&_table]:w-full [&_table]:my-2 [&_table]:border-collapse [&_table]:text-[10px] [&_th]:border [&_th]:border-slate-200 dark:[&_th]:border-slate-700 [&_th]:p-1.5 [&_th]:bg-slate-100 dark:[&_th]:bg-slate-800 [&_th]:font-bold [&_td]:border [&_td]:border-slate-200 dark:[&_td]:border-slate-700 [&_td]:p-1.5"
                      dangerouslySetInnerHTML={{ __html: item.description }}
                    />
                  )}

                  <div className="flex items-center justify-between pl-7 text-[10px] text-slate-400">
                    <span>Cant: {item.quantity || 1} × {formData.currencySymbol} {(item.unitPrice || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                    {(item.discount || 0) > 0 && (
                      <span className="text-emerald-600 font-bold">Desc: -{formData.currencySymbol} {item.discount}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen Financiero / Totales */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex justify-between text-slate-500 font-medium">
            <span>Subtotal</span>
            <span className="font-mono">
              {formData.currencySymbol} {formData.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {formData.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Descuento Aplicado</span>
              <span className="font-mono">
                -{formData.currencySymbol} {formData.discountAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {formData.includeTax && (
            <div className="flex justify-between text-slate-500 font-medium">
              <span>IGV ({formData.taxRate || 18}%)</span>
              <span className="font-mono">
                {formData.currencySymbol} {formData.taxAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline font-black text-sm">
            <span className="text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Total Inversión
            </span>
            <span
              className="text-base font-black font-mono"
              style={{ color: themeAccent.primary }}
            >
              {formData.currencySymbol} {formData.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Cronograma / Gantt (si está activado) */}
        {formData.showGantt && formData.ganttPhases && formData.ganttPhases.length > 0 && (
          <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-950">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Cronograma Estimado ({formData.ganttPhases.length} fases)
            </span>
            <div className="space-y-1.5">
              {formData.ganttPhases.map((phase, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{phase.name}</span>
                  <span className="text-slate-400 font-mono text-[10px]">{phase.durationDays || 5} días</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cuentas Bancarias / Métodos de Pago */}
        {formData.showPaymentMethods && formData.paymentMethods && formData.paymentMethods.length > 0 && (
          <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-950">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
              Cuentas Bancarias para Abono
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {formData.paymentMethods.map((m) => (
                <div key={m.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-[11px]">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{m.bankName || m.type}</p>
                  <p className="font-mono text-[10px] text-slate-500">{m.accountNumber}</p>
                  {m.cci && <p className="font-mono text-[9px] text-slate-400">CCI: {m.cci}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas Adicionales */}
        {formData.additionalNotes && (
          <div className="text-[11px] p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
            <p className="font-bold text-[10px] uppercase mb-1">Notas & Observaciones:</p>
            <div
              className="leading-relaxed [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-bold [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-amber-200/80 [&_th]:p-1 [&_td]:border [&_td]:border-amber-200/60 [&_td]:p-1"
              dangerouslySetInnerHTML={{ __html: formData.additionalNotes }}
            />
          </div>
        )}

        {/* Términos & Condiciones */}
        {formData.termsAndConditions && (
          <div className="text-[11px] p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <p className="font-bold text-[10px] uppercase mb-1 text-slate-500">Términos & Condiciones:</p>
            <div
              className="leading-relaxed [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-bold [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:p-1 [&_td]:border [&_td]:p-1"
              dangerouslySetInnerHTML={{ __html: formData.termsAndConditions }}
            />
          </div>
        )}

        {/* Pie de Garantía */}
        <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Propuesta comercial emitida oficialmente por {commercialName}</span>
        </div>

      </div>
    </div>
  );
};
