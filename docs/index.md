# Guiders Backend - Indice de Documentacion

**Tipo:** Monolito backend
**Lenguaje principal:** TypeScript 5.8
**Arquitectura:** DDD + CQRS + Arquitectura Hexagonal
**Ultima actualizacion:** 2026-04-01

---

## Vision General del Proyecto

Guiders Backend es la infraestructura de servidor para un producto de comunicacion en tiempo real entre agentes comerciales y visitantes web. Construido sobre NestJS v11 con 15 bounded contexts, persistencia dual (PostgreSQL + MongoDB), WebSockets via Socket.IO, autenticacion multi-mecanismo (Keycloak, JWT, BFF) e integracion con IA (Groq).

---

## Referencia Rapida

- **Stack:** NestJS v11, TypeScript 5.8, PostgreSQL (TypeORM), MongoDB (Mongoose), Redis, Socket.IO
- **Entry point:** `src/main.ts`
- **Patron arquitectonico:** DDD + CQRS + Hexagonal (Ports & Adapters)
- **Base de datos:** PostgreSQL 14 (auth, company, V1) + MongoDB 7 (V2, leads, tracking) + Redis 7 (cache, presencia)
- **Despliegue:** Docker + PM2 + GitHub Actions CI/CD

---

## Documentacion Generada

### Documentacion Principal

- [Vision General del Proyecto](./project-overview.md) - Resumen ejecutivo y arquitectura de alto nivel
- [Arquitectura](./architecture.md) - Arquitectura tecnica detallada (patrones, persistencia, auth, despliegue)
- [Analisis del Arbol de Fuentes](./source-tree-analysis.md) - Estructura de directorios anotada
- [Inventario de Componentes](./component-inventory.md) - Catalogo de bounded contexts y componentes principales
- [Guia de Desarrollo](./development-guide.md) - Configuracion local, comandos y workflow de desarrollo
- [Contratos API](./api-contracts.md) - Catalogo de ~145 endpoints REST y 13 eventos WebSocket
- [Modelos de Datos](./data-models.md) - Esquemas de base de datos (15 colecciones MongoDB + 7 tablas PostgreSQL)

---

## Documentacion Existente del Proyecto

### Guias de Contexto (AGENTS.md)

Cada bounded context tiene su propio AGENTS.md con especificaciones detalladas del dominio:

| Contexto                  | Ruta                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Raiz del proyecto         | [AGENTS.md](../AGENTS.md)                                                           |
| Auth                      | [src/context/auth/AGENTS.md](../src/context/auth/AGENTS.md)                         |
| Company                   | [src/context/company/AGENTS.md](../src/context/company/AGENTS.md)                   |
| Shared                    | [src/context/shared/AGENTS.md](../src/context/shared/AGENTS.md)                     |
| Conversations V2          | [src/context/conversations-v2/AGENTS.md](../src/context/conversations-v2/AGENTS.md) |
| Visitors V2               | [src/context/visitors-v2/AGENTS.md](../src/context/visitors-v2/AGENTS.md)           |
| Tracking V2               | [src/context/tracking-v2/AGENTS.md](../src/context/tracking-v2/AGENTS.md)           |
| Leads                     | [src/context/leads/AGENTS.md](../src/context/leads/AGENTS.md)                       |
| Lead Scoring              | [src/context/lead-scoring/AGENTS.md](../src/context/lead-scoring/AGENTS.md)         |
| LLM                       | [src/context/llm/AGENTS.md](../src/context/llm/AGENTS.md)                           |
| Commercial                | [src/context/commercial/AGENTS.md](../src/context/commercial/AGENTS.md)             |
| White-Label               | [src/context/white-label/AGENTS.md](../src/context/white-label/AGENTS.md)           |
| Consent                   | [src/context/consent/AGENTS.md](../src/context/consent/AGENTS.md)                   |
| Conversations V1 (legacy) | [src/context/conversations/AGENTS.md](../src/context/conversations/AGENTS.md)       |
| Visitors V1 (legacy)      | [src/context/visitors/AGENTS.md](../src/context/visitors/AGENTS.md)                 |

### Guias de Integracion Frontend

- [Integracion Frontend](./INTEGRACION-FRONTEND.md) - Guia general de integracion
- [Guia Frontend Comercial](./GUIA-FRONTEND-COMERCIAL.md) - Integracion para panel de agentes
- [Guia Frontend Visitante](./GUIA-FRONTEND-VISITANTE.md) - Integracion para widget de visitante
- [Chat Presence Frontend Guide](./CHAT_PRESENCE_FRONTEND_GUIDE.md) - Sistema de presencia en chats
- [Tracking V2 Frontend Guide](./TRACKING_V2_FRONTEND_GUIDE.md) - Integracion de tracking
- [Frontend Consent Integration](./FRONTEND_CONSENT_INTEGRATION.md) - Integracion de consentimiento

### BFF (Backend For Frontend)

- [BFF SPA Integration](./bff-spa-integration-guide.md) - Integracion con SPAs
- [BFF Multiple Clients](./bff-multiple-clients.md) - Soporte multi-cliente
- [BFF HTTP-Only Cookies](./bff-httponly-cookies-guide.md) - Guia de cookies seguras
- [BFF Optional Middleware](./bff-optional-middleware.md) - Middleware opcional
- [BFF Frontend Usage](./bff-frontend-usage.md) - Uso desde el frontend
- [BFF Implementation Plan](./bff-implementation-plan.md) - Plan de implementacion
- [BFF Logout Keycloak](./bff-logout-keycloak.md) - Flujo de logout

