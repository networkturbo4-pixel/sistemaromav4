import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Plus, Search, Lock, Unlock, Copy, ExternalLink, Edit2, Trash2,
  Check, LayoutTemplate, MessageSquare, CheckCircle2, AlertCircle, Clock,
  HardDrive, X, BarChart3, History
} from 'lucide-react';
import { BrandGuideline } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';
import { BrandGuidelineEditorModal } from './BrandGuidelineEditorModal';

interface BrandGuidelinesSubmoduleViewProps {
  onBackToHub?: () => void;
}

export const BrandGuidelinesSubmoduleView: React.FC<BrandGuidelinesSubmoduleViewProps> = ({
  onBackToHub,
}) => {
  const { toast, confirmAction, apiFetch } = useApp();
  const [guidelines, setGuidelines] = useState<BrandGuideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Estados Modal Edición, Comentarios y Heatmap/Rondas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuideline, setSelectedGuideline] = useState<BrandGuideline | null>(null);
  const [commentsGuideline, setCommentsGuideline] = useState<BrandGuideline | null>(null);
  const [analyticsGuideline, setAnalyticsGuideline] = useState<BrandGuideline | null>(null);

  const loadGuidelines = useCallback(async () => {
    try {
      setLoading(true);
      const query = search ? `?q=${encodeURIComponent(search)}` : '';
      const res = await apiFetch(`/api/workspace/brand-guidelines${query}`);
      if (res && res.success) {
        setGuidelines(res.guidelines || []);
      }
    } catch (err: any) {
      console.error('Error fetching brand guidelines:', err);
      toast('Error al cargar manuales de marca', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, apiFetch, toast]);

  useEffect(() => {
    loadGuidelines();
  }, [loadGuidelines]);

  const handleCopyLink = (token: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/brand/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast('Enlace público copiado al portapapeles', 'success');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleOpenPublicView = (token: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    window.open(`/brand/${token}`, '_blank');
  };

  const handleAdvanceRound = async (guideline: BrandGuideline, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/workspace/brand-guidelines/${guideline.id}/new-round`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (res && res.success) {
        toast(`Nueva versión creada: ${res.guideline?.round || 'Siguiente Ronda'} (Snapshot guardado)`, 'success');
        loadGuidelines();
      }
    } catch (err: any) {
      toast(err.message || 'Error al avanzar de ronda', 'error');
    }
  };

  const handleDelete = async (guideline: BrandGuideline, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirmAction({
      title: `Eliminar ${guideline.brandName}`,
      message: `¿Estás seguro de que deseas eliminar la presentación y manual de "${guideline.brandName}"? Esta acción no se puede deshacer y el enlace público dejará de funcionar.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      const res = await apiFetch(`/api/workspace/brand-guidelines/${guideline.id}`, {
        method: 'DELETE',
      });
      if (res && res.success) {
        setGuidelines((prev) => prev.filter((g) => g.id !== guideline.id));
        toast('Brand Guideline eliminado correctamente', 'success');
      }
    } catch (err: any) {
      toast(err.message || 'Error al eliminar Brand Guideline', 'error');
    }
  };

  const renderStatusBadge = (bg: BrandGuideline) => {
    if (bg.status === 'approved') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Aprobado</span>
        </span>
      );
    }
    if (bg.status === 'changes_requested') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          <span>Cambios Solicitados</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>En Revisión</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Cabecera del Submódulo */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-6 md:p-8 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {onBackToHub && (
              <button
                type="button"
                onClick={onBackToHub}
                className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
              >
                ← Hub
              </button>
            )}
            <span className="px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 inline-block">
              Identidad Visual &amp; Manuales de Marca
            </span>
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
              Estilo Editorial • Auto-Mockups • Probador de Fuentes • Aprobaciones
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            Manuales de Marca (Brand Guidelines)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Manuales interactivos 16:9 con auto-estampado en prendas y dispositivos, conversión HEX/RGB/CMYK, probador tipográfico en vivo, área de resguardo, comparador Antes/Después, aprobación con notificaciones y exportación PDF.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedGuideline(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Manual de Marca</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por marca, cliente o versión..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="text-xs font-mono text-zinc-400">
          {guidelines.length} {guidelines.length === 1 ? 'presentación' : 'presentaciones'}
        </div>
      </div>

      {/* Grid de Brand Guidelines */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-zinc-400 border-t-zinc-900 dark:border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-zinc-400">Cargando presentaciones...</p>
        </div>
      ) : guidelines.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-white">
              No hay Brand Guidelines creados aún
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
              Crea tu primera presentación con acabado minimalista para compartir tus propuestas de
              marca con clientes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedGuideline(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Primer Brand Guideline</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-4.5">
          {guidelines.map((bg) => {
            const commentsCount = (bg.comments || []).length;
            return (
              <div
                key={bg.id}
                onClick={() => handleOpenPublicView(bg.publicToken)}
                className="group bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-3xl p-5 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden"
              >
                {/* Vista Previa de la Portada en Miniatura */}
                <div className="aspect-[16/9] w-full rounded-2xl bg-[#111111] text-white p-5 flex flex-col justify-between mb-4 border border-zinc-800 shadow-inner group-hover:scale-[1.01] transition-transform">
                  <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                    <span>Manual de Marca</span>
                    <span>{bg.round === 'Round 1' ? 'Ronda 1' : bg.round || 'Ronda 1'}</span>
                  </div>

                  <div className="my-auto flex items-center gap-3">
                    {bg.logoPrimaryUrl ? (
                      <img src={bg.logoPrimaryUrl} alt={bg.brandName} className="max-h-10 object-contain" />
                    ) : (
                      <div className="w-7 h-7 bg-white relative shrink-0">
                        <div className="w-3 h-3 bg-white absolute -top-1.5 -left-1.5" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-lg font-bold tracking-tight leading-tight line-clamp-1">
                        {bg.brandName}
                      </h4>
                      <span className="text-[11px] font-mono text-zinc-400">
                        &#123;{bg.clientName}&#125;
                      </span>
                    </div>
                  </div>

                  {/* Muestras de color en la tarjeta */}
                  <div className="flex items-center gap-1 pt-2 border-t border-zinc-800">
                    {(bg.colors || []).slice(0, 6).map((c, i) => (
                      <span
                        key={i}
                        className="w-3.5 h-3.5 rounded-full border border-white/20 inline-block shadow-xs"
                        style={{ backgroundColor: c.hex }}
                        title={`${c.name} (${c.hex})`}
                      />
                    ))}
                    <span className="text-[9px] font-mono text-zinc-500 ml-auto">
                      {bg.date || '2026'}
                    </span>
                  </div>
                </div>

                {/* Información y Metadatos */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <h3 className="text-base font-extrabold text-zinc-900 dark:text-white line-clamp-1">
                      {bg.brandName}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {renderStatusBadge(bg)}
                      {bg.requirePin ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>{bg.publicPin || 'PIN'}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 flex items-center gap-1">
                          <Unlock className="w-3 h-3" />
                          <span>Público</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {bg.tagline || bg.briefOverviewTitle || 'Presentación editorial de identidad visual para cliente.'}
                  </p>

                  {/* Indicadores de Comentarios, Heatmap de Lectura, Rondas y Drive Kit */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentsGuideline(bg);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3 text-indigo-500" />
                      <span>{commentsCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnalyticsGuideline(bg);
                      }}
                      title="Ver Heatmap de lectura por lámina e historial de rondas"
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
                    >
                      <BarChart3 className="w-3 h-3" />
                      <span>{bg.viewsCount || 0} vistas • Heatmap</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleAdvanceRound(bg, e)}
                      title="Guardar versión actual en historial y pasar a la siguiente Ronda"
                      className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300 flex items-center gap-1 cursor-pointer"
                    >
                      <History className="w-3 h-3" />
                      <span>+ Ronda</span>
                    </button>

                    {bg.driveFolderUrl && (
                      <span className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        <span>Kit</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Barra de Acciones */}
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(bg.publicToken, e)}
                      className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Copiar enlace público"
                    >
                      {copiedToken === bg.publicToken ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">Enlace</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGuideline(bg);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Editar presentación"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(bg, e)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleOpenPublicView(bg.publicToken, e)}
                    className="px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs hover:opacity-90 transition cursor-pointer"
                  >
                    <span>Ver Presentación</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Historial de Feedback y Aprobación del Cliente */}
      {commentsGuideline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg max-h-[82vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Feedback & Aprobación: {commentsGuideline.brandName}
                </h3>
                <p className="text-xs text-zinc-500">
                  Estado actual: {commentsGuideline.status === 'approved' ? `Aprobado por ${commentsGuideline.approvedBy}` : commentsGuideline.status === 'changes_requested' ? 'Ajustes solicitados' : 'En revisión'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCommentsGuideline(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {commentsGuideline.approvalNotes && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <span className="font-bold block mb-1">Nota Oficial de Revisión ({commentsGuideline.approvedBy}):</span>
                  <p className="text-zinc-600 dark:text-zinc-300">{commentsGuideline.approvalNotes}</p>
                </div>
              )}

              {(commentsGuideline.comments || []).length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-8">
                  El cliente aún no ha dejado comentarios en las diapositivas.
                </p>
              ) : (
                (commentsGuideline.comments || []).map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-zinc-900 dark:text-white">{c.authorName}</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-mono text-[10px]">
                        {c.slideTitle}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{c.text}</p>
                    <span className="text-[10px] font-mono text-zinc-400 block">
                      {new Date(c.createdAt).toLocaleString('es-ES')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Heatmap de Visualización por Lámina e Historial de Rondas */}
      {analyticsGuideline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  <span>Heatmap de Lectura &amp; Historial de Rondas: {analyticsGuideline.brandName}</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  {analyticsGuideline.viewsCount || 0} aperturas totales • Versión actual: {analyticsGuideline.round || 'Round 1'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnalyticsGuideline(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Sección 1: Heatmap de Tiempo por Diapositiva */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                  Heatmap de Atención por Lámina (Segundos acumulados)
                </span>
                {Object.values(analyticsGuideline.slideAnalytics || {}).length === 0 ? (
                  <p className="text-xs text-zinc-400 py-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    Abre el enlace público y navega por las diapositivas para registrar telemetría de lectura en vivo.
                  </p>
                ) : (
                  (() => {
                    const stats = Object.values(analyticsGuideline.slideAnalytics || {}).sort(
                      (a, b) => b.totalSeconds - a.totalSeconds
                    );
                    const maxSec = Math.max(1, ...stats.map((s) => s.totalSeconds));
                    return (
                      <div className="space-y-2.5">
                        {stats.map((st) => {
                          const pct = Math.min(100, Math.round((st.totalSeconds / maxSec) * 100));
                          return (
                            <div key={st.slideId} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                  {st.slideTitle}
                                </span>
                                <span className="font-mono text-zinc-500">
                                  {st.totalSeconds}s ({st.views} vistas)
                                </span>
                              </div>
                              <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div
                                  style={{ width: `${pct}%` }}
                                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Sección 2: Historial de Rondas (Round 1, Round 2, Final) */}
              <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Historial de Rondas Guardadas ({(analyticsGuideline.roundHistory || []).length})
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      handleAdvanceRound(analyticsGuideline, e);
                      setAnalyticsGuideline(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer"
                  >
                    + Guardar Snapshot y Avanzar Ronda
                  </button>
                </div>

                {(analyticsGuideline.roundHistory || []).length === 0 ? (
                  <p className="text-xs text-zinc-400 py-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    Aún no hay rondas previas archivadas. Usa el botón &quot;+ Ronda&quot; cuando envíes una nueva iteración al cliente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(analyticsGuideline.roundHistory || []).map((snap) => (
                      <div
                        key={snap.id}
                        className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                            {snap.round}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            Guardado: {new Date(snap.savedAt).toLocaleString('es-ES')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {(snap.colors || []).slice(0, 5).map((c, idx) => (
                            <span
                              key={idx}
                              style={{ backgroundColor: c.hex }}
                              className="w-4 h-4 rounded-full border border-white/20"
                              title={c.hex}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Creación / Edición con Switcher de PIN */}
      <BrandGuidelineEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        guideline={selectedGuideline}
        onSaved={loadGuidelines}
      />
    </div>
  );
};
