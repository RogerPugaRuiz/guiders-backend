# Documentación de API para IAs - Guiders Backend

## Formato de Documentación IA-Friendly

Esta documentación está diseñada específicamente para ser consumida por sistemas de IA y agentes automatizados. Incluye información estructurada, ejemplos de uso y contexto técnico necesario para interactuar con la API.

### Estructura de Datos

```typescript
interface ApiDocumentation {
  // Metadatos de la documentación
  version: string;
  generated: string; // ISO timestamp
  baseUrl: string;
  
  // Organización por contextos de dominio (DDD)
  contexts: Array<{
    name: string;
    description: string;
    controllers: ControllerInfo[];
  }>;
  
  // Resumen estadístico
  summary: {
    totalEndpoints: number;
    totalControllers: number;
    authenticationMethods: string[];
    availableRoles: string[];
  };
}

interface ControllerInfo {
  name: string;
  context: string; // auth, company, conversations-v2, etc.
  baseUrl: string; // Prefijo de rutas
  description: string;
  tags: string[]; // Tags de Swagger
  endpoints: EndpointInfo[];
  filePath: string; // Para referencia del código fuente
}

interface EndpointInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string; // Ruta completa con parámetros
  summary: string; // Resumen corto
  description: string; // Descripción detallada
  tags: string[];
  
  // Información de autenticación y autorización
  auth: {
    required: boolean;
    roles?: string[]; // Roles requeridos
    bearer?: boolean; // Si requiere Bearer token
  };
  
  // Parámetros del endpoint
  parameters: {
    path?: Array<{
      name: string;
      description: string;
      example?: string;
      required: boolean;
    }>;
    query?: Array<{
      name: string;
      description: string;
      example?: any;
      required: boolean;
      type: string;
    }>;
    body?: {
      description: string;
      type: string;
      required: boolean;
      schema?: any;
    };
  };
  
  // Respuestas posibles
  responses: Array<{
    status: number;
    description: string;
    schema?: any;
  }>;
  
  // Ejemplos de uso
  examples: {
    request?: any;
    response?: any;
  };
}
```

### Patrones de Uso para IAs

#### 1. Búsqueda de Endpoints
```javascript
// Buscar endpoints por método HTTP
const getEndpoints = docs.contexts
  .flatMap(ctx => ctx.controllers)
  .flatMap(ctrl => ctrl.endpoints)
  .filter(ep => ep.method === 'GET');

// Buscar endpoints por contexto
const chatEndpoints = docs.contexts
  .find(ctx => ctx.name === 'conversations-v2')
  ?.controllers
  .flatMap(ctrl => ctrl.endpoints);

// Buscar endpoints que requieren autenticación
const protectedEndpoints = docs.contexts
  .flatMap(ctx => ctx.controllers)
  .flatMap(ctrl => ctrl.endpoints)
  .filter(ep => ep.auth.required);
```

#### 2. Construcción de Requests
```javascript
// Ejemplo para endpoint GET con query parameters
const endpoint = {
  method: 'GET',
  path: '/v2/chats',
  parameters: {
    query: [
      { name: 'cursor', required: false, type: 'string' },
      { name: 'limit', required: false, type: 'number' }
    ]
  }
};

// Construir URL
const baseUrl = 'http://localhost:3000';
const queryParams = new URLSearchParams({
  cursor: 'abc123',
  limit: '20'
});
const url = `${baseUrl}${endpoint.path}?${queryParams}`;
```

#### 3. Manejo de Autenticación
```javascript
// Verificar si endpoint requiere autenticación
if (endpoint.auth.required) {
  const headers = {};
  
  if (endpoint.auth.bearer) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  // Verificar roles requeridos
  const userRoles = ['commercial', 'admin'];
  const hasRequiredRole = endpoint.auth.roles?.some(role => 
    userRoles.includes(role)
  );
  
  if (!hasRequiredRole) {
    throw new Error('Insufficient permissions');
  }
}
```

### Archivos Generados

1. **`api-documentation.json`** - Documentación completa en formato JSON
2. **`api-documentation.yaml`** - Documentación completa en formato YAML  
3. **`executive-summary.json`** - Resumen estadístico y métricas
4. **`contexts/{context-name}.json`** - Documentación por contexto de dominio
5. **`endpoint-chat-with-message.md`** - Documentación detallada del nuevo endpoint de chat con mensaje

### Casos de Uso para IAs

#### Agente de Testing Automatizado
```javascript
// Generar tests automáticamente para todos los endpoints
docs.contexts.forEach(context => {
  context.controllers.forEach(controller => {
    controller.endpoints.forEach(endpoint => {
      generateTestCase(endpoint);
    });
  });
});

function generateTestCase(endpoint) {
  const testName = `${endpoint.method} ${endpoint.path}`;
  const authHeaders = endpoint.auth.required 
    ? { 'Authorization': 'Bearer test-token' }
    : {};
    
  // Generar test basado en la estructura del endpoint
}
```

#### Agente de Documentación
```javascript
// Generar documentación en formato Markdown
function generateMarkdownDocs(docs) {
  let markdown = `# API Documentation\n\n`;
  
  docs.contexts.forEach(context => {
    markdown += `## ${context.name}\n${context.description}\n\n`;
    
    context.controllers.forEach(controller => {
      controller.endpoints.forEach(endpoint => {
        markdown += `### ${endpoint.method} ${endpoint.path}\n`;
        markdown += `${endpoint.description}\n\n`;
        
        if (endpoint.auth.required) {
          markdown += `**Autenticación:** Requerida\n`;
          if (endpoint.auth.roles) {
            markdown += `**Roles:** ${endpoint.auth.roles.join(', ')}\n`;
          }
        }
        
        markdown += `\n`;
      });
    });
  });
  
  return markdown;
}
```

#### Agente de Validación de API
```javascript
// Validar que todos los endpoints estén funcionando
async function validateAPI(docs) {
  const results = [];
  
  for (const context of docs.contexts) {
    for (const controller of context.controllers) {
      for (const endpoint of controller.endpoints) {
        try {
          const response = await testEndpoint(endpoint);
          results.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            status: 'success',
            responseTime: response.time
          });
        } catch (error) {
          results.push({
            endpoint: `${endpoint.method} ${endpoint.path}`,
            status: 'error',
            error: error.message
          });
        }
      }
    }
  }
  
  return results;
}
```

### Consideraciones Técnicas

#### Contextos de Dominio (DDD)
Los endpoints están organizados por contextos de dominio:
- **auth**: Autenticación, BFF, API keys
- **company**: Gestión de empresas y sitios
- **conversations-v2**: Sistema de chat optimizado (MongoDB)
- **real-time**: WebSockets y comunicación en tiempo real
- **visitors-v2**: Gestión de visitantes optimizada
- **tracking**: Seguimiento de intenciones y métricas

#### Versionado
- **V1**: Endpoints legacy (SQL)
- **V2**: Endpoints optimizados (MongoDB + mejores patrones)

#### Autenticación
- **Bearer JWT**: Para API REST
- **OIDC**: Para BFF (Backend for Frontend)
- **Roles**: visitor, commercial, admin, supervisor

#### Paginación
Los endpoints V2 usan paginación basada en cursor:
```javascript
{
  cursor: 'base64-encoded-position',
  limit: 20,
  hasMore: true,
  nextCursor: 'next-page-cursor'
}
```