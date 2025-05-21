// DTO para exponer la intención detectada
export class VisitorIntentDto {
  id!: string;
  visitorId!: string;
  type!: string;
  confidence!: string;
  detectedAt!: string;
}
