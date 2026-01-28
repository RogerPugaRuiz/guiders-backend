/**
 * Schema MongoDB para la configuración de LLM por empresa
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LlmCompanyConfigDocument = LlmCompanyConfigSchema & Document;

@Schema({
  collection: 'llm_company_configs',
  timestamps: true,
})
export class LlmCompanyConfigSchema {
  @Prop({ required: true, index: true, unique: true })
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

  /** Configuración de tools (function calling) */
  @Prop({
    type: {
      fetchPageEnabled: { type: Boolean, default: false },
      saveLeadContactEnabled: { type: Boolean, default: false },
      escalateToCommercialEnabled: { type: Boolean, default: true },
      allowedPaths: { type: [String], default: [] },
      maxIterations: { type: Number, default: 3 },
      fetchTimeoutMs: { type: Number, default: 10000 },
      cacheEnabled: { type: Boolean, default: true },
      cacheTtlSeconds: { type: Number, default: 3600 },
      baseUrl: { type: String, default: null },
    },
    default: null,
  })
  toolConfig: {
    fetchPageEnabled: boolean;
    saveLeadContactEnabled?: boolean;
    escalateToCommercialEnabled?: boolean;
    allowedPaths: string[];
    maxIterations: number;
    fetchTimeoutMs: number;
    cacheEnabled: boolean;
    cacheTtlSeconds: number;
    baseUrl?: string;
  } | null;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const LlmCompanyConfigSchemaDefinition = SchemaFactory.createForClass(
  LlmCompanyConfigSchema,
);
