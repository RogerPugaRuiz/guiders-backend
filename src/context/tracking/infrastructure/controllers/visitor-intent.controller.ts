import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetVisitorIntentDetailedQuery } from '../../application/queries/get-visitor-intent-detailed.query';
import { VisitorIntentDetailedResponseDto } from '../../application/dtos/visitor-intent-detailed-response.dto';

// Controlador para exponer la API de intención detallada
@Controller('tracking/intent')
export class VisitorIntentController {
  constructor(private readonly queryBus: QueryBus) {}

  // Endpoint principal para obtener la intención detallada
  @Get(':visitorId')
  async getIntentDetailed(
    @Param('visitorId') visitorId: string,
  ): Promise<VisitorIntentDetailedResponseDto> {
    const result = await this.queryBus.execute<
      GetVisitorIntentDetailedQuery,
      VisitorIntentDetailedResponseDto
    >(new GetVisitorIntentDetailedQuery(visitorId));
    // Si el resultado tiene la función isErr, es un Result; si no, es el DTO directo
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
      return resultObj.value;
    }
    // Si no es Result, devolver directamente
    return result;
  }
}
