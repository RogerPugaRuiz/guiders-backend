import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID, IsArray, MinLength } from 'class-validator';

export class SyncUserWithKeycloakDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'test1@demo.com',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  email: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Test1 Test1',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @ApiProperty({
    description: 'ID del usuario en Keycloak',
    example: 'd9b32cfd-f838-4764-b03f-465ed59ce245',
  })
  @IsUUID(4, { message: 'Debe ser un UUID válido' })
  keycloakId: string;

  @ApiProperty({
    description: 'Roles del usuario',
    example: ['commercial'],
    type: [String],
  })
  @IsArray({ message: 'Los roles deben ser un array' })
  @IsString({ each: true, message: 'Cada rol debe ser una cadena de texto' })
  roles: string[];

  @ApiProperty({
    description: 'ID de la compañía a la que pertenece el usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID(4, { message: 'Debe ser un UUID válido' })
  companyId: string;
}

export class SyncUserResponseDto {
  @ApiProperty({
    description: 'ID del usuario creado/actualizado',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'Mensaje de confirmación',
    example: 'Usuario sincronizado exitosamente con Keycloak',
  })
  message: string;
}
