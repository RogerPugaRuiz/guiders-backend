import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface TestMessage {
  message: string;
  timestamp: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
})
export class WebSocketGatewayBasic
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;
  private logger = new Logger('WebSocketGateway');

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway inicializado');
    this.logger.log(
      `Configuración: path=/socket.io/, transports=[websocket, polling]`,
    );
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
    this.logger.log(`Transport usado: ${client.conn.transport.name}`);

    // Enviar mensaje de bienvenida
    client.emit('welcome', {
      message: 'Conectado exitosamente al servidor WebSocket',
      clientId: client.id,
      timestamp: Date.now(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('test')
  handleTest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TestMessage,
  ) {
    this.logger.log(
      `Mensaje de prueba recibido de ${client.id}: ${data.message}`,
    );

    // Enviar respuesta al cliente
    client.emit('test-response', {
      message: `Echo: ${data.message}`,
      timestamp: Date.now(),
      receivedAt: data.timestamp,
    });

    return {
      success: true,
      message: 'Mensaje de prueba procesado',
      data: data,
    };
  }

  @SubscribeMessage('health-check')
  handleHealthCheck(@ConnectedSocket() client: Socket) {
    this.logger.log(`Health check desde ${client.id}`);

    return {
      status: 'OK',
      timestamp: Date.now(),
      uptime: process.uptime(),
      message: 'WebSocket funcionando correctamente',
    };
  }

  // Método para enviar mensajes broadcast
  broadcast(event: string, data: any) {
    this.logger.log(`Broadcasting: ${event}`);
    this.server.emit(event, data);
  }
}
