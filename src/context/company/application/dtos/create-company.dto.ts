// DTO para la creación de una empresa, siguiendo DDD y CQRS
import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// DTO para el administrador de la empresa
export class AdminDto {
  @ApiProperty({ description: 'Nombre del administrador' })
  @IsString({ message: 'El nombre del administrador es obligatorio' })
  adminName: string;

  @ApiProperty({ description: 'Email del administrador', required: false })
  @IsString({ message: 'El email del administrador es obligatorio' })
  adminEmail?: string;

  @ApiProperty({ description: 'Teléfono del administrador', required: false })
  @IsString({ message: 'El teléfono del administrador es obligatorio' })
  adminTel?: string;
}

// DTO principal para crear una empresa
export class CreateCompanyDto {
  @ApiProperty({ description: 'Nombre de la empresa' })
  @IsString({ message: 'El nombre de la empresa es obligatorio' })
  companyName: string;

  @ApiProperty({ description: 'Dominio de la empresa' })
  @IsString({ message: 'El dominio de la empresa es obligatorio' })
  domain: string;

  @ApiProperty({ type: AdminDto, description: 'Datos del administrador' })
  @ValidateNested()
  @Type(() => AdminDto)
  admin: AdminDto;
}
