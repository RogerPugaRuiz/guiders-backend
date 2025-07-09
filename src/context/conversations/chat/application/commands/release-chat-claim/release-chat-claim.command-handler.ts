import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ReleaseChatClaimCommand } from './release-chat-claim.command';
import {
  IComercialClaimRepository,
  COMERCIAL_CLAIM_REPOSITORY,
} from '../../../domain/claim/comercial-claim.repository';
import { ChatId } from '../../../domain/chat/value-objects/chat-id';
import { ComercialId } from '../../../domain/claim/value-objects/comercial-id';
import { ReleasedAt } from '../../../domain/claim/value-objects/released-at';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { ClaimNotFoundError } from '../../../domain/claim/errors/claim-not-found.error';

@CommandHandler(ReleaseChatClaimCommand)
export class ReleaseChatClaimCommandHandler
  implements ICommandHandler<ReleaseChatClaimCommand>
{
  constructor(
    @Inject(COMERCIAL_CLAIM_REPOSITORY)
    private readonly claimRepository: IComercialClaimRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Maneja el comando para liberar el claim de un chat
   */
  async execute(
    command: ReleaseChatClaimCommand,
  ): Promise<Result<void, DomainError>> {
    const { chatId, comercialId } = command;

    // Buscar el claim activo del chat
    const claimResult = await this.claimRepository.findActiveClaimForChat(
      new ChatId(chatId),
    );

    if (claimResult.isErr()) {
      return err(claimResult.error);
    }

    const claim = claimResult.value;
    if (!claim) {
      return err(new ClaimNotFoundError(chatId));
    }

    // Liberar el claim usando el nuevo método con validaciones
    const releasedClaimResult = claim.releaseBy(
      new ComercialId(comercialId),
      ReleasedAt.now(),
    );

    if (releasedClaimResult.isErr()) {
      return err(releasedClaimResult.error);
    }

    const releasedClaim = releasedClaimResult.value;

    // Guardar el claim actualizado
    const saveResult = await this.claimRepository.save(releasedClaim);
    if (saveResult.isErr()) {
      return saveResult;
    }

    // Publicar eventos de dominio
    releasedClaim.getUncommittedEvents().forEach((event) => {
      this.eventBus.publish(event);
    });

    return ok(undefined);
  }
}
