export class ChatCommercialsUnassignedEvent {
  constructor(
    readonly chatId: string,
    readonly commercialIds: string[],
  ) {}
}
