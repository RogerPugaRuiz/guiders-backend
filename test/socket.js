// npm install socket.io-client
const { io } = require('socket.io-client');

const socket = io('https://guiders.ancoradual.com', {
  path: '/socket.io',
  transports: ['websocket'],
  reconnection: false
});

socket.on('connect', () => {
  console.log('✅ Conectado:', socket.id);
  socket.emit('health-check', { ts: new Date().toISOString() }, res => {
    console.log('⬅️  ACK:', res);
    socket.disconnect();
  });
});

socket.on('connect_error', err => {
  console.error('❌ No conecta:', err.message);
  process.exit(1);
});
