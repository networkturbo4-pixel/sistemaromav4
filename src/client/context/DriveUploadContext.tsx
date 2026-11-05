import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import { DriveUploadItem, DriveFileCategory } from '../../shared/types';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Pause,
  Play,
  File,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  Archive,
} from 'lucide-react';

export interface UploadOptions {
  parentFolderId?: string;
  parentFolderName?: string;
  clientId?: string;
  clientName?: string;
  serviceOrderId?: string;
  serviceOrderCode?: string;
  category?: DriveFileCategory;
  replaceGoogleFileId?: string;
  customFileName?: string;
}

interface DriveUploadContextType {
  uploadQueue: DriveUploadItem[];
  isUploading: boolean;
  activeCount: number;
  uploadFile: (file: File, options?: UploadOptions) => Promise<string>;
  uploadFiles: (files: FileList | File[], options?: UploadOptions) => Promise<string[]>;
  cancelUpload: (uploadId: string) => void;
  pauseUpload: (uploadId: string) => void;
  resumeUpload: (uploadId: string) => void;
  retryUpload: (uploadId: string) => void;
  clearCompleted: () => void;
  floatingOpen: boolean;
  setFloatingOpen: (open: boolean) => void;
}

const DriveUploadContext = createContext<DriveUploadContextType | undefined>(undefined);

// Extraer metadatos técnicos en el navegador antes de subir
const extractTechnicalMetadata = async (
  file: File
): Promise<{ width?: number; height?: number; durationMillis?: number }> => {
  return new Promise((resolve) => {
    try {
      if (file.type.startsWith('image/')) {
        const img = new window.Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          URL.revokeObjectURL(url);
          resolve({ width: w, height: h });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({});
        };
        img.src = url;
      } else if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        const isVideo = file.type.startsWith('video/');
        const elem = document.createElement(isVideo ? 'video' : 'audio');
        const url = URL.createObjectURL(file);
        elem.preload = 'metadata';
        elem.onloadedmetadata = () => {
          const durationMillis = Math.round((elem.duration || 0) * 1000);
          const width = isVideo ? (elem as HTMLVideoElement).videoWidth : undefined;
          const height = isVideo ? (elem as HTMLVideoElement).videoHeight : undefined;
          URL.revokeObjectURL(url);
          resolve({ width, height, durationMillis });
        };
        elem.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({});
        };
        elem.src = url;
      } else {
        resolve({});
      }
    } catch {
      resolve({});
    }
  });
};

