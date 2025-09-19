# Manejo de Errores para Sistemas de IA

Un manejo robusto de errores es crucial para sistemas de IA que interactúan con APIs en tiempo real. Esta guía cubre patrones, códigos de error específicos y estrategias de recuperación.

## 🚨 Códigos de Error Comunes

### HTTP Status Codes

| Código | Significado | Causa Común en IA | Acción Recomendada |
|--------|-------------|-------------------|-------------------|
| `400` | Bad Request | Payload malformado, parámetros inválidos | Validar datos antes de enviar |
| `401` | Unauthorized | API Key inválida o expirada | Renovar credenciales |
| `403` | Forbidden | Permisos insuficientes | Verificar roles y permisos |
| `404` | Not Found | Chat/recurso no existe | Verificar existencia antes de operar |
| `409` | Conflict | Operación conflictiva (ej: chat ya cerrado) | Sincronizar estado |
| `422` | Unprocessable Entity | Datos válidos pero lógicamente incorrectos | Revisar lógica de negocio |
| `429` | Too Many Requests | Rate limit excedido | Implementar backoff |
| `500` | Internal Server Error | Error del servidor | Retry con backoff exponencial |
| `503` | Service Unavailable | Servicio temporalmente no disponible | Implementar circuit breaker |

### Códigos de Error Específicos de WebSocket

| Código | Descripción | Causa | Solución |
|--------|-------------|--------|----------|
| `1000` | Normal Closure | Conexión cerrada normalmente | Reconectar si es necesario |
| `1001` | Going Away | Servidor reiniciando | Reconectar automáticamente |
| `1002` | Protocol Error | Error en protocolo WebSocket | Revisar implementación cliente |
| `1006` | Abnormal Closure | Conexión perdida inesperadamente | Reconectar con backoff |
| `1011` | Server Error | Error interno del servidor | Retry con backoff exponencial |

## 🛡️ Estrategias de Manejo de Errores

### 1. Patrón Retry con Backoff Exponencial

```javascript
class RetryManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.jitter = options.jitter || true;
  }
  
  async ejecutarConRetry(operation, contexto = {}) {
    let lastError;
    
    for (let intento = 0; intento <= this.maxRetries; intento++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // No reintentar para errores que no son temporales
        if (!this.esErrorReintentable(error)) {
          throw error;
        }
        
        // Si es el último intento, lanzar error
        if (intento === this.maxRetries) {
          throw new Error(`Operación falló después de ${this.maxRetries} intentos: ${error.message}`);
        }
        
        // Calcular delay para próximo intento
        const delay = this.calcularDelay(intento);
        console.warn(`Intento ${intento + 1} falló, reintentando en ${delay}ms:`, error.message);
        
        await this.esperar(delay);
      }
    }
    
    throw lastError;
  }
  
  esErrorReintentable(error) {
    // Errores que SÍ se deben reintentar (temporales)
    const errorReintentables = [429, 500, 502, 503, 504];
    
    // Errores que NO se deben reintentar (permanentes)
    const erroresPermanentes = [400, 401, 403, 404, 422];
    
    if (error.status) {
      return errorReintentables.includes(error.status);
    }
    
    // Errores de red (sin status) generalmente son reintentables
    return error.name === 'NetworkError' || error.code === 'ECONNREFUSED';
  }
  
  calcularDelay(intento) {
    let delay = this.baseDelay * Math.pow(2, intento);
    
    // Aplicar jitter para evitar thundering herd
    if (this.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.min(delay, this.maxDelay);
  }
  
  esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2. Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 10000;
    
    this.estado = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.fallosConsecutivos = 0;
    this.ultimoFallo = null;
    this.proximaVerificacion = null;
  }
  
  async ejecutar(operation) {
    if (this.estado === 'OPEN') {
      if (Date.now() < this.proximaVerificacion) {
        throw new Error('Circuit breaker OPEN - servicio no disponible');
      }
      
      // Cambiar a HALF_OPEN para probar
      this.estado = 'HALF_OPEN';
    }
    
    try {
      const resultado = await operation();
      this.onExito();
      return resultado;
    } catch (error) {
      this.onFallo(error);
      throw error;
    }
  }
  
  onExito() {
    this.fallosConsecutivos = 0;
    this.estado = 'CLOSED';
    this.ultimoFallo = null;
  }
  
  onFallo(error) {
    this.fallosConsecutivos++;
    this.ultimoFallo = error;
    
    if (this.fallosConsecutivos >= this.failureThreshold) {
      this.estado = 'OPEN';
      this.proximaVerificacion = Date.now() + this.recoveryTimeout;
      console.error(`Circuit breaker OPEN después de ${this.fallosConsecutivos} fallos`);
    }
  }
  
  obtenerEstado() {
    return {
      estado: this.estado,
      fallosConsecutivos: this.fallosConsecutivos,
      ultimoFallo: this.ultimoFallo?.message,
      proximaVerificacion: this.proximaVerificacion
    };
  }
}
```

