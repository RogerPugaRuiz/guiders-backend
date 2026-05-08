import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SearchProvider,
  SearchParams,
  SearchResult,
  SearchScope,
} from 'src/context/shared/domain/search';
import { ChatSchema } from '../schemas/chat.schema';

/**
 * Provider de búsqueda para el contexto conversations-v2.
 * Busca chats por nombre del visitante, email o contenido del último mensaje.
 * Usa $text con índice compuesto de texto definido en chat.schema.ts.
 */
@Injectable()
export class ChatSearchProvider implements SearchProvider {
  readonly scope: SearchScope[] = [SearchScope.CHATS];

  private readonly logger = new Logger(ChatSearchProvider.name);

  constructor(
    @InjectModel(ChatSchema.name)
    private readonly chatModel: Model<ChatSchema>,
  ) {}

  async search(params: SearchParams): Promise<SearchResult[]> {
    try {
      const limit = params.limit ?? 5;

      const filter: Record<string, unknown> = {
        companyId: params.companyId,
        $text: { $search: params.query },
      };

      // El rol commercial solo ve sus chats asignados
      if (params.agentId) {
        filter['assignedCommercialId'] = params.agentId;
      }

      const docs = await this.chatModel
        .find(filter)
        .select('id status visitorInfo assignedCommercialId createdAt')
        .limit(limit)
        .lean()
        .exec();

      return docs.map((doc) =>
        SearchResult.create({
          id: doc.id,
          scope: SearchScope.CHATS,
          title: (doc.visitorInfo as any)?.name ?? 'Visitante desconocido',
          subtitle: `Chat ${doc.status?.toLowerCase()} · ${new Date(doc.createdAt).toLocaleDateString('es-ES')}`,
          url: `/chats/${doc.id}`,
          metadata: {
            status: doc.status,
            email: (doc.visitorInfo as any)?.email,
          },
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Error en ChatSearchProvider: ${(err as Error)?.message}`,
      );
      return [];
    }
  }
}
