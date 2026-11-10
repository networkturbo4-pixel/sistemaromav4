import { ActiveModule } from '../components/AppShell';

export interface EntityNavigationTarget {
  module: ActiveModule;
  entityType: 'client' | 'quote' | 'payment_note' | 'service_order' | 'service';
  entityId: string;
  code?: string;
  action?: 'edit' | 'view' | 'create_from_service';
  serviceData?: any;
}

export function navigateToEntity(
  target: EntityNavigationTarget,
  onSelectModule: (mod: ActiveModule) => void
) {
  try {
    sessionStorage.setItem('roma_open_target', JSON.stringify(target));
  } catch {}

  onSelectModule(target.module);

  // Despachar evento para componentes ya montados
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('roma:open-target', { detail: target }));
  }, 60);
}
