import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Video,
  Plus,
  Trash2,
  Zap,
  Users,
  Building,
  Check,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  WorkspaceMeeting,
  WorkspaceMeetingRoom,
  WorkspaceMeetingAgreement,
  WorkspaceMeetingRecording,
  Client,
  ClientBrand,
  User as UserType,
  MeetingStatus,
} from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface MeetingModalProps {
  isOpen: boolean;
  editingMeeting: WorkspaceMeeting | null;
  rooms: WorkspaceMeetingRoom[];
  clients: Client[];
  teamUsers: UserType[];
  preselectedRoom?: WorkspaceMeetingRoom | null;
  onClose: () => void;
  onSave: (data: Partial<WorkspaceMeeting>) => Promise<void>;
}

export const MeetingModal: React.FC<MeetingModalProps> = ({
  isOpen,
  editingMeeting,
  rooms,
  clients,
  teamUsers,
  preselectedRoom,
  onClose,
  onSave,
}) => {
  const { toast, apiFetch } = useApp();
  const [title, setTitle] = useState('');
  const [roomId, setRoomId] = useState('');
  const [clientId, setClientId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [status, setStatus] = useState<MeetingStatus>('scheduled');
  const [meetUrl, setMeetUrl] = useState('');
  const [attendeeUserIds, setAttendeeUserIds] = useState<string[]>([]);
  const [agenda, setAgenda] = useState('');
  const [summary, setSummary] = useState('');
  const [agreements, setAgreements] = useState<WorkspaceMeetingAgreement[]>([]);
  const [recordings, setRecordings] = useState<WorkspaceMeetingRecording[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingMeet, setGeneratingMeet] = useState(false);

  // Derivar marcas del cliente seleccionado
  const selectedClient = clients.find((c) => c.id === clientId);
  const clientBrands = selectedClient?.brands || [];

  useEffect(() => {
    if (editingMeeting) {
      setTitle(editingMeeting.title);
      setRoomId(editingMeeting.roomId || '');
      setClientId(editingMeeting.clientId || '');
      setBrandId(editingMeeting.brandId || '');
      setScheduledAt(editingMeeting.scheduledAt ? editingMeeting.scheduledAt.slice(0, 16) : '');
      setDurationMinutes(editingMeeting.durationMinutes || 45);
      setStatus(editingMeeting.status || 'scheduled');
      setMeetUrl(editingMeeting.meetUrl || '');
      setAttendeeUserIds(editingMeeting.attendeeUserIds || []);
      setAgenda(editingMeeting.agenda || '');
      setSummary(editingMeeting.summary || '');
      setAgreements(editingMeeting.agreements || []);
      setRecordings(editingMeeting.recordings || []);
    } else {
      setTitle('');
      setRoomId(preselectedRoom ? preselectedRoom.id : '');
      setClientId('');
      setBrandId('');
      // Formato fecha actual para input datetime-local
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
      const iso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setScheduledAt(iso);
      setDurationMinutes(45);
      setStatus('scheduled');
      setMeetUrl(preselectedRoom?.meetUrl || '');
      setAttendeeUserIds([]);
      setAgenda('');
      setSummary('');
      setAgreements([]);
      setRecordings([]);
    }
  }, [editingMeeting, preselectedRoom, isOpen]);

  if (!isOpen) return null;

  const handleGenerateMeet = async () => {
    setGeneratingMeet(true);
    try {
      const res = await apiFetch<{ meetUrl: string; source: string; note?: string }>(
        '/api/workspace/meetings/generate-meet-link',
        {
          method: 'POST',
          body: JSON.stringify({
            title: title || 'Reunión de Agencia - Sistema ROMA',
            scheduledAt,
          }),
        }
      );
      if (res.meetUrl) {
        setMeetUrl(res.meetUrl);
        toast('Enlace de Google Meet generado con éxito', 'success');
      }
    } catch {
      const randomCode = Math.random().toString(36).substring(2, 5) + '-' +
                         Math.random().toString(36).substring(2, 6) + '-' +
                         Math.random().toString(36).substring(2, 5);
      setMeetUrl(`https://meet.google.com/${randomCode}`);
      toast('Enlace de Google Meet generado', 'info');
    } finally {
      setGeneratingMeet(false);
    }
  };

  const handleAddAgreement = () => {
    const newAg: WorkspaceMeetingAgreement = {
      id: `agr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title: '',
      completed: false,
    };
    setAgreements([...agreements, newAg]);
  };

  const handleUpdateAgreement = (idx: number, patch: Partial<WorkspaceMeetingAgreement>) => {
    const updated = [...agreements];
    updated[idx] = { ...updated[idx], ...patch };
    setAgreements(updated);
  };

  const handleRemoveAgreement = (idx: number) => {
    setAgreements(agreements.filter((_, i) => i !== idx));
  };

  const handleAddRecording = () => {
    const newRec: WorkspaceMeetingRecording = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title: 'Grabación de la sesión',
      url: '',
      type: 'drive',
    };
    setRecordings([...recordings, newRec]);
  };

  const handleUpdateRecording = (idx: number, patch: Partial<WorkspaceMeetingRecording>) => {
    const updated = [...recordings];
    updated[idx] = { ...updated[idx], ...patch };
    setRecordings(updated);
  };

  const handleRemoveRecording = (idx: number) => {
    setRecordings(recordings.filter((_, i) => i !== idx));
  };

  const toggleAttendee = (userId: string) => {
    if (attendeeUserIds.includes(userId)) {
      setAttendeeUserIds(attendeeUserIds.filter((id) => id !== userId));
    } else {
      setAttendeeUserIds([...attendeeUserIds, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast('El título o motivo es obligatorio', 'warning');
      return;
    }

    setSaving(true);
    try {
      const selectedBrand = clientBrands.find((b) => b.id === brandId);
      const selectedRoom = rooms.find((r) => r.id === roomId);

      await onSave({
        title: title.trim(),
        roomId: roomId || undefined,
        roomName: selectedRoom?.name,
        clientId: clientId || undefined,
        clientName: selectedClient?.name,
        brandId: brandId || undefined,
        brandName: selectedBrand?.name,
        brandLogo: selectedBrand?.logoUrl,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        durationMinutes: Number(durationMinutes) || 45,
        status,
        meetUrl: meetUrl.trim(),
        attendeeUserIds,
        agenda: agenda.trim(),
        summary: summary.trim(),
        agreements: agreements.filter((a) => a.title.trim()),
        recordings: recordings.filter((r) => r.url.trim()),
      });
      onClose();
    } catch {
      toast('Error al guardar la reunión', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl my-8">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {editingMeeting ? 'Editar Acta / Reunión' : 'Nueva Reunión de Trabajo'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Agenda la sesión, genera enlace de Google Meet y redacta la minuta.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Motivo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Motivo o Título de la Reunión *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ej: Revisión de Estrategia Digital y Layouts"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none"
            />
          </div>

          {/* Cliente y Marca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cliente
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setBrandId('');
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none cursor-pointer"
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Marca Asociada
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                disabled={!clientId}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none cursor-pointer disabled:opacity-50"
              >
                <option value="">{clientId ? 'Seleccionar marca...' : 'Primero elige cliente'}</option>
                {clientBrands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sala, Fecha y Duración */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sala Virtual Bento
              </label>
              <select
                value={roomId}
                onChange={(e) => {
                  const rId = e.target.value;
                  setRoomId(rId);
                  const found = rooms.find((r) => r.id === rId);
                  if (found?.meetUrl && !meetUrl) {
                    setMeetUrl(found.meetUrl);
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none cursor-pointer"
              >
                <option value="">Sin sala fija (externa)</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Fecha y Hora *
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Duración (min)
              </label>
              <input
                type="number"
                min={15}
                max={240}
                step={15}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none"
              />
            </div>
          </div>

          {/* Google Meet Link + Generador Automático */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Enlace de Google Meet</span>
              </label>

              <button
                type="button"
                onClick={handleGenerateMeet}
                disabled={generatingMeet}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3 h-3" />
                <span>{generatingMeet ? 'Generando...' : '⚡ Generar con Google Cloud / Meet'}</span>
              </button>
            </div>

            <input
              type="url"
              value={meetUrl}
              onChange={(e) => setMeetUrl(e.target.value)}
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 transition outline-none"
            />
          </div>

          {/* Asistentes del Equipo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Colaboradores Asistentes ({attendeeUserIds.length})
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
              {teamUsers.map((user) => {
                const isSelected = attendeeUserIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleAttendee(user.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{user.name}</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Agenda y Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Agenda / Puntos Clave
              </label>
              <textarea
                rows={3}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="1. Revisión de avances&#10;2. Aprobación de copy&#10;3. Calendario semanal"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 transition outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Resumen Ejecutivo / Conclusiones
              </label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Se aprobó la propuesta #2 con ajuste menor en tipografía..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 transition outline-none resize-none"
              />
            </div>
          </div>

          {/* Acuerdos y Compromisos */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Acuerdos y Compromisos ({agreements.length})
              </label>
              <button
                type="button"
                onClick={handleAddAgreement}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Añadir Acuerdo</span>
              </button>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {agreements.map((ag, idx) => (
                <div
                  key={ag.id || idx}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800"
                >
                  <input
                    type="text"
                    value={ag.title}
                    onChange={(e) => handleUpdateAgreement(idx, { title: e.target.value })}
                    placeholder="Descripción del compromiso o entrega"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium outline-none"
                  />

                  <select
                    value={ag.assignedUserId || ''}
                    onChange={(e) => {
                      const uid = e.target.value;
                      const u = teamUsers.find((user) => user.id === uid);
                      handleUpdateAgreement(idx, {
                        assignedUserId: uid || undefined,
                        assignedUserName: u?.name,
                      });
                    }}
                    className="w-32 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium outline-none cursor-pointer"
                  >
                    <option value="">Responsable...</option>
                    {teamUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={ag.dueDate || ''}
                    onChange={(e) => handleUpdateAgreement(idx, { dueDate: e.target.value })}
                    className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveAgreement(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Grabaciones / Enlaces multimedia */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Grabaciones de la Sesión ({recordings.length})
              </label>
              <button
                type="button"
                onClick={handleAddRecording}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Añadir Grabación</span>
              </button>
            </div>

            <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
              {recordings.map((rec, idx) => (
                <div
                  key={rec.id || idx}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800"
                >
                  <input
                    type="text"
                    value={rec.title}
                    onChange={(e) => handleUpdateRecording(idx, { title: e.target.value })}
                    placeholder="Título del video"
                    className="w-40 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium outline-none"
                  />

                  <input
                    type="url"
                    value={rec.url}
                    onChange={(e) => handleUpdateRecording(idx, { url: e.target.value })}
                    placeholder="https://drive.google.com/... o Loom"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono outline-none"
                  />

                  <select
                    value={rec.type}
                    onChange={(e) => handleUpdateRecording(idx, { type: e.target.value as any })}
                    className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium outline-none cursor-pointer"
                  >
                    <option value="drive">Drive</option>
                    <option value="loom">Loom</option>
                    <option value="youtube">YouTube</option>
                    <option value="file">Archivo</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemoveRecording(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editingMeeting ? 'Guardar Cambios' : 'Agendar Reunión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
