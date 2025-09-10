// Mock del paquete jose para las pruebas
const jose = {
  createRemoteJWKSet: jest.fn().mockReturnValue({
    getKey: jest.fn().mockResolvedValue({
      kty: 'RSA',
      kid: 'test-key-id',
      use: 'sig',
      alg: 'RS256',
      n: 'mock-n-value',
      e: 'AQAB'
    })
  }),
  
  jwtVerify: jest.fn().mockImplementation((token, keySet) => {
    // Mock de verificación exitosa para pruebas
    return Promise.resolve({
      payload: {
        sub: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        aud: 'guiders-backend',
        iss: 'http://localhost:8080/realms/guiders'
      },
      protectedHeader: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'test-key-id'
      }
    });
  }),
  
  // Mock para errores específicos en las pruebas
  mockError: (errorType = 'JWTVerificationFailed') => {
    const error = new Error(`Mock ${errorType} error`);
    error.name = errorType;
    return error;
  }
};

module.exports = jose;
