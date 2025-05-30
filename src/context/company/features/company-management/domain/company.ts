// Entidad de dominio Company siguiendo DDD y CQRS
import { AggregateRoot } from '@nestjs/cqrs';
import { CompanyName } from './value-objects/company-name';
import { CompanyDomains } from './value-objects/company-domains';
import { CompanyCreatedEvent } from './events/company-created.event';
import { Uuid } from '../../shared/domain/value-objects/uuid';

// Entidad principal del contexto Company
export class Company extends AggregateRoot {
  // Propiedades encapsuladas
  private readonly id: Uuid;
  private readonly companyName: CompanyName;
  private readonly domains: CompanyDomains;
  private readonly createdAt: Date;
  private readonly updatedAt: Date;

  // Constructor privado para forzar el uso de los métodos de fábrica
  private constructor(props: {
    id: Uuid;
    companyName: CompanyName;
    domains: CompanyDomains;
    createdAt: Date;
    updatedAt: Date;
  }) {
    super();
    this.id = props.id;
    this.companyName = props.companyName;
    this.domains = props.domains;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // Método de fábrica para crear una nueva empresa (desde value objects)
  public static create(props: {
    id: Uuid;
    companyName: CompanyName;
    domains: CompanyDomains;
    createdAt: Date;
    updatedAt: Date;
  }): Company {
    const company = new Company(props);
    // Aplica el evento de dominio de creación
    company.apply(
      new CompanyCreatedEvent({
        id: props.id.getValue(),
        companyName: props.companyName.getValue(),
        domains: props.domains.toPrimitives(),
        createdAt: props.createdAt.toISOString(),
        updatedAt: props.updatedAt.toISOString(),
      }),
    );
    return company;
  }

  // Método de fábrica para reconstruir desde datos primitivos
  public static fromPrimitives(primitives: {
    id: string;
    companyName: string;
    domains: string[];
    createdAt: string;
    updatedAt: string;
  }): Company {
    return new Company({
      id: new Uuid(primitives.id),
      companyName: new CompanyName(primitives.companyName),
      domains: CompanyDomains.fromPrimitives(primitives.domains),
      createdAt: new Date(primitives.createdAt),
      updatedAt: new Date(primitives.updatedAt),
    });
  }

  // Convierte la entidad a un objeto plano serializable
  public toPrimitives(): {
    id: string;
    companyName: string;
    domains: string[];
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: this.id.getValue(),
      companyName: this.companyName.getValue(),
      domains: this.domains.toPrimitives(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  // Getters solo de lectura para exponer valores si es necesario
  public getId(): Uuid {
    return this.id;
  }
  public getCompanyName(): CompanyName {
    return this.companyName;
  }
  public getDomains(): CompanyDomains {
    return this.domains;
  }
  public getCreatedAt(): Date {
    return this.createdAt;
  }
  public getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
