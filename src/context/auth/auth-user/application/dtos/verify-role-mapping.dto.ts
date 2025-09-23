import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class VerifyRoleMappingDto {
  @ApiProperty({
    description: 'Array de roles desde Keycloak para verificar su mapeo',
    example: ['commercial', 'offline_access', 'administrator', 'unknown_role'],
    type: [String],
  })
  @IsArray({ message: 'Los roles deben ser un array' })
  @IsString({ each: true, message: 'Cada rol debe ser una cadena de texto' })
  keycloakRoles: string[];
}

export class RoleMappingItemDto {
  @ApiProperty({
    description: 'Rol original en Keycloak',
    example: 'administrator',
  })
  keycloak: string;

  @ApiProperty({
    description: 'Rol mapeado en el backend',
    example: 'admin',
  })
  backend: string;
}

export class VerifyRoleMappingResponseDto {
  @ApiProperty({
    description: 'Roles originales enviados desde Keycloak',
    example: ['commercial', 'offline_access', 'administrator', 'unknown_role'],
    type: [String],
  })
  inputRoles: string[];

  @ApiProperty({
    description: 'Roles que fueron mapeados exitosamente',
    type: [RoleMappingItemDto],
    example: [
      { keycloak: 'commercial', backend: 'commercial' },
      { keycloak: 'administrator', backend: 'admin' },
    ],
  })
  validMappedRoles: RoleMappingItemDto[];

  @ApiProperty({
    description: 'Roles de Keycloak que no tienen mapeo en el backend',
    example: ['unknown_role'],
    type: [String],
  })
  invalidRoles: string[];

  @ApiProperty({
    description: 'Roles técnicos de Keycloak que se ignoran automáticamente',
    example: ['offline_access'],
    type: [String],
  })
  ignoredRoles: string[];

  @ApiProperty({
    description: 'Roles finales que se asignarían al usuario en el backend',
    example: ['commercial', 'admin'],
    type: [String],
  })
  finalBackendRoles: string[];

  @ApiProperty({
    description: 'Todos los mapeos disponibles en el sistema',
    example: {
      admin: 'admin',
      administrator: 'admin',
      commercial: 'commercial',
      manager: 'commercial',
    },
  })
  allAvailableMappings: Record<string, string>;

  @ApiProperty({
    description: 'Lista completa de roles técnicos de Keycloak que se ignoran',
    example: ['offline_access', 'uma_authorization', 'default-roles-guiders'],
    type: [String],
  })
  ignoredKeycloakRoles: string[];
}
