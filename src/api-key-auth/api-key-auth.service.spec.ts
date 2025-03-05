import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeyAuthService } from './api-key-auth.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('ApiKeyAuthService', () => {
  let service: ApiKeyAuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiKeyAuthService, JwtService],
    }).compile();

    service = module.get<ApiKeyAuthService>(ApiKeyAuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate valid tokens using jwtService with correct secret', () => {
    const apiKey = 'pk_test_1234567890';
    const expectedSecret = 'sk_test_SECRET1234567890';
    const fakeAccessToken = 'fake.jwt.access.token';
    const fakeRefreshToken = 'fake.jwt.refresh.token';
    const fingerprint = 'fingerprint';

    const signSpy = jest
      .spyOn(jwtService, 'sign')
      .mockReturnValueOnce(fakeAccessToken)
      .mockReturnValueOnce(fakeRefreshToken);

    const result = service.createTokens(apiKey, fingerprint);

    expect(result).toEqual({
      access_token: fakeAccessToken,
      refresh_token: fakeRefreshToken,
    });
    expect(signSpy).toHaveBeenCalledWith(
      { apiKey },
      { secret: expectedSecret, expiresIn: '1m' },
    );
    expect(signSpy).toHaveBeenCalledWith(
      { apiKey },
      { secret: expectedSecret, expiresIn: '1h' },
    );
  });

  it('should throw UnauthorizedException if apiKey is invalid', () => {
    const invalidApiKey = 'invalid_api_key';
    const fingerprint = 'fingerprint';

    expect(() => service.createTokens(invalidApiKey, fingerprint)).toThrow(
      UnauthorizedException,
    );
  });

  it('should refresh access token using valid refresh token', () => {
    const apiKey = 'pk_test_1234567890';
    const expectedSecret = 'sk_test_SECRET1234567890';
    const fakeRefreshToken = 'fake.jwt.refresh.token';
    const newFakeAccessToken = 'new.fake.jwt.access.token';
    const fingerprint = 'fingerprint';

    jest.spyOn(jwtService, 'verify').mockImplementation(() => ({}));
    const signSpy = jest
      .spyOn(jwtService, 'sign')
      .mockReturnValue(newFakeAccessToken);

    const result = service.refreshToken(apiKey, fakeRefreshToken);

    expect(result).toEqual({ access_token: newFakeAccessToken });
    expect(signSpy).toHaveBeenCalledWith(
      { apiKey, fingerprint },
      { secret: expectedSecret, expiresIn: '1m' },
    );
  });

  it('should throw UnauthorizedException if refresh token is invalid', () => {
    const apiKey = 'pk_test_1234567890';
    const invalidRefreshToken = 'invalid.jwt.refresh.token';

    jest.spyOn(jwtService, 'verify').mockImplementation(() => {
      throw new Error('Invalid token');
    });

    expect(() => service.refreshToken(apiKey, invalidRefreshToken)).toThrow(
      UnauthorizedException,
    );
  });
});
