// Prueba unitaria para UserListResponseDto
// Ubicación: src/context/auth/auth-user/application/dtos/__tests__/user-list-response.dto.spec.ts
import {
  UserListItemDto,
  UserListResponseDto,
} from '../user-list-response.dto';

describe('UserListItemDto', () => {
  it('debe crear una instancia con todas las propiedades', () => {
    const dto = new UserListItemDto();
    dto.id = 'user-123';
    dto.email = 'user@test.com';
    dto.roles = ['admin', 'user'];
    dto.companyId = 'company-456';
    dto.isActive = true;

    expect(dto.id).toBe('user-123');
    expect(dto.email).toBe('user@test.com');
    expect(dto.roles).toEqual(['admin', 'user']);
    expect(dto.companyId).toBe('company-456');
    expect(dto.isActive).toBe(true);
  });

  it('debe permitir múltiples roles', () => {
    const dto = new UserListItemDto();
    dto.roles = ['admin', 'commercial', 'viewer'];

    expect(dto.roles).toHaveLength(3);
    expect(dto.roles).toContain('admin');
    expect(dto.roles).toContain('commercial');
    expect(dto.roles).toContain('viewer');
  });
});

describe('UserListResponseDto', () => {
  it('debe crear una instancia con un array de usuarios', () => {
    const userItem = new UserListItemDto();
    userItem.id = 'user-123';
    userItem.email = 'user@test.com';
    userItem.roles = ['admin'];
    userItem.companyId = 'company-456';
    userItem.isActive = true;

    const dto = new UserListResponseDto();
    dto.users = [userItem];

    expect(dto.users).toHaveLength(1);
    expect(dto.users[0]).toBe(userItem);
  });

  it('debe permitir múltiples usuarios', () => {
    const user1 = new UserListItemDto();
    user1.id = 'user-1';
    user1.email = 'user1@test.com';

    const user2 = new UserListItemDto();
    user2.id = 'user-2';
    user2.email = 'user2@test.com';

    const dto = new UserListResponseDto();
    dto.users = [user1, user2];

    expect(dto.users).toHaveLength(2);
  });
});
