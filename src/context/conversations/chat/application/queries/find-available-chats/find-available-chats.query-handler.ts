import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { FindAvailableChatsQuery } from './find-available-chats.query';
import {
  IChatRepository,
  CHAT_REPOSITORY,
} from '../../../domain/chat/chat.repository';
import {
  IComercialClaimRepository,
  COMERCIAL_CLAIM_REPOSITORY,
} from '../../../domain/claim/comercial-claim.repository';
import { Chat } from '../../../domain/chat/chat';
import { Criteria, Filter, Operator } from 'src/context/shared/domain/criteria';

@QueryHandler(FindAvailableChatsQuery)
export class FindAvailableChatsQueryHandler
  implements IQueryHandler<FindAvailableChatsQuery>
{
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepository: IChatRepository,
    @Inject(COMERCIAL_CLAIM_REPOSITORY)
    private readonly claimRepository: IComercialClaimRepository,
  ) {}

  /**
   * Encuentra chats que no tienen claims activos (disponibles para ser reclamados)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(query: FindAvailableChatsQuery): Promise<{ chats: Chat[] }> {
    // Obtener los IDs de chats que ya tienen claims activos
    const activeChatIdsResult = await this.claimRepository.getActiveChatIds();

    if (activeChatIdsResult.isErr()) {
      // En caso de error, devolver lista vacía o manejar el error
      return { chats: [] };
    }

    const activeChatIds = activeChatIdsResult.value;

    // Si no hay chats con claims activos, devolver todos los chats
    if (activeChatIds.length === 0) {
      return await this.chatRepository.findAll();
    }

    // Crear criterio para excluir chats con claims activos
    const filters = [new Filter<Chat>('id', Operator.NOT_IN, activeChatIds)];

    const criteria = new Criteria<Chat>(filters);

    // Buscar chats disponibles
    return await this.chatRepository.find(criteria);
  }
}
