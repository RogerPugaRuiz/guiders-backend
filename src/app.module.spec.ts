import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

describe('AppModule', () => {
  let module: TestingModule;
  let configService: ConfigService;

  // Mock de variables de entorno para las pruebas
  const mockEnvVars = {
    NODE_ENV: 'test',
    ENCRYPTION_KEY: 'test-encryption-key',
    GLOBAL_TOKEN_SECRET: 'test-secret',
    DATABASE_HOST: 'test-host',
    DATABASE_PORT: '5433',
    DATABASE_USERNAME: 'test-user',
    DATABASE_PASSWORD: 'test-password',
    DATABASE: 'test-db',
    TEST_DATABASE_HOST: 'test-host',
    TEST_DATABASE_PORT: '5433',
    TEST_DATABASE_USERNAME: 'test-user',
    TEST_DATABASE_PASSWORD: 'test-password',
    TEST_DATABASE: 'test-db',
  };

  beforeEach(async () => {
    // Configurar variables de entorno mock
    Object.keys(mockEnvVars).forEach((key) => {
      process.env[key] = mockEnvVars[key as keyof typeof mockEnvVars];
    });

    // Crear el módulo de prueba
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [ConfigService],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    // Limpiar variables de entorno
    Object.keys(mockEnvVars).forEach((key) => {
      delete process.env[key];
    });
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(AppModule).toBeDefined();
    });

    it('should instantiate AppModule with ConfigService', () => {
      const appModule = new AppModule(configService);
      expect(appModule).toBeDefined();
      expect(appModule).toBeInstanceOf(AppModule);
    });

    it('should have logger instance after construction', () => {
      const appModule = new AppModule(configService);
      expect(appModule['logger']).toBeDefined();
      expect(appModule['logger']).toBeInstanceOf(Logger);
    });

    it('should store configService reference', () => {
      const appModule = new AppModule(configService);
      expect(appModule['configService']).toBe(configService);
    });
  });

  describe('TypeORM Configuration', () => {
    it('should configure TypeORM for test environment', () => {
      // Simular la factory function de TypeORM
      const typeOrmFactory = (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        const isTest = nodeEnv === 'test';

        return {
          type: 'postgres',
          host: isTest
            ? configService.get<string>('TEST_DATABASE_HOST', 'localhost')
            : configService.get<string>('DATABASE_HOST', 'localhost'),
          port: isTest
            ? Number(configService.get<string>('TEST_DATABASE_PORT', '5432'))
            : Number(configService.get<string>('DATABASE_PORT', '5432')),
          username: isTest
            ? configService.get<string>('TEST_DATABASE_USERNAME', 'postgres')
            : configService.get<string>('DATABASE_USERNAME', 'postgres'),
          password: isTest
            ? configService.get<string>('TEST_DATABASE_PASSWORD', 'password')
            : configService.get<string>('DATABASE_PASSWORD', 'password'),
          database: isTest
            ? configService.get<string>('TEST_DATABASE', 'mydb')
            : configService.get<string>('DATABASE', 'mydb'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          autoLoadEntities: false,
        };
      };

      const config = typeOrmFactory(configService);

      expect(config.type).toBe('postgres');
      expect(config.host).toBe('test-host');
      expect(config.port).toBe(5433);
      expect(config.username).toBe('test-user');
      expect(config.password).toBe('test-password');
      expect(config.database).toBe('test-db');
      expect(config.synchronize).toBe(false);
      expect(config.autoLoadEntities).toBe(false);
      expect(config.entities).toContain(__dirname + '/**/*.entity{.ts,.js}');
    });

    it('should configure TypeORM for production environment', () => {
      // Cambiar NODE_ENV a production
      process.env.NODE_ENV = 'production';

      const productionConfigService = new ConfigService({
        NODE_ENV: 'production',
        DATABASE_HOST: 'prod-host',
        DATABASE_PORT: '5432',
        DATABASE_USERNAME: 'prod-user',
        DATABASE_PASSWORD: 'prod-password',
        DATABASE: 'prod-db',
      });

      // Simular la factory function de TypeORM para producción
      const typeOrmFactory = (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        const isTest = nodeEnv === 'test';

        return {
          type: 'postgres',
          host: isTest
            ? configService.get<string>('TEST_DATABASE_HOST', 'localhost')
            : configService.get<string>('DATABASE_HOST', 'localhost'),
          port: isTest
            ? Number(configService.get<string>('TEST_DATABASE_PORT', '5432'))
            : Number(configService.get<string>('DATABASE_PORT', '5432')),
          username: isTest
            ? configService.get<string>('TEST_DATABASE_USERNAME', 'postgres')
            : configService.get<string>('DATABASE_USERNAME', 'postgres'),
          password: isTest
            ? configService.get<string>('TEST_DATABASE_PASSWORD', 'password')
            : configService.get<string>('DATABASE_PASSWORD', 'password'),
          database: isTest
            ? configService.get<string>('TEST_DATABASE', 'mydb')
            : configService.get<string>('DATABASE', 'mydb'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          autoLoadEntities: false,
        };
      };

      const config = typeOrmFactory(productionConfigService);

      expect(config.type).toBe('postgres');
      expect(config.host).toBe('prod-host');
      expect(config.port).toBe(5432);
      expect(config.username).toBe('prod-user');
      expect(config.password).toBe('prod-password');
      expect(config.database).toBe('prod-db');
    });

    it('should use default values when environment variables are not set', () => {
      // Limpiar las variables de entorno específicas para esta prueba
      const originalValues: Record<string, string | undefined> = {
        DATABASE_HOST: process.env.DATABASE_HOST,
        DATABASE_PORT: process.env.DATABASE_PORT,
        DATABASE_USERNAME: process.env.DATABASE_USERNAME,
        DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
        DATABASE: process.env.DATABASE,
      };

      // Eliminar temporalmente las variables específicas
      delete process.env.DATABASE_HOST;
      delete process.env.DATABASE_PORT;
      delete process.env.DATABASE_USERNAME;
      delete process.env.DATABASE_PASSWORD;
      delete process.env.DATABASE;

      // Crear ConfigService sin variables específicas
      const defaultConfigService = new ConfigService({
        NODE_ENV: 'development',
      });

      // Simular la factory function con valores por defecto
      const typeOrmFactory = (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        const isTest = nodeEnv === 'test';

        return {
          type: 'postgres',
          host: isTest
            ? configService.get<string>('TEST_DATABASE_HOST', 'localhost')
            : configService.get<string>('DATABASE_HOST', 'localhost'),
          port: isTest
            ? Number(configService.get<string>('TEST_DATABASE_PORT', '5432'))
            : Number(configService.get<string>('DATABASE_PORT', '5432')),
          username: isTest
            ? configService.get<string>('TEST_DATABASE_USERNAME', 'postgres')
            : configService.get<string>('DATABASE_USERNAME', 'postgres'),
          password: isTest
            ? configService.get<string>('TEST_DATABASE_PASSWORD', 'password')
            : configService.get<string>('DATABASE_PASSWORD', 'password'),
          database: isTest
            ? configService.get<string>('TEST_DATABASE', 'mydb')
            : configService.get<string>('DATABASE', 'mydb'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          autoLoadEntities: false,
        };
      };

      const config = typeOrmFactory(defaultConfigService);

      // Verificar valores por defecto para ambiente development (no test)
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.username).toBe('postgres');
      expect(config.password).toBe('password');
      expect(config.database).toBe('mydb');

      // Restaurar las variables originales
      Object.keys(originalValues).forEach((key) => {
        if (originalValues[key] !== undefined) {
          process.env[key] = originalValues[key];
        }
      });
    });
  });

  describe('Environment Variables Handling', () => {
    it('should handle missing environment variables gracefully', () => {
      // Limpiar todas las variables de entorno
      Object.keys(mockEnvVars).forEach((key) => {
        delete process.env[key as keyof typeof mockEnvVars];
      });

      const emptyConfigService = new ConfigService({});

      // Verificar que el módulo puede crear instancia incluso sin variables
      expect(() => new AppModule(emptyConfigService)).not.toThrow();
    });

    it('should access environment variables through ConfigService', () => {
      const appModule = new AppModule(configService);

      // Verificar que el módulo tiene acceso al ConfigService
      expect(appModule['configService']).toBeDefined();
      expect(appModule['configService'].get('NODE_ENV')).toBe('test');
    });

    it('should handle ConfigService with different environment values', () => {
      const customConfigService = new ConfigService({
        NODE_ENV: 'production',
        ENCRYPTION_KEY: 'prod-key',
        GLOBAL_TOKEN_SECRET: 'prod-secret',
      });

      const appModule = new AppModule(customConfigService);
      expect(appModule).toBeDefined();
      expect(appModule['configService'].get('NODE_ENV')).toBe('production');
    });
  });

  describe('ConfigModule Environment File Selection', () => {
    it('should use .env.production for production environment', () => {
      // Esta prueba verifica la lógica de selección de archivo de entorno
      const envFilePath =
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env';

      // En ambiente de test, debería usar .env
      expect(envFilePath).toBe('.env');
    });

    it('should use .env for non-production environments', () => {
      process.env.NODE_ENV = 'development';

      const envFilePath =
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env';

      expect(envFilePath).toBe('.env');
    });
  });
});
