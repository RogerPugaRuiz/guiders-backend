// Prueba unitaria para AcceptInviteCommandHandler
// Ubicación: src/context/auth/auth-user/application/commands/__tests__/accept-invite-command.handler.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { AcceptInviteCommandHandler } from '../accept-invite-command.handler';
import { AcceptInviteCommand } from '../accept-invite.command';
import { InviteRepository, INVITE_REPOSITORY } from '../../../domain/invite.repository';
import { UserAccountRepository, USER_ACCOUNT_REPOSITORY } from '../../../domain/user-account.repository';
import { UserPasswordHasher, USER_PASSWORD_HASHER } from '../../service/user-password-hasher';
import { ok, err } from 'src/context/shared/domain/result';

describe('AcceptInviteCommandHandler', () => {
  let handler: AcceptInviteCommandHandler;
  let mockInviteRepository: any;
  let mockUserRepository: any;
  let mockHasherService: any;
  let mockEventPublisher: any;

  beforeEach(async () => {
    // Crear mocks
    mockInviteRepository = {
      match: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
    };

    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };

    mockHasherService = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    const mockUserWithContext = {
      updatePassword: jest.fn().mockReturnValue({
        commit: jest.fn(),
      }),
      commit: jest.fn(),
    };

    mockEventPublisher = {
      mergeObjectContext: jest.fn().mockReturnValue(mockUserWithContext),
    };

    // Configuración del módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptInviteCommandHandler,
        {
          provide: INVITE_REPOSITORY,
          useValue: mockInviteRepository,
        },
        {
          provide: USER_ACCOUNT_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: USER_PASSWORD_HASHER,
          useValue: mockHasherService,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    handler = module.get<AcceptInviteCommandHandler>(AcceptInviteCommandHandler);
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  it('debe aceptar invitación exitosamente', async () => {
    // Arrange
    const command = new AcceptInviteCommand('valid-token-123', 'newPassword123');
    
    const mockInvite = {
      userId: { value: 'user-123' },
      expiresAt: { value: new Date(Date.now() + 24 * 60 * 60 * 1000) }, // Expira mañana
      token: { value: 'valid-token-123' },
    };

    const mockUser = {
      id: 'user-123',
      updatePassword: jest.fn(),
    };

    // Configurar mocks
    mockInviteRepository.match.mockResolvedValue(ok([mockInvite]));
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockHasherService.hash.mockResolvedValue('hashedPassword123');
    mockUserRepository.save.mockResolvedValue();

    // Act
    await handler.execute(command);

    // Assert
    expect(mockInviteRepository.match).toHaveBeenCalled();
    expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
    expect(mockHasherService.hash).toHaveBeenCalledWith('newPassword123');
    expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(mockUser);
    expect(mockUserRepository.save).toHaveBeenCalled();
  });

  it('debe lanzar error cuando la invitación no existe', async () => {
    // Arrange
    const command = new AcceptInviteCommand('invalid-token', 'newPassword123');
    
    // Mock para invitación no encontrada
    mockInviteRepository.match.mockResolvedValue(ok([]));

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(
      'Invitación no encontrada o token inválido'
    );
    expect(mockInviteRepository.match).toHaveBeenCalled();
    expect(mockUserRepository.findById).not.toHaveBeenCalled();
  });

  it('debe lanzar error cuando el repositorio de invitaciones falla', async () => {
    // Arrange
    const command = new AcceptInviteCommand('token-123', 'newPassword123');
    
    // Mock para error en el repositorio
    mockInviteRepository.match.mockResolvedValue(err(new Error('Database error')));

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(
      'Invitación no encontrada o token inválido'
    );
  });

  it('debe lanzar error cuando la invitación ha expirado', async () => {
    // Arrange
    const command = new AcceptInviteCommand('expired-token', 'newPassword123');
    
    const mockExpiredInvite = {
      userId: { value: 'user-123' },
      expiresAt: { value: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Expiró ayer
      token: { value: 'expired-token' },
    };

    // Configurar mocks
    mockInviteRepository.match.mockResolvedValue(ok([mockExpiredInvite]));

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(
      'La invitación ha expirado'
    );
    expect(mockUserRepository.findById).not.toHaveBeenCalled();
  });

  it('debe lanzar error cuando el usuario no existe', async () => {
    // Arrange
    const command = new AcceptInviteCommand('valid-token', 'newPassword123');
    
    const mockInvite = {
      userId: { value: 'nonexistent-user' },
      expiresAt: { value: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      token: { value: 'valid-token' },
    };

    // Configurar mocks
    mockInviteRepository.match.mockResolvedValue(ok([mockInvite]));
    mockUserRepository.findById.mockResolvedValue(null);

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(
      'Usuario no encontrado para la invitación'
    );
    expect(mockHasherService.hash).not.toHaveBeenCalled();
  });

  it('debe hashear la contraseña correctamente', async () => {
    // Arrange
    const password = 'mySecurePassword123!';
    const command = new AcceptInviteCommand('valid-token', password);
    
    const mockInvite = {
      userId: { value: 'user-123' },
      expiresAt: { value: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      token: { value: 'valid-token' },
    };

    const mockUser = {
      id: 'user-123',
    };

    // Configurar mocks
    mockInviteRepository.match.mockResolvedValue(ok([mockInvite]));
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockHasherService.hash.mockResolvedValue('hashedSecurePassword');
    mockUserRepository.save.mockResolvedValue();

    // Act
    await handler.execute(command);

    // Assert
    expect(mockHasherService.hash).toHaveBeenCalledWith(password);
  });

  it('debe integrar correctamente el contexto de eventos', async () => {
    // Arrange
    const command = new AcceptInviteCommand('valid-token', 'newPassword123');
    
    const mockInvite = {
      userId: { value: 'user-123' },
      expiresAt: { value: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      token: { value: 'valid-token' },
    };

    const mockUser = {
      id: 'user-123',
    };

    const mockUpdatedUser = {
      commit: jest.fn(),
    };

    // Configurar mocks con detalles específicos
    mockInviteRepository.match.mockResolvedValue(ok([mockInvite]));
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockHasherService.hash.mockResolvedValue('hashedPassword');
    
    const mockUserWithContext = {
      updatePassword: jest.fn().mockReturnValue(mockUpdatedUser),
    };
    mockEventPublisher.mergeObjectContext.mockReturnValue(mockUserWithContext);
    mockUserRepository.save.mockResolvedValue();

    // Act
    await handler.execute(command);

    // Assert
    expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(mockUser);
    expect(mockUserWithContext.updatePassword).toHaveBeenCalledWith('hashedPassword');
    expect(mockUserRepository.save).toHaveBeenCalledWith(mockUpdatedUser);
    expect(mockUpdatedUser.commit).toHaveBeenCalled();
  });
});