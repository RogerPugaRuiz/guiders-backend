import { Participants } from '../participants';
import { Participant } from '../value-objects/participant';
import { Optional } from 'src/context/shared/domain/optional';
import { ValidationError } from 'src/context/shared/domain/validation.error';

describe('Participants', () => {
  const validParticipantData = {
    id: 'visitor-1',
    name: 'Test Visitor',
    isCommercial: false,
    isVisitor: true,
    isOnline: true,
    assignedAt: new Date(),
    lastSeenAt: null,
    isViewing: false,
    isTyping: false,
    isAnonymous: true,
  };

  describe('constructor', () => {
    it('should create empty participants when no data provided', () => {
      const participants = new Participants();

      expect(participants.value).toEqual([]);
    });

    it('should create participants with valid data', () => {
      const participant = Participant.create(validParticipantData);
      const participants = new Participants([participant]);

      expect(participants.value).toHaveLength(1);
      expect(participants.value[0]).toBeInstanceOf(Participant);
    });

    it('should throw ValidationError when participants is not an array', () => {
      expect(() => {
        new Participants('not-an-array' as unknown as Participant[]);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError when participants array is empty', () => {
      expect(() => {
        new Participants([]);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError when participants contains non-Participant objects', () => {
      expect(() => {
        new Participants(['not-a-participant'] as unknown as Participant[]);
      }).toThrow(ValidationError);
    });
  });

  describe('create', () => {
    it('should create participants from primitives', () => {
      const participants = Participants.create([validParticipantData]);

      expect(participants.value).toHaveLength(1);
      expect(participants.value[0]).toBeInstanceOf(Participant);
      expect(participants.value[0].id).toBe(validParticipantData.id);
    });

    it('should create participants with multiple participants', () => {
      const commercialData = {
        ...validParticipantData,
        id: 'commercial-1',
        name: 'Test Commercial',
        isCommercial: true,
        isVisitor: false,
        isAnonymous: false,
      };

      const participants = Participants.create([
        validParticipantData,
        commercialData,
      ]);

      expect(participants.value).toHaveLength(2);
      expect(participants.value[0].isVisitor).toBe(true);
      expect(participants.value[1].isCommercial).toBe(true);
    });
  });

  describe('hasParticipant', () => {
    it('should return true when participant exists', () => {
      const participants = Participants.create([validParticipantData]);

      const result = participants.hasParticipant(validParticipantData.id);

      expect(result).toBe(true);
    });

    it('should return false when participant does not exist', () => {
      const participants = Participants.create([validParticipantData]);

      const result = participants.hasParticipant('non-existing-id');

      expect(result).toBe(false);
    });
  });

  describe('getParticipant', () => {
    it('should return participant when exists', () => {
      const participants = Participants.create([validParticipantData]);

      const result = participants.getParticipant(validParticipantData.id);

      expect(result).toBeInstanceOf(Optional);
      expect(result.isEmpty()).toBe(false);
      expect(result.get().id).toBe(validParticipantData.id);
    });

    it('should return empty optional when participant does not exist', () => {
      const participants = Participants.create([validParticipantData]);

      const result = participants.getParticipant('non-existing-id');

      expect(result).toBeInstanceOf(Optional);
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('addParticipant', () => {
    it('should add new participant successfully', () => {
      const participants = Participants.create([validParticipantData]);
      const commercialId = 'commercial-1';
      const commercialName = 'Test Commercial';

      participants.addParticipant(commercialId, commercialName, true, false);

      expect(participants.value).toHaveLength(2);
      expect(participants.hasParticipant(commercialId)).toBe(true);
      const addedParticipant = participants.getParticipant(commercialId).get();
      expect(addedParticipant.isCommercial).toBe(true);
      expect(addedParticipant.isVisitor).toBe(false);
    });

    it('should not add duplicate participants with same id', () => {
      const participants = Participants.create([validParticipantData]);

      // Intentar agregar el mismo participante dos veces
      participants.addParticipant(
        validParticipantData.id,
        validParticipantData.name,
        false,
        true,
      );

      // Debe mantenerse con solo 1 participante (no duplicar)
      expect(participants.value).toHaveLength(1);
    });

    it('should not add duplicate participant when same id already exists', () => {
      const participants = Participants.create([validParticipantData]);
      const existingId = validParticipantData.id;

      // Intentar agregar participante con ID que ya existe
      participants.addParticipant(existingId, 'Different Name', true, false);

      // No debe duplicar, debe mantener solo el original
      expect(participants.value).toHaveLength(1);
      const existingParticipant = participants.getParticipant(existingId).get();
      expect(existingParticipant.name).toBe(validParticipantData.name); // Mantiene el nombre original
    });
  });

  describe('removeParticipant', () => {
    it('should remove existing participant', () => {
      const commercialData = {
        ...validParticipantData,
        id: 'commercial-1',
        name: 'Test Commercial',
        isCommercial: true,
        isVisitor: false,
        isAnonymous: false,
      };
      const participants = Participants.create([
        validParticipantData,
        commercialData,
      ]);

      participants.removeParticipant(commercialData.id);

      expect(participants.value).toHaveLength(1);
      expect(participants.hasParticipant(commercialData.id)).toBe(false);
      expect(participants.hasParticipant(validParticipantData.id)).toBe(true);
    });

    it('should do nothing when participant does not exist', () => {
      const participants = Participants.create([validParticipantData]);

      participants.removeParticipant('non-existing-id');

      expect(participants.value).toHaveLength(1);
    });
  });

  describe('setSeenAt', () => {
    it('should update participant last seen time', () => {
      const participants = Participants.create([validParticipantData]);
      const seenAt = new Date();

      participants.setSeenAt(validParticipantData.id, seenAt);

      const participant = participants
        .getParticipant(validParticipantData.id)
        .get();
      expect(participant.lastSeenAt).toEqual(seenAt);
      expect(participant.isViewing).toBe(true);
    });

    it('should throw error when participant does not exist', () => {
      const participants = Participants.create([validParticipantData]);
      const seenAt = new Date();

      expect(() => {
        participants.setSeenAt('non-existing-id', seenAt);
      }).toThrow('Participant with id non-existing-id not found');
    });
  });

  describe('setUnseenAt', () => {
    it('should update participant unseen status', () => {
      const participants = Participants.create([validParticipantData]);
      const unseenAt = new Date();

      participants.setUnseenAt(validParticipantData.id, unseenAt);

      const participant = participants
        .getParticipant(validParticipantData.id)
        .get();
      expect(participant.lastSeenAt).toEqual(unseenAt);
      expect(participant.isViewing).toBe(false);
    });

    it('should throw error when participant does not exist', () => {
      const participants = Participants.create([validParticipantData]);
      const unseenAt = new Date();

      expect(() => {
        participants.setUnseenAt('non-existing-id', unseenAt);
      }).toThrow('Participant with id non-existing-id not found');
    });
  });

  describe('setOnline', () => {
    it('should update participant online status', () => {
      const participants = Participants.create([validParticipantData]);

      participants.setOnline(validParticipantData.id, false);

      const participant = participants
        .getParticipant(validParticipantData.id)
        .get();
      expect(participant.isOnline).toBe(false);
    });

    it('should throw error when participant does not exist', () => {
      const participants = Participants.create([validParticipantData]);

      expect(() => {
        participants.setOnline('non-existing-id', false);
      }).toThrow('Participant with id non-existing-id not found');
    });
  });

  describe('setViewing', () => {
    it('should update participant viewing status', () => {
      const participants = Participants.create([validParticipantData]);

      participants.setViewing(validParticipantData.id, true);

      const participant = participants
        .getParticipant(validParticipantData.id)
        .get();
      expect(participant.isViewing).toBe(true);
    });

    it('should throw error when participant does not exist', () => {
      const participants = Participants.create([validParticipantData]);

      expect(() => {
        participants.setViewing('non-existing-id', true);
      }).toThrow('Participant with id non-existing-id not found');
    });
  });

  describe('setAnonymous', () => {
    it('should update participant anonymous status', () => {
      const participants = Participants.create([validParticipantData]);

      participants.setAnonymous(validParticipantData.id, false);

      const participant = participants
        .getParticipant(validParticipantData.id)
        .get();
      expect(participant.isAnonymous).toBe(false);
    });

    it('should throw error when participant does not exist', () => {
      const participants = Participants.create([validParticipantData]);

      expect(() => {
        participants.setAnonymous('non-existing-id', false);
      }).toThrow('Participant with id non-existing-id not found');
    });

    it('should preserve default anonymous value as true', () => {
      const participants = Participants.create([validParticipantData]);

      const participant = participants
        .getParticipant(validParticipantData.id)
        .get();
      expect(participant.isAnonymous).toBe(true);
    });
  });

  describe('updateParticipantName', () => {
    it('should update participant name successfully', () => {
      const participants = Participants.create([validParticipantData]);
      const newName = 'Brave Lion';

      participants.updateParticipantName(validParticipantData.id, newName);

      const updatedParticipant = participants
        .getParticipant(validParticipantData.id)
        .get();
      expect(updatedParticipant.name).toBe(newName);
    });

    it('should preserve all other participant properties when updating name', () => {
      const participants = Participants.create([validParticipantData]);
      const originalParticipant = participants
        .getParticipant(validParticipantData.id)
        .get();
      const newName = 'Swift Eagle';

      participants.updateParticipantName(validParticipantData.id, newName);

      const updatedParticipant = participants
        .getParticipant(validParticipantData.id)
        .get();
      expect(updatedParticipant.name).toBe(newName);
      expect(updatedParticipant.id).toBe(originalParticipant.id);
      expect(updatedParticipant.isCommercial).toBe(
        originalParticipant.isCommercial,
      );
      expect(updatedParticipant.isVisitor).toBe(originalParticipant.isVisitor);
      expect(updatedParticipant.isOnline).toBe(originalParticipant.isOnline);
      expect(updatedParticipant.assignedAt).toBe(
        originalParticipant.assignedAt,
      );
      expect(updatedParticipant.lastSeenAt).toBe(
        originalParticipant.lastSeenAt,
      );
      expect(updatedParticipant.isViewing).toBe(originalParticipant.isViewing);
      expect(updatedParticipant.isTyping).toBe(originalParticipant.isTyping);
      expect(updatedParticipant.isAnonymous).toBe(
        originalParticipant.isAnonymous,
      );
    });

    it('should throw error when participant does not exist', () => {
      const participants = Participants.create([validParticipantData]);

      expect(() => {
        participants.updateParticipantName('non-existing-id', 'New Name');
      }).toThrow('Participant with id non-existing-id not found');
    });
  });
});
