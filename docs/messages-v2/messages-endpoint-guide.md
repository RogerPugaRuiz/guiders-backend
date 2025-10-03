# Guía del Endpoint de Mensajes V2

Documentación completa del endpoint para obtener mensajes de un chat con paginación basada en cursor.

## 📋 Tabla de Contenidos

- [Información General](#información-general)
- [Autenticación](#autenticación)
- [Estructura del Endpoint](#estructura-del-endpoint)
- [Parámetros de Consulta](#parámetros-de-consulta)
- [Estructura de Respuesta](#estructura-de-respuesta)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Casos de Uso Comunes](#casos-de-uso-comunes)
- [Manejo de Errores](#manejo-de-errores)

---

## Información General

**Endpoint**: `GET /api/v2/messages/chat/:chatId`

**Descripción**: Obtiene los mensajes de un chat específico con soporte para:

- ✅ Paginación basada en cursor (más eficiente que offset/limit)
- ✅ Filtros avanzados (tipo, fecha, remitente, archivos adjuntos)
- ✅ Ordenamiento personalizable
- ✅ Autenticación dual (JWT + sesión de visitante)

**Características**:

- **Paginación cursor**: Evita problemas de duplicados/omisiones con datos cambiantes
- **Filtros flexibles**: Por tipo de mensaje, fechas, remitente, archivos adjuntos
- **Control de acceso**: Comerciales ven todo, visitantes solo sus propios chats
- **Performance**: Headers de caché óptimos para real-time

---

## Autenticación

Este endpoint soporta **múltiples mecanismos de autenticación**:

### 1. Bearer Token (JWT)

Para comerciales, administradores y supervisores:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Cookie de Sesión (Visitantes)

Para visitantes autenticados:

```bash
Cookie: sid=temp_1758226307441_5bjqvmz1vf3
```

### 3. Header X-Guiders-Sid (Alternativa)

Cabecera HTTP para enviar session ID:

```bash
X-Guiders-Sid: temp_1758226307441_5bjqvmz1vf3
```

### 4. Cookies Adicionales

Accesibles desde JavaScript:

- `x-guiders-sid`
- `guiders_session_id`

**Nota**: Se requiere **al menos una** forma de autenticación válida.

---

## Estructura del Endpoint

### URL Pattern

```http
GET /api/v2/messages/chat/{chatId}?cursor={cursor}&limit={limit}&filters={...}&sort={...}
```

### Path Parameters

| Parámetro | Tipo   | Requerido | Descripción                  | Ejemplo                                |
| --------- | ------ | --------- | ---------------------------- | -------------------------------------- |
| `chatId`  | string | ✅ Sí     | ID único del chat (UUID v4)  | `550e8400-e29b-41d4-a716-446655440000` |

---

## Parámetros de Consulta

### Paginación

| Parámetro | Tipo   | Requerido | Descripción                                              | Ejemplo                                             | Valor por defecto |
| --------- | ------ | --------- | -------------------------------------------------------- | --------------------------------------------------- | ----------------- |
| `cursor`  | string | ❌ No     | Cursor de paginación (obtenido de `nextCursor` previo)   | `eyJzZW50QXQiOiIyMDI1LTA3LTI4VDEwOjMwOjAwLjAwMFoi...` | `undefined` (primera página) |
| `limit`   | number | ❌ No     | Número máximo de mensajes por página (1-100)             | `50`                                                | `50`              |

### Filtros (Objeto `filters`)

Todos los filtros son opcionales y se pueden combinar:

| Campo            | Tipo      | Descripción                                                         | Ejemplo                                   |
| ---------------- | --------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `types`          | string[]  | Tipos de mensaje a incluir: `text`, `image`, `file`, `system`      | `["text", "image"]`                       |
| `dateFrom`       | string    | Fecha de inicio del rango (ISO 8601)                                | `"2025-07-01T00:00:00Z"`                  |
| `dateTo`         | string    | Fecha de fin del rango (ISO 8601)                                   | `"2025-07-31T23:59:59Z"`                  |
| `senderId`       | string    | ID del remitente del mensaje (UUID)                                 | `"550e8400-e29b-41d4-a716-446655440001"`  |
| `senderType`     | string    | Tipo de remitente: `visitor`, `commercial`, `system`                | `"commercial"`                            |
| `isRead`         | boolean   | Filtrar por mensajes leídos (`true`) o no leídos (`false`)         | `false`                                   |
| `hasAttachments` | boolean   | Filtrar mensajes con archivos adjuntos                              | `true`                                    |
| `keyword`        | string    | Búsqueda en el contenido del mensaje                                | `"problema técnico"`                      |

### Ordenamiento (Objeto `sort`)

| Campo       | Tipo   | Descripción                               | Valores permitidos           | Valor por defecto |
| ----------- | ------ | ----------------------------------------- | ---------------------------- | ----------------- |
| `field`     | string | Campo por el cual ordenar                 | `sentAt`, `readAt`, `type`   | `sentAt`          |
| `direction` | string | Dirección del ordenamiento                | `ASC`, `DESC`                | `DESC`            |

---

## Estructura de Respuesta

### Respuesta Exitosa (200 OK)

```json
{
  "messages": [
    {
      "id": "msg-123",
      "chatId": "chat-456",
      "senderId": "user-789",
      "content": "Hola, ¿en qué puedo ayudarte?",
      "type": "text",
      "isInternal": false,
      "isFirstResponse": true,
      "createdAt": "2025-07-28T10:30:00.000Z",
      "updatedAt": "2025-07-28T10:30:00.000Z"
    },
    {
      "id": "msg-124",
      "chatId": "chat-456",
      "senderId": "visitor-321",
      "content": "Necesito ayuda con mi pedido",
      "type": "text",
      "isInternal": false,
      "isFirstResponse": false,
      "createdAt": "2025-07-28T10:28:00.000Z",
      "updatedAt": "2025-07-28T10:28:00.000Z"
    }
  ],
  "total": 150,
  "hasMore": true,
  "nextCursor": "eyJzZW50QXQiOiIyMDI1LTA3LTI4VDEwOjI4OjAwLjAwMFoiLCJpZCI6Im1zZy0xMjQifQ=="
}
```

### Campos de Respuesta

#### Objeto Principal

| Campo        | Tipo                    | Descripción                                      |
| ------------ | ----------------------- | ------------------------------------------------ |
| `messages`   | MessageResponseDto[]    | Array de mensajes de la página actual           |
| `total`      | number                  | Número total de mensajes que cumplen los filtros |
| `hasMore`    | boolean                 | Indica si hay más mensajes disponibles           |
| `nextCursor` | string (opcional)       | Cursor para obtener la siguiente página         |

#### Objeto MessageResponseDto

| Campo             | Tipo                | Descripción                                               |
| ----------------- | ------------------- | --------------------------------------------------------- |
| `id`              | string              | ID único del mensaje (UUID)                               |
| `chatId`          | string              | ID del chat al que pertenece                              |
| `senderId`        | string              | ID del remitente del mensaje                              |
| `content`         | string              | Contenido del mensaje                                     |
| `type`            | string              | Tipo: `text`, `image`, `file`, `system`                   |
| `systemData`      | object (opcional)   | Datos adicionales para mensajes tipo `system`             |
| `attachment`      | object (opcional)   | Información del archivo adjunto                           |
| `isInternal`      | boolean             | Si es mensaje interno (solo visible para comerciales)     |
| `isFirstResponse` | boolean             | Si es la primera respuesta del comercial al visitante     |
| `createdAt`       | string (ISO 8601)   | Fecha y hora de creación                                  |
| `updatedAt`       | string (ISO 8601)   | Fecha y hora de última actualización                      |

#### Objeto Attachment (opcional)

| Campo      | Tipo   | Descripción                   |
| ---------- | ------ | ----------------------------- |
| `url`      | string | URL del archivo adjunto       |
| `fileName` | string | Nombre del archivo            |
| `fileSize` | number | Tamaño en bytes               |
| `mimeType` | string | Tipo MIME del archivo         |

#### Objeto SystemData (opcional)

| Campo        | Tipo   | Descripción                                      |
| ------------ | ------ | ------------------------------------------------ |
| `action`     | string | Acción realizada (ej: `assigned`, `closed`)      |
| `fromUserId` | string | ID del usuario origen (en transferencias)        |
| `toUserId`   | string | ID del usuario destino (en transferencias)       |
| `reason`     | string | Motivo de la acción del sistema                  |

---

## Ejemplos de Uso

### 1. Obtener Primera Página (50 mensajes más recientes)

#### Request con cURL

```bash
curl -X GET \
  'http://localhost:3000/api/v2/messages/chat/db9f4882-a0d4-41f4-9915-4cffb88874dd?limit=50' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

#### JavaScript (Fetch)

```javascript
const chatId = 'db9f4882-a0d4-41f4-9915-4cffb88874dd';
const response = await fetch(
  `http://localhost:3000/api/v2/messages/chat/${chatId}?limit=50`,
  {
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  }
);

const data = await response.json();
console.log(`Total de mensajes: ${data.total}`);
console.log(`Mensajes en esta página: ${data.messages.length}`);
console.log(`¿Hay más páginas?: ${data.hasMore}`);
```

#### TypeScript (Axios)

```typescript
import axios from 'axios';

interface MessageListResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

const getMessages = async (chatId: string): Promise<MessageListResponse> => {
  const response = await axios.get<MessageListResponse>(
    `http://localhost:3000/api/v2/messages/chat/${chatId}`,
    {
      params: { limit: 50 },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

const data = await getMessages('db9f4882-a0d4-41f4-9915-4cffb88874dd');
```

---

### 2. Navegación de Páginas con Cursor

**Implementación en JavaScript**:

```javascript
class MessagePaginator {
  constructor(chatId, token) {
    this.chatId = chatId;
    this.token = token;
    this.baseUrl = 'http://localhost:3000/api/v2/messages/chat';
  }

  async getPage(cursor = null, limit = 50) {
    const url = new URL(`${this.baseUrl}/${this.chatId}`);
    url.searchParams.set('limit', limit);
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getAllMessages() {
    const allMessages = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      const data = await this.getPage(cursor);
      allMessages.push(...data.messages);
      cursor = data.nextCursor;
      hasMore = data.hasMore && cursor !== null;
    }

    return allMessages;
  }
}

// Uso
const paginator = new MessagePaginator(
  'db9f4882-a0d4-41f4-9915-4cffb88874dd',
  'your-jwt-token'
);

// Obtener primera página
const firstPage = await paginator.getPage();
console.log(`Mensajes: ${firstPage.messages.length}/${firstPage.total}`);

// Obtener siguiente página
if (firstPage.hasMore) {
  const secondPage = await paginator.getPage(firstPage.nextCursor);
  console.log(`Segunda página: ${secondPage.messages.length} mensajes`);
}

// Obtener TODOS los mensajes (¡cuidado con chats grandes!)
const allMessages = await paginator.getAllMessages();
console.log(`Total de mensajes obtenidos: ${allMessages.length}`);
```

---

### 3. Filtrar Mensajes por Fecha

**Ejemplo con cURL**:

```bash
curl -X GET \
  'http://localhost:3000/api/v2/messages/chat/db9f4882-a0d4-41f4-9915-4cffb88874dd' \
  -H 'Authorization: Bearer your-token' \
  -G \
  --data-urlencode 'filters[dateFrom]=2025-07-01T00:00:00Z' \
  --data-urlencode 'filters[dateTo]=2025-07-31T23:59:59Z' \
  --data-urlencode 'limit=50'
```

**Implementación en JavaScript**:

```javascript
const getMessagesByDateRange = async (chatId, dateFrom, dateTo) => {
  const url = new URL(`http://localhost:3000/api/v2/messages/chat/${chatId}`);

  url.searchParams.set('filters[dateFrom]', dateFrom);
  url.searchParams.set('filters[dateTo]', dateTo);
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
};

// Obtener mensajes del último mes
const lastMonth = new Date();
lastMonth.setMonth(lastMonth.getMonth() - 1);

const messages = await getMessagesByDateRange(
  'db9f4882-a0d4-41f4-9915-4cffb88874dd',
  lastMonth.toISOString(),
  new Date().toISOString()
);

console.log(`Mensajes del último mes: ${messages.messages.length}`);
```

---

### 4. Filtrar por Tipo de Mensaje

**Implementación en JavaScript**:

```javascript
// Obtener solo mensajes de texto
const getTextMessages = async (chatId) => {
  const url = new URL(`http://localhost:3000/api/v2/messages/chat/${chatId}`);
  url.searchParams.set('filters[types][]', 'text');
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return response.json();
};

// Obtener mensajes con archivos adjuntos (imágenes y archivos)
const getMediaMessages = async (chatId) => {
  const url = new URL(`http://localhost:3000/api/v2/messages/chat/${chatId}`);
  url.searchParams.set('filters[types][]', 'image');
  url.searchParams.set('filters[types][]', 'file');
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return response.json();
};
```

---

### 5. Filtrar por Remitente

**Implementación en JavaScript**:

```javascript
// Obtener solo mensajes de comerciales
const getCommercialMessages = async (chatId) => {
  const url = new URL(`http://localhost:3000/api/v2/messages/chat/${chatId}`);
  url.searchParams.set('filters[senderType]', 'commercial');
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return response.json();
};

// Obtener mensajes de un comercial específico
const getMessagesFromSender = async (chatId, senderId) => {
  const url = new URL(`http://localhost:3000/api/v2/messages/chat/${chatId}`);
  url.searchParams.set('filters[senderId]', senderId);
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return response.json();
};
```

---

### 6. Filtrar Mensajes con Archivos Adjuntos

**Implementación en JavaScript**:

```javascript
const getMessagesWithAttachments = async (chatId) => {
  const url = new URL(`http://localhost:3000/api/v2/messages/chat/${chatId}`);
  url.searchParams.set('filters[hasAttachments]', 'true');
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  const data = await response.json();

  // Procesar archivos adjuntos
  data.messages.forEach((message) => {
    if (message.attachment) {
      console.log(`Archivo: ${message.attachment.fileName}`);
      console.log(`Tamaño: ${message.attachment.fileSize} bytes`);
      console.log(`URL: ${message.attachment.url}`);
    }
  });

  return data;
};
```

---

### 7. Ordenamiento Personalizado

**Implementación en JavaScript**:

```javascript
// Obtener mensajes más antiguos primero
const getOldestFirst = async (chatId) => {
  const url = new URL(`http://localhost:3000/api/v2/messages/chat/${chatId}`);
  url.searchParams.set('sort[field]', 'sentAt');
  url.searchParams.set('sort[direction]', 'ASC');
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return response.json();
};

// Obtener mensajes más recientes primero (por defecto)
const getNewestFirst = async (chatId) => {
  const url = new URL(`http://localhost:3000/api/v2/messages/chat/${chatId}`);
  url.searchParams.set('sort[field]', 'sentAt');
  url.searchParams.set('sort[direction]', 'DESC');
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return response.json();
};
```

---

### 8. Combinación de Filtros Complejos

#### JavaScript

```javascript
// Obtener mensajes de texto de comerciales del último mes que contengan "problema"
const getComplexFiltered = async (chatId) => {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const url = new URL(`http://localhost:3000/api/v2/messages/chat/${chatId}`);

  // Filtros de tipo
  url.searchParams.set('filters[types][]', 'text');

  // Filtros de remitente
  url.searchParams.set('filters[senderType]', 'commercial');

  // Filtros de fecha
  url.searchParams.set('filters[dateFrom]', lastMonth.toISOString());
  url.searchParams.set('filters[dateTo]', new Date().toISOString());

  // Búsqueda por palabra clave
  url.searchParams.set('filters[keyword]', 'problema');

  // Paginación
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return response.json();
};
```

---

### 9. Componente React con Scroll Infinito

#### React Component

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: string;
  isInternal: boolean;
  isFirstResponse: boolean;
  createdAt: string;
  updatedAt: string;
  attachment?: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

interface MessageListResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

const ChatMessages: React.FC<{ chatId: string; token: string }> = ({
  chatId,
  token,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const { ref, inView } = useInView({
    threshold: 0,
  });

  const loadMessages = useCallback(
    async (cursor: string | null = null) => {
      if (loading) return;

      setLoading(true);
      try {
        const url = new URL(
          `http://localhost:3000/api/v2/messages/chat/${chatId}`
        );
        url.searchParams.set('limit', '50');
        if (cursor) {
          url.searchParams.set('cursor', cursor);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: MessageListResponse = await response.json();

        setMessages((prev) =>
          cursor ? [...prev, ...data.messages] : data.messages
        );
        setNextCursor(data.nextCursor || null);
        setHasMore(data.hasMore);
        setTotal(data.total);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    },
    [chatId, token, loading]
  );

  // Cargar primera página al montar
  useEffect(() => {
    loadMessages();
  }, []);

  // Cargar más cuando el trigger está visible
  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMessages(nextCursor);
    }
  }, [inView, hasMore, loading, nextCursor, loadMessages]);

  return (
    <div className="chat-messages">
      <div className="messages-header">
        <h2>Mensajes del Chat</h2>
        <p>
          Mostrando {messages.length} de {total} mensajes
        </p>
      </div>

      <div className="messages-list">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.type} ${message.isInternal ? 'internal' : ''}`}
          >
            <div className="message-content">{message.content}</div>
            {message.attachment && (
              <div className="message-attachment">
                <a
                  href={message.attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📎 {message.attachment.fileName} (
                  {(message.attachment.fileSize / 1024).toFixed(2)} KB)
                </a>
              </div>
            )}
            <div className="message-meta">
              <span className="message-time">
                {new Date(message.createdAt).toLocaleString()}
              </span>
              {message.isFirstResponse && (
                <span className="first-response-badge">Primera respuesta</span>
              )}
            </div>
          </div>
        ))}

        {/* Trigger para scroll infinito */}
        {hasMore && (
          <div ref={ref} className="loading-trigger">
            {loading ? 'Cargando más mensajes...' : 'Scroll para cargar más'}
          </div>
        )}

        {!hasMore && messages.length > 0 && (
          <div className="no-more-messages">
            ✅ Todos los mensajes cargados
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessages;
```

---

## Casos de Uso Comunes

### 1. Vista de Chat en Tiempo Real

**Objetivo**: Mostrar mensajes más recientes primero con actualización automática.

```javascript
class RealtimeChatView {
  constructor(chatId, token) {
    this.chatId = chatId;
    this.token = token;
    this.messages = [];
    this.total = 0;
    this.refreshInterval = null;
  }

  async loadInitialMessages() {
    const url = new URL(
      `http://localhost:3000/api/v2/messages/chat/${this.chatId}`
    );
    url.searchParams.set('limit', '50');
    url.searchParams.set('sort[field]', 'sentAt');
    url.searchParams.set('sort[direction]', 'DESC');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    const data = await response.json();
    this.messages = data.messages.reverse(); // Invertir para mostrar cronológicamente
    this.total = data.total;

    return this.messages;
  }

  async checkNewMessages() {
    if (this.messages.length === 0) return [];

    const latestMessage = this.messages[this.messages.length - 1];
    const url = new URL(
      `http://localhost:3000/api/v2/messages/chat/${this.chatId}`
    );
    url.searchParams.set('filters[dateFrom]', latestMessage.createdAt);
    url.searchParams.set('sort[field]', 'sentAt');
    url.searchParams.set('sort[direction]', 'ASC');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    const data = await response.json();

    // Filtrar el mensaje más reciente que ya tenemos
    const newMessages = data.messages.filter(
      (msg) => msg.id !== latestMessage.id
    );

    if (newMessages.length > 0) {
      this.messages.push(...newMessages);
      this.total += newMessages.length;
    }

    return newMessages;
  }

  startAutoRefresh(intervalMs = 3000) {
    this.refreshInterval = setInterval(async () => {
      const newMessages = await this.checkNewMessages();
      if (newMessages.length > 0) {
        console.log(`${newMessages.length} nuevos mensajes recibidos`);
        // Aquí puedes emitir un evento o actualizar la UI
      }
    }, intervalMs);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// Uso
const chatView = new RealtimeChatView(
  'db9f4882-a0d4-41f4-9915-4cffb88874dd',
  'your-token'
);
await chatView.loadInitialMessages();
chatView.startAutoRefresh(3000); // Verificar cada 3 segundos
```

---

### 2. Exportar Conversación Completa

**Objetivo**: Descargar todos los mensajes de un chat para análisis o backup.

```javascript
async function exportChatMessages(chatId, token) {
  const allMessages = [];
  let cursor = null;
  let hasMore = true;

  console.log('Iniciando exportación de mensajes...');

  while (hasMore) {
    const url = new URL(
      `http://localhost:3000/api/v2/messages/chat/${chatId}`
    );
    url.searchParams.set('limit', '100'); // Máximo por página
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    allMessages.push(...data.messages);
    cursor = data.nextCursor;
    hasMore = data.hasMore && cursor !== null;

    console.log(
      `Progreso: ${allMessages.length}/${data.total} mensajes descargados`
    );
  }

  console.log(`✅ Exportación completa: ${allMessages.length} mensajes`);

  // Convertir a CSV
  const csv = convertToCSV(allMessages);

  // Descargar como archivo
  downloadFile(csv, `chat-${chatId}-export.csv`, 'text/csv');

  return allMessages;
}

function convertToCSV(messages) {
  const headers = [
    'ID',
    'Fecha',
    'Remitente',
    'Tipo',
    'Contenido',
    'Es Interno',
    'Primera Respuesta',
  ];
  const rows = messages.map((msg) => [
    msg.id,
    msg.createdAt,
    msg.senderId,
    msg.type,
    `"${msg.content.replace(/"/g, '""')}"`, // Escapar comillas
    msg.isInternal ? 'Sí' : 'No',
    msg.isFirstResponse ? 'Sí' : 'No',
  ]);

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

---

### 3. Buscar Mensajes con Keyword

**Objetivo**: Encontrar mensajes que contengan una palabra clave específica.

```javascript
async function searchMessagesInChat(chatId, keyword, token) {
  const url = new URL(
    `http://localhost:3000/api/v2/messages/chat/${chatId}`
  );
  url.searchParams.set('filters[keyword]', keyword);
  url.searchParams.set('limit', '50');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  console.log(`Encontrados ${data.total} mensajes con "${keyword}"`);

  // Resaltar keyword en los resultados
  data.messages.forEach((msg) => {
    const highlightedContent = msg.content.replace(
      new RegExp(keyword, 'gi'),
      (match) => `**${match}**`
    );
    console.log(`[${msg.createdAt}] ${highlightedContent}`);
  });

  return data;
}
```

---

### 4. Análisis de Primera Respuesta

**Objetivo**: Identificar mensajes que son la primera respuesta del comercial.

```javascript
async function analyzeFirstResponses(chatId, token) {
  const url = new URL(
    `http://localhost:3000/api/v2/messages/chat/${chatId}`
  );
  url.searchParams.set('limit', '100');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();

  // Encontrar primera respuesta
  const firstResponse = data.messages.find((msg) => msg.isFirstResponse);

  if (!firstResponse) {
    console.log('No hay primera respuesta aún');
    return null;
  }

  // Calcular tiempo de respuesta
  const visitorFirstMessage = data.messages
    .reverse()
    .find((msg) => msg.senderId !== firstResponse.senderId);

  if (visitorFirstMessage) {
    const responseTime =
      new Date(firstResponse.createdAt) -
      new Date(visitorFirstMessage.createdAt);
    const minutes = Math.floor(responseTime / 60000);
    const seconds = Math.floor((responseTime % 60000) / 1000);

    console.log(`⏱️ Tiempo de primera respuesta: ${minutes}m ${seconds}s`);
  }

  return firstResponse;
}
```

---

## Manejo de Errores

### Códigos de Estado HTTP

| Código | Descripción                                                      | Solución                                               |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------ |
| 200    | ✅ Éxito - Mensajes obtenidos correctamente                     | -                                                      |
| 401    | ❌ No autenticado - Bearer token o cookie de sesión inválido    | Verificar token JWT o session ID                       |
| 403    | ❌ Sin permisos - No puede acceder a este chat                  | Verificar que el usuario tenga permisos en el chat     |
| 404    | ❌ Chat no encontrado                                            | Verificar que el `chatId` exista                       |
| 500    | ❌ Error interno del servidor                                    | Revisar logs del servidor, reintentar                  |

### Ejemplo de Manejo de Errores

```javascript
async function getMessagesWithErrorHandling(chatId, token) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/v2/messages/chat/${chatId}?limit=50`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      switch (response.status) {
        case 401:
          throw new Error(
            'Autenticación inválida. Por favor inicia sesión nuevamente.'
          );
        case 403:
          throw new Error('No tienes permisos para acceder a este chat.');
        case 404:
          throw new Error(
            'Chat no encontrado. Verifica el ID del chat.'
          );
        case 500:
          throw new Error(
            'Error del servidor. Por favor intenta nuevamente más tarde.'
          );
        default:
          throw new Error(`Error HTTP: ${response.status}`);
      }
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Error de red:', error.message);
      throw new Error(
        'No se pudo conectar al servidor. Verifica tu conexión a internet.'
      );
    }
    throw error;
  }
}

// Uso con manejo de errores
try {
  const data = await getMessagesWithErrorHandling(
    'db9f4882-a0d4-41f4-9915-4cffb88874dd',
    'your-token'
  );
  console.log(`✅ Obtenidos ${data.messages.length} mensajes`);
} catch (error) {
  console.error('❌ Error:', error.message);
  // Mostrar mensaje al usuario, registrar en sistema de monitoreo, etc.
}
```

---

## Headers de Cache

Este endpoint incluye headers para prevenir caché en navegadores:

```http
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

**Razón**: Los mensajes son datos en tiempo real y deben reflejarse inmediatamente. No se debe usar caché del navegador.

---

## Notas Importantes

1. **Cursor vs Offset**: Este endpoint usa paginación basada en **cursor** en lugar de offset/limit tradicional. Los cursores son más eficientes y evitan duplicados cuando se insertan nuevos mensajes.

2. **Límite Máximo**: El parámetro `limit` acepta valores de 1 a 100. Si se omite, el valor por defecto es 50.

3. **Total Count**: El campo `total` siempre refleja el número **total** de mensajes que cumplen los filtros, no solo los de la página actual.

4. **Ordenamiento por Defecto**: Por defecto, los mensajes se ordenan por `sentAt DESC` (más recientes primero).

5. **Autenticación Dual**: Tanto comerciales (JWT) como visitantes (sesión) pueden usar este endpoint con diferentes niveles de acceso.

6. **Mensajes Internos**: Los visitantes NO pueden ver mensajes con `isInternal: true`. Solo son visibles para comerciales, supervisores y administradores.

7. **Real-Time**: Para actualizaciones en tiempo real, considera usar WebSockets además de polling con este endpoint.

---

## Recursos Adicionales

- **Swagger Documentation**: `http://localhost:3000/api/docs`
- **WebSocket Events**: Ver documentación de real-time para eventos de mensajes
- **Autenticación BFF**: Ver `docs/bff-frontend-usage.md` para autenticación con cookies

---

**Última actualización**: 2025-07-28
**Versión**: 2.0
**Mantenedor**: Guiders Backend Team
