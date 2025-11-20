import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'visitor_consents' })
export class VisitorConsentMongoEntity extends Document {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true, index: true })
  visitorId: string;

  @Prop({
    required: true,
    enum: ['privacy_policy', 'marketing', 'analytics'],
    index: true,
  })
  consentType: string;

  @Prop({
    required: true,
    enum: ['granted', 'revoked', 'expired'],
    index: true,
  })
  status: string;

  @Prop({ required: true })
  version: string;

  @Prop({ required: true })
  grantedAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ type: String, default: null })
  userAgent: string | null;

  @Prop({ type: Object, default: null })
  metadata: Record<string, unknown> | null;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const VisitorConsentMongoEntitySchema = SchemaFactory.createForClass(
  VisitorConsentMongoEntity,
);

// Índices compuestos para consultas optimizadas
VisitorConsentMongoEntitySchema.index({ visitorId: 1, consentType: 1 });
VisitorConsentMongoEntitySchema.index({ visitorId: 1, status: 1 });
VisitorConsentMongoEntitySchema.index({ visitorId: 1, createdAt: -1 });
VisitorConsentMongoEntitySchema.index({ expiresAt: 1 }, { sparse: true }); // Para limpieza automática
