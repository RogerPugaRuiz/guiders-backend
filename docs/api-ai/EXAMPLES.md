# Ejemplo de Uso de la Documentación API para IAs

Este documento muestra ejemplos prácticos de cómo una IA puede usar la documentación generada para interactuar con la API de Guiders Backend.

## Estructura de Archivos Generados

```
docs/api-ai/
├── README.md                     # Guía de uso y formato
├── api-documentation.json        # Documentación completa en JSON
├── api-documentation.yaml        # Documentación completa en YAML
├── executive-summary.json        # Resumen estadístico
└── contexts/                     # Documentación por contexto DDD
    ├── auth.json
    ├── company.json
    ├── conversations-v2.json
    ├── tracking.json
    ├── visitors.json
    └── visitors-v2.json
```

## Casos de Uso para IAs

### 1. Agente Conversacional de Soporte

```javascript
// Ejemplo: IA que ayuda a usuarios a entender la API
const fs = require('fs');

class APIAssistant {
  constructor() {
    // Cargar documentación
    this.docs = JSON.parse(fs.readFileSync('docs/api-ai/api-documentation.json'));
    this.summary = JSON.parse(fs.readFileSync('docs/api-ai/executive-summary.json'));
  }

  async askAboutAPI(userQuestion) {
    if (userQuestion.includes('chat') || userQuestion.includes('conversación')) {
      return this.explainChatAPI();
    }
    
    if (userQuestion.includes('autenticación') || userQuestion.includes('login')) {
      return this.explainAuthAPI();
    }
    
    return this.generalAPIInfo();
  }

  explainChatAPI() {
    const chatContext = this.docs.contexts.find(ctx => ctx.name === 'conversations-v2');
    const endpoints = chatContext.controllers
      .flatMap(ctrl => ctrl.endpoints)
      .filter(ep => ep.method === 'GET' || ep.method === 'POST');

    return `
## API de Chat V2 (Optimizada)

**Contexto:** ${chatContext.description}

**Endpoints principales:**
${endpoints.map(ep => `
- **${ep.method} ${ep.path}**
  - ${ep.summary}
  - Autenticación: ${ep.auth.required ? 'Requerida' : 'Opcional'}
  ${ep.auth.roles ? `- Roles: ${ep.auth.roles.join(', ')}` : ''}
`).join('')}

**Ejemplo de uso:**
\`\`\`bash
# Crear un nuevo chat
curl -X POST http://localhost:3000/v2/chats \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"visitorInfo": {"name": "Juan"}, "metadata": {"source": "web"}}'

# Listar chats con filtros
curl -X GET "http://localhost:3000/v2/chats?limit=20&filters={\\"status\\":[\\"ACTIVE\\"]}" \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`
    `;
  }

  explainAuthAPI() {
    const authContext = this.docs.contexts.find(ctx => ctx.name === 'auth');
    return `
## API de Autenticación

**Contexto:** ${authContext.description}

**Métodos disponibles:**
- Bearer JWT para API REST
- OIDC para aplicaciones web (BFF)

**Roles del sistema:**
${this.summary.authentication.roles.map(role => `- ${role}`).join('\n')}

**Endpoints de autenticación:**
${authContext.controllers.flatMap(ctrl => ctrl.endpoints).map(ep => 
  `- ${ep.method} ${ep.path}: ${ep.summary}`
).join('\n')}
    `;
  }

  generalAPIInfo() {
    return `
## Resumen General de la API

**Estadísticas:**
- Total de endpoints: ${this.summary.overview.totalEndpoints}
- Total de controllers: ${this.summary.overview.totalControllers}
- Contextos de dominio: ${this.summary.overview.contexts}

**Por método HTTP:**
${Object.entries(this.summary.endpoints.byMethod).map(([method, count]) => 
  `- ${method}: ${count} endpoints`
).join('\n')}

