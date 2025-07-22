import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

// Objeto de valor para el tiempo de conexión del visitante
// Representa la duración de conexión en milisegundos
const validateConnectionTime = (value: number) =>
  typeof value === 'number' && value >= 0 && Number.isInteger(value);

export class VisitorConnectionTime extends PrimitiveValueObject<number> {
  constructor(value: number) {
    super(
      value,
      validateConnectionTime,
      'El tiempo de conexión debe ser un número entero positivo en milisegundos',
    );
  }

  // Método para obtener el tiempo en segundos
  public toSeconds(): number {
    return Math.floor(this.value / 1000);
  }

  // Método para obtener el tiempo en minutos
  public toMinutes(): number {
    return Math.floor(this.value / (1000 * 60));
  }

  // Método para obtener una representación legible del tiempo
  public toHumanReadable(): string {
    const seconds = this.toSeconds();
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }
}
