import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Paperclip,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Calendar,
  Star,
  Check,
  ExternalLink,
  ShieldCheck,
  Send,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  WorkspaceForm,
  FormField,
  FormSubmissionFile,
} from '../../shared/types';

interface PublicFormViewProps {
  slug: string;
}

export const PublicFormView: React.FC<PublicFormViewProps> = ({ slug }) => {
  const [form, setForm] = useState<WorkspaceForm | null>(null);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de navegación
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Datos recopilados
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<FormSubmissionFile[]>([]);
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchForm();
  }, [slug]);

  const fetchForm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/forms/${slug}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Formulario no encontrado o no disponible');
      }
      const data = await res.json();
      setForm(data.form);
      setTenantInfo(data.tenant);

      // Si no tiene pantalla de bienvenida, iniciar directamente
      if (!data.form.settings?.welcomeScreen?.enabled) {
        setWelcomeDismissed(true);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el formulario');
    } finally {
      setLoading(false);
    }
  };

  // Manejo de subida de archivos
  const handleFileUpload = async (field: FormField, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxFileSizeMb = field.maxFileSizeMb || 25;
    const maxFilesCount = field.maxFilesCount || 3;

    const existingForField = uploadedFiles.filter((f) => f.fieldId === field.id);
    if (existingForField.length + files.length > maxFilesCount) {
      alert(`Solo puedes subir hasta un máximo de ${maxFilesCount} archivos para este campo.`);
      return;
    }

    setUploadingFieldId(field.id);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > maxFileSizeMb * 1024 * 1024) {
          alert(`El archivo "${file.name}" supera el límite de ${maxFileSizeMb}MB.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/public/forms/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Error en la subida del archivo');
        const fileData = await res.json();

        setUploadedFiles((prev) => [
          ...prev,
          {
            fieldId: field.id,
            fileName: fileData.fileName || file.name,
            fileUrl: fileData.url,
            fileSize: fileData.fileSize || file.size,
            mimeType: fileData.mimeType || file.type,
          },
        ]);
      }
    } catch {
      alert('Error al subir uno o más archivos. Por favor intenta de nuevo.');
    } finally {
      setUploadingFieldId(null);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (fileUrl: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.fileUrl !== fileUrl));
  };

  // Determinar los pasos si es multipaso
  // Si hay secciones, dividimos los campos por secciones. Si no, mostramos bloques de 2-3 preguntas.
  const getSteps = () => {
    if (!form || !form.settings.isMultiStep) return [];

    const steps: Array<{ title: string; description?: string; fields: FormField[] }> = [];
    let currentSectionTitle = 'Información General';
    let currentSectionDesc = '';
    let currentStepFields: FormField[] = [];

    form.fields.forEach((field) => {
      if (field.type === 'section') {
        if (currentStepFields.length > 0) {
          steps.push({
            title: currentSectionTitle,
            description: currentSectionDesc,
            fields: currentStepFields,
          });
          currentStepFields = [];
        }
        currentSectionTitle = field.label || 'Siguiente Paso';
        currentSectionDesc = field.description || '';
      } else {
        currentStepFields.push(field);
      }
    });

    if (currentStepFields.length > 0) {
      steps.push({
        title: currentSectionTitle,
        description: currentSectionDesc,
        fields: currentStepFields,
      });
    }

    return steps.length > 0
      ? steps
      : [{ title: form.title, description: form.description, fields: form.fields }];
  };

  const steps = getSteps();
  const isMultiStep = !!form?.settings.isMultiStep && steps.length > 1;

  // Validación de campos
  const validateFields = (fieldsToValidate: FormField[]) => {
    const errors: Record<string, string> = {};

    if (form?.settings.collectClientName && !clientName.trim()) {
      errors['__clientName'] = 'Por favor ingresa tu nombre.';
    }

    if (form?.settings.collectClientEmail) {
      if (!clientEmail.trim()) {
        errors['__clientEmail'] = 'Por favor ingresa tu correo electrónico.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
        errors['__clientEmail'] = 'Por favor ingresa un correo electrónico válido.';
      }
    }

    fieldsToValidate.forEach((f) => {
      if (f.required && f.type !== 'section') {
        const val = answers[f.id];
        if (f.type === 'file') {
          const hasFiles = uploadedFiles.some((file) => file.fieldId === f.id);
          if (!hasFiles) errors[f.id] = 'Este campo requiere que adjuntes al menos un archivo.';
        } else if (f.type === 'checkbox') {
          if (!Array.isArray(val) || val.length === 0) {
            errors[f.id] = 'Por favor selecciona al menos una opción.';
          }
        } else if (val === undefined || val === null || String(val).trim() === '') {
          errors[f.id] = 'Esta pregunta es obligatoria.';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Manejo de envío
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form) return;

    const allFields = form.fields.filter((f) => f.type !== 'section');
    if (!validateFields(allFields)) {
      // Desplazarse al primer error
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/forms/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: clientName.trim() || undefined,
          clientEmail: clientEmail.trim() || undefined,
          answers,
          files: uploadedFiles,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al enviar tus respuestas');
      }

      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      alert(err.message || 'Error al enviar el formulario. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (!form) return;
    const currentFields = steps[currentStep]?.fields || [];
    if (!validateFields(currentFields)) {
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Pantallas de Carga y Error
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
          Cargando formulario...
        </p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Formulario No Disponible
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {error || 'El formulario que intentas visualizar no existe, ha expirado o está en modo borrador.'}
          </p>
        </div>
      </div>
    );
  }

  const primaryColor = form.customization.primaryColor || '#6366f1';
  const logoUrl = form.customization.logoUrl || tenantInfo?.logoUrl;
  const agencyName = tenantInfo?.name || 'Agencia Roma';

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        form.customization.themeMode === 'dark'
          ? 'dark bg-slate-950 text-white'
          : 'bg-slate-50 text-slate-900'
      }`}
      style={{
        fontFamily:
          form.customization.fontFamily === 'serif'
            ? 'Georgia, serif'
            : form.customization.fontFamily === 'mono'
            ? 'ui-monospace, monospace'
            : 'inherit',
      }}
    >
      {/* Fondo con patrón según configuración */}
      <div
        className={`min-h-screen w-full flex flex-col justify-between ${
          form.customization.bgPattern === 'dots'
            ? 'bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]'
            : form.customization.bgPattern === 'grid'
            ? 'bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] [background-size:24px_24px]'
            : ''
        }`}
      >
        <div className="w-full flex-1 flex flex-col items-center">
          {/* Contenedor Principal Adaptable */}
          <div className="w-full max-w-2xl px-3 sm:px-6 py-6 sm:py-10">
            {/* Tarjeta Contenedora del Formulario */}
            <div
              className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden transition-all duration-300 ${
                form.customization.borderRadius || 'rounded-3xl'
              }`}
            >
              {/* 1. Portada Banner */}
              {form.customization.coverImage && (
                <div className="relative h-36 sm:h-52 w-full overflow-hidden bg-slate-900">
                  <img
                    src={form.customization.coverImage}
                    alt="Portada del Formulario"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
              )}

              {/* Barra de Progreso en modo Multipaso */}
              {isMultiStep && !isSubmitted && welcomeDismissed && (
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${((currentStep + 1) / steps.length) * 100}%`,
                      backgroundColor: primaryColor,
                    }}
                  />
                </div>
              )}

              {/* 2. Cuerpo del Formulario */}
              <div className="p-5 sm:p-8 space-y-6">
                {/* Logo si existe */}
                {logoUrl && (
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg p-2 overflow-hidden flex items-center justify-center ${
                      form.customization.coverImage ? '-mt-12 sm:-mt-16 relative z-10' : 'mb-3'
                    }`}
                  >
                    <img
                      src={logoUrl}
                      alt={agencyName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* CASO A: Pantalla de Bienvenida */}
                {form.settings.welcomeScreen.enabled && !welcomeDismissed && !isSubmitted ? (
                  <div className="py-6 sm:py-12 text-center space-y-4 animate-fadeIn">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                      {form.settings.welcomeScreen.title}
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                      {form.settings.welcomeScreen.description}
                    </p>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => setWelcomeDismissed(true)}
                        className="px-8 py-3.5 rounded-2xl text-sm sm:text-base font-black text-white transition shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 cursor-pointer"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {form.settings.welcomeScreen.buttonText || 'Comenzar'}
                      </button>
                    </div>
                  </div>
                ) : isSubmitted ? (
                  /* CASO B: Pantalla de Envío Exitoso */
                  <div className="py-8 sm:py-16 text-center space-y-4 animate-fadeIn">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800 shadow-md">
                      <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      {form.settings.thankYouScreen.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                      {form.settings.thankYouScreen.message}
                    </p>
                    {form.settings.thankYouScreen.buttonUrl && (
                      <div className="pt-4">
                        <a
                          href={form.settings.thankYouScreen.buttonUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-black text-white shadow-md transition hover:scale-105"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <span>{form.settings.thankYouScreen.buttonText || 'Continuar'}</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  /* CASO C: Formulario de Preguntas */
                  <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
                    {/* Encabezado */}
                    <div>
                      {isMultiStep && (
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                          <span>
                            Paso {currentStep + 1} de {steps.length}
                          </span>
                          <span className="font-mono">
                            {Math.round(((currentStep + 1) / steps.length) * 100)}%
                          </span>
                        </div>
                      )}

                      <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                        {isMultiStep ? steps[currentStep]?.title || form.title : form.title}
                      </h1>

                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        {isMultiStep
                          ? steps[currentStep]?.description || form.description
                          : form.description}
                      </p>
                    </div>

                    {/* Paso 0 / Primer Paso: Datos de Contacto (si están configurados) */}
                    {(!isMultiStep || currentStep === 0) &&
                      (form.settings.collectClientName || form.settings.collectClientEmail) && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Tus Datos de Contacto
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {form.settings.collectClientName && (
                              <div>
                                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                                  Nombre Completo <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={clientName}
                                  onChange={(e) => {
                                    setClientName(e.target.value);
                                    if (validationErrors['__clientName']) {
                                      setValidationErrors((prev) => ({ ...prev, __clientName: '' }));
                                    }
                                  }}
                                  placeholder="Ej. Roberto Gómez"
                                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    validationErrors['__clientName']
                                      ? 'border-rose-500'
                                      : 'border-slate-200 dark:border-slate-800'
                                  }`}
                                />
                                {validationErrors['__clientName'] && (
                                  <span className="text-[10px] text-rose-500 font-bold mt-1 block">
                                    {validationErrors['__clientName']}
                                  </span>
                                )}
                              </div>
                            )}

                            {form.settings.collectClientEmail && (
                              <div>
                                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                                  Correo Electrónico <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="email"
                                  value={clientEmail}
                                  onChange={(e) => {
                                    setClientEmail(e.target.value);
                                    if (validationErrors['__clientEmail']) {
                                      setValidationErrors((prev) => ({ ...prev, __clientEmail: '' }));
                                    }
                                  }}
                                  placeholder="roberto@empresa.com"
                                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    validationErrors['__clientEmail']
                                      ? 'border-rose-500'
                                      : 'border-slate-200 dark:border-slate-800'
                                  }`}
                                />
                                {validationErrors['__clientEmail'] && (
                                  <span className="text-[10px] text-rose-500 font-bold mt-1 block">
                                    {validationErrors['__clientEmail']}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Lista de Campos del Paso Actual */}
                    <div className="space-y-5">
                      {(isMultiStep ? steps[currentStep]?.fields || [] : form.fields).map((field) => {
                        const hasError = !!validationErrors[field.id];

                        if (field.type === 'section') {
                          return (
                            <div
                              key={field.id}
                              className="pt-6 pb-2 border-t border-slate-200 dark:border-slate-800"
                            >
                              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                                {field.label}
                              </h3>
                              {field.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                  {field.description}
                                </p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={field.id}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 space-y-2 ${
                              hasError
                                ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20'
                                : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs'
                            }`}
                          >
                            <label className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block leading-snug">
                              {field.label}{' '}
                              {field.required && <span className="text-rose-500 font-bold">*</span>}
                            </label>

                            {field.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                {field.description}
                              </p>
                            )}

                            {/* 1. TEXTO CORTO */}
                            {field.type === 'text' && (
                              <input
                                type="text"
                                value={answers[field.id] || ''}
                                onChange={(e) => {
                                  setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }));
                                  if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                }}
                                placeholder={field.placeholder || 'Escribe tu respuesta...'}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            )}

                            {/* 2. PÁRRAFO */}
                            {field.type === 'paragraph' && (
                              <textarea
                                rows={4}
                                value={answers[field.id] || ''}
                                onChange={(e) => {
                                  setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }));
                                  if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                }}
                                placeholder={field.placeholder || 'Escribe con el mayor detalle posible...'}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            )}

                            {/* 3. OPCIONES (RADIO) */}
                            {field.type === 'radio' && (
                              <div className="space-y-2 pt-1">
                                {(field.options || []).map((opt, i) => {
                                  const isSelected = answers[field.id] === opt;
                                  return (
                                    <label
                                      key={i}
                                      onClick={() => {
                                        setAnswers((prev) => ({ ...prev, [field.id]: opt }));
                                        if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                      }}
                                      className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                                        isSelected
                                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-white font-bold ring-1 ring-indigo-500'
                                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={field.id}
                                        checked={isSelected}
                                        onChange={() => {}}
                                        className="w-4 h-4 text-indigo-600"
                                      />
                                      <span className="text-xs sm:text-sm">{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {/* 4. CASILLAS (CHECKBOX) */}
                            {field.type === 'checkbox' && (
                              <div className="space-y-2 pt-1">
                                {(field.options || []).map((opt, i) => {
                                  const currentArr = Array.isArray(answers[field.id])
                                    ? answers[field.id]
                                    : [];
                                  const isChecked = currentArr.includes(opt);
                                  return (
                                    <label
                                      key={i}
                                      onClick={() => {
                                        const next = isChecked
                                          ? currentArr.filter((x: string) => x !== opt)
                                          : [...currentArr, opt];
                                        setAnswers((prev) => ({ ...prev, [field.id]: next }));
                                        if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                      }}
                                      className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
                                        isChecked
                                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-white font-bold ring-1 ring-indigo-500'
                                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}}
                                        className="w-4 h-4 rounded text-indigo-600"
                                      />
                                      <span className="text-xs sm:text-sm">{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}

                            {/* 5. DESPLEGABLE (SELECT) */}
                            {field.type === 'select' && (
                              <select
                                value={answers[field.id] || ''}
                                onChange={(e) => {
                                  setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }));
                                  if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                }}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-xs sm:text-sm font-medium"
                              >
                                <option value="">Selecciona una opción...</option>
                                {(field.options || []).map((opt, i) => (
                                  <option key={i} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}

                            {/* 6. SUBIDA DE ARCHIVOS */}
                            {field.type === 'file' && (
                              <div className="space-y-3 pt-1">
                                {uploadedFiles.filter((f) => f.fieldId === field.id).length > 0 && (
                                  <div className="space-y-2">
                                    {uploadedFiles
                                      .filter((f) => f.fieldId === field.id)
                                      .map((file, fIdx) => (
                                        <div
                                          key={fIdx}
                                          className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 flex items-center justify-between gap-3 text-xs"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <Paperclip className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                            <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                                              {file.fileName}
                                            </span>
                                            {file.fileSize && (
                                              <span className="text-[10px] text-slate-400 shrink-0">
                                                ({(file.fileSize / (1024 * 1024)).toFixed(1)} MB)
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveFile(file.fileUrl)}
                                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                  </div>
                                )}

                                {uploadedFiles.filter((f) => f.fieldId === field.id).length <
                                  (field.maxFilesCount || 3) && (
                                  <label
                                    className={`p-4 sm:p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${
                                      uploadingFieldId === field.id
                                        ? 'border-indigo-500 bg-indigo-50/40'
                                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-950/40'
                                    }`}
                                  >
                                    {uploadingFieldId === field.id ? (
                                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Subiendo archivo...</span>
                                      </div>
                                    ) : (
                                      <>
                                        <UploadCloud className="w-7 h-7 text-indigo-500 mb-1" />
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                          Toca o arrastra tus archivos aquí
                                        </span>
                                        <span className="text-[10px] text-slate-400 mt-0.5">
                                          Hasta {field.maxFilesCount || 3} archivos (máx. {field.maxFileSizeMb || 25}MB cada uno)
                                        </span>
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      disabled={uploadingFieldId === field.id}
                                      multiple={(field.maxFilesCount || 3) > 1}
                                      onChange={(e) => handleFileUpload(field, e)}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                              </div>
                            )}

                            {/* 7. FECHA */}
                            {field.type === 'date' && (
                              <input
                                type="date"
                                value={answers[field.id] || ''}
                                onChange={(e) => {
                                  setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }));
                                  if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                }}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-xs sm:text-sm text-slate-900 dark:text-white"
                              />
                            )}

                            {/* 8. ESCALA */}
                            {field.type === 'scale' && (
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>{field.scaleMinLabel || '1 (Bajo)'}</span>
                                  <span>{field.scaleMaxLabel || `${field.scaleMax || 5} (Excelente)`}</span>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2 justify-between">
                                  {Array.from({ length: field.scaleMax || 5 }, (_, i) => i + 1).map((num) => {
                                    const isSelected = answers[field.id] === num;
                                    return (
                                      <button
                                        key={num}
                                        type="button"
                                        onClick={() => {
                                          setAnswers((prev) => ({ ...prev, [field.id]: num }));
                                          if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                        }}
                                        className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer border ${
                                          isSelected
                                            ? 'text-white border-transparent shadow-md'
                                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                                        }`}
                                        style={isSelected ? { backgroundColor: primaryColor } : {}}
                                      >
                                        {num}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 9. RANGO */}
                            {field.type === 'range' && (
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono text-slate-400">
                                    {field.rangeMin ?? 0} {field.rangeUnit || ''}
                                  </span>
                                  <span
                                    className="text-sm font-black font-mono"
                                    style={{ color: primaryColor }}
                                  >
                                    {answers[field.id] ?? field.defaultValue ?? 50} {field.rangeUnit || ''}
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
                                  value={answers[field.id] ?? field.defaultValue ?? 50}
                                  onChange={(e) => {
                                    setAnswers((prev) => ({ ...prev, [field.id]: Number(e.target.value) }));
                                    if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                  }}
                                  className="w-full cursor-pointer"
                                  style={{ accentColor: primaryColor }}
                                />
                              </div>
                            )}

                            {/* 10. COLOR */}
                            {field.type === 'color' && (
                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                {(field.options || ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#0f172a']).map((c) => {
                                  const isSelected = answers[field.id] === c;
                                  return (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => {
                                        setAnswers((prev) => ({ ...prev, [field.id]: c }));
                                        if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                      }}
                                      className={`w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer shadow-xs ${
                                        isSelected
                                          ? 'ring-2 ring-indigo-500 scale-110'
                                          : 'border-slate-300 dark:border-slate-700'
                                      }`}
                                      style={{ backgroundColor: c }}
                                    >
                                      {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                                    </button>
                                  );
                                })}
                                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                                  <input
                                    type="color"
                                    value={answers[field.id] || primaryColor}
                                    onChange={(e) => {
                                      setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }));
                                      if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                    }}
                                    className="w-9 h-9 rounded-xl cursor-pointer p-0.5 bg-transparent"
                                  />
                                </div>
                              </div>
                            )}

                            {/* 11. CARDS VISUALES */}
                            {field.type === 'cards' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {(field.cardOptions || []).map((card) => {
                                  const isSelected = answers[field.id] === card.id;
                                  return (
                                    <div
                                      key={card.id}
                                      onClick={() => {
                                        setAnswers((prev) => ({ ...prev, [field.id]: card.id }));
                                        if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                      }}
                                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center gap-3.5 ${
                                        isSelected
                                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                      }`}
                                    >
                                      {card.imageUrl && (
                                        <img
                                          src={card.imageUrl}
                                          alt={card.title}
                                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                                        />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                                          {card.title}
                                        </span>
                                        {card.description && (
                                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block line-clamp-2 mt-0.5">
                                            {card.description}
                                          </span>
                                        )}
                                      </div>
                                      {isSelected && (
                                        <div
                                          className="w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0"
                                          style={{ backgroundColor: primaryColor }}
                                        >
                                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* 12. COMPARATIVAS */}
                            {field.type === 'comparative' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {(field.comparativeOptions || []).map((comp) => {
                                  const isSelected = answers[field.id] === comp.id;
                                  return (
                                    <div
                                      key={comp.id}
                                      onClick={() => {
                                        setAnswers((prev) => ({ ...prev, [field.id]: comp.id }));
                                        if (hasError) setValidationErrors((prev) => ({ ...prev, [field.id]: '' }));
                                      }}
                                      className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 relative ${
                                        isSelected
                                          ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30'
                                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                      }`}
                                    >
                                      {comp.isPopular && (
                                        <span
                                          className="absolute -top-2.5 right-3 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-sm"
                                          style={{ backgroundColor: primaryColor }}
                                        >
                                          Popular
                                        </span>
                                      )}
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                          {comp.title}
                                        </span>
                                        {comp.price && (
                                          <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                                            {comp.price}
                                          </span>
                                        )}
                                      </div>
                                      {comp.tagline && (
                                        <p className="text-[11px] text-slate-400">{comp.tagline}</p>
                                      )}
                                      <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        {(comp.features || []).map((f, fi) => (
                                          <li key={fi} className="flex items-center gap-2">
                                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span>{f}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Mensaje de Error de Validación */}
                            {hasError && (
                              <p className="text-[11px] text-rose-500 font-bold flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>{validationErrors[field.id]}</span>
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Botones de Navegación / Envío */}
                    <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                      {isMultiStep && currentStep > 0 ? (
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Anterior</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      {isMultiStep && currentStep < steps.length - 1 ? (
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="px-7 py-3 rounded-2xl text-xs sm:text-sm font-black text-white shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-100"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <span>Siguiente</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-black text-white shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-100 disabled:opacity-60"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Enviando respuestas...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>Enviar Formulario</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </div>

              {/* 3. Footer Oficial de la Agencia */}
              {form.settings.showAgencyLogo && (
                <div className="py-4 px-6 bg-slate-50/70 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Desarrollado con {agencyName}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
