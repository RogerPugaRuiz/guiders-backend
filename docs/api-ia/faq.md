# FAQ y Troubleshooting - Sistemas de IA

Esta sección responde a las preguntas más frecuentes y proporciona soluciones a problemas comunes al integrar sistemas de IA con Guiders Backend.

## 🙋‍♀️ Preguntas Frecuentes (FAQ)

### 🔐 Autenticación y Seguridad

#### ¿Cuál es la diferencia entre API Key y JWT tokens?

**API Key** (Recomendado para IA):
- ✅ No expira automáticamente
- ✅ Más simple de implementar
- ✅ Ideal para sistemas automatizados
- ✅ Rate limiting por API Key

**JWT Tokens**:
- ⏰ Expiran y requieren refresh
- 👤 Asociados a un usuario específico
- 🔄 Mejor para sesiones de usuario
- 📱 Ideal para aplicaciones frontend

```javascript
// ✅ Recomendado para IA
const headers = {
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json'
};

// ⚠️ Solo si necesitas contexto de usuario específico
const jwtHeaders = {
  'Authorization': 'Bearer JWT_TOKEN',
  'Content-Type': 'application/json'
};
```

#### ¿Cómo rotar API Keys de forma segura?

```javascript
class APIKeyRotator {
  constructor() {
    this.currentKey = process.env.GUIDERS_API_KEY;
    this.backupKey = process.env.GUIDERS_API_KEY_BACKUP;
  }
  
  async rotateKeys() {
    try {
      // 1. Generar nueva key via API admin
      const newKey = await this.generateNewAPIKey();
      
      // 2. Probar nueva key
      await this.testAPIKey(newKey);
      
      // 3. Cambiar a nueva key
      this.backupKey = this.currentKey;
      this.currentKey = newKey;
      
      // 4. Esperar período de gracia y revocar antigua
      setTimeout(() => this.revokeAPIKey(this.backupKey), 60000);
      
    } catch (error) {
      console.error('Error rotando API Key:', error);
      // Usar backup key si falla
    }
  }
}
```

### 🚀 Rendimiento y Rate Limiting

#### ¿Por qué recibo errores 429 (Too Many Requests)?

**Causas comunes:**
1. **Límite por segundo excedido** (10 req/sec burst)
2. **Límite por hora excedido** (1000 req/hour)
3. **Múltiples instancias usando misma API Key**
4. **Loops infinitos en el código**

**Soluciones:**

```javascript
// ❌ MAL - Sin control de velocidad
for (const chat of chats) {
  await processChat(chat); // Puede disparar rate limit
}

// ✅ BIEN - Con control de velocidad
for (const chat of chats) {
  await processChat(chat);
  await sleep(500); // 500ms entre requests
}

// ✅ MEJOR - Con rate limiter inteligente
const rateLimiter = new RateLimiter(2); // 2 req/sec
for (const chat of chats) {
  await rateLimiter.execute(() => processChat(chat));
}
```

#### ¿Cómo optimizar el rendimiento de mi sistema de IA?

**Estrategias de optimización:**

1. **Usar múltiples API Keys:**
```javascript
const keyPool = ['key1', 'key2', 'key3'];
let currentKeyIndex = 0;

function getNextAPIKey() {
  const key = keyPool[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % keyPool.length;
  return key;
}
```

2. **Implementar cache inteligente:**
```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getCachedData(key, fetchFunction) {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFunction();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

3. **Procesar en lotes:**
```javascript
async function processBatch(items, batchSize = 10) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(item => processItem(item)));
    await sleep(1000); // Pausa entre lotes
  }
}
```

### 🤖 Integración de IA

#### ¿Qué modelo de IA es mejor para chatbots de atención al cliente?

**Recomendaciones por caso de uso:**

| Caso de Uso | Modelo Recomendado | Razón |
|-------------|-------------------|--------|
| **FAQ Básico** | GPT-3.5-turbo | Costo-efectivo, respuestas rápidas |
| **Soporte Técnico** | GPT-4 | Mayor precisión técnica |
| **Análisis Sentimientos** | BERT/RoBERTa | Especializado en clasificación |
| **Clasificación** | DistilBERT | Rápido y eficiente |
| **Multiidioma** | mBERT/XLM-R | Soporte nativo multiidioma |

#### ¿Cómo manejar la latencia en respuestas de IA?

```javascript
class LatencyOptimizer {
  constructor() {
    this.responseCache = new Map();
    this.streamingEnabled = true;
  }
  
