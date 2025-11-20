# Guía de Integración Frontend - Sistema de Presencia y Typing Indicators

## Introducción

Esta guía te ayudará a integrar el sistema de presencia y typing indicators en tu aplicación frontend (React, Vue, Angular, etc.).

**⚠️ IMPORTANTE:** Esta guía es aplicable tanto para:
- **Frontend del Comercial** (panel de administración/dashboard de ventas)
- **Frontend del Visitante** (widget de chat/página web del cliente)

Ambos tipos de usuarios tienen las mismas capacidades y utilizan la misma API. La única diferencia es el parámetro `userType` que puede ser `'commercial'` o `'visitor'`.

## Casos de Uso por Tipo de Usuario

### Frontend del Comercial
- Ver qué visitantes están online/away/offline
- Recibir notificación cuando un visitante está escribiendo
- Mostrar su propio estado de presencia (online/busy/away)
- Ver el estado de otros comerciales en el equipo

### Frontend del Visitante
- Ver si el comercial asignado está online/away/offline
- Recibir notificación cuando el comercial está escribiendo
- Mostrar su propio estado (online/chatting/away)
- Saber si el comercial está disponible antes de iniciar conversación

## Autenticación y Diferenciación de Roles

### ¿Cómo sabe el sistema si soy comercial o visitante?

El backend utiliza **autenticación basada en sesiones (cookies)** para **ambos tipos de usuarios**. Esto se maneja mediante el `DualAuthGuard` que soporta múltiples métodos de autenticación por cookies.

**Métodos de autenticación soportados:**
1. **Cookies de sesión BFF** conectadas con Keycloak (para comerciales)
2. **Cookies de sesión de visitante** (cookie `sid` para visitantes)
3. **JWT Bearer token** (método alternativo, principalmente para APIs externas)

#### Comerciales (Dashboard/Panel de Ventas)

Los comerciales se autentican mediante **cookies de sesión BFF**:

```typescript
// 1. Login del comercial (crea sesión con cookies)
const loginResponse = await fetch('/auth/bff/login', {
  method: 'POST',
  credentials: 'include',  // ✅ IMPORTANTE: Incluir cookies
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'comercial@empresa.com',
    password: 'password123'
  })
});

const { user } = await loginResponse.json();
/*
{
  user: {
    id: "commercial-uuid-123",
    email: "comercial@empresa.com",
    roles: ["commercial"],  // <-- ROLES DEL USUARIO (array)
    name: "Juan Pérez"
  }
}
*/

// 2. Guardar información del usuario en localStorage (opcional, para UI)
localStorage.setItem('userType', 'commercial');
localStorage.setItem('userId', user.id);

// ✅ NO necesitas guardar tokens manualmente
// Las cookies se gestionan automáticamente por el navegador
```

**Las cookies de sesión se envían automáticamente:**

```typescript
// Hacer peticiones autenticadas
const response = await fetch('/presence/chat/chat-123', {
  credentials: 'include',  // ✅ Las cookies se envían automáticamente
  headers: { 'Content-Type': 'application/json' }
});

// ❌ NO necesitas: Authorization: Bearer {token}
// ✅ Las cookies BFF se incluyen automáticamente
```

#### Visitantes (Widget de Chat)

Los visitantes se autentican automáticamente con **cookie de sesión** (`sid`):

```typescript
// 1. Inicializar sesión de visitante (automático al cargar el widget)
const initVisitorSession = async () => {
  // El backend crea automáticamente una sesión y establece cookie 'sid'
  const response = await fetch('/auth/visitor/init', {
    method: 'POST',
    credentials: 'include',  // ✅ Importante: incluir cookies
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: 'site-uuid-456',
      // Opcional: datos del visitante si ya los tienes
      name: 'Visitante Anónimo',
      email: null
    })
  });

  const sessionData = await response.json();
  /*
  {
    sessionId: "session-uuid-789",
    visitorId: "visitor-uuid-012"
  }
  */

  // Guardar en localStorage para referencia (opcional, para UI)
  localStorage.setItem('visitorId', sessionData.visitorId);
  localStorage.setItem('userType', 'visitor');

  return sessionData;
};

// 2. Las cookies se envían automáticamente en todas las peticiones
const response = await fetch('/presence/chat/chat-123', {
  credentials: 'include',  // ✅ La cookie 'sid' se envía automáticamente
  headers: { 'Content-Type': 'application/json' }
});
```

