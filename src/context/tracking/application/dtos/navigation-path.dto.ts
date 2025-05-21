// DTO para representar la ruta de navegación (breadcrumb) en la respuesta de la API
export class NavigationPathDto {
  // Cada paso de la ruta
  steps: string[];

  constructor(steps: string[]) {
    this.steps = steps;
  }
}
