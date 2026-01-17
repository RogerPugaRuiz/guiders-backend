# AGENTS.md - Lead Scoring Context

Lead quality scoring and qualification. Calculates lead scores based on behavior, attributes, and engagement.

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Related**: [Leads](../leads/AGENTS.md), [Tracking V2](../tracking-v2/AGENTS.md)

## Context Overview

The Lead Scoring context handles:

- Lead score calculation algorithms
- Scoring model management
- Behavior-based scoring
- Attribute-based scoring
- Lead qualification automation
- Score history and trends

This context provides AI-powered lead qualification.

## Integration Points

| Context     | Purpose             | Method            |
| ----------- | ------------------- | ----------------- |
| leads       | Lead qualification  | Score calculation |
| visitors-v2 | Visitor scoring     | Pre-lead scoring  |
| tracking-v2 | Event-based scoring | Behavior analysis |

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/lead-scoring/**/*.spec.ts
```

### Integration Tests

```bash
npm run test:int -- src/context/lead-scoring/**/*.spec.ts
```

## Related Documentation

- [Leads Context](../leads/AGENTS.md) - Lead management
- [Tracking V2](../tracking-v2/AGENTS.md) - Behavior tracking
- [Root AGENTS.md](../../AGENTS.md) - Architecture overview