### Resumen: ¿Cómo determino el userType en mi código?

Con autenticación basada en sesiones, el backend determina automáticamente el tipo de usuario desde las cookies. Tu frontend solo necesita consultar un endpoint para obtener el usuario actual:

```typescript
// Hook para obtener el usuario actual y su tipo
function useCurrentUser() {
  const [user, setUser] = useState<{
    id: string;
    type: 'commercial' | 'visitor';
    roles: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        // El backend determina el usuario automáticamente desde las cookies
        const response = await fetch('/auth/me', {
          credentials: 'include',  // ✅ Envía cookies automáticamente
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const userData = await response.json();
        /*
        Respuesta del backend:
        {
          id: "user-uuid-123",
          roles: ["commercial"] | ["visitor"],
          email: "user@example.com",
          ...
        }
        */

        // Determinar tipo según roles
        const userType = userData.roles.includes('commercial') ? 'commercial' : 'visitor';

        setUser({
          id: userData.id,
          type: userType,
          roles: userData.roles
        });
      } catch (error) {
        console.error('Error al obtener usuario actual:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    fetchCurrentUser();
  }, []);

  return { user, loading };
}

// Uso en componentes
function ChatComponent() {
  const { user: currentUser, loading } = useCurrentUser();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!currentUser) {
    return <div>No autenticado</div>;
  }

  const { presence, typingUsers, startTyping, stopTyping } = useChatPresence(
    chatId,
    currentUser.id,    // ID del usuario
    currentUser.type   // 'commercial' o 'visitor' (determinado automáticamente)
  );

  // ... resto del componente
}
```

### Tabla de Diferencias de Autenticación

| Aspecto | Comercial | Visitante |
|---------|-----------|-----------|
| **Método de Auth** | Session Cookie (BFF) | Session Cookie (`sid`) |
| **Cookies** | `bff_sess`, `console_session` | `sid` |
| **Header** | `credentials: 'include'` | `credentials: 'include'` |
| **Login** | Email + Password | Automático al cargar widget |
| **Roles** | `["commercial"]` o `["admin"]` | `["visitor"]` |
| **UserType** | `'commercial'` | `'visitor'` |
| **Storage** | localStorage (solo para UI) | localStorage (solo para UI) |
| **Fetch ejemplo** | `fetch('/api', { credentials: 'include' })` | `fetch('/api', { credentials: 'include' })` |

### Ejemplo Completo: Determinar UserType Automáticamente

```typescript
// services/auth.service.ts
export class AuthService {
  // Obtener usuario actual desde la sesión (basado en cookies)
  static async getCurrentUser(): Promise<{
    id: string;
    type: 'commercial' | 'visitor';
    roles: string[];
  } | null> {
    try {
      const response = await fetch('/auth/me', {
        credentials: 'include',  // ✅ Las cookies se envían automáticamente
      });

      if (!response.ok) {
        return null;
      }

      const userData = await response.json();

      // Determinar tipo según roles del usuario
      const userType = userData.roles.includes('commercial')
        ? 'commercial'
        : 'visitor';

      return {
        id: userData.id,
        type: userType,
        roles: userData.roles
      };
    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      return null;
    }
  }

  // Para comerciales - Login con BFF
  static async loginCommercial(email: string, password: string) {
    const response = await fetch('/auth/bff/login', {
      method: 'POST',
      credentials: 'include',  // ✅ Establece cookies de sesión
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Login failed');

    const { user } = await response.json();

    // Opcional: guardar en localStorage solo para UI
    localStorage.setItem('userId', user.id);
    localStorage.setItem('userType', 'commercial');

    return { user };
  }

  // Para visitantes - Inicializar sesión
  static async initVisitorSession(siteId: string) {
    const response = await fetch('/auth/visitor/init', {
      method: 'POST',
      credentials: 'include',  // ✅ Establece cookie 'sid'
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId })
    });

    if (!response.ok) throw new Error('Session init failed');

    const data = await response.json();

    // Opcional: guardar en localStorage solo para UI
    localStorage.setItem('visitorId', data.visitorId);
    localStorage.setItem('userType', 'visitor');

    return data;
  }

  // Logout (destruye sesión en backend)
  static async logout() {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include'  // ✅ Envía cookies para identificar sesión
    });

    localStorage.clear();
  }
}
```

