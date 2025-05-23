// Evento de dominio que indica que se ha actualizado el email de un visitante
export class VisitorEmailUpdatedEvent {
  constructor(
    public readonly payload: {
      visitorId: string;
      email: string;
    },
  ) {}
}
