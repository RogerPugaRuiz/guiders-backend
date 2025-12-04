import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  VisitorFiltersDto,
  VisitorLifecycleFilter,
  VisitorConnectionStatusFilter,
} from './visitor-filters.dto';

/**
 * Identificadores de filtros rápidos predefinidos
 */
export enum QuickFilterId {
  TODAY = 'today',
  THIS_WEEK = 'this_week',
  ONLINE = 'online',
  ACTIVE = 'active',
  LEADS = 'leads',
  HIGH_INTENT = 'high_intent',
  NEW_VISITORS = 'new_visitors',
  RETURNING = 'returning',
}

/**
 * Configuración de un filtro rápido
 */
export class QuickFilterConfigDto {
  @ApiProperty({
    description: 'Identificador único del filtro rápido',
    enum: QuickFilterId,
    example: QuickFilterId.TODAY,
  })
  id: QuickFilterId;

  @ApiProperty({
    description: 'Nombre del filtro para mostrar en UI',
    example: 'Hoy',
  })
  label: string;

  @ApiProperty({
    description: 'Descripción del filtro',
    example: 'Visitantes que han estado activos hoy',
  })
  description: string;

  @ApiProperty({
    description: 'Icono para la UI (nombre del icono)',
    example: 'calendar-today',
  })
  icon: string;

  @ApiPropertyOptional({
    description:
      'Contador de visitantes que coinciden (calculado dinámicamente)',
    example: 42,
  })
  count?: number;
}

/**
 * Respuesta con la configuración de todos los filtros rápidos
 */
export class QuickFiltersConfigResponseDto {
  @ApiProperty({
    description: 'Lista de filtros rápidos disponibles',
    type: [QuickFilterConfigDto],
  })
  filters: QuickFilterConfigDto[];

  @ApiProperty({
    description: 'Timestamp de la última actualización de contadores',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastUpdated: string;
}

/**
 * Mapeo interno de filtros rápidos a configuración de filtros
 * Usado internamente para convertir QuickFilterId a VisitorFiltersDto
 */
export const QUICK_FILTER_DEFINITIONS: Record<
  QuickFilterId,
  {
    label: string;
    description: string;
    icon: string;
    getFilters: () => Partial<VisitorFiltersDto>;
  }
> = {
  [QuickFilterId.TODAY]: {
    label: 'Hoy',
    description: 'Visitantes activos hoy',
    icon: 'calendar-today',
    getFilters: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return {
        lastActivityFrom: today.toISOString(),
      };
    },
  },
  [QuickFilterId.THIS_WEEK]: {
    label: 'Esta semana',
    description: 'Visitantes activos esta semana',
    icon: 'calendar-week',
    getFilters: () => {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return {
        lastActivityFrom: weekStart.toISOString(),
      };
    },
  },
  [QuickFilterId.ONLINE]: {
    label: 'Online',
    description: 'Visitantes conectados ahora',
    icon: 'circle-check',
    getFilters: () => ({
      connectionStatus: [
        VisitorConnectionStatusFilter.ONLINE,
        VisitorConnectionStatusFilter.CHATTING,
      ],
    }),
  },
  [QuickFilterId.ACTIVE]: {
    label: 'Activos',
    description: 'Visitantes con sesiones activas',
    icon: 'activity',
    getFilters: () => ({
      hasActiveSessions: true,
    }),
  },
  [QuickFilterId.LEADS]: {
    label: 'Leads',
    description: 'Visitantes identificados como leads',
    icon: 'user-check',
    getFilters: () => ({
      lifecycle: [VisitorLifecycleFilter.LEAD],
    }),
  },
  [QuickFilterId.HIGH_INTENT]: {
    label: 'High Intent',
    description: 'Leads y convertidos',
    icon: 'target',
    getFilters: () => ({
      lifecycle: [
        VisitorLifecycleFilter.LEAD,
        VisitorLifecycleFilter.CONVERTED,
      ],
    }),
  },
  [QuickFilterId.NEW_VISITORS]: {
    label: 'Nuevos',
    description: 'Visitantes anónimos',
    icon: 'user-plus',
    getFilters: () => ({
      lifecycle: [VisitorLifecycleFilter.ANON],
    }),
  },
  [QuickFilterId.RETURNING]: {
    label: 'Recurrentes',
    description: 'Visitantes que han vuelto',
    icon: 'refresh',
    getFilters: () => ({
      lifecycle: [
        VisitorLifecycleFilter.ENGAGED,
        VisitorLifecycleFilter.LEAD,
        VisitorLifecycleFilter.CONVERTED,
      ],
    }),
  },
};
