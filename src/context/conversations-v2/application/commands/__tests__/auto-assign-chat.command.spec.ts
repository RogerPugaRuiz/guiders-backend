import { AutoAssignChatCommand } from '../auto-assign-chat.command';
// import { AssignmentStrategy } from '../../../domain/services/chat-auto-assignment.domain-service';

describe('AutoAssignChatCommand', () => {
  describe('constructor', () => {
    it('debería crear comando con parámetros básicos', () => {
      const command = new AutoAssignChatCommand({
        chatId: 'chat-123',
      });

      expect(command.chatId).toBe('chat-123');
      expect(command.strategy).toBeUndefined();
      expect(command.requiredSkills).toBeUndefined();
      expect(command.maxWaitTimeSeconds).toBeUndefined();
      expect(command.reason).toBeUndefined();
    });

    it('debería crear comando con parámetros opcionales', () => {
      const command = new AutoAssignChatCommand({
        chatId: 'chat-123',
        requiredSkills: ['ventas', 'soporte'],
        maxWaitTimeSeconds: 300,
        reason: 'Asignación manual solicitada',
      });

      expect(command.chatId).toBe('chat-123');
      expect(command.requiredSkills).toEqual(['ventas', 'soporte']);
      expect(command.maxWaitTimeSeconds).toBe(300);
      expect(command.reason).toBe('Asignación manual solicitada');
    });

    it('debería validar que chatId sea requerido', () => {
      expect(() => new AutoAssignChatCommand({ chatId: '' })).toThrow(
        'El ID del chat es requerido',
      );
    });

    it('debería validar que maxWaitTimeSeconds sea positivo', () => {
      expect(
        () =>
          new AutoAssignChatCommand({
            chatId: 'chat-123',
            maxWaitTimeSeconds: -1,
          }),
      ).toThrow('El tiempo máximo de espera debe ser mayor a 0');
    });

    it('debería validar que requiredSkills no esté vacío si se proporciona', () => {
      expect(
        () =>
          new AutoAssignChatCommand({
            chatId: 'chat-123',
            requiredSkills: [],
          }),
      ).toThrow(
        'Las habilidades requeridas no pueden estar vacías si se proporcionan',
      );
    });

    it('debería validar que la estrategia sea válida si se proporciona', () => {
      expect(
        () =>
          new AutoAssignChatCommand({
            chatId: 'chat-123',
            strategy: 'INVALID_STRATEGY' as any,
          }),
      ).toThrow('La estrategia de asignación proporcionada no es válida');
    });
  });
});
