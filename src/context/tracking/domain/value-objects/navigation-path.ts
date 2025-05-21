import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para un paso de la ruta de navegación (breadcrumb)
export class NavigationPathStep extends PrimitiveValueObject<string> {
  constructor(value: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('NavigationPathStep debe ser un string no vacío');
    }
    super(value);
  }
}

// Objeto de valor para la ruta de navegación completa
export class NavigationPath extends PrimitiveValueObject<NavigationPathStep[]> {
  constructor(value: NavigationPathStep[]) {
    if (
      !Array.isArray(value) ||
      value.some((step) => !(step instanceof NavigationPathStep))
    ) {
      throw new Error('NavigationPath debe ser un array de NavigationPathStep');
    }
    super([...value]);
  }

  public toPrimitives(): string[] {
    return this.value.map((step) => step.value);
  }

  public static fromPrimitives(steps: string[]): NavigationPath {
    return new NavigationPath(steps.map((s) => new NavigationPathStep(s)));
  }
}
