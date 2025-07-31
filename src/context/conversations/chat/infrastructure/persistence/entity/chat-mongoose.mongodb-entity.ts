import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Subdocumento para representar un participante en el chat
 */
@Schema({ _id: false })
export class ParticipantSchema {
  @Prop({
    type: String,
    required: true,
  })
  id: string;

  @Prop({
    type: String,
    required: true,
  })
  name: string;

  @Prop({
    type: Boolean,
    required: true,
  })
  isCommercial: boolean;

  @Prop({
    type: Boolean,
    required: true,
  })
  isVisitor: boolean;

  @Prop({
    type: Boolean,
    required: true,
    default: false,
  })
  isOnline: boolean;

  @Prop({
    type: Boolean,
    required: true,
    default: false,
  })
  isViewing: boolean;

  @Prop({
    type: Boolean,
    required: true,
    default: false,
  })
  isTyping: boolean;

  @Prop({
    type: Boolean,
    required: true,
    default: true,
  })
  isAnonymous: boolean;

  @Prop({
    type: Date,
    required: true,
    default: Date.now,
  })
  assignedAt: Date;

  @Prop({
    type: Date,
    required: false,
  })
  lastSeenAt?: Date;
}

export const ParticipantSchemaDefinition =
  SchemaFactory.createForClass(ParticipantSchema);

/**
 * Entidad de MongoDB para persistir chats usando Mongoose
 * Diseñada para mantener compatibilidad con la estructura existente
 */
@Schema({
  collection: 'chats', // Nombre de la colección en MongoDB
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  versionKey: false, // Desactiva el campo __v
})
export class ChatMongooseEntity extends Document {
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
  companyId: string;

  @Prop({
    type: [ParticipantSchemaDefinition],
    required: true,
    default: [],
  })
  participants: ParticipantSchema[];

  @Prop({
    type: String,
    required: true,
    enum: ['PENDING', 'ACTIVE', 'CLOSED'],
    default: 'PENDING',
  })
  status: string;

  @Prop({
    type: String,
    required: false,
  })
  lastMessage?: string;

  @Prop({
    type: Date,
    required: false,
  })
  lastMessageAt?: Date;

  @Prop({
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  })
  createdAt: Date;
}

export const ChatMongooseSchema =
  SchemaFactory.createForClass(ChatMongooseEntity);

// Índices compuestos para optimizar consultas frecuentes
ChatMongooseSchema.index({ companyId: 1, status: 1 });
ChatMongooseSchema.index({ lastMessageAt: -1, id: 1 });
ChatMongooseSchema.index({ 'participants.id': 1 });
