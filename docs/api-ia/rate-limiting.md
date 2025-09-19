# Rate Limiting y Límites para Sistemas de IA

Los sistemas de IA requieren configuraciones específicas de rate limiting debido a su naturaleza de procesamiento intensivo y automatizado. Esta guía cubre límites, estrategias de optimización y mejores prácticas.

## 📊 Límites por Defecto

### Límites Generales

| Recurso | Límite | Ventana | Notas para IA |
|---------|--------|---------|---------------|
| **Requests HTTP** | 1000 requests | 1 hora | Por API Key |
| **Burst Requests** | 10 requests | 1 segundo | Para ráfagas cortas |
| **WebSocket Connections** | 5 conexiones | Simultáneas | Por API Key |
| **WebSocket Messages** | 100 mensajes | 1 minuto | Por conexión |
| **Payload Size** | 1 MB | Por request | Para mensajes/datos |

### Límites por Endpoint

| Endpoint | Límite Específico | Razón |
|----------|-------------------|--------|
| `POST /v2/chats/{id}/messages` | 30 req/min | Prevenir spam de mensajes |
| `GET /v2/chats` | 120 req/hour | Consultas frecuentes de IA |
| `PUT /v2/chats/{id}/assign` | 20 req/min | Operaciones de asignación |
| `GET /v2/chats/{id}/messages` | 60 req/hour | Análisis de conversaciones |
| `POST /v2/chats` | 10 req/min | Creación de nuevos chats |

## 🚦 Headers de Rate Limiting

Todos los responses incluyen headers informativos:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1642694400
X-RateLimit-Window: 3600
X-RateLimit-Retry-After: 1800
```

| Header | Descripción | Uso en IA |
|--------|-------------|-----------|
| `X-RateLimit-Limit` | Límite total para la ventana | Configurar velocidad máxima |
| `X-RateLimit-Remaining` | Requests restantes | Decidir si continuar o esperar |
| `X-RateLimit-Reset` | Timestamp de reset (Unix) | Programar próxima ejecución |
| `X-RateLimit-Window` | Duración ventana en segundos | Calcular velocidad promedio |
| `X-RateLimit-Retry-After` | Segundos para retry | Implementar backoff |

## 🤖 Estrategias de Optimización para IA

### 1. Rate Limiter Inteligente

```javascript
class RateLimiterIA {
  constructor(apiKey, config = {}) {
    this.apiKey = apiKey;
    this.config = {
      maxRequestsPerSecond: config.maxRequestsPerSecond || 2,
      burstCapacity: config.burstCapacity || 10,
      adaptiveThrottling: config.adaptiveThrottling || true,
      ...config
    };
    
    this.tokens = this.config.burstCapacity;
    this.lastRefill = Date.now();
    this.requestQueue = [];
    this.isProcessing = false;
  }
  
  async ejecutarRequest(requestFunction, prioridad = 'normal') {
    return new Promise((resolve, reject) => {
      const request = {
        function: requestFunction,
        prioridad: prioridad,
        timestamp: Date.now(),
        resolve: resolve,
        reject: reject
      };
      
      this.requestQueue.push(request);
      this.ordenarPorPrioridad();
      
      if (!this.isProcessing) {
        this.procesarCola();
      }
    });
  }
  
  async procesarCola() {
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      // Rellenar tokens según el tiempo transcurrido
      this.rellenarTokens();
      
      if (this.tokens >= 1) {
        const request = this.requestQueue.shift();
        this.tokens--;
        
        try {
          const resultado = await request.function();
          
          // Monitorear headers de rate limiting
          this.analizarRateLimitHeaders(resultado);
          
          request.resolve(resultado);
        } catch (error) {
          if (error.status === 429) {
            // Rate limit alcanzado - ajustar velocidad
            await this.manejarRateLimit(error, request);
          } else {
            request.reject(error);
          }
        }
      } else {
        // No hay tokens disponibles - esperar
        const tiempoEspera = this.calcularTiempoEspera();
        await this.esperar(tiempoEspera);
      }
    }
    
