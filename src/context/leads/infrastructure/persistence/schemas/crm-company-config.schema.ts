import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Sub-schema para configuración específica de LeadCars
 */
@Schema({ _id: false })
export class LeadcarsConfigSchema {
  @Prop({ type: String, required: true })
  clienteToken: string;

  @Prop({ type: Boolean, required: true, default: false })
  useSandbox: boolean;

  @Prop({ type: Number, required: true })
  concesionarioId: number;

  @Prop({ type: Number, required: false })
  sedeId?: number;

  @Prop({ type: Number, required: false })
  campanaId?: number;

  @Prop({ type: String, required: true, default: 'COMPRA' })
  tipoLeadDefault: string;
}

export const LeadcarsConfigSchemaDefinition =
  SchemaFactory.createForClass(LeadcarsConfigSchema);

@Schema({
  collection: 'crm_company_configs',
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      // Ocultar token sensible en JSON
      if (ret.config?.clienteToken) {
        ret.config.clienteToken = '***HIDDEN***';
      }
      return ret;
    },
  },
})
export class CrmCompanyConfigSchema {
  @Prop({ type: String, required: true, unique: true, index: true })
  id: string;

  @Prop({ type: String, required: true, index: true })
  companyId: string;

  @Prop({
    type: String,
    required: true,
    enum: ['leadcars', 'hubspot', 'salesforce'],
    index: true,
  })
  crmType: string;

  @Prop({ type: Boolean, required: true, default: false, index: true })
  enabled: boolean;

  @Prop({ type: Boolean, required: true, default: true })
  syncChatConversations: boolean;

  @Prop({ type: [String], required: true, default: ['lifecycle_to_lead'] })
  triggerEvents: string[];

  @Prop({ type: Object, required: true })
  config: Record<string, unknown>;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  updatedAt: Date;
}

export type CrmCompanyConfigDocument = HydratedDocument<CrmCompanyConfigSchema>;
export const CrmCompanyConfigSchemaDefinition = SchemaFactory.createForClass(
  CrmCompanyConfigSchema,
);

// Índice compuesto único para company + crm type
CrmCompanyConfigSchemaDefinition.index(
  { companyId: 1, crmType: 1 },
  { unique: true },
);

// Índice para búsqueda de configuraciones habilitadas
CrmCompanyConfigSchemaDefinition.index(
  { enabled: 1, crmType: 1 },
  { partialFilterExpression: { enabled: true } },
);
