import { Chat } from './chat';

export interface ChatRepository {
  save(chat: Chat): Promise<void>;
  findById(id: string): Promise<Chat | undefined>;
  findByVisitorId(visitorId: string): Promise<Chat | undefined>;
  findByCommercialId(commercialId: string): Promise<Chat | undefined>;
  findByVisitorIdAndCommercialId(
    visitorId: string,
    commercialId: string,
  ): Promise<Chat | undefined>;
  findAll(): Promise<Chat[]>;
}
