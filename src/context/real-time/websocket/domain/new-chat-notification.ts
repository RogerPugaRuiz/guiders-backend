import { ChatPrimitives } from 'src/context/conversations/chat/domain/chat/chat';

export const NEW_CHAT_NOTIFICATION = Symbol('NEW_CHAT_NOTIFICATION');

export interface INewChatNotification {
  notifyNewChat(primitives: ChatPrimitives, senderId: string): Promise<void>;
}
