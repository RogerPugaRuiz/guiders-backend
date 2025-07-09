import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateChatClaimCommand } from './create-chat-claim.command';
import {
  IComercialClaimRepository,
  COMERCIAL_CLAIM_REPOSITORY,
} from '../../../domain/claim/comercial-claim.repository';
import { ComercialClaim } from '../../../domain/claim/comercial-claim';
import { ComercialClaimId } from '../../../domain/claim/value-objects/comercial-claim-id';
import { ChatId } from '../../../domain/chat/value-objects/chat-id';
import { ComercialId } from '../../../domain/claim/value-objects/comercial-id';
import { ClaimedAt } from '../../../domain/claim/value-objects/claimed-at';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

/**
 * Error cuando un chat ya tiene un claim activo
 */
export class ChatAlreadyClaimedError extends DomainError {
  constructor(chatId: string) {
    super(`El chat ${chatId} ya tiene un claim activo`);
  }
}

@CommandHandler(CreateChatClaimCommand)
export class CreateChatClaimCommandHandler
  implements ICommandHandler<CreateChatClaimCommand>
{
  constructor(
    @Inject(COMERCIAL_CLAIM_REPOSITORY)
    private readonly claimRepository: IComercialClaimRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Maneja el comando para crear un claim de chat
   */
  async execute(
    command: CreateChatClaimCommand,
  ): Promise<Result<void, DomainError>> {
    const { chatId, comercialId } = command;

    // Verificar que el chat no tiene un claim activo
    const existingClaimResult =
      await this.claimRepository.findActiveClaimForChat(new ChatId(chatId));

    if (existingClaimResult.isErr()) {
      return err(existingClaimResult.error);
    }

    if (existingClaimResult.value) {
      return err(new ChatAlreadyClaimedError(chatId));
    }

    // Crear el nuevo claim
    const claim = ComercialClaim.create(
      new ComercialClaimId(crypto.randomUUID()),
      new ChatId(chatId),
      new ComercialId(comercialId),
      ClaimedAt.now(),
    );

    // Guardar el claim
    const saveResult = await this.claimRepository.save(claim);
    if (saveResult.isErr()) {
      return saveResult;
    }

    // Publicar eventos de dominio
    claim.getUncommittedEvents().forEach((event) => {
      this.eventBus.publish(event);
    });

    return ok(undefined);
  }
}
