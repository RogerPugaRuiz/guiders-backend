import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { VerifyRoleMappingQuery } from './verify-role-mapping.query';
import { KeycloakRoleMapperService } from '../services/keycloak-role-mapper.service';

export interface RoleMappingVerificationDto {
  inputRoles: string[];
  validMappedRoles: Array<{
    keycloak: string;
    backend: string;
  }>;
  invalidRoles: string[];
  ignoredRoles: string[];
  finalBackendRoles: string[];
  allAvailableMappings: Record<string, string>;
  ignoredKeycloakRoles: string[];
}

@QueryHandler(VerifyRoleMappingQuery)
export class VerifyRoleMappingQueryHandler
  implements IQueryHandler<VerifyRoleMappingQuery>
{
  private readonly logger = new Logger(VerifyRoleMappingQueryHandler.name);

  constructor(private readonly roleMapper: KeycloakRoleMapperService) {}

  execute(query: VerifyRoleMappingQuery): RoleMappingVerificationDto {
    this.logger.log(
      `Verificando mapeo de roles: ${query.keycloakRoles.join(', ')}`,
    );

    // Realizar el mapeo
    const mappingResult = this.roleMapper.mapRoles(query.keycloakRoles);

    // Identificar roles ignorados vs inválidos
    const ignoredRoles: string[] = [];
    const invalidRoles: string[] = [];

    for (const role of query.keycloakRoles) {
      if (this.roleMapper.isIgnoredRole(role)) {
        ignoredRoles.push(role);
      } else if (mappingResult.invalidRoles.includes(role)) {
        invalidRoles.push(role);
      }
    }

    const result: RoleMappingVerificationDto = {
      inputRoles: query.keycloakRoles,
      validMappedRoles: mappingResult.mappedRoles,
      invalidRoles,
      ignoredRoles,
      finalBackendRoles: mappingResult.validRoles.map((role) =>
        role.toPrimitives(),
      ),
      allAvailableMappings: this.roleMapper.getAllMappings(),
      ignoredKeycloakRoles: this.roleMapper.getIgnoredRoles(),
    };

    this.logger.log(
      `Verificación completada: ${result.finalBackendRoles.length} roles finales`,
    );

    return result;
  }
}
