/**
 * Configuración centralizada de versiones de consentimiento
 *
 * IMPORTANTE: Este archivo centraliza la gestión de versiones de políticas de privacidad.
 *
 * Para actualizar la versión actual:
 * 1. Actualizar CONSENT_VERSION_CURRENT en .env (recomendado para producción)
 * 2. O actualizar DEFAULT_CONSENT_VERSION en este archivo (desarrollo)
 *
 * Para agregar/quitar versiones permitidas:
 * - Actualizar ALLOWED_CONSENT_VERSIONS si necesitas control estricto
 * - Por defecto acepta cualquier versión con formato semántico válido (vX.Y.Z)
 *
 * Compatibilidad Semántica (Semantic Versioning):
 * - MAJOR.MINOR.PATCH (ej: v1.4.0)
 * - Backend acepta automáticamente versiones MINOR y PATCH superiores
 * - Ejemplo: Si backend está en v1.4.0, acepta v1.4.1, v1.4.2, v1.5.0, etc.
 * - NO acepta versiones MAJOR superiores (v2.0.0 requiere actualización backend)
 */

/**
 * Versión por defecto de la política de privacidad
 * Puede ser sobrescrita por la variable de entorno CONSENT_VERSION_CURRENT
 */
export const DEFAULT_CONSENT_VERSION = 'v1.4.0';

/**
 * Lista opcional de versiones permitidas (whitelist)
 * Si está vacía, acepta cualquier versión con formato semántico válido
 *
 * NOTA: Cuando se usa compatibilidad semántica (ENABLE_SEMVER_COMPATIBILITY=true),
 * esta whitelist se ignora y se usa la validación basada en rangos semánticos.
 *
 * Ejemplo de uso estricto (sin semver):
 * export const ALLOWED_CONSENT_VERSIONS = ['v1.0.0', 'v1.3.0', 'v1.4.0'];
 */
export const ALLOWED_CONSENT_VERSIONS: string[] = [];

/**
 * Habilitar compatibilidad semántica (Semantic Versioning)
 *
 * Cuando está habilitado (true):
 * - Acepta versiones MINOR y PATCH superiores automáticamente
 * - Backend en v1.4.0 acepta: v1.4.1, v1.4.2, v1.5.0, v1.6.0, etc.
 * - NO acepta versiones MAJOR superiores (v2.0.0 requiere actualización)
 *
 * Cuando está deshabilitado (false):
 * - Solo acepta versiones exactas o usa whitelist si está configurada
 *
 * Puede sobrescribirse con ENV: ENABLE_SEMVER_COMPATIBILITY=true/false
 */
export const ENABLE_SEMVER_COMPATIBILITY = true;

/**
 * Patrón regex para validar formato de versión semántica
 * Formato: vX.Y o vX.Y.Z con sufijo opcional (-alpha.N, -beta.N, -rc.N)
 *
 * Ejemplos válidos:
 * - v1.0
 * - v1.0.0
 * - v1.2.3-alpha.1
 * - v2.0.0-beta.2
 */
export const CONSENT_VERSION_PATTERN = /^v\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.-]+)?$/;

/**
 * Obtiene la versión actual de consentimiento
 * Prioridad: ENV > DEFAULT
 */
export function getCurrentConsentVersion(): string {
  return process.env.CONSENT_VERSION_CURRENT || DEFAULT_CONSENT_VERSION;
}

/**
 * Parsea una versión semántica en sus componentes
 *
 * @param version - Versión a parsear (ej: v1.4.0, v1.4.0-beta.1)
 * @returns Objeto con major, minor, patch, prerelease o null si inválida
 */
export function parseSemanticVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
} | null {
  const normalized = version.startsWith('v') ? version : `v${version}`;

  // Patrón más específico para parsear componentes
  const match = normalized.match(
    /^v(\d+)\.(\d+)(?:\.(\d+))?(?:-([a-zA-Z0-9.-]+))?$/,
  );

  if (!match) {
    return null;
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3] || '0', 10),
    prerelease: match[4],
  };
}

/**
 * Compara dos versiones semánticas
 *
 * @param v1 - Primera versión
 * @param v2 - Segunda versión
 * @returns -1 si v1 < v2, 0 si v1 === v2, 1 si v1 > v2
 */
export function compareSemanticVersions(v1: string, v2: string): number {
  const parsed1 = parseSemanticVersion(v1);
  const parsed2 = parseSemanticVersion(v2);

  if (!parsed1 || !parsed2) {
    return 0; // No se pueden comparar
  }

  // Comparar MAJOR
  if (parsed1.major !== parsed2.major) {
    return parsed1.major > parsed2.major ? 1 : -1;
  }

  // Comparar MINOR
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor > parsed2.minor ? 1 : -1;
  }

  // Comparar PATCH
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch > parsed2.patch ? 1 : -1;
  }

  // Versiones iguales (ignoramos prerelease por simplicidad)
  return 0;
}

