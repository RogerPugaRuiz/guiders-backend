# AGENTS.md - Consent Context

Consent management and GDPR compliance. Manages visitor consent for tracking, marketing, and data processing.

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Related**: [Visitors V2](../visitors-v2/AGENTS.md)

## Context Overview

The Consent context handles:

- Consent preference management
- Cookie consent tracking
- Privacy policy acceptance
- Data processing preferences
- Consent withdrawal
- Compliance reporting

This context ensures GDPR and privacy law compliance.

## Integration Points

| Context     | Purpose          | Method                  |
| ----------- | ---------------- | ----------------------- |
| visitors-v2 | Visitor consent  | Consent flags           |
| tracking-v2 | Event consent    | Only track if consented |
| company     | Privacy settings | Per-company policies    |

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/consent/**/*.spec.ts
```

### Integration Tests

```bash
npm run test:int -- src/context/consent/**/*.spec.ts
```

## Related Documentation

- [Visitors V2](../visitors-v2/AGENTS.md) - Visitor tracking
- [Root AGENTS.md](../../AGENTS.md) - Architecture overview
