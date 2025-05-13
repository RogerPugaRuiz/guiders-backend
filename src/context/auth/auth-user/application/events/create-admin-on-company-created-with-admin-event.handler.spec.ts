import { Test, TestingModule } from '@nestjs/testing';
import { CreateAdminOnCompanyCreatedWithAdminEventHandler } from './create-admin-on-company-created-with-admin-event.handler';
import { CompanyCreatedWithAdminEvent } from 'src/context/company/domain/events/company-created-with-admin.event';
import { USER_ACCOUNT_REPOSITORY } from '../../domain/user-account.repository';
import { UserAccountEmail } from '../../domain/user-account-email';
import { UserAccountRoles } from '../../domain/value-objects/user-account-roles';
import { Role } from '../../domain/value-objects/role';
import { UserAccount } from '../../domain/user-account';

// Mock del repositorio tipado
const userRepositoryMock: {
  save: jest.MockedFunction<(user: UserAccount) => void>;
} = {
  save: jest.fn(),
};

describe('CreateAdminOnCompanyCreatedWithAdminEventHandler', () => {
  let handler: CreateAdminOnCompanyCreatedWithAdminEventHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAdminOnCompanyCreatedWithAdminEventHandler,
        {
          provide: USER_ACCOUNT_REPOSITORY,
          useValue: userRepositoryMock,
        },
      ],
    }).compile();

    handler = module.get(CreateAdminOnCompanyCreatedWithAdminEventHandler);
    userRepositoryMock.save.mockReset();
  });

  it('debe crear un usuario admin cuando el evento tiene adminEmail', async () => {
    const event = new CompanyCreatedWithAdminEvent({
      companyId: 'company-uuid',
      companyName: 'Test Company',
      domain: 'test.com',
      adminName: 'Admin User',
      adminEmail: 'admin@email.com',
      adminTel: '123456789',
      createdAt: new Date().toISOString(),
    });
    await handler.handle(event);
    // Acceso seguro al usuario guardado
    const userSaved = userRepositoryMock.save.mock.calls[0][0];
    expect(userSaved).toBeInstanceOf(UserAccount);
    expect(userSaved.email).toBeInstanceOf(UserAccountEmail);
    expect(userSaved.roles).toBeInstanceOf(UserAccountRoles);
    // Verifica que el rol sea admin usando el método getRoles()
    const roles = userSaved.roles.getRoles();
    expect(roles[0].value).toBe(Role.admin().value);
  });

  it('no debe crear usuario si no hay adminEmail', async () => {
    const event = new CompanyCreatedWithAdminEvent({
      companyId: 'company-uuid',
      companyName: 'Test Company',
      domain: 'test.com',
      adminName: 'Admin User',
      adminEmail: null, // null explícito para cumplir con el tipo
      adminTel: '123456789',
      createdAt: new Date().toISOString(),
    });
    await handler.handle(event);
    expect(userRepositoryMock.save).not.toHaveBeenCalled();
  });
});
