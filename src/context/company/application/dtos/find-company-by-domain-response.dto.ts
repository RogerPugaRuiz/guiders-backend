// DTO de respuesta para la búsqueda de empresa por dominio
export class FindCompanyByDomainResponseDto {
  constructor(
    public readonly id: string,
    public readonly companyName: string,
    public readonly domains: string[],
  ) {}

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
