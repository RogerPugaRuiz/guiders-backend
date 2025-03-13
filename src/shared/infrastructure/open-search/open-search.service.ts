import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';

@Injectable()
export class OpenSearchService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(OpenSearchService.name);

  constructor() {
    this.client = new Client({
      node: 'https://localhost:9200', // URL del servidor OpenSearch
      auth: {
        username: 'admin', // Usuario de OpenSearch
        password: 'My@dminP@ssword25', // Contraseña de OpenSearch
      },
      ssl: {
        rejectUnauthorized: false, // Desactiva la verificación de certificado en desarrollo
      },
    });
  }

  async onModuleInit() {
    try {
      const health = await this.client.cluster.health();
      this.logger.log(`OpenSearch cluster is healthy: ${health.body.status}`);
    } catch (error) {
      this.logger.error(`OpenSearch cluster is down: ${error}`);
    }
  }

  getClient(): Client {
    return this.client;
  }
}
