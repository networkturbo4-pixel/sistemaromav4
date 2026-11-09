import React, { useState, useEffect, useRef } from 'react';
import { useApp, PermissionGate } from '../context/AppContext';
import { playNotificationChime, playNotificationSound } from '../utils/notificationSound';
import {
  Tenant,
  TenantSummary,
  TenantCustomization,
  CompanyInfo,
  QuotePaymentMethod,
  User,
  Role,
  ToastStyleVariant,
  ToastPosition,
  ToastAudioTheme,
  ConfirmModalStyleVariant,
  TypographyScale,
  UserThemePreference,
  AppFontFamily,
} from '../../shared/types';
import {
  PERMISSIONS_CATALOG,
  PermissionKey,
  ALL_PERMISSION_KEYS,
} from '../../shared/permissions';
import {
  Palette,
  Building2,
  Building,
  Users,
  ShieldCheck,
  Upload,
  Sparkles,
  Check,
  Bell,
  MessageSquareWarning,
  Type,
  Coins,
  Globe,
  Plus,
  Edit3,
  Trash2,
  KeyRound,
  RefreshCw,
  X,
  Lock,
  Sun,
  Moon,
  Monitor,
  Tablet,
  CheckCircle2,
  Smartphone,
  Send,
  Sliders,
  Shield,
  Layers,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  UserCheck,
  Eye,
  Mail,
  MessageCircle,
  Hash,
  GitBranch,
  Terminal,
  DownloadCloud,
  Cpu,
  Database,
  AlertTriangle,
  HardDrive,
  CreditCard,
  QrCode,
  Save,
  Link as LinkIcon,
  Link,
  ZoomIn,
  Copy,
  Search,
  FileText,
  Briefcase,
  ClipboardList,
  CheckCheck,
  Volume2,
  LayoutDashboard,
} from 'lucide-react';
import { GoogleDriveSettingsTab } from '../components/GoogleDriveSettingsTab';
import { ConnectionsSettingsTab } from '../components/ConnectionsSettingsTab';
import { copyTextToClipboard } from '../utils/clipboard';

export type SettingsTab =
  | 'identity'
  | 'appearance'
  | 'dialogs'
  | 'company'
  | 'users'
  | 'roles'
  | 'tenants'
  | 'system-update'
  | 'drive'
  | 'connections';

interface SettingsModuleProps {
  initialTab?: string;
  onTabChange?: (tab: SettingsTab) => void;
}

const LIGHT_BG_PRESETS = [
  { hex: '#ffffff', label: 'Blanco Puro' },
  { hex: '#f8fafc', label: 'Slate Nieve' },
  { hex: '#f1f5f9', label: 'Nube Fría' },
  { hex: '#fafaf9', label: 'Piedra Cálida' },
  { hex: '#f0fdf4', label: 'Menta Suave' },
  { hex: '#f0f9ff', label: 'Celeste Ártico' },
];

const LIGHT_SURFACE_PRESETS = [
  { hex: '#ffffff', label: 'Blanco Puro' },
  { hex: '#f8fafc', label: 'Slate Suave' },
  { hex: '#f1f5f9', label: 'Gris Perla' },
];

const LIGHT_ACCENT_PRESETS = [
  { hex: '#2563eb', label: 'Azul Tech' },
  { hex: '#4f46e5', label: 'Índigo Moderno' },
  { hex: '#059669', label: 'Esmeralda' },
  { hex: '#7c3aed', label: 'Violeta ROMA' },
  { hex: '#0891b2', label: 'Cian Océano' },
  { hex: '#e11d48', label: 'Frambuesa' },
  { hex: '#ea580c', label: 'Naranja Coral' },
  { hex: '#0f172a', label: 'Grafito' },
];

const DARK_BG_PRESETS = [
  { hex: '#000000', label: 'Negro OLED' },
  { hex: '#090d16', label: 'Midnight Navy' },
  { hex: '#0f172a', label: 'Slate Graphite' },
  { hex: '#111827', label: 'Charcoal Mate' },
  { hex: '#13091f', label: 'Violeta Noche' },
  { hex: '#04130f', label: 'Cyber Dark' },
];

const DARK_SURFACE_PRESETS = [
  { hex: '#111827', label: 'Carbón Zinc' },
  { hex: '#1e293b', label: 'Pizarra Slate' },
  { hex: '#18181b', label: 'Zinc Neutro' },
  { hex: '#0d1117', label: 'Deep Charcoal' },
  { hex: '#1e1b4b', label: 'Índigo Noche' },
  { hex: '#0f1f1a', label: 'Esmeralda Noche' },
];

const DARK_ACCENT_PRESETS = [
  { hex: '#3b82f6', label: 'Azul Eléctrico' },
  { hex: '#6366f1', label: 'Índigo Radiante' },
  { hex: '#10b981', label: 'Esmeralda Neón' },
  { hex: '#8b5cf6', label: 'Violeta Neón' },
  { hex: '#06b6d4', label: 'Cian Vivo' },
  { hex: '#f43f5e', label: 'Rosa Eléctrico' },
  { hex: '#f97316', label: 'Naranja Fuego' },
];

const ACCENT_COLORS = [
  '#2563eb', // Royal Blue
  '#4f46e5', // Indigo
  '#059669', // Emerald
  '#0891b2', // Cyan
  '#7c3aed', // Purple / Violet
  '#e11d48', // Rose
  '#ea580c', // Orange
];

const CURRENCY_OPTIONS: Array<{
  code: TenantCustomization['currencyCode'];
  symbol: string;
  label: string;
}> = [
  { code: 'PEN', symbol: 'S/', label: 'Soles Peruanos (PEN - S/)' },
  { code: 'USD', symbol: '$', label: 'Dólares Americanos (USD - $)' },
  { code: 'EUR', symbol: '€', label: 'Euros (EUR - €)' },
  { code: 'MXN', symbol: '$', label: 'Pesos Mexicanos (MXN - $)' },
  { code: 'COP', symbol: '$', label: 'Pesos Colombianos (COP - $)' },
  { code: 'CLP', symbol: '$', label: 'Pesos Chilenos (CLP - $)' },
];

