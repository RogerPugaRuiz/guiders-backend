// DTO para la creación de una empresa, siguiendo DDD y CQRS
import { IsString, ValidateNested, IsArray, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// DTO para un sitio web de la empresa
export class SiteDto {
  @ApiProperty({
    description:
      'ID del sitio (opcional, se generará automáticamente si no se proporciona)',
    required: false,
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Nombre del sitio web' })
  @IsString({ message: 'El nombre del sitio es obligatorio' })
  name: string;

  @ApiProperty({ description: 'Dominio canónico del sitio' })
  @IsString({ message: 'El dominio canónico es obligatorio' })
  canonicalDomain: string;

  @ApiProperty({
    description: 'Lista de dominios alias (opcional)',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domainAliases?: string[];
}

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

  @ApiProperty({
    description: 'Lista de sitios web de la empresa',
    type: [SiteDto],
  })
  @IsArray({ message: 'Se debe proporcionar al menos un sitio' })
  @ValidateNested({ each: true })
  @Type(() => SiteDto)
  sites: SiteDto[];

  @ApiProperty({ type: AdminDto, description: 'Datos del administrador' })
  @ValidateNested()
  @Type(() => AdminDto)
  admin: AdminDto;
}
