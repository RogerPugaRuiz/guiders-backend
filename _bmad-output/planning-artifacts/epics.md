# Epics principales — guiders.es

**Versión:** 1.0  
**Fecha:** 30/03/2026  
**Basado en:** Product Brief + análisis del código fuente

---

## Epic 1 — Comunicación en tiempo real (CORE)
**Objetivo:** Permitir que comerciales y visitantes intercambien mensajes en tiempo real sin fricción.

**Contextos DDD:** `conversations-v2`, `visitors-v2`

**Historias clave:**
- Como comercial, quiero iniciar un chat con un visitante que está en mi web
- Como visitante, quiero responder al comercial sin registrarme
- Como comercial, quiero ver el historial de la conversación
- Como comercial, quiero saber si el visitante está escribiendo

**Estado:** ✅ Implementado (core funcional)

---

## Epic 2 — Inteligencia de visitante
**Objetivo:** Dar contexto al comercial sobre el comportamiento e intención del visitante antes de contactar.

**Contextos DDD:** `tracking-v2`, `lead-scoring`, `visitors-v2`

**Historias clave:**
- Como comercial, quiero ver qué páginas ha visitado el usuario
- Como comercial, quiero ver cuánto tiempo lleva en la web
- Como comercial, quiero ver una puntuación de intención del visitante
- Como comercial, quiero ver los intereses del visitante en el panel del chat ⏳

**Estado:** Parcialmente implementado (tracking + lead scoring OK, intereses pendiente)

---

## Epic 3 — Gestión multi-empresa (Multi-tenant)
**Objetivo:** Soporte para múltiples empresas cliente en una única instalación.

**Contextos DDD:** `company`, `auth`

**Historias clave:**
- Como administrador, quiero crear empresas cliente con su configuración
- Como empresa, quiero personalizar la apariencia (white label)
- Como empresa, quiero gestionar mis comerciales y permisos

**Estado:** ✅ Implementado

---

## Epic 4 — SDK de integración web
**Objetivo:** Que cualquier web pueda integrar guiders con pocas líneas de código.

**Repo:** `guiders-sdk`

**Historias clave:**
- Como desarrollador, quiero integrar el chat en mi web con un snippet JavaScript
- Como visitante, quiero ver el widget de chat sin que ralentice mi navegación
- Como empresa WordPress, quiero instalar guiders con un plugin

**Estado:** ✅ Implementado (SDK + plugin WordPress)

---

## Epic 5 — Integraciones CRM
**Objetivo:** Conectar guiders con CRMs externos para sincronizar leads.

**Historias clave:**
- Como comercial, quiero que las conversaciones se sincronicen con Leadcars ⏳
- Como administrador, quiero configurar webhooks hacia mi CRM

**Estado:** ⏳ Pendiente (Leadcars en backlog)

---

## Epic 6 — Notificaciones y alertas
**Objetivo:** Notificar al comercial en tiempo real cuando hay actividad relevante.

**Contextos DDD:** event handlers en múltiples contextos

**Historias clave:**
- Como comercial, quiero recibir una notificación del navegador cuando llega un mensaje
- Como comercial, quiero ser alertado cuando un visitante tiene alta intención
- Como comercial, quiero recibir alertas cuando un visitante nuevo entra a la web

**Estado:** ✅ Implementado

---

## Próximos pasos recomendados

1. Completar Epic 2 — Historia de intereses del visitante
2. Iniciar Epic 5 — Integración Leadcars
3. Crear PRD detallado para cada historia pendiente usando `bmad-create-prd` en Claude Code

---

*Generado por Sinapsis — 30/03/2026*
