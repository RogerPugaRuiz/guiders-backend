# Historia 4.2: Alinear Estructura de Chat Conversation con API v2.4

Status: ready-for-dev

## Historia

Como desarrollador,
quiero que el formato de la conversación de chat enviada a LeadCars use la estructura oficial de la API v2.4,
para que las conversaciones se registren correctamente en el CRM.

## Criterios de Aceptación

1. **Dado** el tipo `LeadcarsAddChatConversationRequest`
   **Cuando** se envía a `POST /leads/{idLead}/chat_conversation`
   **Entonces** el payload tiene la estructura oficial:

   ```json
   {
     "chat": {
       "chat_id": "string",
       "users": [
         {
           "_id": "string",
           "user": {
             "name": "string",
             "first_lastname": "string",
             "second_lastname": "string",
             "email": "string",
             "phone": "string",
             "id": "string"
           }
         },
         {
           "_id": "string",
           "visitor": {
             "name": "string",
             "first_lastname": "string",
             "second_lastname": "string",
             "email": "string",
             "phone": "string",
             "id": "string"
           }
         }
       ],
       "messages": [
         {
           "_id": "string",
           "message": { "text": "string", "type": "text" },
           "created_at": "ISO 8601",
           "user_sender": "string",
           "interaction_type": "welcome | default | close"
         }
       ]
     }
   }
   ```

   **Y** no existen campos `lead_id`, `conversacion`, `fecha_inicio`, `fecha_fin`, `resumen`, `metadata`

2. **Dado** el primer mensaje de la conversación
   **Cuando** se mapea al formato LeadCars
   **Entonces** el `interaction_type` es `"welcome"`

3. **Dado** el último mensaje de la conversación
   **Cuando** se mapea al formato LeadCars
   **Entonces** el `interaction_type` es `"close"`

4. **Dado** mensajes intermedios (ni primero ni último)
   **Cuando** se mapean al formato LeadCars
   **Entonces** el `interaction_type` es `"default"`

5. **Dado** mensajes enviados por el comercial (senderType `'commercial'`)
   **Cuando** se construye el array `users[]`
   **Entonces** el usuario comercial aparece con clave `user` (no `visitor`)

6. **Dado** mensajes enviados por el visitante (senderType `'visitor'`)
   **Cuando** se construye el array `users[]`
   **Entonces** el visitante aparece con clave `visitor`

7. **Dado** mensajes enviados por bot o sistema (senderType `'bot'` o `'system'`)
   **Cuando** se mapean
   **Entonces** se tratan como si fueran del comercial (`user`) en el array de usuarios

## Tareas / Subtareas

- [ ] Actualizar tipos en `leadcars.types.ts` (AC: 1)
  - [ ] Crear `LeadcarsChatUser` con campos `_id: string` + `user?: LeadcarsUserProfile` + `visitor?: LeadcarsUserProfile`
  - [ ] Crear `LeadcarsUserProfile` con campos `name`, `first_lastname`, `second_lastname`, `email`, `phone`, `id`
  - [ ] Crear `LeadcarsChatMessage` con campos `_id`, `message: { text: string; type: 'text' }`, `created_at`, `user_sender`, `interaction_type: 'welcome' | 'default' | 'close'`
  - [ ] Crear `LeadcarsChatPayload` con campos `chat_id: string`, `users: LeadcarsChatUser[]`, `messages: LeadcarsChatMessage[]`
  - [ ] Redefinir `LeadcarsAddChatConversationRequest` como `{ chat: LeadcarsChatPayload }`
  - [ ] Eliminar tipos: `LeadcarsChatMessage` (versión antigua con `emisor`/`mensaje`/`fecha`), campos `conversacion`, `fecha_inicio`, `fecha_fin`, `resumen`, `metadata` del request
  - [ ] Actualizar `LeadcarsAddConversationResponse` si es necesario
