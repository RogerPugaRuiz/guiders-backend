import { VisitorConnectionAvailable } from './visitor-connection-available';
import { VisitorConnectionId } from './visitor-connection-id';

export class VisitorConnection {
  private constructor(
    private readonly id: VisitorConnectionId,
    private readonly available: VisitorConnectionAvailable,
  ) {}

  public static create(params: {
    id: VisitorConnectionId;
    available: VisitorConnectionAvailable;
  }): VisitorConnection {
    return new VisitorConnection(params.id, params.available);
  }

  public static fromPrimitives(params: {
    id: string;
    available: boolean;
  }): VisitorConnection {
    return new VisitorConnection(
      VisitorConnectionId.create(params.id),
      VisitorConnectionAvailable.create(params.available),
    );
  }

  public getId(): VisitorConnectionId {
    return this.id;
  }

  public getAvailable(): VisitorConnectionAvailable {
    return this.available;
  }

  public toPrimitives() {
    return {
      id: this.id.getValue(),
      available: this.available.getValue(),
    };
  }
}
