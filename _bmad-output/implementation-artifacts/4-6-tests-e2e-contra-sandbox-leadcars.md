# Historia 4.6: Tests E2E contra Sandbox de LeadCars

Status: ready-for-dev

## Historia

Como desarrollador,
quiero tests de integración que ejecuten llamadas reales contra el sandbox de LeadCars para verificar que los tipos y el mapeo de campos son correctos tras la alineación con v2.4,
para detectar discrepancias antes de llegar a producción.

> **IMPORTANTE**: Estos tests requieren credenciales reales del sandbox de LeadCars configuradas en variables de entorno. Deben ejecutarse manualmente o en CI con las variables de entorno correspondientes, NO en el pipeline de tests unitarios (`npm run test:unit`).

## Criterios de Aceptación

1. **Dado** credenciales de sandbox válidas en variables de entorno (`LEADCARS_SANDBOX_TOKEN`, `LEADCARS_SANDBOX_CONCESIONARIO_ID`, etc.)
   **Cuando** se ejecuta `POST /leads` con el payload construido por `buildCreateLeadRequest`
   **Entonces** LeadCars sandbox acepta el lead sin errores de validación (HTTP 200 o 201)
   **Y** la response parsea correctamente con el tipo `LeadcarsCreateLeadResponse`

2. **Dado** un lead creado exitosamente en sandbox
   **Cuando** se ejecuta `POST /leads/{id}/chat_conversation` con la nueva estructura v2.4
   **Entonces** LeadCars sandbox acepta la conversación sin errores
   **Y** la response parsea correctamente con `LeadcarsAddConversationResponse`

3. **Dado** un lead creado exitosamente en sandbox
   **Cuando** se ejecuta `POST /leads/{id}/comments` con `{ comentario: "test E2E" }`
   **Entonces** LeadCars sandbox acepta el comentario
   **Y** la response parsea correctamente con `LeadcarsAddCommentResponse`

4. **Dado** credenciales de sandbox válidas
   **Cuando** se ejecuta `GET /concesionarios`
   **Entonces** la response parsea correctamente con `LeadcarsListConcesionariosResponse`
   **Y** retorna al menos un concesionario con `id` y `nombre`

5. **Dado** un `concesionarioId` válido del sandbox
   **Cuando** se ejecuta `GET /sedes/{concesionarioId}`
   **Entonces** la response parsea correctamente con `LeadcarsListSedesResponse`

6. **Dado** un `concesionarioId` válido del sandbox
   **Cuando** se ejecuta `GET /campanas/{concesionarioId}`
   **Entonces** la response parsea correctamente con `LeadcarsListCampanasResponse`

7. **Dado** credenciales de sandbox válidas
   **Cuando** se ejecuta `GET /tipos`
   **Entonces** la response parsea correctamente con `LeadcarsListTiposResponse`
   **Y** retorna al menos un tipo con `id` y `nombre`

8. **Dado** credenciales Automagic de sandbox (si disponibles: `LEADCARS_SANDBOX_AUTOMAGIC_USER`, `LEADCARS_SANDBOX_AUTOMAGIC_TOKEN`)
   **Cuando** se ejecuta `GET /journeys/list/summary`
   **Entonces** la response parsea correctamente con `LeadcarsListJourneysResponse`

## Tareas / Subtareas

- [ ] Crear el archivo de test: `src/context/leads/infrastructure/adapters/leadcars/__tests__/leadcars-api.e2e.spec.ts`
- [ ] Configurar el test module con `LeadcarsApiService` e `HttpModule` real (sin mocks)
- [ ] Implementar `beforeAll` — inicializar módulo y verificar variables de entorno
  - [ ] Si `LEADCARS_SANDBOX_TOKEN` no está definida, saltar todos los tests con `test.skip`
  - [ ] Leer `LEADCARS_SANDBOX_CONCESIONARIO_ID` para los tests de discovery
- [ ] Test de `POST /leads` — crear lead de prueba (AC: 1)
  - [ ] Construir payload con campos correctos post-Story 4.1: `concesionario`, `tipo_lead` (número), etc.
  - [ ] Guardar el `externalLeadId` resultante para los tests subsiguientes
- [ ] Test de `POST /leads/{id}/chat_conversation` — estructura v2.4 (AC: 2)
  - [ ] Construir payload con estructura `{ chat: { chat_id, users[], messages[] } }`
  - [ ] Verificar que la respuesta es exitosa
- [ ] Test de `POST /leads/{id}/comments` — solo `{ comentario }` (AC: 3)
  - [ ] Enviar `{ comentario: 'Test E2E automatizado desde Guiders' }`
  - [ ] Verificar que la respuesta es exitosa
- [ ] Tests de discovery: `listConcesionarios`, `listSedes`, `listCampanas`, `listTipos` (AC: 4-7)
  - [ ] Verificar que la response no es `null`/`undefined`
  - [ ] Verificar que la estructura de datos parsea sin error
