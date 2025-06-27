import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  ForbiddenException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { ChatController } from '../src/context/conversations/chat/infrastructure/chat.controller';
import {
  CqrsModule,
  QueryBus,
  CommandBus,
  IQueryHandler,
  QueryHandler,
  CommandHandler,
  ICommandHandler,
} from '@nestjs/cqrs';
import { ChatService } from '../src/context/conversations/chat/infrastructure/chat.service';
import { AuthGuard } from '../src/context/shared/infrastructure/guards/auth.guard';
import { RolesGuard } from '../src/context/shared/infrastructure/guards/role.guard';
import { FindChatListWithFiltersQuery } from '../src/context/conversations/chat/application/read/find-chat-list-with-filters.query';
import { StartChatCommand } from '../src/context/conversations/chat/application/create/pending/start-chat.command';
import { CompanyService } from '../src/context/conversations/chat/infrastructure/services/company/company.service';
import { FindCompanyByDomainQuery } from '../src/context/company/application/queries/find-company-by-domain.query';
import { FindCompanyByDomainResponseDto } from '../src/context/company/application/dtos/find-company-by-domain-response.dto';

// Definición local para evitar problemas de importación
interface ChatListResponse {
  chats: unknown[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

interface MockUser {
  id: string;
  roles: string[];
  username: string;
  email: string;
}

interface MockRequest {
  headers: {
    authorization?: string;
  };
  user?: MockUser;
}

// Handler para FindChatListWithFiltersQuery que implementa la lógica de test
@Injectable()
@QueryHandler(FindChatListWithFiltersQuery)
class FindChatListWithFiltersQueryHandler
  implements IQueryHandler<FindChatListWithFiltersQuery>
{
  async execute(
    query: FindChatListWithFiltersQuery,
  ): Promise<ChatListResponse> {
    // Lógica de prueba para el handler
    const { limit = 20, include = [] } = query;
    // Usamos 'participantId' para evitar error de variable no utilizada
    await Promise.resolve(query.participantId);

    // Simula diferentes respuestas basadas en los parámetros de la consulta
    const chats = Array(Math.min(limit, 3))
      .fill(0)
      .map((_, index) => ({
        id: `test-chat-${index + 1}`,
        // Si se solicita lastMessage y timestamp, incluirlos
        ...(include.includes('lastMessage')
          ? { lastMessage: { text: 'Mensaje de prueba' } }
          : {}),
        ...(include.includes('timestamp')
          ? { timestamp: new Date().toISOString() }
          : {}),
      }));

    // Lógica de paginación para pruebas
    const hasMore = limit < 5; // Simula que hay más resultados si el límite es bajo

    return {
      chats,
      total: hasMore ? 10 : chats.length, // Simula un total mayor si hay más resultados
      hasMore,
      nextCursor: hasMore ? 'next-page-cursor-mock' : null,
    };
  }
}

// Handler para StartChat que implementa la lógica de test
@Injectable()
@CommandHandler(StartChatCommand)
class StartChatCommandHandler implements ICommandHandler<StartChatCommand> {
  async execute(command: StartChatCommand): Promise<void> {
    // Aquí solo simulamos la ejecución exitosa usando 'command' para evitar error de variable no utilizada
    await Promise.resolve(command.chatId);
    // En un caso real, esto crearía un chat en la base de datos
    return Promise.resolve();
  }
}

// Handler para FindCompanyByDomainQuery que implementa la lógica de test
@Injectable()
@QueryHandler(FindCompanyByDomainQuery)
class FindCompanyByDomainQueryHandler
  implements IQueryHandler<FindCompanyByDomainQuery>
{
  async execute(
    query: FindCompanyByDomainQuery,
  ): Promise<FindCompanyByDomainResponseDto | null> {
    // Simulamos que cualquier dominio que contenga 'test' tiene una empresa
    if (query.domain.includes('test')) {
      return await Promise.resolve(
        new FindCompanyByDomainResponseDto('test-company-id', 'Test Company', [
          'test.com',
          'testing.com',
        ]),
      );
    }
    return await Promise.resolve(null);
  }
}

// Mock para AuthGuard que simula autenticación exitosa
class MockAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No se a encontrado el token');
    }

