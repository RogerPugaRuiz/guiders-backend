import { AggregateRoot } from '@nestjs/cqrs';

export class Device extends AggregateRoot {
  constructor(
    private readonly id: string,
    private readonly clientId: string,
    private readonly socketId: string,
    private readonly userAgent: string,
    private readonly fingerprint: string,
    private readonly createdAt: Date,
  ) {
    super();
  }
}
