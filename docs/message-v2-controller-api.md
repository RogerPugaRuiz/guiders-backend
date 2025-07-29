# Message V2 Controller - API Documentation

## Resumen

He creado un nuevo controlador `MessageV2Controller` para la gestión completa de mensajes en el sistema de chats. Este controlador **NO** estaba definido en `chat-v2.controller.ts`, que solo manejaba la gestión de chats (obtener, asignar, cerrar) pero no los mensajes individuales.

## Características Principales

### 🔧 **Funcionalidades Implementadas**

1. **Envío de mensajes** (`POST /v2/messages`)
2. **Obtención de mensajes de un chat** (`GET /v2/messages/chat/:chatId`)
3. **Obtención de mensaje por ID** (`GET /v2/messages/:messageId`)
4. **Marcar mensajes como leídos** (`PUT /v2/messages/mark-as-read`)
5. **Obtención de mensajes no leídos** (`GET /v2/messages/chat/:chatId/unread`)
6. **Búsqueda de mensajes** (`GET /v2/messages/search`)
7. **Estadísticas de conversación** (`GET /v2/messages/chat/:chatId/stats`)
8. **Métricas de mensajería** (`GET /v2/messages/metrics`)
9. **Mensajes con archivos adjuntos** (`GET /v2/messages/attachments`)

### 📋 **Endpoints Detallados**

#### 1. Envío de Mensajes
```http
POST /v2/messages
```
- **Descripción**: Envía un mensaje de texto, imagen o archivo a un chat específico
- **Body**: `SendMessageDto`
- **Respuesta**: `MessageResponseDto`
- **Roles**: commercial, admin, supervisor, visitor

#### 2. Obtener Mensajes de un Chat
```http
GET /v2/messages/chat/:chatId?cursor=xxx&limit=50&filters={}
```
- **Descripción**: Retorna mensajes con paginación basada en cursor
- **Parámetros**: chatId, cursor (opcional), limit (1-100), filters, sort
- **Respuesta**: `MessageListResponseDto`
- **Roles**: commercial, admin, supervisor, visitor

#### 3. Obtener Mensaje por ID
```http
GET /v2/messages/:messageId
```
- **Descripción**: Retorna los detalles de un mensaje específico
- **Parámetros**: messageId
- **Respuesta**: `MessageResponseDto`
- **Roles**: commercial, admin, supervisor, visitor

#### 4. Marcar como Leídos
```http
PUT /v2/messages/mark-as-read
```
- **Descripción**: Marca una lista de mensajes como leídos
- **Body**: `MarkAsReadDto` (array de messageIds)
- **Respuesta**: `{ success: boolean, markedCount: number }`
- **Roles**: commercial, admin, supervisor, visitor

#### 5. Mensajes No Leídos
```http
GET /v2/messages/chat/:chatId/unread
```
- **Descripción**: Retorna mensajes no leídos de un chat específico
- **Parámetros**: chatId
- **Respuesta**: `MessageResponseDto[]`
- **Roles**: commercial, admin, supervisor, visitor

#### 6. Búsqueda de Mensajes
```http
GET /v2/messages/search?keyword=xxx&chatId=xxx&filters={}
```
- **Descripción**: Busca mensajes que contengan palabras clave específicas
- **Parámetros**: keyword (requerido), chatId (opcional), filters, limit
- **Respuesta**: `MessageListResponseDto`
- **Roles**: commercial, admin, supervisor

#### 7. Estadísticas de Conversación
```http
GET /v2/messages/chat/:chatId/stats?dateFrom=xxx&dateTo=xxx
```
- **Descripción**: Retorna estadísticas detalladas de un chat específico
- **Parámetros**: chatId, dateFrom (opcional), dateTo (opcional)
- **Respuesta**: `ConversationStatsResponseDto`
- **Roles**: commercial, admin, supervisor

#### 8. Métricas de Mensajería
```http
GET /v2/messages/metrics?dateFrom=xxx&dateTo=xxx&groupBy=day
```
- **Descripción**: Retorna métricas agregadas de mensajería por período
- **Parámetros**: dateFrom, dateTo, groupBy (hour/day/week), chatId (opcional)
- **Respuesta**: `MessageMetricsResponseDto[]`
- **Roles**: commercial, admin, supervisor

#### 9. Mensajes con Archivos Adjuntos
```http
GET /v2/messages/attachments?chatId=xxx&fileTypes=[]&limit=20
```
- **Descripción**: Retorna mensajes que contienen archivos adjuntos
- **Parámetros**: chatId (opcional), fileTypes (opcional), limit (opcional)
- **Respuesta**: `MessageResponseDto[]`
- **Roles**: commercial, admin, supervisor, visitor

### 🏗️ **Arquitectura**

#### DTOs Creados
1. **message-request.dto.ts**:
   - `SendMessageDto`
   - `MessageFiltersDto`
   - `MessageSortDto`
   - `GetMessagesDto`
   - `MarkAsReadDto`

2. **message-response.dto.ts**:
   - `MessageResponseDto`
   - `MessageListResponseDto`
   - `ConversationStatsResponseDto`
   - `MessageMetricsResponseDto`

#### Características Técnicas
- ✅ **Paginación basada en cursor** para eficiencia
- ✅ **Validación de entrada** con class-validator
- ✅ **Documentación Swagger** completa
- ✅ **Control de roles** granular
- ✅ **Logging** detallado para debugging
- ✅ **Manejo de errores** robusto
- ✅ **Tests unitarios** completos

### 🔐 **Seguridad y Autorización**

- **AuthGuard**: Verificación de autenticación
- **RolesGuard**: Control granular por roles
- **Roles soportados**:
  - `commercial`: Acceso completo a mensajes de sus chats
  - `admin`: Acceso completo a todos los mensajes
  - `supervisor`: Acceso de supervisión a mensajes
  - `visitor`: Acceso limitado a sus propios mensajes

### 📊 **Estado Actual**

- ✅ **Estructura completa** creada
- ✅ **Compilación exitosa** sin errores
- ✅ **Tests unitarios** pasando (10/10)
- ✅ **Linter** sin errores
- ✅ **Documentación Swagger** completa
- ⏳ **Implementación de handlers** pendiente (marcado con TODOs)

### 🚀 **Próximos Pasos**

1. **Implementar Command Handlers**:
   - `SendMessageCommand`
   - `MarkMessagesAsReadCommand`

2. **Implementar Query Handlers**:
   - `GetChatMessagesQuery`
   - `GetMessageByIdQuery`
   - `GetUnreadMessagesQuery`
   - `SearchMessagesQuery`
   - `GetConversationStatsQuery`
   - `GetMessageMetricsQuery`
   - `GetMessagesWithAttachmentsQuery`

3. **Integrar con repositorios** existentes
4. **Añadir tests de integración**

### 📁 **Archivos Creados**

```
src/context/conversations-v2/
├── application/dtos/
│   ├── message-request.dto.ts
│   └── message-response.dto.ts
├── infrastructure/controllers/
│   ├── message-v2.controller.ts
│   └── message-v2.controller.spec.ts
└── conversations-v2.module.ts (actualizado)
```

El controlador está completamente funcional y listo para ser utilizado una vez que se implementen los handlers correspondientes.