  async generateResponse(input, options = {}) {
    // 1. Verificar cache primero
    const cacheKey = this.generateCacheKey(input);
    if (this.responseCache.has(cacheKey)) {
      return this.responseCache.get(cacheKey);
    }
    
    // 2. Respuesta inmediata para casos simples
    const quickResponse = this.getQuickResponse(input);
    if (quickResponse) {
      return quickResponse;
    }
    
    // 3. Indicar que está procesando
    if (options.chatId) {
      await this.showTypingIndicator(options.chatId);
    }
    
    // 4. Generar respuesta completa
    const response = await this.generateAIResponse(input);
    
    // 5. Cachear para futuras consultas similares
    this.responseCache.set(cacheKey, response);
    
    return response;
  }
  
  getQuickResponse(input) {
    const quickResponses = {
      'hola': '¡Hola! ¿En qué puedo ayudarte?',
      'gracias': '¡De nada! ¿Hay algo más en lo que pueda asistirte?',
      'adiós': '¡Hasta luego! Que tengas un excelente día.'
    };
    
    const normalizedInput = input.toLowerCase().trim();
    return quickResponses[normalizedInput];
  }
}
```

#### ¿Cómo implementar fallbacks cuando la IA falla?

```javascript
class AIWithFallback {
  constructor() {
    this.primaryAI = new OpenAIClient();
    this.fallbackAI = new HuggingFaceClient();
    this.staticResponses = new StaticResponseBank();
  }
  
  async generateResponse(input) {
    try {
      // Intento 1: IA primaria
      return await this.primaryAI.generate(input);
    } catch (error) {
      console.warn('Primary AI failed:', error.message);
      
      try {
        // Intento 2: IA de respaldo
        return await this.fallbackAI.generate(input);
      } catch (fallbackError) {
        console.warn('Fallback AI failed:', fallbackError.message);
        
        // Intento 3: Respuesta estática inteligente
        return this.staticResponses.getBestMatch(input);
      }
    }
  }
}
```

### 📡 WebSockets y Tiempo Real

#### ¿Por qué se desconecta constantemente el WebSocket?

**Causas comunes:**
1. **Timeouts de red** - Aumentar timeout de conexión
2. **Problemas de proxy** - Configurar proxy correctamente
3. **Rate limiting** - Reducir frecuencia de mensajes
4. **Heartbeat perdido** - Implementar ping/pong

**Solución robusta:**

```javascript
class RobustWebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.heartbeatInterval = 30000;
    this.isIntentionallyDisconnected = false;
  }
  
  connect() {
    this.socket = io(this.url, {
      ...this.options,
      timeout: 20000,
      reconnection: false // Manejar reconexión manualmente
    });
    
    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });
    
    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 WebSocket desconectado:', reason);
      this.stopHeartbeat();
      
      if (!this.isIntentionallyDisconnected) {
        this.scheduleReconnect();
      }
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error);
      this.scheduleReconnect();
    });
  }
  
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🚫 Máximo de intentos de reconexión alcanzado');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconectando en ${delay}ms (intento ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isIntentionallyDisconnected) {
        this.connect();
      }
    }, delay);
  }
  
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.socket.connected) {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
  }
  
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
```

### 📊 Monitoreo y Debugging

#### ¿Cómo debuggear problemas de integración?

**1. Logging estructurado:**

```javascript
class StructuredLogger {
  constructor(level = 'info') {
    this.level = level;
  }
  
