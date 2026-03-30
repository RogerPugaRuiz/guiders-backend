# AGENTS.md - Visitors (Legacy V1)

**⚠️ DEPRECATED**: This is the legacy V1 implementation using PostgreSQL. **Use [Visitors V2](../visitors-v2/AGENTS.md) for new features.**

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Active Version**: [Visitors V2](../visitors-v2/AGENTS.md)

## Context Overview

This context is maintained for backward compatibility only. It provides the legacy PostgreSQL-based visitor tracking implementation.

**Do not use this context for new development. All new features should be implemented in [Visitors V2](../visitors-v2/AGENTS.md).**

This context handles visitor tracking system using PostgreSQL (legacy V1 implementation).

## Status

- **Version**: V1 (Legacy)
- **Database**: PostgreSQL
- **Maintenance**: Bug fixes and security patches only
- **New Features**: Must use [Visitors V2](../visitors-v2/AGENTS.md)

This context is maintained for backward compatibility with existing deployments but should not be used for new development.

## Migration Path

To migrate from V1 to V2:

1. Set up Visitors V2 MongoDB collections
2. Run migration script to transfer visitor data
3. Update SDK initialization to use V2 API
4. Migrate visitor sessions gradually
5. Archive old visitor records after retention period

## Key Differences from V2

| Feature     | V1                      | V2                     |
| ----------- | ----------------------- | ---------------------- |
| Database    | PostgreSQL              | MongoDB                |
| Scalability | Limited                 | High                   |
| Sessions    | Basic tracking          | Advanced tracking      |
| Performance | Good for < 10M visitors | Optimized for billions |

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/visitors/**/*.spec.ts
```

Test domain logic for legacy visitor tracking.

### Integration Tests

```bash
npm run test:int -- src/context/visitors/**/*.spec.ts
```

Test PostgreSQL persistence and legacy endpoints.

### Note on Testing

For new tests, use [Visitors V2](../visitors-v2/AGENTS.md) patterns instead.

## Related Documentation

- [Visitors V2](../visitors-v2/AGENTS.md) - Recommended version (MongoDB-based)
- [Root AGENTS.md](../../AGENTS.md) - Architecture overview

Visitor tracking system (PostgreSQL-based legacy implementation).

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Active Version**: [Visitors V2](../visitors-v2/AGENTS.md)

## Status

- **Version**: V1 (Legacy)
- **Database**: PostgreSQL
- **Maintenance**: Bug fixes only
- **New Features**: Use Visitors V2 instead

This context is maintained for backward compatibility with existing deployments but should not be used for new development.

## Migration Path

To migrate from V1 to V2:

1. Set up Visitors V2 MongoDB collections
2. Run migration script to transfer visitor data
3. Update SDK initialization to use V2 API
4. Migrate visitor sessions gradually
5. Archive old visitor records after retention period

## Key Differences from V2

| Feature     | V1                      | V2                     |
| ----------- | ----------------------- | ---------------------- |
| Database    | PostgreSQL              | MongoDB                |
| Scalability | Limited                 | High                   |
| Sessions    | Basic tracking          | Advanced tracking      |
| Performance | Good for < 10M visitors | Optimized for billions |

## Related Documentation

- [Visitors V2](../visitors-v2/AGENTS.md) - Recommended version
- [Root AGENTS.md](../../AGENTS.md) - Architecture overview
