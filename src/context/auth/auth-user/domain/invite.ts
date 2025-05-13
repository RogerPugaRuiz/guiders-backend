import { AggregateRoot } from '@nestjs/cqrs';
import { InviteToken } from './value-objects/invite-token';
import { InviteExpiration } from './value-objects/invite-expiration';
import { InviteId } from './value-objects/invite-id';
import { UserId } from './value-objects/user-id';
import { InviteEmail } from './value-objects/invite-email';
import { InviteCreatedEvent } from './events/invite-created-event';

// Interfaz para serializar la entidad a primitivos
export interface InvitePrimitives {
  id: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: string;
}

export interface InviteProperties {
  id: InviteId;
  userId: UserId;
  email: InviteEmail;
  token: InviteToken;
  expiresAt: InviteExpiration;
}

// Entidad Invite como AggregateRoot siguiendo DDD
export class Invite extends AggregateRoot {
  private constructor(
    private readonly _id: InviteId,
    private readonly _userId: UserId,
    private readonly _email: InviteEmail,
    private readonly _token: InviteToken,
    private readonly _expiresAt: InviteExpiration,
  ) {
    super();
  }

  // Método de fábrica para crear una invitación
  public static create(props: InviteProperties): Invite {
    const invite = new Invite(
      props.id,
      props.userId,
      props.email,
      props.token,
      props.expiresAt,
    );
    // Aplica el evento de dominio al crear la invitación
    invite.apply(
      new InviteCreatedEvent({
        inviteId: invite.id.value,
        userId: invite.userId.value,
        email: invite.email.value,
        token: invite.token.value,
        expiresAt: invite.expiresAt.value,
      }),
    );
    return invite;
  }

  // Método de fábrica para reconstruir desde datos primitivos
  public static fromPrimitives(params: InvitePrimitives): Invite {
    return new Invite(
      new InviteId(params.id),
      new UserId(params.userId),
      new InviteEmail(params.email),
      new InviteToken(params.token),
      new InviteExpiration(params.expiresAt),
    );
  }

  // Serializa la entidad a un objeto plano
  public toPrimitives(): InvitePrimitives {
    return {
      id: this._id.value,
      userId: this._userId.value,
      email: this._email.value,
      token: this._token.value,
      expiresAt: this._expiresAt.value,
    };
  }

  // Getters de solo lectura
  get id(): InviteId {
    return this._id;
  }
  get userId(): UserId {
    return this._userId;
  }
  get email(): InviteEmail {
    return this._email;
  }
  get token(): InviteToken {
    return this._token;
  }
  get expiresAt(): InviteExpiration {
    return this._expiresAt;
  }
}
