# Configuración de GitHub Secrets para Versiones de Consentimiento

## 📋 Resumen

Este documento explica cómo configurar los secrets de GitHub Actions para gestionar versiones de consentimiento por entorno (staging y producción).

---

## 🎯 Secrets Disponibles

Los workflows ahora soportan dos secrets opcionales para controlar la versión de consentimiento:

| Secret | Entorno | Valor por Defecto | Descripción |
|--------|---------|-------------------|-------------|
| `STAGING_CONSENT_VERSION` | Staging | `v1.4.0` | Versión de consentimiento en staging |
| `PROD_CONSENT_VERSION` | Producción | `v1.4.0` | Versión de consentimiento en producción |

**IMPORTANTE:** Si no configuras estos secrets, el sistema usará `v1.4.0` por defecto.

---

## 🔧 Cómo Configurar los Secrets

### Paso 1: Acceder a la Configuración de Secrets

1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral, selecciona **Secrets and variables** → **Actions**
4. Haz clic en **New repository secret**

### Paso 2: Crear Secret para Staging

**Nombre del Secret:**
```
STAGING_CONSENT_VERSION
```

**Valor:**
```
v1.4.0
```

**Ejemplo para otra versión:**
```
v1.5.0
```

### Paso 3: Crear Secret para Producción

**Nombre del Secret:**
```
PROD_CONSENT_VERSION
```

**Valor:**
```
v1.4.0
```

**Ejemplo para otra versión:**
```
v1.5.0
```

---

## 📝 Ejemplos de Configuración

### Escenario 1: Misma Versión en Todos los Entornos

**Configuración:**
- No crear ningún secret
- El sistema usará `v1.4.0` en todos los entornos

**Cuándo usar:**
- Configuración simple
- No necesitas testear nuevas versiones primero

### Escenario 2: Testing en Staging

**Configuración:**
```bash
# Staging (para testing)
STAGING_CONSENT_VERSION=v1.5.0

# Producción (versión estable)
PROD_CONSENT_VERSION=v1.4.0
```

**Cuándo usar:**
- Quieres probar una nueva versión en staging
- Antes de desplegar a producción

### Escenario 3: Rollback Rápido

**Situación:** Descubriste un problema con v1.5.0 en producción

**Acción:**
1. Editar el secret `PROD_CONSENT_VERSION`
2. Cambiar de `v1.5.0` a `v1.4.0`
3. Hacer un nuevo deploy (push a `main`)

**Tiempo de rollback:** ~10 minutos (tiempo de deploy)

---

## 🚀 Cómo Actualizar la Versión

### Método 1: Actualizar Secret (Recomendado)

**Para Staging:**
1. Ve a **Settings** → **Secrets and variables** → **Actions**
2. Busca `STAGING_CONSENT_VERSION`
3. Haz clic en **Update**
4. Cambia el valor (ej: `v1.5.0`)
5. Haz clic en **Update secret**
6. Haz un push a `develop` para desplegar

**Para Producción:**
1. Busca `PROD_CONSENT_VERSION`
2. Actualiza el valor
3. Haz un push a `main` para desplegar

### Método 2: Sin Secrets (Por Defecto)

Si no configuraste secrets:
1. Edita `src/context/consent/domain/config/consent-version.config.ts`
2. Cambia `DEFAULT_CONSENT_VERSION = 'v1.4.0'` a la nueva versión
3. Commit y push
4. Se desplegará la misma versión en todos los entornos

---

## 🔍 Verificación de Versión Desplegada

### Verificar en Staging

```bash
# SSH al servidor de staging
ssh user@staging-server

# Verificar .env
cd /var/www/guiders-backend-staging
grep CONSENT_VERSION .env.staging

# Output esperado:
# CONSENT_VERSION_CURRENT=v1.4.0
```

### Verificar en Producción

```bash
# SSH al servidor de producción
ssh user@prod-server

# Verificar .env
cd /var/www/guiders-backend
grep CONSENT_VERSION .env.production

# Output esperado:
# CONSENT_VERSION_CURRENT=v1.5.0
```

### Verificar en Runtime (API)

