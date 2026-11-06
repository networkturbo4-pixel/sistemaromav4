import React, { useState } from 'react';
import {
  Video,
  Sparkles,
  Users,
  Presentation,
  Shield,
  Layers,
  QrCode,
  Copy,
  ExternalLink,
  Plus,
  Check,
  Edit2,
  Trash2,
  Clock,
  Radio,
  FileVideo,
  ArrowUpRight,
} from 'lucide-react';
import { WorkspaceMeetingRoom } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';
import { MeetingRoomQrModal } from './MeetingRoomQrModal';
import { MeetingRoomModal } from './MeetingRoomModal';

interface MeetingRoomsViewProps {
  rooms: WorkspaceMeetingRoom[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateMeetingForRoom: (room: WorkspaceMeetingRoom) => void;
}

const ICON_MAP: Record<string, any> = {
  Video,
  Sparkles,
  Users,
  Presentation,
  Shield,
  Layers,
};

export const MeetingRoomsView: React.FC<MeetingRoomsViewProps> = ({
  rooms,
  loading,
  onRefresh,
  onOpenCreateMeetingForRoom,
}) => {
  const { toast, apiFetch, confirmAction } = useApp();
  const [selectedQrRoom, setSelectedQrRoom] = useState<WorkspaceMeetingRoom | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<WorkspaceMeetingRoom | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleLaunchFloatingMeet = (room: WorkspaceMeetingRoom) => {
    const url = room.meetUrl || 'https://meet.google.com/new';
    // Abre en ventana emergente compacta tipo Picture-in-Picture
    const width = 1040;
    const height = 720;
    const left = window.screen.width - width - 40;
    const top = 60;
    window.open(
      url,
      `MeetRoom_${room.id}`,
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no`
    );
    toast(`Iniciando Google Meet en ventana flotante para ${room.name}`, 'info');
  };

  const handleCopyLink = (room: WorkspaceMeetingRoom) => {
    const url = room.meetUrl || 'https://meet.google.com/new';
    navigator.clipboard.writeText(url);
    setCopiedId(room.id);
    toast('Enlace de Google Meet copiado', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveRoom = async (data: Partial<WorkspaceMeetingRoom>) => {
    if (editingRoom) {
      await apiFetch(`/api/workspace/meeting-rooms/${editingRoom.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      toast('Sala actualizada correctamente', 'success');
    } else {
      await apiFetch('/api/workspace/meeting-rooms', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      toast('Sala virtual creada con éxito', 'success');
    }
    onRefresh();
  };

  const handleDeleteRoom = async (room: WorkspaceMeetingRoom) => {
    if (room.isPreset) {
      toast('Esta sala predeterminada de la agencia no se puede eliminar', 'warning');
      return;
    }
    const ok = await confirmAction({
      title: '¿Eliminar Sala Virtual?',
      message: `¿Estás seguro de eliminar la sala "${room.name}"?`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/workspace/meeting-rooms/${room.id}`, { method: 'DELETE' });
      toast('Sala eliminada', 'success');
      onRefresh();
    } catch {
      toast('Error al eliminar la sala', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Salas Virtuales Bento</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800">
              {rooms.length} Salas
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Espacios con enlace directo a Google Meet en ventana flotante, presencia y grabaciones.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingRoom(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nueva Sala</span>
        </button>
      </div>

      {/* Grilla Bento */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Cargando salas virtuales...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {rooms.map((room) => {
            const IconComponent = ICON_MAP[room.icon] || Video;
            const isCopied = copiedId === room.id;

            return (
              <div
                key={room.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
              >
                {/* Acento decorativo sutil en la esquina */}
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none transition-all group-hover:opacity-25"
                  style={{ backgroundColor: room.color || '#0055ff' }}
                />

                {/* Header de la tarjeta Bento */}
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: room.color || '#0055ff' }}
                    >
                      <IconComponent className="w-6 h-6 stroke-[2.2]" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {room.code}
                        </span>
                        {room.isPreset && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
                            Fija
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1 leading-snug">
                        {room.name}
                      </h4>
                    </div>
                  </div>

                  {/* Estado de presencia */}
                  <div className="shrink-0">
                    {room.status === 'in_meeting' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        <span>En reunión</span>
                      </span>
                    ) : room.status === 'reserved' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>Reservada</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Disponible</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Descripción */}
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[32px] relative z-10 leading-relaxed">
                  {room.description || 'Espacio virtual de coordinación para sesiones de equipo y clientes.'}
                </p>

                {/* Métricas y Enlace */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 relative z-10">
                  <div className="flex items-center gap-1">
                    <FileVideo className="w-3.5 h-3.5 text-slate-400" />
                    <span>{room.recordingsCount || 0} grabaciones</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(room)}
                    className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1 cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? 'Copiado' : 'Copiar Meet'}</span>
                  </button>
                </div>

                {/* Acciones principales de la tarjeta */}
                <div className="pt-1 flex items-center gap-2 relative z-10">
                  <button
                    type="button"
                    onClick={() => handleLaunchFloatingMeet(room)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    title="Abrir Google Meet en ventana flotante paralela"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Entrar a Meet</span>
                    <ArrowUpRight className="w-3 h-3 opacity-70" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedQrRoom(room)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Escanear Código QR con el móvil"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenCreateMeetingForRoom(room)}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                    title="Agendar nueva reunión en esta sala"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingRoom(room);
                      setIsModalOpen(true);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Editar sala"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {!room.isPreset && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(room)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Eliminar sala"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      <MeetingRoomQrModal room={selectedQrRoom} onClose={() => setSelectedQrRoom(null)} />
      <MeetingRoomModal
        isOpen={isModalOpen}
        editingRoom={editingRoom}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRoom(null);
        }}
        onSave={handleSaveRoom}
      />
    </div>
  );
};