    this.isProcessing = false;
  }
  
  rellenarTokens() {
    const ahora = Date.now();
    const tiempoTranscurrido = ahora - this.lastRefill;
    const tokensAagregar = (tiempoTranscurrido / 1000) * this.config.maxRequestsPerSecond;
    
    this.tokens = Math.min(
      this.config.burstCapacity,
      this.tokens + tokensAagregar
    );
    
    this.lastRefill = ahora;
  }
  
  analizarRateLimitHeaders(response) {
    if (response.headers && this.config.adaptiveThrottling) {
      const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
      const limit = parseInt(response.headers.get('X-RateLimit-Limit'));
      const window = parseInt(response.headers.get('X-RateLimit-Window'));
      
      if (remaining && limit && window) {
        // Ajustar velocidad dinámicamente
        const porcentajeRestante = remaining / limit;
        
        if (porcentajeRestante < 0.2) {
          // Menos del 20% restante - reducir velocidad
          this.config.maxRequestsPerSecond *= 0.8;
        } else if (porcentajeRestante > 0.8) {
          // Más del 80% restante - aumentar velocidad gradualmente
          this.config.maxRequestsPerSecond = Math.min(
            this.config.maxRequestsPerSecond * 1.1,
            10 // Límite máximo
          );
        }
      }
    }
  }
  
  async manejarRateLimit(error, request) {
    const retryAfter = error.headers?.get('Retry-After') || 60;
    
    console.warn(`Rate limit alcanzado, esperando ${retryAfter} segundos`);
    
    // Reducir velocidad automáticamente
    this.config.maxRequestsPerSecond = Math.max(
      this.config.maxRequestsPerSecond * 0.5,
      0.5 // Mínimo 1 request cada 2 segundos
    );
    
    // Reencolar el request con prioridad alta
    request.prioridad = 'high';
    this.requestQueue.unshift(request);
    
    // Esperar el tiempo indicado
    await this.esperar(retryAfter * 1000);
  }
}
```

### 2. Pool de Conexiones Optimizado

```javascript
class PoolConexionesIA {
  constructor(apiKeys, config = {}) {
    this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
    this.config = {
      maxConcurrentPerKey: config.maxConcurrentPerKey || 3,
      rotationStrategy: config.rotationStrategy || 'round-robin',
      healthCheckInterval: config.healthCheckInterval || 30000,
      ...config
    };
    
    this.pools = new Map();
    this.currentKeyIndex = 0;
    this.healthStatus = new Map();
    
    this.inicializarPools();
    this.iniciarHealthCheck();
  }
  
  inicializarPools() {
    this.apiKeys.forEach(apiKey => {
      this.pools.set(apiKey, {
        rateLimiter: new RateLimiterIA(apiKey, this.config),
        requestsActivos: 0,
        ultimoUso: Date.now(),
        errors: 0
      });
      
      this.healthStatus.set(apiKey, {
        healthy: true,
        lastCheck: Date.now(),
        latencia: 0
      });
    });
  }
  
  async ejecutarRequest(requestFunction, opciones = {}) {
    const apiKey = this.seleccionarAPIKey(opciones);
    const pool = this.pools.get(apiKey);
    
    if (!pool) {
      throw new Error(`API Key no encontrada en pool: ${apiKey}`);
    }
    
    // Verificar si el pool está disponible
    if (pool.requestsActivos >= this.config.maxConcurrentPerKey) {
      // Intentar con otra API key si está disponible
      const keyAlternativa = this.buscarKeyDisponible();
      if (keyAlternativa && keyAlternativa !== apiKey) {
        return this.ejecutarRequest(requestFunction, { ...opciones, preferredKey: keyAlternativa });
      }
      
      // Si no hay alternativas, esperar
      await this.esperarDisponibilidad(apiKey);
    }
    
    pool.requestsActivos++;
    pool.ultimoUso = Date.now();
    
    try {
      const resultado = await pool.rateLimiter.ejecutarRequest(requestFunction, opciones.prioridad);
      pool.errors = Math.max(0, pool.errors - 1); // Reducir contador de errores en éxito
      return resultado;
    } catch (error) {
      pool.errors++;
      
      if (pool.errors > 5) {
        this.healthStatus.get(apiKey).healthy = false;
        console.warn(`API Key marcada como no saludable: ${apiKey.substr(0, 8)}...`);
      }
      
      throw error;
    } finally {
      pool.requestsActivos--;
    }
  }
  
