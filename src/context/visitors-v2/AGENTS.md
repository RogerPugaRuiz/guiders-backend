# AGENTS.md - Visitors V2 Context

Visitor tracking and identification system for real-time engagement. Built with MongoDB to handle millions of visitors with identification and segmentation capabilities.

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Related**: [Conversations V2](../conversations-v2/AGENTS.md)

**Status**: ACTIVE (V2) - Use for new features | **Legacy**: [Visitors V1](../visitors/AGENTS.md) (PostgreSQL, maintenance only)

## Context Overview

The Visitors V2 context handles:

- Anonymous visitor tracking via browser tokens
- Visitor identification (email, name, phone, etc.)
- Session management and lifecycle
- Visitor segmentation and attributes
- Visitor journey tracking (pages visited, actions)
- Identification from chat or form submission

This context is the **foundation for visitor engagement** and integrates with conversations-v2 for chat initiation.

## Directory Structure

```
src/context/visitors-v2/
├── domain/
│   ├── visitor.aggregate.ts    # Visitor aggregate root
│   ├── visitor.repository.ts   # Repository interface
│   ├── entities/
│   │   ├── session.entity.ts   # Browser session tracking
│   │   └── attribute.entity.ts # Custom attributes
│   ├── value-objects/
│   │   ├── visitor-id.ts
│   │   ├── device-id.ts
│   │   └── visitor-status.ts
│   ├── events/                 # Domain events
│   └── errors/
├── application/
│   ├── commands/
│   │   ├── initialize-visitor/
│   │   ├── identify-visitor/
│   │   ├── update-attributes/
│   │   └── track-event/
│   ├── queries/
│   │   ├── get-visitor/
│   │   ├── list-visitors/
│   │   └── get-visitor-journey/
│   ├── events/
│   └── dtos/
└── infrastructure/
    ├── controllers/            # HTTP endpoints
    ├── persistence/
    │   ├── mongo-visitor.repository.ts
    │   └── visitor.mapper.ts
    └── services/
```

## Domain Entities

### Visitor Aggregate (Root)

```typescript
// src/context/visitors-v2/domain/visitor.aggregate.ts
Visitor {
  id: VisitorId (UUID)
  companyId: CompanyId
  email: Email | null
  name: string | null
  phone: string | null
  status: VisitorStatus (ANONYMOUS, IDENTIFIED, RETURNING)
  attributes: Attribute[]
  sessions: Session[]
  lastSeenAt: Date
  identifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
```

### Session Entity

```typescript
// Tracks browser session
Session {
  id: SessionId (UUID)
  visitorId: VisitorId
  deviceId: DeviceId
  userAgent: string
  ipAddress: string
  startedAt: Date
  endedAt: Date | null
  duration: number (seconds)
}
```

### Attribute Entity

```typescript
// Custom visitor attributes
Attribute {
  key: string
  value: unknown (string, number, boolean, object)
  type: 'string' | 'number' | 'boolean' | 'object'
  setAt: Date
}
```

## Value Objects

- `VisitorId` - Unique visitor identifier (UUID)
- `DeviceId` - Device fingerprint
- `VisitorStatus` - ANONYMOUS, IDENTIFIED, RETURNING
- `Email` - Validated email address
- `Phone` - Formatted phone number
- `Attribute` - Key-value custom data

## Key Use Cases

### Visitor Initialization

- **Initialize Anonymous**: Create tracking token for new visitor
- **Identify Visitor**: Link email/name when visitor submits form
- **Merge Sessions**: When returning visitor logs back in
- **Track as Returning**: Mark visitor if seen before

### Visitor Management

- **Update Attributes**: Store custom data (plan, status, tier)
- **Get Visitor Journey**: View pages visited, actions taken
- **Search Visitors**: Filter by email, name, attributes
- **Export Visitor Data**: GDPR data export
- **Delete Visitor**: Hard/soft delete with anonymization

### Session Tracking

- **Start Session**: Browser tab opening
- **End Session**: Browser tab closing
- **Detect Return**: Recognize returning visitor
- **Track Activity**: Log interactions within session

## Commands

### Visitor Initialization

- `InitializeVisitorCommand` → Create anonymous tracking
- `IdentifyVisitorCommand` → Link email/name/phone
- `UpdateVisitorAttributesCommand` → Store custom data
- `MergeVisitorsCommand` → Combine sessions

### Session Management

- `StartSessionCommand` → New browser session
- `EndSessionCommand` → Close session
- `TrackActivityCommand` → Log page view or action

### Visitor Lifecycle

