import React, { useState, useEffect } from 'react';
import {
  Video,
  Calendar,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowLeft,
  Plus,
  RefreshCw,
  Layers,
  Zap,
} from 'lucide-react';
import {
  WorkspaceMeeting,
  WorkspaceMeetingRoom,
  Client,
  User as UserType,
} from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';
import { MeetingRoomsView } from './MeetingRoomsView';
import { MeetingsListView } from './MeetingsListView';
import { MeetingModal } from './MeetingModal';
import { MeetingDetailModal } from './MeetingDetailModal';

interface MeetingsSubmoduleViewProps {
  onBackToHub: () => void;
}

export const MeetingsSubmoduleView: React.FC<MeetingsSubmoduleViewProps> = ({ onBackToHub }) => {
  const { apiFetch, toast, confirmAction, can } = useApp();
  const [activeTab, setActiveTab] = useState<'rooms' | 'meetings'>('rooms');
  const [rooms, setRooms] = useState<WorkspaceMeetingRoom[]>([]);
  const [meetings, setMeetings] = useState<WorkspaceMeeting[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [teamUsers, setTeamUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<WorkspaceMeeting | null>(null);
  const [preselectedRoom, setPreselectedRoom] = useState<WorkspaceMeetingRoom | null>(null);
  const [selectedDetailMeeting, setSelectedDetailMeeting] = useState<WorkspaceMeeting | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsRes, meetingsRes, clientsRes, usersRes] = await Promise.all([
        apiFetch<{ rooms: WorkspaceMeetingRoom[] }>('/api/workspace/meeting-rooms').catch(() => ({ rooms: [] })),
        apiFetch<{ meetings: WorkspaceMeeting[] }>('/api/workspace/meetings').catch(() => ({ meetings: [] })),
        can('clients.view') || can('workspace.view')
          ? apiFetch<{ clients: Client[] }>('/api/clients').catch(() => ({ clients: [] }))
          : Promise.resolve({ clients: [] }),
        apiFetch<{ users: UserType[] }>('/api/settings/users').catch(() => ({ users: [] })),
      ]);

      setRooms(roomsRes.rooms || []);
      setMeetings(meetingsRes.meetings || []);
      setClients(clientsRes.clients || []);
      setTeamUsers(usersRes.users || []);
    } catch {
      toast('Error al sincronizar datos de salas y reuniones', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateMeetingForRoom = (room: WorkspaceMeetingRoom) => {
    setEditingMeeting(null);
    setPreselectedRoom(room);
    setIsMeetingModalOpen(true);
  };

  const handleOpenCreateMeeting = () => {
    setEditingMeeting(null);
    setPreselectedRoom(null);
    setIsMeetingModalOpen(true);
  };

  const handleOpenEditMeeting = (meeting: WorkspaceMeeting) => {
    setEditingMeeting(meeting);
    setPreselectedRoom(null);
    setIsMeetingModalOpen(true);
  };

  const handleSaveMeeting = async (data: Partial<WorkspaceMeeting>) => {
    if (editingMeeting) {
      await apiFetch(`/api/workspace/meetings/${editingMeeting.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      toast('Reunión y acta actualizadas con éxito', 'success');
    } else {
      await apiFetch('/api/workspace/meetings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      toast('Reunión agendada correctamente', 'success');
    }
    loadData();
  };

  const handleDeleteMeeting = async (meeting: WorkspaceMeeting) => {
    const ok = await confirmAction({
      title: '¿Eliminar Reunión?',
      message: `¿Estás seguro de eliminar el registro y acta de "${meeting.title}"?`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/workspace/meetings/${meeting.id}`, { method: 'DELETE' });
      toast('Reunión eliminada', 'success');
      loadData();
    } catch {
      toast('Error al eliminar reunión', 'error');
    }
  };

  // Contadores y Métricas
  const totalAgreements = meetings.reduce((acc, m) => acc + (m.agreements?.length || 0), 0);
  const totalTasksCreated = meetings.reduce(
    (acc, m) => acc + (m.agreements?.filter((a) => a.createdTaskId)?.length || 0),
    0
  );
  const activeRoomsCount = rooms.filter((r) => r.status === 'in_meeting').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header con botón volver a Hub y métricas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBackToHub}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Hub Workspace</span>
              </button>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80">
                Coordinación en Vivo
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 mt-2">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Video className="w-5 h-5 stroke-[2.3]" />
              </div>
              <span>Reuniones & Salas Virtuales</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mt-1 leading-relaxed">
              Salas permanentes con acceso rápido a Google Meet en ventana flotante, registro de minutas y conversión de acuerdos en tareas del equipo.
            </p>
          </div>

          {/* Selector de Pestañas Segmentado */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setActiveTab('rooms')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'rooms'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Salas Bento ({rooms.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('meetings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'meetings'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Reuniones & Actas ({meetings.length})</span>
            </button>
          </div>
        </div>

        {/* Mini tarjetas de métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Salas Fijas</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{rooms.length}</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reuniones Registradas</div>
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{meetings.length}</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Acuerdos de Sesión</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{totalAgreements}</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tareas Creadas</div>
            <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">{totalTasksCreated}</div>
          </div>
        </div>
      </div>

      {/* 2. Vista Activa */}
      {activeTab === 'rooms' ? (
        <MeetingRoomsView
          rooms={rooms}
          loading={loading}
          onRefresh={loadData}
          onOpenCreateMeetingForRoom={handleOpenCreateMeetingForRoom}
        />
      ) : (
        <MeetingsListView
          meetings={meetings}
          rooms={rooms}
          clients={clients}
          loading={loading}
          onOpenCreateMeeting={handleOpenCreateMeeting}
          onOpenEditMeeting={handleOpenEditMeeting}
          onOpenDetailMeeting={(m) => setSelectedDetailMeeting(m)}
          onDeleteMeeting={handleDeleteMeeting}
        />
      )}

      {/* 3. Modales de Creación, Edición y Detalle */}
      <MeetingModal
        isOpen={isMeetingModalOpen}
        editingMeeting={editingMeeting}
        rooms={rooms}
        clients={clients}
        teamUsers={teamUsers}
        preselectedRoom={preselectedRoom}
        onClose={() => {
          setIsMeetingModalOpen(false);
          setEditingMeeting(null);
          setPreselectedRoom(null);
        }}
        onSave={handleSaveMeeting}
      />

      <MeetingDetailModal
        meeting={selectedDetailMeeting}
        teamUsers={teamUsers}
        onClose={() => setSelectedDetailMeeting(null)}
        onEdit={(m) => {
          setSelectedDetailMeeting(null);
          handleOpenEditMeeting(m);
        }}
        onRefresh={loadData}
      />
    </div>
  );
};
