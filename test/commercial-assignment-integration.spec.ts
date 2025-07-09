import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { AssignOnPendingChatEventHandler } from '../src/context/real-time/application/event/assign-on-pending-chat.event-handler';
import { UpdateChatParticipantsOnCommercialsAssignedEventHandler } from '../src/context/conversations/chat/application/update/participants/assigne/update-chat-participants-on-commercials-assigned.event-handler';
import { NewChatCreatedEvent } from '../src/context/conversations/chat/domain/chat/events/new-chat-created.event';
import { ChatCommercialsAssignedEvent } from '../src/context/real-time/domain/events/chat-commercials-assigned.event';
import { CommercialAssignmentService } from '../src/context/real-time/domain/commercial-assignment.service';
import {
  CHAT_REPOSITORY,
  IChatRepository,
} from '../src/context/conversations/chat/domain/chat/chat.repository';
import {
  IUserFinder,
  USER_FINDER,
} from '../src/context/conversations/chat/application/read/get-username-by-id';
import {
  Chat,
  ChatPrimitives,
} from '../src/context/conversations/chat/domain/chat/chat';
import { Uuid } from '../src/context/shared/domain/value-objects/uuid';
import { ConnectionUser } from '../src/context/real-time/domain/connection-user';
import { ConnectionUserId } from '../src/context/real-time/domain/value-objects/connection-user-id';
import { ConnectionRole } from '../src/context/real-time/domain/value-objects/connection-role';
import { ConnectionCompanyId } from '../src/context/real-time/domain/value-objects/connection-company-id';
import { Optional } from '../src/context/shared/domain/optional';
import { EventPublisher } from '@nestjs/cqrs';

