import { RedisVisitorConnectionDomainService } from '../redis-visitor-connection.domain-service';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import {
  VisitorConnectionVO,
  ConnectionStatus,
} from '../../../domain/value-objects/visitor-connection';

// Test de integración simple (requiere Redis en marcha: docker-compose levanta redis)
// Si REDIS_URL no está, usará localhost:6379

describe('RedisVisitorConnectionDomainService (integration)', () => {
  let service: RedisVisitorConnectionDomainService;
  const vid = new VisitorId('00000000-0000-4000-8000-000000000001');

  beforeAll(async () => {
    service = new RedisVisitorConnectionDomainService();
    await service.onModuleInit();
    await service.removeConnection(vid); // limpiar
  });

  afterAll(async () => {
    await service.removeConnection(vid);
    await service.onModuleDestroy();
  });

  it('set ONLINE y listar online', async () => {
    await service.setConnectionStatus(
      vid,
      new VisitorConnectionVO(ConnectionStatus.ONLINE),
    );
    const status = await service.getConnectionStatus(vid);
    expect(status.isOnline()).toBe(true);
    const online = await service.getOnlineVisitors();
    expect(online.map((i) => i.getValue())).toContain(vid.getValue());
  });

  it('transición a CHATTING aparece en ambos sets', async () => {
    await service.setConnectionStatus(
      vid,
      new VisitorConnectionVO(ConnectionStatus.CHATTING),
    );
    const status = await service.getConnectionStatus(vid);
    expect(status.isChatting()).toBe(true);
    const online = await service.getOnlineVisitors();
    const chatting = await service.getChattingVisitors();
    expect(online.map((i) => i.getValue())).toContain(vid.getValue());
    expect(chatting.map((i) => i.getValue())).toContain(vid.getValue());
  });

  it('removeConnection -> OFFLINE y no en sets', async () => {
    await service.removeConnection(vid);
    const status = await service.getConnectionStatus(vid);
    expect(status.isOffline()).toBe(true);
    const online = await service.getOnlineVisitors();
    const chatting = await service.getChattingVisitors();
    expect(online.map((i) => i.getValue())).not.toContain(vid.getValue());
    expect(chatting.map((i) => i.getValue())).not.toContain(vid.getValue());
  });
});
