import { ApiProperty } from '@nestjs/swagger';

// DTO de respuesta para la búsqueda de empresa por dominio
export class FindCompanyByDomainResponseDto {
  @ApiProperty({
    description: 'Identificador único de la empresa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  public readonly id: string;

  @ApiProperty({
    description: 'Nombre de la empresa',
    example: 'Acme Corporation',
  })
  public readonly companyName: string;

  @ApiProperty({
    description:
      'Lista de todos los dominios registrados en la empresa (dominios canónicos y alias)',
    example: ['example.com', 'www.example.com', 'shop.example.com'],
    type: [String],
  })
  public readonly domains: string[];

  constructor(id: string, companyName: string, domains: string[]) {
    this.id = id;
    this.companyName = companyName;
    this.domains = domains;
  }

  // Método estático para crear desde primitivos de Company
  public static fromPrimitives(primitives: {
    id: string;
    companyName: string;
    sites: Array<{
      id: string;
      name: string;
      canonicalDomain: string;
      domainAliases: string[];
    }>;
  }): FindCompanyByDomainResponseDto {
    // Extraer todos los dominios de todos los sitios
    const allDomains: string[] = [];
    for (const site of primitives.sites) {
      allDomains.push(site.canonicalDomain);
      allDomains.push(...site.domainAliases);
    }

    return new FindCompanyByDomainResponseDto(
      primitives.id,
      primitives.companyName,
      allDomains,
    );
  }
}
