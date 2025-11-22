import { AggregateRoot } from '@nestjs/cqrs';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

/**
 * Primitivos para serialización del filtro guardado
 */
export interface SavedFilterPrimitives {
  id: string;
  userId: string;
  tenantId: string;
  name: string;
  description: string | null;
  filters: Record<string, unknown>;
  sort: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Agregado SavedFilter
 * Representa un filtro personalizado guardado por un usuario
 */
export class SavedFilter extends AggregateRoot {
  private readonly id: Uuid;
  private readonly userId: Uuid;
  private readonly tenantId: Uuid;
  private name: string;
  private description: string | null;
  private filters: Record<string, unknown>;
  private sort: Record<string, unknown> | null;
  private readonly createdAt: Date;
  private updatedAt: Date;

  private constructor(props: {
    id: Uuid;
    userId: Uuid;
    tenantId: Uuid;
    name: string;
    description: string | null;
    filters: Record<string, unknown>;
    sort: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    super();
    this.id = props.id;
    this.userId = props.userId;
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.description = props.description;
    this.filters = props.filters;
    this.sort = props.sort;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Método de fábrica para crear un nuevo filtro guardado
   */
  public static create(props: {
    userId: Uuid;
    tenantId: Uuid;
    name: string;
    description?: string;
    filters: Record<string, unknown>;
    sort?: Record<string, unknown>;
  }): SavedFilter {
    const now = new Date();

    return new SavedFilter({
      id: Uuid.random(),
      userId: props.userId,
      tenantId: props.tenantId,
      name: props.name,
      description: props.description || null,
      filters: props.filters,
      sort: props.sort || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Método de fábrica para reconstruir desde primitivos
   */
  public static fromPrimitives(primitives: SavedFilterPrimitives): SavedFilter {
    return new SavedFilter({
      id: new Uuid(primitives.id),
      userId: new Uuid(primitives.userId),
      tenantId: new Uuid(primitives.tenantId),
      name: primitives.name,
      description: primitives.description,
      filters: primitives.filters,
      sort: primitives.sort,
      createdAt: new Date(primitives.createdAt),
      updatedAt: new Date(primitives.updatedAt),
    });
  }

  /**
   * Convierte el agregado a primitivos
   */
  public toPrimitives(): SavedFilterPrimitives {
    return {
      id: this.id.value,
      userId: this.userId.value,
      tenantId: this.tenantId.value,
      name: this.name,
      description: this.description,
      filters: this.filters,
      sort: this.sort,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Actualiza el nombre del filtro
   */
  public updateName(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }

  /**
   * Actualiza la descripción del filtro
   */
  public updateDescription(description: string | null): void {
    this.description = description;
    this.updatedAt = new Date();
  }

  /**
   * Actualiza la configuración de filtros
   */
  public updateFilters(filters: Record<string, unknown>): void {
    this.filters = filters;
    this.updatedAt = new Date();
  }

  /**
   * Actualiza la configuración de ordenamiento
   */
  public updateSort(sort: Record<string, unknown> | null): void {
    this.sort = sort;
    this.updatedAt = new Date();
  }

  // Getters
  public getId(): Uuid {
    return this.id;
  }

  public getUserId(): Uuid {
    return this.userId;
  }

  public getTenantId(): Uuid {
    return this.tenantId;
  }

  public getName(): string {
    return this.name;
  }

  public getDescription(): string | null {
    return this.description;
  }

  public getFilters(): Record<string, unknown> {
    return { ...this.filters };
  }

  public getSort(): Record<string, unknown> | null {
    return this.sort ? { ...this.sort } : null;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
