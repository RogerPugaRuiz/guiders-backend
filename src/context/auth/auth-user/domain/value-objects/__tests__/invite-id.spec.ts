// Prueba unitaria para InviteId
// Ubicación: src/context/auth/auth-user/domain/value-objects/__tests__/invite-id.spec.ts
import { InviteId } from '../invite-id';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('InviteId', () => {
  it('debe crear un invite ID válido con UUID específico', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const inviteId = new InviteId(validUuid);
    expect(inviteId.value).toBe(validUuid);
  });

  it('debe heredar de Uuid', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const inviteId = new InviteId(validUuid);
    expect(inviteId).toBeInstanceOf(Uuid);
  });

  it('debe crear invite ID aleatorio usando método estático', () => {
    const inviteId = InviteId.random();
    expect(inviteId).toBeInstanceOf(InviteId);
    expect(inviteId).toBeInstanceOf(Uuid);
    expect(Uuid.validate(inviteId.value)).toBe(true);
  });

  it('debe generar diferentes IDs aleatorios', () => {
    const inviteId1 = InviteId.random();
    const inviteId2 = InviteId.random();

    expect(inviteId1.value).not.toBe(inviteId2.value);
  });

  it('debe lanzar error para UUID con formato inválido', () => {
    expect(() => {
      new InviteId('invalid-uuid');
    }).toThrow('Invalid Uuid format');
  });

  it('debe lanzar error para UUID vacío', () => {
    expect(() => {
      new InviteId('');
    }).toThrow('Invalid Uuid format');
  });

  it('debe lanzar error para UUID null', () => {
    expect(() => {
      new InviteId(null as any);
    }).toThrow('Invalid Uuid format');
  });

  it('debe lanzar error para UUID undefined', () => {
    expect(() => {
      new InviteId(undefined as any);
    }).toThrow('Invalid Uuid format');
  });

  it('debe comparar correctamente dos invite IDs iguales', () => {
    const uuidValue = '123e4567-e89b-12d3-a456-426614174000';
    const inviteId1 = new InviteId(uuidValue);
    const inviteId2 = new InviteId(uuidValue);

    expect(inviteId1.equals(inviteId2)).toBe(true);
  });

  it('debe comparar correctamente dos invite IDs diferentes', () => {
    const inviteId1 = new InviteId('123e4567-e89b-12d3-a456-426614174000');
    const inviteId2 = new InviteId('987fcdeb-51a2-43d1-9f33-426614174111');

    expect(inviteId1.equals(inviteId2)).toBe(false);
  });

  it('debe validar correctamente el formato UUID', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(() => {
      new InviteId(validUuid);
    }).not.toThrow();
  });

  it('debe heredar métodos de Uuid', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const inviteId = new InviteId(validUuid);

    expect(typeof inviteId.equals).toBe('function');
    expect(typeof inviteId.getValue).toBe('function');
    expect(inviteId.getValue()).toBe(validUuid);
  });

  it('debe crear IDs aleatorios válidos múltiples veces', () => {
    for (let i = 0; i < 10; i++) {
      const inviteId = InviteId.random();
      expect(Uuid.validate(inviteId.value)).toBe(true);
    }
  });

  it('debe funcionar con otros métodos estáticos de Uuid', () => {
    const generatedUuid = Uuid.generate();
    const inviteId = new InviteId(generatedUuid);

    expect(inviteId.value).toBe(generatedUuid);
    expect(Uuid.validate(inviteId.value)).toBe(true);
  });
});
