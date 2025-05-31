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
import { UserAccount } from '../../../domain/user-account';
import { UserEmail } from '../../../domain/user-email';
import { UserPassword } from '../../../domain/user-password';
import { UserId } from '../../../domain/user-id';
import { UserRoles } from '../../../domain/user-roles';
import { UserRole } from '../../../domain/user-role';
import { CompanyId } from 'src/context/shared/domain/value-objects/company-id';

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
    const hashedPassword = 'hashedPassword123';

    const mockUser = UserAccount.create({
      id: new UserId('user-123'),
      email: new UserEmail(email),
      password: new UserPassword(hashedPassword),
      roles: new UserRoles([new UserRole('USER')]),
      companyId: new CompanyId('company-123'),
    });

    it('should login user successfully', async () => {
      // Arrange
      const expectedTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);
      hasherService.compare.mockResolvedValue(true);
      tokenService.generate.mockResolvedValue(expectedTokens);
      userRepository.save.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(email, password);

      // Assert
      expect(result).toEqual(expectedTokens);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(hasherService.compare).toHaveBeenCalledWith(
        password,
        hashedPassword,
      );
      expect(userRepository.save).toHaveBeenCalled();
      expect(tokenService.generate).toHaveBeenCalledWith({
        id: mockUser.id.getValue(),
        email: mockUser.email.getValue(),
        roles: mockUser.roles.getValue().map((role) => role.getValue()),
        companyId: mockUser.companyId.getValue(),
      });
    });

    it('should throw UnauthorizedError when user not found', async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(email, password)).rejects.toThrow(
        new UnauthorizedError('User not found'),
      );
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(hasherService.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when user has empty password', async () => {
      // Arrange
      const userWithEmptyPassword = UserAccount.create({
        id: new UserId('user-123'),
        email: new UserEmail(email),
        password: UserPassword.empty(),
        roles: new UserRoles([new UserRole('USER')]),
        companyId: new CompanyId('company-123'),
      });

      userRepository.findByEmail.mockResolvedValue(userWithEmptyPassword);

      // Act & Assert
      await expect(useCase.execute(email, password)).rejects.toThrow(
        new UnauthorizedError('User not found'),
      );
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(hasherService.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when password is invalid', async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(mockUser);
      hasherService.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(useCase.execute(email, password)).rejects.toThrow(
        new UnauthorizedError('Invalid password'),
      );
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(hasherService.compare).toHaveBeenCalledWith(
        password,
        hashedPassword,
      );
      expect(tokenService.generate).not.toHaveBeenCalled();
    });

    it('should update user last login time', async () => {
      // Arrange
      const expectedTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);
      hasherService.compare.mockResolvedValue(true);
      tokenService.generate.mockResolvedValue(expectedTokens);
      userRepository.save.mockResolvedValue(undefined);

      // Act
      await useCase.execute(email, password);

      // Assert
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
        }),
      );
    });
  });
});
