export class Participant {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly isCommercial: boolean,
    readonly isVisitor: boolean,
    readonly isOnline: boolean = false,
    readonly assignedAt: Date = new Date(),
    readonly lastSeenAt: Date | null = null,
  ) {
    if (!id) {
      throw new Error('Participant id is required');
    }
    if (!name) {
      throw new Error('Participant name is required');
    }
    if (isCommercial && isVisitor) {
      throw new Error('Participant cannot be both commercial and visitor');
    }
  }

  static create(params: {
    id: string;
    name: string;
    isCommercial: boolean;
    isVisitor: boolean;
    isOnline?: boolean;
    assignedAt?: Date;
    lastSeenAt?: Date | null;
  }): Participant {
    return new Participant(
      params.id,
      params.name,
      params.isCommercial,
      params.isVisitor,
      params.isOnline ?? true,
      params.assignedAt ?? new Date(),
      params.lastSeenAt ?? null,
    );
  }

  public setLastSeenAt(lastSeenAt: Date): Participant {
    return new Participant(
      this.id,
      this.name,
      this.isCommercial,
      this.isVisitor,
      this.isOnline,
      this.assignedAt,
      lastSeenAt,
    );
  }

  public updateOnlineStatus(isOnline: boolean): Participant {
    return new Participant(
      this.id,
      this.name,
      this.isCommercial,
      this.isVisitor,
      isOnline,
      this.assignedAt,
      this.lastSeenAt,
    );
  }
}
