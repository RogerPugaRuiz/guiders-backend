import { Test, TestingModule } from '@nestjs/testing';
import { UpdateVisitorConnectionTimeCommandHandler } from '../update-visitor-connection-time-command.handler';
import { UpdateVisitorConnectionTimeCommand } from '../update-visitor-connection-time.command';
import { VISITOR_REPOSITORY } from '../../../domain/visitor.repository';
import { IVisitorRepository } from '../../../domain/visitor.repository';
import { Visitor } from '../../../domain/visitor';
import { VisitorId } from '../../../domain/value-objects/visitor-id';
import { VisitorNotFoundError } from '../../../domain/errors/visitor.error';
import { ok, err } from 'src/context/shared/domain/result';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('UpdateVisitorConnectionTimeCommandHandler', () => {
  let handler: UpdateVisitorConnectionTimeCommandHandler;
  let mockRepository: jest.Mocked<IVisitorRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateVisitorConnectionTimeCommandHandler,
        {
          provide: VISITOR_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<UpdateVisitorConnectionTimeCommandHandler>(
      UpdateVisitorConnectionTimeCommandHandler,
    );
    mockRepository = module.get<IVisitorRepository>(
      VISITOR_REPOSITORY,
    ) as jest.Mocked<IVisitorRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should update visitor connection time successfully', async () => {
      // Arrange
      const visitorUuid = Uuid.generate();
      const command = new UpdateVisitorConnectionTimeCommand(visitorUuid, 5000);

      const existingVisitor = Visitor.fromPrimitives({
        id: visitorUuid,
        name: 'Test Visitor',
        email: 'test@example.com',
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
        connectionTime: null,
      });

      mockRepository.findById.mockResolvedValue(ok(existingVisitor));
      mockRepository.save.mockResolvedValue(ok(undefined));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockRepository.findById).toHaveBeenCalledWith(
        VisitorId.create(visitorUuid),
      );
      expect(mockRepository.save).toHaveBeenCalledTimes(1);

      // Verificar que el visitante fue actualizado con el tiempo de conexión correcto
      const savedVisitor = mockRepository.save.mock.calls[0][0];
      expect(savedVisitor.connectionTime.isPresent()).toBe(true);
      expect(savedVisitor.connectionTime.get().value).toBe(5000);
    });

    it('should return error when visitor is not found', async () => {
      // Arrange
      const visitorUuid = Uuid.generate();
      const command = new UpdateVisitorConnectionTimeCommand(visitorUuid, 5000);
      const notFoundError = new VisitorNotFoundError(visitorUuid);

      mockRepository.findById.mockResolvedValue(err(notFoundError));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(VisitorNotFoundError);
      }
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when save fails', async () => {
      // Arrange
      const visitorUuid = Uuid.generate();
      const command = new UpdateVisitorConnectionTimeCommand(visitorUuid, 5000);

      const existingVisitor = Visitor.fromPrimitives({
        id: visitorUuid,
        name: 'Test Visitor',
        email: 'test@example.com',
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
        connectionTime: null,
      });

      const saveError = new VisitorNotFoundError(visitorUuid);
      mockRepository.findById.mockResolvedValue(ok(existingVisitor));
      mockRepository.save.mockResolvedValue(err(saveError));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(VisitorNotFoundError);
      }
    });

    it('should handle connection time update idempotently', async () => {
      // Arrange
      const visitorUuid = Uuid.generate();
      const connectionTime = 3000;
      const command = new UpdateVisitorConnectionTimeCommand(
        visitorUuid,
        connectionTime,
      );

      const existingVisitor = Visitor.fromPrimitives({
        id: visitorUuid,
        name: 'Test Visitor',
        email: 'test@example.com',
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
        connectionTime: connectionTime, // Mismo tiempo de conexión
      });

      mockRepository.findById.mockResolvedValue(ok(existingVisitor));
      mockRepository.save.mockResolvedValue(ok(undefined));

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);

      // El visitante guardado debe seguir teniendo el mismo tiempo
      const savedVisitor = mockRepository.save.mock.calls[0][0];
      expect(savedVisitor.connectionTime.get().value).toBe(connectionTime);
    });
  });
});
