import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { FindClaimedChatsByComercialQuery } from './find-claimed-chats-by-comercial.query';
import {
  IChatRepository,
  CHAT_REPOSITORY,
} from '../../../domain/chat/chat.repository';
import {
  IComercialClaimRepository,
  COMERCIAL_CLAIM_REPOSITORY,
} from '../../../domain/claim/comercial-claim.repository';
import { ComercialId } from '../../../domain/claim/value-objects/comercial-id';
import { Chat } from '../../../domain/chat/chat';

@QueryHandler(FindClaimedChatsByComercialQuery)
export class FindClaimedChatsByComercialQueryHandler
  implements IQueryHandler<FindClaimedChatsByComercialQuery>
{
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(COMERCIAL_CLAIM_REPOSITORY)
    private readonly claimRepository: IComercialClaimRepository,
  ) {}

  /**
   * Encuentra todos los chats que tiene reclamados un comercial
   */
  async execute(
    query: FindClaimedChatsByComercialQuery,
  ): Promise<{ chats: Chat[] }> {
    const { comercialId } = query;

    // Obtener todos los claims activos del comercial
    const claimsResult = await this.claimRepository.findActiveClaimsByComercial(
      new ComercialId(comercialId),
    );

    if (claimsResult.isErr()) {
      return { chats: [] };
    }

    const claims = claimsResult.value;
    if (claims.length === 0) {
      return { chats: [] };
    }

    // Obtener los chats correspondientes a los claims
    const chats: Chat[] = [];
    for (const claim of claims) {
      const chatResult = await this.chatRepository.findById(claim.chatId);
      if (!chatResult.isEmpty()) {
        chats.push(chatResult.get().chat);
      }
    }

    return { chats };
  }
}