- [ ] Actualizar `leadcars-crm-sync.adapter.ts` — syncChat (AC: 1-7)
  - [ ] Reescribir `convertMessagesToLeadcarsFormat()` para generar la estructura `{ chat: { chat_id, users[], messages[] } }`
  - [ ] Implementar `buildChatUsers()`: deduplica emisores y los convierte en `LeadcarsChatUser[]`
  - [ ] Implementar asignación de `interaction_type`: primer mensaje → `'welcome'`, último → `'close'`, resto → `'default'`
  - [ ] Implementar `buildUserProfile()` con datos disponibles (puede ser parcial si no hay datos completos)
  - [ ] Actualizar `syncChat()` para usar la nueva estructura sin `lead_id` (el ID va en la URL, ya está bien)
- [ ] Actualizar `leadcars-api.service.ts` — addChatConversation (AC: 1)
  - [ ] Simplificar el método: el `lead_id` ya no va en el body (solo en la URL)
  - [ ] Actualizar tipo del parámetro `request` a `LeadcarsAddChatConversationRequest` (sin el `Omit<..., 'lead_id'>`)
  - [ ] Eliminar el spread `{ ...request, lead_id: leadId }` — enviar directamente el `{ chat: ... }`
- [ ] Verificar que los tests existentes pasan con `npm run test:unit -- src/context/leads`

## Notas de Desarrollo

### Estructura de tipos nueva completa

```typescript
// Perfil de usuario en el chat
export interface LeadcarsUserProfile {
  name?: string;
  first_lastname?: string;
  second_lastname?: string;
  email?: string;
  phone?: string;
  id: string;
}

// Participante del chat (user = comercial, visitor = visitante)
export interface LeadcarsChatUser {
  _id: string;
  user?: LeadcarsUserProfile; // Comercial o bot
  visitor?: LeadcarsUserProfile; // Visitante
}

// Mensaje individual
export interface LeadcarsChatMessage {
  _id: string;
  message: {
    text: string;
    type: 'text';
  };
  created_at: string; // ISO 8601
  user_sender: string; // _id del usuario en users[]
  interaction_type: 'welcome' | 'default' | 'close';
}

// Cuerpo del chat completo
export interface LeadcarsChatPayload {
  chat_id: string;
  users: LeadcarsChatUser[];
  messages: LeadcarsChatMessage[];
}

// Request completo para POST /leads/{idLead}/chat_conversation
export interface LeadcarsAddChatConversationRequest {
  chat: LeadcarsChatPayload;
}
```

### Lógica de `convertMessagesToLeadcarsFormat`

```typescript
private convertMessagesToLeadcarsFormat(
  chatData: ChatSyncData,
): LeadcarsAddChatConversationRequest {
  const { chatId, visitorId, messages } = chatData;

  // 1. Construir mapa de participantes únicos
  const usersMap = new Map<string, LeadcarsChatUser>();

  for (const msg of messages) {
    const senderId = msg.metadata?.messageId as string || msg.sentAt.toISOString();
    const userKey = msg.senderType === 'visitor' ? visitorId : 'commercial';

    if (!usersMap.has(userKey)) {
      const chatUser: LeadcarsChatUser = { _id: userKey };
      if (msg.senderType === 'visitor') {
        chatUser.visitor = { id: visitorId };
      } else {
        chatUser.user = { id: 'commercial' };
      }
      usersMap.set(userKey, chatUser);
    }
  }

  // 2. Construir mensajes con interaction_type
  const totalMessages = messages.length;
  const chatMessages: LeadcarsChatMessage[] = messages.map((msg, index) => {
    let interaction_type: 'welcome' | 'default' | 'close';
    if (index === 0) interaction_type = 'welcome';
    else if (index === totalMessages - 1) interaction_type = 'close';
    else interaction_type = 'default';

    const userKey = msg.senderType === 'visitor' ? visitorId : 'commercial';

    return {
      _id: `${chatId}-msg-${index}`,
      message: { text: msg.content, type: 'text' },
      created_at: msg.sentAt.toISOString(),
      user_sender: userKey,
      interaction_type,
    };
  });

  return {
    chat: {
      chat_id: chatId,
      users: Array.from(usersMap.values()),
      messages: chatMessages,
    },
  };
}
```

