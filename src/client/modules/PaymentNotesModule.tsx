import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp, PermissionGate } from '../context/AppContext';
import {
  PaymentNote,
  PaymentNoteItem,
  PaymentNoteStatus,
  MembershipMonthItem,
  MembershipMonthStatus,
  Client,
  ClientBrand,
  Quote,
  Service,
  ServiceCategory,
  ServicePackageTier,
} from '../../shared/types';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  MessageCircle,
  Trash2,
  Edit2,
  ExternalLink,
  Printer,
  Sparkles,
  Building,
  User,
  ArrowLeft,
  Save,
  Check,
  CreditCard,
  Layers,
  X,
  Tag,
  Package,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Crown,
  UploadCloud,
  Paperclip,
  Download,
  FileCheck,
  Link2,
  FileText,
  Loader2,
  ClipboardPaste,
} from 'lucide-react';
import { PaymentNoteLivePreview } from '../components/PaymentNoteLivePreview';
import { copyTextToClipboard } from '../utils/clipboard';
import { parseVoucherWithOcr } from '../utils/voucherOcr';

export const PaymentNotesModule: React.FC = () => {
  const { tenant, apiFetch, toast, confirmAction, can } = useApp();

  const [paymentNotes, setPaymentNotes] = useState<PaymentNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentNoteStatus>('ALL');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // Modo Editor SPA
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PaymentNote | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal para registro rápido de cobro
  const [quickPayNote, setQuickPayNote] = useState<PaymentNote | null>(null);
  const [quickPayData, setQuickPayData] = useState({
    paidAmount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Transferencia Bancaria BCP',
    operationNumber: '',
  });

  // Modal selector de servicios
  const [isServicePickerOpen, setIsServicePickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'standard' | 'extra'>('standard');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('all');

  // Marca seleccionada para el cliente activo
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState<{ url: string; name: string } | null>(null);

  // Estados para OCR en Vouchers
  const [ocrProcessingKey, setOcrProcessingKey] = useState<string | null>(null);
  const [ocrStatusText, setOcrStatusText] = useState<string>('');

  // Cuentas bancarias globales desde Configuración > Datos de Empresa
  const globalBankAccounts = (tenant.companyInfo?.bankAccounts || []).filter(
    (acc) => acc.isActive !== false
  );

  // Estado del formulario
  const [formData, setFormData] = useState<{
    code: string;
    quoteId?: string;
    quoteCode?: string;
    clientId: string;
    clientName: string;
    companyName: string;
    brandId?: string;
    brandName?: string;
    documentType: 'RUC' | 'DNI' | 'CE' | 'PASSPORT' | 'OTRO';
    documentNumber: string;
    whatsapp: string;
    email: string;
    issueDate: string;
    dueDate: string;
    paymentDate: string;
    paymentMethod: string;
    operationNumber: string;
    currency: 'PEN' | 'USD';
    currencySymbol: string;
    isMembership?: boolean;
    membershipPlanName?: string;
    membershipMonthsTotal?: number;
    membershipInstallments?: MembershipMonthItem[];
    extraItems?: PaymentNoteItem[];
    items: PaymentNoteItem[];
    subtotal: number;
    includeTax: boolean;
    taxRate: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
    paidAmount: number;
    status: PaymentNoteStatus;
    notes: string;
    bankAccounts: any[];
  }>({
    code: '',
    quoteId: '',
    quoteCode: '',
    clientId: '',
    clientName: '',
    companyName: '',
    brandId: '',
    brandName: '',
    documentType: 'RUC',
    documentNumber: '',
    whatsapp: '',
    email: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    paymentDate: '',
    paymentMethod: 'Transferencia Bancaria BCP',
    operationNumber: '',
    currency: 'PEN',
    currencySymbol: tenant.customization?.currencySymbol || 'S/',
    isMembership: false,
    membershipPlanName: '',
    membershipMonthsTotal: 1,
    membershipInstallments: [],
    extraItems: [],
    items: [],
    subtotal: 0,
    includeTax: false,
    taxRate: 18,
    taxAmount: 0,
    discountAmount: 0,
    total: 0,
    paidAmount: 0,
    status: 'pending',
    notes: '',
    bankAccounts: [],
  });

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === formData.clientId);
  }, [clients, formData.clientId]);

  const selectedBrand = useMemo(() => {
    if (!selectedClient || !selectedClient.brands || selectedClient.brands.length === 0) return null;
    if (selectedBrandId) {
      return selectedClient.brands.find((b) => b.id === selectedBrandId) || selectedClient.brands[0] || null;
    }
    return selectedClient.brands[0] || null;
  }, [selectedClient, selectedBrandId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notesRes, clientsRes, quotesRes, servicesRes, categoriesRes] = await Promise.all([
        apiFetch<{ paymentNotes: PaymentNote[] }>('/api/payment-notes'),
        apiFetch<{ clients: Client[] }>('/api/clients'),
        apiFetch<{ quotes: Quote[] }>('/api/quotes').catch(() => ({ quotes: [] })),
        apiFetch<{ services: Service[] }>('/api/services').catch(() => ({ services: [] })),
        apiFetch<{ categories: ServiceCategory[] }>('/api/services/categories').catch(() => ({
          categories: [] as ServiceCategory[],
        })),
      ]);
      setPaymentNotes(notesRes.paymentNotes || []);
      setClients(clientsRes.clients || []);
      setQuotes(quotesRes.quotes || []);
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

  // Recalcular subtotales y total del formulario
  useEffect(() => {
    let subtotal = 0;
    if (formData.isMembership && formData.membershipInstallments && formData.membershipInstallments.length > 0) {
      const installmentsSum = formData.membershipInstallments.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
      const extrasSum = (formData.extraItems || []).reduce((acc, it) => acc + (Number(it.total) || 0), 0);
      subtotal = installmentsSum + extrasSum;
    } else {
      subtotal = formData.items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    }

    const taxAmount = formData.includeTax
      ? Math.round(subtotal * (formData.taxRate / 100) * 100) / 100
      : 0;
    const discount = Number(formData.discountAmount) || 0;
    const total = Math.max(0, Math.round((subtotal + taxAmount - discount) * 100) / 100);

    let paidAmount = formData.paidAmount;
    let status = formData.status;
    if (formData.isMembership && formData.membershipInstallments && formData.membershipInstallments.length > 0) {
      const paidInstallments = formData.membershipInstallments
        .filter((inst) => inst.status === 'paid')
        .reduce((acc, inst) => acc + (Number(inst.amount) || 0), 0);
      const paidExtras = (formData.extraItems || [])
        .filter((ex) => ex.status === 'paid')
        .reduce((acc, ex) => acc + (Number(ex.total) || 0), 0);
      const paidSum = paidInstallments + paidExtras;
      paidAmount = paidSum;
      if (paidSum >= total && total > 0) {
        status = 'paid';
      } else if (paidSum > 0) {
        status = 'partial';
      } else {
        status = 'pending';
      }
    }

    setFormData((prev) => ({
      ...prev,
      subtotal,
      taxAmount,
      total,
      ...(formData.isMembership ? { paidAmount, status } : {}),
    }));
  }, [
    formData.items,
    formData.extraItems,
    formData.isMembership,
    formData.membershipInstallments,
    formData.includeTax,
    formData.taxRate,
    formData.discountAmount,
  ]);

  // KPIs
  const kpis = useMemo(() => {
    const totalEmitted = paymentNotes.reduce((acc, n) => acc + (Number(n.total) || 0), 0);
    const totalPaid = paymentNotes.reduce((acc, n) => acc + (Number(n.paidAmount) || 0), 0);
    const totalPending = Math.max(0, totalEmitted - totalPaid);
    const collectionRate = totalEmitted > 0 ? Math.round((totalPaid / totalEmitted) * 100) : 0;
    const pendingCount = paymentNotes.filter((n) => n.status === 'pending' || n.status === 'partial')
      .length;
    return {
      totalEmitted,
      totalPaid,
      totalPending,
      collectionRate,
      pendingCount,
    };
  }, [paymentNotes]);

  // Filtrado de Notas de Pago
  const filteredNotes = useMemo(() => {
    return paymentNotes.filter((n) => {
      if (statusFilter !== 'ALL' && n.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = (n.code || '').toLowerCase().includes(q);
        const matchClient = (n.clientName || '').toLowerCase().includes(q);
        const matchCompany = (n.companyName || '').toLowerCase().includes(q);
        const matchDoc = (n.documentNumber || '').toLowerCase().includes(q);
        const matchQuote = (n.quoteCode || '').toLowerCase().includes(q);
        if (!matchCode && !matchClient && !matchCompany && !matchDoc && !matchQuote) return false;
      }
      return true;
    });
  }, [paymentNotes, statusFilter, searchQuery]);

  // Abrir Creador de Nueva Nota de Pago
  const handleOpenCreate = () => {
    const year = new Date().getFullYear();
    const nextNum = paymentNotes.length + 1;
    const autoCode = `NP-${year}-${String(nextNum).padStart(3, '0')}`;

    setEditingNote(null);
    const firstClient = clients[0];
    const firstBrand = firstClient?.brands?.[0];
    setSelectedBrandId(firstBrand?.id || '');

    const initialItems: PaymentNoteItem[] = firstBrand?.serviceName
      ? [
          {
            id: `item-${Date.now()}`,
            title: firstBrand.serviceName,
            description: firstBrand.serviceDescription || 'Servicio acordado contratado por la marca.',
            quantity: 1,
            unitPrice: Number(firstBrand.servicePrice) || 0,
            total: Number(firstBrand.servicePrice) || 0,
          },
        ]
      : [
          {
            id: `item-${Date.now()}`,
            title: 'Honorarios por Servicios de Agencia',
            description: 'Hito de entrega o inicio de servicios profesionales acordados.',
            quantity: 1,
            unitPrice: 1000,
            total: 1000,
          },
        ];

    const initialSubtotal = initialItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    const initialTax = Math.round(initialSubtotal * 0.18 * 100) / 100;

    setFormData({
      code: autoCode,
      quoteId: '',
      quoteCode: '',
      clientId: firstClient?.id || '',
      clientName: firstClient?.name || '',
      companyName: firstBrand?.name || firstClient?.name || '',
      brandId: firstBrand?.id || '',
      brandName: firstBrand?.name || '',
      documentType: (firstClient?.documentType as any) || 'RUC',
      documentNumber: firstClient?.documentNumber || '',
      whatsapp: firstClient?.whatsapp || '',
      email: firstClient?.email || '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      paymentDate: '',
      paymentMethod: 'Transferencia Bancaria BCP',
      operationNumber: '',
      currency: 'PEN',
      currencySymbol: tenant.customization?.currencySymbol || 'S/',
      isMembership: false,
      membershipPlanName: '',
      membershipMonthsTotal: 1,
      membershipInstallments: [],
      extraItems: [],
      items: initialItems,
      subtotal: initialSubtotal,
      includeTax: true,
      taxRate: 18,
      taxAmount: initialTax,
      discountAmount: 0,
      total: initialSubtotal + initialTax,
      paidAmount: 0,
      status: 'pending',
      notes:
        'Por favor realizar el abono en las cuentas bancarias indicadas y remitir la constancia vía WhatsApp o correo electrónico.',
      bankAccounts: tenant.companyInfo?.bankAccounts || [],
    });
    setIsEditorOpen(true);
  };

  // Helper para generar cuotas de membresía
  const buildMembershipInstallments = (
    planName: string,
    unitPrice: number,
    monthsCount: number,
    baseIssueDate: string
  ): MembershipMonthItem[] => {
    const baseDate = baseIssueDate ? new Date(baseIssueDate + 'T00:00:00') : new Date();
    const installments: MembershipMonthItem[] = [];
    for (let i = 0; i < monthsCount; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const monthName = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
      const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      installments.push({
        id: `inst-${Date.now()}-${i + 1}-${Math.random().toString(36).substring(2, 5)}`,
        monthNumber: i + 1,
        planName: planName || 'Plan Membresía',
        periodName: `Mes ${i + 1}: ${formattedMonth}`,
        amount: unitPrice || 0,
        status: 'in_process',
        dueDate: new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 15).toISOString().split('T')[0],
      });
    }
    return installments;
  };

  const syncItemsFromInstallments = (installments: MembershipMonthItem[]): PaymentNoteItem[] => {
    return installments.map((inst, idx) => ({
      id: inst.id || `pni-inst-${idx + 1}`,
      title: `${inst.planName} - ${inst.periodName}`,
      description: `Cuota mensual (${inst.status === 'paid' ? 'Pagado' : inst.status === 'overdue' ? 'Vencido' : 'En proceso'})${inst.voucherName ? ` • Voucher: ${inst.voucherName}` : ''}`,
      quantity: 1,
      unitPrice: Number(inst.amount) || 0,
      total: Number(inst.amount) || 0,
    }));
  };

  const syncAllItems = (
    installments: MembershipMonthItem[],
    extras: PaymentNoteItem[] = []
  ): PaymentNoteItem[] => {
    const installmentItems = syncItemsFromInstallments(installments);
    return [...installmentItems, ...extras];
  };

  // Agregar Servicio Extra Fuera de Plan (Opción 2)
  const handleAddExtraItem = () => {
    const newExtra: PaymentNoteItem = {
      id: `extra-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title: 'Servicio Extra Fuera de Plan',
      description: '',
      quantity: 1,
      unitPrice: 250,
      total: 250,
    };
    setFormData((prev) => {
      const nextExtras = [...(prev.extraItems || []), newExtra];
      return {
        ...prev,
        extraItems: nextExtras,
        items: syncAllItems(prev.membershipInstallments || [], nextExtras),
      };
    });
    toast('Servicio adicional fuera de plan agregado.');
  };

  // Actualizar Servicio Extra
  const handleUpdateExtraItem = (index: number, patch: Partial<PaymentNoteItem>) => {
    setFormData((prev) => {
      const nextExtras = [...(prev.extraItems || [])];
      const cur = { ...nextExtras[index], ...patch };
      const qty = Number(cur.quantity) || 0;
      const price = Number(cur.unitPrice) || 0;
      cur.total = Math.max(0, Math.round(qty * price * 100) / 100);
      nextExtras[index] = cur;
      return {
        ...prev,
        extraItems: nextExtras,
        items: syncAllItems(prev.membershipInstallments || [], nextExtras),
      };
    });
  };

  // Eliminar Servicio Extra
  const handleDeleteExtraItem = (index: number) => {
    setFormData((prev) => {
      const nextExtras = (prev.extraItems || []).filter((_, i) => i !== index);
      return {
        ...prev,
        extraItems: nextExtras,
        items: syncAllItems(prev.membershipInstallments || [], nextExtras),
      };
    });
    toast('Servicio extra eliminado.');
  };

  // Abrir Edición de Nota de Pago
  const handleOpenEdit = (note: PaymentNote) => {
    setEditingNote(note);
    setSelectedBrandId(note.brandId || '');
    setFormData({
      code: note.code || '',
      quoteId: note.quoteId || '',
      quoteCode: note.quoteCode || '',
      clientId: note.clientId || '',
      clientName: note.clientName || '',
      companyName: note.companyName || '',
      brandId: note.brandId || '',
      brandName: note.brandName || '',
      documentType: note.documentType || 'RUC',
      documentNumber: note.documentNumber || '',
      whatsapp: note.whatsapp || '',
      email: note.email || '',
      issueDate: note.issueDate || '',
      dueDate: note.dueDate || '',
      paymentDate: note.paymentDate || '',
      paymentMethod: note.paymentMethod || 'Transferencia Bancaria BCP',
      operationNumber: note.operationNumber || '',
      currency: note.currency || 'PEN',
      currencySymbol: note.currencySymbol || 'S/',
      isMembership: !!note.isMembership,
      membershipPlanName: note.membershipPlanName || '',
      membershipMonthsTotal: note.membershipMonthsTotal || note.membershipInstallments?.length || 1,
      membershipInstallments: note.membershipInstallments || [],
      extraItems: note.extraItems || [],
      items: note.items || [],
      subtotal: Number(note.subtotal) || 0,
      includeTax: !!note.includeTax,
      taxRate: Number(note.taxRate) || 18,
      taxAmount: Number(note.taxAmount) || 0,
      discountAmount: Number(note.discountAmount) || 0,
      total: Number(note.total) || 0,
      paidAmount: Number(note.paidAmount) || 0,
      status: note.status || 'pending',
      notes: note.notes || '',
      bankAccounts: note.bankAccounts || tenant.companyInfo?.bankAccounts || [],
    });
    setIsEditorOpen(true);
  };

  // Aplicar servicio de marca a partidas
  const applyBrandServiceToItems = (brand: ClientBrand) => {
    if (!brand.serviceName) {
      toast('Esta marca no tiene un servicio contratado asignado.', 'warning');
      return;
    }

    const isMember = brand.serviceType === 'membership' || (Boolean(brand.serviceMonths) && (brand.serviceMonths || 0) > 1);
    const monthsCount = Math.max(1, brand.serviceMonths || 1);
    const unitPrice = Number(brand.servicePrice) || 0;

    if (isMember) {
      const installments = buildMembershipInstallments(
        brand.serviceName,
        unitPrice,
        monthsCount,
        formData.issueDate
      );
      setFormData((prev) => ({
        ...prev,
        isMembership: true,
        membershipPlanName: brand.serviceName,
        membershipMonthsTotal: monthsCount,
        membershipInstallments: installments,
        items: syncAllItems(installments, prev.extraItems || []),
      }));
      toast(`Membresía "${brand.serviceName}" con ${monthsCount} meses contratados aplicada.`);
    } else {
      const newItem: PaymentNoteItem = {
        id: `pni-${Date.now()}`,
        title: brand.serviceName,
        description: brand.serviceDescription || 'Servicio acordado contratado por la marca.',
        quantity: 1,
        unitPrice: unitPrice,
        total: unitPrice,
      };
      setFormData((prev) => ({
        ...prev,
        isMembership: false,
        membershipPlanName: undefined,
        membershipMonthsTotal: undefined,
        membershipInstallments: [],
        items: [newItem],
      }));
      toast(`Servicio contratado "${brand.serviceName}" aplicado.`);
    }
  };

  // Manejar cambio de marca
  const handleSelectBrand = (brandId: string) => {
    setSelectedBrandId(brandId);
    if (!selectedClient) return;
    const brand = selectedClient.brands?.find((b) => b.id === brandId);
    if (!brand) return;

    const isMember = brand.serviceType === 'membership' || (Boolean(brand.serviceMonths) && (brand.serviceMonths || 0) > 1);
    const monthsCount = Math.max(1, brand.serviceMonths || 1);
    const unitPrice = Number(brand.servicePrice) || 0;

    if (isMember && brand.serviceName) {
      const installments = buildMembershipInstallments(
        brand.serviceName,
        unitPrice,
        monthsCount,
        formData.issueDate
      );
      setFormData((prev) => ({
        ...prev,
        companyName: brand.name,
        brandId: brand.id,
        brandName: brand.name,
        isMembership: true,
        membershipPlanName: brand.serviceName,
        membershipMonthsTotal: monthsCount,
        membershipInstallments: installments,
        items: syncAllItems(installments, prev.extraItems || []),
      }));
      toast(`Marca "${brand.name}" seleccionada (Membresía: ${brand.serviceName} por ${monthsCount} meses).`);
    } else {
      let nextItems = formData.items;
      if (brand.serviceName) {
        nextItems = [
          {
            id: `pni-${Date.now()}`,
            title: brand.serviceName,
            description: brand.serviceDescription || 'Servicio acordado contratado por la marca.',
            quantity: 1,
            unitPrice: unitPrice,
            total: unitPrice,
          },
        ];
      }
      setFormData((prev) => ({
        ...prev,
        companyName: brand.name,
        brandId: brand.id,
        brandName: brand.name,
        isMembership: false,
        items: nextItems,
      }));
      if (brand.serviceName) {
        toast(`Marca "${brand.name}" seleccionada. Servicio: ${brand.serviceName} (${formData.currencySymbol}${unitPrice}).`);
      } else {
        toast(`Marca "${brand.name}" seleccionada.`);
      }
    }
  };

  // Alternar entre modo Conceptos estándar y Membresía
  const handleToggleMembershipMode = (isMember: boolean) => {
    if (isMember) {
      const planName = selectedBrand?.serviceName || 'Plan Membresía';
      const unitPrice = Number(selectedBrand?.servicePrice) || 500;
      const count = Math.max(1, selectedBrand?.serviceMonths || 3);
      const installments =
        formData.membershipInstallments && formData.membershipInstallments.length > 0
          ? formData.membershipInstallments
          : buildMembershipInstallments(planName, unitPrice, count, formData.issueDate);
      const syncedItems = syncAllItems(installments, formData.extraItems || []);
      setFormData((prev) => ({
        ...prev,
        isMembership: true,
        membershipPlanName: planName,
        membershipMonthsTotal: installments.length,
        membershipInstallments: installments,
        items: syncedItems,
      }));
      toast('Modo Membresía activado. Se visualizan todos los meses contratados.');
    } else {
      setFormData((prev) => ({
        ...prev,
        isMembership: false,
      }));
      toast('Modo Conceptos Estándar activado.');
    }
  };

  // Manejar actualización de una cuota/mes de membresía
  const handleUpdateInstallment = (idx: number, patch: Partial<MembershipMonthItem>) => {
    setFormData((prev) => {
      const list = [...(prev.membershipInstallments || [])];
      if (!list[idx]) return prev;
      list[idx] = { ...list[idx], ...patch };
      const syncedItems = syncAllItems(list, prev.extraItems || []);
      return {
        ...prev,
        membershipInstallments: list,
        items: syncedItems,
      };
    });
  };

  // Agregar un mes más a la membresía
  const handleAddInstallment = () => {
    setFormData((prev) => {
      const list = [...(prev.membershipInstallments || [])];
      const nextNum = list.length + 1;
      const baseDate = prev.issueDate ? new Date(prev.issueDate + 'T00:00:00') : new Date();
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + list.length, 1);
      const monthName = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
      const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      const lastAmount =
        list.length > 0 ? list[list.length - 1].amount : Number(selectedBrand?.servicePrice) || 0;
      const lastPlan =
        list.length > 0 ? list[list.length - 1].planName : selectedBrand?.serviceName || 'Plan Membresía';

      const newItem: MembershipMonthItem = {
        id: `inst-${Date.now()}-${nextNum}`,
        monthNumber: nextNum,
        planName: lastPlan,
        periodName: `Mes ${nextNum}: ${formattedMonth}`,
        amount: lastAmount,
        status: 'in_process',
        dueDate: new Date(baseDate.getFullYear(), baseDate.getMonth() + list.length, 15).toISOString().split('T')[0],
      };
      const updatedList = [...list, newItem];
      return {
        ...prev,
        membershipMonthsTotal: updatedList.length,
        membershipInstallments: updatedList,
        items: syncAllItems(updatedList, prev.extraItems || []),
      };
    });
    toast('Mes adicional añadido a la membresía.');
  };

  // Eliminar un mes de la membresía
  const handleDeleteInstallment = (idx: number) => {
    setFormData((prev) => {
      const list = (prev.membershipInstallments || []).filter((_, i) => i !== idx);
      const reindexed = list.map((item, i) => ({ ...item, monthNumber: i + 1 }));
      return {
        ...prev,
        membershipMonthsTotal: reindexed.length,
        membershipInstallments: reindexed,
        items: syncAllItems(reindexed, prev.extraItems || []),
      };
    });
    toast('Mes eliminado.');
  };

  // Lista memoizada de vouchers disponibles en este comprobante para vincular con 1 clic
  const availableVouchers = useMemo(() => {
    const list: {
      sourceLabel: string;
      url: string;
      name: string;
      operationNumber?: string;
      paidDate?: string;
      notes?: string;
      amount?: number;
    }[] = [];

    // De los meses de membresía
    formData.membershipInstallments?.forEach((m, i) => {
      if (m.voucherUrl) {
        list.push({
          sourceLabel: `Mes ${m.monthNumber || i + 1} (${m.periodName})`,
          url: m.voucherUrl,
          name: m.voucherName || `Voucher_Mes_${i + 1}`,
          operationNumber: m.operationNumber,
          paidDate: m.paidDate,
          notes: m.notes,
          amount: m.amount,
        });
      }
    });

    // De los servicios extras
    formData.extraItems?.forEach((ex, i) => {
      if (ex.voucherUrl) {
        list.push({
          sourceLabel: `Extra ${i + 1}: ${ex.title}`,
          url: ex.voucherUrl,
          name: ex.voucherName || `Voucher_Extra_${i + 1}`,
          operationNumber: ex.operationNumber,
          paidDate: ex.paidDate,
          notes: ex.notes,
          amount: ex.total,
        });
      }
    });

    return list;
  }, [formData.membershipInstallments, formData.extraItems]);

  // Ejecutar OCR en un voucher
  const runOcrOnImage = async (
    key: string,
    fileOrUrl: File | string,
    onSuccess: (res: { operationNumber?: string; amount?: number; date?: string; notes?: string }) => void
  ) => {
    setOcrProcessingKey(key);
    setOcrStatusText('Iniciando escaneo inteligente...');
    try {
      const res = await parseVoucherWithOcr(fileOrUrl, (pct, status) => {
        setOcrStatusText(status);
      });

      let extraNote = '';
      if (res.amount && res.amount > 0) {
        const bank = res.bankDetected ? ` [${res.bankDetected}]` : '';
        extraNote = `Abono detectado en voucher: ${formData.currencySymbol} ${res.amount.toFixed(2)}${bank}`;
      }

      onSuccess({
        operationNumber: res.operationNumber,
        amount: res.amount,
        date: res.date,
        notes: extraNote || undefined,
      });

      if (res.operationNumber || res.amount) {
        toast(`✨ OCR completado: Op. ${res.operationNumber || 'detectada'}, monto ${formData.currencySymbol} ${res.amount || '—'}.`);
      } else {
        toast('OCR completado. Puedes ajustar los campos manualmente si es necesario.');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      toast('No se pudo extraer texto del voucher automáticamente. Puedes ingresar los datos manualmente.', 'warning');
    } finally {
      setOcrProcessingKey(null);
      setOcrStatusText('');
    }
  };

  // Subir voucher a un mes de membresía (con auto-OCR)
  const handleUploadVoucher = (idx: number, file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast('El voucher no debe superar los 10MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const url = reader.result as string;
      const targetMonth = formData.membershipInstallments?.[idx];
      const monthAmount = targetMonth ? Number(targetMonth.amount) || 0 : 0;

      // 1. Guardar de inmediato el voucher y marcar como pagado
      handleUpdateInstallment(idx, {
        voucherUrl: url,
        voucherName: file.name,
        status: 'paid',
        paidDate: targetMonth?.paidDate || new Date().toISOString().split('T')[0],
      });
      toast(`Voucher "${file.name}" adjuntado al Mes ${idx + 1}.`);

      // 2. Ejecutar OCR si es imagen
      if (file.type.startsWith('image/')) {
        await runOcrOnImage(`inst-${idx}`, file, (ocrData) => {
          const patch: Partial<MembershipMonthItem> = {};
          if (ocrData.operationNumber) patch.operationNumber = ocrData.operationNumber;
          if (ocrData.date) patch.paidDate = ocrData.date;
          if (ocrData.amount) {
            if (ocrData.amount > monthAmount) {
              patch.notes = `Voucher por ${formData.currencySymbol} ${ocrData.amount.toFixed(2)} (Cubre cuota ${formData.currencySymbol} ${monthAmount} + saldo de otros servicios)`;
            } else if (!targetMonth?.notes) {
              patch.notes = ocrData.notes;
            }
          }
          handleUpdateInstallment(idx, patch);
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Escanear nuevamente un voucher existente en un mes
  const handleReRunOcrInstallment = (idx: number) => {
    const inst = formData.membershipInstallments?.[idx];
    if (!inst?.voucherUrl) return;
    runOcrOnImage(`inst-${idx}`, inst.voucherUrl, (ocrData) => {
      const patch: Partial<MembershipMonthItem> = {};
      if (ocrData.operationNumber) patch.operationNumber = ocrData.operationNumber;
      if (ocrData.date) patch.paidDate = ocrData.date;
      if (ocrData.notes && !inst.notes) patch.notes = ocrData.notes;
      handleUpdateInstallment(idx, patch);
    });
  };

  // Vincular voucher existente a un mes
  const handleLinkVoucherToInstallment = (
    idx: number,
    source: { url: string; name: string; operationNumber?: string; paidDate?: string; notes?: string }
  ) => {
    handleUpdateInstallment(idx, {
      voucherUrl: source.url,
      voucherName: source.name,
      operationNumber: source.operationNumber || undefined,
      paidDate: source.paidDate || new Date().toISOString().split('T')[0],
      status: 'paid',
      notes: source.notes ? `Voucher compartido: ${source.notes}` : undefined,
    });
    toast(`Voucher de "${source.name}" vinculado al Mes ${idx + 1}.`);
  };

  // Remover voucher de un mes
  const handleRemoveVoucher = (idx: number) => {
    handleUpdateInstallment(idx, {
      voucherUrl: undefined,
      voucherName: undefined,
    });
    toast(`Voucher del Mes ${idx + 1} eliminado.`);
  };

  // Subir voucher a un servicio extra (con auto-OCR)
  const handleUploadExtraVoucher = (idx: number, file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast('El voucher no debe superar los 10MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const url = reader.result as string;
      const targetExtra = formData.extraItems?.[idx];

      handleUpdateExtraItem(idx, {
        voucherUrl: url,
        voucherName: file.name,
        status: 'paid',
        paidDate: targetExtra?.paidDate || new Date().toISOString().split('T')[0],
      });
      toast(`Voucher "${file.name}" adjuntado al servicio extra.`);

      if (file.type.startsWith('image/')) {
        await runOcrOnImage(`extra-${idx}`, file, (ocrData) => {
          const patch: Partial<PaymentNoteItem> = {};
          if (ocrData.operationNumber) patch.operationNumber = ocrData.operationNumber;
          if (ocrData.date) patch.paidDate = ocrData.date;
          if (ocrData.notes && !targetExtra?.notes) patch.notes = ocrData.notes;
          handleUpdateExtraItem(idx, patch);
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Vincular voucher existente a un servicio extra
  const handleLinkVoucherToExtra = (
    idx: number,
    source: { url: string; name: string; operationNumber?: string; paidDate?: string; notes?: string }
  ) => {
    handleUpdateExtraItem(idx, {
      voucherUrl: source.url,
      voucherName: source.name,
      operationNumber: source.operationNumber || undefined,
      paidDate: source.paidDate || new Date().toISOString().split('T')[0],
      status: 'paid',
      notes: source.notes ? `Voucher compartido: ${source.notes}` : 'Pagado con voucher compartido de la misma transferencia',
    });
    toast(`Voucher vinculado al servicio extra. Marcado como Pagado.`);
  };

  // Remover voucher de un servicio extra
  const handleRemoveExtraVoucher = (idx: number) => {
    handleUpdateExtraItem(idx, {
      voucherUrl: undefined,
      voucherName: undefined,
    });
    toast('Voucher del servicio extra eliminado.');
  };

  // Pegar imagen del voucher directamente desde el portapapeles (Botón o Ctrl + V)
  const handlePasteFromClipboard = async (idx: number, isExtra = false) => {
    try {
      if (navigator.clipboard?.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
            const file = new File([blob], `Voucher_Pegado_${dateStr}.png`, { type: imageType });
            if (isExtra) {
              handleUploadExtraVoucher(idx, file);
            } else {
              handleUploadVoucher(idx, file);
            }
            toast('¡Voucher pegado desde el portapapeles! Analizando con OCR...');
            return;
          }
        }
      }
      toast('No se encontró imagen en el portapapeles. Copia la captura del voucher y presiona de nuevo.', 'warning');
    } catch (err) {
      toast('Haz clic sobre esta tarjeta y presiona Ctrl + V en tu teclado para pegar la captura.', 'info');
    }
  };

  // Manejar evento de pegado con teclado (Ctrl + V) sobre cualquier elemento de la tarjeta
  const handleCardPaste = (e: React.ClipboardEvent, idx: number, isExtra = false) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
          const renamed = new File([file], `Voucher_Pegado_${dateStr}.png`, { type: file.type });
          if (isExtra) {
            handleUploadExtraVoucher(idx, renamed);
          } else {
            handleUploadVoucher(idx, renamed);
          }
          toast('¡Voucher capturado con Ctrl + V! Analizando con OCR...');
          break;
        }
      }
    }
  };

  // Manejar cambio de cliente
  const handleSelectClient = (clientId: string) => {
    const found = clients.find((c) => c.id === clientId);
    if (!found) {
      setSelectedBrandId('');
      setFormData((prev) => ({
        ...prev,
        clientId: '',
        clientName: '',
        companyName: '',
        brandId: '',
        brandName: '',
      }));
      return;
    }

    const firstBrand = found.brands?.[0];
    setSelectedBrandId(firstBrand?.id || '');

    let nextItems = formData.items;
    if (firstBrand && firstBrand.serviceName) {
      nextItems = [
        {
          id: `pni-${Date.now()}`,
          title: firstBrand.serviceName,
          description: firstBrand.serviceDescription || 'Servicio acordado contratado por la marca.',
          quantity: 1,
          unitPrice: Number(firstBrand.servicePrice) || 0,
          total: Number(firstBrand.servicePrice) || 0,
        },
      ];
    }

    setFormData((prev) => ({
      ...prev,
      clientId: found.id,
      clientName: found.name,
      companyName: firstBrand?.name || found.name,
      brandId: firstBrand?.id || '',
      brandName: firstBrand?.name || '',
      documentType: found.documentType as any,
      documentNumber: found.documentNumber,
      whatsapp: found.whatsapp,
      email: found.email || '',
      items: nextItems,
    }));

    if (firstBrand?.serviceName) {
      toast(`Cliente "${found.name}" y marca "${firstBrand.name}" seleccionados con su servicio contratado.`);
    }
  };

  // Cargar datos desde una Cotización
  const handleLoadFromQuote = (quoteId: string) => {
    const found = quotes.find((q) => q.id === quoteId);
    if (!found) return;

    const importedItems: PaymentNoteItem[] = found.items.map((it) => ({
      id: `pni-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title: it.title,
      description: it.description?.replace(/<[^>]+>/g, ' ').substring(0, 150) || '',
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      total: it.total,
    }));

    setFormData((prev) => ({
      ...prev,
      quoteId: found.id,
      quoteCode: found.code,
      clientId: found.clientId || prev.clientId,
      clientName: found.clientName || prev.clientName,
      companyName: found.companyName || prev.companyName,
      documentType: (found.documentType as any) || prev.documentType,
      documentNumber: found.documentNumber || prev.documentNumber,
      whatsapp: found.whatsapp || prev.whatsapp,
      email: found.email || prev.email,
      currency: found.currency as any,
      currencySymbol: found.currencySymbol,
      items: importedItems.length > 0 ? importedItems : prev.items,
      includeTax: found.includeTax,
      taxRate: found.taxRate,
      discountAmount: found.discountAmount || 0,
      bankAccounts: found.paymentMethods || tenant.companyInfo?.bankAccounts || [],
    }));

    toast(`Datos y partidas cargados desde cotización ${found.code}`);
  };

  // Agregar partida manual
  const handleAddItem = () => {
    const newItem: PaymentNoteItem = {
      id: `item-${Date.now()}`,
      title: 'Nuevo Concepto o Servicio',
      description: '',
      quantity: 1,
      unitPrice: 500,
      total: 500,
    };
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  // Actualizar partida
  const handleUpdateItem = (index: number, patch: Partial<PaymentNoteItem>) => {
    setFormData((prev) => {
      const next = [...prev.items];
      const cur = { ...next[index], ...patch };
      const qty = Number(cur.quantity) || 0;
      const price = Number(cur.unitPrice) || 0;
      cur.total = Math.max(0, Math.round(qty * price * 100) / 100);
      next[index] = cur;
      return { ...prev, items: next };
    });
  };

  // Eliminar partida
  const handleDeleteItem = (index: number) => {
    if (formData.items.length <= 1) {
      toast('Debe haber al menos 1 concepto en la nota de pago.', 'warning');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Insertar servicio desde catálogo
  const handleSelectServiceToItem = (service: Service, packageTier?: ServicePackageTier) => {
    const title = packageTier ? `${service.title} (${packageTier.name})` : service.title;
    const unitPrice = packageTier ? Number(packageTier.price) || 0 : Number(service.basePrice) || 0;
    const desc = service.briefDescription || '';

    const newItem: PaymentNoteItem = {
      id: `pni-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title,
      description: desc,
      quantity: 1,
      unitPrice,
      total: unitPrice,
    };

    if (pickerTarget === 'extra') {
      setFormData((prev) => {
        const nextExtras = [...(prev.extraItems || []), newItem];
        return {
          ...prev,
          extraItems: nextExtras,
          items: syncAllItems(prev.membershipInstallments || [], nextExtras),
        };
      });
      toast(`Servicio extra "${title}" añadido.`);
    } else {
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, newItem],
      }));
      toast(`Servicio "${title}" añadido.`);
    }

    setIsServicePickerOpen(false);
  };

  // Guardar Nota de Pago
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) {
      toast('El nombre o empresa del cliente es obligatorio.', 'warning');
      return;
    }
    if (formData.items.length === 0) {
      toast('Agrega al menos una partida a la nota de pago.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payloadToSave = {
        ...formData,
        bankAccounts: globalBankAccounts,
      };
      if (editingNote) {
        await apiFetch(`/api/payment-notes/${editingNote.id}`, {
          method: 'PUT',
          body: JSON.stringify(payloadToSave),
        });
        toast('Nota de pago actualizada con éxito.');
      } else {
        await apiFetch('/api/payment-notes', {
          method: 'POST',
          body: JSON.stringify(payloadToSave),
        });
        toast('Nota de pago creada con éxito.');
      }
      setIsEditorOpen(false);
      setEditingNote(null);
      await loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar Nota de Pago
  const handleDelete = async (note: PaymentNote) => {
    const confirmed = await confirmAction({
      title: '¿Eliminar Nota de Pago?',
      message: `Se eliminará permanentemente la nota de pago ${note.code} de ${note.companyName}. Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await apiFetch(`/api/payment-notes/${note.id}`, { method: 'DELETE' });
      toast(`Nota de pago ${note.code} eliminada.`);
      await loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  // Copiar Enlace Público
  const handleCopyPublicLink = async (note: PaymentNote) => {
    const url = `${window.location.origin}/p/pago/${note.publicToken}`;
    const copied = await copyTextToClipboard(url);
    if (copied) {
      toast('Enlace público de la nota de pago copiado al portapapeles.');
    } else {
      toast('No se pudo copiar automáticamente. Usa el enlace directo.', 'warning');
    }
  };

  // Compartir por WhatsApp
  const handleShareWhatsApp = (note: PaymentNote) => {
    const url = `${window.location.origin}/p/pago/${note.publicToken}`;
    const agencyName = tenant.companyInfo?.commercialName || tenant.companyInfo?.brandName || tenant.name;
    const msg = encodeURIComponent(
      `Hola *${note.clientName}*,\n\nTe compartimos tu *Nota de Pago ${note.code}* de *${agencyName}* por *${note.currencySymbol} ${note.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}*.\n\nPuedes verla y descargar tu comprobante aquí:\n${url}\n\n¡Gracias por tu preferencia!`
    );
    window.open(`https://wa.me/${(note.whatsapp || '').replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
  };

  // Abrir Modal de Pago Rápido
  const handleOpenQuickPay = (note: PaymentNote) => {
    setQuickPayNote(note);
    setQuickPayData({
      paidAmount: note.total,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: note.paymentMethod || 'Transferencia Bancaria BCP',
      operationNumber: note.operationNumber || '',
    });
  };

  // Guardar Pago Rápido
  const handleSaveQuickPay = async () => {
    if (!quickPayNote) return;
    try {
      const isFull = quickPayData.paidAmount >= quickPayNote.total;
      await apiFetch(`/api/payment-notes/${quickPayNote.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          paidAmount: quickPayData.paidAmount,
          paymentDate: quickPayData.paymentDate,
          paymentMethod: quickPayData.paymentMethod,
          operationNumber: quickPayData.operationNumber,
          status: isFull ? 'paid' : quickPayData.paidAmount > 0 ? 'partial' : 'pending',
        }),
      });
      toast(`Cobro registrado para la nota ${quickPayNote.code}.`);
      setQuickPayNote(null);
      await loadData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  // =============================================================================
  // VISTA 1: EDITOR SPA DE NOTA DE PAGO
  // =============================================================================
  if (isEditorOpen) {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Cabecera del Editor (Sticky App-Like) */}
        <div className="sticky top-2 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl px-3 sm:px-4 py-2.5 shadow-md flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                setIsEditorOpen(false);
                setEditingNote(null);
              }}
              className="p-2 sm:p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-slate-600 dark:text-slate-300 shrink-0"
              title="Volver al listado"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden md:inline text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 truncate">
                {editingNote ? 'Modificar Comprobante' : 'Nueva Nota de Pago'}
              </span>
              <span className="font-mono text-[11px] sm:text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 whitespace-nowrap shrink-0">
                {formData.code || 'NP-2026-XXX'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botón Vista Previa en Móvil (< xl) */}
            <button
              type="button"
              onClick={() => setIsMobilePreviewOpen(true)}
              className="xl:hidden p-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
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
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 ring-2 ring-emerald-600/10'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title={showLivePreview ? 'Ocultar vista previa y centrar formulario' : 'Mostrar vista previa en vivo'}
            >
              {showLivePreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>
                {showLivePreview ? 'Ocultar Vista Previa' : 'Previsualización'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsEditorOpen(false);
                setEditingNote(null);
              }}
              className="hidden sm:inline-flex px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="px-3.5 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Save className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{saving ? 'Guardando...' : 'Guardar Comprobante'}</span>
              <span className="sm:hidden">{saving ? '...' : 'Guardar'}</span>
            </button>
          </div>
        </div>

        {/* CONTENEDOR: 2 COLUMNAS O FORMULARIO CENTRADO */}
        <div className={showLivePreview ? 'w-full max-w-[1720px] mx-auto' : 'w-full max-w-4xl mx-auto'}>
          <div className={showLivePreview ? 'grid grid-cols-1 xl:grid-cols-12 gap-6 items-start' : ''}>
            {/* Columna Izquierda / Centrado: Campos del Formulario */}
            <div className={showLivePreview ? 'xl:col-span-7' : 'w-full'}>
              <form onSubmit={handleSubmit} className="space-y-5">
          {/* SECCIÓN 1: DATOS GENERALES Y CLIENTE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>1. Información del Comprobante & Cliente</span>
              </h3>

              {quotes.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">¿Vincular a Cotización?</span>
                  <select
                    value={formData.quoteId || ''}
                    onChange={(e) => handleLoadFromQuote(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="">Seleccionar Cotización...</option>
                    {quotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.code} • {q.companyName} ({q.currencySymbol} {q.total})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Código Correlativo
                </label>
                <input
                  type="text"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Cliente Registrado
                </label>
                <select
                  value={formData.clientId || ''}
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                >
                  <option value="">Cliente Personalizado / No Registrado</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.brands?.[0] ? `(${c.brands[0].name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Marca Comercial del Cliente */}
              {selectedClient && selectedClient.brands && selectedClient.brands.length > 0 ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center justify-between">
                    <span>Marca Comercial</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold">
                      {selectedClient.brands.length} {selectedClient.brands.length === 1 ? 'marca' : 'marcas'}
                    </span>
                  </label>
                  <select
                    value={selectedBrandId || ''}
                    onChange={(e) => handleSelectBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-800 text-xs font-bold bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 outline-none"
                  >
                    {selectedClient.brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.serviceName ? `• [${b.serviceName} - ${formData.currencySymbol}${b.servicePrice}]` : '• (Sin servicio asignado)'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Empresa / Razón Social
                </label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Ej. Inka Gourmet SAC"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Nombre de Contacto
                </label>
                <input
                  type="text"
                  value={formData.clientName || ''}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Ej. Valeria Mendoza"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Tipo & N° Documento
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={formData.documentType || 'RUC'}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value as any })}
                    className="w-24 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="RUC">RUC</option>
                    <option value="DNI">DNI</option>
                    <option value="CE">CE</option>
                    <option value="PASSPORT">Pasaporte</option>
                    <option value="OTRO">Otro</option>
                  </select>
                  <input
                    type="text"
                    value={formData.documentNumber || ''}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    placeholder="20608976543"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  WhatsApp / Celular
                </label>
                <input
                  type="text"
                  value={formData.whatsapp || ''}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+51 987 654 321"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Fecha de Emisión
                </label>
                <input
                  type="date"
                  value={formData.issueDate || ''}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>

            {/* DETALLE DEL SERVICIO CONTRATADO DE LA MARCA SELECCIONADA */}
            {selectedBrand && (
              <div className="p-4 rounded-2xl border border-indigo-200/90 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-indigo-100 dark:border-indigo-900/40">
                  <div className="flex items-center gap-2.5">
                    {selectedBrand.logoUrl ? (
                      <img
                        src={selectedBrand.logoUrl}
                        alt={selectedBrand.name}
                        className="w-6 h-6 rounded-lg object-contain bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 shrink-0"
                      />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-lg flex items-center justify-center font-black text-[10px] text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: selectedBrand.brandColor || '#4f46e5' }}
                      >
                        {selectedBrand.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                          Marca: {selectedBrand.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          ({selectedBrand.industry || 'General'})
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedBrand.serviceName && (
                    <button
                      type="button"
                      onClick={() => applyBrandServiceToItems(selectedBrand)}
                      className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Cargar o re-aplicar este servicio como partida principal de la nota de pago"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Cargar a Partidas</span>
                    </button>
                  )}
                </div>

                {selectedBrand.serviceName ? (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-8 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Servicio Contratado
                        </span>
                        <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                          {selectedBrand.serviceName}
                        </h4>
                      </div>
                      {selectedBrand.serviceDescription && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                          {selectedBrand.serviceDescription}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-right">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Inversión Acordada
                      </span>
                      <span className="text-lg font-black font-mono-pin text-indigo-600 dark:text-indigo-400 block mt-0.5">
                        {formData.currencySymbol} {Number(selectedBrand.servicePrice || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 mt-0.5">
                        <Check className="w-3 h-3" /> Servicio Activo Asignado
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between py-1">
                    <span>
                      Esta marca no tiene un servicio asignado en el módulo de clientes. Puedes asignar uno en Clientes o agregar conceptos manualmente.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: CONCEPTOS Y PARTIDAS O MESES DE MEMBRESÍA */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {formData.isMembership ? (
                    <>
                      <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>2. Meses Contratados de la Membresía</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>2. Conceptos a Cobrar / Entregables</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  {formData.isMembership
                    ? 'Gestiona cada mes contratado con su plan, monto, voucher adjunto y estado de pago.'
                    : 'Agrega partidas manuales o impórtalas con un clic desde el catálogo de servicios.'}
                </p>
              </div>

              {/* Selector de Modo: Partidas Estándar vs Membresía */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleToggleMembershipMode(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      !formData.isMembership
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Partidas Estándar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleMembershipMode(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      formData.isMembership
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Membresía / Meses</span>
                  </button>
                </div>

                {!formData.isMembership ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPickerTarget('standard');
                        setPickerSearch('');
                        setPickerCategory('all');
                        setIsServicePickerOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Jalar desde Servicios ({services.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Concepto</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAddInstallment}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Mes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPickerTarget('extra');
                        setPickerSearch('');
                        setPickerCategory('all');
                        setIsServicePickerOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      title="Jalar un servicio del catálogo como extra adicional fuera del plan de membresía"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Jalar Extra de Catálogo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddExtraItem}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                      title="Cobrar un servicio o entregable adicional fuera de la membresía en esta misma nota"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Servicio Extra</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CASO A: VISTA DE MESES CONTRATADOS DE MEMBRESÍA */}
            {formData.isMembership ? (
              <div className="space-y-3">
                {(!formData.membershipInstallments || formData.membershipInstallments.length === 0) ? (
                  <div className="p-8 rounded-2xl border border-dashed border-purple-200 dark:border-purple-900/60 text-center space-y-3 bg-purple-50/30 dark:bg-purple-950/20">
                    <Crown className="w-8 h-8 text-purple-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No hay meses generados aún para esta membresía.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddInstallment}
                      className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xs hover:bg-purple-500 cursor-pointer"
                    >
                      Generar Mes 1
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.membershipInstallments.map((inst, idx) => (
                      <div
                        key={inst.id || idx}
                        tabIndex={0}
                        onPaste={(e) => handleCardPaste(e, idx, false)}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3 transition hover:border-purple-300 dark:hover:border-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      >
                        {/* Fila Principal: Encabezado y Datos del Mes */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          {/* Número y Nombre del Plan */}
                          <div className="sm:col-span-4 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {inst.monthNumber || idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                Nombre del Plan
                              </label>
                              <input
                                type="text"
                                value={inst.planName}
                                onChange={(e) =>
                                  handleUpdateInstallment(idx, { planName: e.target.value })
                                }
                                placeholder="Ej. Plan Inicio, Plan Pro..."
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-extrabold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                              />
                            </div>
                          </div>

                          {/* Mes / Período */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                              Mes / Período
                            </label>
                            <input
                              type="text"
                              value={inst.periodName}
                              onChange={(e) =>
                                handleUpdateInstallment(idx, { periodName: e.target.value })
                              }
                              placeholder="Ej. Mes 1: Noviembre 2026..."
                              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                            />
                          </div>

                          {/* Monto */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                              Monto ({formData.currencySymbol})
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={inst.amount}
                                onChange={(e) =>
                                  handleUpdateInstallment(idx, {
                                    amount: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black font-mono bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400"
                              />
                            </div>
                          </div>

                          {/* Botón Eliminar Mes */}
                          <div className="sm:col-span-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleDeleteInstallment(idx)}
                              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                              title="Eliminar este mes de la membresía"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Fila Secundaria: Voucher Adjunto, OCR y Estado del Mes */}
                        <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                          {/* CAMPO PARA ADJUNTAR VOUCHER */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Paperclip className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>Voucher de Pago:</span>
                            </span>

                            {inst.voucherUrl ? (
                              <div className="flex items-center gap-1.5 p-1 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                                <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 max-w-[160px] sm:max-w-[200px] truncate">
                                  {inst.voucherName || 'Voucher adjuntado'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewingVoucher({
                                      url: inst.voucherUrl!,
                                      name: inst.voucherName || `Voucher_Mes_${idx + 1}`,
                                    })
                                  }
                                  className="p-1 rounded-lg hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 cursor-pointer ml-1"
                                  title="Ver comprobante adjunto"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReRunOcrInstallment(idx)}
                                  disabled={ocrProcessingKey === `inst-${idx}`}
                                  className="p-1 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-950/60 text-purple-600 cursor-pointer disabled:opacity-50"
                                  title="Escanear voucher con OCR para extraer N° de Operación y Monto"
                                >
                                  {ocrProcessingKey === `inst-${idx}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                                  ) : (
                                    <Sparkles className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveVoucher(idx)}
                                  className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-500 cursor-pointer"
                                  title="Eliminar voucher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer transition shadow-2xs hover:text-purple-600">
                                  <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Adjuntar Voucher (Auto-OCR)</span>
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    onChange={(e) => handleUploadVoucher(idx, e.target.files?.[0])}
                                  />
                                </label>

                                <button
                                  type="button"
                                  onClick={() => handlePasteFromClipboard(idx, false)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold cursor-pointer transition shadow-2xs"
                                  title="Pegar imagen del voucher copiada al portapapeles (o presiona Ctrl + V)"
                                >
                                  <ClipboardPaste className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                  <span>Pegar Voucher (Ctrl+V)</span>
                                </button>

                                {availableVouchers.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400">o vincular:</span>
                                    {availableVouchers.slice(0, 2).map((av, avIdx) => (
                                      <button
                                        key={avIdx}
                                        type="button"
                                        onClick={() => handleLinkVoucherToInstallment(idx, av)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold hover:bg-purple-100 transition cursor-pointer"
                                        title={`Usar el voucher de ${av.sourceLabel}`}
                                      >
                                        <Link2 className="w-3 h-3" />
                                        <span>Usar de {av.sourceLabel.split(' ')[0]} {av.sourceLabel.split(' ')[1]}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {ocrProcessingKey === `inst-${idx}` && (
                              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>{ocrStatusText || 'Extrayendo datos con OCR...'}</span>
                              </span>
                            )}
                          </div>

                          {/* CAMPO DE ESTADO: PAGADO, EN PROCESO, VENCIDO */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-400 mr-1">
                              Estado del Mes:
                            </span>

                            {/* Botón Pagado */}
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateInstallment(idx, {
                                  status: 'paid',
                                  paidDate: inst.paidDate || new Date().toISOString().split('T')[0],
                                });
                              }}
                              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition flex items-center gap-1 cursor-pointer ${
                                inst.status === 'paid'
                                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pagado</span>
                            </button>

                            {/* Botón En Proceso */}
                            <button
                              type="button"
                              onClick={() => handleUpdateInstallment(idx, { status: 'in_process' })}
                              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition flex items-center gap-1 cursor-pointer ${
                                inst.status === 'in_process'
                                  ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-500/30'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>En Proceso</span>
                            </button>

                            {/* Botón Vencido */}
                            <button
                              type="button"
                              onClick={() => handleUpdateInstallment(idx, { status: 'overdue' })}
                              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition flex items-center gap-1 cursor-pointer ${
                                inst.status === 'overdue'
                                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/30'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <AlertCircle className="w-3 h-3" />
                              <span>Vencido</span>
                            </button>
                          </div>
                        </div>

                        {/* Fila Terciaria: N° de Operación, Fecha de Abono y Nota Adicional */}
                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                          {/* N° de Operación */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                              N° de Operación
                            </label>
                            <input
                              type="text"
                              value={inst.operationNumber || ''}
                              onChange={(e) =>
                                handleUpdateInstallment(idx, { operationNumber: e.target.value })
                              }
                              placeholder="Ej. Op: 1827491"
                              className="w-full px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                            />
                          </div>

                          {/* Fecha de Abono */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                              Fecha de Abono
                            </label>
                            <input
                              type="date"
                              value={inst.paidDate || ''}
                              onChange={(e) =>
                                handleUpdateInstallment(idx, { paidDate: e.target.value })
                              }
                              className="w-full px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                            />
                          </div>

                          {/* Nota Adicional / Desglose */}
                          <div className="sm:col-span-6">
                            <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                              Nota Adicional / Desglose de Abono
                            </label>
                            <input
                              type="text"
                              value={inst.notes || ''}
                              onChange={(e) =>
                                handleUpdateInstallment(idx, { notes: e.target.value })
                              }
                              placeholder="Ej. Transfirió S/ 700 en total (400 membresía + 300 menú)..."
                              className="w-full px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* BLOQUE B: SERVICIOS ADICIONALES / EXTRAS FUERA DE PLAN (OPCIÓN 2) */}
                <div className="pt-4 mt-2 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400">
                        <Sparkles className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Servicios Adicionales / Extras Fuera de Plan ({formData.extraItems?.length || 0})
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Entregables o requerimientos adicionales que se cobran en conjunto con la membresía.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPickerTarget('extra');
                          setPickerSearch('');
                          setPickerCategory('all');
                          setIsServicePickerOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-2xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Catálogo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddExtraItem}
                        className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Extra</span>
                      </button>
                    </div>
                  </div>

                  {formData.extraItems && formData.extraItems.length > 0 ? (
                    <div className="space-y-3">
                      {formData.extraItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          tabIndex={0}
                          onPaste={(e) => handleCardPaste(e, idx, true)}
                          className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20 space-y-3 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="w-6 h-6 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                                +{idx + 1}
                              </span>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => handleUpdateExtraItem(idx, { title: e.target.value })}
                                placeholder="Nombre del servicio adicional (ej. Sesión Fotográfica Extra, Pauta Publicitaria)..."
                                className="font-extrabold text-sm text-slate-900 dark:text-slate-100 bg-transparent outline-none w-full border-b border-transparent focus:border-amber-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteExtraItem(idx)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                              title="Eliminar este servicio extra"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleUpdateExtraItem(idx, { description: e.target.value })}
                            placeholder="Detalles o especificaciones del servicio extra (opcional)..."
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900"
                          />

                          <div className="grid grid-cols-3 gap-3 pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateExtraItem(idx, { quantity: Number(e.target.value) || 1 })
                                }
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-900"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                P. Unitario ({formData.currencySymbol})
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdateExtraItem(idx, { unitPrice: Number(e.target.value) || 0 })
                                }
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-900 font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                Importe ({formData.currencySymbol})
                              </label>
                              <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black bg-white dark:bg-slate-900 font-mono text-amber-600 dark:text-amber-400">
                                {formData.currencySymbol} {Number(item.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>

                          {/* Fila Cuarta: Voucher de Pago, OCR y Estado del Servicio Extra */}
                          <div className="pt-2 border-t border-amber-200/50 dark:border-amber-900/40 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Paperclip className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Voucher:</span>
                              </span>

                              {item.voucherUrl ? (
                                <div className="flex items-center gap-1.5 p-1 px-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800">
                                  <FileCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                                  <span className="text-xs font-bold text-amber-800 dark:text-amber-200 max-w-[160px] sm:max-w-[200px] truncate">
                                    {item.voucherName || 'Voucher extra'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingVoucher({
                                        url: item.voucherUrl!,
                                        name: item.voucherName || `Voucher_Extra_${idx + 1}`,
                                      })
                                    }
                                    className="p-1 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-100 cursor-pointer ml-1"
                                    title="Ver comprobante adjunto"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (item.voucherUrl) {
                                        runOcrOnImage(`extra-${idx}`, item.voucherUrl, (ocrData) => {
                                          const patch: Partial<PaymentNoteItem> = {};
                                          if (ocrData.operationNumber) patch.operationNumber = ocrData.operationNumber;
                                          if (ocrData.date) patch.paidDate = ocrData.date;
                                          if (ocrData.notes && !item.notes) patch.notes = ocrData.notes;
                                          handleUpdateExtraItem(idx, patch);
                                        });
                                      }
                                    }}
                                    disabled={ocrProcessingKey === `extra-${idx}`}
                                    className="p-1 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 cursor-pointer disabled:opacity-50"
                                    title="Escanear voucher con OCR"
                                  >
                                    {ocrProcessingKey === `extra-${idx}` ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                    ) : (
                                      <Sparkles className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveExtraVoucher(idx)}
                                    className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-500 cursor-pointer"
                                    title="Eliminar voucher de este servicio"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-500 bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer transition shadow-2xs">
                                    <UploadCloud className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Adjuntar Voucher (Auto-OCR)</span>
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      className="hidden"
                                      onChange={(e) => handleUploadExtraVoucher(idx, e.target.files?.[0])}
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => handlePasteFromClipboard(idx, true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-bold cursor-pointer transition shadow-2xs"
                                    title="Pegar imagen del voucher copiada al portapapeles (o presiona Ctrl + V)"
                                  >
                                    <ClipboardPaste className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                                    <span>Pegar Voucher (Ctrl+V)</span>
                                  </button>

                                  {/* Botón inteligente para reutilizar el voucher de cualquier mes que ya esté subido */}
                                  {availableVouchers.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-slate-400">o vincular:</span>
                                      {availableVouchers.map((av, avIdx) => (
                                        <button
                                          key={avIdx}
                                          type="button"
                                          onClick={() => handleLinkVoucherToExtra(idx, av)}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold hover:bg-amber-200 transition cursor-pointer"
                                          title={`Reutilizar el voucher de ${av.sourceLabel} para este servicio adicional`}
                                        >
                                          <Link2 className="w-3 h-3" />
                                          <span>Usar de {av.sourceLabel.split(' ')[0]} {av.sourceLabel.split(' ')[1]}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {ocrProcessingKey === `extra-${idx}` && (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>{ocrStatusText || 'Extrayendo datos con OCR...'}</span>
                                </span>
                              )}
                            </div>

                            {/* Estado del Servicio Extra: Pagado vs En Proceso */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-400 mr-1">
                                Estado:
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateExtraItem(idx, {
                                    status: 'paid',
                                    paidDate: item.paidDate || new Date().toISOString().split('T')[0],
                                  })
                                }
                                className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition flex items-center gap-1 cursor-pointer ${
                                  item.status === 'paid'
                                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Pagado</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateExtraItem(idx, { status: 'in_process' })}
                                className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition flex items-center gap-1 cursor-pointer ${
                                  item.status !== 'paid'
                                    ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-500/30'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                <span>En Proceso</span>
                              </button>
                            </div>
                          </div>

                          {/* Fila Quinta: N° de Operación, Fecha de Abono y Nota Adicional */}
                          <div className="pt-2 border-t border-amber-200/40 dark:border-amber-900/30 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                N° de Operación
                              </label>
                              <input
                                type="text"
                                value={item.operationNumber || ''}
                                onChange={(e) =>
                                  handleUpdateExtraItem(idx, { operationNumber: e.target.value })
                                }
                                placeholder="Ej. Op: 1827491"
                                className="w-full px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                              />
                            </div>

                            <div className="sm:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                Fecha de Abono
                              </label>
                              <input
                                type="date"
                                value={item.paidDate || ''}
                                onChange={(e) =>
                                  handleUpdateExtraItem(idx, { paidDate: e.target.value })
                                }
                                className="w-full px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                              />
                            </div>

                            <div className="sm:col-span-6">
                              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                Nota Adicional / Desglose de Abono
                              </label>
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) =>
                                  handleUpdateExtraItem(idx, { notes: e.target.value })
                                }
                                placeholder="Ej. Pagado junto con la mensualidad en una sola transferencia de S/ 700..."
                                className="w-full px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        No hay servicios adicionales fuera del plan en este comprobante.
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddExtraItem}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Agregar Extra</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPickerTarget('extra');
                            setPickerSearch('');
                            setPickerCategory('all');
                            setIsServicePickerOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 font-bold text-xs hover:bg-amber-50 dark:hover:bg-amber-950/40 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Del Catálogo</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* CASO B: PARTIDAS ESTÁNDAR */
              <div className="space-y-3">
                {formData.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateItem(idx, { title: e.target.value })}
                          placeholder="Descripción del concepto (ej. 50% Anticipo Diseño de Marca)..."
                          className="font-extrabold text-sm text-slate-900 dark:text-slate-100 bg-transparent outline-none w-full border-b border-transparent focus:border-emerald-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => handleUpdateItem(idx, { description: e.target.value })}
                      placeholder="Detalles adicionales o especificaciones del concepto (opcional)..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900"
                    />

                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(idx, { quantity: Number(e.target.value) || 1 })
                          }
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          P. Unitario ({formData.currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateItem(idx, { unitPrice: Number(e.target.value) || 0 })
                          }
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-white dark:bg-slate-900 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                          Importe ({formData.currencySymbol})
                        </label>
                        <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black bg-white dark:bg-slate-900 font-mono text-emerald-600 dark:text-emerald-400">
                          {formData.currencySymbol} {Number(item.total).toLocaleString('es-PE')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TOTALES Y CONDICIONES (CON EL SWITCHER DE IGV) */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Instrucciones & Observaciones para el Cliente
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Instrucciones para transferencias, número de RUC para factura, etc..."
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* SWITCHER MODERNO PARA CONSIDERAR O NO EL IGV */}
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between gap-4 transition">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition shadow-2xs ${
                        formData.includeTax
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border border-transparent'
                      }`}
                    >
                      %
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                          {formData.includeTax ? 'Considerar IGV (18%)' : 'Sin IGV (No considerar)'}
                        </p>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            formData.includeTax
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {formData.includeTax ? '+18% ACTIVO' : 'EXONERADO'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {formData.includeTax
                          ? 'Se calcula y añade el 18% al subtotal de los servicios o meses contratados.'
                          : 'El comprobante se emite con importe neto sin recargo fiscal de IGV.'}
                      </p>
                    </div>
                  </div>

                  {/* Switch Button */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.includeTax}
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, includeTax: !prev.includeTax }))
                    }
                    className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      formData.includeTax ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    title={formData.includeTax ? 'Desactivar IGV' : 'Activar IGV'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formData.includeTax ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Caja de Liquidación de Totales */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">
                    {formData.currencySymbol} {(formData.subtotal || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {formData.includeTax ? (
                  <div className="flex justify-between text-slate-600 dark:text-slate-300 font-medium">
                    <span>IGV ({formData.taxRate || 18}%):</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formData.currencySymbol} {(formData.taxAmount || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>IGV (0%):</span>
                    <span className="font-mono font-medium">No aplica</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-500">
                  <span>Descuento Especial:</span>
                  <div className="w-32 flex items-center">
                    <span className="text-xs font-mono mr-1">{formData.currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.discountAmount ?? 0}
                      onChange={(e) =>
                        setFormData({ ...formData, discountAmount: Number(e.target.value) || 0 })
                      }
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-right font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">
                    Total Comprobante:
                  </span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {formData.currencySymbol} {(formData.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Resumen de Cobro si es membresía */}
                {formData.isMembership && formData.membershipInstallments && formData.membershipInstallments.length > 0 && (
                  <div className="pt-2 border-t border-purple-100 dark:border-purple-950/60 text-[11px] space-y-1">
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>
                        Cobrado / Pagado ({formData.membershipInstallments.filter((m) => m.status === 'paid').length} meses
                        {formData.extraItems && formData.extraItems.filter((ex) => ex.status === 'paid').length > 0
                          ? ` + ${formData.extraItems.filter((ex) => ex.status === 'paid').length} extras`
                          : ''}):
                      </span>
                      <span className="font-mono">
                        {formData.currencySymbol} {(formData.paidAmount || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-600 font-bold">
                      <span>Pendiente / En Proceso:</span>
                      <span className="font-mono">
                        {formData.currencySymbol} {Math.max(0, formData.total - (formData.paidAmount || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: ESTADO DEL PAGO & COBRO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>3. Estado de Cobranza & Registro de Abono</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Estado del Comprobante
                </label>
                <select
                  value={formData.status || 'pending'}
                  onChange={(e) => {
                    const st = e.target.value as PaymentNoteStatus;
                    setFormData({
                      ...formData,
                      status: st,
                      paidAmount: st === 'paid' ? formData.total : formData.paidAmount,
                      paymentDate:
                        st === 'paid' && !formData.paymentDate
                          ? new Date().toISOString().split('T')[0]
                          : formData.paymentDate,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                >
                  <option value="pending">Pendiente de Cobro</option>
                  <option value="paid">Pagado Totalmente</option>
                  <option value="partial">Abono Parcial</option>
                  <option value="cancelled">Anulado</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Monto Cobrado / Abonado ({formData.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.paidAmount ?? 0}
                  onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950 text-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Fecha de Abono
                </label>
                <input
                  type="date"
                  value={formData.paymentDate || ''}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  N° de Operación / Referencia
                </label>
                <input
                  type="text"
                  value={formData.operationNumber || ''}
                  onChange={(e) => setFormData({ ...formData, operationNumber: e.target.value })}
                  placeholder="Ej. OP-7829410"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: CUENTAS BANCARIAS GLOBALES (REGLA DE EMPRESA) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>4. Cuentas Bancarias & Métodos de Pago</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60">
                    Regla Global
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Cuentas sincronizadas automáticamente desde{' '}
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    Configuración &gt; Datos de Empresa
                  </span>
                  .
                </p>
              </div>
            </div>

            {globalBankAccounts.length === 0 ? (
              <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                <CreditCard className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                  No hay cuentas bancarias globales activas en Datos de Empresa
                </p>
                <p className="text-[11px] text-slate-400">
                  Configura tus números de cuenta y códigos QR en Configuración &gt; Datos de Empresa para mostrarlos en el comprobante.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {globalBankAccounts.map((acc, idx) => (
                  <div
                    key={acc.id || idx}
                    className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-start gap-3"
                  >
                    {acc.imageUrl ? (
                      <img
                        src={acc.imageUrl}
                        alt={acc.name}
                        className="w-11 h-11 rounded-xl object-contain bg-white border p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs shrink-0">
                        {acc.currency || 'PEN'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {acc.name}
                        </p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {acc.currency || 'PEN'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Titular: {acc.beneficiary || tenant.companyInfo?.legalName || tenant.name}
                      </p>
                      <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                        {acc.accountNumber}
                      </p>
                      {acc.notes && (
                        <p className="text-[10px] text-slate-400 truncate font-mono">
                          {acc.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOTONES FINALES DE ACCIÓN */}
          <div className="flex justify-end gap-3 pt-2 pb-6">
            <button
              type="button"
              onClick={() => {
                setIsEditorOpen(false);
                setEditingNote(null);
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Guardar Comprobante'}</span>
            </button>
          </div>
        </form>
            </div>

            {/* Columna Derecha: Previsualización en Vivo */}
            {showLivePreview && (
              <div className="hidden xl:block xl:col-span-5 sticky top-18 max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-1">
                <PaymentNoteLivePreview
                  formData={{ ...formData, bankAccounts: globalBankAccounts }}
                  tenant={tenant}
                  onClose={() => setShowLivePreview(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* MODAL / DRAWER DE PREVISUALIZACIÓN EN VIVO PARA MÓVIL (< xl) */}
        {isMobilePreviewOpen && (
          <div
            className="fixed inset-0 z-50 xl:hidden bg-slate-950/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 animate-in fade-in duration-200"
            onClick={() => setIsMobilePreviewOpen(false)}
          >
            <div
              className="bg-white dark:bg-slate-900 w-full sm:max-w-xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-y-auto shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <PaymentNoteLivePreview
                formData={{ ...formData, bankAccounts: globalBankAccounts }}
                tenant={tenant}
                onClose={() => setIsMobilePreviewOpen(false)}
              />
            </div>
          </div>
        )}

        {/* MODAL SELECTOR DE SERVICIOS */}
        {isServicePickerOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 mb-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Catálogo de Servicios Registrados</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    Jalar Servicio hacia la Nota de Pago
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Importa conceptos pre-configurados con sus respectivos precios fijados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsServicePickerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Buscar servicio por nombre o código..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

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

              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 max-h-[60vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {services
                    .filter((s) => {
                      if (pickerCategory !== 'all' && s.categoryId !== pickerCategory) return false;
                      if (pickerSearch.trim()) {
                        const q = pickerSearch.toLowerCase();
                        if (
                          !s.title.toLowerCase().includes(q) &&
                          !(s.code || '').toLowerCase().includes(q)
                        ) {
                          return false;
                        }
                      }
                      return true;
                    })
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-violet-500/50 shadow-xs flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                            <span>{s.code}</span>
                            <span className="font-bold text-emerald-600">
                              {s.currencySymbol} {s.basePrice.toLocaleString('es-PE')}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                            {s.title}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                            {s.briefDescription}
                          </p>
                        </div>

                        {s.packages && s.packages.length > 0 ? (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 block">
                              Paquetes disponibles:
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {s.packages.map((pkg) => (
                                <button
                                  key={pkg.id}
                                  type="button"
                                  onClick={() => handleSelectServiceToItem(s, pkg)}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-left hover:border-violet-500 transition cursor-pointer"
                                >
                                  <span className="text-[11px] font-bold block truncate">{pkg.name}</span>
                                  <span className="text-xs font-black text-violet-600 block">
                                    {s.currencySymbol} {Number(pkg.price).toLocaleString('es-PE')}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectServiceToItem(s)}
                            className="w-full py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Insertar (S/ {s.basePrice.toLocaleString('es-PE')})</span>
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-800/40">
                <button
                  type="button"
                  onClick={() => setIsServicePickerOpen(false)}
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
  // VISTA 2: LISTADO EN TABLA DE NOTAS DE PAGO
  // =============================================================================
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* CABECERA ESTANDARIZADA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
            <Receipt className="w-3.5 h-3.5" />
            <span>Gestión de Cobranzas & Comprobantes</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Notas de Pago
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {paymentNotes.length} comprobantes emitidos • {kpis.pendingCount} pendientes de cobro
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {can('payments.create') && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-md flex items-center justify-center gap-2 shrink-0 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Nota de Pago</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 KPIS CORPORATIVOS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Total Emitido
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {tenant.customization?.currencySymbol || 'S/'} {kpis.totalEmitted.toLocaleString('es-PE')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Cobrado / Pagado
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {tenant.customization?.currencySymbol || 'S/'} {kpis.totalPaid.toLocaleString('es-PE')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Pendiente Cobro
            </span>
            <p className="text-xl sm:text-2xl font-black text-amber-500 font-mono">
              {tenant.customization?.currencySymbol || 'S/'} {kpis.totalPending.toLocaleString('es-PE')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Tasa de Cobranza
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {kpis.collectionRate}%
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTRO */}
      <div className="p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código (NP-2026...), cliente, RUC o cotización..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-500/5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-bold">
            {[
              { id: 'ALL', label: 'Todas' },
              { id: 'pending', label: 'Pendientes' },
              { id: 'paid', label: 'Pagadas' },
              { id: 'partial', label: 'Parciales' },
              { id: 'cancelled', label: 'Anuladas' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-3 py-2 rounded-xl transition shrink-0 cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLA DE NOTAS DE PAGO */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse">
          <Receipt className="w-8 h-8 mx-auto text-slate-400 mb-2 animate-bounce" />
          <p className="text-xs font-bold text-slate-500">Cargando comprobantes...</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
            <Receipt className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
            No se encontraron notas de pago
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Prueba modificando tus filtros o criterio de búsqueda.'
              : 'Empieza a emitir comprobantes de cobro para tus clientes y proyectos.'}
          </p>
          {can('payments.create') && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Emitir Primera Nota de Pago</span>
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* VISTA DESKTOP: TABLA COMPLETA */}
          <div className="hidden md:block overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-extrabold text-[11px]">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Cliente / Empresa</th>
                    <th className="py-3 px-4">Cotización</th>
                    <th className="py-3 px-4">Emisión / Vencimiento</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Cobrado</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredNotes.map((note) => {
                    const isPaid = note.status === 'paid';
                    const isPartial = note.status === 'partial';
                    const isPending = note.status === 'pending';
                    const isCancelled = note.status === 'cancelled';

                    return (
                      <tr
                        key={note.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {note.code}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-extrabold text-slate-900 dark:text-slate-100">
                            {note.companyName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {note.documentType} {note.documentNumber}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          {note.quoteCode ? (
                            <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono font-bold text-[10px] border border-blue-200 dark:border-blue-900/40">
                              {note.quoteCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Directa</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[11px] space-y-0.5">
                          <p className="text-slate-700 dark:text-slate-300">
                            {note.issueDate}
                          </p>
                          <p className="text-slate-400">
                            Vence: <strong className="text-slate-600 dark:text-slate-400">{note.dueDate}</strong>
                          </p>
                        </td>

                        <td className="py-3.5 px-4 text-right font-black font-mono text-slate-900 dark:text-slate-100 text-sm">
                          {note.currencySymbol} {Number(note.total).toLocaleString('es-PE')}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {note.currencySymbol} {Number(note.paidAmount || 0).toLocaleString('es-PE')}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                                : isPending
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                                : isPartial
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isPaid && <CheckCircle2 className="w-3 h-3" />}
                            {isPending && <Clock className="w-3 h-3" />}
                            {isPaid ? 'Pagado' : isPending ? 'Pendiente' : isPartial ? 'Parcial' : 'Anulado'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Registrar Cobro Rápido */}
                            {!isPaid && can('payments.edit') && (
                              <button
                                type="button"
                                onClick={() => handleOpenQuickPay(note)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="Registrar cobro o abono recibido"
                              >
                                <Check className="w-3 h-3" />
                                <span>Cobrar</span>
                              </button>
                            )}

                            {/* Ver Comprobante Público */}
                            <a
                              href={`/p/pago/${note.publicToken}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Abrir comprobante público imprimible"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            {/* Copiar Enlace */}
                            <button
                              type="button"
                              onClick={() => handleCopyPublicLink(note)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Copiar enlace para el cliente"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* WhatsApp */}
                            {note.whatsapp && can('payments.send') && (
                              <button
                                type="button"
                                onClick={() => handleShareWhatsApp(note)}
                                className="p-1.5 rounded-lg border border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition cursor-pointer"
                                title="Compartir por WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Editar */}
                            {can('payments.edit') && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(note)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Editar nota de pago"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Eliminar */}
                            {can('payments.delete') && (
                              <button
                                type="button"
                                onClick={() => handleDelete(note)}
                                className="p-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                                title="Eliminar comprobante"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* VISTA MÓVIL RESPONSIVE: ACORDEÓN DESGLOSABLE */}
          <div className="md:hidden space-y-3">
            {filteredNotes.map((note) => {
              const isPaid = note.status === 'paid';
              const isPartial = note.status === 'partial';
              const isPending = note.status === 'pending';
              const isCancelled = note.status === 'cancelled';
              const isExpanded = expandedNoteId === note.id;
              const pendingBalance = Math.max(0, Number(note.total) - Number(note.paidAmount || 0));

              return (
                <div
                  key={note.id}
                  className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden transition-all duration-200"
                >
                  {/* Encabezado Desglosable (Clickable) */}
                  <div
                    onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                    className="p-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition select-none flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/40">
                          {note.code}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                            isPaid
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                              : isPending
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                              : isPartial
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {isPaid && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {isPending && <Clock className="w-2.5 h-2.5" />}
                          {isPaid ? 'Pagado' : isPending ? 'Pendiente' : isPartial ? 'Parcial' : 'Anulado'}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {note.companyName}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Vence: <strong className="text-slate-600 dark:text-slate-300">{note.dueDate}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total</span>
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                          {note.currencySymbol} {Number(note.total).toLocaleString('es-PE')}
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
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Identificación</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {note.documentType} {note.documentNumber || '-'}
                          </span>
                        </div>

                        <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Cotización Asociada</span>
                          {note.quoteCode ? (
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {note.quoteCode}
                            </span>
                          ) : (
                            <span className="text-slate-400">Cobro Directo</span>
                          )}
                        </div>

                        <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Fecha Emisión</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {note.issueDate}
                          </span>
                        </div>

                        <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">Cobrado / Saldo</span>
                          <div className="flex items-center gap-1 font-mono font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {note.currencySymbol}{Number(note.paidAmount || 0).toLocaleString('es-PE')}
                            </span>
                            {pendingBalance > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 text-[10px]">
                                (Resta {note.currencySymbol}{pendingBalance.toLocaleString('es-PE')})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lista de Ítems / Conceptos si existen */}
                      {note.items && note.items.length > 0 && (
                        <div className="bg-white dark:bg-slate-800/80 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Conceptos facturados ({note.items.length})
                          </span>
                          <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-700/60">
                            {note.items.map((item, idx) => (
                              <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-[11px]">
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.title || item.name}</p>
                                  <p className="text-[10px] text-slate-400">
                                    Cant: {item.quantity} × {note.currencySymbol}{Number(item.unitPrice).toLocaleString('es-PE')}
                                  </p>
                                </div>
                                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 shrink-0">
                                  {note.currencySymbol}{Number(item.total).toLocaleString('es-PE')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Barra de Acciones Móviles Accesibles */}
                      <div className="pt-2 flex flex-wrap items-center gap-1.5">
                        {!isPaid && can('payments.edit') && (
                          <button
                            type="button"
                            onClick={() => handleOpenQuickPay(note)}
                            className="flex-1 min-w-[110px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Cobrar</span>
                          </button>
                        )}

                        <a
                          href={`/p/pago/${note.publicToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-[110px] py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Comprobante</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCopyPublicLink(note)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Copiar enlace"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {note.whatsapp && can('payments.send') && (
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(note)}
                            className="p-2 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition cursor-pointer"
                            title="Compartir por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {can('payments.edit') && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(note)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {can('payments.delete') && (
                          <button
                            type="button"
                            onClick={() => handleDelete(note)}
                            className="p-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE REGISTRO RÁPIDO DE COBRO */}
      {quickPayNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-600">Registrar Cobranza</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {quickPayNote.code} • {quickPayNote.companyName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickPayNote(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Monto Recibido ({quickPayNote.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={quickPayNote.total}
                  value={quickPayData.paidAmount ?? 0}
                  onChange={(e) =>
                    setQuickPayData({ ...quickPayData, paidAmount: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold bg-slate-50 dark:bg-slate-950 text-emerald-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Total del comprobante: {quickPayNote.currencySymbol} {quickPayNote.total.toLocaleString('es-PE')}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Fecha del Abono
                </label>
                <input
                  type="date"
                  value={quickPayData.paymentDate || ''}
                  onChange={(e) =>
                    setQuickPayData({ ...quickPayData, paymentDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Medio / Banco de Pago
                </label>
                <select
                  value={quickPayData.paymentMethod || 'Transferencia Bancaria BCP'}
                  onChange={(e) =>
                    setQuickPayData({ ...quickPayData, paymentMethod: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                >
                  <option value="Transferencia Bancaria BCP">Transferencia BCP</option>
                  <option value="Transferencia Bancaria BBVA">Transferencia BBVA</option>
                  <option value="Transferencia Bancaria Interbank">Transferencia Interbank</option>
                  <option value="Yape / Plin">Yape / Plin</option>
                  <option value="Tarjeta de Crédito / Débito">Tarjeta de Crédito / Débito</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Otro">Otro Medio</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  N° de Operación Bancaria
                </label>
                <input
                  type="text"
                  value={quickPayData.operationNumber || ''}
                  onChange={(e) =>
                    setQuickPayData({ ...quickPayData, operationNumber: e.target.value })
                  }
                  placeholder="Ej. OP-4829103"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setQuickPayNote(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveQuickPay}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirmar Cobro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / VISOR DE VOUCHER DE PAGO */}
      {viewingVoucher && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setViewingVoucher(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-5 space-y-4 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-4 h-4 text-purple-600 shrink-0" />
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                  {viewingVoucher.name || 'Comprobante / Voucher de Pago'}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingVoucher.url}
                  download={viewingVoucher.name || 'voucher-pago'}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition"
                  title="Descargar comprobante"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setViewingVoucher(null)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center max-h-[70vh] overflow-auto bg-slate-50 dark:bg-slate-950/60 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
              {viewingVoucher.url.startsWith('data:application/pdf') ? (
                <iframe src={viewingVoucher.url} className="w-full h-[65vh] rounded-xl border-0" />
              ) : (
                <img
                  src={viewingVoucher.url}
                  alt="Voucher de pago"
                  className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setViewingVoucher(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
