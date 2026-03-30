# AGENTS.md - Tracking V2 Context

Event tracking and analytics system for comprehensive visitor behavior analysis. Built with MongoDB for real-time event ingestion and analytics capabilities.

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Related**: [Visitors V2](../visitors-v2/AGENTS.md), [Conversations V2](../conversations-v2/AGENTS.md)

**Status**: ACTIVE (V2) - Use for new features

## Context Overview

The Tracking V2 context handles:

- Event ingestion from visitors, agents, and systems
- Real-time event processing
- Event aggregation and analytics
- Visitor behavior analysis
- Funnel tracking
- Custom event definitions
- Event retention policies

This context provides **business intelligence** for understanding visitor engagement and conversion.

## Directory Structure

```
src/context/tracking-v2/
├── domain/
│   ├── event.aggregate.ts      # Event aggregate root
│   ├── event.repository.ts     # Repository interface
│   ├── entities/
│   │   ├── event-properties.entity.ts
│   │   └── funnel-step.entity.ts
│   ├── value-objects/
│   │   ├── event-id.ts
│   │   ├── event-type.ts
│   │   └── event-status.ts
│   ├── events/                 # Domain events
│   └── errors/
├── application/
│   ├── commands/
│   │   ├── track-event/
│   │   ├── define-event/
│   │   ├── create-funnel/
│   │   └── process-events/
│   ├── queries/
│   │   ├── get-event-stats/
│   │   ├── get-funnel-metrics/
│   │   ├── get-event-timeline/
│   │   └── search-events/
│   ├── events/
│   └── dtos/
└── infrastructure/
    ├── controllers/            # HTTP endpoints
    ├── persistence/
    │   ├── mongo-event.repository.ts
    │   └── event.mapper.ts
    └── services/
        └── analytics.service.ts
```

## Domain Entities

### Event Aggregate (Root)

```typescript
// src/context/tracking-v2/domain/event.aggregate.ts
TrackingEvent {
  id: EventId (UUID)
  companyId: CompanyId
  visitorId: VisitorId | null
  userId: UserId | null
  eventType: EventType (page_view, click, form_submit, etc.)
  properties: Record<string, unknown>
  timestamp: Date
  sessionId: SessionId
  pageUrl: string
  pageTitle: string
  referrer: string
  userAgent: string
  ipAddress: string
  status: EventStatus (VALID, INVALID, DISCARDED)
  processedAt: Date
}
```

### Funnel Entity

```typescript
// Tracks multi-step conversion funnels
Funnel {
  id: FunnelId (UUID)
  companyId: CompanyId
  name: string
  description: string
  steps: FunnelStep[]
  startDate: Date
  endDate: Date
  createdAt: Date
}

FunnelStep {
  stepNumber: number
  eventType: EventType
  properties: Record<string, unknown>
  conversionRate: number
  dropoffRate: number
}
```

## Value Objects

- `EventId` - Unique event identifier
- `EventType` - Type enum (page_view, click, form_submit, chat_initiated, etc.)
- `EventStatus` - VALID, INVALID, DISCARDED
- `SessionId` - Session tracking
- `EventProperties` - Arbitrary event data with validation

## Key Use Cases

### Event Tracking

- **Track Page View**: Log when visitor views page
- **Track Click**: Log when visitor clicks element
- **Track Form Submission**: Log form data
- **Track Custom Event**: Log app-specific actions
- **Track Chat Interaction**: Log chat events
- **Track Conversion**: Mark purchase or goal

### Analytics & Reporting

- **Event Stats**: Count and trends for event type
- **Funnel Analysis**: Track conversion through steps
- **Cohort Analysis**: Group visitors by behavior
- **User Journey**: Timeline of events per visitor
- **Event Search**: Find specific events with filters
- **Custom Reports**: Build custom queries

### Event Management

- **Define Event**: Create new event schema
- **Archive Events**: Remove old events
- **Replay Events**: Re-process events
- **Bulk Import**: Import historical data

## Commands

### Event Tracking

- `TrackEventCommand` → Log single event
- `TrackEventsCommand` → Bulk track events
- `TrackPageViewCommand` → Log page view specifically
- `TrackConversionCommand` → Mark goal completion
- `TrackFormSubmissionCommand` → Log form data

### Event Management

- `DefineEventCommand` → Create event schema
- `UpdateEventSchemaCommand` → Modify event definition
- `DeleteEventCommand` → Archive event
- `ProcessEventsCommand` → Batch process raw events

### Funnel Management

- `CreateFunnelCommand` → Define new funnel
- `UpdateFunnelCommand` → Modify funnel steps
- `DeleteFunnelCommand` → Remove funnel
- `AnalyzeFunnelCommand` → Calculate metrics

