import { Visitor } from '../visitor';
import { VisitorId } from '../value-objects/visitor-id';
import { VisitorName } from '../value-objects/visitor-name';
import { VisitorEmail } from '../value-objects/visitor-email';
import { VisitorTel } from '../value-objects/visitor-tel';
import { VisitorTags } from '../value-objects/visitor-tags';
import { VisitorTag } from '../value-objects/visitor-tag';
import { VisitorNotes } from '../value-objects/visitor-notes';
import { VisitorNote } from '../value-objects/visitor-note';
import { VisitorCurrentPage } from '../value-objects/visitor-current-page';
import { VisitorCurrentPageUpdatedEvent } from '../events/visitor-current-page-updated-event';
import { VisitorEmailUpdatedEvent } from '../events/visitor-email-updated-event';
import { VisitorNameUpdatedEvent } from '../events/visitor-name-updated-event';
import { VisitorTelUpdatedEvent } from '../events/visitor-tel-updated-event';

describe('Visitor', () => {
  const visitorId = new VisitorId('visitor-123');
  const visitorName = new VisitorName('John Doe');
  const visitorEmail = new VisitorEmail('john@example.com');
  const visitorTel = new VisitorTel('123456789');
  const visitorTags = new VisitorTags([new VisitorTag('VIP')]);
  const visitorNotes = new VisitorNotes([new VisitorNote('Important visitor')]);

  describe('create', () => {
    it('should create visitor with all fields', () => {
      const visitor = Visitor.create({
        id: visitorId,
        name: visitorName,
        email: visitorEmail,
        tel: visitorTel,
        tags: visitorTags,
        notes: visitorNotes,
      });

      expect(visitor.id).toBe(visitorId);
      expect(visitor.name.get()).toBe(visitorName);
      expect(visitor.email.get()).toBe(visitorEmail);
      expect(visitor.tel.get()).toBe(visitorTel);
      expect(visitor.tags).toBe(visitorTags);
      expect(visitor.notes).toBe(visitorNotes);
      expect(visitor.currentPage.isPresent()).toBe(false);
    });

    it('should create visitor with minimal fields', () => {
      const visitor = Visitor.create({
        id: visitorId,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      expect(visitor.id).toBe(visitorId);
      expect(visitor.name.isPresent()).toBe(false);
      expect(visitor.email.isPresent()).toBe(false);
      expect(visitor.tel.isPresent()).toBe(false);
      expect(visitor.tags.value).toHaveLength(0);
      expect(visitor.notes.value).toHaveLength(0);
    });
  });

  describe('updateCurrentPage', () => {
    it('should update current page and emit event', () => {
      // Arrange
      const visitor = Visitor.create({
        id: visitorId,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });
      const newPage = new VisitorCurrentPage('/new-page');

      // Act
      const updatedVisitor = visitor.updateCurrentPage(newPage);

      // Assert
      expect(updatedVisitor).not.toBe(visitor); // Immutability
      expect(updatedVisitor.currentPage.get()).toBe(newPage);
      expect(updatedVisitor.getUncommittedEvents()).toHaveLength(1);

      const event = updatedVisitor.getUncommittedEvents()[0];
      expect(event).toBeInstanceOf(VisitorCurrentPageUpdatedEvent);
      expect(event.payload.visitorId).toBe(visitorId.value);
      expect(event.payload.currentPage).toBe(newPage.value);
    });

    it('should preserve other fields when updating current page', () => {
      // Arrange
      const visitor = Visitor.create({
        id: visitorId,
        name: visitorName,
        email: visitorEmail,
        tel: visitorTel,
        tags: visitorTags,
        notes: visitorNotes,
      });
      const newPage = new VisitorCurrentPage('/test-page');

      // Act
      const updatedVisitor = visitor.updateCurrentPage(newPage);

      // Assert
      expect(updatedVisitor.id).toBe(visitorId);
      expect(updatedVisitor.name.get()).toBe(visitorName);
      expect(updatedVisitor.email.get()).toBe(visitorEmail);
      expect(updatedVisitor.tel.get()).toBe(visitorTel);
      expect(updatedVisitor.tags).toBe(visitorTags);
      expect(updatedVisitor.notes).toBe(visitorNotes);
    });
  });

  describe('updateEmail', () => {
    it('should update email and emit event', () => {
      // Arrange
      const visitor = Visitor.create({
        id: visitorId,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });
      const newEmail = new VisitorEmail('new@example.com');

      // Act
      const updatedVisitor = visitor.updateEmail(newEmail);

      // Assert
      expect(updatedVisitor).not.toBe(visitor); // Immutability
      expect(updatedVisitor.email.get()).toBe(newEmail);
      expect(updatedVisitor.getUncommittedEvents()).toHaveLength(1);

      const event = updatedVisitor.getUncommittedEvents()[0];
      expect(event).toBeInstanceOf(VisitorEmailUpdatedEvent);
    });

    it('should return same instance if email is unchanged', () => {
      // Arrange
      const visitor = Visitor.create({
        id: visitorId,
        email: visitorEmail,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      // Act
      const updatedVisitor = visitor.updateEmail(visitorEmail);

      // Assert
      expect(updatedVisitor).toBe(visitor); // Same instance for idempotency
    });
  });

  describe('updateName', () => {
    it('should update name and emit event', () => {
      // Arrange
      const visitor = Visitor.create({
        id: visitorId,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });
      const newName = new VisitorName('Jane Doe');

      // Act
      const updatedVisitor = visitor.updateName(newName);

      // Assert
      expect(updatedVisitor).not.toBe(visitor); // Immutability
      expect(updatedVisitor.name.get()).toBe(newName);
      expect(updatedVisitor.getUncommittedEvents()).toHaveLength(1);

      const event = updatedVisitor.getUncommittedEvents()[0];
      expect(event).toBeInstanceOf(VisitorNameUpdatedEvent);
    });

    it('should return same instance if name is unchanged', () => {
      // Arrange
      const visitor = Visitor.create({
        id: visitorId,
        name: visitorName,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      // Act
      const updatedVisitor = visitor.updateName(visitorName);

      // Assert
      expect(updatedVisitor).toBe(visitor); // Same instance for idempotency
    });
  });

  describe('updateTel', () => {
    it('should update telephone and emit event', () => {
      // Arrange
      const visitor = Visitor.create({
        id: visitorId,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });
      const newTel = new VisitorTel('987654321');

      // Act
      const updatedVisitor = visitor.updateTel(newTel);

      // Assert
      expect(updatedVisitor).not.toBe(visitor); // Immutability
      expect(updatedVisitor.tel.get()).toBe(newTel);
      expect(updatedVisitor.getUncommittedEvents()).toHaveLength(1);

      const event = updatedVisitor.getUncommittedEvents()[0];
      expect(event).toBeInstanceOf(VisitorTelUpdatedEvent);
    });

    it('should return same instance if tel is unchanged', () => {
      // Arrange
      const visitor = Visitor.create({
        id: visitorId,
        tel: visitorTel,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      // Act
      const updatedVisitor = visitor.updateTel(visitorTel);

      // Assert
      expect(updatedVisitor).toBe(visitor); // Same instance for idempotency
    });
  });

  describe('getters', () => {
    it('should return correct name when present', () => {
      const visitor = Visitor.create({
        id: visitorId,
        name: visitorName,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      expect(visitor.name.isPresent()).toBe(true);
      expect(visitor.name.get()).toBe(visitorName);
    });

    it('should return empty optional when name is not present', () => {
      const visitor = Visitor.create({
        id: visitorId,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      expect(visitor.name.isPresent()).toBe(false);
    });

    it('should return correct email when present', () => {
      const visitor = Visitor.create({
        id: visitorId,
        email: visitorEmail,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      expect(visitor.email.isPresent()).toBe(true);
      expect(visitor.email.get()).toBe(visitorEmail);
    });

    it('should return empty optional when email is not present', () => {
      const visitor = Visitor.create({
        id: visitorId,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      expect(visitor.email.isPresent()).toBe(false);
    });

    it('should return correct tel when present', () => {
      const visitor = Visitor.create({
        id: visitorId,
        tel: visitorTel,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      expect(visitor.tel.isPresent()).toBe(true);
      expect(visitor.tel.get()).toBe(visitorTel);
    });

    it('should return empty optional when tel is not present', () => {
      const visitor = Visitor.create({
        id: visitorId,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      expect(visitor.tel.isPresent()).toBe(false);
    });

    it('should return correct current page when present', () => {
      const visitor = Visitor.create({
        id: visitorId,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });
      const page = new VisitorCurrentPage('/test');
      const updatedVisitor = visitor.updateCurrentPage(page);

      expect(updatedVisitor.currentPage.isPresent()).toBe(true);
      expect(updatedVisitor.currentPage.get()).toBe(page);
    });

    it('should return empty optional when current page is not present', () => {
      const visitor = Visitor.create({
        id: visitorId,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      expect(visitor.currentPage.isPresent()).toBe(false);
    });
  });

  describe('toPrimitives', () => {
    it('should convert to primitives with all fields', () => {
      const visitor = Visitor.create({
        id: visitorId,
        name: visitorName,
        email: visitorEmail,
        tel: visitorTel,
        tags: visitorTags,
        notes: visitorNotes,
      });

      const primitives = visitor.toPrimitives();

      expect(primitives.id).toBe(visitorId.value);
      expect(primitives.name).toBe(visitorName.value);
      expect(primitives.email).toBe(visitorEmail.value);
      expect(primitives.tel).toBe(visitorTel.value);
      expect(primitives.tags).toEqual(visitorTags.toPrimitives());
      expect(primitives.notes).toEqual(visitorNotes.toPrimitives());
      expect(primitives.currentPage).toBeNull();
    });

    it('should convert to primitives with optional fields as null', () => {
      const visitor = Visitor.create({
        id: visitorId,
        tags: new VisitorTags([]),
        notes: new VisitorNotes([]),
      });

      const primitives = visitor.toPrimitives();

      expect(primitives.id).toBe(visitorId.value);
      expect(primitives.name).toBeNull();
      expect(primitives.email).toBeNull();
      expect(primitives.tel).toBeNull();
      expect(primitives.tags).toEqual([]);
      expect(primitives.notes).toEqual([]);
      expect(primitives.currentPage).toBeNull();
    });
  });
});
