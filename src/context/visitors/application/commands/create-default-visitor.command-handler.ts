import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { CreateDefaultVisitorCommand } from './create-default-visitor.command';
import {
  IVisitorRepository,
  VISITOR_REPOSITORY,
} from '../../domain/visitor.repository';
import { Visitor } from '../../domain/visitor.aggregate';
import { VisitorId } from '../../domain/value-objects/visitor-id';
import { VisitorName } from '../../domain/value-objects/visitor-name';
import { Result } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { ok, err } from 'src/context/shared/domain/result';
import {
  AliasGeneratorService,
  ALIAS_GENERATOR_SERVICE,
} from '../services/alias-generator.service';

/**
 * Clase de error para el contexto de creación de visitante por defecto
 */
class DefaultVisitorCreationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'DEFAULT_VISITOR_CREATION_ERROR';
  }
}

/**
 * Manejador del comando para crear un visitante por defecto
 */
@CommandHandler(CreateDefaultVisitorCommand)
export class CreateDefaultVisitorCommandHandler
  implements ICommandHandler<CreateDefaultVisitorCommand>
{
  private readonly logger = new Logger(CreateDefaultVisitorCommandHandler.name);

  constructor(
    @Inject(VISITOR_REPOSITORY)
    private readonly visitorRepository: IVisitorRepository,
    @Inject(ALIAS_GENERATOR_SERVICE)
    private readonly aliasGenerator: AliasGeneratorService,
    private readonly publisher: EventPublisher,
  ) {}

  /**
   * Ejecuta la creación de un visitante por defecto
   * @param command Comando con el ID de la cuenta de visitante
   */
  async execute(
    command: CreateDefaultVisitorCommand,
  ): Promise<Result<void, DomainError>> {
    this.logger.log(
      `Creando visitante por defecto para la cuenta ${command.visitorAccountId}`,
    );

    try {
      // Creamos el ID del visitante usando el UUID recibido para mantener la relación
      const visitorId = new VisitorId(command.visitorAccountId);

      // Generamos un alias automático para el visitante
      const generatedAlias = this.aliasGenerator.generate();
      const visitorName = VisitorName.create(generatedAlias);

      // Creamos un visitante con valores por defecto incluyendo el alias generado
      let defaultVisitor = Visitor.create({
        id: visitorId,
        name: visitorName,
      });

      // Registramos el agregado en el EventPublisher para poder publicar sus eventos
      defaultVisitor = this.publisher.mergeObjectContext(defaultVisitor);

      // Guardamos el visitante en el repositorio
      const result = await this.visitorRepository.save(defaultVisitor);

      if (result.isErr()) {
        this.logger.error(
          `Error al guardar el visitante por defecto: ${result.error.message}`,
        );
        return err(result.error);
      }

      // Publicamos los eventos del agregado al event bus
      defaultVisitor.commit();

      this.logger.log(
        `Visitante por defecto creado correctamente con ID: ${visitorId.value} y alias: ${generatedAlias}`,
      );
      return ok(undefined);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al crear visitante por defecto: ${errorMessage}`,
      );
      return err(new DefaultVisitorCreationError(errorMessage));
    }
  }
}
