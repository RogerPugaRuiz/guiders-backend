# Ejemplos de Código para Integración de IA

Esta sección proporciona ejemplos prácticos de código en múltiples lenguajes para integrar sistemas de IA con el backend de Guiders.

## 📁 Estructura de Ejemplos

- [JavaScript/Node.js](javascript/) - Ejemplos con JavaScript y Node.js
- [Python](python/) - Implementaciones en Python
- [Java](java/) - Código Java para sistemas empresariales
- [TypeScript](typescript/) - Ejemplos tipados con TypeScript
- [Go](go/) - Implementaciones en Go para alta performance
- [Casos Completos](casos-completos/) - Implementaciones end-to-end

## 🚀 Inicio Rápido por Lenguaje

### JavaScript/Node.js

```javascript
// Instalación
npm install axios socket.io-client

// Uso básico
const GuidersAPI = require('./guiders-client');

const client = new GuidersAPI({
  apiKey: 'tu-api-key',
  baseURL: 'https://api.guiders.com/api'
});

// Obtener chats pendientes
const chats = await client.getChats({ status: 'PENDING' });
console.log('Chats pendientes:', chats.data.length);
```

### Python

```python
# Instalación
pip install requests websocket-client

# Uso básico
from guiders_client import GuidersClient

client = GuidersClient(
    api_key='tu-api-key',
    base_url='https://api.guiders.com/api'
)

# Obtener chats pendientes
chats = client.get_chats(status='PENDING')
print(f'Chats pendientes: {len(chats["data"])}')
```

### Java

```java
// Maven dependency
// <dependency>
//   <groupId>com.guiders</groupId>
//   <artifactId>guiders-java-client</artifactId>
//   <version>1.0.0</version>
// </dependency>

// Uso básico
GuidersClient client = new GuidersClient.Builder()
    .apiKey("tu-api-key")
    .baseUrl("https://api.guiders.com/api")
    .build();

// Obtener chats pendientes
ChatListResponse chats = client.getChats(
    ChatQuery.builder().status("PENDING").build()
);
System.out.println("Chats pendientes: " + chats.getData().size());
```

## 🎯 Ejemplos por Caso de Uso

### 1. Chatbot Simple

**JavaScript:**
```javascript
const { GuidersClient } = require('./guiders-client');
const { OpenAI } = require('openai');

class ChatbotSimple {
  constructor(guidersApiKey, openaiApiKey) {
    this.guiders = new GuidersClient({ apiKey: guidersApiKey });
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }
  
  async iniciar() {
    // Conectar WebSocket
    await this.guiders.connectWebSocket();
    
    // Escuchar nuevos mensajes
    this.guiders.on('message:new', async (data) => {
      if (data.sender.role === 'visitor') {
        await this.procesarMensaje(data);
      }
    });
  }
  
  async procesarMensaje(mensaje) {
    try {
      // Generar respuesta con OpenAI
      const respuesta = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente de atención al cliente útil y amigable.'
          },
          {
            role: 'user',
            content: mensaje.content
          }
        ],
        max_tokens: 150
      });
      
      // Enviar respuesta
      await this.guiders.sendMessage(mensaje.chatId, {
        content: respuesta.choices[0].message.content,
        type: 'ai-response',
        metadata: {
          model: 'gpt-3.5-turbo',
          confidence: 0.8
        }
      });
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      
      // Respuesta de fallback
      await this.guiders.sendMessage(mensaje.chatId, {
        content: 'Disculpa, tengo problemas técnicos. Un agente humano te atenderá pronto.',
        type: 'ai-response',
        metadata: { isFallback: true }
      });
    }
  }
}
```

