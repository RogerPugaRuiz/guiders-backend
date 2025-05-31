// Prueba unitaria para CreateInviteCommand
// Ubicación: src/context/auth/auth-user/application/commands/__tests__/create-invite.command.spec.ts
import { CreateInviteCommand } from '../create-invite.command';

describe('CreateInviteCommand', () => {
  it('debe crear el comando con todos los parámetros requeridos', () => {
    const inviteId = 'invite-123';
    const userId = 'user-456';
    const email = 'user@test.com';
    const token = 'token-789';
    const expiresAt = '2024-12-31T23:59:59.000Z';

    const command = new CreateInviteCommand(
      inviteId,
      userId,
      email,
      token,
      expiresAt,
    );

    expect(command.inviteId).toBe(inviteId);
    expect(command.userId).toBe(userId);
    expect(command.email).toBe(email);
    expect(command.token).toBe(token);
    expect(command.expiresAt).toBe(expiresAt);
  });

  it('debe implementar ICommand', () => {
    const command = new CreateInviteCommand(
      'invite-123',
      'user-456',
      'user@test.com',
      'token-789',
      '2024-12-31T23:59:59.000Z',
    );

    expect(command).toBeDefined();
    expect(command.inviteId).toBeDefined();
    expect(command.userId).toBeDefined();
    expect(command.email).toBeDefined();
    expect(command.token).toBeDefined();
    expect(command.expiresAt).toBeDefined();
  });
});
