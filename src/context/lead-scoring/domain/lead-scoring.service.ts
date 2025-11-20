import { LeadScore, LeadScoringInput } from './value-objects/lead-score';

/**
 * Interfaz del servicio de cálculo de Lead Scoring
 */
export interface LeadScoringService {
  /**
   * Calcula el score de un lead basado en sus métricas de actividad
   */
  calculateScore(input: LeadScoringInput): LeadScore;
}

export const LEAD_SCORING_SERVICE = Symbol('LeadScoringService');
