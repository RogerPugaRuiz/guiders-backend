import { AssignChatToCommercialCommand } from '../assign-chat-to-commercial.command';

describe('AssignChatToCommercialCommand', () => {
  describe('constructor', () => {
    it('debe crear correctamente un command con todos los parámetros', () => {
      // Given
      const params = {
        chatId: 'chat-123',
        commercialId: 'commercial-456',
        assignedBy: 'admin-789',
        reason: 'supervisor-assignment',
      };

      // When
      const command = new AssignChatToCommercialCommand(params);

      // Then
      expect(command.chatId).toBe(params.chatId);
      expect(command.commercialId).toBe(params.commercialId);
      expect(command.assignedBy).toBe(params.assignedBy);
      expect(command.reason).toBe(params.reason);
    });

    it('debe crear command con reason por defecto cuando no se proporciona', () => {
      // Given
      const params = {
        chatId: 'chat-123',
        commercialId: 'commercial-456',
        assignedBy: 'admin-789',
      };

      // When
      const command = new AssignChatToCommercialCommand(params);

      // Then
      expect(command.reason).toBe('manual');
    });

    it('debe crear command sin assignedBy cuando es opcional', () => {
      // Given
      const params = {
        chatId: 'chat-123',
        commercialId: 'commercial-456',
      };

      // When
      const command = new AssignChatToCommercialCommand(params);

      // Then
      expect(command.assignedBy).toBeUndefined();
      expect(command.reason).toBe('manual');
    });

    describe('validaciones', () => {
      it('debe lanzar error si chatId está vacío', () => {
        // Given
        const params = {
          chatId: '',
          commercialId: 'commercial-456',
        };

        // When & Then
        expect(() => new AssignChatToCommercialCommand(params)).toThrow(
          'El ID del chat es requerido',
        );
      });

      it('debe lanzar error si chatId es solo espacios en blanco', () => {
        // Given
        const params = {
          chatId: '   ',
          commercialId: 'commercial-456',
        };

        // When & Then
        expect(() => new AssignChatToCommercialCommand(params)).toThrow(
          'El ID del chat es requerido',
        );
      });

      it('debe lanzar error si commercialId está vacío', () => {
        // Given
        const params = {
          chatId: 'chat-123',
          commercialId: '',
        };

        // When & Then
        expect(() => new AssignChatToCommercialCommand(params)).toThrow(
          'El ID del comercial es requerido',
        );
      });

      it('debe lanzar error si commercialId es solo espacios en blanco', () => {
        // Given
        const params = {
          chatId: 'chat-123',
          commercialId: '   ',
        };

        // When & Then
        expect(() => new AssignChatToCommercialCommand(params)).toThrow(
          'El ID del comercial es requerido',
        );
      });
    });
  });
});
