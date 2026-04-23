# AGENTS.md - Auth Context

Authentication and authorization system for the Guiders backend. Handles user authentication, API key management, and role-based access control.

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md)

## Context Overview

The Auth context is responsible for:

- User authentication (JWT tokens)
- API key generation and validation
- Role and permission management
- Visitor authentication (for chat widget)
- Token refresh and revocation

This context is **shared across all other contexts** and acts as a foundational layer for security.

## Directory Structure

```
src/context/auth/
├── api-key/                    # Widget API key subdomain (RSA/JWKS, visitor auth)
│   ├── domain/                 # Business logic for widget API keys
│   ├── application/            # Commands and queries
│   └── infrastructure/         # Repository implementations
├── integration-api-key/        # Integration API key subdomain (REST, server-to-server)
│   ├── domain/                 # IntegrationApiKey aggregate, value objects, errors
│   ├── application/            # Commands and queries
│   └── infrastructure/         # Repository, guard, controller, module
├── auth-user/                  # User authentication subdomain
│   ├── domain/                 # User aggregates and value objects
│   ├── application/            # Auth commands (login, register)
│   └── infrastructure/         # User persistence
├── auth-visitor/               # Visitor authentication subdomain
│   ├── domain/                 # Visitor auth logic
│   ├── application/            # Visitor auth commands
│   └── infrastructure/         # Visitor persistence
└── bff/                        # BFF (Backend for Frontend) layer
    └── controllers/            # HTTP endpoints
```

## Domain Entities

### User Aggregate

```typescript
// src/context/auth/auth-user/domain/user.aggregate.ts
User {
  id: UserId (UUID)
  email: Email
  password: HashedPassword (bcrypt)
  role: Role (ADMIN, USER, COMPANY_ADMIN)
  status: UserStatus (ACTIVE, SUSPENDED, DELETED)
  createdAt: Date
  updatedAt: Date
}
```

### API Key Aggregate (Widget — RSA/JWKS)

```typescript
// src/context/auth/api-key/domain/api-key.aggregate.ts
ApiKey {
  id: ApiKeyId (UUID)
  userId: UserId
  key: string (hashed)
  name: string
  expiresAt: Date | null
  lastUsedAt: Date | null
  status: ApiKeyStatus (ACTIVE, REVOKED)
}
```

### IntegrationApiKey Aggregate (REST — server-to-server)

```typescript
// src/context/auth/integration-api-key/domain/integration-api-key.aggregate.ts
IntegrationApiKey {
  id: IntegrationApiKeyId (UUID)
  companyId: CompanyId
  name: IntegrationApiKeyName
  tokenHash: IntegrationApiKeyHash  // SHA-256, nunca el token en claro
  tokenPrefix: IntegrationApiKeyPrefix  // primeros chars para mostrar en UI
  environment: IntegrationApiKeyEnvironment  // 'live' | 'test'
  status: IntegrationApiKeyStatus  // 'active' | 'revoked'
  lastUsedAt: Date | null
  createdAt: Date
}
// Tokens: gdr_live_<32hex> (producción) / gdr_test_<32hex> (sandbox)
```

### Visitor Auth

```typescript
// src/context/auth/auth-visitor/domain/visitor-session.aggregate.ts
VisitorSession {
  id: SessionId (UUID)
  visitorId: VisitorId
  token: JWT token
  expiresAt: Date
  createdAt: Date
}
```

## Key Use Cases

### User Authentication

- **Login**: Generate JWT token for valid credentials
- **Register**: Create new user account
- **Refresh Token**: Issue new token before expiration
- **Logout**: Invalidate current token
- **Reset Password**: Secure password recovery flow

### API Key Management (Widget)

- **Create API Key**: Generate new RSA-signed key for widget authentication
- **List API Keys**: Show user's active keys
- **Revoke API Key**: Disable specific key
- **Validate API Key**: Verify key in requests (JWKS)

### Integration API Key Management (Server-to-Server)

- **Create Integration API Key**: Generate `gdr_live_xxx` / `gdr_test_xxx` token for external backend integrations. Token returned only once; hash stored.
- **List Integration API Keys**: Show company's active integration keys (with prefix for UI display)
- **Revoke Integration API Key**: Disable specific integration key by ID
- **Validate via Guard**: `IntegrationApiKeyGuard` validates `x-api-key` header, checks SHA-256 hash, updates `lastUsedAt` fire-and-forget

### Visitor Authentication

- **Initialize Session**: Create anonymous session for chat widget
- **Validate Token**: Check visitor token validity
- **Identify Visitor**: Link visitor session to identified user

## Commands

### AuthUserContext

- `CreateUserCommand` → User registration
- `LoginUserCommand` → JWT generation
- `RefreshTokenCommand` → New token issuance
- `UpdatePasswordCommand` → Change user password
- `UpdateUserRoleCommand` → Admin role assignment

### ApiKeyContext (Widget)

- `CreateApiKeyCommand` → Generate new widget API key
- `RevokeApiKeyCommand` → Disable widget API key
- `ValidateApiKeyCommand` → Check key validity
- `UpdateApiKeyCommand` → Modify metadata

### IntegrationApiKeyContext (Server-to-Server)

- `CreateIntegrationApiKeyCommand` → Generate new integration API key (hashes token, returns plain once)
- `RevokeIntegrationApiKeyCommand` → Disable integration API key by ID

### VisitorAuthContext

- `InitializeVisitorSessionCommand` → Create session
- `ValidateVisitorTokenCommand` → Verify token
- `IdentifyVisitorCommand` → Link to user

## Queries

### AuthUserContext

