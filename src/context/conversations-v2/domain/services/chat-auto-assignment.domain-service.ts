import { Result } from '../../../shared/domain/result';
import { DomainError } from '../../../shared/domain/domain.error';

/**
 * Estrategias de asignamiento disponibles
 */
export enum AssignmentStrategy {
  /**
   * Distribución rotativa: asigna en orden circular
   */
  ROUND_ROBIN = 'ROUND_ROBIN',

  /**
   * Balance de carga: asigna al comercial con menor carga actual
   */
  WORKLOAD_BALANCED = 'WORKLOAD_BALANCED',

  /**
   * Basado en habilidades: asigna según especialización
   */
  SKILL_BASED = 'SKILL_BASED',

  /**
   * Aleatorio entre disponibles
   */
  RANDOM = 'RANDOM',
}

/**
 * Información de un comercial para asignamiento
 */
export interface CommercialInfo {
  id: string;
  name: string;
  isOnline: boolean;
  currentChats: number;
  maxChats: number;
  skills: string[];
  lastAssignedAt?: Date;
  lastActivity?: Date; // Última actividad registrada en heartbeat
  priority: number; // Mayor número = mayor prioridad
}

/**
 * Criterios para el asignamiento
 */
export interface AssignmentCriteria {
  strategy: AssignmentStrategy;
  requiredSkills?: string[];
  maxWaitTimeSeconds?: number;
  priorityWeight?: number;
  excludeCommercialIds?: string[];
}

/**
 * Resultado del asignamiento
 */
export interface AssignmentResult {
  commercialId: string;
  strategy: AssignmentStrategy;
  reason: string;
  score: number;
  assignedAt: Date;
}

/**
 * Error específico para asignamiento
 */
export class ChatAssignmentError extends DomainError {
  constructor(message: string) {
    super(`Error en asignamiento de chat: ${message}`);
    this.name = 'ChatAssignmentError';
  }
}

/**
 * Interface del servicio de asignamiento automático
 */
export interface ChatAutoAssignmentDomainService {
  /**
   * Selecciona el mejor comercial para un chat según los criterios
   */
  selectCommercial(
    availableCommercials: CommercialInfo[],
    criteria: AssignmentCriteria,
  ): Result<AssignmentResult, ChatAssignmentError>;

  /**
   * Valida si un comercial puede recibir un nuevo chat
   */
  canReceiveChat(commercial: CommercialInfo): boolean;

  /**
   * Calcula la puntuación de un comercial para asignamiento
   */
  calculateCommercialScore(
    commercial: CommercialInfo,
    criteria: AssignmentCriteria,
  ): number;
}

/**
 * Symbol para inyección de dependencias
 */
export const CHAT_AUTO_ASSIGNMENT_DOMAIN_SERVICE = Symbol(
  'ChatAutoAssignmentDomainService',
);