  log(level, message, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      context: context,
      trace_id: this.generateTraceId()
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  generateTraceId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Uso
const logger = new StructuredLogger();
logger.log('info', 'Processing message', {
  chatId: 'chat-123',
  messageId: 'msg-456',
  aiModel: 'gpt-3.5-turbo'
});
```

**2. Health checks automáticos:**

```javascript
class HealthChecker {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.checks = [];
  }
  
  addCheck(name, checkFunction) {
    this.checks.push({ name, check: checkFunction });
  }
  
  async runAllChecks() {
    const results = {};
    
    for (const { name, check } of this.checks) {
      try {
        const start = Date.now();
        const result = await check();
        const duration = Date.now() - start;
        
        results[name] = {
          status: 'healthy',
          duration: duration,
          details: result
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message
        };
      }
    }
    
    return results;
  }
}

// Configurar checks
const healthChecker = new HealthChecker(API_KEY);

healthChecker.addCheck('api_connectivity', async () => {
  const response = await fetch('/api/health', {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  return { status: response.status };
});

healthChecker.addCheck('websocket_connectivity', async () => {
  // Test WebSocket connection
  return new Promise((resolve, reject) => {
    const socket = io(WS_URL, { timeout: 5000 });
    socket.on('connect', () => {
      socket.disconnect();
      resolve({ connected: true });
    });
    socket.on('connect_error', reject);
  });
});
```

## 🛠️ Troubleshooting

### Problemas de Autenticación

#### Error: "Invalid API Key"

**Síntomas:**
```json
{
  "error": "Unauthorized",
  "message": "Invalid API Key",
  "statusCode": 401
}
```

**Soluciones:**
1. **Verificar formato de API Key:**
```javascript
// ✅ Correcto
'Authorization': 'Bearer sk-1234567890abcdef...'

// ❌ Incorrecto
'Authorization': 'sk-1234567890abcdef...'
'Authorization': 'Bearer: sk-1234567890abcdef...'
```

2. **Verificar permisos:**
```javascript
async function testAPIKey(apiKey) {
  try {
    const response = await fetch('/api/auth/validate', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (response.ok) {
      const permissions = await response.json();
      console.log('Permisos disponibles:', permissions);
    } else {
      console.error('API Key inválida o sin permisos');
    }
  } catch (error) {
    console.error('Error validando API Key:', error);
  }
}
```

#### Error: "Token expired"

**Solución automática:**
```javascript
class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiryTime = null;
  }
  
  async getValidToken() {
    if (this.accessToken && this.expiryTime > Date.now()) {
      return this.accessToken;
    }
    
    return await this.refreshAccessToken();
  }
  
  async refreshAccessToken() {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });
    
    const data = await response.json();
    this.accessToken = data.accessToken;
    this.expiryTime = Date.now() + (data.expiresIn * 1000);
    
    return this.accessToken;
  }
}
```

### Problemas de Rate Limiting

#### Error: "Rate limit exceeded"

**Diagnóstico:**
```javascript
function analyzeRateLimit(response) {
  const headers = {
    limit: response.headers.get('X-RateLimit-Limit'),
    remaining: response.headers.get('X-RateLimit-Remaining'),
    reset: response.headers.get('X-RateLimit-Reset'),
    retryAfter: response.headers.get('Retry-After')
  };
  
  console.log('Rate Limit Status:', headers);
  
  if (headers.remaining < 10) {
    console.warn('⚠️ Pocas requests restantes, reducir velocidad');
  }
  
  return headers;
}
```

**Solución adaptativa:**
```javascript
class AdaptiveRateLimiter {
  constructor() {
    this.requestsPerSecond = 2;
    this.minRate = 0.5;
    this.maxRate = 10;
  }
  
  async execute(operation) {
    try {
      const result = await operation();
      
      // Éxito - aumentar velocidad gradualmente
      this.requestsPerSecond = Math.min(
        this.requestsPerSecond * 1.1,
        this.maxRate
      );
      
      return result;
    } catch (error) {
      if (error.status === 429) {
        // Rate limit - reducir velocidad
        this.requestsPerSecond = Math.max(
          this.requestsPerSecond * 0.5,
          this.minRate
        );
        
        const retryAfter = error.headers?.get('Retry-After') || 60;
        await this.sleep(retryAfter * 1000);
        
        return this.execute(operation); // Retry
      }
      
      throw error;
    }
  }
}
```

### Problemas de WebSocket

#### Conexión se pierde frecuentemente

**Diagnóstico y solución:**
```javascript
class WebSocketDiagnostics {
  constructor() {
    this.connectionAttempts = 0;
    this.disconnectionReasons = [];
    this.latencyHistory = [];
  }
  
  trackConnection(socket) {
    socket.on('connect', () => {
      this.connectionAttempts++;
      console.log(`Conexión #${this.connectionAttempts} establecida`);
    });
    
    socket.on('disconnect', (reason) => {
      this.disconnectionReasons.push({
        reason: reason,
        timestamp: new Date().toISOString()
      });
      
      this.analyzeDisconnectionPattern();
    });
    
    // Medir latencia
    setInterval(() => {
      const start = Date.now();
      socket.emit('ping', start);
      
      socket.once('pong', (timestamp) => {
        const latency = Date.now() - timestamp;
        this.latencyHistory.push(latency);
        
        if (this.latencyHistory.length > 100) {
          this.latencyHistory.shift();
        }
      });
    }, 10000);
  }
  
