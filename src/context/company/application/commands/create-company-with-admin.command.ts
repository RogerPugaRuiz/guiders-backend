// Comando para crear una compañía junto con su usuario administrador (superadmin) sin password
// Ubicación: src/context/company/application/commands/create-company-with-admin.command.ts
import { ICommand } from '@nestjs/cqrs';

// DTO para agrupar los datos necesarios para crear la compañía y el admin
export interface CreateCompanyWithAdminProps {
  companyName: string;
  domain: string;
  adminName: string;
  adminEmail: string;
  adminTel?: string;
}

// Comando principal
export class CreateCompanyWithAdminCommand implements ICommand {
  // Recibe un solo objeto con todas las propiedades
  constructor(public readonly props: CreateCompanyWithAdminProps) {}
}
