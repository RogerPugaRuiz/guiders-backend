# Gestión de Versiones de Consentimiento

## 📋 Resumen

Este documento explica cómo gestionar las versiones de políticas de consentimiento de manera centralizada en el sistema.

## 🎯 Arquitectura

La configuración de versiones está **centralizada** en:
```
src/context/consent/domain/config/consent-version.config.ts
```

Todos los componentes del sistema obtienen la versión desde este único archivo, lo que facilita actualizaciones y mantenimiento.

---

## 🔧 Cómo Actualizar la Versión Actual

### Opción 1: Variable de Entorno (Recomendado para Producción)

Configura la variable de entorno `CONSENT_VERSION_CURRENT`:

```bash
# .env
CONSENT_VERSION_CURRENT=v1.5.0
```

**Ventajas:**
- Sin necesidad de recompilar el código
- Diferente versión por entorno (dev, staging, prod)
- Cambios instantáneos al reiniciar la aplicación

### Opción 2: Constante en Código (Desarrollo)

Edita el archivo de configuración:

```typescript
// src/context/consent/domain/config/consent-version.config.ts

export const DEFAULT_CONSENT_VERSION = 'v1.5.0'; // ← Actualizar aquí
```

**Prioridad:** ENV > Constante

---

## 🎛️ Control de Versiones Permitidas

### Modo Flexible (Por Defecto)

Acepta cualquier versión con formato semántico válido:

```typescript
export const ALLOWED_CONSENT_VERSIONS: string[] = []; // ← Lista vacía = modo flexible
```

**Formato válido:**
- ✅ `v1.0`, `v1.0.0`
- ✅ `v1.2.3`
- ✅ `v1.4.0-alpha.1`
- ✅ `v2.0.0-beta.2`
- ❌ `v1` (falta versión menor)
- ❌ `abc` (no es versión semántica)

### Modo Estricto (Whitelist)

Para controlar exactamente qué versiones están permitidas:

```typescript
export const ALLOWED_CONSENT_VERSIONS: string[] = [
  'v1.0.0',
  'v1.3.0',
  'v1.4.0',
  'v1.5.0',
]; // ← Solo estas versiones serán aceptadas
```

**Cuándo usar modo estricto:**
- Migración controlada entre versiones
- Compliance requiere versiones específicas
- Necesitas deprecar versiones antiguas

---

## 📝 Ejemplos de Uso

### Actualizar a v1.5.0 en Producción

**1. Configurar variable de entorno:**
```bash
# .env.production
CONSENT_VERSION_CURRENT=v1.5.0
```

**2. Reiniciar la aplicación:**
```bash
pm2 restart guiders-backend
```

### Permitir Solo Versiones Específicas

**Editar configuración:**
```typescript
// src/context/consent/domain/config/consent-version.config.ts

export const ALLOWED_CONSENT_VERSIONS: string[] = [
  'v1.4.0',
  'v1.5.0',
  'v2.0.0',
];
```

**Desplegar:**
```bash
npm run build
pm2 restart guiders-backend
```

### Aceptar Cualquier Versión v2.x

**Modo flexible con validación de patrón:**
```typescript
export const ALLOWED_CONSENT_VERSIONS: string[] = []; // Modo flexible

// El patrón CONSENT_VERSION_PATTERN valida el formato
// Acepta: v2.0.0, v2.1.0, v2.5.3, etc.
```

---

## 🧪 Testing

### Probar Nueva Versión Localmente

```bash
# 1. Configurar versión en .env.test
echo "CONSENT_VERSION_CURRENT=v1.5.0" >> .env.test

# 2. Ejecutar tests
npm run test:unit -- src/context/consent/
npm run test:e2e -- test/consent.e2e-spec.ts
```

### Verificar Versión Actual en Runtime

```typescript
import { getCurrentConsentVersion } from '@/context/consent/domain/config/consent-version.config';

console.log('Versión actual:', getCurrentConsentVersion());
// Output: v1.4.0 (o la configurada en ENV)
```

---

## 🔍 Flujo de Actualización Completo

### Escenario: Actualizar de v1.4.0 a v2.0.0

**1. Actualizar política de privacidad en el frontend**
- Publicar nueva versión de la política
- Actualizar UI para mostrar v2.0.0

**2. Backend: Permitir ambas versiones temporalmente**