### Cómo el Backend Diferencia los Roles

En el backend, el **DualAuthGuard** extrae automáticamente la información del usuario desde las cookies de sesión:

```typescript
// El endpoint valida automáticamente el rol usando DualAuthGuard
@Controller('presence')
@UseGuards(DualAuthGuard, RolesGuard)  // <-- DualAuthGuard maneja sesiones
export class PresenceController {

  @Post('chat/:chatId/typing/start')
  @Roles(['commercial', 'visitor'])  // <-- Acepta ambos roles
  async startTyping(
    @Param('chatId') chatId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<void> {
    // El DualAuthGuard ya pobló request.user desde las cookies
    const userId = request.user.id;
    const userRoles = request.user.roles || [];

    // Determinar userType según los roles
    const userType = userRoles.includes('commercial') ? 'commercial' : 'visitor';

    // El request.user viene de:
    // - Cookies BFF (comerciales): { id: 'xxx', roles: ['commercial'], ... }
    // - Cookie 'sid' (visitantes): { id: 'visitor-id', roles: ['visitor'], ... }
  }
}
```

**Cómo funciona el DualAuthGuard:**

1. Lee las cookies de la petición automáticamente
2. Valida la sesión correspondiente (BFF o visitor)
3. Puebla `request.user` con: `{ id, roles, email, username, companyId }`
4. El RolesGuard verifica que los roles del usuario coincidan con `@Roles([...])`

**No necesitas enviar headers de autenticación manualmente** - todo se maneja automáticamente con cookies.

## Configuración Inicial

### 1. Instalar Socket.IO Client

```bash
npm install socket.io-client
# o
yarn add socket.io-client
```

### 2. Conectar al WebSocket

```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:3000', {
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  withCredentials: true,  // ✅ IMPORTANTE: Enviar cookies con WebSocket
  // ❌ NO necesitas: auth: { token: ... }
  // Las cookies de sesión se envían automáticamente con withCredentials: true
});

// Manejar conexión exitosa
socket.on('connect', () => {
  console.log('Conectado al servidor WebSocket:', socket.id);
});

// Manejar errores de conexión
socket.on('connect_error', (error) => {
  console.error('Error de conexión:', error);
  // Si falla, verifica que tengas una sesión activa (cookies válidas)
});
```

**Nota importante sobre `withCredentials`:**
- Para **comerciales**: Las cookies BFF se envían automáticamente
- Para **visitantes**: La cookie `sid` se envía automáticamente
- No necesitas pasar tokens manualmente

## Unirse a una Sala de Chat

Antes de recibir notificaciones de un chat, debes unirte a su sala:

```typescript
function joinChat(chatId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.emit('chat:join', { chatId }, (response) => {
      if (response.success) {
        console.log('Unido al chat:', chatId);
        resolve();
      } else {
        console.error('Error al unirse al chat:', response.message);
        reject(new Error(response.message));
      }
    });
  });
}

// Salir de una sala de chat
function leaveChat(chatId: string): void {
  socket.emit('chat:leave', { chatId });
}
```

## Typing Indicators

### Enviar "Estoy Escribiendo"

Cuando el usuario comienza a escribir en el campo de texto:

