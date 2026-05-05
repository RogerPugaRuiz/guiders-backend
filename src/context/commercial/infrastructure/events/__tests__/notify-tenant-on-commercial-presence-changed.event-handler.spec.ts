import { NotifyTenantOnCommercialPresenceChangedEventHandler } from '../notify-tenant-on-commercial-presence-changed.event-handler';
import { PresenceChangedEvent } from '../../../../shared/domain/events/presence-changed.event';
import { CommercialConnectionDomainService } from '../../../domain/commercial-connection.domain-service';
import { WebSocketGatewayBasic } from 'src/websocket/websocket.gateway';
import { Uuid } from '../../../../shared/domain/value-objects/uuid';

describe('NotifyTenantOnCommercialPresenceChangedEventHandler', () => {
  let handler: NotifyTenantOnCommercialPresenceChangedEventHandler;
  let connectionService: jest.Mocked<CommercialConnectionDomainService>;
  let websocketGateway: jest.Mocked<Pick<WebSocketGatewayBasic, 'emitToRoom'>>;

  const commercialId = Uuid.random().value;
  const tenantId = Uuid.random().value;

  beforeEach(() => {
    connectionService = {
      getOnlineCountByTenant: jest.fn(),
      getAvailableCommercials: jest.fn(),
      getCompanyIdByCommercial: jest.fn(),
      setConnectionStatus: jest.fn(),
      getConnectionStatus: jest.fn(),
      updateLastActivity: jest.fn(),
      getLastActivity: jest.fn(),
      removeConnection: jest.fn(),
      isCommercialOnline: jest.fn(),
      isCommercialActive: jest.fn(),
      getOnlineCommercials: jest.fn(),
      getBusyCommercials: jest.fn(),
      getActiveCommercials: jest.fn(),
      setTyping: jest.fn(),
      isTyping: jest.fn(),
      clearTyping: jest.fn(),
      getTypingInChat: jest.fn(),
    } as jest.Mocked<CommercialConnectionDomainService>;

    websocketGateway = {
      emitToRoom: jest.fn(),
    } as jest.Mocked<Pick<WebSocketGatewayBasic, 'emitToRoom'>>;

    handler = new NotifyTenantOnCommercialPresenceChangedEventHandler(
      websocketGateway as unknown as WebSocketGatewayBasic,
      connectionService,
    );
  });

  describe('handle', () => {
    it('debe emitir commercial:availability-changed a la room del tenant cuando hay comerciales disponibles', async () => {
      connectionService.getOnlineCountByTenant.mockResolvedValue(2);
      const event = new PresenceChangedEvent(
        commercialId,
        'commercial',
        'offline',
        'online',
        tenantId,
      );

      await handler.handle(event);

      expect(connectionService.getOnlineCountByTenant).toHaveBeenCalledWith(
        tenantId,
      );
      expect(websocketGateway.emitToRoom).toHaveBeenCalledWith(
        `tenant:${tenantId}`,
        'commercial:availability-changed',
        expect.objectContaining({
          available: true,
          onlineCount: 2,
          tenantId,
        }),
      );
    });

    it('debe emitir available=false cuando onlineCount es 0', async () => {
      connectionService.getOnlineCountByTenant.mockResolvedValue(0);
      const event = new PresenceChangedEvent(
        commercialId,
        'commercial',
        'online',
        'offline',
        tenantId,
      );

      await handler.handle(event);

      expect(websocketGateway.emitToRoom).toHaveBeenCalledWith(
        `tenant:${tenantId}`,
        'commercial:availability-changed',
        expect.objectContaining({
          available: false,
          onlineCount: 0,
          tenantId,
        }),
      );
    });

    it('debe ignorar eventos de tipo visitor', async () => {
      const event = new PresenceChangedEvent(
        Uuid.random().value,
        'visitor',
        'offline',
        'online',
        tenantId,
      );

      await handler.handle(event);

      expect(connectionService.getOnlineCountByTenant).not.toHaveBeenCalled();
      expect(websocketGateway.emitToRoom).not.toHaveBeenCalled();
    });

    it('debe ignorar eventos de comercial sin tenantId', async () => {
      const event = new PresenceChangedEvent(
        commercialId,
        'commercial',
        'offline',
        'online',
        undefined, // sin tenantId
      );

      await handler.handle(event);

      expect(connectionService.getOnlineCountByTenant).not.toHaveBeenCalled();
      expect(websocketGateway.emitToRoom).not.toHaveBeenCalled();
    });

    it('debe no lanzar error si el connectionService falla', async () => {
      connectionService.getOnlineCountByTenant.mockRejectedValue(
        new Error('Redis error'),
      );
      const event = new PresenceChangedEvent(
        commercialId,
        'commercial',
        'offline',
        'online',
        tenantId,
      );

      // No debe lanzar
      await expect(handler.handle(event)).resolves.toBeUndefined();
      expect(websocketGateway.emitToRoom).not.toHaveBeenCalled();
    });
  });
});
