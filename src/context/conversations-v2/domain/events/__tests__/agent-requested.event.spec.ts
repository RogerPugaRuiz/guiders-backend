import {
  AgentRequestedEvent,
  AgentRequestedData,
} from '../agent-requested.event';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('AgentRequestedEvent', () => {
  describe('constructor', () => {
    it('debería crear un evento de solicitud de agente con todos los parámetros', () => {
      // Arrange
      const requestData: AgentRequestedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        previousPriority: 'NORMAL',
        newPriority: 'URGENT',
        source: 'quick_action',
        requestedAt: new Date(),
      };

      // Act
      const event = new AgentRequestedEvent({ request: requestData });

      // Assert
      expect(event.getChatId()).toBe(requestData.chatId);
      expect(event.getVisitorId()).toBe(requestData.visitorId);
      expect(event.getRequestData().previousPriority).toBe('NORMAL');
      expect(event.getRequestData().newPriority).toBe('URGENT');
      expect(event.getRequestData().source).toBe('quick_action');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('debería crear un evento cuando la prioridad ya era URGENT', () => {
      // Arrange
      const requestData: AgentRequestedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        previousPriority: 'URGENT',
        newPriority: 'URGENT',
        source: 'button',
        requestedAt: new Date(),
      };

      // Act
      const event = new AgentRequestedEvent({ request: requestData });

      // Assert
      expect(event.getChatId()).toBe(requestData.chatId);
      expect(event.getRequestData().previousPriority).toBe('URGENT');
      expect(event.getRequestData().newPriority).toBe('URGENT');
      expect(event.hadPriorityChange()).toBe(false);
    });

    it('debería crear un evento con source por defecto', () => {
      // Arrange
      const requestData: AgentRequestedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        previousPriority: 'HIGH',
        newPriority: 'URGENT',
        source: 'quick_action',
        requestedAt: new Date(),
      };

      // Act
      const event = new AgentRequestedEvent({ request: requestData });

      // Assert
      expect(event.getRequestData().source).toBe('quick_action');
    });
  });

  describe('eventName', () => {
    it('debería retornar el nombre correcto del evento', () => {
      // Act & Assert
      expect(AgentRequestedEvent.eventName).toBe('chat.v2.agent-requested');
    });
  });

  describe('hadPriorityChange', () => {
    it('debería retornar true cuando la prioridad cambió', () => {
      // Arrange
      const requestData: AgentRequestedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        previousPriority: 'NORMAL',
        newPriority: 'URGENT',
        source: 'quick_action',
        requestedAt: new Date(),
      };

      const event = new AgentRequestedEvent({ request: requestData });

      // Act & Assert
      expect(event.hadPriorityChange()).toBe(true);
    });

    it('debería retornar false cuando la prioridad no cambió', () => {
      // Arrange
      const requestData: AgentRequestedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        previousPriority: 'URGENT',
        newPriority: 'URGENT',
        source: 'quick_action',
        requestedAt: new Date(),
      };

      const event = new AgentRequestedEvent({ request: requestData });

      // Act & Assert
      expect(event.hadPriorityChange()).toBe(false);
    });

    it('debería retornar true cuando cambió de HIGH a URGENT', () => {
      // Arrange
      const requestData: AgentRequestedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        previousPriority: 'HIGH',
        newPriority: 'URGENT',
        source: 'quick_action',
        requestedAt: new Date(),
      };

      const event = new AgentRequestedEvent({ request: requestData });

      // Act & Assert
      expect(event.hadPriorityChange()).toBe(true);
    });
  });

  describe('getters', () => {
    it('debería obtener correctamente los datos de la solicitud', () => {
      // Arrange
      const requestData: AgentRequestedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        previousPriority: 'LOW',
        newPriority: 'URGENT',
        source: 'manual',
        requestedAt: new Date('2025-12-01T10:30:00Z'),
      };

      const event = new AgentRequestedEvent({ request: requestData });

      // Act & Assert
      expect(event.getRequestData()).toEqual(requestData);
      expect(event.getChatId()).toBe(requestData.chatId);
      expect(event.getVisitorId()).toBe(requestData.visitorId);
    });

    it('debería retornar la fecha de solicitud correctamente', () => {
      // Arrange
      const requestedAt = new Date('2025-12-01T15:00:00Z');
      const requestData: AgentRequestedData = {
        chatId: Uuid.random().value,
        visitorId: Uuid.random().value,
        previousPriority: 'NORMAL',
        newPriority: 'URGENT',
        source: 'quick_action',
        requestedAt,
      };

      const event = new AgentRequestedEvent({ request: requestData });

      // Act & Assert
      expect(event.getRequestData().requestedAt).toEqual(requestedAt);
    });
  });
});
