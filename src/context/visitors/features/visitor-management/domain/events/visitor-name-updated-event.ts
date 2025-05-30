// Evento de dominio que indica que se ha actualizado el nombre de un visitante
export class VisitorNameUpdatedEvent {
  constructor(
    public readonly payload: {
      visitorId: string;
      name: string;
    },
  ) {}
}
