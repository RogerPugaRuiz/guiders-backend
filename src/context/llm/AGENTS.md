# AGENTS.md - LLM Context

Large Language Model integration and AI-powered features. Handles LLM API interactions, prompt management, and AI-driven capabilities.

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md)

## Context Overview

The LLM context provides:

- OpenAI, Anthropic, and other LLM integrations
- Prompt management and templating
- Conversation history tracking
- Response generation and streaming
- Cost tracking and rate limiting
- Prompt engineering utilities

This context powers AI features throughout the platform.

## Integration Points

| Context          | Purpose                     | Method                |
| ---------------- | --------------------------- | --------------------- |
| conversations-v2 | AI-assisted chat responses  | Streaming responses   |
| leads            | Lead qualification scoring  | Prompt-based analysis |
| visitors-v2      | Visitor segment suggestions | Classification        |

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/llm/**/*.spec.ts
```

### Integration Tests

```bash
npm run test:int -- src/context/llm/**/*.spec.ts
```

## Related Documentation

- [Conversations V2](../conversations-v2/AGENTS.md) - Chat integration
- [Root AGENTS.md](../../AGENTS.md) - Architecture overview
