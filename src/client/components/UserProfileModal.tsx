import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  EmployeeProfile,
  WorkspaceProject,
  UserSession,
} from '../../shared/types';
import {
  X,
  User as UserIcon,
  ShieldCheck,
  KeyRound,
  Briefcase,
  DollarSign,
  FolderKanban,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  LogOut,
  Calendar,
  Clock,
  Building,
  CreditCard,
  Phone,
  Mail,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldAlert,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'profile' | 'hr' | 'payments' | 'projects' | 'devices';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, role, tenant, apiFetch, toast, confirmAction, updateCurrentUser, logout } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Datos cargados desde /api/users/profile/me
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [assignedProjects, setAssignedProjects] = useState<WorkspaceProject[]>([]);
  const [sessions, setSessions] = useState<(UserSession & { isCurrent?: boolean })[]>([]);
  const [activeCount, setActiveCount] = useState<number>(1);
  const [maxAllowed, setMaxAllowed] = useState<number>(3);

  // Formulario de edición de perfil
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    avatarUrl: '',
    currentPin: '',
    newPin: '',
    confirmPin: '',
  });

  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sincronizar datos iniciales del usuario
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        whatsapp: user.whatsapp || '',
        avatarUrl: user.avatarUrl || '',
        currentPin: '',
        newPin: '',
        confirmPin: '',
      }));
    }
  }, [user]);

  // Cargar perfil integral
  const loadProfileData = async () => {
    if (!isOpen) return;
    setLoadingData(true);
    try {
      const res = await apiFetch<{
        user: User;
        employeeProfile: EmployeeProfile | null;
        assignedProjects: WorkspaceProject[];
        sessions: (UserSession & { isCurrent?: boolean })[];
        activeDevicesCount: number;
        maxDevicesLimit: number;
      }>('/api/users/profile/me');

      if (res.employeeProfile) setEmployeeProfile(res.employeeProfile);
      if (res.assignedProjects) setAssignedProjects(res.assignedProjects);
      if (res.sessions) setSessions(res.sessions);
      if (res.activeDevicesCount !== undefined) setActiveCount(res.activeDevicesCount);
      if (res.maxDevicesLimit !== undefined) setMaxAllowed(res.maxDevicesLimit);
    } catch (err) {
      console.error('Error cargando perfil:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProfileData();
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  // Manejar subida o cambio de foto de perfil
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Por favor selecciona una imagen válida', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('La imagen no debe superar los 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => ({ ...prev, avatarUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Guardar datos personales y cambio de PIN
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast('El nombre no puede estar vacío', 'error');
      return;
    }

    if (formData.newPin) {
      if (!/^\d{8}$/.test(formData.newPin)) {
        toast('El nuevo PIN debe tener exactamente 8 dígitos numéricos', 'error');
        return;
      }
      if (formData.newPin !== formData.confirmPin) {
        toast('La confirmación del nuevo PIN no coincide', 'error');
        return;
      }
      if (!formData.currentPin) {
        toast('Debes ingresar tu PIN actual para autorizar el cambio', 'error');
        return;
      }
    }

    setSavingProfile(true);
    try {
      const res = await apiFetch<{ user: User }>('/api/users/profile/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          whatsapp: formData.whatsapp,
          avatarUrl: formData.avatarUrl,
          currentPin: formData.currentPin || undefined,
          newPin: formData.newPin || undefined,
        }),
      });

      if (res.user) {
        updateCurrentUser(res.user);
        toast('Perfil actualizado correctamente', 'success');
        setFormData((prev) => ({
          ...prev,
          currentPin: '',
          newPin: '',
          confirmPin: '',
        }));
      }
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Revocar una sesión específica
  const handleRevokeSession = async (sessionId: string, deviceName: string) => {
    const confirmed = await confirmAction({
      title: '¿Cerrar sesión en este dispositivo?',
      message: `Se cerrará la sesión activa en ${deviceName}.`,
      confirmText: 'Sí, cerrar sesión',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await apiFetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
      toast('Sesión cerrada en el dispositivo remoto', 'success');
      loadProfileData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  // Revocar todas las demás sesiones
  const handleRevokeOtherSessions = async () => {
    const confirmed = await confirmAction({
      title: '¿Cerrar todas las demás sesiones?',
      message: 'Se cerrarán todas las sesiones en tus otros dispositivos. Solo permanecerá activa la sesión en este dispositivo.',
      confirmText: 'Cerrar demás sesiones',
      danger: true,
    });
    if (!confirmed) return;

    try {
      const res = await apiFetch<{ countRevoked: number }>('/api/auth/sessions/revoke-others', {
        method: 'POST',
      });
      toast(`Se cerraron ${res.countRevoked} sesiones en otros dispositivos`, 'success');
      loadProfileData();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  // Copiar link de ficha de pagos
  const handleCopyPublicLink = () => {
    if (!employeeProfile?.publicToken) return;
    const url = `${window.location.origin}/public/employee-payments/${employeeProfile.publicToken}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast('Enlace copiado al portapapeles', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="relative">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={user.name}
                  className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {user.name}
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1"
                  style={{
                    backgroundColor: `${role?.badgeColor || '#4f46e5'}20`,
                    color: role?.badgeColor || '#4f46e5',
                  }}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {role?.name || 'Usuario'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user.jobTitle || 'Colaborador'} • {tenant.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pestañas / Navegación */}
        <div className="flex items-center gap-1.5 px-4 sm:px-7 pt-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar">
          {[
            { id: 'profile', label: 'Mi Perfil & PIN', icon: UserIcon },
            { id: 'hr', label: 'Ficha Laboral', icon: Briefcase },
            { id: 'payments', label: 'Mis Pagos', icon: DollarSign },
            { id: 'projects', label: 'Proyectos Asignados', icon: FolderKanban },
            { id: 'devices', label: 'Dispositivos & Sesiones', icon: Laptop, badge: `${activeCount}/${maxAllowed}` },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeCount >= maxAllowed
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Cuerpo del Modal con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6">
          
          {/* ======================================================== */}
          {/* TAB 1: MI PERFIL, FOTO Y CAMBIO DE PIN                   */}
          {/* ======================================================== */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              
              {/* Sección Foto de Perfil */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  {formData.avatarUrl ? (
                    <img
                      src={formData.avatarUrl}
                      alt={formData.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/30 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                      {formData.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Foto de Perfil
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
                    Sube una foto clara en formato JPG, PNG o WebP (máximo 5MB).
                  </p>
                  <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Subir foto</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    {formData.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: '' }))}
                        className="py-1.5 px-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Datos Personales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                    placeholder="Ej. Manuel Morales"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    WhatsApp / Teléfono Móvil
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData((prev) => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                    placeholder="+51 987 654 321"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cargo o Puesto
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.jobTitle || 'Diseñador Gráfico'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Gestionado por el departamento de Recursos Humanos.
                  </span>
                </div>
              </div>

              {/* Cambio Seguro de PIN */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <KeyRound className="w-4 h-4" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider">
                    Cambio de PIN de Acceso (8 Dígitos)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Si deseas cambiar tu código de acceso corporativo de 8 dígitos, completa los siguientes campos:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      PIN Actual
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPin ? 'text' : 'password'}
                        maxLength={8}
                        value={formData.currentPin}
                        onChange={(e) => setFormData((prev) => ({ ...prev, currentPin: e.target.value.replace(/\D/g, '') }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tracking-widest text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPin(!showCurrentPin)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showCurrentPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Nuevo PIN (8 Dígitos)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        maxLength={8}
                        value={formData.newPin}
                        onChange={(e) => setFormData((prev) => ({ ...prev, newPin: e.target.value.replace(/\D/g, '') }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tracking-widest text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                        placeholder="8 números"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Confirmar Nuevo PIN
                    </label>
                    <input
                      type={showNewPin ? 'text' : 'password'}
                      maxLength={8}
                      value={formData.confirmPin}
                      onChange={(e) => setFormData((prev) => ({ ...prev, confirmPin: e.target.value.replace(/\D/g, '') }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tracking-widest text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      placeholder="Repetir PIN"
                    />
                  </div>
                </div>
              </div>

              {/* Botón de Guardado */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 2: FICHA DE TRABAJADOR (RECURSOS HUMANOS)            */}
          {/* ======================================================== */}
          {activeTab === 'hr' && (
            <div className="space-y-6">
              {employeeProfile ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Puesto / Cargo
                      </span>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {employeeProfile.jobTitle || user.jobTitle || 'Diseñador Gráfico'}
                      </p>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                        {employeeProfile.department || 'Área Creativa'}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Documento de Identidad
                      </span>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                        {employeeProfile.documentNumber || 'No registrado'}
                      </p>
                      <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                        {employeeProfile.documentType || 'DNI'}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Fecha de Ingreso
                      </span>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {employeeProfile.hireDate || 'Fecha no registrada'}
                      </p>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 block font-semibold">
                        Estado: {employeeProfile.status === 'active' ? 'Activo' : employeeProfile.status}
                      </span>
                    </div>
                  </div>

                  {/* Horario de Trabajo */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <Clock className="w-4 h-4" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider">
                        Horario y Asistencia
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                          IN
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Hora de Entrada</span>
                          <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                            {employeeProfile.entryTime || '09:00'} hrs
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                          OUT
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Hora de Salida</span>
                          <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                            {employeeProfile.exitTime || '18:00'} hrs
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cuenta Bancaria y Contacto de Emergencia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold">Datos Bancarios para Abonos</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <strong>Banco:</strong> {employeeProfile.bankAccount?.bankName || 'No registrado'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                        <strong>N° Cuenta:</strong> {employeeProfile.bankAccount?.accountNumber || '—'}
                      </p>
                      {employeeProfile.bankAccount?.cci && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                          <strong>CCI:</strong> {employeeProfile.bankAccount.cci}
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Phone className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold">Contacto de Emergencia</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <strong>Nombre:</strong> {employeeProfile.emergencyContact?.name || 'No registrado'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <strong>Parentesco:</strong> {employeeProfile.emergencyContact?.relationship || '—'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <strong>Teléfono:</strong> {employeeProfile.emergencyContact?.phone || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Acceso a Enlace Público de Pagos */}
                  {employeeProfile.publicToken && (
                    <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                          Tu Portal Privado de Recibos y Pagos
                        </h4>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                          Puedes consultar tus comprobantes y constancias de pago desde cualquier navegador con tu enlace personal seguro.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleCopyPublicLink}
                          className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLink ? 'Copiado' : 'Copiar Enlace'}</span>
                        </button>
                        <a
                          href={`/public/employee-payments/${employeeProfile.publicToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-1.5 px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir</span>
                        </a>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                  <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    Ficha Laboral no vinculada aún
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                    El departamento de Recursos Humanos aún no ha completado tu expediente laboral en el módulo de Administración.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MIS PAGOS & FINANZAS                             */}
          {/* ======================================================== */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Historial de Pagos y Boletas
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Registro de salarios, honorarios y pagos procesados por la agencia.
                  </p>
                </div>

                {employeeProfile?.salary && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Salario Acordado
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {employeeProfile.salaryCurrency === 'USD' ? '$' : 'S/'} {employeeProfile.salary.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {employeeProfile?.payments && employeeProfile.payments.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {employeeProfile.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {p.periodConcept || 'Pago de Nómina'}
                          </h5>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            {p.paymentDate} • {p.paymentMethod || 'Transferencia'} {p.operationNumber ? `(Op: ${p.operationNumber})` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                          {p.currency === 'USD' ? '$' : 'S/'} {p.amount.toLocaleString()}
                        </span>

                        {p.voucherUrl && (
                          <a
                            href={p.voucherUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="py-1 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 transition flex items-center gap-1 shadow-2xs"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Comprobante</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                  <DollarSign className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    No hay registros de pago aún
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                    Cuando Recursos Humanos abone tu salario o honorarios, aparecerán detallados aquí junto a sus vouchers de descarga.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: MIS PROYECTOS ASIGNADOS (WORKSPACE)               */}
          {/* ======================================================== */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Proyectos Asignados ({assignedProjects.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Campañas y cuentas en Workspace donde figuras como colaborador o responsable.
                  </p>
                </div>
              </div>

              {assignedProjects.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {assignedProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 transition shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1">
                            {proj.clientName || 'Cliente'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            proj.status === 'active'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {proj.status === 'active' ? 'Activo' : proj.status}
                          </span>
                        </div>

                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">
                          {proj.name}
                        </h4>

                        {proj.brandName && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold block mb-2">
                            Marca: {proj.brandName}
                          </span>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {proj.contractedPosts !== undefined && (
                            <span>{proj.contractedPosts} Posts</span>
                          )}
                          {proj.contractedReels !== undefined && (
                            <span>{proj.contractedReels} Reels</span>
                          )}
                          {proj.contractedStories !== undefined && (
                            <span>{proj.contractedStories} Stories</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                  <FolderKanban className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    No tienes proyectos asignados actualmente
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                    Un administrador o líder de proyecto puede asignarte a proyectos en el Workspace.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: DISPOSITIVOS Y SESIONES ACTIVAS (LÍMITE 3)        */}
          {/* ======================================================== */}
          {activeTab === 'devices' && (
            <div className="space-y-5">
              
              {/* Banner Informativo y Regla de Seguridad */}
              <div className="p-4 sm:p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-indigo-950 dark:text-indigo-200">
                      Control de Dispositivos Conectados ({activeCount} de {maxAllowed} permitidos)
                    </h4>
                    <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-0.5 max-w-xl">
                      Por seguridad de la empresa, cada usuario puede tener un máximo de <strong>3 dispositivos simultáneos</strong>. Las sesiones sin actividad durante más de <strong>30 minutos</strong> se cierran automáticamente.
                    </p>
                  </div>
                </div>

                {sessions.filter((s) => !s.isCurrent).length > 0 && (
                  <button
                    type="button"
                    onClick={handleRevokeOtherSessions}
                    className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar otras sesiones</span>
                  </button>
                )}
              </div>

              {/* Lista de Dispositivos */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Dispositivos con Sesión Abierta
                </h4>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  {sessions.map((sess) => {
                    const isCurrent = sess.isCurrent;
                    const DeviceIcon = sess.deviceType === 'mobile' ? Smartphone : sess.deviceType === 'tablet' ? Tablet : Laptop;

                    return (
                      <div
                        key={sess.id}
                        className={`p-4 flex items-center justify-between gap-3 transition ${
                          isCurrent ? 'bg-indigo-50/30 dark:bg-indigo-950/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            <DeviceIcon className="w-5 h-5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">
                                {sess.deviceName}
                              </h5>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                  Este dispositivo
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {sess.ipAddress && <span>IP: {sess.ipAddress}</span>}
                              {sess.ipAddress && <span>•</span>}
                              <span>Última actividad: {new Date(sess.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {!isCurrent ? (
                            <button
                              type="button"
                              onClick={() => handleRevokeSession(sess.id, sess.deviceName)}
                              className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                            >
                              Cerrar Sesión
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Activo</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
