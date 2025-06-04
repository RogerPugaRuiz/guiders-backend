/**
 * Evento de dominio que indica que se ha asignado un alias a un visitante
 */
export class VisitorAliasAssignedEvent {
  constructor(
    public readonly payload: {
      visitorId: string;
      alias: string;
    },
  ) {}
}
