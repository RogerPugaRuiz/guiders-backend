# Chat V2 Creation Endpoint

## PUT /v2/chats/{chatId}

Esta implementación añade un endpoint PUT para la creación idempotente de chats en la versión 2 del sistema de conversaciones.

### Características

- **Método**: PUT (idempotente)
- **URL**: `/v2/chats/{chatId}` donde `{chatId}` es un UUID válido
- **Idempotencia**: Múltiples llamadas con el mismo ID retornan el mismo resultado
- **Autenticación**: Requerida (Bearer token)
- **Roles permitidos**: visitor, commercial, admin

### Request Body

```json
{
  "visitorId": "550e8400-e29b-4b5b-9cb4-123456789000",
  "visitorInfo": {
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+34123456789",
    "company": "Acme Corp",
    "ipAddress": "192.168.1.100",
    "location": {
      "country": "España",
      "city": "Madrid"
    },
    "referrer": "https://google.com",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  },
  "availableCommercialIds": [
    "550e8400-e29b-4b5b-9cb4-123456789001",
    "550e8400-e29b-4b5b-9cb4-123456789002"
  ],
  "priority": "NORMAL",
  "metadata": {
    "department": "ventas",
    "product": "Plan Premium",
    "source": "web",
    "tags": ["nuevo-cliente", "interesado"],
    "campaign": "Black Friday 2024",
    "utmSource": "google",
    "utmMedium": "cpc",
    "utmCampaign": "summer_sale",
    "customFields": {
      "leadScore": 85,
      "segment": "enterprise"
    }
  }
}
```

### Campos Mínimos Requeridos

```json
{
  "visitorId": "550e8400-e29b-4b5b-9cb4-123456789000",
  "visitorInfo": {
    "name": "Ana García",
    "email": "ana.garcia@example.com"
  },
  "availableCommercialIds": [
    "550e8400-e29b-4b5b-9cb4-123456789001"
  ]
}
```

### Response

```json
{
  "id": "550e8400-e29b-4b5b-9cb4-123456789100",
  "status": "PENDING",
  "priority": "NORMAL",
  "visitorId": "550e8400-e29b-4b5b-9cb4-123456789101",
  "assignedCommercialId": null,
  "availableCommercialIds": [
    "550e8400-e29b-4b5b-9cb4-123456789102",
    "550e8400-e29b-4b5b-9cb4-123456789103"
  ],
  "totalMessages": 0,
  "unreadMessagesCount": 0,
  "isActive": true,
  "department": "ventas",
  "tags": [],
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z",
  "visitorInfo": {
    "id": "550e8400-e29b-4b5b-9cb4-123456789101",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+34123456789",
    "location": "Madrid",
    "additionalData": {
      "company": "Acme Corp",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "referrer": "https://google.com"
    }
  },
  "metadata": {
    "department": "ventas",
    "source": "web",
    "initialUrl": null,
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "referrer": "https://google.com",
    "tags": {},
    "customFields": {}
  }
}
```

### Códigos de Respuesta

- **200 OK**: Chat creado exitosamente o ya existía (idempotencia)
- **400 Bad Request**: Datos de entrada inválidos (formato UUID incorrecto, campos requeridos faltantes)
- **401 Unauthorized**: Token de autenticación no proporcionado o inválido
- **403 Forbidden**: Usuario sin permisos suficientes
- **500 Internal Server Error**: Error interno del servidor

### Idempotencia

El endpoint es idempotente. Si se llama múltiples veces con el mismo `chatId`, retornará el chat existente sin crear uno nuevo:

```bash
# Primera llamada - crea el chat
curl -X PUT "http://localhost:3000/v2/chats/550e8400-e29b-4b5b-9cb4-123456789100" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"visitorId": "550e8400-e29b-4b5b-9cb4-123456789101", ...}'

# Segunda llamada - retorna el chat existente
curl -X PUT "http://localhost:3000/v2/chats/550e8400-e29b-4b5b-9cb4-123456789100" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"visitorId": "diferente-visitor", ...}'  # Payload diferente

# Ambas respuestas tendrán el mismo chat con los datos de la primera creación
```

### Implementación Técnica

- **Command Pattern**: `CreateChatCommand` y `CreateChatCommandHandler`
- **Event Sourcing**: Emite `ChatCreatedEvent` para notificaciones cross-context
- **Result Pattern**: Manejo de errores sin excepciones en el dominio
- **Repository Pattern**: Persistencia abstracta con implementación MongoDB
- **Value Objects**: Validación estricta de UUIDs y otros datos
- **Domain Events**: Integración con sistema de eventos para notificaciones tiempo real

### Tests

Se incluyen tests e2e comprehensivos que cubren:
- ✅ Creación exitosa con datos completos
- ✅ Creación con datos mínimos requeridos  
- ✅ Idempotencia (múltiples llamadas con mismo ID)
- ✅ Autenticación y autorización
- ✅ Validación de UUID en URL
- ✅ Manejo de errores

Para ejecutar los tests:

```bash
# Tests específicos del endpoint PUT
npm run test:e2e -- --testNamePattern="PUT /v2/chats"
```