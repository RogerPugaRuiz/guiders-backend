import { Injectable } from '@nestjs/common';
import { AuthVisitorRepository } from '../../domain/repositories/auth-visitor.repository';
import { VisitorAccount } from '../../domain/models/visitor-account.aggregate';
import { InjectRepository } from '@nestjs/typeorm';
import { VisitorAccountMapper } from '../mapper/visitor-account-mapper';
import { Repository } from 'typeorm';
import { VisitorAccountEntity } from '../visitor-account.entity';

@Injectable()
export class AuthVisitorOrmRepository implements AuthVisitorRepository {
  constructor(
    @InjectRepository(VisitorAccountEntity)
    private readonly repository: Repository<VisitorAccountEntity>,
    private readonly mapper: VisitorAccountMapper,
  ) {}

  async save(visitor: VisitorAccount): Promise<void> {
    const visitorEntity = this.mapper.toEntity(visitor);
    await this.repository.save(visitorEntity);
  }
  async findByApiKey(apiKey: string): Promise<VisitorAccount[]> {
    return await this.repository
      .find({
        where: {
          apiKey: {
            apiKey,
          },
        },
        relations: ['apiKey'],
      })
      .then((visitors) =>
        visitors.map((visitor) => this.mapper.toDomain(visitor)),
      );
    // return await this.repository
    //   .findOne({
    //     where: {
    //       apiKey: {
    //         apiKey,
    //       },
    //     },
    //     relations: ['apiKey'],
    //   })
    //   .then((visitor) => (visitor ? this.mapper.toDomain(visitor) : null));
  }

  async findByClientID(clientID: number): Promise<VisitorAccount | null> {
    return await this.repository
      .findOne({
        where: {
          clientID: clientID.toString(),
        },
        relations: ['apiKey'],
      })
      .then((visitor) => (visitor ? this.mapper.toDomain(visitor) : null));
  }
}
