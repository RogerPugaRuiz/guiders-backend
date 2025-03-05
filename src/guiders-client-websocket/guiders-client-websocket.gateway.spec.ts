import { Test, TestingModule } from '@nestjs/testing';
import { GuidersClientWebsocketGateway } from './guiders-client-websocket.gateway';
import { ClientsService } from '../shared/service/client.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Mock para ClientsService
const clientsServiceMock = {
  addClient: jest.fn(),
  removeClient: jest.fn(),
  getClients: jest.fn().mockReturnValue([]),
};

const eventEmitterMock = {
  emit: jest.fn(),
};

describe('GuidersClientWebsocketGateway', () => {
  let gateway: GuidersClientWebsocketGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuidersClientWebsocketGateway,
        { provide: ClientsService, useValue: clientsServiceMock }, // Asegúrate de usar el servicio correcto
        { provide: EventEmitter2, useValue: eventEmitterMock },
      ],
    }).compile();

    gateway = module.get<GuidersClientWebsocketGateway>(
      GuidersClientWebsocketGateway,
    );
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
