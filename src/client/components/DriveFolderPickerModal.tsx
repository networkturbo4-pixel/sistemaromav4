import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DriveFolder, DriveConnectionStatus } from '../../shared/types';
import {
  Folder,
  FolderPlus,
  HardDrive,
  Search,
  ChevronRight,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Plus,
  CornerDownRight,
} from 'lucide-react';

interface DriveFolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (folder: { id: string; name: string; webViewLink?: string }) => void;
  currentSelectedId?: string;
  title?: string;
  subtitle?: string;
}

export const DriveFolderPickerModal: React.FC<DriveFolderPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentSelectedId,
  title = 'Asignar Carpeta de Google Drive',
  subtitle = 'Selecciona o crea la carpeta donde se guardarán los archivos de este proyecto.',
}) => {
  const { token, toast } = useApp();

  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<DriveConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Carpeta activa para navegar
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeFolderName, setActiveFolderName] = useState<string>('ROMA AGENCIA 2027');

  // Carpeta seleccionada por el usuario (puede ser la carpeta activa o una seleccionada en la lista)
  const [selectedFolder, setSelectedFolder] = useState<{ id: string; name: string; webViewLink?: string } | null>(null);

  // Modo crear nueva carpeta
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);

  // Cargar carpetas y estado al abrir
  const loadPickerData = async () => {
    setLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const [statusRes, foldersRes] = await Promise.all([
        fetch('/api/drive/status', { headers }).then((r) => r.json()).catch(() => null),
        fetch('/api/drive/folders', { headers }).then((r) => r.json()).catch(() => ({ folders: [] })),
      ]);

      if (statusRes) {
        setConnectionStatus(statusRes);
        if (!activeFolderId) {
          setActiveFolderName(statusRes.rootFolderName || 'ROMA AGENCIA 2027');
        }
      }
      if (foldersRes?.folders) {
        setFolders(foldersRes.folders);
        // Si ya había una carpeta seleccionada, buscarla
        if (currentSelectedId) {
          const matched = foldersRes.folders.find(
            (f: DriveFolder) => f.googleFolderId === currentSelectedId || f.id === currentSelectedId
          );
          if (matched) {
            setSelectedFolder({
              id: matched.googleFolderId,
              name: matched.name,
              webViewLink: matched.webViewLink,
            });
          }
        }
      }
    } catch {
      toast('Error al consultar carpetas de Google Drive', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPickerData();
      setIsCreatingNew(false);
      setNewFolderName('');
      setSearchQuery('');
    }
  }, [isOpen]);

  const effectiveRootFolderId = connectionStatus?.rootFolderId || null;
  const currentParentId = activeFolderId || effectiveRootFolderId;

  // Cadena de migas de pan (Breadcrumbs)
  const breadcrumbs = useMemo(() => {
    const rootName = connectionStatus?.rootFolderName || 'ROMA AGENCIA 2027';
    const chain: Array<{ id: string | null; name: string }> = [{ id: null, name: rootName }];
    if (!activeFolderId || activeFolderId === effectiveRootFolderId) return chain;

    const visited = new Set<string>();
    const ancestors: Array<{ id: string; name: string }> = [];
    let curId: string | null = activeFolderId;

    while (curId && curId !== effectiveRootFolderId && !visited.has(curId)) {
      visited.add(curId);
      const f = folders.find((item) => item.googleFolderId === curId || item.id === curId);
      if (f) {
        ancestors.unshift({ id: f.googleFolderId, name: f.name });
        curId = f.parentGoogleFolderId || null;
      } else {
        ancestors.unshift({ id: curId, name: activeFolderName });
        break;
      }
    }

    return [...chain, ...ancestors];
  }, [activeFolderId, activeFolderName, folders, effectiveRootFolderId, connectionStatus]);

  // Carpetas visibles en la vista actual
  const visibleFolders = useMemo(() => {
    return folders.filter((f) => {
      if (effectiveRootFolderId && f.googleFolderId === effectiveRootFolderId) return false;

      // Si hay búsqueda, filtrar por nombre sin importar nivel
      if (searchQuery.trim()) {
        return f.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }

      // Si no hay búsqueda, mostrar las hijas de la carpeta activa
      if (currentParentId) {
        return f.parentGoogleFolderId === currentParentId;
      } else {
        return !f.parentGoogleFolderId || f.parentGoogleFolderId === 'root';
      }
    });
  }, [folders, currentParentId, effectiveRootFolderId, searchQuery]);

  // Crear una nueva carpeta dentro del nivel actual
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingLoading(true);
    try {
      const res = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentFolderId: activeFolderId || effectiveRootFolderId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear carpeta.');
      }

      const data = await res.json();
      const created = data.folder;

      toast(`Carpeta "${newFolderName}" creada con éxito`, 'success');
      setFolders((prev) => [created, ...prev]);

      // Seleccionar automáticamente la recién creada
      setSelectedFolder({
        id: created.googleFolderId || created.id,
        name: created.name,
        webViewLink: created.webViewLink,
      });

      setIsCreatingNew(false);
      setNewFolderName('');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setCreatingLoading(false);
    }
  };

  const handleConfirmSelect = () => {
    if (selectedFolder) {
      onSelect(selectedFolder);
      onClose();
    } else if (activeFolderId) {
      onSelect({
        id: activeFolderId,
        name: activeFolderName,
      });
      onClose();
    } else if (effectiveRootFolderId) {
      onSelect({
        id: effectiveRootFolderId,
        name: connectionStatus?.rootFolderName || 'ROMA AGENCIA 2027',
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Folder className="w-5 h-5 fill-white/20" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Búsqueda y Crear Carpeta */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar carpetas existentes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingNew(!isCreatingNew)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 transition shadow-xs shrink-0"
          >
            <FolderPlus className="w-4 h-4 text-amber-500" />
            <span>Nueva Carpeta</span>
          </button>
        </div>

        {/* Formulario rápido para crear carpeta */}
        {isCreatingNew && (
          <form
            onSubmit={handleCreateFolder}
            className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center gap-2 animate-in fade-in"
          >
            <div className="flex-1">
              <input
                type="text"
                autoFocus
                required
                placeholder={`Nombre de la nueva carpeta dentro de "${activeFolderName}"...`}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="px-3 py-1.5 text-xs text-slate-500 font-bold hover:bg-white/50 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creatingLoading}
              className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition"
            >
              {creatingLoading ? 'Creando...' : 'Crear'}
            </button>
          </form>
        )}

        {/* Ruta de navegación (Breadcrumbs) */}
        {!searchQuery && (
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 overflow-x-auto bg-white dark:bg-slate-900">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.id || 'root'}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFolderId(crumb.id);
                      setActiveFolderName(crumb.name);
                    }}
                    className={`px-2 py-0.5 rounded-lg transition flex items-center gap-1 shrink-0 ${
                      isLast
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-extrabold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {idx === 0 ? <HardDrive className="w-3.5 h-3.5 text-blue-500" /> : <Folder className="w-3.5 h-3.5 text-amber-500" />}
                    <span>{crumb.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Lista de Carpetas Disponibles */}
        <div className="p-4 flex-1 overflow-y-auto min-h-[220px]">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-xs font-bold">Cargando carpetas de Drive...</p>
            </div>
          ) : visibleFolders.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center gap-2 text-center text-slate-400">
              <Folder className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {searchQuery ? 'No se encontraron carpetas con ese nombre' : 'No hay subcarpetas en este nivel'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Puedes seleccionar esta carpeta directamente con el botón de abajo o crear una nueva con "Nueva Carpeta".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {visibleFolders.map((fld) => {
                const isSelected = selectedFolder?.id === fld.googleFolderId;
                const folderColor = fld.color || '#f59e0b';

                return (
                  <div
                    key={fld.id}
                    onClick={() => {
                      setSelectedFolder({
                        id: fld.googleFolderId,
                        name: fld.name,
                        webViewLink: fld.webViewLink,
                      });
                    }}
                    onDoubleClick={() => {
                      // Entrar a la carpeta
                      setActiveFolderId(fld.googleFolderId);
                      setActiveFolderName(fld.name);
                    }}
                    className={`group p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-400 hover:shadow-xs bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${folderColor}20` }}
                      >
                        <Folder className="w-5 h-5" style={{ color: folderColor, fill: `${folderColor}40` }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={fld.name}>
                          {fld.name}
                        </p>
                        <p className="text-[10px] text-slate-400">Doble clic para entrar</p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFolderId(fld.googleFolderId);
                            setActiveFolderName(fld.name);
                          }}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600"
                          title="Explorar subcarpetas"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer con Carpeta Seleccionada y Botón de Asignación */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 shrink-0">Seleccionada:</span>
            <div className="flex items-center gap-1.5 font-extrabold text-blue-600 dark:text-blue-400 truncate">
              <Folder className="w-4 h-4 shrink-0 text-amber-500" />
              <span className="truncate">
                {selectedFolder?.name || activeFolderName || 'Carpeta Raíz'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmSelect}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Asignar Esta Carpeta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DriveFolderPickerModal;
