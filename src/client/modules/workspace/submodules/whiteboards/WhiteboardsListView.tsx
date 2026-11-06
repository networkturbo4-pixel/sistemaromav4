import React, { useState, useMemo } from 'react';
import {
  Plus,
  FolderPlus,
  Search,
  Folder,
  Tag,
  Users,
  MoreVertical,
  ExternalLink,
  Share2,
  Copy,
  Trash2,
  Edit2,
  Layers,
  Sparkles,
  Calendar,
  Clock,
  Globe,
  Lock,
  ArrowRight,
  FolderOpen,
  X,
} from 'lucide-react';
import {
  Whiteboard,
  WhiteboardFolder,
  WhiteboardTag,
  WhiteboardAccessType,
  WhiteboardPublicRole,
} from '../../../../../shared/types';
import { useApp } from '../../../../context/AppContext';
import { WhiteboardFolderModal } from './WhiteboardFolderModal';
import { WhiteboardShareModal } from './WhiteboardShareModal';

interface WhiteboardsListViewProps {
  whiteboards: Whiteboard[];
  folders: Array<WhiteboardFolder & { boardCount: number }>;
  onOpenWhiteboard: (boardId: string) => void;
  onRefresh: () => Promise<void>;
}

export const WhiteboardsListView: React.FC<WhiteboardsListViewProps> = ({
  whiteboards,
  folders,
  onOpenWhiteboard,
  onRefresh,
}) => {
  const { user, toast, confirmAction, apiFetch } = useApp();

  // Filtros
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<WhiteboardFolder | null>(null);
  const [shareModalBoardId, setShareModalBoardId] = useState<string | null>(null);

  // Modal Nueva Pizarra
  const [isNewBoardModalOpen, setIsNewBoardModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFolderId, setNewFolderId] = useState<string>('');
  const [newTagsStr, setNewTagsStr] = useState('');
  const [newAccessType, setNewAccessType] = useState<WhiteboardAccessType>('restricted');
  const [creatingBoard, setCreatingBoard] = useState(false);

  // Menú contextual activo por tarjeta
  const [activeMenuBoardId, setActiveMenuBoardId] = useState<string | null>(null);

  // Extraer tags únicos de todas las pizarras para la barra "Quick Tags"
  const uniqueTags = useMemo(() => {
    const tagMap = new Map<string, WhiteboardTag>();
    whiteboards.forEach((wb) => {
      wb.tags?.forEach((t) => {
        if (t.name && !tagMap.has(t.name.toLowerCase())) {
          tagMap.set(t.name.toLowerCase(), t);
        }
      });
    });
    return Array.from(tagMap.values());
  }, [whiteboards]);

  // Filtrado reactivo de pizarras
  const filteredBoards = useMemo(() => {
    return whiteboards.filter((b) => {
      // Filtro por carpeta
      if (selectedFolderId === 'none') {
        if (b.folderId) return false;
      } else if (selectedFolderId !== 'all') {
        if (b.folderId !== selectedFolderId) return false;
      }

      // Filtro por etiqueta
      if (selectedTag) {
        const hasTag = b.tags?.some(
          (t) => t.name.toLowerCase() === selectedTag.toLowerCase()
        );
        if (!hasTag) return false;
      }

      // Filtro por texto de búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = b.title.toLowerCase().includes(q);
        const matchesTag = b.tags?.some((t) => t.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesTag) return false;
      }

      return true;
    });
  }, [whiteboards, selectedFolderId, selectedTag, searchQuery]);

  // Contadores estadísticos
  const stats = useMemo(() => {
    const total = whiteboards.length;
    const createdByMe = whiteboards.filter((w) => w.createdBy === user?.id).length;
    const sharedWithMe = total - createdByMe;
    const totalFolders = folders.length;
    return { total, createdByMe, sharedWithMe, totalFolders };
  }, [whiteboards, folders, user]);

  // Crear Pizarra
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setCreatingBoard(true);

      const parsedTags: WhiteboardTag[] = newTagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((name) => ({
          name,
          color: '#3b82f6',
        }));

      const res = await apiFetch('/api/workspace/whiteboards', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          folderId: newFolderId || null,
          tags: parsedTags,
          accessType: newAccessType,
          publicRole: 'viewer',
        }),
      });

      if (res && res.whiteboard) {
        toast('success', '¡Pizarra creada exitosamente!');
        setIsNewBoardModalOpen(false);
        setNewTitle('');
        setNewFolderId('');
        setNewTagsStr('');
        await onRefresh();
        // Abrir inmediatamente la pizarra recién creada
        onOpenWhiteboard(res.whiteboard.id);
      }
    } catch (err: any) {
      toast('error', 'Error al crear pizarra: ' + err.message);
    } finally {
      setCreatingBoard(false);
    }
  };

  // Duplicar Pizarra
  const handleDuplicateBoard = async (boardId: string) => {
    try {
      const res = await apiFetch(`/api/workspace/whiteboards/${boardId}/duplicate`, {
        method: 'POST',
      });
      if (res && res.whiteboard) {
        toast('success', 'Pizarra duplicada con éxito');
        await onRefresh();
      }
    } catch (err: any) {
      toast('error', 'Error al duplicar pizarra: ' + err.message);
    }
  };

  // Eliminar Pizarra
  const handleDeleteBoard = async (board: Whiteboard) => {
    const confirmed = await confirmAction({
      title: 'Eliminar Pizarra',
      message: `¿Estás seguro de que deseas eliminar permanentemente la pizarra "${board.title}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar pizarra',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await apiFetch(`/api/workspace/whiteboards/${board.id}`, {
        method: 'DELETE',
      });
      toast('success', 'Pizarra eliminada');
      await onRefresh();
    } catch (err: any) {
      toast('error', 'Error al eliminar pizarra: ' + err.message);
    }
  };

  // Guardar Carpeta (Crear o Editar)
  const handleSaveFolder = async (data: { name: string; color: string }) => {
    try {
      if (editingFolder) {
        await apiFetch(`/api/workspace/whiteboards/folders/${editingFolder.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        toast('success', 'Carpeta actualizada');
      } else {
        await apiFetch('/api/workspace/whiteboards/folders', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        toast('success', 'Carpeta creada');
      }
      await onRefresh();
    } catch (err: any) {
      toast('error', 'Error al guardar carpeta: ' + err.message);
    }
  };

  // Eliminar Carpeta
  const handleDeleteFolder = async (folder: WhiteboardFolder) => {
    const confirmed = await confirmAction({
      title: 'Eliminar Carpeta',
      message: `¿Eliminar la carpeta "${folder.name}"? Las pizarras que contiene no serán borradas, quedarán en la sección sin carpeta.`,
      confirmText: 'Sí, eliminar carpeta',
      danger: true,
    });
    if (!confirmed) return;

    try {
      await apiFetch(`/api/workspace/whiteboards/folders/${folder.id}`, {
        method: 'DELETE',
      });
      toast('success', 'Carpeta eliminada');
      if (selectedFolderId === folder.id) {
        setSelectedFolderId('all');
      }
      await onRefresh();
    } catch (err: any) {
      toast('error', 'Error al eliminar carpeta: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header principal */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 inline-block">
              Estudio Creativo & Diagramas
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            Pizarras Colaborativas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Lienzos infinitos en tiempo real, esquemas de diseño, notas visuales, wireframes y flujos creativos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setEditingFolder(null);
              setIsFolderModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <FolderPlus className="w-4 h-4 text-slate-500" />
            <span>Nueva Carpeta</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewBoardModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md shadow-purple-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Pizarra</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Pizarras</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.total}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Creadas por mí</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.createdByMe}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Compartidas</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.sharedWithMe}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Carpetas Activas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Folder className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.totalFolders}
          </div>
        </div>
      </div>

      {/* 3. Barra de búsqueda y carpetas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Panel lateral de Carpetas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-purple-600" />
              Carpetas
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingFolder(null);
                setIsFolderModalOpen(true);
              }}
              className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>Nueva</span>
            </button>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedFolderId('all')}
              className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition ${
                selectedFolderId === 'all'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>Todas las Pizarras</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-black">
                {whiteboards.length}
              </span>
            </button>

            {folders.map((f) => (
              <div
                key={f.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${
                  selectedFolderId === f.id
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedFolderId(f.id)}
                  className="flex items-center gap-2.5 flex-1 text-left truncate mr-2"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: f.color || '#3b82f6' }}
                  />
                  <span className="truncate">{f.name}</span>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-black">
                    {f.boardCount}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolder(f);
                      setIsFolderModalOpen(true);
                    }}
                    className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1.5 hover:text-indigo-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="Editar carpeta"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(f);
                    }}
                    className="opacity-70 sm:opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="Eliminar carpeta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setSelectedFolderId('none')}
              className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition ${
                selectedFolderId === 'none'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>Sin Carpeta</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-black">
                {whiteboards.filter((b) => !b.folderId).length}
              </span>
            </button>
          </div>
        </div>

        {/* Listado principal con Buscador y Quick Tags */}
        <div className="lg:col-span-3 space-y-4">
          {/* Barra de Búsqueda y Tags */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título o etiqueta de pizarra..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
              />
            </div>

            {/* Quick Tags Pills */}
            {uniqueTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1">
                  Tags:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition ${
                    selectedTag === null
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Todos
                </button>
                {uniqueTags.map((tag) => (
                  <button
                    type="button"
                    key={tag.name}
                    onClick={() =>
                      setSelectedTag(selectedTag === tag.name ? null : tag.name)
                    }
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 ${
                      selectedTag === tag.name
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color || '#3b82f6' }}
                    />
                    <span>{tag.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid de Pizarras */}
          {filteredBoards.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                No se encontraron pizarras
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedTag || selectedFolderId !== 'all'
                  ? 'Intenta cambiar los filtros de búsqueda o carpeta.'
                  : 'Crea tu primera pizarra interactiva para comenzar a diseñar.'}
              </p>
              <button
                type="button"
                onClick={() => setIsNewBoardModalOpen(true)}
                className="mt-5 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black inline-flex items-center gap-2 transition cursor-pointer shadow-md shadow-purple-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primera Pizarra</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredBoards.map((board) => {
                const folder = folders.find((f) => f.id === board.folderId);
                const isMenuOpen = activeMenuBoardId === board.id;

                return (
                  <div
                    key={board.id}
                    className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600/50 transition-all duration-200 flex flex-col justify-between"
                  >
                    {/* Header de la tarjeta con imagen de fondo o preview */}
                    <div
                      onClick={() => onOpenWhiteboard(board.id)}
                      className="relative h-40 bg-slate-100 dark:bg-slate-800/80 cursor-pointer overflow-hidden flex items-center justify-center group-hover:scale-[1.01] transition-transform"
                    >
                      {board.thumbnail ? (
                        <img
                          src={board.thumbnail}
                          alt={board.title}
                          className="w-full h-full object-cover"
                        />
                      ) : board.profilePic ? (
                        <img
                          src={board.profilePic}
                          alt={board.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                          <Layers className="w-10 h-10 mb-1 opacity-60" />
                          <span className="text-[11px] font-bold">Lienzo en blanco</span>
                        </div>
                      )}

                      {/* Pill de Carpeta flotante */}
                      {folder && (
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-[10px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 shadow-xs">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: folder.color }}
                          />
                          <span>{folder.name}</span>
                        </div>
                      )}

                      {/* Pill de Acceso Público / Privado */}
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-[10px] font-bold border border-slate-200/60 dark:border-slate-700/60 shadow-xs flex items-center gap-1">
                        {board.accessType === 'public' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            <span>Pública</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Privada</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contenido de la tarjeta */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Título y menú */}
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            onClick={() => onOpenWhiteboard(board.id)}
                            className="text-sm font-extrabold text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer line-clamp-1"
                          >
                            {board.title}
                          </h3>

                          {/* Menú de opciones */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuBoardId(isMenuOpen ? null : board.id)
                              }
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div
                                onMouseLeave={() => setActiveMenuBoardId(null)}
                                className="absolute right-0 top-full mt-1 w-44 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-20 py-1.5 animate-fadeIn"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuBoardId(null);
                                    onOpenWhiteboard(board.id);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
                                  <span>Abrir Lienzo</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuBoardId(null);
                                    setShareModalBoardId(board.id);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Compartir</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuBoardId(null);
                                    handleDuplicateBoard(board.id);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2"
                                >
                                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Duplicar</span>
                                </button>

                                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuBoardId(null);
                                    handleDeleteBoard(board);
                                  }}
                                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Eliminar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Etiquetas */}
                        {board.tags && board.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                            {board.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              >
                                #{t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer de tarjeta: avatares y fecha */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        {/* Avatares de colaboradores */}
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {board.assignedUsers && board.assignedUsers.length > 0 ? (
                            board.assignedUsers.slice(0, 3).map((u, i) => (
                              <div
                                key={i}
                                title={u.userName || 'Colaborador'}
                                className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border-2 border-white dark:border-slate-900 text-[9px] font-extrabold flex items-center justify-center"
                              >
                                {u.userName?.substring(0, 2).toUpperCase() || 'US'}
                              </div>
                            ))
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 border-2 border-white dark:border-slate-900 text-[9px] font-extrabold flex items-center justify-center">
                              YO
                            </div>
                          )}
                          {board.assignedUsers && board.assignedUsers.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-2 border-white dark:border-slate-900 text-[9px] font-extrabold flex items-center justify-center">
                              +{board.assignedUsers.length - 3}
                            </div>
                          )}
                        </div>

                        {/* Botón directo de entrar */}
                        <button
                          type="button"
                          onClick={() => onOpenWhiteboard(board.id)}
                          className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1"
                        >
                          <span>Entrar</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Pizarra */}
      {isNewBoardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Nueva Pizarra Creativa
                  </h3>
                  <p className="text-xs text-slate-400">
                    Crea un lienzo infinito para diagramas y notas visuales
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewBoardModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Título de la Pizarra *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Brainstorming Lanzamiento, Wireframe Web, Estrategia..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Carpeta de Destino
                </label>
                <select
                  value={newFolderId}
                  onChange={(e) => setNewFolderId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="">Sin Carpeta (Lienzo Libre)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Etiquetas (separadas por comas)
                </label>
                <input
                  type="text"
                  value={newTagsStr}
                  onChange={(e) => setNewTagsStr(e.target.value)}
                  placeholder="ej: diseño, cliente, wireframe, q1"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Privacidad Inicial
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewAccessType('restricted')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      newAccessType === 'restricted'
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Privada</div>
                      <div className="text-[10px] opacity-75">Solo tu equipo</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAccessType('public')}
                    className={`p-3 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      newAccessType === 'public'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Pública</div>
                      <div className="text-[10px] opacity-75">Con enlace</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewBoardModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingBoard || !newTitle.trim()}
                  className="px-5 py-2 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-md shadow-purple-500/20 transition cursor-pointer"
                >
                  {creatingBoard ? 'Creando...' : 'Crear y Abrir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Carpeta */}
      <WhiteboardFolderModal
        isOpen={isFolderModalOpen}
        folder={editingFolder}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onSave={handleSaveFolder}
        onDelete={handleDeleteFolder}
      />

      {/* Modal Compartir Pizarra */}
      {shareModalBoardId && (
        <WhiteboardShareModal
          isOpen={Boolean(shareModalBoardId)}
          whiteboardId={shareModalBoardId}
          onClose={() => setShareModalBoardId(null)}
        />
      )}
    </div>
  );
};
