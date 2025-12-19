import { Injectable, Logger } from '@nestjs/common';
import {
  ICrmSyncService,
  ICrmSyncServiceFactory,
  CrmType,
  CRM_SYNC_SERVICE_FACTORY,
} from '../../domain/services/crm-sync.service';
import { LeadcarsCrmSyncAdapter } from '../adapters/leadcars';

@Injectable()
export class CrmSyncServiceFactory implements ICrmSyncServiceFactory {
  private readonly logger = new Logger(CrmSyncServiceFactory.name);
  private readonly adapters: Map<CrmType, ICrmSyncService>;

  constructor(private readonly leadcarsAdapter: LeadcarsCrmSyncAdapter) {
    this.adapters = new Map<CrmType, ICrmSyncService>();
    this.registerAdapter(leadcarsAdapter);
  }

  /**
   * Obtiene el adapter para un tipo de CRM
   */
  getAdapter(crmType: CrmType): ICrmSyncService | null {
    const adapter = this.adapters.get(crmType);

    if (!adapter) {
      this.logger.warn(`No se encontró adapter para CRM: ${crmType}`);
      return null;
    }

    return adapter;
  }

  /**
   * Obtiene todos los tipos de CRM soportados
   */
  getSupportedTypes(): CrmType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Alias para getSupportedTypes (usado por controllers)
   */
  getSupportedCrmTypes(): CrmType[] {
    return this.getSupportedTypes();
  }

  /**
   * Verifica si un tipo de CRM está soportado
   */
  isSupported(crmType: CrmType): boolean {
    return this.adapters.has(crmType);
  }

  /**
   * Registra un adapter para un tipo de CRM
   */
  private registerAdapter(adapter: ICrmSyncService): void {
    this.adapters.set(adapter.crmType, adapter);
    this.logger.log(`Adapter registrado para CRM: ${adapter.crmType}`);
  }
}

// Re-exportar el symbol para inyección
export { CRM_SYNC_SERVICE_FACTORY };