**Por contexto:**
${this.summary.contexts.map(ctx => 
  `- ${ctx.name}: ${ctx.endpoints} endpoints (${ctx.description})`
).join('\n')}
    `;
  }
}

// Uso
const assistant = new APIAssistant();
console.log(await assistant.askAboutAPI("¿Cómo puedo crear un chat?"));
```

### 2. Generador Automático de Tests

```javascript
// Ejemplo: IA que genera tests automáticamente
class APITestGenerator {
  constructor() {
    this.docs = JSON.parse(fs.readFileSync('docs/api-ai/api-documentation.json'));
  }

  generateTests() {
    const testSuites = [];

    this.docs.contexts.forEach(context => {
      context.controllers.forEach(controller => {
        const testSuite = this.generateControllerTests(controller, context.name);
        testSuites.push(testSuite);
      });
    });

    return testSuites;
  }

  generateControllerTests(controller, contextName) {
    return `
describe('${controller.name} (${contextName})', () => {
  const baseUrl = 'http://localhost:3000';
  let authToken = 'test-token';

  beforeAll(async () => {
    // Setup: obtener token de autenticación si es necesario
    if (${controller.endpoints.some(ep => ep.auth.required)}) {
      authToken = await getAuthToken();
    }
  });

${controller.endpoints.map(endpoint => this.generateEndpointTest(endpoint)).join('\n')}
});`;
  }

  generateEndpointTest(endpoint) {
    const headers = {};
    if (endpoint.auth.required && endpoint.auth.bearer) {
      headers['Authorization'] = 'Bearer \${authToken}';
    }
    headers['Content-Type'] = 'application/json';

    const testName = `${endpoint.method} ${endpoint.path}`;
    const urlPath = endpoint.path.replace(/:\w+/g, 'test-id');

    return `
  it('should handle ${testName}', async () => {
    const response = await fetch(\`\${baseUrl}${urlPath}\`, {
      method: '${endpoint.method}',
      headers: ${JSON.stringify(headers, null, 6)},
      ${endpoint.method !== 'GET' ? 'body: JSON.stringify({}), // TODO: Add proper test data' : ''}
    });

    // Verificar códigos de estado esperados
    ${endpoint.responses.map(resp => 
      `expect([${resp.status}]).toContain(response.status); // ${resp.description}`
    ).join('\n    ')}

    if (response.ok) {
      const data = await response.json();
      expect(data).toBeDefined();
      // TODO: Add specific data validation based on endpoint
    }
  });`;
  }
}

// Generar tests
const generator = new APITestGenerator();
const tests = generator.generateTests();
tests.forEach((test, index) => {
  fs.writeFileSync(`generated-tests-${index}.spec.js`, test);
});
```

### 3. Cliente SDK Automático

```javascript
// Ejemplo: IA que genera un SDK de cliente automático
class SDKGenerator {
  constructor() {
    this.docs = JSON.parse(fs.readFileSync('docs/api-ai/api-documentation.json'));
  }

  generateSDK() {
    return `
/**
 * Cliente SDK Auto-generado para Guiders Backend API
 * Generado automáticamente desde la documentación de endpoints
 */
class GuidersAPIClient {
  constructor(baseUrl = 'http://localhost:3000', token = null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  setAuthToken(token) {
    this.token = token;
  }

  async request(method, path, data = null) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = \`Bearer \${this.token}\`;
    }

    const config = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(\`\${this.baseUrl}\${path}\`, config);
    
    if (!response.ok) {
      throw new Error(\`API Error: \${response.status} \${response.statusText}\`);
    }

    return response.json();
  }

${this.generateContextMethods()}
}

module.exports = { GuidersAPIClient };
`;
  }

  generateContextMethods() {
    return this.docs.contexts.map(context => {
      const methods = context.controllers.flatMap(controller => 
        controller.endpoints.map(endpoint => this.generateEndpointMethod(endpoint, context.name))
      );

      return `
  // ${context.description}
${methods.join('\n')}`;
    }).join('\n');
  }

