import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';
import { Site, SitePrimitives } from '../entities/site';

// Objeto de valor para la colección de sitios de una empresa
// Debe tener al menos un sitio válido
const validateCompanySites = (value: SitePrimitives[]) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (site) =>
      typeof site === 'object' &&
      typeof site.id === 'string' &&
      typeof site.name === 'string' &&
      typeof site.canonicalDomain === 'string' &&
      Array.isArray(site.domainAliases),
  );

export class CompanySites extends PrimitiveValueObject<SitePrimitives[]> {
  constructor(value: SitePrimitives[]) {
    super(value, validateCompanySites, 'Debe haber al menos un sitio válido');
  }

  // Devuelve los sitios como array de Site entities
  public getSites(): Site[] {
    return this.value.map((siteData) => Site.fromPrimitives(siteData));
  }

  // Permite crear desde array de Site entities
  public static fromSiteArray(sites: Site[]): CompanySites {
    return new CompanySites(sites.map((site) => site.toPrimitives()));
  }

  // Permite crear desde array de primitivos
  public static fromPrimitives(sites: SitePrimitives[]): CompanySites {
    return new CompanySites(sites);
  }

  // Devuelve los sitios como array de primitivos
  public toPrimitives(): SitePrimitives[] {
    return [...this.value];
  }

  // Busca un sitio por dominio (canónico o alias)
  public findSiteByDomain(domain: string): Site | null {
    const sites = this.getSites();
    return sites.find((site) => site.handlesDomain(domain)) || null;
  }

  // Busca un sitio por ID
  public findSiteById(siteId: string): Site | null {
    const sites = this.getSites();
    return sites.find((site) => site.id.value === siteId) || null;
  }

  // Obtiene todos los dominios de todos los sitios
  public getAllDomains(): string[] {
    const sites = this.getSites();
    return sites.flatMap((site) => site.getAllDomains());
  }

  // Verifica si contiene un sitio con el ID especificado
  public containsSiteId(siteId: string): boolean {
    return this.value.some((site) => site.id === siteId);
  }

  // Retorna la cantidad de sitios
  public size(): number {
    return this.value.length;
  }
}
