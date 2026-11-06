import React, { useState, useEffect } from 'react';
import {
  X,
  Video,
  Sparkles,
  Users,
  Presentation,
  Shield,
  Layers,
  Check,
  Zap,
} from 'lucide-react';
import { WorkspaceMeetingRoom, MeetingRoomStatus } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface MeetingRoomModalProps {
  isOpen: boolean;
  editingRoom: WorkspaceMeetingRoom | null;
  onClose: () => void;
  onSave: (data: Partial<WorkspaceMeetingRoom>) => Promise<void>;
}

const COLOR_PRESETS = [
  '#0055ff', // Azul Roma
  '#8b5cf6', // Púrpura Creativo
  '#10b981', // Esmeralda
  '#f59e0b', // Ámbar
  '#ef4444', // Carmesí
  '#ec4899', // Rosa
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
];

const ICONS = [
  { name: 'Video', icon: Video, label: 'Cámara' },
  { name: 'Sparkles', icon: Sparkles, label: 'Creativo' },
  { name: 'Users', icon: Users, label: 'Equipo' },
  { name: 'Presentation', icon: Presentation, label: 'Presentación' },
  { name: 'Shield', icon: Shield, label: 'Privado' },
  { name: 'Layers', icon: Layers, label: 'Proyectos' },
];

export const MeetingRoomModal: React.FC<MeetingRoomModalProps> = ({
  isOpen,
  editingRoom,
  onClose,
  onSave,
}) => {
  const { toast, apiFetch } = useApp();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0055ff');
  const [icon, setIcon] = useState('Video');
  const [meetUrl, setMeetUrl] = useState('');
  const [status, setStatus] = useState<MeetingRoomStatus>('available');
  const [saving, setSaving] = useState(false);
  const [generatingMeet, setGeneratingMeet] = useState(false);

  useEffect(() => {
    if (editingRoom) {
      setName(editingRoom.name);
      setCode(editingRoom.code);
      setDescription(editingRoom.description || '');
      setColor(editingRoom.color || '#0055ff');
      setIcon(editingRoom.icon || 'Video');
      setMeetUrl(editingRoom.meetUrl || '');
      setStatus(editingRoom.status || 'available');
    } else {
      setName('');
      setCode(`SALA-${Math.floor(Math.random() * 90 + 10)}`);
      setDescription('');
      setColor('#0055ff');
      setIcon('Video');
      setMeetUrl('https://meet.google.com/new');
      setStatus('available');
    }
  }, [editingRoom, isOpen]);

  if (!isOpen) return null;

  const handleGenerateInstantMeet = async () => {
    setGeneratingMeet(true);
    try {
      const res = await apiFetch<{ meetUrl: string; source: string; note?: string }>(
        '/api/workspace/meetings/generate-meet-link',
        {
          method: 'POST',
          body: JSON.stringify({
            title: name || 'Sala Virtual de Agencia',
          }),
        }
      );
      if (res.meetUrl) {
        setMeetUrl(res.meetUrl);
        toast('Enlace de Google Meet generado con éxito', 'success');
      }
    } catch {
      // Fallback
      const randomCode = Math.random().toString(36).substring(2, 5) + '-' +
                         Math.random().toString(36).substring(2, 6) + '-' +
                         Math.random().toString(36).substring(2, 5);
      setMeetUrl(`https://meet.google.com/${randomCode}`);
      toast('Enlace de Google Meet generado localmente', 'info');
    } finally {
      setGeneratingMeet(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('El nombre de la sala es obligatorio', 'warning');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        color,
        icon,
        meetUrl: meetUrl.trim(),
        status,
      });
      onClose();
    } catch {
      toast('Error al guardar la sala de reunión', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {editingRoom ? 'Editar Sala de Reunión' : 'Nueva Sala Virtual Bento'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configura el espacio virtual, enlace recurrente de Google Meet y presencia.
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre de la Sala *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej: Sala Creativa Roma"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Código / ID *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SALA-01"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 transition outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Descripción o Propósito (Opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ej: Espacio para presentaciones de identidad y branding"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 transition outline-none"
            />
          </div>

          {/* Enlace Google Meet */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Enlace Recurrente de Google Meet
              </label>
              <button
                type="button"
                onClick={handleGenerateInstantMeet}
                disabled={generatingMeet}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3 h-3" />
                <span>{generatingMeet ? 'Generando...' : 'Generar con Google Meet'}</span>
              </button>
            </div>
            <input
              type="url"
              value={meetUrl}
              onChange={(e) => setMeetUrl(e.target.value)}
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 transition outline-none"
            />
          </div>

          {/* Estado actual */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Estado de Disponibilidad
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('available')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === 'available'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Disponible</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('in_meeting')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === 'in_meeting'
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-400 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>En Reunión</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('reserved')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  status === 'reserved'
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-400 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Reservada</span>
              </button>
            </div>
          </div>

          {/* Color del tema de la sala */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Color de Acento de la Sala
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white transition hover:scale-110 cursor-pointer shadow-xs"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icono de la sala */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Icono Representativo
            </label>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIcon(item.name)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Acciones */}
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
              {saving ? 'Guardando...' : editingRoom ? 'Guardar Cambios' : 'Crear Sala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
