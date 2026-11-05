import React, { useState } from 'react';
import { ServiceCategory } from '../../../shared/types';
import { useApp } from '../../context/AppContext';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  FolderPlus,
  Sparkles,
  Target,
  Globe,
  Video,
  Palette,
  Megaphone,
  Smartphone,
  Rocket,
  Star,
  Code,
  Camera,
  Briefcase,
  Zap,
  Compass,
  Heart,
  Layers,
} from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ServiceCategory[];
  onCategoriesUpdated: () => void;
}

const AVAILABLE_ICONS = [
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Target', icon: Target },
  { name: 'Globe', icon: Globe },
  { name: 'Video', icon: Video },
  { name: 'Palette', icon: Palette },
  { name: 'Megaphone', icon: Megaphone },
  { name: 'Smartphone', icon: Smartphone },
  { name: 'Rocket', icon: Rocket },
  { name: 'Star', icon: Star },
  { name: 'Code', icon: Code },
  { name: 'Camera', icon: Camera },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Zap', icon: Zap },
  { name: 'Compass', icon: Compass },
  { name: 'Heart', icon: Heart },
  { name: 'Layers', icon: Layers },
];

const PRESET_COLORS = [
  '#7c3aed', // Violeta
  '#ec4899', // Rosa / Fucsia
  '#06b6d4', // Cyan
  '#10b981', // Esmeralda
  '#f59e0b', // Ámbar
  '#ef4444', // Rojo
  '#3b82f6', // Azul
  '#6366f1', // Indigo
  '#8b5cf6', // Púrpura
  '#14b8a6', // Teal
  '#f97316', // Naranja
  '#64748b', // Slate
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesUpdated,
}) => {
  const { apiFetch, toast, confirmAction } = useApp();

  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [badgeColor, setBadgeColor] = useState('#7c3aed');
  const [icon, setIcon] = useState('Sparkles');

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setBadgeColor('#7c3aed');
    setIcon('Sparkles');
    setIsCreating(true);
  };

  const handleStartEdit = (cat: ServiceCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setBadgeColor(cat.badgeColor || '#7c3aed');
    setIcon(cat.icon || 'Sparkles');
    setIsCreating(true);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingCategory(null);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generated);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('El nombre de la categoría es obligatorio', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        badgeColor,
        icon,
      };

      if (editingCategory) {
        await apiFetch(`/api/services/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast('Categoría actualizada con éxito', 'success');
      } else {
        await apiFetch('/api/services/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast('Categoría creada con éxito', 'success');
      }

      setIsCreating(false);
      setEditingCategory(null);
      onCategoriesUpdated();
    } catch (err) {
      toast((err as Error).message || 'Error guardando categoría', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cat: ServiceCategory) => {
    const confirmed = await confirmAction({
      title: `¿Eliminar categoría "${cat.name}"?`,
      message: 'Los servicios asociados a esta categoría pasarán a no tener categoría asignada.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });

    if (!confirmed) return;

    try {
      await apiFetch(`/api/services/categories/${cat.id}`, {
        method: 'DELETE',
      });
      toast('Categoría eliminada', 'success');
      if (editingCategory?.id === cat.id) {
        setIsCreating(false);
        setEditingCategory(null);
      }
      onCategoriesUpdated();
    } catch (err) {
      toast((err as Error).message || 'Error eliminando categoría', 'error');
    }
  };

  const renderIconComponent = (iconName: string, className = 'w-4 h-4') => {
    const item = AVAILABLE_ICONS.find((i) => i.name === iconName);
    const Comp = item ? item.icon : Sparkles;
    return <Comp className={className} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="tenant-surface tenant-border w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b tenant-border flex items-center justify-between bg-slate-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg tenant-text leading-tight">
                Categorías de Servicios
              </h2>
              <p className="text-xs tenant-muted">
                Organiza tu catálogo para que tus clientes encuentren rápido lo que buscan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl tenant-muted hover:tenant-text hover:bg-slate-500/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Action Bar */}
          {!isCreating && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider tenant-muted">
                Categorías creadas ({categories.length})
              </span>
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white tenant-btn-primary flex items-center gap-1.5 shadow-md hover:opacity-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nueva Categoría
              </button>
            </div>
          )}

          {/* Form Create / Edit */}
          {isCreating ? (
            <form onSubmit={handleSave} className="p-4 rounded-2xl border tenant-border bg-slate-500/5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b tenant-border">
                <span className="font-bold text-sm tenant-text flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: badgeColor }}
                  />
                  {editingCategory ? 'Editar Categoría' : 'Crear Nueva Categoría'}
                </span>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs tenant-muted hover:tenant-text transition"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold tenant-muted mb-1">
                    Nombre de la Categoría *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ej. Branding & Identidad"
                    required
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tenant-muted mb-1">
                    Slug / URL amigable
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="ej. branding-identidad"
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tenant-muted mb-1">
                  Descripción breve (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe brevemente los servicios agrupados aquí..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-xs border tenant-border bg-transparent tenant-text focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-bold tenant-muted mb-1.5">
                  Color Identificador
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setBadgeColor(col)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform ${
                        badgeColor === col ? 'scale-110 ring-2 ring-white shadow-lg' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: col }}
                    >
                      {badgeColor === col && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-2">
                    <input
                      type="color"
                      value={badgeColor}
                      onChange={(e) => setBadgeColor(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-[10px] font-mono tenant-muted">{badgeColor}</span>
                  </div>
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-bold tenant-muted mb-1.5">
                  Ícono Representativo
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const Comp = item.icon;
                    const isSelected = icon === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setIcon(item.name)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-[10px] font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'border-violet-500 bg-violet-500/15 text-violet-500 font-bold shadow-sm'
                            : 'tenant-border hover:bg-slate-500/10 tenant-muted'
                        }`}
                      >
                        <Comp className="w-4 h-4" />
                        <span className="truncate w-full text-center">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview badge */}
              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs tenant-muted font-bold">Vista previa del tag:</span>
                <span
                  className="px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5"
                  style={{
                    backgroundColor: `${badgeColor}20`,
                    color: badgeColor,
                    borderColor: `${badgeColor}40`,
                    borderWidth: '1px',
                  }}
                >
                  {renderIconComponent(icon, 'w-3.5 h-3.5')}
                  {name || 'Nombre de la Categoría'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border tenant-border hover:bg-slate-500/10 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white tenant-btn-primary shadow-lg hover:opacity-95 transition flex items-center gap-1.5"
                >
                  {isSaving ? 'Guardando...' : editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          ) : null}

          {/* List of categories */}
          <div className="space-y-2">
            {categories.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed tenant-border">
                <FolderPlus className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
                <p className="text-sm font-bold tenant-text">No hay categorías creadas aún</p>
                <p className="text-xs tenant-muted mt-1">
                  Crea tu primera categoría para clasificar tus servicios (ej. Branding, Marketing, Web).
                </p>
              </div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl border tenant-border hover:border-violet-500/30 transition flex items-center justify-between gap-3 group bg-slate-500/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{
                        backgroundColor: `${cat.badgeColor || '#7c3aed'}20`,
                        color: cat.badgeColor || '#7c3aed',
                      }}
                    >
                      {renderIconComponent(cat.icon, 'w-5 h-5')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm tenant-text truncate">
                          {cat.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-500/10 tenant-muted">
                          /{cat.slug}
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-xs tenant-muted truncate mt-0.5 max-w-md">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="p-2 rounded-xl tenant-muted hover:tenant-text hover:bg-slate-500/10 transition cursor-pointer"
                      title="Editar categoría"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t tenant-border flex justify-end bg-slate-500/5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold border tenant-border hover:bg-slate-500/10 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