  analyzeDisconnectionPattern() {
    const recentDisconnections = this.disconnectionReasons
      .filter(d => Date.now() - new Date(d.timestamp).getTime() < 300000); // Últimos 5 min
    
    if (recentDisconnections.length > 3) {
      console.warn('🚨 Patrón de desconexiones frecuentes detectado');
      this.suggestSolutions(recentDisconnections);
    }
  }
  
  suggestSolutions(disconnections) {
    const reasons = disconnections.map(d => d.reason);
    
    if (reasons.includes('ping timeout')) {
      console.log('💡 Sugerencia: Reducir intervalo de heartbeat');
    }
    
    if (reasons.includes('transport error')) {
      console.log('💡 Sugerencia: Verificar configuración de proxy/firewall');
    }
    
    if (reasons.includes('server error')) {
      console.log('💡 Sugerencia: Implementar circuit breaker');
    }
  }
}
```

### Problemas de Rendimiento

#### Respuestas lentas de IA

**Optimización de pipeline:**
```javascript
class PerformanceOptimizer {
  constructor() {
    this.cache = new Map();
    this.precomputedResponses = new Map();
    this.loadPrecomputedResponses();
  }
  
  async optimizeResponse(input) {
    // 1. Cache de respuestas exactas
    const exactMatch = this.cache.get(input);
    if (exactMatch) {
      return { ...exactMatch, source: 'cache' };
    }
    
    // 2. Respuestas precomputadas para patrones comunes
    const precomputed = this.findPrecomputedMatch(input);
    if (precomputed) {
      return { ...precomputed, source: 'precomputed' };
    }
    
    // 3. Paralelizar operaciones
    const [aiResponse, context] = await Promise.all([
      this.generateAIResponse(input),
      this.gatherContext(input)
    ]);
    
    // 4. Combinar y cachear
    const finalResponse = this.combineResponse(aiResponse, context);
    this.cache.set(input, finalResponse);
    
    return { ...finalResponse, source: 'generated' };
  }
  
  findPrecomputedMatch(input) {
    const normalized = input.toLowerCase().trim();
    
    for (const [pattern, response] of this.precomputedResponses) {
      if (normalized.includes(pattern)) {
        return response;
      }
    }
    
    return null;
  }
  
  loadPrecomputedResponses() {
    // Cargar respuestas para consultas frecuentes
    this.precomputedResponses.set('precio', {
      content: 'Te ayudo con información de precios. ¿Qué producto te interesa?',
      confidence: 1.0,
      processingTime: 10
    });
    
    this.precomputedResponses.set('soporte', {
      content: 'Estoy aquí para ayudarte. ¿Cuál es el problema que experimentas?',
      confidence: 1.0,
      processingTime: 10
    });
  }
}
```

## 📞 Soporte y Recursos

### Canales de Soporte

1. **Documentación Swagger**: `/docs` - Referencia completa de API
2. **GitHub Issues**: Para reportar bugs o solicitar features
3. **Community Discord**: Chat en tiempo real con otros desarrolladores
4. **Email Support**: support@guiders.com - Para soporte técnico

### Recursos Útiles

- **Postman Collection**: Colección de requests de ejemplo
- **SDK Oficiales**: Clientes para JavaScript, Python, Java
- **Ejemplos en GitHub**: Repositorio con casos de uso completos
- **Webinars**: Sesiones mensuales sobre mejores prácticas

### Antes de Contactar Soporte

**Información a incluir:**
```javascript
// Generar reporte de diagnóstico
const diagnosticReport = {
  timestamp: new Date().toISOString(),
  apiKey: API_KEY.substring(0, 8) + '...',
  environment: process.env.NODE_ENV,
  nodeVersion: process.version,
  lastSuccessfulRequest: lastSuccess,
  errorDetails: {
    message: error.message,
    status: error.status,
    headers: error.headers
  },
  networkInfo: {
    userAgent: navigator.userAgent,
    connection: navigator.connection
  }
};

console.log('Diagnostic Report:', JSON.stringify(diagnosticReport, null, 2));
```

---

> **Tip**: La mayoría de problemas se resuelven verificando autenticación, respetando rate limits e implementando retry logic robusto. Si el problema persiste, el reporte de diagnóstico acelera significativamente la resolución.