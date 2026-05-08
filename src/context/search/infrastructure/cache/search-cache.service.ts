import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { SearchResultPrimitives } from 'src/context/shared/domain/search';

// TTL de 5 minutos para resultados de búsqueda
const CACHE_TTL_SECONDS = 300;

// Prefijo de clave para aislar el namespace de búsqueda global
const KEY_PREFIX = 'search:';

/**
 * Servicio de caché Redis para resultados de búsqueda global.
 * Sigue el patrón cache-aside: el handler consulta, guarda e invalida.
 * La clave incluye companyId + roles + agentId (opcional) + query normalizado.
 */
@Injectable()
export class SearchCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchCacheService.name);
  private client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    this.client.on('error', (err) =>
      this.logger.error('Error en cliente Redis de búsqueda', err),
    );
    await this.client.connect();
    this.logger.log('Cliente Redis de búsqueda inicializado');
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Construye la clave de caché determinista a partir de los parámetros de búsqueda.
   * Los roles se ordenan para que el orden de llegada no afecte la clave.
   */
  buildKey(params: {
    companyId: string;
    roles: string[];
    agentId?: string;
    query: string;
  }): string {
    const rolesPart = [...params.roles].sort().join(',');
    const agentPart = params.agentId ?? 'none';
    const queryPart = params.query.toLowerCase().trim();
    return `${KEY_PREFIX}${params.companyId}:${rolesPart}:${agentPart}:${queryPart}`;
  }

  /**
   * Recupera resultados cacheados. Retorna null si no existe o está expirado.
   */
  async get(key: string): Promise<SearchResultPrimitives[] | null> {
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as SearchResultPrimitives[];
    } catch (err) {
      this.logger.warn(
        `Error al leer caché de búsqueda key=${key}: ${err?.message}`,
      );
      return null;
    }
  }

  /**
   * Almacena resultados en caché con TTL configurable.
   * Fallo silencioso: si Redis no está disponible, no interrumpe la búsqueda.
   */
  async set(key: string, results: SearchResultPrimitives[]): Promise<void> {
    try {
      await this.client
        .multi()
        .set(key, JSON.stringify(results))
        .expire(key, CACHE_TTL_SECONDS)
        .exec();
    } catch (err) {
      this.logger.warn(
        `Error al escribir caché de búsqueda key=${key}: ${err?.message}`,
      );
    }
  }
}
