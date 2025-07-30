import { CommercialAssignedEvent } from '../commercial-assigned.event';
import { ChatId } from '../../value-objects/chat-id';
import { CommercialId } from '../../value-objects/commercial-id';

describe('CommercialAssignedEvent', () => {
  const mockChatId = ChatId.generate();
  const mockCommercialId = CommercialId.generate();
  const mockVisitorId = 'visitor-123';

  describe('constructor', () => {
    it('debería crear un evento de comercial asignado', () => {
      // Arrange
      const assignmentData = {
        chatId: mockChatId.value,
        commercialId: mockCommercialId.value,
        visitorId: mockVisitorId,
        previousStatus: 'pending',
        newStatus: 'assigned',
        assignedAt: new Date(),
        assignmentReason: 'auto',
      };

      // Act
      const event = new CommercialAssignedEvent({ assignment: assignmentData });

      // Assert
      expect(event.getChatId()).toBe(mockChatId.value);
      expect(event.getCommercialId()).toBe(mockCommercialId.value);
      expect(event.getVisitorId()).toBe(mockVisitorId);
      expect(event.isAutoAssignment()).toBe(true);
      expect(event.isTransfer()).toBe(false);
    });

    it('debería crear un evento de transferencia', () => {
      // Arrange
      const assignmentData = {
        chatId: mockChatId.value,
        commercialId: mockCommercialId.value,
        visitorId: mockVisitorId,
        previousStatus: 'assigned',
        newStatus: 'assigned',
        assignedAt: new Date(),
        assignmentReason: 'transfer',
      };

      // Act
      const event = new CommercialAssignedEvent({ assignment: assignmentData });

      // Assert
      expect(event.getChatId()).toBe(mockChatId.value);
      expect(event.getCommercialId()).toBe(mockCommercialId.value);
      expect(event.getVisitorId()).toBe(mockVisitorId);
      expect(event.isAutoAssignment()).toBe(false);
      expect(event.isTransfer()).toBe(true);
    });
  });

  describe('getAssignmentData', () => {
    it('debería retornar los datos de asignación completos', () => {
      // Arrange
      const assignmentData = {
        chatId: mockChatId.value,
        commercialId: mockCommercialId.value,
        visitorId: mockVisitorId,
        previousStatus: 'pending',
        newStatus: 'assigned',
        assignedAt: new Date(),
        assignmentReason: 'manual',
      };
      const event = new CommercialAssignedEvent({ assignment: assignmentData });

      // Act
      const result = event.getAssignmentData();

      // Assert
      expect(result).toEqual(assignmentData);
    });
  });

  describe('eventName', () => {
    it('debería tener el nombre correcto del evento', () => {
      // Act & Assert
      expect(CommercialAssignedEvent.eventName).toBe(
        'chat.v2.commercial.assigned',
      );
    });
  });
});
