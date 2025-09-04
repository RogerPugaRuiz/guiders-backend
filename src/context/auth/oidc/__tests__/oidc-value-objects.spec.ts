import { OidcProviderId } from '../domain/value-objects/oidc-provider-id';
import { OidcClientId } from '../domain/value-objects/oidc-client-id';
import { OidcClientSecret } from '../domain/value-objects/oidc-client-secret';
import { OidcIssuerUrl } from '../domain/value-objects/oidc-issuer-url';
import { OidcScopes } from '../domain/value-objects/oidc-scopes';

describe('OIDC Value Objects', () => {
  describe('OidcProviderId', () => {
    it('debería crear un OidcProviderId válido', () => {
      const id = OidcProviderId.create('google-provider');
      expect(id.value).toBe('google-provider');
    });

    it('debería lanzar error con ID vacío', () => {
      expect(() => OidcProviderId.create('')).toThrow('El ID del proveedor OIDC no puede estar vacío');
    });
  });

  describe('OidcClientId', () => {
    it('debería crear un OidcClientId válido', () => {
      const clientId = OidcClientId.create('client123.apps.googleusercontent.com');
      expect(clientId.value).toBe('client123.apps.googleusercontent.com');
    });

    it('debería lanzar error con Client ID vacío', () => {
      expect(() => OidcClientId.create('')).toThrow('El Client ID de OIDC no puede estar vacío');
    });
  });

  describe('OidcClientSecret', () => {
    it('debería crear un OidcClientSecret válido', () => {
      const secret = OidcClientSecret.create('super-secret-key');
      expect(secret.value).toBe('super-secret-key');
    });

    it('debería lanzar error con Client Secret vacío', () => {
      expect(() => OidcClientSecret.create('')).toThrow('El Client Secret de OIDC no puede estar vacío');
    });
  });

  describe('OidcIssuerUrl', () => {
    it('debería crear un OidcIssuerUrl válido con HTTPS', () => {
      const url = OidcIssuerUrl.create('https://accounts.google.com');
      expect(url.value).toBe('https://accounts.google.com');
    });

    it('debería crear un OidcIssuerUrl válido con HTTP', () => {
      const url = OidcIssuerUrl.create('http://localhost:8080');
      expect(url.value).toBe('http://localhost:8080');
    });

    it('debería lanzar error con URL inválida', () => {
      expect(() => OidcIssuerUrl.create('not-a-url')).toThrow('La URL del issuer OIDC debe ser una URL válida');
    });

    it('debería lanzar error con protocolo inválido', () => {
      expect(() => OidcIssuerUrl.create('ftp://example.com')).toThrow('La URL del issuer OIDC debe ser una URL válida');
    });
  });

  describe('OidcScopes', () => {
    it('debería crear OidcScopes válidos', () => {
      const scopes = OidcScopes.fromPrimitives(['openid', 'profile', 'email']);
      expect(scopes.toPrimitives()).toEqual(['openid', 'profile', 'email']);
    });

    it('debería verificar si contiene un scope específico', () => {
      const scopes = OidcScopes.fromPrimitives(['openid', 'profile', 'email']);
      expect(scopes.contains('profile')).toBe(true);
      expect(scopes.contains('phone')).toBe(false);
    });

    it('debería lanzar error con array vacío', () => {
      expect(() => OidcScopes.fromPrimitives([])).toThrow('Los scopes de OIDC deben ser un array no vacío de strings válidos');
    });

    it('debería lanzar error con scope vacío', () => {
      expect(() => OidcScopes.fromPrimitives(['openid', ''])).toThrow('Los scopes de OIDC deben ser un array no vacío de strings válidos');
    });

    it('debería lanzar error con scope no string', () => {
      expect(() => OidcScopes.fromPrimitives(['openid', 123 as any])).toThrow('Los scopes de OIDC deben ser un array no vacío de strings válidos');
    });
  });
});