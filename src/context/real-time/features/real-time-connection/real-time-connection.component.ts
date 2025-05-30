/**
 * Real-Time Connection Component
 * 
 * Este componente sirve como punto de entrada para la feature de conexiones en tiempo real.
 * Centraliza las importaciones y exportaciones para facilitar el acceso a la funcionalidad relacionada con WebSockets.
 */
export * from './application/command/connect';
export * from './application/command/disconnect';
export * from './application/command/message';
export * from './application/event';
export * from './application/query/find';
export * from './application/query/find-one';
export * from './domain';
export * from './infrastructure/guards';
export * from './infrastructure/services';