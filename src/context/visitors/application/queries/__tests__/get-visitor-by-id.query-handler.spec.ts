import { Test, TestingModule } from '@nestjs/testing';
import { GetVisitorByIdQueryHandler } from '../get-visitor-by-id.query-handler';
import { GetVisitorByIdQuery } from '../get-visitor-by-id.query';
import {
  IVisitorRepository,
  VISITOR_REPOSITORY,
} from 'src/context/visitors/domain/visitor.repository';
import { Visitor } from 'src/context/visitors/domain/visitor';
import { ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';

describe('GetVisitorByIdQueryHandler', () => {
  let handler: GetVisitorByIdQueryHandler;
  let mockVisitorRepository: Partial<IVisitorRepository>;

  // Mock de visitante para pruebas
  const mockVisitorId = 'visitor-123';
  const mockVisitor = Visitor.fromPrimitives({
    id: mockVisitorId,
    name: 'Test Visitor',
    email: 'test@example.com',
    tel: '123456789',
    tags: ['tag1', 'tag2'],
    notes: ['Note 1', 'Note 2'],
    currentPage: '/home',
  });

  // Mock del error del repositorio
  const mockDomainError = new DomainError('Visitor not found');

  const mockErrorResult = err(mockDomainError);

  beforeEach(async () => {
    // Configuración de los mocks
    mockVisitorRepository = {
      findById: jest.fn(),
    };

    // Configuración del módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetVisitorByIdQueryHandler,
        {
          provide: VISITOR_REPOSITORY,
          useValue: mockVisitorRepository,
        },
      ],
    }).compile();

    handler = module.get<GetVisitorByIdQueryHandler>(
      GetVisitorByIdQueryHandler,
    );
  });

  it('debe retornar los datos primitivos del visitante cuando existe', async () => {
    // Preparar los mocks
    (mockVisitorRepository.findById as jest.Mock).mockResolvedValue(
      ok(mockVisitor),
    );

    // Ejecutar la query
    const query = new GetVisitorByIdQuery(mockVisitorId);
    const result = await handler.execute(query);

    // Verificar que se llamó al método findById con el ID correcto
    expect(mockVisitorRepository.findById).toHaveBeenCalledWith(
      expect.objectContaining({
        value: mockVisitorId,
      }),
    );

    // Verificar que se retornaron los datos primitivos del visitante
    expect(result).toEqual(mockVisitor.toPrimitives());
    expect(result).toHaveProperty('id', mockVisitorId);
    expect(result).toHaveProperty('name', 'Test Visitor');
    expect(result).toHaveProperty('email', 'test@example.com');
    expect(result).toHaveProperty('tel', '123456789');
  });

  it('debe retornar null cuando el visitante no existe', async () => {
    // Preparar los mocks para simular que no se encuentra el visitante
    (mockVisitorRepository.findById as jest.Mock).mockResolvedValue(
      mockErrorResult,
    );

    // Ejecutar la query
    const query = new GetVisitorByIdQuery(mockVisitorId);
    const result = await handler.execute(query);

    // Verificar que se llamó al método findById con el ID correcto
    expect(mockVisitorRepository.findById).toHaveBeenCalledWith(
      expect.objectContaining({
        value: mockVisitorId,
      }),
    );

    // Verificar que se retornó null
    expect(result).toBeNull();
  });
});
