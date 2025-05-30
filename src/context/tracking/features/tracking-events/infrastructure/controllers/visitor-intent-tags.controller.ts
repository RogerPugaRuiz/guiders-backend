import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetVisitorIntentDetailedQuery } from '../../application/queries/get-visitor-intent-detailed.query';
import { VisitorIntentDetailedResponseDto } from '../../application/dtos/visitor-intent-detailed-response.dto';

// Controlador para exponer la API de tags de intención
@Controller('tracking/intent-tags')
export class VisitorIntentTagsController {
  constructor(private readonly queryBus: QueryBus) {}

  // Endpoint auxiliar para obtener los tags de una intención
  @Get(':visitorId')
  async getIntentTags(
    @Param('visitorId') visitorId: string,
  ): Promise<{ tags: string[] }> {
    const result = await this.queryBus.execute<
      GetVisitorIntentDetailedQuery,
      VisitorIntentDetailedResponseDto
    >(new GetVisitorIntentDetailedQuery(visitorId));
    if (
      typeof (result as unknown as { isErr?: unknown }).isErr === 'function'
    ) {
      const resultObj = result as unknown as {
        isErr: () => boolean;
        value: VisitorIntentDetailedResponseDto;
      };
      if (resultObj.isErr()) {
        throw new NotFoundException(
          'No se encontró intención para el visitante',
        );
      }
      return { tags: resultObj.value.tags.map((t) => t.value) };
    }
    // Si no es Result, devolver directamente
    return {
      tags: result.tags.map((t) => t.value),
    };
  }
}
