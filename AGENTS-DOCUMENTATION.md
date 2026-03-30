# Sistema de Documentación AGENTS.md

Este documento explica la estructura modular de documentación del proyecto Guiders Backend usando AGENTS.md.

## Visión General

Cada contexto o feature del proyecto tiene su propio archivo `AGENTS.md` que documenta:

- Visión general y responsabilidades
- Estructura del directorio
- Entidades de dominio
- Casos de uso principales
- Comandos y queries
- Eventos del dominio
- Estrategia de testing
- Puntos de integración
- Pautas de seguridad
- Consideraciones de rendimiento

El `AGENTS.md` raíz ([AGENTS.md](./AGENTS.md)) actúa como índice centralizado que vincula a todos los contextos.

## Estructura de Directorios

```
.
├── AGENTS.md                              # Documentación raíz (índice)
├── scripts/
│   └── validate-agents.js                 # Validador de integridad
└── src/context/
    ├── shared/AGENTS.md                   # Patrones compartidos
    ├── auth/AGENTS.md                     # Autenticación
    ├── company/AGENTS.md                  # Gestión de empresas
    ├── conversations-v2/AGENTS.md         # Chat en tiempo real (v2)
    ├── visitors-v2/AGENTS.md              # Tracking de visitantes (v2)
    ├── tracking-v2/AGENTS.md              # Analytics (v2)
    ├── leads/AGENTS.md                    # Gestión de leads
    ├── llm/AGENTS.md                      # Integración LLM
    ├── commercial/AGENTS.md               # Facturación
    ├── white-label/AGENTS.md              # White-label
    ├── consent/AGENTS.md                  # Consentimiento GDPR
    ├── lead-scoring/AGENTS.md             # Scoring de leads
    ├── conversations/AGENTS.md            # Chat legacy (v1)
    └── visitors/AGENTS.md                 # Tracking legacy (v1)
```

## Secciones Requeridas en cada AGENTS.md

### Mínimo Requerido

- **# AGENTS.md** - Título con nombre del contexto
- **## Context Overview** - Visión general de responsabilidades
- **## Testing Strategy** - Cómo testear este contexto
- **## Related Documentation** - Enlaces a otros AGENTS.md
- **Parent documentation link** - Referencia al AGENTS.md raíz

### Altamente Recomendado

- **## Directory Structure** - Organización de archivos
- **## Domain Entities** - Agregados principales
- **## Key Use Cases** - Casos de uso principales
- **## Commands** - Operaciones de escritura
- **## Queries** - Operaciones de lectura
- **## Events** - Eventos del dominio
- **## Database Schema** - Tablas/colecciones (si aplica)
- **## Integration Points** - Relación con otros contextos
- **## Security Guidelines** - Consideraciones de seguridad
- **## Performance Considerations** - Optimizaciones
- **## Common Patterns** - Patrones de implementación
- **## Known Limitations** - Limitaciones actuales
- **## Future Enhancements** - Roadmap futuro

## Validación

### Ejecutar Validador

```bash
node scripts/validate-agents.js
```

El validador:

- ✅ Verifica que todos los AGENTS.md existan
- ✅ Valida que tengan las secciones requeridas
- ✅ Verifica los enlaces cruzados son válidos
- ✅ Genera reporte HTML de estado

### Ejemplo de Salida

```
🔍 Iniciando validación de documentación AGENTS.md...

Validando AGENTS.md raíz...
✅ AGENTS.md raíz referencia todos los contextos

Validando contextos...

Validando enlaces cruzados...

============================================================

✅ ¡Validación exitosa! Toda la documentación está en orden.

============================================================
📄 Reporte generado en: AGENTS-VALIDATION-REPORT.html
```

## Convenciones

### Formato de Enlaces Internos

Siempre usar rutas relativas desde el contexto:

```markdown
# Desde src/context/conversations-v2/AGENTS.md

- [Visitors V2](../visitors-v2/AGENTS.md)
- [Root AGENTS.md](../../AGENTS.md)
```

### Estructura de Diagrama DDD+CQRS

Cada contexto documenta su estructura así:

```
src/context/<context>/
├── domain/                    # Lógica de negocio pura
│   ├── <entity>.aggregate.ts  # Agregados
│   ├── <entity>.repository.ts # Interfaz del repositorio
│   ├── entities/              # Sub-entidades
│   ├── value-objects/         # Objetos de valor
│   ├── events/                # Eventos del dominio
│   └── errors/                # Errores de dominio
├── application/               # Orquestación
│   ├── commands/              # Operaciones de escritura
│   ├── queries/               # Operaciones de lectura
│   ├── events/                # Manejadores de eventos
│   └── dtos/                  # Contratos de API
└── infrastructure/            # Adaptadores externos
    ├── controllers/           # Endpoints HTTP/WebSocket
    ├── persistence/           # Implementaciones de repositorios
    └── services/              # Integraciones externas
```

