/**
 * Query para obtener la cola de chats pendientes
 */
export class GetPendingQueueQuery {
  constructor(
    public readonly department?: string,
    public readonly limit?: number,
  ) {}
}
