import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  SearchProvider,
  SearchParams,
  SearchResult,
  SearchScope,
} from 'src/context/shared/domain/search';
import { CompanyTypeOrmEntity } from '../persistence/entity/company-typeorm.entity';

/**
 * Provider de búsqueda para el contexto company.
 * Busca empresas por nombre usando ILIKE de PostgreSQL (case-insensitive).
 * Scope: COMPANIES, USERS — solo disponible para admin/superadmin.
 *
 * Nota: Para usar ILIKE eficientemente, la columna company_name debe tener
 * un índice pg_trgm GIN (creado en la migración TypeORM correspondiente).
 */
@Injectable()
export class CompanySearchProvider implements SearchProvider {
  readonly scope: SearchScope[] = [SearchScope.COMPANIES, SearchScope.USERS];

  private readonly logger = new Logger(CompanySearchProvider.name);

  constructor(
    @InjectRepository(CompanyTypeOrmEntity)
    private readonly companyRepository: Repository<CompanyTypeOrmEntity>,
  ) {}

  async search(params: SearchParams): Promise<SearchResult[]> {
    try {
      const limit = params.limit ?? 5;

      const companies = await this.companyRepository.find({
        where: {
          companyName: ILike(`%${params.query}%`),
        },
        take: limit,
        select: ['id', 'companyName', 'createdAt'],
      });

      return companies.map((company) =>
        SearchResult.create({
          id: company.id,
          scope: SearchScope.COMPANIES,
          title: company.companyName,
          subtitle: `Empresa · creada ${new Date(company.createdAt).toLocaleDateString('es-ES')}`,
          url: `/companies/${company.id}`,
          metadata: {
            companyName: company.companyName,
          },
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Error en CompanySearchProvider: ${(err as Error)?.message}`,
      );
      return [];
    }
  }
}
