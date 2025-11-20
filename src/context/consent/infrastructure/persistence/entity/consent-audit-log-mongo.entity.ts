import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Entidad MongoDB para audit logs de consentimientos
 * Diseñada para inmutabilidad y trazabilidad GDPR
 */
@Schema({
  collection: 'consent_audit_logs',
  timestamps: false, // Usamos nuestro propio timestamp
  versionKey: false,
})
export class ConsentAuditLogMongoEntity extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string;

  @Prop({ required: true, index: true })
  consentId: string;

  @Prop({ required: true, index: true })
  visitorId: string;

  @Prop({ required: true, index: true })
  actionType: string;

  @Prop({ required: true, index: true })
  consentType: string;

  @Prop({ required: false })
  consentVersion?: string;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ required: false })
  reason?: string;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, unknown>;

  @Prop({ required: true, index: true })
  timestamp: Date;
}

export const ConsentAuditLogMongoEntitySchema = SchemaFactory.createForClass(
  ConsentAuditLogMongoEntity,
);

// Índices compuestos para consultas de auditoría comunes
ConsentAuditLogMongoEntitySchema.index({ visitorId: 1, timestamp: -1 });
ConsentAuditLogMongoEntitySchema.index({ consentId: 1, timestamp: -1 });
ConsentAuditLogMongoEntitySchema.index({ timestamp: -1 });
ConsentAuditLogMongoEntitySchema.index({ actionType: 1, timestamp: -1 });

// Los audit logs son inmutables - no permitir actualizaciones
ConsentAuditLogMongoEntitySchema.pre('findOneAndUpdate', function (next) {
  const error = new Error(
    'Los audit logs son inmutables y no pueden ser modificados',
  );
  next(error);
});

ConsentAuditLogMongoEntitySchema.pre('updateOne', function (next) {
  const error = new Error(
    'Los audit logs son inmutables y no pueden ser modificados',
  );
  next(error);
});

ConsentAuditLogMongoEntitySchema.pre('updateMany', function (next) {
  const error = new Error(
    'Los audit logs son inmutables y no pueden ser modificados',
  );
  next(error);
});
