import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

describe('CompanyController', () => {
  let controller: CompanyController;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(commandBus).toBeDefined();
    expect(queryBus).toBeDefined();
  });
});
