import { Injectable, Logger } from '@nestjs/common';
import { Result, ok, err } from '../../../shared/domain/result';
import {
  ChatAutoAssignmentDomainService,
  AssignmentStrategy,
  CommercialInfo,
  AssignmentCriteria,
  AssignmentResult,
  ChatAssignmentError,
} from '../../domain/services/chat-auto-assignment.domain-service';

/**
 * Implementación del servicio de asignamiento automático de chats
 * Contiene los algoritmos de selección de comerciales
 */
@Injectable()
export class ChatAutoAssignmentDomainServiceImpl
  implements ChatAutoAssignmentDomainService
{
  private readonly logger = new Logger(
    ChatAutoAssignmentDomainServiceImpl.name,
  );

  /**
   * Selecciona el mejor comercial según la estrategia definida
   */
  selectCommercial(
    availableCommercials: CommercialInfo[],
    criteria: AssignmentCriteria,
  ): Result<AssignmentResult, ChatAssignmentError> {
    // Filtrar comerciales elegibles
    const eligibleCommercials = this.filterEligibleCommercials(
      availableCommercials,
      criteria,
    );

    if (eligibleCommercials.length === 0) {
      return err(
        new ChatAssignmentError(
          'No hay comerciales disponibles que cumplan los criterios',
        ),
      );
    }

    // Seleccionar según estrategia
    const selectedCommercial = this.applyStrategy(
      eligibleCommercials,
      criteria,
    );

    if (!selectedCommercial) {
      return err(
        new ChatAssignmentError('No se pudo seleccionar un comercial'),
      );
    }

    const assignmentResult: AssignmentResult = {
      commercialId: selectedCommercial.commercial.id,
      strategy: criteria.strategy,
      reason: selectedCommercial.reason,
      score: selectedCommercial.score,
      assignedAt: new Date(),
    };

    this.logger.log(
      `Chat asignado a comercial ${selectedCommercial.commercial.id} usando estrategia ${criteria.strategy}`,
    );

    return ok(assignmentResult);
  }

  /**
   * Valida si un comercial puede recibir un nuevo chat
   */
  canReceiveChat(commercial: CommercialInfo): boolean {
    // Debe estar online
    if (!commercial.isOnline) {
      return false;
    }

    // No debe exceder su capacidad máxima
    if (commercial.currentChats >= commercial.maxChats) {
      return false;
    }

    return true;
  }

  /**
   * Calcula la puntuación de un comercial para asignamiento
   */
  calculateCommercialScore(
    commercial: CommercialInfo,
    criteria: AssignmentCriteria,
  ): number {
    let score = 0;

    // Factor de capacidad disponible (0-100 puntos)
    const capacityFactor =
      ((commercial.maxChats - commercial.currentChats) / commercial.maxChats) *
      100;
    score += capacityFactor;

    // Factor de prioridad del comercial (0-50 puntos)
    score += commercial.priority * 10;

    // Factor de skills matching si se requieren (0-50 puntos)
    if (criteria.requiredSkills && criteria.requiredSkills.length > 0) {
      const matchingSkills = criteria.requiredSkills.filter((skill) =>
        commercial.skills.includes(skill),
      );
      const skillScore =
        (matchingSkills.length / criteria.requiredSkills.length) * 50;
      score += skillScore;
    }

    // Penalización por tiempo desde última asignación (para round-robin)
    if (commercial.lastAssignedAt) {
      const minutesSinceLastAssignment =
        (Date.now() - commercial.lastAssignedAt.getTime()) / (1000 * 60);
      // Bonus de hasta 20 puntos por tiempo sin asignaciones
      score += Math.min(minutesSinceLastAssignment / 10, 20);
    } else {
      // Bonus por nunca haber sido asignado
      score += 20;
    }

    return Math.round(score);
  }

  /**
   * Filtra comerciales que cumplen los criterios básicos
   */
  private filterEligibleCommercials(
    commercials: CommercialInfo[],
    criteria: AssignmentCriteria,
  ): CommercialInfo[] {
    return commercials.filter((commercial) => {
      // Debe poder recibir chats
      if (!this.canReceiveChat(commercial)) {
        return false;
      }

      // No debe estar en la lista de excluidos
      if (
        criteria.excludeCommercialIds &&
        criteria.excludeCommercialIds.includes(commercial.id)
      ) {
        return false;
      }

      // Debe tener las skills requeridas si se especifican
      if (criteria.requiredSkills && criteria.requiredSkills.length > 0) {
        const hasRequiredSkills = criteria.requiredSkills.every((skill) =>
          commercial.skills.includes(skill),
        );
        if (!hasRequiredSkills) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Aplica la estrategia de selección específica
   */
  private applyStrategy(
    eligibleCommercials: CommercialInfo[],
    criteria: AssignmentCriteria,
  ): { commercial: CommercialInfo; reason: string; score: number } | null {
    switch (criteria.strategy) {
      case AssignmentStrategy.ROUND_ROBIN:
        return this.applyRoundRobinStrategy(eligibleCommercials);

      case AssignmentStrategy.WORKLOAD_BALANCED:
        return this.applyWorkloadBalancedStrategy(eligibleCommercials);

      case AssignmentStrategy.SKILL_BASED:
        return this.applySkillBasedStrategy(eligibleCommercials, criteria);

      case AssignmentStrategy.RANDOM:
        return this.applyRandomStrategy(eligibleCommercials);

      default:
        this.logger.warn(
          `Estrategia desconocida: ${String(criteria.strategy)}, usando workload balanced`,
        );
        return this.applyWorkloadBalancedStrategy(eligibleCommercials);
    }
  }

  /**
   * Estrategia Round Robin: selecciona el que hace más tiempo no recibe asignación
   */
  private applyRoundRobinStrategy(commercials: CommercialInfo[]): {
    commercial: CommercialInfo;
    reason: string;
    score: number;
  } {
    const sorted = commercials.sort((a, b) => {
      // Los que nunca han sido asignados van primero
      if (!a.lastAssignedAt && b.lastAssignedAt) return -1;
      if (a.lastAssignedAt && !b.lastAssignedAt) return 1;
      if (!a.lastAssignedAt && !b.lastAssignedAt) return 0;

      // Luego por tiempo de última asignación (más antiguo primero)
      return a.lastAssignedAt!.getTime() - b.lastAssignedAt!.getTime();
    });

    const selected = sorted[0];
    return {
      commercial: selected,
      reason: 'Round robin - turno por tiempo sin asignación',
      score: this.calculateCommercialScore(selected, {
        strategy: AssignmentStrategy.ROUND_ROBIN,
      }),
    };
  }

  /**
   * Estrategia Workload Balanced: selecciona el de menor carga actual
   */
  private applyWorkloadBalancedStrategy(commercials: CommercialInfo[]): {
    commercial: CommercialInfo;
    reason: string;
    score: number;
  } {
    const sorted = commercials.sort((a, b) => {
      // Primero por carga actual (menor carga primero)
      const loadDiff = a.currentChats - b.currentChats;
      if (loadDiff !== 0) return loadDiff;

      // Desempate por prioridad (mayor prioridad primero)
      return b.priority - a.priority;
    });

    const selected = sorted[0];
    return {
      commercial: selected,
      reason: `Balance de carga - ${selected.currentChats}/${selected.maxChats} chats`,
      score: this.calculateCommercialScore(selected, {
        strategy: AssignmentStrategy.WORKLOAD_BALANCED,
      }),
    };
  }

  /**
   * Estrategia Skill Based: selecciona el de mejor match de habilidades
   */
  private applySkillBasedStrategy(
    commercials: CommercialInfo[],
    criteria: AssignmentCriteria,
  ): { commercial: CommercialInfo; reason: string; score: number } {
    const scoredCommercials = commercials.map((commercial) => ({
      commercial,
      score: this.calculateCommercialScore(commercial, criteria),
    }));

    // Ordenar por puntuación descendente
    scoredCommercials.sort((a, b) => b.score - a.score);

    const selected = scoredCommercials[0];
    const matchingSkills = criteria.requiredSkills
      ? criteria.requiredSkills.filter((skill) =>
          selected.commercial.skills.includes(skill),
        )
      : [];

    return {
      commercial: selected.commercial,
      reason: `Skills match - ${matchingSkills.length}/${criteria.requiredSkills?.length || 0} habilidades`,
      score: selected.score,
    };
  }

  /**
   * Estrategia Random: selección aleatoria entre elegibles
   */
  private applyRandomStrategy(commercials: CommercialInfo[]): {
    commercial: CommercialInfo;
    reason: string;
    score: number;
  } {
    const randomIndex = Math.floor(Math.random() * commercials.length);
    const selected = commercials[randomIndex];

    return {
      commercial: selected,
      reason: 'Selección aleatoria',
      score: this.calculateCommercialScore(selected, {
        strategy: AssignmentStrategy.RANDOM,
      }),
    };
  }
}
