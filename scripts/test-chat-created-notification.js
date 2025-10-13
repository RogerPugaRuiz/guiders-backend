#!/usr/bin/env node

/**
 * Script para probar la notificación de chat creado
 *
 * Uso:
 * 1. Asegúrate de que el servidor esté corriendo
 * 2. Ejecuta: node scripts/test-chat-created-notification.js
 *
 * Este script:
 * 1. Se conecta al WebSocket
 * 2. Se une a una sala de visitante
 * 3. Crea un chat usando el endpoint HTTP
 * 4. Verifica si recibe la notificación chat:created
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuración
const API_URL = process.env.API_URL || 'http://localhost:3000';
const VISITOR_ID = process.env.VISITOR_ID || 'test-visitor-' + Date.now();

console.log('=== Test de Notificación de Chat Creado ===\n');
console.log(`API URL: ${API_URL}`);
console.log(`Visitor ID: ${VISITOR_ID}\n`);

// 1. Conectar al WebSocket
console.log('1️⃣  Conectando al WebSocket...');
const socket = io(API_URL, {
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  withCredentials: true,
});

// Eventos de conexión
socket.on('connect', () => {
  console.log('✅ WebSocket conectado:', socket.id);

  // 2. Unirse a la sala del visitante
  console.log('\n2️⃣  Uniéndose a la sala del visitante...');
  socket.emit('visitor:join', { visitorId: VISITOR_ID }, (response) => {
    console.log('Respuesta de visitor:join:', response);
  });
});

socket.on('visitor:joined', (data) => {
  console.log('✅ Sala de visitante unida:', data);
  console.log(`   Sala: ${data.roomName}`);

  // 3. Crear un chat después de unirse a la sala
  setTimeout(() => {
    createChat();
  }, 1000);
});

socket.on('visitor:left', (data) => {
  console.log('👋 Sala de visitante abandonada:', data);
});

// Escuchar notificación de chat creado
socket.on('chat:created', (data) => {
  console.log('\n🎉 ¡NOTIFICACIÓN RECIBIDA! chat:created');
  console.log('Datos del chat:', JSON.stringify(data, null, 2));
  console.log('\n✅ TEST EXITOSO: La notificación fue recibida correctamente');

  // Esperar un poco y cerrar
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('disconnect', (reason) => {
  console.log('⚠️  WebSocket desconectado:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Error de conexión:', error.message);
  process.exit(1);
});

// Función para crear el chat
async function createChat() {
  console.log('\n3️⃣  Creando chat con mensaje...');

  try {
    const response = await axios.post(
      `${API_URL}/api/v2/chats/with-message`,
      {
        visitorId: VISITOR_ID,
        firstMessage: {
          content: 'Mensaje de prueba para testing de notificaciones',
          type: 'text',
        },
        visitorInfo: {
          name: 'Visitante de Prueba',
          email: 'test@example.com',
        },
        metadata: {
          source: 'test-script',
          testTimestamp: new Date().toISOString(),
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Chat creado exitosamente:');
    console.log(`   Chat ID: ${response.data.chatId}`);
    console.log(`   Message ID: ${response.data.messageId}`);
    console.log(`   Position: ${response.data.position}`);
    console.log('\n4️⃣  Esperando notificación WebSocket...');
    console.log('   (Timeout: 10 segundos)');

    // Timeout para verificar si la notificación llega
    setTimeout(() => {
      console.log('\n⚠️  TIMEOUT: No se recibió la notificación chat:created en 10 segundos');
      console.log('\n❌ TEST FALLIDO: La notificación NO fue recibida');
      console.log('\nPosibles causas:');
      console.log('1. El event handler no está registrado correctamente');
      console.log('2. El evento ChatCreatedEvent no se está emitiendo');
      console.log('3. El visitante no se unió correctamente a la sala');
      console.log('4. Hay un error en el event handler (revisar logs del servidor)');

      socket.disconnect();
      process.exit(1);
    }, 10000);

  } catch (error) {
    console.error('❌ Error al crear chat:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    socket.disconnect();
    process.exit(1);
  }
}

// Manejo de señales
process.on('SIGINT', () => {
  console.log('\n\n👋 Cerrando script...');
  socket.disconnect();
  process.exit(0);
});
