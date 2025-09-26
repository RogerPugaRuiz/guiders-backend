// DTOs de respuesta para listar los sites de una empresa
export class CompanySiteDto {
  id!: string;
  name!: string;
  canonicalDomain!: string;
  domainAliases!: string[];
}

export class GetCompanySitesResponseDto {
  constructor(
    public readonly companyId: string,
    public readonly sites: CompanySiteDto[],
  ) {}

  static fromPrimitives(primitives: {
    id: string;
    sites: Array<{
      id: string;
      name: string;
      canonicalDomain: string;
      domainAliases: string[];
    }>;
  }): GetCompanySitesResponseDto {
    return new GetCompanySitesResponseDto(primitives.id, primitives.sites);
  }
}
