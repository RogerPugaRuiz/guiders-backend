// Entidad de dominio Company siguiendo DDD y CQRS
import { AggregateRoot } from '@nestjs/cqrs';
import { CompanyName } from './value-objects/company-name';
import { AdminName } from './value-objects/admin-name';
import { AdminEmail } from './value-objects/admin-email';
import { AdminTel } from './value-objects/admin-tel';
import { CompanyCreatedEvent } from './events/company-created.event';
import { Uuid } from '../../shared/domain/value-objects/uuid';

// Entidad principal del contexto Company
export class Company extends AggregateRoot {
  // Propiedades encapsuladas
  private readonly id: Uuid;
  private readonly companyName: CompanyName;
  private readonly adminName: AdminName;
  private readonly adminEmail: AdminEmail;
  private readonly adminTel: AdminTel;

  // Constructor privado para forzar el uso de los métodos de fábrica
  private constructor(props: {
    id: Uuid;
    companyName: CompanyName;
    adminName: AdminName;
    adminEmail: AdminEmail;
    adminTel: AdminTel;
  }) {
    super();
    this.id = props.id;
    this.companyName = props.companyName;
    this.adminName = props.adminName;
    this.adminEmail = props.adminEmail;
    this.adminTel = props.adminTel;
  }

  // Método de fábrica para crear una nueva empresa (desde value objects)
  public static create(props: {
    id: Uuid;
    companyName: CompanyName;
    adminName: AdminName;
    adminEmail: AdminEmail;
    adminTel: AdminTel;
  }): Company {
    const company = new Company(props);
    // Aplica el evento de dominio de creación
    company.apply(
      new CompanyCreatedEvent({
        adminEmail: props.adminEmail.getValue(),
        adminName: props.adminName.getValue(),
        adminTel: props.adminTel.getValue(),
        companyName: props.companyName.getValue(),
        id: props.id.getValue(),
      }),
    );
    return company;
  }

  // Método de fábrica para reconstruir desde datos primitivos
  public static fromPrimitives(primitives: {
    id: string;
    companyName: string;
    adminName: string;
    adminEmail: string | null;
    adminTel: string | null;
  }): Company {
    return new Company({
      id: new Uuid(primitives.id),
      companyName: new CompanyName(primitives.companyName),
      adminName: new AdminName(primitives.adminName),
      adminEmail: new AdminEmail(primitives.adminEmail),
      adminTel: new AdminTel(primitives.adminTel),
    });
  }

  // Convierte la entidad a un objeto plano serializable
  public toPrimitives(): {
    id: string;
    companyName: string;
    adminName: string;
    adminEmail: string | null;
    adminTel: string | null;
  } {
    return {
      id: this.id.getValue(),
      companyName: this.companyName.getValue(),
      adminName: this.adminName.getValue(),
      adminEmail: this.adminEmail.getValue(),
      adminTel: this.adminTel.getValue(),
    };
  }

  // Getters solo de lectura para exponer valores si es necesario
  public getId(): Uuid {
    return this.id;
  }
  public getCompanyName(): CompanyName {
    return this.companyName;
  }
  public getAdminName(): AdminName {
    return this.adminName;
  }
  public getAdminEmail(): AdminEmail {
    return this.adminEmail;
  }
  public getAdminTel(): AdminTel {
    return this.adminTel;
  }
}
