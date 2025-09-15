import { SiteId } from '../value-objects/site-id';
import { SiteName } from '../value-objects/site-name';
import { CanonicalDomain } from '../value-objects/canonical-domain';
import { DomainAliases } from '../value-objects/domain-aliases';

// Interfaz para serializar la entidad Site a primitivos
export interface SitePrimitives {
  id: string;
  name: string;
  canonicalDomain: string;
  domainAliases: string[];
}

export interface SiteProperties {
  id: SiteId;
  name: SiteName;
  canonicalDomain: CanonicalDomain;
  domainAliases: DomainAliases;
}

// Entidad Site que representa un sitio web de una empresa
export class Site {
  // Propiedades encapsuladas
  private constructor(
    private readonly _id: SiteId,
    private readonly _name: SiteName,
    private readonly _canonicalDomain: CanonicalDomain,
    private readonly _domainAliases: DomainAliases,
  ) {}

  // Método de fábrica para crear un nuevo sitio
  public static create(props: SiteProperties): Site {
    return new Site(
      props.id,
      props.name,
      props.canonicalDomain,
      props.domainAliases,
    );
  }

  // Método de fábrica para reconstruir desde datos primitivos
  public static fromPrimitives(params: {
    id: string;
    name: string;
    canonicalDomain: string;
    domainAliases: string[];
  }): Site {
    return new Site(
      new SiteId(params.id),
      new SiteName(params.name),
      new CanonicalDomain(params.canonicalDomain),
      DomainAliases.fromPrimitives(params.domainAliases),
    );
  }

  // Serializa la entidad a un objeto plano
  public toPrimitives(): SitePrimitives {
    return {
      id: this._id.value,
      name: this._name.value,
      canonicalDomain: this._canonicalDomain.value,
      domainAliases: this._domainAliases.toPrimitives(),
    };
  }

  // Getters de solo lectura
  get id(): SiteId {
    return this._id;
  }

  get name(): SiteName {
    return this._name;
  }

  get canonicalDomain(): CanonicalDomain {
    return this._canonicalDomain;
  }

  get domainAliases(): DomainAliases {
    return this._domainAliases;
  }

  // Verifica si el sitio maneja un dominio específico
  public handlesDomain(domain: string): boolean {
    return (
      this._canonicalDomain.value === domain ||
      this._domainAliases.contains(domain)
    );
  }

  // Obtiene todos los dominios (canónico + aliases)
  public getAllDomains(): string[] {
    return [this._canonicalDomain.value, ...this._domainAliases.toPrimitives()];
  }
}
