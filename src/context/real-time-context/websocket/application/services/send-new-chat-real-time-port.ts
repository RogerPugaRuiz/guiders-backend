export const SEND_NEW_CHAT_REAL_TIME_PORT = 'SendNewChatRealTimePort';

export interface SendNewChatRealTimePort {
  sendNewChat(chat: {
    chatId: string;
    commercialId: string | null;
    visitorId: string;
    status: string;
    lastMessage: string | null;
    lastMessageAt: Date | null;
  }): Promise<void>;
}
