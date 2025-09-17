import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisher } from '@nestjs/cqrs';
import { IdentifyVisitorCommandHandler } from '../identify-visitor.command-handler';
import { IdentifyVisitorCommand } from '../identify-visitor.command';
import {
  VisitorV2Repository,
  VISITOR_V2_REPOSITORY,
} from '../../../domain/visitor-v2.repository';
import { err } from '../../../../shared/domain/result';
import {
  VALIDATE_DOMAIN_API_KEY,
  ValidateDomainApiKey,
} from '../../../../auth/auth-visitor/application/services/validate-domain-api-key';
import {
  CompanyRepository,
  COMPANY_REPOSITORY,
} from '../../../../company/domain/company.repository';
import { CompanyNotFoundError } from '../../../../company/domain/errors/company.error';

describe('IdentifyVisitorCommandHandler', () => {
  let handler: IdentifyVisitorCommandHandler;
  let visitorRepository: VisitorV2Repository;
  let companyRepository: CompanyRepository;
  let validateDomainApiKey: ValidateDomainApiKey;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentifyVisitorCommandHandler,
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: {
            findByFingerprintAndSite: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: COMPANY_REPOSITORY,
          useValue: {
            findByDomain: jest.fn(),
          },
        },
        {
          provide: VALIDATE_DOMAIN_API_KEY,
          useValue: {
            validate: jest.fn(),
          },
        },
        {
          provide: EventPublisher,
          useValue: {
            mergeObjectContext: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<IdentifyVisitorCommandHandler>(
      IdentifyVisitorCommandHandler,
    );
    visitorRepository = module.get<VisitorV2Repository>(VISITOR_V2_REPOSITORY);
    companyRepository = module.get<CompanyRepository>(COMPANY_REPOSITORY);
    validateDomainApiKey = module.get<ValidateDomainApiKey>(
      VALIDATE_DOMAIN_API_KEY,
    );
  });

  describe('execute', () => {
    const validCommand = new IdentifyVisitorCommand(
      'fp_abc123def456',
      'landing.mytech.com',
      'ak_live_1234567890',
      'https://landing.mytech.com/home',
    );

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('debe lanzar error cuando la API Key es inválida', async () => {
      jest.spyOn(validateDomainApiKey, 'validate').mockResolvedValue(false);

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'API Key inválida para el dominio proporcionado',
      );

      expect(companyRepository.findByDomain).not.toHaveBeenCalled();
      expect(visitorRepository.findByFingerprintAndSite).not.toHaveBeenCalled();
    });

    it('debe lanzar error cuando no se encuentra la empresa', async () => {
      jest.spyOn(validateDomainApiKey, 'validate').mockResolvedValue(true);
      jest
        .spyOn(companyRepository, 'findByDomain')
        .mockResolvedValue(err(new CompanyNotFoundError()));

      await expect(handler.execute(validCommand)).rejects.toThrow(
        'No se encontró una empresa para el dominio: landing.mytech.com',
      );

      expect(validateDomainApiKey.validate).toHaveBeenCalled();
      expect(visitorRepository.findByFingerprintAndSite).not.toHaveBeenCalled();
    });
  });
});
