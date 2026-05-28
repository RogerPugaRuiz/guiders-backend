# Guía Completa: Tests E2E en Guiders Backend

## 1. ESTRUCTURA DE TESTS E2E

### 1.1 Rutas y Configuración

**Directorio de tests E2E:**
```
/Users/rogerpugaruiz/Proyectos/guiders-backend/test/
├── jest-e2e.json              # Configuración Jest para E2E (local)
├── jest-e2e.ci.json           # Configuración Jest para E2E (CI/GitHub Actions)
├── jest-e2e.setup.ts          # Setup global para E2E tests
├── jest-e2e.ci.setup.ts       # Setup global para E2E en CI
├── helpers/
│   └── mongo-test.helper.ts   # Helper para MongoDB local/CI
├── *.e2e-spec.ts              # Tests E2E (20+ archivos)
└── socket.js                  # WebSocket client helper
```

**Archivos de configuración:**
- Config Jest E2E: `/Users/rogerpugaruiz/Proyectos/guiders-backend/test/jest-e2e.json`
- Setup global: `/Users/rogerpugaruiz/Proyectos/guiders-backend/test/jest-e2e.setup.ts`
- Variables de entorno: `/Users/rogerpugaruiz/Proyectos/guiders-backend/.env.e2e` (CI)
- Variables de entorno: `/Users/rogerpugaruiz/Proyectos/guiders-backend/.env.test` (local)

### 1.2 Comando para Ejecutar Tests E2E

```bash
# Todos los tests E2E
npm run test:e2e

# Un archivo específico
npm run test:e2e -- site-visitors.e2e-spec.ts

# En CI/GitHub Actions
npm run test:e2e:ci
```

**Configuración en package.json:**
```json
{
  "scripts": {
    "test:e2e": "NODE_ENV=test jest --config ./test/jest-e2e.json",
    "test:e2e:ci": "NODE_ENV=test CI=true jest --config ./test/jest-e2e.ci.json --passWithNoTests --coverage"
  }
}
```

## 2. CONFIGURACIÓN DE JEST E2E

### 2.1 jest-e2e.json (Local)

**Ruta:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/test/jest-e2e.json`

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.ts$": "ts-jest"
  },
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/../src/$1",
    "^jose$": "<rootDir>/../__mocks__/jose.js",
    "^openid-client$": "<rootDir>/../__mocks__/openid-client.js"
  },
  "transformIgnorePatterns": [
    "node_modules/(?!(jose|@nestjs/websockets|socket.io|openid-client|oauth4webapi)/)"
  ],
  "testTimeout": 60000,
  "setupFilesAfterEnv": ["<rootDir>/jest-e2e.setup.ts"]
}
```

**Puntos clave:**
- `testRegex: ".e2e-spec.ts$"` - Solo ejecuta archivos que terminan en `.e2e-spec.ts`
- `testTimeout: 60000` - Timeout de 60 segundos (importante para tests lentos)
- `setupFilesAfterEnv` - Ejecuta setup global ANTES de los tests

### 2.2 jest-e2e.setup.ts (Setup Global)

