import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetMessageByChatUseCase } from '../../application/usecases/get-message-by-chat.usecase';

@Controller('chat')
export class MessageController {
  constructor(private readonly getMessageByChat: GetMessageByChatUseCase) {}

  @Get(':chatId/messages')
  async getMessagesByChat(
    @Param('chatId') chatId: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
  ): Promise<string> {
    const messages = await this.getMessageByChat.execute({
      chatId,
      limit,
      offset,
    });
    return JSON.stringify(messages);
  }
}
