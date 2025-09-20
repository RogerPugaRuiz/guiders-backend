import { ICommand } from '@nestjs/cqrs';

export interface SendMessageData {
  content: string;
  type?: string;
  attachment?: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
  isInternal?: boolean;
}

export class SendMessageCommand implements ICommand {
  constructor(
    public readonly chatId: string,
    public readonly senderId: string,
    public readonly messageData: SendMessageData,
  ) {}
}
