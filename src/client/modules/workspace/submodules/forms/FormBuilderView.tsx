import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Globe,
  Eye,
  Settings,
  Palette,
  Layout,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Check,
  Share2,
  Sparkles,
  Smartphone,
  Monitor,
  Upload,
  Image as ImageIcon,
  Type,
  AlignLeft,
  CheckSquare,
  List,
  UploadCloud,
  Calendar,
  Star,
  Sliders,
  Paintbrush,
  CreditCard,
  Columns,
  Layers,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import {
  WorkspaceForm,
  FormField,
  FormFieldType,
  FormStatus,
  FormCardOption,
  FormComparativeOption,
} from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface FormBuilderViewProps {
  initialForm?: WorkspaceForm | null;
  onBack: () => void;
  onSaved: (form: WorkspaceForm) => void;
}

const FIELD_TYPE_OPTIONS: Array<{
  type: FormFieldType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  {
    type: 'text',
    label: 'Texto Corto',
    description: 'Nombres, títulos o respuestas breves de una línea',
    icon: Type,
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
  },
  {
    type: 'paragraph',
    label: 'Párrafo',
    description: 'Respuestas largas, briefs, observaciones o descripciones',
    icon: AlignLeft,
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
  },
  {
    type: 'radio',
    label: 'Opciones',
    description: 'Selección única entre varias alternativas',
    icon: List,
    color: 'text-pink-600 bg-pink-50 dark:bg-pink-950/60 border-pink-200 dark:border-pink-800',
  },
  {
    type: 'checkbox',
    label: 'Casillas',
    description: 'Selección múltiple de varias opciones simultáneas',
    icon: CheckSquare,
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
  },
  {
    type: 'select',
    label: 'Desplegable',
    description: 'Menú desplegable tipo selector para listas largas',
    icon: ChevronDown,
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
  },
  {
    type: 'file',
    label: 'Subir Archivos',
    description: 'Carga de imágenes, PDFs o documentos con límite de peso y cantidad',
    icon: UploadCloud,
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800',
  },
  {
    type: 'date',
    label: 'Fecha',
    description: 'Selector de calendario para fechas clave o plazos',
    icon: Calendar,
    color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800',
  },
  {
    type: 'scale',
    label: 'Escalas / Calificación',
    description: 'Escala numérica o de satisfacción del 1 al 5 o 1 al 10',
    icon: Star,
    color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/60 border-yellow-200 dark:border-yellow-800',
  },
  {
    type: 'range',
    label: 'Rango / Slider',
    description: 'Deslizador de porcentaje o valor numérico continuo',
    icon: Sliders,
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800',
  },
  {
    type: 'color',
    label: 'Colores',
    description: 'Selector de color hexadecimal o paleta cromática',
    icon: Paintbrush,
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
  },
  {
    type: 'cards',
    label: 'Cards Visuales',
    description: 'Tarjetas de selección visual con imágenes y texto explicativo',
    icon: CreditCard,
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
  },
  {
    type: 'comparative',
    label: 'Comparativas',
    description: 'Tarjetas comparativas lado a lado con características y precios',
    icon: Columns,
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800',
  },
  {
    type: 'section',
    label: 'Sección / Separador',
    description: 'Título y descripción para agrupar campos o crear pasos',
    icon: Layers,
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
  },
];

const PRESET_COVERS = [
  {
    label: 'Gradiente Roma',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Estudio Creativo',
    url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Malla Abstracta',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Minimalismo Elegante',
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Neón Tecnológico',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Atardecer Cálido',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
  },
];

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#0f172a', // Slate Dark
];

