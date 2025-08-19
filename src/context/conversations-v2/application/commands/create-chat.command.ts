import { ICommand } from '@nestjs/cqrs';
import { ChatMetadataData } from '../../domain/value-objects/chat-metadata';
import { VisitorInfoData } from '../../domain/value-objects/visitor-info';

/**
 * Comando para crear un nuevo chat en la V2
 * Incluye toda la información necesaria para la creación
 */
export class CreateChatCommand implements ICommand {
  constructor(
    public readonly chatId: string,
    public readonly visitorId: string,
    public readonly visitorInfo: VisitorInfoData,
    public readonly availableCommercialIds: string[],
    public readonly priority?: string,
    public readonly metadata?: ChatMetadataData,
  ) {}

  /**
   * Método factory para crear el comando con validaciones básicas
   */
  static create(params: {
    chatId: string;
    visitorId: string;
    visitorInfo: VisitorInfoData;
    availableCommercialIds: string[];
    priority?: string;
    metadata?: ChatMetadataData;
  }): CreateChatCommand {
    return new CreateChatCommand(
      params.chatId,
      params.visitorId,
      params.visitorInfo,
      params.availableCommercialIds,
      params.priority,
      params.metadata,
    );
  }
}