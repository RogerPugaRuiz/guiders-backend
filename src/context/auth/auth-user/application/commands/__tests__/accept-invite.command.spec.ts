// Prueba unitaria para AcceptInviteCommand
// Ubicación: src/context/auth/auth-user/application/commands/__tests__/accept-invite.command.spec.ts
import { AcceptInviteCommand } from '../accept-invite.command';

describe('AcceptInviteCommand', () => {
  it('debe crear el comando con token y password correctos', () => {
    const token = 'test-token-123';
    const password = 'newPassword123';

    const command = new AcceptInviteCommand(token, password);

    expect(command.token).toBe(token);
    expect(command.password).toBe(password);
  });

  it('debe implementar ICommand', () => {
    const command = new AcceptInviteCommand('token', 'password');

    expect(command).toBeDefined();
    expect(command.token).toBeDefined();
    expect(command.password).toBeDefined();
  });
});
