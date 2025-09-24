/**
 * Query para obtener reglas aplicables a una empresa/sitio
 */
export class GetApplicableAssignmentRulesQuery {
  constructor(
    public readonly companyId: string,
    public readonly siteId?: string,
  ) {}
}
