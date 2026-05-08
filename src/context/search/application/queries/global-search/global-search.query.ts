export class GlobalSearchQuery {
  constructor(
    public readonly query: string,
    public readonly companyId: string,
    public readonly roles: string[],
    public readonly agentId?: string,
    public readonly limit?: number,
  ) {}
}
