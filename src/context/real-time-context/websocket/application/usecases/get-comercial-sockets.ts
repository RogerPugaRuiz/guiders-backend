import { Inject, Injectable } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from '../../domain/connection-user';
import { ConnectionRoleEnum } from '../../domain/value-objects/connection-role';

export interface GetCommercialSocketsUseCaseResponse {
  sockets: string[];
}

@Injectable()
export class GetCommercialSocketUseCase {
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly repository: ConnectionRepository,
  ) {}

  async execute() {
    const criteria = new Criteria<ConnectionUser>().addFilter(
      'roles',
      Operator.EQUALS,
      ConnectionRoleEnum.COMMERCIAL,
    );

    const connections = await this.repository.find(criteria);
    return {
      sockets: connections
        .filter((connection) => connection.socketId.isPresent())
        .map((connection) => connection.socketId.get().value),
    };
  }
}
