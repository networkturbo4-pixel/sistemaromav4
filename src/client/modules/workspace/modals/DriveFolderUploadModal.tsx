import React, { useRef, useState } from 'react';
import { HardDrive, X, UploadCloud, RefreshCw } from 'lucide-react';
import { WorkspaceMonth, WorkspaceProject } from '../../../../shared/types';

interface DriveFolderUploadModalProps {
  isOpen: boolean;
  activeMonth: WorkspaceMonth | null;
  activeProject: WorkspaceProject | null;
  onClose: () => void;
  toast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const DriveFolderUploadModal: React.FC<DriveFolderUploadModalProps> = ({
  isOpen,
  activeMonth,
  activeProject,
  onClose,
  toast,
}) => {
  const [selectedDriveUploadFolder, setSelectedDriveUploadFolder] = useState<string>(
    activeMonth?.driveFolderId || ''
  );
  const [isUploadingToDriveFolder, setIsUploadingToDriveFolder] = useState(false);
  const driveUploadInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !activeMonth) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Subir Archivos a Google Drive
              </h3>
              <p className="text-xs text-slate-400">Elige la carpeta de destino para el mes actual</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Carpeta */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Carpeta de Destino en Google Drive
          </label>
          <select
            value={selectedDriveUploadFolder}
            onChange={(e) => setSelectedDriveUploadFolder(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
          >
            {activeMonth.driveFolderId && (
              <option value={activeMonth.driveFolderId}>
                📁 {activeMonth.driveFolderName || 'Carpeta Principal del Mes'}
              </option>
            )}
            {(activeMonth.driveSubfolders || []).map((sub, idx) => (
              <option key={idx} value={sub.driveFolderId || activeMonth.driveFolderId || ''}>
                📂 {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Input de archivo y dropzone */}
        <input
          ref={driveUploadInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            try {
              setIsUploadingToDriveFolder(true);
              const token = localStorage.getItem('roma_saas_token');
              for (let i = 0; i < files.length; i++) {
                const f = files[i];
                const formData = new FormData();
                formData.append('file', f);
                if (selectedDriveUploadFolder) {
                  formData.append('parentFolderId', selectedDriveUploadFolder);
                }
                if (activeProject?.clientId) {
                  formData.append('clientId', activeProject.clientId);
                }
                formData.append('category', 'social_media');

                await fetch('/api/drive/upload-stream', {
                  method: 'POST',
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                  body: formData,
                });
              }
              toast(`${files.length} archivo(s) subido(s) a Google Drive con éxito`, 'success');
              onClose();
            } catch {
              toast('Error al subir archivos a Google Drive', 'error');
            } finally {
              setIsUploadingToDriveFolder(false);
              if (e.target) e.target.value = '';
            }
          }}
        />

        <div
          onClick={() => driveUploadInputRef.current?.click()}
          className="border-2 border-dashed border-amber-300 dark:border-amber-700/60 rounded-2xl p-6 text-center hover:bg-amber-50/50 dark:hover:bg-amber-950/20 cursor-pointer transition flex flex-col items-center justify-center gap-2"
        >
          {isUploadingToDriveFolder ? (
            <>
              <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Subiendo a Google Drive...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-white">Haz clic para seleccionar archivos</span>
              <span className="text-[11px] text-slate-400">Imágenes, videos MP4, diseños PSD, AI, Canva o PDF</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
