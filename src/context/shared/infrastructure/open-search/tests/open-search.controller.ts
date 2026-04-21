import { Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { OpenSearchService } from '../open-search.service';

/**
 * Controller interno de diagnóstico para OpenSearch.
 *
 * NO está pensado para uso por consumidores externos: expone operaciones
 * básicas de prueba (indexar un documento dummy, listar hits) destinadas
 * únicamente a verificar conectividad y configuración del cluster en
 * entornos de desarrollo o smoke tests.
 */
@ApiTags('internal-opensearch')
@Controller('open-search')
export class OpenSearchController {
  constructor(private readonly openSearchService: OpenSearchService) {}

  @Post(':index')
  @ApiOperation({
    summary: 'Indexar documento de prueba (diagnóstico interno)',
    description:
      'Inserta en el índice indicado un documento dummy fijo con campos `title`, `tags`, `published` y `published_at`. Operación de diagnóstico para validar la conectividad de escritura contra OpenSearch. NO usar desde clientes de producción.',
  })
  @ApiParam({
    name: 'index',
    description:
      'Nombre del índice de OpenSearch donde se escribirá el documento de prueba.',
    example: 'test-index',
  })
  @ApiOkResponse({
    description: 'Documento de prueba indexado correctamente.',
  })
  async createDocument(@Param('index') index: string): Promise<void> {
    const client = this.openSearchService.getClient();
    const body = {
      title: 'Test',
      tags: ['test'],
      published: true,
      published_at: new Date(),
    };
    await client.index({
      index,
      body,
    });
  }

  @Get(':index')
  @ApiOperation({
    summary: 'Listar hits de un índice (diagnóstico interno)',
    description:
      'Ejecuta un `search` sin filtros sobre el índice indicado y devuelve el array bruto `hits.hits` tal y como lo retorna OpenSearch. Operación de diagnóstico para validar conectividad de lectura. NO usar desde clientes de producción.',
  })
  @ApiParam({
    name: 'index',
    description: 'Nombre del índice de OpenSearch a consultar.',
    example: 'test-index',
  })
  @ApiOkResponse({
    description: 'Array de hits crudos devueltos por OpenSearch.',
    schema: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
    },
  })
  async search(@Param('index') index: string): Promise<any> {
    const client = this.openSearchService.getClient();
    const { body } = await client.search({
      index,
    });
    return body.hits.hits;
  }
}
