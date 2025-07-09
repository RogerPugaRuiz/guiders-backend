import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ClaimChatCommand } from './claim-chat.command';
import {
  IComercialClaimRepository,
  COMERCIAL_CLAIM_REPOSITORY,
} from '../../../domain/claim/comercial-claim.repository';
import { ComercialClaim } from '../../../domain/claim/comercial-claim';
import { ComercialClaimId } from '../../../domain/claim/value-objects/comercial-claim-id';
import { ChatId } from '../../../domain/chat/value-objects/chat-id';
import { ComercialId } from '../../../domain/claim/value-objects/comercial-id';
import { ClaimedAt } from '../../../domain/claim/value-objects/claimed-at';

@CommandHandler(ClaimChatCommand)
export class ClaimChatCommandHandler
  implements ICommandHandler<ClaimChatCommand>
{
  constructor(
    @Inject(COMERCIAL_CLAIM_REPOSITORY)
    private readonly claimRepository: IComercialClaimRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * Maneja el comando para que un comercial reclame un chat
   */
  async execute(command: ClaimChatCommand): Promise<void> {
    const { chatId, comercialId } = command;

    // Verificar si el chat ya tiene un claim activo
    const existingClaimResult =
      await this.claimRepository.findActiveClaimForChat(new ChatId(chatId));

    if (existingClaimResult.isErr()) {
      throw new Error(
        `Error al verificar claims existentes: ${existingClaimResult.error.message}`,
      );
    }

    if (existingClaimResult.value) {
      throw new Error(`El chat ${chatId} ya tiene un claim activo`);
    }

    // Crear el nuevo claim
    const claim = ComercialClaim.create(
      new ComercialClaimId(ComercialClaimId.generate()),
      new ChatId(chatId),
      new ComercialId(comercialId),
      ClaimedAt.now(),
    );

    // Guardar el claim
    const saveResult = await this.claimRepository.save(claim);
    if (saveResult.isErr()) {
      throw new Error(`Error al guardar el claim: ${saveResult.error.message}`);
    }

    // Publicar eventos de dominio
    claim.getUncommittedEvents().forEach((event) => {
      this.eventBus.publish(event);
    });
  }
}