describe('Flujo de Asignación de Comerciales - Integración', () => {
  let module: TestingModule;
  let eventBus: EventBus;
  let assignOnPendingChatHandler: AssignOnPendingChatEventHandler;
  let updateChatParticipantsHandler: UpdateChatParticipantsOnCommercialsAssignedEventHandler;
  let commercialAssignmentService: CommercialAssignmentService;
  let chatRepository: IChatRepository;
  let userFinder: IUserFinder;
  let eventPublisher: EventPublisher;

  // Datos de prueba
  const chatId = Uuid.random();
  const visitorId = Uuid.random();
  const commercialId1 = Uuid.random();
  const commercialId2 = Uuid.random();
  const companyId = Uuid.random();

  beforeEach(async () => {
    // Mock del repositorio de chat
    const mockChatRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
    };

    // Mock del servicio de asignación de comerciales
    const mockCommercialAssignmentService = {
      getConnectedCommercials: jest.fn(),
    };

    // Mock del buscador de usuarios
    const mockUserFinder = {
      findById: jest.fn(),
    };

    // Mock del event publisher
    const mockEventPublisher = {
      mergeObjectContext: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        EventBus,
        AssignOnPendingChatEventHandler,
        UpdateChatParticipantsOnCommercialsAssignedEventHandler,
        {
          provide: CommercialAssignmentService,
          useValue: mockCommercialAssignmentService,
        },
        {
          provide: CHAT_REPOSITORY,
          useValue: mockChatRepository,
        },
        {
          provide: USER_FINDER,
          useValue: mockUserFinder,
        },
        {
          provide: EventPublisher,
          useValue: mockEventPublisher,
        },
      ],
    }).compile();

    eventBus = module.get<EventBus>(EventBus);
    assignOnPendingChatHandler = module.get<AssignOnPendingChatEventHandler>(
      AssignOnPendingChatEventHandler,
    );
    updateChatParticipantsHandler =
      module.get<UpdateChatParticipantsOnCommercialsAssignedEventHandler>(
        UpdateChatParticipantsOnCommercialsAssignedEventHandler,
      );
    commercialAssignmentService = module.get<CommercialAssignmentService>(
      CommercialAssignmentService,
    );
    chatRepository = module.get<IChatRepository>(CHAT_REPOSITORY);
    userFinder = module.get<IUserFinder>(USER_FINDER);
    eventPublisher = module.get<EventPublisher>(EventPublisher);

    // Configurar los mocks
    (
      commercialAssignmentService.getConnectedCommercials as jest.Mock
    ).mockResolvedValue([
      ConnectionUser.create({
        userId: new ConnectionUserId(commercialId1.value),
        roles: [ConnectionRole.COMMERCIAL],
        companyId: new ConnectionCompanyId(companyId.value),
      }),
      ConnectionUser.create({
        userId: new ConnectionUserId(commercialId2.value),
        roles: [ConnectionRole.COMMERCIAL],
        companyId: new ConnectionCompanyId(companyId.value),
      }),
    ]);

    (userFinder.findById as jest.Mock).mockResolvedValue('Usuario Comercial');
  });

  afterEach(async () => {
    await module.close();
  });

  it('debe completar todo el flujo de asignación correctamente', async () => {
    // Crear un chat con solo el visitante
    const chatPrimitives: ChatPrimitives = {
      id: chatId.value,
      companyId: companyId.value,
      participants: [
        {
          id: visitorId.value,
          name: 'Visitante',
          isCommercial: false,
          isVisitor: true,
          isOnline: true,
          assignedAt: new Date(),
          lastSeenAt: null,
          isViewing: false,
          isTyping: false,
          isAnonymous: false,
        },
      ],
      status: 'pending',
      lastMessage: null,
      lastMessageAt: null,
      createdAt: new Date(),
    };

    const chat = Chat.fromPrimitives(chatPrimitives);
    const mockChatAggregate = {
      ...chat,
      commit: jest.fn(),
    };

    // Mock del repositorio para devolver el chat cuando se busque
    (chatRepository.findOne as jest.Mock).mockResolvedValue(
      Optional.of({ chat }),
    );
    (eventPublisher.mergeObjectContext as jest.Mock).mockReturnValue(
      mockChatAggregate,
    );

    // Spy en los métodos del chat para verificar que se llaman
    const assignCommercialSpy = jest.spyOn(chat, 'asignCommercial');
    const saveRepositorySpy = jest.spyOn(chatRepository, 'save');

    // Spy en el EventBus para capturar eventos publicados
    const eventBusPublishSpy = jest.spyOn(eventBus, 'publish');

    // 1. Simular la creación del chat (se publica NewChatCreatedEvent)
    const newChatCreatedEvent = new NewChatCreatedEvent({
      chat: chatPrimitives,
      publisherId: 'test-publisher',
    });

    // 2. Manejar el evento con AssignOnPendingChatEventHandler
    await assignOnPendingChatHandler.handle(newChatCreatedEvent);

    // 3. Verificar que se publicó ChatCommercialsAssignedEvent
    expect(eventBusPublishSpy).toHaveBeenCalledWith(
      expect.any(ChatCommercialsAssignedEvent),
    );

    // Obtener el evento publicado
    const publishedEvent = eventBusPublishSpy.mock.calls.find(
      (call) => call[0] instanceof ChatCommercialsAssignedEvent,
    )?.[0] as ChatCommercialsAssignedEvent;

    expect(publishedEvent).toBeDefined();
    expect(publishedEvent.chatId).toBe(chatId.value);
    expect(publishedEvent.commercialIds).toHaveLength(2);
    expect(publishedEvent.commercialIds).toContain(commercialId1.value);
    expect(publishedEvent.commercialIds).toContain(commercialId2.value);

    // 4. Manejar el evento ChatCommercialsAssignedEvent con UpdateChatParticipantsOnCommercialsAssignedEventHandler
    await updateChatParticipantsHandler.handle(publishedEvent);

    // 5. Verificar que se asignaron los comerciales al chat
    expect(assignCommercialSpy).toHaveBeenCalledTimes(2);
    expect(assignCommercialSpy).toHaveBeenCalledWith({
      id: commercialId1.value,
      name: 'Usuario Comercial',
    });
    expect(assignCommercialSpy).toHaveBeenCalledWith({
      id: commercialId2.value,
      name: 'Usuario Comercial',
    });

    // 6. Verificar que se guardó el chat actualizado
    expect(saveRepositorySpy).toHaveBeenCalledWith(mockChatAggregate);

    // 7. Verificar que el chat ahora tiene todos los participantes
    const updatedParticipants = chat.toPrimitives().participants;
    expect(updatedParticipants).toHaveLength(3); // Visitante + 2 comerciales
    expect(updatedParticipants.some((p) => p.id === visitorId.value)).toBe(
      true,
    );
    expect(updatedParticipants.some((p) => p.id === commercialId1.value)).toBe(
      true,
    );
    expect(updatedParticipants.some((p) => p.id === commercialId2.value)).toBe(
      true,
    );

    // 8. Verificar que los comerciales tienen las propiedades correctas
    const commercial1 = updatedParticipants.find(
      (p) => p.id === commercialId1.value,
    );
    const commercial2 = updatedParticipants.find(
      (p) => p.id === commercialId2.value,
    );

    expect(commercial1).toBeDefined();
    expect(commercial1?.isCommercial).toBe(true);
    expect(commercial1?.isVisitor).toBe(false);
    expect(commercial1?.name).toBe('Usuario Comercial');

    expect(commercial2).toBeDefined();
    expect(commercial2?.isCommercial).toBe(true);
    expect(commercial2?.isVisitor).toBe(false);
    expect(commercial2?.name).toBe('Usuario Comercial');
  });

  it('debe mantener solo el visitante si no hay comerciales conectados', async () => {
    // Configurar que no hay comerciales conectados
    (
      commercialAssignmentService.getConnectedCommercials as jest.Mock
    ).mockResolvedValue([]);

    const chatPrimitives: ChatPrimitives = {
      id: chatId.value,
      companyId: companyId.value,
      participants: [
        {
          id: visitorId.value,
          name: 'Visitante',
          isCommercial: false,
          isVisitor: true,
          isOnline: true,
          assignedAt: new Date(),
          lastSeenAt: null,
          isViewing: false,
          isTyping: false,
          isAnonymous: false,
        },
      ],
      status: 'pending',
      lastMessage: null,
      lastMessageAt: null,
      createdAt: new Date(),
    };

    const chat = Chat.fromPrimitives(chatPrimitives);
    const mockChatAggregate = {
      ...chat,
      commit: jest.fn(),
    };

    (chatRepository.findOne as jest.Mock).mockResolvedValue(
      Optional.of({ chat }),
    );
    (eventPublisher.mergeObjectContext as jest.Mock).mockReturnValue(
      mockChatAggregate,
    );

    const eventBusPublishSpy = jest.spyOn(eventBus, 'publish');

    // 1. Simular la creación del chat
    const newChatCreatedEvent = new NewChatCreatedEvent({
      chat: chatPrimitives,
      publisherId: 'test-publisher',
    });

    // 2. Manejar el evento
    await assignOnPendingChatHandler.handle(newChatCreatedEvent);

    // 3. Verificar que se publicó ChatCommercialsAssignedEvent con lista vacía
    expect(eventBusPublishSpy).toHaveBeenCalledWith(
      expect.any(ChatCommercialsAssignedEvent),
    );

    const publishedEvent = eventBusPublishSpy.mock.calls.find(
      (call) => call[0] instanceof ChatCommercialsAssignedEvent,
    )?.[0] as ChatCommercialsAssignedEvent;

    expect(publishedEvent).toBeDefined();
    expect(publishedEvent.chatId).toBe(chatId.value);
    expect(publishedEvent.commercialIds).toHaveLength(0);

    // 4. Manejar el evento con lista vacía
    await updateChatParticipantsHandler.handle(publishedEvent);

    // 5. Verificar que el chat mantiene solo el visitante
    const participants = chat.toPrimitives().participants;
    expect(participants).toHaveLength(1);
    expect(participants[0].id).toBe(visitorId.value);
  });
});