## Queries

### Event Analytics

- `GetEventStatsQuery` → Count, rate, trends
- `GetEventTimelineQuery` → Events over time
- `GetEventPropertiesQuery` → Values for property
- `SearchEventsQuery` → Filter events

### Funnel Analytics

- `GetFunnelMetricsQuery` → Conversion rates
- `GetFunnelDropoffQuery` → Where users drop off
- `ListFunnelsQuery` → All funnels for company
- `CompareFunnelsQuery` → A/B funnel comparison

### Visitor Analytics

- `GetVisitorEventsQuery` → All events for visitor
- `GetVisitorConversionQuery` → Visitor conversion status
- `GetVisitorEventSequenceQuery` → Event order

### Cohort & Segment Queries

- `GetCohortQuery` → Visitors matching criteria
- `GetSegmentQuery` → Visitor segment definition
- `CompareCohortQuery` → Cohort comparison

## Events

- `EventTrackedEvent` → Event recorded
- `EventsProcessedEvent` → Batch processing complete
- `EventInvalidatedEvent` → Event marked invalid
- `FunnelCreatedEvent` → Funnel defined
- `FunnelMetricsUpdatedEvent` → Conversion rates recalculated
- `ConversionTrackedEvent` → Goal marked completed

## Database Schema (MongoDB)

### events collection

```javascript
db.createCollection('events', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['companyId', 'eventType', 'timestamp'],
      properties: {
        _id: { bsonType: 'objectId' },
        eventId: { bsonType: 'string' },
        companyId: { bsonType: 'string' },
        visitorId: { bsonType: ['string', 'null'] },
        userId: { bsonType: ['string', 'null'] },
        eventType: { bsonType: 'string' },
        properties: { bsonType: 'object' },
        timestamp: { bsonType: 'date' },
        sessionId: { bsonType: 'string' },
        pageUrl: { bsonType: 'string' },
        pageTitle: { bsonType: 'string' },
        referrer: { bsonType: ['string', 'null'] },
        userAgent: { bsonType: 'string' },
        ipAddress: { bsonType: 'string' },
        status: { enum: ['VALID', 'INVALID', 'DISCARDED'] },
        processedAt: { bsonType: 'date' },
      },
    },
  },
});

// Indexes for performance
db.events.createIndex({ companyId: 1, timestamp: -1 });
db.events.createIndex({ companyId: 1, visitorId: 1, timestamp: -1 });
db.events.createIndex({ companyId: 1, eventType: 1, timestamp: -1 });
db.events.createIndex({ companyId: 1, sessionId: 1 });
db.events.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // TTL: 90 days
```

### funnels collection

```javascript
db.createCollection('funnels', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['companyId', 'name', 'steps'],
      properties: {
        _id: { bsonType: 'objectId' },
        funnelId: { bsonType: 'string' },
        companyId: { bsonType: 'string' },
        name: { bsonType: 'string' },
        description: { bsonType: 'string' },
        steps: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              stepNumber: { bsonType: 'int' },
              eventType: { bsonType: 'string' },
              properties: { bsonType: 'object' },
              conversionRate: { bsonType: 'double' },
              dropoffRate: { bsonType: 'double' },
            },
          },
        },
        startDate: { bsonType: 'date' },
        endDate: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' },
      },
    },
  },
});

// Indexes
db.funnels.createIndex({ companyId: 1, createdAt: -1 });
```

## SDK Integration

Events tracked via browser SDK:

```javascript
// Page view tracking (automatic)
window.Guiders.trackPageView();

// Custom event tracking
window.Guiders.trackEvent('product_viewed', {
  productId: '123',
  productName: 'Widget Pro',
  category: 'widgets',
  price: 99.99,
});

// Form submission tracking
window.Guiders.trackFormSubmission({
  formId: 'contact-form',
  fields: {
    email: 'user@example.com',
    subject: 'Support Request',
  },
});

// Conversion tracking
window.Guiders.trackConversion({
  conversionType: 'purchase',
  value: 199.99,
  currency: 'USD',
  orderId: 'order-123',
});
```

## API Endpoints

### Track Event

```http
POST /tracking/events
{
  "visitorId": "visitor-123",
  "eventType": "form_submitted",
  "properties": {
    "formId": "contact-form",
    "fields": 3
  }
}
```

### Get Event Stats

```http
GET /tracking/events/stats?companyId=co-123&eventType=page_view&startDate=2024-01-01&endDate=2024-01-31
```

### Get Funnel Metrics

```http
GET /tracking/funnels/:funnelId/metrics?startDate=2024-01-01&endDate=2024-01-31
```

### Search Events

```http
POST /tracking/events/search
{
  "visitorId": "visitor-123",
  "eventTypes": ["click", "form_submit"],
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "limit": 100
}
```

