import { ApiProperty } from '@nestjs/swagger';

// DTO de respuesta para el endpoint /me/company
export class MyCompanyResponseDto {
  @ApiProperty({
    description: 'ID único de la empresa',
    example: '83504359-b783-41dd-bee1-5237c009179d',
  })
  public readonly id: string;

  @ApiProperty({
    description: 'Nombre de la empresa',
    example: 'Empresa Local',
  })
  public readonly companyName: string;

  @ApiProperty({
    description: 'Lista de todos los dominios de la empresa',
    example: ['127.0.0.1', 'www.ejemplo.com'],
    type: [String],
  })
  public readonly domains: string[];

  @ApiProperty({
    description: 'ID del sitio específico resuelto por el host actual',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  public readonly siteId?: string;

  @ApiProperty({
    description: 'Nombre del sitio específico resuelto por el host actual',
    example: 'Landing Site',
    required: false,
  })
  public readonly siteName?: string;

  constructor(
    id: string,
    companyName: string,
    domains: string[],
    siteId?: string,
    siteName?: string,
  ) {
    this.id = id;
    this.companyName = companyName;
    this.domains = domains;
    this.siteId = siteId;
    this.siteName = siteName;
  }

  // Método estático para crear desde primitivos de Company
  public static fromPrimitives(
    primitives: {
      id: string;
      companyName: string;
      sites: Array<{
        id: string;
        name: string;
        canonicalDomain: string;
        domainAliases: string[];
      }>;
    },
    host?: string,
  ): MyCompanyResponseDto {
    // Extraer todos los dominios de todos los sitios
    const allDomains: string[] = [];
    for (const site of primitives.sites) {
      allDomains.push(site.canonicalDomain);
      allDomains.push(...site.domainAliases);
    }

    // Resolver siteId y siteName si se proporciona un host
    let resolvedSiteId: string | undefined;
    let resolvedSiteName: string | undefined;

    if (host) {
      // Normalizar el host quitando el puerto si existe (ej: localhost:3000 -> localhost)
      const normalizedHost = host.split(':')[0];

      const matchingSite = primitives.sites.find((site) => {
        const normalizedCanonical = site.canonicalDomain.split(':')[0];
        const normalizedAliases = site.domainAliases.map((a) => a.split(':')[0]);

        return (
          normalizedCanonical === normalizedHost ||
          normalizedAliases.includes(normalizedHost)
        );
      });

      if (matchingSite) {
        resolvedSiteId = matchingSite.id;
        resolvedSiteName = matchingSite.name;
      }
    }

    return new MyCompanyResponseDto(
      primitives.id,
      primitives.companyName,
      allDomains,
      resolvedSiteId,
      resolvedSiteName,
    );
  }
}
