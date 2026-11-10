import React, { useState, useEffect, useRef } from 'react';
import { useApp, PermissionGate } from '../context/AppContext';
import {
  Quote,
  QuoteItem,
  QuoteGanttPhase,
  QuotePaymentMethod,
  QuoteStatus,
  ProposalTheme,
  Client,
  Service,
  ServiceCategory,
  ServicePackageTier,
} from '../../shared/types';
import { RichTextEditor } from '../components/RichTextEditor';
import { QuoteLivePreview } from '../components/QuoteLivePreview';
import { copyTextToClipboard } from '../utils/clipboard';
import {
  Plus,
  Search,
  MessageCircle,
  Copy,
  Edit3,
  Trash2,
  ExternalLink,
  Calendar,
  DollarSign,
  FileText,
  Building,
  Layers,
  Sparkles,
  ArrowLeft,
  Save,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Hash,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Palette,
  Eye,
  EyeOff,
  X,
  Tag,
  Package,
  ChevronDown,
  ChevronUp,
  CreditCard,
  QrCode,
} from 'lucide-react';

const PROPOSAL_THEMES: {
  id: ProposalTheme;
  name: string;
  color: string;
  gradient: string;
}[] = [
  {
    id: 'modern-violet',
    name: 'Violeta Roma',
    color: '#7c3aed',
    gradient: 'from-violet-600 to-indigo-700',
  },
  {
    id: 'corporate-blue',
    name: 'Azul Corporativo',
    color: '#2563eb',
    gradient: 'from-blue-600 to-indigo-700',
  },
  {
    id: 'emerald-executive',
    name: 'Esmeralda',
    color: '#059669',
    gradient: 'from-emerald-600 to-teal-700',
  },
  {
    id: 'minimal-black',
    name: 'Negro Minimalista',
    color: '#0f172a',
    gradient: 'from-slate-900 to-slate-800',
  },
  {
    id: 'amber-luxury',
    name: 'Ámbar Ejecutivo',
    color: '#d97706',
    gradient: 'from-amber-600 to-yellow-600',
  },
  {
    id: 'crimson-red',
    name: 'Carmín',
    color: '#e11d48',
    gradient: 'from-rose-600 to-red-700',
  },
  {
    id: 'tech-cyan',
    name: 'Cyan Tecnológico',
    color: '#0891b2',
    gradient: 'from-cyan-600 to-blue-600',
  },
  {
    id: 'roma-gradient',
    name: 'Gradiente Roma',
    color: '#9333ea',
    gradient: 'from-indigo-600 via-purple-600 to-pink-500',
  },
];