- `DeleteVisitorCommand` → Remove visitor data
- `AnonymizeVisitorCommand` → Remove PII
- `RestoreVisitorCommand` → Undelete visitor

## Queries

### Visitor Information

- `GetVisitorQuery` → Fetch visitor details
- `GetVisitorByEmailQuery` → Look up by email
- `GetVisitorByIdQuery` → Direct lookup
- `ListCompanyVisitorsQuery` → All visitors for company

### Session & Journey

- `GetVisitorSessionsQuery` → All sessions
- `GetVisitorJourneyQuery` → Pages/actions timeline
- `GetActiveSessionsQuery` → Currently online visitors
- `GetSessionDurationQuery` → Time on site

### Analytics

- `GetVisitorSegmentQuery` → Visitors matching criteria
- `GetVisitorMetricsQuery` → Count, engagement, conversion
- `GetReturnVisitorsQuery` → Repeat visitors

## Events

- `VisitorInitializedEvent` → Anonymous visitor created
- `VisitorIdentifiedEvent` → Email/name linked
- `VisitorAttributesUpdatedEvent` → Custom data set
- `SessionStartedEvent` → Browser session began
- `SessionEndedEvent` → Browser session closed
- `VisitorReturnedEvent` → Returning visitor detected
- `VisitorDeletedEvent` → Visitor removed
- `VisitorsIdentifiedEvent` → Bulk identification
- `VisitorEventTrackedEvent` → Action logged

## Database Schema (MongoDB)

### visitors collection

```javascript
db.createCollection('visitors', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['companyId', 'status', 'createdAt'],
      properties: {
        _id: { bsonType: 'objectId' },
        visitorId: { bsonType: 'string' },
        companyId: { bsonType: 'string' },
        email: { bsonType: ['string', 'null'] },
        name: { bsonType: ['string', 'null'] },
        phone: { bsonType: ['string', 'null'] },
        status: { enum: ['ANONYMOUS', 'IDENTIFIED', 'RETURNING'] },
        attributes: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              key: { bsonType: 'string' },
              value: {},
              type: { enum: ['string', 'number', 'boolean', 'object'] },
              setAt: { bsonType: 'date' },
            },
          },
        },
        sessions: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              id: { bsonType: 'string' },
              deviceId: { bsonType: 'string' },
              userAgent: { bsonType: 'string' },
              ipAddress: { bsonType: 'string' },
              startedAt: { bsonType: 'date' },
              endedAt: { bsonType: ['date', 'null'] },
              duration: { bsonType: 'int' },
            },
          },
        },
        lastSeenAt: { bsonType: 'date' },
        identifiedAt: { bsonType: ['date', 'null'] },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

// Indexes
db.visitors.createIndex({ companyId: 1, createdAt: -1 });
db.visitors.createIndex({ companyId: 1, email: 1 }, { unique: false });
db.visitors.createIndex({ companyId: 1, status: 1 });
db.visitors.createIndex({ lastSeenAt: -1 });
```

## SDK Integration

Visitors are identified via browser SDK:

```javascript
// Initialize on page load
<script src="guiders-sdk.js"></script>
<script>
  // Initialize anonymous visitor
  window.Guiders.initialize({
    companyId: 'your-company-id',
    apiKey: 'your-api-key'
  });

  // Identify later (on form submit, login, etc.)
  window.Guiders.identify({
    email: 'visitor@example.com',
    name: 'John Doe',
    phone: '+1234567890'
  });

  // Set custom attributes
  window.Guiders.setAttribute('plan', 'premium');
  window.Guiders.setAttribute('lifecycle', 'customer');

  // Track custom event
  window.Guiders.trackEvent('form_submitted', {
    formId: '123',
    fields: 3
  });

  // Open chat
  window.Guiders.chat.open();
</script>
```

## API Endpoints

### Visitor Initialization

```http
POST /visitors/initialize
{
  "companyId": "company-123",
  "deviceId": "device-fingerprint"
}

Response:
{
  "visitorId": "visitor-456",
  "token": "jwt-token-for-websocket"
}
```

### Identify Visitor

```http
POST /visitors/:id/identify
{
  "email": "john@example.com",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

### Update Attributes

```http
PATCH /visitors/:id/attributes
{
  "plan": "premium",
  "lifecycle": "customer",
  "customField": "value"
}
```

### Get Visitor

```http
GET /visitors/:id
```

## Integration Points

| Context          | Purpose                    | Method               |
| ---------------- | -------------------------- | -------------------- |
| company          | Visitor belongs to company | CompanyId in queries |
| conversations-v2 | Start chat                 | Visitor create chat  |
| leads            | Create lead from visitor   | On identification    |
| tracking-v2      | Log visitor events         | Track activity       |
| auth             | Authenticate visitor       | JWT token            |

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/visitors-v2/**/*.spec.ts
```

