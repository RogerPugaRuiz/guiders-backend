# WebSockets para Sistemas de IA

Los WebSockets permiten comunicación bidireccional en tiempo real entre tu sistema de IA y el backend de Guiders. Esta funcionalidad es esencial para chatbots reactivos y análisis en tiempo real.

## 🔌 Conexión Básica

### Configuración de Cliente

```javascript
import io from 'socket.io-client';

const socket = io('wss://api.guiders.com', {
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  auth: {
    token: 'YOUR_API_KEY' // o JWT token
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  timeout: 20000
});
```

### Autenticación para IA

```javascript
class SocketClientIA {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.socket = null;
    this.handlers = new Map();
    this.config = {
      autoReconnect: true,
      heartbeatInterval: 30000, // 30 segundos
      ...options
    };
  }
  
  async conectar() {
    this.socket = io('wss://api.guiders.com', {
      path: '/socket.io/',
      auth: {
        token: this.apiKey,
        userAgent: 'SistemaIA/1.0',
        capabilities: ['messaging', 'analytics', 'automation']
      },
      transports: ['websocket', 'polling']
    });
    
    await this.configurarEventos();
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        console.log('✅ Conectado al WebSocket');
        this.iniciarHeartbeat();
        resolve(this.socket.id);
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('❌ Error de conexión:', error);
        reject(error);
      });
    });
  }
  
  iniciarHeartbeat() {
    setInterval(() => {
      if (this.socket.connected) {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }
}
```

## 📨 Eventos Disponibles

### Eventos de Entrada (Escuchar)

#### 1. `message:new` - Nuevo Mensaje

Disparado cuando se recibe un nuevo mensaje en cualquier chat.

```javascript
socket.on('message:new', (data) => {
  console.log('Nuevo mensaje recibido:', data);
  // Procesar con IA
  procesarMensajeConIA(data);
});
```

**Estructura del evento:**

```json
{
  "chatId": "chat-123",
  "messageId": "msg-456",
  "content": "¿Pueden ayudarme con el precio del producto X?",
  "type": "user",
  "sender": {
    "id": "visitor-789",
    "name": "Cliente Potencial",
    "role": "visitor"
  },
  "timestamp": "2025-01-15T10:30:00Z",
  "metadata": {
    "department": "sales",
    "urgency": "medium",
    "source": "web-widget"
  }
}
```

#### 2. `chat:created` - Chat Creado

```javascript
socket.on('chat:created', (data) => {
  console.log('Nuevo chat creado:', data);
  // Análisis inmediato del nuevo chat
  analizarNuevoChat(data);
});
```

#### 3. `chat:assigned` - Chat Asignado

```javascript
socket.on('chat:assigned', (data) => {
  console.log('Chat asignado:', data);
  // Actualizar sistema de carga de trabajo
  actualizarDistribucionCarga(data);
});
```

#### 4. `chat:closed` - Chat Cerrado

```javascript
socket.on('chat:closed', (data) => {
  console.log('Chat cerrado:', data);
  // Análisis post-conversación
  analizarConversacionCompleta(data.chatId);
});
```

#### 5. `visitor:online` - Visitante Conectado

```javascript
socket.on('visitor:online', (data) => {
  console.log('Visitante conectado:', data);
  // Activar bot de bienvenida proactiva
  activarBotBienvenida(data.visitorId);
});
```

### Eventos de Salida (Emitir)

#### 1. Enviar Mensaje

```javascript
// Enviar mensaje generado por IA
socket.emit('message:send', {
  chatId: 'chat-123',
  content: 'Hola, soy tu asistente virtual. ¿En qué puedo ayudarte?',
  type: 'ai-response',
  metadata: {
    aiModel: 'gpt-4',
    confidence: 0.95,
    processingTime: 150,
    isAutomated: true
  }
});
```

#### 2. Asignar Chat

