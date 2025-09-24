import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AssignmentStrategy } from '../../../domain/services/chat-auto-assignment.domain-service';

/**
 * Schema de Mongoose para las reglas de asignamiento
 */
@Schema({ collection: 'assignment_rules' })
export class AssignmentRulesMongoEntity extends Document {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  companyId: string;

  @Prop()
  siteId?: string;

  @Prop({
    required: true,
    enum: Object.values(AssignmentStrategy),
  })
  defaultStrategy: AssignmentStrategy;

  @Prop({ required: true, min: 1 })
  maxChatsPerCommercial: number;

  @Prop({ required: true, min: 1 })
  maxWaitTimeSeconds: number;

  @Prop({ required: true, default: false })
  enableSkillBasedRouting: boolean;

  @Prop({
    type: {
      timezone: { type: String, required: true },
      schedule: [
        {
          dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
          startTime: {
            type: String,
            required: true,
            match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          },
          endTime: {
            type: String,
            required: true,
            match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          },
        },
      ],
    },
    required: false,
  })
  workingHours?: {
    timezone: string;
    schedule: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }>;
  };

  @Prop({
    required: true,
    enum: Object.values(AssignmentStrategy),
  })
  fallbackStrategy: AssignmentStrategy;

  @Prop({
    type: Map,
    of: Number,
    default: {},
  })
  priorities: Map<string, number>;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop({ required: true, default: Date.now })
  updatedAt: Date;
}

export const AssignmentRulesMongoEntitySchema = SchemaFactory.createForClass(
  AssignmentRulesMongoEntity,
);

// Índices para optimizar consultas
AssignmentRulesMongoEntitySchema.index(
  { companyId: 1, siteId: 1 },
  { unique: true },
);
AssignmentRulesMongoEntitySchema.index({ companyId: 1 });
AssignmentRulesMongoEntitySchema.index({ isActive: 1 });
AssignmentRulesMongoEntitySchema.index({ defaultStrategy: 1 });
AssignmentRulesMongoEntitySchema.index({ updatedAt: 1 });

// Middleware para actualizar updatedAt automáticamente
AssignmentRulesMongoEntitySchema.pre('save', function (next) {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

AssignmentRulesMongoEntitySchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});
