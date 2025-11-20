import { AssignmentStrategy } from '../services/chat-auto-assignment.domain-service';

/**
 * Configuración de reglas de auto-asignación por empresa/sitio
 */
export interface AssignmentRulesData {
  companyId: string;
  siteId?: string; // Si es undefined, aplica a toda la empresa
  defaultStrategy: AssignmentStrategy;
  maxChatsPerCommercial: number;
  maxWaitTimeSeconds: number;
  enableSkillBasedRouting: boolean;
  workingHours?: {
    timezone: string;
    schedule: Array<{
      dayOfWeek: number; // 0 = domingo, 1 = lunes, etc.
      startTime: string; // HH:mm formato
      endTime: string; // HH:mm formato
    }>;
  };
  fallbackStrategy: AssignmentStrategy;
  priorities: {
    [skill: string]: number; // Prioridad por skill (mayor número = mayor prioridad)
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Value Object para reglas de asignamiento
 */
export class AssignmentRules {
  private constructor(private readonly data: AssignmentRulesData) {}

  static create(data: AssignmentRulesData): AssignmentRules {
    AssignmentRules.validate(data);
    return new AssignmentRules(data);
  }

  static fromPrimitives(primitives: AssignmentRulesData): AssignmentRules {
    return new AssignmentRules(primitives);
  }

  private static validate(data: AssignmentRulesData): void {
    if (!data.companyId) {
      throw new Error('Company ID es requerido');
    }

    if (data.maxChatsPerCommercial <= 0) {
      throw new Error('Max chats per commercial debe ser mayor a 0');
    }

    if (data.maxWaitTimeSeconds <= 0) {
      throw new Error('Max wait time debe ser mayor a 0');
    }

    if (!Object.values(AssignmentStrategy).includes(data.defaultStrategy)) {
      throw new Error('Estrategia por defecto inválida');
    }

    if (!Object.values(AssignmentStrategy).includes(data.fallbackStrategy)) {
      throw new Error('Estrategia de fallback inválida');
    }

    // Validar horarios de trabajo si están definidos
    if (data.workingHours) {
      for (const schedule of data.workingHours.schedule) {
        if (schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
          throw new Error('Day of week debe estar entre 0 y 6');
        }

        if (
          !this.isValidTimeFormat(schedule.startTime) ||
          !this.isValidTimeFormat(schedule.endTime)
        ) {
          throw new Error('Formato de hora inválido, usar HH:mm');
        }
      }
    }
  }

  private static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  // Getters
  get companyId(): string {
    return this.data.companyId;
  }

  get siteId(): string | undefined {
    return this.data.siteId;
  }

  get defaultStrategy(): AssignmentStrategy {
    return this.data.defaultStrategy;
  }

  get maxChatsPerCommercial(): number {
    return this.data.maxChatsPerCommercial;
  }

  get maxWaitTimeSeconds(): number {
    return this.data.maxWaitTimeSeconds;
  }

  get enableSkillBasedRouting(): boolean {
    return this.data.enableSkillBasedRouting;
  }

  get workingHours(): AssignmentRulesData['workingHours'] {
    return this.data.workingHours;
  }

  get fallbackStrategy(): AssignmentStrategy {
    return this.data.fallbackStrategy;
  }

  get priorities(): { [skill: string]: number } {
    return this.data.priorities;
  }

  get isActive(): boolean {
    return this.data.isActive;
  }

  get createdAt(): Date {
    return this.data.createdAt;
  }

  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  /**
   * Verifica si está en horario de trabajo según las reglas configuradas
   */
  isWithinWorkingHours(date = new Date()): boolean {
    if (!this.workingHours) {
      return true; // Sin horarios definidos = siempre disponible
    }

    const dayOfWeek = date.getDay();
    const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    const scheduleForDay = this.workingHours.schedule.find(
      (schedule) => schedule.dayOfWeek === dayOfWeek,
    );

    if (!scheduleForDay) {
      return false; // No hay horario para este día
    }

    return (
      currentTime >= scheduleForDay.startTime &&
      currentTime <= scheduleForDay.endTime
    );
  }

  /**
   * Obtiene la estrategia a usar basada en horarios y condiciones
   */
  getActiveStrategy(date = new Date()): AssignmentStrategy {
    if (!this.isActive) {
      return this.fallbackStrategy;
    }

    if (!this.isWithinWorkingHours(date)) {
      return this.fallbackStrategy;
    }

    return this.defaultStrategy;
  }

  /**
   * Convierte a primitivos para persistencia
   */
  toPrimitives(): AssignmentRulesData {
    return { ...this.data };
  }

  /**
   * Actualiza las reglas con nuevos datos
   */
  update(
    updates: Partial<
      Omit<AssignmentRulesData, 'companyId' | 'siteId' | 'createdAt'>
    >,
  ): AssignmentRules {
    const updatedData: AssignmentRulesData = {
      ...this.data,
      ...updates,
      updatedAt: new Date(),
    };

    return AssignmentRules.create(updatedData);
  }

  /**
   * Verifica si aplica a una empresa/sitio específico
   */
  appliesTo(companyId: string, siteId?: string): boolean {
    if (this.companyId !== companyId) {
      return false;
    }

    // Si no hay siteId configurado, aplica a toda la empresa
    if (!this.siteId) {
      return true;
    }

    // Si hay siteId específico, debe coincidir
    return this.siteId === siteId;
  }
}
