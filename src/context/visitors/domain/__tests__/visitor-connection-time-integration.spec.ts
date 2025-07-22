import { Visitor } from '../visitor';
import { VisitorId } from '../value-objects/visitor-id';
import { VisitorConnectionTime } from '../value-objects/visitor-connection-time';
import { VisitorConnectionTimeUpdatedEvent } from '../events/visitor-connection-time-updated-event';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('Visitor Connection Time Integration', () => {
  describe('updateConnectionTime', () => {
    it('should update connection time and emit event', () => {
      // Arrange
      const validUuid = Uuid.generate();
      const visitorId = VisitorId.create(validUuid);
      const visitor = Visitor.create({ id: visitorId });
      const connectionTime = new VisitorConnectionTime(5000);

      // Act
      const updatedVisitor = visitor.updateConnectionTime(connectionTime);

      // Assert
      expect(updatedVisitor.connectionTime.isPresent()).toBe(true);
      expect(updatedVisitor.connectionTime.get().value).toBe(5000);
      expect(updatedVisitor.getUncommittedEvents().length).toBeGreaterThan(0);

      const connectionTimeEvent = updatedVisitor
        .getUncommittedEvents()
        .find(
          (event) => event instanceof VisitorConnectionTimeUpdatedEvent,
        ) as VisitorConnectionTimeUpdatedEvent;

      expect(connectionTimeEvent).toBeDefined();
      expect(connectionTimeEvent.attributes.visitorId).toBe(validUuid);
      expect(connectionTimeEvent.attributes.connectionTime).toBe(5000);
    });

    it('should be idempotent when updating with same connection time', () => {
      // Arrange
      const validUuid = Uuid.generate();
      const visitorId = VisitorId.create(validUuid);
      const connectionTime = new VisitorConnectionTime(5000);
      const visitor = Visitor.create({ id: visitorId, connectionTime });

      // Act
      const updatedVisitor = visitor.updateConnectionTime(connectionTime);

      // Assert - should return the same instance
      expect(updatedVisitor).toBe(visitor);
    });

    it('should maintain connection time through serialization/deserialization', () => {
      // Arrange
      const validUuid = Uuid.generate();
      const originalData = {
        id: validUuid,
        name: 'Test Visitor',
        email: 'test@example.com',
        tel: null,
        tags: ['test'],
        notes: ['Test note'],
        currentPage: '/test',
        connectionTime: 7500,
      };

      // Act
      const visitor = Visitor.fromPrimitives(originalData);
      const primitives = visitor.toPrimitives();

      // Assert
      expect(primitives).toEqual(originalData);
      expect(visitor.connectionTime.isPresent()).toBe(true);
      expect(visitor.connectionTime.get().value).toBe(7500);
      expect(visitor.connectionTime.get().toSeconds()).toBe(7);
      expect(visitor.connectionTime.get().toMinutes()).toBe(0);
      expect(visitor.connectionTime.get().toHumanReadable()).toBe('7s');
    });

    it('should handle long connection times correctly', () => {
      // Arrange
      const validUuid = Uuid.generate();
      const longConnectionTime = 3723000; // 1 hour, 2 minutes, 3 seconds
      const connectionTime = new VisitorConnectionTime(longConnectionTime);
      const visitorId = VisitorId.create(validUuid);
      const visitor = Visitor.create({ id: visitorId, connectionTime });

      // Act & Assert
      expect(visitor.connectionTime.get().toSeconds()).toBe(3723);
      expect(visitor.connectionTime.get().toMinutes()).toBe(62);
      expect(visitor.connectionTime.get().toHumanReadable()).toBe('62m 3s');
    });
  });
});