```javascript
// Escalar chat a comercial humano
socket.emit('chat:assign', {
  chatId: 'chat-123',
  commercialId: 'commercial-456',
  reason: 'Consulta técnica compleja',
  metadata: {
    escalatedBy: 'ai-system',
    escalationReason: 'outside_ai_capability'
  }
});
```

#### 3. Actualizar Estado de Chat

```javascript
// Marcar chat como procesando
socket.emit('chat:update', {
  chatId: 'chat-123',
  updates: {
    status: 'processing',
    tags: ['ai-processing'],
    metadata: {
      processingStarted: new Date().toISOString(),
      estimatedResponseTime: 30 // segundos
    }
  }
});
```

#### 4. Unirse a Sala de Chat

```javascript
// Unirse a sala específica para recibir eventos de ese chat
socket.emit('chat:join', {
  chatId: 'chat-123',
  role: 'ai-assistant'
});
```

## 🤖 Patrones de Implementación para IA

### 1. Bot Reactivo en Tiempo Real

```javascript
class BotReactivoTiempoReal {
  constructor(apiKey) {
    this.socketClient = new SocketClientIA(apiKey);
    this.procesando = new Set(); // Para evitar doble procesamiento
  }
  
  async inicializar() {
    await this.socketClient.conectar();
    this.configurarManejadores();
  }
  
  configurarManejadores() {
    // Responder automáticamente a nuevos mensajes
    this.socketClient.socket.on('message:new', async (data) => {
      if (this.procesando.has(data.chatId)) return;
      
      this.procesando.add(data.chatId);
      
      try {
        const debeResponder = await this.evaluarSiDebeResponder(data);
        
        if (debeResponder) {
          // Indicar que está escribiendo
          this.socketClient.socket.emit('typing:start', {
            chatId: data.chatId,
            typerId: 'ai-bot'
          });
          
          // Generar respuesta
          const respuesta = await this.generarRespuesta(data);
          
          // Enviar respuesta
          this.socketClient.socket.emit('message:send', {
            chatId: data.chatId,
            content: respuesta.texto,
            type: 'ai-response',
            metadata: respuesta.metadata
          });
          
          // Parar indicador de escritura
          this.socketClient.socket.emit('typing:stop', {
            chatId: data.chatId,
            typerId: 'ai-bot'
          });
        }
      } finally {
        this.procesando.delete(data.chatId);
      }
    });
    
    // Manejar nuevos chats
    this.socketClient.socket.on('chat:created', async (data) => {
      await this.enviarMensajeBienvenida(data.chatId);
    });
  }
  
  async evaluarSiDebeResponder(messageData) {
    // Lógica para determinar si el bot debe responder
    const esHorarioLaboral = this.esHorarioLaboral();
    const esConsultaSimple = await this.clasificarConsulta(messageData.content);
    const tieneComercialAsignado = messageData.chat?.assignedTo !== null;
    
    return esConsultaSimple && (!tieneComercialAsignado || !esHorarioLaboral);
  }
}
```

### 2. Monitor de Sentimientos en Tiempo Real

```javascript
class MonitorSentimientos {
  constructor(apiKey) {
    this.socketClient = new SocketClientIA(apiKey);
    this.analizador = new AnalizadorSentimientos();
    this.alertas = new Map();
  }
  
  async inicializar() {
    await this.socketClient.conectar();
    
    this.socketClient.socket.on('message:new', async (data) => {
      await this.analizarSentimiento(data);
    });
  }
  
  async analizarSentimiento(messageData) {
    const sentimiento = await this.analizador.analizar(messageData.content);
    
    if (sentimiento.esNegativo && sentimiento.intensidad > 0.7) {
      // Marcar como urgente
      this.socketClient.socket.emit('chat:update', {
        chatId: messageData.chatId,
        updates: {
          tags: ['urgente', 'sentimiento-negativo'],
          priority: 'high',
          metadata: {
            sentimentScore: sentimiento.score,
            detectedAt: new Date().toISOString()
          }
        }
      });
      
      // Notificar supervisor si no se ha hecho ya
      if (!this.alertas.has(messageData.chatId)) {
        this.socketClient.socket.emit('notification:send', {
          type: 'sentiment_alert',
          target: 'supervisors',
          data: {
            chatId: messageData.chatId,
            sentimiento: sentimiento,
            mensaje: messageData.content
          }
        });
        
        this.alertas.set(messageData.chatId, Date.now());
      }
    }
  }
}
```

