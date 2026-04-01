# Historia 2.5: Encriptación en Reposo de API Keys CRM

Status: ready-for-dev

## Historia

Como administrador,
quiero que la API key de LeadCars (`clienteToken`) se almacene cifrada en MongoDB,
para que un acceso no autorizado a la base de datos no exponga las credenciales de la cuenta LeadCars.

## Criterios de Aceptación

1. **Dado** un `EncryptionService` disponible en el contexto `leads` (reutilizando la lógica del `EncryptAdapter` de `auth`)
   **Cuando** se guarda una configuración CRM con `clienteToken`
   **Entonces** el valor se almacena cifrado con AES-256-CBC en MongoDB
   **Y** se descifra transparentemente al leer la configuración para uso interno

2. **Dado** que la variable de entorno `ENCRYPTION_KEY` no está definida (o tiene longitud incorrecta)
   **Cuando** el módulo `LeadsModule` se inicializa
   **Entonces** la aplicación lanza un error descriptivo en el arranque (fail-fast)
   **Y** el mensaje indica claramente el problema (ej. `"ENCRYPTION_KEY debe ser una cadena hex de 64 caracteres (32 bytes)"`)

3. **Dado** cualquier respuesta del endpoint `GET /v1/leads/admin/config` o `GET /v1/leads/admin/config/:id`
   **Cuando** se serializa la respuesta al cliente
   **Entonces** el `clienteToken` nunca aparece en texto plano
   **Y** se muestra un valor enmascarado (ej. `"****cde5"` — últimos 4 caracteres visibles)

4. **Dado** un error en cualquier operación CRM
   **Cuando** se loguea el error (Logger de NestJS)
   **Entonces** el `clienteToken` en texto plano no aparece en los logs
   **Y** la sanitización existente en `LeadcarsApiService.sanitizeForLog()` sigue funcionando correctamente

5. **Dado** una configuración CRM existente con `clienteToken` en texto plano (datos legacy)
   **Cuando** se actualiza vía `PUT /v1/leads/admin/config/:id`
   **Entonces** el nuevo valor se guarda cifrado
   **Y** lecturas posteriores devuelven el valor descifrado correctamente para uso interno

## Tareas / Subtareas

- [ ] Crear `CrmEncryptionService` en `leads/infrastructure/services/` (AC: 1, 2)
  - [ ] Copiar/adaptar lógica de `EncryptAdapter` (`src/context/auth/api-key/infrastructure/encrypt-adapter.ts`)
  - [ ] Inyectar `ConfigService`, leer `ENCRYPTION_KEY`
  - [ ] Implementar `encrypt(plainText: string): string` (síncrono, o async si se prefiere)
  - [ ] Implementar `decrypt(encrypted: string): string`
  - [ ] En el constructor, validar que `ENCRYPTION_KEY` existe y tiene 64 chars hex; lanzar error si no
- [ ] Integrar `CrmEncryptionService` en `MongoCrmCompanyConfigRepositoryImpl` (AC: 1, 5)
  - [ ] En `save()`: cifrar `config.clienteToken` antes de persistir
  - [ ] En `update()`: cifrar `config.clienteToken` si se actualiza
  - [ ] En `findById()`, `findByCompanyAndType()`, `findEnabledByCompanyId()`: descifrar `clienteToken` al construir el objeto de retorno
- [ ] Actualizar `CrmConfigResponseDto` para enmascarar el token en responses (AC: 3)
  - [ ] Añadir método `maskToken(token: string): string` que muestre solo los últimos 4 chars
  - [ ] Asegurar que los mappers/serializers usen `maskToken` en lugar del valor crudo
- [ ] Registrar `CrmEncryptionService` en `LeadsModule` (AC: 1, 2)
- [ ] Actualizar `.env.example` y documentación con `ENCRYPTION_KEY` (AC: 2)
- [ ] Tests unitarios para `CrmEncryptionService` (AC: 1, 2, 3)
  - [ ] Test: encrypt → decrypt produce el valor original
  - [ ] Test: fallo en arranque si `ENCRYPTION_KEY` no está definida
  - [ ] Test: fallo en arranque si `ENCRYPTION_KEY` tiene longitud incorrecta
  - [ ] Test: `maskToken` oculta correctamente el token

