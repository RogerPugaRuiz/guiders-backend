import { Inject, Injectable } from '@nestjs/common';
import {
  CONNECTION_REPOSITORY,
  ConnectionRepository,
} from '../../domain/connection.repository';
import { Criteria, Operator } from 'src/context/shared/domain/criteria';
import { ConnectionUser } from '../../domain/connection-user';

export interface GetSocketByUserUseCaseRequest {
  userId: string;
}

export interface GetSocketByUserUseCaseResponse {
  socketId: string | null;
}

@Injectable()
export class GetSocketByUserUseCase {
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly repository: ConnectionRepository,
  ) {}

  async execute(
    request: GetSocketByUserUseCaseRequest,
  ): Promise<GetSocketByUserUseCaseResponse> {
    const { userId } = request;
    const criteria = new Criteria<ConnectionUser>().addFilter(
      'userId',
      Operator.EQUALS,
      userId,
    );
    const connection = await this.repository.findOne(criteria);
    return connection.fold(
      () => ({ socketId: null }),
      (connection) => ({
        socketId: connection.socketId.map((id) => id.value).getOrNull(),
      }),
    );
  }
}