### 3. Distribuidor Inteligente de Carga

```javascript
class DistribuidorInteligente {
  constructor(apiKey) {
    this.socketClient = new SocketClientIA(apiKey);
    this.comerciales = new Map(); // Estado de comerciales
    this.carga = new Map(); // Carga de trabajo por comercial
  }
  
  async inicializar() {
    await this.socketClient.conectar();
    await this.cargarEstadoComerciales();
    
    this.socketClient.socket.on('chat:created', async (data) => {
      await this.asignarOptimamente(data);
    });
    
    this.socketClient.socket.on('commercial:status', (data) => {
      this.actualizarEstadoComercial(data);
    });
  }
  
  async asignarOptimamente(chatData) {
    // Obtener comerciales disponibles
    const disponibles = Array.from(this.comerciales.values())
      .filter(c => c.status === 'available');
    
    if (disponibles.length === 0) {
      // No hay comerciales disponibles, mantener en cola
      return;
    }
    
    // Calcular mejor asignación basado en:
    // - Carga actual
    // - Especialización
    // - Tiempo de respuesta histórico
    const mejorComercial = this.calcularMejorAsignacion(chatData, disponibles);
    
    // Asignar chat
    this.socketClient.socket.emit('chat:assign', {
      chatId: chatData.chatId,
      commercialId: mejorComercial.id,
      reason: 'Asignación automática optimizada',
      metadata: {
        assignmentScore: mejorComercial.score,
        algorithm: 'ai_load_balancer_v2'
      }
    });
    
    // Actualizar carga
    this.carga.set(mejorComercial.id, 
      (this.carga.get(mejorComercial.id) || 0) + 1
    );
  }
}
```

## 🔄 Manejo de Reconexión

```javascript
class ManejadorReconexion {
  constructor(socketClient) {
    this.socketClient = socketClient;
    this.estadoAnterior = new Map();
    this.configurarReconexion();
  }
  
  configurarReconexion() {
    this.socketClient.socket.on('disconnect', (reason) => {
      console.warn('🔌 Desconectado:', reason);
      this.guardarEstado();
    });
    
    this.socketClient.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconectado después de', attemptNumber, 'intentos');
      this.restaurarEstado();
    });
    
    this.socketClient.socket.on('reconnect_error', (error) => {
      console.error('❌ Error de reconexión:', error);
      // Implementar backoff exponencial
      setTimeout(() => {
        this.socketClient.socket.connect();
      }, Math.pow(2, this.socketClient.socket.io.reconnectionAttempts()) * 1000);
    });
  }
  
  guardarEstado() {
    // Guardar estado actual para restaurar después de reconexión
    this.estadoAnterior.set('timestamp', Date.now());
    this.estadoAnterior.set('chatsActivos', this.obtenerChatsActivos());
    this.estadoAnterior.set('procesamiento', this.obtenerEstadoProcesamiento());
  }
  
  async restaurarEstado() {
    // Restaurar estado después de reconexión
    const chatsActivos = this.estadoAnterior.get('chatsActivos') || [];
    
    // Re-unirse a salas de chats
    for (const chatId of chatsActivos) {
      this.socketClient.socket.emit('chat:join', { chatId });
    }
    
    // Sincronizar estado
    await this.sincronizarEstado();
  }
}
```

## 📊 Métricas y Monitoreo