```bash
# Staging
curl https://staging-api.guiders.app/api/visitors/identify \
  -H "Content-Type: application/json" \
  -d '{
    "fingerprint": "test",
    "domain": "test.com",
    "apiKey": "test-key",
    "hasAcceptedPrivacyPolicy": true
  }'

# La respuesta mostrará la versión usada en los logs
```

---

## 📊 Flujo de Deployment con Versiones

### Flujo Completo: Testing → Staging → Producción

**1. Desarrollo Local (v1.5.0)**
```bash
# Editar consent-version.config.ts
export const DEFAULT_CONSENT_VERSION = 'v1.5.0';

# Testing local
npm run test:unit
npm run test:e2e
```

**2. Deploy a Staging**
```bash
# Configurar secret
# GitHub → Settings → Secrets → STAGING_CONSENT_VERSION=v1.5.0

# Push a develop
git checkout develop
git push origin develop

# Esperar deployment (~5-10 min)
```

**3. Verificar en Staging**
```bash
# Probar funcionalidad
# Verificar logs
# Validar comportamiento
```

**4. Deploy a Producción**
```bash
# Configurar secret
# GitHub → Settings → Secrets → PROD_CONSENT_VERSION=v1.5.0

# Merge a main
git checkout main
git merge develop
git push origin main

# Esperar deployment (~5-10 min)
```

**5. Monitoreo Post-Deploy**
```bash
# Verificar logs en producción
# Monitorear errores
# Validar métricas de consentimiento
```

---

## ⚠️ Troubleshooting

### Error: "Versión de consentimiento inválida"

**Causa:** El formato de la versión en el secret es incorrecto

**Solución:**
```bash
# ❌ Incorrecto
STAGING_CONSENT_VERSION=1.5.0  # Falta 'v'
STAGING_CONSENT_VERSION=v1     # Falta versión menor

# ✅ Correcto
STAGING_CONSENT_VERSION=v1.5.0
STAGING_CONSENT_VERSION=v1.5.0-beta.1
```

### Secret No Se Aplica

**Causa:** GitHub Actions caché del workflow

**Solución:**
1. Edita el secret
2. Haz un nuevo push (puede ser vacío)
```bash
git commit --allow-empty -m "Trigger deployment with new consent version"
git push
```

### Versión Incorrecta en Deployment

**Diagnóstico:**
```bash
# Ver los logs del workflow en GitHub Actions
# Buscar: "🔧 Creando configuración para staging..."
# Verificar: CONSENT_VERSION_CURRENT=v1.X.X
```

**Causas comunes:**
- Secret con nombre incorrecto
- Typo en el valor del secret
- Deployment antiguo (hacer nuevo deploy)

---

## 🔐 Seguridad

### Mejores Prácticas

1. **No hardcodees versiones sensibles:** Usa secrets para configuración por entorno
2. **Documenta cambios:** Registra en CHANGELOG cuando cambies versiones
3. **Auditoría:** Los cambios de secrets quedan registrados en GitHub
4. **Acceso limitado:** Solo administradores deberían poder editar secrets

### Auditoría de Cambios

Para ver quién cambió un secret:
1. Ve a **Settings** → **Secrets and variables** → **Actions**
2. Haz clic en el secret
3. Revisa el historial en la parte inferior

---

## 📚 Referencias

| Documento | Descripción |
|-----------|-------------|
| `docs/CONSENT_VERSION_MANAGEMENT.md` | Guía completa de gestión de versiones |
| `docs/CONSENT_VERSION_FORMAT.md` | Formatos válidos de versión |
| `src/context/consent/domain/config/consent-version.config.ts` | Configuración centralizada |
| `.github/workflows/deploy-staging.yml` | Workflow de staging |
| `.github/workflows/deploy-production.yml` | Workflow de producción |

---

## 🆘 Soporte

**¿Dudas o problemas?**
- Revisa los logs del workflow en GitHub Actions
- Consulta `docs/CONSENT_VERSION_MANAGEMENT.md`
- Contacta al equipo de backend

---

**Versión del documento**: 1.0.0
**Última actualización**: Octubre 2025
**Mantenido por**: Equipo de Backend
