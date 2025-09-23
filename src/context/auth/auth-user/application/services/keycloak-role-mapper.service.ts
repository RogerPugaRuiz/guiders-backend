import { Injectable, Logger } from '@nestjs/common';
import { Role, RoleEnum } from '../../domain/value-objects/role';

export interface RoleMappingResult {
  validRoles: Role[];
  invalidRoles: string[];
  mappedRoles: { keycloak: string; backend: string }[];
}

@Injectable()
export class KeycloakRoleMapperService {
  private readonly logger = new Logger(KeycloakRoleMapperService.name);

  // Mapeo de roles de Keycloak a roles del backend
  private readonly roleMapping: Record<string, RoleEnum> = {
    // Roles directos (mismo nombre)
    admin: RoleEnum.ADMIN,
    superadmin: RoleEnum.SUPERADMIN,
    commercial: RoleEnum.COMMERCIAL,

    // Mapeos alternativos
    administrator: RoleEnum.ADMIN,
    'super-admin': RoleEnum.SUPERADMIN,
    super_admin: RoleEnum.SUPERADMIN,
    manager: RoleEnum.COMMERCIAL,
    sales: RoleEnum.COMMERCIAL,
    'sales-rep': RoleEnum.COMMERCIAL,
    sales_rep: RoleEnum.COMMERCIAL,
  };

  // Roles técnicos de Keycloak que se ignoran automáticamente
  private readonly ignoredKeycloakRoles: string[] = [
    'offline_access',
    'uma_authorization',
    'default-roles-guiders',
    'account',
    'manage-account',
    'manage-account-links',
    'view-profile',
  ];

  /**
   * Mapea roles de Keycloak a roles válidos del backend
   * @param keycloakRoles Array de roles desde Keycloak
   * @returns Resultado del mapeo con roles válidos, inválidos y mapeados
   */
  public mapRoles(keycloakRoles: string[]): RoleMappingResult {
    const validRoles: Role[] = [];
    const invalidRoles: string[] = [];
    const mappedRoles: { keycloak: string; backend: string }[] = [];

    for (const keycloakRole of keycloakRoles) {
      // Ignorar roles técnicos de Keycloak
      if (this.ignoredKeycloakRoles.includes(keycloakRole)) {
        this.logger.debug(`Ignorando rol técnico de Keycloak: ${keycloakRole}`);
        continue;
      }

      // Buscar mapeo del rol
      const mappedRole = this.roleMapping[keycloakRole.toLowerCase()];

      if (mappedRole) {
        try {
          const backendRole = Role.fromPrimitives(mappedRole);
          validRoles.push(backendRole);
          mappedRoles.push({
            keycloak: keycloakRole,
            backend: mappedRole,
          });

          this.logger.debug(`Rol mapeado: ${keycloakRole} → ${mappedRole}`);
        } catch (error) {
          this.logger.warn(
            `Error creando rol ${mappedRole} desde Keycloak ${keycloakRole}:`,
            error,
          );
          invalidRoles.push(keycloakRole);
        }
      } else {
        this.logger.warn(`Rol de Keycloak no reconocido: ${keycloakRole}`);
        invalidRoles.push(keycloakRole);
      }
    }

    // Asegurar que siempre haya al menos un rol válido
    if (validRoles.length === 0) {
      this.logger.warn(
        'No se encontraron roles válidos, asignando rol commercial por defecto',
      );
      validRoles.push(Role.commercial());
      mappedRoles.push({
        keycloak: 'default',
        backend: RoleEnum.COMMERCIAL,
      });
    }

    this.logger.log(
      `Mapeo completado: ${validRoles.length} válidos, ${invalidRoles.length} inválidos`,
    );

    return {
      validRoles,
      invalidRoles,
      mappedRoles,
    };
  }

  /**
   * Verifica si un rol de Keycloak es técnico y debe ser ignorado
   * @param role Rol a verificar
   * @returns true si es un rol técnico que debe ignorarse
   */
  public isIgnoredRole(role: string): boolean {
    return this.ignoredKeycloakRoles.includes(role);
  }

  /**
   * Obtiene todos los mapeos configurados
   * @returns Objeto con todos los mapeos de roles
   */
  public getAllMappings(): Record<string, RoleEnum> {
    return { ...this.roleMapping };
  }

  /**
   * Obtiene la lista de roles técnicos ignorados
   * @returns Array de roles técnicos
   */
  public getIgnoredRoles(): string[] {
    return [...this.ignoredKeycloakRoles];
  }
}
