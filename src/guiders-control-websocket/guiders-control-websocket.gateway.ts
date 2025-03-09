// import {
//   ConnectedSocket,
//   OnGatewayConnection,
//   SubscribeMessage,
//   WebSocketGateway,
//   WebSocketServer,
// } from '@nestjs/websockets';
// import { OnEvent } from '@nestjs/event-emitter';
// import { Server, Socket } from 'socket.io';
// // Cambiar la ruta de importación de ClientsService a la ruta relativa correcta
// import { JwtService } from '@nestjs/jwt';
// import { InjectRepository } from '@nestjs/typeorm';
// import { DeviceFingerprintsEntity } from 'src/context/auth-visitor/infrastructure/visitor-account.entity';
// import { In, Repository } from 'typeorm';
// import { UserAuthEntity } from 'src/context/auth-user/infrastructure/user-account.entity';
// import { ApiKeyEntity } from 'src/context/api-key/infrastructure/api-key.entity';

// @WebSocketGateway({
//   namespace: '/guiders-control',
//   cors: { origin: 'http://localhost:4200' },
// })
// export class GuidersControlWebsocketGateway implements OnGatewayConnection {
//   @WebSocketServer()
//   private server: Server;
//   private userEntity: UserAuthEntity | null = null;
//   private devices: DeviceFingerprintsEntity[] = [];

//   constructor(
//     private readonly jwtService: JwtService,
//     @InjectRepository(DeviceFingerprintsEntity)
//     private readonly deviceFingerprintsRepository: Repository<DeviceFingerprintsEntity>,
//     @InjectRepository(UserAuthEntity)
//     private readonly userAuthRepository: Repository<UserAuthEntity>,
//   ) {}
//   async handleConnection(client: Socket): Promise<void> {
//     const token = client.handshake.auth?.token as string;
//     const user = this.jwtService.decode<{ sub: string }>(token);
//     if (!user) {
//       client.disconnect();
//     }
//     this.userEntity = await this.userAuthRepository.findOne({
//       where: { id: user.sub },
//     });

//     if (!this.userEntity) {
//       client.disconnect();
//     }

//     this.devices = await this.findDevicesByApiKeys(this.userEntity!.apiKeys);

//     client.emit(
//       'chatListUpdate',
//       this.devices.map((d) => {
//         return {
//           username: d.fingerprint,
//         };
//       }),
//     );
//   }

//   @OnEvent('device::connected')
//   async handleDeviceConnectedEvent(device: {
//     fingerprint: string;
//   }): Promise<void> {
//     console.log('device connected', device);
//     const devices = await this.findDevicesByApiKeys(this.userEntity!.apiKeys);
//     if (!devices) {
//       return;
//     }
//     this.server.emit('chatListUpdate', devices);
//   }

//   @OnEvent('device::disconnected')
//   async handleDeviceDisconnectedEvent(device: {
//     fingerprint: string;
//   }): Promise<void> {
//     console.log('device disconnected', device);
//     const devices = await this.findDevicesByApiKeys(this.userEntity!.apiKeys);
//     if (!devices) {
//       return;
//     }
//     this.server.emit('chatListUpdate', devices);
//   }

//   // Permite al cliente solicitar la lista de clientes cuando inicia
//   @SubscribeMessage('getChatList')
//   async handleGetClients(@ConnectedSocket() client: Socket): Promise<void> {
//     const apiKeys = this.userEntity?.apiKeys;
//     if (!apiKeys) {
//       return;
//     }
//     const devices = await this.findDevicesByApiKeys(apiKeys);
//     client.emit(
//       'chatListUpdate',
//       devices.map((d) => {
//         return {
//           username: d.fingerprint,
//         };
//       }),
//     );
//   }

//   private async findDevicesByApiKeys(
//     apiKeys: ApiKeyEntity[],
//   ): Promise<DeviceFingerprintsEntity[]> {
//     return await this.deviceFingerprintsRepository.find({
//       where: {
//         apiKey: {
//           id: In(apiKeys.map((k) => k.id)),
//         },
//       },
//     });
//   }
// }
