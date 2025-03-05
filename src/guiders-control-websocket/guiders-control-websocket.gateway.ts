import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Client } from 'src/shared/types/client-type';
import { Server, Socket } from 'socket.io';
// Cambiar la ruta de importación de ClientsService a la ruta relativa correcta
import { ClientsService } from '../shared/service/client.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/guiders-control',
  cors: { origin: 'http://localhost:4200' },
})
export class GuidersControlWebsocketGateway {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly clientsService: ClientsService,
    private readonly jwtService: JwtService,
  ) {}

  @SubscribeMessage('message')
  handleConnection(client: Socket) {}

  @OnEvent('clients::update')
  handleClientsUpdate(payload: Client[]) {
    this.server.emit('clientsUpdate', Array.from(payload));
  }

  // Permite al cliente solicitar la lista de clientes cuando inicia
  @SubscribeMessage('getClients')
  handleGetClients(client: Socket): void {
    const clientsArray = Array.from(this.clientsService.getClients());

    client.emit('clientsUpdate', clientsArray);
  }
}
