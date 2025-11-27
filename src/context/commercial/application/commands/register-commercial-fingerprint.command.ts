import { ICommand } from '@nestjs/cqrs';

/**
 * Comando para registrar un fingerprint de navegador a un comercial
 * Permite identificar al comercial cuando visita sitios con el SDK instalado
 */
export class RegisterCommercialFingerprintCommand implements ICommand {
  constructor(
    public readonly commercialId: string,
    public readonly fingerprint: string,
  ) {}
}