### Actualización de `addChatConversation` en ApiService

```typescript
// ANTES:
async addChatConversation(
  leadId: number,
  request: Omit<LeadcarsAddChatConversationRequest, 'lead_id'>,
  config: LeadcarsConfig,
): Promise<Result<LeadcarsAddConversationResponse, DomainError>> {
  const url = `${this.getBaseUrl(config)}/leads/${leadId}/chat_conversation`;
  const payload: LeadcarsAddChatConversationRequest = {
    ...request,
    lead_id: leadId,  // ❌ lead_id no va en el body
  };
  // ...
}

// DESPUÉS:
async addChatConversation(
  leadId: number,
  request: LeadcarsAddChatConversationRequest,  // ✅ sin Omit
  config: LeadcarsConfig,
): Promise<Result<LeadcarsAddConversationResponse, DomainError>> {
  const url = `${this.getBaseUrl(config)}/leads/${leadId}/chat_conversation`;
  // Enviar directamente el request (sin añadir lead_id al body)
  return this.executeWithRetry<LeadcarsAddConversationResponse>(
    () => this.post<LeadcarsAddConversationResponse>(url, request, config),
    'addChatConversation',
  );
}
```

### Actualización del adapter — syncChat

```typescript
// ANTES en syncChat:
const conversacion = this.convertMessagesToLeadcarsFormat(chatData.messages);
const result = await this.apiService.addChatConversation(
  leadId,
  {
    conversacion,           // ❌ formato incorrecto
    fecha_inicio: ...,      // ❌ no existe en API real
    fecha_fin: ...,         // ❌ no existe
    resumen: ...,           // ❌ no existe
    metadata: ...,          // ❌ no existe
  },
  leadcarsConfig,
);

// DESPUÉS:
const chatRequest = this.convertMessagesToLeadcarsFormat(chatData);  // ✅ retorna { chat: {...} }
const result = await this.apiService.addChatConversation(
  leadId,
  chatRequest,             // ✅ formato correcto
  leadcarsConfig,
);
```

### Dependencia con Story 4.1

Esta historia **depende de Story 4.1**. El tipo `LeadcarsChatMessage` existente colisiona con el nuevo. Asegurarse de que Story 4.1 ya eliminó el antiguo tipo antes de implementar esta historia. Si se implementan en paralelo, coordinar los cambios en `leadcars.types.ts`.

### Archivos a tocar

| Archivo                                                               | Acción                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------- |
| `leads/infrastructure/adapters/leadcars/leadcars.types.ts`            | Modificar (nuevos tipos de chat)                      |
| `leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts` | Modificar (convertMessagesToLeadcarsFormat, syncChat) |
| `leads/infrastructure/adapters/leadcars/leadcars-api.service.ts`      | Modificar (addChatConversation sin lead_id en body)   |

### Referencias

- Estructura oficial: `src/context/leads/AGENTS.md` sección "Estructura de Chat Conversation"
- Fuente de verdad: `docs/leadcar/LeadCars_API_V2_4.pdf`
- Adapter actual: `src/context/leads/infrastructure/adapters/leadcars/leadcars-crm-sync.adapter.ts` líneas 100-179
- Tipos actuales: `src/context/leads/infrastructure/adapters/leadcars/leadcars.types.ts` líneas 85-118
- Dependencia: Story 4.1 debe completarse primero

## Registro del Agente Dev

### Modelo Utilizado

claude-sonnet-4.6 (github-copilot/claude-sonnet-4.6)

### Notas de Completación

### Lista de Ficheros
