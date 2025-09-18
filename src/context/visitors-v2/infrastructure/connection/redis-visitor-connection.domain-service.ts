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
  private readonly PREFIX_KEY = 'visitor:conn:'; // valor simple key -> status
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
}

export const VISITOR_CONNECTION_SERVICE_PROVIDER = {
  provide: VISITOR_CONNECTION_DOMAIN_SERVICE,
  useClass: RedisVisitorConnectionDomainService,
};
