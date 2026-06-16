---
name: try-tdd-generator
description: Wrapper SOP for the @tdd-generator subagent with automatic fallback to manual test writing. Use this whenever you need to invoke @tdd-generator for a new story.
---

# try-tdd-generator — SOP for TDD RED phase

## Why this skill exists

The `@tdd-generator` subagent (`subagent_type: "tdd-generator"`) has been observed to return empty output (`<output></output>`) in **2/2 consecutive invocations** (Story 2.1 + Story 2.2 of Epic 2). The root cause is unknown — it may be a model issue, prompt issue, or environment issue. Until fixed, we need a wrapper SOP that:

1. **Detects** when the subagent fails to produce useful output.
2. **Falls back** to a deterministic pattern that the dev agent (main agent) follows to write tests manually.
3. **Validates** the result before proceeding to GREEN.

## When to use

ANY time you need failing tests for a new story, BEFORE invoking `@tdd-generator`. This is the **only** sanctioned entry point for TDD RED phase in this project.

## How to use (3 steps)

### Step 1: Invoke subagent

Call `@tdd-generator` with the story spec. Use `task` tool with:

```
subagent_type: "tdd-generator"
prompt: |
  <story context>
  <reference to .opencode/agents/tdd-generator.md for the full prompt structure>
```

**Expected output**: A list of `Files created (absolute paths)` followed by test counts per file, ending with a self-score.

### Step 2: Detect failure

Inspect the subagent's `task_result` for these **failure signals** (any one triggers fallback):

| Signal | Detection |
|--------|-----------|
| Empty output | `result === ''` or `result === null` or `result === undefined` |
| Empty tags | `result.trim() === '<output></output>'` |
| Missing files | The output does NOT list "Files created" or list them with 0 files |
| No test counts | The output does NOT mention "Test counts per file" or "X tests" |
| Self-score < 8 | The output mentions "score < 8" or "concerns" without files |
| No failure output | Running `npm run test:unit -- <path>` does NOT show failing tests (passes instead) |

If ANY of these signals is present, **immediately proceed to Step 3 (fallback)**. Do NOT retry the subagent — retrying has been observed to fail 2/2 times.

### Step 3: Fallback (manual test writing)

The dev agent (you, the main agent) writes the tests manually, following this **validated pattern** from Story 1.3, 2.1, and 2.2.

#### Pattern A: Unit test for a service with mocked dependencies

```typescript
// Path: src/context/<context>/<layer>/__tests__/<name>.spec.ts

import { ServiceUnderTest } from '../<name>';
import { Dependency } from '<path-to-dep>';
import { DEPENDENCY_SYMBOL } from '<path-to-symbol>';
import { ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

// CRITICAL (AI-3 from Story 2.1 retro): never use `instanceof BaseError`
// for error assertions. Use specific message or subclass.
class TestDomainError extends DomainError {
  constructor() {
    super('Test failure');
  }
}

describe('ServiceUnderTest - Story X.Y (unit)', () => {
  let service: ServiceUnderTest;
  let mockDep: jest.Mocked<Dependency>;

  beforeEach(() => {
    mockDep = {
      method1: jest.fn(),
      method2: jest.fn(),
    } as unknown as jest.Mocked<Dependency>;

    service = new ServiceUnderTest(mockDep);
  });

  describe('happy path', () => {
    it('debe retornar ok con resultado esperado', async () => {
      mockDep.method1.mockResolvedValue(ok({ data: 'test' }));

      const result = await service.doSomething();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ data: 'test' });
      }
    });
  });

  describe('error path', () => {
    it('debe retornar err con mensaje específico', async () => {
      mockDep.method1.mockResolvedValue(err(new TestDomainError()));

      const result = await service.doSomething();

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // AI-3: specific message assertion
        expect(result.error.message).toContain('Test failure');
      }
    });
  });
});
```

#### Pattern B: E2E test (controller + guards + handlers)

