import { PrimitiveValueObject } from 'src/context/shared/domain/primitive-value-object';

/**
 * Value object para la información del visitante
 * Contiene datos denormalizados para reportes rápidos
 */
export interface VisitorInfoData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
  };
  referrer?: string;
  userAgent?: string;
}

/**
 * Value object para almacenar información del visitante
 */
export class VisitorInfo extends PrimitiveValueObject<VisitorInfoData> {
  constructor(value: VisitorInfoData) {
    super(
      value,
      (val: VisitorInfoData) => typeof val === 'object' && val !== null,
      'La información del visitante debe ser un objeto válido',
    );
  }

  /**
   * Crea VisitorInfo desde datos primitivos
   */
  static fromPrimitives(data: VisitorInfoData): VisitorInfo {
    return new VisitorInfo(data);
  }

  /**
   * Obtiene el nombre del visitante
   */
  getName(): string | undefined {
    return this.value.name;
  }

  /**
   * Obtiene el email del visitante
   */
  getEmail(): string | undefined {
    return this.value.email;
  }

  /**
   * Obtiene el teléfono del visitante
   */
  getPhone(): string | undefined {
    return this.value.phone;
  }

  /**
   * Obtiene la empresa del visitante
   */
  getCompany(): string | undefined {
    return this.value.company;
  }

  /**
   * Obtiene la dirección IP
   */
  getIpAddress(): string | undefined {
    return this.value.ipAddress;
  }

  /**
   * Obtiene la ubicación
   */
  getLocation(): { country?: string; city?: string } | undefined {
    return this.value.location;
  }

  /**
   * Obtiene el referrer
   */
  getReferrer(): string | undefined {
    return this.value.referrer;
  }

  /**
   * Obtiene el user agent
   */
  getUserAgent(): string | undefined {
    return this.value.userAgent;
  }

  /**
   * Verifica si tiene información de contacto
   */
  hasContactInfo(): boolean {
    return Boolean(this.value.email || this.value.phone);
  }

  /**
   * Serializa a primitivos para persistencia
   */
  toPrimitives(): VisitorInfoData {
    return { ...this.value };
  }

  /**
   * Compara si dos VisitorInfo son iguales
   */
  equals(other: VisitorInfo): boolean {
    if (!(other instanceof VisitorInfo)) {
      return false;
    }

    return JSON.stringify(this.value) === JSON.stringify(other.value);
  }
}
