import { AggregateRoot } from '@nestjs/cqrs';
import { ComercialClaimId } from './value-objects/comercial-claim-id';
import { ChatId } from '../chat/value-objects/chat-id';
import { ComercialId } from './value-objects/comercial-id';
import { ClaimStatus } from './value-objects/claim-status';
import { ClaimedAt } from './value-objects/claimed-at';
import { ReleasedAt } from './value-objects/released-at';
import { ComercialClaimCreatedEvent } from './events/comercial-claim-created.event';
import { ComercialClaimReleasedEvent } from './events/comercial-claim-released.event';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { UnauthorizedClaimReleaseError } from './errors/unauthorized-claim-release.error';
import { ClaimAlreadyReleasedError } from './errors/claim-already-released.error';

export interface ComercialClaimPrimitives {
  id: string;
  chatId: string;
  comercialId: string;
  claimedAt: Date;
  releasedAt: Date | null;
  status: string;
}

export class ComercialClaim extends AggregateRoot {
  private constructor(
    readonly id: ComercialClaimId,
    readonly chatId: ChatId,
    readonly comercialId: ComercialId,
    readonly claimedAt: ClaimedAt,
    readonly releasedAt: ReleasedAt | null,
    readonly status: ClaimStatus,
  ) {
    super();
  }

  static create(
    id: ComercialClaimId,
    chatId: ChatId,
    comercialId: ComercialId,
    claimedAt: ClaimedAt,
  ): ComercialClaim {
    const claim = new ComercialClaim(
      id,
      chatId,
      comercialId,
      claimedAt,
      null,
      ClaimStatus.active(),
    );

    claim.apply(
      new ComercialClaimCreatedEvent(
        id.value,
        chatId.value,
        comercialId.value,
        claimedAt.value,
      ),
    );

    return claim;
  }

  /**
   * Valida si el claim puede ser liberado por el comercial especificado
   */
  public canBeReleasedBy(comercialId: ComercialId): Result<void, DomainError> {
    if (!this.isOwnedBy(comercialId)) {
      return err(
        new UnauthorizedClaimReleaseError(comercialId.value, this.id.value),
      );
    }

    if (this.isReleased()) {
      return err(new ClaimAlreadyReleasedError(this.id.value));
    }

    return ok(undefined);
  }

  /**
   * Verifica si el claim pertenece al comercial especificado
   */
  private isOwnedBy(comercialId: ComercialId): boolean {
    return this.comercialId.value === comercialId.value;
  }

  /**
   * Libera el claim cuando el comercial termina de atender el chat
   * Versión mejorada con Result Pattern
   */
  public releaseBy(
    comercialId: ComercialId,
    releasedAt: ReleasedAt,
  ): Result<ComercialClaim, DomainError> {
    const validationResult = this.canBeReleasedBy(comercialId);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }

    const releasedClaim = new ComercialClaim(
      this.id,
      this.chatId,
      this.comercialId,
      this.claimedAt,
      releasedAt,
      ClaimStatus.released(),
    );

    releasedClaim.apply(
      new ComercialClaimReleasedEvent(
        this.id.value,
        this.chatId.value,
        this.comercialId.value,
        releasedAt.value,
      ),
    );

    return ok(releasedClaim);
  }

  /**
   * Verifica si el claim está activo
   */
  isActive(): boolean {
    return this.status.isActive();
  }

  /**
   * Verifica si el claim ha sido liberado
   */
  isReleased(): boolean {
    return this.status.isReleased();
  }

  /**
   * Convierte la entidad a primitivos para persistencia
   */
  toPrimitives(): ComercialClaimPrimitives {
    return {
      id: this.id.value,
      chatId: this.chatId.value,
      comercialId: this.comercialId.value,
      claimedAt: this.claimedAt.value,
      releasedAt: this.releasedAt?.value || null,
      status: this.status.value,
    };
  }

  /**
   * Reconstruye la entidad desde primitivos
   */
  static fromPrimitives(primitives: ComercialClaimPrimitives): ComercialClaim {
    return new ComercialClaim(
      new ComercialClaimId(primitives.id),
      new ChatId(primitives.chatId),
      new ComercialId(primitives.comercialId),
      new ClaimedAt(primitives.claimedAt),
      primitives.releasedAt ? new ReleasedAt(primitives.releasedAt) : null,
      new ClaimStatus(primitives.status),
    );
  }
}
