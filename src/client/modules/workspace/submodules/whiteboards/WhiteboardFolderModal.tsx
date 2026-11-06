import React, { useState, useEffect } from 'react';
import { X, Folder, Check, Trash2 } from 'lucide-react';
import { WhiteboardFolder } from '../../../../../shared/types';

interface WhiteboardFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder?: WhiteboardFolder | null;
  onSave: (data: { name: string; color: string }) => Promise<void>;
  onDelete?: (folder: WhiteboardFolder) => Promise<void>;
}

const PRESET_COLORS = [
  '#3b82f6', // Azul Roma
  '#003fa3', // Azul Marino
  '#10b981', // Verde Esmeralda
  '#106531', // Verde Bosque
  '#f59e0b', // Ámbar
  '#ff7b00', // Naranja
  '#ef4444', // Rojo
  '#8b5cf6', // Púrpura
  '#ec4899', // Rosa
  '#64748b', // Pizarra
];

export const WhiteboardFolderModal: React.FC<WhiteboardFolderModalProps> = ({
  isOpen,
  onClose,
  folder,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setColor(folder.color || '#3b82f6');
    } else {
      setName('');
      setColor('#3b82f6');
    }
  }, [folder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      await onSave({ name: name.trim(), color });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {folder ? 'Editar Carpeta' : 'Nueva Carpeta de Pizarras'}
              </h3>
              <p className="text-xs text-slate-400">
                Organiza lienzos creativos por cliente o campaña
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Nombre de la Carpeta *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Hugos Pizza, Campañas 2026, Branding..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Color Distintivo
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    color.toLowerCase() === c.toLowerCase()
                      ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500 shadow-md'
                      : 'hover:scale-105 opacity-90 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color.toLowerCase() === c.toLowerCase() && (
                    <Check className="w-4 h-4 text-white drop-shadow-xs" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
              />
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
                {color}
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            {folder && onDelete ? (
              <button
                type="button"
                disabled={deleting || saving}
                onClick={async () => {
                  try {
                    setDeleting(true);
                    await onDelete(folder);
                    onClose();
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Eliminando...' : 'Eliminar Carpeta'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
              >
                {saving ? 'Guardando...' : folder ? 'Actualizar Carpeta' : 'Crear Carpeta'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
