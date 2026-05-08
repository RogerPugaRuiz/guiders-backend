/**
 * Ámbitos de búsqueda disponibles en el sistema.
 * Cada provider declara qué scopes cubre.
 * El handler filtra por rol antes de ejecutar los providers.
 */
export enum SearchScope {
  CHATS = 'chats',
  VISITORS = 'visitors',
  LEADS = 'leads',
  COMPANIES = 'companies',
  USERS = 'users',
}