### 3. Manejo Específico para IA

```javascript
class ManejadorErroresIA {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.retryManager = new RetryManager({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    });
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 30000
    });
    this.fallbacks = new Map();
  }
  
  async ejecutarOperacionIA(operation, fallbackKey = null) {
    try {
      return await this.circuitBreaker.ejecutar(async () => {
        return await this.retryManager.ejecutarConRetry(operation);
      });
    } catch (error) {
      console.error('Error en operación IA:', error);
      
      // Intentar fallback si está disponible
      if (fallbackKey && this.fallbacks.has(fallbackKey)) {
        console.log(`Ejecutando fallback: ${fallbackKey}`);
        return await this.fallbacks.get(fallbackKey)();
      }
      
      // Si no hay fallback, propagar error con contexto
      throw this.enriquecerError(error);
    }
  }
  
  registrarFallback(key, fallbackFunction) {
    this.fallbacks.set(key, fallbackFunction);
  }
  
  enriquecerError(error) {
    const errorEnriquecido = new Error(error.message);
    errorEnriquecido.originalError = error;
    errorEnriquecido.timestamp = new Date().toISOString();
    errorEnriquecido.apiKey = this.apiKey.substring(0, 8) + '...'; // No exponer API key completa
    errorEnriquecido.circuitBreakerState = this.circuitBreaker.obtenerEstado();
    
    return errorEnriquecido;
  }
}
```

## 🔄 Patrones de Recuperación

### 1. Graceful Degradation

```javascript
class SistemaIAConDegradacion {
  constructor(apiKey) {
    this.manejadorErrores = new ManejadorErroresIA(apiKey);
    this.configurarFallbacks();
  }
  
  configurarFallbacks() {
    // Fallback para generación de respuestas
    this.manejadorErrores.registrarFallback('generar-respuesta', async () => {
      return {
        content: 'Disculpa, estoy experimentando problemas técnicos. Un agente humano te atenderá pronto.',
        metadata: {
          isFallback: true,
          fallbackReason: 'ai-service-unavailable'
        }
      };
    });
    
    // Fallback para análisis de sentimientos
    this.manejadorErrores.registrarFallback('analizar-sentimiento', async () => {
      return {
        score: 0, // Neutral por defecto
        confidence: 0.1,
        isFallback: true
      };
    });
    
    // Fallback para clasificación
    this.manejadorErrores.registrarFallback('clasificar-consulta', async () => {
      return {
        categoria: 'general',
        confidence: 0.1,
        escalate: true, // Escalar por defecto cuando no se puede clasificar
        isFallback: true
      };
    });
  }
  
  async generarRespuesta(mensaje) {
    return await this.manejadorErrores.ejecutarOperacionIA(
      async () => {
        // Operación principal de IA
        return await this.servicioIA.generarRespuesta(mensaje);
      },
      'generar-respuesta' // Clave del fallback
    );
  }
}
```

