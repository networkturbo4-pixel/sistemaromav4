import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  FileText,
  Download,
  Eye,
  X,
  CreditCard,
  User,
  ShieldCheck,
  TrendingUp,
  Share2,
  Printer,
  MessageCircle,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Award,
  Landmark,
} from 'lucide-react';
import { EmployeeProfile, Tenant, CompanyInfo, EmployeePaymentRecord } from '../../shared/types';
import { copyTextToClipboard } from '../utils/clipboard';

interface PublicEmployeePaymentsViewProps {
  token: string;
}

export const PublicEmployeePaymentsView: React.FC<PublicEmployeePaymentsViewProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  const [inspectVoucher, setInspectVoucher] = useState<{ url: string; concept: string; date: string } | null>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Forzar SIEMPRE Modo Claro en esta vista pública oficial
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    return () => {
      if (hadDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      }
    };
  }, []);

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/personal/${token}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Enlace no válido o colaborador no encontrado');
        }
        const data = await res.json();
        setEmployee(data.employee);
        setTenant(data.tenant);
        setCompanyInfo(data.companyInfo);
      } catch (err: any) {
        setError(err.message || 'Error al cargar la información');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  const handleCopyLink = async () => {
    await copyTextToClipboard(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!employee || !tenant) return;
    const text = `Hola ${employee.userName || ''}, aquí tienes tu Portal Oficial de Pagos y Haberes de ${tenant.name}: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3 shadow-md" />
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
          Cargando ficha oficial de haberes...
        </p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
          <X className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Portal de Pagos no disponible</h2>
        <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
          {error || 'El enlace tokenizado no es válido o ha sido revocado por administración.'}
        </p>
      </div>
    );
  }

  const payments: EmployeePaymentRecord[] = employee.payments || [];
  const totalPaid = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const currencySymbol = employee.salaryCurrency === 'USD' ? '$' : 'S/.';
  const agencyName = companyInfo?.commercialName || tenant?.name || 'Roma Agencia';

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 pb-12 print:bg-white print:pb-0 font-sans antialiased">
      {/* 1. BARRA DE HERRAMIENTAS SUPERIOR FIJA / STICKY (NO SE IMPRIME) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Izquierda: Badge y Título */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  Ficha Oficial de Personal & Haberes
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Verificado
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {agencyName} • <span className="font-bold text-slate-700">{employee.userName}</span>
              </p>
            </div>
          </div>

          {/* Derecha: Botón de Opciones (Imprimir, Compartir, Copiar) */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setActionsMenuOpen((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Opciones</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  actionsMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {actionsMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 animate-fadeIn">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Imprimir / Guardar en PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50/70 flex items-center gap-2.5 transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Compartir por WhatsApp</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-600">¡Enlace copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Copiar enlace directo</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. CONTENEDOR PRINCIPAL TIPO DOCUMENTO OFICIAL */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-8 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-10 space-y-7 print:p-0 print:border-none print:shadow-none">
          
          {/* CABECERA CORPORATIVA CON LOGO Y DATOS DE LA EMPRESA */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-200">
            {/* Logo y Razón Social */}
            <div className="space-y-2">
              {tenant?.customization.logoLightUrl ? (
                <img
                  src={tenant.customization.logoLightUrl}
                  alt={agencyName}
                  className="h-10 sm:h-12 w-auto max-w-[170px] object-contain"
                />
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {agencyName.charAt(0)}
                  </div>
                  <span className="font-black text-xl tracking-tight text-slate-900">
                    {agencyName}
                  </span>
                </div>
              )}

              <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                {companyInfo?.legalName && (
                  <p className="font-bold text-slate-800">{companyInfo.legalName}</p>
                )}
                {companyInfo?.taxId && (
                  <p className="font-mono text-slate-600">
                    RUC / Identificación Fiscal: <strong>{companyInfo.taxId}</strong>
                  </p>
                )}
                {companyInfo?.address && (
                  <p className="text-slate-500">{companyInfo.address}</p>
                )}
              </div>
            </div>

            {/* Certificación y Folio */}
            <div className="sm:text-right space-y-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                Documento Oficial de Nómina
              </span>

              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Identificador Único
                </span>
                <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                  EMP-{employee.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div className="text-[11px] text-slate-400">
                Fecha de Emisión: <strong className="text-slate-700 font-mono">{new Date().toLocaleDateString('es-PE')}</strong>
              </div>
            </div>
          </div>

          {/* FICHA DETALLADA DEL COLABORADOR */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Información Personal */}
              <div className="flex items-start gap-4">
                {employee.userAvatar ? (
                  <img
                    src={employee.userAvatar}
                    alt={employee.userName}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-purple-600 text-white font-black text-2xl flex items-center justify-center shadow-sm shrink-0">
                    {(employee.userName || 'C').charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">
                      {employee.userName}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {employee.status === 'active' ? 'Personal Activo' : employee.status}
                    </span>
                  </div>

                  <p className="text-xs font-black text-purple-700 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    {employee.jobTitle || 'Colaborador de Equipo'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 pt-1.5">
                    <div>
                      <span className="text-slate-400 font-bold">{employee.documentType || 'DNI'}: </span>
                      <strong className="font-mono text-slate-800">{employee.documentNumber || 'No registrado'}</strong>
                    </div>

                    {employee.hireDate && (
                      <div>
                        <span className="text-slate-400 font-bold">Fecha de Ingreso: </span>
                        <strong className="font-mono text-slate-800">{employee.hireDate}</strong>
                      </div>
                    )}

                    {employee.entryTime && employee.exitTime && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 font-bold">Horario Oficial: </span>
                        <strong className="font-mono text-slate-800">{employee.entryTime} - {employee.exitTime}</strong>
                      </div>
                    )}

                    {employee.bankAccount?.bankName && (
                      <div className="sm:col-span-2 pt-1 border-t border-slate-200/60 mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Banco: <strong className="text-slate-800">{employee.bankAccount.bankName}</strong></span>
                        <span className="mx-1">•</span>
                        <span>Cuenta: <strong className="font-mono text-slate-800">{employee.bankAccount.accountNumber}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tarjeta de Salario Pactado */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 lg:text-right shadow-2xs shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                  Remuneración Mensual Pactada
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
                  {currencySymbol} {Number(employee.salary || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-slate-500 font-medium block mt-1">
                  Modalidad de Abono: <strong className="capitalize text-slate-700">{employee.paymentFrequency === 'monthly' ? 'Mensual' : employee.paymentFrequency}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* TARJETAS RESUMEN DE INDICADORES (MODO CLARO) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Total Percibido Acumulado
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                {currencySymbol} {totalPaid.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500">
                Suma consolidada de haberes abonados
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Comprobantes Registrados
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {payments.length}
              </div>
              <p className="text-[11px] text-slate-500">
                Recibos y liquidaciones con voucher
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Último Abono Realizado
              </span>
              <div className="text-base sm:text-lg font-black text-purple-700 font-mono truncate">
                {payments[0]?.paymentDate || 'Sin abonos aún'}
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {payments[0]?.periodConcept || 'Pendiente de primer ciclo'}
              </p>
            </div>
          </div>

          {/* HISTORIAL CRONOLÓGICO DE PAGOS */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Historial Cronológico de Abonos & Vouchers
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {payments.length} {payments.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Aún no se han registrado abonos</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Tus recibos de pago y constancias de transferencia bancaria aparecerán listados aquí en cuanto la administración procese la liquidación.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                {payments.map((p) => {
                  const pSymbol = p.currency === 'USD' ? '$' : 'S/.';
                  return (
                    <div
                      key={p.id}
                      className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Concepto y Metadatos */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                            {p.periodConcept}
                          </span>
                          <span className="text-xs font-bold text-slate-500 font-mono flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {p.paymentDate}
                            {p.paymentTime && ` • ${p.paymentTime}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <span>
                            Método: <strong className="text-slate-900">{p.paymentMethod}</strong>
                          </span>
                          {p.operationNumber && (
                            <span>
                              N° Op: <strong className="font-mono text-slate-900 font-bold">{p.operationNumber}</strong>
                            </span>
                          )}
                        </div>

                        {p.notes && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 inline-block">
                            {p.notes}
                          </p>
                        )}
                      </div>

                      {/* Monto y Botón de Voucher */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block uppercase font-bold text-[10px]">
                            Monto Abonado
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono tracking-tight">
                            {pSymbol} {Number(p.amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {p.voucherUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setInspectVoucher({
                                url: p.voucherUrl!,
                                concept: p.periodConcept,
                                date: p.paymentDate,
                              })
                            }
                            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Voucher</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            Sin comprobante
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PIE DE DOCUMENTO / CERTIFICACIÓN */}
          <div className="pt-6 border-t border-slate-200 text-center space-y-1">
            <p className="text-xs text-slate-500 font-medium">
              Documento digital oficial emitido por <strong>{agencyName}</strong>. Todos los derechos reservados.
            </p>
            <p className="text-[11px] text-slate-400">
              Este reporte es confidencial y ha sido generado mediante firma y token digital para uso exclusivo del colaborador.
            </p>
          </div>
        </div>
      </div>

      {/* 3. LIGHTBOX ELEGANTE PARA INSPECCIÓN DE VOUCHER */}
      {inspectVoucher && (
        <div
          onClick={() => setInspectVoucher(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] cursor-default animate-in zoom-in-95 duration-150"
          >
            {/* Cabecera del Lightbox */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 inline-block mb-1">
                  Comprobante de Transferencia
                </span>
                <h4 className="text-sm font-black text-slate-900">
                  {inspectVoucher.concept} ({inspectVoucher.date})
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={inspectVoucher.url}
                  download={`voucher-${inspectVoucher.date}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                  title="Descargar voucher"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setInspectVoucher(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Imagen del Voucher */}
            <div className="p-4 sm:p-6 overflow-y-auto flex items-center justify-center bg-slate-900/5">
              <img
                src={inspectVoucher.url}
                alt="Comprobante de pago"
                className="max-h-[65vh] w-auto max-w-full rounded-2xl shadow-md object-contain border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