```typescript
function startTyping(chatId: string, userId: string, userType: 'commercial' | 'visitor'): void {
  socket.emit('typing:start', {
    chatId,
    userId,
    userType,
  });
}

function stopTyping(chatId: string, userId: string, userType: 'commercial' | 'visitor'): void {
  socket.emit('typing:stop', {
    chatId,
    userId,
    userType,
  });
}
```

### Recibir Notificaciones de Typing

Escuchar cuando otros usuarios están escribiendo:

```typescript
socket.on('typing:start', (data: { chatId: string; userId: string; userType: string; timestamp: string }) => {
  console.log(`Usuario ${data.userId} (${data.userType}) está escribiendo en chat ${data.chatId}`);
  // Actualizar UI para mostrar indicador de "escribiendo"
  showTypingIndicator(data.userId);
});

socket.on('typing:stop', (data: { chatId: string; userId: string; userType: string; timestamp: string }) => {
  console.log(`Usuario ${data.userId} dejó de escribir`);
  // Ocultar indicador de "escribiendo"
  hideTypingIndicator(data.userId);
});
```

### Implementación con Debounce

Para evitar enviar demasiados eventos, usa debounce:

```typescript
import { debounce } from 'lodash';

let typingTimeout: NodeJS.Timeout | null = null;

const handleTyping = debounce((chatId: string, userId: string, userType: 'commercial' | 'visitor') => {
  // Enviar evento de "está escribiendo"
  startTyping(chatId, userId, userType);

  // Limpiar timeout previo
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }

  // Enviar "dejó de escribir" después de 2 segundos de inactividad
  typingTimeout = setTimeout(() => {
    stopTyping(chatId, userId, userType);
  }, 2000);
}, 300);

// Usar en el event handler del input
function onTextInputChange(event: React.ChangeEvent<HTMLInputElement>) {
  const text = event.target.value;
  if (text.length > 0) {
    handleTyping(currentChatId, currentUserId, currentUserType);
  }
}
```

## Estados de Presencia

### Recibir Cambios de Presencia

```typescript
socket.on('presence:changed', (data: {
  userId: string;
  userType: 'commercial' | 'visitor';
  status: 'online' | 'offline' | 'away' | 'busy' | 'chatting';
  previousStatus: string;
  timestamp: string;
}) => {
  console.log(`Estado de ${data.userId} cambió de ${data.previousStatus} a ${data.status}`);
  // Actualizar UI para reflejar el nuevo estado
  updateUserPresence(data.userId, data.status);
});
```

### Obtener Presencia de Participantes (API REST)

Si necesitas obtener el estado actual de los participantes:

```typescript
async function getChatPresence(chatId: string) {
  const response = await fetch(`/presence/chat/${chatId}`, {
    credentials: 'include',  // ✅ Las cookies se envían automáticamente
  });

  const data = await response.json();
  /*
  {
    "chatId": "chat-123",
    "participants": [
      {
        "userId": "visitor-456",
        "userType": "visitor",
        "connectionStatus": "online",
        "isTyping": false,
        "lastActivity": "2025-01-18T10:30:00.000Z"
      },
      {
        "userId": "commercial-789",
        "userType": "commercial",
        "connectionStatus": "away",
        "isTyping": true,
        "lastActivity": "2025-01-18T10:25:00.000Z"
      }
    ],
    "timestamp": "2025-01-18T10:30:15.000Z"
  }
  */
  return data;
}
```

## Ejemplo Completo con React Hook

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { debounce } from 'lodash';

interface Participant {
  userId: string;
  userType: 'commercial' | 'visitor';
  connectionStatus: string;
  isTyping: boolean;
  lastActivity?: string;
}

interface ChatPresence {
  chatId: string;
  participants: Participant[];
  timestamp: string;
}

