import { Test, TestingModule } from '@nestjs/testing';
import { VisitorController } from '../visitor.controller';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UpdateVisitorConnectionTimeCommand } from '../../../application/commands/update-visitor-connection-time.command';
import { GetVisitorByIdQuery } from '../../../application/queries/get-visitor-by-id.query';
import { UpdateVisitorConnectionTimeDto } from '../../../application/dtos/update-visitor-connection-time.dto';
import { VisitorConnectionTimeResponseDto } from '../../../application/dtos/visitor-connection-time-response.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ok, err } from 'src/context/shared/domain/result';
import { VisitorNotFoundError } from '../../../domain/errors/visitor.error';
import { VisitorPrimitives } from '../../../domain/visitor';

// Mock para AuthGuard
jest.mock('src/context/shared/infrastructure/guards/auth.guard', () => ({
  AuthGuard: jest.fn(() => true),
}));

describe('VisitorController - Connection Time', () => {
  let controller: VisitorController;
  let mockCommandBus: jest.Mocked<CommandBus>;
  let mockQueryBus: jest.Mocked<QueryBus>;

  beforeEach(async () => {
    const mockCommand = {
      execute: jest.fn(),
    };

    const mockQuery = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitorController],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommand,
        },
        {
          provide: QueryBus,
          useValue: mockQuery,
        },
      ],
    }).compile();

    controller = module.get<VisitorController>(VisitorController);
    mockCommandBus = module.get<CommandBus>(
      CommandBus,
    ) as jest.Mocked<CommandBus>;
    mockQueryBus = module.get<QueryBus>(QueryBus) as jest.Mocked<QueryBus>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVisitorConnectionTime', () => {
    const visitorId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return connection time with formatting for seconds', async () => {
      // Arrange
      const mockVisitor: VisitorPrimitives = {
        id: visitorId,
        name: 'Test Visitor',
        email: 'test@example.com',
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
        connectionTime: 12500, // 12.5 segundos
      };
      mockQueryBus.execute.mockResolvedValue(mockVisitor);

      // Act
      const result: VisitorConnectionTimeResponseDto =
        await controller.getVisitorConnectionTime(visitorId);

      // Assert
      expect(result.connectionTime).toBe(12500);
      expect(result.connectionTimeFormatted).toBe('12.5 segundos');
      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        new GetVisitorByIdQuery(visitorId),
      );
    });

    it('should return connection time with formatting for minutes', async () => {
      // Arrange
      const mockVisitor: VisitorPrimitives = {
        id: visitorId,
        name: 'Test Visitor',
        email: 'test@example.com',
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
        connectionTime: 125000, // 2 minutos y 5 segundos
      };
      mockQueryBus.execute.mockResolvedValue(mockVisitor);

      // Act
      const result: VisitorConnectionTimeResponseDto =
        await controller.getVisitorConnectionTime(visitorId);

      // Assert
      expect(result.connectionTime).toBe(125000);
      expect(result.connectionTimeFormatted).toBe('2 minutos y 5 segundos');
    });

    it('should return connection time with formatting for hours', async () => {
      // Arrange
      const mockVisitor: VisitorPrimitives = {
        id: visitorId,
        name: 'Test Visitor',
        email: 'test@example.com',
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
        connectionTime: 3665000, // 1 hora, 1 minuto y 5 segundos
      };
      mockQueryBus.execute.mockResolvedValue(mockVisitor);

      // Act
      const result: VisitorConnectionTimeResponseDto =
        await controller.getVisitorConnectionTime(visitorId);

      // Assert
      expect(result.connectionTime).toBe(3665000);
      expect(result.connectionTimeFormatted).toBe('1 horas y 1 minutos');
    });

    it('should return null values when connection time is null', async () => {
      // Arrange
      const mockVisitor: VisitorPrimitives = {
        id: visitorId,
        name: 'Test Visitor',
        email: 'test@example.com',
        tel: null,
        tags: [],
        notes: [],
        currentPage: null,
        connectionTime: null,
      };
      mockQueryBus.execute.mockResolvedValue(mockVisitor);

      // Act
      const result: VisitorConnectionTimeResponseDto =
        await controller.getVisitorConnectionTime(visitorId);

      // Assert
      expect(result.connectionTime).toBeNull();
      expect(result.connectionTimeFormatted).toBeNull();
    });

    it('should throw BadRequest when visitorId is empty', async () => {
      // Act & Assert
      await expect(controller.getVisitorConnectionTime('')).rejects.toThrow(
        new HttpException(
          'ID de visitante no proporcionado',
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(mockQueryBus.execute).not.toHaveBeenCalled();
    });

    it('should throw NotFound when visitor does not exist', async () => {
      // Arrange
      mockQueryBus.execute.mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.getVisitorConnectionTime(visitorId),
      ).rejects.toThrow(
        new HttpException('Visitante no encontrado', HttpStatus.NOT_FOUND),
      );

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        new GetVisitorByIdQuery(visitorId),
      );
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      mockQueryBus.execute.mockRejectedValue(unexpectedError);

      // Act & Assert
      await expect(
        controller.getVisitorConnectionTime(visitorId),
      ).rejects.toThrow(HttpException);

      expect(mockQueryBus.execute).toHaveBeenCalledWith(
        new GetVisitorByIdQuery(visitorId),
      );
    });
  });

  describe('updateConnectionTime', () => {
    const visitorId = '123e4567-e89b-12d3-a456-426614174000';
    const validDto: UpdateVisitorConnectionTimeDto = {
      connectionTime: 5000,
    };

    it('should update connection time successfully', async () => {
      // Arrange
      mockCommandBus.execute.mockResolvedValue(ok(undefined));

      // Act
      await controller.updateConnectionTime(visitorId, validDto);

      // Assert
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new UpdateVisitorConnectionTimeCommand(visitorId, 5000),
      );
    });

    it('should throw BadRequest when visitorId is empty', async () => {
      // Act & Assert
      await expect(
        controller.updateConnectionTime('', validDto),
      ).rejects.toThrow(
        new HttpException(
          'ID de visitante no proporcionado',
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should handle domain errors appropriately', async () => {
      // Arrange
      const domainError = new VisitorNotFoundError(visitorId);
      mockCommandBus.execute.mockResolvedValue(err(domainError));

      // Act & Assert
      await expect(
        controller.updateConnectionTime(visitorId, validDto),
      ).rejects.toThrow(HttpException);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new UpdateVisitorConnectionTimeCommand(visitorId, 5000),
      );
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const unexpectedError = new Error('Unexpected database error');
      mockCommandBus.execute.mockRejectedValue(unexpectedError);

      // Act & Assert
      await expect(
        controller.updateConnectionTime(visitorId, validDto),
      ).rejects.toThrow(HttpException);

      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        new UpdateVisitorConnectionTimeCommand(visitorId, 5000),
      );
    });
  });
});