  seleccionarAPIKey(opciones) {
    // Si se especifica una key preferida
    if (opciones.preferredKey && this.pools.has(opciones.preferredKey)) {
      return opciones.preferredKey;
    }
    
    // Filtrar keys saludables
    const keysDisponibles = this.apiKeys.filter(key => 
      this.healthStatus.get(key)?.healthy !== false
    );
    
    if (keysDisponibles.length === 0) {
      throw new Error('No hay API keys saludables disponibles');
    }
    
    // Estrategia de selección
    switch (this.config.rotationStrategy) {
      case 'round-robin':
        return this.seleccionRoundRobin(keysDisponibles);
      
      case 'least-used':
        return this.seleccionMenosUsada(keysDisponibles);
      
      case 'load-balanced':
        return this.seleccionBalanceada(keysDisponibles);
      
      default:
        return keysDisponibles[0];
    }
  }
  
  seleccionRoundRobin(keys) {
    const key = keys[this.currentKeyIndex % keys.length];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % keys.length;
    return key;
  }
  
  seleccionMenosUsada(keys) {
    return keys.reduce((mejor, actual) => {
      const poolActual = this.pools.get(actual);
      const poolMejor = this.pools.get(mejor);
      
      return poolActual.requestsActivos < poolMejor.requestsActivos ? actual : mejor;
    });
  }
  
  seleccionBalanceada(keys) {
    // Combinar múltiples factores: carga, errores, latencia
    return keys.reduce((mejor, actual) => {
      const poolActual = this.pools.get(actual);
      const poolMejor = this.pools.get(mejor);
      const healthActual = this.healthStatus.get(actual);
      const healthMejor = this.healthStatus.get(mejor);
      
      const scoreActual = this.calcularScore(poolActual, healthActual);
      const scoreMejor = this.calcularScore(poolMejor, healthMejor);
      
      return scoreActual > scoreMejor ? actual : mejor;
    });
  }
  
  calcularScore(pool, health) {
    const factorCarga = 1 - (pool.requestsActivos / this.config.maxConcurrentPerKey);
    const factorErrores = Math.max(0, 1 - (pool.errors / 10));
    const factorLatencia = Math.max(0, 1 - (health.latencia / 1000));
    
    return (factorCarga * 0.4) + (factorErrores * 0.3) + (factorLatencia * 0.3);
  }
}
```

### 3. Cache Inteligente para IA

```javascript
class CacheIA {
  constructor(config = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      ttlDefault: config.ttlDefault || 300000, // 5 minutos
      ttlPorTipo: config.ttlPorTipo || {
        'chat-messages': 60000,    // 1 minuto
        'chat-info': 300000,      // 5 minutos
        'user-profile': 900000,   // 15 minutos
        'ai-response': 1800000    // 30 minutos
      },
      ...config
    };
    
