import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Value object para el contenido del mensaje
 * Valida que el contenido no esté vacío y tenga una longitud adecuada
 */
export class MessageContent extends PrimitiveValueObject<string> {
  private static readonly MAX_LENGTH = 4000;

  constructor(value: string) {
    super(
      value,
      (val: string) => MessageContent.isValidContent(val),
      'El contenido del mensaje debe ser válido',
    );
  }

  /**
   * Valida que el contenido del mensaje sea válido
   */
  private static isValidContent(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    const trimmedValue = value.trim();
    return (
      trimmedValue.length > 0 &&
      trimmedValue.length <= MessageContent.MAX_LENGTH
    );
  }

  /**
   * Obtiene el contenido limpio (sin espacios al inicio y final)
   */
  getTrimmedContent(): string {
    return this.value.trim();
  }

  /**
   * Obtiene la longitud del contenido
   */
  getLength(): number {
    return this.value.length;
  }

  /**
   * Verifica si el contenido es largo (más de 500 caracteres)
   */
  isLongContent(): boolean {
    return this.value.length > 500;
  }

  /**
   * Obtiene un resumen del contenido (primeros 100 caracteres)
   */
  getSummary(): string {
    const content = this.getTrimmedContent();
    if (content.length <= 100) {
      return content;
    }
    return content.substring(0, 97) + '...';
  }

  /**
   * Verifica si contiene URLs
   */
  containsUrls(): boolean {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return urlRegex.test(this.value);
  }

  /**
   * Extrae las URLs del contenido
   */
  extractUrls(): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = this.value.match(urlRegex);
    return matches || [];
  }
}
