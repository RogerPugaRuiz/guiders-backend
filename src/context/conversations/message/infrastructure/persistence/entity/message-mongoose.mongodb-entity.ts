import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Entidad de MongoDB para persistir mensajes usando Mongoose
 * Diseñada para mantener compatibilidad con la estructura existente
 */
@Schema({
  collection: 'messages', // Nombre de la colección en MongoDB
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  versionKey: false, // Desactiva el campo __v
})
export class MessageMongooseEntity extends Document {
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
  })
  id: string;

  @Prop({
    type: String,
    required: true,
  })
  content: string;

  @Prop({
    type: String,
    required: true,
  })
  sender: string;

  @Prop({
    type: String,
    required: true,
  })
  chatId: string;

  @Prop({
    type: Date,
    required: true,
  })
  timestamp: Date;

  @Prop({
    type: String,
    required: false,
  })
  metadata?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isRead: boolean;

  @Prop({
    type: String,
    required: false,
  })
  attachments?: string;
}

export const MessageMongooseSchema = SchemaFactory.createForClass(
  MessageMongooseEntity,
);

// Índices compuestos para optimizar consultas frecuentes
MessageMongooseSchema.index({ chatId: 1, timestamp: -1 });
MessageMongooseSchema.index({ sender: 1, isRead: 1 });
