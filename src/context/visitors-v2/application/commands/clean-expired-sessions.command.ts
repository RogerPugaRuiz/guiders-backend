import { ICommand } from '@nestjs/cqrs';
import { TenantId } from '../../domain/value-objects/tenant-id';

/**
 * Comando para limpiar sesiones expiradas de visitantes
 */
export class CleanExpiredSessionsCommand implements ICommand {
  constructor(
    public readonly tenantId?: TenantId,
    public readonly batchSize?: number,
  ) {}
}
