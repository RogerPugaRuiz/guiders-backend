import { Injectable } from '@nestjs/common';
import { MessageRepository } from '../domain/repository';
import { Criteria } from 'src/context/shared/domain/criteria';
import { Optional } from 'src/context/shared/domain/optional';
import { Message } from '../domain/message';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from './entities/message.entity';
import { Repository } from 'typeorm';
import { MessageMapper } from './mappers/message.mapper';

@Injectable()
export class TypeOrmMessageRepository implements MessageRepository {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly repository: Repository<MessageEntity>,
  ) {}

  async save(message: Message): Promise<void> {
    await this.repository.save(MessageMapper.toEntity(message));
  }

  find(criteria: Criteria<Message>): Promise<Message[]> {
    throw new Error('Method not implemented.');
  }

  findOne(criteria: Criteria<Message>): Promise<Optional<Message>> {
    throw new Error('Method not implemented.');
  }
}