```javascript
class MetricasWebSocket {
  constructor(socketClient) {
    this.socketClient = socketClient;
    this.metricas = {
      mensajesRecibidos: 0,
      mensajesEnviados: 0,
      latenciaPromedio: 0,
      reconexiones: 0,
      errores: 0
    };
    
    this.configurarMonitoreo();
  }
  
  configurarMonitoreo() {
    // Medir latencia
    setInterval(() => {
      const inicio = Date.now();
      this.socketClient.socket.emit('ping', { timestamp: inicio });
    }, 30000);
    
    this.socketClient.socket.on('pong', (data) => {
      const latencia = Date.now() - data.timestamp;
      this.actualizarLatencia(latencia);
    });
    
    // Contar eventos
    this.socketClient.socket.onAny((evento) => {
      if (evento.startsWith('message:')) {
        this.metricas.mensajesRecibidos++;
      }
    });
  }
  
  obtenerEstadisticas() {
    return {
      ...this.metricas,
      conexionActiva: this.socketClient.socket.connected,
      tiempoConexion: this.socketClient.socket.connected ? 
        Date.now() - this.socketClient.socket.io.connectTime : 0
    };
  }
}
```

## 🚨 Manejo de Errores

```javascript
class ManejadorErroresWS {
  constructor(socketClient) {
    this.socketClient = socketClient;
    this.erroresConsecutivos = 0;
    this.maxErrores = 5;
    
    this.configurarManejadorErrores();
  }
  
  configurarManejadorErrores() {
    this.socketClient.socket.on('error', (error) => {
      this.erroresConsecutivos++;
      console.error(`❌ Error WebSocket (${this.erroresConsecutivos}/${this.maxErrores}):`, error);
      
      if (this.erroresConsecutivos >= this.maxErrores) {
        console.error('🚫 Demasiados errores, desconectando...');
        this.socketClient.socket.disconnect();
        
        // Implementar estrategia de recuperación
        setTimeout(() => {
          this.intentarRecuperacion();
        }, 5000);
      }
    });
    
    this.socketClient.socket.on('connect', () => {
      this.erroresConsecutivos = 0; // Reset contador en conexión exitosa
    });
  }
  
  async intentarRecuperacion() {
    try {
      await this.socketClient.conectar();
      console.log('✅ Recuperación exitosa');
    } catch (error) {
      console.error('❌ Fallo en recuperación:', error);
      // Implementar backoff exponencial
      setTimeout(() => this.intentarRecuperacion(), 10000);
    }
  }
}
```

## 🎯 Casos de Uso Avanzados

### Chat Colaborativo IA + Humano

```javascript
// IA y humano trabajando juntos en el mismo chat
socket.on('message:new', async (data) => {
  if (data.sender.role === 'commercial') {
    // Mensaje de comercial - IA proporciona ayuda contextual
    const sugerencias = await generarSugerenciasParaComercial(data);
    
    socket.emit('assistance:suggestions', {
      chatId: data.chatId,
      commercialId: data.sender.id,
      suggestions: sugerencias,
      private: true // Solo visible para el comercial
    });
  } else {
    // Mensaje de visitante - IA puede responder o ayudar
    const necesitaAyuda = await evaluarSiNecesitaAyuda(data);
    
    if (necesitaAyuda) {
      await proporcionarAyudaContextual(data);
    }
  }
});
```

### Análisis Predictivo en Tiempo Real

```javascript
// Predecir comportamiento basado en flujo de eventos
const predictor = new PredictorComportamiento();

socket.on('visitor:action', async (data) => {
  const prediccion = await predictor.predecir(data);
  
  if (prediccion.probabilidadCompra > 0.8) {
    // Activar estrategia de alta conversión
    socket.emit('trigger:high_conversion_flow', {
      visitorId: data.visitorId,
      strategy: 'premium_attention'
    });
  }
});
```

---

> **Importante**: Los WebSockets mantienen conexión persistente. Implementa siempre manejo robusto de reconexión y monitoreo de estado para asegurar la confiabilidad de tu sistema de IA.