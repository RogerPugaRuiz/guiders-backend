# Endpoint: Crear Chat con Primer Mensaje

## Información General

**URL:** `POST /v2/chats/with-message`  
**Descripción:** Crea un nuevo chat para el visitante autenticado, lo coloca en la cola de espera e incluye un primer mensaje. Esta operación es atómica.  
**Contexto:** conversations-v2  
**Autenticación:** Requerida (JWT o sesión de visitante)  
**Roles permitidos:** visitor, commercial, admin

## Características

- ✅ **Operación atómica**: El chat y el mensaje se crean en una sola transacción
- ✅ **Colocación automática en cola**: El chat se posiciona automáticamente en la cola de espera
- ✅ **Soporte multi-tipo**: Soporta mensajes de texto, imagen y archivos adjuntos
- ✅ **Metadatos opcionales**: Permite incluir información adicional del visitante y del chat
- ✅ **Validación robusta**: Validación completa de entrada con mensajes de error descriptivos

## Estructura del Request

### Body Parameters

```json
{
  "firstMessage": {
    "content": "string (requerido)",
    "type": "text|image|file (opcional, default: text)",
    "attachment": {
      "url": "string",
      "fileName": "string", 
      "fileSize": "number",
      "mimeType": "string"
    }
  },
  "visitorInfo": {
    "name": "string (opcional)",
    "email": "string (opcional)",
    "phone": "string (opcional)",
    "location": "string (opcional)",
    "additionalData": "object (opcional)"
  },
  "metadata": {
    "department": "string (opcional)",
    "source": "string (opcional)",
    "priority": "LOW|NORMAL|HIGH|URGENT (opcional, default: NORMAL)",
    "initialUrl": "string (opcional)",
    "userAgent": "string (opcional)",
    "additionalData": "object (opcional)"
  }
}
```

### Validaciones

- `firstMessage.content`: Requerido, no puede estar vacío
- `firstMessage.type`: Debe ser uno de: "text", "image", "file"
- `firstMessage.attachment`: Requerido solo si type es "image" o "file"
- `metadata.priority`: Debe ser uno de: "LOW", "NORMAL", "HIGH", "URGENT"

## Ejemplos

### Ejemplo 1: Mensaje de texto simple

**Request:**
```json
{
  "firstMessage": {
    "content": "Hola, me gustaría información sobre sus productos",
    "type": "text"
  },
  "visitorInfo": {
    "name": "Juan Pérez",
    "email": "juan@example.com"
  },
  "metadata": {
    "department": "ventas",
    "priority": "NORMAL",
    "source": "website"
  }
}
```

**Response (201):**
```json
{
  "chatId": "550e8400-e29b-41d4-a716-446655440000",
  "messageId": "550e8400-e29b-41d4-a716-446655440001", 
  "position": 3
}
```

### Ejemplo 2: Mensaje con archivo adjunto

**Request:**
```json
{
  "firstMessage": {
    "content": "Adjunto mi consulta técnica",
    "type": "file",
    "attachment": {
      "url": "https://storage.example.com/files/consulta.pdf",
      "fileName": "consulta_tecnica.pdf",
      "fileSize": 245760,
      "mimeType": "application/pdf"
    }
  },
  "metadata": {
    "department": "soporte",
    "priority": "HIGH"
  }
}
```

### Ejemplo 3: Mensaje mínimo (solo contenido)

**Request:**
```json
{
  "firstMessage": {
    "content": "Hola, necesito ayuda"
  }
}
```

## Respuestas

### 201 - Chat y mensaje creados exitosamente
```json
{
  "chatId": "string",     // ID único del chat creado
  "messageId": "string",  // ID único del primer mensaje
  "position": "number"    // Posición en la cola de espera
}
```

### 400 - Datos de entrada inválidos
```json
{
  "statusCode": 400,
  "message": ["Lista de errores de validación"],
  "error": "Bad Request"
}
```

### 401 - Usuario no autenticado
```json
{
  "statusCode": 401,
  "message": "Se requiere autenticación para crear un chat",
  "error": "Unauthorized"
}
```

### 403 - Usuario sin permisos suficientes
```json
{
  "statusCode": 403,
  "message": "Acceso denegado",
  "error": "Forbidden"
}
```

### 500 - Error interno del servidor
```json
{
  "statusCode": 500,
  "message": "Error interno del servidor",
  "error": "Internal Server Error"
}
```

## Flujo de Trabajo

1. **Validación**: Se valida la estructura del request y la autenticación
2. **Creación del Chat**: Se crea un nuevo chat asociado al visitante autenticado
3. **Colocación en Cola**: El chat se posiciona automáticamente en la cola de espera
4. **Creación del Mensaje**: Se crea el primer mensaje asociado al chat
5. **Cálculo de Posición**: Se calcula la posición del chat en la cola
6. **Respuesta**: Se retorna la información del chat, mensaje y posición creados

## Consideraciones Técnicas

- La operación es **atómica**: si falla algún paso, toda la operación se revierte
- El `visitorId` se obtiene automáticamente del token de autenticación
- Si no se especifica `visitorInfo`, se puede inferir del token cuando esté disponible
- Los metadatos son opcionales pero recomendados para mejor gestión del chat
- El tipo de mensaje por defecto es "text" si no se especifica
- La prioridad por defecto es "NORMAL" si no se especifica

## Arquitectura

- **Command Handler**: `CreateChatWithMessageCommandHandler`
- **Command**: `CreateChatWithMessageCommand`
- **DTO**: `CreateChatWithMessageRequestDto`
- **Controller**: `ChatV2Controller.createChatWithMessage()`
- **Guards**: `OptionalAuthGuard`, `RolesGuard`

## Testing

### Unit Tests
- ✅ `CreateChatWithMessageCommandHandler.spec.ts`
- ✅ Validación de DTOs
- ✅ Manejo de errores

### E2E Tests  
- ✅ `chat-v2-with-message.e2e-spec.ts`
- ✅ Flujo completo de creación
- ✅ Validación de autenticación
- ✅ Casos de error

## Notas de Implementación

- Implementado siguiendo patrones CQRS
- Utiliza domain events para notificaciones
- Repositorios encapsulan la persistencia en MongoDB
- Validación robusta con class-validator
- Documentación Swagger completa
- Compatible con autenticación JWT y por sesión