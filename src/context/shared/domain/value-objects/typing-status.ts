/**
 * Value Object para el estado de "escribiendo" (typing indicator)
 * Representa si un usuario está escribiendo en un chat
 */
export class TypingStatus {
  private constructor(
    private readonly _userId: string,
    private readonly _chatId: string,
    private readonly _isTyping: boolean,
    private readonly _timestamp: Date,
  ) {}

  /**
   * Crea un estado de "está escribiendo"
   */
  public static typing(userId: string, chatId: string): TypingStatus {
    return new TypingStatus(userId, chatId, true, new Date());
  }

  /**
   * Crea un estado de "no está escribiendo"
   */
  public static notTyping(userId: string, chatId: string): TypingStatus {
    return new TypingStatus(userId, chatId, false, new Date());
  }

  /**
   * Reconstruye desde primitivos (para deserialización desde Redis)
   */
  public static fromPrimitives(primitives: {
    userId: string;
    chatId: string;
    isTyping: boolean;
    timestamp: string | Date;
  }): TypingStatus {
    return new TypingStatus(
      primitives.userId,
      primitives.chatId,
      primitives.isTyping,
      typeof primitives.timestamp === 'string'
        ? new Date(primitives.timestamp)
        : primitives.timestamp,
    );
  }

  public getUserId(): string {
    return this._userId;
  }

  public getChatId(): string {
    return this._chatId;
  }

  public isTyping(): boolean {
    return this._isTyping;
  }

  public getTimestamp(): Date {
    return this._timestamp;
  }

  /**
   * Convierte a primitivos para serialización
   */
  public toPrimitives(): {
    userId: string;
    chatId: string;
    isTyping: boolean;
    timestamp: string;
  } {
    return {
      userId: this._userId,
      chatId: this._chatId,
      isTyping: this._isTyping,
      timestamp: this._timestamp.toISOString(),
    };
  }

  /**
   * Verifica si el typing status ha expirado (timeout de 3 segundos)
   */
  public isExpired(timeoutSeconds: number = 3): boolean {
    const now = new Date();
    const diffInSeconds = (now.getTime() - this._timestamp.getTime()) / 1000;
    return diffInSeconds > timeoutSeconds;
  }
}
