import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import {
  CommercialConnectionDomainService,
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
} from '../../domain/commercial-connection.domain-service';
import { CommercialId } from '../../domain/value-objects/commercial-id';
import { CommercialConnectionStatus } from '../../domain/value-objects/commercial-connection-status';
import { CommercialLastActivity } from '../../domain/value-objects/commercial-last-activity';

/**
 * Implementación Redis del servicio de dominio de conexiones de comerciales
 * No se expone fuera de infraestructura; se inyecta mediante el símbolo
 */
@Injectable()
export class RedisCommercialConnectionDomainService
  implements CommercialConnectionDomainService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    RedisCommercialConnectionDomainService.name,
  );
  private client: RedisClientType;
  private readonly TTL_SECONDS = 300; // 5 minutos por defecto
  private readonly PREFIX_STATUS = 'commercial:status:'; // key -> status
  private readonly PREFIX_ACTIVITY = 'commercial:activity:'; // key -> timestamp
  private readonly SET_ONLINE = 'commercials:online';
  private readonly SET_AVAILABLE = 'commercials:available';
  private readonly SET_BUSY = 'commercials:busy';

  async onModuleInit() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    this.client.on('error', (err) =>
      this.logger.error('Error en cliente Redis conexiones comerciales', err),
    );
    await this.client.connect();
    this.logger.log('Cliente Redis conexiones comerciales inicializado');
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  private statusKey(commercialId: CommercialId): string {
    return `${this.PREFIX_STATUS}${commercialId.value}`;
  }

  private activityKey(commercialId: CommercialId): string {
    return `${this.PREFIX_ACTIVITY}${commercialId.value}`;
  }

  async setConnectionStatus(
    commercialId: CommercialId,
    connectionStatus: CommercialConnectionStatus,
  ): Promise<void> {
    const statusKey = this.statusKey(commercialId);
    const status = connectionStatus.value;

    await this.client
      .multi()
      .set(statusKey, status)
      .expire(statusKey, this.TTL_SECONDS)
      .exec();

    // Actualizar sets
    // Remover de todos los sets para estado limpio
    await this.client.sRem(this.SET_ONLINE, commercialId.value);
    await this.client.sRem(this.SET_AVAILABLE, commercialId.value);
    await this.client.sRem(this.SET_BUSY, commercialId.value);

    if (connectionStatus.isOnline()) {
      await this.client.sAdd(this.SET_ONLINE, commercialId.value);
      await this.client.sAdd(this.SET_AVAILABLE, commercialId.value);
    } else if (connectionStatus.isBusy()) {
      await this.client.sAdd(this.SET_ONLINE, commercialId.value);
      await this.client.sAdd(this.SET_BUSY, commercialId.value);
    }
  }

  async getConnectionStatus(
    commercialId: CommercialId,
  ): Promise<CommercialConnectionStatus> {
    const raw = await this.client.get(this.statusKey(commercialId));
    if (!raw) return CommercialConnectionStatus.offline();

    if (raw === 'online') {
      return CommercialConnectionStatus.online();
    }
    if (raw === 'busy') {
      return CommercialConnectionStatus.busy();
    }
    return CommercialConnectionStatus.offline();
  }

  async updateLastActivity(
    commercialId: CommercialId,
    lastActivity: CommercialLastActivity,
  ): Promise<void> {
    const activityKey = this.activityKey(commercialId);
    const timestamp = lastActivity.value.getTime().toString();

    await this.client
      .multi()
      .set(activityKey, timestamp)
      .expire(activityKey, this.TTL_SECONDS)
      .exec();
  }

  async getLastActivity(
    commercialId: CommercialId,
  ): Promise<CommercialLastActivity> {
    const raw = await this.client.get(this.activityKey(commercialId));
    if (!raw) return CommercialLastActivity.now();

    const timestamp = parseInt(raw, 10);
    return new CommercialLastActivity(new Date(timestamp));
  }

  async removeConnection(commercialId: CommercialId): Promise<void> {
    await this.client.del(this.statusKey(commercialId));
    await this.client.del(this.activityKey(commercialId));
    await this.client.sRem(this.SET_ONLINE, commercialId.value);
    await this.client.sRem(this.SET_AVAILABLE, commercialId.value);
    await this.client.sRem(this.SET_BUSY, commercialId.value);
  }

  async isCommercialOnline(commercialId: CommercialId): Promise<boolean> {
    const status = await this.getConnectionStatus(commercialId);
    return status.isOnline() || status.isBusy();
  }

  async isCommercialActive(
    commercialId: CommercialId,
    timeoutMinutes: number = 5,
  ): Promise<boolean> {
    const lastActivity = await this.getLastActivity(commercialId);
    return !lastActivity.isExpired(timeoutMinutes);
  }

  async getOnlineCommercials(): Promise<CommercialId[]> {
    const members = await this.client.sMembers(this.SET_ONLINE);
    const validCommercials: CommercialId[] = [];

    // Validar que cada comercial en el set realmente tenga su key de status activa
    for (const id of members) {
      const statusKey = `${this.PREFIX_STATUS}${id}`;
      const exists = await this.client.exists(statusKey);

      if (exists) {
        validCommercials.push(new CommercialId(id));
      } else {
        // Key expiró, limpiar del set
        this.logger.warn(
          `Comercial ${id} encontrado en SET_ONLINE pero sin key de status. Limpiando...`,
        );
        await this.client.sRem(this.SET_ONLINE, id);
        await this.client.sRem(this.SET_AVAILABLE, id);
        await this.client.sRem(this.SET_BUSY, id);
      }
    }

    return validCommercials;
  }

  async getAvailableCommercials(): Promise<CommercialId[]> {
    const members = await this.client.sMembers(this.SET_AVAILABLE);
    const validCommercials: CommercialId[] = [];

    // Validar que cada comercial en el set realmente tenga su key de status activa
    // Esto limpia automáticamente comerciales cuyas keys expiraron por falta de heartbeat
    for (const id of members) {
      const statusKey = `${this.PREFIX_STATUS}${id}`;
      const exists = await this.client.exists(statusKey);

      if (exists) {
        validCommercials.push(new CommercialId(id));
      } else {
        // Key expiró, limpiar del set
        this.logger.warn(
          `Comercial ${id} encontrado en set pero sin key de status. Limpiando...`,
        );
        await this.client.sRem(this.SET_AVAILABLE, id);
        await this.client.sRem(this.SET_ONLINE, id);
        await this.client.sRem(this.SET_BUSY, id);
      }
    }

    return validCommercials;
  }

  async getBusyCommercials(): Promise<CommercialId[]> {
    const members = await this.client.sMembers(this.SET_BUSY);
    const validCommercials: CommercialId[] = [];

    // Validar que cada comercial en el set realmente tenga su key de status activa
    for (const id of members) {
      const statusKey = `${this.PREFIX_STATUS}${id}`;
      const exists = await this.client.exists(statusKey);

      if (exists) {
        validCommercials.push(new CommercialId(id));
      } else {
        // Key expiró, limpiar del set
        this.logger.warn(
          `Comercial ${id} encontrado en SET_BUSY pero sin key de status. Limpiando...`,
        );
        await this.client.sRem(this.SET_BUSY, id);
        await this.client.sRem(this.SET_ONLINE, id);
        await this.client.sRem(this.SET_AVAILABLE, id);
      }
    }

    return validCommercials;
  }

  async getActiveCommercials(
    timeoutMinutes: number = 5,
  ): Promise<CommercialId[]> {
    const onlineCommercials = await this.getOnlineCommercials();
    const activeCommercials: CommercialId[] = [];

    for (const commercialId of onlineCommercials) {
      if (await this.isCommercialActive(commercialId, timeoutMinutes)) {
        activeCommercials.push(commercialId);
      }
    }

    return activeCommercials;
  }
}

/**
 * Provider para inyección de dependencias
 */
export const COMMERCIAL_CONNECTION_SERVICE_PROVIDER = {
  provide: COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
  useClass: RedisCommercialConnectionDomainService,
};
