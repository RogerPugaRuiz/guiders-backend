/**
 * Command para establecer una BFF session a partir de un embed token.
 *
 * El `embedToken` viene del `EmbedTokenGuard` (header `Authorization: Bearer`).
 * Los campos `expectedUserId` y `expectedCompanyId` son OPCIONALES y
 * vienen del body — defense-in-depth (validan match con el token).
 */

export class AuthenticateEmbedSessionCommand {
  constructor(
    public readonly embedToken: string,
    public readonly expectedUserId?: string,
    public readonly expectedCompanyId?: string,
  ) {}
}
