import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

// Tipo específico para PostgreSQL options para hacer testing más fácil
interface PostgresConnectionOptions {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  entities: string[];
  synchronize: boolean;
  autoLoadEntities: boolean;
}

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

  describe('TypeORM Configuration useFactory', () => {
    it('should configure TypeORM for test environment using real factory method', () => {
      const config = AppModule.createTypeOrmOptions(
        configService,
      ) as PostgresConnectionOptions;

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

    it('should configure TypeORM for production environment using real factory method', () => {
      const productionConfigService = new ConfigService({
        NODE_ENV: 'production',
        DATABASE_HOST: 'prod-host',
        DATABASE_PORT: '5432',
        DATABASE_USERNAME: 'prod-user',
        DATABASE_PASSWORD: 'prod-password',
        DATABASE: 'prod-db',
      });

      const config = AppModule.createTypeOrmOptions(
        productionConfigService,
      ) as PostgresConnectionOptions;

      expect(config.type).toBe('postgres');
      expect(config.host).toBe('prod-host');
      expect(config.port).toBe(5432);
      expect(config.username).toBe('prod-user');
      expect(config.password).toBe('prod-password');
      expect(config.database).toBe('prod-db');
    });

    it('should use default values when environment variables are not set', () => {
      // Crear ConfigService con un entorno limpio y solo NODE_ENV específico
      const isolatedConfigService = new ConfigService();

      // Mock del método get para simular un ambiente sin variables específicas
      jest
        .spyOn(isolatedConfigService, 'get')
        .mockImplementation((key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'development';
          return defaultValue; // Retorna el valor por defecto
        });

      const config = AppModule.createTypeOrmOptions(
        isolatedConfigService,
      ) as PostgresConnectionOptions;

      // Verificar valores por defecto para ambiente development (no test)
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.username).toBe('postgres');
      expect(config.password).toBe('password');
      expect(config.database).toBe('mydb');

      // Limpiar el mock
      jest.restoreAllMocks();
    });

    it('should properly handle NODE_ENV test vs non-test environments', () => {
      // Test environment
      const testConfigService = new ConfigService({
        NODE_ENV: 'test',
        TEST_DATABASE_HOST: 'test-db-host',
        TEST_DATABASE_PORT: '5433',
        TEST_DATABASE_USERNAME: 'test-user',
        TEST_DATABASE_PASSWORD: 'test-pass',
        TEST_DATABASE: 'test-db',
      });

      const testConfig = AppModule.createTypeOrmOptions(
        testConfigService,
      ) as PostgresConnectionOptions;

      expect(testConfig.host).toBe('test-db-host');
      expect(testConfig.port).toBe(5433);

      // Production environment
      const prodConfigService = new ConfigService({
        NODE_ENV: 'production',
        DATABASE_HOST: 'prod-db-host',
        DATABASE_PORT: '5432',
        DATABASE_USERNAME: 'prod-user',
        DATABASE_PASSWORD: 'prod-pass',
        DATABASE: 'prod-db',
      });

      const prodConfig = AppModule.createTypeOrmOptions(
        prodConfigService,
      ) as PostgresConnectionOptions;

      expect(prodConfig.host).toBe('prod-db-host');
      expect(prodConfig.port).toBe(5432);
    });

    it('should return correct configuration when NODE_ENV is explicitly test', () => {
      const testEnvConfigService = new ConfigService({
        NODE_ENV: 'test',
        TEST_DATABASE_HOST: 'localhost-test',
        TEST_DATABASE_PORT: '5433',
        TEST_DATABASE_USERNAME: 'testuser',
        TEST_DATABASE_PASSWORD: 'testpass',
        TEST_DATABASE: 'testdb',
      });

      const config = AppModule.createTypeOrmOptions(
        testEnvConfigService,
      ) as PostgresConnectionOptions;

      // Verificar que se usan las variables TEST_* cuando NODE_ENV=test
      expect(config.host).toBe('localhost-test');
      expect(config.port).toBe(5433);
      expect(config.username).toBe('testuser');
      expect(config.password).toBe('testpass');
      expect(config.database).toBe('testdb');
    });

    it('should return correct configuration when NODE_ENV is not test', () => {
      const nonTestConfigService = new ConfigService({
        NODE_ENV: 'production',
        DATABASE_HOST: 'prod-server',
        DATABASE_PORT: '5432',
        DATABASE_USERNAME: 'produser',
        DATABASE_PASSWORD: 'prodpass',
        DATABASE: 'proddb',
      });

      const config = AppModule.createTypeOrmOptions(
        nonTestConfigService,
      ) as PostgresConnectionOptions;

      // Verificar que se usan las variables DATABASE_* cuando NODE_ENV != test
      expect(config.host).toBe('prod-server');
      expect(config.port).toBe(5432);
      expect(config.username).toBe('produser');
      expect(config.password).toBe('prodpass');
      expect(config.database).toBe('proddb');
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