```typescript
// Path: test/<name>.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import * as request from 'supertest';
import { Controller } from '../src/context/...';
import { Handler } from '../src/context/...';
import { Guard, Request } from '../src/context/...';

// Mocks declared as `const` with jest.fn() (NOT reasignados in buildApp)
// Lesson from Story 2.1/2.2: `let` mocks lose reference after reassignment
const mockDep: jest.Mocked<Dependency> = {
  method: jest.fn(),
} as unknown as jest.Mocked<Dependency>;

class MockGuard {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    req.<auth_field> = { /* ... */ };
    return true;
  }
}

class RejectingGuard {
  canActivate(): boolean {
    throw new UnauthorizedException('Auth required');
  }
}

describe('POST /path - Story X.Y (e2e)', () => {
  let app: INestApplication;

  // CRITICAL (Story 1.3 + 2.1 pattern): buildApp BEFORE mockResolvedValue
  async function buildApp(guard: typeof MockGuard | typeof RejectingGuard, args: string[] = []): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [Controller],
      providers: [
        Handler,
        { provide: DEPENDENCY_SYMBOL, useValue: mockDep },
      ],
    })
      .overrideGuard(Guard)
      .useValue(args.length === 0 ? new RejectingGuard() : new MockGuard(args[0]))
      .compile();

    const testApp = moduleRef.createNestApplication();
    testApp.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await testApp.init();
    return testApp;
  }

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) await app.close();
  });

  it('happy path', async () => {
    mockDep.method.mockResolvedValue(ok({}));  // SETUP mock BEFORE buildApp
    app = await buildApp(MockGuard, [SOME_VALUE]);

    const res = await request(app.getHttpServer())
      .post('/path')
      .send({ ... })
      .expect(200);

    expect(res.body).toEqual({ ... });
  });
});
```

#### Pattern C: InMemoryRedisClient (for Redis-backed services)

```typescript
class InMemoryRedisClient {
  public store = new Map<string, string>();
  public setLog: string[] = [];

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }

  set(key: string, value: string, options?: { EX?: number }): Promise<'OK' | null> {
    this.store.set(key, value);
    if (options?.EX !== undefined) {
      this.store.set(`${key}:__ttl`, String(options.EX));
    }
    return Promise.resolve('OK');
  }

  del(key: string): Promise<number> {
    const had = this.store.delete(key) ? 1 : 0;
    return Promise.resolve(had);
  }

  quit(): Promise<'OK'> {
    return Promise.resolve('OK');
  }
}
```

#### Pattern D: For InMemoryRedisClient with Lua (REFRESH_LUA atomic), see Story 1.2 `redis-embed-token.service.spec.ts`

### Step 4: Verify RED

After writing the tests:

1. Run the new test file: `npx jest --config ./jest-unit.json <path>`
2. Confirm it FAILS (RED): "Test Suites: 1 failed, 1 total" with the import error or missing module error
3. If tests PASS (GREEN accidentally), the test is wrong — fix the assertions until they fail for the right reason

### Step 5: Commit

```bash
git add <files>
git commit -m "test(<context>): Story X.Y — failing tests (RED phase)

Generated by try-tdd-generator fallback (subagent returned empty output).

Validates:
- AC1: <description>
- AC2: <description>
- ...

<count> unit tests in <suite1>
<count> e2e tests in <suite2>

Refs: <story spec path>"
```

## When to FIX the subagent instead of falling back

If `@tdd-generator` consistently fails (3+ consecutive stories), open a code review on `.opencode/agents/tdd-generator.md` and check:
- Is the prompt structure current?
- Is the model field still valid (anthropic/claude-sonnet-4-20250514)?
- Is the temperature (0.2) too low/high?
- Are the bash permissions too restrictive?

The expected solution is a **better subagent prompt**, not a permanent fallback.

## Reference: Story 2.2 fallout

- Story 2.1 first invocation: `<output></output>` (empty)
- Story 2.2 first invocation: `<output></output>` (empty)
- Story 2.2 second invocation (more specific prompt): `<output></output>` (empty)
- Both fell back to manual test writing
- Cost: ~30 min per story for manual fallback
- This skill consolidates the fallback pattern to reduce cost going forward

## Related

- Story 2.1 mini-retro: AI-1 action item (this skill is AI-1.5 — improved version)
- Story 2.2 mini-retro: confirms AI-1 priority
- `.opencode/agents/tdd-generator.md`: the subagent definition
- AGENTS.md section "TDD Strategy" + "Subagents Disponibles" (must be updated to reference this skill)