export function useChatPresence(
  chatId: string,
  currentUserId: string,
  currentUserType: 'commercial' | 'visitor'
) {
  const [presence, setPresence] = useState<ChatPresence | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Conectar al WebSocket
  useEffect(() => {
    const socket = io('http://localhost:3000', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      withCredentials: true,  // ✅ Enviar cookies automáticamente
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Conectado al WebSocket');
      // Unirse a la sala del chat
      socket.emit('chat:join', { chatId });
    });

    socket.on('typing:start', (data: { userId: string; userType: string }) => {
      if (data.userId !== currentUserId) {
        setTypingUsers(prev => new Set(prev).add(data.userId));
      }
    });

    socket.on('typing:stop', (data: { userId: string }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    socket.on('presence:changed', (data: {
      userId: string;
      status: string;
    }) => {
      setPresence(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: prev.participants.map(p =>
            p.userId === data.userId
              ? { ...p, connectionStatus: data.status }
              : p
          ),
        };
      });
    });

    return () => {
      socket.emit('chat:leave', { chatId });
      socket.disconnect();
    };
  }, [chatId, currentUserId]);

  // Obtener presencia inicial
  useEffect(() => {
    async function fetchPresence() {
      try {
        const response = await fetch(`/presence/chat/${chatId}`, {
          credentials: 'include',  // ✅ Enviar cookies automáticamente
        });
        const data = await response.json();
        setPresence(data);
      } catch (error) {
        console.error('Error al obtener presencia:', error);
      }
    }

    fetchPresence();
  }, [chatId]);

  // Función para indicar que estás escribiendo
  const startTyping = useCallback(
    debounce(() => {
      if (socketRef.current) {
        socketRef.current.emit('typing:start', {
          chatId,
          userId: currentUserId,
          userType: currentUserType,
        });

        // Auto-detener después de 2 segundos
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          stopTyping();
        }, 2000);
      }
    }, 300),
    [chatId, currentUserId, currentUserType]
  );

  const stopTyping = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('typing:stop', {
        chatId,
        userId: currentUserId,
        userType: currentUserType,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [chatId, currentUserId, currentUserType]);

  return {
    presence,
    typingUsers: Array.from(typingUsers),
    startTyping,
    stopTyping,
  };
}
```

### Uso del Hook

```tsx
function ChatComponent() {
  const { presence, typingUsers, startTyping, stopTyping } = useChatPresence(
    'chat-123',      // ID del chat
    'user-456',      // ID del usuario actual
    'visitor'        // Tipo de usuario
    // ✅ NO necesitas pasar token - las cookies se manejan automáticamente
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length > 0) {
      startTyping();
    }
  };

  const handleSendMessage = () => {
    stopTyping();
    // Enviar mensaje...
  };

  return (
    <div>
      {/* Mostrar estado de presencia */}
      <div className="presence-indicators">
        {presence?.participants.map(participant => (
          <div key={participant.userId}>
            <span className={`status-dot ${participant.connectionStatus}`} />
            {participant.userId}
            {participant.connectionStatus === 'away' && ' (Ausente)'}
          </div>
        ))}
      </div>

      {/* Mostrar indicador de "escribiendo" */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.length === 1
            ? `${typingUsers[0]} está escribiendo...`
            : `${typingUsers.length} personas están escribiendo...`}
        </div>
      )}

      {/* Campo de entrada */}
      <input
        type="text"
        onChange={handleInputChange}
        onBlur={stopTyping}
      />
      <button onClick={handleSendMessage}>Enviar</button>
    </div>
  );
}
```

## Estilos CSS de Ejemplo

```css
/* Indicador de estado de presencia */
.status-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

.status-dot.online {
  background-color: #4ade80; /* Verde */
}

.status-dot.away {
  background-color: #fbbf24; /* Amarillo */
}

.status-dot.offline {
  background-color: #9ca3af; /* Gris */
}

.status-dot.busy {
  background-color: #f87171; /* Rojo */
}

.status-dot.chatting {
  background-color: #60a5fa; /* Azul */
}

