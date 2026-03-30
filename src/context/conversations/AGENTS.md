# AGENTS.md - Conversations (Legacy V1)

**⚠️ DEPRECATED**: This is the legacy V1 implementation using PostgreSQL. **Use [Conversations V2](../conversations-v2/AGENTS.md) for new features.**

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Active Version**: [Conversations V2](../conversations-v2/AGENTS.md)

## Context Overview

This context is maintained for backward compatibility only. It provides the legacy PostgreSQL-based chat implementation.

**Do not use this context for new development. All new features should be implemented in [Conversations V2](../conversations-v2/AGENTS.md).**

This context handles real-time chat system using PostgreSQL (legacy V1 implementation).

## Status

- **Version**: V1 (Legacy)
- **Database**: PostgreSQL
- **Maintenance**: Bug fixes and security patches only
- **New Features**: Must use [Conversations V2](../conversations-v2/AGENTS.md)

This context is maintained for backward compatibility with existing deployments but should not be used for new development.

## Migration Path

To migrate from V1 to V2:

1. Set up Conversations V2 MongoDB collections
2. Run migration script to transfer data
3. Update SDK to point to V2 endpoints
4. Deprecate V1 endpoints gradually
5. Archive old conversations after retention period

## Key Differences from V2

| Feature     | V1                  | V2                     |
| ----------- | ------------------- | ---------------------- |
| Database    | PostgreSQL          | MongoDB                |
| Scalability | Limited             | High                   |
| Real-time   | WebSocket (basic)   | WebSocket (optimized)  |
| Performance | Good for < 1M chats | Optimized for millions |

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/conversations/**/*.spec.ts
```

Test domain logic for legacy chat system.

### Integration Tests

```bash
npm run test:int -- src/context/conversations/**/*.spec.ts
```

Test PostgreSQL persistence and legacy endpoints.

### Note on Testing

For new tests, use [Conversations V2](../conversations-v2/AGENTS.md) patterns instead.

## Related Documentation

- [Conversations V2](../conversations-v2/AGENTS.md) - Recommended version (MongoDB-based)
- [Root AGENTS.md](../../AGENTS.md) - Architecture overview

Real-time chat system (PostgreSQL-based legacy implementation).

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Active Version**: [Conversations V2](../conversations-v2/AGENTS.md)

## Status

- **Version**: V1 (Legacy)
- **Database**: PostgreSQL
- **Maintenance**: Bug fixes only
- **New Features**: Use Conversations V2 instead

This context is maintained for backward compatibility with existing deployments but should not be used for new development.

## Migration Path

To migrate from V1 to V2:

1. Set up Conversations V2 MongoDB collections
2. Run migration script to transfer data
3. Update SDK to point to V2 endpoints
4. Deprecate V1 endpoints gradually
5. Archive old conversations after retention period

## Key Differences from V2

| Feature     | V1                  | V2                     |
| ----------- | ------------------- | ---------------------- |
| Database    | PostgreSQL          | MongoDB                |
| Scalability | Limited             | High                   |
| Real-time   | WebSocket (basic)   | WebSocket (optimized)  |
| Performance | Good for < 1M chats | Optimized for millions |

## Related Documentation

- [Conversations V2](../conversations-v2/AGENTS.md) - Recommended version
- [Root AGENTS.md](../../AGENTS.md) - Architecture overview
