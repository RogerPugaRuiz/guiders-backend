import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

// Objeto de valor para el identificador único de un sitio web
// Extiende de Uuid para aprovechar la validación y generación automática
export class SiteId extends Uuid {
  constructor(value: string) {
    super(value);
  }

  // Método de conveniencia para generar un nuevo SiteId
  public static random(): SiteId {
    return new SiteId(Uuid.random().value);
  }
}
