# ADR-002 — Dual persistence: PostgreSQL + MongoDB

**Fecha:** 30/03/2026 (documentado retroactivamente)  
**Estado:** Aceptado

---

## Contexto

El sistema necesita persistir dos tipos de datos con características muy diferentes:
- **Datos relacionales:** usuarios, empresas, configuraciones, permisos
- **Datos de eventos/documentos:** conversaciones, mensajes, tracking, historial

## Decisión

Usar **PostgreSQL** para datos relacionales y **MongoDB** para datos de documentos/eventos.

## Justificación

| Aspecto | PostgreSQL | MongoDB |
|---|---|---|
| Transacciones ACID | ✅ Ideal | Limitado |
| Datos flexibles/anidados | Complejo | ✅ Ideal |
| Queries relacionales | ✅ Ideal | Limitado |
| Escalado horizontal | Moderado | ✅ Mejor |

## Consecuencias

- ✅ Cada tipo de dato usa el motor óptimo
- ⚠️ Dos sistemas que mantener/monitorear
- ⚠️ No hay transacciones distribuidas entre ambos — diseñar para eventual consistency

---

*Documentado por Sinapsis — 30/03/2026*