**Ruta:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/test/jest-e2e.setup.ts`

```typescript
/**
 * Jest E2E Test Setup
 * Configuración global para los tests E2E
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env.test si existe
const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });

// Configurar timeout extendido para tests E2E
jest.setTimeout(120000);

// Configurar variables de entorno si no están definidas
if (!process.env.TEST_MONGODB_HOST) {
  process.env.TEST_MONGODB_HOST = 'localhost';
}

if (!process.env.TEST_MONGODB_PORT) {
  process.env.TEST_MONGODB_PORT = '27018';
}

if (!process.env.TEST_MONGODB_DATABASE) {
  process.env.TEST_MONGODB_DATABASE = 'guiders_test';
}

// MongoDB sin auth en desarrollo local
process.env.TEST_MONGODB_ROOT_USERNAME = '';
process.env.TEST_MONGODB_ROOT_PASSWORD = '';

// PostgreSQL para tests
if (!process.env.TEST_DATABASE_HOST) {
  process.env.TEST_DATABASE_HOST = 'localhost';
}

if (!process.env.TEST_DATABASE_PORT) {
  process.env.TEST_DATABASE_PORT = '5433';
}

if (!process.env.TEST_DATABASE_USERNAME) {
  process.env.TEST_DATABASE_USERNAME = 'postgres';
}

if (!process.env.TEST_DATABASE_PASSWORD) {
  process.env.TEST_DATABASE_PASSWORD = 'postgres';
}

if (!process.env.TEST_DATABASE) {
  process.env.TEST_DATABASE = 'guiders_test';
}

// IMPORTANTE: Deshabilitar schedulers en E2E
process.env.PRESENCE_INACTIVITY_ENABLED = 'false';
process.env.SESSION_CLEANUP_ENABLED = 'false';
process.env.TRACKING_AUTO_CLEANUP_ENABLED = 'false';
process.env.BUFFER_FLUSH_SCHEDULER_ENABLED = 'false';

console.log('🔧 E2E Test Setup configurado');
console.log(`🔧 MongoDB Test Host: ${process.env.TEST_MONGODB_HOST}:${process.env.TEST_MONGODB_PORT}`);
console.log(`🔧 PostgreSQL Test Host: ${process.env.TEST_DATABASE_HOST}:${process.env.TEST_DATABASE_PORT}`);
console.log('🔧 Schedulers deshabilitados para tests E2E');
```

### 2.3 Variables de Entorno: .env.test

**Ruta:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/.env.test`

```bash
# Configuración General
PORT=3001
DEBUG=false
NODE_ENV=test

# PostgreSQL para Tests
TEST_DATABASE_HOST=localhost
TEST_DATABASE_PORT=5433
TEST_DATABASE_USERNAME=postgres
TEST_DATABASE_PASSWORD=postgres
TEST_DATABASE=guiders_test

# MongoDB para Tests (sin auth en desarrollo local)
TEST_MONGODB_HOST=localhost
TEST_MONGODB_PORT=27018
TEST_MONGODB_DATABASE=guiders_test
TEST_MONGODB_ROOT_USERNAME=
TEST_MONGODB_ROOT_PASSWORD=

# Redis
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# Tokens
ENCRYPTION_KEY=0f0dd60415efd0a1d5c4409ed92fc1df3e4cfc517c4d3ad7d1e1d828f45f2bd4
GLOBAL_TOKEN_SECRET=test_global_token_secret_here
ACCESS_TOKEN_EXPIRATION=24h
REFRESH_TOKEN_EXPIRATION=30d

# URLs
APP_URL=http://localhost:3001
CORS_ALLOWED_ORIGINS=http://localhost:4200,http://localhost:4201,http://localhost:3001

# Email (deshabilitado)
RESEND_API_KEY=test_key
EMAIL_FROM=test@guiders.com

# LLM (deshabilitado)
LLM_ENABLED=false
LLM_PROVIDER=none

# Schedulers deshabilitados
PRESENCE_INACTIVITY_ENABLED=false
SESSION_CLEANUP_ENABLED=false
TRACKING_AUTO_CLEANUP_ENABLED=false
BUFFER_FLUSH_SCHEDULER_ENABLED=false
```

## 3. PATRONES DE TESTS E2E EN EL PROYECTO

### 3.1 Patrón 1: Tests con Mocks Completos (Sin BD Real)

**Archivo ejemplo:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/test/app.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // 1. CREAR MÓDULO DE TESTING
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: TokenVerifyService,
          useValue: { verifyToken: jest.fn() },
        },
      ],
    }).compile();

    // 2. INICIALIZAR APLICACIÓN
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['/docs', '/docs-json'] });
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // 3. ESCRIBIR TESTS
  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  it('/api/health (HEAD)', () => {
    return request(app.getHttpServer()).head('/api/health').expect(200);
  });
});
```

**Características:**
- ✅ Rápido (sin BD real)
- ✅ Aislado (mocks completos)
- ❌ No prueba persistencia
- ❌ No prueba integración real

### 3.2 Patrón 2: Tests con Guards Mockeados

**Archivo ejemplo:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/test/auth-user-me.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { AuthUserController } from '../src/context/auth/auth-user/infrastructure/controllers/auth-user.controller';
import { AuthUserService } from '../src/context/auth/auth-user/infrastructure/services/auth-user.service';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';
import { DualAuthGuard } from '../src/context/shared/infrastructure/guards/dual-auth.guard';
import { CqrsModule, QueryBus } from '@nestjs/cqrs';

// 1. CREAR MOCK GUARDS
class MockDualAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization as string | undefined;
    
    if (!auth) throw new UnauthorizedException('Token requerido');
    
    const token = auth.split(' ')[1];
    
    if (token === 'valid-admin-token') {
      req.user = {
        id: 'user-123',
        roles: ['admin'],
        username: 'Test Admin',
        email: 'admin@example.com',
        companyId: 'company-xyz',
      };
    } else if (token === 'valid-commercial-token') {
      req.user = {
        id: 'commercial-user-1',
        roles: ['commercial'],
        username: 'Commercial User',
        email: 'commercial@example.com',
        companyId: 'company-xyz',
      };
    } else {
      throw new UnauthorizedException('Token inválido');
    }
    
    return true;
  }
}

class MockRolesGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const roles: string[] = req.user?.roles ?? [];
    return roles.includes('admin') || roles.includes('commercial');
  }
}

describe('AuthUserController /user/auth/me (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // 2. CREAR MÓDULO CON GUARDS MOCKEADOS
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [AuthUserController],
      providers: [
        { provide: AuthUserService, useValue: mockAuthUserService },
        { provide: QueryBus, useClass: MockQueryBus },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockDualAuthGuard)
      .overrideGuard(DualAuthGuard)
      .useClass(MockDualAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // 3. TESTS CON TOKENS MOCKEADOS
  it('debe retornar 401 si no hay token', async () => {
    await request(app.getHttpServer())
      .get('/user/auth/me')
      .expect(401);
  });

  it('debe retornar la información del usuario (admin)', async () => {
    const res = await request(app.getHttpServer())
      .get('/user/auth/me')
      .set('Authorization', 'Bearer valid-admin-token')
      .expect(200);

    expect(res.body).toMatchObject({
      id: 'user-123',
      email: 'admin@example.com',
      roles: ['admin'],
    });
  });

  it('debe permitir rol commercial', async () => {
    const res = await request(app.getHttpServer())
      .get('/user/auth/me')
      .set('Authorization', 'Bearer valid-commercial-token')
      .expect(200);

    expect(res.body.roles).toContain('commercial');
  });
});
```

**Características:**
- ✅ Prueba flujo HTTP completo
- ✅ Valida Guards y autenticación
- ✅ Tests con múltiples roles
- ❌ Sin persistencia de BD

### 3.3 Patrón 3: Tests con CommandBus/QueryBus Mockeados

**Archivo ejemplo:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/test/message-v2.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MessageV2Controller } from '../src/context/conversations-v2/infrastructure/controllers/message-v2.controller';
import { QueryBus, CommandBus } from '@nestjs/cqrs';

describe('MessageV2Controller (e2e)', () => {
  let app: INestApplication;
  let queryBus: QueryBus;
  let commandBus: CommandBus;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MessageV2Controller],
      providers: [
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(OptionalAuthGuard)
      .useClass(MockOptionalAuthGuard)
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    queryBus = moduleFixture.get<QueryBus>(QueryBus);
    commandBus = moduleFixture.get<CommandBus>(CommandBus);

    // 1. MOCKEAR COMPORTAMIENTO DE QUERYBUS
    (queryBus.execute as jest.Mock).mockImplementation((query) => {
      if (query.constructor.name === 'GetChatMessagesQuery') {
        return Promise.resolve({
          messages: [],
          total: 0,
          hasMore: false,
          nextCursor: undefined,
        });
      }
      if (query.constructor.name === 'GetUnreadMessagesQuery') {
        return Promise.resolve([]);
      }
      return Promise.resolve({});
    });

    // 2. MOCKEAR COMPORTAMIENTO DE COMMANDBUS
    (commandBus.execute as jest.Mock).mockImplementation((command) => {
      if (command.constructor.name === 'SendMessageCommand') {
        throw new Error('Funcionalidad no implementada');
      }
      if (command.constructor.name === 'MarkMessagesAsReadCommand') {
        return Promise.resolve({
          success: true,
          markedCount: command.messageIds?.length || 0,
        });
      }
      return Promise.resolve({});
    });

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // 3. TESTS
  it('should have the controller registered', () => {
    const controller = app.get(MessageV2Controller);
    expect(controller).toBeDefined();
  });

  it('should return empty message list for valid chat', () => {
    return request(app.getHttpServer())
      .get('/v2/messages/chat/550e8400-e29b-41d4-a716-446655440000')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          messages: [],
          total: 0,
          hasMore: false,
          nextCursor: undefined,
        });
      });
  });

  it('should mark messages as read successfully', () => {
    return request(app.getHttpServer())
      .put('/v2/messages/mark-as-read')
      .send({
        messageIds: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ],
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          success: true,
          markedCount: 2,
        });
      });
  });
});
```

**Características:**
- ✅ Prueba flujo CQRS completo
- ✅ Mockea respuestas de bus dinámicamente
- ✅ Valida entrada/salida
- ❌ Sin persistencia real

### 3.4 Patrón 4: Tests con Repositorios Mockeados

**Archivo ejemplo:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/test/visitors-v2.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { VisitorV2Controller } from '../src/context/visitors-v2/infrastructure/controllers/visitor-v2.controller';
import { VisitorV2Repository, VISITOR_V2_REPOSITORY } from '../src/context/visitors-v2/domain/visitor-v2.repository';
import { CompanyRepository, COMPANY_REPOSITORY } from '../src/context/company/domain/company.repository';
import { IdentifyVisitorCommandHandler } from '../src/context/visitors-v2/application/commands/identify-visitor.command-handler';
import { VisitorV2 } from '../src/context/visitors-v2/domain/visitor-v2.aggregate';

describe('Visitors E2E', () => {
  let app: INestApplication;
  let mockVisitorRepository: jest.Mocked<VisitorV2Repository>;
  let mockCompanyRepository: jest.Mocked<CompanyRepository>;

  // CREAR DATOS MOCK
  const mockVisitorId = '01234567-8901-4234-9567-890123456789';
  const mockTenantId = '23456789-0123-4567-8901-234567890123';
  const mockSiteId = '34567890-1234-4567-8901-234567890123';

  beforeEach(async () => {
    // 1. CREAR MOCK REPOSITORIES
    mockVisitorRepository = {
      findByFingerprintAndSite: jest.fn(),
      findByFingerprint: jest.fn(),
      findBySessionId: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findBySiteId: jest.fn(),
      findByTenantId: jest.fn(),
      update: jest.fn(),
    };

    mockCompanyRepository = {
      findByDomain: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    };

    // 2. CREAR MÓDULO CON MOCKS
    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [VisitorV2Controller],
      providers: [
        IdentifyVisitorCommandHandler,
        {
          provide: VISITOR_V2_REPOSITORY,
          useValue: mockVisitorRepository,
        },
        {
          provide: COMPANY_REPOSITORY,
          useValue: mockCompanyRepository,
        },
      ],
    })
      .overrideGuard(DualAuthGuard)
      .useClass(MockDualAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // 3. TESTS
  it('debe identificar un visitante existente', async () => {
    const visitor = VisitorV2.create({
      id: new VisitorId(mockVisitorId),
      tenantId: new TenantId(mockTenantId),
      siteId: new SiteId(mockSiteId),
      fingerprint: new VisitorFingerprint('fp_abc123'),
      lifecycle: new VisitorLifecycleVO(VisitorLifecycle.ANON),
    });

    mockVisitorRepository.findByFingerprintAndSite.mockResolvedValue(
      ok(visitor),
    );

    const response = await request(app.getHttpServer())
      .post('/v2/visitors/identify')
      .send({
        fingerprint: 'fp_abc123',
        siteId: mockSiteId,
      })
      .expect(200);

    expect(response.body.visitorId).toBe(mockVisitorId);
    expect(mockVisitorRepository.findByFingerprintAndSite).toHaveBeenCalled();
  });

  it('debe crear un visitante nuevo si no existe', async () => {
    mockVisitorRepository.findByFingerprintAndSite.mockResolvedValue(
      err(new VisitorNotFoundError()),
    );

    const newVisitor = VisitorV2.create({
      id: new VisitorId(mockVisitorId),
      tenantId: new TenantId(mockTenantId),
      siteId: new SiteId(mockSiteId),
      fingerprint: new VisitorFingerprint('fp_new123'),
      lifecycle: new VisitorLifecycleVO(VisitorLifecycle.ANON),
    });

    mockVisitorRepository.save.mockResolvedValue(ok(newVisitor));

    const response = await request(app.getHttpServer())
      .post('/v2/visitors/identify')
      .send({
        fingerprint: 'fp_new123',
        siteId: mockSiteId,
      })
      .expect(201);

    expect(response.body.visitorId).toBeDefined();
    expect(mockVisitorRepository.save).toHaveBeenCalled();
  });
});
```

**Características:**
- ✅ Prueba lógica de agregados
- ✅ Valida persistencia (mocked)
- ✅ Manejo de errores
- ✅ Creación de datos complejos

## 4. ENDPOINTS PRINCIPALES POR CONTEXTO

### 4.1 Autenticación de Usuarios

**Controller:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/src/context/auth/auth-user/infrastructure/controllers/auth-user.controller.ts`

```typescript
@Controller('user/auth')
export class AuthUserController {

  // POST /user/auth/login
  @Post('login')
  @PublicEndpoint()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const tokens = await this.authUserService.login(email, password);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    };
  }

  // POST /user/auth/register
  @Post('register')
  async register(
    @Body() registerDto: RegisterRequestDto,
  ): Promise<{ userId: string }> {
    // Crear nuevo usuario
  }

  // POST /user/auth/refresh
  @Post('refresh')
  async refresh(
    @Body() refreshDto: RefreshTokenRequestDto,
  ): Promise<RefreshTokenResponseDto> {
    // Renovar token
  }

  // GET /user/auth/me
  @Get('me')
  @UseGuards(DualAuthGuard, RolesGuard)
  @Roles(['admin', 'commercial'])
  async getCurrentUser(
    @Req() req: AuthenticatedRequest,
  ): Promise<CurrentUserResponseDto> {
    // Obtener usuario actual
  }
}
```

### 4.2 Autenticación de Visitantes (Pixel/Widget)

**Controller:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/src/context/auth/auth-visitor/infrastructure/auth-visitor.controller.ts`

```typescript
@Controller('pixel')
export class AuthVisitorController {

  // POST /pixel/token
  // Obtener tokens para visitante existente
  @Post('token')
  @PublicEndpoint()
  async getToken(
    @Body() body: TokenRequestDto,
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
  ): Promise<TokensResponseDto> {
    // Validar origen y devolver tokens
    return {
      access_token: visitorToken,
      refresh_token: refreshToken,
    };
  }

  // POST /pixel/register
  // Registrar visitante + emitir tokens
  @Post('register')
  @PublicEndpoint()
  async register(
    @Body() body: RegisterVisitorRequestDto,
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
  ): Promise<TokensResponseDto> {
    // Registrar si no existe y devolver tokens
  }
}
```

### 4.3 Chats (Conversations V2)

**Controller:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/src/context/conversations-v2/infrastructure/controllers/chat-v2.controller.ts`

```typescript
@Controller('v2/chats')
export class ChatV2Controller {

  // POST /v2/chats
  // Crear nuevo chat
  @Post()
  @UseGuards(DualAuthGuard, RolesGuard)
  @Roles(['visitor', 'commercial', 'admin'])
  async createChat(
    @Body() createChatDto: CreateChatRequestDto = {},
    @Req() req: AuthenticatedRequest,
  ): Promise<{ chatId: string; position: number }> {
    // El visitorId viene de req.user.id
  }

  // POST /v2/chats/with-message
  // Crear chat con primer mensaje
  @Post('with-message')
  @UseGuards(DualAuthGuard, RolesGuard)
  @Roles(['visitor', 'commercial', 'admin'])
  async createChatWithMessage(
    @Body() dto: CreateChatWithMessageRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CreateChatWithMessageResponseDto> {
    // Crear chat + enviar primer mensaje en una transacción
  }

  // GET /v2/chats
  // Listar chats del usuario
  @Get()
  @UseGuards(DualAuthGuard, RolesGuard)
  @Roles(['visitor', 'commercial', 'admin'])
  async listChats(
    @Query() query: GetChatsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ChatListResponseDto> {
    // Filtrar por usuario y retornar lista paginada
  }

  // GET /v2/chats/:chatId
  // Obtener detalles de un chat
  @Get(':chatId')
  @UseGuards(DualAuthGuard, RolesGuard)
  async getChatById(
    @Param('chatId') chatId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ChatResponseDto> {
    // Retornar datos del chat
  }

  // PUT /v2/chats/:chatId/assign/:commercialId
  // Asignar chat a comercial
  @Put(':chatId/assign/:commercialId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(['admin', 'supervisor'])
  async assignChat(
    @Param('chatId') chatId: string,
    @Param('commercialId') commercialId: string,
  ): Promise<{ success: boolean }> {
    // Asignar chat
  }

  // PUT /v2/chats/:chatId/close
  // Cerrar chat
  @Put(':chatId/close')
  @UseGuards(DualAuthGuard, RolesGuard)
  async closeChat(
    @Param('chatId') chatId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    // Cerrar chat
  }

  // PUT /v2/chats/:chatId/unread/reset
  // Resetear conteo de no leídos
  @Put(':chatId/unread/reset')
  @UseGuards(DualAuthGuard, RolesGuard)
  async resetUnreadCount(
    @Param('chatId') chatId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    // Resetear no leídos
  }
}
```

### 4.4 Mensajes (Messages V2)

**Controller:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/src/context/conversations-v2/infrastructure/controllers/message-v2.controller.ts`

```typescript
@Controller('v2/messages')
export class MessageV2Controller {

  // POST /v2/messages
  // Enviar nuevo mensaje
  @Post()
  @UseGuards(OptionalAuthGuard, RolesGuard)
  @Roles(['commercial', 'admin', 'supervisor', 'visitor'])
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto> {
    // chatId, content, type, isInternal, attachment
  }

  // GET /v2/messages/chat/:chatId
  // Obtener mensajes de un chat (paginado)
  @Get('chat/:chatId')
  @UseGuards(OptionalAuthGuard, RolesGuard)
  @Roles(['commercial', 'admin', 'supervisor', 'visitor'])
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getChatMessages(
    @Param('chatId') chatId: string,
    @Query() filters: GetMessagesDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageListResponseDto> {
    // cursor, limit, sortBy, direction
  }

  // PUT /v2/messages/mark-as-read
  // Marcar mensajes como leídos
  @Put('mark-as-read')
  @UseGuards(OptionalAuthGuard, RolesGuard)
  @Roles(['commercial', 'admin', 'supervisor', 'visitor'])
  async markAsRead(
    @Body() dto: MarkAsReadDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; markedCount: number }> {
    // messageIds: string[]
  }

  // GET /v2/messages/chat/:chatId/unread
  // Obtener mensajes no leídos de un chat
  @Get('chat/:chatId/unread')
  async getUnreadMessages(
    @Param('chatId') chatId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageListResponseDto> {
    // Solo mensajes sin leer
  }
}
```

### 4.5 Visitantes (Visitors V2)

**Controller:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/src/context/visitors-v2/infrastructure/controllers/visitor-v2.controller.ts`

```typescript
@Controller('v2/visitors')
export class VisitorV2Controller {

  // POST /v2/visitors/identify
  // Identificar visitante (crear o retornar existente)
  @Post('identify')
  @UseGuards(OptionalAuthGuard)
  async identifyVisitor(
    @Body() dto: IdentifyVisitorDto,
    @Headers('origin') origin?: string,
  ): Promise<{ visitorId: string; sessionId: string; token: string }> {
    // fingerprint, siteDomain, siteId
    // Retorna sessionId y token JWT para futuras requests
  }

  // POST /v2/visitors/session/end
  // Terminar sesión de visitante
  @Post('session/end')
  async endSession(
    @Body() dto: EndSessionDto,
  ): Promise<{ success: boolean }> {
    // sessionId
  }

  // GET /v2/visitors/:visitorId/activity
  // Obtener actividad del visitante
  @Get(':visitorId/activity')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(['admin', 'commercial'])
  async getVisitorActivity(
    @Param('visitorId') visitorId: string,
  ): Promise<VisitorActivityDto> {
    // Actividad, chats, tracking events, etc.
  }
}
```

## 5. PATRONES DE AUTENTICACIÓN EN TESTS

### 5.1 Patrón: Bearer Token (JWT para usuarios internos)

```typescript
// Crear token en tests (si necesitas token real)
const token = jwt.sign(
  {
    sub: 'user-123',
    roles: ['admin'],
    email: 'admin@example.com',
  },
  process.env.GLOBAL_TOKEN_SECRET,
  { expiresIn: '24h' },
);

// Usar en requests
await request(app.getHttpServer())
  .get('/user/auth/me')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);
```

### 5.2 Patrón: Mock Guard con Tokens Simulados

```typescript
class MockDualAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;

    if (!auth) throw new UnauthorizedException('Token requerido');

    const token = auth.split(' ')[1];

    // Tokens simulados - el guard decide qué usuario es
    if (token === 'valid-admin-token') {
      req.user = {
        id: 'admin-123',
        roles: ['admin'],
        email: 'admin@test.com',
      };
    } else if (token === 'valid-visitor-token') {
      req.user = {
        id: 'visitor-456',
        roles: ['visitor'],
        email: 'visitor@test.com',
      };
    } else {
      throw new UnauthorizedException('Token inválido');
    }

    return true;
  }
}

// Uso en test
await request(app.getHttpServer())
  .post('/v2/chats')
  .set('Authorization', 'Bearer valid-visitor-token')
  .send({ visitorInfo: { name: 'Test Visitor' } })
  .expect(201);
```

### 5.3 Patrón: Cookie de Sesión (para visitantes)

```typescript
// El header X-Guiders-Sid o cookie sid
await request(app.getHttpServer())
  .post('/v2/messages')
  .set('Cookie', ['sid=temp_1758226307441_5bjqvmz1vf3'])
  .set('X-Guiders-Sid', 'temp_1758226307441_5bjqvmz1vf3')
  .send({
    chatId: 'chat-123',
    content: 'Hola',
    type: 'text',
  })
  .expect(201);
```

## 6. ESTRUCTURA TÍPICA DE UN TEST E2E

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

describe('ChatV2Controller (E2E)', () => {
  let app: INestApplication;
  let mockRepository: jest.Mocked<ChatRepository>;

  // ===== SETUP =====
  beforeAll(async () => {
    // 1. Crear mocks
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByVisitorId: jest.fn(),
      // ... otros métodos
    };

    // 2. Crear módulo de testing
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [ChatV2Controller],
      providers: [
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    })
      .overrideGuard(DualAuthGuard)
      .useClass(MockDualAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    // 3. Crear aplicación NestJS
    app = moduleFixture.createNestApplication();
    
    // 4. Registrar pipes globales
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // 5. Inicializar
    await app.init();
  });

  // ===== CLEANUP =====
  afterAll(async () => {
    await app.close();
  });

  // ===== TESTS =====
  describe('POST /v2/chats - Crear chat', () => {
    it('debe crear un chat exitosamente', async () => {
      // Arrange
      const mockChat = {
        id: 'chat-123',
        visitorId: 'visitor-456',
        status: 'OPEN',
        position: 1,
      };
      
      mockRepository.save.mockResolvedValue(ok(mockChat));

      // Act
      const response = await request(app.getHttpServer())
        .post('/v2/chats')
        .set('Authorization', 'Bearer valid-visitor-token')
        .send({
          visitorInfo: {
            name: 'Test Visitor',
            email: 'test@example.com',
          },
        });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.chatId).toBe('chat-123');
      expect(mockRepository.save).toHaveBeenCalledWith(expect.any(Object));
    });

    it('debe retornar 401 sin token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v2/chats')
        .send({ visitorInfo: { name: 'Test' } });

      expect(response.status).toBe(401);
    });

    it('debe validar estructura del body', async () => {
      const response = await request(app.getHttpServer())
        .post('/v2/chats')
        .set('Authorization', 'Bearer valid-visitor-token')
        .send({ invalidField: 'test' });

      // ValidationPipe rechaza campos no esperados
      expect(response.status).toBe(400);
    });
  });

  describe('GET /v2/chats/:chatId - Obtener chat', () => {
    it('debe retornar chat existente', async () => {
      const mockChat = {
        id: 'chat-123',
        visitorId: 'visitor-456',
        status: 'OPEN',
        messages: [],
      };

      mockRepository.findById.mockResolvedValue(ok(mockChat));

      const response = await request(app.getHttpServer())
        .get('/v2/chats/chat-123')
        .set('Authorization', 'Bearer valid-visitor-token');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('chat-123');
    });

    it('debe retornar 404 para chat inexistente', async () => {
      mockRepository.findById.mockResolvedValue(
        err(new ChatNotFoundError('chat-999')),
      );

      const response = await request(app.getHttpServer())
        .get('/v2/chats/chat-999')
        .set('Authorization', 'Bearer valid-visitor-token');

      expect(response.status).toBe(404);
    });
  });
});
```

## 7. HELPERS Y UTILIDADES

### 7.1 MongoTestHelper

**Ruta:** `/Users/rogerpugaruiz/Proyectos/guiders-backend/test/helpers/mongo-test.helper.ts`

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';

export class MongoTestHelper {
  private static mongoServer: MongoMemoryServer | null = null;

  /**
   * Configura MongoDB para tests E2E
   * - CI: Usa servicio MongoDB real (docker-compose)
   * - Local: Puede usar Memory Server o MongoDB real
   */
  static getMongooseModule(): any {
    const isCI =
      process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

    if (isCI) {
      // En CI: usar MongoDB real
      const mongoHost = process.env.TEST_MONGODB_HOST || 'localhost';
      const mongoPort = process.env.TEST_MONGODB_PORT || '27017';
      const mongoDatabase = process.env.TEST_MONGODB_DATABASE || 'guiders_test';
      const mongoUser = process.env.TEST_MONGODB_ROOT_USERNAME || 'admin_test';
      const mongoPassword =
        process.env.TEST_MONGODB_ROOT_PASSWORD || 'test_password';

      const uri = `mongodb://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoHost}:${mongoPort}/${mongoDatabase}?authSource=admin`;

      return MongooseModule.forRoot(uri, {
        connectTimeoutMS: 30000,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 30000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
        retryReads: true,
      });
    } else {
      // En local: configuración normal
      const uri = `mongodb://localhost:27018/guiders_test`;

      return MongooseModule.forRoot(uri, {
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 5,
      });
    }
  }

  static async cleanup(): Promise<void> {
    if (this.mongoServer) {
      console.log('🧹 Deteniendo MongoDB Memory Server...');
      await this.mongoServer.stop();
      this.mongoServer = null;
    }
  }
}
```

## 8. CHECKLIST: CREAR UN TEST E2E NUEVO

```typescript
// ✅ 1. Importar necesario
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';

