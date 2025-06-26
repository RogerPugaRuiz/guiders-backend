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
    domains: string[];
  }): FindCompanyByDomainResponseDto {
    return new FindCompanyByDomainResponseDto(
      primitives.id,
      primitives.companyName,
      primitives.domains,
    );
  }
}
