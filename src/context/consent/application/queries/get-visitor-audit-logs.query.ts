/**
 * Query para obtener todos los audit logs de un visitante
 */
export class GetVisitorAuditLogsQuery {
  constructor(public readonly visitorId: string) {}
}
