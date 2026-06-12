export class GetVisitorStatsQuery {
  constructor(public readonly tenantId: string) {}

  static create(props: { tenantId: string }): GetVisitorStatsQuery {
    return new GetVisitorStatsQuery(props.tenantId);
  }
}
