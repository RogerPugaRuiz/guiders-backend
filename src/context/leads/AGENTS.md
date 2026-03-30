# AGENTS.md - Leads Context

Lead management and lifecycle tracking for sales pipeline. Transforms visitors into leads and tracks their progression through sales stages.

**Parent documentation**: [Root AGENTS.md](../../AGENTS.md) | **Related**: [Visitors V2](../visitors-v2/AGENTS.md), [Tracking V2](../tracking-v2/AGENTS.md), [Lead Scoring](../lead-scoring/AGENTS.md)

## Context Overview

The Leads context handles:

- Lead creation from visitors
- Lead property management and enrichment
- Sales pipeline and stage tracking
- Lead assignment to sales agents
- Lead status and lifecycle management
- Lead-to-customer conversion
- Lead re-engagement and follow-up

This context is **critical for sales operations** and bridges visitor engagement to revenue.

## Directory Structure

```
src/context/leads/
├── domain/
│   ├── lead.aggregate.ts       # Lead aggregate root
│   ├── lead.repository.ts      # Repository interface
│   ├── entities/
│   │   ├── contact.entity.ts   # Contact information
│   │   └── interaction.entity.ts
│   ├── value-objects/
│   │   ├── lead-id.ts
│   │   ├── lead-status.ts
│   │   └── lead-source.ts
│   ├── events/
│   └── errors/
├── application/
│   ├── commands/
│   │   ├── create-lead/
│   │   ├── update-lead-status/
│   │   ├── assign-lead/
│   │   └── convert-lead/
│   ├── queries/
│   │   ├── get-lead/
│   │   ├── list-leads/
│   │   └── get-lead-pipeline/
│   ├── events/
│   └── dtos/
└── infrastructure/
    ├── controllers/
    ├── persistence/
    │   ├── postgres-lead.repository.ts
    │   └── lead.mapper.ts
    └── services/
```

## Domain Entities

### Lead Aggregate (Root)

```typescript
// src/context/leads/domain/lead.aggregate.ts
Lead {
  id: LeadId (UUID)
  companyId: CompanyId
  visitorId: VisitorId | null
  email: Email
  name: string
  phone: string | null
  company: string | null
  status: LeadStatus (NEW, QUALIFIED, CONTACTED, NEGOTIATING, WON, LOST)
  source: LeadSource (chat, form, import, api, etc.)
  pipeline: string (sales pipeline name)
  stage: string (prospecting, qualification, demo, etc.)
  value: Money | null (estimated deal value)
  assignedTo: UserId | null
  notes: string
  customFields: Map<string, unknown>
  interactions: Interaction[]
  createdAt: Date
  updatedAt: Date
  convertedAt: Date | null
}
```

### Interaction Entity

```typescript
// Tracks lead communications
Interaction {
  id: InteractionId (UUID)
  type: InteractionType (email, call, meeting, chat, etc.)
  direction: Direction (inbound, outbound)
  subject: string | null
  notes: string
  duration: number | null (seconds, for calls)
  createdAt: Date
}
```

## Value Objects

- `LeadId` - Unique lead identifier
- `LeadStatus` - Sales stage (NEW, QUALIFIED, CONTACTED, etc.)
- `LeadSource` - Where lead came from (chat, form, import)
- `LeadScore` - Numerical quality score (0-100)
- `Money` - Deal value with currency
- `InteractionType` - Communication type
- `PipelineStage` - Sales pipeline stage name

## Key Use Cases

### Lead Creation

- **Create from Visitor**: When visitor identifies themselves
- **Create from Form**: When form submitted
- **Bulk Import**: Import from CSV or API
- **Create from Chat**: When chat conversation starts
- **Manual Creation**: Sales agent creates lead directly

### Lead Management

- **Update Lead Info**: Change name, email, phone
- **Add Notes**: Track interactions and observations
- **Change Status**: Progress through sales stages
- **Assign to Agent**: Route to specific sales person
- **Unassign**: Remove assignment
- **Tag Lead**: Categorize for reporting

### Lead Progression

- **Qualify Lead**: Move from NEW to QUALIFIED
- **Schedule Demo**: Track demo request
- **Send Proposal**: Move to NEGOTIATING
- **Convert to Customer**: Move WON status
- **Mark Lost**: Track deal loss and reason

## Commands

### Lead Lifecycle

- `CreateLeadCommand` → New lead
- `UpdateLeadCommand` → Modify information
- `ChangeLeadStatusCommand` → Update sales stage
- `ConvertLeadCommand` → Mark as won
- `MarkLeadLostCommand` → Track deal loss

### Lead Management

- `AssignLeadCommand` → Route to agent
- `UnassignLeadCommand` → Remove assignment
- `AddLeadNoteCommand` → Log interaction
- `TagLeadCommand` → Add category tag
- `EnrichLeadCommand` → Add data (from external source)

### Bulk Operations

- `BulkImportLeadsCommand` → Import from CSV
- `BulkUpdateLeadsCommand` → Batch update
- `ReassignLeadsCommand` → Route multiple

## Queries

### Lead Information

- `GetLeadQuery` → Lead details
- `GetLeadByEmailQuery` → Find by email
- `ListLeadsQuery` → Search and filter
- `GetLeadHistoryQuery` → Activity log

### Pipeline Management

- `GetLeadPipelineQuery` → Pipeline overview
- `GetPipelineStageLeadsQuery` → Leads by stage
- `GetAgentLeadsQuery` → Leads assigned to agent

### Analytics

- `GetLeadMetricsQuery` → Count, conversion rates
- `GetLeadSourceMetricsQuery` → Performance by source
- `GetAgentPerformanceQuery` → Sales metrics

## Events

