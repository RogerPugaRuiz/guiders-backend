import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { DualAuthGuard } from '../../../shared/infrastructure/guards/dual-auth.guard';
import { GetCompanySitesQuery } from '../../application/queries/get-company-sites.query';
import { GetCompanySitesResponseDto } from '../../application/dtos/get-company-sites-response.dto';
import { TokenVerifyService } from '../../../shared/infrastructure/token-verify.service';
import { BffSessionAuthService } from '../../../shared/infrastructure/services/bff-session-auth.service';
import { VisitorSessionAuthService } from '../../../shared/infrastructure/services/visitor-session-auth.service';

describe('CompanyController', () => {
  let controller: CompanyController;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        // Mocks mínimos para dependencias del DualAuthGuard
        {
          provide: TokenVerifyService,
          useValue: {
            verifyToken: jest.fn().mockResolvedValue({
              typ: 'access',
              sub: 'user',
              role: [],
              username: '',
              email: '',
              companyId: undefined,
            }),
          },
        },
        {
          provide: BffSessionAuthService,
          useValue: {
            extractBffSessionTokens: () => [],
            validateBffSession: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: VisitorSessionAuthService,
          useValue: { validateSession: jest.fn().mockResolvedValue(null) },
        },
      ],
    });

    const module: TestingModule = await moduleBuilder
      .overrideGuard(DualAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CompanyController>(CompanyController);
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(commandBus).toBeDefined();
    expect(queryBus).toBeDefined();
  });

  it('debe devolver sites de una empresa', async () => {
    const companyId = '550e8400-e29b-41d4-a716-446655440000';
    const response: GetCompanySitesResponseDto = new GetCompanySitesResponseDto(
      companyId,
      [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Landing',
          canonicalDomain: 'landing.example.com',
          domainAliases: ['www.example.com'],
        },
      ],
    );

    jest
      .spyOn(queryBus, 'execute')
      .mockResolvedValueOnce(response as unknown as any);

    const result = await controller.getCompanySites(companyId);

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetCompanySitesQuery(companyId),
    );
    expect(result).toEqual(response);
  });
});
