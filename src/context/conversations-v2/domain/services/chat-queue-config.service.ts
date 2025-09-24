/**
 * Configuración del sistema de colas de chat
 * Permite activar/desactivar el modo cola sin afectar funcionamiento actual
 */
export interface ChatQueueConfig {
  /**
   * Indica si el modo cola está activo
   * false: Asignación directa (comportamiento actual)
   * true: Los chats van a cola primero
   */
  queueModeEnabled: boolean;

  /**
   * Tiempo máximo en cola antes de asignación automática (segundos)
   */
  maxQueueWaitTimeSeconds: number;

  /**
   * Número máximo de chats en cola por departamento
   */
  maxQueueSizePerDepartment: number;

  /**
   * Indica si se debe notificar a comerciales sobre nuevos chats en cola
   */
  notifyCommercialsOnNewChats: boolean;
}

/**
 * Símbolo para inyección de dependencias
 */
export const CHAT_QUEUE_CONFIG_SERVICE = Symbol('ChatQueueConfigService');

/**
 * Servicio de configuración del modo cola
 */
export interface ChatQueueConfigService {
  /**
   * Obtiene la configuración actual del sistema de colas
   */
  getConfig(): ChatQueueConfig;

  /**
   * Verifica si el modo cola está activado
   */
  isQueueModeEnabled(): boolean;

  /**
   * Verifica si un chat debe ir a cola o asignarse directamente
   */
  shouldUseQueue(chatId: string, priority?: string): boolean;

  /**
   * Obtiene el tiempo máximo de espera en cola
   */
  getMaxQueueWaitTime(): number;
}