const AVAILABLE_FONTS: Array<{
  id: AppFontFamily;
  name: string;
  category: string;
  description: string;
  sample: string;
}> = [
  {
    id: 'Inter',
    name: 'Inter',
    category: 'Neo-Grotesque Sans',
    description: 'Estándar moderno para SaaS: hiperlegible, neutra, elegante y corporativa.',
    sample: 'ROMA Creative Agency • Cotización S/ 2,850.00',
  },
  {
    id: 'Space Grotesk',
    name: 'Space Grotesk',
    category: 'Tech & Proporcional',
    description: 'Contemporánea, audaz, estética techie y de vanguardia en diseño y publicidad.',
    sample: 'ROMA Creative Agency • Cotización S/ 2,850.00',
  },
  {
    id: 'Montserrat',
    name: 'Montserrat',
    category: 'Geométrica Elegante',
    description: 'Presencia de marca fuerte, sofisticada, limpia y con alto impacto comercial.',
    sample: 'ROMA Creative Agency • Cotización S/ 2,850.00',
  },
  {
    id: 'Plus Jakarta Sans',
    name: 'Plus Jakarta Sans',
    category: 'Humanista Moderna',
    description: 'Equilibrada, amigable y con excelente legibilidad en pantallas retina.',
    sample: 'ROMA Creative Agency • Cotización S/ 2,850.00',
  },
  {
    id: 'Outfit',
    name: 'Outfit',
    category: 'Minimalista & Estilizada',
    description: 'Curvas limpias, trazos contemporáneos y sensación premium digital.',
    sample: 'ROMA Creative Agency • Cotización S/ 2,850.00',
  },
  {
    id: 'Poppins',
    name: 'Poppins',
    category: 'Geométrica Amigable',
    description: 'Formas redondeadas, alta simpatía visual y gran presencia en encabezados.',
    sample: 'ROMA Creative Agency • Cotización S/ 2,850.00',
  },
];

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  initialTab = 'appearance',
  onTabChange,
}) => {
  const {
    tenant,
    user: currentUser,
    themeMode,
    resolvedTheme,
    userThemePreference,
    setThemeMode,
    saveUserThemePreference,
    updateTenantState,
    applyLiveCustomizationPreview,
    refreshSession,
    switchTenant,
    tenantsList,
    loadTenantsList,
    isSwitchingTenant,
    apiFetch,
    toast,
    confirmAction,
    can,
    isPushSupported,
    isPushSubscribed,
    enablePushNotifications,
    disablePushNotifications,
    sendTestPushNotification,
  } = useApp();

  // Mapeo retrocompatible de pestaña
  const mapInitialTab = (tabStr?: string): SettingsTab => {
    if (tabStr === 'customization') return 'appearance';
    if (
      tabStr === 'identity' ||
      tabStr === 'appearance' ||
      tabStr === 'dialogs' ||
      tabStr === 'company' ||
      tabStr === 'users' ||
      tabStr === 'roles' ||
      tabStr === 'tenants' ||
      tabStr === 'system-update' ||
      tabStr === 'drive' ||
      tabStr === 'connections'
    ) {
      return tabStr as SettingsTab;
    }
    return 'appearance';
  };

  const [activeTab, setActiveTabState] = useState<SettingsTab>(() => mapInitialTab(initialTab));
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);

  const setActiveTab = (tab: SettingsTab) => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTabState(mapInitialTab(initialTab));
    }
  }, [initialTab]);

  // ===========================================================================
  // ESTADO DE PERSONALIZACIÓN Y COLORES POR USUARIO / TENANT
  // ===========================================================================
  const [custForm, setCustForm] = useState<TenantCustomization>(tenant.customization);
  const [savingCust, setSavingCust] = useState<boolean>(false);
  const [savingUserTheme, setSavingUserTheme] = useState<boolean>(false);

  // Ámbito de edición: 'user' (mi estilo personal) o 'tenant' (predeterminado de la agencia)
  const [colorScope, setColorScope] = useState<'user' | 'tenant'>('user');

  // Modo de previsualización en el wireframe interactivo
  const [previewSimulatorMode, setPreviewSimulatorMode] = useState<'light' | 'dark'>(resolvedTheme);

  // Paleta editable Modo Claro
  const [lightPaletteEdit, setLightPaletteEdit] = useState({
    primary: userThemePreference?.lightPalette?.primary || tenant.customization.lightPalette.primary,
    secondary: userThemePreference?.lightPalette?.secondary || tenant.customization.lightPalette.secondary,
    background: userThemePreference?.lightPalette?.background || tenant.customization.lightPalette.background,
    surface: userThemePreference?.lightPalette?.surface || tenant.customization.lightPalette.surface,
    textPrimary: userThemePreference?.lightPalette?.textPrimary || tenant.customization.lightPalette.textPrimary,
    textMuted: userThemePreference?.lightPalette?.textMuted || tenant.customization.lightPalette.textMuted,
  });

  // Paleta editable Modo Oscuro
  const [darkPaletteEdit, setDarkPaletteEdit] = useState({
    primary: userThemePreference?.darkPalette?.primary || tenant.customization.darkPalette.primary,
    secondary: userThemePreference?.darkPalette?.secondary || tenant.customization.darkPalette.secondary,
    background: userThemePreference?.darkPalette?.background || tenant.customization.darkPalette.background,
    surface: userThemePreference?.darkPalette?.surface || tenant.customization.darkPalette.surface,
    textPrimary: userThemePreference?.darkPalette?.textPrimary || tenant.customization.darkPalette.textPrimary,
    textMuted: userThemePreference?.darkPalette?.textMuted || tenant.customization.darkPalette.textMuted,
  });

  useEffect(() => {
    setCustForm(tenant.customization);
    if (colorScope === 'tenant') {
      setLightPaletteEdit(tenant.customization.lightPalette);
      setDarkPaletteEdit(tenant.customization.darkPalette);
    }
  }, [tenant.customization, colorScope]);

  useEffect(() => {
    if (colorScope === 'user') {
      setLightPaletteEdit({
        primary: userThemePreference?.lightPalette?.primary || tenant.customization.lightPalette.primary,
        secondary: userThemePreference?.lightPalette?.secondary || tenant.customization.lightPalette.secondary,
        background: userThemePreference?.lightPalette?.background || tenant.customization.lightPalette.background,
        surface: userThemePreference?.lightPalette?.surface || tenant.customization.lightPalette.surface,
        textPrimary: userThemePreference?.lightPalette?.textPrimary || tenant.customization.lightPalette.textPrimary,
        textMuted: userThemePreference?.lightPalette?.textMuted || tenant.customization.lightPalette.textMuted,
      });
      setDarkPaletteEdit({
        primary: userThemePreference?.darkPalette?.primary || tenant.customization.darkPalette.primary,
        secondary: userThemePreference?.darkPalette?.secondary || tenant.customization.darkPalette.secondary,
        background: userThemePreference?.darkPalette?.background || tenant.customization.darkPalette.background,
        surface: userThemePreference?.darkPalette?.surface || tenant.customization.darkPalette.surface,
        textPrimary: userThemePreference?.darkPalette?.textPrimary || tenant.customization.darkPalette.textPrimary,
        textMuted: userThemePreference?.darkPalette?.textMuted || tenant.customization.darkPalette.textMuted,
      });
    }
  }, [userThemePreference, colorScope, tenant.customization]);

  const updateLightPaletteField = (field: string, val: string) => {
    const next = { ...lightPaletteEdit, [field]: val };
    setLightPaletteEdit(next);
    if (colorScope === 'user') {
      applyLiveCustomizationPreview(tenant.customization, {
        lightPalette: next,
        darkPalette: darkPaletteEdit,
      });
    } else {
      const nextCust = { ...custForm, lightPalette: next };
      setCustForm(nextCust);
      applyLiveCustomizationPreview(nextCust, null);
    }
  };

  const updateDarkPaletteField = (field: string, val: string) => {
    const next = { ...darkPaletteEdit, [field]: val };
    setDarkPaletteEdit(next);
    if (colorScope === 'user') {
      applyLiveCustomizationPreview(tenant.customization, {
        lightPalette: lightPaletteEdit,
        darkPalette: next,
      });
    } else {
      const nextCust = { ...custForm, darkPalette: next };
      setCustForm(nextCust);
      applyLiveCustomizationPreview(nextCust, null);
    }
  };

  const handleSavePersonalTheme = async () => {
    setSavingUserTheme(true);
    try {
      await saveUserThemePreference({
        lightPalette: lightPaletteEdit,
        darkPalette: darkPaletteEdit,
        typographyScale: custForm.typographyScale,
        fontFamily: custForm.fontFamily,
      });
    } finally {
      setSavingUserTheme(false);
    }
  };

  const handleResetPersonalTheme = async () => {
    const ok = await confirmAction({
      title: '¿Restablecer estilo personal?',
      message: `Volverás a usar los colores institucionales configurados para la agencia "${tenant.name}".`,
      confirmText: 'Sí, restablecer',
      cancelText: 'Cancelar',
    });
    if (ok) {
      await saveUserThemePreference(null);
      setLightPaletteEdit(tenant.customization.lightPalette);
      setDarkPaletteEdit(tenant.customization.darkPalette);
    }
  };

  const handleCustChange = (next: TenantCustomization) => {
    setCustForm(next);
    applyLiveCustomizationPreview(next, colorScope === 'user' ? { lightPalette: lightPaletteEdit, darkPalette: darkPaletteEdit } : null);
  };

  const handleAccentChange = (hex: string) => {
    updateLightPaletteField('primary', hex);
    updateDarkPaletteField('primary', hex);
  };

  const handleImageUpload = (
    field: 'faviconUrl' | 'logoLightUrl' | 'logoDarkUrl' | 'logoPwaUrl',
    file: File | undefined
  ) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast('La imagen no debe superar los 3MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      handleCustChange({ ...custForm, [field]: result });
      toast('Imagen cargada en vista previa. Guarda los cambios para aplicar.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomization = async () => {
    setSavingCust(true);
    try {
      const res = await apiFetch<{ tenant: typeof tenant }>(
        '/api/settings/customization',
        {
          method: 'PUT',
          body: JSON.stringify({ customization: custForm }),
        }
      );
      updateTenantState(res.tenant);
      toast('Personalización del sistema guardada correctamente.');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingCust(false);
    }
  };

  const handleAutoSaveToastPositions = async (
    nextPositions: { desktop: ToastPosition; tablet: ToastPosition; mobile: ToastPosition },
    primaryPos: ToastPosition
  ) => {
    const nextCust: TenantCustomization = {
      ...custForm,
      toastPosition: primaryPos,
      toastPositions: nextPositions,
    };
    handleCustChange(nextCust);

    try {
      const res = await apiFetch<{ tenant: typeof tenant }>('/api/settings/customization', {
        method: 'PUT',
        body: JSON.stringify({ customization: nextCust }),
      });
      if (res?.tenant) {
        updateTenantState(res.tenant);
        toast(`Posición de notificaciones guardada (${primaryPos})`, 'success', {
          duration: 2500,
        });
      }
    } catch (e) {
      console.warn('Error guardando posición de toast:', e);
    }
  };

  // ===========================================================================
  // ESTADO DE DATOS DE LA EMPRESA & CUENTAS BANCARIAS GLOBALES
  // ===========================================================================
  const [companyForm, setCompanyForm] = useState<CompanyInfo>(tenant.companyInfo);
  const [savingCompany, setSavingCompany] = useState<boolean>(false);

  // Estados del administrador de cuentas bancarias globales (Cotizaciones + Notas de Pago)
  const [isAddingBankAccount, setIsAddingBankAccount] = useState<boolean>(false);
  const [editingBankAccountId, setEditingBankAccountId] = useState<string | null>(null);
  const [savingBankAccounts, setSavingBankAccounts] = useState<boolean>(false);
  const [bankImageInputMode, setBankImageInputMode] = useState<'upload' | 'url'>('upload');
  const [zoomedBankImage, setZoomedBankImage] = useState<{ url: string; title: string } | null>(null);
  const bankFileInputRef = useRef<HTMLInputElement | null>(null);

  const [bankFormName, setBankFormName] = useState<string>('');
  const [bankFormCurrency, setBankFormCurrency] = useState<'PEN' | 'USD' | 'EUR'>('PEN');
  const [bankFormBeneficiary, setBankFormBeneficiary] = useState<string>('');
  const [bankFormAccountNumber, setBankFormAccountNumber] = useState<string>('');
  const [bankFormNotes, setBankFormNotes] = useState<string>('');
  const [bankFormImageUrl, setBankFormImageUrl] = useState<string>('');

  const BANK_PRESETS: Array<{
    name: string;
    short: string;
    color: string;
    currency: 'PEN' | 'USD' | 'EUR';
    defaultNote: string;
  }> = [
    { name: 'BCP Soles', short: 'BCP', color: '#002A8D', currency: 'PEN', defaultNote: 'CCI: ' },
    { name: 'BCP Dólares', short: 'BCP $', color: '#002A8D', currency: 'USD', defaultNote: 'CCI: ' },
    { name: 'BBVA Soles', short: 'BBVA', color: '#072146', currency: 'PEN', defaultNote: 'CCI: ' },
    { name: 'Interbank Soles', short: 'IBK', color: '#009B3A', currency: 'PEN', defaultNote: 'CCI: ' },
    { name: 'Scotiabank Soles', short: 'SCOTIA', color: '#EC111A', currency: 'PEN', defaultNote: 'CCI: ' },
    { name: 'Yape Corporativo', short: 'YAPE', color: '#742284', currency: 'PEN', defaultNote: 'Escanear código QR o yapear al número' },
    { name: 'Plin Empresarial', short: 'PLIN', color: '#00B4E5', currency: 'PEN', defaultNote: 'Transferencia inmediata vía Plin' },
    { name: 'Banco de la Nación (Detracciones)', short: 'BN', color: '#8B0000', currency: 'PEN', defaultNote: 'Cuenta de Detracciones SUNAT' },
  ];

  useEffect(() => {
    if (tenant) {
      const info = tenant.companyInfo;
      setCompanyForm({
        commercialName: info?.commercialName || tenant.name || '',
        legalName: info?.legalName || tenant.name || '',
        ruc: info?.ruc || '',
        email: info?.email || '',
        whatsapp: info?.whatsapp || '+51 ',
        address: info?.address || '',
        socials: {
          instagram: info?.socials?.instagram || '',
          facebook: info?.socials?.facebook || '',
          tiktok: info?.socials?.tiktok || '',
          website: info?.socials?.website || '',
          linkedin: info?.socials?.linkedin || '',
          youtube: info?.socials?.youtube || '',
        },
        bankAccounts: info?.bankAccounts || [],
      });
    }
  }, [tenant.id, tenant.companyInfo, tenant.name]);

  const resetBankAccountForm = () => {
    setBankFormName('');
    setBankFormCurrency('PEN');
    setBankFormBeneficiary(companyForm.legalName || companyForm.commercialName || tenant.name || '');
    setBankFormAccountNumber('');
    setBankFormNotes('');
    setBankFormImageUrl('');
    setEditingBankAccountId(null);
    setIsAddingBankAccount(false);
  };

  const handleOpenAddBankAccount = () => {
    resetBankAccountForm();
    setBankFormBeneficiary(companyForm.legalName || companyForm.commercialName || tenant.name || '');
    setIsAddingBankAccount(true);
  };

  const handleOpenEditBankAccount = (acc: QuotePaymentMethod) => {
    setEditingBankAccountId(acc.id);
    setBankFormName(acc.name || '');
    setBankFormCurrency(acc.currency || 'PEN');
    setBankFormBeneficiary(
      acc.beneficiary || companyForm.legalName || companyForm.commercialName || tenant.name || ''
    );
    setBankFormAccountNumber(acc.accountNumber || '');
    setBankFormNotes(acc.notes || '');
    setBankFormImageUrl(acc.imageUrl || '');
    setBankImageInputMode(acc.imageUrl?.startsWith('http') ? 'url' : 'upload');
    setIsAddingBankAccount(true);
  };

  const handleApplyBankPreset = (preset: typeof BANK_PRESETS[number]) => {
    setBankFormName(preset.name);
    setBankFormCurrency(preset.currency);
    if (!bankFormBeneficiary) {
      setBankFormBeneficiary(companyForm.legalName || companyForm.commercialName || tenant.name || '');
    }
    if (!bankFormNotes) {
      setBankFormNotes(preset.defaultNote);
    }
  };

  const handleUploadBankImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Selecciona un archivo de imagen válido (PNG, JPG, WEBP o SVG).', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('La imagen no debe superar los 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBankFormImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const persistGlobalBankAccounts = async (
    updatedAccounts: QuotePaymentMethod[],
    successMessage?: string
  ) => {
    const updatedCompanyInfo: CompanyInfo = {
      ...companyForm,
      bankAccounts: updatedAccounts,
    };
    setCompanyForm(updatedCompanyInfo);
    setSavingBankAccounts(true);
    try {
      const res = await apiFetch<{ tenant: typeof tenant }>('/api/settings/bank-accounts', {
        method: 'PUT',
        body: JSON.stringify({ bankAccounts: updatedAccounts }),
      });
      if (res?.tenant) {
        updateTenantState(res.tenant);
      }
      if (successMessage) {
        toast(successMessage, 'success');
      }
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingBankAccounts(false);
    }
  };

  const handleSaveBankAccountEntry = async () => {
    if (!bankFormName.trim()) {
      toast('Ingresa el nombre del banco o método de pago.', 'error');
      return;
    }
    if (!bankFormAccountNumber.trim()) {
      toast('Ingresa el número de cuenta o teléfono.', 'error');
      return;
    }
    const currentAccounts = companyForm.bankAccounts || [];
    let nextAccounts: QuotePaymentMethod[];

    if (editingBankAccountId) {
      nextAccounts = currentAccounts.map((acc) =>
        acc.id === editingBankAccountId
          ? {
              ...acc,
              name: bankFormName.trim(),
              currency: bankFormCurrency,
              beneficiary: bankFormBeneficiary.trim() || undefined,
              accountNumber: bankFormAccountNumber.trim(),
              notes: bankFormNotes.trim() || undefined,
              imageUrl: bankFormImageUrl.trim() || undefined,
            }
          : acc
      );
    } else {
      const newAcc: QuotePaymentMethod = {
        id: `bank-${Date.now()}`,
        name: bankFormName.trim(),
        currency: bankFormCurrency,
        beneficiary: bankFormBeneficiary.trim() || undefined,
        accountNumber: bankFormAccountNumber.trim(),
        notes: bankFormNotes.trim() || undefined,
        imageUrl: bankFormImageUrl.trim() || undefined,
        isActive: true,
      };
      nextAccounts = [...currentAccounts, newAcc];
    }

    resetBankAccountForm();
    await persistGlobalBankAccounts(
      nextAccounts,
      editingBankAccountId
        ? 'Cuenta bancaria actualizada globalmente.'
        : 'Nueva cuenta bancaria añadida a la empresa.'
    );
  };

  const handleToggleBankAccountActive = async (id: string) => {
    const currentAccounts = companyForm.bankAccounts || [];
    const nextAccounts = currentAccounts.map((acc) =>
      acc.id === id ? { ...acc, isActive: acc.isActive === false ? true : false } : acc
    );
    await persistGlobalBankAccounts(nextAccounts, 'Estado de la cuenta actualizado.');
  };

  const handleDeleteBankAccount = async (id: string) => {
    const currentAccounts = companyForm.bankAccounts || [];
    const nextAccounts = currentAccounts.filter((acc) => acc.id !== id);
    if (editingBankAccountId === id) {
      resetBankAccountForm();
    }
    await persistGlobalBankAccounts(nextAccounts, 'Cuenta bancaria eliminada.');
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      const res = await apiFetch<{ tenant: typeof tenant }>(
        '/api/settings/company',
        {
          method: 'PUT',
          body: JSON.stringify({ companyInfo: companyForm }),
        }
      );
      updateTenantState(res.tenant);
      toast('Datos de la empresa, redes y cuentas bancarias guardados.');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingCompany(false);
    }
  };

  // ===========================================================================
  // USUARIOS Y ROLES GRANULARES
  // ===========================================================================
  const [usersList, setUsersList] = useState<User[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [usersCountByRole, setUsersCountByRole] = useState<Record<string, number>>({});
  const [loadingUsersRoles, setLoadingUsersRoles] = useState<boolean>(false);

  // Modal Usuario
  const userDialogRef = useRef<HTMLDialogElement | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    jobTitle: '',
    email: '',
    whatsapp: '',
    pin: '',
    roleId: '',
    isActive: true,
  });
  const [savingUser, setSavingUser] = useState<boolean>(false);

  // Modal Rol
  const roleDialogRef = useRef<HTMLDialogElement | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    badgeColor: '#4f46e5',
    permissions: [] as PermissionKey[],
  });
  const [savingRole, setSavingRole] = useState<boolean>(false);
  const [rolePermissionSearch, setRolePermissionSearch] = useState<string>('');
  const [roleModuleFilter, setRoleModuleFilter] = useState<string>('all');

  const loadUsersAndRoles = async () => {
    setLoadingUsersRoles(true);
    try {
      if (can('settings.users.view') || can('settings.users.manage')) {
        const uData = await apiFetch<{ users: User[]; roles: Role[] }>('/api/settings/users');
        setUsersList(uData.users || []);
        setRolesList(uData.roles || []);
      }
      if (can('settings.roles.view') || can('settings.roles.manage')) {
        const rData = await apiFetch<{
          roles: Role[];
          usersCountByRole: Record<string, number>;
        }>('/api/settings/roles');
        setRolesList(rData.roles || []);
        setUsersCountByRole(rData.usersCountByRole || {});
      }
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoadingUsersRoles(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' || activeTab === 'roles') {
      loadUsersAndRoles();
    }
  }, [activeTab]);

  const generateRandomPin = () => {
    let pin = '';
    for (let i = 0; i < 8; i++) pin += Math.floor(Math.random() * 10).toString();
    setUserForm((prev) => ({ ...prev, pin }));
  };

  const openCreateUserModal = () => {
    setEditingUser(null);
    const designerRole = rolesList.find(
      (r) =>
        r.name.toLowerCase().includes('diseñador') ||
        r.name.toLowerCase().includes('creativo')
    );
    const nonAdminRole = rolesList.find(
      (r) => !r.isSystem && !r.name.toLowerCase().includes('admin')
    );
    const defaultRoleId = designerRole?.id || nonAdminRole?.id || rolesList[0]?.id || '';
    let pin = '';
    for (let i = 0; i < 8; i++) pin += Math.floor(Math.random() * 10);
    setUserForm({
      name: '',
      jobTitle: 'Diseñador / Creativo',
      email: '',
      whatsapp: '+51 ',
      pin,
      roleId: defaultRoleId,
      isActive: true,
    });
    userDialogRef.current?.showModal();
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setUserForm({
      name: u.name || '',
      jobTitle: u.jobTitle || '',
      email: u.email || '',
      whatsapp: u.whatsapp || '',
      pin: u.pin || '',
      roleId: u.roleId || '',
      isActive: u.isActive !== undefined ? u.isActive : true,
    });
    userDialogRef.current?.showModal();
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(userForm.pin)) {
      toast('El PIN debe tener exactamente 8 dígitos numéricos.', 'warning');
      return;
    }
    setSavingUser(true);
    try {
      if (editingUser) {
        await apiFetch(`/api/settings/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(userForm),
        });
        toast(`Usuario "${userForm.name}" actualizado.`);
      } else {
        await apiFetch('/api/settings/users', {
          method: 'POST',
          body: JSON.stringify(userForm),
        });
        toast(`Usuario "${userForm.name}" creado con PIN ${userForm.pin}.`);
      }
      userDialogRef.current?.close();
      await loadUsersAndRoles();
      await refreshSession({ silent: true });
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (u: User) => {
    const ok = await confirmAction({
      title: `¿Eliminar al usuario "${u.name}"?`,
      message: `El PIN ${u.pin} dejará de tener acceso de inmediato.`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/settings/users/${u.id}`, { method: 'DELETE' });
      toast('Usuario eliminado.', 'info');
      await loadUsersAndRoles();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRolePermissionSearch('');
    setRoleModuleFilter('all');
    setRoleForm({
      name: '',
      description: '',
      badgeColor: '#4f46e5',
      permissions: ['dashboard.view', 'clients.view', 'brands.view'],
    });
    roleDialogRef.current?.showModal();
  };

  const openEditRoleModal = (r: Role) => {
    setEditingRole(r);
    setRolePermissionSearch('');
    setRoleModuleFilter('all');
    setRoleForm({
      name: r.name,
      description: r.description,
      badgeColor: r.badgeColor,
      permissions: [...r.permissions],
    });
    roleDialogRef.current?.showModal();
  };

  const grantAllPermissions = () => {
    if (editingRole?.isSystem) return;
    setRoleForm((prev) => ({
      ...prev,
      permissions: [...ALL_PERMISSION_KEYS],
    }));
  };

  const grantOnlyViewPermissions = () => {
    if (editingRole?.isSystem) return;
    const viewKeys = PERMISSIONS_CATALOG.filter((p) => p.key.endsWith('.view')).map((p) => p.key);
    setRoleForm((prev) => ({
      ...prev,
      permissions: viewKeys,
    }));
  };

  const clearAllPermissions = () => {
    if (editingRole?.isSystem) return;
    setRoleForm((prev) => ({
      ...prev,
      permissions: [],
    }));
  };

  const toggleGroupViewOnly = (keys: PermissionKey[]) => {
    if (editingRole?.isSystem) return;
    const viewKeys = keys.filter((k) => k.endsWith('.view'));
    setRoleForm((prev) => {
      const allViewsSelected = viewKeys.length > 0 && viewKeys.every((k) => prev.permissions.includes(k));
      if (allViewsSelected) {
        return {
          ...prev,
          permissions: prev.permissions.filter((k) => !viewKeys.includes(k)),
        };
      } else {
        return {
          ...prev,
          permissions: Array.from(new Set([...prev.permissions, ...viewKeys])),
        };
      }
    });
  };

  const togglePermissionInRole = (key: PermissionKey) => {
    if (editingRole?.isSystem) return;
    setRoleForm((prev) => {
      const exists = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== key)
          : [...prev.permissions, key],
      };
    });
  };

  const toggleAllPermissionsInGroup = (keys: PermissionKey[]) => {
    if (editingRole?.isSystem) return;
    setRoleForm((prev) => {
      const allSelected = keys.every((k) => prev.permissions.includes(k));
      return {
        ...prev,
        permissions: allSelected
          ? prev.permissions.filter((p) => !keys.includes(p))
          : Array.from(new Set([...prev.permissions, ...keys])),
      };
    });
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      toast('El nombre del rol es obligatorio.', 'warning');
      return;
    }
    setSavingRole(true);
    try {
      if (editingRole) {
        await apiFetch(`/api/settings/roles/${editingRole.id}`, {
          method: 'PUT',
          body: JSON.stringify(roleForm),
        });
        toast(`Rol "${roleForm.name}" actualizado.`);
      } else {
        await apiFetch('/api/settings/roles', {
          method: 'POST',
          body: JSON.stringify(roleForm),
        });
        toast(`Rol "${roleForm.name}" creado.`);
      }
      roleDialogRef.current?.close();
      await loadUsersAndRoles();
      await refreshSession({ silent: true });
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (r: Role) => {
    const ok = await confirmAction({
      title: `¿Eliminar el rol "${r.name}"?`,
      message: 'Esta acción desvinculará este rol del tenant.',
      confirmText: 'Eliminar rol',
      danger: true,
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/settings/roles/${r.id}`, { method: 'DELETE' });
      toast('Rol eliminado.', 'info');
      await loadUsersAndRoles();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  // ===========================================================================
  // GESTIÓN MULTITENANT & WORKSPACES
  // ===========================================================================
  interface AvailableTenantUser {
    id: string;
    name: string;
    email: string;
    pin: string;
    jobTitle: string;
    avatarUrl: string;
    tenantIds: string[];
  }

  const [editingTenant, setEditingTenant] = useState<TenantSummary | null>(null);
  const [savingTenant, setSavingTenant] = useState<boolean>(false);
  const tenantDialogRef = useRef<HTMLDialogElement | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AvailableTenantUser[]>([]);
  const [tenantLogoInputMode, setTenantLogoInputMode] = useState<'upload' | 'url'>('upload');

  const [tenantForm, setTenantForm] = useState({
    name: '',
    slug: '',
    currencyCode: 'PEN' as TenantCustomization['currencyCode'],
    commercialName: '',
    legalName: '',
    ruc: '',
    email: '',
    whatsapp: '+51 ',
    address: '',
    status: 'active' as 'active' | 'suspended',
    adminName: 'Director General',
    adminEmail: '',
    adminPin: '11223344',
    adminJobTitle: 'Director General & Fundador',
    logoUrl: '',
    assignedUserIds: [] as string[],
  });

  const loadAvailableUsers = async (): Promise<AvailableTenantUser[]> => {
    try {
      const res = await apiFetch<{ users: AvailableTenantUser[] }>('/api/tenants-available-users');
      if (res?.users) {
        setAvailableUsers(res.users);
        return res.users;
      }
    } catch {
      // Fallback
    }
    return [];
  };

  const handleTenantLogoFileUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast('La imagen no debe superar los 5MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setTenantForm((prev) => ({ ...prev, logoUrl: result }));
      toast('Logo de la agencia cargado.');
    };
    reader.readAsDataURL(file);
  };

  const openCreateTenantModal = async () => {
    setEditingTenant(null);
    setTenantLogoInputMode('upload');
    const users = await loadAvailableUsers();
    // Asignar por defecto al usuario actual si existe
    const defaultIds = currentUser?.id ? [currentUser.id] : (users.length > 0 ? [users[0].id] : []);
    setTenantForm({
      name: '',
      slug: '',
      currencyCode: 'PEN',
      commercialName: '',
      legalName: '',
      ruc: '',
      email: '',
      whatsapp: '+51 ',
      address: '',
      status: 'active',
      adminName: currentUser?.name || 'Director General',
      adminEmail: currentUser?.email || '',
      adminPin: currentUser?.pin || '11223344',
      adminJobTitle: currentUser?.jobTitle || 'Director General & Fundador',
      logoUrl: '',
      assignedUserIds: defaultIds,
    });
    tenantDialogRef.current?.showModal();
  };

  useEffect(() => {
    const handleOpenModal = () => {
      openCreateTenantModal();
    };
    window.addEventListener('roma-open-new-tenant-modal', handleOpenModal);
    return () => window.removeEventListener('roma-open-new-tenant-modal', handleOpenModal);
  }, []);

  const openEditTenantModal = async (t: TenantSummary) => {
    setEditingTenant(t);
    setTenantLogoInputMode('upload');
    const loadedUsers = await loadAvailableUsers();
    const existingAssigned = (loadedUsers.length > 0 ? loadedUsers : availableUsers)
      .filter((u) => u.tenantIds && u.tenantIds.includes(t.id))
      .map((u) => u.id);

    setTenantForm({
      name: t.name,
      slug: t.slug,
      currencyCode: t.customization?.currencyCode || 'PEN',
      commercialName: t.companyInfo?.commercialName || t.name || '',
      legalName: t.companyInfo?.legalName || t.name || '',
      ruc: t.companyInfo?.ruc || '',
      email: t.companyInfo?.email || '',
      whatsapp: t.companyInfo?.whatsapp || '+51 ',
      address: t.companyInfo?.address || '',
      status: t.status || 'active',
      adminName: '',
      adminEmail: '',
      adminPin: '',
      adminJobTitle: '',
      logoUrl: t.customization?.logoLightUrl || t.customization?.logoDarkUrl || '',
      assignedUserIds: existingAssigned.length > 0 ? existingAssigned : (currentUser?.id ? [currentUser.id] : []),
    });
    tenantDialogRef.current?.showModal();
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantForm.name.trim()) {
      toast('El nombre de la agencia es obligatorio.', 'warning');
      return;
    }
    if (!tenantForm.slug.trim()) {
      toast('El slug identificador es obligatorio.', 'warning');
      return;
    }
    if (!editingTenant && !/^[0-9]{8}$/.test(tenantForm.adminPin.trim())) {
      toast('El PIN del administrador inicial debe contener 8 dígitos numéricos.', 'warning');
      return;
    }

    setSavingTenant(true);
    try {
      if (editingTenant) {
        await apiFetch(`/api/tenants/${editingTenant.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: tenantForm.name,
            slug: tenantForm.slug,
            status: tenantForm.status,
            commercialName: tenantForm.commercialName,
            legalName: tenantForm.legalName,
            ruc: tenantForm.ruc,
            email: tenantForm.email,
            whatsapp: tenantForm.whatsapp,
            address: tenantForm.address,
            currencyCode: tenantForm.currencyCode,
            logoUrl: tenantForm.logoUrl,
            assignedUserIds: tenantForm.assignedUserIds,
          }),
        });
        toast(`Agencia "${tenantForm.name}" actualizada con éxito.`);
      } else {
        await apiFetch('/api/tenants', {
          method: 'POST',
          body: JSON.stringify(tenantForm),
        });
        toast(`Nueva agencia "${tenantForm.name}" registrada con éxito.`);
      }
      tenantDialogRef.current?.close();
      await loadTenantsList();
      await loadAvailableUsers();
      await refreshSession({ silent: true });
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingTenant(false);
    }
  };

  // Botón flotante para guardar todos los cambios de configuración
  const handleSaveFloatingSettings = async () => {
    try {
      if (activeTab === 'company') {
        await handleSaveCompany();
      } else if (activeTab === 'identity' || activeTab === 'dialogs') {
        await handleSaveCustomization();
      } else if (activeTab === 'appearance') {
        if (colorScope === 'user') {
          await handleSavePersonalTheme();
        } else {
          await handleSaveCustomization();
        }
      } else {
        await Promise.all([handleSaveCustomization(), handleSaveCompany()]);
      }
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleDeleteTenant = async (t: TenantSummary) => {
    if (t.id === tenant.id) {
      toast('No puedes eliminar el tenant en el que estás conectado actualmente.', 'warning');
      return;
    }
    const confirmed = await confirmAction({
      title: `¿Eliminar la agencia "${t.name}"?`,
      message: `Esta acción es irreversible y eliminará todos sus clientes, marcas, roles y accesos asociados.`,
      confirmText: 'Sí, eliminar definitivamente',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await apiFetch(`/api/tenants/${t.id}`, { method: 'DELETE' });
      toast(`Agencia "${t.name}" eliminada del sistema.`, 'info');
      await loadTenantsList();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  // ===========================================================================
  // ACTUALIZACIÓN DEL SISTEMA EN 1 CLIC (ESTADOS & HANDLERS)
  // ===========================================================================
  interface SystemUpdateStatusResponse {
    gitAvailable: boolean;
    isGitRepo: boolean;
    branch: string;
    currentCommit: string;
    lastCommitMessage: string;
    remoteUrl: string;
    isDirty: boolean;
    database: { engine: string; isPostgresConnected: boolean };
    lastBuildDate: string | null;
    nodeVersion: string;
    platform: string;
    uptimeSeconds: number;
    appVersion: string;
    canBuild?: boolean;
    hasPrecompiledDist?: boolean;
    isPrecompiled?: boolean;
    updateAvailable?: boolean;
    remoteCommit?: string | null;
    remoteCommitMessage?: string | null;
    remoteCommitDate?: string | null;
  }

  const [updateInfo, setUpdateInfo] = useState<SystemUpdateStatusResponse | null>(null);
  const [loadingUpdateInfo, setLoadingUpdateInfo] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateLogs, setUpdateLogs] = useState<
    Array<{
      step: string;
      status: 'pending' | 'success' | 'warning' | 'error';
      message: string;
      timestamp: string;
    }>
  >([]);
  const [updateOptions, setUpdateOptions] = useState({
    runGitPull: true,
    runDbMigration: true,
    runBuild: true,
    branch: 'main',
  });

  const loadUpdateStatus = async () => {
    setLoadingUpdateInfo(true);
    try {
      const data = await apiFetch<SystemUpdateStatusResponse>('/api/system/update-status');
      setUpdateInfo(data);
      if (data.updateAvailable) {
        toast(
          `🚀 ¡Nueva actualización disponible en GitHub! (${data.remoteCommit || 'Nueva versión'}).`,
          'success'
        );
      }
      setUpdateOptions((prev) => ({
        ...prev,
        branch: data.branch || prev.branch,
        runGitPull: Boolean(data.isGitRepo),
        runDbMigration: true,
        runBuild: Boolean(data.canBuild),
      }));
    } catch (err) {
      toast(`No se pudo verificar el estado del sistema: ${(err as Error).message}`, 'warning');
    } finally {
      setLoadingUpdateInfo(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'system-update') {
      loadUpdateStatus();
    }
  }, [activeTab]);

  const handleRunSystemUpdate = async () => {
    const ok = await confirmAction({
      title: '¿Iniciar actualización del sistema en 1 Clic?',
      message:
        'Se sincronizará el repositorio, se verificarán y aplicarán migraciones seguras a la base de datos (protegiendo el 100% de la información de clientes, usuarios y cotizaciones existentes) y se compilará la versión productiva.',
      confirmText: 'Sí, actualizar ahora',
      cancelText: 'Cancelar',
    });
    if (!ok) return;

    setIsUpdating(true);
    setUpdateLogs([
      {
        step: 'init',
        status: 'pending',
        message: 'Iniciando secuencia de actualización en segundo plano...',
        timestamp: new Date().toLocaleTimeString('es-PE', { hour12: false }),
      },
    ]);

    try {
      const res = await apiFetch<{
        success: boolean;
        durationSeconds: string;
        logs: Array<{
          step: string;
          status: 'pending' | 'success' | 'warning' | 'error';
          message: string;
          timestamp: string;
        }>;
      }>('/api/system/update', {
        method: 'POST',
        body: JSON.stringify(updateOptions),
      });

      if (res.logs && res.logs.length > 0) {
        setUpdateLogs(res.logs);
      }
      toast(`¡Sistema actualizado con éxito en ${res.durationSeconds}s!`, 'success');
      await loadUpdateStatus();
    } catch (err) {
      setUpdateLogs((prev) => [
        ...prev,
        {
          step: 'error',
          status: 'error',
          message: `Fallo: ${(err as Error).message}`,
          timestamp: new Date().toLocaleTimeString('es-PE', { hour12: false }),
        },
      ]);
      toast((err as Error).message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Listado de sub-pestañas en el diseño estándar
  const subTabs: Array<{
    id: SettingsTab;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    iconBg: string;
    badge?: string;
  }> = [
    {
      id: 'appearance',
      title: 'Apariencia & Colores',
      subtitle: 'Modo Claro, Oscuro y Acentos',
      icon: <Palette className="w-4 h-4 text-indigo-500" />,
      iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    },
    {
      id: 'dialogs',
      title: 'Toasts & Modales',
      subtitle: 'Alertas y confirmaciones nativas',
      icon: <Sliders className="w-4 h-4 text-emerald-500" />,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    },
    {
      id: 'identity',
      title: 'Identidad & Logos',
      subtitle: 'Claro, Oscuro, Favicon y PWA',
      icon: <Smartphone className="w-4 h-4 text-cyan-500" />,
      iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      badge: 'APP',
    },
    {
      id: 'company',
      title: 'Datos de Empresa',
      subtitle: 'RUC, Redes y Cuentas Bancarias',
      icon: <Building2 className="w-4 h-4 text-purple-500" />,
      iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    },
    {
      id: 'users',
      title: 'Usuarios del Equipo',
      subtitle: 'PIN 8 Dígitos y Roles',
      icon: <Users className="w-4 h-4 text-sky-500" />,
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
    },
    {
      id: 'roles',
      title: 'Roles y Permisos',
      subtitle: 'Matriz granular global',
      icon: <ShieldCheck className="w-4 h-4 text-amber-500" />,
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    },
    {
      id: 'tenants',
      title: 'Tenants & Agencias',
      subtitle: 'Espacios multitenant aislados',
      icon: <Layers className="w-4 h-4 text-rose-500" />,
      iconBg: 'bg-rose-500/10 dark:bg-rose-500/20',
      badge: 'SAAS',
    },
    {
      id: 'drive',
      title: 'Google Drive & APIs',
      subtitle: 'Conexión Cloud y Credenciales',
      icon: <HardDrive className="w-4 h-4 text-amber-500" />,
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
      badge: 'CLOUD',
    },
    {
      id: 'connections',
      title: 'Conexiones & IA',
      subtitle: 'Google Gemini, Tokens y Agentes',
      icon: <Sparkles className="w-4 h-4 text-sky-500" />,
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
      badge: 'GEMINI',
    },
    {
      id: 'system-update',
      title: 'Actualización del Sistema',
      subtitle: 'Git Pull, Migración DB & Build en 1 Clic',
      icon: <RefreshCw className="w-4 h-4 text-emerald-500" />,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      badge: '1-CLIC',
    },
  ];

  const groupedPermissions = {
    dashboard: PERMISSIONS_CATALOG.filter((p) => p.module === 'dashboard'),
    clients: PERMISSIONS_CATALOG.filter((p) => p.module === 'clients'),
    quotes: PERMISSIONS_CATALOG.filter((p) => p.module === 'quotes'),
    services: PERMISSIONS_CATALOG.filter((p) => p.module === 'services'),
    payments: PERMISSIONS_CATALOG.filter((p) => p.module === 'payments'),
    service_orders: PERMISSIONS_CATALOG.filter((p) => p.module === 'service_orders'),
    workspace: PERMISSIONS_CATALOG.filter((p) => p.module === 'workspace'),
    drive: PERMISSIONS_CATALOG.filter((p) => p.module === 'drive'),
    settings: PERMISSIONS_CATALOG.filter((p) => p.module === 'settings'),
  };

  return (
    <div className="space-y-6">
      {/* BOTÓN FLOTANTE O CABECERA DE GUARDADO RÁPIDO */}
      {activeTab === 'appearance' && (
        <div
          className="flex items-center justify-between border rounded-2xl p-4 shadow-xs transition-colors duration-200"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Personalización activa para: <strong>{tenant.name}</strong>
              {colorScope === 'user' && (
                <span className="ml-2 px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 text-[10px] font-extrabold uppercase">
                  Mi Estilo Personal
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            disabled={savingCust || savingUserTheme}
            onClick={colorScope === 'user' ? handleSavePersonalTheme : handleSaveCustomization}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: 'var(--app-primary)' }}
          >
            <Check className="w-4 h-4" />
            <span>
              {savingCust || savingUserTheme
                ? 'Guardando...'
                : colorScope === 'user'
                ? 'Guardar Cambios Visuales'
                : 'Guardar Cambios Visuales'}
            </span>
          </button>
        </div>
      )}

      {/* DISPOSICIÓN ESTANDARIZADA EN DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===================================================================
            COLUMNA IZQUIERDA: SUB-MENÚ DE CONFIGURACIÓN Y ESTADO DE MARCA (DESKTOP)
           =================================================================== */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-5">
          {/* Tarjeta de Lista de Sub-Navegación */}
          <div
            className="border rounded-3xl p-3 shadow-xs space-y-1 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }}
          >
            {subTabs.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all ${
                    active
                      ? 'border shadow-xs'
                      : 'hover:bg-slate-500/10 text-slate-700 dark:text-slate-200'
                  }`}
                  style={
                    active
                      ? {
                          backgroundColor: 'color-mix(in srgb, var(--app-primary) 12%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--app-primary) 30%, transparent)',
                          color: 'var(--app-primary)',
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-extrabold truncate"
                          style={active ? { color: 'var(--app-primary)' } : {}}
                        >
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  {active && (
                    <ArrowRight
                      className="w-4 h-4 shrink-0 ml-1"
                      style={{ color: 'var(--app-primary)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tarjeta Informativa: ESTADO DE MARCA (En Vivo) */}
          <div
            className="border rounded-3xl p-5 shadow-xs space-y-3 transition-colors duration-200"
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div
              className="flex items-center justify-between border-b pb-2.5"
              style={{ borderColor: 'var(--app-border)' }}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Estado de Marca
              </span>
              <span
                className="text-[11px] font-bold"
                style={{ color: 'var(--app-primary)' }}
              >
                En Vivo
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Logo General:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {custForm.logoLightUrl ? 'Personalizado' : 'Por defecto'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Logo Modo Claro:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {custForm.logoLightUrl ? 'Activo' : 'Usa General'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Logo Modo Oscuro:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {custForm.logoDarkUrl ? 'Activo' : 'Usa General'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400">Icono PWA:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                  192px & 512px OK
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            COLUMNA DERECHA: PANELES INTERACTIVOS CON WIREFRAMES VISUALES
           =================================================================== */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* ENCABEZADO COMPACTO DE PESTAÑA ACTIVA EN MÓVIL / RESPONSIVE */}
          <div
            className="lg:hidden border rounded-2xl p-3.5 flex items-center justify-between shadow-xs transition-colors duration-200"
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  subTabs.find((t) => t.id === activeTab)?.iconBg || 'bg-indigo-500/10'
                }`}
              >
                {subTabs.find((t) => t.id === activeTab)?.icon}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Pestaña Activa
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black truncate text-slate-900 dark:text-slate-100">
                    {subTabs.find((t) => t.id === activeTab)?.title}
                  </span>
                  {subTabs.find((t) => t.id === activeTab)?.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                      {subTabs.find((t) => t.id === activeTab)?.badge}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileTabsOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shrink-0 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span>Pestañas</span>
            </button>
          </div>
          {/* =================================================================
              1. APARIENCIA GLOBAL & PERSONALIZACIÓN DE COLORES (POR USUARIO Y TENANT)
             ================================================================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Tarjeta Principal de Ámbito y Esquema */}
              <div
                className="border rounded-3xl p-6 shadow-xs space-y-6 transition-colors duration-200"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                
                {/* SELECTOR DE ÁMBITO: USUARIO vs TENANT */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        Personalización de Colores & Modo Claro / Oscuro
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Elige si deseas personalizar tu experiencia individual como usuario o definir
                        el estándar institucional para toda la agencia.
                      </p>
                    </div>
                  </div>

                  {/* Selector de Ámbito */}
                  <div className="flex items-center p-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
                    <button
                      type="button"
                      onClick={() => setColorScope('user')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        colorScope === 'user'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Mi Estilo ({currentUser?.name.split(' ')[0] || 'Personal'})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setColorScope('tenant')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        colorScope === 'tenant'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Agencia ({tenant.name.split(' ')[0]})</span>
                    </button>
                  </div>
                </div>

                {/* Banner Contextual del Ámbito Activo */}
                <div
                  className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition ${
                    colorScope === 'user'
                      ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-900 dark:text-indigo-200'
                      : 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                    <span>
                      {colorScope === 'user' ? (
                        <>
                          Editando <strong>tu estilo personal</strong>. Tus preferencias de color se guardan exclusivamente para tu cuenta y se aplicarán cada vez que inicies sesión.
                        </>
                      ) : (
                        <>
                          Editando el <strong>tema predeterminado de la agencia</strong> ({tenant.name}). Se aplicará a todos los miembros que no tengan configurado un estilo personal.
                        </>
                      )}
                    </span>
                  </div>

                  {colorScope === 'user' && userThemePreference && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white shrink-0 ml-2">
                      Estilo Personal Activo
                    </span>
                  )}
                </div>

                {/* ESQUEMA DE COLOR DE VISUALIZACIÓN (MODO CLARO / OSCURO / AUTO) */}
                <div className="space-y-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Modo de Visualización de la Pantalla
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Tarjeta Modo Claro */}
                    <button
                      type="button"
                      onClick={() => setThemeMode('light')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        themeMode === 'light'
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center p-3 gap-2.5 mb-3 overflow-hidden">
                        <div className="w-5 h-10 rounded-md bg-white border border-slate-200 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2 w-16 rounded-full bg-indigo-500" />
                          <div className="h-2 w-10 rounded-full bg-slate-300" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                          <Sun className="w-4 h-4 text-amber-500" />
                          <span>Modo Claro</span>
                        </div>
                        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                          Usa Logo Claro
                        </span>
                      </div>
                    </button>

                    {/* Tarjeta Modo Oscuro */}
                    <button
                      type="button"
                      onClick={() => setThemeMode('dark')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        themeMode === 'dark'
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="h-16 rounded-xl border border-slate-800 bg-slate-950 flex items-center p-3 gap-2.5 mb-3 overflow-hidden">
                        <div className="w-5 h-10 rounded-md bg-slate-900 border border-slate-800 shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2 w-16 rounded-full bg-indigo-400" />
                          <div className="h-2 w-10 rounded-full bg-slate-700" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                          <Moon className="w-4 h-4 text-purple-400" />
                          <span>Modo Oscuro</span>
                        </div>
                        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                          Usa Logo Oscuro
                        </span>
                      </div>
                    </button>

                    {/* Tarjeta Automático (SO) */}
                    <button
                      type="button"
                      onClick={() => setThemeMode('system')}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        themeMode === 'system'
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="h-16 rounded-xl border border-slate-200 dark:border-slate-800 flex overflow-hidden mb-3">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center border-r border-slate-200 dark:border-slate-700">
                          <Sun className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex-1 bg-slate-950 flex items-center justify-center">
                          <Moon className="w-4 h-4 text-indigo-400" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                          <Monitor className="w-4 h-4 text-sky-500" />
                          <span>Automático (SO)</span>
                        </div>
                        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                          Adaptativo
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* =============================================================
                    PERSONALIZACIÓN DETALLADA: MODO CLARO
                   ============================================================= */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Personalización Modo Claro
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Define el fondo general, las tarjetas y el color de acción para el tema diurno.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Fondo Modo Claro */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Color de Fondo (Background)
                        </label>
                        <span className="font-mono-pin text-[11px] font-bold text-slate-500">
                          {lightPaletteEdit.background}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {LIGHT_BG_PRESETS.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            title={p.label}
                            onClick={() => updateLightPaletteField('background', p.hex)}
                            className={`w-6 h-6 rounded-lg border border-slate-300 dark:border-slate-700 transition ${
                              lightPaletteEdit.background === p.hex
                                ? 'ring-2 ring-indigo-500 scale-110 shadow-xs'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: p.hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={lightPaletteEdit.background}
                          onChange={(e) => updateLightPaletteField('background', e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                          title="Elegir fondo claro libre"
                        />
                      </div>
                    </div>

                    {/* 2. Superficie / Tarjetas Modo Claro */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Color de Tarjetas (Surface)
                        </label>
                        <span className="font-mono-pin text-[11px] font-bold text-slate-500">
                          {lightPaletteEdit.surface}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {LIGHT_SURFACE_PRESETS.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            title={p.label}
                            onClick={() => updateLightPaletteField('surface', p.hex)}
                            className={`w-6 h-6 rounded-lg border border-slate-300 dark:border-slate-700 transition ${
                              lightPaletteEdit.surface === p.hex
                                ? 'ring-2 ring-indigo-500 scale-110 shadow-xs'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: p.hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={lightPaletteEdit.surface}
                          onChange={(e) => updateLightPaletteField('surface', e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                          title="Elegir superficie clara libre"
                        />
                      </div>
                    </div>

                    {/* 3. Acento / Botones Modo Claro */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Color de Acento (Primary)
                        </label>
                        <span className="font-mono-pin text-[11px] font-bold text-slate-500">
                          {lightPaletteEdit.primary}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {LIGHT_ACCENT_PRESETS.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            title={p.label}
                            onClick={() => updateLightPaletteField('primary', p.hex)}
                            className={`w-6 h-6 rounded-lg border border-slate-300 dark:border-slate-700 transition ${
                              lightPaletteEdit.primary === p.hex
                                ? 'ring-2 ring-indigo-500 scale-110 shadow-xs'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: p.hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={lightPaletteEdit.primary}
                          onChange={(e) => updateLightPaletteField('primary', e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                          title="Elegir acento claro libre"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* =============================================================
                    PERSONALIZACIÓN DETALLADA: MODO OSCURO
                   ============================================================= */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Personalización Modo Oscuro
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Define tonos profundos como OLED negro, pizarra slate o medianoche, y su acento neón.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Fondo Modo Oscuro */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Color de Fondo Oscuro
                        </label>
                        <span className="font-mono-pin text-[11px] font-bold text-slate-500">
                          {darkPaletteEdit.background}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {DARK_BG_PRESETS.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            title={p.label}
                            onClick={() => updateDarkPaletteField('background', p.hex)}
                            className={`w-6 h-6 rounded-lg border border-slate-700 transition ${
                              darkPaletteEdit.background.toLowerCase() === p.hex.toLowerCase()
                                ? 'ring-2 ring-indigo-500 scale-110 shadow-xs'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: p.hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={darkPaletteEdit.background}
                          onChange={(e) => updateDarkPaletteField('background', e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                          title="Elegir fondo oscuro libre"
                        />
                      </div>
                    </div>

                    {/* 2. Superficie / Tarjetas Modo Oscuro */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Color de Tarjetas Oscuro
                        </label>
                        <span className="font-mono-pin text-[11px] font-bold text-slate-500">
                          {darkPaletteEdit.surface}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {DARK_SURFACE_PRESETS.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            title={p.label}
                            onClick={() => updateDarkPaletteField('surface', p.hex)}
                            className={`w-6 h-6 rounded-lg border border-slate-700 transition ${
                              darkPaletteEdit.surface.toLowerCase() === p.hex.toLowerCase()
                                ? 'ring-2 ring-indigo-500 scale-110 shadow-xs'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: p.hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={darkPaletteEdit.surface}
                          onChange={(e) => updateDarkPaletteField('surface', e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                          title="Elegir superficie oscura libre"
                        />
                      </div>
                    </div>

                    {/* 3. Acento / Botones Modo Oscuro */}
                    <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Color de Acento Oscuro
                        </label>
                        <span className="font-mono-pin text-[11px] font-bold text-slate-500">
                          {darkPaletteEdit.primary}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {DARK_ACCENT_PRESETS.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            title={p.label}
                            onClick={() => updateDarkPaletteField('primary', p.hex)}
                            className={`w-6 h-6 rounded-lg border border-slate-700 transition ${
                              darkPaletteEdit.primary.toLowerCase() === p.hex.toLowerCase()
                                ? 'ring-2 ring-indigo-500 scale-110 shadow-xs'
                                : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: p.hex }}
                          />
                        ))}
                        <input
                          type="color"
                          value={darkPaletteEdit.primary}
                          onChange={(e) => updateDarkPaletteField('primary', e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                          title="Elegir acento oscuro libre"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* =============================================================
                    SIMULADOR INTERACTIVO WIREFRAME EN VIVO
                   ============================================================= */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                          Simulador de Interfaz en Vivo
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Previsualiza exactamente cómo se verán los botones, tarjetas y elementos en pantalla.
                        </p>
                      </div>
                    </div>

                    {/* Conmutador de Prueba de Modo en el Simulador */}
                    <div className="flex items-center p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                      <button
                        type="button"
                        onClick={() => setPreviewSimulatorMode('light')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                          previewSimulatorMode === 'light'
                            ? 'bg-white shadow-xs text-amber-500'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Ver en Claro</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewSimulatorMode('dark')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                          previewSimulatorMode === 'dark'
                            ? 'bg-slate-900 shadow-xs text-purple-400'
                            : 'text-slate-500 hover:text-slate-200'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Ver en Oscuro</span>
                      </button>
                    </div>
                  </div>

                  {/* Wireframe Mini App Mockup */}
                  {(() => {
                    const simPal = previewSimulatorMode === 'light' ? lightPaletteEdit : darkPaletteEdit;
                    return (
                      <div
                        className="rounded-3xl p-5 border transition-all duration-200 shadow-sm space-y-4"
                        style={{
                          backgroundColor: simPal.background,
                          borderColor: previewSimulatorMode === 'light' ? '#e2e8f0' : '#1e293b',
                          color: simPal.textPrimary,
                        }}
                      >
                        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: previewSimulatorMode === 'light' ? '#f1f5f9' : '#1e293b' }}>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white"
                              style={{ backgroundColor: simPal.primary }}
                            >
                              {tenant.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-extrabold leading-tight" style={{ color: simPal.textPrimary }}>
                                {tenant.companyInfo.commercialName || tenant.name}
                              </p>
                              <p className="text-[10px]" style={{ color: simPal.textMuted }}>
                                Vista previa tipo app profesional
                              </p>
                            </div>
                          </div>

                          <span
                            className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                            style={{ backgroundColor: simPal.primary }}
                          >
                            Activo
                          </span>
                        </div>

                        {/* Contenido Mockup */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Mini Tarjeta de Métrica */}
                          <div
                            className="p-3.5 rounded-2xl border"
                            style={{
                              backgroundColor: simPal.surface,
                              borderColor: previewSimulatorMode === 'light' ? '#e2e8f0' : '#334155',
                            }}
                          >
                            <span className="text-[11px] font-bold" style={{ color: simPal.textMuted }}>
                              Clientes Activos
                            </span>
                            <p className="text-lg font-black mt-1" style={{ color: simPal.textPrimary }}>
                              34 Cuentas
                            </p>
                            <span className="text-[10px] font-bold text-emerald-500">
                              +18.5% este mes
                            </span>
                          </div>

                          {/* Mini Botones de Acción */}
                          <div
                            className="p-3.5 rounded-2xl border flex flex-col justify-between gap-2"
                            style={{
                              backgroundColor: simPal.surface,
                              borderColor: previewSimulatorMode === 'light' ? '#e2e8f0' : '#334155',
                            }}
                          >
                            <span className="text-[11px] font-bold" style={{ color: simPal.textMuted }}>
                              Botones de Acción
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs"
                                style={{ backgroundColor: simPal.primary }}
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold border"
                                style={{
                                  borderColor: previewSimulatorMode === 'light' ? '#cbd5e1' : '#475569',
                                  color: simPal.textPrimary,
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>

                          {/* Navegación Activa Mock */}
                          <div
                            className="p-3.5 rounded-2xl border space-y-1.5"
                            style={{
                              backgroundColor: simPal.surface,
                              borderColor: previewSimulatorMode === 'light' ? '#e2e8f0' : '#334155',
                            }}
                          >
                            <span className="text-[11px] font-bold" style={{ color: simPal.textMuted }}>
                              Elemento de Menú
                            </span>
                            <div
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between text-white"
                              style={{ backgroundColor: simPal.primary }}
                            >
                              <span>Dashboard</span>
                              <span className="text-[10px] opacity-80">Activo</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Tamaño de Tipografía Global */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Tamaño de Tipografía Global del Sistema
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Escala proporcionalmente textos, botones y espaciados.
                      </p>
                    </div>
                    <span className="font-mono-pin text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      Escala Activa: {custForm.typographyScale.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(
                      [
                        { id: 'compact', label: 'Compacto', px: '14px' },
                        { id: 'normal', label: 'Estándar', px: '15px' },
                        { id: 'comfortable', label: 'Cómodo', px: '16px' },
                        { id: 'large', label: 'Grande', px: '17.5px' },
                      ] as Array<{ id: TypographyScale; label: string; px: string }>
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleCustChange({ ...custForm, typographyScale: t.id })}
                        className={`p-3 rounded-2xl border text-left transition ${
                          custForm.typographyScale === t.id
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <p className="text-xs font-extrabold">{t.label}</p>
                        <p className="text-[11px] font-mono-pin text-slate-500 dark:text-slate-400">
                          {t.px}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Familia Tipográfica Global del Sistema (Google Fonts) */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Type className="w-4 h-4 text-indigo-500" />
                        <span>Tipografía Global del Sistema (Google Fonts)</span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Selecciona la fuente tipográfica que gobernará todo el SaaS, menús, módulos y propuestas públicas.
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 self-start sm:self-auto">
                      Fuente Activa: {custForm.fontFamily || 'Inter'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {AVAILABLE_FONTS.map((f) => {
                      const isSelected = (custForm.fontFamily || 'Inter') === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={async () => {
                            const next = { ...custForm, fontFamily: f.id };
                            handleCustChange(next);
                            try {
                              const res = await apiFetch<{ tenant: typeof tenant }>(
                                '/api/settings/customization',
                                {
                                  method: 'PUT',
                                  body: JSON.stringify({ customization: next }),
                                }
                              );
                              updateTenantState(res.tenant);
                              if (colorScope === 'user') {
                                await saveUserThemePreference({
                                  lightPalette: lightPaletteEdit,
                                  darkPalette: darkPaletteEdit,
                                  typographyScale: next.typographyScale,
                                  fontFamily: f.id,
                                });
                              }
                              toast(`Tipografía ${f.name} guardada y aplicada.`);
                            } catch (err) {
                              toast((err as Error).message, 'error');
                            }
                          }}
                          className={`p-4 rounded-2xl border text-left transition relative cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <p
                                className="text-sm font-bold text-slate-900 dark:text-slate-100"
                                style={{ fontFamily: f.id }}
                              >
                                {f.name}
                              </p>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                                {f.category}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mb-3">
                            {f.description}
                          </p>

                          {/* Previsualización en vivo en la tarjeta con la fuente real */}
                          <div
                            className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate select-none"
                            style={{ fontFamily: f.id }}
                          >
                            {f.sample}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* BARRA DE BOTONES DE ACCIÓN */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {colorScope === 'user' ? (
                      <span>Tu estilo se almacena para tu usuario ({currentUser?.name}).</span>
                    ) : (
                      <span>El estilo de la agencia se almacena para todo el tenant ({tenant.name}).</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    {colorScope === 'user' ? (
                      <>
                        <button
                          type="button"
                          onClick={handleResetPersonalTheme}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restablecer</span>
                        </button>

                        <button
                          type="button"
                          disabled={savingUserTheme}
                          onClick={handleSavePersonalTheme}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>{savingUserTheme ? 'Guardando...' : 'Guardar mi Estilo Personal'}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={savingCust}
                          onClick={handleSaveCustomization}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition flex items-center gap-1.5"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>{savingCust ? 'Guardando...' : 'Guardar para toda la Agencia'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =================================================================
              2. ESTILOS DE TOAST & MODAL DE CONFIRMACIÓN (EXACTO A LA IMAGEN)
             ================================================================= */}
          {activeTab === 'dialogs' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-7">
              {/* Encabezado con Botones de Prueba en Vivo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      Estilos de Modal de Confirmación y Notificaciones Toast
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Reemplaza los avisos nativos del navegador por alertas flotantes y diálogos
                      interactivos con el estilo que prefieras.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    disabled={savingCust}
                    onClick={() => handleSaveCustomization()}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingCust ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{savingCust ? 'Guardando...' : 'Guardar Ajustes'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toast(
                        `Notificación con estilo "${custForm.toastStyle}" en ${tenant.name}`,
                        'success',
                        custForm.toastStyle
                      )
                    }
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Probar Toast</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      confirmAction({
                        title: 'Confirmar Acción en Sistema',
                        message: `Así se presenta el modal interactivo con el estilo "${custForm.confirmModalStyle}" en ${tenant.name}.`,
                        confirmText: 'Aceptar',
                        cancelText: 'Cerrar',
                        styleOverride: custForm.confirmModalStyle,
                      })
                    }
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquareWarning className="w-3.5 h-3.5" />
                    <span>Probar Modal</span>
                  </button>
                </div>
              </div>

              {/* SECCIÓN 1: DISEÑO VISUAL DE NOTIFICACIONES TOAST */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span>💬 1. DISEÑO VISUAL DE NOTIFICACIONES TOAST</span>
                  </h3>
                </div>

                {/* Selector de Posición Responsive: PC, Tablet y Móvil */}
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Posición de Toasts por Dispositivo (Responsive)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Define en qué esquina o área de la pantalla aparecerán las alertas según el tipo de pantalla.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toast(
                          `Probando ubicación en ${tenant.companyInfo?.commercialName || tenant.name}`,
                          'success',
                          custForm.toastStyle
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Bell className="w-3 h-3 text-emerald-500" />
                      <span>Probar en esta pantalla</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {/* PC / Escritorio */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                          <Monitor className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          PC / Escritorio
                        </span>
                      </div>
                      <select
                        value={custForm.toastPositions?.desktop || custForm.toastPosition || 'top-right'}
                        onChange={(e) => {
                          const val = e.target.value as ToastPosition;
                          const nextPositions = {
                            desktop: val,
                            tablet: custForm.toastPositions?.tablet || custForm.toastPosition || 'top-center',
                            mobile: custForm.toastPositions?.mobile || 'top-center',
                          };
                          handleAutoSaveToastPositions(nextPositions, val);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                      >
                        <option value="top-right">Superior Derecha (Recomendado)</option>
                        <option value="top-center">Superior Centro</option>
                        <option value="top-left">Superior Izquierda</option>
                        <option value="bottom-right">Inferior Derecha</option>
                        <option value="bottom-center">Inferior Centro</option>
                        <option value="bottom-left">Inferior Izquierda</option>
                      </select>
                    </div>

                    {/* Tablet */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Tablet className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Tablet
                        </span>
                      </div>
                      <select
                        value={custForm.toastPositions?.tablet || custForm.toastPosition || 'top-center'}
                        onChange={(e) => {
                          const val = e.target.value as ToastPosition;
                          const nextPositions = {
                            desktop: custForm.toastPositions?.desktop || custForm.toastPosition || 'top-right',
                            tablet: val,
                            mobile: custForm.toastPositions?.mobile || 'top-center',
                          };
                          handleAutoSaveToastPositions(nextPositions, nextPositions.desktop);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                      >
                        <option value="top-center">Superior Centro (Recomendado)</option>
                        <option value="top-right">Superior Derecha</option>
                        <option value="top-left">Superior Izquierda</option>
                        <option value="bottom-center">Inferior Centro</option>
                        <option value="bottom-right">Inferior Derecha</option>
                        <option value="bottom-left">Inferior Izquierda</option>
                      </select>
                    </div>

                    {/* Celular / Móvil */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                          <Smartphone className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Celular / Móvil
                        </span>
                      </div>
                      <select
                        value={custForm.toastPositions?.mobile || 'top-center'}
                        onChange={(e) => {
                          const val = e.target.value as ToastPosition;
                          const nextPositions = {
                            desktop: custForm.toastPositions?.desktop || custForm.toastPosition || 'top-right',
                            tablet: custForm.toastPositions?.tablet || custForm.toastPosition || 'top-center',
                            mobile: val,
                          };
                          handleAutoSaveToastPositions(nextPositions, nextPositions.desktop);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                      >
                        <option value="top-center">Superior Centro / Isla (Recomendado)</option>
                        <option value="top-right">Superior Flotante</option>
                        <option value="bottom-center">Inferior Flotante</option>
                        <option value="bottom-right">Inferior Derecha</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Toast 1: Glassmorphism */}
                  <button
                    type="button"
                    onClick={() => handleCustChange({ ...custForm, toastStyle: 'glass' })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      custForm.toastStyle === 'glass'
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {/* Miniatura Wireframe */}
                    <div className="h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60 backdrop-blur-md flex items-center px-3 gap-2.5 mb-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 w-14 rounded-full bg-slate-800 dark:bg-slate-200" />
                        <div className="h-1.5 w-20 rounded-full bg-slate-400/50" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Glassmorphism
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Cristal translúcido con blur
                    </p>
                  </button>

                  {/* Toast 2: Minimalista */}
                  <button
                    type="button"
                    onClick={() => handleCustChange({ ...custForm, toastStyle: 'minimal' })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      custForm.toastStyle === 'minimal'
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {/* Miniatura Wireframe */}
                    <div className="h-16 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 flex items-center px-3 gap-2.5 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 w-14 rounded-full bg-slate-800 dark:bg-slate-200" />
                        <div className="h-1.5 w-16 rounded-full bg-slate-300 dark:bg-slate-700" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Minimalista
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Borde lateral ejecutivo
                    </p>
                  </button>

                  {/* Toast 3: Sólido Vibrante */}
                  <button
                    type="button"
                    onClick={() => handleCustChange({ ...custForm, toastStyle: 'solid' })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      custForm.toastStyle === 'solid'
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {/* Miniatura Wireframe */}
                    <div className="h-16 rounded-xl bg-emerald-600 flex items-center px-3 gap-2.5 mb-3 shadow-md">
                      <div className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 w-16 rounded-full bg-white" />
                        <div className="h-1.5 w-10 rounded-full bg-white/60" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Sólido Vibrante
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Color lleno de alto contraste
                    </p>
                  </button>

                  {/* Toast 4: Isla Dinámica / Pill */}
                  <button
                    type="button"
                    onClick={() => handleCustChange({ ...custForm, toastStyle: 'pill' })}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      custForm.toastStyle === 'pill'
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {/* Miniatura Wireframe */}
                    <div className="h-16 flex items-center justify-center mb-3">
                      <div className="h-9 px-3.5 rounded-full bg-slate-950 text-white flex items-center gap-2 border border-slate-800 shadow-md">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <div className="h-1.5 w-14 rounded-full bg-slate-200" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Isla Dinámica
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Cápsula oscura flotante
                    </p>
                  </button>
                </div>

                {/* OPCIONES AVANZADAS DE TOAST: PILA 3D, AUDIO THEMES & SIMULADOR */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  {/* Selector de Audio Themes */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-indigo-500" />
                          <span>Timbre Sonoro de Alertas (Web Audio Sintético)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Tono acústico reproducido al mostrar toasts y alertas operativas (0 KB red, 0 latencia).
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[
                        { id: 'chime', label: 'Modern Chime', desc: 'Doble nota suave' },
                        { id: 'pop', label: 'Minimal Pop', desc: 'Burbuja percusiva' },
                        { id: 'beep', label: 'Digital Beep', desc: 'Pulso tecnológico' },
                        { id: 'glass', label: 'Luxury Glass', desc: 'Cristal armónico' },
                        { id: 'silent', label: 'Silencioso', desc: 'Sin audio' },
                      ].map((snd) => {
                        const isSelected = (custForm.toastAudioTheme || 'chime') === snd.id;
                        return (
                          <div
                            key={snd.id}
                            className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                handleCustChange({
                                  ...custForm,
                                  toastAudioTheme: snd.id as ToastAudioTheme,
                                });
                                playNotificationSound(snd.id as ToastAudioTheme);
                              }}
                              className="text-left w-full cursor-pointer"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                  {snd.label}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {snd.desc}
                              </p>
                            </button>

                            {snd.id !== 'silent' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playNotificationSound(snd.id as ToastAudioTheme);
                                }}
                                className="mt-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Volume2 className="w-3 h-3" />
                                <span>Escuchar</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interruptor de Pila Agrupada 3D */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                          Pila Agrupada Inteligente 3D (Toast Stacking)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Si ocurren varias alertas consecutivas, se apilan con profundidad visual y contador expandible para no saturar la pantalla.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCustChange({
                          ...custForm,
                          toastStacking: custForm.toastStacking === false ? true : false,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        custForm.toastStacking !== false ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          custForm.toastStacking !== false ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Simulador Interactivo de Toasts */}
                  <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Simulador y Pruebas en Vivo de Funciones Toast:</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Haz clic para probar en vivo</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          toast('Notificación estándar completada con éxito', 'success')
                        }
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:border-slate-400 transition cursor-pointer"
                      >
                        ✓ Alerta Normal
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toast('Desliza este toast hacia la derecha o arriba en tu celular o pantalla táctil', 'info', {
                            title: 'Gesto Swipe-to-Dismiss',
                          })
                        }
                        className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100/50 transition cursor-pointer"
                      >
                        👆 Probar Swipe
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          toast('1/3 Foto de portada sincronizada con Drive', 'info');
                          setTimeout(() => toast('2/3 Copy generado y validado con IA', 'success'), 200);
                          setTimeout(
                            () =>
                              toast('3/3 Estado del post cambiado a En Revisión', 'warning', {
                                title: 'Pila 3D Agrupada',
                              }),
                            400
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-xs font-semibold hover:bg-purple-100/50 transition cursor-pointer"
                      >
                        📚 Probar Pila 3D (x3)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toast('El cliente rechazó la publicación #178. Requiere atención urgente.', 'error', {
                            title: 'ALERTA CRÍTICA FIJADA',
                            priority: 'critical',
                            actions: [
                              {
                                label: 'Ver Publicación',
                                onClick: () => alert('Abriendo publicación rechazada'),
                                variant: 'primary',
                              },
                              {
                                label: 'Contactar Cliente',
                                onClick: () => alert('Abriendo chat con cliente'),
                                variant: 'secondary',
                              },
                            ],
                          })
                        }
                        className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100/50 transition cursor-pointer shadow-2xs"
                      >
                        🔥 Probar Alerta Crítica (Fijada)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toast('Se archivó el proyecto Kachi Restaurante.', 'warning', {
                            title: 'Acción rápida',
                            actions: [
                              {
                                label: 'Deshacer cambio',
                                onClick: () => toast('Acción deshecha correctamente', 'success'),
                                variant: 'primary',
                              },
                            ],
                          })
                        }
                        className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100/50 transition cursor-pointer"
                      >
                        ⚡ Botones de Acción Directa
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: DISEÑO VISUAL DEL MODAL DE CONFIRMACIÓN */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>💠 2. DISEÑO VISUAL DEL MODAL DE CONFIRMACIÓN</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Modal 1: Centrado con Halo */}
                  <button
                    type="button"
                    onClick={() =>
                      handleCustChange({ ...custForm, confirmModalStyle: 'modern-center' })
                    }
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      custForm.confirmModalStyle === 'modern-center'
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-2 mb-3 gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-600 flex items-center justify-center">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <div className="h-1.5 w-14 rounded-full bg-slate-800 dark:bg-slate-200" />
                      <div className="h-2 w-16 rounded-md bg-indigo-500 mt-0.5" />
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Centrado con Halo
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Icono circular y doble botón
                    </p>
                  </button>

                  {/* Modal 2: Cristal Esmerilado */}
                  <button
                    type="button"
                    onClick={() =>
                      handleCustChange({ ...custForm, confirmModalStyle: 'glass-blur' })
                    }
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      custForm.confirmModalStyle === 'glass-blur'
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-20 rounded-xl border border-slate-800 bg-slate-900 flex flex-col justify-between p-2.5 mb-3">
                      <div className="h-1.5 w-full rounded-full bg-indigo-600" />
                      <div className="space-y-1">
                        <div className="h-1.5 w-16 rounded-full bg-slate-300" />
                        <div className="h-1.5 w-10 rounded-full bg-slate-500" />
                      </div>
                      <div className="h-2 w-14 rounded-md bg-indigo-500 self-end" />
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Cristal Esmerilado
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Blur con franja superior sólida
                    </p>
                  </button>

                  {/* Modal 3: Banner Ejecutivo */}
                  <button
                    type="button"
                    onClick={() =>
                      handleCustChange({ ...custForm, confirmModalStyle: 'split-banner' })
                    }
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      custForm.confirmModalStyle === 'split-banner'
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-20 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col mb-3">
                      <div className="h-6 bg-indigo-600 flex items-center px-2">
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 bg-white dark:bg-slate-900 p-2 flex flex-col justify-between">
                        <div className="h-1.5 w-12 rounded-full bg-slate-400" />
                        <div className="h-2 w-12 rounded bg-indigo-500 self-end" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Banner Ejecutivo
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Horizontal con pie de acción
                    </p>
                  </button>

                  {/* Modal 4: Sheet Flotante */}
                  <button
                    type="button"
                    onClick={() =>
                      handleCustChange({ ...custForm, confirmModalStyle: 'compact-sheet' })
                    }
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      custForm.confirmModalStyle === 'compact-sheet'
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col justify-end p-2 mb-3">
                      <div className="h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 flex flex-col justify-between shadow-xs">
                        <div className="h-1 w-8 rounded-full bg-slate-300 mx-auto" />
                        <div className="h-2 w-full rounded bg-indigo-500" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Sheet Flotante
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Deslizante estilo App móvil
                    </p>
                  </button>
                </div>
              </div>

              {/* SECCIÓN 3: NOTIFICACIONES PUSH MÓVILES (PWA EN CELULAR) & CANAL DE EVENTOS */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span>📲 3. NOTIFICACIONES PUSH EN CELULAR (PWA) & CANAL MULTITENANT</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Recibe alertas nativas en tu pantalla de bloqueo y bandeja de notificaciones al tener instalada la PWA.
                    </p>
                  </div>

                  {/* Estado Push */}
                  <div className="flex items-center gap-2">
                    {isPushSubscribed ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                        <CheckCheck className="w-4 h-4" />
                        <span>Activas en este celular</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
                        No activas aún
                      </span>
                    )}
                  </div>
                </div>

                {/* Card de Configuración Push */}
                <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                          Suscripción Web Push para Celulares Android y iOS
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Usa el Service Worker de la PWA y claves VAPID seguras para enviar alertas directas al dispositivo incluso con la aplicación cerrada.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {isPushSubscribed ? (
                        <>
                          <button
                            type="button"
                            onClick={() => sendTestPushNotification()}
                            className="px-3.5 py-2 rounded-xl border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Probar en mi celular</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => disablePushNotifications()}
                            className="px-3.5 py-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition cursor-pointer shadow-2xs"
                          >
                            Desactivar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => enablePushNotifications()}
                          className="px-4 py-2 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs bg-indigo-600 hover:bg-indigo-500"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Activar en este Celular</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => playNotificationChime()}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Probar sonido chime del sistema"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Probar Chime</span>
                      </button>
                    </div>
                  </div>

                  {/* Resumen de Módulos Conectados */}
                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                      Módulos conectados automáticamente al sistema de notificaciones:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                        <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Clientes & Marcas</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                        <CheckCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Cotizaciones</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                        <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Órdenes de Servicio</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Pagos & Notas de Cobro</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                        <CheckCheck className="w-3.5 h-3.5 text-purple-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Workspace & Redes</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Google Drive & Cloud</span>
                      </div>
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                        <CheckCheck className="w-3.5 h-3.5 text-teal-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Usuarios & Roles</span>
                      </div>
                      <div className="p-2 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Módulos Futuros (Auto)</span>
                      </div>
                    </div>
                  </div>

                  {/* Botón de guardado inferior */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-slate-200/80 dark:border-slate-800/80">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      💡 La posición y estilo de alertas se guardan automáticamente y aplican a todos los módulos.
                    </span>
                    <button
                      type="button"
                      disabled={savingCust}
                      onClick={() => handleSaveCustomization()}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {savingCust ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{savingCust ? 'Guardando...' : 'Guardar Ajustes de Toasts & Modales'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              3. IDENTIDAD & LOGOS (FAVICON, MODO CLARO, OSCURO Y PWA)
             ================================================================= */}
          {activeTab === 'identity' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Identidad Visual y Activos Gráficos
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configura los logos específicos para tema claro, oscuro, favicon del navegador e
                    icono de instalación PWA.
                  </p>
                </div>
              </div>

              {/* Sub-tarjetas de previsualización de logos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. PRINCIPAL & FACTURAS (Modo Claro) */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      PRINCIPAL & MODO CLARO
                    </span>
                    <span className="text-xs text-slate-400">Fondo blanco</span>
                  </div>

                  <div className="h-24 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-3">
                    {custForm.logoLightUrl ? (
                      <img
                        src={custForm.logoLightUrl}
                        alt="Logo Claro"
                        className="max-h-12 w-auto object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Logo por defecto</span>
                    )}
                  </div>

                  <label className="cursor-pointer w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <Upload className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Subir Logo Claro</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('logoLightUrl', e.target.files?.[0])}
                    />
                  </label>
                </div>

                {/* 2. MODO OSCURO */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      MODO OSCURO
                    </span>
                    <span className="text-xs text-slate-400">Fondo oscuro</span>
                  </div>

                  <div className="h-24 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center p-3">
                    {custForm.logoDarkUrl ? (
                      <img
                        src={custForm.logoDarkUrl}
                        alt="Logo Oscuro"
                        className="max-h-12 w-auto object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">Logo por defecto</span>
                    )}
                  </div>

                  <label className="cursor-pointer w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <Upload className="w-3.5 h-3.5 text-purple-500" />
                    <span>Subir Logo Oscuro</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('logoDarkUrl', e.target.files?.[0])}
                    />
                  </label>
                </div>

                {/* 3. PESTAÑA NAVEGADOR (Favicon) */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      PESTAÑA NAVEGADOR
                    </span>
                    <span className="text-xs text-slate-400">Favicon 64x64</span>
                  </div>

                  <div className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900 flex items-center justify-center p-3">
                    {custForm.faviconUrl ? (
                      <img
                        src={custForm.faviconUrl}
                        alt="Favicon"
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Sin Favicon</span>
                    )}
                  </div>

                  <label className="cursor-pointer w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <Upload className="w-3.5 h-3.5 text-amber-500" />
                    <span>Subir Favicon</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('faviconUrl', e.target.files?.[0])}
                    />
                  </label>
                </div>

                {/* 4. APP MÓVIL PWA */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      APP MÓVIL PWA
                    </span>
                    <span className="text-xs text-slate-400">Icono 192/512px</span>
                  </div>

                  <div className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900 flex items-center justify-center p-3">
                    {custForm.logoPwaUrl ? (
                      <img
                        src={custForm.logoPwaUrl}
                        alt="Logo PWA"
                        className="h-12 w-12 rounded-xl shadow-md object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Sin Icono PWA</span>
                    )}
                  </div>

                  <label className="cursor-pointer w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Subir Icono PWA</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload('logoPwaUrl', e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>

              {/* Ajuste de Nombre Global del Cliente y Moneda */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1">Nombre Global (Plural)</label>
                  <input
                    type="text"
                    value={custForm.clientGlobalNamePlural}
                    onChange={(e) =>
                      handleCustChange({
                        ...custForm,
                        clientGlobalNamePlural: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Nombre Global (Singular)</label>
                  <input
                    type="text"
                    value={custForm.clientGlobalNameSingular}
                    onChange={(e) =>
                      handleCustChange({
                        ...custForm,
                        clientGlobalNameSingular: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Moneda del Sistema</label>
                  <select
                    value={custForm.currencyCode}
                    onChange={(e) => {
                      const selected = CURRENCY_OPTIONS.find((c) => c.code === e.target.value);
                      if (selected) {
                        handleCustChange({
                          ...custForm,
                          currencyCode: selected.code,
                          currencySymbol: selected.symbol,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botón Guardar Identidad & Logos */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                <button
                  type="button"
                  disabled={savingCust}
                  onClick={handleSaveCustomization}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--app-primary)' }}
                >
                  <Save className="w-4 h-4" />
                  <span>{savingCust ? 'Guardando Logos...' : 'Guardar Identidad & Logos'}</span>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              4. DATOS DE LA EMPRESA & CUENTAS BANCARIAS GLOBALES
             ================================================================= */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveCompany}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6"
              >
                <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      Datos Oficiales de la Empresa y Redes
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Información fiscal, canales de contacto y enlaces a redes sociales de la agencia.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">Nombre Comercial *</label>
                    <input
                      type="text"
                      required
                      value={companyForm.commercialName}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, commercialName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Razón Social *</label>
                    <input
                      type="text"
                      required
                      value={companyForm.legalName}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, legalName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">RUC *</label>
                    <input
                      type="text"
                      required
                      value={companyForm.ruc}
                      onChange={(e) => setCompanyForm({ ...companyForm, ruc: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono-pin outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">WhatsApp</label>
                    <input
                      type="text"
                      value={companyForm.whatsapp}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, whatsapp: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Correo</label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Dirección</label>
                    <input
                      type="text"
                      value={companyForm.address}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, address: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Redes Sociales & Enlaces
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold mb-1">Instagram</label>
                      <input
                        type="text"
                        value={companyForm.socials.instagram}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            socials: { ...companyForm.socials, instagram: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1">TikTok</label>
                      <input
                        type="text"
                        value={companyForm.socials.tiktok}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            socials: { ...companyForm.socials, tiktok: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1">Sitio Web</label>
                      <input
                        type="text"
                        value={companyForm.socials.website}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            socials: { ...companyForm.socials, website: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingCompany}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md cursor-pointer transition"
                  >
                    {savingCompany ? 'Guardando...' : 'Guardar Datos de la Empresa'}
                  </button>
                </div>
              </form>

              {/* SECCIÓN GLOBAL: CUENTAS BANCARIAS Y MÉTODOS DE PAGO (COTIZACIONES + NOTAS DE PAGO) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                          Cuentas Bancarias & Métodos de Pago
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60">
                          Regla Global
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Estas cuentas y códigos QR se sincronizan automáticamente en todas tus{' '}
                        <span className="font-bold text-slate-700 dark:text-slate-200">Cotizaciones</span> y{' '}
                        <span className="font-bold text-slate-700 dark:text-slate-200">Notas de Pago</span>.
                      </p>
                    </div>
                  </div>

                  {!isAddingBankAccount && (
                    <button
                      type="button"
                      onClick={handleOpenAddBankAccount}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm shadow-blue-600/20 transition cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Añadir Nueva Cuenta</span>
                    </button>
                  )}
                </div>

                {/* FORMULARIO DE AÑADIR / EDITAR CUENTA BANCARIA (DISEÑO EXACTO IMAGEN 2) */}
                {isAddingBankAccount && (
                  <div className="bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/60 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {editingBankAccountId ? 'EDITAR CUENTA BANCARIA' : 'AÑADIR NUEVA CUENTA BANCARIA'}
                      </h4>
                      <button
                        type="button"
                        onClick={resetBankAccountForm}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* SELECCIÓN RÁPIDA DE ENTIDAD FINANCIERA */}
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                        SELECCIÓN RÁPIDA DE ENTIDAD FINANCIERA
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {BANK_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => handleApplyBankPreset(preset)}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-extrabold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: preset.color }}
                            />
                            <span className="text-slate-700 dark:text-slate-200">{preset.short}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* BANCO / PLATAFORMA Y MONEDA */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Banco / Plataforma de Pago <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bankFormName}
                          onChange={(e) => setBankFormName(e.target.value)}
                          placeholder="Ej. BCP Soles, BBVA, Yape Corporativo..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Moneda
                        </label>
                        <select
                          value={bankFormCurrency}
                          onChange={(e) => setBankFormCurrency(e.target.value as 'PEN' | 'USD' | 'EUR')}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        >
                          <option value="PEN">Soles (S/ - PEN)</option>
                          <option value="USD">Dólares ($ - USD)</option>
                          <option value="EUR">Euros (€ - EUR)</option>
                        </select>
                      </div>
                    </div>

                    {/* TITULAR DE LA CUENTA / RAZÓN SOCIAL */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Titular de la Cuenta / Razón Social
                        </label>
                        {(companyForm.legalName || companyForm.commercialName) && (
                          <button
                            type="button"
                            onClick={() =>
                              setBankFormBeneficiary(companyForm.legalName || companyForm.commercialName || '')
                            }
                            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            Usar razón social de la agencia
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={bankFormBeneficiary}
                        onChange={(e) => setBankFormBeneficiary(e.target.value)}
                        placeholder="Ej. The Roma Agency Corporación SAC"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>

                    {/* NÚMERO DE CUENTA Y CCI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Número de Cuenta / Teléfono Yape <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={bankFormAccountNumber}
                          onChange={(e) => setBankFormAccountNumber(e.target.value)}
                          placeholder="194-98765432-0-11 o +51 987 654 321"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          CCI / Detalles de Transferencia
                        </label>
                        <input
                          type="text"
                          value={bankFormNotes}
                          onChange={(e) => setBankFormNotes(e.target.value)}
                          placeholder="CCI: 002-1940098765432011-92"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                    </div>

                    {/* IMAGEN, LOGO O CÓDIGO QR DE PAGO */}
                    <div className="bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          IMAGEN, LOGO O CÓDIGO QR DE PAGO
                        </label>
                        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-900 p-0.5 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setBankImageInputMode('upload')}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              bankImageInputMode === 'upload'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          >
                            <Upload className="w-3 h-3" />
                            Subir Imagen
                          </button>
                          <button
                            type="button"
                            onClick={() => setBankImageInputMode('url')}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              bankImageInputMode === 'url'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          >
                            <Link className="w-3 h-3" />
                            Enlace URL
                          </button>
                        </div>
                      </div>

                      {bankImageInputMode === 'upload' ? (
                        <div>
                          <input
                            ref={bankFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleUploadBankImage}
                            className="hidden"
                          />
                          {!bankFormImageUrl ? (
                            <button
                              type="button"
                              onClick={() => bankFileInputRef.current?.click()}
                              className="w-full py-6 px-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl bg-white dark:bg-slate-900/60 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer group"
                            >
                              <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                Haz clic para subir imagen o código QR
                              </span>
                              <span className="text-[11px] text-slate-400">
                                PNG, JPG, SVG o WEBP (máx. 5MB)
                              </span>
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={bankFormImageUrl}
                          onChange={(e) => setBankFormImageUrl(e.target.value)}
                          placeholder="https://... (URL de imagen QR o logo del banco)"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      )}

                      {bankFormImageUrl && (
                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              onClick={() =>
                                setZoomedBankImage({
                                  url: bankFormImageUrl,
                                  title: bankFormName || 'Código QR / Imagen',
                                })
                              }
                              className="relative w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer group"
                            >
                              <img
                                src={bankFormImageUrl}
                                alt="Preview QR"
                                className="max-w-full max-h-full object-contain"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                Imagen / Código QR cargado
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                Haz clic en la miniatura para ampliar
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {bankImageInputMode === 'upload' && (
                              <button
                                type="button"
                                onClick={() => bankFileInputRef.current?.click()}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                              >
                                Cambiar
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setBankFormImageUrl('')}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Quitar imagen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={resetBankAccountForm}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={savingBankAccounts}
                        onClick={handleSaveBankAccountEntry}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>{editingBankAccountId ? 'Actualizar Cuenta' : 'Guardar Cuenta'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* LISTA DE CUENTAS BANCARIAS CONFIGURADAS */}
                {(!companyForm.bankAccounts || companyForm.bankAccounts.length === 0) && !isAddingBankAccount ? (
                  <div className="text-center py-10 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2.5 stroke-[1.5]" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      No hay cuentas bancarias registradas en la empresa
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      Añade tus cuentas de BCP, BBVA, Interbank, Yape o Plin para que aparezcan automáticamente en tus Cotizaciones y Notas de Pago.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAddBankAccount}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Añadir Primera Cuenta</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {(companyForm.bankAccounts || []).map((acc) => {
                      const isActive = acc.isActive !== false;
                      return (
                        <div
                          key={acc.id}
                          className={`p-4 rounded-2xl border transition flex items-start justify-between gap-3 ${
                            isActive
                              ? 'bg-slate-50/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 shadow-2xs'
                              : 'bg-slate-100/50 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 min-w-0 flex-1">
                            {acc.imageUrl ? (
                              <div
                                onClick={() =>
                                  setZoomedBankImage({ url: acc.imageUrl!, title: acc.name })
                                }
                                title="Clic para ampliar imagen / QR"
                                className="relative w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer group shadow-2xs"
                              >
                                <img
                                  src={acc.imageUrl}
                                  alt={acc.name}
                                  className="max-w-full max-h-full object-contain"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                  <ZoomIn className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-black text-xs border border-blue-200/60 dark:border-blue-800/40">
                                {acc.currency || 'PEN'}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                  {acc.name}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {acc.currency || 'PEN'}
                                </span>
                                {!isActive && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                                    Oculto
                                  </span>
                                )}
                              </div>

                              {acc.beneficiary && (
                                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                                  Titular: <span className="font-bold">{acc.beneficiary}</span>
                                </p>
                              )}

                              <div className="flex items-center gap-1.5 mt-1">
                                <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
                                  {acc.accountNumber}
                                </p>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const ok = await copyTextToClipboard(acc.accountNumber);
                                    if (ok) toast('Número de cuenta copiado.', 'info');
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                                  title="Copiar número"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {acc.notes && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 break-all">
                                  {acc.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleBankAccountActive(acc.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {isActive ? 'Activo' : 'Inactivo'}
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditBankAccount(acc)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                                title="Editar cuenta"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBankAccount(acc.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Eliminar cuenta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LIGHTBOX ZOOM PARA QR / IMAGEN BANCARIA */}
              {zoomedBankImage && (
                <div
                  className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4"
                  onClick={() => setZoomedBankImage(null)}
                >
                  <div
                    className="relative bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-full flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {zoomedBankImage.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setZoomedBankImage(null)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-center max-h-[65vh] overflow-auto w-full">
                      <img
                        src={zoomedBankImage.url}
                        alt={zoomedBankImage.title}
                        className="max-w-full max-h-[55vh] object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              5. USUARIOS DEL EQUIPO (PIN 8 DÍGITOS)
             ================================================================= */}
          {activeTab === 'users' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      Equipo de la Agencia (Acceso con PIN de 8 Dígitos)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Crea usuarios, asígnales PINs únicos de 8 dígitos y vincúlalos a un rol.
                    </p>
                  </div>
                </div>

                <PermissionGate permission="settings.users.manage">
                  <button
                    type="button"
                    onClick={openCreateUserModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center gap-1.5 self-start"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Usuario</span>
                  </button>
                </PermissionGate>
              </div>

              {loadingUsersRoles ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Cargando integrantes...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {usersList.map((u) => (
                    <div
                      key={u.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {u.jobTitle}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              u.isActive
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/15 text-rose-500'
                            }`}
                          >
                            {u.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
                          <span className="text-slate-500 text-[11px]">PIN 8 Dígitos:</span>
                          <span className="font-mono-pin font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">
                            {u.pin}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">Rol:</span>
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${u.roleBadgeColor || '#4f46e5'}20`,
                              color: u.roleBadgeColor || '#4f46e5',
                            }}
                          >
                            {u.roleName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => openEditUserModal(u)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Editar / PIN
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              6. ROLES Y PERMISOS GRANULARES
             ================================================================= */}
          {activeTab === 'roles' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      Roles y Matriz de Permisos Granulares
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Regla global: Cada acción está ligada a un permiso granular.
                    </p>
                  </div>
                </div>

                <PermissionGate permission="settings.roles.manage">
                  <button
                    type="button"
                    onClick={openCreateRoleModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center gap-1.5 self-start"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Rol</span>
                  </button>
                </PermissionGate>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rolesList.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: r.badgeColor }}
                          />
                          <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                            {r.name}
                          </p>
                        </div>
                        {r.isSystem && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Base
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {r.description}
                      </p>
                      <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {r.permissions.length} / {ALL_PERMISSION_KEYS.length} permisos activos
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400">
                        {usersCountByRole[r.id] || 0} usuario(s)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditRoleModal(r)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Permisos
                        </button>
                        {!r.isSystem && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(r)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              7. GESTIÓN MULTITENANT & WORKSPACES
             ================================================================= */}
          {activeTab === 'tenants' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        Espacios de Trabajo y Tenants Registrados
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                        SaaS Multi-Agencia
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Cambia de workspace con 1 clic, crea nuevas agencias o administra sus credenciales.
                    </p>
                  </div>
                </div>

                <PermissionGate permission="settings.tenants.manage">
                  <button
                    type="button"
                    onClick={openCreateTenantModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md flex items-center gap-1.5 self-start transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Agencia</span>
                  </button>
                </PermissionGate>
              </div>

              {/* Grid de Tenants */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tenantsList.map((t) => {
                  const isCurrent = t.id === tenant.id;
                  const activeTenantLogo =
                    resolvedTheme === 'dark'
                      ? t.customization?.logoDarkUrl || t.customization?.logoLightUrl
                      : t.customization?.logoLightUrl || t.customization?.logoDarkUrl;

                  return (
                    <div
                      key={t.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-indigo-500/70 bg-indigo-500/5 shadow-sm'
                          : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-lg shrink-0 overflow-hidden">
                            {activeTenantLogo ? (
                              <img
                                src={activeTenantLogo}
                                alt={t.name}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              t.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                                {t.name}
                              </h3>
                              {isCurrent && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                  <Check className="w-3 h-3" />
                                  En Uso
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                /{t.slug}
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {t.customization?.currencySymbol || 'S/'} ({t.customization?.currencyCode || 'PEN'})
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            t.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {t.status === 'active' ? 'Activo' : 'Suspendido'}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mb-4 bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <span>Razón Social:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[190px]">
                            {t.companyInfo?.legalName || t.companyInfo?.commercialName || t.name}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>RUC / ID:</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {t.companyInfo?.ruc || 'Sin RUC'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 dark:border-slate-800/40 text-[11px]">
                          <span>Recursos aislados:</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {t.usersCount} usuario(s) • {t.clientsCount} cliente(s)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800">
                        {isCurrent ? (
                          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Workspace Actual
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isSwitchingTenant}
                            onClick={() => switchTenant(t.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{isSwitchingTenant ? 'Cambiando...' : 'Cambiar a este Workspace'}</span>
                          </button>
                        )}

                        <div className="flex items-center gap-1.5">
                          <PermissionGate permission="settings.tenants.manage">
                            <button
                              type="button"
                              onClick={() => openEditTenantModal(t)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                              title="Editar datos de la agencia"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                            {!isCurrent && tenantsList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTenant(t)}
                                className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                title="Eliminar agencia"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </PermissionGate>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              8. GOOGLE DRIVE & APIS CLOUD
             ================================================================= */}
          {activeTab === 'drive' && <GoogleDriveSettingsTab />}

          {/* =================================================================
              8.1 CONEXIONES & APIS DE INTELIGENCIA ARTIFICIAL (GEMINI)
             ================================================================= */}
          {activeTab === 'connections' && <ConnectionsSettingsTab />}

          {/* =================================================================
              9. ACTUALIZACIONES DEL SISTEMA EN TIEMPO REAL (1 SOLO CLIC)
             ================================================================= */}
          {activeTab === 'system-update' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
              {/* Encabezado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <RefreshCw className={`w-5 h-5 ${loadingUpdateInfo || isUpdating ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Actualizaciones del Sistema en Tiempo Real</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        1-CLIC SEGURO
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Descarga del repositorio Git, migra la base de datos sin alterar información existente y recompila la aplicación.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    disabled={loadingUpdateInfo || isUpdating}
                    onClick={loadUpdateStatus}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUpdateInfo ? 'animate-spin' : ''}`} />
                    <span>Comprobar Estado</span>
                  </button>
                </div>
              </div>

              {/* Banner de Nueva Actualización Disponible */}
              {updateInfo?.updateAvailable && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border-2 border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Sparkles className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          ¡Nueva Actualización Disponible en GitHub!
                        </h3>
                        {updateInfo.remoteCommit && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500 text-white">
                            {updateInfo.remoteCommit}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        "{updateInfo.remoteCommitMessage || 'Nueva versión lista para descargar'}"
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Versión instalada actual: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{updateInfo.currentCommit}</span>. Presiona "Actualizar Sistema Ahora" para sincronizarla en 1 Clic.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleRunSystemUpdate}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                    <span>Actualizar Ahora (1 Clic)</span>
                  </button>
                </div>
              )}

              {/* Cards de Información de Estado */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Git & Repositorio */}
                <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
                      Control de Versiones Git
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        updateInfo?.updateAvailable
                          ? 'bg-emerald-500 text-white animate-pulse'
                          : updateInfo?.isGitRepo
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {updateInfo?.updateAvailable
                        ? 'Actualización disponible'
                        : updateInfo?.isGitRepo
                        ? 'Al día'
                        : 'Sin .git local'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Rama actual:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {updateInfo?.branch || 'main'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>Commit ID:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {updateInfo?.currentCommit || 'N/A'}
                      </span>
                    </div>
                    {updateInfo?.lastCommitMessage && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        "{updateInfo.lastCommitMessage}"
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Base de Datos & Persistencia */}
                <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-emerald-500" />
                      Base de Datos
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600">
                      100% Protegida
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-slate-800 dark:text-slate-200 font-semibold truncate">
                      {updateInfo?.database?.engine || 'Motor Activo'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Migraciones seguras no destructivas. Tus clientes, cotizaciones y configuraciones nunca se borran.
                    </p>
                  </div>
                </div>

                {/* 3. Compilación & Servidor */}
                <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                      Entorno & Compilación
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600">
                      {updateInfo?.isPrecompiled ? 'Producción (dist)' : 'Vite + TS'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Node.js:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {updateInfo?.nodeVersion || 'v22.x'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Último Build:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {updateInfo?.lastBuildDate
                          ? new Date(updateInfo.lastBuildDate).toLocaleTimeString('es-PE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Activo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opciones del Proceso de Actualización */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Pasos incluidos en la actualización de 1 Clic
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateOptions.runGitPull}
                      onChange={(e) =>
                        setUpdateOptions({ ...updateOptions, runGitPull: e.target.checked })
                      }
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">1. Git Pull</p>
                        {!updateInfo?.isGitRepo && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-semibold">Opcional</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {updateInfo?.isGitRepo
                          ? 'Descarga los commits más recientes del repositorio.'
                          : 'No aplica en despliegue por archivo/cPanel (sin .git).'}
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateOptions.runDbMigration}
                      onChange={(e) =>
                        setUpdateOptions({ ...updateOptions, runDbMigration: e.target.checked })
                      }
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">2. Migración Segura DB</p>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-semibold">Recomendado</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Añade columnas y tablas nuevas sin tocar datos existentes.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateOptions.runBuild}
                      onChange={(e) =>
                        setUpdateOptions({ ...updateOptions, runBuild: e.target.checked })
                      }
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">3. Recompilación</p>
                        {updateInfo?.isPrecompiled && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 font-semibold">dist/ listo</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {updateInfo?.canBuild
                          ? 'Compila Frontend (Vite) y Servidor TypeScript.'
                          : 'Servidor productivo: ya cuenta con los archivos compilados en dist/.'}
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Rama de despliegue:</span>
                    <input
                      type="text"
                      value={updateOptions.branch}
                      onChange={(e) =>
                        setUpdateOptions({ ...updateOptions, branch: e.target.value })
                      }
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold w-28"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleRunSystemUpdate}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                    <span>{isUpdating ? 'Actualizando el sistema...' : 'Actualizar Sistema Ahora (1 Clic)'}</span>
                  </button>
                </div>
              </div>

              {/* Consola de Logs en Tiempo Real */}
              {updateLogs.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      Consola de Actualización en Vivo
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {isUpdating ? 'En progreso...' : 'Finalizado'}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto font-mono text-[11px] pt-1">
                    {updateLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold shrink-0 ${
                            log.status === 'success'
                              ? 'bg-emerald-950 text-emerald-400'
                              : log.status === 'error'
                              ? 'bg-rose-950 text-rose-400'
                              : log.status === 'warning'
                              ? 'bg-amber-950 text-amber-400'
                              : 'bg-indigo-950 text-indigo-400'
                          }`}
                        >
                          {log.step.toUpperCase()}
                        </span>
                        <span
                          className={`break-all ${
                            log.status === 'success'
                              ? 'text-slate-200'
                              : log.status === 'error'
                              ? 'text-rose-400 font-bold'
                              : log.status === 'warning'
                              ? 'text-amber-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          MODALES NATIVOS PARA USUARIO Y ROL
         ===================================================================== */}
      {/* =====================================================================
          MODALES NATIVOS PARA USUARIO, ROL Y TENANT (ESTILO TIPO APP)
         ===================================================================== */}
      {/* 1. Modal Usuario Tipo App */}
      <dialog
        ref={userDialogRef}
        closedby="any"
        aria-labelledby="user-dialog-title"
        className="m-auto p-0 border-0 outline-none bg-transparent max-w-lg w-[94vw] sm:w-[540px]"
      >
        <div
          className="border rounded-[24px] sm:rounded-[28px] shadow-2xl overflow-hidden max-h-[85dvh] sm:max-h-[90dvh] flex flex-col transition-colors duration-200"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Mobile Sheet Handle */}
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 sm:hidden shrink-0" />

          {/* Header Tipo App */}
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
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span
                  className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--app-primary) 12%, transparent)',
                    color: 'var(--app-primary)',
                  }}
                >
                  ACCESO DE EQUIPO
                </span>
                <h3 id="user-dialog-title" className="text-base sm:text-lg font-black tracking-tight mt-0.5 truncate">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario del Equipo'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  Acceso al sistema mediante PIN exclusivo de 8 dígitos numéricos.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => userDialogRef.current?.close()}
              className="w-8 h-8 rounded-full border flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition shrink-0 cursor-pointer hover:bg-slate-500/10"
              style={{ borderColor: 'var(--app-border)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveUser} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
            {/* Sección 1: Datos Personales */}
            <div
              className="p-4 rounded-2xl border space-y-3.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--app-border)' }}>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" style={{ color: 'var(--app-primary)' }} />
                  1. Perfil del Colaborador
                </span>
                <span className="text-[10px] font-bold text-slate-400">Identificación</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Nombre Completo <span className="text-rose-500">*</span>
                  </label>
                  <div
                    className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <Users className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      required
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="Ej. Ana Lucía Morales"
                      className="w-full bg-transparent text-xs font-semibold outline-none"
                      style={{ color: 'var(--app-text)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Cargo o Especialidad
                  </label>
                  <div
                    className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <Building className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={userForm.jobTitle}
                      onChange={(e) => setUserForm({ ...userForm, jobTitle: e.target.value })}
                      placeholder="Diseñador Senior / Community Manager"
                      className="w-full bg-transparent text-xs font-semibold outline-none"
                      style={{ color: 'var(--app-text)' }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Correo Electrónico
                  </label>
                  <div
                    className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <Mail className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="usuario@agencia.com"
                      className="w-full bg-transparent text-xs font-semibold outline-none"
                      style={{ color: 'var(--app-text)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    WhatsApp de Contacto
                  </label>
                  <div
                    className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <MessageCircle className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={userForm.whatsapp}
                      onChange={(e) => setUserForm({ ...userForm, whatsapp: e.target.value })}
                      placeholder="+51 987 654 321"
                      className="w-full bg-transparent text-xs font-semibold outline-none"
                      style={{ color: 'var(--app-text)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2: Seguridad & PIN */}
            <div
              className="p-4 rounded-2xl border space-y-3.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--app-border)' }}>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" style={{ color: 'var(--app-primary)' }} />
                  2. Credenciales & Rol
                </span>
                <span className="text-[10px] font-bold text-slate-400">PIN 8 Dígitos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Rol Asignado <span className="text-rose-500">*</span>
                  </label>
                  <div
                    className="flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <ShieldCheck className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <select
                      value={userForm.roleId}
                      onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                      className="w-full bg-transparent text-xs font-semibold outline-none cursor-pointer"
                      style={{ color: 'var(--app-text)' }}
                    >
                      {rolesList.map((r) => (
                        <option key={r.id} value={r.id} className="dark:bg-slate-900">
                          {r.name} {r.isSystem || r.name.toLowerCase().includes('admin') ? '⭐ (Super Admin)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    PIN 8 Dígitos Numéricos <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div
                      className="flex-1 flex items-center rounded-xl border px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-indigo-500/20"
                      style={{
                        backgroundColor: 'var(--app-surface)',
                        borderColor: 'var(--app-border)',
                      }}
                    >
                      <Hash className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        required
                        maxLength={8}
                        value={userForm.pin}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            pin: e.target.value.replace(/\D/g, '').slice(0, 8),
                          })
                        }
                        placeholder="12345678"
                        className="w-full bg-transparent font-mono-pin font-bold text-xs tracking-widest outline-none"
                        style={{ color: 'var(--app-text)' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={generateRandomPin}
                      className="px-3 rounded-xl border flex items-center gap-1 text-xs font-bold transition hover:bg-slate-500/10 cursor-pointer"
                      style={{
                        borderColor: 'var(--app-border)',
                        color: 'var(--app-primary)',
                      }}
                      title="Generar PIN aleatorio"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Aleatorio</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            </div>

            {/* Footer Botones Fijo */}
            <div
              className="shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 border-t flex items-center justify-between gap-3"
              style={{
                borderColor: 'var(--app-border)',
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 97%, var(--app-bg) 3%)',
              }}
            >
              <span className="text-[11px] text-slate-400">* Campos obligatorios</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => userDialogRef.current?.close()}
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
                  disabled={savingUser}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--app-primary)' }}
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{savingUser ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </dialog>

      {/* 2. Modal Rol Tipo App */}
      <dialog
        ref={roleDialogRef}
        closedby="any"
        aria-labelledby="role-dialog-title"
        className="m-auto p-0 border-0 outline-none bg-transparent max-w-6xl w-[96vw] sm:w-[1100px]"
      >
        <div
          className="border rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[90dvh] sm:max-h-[92dvh] flex flex-col transition-colors duration-200"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
          }}
        >
          {/* Mobile Sheet Handle */}
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 sm:hidden shrink-0" />

          {/* Header Rol */}
          <div
            className="px-5 sm:px-7 py-3.5 sm:py-4.5 border-b flex items-center justify-between gap-3 shrink-0"
            style={{ borderColor: 'var(--app-border)' }}
          >
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--app-primary) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--app-primary) 25%, transparent)',
                  color: 'var(--app-primary)',
                }}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--app-primary) 12%, transparent)',
                      color: 'var(--app-primary)',
                    }}
                  >
                    MATRIZ DE PERMISOS
                  </span>
                  {editingRole?.isSystem && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Rol de Sistema Protegido
                    </span>
                  )}
                </div>
                <h3 id="role-dialog-title" className="text-base sm:text-lg font-black tracking-tight mt-0.5 truncate">
                  {editingRole ? `Configurar: ${editingRole.name}` : 'Crear Nuevo Rol'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  Control granular de accesos, permisos de lectura, creación, edición y administración para este rol.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => roleDialogRef.current?.close()}
              className="w-8 h-8 rounded-full border flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition shrink-0 cursor-pointer hover:bg-slate-500/10"
              style={{ borderColor: 'var(--app-border)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveRole} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
              {/* Bloque 1: Configuración Básica del Rol */}
              <div
                className="p-4 sm:p-5 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                      Nombre del Rol <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                      placeholder="Ej. Diseñador Senior, Trafficker, Ejecutivo de Cuentas..."
                      className="w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-indigo-500/20"
                      style={{
                        backgroundColor: 'var(--app-surface)',
                        borderColor: 'var(--app-border)',
                        color: 'var(--app-text)',
                      }}
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                      Descripción Operativa <span className="text-[10px] text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={roleForm.description}
                      onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                      placeholder="Ej. Acceso a cotizaciones y clientes..."
                      className="w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition focus:ring-2 focus:ring-indigo-500/20"
                      style={{
                        backgroundColor: 'var(--app-surface)',
                        borderColor: 'var(--app-border)',
                        color: 'var(--app-text)',
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                      Badge de Color
                    </label>
                    <div
                      className="flex items-center gap-2 rounded-xl border px-3 py-1.5 h-[38px]"
                      style={{
                        backgroundColor: 'var(--app-surface)',
                        borderColor: 'var(--app-border)',
                      }}
                    >
                      <input
                        type="color"
                        value={roleForm.badgeColor}
                        onChange={(e) => setRoleForm({ ...roleForm, badgeColor: e.target.value })}
                        className="w-6 h-6 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="font-mono-pin text-[11px] font-bold">{roleForm.badgeColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloque 2: Barra de Control y Acciones Rápidas */}
              <div
                className="p-3.5 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--app-surface) 80%, var(--app-bg) 20%)',
                  borderColor: 'var(--app-border)',
                }}
              >
                {/* Buscador de Permisos */}
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={rolePermissionSearch}
                    onChange={(e) => setRolePermissionSearch(e.target.value)}
                    placeholder="Buscar permiso por nombre, módulo o descripción..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border outline-none transition focus:ring-2 focus:ring-indigo-500/20"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                      color: 'var(--app-text)',
                    }}
                  />
                  {rolePermissionSearch && (
                    <button
                      type="button"
                      onClick={() => setRolePermissionSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Acciones Rápidas Globales y Contador */}
                <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
                  <div
                    className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0"
                    style={{
                      borderColor: 'var(--app-border)',
                      backgroundColor: 'var(--app-surface)',
                    }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {roleForm.permissions.length}
                    </span>
                    <span className="text-[11px] text-slate-400">/ {ALL_PERMISSION_KEYS.length} activos</span>
                  </div>

                  {!editingRole?.isSystem && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={grantAllPermissions}
                        title="Conceder todos los permisos del sistema"
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Conceder Todos</span>
                      </button>
                      <button
                        type="button"
                        onClick={grantOnlyViewPermissions}
                        title="Conceder únicamente permisos de lectura y consulta"
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Solo Lectura</span>
                      </button>
                      <button
                        type="button"
                        onClick={clearAllPermissions}
                        title="Desmarcar todos los permisos"
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Limpiar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Filtro de Categoría por Pestañas Rápidas */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'all', label: 'Todos los Módulos' },
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'clients', label: 'Clientes' },
                  { id: 'quotes', label: 'Cotizaciones' },
                  { id: 'services', label: 'Servicios' },
                  { id: 'payments', label: 'Notas de Pago' },
                  { id: 'service_orders', label: 'Órdenes OS' },
                  { id: 'workspace', label: 'Workspace' },
                  { id: 'drive', label: 'Google Drive' },
                  { id: 'settings', label: 'Configuración' },
                ].map((tab) => {
                  const isActive = roleModuleFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setRoleModuleFilter(tab.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-500/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Matriz de Permisos por Módulo */}
              <div className="space-y-4 pt-1">
                {(
                  [
                    {
                      key: 'dashboard',
                      title: 'Dashboard & Métricas Operativas',
                      items: groupedPermissions.dashboard,
                      icon: LayoutDashboard,
                      color: 'text-sky-500',
                      bg: 'bg-sky-500/10',
                    },
                    {
                      key: 'clients',
                      title: 'Clientes, Cuentas & Marcas',
                      items: groupedPermissions.clients,
                      icon: Users,
                      color: 'text-emerald-500',
                      bg: 'bg-emerald-500/10',
                    },
                    {
                      key: 'quotes',
                      title: 'Cotizaciones & Propuestas Comerciales',
                      items: groupedPermissions.quotes,
                      icon: FileText,
                      color: 'text-amber-500',
                      bg: 'bg-amber-500/10',
                    },
                    {
                      key: 'services',
                      title: 'Servicios de Agencia & Paquetes',
                      items: groupedPermissions.services,
                      icon: Briefcase,
                      color: 'text-violet-500',
                      bg: 'bg-violet-500/10',
                    },
                    {
                      key: 'payments',
                      title: 'Notas de Pago & Registro de Cobranzas',
                      items: groupedPermissions.payments,
                      icon: CreditCard,
                      color: 'text-teal-500',
                      bg: 'bg-teal-500/10',
                    },
                    {
                      key: 'service_orders',
                      title: 'Órdenes de Servicio (OS) & Switchers',
                      items: groupedPermissions.service_orders,
                      icon: ClipboardList,
                      color: 'text-indigo-500',
                      bg: 'bg-indigo-500/10',
                    },
                    {
                      key: 'workspace',
                      title: 'Workspace, Redes Sociales & Tareas',
                      items: groupedPermissions.workspace,
                      icon: Globe,
                      color: 'text-pink-500',
                      bg: 'bg-pink-500/10',
                    },
                    {
                      key: 'drive',
                      title: 'Archivos Cloud & Google Drive APIs',
                      items: groupedPermissions.drive,
                      icon: HardDrive,
                      color: 'text-blue-500',
                      bg: 'bg-blue-500/10',
                    },
                    {
                      key: 'settings',
                      title: 'Configuración, Multitenant & Seguridad',
                      items: groupedPermissions.settings,
                      icon: Shield,
                      color: 'text-rose-500',
                      bg: 'bg-rose-500/10',
                    },
                  ] as const
                )
                  .filter((g) => roleModuleFilter === 'all' || roleModuleFilter === g.key)
                  .map((g) => {
                    const searchLower = rolePermissionSearch.trim().toLowerCase();
                    const filteredItems = g.items.filter((p) => {
                      if (!searchLower) return true;
                      return (
                        p.label.toLowerCase().includes(searchLower) ||
                        p.description.toLowerCase().includes(searchLower) ||
                        p.key.toLowerCase().includes(searchLower)
                      );
                    });

                    if (filteredItems.length === 0) return null;

                    const allGroupKeys = g.items.map((p) => p.key);
                    const activeCountInGroup = g.items.filter((p) => roleForm.permissions.includes(p.key)).length;
                    const isAllGroupActive = g.items.length > 0 && activeCountInGroup === g.items.length;
                    const IconComp = g.icon;

                    return (
                      <div
                        key={g.key}
                        className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border space-y-3 transition-colors shadow-sm"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--app-surface) 65%, var(--app-bg) 35%)',
                          borderColor: 'var(--app-border)',
                        }}
                      >
                        {/* Cabecera del Módulo */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl ${g.bg} flex items-center justify-center shrink-0`}>
                              <IconComp className={`w-4 h-4 ${g.color}`} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 truncate">
                                {g.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isAllGroupActive
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                      : activeCountInGroup > 0
                                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                                      : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                  }`}
                                >
                                  {activeCountInGroup} de {g.items.length} activos
                                </span>
                              </div>
                            </div>
                          </div>

                          {!editingRole?.isSystem && g.items.length > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => toggleAllPermissionsInGroup(allGroupKeys)}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer text-slate-600 dark:text-slate-300"
                              >
                                {isAllGroupActive ? 'Desmarcar todo' : 'Todo el módulo'}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleGroupViewOnly(allGroupKeys)}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer text-slate-600 dark:text-slate-300"
                              >
                                Solo Ver
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Grid de Permisos con Descripción Clara */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {filteredItems.map((p) => {
                            const checked = roleForm.permissions.includes(p.key);
                            return (
                              <label
                                key={p.key}
                                className={`group relative p-3 sm:p-3.5 rounded-2xl border transition-all duration-150 flex flex-col justify-between cursor-pointer select-none ${
                                  checked
                                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 shadow-sm ring-1 ring-indigo-500/30'
                                    : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <div>
                                  {/* Fila superior: Checkbox + Nombre + Badge Crítico */}
                                  <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <input
                                        type="checkbox"
                                        disabled={editingRole?.isSystem}
                                        checked={checked}
                                        onChange={() => togglePermissionInRole(p.key)}
                                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer shrink-0 mt-0.5"
                                      />
                                      <span
                                        className={`text-xs font-bold leading-tight ${
                                          checked
                                            ? 'text-indigo-950 dark:text-indigo-100 font-extrabold'
                                            : 'text-slate-800 dark:text-slate-200'
                                        }`}
                                      >
                                        {p.label}
                                      </span>
                                    </div>
                                    {p.isCritical && (
                                      <span
                                        className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                        title="Permiso crítico o de alto privilegio"
                                      >
                                        Crítico
                                      </span>
                                    )}
                                  </div>

                                  {/* Descripción en lenguaje natural y comprensible */}
                                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 pl-6.5">
                                    {p.description}
                                  </p>
                                </div>

                                {/* Pie de la tarjeta: Identificador y estado visual */}
                                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] pl-6.5">
                                  <span className="font-mono text-slate-400 dark:text-slate-500 text-[9.5px] truncate max-w-[140px]">
                                    {p.key}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold ${
                                      checked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                                    }`}
                                  >
                                    {checked ? 'Concedido' : 'Sin acceso'}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer Botones Fijo */}
            <div
              className="shrink-0 px-4 sm:px-6 py-3 sm:py-3.5 border-t flex items-center justify-between gap-3"
              style={{
                borderColor: 'var(--app-border)',
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 97%, var(--app-bg) 3%)',
              }}
            >
              <span className="text-[11px] text-slate-400">
                {editingRole?.isSystem ? 'Rol del sistema no modificable' : 'Los cambios aplican de inmediato'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => roleDialogRef.current?.close()}
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
                  disabled={savingRole || editingRole?.isSystem}
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: 'var(--app-primary)' }}
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{savingRole ? 'Guardando...' : editingRole ? 'Actualizar Rol' : 'Guardar Rol'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </dialog>

      {/* 3. Modal Crear / Editar Tenant Tipo App */}
      <dialog
        ref={tenantDialogRef}
        closedby="any"
        aria-labelledby="tenant-dialog-title"
        className="m-auto p-0 border-0 outline-none bg-transparent max-w-2xl w-[94vw] sm:w-[640px]"
      >
        <div
          className="border rounded-[24px] sm:rounded-[28px] shadow-2xl overflow-hidden max-h-[85dvh] sm:max-h-[90dvh] flex flex-col transition-colors duration-200"
          style={{
            backgroundColor: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            color: 'var(--app-text)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Mobile Sheet Handle */}
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 sm:hidden shrink-0" />

          {/* Header Tenant */}
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
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span
                  className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--app-primary) 12%, transparent)',
                    color: 'var(--app-primary)',
                  }}
                >
                  ESPACIO MULTITENANT
                </span>
                <h3 id="tenant-dialog-title" className="text-base sm:text-lg font-black tracking-tight mt-0.5 truncate">
                  {editingTenant ? `Editar Agencia: ${editingTenant.name}` : 'Registrar Nueva Agencia / Tenant'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                  Espacio de trabajo independiente con sus propios clientes, marcas y usuarios.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => tenantDialogRef.current?.close()}
              className="w-8 h-8 rounded-full border flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition shrink-0 cursor-pointer hover:bg-slate-500/10"
              style={{ borderColor: 'var(--app-border)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveTenant} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain">
            {/* Sección 1: Identificación */}
            <div
              className="p-4 rounded-2xl border space-y-3.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Nombre de la Agencia *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Nova Pixel Studio"
                    value={tenantForm.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      const updates: any = { name: newName };
                      if (!editingTenant && (!tenantForm.slug || tenantForm.slug === tenantForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-'))) {
                        updates.slug = newName.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                      }
                      setTenantForm({ ...tenantForm, ...updates });
                    }}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                      color: 'var(--app-text)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Identificador Slug (URL / Acceso) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. nova-pixel"
                    value={tenantForm.slug}
                    onChange={(e) =>
                      setTenantForm({
                        ...tenantForm,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                      })
                    }
                    className="w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs font-bold outline-none"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                      color: 'var(--app-text)',
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    Moneda del Sistema *
                  </label>
                  <select
                    value={tenantForm.currencyCode}
                    onChange={(e) =>
                      setTenantForm({
                        ...tenantForm,
                        currencyCode: e.target.value as any,
                      })
                    }
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none cursor-pointer"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                      color: 'var(--app-text)',
                    }}
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code} className="dark:bg-slate-900">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                    RUC o Identificación Tributaria
                  </label>
                  <input
                    type="text"
                    placeholder="ej. 20609845123"
                    value={tenantForm.ruc}
                    onChange={(e) => setTenantForm({ ...tenantForm, ruc: e.target.value })}
                    className="w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono-pin font-bold outline-none"
                    style={{
                      backgroundColor: 'var(--app-surface)',
                      borderColor: 'var(--app-border)',
                      color: 'var(--app-text)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Sección 2: Logo de la Agencia */}
            <div
              className="p-4 rounded-2xl border space-y-3.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--app-border)' }}>
                <div className="flex items-center gap-2">
                  <Palette className="w-3.5 h-3.5" style={{ color: 'var(--app-primary)' }} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Logo de la Agencia
                  </span>
                </div>
                {/* Switch de modo: Subir Imagen / URL */}
                <div
                  className="flex items-center p-0.5 rounded-lg border text-[11px]"
                  style={{
                    backgroundColor: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setTenantLogoInputMode('upload')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 font-bold ${
                      tenantLogoInputMode === 'upload'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Subir Imagen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTenantLogoInputMode('url')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1.5 font-bold ${
                      tenantLogoInputMode === 'url'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>Enlace / URL</span>
                  </button>
                </div>
              </div>

              {/* Subida o URL */}
              {tenantLogoInputMode === 'upload' ? (
                <label
                  className="border-2 border-dashed rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition hover:border-indigo-500 hover:bg-slate-500/5 group"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={(e) => handleTenantLogoFileUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Haz clic aquí para seleccionar el logo del workspace
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      PNG, JPG, SVG o WebP (Hasta 5MB)
                    </p>
                  </div>
                </label>
              ) : (
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
                    value={tenantForm.logoUrl}
                    onChange={(e) => setTenantForm({ ...tenantForm, logoUrl: e.target.value })}
                    placeholder="https://ejemplo.com/logos/mi-agencia.png"
                    className="w-full bg-transparent text-xs font-semibold outline-none"
                    style={{ color: 'var(--app-text)' }}
                  />
                </div>
              )}

              {/* Previsualización del Logo cargado */}
              {tenantForm.logoUrl && (
                <div
                  className="p-3 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in duration-150"
                  style={{
                    backgroundColor: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl border p-1 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                      <img
                        src={tenantForm.logoUrl}
                        alt="Logo preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Logo de agencia cargado
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 truncate max-w-xs mt-0.5">
                        {tenantForm.logoUrl.startsWith('data:') ? 'Imagen en Base64 procesada' : tenantForm.logoUrl}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTenantForm({ ...tenantForm, logoUrl: '' })}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Quitar</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sección 3: Asignar Usuarios al Workspace */}
            <div
              className="p-4 rounded-2xl border space-y-3.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                borderColor: 'var(--app-border)',
              }}
            >
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--app-border)' }}>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" style={{ color: 'var(--app-primary)' }} />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Usuarios con Acceso al Workspace
                    </span>
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Podrán acceder y alternar a esta agencia con su PIN personal.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTenantForm({
                        ...tenantForm,
                        assignedUserIds: availableUsers.map((u) => u.id),
                      });
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-500/10 cursor-pointer"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTenantForm({
                        ...tenantForm,
                        assignedUserIds: currentUser?.id ? [currentUser.id] : [],
                      });
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-500/10 cursor-pointer text-slate-500"
                  >
                    Solo Yo
                  </button>
                </div>
              </div>

              {availableUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  Cargando usuarios disponibles del sistema...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {availableUsers.map((u) => {
                    const isSelected = tenantForm.assignedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          const nextIds = isSelected
                            ? tenantForm.assignedUserIds.filter((id) => id !== u.id)
                            : [...tenantForm.assignedUserIds, u.id];
                          setTenantForm({ ...tenantForm, assignedUserIds: nextIds });
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition cursor-pointer select-none ${
                          isSelected
                            ? 'border-indigo-500/60 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-indigo-600 cursor-pointer shrink-0 accent-indigo-600"
                          />
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.name}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[11px] font-black shrink-0">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {u.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {u.jobTitle || u.email || 'Miembro de Equipo'}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                            Asignado
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Administrador Inicial si es Nuevo */}
            {!editingTenant && (
              <div
                className="p-4 rounded-2xl border space-y-3.5"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--app-surface) 60%, var(--app-bg) 40%)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--app-border)' }}>
                  <KeyRound className="w-3.5 h-3.5" style={{ color: 'var(--app-primary)' }} />
                  <span className="text-xs font-bold">
                    Administrador Inicial del Workspace
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                      Nombre del Administrador *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Carlos Mendoza"
                      value={tenantForm.adminName}
                      onChange={(e) => setTenantForm({ ...tenantForm, adminName: e.target.value })}
                      className="w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none"
                      style={{
                        backgroundColor: 'var(--app-surface)',
                        borderColor: 'var(--app-border)',
                        color: 'var(--app-text)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-200">
                      PIN de Acceso (8 Dígitos Numéricos) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      placeholder="11223344"
                      value={tenantForm.adminPin}
                      onChange={(e) =>
                        setTenantForm({
                          ...tenantForm,
                          adminPin: e.target.value.replace(/\D/g, '').slice(0, 8),
                        })
                      }
                      className="w-full rounded-xl border px-3.5 py-2.5 font-mono-pin font-bold text-xs outline-none tracking-widest"
                      style={{
                        backgroundColor: 'var(--app-surface)',
                        borderColor: 'var(--app-border)',
                        color: 'var(--app-text)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

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
                onClick={() => tenantDialogRef.current?.close()}
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
                disabled={savingTenant}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--app-primary)' }}
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{savingTenant ? 'Guardando...' : editingTenant ? 'Guardar Cambios' : 'Crear Agencia & Activar'}</span>
              </button>
            </div>
          </form>
        </div>
      </dialog>

      {/* ===================================================================
          BOTÓN FLOTANTE EN RESPONSIVE (MÓVIL / TABLET) CON TODAS LAS PESTAÑAS
         =================================================================== */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
        <button
          type="button"
          onClick={() => setMobileTabsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all duration-200 border border-indigo-400/30 cursor-pointer"
          style={{
            backgroundColor: 'var(--app-primary)',
          }}
          title="Abrir todas las pestañas de configuración"
          aria-label="Abrir pestañas de configuración"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Sliders className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-black pr-0.5">
            {subTabs.find((t) => t.id === activeTab)?.title || 'Pestañas'}
          </span>
          <ChevronRight className="w-4 h-4 text-white/80 shrink-0" />
        </button>
      </div>

      {/* ===================================================================
          HOJA / MODAL DE PESTAÑAS DESPLEGABLE EN RESPONSIVE
         =================================================================== */}
      {mobileTabsOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          {/* Backdrop clickeable para cerrar */}
          <div
            className="flex-1"
            onClick={() => setMobileTabsOpen(false)}
          />

          <div
            className="w-full max-w-lg mx-auto rounded-t-3xl border-t border-x p-5 pb-8 space-y-4 shadow-2xl max-h-[85vh] flex flex-col transition-colors duration-200"
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }}
          >
            {/* Header del Bottom Sheet */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Pestañas de Configuración
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Selecciona una sección para ver o editar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileTabsOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista con todas las opciones de pestañas */}
            <div className="overflow-y-auto space-y-2 pr-1 -mr-1 flex-1 py-1">
              {subTabs.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileTabsOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer ${
                      active
                        ? 'border shadow-xs'
                        : 'border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200'
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: 'color-mix(in srgb, var(--app-primary) 12%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--app-primary) 30%, transparent)',
                            color: 'var(--app-primary)',
                          }
                        : {}
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-extrabold truncate"
                            style={active ? { color: 'var(--app-primary)' } : {}}
                          >
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    {active ? (
                      <Check className="w-5 h-5 shrink-0 ml-1 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pie informativo rápido */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <span>Agencia: <strong className="text-slate-700 dark:text-slate-300">{tenant.name}</strong></span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">● Configuración Activa</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          BOTÓN FLOTANTE DE GUARDAR CAMBIOS DE CONFIGURACIÓN (1 CLIC SEGURO)
         =================================================================== */}
      {['identity', 'appearance', 'dialogs', 'company'].includes(activeTab) && (
        <div className="fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <button
            type="button"
            disabled={savingCust || savingCompany || savingUserTheme}
            onClick={handleSaveFloatingSettings}
            className="group relative flex items-center gap-2.5 px-5 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold text-white shadow-2xl transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none hover:shadow-indigo-500/25"
            style={{
              backgroundColor: 'var(--app-primary)',
              boxShadow: '0 12px 30px -4px color-mix(in srgb, var(--app-primary) 55%, transparent)',
            }}
          >
            {savingCust || savingCompany || savingUserTheme ? (
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Save className="w-4 h-4 transition-transform group-hover:scale-110 shrink-0" />
            )}
            <span>
              {savingCust || savingCompany || savingUserTheme
                ? 'Guardando...'
                : 'Guardar Configuración'}
            </span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider backdrop-blur-xs">
              {activeTab === 'identity'
                ? 'Logos'
                : activeTab === 'company'
                ? 'Empresa'
                : activeTab === 'appearance'
                ? 'Tema'
                : 'Diálogos'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
