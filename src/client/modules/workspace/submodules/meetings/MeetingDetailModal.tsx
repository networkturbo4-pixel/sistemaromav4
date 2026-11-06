import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  Circle,
  Share2,
  ExternalLink,
  Copy,
  Check,
  Plus,
  ArrowRight,
  Sparkles,
  FileVideo,
  User,
  Users,
  Edit2,
  Send,
  Link as LinkIcon,
  Tag,
} from 'lucide-react';
import { WorkspaceMeeting, WorkspaceMeetingAgreement, User as UserType } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface MeetingDetailModalProps {
  meeting: WorkspaceMeeting | null;
  teamUsers: UserType[];
  onClose: () => void;
  onEdit: (meeting: WorkspaceMeeting) => void;
  onRefresh: () => void;
}

export const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
  meeting,
  teamUsers,
  onClose,
  onEdit,
  onRefresh,
}) => {
  const { toast, apiFetch } = useApp();
  const [copiedLink, setCopiedLink] = useState(false);
  const [convertingAgreementId, setConvertingAgreementId] = useState<string | null>(null);

  if (!meeting) return null;

  const handleLaunchFloatingMeet = () => {
    if (!meeting.meetUrl) {
      toast('Esta reunión no tiene un enlace de Google Meet configurado', 'warning');
      return;
    }
    const width = 1040;
    const height = 720;
    const left = window.screen.width - width - 40;
    const top = 60;
    window.open(
      meeting.meetUrl,
      `MeetMeeting_${meeting.id}`,
      `width=${width},height=${height},top=${top},resizable=yes,scrollbars=yes,status=no`
    );
    toast('Google Meet abierto en ventana paralela', 'info');
  };

  const handleToggleAgreementComplete = async (agreement: WorkspaceMeetingAgreement) => {
    try {
      const updatedAgreements = meeting.agreements.map((a) =>
        a.id === agreement.id ? { ...a, completed: !a.completed } : a
      );
      await apiFetch(`/api/workspace/meetings/${meeting.id}`, {
        method: 'PUT',
        body: JSON.stringify({ agreements: updatedAgreements }),
      });
      meeting.agreements = updatedAgreements;
      onRefresh();
      toast(
        agreement.completed ? 'Acuerdo marcado como pendiente' : '¡Acuerdo completado!',
        'success'
      );
    } catch {
      toast('Error al actualizar acuerdo', 'error');
    }
  };

  const handleConvertAgreementToTask = async (agreement: WorkspaceMeetingAgreement) => {
    if (agreement.createdTaskId) {
      toast('Este acuerdo ya fue convertido en una tarea de Workspace', 'info');
      return;
    }
    setConvertingAgreementId(agreement.id);
    try {
      const res = await apiFetch<{ task: any; agreement: WorkspaceMeetingAgreement }>(
        `/api/workspace/meetings/${meeting.id}/agreements/${agreement.id}/to-task`,
        {
          method: 'POST',
          body: JSON.stringify({
            title: agreement.title,
            description: agreement.description || `Compromiso de reunión: "${meeting.title}"`,
            assignedUserId: agreement.assignedUserId,
            dueDate: agreement.dueDate,
            priority: 'medium',
          }),
        }
      );
      agreement.createdTaskId = res.task.id;
      onRefresh();
      toast('Acuerdo convertido en Tarea de Workspace con éxito', 'success');
    } catch {
      toast('Error al convertir acuerdo en tarea', 'error');
    } finally {
      setConvertingAgreementId(null);
    }
  };

  const handleShareWhatsApp = () => {
    const formattedDate = new Date(meeting.scheduledAt).toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let msg = `📋 *ACTA DE REUNIÓN — SISTEMA ROMA*\n`;
    msg += `📌 *Motivo:* ${meeting.title}\n`;
    if (meeting.brandName) msg += `🏷️ *Marca:* ${meeting.brandName}\n`;
    if (meeting.clientName) msg += `👤 *Cliente:* ${meeting.clientName}\n`;
    msg += `🗓️ *Fecha:* ${formattedDate}\n`;
    if (meeting.meetUrl) msg += `🔗 *Google Meet:* ${meeting.meetUrl}\n`;

    if (meeting.summary) {
      msg += `\n📝 *Resumen Ejecutivo:*\n${meeting.summary}\n`;
    }

    if (meeting.agreements && meeting.agreements.length > 0) {
      msg += `\n✅ *Acuerdos y Compromisos:*\n`;
      meeting.agreements.forEach((ag, idx) => {
        const resp = ag.assignedUserName ? ` (Resp: ${ag.assignedUserName})` : '';
        const due = ag.dueDate ? ` [Fecha: ${ag.dueDate}]` : '';
        const check = ag.completed ? '✓' : '•';
        msg += `${check} ${ag.title}${resp}${due}\n`;
      });
    }

    if (meeting.recordings && meeting.recordings.length > 0) {
      msg += `\n🎥 *Grabaciones de la sesión:*\n`;
      meeting.recordings.forEach((rec) => {
        msg += `• ${rec.title}: ${rec.url}\n`;
      });
    }

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleCopyMeetLink = () => {
    if (!meeting.meetUrl) return;
    navigator.clipboard.writeText(meeting.meetUrl);
    setCopiedLink(true);
    toast('Enlace de Google Meet copiado', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formattedDateTime = new Date(meeting.scheduledAt).toLocaleString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl my-8 space-y-6">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {meeting.brandName && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-200 dark:border-indigo-800">
                  {meeting.brandLogo && (
                    <img src={meeting.brandLogo} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                  )}
                  <span>{meeting.brandName}</span>
                </span>
              )}
              {meeting.clientName && (
                <span className="text-xs text-slate-500 font-medium">({meeting.clientName})</span>
              )}
              {meeting.roomName && (
                <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                  {meeting.roomName}
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1.5 leading-snug">
              {meeting.title}
            </h3>

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{formattedDateTime}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{meeting.durationMinutes || 45} min</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(meeting)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Editar acta"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Acceso a Google Meet Flotante */}
        {meeting.meetUrl && (
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Video className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-900 dark:text-white">Sala de Google Meet</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {meeting.meetUrl}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMeetLink}
                className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60 transition flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchFloatingMeet}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Lanza Google Meet en ventana flotante independiente para tomar notas en vivo"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en Ventana Flotante</span>
              </button>
            </div>
          </div>
        )}

        {/* Resumen / Agenda */}
        {(meeting.agenda || meeting.summary) && (
          <div className="space-y-3">
            {meeting.agenda && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Agenda / Puntos a Tratar
                </h4>
                <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
                  {meeting.agenda}
                </div>
              </div>
            )}

            {meeting.summary && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Resumen Ejecutivo de la Sesión
                </h4>
                <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
                  {meeting.summary}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Acuerdos y Compromisos (con botón para convertir a tarea de Workspace) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Acuerdos y Compromisos ({meeting.agreements?.length || 0})</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              Convierte los acuerdos en tareas con 1 clic
            </span>
          </div>

          {!meeting.agreements || meeting.agreements.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              No hay acuerdos registrados en esta reunión.
            </div>
          ) : (
            <div className="space-y-2">
              {meeting.agreements.map((agreement) => {
                const isConverting = convertingAgreementId === agreement.id;

                return (
                  <div
                    key={agreement.id}
                    className={`p-3 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      agreement.completed
                        ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleAgreementComplete(agreement)}
                        className="mt-0.5 text-slate-400 hover:text-emerald-500 transition cursor-pointer"
                      >
                        {agreement.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div>
                        <p
                          className={`text-xs font-bold leading-tight ${
                            agreement.completed
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {agreement.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                          {agreement.assignedUserName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-indigo-500" />
                              <span>{agreement.assignedUserName}</span>
                            </span>
                          )}
                          {agreement.dueDate && (
                            <span className="flex items-center gap-1 font-mono text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <span>{agreement.dueDate}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botón de conversión a tarea de Workspace */}
                    <div className="self-end sm:self-center shrink-0">
                      {agreement.createdTaskId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <Check className="w-3 h-3" />
                          <span>Tarea creada</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isConverting}
                          onClick={() => handleConvertAgreementToTask(agreement)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500 hover:text-white" />
                          <span>{isConverting ? 'Creando...' : 'Convertir a Tarea'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grabaciones y Enlaces de Sesión */}
        {meeting.recordings && meeting.recordings.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <FileVideo className="w-4 h-4 text-rose-500" />
              <span>Grabaciones de la Sesión ({meeting.recordings.length})</span>
            </h4>
            <div className="space-y-2">
              {meeting.recordings.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <FileVideo className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{rec.title}</p>
                      <p className="text-[10px] font-mono text-slate-400 truncate">{rec.url}</p>
                    </div>
                  </div>

                  <a
                    href={rec.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <span>Ver</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer y botón WhatsApp */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compartir Resumen por WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
