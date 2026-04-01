/**
 * Tipos específicos para la integración con LeadCars API v2.4
 * Documentación oficial: docs/leadcar/LeadCars_API_V2_4.pdf
 */

/**
 * Configuración específica de LeadCars
 */
export interface LeadcarsConfig {
  clienteToken: string;
  useSandbox: boolean;
  concesionarioId: number;
  sedeId?: number;
  /** Código de campaña (texto, no numérico). Antes: campanaId (number) */
  campanaCode?: string;
  /** ID numérico del tipo de lead obtenido de GET /tipos. Antes: string enum */
  tipoLeadDefault: number;
}

/**
 * Request para crear un lead en LeadCars (API v2.4)
 * Campos dinámicos se envían al nivel raíz mediante el index signature.
 */
export interface LeadcarsCreateLeadRequest {
  nombre: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  /** Teléfono móvil adicional en formato E.164 */
  movil?: string;
  /** Código postal */
  cp?: string;
  /** Provincia (antes: poblacion) */
  provincia?: string;
  /** Comentario/observaciones (antes: observaciones) */
  comentario?: string;
  /** URL de origen del lead */
  url_origen?: string;
  /** ID del concesionario (antes: concesionario_id) */
  concesionario: number;
  /** ID de la sede (antes: sede_id) */
  sede?: number;
  /** ID numérico del tipo de lead de GET /tipos (antes: LeadcarsTipoLead string enum) */
  tipo_lead: number;
  /** Código de campaña en texto (antes: campana_id number) */
  campana?: string;
  /** Campos dinámicos clave:valor al nivel raíz del JSON */
  [key: string]: unknown;
}

/**
 * Response de crear lead en LeadCars
 */
export interface LeadcarsCreateLeadResponse {
  success: boolean;
  data?: {
    id: number;
    referencia: string;
    nombre: string;
    email?: string;
    telefono?: string;
    estado: string;
    created_at: string;
    updated_at: string;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * Request para añadir conversación de chat a un lead
 */
export interface LeadcarsAddChatConversationRequest {
  lead_id: number;
  conversacion: LeadcarsChatMessage[];
  fecha_inicio: string;
  fecha_fin?: string;
  resumen?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Mensaje individual de chat para LeadCars
 */
export interface LeadcarsChatMessage {
  emisor: 'VISITANTE' | 'COMERCIAL' | 'BOT';
  mensaje: string;
  fecha: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response de añadir conversación
 */
export interface LeadcarsAddConversationResponse {
  success: boolean;
  data?: {
    id: number;
    lead_id: number;
    created_at: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Request para añadir comentario a un lead
 */
export interface LeadcarsAddCommentRequest {
  lead_id: number;
  comentario: string;
  tipo?: 'NOTA' | 'SEGUIMIENTO' | 'IMPORTANTE';
  privado?: boolean;
}

/**
 * Response de añadir comentario
 */
export interface LeadcarsAddCommentResponse {
  success: boolean;
  data?: {
    id: number;
    lead_id: number;
    comentario: string;
    created_at: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Response genérica de error de LeadCars
 */
export interface LeadcarsErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * Información de concesionario
 */
export interface LeadcarsConcesionario {
  id: number;
  nombre: string;
  codigo?: string;
  activo: boolean;
}

/**
 * Información de sede
 */
export interface LeadcarsSede {
  id: number;
  nombre: string;
  concesionario_id: number;
  direccion?: string;
  activo: boolean;
}

/**
 * Información de campaña
 */
export interface LeadcarsCampana {
  id: number;
  nombre: string;
  codigo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo: boolean;
}

/**
 * Response de listar concesionarios
 */
export interface LeadcarsListConcesionariosResponse {
  success: boolean;
  data?: LeadcarsConcesionario[];
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Response de listar sedes
 */
export interface LeadcarsListSedesResponse {
  success: boolean;
  data?: LeadcarsSede[];
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Response de listar campañas
 */
export interface LeadcarsListCampanasResponse {
  success: boolean;
  data?: LeadcarsCampana[];
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Tipo de lead de LeadCars (obtenido de GET /tipos)
 */
export interface LeadcarsTipoLeadItem {
  id: number;
  nombre: string;
}

/**
 * Response de listar tipos de lead
 */
export interface LeadcarsListTiposResponse {
  success: boolean;
  data?: LeadcarsTipoLeadItem[];
  error?: {
    code: string;
    message: string;
  };
}

/**
 * URLs base de LeadCars API v2.4
 */
export const LEADCARS_API_URLS = {
  production: 'https://api.leadcars.es/api/v2',
  sandbox: 'https://apisandbox.leadcars.es/api/v2',
} as const;

/**
 * Configuración de retry para LeadCars
 */
export const LEADCARS_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
} as const;

/**
 * Headers requeridos para LeadCars API
 */
export const LEADCARS_REQUIRED_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
} as const;
