import { Optional } from 'src/context/shared/domain/optional';
import { Participant } from './value-objects/participant';
import { ValidationError } from 'src/context/shared/domain/validation.error';

export class Participants {
  private _participants: Participant[];

  public get value(): Participant[] {
    return this._participants;
  }

  constructor(participants?: Participant[]) {
    if (!participants) {
      this._participants = [];
      return;
    }
    if (!Array.isArray(participants)) {
      throw new ValidationError('Participants must be an array');
    }
    if (participants.length === 0) {
      throw new ValidationError('Participants cannot be empty');
    }
    if (
      participants.some((participant) => !(participant instanceof Participant))
    ) {
      throw new ValidationError(
        'Participants must be an array of Participant objects',
      );
    }
    this._participants = participants;
  }

  public static create(
    participants: {
      id: string;
      name: string;
      isCommercial: boolean;
      isVisitor: boolean;
      isOnline?: boolean;
      assignedAt?: Date;
      lastSeenAt?: Date | null;
      isViewing?: boolean;
      isTyping?: boolean;
      isAnonymous?: boolean;
    }[],
  ): Participants {
    const participantObjects = participants.map((participant) =>
      Participant.create(participant),
    );
    return new Participants(participantObjects);
  }

  public addParticipant(
    id: string,
    name: string,
    isCommercial: boolean,
    isVisitor: boolean,
  ): void {
    const participant = Participant.create({
      id,
      name,
      isCommercial,
      isVisitor,
    });
    this._participants.push(participant);
  }

  public removeParticipant(id: string): void {
    this._participants = this._participants.filter(
      (participant) => participant.id !== id,
    );
  }

  public getParticipant(id: string): Optional<Participant> {
    return Optional.ofNullable(
      this._participants.find((participant) => participant.id === id),
    );
  }

  public setSeenAt(id: string, lastSeenAt: Date): void {
    const participantOptional = this.getParticipant(id);
    if (participantOptional.isEmpty()) {
      throw new Error(`Participant with id ${id} not found`);
    }
    const participant = participantOptional.get();
    const updatedParticipant = participant.setSeenAt(lastSeenAt);
    this._participants = this._participants.map((p) =>
      p.id === id ? updatedParticipant : p,
    );
  }

  public setUnseenAt(id: string, lastSeenAt: Date): void {
    const participantOptional = this.getParticipant(id);
    if (participantOptional.isEmpty()) {
      throw new Error(`Participant with id ${id} not found`);
    }
    const participant = participantOptional.get();
    const updatedParticipant = participant.setUnseenAt(lastSeenAt);
    this._participants = this._participants.map((p) =>
      p.id === id ? updatedParticipant : p,
    );
  }
  public setTyping(id: string, isTyping: boolean): void {
    const participantOptional = this.getParticipant(id);
    if (participantOptional.isEmpty()) {
      throw new Error(`Participant with id ${id} not found`);
    }
    const participant = participantOptional.get();
    const updatedParticipant = participant.setTyping(isTyping);
    this._participants = this._participants.map((p) =>
      p.id === id ? updatedParticipant : p,
    );
  }
  public setViewing(id: string, isViewing: boolean): void {
    const participantOptional = this.getParticipant(id);
    if (participantOptional.isEmpty()) {
      throw new Error(`Participant with id ${id} not found`);
    }
    const participant = participantOptional.get();
    const updatedParticipant = participant.setViewing(isViewing);
    this._participants = this._participants.map((p) =>
      p.id === id ? updatedParticipant : p,
    );
  }

  public setOnline(id: string, isOnline: boolean): void {
    const participantOptional = this.getParticipant(id);
    if (participantOptional.isEmpty()) {
      throw new Error(`Participant with id ${id} not found`);
    }
    const participant = participantOptional.get();
    const updatedParticipant = participant.setOnline(isOnline);
    this._participants = this._participants.map((p) =>
      p.id === id ? updatedParticipant : p,
    );
  }

  public setAnonymous(id: string, isAnonymous: boolean): void {
    const participantOptional = this.getParticipant(id);
    if (participantOptional.isEmpty()) {
      throw new Error(`Participant with id ${id} not found`);
    }
    const participant = participantOptional.get();
    const updatedParticipant = participant.setAnonymous(isAnonymous);
    this._participants = this._participants.map((p) =>
      p.id === id ? updatedParticipant : p,
    );
  }

  public updateParticipant(updatedParticipant: Participant): void {
    const index = this._participants.findIndex(
      (participant) => participant.id === updatedParticipant.id,
    );
    if (index === -1) {
      throw new Error(`Participant with id ${updatedParticipant.id} not found`);
    }
    this._participants[index] = updatedParticipant;
  }

  public hasParticipant(id: string): boolean {
    return this._participants.some((participant) => participant.id === id);
  }

  /**
   * Actualiza el nombre de un participante específico
   * @param id ID del participante
   * @param newName Nuevo nombre del participante
   */
  public updateParticipantName(id: string, newName: string): void {
    const participantOptional = this.getParticipant(id);
    if (participantOptional.isEmpty()) {
      throw new Error(`Participant with id ${id} not found`);
    }
    const participant = participantOptional.get();
    const updatedParticipant = new Participant(
      participant.id,
      newName,
      participant.isCommercial,
      participant.isVisitor,
      participant.isOnline,
      participant.assignedAt,
      participant.lastSeenAt,
      participant.isViewing,
      participant.isTyping,
      participant.isAnonymous,
    );
    this._participants = this._participants.map((p) =>
      p.id === id ? updatedParticipant : p,
    );
  }
}
