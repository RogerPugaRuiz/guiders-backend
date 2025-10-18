export * from './tracking-event-id';
export * from './event-type';
export * from './event-metadata';
export * from './event-occurred-at';

// Re-exportar value objects compartidos para conveniencia
export { VisitorId } from '../../../visitors-v2/domain/value-objects/visitor-id';
export { SessionId } from '../../../visitors-v2/domain/value-objects/session-id';
export { TenantId } from '../../../visitors-v2/domain/value-objects/tenant-id';
export { SiteId } from '../../../visitors-v2/domain/value-objects/site-id';
