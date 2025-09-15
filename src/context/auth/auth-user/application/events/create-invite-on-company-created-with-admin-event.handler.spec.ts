// Prueba unitaria para CreateInviteOnCompanyCreatedWithAdminEventHandler
// Ubicación: src/context/auth/auth-user/application/events/create-invite-on-company-created-with-admin-event.handler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CompanyCreatedWithAdminEvent } from 'src/context/company/domain/events/company-created-with-admin.event';
import { INVITE_REPOSITORY } from '../../domain/invite.repository';
import { Invite } from '../../domain/invite';
import { CreateInviteOnCompanyCreatedWithAdminEventHandler } from '../events/create-invite-on-company-created-with-admin-event.handler';
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

describe('CreateInviteOnCompanyCreatedWithAdminEventHandler', () => {
  let handler: CreateInviteOnCompanyCreatedWithAdminEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateInviteOnCompanyCreatedWithAdminEventHandler,
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

    handler = module.get(CreateInviteOnCompanyCreatedWithAdminEventHandler);
    inviteRepositoryMock.save.mockReset();
    emailSenderServiceMock.sendEmail.mockReset();
  });

  it('debe crear y guardar una invitación válida para el admin', async () => {
    // Usar Uuid del dominio para generar un UUID válido
    const userId = Uuid.random().value;
    const event = new CompanyCreatedWithAdminEvent({
      companyId: Uuid.random().value,
      companyName: 'Test Company',
      sites: [
        {
          id: Uuid.random().value,
          name: 'Principal',
          canonicalDomain: 'test.com',
          domainAliases: [],
        },
      ],
      adminName: 'Admin',
      adminEmail: 'admin@test.com',
      adminTel: null,
      createdAt: new Date().toISOString(),
      userId,
    });

    inviteRepositoryMock.save.mockResolvedValue({ isOk: () => true });

    await handler.handle(event);

    // Verifica que se haya llamado a save con una instancia de Invite
    expect(inviteRepositoryMock.save).toHaveBeenCalledTimes(1);
    const inviteArg = inviteRepositoryMock.save.mock.calls[0][0];
    expect(inviteArg).toBeInstanceOf(Invite);
    expect(inviteArg.email.value).toBe('admin@test.com');
    expect(inviteArg.token.value).toHaveLength(43);

    // Verifica que se haya enviado el email correctamente
    expect(emailSenderServiceMock.sendEmail).toHaveBeenCalledTimes(1);

    const emailParams = emailSenderServiceMock.sendEmail.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(emailParams.to).toBe('admin@test.com');
    expect(emailParams.subject).toContain('Invitación');
    expect(emailParams.html).toContain(inviteArg.token.value);
  });

  it('no debe crear invitación si no hay adminEmail', async () => {
    // Usar Uuid del dominio para generar un UUID válido
    const userId = Uuid.random().value;
    const event = new CompanyCreatedWithAdminEvent({
      companyId: Uuid.random().value,
      companyName: 'Test Company',
      sites: [
        {
          id: Uuid.random().value,
          name: 'Principal',
          canonicalDomain: 'test.com',
          domainAliases: [],
        },
      ],
      adminName: 'Admin',
      adminEmail: null,
      adminTel: null,
      createdAt: new Date().toISOString(),
      userId,
    });

    await handler.handle(event);
    expect(inviteRepositoryMock.save).not.toHaveBeenCalled();
  });
});
