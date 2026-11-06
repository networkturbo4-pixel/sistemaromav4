import React from 'react';
import { ActiveModule } from '../components/AppShell';
import { SettingsTab } from './SettingsModule';
import { AttendanceActionWidget } from './administration/submodules/hr/components/AttendanceActionWidget';

interface DashboardProps {
  onNavigate?: (mod: ActiveModule, subTab?: SettingsTab) => void;
}

export const DashboardModule: React.FC<DashboardProps> = () => {
  return (
    <div className="w-full space-y-6 animate-fadeIn pb-8">
      {/* Widget Principal de Marcación Rápida de Jornada Laboral */}
      <AttendanceActionWidget mode="interactive" />
    </div>
  );
};
