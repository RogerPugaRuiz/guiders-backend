import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'crm_sync_records',
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class CrmSyncRecordSchema {
  @Prop({ type: String, required: true, unique: true, index: true })
  id: string;

  @Prop({ type: String, required: true, index: true })
  visitorId: string;

  @Prop({ type: String, required: true, index: true })
  companyId: string;

  @Prop({
    type: String,
    required: true,
    enum: ['leadcars', 'hubspot', 'salesforce'],
    index: true,
  })
  crmType: string;

  @Prop({ type: String, required: false, index: true, sparse: true })
  externalLeadId?: string;

  @Prop({
    type: String,
    required: true,
    enum: ['pending', 'synced', 'failed', 'partial'],
    default: 'pending',
    index: true,
  })
  status: string;

  @Prop({ type: Date, required: false })
  lastSyncAt?: Date;

  @Prop({ type: String, required: false })
  lastError?: string;

  @Prop({ type: Number, required: true, default: 0 })
  retryCount: number;

  @Prop({ type: [String], required: true, default: [] })
  chatsSynced: string[];

  @Prop({ type: Object, required: false, default: {} })
  metadata?: Record<string, unknown>;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  updatedAt: Date;
}

export type CrmSyncRecordDocument = HydratedDocument<CrmSyncRecordSchema>;
export const CrmSyncRecordSchemaDefinition =
  SchemaFactory.createForClass(CrmSyncRecordSchema);

// Índice compuesto único para visitor + company + crm
CrmSyncRecordSchemaDefinition.index(
  { visitorId: 1, companyId: 1, crmType: 1 },
  { unique: true },
);

// Índice para búsqueda por estado y empresa
CrmSyncRecordSchemaDefinition.index({ companyId: 1, status: 1, crmType: 1 });

// Índice para búsqueda por ID externo
CrmSyncRecordSchemaDefinition.index(
  { externalLeadId: 1, companyId: 1, crmType: 1 },
  { sparse: true },
);

// Índice para reintentos (registros fallidos con pocos reintentos)
CrmSyncRecordSchemaDefinition.index(
  { status: 1, retryCount: 1, companyId: 1 },
  { partialFilterExpression: { status: 'failed' } },
);