## Notas de Desarrollo

### Patrón de referencia — EncryptAdapter existente

El código de referencia está en `src/context/auth/api-key/infrastructure/encrypt-adapter.ts`. **No mover ni modificar** ese archivo — crear uno nuevo en `leads/infrastructure/services/crm-encryption.service.ts`.

```typescript
// Algoritmo: AES-256-CBC
// Formato almacenado: "<iv_hex>:<encrypted_hex>"
// ENCRYPTION_KEY: string hex de 64 chars (32 bytes)

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

encrypt(plainText: string): string {
  const IV_LENGTH = 16;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(KEY, 'hex'), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

decrypt(encrypted: string): string {
  const [ivHex, encryptedData] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', Buffer.from(KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Validación fail-fast en constructor

```typescript
constructor(private readonly configService: ConfigService) {
  const key = this.configService.get<string>('ENCRYPTION_KEY');
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY debe ser una cadena hex de 64 caracteres (32 bytes). Configura la variable de entorno.');
  }
}
```

### Archivos a tocar

| Archivo                                                                             | Acción                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------ |
| `leads/infrastructure/services/crm-encryption.service.ts`                           | Crear nuevo                                |
| `leads/infrastructure/persistence/impl/mongo-crm-company-config.repository.impl.ts` | Modificar (encrypt/decrypt)                |
| `leads/application/dtos/crm-config.dto.ts`                                          | Modificar (maskToken en response)          |
| `leads/leads.module.ts`                                                             | Registrar `CrmEncryptionService`           |
| `leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts`               | **No tocar** — recibe config ya descifrada |

### Schema de MongoDB — sin cambios de estructura

El schema `CrmCompanyConfigSchema` no necesita cambios de estructura. Solo el valor de `config.clienteToken` cambia de texto plano a formato `"<iv_hex>:<encrypted_hex>"`. Esto es backward compatible al nivel de MongoDB (sigue siendo un string).

### Enmascaramiento de token en DTOs

```typescript
// En CrmConfigResponseDto o en el mapper:
maskToken(token: string): string {
  if (!token || token.length <= 4) return '****';
  return '****' + token.slice(-4);
}
```

**IMPORTANTE**: Los últimos 4 caracteres del `clienteToken` original, no del valor cifrado.

### Notas sobre datos legacy

La primera vez que se lee un `clienteToken` legacy (texto plano), el `decrypt()` fallará porque el formato esperado es `"iv:data"`. Se debe manejar este caso:

```typescript
tryDecrypt(value: string): string {
  if (!value.includes(':')) {
    // Es un valor legacy en texto plano — retornar tal cual
    // (el próximo update lo cifrará automáticamente)
    return value;
  }
  return this.decrypt(value);
}
```

### Estructura del módulo

```
leads/infrastructure/services/
├── crm-sync-service.factory.ts   (existente)
└── crm-encryption.service.ts     (nuevo)
```

### Variable de entorno

```bash
# .env.example — añadir:
# Clave de 32 bytes en hex (64 chars) para cifrado AES-256
# Generar con: openssl rand -hex 32
ENCRYPTION_KEY=<generado-con-openssl-rand-hex-32>
```

### Referencias

- Implementación existente de encrypt: `src/context/auth/api-key/infrastructure/encrypt-adapter.ts`
- Interface de servicio de encriptación: `src/context/auth/api-key/application/services/api-key-encrypt-private-key.ts`
- Schema CRM config: `src/context/leads/infrastructure/persistence/schemas/crm-company-config.schema.ts`
- Repository CRM config: `src/context/leads/infrastructure/persistence/impl/mongo-crm-company-config.repository.impl.ts`
- DTOs CRM: `src/context/leads/application/dtos/crm-config.dto.ts`
- AGENTS.md leads: `src/context/leads/AGENTS.md` — sección "Known Limitations"
- AR-10 en epics.md: `ENCRYPTION_KEY=<32 bytes hex>`

## Registro del Agente Dev

### Modelo Utilizado

claude-sonnet-4.6 (github-copilot/claude-sonnet-4.6)

### Notas de Completación

### Lista de Ficheros
