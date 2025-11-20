import { PrimitiveValueObject } from '../../../shared/domain/primitive-value-object';

/**
 * Tipos de eventos comunes predefinidos
 * Nota: EventType acepta cualquier string, estos son solo sugerencias
 */
export class EventTypes {
  static readonly PAGE_VIEW = 'PAGE_VIEW';
  static readonly CLICK = 'CLICK';
  static readonly SCROLL = 'SCROLL';
  static readonly MOUSE_MOVE = 'MOUSE_MOVE';
  static readonly FORM_SUBMIT = 'FORM_SUBMIT';
  static readonly FORM_FIELD_FOCUS = 'FORM_FIELD_FOCUS';
  static readonly VIDEO_PLAY = 'VIDEO_PLAY';
  static readonly VIDEO_PAUSE = 'VIDEO_PAUSE';
  static readonly VIDEO_COMPLETE = 'VIDEO_COMPLETE';
  static readonly FILE_DOWNLOAD = 'FILE_DOWNLOAD';
  static readonly LINK_CLICK = 'LINK_CLICK';
  static readonly BUTTON_CLICK = 'BUTTON_CLICK';
  static readonly PRODUCT_VIEW = 'PRODUCT_VIEW';
  static readonly ADD_TO_CART = 'ADD_TO_CART';
  static readonly SEARCH = 'SEARCH';
  static readonly CUSTOM = 'CUSTOM';
}

/**
 * Value Object para el tipo de evento
 * Diseño extensible: acepta cualquier string para permitir eventos personalizados
 */
export class EventType extends PrimitiveValueObject<string> {
  constructor(value: string) {
    super(
      value,
      (val) => val !== null && val !== undefined && val.trim().length > 0,
      'El tipo de evento no puede estar vacío',
    );
  }

  /**
   * Factory methods para tipos comunes
   */
  public static pageView(): EventType {
    return new EventType(EventTypes.PAGE_VIEW);
  }

  public static click(): EventType {
    return new EventType(EventTypes.CLICK);
  }

  public static scroll(): EventType {
    return new EventType(EventTypes.SCROLL);
  }

  public static mouseMove(): EventType {
    return new EventType(EventTypes.MOUSE_MOVE);
  }

  public static formSubmit(): EventType {
    return new EventType(EventTypes.FORM_SUBMIT);
  }

  public static custom(): EventType {
    return new EventType(EventTypes.CUSTOM);
  }

  /**
   * Verifica si es un tipo de evento de alta frecuencia
   * Útil para aplicar throttling
   */
  public isHighFrequency(): boolean {
    return [EventTypes.MOUSE_MOVE, EventTypes.SCROLL].includes(this.value);
  }

  /**
   * Verifica si es un tipo de evento crítico
   * Los eventos críticos nunca se descartan por throttling
   */
  public isCritical(): boolean {
    return [
      EventTypes.FORM_SUBMIT,
      EventTypes.ADD_TO_CART,
      EventTypes.PRODUCT_VIEW,
      EventTypes.SEARCH,
    ].includes(this.value);
  }
}
