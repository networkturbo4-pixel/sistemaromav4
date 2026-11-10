import React from 'react';
import { ActiveModule } from '../components/AppShell';
import { SettingsTab } from './SettingsModule';
import { AttendanceActionWidget } from './administration/submodules/hr/components/AttendanceActionWidget';
import { DashboardMusicWidget } from './dashboard/components/DashboardMusicWidget';

interface DashboardProps {
  onNavigate?: (mod: ActiveModule, subTab?: SettingsTab) => void;
}

export const DashboardModule: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="w-full space-y-6 animate-fadeIn pb-8">
      {/* 1. Widget Principal de Marcación Rápida de Jornada Laboral */}
      <AttendanceActionWidget mode="interactive" />

      {/* 2. Grid de 3 Columnas para todos los widgets inferiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {/* Columna 1: Widget de Música & Focus Soundify */}
        <DashboardMusicWidget
          onOpenWorkspaceMusic={() => {
            if (onNavigate) {
              onNavigate('workspace');
            }
          }}
        />

        {/* Columnas 2 y 3 preparadas para futuros widgets o métricas operativas */}
      </div>
    </div>
  );
};
