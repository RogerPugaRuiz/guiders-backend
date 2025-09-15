import { Test, TestingModule } from '@nestjs/testing';
import { CreateAdminOnCompanyCreatedWithAdminEventHandler } from './create-admin-on-company-created-with-admin-event.handler';
import { CompanyCreatedWithAdminEvent } from 'src/context/company/domain/events/company-created-with-admin.event';
import { USER_ACCOUNT_REPOSITORY } from '../../domain/user-account.repository';
import { Role } from '../../domain/value-objects/role';
import { UserAccount } from '../../domain/user-account';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';
import { EventPublisher } from '@nestjs/cqrs';

describe('CreateAdminOnCompanyCreatedWithAdminEventHandler', () => {
  let handler: CreateAdminOnCompanyCreatedWithAdminEventHandler;
  let userRepositoryMock: { save: jest.Mock };
  let publisherMock: { mergeObjectContext: jest.Mock };

  beforeEach(async () => {
    userRepositoryMock = { save: jest.fn() };
    publisherMock = {
      mergeObjectContext: jest.fn((user: UserAccount) => {
        user.commit = jest.fn();
        return user;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAdminOnCompanyCreatedWithAdminEventHandler,
        { provide: USER_ACCOUNT_REPOSITORY, useValue: userRepositoryMock },
        { provide: EventPublisher, useValue: publisherMock }, // Mock explícito
      ],
    }).compile();

    handler = module.get(CreateAdminOnCompanyCreatedWithAdminEventHandler);
    userRepositoryMock.save.mockReset();
  });

  it('debe crear un usuario admin cuando el evento tiene adminEmail', async () => {
    const event = new CompanyCreatedWithAdminEvent({
      companyId: Uuid.random().value, // Usa un UUID válido
      companyName: 'Test Company',
      sites: [
        {
          id: Uuid.random().value,
          name: 'Principal',
          canonicalDomain: 'test.com',
          domainAliases: [],
        },
      ],
      adminName: 'Admin User',
      adminEmail: 'admin@email.com',
      adminTel: '123456789',
      createdAt: new Date().toISOString(),
      userId: Uuid.random().value,
    });
    await handler.handle(event);
    // Validación defensiva: aseguramos que el usuario fue guardado
    expect(userRepositoryMock.save).toHaveBeenCalled();
    const userSaved = userRepositoryMock.save.mock.calls[0]?.[0];
    expect(userSaved).toBeDefined();
    // Si el usuario es undefined, fallar explícitamente con mensaje útil
    if (!userSaved)
      throw new Error('userSaved es undefined. Revisa el handler y el mock.');
    // Validamos que el email y roles sean correctos usando los getters
    expect(typeof userSaved.email).toBe('object');
    expect(userSaved.email.value).toBe('admin@email.com');
    expect(typeof userSaved.roles.getRoles).toBe('function');
    const roles = userSaved.roles.getRoles();
    expect(Array.isArray(roles)).toBe(true);
    expect(roles[0]?.value).toBe(Role.admin().value);
  });

  it('no debe crear usuario si no hay adminEmail', async () => {
    const event = new CompanyCreatedWithAdminEvent({
      companyId: 'company-uuid',
      companyName: 'Test Company',
      sites: [
        {
          id: Uuid.random().value,
          name: 'Principal',
          canonicalDomain: 'test.com',
          domainAliases: [],
        },
      ],
      adminName: 'Admin User',
      adminEmail: null, // null explícito para cumplir con el tipo
      adminTel: '123456789',
      createdAt: new Date().toISOString(),
      userId: Uuid.random().value,
    });
    await handler.handle(event);
    expect(userRepositoryMock.save).not.toHaveBeenCalled();
  });
});
