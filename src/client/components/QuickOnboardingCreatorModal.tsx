import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Client, Service, ServiceOrder, PaymentNote } from '../../shared/types';
import {
  BrandServiceContractSection,
} from '../modules/ClientsModule';
import {
  Zap,
  Plus,
  Search,
  Building2,
  Package,
  Crown,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  CreditCard,
  Share2,
  Copy,
  ExternalLink,
  Sparkles,
  Calendar,
  Layers,
  Check,
  Smartphone,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { ActiveModule } from './AppShell';

interface QuickOnboardingCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (module: ActiveModule) => void;
}

export const QuickOnboardingCreatorModal: React.FC<QuickOnboardingCreatorModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { tenant, apiFetch, toast } = useApp();

  // Paso actual del wizard: 1 = Cliente/Marca, 2 = Servicio/Membresía, 3 = OS & Pago, 4 = Resultado Exitoso
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Datos del sistema cargados
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // PASO 1: CLIENTE
  const [clientMode, setClientMode] = useState<'search' | 'create'>('create');
  const [searchClientQuery, setSearchClientQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [newBrandForExistingClient, setNewBrandForExistingClient] = useState('');

  // Formulario nuevo cliente
  const [newClient, setNewClient] = useState({
    name: '',
    documentType: 'RUC' as 'RUC' | 'DNI' | 'CE' | 'PASAPORTE',
    documentNumber: '',
    whatsapp: '+51 ',
    email: '',
    brandName: '',
  });

  // PASO 2: CONTRATACIÓN (SERVICIO O MEMBRESÍA)
  const [serviceContract, setServiceContract] = useState<{
    serviceType: 'service' | 'membership';
    serviceName: string;
    servicePrice: number;
    serviceDescription: string;
    serviceMonths: number;
    includedServices: string[];
  }>({
    serviceType: 'service',
    serviceName: '',
    servicePrice: 0,
    serviceDescription: '',
    serviceMonths: 1,
    includedServices: [],
  });

  // PASO 3: DOCUMENTOS A GENERAR
  const [generateOS, setGenerateOS] = useState<boolean>(true);
  const [generatePaymentNote, setGeneratePaymentNote] = useState<boolean>(true);

  // Opciones de OS
  const [osDeliveryDate, setOsDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [osNotes, setOsNotes] = useState('');

  // Opciones de Nota de Pago
  const [paymentMethod, setPaymentMethod] = useState('Transferencia Bancaria BCP');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');

  // ESTADO DE EJECUCIÓN & RESULTADOS
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    clientName: string;
    brandName: string;
    order?: ServiceOrder;
    paymentNote?: PaymentNote;
  } | null>(null);

  // Cargar clientes y catálogo al abrir
  useEffect(() => {
    if (!isOpen) return;
    setLoadingData(true);
    Promise.all([
      apiFetch<{ clients: Client[] }>('/api/clients').catch(() => ({ clients: [] })),
      apiFetch<{ services: Service[] }>('/api/services').catch(() => ({ services: [] })),
    ])
      .then(([clientsRes, servicesRes]) => {
        setClients(clientsRes.clients || []);
        setServices(servicesRes.services || []);
      })
      .finally(() => setLoadingData(false));
  }, [isOpen, apiFetch]);

  // Actualizar fecha estimada de OS cuando cambian los meses de la membresía
  useEffect(() => {
    if (serviceContract.serviceType === 'membership' && serviceContract.serviceMonths) {
      const d = new Date();
      d.setMonth(d.getMonth() + serviceContract.serviceMonths);
      setOsDeliveryDate(d.toISOString().split('T')[0]);
    }
  }, [serviceContract.serviceType, serviceContract.serviceMonths]);

  if (!isOpen) return null;

  const currencySymbol = tenant.customization?.currencySymbol || 'S/';

  // Filtrado de clientes existentes
  const filteredClients = searchClientQuery.trim()
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(searchClientQuery.toLowerCase()) ||
          c.documentNumber.includes(searchClientQuery) ||
          c.brands?.some((b) => b.name.toLowerCase().includes(searchClientQuery.toLowerCase()))
      )
    : clients;

  const currentSelectedClient = clients.find((c) => c.id === selectedClientId);

  // Validación Paso 1
  const isStep1Valid = () => {
    if (clientMode === 'search') {
      if (!selectedClientId) return false;
      if (!selectedBrandId && !newBrandForExistingClient.trim()) return false;
      return true;
    } else {
      return (
        newClient.name.trim().length > 0 &&
        newClient.documentNumber.trim().length > 0 &&
        newClient.whatsapp.trim().length > 3
      );
    }
  };

  // Validación Paso 2
  const isStep2Valid = () => {
    return (
      serviceContract.serviceName.trim().length > 0 &&
      serviceContract.servicePrice >= 0
    );
  };

  // EJECUCIÓN PRINCIPAL: CREAR O VINCULAR CLIENTE + SERVICIO/MEMBRESÍA + OS Y NOTA DE PAGO
  const handleExecuteCreator = async () => {
    if (!isStep1Valid() || !isStep2Valid()) {
      toast('Por favor completa los campos requeridos.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      let finalClientId = selectedClientId;
      let finalClientName = '';
      let finalBrandId = selectedBrandId;
      let finalBrandName = '';
      let finalDocType = 'RUC';
      let finalDocNumber = '';
      let finalWhatsapp = '';
      let finalEmail = '';

      // 1. GESTIONAR CLIENTE Y MARCA
      if (clientMode === 'create') {
        const brandLabel = newClient.brandName.trim() || newClient.name.trim();
        const clientRes = await apiFetch<{ client: Client }>('/api/clients', {
          method: 'POST',
          body: JSON.stringify({
            name: newClient.name.trim(),
            documentType: newClient.documentType,
            documentNumber: newClient.documentNumber.trim(),
            whatsapp: newClient.whatsapp.trim(),
            email: newClient.email.trim() || null,
            notes: `Cliente registrado desde Creador Rápido.`,
            brands: [
              {
                name: brandLabel,
                industry: 'Servicios Profesionales',
                brandColor: '#4f46e5',
                serviceType: serviceContract.serviceType,
                serviceName: serviceContract.serviceName.trim(),
                serviceDescription: serviceContract.serviceDescription.trim(),
                servicePrice: Number(serviceContract.servicePrice) || 0,
                serviceMonths:
                  serviceContract.serviceType === 'membership'
                    ? serviceContract.serviceMonths
                    : undefined,
                includedServices: serviceContract.includedServices,
              },
            ],
          }),
        });

        finalClientId = clientRes.client.id;
        finalClientName = clientRes.client.name;
        finalDocType = clientRes.client.documentType;
        finalDocNumber = clientRes.client.documentNumber;
        finalWhatsapp = clientRes.client.whatsapp;
        finalEmail = clientRes.client.email || '';
        const createdBrand = clientRes.client.brands?.[0];
        finalBrandId = createdBrand?.id || '';
        finalBrandName = createdBrand?.name || brandLabel;
      } else {
        // Cliente existente
        if (!currentSelectedClient) throw new Error('Cliente seleccionado no válido');
        finalClientId = currentSelectedClient.id;
        finalClientName = currentSelectedClient.name;
        finalDocType = currentSelectedClient.documentType;
        finalDocNumber = currentSelectedClient.documentNumber;
        finalWhatsapp = currentSelectedClient.whatsapp;
        finalEmail = currentSelectedClient.email || '';

        if (newBrandForExistingClient.trim()) {
          // Crear marca nueva para el cliente
          const brandRes = await apiFetch<{ brand: any }>(
            `/api/clients/${finalClientId}/brands`,
            {
              method: 'POST',
              body: JSON.stringify({
                name: newBrandForExistingClient.trim(),
                industry: 'General',
                brandColor: '#4f46e5',
                serviceType: serviceContract.serviceType,
                serviceName: serviceContract.serviceName.trim(),
                serviceDescription: serviceContract.serviceDescription.trim(),
                servicePrice: Number(serviceContract.servicePrice) || 0,
                serviceMonths:
                  serviceContract.serviceType === 'membership'
                    ? serviceContract.serviceMonths
                    : undefined,
                includedServices: serviceContract.includedServices,
              }),
            }
          );
          finalBrandId = brandRes.brand.id;
          finalBrandName = brandRes.brand.name;
        } else {
          // Marca existente seleccionada: actualizarle el servicio
          const brand = currentSelectedClient.brands?.find((b) => b.id === selectedBrandId);
          finalBrandId = brand?.id || '';
          finalBrandName = brand?.name || currentSelectedClient.name;
          if (finalBrandId) {
            await apiFetch(`/api/brands/${finalBrandId}`, {
              method: 'PUT',
              body: JSON.stringify({
                serviceType: serviceContract.serviceType,
                serviceName: serviceContract.serviceName.trim(),
                serviceDescription: serviceContract.serviceDescription.trim(),
                servicePrice: Number(serviceContract.servicePrice) || 0,
                serviceMonths:
                  serviceContract.serviceType === 'membership'
                    ? serviceContract.serviceMonths
                    : undefined,
                includedServices: serviceContract.includedServices,
              }),
            });
          }
        }
      }

      let createdOrder: ServiceOrder | undefined;
      let createdPaymentNote: PaymentNote | undefined;

      // 2. GENERAR ORDEN DE SERVICIO (OS)
      if (generateOS) {
        const deliverablesList =
          serviceContract.includedServices.length > 0
            ? serviceContract.includedServices.map((item, idx) => ({
                id: `del-${Date.now()}-${idx}`,
                category: 'social_media' as any,
                title: item,
                description: `Entregable acordado en ${serviceContract.serviceName}`,
                quantity: 1,
                status: 'pending' as any,
                dueDate: osDeliveryDate,
              }))
            : [
                {
                  id: `del-${Date.now()}-1`,
                  category: 'social_media' as any,
                  title: serviceContract.serviceName,
                  description:
                    serviceContract.serviceDescription ||
                    'Ejecución del servicio contratado según alcance acordado.',
                  quantity: 1,
                  status: 'pending' as any,
                  dueDate: osDeliveryDate,
                },
              ];

        const osTitle =
          serviceContract.serviceType === 'membership'
            ? `Membresía (${serviceContract.serviceMonths}m): ${serviceContract.serviceName}`
            : `OS: ${serviceContract.serviceName}`;

        const osRes = await apiFetch<{ order: ServiceOrder }>('/api/service-orders', {
          method: 'POST',
          body: JSON.stringify({
            clientId: finalClientId,
            clientName: finalClientName,
            companyName: finalBrandName,
            brandName: finalBrandName,
            documentType: finalDocType,
            documentNumber: finalDocNumber,
            whatsapp: finalWhatsapp,
            email: finalEmail,
            title: osTitle,
            startDate: new Date().toISOString().split('T')[0],
            deliveryDate: osDeliveryDate,
            status: 'active',
            totalProgress: 0,
            deliverables: deliverablesList,
            scopeNotes:
              osNotes ||
              serviceContract.serviceDescription ||
              `Alcance acordado para ${finalBrandName}`,
          }),
        });
        createdOrder = osRes.order;
      }

      // 3. GENERAR NOTA DE PAGO
      if (generatePaymentNote) {
        const noteRes = await apiFetch<{ paymentNote: PaymentNote }>('/api/payment-notes', {
          method: 'POST',
          body: JSON.stringify({
            clientId: finalClientId,
            clientName: finalClientName,
            companyName: finalBrandName,
            brandId: finalBrandId,
            brandName: finalBrandName,
            documentType: finalDocType,
            documentNumber: finalDocNumber,
            whatsapp: finalWhatsapp,
            email: finalEmail,
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
            currency: 'PEN',
            currencySymbol,
            items: [
              {
                id: `pni-${Date.now()}`,
                title: serviceContract.serviceName,
                description:
                  serviceContract.serviceDescription ||
                  (serviceContract.serviceType === 'membership'
                    ? `Paquete de membresía (${serviceContract.serviceMonths} mes(es))`
                    : 'Servicio contratado'),
                quantity: 1,
                unitPrice: Number(serviceContract.servicePrice) || 0,
                total: Number(serviceContract.servicePrice) || 0,
              },
            ],
            subtotal: Number(serviceContract.servicePrice) || 0,
            discount: 0,
            tax: 0,
            total: Number(serviceContract.servicePrice) || 0,
            status: paymentStatus,
            paymentMethod,
          }),
        });
        createdPaymentNote = noteRes.paymentNote;
      }

      // Guardar resultados y pasar al paso de éxito
      setCreatedResult({
        clientName: finalClientName,
        brandName: finalBrandName,
        order: createdOrder,
        paymentNote: createdPaymentNote,
      });

      toast('¡Proceso completado exitosamente!', 'success');
      setStep(4);
    } catch (err: any) {
      toast(err.message || 'Error al procesar el onboarding', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Compartir por WhatsApp
  const shareOrderWhatsApp = (order: ServiceOrder) => {
    const url = `${window.location.origin}/?os=${order.publicToken}`;
    const msg = encodeURIComponent(
      `Hola *${order.clientName}*,\n\nTe compartimos tu *Orden de Servicio ${order.code}* de *${tenant.companyInfo?.brandName || tenant.name}* para *${order.brandName}*.\n\nPuedes revisar el alcance, cronograma y hoja de ruta interactiva aquí:\n${url}\n\n¡Un gusto trabajar contigo!`
    );
    window.open(`https://wa.me/${(order.whatsapp || '').replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
  };

  const sharePaymentNoteWhatsApp = (note: PaymentNote) => {
    const url = `${window.location.origin}/p/pago/${note.publicToken}`;
    const msg = encodeURIComponent(
      `Hola *${note.clientName}*,\n\nTe compartimos tu *Nota de Pago ${note.code}* por *${note.currencySymbol} ${note.total.toLocaleString('es-PE')}* correspondiente a *${note.brandName}*.\n\nPuedes verla y descargar tu comprobante aquí:\n${url}\n\n¡Muchas gracias!`
    );
    window.open(`https://wa.me/${(note.whatsapp || '').replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl max-h-[92dvh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)',
        }}
      >
        {/* HEADER DEL MODAL */}
        <div
          className="px-5 sm:px-6 py-4 border-b flex items-center justify-between gap-3 shrink-0"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Creador Integral
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {step === 4 ? 'Completado' : `Paso ${step} de 3`}
                </span>
              </div>
              <h2 className="text-base font-black tracking-tight truncate">
                {step === 1 && 'Cliente y Marca'}
                {step === 2 && 'Servicio o Membresía'}
                {step === 3 && 'Generar OS y Nota de Pago'}
                {step === 4 && '¡Todo Listo y Generado!'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition shrink-0 cursor-pointer hover:bg-slate-500/10"
            style={{ borderColor: 'var(--app-border)' }}
            title="Cerrar creador"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* INDICADOR DE PASOS */}
        {step < 4 && (
          <div
            className="px-6 py-2 border-b grid grid-cols-3 gap-2 text-center text-xs font-bold shrink-0"
            style={{
              borderColor: 'var(--app-border)',
              backgroundColor: 'color-mix(in srgb, var(--app-surface) 90%, var(--app-bg) 10%)',
            }}
          >
            <div
              className={`py-1 rounded-lg transition ${
                step === 1
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : step > 1
                  ? 'text-emerald-500'
                  : 'text-slate-400'
              }`}
            >
              1. Cliente & Marca
            </div>
            <div
              className={`py-1 rounded-lg transition ${
                step === 2
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : step > 2
                  ? 'text-emerald-500'
                  : 'text-slate-400'
              }`}
            >
              2. Servicio / Membresía
            </div>
            <div
              className={`py-1 rounded-lg transition ${
                step === 3
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-400'
              }`}
            >
              3. Generar OS & Pago
            </div>
          </div>
        )}

        {/* CUERPO DEL CREADOR (SCROLLEABLE) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 sm:p-6 space-y-4">
          {/* ===================== PASO 1: CLIENTE & MARCA ===================== */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Selector de Modo: Buscar Existente vs Crear Nuevo */}
              <div
                className="p-1 rounded-2xl border grid grid-cols-2 gap-1"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setClientMode('create')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    clientMode === 'create'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Nuevo Cliente</span>
                </button>

                <button
                  type="button"
                  onClick={() => setClientMode('search')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    clientMode === 'search'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Buscar Cliente Existente</span>
                </button>
              </div>

              {clientMode === 'create' ? (
                /* FORMULARIO NUEVO CLIENTE */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                      Nombre o Razón Social <span className="text-rose-500">*</span>
                    </label>
                    <div
                      className="flex items-center rounded-xl border px-3 py-2 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                      style={{
                        backgroundColor: 'var(--app-surface)',
                        borderColor: 'var(--app-border)',
                      }}
                    >
                      <Building2 className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        required
                        value={newClient.name}
                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                        placeholder="Ej. Inversiones Gastronómicas S.A.C."
                        className="w-full bg-transparent text-xs font-semibold outline-none"
                        style={{ color: 'var(--app-text)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                        Documento
                      </label>
                      <select
                        value={newClient.documentType}
                        onChange={(e) =>
                          setNewClient({ ...newClient, documentType: e.target.value as any })
                        }
                        className="w-full px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer outline-none bg-white dark:bg-slate-900"
                        style={{ borderColor: 'var(--app-border)', color: 'var(--app-text)' }}
                      >
                        <option value="RUC">RUC (Empresa)</option>
                        <option value="DNI">DNI (Persona)</option>
                        <option value="CE">Carné Extranjería</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                    </div>

                    <div className="sm:col-span-7">
                      <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                        Número de Documento <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newClient.documentNumber}
                        onChange={(e) =>
                          setNewClient({ ...newClient, documentNumber: e.target.value })
                        }
                        placeholder="Ej. 20601234567"
                        className="w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-indigo-500/20"
                        style={{
                          backgroundColor: 'var(--app-surface)',
                          borderColor: 'var(--app-border)',
                          color: 'var(--app-text)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                        WhatsApp de Contacto <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newClient.whatsapp}
                        onChange={(e) => setNewClient({ ...newClient, whatsapp: e.target.value })}
                        placeholder="+51 987 654 321"
                        className="w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-indigo-500/20"
                        style={{
                          backgroundColor: 'var(--app-surface)',
                          borderColor: 'var(--app-border)',
                          color: 'var(--app-text)',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                        Correo Electrónico <span className="text-[10px] text-slate-400">(Opcional)</span>
                      </label>
                      <input
                        type="email"
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        placeholder="contacto@empresa.com"
                        className="w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-indigo-500/20"
                        style={{
                          backgroundColor: 'var(--app-surface)',
                          borderColor: 'var(--app-border)',
                          color: 'var(--app-text)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                      Nombre de la Marca Comercial
                    </label>
                    <input
                      type="text"
                      value={newClient.brandName}
                      onChange={(e) => setNewClient({ ...newClient, brandName: e.target.value })}
                      placeholder="Ej. Nova Restobar (Si se deja vacío, tomará la razón social)"
                      className="w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-indigo-500/20"
                      style={{
                        backgroundColor: 'var(--app-surface)',
                        borderColor: 'var(--app-border)',
                        color: 'var(--app-text)',
                      }}
                    />
                  </div>
                </div>
              ) : (
                /* BUSCAR CLIENTE EXISTENTE */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-200">
                      Buscar Cliente Registrado
                    </label>
                    <div
                      className="flex items-center rounded-xl border px-3 py-2 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                      style={{
                        backgroundColor: 'var(--app-surface)',
                        borderColor: 'var(--app-border)',
                      }}
                    >
                      <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={searchClientQuery}
                        onChange={(e) => setSearchClientQuery(e.target.value)}
                        placeholder="Escribe el nombre, RUC o marca del cliente..."
                        className="w-full bg-transparent text-xs font-semibold outline-none"
                        style={{ color: 'var(--app-text)' }}
                      />
                    </div>
                  </div>

                  {/* Lista de clientes coincidentes */}
                  <div
                    className="max-h-48 overflow-y-auto rounded-xl border divide-y"
                    style={{ borderColor: 'var(--app-border)' }}
                  >
                    {filteredClients.length === 0 ? (
                      <p className="p-3 text-center text-xs text-slate-400 italic">
                        No se encontraron clientes coincidentes.
                      </p>
                    ) : (
                      filteredClients.map((client) => {
                        const isSelected = selectedClientId === client.id;
                        return (
                          <div
                            key={client.id}
                            onClick={() => {
                              setSelectedClientId(client.id);
                              if (client.brands && client.brands.length > 0) {
                                setSelectedBrandId(client.brands[0].id);
                              } else {
                                setSelectedBrandId('');
                              }
                            }}
                            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition text-xs ${
                              isSelected
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'hover:bg-slate-500/10'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-bold truncate">{client.name}</p>
                              <p className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                {client.documentType}: {client.documentNumber} • {client.brands.length} marca(s)
                              </p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Selector de Marca del cliente existente */}
                  {currentSelectedClient && (
                    <div
                      className="p-3 rounded-xl border space-y-2"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                        borderColor: 'var(--app-border)',
                      }}
                    >
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Seleccionar o Crear Marca para este Cliente:
                      </label>

                      {currentSelectedClient.brands.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {currentSelectedClient.brands.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                setSelectedBrandId(b.id);
                                setNewBrandForExistingClient('');
                              }}
                              className={`p-2 rounded-lg border text-xs text-left truncate cursor-pointer transition ${
                                selectedBrandId === b.id && !newBrandForExistingClient
                                  ? 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-2xs'
                                  : 'hover:bg-slate-500/10 border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {b.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t" style={{ borderColor: 'var(--app-border)' }}>
                        <span className="text-[11px] text-slate-400 block mb-1">
                          O crear una nueva marca para este cliente:
                        </span>
                        <input
                          type="text"
                          value={newBrandForExistingClient}
                          onChange={(e) => {
                            setNewBrandForExistingClient(e.target.value);
                            setSelectedBrandId('');
                          }}
                          placeholder="Nombre de la nueva marca..."
                          className="w-full rounded-xl border px-3 py-1.5 text-xs outline-none bg-transparent"
                          style={{ borderColor: 'var(--app-border)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===================== PASO 2: SERVICIO O MEMBRESÍA ===================== */}
          {step === 2 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define qué servicio o paquete de membresía contratará esta marca. Podrás elegir entre servicios del catálogo o armar una membresía por meses con entregables incluidos:
              </p>

              <BrandServiceContractSection
                serviceType={serviceContract.serviceType}
                serviceName={serviceContract.serviceName}
                servicePrice={serviceContract.servicePrice}
                serviceDescription={serviceContract.serviceDescription}
                serviceMonths={serviceContract.serviceMonths}
                includedServices={serviceContract.includedServices}
                services={services}
                currencySymbol={currencySymbol}
                onChange={(patch) => setServiceContract((prev) => ({ ...prev, ...patch }))}
                toast={toast}
              />
            </div>
          )}

          {/* ===================== PASO 3: GENERAR OS Y NOTA DE PAGO ===================== */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  Configura qué documentos deseas emitir automáticamente para{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {clientMode === 'create'
                      ? newClient.brandName || newClient.name
                      : newBrandForExistingClient ||
                        currentSelectedClient?.brands?.find((b) => b.id === selectedBrandId)?.name ||
                        currentSelectedClient?.name}
                  </strong>{' '}
                  por un monto de{' '}
                  <strong className="font-mono font-bold">
                    {currencySymbol} {Number(serviceContract.servicePrice).toLocaleString('es-PE')}
                  </strong>.
                </span>
              </div>

              {/* OPCIÓN 1: GENERAR ORDEN DE SERVICIO */}
              <div
                className={`p-4 rounded-2xl border transition ${
                  generateOS
                    ? 'border-amber-500/50 bg-amber-500/5 shadow-xs'
                    : 'opacity-70 bg-slate-500/5'
                }`}
                style={{ borderColor: generateOS ? undefined : 'var(--app-border)' }}
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={generateOS}
                      onChange={(e) => setGenerateOS(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div>
                      <p className="font-bold text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <FileText className="w-4 h-4" />
                        <span>Generar Orden de Servicio (OS)</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Crea la hoja de ruta operativa, carga los entregables y habilita el enlace público para el cliente.
                      </p>
                    </div>
                  </div>
                </label>

                {generateOS && (
                  <div className="mt-3 pt-3 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-600 dark:text-slate-300">
                        Fecha Estimada de Entrega
                      </label>
                      <input
                        type="date"
                        value={osDeliveryDate}
                        onChange={(e) => setOsDeliveryDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none bg-white dark:bg-slate-900"
                        style={{ borderColor: 'var(--app-border)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-600 dark:text-slate-300">
                        Notas u Observaciones Operativas
                      </label>
                      <input
                        type="text"
                        value={osNotes}
                        onChange={(e) => setOsNotes(e.target.value)}
                        placeholder="Ej. Prioridad alta, briefing inicial pendiente..."
                        className="w-full px-3 py-1.5 rounded-xl border text-xs outline-none bg-white dark:bg-slate-900"
                        style={{ borderColor: 'var(--app-border)' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* OPCIÓN 2: GENERAR NOTA DE PAGO */}
              <div
                className={`p-4 rounded-2xl border transition ${
                  generatePaymentNote
                    ? 'border-indigo-500/50 bg-indigo-500/5 shadow-xs'
                    : 'opacity-70 bg-slate-500/5'
                }`}
                style={{ borderColor: generatePaymentNote ? undefined : 'var(--app-border)' }}
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={generatePaymentNote}
                      onChange={(e) => setGeneratePaymentNote(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <p className="font-bold text-xs flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                        <CreditCard className="w-4 h-4" />
                        <span>Generar Nota de Pago (Comprobante)</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Emite el comprobante de pago oficial con desglose, moneda y botón para compartir por WhatsApp.
                      </p>
                    </div>
                  </div>
                </label>

                {generatePaymentNote && (
                  <div className="mt-3 pt-3 border-t border-indigo-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-600 dark:text-slate-300">
                        Estado del Pago
                      </label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none bg-white dark:bg-slate-900"
                        style={{ borderColor: 'var(--app-border)' }}
                      >
                        <option value="pending">Pendiente de Pago</option>
                        <option value="paid">Pagado / Liquidado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold mb-1 text-slate-600 dark:text-slate-300">
                        Método de Pago Sugerido
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none bg-white dark:bg-slate-900"
                        style={{ borderColor: 'var(--app-border)' }}
                      >
                        <option value="Transferencia Bancaria BCP">Transferencia BCP</option>
                        <option value="Transferencia BBVA">Transferencia BBVA</option>
                        <option value="Transferencia Interbank">Transferencia Interbank</option>
                        <option value="Yape / Plin">Yape / Plin</option>
                        <option value="Efectivo">Efectivo</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===================== PASO 4: RESULTADO EXITOSO ===================== */}
          {step === 4 && createdResult && (
            <div className="space-y-5 py-2 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  ¡Onboarding y Emisión Completados!
                </h3>
                <p className="text-xs text-slate-500">
                  Se ha registrado exitosamente a{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {createdResult.clientName}
                  </strong>{' '}
                  ({createdResult.brandName}) y se generaron los siguientes documentos:
                </p>
              </div>

              <div className="space-y-3">
                {/* TARJETA DE ORDEN DE SERVICIO */}
                {createdResult.order && (
                  <div
                    className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400">
                            {createdResult.order.code}
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-500">
                            En Ejecución
                          </span>
                        </div>
                        <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">
                          {createdResult.order.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => shareOrderWhatsApp(createdResult.order!)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>WhatsApp OS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/?os=${createdResult.order!.publicToken}`;
                          navigator.clipboard.writeText(url);
                          toast('Enlace público de la OS copiado.');
                        }}
                        className="p-2 rounded-xl border text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer hover:bg-slate-500/10"
                        style={{ borderColor: 'var(--app-border)' }}
                        title="Copiar enlace de la OS"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* TARJETA DE NOTA DE PAGO */}
                {createdResult.paymentNote && (
                  <div
                    className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                            {createdResult.paymentNote.code}
                          </span>
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-500">
                            {currencySymbol}{' '}
                            {createdResult.paymentNote.total.toLocaleString('es-PE')}
                          </span>
                        </div>
                        <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">
                          {createdResult.paymentNote.clientName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => sharePaymentNoteWhatsApp(createdResult.paymentNote!)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>WhatsApp Pago</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/p/pago/${createdResult.paymentNote!.publicToken}`;
                          navigator.clipboard.writeText(url);
                          toast('Enlace público de la nota de pago copiado.');
                        }}
                        className="p-2 rounded-xl border text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer hover:bg-slate-500/10"
                        style={{ borderColor: 'var(--app-border)' }}
                        title="Copiar enlace de la Nota de Pago"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER DEL MODAL (BOTONES DE NAVEGACIÓN Y ACCIÓN) */}
        <div
          className="shrink-0 px-5 sm:px-6 py-3.5 border-t flex items-center justify-between gap-3"
          style={{
            borderColor: 'var(--app-border)',
            backgroundColor: 'color-mix(in srgb, var(--app-surface) 97%, var(--app-bg) 3%)',
          }}
        >
          {step === 4 ? (
            <div className="flex items-center justify-end w-full gap-2">
              {createdResult?.order && onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate('service_orders');
                  }}
                  className="px-3.5 py-2 rounded-xl border text-xs font-bold hover:bg-slate-500/10 transition cursor-pointer"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  Ir a Órdenes de Servicio
                </button>
              )}
              {createdResult?.paymentNote && onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate('payments');
                  }}
                  className="px-3.5 py-2 rounded-xl border text-xs font-bold hover:bg-slate-500/10 transition cursor-pointer"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  Ir a Notas de Pago
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Finalizar
              </button>
            </div>
          ) : (
            <>
              <div>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep((prev) => (prev - 1) as any)}
                    className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition hover:bg-slate-500/10 cursor-pointer"
                    style={{ borderColor: 'var(--app-border)', color: 'var(--app-text)' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Atrás</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  Cancelar
                </button>

                {step < 3 ? (
                  <button
                    type="button"
                    disabled={step === 1 ? !isStep1Valid() : !isStep2Valid()}
                    onClick={() => setStep((prev) => (prev + 1) as any)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-xs"
                  >
                    <span>Siguiente</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleExecuteCreator}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-black flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md active:scale-95"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{submitting ? 'Generando Documentos...' : 'Crear y Generar Documentos'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