- [ ] Test de Automagic (condicional) — solo si hay variables de entorno (AC: 8)
  - [ ] Saltar si `LEADCARS_SANDBOX_AUTOMAGIC_USER` no está definida
  - [ ] Verificar `listJourneys` retorna sin error

## Notas de Desarrollo

### Archivo y configuración del test

```typescript
// src/context/leads/infrastructure/adapters/leadcars/__tests__/leadcars-api.e2e.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { LeadcarsApiService } from '../leadcars-api.service';
import { LeadcarsConfig } from '../leadcars.types';

/**
 * Tests E2E contra el sandbox real de LeadCars.
 * Requieren variables de entorno:
 *   - LEADCARS_SANDBOX_TOKEN: token de autenticación (20 chars)
 *   - LEADCARS_SANDBOX_CONCESIONARIO_ID: ID del concesionario de prueba
 *   - LEADCARS_SANDBOX_TIPO_LEAD_ID: ID del tipo de lead (de GET /tipos)
 *   - LEADCARS_SANDBOX_AUTOMAGIC_USER: (opcional) email para Automagic
 *   - LEADCARS_SANDBOX_AUTOMAGIC_TOKEN: (opcional) token para Automagic
 */
describe('LeadcarsApiService — E2E Sandbox', () => {
  let service: LeadcarsApiService;
  let sandboxConfig: LeadcarsConfig;
  let createdLeadId: string;

  const hasSandboxCredentials = !!process.env.LEADCARS_SANDBOX_TOKEN;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [LeadcarsApiService],
    }).compile();

    service = module.get<LeadcarsApiService>(LeadcarsApiService);

    sandboxConfig = {
      clienteToken: process.env.LEADCARS_SANDBOX_TOKEN ?? '',
      useSandbox: true,
      concesionarioId: parseInt(
        process.env.LEADCARS_SANDBOX_CONCESIONARIO_ID ?? '0',
        10,
      ),
      tipoLeadDefault: parseInt(
        process.env.LEADCARS_SANDBOX_TIPO_LEAD_ID ?? '1',
        10,
      ),
    };
  });

  describe('cuando las credenciales de sandbox no están disponibles', () => {
    it('se deben configurar las variables de entorno para ejecutar estos tests', () => {
      if (!hasSandboxCredentials) {
        console.warn(
          'Tests E2E de LeadCars sandbox omitidos. ' +
            'Configura LEADCARS_SANDBOX_TOKEN para ejecutarlos.',
        );
      }
      expect(true).toBe(true); // Test siempre pasa — solo es informativo
    });
  });

  // Los tests reales solo se registran si hay credenciales
  if (hasSandboxCredentials) {
    describe('Discovery', () => {
      it('debe listar concesionarios correctamente', async () => {
        const result = await service.listConcesionarios(sandboxConfig);
        expect(result.isOk()).toBe(true);
        // Parseo válido — no lanza excepción
      });

      it('debe listar tipos de lead correctamente', async () => {
        const result = await service.listTipos(sandboxConfig);
        expect(result.isOk()).toBe(true);
      });

      it('debe listar sedes del concesionario correctamente', async () => {
        const result = await service.listSedes(
          sandboxConfig.concesionarioId,
          sandboxConfig,
        );
        expect(result.isOk()).toBe(true);
      });

      it('debe listar campañas del concesionario correctamente', async () => {
        const result = await service.listCampanas(
          sandboxConfig.concesionarioId,
          sandboxConfig,
        );
        expect(result.isOk()).toBe(true);
      });
    });

    describe('Crear lead', () => {
      it('debe crear un lead con los campos correctos de v2.4', async () => {
        const result = await service.createLead(
          {
            nombre: 'Test E2E',
            apellidos: 'Guiders Autotest',
            email: `e2e-test-${Date.now()}@guiders-test.com`,
            concesionario: sandboxConfig.concesionarioId,
            tipo_lead: sandboxConfig.tipoLeadDefault,
            comentario: 'Lead creado automáticamente por test E2E de Guiders',
          },
          sandboxConfig,
        );

        expect(result.isOk()).toBe(true);

        if (result.isOk()) {
          const response = result.unwrap();
          // Guardar ID para tests subsiguientes
          if (response.data?.id) {
            createdLeadId = response.data.id.toString();
          }
        }
      });
    });

    describe('Chat conversation', () => {
      it('debe registrar una conversación con estructura v2.4', async () => {
        if (!createdLeadId) {
          console.warn('Omitiendo test de chat: no hay lead creado en sandbox');
          return;
        }

        const chatId = `e2e-chat-${Date.now()}`;
        const visitorId = 'visitor-e2e-test';
        const now = new Date().toISOString();

        const result = await service.addChatConversation(
          parseInt(createdLeadId, 10),
          {
            chat: {
              chat_id: chatId,
              users: [
                {
                  _id: 'commercial',
                  user: { id: 'commercial', name: 'Agente Test' },
                },
                {
                  _id: visitorId,
                  visitor: { id: visitorId, name: 'Visitante Test' },
                },
              ],
              messages: [
                {
                  _id: `${chatId}-msg-0`,
                  message: {
                    text: '¡Hola! ¿En qué puedo ayudarte?',
                    type: 'text',
                  },
                  created_at: now,
                  user_sender: 'commercial',
                  interaction_type: 'welcome',
                },
                {
                  _id: `${chatId}-msg-1`,
                  message: {
                    text: 'Gracias por tu interés. Hasta pronto.',
                    type: 'text',
                  },
                  created_at: now,
                  user_sender: 'commercial',
                  interaction_type: 'close',
                },
              ],
            },
          },
          sandboxConfig,
        );

        expect(result.isOk()).toBe(true);
      });
    });

    describe('Comentarios', () => {
      it('debe añadir un comentario solo con { comentario }', async () => {
        if (!createdLeadId) {
          console.warn(
            'Omitiendo test de comentario: no hay lead creado en sandbox',
          );
          return;
        }

        const result = await service.addComment(
          parseInt(createdLeadId, 10),
          { comentario: 'Comentario de test E2E desde Guiders' },
          sandboxConfig,
        );

        expect(result.isOk()).toBe(true);
      });
    });

    describe('Automagic (condicional)', () => {
      const hasAutomagic = !!(
        process.env.LEADCARS_SANDBOX_AUTOMAGIC_USER &&
        process.env.LEADCARS_SANDBOX_AUTOMAGIC_TOKEN
      );

      it('debe listar journeys si hay credenciales Automagic', async () => {
        if (!hasAutomagic) {
          console.info(
            'Test Automagic omitido: sin credenciales Automagic en env',
          );
          return;
        }

        const configConAutomagic: LeadcarsConfig = {
          ...sandboxConfig,
          automagicUser: process.env.LEADCARS_SANDBOX_AUTOMAGIC_USER,
          automagicToken: process.env.LEADCARS_SANDBOX_AUTOMAGIC_TOKEN,
        };

        const result = await service.listJourneys(configConAutomagic);
        expect(result.isOk()).toBe(true);
      });
    });
  } // end if hasSandboxCredentials
});
```

