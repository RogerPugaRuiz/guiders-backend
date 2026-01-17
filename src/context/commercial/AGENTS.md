# AGENTS.md - Commercial Context

Billing, subscriptions, and commercial operations. Manages customer billing, invoicing, and revenue tracking.

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Related**: [Company](../company/AGENTS.md)

## Context Overview

The Commercial context handles:

- Subscription billing and payment processing
- Invoice generation and tracking
- Usage-based billing calculation
- Payment method management
- Billing history and reports
- Revenue analytics

This context integrates with company subscriptions and tracks revenue.

## Integration Points

| Context     | Purpose                   | Method           |
| ----------- | ------------------------- | ---------------- |
| company     | Company subscriptions     | Billing status   |
| tracking-v2 | Usage metrics for billing | Event count      |
| leads       | Deal tracking             | Revenue per lead |

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/commercial/**/*.spec.ts
```

### Integration Tests

```bash
npm run test:int -- src/context/commercial/**/*.spec.ts
```

## Related Documentation

- [Company Context](../company/AGENTS.md) - Subscriptions
- [Root AGENTS.md](../../AGENTS.md) - Architecture overview
