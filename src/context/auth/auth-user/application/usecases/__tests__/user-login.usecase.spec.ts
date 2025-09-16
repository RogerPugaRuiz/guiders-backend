import { Test, TestingModule } from '@nestjs/testing';
import { UserLoginUseCase } from '../user-login.usecase';
import {
  UserPasswordHasher,
  USER_PASSWORD_HASHER,
} from '../../service/user-password-hasher';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from '../../../domain/user-account.repository';
import {
  UserTokenService,
  USER_TOKEN_SERVICE,
} from '../../service/user-token-service';
import { UnauthorizedError } from '../../errors/unauthorized.error';
import { UserAccount } from '../../../domain/user-account.aggregate';
import { UserAccountEmail } from '../../../domain/user-account-email';
import { UserAccountPassword } from '../../../domain/user-account-password';
import { UserAccountRoles } from '../../../domain/value-objects/user-account-roles';
import { Role } from '../../../domain/value-objects/role';
import { UserAccountCompanyId } from '../../../domain/value-objects/user-account-company-id';
import { UserAccountName } from '../../../domain/value-objects/user-account-name';

describe('UserLoginUseCase', () => {
  let useCase: UserLoginUseCase;
  let hasherService: jest.Mocked<UserPasswordHasher>;
  let tokenService: jest.Mocked<UserTokenService>;
  let userRepository: jest.Mocked<UserAccountRepository>;

  beforeEach(async () => {
    const hasherServiceMock = {
      compare: jest.fn(),
      hash: jest.fn(),
    };

    const tokenServiceMock = {
      generate: jest.fn(),
      verify: jest.fn(),
    };

    const userRepositoryMock = {
      findByEmail: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      existsByEmail: jest.fn(),
      findUsersWithCompanyId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLoginUseCase,
        {
          provide: USER_PASSWORD_HASHER,
          useValue: hasherServiceMock,
        },
        {
          provide: USER_TOKEN_SERVICE,
          useValue: tokenServiceMock,
        },
        {
          provide: USER_ACCOUNT_REPOSITORY,
          useValue: userRepositoryMock,
        },
      ],
    }).compile();

    useCase = module.get<UserLoginUseCase>(UserLoginUseCase);
    hasherService = module.get(USER_PASSWORD_HASHER);
    tokenService = module.get(USER_TOKEN_SERVICE);
    userRepository = module.get(USER_ACCOUNT_REPOSITORY);
  });

  describe('execute', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = 'HashedPassword123!';

    const mockUser = UserAccount.create({
      email: new UserAccountEmail(email),
      name: new UserAccountName('Test User'),
      password: new UserAccountPassword(hashedPassword),
      roles: new UserAccountRoles([new Role('admin')]),
      companyId: new UserAccountCompanyId(
        '12345678-1234-4234-9234-123456789abc',
      ),
    });

    it('should login user successfully', async () => {
      // Arrange
      const expectedTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      const findByEmailSpy = jest
        .spyOn(userRepository, 'findByEmail')
        .mockResolvedValue(mockUser);
      const compareSpy = jest
        .spyOn(hasherService, 'compare')
        .mockResolvedValue(true);
      const generateSpy = jest
        .spyOn(tokenService, 'generate')
        .mockResolvedValue(expectedTokens);
      const saveSpy = jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(email, password);

      // Assert
      expect(result).toEqual(expectedTokens);
      expect(findByEmailSpy).toHaveBeenCalledWith(email);
      expect(compareSpy).toHaveBeenCalledWith(password, hashedPassword);
      expect(saveSpy).toHaveBeenCalled();
      expect(generateSpy).toHaveBeenCalledWith({
        id: mockUser.id.getValue(),
        email: mockUser.email.getValue(),
        roles: mockUser.roles.getValue().map((role) => role.getValue()),
        companyId: mockUser.companyId.getValue(),
      });
    });

    it('should throw UnauthorizedError when user not found', async () => {
      // Arrange
      const findByEmailSpy = jest
        .spyOn(userRepository, 'findByEmail')
        .mockResolvedValue(null);
      const compareSpy = jest.spyOn(hasherService, 'compare');

      // Act & Assert
      await expect(useCase.execute(email, password)).rejects.toThrow(
        new UnauthorizedError('User not found'),
      );
      expect(findByEmailSpy).toHaveBeenCalledWith(email);
      expect(compareSpy).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when user has empty password', async () => {
      // Arrange

      const userWithEmptyPassword = UserAccount.create({
        email: new UserAccountEmail(email),
        name: new UserAccountName('Test User'),
        password: UserAccountPassword.empty(),
        roles: new UserAccountRoles([new Role('admin')]),
        companyId: new UserAccountCompanyId(
          '12345678-1234-4234-9234-123456789abc',
        ),
      });

      const findByEmailSpy = jest
        .spyOn(userRepository, 'findByEmail')
        .mockResolvedValue(userWithEmptyPassword);
      const compareSpy = jest.spyOn(hasherService, 'compare');

      // Act & Assert
      await expect(useCase.execute(email, password)).rejects.toThrow(
        new UnauthorizedError('User not found'),
      );
      expect(findByEmailSpy).toHaveBeenCalledWith(email);
      expect(compareSpy).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when password is invalid', async () => {
      // Arrange
      const findByEmailSpy = jest
        .spyOn(userRepository, 'findByEmail')
        .mockResolvedValue(mockUser);
      const compareSpy = jest
        .spyOn(hasherService, 'compare')
        .mockResolvedValue(false);
      const generateSpy = jest.spyOn(tokenService, 'generate');

      // Act & Assert
      await expect(useCase.execute(email, password)).rejects.toThrow(
        new UnauthorizedError('Invalid password'),
      );
      expect(findByEmailSpy).toHaveBeenCalledWith(email);
      expect(compareSpy).toHaveBeenCalledWith(password, hashedPassword);
      expect(generateSpy).not.toHaveBeenCalled();
    });

    it('should update user last login time', async () => {
      // Arrange
      const expectedTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(hasherService, 'compare').mockResolvedValue(true);
      jest.spyOn(tokenService, 'generate').mockResolvedValue(expectedTokens);
      const saveSpy = jest
        .spyOn(userRepository, 'save')
        .mockResolvedValue(undefined);

      // Act
      await useCase.execute(email, password);

      // Assert
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
        }),
      );
    });
  });
});
