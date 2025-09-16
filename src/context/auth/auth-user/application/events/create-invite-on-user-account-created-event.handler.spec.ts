// Prueba unitaria para CreateInviteOnUserAccountCreatedEventHandler
// Ubicación: src/context/auth/auth-user/application/events/create-invite-on-user-account-created-event.handler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserAccountCreatedEvent } from '../../domain/events/user-account-created-event';
import { INVITE_REPOSITORY } from '../../domain/invite.repository';
import { Invite } from '../../domain/invite.aggregate';
import { CreateInviteOnUserAccountCreatedEventHandler } from './create-invite-on-user-account-created-event.handler';
import { EMAIL_SENDER_SERVICE } from 'src/context/shared/domain/email/email-sender.service';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

// Mock del repositorio tipado
const inviteRepositoryMock: {
  save: jest.MockedFunction<(invite: Invite) => Promise<any>>;
} = {
  save: jest.fn(),
};

const emailSenderServiceMock = {
  sendEmail: jest.fn(),
};

describe('CreateInviteOnUserAccountCreatedEventHandler', () => {
  let handler: CreateInviteOnUserAccountCreatedEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateInviteOnUserAccountCreatedEventHandler,
        {
          provide: INVITE_REPOSITORY,
          useValue: inviteRepositoryMock,
        },
        {
          provide: EMAIL_SENDER_SERVICE,
          useValue: emailSenderServiceMock,
        },
      ],
    }).compile();

    handler = module.get(CreateInviteOnUserAccountCreatedEventHandler);
    inviteRepositoryMock.save.mockReset();
    emailSenderServiceMock.sendEmail.mockReset();
  });

  it('debe crear y guardar una invitación y enviar email si el usuario no tiene contraseña', async () => {
    const userId = Uuid.random().value;
    const event = new UserAccountCreatedEvent({
      user: {
        id: userId,
        email: 'user@test.com',
        name: 'Test User',
        password: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        roles: ['admin'],
        companyId: Uuid.random().value,
        isActive: true,
      },
    });
    inviteRepositoryMock.save.mockResolvedValue({ isOk: () => true });

    await handler.handle(event);

    expect(inviteRepositoryMock.save).toHaveBeenCalledTimes(1);
    const inviteArg = inviteRepositoryMock.save.mock.calls[0][0];
    expect(inviteArg).toBeInstanceOf(Invite);
    expect(inviteArg.email.value).toBe('user@test.com');
    expect(inviteArg.token.value).toHaveLength(43);

    expect(emailSenderServiceMock.sendEmail).toHaveBeenCalledTimes(1);
    const emailParams = emailSenderServiceMock.sendEmail.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(emailParams.to).toBe('user@test.com');
    expect(emailParams.subject).toContain('Invitación');
    expect(emailParams.html).toContain(inviteArg.token.value);
  });

  it('no debe crear invitación ni enviar email si el usuario ya tiene contraseña', async () => {
    const userId = Uuid.random().value;
    const event = new UserAccountCreatedEvent({
      user: {
        id: userId,
        email: 'user@test.com',
        name: 'Test User',
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        roles: ['admin'],
        companyId: Uuid.random().value,
        isActive: true,
      },
    });

    await handler.handle(event);
    expect(inviteRepositoryMock.save).not.toHaveBeenCalled();
    expect(emailSenderServiceMock.sendEmail).not.toHaveBeenCalled();
  });
});
