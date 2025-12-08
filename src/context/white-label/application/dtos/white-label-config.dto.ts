/**
 * DTOs para configuración White Label
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  Matches,
  IsIn,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ALLOWED_FONT_FAMILIES } from '../../domain/entities/white-label-config';

/**
 * Regex para validar colores hexadecimales
 */
const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

/**
 * DTO para colores
 */
export class ColorsDto {
  @ApiPropertyOptional({
    description: 'Color primario (hex)',
    example: '#007bff',
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
  })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, {
    message: 'primary debe ser un color hexadecimal válido',
  })
  primary?: string;

  @ApiPropertyOptional({
    description: 'Color secundario (hex)',
    example: '#6c757d',
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
  })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, {
    message: 'secondary debe ser un color hexadecimal válido',
  })
  secondary?: string;

  @ApiPropertyOptional({
    description: 'Color de fondo (hex)',
    example: '#ffffff',
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
  })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, {
    message: 'background debe ser un color hexadecimal válido',
  })
  background?: string;

  @ApiPropertyOptional({
    description: 'Color de superficie (hex)',
    example: '#f8f9fa',
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
  })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, {
    message: 'surface debe ser un color hexadecimal válido',
  })
  surface?: string;

  @ApiPropertyOptional({
    description: 'Color de texto (hex)',
    example: '#212529',
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
  })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, {
    message: 'text debe ser un color hexadecimal válido',
  })
  text?: string;

  @ApiPropertyOptional({
    description: 'Color de texto secundario (hex)',
    example: '#6c757d',
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
  })
  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR_REGEX, {
    message: 'textMuted debe ser un color hexadecimal válido',
  })
  textMuted?: string;
}

/**
 * DTO para branding
 */
export class BrandingDto {
  @ApiPropertyOptional({
    description: 'URL del logo',
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  @IsOptional()
  @IsUrl({}, { message: 'logoUrl debe ser una URL válida' })
  logoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'URL del favicon',
    example: 'https://example.com/favicon.ico',
    nullable: true,
  })
  @IsOptional()
  @IsUrl({}, { message: 'faviconUrl debe ser una URL válida' })
  faviconUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Nombre de la marca (puede ser vacío)',
    example: 'Mi Empresa',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brandName?: string;
}

/**
 * DTO para archivo de fuente
 */
export class FontFileDto {
  @ApiProperty({
    description: 'Nombre del archivo de fuente',
    example: 'OpenSans-Bold.ttf',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'URL del archivo de fuente',
    example: 'https://storage.example.com/fonts/OpenSans-Bold.ttf',
  })
  @IsString()
  @IsUrl()
  url: string;
}

/**
 * DTO para tipografía
 */
export class TypographyDto {
  @ApiPropertyOptional({
    description: 'Familia de fuente',
    example: 'Inter',
    enum: ALLOWED_FONT_FAMILIES,
  })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_FONT_FAMILIES, {
    message: `fontFamily debe ser uno de: ${ALLOWED_FONT_FAMILIES.join(', ')}`,
  })
  fontFamily?: string;

  @ApiPropertyOptional({
    description: 'Nombre de la fuente personalizada',
    example: 'Mi Fuente Custom',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customFontName?: string | null;

  @ApiPropertyOptional({
    description: 'Archivos de fuente personalizados',
    type: [FontFileDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FontFileDto)
  customFontFiles?: FontFileDto[];
}

/**
 * DTO de respuesta de configuración White Label
 */
export class WhiteLabelConfigResponseDto {
  @ApiProperty({
    description: 'ID de la configuración',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID de la empresa',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  companyId: string;

  @ApiProperty({
    description: 'Configuración de colores',
    type: ColorsDto,
  })
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };

  @ApiProperty({
    description: 'Configuración de branding',
  })
  branding: {
    logoUrl: string | null;
    faviconUrl: string | null;
    brandName: string;
  };

  @ApiProperty({
    description: 'Configuración de tipografía',
  })
  typography: {
    fontFamily: string;
    customFontName: string | null;
    customFontFiles: FontFileDto[];
  };

  @ApiProperty({
    description: 'Tema de la interfaz',
    example: 'light',
    enum: ['light', 'dark', 'system'],
  })
  theme: string;

  @ApiPropertyOptional({
    description: 'Fecha de creación',
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    description: 'Fecha de última actualización',
  })
  updatedAt?: Date;
}

/**
 * Temas disponibles
 */
export const ALLOWED_THEMES = ['light', 'dark', 'system'] as const;
export type AllowedTheme = (typeof ALLOWED_THEMES)[number];

/**
 * DTO para actualizar configuración White Label
 */
export class UpdateWhiteLabelConfigDto {
  @ApiPropertyOptional({
    description: 'Configuración de colores',
    type: ColorsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ColorsDto)
  colors?: ColorsDto;

  @ApiPropertyOptional({
    description: 'Configuración de branding',
    type: BrandingDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingDto)
  branding?: BrandingDto;

  @ApiPropertyOptional({
    description: 'Configuración de tipografía',
    type: TypographyDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TypographyDto)
  typography?: TypographyDto;

  @ApiPropertyOptional({
    description: 'Tema de la interfaz',
    example: 'light',
    enum: ALLOWED_THEMES,
  })
  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_THEMES, {
    message: `theme debe ser uno de: ${ALLOWED_THEMES.join(', ')}`,
  })
  theme?: AllowedTheme;
}

/**
 * DTO de respuesta para upload de archivo
 */
export class UploadResponseDto {
  @ApiProperty({
    description: 'URL del archivo subido',
    example: 'https://storage.example.com/white-label/logo.png',
  })
  url: string;
}

/**
 * DTO para los valores por defecto
 */
export class WhiteLabelDefaultsDto {
  @ApiProperty({
    description: 'Colores por defecto',
  })
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };

  @ApiProperty({
    description: 'Fuentes disponibles',
    example: [
      'Inter',
      'Roboto',
      'Open Sans',
      'Poppins',
      'Montserrat',
      'custom',
    ],
  })
  availableFonts: string[];

  @ApiProperty({
    description: 'Fuente por defecto',
    example: 'Inter',
  })
  defaultFont: string;
}
