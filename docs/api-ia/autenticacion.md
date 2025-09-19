# Autenticación y Autorización para Sistemas de IA

Guiders Backend soporta múltiples métodos de autenticación optimizados para diferentes tipos de integraciones, incluyendo sistemas de IA.

## 🔐 Métodos de Autenticación

### 1. API Key Authentication (Recomendado para IA)

**Mejor para**: Sistemas de IA, integraciones server-to-server, servicios automatizados.

```javascript
// Headers requeridos
const headers = {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json',
  'X-Company-Domain': 'your-domain.com' // Opcional, para multi-tenant
};

// Ejemplo de request
const response = await fetch('https://api.guiders.com/api/v2/chats', {
  method: 'GET',
  headers: headers
});
```

**Características**:
- ✅ Sin expiración automática
- ✅ Rate limiting por API Key
- ✅ Fácil rotación de credenciales
- ✅ Auditoría granular por sistema

### 2. JWT Bearer Tokens

**Mejor para**: Integraciones que requieren contexto de usuario específico.

```javascript
// Proceso de autenticación JWT
async function autenticarConJWT() {
  // 1. Login para obtener tokens
  const loginResponse = await fetch('/api/auth/visitor/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: 'company-api-key',
      clientId: 'unique-visitor-id',
      userAgent: 'AIBot/1.0',
      domain: 'yoursite.com'
    })
  });
  
  const { accessToken, refreshToken } = await loginResponse.json();
  
  // 2. Usar access token para requests
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
  
  return { accessToken, refreshToken, headers };
}
```

**Gestión de Tokens**:

```javascript
class TokenManager {
  constructor(apiKey, refreshToken) {
    this.apiKey = apiKey;
    this.refreshToken = refreshToken;
    this.accessToken = null;
    this.tokenExpiry = null;
  }
  
  async obtenerTokenValido() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }
    
    // Refresh token si ha expirado
    const response = await fetch('/api/auth/visitor/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: this.refreshToken
      })
    });
    
    const data = await response.json();
    this.accessToken = data.accessToken;
    this.tokenExpiry = Date.now() + (data.expiresIn * 1000);
    
    return this.accessToken;
  }
}
```

### 3. Cookie-based Authentication (BFF)

**Mejor para**: Integraciones que necesitan mantener sesión de usuario web.

```javascript
// Para sistemas que necesitan mimetizar comportamiento de usuario web
const cookieJar = new CookieJar();

async function loginConCookies(email, password) {
  const response = await fetch('/api/bff/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include' // Importante para cookies
  });
  
  // Las cookies se guardan automáticamente
  return response.json();
}
```

## 🎭 Roles y Permisos

### Tipos de Roles

| Rol | Descripción | Casos de Uso IA |
|-----|-------------|------------------|
| `visitor` | Visitante del sitio web | Chatbots de soporte inicial |
| `commercial` | Agente comercial | IA asistente para agentes |
| `admin` | Administrador de empresa | IA de análisis y reportes |
| `superadmin` | Super administrador | IA de gestión multi-tenant |

### Permisos por Contexto

```typescript
// Ejemplo de verificación de permisos en tu sistema IA
interface PermisosIA {
  // Conversaciones
  leerChats: boolean;
  escribirMensajes: boolean;
  asignarChats: boolean;
  cerrarChats: boolean;
  
  // Visitantes
  leerVisitantes: boolean;
  editarVisitantes: boolean;
  
  // Métricas
  verMetricas: boolean;
  exportarDatos: boolean;
  
  // Administración
  gestionarUsuarios: boolean;
  configurarEmpresa: boolean;
}

function obtenerPermisos(rol: string): PermisosIA {
  switch (rol) {
    case 'visitor':
      return {
        leerChats: false,
        escribirMensajes: true, // Solo en sus propios chats
        asignarChats: false,
        cerrarChats: false,
        leerVisitantes: false,
        editarVisitantes: false,
        verMetricas: false,
        exportarDatos: false,
        gestionarUsuarios: false,
        configurarEmpresa: false
      };
    case 'commercial':
      return {
        leerChats: true,
        escribirMensajes: true,
        asignarChats: true,
        cerrarChats: true,
        leerVisitantes: true,
        editarVisitantes: true,
        verMetricas: true,
        exportarDatos: false,
        gestionarUsuarios: false,
        configurarEmpresa: false
      };
    // ... más roles
  }
}
```

## 🔒 Configuración de Seguridad para IA

### 1. Almacenamiento Seguro de Credenciales

```javascript
// ❌ MAL - nunca hardcodear
const API_KEY = 'sk-1234567890abcdef';

// ✅ BIEN - usar variables de entorno
const API_KEY = process.env.GUIDERS_API_KEY;

// ✅ MEJOR - usar un gestor de secretos
const secretsManager = new SecretsManager();
const API_KEY = await secretsManager.getSecret('guiders-api-key');
```

### 2. Rotación de API Keys

