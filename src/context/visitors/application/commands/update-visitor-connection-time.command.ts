export class UpdateVisitorConnectionTimeCommand {
  constructor(
    public readonly visitorId: string,
    public readonly connectionTime: number,
  ) {}
}
