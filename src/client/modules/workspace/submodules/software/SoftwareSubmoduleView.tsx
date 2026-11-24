import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../../context/AppContext';
import {
  SoftwareProject,
  SoftwareMilestone,
  SoftwareMilestoneStatus,
  SoftwareWorkItem,
  SoftwareWorkItemStatus,
  SoftwareCustomTemplate,
  SoftwareChangeRequest,
  SoftwareSprint,
  SoftwareTestCase,
  SoftwareGoLiveItem,
  SoftwareProjectRoleAssignment,
  Client,
  ServiceOrder,
  User,
} from '../../../../../shared/types';
import { SoftwareProjectsListView } from './SoftwareProjectsListView';
import { SoftwareProjectDetailView } from './SoftwareProjectDetailView';
import { SoftwareProjectModal } from './modals/SoftwareProjectModal';
import { SoftwareMilestoneModal } from './modals/SoftwareMilestoneModal';
import { SoftwareWorkItemModal } from './modals/SoftwareWorkItemModal';
import { SoftwareShareModal } from './modals/SoftwareShareModal';
import { DriveFolderPickerModal } from '../../../../components/DriveFolderPickerModal';

interface SoftwareSubmoduleViewProps {
  onBackToHub: () => void;
  initialProjects?: SoftwareProject[];
  clients?: Client[];
  serviceOrders?: ServiceOrder[];
  teamUsers?: User[];
  initialProjectId?: string | null;
}

