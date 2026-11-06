import React, { useState, useEffect } from 'react';
import { WorkspaceForm } from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';
import { FormsListView } from './FormsListView';
import { FormBuilderView } from './FormBuilderView';

interface FormsSubmoduleViewProps {
  onBackToHub: () => void;
}

export const FormsSubmoduleView: React.FC<FormsSubmoduleViewProps> = ({ onBackToHub }) => {
  const { apiFetch, toast, confirmAction } = useApp();
  const [forms, setForms] = useState<WorkspaceForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'builder'>('list');
  const [selectedForm, setSelectedForm] = useState<WorkspaceForm | null>(null);

  const loadForms = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ forms: WorkspaceForm[] }>('/api/workspace/forms');
      setForms(res.forms || []);
    } catch {
      toast('Error al sincronizar formularios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleOpenCreateForm = () => {
    setSelectedForm(null);
    setViewMode('builder');
  };

  const handleOpenEditForm = (form: WorkspaceForm) => {
    setSelectedForm(form);
    setViewMode('builder');
  };

  const handleOpenPreview = (form: WorkspaceForm) => {
    setSelectedForm(form);
    setViewMode('builder');
  };

  const handleDuplicateForm = async (form: WorkspaceForm) => {
    try {
      const res = await apiFetch<{ form: WorkspaceForm }>(
        `/api/workspace/forms/${form.id}/duplicate`,
        { method: 'POST' }
      );
      setForms((prev) => [res.form, ...prev]);
      toast(`Formulario "${form.title}" duplicado con éxito`, 'success');
    } catch {
      toast('Error al duplicar el formulario', 'error');
    }
  };

  const handleDeleteForm = async (form: WorkspaceForm) => {
    const ok = await confirmAction({
      title: '¿Eliminar Formulario?',
      message: `¿Estás seguro de eliminar el formulario "${form.title}"? También se eliminarán todas las respuestas recibidas asociadas.`,
      confirmText: 'Sí, eliminar formulario',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/workspace/forms/${form.id}`, { method: 'DELETE' });
      setForms((prev) => prev.filter((f) => f.id !== form.id));
      toast('Formulario eliminado correctamente', 'success');
    } catch {
      toast('Error al eliminar formulario', 'error');
    }
  };

  const handleFormSaved = (savedForm: WorkspaceForm) => {
    setForms((prev) => {
      const exists = prev.some((f) => f.id === savedForm.id);
      if (exists) {
        return prev.map((f) => (f.id === savedForm.id ? savedForm : f));
      }
      return [savedForm, ...prev];
    });
    setSelectedForm(savedForm);
  };

  if (viewMode === 'builder') {
    return (
      <FormBuilderView
        initialForm={selectedForm}
        onBack={() => {
          setViewMode('list');
          setSelectedForm(null);
          loadForms();
        }}
        onSaved={handleFormSaved}
      />
    );
  }

  return (
    <FormsListView
      forms={forms}
      loading={loading}
      onBackToHub={onBackToHub}
      onOpenCreateForm={handleOpenCreateForm}
      onOpenEditForm={handleOpenEditForm}
      onDuplicateForm={handleDuplicateForm}
      onDeleteForm={handleDeleteForm}
      onOpenPreview={handleOpenPreview}
    />
  );
};