- `LeadCreatedEvent` → New lead added
- `LeadUpdatedEvent` → Lead information changed
- `LeadQualifiedEvent` → Moved to qualified
- `LeadAssignedEvent` → Assigned to agent
- `LeadUnassignedEvent` → Assignment removed
- `LeadStatusChangedEvent` → Pipeline stage updated
- `LeadConvertedEvent` → Won and converted to customer
- `LeadLostEvent` → Deal lost with reason
- `InteractionRecordedEvent` → Communication logged

## Database Schema (PostgreSQL)

### leads table

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  visitor_id UUID REFERENCES visitors_v2(id),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  company_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'NEW',
  source VARCHAR(50) NOT NULL,
  pipeline VARCHAR(255),
  stage VARCHAR(255),
  estimated_value DECIMAL(15, 2),
  assigned_to UUID REFERENCES users(id),
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  converted_at TIMESTAMP
);

CREATE INDEX idx_leads_company_status ON leads(company_id, status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_visitor ON leads(visitor_id);
CREATE INDEX idx_leads_email ON leads(company_id, email);
```

### lead_interactions table

```sql
CREATE TABLE lead_interactions (
  id UUID PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  subject VARCHAR(255),
  notes TEXT,
  duration_seconds INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interactions_lead ON lead_interactions(lead_id, created_at DESC);
```

## Integration Points

| Context          | Purpose                 | Method                   |
| ---------------- | ----------------------- | ------------------------ |
| company          | Lead belongs to company | CompanyId in all queries |
| visitors-v2      | Lead source             | VisitorId on creation    |
| conversations-v2 | Chat context            | Start chat from lead     |
| tracking-v2      | Lead engagement         | Track lead interactions  |
| lead-scoring     | Lead quality            | Score calculation        |
| commercial       | Lead value              | Deal amount tracking     |

## Testing Strategy

### Unit Tests

```bash
npm run test:unit -- src/context/leads/**/*.spec.ts
```

Test domain logic:

- Lead creation with validation
- Status transitions
- Lead qualification
- Assignment logic

### Integration Tests

```bash
npm run test:int -- src/context/leads/**/*.spec.ts
```

Test persistence:

- Lead CRUD operations
- Interaction history
- Complex queries
- Event publishing

### E2E Tests

```bash
npm run test:e2e
```

Test endpoints:

- POST /leads
- GET /leads/:id
- PUT /leads/:id
- POST /leads/:id/status
- POST /leads/:id/assign
- GET /leads (with filters)

## Common Patterns

### Creating Lead from Visitor

```typescript
const result = await handler.execute(
  new CreateLeadCommand({
    companyId,
    visitorId,
    email: 'prospect@example.com',
    name: 'John Prospect',
    source: LeadSource.CHAT,
  }),
);
if (result.isErr()) return result;
const lead = result.unwrap();
// Event: LeadCreatedEvent
```

### Progressing Lead Through Pipeline

```typescript
// 1. Qualify lead
const qualifyResult = await handler.execute(
  new ChangeLeadStatusCommand(leadId, LeadStatus.QUALIFIED),
);

// 2. After demo, move to negotiating
const negotiateResult = await handler.execute(
  new ChangeLeadStatusCommand(leadId, LeadStatus.NEGOTIATING),
);

// 3. Convert to customer
const convertResult = await handler.execute(
  new ConvertLeadCommand(leadId, estimatedValue),
);
// Event: LeadConvertedEvent → may trigger customer creation
```

### Assigning and Tracking Interactions

```typescript
// Assign to sales agent
const assignResult = await handler.execute(
  new AssignLeadCommand(leadId, agentId),
);

// Log interaction
const interactionResult = await handler.execute(
  new AddLeadNoteCommand(leadId, {
    type: InteractionType.CALL,
    duration: 1800, // 30 minutes
    notes: 'Client interested in demo next week',
  }),
);
```

## Security Guidelines

### Lead Access Control

```typescript
// Only assigned agent or company admins can edit
const canEdit = lead.assignedTo === userId || isCompanyAdmin(userId);
if (!canEdit) return err(new ForbiddenError());
```

### Company Isolation

```typescript
// Always filter by company
const leads = await repo.find({
  companyId: userCompanyId,
  status: LeadStatus.OPEN,
});
```

## Known Limitations

- No pipeline templates (custom setup required)
- Lead merge not implemented (duplicates manual)
- No automatic lead status transitions
- Bulk import doesn't validate duplicate emails
- No lead scoring integration in core (see lead-scoring context)
- Email validation limited to format check

## Future Enhancements

1. **Lead routing rules** - Auto-assign based on criteria
2. **Lead templates** - Pre-configured fields per company
3. **Lead merge** - Combine duplicate leads
4. **Automation workflows** - Trigger actions on events
5. **Email integration** - Sync with email service
6. **CRM sync** - Two-way sync with Salesforce, HubSpot
7. **SMS notifications** - Alert agents of new leads
8. **Advanced search** - Full-text and complex filters

## Related Documentation

- [Lead Scoring](../lead-scoring/AGENTS.md) - Quality scoring
- [Visitors V2](../visitors-v2/AGENTS.md) - Visitor to lead conversion
- [Commercial](../commercial/AGENTS.md) - Deal tracking
- [Root AGENTS.md](../../AGENTS.md) - Architecture

## Troubleshooting

### Cannot assign lead

- Verify agent user exists and is company member
- Check agent hasn't reached assignment limit
- Ensure lead is not already assigned to someone

### Lead not appearing in pipeline

- Check lead status matches filter
- Verify company ID is correct
- Ensure lead has required fields (email, name)

### Bulk import failed

- Verify CSV format and headers
- Check for duplicate emails in import
- Ensure company ID is valid
- Check file size limits
