// Evento de dominio que indica que se ha actualizado el teléfono de un visitante
export class VisitorTelUpdatedEvent {
  constructor(
    public readonly payload: {
      visitorId: string;
      tel: string;
    },
  ) {}
}
