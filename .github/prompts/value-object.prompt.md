Crea siempre Value Objects en TypeScript siguiendo estas reglas:

Extiende PrimitiveValueObject de src/context/shared/domain/primitive-value-object.ts.

Antes de crear uno nuevo, revisa si puedes extender un Value Object existente en [src/context/shared/domain/value-objects/](../../src/context/shared/domain/value-objects/).

Valida valores en el constructor. Para validaciones comunes, usa validation-utils.ts.

Nombres de clases en PascalCase (ejemplo: PositiveNumber). Archivos en kebab-case (ejemplo: positive-number.ts).

Agrega comentarios en español explicando el propósito y validación del Value Object.

Implementa pruebas automáticas para verificar valores válidos e inválidos.

No uses directamente null o undefined.

Ejemplos:

Validación personalizada → PositiveNumber.

Extender otro VO → TrackingEventId extiende Uuid.

Prohibido: crear Value Objects sin validación, sin pruebas o sin seguir las convenciones de nombres.
