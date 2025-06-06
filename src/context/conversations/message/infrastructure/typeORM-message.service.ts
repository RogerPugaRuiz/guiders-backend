import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Criteria } from 'src/context/shared/domain/criteria';
import { Optional } from 'src/context/shared/domain/optional';
import { Message } from '../domain/message';
import { MessageEntity } from './entities/message.entity';
import { MessageMapper } from './mappers/message.mapper';
import { IMessageRepository } from '../domain/message.repository';
import { err, okVoid, Result } from 'src/context/shared/domain/result';
import { SaveMessageError } from '../domain/errors';
import { CriteriaConverter } from 'src/context/shared/infrastructure/criteria-converter/criteria-converter';
import { CHAT_MESSAGE_ENCRYPTOR } from '../../chat/application/services/chat-message-encryptor';
import { ChatMessageEncryptorService } from '../../chat/infrastructure/chat-message-encryptor.service';

@Injectable()
export class TypeOrmMessageService implements IMessageRepository {
  private readonly logger = new Logger(TypeOrmMessageService.name);
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @Inject(CHAT_MESSAGE_ENCRYPTOR)
    private readonly chatMessageEncryptor: ChatMessageEncryptorService,
  ) {}
  async findOne(
    criteria: Criteria<Message>,
  ): Promise<Optional<{ message: Message }>> {
    // Utiliza CriteriaConverter para construir la consulta
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'message',
    );
    const entity = await this.messageRepository
      .createQueryBuilder('message')
      .where(sql.replace(/^WHERE /, '')) // Elimina el WHERE inicial porque TypeORM lo agrega
      .setParameters(parameters)
      .getOne();

    return entity
      ? Optional.of({
          message: await MessageMapper.toDomain(
            entity,
            this.chatMessageEncryptor,
          ),
        })
      : Optional.empty();
  }

  async save(message: Message): Promise<Result<void, SaveMessageError>> {
    const entity = await MessageMapper.toEntity(
      message,
      this.chatMessageEncryptor,
    );
    try {
      await this.messageRepository.save(entity);
    } catch (error) {
      return err(new SaveMessageError(`Error saving message: ${error}`));
    }
    return okVoid();
  }

  async find(criteria: Criteria<Message>): Promise<{ messages: Message[] }> {
    // Utiliza CriteriaConverter para construir la consulta
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'message',
    );

    this.logger.debug(`SQL: ${sql}`);
    this.logger.debug(`Parameters: ${JSON.stringify(parameters)}`);
    const entities = await this.messageRepository
      .createQueryBuilder('message')
      .where(sql.replace(/^WHERE /, ''))
      .setParameters(parameters)
      .getMany();
    return {
      messages: await Promise.all(
        entities.map((entity: MessageEntity) =>
          MessageMapper.toDomain(entity, this.chatMessageEncryptor),
        ),
      ),
    };
  }
}
