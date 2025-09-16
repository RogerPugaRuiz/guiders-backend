import { Visitor } from '../visitor.aggregate';
import { VisitorId } from '../value-objects/visitor-id';
import { VisitorName } from '../value-objects/visitor-name';
import { VisitorEmail } from '../value-objects/visitor-email';
import { VisitorTel } from '../value-objects/visitor-tel';
import { VisitorTags } from '../value-objects/visitor-tags';
import { VisitorTag } from '../value-objects/visitor-tag';
import { VisitorCreatedEvent } from '../events/visitor-created-event';
import { VisitorAliasAssignedEvent } from '../events/visitor-alias-assigned-event';
import { VisitorEmailUpdatedEvent } from '../events/visitor-email-updated-event';
import { VisitorNameUpdatedEvent } from '../events/visitor-name-updated-event';
import { VisitorTelUpdatedEvent } from '../events/visitor-tel-updated-event';

describe('Visitor', () => {
  const id = new VisitorId('12345678-1234-4234-9234-123456789abc');
  const name = new VisitorName('John Doe');
  const email = new VisitorEmail('john@example.com');
  const tel = new VisitorTel('123456789');
  const tags = new VisitorTags([new VisitorTag('VIP')]);

  describe('create', () => {
    it('crea visitor con todos los campos y emite eventos correctos', () => {
      const visitor = Visitor.create({ id, name, email, tel, tags });
      expect(visitor.id).toBe(id);
      expect(visitor.name.get()).toBe(name);
      expect(visitor.email.get()).toBe(email);
      expect(visitor.tel.get()).toBe(tel);
      expect(visitor.tags).toBe(tags);

      const events = visitor.getUncommittedEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(VisitorCreatedEvent);
      expect(events[1]).toBeInstanceOf(VisitorAliasAssignedEvent);
    });

    it('crea visitor mínimo y solo emite VisitorCreatedEvent', () => {
      const visitor = Visitor.create({ id, tags: new VisitorTags([]) });
      expect(visitor.id).toBe(id);
      expect(visitor.name.isPresent()).toBe(false);
      expect(visitor.email.isPresent()).toBe(false);
      expect(visitor.tel.isPresent()).toBe(false);
      expect(visitor.tags.value).toHaveLength(0);

      const events = visitor.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(VisitorCreatedEvent);
    });
  });

  describe('updateEmail', () => {
    it('actualiza email y emite evento', () => {
      const visitor = Visitor.create({ id, tags: new VisitorTags([]) });
      const newEmail = new VisitorEmail('new@example.com');
      const updated = visitor.updateEmail(newEmail);
      expect(updated).not.toBe(visitor);
      expect(updated.email.get()).toBe(newEmail);
      expect(updated.getUncommittedEvents()).toHaveLength(1);
      expect(updated.getUncommittedEvents()[0]).toBeInstanceOf(
        VisitorEmailUpdatedEvent,
      );
    });

    it('no cambia si email es igual', () => {
      const visitor = Visitor.create({ id, email, tags: new VisitorTags([]) });
      const updated = visitor.updateEmail(email);
      expect(updated).toBe(visitor);
    });
  });

  describe('updateName', () => {
    it('actualiza name y emite evento', () => {
      const visitor = Visitor.create({ id, tags: new VisitorTags([]) });
      const newName = new VisitorName('Jane Doe');
      const updated = visitor.updateName(newName);
      expect(updated).not.toBe(visitor);
      expect(updated.name.get()).toBe(newName);
      expect(updated.getUncommittedEvents()).toHaveLength(1);
      expect(updated.getUncommittedEvents()[0]).toBeInstanceOf(
        VisitorNameUpdatedEvent,
      );
    });

    it('no cambia si name es igual', () => {
      const visitor = Visitor.create({ id, name, tags: new VisitorTags([]) });
      const updated = visitor.updateName(name);
      expect(updated).toBe(visitor);
    });
  });

  describe('updateTel', () => {
    it('actualiza tel y emite evento', () => {
      const visitor = Visitor.create({ id, tags: new VisitorTags([]) });
      const newTel = new VisitorTel('987654321');
      const updated = visitor.updateTel(newTel);
      expect(updated).not.toBe(visitor);
      expect(updated.tel.get()).toBe(newTel);
      expect(updated.getUncommittedEvents()).toHaveLength(1);
      expect(updated.getUncommittedEvents()[0]).toBeInstanceOf(
        VisitorTelUpdatedEvent,
      );
    });

    it('no cambia si tel es igual', () => {
      const visitor = Visitor.create({ id, tel, tags });
      const updated = visitor.updateTel(tel);
      expect(updated).toBe(visitor);
    });
  });

  describe('toPrimitives', () => {
    it('serializa con todos los campos', () => {
      const visitor = Visitor.create({ id, name, email, tel, tags });
      const primitives = visitor.toPrimitives();
      expect(primitives).toEqual({
        id: id.value,
        name: name.value,
        email: email.value,
        tel: tel.value,
        tags: tags.toPrimitives(),
      });
    });

    it('serializa con campos opcionales null', () => {
      const visitor = Visitor.create({ id, tags: new VisitorTags([]) });
      const primitives = visitor.toPrimitives();
      expect(primitives).toEqual({
        id: id.value,
        name: null,
        email: null,
        tel: null,
        tags: [],
      });
    });
  });
});
