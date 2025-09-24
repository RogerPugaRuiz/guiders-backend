import { Test, TestingModule } from '@nestjs/testing';
import { ChatQueueConfigServiceImpl } from '../chat-queue-config.service.impl';

describe('ChatQueueConfigServiceImpl', () => {
  let service: ChatQueueConfigServiceImpl;

  beforeEach(async () => {
    // Limpiar variables de entorno antes de cada test
    delete process.env.CHAT_QUEUE_MODE_ENABLED;
    delete process.env.CHAT_QUEUE_MAX_WAIT_SECONDS;
    delete process.env.CHAT_QUEUE_MAX_SIZE_PER_DEPARTMENT;
    delete process.env.CHAT_QUEUE_NOTIFY_COMMERCIALS;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatQueueConfigServiceImpl],
    }).compile();

    service = module.get<ChatQueueConfigServiceImpl>(
      ChatQueueConfigServiceImpl,
    );
  });

  describe('Configuración por defecto', () => {
    it('debe estar desactivado por defecto', () => {
      expect(service.isQueueModeEnabled()).toBe(false);
    });

    it('debe retornar configuración por defecto', () => {
      const config = service.getConfig();

      expect(config.queueModeEnabled).toBe(false);
      expect(config.maxQueueWaitTimeSeconds).toBe(300); // 5 minutos por defecto según implementación
      expect(config.maxQueueSizePerDepartment).toBe(50); // Valor por defecto según implementación
      expect(config.notifyCommercialsOnNewChats).toBe(true);
    });
  });

  describe('shouldUseQueue', () => {
    it('debe retornar false cuando modo cola está desactivado', () => {
      const shouldUse = service.shouldUseQueue('chat-123', 'NORMAL');
      expect(shouldUse).toBe(false);
    });

    it('debe retornar false para chats URGENT incluso si modo cola estuviera activado', () => {
      // Simular modo cola activado
      process.env.CHAT_QUEUE_MODE_ENABLED = 'true';

      const newService = new ChatQueueConfigServiceImpl();
      const shouldUse = newService.shouldUseQueue('chat-123', 'URGENT');

      expect(shouldUse).toBe(false);

      // Limpiar env var
      delete process.env.CHAT_QUEUE_MODE_ENABLED;
    });

    it('debe respetar variables de entorno', () => {
      // Configurar variables de entorno
      process.env.CHAT_QUEUE_MODE_ENABLED = 'true';
      process.env.CHAT_QUEUE_MAX_WAIT_SECONDS = '600';
      process.env.CHAT_QUEUE_MAX_SIZE_PER_DEPARTMENT = '100';
      process.env.CHAT_QUEUE_NOTIFY_COMMERCIALS = 'false';

      const newService = new ChatQueueConfigServiceImpl();
      const config = newService.getConfig();

      expect(config.queueModeEnabled).toBe(true);
      expect(config.maxQueueWaitTimeSeconds).toBe(600);
      expect(config.maxQueueSizePerDepartment).toBe(100);
      expect(config.notifyCommercialsOnNewChats).toBe(false);

      // Limpiar variables de entorno
      delete process.env.CHAT_QUEUE_MODE_ENABLED;
      delete process.env.CHAT_QUEUE_MAX_WAIT_SECONDS;
      delete process.env.CHAT_QUEUE_MAX_SIZE_PER_DEPARTMENT;
      delete process.env.CHAT_QUEUE_NOTIFY_COMMERCIALS;
    });
  });

  describe('getMaxQueueWaitTime', () => {
    it('debe retornar tiempo máximo configurado', () => {
      const waitTime = service.getMaxQueueWaitTime();
      expect(waitTime).toBe(300); // 5 minutos por defecto
    });
  });
});
