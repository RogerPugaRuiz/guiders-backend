# Sistema de Limpieza Automática de Sesiones

## Descripción
Sistema automático para desactivar las sesiones que no tienen respuesta o heartbeat activo, implementado usando schedulers y comandos CQRS.

## Componentes Implementados

### 1. SessionCleanupScheduler
- **Ubicación**: `src/context/visitors-v2/infrastructure/schedulers/session-cleanup.scheduler.ts`
- **Funcionalidad**: Ejecuta limpieza automática cada 5 minutos usando `@Cron`
- **Configuración**: Variables de entorno `SESSION_CLEANUP_ENABLED` y `SESSION_CLEANUP_BATCH_SIZE`
- **Mejoras en logs**: Incluye duración de ejecución y emojis para facilitar monitoreo

### 2. CleanExpiredSessionsCommand & Handler
- **Comando**: `src/context/visitors-v2/application/commands/clean-expired-sessions.command.ts`
- **Handler**: `src/context/visitors-v2/application/commands/clean-expired-sessions.command-handler.ts`
- **Funcionalidad**: Procesa la limpieza por lotes usando el patrón CQRS

### 3. Extensión del Repositorio
- **Método**: `findWithActiveSessions()` en VisitorV2Repository
- **Implementación**: Consulta MongoDB para encontrar visitantes con sesiones activas (sin `endedAt`)

### 4. Proveedor de Servicio de Dominio
- **Archivo**: `src/context/visitors-v2/infrastructure/providers/session-management-service.provider.ts`
- **Función**: Configura la inyección de dependencias para el SessionManagementDomainService

## Configuración de Entorno

```bash
# Habilitar/deshabilitar la limpieza automática
SESSION_CLEANUP_ENABLED=true

# Tamaño del lote para procesamiento
SESSION_CLEANUP_BATCH_SIZE=100

# Timeout de sesión en milisegundos (ya existente)
SESSION_TIMEOUT_MS=900000
```

## Funcionamiento

1. **Programación**: El scheduler se ejecuta automáticamente cada 5 minutos
2. **Detección**: Busca visitantes con sesiones activas sin heartbeat reciente
3. **Validación**: Usa SessionManagementDomainService para verificar expiración
4. **Limpieza**: Finaliza las sesiones expiradas estableciendo `endedAt`
5. **Logging**: Registra resultados de la operación con duración y emojis visuales

**Tiempo máximo de cierre de sesión:**

- ANON: 5 min timeout + 5 min scheduler = **máximo 10 minutos**
- ENGAGED: 15 min timeout + 5 min scheduler = **máximo 20 minutos**
- LEAD: 30 min timeout + 5 min scheduler = **máximo 35 minutos**
- CONVERTED: 60 min timeout + 5 min scheduler = **máximo 65 minutos**

## Integración en Módulos

- **app.module.ts**: Configurado con `ScheduleModule.forRoot()`
- **visitors-v2.module.ts**: Registra el scheduler y providers necesarios

## Modo Manual

El scheduler también permite ejecución manual para testing:

```typescript
await this.sessionCleanupScheduler.cleanExpiredSessions();
```

## Monitoreo

Los logs incluyen:
- Número de sesiones procesadas
- Número de sesiones finalizadas
- Errores en el procesamiento
- Tiempo de ejecución

## Testing

Para probar el sistema:
1. Crear sesiones de prueba con heartbeat expirado
2. Ejecutar manualmente el comando o esperar el cron
3. Verificar que las sesiones se marcan como finalizadas