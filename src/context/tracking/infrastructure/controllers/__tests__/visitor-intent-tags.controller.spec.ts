import { Test, TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { VisitorIntentTagsController } from '../visitor-intent-tags.controller';
import { GetVisitorIntentDetailedQuery } from '../../../application/queries/get-visitor-intent-detailed.query';
import { VisitorIntentDetailedResponseDto } from '../../../application/dtos/visitor-intent-detailed-response.dto';
import { NavigationPathDto } from '../../../application/dtos/navigation-path.dto';
import { IntentTagDto } from '../../../application/dtos/intent-tag.dto';

describe('VisitorIntentTagsController', () => {
  let controller: VisitorIntentTagsController;
  let queryBus: jest.Mocked<QueryBus>;

  beforeEach(async () => {
    const mockQueryBus = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitorIntentTagsController],
      providers: [
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
      ],
    }).compile();

    controller = module.get<VisitorIntentTagsController>(
      VisitorIntentTagsController,
    );
    queryBus = module.get(QueryBus);
  });

  describe('getIntentTags', () => {
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

    it('should return intent tags when result is direct DTO', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(mockIntentResponse);

      // Act
      const result = await controller.getIntentTags(visitorId);

      // Assert
      expect(result).toEqual({
        tags: ['interest', 'contact'],
      });
      expect(queryBus.execute).toHaveBeenCalledWith(
        new GetVisitorIntentDetailedQuery(visitorId),
      );
    });

    it('should return intent tags when result is a Result object with success', async () => {
      // Arrange
      const resultWithSuccess = {
        isErr: jest.fn().mockReturnValue(false),
        value: mockIntentResponse,
      };
      queryBus.execute.mockResolvedValue(resultWithSuccess);

      // Act
      const result = await controller.getIntentTags(visitorId);

      // Assert
      expect(result).toEqual({
        tags: ['interest', 'contact'],
      });
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
      await expect(controller.getIntentTags(visitorId)).rejects.toThrow(
        new NotFoundException('No se encontró intención para el visitante'),
      );
      expect(resultWithError.isErr).toHaveBeenCalled();
    });

    it('should handle result objects without isErr method', async () => {
      // Arrange
      const regularObject = {
        tags: [new IntentTagDto('tag1'), new IntentTagDto('tag2')],
      };
      queryBus.execute.mockResolvedValue(regularObject);

      // Act
      const result = await controller.getIntentTags(visitorId);

      // Assert
      expect(result).toEqual({
        tags: ['tag1', 'tag2'],
      });
    });

    it('should handle empty tags array', async () => {
      // Arrange
      const responseWithEmptyTags = {
        ...mockIntentResponse,
        tags: [],
      };
      queryBus.execute.mockResolvedValue(responseWithEmptyTags);

      // Act
      const result = await controller.getIntentTags(visitorId);

      // Assert
      expect(result).toEqual({
        tags: [],
      });
    });
  });
});