export const DriveUploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast, toast, token } = useApp();
  const notify = showToast || toast || ((msg: string) => console.log(msg));
  const [uploadQueue, setUploadQueue] = useState<DriveUploadItem[]>([]);
  const [floatingOpen, setFloatingOpen] = useState(true);

  const activeXhrs = useRef<Map<string, XMLHttpRequest>>(new Map());
  const storedItems = useRef<Map<string, { file: File; options?: UploadOptions }>>(new Map());

  const activeCount = uploadQueue.filter(
    (item) => item.status === 'uploading' || item.status === 'pending'
  ).length;
  const isUploading = activeCount > 0;

  // Advertir al usuario si intenta cerrar o recargar la pestaña mientras hay subidas activas
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isUploading) {
        e.preventDefault();
        e.returnValue =
          'Hay archivos subiéndose a Google Drive en segundo plano. Si sales de la página se cancelará la subida.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isUploading]);

  const updateItem = (id: string, updates: Partial<DriveUploadItem>) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  /**
   * Ejecuta la subida de un archivo:
   * Primero intenta Resumable Upload (directo a Google). Si falla, recurre a Upload Stream del backend.
   */
  const processUpload = async (item: DriveUploadItem, file: File, options?: UploadOptions) => {
    updateItem(item.id, { status: 'uploading', error: undefined });

    let lastLoaded = item.bytesUploaded || 0;
    let lastTime = Date.now();

    const handleProgress = (loaded: number, total: number) => {
      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000;
      let speedStr = '';

      if (timeDiff >= 0.5) {
        const bytesDiff = loaded - lastLoaded;
        const bytesPerSec = Math.max(0, bytesDiff / timeDiff);
        if (bytesPerSec >= 1024 * 1024) {
          speedStr = `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
        } else {
          speedStr = `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
        }
        lastLoaded = loaded;
        lastTime = now;
      }

      const percent = Math.min(Math.round((loaded / total) * 100), 99);
      updateItem(item.id, {
        progress: percent,
        bytesUploaded: loaded,
        ...(speedStr ? { speed: speedStr } : {}),
      });
    };

    try {
      const fileNameToUse = options?.customFileName || file.name;
      let targetFolderId = options?.parentFolderId || '';
      let sessionUri = item.sessionUri || null;

      // 1. Solicitar sesión de Resumable Upload a nuestro backend si no la tenemos
      if (!sessionUri) {
        try {
          const sessionRes = await fetch('/api/drive/upload-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              fileName: fileNameToUse,
              mimeType: file.type || 'application/octet-stream',
              fileSize: file.size,
              parentFolderId: options?.parentFolderId,
              replaceFileId: options?.replaceGoogleFileId,
            }),
          });

          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            sessionUri = sessionData.uploadUrl;
            targetFolderId = sessionData.parentFolderId || targetFolderId;
            updateItem(item.id, { sessionUri: sessionUri || undefined });
          } else {
            const errData = await sessionRes.json().catch(() => ({}));
            const errMsg = errData.error || `Error del servidor: status ${sessionRes.status}`;
            if (
              file.size > 50 * 1024 * 1024 ||
              sessionRes.status === 403 ||
              errMsg.includes('cuota') ||
              errMsg.includes('quota') ||
              errMsg.includes('permiso')
            ) {
              throw new Error(errMsg);
            }
          }
        } catch (err: any) {
          if (
            file.size > 50 * 1024 * 1024 ||
            err.message?.includes('cuota') ||
            err.message?.includes('quota') ||
            err.message?.includes('permiso')
          ) {
            throw err;
          }
        }
      }

      // Subida por streaming al servidor Node.js (Fallback 100% confiable)
      const uploadViaServerStream = async () => {
        return new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          activeXhrs.current.set(item.id, xhr);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              handleProgress(e.loaded, e.total);
            }
          };

          xhr.onload = () => {
            activeXhrs.current.delete(item.id);
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const resData = JSON.parse(xhr.responseText);
                updateItem(item.id, {
                  status: 'completed',
                  progress: 100,
                  googleFileId: resData.file?.googleFileId,
                  webViewLink: resData.file?.webViewLink || '',
                });
                notify(`Archivo "${fileNameToUse}" subido a Google Drive con éxito`, 'success');
                window.dispatchEvent(new CustomEvent('roma:drive:refresh'));
                resolve();
              } catch (parseErr: any) {
                reject(parseErr);
              }
            } else {
              let errMsg = `Error en el servidor al procesar subida: status ${xhr.status}`;
              try {
                const parsed = JSON.parse(xhr.responseText);
                if (parsed.error) errMsg = parsed.error;
              } catch {}
              reject(new Error(errMsg));
            }
          };

          xhr.onerror = () => {
            activeXhrs.current.delete(item.id);
            reject(new Error('Fallo de conexión al enviar el archivo al servidor.'));
          };

          xhr.onabort = () => {
            activeXhrs.current.delete(item.id);
            resolve();
          };

          const formData = new FormData();
          formData.append('file', file, fileNameToUse);
          if (options?.parentFolderId) formData.append('parentFolderId', options.parentFolderId);
          if (options?.parentFolderName) formData.append('parentFolderName', options.parentFolderName);
          if (options?.clientId) formData.append('clientId', options.clientId);
          if (options?.clientName) formData.append('clientName', options.clientName);
          if (options?.serviceOrderId) formData.append('serviceOrderId', options.serviceOrderId);
          if (options?.serviceOrderCode) formData.append('serviceOrderCode', options.serviceOrderCode);
          if (options?.category) formData.append('category', options.category);
          if (options?.replaceGoogleFileId) formData.append('replaceFileId', options.replaceGoogleFileId);
          if (item.width) formData.append('width', String(item.width));
          if (item.height) formData.append('height', String(item.height));
          if (item.durationMillis) formData.append('durationMillis', String(item.durationMillis));

          xhr.open('POST', '/api/drive/upload-stream', true);
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.send(formData);
        });
      };

      // Si tenemos sessionUri de Google Drive, intentar DIRECTO a Google; si la red falla, usar streaming en servidor
      if (sessionUri) {
        let directSuccess = false;
        try {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            activeXhrs.current.set(item.id, xhr);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                handleProgress(e.loaded, e.total);
              }
            };

            xhr.onload = async () => {
              activeXhrs.current.delete(item.id);
              if (xhr.status === 200 || xhr.status === 201) {
                try {
                  const googleResponse = JSON.parse(xhr.responseText);
                  const googleFileId = googleResponse.id;

                  // Registrar metadatos técnicos y de negocio en BD
                  const regRes = await fetch('/api/drive/register-file', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                      googleFileId,
                      name: fileNameToUse,
                      mimeType: file.type || 'application/octet-stream',
                      size: file.size,
                      parentFolderId: targetFolderId,
                      parentFolderName: options?.parentFolderName,
                      clientId: options?.clientId,
                      clientName: options?.clientName,
                      serviceOrderId: options?.serviceOrderId,
                      serviceOrderCode: options?.serviceOrderCode,
                      category: options?.category || 'general',
                      width: item.width,
                      height: item.height,
                      durationMillis: item.durationMillis,
                    }),
                  });

                  if (regRes.ok) {
                    const regData = await regRes.json();
                    updateItem(item.id, {
                      status: 'completed',
                      progress: 100,
                      googleFileId,
                      webViewLink: regData.file?.webViewLink || '',
                    });
                    notify(`Archivo "${fileNameToUse}" subido a Google Drive con éxito`, 'success');
                    window.dispatchEvent(new CustomEvent('roma:drive:refresh'));
                    directSuccess = true;
                    resolve();
                  } else {
                    throw new Error('No se pudo registrar los metadatos del archivo en la base de datos.');
                  }
                } catch (regErr: any) {
                  reject(regErr);
                }
              } else {
                reject(new Error(`Error de subida a Google: status ${xhr.status}`));
              }
            };

            xhr.onerror = () => {
              activeXhrs.current.delete(item.id);
              reject(new Error('Fallo de red al conectar con Google Drive.'));
            };

            xhr.onabort = () => {
              activeXhrs.current.delete(item.id);
              resolve();
            };

            xhr.open('PUT', sessionUri, true);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.send(file);
          });
        } catch (directErr: any) {
          if (!directSuccess) {
            await uploadViaServerStream();
          }
        }
      } else {
        await uploadViaServerStream();
      }
    } catch (err: any) {
      // Si el item fue pausado o cancelado, no marcar como error
      const currentItem = uploadQueue.find((q) => q.id === item.id);
      if (currentItem?.status === 'paused' || currentItem?.status === 'cancelled') {
        return;
      }
      updateItem(item.id, {
        status: 'error',
        error: err.message || 'Error durante la subida.',
      });
      notify(`Error al subir "${options?.customFileName || file.name}": ${err.message}`, 'error');
    }
  };

  const uploadFile = async (file: File, options?: UploadOptions): Promise<string> => {
    const id = `upl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Extraer metadatos técnicos en segundo plano de manera no bloqueante
    const meta = await extractTechnicalMetadata(file);

    const fileName = options?.customFileName || file.name;
    const newItem: DriveUploadItem = {
      id,
      fileName,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      folderId: options?.parentFolderId,
      folderName: options?.parentFolderName,
      clientId: options?.clientId,
      clientName: options?.clientName,
      serviceOrderId: options?.serviceOrderId,
      serviceOrderCode: options?.serviceOrderCode,
      category: options?.category || 'general',
      width: meta.width,
      height: meta.height,
      durationMillis: meta.durationMillis,
      replaceGoogleFileId: options?.replaceGoogleFileId,
      progress: 0,
      bytesUploaded: 0,
      speed: '',
      status: 'pending',
      startedAt: Date.now(),
    };

    storedItems.current.set(id, { file, options });
    setUploadQueue((prev) => [newItem, ...prev]);
    setFloatingOpen(true);

    // Iniciar procesamiento asíncrono
    processUpload(newItem, file, options);

    return id;
  };

  const uploadFiles = async (
    files: FileList | File[],
    options?: UploadOptions
  ): Promise<string[]> => {
    const fileArray = Array.from(files);
    const ids: string[] = [];
    for (const f of fileArray) {
      const id = await uploadFile(f, options);
      ids.push(id);
    }
    return ids;
  };

  const cancelUpload = (uploadId: string) => {
    const xhr = activeXhrs.current.get(uploadId);
    if (xhr) {
      xhr.abort();
      activeXhrs.current.delete(uploadId);
    }
    updateItem(uploadId, { status: 'cancelled' });
  };

  const pauseUpload = (uploadId: string) => {
    const xhr = activeXhrs.current.get(uploadId);
    if (xhr) {
      xhr.abort();
      activeXhrs.current.delete(uploadId);
    }
    updateItem(uploadId, { status: 'paused', speed: 'Pausado' });
  };

  const resumeUpload = (uploadId: string) => {
    const stored = storedItems.current.get(uploadId);
    const item = uploadQueue.find((q) => q.id === uploadId);
    if (stored && item) {
      processUpload(item, stored.file, stored.options);
    }
  };

  const retryUpload = (uploadId: string) => {
    const stored = storedItems.current.get(uploadId);
    const item = uploadQueue.find((q) => q.id === uploadId);
    if (stored && item) {
      processUpload(item, stored.file, stored.options);
    }
  };

  const clearCompleted = () => {
    setUploadQueue((prev) =>
      prev.filter((item) => item.status === 'uploading' || item.status === 'pending' || item.status === 'paused')
    );
  };

  return (
    <DriveUploadContext.Provider
      value={{
        uploadQueue,
        isUploading,
        activeCount,
        uploadFile,
        uploadFiles,
        cancelUpload,
        pauseUpload,
        resumeUpload,
        retryUpload,
        clearCompleted,
        floatingOpen,
        setFloatingOpen,
      }}
    >
      {children}
      <FloatingUploadWidget />
    </DriveUploadContext.Provider>
  );
};

export const useDriveUpload = () => {
  const context = useContext(DriveUploadContext);
  if (!context) {
    throw new Error('useDriveUpload debe usarse dentro de un DriveUploadProvider');
  }
  return context;
};

// =============================================================================
// COMPONENTE FLOTANTE: WIDGET DE SUBIDA ESTILO GOOGLE DRIVE
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mime: string, name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif', 'ai', 'psd'].includes(ext || '')) {
    return <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) {
    return <VideoIcon className="w-4 h-4 text-purple-500 shrink-0" />;
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) {
    return <Music className="w-4 h-4 text-indigo-500 shrink-0" />;
  }
  if (['zip', 'rar', '7z', 'tar'].includes(ext || '')) {
    return <Archive className="w-4 h-4 text-amber-500 shrink-0" />;
  }
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
    return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
  }
  return <File className="w-4 h-4 text-slate-400 shrink-0" />;
}

const FloatingUploadWidget: React.FC = () => {
  const {
    uploadQueue,
    isUploading,
    activeCount,
    cancelUpload,
    pauseUpload,
    resumeUpload,
    retryUpload,
    clearCompleted,
    floatingOpen,
    setFloatingOpen,
  } = useDriveUpload();

  if (uploadQueue.length === 0) return null;

  const completedCount = uploadQueue.filter((i) => i.status === 'completed').length;
  const totalCount = uploadQueue.length;

  return (
    <div className="fixed bottom-20 md:bottom-4 right-3 left-3 sm:left-auto sm:right-4 z-50 sm:w-96 max-w-[calc(100vw-1.5rem)] sm:max-w-md shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md overflow-hidden transition-all duration-300">
      {/* Header del widget */}
      <div
        className="px-4 py-3 bg-slate-900 text-white dark:bg-slate-800 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setFloatingOpen(!floatingOpen)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <UploadCloud className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">
              {isUploading
                ? `Subiendo ${activeCount} ${activeCount === 1 ? 'archivo' : 'archivos'} a Drive...`
                : `${completedCount} de ${totalCount} subidas completadas`}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {isUploading ? 'Puedes seguir usando el sistema en segundo plano' : 'Todos los archivos sincronizados'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFloatingOpen(!floatingOpen);
            }}
            className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            {floatingOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {!isUploading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearCompleted();
              }}
              title="Cerrar panel de subidas"
              className="p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lista detallada de archivos cuando el widget está expandido */}
      {floatingOpen && (
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
          {uploadQueue.map((item) => {
            const isItemUploading = item.status === 'uploading';
            const isItemPaused = item.status === 'paused';
            const isItemDone = item.status === 'completed';
            const isItemError = item.status === 'error';
            const isItemCancelled = item.status === 'cancelled';

            return (
              <div
                key={item.id}
                className="p-3 text-xs flex flex-col gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(item.mimeType, item.fileName)}
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.fileName}>
                      {item.fileName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isItemUploading && (
                      <button
                        type="button"
                        onClick={() => pauseUpload(item.id)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                        title="Pausar subida"
                      >
                        <Pause className="w-3 h-3" />
                      </button>
                    )}
                    {isItemPaused && (
                      <button
                        type="button"
                        onClick={() => resumeUpload(item.id)}
                        className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                        title="Reanudar subida"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                    {isItemError && (
                      <button
                        type="button"
                        onClick={() => retryUpload(item.id)}
                        className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center gap-1 font-bold text-[10px]"
                        title="Reintentar subida"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reintentar
                      </button>
                    )}
                    {(isItemUploading || isItemPaused) && (
                      <button
                        type="button"
                        onClick={() => cancelUpload(item.id)}
                        className="text-[10px] text-rose-500 hover:underline font-bold ml-1"
                      >
                        Cancelar
                      </button>
                    )}
                    {isItemDone && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {isItemError && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    {isItemCancelled && <span className="text-[10px] text-slate-400 font-semibold">Cancelado</span>}
                  </div>
                </div>

                {/* Barra de progreso */}
                {(isItemUploading || isItemPaused) && (
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                        isItemPaused ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                {/* Métricas y Estado */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>
                    {formatBytes(item.bytesUploaded || 0)} de {formatBytes(item.fileSize)}
                    {item.speed && ` • ${item.speed}`}
                    {item.width && item.height && ` • ${item.width}x${item.height}px`}
                  </span>
                  <span className="font-bold">
                    {isItemUploading && `${item.progress}%`}
                    {isItemPaused && 'Pausado'}
                    {isItemDone && 'Completado'}
                    {isItemError && 'Error de subida'}
                  </span>
                </div>

                {/* Mensaje descriptivo de error */}
                {isItemError && item.error && (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400 font-medium leading-tight break-words bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20">
                    {item.error}
                  </p>
                )}

                {/* Carpeta destino / Cliente / OS */}
                {(item.clientName || item.folderName || item.serviceOrderCode) && (
                  <div className="text-[9px] text-indigo-500 font-medium truncate">
                    Destino: {item.clientName ? `Cliente ${item.clientName}` : ''}
                    {item.serviceOrderCode ? ` • OS ${item.serviceOrderCode}` : ''}
                    {item.folderName ? ` / ${item.folderName}` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
