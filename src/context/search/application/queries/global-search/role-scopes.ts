/**
 * Mapa de roles a SearchScopes permitidos.
 * admin → todos los scopes
 * supervisor/commercial → chats, visitors, leads
 * visitor → ninguno (búsqueda no disponible para visitantes)
 */
import { SearchScope } from 'src/context/shared/domain/search';

export const ROLE_SCOPES: Record<string, SearchScope[]> = {
  admin: [
    SearchScope.CHATS,
    SearchScope.VISITORS,
    SearchScope.LEADS,
    SearchScope.COMPANIES,
    SearchScope.USERS,
  ],
  superadmin: [
    SearchScope.CHATS,
    SearchScope.VISITORS,
    SearchScope.LEADS,
    SearchScope.COMPANIES,
    SearchScope.USERS,
  ],
  supervisor: [SearchScope.CHATS, SearchScope.VISITORS, SearchScope.LEADS],
  commercial: [SearchScope.CHATS, SearchScope.VISITORS, SearchScope.LEADS],
  visitor: [],
};

/**
 * Retorna los scopes permitidos para un conjunto de roles.
 * Si el usuario tiene múltiples roles, se usa la unión de scopes.
 */
export function getScopesForRoles(roles: string[]): SearchScope[] {
  const scopeSet = new Set<SearchScope>();
  for (const role of roles) {
    const scopes = ROLE_SCOPES[role] ?? [];
    scopes.forEach((s) => scopeSet.add(s));
  }
  return Array.from(scopeSet);
}
