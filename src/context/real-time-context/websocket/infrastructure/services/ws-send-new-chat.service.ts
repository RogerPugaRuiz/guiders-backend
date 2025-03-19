import { Injectable, Logger } from '@nestjs/common';
import { SendNewChatRealTimePort } from '../../application/services/send-new-chat-real-time-port';
import { RealTimeWebSocketGateway } from '../websocket.gateway';
import { ConnectionRoleEnum } from '../../domain/value-objects/connection-role';

@Injectable()
export class WsSendNewChatService implements SendNewChatRealTimePort {
  private logger = new Logger('WsSendNewChatService');
  constructor(private readonly ws: RealTimeWebSocketGateway) {}
  sendNewChat(chat: {
    chatId: string;
    commercialId: string | null;
    visitorId: string;
    status: string;
    lastMessage: string | null;
    lastMessageAt: Date | null;
  }): Promise<void> {
    this.logger.log('Sending new chat');
    if (chat.commercialId) {
      this.ws.emitToUser(chat.commercialId, 'new_chat', chat);
      return Promise.resolve();
    }
    this.ws.emitToRole(ConnectionRoleEnum.COMMERCIAL, 'new_chat', chat);
    return Promise.resolve();
  }
}
