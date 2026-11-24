import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Code2,
  Sparkles,
  Plus,
  Trash2,
  Globe,
  GitBranch,
  Figma,
  FileCode2,
  FolderOpen,
  Users,
  Calendar,
} from 'lucide-react';
import {
  SoftwareProject,
  SoftwareProjectType,
  SoftwareProjectStatus,
  SoftwareCustomTemplate,
  Client,
  ServiceOrder,
  User,
} from '../../../../../../shared/types';
import {
  SOFTWARE_PROJECT_TEMPLATES,
  PROJECT_STATUS_META,
  buildMilestonesFromTemplate,
  buildMilestonesFromCustomTemplate,
} from '../templates';

interface SoftwareProjectModalProps {
  isOpen: boolean;
  editingProject: Partial<SoftwareProject> | null;
  clients: Client[];
  serviceOrders: ServiceOrder[];
  teamUsers: User[];
  customTemplates?: SoftwareCustomTemplate[];
  onDeleteCustomTemplate?: (templateId: string) => void;
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: Partial<SoftwareProject>) => Promise<void>;
  onOpenDrivePicker?: () => void;
  selectedDriveFolder?: { id: string; name: string; webViewLink?: string } | null;
}

export const SoftwareProjectModal: React.FC<SoftwareProjectModalProps> = ({
  isOpen,
  editingProject,
  clients,
  serviceOrders,
  teamUsers,
  customTemplates = [],
  onDeleteCustomTemplate,
  isSaving,
  onClose,
  onSave,
  onOpenDrivePicker,
  selectedDriveFolder,
}) => {
  const isEditing = Boolean(editingProject?.id);
  const today = new Date().toISOString().slice(0, 10);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<SoftwareProjectType>('custom_saas');
  const [templateKey, setTemplateKey] = useState<SoftwareProjectType | 'blank'>('custom_saas');
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = useState<string>('');
  const [status, setStatus] = useState<SoftwareProjectStatus>('planning');
  const [clientId, setClientId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [brandId, setBrandId] = useState<string>('');
  const [brandName, setBrandName] = useState('');
  const [serviceOrderId, setServiceOrderId] = useState<string>('');
  const [serviceOrderCode, setServiceOrderCode] = useState('');
  const [techLeadId, setTechLeadId] = useState('');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [targetEndDate, setTargetEndDate] = useState(today);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [stackInput, setStackInput] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [stagingUrl, setStagingUrl] = useState('');
  const [productionUrl, setProductionUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [docsUrl, setDocsUrl] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveFolderName, setDriveFolderName] = useState('');
  const [driveFolderLink, setDriveFolderLink] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingProject && editingProject.id) {
      setName(editingProject.name || '');
      setDescription(editingProject.description || '');
      setProjectType(editingProject.projectType || 'custom_saas');
      setStatus(editingProject.status || 'in_development');
      setClientId(editingProject.clientId || '');
      setClientName(editingProject.clientName || '');
      setBrandId(editingProject.brandId || '');
      setBrandName(editingProject.brandName || '');
      setServiceOrderId(editingProject.serviceOrderId || '');
      setServiceOrderCode(editingProject.serviceOrderCode || '');
      setTechLeadId(editingProject.techLeadId || '');
      setAssignedUserIds((editingProject.assignedUsers || []).map((u) => u.id));
      setStartDate(editingProject.startDate || today);
      setTargetEndDate(editingProject.targetEndDate || today);
      setTechStack(editingProject.techStack || []);
      setFigmaUrl(editingProject.environments?.figmaUrl || '');
      setStagingUrl(editingProject.environments?.stagingUrl || '');
      setProductionUrl(editingProject.environments?.productionUrl || '');
      setRepoUrl(editingProject.environments?.repoUrl || '');
      setDocsUrl(editingProject.environments?.docsUrl || '');
      setDriveFolderId(editingProject.driveFolderId || '');
      setDriveFolderName(editingProject.driveFolderName || '');
      setDriveFolderLink(editingProject.driveFolderLink || '');
    } else {
      const built = buildMilestonesFromTemplate('custom_saas', today);
      setName('');
      setDescription('');
      setProjectType('custom_saas');
      setTemplateKey('custom_saas');
      setSelectedCustomTemplateId('');
      setStatus('planning');
      setClientId('');
      setClientName('');
      setBrandId('');
      setBrandName('');
      setServiceOrderId('');
      setServiceOrderCode('');
      setTechLeadId(teamUsers[0]?.id || '');
      setAssignedUserIds([]);
      setStartDate(today);
      setTargetEndDate(built.suggestedEndDate);
      setTechStack(built.defaultStack);
      setFigmaUrl('');
      setStagingUrl('');
      setProductionUrl('');
      setRepoUrl('');
      setDocsUrl('');
      setDriveFolderId('');
      setDriveFolderName('');
      setDriveFolderLink('');
    }
    setStackInput('');
  }, [isOpen, editingProject, today, teamUsers]);

  useEffect(() => {
    if (selectedDriveFolder) {
      setDriveFolderId(selectedDriveFolder.id);
      setDriveFolderName(selectedDriveFolder.name);
      setDriveFolderLink(selectedDriveFolder.webViewLink || '');
    }
  }, [selectedDriveFolder]);

  if (!isOpen) return null;

  const selectedClient = clients.find((c) => c.id === clientId);
  const clientBrands = selectedClient?.brands || [];

  const handleSelectTemplate = (key: SoftwareProjectType | 'blank') => {
    setSelectedCustomTemplateId('');
    setTemplateKey(key);
    if (key !== 'blank') {
      setProjectType(key);
    }
    const built = buildMilestonesFromTemplate(key, startDate);
    setTargetEndDate(built.suggestedEndDate);
    if (built.defaultStack.length > 0) {
      setTechStack(built.defaultStack);
    }
  };

  const handleSelectCustomTemplate = (tpl: SoftwareCustomTemplate) => {
    setSelectedCustomTemplateId(tpl.id);
    setProjectType(tpl.projectType || 'custom_saas');
    const built = buildMilestonesFromCustomTemplate(tpl, startDate);
    setTargetEndDate(built.suggestedEndDate);
    if (built.defaultStack.length > 0) {
      setTechStack(built.defaultStack);
    }
  };

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    const found = clients.find((c) => c.id === newClientId);
    if (found) {
      setClientName(found.name);
      if (found.brands && found.brands.length === 1) {
        setBrandId(found.brands[0].id);
        setBrandName(found.brands[0].name);
      } else {
        setBrandId('');
        setBrandName('');
      }
    } else {
      setBrandId('');
      setBrandName('');
    }
  };

  const handleServiceOrderChange = (osId: string) => {
    setServiceOrderId(osId);
    const os = serviceOrders.find((o) => o.id === osId);
    if (os) {
      setServiceOrderCode(os.code);
      if (!name.trim()) setName(os.title);
      if (os.clientId) handleClientChange(os.clientId);
      if (os.startDate) setStartDate(os.startDate);
      if (os.deliveryDate) setTargetEndDate(os.deliveryDate);
    } else {
      setServiceOrderCode('');
    }
  };

  const handleAddStackTag = () => {
    const clean = stackInput.trim();
    if (!clean) return;
    if (!techStack.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setTechStack((prev) => [...prev, clean]);
    }
    setStackInput('');
  };

  const toggleAssignedUser = (uid: string) => {
    setAssignedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const lead = teamUsers.find((u) => u.id === techLeadId);
    const assignedUsers = teamUsers
      .filter((u) => assignedUserIds.includes(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: u.jobTitle || u.roleName || '',
        avatarUrl: u.avatarUrl || '',
      }));

    const payload: Partial<SoftwareProject> = {
      ...(editingProject?.id ? { id: editingProject.id } : {}),
      name: name.trim(),
      description: description.trim(),
      projectType,
      status,
      clientId: clientId || null,
      clientName: clientName.trim() || 'Cliente Interno',
      brandId: brandId || null,
      brandName: brandName.trim(),
      serviceOrderId: serviceOrderId || null,
      serviceOrderCode: serviceOrderCode || '',
      techLeadId: lead?.id || '',
      techLeadName: lead?.name || '',
      assignedUsers,
      techStack,
      environments: {
        figmaUrl: figmaUrl.trim(),
        stagingUrl: stagingUrl.trim(),
        productionUrl: productionUrl.trim(),
        repoUrl: repoUrl.trim(),
        docsUrl: docsUrl.trim(),
      },
      driveFolderId,
      driveFolderName,
      driveFolderLink,
      startDate,
      targetEndDate,
    };

    if (!isEditing) {
      const customTpl = selectedCustomTemplateId
        ? customTemplates.find((t) => t.id === selectedCustomTemplateId)
        : null;
      const built = customTpl
        ? buildMilestonesFromCustomTemplate(customTpl, startDate)
        : buildMilestonesFromTemplate(templateKey, startDate);
      payload.milestones = built.milestones;
      payload.workItems = [];
    }

    await onSave(payload);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {isEditing ? 'Editar Proyecto de Software' : 'Nuevo Proyecto de Desarrollo de Software'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configura cliente, plantilla dinámica de hitos, stack y entornos de prueba.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Plantilla dinámica de Hitos (solo al crear) */}
          {!isEditing && (
            <div className="space-y-2.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                Plantilla Dinámica de Hitos Iniciales
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {SOFTWARE_PROJECT_TEMPLATES.map((tpl) => {
                  const selected = !selectedCustomTemplateId && templateKey === tpl.key;
                  return (
                    <button
                      key={tpl.key}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl.key)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        selected
                          ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 ring-2 ring-cyan-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {tpl.shortLabel}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {tpl.milestones.length} {tpl.milestones.length === 1 ? 'hito' : 'hitos'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {customTemplates.length > 0 && (
                <div className="pt-2 space-y-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Mis Plantillas Guardadas ({customTemplates.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {customTemplates.map((ct) => {
                      const selected = selectedCustomTemplateId === ct.id;
                      return (
                        <div
                          key={ct.id}
                          onClick={() => handleSelectCustomTemplate(ct)}
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer relative ${
                            selected
                              ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {ct.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                                {ct.milestones.length} hitos
                              </span>
                              {onDeleteCustomTemplate && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteCustomTemplate(ct.id);
                                    if (selected) setSelectedCustomTemplateId('');
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                  title="Eliminar plantilla"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          {ct.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {ct.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Datos principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nombre del Proyecto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Plataforma E-Commerce & Panel Logístico V2"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Cliente Vinculado
              </label>
              <select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <option value="">-- Seleccionar cliente o escribir manual --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {clientBrands.length > 0 ? 'Marca del Cliente' : 'Nombre del Cliente (Manual)'}
              </label>
              {clientBrands.length > 0 ? (
                <select
                  value={brandId}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setBrandId(bId);
                    const found = clientBrands.find((b) => b.id === bId);
                    setBrandName(found?.name || '');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  <option value="">-- Marca opcional --</option>
                  {clientBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Empresa Demo S.A.C."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Orden de Servicio (Opcional)
              </label>
              <select
                value={serviceOrderId}
                onChange={(e) => handleServiceOrderChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                <option value="">Sin vincular a OS</option>
                {serviceOrders.map((os) => (
                  <option key={os.id} value={os.id}>
                    {os.code} — {os.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Estado del Proyecto
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SoftwareProjectStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              >
                {(Object.keys(PROJECT_STATUS_META) as SoftwareProjectStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {PROJECT_STATUS_META[st].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha de Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Fecha Objetivo de Entrega
              </label>
              <input
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Objetivo y Alcance Técnico
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Resumen ejecutivo del sistema, arquitectura objetivo y consideraciones clave..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>
          </div>

          {/* Stack Tecnológico */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Stack Tecnológico
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={stackInput}
                onChange={(e) => setStackInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddStackTag();
                  }
                }}
                placeholder="Ej. React, Node.js, PostgreSQL, Docker..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
              />
              <button
                type="button"
                onClick={handleAddStackTag}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir
              </button>
            </div>
            {techStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {techStack.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 text-xs font-bold"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTechStack((prev) => prev.filter((t) => t !== tag))}
                      className="hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Entornos y Repositorio */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Entornos, Diseño y Repositorio
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                  <Figma className="w-3.5 h-3.5 text-pink-500" /> Diseño / Prototipo Figma
                </label>
                <input
                  type="url"
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                  placeholder="https://figma.com/file/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                  <Globe className="w-3.5 h-3.5 text-amber-500" /> Entorno Staging / Pruebas
                </label>
                <input
                  type="url"
                  value={stagingUrl}
                  onChange={(e) => setStagingUrl(e.target.value)}
                  placeholder="https://staging.cliente.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" /> Entorno Producción
                </label>
                <input
                  type="url"
                  value={productionUrl}
                  onChange={(e) => setProductionUrl(e.target.value)}
                  placeholder="https://cliente.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                  <GitBranch className="w-3.5 h-3.5 text-indigo-500" /> Repositorio Git (Solo interno)
                </label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/agencia/proyecto"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                    <FileCode2 className="w-3.5 h-3.5 text-sky-500" /> Documentación / Swagger / Notion
                  </label>
                  <input
                    type="url"
                    value={docsUrl}
                    onChange={(e) => setDocsUrl(e.target.value)}
                    placeholder="https://docs.proyecto.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                {onOpenDrivePicker && (
                  <button
                    type="button"
                    onClick={onOpenDrivePicker}
                    className="px-3.5 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-500/20 cursor-pointer shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{driveFolderName ? `Drive: ${driveFolderName}` : 'Vincular Carpeta Drive'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Equipo y Tech Lead */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" /> Líder Técnico (Tech Lead)
                </label>
                <select
                  value={techLeadId}
                  onChange={(e) => setTechLeadId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-semibold"
                >
                  <option value="">-- Sin asignar --</option>
                  {teamUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.jobTitle || u.roleName || 'Equipo'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Equipo Asignado ({assignedUserIds.length})
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
                  {teamUsers.map((u) => {
                    const active = assignedUserIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleAssignedUser(u.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          active
                            ? 'bg-cyan-600 text-white border-cyan-600'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {u.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          </div>

          {/* Footer buttons */}
          <div className="shrink-0 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSaving
                ? 'Guardando...'
                : isEditing
                  ? 'Guardar Cambios'
                  : 'Crear Proyecto e Hitos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};
