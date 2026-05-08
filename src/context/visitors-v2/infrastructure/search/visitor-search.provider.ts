import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SearchProvider,
  SearchParams,
  SearchResult,
  SearchScope,
} from 'src/context/shared/domain/search';
import { VisitorV2MongoEntity } from '../persistence/entity/visitor-v2-mongo.entity';

/**
 * Provider de búsqueda para el contexto visitors-v2.
 * Busca visitantes por fingerprint o ID.
 * Los datos de contacto (nombre, email) residen en lead_contact_data — ver LeadSearchProvider.
 */
@Injectable()
export class VisitorSearchProvider implements SearchProvider {
  readonly scope: SearchScope[] = [SearchScope.VISITORS];

  private readonly logger = new Logger(VisitorSearchProvider.name);

  constructor(
    @InjectModel(VisitorV2MongoEntity.name)
    private readonly visitorModel: Model<VisitorV2MongoEntity>,
  ) {}

  async search(params: SearchParams): Promise<SearchResult[]> {
    try {
      const regex = new RegExp(params.query, 'i');
      const limit = params.limit ?? 5;

      const docs = await this.visitorModel
        .find({
          tenantId: params.companyId,
          $or: [{ id: regex }, { fingerprint: regex }],
        })
        .select('id fingerprint lifecycle connectionStatus createdAt')
        .limit(limit)
        .lean()
        .exec();

      return docs.map((doc) =>
        SearchResult.create({
          id: doc.id,
          scope: SearchScope.VISITORS,
          title: `Visitante ${doc.id.substring(0, 8)}...`,
          subtitle: `${doc.lifecycle} · ${doc.connectionStatus}`,
          url: `/visitors/${doc.id}`,
          metadata: {
            lifecycle: doc.lifecycle,
            connectionStatus: doc.connectionStatus,
            fingerprint: doc.fingerprint,
          },
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Error en VisitorSearchProvider: ${(err as Error)?.message}`,
      );
      return [];
    }
  }
}
