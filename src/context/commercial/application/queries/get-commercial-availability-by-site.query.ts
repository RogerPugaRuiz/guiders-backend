import { IQuery } from '@nestjs/cqrs';

/**
 * Query para obtener la disponibilidad de comerciales para un sitio específico
 * Usado por el endpoint público para que visitantes sepan si hay comerciales disponibles
 */
export class GetCommercialAvailabilityBySiteQuery implements IQuery {
  constructor(public readonly siteId: string) {}
}
