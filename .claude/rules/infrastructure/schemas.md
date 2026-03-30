# MongoDB Schemas (Mongoose)

## Description

MongoDB schema definitions using NestJS/Mongoose decorators.

## Reference

`src/context/conversations-v2/infrastructure/schemas/chat.schema.ts`

## Main Schema

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'chats_v2',      // Collection name
  timestamps: true,             // Auto createdAt, updatedAt
  toJSON: {
    transform: (_doc, ret) => {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class ChatSchema {
  @Prop({ type: String, required: true, unique: true, index: true })
  id: string;

  @Prop({
    type: String,
    required: true,
    enum: ['PENDING', 'ASSIGNED', 'ACTIVE', 'CLOSED'],
    index: true,
  })
  status: string;

  @Prop({ type: String, required: true, index: true })
  visitorId: string;

  @Prop({ type: String, index: true, sparse: true })
  assignedCommercialId?: string;

  @Prop({ type: Date, required: true, index: true })
  createdAt: Date;

  @Prop({ type: Number, default: 0 })
  totalMessages: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export type ChatDocument = HydratedDocument<ChatSchema>;
export const ChatSchemaDefinition = SchemaFactory.createForClass(ChatSchema);
```

## Sub-Schemas (Nested Documents)

```typescript
@Schema({ _id: false })  // No own _id
export class VisitorInfoSchema {
  @Prop({ required: true, type: String })
  id: string;

  @Prop({ required: false, type: String })
  name?: string;

  @Prop({ required: false, type: String })
  email?: string;

  @Prop({ required: false, type: Object })
  additionalData?: Record<string, unknown>;
}

export const VisitorInfoSchemaDefinition =
  SchemaFactory.createForClass(VisitorInfoSchema);

// Usage in main schema
@Schema({ collection: 'chats_v2' })
export class ChatSchema {
  @Prop({ type: VisitorInfoSchemaDefinition, required: true })
  visitorInfo: VisitorInfoSchema;
}
```

## @Prop Options

| Option | Description | Example |
|--------|-------------|---------|
| `type` | Data type | `String`, `Number`, `Date`, `Boolean`, `Object` |
| `required` | Required field | `true`, `false` |
| `default` | Default value | `'PENDING'`, `() => new Date()` |
| `enum` | Allowed values | `['A', 'B', 'C']` |
| `index` | Create index | `true` |
| `unique` | Unique index | `true` |
| `sparse` | Sparse index | `true` (for optional fields) |

## Compound Indexes

```typescript
// After creating the schema
ChatSchemaDefinition.index({ status: 1, priority: 1, createdAt: -1 });
ChatSchemaDefinition.index({ assignedCommercialId: 1, status: 1 });
ChatSchemaDefinition.index({ visitorId: 1, createdAt: -1 });

// Text index for search
ChatSchemaDefinition.index({
  'visitorInfo.name': 'text',
  'visitorInfo.email': 'text',
});

// TTL index (auto-delete)
ChatSchemaDefinition.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

## Pre-Hooks

```typescript
ChatSchemaDefinition.pre('save', function (next) {
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  next();
});

ChatSchemaDefinition.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});
```

## Module Registration

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSchema.name, schema: ChatSchemaDefinition },
    ]),
  ],
})
export class ChatInfrastructureModule {}
```

## Naming Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Schema | `<Entity>Schema` | `ChatSchema` |
| Sub-schema | `<SubEntity>Schema` | `VisitorInfoSchema` |
| Definition | `<Entity>SchemaDefinition` | `ChatSchemaDefinition` |
| File | `<entity>.schema.ts` | `chat.schema.ts` |

## Anti-patterns

- Schemas without indexes for filtered fields
- Sub-schemas with unnecessary `_id: true`
- Missing `enum` for fixed-value fields
- Not using `sparse: true` for optional unique indexes
