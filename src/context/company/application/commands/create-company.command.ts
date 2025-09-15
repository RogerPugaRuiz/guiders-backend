// Comando para crear una compañía usando DDD + CQRS
// Recibe el DTO CreateCompanyDto y usa el repositorio para persistir la entidad
import { ICommand } from '@nestjs/cqrs';

// Interfaz para los primitivos de un sitio
export interface SitePrimitivesDto {
  id?: string; // Opcional, se generará si no se proporciona
  name: string;
  canonicalDomain: string;
  domainAliases: string[];
}

// Comando que encapsula la intención de crear una compañía
export class CreateCompanyCommand implements ICommand {
  // El DTO con los datos necesarios para crear la compañía
  constructor(
    public readonly params: {
      companyName: string;
      sites: SitePrimitivesDto[];
    },
  ) {}
}
