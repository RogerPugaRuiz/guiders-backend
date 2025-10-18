import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import {
  TrackingEventMongoEntity,
  TrackingEventMongoEntitySchema,
} from '../entity/tracking-event-mongo.entity';

/**
 * Servicio para gestionar particiones de collections por mes
 * Crea dinámicamente collections del tipo: tracking_events_2025_01, tracking_events_2025_02, etc.
 */
@Injectable()
export class PartitionRouterService {
  private readonly logger = new Logger(PartitionRouterService.name);
  private readonly modelCache = new Map<
    string,
    Model<TrackingEventMongoEntity>
  >();

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Obtiene el modelo de Mongoose para una fecha específica
   * Crea la collection si no existe
   */
  getModelForDate(date: Date): Model<TrackingEventMongoEntity> {
    const collectionName = this.getCollectionName(date);

    // Buscar en caché
    if (this.modelCache.has(collectionName)) {
      return this.modelCache.get(collectionName)!;
    }

    // Crear modelo dinámicamente
    this.logger.log(`Creando modelo para collection: ${collectionName}`);

    const model = this.connection.model<TrackingEventMongoEntity>(
      collectionName,
      TrackingEventMongoEntitySchema,
      collectionName,
    );

    // Guardar en caché
    this.modelCache.set(collectionName, model);

    // Asegurar índices (solo se crean una vez por collection)
    this.ensureIndexes(model, collectionName);

    return model;
  }

  /**
   * Obtiene múltiples modelos para un rango de fechas
   * Útil para queries que abarcan múltiples meses
   */
  getModelsForDateRange(
    dateFrom: Date,
    dateTo: Date,
  ): Model<TrackingEventMongoEntity>[] {
    const models: Model<TrackingEventMongoEntity>[] = [];
    const partitions = this.getPartitionsInRange(dateFrom, dateTo);

    for (const partition of partitions) {
      const firstDayOfMonth = new Date(partition.year, partition.month - 1, 1);
      models.push(this.getModelForDate(firstDayOfMonth));
    }

    return models;
  }

  /**
   * Genera el nombre de la collection basado en la fecha
   * Formato: tracking_events_YYYY_MM
   */
  private getCollectionName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `tracking_events_${year}_${month}`;
  }

  /**
   * Obtiene las particiones (año-mes) en un rango de fechas
   */
  private getPartitionsInRange(
    dateFrom: Date,
    dateTo: Date,
  ): Array<{ year: number; month: number }> {
    const partitions: Array<{ year: number; month: number }> = [];
    const current = new Date(dateFrom);
    current.setDate(1); // Primer día del mes

    while (current <= dateTo) {
      partitions.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
      });

      // Avanzar al siguiente mes
      current.setMonth(current.getMonth() + 1);
    }

    return partitions;
  }

  /**
   * Asegura que los índices estén creados en la collection
   * Mongoose solo los crea una vez automáticamente
   */
  private async ensureIndexes(
    model: Model<TrackingEventMongoEntity>,
    collectionName: string,
  ): Promise<void> {
    try {
      await model.createIndexes();
      this.logger.debug(`Índices asegurados para ${collectionName}`);
    } catch (error) {
      this.logger.warn(
        `Error al crear índices para ${collectionName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Obtiene todas las collections de eventos existentes
   * Útil para tareas de mantenimiento
   */
  async getAllEventCollections(): Promise<string[]> {
    if (!this.connection.db) {
      throw new Error('La conexión a MongoDB no está disponible');
    }
    const collections = await this.connection.db.listCollections().toArray();
    return collections
      .map((col) => col.name)
      .filter((name) => name.startsWith('tracking_events_'))
      .sort();
  }

  /**
   * Elimina collections antiguas (para limpieza de datos)
   * CUIDADO: Esta operación es irreversible
   */
  async dropCollectionsOlderThan(date: Date): Promise<string[]> {
    const allCollections = await this.getAllEventCollections();
    const droppedCollections: string[] = [];

    for (const collectionName of allCollections) {
      const collectionDate = this.parseCollectionDate(collectionName);

      if (collectionDate && collectionDate < date) {
        this.logger.warn(
          `Eliminando collection antigua: ${collectionName} (${collectionDate.toISOString()})`,
        );

        try {
          if (!this.connection.db) {
            throw new Error('La conexión a MongoDB no está disponible');
          }
          await this.connection.db.dropCollection(collectionName);
          this.modelCache.delete(collectionName);
          droppedCollections.push(collectionName);
        } catch (error) {
          this.logger.error(
            `Error al eliminar collection ${collectionName}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    return droppedCollections;
  }

  /**
   * Parsea el nombre de una collection para obtener su fecha
   * tracking_events_2025_01 → Date(2025, 0, 1)
   */
  private parseCollectionDate(collectionName: string): Date | null {
    const match = collectionName.match(/tracking_events_(\d{4})_(\d{2})/);

    if (!match) {
      return null;
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // JavaScript months are 0-indexed

    return new Date(year, month, 1);
  }

  /**
   * Obtiene estadísticas de particionamiento
   */
  async getPartitionStats(): Promise<{
    totalCollections: number;
    collections: Array<{
      name: string;
      date: string;
      documentCount: number;
    }>;
  }> {
    const allCollections = await this.getAllEventCollections();
    const stats: Array<{
      name: string;
      date: string;
      documentCount: number;
    }> = [];

    for (const collectionName of allCollections) {
      const collectionDate = this.parseCollectionDate(collectionName);

      if (collectionDate) {
        const model = this.getModelForDate(collectionDate);
        const count = await model.countDocuments();

        stats.push({
          name: collectionName,
          date: collectionDate.toISOString(),
          documentCount: count,
        });
      }
    }

    return {
      totalCollections: allCollections.length,
      collections: stats,
    };
  }

  /**
   * Limpia la caché de modelos
   * Útil para testing o reconfiguración
   */
  clearCache(): void {
    this.modelCache.clear();
    this.logger.log('Caché de modelos limpiada');
  }
}
