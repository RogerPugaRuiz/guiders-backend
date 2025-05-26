# Contexto Tracking

Este contexto gestiona la lógica de tracking y auditoría, aplicando DDD y CQRS con NestJS v11 y @nestjs/cqrs.

## Estructura

- **application/**: Lógica de aplicación (commands, events, queries, dtos).
  - **commands/**: Comandos para crear y modificar eventos de tracking.
  - **events/**: Manejadores de eventos de dominio relacionados con tracking.
  - **queries/**: Consultas para obtener información de tracking.
- **domain/**: Entidades, repositorios, eventos y value objects del dominio de tracking.
  - **models/**: Entidades y agregados como TrackingEvent.
  - **repositories/**: Interfaces de repositorios para persistencia.
  - **events/**: Eventos de dominio específicos de tracking.
- **infrastructure/**: Adaptadores, persistencia y controladores.
  - **controllers/**: API REST para tracking.
  - **repositories/**: Implementaciones concretas de repositorios.

## Principios

- **DDD**: El dominio modela las reglas y procesos de negocio de tracking.
- **CQRS**: Comandos y queries separados para claridad y escalabilidad.
- **Eventos**: Los cambios relevantes generan eventos manejados por EventHandlers.

## Componentes principales

### Tracking de visitantes

El sistema de tracking registra diferentes tipos de acciones de los visitantes:

- **Páginas visitadas**: Registro de navegación entre páginas.
- **Interacciones UI**: Clics, desplazamientos, tiempo en página.
- **Conversiones**: Formularios completados, compras, etc.

### Agregado principal: TrackingEvent

```typescript
export class TrackingEvent extends AggregateRoot {
  constructor(
    private readonly _id: TrackingEventId,
    private readonly _visitorId: VisitorId,
    private readonly _eventType: TrackingEventType,
    private readonly _data: TrackingEventData,
    private readonly _timestamp: TrackingEventTimestamp,
  ) {
    super();
  }

  static create(props: {
    id?: string;
    visitorId: string;
    eventType: string;
    data: Record<string, any>;
    timestamp?: Date;
  }): TrackingEvent {
    const id = TrackingEventId.create(props.id);
    const visitorId = VisitorId.create(props.visitorId);
    const eventType = TrackingEventType.create(props.eventType);
    const data = TrackingEventData.create(props.data);
    const timestamp = TrackingEventTimestamp.create(props.timestamp);

    const trackingEvent = new TrackingEvent(
      id,
      visitorId,
      eventType,
      data,
      timestamp,
    );

    trackingEvent.apply(
      new TrackingEventCreatedDomainEvent({
        id: id.toString(),
        visitorId: visitorId.toString(),
        eventType: eventType.toString(),
        data: data.value,
        timestamp: timestamp.value,
      }),
    );

    return trackingEvent;
  }

  // Getters y métodos de dominio...
}
```

## Flujos principales

### Registro de un evento de tracking

```
┌───────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Cliente  │────▶│  Controller     │────▶│  CommandHandler  │
└───────────┘     └─────────────────┘     └──────────────────┘
                                                   │
                                                   ▼
┌───────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Notificaciones    │◀────│  EventHandler   │◀────│  TrackingEvent   │
└───────────────────┘     └─────────────────┘     └──────────────────┘
```

1. El cliente envía datos de un evento de tracking (ej: página visitada).
2. El controller recibe la petición y crea un comando.
3. El CommandHandler procesa el comando y crea un TrackingEvent.
4. Se guarda el evento y se emiten eventos de dominio.
5. Los EventHandlers reaccionan (ej: actualizando estadísticas).

## Ejemplos de uso

### Registrar una visita a página

```typescript
// Controller
@Controller('tracking')
export class TrackingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('page-view')
  async trackPageView(@Body() dto: TrackPageViewDto) {
    await this.commandBus.execute(
      new CreateTrackingEventCommand({
        visitorId: dto.visitorId,
        eventType: 'PAGE_VIEW',
        data: {
          url: dto.url,
          title: dto.title,
          referrer: dto.referrer,
          duration: dto.duration,
        },
      }),
    );
    
    return { success: true };
  }
}
```

### Command Handler

```typescript
@CommandHandler(CreateTrackingEventCommand)
export class CreateTrackingEventHandler implements ICommandHandler<CreateTrackingEventCommand> {
  constructor(
    @Inject(TRACKING_EVENT_REPOSITORY)
    private readonly repository: TrackingEventRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CreateTrackingEventCommand): Promise<void> {
    const { visitorId, eventType, data } = command;
    
    const trackingEvent = TrackingEvent.create({
      visitorId,
      eventType,
      data,
    });
    
    const trackingEventWithPublisher = 
      this.publisher.mergeObjectContext(trackingEvent);
      
    await this.repository.save(trackingEventWithPublisher);
    trackingEventWithPublisher.commit();
  }
}
```

## Intención

Permite auditar y rastrear acciones del sistema de forma desacoplada, clara y escalable, facilitando la integración con otros contextos. El diseño:

- Facilita el análisis de comportamiento de los usuarios.
- Permite generar métricas y estadísticas.
- Posibilita la optimización basada en datos de interacción.
- Separa la lógica de tracking de la funcional del sistema.
