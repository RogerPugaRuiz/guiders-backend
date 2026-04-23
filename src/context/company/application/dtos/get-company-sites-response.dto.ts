import { ApiProperty } from '@nestjs/swagger';

// DTOs de respuesta para listar los sites de una empresa
export class CompanySiteDto {
  @ApiProperty({
    description: 'Identificador único del sitio',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Nombre del sitio',
    example: 'Tienda Principal',
  })
  name!: string;

  @ApiProperty({
    description: 'Dominio canónico del sitio',
    example: 'example.com',
  })
  canonicalDomain!: string;

  @ApiProperty({
    description: 'Dominios alias adicionales del sitio',
    example: ['www.example.com', 'shop.example.com'],
    type: [String],
  })
  domainAliases!: string[];
}

export class GetCompanySitesResponseDto {
  @ApiProperty({
    description: 'Identificador único de la empresa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  public readonly companyId: string;

  @ApiProperty({
    description: 'Nombre de la empresa',
    example: 'Acme Corporation',
  })
  public readonly companyName: string;

  @ApiProperty({
    description: 'Lista de sitios web registrados en la empresa',
    type: [CompanySiteDto],
  })
  public readonly sites: CompanySiteDto[];

  constructor(companyId: string, companyName: string, sites: CompanySiteDto[]) {
    this.companyId = companyId;
    this.companyName = companyName;
    this.sites = sites;
  }

  static fromPrimitives(primitives: {
    id: string;
    companyName: string;
    sites: Array<{
      id: string;
      name: string;
      canonicalDomain: string;
      domainAliases: string[];
    }>;
  }): GetCompanySitesResponseDto {
    return new GetCompanySitesResponseDto(
      primitives.id,
      primitives.companyName,
      primitives.sites,
    );
  }
}