Test domain logic:

- Visitor identification
- Session creation
- Attribute validation
- Visitor status transitions

### Integration Tests

```bash
npm run test:int -- src/context/visitors-v2/**/*.spec.ts
```

Test MongoDB operations:

- Visitor CRUD
- Session persistence
- Attribute storage
- Email uniqueness constraints

### E2E Tests

```bash
npm run test:e2e
```

Test endpoints:

- POST /visitors/initialize
- POST /visitors/:id/identify
- PATCH /visitors/:id/attributes
- GET /visitors/:id
- GET /visitors (list)

## Security Guidelines

### PII Protection

```typescript
// Before deletion, anonymize PII
const anonymized = new Visitor(
  visitorId,
  companyId,
  null, // email
  null, // name
  null, // phone
  VisitorStatus.ANONYMIZED,
  [],
);
```

### Company Isolation

```typescript
// Always filter by company
const visitors = await repo.find({
  companyId: userCompanyId,
});
```

### GDPR Compliance

```typescript
// Support data export and deletion
async exportData(visitorId: string): Promise<Buffer> {
  const visitor = await repo.findById(visitorId);
  return JSON.stringify(visitor.toPrimitives());
}

async deleteData(visitorId: string): Promise<void> {
  await repo.delete(visitorId);
}
```

## Performance Considerations

### Efficient Queries

```typescript
// Use indexed fields for lookups
// Good - indexed
const visitor = await repo.find({ companyId, email });

// Bad - not indexed
const visitors = await repo.find({
  attributes: { $elemMatch: { key: 'custom' } },
});
```

### Batch Operations

```typescript
// Bulk identify visitors
const result = await handler.execute(
  new BulkIdentifyVisitorsCommand(companyId, [
    { visitorId: '1', email: 'a@example.com' },
    { visitorId: '2', email: 'b@example.com' },
  ]),
);
```

### Session Cleanup

```typescript
// Archive old sessions to keep document size reasonable
const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
const archived = sessions.filter((s) => s.endedAt < cutoff);
```

## Known Limitations

- No visitor merge during duplicate identification
- Session duration calculated on-demand (not indexed)
- Attributes are untyped (stored as unknown)
- No visitor lifecycle automation
- Bulk operations not implemented
- GDPR delete requests are hard deletes (no audit trail)

## Common Patterns

### Initializing and Identifying

```typescript
// 1. SDK initializes on page load
const initResult = await handler.execute(
  new InitializeVisitorCommand(companyId, deviceId),
);
const visitorId = initResult.unwrap().visitorId;

// 2. On form submit, identify
const idResult = await handler.execute(
  new IdentifyVisitorCommand(
    visitorId,
    Email.create('john@example.com').unwrap(),
    'John Doe',
  ),
);
// Event: VisitorIdentifiedEvent
```

### Tracking Events

```typescript
const trackResult = await handler.execute(
  new TrackActivityCommand(visitorId, 'page_view', {
    url: '/products',
    title: 'Products Page',
    duration: 45000, // 45 seconds
  }),
);
```

### Getting Journey

```typescript
const query = new GetVisitorJourneyQuery(visitorId, {
  limit: 100,
  includeEvents: true,
});
const journey = await queryBus.execute(query);
```

## Future Enhancements

1. **Visitor segmentation engine** - Auto-segment visitors
2. **Predictive scoring** - AI-powered visitor quality
3. **Behavioral automation** - Trigger actions on behavior
4. **Cohort analysis** - Group visitors by behavior
5. **Integration with CRM** - Sync to Salesforce, HubSpot
6. **Advanced attribution** - Track conversion sources

## Related Documentation

- [Conversations V2](../conversations-v2/AGENTS.md) - Chat system
- [Tracking V2](../tracking-v2/AGENTS.md) - Event analytics
- [Leads Context](../leads/AGENTS.md) - Lead management
- [Root AGENTS.md](../../AGENTS.md) - Architecture

## Troubleshooting

### Visitor not identified

- Check email is valid and unique per company
- Verify identify command executed after initialize
- Ensure VisitorIdentifiedEvent fired

### Sessions not tracking

- Verify session start called on page load
- Check session end called on page leave
- Confirm startedAt/endedAt are set

### Duplicate visitors appearing

- Check for email collisions across companies
- Verify companyId filter in queries
- Consider visitor merge on identification

### SDK not initializing

- Check API key is valid for company
- Verify script tag before chat widget
- Ensure Guiders global is accessible
