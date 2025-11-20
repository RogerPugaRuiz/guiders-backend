import { ApiProperty } from '@nestjs/swagger';
import {
  LeadScorePrimitives,
  LeadSignals,
  LeadTier,
} from 'src/context/lead-scoring/domain/value-objects/lead-score';

class LeadSignalsDto implements LeadSignals {
  @ApiProperty({ description: 'Visitante recurrente (≥3 sesiones)' })
  isRecurrentVisitor: boolean;

  @ApiProperty({ description: 'Alto engagement (≥10 páginas)' })
  hasHighEngagement: boolean;

  @ApiProperty({ description: 'Tiempo invertido (≥5 minutos)' })
  hasInvestedTime: boolean;

  @ApiProperty({
    description: 'Necesita ayuda (engaged + ≥3 sesiones + 0 chats)',
  })
  needsHelp: boolean;
}

class LeadScoreDto implements LeadScorePrimitives {
  @ApiProperty({ description: 'Score numérico del lead (0-100)' })
  score: number;

  @ApiProperty({ description: 'Tier del lead', enum: ['cold', 'warm', 'hot'] })
  tier: LeadTier;

  @ApiProperty({ description: 'Señales de intención', type: LeadSignalsDto })
  signals: LeadSignals;
}

export class GetVisitorActivityResponseDto {
  @ApiProperty({ description: 'ID del visitante' })
  visitorId: string;

  @ApiProperty({ description: 'Número total de sesiones' })
  totalSessions: number;

  @ApiProperty({ description: 'Número total de chats' })
  totalChats: number;

  @ApiProperty({ description: 'Número total de páginas visitadas' })
  totalPagesVisited: number;

  @ApiProperty({ description: 'Tiempo total conectado en milisegundos' })
  totalTimeConnectedMs: number;

  @ApiProperty({ description: 'Estado de conexión actual' })
  currentConnectionStatus: string;

  @ApiProperty({ description: 'Ciclo de vida del visitante' })
  lifecycle: string;

  @ApiProperty({ description: 'Última actividad registrada', type: String })
  lastActivityAt: string;

  @ApiProperty({ description: 'URL actual', required: false })
  currentUrl?: string;

  @ApiProperty({
    description: 'Lead score y señales de intención',
    type: LeadScoreDto,
  })
  leadScore: LeadScorePrimitives;
}