/* Indicador de "escribiendo" */
.typing-indicator {
  font-style: italic;
  color: #6b7280;
  font-size: 14px;
  padding: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Animación de puntos para "escribiendo" */
.typing-dots::after {
  content: '...';
  animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}
```

## Best Practices

### 1. Manejo de Reconexión

```typescript
socket.on('disconnect', () => {
  console.log('Desconectado del servidor');
});

socket.on('connect', () => {
  console.log('Reconectado al servidor');
  // Re-unirse a todas las salas activas
  activeChats.forEach(chatId => {
    socket.emit('chat:join', { chatId });
  });
});
```

### 2. Limpieza de Eventos

```typescript
useEffect(() => {
  // Suscribirse a eventos
  socket.on('typing:start', handleTypingStart);
  socket.on('typing:stop', handleTypingStop);
  socket.on('presence:changed', handlePresenceChanged);

  return () => {
    // Limpiar suscripciones
    socket.off('typing:start', handleTypingStart);
    socket.off('typing:stop', handleTypingStop);
    socket.off('presence:changed', handlePresenceChanged);
  };
}, []);
```

### 3. Debounce para Typing

Siempre usa debounce para evitar saturar el servidor:

```typescript
const debouncedStartTyping = debounce(startTyping, 300);
```

### 4. Timeout para Auto-Detener Typing

El servidor auto-expira el typing después de 3 segundos, pero es buena práctica manejarlo también en el cliente:

```typescript
let typingTimeout: NodeJS.Timeout;

function handleTyping() {
  socket.emit('typing:start', { ... });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { ... });
  }, 2000);
}
```

## Troubleshooting

### Problema: No recibo eventos de typing

**Solución:**
1. Verifica que te has unido a la sala del chat con `socket.emit('chat:join', { chatId })`
2. Verifica que el `userId` en los eventos coincide con tu usuario
3. Revisa que el socket está conectado: `socket.connected`

### Problema: El typing no expira automáticamente

**Solución:**
- El TTL en Redis es de 3 segundos. Si no ves la expiración, verifica que Redis esté corriendo
- Verifica los logs del servidor para errores de Redis
- Asegúrate de que el cliente envía `typing:stop` correctamente

### Problema: Los estados de presencia no se actualizan

**Solución:**
- Verifica que el scheduler de inactividad está habilitado: `PRESENCE_INACTIVITY_ENABLED=true`
- Verifica que los usuarios están enviando heartbeats de actividad
- Revisa los logs del servidor para ver si el scheduler está ejecutando

## Endpoints API REST

### GET /presence/chat/:chatId

Obtiene el estado de presencia actual de los participantes de un chat.

**Autenticación:** Cookies de sesión (automático con `credentials: 'include'`)

**Ejemplo:**
```typescript
const response = await fetch('/presence/chat/chat-123', {
  credentials: 'include'
});
```

**Response:**
```json
{
  "chatId": "chat-123",
  "participants": [
    {
      "userId": "user-456",
      "userType": "visitor",
      "connectionStatus": "online",
      "isTyping": false,
      "lastActivity": "2025-01-18T10:30:00.000Z"
    }
  ],
  "timestamp": "2025-01-18T10:30:15.000Z"
}
```

### POST /presence/chat/:chatId/typing/start

Inicia el indicador de "escribiendo" para el usuario actual.

**Autenticación:** Cookies de sesión (automático con `credentials: 'include'`)

**Ejemplo:**
```typescript
await fetch('/presence/chat/chat-123/typing/start', {
  method: 'POST',
  credentials: 'include'
});
```

**Response:** 204 No Content

### POST /presence/chat/:chatId/typing/stop

Detiene el indicador de "escribiendo" para el usuario actual.

**Autenticación:** Cookies de sesión (automático con `credentials: 'include'`)

**Ejemplo:**
```typescript
await fetch('/presence/chat/chat-123/typing/stop', {
  method: 'POST',
  credentials: 'include'
});
```

**Response:** 204 No Content

## Ejemplos Específicos por Tipo de Frontend

### Ejemplo: Frontend del Comercial (Dashboard de Ventas)

```tsx
import { useChatPresence } from './hooks/useChatPresence';