**Python:**
```python
import asyncio
from guiders_client import GuidersClient
from openai import OpenAI

class ChatbotSimple:
    def __init__(self, guiders_api_key, openai_api_key):
        self.guiders = GuidersClient(api_key=guiders_api_key)
        self.openai = OpenAI(api_key=openai_api_key)
    
    async def iniciar(self):
        # Conectar WebSocket
        await self.guiders.connect_websocket()
        
        # Escuchar nuevos mensajes
        self.guiders.on('message:new', self.procesar_mensaje)
    
    async def procesar_mensaje(self, mensaje):
        if mensaje['sender']['role'] != 'visitor':
            return
        
        try:
            # Generar respuesta con OpenAI
            respuesta = self.openai.chat.completions.create(
                model='gpt-3.5-turbo',
                messages=[
                    {
                        'role': 'system',
                        'content': 'Eres un asistente de atención al cliente útil y amigable.'
                    },
                    {
                        'role': 'user',
                        'content': mensaje['content']
                    }
                ],
                max_tokens=150
            )
            
            # Enviar respuesta
            await self.guiders.send_message(mensaje['chatId'], {
                'content': respuesta.choices[0].message.content,
                'type': 'ai-response',
                'metadata': {
                    'model': 'gpt-3.5-turbo',
                    'confidence': 0.8
                }
            })
        except Exception as error:
            print(f'Error procesando mensaje: {error}')
            
            # Respuesta de fallback
            await self.guiders.send_message(mensaje['chatId'], {
                'content': 'Disculpa, tengo problemas técnicos. Un agente humano te atenderá pronto.',
                'type': 'ai-response',
                'metadata': {'isFallback': True}
            })
```

### 2. Análisis de Sentimientos

**Python con scikit-learn:**
```python
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from guiders_client import GuidersClient

class AnalizadorSentimientos:
    def __init__(self, guiders_api_key):
        self.guiders = GuidersClient(api_key=guiders_api_key)
        self.vectorizer = TfidfVectorizer(max_features=1000)
        self.modelo = LogisticRegression()
        self.entrenar_modelo()
    
    def entrenar_modelo(self):
        # Datos de entrenamiento básicos (en producción, usar dataset más grande)
        textos = [
            "Estoy muy satisfecho con el servicio",
            "Excelente atención, muy recomendable",
            "No me gusta nada, muy malo",
            "Terrible experiencia, no lo recomiendo",
            "El producto está bien, sin más",
            "Normal, ni bueno ni malo"
        ]
        sentimientos = [1, 1, 0, 0, 0.5, 0.5]  # 1=positivo, 0=negativo, 0.5=neutral
        
        X = self.vectorizer.fit_transform(textos)
        self.modelo.fit(X, sentimientos)
    
    async def analizar_chats(self):
        # Obtener chats activos
        chats = self.guiders.get_chats(status='ACTIVE')
        
        for chat in chats['data']:
            # Obtener mensajes del chat
            mensajes = self.guiders.get_messages(chat['id'])
            
            # Analizar sentimiento de mensajes del visitante
            mensajes_visitante = [
                m for m in mensajes['data'] 
                if m['sender']['role'] == 'visitor'
            ]
            
            if mensajes_visitante:
                sentimiento = self.calcular_sentimiento_promedio(mensajes_visitante)
                
                if sentimiento < 0.3:  # Sentimiento negativo
                    await self.manejar_sentimiento_negativo(chat, sentimiento)
    
    def calcular_sentimiento_promedio(self, mensajes):
        if not mensajes:
            return 0.5  # Neutral por defecto
        
        sentimientos = []
        for mensaje in mensajes:
            X = self.vectorizer.transform([mensaje['content']])
            sentimiento = self.modelo.predict(X)[0]
            sentimientos.append(sentimiento)
        
        return np.mean(sentimientos)
    
    async def manejar_sentimiento_negativo(self, chat, sentimiento):
        # Marcar chat como urgente
        await self.guiders.update_chat(chat['id'], {
            'tags': ['sentimiento-negativo', 'urgente'],
            'priority': 'high',
            'metadata': {
                'sentimentScore': sentimiento,
                'alertTriggered': True
            }
        })
        
        # Asignar a comercial senior si está disponible
        comerciales = self.guiders.get_commercials(
            status='available',
            experience_level='senior'
        )
        
        if comerciales['data']:
            mejor_comercial = comerciales['data'][0]
            await self.guiders.assign_chat(chat['id'], mejor_comercial['id'])
```