### Consentimiento / GDPR

- [Consent README](./CONSENT_README.md) - Vision general del sistema
- [Consent Integration Examples](./CONSENT_INTEGRATION_EXAMPLES.md) - Ejemplos de integracion
- [Consent Scenarios RGPD](./CONSENT_SCENARIOS_RGPD.md) - Escenarios RGPD
- [Consent Auth Guide](./CONSENT_AUTH_GUIDE.md) - Autenticacion del consentimiento
- [SDK Consent API](./SDK_CONSENT_API.md) - API del SDK
- [Consent Version Management](./CONSENT_VERSION_MANAGEMENT.md) - Gestion de versiones
- [Consent Semver Compatibility](./CONSENT_SEMVER_COMPATIBILITY.md) - Compatibilidad semver
- [Consent Rejection Implementation](./CONSENT_REJECTION_IMPLEMENTATION.md) - Implementacion de rechazo

### WebSocket / Tiempo Real

- [WebSocket Real-Time Chat](./websocket-real-time-chat.md) - Sistema de chat en tiempo real
- [WebSocket Implementation Summary](./websocket-implementation-summary.md) - Resumen de implementacion
- [Sistema de Colas Chat](./SISTEMA-COLAS-CHAT.md) - Cola de asignacion
- [Unread Messages System](./UNREAD_MESSAGES_SYSTEM.md) - Sistema de mensajes no leidos

### Infraestructura / DevOps

- [Keycloak Setup](./keycloak-setup.md) - Configuracion de Keycloak
- [Keycloak Environment Variables](./keycloak-environment-variables.md) - Variables de entorno
- [Keycloak Logout Configuration](./keycloak-logout-configuration.md) - Configuracion de logout
- [Docker Compose Staging](./docker-compose-staging.md) - Docker para staging
- [Staging Secrets Setup](./staging-secrets-setup.md) - Secretos de staging
- [GitHub Secrets Setup](./SETUP_GITHUB_SECRETS_STEP_BY_STEP.md) - Secretos de GitHub

### Sesiones

- [Session Expiration](./session-expiration.md) - Expiracion de sesiones
- [Session Cleanup System](./session-cleanup-system.md) - Limpieza automatica
- [Sistema Limpieza Sesiones](./sistema-limpieza-automatica-sesiones.md) - Sistema automatico

### LLM / IA

- [LLM Architecture](./llm-architecture.md) - Arquitectura del sistema LLM
- [LLM Tool Use Guide](./LLM_TOOL_USE_GUIDE.md) - Guia de tool use

### API y Mensajes

- [Messages Endpoint Guide](./messages-v2/messages-endpoint-guide.md) - Guia del endpoint de mensajes
- [Visitors V2 Pagination Examples](./visitors-v2/pagination-examples.md) - Ejemplos de paginacion
- [API AI - Chat with Message](./api-ai/endpoint-chat-with-message.md) - Endpoint de chat con IA
- [API AI - Examples](./api-ai/EXAMPLES.md) - Ejemplos de la API de IA

### Debugging / Troubleshooting

- [Fix Chat Created Event Loss](./FIX_CHAT_CREATED_EVENT_LOSS.md) - Correccion de perdida de eventos
- [Chat Created Notification Fix](./CHAT_CREATED_NOTIFICATION_FIX_SUMMARY.md) - Fix de notificaciones
- [HTTP 304 Debugging](./http-304-debugging.md) - Debugging de respuestas 304
- [MongoDB CI/E2E Fix](./mongodb-ci-e2e-fix.md) - Fix de MongoDB en CI
- [MongoDB E2E Troubleshooting](./mongodb-e2e-troubleshooting.md) - Troubleshooting de MongoDB

---

## Inicio Rapido

### Prerequisitos

- Node.js >= 20.x (LTS)
- Docker >= 24.x + Docker Compose >= 2.x
- Git >= 2.x

### Configuracion

```bash
git clone https://github.com/RogerPugaRuiz/guiders-backend.git
cd guiders-backend
npm install
cp .env.example .env
docker-compose up -d        # PostgreSQL, MongoDB, Redis, Keycloak
npm run typeorm:migrate:run # Migraciones PostgreSQL
npm run start:dev           # http://localhost:3000
```

### Tests

```bash
npm run test:unit    # Tests unitarios (SQLite in-memory)
npm run test:int     # Tests de integracion (requiere DBs reales)
npm run test:e2e     # Tests E2E
```

---

## Para Desarrollo Asistido por IA

Esta documentacion fue generada especificamente para que agentes de IA puedan comprender y extender este codebase.

### Al Planificar Nuevas Funcionalidades:

**Funcionalidades de backend/API:**
→ Referencia: `architecture.md`, `api-contracts.md`, `data-models.md`

**Funcionalidades de un contexto especifico:**
→ Referencia: `component-inventory.md` + el `AGENTS.md` del contexto correspondiente

**Cambios de despliegue:**
→ Referencia: `development-guide.md` (seccion de despliegue)

**Integracion con frontend:**
→ Referencia: Las guias de integracion frontend listadas arriba

### Comando para PRD Brownfield:

Cuando estes listo para planificar nuevas funcionalidades, ejecuta el workflow de PRD y proporciona este indice como entrada: `docs/index.md`

---

_Documentacion generada por el workflow `document-project` del metodo BMAD_
