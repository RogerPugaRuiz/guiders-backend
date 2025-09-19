# Chats V2 - Endpoints para IA

Los endpoints de Chats V2 son la **API principal recomendada** para sistemas de IA que trabajan con conversaciones. Está optimizada para alto volumen y consultas rápidas.

## 🚀 Base URL y Autenticación

```
Base URL: https://api.guiders.com/api/v2/chats
Autenticación: Bearer Token (API Key o JWT)
```

## 📋 Listado de Endpoints

### 1. Obtener Lista de Chats

```http
GET /api/v2/chats
```

**Parámetros de Query:**

| Parámetro | Tipo | Descripción | Ejemplo | Requerido |
|-----------|------|-------------|---------|-----------|
| `page` | number | Número de página | `1` | No |
| `limit` | number | Elementos por página (max 100) | `20` | No |
| `status` | string[] | Estados de chat | `ACTIVE,PENDING` | No |
| `assignedTo` | string | ID del comercial asignado | `commercial-123` | No |
| `visitorId` | string | ID del visitante | `visitor-456` | No |
| `department` | string | Departamento | `sales` | No |
| `tags` | string[] | Etiquetas | `urgent,vip` | No |
| `dateFrom` | string | Fecha inicial (ISO) | `2025-01-01T00:00:00Z` | No |
| `dateTo` | string | Fecha final (ISO) | `2025-01-31T23:59:59Z` | No |

**Ejemplo para IA - Obtener chats pendientes:**

```javascript
async function obtenerChatsPendientes() {
  const response = await fetch('/api/v2/chats?' + new URLSearchParams({
    status: 'PENDING',
    assignedTo: 'null', // Sin asignar
    limit: '50',
    page: '1'
  }), {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}
```

**Respuesta:**

```json
{
  "data": [
    {
      "id": "chat-123",
      "status": "PENDING",
      "visitorInfo": {
        "id": "visitor-456",
        "name": "Juan Pérez",
        "email": "juan@example.com"
      },
      "assignedTo": null,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:35:00Z",
      "metadata": {
        "department": "sales",
        "tags": ["new-visitor"],
        "source": "website"
      },
      "messageCount": 3,
      "lastMessageAt": "2025-01-15T10:35:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "totalPages": 3
  }
}
```

### 2. Obtener Chat por ID

```http
GET /api/v2/chats/{chatId}
```

**Ejemplo para IA:**

```javascript
async function obtenerDetalleChat(chatId) {
  const response = await fetch(`/api/v2/chats/${chatId}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Chat no encontrado: ${chatId}`);
  }
  
  return await response.json();
}
```

### 3. Crear Nuevo Chat

```http
POST /api/v2/chats
```

**Body (opcional):**

```json
{
  "visitorInfo": {
    "name": "Cliente IA Bot",
    "email": "ai-bot@example.com"
  },
  "metadata": {
    "department": "support",
    "tags": ["ai-generated"],
    "source": "chatbot",
    "priority": "medium"
  }
}
```

**Ejemplo para IA:**

```javascript
async function crearChatParaIA(visitorInfo, metadata = {}) {
  const response = await fetch('/api/v2/chats', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      visitorInfo,
      metadata: {
        ...metadata,
        source: 'ai-system',
        tags: [...(metadata.tags || []), 'ai-created']
      }
    })
  });
  
  return await response.json();
}
```

**Respuesta:**

```json
{
  "chatId": "chat-789",
  "position": 5
}
```

### 4. Obtener Mensajes de un Chat

```http
GET /api/v2/chats/{chatId}/messages
```

**Parámetros de Query:**

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `page` | number | Página | `1` |
| `limit` | number | Límite (max 100) | `50` |
| `since` | string | Desde fecha ISO | `2025-01-15T10:00:00Z` |
| `type` | string | Tipo de mensaje | `user,ai,system` |

**Ejemplo para IA - Análisis de conversación:**

```javascript
async function analizarConversacion(chatId) {
  // Obtener todos los mensajes del chat
  const response = await fetch(`/api/v2/chats/${chatId}/messages?limit=100`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  const { data: mensajes } = await response.json();
  
  // Filtrar solo mensajes de usuario para análisis
  const mensajesUsuario = mensajes.filter(m => m.type === 'user');
  
  // Análisis con IA
  const sentimiento = await analizarSentimiento(mensajesUsuario);
  const temas = await extraerTemas(mensajesUsuario);
  const intencion = await detectarIntencion(mensajesUsuario);
  
  return { sentimiento, temas, intencion };
}
```

### 5. Enviar Mensaje

```http
POST /api/v2/chats/{chatId}/messages
```

**Body:**

```json
{
  "content": "¡Hola! Soy un asistente de IA. ¿En qué puedo ayudarte?",
  "type": "ai-response",
  "metadata": {
    "aiModel": "gpt-4",
    "confidence": 0.95,
    "processingTime": 150,
    "isAutomated": true
  }
}
```

**Ejemplo para IA:**

