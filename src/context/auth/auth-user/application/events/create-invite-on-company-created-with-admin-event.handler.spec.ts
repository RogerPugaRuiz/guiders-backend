// Prueba unitaria para CreateInviteOnCompanyCreatedWithAdminEventHandler
// Ubicación: src/context/auth/auth-user/application/events/create-invite-on-company-created-with-admin-event.handler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CompanyCreatedWithAdminEvent } from 'src/context/company/domain/events/company-created-with-admin.event';
import { INVITE_REPOSITORY } from '../../domain/invite.repository';
import { Invite } from '../../domain/invite';
import { CreateInviteOnCompanyCreatedWithAdminEventHandler } from '../events/create-invite-on-company-created-with-admin-event.handler';

// Mock del repositorio tipado
const inviteRepositoryMock: {
  save: jest.MockedFunction<(invite: Invite) => Promise<any>>;
} = {
  save: jest.fn(),
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
      ],
    }).compile();

    handler = module.get(CreateInviteOnCompanyCreatedWithAdminEventHandler);
    inviteRepositoryMock.save.mockReset();
  });

  it('debe crear y guardar una invitación válida para el admin', async () => {
    const event = new CompanyCreatedWithAdminEvent({
      companyId: 'company-uuid',
      companyName: 'Test Company',
      domain: 'test.com',
      adminName: 'Admin',
      adminEmail: 'admin@test.com',
      adminTel: null,
      createdAt: new Date().toISOString(),
    });

    inviteRepositoryMock.save.mockResolvedValue({ isOk: () => true });

    await handler.handle(event);

    // Verifica que se haya llamado a save con una instancia de Invite
    expect(inviteRepositoryMock.save).toHaveBeenCalledTimes(1);
    const inviteArg = inviteRepositoryMock.save.mock.calls[0][0];
    expect(inviteArg).toBeInstanceOf(Invite);
    expect(inviteArg.email.value).toBe('admin@test.com');
    expect(inviteArg.token.value).toHaveLength(43);
  });

  it('no debe crear invitación si no hay adminEmail', async () => {
    const event = new CompanyCreatedWithAdminEvent({
      companyId: 'company-uuid',
      companyName: 'Test Company',
      domain: 'test.com',
      adminName: 'Admin',
      adminEmail: null,
      adminTel: null,
      createdAt: new Date().toISOString(),
    });

    await handler.handle(event);
    expect(inviteRepositoryMock.save).not.toHaveBeenCalled();
  });
});
