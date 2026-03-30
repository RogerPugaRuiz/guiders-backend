# ADR-001 — Arquitectura DDD + CQRS

**Fecha:** 30/03/2026 (documentado retroactivamente)  
**Estado:** Aceptado  
**Contexto:** Decisión de arquitectura del backend de guiders.es

---

## Contexto

guiders.es es una plataforma multi-tenant con múltiples dominios de negocio independientes (auth, conversations, tracking, lead-scoring, company...). Necesitábamos una arquitectura que:
- Separara claramente los dominios de negocio
- Permitiera evolucionar cada contexto de forma independiente
- Escalara bien con múltiples casos de uso (comandos y consultas con diferentes requisitos)

## Decisión

Adoptar **Domain-Driven Design (DDD)** con **CQRS** (`@nestjs/cqrs`) como patrón arquitectónico central.

## Estructura resultante

```
src/context/
├── auth/           # Autenticación (JWT, visitantes, comerciales)
├── company/        # Multi-tenant, configuración
├── conversations-v2/ # Chat en tiempo real
├── visitors-v2/    # Presencia y tracking de visitantes
├── tracking-v2/    # Eventos de comportamiento
├── lead-scoring/   # Puntuación de intención
├── commercial/     # Gestión de agentes
├── consent/        # GDPR
└── shared/         # Value objects, eventos de dominio compartidos
```

## Consecuencias positivas

- ✅ Cada contexto tiene su propio modelo de dominio
- ✅ Commands/Queries claramente separados
- ✅ Fácil de testear unitariamente
- ✅ Evolución independiente por contexto

## Consecuencias negativas / a vigilar

- ⚠️ Verbosidad: muchos archivos por feature
- ⚠️ Curva de aprendizaje para nuevos developers
- ⚠️ Consistencia eventual entre contextos requiere cuidado

---

*Documentado por Sinapsis — 30/03/2026*