### Secciones de Entidades del Dominio

```markdown
### <Entity> Aggregate (Root)

\`\`\`typescript
// src/context/<context>/domain/<entity>.aggregate.ts
<Entity> {
id: <EntityId> (UUID)
// ... campos
createdAt: Date
updatedAt: Date
}
\`\`\`
```

### Tablas de Integración

```markdown
| Context  | Purpose      | Method              |
| -------- | ------------ | ------------------- |
| context1 | What it does | How it communicates |
| context2 | What it does | How it communicates |
```

## Mantenimiento

### Cuándo Actualizar AGENTS.md

Actualiza el AGENTS.md correspondiente cuando:

1. **Agregues una nueva entidad** - Documenta en "Domain Entities"
2. **Agregues un comando/query** - Actualiza las listas
3. **Cambies eventos del dominio** - Actualiza la sección "Events"
4. **Discovers limitaciones** - Documenta en "Known Limitations"
5. **Finds patrones nuevos** - Documenta en "Common Patterns"

### Checklist para Nuevo Contexto

Cuando crees un nuevo contexto:

- [ ] Crea `src/context/<name>/AGENTS.md`
- [ ] Incluye todas las secciones requeridas
- [ ] Vincula desde el AGENTS.md raíz
- [ ] Ejecuta validador: `node scripts/validate-agents.js`
- [ ] No debería haber errores

## Ejemplo Completo

Ver un contexto completo:

```bash
cat src/context/leads/AGENTS.md
```

Características:

- ✅ Descripción clara de responsabilidades
- ✅ Estructura de directorios documentada
- ✅ Entidades de dominio detalladas
- ✅ Casos de uso principales
- ✅ Comandos y queries listados
- ✅ Eventos del dominio
- ✅ Puntos de integración
- ✅ Pautas de seguridad
- ✅ Consideraciones de rendimiento
- ✅ Patrones comunes
- ✅ Limitaciones conocidas
- ✅ Mejoras futuras

## Beneficios

### Para Desarrolladores

- 📖 Documentación centralizada y fácil de encontrar
- 🔗 Referencias cruzadas entre contextos
- 🎯 Casos de uso claramente definidos
- 🧪 Estrategias de testing documentadas
- ⚠️ Pautas de seguridad explícitas

### Para Equipos

- 📋 Visión compartida de responsabilidades
- 🔄 Facilita onboarding de nuevos miembros
- 📊 Rastrea limitaciones conocidas
- 🚀 Documenta roadmap futuro
- ✅ Validación automática de cobertura

### Para Proyectos

- 📚 Single source of truth
- 🔍 Fácil descubrir patrones
- 🛡️ Asegura cobertura documentada
- 🎯 Alinea con arquitectura DDD+CQRS
- ✨ Mejora calidad del código

## Herramientas Relacionadas

- **AGENTS.md Root**: [AGENTS.md](./AGENTS.md)
- **Validator**: `scripts/validate-agents.js`
- **Lint config**: `.eslintrc.json`
- **Architecture rules**: `.claude/rules/`

## Referencias

- [Domain-Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Aggregate Pattern](https://martinfowler.com/bliki/DDD_Aggregate.html)
- [NestJS Documentation](https://docs.nestjs.com/)

## FAQ

### ¿Qué va en el AGENTS.md raíz?

El AGENTS.md raíz contiene:

- Visión general de arquitectura
- Pautas de código y estilo
- Patrones críticos
- Índice de todos los contextos

### ¿Qué va en cada AGENTS.md de contexto?

Cada AGENTS.md de contexto documenta:

- Responsabilidades específicas del contexto
- Estructura y entidades de dominio
- Casos de uso e implementación
- Integración con otros contextos

### ¿Con qué frecuencia debo actualizar?

Actualiza tan pronto como:

- Cambies la estructura de un contexto
- Agregues nuevas entidades o comandos
- Descubras patrones recurrentes
- Encuentres limitaciones nuevas

### ¿Qué hago si encuentro un error de validación?

1. Lee el error del validador
2. Corrige el AGENTS.md
3. Ejecuta validador nuevamente
4. Confirma que desaparece el error

## Soporte

Si encuentras problemas:

1. Verifica que sigas las convenciones de este documento
2. Ejecuta el validador: `node scripts/validate-agents.js`
3. Revisa ejemplos existentes en otros contextos
4. Consulta el equipo de arquitectura
