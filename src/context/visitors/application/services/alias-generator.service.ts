/**
 * Puerto para el servicio de generación de alias de visitantes
 * Define el contrato que debe cumplir cualquier implementación
 */
export interface AliasGeneratorService {
  /**
   * Genera un alias aleatorio para un visitante
   * @returns Un string con el alias generado
   */
  generate(): string;
}

/**
 * Token de inyección de dependencias para el servicio de alias
 */
export const ALIAS_GENERATOR_SERVICE = Symbol('ALIAS_GENERATOR_SERVICE');
