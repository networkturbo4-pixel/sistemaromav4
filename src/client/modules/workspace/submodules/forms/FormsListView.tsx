import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Trash2,
  Edit3,
  MoreVertical,
  Inbox,
  ArrowLeft,
  Share2,
  Calendar,
  Layers,
  Sparkles,
  Globe,
  Sliders,
  CheckCircle2,
  Clock,
  Send,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { WorkspaceForm } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';
import { FormSubmissionsModal } from './FormSubmissionsModal';

interface FormsListViewProps {
  forms: WorkspaceForm[];
  loading: boolean;
  onBackToHub: () => void;
  onOpenCreateForm: () => void;
  onOpenEditForm: (form: WorkspaceForm) => void;
  onDuplicateForm: (form: WorkspaceForm) => void;
  onDeleteForm: (form: WorkspaceForm) => void;
  onOpenPreview: (form: WorkspaceForm) => void;
}

export const FormsListView: React.FC<FormsListViewProps> = ({
  forms,
  loading,
  onBackToHub,
  onOpenCreateForm,
  onOpenEditForm,
  onDuplicateForm,
  onDeleteForm,
  onOpenPreview,
}) => {
  const { toast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal de respuestas
  const [submissionsModalForm, setSubmissionsModalForm] = useState<WorkspaceForm | null>(null);

  const handleCopyLink = (form: WorkspaceForm) => {
    const url = `${window.location.origin}/f/${form.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(form.id);
    toast('Enlace corto copiado al portapapeles', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredForms = forms.filter((f) => {
    const matchSearch =
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      f.slug.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;
    if (statusFilter === 'published') return f.status === 'published';
    if (statusFilter === 'draft') return f.status === 'draft';
    return true;
  });

  // Métricas rápidas
  const totalSubmissions = forms.reduce((acc, f) => acc + (f.submissionsCount || 0), 0);
  const totalViews = forms.reduce((acc, f) => acc + (f.viewsCount || 0), 0);
  const publishedCount = forms.filter((f) => f.status === 'published').length;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12">
      {/* 1. CABECERA PRINCIPAL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <button
                type="button"
                onClick={onBackToHub}
                className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Hub Workspace</span>
              </button>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Submódulo Operativo
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Formularios</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold">
                {forms.length}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              Crea briefs interactivos, formularios de captación, encuestas y cotizadores a medida
              para tus clientes con enlaces amigables y diseño moderno adaptable.
            </p>
          </div>

          {/* BOTÓN CREAR FORMULARIO EN BLANCO (Obviando explícitamente botón IA por requerimiento) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenCreateForm}
              className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-black bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-2 shadow-md cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Formulario en blanco</span>
            </button>
          </div>
        </div>

        {/* Mini Métricas Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Formularios Totales
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
              {forms.length}
            </span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Publicados Activos
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block">
              {publishedCount}
            </span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              Respuestas Recibidas
            </span>
            <span className="text-lg sm:text-xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5 block">
              {totalSubmissions}
            </span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/60">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
              Vistas Acumuladas
            </span>
            <span className="text-lg sm:text-xl font-black text-purple-700 dark:text-purple-300 mt-0.5 block">
              {totalViews}
            </span>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, descripción o enlace..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
        </div>

        {/* Filtros de estado */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos ({forms.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('published')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'published'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Publicados ({publishedCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              statusFilter === 'draft'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Borradores ({forms.length - publishedCount})
          </button>
        </div>
      </div>

      {/* 3. GRILLA DE CARDS DE FORMULARIOS */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Cargando tus formularios...</p>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {searchTerm ? 'No se encontraron formularios' : 'Comienza creando tu primer formulario'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
            {searchTerm
              ? 'Intenta con otros términos de búsqueda o cambia los filtros de estado.'
              : 'Configura preguntas, opciones, carga de archivos y comparte un enlace amigable con tus clientes.'}
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={onOpenCreateForm}
              className="px-5 py-2.5 rounded-2xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-2 mx-auto shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo Formulario en blanco</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredForms.map((item) => {
            const isCopied = copiedId === item.id;
            const publicLink = `${window.location.origin}/f/${item.slug}`;

            return (
              <div
                key={item.id}
                className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-600 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Portada Superior */}
                  <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950">
                    {item.customization.coverImage ? (
                      <img
                        src={item.customization.coverImage}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center opacity-80"
                        style={{
                          background: `linear-gradient(135deg, ${item.customization.primaryColor || '#6366f1'} 0%, #0f172a 100%)`,
                        }}
                      >
                        <FileText className="w-10 h-10 text-white/30" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Badge de Estado en portada */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                          item.status === 'published'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {item.status === 'published' ? (
                          <>
                            <Globe className="w-3 h-3" />
                            <span>Publicado</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>Borrador</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Logo Flotante */}
                    {item.customization.logoUrl && (
                      <div className="absolute -bottom-4 left-4 w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md p-1 overflow-hidden flex items-center justify-center">
                        <img
                          src={item.customization.logoUrl}
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className={`p-4 sm:p-5 ${item.customization.logoUrl ? 'pt-6' : 'pt-4'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 truncate max-w-[200px]">
                        /f/{item.slug}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description || 'Sin descripción detallada.'}
                    </p>

                    {/* Estadísticas de la Card */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                      <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                        <span className="text-[10px] text-slate-400 block font-bold">Campos</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {item.fields?.length || 0}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                        <span className="text-[10px] text-slate-400 block font-bold">Vistas</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {item.viewsCount || 0}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        <span className="text-[10px] text-indigo-400 block font-bold">Respuestas</span>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          {item.submissionsCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones Inferiores */}
                <div className="p-3 sm:p-4 pt-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSubmissionsModalForm(item)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800"
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      <span>Respuestas ({item.submissionsCount || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenPreview(item)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Vista Previa interactiva"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => window.open(publicLink, '_blank')}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Abrir formulario público en nueva pestaña"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(item)}
                      className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Enlace copiado' : 'Copiar enlace'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onDuplicateForm(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Duplicar formulario"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenEditForm(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                        title="Editar formulario"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteForm(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Eliminar formulario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE RESPUESTAS */}
      {submissionsModalForm && (
        <FormSubmissionsModal
          form={submissionsModalForm}
          isOpen={true}
          onClose={() => setSubmissionsModalForm(null)}
          onDeleteSubmission={() => {
            // Actualizar contador restando 1 localmente si se desea
          }}
        />
      )}
    </div>
  );
};
