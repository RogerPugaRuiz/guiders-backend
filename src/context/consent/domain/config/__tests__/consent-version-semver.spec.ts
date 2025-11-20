import {
  parseSemanticVersion,
  compareSemanticVersions,
  isSemverCompatible,
  isConsentVersionAllowed,
} from '../consent-version.config';

describe('Semantic Version Compatibility', () => {
  describe('parseSemanticVersion', () => {
    it('debe parsear versión con prefijo v correctamente', () => {
      const result = parseSemanticVersion('v1.4.0');

      expect(result).toEqual({
        major: 1,
        minor: 4,
        patch: 0,
        prerelease: undefined,
      });
    });

    it('debe parsear versión sin prefijo v correctamente', () => {
      const result = parseSemanticVersion('1.4.0');

      expect(result).toEqual({
        major: 1,
        minor: 4,
        patch: 0,
        prerelease: undefined,
      });
    });

    it('debe parsear versión sin patch (v1.4)', () => {
      const result = parseSemanticVersion('v1.4');

      expect(result).toEqual({
        major: 1,
        minor: 4,
        patch: 0, // Debe defaultear a 0
        prerelease: undefined,
      });
    });

    it('debe parsear versión con prerelease', () => {
      const result = parseSemanticVersion('v1.4.0-beta.1');

      expect(result).toEqual({
        major: 1,
        minor: 4,
        patch: 0,
        prerelease: 'beta.1',
      });
    });

    it('debe retornar null para versión inválida', () => {
      const result = parseSemanticVersion('invalid');

      expect(result).toBeNull();
    });

    it('debe retornar null para versión sin minor', () => {
      const result = parseSemanticVersion('v1');

      expect(result).toBeNull();
    });
  });

  describe('compareSemanticVersions', () => {
    it('debe retornar 0 cuando las versiones son iguales', () => {
      expect(compareSemanticVersions('v1.4.0', 'v1.4.0')).toBe(0);
      expect(compareSemanticVersions('1.4.0', 'v1.4.0')).toBe(0);
    });

    it('debe retornar 1 cuando v1 > v2 (MAJOR)', () => {
      expect(compareSemanticVersions('v2.0.0', 'v1.4.0')).toBe(1);
    });

    it('debe retornar -1 cuando v1 < v2 (MAJOR)', () => {
      expect(compareSemanticVersions('v1.4.0', 'v2.0.0')).toBe(-1);
    });

    it('debe retornar 1 cuando v1 > v2 (MINOR)', () => {
      expect(compareSemanticVersions('v1.5.0', 'v1.4.0')).toBe(1);
    });

    it('debe retornar -1 cuando v1 < v2 (MINOR)', () => {
      expect(compareSemanticVersions('v1.3.0', 'v1.4.0')).toBe(-1);
    });

    it('debe retornar 1 cuando v1 > v2 (PATCH)', () => {
      expect(compareSemanticVersions('v1.4.2', 'v1.4.1')).toBe(1);
    });

    it('debe retornar -1 cuando v1 < v2 (PATCH)', () => {
      expect(compareSemanticVersions('v1.4.1', 'v1.4.2')).toBe(-1);
    });
  });

  describe('isSemverCompatible', () => {
    const backendVersion = 'v1.4.0';

    describe('Versiones compatibles (deben aceptarse)', () => {
      it('debe aceptar versión exacta', () => {
        expect(isSemverCompatible('v1.4.0', backendVersion)).toBe(true);
      });

      it('debe aceptar PATCH superior (v1.4.1)', () => {
        expect(isSemverCompatible('v1.4.1', backendVersion)).toBe(true);
      });

      it('debe aceptar PATCH superior (v1.4.2)', () => {
        expect(isSemverCompatible('v1.4.2', backendVersion)).toBe(true);
      });

      it('debe aceptar PATCH muy superior (v1.4.99)', () => {
        expect(isSemverCompatible('v1.4.99', backendVersion)).toBe(true);
      });

      it('debe aceptar MINOR superior con PATCH 0 (v1.5.0)', () => {
        expect(isSemverCompatible('v1.5.0', backendVersion)).toBe(true);
      });

      it('debe aceptar MINOR superior con PATCH superior (v1.5.1)', () => {
        expect(isSemverCompatible('v1.5.1', backendVersion)).toBe(true);
      });

      it('debe aceptar MINOR muy superior (v1.10.0)', () => {
        expect(isSemverCompatible('v1.10.0', backendVersion)).toBe(true);
      });
    });

    describe('Versiones incompatibles (deben rechazarse)', () => {
      it('debe rechazar MAJOR diferente (v2.0.0)', () => {
        expect(isSemverCompatible('v2.0.0', backendVersion)).toBe(false);
      });

      it('debe rechazar MAJOR inferior (v0.9.0)', () => {
        expect(isSemverCompatible('v0.9.0', backendVersion)).toBe(false);
      });

      it('debe rechazar MINOR inferior (v1.3.0)', () => {
        expect(isSemverCompatible('v1.3.0', backendVersion)).toBe(false);
      });

      it('debe rechazar MINOR inferior con PATCH superior (v1.3.5)', () => {
        expect(isSemverCompatible('v1.3.5', backendVersion)).toBe(false);
      });

      it('debe rechazar mismo MINOR con PATCH inferior (v1.4.0 vs v1.4.1 backend)', () => {
        const backendWithPatch = 'v1.4.2';
        expect(isSemverCompatible('v1.4.0', backendWithPatch)).toBe(false);
        expect(isSemverCompatible('v1.4.1', backendWithPatch)).toBe(false);
      });
    });

    describe('Casos edge', () => {
      it('debe funcionar con versiones sin prefijo v', () => {
        expect(isSemverCompatible('1.4.1', backendVersion)).toBe(true);
        expect(isSemverCompatible('1.3.0', backendVersion)).toBe(false);
      });

      it('debe retornar false para versiones inválidas', () => {
        expect(isSemverCompatible('invalid', backendVersion)).toBe(false);
        expect(isSemverCompatible('v1.4.0', 'invalid')).toBe(false);
      });
    });
  });

  describe('isConsentVersionAllowed con SEMVER habilitado', () => {
    // Guardar valor original
    const originalEnv = process.env.ENABLE_SEMVER_COMPATIBILITY;

    beforeAll(() => {
      // Asegurar que semver esté habilitado
      process.env.ENABLE_SEMVER_COMPATIBILITY = 'true';
      process.env.CONSENT_VERSION_CURRENT = 'v1.4.0';
    });

    afterAll(() => {
      // Restaurar valor original
      if (originalEnv === undefined) {
        delete process.env.ENABLE_SEMVER_COMPATIBILITY;
      } else {
        process.env.ENABLE_SEMVER_COMPATIBILITY = originalEnv;
      }
      delete process.env.CONSENT_VERSION_CURRENT;
    });

    it('debe aceptar versión exacta', () => {
      expect(isConsentVersionAllowed('v1.4.0')).toBe(true);
    });

    it('debe aceptar versiones PATCH superiores', () => {
      expect(isConsentVersionAllowed('v1.4.1')).toBe(true);
      expect(isConsentVersionAllowed('v1.4.2')).toBe(true);
      expect(isConsentVersionAllowed('v1.4.10')).toBe(true);
    });

    it('debe aceptar versiones MINOR superiores', () => {
      expect(isConsentVersionAllowed('v1.5.0')).toBe(true);
      expect(isConsentVersionAllowed('v1.5.1')).toBe(true);
      expect(isConsentVersionAllowed('v1.10.0')).toBe(true);
    });

    it('debe rechazar versiones MAJOR diferentes', () => {
      expect(isConsentVersionAllowed('v2.0.0')).toBe(false);
      expect(isConsentVersionAllowed('v0.9.0')).toBe(false);
    });

    it('debe rechazar versiones MINOR inferiores', () => {
      expect(isConsentVersionAllowed('v1.3.0')).toBe(false);
      expect(isConsentVersionAllowed('v1.2.9')).toBe(false);
    });

    it('debe rechazar versiones con formato inválido', () => {
      expect(isConsentVersionAllowed('invalid')).toBe(false);
      expect(isConsentVersionAllowed('v1')).toBe(false);
    });
  });

  describe('Casos de uso reales', () => {
    beforeEach(() => {
      process.env.ENABLE_SEMVER_COMPATIBILITY = 'true';
    });

    afterEach(() => {
      delete process.env.ENABLE_SEMVER_COMPATIBILITY;
      delete process.env.CONSENT_VERSION_CURRENT;
    });

    it('Escenario 1: Backend en v1.4.0, SDK envía v1.4.0 → ✅ Acepta', () => {
      process.env.CONSENT_VERSION_CURRENT = 'v1.4.0';
      expect(isConsentVersionAllowed('v1.4.0')).toBe(true);
    });

    it('Escenario 2: Backend en v1.4.0, SDK envía v1.4.1 (bug fix) → ✅ Acepta', () => {
      process.env.CONSENT_VERSION_CURRENT = 'v1.4.0';
      expect(isConsentVersionAllowed('v1.4.1')).toBe(true);
    });

    it('Escenario 3: Backend en v1.4.0, SDK envía v1.5.0 (nueva feature) → ✅ Acepta', () => {
      process.env.CONSENT_VERSION_CURRENT = 'v1.4.0';
      expect(isConsentVersionAllowed('v1.5.0')).toBe(true);
    });

    it('Escenario 4: Backend en v1.4.0, SDK envía v1.3.0 (versión antigua) → ❌ Rechaza', () => {
      process.env.CONSENT_VERSION_CURRENT = 'v1.4.0';
      expect(isConsentVersionAllowed('v1.3.0')).toBe(false);
    });

    it('Escenario 5: Backend en v1.4.0, SDK envía v2.0.0 (breaking change) → ❌ Rechaza', () => {
      process.env.CONSENT_VERSION_CURRENT = 'v1.4.0';
      expect(isConsentVersionAllowed('v2.0.0')).toBe(false);
    });

    it('Escenario 6: Backend en v2.0.0, SDK envía v1.9.9 → ❌ Rechaza', () => {
      process.env.CONSENT_VERSION_CURRENT = 'v2.0.0';
      expect(isConsentVersionAllowed('v1.9.9')).toBe(false);
    });

    it('Escenario 7: Backend actualizado a v1.5.0, SDK antiguo v1.4.2 → ❌ Rechaza', () => {
      process.env.CONSENT_VERSION_CURRENT = 'v1.5.0';
      expect(isConsentVersionAllowed('v1.4.2')).toBe(false);
    });

    it('Escenario 8: Backend en v1.5.0, SDK nuevo v1.6.0 → ✅ Acepta', () => {
      process.env.CONSENT_VERSION_CURRENT = 'v1.5.0';
      expect(isConsentVersionAllowed('v1.6.0')).toBe(true);
    });
  });

  describe('Deshabilitado SEMVER', () => {
    beforeEach(() => {
      process.env.ENABLE_SEMVER_COMPATIBILITY = 'false';
      process.env.CONSENT_VERSION_CURRENT = 'v1.4.0';
    });

    afterEach(() => {
      delete process.env.ENABLE_SEMVER_COMPATIBILITY;
      delete process.env.CONSENT_VERSION_CURRENT;
    });

    it('debe aceptar cualquier versión válida cuando semver está deshabilitado', () => {
      expect(isConsentVersionAllowed('v1.4.0')).toBe(true);
      expect(isConsentVersionAllowed('v1.4.1')).toBe(true);
      expect(isConsentVersionAllowed('v1.3.0')).toBe(true);
      expect(isConsentVersionAllowed('v2.0.0')).toBe(true);
    });
  });
});