```javascript
async function enviarRespuestaIA(chatId, contenido, metadata = {}) {
  const response = await fetch(`/api/v2/chats/${chatId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: contenido,
      type: 'ai-response',
      metadata: {
        isAutomated: true,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Error enviando mensaje: ${response.statusText}`);
  }
  
  return await response.json();
}
```

### 6. Asignar Chat a Comercial

```http
PUT /api/v2/chats/{chatId}/assign/{commercialId}
```

**Ejemplo para IA - Escalación a humano:**

```javascript
async function escalarAHumano(chatId, razon = 'Consulta compleja') {
  // 1. Obtener comerciales disponibles
  const comerciales = await obtenerComercialesDisponibles();
  
  if (comerciales.length === 0) {
    throw new Error('No hay comerciales disponibles');
  }
  
  // 2. Seleccionar comercial (ej: por carga de trabajo)
  const comercialOptimo = comerciales.reduce((min, actual) => 
    actual.chatCount < min.chatCount ? actual : min
  );
  
  // 3. Asignar chat
  const response = await fetch(`/api/v2/chats/${chatId}/assign/${comercialOptimo.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  // 4. Enviar mensaje explicativo
  await enviarRespuestaIA(chatId, 
    `He derivado tu consulta a ${comercialOptimo.name}, nuestro especialista. Te responderá en breve.`,
    { 
      razon: razon,
      escalationType: 'ai-to-human',
      assignedTo: comercialOptimo.id
    }
  );
  
  return await response.json();
}
```

### 7. Cerrar Chat

```http
PUT /api/v2/chats/{chatId}/close
```

**Body (opcional):**

```json
{
  "reason": "Consulta resuelta por IA",
  "satisfaction": 4,
  "resolution": "resolved",
  "metadata": {
    "resolvedBy": "ai-system",
    "resolutionTime": 300
  }
}
```

### 8. Métricas de Comercial

```http
GET /api/v2/chats/metrics/commercial/{commercialId}
```

**Parámetros útiles para IA:**

```javascript
async function obtenerMetricasComercial(commercialId, fechaInicio, fechaFin) {
  const params = new URLSearchParams({
    dateFrom: fechaInicio,
    dateTo: fechaFin,
    includeAI: 'true' // Incluir métricas de IA
  });
  
  const response = await fetch(`/api/v2/chats/metrics/commercial/${commercialId}?${params}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return await response.json();
}
```

## 🤖 Casos de Uso Específicos para IA

### Caso 1: Bot de Primera Línea

```javascript
class BotPrimeraLinea {
  async procesarChatsPendientes() {
    const chats = await obtenerChatsPendientes();
    
    for (const chat of chats.data) {
      if (this.puedeResponder(chat)) {
        await this.responderAutomaticamente(chat);
      } else {
        await this.escalarAComercial(chat);
      }
    }
  }
  
  puedeResponder(chat) {
    // Lógica para determinar si el bot puede responder
    const ultimoMensaje = chat.lastMessage;
    return this.esPreguntaSimple(ultimoMensaje) && 
           !this.requiereHumano(chat.metadata);
  }
}
```

### Caso 2: Análisis de Sentimientos en Tiempo Real

```javascript
class AnalizadorSentimientos {
  async monitorearChats() {
    const chatsActivos = await obtenerChatsActivos();
    
    for (const chat of chatsActivos.data) {
      const mensajes = await obtenerMensajesRecientes(chat.id);
      const sentimiento = await this.analizarSentimiento(mensajes);
      
      if (sentimiento.esNegativo && sentimiento.intensidad > 0.7) {
        await this.marcarComoUrgente(chat.id);
        await this.notificarSupervisor(chat.id, sentimiento);
      }
    }
  }
}
```

### Caso 3: Chatbot Especializado por Departamento

```javascript
class ChatbotEspecializado {
  constructor(departamento) {
    this.departamento = departamento;
    this.conocimiento = this.cargarConocimiento(departamento);
  }
  
  async procesarPorDepartamento() {
    const chats = await obtenerChatsPorDepartamento(this.departamento);
    
    for (const chat of chats.data) {
      const contexto = await this.construirContexto(chat);
      const respuesta = await this.generarRespuestaEspecializada(contexto);
      
      if (respuesta.confianza > 0.8) {
        await enviarRespuestaIA(chat.id, respuesta.texto, {
          departamento: this.departamento,
          confianza: respuesta.confianza,
          modelo: 'especialista-' + this.departamento
        });
      }
    }
  }
}
```

## 🚨 Manejo de Errores

```javascript
class ManejadorErroresChats {
  static async manejarRespuesta(response) {
    if (!response.ok) {
      const error = await response.json();
      
      switch (response.status) {
        case 404:
          throw new Error(`Chat no encontrado: ${error.message}`);
        case 403:
          throw new Error(`Sin permisos para acceder al chat: ${error.message}`);
        case 429:
          // Rate limit - esperar y reintentar
          await this.esperarRateLimit(response);
          throw new Error('Rate limit excedido, reintentando...');
        case 400:
          throw new Error(`Datos inválidos: ${error.message}`);
        default:
          throw new Error(`Error de API: ${error.message}`);
      }
    }
    
    return response;
  }
  
  static async esperarRateLimit(response) {
    const retryAfter = response.headers.get('Retry-After') || 60;
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  }
}
```

## 📊 Filtros Avanzados para IA

```javascript
// Filtros comunes para sistemas de IA
const filtrosIA = {
  // Chats que necesitan respuesta inmediata
  urgentes: {
    status: 'ACTIVE',
    tags: ['urgent', 'vip'],
    assignedTo: null,
    updatedAt: { $gte: new Date(Date.now() - 5 * 60000) } // Últimos 5 min
  },
  
  // Chats sin actividad reciente (para follow-up)
  inactivos: {
    status: 'ACTIVE',
    updatedAt: { $lte: new Date(Date.now() - 30 * 60000) } // Más de 30 min
  },
  
  // Chats para análisis de satisfacción
  completados: {
    status: 'CLOSED',
    closedAt: { $gte: new Date(Date.now() - 24 * 60 * 60000) }, // Último día
    satisfaction: { $exists: true }
  }
};
```

---

> **Nota**: Los endpoints de Chats V2 están optimizados para alto rendimiento. Para integraciones de IA intensivas, considera implementar caché local y procesamiento por lotes para minimizar latencia.