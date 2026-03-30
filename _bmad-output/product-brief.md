# Product Brief — guiders.es

**Versión:** 1.0  
**Fecha:** 30/03/2026  
**Autor:** Sinapsis (agente IA) a partir del código fuente real

---

## 1. Visión del Producto

**guiders.es** es una plataforma de comunicación en tiempo real entre equipos comerciales y visitantes de sitios web. Elimina la fricción del primer contacto, permitiendo que los comerciales inicien o reciban conversaciones con visitantes mientras navegan, mejorando la tasa de conversión y la experiencia del usuario.

**Frase de posicionamiento:**  
*"El puente entre tu web y tu equipo de ventas, en tiempo real."*

---

## 2. Problema que Resuelve

Los visitantes de un sitio web tienen intención de compra en momentos muy concretos. Los canales tradicionales (formularios, email) introducen fricción y latencia que enfría esa intención. guiders.es permite capturar ese momento con comunicación instantánea, sin que el visitante tenga que iniciar el contacto.

---

## 3. Usuarios Objetivo

| Segmento | Descripción |
|---|---|
| **Comerciales** | Equipos de ventas que usan la consola para gestionar conversaciones con visitantes en tiempo real |
| **Visitantes web** | Usuarios navegando en sitios cliente que pueden ser contactados o contactar al equipo |
| **Administradores** | Gestión de empresas, equipos, configuración de marca blanca y permisos |
| **Empresas cliente** | SaaS B2B — integran guiders via SDK en su web |

---

## 4. Propuesta de Valor

- **Tiempo real:** WebSockets (Socket.IO) para comunicación instantánea sin polling
- **SDK web:** Integración sencilla en cualquier web vía JavaScript
- **Multi-empresa:** Arquitectura multi-tenant con soporte para marca blanca (white label)
- **Inteligencia de visitante:** Tracking de comportamiento, lead scoring, detección de alta intención
- **Presencia y contexto:** El comercial ve qué página está visitando el usuario en tiempo real
- **Notificaciones push:** Alertas al comercial cuando hay alta intención o nuevo visitante

---

## 5. Stack Técnico

### Backend (`guiders-backend`)
- **Framework:** NestJS v11 + TypeScript
- **Arquitectura:** DDD + CQRS (`@nestjs/cqrs`)
- **Persistencia:** PostgreSQL + MongoDB (TypeORM)
- **Tiempo real:** Socket.IO v4.8.1
- **Auth:** JWT + Passport (comerciales y visitantes)
- **Contextos DDD:**
  - `auth` — autenticación comerciales y visitantes
  - `company` — gestión multi-tenant
  - `conversations-v2` — núcleo de mensajería
  - `visitors-v2` — tracking y presencia de visitantes
  - `tracking-v2` — eventos de comportamiento
  - `lead-scoring` — puntuación de intención
  - `commercial` — gestión de agentes comerciales
  - `consent` — GDPR/consentimiento

### Frontend (`guiders-frontend`)
- **Framework:** Angular 20.1.0 (Nx monorepo)
- **Apps:** `console` (comerciales) + `admin` (administración)
- **Auth:** OIDC (angular-auth-oidc-client)
- **Tiempo real:** Socket.IO client

### SDK (`guiders-sdk`)
- **Stack:** TypeScript + Socket.IO Client
- **Tracking:** ClientJS
- **Plugin:** WordPress

---

## 6. Funcionalidades Core (estado actual)

- ✅ Autenticación comerciales y visitantes (JWT)
- ✅ Sistema de presencia (quién está online)
- ✅ Chat en tiempo real comercial ↔ visitante
- ✅ Tracking de URL actual del visitante
- ✅ Notificaciones del navegador para comerciales
- ✅ Filtros avanzados en tabla de visitantes
- ✅ Imágenes de usuario en header del chat
- ✅ API marca blanca (white label)
- ✅ Apertura automática del chat cuando comercial escribe
- ⏳ Ver intereses de visitantes en consola comercial
- ⏳ Integración con Leadcars

---

## 7. Modelo de Negocio

- **SaaS B2B** — empresas pagan por integrar guiders en su web
- **Multi-tenant** — una instalación, múltiples empresas cliente
- **White label** — empresas pueden personalizar la apariencia

---

## 8. Métricas de Éxito

| Métrica | Descripción |
|---|---|
| Conversaciones iniciadas | Nº de chats abiertos comercial ↔ visitante |
| Tiempo de respuesta | Latencia media del primer mensaje del comercial |
| Tasa de conversión | Visitantes contactados que convierten |
| Lead score promedio | Calidad media de los visitantes gestionados |
| Uptime WebSocket | Disponibilidad de la infraestructura en tiempo real |

---

## 9. Próximos Pasos (Backlog prioritario)

1. Ver intereses de visitantes en consola comercial
2. Integración con Leadcars (CRM externo)
3. Definir epics con agente PM de BMAD
4. Architecture review del sistema actual

---

*Generado automáticamente por Sinapsis a partir del análisis del código fuente de guiders.es*
