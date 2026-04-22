import { SetMetadata } from '@nestjs/common';

/**
 * Clave de metadato para marcar endpoints públicos.
 * El RolesGuard lee esta clave para permitir acceso sin autenticación.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorador que marca un endpoint como público.
 * Con este decorador, el RolesGuard permite el acceso sin verificar roles,
 * incluso cuando STRICT_ROLES=true está activo.
 *
 * Uso:
 * ```ts
 * @Public()
 * @Get('health')
 * health() { return { status: 'ok' }; }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
