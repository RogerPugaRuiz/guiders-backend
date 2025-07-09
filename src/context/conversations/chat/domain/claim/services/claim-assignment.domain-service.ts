import { Injectable } from '@nestjs/common';
import { ComercialClaim } from '../comercial-claim';
import { ComercialId } from '../value-objects/comercial-id';
import { ChatId } from '../../chat/value-objects/chat-id';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Error cuando un comercial no puede ser asignado a un chat
 */
export class ComercialCannotBeAssignedError extends DomainError {
  constructor(comercialId: string, reason: string) {
    super(`El comercial ${comercialId} no puede ser asignado: ${reason}`);
  }
}

/**
 * Servicio de dominio para la gestión de asignación de claims
 * Encapsula la lógica de negocio compleja relacionada con la asignación de chats a comerciales
 */
@Injectable()
export class ClaimAssignmentDomainService {
  /**
   * Valida si un comercial puede reclamar un chat específico
   */
  public canComercialClaimChat(
    comercialId: ComercialId,
    chatId: ChatId,
    existingClaim?: ComercialClaim,
  ): Result<void, DomainError> {
    // Verificar que no hay claim activo para el chat
    if (existingClaim && existingClaim.isActive()) {
      return err(
        new ComercialCannotBeAssignedError(
          comercialId.value,
          `el chat ${chatId.value} ya tiene un claim activo`,
        ),
      );
    }

    // Aquí se pueden agregar más validaciones:
    // - ¿El comercial está online?
    // - ¿Tiene capacidad para más chats?
    // - ¿Tiene las habilidades necesarias?
    // - ¿Está en horario de trabajo?

    return ok(undefined);
  }

  /**
   * Valida si un comercial puede liberar un claim específico
   */
  public canComercialReleaseClaim(
    comercialId: ComercialId,
    claim: ComercialClaim,
  ): Result<void, DomainError> {
    // Usar la validación del aggregate
    return claim.canBeReleasedBy(comercialId);
  }

  /**
   * Calcula la prioridad de asignación para un comercial
   * (útil para algoritmos de asignación automática)
   */
  public calculateAssignmentPriority(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _comercialId: ComercialId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _chatId: ChatId,
  ): number {
    // Lógica de prioridad basada en:
    // - Carga actual del comercial
    // - Especialización
    // - Tiempo disponible
    // - Historial de performance

    // Por ahora, retornamos una prioridad base
    return 1;
  }
}
