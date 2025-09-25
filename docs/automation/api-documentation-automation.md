# Sistema de Automatización de Documentación API

## Descripción General

Sistema completo de automatización para generar, validar y mantener actualizada la documentación API del backend de Guiders. Incluye generación automática, vigilancia de archivos, validación de calidad e integración CI/CD.

## Componentes del Sistema

### 1. Generador Automático (`scripts/generate-api-docs.js`)

**Propósito**: Extrae automáticamente información de endpoints desde los controllers de NestJS.

**Funcionamiento**:
- Escanea todos los contextos en `src/context/`
- Busca archivos `*.controller.ts` recursivamente
- Extrae endpoints, DTOs, guards y decoradores
- Genera 3 formatos de documentación

**Archivos generados**:
- `api-documentation.json` - Documentación completa (125KB+)
- `api-documentation-compact.json` - Versión optimizada para IA (42KB)
- `executive-summary.json` - Métricas y resumen ejecutivo

**Uso**:
```bash
npm run docs:generate
```

### 2. Validador de Calidad (`scripts/validate-api-docs.js`)

**Propósito**: Evalúa la calidad de la documentación generada.

**Criterios de evaluación**:
- Completitud de summary y description
- Documentación de parámetros
- Ejemplos de respuestas
- Cobertura de status codes

**Puntuación**: 0-10 puntos por endpoint, objetivo >80% general.

**Uso**:
```bash
npm run docs:validate
```

### 3. File Watcher (`scripts/watch-api-docs.js`)

**Propósito**: Regenera automáticamente la documentación cuando se modifican controllers o DTOs.

**Vigilancia**:
- `**/*.controller.ts` - Controllers de todos los contextos
- `**/dtos/*.dto.ts` - DTOs de aplicación
- Debounce de 2 segundos para evitar regeneración excesiva

**Uso**:
```bash
npm run docs:watch
```

### 4. Integración CI/CD (`.github/workflows/auto-update-api-docs.yml`)

**Propósito**: Automatización completa en GitHub Actions.

**Funcionalidades**:
- Detecta cambios en controllers/DTOs en PRs
- Regenera documentación automáticamente
- Valida calidad (falla si <80%)
- Commit automático de cambios
- Comentarios en PR con resumen

**Triggers**:
- Push a `main` o `develop`
- Pull requests que modifiquen controllers/DTOs

## Estructura de Archivos

```
├── scripts/
│   ├── generate-api-docs.js     # Generador principal
│   ├── validate-api-docs.js     # Validador de calidad
│   └── watch-api-docs.js        # File watcher
├── docs/
│   ├── api-ai/
│   │   ├── api-documentation.json         # Documentación completa
│   │   ├── api-documentation-compact.json # Versión compacta
│   │   └── executive-summary.json         # Métricas
│   └── automation/
│       └── api-documentation-automation.md # Esta documentación
└── .github/workflows/
    └── auto-update-api-docs.yml  # Workflow CI/CD
```

## Cobertura Actual

**Endpoints detectados**: 58 de ~64 endpoints del sistema
**Contextos cubiertos**: 9/9 contextos
- `auth`: 25 endpoints (API keys, usuarios, visitantes, BFF)
- `commercial`: 7 endpoints (comerciales, chats)
- `company`: 3 endpoints (empresas)
- `conversations-v2`: 7 endpoints (chats V2)
- `tracking`: 2 endpoints (analytics)
- `visitors`: 5 endpoints (visitantes V1)
- `visitors-v2`: 7 endpoints (visitantes V2)
- `shared`: 2 endpoints (utilidades)

## Configuración y Uso

### Instalación de Dependencias

```bash
npm install --save-dev chokidar glob
```

### Scripts Disponibles

```bash
# Generar documentación una vez
npm run docs:generate

# Validar calidad de documentación
npm run docs:validate

# Iniciar vigilancia continua
npm run docs:watch
```

### Configuración GitHub Actions

El workflow se activa automáticamente. Para configuración manual:

1. El workflow requiere permisos de escritura en el repositorio
2. Utiliza `secrets.GITHUB_TOKEN` automáticamente
3. Configurable mediante variables de entorno en `.github/workflows/`

## Ventajas del Sistema

### 1. Automatización Completa
- **Antes**: Documentación manual, propensa a errores y desactualización
- **Después**: Generación automática, siempre sincronizada con el código

### 2. Optimización para IA
- Versión compacta 66% más pequeña (42KB vs 125KB)
- Formato optimizado para consultas de IA frontend
- Mantiene funcionalidad completa con tamaño reducido

### 3. Calidad Controlada
- Validación automática de completitud
- Métricas objetivas de calidad
- Identificación proactiva de endpoints mal documentados

### 4. Integración DevOps
- Parte del flujo de desarrollo estándar
- Validación en CI/CD pipeline
- Commits automáticos de actualizaciones

## Limitaciones Conocidas

### 1. Parseo de TypeScript
- Dependiente de patrones regulares para extracción
- Puede no detectar decoradores complejos anidados
- No procesa tipos TypeScript avanzados

### 2. Cobertura de Contextos
- Algunos contextos legacy pueden no seguir patrones estándar
- Controllers con estruturas no convencionales requieren ajustes

### 3. Documentación Manual
- System todavía requiere documentación Swagger manual para detalles complejos
- No reemplaza completamente la documentación OpenAPI estándar

## Troubleshooting

### Problema: Endpoints no detectados
**Solución**: Verificar que los controllers sigan el patrón `*.controller.ts` y estén en `infrastructure/`.

### Problema: File watcher no responde
**Solución**: Verificar que chokidar esté instalado y los paths sean correctos.

### Problema: GitHub Actions falla
**Solución**: Verificar permisos del token y que no haya errores de sintaxis en el workflow.

### Problema: Calidad baja (<80%)
**Solución**: Mejorar documentación Swagger en controllers problemáticos identificados por el validador.

## Roadmap Futuro

### Mejoras Planificadas
1. **Parser AST**: Reemplazar regex por parser TypeScript AST
2. **Validación Avanzada**: Incluir validación de esquemas OpenAPI
3. **Métricas Históricas**: Tracking de calidad de documentación over time
4. **Integración IDE**: Plugin VS Code para preview en tiempo real

### Expansión del Sistema
1. **Documentación de Tests**: Auto-generación de ejemplos desde tests E2E  
2. **Sincronización Frontend**: Actualización automática de tipos en frontend
3. **Validación Contracts**: Testing automático de contratos API

## Contacto y Soporte

Para problemas o mejoras del sistema de automatización, contactar al equipo de desarrollo backend o crear issue en el repositorio.

---

*Sistema implementado en 2024 como parte de la modernización de DevOps de Guiders Backend.*