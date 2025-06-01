import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { VisitorIntentController } from '../visitor-intent.controller';
import { GetVisitorIntentDetailedQuery } from '../../../application/queries/get-visitor-intent-detailed.query';
import { VisitorIntentDetailedResponseDto } from '../../../application/dtos/visitor-intent-detailed-response.dto';
import { NavigationPathDto } from '../../../application/dtos/navigation-path.dto';
import { IntentTagDto } from '../../../application/dtos/intent-tag.dto';

describe('VisitorIntentController', () => {
  let controller: VisitorIntentController;
  let queryBus: jest.Mocked<QueryBus>;

  beforeEach(async () => {
    const mockQueryBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitorIntentController],
      providers: [
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
      ],
    }).compile();

    controller = module.get<VisitorIntentController>(VisitorIntentController);
    queryBus = module.get(QueryBus);
  });

  describe('getIntentDetailed', () => {
    const visitorId = '123e4567-e89b-12d3-a456-426614174000';
    const mockIntentResponse: VisitorIntentDetailedResponseDto = {
      id: 'intent-123',
      visitorId,
      type: 'purchase_intent',
      confidence: '0.85',
      detectedAt: '2024-01-01T00:00:00Z',
      description: 'User shows strong purchase intent',
      tags: [new IntentTagDto('interest'), new IntentTagDto('contact')],
      priceRange: { min: 100, max: 500 },
      navigationPath: new NavigationPathDto(['/', '/products', '/contact']),
    };

    it('should return visitor intent detailed response when result is direct DTO', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(mockIntentResponse);

      // Act
      const result = await controller.getIntentDetailed(visitorId);

      // Assert
      expect(result).toEqual(mockIntentResponse);
      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetVisitorIntentDetailedQuery(visitorId),
      );
    });

    it('should return visitor intent detailed response when result is a Result object with success', async () => {
      // Arrange
      const resultWithSuccess = {
        isErr: jest.fn().mockReturnValue(false),
        value: mockIntentResponse,
      };
      queryBus.execute.mockResolvedValue(resultWithSuccess);

      // Act
      const result = await controller.getIntentDetailed(visitorId);

      // Assert
      expect(result).toEqual(mockIntentResponse);
      expect(resultWithSuccess.isErr).toHaveBeenCalled();
    });

    it('should throw NotFoundException when result is a Result object with error', async () => {
      // Arrange
      const resultWithError = {
        isErr: jest.fn().mockReturnValue(true),
        value: mockIntentResponse,
      };
      queryBus.execute.mockResolvedValue(resultWithError);

      // Act & Assert
      await expect(controller.getIntentDetailed(visitorId)).rejects.toThrow(
        new NotFoundException('No se encontró intención para el visitante'),
      );
      expect(resultWithError.isErr).toHaveBeenCalled();
    });

    it('should handle result objects without isErr method', async () => {
      // Arrange
      const regularObject = { someProperty: 'value' };
      queryBus.execute.mockResolvedValue(regularObject);

      // Act
      const result = await controller.getIntentDetailed(visitorId);

      // Assert
      expect(result).toEqual(regularObject);
    });
  });
});
