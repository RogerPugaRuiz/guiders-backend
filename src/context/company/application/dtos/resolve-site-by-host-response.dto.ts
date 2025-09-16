// DTO de respuesta para la resolución de sitio por host
export class ResolveSiteByHostResponseDto {
  constructor(
    public readonly tenantId: string,
    public readonly siteId: string,
  ) {}

  // Método estático para crear desde primitivos de Company y Site
  public static fromPrimitives(
    companyId: string,
    siteId: string,
  ): ResolveSiteByHostResponseDto {
    return new ResolveSiteByHostResponseDto(companyId, siteId);
  }
}
