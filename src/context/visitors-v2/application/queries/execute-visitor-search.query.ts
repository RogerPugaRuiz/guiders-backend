import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VisitorSearchParserService } from '../../infrastructure/services/visitor-search-parser.service';
import { VisitorV2MongoEntity } from '../../infrastructure/persistence/entity/visitor-v2-mongo.entity';
import {
  VisitorSearchHistory,
  VisitorSearchHistoryDocument,
} from '../../infrastructure/persistence/entity/visitor-search-history.entity';
import {
  VisitorSearchResponseDto,
  VisitorSearchResultItemDto,
} from '../dtos/visitor-search.dto';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

export class ExecuteVisitorSearchQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly query: string,
    public readonly limit: number,
    public readonly offset: number,
    public readonly sortBy: string,
    public readonly sortOrder: 'asc' | 'desc',
  ) {}
}

@QueryHandler(ExecuteVisitorSearchQuery)
export class ExecuteVisitorSearchQueryHandler
  implements IQueryHandler<ExecuteVisitorSearchQuery, VisitorSearchResponseDto>
{
  constructor(
    private readonly parserService: VisitorSearchParserService,
    @InjectModel(VisitorV2MongoEntity.name)
    private readonly visitorModel: Model<VisitorV2MongoEntity>,
    @InjectModel(VisitorSearchHistory.name)
    private readonly historyModel: Model<VisitorSearchHistoryDocument>,
  ) {}

  async execute(
    query: ExecuteVisitorSearchQuery,
  ): Promise<VisitorSearchResponseDto> {
    // Parsear la query
    const parsed = this.parserService.parse(query.query);

    // Convertir a query de MongoDB
    const mongoQuery = this.parserService.toMongoQuery(parsed, query.tenantId);

    // Mapear campo de ordenamiento
    const sortFieldMap: Record<string, string> = {
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      status: 'connectionStatus',
      lifecycle: 'lifecycle',
      lastActivity: 'sessions.lastActivityAt',
    };

    const sortField = sortFieldMap[query.sortBy] || 'updatedAt';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

    // Ejecutar búsqueda con paginación
    const [results, totalCount] = await Promise.all([
      this.visitorModel
        .find(mongoQuery)
        .sort({ [sortField]: sortDirection })
        .skip(query.offset)
        .limit(query.limit)
        .lean()
        .exec(),
      this.visitorModel.countDocuments(mongoQuery).exec(),
    ]);

    // Mapear resultados
    const mappedResults: VisitorSearchResultItemDto[] = results.map((doc) => ({
      id: doc.id,
      connectionStatus: doc.connectionStatus,
      lifecycle: doc.lifecycle,
      currentUrl: doc.currentUrl || undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      lastActivity: this.getLastActivity(doc.sessions),
      hasAcceptedPrivacyPolicy: doc.hasAcceptedPrivacyPolicy,
    }));

    // Guardar en historial (async, no bloqueante)
    this.saveToHistory(
      query.tenantId,
      query.userId,
      query.query,
      totalCount,
    ).catch(() => {
      // Silenciar errores de historial
    });

    return {
      results: mappedResults,
      totalCount,
      parsedQuery: {
        filters: parsed.filters.map((f) => ({
          field: f.field,
          operator: f.operator,
          value: f.value,
        })),
        freeText: parsed.freeText,
      },
    };
  }

  private getLastActivity(
    sessions?: Array<{ lastActivityAt?: Date }>,
  ): Date | undefined {
    if (!sessions || sessions.length === 0) return undefined;

    const lastSession = sessions.reduce((latest, session) => {
      if (!session.lastActivityAt) return latest;
      if (!latest || session.lastActivityAt > latest) {
        return session.lastActivityAt;
      }
      return latest;
    }, undefined as Date | undefined);

    return lastSession;
  }

  private async saveToHistory(
    tenantId: string,
    userId: string,
    query: string,
    resultsCount: number,
  ): Promise<void> {
    await this.historyModel.create({
      id: Uuid.random().value,
      tenantId,
      userId,
      query,
      resultsCount,
      executedAt: new Date(),
    });
  }
}
