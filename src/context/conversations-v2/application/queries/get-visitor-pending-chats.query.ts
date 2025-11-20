/**
 * Query para obtener chats pendientes de un visitante específico
 */
export class GetVisitorPendingChatsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly visitorId: string,
    public readonly chatIds?: string[],
  ) {}
}
