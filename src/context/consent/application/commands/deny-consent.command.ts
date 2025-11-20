/**
 * Command para registrar un rechazo de consentimiento
 * RGPD Art. 5.2: Responsabilidad proactiva - demostrar cumplimiento
 * RGPD Art. 4.11: El rechazo debe ser tan fácil como la aceptación
 */
export class DenyConsentCommand {
  constructor(
    public readonly visitorId: string,
    public readonly consentType: string,
    public readonly ipAddress: string,
    public readonly userAgent?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}
