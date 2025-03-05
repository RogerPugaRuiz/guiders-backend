import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyEntity } from '../api-key-auth/api-key.entity';
import { ApiKeyAuthJwtPayload } from 'src/api-key-auth/api-key-auth.service';
import { EncryptionService } from 'src/shared/service/encryption.service';
import { DeviceFingerprintsEntity } from 'src/device/device-fingerprints.entity';

@WebSocketGateway({
  namespace: '/guiders-client',
  cors: { origin: '*' },
})
export class GuidersClientWebsocketGateway {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly jwtService: JwtService,
    private readonly encryptionService: EncryptionService,
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepository: Repository<ApiKeyEntity>,
    @InjectRepository(DeviceFingerprintsEntity)
    private readonly deviceFingerprintsRepository: Repository<DeviceFingerprintsEntity>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // 1️⃣ Obtener el token desde handshake.auth
      const token = client.handshake.auth?.token as string;
      if (!token) throw new Error('Token no proporcionado');

      // 2️⃣ Decodificar el token para obtener el clientId
      const decoded = this.jwtService.decode<ApiKeyAuthJwtPayload>(token);
      if (!decoded || !decoded.clientId || decoded.token_type !== 'access')
        throw new Error('Token inválido');
      const clientId = decoded.clientId;

      // 3️⃣ Buscar en la DB la API Key correspondiente al clientId
      const apiKeyEntity = await this.apiKeyRepository.findOne({
        where: { clientId },
      });
      if (!apiKeyEntity) throw new Error('API Key no encontrada');

      // 4️⃣ Usar la clave privada almacenada en la DB para verificar el token.
      // Si la clave está cifrada, se debe implementar la lógica de descifrado.
      const privateKey = this.encryptionService.decrypt(
        apiKeyEntity.privateKey,
      );

      // 5️⃣ Verificar que el token sea válido
      this.jwtService.verify(token, { secret: privateKey });
    } catch (error: any) {
      console.error(`❌ Error de autenticación: ${error}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {}

  @SubscribeMessage('registerBrowser')
  async handleRegisterBrowser(
    client: Socket,
    payload: {
      userAgent: string;
      fingerprint: string;
    },
  ): Promise<void> {
    const token = client.handshake.auth?.token as string;
    const decoded = this.jwtService.decode<ApiKeyAuthJwtPayload>(token);
    const clientId = decoded.clientId;
    const socketId = client.id;
    const userAgent = payload.userAgent;
    const fingerprint = payload.fingerprint;
    const apiKey = await this.apiKeyRepository.findOne({ where: { clientId } });
    if (!apiKey) {
      throw new Error('API Key no encontrada');
    }
    // comprobar que no exista un dispositivo con el mismo fingerprint
    const existingDevice = await this.deviceFingerprintsRepository.findOne({
      where: { fingerprint },
    });
    if (existingDevice) {
      console.error('❌ Dispositivo ya registrado');
      // client.disconnect();
      return;
    }
    try {
      const newDevice = this.deviceFingerprintsRepository.create({
        userAgent,
        fingerprint,
        socketId,
        apiKey,
      });
      await this.deviceFingerprintsRepository.save(newDevice);
    } catch (error) {
      console.error(`❌ Error al registrar el dispositivo: ${error}`);
      // client.disconnect();
    }
    this.emitBrowsers();
  }

  private emitBrowsers(): void {
    // this.eventEmitter.emit('clients::update', browsersList);
  }
}
