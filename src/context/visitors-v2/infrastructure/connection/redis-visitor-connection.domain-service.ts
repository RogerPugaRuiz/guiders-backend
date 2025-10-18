import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import {
  VISITOR_CONNECTION_DOMAIN_SERVICE,
  VisitorConnectionDomainService,
} from '../../domain/visitor-connection.domain-service';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import {
  ConnectionStatus,
  VisitorConnectionVO,
} from '../../domain/value-objects/visitor-connection';
import { VisitorLastActivity } from '../../domain/value-objects/visitor-last-activity';

// Implementación Redis del servicio de dominio de conexiones de visitantes
// No se expone fuera de infraestructura; se inyecta mediante el símbolo
@Injectable()
export class RedisVisitorConnectionDomainService
  implements VisitorConnectionDomainService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    RedisVisitorConnectionDomainService.name,
  );
  private client: RedisClientType;
  private readonly TTL_SECONDS = 120; // Configurable si se necesita
  private readonly TYPING_TTL_SECONDS = 3; // 3 segundos para typing indicator
  private readonly PREFIX_KEY = 'visitor:conn:'; // valor simple key -> status
  private readonly PREFIX_ACTIVITY = 'visitor:activity:'; // key -> timestamp
  private readonly PREFIX_TYPING = 'visitor:typing:'; // visitor:typing:{visitorId}:{chatId} -> timestamp
  private readonly SET_ONLINE = 'visitors:online';
  private readonly SET_CHATTING = 'visitors:chatting';

  async onModuleInit() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    this.client.on('error', (err) =>
      this.logger.error('Error en cliente Redis conexiones', err),
    );
    await this.client.connect();
    this.logger.log('Cliente Redis conexiones inicializado');
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  private key(visitorId: VisitorId): string {
    return `${this.PREFIX_KEY}${visitorId.getValue()}`;
  }

  private activityKey(visitorId: VisitorId): string {
    return `${this.PREFIX_ACTIVITY}${visitorId.getValue()}`;
  }

  async setConnectionStatus(
    visitorId: VisitorId,
    connection: VisitorConnectionVO,
  ): Promise<void> {
    const key = this.key(visitorId);
    const status = connection.getValue();

    await this.client
      .multi()
      .set(key, status)
      .expire(key, this.TTL_SECONDS)
      .exec();

    // Actualizar sets
    // Remover de ambos para estado limpio
    await this.client.sRem(this.SET_ONLINE, visitorId.getValue());
    await this.client.sRem(this.SET_CHATTING, visitorId.getValue());

    if (status === ConnectionStatus.ONLINE) {
      await this.client.sAdd(this.SET_ONLINE, visitorId.getValue());
    } else if (status === ConnectionStatus.CHATTING) {
      await this.client.sAdd(this.SET_ONLINE, visitorId.getValue());
      await this.client.sAdd(this.SET_CHATTING, visitorId.getValue());
    } else if (status === ConnectionStatus.AWAY) {
      await this.client.sAdd(this.SET_ONLINE, visitorId.getValue());
    }
  }

  async getConnectionStatus(
    visitorId: VisitorId,
  ): Promise<VisitorConnectionVO> {
    const raw = await this.client.get(this.key(visitorId));
    if (!raw) return new VisitorConnectionVO(ConnectionStatus.OFFLINE);
    if (raw === ConnectionStatus.CHATTING.toString()) {
      return new VisitorConnectionVO(ConnectionStatus.CHATTING);
    }
    if (raw === ConnectionStatus.ONLINE.toString()) {
      return new VisitorConnectionVO(ConnectionStatus.ONLINE);
    }
    if (raw === ConnectionStatus.AWAY.toString()) {
      return new VisitorConnectionVO(ConnectionStatus.AWAY);
    }
    return new VisitorConnectionVO(ConnectionStatus.OFFLINE);
  }

  async removeConnection(visitorId: VisitorId): Promise<void> {
    await this.client.del(this.key(visitorId));
    await this.client.sRem(this.SET_ONLINE, visitorId.getValue());
    await this.client.sRem(this.SET_CHATTING, visitorId.getValue());
  }

  async isVisitorOnline(visitorId: VisitorId): Promise<boolean> {
    const status = await this.getConnectionStatus(visitorId);
    return status.isOnline();
  }

  async getChattingVisitors(): Promise<VisitorId[]> {
    const members = await this.client.sMembers(this.SET_CHATTING);
    return members.map((id) => new VisitorId(id));
  }

  async getOnlineVisitors(): Promise<VisitorId[]> {
    const members = await this.client.sMembers(this.SET_ONLINE);
    return members.map((id) => new VisitorId(id));
  }

  private typingKey(visitorId: VisitorId, chatId: string): string {
    return `${this.PREFIX_TYPING}${visitorId.getValue()}:${chatId}`;
  }

  async setTyping(visitorId: VisitorId, chatId: string): Promise<void> {
    const key = this.typingKey(visitorId, chatId);
    const timestamp = Date.now().toString();

    await this.client
      .multi()
      .set(key, timestamp)
      .expire(key, this.TYPING_TTL_SECONDS)
      .exec();

    this.logger.debug(
      `Visitante ${visitorId.getValue()} está escribiendo en chat ${chatId}`,
    );
  }

  async isTyping(visitorId: VisitorId, chatId: string): Promise<boolean> {
    const key = this.typingKey(visitorId, chatId);
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  async clearTyping(visitorId: VisitorId, chatId: string): Promise<void> {
    const key = this.typingKey(visitorId, chatId);
    await this.client.del(key);
    this.logger.debug(
      `Visitante ${visitorId.getValue()} dejó de escribir en chat ${chatId}`,
    );
  }

  async getTypingInChat(chatId: string): Promise<VisitorId[]> {
    // Buscar todas las keys que coincidan con el patrón: visitor:typing:*:{chatId}
    const pattern = `${this.PREFIX_TYPING}*:${chatId}`;
    const keys = await this.client.keys(pattern);

    const typingVisitors: VisitorId[] = [];
    for (const key of keys) {
      // Extraer el visitorId del key
      // Format: visitor:typing:{visitorId}:{chatId}
      const parts = key.replace(this.PREFIX_TYPING, '').split(':');
      if (parts.length === 2) {
        const visitorIdValue = parts[0];
        typingVisitors.push(new VisitorId(visitorIdValue));
      }
    }

    return typingVisitors;
  }

  async updateLastActivity(
    visitorId: VisitorId,
    lastActivity: VisitorLastActivity,
  ): Promise<void> {
    const activityKey = this.activityKey(visitorId);
    const timestamp = lastActivity.value.getTime().toString();

    await this.client
      .multi()
      .set(activityKey, timestamp)
      .expire(activityKey, this.TTL_SECONDS)
      .exec();
  }

  async getLastActivity(visitorId: VisitorId): Promise<VisitorLastActivity> {
    const raw = await this.client.get(this.activityKey(visitorId));
    if (!raw) return VisitorLastActivity.now();

    const timestamp = parseInt(raw, 10);
    return new VisitorLastActivity(new Date(timestamp));
  }

  async isVisitorActive(
    visitorId: VisitorId,
    timeoutMinutes: number = 5,
  ): Promise<boolean> {
    const lastActivity = await this.getLastActivity(visitorId);
    return !lastActivity.isExpired(timeoutMinutes);
  }
}

export const VISITOR_CONNECTION_SERVICE_PROVIDER = {
  provide: VISITOR_CONNECTION_DOMAIN_SERVICE,
  useClass: RedisVisitorConnectionDomainService,
};