    // Determinar el rol basado en el token mock
    let roles = ['commercial']; // Default
    if (authHeader.includes('visitor-token')) {
      roles = ['visitor'];
    }

    // Simular usuario autenticado
    request.user = {
      id: 'test-user-id',
      roles: roles,
      username: 'test-user',
      email: 'test@example.com',
    };

    return true;
  }
}

// Mock para RolesGuard que verifica roles
class MockRolesGuard {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<MockRequest>();
    const user = request.user;

    // Si no hay usuario, el AuthGuard ya debería haber fallado
    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    // Verificar si el usuario tiene rol 'commercial'
    if (!user.roles.includes('commercial')) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}

describe('Chat Controller (e2e) con QueryBus y CommandBus reales', () => {
  let app: INestApplication<App>;
  let queryBus: QueryBus;
  let commandBus: CommandBus;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      // Importamos CqrsModule para usar los buses reales
      imports: [CqrsModule],
      providers: [
        // Proveemos el servicio real
        ChatService,
        // Servicio Company
        CompanyService,
        // Proporcionamos los handlers para las queries y comandos
        FindChatListWithFiltersQueryHandler,
        StartChatCommandHandler,
        FindCompanyByDomainQueryHandler,
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    // Obtenemos acceso a los buses para pruebas específicas
    queryBus = module.get<QueryBus>(QueryBus);
    commandBus = module.get<CommandBus>(CommandBus);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /chats', () => {
    it('debe rechazar acceso sin token de autenticación', () => {
      return request(app.getHttpServer()).get('/chats').expect(401);
    });

    it('debe rechazar acceso con rol no commercial', async () => {
      // Mock de token con rol visitor
      const mockToken = 'mock-visitor-token';

      return request(app.getHttpServer())
        .get('/chats')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403); // Forbidden - role insuficiente
    });

    it('debe permitir acceso con rol commercial y retornar lista de chats', async () => {
      const mockToken = 'mock-commercial-token';

      return request(app.getHttpServer())
        .get('/chats')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('chats');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('hasMore');
          expect(res.body).toHaveProperty('nextCursor');
          expect(Array.isArray((res.body as ChatListResponse).chats)).toBe(
            true,
          );
          expect(typeof (res.body as ChatListResponse).total).toBe('number');
          expect(typeof (res.body as ChatListResponse).hasMore).toBe('boolean');
        });
    });

    it('debe soportar parámetro limit', async () => {
      const mockToken = 'mock-commercial-token';

      return request(app.getHttpServer())
        .get('/chats?limit=2')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('chats');
          expect(Array.isArray((res.body as ChatListResponse).chats)).toBe(
            true,
          );
          expect(
            (res.body as ChatListResponse).chats.length,
          ).toBeLessThanOrEqual(2);
        });
    });

    it('debe soportar parámetro include', async () => {
      const mockToken = 'mock-commercial-token';

      return request(app.getHttpServer())
        .get('/chats?include=lastMessage,timestamp')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('chats');
          const chats = (res.body as ChatListResponse).chats;
          // Verificar que los chats incluyan lastMessage y timestamp
          if (chats.length > 0) {
            expect(chats[0]).toHaveProperty('lastMessage');
            expect(chats[0]).toHaveProperty('timestamp');
          }
        });
    });
  });

  describe('Tests directos de QueryBus y CommandBus', () => {
    it('debe ejecutar correctamente FindChatListWithFiltersQuery', async () => {
      const query = new FindChatListWithFiltersQuery('test-participant-id', 5, [
        'lastMessage',
      ]);
      const result = await queryBus.execute(query);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('chats');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
      expect(Array.isArray(result.chats)).toBe(true);
    });

    it('debe ejecutar correctamente StartChatCommand', async () => {
      const command = new StartChatCommand(
        'chat-id',
        'visitor-id',
        'Visitor Name',
      );

      // Verificar que la ejecución no lance errores
      await expect(commandBus.execute(command)).resolves.not.toThrow();
    });
  });
});