### Cómo ejecutar estos tests

```bash
# Configurar variables de entorno (o en un archivo .env.test.local ignorado por git)
export LEADCARS_SANDBOX_TOKEN="tu_token_de_sandbox"
export LEADCARS_SANDBOX_CONCESIONARIO_ID="123"
export LEADCARS_SANDBOX_TIPO_LEAD_ID="1"

# Ejecutar solo los tests E2E de LeadCars
npm run test:unit -- src/context/leads/infrastructure/adapters/leadcars/__tests__/leadcars-api.e2e.spec.ts

# O con jest directamente para ver output detallado
npx jest leadcars-api.e2e.spec.ts --verbose --no-coverage
```

> **NO incluir** las variables de entorno en el repositorio. Usar un archivo `.env.test.local` o configurarlas directamente en la terminal.

### Dependencias de Stories anteriores

Estos tests **validan las implementaciones de las Stories 4.1 a 4.5**. Deben ejecutarse después de que todas las stories del Epic 4 estén implementadas:

| Dependencia | Qué valida                                                             |
| ----------- | ---------------------------------------------------------------------- |
| Story 4.1   | Campo `concesionario` (no `concesionario_id`), `tipo_lead` como número |
| Story 4.2   | Estructura `{ chat: { chat_id, users[], messages[] } }`                |
| Story 4.3   | Teléfono en E.164 (si se añade en el payload de prueba)                |
| Story 4.4   | Request de comentario solo con `{ comentario }`                        |
| Story 4.5   | `listJourneys` con headers `api-user` + `api-token`                    |

### Nota sobre el runner de tests

El archivo usa el patrón de `if (hasSandboxCredentials)` para registrar tests condicionalmente. Esto evita que los tests fallen en CI si las variables no están configuradas, sin necesidad de un runner separado.

Alternativa: añadir `testPathIgnorePatterns` en `jest.config.ts` para los archivos `.e2e.spec.ts` del contexto leads si se quiere separación más formal.

### Archivos a crear/modificar

| Archivo                                                                     | Acción        |
| --------------------------------------------------------------------------- | ------------- |
| `leads/infrastructure/adapters/leadcars/__tests__/leadcars-api.e2e.spec.ts` | Crear (nuevo) |

### Referencias

- API service: `src/context/leads/infrastructure/adapters/leadcars/leadcars-api.service.ts`
- Tipos: `src/context/leads/infrastructure/adapters/leadcars/leadcars.types.ts`
- AGENTS.md API v2.4: `src/context/leads/AGENTS.md`
- Test pattern referencia: `src/context/leads/application/commands/__tests__/save-lead-contact-data-command.handler.spec.ts`
- Epics story 4.6: `_bmad-output/planning-artifacts/epics.md` líneas 825-849

## Registro del Agente Dev

### Modelo Utilizado

claude-sonnet-4.6 (github-copilot/claude-sonnet-4.6)

### Notas de Completación

### Lista de Ficheros
