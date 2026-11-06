import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  WorkspacePost,
  WorkspaceTask,
  WorkspaceProject,
  WorkspaceMonth,
  WorkspaceMonthStatus,
  ServiceOrder,
  SocialPostPlatform,
  SocialPostStatus,
  TaskStatus,
  Client,
  User as UserType,
  WorkspaceForm,
  WorkspaceMeeting,
  Whiteboard,
} from '../../shared/types';
import { DriveFolderPickerModal } from '../components/DriveFolderPickerModal';
import { PaintCanvasModal } from '../components/PaintCanvasModal';
import { WorkspacePresentationModal } from '../components/WorkspacePresentationModal';
import {
  POST_STATUS_MAP,
  TASK_STATUS_MAP,
  MONTH_NAMES,
  DEFAULT_MONTH_SUBFOLDERS,
  getMonthDateDefaults,
} from './workspace/types';

// Submódulos
import { WorkspaceHubView } from './workspace/submodules/hub/WorkspaceHubView';
import { SocialProjectsView } from './workspace/submodules/social/SocialProjectsView';
import { SocialMonthsView } from './workspace/submodules/social/SocialMonthsView';
import { SocialPostsGridView } from './workspace/submodules/social/SocialPostsGridView';
import { SocialKanbanView } from './workspace/submodules/social/SocialKanbanView';
import { TasksView } from './workspace/submodules/tasks/TasksView';
import { DriveModule } from './DriveModule';
import { ToolsModuleView } from './workspace/submodules/tools/ToolsModuleView';
import { FormsSubmoduleView } from './workspace/submodules/forms/FormsSubmoduleView';
import { MeetingsSubmoduleView } from './workspace/submodules/meetings/MeetingsSubmoduleView';
import { WhiteboardsSubmoduleView } from './workspace/submodules/whiteboards/WhiteboardsSubmoduleView';

// Modales
import { ProjectModal } from './workspace/modals/ProjectModal';
import { MonthModal, MonthFormData } from './workspace/modals/MonthModal';
import { PostEditorModal } from './workspace/modals/PostEditorModal';
import { TaskModal } from './workspace/modals/TaskModal';
import { PostPublicPreviewModal } from './workspace/modals/PostPublicPreviewModal';
import { ShareMonthModal } from './workspace/modals/ShareMonthModal';
import { DriveFolderUploadModal } from './workspace/modals/DriveFolderUploadModal';
import { X } from 'lucide-react';

