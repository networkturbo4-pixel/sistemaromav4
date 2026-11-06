import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Search,
  Trash2,
  Calendar,
  User,
  Mail,
  FileText,
  Paperclip,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Inbox,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { WorkspaceForm, FormSubmission, FormField } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface FormSubmissionsModalProps {
  form: WorkspaceForm;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSubmission?: () => void;
}

export const FormSubmissionsModal: React.FC<FormSubmissionsModalProps> = ({
  form,
  isOpen,
  onClose,
  onDeleteSubmission,
}) => {
  const { apiFetch, toast, confirmAction } = useApp();
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSubmissions, setExpandedSubmissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && form?.id) {
      loadSubmissions();
    }
  }, [isOpen, form?.id]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ submissions: FormSubmission[] }>(
        `/api/workspace/forms/${form.id}/submissions`
      );
      setSubmissions(res.submissions || []);
      // Expandir la primera por defecto
      if (res.submissions?.length > 0) {
        setExpandedSubmissions({ [res.submissions[0].id]: true });
      }
    } catch {
      toast('Error al cargar las respuestas del formulario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedSubmissions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (sub: FormSubmission) => {
    const ok = await confirmAction({
      title: '¿Eliminar respuesta?',
      message: '¿Estás seguro de eliminar esta respuesta? Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/workspace/forms/submissions/${sub.id}`, { method: 'DELETE' });
      setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
      toast('Respuesta eliminada correctamente', 'success');
      onDeleteSubmission?.();
    } catch {
      toast('Error al eliminar la respuesta', 'error');
    }
  };

  const exportToCSV = () => {
    if (submissions.length === 0) {
      toast('No hay respuestas para exportar', 'info');
      return;
    }

    // Encabezados base
    const baseHeaders = ['ID', 'Fecha', 'Hora', 'Nombre del Cliente', 'Correo Electrónico'];
    // Encabezados de campos dinámicos
    const fieldHeaders = form.fields
      .filter((f) => f.type !== 'section')
      .map((f) => f.label || `Campo (${f.type})`);

    const headers = [...baseHeaders, ...fieldHeaders];

    const escapeCSV = (val: any): string => {
      if (val === undefined || val === null) return '""';
      if (typeof val === 'object') {
        if (Array.isArray(val)) {
          return `"${val.join('; ').replace(/"/g, '""')}"`;
        }
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const rows = submissions.map((sub) => {
      const dateObj = new Date(sub.submittedAt);
      const dateStr = dateObj.toLocaleDateString('es-ES');
      const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

      const baseRow = [
        escapeCSV(sub.id),
        escapeCSV(dateStr),
        escapeCSV(timeStr),
        escapeCSV(sub.clientName || 'Anónimo'),
        escapeCSV(sub.clientEmail || 'No proporcionado'),
      ];

      const fieldValues = form.fields
        .filter((f) => f.type !== 'section')
        .map((f) => {
          const val = sub.answers?.[f.id];
          if (f.type === 'file') {
            const files = sub.files?.filter((file) => file.fieldId === f.id) || [];
            return escapeCSV(files.map((file) => file.fileName).join(', '));
          }
          return escapeCSV(val);
        });

      return [...baseRow, ...fieldValues].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `respuestas_${form.slug}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast('Archivo CSV generado y descargado con éxito', 'success');
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = sub.clientName?.toLowerCase().includes(term);
    const emailMatch = sub.clientEmail?.toLowerCase().includes(term);
    const answersMatch = Object.values(sub.answers || {}).some((v) =>
      String(v).toLowerCase().includes(term)
    );
    return nameMatch || emailMatch || answersMatch;
  });

  const renderFieldValue = (field: FormField, sub: FormSubmission) => {
    const value = sub.answers?.[field.id];

    if (field.type === 'file') {
      const files = sub.files?.filter((f) => f.fieldId === field.id) || [];
      if (files.length === 0) {
        return <span className="text-slate-400 italic text-xs">Sin archivos adjuntos</span>;
      }
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          {files.map((file, idx) => (
            <a
              key={idx}
              href={file.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="truncate max-w-[180px]">{file.fileName}</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </a>
          ))}
        </div>
      );
    }

    if (field.type === 'color') {
      if (!value) return <span className="text-slate-400 italic text-xs">No respondido</span>;
      return (
        <div className="flex items-center gap-2 mt-1">
          <span
            className="w-6 h-6 rounded-lg border border-slate-300 dark:border-slate-700 shadow-2xs inline-block shrink-0"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
            {value}
          </span>
        </div>
      );
    }

    if (field.type === 'scale') {
      if (value === undefined || value === null) {
        return <span className="text-slate-400 italic text-xs">No respondido</span>;
      }
      return (
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-800 mt-1">
          <span>{value}</span>
          <span className="text-slate-400">/ {field.scaleMax || 5}</span>
          <span className="text-amber-500 ml-1">★</span>
        </div>
      );
    }

    if (field.type === 'range') {
      if (value === undefined || value === null) {
        return <span className="text-slate-400 italic text-xs">No respondido</span>;
      }
      return (
        <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs mt-1">
          {value} {field.rangeUnit || ''}
        </span>
      );
    }

    if (field.type === 'cards') {
      if (!value) return <span className="text-slate-400 italic text-xs">No respondido</span>;
      const card = field.cardOptions?.find((c) => c.id === value);
      return (
        <div className="flex items-center gap-2 mt-1 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          {card?.imageUrl && (
            <img
              src={card.imageUrl}
              alt={card.title}
              className="w-10 h-10 rounded-lg object-cover"
            />
          )}
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {card?.title || value}
            </p>
            {card?.description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {card.description}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (field.type === 'comparative') {
      if (!value) return <span className="text-slate-400 italic text-xs">No respondido</span>;
      const comp = field.comparativeOptions?.find((c) => c.id === value);
      return (
        <div className="mt-1 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
              {comp?.title || value}
            </span>
            {comp?.price && (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {comp.price}
              </span>
            )}
          </div>
          {comp?.tagline && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {comp.tagline}
            </p>
          )}
        </div>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-slate-400 italic text-xs">Ninguna opción seleccionada</span>;
      }
      return (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {value.map((v, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700"
            >
              {String(v)}
            </span>
          ))}
        </div>
      );
    }

    if (value === undefined || value === null || String(value).trim() === '') {
      return <span className="text-slate-400 italic text-xs">Sin respuesta</span>;
    }

    return (
      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap mt-0.5">
        {String(value)}
      </p>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                Respuestas: {form.title}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>{submissions.length} {submissions.length === 1 ? 'respuesta registrada' : 'respuestas registradas'}</span>
              <span>•</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                /f/{form.slug}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportToCSV}
              disabled={submissions.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Descargar respuestas en formato CSV para Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Buscador & Controles */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, correo o respuesta..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Contenido / Lista de Respuestas */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-slate-500 font-medium">Cargando respuestas...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-16 text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {searchTerm ? 'No hay coincidencias con la búsqueda' : 'Aún no hay respuestas'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {searchTerm
                  ? 'Intenta buscar con otros términos.'
                  : 'Comparte el enlace del formulario con tus clientes para comenzar a recolectar información.'}
              </p>
            </div>
          ) : (
            filteredSubmissions.map((sub, index) => {
              const isExpanded = !!expandedSubmissions[sub.id];
              const dateObj = new Date(sub.submittedAt);
              const dateFormatted = dateObj.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const timeFormatted = dateObj.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden transition-all duration-200"
                >
                  {/* Encabezado de la Respuesta */}
                  <div
                    onClick={() => toggleExpand(sub.id)}
                    className="p-3 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0 border border-indigo-200 dark:border-indigo-800">
                        #{filteredSubmissions.length - index}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {sub.clientName || 'Cliente Anónimo'}
                          </span>
                          {sub.clientEmail && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              <Mail className="w-3 h-3" />
                              {sub.clientEmail}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {dateFormatted}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeFormatted}
                          </span>
                          {sub.files && sub.files.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                {sub.files.length} {sub.files.length === 1 ? 'archivo' : 'archivos'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(sub);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Eliminar esta respuesta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="p-1 text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo expandido con todos los campos */}
                  {isExpanded && (
                    <div className="p-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30 space-y-4">
                      {/* Datos de contacto si existen */}
                      {(sub.clientName || sub.clientEmail) && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs">
                          {sub.clientName && (
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <User className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="font-bold">Cliente:</span>
                              <span>{sub.clientName}</span>
                            </div>
                          )}
                          {sub.clientEmail && (
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <Mail className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="font-bold">Email:</span>
                              <a
                                href={`mailto:${sub.clientEmail}`}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                {sub.clientEmail}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Lista de preguntas y respuestas */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {form.fields
                          .filter((f) => f.type !== 'section')
                          .map((field) => (
                            <div
                              key={field.id}
                              className={`p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 ${
                                field.type === 'paragraph' || field.type === 'cards' || field.type === 'comparative'
                                  ? 'sm:col-span-2'
                                  : ''
                              }`}
                            >
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                                {field.label || 'Campo sin etiqueta'}
                              </span>
                              {renderFieldValue(field, sub)}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
