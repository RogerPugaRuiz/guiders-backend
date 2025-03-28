import { IEvent } from '@nestjs/cqrs';

export class RealTimeMessageSendEvent implements IEvent {
  constructor(
    readonly from: string,
    readonly to: string,
    readonly message: string,
    readonly timestamp: Date,
  ) {}

  public static create(params: {
    from: string;
    to: string;
    message: string;
    timestamp: Date;
  }): RealTimeMessageSendEvent {
    return new RealTimeMessageSendEvent(
      params.from,
      params.to,
      params.message,
      params.timestamp,
    );
  }
}
