/**
 * Schema MongoDB para la configuración de LLM por sitio
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LlmSiteConfigDocument = LlmSiteConfigSchema & Document;

@Schema({
  collection: 'llm_site_configs',
  timestamps: true,
})
export class LlmSiteConfigSchema {
  @Prop({ required: true, index: true, unique: true })
  siteId: string;

  @Prop({ required: true, index: true })
  companyId: string;

  @Prop({ default: true })
  aiAutoResponseEnabled: boolean;

  @Prop({ default: true })
  aiSuggestionsEnabled: boolean;

  @Prop({ default: false })
  aiRespondWithCommercial: boolean;

  @Prop({ default: 'groq' })
  preferredProvider: string;

  @Prop({ default: 'llama-3.3-70b-versatile' })
  preferredModel: string;

  @Prop({ type: String, default: null })
  customSystemPrompt: string | null;

  @Prop({ default: 500 })
  maxResponseTokens: number;

  @Prop({ default: 0.7 })
  temperature: number;

  @Prop({ default: 1000 })
  responseDelayMs: number;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const LlmSiteConfigSchemaDefinition =
  SchemaFactory.createForClass(LlmSiteConfigSchema);

// Índices compuestos
LlmSiteConfigSchemaDefinition.index({ companyId: 1, siteId: 1 });
