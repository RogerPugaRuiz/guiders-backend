// Comando para actualizar la página actual del visitante
// Ubicación: src/context/visitors/application/command/update-visitor-current-page.command.ts

import { ICommand } from '@nestjs/cqrs';

// DTO para el comando
export class UpdateVisitorCurrentPageCommand implements ICommand {
  // id del visitante y la nueva página
  constructor(
    public readonly visitorId: string,
    public readonly currentPage: string,
  ) {}
}
