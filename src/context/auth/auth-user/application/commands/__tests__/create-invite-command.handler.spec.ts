// Prueba básica para CreateInviteCommandHandler
// Ubicación: src/context/auth/auth-user/application/commands/__tests__/create-invite-command.handler.spec.ts
import { CreateInviteCommandHandler } from '../create-invite-command.handler';
import { CreateInviteCommand } from '../create-invite.command';
import { InviteRepository } from '../../../domain/invite.repository';

// Mock muy básico para evitar problemas de resolución de módulos
const mockRepository: Partial<InviteRepository> = {
  save: jest.fn().mockResolvedValue({ isErr: () => false }),
};

describe('CreateInviteCommandHandler', () => {
  let handler: CreateInviteCommandHandler;

  beforeEach(() => {
    // Crear instancia directamente con mock
    handler = new CreateInviteCommandHandler(
      mockRepository as InviteRepository,
    );
  });

  it('debe estar definido', () => {
    expect(handler).toBeDefined();
  });

  it('debe tener método execute', () => {
    expect(typeof handler.execute).toBe('function');
  });

  it('debe ejecutar comando con datos válidos', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
    const command = new CreateInviteCommand(
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
      'test@example.com',
      'token-789-abcdef',
      futureDate.toISOString(),
    );

    await expect(handler.execute(command)).resolves.not.toThrow();
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