### 2. Queue-based Recovery

```javascript
class ColaRecuperacion {
  constructor() {
    this.cola = [];
    this.procesando = false;
    this.intervaloProcesamiento = 5000; // 5 segundos
  }
  
  agregarOperacion(operacion, prioridad = 'normal') {
    const item = {
      id: this.generarId(),
      operacion: operacion,
      prioridad: prioridad,
      intentos: 0,
      maxIntentos: 3,
      timestamp: new Date().toISOString()
    };
    
    this.cola.push(item);
    this.ordenarPorPrioridad();
    
    if (!this.procesando) {
      this.iniciarProcesamiento();
    }
    
    return item.id;
  }
  
  async iniciarProcesamiento() {
    this.procesando = true;
    
    while (this.cola.length > 0) {
      const item = this.cola.shift();
      
      try {
        await item.operacion();
        console.log(`✅ Operación ${item.id} completada`);
      } catch (error) {
        item.intentos++;
        
        if (item.intentos < item.maxIntentos) {
          // Reencolar para reintento
          this.cola.unshift(item);
          console.warn(`⚠️ Operación ${item.id} falló, reintentando (${item.intentos}/${item.maxIntentos})`);
        } else {
          console.error(`❌ Operación ${item.id} falló definitivamente:`, error);
          await this.manejarFalloDefinitivo(item, error);
        }
      }
      
      // Esperar antes del siguiente procesamiento
      await new Promise(resolve => setTimeout(resolve, this.intervaloProcesamiento));
    }
    
    this.procesando = false;
  }
  
  ordenarPorPrioridad() {
    const prioridades = { 'critical': 0, 'high': 1, 'normal': 2, 'low': 3 };
    
    this.cola.sort((a, b) => {
      return prioridades[a.prioridad] - prioridades[b.prioridad];
    });
  }
}
```

## 📊 Monitoreo y Alertas

### 1. Sistema de Métricas de Error

```javascript
class MonitorErrores {
  constructor() {
    this.metricas = {
      erroresPorTipo: new Map(),
      erroresPorHora: new Map(),
      tasaErrores: 0,
      tiempoInactividad: 0
    };
  }
  
  registrarError(error, contexto = {}) {
    const tipoError = this.clasificarError(error);
    const hora = new Date().getHours();
    
    // Actualizar contadores
    this.metricas.erroresPorTipo.set(
      tipoError,
      (this.metricas.erroresPorTipo.get(tipoError) || 0) + 1
    );
    
    this.metricas.erroresPorHora.set(
      hora,
      (this.metricas.erroresPorHora.get(hora) || 0) + 1
    );
    
    // Verificar si necesita alerta
    this.verificarUmbralesAlerta(tipoError, error);
    
    // Log estructurado para análisis
    console.error('Error registrado:', {
      tipo: tipoError,
      mensaje: error.message,
      timestamp: new Date().toISOString(),
      contexto: contexto,
      stack: error.stack
    });
  }
  
  verificarUmbralesAlerta(tipoError, error) {
    const umbrales = {
      'rate-limit': 10, // 10 errores de rate limit por hora
      'auth-error': 5,  // 5 errores de autenticación por hora
      'api-error': 20,  // 20 errores de API por hora
      'network-error': 15 // 15 errores de red por hora
    };
    
    const erroresRecientes = this.contarErroresRecientes(tipoError, 3600000); // 1 hora
    
    if (erroresRecientes >= (umbrales[tipoError] || 25)) {
      this.enviarAlerta(tipoError, erroresRecientes, error);
    }
  }
  
  async enviarAlerta(tipoError, cantidad, ultimoError) {
    const alerta = {
      nivel: 'warning',
      tipo: `high-error-rate-${tipoError}`,
      mensaje: `Alto número de errores ${tipoError}: ${cantidad} en la última hora`,
      detalles: {
        tipoError: tipoError,
        cantidadErrores: cantidad,
        ultimoError: ultimoError.message,
        timestamp: new Date().toISOString()
      }
    };
    
    // Enviar a sistema de alertas (Slack, email, etc.)
    await this.sistemaAlertas.enviar(alerta);
  }
}
```

