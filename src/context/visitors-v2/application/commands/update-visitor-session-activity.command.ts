/**
 * Comando para actualizar la actividad de la sesión de un visitante
 * Se usa cuando el visitante muestra actividad real (focus, interacción)
 */
export class UpdateVisitorSessionActivityCommand {
  constructor(public readonly visitorId: string) {}
}