### 3. Clasificación Automática de Consultas

**JavaScript con TensorFlow.js:**
```javascript
const tf = require('@tensorflow/tfjs-node');
const { GuidersClient } = require('./guiders-client');

class ClasificadorConsultas {
  constructor(guidersApiKey) {
    this.guiders = new GuidersClient({ apiKey: guidersApiKey });
    this.modelo = null;
    this.vocabulario = null;
    this.cargarModelo();
  }
  
  async cargarModelo() {
    // En producción, cargar modelo pre-entrenado
    this.modelo = await tf.loadLayersModel('file://./modelo-clasificacion/model.json');
    this.vocabulario = require('./vocabulario.json');
  }
  
  async clasificarChats() {
    const chats = await this.guiders.getChats({ 
      status: 'PENDING',
      assignedTo: null 
    });
    
    for (const chat of chats.data) {
      const mensajes = await this.guiders.getMessages(chat.id);
      const categoria = await this.clasificarConsulta(mensajes.data);
      
      // Actualizar chat con categoría
      await this.guiders.updateChat(chat.id, {
        tags: [categoria.nombre, 'clasificado'],
        department: this.mapearDepartamento(categoria.nombre),
        metadata: {
          clasificacion: {
            categoria: categoria.nombre,
            confianza: categoria.confianza,
            timestamp: new Date().toISOString()
          }
        }
      });
      
      // Asignar automáticamente si la confianza es alta
      if (categoria.confianza > 0.8) {
        await this.asignarAutomaticamente(chat.id, categoria.nombre);
      }
    }
  }
  
  async clasificarConsulta(mensajes) {
    // Combinar todos los mensajes del visitante
    const textoCompleto = mensajes
      .filter(m => m.sender.role === 'visitor')
      .map(m => m.content)
      .join(' ');
    
    // Tokenizar y vectorizar
    const tokens = this.tokenizar(textoCompleto);
    const vector = this.vectorizar(tokens);
    
    // Predecir con el modelo
    const tensor = tf.tensor2d([vector]);
    const prediccion = await this.modelo.predict(tensor).data();
    
    // Obtener la categoría con mayor probabilidad
    const categorias = ['ventas', 'soporte', 'facturacion', 'devolucion', 'general'];
    const indiceMaximo = prediccion.indexOf(Math.max(...prediccion));
    
    return {
      nombre: categorias[indiceMaximo],
      confianza: prediccion[indiceMaximo],
      distribuccion: categorias.reduce((acc, cat, i) => {
        acc[cat] = prediccion[i];
        return acc;
      }, {})
    };
  }
  
  tokenizar(texto) {
    return texto.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }
  
  vectorizar(tokens) {
    const vector = new Array(this.vocabulario.length).fill(0);
    
    tokens.forEach(token => {
      const indice = this.vocabulario.indexOf(token);
      if (indice !== -1) {
        vector[indice] = 1;
      }
    });
    
    return vector;
  }
  
  mapearDepartamento(categoria) {
    const mapeo = {
      'ventas': 'sales',
      'soporte': 'support',
      'facturacion': 'billing',
      'devolucion': 'returns',
      'general': 'general'
    };
    
    return mapeo[categoria] || 'general';
  }
  
  async asignarAutomaticamente(chatId, categoria) {
    // Obtener comerciales especializados en la categoría
    const comerciales = await this.guiders.getCommercials({
      status: 'available',
      specialty: categoria,
      orderBy: 'workload'
    });
    
    if (comerciales.data.length > 0) {
      const comercialOptimo = comerciales.data[0];
      
      await this.guiders.assignChat(chatId, comercialOptimo.id);
      
      // Enviar contexto al comercial
      await this.guiders.sendPrivateMessage(comercialOptimo.id, {
        type: 'assignment_context',
        chatId: chatId,
        classification: {
          category: categoria,
          autoAssigned: true,
          reason: 'high_confidence_classification'
        }
      });
    }
  }
}
```