export const WorkspaceModule: React.FC = () => {
  const { tenant, user, toast, confirmAction, apiFetch } = useApp();

  // Nivel 0: Navegación de Submódulos ('hub', 'social', 'tasks', 'drive', 'tools', 'forms', 'meetings', 'whiteboards')
  const [currentView, setCurrentView] = useState<'hub' | 'social' | 'tasks' | 'drive' | 'tools' | 'forms' | 'meetings' | 'whiteboards'>('hub');
  const [forms, setForms] = useState<WorkspaceForm[]>([]);
  const [meetings, setMeetings] = useState<WorkspaceMeeting[]>([]);
  const [whiteboardsCount, setWhiteboardsCount] = useState<number>(0);

  // Nivel 1: Fases de Redes Sociales
  // 1 = Proyectos de Redes Sociales
  // 2 = Meses / Campañas del Proyecto
  // 3 = Grilla de Publicaciones / Calendario / Kanban
  const [socialPhase, setSocialPhase] = useState<1 | 2 | 3>(1);
  const [socialViewMode, setSocialViewMode] = useState<'grid' | 'kanban'>('grid');
  const [socialSearch, setSocialSearch] = useState('');
  const [socialStatusFilter, setSocialStatusFilter] = useState('all');

  // FASE 1: PROYECTOS
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [teamUsers, setTeamUsers] = useState<UserType[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Partial<WorkspaceProject> | null>(null);

  // FASE 2 & 3: PUBLICACIONES DE REDES & MESES
  const [months, setMonths] = useState<WorkspaceMonth[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
  const [isSubmittingMonth, setIsSubmittingMonth] = useState(false);
  const [monthForm, setMonthForm] = useState<MonthFormData>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    name: '',
    startDate: '',
    endDate: '',
    status: 'pending',
  });
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [posts, setPosts] = useState<WorkspacePost[]>([]);
  const [editingPost, setEditingPost] = useState<Partial<WorkspacePost> | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postModalTab, setPostModalTab] = useState<'grid_idea' | 'design' | 'approval' | 'comments'>('grid_idea');
  const [publicPreviewPost, setPublicPreviewPost] = useState<WorkspacePost | null>(null);
  const [lightboxPreviewUrl, setLightboxPreviewUrl] = useState<string | null>(null);
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const [isUploadingFinalArt, setIsUploadingFinalArt] = useState(false);

  // SUBMÓDULO: TAREAS OPERATIVAS
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [tasksViewMode, setTasksViewMode] = useState<'kanban' | 'list'>('kanban');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskClientFilter, setTaskClientFilter] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('all');
  const [editingTask, setEditingTask] = useState<Partial<WorkspaceTask> | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // MODALES ADICIONALES: Paint, Presentación, Compartir con PIN, Subida a Drive
  const [isPaintModalOpen, setIsPaintModalOpen] = useState(false);
  const [isWorkspacePresentationOpen, setIsWorkspacePresentationOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDriveFolderUploadModalOpen, setIsDriveFolderUploadModalOpen] = useState(false);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [pickerTargetProject, setPickerTargetProject] = useState<WorkspaceProject | null>(null);

  const [loading, setLoading] = useState(true);

  // Cargar datos iniciales
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [
        clientsRes,
        usersRes,
        postsRes,
        tasksRes,
        projectsRes,
        osRes,
        monthsRes,
        formsRes,
        meetingsRes,
        whiteboardsRes,
      ] = await Promise.all([
        apiFetch<{ clients: Client[] }>('/api/clients').catch(() => ({ clients: [] })),
        apiFetch<{ users: UserType[] }>('/api/settings/users').catch(() => ({ users: [] })),
        apiFetch<{ posts: WorkspacePost[] }>('/api/workspace/posts').catch(() => ({ posts: [] })),
        apiFetch<{ tasks: WorkspaceTask[] }>('/api/workspace/tasks').catch(() => ({ tasks: [] })),
        apiFetch<{ projects: WorkspaceProject[] }>('/api/workspace/projects').catch(() => ({ projects: [] })),
        apiFetch<{ serviceOrders?: ServiceOrder[]; orders?: ServiceOrder[] }>('/api/service-orders').catch(() => ({ serviceOrders: [], orders: [] })),
        apiFetch<{ months: WorkspaceMonth[] }>('/api/workspace/months').catch(() => ({ months: [] })),
        apiFetch<{ forms: WorkspaceForm[] }>('/api/workspace/forms').catch(() => ({ forms: [] })),
        apiFetch<{ meetings: WorkspaceMeeting[] }>('/api/workspace/meetings').catch(() => ({ meetings: [] })),
        apiFetch<{ whiteboards: Whiteboard[] }>('/api/workspace/whiteboards').catch(() => ({ whiteboards: [] })),
      ]);
      setClients(clientsRes.clients || []);
      setTeamUsers(usersRes.users || []);
      setPosts(postsRes.posts || []);
      setTasks(tasksRes.tasks || []);
      setProjects(projectsRes.projects || []);
      setServiceOrders(osRes.serviceOrders || osRes.orders || []);
      setMonths(monthsRes.months || []);
      setForms(formsRes.forms || []);
      setMeetings(meetingsRes.meetings || []);
      setWhiteboardsCount(whiteboardsRes.whiteboards?.length || 0);
    } catch {
      toast('Error al sincronizar datos del Workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Escuchar evento personalizado desde el sidebar o AppShell
  useEffect(() => {
    const handleOpenWorkspaceSubview = (e: any) => {
      const detail = e.detail;
      if (detail === 'social' || detail === 'tasks' || detail === 'drive' || detail === 'hub' || detail === 'tools' || detail === 'forms' || detail === 'meetings' || detail === 'whiteboards') {
        setCurrentView(detail);
        if (detail === 'social') {
          setSocialPhase(1);
          setSelectedProjectId(null);
          setSelectedMonthId(null);
        }
      }
    };
    window.addEventListener('roma-open-workspace-subview', handleOpenWorkspaceSubview);
    return () => {
      window.removeEventListener('roma-open-workspace-subview', handleOpenWorkspaceSubview);
    };
  }, []);

  // PROYECTOS LOGIC & HANDLERS
  const handleOpenNewProject = () => {
    const activeOrders = serviceOrders.filter((o) => o.status !== 'cancelled');
    const firstOrder = activeOrders[0];

    if (firstOrder) {
      handleSelectServiceOrderForNew(firstOrder.id);
    } else {
      const firstClient = clients[0];
      setEditingProject({
        name: 'Nuevo Proyecto de Redes',
        clientId: firstClient ? firstClient.id : '',
        clientName: firstClient ? firstClient.name : '',
        brandId: firstClient?.brands?.[0]?.id || '',
        brandName: firstClient?.brands?.[0]?.name || '',
        status: 'active',
        budget: 0,
        budgetCurrency: 'PEN',
        platforms: ['instagram', 'facebook'],
        contractedPosts: 12,
        contractedReels: 4,
        contractedStories: 20,
        assignedUsers: teamUsers.slice(0, 2).map((u) => ({ id: u.id, name: u.name, role: u.jobTitle })),
        periodStart: new Date().toISOString().split('T')[0],
        periodEnd: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      });
      setIsProjectModalOpen(true);
    }
  };

  const handleSelectServiceOrderForNew = (osId: string) => {
    if (!osId) {
      setEditingProject((prev) => ({
        ...prev,
        serviceOrderId: '',
        serviceOrderCode: '',
        serviceOrderToken: '',
        name: 'Nuevo Proyecto de Redes',
      }));
      return;
    }

    const os = serviceOrders.find((o) => o.id === osId);
    if (!os) return;

    const clientObj = clients.find((c) => c.id === os.clientId);
    const assignedMembers = (os.assignedTeam || []).map((m) => ({
      id: m.userId,
      name: m.userName,
      role: m.role || 'Especialista',
    }));

    const brandName = os.brandName || clientObj?.brands?.[0]?.name || os.clientName || 'Marca';
    const brandId = os.brandId || clientObj?.brands?.[0]?.id || '';

    setEditingProject({
      name: `Campaña ${brandName} - ${os.code}`,
      serviceOrderId: os.id,
      serviceOrderCode: os.code,
      serviceOrderToken: os.publicToken || '',
      clientId: os.clientId,
      clientName: os.clientName,
      brandId,
      brandName,
      status: 'active',
      budget: os.total || 0,
      budgetCurrency: os.currency || 'PEN',
      platforms: ['instagram', 'facebook'],
      contractedPosts: 12,
      contractedReels: 4,
      contractedStories: 20,
      assignedUsers: assignedMembers.length > 0 ? assignedMembers : teamUsers.slice(0, 2).map((u) => ({ id: u.id, name: u.name, role: u.jobTitle })),
      periodStart: os.startDate || new Date().toISOString().split('T')[0],
      periodEnd: os.deliveryDate || new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
    });
    setIsProjectModalOpen(true);
  };

  const handleTogglePlatform = (plat: SocialPostPlatform) => {
    if (!editingProject) return;
    const current = editingProject.platforms || [];
    const exists = current.includes(plat);
    setEditingProject({
      ...editingProject,
      platforms: exists ? current.filter((p) => p !== plat) : [...current, plat],
    });
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.name?.trim()) {
      toast('Ingresa el nombre del proyecto', 'error');
      return;
    }
    if (!editingProject.clientId) {
      toast('Selecciona un cliente o una Orden de Servicio', 'error');
      return;
    }

    try {
      setIsSavingProject(true);
      if (editingProject.id) {
        const res = await apiFetch<{ project: WorkspaceProject }>(
          `/api/workspace/projects/${editingProject.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingProject),
          }
        );
        setProjects((prev) => prev.map((p) => (p.id === res.project.id ? res.project : p)));
        toast('Proyecto de redes actualizado con éxito', 'success');
      } else {
        const res = await apiFetch<{ project: WorkspaceProject; driveFoldersCreated?: boolean }>(
          '/api/workspace/projects',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingProject),
          }
        );
        setProjects((prev) => [res.project, ...prev]);
        toast(
          res.driveFoldersCreated
            ? 'Proyecto y carpeta de Google Drive creados con éxito'
            : 'Proyecto de redes sociales creado exitosamente',
          'success'
        );
      }
      setIsProjectModalOpen(false);
      setEditingProject(null);
    } catch (err: any) {
      toast(err.message || 'Error al guardar el proyecto', 'error');
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleToggleArchiveProject = async (proj: WorkspaceProject) => {
    try {
      const nextStatus = proj.status === 'archived' ? 'active' : 'archived';
      const res = await apiFetch<{ project: WorkspaceProject }>(
        `/api/workspace/projects/${proj.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      setProjects((prev) => prev.map((p) => (p.id === res.project.id ? res.project : p)));
      toast(
        nextStatus === 'archived' ? 'Proyecto archivado' : 'Proyecto desarchivado y activo',
        'info'
      );
    } catch {
      toast('Error al cambiar estado del proyecto', 'error');
    }
  };

  const handleDeleteProject = async (proj: WorkspaceProject) => {
    const ok = await confirmAction({
      title: '¿Eliminar proyecto?',
      message: `¿Estás seguro de eliminar el proyecto "${proj.name}"? Esta acción borrará también sus meses y publicaciones asociadas.`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/workspace/projects/${proj.id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== proj.id));
      setMonths((prev) => prev.filter((m) => m.projectId !== proj.id));
      setPosts((prev) => prev.filter((p) => p.projectId !== proj.id));
      if (selectedProjectId === proj.id) {
        setSelectedProjectId(null);
        setSocialPhase(1);
      }
      toast('Proyecto eliminado correctamente', 'success');
    } catch {
      toast('Error al eliminar proyecto', 'error');
    }
  };

  const handleOpenOsWebView = (codeOrProj?: string | WorkspaceProject) => {
    let serviceOrderCode = '';
    if (typeof codeOrProj === 'string') {
      serviceOrderCode = codeOrProj;
    } else if (codeOrProj) {
      serviceOrderCode = codeOrProj.serviceOrderCode || '';
    }
    if (!serviceOrderCode) {
      toast('No hay código de Orden de Servicio disponible', 'info');
      return;
    }
    const matched = serviceOrders.find((o) => o.code === serviceOrderCode);
    const token = matched?.publicToken || serviceOrderCode;
    window.open(`/os/${token}`, '_blank');
  };

  // MESES LOGIC & HANDLERS
  const handleOpenNewMonth = () => {
    const d = new Date();
    const curMonth = d.getMonth() + 1;
    const curYear = d.getFullYear();
    const def = getMonthDateDefaults(curMonth, curYear);
    setMonthForm({
      month: curMonth,
      year: curYear,
      name: def.name,
      startDate: def.startDate,
      endDate: def.endDate,
      status: 'pending',
      isEditing: false,
    });
    setIsMonthModalOpen(true);
  };

  const handleOpenEditMonth = (m: WorkspaceMonth) => {
    setMonthForm({
      month: m.month,
      year: m.year,
      name: m.name,
      startDate: m.startDate,
      endDate: m.endDate,
      status: m.status,
      isEditing: true,
      editingId: m.id,
    });
    setIsMonthModalOpen(true);
  };

  const handleDeleteMonth = async (m: WorkspaceMonth) => {
    const ok = await confirmAction({
      title: '¿Eliminar mes de contenido?',
      message: `¿Deseas eliminar el mes "${m.name}"? Los posts asociados también se borrarán.`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/workspace/months/${m.id}`, { method: 'DELETE' });
      setMonths((prev) => prev.filter((item) => item.id !== m.id));
      setPosts((prev) => prev.filter((item) => item.monthId !== m.id));
      toast('Mes eliminado exitosamente', 'success');
      if (selectedMonthId === m.id) {
        setSelectedMonthId(null);
        setSocialPhase(2);
      }
    } catch {
      toast('Error al eliminar mes', 'error');
    }
  };

  const handleSaveMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      setIsSubmittingMonth(true);
      if (monthForm.isEditing && monthForm.editingId) {
        const res = await apiFetch<{ month: WorkspaceMonth }>(
          `/api/workspace/months/${monthForm.editingId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(monthForm),
          }
        );
        setMonths((prev) => prev.map((m) => (m.id === res.month.id ? res.month : m)));
        toast('Mes actualizado con éxito', 'success');
      } else {
        const res = await apiFetch<{
          month: WorkspaceMonth;
          driveFolderCreated?: boolean;
          subfoldersCreatedCount?: number;
        }>('/api/workspace/months', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...monthForm,
            projectId: selectedProjectId,
          }),
        });
        setMonths((prev) => [...prev, res.month]);
        if (res.driveFolderCreated) {
          toast(
            `Mes creado con su carpeta en Drive y ${res.subfoldersCreatedCount || 7} subcarpetas`,
            'success'
          );
        } else {
          toast('Mes de contenido creado exitosamente', 'success');
        }
      }
      setIsMonthModalOpen(false);
    } catch (err: any) {
      toast(err.message || 'Error al guardar el mes', 'error');
    } finally {
      setIsSubmittingMonth(false);
    }
  };

  const getMonthStats = (m: WorkspaceMonth) => {
    const monthPosts = posts.filter((p) => p.monthId === m.id || (m.projectId && p.projectId === m.projectId));
    const total = monthPosts.length;
    const drafts = monthPosts.filter((p) => p.status === 'idea' || p.status === 'writing').length;
    const review = monthPosts.filter((p) => p.status === 'review' || p.status === 'design').length;
    const approved = monthPosts.filter((p) => p.status === 'approved').length;
    const published = monthPosts.filter((p) => p.status === 'published').length;
    const comments = monthPosts.reduce((acc, p) => acc + (p.comments?.length || 0), 0);
    const progress = total > 0 ? Math.round((published / total) * 100) : 0;
    return {
      totalPosts: total,
      drafts,
      review,
      approved,
      published,
      comments,
      progressPercent: progress,
    };
  };

  // POSTS LOGIC & HANDLERS
  const handleOpenNewPost = () => {
    if (!selectedProjectId) return;
    const proj = projects.find((p) => p.id === selectedProjectId);
    const m = months.find((item) => item.id === selectedMonthId);
    const nowIso = new Date().toISOString();
    const defaultDate = nowIso.split('T')[0];

    const currentMonthPosts = posts.filter(
      (p) => p.monthId === selectedMonthId || (selectedProjectId && p.projectId === selectedProjectId)
    );
    const nextPostNumber = currentMonthPosts.length + 1;

    setEditingPost({
      projectId: selectedProjectId,
      monthId: selectedMonthId || undefined,
      brandName: proj?.brandName || proj?.name || 'Marca',
      title: `Post ${String(nextPostNumber).padStart(2, '0')}`,
      postNumber: nextPostNumber,
      pillar: 'Educación',
      contentPillar: 'Educación',
      format: 'post',
      status: 'idea',
      initialDate: defaultDate,
      deliveryDate: defaultDate,
      scheduledDate: defaultDate,
      periodicity: 'Única vez',
      reminder: 'Ninguno',
      platforms: proj?.platforms?.length ? [proj.platforms[0]] : ['instagram'],
      milestones: [
        {
          id: `m-1`,
          stepNumber: 1,
          title: 'Hito 1: Estructuración y Copys',
          completed: false,
          description: '',
        },
        {
          id: `m-2`,
          stepNumber: 2,
          title: 'Hito 2: Diseño de Arte y Pieza Visual',
          completed: false,
          description: '',
        },
        {
          id: `m-3`,
          stepNumber: 3,
          title: 'Hito 3: Aprobación Interna QA y Entrega al Cliente',
          completed: false,
          description: '',
        },
      ],
      qaChecklist: {
        spelling: false,
        logoIdentity: false,
        formatResolution: false,
        ctaLinks: false,
      },
      clientApprovalStatus: 'idea',
    });
    setPostModalTab('grid_idea');
    setIsPostModalOpen(true);
  };

  const handleOpenEditPost = (post: WorkspacePost) => {
    setEditingPost({ ...post });
    setPostModalTab('grid_idea');
    setIsPostModalOpen(true);
  };

  const handleSavePost = async () => {
    if (!editingPost || !editingPost.title?.trim()) {
      toast('Ingresa un título para la publicación', 'error');
      return;
    }

    try {
      if (editingPost.id) {
        const res = await apiFetch<{ post: WorkspacePost }>(
          `/api/workspace/posts/${editingPost.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingPost),
          }
        );
        setPosts((prev) => prev.map((p) => (p.id === res.post.id ? res.post : p)));
        toast('Publicación actualizada correctamente', 'success');
      } else {
        const res = await apiFetch<{ post: WorkspacePost }>('/api/workspace/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingPost),
        });
        setPosts((prev) => [res.post, ...prev]);
        toast('Publicación creada exitosamente', 'success');
      }
      setIsPostModalOpen(false);
      setEditingPost(null);
    } catch (err: any) {
      toast(err.message || 'Error al guardar publicación', 'error');
    }
  };

  const handleDeletePost = async (id: string, title: string) => {
    const ok = await confirmAction({
      title: '¿Eliminar publicación?',
      message: `¿Deseas eliminar la publicación "${title}"?`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/workspace/posts/${id}`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast('Publicación eliminada correctamente', 'success');
    } catch {
      toast('Error al eliminar publicación', 'error');
    }
  };

  const handleQuickChangePostStatus = async (post: WorkspacePost, nextStatus: SocialPostStatus) => {
    try {
      const res = await apiFetch<{ post: WorkspacePost }>(`/api/workspace/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      setPosts((prev) => prev.map((p) => (p.id === res.post.id ? res.post : p)));
      toast(`Estado cambiado a: ${POST_STATUS_MAP[nextStatus]?.label || nextStatus}`, 'info');
    } catch {
      toast('Error al actualizar estado del post', 'error');
    }
  };

  const handleToggleArchivePost = async (post: WorkspacePost) => {
    try {
      const nextStatus: SocialPostStatus = post.status === 'archived' ? 'idea' : 'archived';
      const res = await apiFetch<{ post: WorkspacePost }>(`/api/workspace/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      setPosts((prev) => prev.map((p) => (p.id === res.post.id ? res.post : p)));
      toast(
        nextStatus === 'archived'
          ? `Publicación "${post.title}" archivada`
          : `Publicación "${post.title}" desarchivada`,
        'success'
      );
    } catch (err: any) {
      toast(err.message || 'Error al actualizar estado de archivo', 'error');
    }
  };

  const handleSharePost = async (post: WorkspacePost) => {
    const shareUrl = `${window.location.origin}/portal/review/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'Revisión de Contenido',
          text: `Revisa la publicación: ${post.title}`,
          url: shareUrl,
        });
        toast('Enlace compartido con éxito', 'success');
        return;
      } catch {}
    }
    navigator.clipboard.writeText(shareUrl);
    toast('Enlace público copiado al portapapeles', 'success');
  };

  const handleUploadMediaFile = async (file: File, target: 'reference' | 'finalArt') => {
    if (!file) return;

    if (target === 'reference') setIsUploadingRef(true);
    else setIsUploadingFinalArt(true);

    try {
      const token = localStorage.getItem('roma_saas_token');
      const activeProj = projects.find((p) => p.id === selectedProjectId);
      const activeM = months.find((m) => m.id === selectedMonthId);

      let targetFolderId = activeProj?.driveFolderId;
      if (activeM) {
        if (target === 'reference') {
          const refSub = (activeM.driveSubfolders || []).find((s) => s.name.includes('REFERENCIAS'));
          targetFolderId = refSub?.driveFolderId || activeM.driveFolderId || targetFolderId;
        } else {
          const postSub = (activeM.driveSubfolders || []).find((s) => s.name.includes('POST TERMINADOS'));
          targetFolderId = postSub?.driveFolderId || activeM.driveFolderId || targetFolderId;
        }
      }

      const formData = new FormData();
      formData.append('file', file);
      if (targetFolderId) formData.append('parentFolderId', targetFolderId);
      if (activeProj?.clientId) formData.append('clientId', activeProj.clientId);
      formData.append('category', target === 'reference' ? 'reference_media' : 'final_art');

      const response = await fetch('/api/drive/upload-stream', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error en la subida');
      }

      const resData = await response.json();
      const uploadedFile = resData.file;

      if (uploadedFile) {
        const googleFileId = uploadedFile.id;
        const streamUrl = `/api/drive/stream/${googleFileId}`;

        if (target === 'reference') {
          setEditingPost((prev) =>
            prev
              ? {
                  ...prev,
                  referenceMediaUrl: streamUrl,
                  referenceMediaDriveId: googleFileId,
                  referenceMediaName: file.name,
                }
              : null
          );
          toast(`Referencia visual guardada en Google Drive (Carpeta /REFERENCIAS)`, 'success');
        } else {
          setEditingPost((prev) =>
            prev
              ? {
                  ...prev,
                  finalArtMediaUrl: streamUrl,
                  finalArtDriveId: googleFileId,
                  finalArtMediaName: file.name,
                  mediaUrl: prev.mediaUrl?.startsWith('data:')
                    ? prev.mediaUrl
                    : (streamUrl || uploadedFile?.thumbnailLink || prev.mediaUrl),
                }
              : null
          );
          toast(`Arte Final guardado en Google Drive (Carpeta /POST TERMINADOS)`, 'success');
        }
      } else {
        toast(`Archivo cargado como recurso local (Drive no disponible)`, 'info');
      }
    } catch (err: any) {
      console.error('Error al subir a Drive:', err);
      toast('Archivo cargado en vista previa', 'info');
    } finally {
      if (target === 'reference') setIsUploadingRef(false);
      else setIsUploadingFinalArt(false);
    }
  };

  // TAREAS LOGIC & HANDLERS
  const handleOpenNewTask = (status: TaskStatus = 'pending') => {
    const today = new Date().toISOString().split('T')[0];
    const defaultDueDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    setEditingTask({
      status,
      priority: 'medium',
      frequency: 'one_time',
      category: 'General / Operativa',
      clientId: clients[0]?.id || '',
      clientName: clients[0]?.name || '',
      startDate: today,
      dueDate: defaultDueDate,
      tags: [],
      milestones: [
        {
          id: `ms-${Date.now()}`,
          title: 'Requerimientos & Briefing Inicial',
          descriptionHtml: '',
          completed: false,
          collapsed: false,
          attachments: [],
        },
      ],
      assignedUsers: user
        ? [
            {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              jobTitle: user.jobTitle,
            },
          ]
        : [],
      assignedUserId: user?.id,
      assignedUserName: user?.name,
    });
    setIsTaskModalOpen(true);
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await apiFetch<{ task: WorkspaceTask }>(`/api/workspace/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
      toast('Error al actualizar el estado de la tarea', 'error');
    }
  };

  const handleTogglePinTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newPinned = !task.isPinned;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isPinned: newPinned } : t))
    );

    try {
      await apiFetch<{ task: WorkspaceTask }>(`/api/workspace/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newPinned }),
      });
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, isPinned: task.isPinned } : t))
      );
      toast('Error al actualizar fijado de la tarea', 'error');
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newArchived = !task.isArchived;

    try {
      await apiFetch<{ task: WorkspaceTask }>(`/api/workspace/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: newArchived }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, isArchived: newArchived } : t))
      );
      setIsTaskModalOpen(false);
      setEditingTask(null);
      toast(newArchived ? 'Tarea archivada' : 'Tarea desarchivada', 'success');
    } catch {
      toast('Error al archivar la tarea', 'error');
    }
  };

  const handleOpenEditTask = (task: WorkspaceTask) => {
    setEditingTask({ ...task });
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title?.trim()) {
      toast('Ingresa el título de la tarea', 'error');
      return;
    }

    try {
      if (editingTask.id) {
        const res = await apiFetch<{ task: WorkspaceTask }>(
          `/api/workspace/tasks/${editingTask.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingTask),
          }
        );
        setTasks((prev) => prev.map((t) => (t.id === res.task.id ? res.task : t)));
        toast('Tarea actualizada correctamente', 'success');
      } else {
        const res = await apiFetch<{ task: WorkspaceTask }>('/api/workspace/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingTask),
        });
        setTasks((prev) => [res.task, ...prev]);
        toast('Tarea creada exitosamente', 'success');
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      toast(err.message || 'Error al guardar la tarea', 'error');
    }
  };

  const handleDeleteTask = async (id: string, title: string) => {
    const ok = await confirmAction({
      title: '¿Eliminar tarea?',
      message: `¿Deseas eliminar la tarea "${title}"?`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiFetch(`/api/workspace/tasks/${id}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast('Tarea eliminada correctamente', 'success');
    } catch {
      toast('Error al eliminar tarea', 'error');
    }
  };

  const handleSaveShareSettings = async (requirePin: boolean, pinCode: string) => {
    if (!activeMonth) return;
    await apiFetch(`/api/workspace/months/${activeMonth.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirePin,
        publicPin: pinCode,
      }),
    });
    setMonths((prev) =>
      prev.map((m) =>
        m.id === activeMonth.id
          ? { ...m, requirePin, publicPin: pinCode }
          : m
      )
    );
  };

  // Objetos activos derivados
  const activeProject = projects.find((p) => p.id === selectedProjectId) || null;
  const activeMonth = months.find((m) => m.id === selectedMonthId) || null;

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* VISTA HUB: PANTALLA PRINCIPAL DE WORKSPACE */}
      {/* ===================================================================== */}
      {currentView === 'hub' && (
        <WorkspaceHubView
          projects={projects}
          tasks={tasks}
          formsCount={forms.length}
          meetingsCount={meetings.length}
          whiteboardsCount={whiteboardsCount}
          onSelectSubmodule={(view) => {
            setCurrentView(view);
            if (view === 'social') setSocialPhase(1);
          }}
        />
      )}

      {/* ===================================================================== */}
      {/* SUBMÓDULO: REDES SOCIALES (CON LAS 3 FASES) */}
      {/* ===================================================================== */}
      {currentView === 'social' && (
        <div className="space-y-6 animate-fadeIn">
          {/* FASE 1: PROYECTOS */}
          {socialPhase === 1 && (
            <SocialProjectsView
              projects={projects}
              clients={clients}
              loading={loading}
              tenant={tenant}
              onBackToHub={() => setCurrentView('hub')}
              onOpenNewProject={handleOpenNewProject}
              onOpenEditProject={(proj) => {
                setEditingProject({ ...proj });
                setIsProjectModalOpen(true);
              }}
              onToggleArchiveProject={handleToggleArchiveProject}
              onDeleteProject={handleDeleteProject}
              onOpenOsWebView={handleOpenOsWebView}
              onAssignDriveFolder={(proj) => {
                setPickerTargetProject(proj);
                setIsDrivePickerOpen(true);
              }}
              onEnterProjectBoard={(projectId) => {
                setSelectedProjectId(projectId);
                setSocialPhase(2);
              }}
            />
          )}

          {/* FASE 2: MESES / CAMPAÑAS DEL PROYECTO */}
          {socialPhase === 2 && selectedProjectId && activeProject && (
            <SocialMonthsView
              months={months.filter((m) => m.projectId === selectedProjectId)}
              activeProject={activeProject}
              selectedProjectId={selectedProjectId}
              currentTime={currentTime}
              getMonthStats={getMonthStats}
              onBackToProjects={() => {
                setSelectedProjectId(null);
                setSocialPhase(1);
              }}
              onOpenNewMonth={handleOpenNewMonth}
              onOpenEditMonth={handleOpenEditMonth}
              onDeleteMonth={handleDeleteMonth}
              onSelectMonth={(monthId) => {
                setSelectedMonthId(monthId);
                setSocialPhase(3);
              }}
              onOpenOsWebView={handleOpenOsWebView}
              onOpenDriveFolder={(link) => {
                if (link) window.open(link, '_blank');
                else toast('No hay carpeta de Google Drive asignada', 'info');
              }}
            />
          )}

          {/* FASE 3: PUBLICACIONES DE REDES SOCIALES (GRILLA O KANBAN) */}
          {socialPhase === 3 && selectedProjectId && selectedMonthId && activeMonth && (
            <>
              {socialViewMode === 'grid' ? (
                <SocialPostsGridView
                  posts={posts.filter((p) => p.monthId === selectedMonthId || (activeMonth.projectId && p.projectId === activeMonth.projectId))}
                  activeMonth={activeMonth}
                  activeProject={activeProject || undefined}
                  selectedMonthId={selectedMonthId}
                  projects={projects}
                  socialSearch={socialSearch}
                  setSocialSearch={setSocialSearch}
                  socialStatusFilter={socialStatusFilter}
                  setSocialStatusFilter={setSocialStatusFilter}
                  setSelectedProjectId={setSelectedProjectId}
                  onBackToMonths={() => {
                    setSelectedMonthId(null);
                    setSocialPhase(2);
                  }}
                  onOpenNewPost={handleOpenNewPost}
                  onOpenEditPost={handleOpenEditPost}
                  onQuickChangePostStatus={handleQuickChangePostStatus}
                  onPublicPreviewPost={(post) => setPublicPreviewPost(post)}
                  onToggleArchivePost={handleToggleArchivePost}
                  onSharePost={handleSharePost}
                  onDeletePost={handleDeletePost}
                  onOpenPresentation={() => setIsWorkspacePresentationOpen(true)}
                  onOpenShareMonth={() => setIsShareModalOpen(true)}
                  onOpenDriveUpload={() => setIsDriveFolderUploadModalOpen(true)}
                />
              ) : (
                <SocialKanbanView
                  posts={posts.filter((p) => p.monthId === selectedMonthId || (activeMonth.projectId && p.projectId === activeMonth.projectId))}
                  onOpenEditPost={handleOpenEditPost}
                  onQuickChangePostStatus={handleQuickChangePostStatus}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBMÓDULO: TAREAS OPERATIVAS */}
      {/* ===================================================================== */}
      {currentView === 'tasks' && (
        <TasksView
          tasks={tasks}
          clients={clients}
          projects={projects}
          teamUsers={teamUsers}
          currentUser={user}
          taskSearch={taskSearch}
          setTaskSearch={setTaskSearch}
          taskClientFilter={taskClientFilter}
          setTaskClientFilter={setTaskClientFilter}
          taskPriorityFilter={taskPriorityFilter}
          setTaskPriorityFilter={setTaskPriorityFilter}
          tasksViewMode={tasksViewMode}
          setTasksViewMode={setTasksViewMode}
          onBackToHub={() => setCurrentView('hub')}
          onOpenNewTask={handleOpenNewTask}
          onOpenEditTask={handleOpenEditTask}
          onDeleteTask={handleDeleteTask}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          onTogglePinTask={handleTogglePinTask}
        />
      )}

      {/* ===================================================================== */}
      {/* SUBMÓDULO: ARCHIVOS & DRIVE */}
      {/* ===================================================================== */}
      {currentView === 'drive' && (
        <div className="space-y-4 animate-fadeIn">
          <DriveModule onBack={() => setCurrentView('hub')} />
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBMÓDULO: HERRAMIENTAS CREATIVAS (PALETAS, CÓDIGOS, BIOLINKS) */}
      {/* ===================================================================== */}
      {currentView === 'tools' && (
        <div className="space-y-4 animate-fadeIn">
          <ToolsModuleView onBackToHub={() => setCurrentView('hub')} />
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBMÓDULO: FORMULARIOS INTERACTIVOS DE AGENCIA & CLIENTES */}
      {/* ===================================================================== */}
      {currentView === 'forms' && (
        <div className="space-y-4 animate-fadeIn">
          <FormsSubmoduleView onBackToHub={() => {
            setCurrentView('hub');
            loadInitialData();
          }} />
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBMÓDULO: SALAS Y REUNIONES VIRTUALES (GOOGLE MEET) */}
      {/* ===================================================================== */}
      {currentView === 'meetings' && (
        <div className="space-y-4 animate-fadeIn">
          <MeetingsSubmoduleView onBackToHub={() => {
            setCurrentView('hub');
            loadInitialData();
          }} />
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBMÓDULO: PIZARRAS CREATIVAS (WHITEBOARDS) */}
      {/* ===================================================================== */}
      {currentView === 'whiteboards' && (
        <div className="space-y-4 animate-fadeIn">
          <WhiteboardsSubmoduleView />
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALES DEL WORKSPACE */}
      {/* ===================================================================== */}

      {/* Modal Proyecto */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        editingProject={editingProject}
        setEditingProject={setEditingProject}
        serviceOrders={serviceOrders}
        clients={clients}
        teamUsers={teamUsers}
        isSavingProject={isSavingProject}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSaveProject={handleSaveProject}
        onSelectServiceOrder={handleSelectServiceOrderForNew}
        onTogglePlatform={handleTogglePlatform}
        onOpenDrivePicker={() => setIsDrivePickerOpen(true)}
      />

      {/* Modal Mes */}
      <MonthModal
        isOpen={isMonthModalOpen}
        monthForm={monthForm}
        setMonthForm={setMonthForm}
        activeProject={activeProject}
        months={months}
        isSubmittingMonth={isSubmittingMonth}
        onClose={() => setIsMonthModalOpen(false)}
        onSaveMonth={handleSaveMonth}
        onDeleteMonth={handleDeleteMonth}
      />

      {/* Modal Editor de Publicación Multi-Etapa */}
      <PostEditorModal
        isOpen={isPostModalOpen}
        editingPost={editingPost}
        setEditingPost={setEditingPost}
        onClose={() => {
          setIsPostModalOpen(false);
          setEditingPost(null);
        }}
        onSavePost={handleSavePost}
        postModalTab={postModalTab}
        setPostModalTab={setPostModalTab}
        tenant={tenant}
        toast={toast}
        isUploadingRef={isUploadingRef}
        isUploadingFinalArt={isUploadingFinalArt}
        handleUploadMediaFile={handleUploadMediaFile}
        onOpenLightbox={(url) => setLightboxPreviewUrl(url)}
        onOpenPaintModal={() => setIsPaintModalOpen(true)}
      />

      {/* Modal Tarea Operativa */}
      <TaskModal
        isOpen={isTaskModalOpen}
        editingTask={editingTask}
        setEditingTask={setEditingTask}
        clients={clients}
        teamUsers={teamUsers}
        projects={projects}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        onArchiveTask={handleArchiveTask}
      />

      {/* Modal Vista Pública del Post */}
      <PostPublicPreviewModal
        post={publicPreviewPost}
        onClose={() => setPublicPreviewPost(null)}
        onSharePost={handleSharePost}
        onApprovePost={async (postId) => {
          try {
            const res = await apiFetch<{ post: WorkspacePost }>(
              `/api/workspace/posts/${postId}`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved_client' }),
              }
            );
            setPosts((prev) => prev.map((p) => (p.id === res.post.id ? res.post : p)));
            setPublicPreviewPost(res.post);
            toast('¡Publicación aprobada por el cliente!', 'success');
          } catch {
            toast('Error al aprobar publicación', 'error');
          }
        }}
        onOpenLightbox={(url) => setLightboxPreviewUrl(url)}
        toast={toast}
      />

      {/* Modal Pizarra Paint para Referencias */}
      <PaintCanvasModal
        isOpen={isPaintModalOpen}
        onClose={() => setIsPaintModalOpen(false)}
        initialImageUrl={editingPost?.referenceMediaUrl}
        onSave={(dataUrl) => {
          setEditingPost((prev) =>
            prev
              ? {
                  ...prev,
                  referenceMediaUrl: dataUrl,
                  paintData: dataUrl,
                  referenceMediaName: `boceto-${Date.now()}.png`,
                }
              : null
          );
          toast('Dibujo guardado como referencia visual del post', 'success');
        }}
      />

      {/* Modal Presentación PPT */}
      {activeMonth && (
        <WorkspacePresentationModal
          isOpen={isWorkspacePresentationOpen}
          onClose={() => setIsWorkspacePresentationOpen(false)}
          posts={posts.filter((p) => p.monthId === activeMonth.id || (activeMonth.projectId && p.projectId === activeMonth.projectId))}
          projectName={activeProject?.brandName || activeProject?.name || 'Campaña Redes Sociales'}
          monthName={activeMonth.name}
          clientName={activeProject?.clientName}
          agencyLogo={tenant?.logoUrl}
          agencyName={tenant?.name}
          assignedMembers={teamUsers.map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role,
            avatar: u.avatar,
          }))}
        />
      )}

      {/* Modal Compartir Vista Pública con PIN */}
      <ShareMonthModal
        isOpen={isShareModalOpen}
        activeMonth={activeMonth}
        onClose={() => setIsShareModalOpen(false)}
        onSaveShareSettings={handleSaveShareSettings}
        toast={toast}
      />

      {/* Modal Subir Archivos a Carpetas de Google Drive */}
      <DriveFolderUploadModal
        isOpen={isDriveFolderUploadModalOpen}
        activeMonth={activeMonth}
        activeProject={activeProject}
        onClose={() => setIsDriveFolderUploadModalOpen(false)}
        toast={toast}
      />

      {/* Modal Selector de Carpeta de Drive para Proyectos */}
      <DriveFolderPickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => {
          setIsDrivePickerOpen(false);
          setPickerTargetProject(null);
        }}
        currentSelectedId={pickerTargetProject?.driveFolderId || editingProject?.driveFolderId}
        title="Asignar Carpeta de Google Drive al Proyecto"
        subtitle="Selecciona o crea la carpeta de Google Drive donde se guardarán todos los archivos de este proyecto."
        onSelect={async (folder) => {
          if (pickerTargetProject) {
            try {
              const updatedRes = await apiFetch<{ project: WorkspaceProject }>(
                `/api/workspace/projects/${pickerTargetProject.id}`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    driveFolderId: folder.id,
                    driveFolderName: folder.name,
                    driveFolderLink: folder.webViewLink,
                  }),
                }
              );
              setProjects((prev) => prev.map((p) => (p.id === pickerTargetProject.id ? updatedRes.project : p)));
              toast(`Carpeta "${folder.name}" vinculada al proyecto "${pickerTargetProject.name}"`, 'success');
            } catch {
              toast('Error al vincular carpeta', 'error');
            }
            setPickerTargetProject(null);
          } else if (editingProject) {
            setEditingProject({
              ...editingProject,
              driveFolderId: folder.id,
              driveFolderName: folder.name,
              driveFolderLink: folder.webViewLink,
            });
            toast(`Carpeta "${folder.name}" seleccionada para el proyecto`, 'success');
          }
        }}
      />

      {/* Modal Lightbox de Pantalla Completa */}
      {lightboxPreviewUrl && (
        <div
          onClick={() => setLightboxPreviewUrl(null)}
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img
              src={lightboxPreviewUrl}
              alt="Inspección"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setLightboxPreviewUrl(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition shadow-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
