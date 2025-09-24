# Sistema de Colas de Chat V2

## 📋 Resumen

El sistema de colas de chat está **implementado pero desactivado por defecto**, permitiendo activarlo cuando sea necesario sin afectar el funcionamiento actual del chat.

## 🔧 Configuración

### Variables de Entorno

Configura estas variables en tu `.env` o variables de entorno del sistema:

```bash
# Activar/Desactivar modo cola (por defecto: false)
CHAT_QUEUE_MODE_ENABLED=true

# Tiempo máximo en cola antes de asignación automática en segundos (por defecto: 300)
CHAT_QUEUE_MAX_WAIT_SECONDS=600

# Número máximo de chats en cola por departamento (por defecto: 50)
CHAT_QUEUE_MAX_SIZE_PER_DEPARTMENT=100

# Notificar a comerciales sobre nuevos chats en cola (por defecto: true)
CHAT_QUEUE_NOTIFY_COMMERCIALS=false
```

## 🚀 Funcionamiento

### Modo Cola Desactivado (Por Defecto)
- Los chats se asignan automáticamente a comerciales disponibles
- Comportamiento actual sin cambios
- Endpoint `/pending-queue` retorna array vacío

### Modo Cola Activado
- Los chats van primero a una cola de pendientes
- Los comerciales pueden ver la cola con `/pending-queue`
- Los chats se asignan manualmente o por timeout
- **Excepción**: Chats con prioridad `URGENT` se asignan directamente

## 📡 Endpoints

### GET `/v2/chats/pending-queue`

Obtiene la cola de chats pendientes.

**Parámetros de consulta:**
- `department` (opcional): Filtrar por departamento
- `limit` (opcional): Limitar número de resultados

**Respuesta:**
```json
[
  {
    "id": "chat-uuid",
    "status": "PENDING",
    "priority": "HIGH",
    "visitorId": "visitor-uuid",
    "totalMessages": 1,
    "createdAt": "2025-01-01T10:00:00Z",
    "visitorInfo": {
      "name": "Juan Pérez",
      "email": "juan@example.com"
    }
  }
]
```

## 🏗️ Arquitectura

### Componentes Implementados

1. **Domain Service**: `ChatQueueConfigService`
   - Interfaz: `src/context/conversations-v2/domain/services/chat-queue-config.service.ts`
   - Implementación: `src/context/conversations-v2/infrastructure/services/chat-queue-config.service.impl.ts`

2. **Query Handler**: `GetPendingQueueQueryHandler`
   - Query: `src/context/conversations-v2/application/queries/get-pending-queue.query.ts`
   - Handler: `src/context/conversations-v2/application/queries/get-pending-queue.query-handler.ts`

3. **Repository Methods**:
   - `getPendingQueue()`: Ya implementado en MongoDB
   - `getAvailableChats()`: Ya implementado

4. **Controller Endpoint**:
   - Ruta: `GET /v2/chats/pending-queue`
   - Conectado al query handler

## 🔄 Lógica de Asignación

### Flujo Condicional

```typescript
// En CreateChatWithMessageCommandHandler
const shouldUseQueue = this.queueConfigService.shouldUseQueue(chatId, priority);

if (shouldUseQueue) {
  // Crear chat pendiente → Va a cola
  // Los comerciales lo ven en /pending-queue
  // Asignación manual o por timeout
} else {
  // Crear chat con auto-asignación inmediata (comportamiento actual)
  // Se asigna directamente a comercial disponible
}
```

### Reglas de Prioridad

- **URGENT**: Siempre asignación directa (ignora modo cola)
- **HIGH/NORMAL/MEDIUM/LOW**: Respeta configuración del modo cola

## 🧪 Testing

### Ejecutar Tests

```bash
# Tests unitarios del servicio de configuración
npm run test:unit -- --testPathPattern="chat-queue-config.service.impl.spec.ts"

# Tests de integración completos
npm run test:int

# Tests E2E
npm run test:e2e
```

### Casos de Prueba

1. **Configuración por defecto** (modo desactivado)
2. **Activación por variables de entorno**
3. **Comportamiento con prioridades**
4. **Endpoint retorna cola vacía cuando desactivado**
5. **Endpoint retorna chats cuando activado**

## 📊 Monitoreo

### Logs Relevantes

```bash
# Buscar logs del sistema de colas
grep "cola de chats pendientes" logs/app.log

# Estado de configuración al inicio
grep "ChatQueueConfig" logs/app.log
```

### Métricas Sugeridas

- Número de chats en cola por departamento
- Tiempo promedio en cola
- Tasa de asignación manual vs automática
- Chats que exceden tiempo máximo en cola

## ⚠️ Consideraciones

### Migración Segura

1. **Activar gradualmente**: Empezar con un departamento
2. **Monitorear métricas**: Tiempo de respuesta y satisfacción
3. **Rollback fácil**: Cambiar `CHAT_QUEUE_MODE_ENABLED=false`

### Limitaciones Actuales

- No hay notificaciones push a comerciales
- No hay métricas en tiempo real
- Cola global (no por skills/departamentos avanzados)

### Próximos Pasos Recomendados

1. **WebSocket notifications** cuando llegan chats a cola
2. **Métricas dashboard** para supervisores
3. **Skills-based routing** avanzado
4. **Auto-escalation** por tiempo en cola

## 🔧 Troubleshooting

### Problema: Endpoint retorna siempre array vacío
**Solución**: Verificar `CHAT_QUEUE_MODE_ENABLED=true`

### Problema: Chats no van a cola
**Solución**: Revisar prioridad (URGENT se asigna directo)

### Problema: Tests fallan
**Solución**: Limpiar variables de entorno entre tests

## 👥 Equipo

- **Status**: ✅ Implementado y probado
- **Modo actual**: 🔒 Desactivado (comportamiento seguro)
- **Activación**: 🚀 Lista para producción cuando se necesite