  generateEndpointMethod(endpoint, contextName) {
    // Convertir path a nombre de método
    const methodName = this.pathToMethodName(endpoint.method, endpoint.path);
    
    // Extraer parámetros de path
    const pathParams = endpoint.path.match(/:(\w+)/g) || [];
    const pathParamNames = pathParams.map(p => p.substring(1));
    
    // Definir parámetros del método
    const params = [...pathParamNames];
    if (endpoint.parameters.query?.length > 0) {
      params.push('queryParams = {}');
    }
    if (endpoint.parameters.body) {
      params.push('data = {}');
    }

    // Construir path con parámetros
    let urlPath = endpoint.path;
    pathParamNames.forEach(param => {
      urlPath = urlPath.replace(`:${param}`, `\${${param}}`);
    });

    // Agregar query parameters si existen
    const queryString = endpoint.parameters.query?.length > 0 
      ? '${new URLSearchParams(queryParams)}'
      : '';

    const fullPath = queryString 
      ? `\`${urlPath}?\${queryString}\``
      : `\`${urlPath}\``;

    return `
  /**
   * ${endpoint.summary}
   * ${endpoint.description}
   * 
   * @param {${pathParamNames.map(p => `string} ${p} - ${p} parameter`).join('\n   * @param {')}}
   ${endpoint.parameters.query?.map(q => `* @param {${q.type}} queryParams.${q.name} - ${q.description} ${q.required ? '(required)' : '(optional)'}`).join('\n   ')}
   ${endpoint.parameters.body ? `* @param {object} data - ${endpoint.parameters.body.description}` : ''}
   * @returns {Promise<object>} API response
   */
  async ${methodName}(${params.join(', ')}) {
    ${endpoint.auth.required ? `
    if (!this.token) {
      throw new Error('Authentication token required for this endpoint');
    }` : ''}
    
    const path = ${fullPath};
    return this.request('${endpoint.method}', path${endpoint.parameters.body ? ', data' : ''});
  }`;
  }

  pathToMethodName(method, path) {
    // Convertir rutas como GET /v2/chats/:chatId a getChatById
    let name = path
      .replace(/^\//, '')  // Remover slash inicial
      .replace(/v\d+\//, '') // Remover versión
      .replace(/:\w+/g, 'ById') // Reemplazar parámetros
      .replace(/\//g, '_') // Reemplazar slashes con guiones bajos
      .replace(/-/g, '_'); // Reemplazar guiones con guiones bajos

    // Agregar prefijo del método
    const prefix = method.toLowerCase();
    if (!name.startsWith(prefix)) {
      name = `${prefix}_${name}`;
    }

    // Convertir a camelCase
    return name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}

// Generar SDK
const sdkGenerator = new SDKGenerator();
const sdkCode = sdkGenerator.generateSDK();
fs.writeFileSync('generated-guiders-sdk.js', sdkCode);
console.log('SDK generado en: generated-guiders-sdk.js');
```

### 4. Validador de Documentación API

```javascript
// Ejemplo: IA que valida que la documentación esté actualizada
class APIDocumentationValidator {
  constructor() {
    this.docs = JSON.parse(fs.readFileSync('docs/api-ai/api-documentation.json'));
  }

  async validateDocumentation() {
    const results = {
      total: 0,
      valid: 0,
      invalid: 0,
      errors: []
    };

    for (const context of this.docs.contexts) {
      for (const controller of context.controllers) {
        for (const endpoint of controller.endpoints) {
          results.total++;
          
          const validation = await this.validateEndpoint(endpoint);
          if (validation.isValid) {
            results.valid++;
          } else {
            results.invalid++;
            results.errors.push({
              endpoint: `${endpoint.method} ${endpoint.path}`,
              errors: validation.errors
            });
          }
        }
      }
    }

    return results;
  }

  async validateEndpoint(endpoint) {
    const errors = [];

    // Validar que tenga descripción útil
    if (endpoint.summary === 'Sin resumen' || endpoint.summary.length < 10) {
      errors.push('Summary muy corto o vacío');
    }

    if (endpoint.description === 'Sin descripción' || endpoint.description.length < 20) {
      errors.push('Description muy corta o vacía');
    }

    // Validar autenticación
    if (endpoint.auth.required && !endpoint.auth.roles) {
      errors.push('Endpoint requiere autenticación pero no especifica roles');
    }

    // Validar respuestas
    if (endpoint.responses.length === 0) {
      errors.push('No se han documentado respuestas posibles');
    } else {
      const hasSuccessResponse = endpoint.responses.some(r => r.status >= 200 && r.status < 300);
      if (!hasSuccessResponse) {
        errors.push('No se ha documentado respuesta de éxito');
      }
    }

    // Validar parámetros de path
    const pathParams = endpoint.path.match(/:(\w+)/g) || [];
    if (pathParams.length > 0 && !endpoint.parameters.path) {
      errors.push('Endpoint tiene parámetros de path pero no están documentados');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  generateReport(results) {
    return `
# Reporte de Validación de Documentación API

**Resumen:**
- Total de endpoints: ${results.total}
- Válidos: ${results.valid} (${Math.round(results.valid / results.total * 100)}%)
- Con problemas: ${results.invalid} (${Math.round(results.invalid / results.total * 100)}%)

## Endpoints con Problemas

${results.errors.map(error => `
### ${error.endpoint}
${error.errors.map(e => `- ❌ ${e}`).join('\n')}
`).join('')}

## Recomendaciones

1. Agregar descripciones detalladas a endpoints con summary/description vacíos
2. Documentar todas las respuestas posibles con @ApiResponse
3. Asegurar que endpoints autenticados especifiquen roles requeridos
4. Documentar parámetros de path con @ApiParam
`;
  }
}

// Validar documentación
const validator = new APIDocumentationValidator();
validator.validateDocumentation().then(results => {
  const report = validator.generateReport(results);
  fs.writeFileSync('api-documentation-validation-report.md', report);
  console.log('Reporte de validación generado en: api-documentation-validation-report.md');
});
```

### 5. Ejemplo Específico: Identificación de Visitantes V2

```javascript
// Ejemplo práctico: IA que ayuda con la nueva API de identificación de visitantes
class VisitorIdentificationHelper {
  constructor() {
    this.docs = JSON.parse(fs.readFileSync('docs/api-ai/contexts/visitors-v2.json'));
  }

  explainNewIdentificationFlow() {
    const identifyEndpoint = this.docs.controllers
      .find(ctrl => ctrl.name === 'VisitorV2Controller')
      .endpoints
      .find(ep => ep.path === '/visitors/identify');

    return `
## ✨ Nueva API de Identificación de Visitantes

**Cambio Principal:** Ya no necesitas conocer internamente \`tenantId\` y \`siteId\`

### Antes (Problemático):
\`\`\`json
POST /api/visitors/identify
{
  "fingerprint": "fp_abc123",
  "siteId": "uuid-que-no-conoces",     // ❌ Requería UUIDs internos
  "tenantId": "uuid-que-no-conoces"   // ❌ Datos no disponibles en frontend
}
\`\`\`

### Ahora (Simplificado):
\`\`\`json
POST /api/visitors/identify
{
  "fingerprint": "fp_abc123",
  "domain": "landing.mytech.com",      // ✅ Dominio conocido por el cliente
  "apiKey": "ak_live_1234567890"       // ✅ API Key proporcionada al cliente
}
\`\`\`

### Flujo Interno Automático:
1. **Validación**: Verifica que \`apiKey\` sea válida para \`domain\`
2. **Resolución**: Convierte \`domain\` → \`tenantId\` + \`siteId\` internamente
3. **Identificación**: Procede con la lógica original de visitantes

### Respuestas Mejoradas:
- **200**: Visitante identificado correctamente
- **400**: Datos inválidos (campos faltantes, formato incorrecto)
- **401**: API Key no válida para el dominio proporcionado
- **404**: Dominio no encontrado en el sistema
- **500**: Error interno del servidor

### Ejemplo de Uso Completo:
\`\`\`javascript
// Cliente frontend - Ahora mucho más simple
async function identifyVisitor(fingerprint, currentUrl) {
  try {
    const response = await fetch('/api/visitors/identify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fingerprint,
        domain: window.location.hostname,
        apiKey: process.env.GUIDERS_API_KEY,
        currentUrl
      })
    });

    if (!response.ok) {
      throw new Error(\`Error \${response.status}: \${response.statusText}\`);
    }

    const { visitorId, sessionId, lifecycle, isNewVisitor } = await response.json();
    
    // El sessionId se guarda automáticamente en cookie HttpOnly
    console.log('Visitante identificado:', { visitorId, lifecycle, isNewVisitor });
    
    return { visitorId, sessionId, lifecycle, isNewVisitor };
  } catch (error) {
    console.error('Error identificando visitante:', error);
    throw error;
  }
}

// Uso en tu aplicación
identifyVisitor('fp_user_browser_fingerprint', window.location.href)
  .then(visitor => {
    if (visitor.isNewVisitor) {
      console.log('¡Nuevo visitante! Iniciar tour/onboarding');
    } else {
      console.log('Visitante existente, cargar preferencias');
    }
  })
  .catch(error => {
    console.error('No se pudo identificar al visitante:', error);
  });
\`\`\`

### Ventajas del Nuevo Enfoque:
- ✅ **Más seguro**: Validación de API Key obligatoria
- ✅ **Más simple**: Solo datos que el frontend conoce
- ✅ **Más mantenible**: Resolución centralizada en backend
- ✅ **Mejor UX**: Menos configuración necesaria
- ✅ **Más robusto**: Validación automática con mensajes claros
    `;
  }

  generateIntegrationExamples() {
    return `
## Ejemplos de Integración por Tecnología

### React/Next.js
\`\`\`jsx
import { useEffect, useState } from 'react';

export function useVisitorIdentification() {
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function identifyVisitor() {
      try {
        setLoading(true);
        
        // Generar fingerprint (puedes usar una librería como FingerprintJS)
        const fingerprint = generateBrowserFingerprint();
        
        const response = await fetch('/api/visitors/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fingerprint,
            domain: window.location.hostname,
            apiKey: process.env.NEXT_PUBLIC_GUIDERS_API_KEY,
            currentUrl: window.location.href
          })
        });

        if (!response.ok) {
          throw new Error(\`Error \${response.status}\`);
        }

        const visitorData = await response.json();
        setVisitor(visitorData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    identifyVisitor();
  }, []);

  return { visitor, loading, error };
}

// Componente que usa el hook
function App() {
  const { visitor, loading, error } = useVisitorIdentification();

  if (loading) return <div>Identificando visitante...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>¡Hola{visitor?.isNewVisitor ? ' y bienvenido' : ' de nuevo'}!</h1>
      <p>ID del visitante: {visitor?.visitorId}</p>
      <p>Estado: {visitor?.lifecycle}</p>
    </div>
  );
}
\`\`\`

### Vue.js
\`\`\`vue
<template>
  <div>
    <div v-if="loading">Identificando visitante...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else>
      <h1>¡Hola{{ visitor?.isNewVisitor ? ' y bienvenido' : ' de nuevo' }}!</h1>
      <p>ID del visitante: {{ visitor?.visitorId }}</p>
      <p>Estado: {{ visitor?.lifecycle }}</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      visitor: null,
      loading: true,
      error: null
    };
  },
  
  async mounted() {
    try {
      const fingerprint = this.generateBrowserFingerprint();
      
      const response = await fetch('/api/visitors/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          domain: window.location.hostname,
          apiKey: process.env.VUE_APP_GUIDERS_API_KEY,
          currentUrl: window.location.href
        })
      });

      if (!response.ok) {
        throw new Error(\`Error \${response.status}\`);
      }

      this.visitor = await response.json();
    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  },

  methods: {
    generateBrowserFingerprint() {
      // Implementar generación de fingerprint
      return 'fp_' + Math.random().toString(36).substring(2);
    }
  }
};
</script>
\`\`\`

### Vanilla JavaScript
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <title>Guiders Visitor Identification</title>
</head>
<body>
  <div id="visitor-info">Cargando...</div>
  
  <script>
    async function identifyVisitor() {
      const visitorInfoEl = document.getElementById('visitor-info');
      
      try {
        // Generar fingerprint simple
        const fingerprint = 'fp_' + Date.now() + '_' + Math.random().toString(36).substring(2);
        
        const response = await fetch('/api/visitors/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fingerprint,
            domain: window.location.hostname,
            apiKey: 'your-api-key-here', // En producción, obtener de config segura
            currentUrl: window.location.href
          })
        });

        if (!response.ok) {
          throw new Error(\`Error \${response.status}: \${response.statusText}\`);
        }

        const visitor = await response.json();
        
        visitorInfoEl.innerHTML = \`
          <h1>¡Hola\${visitor.isNewVisitor ? ' y bienvenido' : ' de nuevo'}!</h1>
          <p><strong>ID del visitante:</strong> \${visitor.visitorId}</p>
          <p><strong>ID de sesión:</strong> \${visitor.sessionId}</p>
          <p><strong>Estado:</strong> \${visitor.lifecycle}</p>
          <p><strong>Nuevo visitante:</strong> \${visitor.isNewVisitor ? 'Sí' : 'No'}</p>
        \`;
        
        // Inicializar chat o funcionalidades adicionales
        if (visitor.isNewVisitor) {
          showWelcomeTour();
        } else {
          loadUserPreferences(visitor.visitorId);
        }
        
      } catch (error) {
        visitorInfoEl.innerHTML = \`<div style="color: red;">Error: \${error.message}</div>\`;
        console.error('Error identificando visitante:', error);
      }
    }

    function showWelcomeTour() {
      console.log('Mostrar tour de bienvenida para nuevo visitante');
      // Implementar tour/onboarding
    }

    function loadUserPreferences(visitorId) {
      console.log('Cargar preferencias para visitante:', visitorId);
      // Cargar configuraciones previas
    }

    // Ejecutar cuando la página carga
    document.addEventListener('DOMContentLoaded', identifyVisitor);
  </script>
</body>
</html>
\`\`\`
    `;
  }
}

// Uso del helper
const helper = new VisitorIdentificationHelper();
console.log(helper.explainNewIdentificationFlow());
console.log(helper.generateIntegrationExamples());
```

## Comandos NPM Disponibles

```bash
# Generar documentación manualmente
npm run docs:generate-ai

# Regenerar documentación automáticamente cuando cambian los controllers
npm run docs:watch-ai

# Integrar en el flujo de build
npm run build && npm run docs:generate-ai
```

## Estructura del JSON de Documentación

La documentación generada incluye toda la información necesaria para que una IA pueda:

1. **Entender la arquitectura** - Contextos DDD organizados
2. **Construir requests** - Métodos HTTP, paths, parámetros
3. **Manejar autenticación** - Roles, guards, Bearer tokens
4. **Validar respuestas** - Códigos de estado y esquemas
5. **Generar código** - SDKs, tests, documentación

Esta documentación se actualiza automáticamente cada vez que cambias los controllers, manteniendo siempre sincronizada la información que las IAs necesitan para trabajar con tu API.
