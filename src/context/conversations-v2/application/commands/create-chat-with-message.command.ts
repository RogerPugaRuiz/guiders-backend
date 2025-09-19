import { ICommand } from '@nestjs/cqrs';
import { VisitorInfoData } from '../../domain/value-objects/visitor-info';
import { ChatMetadataData } from '../../domain/value-objects/chat-metadata';

export interface FirstMessageData {
  content: string;
  type?: string;
  attachment?: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

export class CreateChatWithMessageCommand implements ICommand {
  constructor(
    public readonly visitorId: string,
    public readonly firstMessage: FirstMessageData,
    public readonly visitorInfo?: VisitorInfoData,
    public readonly metadata?: ChatMetadataData,
  ) {}
}