function CommercialChatPanel({ chatId }: { chatId: string }) {
  const currentUser = useAuth(); // Obtiene el comercial autenticado (desde sesión)

  const { presence, typingUsers, startTyping, stopTyping } = useChatPresence(
    chatId,
    currentUser.id,           // ID del comercial
    'commercial'              // Tipo de usuario
    // ✅ NO necesitas pasar token
  );

  // Encontrar el visitante en los participantes
  const visitor = presence?.participants.find(p => p.userType === 'visitor');

  return (
    <div className="commercial-chat-panel">
      {/* Mostrar estado del visitante */}
      <div className="visitor-info">
        <div className="visitor-status">
          <span className={`status-dot ${visitor?.connectionStatus}`} />
          {visitor?.connectionStatus === 'online' && 'Visitante conectado'}
          {visitor?.connectionStatus === 'away' && 'Visitante ausente'}
          {visitor?.connectionStatus === 'offline' && 'Visitante desconectado'}
        </div>

        {/* Mostrar si el visitante está escribiendo */}
        {visitor && typingUsers.includes(visitor.userId) && (
          <div className="typing-indicator">
            <span className="typing-dots">El visitante está escribiendo</span>
          </div>
        )}
      </div>

      {/* Campo de entrada del comercial */}
      <div className="message-input">
        <input
          type="text"
          placeholder="Escribe tu mensaje..."
          onChange={(e) => {
            if (e.target.value.length > 0) {
              startTyping(); // Notifica que estás escribiendo
            }
          }}
          onBlur={stopTyping} // Detiene typing al perder foco
        />
        <button onClick={() => {
          stopTyping();
          // Enviar mensaje...
        }}>
          Enviar
        </button>
      </div>
    </div>
  );
}
```

**Características específicas del comercial:**
- Puede ver su propio estado: `online`, `busy`, `away`
- Ve el estado de los visitantes: `online`, `chatting`, `away`, `offline`
- Puede tener múltiples chats abiertos simultáneamente
- Útil para priorizar respuestas según el estado del visitante

### Ejemplo: Frontend del Visitante (Widget de Chat)

```tsx
import { useChatPresence } from './hooks/useChatPresence';

