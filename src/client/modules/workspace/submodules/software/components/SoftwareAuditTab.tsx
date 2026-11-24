import React, { useState } from 'react';
import { History, ShieldCheck, Search, Trash2, UserPlus } from 'lucide-react';
import {
  SoftwareProject,
  SoftwareProjectMemberRole,
  SoftwareProjectRoleAssignment,
  User,
} from '../../../../../../shared/types';

interface SoftwareAuditTabProps {
  project: SoftwareProject;
  teamUsers: User[];
  canManage: boolean;
  onUpdateProjectRoles: (roles: SoftwareProjectRoleAssignment[]) => Promise<void>;
}

const ROLE_LABELS: Record<SoftwareProjectMemberRole, { label: string; desc: string; cls: string }> = {
  tech_lead: {
    label: 'Tech Lead',
    desc: 'Control total del proyecto, hitos, bóveda y releases',
    cls: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  },
  developer: {
    label: 'Developer',
    desc: 'Gestiona tareas, Kanban, sprints, cronómetro y PRs',
    cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  qa_tester: {
    label: 'QA Tester',
    desc: 'Reporta bugs, ejecuta casos de prueba y verifica QA',
    cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  viewer: {
    label: 'Solo Lectura',
    desc: 'Visualiza avances y comenta sin modificar tareas ni hitos',
    cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  },
};

export const SoftwareAuditTab: React.FC<SoftwareAuditTabProps> = ({
  project,
  teamUsers,
  canManage,
  onUpdateProjectRoles,
}) => {
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<SoftwareProjectMemberRole>('developer');

  const roles = project.projectRoles || [];
  const auditLog = project.auditLog || [];

  const filteredAudit = auditLog.filter((entry) => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return true;
    return `${entry.action} ${entry.summary} ${entry.actorName}`.toLowerCase().includes(q);
  });

  const handleAssignRole = async () => {
    if (!selectedUserId) return;
    const u = teamUsers.find((usr) => usr.id === selectedUserId);
    if (!u) return;
    const without = roles.filter((r) => r.userId !== u.id);
    await onUpdateProjectRoles([
      ...without,
      { userId: u.id, userName: u.name, projectRole: selectedRole },
    ]);
    setSelectedUserId('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Permisos Granulares por Proyecto */}
      <div className="lg:col-span-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-500" /> Permisos Granulares del Proyecto
          </h4>
          <p className="text-xs text-slate-500">
            Define el rol específico de cada miembro dentro de este proyecto (Tech Lead, Developer, QA Tester o Solo Lectura).
          </p>
        </div>

        {canManage && (
          <div className="space-y-2 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="">-- Seleccionar miembro del equipo --</option>
              {teamUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as SoftwareProjectMemberRole)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                {(Object.keys(ROLE_LABELS) as SoftwareProjectMemberRole[]).map((rk) => (
                  <option key={rk} value={rk}>
                    {ROLE_LABELS[rk].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAssignRole}
                disabled={!selectedUserId}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" /> Asignar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {roles.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Sin roles específicos asignados: se aplica el permiso general del módulo.
            </p>
          ) : (
            roles.map((r) => {
              const meta = ROLE_LABELS[r.projectRole];
              return (
                <div
                  key={r.userId}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{r.userName}</p>
                    <p className="text-[10px] text-slate-400">{meta.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${meta.cls}`}>
                      {meta.label}
                    </span>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => onUpdateProjectRoles(roles.filter((x) => x.userId !== r.userId))}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Audit Trail completo */}
      <div className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-sky-500" /> Log de Actividad / Audit Trail ({auditLog.length})
            </h4>
            <p className="text-xs text-slate-500">
              Trazabilidad de releases, webhooks Git, accesos a la bóveda y cambios del proyecto.
            </p>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Filtrar auditoría..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
            />
          </div>
        </div>

        {filteredAudit.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            Sin registros de auditoría que coincidan con el filtro.
          </p>
        ) : (
          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredAudit.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mr-1.5">
                    {entry.action}
                  </span>
                  <span className="text-slate-800 dark:text-slate-100 font-medium">{entry.summary}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  <strong>{entry.actorName}</strong> · {new Date(entry.createdAt).toLocaleString('es-PE')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
