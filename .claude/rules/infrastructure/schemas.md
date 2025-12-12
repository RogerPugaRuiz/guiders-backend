# MongoDB Schemas (Mongoose)

## Descripción

Definición de esquemas MongoDB con decoradores NestJS/Mongoose.

## Referencia

`src/context/conversations-v2/infrastructure/schemas/chat.schema.ts`

## Schema Principal

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  collection: 'chats_v2',      // Nombre de colección
  timestamps: true,             // createdAt, updatedAt automáticos
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

## Sub-Schemas (Documentos Anidados)

```typescript
@Schema({ _id: false })  // Sin _id propio
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

// Uso en schema principal
@Schema({ collection: 'chats_v2' })
export class ChatSchema {
  @Prop({ type: VisitorInfoSchemaDefinition, required: true })
  visitorInfo: VisitorInfoSchema;
}
```

## Opciones de @Prop

| Opción | Descripción | Ejemplo |
|--------|-------------|---------|
| `type` | Tipo de dato | `String`, `Number`, `Date`, `Boolean`, `Object` |
| `required` | Obligatorio | `true`, `false` |
| `default` | Valor por defecto | `'PENDING'`, `() => new Date()` |
| `enum` | Valores permitidos | `['A', 'B', 'C']` |
| `index` | Crear índice | `true` |
| `unique` | Índice único | `true` |
| `sparse` | Índice sparse | `true` (para campos opcionales) |

## Índices Compuestos

```typescript
// Después de crear el schema
ChatSchemaDefinition.index({ status: 1, priority: 1, createdAt: -1 });
ChatSchemaDefinition.index({ assignedCommercialId: 1, status: 1 });
ChatSchemaDefinition.index({ visitorId: 1, createdAt: -1 });

// Índice de texto para búsqueda
ChatSchemaDefinition.index({
  'visitorInfo.name': 'text',
  'visitorInfo.email': 'text',
});

// Índice TTL (auto-eliminar)
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

## Registro en Módulo

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

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Schema | `<Entity>Schema` | `ChatSchema` |
| Sub-schema | `<SubEntity>Schema` | `VisitorInfoSchema` |
| Definition | `<Entity>SchemaDefinition` | `ChatSchemaDefinition` |
| Archivo | `<entity>.schema.ts` | `chat.schema.ts` |

## Anti-patrones

- Schemas sin índices para campos filtrados
- Sub-schemas con `_id: true` innecesario
- Falta de `enum` en campos con valores fijos
- No usar `sparse: true` para índices únicos opcionales
