import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

/**
 * Schema MongoDB para Commercial
 * Define la estructura de persistencia para comerciales
 */
@Schema({
  collection: 'commercials',
  timestamps: true, // Añade createdAt y updatedAt automáticamente
  versionKey: false, // Desactiva __v
})
export class CommercialSchema extends Document {
  @Prop({ required: true, unique: true, index: true })
  id: string; // CommercialId como string UUID

  @Prop({ required: true, index: true })
  name: string; // CommercialName

  @Prop({ required: true, index: true })
  connectionStatus: string; // CONNECTED | DISCONNECTED

  @Prop({ required: true, index: true })
  lastActivity: Date; // Última actividad registrada

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  metadata?: Record<string, any>; // Información adicional flexible

  // Campos automáticos de timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const CommercialSchemaDefinition =
  SchemaFactory.createForClass(CommercialSchema);

// Exportar también como CommercialSchema para compatibilidad
export const CommercialSchemaModel = CommercialSchemaDefinition;

// Índices adicionales para optimizar consultas
CommercialSchemaDefinition.index({ connectionStatus: 1, lastActivity: -1 });
CommercialSchemaDefinition.index({ lastActivity: -1 });
CommercialSchemaDefinition.index({ createdAt: -1 });
