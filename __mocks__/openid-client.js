// Mock for openid-client ES module
module.exports = {
  Issuer: {
    discover: jest.fn().mockResolvedValue({
      metadata: {
        issuer: 'http://localhost:8080/realms/test',
        authorization_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/auth',
        token_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/token',
        userinfo_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/userinfo',
        end_session_endpoint: 'http://localhost:8080/realms/test/protocol/openid-connect/logout',
        jwks_uri: 'http://localhost:8080/realms/test/protocol/openid-connect/certs',
      },
      Client: jest.fn().mockImplementation(() => ({
        authorizationUrl: jest.fn().mockReturnValue('http://mocked-auth-url'),
        callbackParams: jest.fn().mockReturnValue({}),
        callback: jest.fn().mockResolvedValue({
          access_token: 'mock-access-token',
          id_token: 'mock-id-token',
          refresh_token: 'mock-refresh-token',
        }),
        userinfo: jest.fn().mockResolvedValue({
          sub: 'mock-user-id',
          preferred_username: 'mock-user',
          email: 'mock@example.com',
        }),
        revoke: jest.fn().mockResolvedValue(undefined),
      })),
    }),
  },
  generators: {
    state: jest.fn().mockReturnValue('mock-state'),
    nonce: jest.fn().mockReturnValue('mock-nonce'),
    codeVerifier: jest.fn().mockReturnValue('mock-code-verifier'),
    codeChallenge: jest.fn().mockReturnValue('mock-code-challenge'),
  },
  custom: {
    setHttpOptionsDefaults: jest.fn(),
  },
};