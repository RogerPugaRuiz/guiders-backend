/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { AppModule } from 'src/app.module';

describe('WebSocket e2e', () => {
  let app: INestApplication;
  let socket: Socket;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const port = 3000;
    socket = io(`http://localhost:${port}`);
  });

  afterEach(async () => {
    await app.close();
    socket.close();
  });

  it('should receive a message from server', (done) => {
    // Escuchamos el evento 'message' y verificamos la respuesta
    socket.on('message', (data: string) => {
      expect(data).toBe('expected message');
      done();
    });
    // Emitimos el evento 'sendMessage' al servidor
    socket.emit('sendMessage', 'test');
  });
});
