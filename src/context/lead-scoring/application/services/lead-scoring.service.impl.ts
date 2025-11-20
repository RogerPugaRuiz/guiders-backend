import { Injectable } from '@nestjs/common';
import { LeadScoringService } from '../../domain/lead-scoring.service';
import {
  LeadScore,
  LeadScoringInput,
} from '../../domain/value-objects/lead-score';

/**
 * Implementación del servicio de Lead Scoring
 */
@Injectable()
export class LeadScoringServiceImpl implements LeadScoringService {
  /**
   * Calcula el score de un lead basado en sus métricas de actividad
   */
  calculateScore(input: LeadScoringInput): LeadScore {
    return LeadScore.calculate(input);
  }
}
