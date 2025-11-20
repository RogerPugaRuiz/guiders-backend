/**
 * Command para registrar un nuevo consentimiento
 * Se ejecuta cuando un visitante acepta una política
 */
export class RecordConsentCommand {
  constructor(
    public readonly visitorId: string,
    public readonly consentType: string,
    public readonly version: string,
    public readonly ipAddress: string,
    public readonly userAgent?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}
