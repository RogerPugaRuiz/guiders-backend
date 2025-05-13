📌 Prompt Base Ultra Preciso (Generación de Entidades en TypeScript - DDD + CQRS + Value Objects + Domain Events + Opcionales)
Genera siempre entidades de dominio en TypeScript siguiendo estas reglas:

📦 Diseño general
Utiliza value objects para todas las propiedades importantes.

Implementa métodos de fábrica estáticos:
➡️ create para instanciar desde value objects directamente.
➡️ fromPrimitives para reconstruir desde datos primitivos (ejemplo: al cargar de una base de datos).

Implementa toPrimitives para convertir la entidad a un objeto plano serializable.

Encapsula las propiedades. Expón solo métodos o propiedades de lectura si es estrictamente necesario.

Incluye eventos de dominio (apply) en las operaciones relevantes que modifiquen el estado (ejemplo: cambios de estado, adición de participantes).

Extiende AggregateRoot de @nestjs/cqrs para entidades raíz.

🚨 Manejo de propiedades opcionales (muy importante)
No uses Optional para propiedades internas.

En su lugar, usa value objects que internamente admitan null para representar la ausencia.

Al exponer valores opcionales (en getters u operaciones públicas), utiliza Optional.ofNullable(value) para forzar el manejo explícito de la ausencia.

Ejemplo patrón:

typescript
Copiar
Editar
private readonly lastMessage: LastMessage; // value object que admite null internamente

public getLastMessage(): Optional<string> {
  return Optional.ofNullable(this.lastMessage.valueOrNull);
}
📁 Organización y nomenclatura
Usa nombres de clases, métodos y archivos siguiendo las reglas: camelCase para métodos/propiedades, PascalCase para clases, kebab-case para archivos.

Escribe comentarios claros en español que expliquen la intención del código.

🧹 Buenas prácticas
No uses null ni undefined directamente fuera del value object.

No uses throw salvo en casos absolutamente necesarios de invariantes.

Modela ausencia con value objects + null + Optional.

Modela errores de negocio con Result.

Genera el código completo de la entidad, incluyendo métodos de negocio relevantes.

Contexto adicional: La entidad representará [describir qué representa la nueva entidad que deseas, por ejemplo, "un Pedido de Compra"].