import { Participant } from '../value-objects/participant';
import { Participants } from '../participants';

describe('Participant Anonymity Feature', () => {
  describe('Participant creation', () => {
    it('should create participant with default anonymous value true', () => {
      // Crear participante sin especificar isAnonymous
      const participant = Participant.create({
        id: 'visitor-1',
        name: 'Anonymous Visitor',
        isCommercial: false,
        isVisitor: true,
      });

      expect(participant.isAnonymous).toBe(true);
    });

    it('should create participant with explicit anonymous value false', () => {
      // Crear participante con isAnonymous explícitamente false
      const participant = Participant.create({
        id: 'commercial-1',
        name: 'Known Commercial',
        isCommercial: true,
        isVisitor: false,
        isAnonymous: false,
      });

      expect(participant.isAnonymous).toBe(false);
    });

    it('should create participant with explicit anonymous value true', () => {
      // Crear participante con isAnonymous explícitamente true
      const participant = Participant.create({
        id: 'visitor-2',
        name: 'Explicit Anonymous Visitor',
        isCommercial: false,
        isVisitor: true,
        isAnonymous: true,
      });

      expect(participant.isAnonymous).toBe(true);
    });
  });

  describe('Participant anonymity updates', () => {
    it('should update participant anonymity status', () => {
      // Crear participante anónimo por defecto
      const anonymousParticipant = Participant.create({
        id: 'visitor-1',
        name: 'Visitor',
        isCommercial: false,
        isVisitor: true,
      });

      expect(anonymousParticipant.isAnonymous).toBe(true);

      // Cambiar a no anónimo
      const namedParticipant = anonymousParticipant.setAnonymous(false);
      expect(namedParticipant.isAnonymous).toBe(false);

      // Verificar que los otros campos se preservan
      expect(namedParticipant.id).toBe(anonymousParticipant.id);
      expect(namedParticipant.name).toBe(anonymousParticipant.name);
      expect(namedParticipant.isCommercial).toBe(
        anonymousParticipant.isCommercial,
      );
      expect(namedParticipant.isVisitor).toBe(anonymousParticipant.isVisitor);
    });

    it('should maintain anonymity status through other updates', () => {
      // Crear participante no anónimo
      const participant = Participant.create({
        id: 'commercial-1',
        name: 'Known Commercial',
        isCommercial: true,
        isVisitor: false,
        isAnonymous: false,
      });

      // Actualizar estado online
      const onlineParticipant = participant.setOnline(true);
      expect(onlineParticipant.isAnonymous).toBe(false);

      // Actualizar estado de escritura
      const typingParticipant = onlineParticipant.setTyping(true);
      expect(typingParticipant.isAnonymous).toBe(false);

      // Actualizar estado de visualización
      const viewingParticipant = typingParticipant.setViewing(true);
      expect(viewingParticipant.isAnonymous).toBe(false);
    });
  });

  describe('Participants collection anonymity management', () => {
    it('should handle anonymity in participants collection', () => {
      const participantsData = [
        {
          id: 'visitor-1',
          name: 'Anonymous Visitor',
          isCommercial: false,
          isVisitor: true,
          isAnonymous: true,
        },
        {
          id: 'commercial-1',
          name: 'Known Commercial',
          isCommercial: true,
          isVisitor: false,
          isAnonymous: false,
        },
      ];

      const participants = Participants.create(participantsData);

      expect(participants.value).toHaveLength(2);
      expect(participants.value[0].isAnonymous).toBe(true);
      expect(participants.value[1].isAnonymous).toBe(false);
    });

    it('should update participant anonymity through collection', () => {
      const participants = Participants.create([
        {
          id: 'visitor-1',
          name: 'Visitor',
          isCommercial: false,
          isVisitor: true,
          isAnonymous: true,
        },
      ]);

      // Cambiar anonimato a través de la colección
      participants.setAnonymous('visitor-1', false);

      const updatedParticipant = participants.getParticipant('visitor-1').get();
      expect(updatedParticipant.isAnonymous).toBe(false);
    });

    it('should throw error when trying to set anonymity for non-existing participant', () => {
      const participants = Participants.create([
        {
          id: 'visitor-1',
          name: 'Visitor',
          isCommercial: false,
          isVisitor: true,
        },
      ]);

      expect(() => {
        participants.setAnonymous('non-existing-id', false);
      }).toThrow('Participant with id non-existing-id not found');
    });
  });

  describe('Business logic scenarios', () => {
    it('should demonstrate typical visitor anonymity flow', () => {
      // Escenario: Un visitante se conecta anónimamente
      const anonymousVisitor = Participant.create({
        id: 'visitor-new',
        name: 'Anonymous User',
        isCommercial: false,
        isVisitor: true,
      });

      // Por defecto es anónimo
      expect(anonymousVisitor.isAnonymous).toBe(true);

      // El visitante decide darse a conocer
      const identifiedVisitor = anonymousVisitor.setAnonymous(false);
      expect(identifiedVisitor.isAnonymous).toBe(false);

      // Luego decide volver al anonimato
      const backToAnonymous = identifiedVisitor.setAnonymous(true);
      expect(backToAnonymous.isAnonymous).toBe(true);
    });

    it('should demonstrate commercial participant always identified', () => {
      // Escenario: Un comercial siempre debe estar identificado
      const commercial = Participant.create({
        id: 'commercial-1',
        name: 'John Doe - Commercial',
        isCommercial: true,
        isVisitor: false,
        isAnonymous: false, // Comerciales no son anónimos
      });

      expect(commercial.isAnonymous).toBe(false);
      expect(commercial.isCommercial).toBe(true);
    });
  });
});
