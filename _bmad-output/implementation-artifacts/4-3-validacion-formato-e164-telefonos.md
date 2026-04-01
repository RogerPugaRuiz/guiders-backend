# Historia 4.3: Validación de Formato E.164 para Teléfonos

Status: ready-for-dev

## Historia

Como desarrollador,
quiero que los teléfonos se validen y normalicen a formato E.164 antes de enviarlos a LeadCars,
para cumplir con el formato obligatorio de la API v2.4 (`+CODIGOPAIS + NUMERO`, ej: `+34612345678`).

## Criterios de Aceptación

1. **Dado** un teléfono `612345678` (sin prefijo de país)
   **Cuando** se construye el request para LeadCars
   **Entonces** se envía como `+34612345678` (España como país por defecto, configurable)

2. **Dado** un teléfono `+34612345678` (ya en formato E.164)
   **Cuando** se construye el request
   **Entonces** se envía tal cual sin modificación

3. **Dado** un teléfono con formato no E.164 (ej: `612 34 56 78`, `612-345-678`, `(612) 345-678`)
   **Cuando** se construye el request
   **Entonces** se elimina todo lo que no sean dígitos, se antepone `+34` y se envía como `+34612345678`

4. **Dado** datos de contacto con `telefono` presente pero sin `movil`
   **Cuando** se envía a LeadCars
   **Entonces** solo se incluye el campo `telefono` (normalizado)
   **Y** el campo `movil` NO aparece en el request

5. **Dado** datos de contacto con `telefono` y `movil` ambos presentes
   **Cuando** se construye el request
   **Entonces** ambos se incluyen normalizados a E.164

6. **Dado** un teléfono vacío o `null`
   **Cuando** se intenta normalizar
   **Entonces** se omite el campo del request (no se envía)

7. **Dado** el código de país configurado en `LeadcarsConfig` (campo `defaultCountryCode?: string`)
   **Cuando** se normaliza un teléfono sin prefijo
   **Entonces** se usa el código configurado (ej. `'ES'` → `+34`, `'PT'` → `+351`)
   **Y** si no está configurado, se asume `'ES'` como default

## Tareas / Subtareas

- [ ] Crear `PhoneNormalizationService` o función utilitaria en el adapter (AC: 1-7)
  - [ ] Implementar `normalizeToE164(phone: string, defaultCountryCode?: string): string | null`
  - [ ] Si el teléfono ya empieza con `+`, retornarlo tal cual (ya es E.164)
  - [ ] Si no tiene `+`, eliminar todos los caracteres no numéricos y añadir el prefijo del país
  - [ ] Mapeo de código de país: `{ ES: '+34', PT: '+351', FR: '+33', DE: '+49', IT: '+39', GB: '+44' }` (extensible)
  - [ ] Si el teléfono resultante queda vacío o tiene menos de 7 dígitos, retornar `null`
- [ ] Añadir campo `defaultCountryCode?: string` a `LeadcarsConfig` (AC: 7)
- [ ] Integrar normalización en `buildCreateLeadRequest()` del adapter (AC: 1-6)
  - [ ] Normalizar `contactData.telefono` antes de asignarlo a `request.telefono`
  - [ ] Normalizar campo `movil` si existe (de `contactData.additionalData?.movil`)
  - [ ] Omitir el campo si `normalizeToE164` retorna `null`
- [ ] Escribir tests unitarios para `normalizeToE164` (AC: 1-7)
  - [ ] Test: teléfono español sin prefijo → `+34XXXXXXXXX`
  - [ ] Test: teléfono ya en E.164 → sin cambios
  - [ ] Test: teléfono con espacios/guiones → normalizado correctamente
  - [ ] Test: teléfono vacío → `null`
  - [ ] Test: teléfono con código de país diferente al default

## Notas de Desarrollo

### Función de normalización

```typescript
// En leadcars-crm-sync.adapter.ts (puede ser método privado)

private readonly COUNTRY_PREFIXES: Record<string, string> = {
  ES: '+34',
  PT: '+351',
  FR: '+33',
  DE: '+49',
  IT: '+39',
  GB: '+44',
  MX: '+52',
  AR: '+54',
  CO: '+57',
  CL: '+56',
};

private normalizeToE164(
  phone: string | undefined,
  countryCode: string = 'ES',
): string | null {
  if (!phone) return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  // Ya está en E.164
  if (trimmed.startsWith('+')) {
    const digitsOnly = trimmed.replace(/\D/g, '');
    return digitsOnly.length >= 7 ? trimmed.replace(/[\s\-()]/g, '') : null;
  }

  // Eliminar todo excepto dígitos
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return null;

  const prefix = this.COUNTRY_PREFIXES[countryCode.toUpperCase()] ?? '+34';
  return `${prefix}${digits}`;
}
```

### Integración en `buildCreateLeadRequest`

```typescript
// En buildCreateLeadRequest() — después de Story 4.1:
const defaultCountryCode = (config as any).defaultCountryCode || 'ES';

const normalizedTelefono = this.normalizeToE164(
  contactData.telefono,
  defaultCountryCode,
);
if (normalizedTelefono) request.telefono = normalizedTelefono;

// movil desde additionalData (si existe)
const rawMovil = contactData.additionalData?.movil as string | undefined;
const normalizedMovil = this.normalizeToE164(rawMovil, defaultCountryCode);
if (normalizedMovil) request.movil = normalizedMovil;
```

### Añadir `defaultCountryCode` a `LeadcarsConfig`

```typescript
export interface LeadcarsConfig {
  clienteToken: string;
  useSandbox: boolean;
  concesionarioId: number;
  sedeId?: number;
  campanaCode?: string;
  tipoLeadDefault: number;
  defaultCountryCode?: string; // ✅ Nuevo: 'ES' por defecto
}
```

### Dependencia con Story 4.1

Esta historia **depende de Story 4.1** (debe completarse primero). Los campos `telefono` y `movil` en el request ya deben tener los nombres correctos según Story 4.1.

### Archivos a tocar

| Archivo                                                               | Acción                                                         |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `leads/infrastructure/adapters/leadcars/leadcars.types.ts`            | Añadir `defaultCountryCode` a `LeadcarsConfig`                 |
| `leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts` | Añadir `normalizeToE164`, integrar en `buildCreateLeadRequest` |

### Referencias

- Documentación E.164: formato `+[código país][número]`, sin espacios ni guiones
- AGENTS.md leads — tabla de discrepancias, fila "Teléfono": `src/context/leads/AGENTS.md`
- `buildCreateLeadRequest` actual: `src/context/leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts` líneas 260-318
- FR-19 en epics.md: teléfonos en E.164 obligatorio

## Registro del Agente Dev

### Modelo Utilizado

claude-sonnet-4.6 (github-copilot/claude-sonnet-4.6)

### Notas de Completación

### Lista de Ficheros
