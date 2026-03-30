# AGENTS.md - White Label Context

White-label customization for platform white-labeling and branding per company.

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Related**: [Company](../company/AGENTS.md)

## Context Overview

The White Label context handles:

- Custom branding per company (logos, colors, domain)
- Email template customization
- UI theme customization
- Compliance and legal document management
- Custom domain hosting
- Feature customization per plan

This context enables full white-label deployment of the platform.

## Integration Points

| Context          | Purpose                   | Method         |
| ---------------- | ------------------------- | -------------- |
| company          | Company branding settings | Load branding  |
| auth             | Login page theming        | Custom UI      |
| conversations-v2 | Chat widget branding      | Custom styling |

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/white-label/**/*.spec.ts
```

### Integration Tests

```bash
npm run test:int -- src/context/white-label/**/*.spec.ts
```

## Related Documentation

- [Company Context](../company/AGENTS.md) - Company settings
- [Root AGENTS.md](../../AGENTS.md) - Architecture overview
