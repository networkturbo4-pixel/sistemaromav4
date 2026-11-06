import React, { useState } from 'react';
import { Palette, QrCode, Link as LinkIcon, ArrowLeft, Sparkles, Wrench } from 'lucide-react';
import { PaletteGeneratorTab } from './palette/PaletteGeneratorTab';
import { CodesGeneratorTab } from './codes/CodesGeneratorTab';
import { BiolinkTab } from './biolink/BiolinkTab';

interface ToolsModuleViewProps {
  onBackToHub: () => void;
  initialTab?: 'palettes' | 'codes' | 'biolink';
}

export const ToolsModuleView: React.FC<ToolsModuleViewProps> = ({
  onBackToHub,
  initialTab = 'palettes',
}) => {
  const [activeTab, setActiveTab] = useState<'palettes' | 'codes' | 'biolink'>(initialTab);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera Principal del Módulo de Herramientas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={onBackToHub}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al Hub</span>
              </button>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Workspace Studio
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Herramientas Creativas</span>
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Generador de paletas de color con vitrina de interfaces, generador inteligente de códigos QR y códigos de barras por lote, y constructor de Biolinks estilo Linktree.
            </p>
          </div>

          {/* Navegación por Pestañas */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setActiveTab('palettes')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'palettes'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4 text-pink-500" />
              <span>Generador de Paletas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('codes')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'codes'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4 text-indigo-500" />
              <span>Generador de Códigos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('biolink')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'biolink'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LinkIcon className="w-4 h-4 text-emerald-500" />
              <span>Biolinks (Linktree)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Renderizado de la Pestaña Activa */}
      {activeTab === 'palettes' && <PaletteGeneratorTab />}
      {activeTab === 'codes' && <CodesGeneratorTab />}
      {activeTab === 'biolink' && <BiolinkTab />}
    </div>
  );
};
