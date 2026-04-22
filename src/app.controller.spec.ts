import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from './context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from './context/shared/infrastructure/guards/role.guard';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: jest.fn().mockReturnValue('Hello World!'),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      const getHelloSpy = jest.spyOn(appService, 'getHello');
      const result = appController.getHello();
      expect(result).toBe('Hello World!');
      expect(getHelloSpy).toHaveBeenCalled();
    });
  });

  describe('health', () => {
    it('should return void for health check', () => {
      const result = appController.healthCheck();
      expect(result).toBeUndefined();
    });
  });
});