// ✅ 2. Definir interfaces mock si necesitas
interface MockRequest {
  headers: { authorization?: string };
  user?: { id: string; roles: string[] };
}

// ✅ 3. Crear Guards mock si necesitas autenticación
class MockAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<MockRequest>();
    const auth = req.headers.authorization;

    if (!auth) throw new UnauthorizedException();

    req.user = {
      id: 'test-user-123',
      roles: ['admin'],
    };

    return true;
  }
}

// ✅ 4. Crear describe block
describe('MyController (E2E)', () => {
  let app: INestApplication;

  // ✅ 5. beforeAll: setup
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MyController],
      providers: [
        // Mocks aquí
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  // ✅ 6. afterAll: cleanup
  afterAll(async () => {
    await app.close();
  });

  // ✅ 7. Tests organizados por endpoint
  describe('POST /my-endpoint', () => {
    it('debe hacer X correctamente', async () => {
      const response = await request(app.getHttpServer())
        .post('/my-endpoint')
        .set('Authorization', 'Bearer test-token')
        .send({ field: 'value' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('debe retornar 401 sin autenticación', async () => {
      const response = await request(app.getHttpServer())
        .post('/my-endpoint')
        .send({ field: 'value' });

      expect(response.status).toBe(401);
    });

    it('debe validar el body', async () => {
      const response = await request(app.getHttpServer())
        .post('/my-endpoint')
        .set('Authorization', 'Bearer test-token')
        .send({}); // body vacío

      expect(response.status).toBe(400);
    });
  });

  describe('GET /my-endpoint/:id', () => {
    it('debe retornar el recurso', async () => {
      // Setup mock si necesitas
      // mockRepository.findById.mockResolvedValue(ok(mockData));

      const response = await request(app.getHttpServer())
        .get('/my-endpoint/123')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('123');
    });

    it('debe retornar 404 para ID inexistente', async () => {
      // mockRepository.findById.mockResolvedValue(err(new NotFoundError()));

      const response = await request(app.getHttpServer())
        .get('/my-endpoint/999')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });
  });
});
```

## 9. TIPS Y BUENAS PRÁCTICAS

### ✅ DO's (Hacer)

1. **Usar nombres descriptivos**
   ```typescript
   it('debe crear un chat para un visitante autenticado', () => {
     // Claro qué se prueba
   });
   ```

2. **AAA Pattern: Arrange, Act, Assert**
   ```typescript
   it('debe...', async () => {
     // ARRANGE: Setup datos de prueba
     const mockData = { id: '123' };
     mockRepo.findById.mockResolvedValue(ok(mockData));

     // ACT: Ejecutar la acción
     const response = await request(app.getHttpServer()).get('/endpoint/123');

     // ASSERT: Verificar resultado
     expect(response.status).toBe(200);
     expect(response.body.id).toBe('123');
   });
   ```

3. **Usar beforeEach para limpiar mocks**
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

4. **Probar casos de error**
   ```typescript
   it('debe retornar 404 para recurso inexistente', async () => {
     mockRepo.findById.mockResolvedValue(err(new NotFoundError()));

     const response = await request(app.getHttpServer()).get('/endpoint/999');

     expect(response.status).toBe(404);
   });
   ```

5. **Usar UUIDs reales en tests**
   ```typescript
   // ✅ Correcto
   const visitorId = '550e8400-e29b-41d4-a716-446655440000';

   // ❌ Evitar
   const visitorId = 'visitor-1';
   ```

### ❌ DON'Ts (No hacer)

1. **No usar `any`**
   ```typescript
   // ❌
   const repo: any = { findById: jest.fn() };

   // ✅
   const repo: jest.Mocked<Repository> = { findById: jest.fn() };
   ```

2. **No olvidar await**
   ```typescript
   // ❌
   request(app.getHttpServer()).post('/endpoint');

   // ✅
   await request(app.getHttpServer()).post('/endpoint');
   ```

3. **No dejar tests con `.skip` o `.only`**
   ```typescript
   // ❌ Esto desactiva otros tests
   it.only('solo este test', () => {});

   // ✅ Ejecutar con grep
   npm run test:e2e -- --testNamePattern="patrón"
   ```

4. **No mezclar tests de diferentes contextos sin necesidad**
   - Cada test E2E debe ser independiente
   - Usar mocks en lugar de crear dependencias reales

5. **No ignorar errores de validación**
   ```typescript
   // ❌ Pasar
   const response = await request(app.getHttpServer())
     .post('/endpoint')
     .send({ invalidField: 'test' });
   
   // Si ValidationPipe está habilitado, esperar 400

   // ✅
   expect(response.status).toBe(400);
   expect(response.body.message).toContain('validation');
   ```

## 10. EJEMPLOS COMPLETOS POR CONTEXTO

### Ejemplo 1: Test de Login

```typescript
// test/auth-user-login.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthUserController } from '../src/context/auth/auth-user/infrastructure/controllers/auth-user.controller';
import { AuthUserService } from '../src/context/auth/auth-user/infrastructure/services/auth-user.service';

describe('AuthUserController - Login', () => {
  let app: INestApplication;
  let mockAuthUserService: jest.Mocked<AuthUserService>;

  beforeAll(async () => {
    mockAuthUserService = {
      login: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthUserController],
      providers: [
        {
          provide: AuthUserService,
          useValue: mockAuthUserService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /user/auth/login', () => {
    it('debe retornar tokens para credenciales válidas', async () => {
      mockAuthUserService.login.mockResolvedValue({
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      });

      const response = await request(app.getHttpServer())
        .post('/user/auth/login')
        .send({
          email: 'admin@guiders.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(typeof response.body.access_token).toBe('string');
    });

    it('debe retornar 400 sin email', async () => {
      const response = await request(app.getHttpServer())
        .post('/user/auth/login')
        .send({
          password: 'SomePassword',
        })
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('debe retornar 401 para credenciales inválidas', async () => {
      mockAuthUserService.login.mockRejectedValue(
        new UnauthorizedError('Invalid credentials'),
      );

      const response = await request(app.getHttpServer())
        .post('/user/auth/login')
        .send({
          email: 'admin@guiders.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.message).toContain('credentials');
    });
  });
});
```

### Ejemplo 2: Test de Crear Chat

```typescript
// test/chat-v2-create.e2e-spec.ts
describe('ChatV2Controller - Create Chat', () => {
  let app: INestApplication;
  let mockChatRepository: jest.Mocked<ChatRepository>;

  beforeAll(async () => {
    mockChatRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByVisitorId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [ChatV2Controller],
      providers: [
        JoinWaitingRoomCommandHandler,
        {
          provide: CHAT_V2_REPOSITORY,
          useValue: mockChatRepository,
        },
      ],
    })
      .overrideGuard(DualAuthGuard)
      .useClass(MockDualAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v2/chats', () => {
    it('debe crear un chat para un visitante autenticado', async () => {
      const mockChat = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        visitorId: 'visitor-123',
        status: 'OPEN',
        position: 1,
      };

      mockChatRepository.save.mockResolvedValue(ok(mockChat));

      const response = await request(app.getHttpServer())
        .post('/v2/chats')
        .set('Authorization', 'Bearer valid-visitor-token')
        .send({
          visitorInfo: {
            name: 'Juan Pérez',
            email: 'juan@example.com',
          },
          metadata: {
            source: 'website',
            page: '/contact',
          },
        })
        .expect(201);

      expect(response.body).toEqual({
        chatId: '550e8400-e29b-41d4-a716-446655440000',
        position: 1,
      });

      expect(mockChatRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          visitorId: 'visitor-123',
        }),
      );
    });

    it('debe colocar el chat en posición correcta en la cola', async () => {
      const mockChat = {
        id: 'chat-uuid-2',
        visitorId: 'visitor-456',
        status: 'OPEN',
        position: 5, // Hay 4 chats en espera
      };

      mockChatRepository.save.mockResolvedValue(ok(mockChat));

      const response = await request(app.getHttpServer())
        .post('/v2/chats')
        .set('Authorization', 'Bearer valid-visitor-token')
        .send({})
        .expect(201);

      expect(response.body.position).toBe(5);
    });

    it('debe retornar 401 sin autenticación', async () => {
      const response = await request(app.getHttpServer())
        .post('/v2/chats')
        .send({})
        .expect(401);
    });

    it('debe validar email en visitorInfo', async () => {
      const response = await request(app.getHttpServer())
        .post('/v2/chats')
        .set('Authorization', 'Bearer valid-visitor-token')
        .send({
          visitorInfo: {
            email: 'invalid-email', // Email inválido
          },
        })
        .expect(400);

      expect(response.body.message).toContain('email');
    });
  });
});
```

---

**Guardado en:** `/tmp/GUIDERS_E2E_TEST_GUIDE.md`

