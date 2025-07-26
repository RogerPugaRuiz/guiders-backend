import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Value object para los metadatos del chat
 * Contiene información adicional sobre el contexto del chat
 */
export interface ChatMetadataData {
  department?: string; // Ventas, Soporte, etc.
  product?: string; // Producto de interés
  source?: string; // Origen del chat (web, mobile, etc.)
  tags?: string[]; // Tags personalizados
  campaign?: string; // Campaña de marketing
  utmSource?: string; // UTM tracking
  utmMedium?: string;
  utmCampaign?: string;
  customFields?: Record<string, unknown>; // Campos personalizados
}

/**
 * Value object para metadatos del chat
 */
export class ChatMetadata extends PrimitiveValueObject<ChatMetadataData> {
  constructor(value: ChatMetadataData) {
    super(
      value,
      (val: ChatMetadataData) => typeof val === 'object' && val !== null,
      'Los metadatos del chat deben ser un objeto válido',
    );
  }

  /**
   * Crea ChatMetadata desde datos primitivos
   */
  static fromPrimitives(data: ChatMetadataData): ChatMetadata {
    return new ChatMetadata(data);
  }

  /**
   * Crea ChatMetadata vacío
   */
  static empty(): ChatMetadata {
    return new ChatMetadata({});
  }

  /**
   * Obtiene el departamento
   */
  getDepartment(): string | undefined {
    return this.value.department;
  }

  /**
   * Obtiene el producto de interés
   */
  getProduct(): string | undefined {
    return this.value.product;
  }

  /**
   * Obtiene la fuente del chat
   */
  getSource(): string | undefined {
    return this.value.source;
  }

  /**
   * Obtiene los tags
   */
  getTags(): string[] {
    return this.value.tags || [];
  }

  /**
   * Obtiene la campaña
   */
  getCampaign(): string | undefined {
    return this.value.campaign;
  }

  /**
   * Obtiene información de UTM
   */
  getUtmInfo(): {
    source?: string;
    medium?: string;
    campaign?: string;
  } {
    return {
      source: this.value.utmSource,
      medium: this.value.utmMedium,
      campaign: this.value.utmCampaign,
    };
  }

  /**
   * Obtiene un campo personalizado
   */
  getCustomField(key: string): unknown {
    return this.value.customFields?.[key];
  }

  /**
   * Verifica si tiene tags
   */
  hasTags(): boolean {
    return Boolean(this.value.tags && this.value.tags.length > 0);
  }

  /**
   * Verifica si tiene información de UTM
   */
  hasUtmInfo(): boolean {
    return Boolean(
      this.value.utmSource || this.value.utmMedium || this.value.utmCampaign,
    );
  }

  /**
   * Serializa a primitivos para persistencia
   */
  toPrimitives(): ChatMetadataData {
    return { ...this.value };
  }

  /**
   * Compara dos ChatMetadata para igualdad
   */
  equals(other: ChatMetadata): boolean {
    if (!(other instanceof ChatMetadata)) {
      return false;
    }

    const thisValue = this.toPrimitives();
    const otherValue = other.toPrimitives();

    return JSON.stringify(thisValue) === JSON.stringify(otherValue);
  }
}
