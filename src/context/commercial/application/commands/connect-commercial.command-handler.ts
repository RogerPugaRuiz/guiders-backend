import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { ConnectCommercialCommand } from './connect-commercial.command';
import {
  COMMERCIAL_CONNECTION_DOMAIN_SERVICE,
  CommercialConnectionDomainService,
} from '../../domain/commercial-connection.domain-service';
import {
  COMMERCIAL_REPOSITORY,
  CommercialRepository,
} from '../../domain/commercial.repository';
import { Commercial } from '../../domain/commercial.aggregate';
import { CommercialId } from '../../domain/value-objects/commercial-id';
import { CommercialName } from '../../domain/value-objects/commercial-name';
import { CommercialConnectionStatus } from '../../domain/value-objects/commercial-connection-status';
import { CommercialLastActivity } from '../../domain/value-objects/commercial-last-activity';
import {
  USER_ACCOUNT_REPOSITORY,
  UserAccountRepository,
} from 'src/context/auth/auth-user/domain/user-account.repository';
import { UserAccountKeycloakId } from 'src/context/auth/auth-user/domain/value-objects/user-account-keycloak-id';

/**
 * Handler para el comando ConnectCommercialCommand
 * Se encarga de conectar un comercial al sistema
 */
@CommandHandler(ConnectCommercialCommand)
export class ConnectCommercialCommandHandler
  implements ICommandHandler<ConnectCommercialCommand, void>
{
  private readonly logger = new Logger(ConnectCommercialCommandHandler.name);

  constructor(
    @Inject(COMMERCIAL_CONNECTION_DOMAIN_SERVICE)
    private readonly connectionService: CommercialConnectionDomainService,
    @Inject(COMMERCIAL_REPOSITORY)
    private readonly commercialRepository: CommercialRepository,
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userAccountRepository: UserAccountRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: ConnectCommercialCommand): Promise<void> {
    this.logger.log(
      `Conectando comercial: ${command.commercialId} (${command.name})`,
    );

    try {
      const commercialId = new CommercialId(command.commercialId);
      const onlineStatus = CommercialConnectionStatus.online();

      // Obtener datos reales de UserAccount (el commercialId es el keycloakId)
      let realName = command.name;
      let avatarUrl: string | null = null;

      try {
        const userAccount = await this.userAccountRepository.findByKeycloakId(
          UserAccountKeycloakId.create(command.commercialId),
        );
        if (userAccount) {
          const userPrimitives = userAccount.toPrimitives();
          realName = userPrimitives.name || command.name;
          avatarUrl = userPrimitives.avatarUrl ?? null;
          this.logger.debug(
            `Datos de UserAccount obtenidos: name="${realName}", avatarUrl=${avatarUrl ? 'presente' : 'null'}`,
          );
        }
      } catch {
        this.logger.debug(
          `No se pudo obtener UserAccount para ${command.commercialId}, usando datos del comando`,
        );
      }

      const commercialName = new CommercialName(realName);

      // Verificar si el comercial ya existe
      const existingCommercialResult =
        await this.commercialRepository.findById(commercialId);

      let commercial: Commercial;

      if (
        existingCommercialResult.isOk() &&
        existingCommercialResult.unwrap()
      ) {
        // Comercial existe, actualizar estado a online y sincronizar datos
        commercial = existingCommercialResult.unwrap()!;
        commercial = commercial.changeConnectionStatus(onlineStatus);

        // Sincronizar nombre y avatar desde UserAccount si no están actualizados
        const primitives = commercial.toPrimitives();
        if (primitives.name !== realName) {
          commercial = commercial.updateName(realName);
        }
        if (!primitives.avatarUrl && avatarUrl) {
          commercial = commercial.updateAvatar(avatarUrl);
        }
      } else {
        // Crear nuevo comercial con datos de UserAccount
        commercial = Commercial.create({
          id: commercialId,
          name: commercialName,
          connectionStatus: onlineStatus,
          avatarUrl: avatarUrl,
        });
      }

      // Actualizar estado en Redis
      await this.connectionService.setConnectionStatus(
        commercialId,
        onlineStatus,
      );
      await this.connectionService.updateLastActivity(
        commercialId,
        CommercialLastActivity.now(),
      );

      // Guardar en MongoDB y publicar eventos
      const aggCtx = this.publisher.mergeObjectContext(commercial);

      if (
        existingCommercialResult.isOk() &&
        existingCommercialResult.unwrap()
      ) {
        await this.commercialRepository.update(aggCtx);
      } else {
        await this.commercialRepository.save(aggCtx);
      }

      aggCtx.commit();

      this.logger.log(
        `Comercial conectado exitosamente: ${command.commercialId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al conectar comercial ${command.commercialId}:`,
        error,
      );
      throw error;
    }
  }
}