### 4. Sistema de Recomendaciones

**Java con Spring Boot:**
```java
@Service
public class SistemaRecomendaciones {
    
    @Autowired
    private GuidersClient guidersClient;
    
    @Autowired
    private MLRecommendationEngine recommendationEngine;
    
    @Scheduled(fixedRate = 300000) // Cada 5 minutos
    public void generarRecomendaciones() {
        try {
            // Obtener chats activos
            ChatListResponse chats = guidersClient.getChats(
                ChatQuery.builder()
                    .status("ACTIVE")
                    .hasAssignment(true)
                    .build()
            );
            
            for (Chat chat : chats.getData()) {
                generarRecomendacionesParaChat(chat);
            }
        } catch (Exception e) {
            log.error("Error generando recomendaciones", e);
        }
    }
    
    private void generarRecomendacionesParaChat(Chat chat) throws Exception {
        // Obtener historial de mensajes
        MessageListResponse mensajes = guidersClient.getMessages(chat.getId());
        
        // Generar recomendaciones basadas en contexto
        RecommendationContext contexto = RecommendationContext.builder()
            .chatId(chat.getId())
            .visitorProfile(chat.getVisitorInfo())
            .messageHistory(mensajes.getData())
            .department(chat.getMetadata().getDepartment())
            .build();
        
        List<Recommendation> recomendaciones = recommendationEngine
            .generateRecommendations(contexto);
        
        // Enviar recomendaciones al comercial
        if (!recomendaciones.isEmpty() && chat.getAssignedTo() != null) {
            enviarRecomendacionesAComercial(chat.getAssignedTo(), recomendaciones);
        }
    }
    
    private void enviarRecomendacionesAComercial(String commercialId, 
                                               List<Recommendation> recomendaciones) {
        try {
            PrivateMessage mensaje = PrivateMessage.builder()
                .type("ai_recommendations")
                .recipient(commercialId)
                .data(Map.of(
                    "recommendations", recomendaciones,
                    "timestamp", Instant.now(),
                    "version", "v2.1"
                ))
                .build();
            
            guidersClient.sendPrivateMessage(mensaje);
        } catch (Exception e) {
            log.error("Error enviando recomendaciones a comercial {}", commercialId, e);
        }
    }
}

@Component
public class MLRecommendationEngine {
    
    public List<Recommendation> generateRecommendations(RecommendationContext context) {
        List<Recommendation> recomendaciones = new ArrayList<>();
        
        // Análisis de intención
        String intencion = analizarIntencion(context.getMessageHistory());
        
        // Recomendaciones basadas en intención
        switch (intencion) {
            case "PRECIO":
                recomendaciones.add(Recommendation.builder()
                    .type("PRICING_INFO")
                    .title("Información de Precios")
                    .description("El cliente pregunta sobre precios. Considera mostrar la tabla de precios.")
                    .action("show_pricing_table")
                    .confidence(0.85)
                    .build());
                break;
                
            case "DEMO":
                recomendaciones.add(Recommendation.builder()
                    .type("DEMO_OFFER")
                    .title("Ofrecer Demostración")
                    .description("El cliente muestra interés. Es buen momento para ofrecer demo.")
                    .action("schedule_demo")
                    .confidence(0.78)
                    .build());
                break;
                
            case "SOPORTE":
                recomendaciones.add(Recommendation.builder()
                    .type("TECHNICAL_SUPPORT")
                    .title("Escalar a Soporte Técnico")
                    .description("Consulta técnica detectada. Considera escalar a especialista.")
                    .action("escalate_to_tech")
                    .confidence(0.92)
                    .build());
                break;
        }
        
        // Recomendaciones basadas en perfil del visitante
        if (context.getVisitorProfile().getIsExistingCustomer()) {
            recomendaciones.add(Recommendation.builder()
                .type("UPSELL_OPPORTUNITY")
                .title("Oportunidad de Upselling")
                .description("Cliente existente. Revisar historial de compras para sugerir complementos.")
                .action("review_purchase_history")
                .confidence(0.65)
                .build());
        }
        
        return recomendaciones;
    }
    
    private String analizarIntencion(List<Message> mensajes) {
        // Lógica simplificada de análisis de intención
        String contenidoCompleto = mensajes.stream()
            .filter(m -> "visitor".equals(m.getSender().getRole()))
            .map(Message::getContent)
            .collect(Collectors.joining(" "))
            .toLowerCase();
        
        if (contenidoCompleto.contains("precio") || contenidoCompleto.contains("cuesta")) {
            return "PRECIO";
        } else if (contenidoCompleto.contains("demo") || contenidoCompleto.contains("prueba")) {
            return "DEMO";
        } else if (contenidoCompleto.contains("problema") || contenidoCompleto.contains("error")) {
            return "SOPORTE";
        }
        
        return "GENERAL";
    }
}
```

