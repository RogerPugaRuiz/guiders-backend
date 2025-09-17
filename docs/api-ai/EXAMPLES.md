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