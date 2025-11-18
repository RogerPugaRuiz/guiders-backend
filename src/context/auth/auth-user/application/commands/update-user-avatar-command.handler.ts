import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { UpdateUserAvatarCommand } from './update-user-avatar.command';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from '../../domain/user-account.repository';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { S3UploadService } from 'src/context/shared/infrastructure/services/s3-upload.service';

export class UserNotFoundError extends DomainError {
  constructor(userId: string) {
    super(`Usuario con ID ${userId} no encontrado`);
  }
}

export class UnauthorizedAvatarUpdateError extends DomainError {
  constructor(requesterId: string, userId: string) {
    super(
      `Usuario ${requesterId} no tiene permisos para actualizar el avatar de ${userId}`,
    );
  }
}

export class AvatarUploadError extends DomainError {
  constructor(reason: string) {
    super(`Error al subir el avatar: ${reason}`);
  }
}

@CommandHandler(UpdateUserAvatarCommand)
export class UpdateUserAvatarCommandHandler
  implements ICommandHandler<UpdateUserAvatarCommand>
{
  private readonly logger = new Logger(UpdateUserAvatarCommandHandler.name);

  constructor(
    @Inject(USER_ACCOUNT_REPOSITORY)
    private readonly userRepository: UserAccountRepository,
    private readonly s3UploadService: S3UploadService,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: UpdateUserAvatarCommand,
  ): Promise<Result<string, DomainError>> {
    try {
      // 1. Buscar el usuario objetivo
      const user = await this.userRepository.findById(command.userId);
      if (!user) {
        return err(new UserNotFoundError(command.userId));
      }

      // 2. Buscar el usuario que hace la solicitud (para validar permisos)
      const requester = await this.userRepository.findById(command.requesterId);
      if (!requester) {
        return err(new UserNotFoundError(command.requesterId));
      }

      // 3. Validar permisos: mismo usuario o admin
      const isOwnAvatar = command.userId === command.requesterId;
      const isAdmin = requester.roles.toPrimitives().includes('admin');

      if (!isOwnAvatar && !isAdmin) {
        return err(
          new UnauthorizedAvatarUpdateError(
            command.requesterId,
            command.userId,
          ),
        );
      }

      // 4. Eliminar avatar anterior de S3 si existe
      const previousAvatarUrl = user.avatarUrl;
      if (previousAvatarUrl.isPresent()) {
        try {
          await this.s3UploadService.deleteAvatar(previousAvatarUrl.get());
          this.logger.log(
            `Avatar anterior eliminado: ${previousAvatarUrl.get()}`,
          );
        } catch (error) {
          this.logger.warn(
            `Error al eliminar avatar anterior (se continuará con la subida): ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // 5. Subir nuevo avatar a S3
      let newAvatarUrl: string;
      try {
        newAvatarUrl = await this.s3UploadService.uploadAvatar(
          command.file,
          command.userId,
        );
        this.logger.log(`Avatar subido exitosamente: ${newAvatarUrl}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return err(new AvatarUploadError(errorMessage));
      }

      // 6. Actualizar el usuario con el nuevo avatar
      const updatedUser = user.updateAvatar(newAvatarUrl);

      // 7. Usar EventPublisher para eventos de dominio
      const userCtx = this.publisher.mergeObjectContext(updatedUser);
      await this.userRepository.save(userCtx);
      userCtx.commit();

      this.logger.log(
        `Avatar actualizado exitosamente para usuario ${command.userId}`,
      );

      return ok(newAvatarUrl);
    } catch (error) {
      this.logger.error(
        `Error actualizando avatar: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
