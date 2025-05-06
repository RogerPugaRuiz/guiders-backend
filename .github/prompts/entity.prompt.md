# Entidad en TypeScript

Actúa como un desarrollador experto en arquitectura de software DDD (Domain-Driven Design) y programación orientada a objetos.
Necesito que crees una entidad en TypeScript siguiendo buenas prácticas de diseño, como en este ejemplo de una clase Message que usa value objects, métodos estáticos como create y fromPrimitives, e implementación del método toPrimitives.

Contexto: Esta entidad deberá representar [describir qué representa la nueva entidad que deseas, por ejemplo, "un Pedido de Compra"].

Requisitos:

Usa value objects para cada propiedad importante (ejemplo: OrderId, CustomerId, OrderDate, TotalAmount).

Implementa un método create que permita crear la entidad desde value objects directamente.

Implementa un método fromPrimitives que permita reconstruir la entidad desde datos primitivos (como strings o números).

Implementa un método toPrimitives que permita serializar la entidad en un objeto plano para almacenamiento o transporte.

Mantén las propiedades encapsuladas y sólo expón métodos y propiedades de lectura si es necesario.

Ejemplo de entidad de referencia (no la copies, solo úsala como inspiración):

```typescript
import { MessageId } from './value-objects/message-id';
import { SenderId } from './value-objects/sender-id';
import { Content } from './value-objects/content';
import { CreatedAt } from './value-objects/created-at';
import { ChatId } from '../../chat/domain/chat/value-objects/chat-id';

export interface MessagePrimitives {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

export class Message {
  private constructor(
    readonly id: MessageId,
    readonly chatId: ChatId,
    readonly senderId: SenderId,
    readonly content: Content,
    readonly createdAt: CreatedAt,
  ) {}

  public static fromPrimitives(params: {
    id: string;
    chatId: string;
    senderId: string;
    content: string;
    createdAt: number | Date | string;
  }): Message {
    return new Message(
      MessageId.create(params.id),
      ChatId.create(params.chatId),
      SenderId.create(params.senderId),
      Content.create(params.content),
      CreatedAt.create(params.createdAt),
    );
  }

  public static create(params: {
    id: MessageId;
    chatId: ChatId;
    senderId: SenderId;
    content: Content;
    createdAt?: CreatedAt;
  }): Message {
    const id = params.id;
    const createdAt = params.createdAt
      ? CreatedAt.create(params.createdAt.value)
      : CreatedAt.create(new Date());
    const message = new Message(
      id,
      params.chatId,
      params.senderId,
      params.content,
      createdAt,
    );
    return message;
  }

  public toPrimitives(): MessagePrimitives {
    return {
      id: this.id.value,
      chatId: this.chatId.value,
      senderId: this.senderId.value,
      content: this.content.value,
      createdAt: this.createdAt.value,
    };
  }
}
```

Entrega como resultado el código completo de la nueva entidad.