```javascript
class APIKeyManager {
  constructor() {
    this.currentKey = null;
    this.backupKey = null;
    this.rotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 días
  }
  
  async inicializarRotacion() {
    // Programar rotación automática
    setInterval(() => this.rotarAPIKey(), this.rotationInterval);
  }
  
  async rotarAPIKey() {
    try {
      // 1. Generar nueva API key
      const nuevaKey = await this.solicitarNuevaAPIKey();
      
      // 2. Probar nueva key
      await this.probarAPIKey(nuevaKey);
      
      // 3. Actualizar configuración
      this.backupKey = this.currentKey;
      this.currentKey = nuevaKey;
      
      // 4. Revocar key antigua después de período de gracia
      setTimeout(() => this.revocarAPIKey(this.backupKey), 60000);
      
    } catch (error) {
      console.error('Error en rotación de API key:', error);
      // Usar key de backup si falla la rotación
    }
  }
}
```

### 3. Validación de Requests

```javascript
class GuardiaSeguridad {
  static validarRequest(headers, body) {
    // Validar headers requeridos
    if (!headers['authorization']) {
      throw new Error('Token de autorización requerido');
    }
    
    // Validar formato de API key
    const apiKey = headers['authorization'].replace('Bearer ', '');
    if (!this.validarFormatoAPIKey(apiKey)) {
      throw new Error('Formato de API key inválido');
    }
    
    // Validar tamaño de payload
    if (body && JSON.stringify(body).length > 1024 * 1024) { // 1MB
      throw new Error('Payload demasiado grande');
    }
    
    // Validar rate limiting
    if (!this.verificarRateLimit(apiKey)) {
      throw new Error('Rate limit excedido');
    }
    
    return true;
  }
  
  static validarFormatoAPIKey(apiKey) {
    // Las API keys tienen formato específico
    return /^[a-zA-Z0-9]{32,64}$/.test(apiKey);
  }
}
```

## 🌐 Multi-tenant y Aislamiento

### Configuración por Empresa

```javascript
class ClienteMultiEmpresa {
  constructor() {
    this.configuraciones = new Map();
  }
  
  agregarEmpresa(companyId, config) {
    this.configuraciones.set(companyId, {
      apiKey: config.apiKey,
      domain: config.domain,
      rateLimits: config.rateLimits || { requests: 1000, window: 3600 },
      permissions: config.permissions || ['read:chats', 'write:messages']
    });
  }
  
  async hacerRequest(companyId, endpoint, options = {}) {
    const config = this.configuraciones.get(companyId);
    if (!config) {
      throw new Error(`Empresa ${companyId} no configurada`);
    }
    
    const headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Company-Domain': config.domain,
      ...options.headers
    };
    
    return fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
  }
}
```

## 🚨 Manejo de Errores de Autenticación

```javascript
class ManejadorErroresAuth {
  static async manejarRespuesta(response) {
    if (response.status === 401) {
      // Token expirado o inválido
      return this.manejarTokenInvalido(response);
    } else if (response.status === 403) {
      // Permisos insuficientes
      return this.manejarPermisosDenegados(response);
    } else if (response.status === 429) {
      // Rate limit excedido
      return this.manejarRateLimit(response);
    }
    
    return response;
  }
  
  static async manejarTokenInvalido(response) {
    console.warn('Token inválido, intentando refresh...');
    
    try {
      await this.refreshToken();
      // Reintentar request original
      return this.reintentarRequest();
    } catch (error) {
      console.error('Fallo refresh, re-autenticando...');
      await this.reautenticar();
    }
  }
  
  static async manejarRateLimit(response) {
    const retryAfter = response.headers.get('Retry-After') || 60;
    console.warn(`Rate limit excedido, esperando ${retryAfter}s`);
    
    await this.esperar(retryAfter * 1000);
    return this.reintentarRequest();
  }
}
```

## 📋 Checklist de Seguridad

- [ ] API Keys almacenadas de forma segura (variables de entorno/gestor secretos)
- [ ] Implementar rotación periódica de credenciales
- [ ] Validar todos los headers y payloads
- [ ] Implementar retry logic para errores de autenticación
- [ ] Configurar rate limiting apropiado
- [ ] Usar HTTPS para todas las comunicaciones
- [ ] Implementar logging de accesos y errores de seguridad
- [ ] Configurar alertas para fallos de autenticación repetidos
- [ ] Validar permisos antes de cada operación crítica
- [ ] Implementar timeout apropiado para requests

## 🔧 Herramientas de Testing

```javascript
// Utilidad para testing de autenticación
class AuthTester {
  static async probarAPIKey(apiKey) {
    const response = await fetch('/api/auth/validate', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    return {
      valida: response.ok,
      permisos: response.ok ? await response.json() : null,
      error: !response.ok ? await response.text() : null
    };
  }
  
  static async probarRateLimit(apiKey, requestsCount = 10) {
    const requests = Array(requestsCount).fill().map(() =>
      fetch('/api/v2/chats', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    return {
      totalRequests: requestsCount,
      rateLimitedRequests: rateLimited.length,
      rateLimitTriggered: rateLimited.length > 0
    };
  }
}
```

---

> **Nota de Seguridad**: Nunca compartas API keys en logs, código fuente, o canales públicos. Implementa siempre rotación de credenciales y monitoreo de accesos no autorizados.