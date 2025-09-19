# Documentación de API para Sistemas de IA

Esta documentación está específicamente diseñada para facilitar la integración de sistemas de inteligencia artificial con el backend de Guiders. Proporciona ejemplos detallados, casos de uso comunes y mejores prácticas para desarrolladores de IA.

## 📋 Índice

1. [Guía de Inicio Rápido](guia-inicio-rapido.md)
2. [Autenticación y Autorización](autenticacion.md)
3. [Endpoints por Contexto](endpoints/README.md)
4. [WebSockets y Tiempo Real](websockets.md)
5. [Casos de Uso para IA](casos-uso-ia.md)
6. [Manejo de Errores](manejo-errores.md)
7. [Rate Limiting y Límites](rate-limiting.md)
8. [Ejemplos de Código](ejemplos/README.md)
9. [Flujos de Integración](flujos-integracion.md)
10. [FAQ y Troubleshooting](faq.md)

## 🎯 Audiencia Objetivo

Esta documentación está dirigida a:
- Desarrolladores de sistemas de IA que necesitan integrar con Guiders
- Equipos de ML/AI que implementan chatbots o asistentes virtuales
- Desarrolladores backend que integran servicios de IA externos
- Arquitectos de software que diseñan soluciones con componentes de IA

## 🚀 ¿Por qué esta documentación?

Mientras que la documentación Swagger autogenerada proporciona una referencia técnica completa, esta documentación:

- **Se enfoca en casos de uso de IA**: Escenarios específicos donde los sistemas de IA interactúan con el backend
- **Proporciona ejemplos prácticos**: Código listo para usar en múltiples lenguajes
- **Explica patrones comunes**: Flujos típicos de integración y mejores prácticas
- **Incluye contexto de negocio**: Cómo los endpoints se relacionan con funcionalidades de negocio
- **Documenta limitaciones**: Rate limits, timeouts y consideraciones de rendimiento específicas para IA

## 🏗️ Arquitectura del Sistema

Guiders Backend utiliza:
- **NestJS 11** con arquitectura DDD + CQRS
- **Multi-persistencia**: PostgreSQL y MongoDB
- **WebSockets** para comunicación en tiempo real
- **Autenticación JWT** y autenticación por API Key
- **Documentación Swagger** en `/docs`

## 📝 Convenciones

- Todos los ejemplos usan **español técnico neutro** en comentarios y descripciones
- Los endpoints siguen el prefijo `/api/` (excepto `/docs`, `/docs-json`, `/jwks`)
- Los códigos de estado HTTP siguen estándares REST
- Las respuestas incluyen metadatos consistentes para facilitar procesamiento automático

## 🔗 Recursos Adicionales

- [Documentación Swagger Interactiva](/docs) - Referencia completa de API
- [README Principal](../../README.md) - Configuración y arquitectura general
- [Documentación por Contexto](../../src/context/) - READMEs específicos de cada módulo

---

> **Nota**: Esta documentación se mantiene manualmente y se actualiza con cada cambio significativo en la API. Para la referencia más actualizada de endpoints y schemas, consulta siempre la documentación Swagger en `/docs`.