### 2. Health Check para IA

```javascript
class HealthCheckIA {
  constructor(apiKey) {
    this.api = new GuidersAPI(apiKey);
    this.ultimoCheck = null;
    this.estadoServicios = new Map();
  }
  
  async verificarSalud() {
    const resultados = await Promise.allSettled([
      this.verificarAPI(),
      this.verificarWebSocket(),
      this.verificarRateLimit(),
      this.verificarLatencia()
    ]);
    
    const salud = {
      timestamp: new Date().toISOString(),
      estado: 'healthy',
      servicios: {},
      metricas: {}
    };
    
    resultados.forEach((resultado, index) => {
      const nombres = ['api', 'websocket', 'rateLimit', 'latencia'];
      const nombre = nombres[index];
      
      if (resultado.status === 'fulfilled') {
        salud.servicios[nombre] = resultado.value;
      } else {
        salud.servicios[nombre] = {
          estado: 'unhealthy',
          error: resultado.reason.message
        };
        salud.estado = 'degraded';
      }
    });
    
    this.ultimoCheck = salud;
    return salud;
  }
  
  async verificarAPI() {
    const inicio = Date.now();
    
    try {
      const response = await fetch('/api/health', {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 5000
      });
      
      const latencia = Date.now() - inicio;
      
      return {
        estado: response.ok ? 'healthy' : 'unhealthy',
        latencia: latencia,
        status: response.status
      };
    } catch (error) {
      return {
        estado: 'unhealthy',
        error: error.message,
        latencia: Date.now() - inicio
      };
    }
  }
  
  async verificarWebSocket() {
    return new Promise((resolve) => {
      const socket = io('wss://api.guiders.com', {
        auth: { token: this.apiKey },
        timeout: 5000
      });
      
      const timeout = setTimeout(() => {
        socket.disconnect();
        resolve({
          estado: 'unhealthy',
          error: 'Timeout conectando WebSocket'
        });
      }, 5000);
      
      socket.on('connect', () => {
        clearTimeout(timeout);
        socket.disconnect();
        resolve({
          estado: 'healthy',
          socketId: socket.id
        });
      });
      
      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        resolve({
          estado: 'unhealthy',
          error: error.message
        });
      });
    });
  }
}
```

## 🛠️ Herramientas de Debugging

### Logger Estructurado para IA

```javascript
class LoggerIA {
  constructor(nivel = 'info') {
    this.nivel = nivel;
    this.niveles = { error: 0, warn: 1, info: 2, debug: 3 };
  }
  
  error(mensaje, contexto = {}) {
    this.log('error', mensaje, contexto);
  }
  
  warn(mensaje, contexto = {}) {
    this.log('warn', mensaje, contexto);
  }
  
  info(mensaje, contexto = {}) {
    this.log('info', mensaje, contexto);
  }
  
  debug(mensaje, contexto = {}) {
    this.log('debug', mensaje, contexto);
  }
  
  log(nivel, mensaje, contexto) {
    if (this.niveles[nivel] <= this.niveles[this.nivel]) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        nivel: nivel,
        mensaje: mensaje,
        contexto: contexto,
        trace: this.obtenerTraceId()
      };
      
      console.log(JSON.stringify(logEntry));
    }
  }
  
  obtenerTraceId() {
    // Generar ID único para rastrear requests relacionados
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

> **Importante**: Un manejo robusto de errores no solo previene fallos, sino que también proporciona información valiosa para mejorar la confiabilidad y rendimiento de tu sistema de IA.