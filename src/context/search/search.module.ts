import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controllers
import { SearchController } from './infrastructure/controllers/search.controller';

// Query Handlers
import { GlobalSearchQueryHandler } from './application/queries/global-search/global-search.query-handler';

// Cache
import { SearchCacheService } from './infrastructure/cache/search-cache.service';

// Token de inyección multi-provider
import { SEARCH_PROVIDER } from 'src/context/shared/domain/search';

// Módulos de dominio que exportan sus providers
import { ConversationsV2Module } from '../conversations-v2/conversations-v2.module';
import { VisitorsV2Module } from '../visitors-v2/visitors-v2.module';
import { LeadsModule } from '../leads/leads.module';
import { CompanyModule } from '../company/company.module';

// Providers de búsqueda concretos
import { ChatSearchProvider } from '../conversations-v2/infrastructure/search/chat-search.provider';
import { VisitorSearchProvider } from '../visitors-v2/infrastructure/search/visitor-search.provider';
import { LeadSearchProvider } from '../leads/infrastructure/search/lead-search.provider';
import { CompanySearchProvider } from '../company/infrastructure/search/company-search.provider';

/**
 * Módulo del contexto de búsqueda global.
 * Importa los módulos de dominio para acceder a sus providers registrados.
 * El GlobalSearchQueryHandler recibe todos los providers vía inyección multi.
 */
@Module({
  imports: [
    CqrsModule,
    ConversationsV2Module,
    VisitorsV2Module,
    LeadsModule,
    CompanyModule,
  ],
  controllers: [SearchController],
  providers: [
    SearchCacheService,
    GlobalSearchQueryHandler,
    // Registrar todos los providers bajo el mismo token para inyección múltiple
    {
      provide: SEARCH_PROVIDER,
      useFactory: (
        chat: ChatSearchProvider,
        visitor: VisitorSearchProvider,
        lead: LeadSearchProvider,
        company: CompanySearchProvider,
      ) => [chat, visitor, lead, company],
      inject: [
        ChatSearchProvider,
        VisitorSearchProvider,
        LeadSearchProvider,
        CompanySearchProvider,
      ],
    },
  ],
  exports: [],
})
export class SearchModule {}