export const SoftwareSubmoduleView: React.FC<SoftwareSubmoduleViewProps> = ({
  onBackToHub,
  initialProjects,
  clients: propClients,
  serviceOrders: propServiceOrders,
  teamUsers: propTeamUsers,
  initialProjectId = null,
}) => {
  const { apiFetch, toast, confirmAction, can, user, role, tenant } = useApp();
  const isAdm =
    user?.role === 'superadmin' ||
    user?.role === 'admin' ||
    !!role?.isSystem ||
    role?.permissions?.includes('*');
  const canManage = isAdm || can('workspace.software.manage');

  const [projects, setProjects] = useState<SoftwareProject[]>(initialProjects || []);
  const [customTemplates, setCustomTemplates] = useState<SoftwareCustomTemplate[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [loading, setLoading] = useState<boolean>(!(initialProjects && initialProjects.length > 0));
  const [isSaving, setIsSaving] = useState(false);

  const [clients, setClients] = useState<Client[]>(propClients || []);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(propServiceOrders || []);
  const [teamUsers, setTeamUsers] = useState<User[]>(propTeamUsers || []);

  useEffect(() => {
    if (propClients) setClients(propClients);
  }, [propClients]);

  useEffect(() => {
    if (propServiceOrders) setServiceOrders(propServiceOrders);
  }, [propServiceOrders]);

  useEffect(() => {
    if (propTeamUsers) setTeamUsers(propTeamUsers);
  }, [propTeamUsers]);

  // Modales
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<SoftwareProject> | null>(null);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Partial<SoftwareMilestone> | null>(null);
  const [workItemModalOpen, setWorkItemModalOpen] = useState(false);
  const [editingWorkItem, setEditingWorkItem] = useState<Partial<SoftwareWorkItem> | null>(null);
  const [shareModalProject, setShareModalProject] = useState<SoftwareProject | null>(null);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [pickedDriveFolder, setPickedDriveFolder] = useState<{
    id: string;
    name: string;
    webViewLink?: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    let mounted = true;
    // 1. Cargar proyectos primero y mostrar inmediatamente (sin esperar catálogos auxiliares)
    apiFetch<{ projects: SoftwareProject[] }>('/api/workspace/software')
      .then((projRes) => {
        if (!mounted) return;
        setProjects(projRes.projects || []);
      })
      .catch((err: any) => {
        if (!mounted) return;
        toast(err.message || 'Error al cargar proyectos de software', 'error');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // 2. Cargar plantillas y catálogos faltantes en segundo plano (no bloquean el render)
    apiFetch<{ templates: SoftwareCustomTemplate[] }>('/api/workspace/software/templates')
      .then((tplRes) => {
        if (mounted) setCustomTemplates(tplRes.templates || []);
      })
      .catch(() => {});

    if (propClients === undefined) {
      apiFetch<{ clients: Client[] }>('/api/clients')
        .then((cliRes) => {
          if (mounted) setClients(cliRes.clients || []);
        })
        .catch(() => {});
    }
    if (propServiceOrders === undefined) {
      apiFetch<{ serviceOrders?: ServiceOrder[]; orders?: ServiceOrder[] }>('/api/service-orders')
        .then((osRes) => {
          if (mounted) setServiceOrders(osRes.serviceOrders || osRes.orders || []);
        })
        .catch(() => {});
    }
    if (propTeamUsers === undefined) {
      apiFetch<{ users: User[] }>('/api/settings/users')
        .then((usrRes) => {
          if (mounted) setTeamUsers(usrRes.users || []);
        })
        .catch(() => {});
    }

    return () => {
      mounted = false;
    };
  }, [apiFetch, toast, tenant?.id]);

  useEffect(() => {
    setSelectedProjectId(initialProjectId || null);
    let cleanup: (() => void) | undefined;
    loadData().then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
    };
  }, [loadData, initialProjectId]);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || null;

  // Hidratar detalle completo (incluyendo media pesada) al abrir un proyecto
  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    apiFetch<{ project: SoftwareProject }>(`/api/workspace/software/${selectedProjectId}`)
      .then((res) => {
        if (!cancelled && res.project) {
          setProjects((prev) => prev.map((p) => (p.id === res.project.id ? res.project : p)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, apiFetch]);

  const replaceProjectInState = (updated: SoftwareProject) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (shareModalProject && shareModalProject.id === updated.id) {
      setShareModalProject(updated);
    }
  };

  // CRUD Proyecto
  const handleSaveProject = async (payload: Partial<SoftwareProject>) => {
    setIsSaving(true);
    try {
      if (payload.id) {
        const res = await apiFetch<{ project: SoftwareProject }>(
          `/api/workspace/software/${payload.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        replaceProjectInState(res.project);
        toast('Proyecto de software actualizado', 'success');
      } else {
        const res = await apiFetch<{ project: SoftwareProject }>('/api/workspace/software', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setProjects((prev) => [res.project, ...prev]);
        setSelectedProjectId(res.project.id);
        toast('¡Proyecto de software creado con sus hitos!', 'success');
      }
      setProjectModalOpen(false);
      setEditingProject(null);
      setPickedDriveFolder(null);
    } catch (err: any) {
      toast(err.message || 'Error al guardar proyecto', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (project: SoftwareProject) => {
    const ok = await confirmAction({
      title: '¿Eliminar proyecto de software?',
      message: `Se eliminará "${project.name}" junto con todos sus hitos, tareas y bugs QA.`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await apiFetch(`/api/workspace/software/${project.id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      if (selectedProjectId === project.id) setSelectedProjectId(null);
      toast('Proyecto eliminado', 'info');
    } catch (err: any) {
      toast(err.message || 'Error al eliminar proyecto', 'error');
    }
  };

  // CRUD Hitos
  const handleSaveMilestone = async (payload: Partial<SoftwareMilestone>) => {
    if (!activeProject) return;
    setIsSaving(true);
    try {
      if (payload.id) {
        const res = await apiFetch<{ project: SoftwareProject }>(
          `/api/workspace/software/${activeProject.id}/milestones/${payload.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        replaceProjectInState(res.project);
        toast('Hito actualizado', 'success');
      } else {
        const res = await apiFetch<{ project: SoftwareProject }>(
          `/api/workspace/software/${activeProject.id}/milestones`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        replaceProjectInState(res.project);
        toast('Nuevo hito agregado al roadmap', 'success');
      }
      setMilestoneModalOpen(false);
      setEditingMilestone(null);
    } catch (err: any) {
      toast(err.message || 'Error al guardar hito', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMilestone = async (milestone: SoftwareMilestone) => {
    if (!activeProject) return;
    const ok = await confirmAction({
      title: `¿Eliminar hito ${milestone.code}?`,
      message: `Se eliminará "${milestone.title}" y sus tareas técnicas asociadas.`,
      confirmText: 'Eliminar hito',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/milestones/${milestone.id}`,
        { method: 'DELETE' }
      );
      replaceProjectInState(res.project);
      toast('Hito eliminado', 'info');
    } catch (err: any) {
      toast(err.message || 'Error al eliminar hito', 'error');
    }
  };

  const handleReorderMilestones = async (orderedIds: string[]) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/milestones-reorder`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds }),
        }
      );
      replaceProjectInState(res.project);
    } catch (err: any) {
      toast(err.message || 'Error al reordenar hitos', 'error');
    }
  };

  const handleQuickMilestoneStatus = async (
    milestoneId: string,
    status: SoftwareMilestoneStatus
  ) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/milestones/${milestoneId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      replaceProjectInState(res.project);
      toast('Estado del hito actualizado', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al cambiar estado', 'error');
    }
  };

  // CRUD Tareas & Bugs
  const handleSaveWorkItem = async (payload: Partial<SoftwareWorkItem>) => {
    if (!activeProject) return;
    setIsSaving(true);
    try {
      if (payload.id) {
        const res = await apiFetch<{ project: SoftwareProject }>(
          `/api/workspace/software/${activeProject.id}/items/${payload.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        replaceProjectInState(res.project);
        toast('Ítem actualizado', 'success');
      } else {
        const res = await apiFetch<{ project: SoftwareProject }>(
          `/api/workspace/software/${activeProject.id}/items`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        replaceProjectInState(res.project);
        toast(payload.type === 'bug' ? 'Bug QA registrado' : 'Tarea técnica creada', 'success');
      }
      setWorkItemModalOpen(false);
      setEditingWorkItem(null);
    } catch (err: any) {
      toast(err.message || 'Error al guardar ítem', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkItem = async (itemId: string) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/items/${itemId}`,
        { method: 'DELETE' }
      );
      replaceProjectInState(res.project);
      setWorkItemModalOpen(false);
      setEditingWorkItem(null);
      toast('Ítem eliminado', 'info');
    } catch (err: any) {
      toast(err.message || 'Error al eliminar ítem', 'error');
    }
  };

  const handleMoveWorkItem = async (itemId: string, newStatus: SoftwareWorkItemStatus) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/items/${itemId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      replaceProjectInState(res.project);
    } catch (err: any) {
      toast(err.message || 'Error al mover ítem', 'error');
    }
  };

  const handleAddComment = async (milestoneId: string, text: string) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/milestones/${milestoneId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }
      );
      replaceProjectInState(res.project);
    } catch (err: any) {
      toast(err.message || 'Error al enviar comentario', 'error');
    }
  };

  const handleSaveShareSettings = async (updates: Partial<SoftwareProject>) => {
    if (!shareModalProject) return;
    setIsSaving(true);
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${shareModalProject.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );
      replaceProjectInState(res.project);
      toast('Configuración del enlace público guardada', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al guardar configuración pública', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Fase 1: Normalizar pesos al 100%
  const handleNormalizeWeights = async () => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/milestones-normalize-weights`,
        { method: 'PUT' }
      );
      replaceProjectInState(res.project);
      toast('Pesos de hitos normalizados al 100%', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al normalizar pesos', 'error');
    }
  };

  // Fase 1: Toggle de sub-entregable individual
  const handleToggleDeliverable = async (milestone: SoftwareMilestone, deliverableId: string) => {
    if (!activeProject) return;
    const baseItems =
      milestone.deliverableItems && milestone.deliverableItems.length > 0
        ? milestone.deliverableItems
        : (milestone.deliverables || []).map((title, idx) => ({
            id: `del_${milestone.id}_${idx}`,
            title,
            completed: milestone.status === 'approved',
          }));
    const updatedItems = baseItems.map((d) =>
      d.id === deliverableId
        ? { ...d, completed: !d.completed, completedAt: !d.completed ? new Date().toISOString() : undefined }
        : d
    );
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/milestones/${milestone.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deliverableItems: updatedItems,
            deliverables: updatedItems.map((d) => d.title),
          }),
        }
      );
      replaceProjectInState(res.project);
    } catch (err: any) {
      toast(err.message || 'Error al actualizar entregable', 'error');
    }
  };

  // Fase 1: Clonar proyecto completo con ajuste automático de fechas
  const handleCloneProject = async (project: SoftwareProject) => {
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${project.id}/clone`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${project.name} (Copia)`,
            startDate: new Date().toISOString().slice(0, 10),
          }),
        }
      );
      setProjects((prev) => [res.project, ...prev]);
      setSelectedProjectId(res.project.id);
      toast(`Proyecto clonado como ${res.project.code} con fechas ajustadas`, 'success');
    } catch (err: any) {
      toast(err.message || 'Error al clonar proyecto', 'error');
    }
  };

  // Fase 1: Guardar proyecto real como plantilla reutilizable
  const handleSaveAsTemplate = async (project: SoftwareProject) => {
    try {
      const res = await apiFetch<{ template: SoftwareCustomTemplate }>(
        '/api/workspace/software/templates',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceProjectId: project.id,
            name: `Plantilla: ${project.name}`,
          }),
        }
      );
      setCustomTemplates((prev) => [res.template, ...prev]);
      toast('Proyecto guardado como plantilla reutilizable', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al guardar plantilla', 'error');
    }
  };

  const handleDeleteCustomTemplate = async (templateId: string) => {
    try {
      await apiFetch(`/api/workspace/software/templates/${templateId}`, { method: 'DELETE' });
      setCustomTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast('Plantilla eliminada', 'info');
    } catch (err: any) {
      toast(err.message || 'Error al eliminar plantilla', 'error');
    }
  };

  // Fase 1: Control de Cambios de Alcance (Change Requests)
  const handleCreateChangeRequest = async (payload: Partial<SoftwareChangeRequest>) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/change-requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      replaceProjectInState(res.project);
      toast('Solicitud de cambio registrada', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al registrar solicitud de cambio', 'error');
    }
  };

  const handleUpdateChangeRequest = async (crId: string, updates: Partial<SoftwareChangeRequest>) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/change-requests/${crId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );
      replaceProjectInState(res.project);
      toast('Solicitud de cambio actualizada', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al actualizar solicitud de cambio', 'error');
    }
  };

  const handleDeleteChangeRequest = async (crId: string) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/change-requests/${crId}`,
        { method: 'DELETE' }
      );
      replaceProjectInState(res.project);
      toast('Solicitud de cambio eliminada', 'info');
    } catch (err: any) {
      toast(err.message || 'Error al eliminar solicitud de cambio', 'error');
    }
  };

  // Fase 2: Creación rápida inline en Kanban
  const handleQuickCreateWorkItem = async (payload: Partial<SoftwareWorkItem>) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      replaceProjectInState(res.project);
      toast('Tarea agregada', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al crear tarea rápida', 'error');
    }
  };

  // Fase 2: Cronómetro Play/Pause
  const handleToggleTimer = async (itemId: string) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/items/${itemId}/timer`,
        { method: 'POST' }
      );
      replaceProjectInState(res.project);
    } catch (err: any) {
      toast(err.message || 'Error al controlar cronómetro', 'error');
    }
  };

  // Fase 2: Bulk Actions
  const handleBulkUpdateItems = async (itemIds: string[], updates: Partial<SoftwareWorkItem>) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/items-bulk`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds, updates }),
        }
      );
      replaceProjectInState(res.project);
      toast(`${itemIds.length} ítems actualizados en lote`, 'success');
    } catch (err: any) {
      toast(err.message || 'Error en actualización masiva', 'error');
    }
  };

  // Fase 2: WIP Limits
  const handleUpdateWipLimits = async (wipLimits: Partial<Record<SoftwareWorkItemStatus, number>>) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wipLimits }),
        }
      );
      replaceProjectInState(res.project);
      toast('Límites WIP actualizados', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al guardar límites WIP', 'error');
    }
  };

  // Fase 2: Sprints
  const handleCreateSprint = async (payload: Partial<SoftwareSprint>) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/sprints`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      replaceProjectInState(res.project);
      toast('Sprint creado', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al crear sprint', 'error');
    }
  };

  const handleCloseSprint = async (sprintId: string, rolloverToSprintId?: string) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/sprints/${sprintId}/close`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rolloverToSprintId }),
        }
      );
      replaceProjectInState(res.project);
      toast('Sprint cerrado y tareas pendientes movidas', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al cerrar sprint', 'error');
    }
  };

  // Fase 3: Actualizar ítem directamente (QA re-test workflow)
  const handleUpdateWorkItem = async (itemId: string, updates: Partial<SoftwareWorkItem>) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/items/${itemId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );
      replaceProjectInState(res.project);
      toast('Estado QA actualizado', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al actualizar ítem', 'error');
    }
  };

  const handleToggleBlockOnCriticalBugs = async (enabled: boolean) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockMilestoneCloseOnCriticalBugs: enabled }),
        }
      );
      replaceProjectInState(res.project);
      toast(
        enabled ? 'Bloqueo de cierre con bugs Críticos activado' : 'Bloqueo desactivado',
        'info'
      );
    } catch (err: any) {
      toast(err.message || 'Error al cambiar política QA', 'error');
    }
  };

  const handleCreateTestCase = async (payload: Partial<SoftwareTestCase>) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/test-cases`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      replaceProjectInState(res.project);
      toast('Caso de prueba creado', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al crear caso de prueba', 'error');
    }
  };

  const handleUpdateTestCase = async (tcId: string, updates: Partial<SoftwareTestCase>) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/test-cases/${tcId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );
      replaceProjectInState(res.project);
    } catch (err: any) {
      toast(err.message || 'Error al actualizar caso de prueba', 'error');
    }
  };

  const handleDeleteTestCase = async (tcId: string) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/test-cases/${tcId}`,
        { method: 'DELETE' }
      );
      replaceProjectInState(res.project);
    } catch (err: any) {
      toast(err.message || 'Error al eliminar caso de prueba', 'error');
    }
  };

  const handleSaveGoLiveChecklist = async (items: SoftwareGoLiveItem[]) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/go-live`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goLiveChecklist: items }),
        }
      );
      replaceProjectInState(res.project);
    } catch (err: any) {
      toast(err.message || 'Error al guardar checklist Go-Live', 'error');
    }
  };

  // Fase 4: Reprogramar fechas desde Gantt Interactivo + Disponibilidad RR.HH.
  const handleUpdateMilestoneDates = async (milestoneId: string, startDate: string, dueDate: string) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/milestones/${milestoneId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate,
            dueDate,
            dateChangeReason: 'Reprogramado en Cronograma Gantt',
          }),
        }
      );
      replaceProjectInState(res.project);
      toast('Fechas del hito actualizadas', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al actualizar fechas del hito', 'error');
    }
  };

  const handleLoadTeamAvailability = async () => {
    if (!activeProject) return null;
    try {
      const res = await apiFetch<{
        absencesByUser: Record<string, Array<{ date: string; status: string; notes?: string }>>;
        capacityByUser: Record<string, { weeklyHours: number; status: string }>;
      }>(`/api/workspace/software/${activeProject.id}/team-availability`);
      return res;
    } catch {
      return null;
    }
  };

  // Fase 5 & 6: DevOps, Webhook, Health Check, Releases, Bóveda, Drive, Roles
  const handleUpdateProjectFields = async (updates: Partial<SoftwareProject>) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );
      replaceProjectInState(res.project);
      toast('Cambios guardados', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al guardar cambios', 'error');
    }
  };

  const handleRotateWebhookSecret = async () => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/webhook-secret`,
        { method: 'POST' }
      );
      replaceProjectInState(res.project);
      toast('URL de Webhook Git generada', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al generar webhook', 'error');
    }
  };

  const handleRunHealthCheck = async () => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/health-check`,
        { method: 'POST' }
      );
      replaceProjectInState(res.project);
      toast('Verificación de Uptime completada', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al verificar uptime', 'error');
    }
  };

  const handleCreateRelease = async (payload: {
    version: string;
    environment: 'staging' | 'production';
    notes: string;
    workItemIds: string[];
  }) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/releases`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      replaceProjectInState(res.project);
      toast(`Release ${payload.version} publicado`, 'success');
    } catch (err: any) {
      toast(err.message || 'Error al publicar release', 'error');
    }
  };

  const handleDeleteRelease = async (releaseId: string) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/releases/${releaseId}`,
        { method: 'DELETE' }
      );
      replaceProjectInState(res.project);
    } catch (err: any) {
      toast(err.message || 'Error al eliminar release', 'error');
    }
  };

  const handleCreateVaultCredential = async (payload: {
    label: string;
    category: string;
    hostOrUrl?: string;
    username?: string;
    secret: string;
    notes?: string;
  }) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/vault`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      replaceProjectInState(res.project);
      toast('Credencial cifrada guardada en la bóveda', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al guardar credencial', 'error');
    }
  };

  const handleRevealVaultCredential = async (credId: string): Promise<string | null> => {
    if (!activeProject) return null;
    try {
      const res = await apiFetch<{ secret: string }>(
        `/api/workspace/software/${activeProject.id}/vault/${credId}/reveal`,
        { method: 'POST' }
      );
      return res.secret;
    } catch (err: any) {
      toast(err.message || 'No se pudo descifrar la credencial', 'error');
      return null;
    }
  };

  const handleDeleteVaultCredential = async (credId: string) => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/vault/${credId}`,
        { method: 'DELETE' }
      );
      replaceProjectInState(res.project);
      toast('Credencial eliminada', 'info');
    } catch (err: any) {
      toast(err.message || 'Error al eliminar credencial', 'error');
    }
  };

  const handleScaffoldDriveSubfolders = async () => {
    if (!activeProject) return;
    try {
      const res = await apiFetch<{ project: SoftwareProject }>(
        `/api/workspace/software/${activeProject.id}/drive-scaffold`,
        { method: 'POST' }
      );
      replaceProjectInState(res.project);
      toast('Subcarpetas estándar de Drive generadas', 'success');
    } catch (err: any) {
      toast(err.message || 'Error al generar subcarpetas Drive', 'error');
    }
  };

  const handleUpdateProjectRoles = async (projectRoles: SoftwareProjectRoleAssignment[]) => {
    await handleUpdateProjectFields({ projectRoles });
  };

  const handleEscapeModals = () => {
    setProjectModalOpen(false);
    setMilestoneModalOpen(false);
    setWorkItemModalOpen(false);
    setShareModalProject(null);
    setDrivePickerOpen(false);
  };

  return (
    <>
      {activeProject ? (
        <SoftwareProjectDetailView
          project={activeProject}
          teamUsers={teamUsers}
          currentUserId={user?.id}
          canManage={canManage}
          onBack={() => setSelectedProjectId(null)}
          onEditProject={() => {
            setEditingProject(activeProject);
            setProjectModalOpen(true);
          }}
          onShareProject={() => setShareModalProject(activeProject)}
          onCloneProject={() => handleCloneProject(activeProject)}
          onSaveAsTemplate={() => handleSaveAsTemplate(activeProject)}
          onAddMilestone={() => {
            setEditingMilestone(null);
            setMilestoneModalOpen(true);
          }}
          onEditMilestone={(m) => {
            setEditingMilestone(m);
            setMilestoneModalOpen(true);
          }}
          onDeleteMilestone={handleDeleteMilestone}
          onReorderMilestones={handleReorderMilestones}
          onNormalizeWeights={handleNormalizeWeights}
          onQuickMilestoneStatus={handleQuickMilestoneStatus}
          onUpdateMilestoneDates={handleUpdateMilestoneDates}
          onLoadTeamAvailability={handleLoadTeamAvailability}
          onToggleDeliverable={handleToggleDeliverable}
          onAddWorkItem={(milestoneId, type, prefill) => {
            setEditingWorkItem({ milestoneId, type, status: 'todo', ...(prefill || {}) });
            setWorkItemModalOpen(true);
          }}
          onQuickCreateWorkItem={handleQuickCreateWorkItem}
          onEditWorkItem={(item) => {
            setEditingWorkItem(item);
            setWorkItemModalOpen(true);
          }}
          onUpdateWorkItem={handleUpdateWorkItem}
          onMoveWorkItem={handleMoveWorkItem}
          onToggleTimer={handleToggleTimer}
          onBulkUpdateItems={handleBulkUpdateItems}
          onUpdateWipLimits={handleUpdateWipLimits}
          onCreateSprint={handleCreateSprint}
          onCloseSprint={handleCloseSprint}
          onToggleBlockOnCriticalBugs={handleToggleBlockOnCriticalBugs}
          onCreateTestCase={handleCreateTestCase}
          onUpdateTestCase={handleUpdateTestCase}
          onDeleteTestCase={handleDeleteTestCase}
          onSaveGoLiveChecklist={handleSaveGoLiveChecklist}
          onAddComment={handleAddComment}
          onCreateChangeRequest={handleCreateChangeRequest}
          onUpdateChangeRequest={handleUpdateChangeRequest}
          onDeleteChangeRequest={handleDeleteChangeRequest}
          onUpdateProjectFields={handleUpdateProjectFields}
          onRotateWebhookSecret={handleRotateWebhookSecret}
          onRunHealthCheck={handleRunHealthCheck}
          onCreateRelease={handleCreateRelease}
          onDeleteRelease={handleDeleteRelease}
          onCreateVaultCredential={handleCreateVaultCredential}
          onRevealVaultCredential={handleRevealVaultCredential}
          onDeleteVaultCredential={handleDeleteVaultCredential}
          onScaffoldDriveSubfolders={handleScaffoldDriveSubfolders}
          onUpdateProjectRoles={handleUpdateProjectRoles}
          onEscapeModals={handleEscapeModals}
        />
      ) : (
        <SoftwareProjectsListView
          projects={projects}
          loading={loading}
          canManage={canManage}
          onBackToHub={onBackToHub}
          onSelectProject={(p) => setSelectedProjectId(p.id)}
          onCreateProject={() => {
            setEditingProject(null);
            setPickedDriveFolder(null);
            setProjectModalOpen(true);
          }}
          onEditProject={(p) => {
            setEditingProject(p);
            setPickedDriveFolder(null);
            setProjectModalOpen(true);
          }}
          onDeleteProject={handleDeleteProject}
          onShareProject={(p) => setShareModalProject(p)}
          onCloneProject={handleCloneProject}
          onSaveAsTemplate={handleSaveAsTemplate}
        />
      )}

      {/* Modales */}
      <SoftwareProjectModal
        isOpen={projectModalOpen}
        editingProject={editingProject}
        clients={clients}
        serviceOrders={serviceOrders}
        teamUsers={teamUsers}
        customTemplates={customTemplates}
        onDeleteCustomTemplate={handleDeleteCustomTemplate}
        isSaving={isSaving}
        onClose={() => {
          setProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        onOpenDrivePicker={() => setDrivePickerOpen(true)}
        selectedDriveFolder={pickedDriveFolder}
      />

      {activeProject && (
        <>
          <SoftwareMilestoneModal
            isOpen={milestoneModalOpen}
            editingMilestone={editingMilestone}
            allMilestones={activeProject.milestones}
            defaultStartDate={activeProject.startDate}
            defaultDueDate={activeProject.targetEndDate}
            isSaving={isSaving}
            onClose={() => {
              setMilestoneModalOpen(false);
              setEditingMilestone(null);
            }}
            onSave={handleSaveMilestone}
          />

          <SoftwareWorkItemModal
            isOpen={workItemModalOpen}
            editingItem={editingWorkItem}
            milestones={activeProject.milestones}
            sprints={activeProject.sprints}
            existingWorkItems={activeProject.workItems}
            teamUsers={teamUsers}
            isSaving={isSaving}
            onClose={() => {
              setWorkItemModalOpen(false);
              setEditingWorkItem(null);
            }}
            onSave={handleSaveWorkItem}
            onDelete={canManage ? handleDeleteWorkItem : undefined}
          />
        </>
      )}

      <SoftwareShareModal
        isOpen={Boolean(shareModalProject)}
        project={shareModalProject}
        isSaving={isSaving}
        onClose={() => setShareModalProject(null)}
        onSaveSettings={handleSaveShareSettings}
      />

      <DriveFolderPickerModal
        isOpen={drivePickerOpen}
        onClose={() => setDrivePickerOpen(false)}
        currentSelectedId={pickedDriveFolder?.id || editingProject?.driveFolderId}
        title="Vincular Carpeta de Google Drive al Proyecto"
        subtitle="Selecciona la carpeta donde se alojarán backups, entregables o documentación técnica."
        onSelect={(folder) => {
          setPickedDriveFolder({
            id: folder.id,
            name: folder.name,
            webViewLink: folder.webViewLink,
          });
          setDrivePickerOpen(false);
        }}
      />
    </>
  );
};