- `GetUserByIdQuery` → Fetch user details
- `GetUserByEmailQuery` → Look up user by email
- `GetUserRoleQuery` → Check user permissions

### ApiKeyContext (Widget)

- `GetApiKeyQuery` → Fetch key details
- `ListUserApiKeysQuery` → User's active widget keys
- `ValidateApiKeyQuery` → Check key status

### IntegrationApiKeyContext (Server-to-Server)

- `ListIntegrationApiKeysQuery` → Company's integration keys (paginated, with prefix)

### VisitorAuthContext

- `GetVisitorSessionQuery` → Fetch session data
- `ValidateSessionQuery` → Verify session validity

## Events

- `UserCreatedEvent` → User account created
- `UserLoggedInEvent` → Successful login
- `UserLoggedOutEvent` → Session ended
- `PasswordChangedEvent` → Password updated
- `ApiKeyCreatedEvent` → New widget API key generated
- `ApiKeyRevokedEvent` → Widget API key disabled
- `IntegrationApiKeyCreatedEvent` → New integration API key generated
- `IntegrationApiKeyRevokedEvent` → Integration API key revoked
- `VisitorSessionInitializedEvent` → New visitor session
- `VisitorIdentifiedEvent` → Visitor linked to user

### integration_api_keys table

```sql
CREATE TABLE integration_api_keys (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,   -- SHA-256 del token en claro
  token_prefix VARCHAR(50) NOT NULL,          -- e.g. "gdr_live_a1b2c3..." para UI
  environment VARCHAR(10) NOT NULL,           -- 'live' | 'test'
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

> **Nota de seguridad**: el token en claro (`gdr_live_xxx` / `gdr_test_xxx`) se
> devuelve **una única vez** en la respuesta de creación y **nunca** se almacena
> en base de datos. Solo el hash SHA-256 persiste.

### users table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### api_keys table

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Integration Points

| Context          | Purpose                 | Method                            |
| ---------------- | ----------------------- | --------------------------------- |
| company          | User belongs to company | Foreign key on user entity        |
| leads            | User can manage leads   | Permission check in leads queries |
| visitors-v2      | Visitor identification  | Visitor session creation          |
| conversations-v2 | User in chat            | JWT validation on WebSocket       |
| all contexts     | Authorization           | Guard decorators on endpoints     |

## Testing Strategy

### Unit Tests (Fast - SQLite in-memory)

```bash
npm run test:unit -- src/context/auth/**/*.spec.ts
```

Test commands, queries, and domain logic without DB dependencies:

- User creation and password hashing
- API key generation and validation
- Role-based access checks
- Token expiration logic

### Integration Tests (Real Database)

```bash
npm run test:int -- src/context/auth/**/*.spec.ts
```

Test persistence and interactions:

- User CRUD operations
- JWT token creation and validation
- API key repository operations
- Event publishing

### E2E Tests

```bash
npm run test:e2e
```

Test HTTP endpoints:

- POST /auth/login
- POST /auth/register
- POST /auth/refresh
- POST /auth/api-keys
- DELETE /auth/api-keys/:id

## Implementation Guidelines

### Password Security

```typescript
// Always hash passwords using bcrypt
const hash = await bcrypt.hash(plainPassword, 10);
return ok(hash);
```

### JWT Configuration

```typescript
// Token payload should include minimal info
{
  sub: userId,
  role: role,
  iat: now,
  exp: expirationTime
}
```

### API Key Storage

```typescript
// Store only hashed keys, never plain text
const keyHash = await crypto.subtle.digest('SHA-256', key);
```

### Authorization Checks

```typescript
// Use guards at controller level
@UseGuards(JwtAuthGuard)
@Post('protected-endpoint')
async handler() { }
```

## Common Patterns

### Validating User Before Action

```typescript
const userResult = await this.userRepository.findById(userId);
if (userResult.isErr()) return userResult; // Propagate error
const user = userResult.unwrap();
```

### Token Refresh Flow

```typescript
// 1. Validate current token is still valid (not expired)
// 2. Check user hasn't been suspended
// 3. Generate new token with updated expiration
// 4. Emit TokenRefreshedEvent
```

### API Key Validation

```typescript
// 1. Extract key from Authorization header
// 2. Hash and lookup in database
// 3. Check expiration and status
// 4. Return error if invalid
```

## Known Limitations

- Token revocation list not implemented (invalidate on logout via external cache)
- No multi-factor authentication (MFA) support yet
- API key rotation not automated
- No rate limiting on auth endpoints at this layer (use API Gateway)
- Password reset tokens stored in-memory (not persisted)

## Security Considerations

1. **NEVER log passwords or tokens**
2. **Always use HTTPS** for auth endpoints
3. **Implement CORS** properly for cross-origin requests
4. **Use secure cookie settings** (httpOnly, secure, sameSite)
5. **Validate input** before hashing/comparing
6. **Use strong JWT secrets** (32+ chars, generated, not hardcoded)

## Related Documentation

- [Shared Context](../shared/AGENTS.md) - Common patterns and utilities
- [Company Context](../company/AGENTS.md) - User-company relationships
- [Root AGENTS.md](../../AGENTS.md) - Architecture overview

## Troubleshooting

### "Invalid token" on protected endpoints

- Check JWT secret matches between sign and verify
- Verify token hasn't expired
- Ensure Authorization header format: `Bearer {token}`

### API key validation failing

- Verify key is active (not revoked)
- Check key hasn't expired
- Ensure key hash matches stored value

### Password hash mismatch

- Use same bcrypt salt rounds as when hashing (should be 10)
- Never compare plain passwords directly
