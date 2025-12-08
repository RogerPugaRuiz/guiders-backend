/**
 * Schema MongoDB para cache de contenido web
 * Almacena el contenido extraído de páginas web para evitar requests repetidos
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WebContentCacheDocument = WebContentCacheSchema & Document;

@Schema({
  collection: 'web_content_cache',
  timestamps: true,
})
export class WebContentCacheSchema {
  /** URL completa de la página */
  @Prop({ required: true, index: true })
  url: string;

  /** ID del sitio al que pertenece */
  @Prop({ required: true, index: true })
  siteId: string;

  /** ID de la compañía */
  @Prop({ required: true, index: true })
  companyId: string;

  /** Contenido en Markdown */
  @Prop({ required: true })
  content: string;

  /** Tamaño original del contenido */
  @Prop({ required: true })
  originalSize: number;

  /** Si el contenido fue truncado */
  @Prop({ default: false })
  truncated: boolean;

  /** Tiempo que tomó el fetch en ms */
  @Prop({ required: true })
  fetchTimeMs: number;

  /** Fecha de creación */
  @Prop({ type: Date })
  createdAt: Date;

  /** Fecha de última actualización */
  @Prop({ type: Date })
  updatedAt: Date;

  /** Fecha de expiración (para TTL index) */
  @Prop({ type: Date, required: true, index: true })
  expiresAt: Date;
}

export const WebContentCacheSchemaDefinition = SchemaFactory.createForClass(
  WebContentCacheSchema,
);

// Índice único por URL y sitio
WebContentCacheSchemaDefinition.index({ url: 1, siteId: 1 }, { unique: true });

// Índice TTL para auto-eliminación de documentos expirados
WebContentCacheSchemaDefinition.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);