    this.cache = new Map();
    this.accessTimes = new Map();
    this.hitCount = 0;
    this.missCount = 0;
  }
  
  async obtener(key, tipo = 'default', fetchFunction = null) {
    const cacheKey = `${tipo}:${key}`;
    const item = this.cache.get(cacheKey);
    
    if (item && !this.haExpirado(item)) {
      this.hitCount++;
      this.accessTimes.set(cacheKey, Date.now());
      return item.data;
    }
    
    // Cache miss
    this.missCount++;
    
    if (fetchFunction) {
      try {
        const data = await fetchFunction();
        this.almacenar(key, data, tipo);
        return data;
      } catch (error) {
        // Si hay un item expirado pero válido, usarlo como fallback
        if (item) {
          console.warn('Usando cache expirado como fallback:', cacheKey);
          return item.data;
        }
        throw error;
      }
    }
    
    return null;
  }
  
  almacenar(key, data, tipo = 'default') {
    const cacheKey = `${tipo}:${key}`;
    const ttl = this.config.ttlPorTipo[tipo] || this.config.ttlDefault;
    
    // Limpiar cache si está lleno
    if (this.cache.size >= this.config.maxSize) {
      this.limpiarCache();
    }
    
    const item = {
      data: data,
      timestamp: Date.now(),
      ttl: ttl,
      tipo: tipo,
      accessCount: 1
    };
    
    this.cache.set(cacheKey, item);
    this.accessTimes.set(cacheKey, Date.now());
  }
  
  haExpirado(item) {
    return Date.now() - item.timestamp > item.ttl;
  }
  
  limpiarCache() {
    // Estrategia LRU (Least Recently Used)
    const entries = Array.from(this.accessTimes.entries())
      .sort(([,a], [,b]) => a - b); // Ordenar por tiempo de acceso
    
    // Eliminar 25% de los elementos menos usados
    const aEliminar = Math.floor(entries.length * 0.25);
    
    for (let i = 0; i < aEliminar; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.accessTimes.delete(key);
    }
  }
  
  obtenerEstadisticas() {
    const total = this.hitCount + this.missCount;
    const hitRatio = total > 0 ? this.hitCount / total : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRatio: hitRatio,
      utilizacion: this.cache.size / this.config.maxSize
    };
  }
}
```

## 📈 Monitoreo de Rate Limiting

### Dashboard de Métricas

```javascript
class MonitorRateLimit {
  constructor() {
    this.metricas = {
      requestsPorSegundo: new Map(),
      rateLimitsAlcanzados: 0,
      tiempoEsperaTotal: 0,
      eficienciaCache: 0
    };
    
    this.ventanaMetricas = 60; // 60 segundos
    this.iniciarMonitoreo();
  }
  
  registrarRequest(timestamp = Date.now()) {
    const segundo = Math.floor(timestamp / 1000);
    const count = this.metricas.requestsPorSegundo.get(segundo) || 0;
    this.metricas.requestsPorSegundo.set(segundo, count + 1);
    
    // Limpiar métricas antiguas
    const cutoff = segundo - this.ventanaMetricas;
    for (const [tiempo] of this.metricas.requestsPorSegundo) {
      if (tiempo < cutoff) {
        this.metricas.requestsPorSegundo.delete(tiempo);
      }
    }
  }
  
  registrarRateLimit(tiempoEspera) {
    this.metricas.rateLimitsAlcanzados++;
    this.metricas.tiempoEsperaTotal += tiempoEspera;
  }
  
  obtenerMetricas() {
    const ahora = Math.floor(Date.now() / 1000);
    const requestsRecientes = Array.from(this.metricas.requestsPorSegundo.values())
      .reduce((total, count) => total + count, 0);
    
    return {
      requestsPorMinuto: requestsRecientes,
      promedioRequestsPorSegundo: requestsRecientes / this.ventanaMetricas,
      rateLimitsAlcanzados: this.metricas.rateLimitsAlcanzados,
      tiempoEsperaPromedio: this.metricas.rateLimitsAlcanzados > 0 
        ? this.metricas.tiempoEsperaTotal / this.metricas.rateLimitsAlcanzados 
        : 0,
      timestamp: new Date().toISOString()
    };
  }
  
  iniciarMonitoreo() {
    setInterval(() => {
      const metricas = this.obtenerMetricas();
      
      // Alertas automáticas
      if (metricas.rateLimitsAlcanzados > 10) {
        console.warn('⚠️ Alto número de rate limits:', metricas);
      }
      
      if (metricas.promedioRequestsPorSegundo > 8) {
        console.warn('⚠️ Velocidad de requests muy alta:', metricas);
      }
    }, 30000); // Cada 30 segundos
  }
}
```

## 🎯 Optimizaciones Específicas por Caso de Uso

### 1. Chatbot en Tiempo Real

```javascript
// Configuración optimizada para chatbots
const configChatbot = {
  maxRequestsPerSecond: 3,
  burstCapacity: 15,
  cacheTTL: {
    'frequent-responses': 3600000, // 1 hora
    'user-context': 300000,       // 5 minutos
    'chat-state': 60000           // 1 minuto
  },
  priorityQueue: true,
  adaptiveThrottling: true
};
```

### 2. Análisis Batch

```javascript
// Configuración para procesamiento por lotes
const configBatch = {
  maxRequestsPerSecond: 1,
  burstCapacity: 5,
  batchSize: 50,
  processInterval: 10000, // 10 segundos
  parallelBatches: 3
};

