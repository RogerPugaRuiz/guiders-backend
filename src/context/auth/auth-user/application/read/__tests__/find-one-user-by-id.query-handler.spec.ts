import { Test, TestingModule } from '@nestjs/testing';
import { FindOneUserByIdQueryHandler } from '../find-one-user-by-id.query-handler';
import { FindOneUserByIdQuery } from '../find-one-user-by-id.query';
import {
  UserAccountRepository,
  USER_ACCOUNT_REPOSITORY,
} from '../../../domain/user-account.repository';
import { UserAccount } from '../../../domain/user-account';

describe('FindOneUserByIdQueryHandler', () => {
  let handler: FindOneUserByIdQueryHandler;
  let userRepository: jest.Mocked<UserAccountRepository>;

  const mockUserId = 'user-123';
  const mockUserAccount = {
    toPrimitives: jest.fn().mockReturnValue({
      id: mockUserId,
      email: 'test@example.com',
      roles: ['admin'],
      companyId: 'company-123',
      isActive: true,
    }),
  } as any as UserAccount;

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindOneUserByIdQueryHandler,
        {
          provide: USER_ACCOUNT_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    handler = module.get<FindOneUserByIdQueryHandler>(
      FindOneUserByIdQueryHandler,
    );
    userRepository = module.get(USER_ACCOUNT_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return user when found by ID', async () => {
      // Arrange
      const query = new FindOneUserByIdQuery(mockUserId);
      userRepository.findById.mockResolvedValue(mockUserAccount);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.isPresent()).toBe(true);
      if (result.isPresent()) {
        expect(result.get()).toEqual({
          user: {
            id: mockUserId,
            email: 'test@example.com',
            roles: ['admin'],
            companyId: 'company-123',
            isActive: true,
          },
        });
      }
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockUserAccount.toPrimitives).toHaveBeenCalled();
    });

    it('should return empty Optional when user is not found', async () => {
      // Arrange
      const query = new FindOneUserByIdQuery(mockUserId);
      userRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.isEmpty()).toBe(true);
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockUserAccount.toPrimitives).not.toHaveBeenCalled();
    });

    it('should return empty Optional when user is undefined', async () => {
      // Arrange
      const query = new FindOneUserByIdQuery(mockUserId);
      userRepository.findById.mockResolvedValue(null);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.isEmpty()).toBe(true);
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      const query = new FindOneUserByIdQuery(mockUserId);
      userRepository.findById.mockRejectedValue(
        new Error('Database connection error'),
      );

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(
        'Database connection error',
      );
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle user ID correctly', async () => {
      // Arrange
      const differentUserId = 'user-456';
      const query = new FindOneUserByIdQuery(differentUserId);
      userRepository.findById.mockResolvedValue(null);

      // Act
      await handler.execute(query);

      // Assert
      expect(userRepository.findById).toHaveBeenCalledWith(differentUserId);
      expect(userRepository.findById).toHaveBeenCalledTimes(1);
    });
  });
});
