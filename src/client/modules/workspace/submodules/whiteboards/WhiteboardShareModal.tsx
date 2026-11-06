import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Globe,
  Lock,
  Copy,
  Check,
  UserPlus,
  Mail,
  Trash2,
  Shield,
  Eye,
  Edit3,
} from 'lucide-react';
import {
  Whiteboard,
  WhiteboardAccessType,
  WhiteboardPublicRole,
  WhiteboardUserAccess,
  WhiteboardInvitation,
} from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';

interface WhiteboardShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  whiteboardId: string;
}

export const WhiteboardShareModal: React.FC<WhiteboardShareModalProps> = ({
  isOpen,
  onClose,
  whiteboardId,
}) => {
  const { toast, apiFetch } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [title, setTitle] = useState('');
  const [accessType, setAccessType] = useState<WhiteboardAccessType>('restricted');
  const [publicRole, setPublicRole] = useState<WhiteboardPublicRole>('viewer');
  const [shareToken, setShareToken] = useState('');

  const [assignedUsers, setAssignedUsers] = useState<WhiteboardUserAccess[]>([]);
  const [invitations, setInvitations] = useState<WhiteboardInvitation[]>([]);
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ id: string; name: string; email: string; avatar?: string }>
  >([]);

  // Campos para agregar nuevo colaborador
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserRole, setSelectedUserRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailRole, setInviteEmailRole] = useState<'editor' | 'viewer'>('viewer');

  const loadShareData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/workspace/whiteboards/${whiteboardId}/share`);
      if (res && res.data) {
        setTitle(res.data.title || 'Pizarra');
        setAccessType(res.data.accessType || 'restricted');
        setPublicRole(res.data.publicRole || 'viewer');
        setShareToken(res.data.shareToken || '');
        setAssignedUsers(res.data.assignedUsers || []);
        setInvitations(res.data.invitations || []);
        setAvailableUsers(res.data.availableUsers || []);
      }
    } catch (err: any) {
      toast('error', 'Error al cargar opciones de compartir: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && whiteboardId) {
      loadShareData();
    }
  }, [isOpen, whiteboardId]);

  if (!isOpen) return null;

  const publicLink = `${window.location.origin}/public/whiteboard/${shareToken || whiteboardId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    toast('success', 'Enlace copiado al portapapeles');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddMember = () => {
    if (!selectedUserId) return;
    const userToAdd = availableUsers.find((u) => u.id === selectedUserId);
    if (!userToAdd) return;

    if (assignedUsers.some((u) => u.userId === selectedUserId)) {
      toast('info', 'El usuario ya tiene acceso a esta pizarra');
      return;
    }

    setAssignedUsers([
      ...assignedUsers,
      {
        userId: userToAdd.id,
        userName: userToAdd.name,
        userAvatar: userToAdd.avatar,
        email: userToAdd.email,
        role: selectedUserRole,
      },
    ]);
    setSelectedUserId('');
  };

  const handleAddEmailInvite = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast('error', 'Por favor ingresa un correo válido');
      return;
    }

    const emailClean = inviteEmail.trim().toLowerCase();
    if (invitations.some((inv) => inv.email.toLowerCase() === emailClean)) {
      toast('info', 'Ya se envió una invitación a este correo');
      return;
    }

    const newInv: WhiteboardInvitation = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      whiteboardId,
      email: emailClean,
      role: inviteEmailRole,
      token: Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
    };

    setInvitations([...invitations, newInv]);
    setInviteEmail('');
  };

  const handleRemoveMember = (userId: string) => {
    setAssignedUsers(assignedUsers.filter((u) => u.userId !== userId));
  };

  const handleRemoveInvitation = (invId: string) => {
    setInvitations(invitations.filter((i) => i.id !== invId));
  };

  const handleSaveShare = async () => {
    try {
      setSaving(true);
      await apiFetch(`/api/workspace/whiteboards/${whiteboardId}/share`, {
        method: 'PUT',
        body: JSON.stringify({
          accessType,
          publicRole,
          assignedUsers,
          invitations,
        }),
      });
      toast('success', 'Configuración de acceso guardada con éxito');
      onClose();
    } catch (err: any) {
      toast('error', 'Error al guardar permisos: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Compartir Pizarra
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate max-w-xs">{title}</p>
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

        {/* Contenido scrolleable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              Cargando opciones de acceso...
            </div>
          ) : (
            <>
              {/* Sección 1: Enlace Público y Privacidad */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        accessType === 'public'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {accessType === 'public' ? (
                        <Globe className="w-5 h-5" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Acceso General
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {accessType === 'public'
                          ? 'Cualquier persona con el enlace puede acceder'
                          : 'Solo personas invitadas pueden acceder'}
                      </p>
                    </div>
                  </div>

                  {/* Selector de tipo de acceso */}
                  <select
                    value={accessType}
                    onChange={(e) => setAccessType(e.target.value as WhiteboardAccessType)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="restricted">Restringido</option>
                    <option value="public">Público con enlace</option>
                  </select>
                </div>

                {/* Si es público, configurar rol del visitante y botón de enlace */}
                {accessType === 'public' && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Permiso para visitantes:
                      </span>
                      <div className="inline-flex rounded-xl bg-slate-200 dark:bg-slate-700 p-0.5 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setPublicRole('viewer')}
                          className={`px-2.5 py-1 rounded-lg transition ${
                            publicRole === 'viewer'
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          Lector
                        </button>
                        <button
                          type="button"
                          onClick={() => setPublicRole('editor')}
                          className={`px-2.5 py-1 rounded-lg transition ${
                            publicRole === 'editor'
                              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                          Editor
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? '¡Copiado!' : 'Copiar enlace'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sección 2: Agregar miembros del equipo */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Invitar Colaborador del Equipo
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">Seleccionar colaborador...</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedUserRole}
                    onChange={(e) => setSelectedUserRole(e.target.value as 'editor' | 'viewer')}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Lector</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!selectedUserId}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>

              {/* Sección 3: Invitar por Correo Electrónico */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Invitar por Correo Electrónico
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="ejemplo@cliente.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                    />
                  </div>

                  <select
                    value={inviteEmailRole}
                    onChange={(e) => setInviteEmailRole(e.target.value as 'editor' | 'viewer')}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="viewer">Lector</option>
                    <option value="editor">Editor</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleAddEmailInvite}
                    disabled={!inviteEmail.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 text-white text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Invitar</span>
                  </button>
                </div>
              </div>

              {/* Sección 4: Lista de personas con acceso */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Personas con Acceso ({assignedUsers.length + invitations.length})
                </label>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                  {assignedUsers.map((user) => (
                    <div
                      key={user.userId}
                      className="p-3 flex items-center justify-between bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs flex items-center justify-center">
                          {user.userName?.substring(0, 2).toUpperCase() || 'US'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {user.userName || 'Usuario'}
                          </p>
                          <p className="text-[10px] text-slate-400">{user.email || 'Miembro'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => {
                            const newRole = e.target.value as 'editor' | 'viewer';
                            setAssignedUsers(
                              assignedUsers.map((u) =>
                                u.userId === user.userId ? { ...u, role: newRole } : u
                              )
                            );
                          }}
                          className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Lector</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveMember(user.userId)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-extrabold text-xs flex items-center justify-center">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {inv.email}
                          </p>
                          <p className="text-[10px] text-amber-500 font-semibold">
                            Invitación pendiente
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {inv.role === 'editor' ? 'Editor' : 'Lector'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInvitation(inv.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleSaveShare}
            disabled={saving || loading}
            className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};