function VisitorChatWidget({ chatId }: { chatId: string }) {
  const visitorSession = useVisitorSession(); // Obtiene la sesión del visitante (desde cookie 'sid')

  const { presence, typingUsers, startTyping, stopTyping } = useChatPresence(
    chatId,
    visitorSession.id,        // ID del visitante
    'visitor'                 // Tipo de usuario
    // ✅ NO necesitas pasar token
  );

  // Encontrar el comercial asignado
  const commercial = presence?.participants.find(p => p.userType === 'commercial');

  return (
    <div className="visitor-chat-widget">
      {/* Header con estado del comercial */}
      <div className="chat-header">
        <div className="commercial-info">
          <img src={commercial?.avatar} alt="Comercial" />
          <div>
            <h4>{commercial?.name || 'Agente de soporte'}</h4>
            <div className="status">
              <span className={`status-dot ${commercial?.connectionStatus}`} />
              {commercial?.connectionStatus === 'online' && 'Disponible'}
              {commercial?.connectionStatus === 'busy' && 'Ocupado'}
              {commercial?.connectionStatus === 'away' && 'Ausente'}
              {commercial?.connectionStatus === 'offline' && 'Sin conexión'}
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes del chat */}
      <div className="chat-messages">
        {/* ... mensajes ... */}

        {/* Mostrar si el comercial está escribiendo */}
        {commercial && typingUsers.includes(commercial.userId) && (
          <div className="typing-indicator">
            <div className="typing-bubble">
              <span className="typing-dots"></span>
              <span className="typing-dots"></span>
              <span className="typing-dots"></span>
            </div>
            <span className="typing-text">El agente está escribiendo...</span>
          </div>
        )}
      </div>

      {/* Input del visitante */}
      <div className="chat-input">
        {commercial?.connectionStatus === 'offline' && (
          <div className="offline-warning">
            El agente no está disponible. Envía tu mensaje y te responderemos pronto.
          </div>
        )}

        <textarea
          placeholder={
            commercial?.connectionStatus === 'online'
              ? 'Escribe tu mensaje...'
              : 'Deja tu mensaje...'
          }
          onChange={(e) => {
            if (e.target.value.length > 0) {
              startTyping();
            }
          }}
          onBlur={stopTyping}
        />
        <button onClick={() => {
          stopTyping();
          // Enviar mensaje...
        }}>
          Enviar
        </button>
      </div>
    </div>
  );
}
```

**Características específicas del visitante:**
- Ve solo el estado del comercial asignado a su chat
- Estados relevantes: `online`, `busy`, `away`, `offline`
- Puede adaptar su comportamiento según disponibilidad del comercial
- Indicador visual prominente de "escribiendo" para mejor UX

### Comparación de Estados

| Estado | Comercial | Visitante | Descripción |
|--------|-----------|-----------|-------------|
| `online` | ✅ | ✅ | Conectado y disponible |
| `offline` | ✅ | ✅ | Desconectado |
| `away` | ✅ | ✅ | Conectado pero inactivo >5min |
| `busy` | ✅ | ❌ | Solo para comerciales (múltiples chats) |
| `chatting` | ❌ | ✅ | Solo para visitantes (activo en chat) |

### Ejemplo: Lista de Visitantes Online (Dashboard del Comercial)

```tsx
function VisitorsList() {
  const [visitors, setVisitors] = useState([]);

  useEffect(() => {
    // Obtener lista de visitantes online
    const fetchVisitors = async () => {
      // Endpoint ficticio - implementar según tu API
      const response = await fetch('/visitors/online');
      const data = await response.json();
      setVisitors(data);
    };

    fetchVisitors();

    // Suscribirse a cambios de presencia
    socket.on('presence:changed', (event) => {
      if (event.userType === 'visitor') {
        setVisitors(prev => prev.map(v =>
          v.id === event.userId
            ? { ...v, status: event.status }
            : v
        ));
      }
    });

    return () => {
      socket.off('presence:changed');
    };
  }, []);

  return (
    <div className="visitors-list">
      <h3>Visitantes Conectados</h3>
      {visitors.map(visitor => (
        <div key={visitor.id} className="visitor-item">
          <span className={`status-dot ${visitor.status}`} />
          <span>{visitor.name || 'Visitante anónimo'}</span>
          <span className="status-text">
            {visitor.status === 'chatting' && '💬 En conversación'}
            {visitor.status === 'online' && '🟢 Navegando'}
            {visitor.status === 'away' && '🟡 Inactivo'}
          </span>
        </div>
      ))}
    </div>
  );
}
```

## Referencias

- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [React Hooks Best Practices](https://reactjs.org/docs/hooks-intro.html)
- Backend Implementation: `PRESENCE_TYPING_IMPLEMENTATION.md`

---

## Resumen Ejecutivo

✅ **El mismo código funciona para ambos frontends** (comercial y visitante)
✅ **La única diferencia:** parámetro `userType: 'commercial' | 'visitor'`
✅ **Misma API WebSocket:** Eventos `typing:start`, `typing:stop`, `presence:changed`
✅ **Mismos endpoints REST:** `/presence/chat/:chatId`

**Diferencias principales:**
- **Comerciales:** Pueden tener estado `busy` (múltiples chats), ven múltiples visitantes
- **Visitantes:** Pueden tener estado `chatting` (activo en chat), ven solo su comercial asignado

---

**Última actualización:** 2025-10-18
**Versión:** 2.0.0

**Cambios en v2.0.0:**
- ✅ Actualizado a autenticación basada en sesiones (cookies) para todos los usuarios
- ✅ Eliminada dependencia de JWT tokens en el frontend
- ✅ Implementado DualAuthGuard para manejo unificado de autenticación
- ✅ Simplificada la configuración de Socket.IO con `withCredentials: true`
- ✅ Actualizado todos los ejemplos para usar `credentials: 'include'`
