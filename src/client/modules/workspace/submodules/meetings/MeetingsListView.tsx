import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  Share2,
  ExternalLink,
  Plus,
  Search,
  Filter,
  User,
  Users,
  Edit2,
  Trash2,
  FileText,
  FileVideo,
  Send,
  Building,
} from 'lucide-react';
import {
  WorkspaceMeeting,
  Client,
  MeetingStatus,
  WorkspaceMeetingRoom,
} from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface MeetingsListViewProps {
  meetings: WorkspaceMeeting[];
  rooms: WorkspaceMeetingRoom[];
  clients: Client[];
  loading: boolean;
  onOpenCreateMeeting: () => void;
  onOpenEditMeeting: (meeting: WorkspaceMeeting) => void;
  onOpenDetailMeeting: (meeting: WorkspaceMeeting) => void;
  onDeleteMeeting: (meeting: WorkspaceMeeting) => void;
}

export const MeetingsListView: React.FC<MeetingsListViewProps> = ({
  meetings,
  rooms,
  clients,
  loading,
  onOpenCreateMeeting,
  onOpenEditMeeting,
  onOpenDetailMeeting,
  onDeleteMeeting,
}) => {
  const { toast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const filteredMeetings = meetings.filter((m) => {
    const matchSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.clientName && m.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.brandName && m.brandName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.summary && m.summary.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchSearch) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (selectedClientId && m.clientId !== selectedClientId) return false;
    return true;
  });

  const handleLaunchFloatingMeet = (m: WorkspaceMeeting) => {
    if (!m.meetUrl) {
      toast('Esta reunión no tiene enlace de Google Meet asignado', 'warning');
      return;
    }
    const width = 1040;
    const height = 720;
    const left = window.screen.width - width - 40;
    const top = 60;
    window.open(
      m.meetUrl,
      `Meet_${m.id}`,
      `width=${width},height=${height},top=${top},resizable=yes,scrollbars=yes,status=no`
    );
    toast('Google Meet abierto en ventana flotante', 'info');
  };

  const handleShareWhatsApp = (m: WorkspaceMeeting) => {
    const formattedDate = new Date(m.scheduledAt).toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    let msg = `📋 *ACTA DE REUNIÓN — SISTEMA ROMA*\n`;
    msg += `📌 *Motivo:* ${m.title}\n`;
    if (m.brandName) msg += `🏷️ *Marca:* ${m.brandName}\n`;
    if (m.clientName) msg += `👤 *Cliente:* ${m.clientName}\n`;
    msg += `🗓️ *Fecha:* ${formattedDate}\n`;
    if (m.meetUrl) msg += `🔗 *Google Meet:* ${m.meetUrl}\n`;

    if (m.agreements && m.agreements.length > 0) {
      msg += `\n✅ *Acuerdos principales:*\n`;
      m.agreements.forEach((ag) => {
        const resp = ag.assignedUserName ? ` (Resp: ${ag.assignedUserName})` : '';
        msg += `• ${ag.title}${resp}\n`;
      });
    }

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const scheduledCount = meetings.filter((m) => m.status === 'scheduled').length;
  const inProgressCount = meetings.filter((m) => m.status === 'in_progress').length;
  const completedCount = meetings.filter((m) => m.status === 'completed').length;

  return (
    <div className="space-y-5">
      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filtros de estado */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todas ({meetings.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('scheduled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              statusFilter === 'scheduled'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Programadas ({scheduledCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              statusFilter === 'in_progress'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            En Curso ({inProgressCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Completadas ({completedCount})
          </button>
        </div>

        {/* Buscador y filtro de cliente */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por motivo o cliente..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <button
            type="button"
            onClick={onOpenCreateMeeting}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Agendar</span>
          </button>
        </div>
      </div>

      {/* Listado de Reuniones */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Cargando reuniones y actas...</div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Calendar className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white">
            {searchTerm ? 'No se encontraron reuniones' : 'No hay reuniones registradas'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {searchTerm
              ? 'Intenta con otros términos de búsqueda o cambia los filtros de estado.'
              : 'Agenda tu primera reunión con Google Meet, redacta acuerdos y convierte tareas.'}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={onOpenCreateMeeting}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1.5 mx-auto shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agendar Reunión</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMeetings.map((item) => {
            const meetingDate = new Date(item.scheduledAt);
            const isToday = meetingDate.toDateString() === new Date().toDateString();
            const timeStr = meetingDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
            const dateStr = meetingDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });

            const agreementsCount = item.agreements?.length || 0;
            const completedAgreements = item.agreements?.filter((a) => a.completed).length || 0;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-900 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Lado izquierdo: Fecha, Marca, Título */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Badge de Fecha */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 border ${
                      isToday
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-[10px] font-extrabold uppercase leading-none">
                      {isToday ? 'Hoy' : dateStr}
                    </span>
                    <span className="text-xs font-black font-mono mt-0.5">{timeStr}</span>
                  </div>

                  {/* Datos principales */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.brandName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] border border-indigo-200/80 dark:border-indigo-800/80">
                          {item.brandLogo && (
                            <img src={item.brandLogo} alt="" className="w-3 h-3 rounded-full object-cover" />
                          )}
                          <span>{item.brandName}</span>
                        </span>
                      )}

                      {item.clientName && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          • {item.clientName}
                        </span>
                      )}

                      {item.roomName && (
                        <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          {item.roomName}
                        </span>
                      )}

                      {/* Estado */}
                      {item.status === 'in_progress' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>En curso</span>
                        </span>
                      ) : item.status === 'completed' ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          Completada
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                          Programada
                        </span>
                      )}
                    </div>

                    <h4
                      onClick={() => onOpenDetailMeeting(item)}
                      className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer truncate max-w-md"
                    >
                      {item.title}
                    </h4>

                    {/* Chips de acuerdos y grabaciones */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>
                          {agreementsCount > 0
                            ? `${completedAgreements}/${agreementsCount} acuerdos`
                            : 'Sin acuerdos'}
                        </span>
                      </span>

                      {item.recordings && item.recordings.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-rose-500">
                          <FileVideo className="w-3.5 h-3.5" />
                          <span>{item.recordings.length} grabaciones</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{item.durationMinutes || 45} min</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado derecho: Acciones rápidas */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {/* Botón Meet Flotante */}
                  {item.meetUrl && (
                    <button
                      type="button"
                      onClick={() => handleLaunchFloatingMeet(item)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                      title="Abrir Google Meet en ventana flotante"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Meet</span>
                    </button>
                  )}

                  {/* Ver Acta / Minuta */}
                  <button
                    type="button"
                    onClick={() => onOpenDetailMeeting(item)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Ver acta y acuerdos"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Acta</span>
                  </button>

                  {/* Compartir por WhatsApp */}
                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(item)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                    title="Compartir resumen por WhatsApp"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>

                  {/* Editar */}
                  <button
                    type="button"
                    onClick={() => onOpenEditMeeting(item)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                    title="Editar reunión"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Eliminar */}
                  <button
                    type="button"
                    onClick={() => onDeleteMeeting(item)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    title="Eliminar reunión"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
