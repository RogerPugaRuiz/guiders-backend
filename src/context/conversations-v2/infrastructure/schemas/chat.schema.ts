import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * Esquema MongoDB para la información del visitante
 */
@Schema({ _id: false })
export class VisitorInfoSchema {
  @Prop({ required: true, type: String })
  id: string;

  @Prop({ required: false, type: String })
  name?: string;

  @Prop({ required: false, type: String })
  email?: string;

  @Prop({ required: false, type: String })
  phone?: string;

  @Prop({ required: false, type: String })
  location?: string;

  @Prop({ required: false, type: Object })
  additionalData?: Record<string, any>;
}

export const VisitorInfoSchemaDefinition =
  SchemaFactory.createForClass(VisitorInfoSchema);

/**
 * Esquema MongoDB para los metadatos del chat
 */
@Schema({ _id: false })
export class ChatMetadataSchema {
  @Prop({ required: true, type: String })
  department: string;

  @Prop({ required: true, type: String })
  source: string;

  @Prop({ required: false, type: String })
  initialUrl?: string;

  @Prop({ required: false, type: String })
  userAgent?: string;

  @Prop({ required: false, type: String })
  referrer?: string;

  @Prop({ required: false, type: Object })
  tags?: Record<string, any>;

  @Prop({ required: false, type: Object })
  customFields?: Record<string, any>;
}

export const ChatMetadataSchemaDefinition =
  SchemaFactory.createForClass(ChatMetadataSchema);

/**
 * Esquema MongoDB para el Chat V2
 * Optimizado para consultas comerciales y de visitantes
 */
@Schema({
  collection: 'chats_v2',
  timestamps: true,
  toJSON: {
    transform: (_doc: any, ret: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      ret.id = ret._id?.toString();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret._id;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret.__v;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return ret;
    },
  },
})
export class ChatSchema {
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
    enum: [
      'PENDING',
      'ASSIGNED',
      'ACTIVE',
      'CLOSED',
      'TRANSFERRED',
      'ABANDONED',
    ],
    index: true,
  })
  status: string;

  @Prop({
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'NORMAL', 'HIGH', 'URGENT'],
    index: true,
  })
  priority: string;

  @Prop({
    type: VisitorInfoSchemaDefinition,
    required: true,
  })
  visitorInfo: VisitorInfoSchema;

  @Prop({
    type: String,
    required: false,
    index: true,
    sparse: true,
  })
  assignedCommercialId?: string;

  @Prop({
    type: [String],
    required: false,
    index: true,
  })
  availableCommercialIds?: string[];

  @Prop({
    type: ChatMetadataSchemaDefinition,
    required: true,
  })
  metadata: ChatMetadataSchema;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  createdAt: Date;

  @Prop({
    type: Date,
    required: false,
    index: true,
    sparse: true,
  })
  assignedAt?: Date;

  @Prop({
    type: Date,
    required: false,
    index: true,
    sparse: true,
  })
  closedAt?: Date;

  @Prop({
    type: Date,
    required: false,
    index: true,
    sparse: true,
  })
  lastMessageDate?: Date;

  @Prop({
    type: String,
    required: false,
  })
  lastMessageContent?: string;

  @Prop({
    type: Number,
    required: true,
    default: 0,
    index: true,
  })
  totalMessages: number;

  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  unreadMessagesCount: number;

  @Prop({
    type: Boolean,
    required: true,
    default: true,
    index: true,
  })
  isActive: boolean;

  // Campos adicionales para optimización de consultas
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  visitorId: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  department: string;

  @Prop({
    type: [String],
    required: false,
    index: true,
  })
  tags?: string[];

  @Prop({
    type: Date,
    required: false,
  })
  updatedAt?: Date;

  // Campos para métricas y reportes
  @Prop({
    type: Number,
    required: false,
  })
  averageResponseTimeMinutes?: number;

  @Prop({
    type: Number,
    required: false,
  })
  chatDurationMinutes?: number;

  @Prop({
    type: String,
    required: false,
    enum: ['resolved', 'unresolved', 'escalated'],
  })
  resolutionStatus?: string;

  @Prop({
    type: Number,
    required: false,
    min: 1,
    max: 5,
  })
  satisfactionRating?: number;
}

export type ChatDocument = HydratedDocument<ChatSchema>;
export const ChatSchemaDefinition = SchemaFactory.createForClass(ChatSchema);

// Índices compuestos para optimización de consultas frecuentes
ChatSchemaDefinition.index({ status: 1, priority: 1, createdAt: 1 });
ChatSchemaDefinition.index({ assignedCommercialId: 1, status: 1 });
ChatSchemaDefinition.index({ visitorId: 1, createdAt: -1 });
ChatSchemaDefinition.index({ department: 1, status: 1 });
ChatSchemaDefinition.index({ createdAt: 1, department: 1 });
ChatSchemaDefinition.index({ lastMessageDate: -1, status: 1 });
ChatSchemaDefinition.index({ isActive: 1, status: 1, priority: 1 });

// Índices para consultas de métricas
ChatSchemaDefinition.index({
  assignedCommercialId: 1,
  createdAt: 1,
  status: 1,
});
ChatSchemaDefinition.index({ 'metadata.department': 1, createdAt: 1 });

// Índice de texto para búsqueda
ChatSchemaDefinition.index({
  'visitorInfo.name': 'text',
  'visitorInfo.email': 'text',
  'metadata.tags': 'text',
});

// Pre-hooks para mantener campos derivados
ChatSchemaDefinition.pre('save', function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }

  // Marcar como inactivo cuando se establece closedAt
  if (this.closedAt && this.isActive) {
    this.isActive = false;
  }

  // Sincronizar campos derivados
  if (this.visitorInfo?.id) {
    this.visitorId = this.visitorInfo.id;
  }

  if (this.metadata?.department) {
    this.department = this.metadata.department;
  }

  if (this.metadata?.tags) {
    this.tags = Object.keys(this.metadata.tags);
  }

  next();
});