## Integration Points

| Context          | Purpose                   | Method                   |
| ---------------- | ------------------------- | ------------------------ |
| company          | Events scoped to company  | CompanyId in all queries |
| visitors-v2      | Events linked to visitor  | VisitorId in events      |
| conversations-v2 | Chat events tracked       | Track chat actions       |
| leads            | Event-based lead creation | Funnel to leads          |
| commercial       | Usage-based billing       | Event counts             |

## Real-time Analytics

### Event Stream Processing

```typescript
// Handler processes events in real-time
@EventsHandler(EventTrackedEvent)
export class UpdateEventStatsOnEventTrackedEventHandler
  implements IEventHandler<EventTrackedEvent>
{
  async handle(event: EventTrackedEvent) {
    // Update aggregated statistics
    // Update visitor segment
    // Check funnel progression
    // Update dashboards
  }
}
```

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/tracking-v2/**/*.spec.ts
```

Test domain logic:

- Event creation with validation
- Funnel step progression
- Property validation
- Event status transitions

### Integration Tests

```bash
npm run test:int -- src/context/tracking-v2/**/*.spec.ts
```

Test MongoDB operations:

- Event persistence
- Efficient queries
- TTL expiration
- Index usage

### E2E Tests

```bash
npm run test:e2e
```

Test endpoints:

- POST /tracking/events
- GET /tracking/events/stats
- GET /tracking/funnels/:id/metrics
- POST /tracking/events/search

## Performance Considerations

### Event Batching

```typescript
// Instead of individual events, batch track
const result = await handler.execute(
  new TrackEventsCommand(companyId, [
    { eventType: 'page_view', properties: { url: '/' } },
    { eventType: 'click', properties: { target: 'button-1' } },
  ]),
);
```

### Index Optimization

```
// Most important indexes:
1. (companyId, timestamp) - all event queries
2. (companyId, visitorId, timestamp) - visitor timeline
3. (companyId, eventType, timestamp) - event type stats
4. timestamp with TTL - auto-delete old events
```

### Aggregation Pipeline

```typescript
// Use MongoDB aggregation for analytics
const pipeline = [
  { $match: { companyId, timestamp: { $gte: startDate } } },
  { $group: { _id: '$eventType', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
];
const stats = await events.aggregate(pipeline).toArray();
```

## Known Limitations

- No real-time streaming to external analytics platforms
- Funnel metrics calculated on-demand (not cached)
- No event sampling for high-volume customers
- Properties stored as untyped JSON
- No automatic event deduplication
- Event replay requires manual implementation

## Common Patterns

### Track Page View

```typescript
const result = await handler.execute(
  new TrackPageViewCommand({
    visitorId,
    url: window.location.href,
    title: document.title,
    referrer: document.referrer,
  }),
);
```

### Get Conversion Funnel

```typescript
const query = new GetFunnelMetricsQuery(funnelId, {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
});
const metrics = await queryBus.execute(query);
// Returns: step-by-step conversion rates and drop-off
```

### Bulk Import Historical Events

```typescript
const result = await handler.execute(new TrackEventsCommand(companyId, events));
// Imports are processed asynchronously
// Emits EventsProcessedEvent on completion
```

## Future Enhancements

1. **Real-time dashboards** - Live event feed
2. **Predictive analytics** - Churn prediction
3. **Event sampling** - For high-volume companies
4. **Custom event properties schema** - Type validation
5. **Event deduplication** - Prevent duplicates
6. **Export to external platforms** - GA, Mixpanel, etc.
7. **Advanced segmentation** - AI-powered segments

## Related Documentation

- [Visitors V2](../visitors-v2/AGENTS.md) - Visitor identification
- [Conversations V2](../conversations-v2/AGENTS.md) - Chat tracking
- [Company Context](../company/AGENTS.md) - Multi-tenancy
- [Root AGENTS.md](../../AGENTS.md) - Architecture

## Troubleshooting

### Events not appearing in analytics

- Verify event timestamp is recent (not future-dated)
- Check companyId matches user's company
- Ensure EventTrackedEvent handler is registered
- Confirm visitorId is valid if set

### Funnel metrics show 0% conversion

- Check funnel steps match actual event types
- Verify properties filters are correct
- Ensure date range includes events
- Check visitor journey matches steps in order

### Slow analytics queries

- Verify compound indexes are created
- Check MongoDB explain plan: `.explain('executionStats')`
- Consider aggregation pipeline instead of queries
- Reduce date range if too large

### TTL index not deleting old events

- Verify TTL index created with expireAfterSeconds
- Check server time is synchronized
- Ensure event timestamp is actual Date object
- May take up to 60 seconds to delete