```typescript
// consent-version.config.ts
export const DEFAULT_CONSENT_VERSION = 'v2.0.0'; // Nueva por defecto

export const ALLOWED_CONSENT_VERSIONS: string[] = [
  'v1.4.0', // Todavía válida (usuarios antiguos)
  'v2.0.0', // Nueva versión
];
```

**3. Desplegar backend**
```bash
npm run build
pm2 restart guiders-backend
```

**4. Frontend: Enviar v2.0.0 en nuevas solicitudes**

```typescript
await fetch('/api/visitors/identify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fingerprint: 'abc123',
    domain: 'example.com',
    apiKey: 'your-api-key',
    hasAcceptedPrivacyPolicy: true,
    consentVersion: 'v2.0.0', // ← Nueva versión
  }),
});
```

**5. Después de migración completa: Deprecar v1.4.0**

```typescript
// consent-version.config.ts (después de 3-6 meses)
export const ALLOWED_CONSENT_VERSIONS: string[] = [
  'v2.0.0', // Solo la nueva
];
```

---

## 📊 Auditoría y Monitoreo

### Ver Distribución de Versiones

```typescript
// Query MongoDB para analizar versiones en uso
db.visitor_consents.aggregate([
  { $group: { _id: "$version", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);

// Resultado:
// { _id: "v1.4.0", count: 15234 }
// { _id: "v1.3.0", count: 8765 }
// { _id: "v2.0.0", count: 432 }
```

### Logs de Versión Rechazada

Cuando una versión no está permitida (modo estricto):

```
[ConsentController] Error: Versión de consentimiento no permitida: v1.2.0
Versiones permitidas: v1.4.0, v2.0.0
```

---

## ⚠️ Consideraciones Importantes

### RGPD Compliance

- **Art. 7.1**: Debes poder demostrar qué versión aceptó cada usuario
- **Registro auditable**: Cada consentimiento registra la versión en MongoDB
- **Historial**: Los usuarios pueden ver todas las versiones que han aceptado

### Compatibilidad con SDK

El SDK puede enviar versión con o sin prefijo `v`:
- ✅ `"1.4.0"` → se normaliza a `"v1.4.0"`
- ✅ `"v1.4.0"` → se mantiene como `"v1.4.0"`

### Valores por Defecto

Si el SDK no envía `consentVersion`, se usa la versión actual:

```typescript
// Backend asigna automáticamente
const version = request.consentVersion || getCurrentConsentVersion();
// version = "v1.4.0" (o la configurada)
```

---

## 📚 Archivos Relacionados

| Archivo | Propósito |
|---------|-----------|
| `src/context/consent/domain/config/consent-version.config.ts` | **Configuración centralizada** |
| `src/context/consent/domain/value-objects/consent-version.ts` | Value Object con validación |
| `src/context/visitors-v2/application/commands/identify-visitor.command-handler.ts` | Usa versión en identificación |
| `src/context/consent/application/commands/record-consent.command-handler.ts` | Registra consentimiento |
| `docs/CONSENT_VERSION_FORMAT.md` | Formato detallado de versiones |
| `docs/SDK_CONSENT_API.md` | API para SDKs externos |

---

## 🆘 Troubleshooting

### Error: "Versión de consentimiento inválida"

**Causa:** Formato de versión incorrecto

**Solución:**
```typescript
// ❌ Incorrecto
consentVersion: "1" // Falta versión menor

// ✅ Correcto
consentVersion: "1.0" // v1.0
```

### Error: "Versión de consentimiento no permitida"

**Causa:** Modo estricto activado y versión no está en whitelist

**Solución:**
```typescript
// Agregar versión a la whitelist
export const ALLOWED_CONSENT_VERSIONS: string[] = [
  'v1.4.0',
  'v1.5.0', // ← Agregar nueva versión
];
```

### Variable de entorno no se aplica

**Causa:** Archivo `.env` no se carga correctamente

**Solución:**
```bash
# Verificar que la variable existe
echo $CONSENT_VERSION_CURRENT

# Reiniciar con variables explícitas
CONSENT_VERSION_CURRENT=v1.5.0 npm run start:dev
```

---

## 📞 Soporte

Para preguntas o problemas:
- **Documentación completa**: `docs/CONSENT_README.md`
- **Equipo Backend**: backend@tudominio.com

---

**Versión del documento**: 1.0.0
**Última actualización**: Octubre 2025
**Mantenido por**: Equipo de Backend