export const FormBuilderView: React.FC<FormBuilderViewProps> = ({
  initialForm,
  onBack,
  onSaved,
}) => {
  const { tenant, toast, apiFetch } = useApp();

  const [activeTab, setActiveTab] = useState<'fields' | 'design' | 'settings' | 'preview'>('fields');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Estado del Formulario
  const [form, setForm] = useState<WorkspaceForm>(() => {
    if (initialForm) {
      return {
        ...initialForm,
        fields: initialForm.fields || [],
        customization: {
          coverImage: initialForm.customization?.coverImage || '',
          logoUrl: initialForm.customization?.logoUrl || '',
          primaryColor: initialForm.customization?.primaryColor || '#6366f1',
          themeMode: initialForm.customization?.themeMode || 'light',
          borderRadius: initialForm.customization?.borderRadius || 'rounded-2xl',
          fontFamily: initialForm.customization?.fontFamily || 'sans',
          bgPattern: initialForm.customization?.bgPattern || 'dots',
        },
        settings: {
          collectClientName: initialForm.settings?.collectClientName ?? true,
          collectClientEmail: initialForm.settings?.collectClientEmail ?? true,
          showAgencyLogo: initialForm.settings?.showAgencyLogo ?? true,
          isMultiStep: !!initialForm.settings?.isMultiStep,
          welcomeScreen: {
            enabled: initialForm.settings?.welcomeScreen?.enabled ?? false,
            title: initialForm.settings?.welcomeScreen?.title || 'Bienvenido a nuestro formulario',
            description: initialForm.settings?.welcomeScreen?.description || 'Por favor completa la información a continuación.',
            buttonText: initialForm.settings?.welcomeScreen?.buttonText || 'Comenzar',
          },
          thankYouScreen: {
            title: initialForm.settings?.thankYouScreen?.title || '¡Muchas gracias por tu respuesta!',
            message: initialForm.settings?.thankYouScreen?.message || 'Tus datos han sido registrados con éxito.',
            buttonText: initialForm.settings?.thankYouScreen?.buttonText || '',
            buttonUrl: initialForm.settings?.thankYouScreen?.buttonUrl || '',
          },
        },
      };
    }

    const defaultSlug = `brief-${Date.now().toString(36)}`;
    return {
      id: '',
      tenantId: tenant?.id || '',
      title: 'Nuevo Formulario de Agencia',
      description: 'Por favor responde las siguientes preguntas para iniciar tu requerimiento.',
      slug: defaultSlug,
      status: 'draft',
      fields: [
        {
          id: `f-${Date.now()}-1`,
          type: 'text',
          label: '¿Cuál es el nombre de tu empresa o marca?',
          placeholder: 'Ej. Roma Studio',
          required: true,
        },
        {
          id: `f-${Date.now()}-2`,
          type: 'paragraph',
          label: 'Describe brevemente el objetivo de tu proyecto',
          placeholder: 'Cuéntanos qué deseas lograr, público objetivo y expectativas...',
          required: true,
        },
      ],
      customization: {
        coverImage: PRESET_COVERS[0].url,
        logoUrl: tenant?.customization?.logoUrl || '',
        primaryColor: '#6366f1',
        themeMode: 'light',
        borderRadius: 'rounded-2xl',
        fontFamily: 'sans',
        bgPattern: 'dots',
      },
      settings: {
        collectClientName: true,
        collectClientEmail: true,
        showAgencyLogo: true,
        isMultiStep: false,
        welcomeScreen: {
          enabled: false,
          title: 'Bienvenido a nuestro formulario de requerimientos',
          description: 'Esta información nos permitirá armar tu propuesta a la medida de tus objetivos.',
          buttonText: 'Empezar ahora',
        },
        thankYouScreen: {
          title: '¡Respuestas enviadas con éxito!',
          message: 'Hemos recibido toda tu información y el equipo comenzará a revisarla de inmediato.',
          buttonText: '',
          buttonUrl: '',
        },
      },
      viewsCount: 0,
      submissionsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Estado para campo activo/expandido en el editor de campos
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(
    form.fields[0]?.id || null
  );

  // Estado de simulación de respuestas en vista previa
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});
  const [previewWelcomeDismissed, setPreviewWelcomeDismissed] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const [previewSubmitted, setPreviewSubmitted] = useState(false);

  // Subir portada o logo
  const handleUploadAsset = async (e: React.ChangeEvent<HTMLInputElement>, target: 'cover' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/workspace/forms/upload-asset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('roma_saas_token') || ''}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Error al subir archivo');
      const data = await res.json();
      if (target === 'cover') {
        setForm((prev) => ({
          ...prev,
          customization: { ...prev.customization, coverImage: data.url },
        }));
        toast('Portada cargada con éxito', 'success');
      } else {
        setForm((prev) => ({
          ...prev,
          customization: { ...prev.customization, logoUrl: data.url },
        }));
        toast('Logo cargado con éxito', 'success');
      }
    } catch {
      toast('Error al subir la imagen', 'error');
    }
  };

  // Gestión de Campos
  const handleAddField = (type: FormFieldType) => {
    const newFieldId = `f-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    let initialProps: Partial<FormField> = {
      label: `Pregunta de ${FIELD_TYPE_OPTIONS.find((f) => f.type === type)?.label || 'campo'}`,
      required: false,
    };

    if (type === 'radio' || type === 'checkbox' || type === 'select') {
      initialProps.options = ['Opción 1', 'Opción 2', 'Opción 3'];
    } else if (type === 'file') {
      initialProps.maxFileSizeMb = 25;
      initialProps.maxFilesCount = 3;
      initialProps.allowedFileTypes = ['*/*'];
      initialProps.description = 'Puedes subir hasta 3 archivos de máx. 25MB cada uno.';
    } else if (type === 'scale') {
      initialProps.scaleMin = 1;
      initialProps.scaleMax = 5;
      initialProps.scaleMinLabel = 'Bajo';
      initialProps.scaleMaxLabel = 'Excelente';
    } else if (type === 'range') {
      initialProps.rangeMin = 0;
      initialProps.rangeMax = 100;
      initialProps.rangeStep = 5;
      initialProps.rangeUnit = '%';
      initialProps.defaultValue = 50;
    } else if (type === 'color') {
      initialProps.options = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#0f172a'];
    } else if (type === 'cards') {
      initialProps.cardOptions = [
        {
          id: 'card-1',
          title: 'Opción Visual A',
          description: 'Enfoque moderno y minimalista',
          imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
        },
        {
          id: 'card-2',
          title: 'Opción Visual B',
          description: 'Enfoque vibrante y dinámico',
          imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80',
        },
      ];
    } else if (type === 'comparative') {
      initialProps.comparativeOptions = [
        {
          id: 'comp-1',
          title: 'Plan Estándar',
          price: 'S/ 1,200/mes',
          features: ['12 Posts mensuales', 'Campañas Meta Ads', 'Reporte quincenal'],
        },
        {
          id: 'comp-2',
          title: 'Plan Pro Growth',
          tagline: 'Más popular',
          price: 'S/ 2,400/mes',
          isPopular: true,
          features: ['24 Posts + 4 Reels', 'Estrategia integral', 'Sesión de foto/video', 'Soporte 24/7'],
        },
      ];
    } else if (type === 'section') {
      initialProps.label = 'Nueva Sección';
      initialProps.description = 'Descripción o instrucciones para esta parte del formulario.';
    }

    const newField: FormField = {
      id: newFieldId,
      type,
      ...initialProps,
    } as FormField;

    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));

    setExpandedFieldId(newFieldId);
    toast(`Campo "${FIELD_TYPE_OPTIONS.find((f) => f.type === type)?.label}" añadido`, 'info');
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  };

  const handleDuplicateField = (field: FormField) => {
    const copy: FormField = {
      ...JSON.parse(JSON.stringify(field)),
      id: `f-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      label: `${field.label} (Copia)`,
    };
    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, copy],
    }));
    setExpandedFieldId(copy.id);
    toast('Campo duplicado', 'info');
  };

  const handleDeleteField = (id: string) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
    }));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= form.fields.length) return;

    const updated = [...form.fields];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);

    setForm((prev) => ({ ...prev, fields: updated }));
  };

  // Guardar en Backend
  const handleSave = async (publishStatus?: FormStatus) => {
    if (!form.title.trim()) {
      toast('Por favor asigna un título al formulario', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<WorkspaceForm> = {
        ...form,
        status: publishStatus || form.status,
      };

      let resultForm: WorkspaceForm;
      if (form.id) {
        const res = await apiFetch<{ form: WorkspaceForm }>(`/api/workspace/forms/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        resultForm = res.form;
        toast('Formulario actualizado correctamente', 'success');
      } else {
        const res = await apiFetch<{ form: WorkspaceForm }>('/api/workspace/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        resultForm = res.form;
        toast('Formulario creado correctamente', 'success');
      }

      setForm(resultForm);
      onSaved(resultForm);
    } catch (err: any) {
      toast(err.message || 'Error al guardar formulario', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const publicUrl = `${window.location.origin}/f/${form.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    toast('Enlace público amigable copiado al portapapeles', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-16">
      {/* 1. BARRA SUPERIOR DE ACCIONES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Volver a lista de formularios"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Título del Formulario..."
                className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white bg-transparent border-b border-dashed border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition truncate w-full"
              />
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                  form.status === 'published'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                }`}
              >
                {form.status === 'published' ? 'Publicado' : 'Borrador'}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
              <span className="truncate">/f/{form.slug}</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-sans font-semibold cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              activeTab === 'preview'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vista Previa</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(form.status === 'published' ? 'draft' : 'published')}
            disabled={isSaving}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              form.status === 'published'
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{form.status === 'published' ? 'Pausar Publicación' : 'Publicar Ahora'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      </div>

      {/* 2. PESTAÑAS DEL CONSTRUCTOR */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('fields')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'fields'
              ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Campos & Contenido</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px]">
            {form.fields.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('design')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'design'
              ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Diseño, Portada & Logo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'settings'
              ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configuración & Flujo</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'preview'
              ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Simulador en Vivo</span>
        </button>
      </div>

      {/* 3. CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}

      {/* =================================================================== */}
      {/* PESTAÑA 1: CAMPOS & CONTENIDO */}
      {/* =================================================================== */}
      {activeTab === 'fields' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Paleta Lateral de Tipos de Campo (En móvil arriba, en desktop columna izquierda) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs space-y-3 sticky top-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Añadir Pregunta o Campo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Haz clic en cualquier tipo para agregarlo al formulario:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {FIELD_TYPE_OPTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleAddField(item.type)}
                    className="w-full p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition text-left cursor-pointer group flex items-start gap-2.5 shadow-2xs"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${item.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {item.label}
                        </span>
                        <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:scale-125 transition-transform" />
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Campos Creados (Columna Central) */}
          <div className="lg:col-span-8 space-y-3">
            {form.fields.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Layout className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Formulario en blanco
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Selecciona cualquier tipo de campo de la paleta izquierda para comenzar a estructurar tu formulario.
                </p>
              </div>
            ) : (
              form.fields.map((field, index) => {
                const isExpanded = expandedFieldId === field.id;
                const fieldConfig = FIELD_TYPE_OPTIONS.find((f) => f.type === field.type);
                const Icon = fieldConfig?.icon || Type;

                return (
                  <div
                    key={field.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl transition-all duration-200 shadow-2xs overflow-hidden ${
                      isExpanded
                        ? 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/10'
                        : 'border-slate-200/90 dark:border-slate-800'
                    }`}
                  >
                    {/* Barra de cabecera del campo */}
                    <div
                      onClick={() => setExpandedFieldId(isExpanded ? null : field.id)}
                      className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            fieldConfig?.color || 'text-slate-600 bg-slate-100'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-400">
                              #{index + 1}
                            </span>
                            <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              {field.label || 'Campo sin título'}
                            </span>
                            {field.required && (
                              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-800">
                                Requerido
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            Tipo: {fieldConfig?.label}
                          </span>
                        </div>
                      </div>

                      {/* Botones de acción rápida en cabecera */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveField(index, 'up')}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                          title="Subir"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={index === form.fields.length - 1}
                          onClick={() => handleMoveField(index, 'down')}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                          title="Bajar"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateField(field)}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                          title="Duplicar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteField(field.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Editor de Propiedades del Campo */}
                    {isExpanded && (
                      <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-3.5 animate-fadeIn">
                        {/* Etiqueta / Pregunta */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Pregunta o Enunciado
                          </label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                            placeholder="Escribe la pregunta aquí..."
                          />
                        </div>

                        {/* Descripción o ayuda */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Instrucciones o Texto de Ayuda (Opcional)
                          </label>
                          <input
                            type="text"
                            value={field.description || ''}
                            onChange={(e) => handleUpdateField(field.id, { description: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ej. Indica la respuesta más precisa posible..."
                          />
                        </div>

                        {/* Placeholder para texto/párrafo */}
                        {(field.type === 'text' || field.type === 'paragraph') && (
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                              Texto de Ejemplo (Placeholder)
                            </label>
                            <input
                              type="text"
                              value={field.placeholder || ''}
                              onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="Ej. Escribe aquí..."
                            />
                          </div>
                        )}

                        {/* Opciones para Radio, Checkbox, Select */}
                        {(field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Opciones de Selección
                            </label>
                            {(field.options || []).map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const nextOpts = [...(field.options || [])];
                                    nextOpts[optIdx] = e.target.value;
                                    handleUpdateField(field.id, { options: nextOpts });
                                  }}
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder={`Opción ${optIdx + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextOpts = (field.options || []).filter((_, i) => i !== optIdx);
                                    handleUpdateField(field.id, { options: nextOpts });
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const nextOpts = [...(field.options || []), `Nueva opción ${(field.options || []).length + 1}`];
                                handleUpdateField(field.id, { options: nextOpts });
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Agregar opción</span>
                            </button>
                          </div>
                        )}

                        {/* Configuración específica de SUBIDA DE ARCHIVOS */}
                        {field.type === 'file' && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                            <span className="text-[11px] font-black uppercase text-cyan-600 dark:text-cyan-400 block">
                              Parámetros de Carga de Archivos
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                  Tamaño Máximo por Archivo
                                </label>
                                <select
                                  value={field.maxFileSizeMb || 25}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, { maxFileSizeMb: Number(e.target.value) })
                                  }
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                                >
                                  <option value={5}>5 MB</option>
                                  <option value={10}>10 MB</option>
                                  <option value={25}>25 MB (Recomendado)</option>
                                  <option value={50}>50 MB</option>
                                  <option value={100}>100 MB</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                  Cantidad Máxima de Archivos
                                </label>
                                <select
                                  value={field.maxFilesCount || 3}
                                  onChange={(e) =>
                                    handleUpdateField(field.id, { maxFilesCount: Number(e.target.value) })
                                  }
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                                >
                                  <option value={1}>1 archivo solo</option>
                                  <option value={3}>Hasta 3 archivos</option>
                                  <option value={5}>Hasta 5 archivos</option>
                                  <option value={10}>Hasta 10 archivos</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Configuración de ESCALAS */}
                        {field.type === 'scale' && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                            <span className="text-[11px] font-black uppercase text-yellow-600 dark:text-yellow-400 block">
                              Parámetros de Escala
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                  Rango de la Escala
                                </label>
                                <select
                                  value={field.scaleMax || 5}
                                  onChange={(e) => handleUpdateField(field.id, { scaleMax: Number(e.target.value) })}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                                >
                                  <option value={5}>1 a 5 estrellas / puntos</option>
                                  <option value={10}>1 a 10 puntos (NPS)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                  Etiqueta Mínima
                                </label>
                                <input
                                  type="text"
                                  value={field.scaleMinLabel || ''}
                                  onChange={(e) => handleUpdateField(field.id, { scaleMinLabel: e.target.value })}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                                  placeholder="Ej. Poco probable"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                  Etiqueta Máxima
                                </label>
                                <input
                                  type="text"
                                  value={field.scaleMaxLabel || ''}
                                  onChange={(e) => handleUpdateField(field.id, { scaleMaxLabel: e.target.value })}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                                  placeholder="Ej. Muy probable"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Configuración de RANGO / SLIDER */}
                        {field.type === 'range' && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                            <span className="text-[11px] font-black uppercase text-teal-600 dark:text-teal-400 block">
                              Parámetros de Deslizador
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">Mínimo</label>
                                <input
                                  type="number"
                                  value={field.rangeMin ?? 0}
                                  onChange={(e) => handleUpdateField(field.id, { rangeMin: Number(e.target.value) })}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">Máximo</label>
                                <input
                                  type="number"
                                  value={field.rangeMax ?? 100}
                                  onChange={(e) => handleUpdateField(field.id, { rangeMax: Number(e.target.value) })}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">Paso (Step)</label>
                                <input
                                  type="number"
                                  value={field.rangeStep ?? 1}
                                  onChange={(e) => handleUpdateField(field.id, { rangeStep: Number(e.target.value) })}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">Unidad</label>
                                <input
                                  type="text"
                                  value={field.rangeUnit || ''}
                                  onChange={(e) => handleUpdateField(field.id, { rangeUnit: e.target.value })}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                                  placeholder="Ej. %, USD, pts"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Configuración de CARDS VISUALES */}
                        {field.type === 'cards' && (
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">
                              Tarjetas Visuales Configuradas
                            </label>
                            <div className="space-y-2">
                              {(field.cardOptions || []).map((card, cIdx) => (
                                <div
                                  key={card.id || cIdx}
                                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3"
                                >
                                  <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
                                    {card.imageUrl ? (
                                      <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon className="w-6 h-6 m-auto text-slate-400 mt-4" />
                                    )}
                                  </div>
                                  <div className="flex-1 space-y-1.5 w-full">
                                    <input
                                      type="text"
                                      value={card.title}
                                      onChange={(e) => {
                                        const next = [...(field.cardOptions || [])];
                                        next[cIdx] = { ...card, title: e.target.value };
                                        handleUpdateField(field.id, { cardOptions: next });
                                      }}
                                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold"
                                      placeholder="Título de la tarjeta..."
                                    />
                                    <input
                                      type="text"
                                      value={card.description || ''}
                                      onChange={(e) => {
                                        const next = [...(field.cardOptions || [])];
                                        next[cIdx] = { ...card, description: e.target.value };
                                        handleUpdateField(field.id, { cardOptions: next });
                                      }}
                                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]"
                                      placeholder="Descripción corta..."
                                    />
                                    <input
                                      type="text"
                                      value={card.imageUrl || ''}
                                      onChange={(e) => {
                                        const next = [...(field.cardOptions || [])];
                                        next[cIdx] = { ...card, imageUrl: e.target.value };
                                        handleUpdateField(field.id, { cardOptions: next });
                                      }}
                                      className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-400"
                                      placeholder="URL de la imagen..."
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = (field.cardOptions || []).filter((_, i) => i !== cIdx);
                                      handleUpdateField(field.id, { cardOptions: next });
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const next = [
                                  ...(field.cardOptions || []),
                                  {
                                    id: `card-${Date.now()}`,
                                    title: `Tarjeta ${(field.cardOptions || []).length + 1}`,
                                    description: 'Detalle visual de la alternativa',
                                    imageUrl: PRESET_COVERS[0].url,
                                  },
                                ];
                                handleUpdateField(field.id, { cardOptions: next });
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Agregar tarjeta visual</span>
                            </button>
                          </div>
                        )}

                        {/* Configuración de COMPARATIVAS */}
                        {field.type === 'comparative' && (
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-wider text-orange-600 block">
                              Planes o Alternativas Comparativas
                            </label>
                            <div className="space-y-3">
                              {(field.comparativeOptions || []).map((comp, compIdx) => (
                                <div
                                  key={comp.id || compIdx}
                                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <input
                                      type="text"
                                      value={comp.title}
                                      onChange={(e) => {
                                        const next = [...(field.comparativeOptions || [])];
                                        next[compIdx] = { ...comp, title: e.target.value };
                                        handleUpdateField(field.id, { comparativeOptions: next });
                                      }}
                                      className="font-black text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 w-1/2"
                                      placeholder="Título del Plan..."
                                    />
                                    <input
                                      type="text"
                                      value={comp.price || ''}
                                      onChange={(e) => {
                                        const next = [...(field.comparativeOptions || [])];
                                        next[compIdx] = { ...comp, price: e.target.value };
                                        handleUpdateField(field.id, { comparativeOptions: next });
                                      }}
                                      className="font-bold text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 w-1/3 text-emerald-600"
                                      placeholder="Precio (ej. S/ 990)"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = (field.comparativeOptions || []).filter((_, i) => i !== compIdx);
                                        handleUpdateField(field.id, { comparativeOptions: next });
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={comp.tagline || ''}
                                    onChange={(e) => {
                                      const next = [...(field.comparativeOptions || [])];
                                      next[compIdx] = { ...comp, tagline: e.target.value };
                                      handleUpdateField(field.id, { comparativeOptions: next });
                                    }}
                                    className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 w-full"
                                    placeholder="Etiqueta distintiva (ej. Recomendado / Más pedido)..."
                                  />
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const next = [
                                  ...(field.comparativeOptions || []),
                                  {
                                    id: `comp-${Date.now()}`,
                                    title: `Opción ${(field.comparativeOptions || []).length + 1}`,
                                    price: 'S/ 0.00',
                                    features: ['Característica A', 'Característica B'],
                                  },
                                ];
                                handleUpdateField(field.id, { comparativeOptions: next });
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 transition flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Agregar opción comparativa</span>
                            </button>
                          </div>
                        )}

                        {/* Toggle Requerido (no aplica a section) */}
                        {field.type !== 'section' && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Respuesta obligatoria
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateField(field.id, { required: !field.required })}
                              className={`w-10 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                                field.required ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                              }`}
                            >
                              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PESTAÑA 2: DISEÑO, PORTADA & LOGO */}
      {/* =================================================================== */}
      {activeTab === 'design' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-xs space-y-6 max-w-4xl mx-auto">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Identidad Visual & Estilos del Formulario
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Personaliza la portada, logo del cliente o de la campaña, y los colores principales.
            </p>
          </div>

          {/* 1. Portada del Formulario */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              1. Imagen de Portada (Banner Superior)
            </label>

            {form.customization.coverImage ? (
              <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group">
                <img
                  src={form.customization.coverImage}
                  alt="Portada del Formulario"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-white/90 text-slate-900 font-bold text-xs cursor-pointer hover:bg-white transition flex items-center gap-1.5 shadow-md">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Cambiar Portada</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadAsset(e, 'cover')}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        customization: { ...prev.customization, coverImage: '' },
                      }))
                    }
                    className="px-3 py-1.5 rounded-xl bg-rose-600/90 text-white font-bold text-xs hover:bg-rose-600 transition flex items-center gap-1.5 shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Quitar</span>
                  </button>
                </div>
              </div>
            ) : (
              <label className="h-36 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-950/40">
                <UploadCloud className="w-8 h-8 text-slate-400 mb-1" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Subir Portada Personalizada
                </span>
                <span className="text-[10px] text-slate-400">PNG, JPG, WEBP (Recomendado 1200x400)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadAsset(e, 'cover')}
                  className="hidden"
                />
              </label>
            )}

            {/* Presets de Portada */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-2">
                O selecciona una portada prediseñada:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {PRESET_COVERS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        customization: { ...prev.customization, coverImage: preset.url },
                      }))
                    }
                    className="relative h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:ring-2 hover:ring-indigo-500 transition cursor-pointer group"
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5 truncate px-1">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Logo / Avatar del Formulario */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              2. Logotipo o Avatar del Formulario / Cliente
            </label>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                {form.customization.logoUrl ? (
                  <img
                    src={form.customization.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <ImageIcon className="w-7 h-7 text-slate-400" />
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1.5 shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadAsset(e, 'logo')}
                      className="hidden"
                    />
                  </label>
                  {form.customization.logoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          customization: { ...prev.customization, logoUrl: '' },
                        }))
                      }
                      className="px-3 py-1.5 rounded-xl text-rose-600 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={form.customization.logoUrl || ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customization: { ...prev.customization, logoUrl: e.target.value },
                    }))
                  }
                  placeholder="O pega la URL de la imagen del logo..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>
          </div>

          {/* 3. Colores y Estilos Visuales */}
          <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              3. Color Primario & Acentos
            </label>

            <div className="flex items-center gap-3 flex-wrap">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      customization: { ...prev.customization, primaryColor: color },
                    }))
                  }
                  className={`w-9 h-9 rounded-xl transition cursor-pointer border flex items-center justify-center shadow-xs ${
                    form.customization.primaryColor === color
                      ? 'ring-2 ring-indigo-500 scale-110'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {form.customization.primaryColor === color && (
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  )}
                </button>
              ))}

              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <input
                  type="color"
                  value={form.customization.primaryColor || '#6366f1'}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customization: { ...prev.customization, primaryColor: e.target.value },
                    }))
                  }
                  className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                />
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                  {form.customization.primaryColor}
                </span>
              </div>
            </div>

            {/* Tema Claro / Oscuro */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Tema Visual
                </label>
                <select
                  value={form.customization.themeMode || 'light'}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customization: { ...prev.customization, themeMode: e.target.value as any },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                >
                  <option value="light">Claro Moderno</option>
                  <option value="dark">Oscuro Profesional</option>
                  <option value="auto">Automático según Sistema</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Bordes de Tarjetas
                </label>
                <select
                  value={form.customization.borderRadius || 'rounded-2xl'}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customization: { ...prev.customization, borderRadius: e.target.value as any },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                >
                  <option value="rounded-none">Rectos (Modernist)</option>
                  <option value="rounded-xl">Suaves (rounded-xl)</option>
                  <option value="rounded-2xl">Modernos (rounded-2xl)</option>
                  <option value="rounded-3xl">Pill / Orgánicos (rounded-3xl)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Patrón de Fondo
                </label>
                <select
                  value={form.customization.bgPattern || 'dots'}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customization: { ...prev.customization, bgPattern: e.target.value as any },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                >
                  <option value="none">Limpio / Sólido</option>
                  <option value="dots">Puntos Sutiles</option>
                  <option value="grid">Cuadrícula Técnica</option>
                  <option value="gradient">Gradiente Suave</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PESTAÑA 3: CONFIGURACIÓN & FLUJO */}
      {/* =================================================================== */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-xs space-y-6 max-w-3xl mx-auto">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Configuraciones y Opciones de Recopilación
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Controla las pantallas de bienvenida, modo multipaso, y qué información recolectar del cliente.
            </p>
          </div>

          {/* 1. Enlace Corto Amigable */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
              Enlace Corto Amigable (Slug)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500 shrink-0">
                {window.location.host}/f/
              </span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
                  }))
                }
                className="flex-1 px-3 py-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                placeholder="slug-del-formulario"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* 2. Pantalla de Bienvenida */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white block">
                  Pantalla de Bienvenida (Welcome Screen)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Muestra una carátula interactiva antes de desplegar las preguntas.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      welcomeScreen: {
                        ...prev.settings.welcomeScreen,
                        enabled: !prev.settings.welcomeScreen.enabled,
                      },
                    },
                  }))
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  form.settings.welcomeScreen.enabled ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {form.settings.welcomeScreen.enabled && (
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800 animate-fadeIn">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Título de Bienvenida
                  </label>
                  <input
                    type="text"
                    value={form.settings.welcomeScreen.title}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          welcomeScreen: {
                            ...prev.settings.welcomeScreen,
                            title: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Descripción o Indicaciones
                  </label>
                  <textarea
                    rows={2}
                    value={form.settings.welcomeScreen.description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          welcomeScreen: {
                            ...prev.settings.welcomeScreen,
                            description: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Texto del Botón de Inicio
                  </label>
                  <input
                    type="text"
                    value={form.settings.welcomeScreen.buttonText}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          welcomeScreen: {
                            ...prev.settings.welcomeScreen,
                            buttonText: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                    placeholder="Ej. Comenzar"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Opciones de Recopilación de Datos del Cliente */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              Datos de Contacto del Cliente
            </span>

            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Solicitar Nombre del Cliente
                </span>
                <span className="text-[11px] text-slate-400">
                  Agrega automáticamente un campo para identificar quién responde.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      collectClientName: !prev.settings.collectClientName,
                    },
                  }))
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  form.settings.collectClientName ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Solicitar Correo Electrónico
                </span>
                <span className="text-[11px] text-slate-400">
                  Permite contactar al cliente o enviarle copia de sus respuestas.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      collectClientEmail: !prev.settings.collectClientEmail,
                    },
                  }))
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  form.settings.collectClientEmail ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Mostrar Logotipo de la Agencia Roma
                </span>
                <span className="text-[11px] text-slate-400">
                  Muestra la insignia oficial "Desarrollado con Agencia Roma" en el pie.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      showAgencyLogo: !prev.settings.showAgencyLogo,
                    },
                  }))
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  form.settings.showAgencyLogo ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          {/* 4. Formulario Multipaso (Step-by-step) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-900 dark:text-white block">
                  Formulario Multipaso (Paso a Paso)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Divide las preguntas en tarjetas interactivas secuenciales con barra de progreso superior.
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      isMultiStep: !prev.settings.isMultiStep,
                    },
                  }))
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  form.settings.isMultiStep ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          {/* 5. Pantalla de Agradecimiento / Envío Exitoso */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
              Pantalla de Agradecimiento / Finalización
            </span>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">
                Título de Éxito
              </label>
              <input
                type="text"
                value={form.settings.thankYouScreen.title}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      thankYouScreen: {
                        ...prev.settings.thankYouScreen,
                        title: e.target.value,
                      },
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">
                Mensaje de Confirmación
              </label>
              <textarea
                rows={2}
                value={form.settings.thankYouScreen.message}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      thankYouScreen: {
                        ...prev.settings.thankYouScreen,
                        message: e.target.value,
                      },
                    },
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PESTAÑA 4: SIMULADOR EN VIVO (PREVIEW) */}
      {/* =================================================================== */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          {/* Selector de Dispositivo */}
          <div className="flex items-center justify-center gap-2">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl flex items-center gap-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  previewDevice === 'desktop'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Vista Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Vista Móvil</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setPreviewAnswers({});
                setPreviewWelcomeDismissed(false);
                setPreviewStep(0);
                setPreviewSubmitted(false);
                toast('Simulador reiniciado', 'info');
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Reiniciar Simulador
            </button>
          </div>

          {/* Marco del Simulador */}
          <div className="flex justify-center p-2 sm:p-4 bg-slate-100 dark:bg-slate-950/80 rounded-3xl min-h-[600px]">
            <div
              className={`transition-all duration-300 overflow-hidden bg-white dark:bg-slate-900 shadow-xl ${
                previewDevice === 'mobile'
                  ? 'w-full max-w-[390px] rounded-[40px] border-[8px] border-slate-800 dark:border-slate-700 min-h-[700px] flex flex-col'
                  : 'w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 min-h-[600px] flex flex-col'
              }`}
            >
              {/* Notch / Speaker en modo móvil */}
              {previewDevice === 'mobile' && (
                <div className="w-full h-6 bg-slate-800 dark:bg-slate-700 flex items-center justify-center">
                  <div className="w-20 h-3.5 bg-slate-950 rounded-full" />
                </div>
              )}

              {/* Contenido interactivo simulado */}
              <div className="flex-1 overflow-y-auto">
                {/* Portada */}
                {form.customization.coverImage && (
                  <div className="relative h-32 sm:h-44 w-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                    <img
                      src={form.customization.coverImage}
                      alt="Portada"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4 sm:p-6 space-y-6">
                  {/* Logo si existe */}
                  {form.customization.logoUrl && (
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md p-1 -mt-10 sm:-mt-12 relative z-10 flex items-center justify-center">
                      <img
                        src={form.customization.logoUrl}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* Estado 1: Pantalla de Bienvenida (si está activa y no se ha iniciado) */}
                  {form.settings.welcomeScreen.enabled && !previewWelcomeDismissed && !previewSubmitted ? (
                    <div className="py-6 sm:py-10 text-center space-y-4 animate-fadeIn">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {form.settings.welcomeScreen.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        {form.settings.welcomeScreen.description}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPreviewWelcomeDismissed(true)}
                        className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-black text-white transition shadow-md cursor-pointer hover:opacity-95"
                        style={{ backgroundColor: form.customization.primaryColor || '#6366f1' }}
                      >
                        {form.settings.welcomeScreen.buttonText || 'Comenzar'}
                      </button>
                    </div>
                  ) : previewSubmitted ? (
                    /* Estado 2: Pantalla de Agradecimiento / Éxito */
                    <div className="py-8 sm:py-12 text-center space-y-4 animate-fadeIn">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800 shadow-sm">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                        {form.settings.thankYouScreen.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {form.settings.thankYouScreen.message}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewAnswers({});
                          setPreviewSubmitted(false);
                          setPreviewWelcomeDismissed(false);
                          setPreviewStep(0);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        Llenar de nuevo
                      </button>
                    </div>
                  ) : (
                    /* Estado 3: Preguntas del Formulario */
                    <div className="space-y-6">
                      {/* Cabecera del Formulario */}
                      <div>
                        <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                          {form.title}
                        </h1>
                        {form.description && (
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {form.description}
                          </p>
                        )}
                      </div>

                      {/* Recopilación de Nombre y Correo */}
                      {(form.settings.collectClientName || form.settings.collectClientEmail) && (
                        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Información de Contacto
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {form.settings.collectClientName && (
                              <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Tu Nombre Completo <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={previewAnswers['__clientName'] || ''}
                                  onChange={(e) =>
                                    setPreviewAnswers((prev) => ({ ...prev, __clientName: e.target.value }))
                                  }
                                  placeholder="Ej. Roberto Gómez"
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                                />
                              </div>
                            )}
                            {form.settings.collectClientEmail && (
                              <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                  Correo Electrónico <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="email"
                                  value={previewAnswers['__clientEmail'] || ''}
                                  onChange={(e) =>
                                    setPreviewAnswers((prev) => ({ ...prev, __clientEmail: e.target.value }))
                                  }
                                  placeholder="roberto@empresa.com"
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Renderizado de Preguntas */}
                      <div className="space-y-5">
                        {form.fields.map((field) => (
                          <div
                            key={field.id}
                            className={`space-y-1.5 ${
                              field.type === 'section'
                                ? 'pt-4 border-t border-slate-200/80 dark:border-slate-800'
                                : 'p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-2xs'
                            }`}
                          >
                            <label className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center justify-between gap-2">
                              <span>
                                {field.label}{' '}
                                {field.required && <span className="text-rose-500 font-bold">*</span>}
                              </span>
                            </label>

                            {field.description && (
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {field.description}
                              </p>
                            )}

                            {/* TEXTO */}
                            {field.type === 'text' && (
                              <input
                                type="text"
                                value={previewAnswers[field.id] || ''}
                                onChange={(e) =>
                                  setPreviewAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                                }
                                placeholder={field.placeholder || 'Escribe tu respuesta...'}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            )}

                            {/* PÁRRAFO */}
                            {field.type === 'paragraph' && (
                              <textarea
                                rows={3}
                                value={previewAnswers[field.id] || ''}
                                onChange={(e) =>
                                  setPreviewAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                                }
                                placeholder={field.placeholder || 'Escribe en detalle...'}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              />
                            )}

                            {/* RADIO */}
                            {field.type === 'radio' && (
                              <div className="space-y-1.5 pt-1">
                                {(field.options || []).map((opt, i) => (
                                  <label
                                    key={i}
                                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border border-slate-200/60 dark:border-slate-800"
                                  >
                                    <input
                                      type="radio"
                                      name={field.id}
                                      checked={previewAnswers[field.id] === opt}
                                      onChange={() =>
                                        setPreviewAnswers((prev) => ({ ...prev, [field.id]: opt }))
                                      }
                                      className="w-4 h-4 text-indigo-600"
                                    />
                                    <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                                      {opt}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}

                            {/* CHECKBOX */}
                            {field.type === 'checkbox' && (
                              <div className="space-y-1.5 pt-1">
                                {(field.options || []).map((opt, i) => {
                                  const currentArr = Array.isArray(previewAnswers[field.id])
                                    ? previewAnswers[field.id]
                                    : [];
                                  const isChecked = currentArr.includes(opt);
                                  return (
                                    <label
                                      key={i}
                                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer border border-slate-200/60 dark:border-slate-800"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          const next = isChecked
                                            ? currentArr.filter((x: string) => x !== opt)
                                            : [...currentArr, opt];
                                          setPreviewAnswers((prev) => ({ ...prev, [field.id]: next }));
                                        }}
                                        className="w-4 h-4 rounded text-indigo-600"
                                      />
                                      <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                                        {opt}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {/* SELECT */}
                            {field.type === 'select' && (
                              <select
                                value={previewAnswers[field.id] || ''}
                                onChange={(e) =>
                                  setPreviewAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-xs font-medium"
                              >
                                <option value="">Selecciona una opción...</option>
                                {(field.options || []).map((opt, i) => (
                                  <option key={i} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}

                            {/* SUBIDA DE ARCHIVOS */}
                            {field.type === 'file' && (
                              <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 text-center">
                                <UploadCloud className="w-7 h-7 text-indigo-500 mx-auto mb-1.5" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                  Cargar archivos (Hasta {field.maxFilesCount || 3} archivos, máx {field.maxFileSizeMb || 25}MB)
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  En la versión pública el cliente podrá adjuntar documentos e imágenes reales.
                                </span>
                              </div>
                            )}

                            {/* FECHA */}
                            {field.type === 'date' && (
                              <input
                                type="date"
                                value={previewAnswers[field.id] || ''}
                                onChange={(e) =>
                                  setPreviewAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                                }
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-xs"
                              />
                            )}

                            {/* ESCALA */}
                            {field.type === 'scale' && (
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>{field.scaleMinLabel || '1'}</span>
                                  <span>{field.scaleMaxLabel || String(field.scaleMax || 5)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 justify-between">
                                  {Array.from({ length: field.scaleMax || 5 }, (_, i) => i + 1).map((num) => (
                                    <button
                                      key={num}
                                      type="button"
                                      onClick={() =>
                                        setPreviewAnswers((prev) => ({ ...prev, [field.id]: num }))
                                      }
                                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                                        previewAnswers[field.id] === num
                                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* RANGO */}
                            {field.type === 'range' && (
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono text-slate-400">
                                    {field.rangeMin ?? 0} {field.rangeUnit || ''}
                                  </span>
                                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
                                    {previewAnswers[field.id] ?? field.defaultValue ?? 50} {field.rangeUnit || ''}
                                  </span>
                                  <span className="text-xs font-mono text-slate-400">
                                    {field.rangeMax ?? 100} {field.rangeUnit || ''}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={field.rangeMin ?? 0}
                                  max={field.rangeMax ?? 100}
                                  step={field.rangeStep ?? 1}
                                  value={previewAnswers[field.id] ?? field.defaultValue ?? 50}
                                  onChange={(e) =>
                                    setPreviewAnswers((prev) => ({
                                      ...prev,
                                      [field.id]: Number(e.target.value),
                                    }))
                                  }
                                  className="w-full accent-indigo-600 cursor-pointer"
                                />
                              </div>
                            )}

                            {/* COLOR */}
                            {field.type === 'color' && (
                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                {(field.options || COLOR_PRESETS).map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() =>
                                      setPreviewAnswers((prev) => ({ ...prev, [field.id]: color }))
                                    }
                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                                      previewAnswers[field.id] === color
                                        ? 'ring-2 ring-indigo-500 scale-110'
                                        : 'border-slate-300 dark:border-slate-700'
                                    }`}
                                    style={{ backgroundColor: color }}
                                  >
                                    {previewAnswers[field.id] === color && (
                                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* CARDS VISUALES */}
                            {field.type === 'cards' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                {(field.cardOptions || []).map((card) => {
                                  const isSelected = previewAnswers[field.id] === card.id;
                                  return (
                                    <div
                                      key={card.id}
                                      onClick={() =>
                                        setPreviewAnswers((prev) => ({ ...prev, [field.id]: card.id }))
                                      }
                                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 ${
                                        isSelected
                                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                      }`}
                                    >
                                      {card.imageUrl && (
                                        <img
                                          src={card.imageUrl}
                                          alt={card.title}
                                          className="w-12 h-12 rounded-lg object-cover"
                                        />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                          {card.title}
                                        </span>
                                        {card.description && (
                                          <span className="text-[10px] text-slate-400 block line-clamp-2">
                                            {card.description}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* COMPARATIVAS */}
                            {field.type === 'comparative' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {(field.comparativeOptions || []).map((comp) => {
                                  const isSelected = previewAnswers[field.id] === comp.id;
                                  return (
                                    <div
                                      key={comp.id}
                                      onClick={() =>
                                        setPreviewAnswers((prev) => ({ ...prev, [field.id]: comp.id }))
                                      }
                                      className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 relative ${
                                        isSelected
                                          ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                      }`}
                                    >
                                      {comp.isPopular && (
                                        <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-2xs">
                                          Popular
                                        </span>
                                      )}
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-slate-900 dark:text-white">
                                          {comp.title}
                                        </span>
                                        {comp.price && (
                                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                                            {comp.price}
                                          </span>
                                        )}
                                      </div>
                                      {comp.tagline && (
                                        <p className="text-[10px] text-slate-400">{comp.tagline}</p>
                                      )}
                                      <ul className="text-[10px] space-y-1 text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                                        {(comp.features || []).map((f, fi) => (
                                          <li key={fi} className="flex items-center gap-1.5">
                                            <Check className="w-3 h-3 text-indigo-500 shrink-0" />
                                            <span>{f}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Botón de Envío Simulado */}
                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewSubmitted(true);
                            toast('¡Respuestas simuladas enviadas con éxito!', 'success');
                          }}
                          className="w-full py-3 rounded-2xl text-xs sm:text-sm font-black text-white transition shadow-md cursor-pointer hover:opacity-95"
                          style={{ backgroundColor: form.customization.primaryColor || '#6366f1' }}
                        >
                          Enviar Formulario
                        </button>
                      </div>

                      {/* Footer de Agencia */}
                      {form.settings.showAgencyLogo && (
                        <div className="pt-4 pb-2 text-center border-t border-slate-100 dark:border-slate-800/80">
                          <span className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            <span>Desarrollado con Agencia Roma</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