export const QuotesModule: React.FC = () => {
  const { tenant, updateTenantState, apiFetch, toast, confirmAction, can } = useApp();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | QuoteStatus>('ALL');
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

  // Modo Editor: null = vista tabla; 'new' = crear; quote = editar
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);

  // Cuentas bancarias globales desde Configuración > Datos de Empresa
  const globalBankAccounts: QuotePaymentMethod[] = (tenant.companyInfo?.bankAccounts || []).filter(
    (acc) => acc.isActive !== false
  );

  // Catálogo de Servicios para jalar partidas automáticamente
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [targetItemIndexForService, setTargetItemIndexForService] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('all');

  // Formulario del Editor de Cotización
  const [formData, setFormData] = useState<{
    code: string;
    clientId: string;
    clientName: string;
    companyName: string;
    documentType: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | 'OTRO';
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
    registerAsNewClient: boolean;
  }>({
    code: '',
    clientId: '',
    clientName: '',
    companyName: '',
    documentType: 'RUC',
    documentNumber: '',
    whatsapp: '+51 ',
    email: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    currency: 'PEN',
    currencySymbol: 'S/',
    status: 'draft',
    theme: 'modern-violet',
    items: [],
    subtotal: 0,
    includeTax: true,
    taxRate: 18,
    taxAmount: 0,
    discountAmount: 0,
    total: 0,
    showGantt: true,
    ganttPhases: [],
    additionalNotes: '',
    termsAndConditions: '',
    showPaymentMethods: true,
    paymentMethods: [],
    registerAsNewClient: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotesRes, clientsRes, servicesRes, categoriesRes] = await Promise.all([
        apiFetch<{ quotes: Quote[] }>('/api/quotes'),
        apiFetch<{ clients: Client[] }>('/api/clients'),
        apiFetch<{ services: Service[] }>('/api/services'),
        apiFetch<{ categories: ServiceCategory[] }>('/api/services/categories').catch(() => ({ categories: [] })),
      ]);
      setQuotes(quotesRes.quotes || []);
      setClients(clientsRes.clients || []);
      setServices(servicesRes.services || []);
      setCategories(categoriesRes.categories || []);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recálculo automático de subtotales y total
  useEffect(() => {
    const subtotal = formData.items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    const taxAmount = formData.includeTax
      ? Math.round(subtotal * (formData.taxRate / 100) * 100) / 100
      : 0;
    const total = Math.max(
      0,
      Math.round((subtotal + taxAmount - Number(formData.discountAmount || 0)) * 100) / 100
    );
    setFormData((prev) => ({
      ...prev,
      subtotal,
      taxAmount,
      total,
    }));
  }, [formData.items, formData.includeTax, formData.taxRate, formData.discountAmount]);

  const handleOpenCreate = () => {
    const nextNum = quotes.length + 1;
    const year = new Date().getFullYear();
    const autoCode = `COT-${year}-${String(nextNum).padStart(3, '0')}`;

    setIsCreating(true);
    setActiveQuote(null);
    setFormData({
      code: autoCode,
      clientId: '',
      clientName: '',
      companyName: '',
      documentType: 'RUC',
      documentNumber: '',
      whatsapp: '+51 ',
      email: '',
      issueDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      currency: 'PEN',
      currencySymbol: 'S/',
      status: 'draft',
      theme: 'modern-violet',
      items: [
        {
          id: `item-${Date.now()}`,
          title: 'Servicio / Entregable Principal',
          description: '<p>Detalles del servicio, entregables y especificaciones técnicas...</p>',
          quantity: 1,
          unitPrice: 1000,
          discount: 0,
          total: 1000,
        },
      ],
      subtotal: 1000,
      includeTax: true,
      taxRate: 18,
      taxAmount: 180,
      discountAmount: 0,
      total: 1180,
      showGantt: true,
      ganttPhases: [
        {
          id: `phase-${Date.now()}`,
          name: 'Fase 1: Diagnóstico & Brief',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          progress: 100,
          color: '#7c3aed',
          deliverables: 'Brief y moodboard inicial',
        },
        {
          id: `phase-${Date.now() + 1}`,
          name: 'Fase 2: Ejecución & Entregables',
          startDate: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          progress: 50,
          color: '#ec4899',
          deliverables: 'Archivos finales y manual',
        },
      ],
      additionalNotes:
        '<p><strong>Condiciones Comerciales:</strong></p><ul class="list-disc pl-5"><li>Validez de la oferta: 15 días calendario.</li><li>Forma de pago: 50% de anticipo y 50% contra entrega final.</li></ul>',
      termsAndConditions:
        '<p><strong>Propiedad Intelectual:</strong> Al cancelarse el 100% del proyecto, los derechos de explotación pasan en su totalidad al cliente.</p>',
      showPaymentMethods: true,
      paymentMethods: JSON.parse(JSON.stringify(globalBankAccounts)),
      registerAsNewClient: false,
    });
  };

  const handleOpenEdit = (quote: Quote) => {
    setIsCreating(false);
    setActiveQuote(quote);
    setFormData({
      code: quote.code,
      clientId: quote.clientId || '',
      clientName: quote.clientName,
      companyName: quote.companyName || '',
      documentType: quote.documentType,
      documentNumber: quote.documentNumber,
      whatsapp: quote.whatsapp,
      email: quote.email,
      issueDate: quote.issueDate,
      validUntil: quote.validUntil,
      currency: quote.currency,
      currencySymbol: quote.currencySymbol,
      status: quote.status,
      theme: quote.theme,
      items: quote.items || [],
      subtotal: quote.subtotal,
      includeTax: quote.includeTax,
      taxRate: quote.taxRate || 18,
      taxAmount: quote.taxAmount,
      discountAmount: quote.discountAmount,
      total: quote.total,
      showGantt: quote.showGantt,
      ganttPhases: quote.ganttPhases || [],
      additionalNotes: quote.additionalNotes,
      termsAndConditions: quote.termsAndConditions,
      showPaymentMethods: quote.showPaymentMethods !== false,
      paymentMethods:
        globalBankAccounts.length > 0
          ? JSON.parse(JSON.stringify(globalBankAccounts))
          : quote.paymentMethods || [],
      registerAsNewClient: false,
    });
  };

  // Escuchar navegación dirigida desde Command Palette o desde Catálogo de Servicios
  useEffect(() => {
    const handleTarget = (target: {
      entityId?: string;
      id?: string;
      code?: string;
      query?: string;
      action?: string;
      serviceData?: any;
    }) => {
      if (target.action === 'create_from_service' && target.serviceData) {
        const srv = target.serviceData;
        const nextNum = quotes.length + 1;
        const autoCode = `COT-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
        const unitPrice = Number(srv.basePrice) || 1200;
        const taxAmount = +(unitPrice * 0.18).toFixed(2);
        const total = +(unitPrice + taxAmount).toFixed(2);

        const featuresHtml =
          Array.isArray(srv.features) && srv.features.length > 0
            ? `<p><strong>¿Qué incluye el servicio?</strong></p><ul class="list-disc pl-5">${srv.features
                .map((f: any) => `<li><strong>${f.title}:</strong> ${f.description || ''}</li>`)
                .join('')}</ul>`
            : '';
        const deliverablesHtml =
          Array.isArray(srv.deliverables) && srv.deliverables.length > 0
            ? `<p><strong>Entregables por Fase:</strong></p><ul class="list-disc pl-5">${srv.deliverables
                .map((d: any) => `<li><strong>${d.phase} — ${d.title}:</strong> ${d.details || ''}</li>`)
                .join('')}</ul>`
            : '';

        const descHtml = `<p>${srv.briefDescription || ''}</p>${featuresHtml}${deliverablesHtml}`;

        const ganttColors = ['#7c3aed', '#ec4899', '#0ea5e9', '#10b981', '#f59e0b'];
        const ganttPhases =
          Array.isArray(srv.deliverables) && srv.deliverables.length > 0
            ? srv.deliverables.map((del: any, idx: number) => ({
                id: `phase-${Date.now()}-${idx}`,
                name: del.phase || `Fase ${idx + 1}: ${del.title}`,
                startDate: new Date(Date.now() + idx * 4 * 86400000).toISOString().split('T')[0],
                endDate: new Date(Date.now() + (idx + 1) * 4 * 86400000).toISOString().split('T')[0],
                progress: idx === 0 ? 100 : 50,
                color: ganttColors[idx % ganttColors.length],
                deliverables: `${del.title}: ${del.details || ''}`,
              }))
            : [
                {
                  id: `phase-${Date.now()}`,
                  name: 'Fase 1: Ejecución del Servicio',
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
                  progress: 100,
                  color: '#7c3aed',
                  deliverables: srv.title,
                },
              ];

        const reqsHtml =
          Array.isArray(srv.requirements) && srv.requirements.length > 0
            ? `<p><strong>Requisitos Previos para Iniciar:</strong></p><ul class="list-disc pl-5">${srv.requirements
                .map((r: any) => `<li><strong>${r.title}:</strong> ${r.description || ''}</li>`)
                .join('')}</ul>`
            : '';

        setActiveQuote(null);
        setIsCreating(true);
        setFormData({
          code: autoCode,
          clientId: '',
          clientName: '',
          companyName: '',
          documentType: 'RUC',
          documentNumber: '',
          whatsapp: '+51 ',
          email: '',
          issueDate: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
          currency: srv.currency || 'PEN',
          currencySymbol: srv.currencySymbol || 'S/',
          status: 'draft',
          theme: 'modern-violet',
          items: [
            {
              id: `item-${Date.now()}`,
              title: `${srv.code ? `[${srv.code}] ` : ''}${srv.title}`,
              description: descHtml,
              quantity: 1,
              unitPrice,
              discount: 0,
              total: unitPrice,
            },
          ],
          subtotal: unitPrice,
          includeTax: true,
          taxRate: 18,
          taxAmount,
          discountAmount: 0,
          total,
          showGantt: true,
          ganttPhases,
          additionalNotes:
            `${reqsHtml}<p><strong>Condiciones Comerciales:</strong></p><ul class="list-disc pl-5"><li>Tiempo estimado de entrega: ${
              srv.deliveryTime || 'Segun cronograma'
            }.</li><li>Validez de la oferta: 15 días calendario.</li><li>Forma de pago: 50% de anticipo y 50% contra entrega final.</li></ul>`,
          termsAndConditions:
            '<p><strong>Propiedad Intelectual:</strong> Al cancelarse el 100% del proyecto, los derechos de explotación pasan en su totalidad al cliente.</p>',
          showPaymentMethods: true,
          paymentMethods: JSON.parse(JSON.stringify(globalBankAccounts)),
          registerAsNewClient: false,
        });
        toast(`Cotización pre-cargada con el servicio "${srv.title}"`, 'success');
        return;
      }

      if (quotes.length === 0) return;
      const targetId = target.entityId || target.id;
      const found = quotes.find(
        (q) =>
          (targetId && q.id === targetId) ||
          (target.code && q.code?.toLowerCase() === target.code.toLowerCase())
      );
      if (found) {
        handleOpenEdit(found);
      } else if (target.query) {
        setSearchQuery(target.query);
      }
    };

    try {
      const raw = sessionStorage.getItem('roma_open_target');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.module === 'quotes') {
          if (parsed.action === 'create_from_service' || quotes.length > 0) {
            sessionStorage.removeItem('roma_open_target');
            handleTarget(parsed);
          }
        }
      }
    } catch {}

    const listener = (e: any) => {
      if (e.detail?.module === 'quotes') {
        sessionStorage.removeItem('roma_open_target');
        handleTarget(e.detail);
      }
    };
    window.addEventListener('roma:open-target', listener);
    return () => window.removeEventListener('roma:open-target', listener);
  }, [quotes, globalBankAccounts]);

  // Al seleccionar un cliente existente, rellenar los datos
  const handleSelectClient = (clientId: string) => {
    if (!clientId) {
      setFormData((prev) => ({ ...prev, clientId: '' }));
      return;
    }
    const found = clients.find((c) => c.id === clientId);
    if (!found) return;

    const brand = found.brands && found.brands.length > 0 ? found.brands[0].name : '';
    setFormData((prev) => ({
      ...prev,
      clientId: found.id,
      clientName: found.name,
      companyName: brand || found.name,
      documentType: found.documentType,
      documentNumber: found.documentNumber,
      whatsapp: found.whatsapp,
      email: found.email || '',
    }));
  };

  const handleAddItem = () => {
    const newItem: QuoteItem = {
      id: `item-${Date.now()}`,
      title: 'Nueva Partida / Servicio',
      description: '<p>Descripción detallada del servicio o entregable...</p>',
      quantity: 1,
      unitPrice: 500,
      discount: 0,
      total: 500,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const handleSelectServiceToItem = (service: Service, packageTier?: ServicePackageTier) => {
    const htmlParts: string[] = [];
    if (service.briefDescription) {
      htmlParts.push(`<p>${service.briefDescription}</p>`);
    }
    const deliverables = service.deliverables || [];
    if (deliverables.length > 0) {
      htmlParts.push('<p><strong>Entregables y Alcance Incluido:</strong></p><ul>');
      deliverables.forEach((d) => {
        htmlParts.push(`<li><strong>${d.title}:</strong> ${d.details || ''}</li>`);
      });
      htmlParts.push('</ul>');
    }
    const tierFeatures = packageTier?.features || [];
    if (tierFeatures.length > 0) {
      htmlParts.push('<p><strong>Características del Paquete:</strong></p><ul>');
      tierFeatures.forEach((feat) => {
        htmlParts.push(`<li>${feat}</li>`);
      });
      htmlParts.push('</ul>');
    } else {
      const features = service.features || [];
      if (features.length > 0) {
        htmlParts.push('<p><strong>Especificaciones & Metodología:</strong></p><ul>');
        features.forEach((f) => {
          htmlParts.push(`<li><strong>${f.title}:</strong> ${f.description || ''}</li>`);
        });
        htmlParts.push('</ul>');
      }
    }
    const descriptionHtml = htmlParts.join('') || '<p>Servicio profesional especializado.</p>';
    const unitPrice = packageTier ? Number(packageTier.price) || 0 : Number(service.basePrice) || 0;
    const title = packageTier ? `${service.title} (${packageTier.name})` : service.title;

    if (targetItemIndexForService !== null && targetItemIndexForService >= 0) {
      handleUpdateItem(targetItemIndexForService, {
        title,
        description: descriptionHtml,
        unitPrice,
        total: unitPrice * (formData.items[targetItemIndexForService]?.quantity || 1),
      });
      toast(`Partida #${targetItemIndexForService + 1} actualizada con "${title}".`);
    } else {
      const newItem: QuoteItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        title,
        description: descriptionHtml,
        quantity: 1,
        unitPrice,
        discount: 0,
        total: unitPrice,
      };
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
      toast(`Servicio "${title}" añadido como nueva partida.`);
    }

    setIsServicePickerOpen(false);
    setTargetItemIndexForService(null);
  };

  const handleUpdateItem = (index: number, patch: Partial<QuoteItem>) => {
    setFormData((prev) => {
      const next = [...prev.items];
      const cur = { ...next[index], ...patch };
      const qty = Number(cur.quantity) || 0;
      const price = Number(cur.unitPrice) || 0;
      const disc = Number(cur.discount) || 0;
      cur.total = Math.max(0, Math.round((qty * price - disc) * 100) / 100);
      next[index] = cur;
      return { ...prev, items: next };
    });
  };

  const handleDeleteItem = (index: number) => {
    if (formData.items.length <= 1) {
      toast('Debe haber al menos 1 partida en la cotización.', 'warning');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleAddGanttPhase = () => {
    const newPhase: QuoteGanttPhase = {
      id: `phase-${Date.now()}`,
      name: `Fase ${formData.ganttPhases.length + 1}: Nueva Actividad`,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      progress: 0,
      color: '#7c3aed',
      deliverables: 'Entregables de la fase',
    };
    setFormData((prev) => ({
      ...prev,
      ganttPhases: [...prev.ganttPhases, newPhase],
    }));
  };

  const handleAddPaymentMethod = () => {
    const newPm: QuotePaymentMethod = {
      id: `pm-${Date.now()}`,
      name: 'Nueva Cuenta / Banco',
      beneficiary: tenant.companyInfo?.legalName || tenant.name,
      accountNumber: '000-00000000-0-00',
      notes: 'Transferencia o depósito bancario',
      imageUrl: '',
    };
    setFormData((prev) => ({
      ...prev,
      paymentMethods: [...prev.paymentMethods, newPm],
    }));
  };

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim()) {
      toast('El nombre del cliente o empresa es obligatorio.', 'warning');
      return;
    }

    setSaving(true);
    try {
      // 1. Si marcó "Registrar como nuevo cliente" y no tiene clientId seleccionado
      if (formData.registerAsNewClient && !formData.clientId) {
        try {
          const newClientRes = await apiFetch<{ client: Client }>('/api/clients', {
            method: 'POST',
            body: JSON.stringify({
              name: formData.clientName,
              documentType: formData.documentType,
              documentNumber: formData.documentNumber || '00000000',
              whatsapp: formData.whatsapp,
              email: formData.email || null,
              notes: `Registrado automáticamente desde la cotización ${formData.code}`,
              brands: formData.companyName
                ? [
                    {
                      name: formData.companyName,
                      industry: 'General',
                      brandColor: '#7c3aed',
                    },
                  ]
                : [],
            }),
          });
          if (newClientRes.client) {
            formData.clientId = newClientRes.client.id;
          }
        } catch (clientErr) {
          console.warn('[Quotes] Error al auto-registrar cliente:', clientErr);
        }
      }

      const payloadToSave = {
        ...formData,
        paymentMethods: globalBankAccounts,
      };

      if (activeQuote) {
        // Modo Edición
        const res = await apiFetch<{ quote: Quote }>(`/api/quotes/${activeQuote.id}`, {
          method: 'PUT',
          body: JSON.stringify(payloadToSave),
        });
        toast(`Cotización ${res.quote.code} actualizada correctamente.`);
      } else {
        // Modo Creación
        const res = await apiFetch<{ quote: Quote }>('/api/quotes', {
          method: 'POST',
          body: JSON.stringify(payloadToSave),
        });
        toast(`Cotización ${res.quote.code} creada con éxito.`);
      }

      await loadData();
      setIsCreating(false);
      setActiveQuote(null);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuote = async (quote: Quote) => {
    const ok = await confirmAction({
      title: `¿Eliminar la cotización ${quote.code}?`,
      message: `Esta acción no se puede deshacer. Se eliminarán los datos de la propuesta para ${quote.clientName}.`,
      confirmText: 'Eliminar Cotización',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/quotes/${quote.id}`, { method: 'DELETE' });
      toast(`Cotización ${quote.code} eliminada.`);
      await loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const getShortUrl = (quote: Quote) => {
    const token = quote.shortCode || quote.publicToken;
    return `${window.location.origin}/q/${token}`;
  };

  const handleCopyPublicLink = async (quote: Quote) => {
    const shortUrl = getShortUrl(quote);
    const copied = await copyTextToClipboard(shortUrl);
    if (copied) {
      toast(`Enlace corto copiado al portapapeles: /q/${quote.shortCode || quote.publicToken}`);
    } else {
      toast('No se pudo copiar automáticamente. Usa el enlace directo.', 'warning');
    }
  };

  const handleSendWhatsApp = (quote: Quote) => {
    const cleanWa = (quote.whatsapp || '').replace(/\D/g, '');
    const shortUrl = getShortUrl(quote);
    const text = encodeURIComponent(
      `¡Hola ${quote.clientName}! Te compartimos la propuesta comercial ${quote.code} de ${tenant.companyInfo?.commercialName || tenant.name} por un monto de ${quote.currencySymbol} ${quote.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}.\n\nPuedes revisarla de forma interactiva aquí:\n${shortUrl}`
    );
    window.open(`https://wa.me/${cleanWa}?text=${text}`, '_blank');
  };

  const filteredQuotes = quotes.filter((q) => {
    if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const s = searchQuery.toLowerCase();
    return (
      q.code.toLowerCase().includes(s) ||
      q.clientName.toLowerCase().includes(s) ||
      (q.companyName && q.companyName.toLowerCase().includes(s)) ||
      (q.documentNumber && q.documentNumber.includes(s))
    );
  });

  const totalQuotesSum = quotes.reduce((acc, q) => acc + (Number(q.total) || 0), 0);
  const approvedQuotes = quotes.filter((q) => q.status === 'approved').length;
  const sentQuotes = quotes.filter((q) => q.status === 'sent').length;

  // =============================================================================
  // VISTA 1: EDITOR / CREADOR DE COTIZACIÓN (CON BARRITA DELGADA MODERNA)
  // =============================================================================
  if (isCreating || activeQuote) {
    return (
      <div className="space-y-4">
        {/* BARRITA DELGADA MODERNA SUPERIOR (STICKY - APP MOBILE FEEL) */}
        <div className="sticky top-2 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl px-3 sm:px-4 py-2.5 shadow-md flex items-center justify-between gap-2 sm:gap-3">
          {/* Izquierda: Volver, Título y Código */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setActiveQuote(null);
              }}
              className="p-2 sm:p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
              title="Volver al listado"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden md:inline text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 truncate">
                {activeQuote ? 'Editar Cotización' : 'Nueva Cotización'}
              </span>
              <span className="font-mono text-[11px] sm:text-xs font-extrabold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 whitespace-nowrap shrink-0">
                {formData.code || 'COT-2026-XXX'}
              </span>
            </div>
          </div>

          {/* Centro/Derecha: Selector de Estado, Toggle Vista Previa y Botón de Guardar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Botón Vista Previa en Móvil / Tablet (< xl) */}
            <button
              type="button"
              onClick={() => setIsMobilePreviewOpen(true)}
              className="xl:hidden p-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Ver vista previa en vivo"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Vista Previa</span>
            </button>

            {/* Toggle Previsualización 2 Columnas en Desktop (xl+) */}
            <button
              type="button"
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`hidden xl:flex px-3 py-1.5 rounded-xl border text-xs font-bold transition items-center gap-1.5 cursor-pointer ${
                showLivePreview
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-600/10'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title={showLivePreview ? 'Ocultar vista previa y centrar formulario' : 'Mostrar vista previa en vivo'}
            >
              {showLivePreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>
                {showLivePreview ? 'Ocultar Vista Previa' : 'Previsualización'}
              </span>
            </button>

            {/* Selector de Estado */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded-xl shrink-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 hidden sm:inline">
                Estado:
              </span>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as QuoteStatus })
                }
                className="bg-transparent font-bold text-xs outline-none cursor-pointer text-slate-800 dark:text-slate-200"
              >
                <option value="draft" className="dark:bg-slate-900">Borrador</option>
                <option value="sent" className="dark:bg-slate-900">Enviado</option>
                <option value="approved" className="dark:bg-slate-900">Aprobado</option>
                <option value="rejected" className="dark:bg-slate-900">Rechazado</option>
                <option value="expired" className="dark:bg-slate-900">Vencido</option>
              </select>
            </div>

            {/* Vista Previa Pública (si ya tiene token) */}
            {activeQuote && (
              <div className="hidden md:flex items-center gap-1.5">
                <a
                  href={getShortUrl(activeQuote)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition inline-flex items-center gap-1.5 text-xs font-bold"
                  title="Abrir vista pública del cliente"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Enlace Web</span>
                </a>
              </div>
            )}

            {/* Botón Guardar Cotización */}
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveQuote}
              className="px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{saving ? 'Guardando...' : 'Guardar Cotización'}</span>
              <span className="sm:hidden">{saving ? '...' : 'Guardar'}</span>
            </button>
          </div>
        </div>

        {/* CONTENEDOR: 2 COLUMNAS O FORMULARIO CENTRADO */}
        <div className={showLivePreview ? 'w-full max-w-[1720px] mx-auto' : 'w-full max-w-4xl mx-auto'}>
          <div className={showLivePreview ? 'grid grid-cols-1 xl:grid-cols-12 gap-6 items-start' : ''}>
            {/* Columna Izquierda / Centrado: Campos del Formulario */}
            <div className={showLivePreview ? 'xl:col-span-7' : 'w-full'}>
              <form onSubmit={handleSaveQuote} className="space-y-5">
          {/* SECCIÓN 1: DATOS GENERALES & CLIENTE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 min-w-0">
                <Building className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="truncate">1. Datos Generales & Vinculación con Cliente</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                Requerido
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Selector de Cliente Existente */}
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Vincular con Cliente de la Agencia
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none cursor-pointer"
                >
                  <option value="">-- Cliente libre / No registrado en directorio --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.documentType}: {c.documentNumber})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nombre del Cliente / Contacto */}
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre del Cliente / Representante <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Ej. Juan Pérez / Corporación Alfa"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none"
                />
              </div>

              {/* Empresa / Marca */}
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nombre de la Empresa o Marca Comercial
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Ej. Alfa Media Group S.A.C."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none"
                />
                {(() => {
                  const currentClient = clients.find((c) => c.id === formData.clientId);
                  if (!currentClient || currentClient.brands.length <= 1) return null;
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <span className="text-[10px] font-bold text-slate-400">
                        Marcas del cliente:
                      </span>
                      {currentClient.brands.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, companyName: b.name })}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                            formData.companyName === b.name
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: b.brandColor || '#7c3aed' }}
                          />
                          <span>{b.name}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Documento (Tipo y Número) */}
              <div className="sm:col-span-6 grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Doc.
                  </label>
                  <select
                    value={formData.documentType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        documentType: e.target.value as any,
                      })
                    }
                    className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="RUC">RUC</option>
                    <option value="DNI">DNI</option>
                    <option value="CE">CE</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div className="col-span-8">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Número de {formData.documentType}
                  </label>
                  <input
                    type="text"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    placeholder="20601234567"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono-pin text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* WhatsApp y Correo */}
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  WhatsApp para Envío Directo
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                  <div className="px-2.5 py-2.5 bg-emerald-500/10 border-r border-slate-200 dark:border-slate-800 text-emerald-600 text-xs font-bold">
                    WA
                  </div>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+51 987 654 321"
                    className="w-full px-3 py-2 bg-transparent text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@empresa.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none"
                />
              </div>

              {/* Opción de registrar como nuevo cliente */}
              {!formData.clientId && (
                <div className="sm:col-span-12 pt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.registerAsNewClient}
                      onChange={(e) =>
                        setFormData({ ...formData, registerAsNewClient: e.target.checked })
                      }
                      className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Registrar también como nuevo cliente en el directorio general de la agencia
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* FECHAS, MONEDA Y ESTILO VISUAL */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Moneda
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => {
                    const c = e.target.value as 'PEN' | 'USD' | 'EUR';
                    setFormData({
                      ...formData,
                      currency: c,
                      currencySymbol: c === 'USD' ? '$' : c === 'EUR' ? '€' : 'S/',
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="PEN">PEN - Soles Peruanos (S/)</option>
                  <option value="USD">USD - Dólares Americanos ($)</option>
                  <option value="EUR">EUR - Euros (€)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Fecha de Emisión
                </label>
                <input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none"
                />
              </div>
            </div>

            {/* SELECTOR DE ESTILOS VISUALES PARA LA PROPUESTA PÚBLICA */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-500" />
                Estilo Visual para la Vista Pública del Cliente
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PROPOSAL_THEMES.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: th.id })}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer ${
                      formData.theme === th.id
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: th.color }}
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {th.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: DETALLES DEL SERVICIO (PARTIDAS EN CARDS) */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>2. Partidas & Servicios de la Propuesta</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Agrega cards para cada servicio o impórtalos directamente desde tu catálogo registrado.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetItemIndexForService(null);
                    setPickerSearch('');
                    setPickerCategory('all');
                    setIsServicePickerOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Elegir desde el catálogo de servicios de la agencia"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Jalar desde Servicios ({services.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Partida Manual</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateItem(idx, { title: e.target.value })}
                        placeholder="Título del Servicio o Entregable..."
                        className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 bg-transparent outline-none w-full border-b border-transparent focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetItemIndexForService(idx);
                          setPickerSearch('');
                          setPickerCategory('all');
                          setIsServicePickerOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 hover:border-violet-500 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer bg-slate-50 dark:bg-slate-800/60"
                        title="Rellenar esta partida con un servicio del catálogo"
                      >
                        <Sparkles className="w-3 h-3 text-violet-500" />
                        <span className="hidden sm:inline">Jalar de Servicio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                        title="Eliminar partida"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* EDITOR CON FORMATO RICO (TABLAS, NEGRITAS, EXCEL PASTE) */}
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                      Descripción & Alcance (Negrita, Cursiva, Tablas de Excel)
                    </label>
                    <RichTextEditor
                      value={item.description}
                      onChange={(html) => handleUpdateItem(idx, { description: html })}
                      placeholder="Describe los entregables, detalles o pega directamente una tabla copiada desde Excel..."
                    />
                  </div>

                  {/* CANTIDAD, PRECIO UNITARIO, DESCUENTO E IMPORTE */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(idx, { quantity: Number(e.target.value) || 1 })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Precio Unitario ({formData.currencySymbol})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleUpdateItem(idx, { unitPrice: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Descuento ({formData.currencySymbol})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.discount}
                        onChange={(e) =>
                          handleUpdateItem(idx, { discount: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Importe Partida
                      </label>
                      <div className="w-full px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/60 font-black text-xs text-slate-900 dark:text-slate-100">
                        {formData.currencySymbol}{' '}
                        {item.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RESUMEN FINANCIERO Y TOTALES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includeTax}
                  onChange={(e) => setFormData({ ...formData, includeTax: e.target.checked })}
                  className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Incluir IGV (18%) en la cotización
                </span>
              </label>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Descuento Global Adicional:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discountAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, discountAmount: Number(e.target.value) || 0 })
                  }
                  className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="w-full sm:w-72 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>Subtotal:</span>
                <span className="font-bold">
                  {formData.currencySymbol}{' '}
                  {formData.subtotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {formData.discountAmount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Descuento:</span>
                  <span className="font-bold">
                    -{formData.currencySymbol}{' '}
                    {formData.discountAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {formData.includeTax && (
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>IGV (18%):</span>
                  <span className="font-bold">
                    {formData.currencySymbol}{' '}
                    {formData.taxAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex items-center justify-between">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  TOTAL:
                </span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {formData.currencySymbol}{' '}
                  {formData.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: CRONOGRAMA GANTT DE ACTIVIDADES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  3. Cronograma / Diagrama de Gantt
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Planifica las fases y plazos. Puedes ocultarlo o mostrarlo en la vista del cliente.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={formData.showGantt}
                    onChange={(e) => setFormData({ ...formData, showGantt: e.target.checked })}
                    className="rounded accent-indigo-600 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Mostrar en Vista Pública
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleAddGanttPhase}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Fase</span>
                </button>
              </div>
            </div>

            {formData.showGantt && (
              <div className="space-y-3">
                {formData.ganttPhases.map((phase, pIdx) => (
                  <div
                    key={phase.id}
                    className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2.5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={phase.name}
                          onChange={(e) => {
                            const next = [...formData.ganttPhases];
                            next[pIdx].name = e.target.value;
                            setFormData({ ...formData, ganttPhases: next });
                          }}
                          placeholder="Nombre de la fase..."
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <input
                          type="date"
                          value={phase.startDate}
                          onChange={(e) => {
                            const next = [...formData.ganttPhases];
                            next[pIdx].startDate = e.target.value;
                            setFormData({ ...formData, ganttPhases: next });
                          }}
                          className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <input
                          type="date"
                          value={phase.endDate}
                          onChange={(e) => {
                            const next = [...formData.ganttPhases];
                            next[pIdx].endDate = e.target.value;
                            setFormData({ ...formData, ganttPhases: next });
                          }}
                          className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={phase.progress}
                          onChange={(e) => {
                            const next = [...formData.ganttPhases];
                            next[pIdx].progress = Number(e.target.value);
                            setFormData({ ...formData, ganttPhases: next });
                          }}
                          className="flex-1 accent-indigo-600"
                        />
                        <span className="font-mono text-xs font-bold w-10 text-right">
                          {phase.progress}%
                        </span>
                      </div>

                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              ganttPhases: formData.ganttPhases.filter((_, i) => i !== pIdx),
                            });
                          }}
                          className="p-1 rounded text-rose-400 hover:text-rose-600"
                          title="Eliminar fase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 4: NOTAS ADICIONALES & TÉRMINOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Notas Adicionales & Condiciones
              </label>
              <RichTextEditor
                value={formData.additionalNotes}
                onChange={(html) => setFormData({ ...formData, additionalNotes: html })}
                placeholder="Validez de la oferta, plazos de respuesta, forma de pago..."
              />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-pink-500" />
                Términos & Condiciones Generales
              </label>
              <RichTextEditor
                value={formData.termsAndConditions}
                onChange={(html) => setFormData({ ...formData, termsAndConditions: html })}
                placeholder="Propiedad intelectual, revisiones incluidas, garantías..."
              />
            </div>
          </div>

          {/* SECCIÓN 5: CUENTAS BANCARIAS GLOBALES (REGLA DE EMPRESA) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-500 shrink-0" />
                    5. Cuentas Bancarias & Métodos de Pago
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60">
                    Regla Global
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Las cuentas y códigos QR se sincronizan automáticamente desde{' '}
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    Configuración &gt; Datos de Empresa
                  </span>
                  .
                </p>
              </div>

              {/* SWITCHER PARA MOSTRAR U OCULTAR EN VISTA PÚBLICA */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.showPaymentMethods}
                    onChange={(e) =>
                      setFormData({ ...formData, showPaymentMethods: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {formData.showPaymentMethods ? 'Mostrar en Vista Pública' : 'Oculto en Vista Pública'}
                  </span>
                </label>
              </div>
            </div>

            {/* AVISO SI ESTÁ DESACTIVADO EL SWITCHER */}
            {!formData.showPaymentMethods && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-2.5 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Las cuentas bancarias están configuradas como <strong>OCULTAS</strong>. El cliente no verá números de cuenta ni códigos QR al abrir el enlace público.
                </span>
              </div>
            )}

            {/* LISTADO DE CUENTAS GLOBALES DE LA EMPRESA */}
            {globalBankAccounts.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                <CreditCard className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                  No hay cuentas bancarias globales activas en Datos de Empresa
                </p>
                <p className="text-[11px] text-slate-400">
                  Registra tus cuentas y códigos QR en el módulo de Configuración &gt; Datos de Empresa para que se apliquen en todas tus cotizaciones y notas de pago.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {globalBankAccounts.map((pm, pmIdx) => (
                  <div
                    key={pm.id || pmIdx}
                    className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 shadow-2xs transition relative flex items-start gap-3.5"
                  >
                    {/* FOTO O QR DE PAGO */}
                    {pm.imageUrl ? (
                      <img
                        src={pm.imageUrl}
                        alt={pm.name}
                        className="w-12 h-12 rounded-xl object-contain bg-white dark:bg-slate-900 border p-1 shrink-0"
                        title="Foto / QR asignado"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {pm.currency || 'PEN'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {pm.name}
                        </p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {pm.currency || 'PEN'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Titular: {pm.beneficiary || tenant.companyInfo?.legalName || tenant.name}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 select-all truncate">
                          {pm.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await copyTextToClipboard(pm.accountNumber);
                            if (ok) toast('Número de cuenta copiado.');
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                          title="Copiar número"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      {pm.notes && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                          {pm.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOTÓN FINAL DE GUARDAR */}
          <div className="flex justify-end gap-3 pt-2 pb-6">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setActiveQuote(null);
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Cotización'}</span>
            </button>
          </div>
        </form>
            </div>

            {/* Columna Derecha: Previsualización en Vivo */}
            {showLivePreview && (
              <div className="hidden xl:block xl:col-span-5 sticky top-18 max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-1">
                <QuoteLivePreview
                  formData={{ ...formData, paymentMethods: globalBankAccounts }}
                  tenant={tenant}
                  onClose={() => setShowLivePreview(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* MODAL / DRAWER DE PREVISUALIZACIÓN EN VIVO PARA MÓVIL / TABLET (< xl) */}
        {isMobilePreviewOpen && (
          <div
            className="fixed inset-0 z-50 xl:hidden bg-slate-950/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-in fade-in duration-200"
            onClick={() => setIsMobilePreviewOpen(false)}
          >
            <div
              className="bg-white dark:bg-slate-900 w-full sm:max-w-xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-y-auto shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <QuoteLivePreview
                formData={{ ...formData, paymentMethods: globalBankAccounts }}
                tenant={tenant}
                onClose={() => setIsMobilePreviewOpen(false)}
              />
            </div>
          </div>
        )}

        {/* MODAL DE SELECCIÓN DE SERVICIOS PARA AGREGAR PARTIDAS */}
        {isServicePickerOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Encabezado */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 mb-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Catálogo de Servicios Registrados</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {targetItemIndexForService !== null
                      ? `Reemplazar Partida #${targetItemIndexForService + 1} con un Servicio`
                      : 'Jalar Servicio hacia la Cotización'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Selecciona un servicio para importar automáticamente su título, descripción rica con entregables y precio fijado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsServicePickerOpen(false);
                    setTargetItemIndexForService(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barra de Filtros y Búsqueda */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Buscar servicio por nombre, entregables o código (ej. Branding, Web, Redes)..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  {pickerSearch && (
                    <button
                      type="button"
                      onClick={() => setPickerSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro por Categorías */}
                {categories.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
                    <button
                      type="button"
                      onClick={() => setPickerCategory('all')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                        pickerCategory === 'all'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Todas ({services.length})
                    </button>
                    {categories.map((c) => {
                      const count = services.filter((s) => s.categoryId === c.id).length;
                      const isSelected = pickerCategory === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setPickerCategory(c.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: c.badgeColor || '#7c3aed' }}
                          />
                          <span>{c.name}</span>
                          <span className="text-[10px] opacity-75 font-mono">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lista de Servicios Disponibles */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 max-h-[60vh]">
                {services.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto opacity-40 mb-2" />
                    <p className="font-bold text-sm">Aún no hay servicios registrados en el módulo de Servicios.</p>
                    <p className="text-xs mt-1">Registra servicios en la sección "Servicios" para poder cargarlos en tus cotizaciones con un solo clic.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {services
                      .filter((s) => {
                        if (pickerCategory !== 'all' && s.categoryId !== pickerCategory) return false;
                        if (pickerSearch.trim()) {
                          const q = pickerSearch.toLowerCase();
                          const matchTitle = s.title.toLowerCase().includes(q);
                          const matchDesc = (s.briefDescription || '').toLowerCase().includes(q);
                          const matchCode = (s.code || '').toLowerCase().includes(q);
                          if (!matchTitle && !matchDesc && !matchCode) return false;
                        }
                        return true;
                      })
                      .map((service) => {
                        const cat = categories.find((c) => c.id === service.categoryId);
                        const hasPackages = service.packages && service.packages.length > 0;
                        return (
                          <div
                            key={service.id}
                            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-violet-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span
                                  className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider text-white"
                                  style={{ backgroundColor: cat?.badgeColor || '#7c3aed' }}
                                >
                                  {cat?.name || 'General'}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 font-bold">
                                  {service.code}
                                </span>
                              </div>

                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-1">
                                {service.title}
                              </h4>

                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                                {service.briefDescription || 'Servicio profesional integral diseñado para elevar resultados comerciales.'}
                              </p>

                              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                  Precio Base
                                </span>
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                  {service.currencySymbol} {service.basePrice.toLocaleString('es-PE')}
                                  {service.pricingType === 'monthly' ? '/mes' : ''}
                                </span>
                              </div>
                            </div>

                            {/* Paquetes o Botón directo */}
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                              {hasPackages ? (
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-bold text-slate-500 block">
                                    Elige un paquete para insertar:
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {service.packages.map((pkg) => (
                                      <button
                                        key={pkg.id}
                                        type="button"
                                        onClick={() => handleSelectServiceToItem(service, pkg)}
                                        className="p-2 rounded-xl text-left border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:border-violet-500 transition cursor-pointer flex flex-col justify-between"
                                      >
                                        <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 line-clamp-1">
                                          {pkg.name}
                                        </span>
                                        <span className="text-xs font-black text-violet-600 dark:text-violet-400 mt-1">
                                          {service.currencySymbol} {Number(pkg.price).toLocaleString('es-PE')}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectServiceToItem(service)}
                                    className="w-full py-1.5 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                                  >
                                    O insertar servicio genérico (S/ {service.basePrice.toLocaleString('es-PE')})
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSelectServiceToItem(service)}
                                  className="w-full py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Insertar como Partida ({service.currencySymbol} {service.basePrice.toLocaleString('es-PE')})</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-800/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsServicePickerOpen(false);
                    setTargetItemIndexForService(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =============================================================================
  // VISTA 2: LISTADO EN TABLA DE COTIZACIONES
  // =============================================================================
  return (
    <div className="space-y-5">
      {/* CABECERA ESTANDARIZADA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gestión Comercial & Cotizaciones</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Cotizaciones & Propuestas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {quotes.length} propuestas registradas • {approvedQuotes} aprobadas en {tenant.name}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PermissionGate permission="quotes.create">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center justify-center gap-2 shrink-0 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Cotización</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* METRICAS KPI / RESUMEN EN 4 COLUMNAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Cotizaciones</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {quotes.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Aprobadas</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {approvedQuotes}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Enviadas</span>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {sentQuotes}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Monto Global</span>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 truncate max-w-[150px]">
              S/ {totalQuotesSum.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS POR ESTADO */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por código (COT-...), nombre de cliente, empresa o RUC..."
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm outline-none focus:border-indigo-500 transition shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs self-start overflow-x-auto max-w-full">
          {(['ALL', 'draft', 'sent', 'approved', 'rejected', 'expired'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {st === 'ALL'
                ? 'Todos'
                : st === 'draft'
                ? 'Borrador'
                : st === 'sent'
                ? 'Enviado'
                : st === 'approved'
                ? 'Aprobado'
                : st === 'rejected'
                ? 'Rechazado'
                : 'Vencido'}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA PRINCIPAL DE COTIZACIONES */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-400 animate-pulse">
          Cargando listado de cotizaciones...
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
            No se encontraron cotizaciones
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Genera tu primera cotización comercial con partidas, Gantt y enlace público para compartir por WhatsApp.
          </p>
        </div>
      ) : (
        <div>
          {/* VISTA DESKTOP: TABLA COMPLETA */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">ID / Código</th>
                    <th className="py-3.5 px-4">Cliente & Empresa</th>
                    <th className="py-3.5 px-4">Emisión</th>
                    <th className="py-3.5 px-4">Vencimiento</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Total</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition group"
                    >
                      {/* ID / Código y Enlace Corto */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-mono-pin font-extrabold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/40">
                            {quote.code}
                          </span>
                          <a
                            href={getShortUrl(quote)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition"
                            title="Abrir enlace corto en nueva pestaña"
                          >
                            <span>/q/{quote.shortCode || quote.publicToken}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </td>

                      {/* Cliente & Empresa */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {quote.companyName || quote.clientName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {quote.clientName} • {quote.documentType}: {quote.documentNumber || '-'}
                          </p>
                        </div>
                      </td>

                      {/* Emisión */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {quote.issueDate}
                      </td>

                      {/* Vencimiento */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-rose-500 dark:text-rose-400">
                        {quote.validUntil}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            quote.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : quote.status === 'sent'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : quote.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : quote.status === 'expired'
                              ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {quote.status === 'approved'
                            ? 'Aprobado'
                            : quote.status === 'sent'
                            ? 'Enviado'
                            : quote.status === 'rejected'
                            ? 'Rechazado'
                            : quote.status === 'expired'
                            ? 'Vencido'
                            : 'Borrador'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-black text-sm text-slate-900 dark:text-slate-100">
                        {quote.currencySymbol}{' '}
                        {quote.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Enviar a WhatsApp */}
                          <PermissionGate permission="quotes.send">
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(quote)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition cursor-pointer"
                              title="Enviar a WhatsApp con enlace público"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          </PermissionGate>

                          {/* Copiar Enlace Público */}
                          <PermissionGate permission="quotes.send">
                            <button
                              type="button"
                              onClick={() => handleCopyPublicLink(quote)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Copiar enlace de vista pública"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </PermissionGate>

                          {/* Editar */}
                          <PermissionGate permission="quotes.edit">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(quote)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Editar cotización"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </PermissionGate>

                          {/* Eliminar */}
                          <PermissionGate permission="quotes.delete">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuote(quote)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                              title="Eliminar cotización"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* VISTA MÓVIL RESPONSIVE: ACORDEÓN DESGLOSABLE */}
          <div className="md:hidden space-y-3">
            {filteredQuotes.map((quote) => {
              const isExpanded = expandedQuoteId === quote.id;

              return (
                <div
                  key={quote.id}
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all duration-200"
                >
                  {/* Encabezado Desglosable (Clickable) */}
                  <div
                    onClick={() => setExpandedQuoteId(isExpanded ? null : quote.id)}
                    className="p-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition select-none flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono-pin font-extrabold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/40">
                          {quote.code}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            quote.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : quote.status === 'sent'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : quote.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : quote.status === 'expired'
                              ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {quote.status === 'approved'
                            ? 'Aprobado'
                            : quote.status === 'sent'
                            ? 'Enviado'
                            : quote.status === 'rejected'
                            ? 'Rechazado'
                            : quote.status === 'expired'
                            ? 'Vencido'
                            : 'Borrador'}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {quote.companyName || quote.clientName}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Válido hasta: <strong className="text-slate-600 dark:text-slate-300">{quote.validUntil}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total</span>
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                          {quote.currencySymbol} {quote.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo Desglosado Expandible */}
                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/40 dark:bg-slate-900/60 animate-fadeIn text-xs">
                      {/* Metadatos en cuadrícula */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2">
                        <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Contacto & Doc</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                            {quote.clientName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {quote.documentType}: {quote.documentNumber || '-'}
                          </span>
                        </div>

                        <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Emisión & Venc.</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium block">
                            Emitido: {quote.issueDate}
                          </span>
                          <span className="text-rose-500 font-semibold text-[10px]">
                            Vence: {quote.validUntil}
                          </span>
                        </div>
                      </div>

                      {/* Enlace público corto */}
                      <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Enlace público de propuesta</span>
                          <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 truncate block">
                            /q/{quote.shortCode || quote.publicToken}
                          </span>
                        </div>
                        <a
                          href={getShortUrl(quote)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] font-bold flex items-center gap-1 shrink-0"
                        >
                          <span>Ver</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Lista de Partidas / Conceptos si existen */}
                      {quote.items && quote.items.length > 0 && (
                        <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Partidas de la Cotización ({quote.items.length})
                          </span>
                          <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-700/60">
                            {quote.items.map((item, idx) => (
                              <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-[11px]">
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.title || item.name}</p>
                                  <p className="text-[10px] text-slate-400">
                                    Cant: {item.quantity} × {quote.currencySymbol}{Number(item.unitPrice).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 shrink-0">
                                  {quote.currencySymbol}{Number(item.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Barra de Acciones Móviles */}
                      <div className="pt-2 flex flex-wrap items-center gap-1.5">
                        <PermissionGate permission="quotes.send">
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(quote)}
                            className="flex-1 min-w-[120px] py-2 px-3 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                        </PermissionGate>

                        <PermissionGate permission="quotes.send">
                          <button
                            type="button"
                            onClick={() => handleCopyPublicLink(quote)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Copiar enlace"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </PermissionGate>

                        <PermissionGate permission="quotes.edit">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(quote)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </PermissionGate>

                        <PermissionGate permission="quotes.delete">
                          <button
                            type="button"
                            onClick={() => handleDeleteQuote(quote)}
                            className="p-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