/**
 * Verifica si una versión es compatible semánticamente con otra
 *
 * Reglas de compatibilidad:
 * - MAJOR debe ser igual (v1.x.x compatible con v1.y.z, NO con v2.x.x)
 * - MINOR puede ser mayor o igual (v1.5.0 compatible con v1.4.0)
 * - PATCH puede ser mayor o igual (v1.4.2 compatible con v1.4.0)
 *
 * @param incomingVersion - Versión que viene del cliente/SDK
 * @param backendVersion - Versión configurada en el backend
 * @returns true si es compatible
 */
export function isSemverCompatible(
  incomingVersion: string,
  backendVersion: string,
): boolean {
  const incoming = parseSemanticVersion(incomingVersion);
  const backend = parseSemanticVersion(backendVersion);

  if (!incoming || !backend) {
    return false;
  }

  // MAJOR debe ser igual
  if (incoming.major !== backend.major) {
    return false;
  }

  // Si MINOR es menor, no es compatible (ej: v1.3.0 no compatible con v1.4.0)
  if (incoming.minor < backend.minor) {
    return false;
  }

  // Si MINOR es igual, PATCH puede ser mayor o igual
  if (incoming.minor === backend.minor && incoming.patch < backend.patch) {
    return false;
  }

  // Compatible: mismo MAJOR, MINOR >= backend.minor, PATCH >= backend.patch (si MINOR es igual)
  return true;
}

/**
 * Valida si una versión está permitida
 *
 * Comportamiento según configuración:
 * 1. Si ENABLE_SEMVER_COMPATIBILITY=true: Usa compatibilidad semántica
 * 2. Si ALLOWED_CONSENT_VERSIONS no está vacío: Usa whitelist estricta
 * 3. Si ambos deshabilitados: Acepta cualquier versión con formato válido
 *
 * @param version - Versión a validar (con o sin prefijo 'v')
 * @returns true si la versión es válida
 */
export function isConsentVersionAllowed(version: string): boolean {
  // Normalizar: agregar 'v' si no lo tiene
  const normalized = version.startsWith('v') ? version : `v${version}`;

  // Validar formato semántico
  if (!CONSENT_VERSION_PATTERN.test(normalized)) {
    return false;
  }

  // Verificar si semver está habilitado (ENV o constante)
  const semverEnabled =
    process.env.ENABLE_SEMVER_COMPATIBILITY === 'true' ||
    (process.env.ENABLE_SEMVER_COMPATIBILITY !== 'false' &&
      ENABLE_SEMVER_COMPATIBILITY);

  // Si semver está habilitado, usar compatibilidad semántica
  if (semverEnabled) {
    const backendVersion = getCurrentConsentVersion();
    return isSemverCompatible(normalized, backendVersion);
  }

  // Si hay whitelist, validar contra ella
  if (ALLOWED_CONSENT_VERSIONS.length > 0) {
    return ALLOWED_CONSENT_VERSIONS.includes(normalized);
  }

  // Sin whitelist ni semver: aceptar cualquier versión con formato válido
  return true;
}

/**
 * Obtiene el mensaje de error para versiones inválidas
 */
export function getConsentVersionErrorMessage(version: string): string {
  const normalized = version.startsWith('v') ? version : `v${version}`;

  if (!CONSENT_VERSION_PATTERN.test(normalized)) {
    return `Versión de consentimiento inválida: ${version}. Formato esperado: v1.0, v1.0.0, v1.2.3-alpha.1`;
  }

  // Verificar si semver está habilitado
  const semverEnabled =
    process.env.ENABLE_SEMVER_COMPATIBILITY === 'true' ||
    (process.env.ENABLE_SEMVER_COMPATIBILITY !== 'false' &&
      ENABLE_SEMVER_COMPATIBILITY);

  if (semverEnabled) {
    const backendVersion = getCurrentConsentVersion();
    const incoming = parseSemanticVersion(normalized);
    const backend = parseSemanticVersion(backendVersion);

    if (incoming && backend) {
      if (incoming.major !== backend.major) {
        return `Versión de consentimiento no compatible: ${version}. Backend requiere versión MAJOR ${backend.major}.x.x. Por favor actualiza el SDK o contacta soporte.`;
      }
      if (incoming.minor < backend.minor) {
        return `Versión de consentimiento obsoleta: ${version}. Backend requiere versión mínima ${backendVersion}. Por favor actualiza tu política de privacidad.`;
      }
      if (incoming.minor === backend.minor && incoming.patch < backend.patch) {
        return `Versión de consentimiento obsoleta: ${version}. Backend requiere versión mínima ${backendVersion}. Por favor actualiza tu política de privacidad.`;
      }
    }
  }

  if (ALLOWED_CONSENT_VERSIONS.length > 0) {
    return `Versión de consentimiento no permitida: ${version}. Versiones permitidas: ${ALLOWED_CONSENT_VERSIONS.join(', ')}`;
  }

  return `Versión de consentimiento inválida: ${version}`;
}
