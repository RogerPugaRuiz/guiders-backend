import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../role.guard';
import { Roles } from '../../roles.decorator';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

/**
 * Crea un Reflector mockeado que responde a las claves según las opciones.
 */
function createMockReflector(options: {
  handlerRoles?: string[];
  isPublic?: boolean;
}): jest.Mocked<Reflector> {
  const { handlerRoles, isPublic = false } = options;

  return {
    getAllAndOverride: jest.fn((key: any, _targets: any[]) => {
      if (key === IS_PUBLIC_KEY) {
        return isPublic || undefined;
      }
      if (key === Roles) {
        return handlerRoles;
      }
      if (key === 'roles') {
        return undefined;
      }
      return undefined;
    }),
  } as unknown as jest.Mocked<Reflector>;
}

/**
 * Crea un ExecutionContext simulado con usuario y url básicos.
 */
function createMockContext(user?: {
  id: string;
  roles: string[];
}): ExecutionContext {
  const request = {
    method: 'GET',
    url: '/test',
    headers: {},
    cookies: {},
    user,
  };

  return {
    getHandler: () => () => {},
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let originalStrictRoles: string | undefined;

  beforeEach(() => {
    originalStrictRoles = process.env.STRICT_ROLES;
  });

  afterEach(() => {
    if (originalStrictRoles === undefined) {
      delete process.env.STRICT_ROLES;
    } else {
      process.env.STRICT_ROLES = originalStrictRoles;
    }
  });

  describe('con STRICT_ROLES=true (modo fail-closed)', () => {
    it('debe lanzar ForbiddenException en endpoint sin @Roles() ni @Public()', () => {
      process.env.STRICT_ROLES = 'true';
      const reflector = createMockReflector({});
      const guard = new RolesGuard(reflector);
      const context = createMockContext({ id: 'user-1', roles: ['admin'] });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException con mensaje descriptivo cuando faltan decoradores', () => {
      process.env.STRICT_ROLES = 'true';
      const reflector = createMockReflector({});
      const guard = new RolesGuard(reflector);
      const context = createMockContext({
        id: 'user-1',
        roles: ['commercial'],
      });

      expect(() => guard.canActivate(context)).toThrow(
        'Endpoint requiere @Roles() o @Public() explícito',
      );
    });

    it('debe permitir acceso con @Public() independiente del flag STRICT_ROLES', () => {
      process.env.STRICT_ROLES = 'true';
      const reflector = createMockReflector({ isPublic: true });
      const guard = new RolesGuard(reflector);
      const context = createMockContext();

      expect(guard.canActivate(context)).toBe(true);
    });

    it("debe permitir acceso con @Roles(['admin']) y JWT de admin", () => {
      process.env.STRICT_ROLES = 'true';
      const reflector = createMockReflector({ handlerRoles: ['admin'] });
      const guard = new RolesGuard(reflector);
      const context = createMockContext({ id: 'user-admin', roles: ['admin'] });

      expect(guard.canActivate(context)).toBe(true);
    });

    it("debe lanzar ForbiddenException con @Roles(['admin']) y JWT de commercial", () => {
      process.env.STRICT_ROLES = 'true';
      const reflector = createMockReflector({ handlerRoles: ['admin'] });
      const guard = new RolesGuard(reflector);
      const context = createMockContext({
        id: 'user-commercial',
        roles: ['commercial'],
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('con STRICT_ROLES=false (modo fail-open, backward compat)', () => {
    it('debe permitir acceso en endpoint sin @Roles() (comportamiento legacy)', () => {
      process.env.STRICT_ROLES = 'false';
      const reflector = createMockReflector({});
      const guard = new RolesGuard(reflector);
      const context = createMockContext({ id: 'user-1', roles: ['admin'] });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('debe permitir acceso con @Public() independiente del flag STRICT_ROLES', () => {
      process.env.STRICT_ROLES = 'false';
      const reflector = createMockReflector({ isPublic: true });
      const guard = new RolesGuard(reflector);
      const context = createMockContext();

      expect(guard.canActivate(context)).toBe(true);
    });

    it("debe permitir acceso con @Roles(['admin']) y JWT de admin", () => {
      process.env.STRICT_ROLES = 'false';
      const reflector = createMockReflector({ handlerRoles: ['admin'] });
      const guard = new RolesGuard(reflector);
      const context = createMockContext({ id: 'user-admin', roles: ['admin'] });

      expect(guard.canActivate(context)).toBe(true);
    });

    it("debe lanzar ForbiddenException con @Roles(['admin']) y JWT de commercial", () => {
      process.env.STRICT_ROLES = 'false';
      const reflector = createMockReflector({ handlerRoles: ['admin'] });
      const guard = new RolesGuard(reflector);
      const context = createMockContext({
        id: 'user-commercial',
        roles: ['commercial'],
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('sin STRICT_ROLES definido (default fail-open)', () => {
    it('debe comportarse como fail-open cuando la variable no está definida', () => {
      delete process.env.STRICT_ROLES;
      const reflector = createMockReflector({});
      const guard = new RolesGuard(reflector);
      const context = createMockContext({ id: 'user-1', roles: ['admin'] });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('con usuario no autenticado (OptionalAuthGuard)', () => {
    it('debe lanzar UnauthorizedException cuando user=undefined y el endpoint requiere roles', () => {
      process.env.STRICT_ROLES = 'true';
      const reflector = createMockReflector({ handlerRoles: ['commercial'] });
      const guard = new RolesGuard(reflector);
      // Sin usuario (OptionalAuthGuard dejó request.user = undefined)
      const context = createMockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('debe permitir acceso cuando user=undefined y el endpoint es @Public()', () => {
      process.env.STRICT_ROLES = 'true';
      const reflector = createMockReflector({ isPublic: true });
      const guard = new RolesGuard(reflector);
      const context = createMockContext(undefined);

      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
