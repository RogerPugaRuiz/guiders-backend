/**
 * Señales de alta intención del visitante
 */
export interface LeadSignals {
  /** Visitante recurrente: totalSessions >= 3 */
  isRecurrentVisitor: boolean;
  /** Alto engagement: totalPagesVisited >= 10 */
  hasHighEngagement: boolean;
  /** Tiempo invertido: totalTimeConnectedMs >= 300000 (5 min) */
  hasInvestedTime: boolean;
  /** Necesita ayuda: lifecycle ENGAGED + sessions >= 3 + chats === 0 */
  needsHelp: boolean;
}

/**
 * Tier del lead basado en el score
 */
export type LeadTier = 'cold' | 'warm' | 'hot';

/**
 * Primitivos para serialización de LeadScore
 */
export interface LeadScorePrimitives {
  score: number;
  tier: LeadTier;
  signals: LeadSignals;
}

/**
 * Datos necesarios para calcular el score
 */
export interface LeadScoringInput {
  totalSessions: number;
  totalPagesVisited: number;
  totalTimeConnectedMs: number;
  totalChats: number;
  lifecycle: string;
}

/**
 * Value Object que representa el score y señales de intención de un lead
 */
export class LeadScore {
  private readonly _score: number;
  private readonly _tier: LeadTier;
  private readonly _signals: LeadSignals;

  private constructor(score: number, tier: LeadTier, signals: LeadSignals) {
    this._score = score;
    this._tier = tier;
    this._signals = signals;
  }

  /**
   * Calcula el LeadScore a partir de los datos del visitante
   *
   * Fórmula: score = min(100, (sessions * 10) + (pages * 2) + (timeMin * 1))
   */
  public static calculate(input: LeadScoringInput): LeadScore {
    const timeMinutes = Math.floor(input.totalTimeConnectedMs / 60000);

    // Calcular score base
    const rawScore =
      (input.totalSessions * 10) +
      (input.totalPagesVisited * 2) +
      (timeMinutes * 1);

    const score = Math.min(100, rawScore);

    // Calcular señales
    const signals: LeadSignals = {
      isRecurrentVisitor: input.totalSessions >= 3,
      hasHighEngagement: input.totalPagesVisited >= 10,
      hasInvestedTime: input.totalTimeConnectedMs >= 300000, // 5 minutos
      needsHelp:
        input.lifecycle === 'ENGAGED' &&
        input.totalSessions >= 3 &&
        input.totalChats === 0,
    };

    // Determinar tier
    const tier = LeadScore.calculateTier(score, signals);

    return new LeadScore(score, tier, signals);
  }

  /**
   * Determina el tier basado en el score y las señales
   */
  private static calculateTier(score: number, signals: LeadSignals): LeadTier {
    // Hot: score >= 50 O tiene al menos 2 señales activas
    const activeSignals = Object.values(signals).filter(Boolean).length;

    if (score >= 50 || activeSignals >= 2) {
      return 'hot';
    }

    if (score >= 20 || activeSignals >= 1) {
      return 'warm';
    }

    return 'cold';
  }

  /**
   * Crea un LeadScore desde primitivos
   */
  public static fromPrimitives(primitives: LeadScorePrimitives): LeadScore {
    return new LeadScore(primitives.score, primitives.tier, primitives.signals);
  }

  /**
   * Convierte a primitivos para serialización
   */
  public toPrimitives(): LeadScorePrimitives {
    return {
      score: this._score,
      tier: this._tier,
      signals: { ...this._signals },
    };
  }

  // Getters
  public getScore(): number {
    return this._score;
  }

  public getTier(): LeadTier {
    return this._tier;
  }

  public getSignals(): LeadSignals {
    return { ...this._signals };
  }

  /**
   * Verifica si el lead es de alta intención (hot)
   */
  public isHighIntent(): boolean {
    return this._tier === 'hot';
  }

  /**
   * Cuenta cuántas señales están activas
   */
  public getActiveSignalsCount(): number {
    return Object.values(this._signals).filter(Boolean).length;
  }
}