## 🔧 Herramientas y Utilidades

### Cliente Universal JavaScript

```javascript
// guiders-client.js - Cliente universal para JavaScript
class GuidersClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.guiders.com/api';
    this.socket = null;
    this.eventHandlers = new Map();
  }
  
  // Métodos HTTP
  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  // API Endpoints
  async getChats(query = {}) {
    const params = new URLSearchParams(query).toString();
    return this.request('GET', `/v2/chats?${params}`);
  }
  
  async getChat(chatId) {
    return this.request('GET', `/v2/chats/${chatId}`);
  }
  
  async getMessages(chatId, query = {}) {
    const params = new URLSearchParams(query).toString();
    return this.request('GET', `/v2/chats/${chatId}/messages?${params}`);
  }
  
  async sendMessage(chatId, message) {
    return this.request('POST', `/v2/chats/${chatId}/messages`, message);
  }
  
  async assignChat(chatId, commercialId) {
    return this.request('PUT', `/v2/chats/${chatId}/assign/${commercialId}`);
  }
  
  // WebSocket
  async connectWebSocket() {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.socket = io(this.baseURL.replace('/api', ''), {
      auth: { token: this.apiKey },
      path: '/socket.io/'
    });
    
    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
    });
    
    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket desconectado');
    });
    
    // Reenviar eventos a handlers registrados
    this.socket.onAny((eventName, data) => {
      if (this.eventHandlers.has(eventName)) {
        this.eventHandlers.get(eventName).forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error en handler ${eventName}:`, error);
          }
        });
      }
    });
  }
  
  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName).push(handler);
  }
  
  emit(eventName, data) {
    if (this.socket) {
      this.socket.emit(eventName, data);
    }
  }
}

module.exports = { GuidersClient };
```

## 📁 Estructura Completa de Directorio

```
ejemplos/
├── javascript/
│   ├── chatbot-simple/
│   ├── analisis-sentimientos/
│   ├── clasificacion-automatica/
│   └── cliente-universal/
├── python/
│   ├── chatbot-ml/
│   ├── procesamiento-batch/
│   ├── analisis-predictivo/
│   └── integracion-huggingface/
├── java/
│   ├── spring-boot-integration/
│   ├── kafka-streaming/
│   ├── microservices-architecture/
│   └── enterprise-chatbot/
├── typescript/
│   ├── nest-js-integration/
│   ├── react-ai-dashboard/
│   ├── websocket-manager/
│   └── tipo-definitions/
├── go/
│   ├── high-performance-bot/
│   ├── concurrent-processor/
│   ├── grpc-integration/
│   └── load-balancer/
└── casos-completos/
    ├── chatbot-e-commerce/
    ├── sistema-tickets-ia/
    ├── dashboard-analytics/
    └── plataforma-multicanal/
```

---

> **Nota**: Todos los ejemplos incluyen manejo de errores, logging y configuración para diferentes entornos (desarrollo, staging, producción). Revisa cada directorio para ejemplos específicos de tu stack tecnológico.