class ProcesadorBatch {
  constructor(apiKey, config) {
    this.rateLimiter = new RateLimiterIA(apiKey, config);
    this.batchQueue = [];
    this.isProcessing = false;
  }
  
  async procesarEnLotes(elementos) {
    // Dividir en lotes
    const lotes = this.dividirEnLotes(elementos, this.config.batchSize);
    
    // Procesar lotes respetando rate limits
    const resultados = [];
    for (const lote of lotes) {
      const resultadoLote = await this.rateLimiter.ejecutarRequest(
        () => this.procesarLote(lote),
        'batch'
      );
      resultados.push(...resultadoLote);
    }
    
    return resultados;
  }
}
```

### 3. Streaming de Datos

```javascript
class StreamProcessor {
  constructor(apiKey, config) {
    this.rateLimiter = new RateLimiterIA(apiKey, {
      maxRequestsPerSecond: 5,
      burstCapacity: 20,
      ...config
    });
    this.buffer = [];
    this.bufferSize = 100;
  }
  
  async procesarStream(stream) {
    for await (const chunk of stream) {
      this.buffer.push(chunk);
      
      if (this.buffer.length >= this.bufferSize) {
        await this.procesarBuffer();
      }
    }
    
    // Procesar buffer restante
    if (this.buffer.length > 0) {
      await this.procesarBuffer();
    }
  }
  
  async procesarBuffer() {
    const data = this.buffer.splice(0, this.bufferSize);
    
    await this.rateLimiter.ejecutarRequest(
      () => this.enviarDatos(data),
      'stream'
    );
  }
}
```

## 📊 Mejores Prácticas

### ✅ Hacer

- **Implementar backoff exponencial** para retry automático
- **Usar múltiples API keys** para distribuir carga
- **Cachear responses frecuentes** para reducir requests
- **Monitorear headers de rate limiting** para optimización dinámica
- **Implementar circuit breakers** para fallos en cascada
- **Usar queues para requests no críticos** para suavizar picos

### ❌ Evitar

- **No ignorar headers** de rate limiting
- **No hacer requests síncronos** en bucles
- **No usar la misma API key** para todo
- **No reintentar inmediatamente** después de 429
- **No sobrecargar** con requests innecesarios
- **No procesar todo en tiempo real** si no es necesario

### 📈 Optimizaciones Avanzadas

```javascript
// Ejemplo de implementación completa optimizada
class SistemaIAOptimizado {
  constructor(apiKeys, config = {}) {
    this.poolConexiones = new PoolConexionesIA(apiKeys, config);
    this.cache = new CacheIA(config.cache);
    this.monitor = new MonitorRateLimit();
    this.procesadorBatch = new ProcesadorBatch(apiKeys[0], config.batch);
  }
  
  async ejecutarOptimizado(operacion, opciones = {}) {
    // 1. Verificar cache primero
    const cacheKey = this.generarCacheKey(operacion, opciones);
    const cached = await this.cache.obtener(cacheKey, opciones.tipo);
    
    if (cached && !opciones.forceRefresh) {
      return cached;
    }
    
    // 2. Ejecutar con pool optimizado
    const resultado = await this.poolConexiones.ejecutarRequest(
      () => operacion(),
      opciones
    );
    
    // 3. Cachear resultado
    if (resultado && opciones.cacheable !== false) {
      this.cache.almacenar(cacheKey, resultado, opciones.tipo);
    }
    
    // 4. Registrar métricas
    this.monitor.registrarRequest();
    
    return resultado;
  }
}
```

---

> **Clave del Éxito**: Un rate limiting efectivo para IA no se trata solo de cumplir límites, sino de optimizar el rendimiento total del sistema mediante estrategias inteligentes de caching, pooling y procesamiento por lotes.