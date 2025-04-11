export class ChatCommercialsAssignedEvent {
  constructor(
    readonly chatId: string,
    readonly commercialIds: string[],
  ) {}
}
