// import { Test, TestingModule } from '@nestjs/testing';
// import { GuidersControlWebsocketGateway } from './guiders-control-websocket.gateway';
// import { Server } from 'socket.io';
// import { ClientsService } from '../guiders-client-websocket/client.service';

// describe('GuidersControlWebsocketGateway', () => {
//   let gateway: GuidersControlWebsocketGateway;
//   let clientsServiceMock: Partial<ClientsService>;

//   beforeEach(async () => {
//     clientsServiceMock = {
//       getClients: jest.fn().mockReturnValue(new Map()),
//     };

//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         GuidersControlWebsocketGateway,
//         { provide: ClientsService, useValue: clientsServiceMock },
//       ],
//     }).compile();

//     gateway = module.get<GuidersControlWebsocketGateway>(
//       GuidersControlWebsocketGateway,
//     );
//   });

//   it('should be defined', () => {
//     expect(gateway).toBeDefined();
//   });

//   // Se prueba que handleMessage retorne "Hello world!"
//   it('should return "Hello world!" when handleMessage is called', () => {
//     const result = gateway.handleMessage({}, {});
//     expect(result).toBe('Hello world!');
//   });

//   // Se prueba que handleClientsUpdate emita el evento "clientsUpdate" con la carga adecuada.
//   it('should emit "clientsUpdate" event when handleClientsUpdate is called', () => {
//     const mockEmit = jest.fn();
//     // Se asigna un servidor simulado.
//     gateway['server'] = { emit: mockEmit } as unknown as Server;
//     const dummyClients = [
//       { id: '1', userAgent: 'test-agent' },
//       { id: '2', userAgent: 'test-agent' },
//     ];
//     gateway.handleClientsUpdate(dummyClients);
//     expect(mockEmit).toHaveBeenCalledWith('clientsUpdate', dummyClients);
//   });
// });
