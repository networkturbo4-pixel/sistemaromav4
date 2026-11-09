import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp, PermissionGate } from '../context/AppContext';
import { useDriveUpload } from '../context/DriveUploadContext';
import {
  DriveFile,
  DriveFolder,
  DriveFolderBlueprint,
  DriveConnectionStatus,
  DriveFileCategory,
  Client,
  ServiceOrder,
} from '../../shared/types';
import {
  HardDrive,
  UploadCloud,
  FolderPlus,
  Folder,
  File,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  Archive,
  Search,
  Filter,
  Grid,
  List,
  ExternalLink,
  Download,
  Trash2,
  Edit2,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Eye,
  Info,
  Sliders,
  Settings,
  ShieldCheck,
  Building2,
  ClipboardList,
  Star,
  Palette,
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Play,
  Pause,
  StepForward,
  StepBack,
  CheckSquare,
  Square,
  CornerDownRight,
  FolderTree,
  Tag,
  FolderSync,
} from 'lucide-react';

const CATEGORY_LABELS: Record<DriveFileCategory, { label: string; color: string }> = {
  general: { label: 'General', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
  brief: { label: 'Brief & Contrato', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  deliverable: { label: 'Entregable Final', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  brand: { label: 'Identidad & Marca', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  invoice: { label: 'Factura / Comprobante', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  raw_asset: { label: 'Editable (AI/PSD/PR)', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  revision: { label: 'Revisión Cliente', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
};

const FOLDER_COLORS = [
  { name: 'Ámbar (Estándar)', hex: '#f59e0b', bgClass: 'bg-amber-500/15 text-amber-600' },
  { name: 'Rojo (Urgente)', hex: '#ef4444', bgClass: 'bg-rose-500/15 text-rose-600' },
  { name: 'Azul (Branding)', hex: '#3b82f6', bgClass: 'bg-blue-500/15 text-blue-600' },
  { name: 'Verde (Facturación)', hex: '#10b981', bgClass: 'bg-emerald-500/15 text-emerald-600' },
  { name: 'Púrpura (Audiovisual)', hex: '#8b5cf6', bgClass: 'bg-purple-500/15 text-purple-600' },
  { name: 'Rosa (Social Media)', hex: '#ec4899', bgClass: 'bg-pink-500/15 text-pink-600' },
  { name: 'Pizarra (Archivo)', hex: '#64748b', bgClass: 'bg-slate-500/15 text-slate-600' },
];

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(ms?: number): string {
  if (!ms) return '';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function getFileIcon(mime: string, name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (mime?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif'].includes(ext || '')) {
    return <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  if (['psd', 'ai', 'indd', 'eps', 'cdr'].includes(ext || '')) {
    return <ImageIcon className="w-4 h-4 text-rose-500 shrink-0" />;
  }
  if (mime?.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) {
    return <VideoIcon className="w-4 h-4 text-purple-500 shrink-0" />;
  }
  if (mime?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext || '')) {
    return <Music className="w-4 h-4 text-indigo-500 shrink-0" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
    return <Archive className="w-4 h-4 text-amber-500 shrink-0" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext || '')) {
    return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
  }
  return <File className="w-4 h-4 text-slate-400 shrink-0" />;
}

interface DriveModuleProps {
  onBack?: () => void;
}

export const DriveModule: React.FC<DriveModuleProps> = ({ onBack }) => {
  const { token, showToast, toast, confirmAction, can } = useApp();
  const notify = showToast || toast || ((msg: string) => console.log(msg));
  const { uploadFile, uploadFiles, isUploading } = useDriveUpload();

  // Estados de datos principales
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [blueprints, setBlueprints] = useState<DriveFolderBlueprint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<DriveConnectionStatus | null>(() => ({
    configured: true,
    connected: true,
    authType: 'oauth2',
    accountEmail: 'romacomercial22@gmail.com',
    rootFolderId: '10NqDpW6n4xHPQyfIIXY2TGN1skqWqlXj',
    rootFolderName: 'ROMA AGENCIA 2027',
  }));
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Navegación
  const [currentFolderId, setCurrentFolderIdState] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('folder') || null;
    } catch {
      return null;
    }
  });

  const [currentFolderName, setCurrentFolderNameState] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('folderName') || 'ROMA AGENCIA 2027';
    } catch {
      return 'ROMA AGENCIA 2027';
    }
  });

  const setCurrentFolder = (id: string | null, name?: string) => {
    setCurrentFolderIdState(id);
    setCurrentFolderNameState(name || connectionStatus?.rootFolderName || 'ROMA AGENCIA 2027');
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
    try {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('folder', id);
        if (name) url.searchParams.set('folderName', name);
      } else {
        url.searchParams.delete('folder');
        url.searchParams.delete('folderName');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  // Filtros y Vista
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedServiceOrderId, setSelectedServiceOrderId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc' | 'size_desc' | 'size_asc' | 'type'>('date_desc');
  const [autoNamingPrefix, setAutoNamingPrefix] = useState(false);

  // Selección múltiple
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [lastSelectedFileId, setLastSelectedFileId] = useState<string | null>(null);

  // Edición / Inline rename
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineEditingValue, setInlineEditingValue] = useState('');

  // Drag and Drop
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ type: 'file' | 'folder'; id: string } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Modales
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [batchMoveModalOpen, setBatchMoveModalOpen] = useState(false);
  const [batchTargetFolderId, setBatchTargetFolderId] = useState<string>('');
  const [colorPickerFolder, setColorPickerFolder] = useState<DriveFolder | null>(null);

  // Detección de duplicados
  const [duplicateModal, setDuplicateModal] = useState<{
    file: File;
    existingFile: DriveFile;
    targetFolderId?: string;
    targetFolderName?: string;
  } | null>(null);

  // Lightbox Multimedia Carousel
  const [lightboxFile, setLightboxFile] = useState<DriveFile | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Blueprint Form
  const [bpModule, setBpModule] = useState<'clients' | 'service_orders' | 'workspace'>('clients');
  const [bpTargetId, setBpTargetId] = useState<string>('');
  const [bpSelectedBlueprintId, setBpSelectedBlueprintId] = useState<string>('');
  const [bpCustomSubfolders, setBpCustomSubfolders] = useState<string>('');
  const [isApplyingBlueprint, setIsApplyingBlueprint] = useState(false);

  // Carga de datos ultra-rápida con sincronización en segundo plano
  const loadData = async (silent = false, forceSync = false) => {
    if (!silent && files.length === 0 && folders.length === 0) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const syncQuery = forceSync ? '?sync=true' : '';
      const [statusRes, filesRes, foldersRes, bpsRes, clientsRes, ordersRes] = await Promise.all([
        fetch(`/api/drive/status${forceSync ? '?force=true' : ''}`, { headers }).then((r) => r.json()).catch(() => null),
        fetch(`/api/drive/files${syncQuery}`, { headers }).then((r) => r.json()).catch(() => ({ files: [] })),
        fetch(`/api/drive/folders${syncQuery}`, { headers }).then((r) => r.json()).catch(() => ({ folders: [] })),
        fetch('/api/drive/blueprints', { headers }).then((r) => r.json()).catch(() => ({ blueprints: [] })),
        can('clients.view') || can('workspace.view')
          ? fetch('/api/clients', { headers }).then((r) => r.json()).catch(() => ({ clients: [] }))
          : Promise.resolve({ clients: [] }),
        can('service_orders.view') || can('workspace.view')
          ? fetch('/api/service-orders', { headers }).then((r) => r.json()).catch(() => ({ orders: [] }))
          : Promise.resolve({ orders: [] }),
      ]);

      if (statusRes) setConnectionStatus(statusRes);
      if (filesRes?.files) setFiles(filesRes.files);
      if (foldersRes?.folders) setFolders(foldersRes.folders);
      if (bpsRes?.blueprints) setBlueprints(bpsRes.blueprints);
      if (clientsRes?.clients) setClients(clientsRes.clients);
      if (ordersRes?.orders) setServiceOrders(ordersRes.orders);
    } catch (err: any) {
      notify('Error cargando Google Drive: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleDriveRefresh = () => {
      loadData(true);
    };
    window.addEventListener('roma:drive:refresh', handleDriveRefresh);
    return () => {
      window.removeEventListener('roma:drive:refresh', handleDriveRefresh);
    };
  }, []);

  // Carpeta efectiva raíz
  const effectiveRootFolderId = connectionStatus?.rootFolderId || null;
  const activeParentFolderId = currentFolderId || effectiveRootFolderId;

  // 1. Cadena de Ruta Multinivel Real (Breadcrumbs)
  const folderPathChain = useMemo(() => {
    const chain: Array<{ id: string | null; name: string }> = [
      { id: null, name: connectionStatus?.rootFolderName || 'ROMA AGENCIA 2027' },
    ];
    if (!currentFolderId || currentFolderId === effectiveRootFolderId) return chain;

    const visited = new Set<string>();
    const ancestors: Array<{ id: string; name: string }> = [];
    let curId: string | null = currentFolderId;

    while (curId && curId !== effectiveRootFolderId && !visited.has(curId)) {
      visited.add(curId);
      const f = folders.find((item) => item.googleFolderId === curId || item.id === curId);
      if (f) {
        ancestors.unshift({ id: f.googleFolderId, name: f.name });
        curId = f.parentGoogleFolderId || null;
      } else {
        ancestors.unshift({ id: curId, name: currentFolderName });
        break;
      }
    }

    return [...chain, ...ancestors];
  }, [currentFolderId, currentFolderName, folders, effectiveRootFolderId, connectionStatus]);

  // Manejo de pegado desde portapapeles (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData?.items) return;
      const items = Array.from(e.clipboardData.items);
      const fileItems = items.filter((i) => i.kind === 'file');
      if (fileItems.length > 0) {
        const filesToUpload: File[] = [];
        fileItems.forEach((item) => {
          const f = item.getAsFile();
          if (f) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const renamed = new window.File([f], `Captura_${timestamp}.png`, { type: f.type || 'image/png' });
            filesToUpload.push(renamed);
          }
        });
        if (filesToUpload.length > 0) {
          notify(`Subiendo ${filesToUpload.length} captura(s) pegada(s) del portapapeles...`, 'info');
          handleBatchUploadFiles(filesToUpload);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [currentFolderId, currentFolderName, selectedClientId, selectedServiceOrderId, selectedCategory]);

  // Pre-procesamiento de nombre con prefijo de agencia
  const formatAutoName = (originalName: string) => {
    if (!autoNamingPrefix) return originalName;
    const selectedOrder = serviceOrders.find((o) => o.id === selectedServiceOrderId);
    const selectedClient = clients.find((c) => c.id === selectedClientId);
    const osPart = selectedOrder ? `[${selectedOrder.code}]_` : '';
    const clientPart = selectedClient ? `${selectedClient.name.replace(/\s+/g, '-')}_` : '';
    const datePart = new Date().toISOString().split('T')[0] + '_';
    return `${osPart}${clientPart}${datePart}${originalName}`;
  };

  // Subida de archivos con verificación de duplicados
  const handleBatchUploadFiles = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    const targetFolderId = currentFolderId || effectiveRootFolderId || undefined;
    const targetFolderName = currentFolderId ? currentFolderName : (connectionStatus?.rootFolderName || undefined);
    const selectedClient = clients.find((c) => c.id === selectedClientId);
    const selectedOrder = serviceOrders.find((o) => o.id === selectedServiceOrderId);

    for (const f of filesArray) {
      const finalName = formatAutoName(f.name);
      // Chequear duplicado en la carpeta activa
      const existing = files.find(
        (existingFile) =>
          existingFile.name.toLowerCase() === finalName.toLowerCase() &&
          existingFile.parentFolderId === (targetFolderId || effectiveRootFolderId)
      );

      if (existing) {
        setDuplicateModal({
          file: f,
          existingFile: existing,
          targetFolderId,
          targetFolderName,
        });
        return; // El modal resolverá el archivo
      }

      await uploadFile(f, {
        parentFolderId: targetFolderId,
        parentFolderName: targetFolderName,
        clientId: selectedClientId !== 'all' ? selectedClientId : undefined,
        clientName: selectedClient?.name,
        serviceOrderId: selectedServiceOrderId !== 'all' ? selectedServiceOrderId : undefined,
        serviceOrderCode: selectedOrder?.code,
        category: selectedCategory !== 'all' ? (selectedCategory as DriveFileCategory) : 'general',
        customFileName: finalName !== f.name ? finalName : undefined,
      });
    }

    setTimeout(() => loadData(true), 2500);
  };

  // Subida de carpetas enteras con subcarpetas (Directory Drop)
  const handleDirectoryDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) {
      if (e.dataTransfer.files?.length > 0) {
        handleBatchUploadFiles(e.dataTransfer.files);
      }
      return;
    }

    const entries: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = (items[i] as any).webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    if (entries.length === 0) {
      if (e.dataTransfer.files?.length > 0) handleBatchUploadFiles(e.dataTransfer.files);
      return;
    }

    notify('Escaneando estructura completa de carpetas y archivos...', 'info');

    const traverseEntry = async (entry: any, parentGoogleId?: string): Promise<void> => {
      if (entry.isFile) {
        const file: File = await new Promise((res) => entry.file(res));
        await uploadFile(file, {
          parentFolderId: parentGoogleId || currentFolderId || effectiveRootFolderId || undefined,
          clientId: selectedClientId !== 'all' ? selectedClientId : undefined,
          serviceOrderId: selectedServiceOrderId !== 'all' ? selectedServiceOrderId : undefined,
          category: selectedCategory !== 'all' ? (selectedCategory as DriveFileCategory) : 'general',
        });
      } else if (entry.isDirectory) {
        // Crear carpeta correspondiente en Google Drive
        try {
          const res = await fetch('/api/drive/folders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              name: entry.name,
              parentFolderId: parentGoogleId || currentFolderId || effectiveRootFolderId || undefined,
            }),
          });
          const data = await res.json();
          const createdFolderId = data.folder?.googleFolderId || data.folder?.id;

          const dirReader = entry.createReader();
          const readEntries = async (): Promise<any[]> => {
            return new Promise((resolve) => {
              dirReader.readEntries((results: any[]) => resolve(results));
            });
          };

          let subEntries = await readEntries();
          while (subEntries.length > 0) {
            for (const sub of subEntries) {
              await traverseEntry(sub, createdFolderId);
            }
            subEntries = await readEntries();
          }
        } catch (err: any) {
          console.warn('[Directory Upload Error]:', err);
        }
      }
    };

    for (const ent of entries) {
      await traverseEntry(ent, currentFolderId || effectiveRootFolderId || undefined);
    }

    setTimeout(() => loadData(true), 3000);
  };

  // Crear Carpeta
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const selectedClient = clients.find((c) => c.id === selectedClientId);
      const selectedOrder = serviceOrders.find((o) => o.id === selectedServiceOrderId);
      const targetParentId = currentFolderId || effectiveRootFolderId || undefined;

      const res = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentFolderId: targetParentId,
          clientId: selectedClientId !== 'all' ? selectedClientId : undefined,
          serviceOrderId: selectedServiceOrderId !== 'all' ? selectedServiceOrderId : undefined,
        }),
      });

      if (!res.ok) throw new Error('Error al crear carpeta.');

      notify(`Carpeta "${newFolderName}" creada con éxito`, 'success');
      setNewFolderName('');
      setNewFolderModalOpen(false);
      loadData(true);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Renombrado en línea (Inline Rename)
  const handleInlineRenameSubmit = async (itemType: 'file' | 'folder', id: string) => {
    if (!inlineEditingValue.trim()) {
      setInlineEditingId(null);
      return;
    }
    const val = inlineEditingValue.trim();
    setInlineEditingId(null);

    try {
      const url = itemType === 'file' ? `/api/drive/files/${id}` : `/api/drive/folders/${id}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: val }),
      });
      if (!res.ok) throw new Error('No se pudo renombrar el elemento.');
      notify(`Renombrado a "${val}" con éxito`, 'success');
      loadData(true);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  // Destacar / Desmarcar (Star)
  const handleToggleStar = async (itemType: 'file' | 'folder', item: DriveFile | DriveFolder) => {
    const nextStarred = !item.starred;
    try {
      const url = itemType === 'file' ? `/api/drive/files/${item.id}` : `/api/drive/folders/${(item as DriveFolder).googleFolderId || item.id}`;
      await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ starred: nextStarred }),
      });

      if (itemType === 'file') {
        setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, starred: nextStarred } : f)));
      } else {
        setFolders((prev) => prev.map((fld) => (fld.id === item.id ? { ...fld, starred: nextStarred } : fld)));
      }
      notify(nextStarred ? 'Marcado como Destacado ★' : 'Quitado de Destacados', 'info');
    } catch (err: any) {
      notify('Error al actualizar destacados', 'error');
    }
  };

  // Cambiar Color de Carpeta
  const handleSetFolderColor = async (folder: DriveFolder, hexColor: string) => {
    try {
      const gId = folder.googleFolderId || folder.id;
      await fetch(`/api/drive/folders/${gId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ color: hexColor, folderColorRgb: hexColor }),
      });
      setFolders((prev) => prev.map((fld) => (fld.id === folder.id ? { ...fld, color: hexColor } : fld)));
      setColorPickerFolder(null);
      notify(`Color de carpeta actualizado`, 'success');
    } catch (err: any) {
      notify('Error al asignar color a la carpeta', 'error');
    }
  };

  // Mover archivo o carpeta con Drag & Drop
  const handleDropOnTargetFolder = async (targetFolderId: string, targetFolderName: string) => {
    if (!draggedItem) return;
    const { type, id } = draggedItem;
    setDraggedItem(null);
    setDragOverFolderId(null);

    try {
      if (type === 'file') {
        await fetch(`/api/drive/files/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ parentFolderId: targetFolderId, parentFolderName: targetFolderName }),
        });
        notify(`Archivo movido a "${targetFolderName}"`, 'success');
      } else {
        await fetch(`/api/drive/folders/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ parentGoogleFolderId: targetFolderId }),
        });
        notify(`Carpeta movida a "${targetFolderName}"`, 'success');
      }
      loadData(true);
    } catch (err: any) {
      notify(err.message || 'Error al mover elemento', 'error');
    }
  };

  // Acciones en Lote (Batch Actions)
  const handleBatchAction = async (action: 'move' | 'delete' | 'star' | 'unstar') => {
    const fIds = Array.from(selectedFileIds);
    const fldIds = Array.from(selectedFolderIds);
    if (fIds.length === 0 && fldIds.length === 0) return;

    if (action === 'delete') {
      const ok = await confirmAction({
        title: '¿Eliminar elementos seleccionados?',
        message: `Se eliminarán permanentemente ${fIds.length} archivo(s) y ${fldIds.length} carpeta(s) de Google Drive.`,
        confirmText: 'Sí, eliminar',
        danger: true,
      });
      if (!ok) return;
    }

    try {
      await fetch('/api/drive/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: action === 'unstar' ? 'star' : action,
          fileIds: fIds,
          folderIds: fldIds,
          starred: action === 'star',
          targetFolderId: action === 'move' ? batchTargetFolderId : undefined,
        }),
      });

      setSelectedFileIds(new Set());
      setSelectedFolderIds(new Set());
      setBatchMoveModalOpen(false);
      notify('Operación en lote completada con éxito', 'success');
      loadData(true);
    } catch (err: any) {
      notify(err.message || 'Error en operación en lote', 'error');
    }
  };

  // Toggle de selección múltiple con soporte para Shift + Click
  const handleFileSelect = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedFileIds);

    if (e.shiftKey && lastSelectedFileId && sortedFiles.length > 0) {
      const lastIdx = sortedFiles.findIndex((f) => f.id === lastSelectedFileId);
      const curIdx = sortedFiles.findIndex((f) => f.id === fileId);
      if (lastIdx !== -1 && curIdx !== -1) {
        const start = Math.min(lastIdx, curIdx);
        const end = Math.max(lastIdx, curIdx);
        for (let i = start; i <= end; i++) {
          newSelected.add(sortedFiles[i].id);
        }
        setSelectedFileIds(newSelected);
        return;
      }
    }

    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setLastSelectedFileId(fileId);
    setSelectedFileIds(newSelected);
  };

  // Aplicar Blueprint
  const handleApplyBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bpTargetId) {
      notify('Selecciona el Cliente, Proyecto o la Orden de Servicio de destino.', 'error');
      return;
    }

    let targetName = '';
    let clientId: string | undefined = undefined;
    let serviceOrderId: string | undefined = undefined;

    if (bpModule === 'clients') {
      const client = clients.find((c) => c.id === bpTargetId);
      if (!client) return;
      targetName = `[Cliente] ${client.name}`;
      clientId = client.id;
    } else if (bpModule === 'service_orders') {
      const order = serviceOrders.find((o) => o.id === bpTargetId);
      if (!order) return;
      targetName = `[${order.code}] ${order.title}`;
      serviceOrderId = order.id;
      clientId = order.clientId;
    }

    const customSubs = bpCustomSubfolders
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsApplyingBlueprint(true);
    try {
      const res = await fetch('/api/drive/blueprint/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetName,
          module: bpModule,
          clientId,
          serviceOrderId,
          blueprintId: bpSelectedBlueprintId || undefined,
          customSubfolders: customSubs.length > 0 ? customSubs : undefined,
        }),
      });

      if (!res.ok) throw new Error('Error creando estructura.');
      notify(`¡Estructura de carpetas para "${targetName}" creada en Google Drive!`, 'success');
      setBlueprintModalOpen(false);
      loadData(true);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setIsApplyingBlueprint(false);
    }
  };

  // Filtrado de archivos
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = f.name.toLowerCase().includes(q);
        const matchesClient = f.clientName && f.clientName.toLowerCase().includes(q);
        const matchesOS = f.serviceOrderCode && f.serviceOrderCode.toLowerCase().includes(q);
        return matchesName || matchesClient || matchesOS;
      }

      if (activeParentFolderId) {
        if (f.parentFolderId !== activeParentFolderId) return false;
      } else {
        const isAtRoot = !f.parentFolderId || f.parentFolderId === 'root';
        if (!isAtRoot) return false;
      }

      if (selectedClientId !== 'all' && f.clientId !== selectedClientId) return false;
      if (selectedServiceOrderId !== 'all' && f.serviceOrderId !== selectedServiceOrderId) return false;
      if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;

      return true;
    });
  }, [files, activeParentFolderId, selectedClientId, selectedServiceOrderId, selectedCategory, searchQuery]);

  // Ordenamiento avanzado
  const sortedFiles = useMemo(() => {
    const list = [...filteredFiles];
    list.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'size_desc') return Number(b.size || 0) - Number(a.size || 0);
      if (sortBy === 'size_asc') return Number(a.size || 0) - Number(b.size || 0);
      if (sortBy === 'type') return (a.mimeType || '').localeCompare(b.mimeType || '');
      return 0;
    });
    return list;
  }, [filteredFiles, sortBy]);

  // Filtrado de carpetas
  const visibleFolders = useMemo(() => {
    return folders.filter((f) => {
      if (effectiveRootFolderId && f.googleFolderId === effectiveRootFolderId) return false;
      if (activeParentFolderId) {
        if (f.parentGoogleFolderId !== activeParentFolderId) return false;
      } else {
        const isAtRoot = !f.parentGoogleFolderId || f.parentGoogleFolderId === 'root';
        if (!isAtRoot) return false;
      }
      if (selectedClientId !== 'all' && f.clientId !== selectedClientId) return false;
      if (selectedServiceOrderId !== 'all' && f.serviceOrderId !== selectedServiceOrderId) return false;
      return true;
    });
  }, [folders, activeParentFolderId, effectiveRootFolderId, selectedClientId, selectedServiceOrderId]);

  // Carpetas y archivos Destacados (Pinned / Starred)
  const starredFolders = useMemo(() => folders.filter((f) => f.starred), [folders]);
  const starredFiles = useMemo(() => files.filter((f) => f.starred), [files]);

  // Lightbox Carousel navegación
  const currentLightboxIdx = useMemo(() => {
    if (!lightboxFile) return -1;
    return sortedFiles.findIndex((f) => f.id === lightboxFile.id);
  }, [lightboxFile, sortedFiles]);

  const handleNextLightbox = useCallback(() => {
    if (currentLightboxIdx < sortedFiles.length - 1) {
      setLightboxFile(sortedFiles[currentLightboxIdx + 1]);
      setLightboxZoom(1);
    }
  }, [currentLightboxIdx, sortedFiles]);

  const handlePrevLightbox = useCallback(() => {
    if (currentLightboxIdx > 0) {
      setLightboxFile(sortedFiles[currentLightboxIdx - 1]);
      setLightboxZoom(1);
    }
  }, [currentLightboxIdx, sortedFiles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxFile) return;
      if (e.key === 'ArrowRight') handleNextLightbox();
      if (e.key === 'ArrowLeft') handlePrevLightbox();
      if (e.key === 'Escape') setLightboxFile(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxFile, handleNextLightbox, handlePrevLightbox]);

  // Audio Canvas Waveform animador
  useEffect(() => {
    if (!lightboxFile?.mimeType.startsWith('audio/') || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const bars = 48;
      const barWidth = width / bars - 2;

      for (let i = 0; i < bars; i++) {
        const h = isAudioPlaying
          ? Math.sin(phase + i * 0.25) * 20 + 28
          : 8 + (Math.sin(i * 0.4) * 6);
        const x = i * (barWidth + 2);
        const y = (height - h) / 2;

        ctx.fillStyle = isAudioPlaying ? '#6366f1' : '#94a3b8';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, 3);
        ctx.fill();
      }

      if (isAudioPlaying) phase += 0.15;
      animId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(animId);
  }, [lightboxFile, isAudioPlaying]);

  return (
    <div
      className="w-full space-y-4 min-h-[calc(100vh-4rem)] relative select-none"
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDraggingOver(false);
      }}
      onDrop={handleDirectoryDrop}
    >
      {/* Overlay Drag and Drop Total */}
      {isDraggingOver && (
        <div className="absolute inset-1 sm:inset-2 z-40 bg-blue-600/95 backdrop-blur-md rounded-3xl border-4 border-dashed border-white flex flex-col items-center justify-center text-white pointer-events-none transition-all duration-300 shadow-2xl p-6 text-center">
          <UploadCloud className="w-20 h-20 mb-3 animate-bounce" />
          <h2 className="text-2xl font-black tracking-tight">¡Suelta archivos o carpetas completas aquí!</h2>
          <p className="text-sm text-blue-100 mt-1 max-w-lg font-medium">
            Sube subcarpetas completas (Directory Drop), editables de alta resolución y videos pesados directamente a Google Drive.
          </p>
          <span className="mt-3 px-3.5 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wide uppercase">
            Subida Resumable 300MB, 500MB, 2GB+ sin bloqueos
          </span>
        </div>
      )}

      {/* Inputs de Archivo y Carpeta Ocultos */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleBatchUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleBatchUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
        // @ts-ignore
        webkitdirectory="true"
        // @ts-ignore
        directory="true"
        multiple
        className="hidden"
      />

      {/* HEADER PRINCIPAL */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 sm:px-3 sm:py-2 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 text-xs font-bold mr-1 cursor-pointer shrink-0 shadow-xs"
                title="Volver al Workspace"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Volver al Workspace</span>
              </button>
            )}
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Archivos & Google Drive
                </h1>
                {connectionStatus?.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Drive Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    <Info className="w-3 h-3" /> Configuración Requerida
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Almacenamiento central de la agencia con subida directa ultrarrápida, streaming y organización automática.
              </p>
            </div>
          </div>

          {/* Acciones principales */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
            <button
              type="button"
              onClick={() => loadData(false, true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Sincronizar y refrescar con Google Drive"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setSettingsModalOpen(true)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Ajustes de Google Drive"
            >
              <Settings className="w-4 h-4" />
            </button>

            <PermissionGate permission="drive.manage_folders">
              <button
                type="button"
                onClick={() => setBlueprintModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Blueprint</span>
              </button>
            </PermissionGate>

            <PermissionGate permission="drive.manage_folders">
              <button
                type="button"
                onClick={() => setNewFolderModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                <span>Nueva Carpeta</span>
              </button>
            </PermissionGate>

            <PermissionGate permission="drive.upload">
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                title="Subir una carpeta completa de tu computadora"
              >
                <FolderTree className="w-3.5 h-3.5 text-blue-500" />
                <span>Subir Carpeta</span>
              </button>
            </PermissionGate>

            <PermissionGate permission="drive.upload">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition"
              >
                <UploadCloud className="w-4 h-4" />
                Subir Archivos
              </button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS, ORDENAMIENTO Y BÚSQUEDA */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xs">
        {/* Buscador */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtros Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedServiceOrderId}
            onChange={(e) => setSelectedServiceOrderId(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las Órdenes (OS)</option>
            {serviceOrders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} - {o.title.slice(0, 15)}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las Categorías</option>
            {Object.entries(CATEGORY_LABELS).map(([cat, info]) => (
              <option key={cat} value={cat}>
                {info.label}
              </option>
            ))}
          </select>

          {/* Ordenamiento Avanzado */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="date_desc">📅 Más recientes</option>
            <option value="date_asc">📅 Más antiguos</option>
            <option value="name_asc">🔤 Nombre (A-Z)</option>
            <option value="name_desc">🔤 Nombre (Z-A)</option>
            <option value="size_desc">💾 Tamaño (Mayor a menor)</option>
            <option value="size_asc">💾 Tamaño (Menor a mayor)</option>
            <option value="type">📁 Tipo de archivo</option>
          </select>

          {/* Toggle Auto-Prefijo */}
          <button
            type="button"
            onClick={() => setAutoNamingPrefix(!autoNamingPrefix)}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              autoNamingPrefix
                ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700/60 text-slate-500'
            }`}
            title="Añade automáticamente [OS]_[CLIENTE]_[FECHA] al subir archivos"
          >
            <Tag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto-Prefijo</span>
          </button>

          {/* Selector de Vista (Grid vs List) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Cuadrícula"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RUTA MULTINIVEL REAL (BREADCRUMBS COMPLETOS CON DROP-ZONE) */}
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 px-1 overflow-x-auto py-1">
        {folderPathChain.map((crumb, idx) => {
          const isLast = idx === folderPathChain.length - 1;
          return (
            <React.Fragment key={crumb.id || 'root'}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              <button
                type="button"
                onClick={() => setCurrentFolder(crumb.id, crumb.name)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverFolderId(crumb.id || 'root');
                }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={() => handleDropOnTargetFolder(crumb.id || effectiveRootFolderId || '', crumb.name)}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                  isLast
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-extrabold shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                } ${dragOverFolderId === (crumb.id || 'root') ? 'ring-2 ring-blue-500 bg-blue-100' : ''}`}
              >
                {idx === 0 ? <HardDrive className="w-3.5 h-3.5 text-blue-500" /> : <Folder className="w-3.5 h-3.5 text-amber-500" />}
                <span>{crumb.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* SECCIÓN ACCESO RÁPIDO: DESTACADOS (PINNED / STARRED) */}
      {(starredFolders.length > 0 || starredFiles.length > 0) && !searchQuery && (
        <div className="p-3.5 bg-gradient-to-r from-amber-500/5 to-indigo-500/5 rounded-2xl border border-amber-500/20 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-amber-800 dark:text-amber-300">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span>Destacados & Acceso Rápido</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {starredFolders.map((fld) => (
              <button
                key={fld.id}
                type="button"
                onClick={() => setCurrentFolder(fld.googleFolderId, fld.name)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/40 text-xs font-bold flex items-center gap-2 shrink-0 hover:shadow-xs transition"
              >
                <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span className="truncate max-w-[140px]">{fld.name}</span>
              </button>
            ))}
            {starredFiles.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setLightboxFile(f)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/40 text-xs font-bold flex items-center gap-2 shrink-0 hover:shadow-xs transition"
              >
                {getFileIcon(f.mimeType, f.name)}
                <span className="truncate max-w-[140px]">{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECCIÓN DE CARPETAS */}
      {visibleFolders.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Carpetas ({visibleFolders.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {visibleFolders.map((folder) => {
              const isSelected = selectedFolderIds.has(folder.id);
              const isInline = inlineEditingId === folder.id;
              const folderColor = folder.color || '#f59e0b';

              return (
                <div
                  key={folder.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedItem({ type: 'folder', id: folder.googleFolderId || folder.id });
                    e.dataTransfer.setData('text/plain', folder.name);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverFolderId(folder.googleFolderId);
                  }}
                  onDragLeave={() => setDragOverFolderId(null)}
                  onDrop={() => handleDropOnTargetFolder(folder.googleFolderId, folder.name)}
                  onClick={() => setCurrentFolder(folder.googleFolderId, folder.name)}
                  className={`group relative p-3 bg-white dark:bg-slate-900 rounded-2xl border transition cursor-pointer select-none flex items-center gap-2.5 ${
                    dragOverFolderId === folder.googleFolderId
                      ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50/50'
                      : isSelected
                      ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md'
                  }`}
                >
                  {/* Checkbox selección */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = new Set(selectedFolderIds);
                      if (next.has(folder.id)) next.delete(folder.id);
                      else next.add(folder.id);
                      setSelectedFolderIds(next);
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded cursor-pointer ${
                      isSelected ? 'opacity-100 text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                  </div>

                  {/* Icono de Carpeta con Color Personalizado */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: `${folderColor}20` }}
                  >
                    <Folder className="w-5 h-5" style={{ color: folderColor, fill: `${folderColor}40` }} />
                  </div>

                  <div className="min-w-0 flex-1">
                    {isInline ? (
                      <input
                        type="text"
                        value={inlineEditingValue}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setInlineEditingValue(e.target.value)}
                        onBlur={() => handleInlineRenameSubmit('folder', folder.googleFolderId || folder.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleInlineRenameSubmit('folder', folder.googleFolderId || folder.id);
                          if (e.key === 'Escape') setInlineEditingId(null);
                        }}
                        className="w-full text-xs font-bold px-1.5 py-0.5 bg-white border border-blue-500 rounded focus:outline-none"
                      />
                    ) : (
                      <p
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setInlineEditingId(folder.id);
                          setInlineEditingValue(folder.name);
                        }}
                        className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate"
                        title={folder.name}
                      >
                        {folder.name}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 truncate">
                      {folder.folderType === 'client_root' ? 'Cliente' : folder.folderType === 'os_root' ? 'OS' : 'Carpeta'}
                    </p>
                  </div>

                  {/* Acciones flotantes de la carpeta: Star, Color, Delete */}
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar('folder', folder);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-500"
                      title={folder.starred ? 'Quitar de destacados' : 'Destacar carpeta'}
                    >
                      <Star className={`w-3.5 h-3.5 ${folder.starred ? 'fill-amber-400 text-amber-500' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setColorPickerFolder(folder);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-500"
                      title="Cambiar color de carpeta"
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECCIÓN DE ARCHIVOS */}
      {sortedFiles.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Archivos ({sortedFiles.length})
            </h2>
            <span className="text-[11px] text-slate-400">
              Total: {formatFileSize(sortedFiles.reduce((acc, curr) => acc + Number(curr.size || 0), 0))}
            </span>
          </div>

          {viewMode === 'grid' ? (
            /* VISTA EN CUADRÍCULA (GRID) */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {sortedFiles.map((file) => {
                const catInfo = CATEGORY_LABELS[file.category] || CATEGORY_LABELS.general;
                const isSelected = selectedFileIds.has(file.id);
                const isInline = inlineEditingId === file.id;

                return (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => {
                      setDraggedItem({ type: 'file', id: file.id });
                      e.dataTransfer.setData('text/plain', file.name);
                    }}
                    className={`group relative bg-white dark:bg-slate-900 rounded-2xl border transition overflow-hidden flex flex-col ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-lg'
                    }`}
                  >
                    {/* Miniatura / Thumbnail de Alta Resolución con Proxy */}
                    <div
                      onClick={() => setLightboxFile(file)}
                      className="h-36 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center relative cursor-pointer overflow-hidden"
                    >
                      <img
                        src={`/api/drive/files/${file.id}/thumbnail?size=600${token ? `&token=${token}` : ''}`}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      {/* Checkbox de Selección */}
                      <div
                        onClick={(e) => handleFileSelect(file.id, e)}
                        className={`absolute top-2 right-2 p-1 rounded-lg bg-black/40 backdrop-blur-md transition cursor-pointer ${
                          isSelected ? 'opacity-100 text-blue-400' : 'opacity-0 group-hover:opacity-100 text-white'
                        }`}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4" />}
                      </div>

                      {/* Badge de Categoría */}
                      <span
                        className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold border backdrop-blur-md ${catInfo.color}`}
                      >
                        {catInfo.label}
                      </span>

                      {/* Badge Técnico (Dimensiones o Duración) */}
                      {(file.width || file.durationMillis) && (
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold font-mono">
                          {file.width && file.height ? `${file.width}x${file.height}` : formatDuration(file.durationMillis)}
                        </span>
                      )}
                    </div>

                    {/* Detalles del Archivo */}
                    <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                      <div>
                        <div className="flex items-start gap-1.5">
                          {getFileIcon(file.mimeType, file.name)}
                          {isInline ? (
                            <input
                              type="text"
                              value={inlineEditingValue}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setInlineEditingValue(e.target.value)}
                              onBlur={() => handleInlineRenameSubmit('file', file.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineRenameSubmit('file', file.id);
                                if (e.key === 'Escape') setInlineEditingId(null);
                              }}
                              className="w-full text-xs font-bold px-1.5 py-0.5 bg-white border border-blue-500 rounded focus:outline-none"
                            />
                          ) : (
                            <p
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setInlineEditingId(file.id);
                                setInlineEditingValue(file.name);
                              }}
                              className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate flex-1 cursor-text"
                              title={file.name}
                            >
                              {file.name}
                            </p>
                          )}
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>{formatFileSize(file.size)}</span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        </div>

                        {(file.clientName || file.serviceOrderCode) && (
                          <div className="mt-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate flex items-center gap-1">
                            {file.clientName && <span>{file.clientName}</span>}
                            {file.serviceOrderCode && <span>• OS {file.serviceOrderCode}</span>}
                          </div>
                        )}
                      </div>

                      {/* Barra de Acciones del Archivo */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-slate-400">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleStar('file', file)}
                            className={`p-1 rounded hover:text-amber-500 ${file.starred ? 'text-amber-500 fill-amber-500' : ''}`}
                            title="Destacar archivo"
                          >
                            <Star className={`w-3.5 h-3.5 ${file.starred ? 'fill-amber-400' : ''}`} />
                          </button>
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:text-blue-600"
                              title="Abrir en Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(file.webViewLink || '');
                              notify('Enlace copiado al portapapeles', 'success');
                            }}
                            className="p-1 rounded hover:text-blue-600"
                            title="Copiar enlace"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <PermissionGate permission="drive.delete">
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirmAction({
                                title: '¿Eliminar archivo?',
                                message: `¿Eliminar "${file.name}" permanentemente?`,
                                confirmText: 'Sí, eliminar',
                                danger: true,
                              });
                              if (!ok) return;
                              await fetch(`/api/drive/files/${file.id}`, {
                                method: 'DELETE',
                                headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                              });
                              notify('Archivo eliminado', 'success');
                              loadData(true);
                            }}
                            className="p-1 rounded hover:text-rose-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA EN LISTA (TABLE) */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3 w-8">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedFileIds.size === sortedFiles.length) setSelectedFileIds(new Set());
                            else setSelectedFileIds(new Set(sortedFiles.map((f) => f.id)));
                          }}
                        >
                          {selectedFileIds.size === sortedFiles.length ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4">Nombre del Archivo</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">Cliente / OS</th>
                      <th className="py-3 px-4">Tamaño</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedFiles.map((file) => {
                      const catInfo = CATEGORY_LABELS[file.category] || CATEGORY_LABELS.general;
                      const isSelected = selectedFileIds.has(file.id);

                      return (
                        <tr
                          key={file.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div onClick={(e) => handleFileSelect(file.id, e)} className="cursor-pointer">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.mimeType, file.name)}
                              <button
                                type="button"
                                onClick={() => setLightboxFile(file)}
                                className="font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition truncate max-w-sm text-left"
                              >
                                {file.name}
                              </button>
                              {file.starred && <Star className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catInfo.color}`}>
                              {catInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {file.clientName || '-'} {file.serviceOrderCode ? `[${file.serviceOrderCode}]` : ''}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium">{formatFileSize(file.size)}</td>
                          <td className="py-3 px-4 text-slate-400">{new Date(file.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 text-slate-400">
                              <button
                                type="button"
                                onClick={() => handleToggleStar('file', file)}
                                className="hover:text-amber-500"
                              >
                                <Star className={`w-3.5 h-3.5 ${file.starred ? 'fill-amber-400 text-amber-500' : ''}`} />
                              </button>
                              {file.webViewLink && (
                                <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : visibleFolders.length === 0 ? (
        /* Solo mostrar el banner de carpeta vacía si NO hay ni carpetas ni archivos */
        <div className="space-y-2.5">
          <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Esta carpeta está vacía</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Arrastra y suelta cualquier archivo pesado o pega directamente una imagen con <kbd className="font-bold text-blue-600">Ctrl + V</kbd>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              Subir Archivos Ahora
            </button>
          </div>
        </div>
      ) : null}

      {/* BARRA FLOTANTE DE ACCIONES EN LOTE (BATCH ACTION BAR) */}
      {(selectedFileIds.size > 0 || selectedFolderIds.size > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-blue-400">
            {selectedFileIds.size + selectedFolderIds.size} seleccionados
          </span>

          <button
            type="button"
            onClick={() => setBatchMoveModalOpen(true)}
            className="flex items-center gap-1.5 hover:text-blue-400 transition"
          >
            <FolderPlus className="w-4 h-4 text-amber-400" />
            Mover
          </button>

          <button
            type="button"
            onClick={() => handleBatchAction('star')}
            className="flex items-center gap-1.5 hover:text-amber-400 transition"
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Destacar
          </button>

          <button
            type="button"
            onClick={() => handleBatchAction('delete')}
            className="flex items-center gap-1.5 hover:text-rose-400 transition text-rose-300"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            Eliminar
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedFileIds(new Set());
              setSelectedFolderIds(new Set());
            }}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LIGHTBOX MULTIMEDIA CON CARRUSEL & STREAMING NATIVO */}
      {/* ========================================================================= */}
      {lightboxFile && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 animate-in fade-in duration-200">
          {/* Header del Lightbox */}
          <div className="flex items-center justify-between text-white px-4 py-2 border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              {getFileIcon(lightboxFile.mimeType, lightboxFile.name)}
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold truncate" title={lightboxFile.name}>
                  {lightboxFile.name}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {formatFileSize(lightboxFile.size)} • {new Date(lightboxFile.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Controles de Zoom para imágenes */}
              {lightboxFile.mimeType.startsWith('image/') && (
                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLightboxZoom((prev) => Math.max(0.5, prev - 0.25))}
                    className="p-1 hover:text-blue-400"
                    title="Alejar"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold w-12 text-center">
                    {Math.round(lightboxZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setLightboxZoom((prev) => Math.min(4, prev + 0.25))}
                    className="p-1 hover:text-blue-400"
                    title="Acercar"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxZoom(1)}
                    className="p-1 text-[10px] font-bold text-slate-300 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              )}

              {/* Controles de Velocidad para Video */}
              {lightboxFile.mimeType.startsWith('video/') && (
                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-xl text-xs font-bold">
                  {[0.5, 1, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        setPlaybackSpeed(spd);
                        if (videoRef.current) videoRef.current.playbackRate = spd;
                      }}
                      className={`px-1.5 py-0.5 rounded ${playbackSpeed === spd ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                    >
                      {spd}x
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime -= 0.04;
                    }}
                    className="p-1 hover:text-blue-400"
                    title="-1 Frame"
                  >
                    <StepBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime += 0.04;
                    }}
                    className="p-1 hover:text-blue-400"
                    title="+1 Frame"
                  >
                    <StepForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {lightboxFile.webViewLink && (
                <a
                  href={lightboxFile.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Drive
                </a>
              )}

              <button
                type="button"
                onClick={() => setLightboxFile(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Área Central Multimedia */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
            {/* Botón Anterior */}
            {currentLightboxIdx > 0 && (
              <button
                type="button"
                onClick={handlePrevLightbox}
                className="absolute left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Contenido Visual */}
            <div className="w-full h-full flex items-center justify-center p-4">
              {lightboxFile.mimeType.startsWith('image/') ? (
                <div className="overflow-auto max-h-[75vh] max-w-full flex items-center justify-center">
                  <img
                    src={`/api/drive/files/${lightboxFile.id}/stream${token ? `?token=${token}` : ''}`}
                    alt={lightboxFile.name}
                    style={{ transform: `scale(${lightboxZoom})`, transformOrigin: 'center center' }}
                    className="max-h-[70vh] max-w-full object-contain rounded-xl transition-transform duration-150"
                  />
                </div>
              ) : lightboxFile.mimeType.startsWith('video/') ? (
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  src={`/api/drive/files/${lightboxFile.id}/stream${token ? `?token=${token}` : ''}`}
                  className="max-h-[70vh] max-w-full rounded-2xl shadow-2xl"
                />
              ) : lightboxFile.mimeType.startsWith('audio/') ? (
                <div className="flex flex-col items-center gap-4 bg-slate-900/80 p-8 rounded-3xl border border-white/10 max-w-md w-full">
                  <Music className="w-12 h-12 text-indigo-400 animate-pulse" />
                  <canvas ref={canvasRef} width={360} height={70} className="w-full h-16 rounded-xl" />
                  <audio
                    ref={audioRef}
                    controls
                    autoPlay
                    onPlay={() => setIsAudioPlaying(true)}
                    onPause={() => setIsAudioPlaying(false)}
                    src={`/api/drive/files/${lightboxFile.id}/stream${token ? `?token=${token}` : ''}`}
                    className="w-full"
                  />
                </div>
              ) : lightboxFile.mimeType.includes('pdf') ? (
                <iframe
                  src={`/api/drive/files/${lightboxFile.id}/stream${token ? `?token=${token}` : ''}#toolbar=1`}
                  className="w-full h-[75vh] rounded-2xl border border-white/10 bg-white"
                  title={lightboxFile.name}
                />
              ) : (
                <div className="text-center text-slate-400 p-8">
                  <FileText className="w-16 h-16 mx-auto mb-3 text-slate-600" />
                  <p className="text-sm font-bold text-white">Previsualización en Google Drive</p>
                  <p className="text-xs mt-1">Los archivos ejecutables o editables complejos se pueden revisar directamente en Drive.</p>
                  {lightboxFile.webViewLink && (
                    <a
                      href={lightboxFile.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                    >
                      <ExternalLink className="w-4 h-4" /> Abrir en Google Drive
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Botón Siguiente */}
            {currentLightboxIdx < sortedFiles.length - 1 && (
              <button
                type="button"
                onClick={handleNextLightbox}
                className="absolute right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Carrusel de Miniaturas Inferior */}
          <div className="flex items-center gap-2 overflow-x-auto py-2 px-4 border-t border-white/10">
            {sortedFiles.map((file, idx) => (
              <button
                key={file.id}
                type="button"
                onClick={() => {
                  setLightboxFile(file);
                  setLightboxZoom(1);
                }}
                className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                  file.id === lightboxFile.id ? 'border-blue-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={`/api/drive/files/${file.id}/thumbnail?size=200${token ? `&token=${token}` : ''}`}
                  alt={file.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETECCIÓN DE ARCHIVO DUPLICADO */}
      {/* ========================================================================= */}
      {duplicateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Archivo Duplicado Detectado
                </h3>
                <p className="text-xs text-slate-500">
                  Ya existe un archivo llamado "{duplicateModal.file.name}" en esta carpeta.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              ¿Cómo deseas procesar este archivo?
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  const modalData = duplicateModal;
                  setDuplicateModal(null);
                  notify('Reemplazando versión en Google Drive...', 'info');
                  await uploadFile(modalData.file, {
                    parentFolderId: modalData.targetFolderId,
                    parentFolderName: modalData.targetFolderName,
                    replaceGoogleFileId: modalData.existingFile.googleFileId,
                  });
                }}
                className="w-full p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold text-left flex items-center justify-between"
              >
                <span>Reemplazar como nueva versión</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">v{(duplicateModal?.existingFile?.version || 1) + 1}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const modalData = duplicateModal;
                  setDuplicateModal(null);
                  const nameParts = modalData.file.name.split('.');
                  const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
                  const newName = `${nameParts.join('.')}_(1)${ext}`;
                  notify(`Subiendo como copia: "${newName}"`, 'info');
                  await uploadFile(modalData.file, {
                    parentFolderId: modalData.targetFolderId,
                    parentFolderName: modalData.targetFolderName,
                    customFileName: newName,
                  });
                }}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-left"
              >
                Mantener ambos (Renombrar con sufijo)
              </button>

              <button
                type="button"
                onClick={() => setDuplicateModal(null)}
                className="w-full p-2.5 text-xs text-slate-500 hover:text-slate-700 text-center font-bold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MOVER ELEMENTOS EN LOTE */}
      {/* ========================================================================= */}
      {batchMoveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-blue-500" />
              Mover elementos seleccionados
            </h3>
            <p className="text-xs text-slate-500">
              Selecciona la carpeta de destino en Google Drive:
            </p>
            <select
              value={batchTargetFolderId}
              onChange={(e) => setBatchTargetFolderId(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              <option value={effectiveRootFolderId || ''}>📁 Raíz ({connectionStatus?.rootFolderName || 'ROMA'})</option>
              {folders.map((fld) => (
                <option key={fld.id} value={fld.googleFolderId}>
                  📁 {fld.name}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBatchMoveModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleBatchAction('move')}
                className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                Mover Aquí
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COLOR PICKER DE CARPETA */}
      {/* ========================================================================= */}
      {colorPickerFolder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-500" />
                Color de Carpeta
              </h3>
              <button type="button" onClick={() => setColorPickerFolder(null)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 truncate">
              Asigna un color a "{colorPickerFolder.name}" para identificarla rápidamente:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FOLDER_COLORS.map((clr) => (
                <button
                  key={clr.hex}
                  type="button"
                  onClick={() => handleSetFolderColor(colorPickerFolder, clr.hex)}
                  className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-bold hover:shadow-xs transition ${clr.bgClass}`}
                >
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: clr.hex }} />
                  <span className="truncate">{clr.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NUEVA CARPETA INDIVIDUAL */}
      {/* ========================================================================= */}
      {newFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-amber-500" />
                Nueva Carpeta en Google Drive
              </h3>
              <button type="button" onClick={() => setNewFolderModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la Carpeta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 01_Entregables_Redes"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewFolderModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md"
                >
                  Crear Carpeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BLUEPRINTS / ESTRUCTURAS PREDEFINIDAS */}
      {/* ========================================================================= */}
      {blueprintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Crear Estructura Predefinida en Drive
                </h3>
              </div>
              <button type="button" onClick={() => setBlueprintModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyBlueprint} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                  1. ¿Para qué entidad deseas crear la estructura?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBpModule('clients');
                      setBpTargetId('');
                    }}
                    className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                      bpModule === 'clients' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Building2 className="w-4 h-4" /> Para un Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBpModule('service_orders');
                      setBpTargetId('');
                    }}
                    className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                      bpModule === 'service_orders' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" /> Para Orden de Servicio (OS)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  2. Selecciona {bpModule === 'clients' ? 'el Cliente' : 'la Orden de Servicio'}
                </label>
                {bpModule === 'clients' ? (
                  <select
                    value={bpTargetId}
                    onChange={(e) => setBpTargetId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="">-- Elige un Cliente --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.documentNumber})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={bpTargetId}
                    onChange={(e) => setBpTargetId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="">-- Elige una Orden de Servicio --</option>
                    {serviceOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code} - {o.title} ({o.clientName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  3. Plantilla de Estructura
                </label>
                <select
                  value={bpSelectedBlueprintId}
                  onChange={(e) => setBpSelectedBlueprintId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="">(Plantilla Recomendada por Defecto)</option>
                  {blueprints.map((bp) => (
                    <option key={bp.id} value={bp.id}>
                      {bp.name} ({bp.structure.length} carpetas)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Subcarpetas personalizadas (Opcional, 1 por línea)
                </label>
                <textarea
                  rows={3}
                  value={bpCustomSubfolders}
                  onChange={(e) => setBpCustomSubfolders(e.target.value)}
                  placeholder={`01_Brief_y_Contratos\n02_Identidad_y_Logos\n03_Entregables_Finales\n04_Facturacion`}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBlueprintModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isApplyingBlueprint}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  {isApplyingBlueprint ? 'Creando en Google Drive...' : 'Generar en Google Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AJUSTES & CONEXIÓN CON GOOGLE DRIVE */}
      {/* ========================================================================= */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                Configuración de Google Drive
              </h3>
              <button type="button" onClick={() => setSettingsModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Estado de Conexión:</span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Operativo & Conectado
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Cuenta de la Agencia:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {connectionStatus?.accountEmail || 'romacomercial22@gmail.com'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Carpeta Raíz Autorizada:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                    {connectionStatus?.rootFolderName || 'ROMA AGENCIA 2027'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DriveModule;
