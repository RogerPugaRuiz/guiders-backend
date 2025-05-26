# Ejemplos de Uso y Buenas Prácticas

Este documento proporciona ejemplos prácticos de cómo utilizar el sistema en diferentes escenarios, así como recomendaciones de buenas prácticas siguiendo los principios de DDD y CQRS implementados en el proyecto.

## Índice

1. [Registro de un visitante](#registro-de-un-visitante)
2. [Implementación de un nuevo Command/Query](#implementación-de-un-nuevo-commandquery)
3. [Creación de un EventHandler](#creación-de-un-eventhandler)
4. [Integración con WebSockets](#integración-con-websockets)
5. [Buenas Prácticas](#buenas-prácticas)

## Registro de un visitante

Este ejemplo muestra cómo se implementa el flujo completo para registrar un visitante en el sistema:

### 1. Controller (capa de infraestructura)

```typescript
@Controller('auth/visitor')
export class AuthVisitorController {
  constructor(private readonly registerVisitor: RegisterVisitor) {}

  @Post('register')
  async register(@Body() dto: RegisterVisitorDto) {
    await this.registerVisitor.execute(
      dto.apiKey,
      dto.clientId,
      dto.userAgent,
      dto.domain,
    );
    return { success: true };
  }
}
```

### 2. Use Case (capa de aplicación)

```typescript
@Injectable()
export class RegisterVisitor {
  constructor(
    @Inject(AUTH_VISITOR_REPOSITORY)
    private readonly repository: AuthVisitorRepository,
    @Inject(VALIDATE_DOMAIN_API_KEY)
    private readonly validateDomainApiKey: ValidateDomainApiKey,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    apiKey: string,
    clientId: number,
    userAgent: string,
    domain: string,
  ): Promise<void> {
    // 1. Crear Value Objects
    const apiKeyValue = VisitorAccountApiKey.create(apiKey);
    const clientIDValue = VisitorAccountClientID.create(clientId);
    const userAgentValue = VisitorAccountUserAgent.create(userAgent);

    // 2. Validar dominio y API key
    const isValid = await this.validateDomainApiKey.validate({
      apiKey: apiKeyValue,
      domain,
    });

    if (!isValid) {
      throw new InvalidDomainError(domain);
    }

    // 3. Comprobar que no existe
    const findAccount = await this.repository.findByClientID(clientId);
    if (findAccount) {
      throw new VisitorAccountAlreadyExistError();
    }

    // 4. Crear entidad
    const newAccount = VisitorAccount.create({
      apiKey: apiKeyValue,
      clientID: clientIDValue,
      userAgent: userAgentValue,
    });

    // 5. Publicar eventos de dominio
    const newAccountWithPublisher =
      this.publisher.mergeObjectContext(newAccount);
    
    // 6. Persistir
    await this.repository.save(newAccountWithPublisher);
    
    // 7. Confirmar eventos
    newAccountWithPublisher.commit();
  }
}
```

### 3. Domain Entity (capa de dominio)

```typescript
export class VisitorAccount extends AggregateRoot {
  constructor(
    private readonly _apiKey: VisitorAccountApiKey,
    private readonly _clientID: VisitorAccountClientID,
    private readonly _userAgent: VisitorAccountUserAgent,
  ) {
    super();
  }

  static create(props: {
    apiKey: VisitorAccountApiKey;
    clientID: VisitorAccountClientID;
    userAgent: VisitorAccountUserAgent;
  }): VisitorAccount {
    const visitorAccount = new VisitorAccount(
      props.apiKey,
      props.clientID,
      props.userAgent,
    );
    
    // Publicar evento de dominio
    visitorAccount.apply(
      new VisitorAccountCreatedDomainEvent({
        clientId: props.clientID.value,
        apiKey: props.apiKey.value,
        userAgent: props.userAgent.value,
      }),
    );
    
    return visitorAccount;
  }
}
```

## Implementación de un nuevo Command/Query

### Ejemplo de Command

1. **Definir el Command** en `src/context/<contexto>/application/commands`:

```typescript
// create-user.command.ts
export class CreateUserCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly password: string,
  ) {}
}
```

2. **Crear el CommandHandler**:

```typescript
// create-user.handler.ts
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CreateUserCommand): Promise<void> {
    const { name, email, password } = command;
    
    // Crear value objects
    const nameValue = UserName.create(name);
    const emailValue = UserEmail.create(email);
    const passwordValue = UserPassword.create(password);
    
    // Verificar si el usuario existe
    const existingUser = await this.repository.findByEmail(emailValue);
    if (existingUser) {
      throw new UserAlreadyExistsError();
    }
    
    // Crear usuario
    const user = User.create({
      name: nameValue,
      email: emailValue,
      password: passwordValue,
    });
    
    // Publicar eventos
    const userWithPublisher = this.publisher.mergeObjectContext(user);
    await this.repository.save(userWithPublisher);
    userWithPublisher.commit();
  }
}
```

3. **Registrar en el módulo**:

```typescript
@Module({
  providers: [
    CreateUserHandler,
    // ...otros providers
  ],
})
export class UserModule {}
```

### Ejemplo de Query

1. **Definir la Query**:

```typescript
// get-user.query.ts
export class GetUserQuery {
  constructor(public readonly id: string) {}
}
```

2. **Crear el QueryHandler**:

```typescript
// get-user.handler.ts
@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
  ) {}

  async execute(query: GetUserQuery): Promise<UserDto> {
    const { id } = query;
    const userId = UserId.create(id);
    
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    
    return UserMapper.toDto(user);
  }
}
```

## Creación de un EventHandler

Ejemplo de un EventHandler que reacciona a la creación de un visitante:

```typescript
@EventsHandler(VisitorAccountCreatedDomainEvent)
export class NotifyCompanyOnVisitorAccountCreatedEventHandler
  implements IEventHandler<VisitorAccountCreatedDomainEvent>
{
  constructor(
    @Inject(COMPANY_SERVICE)
    private readonly companyService: CompanyService,
  ) {}

  async handle(event: VisitorAccountCreatedDomainEvent): Promise<void> {
    const { clientId, apiKey } = event;
    
    // Buscar la compañía asociada al apiKey
    const company = await this.companyService.findByApiKey(apiKey);
    
    if (company) {
      // Notificar a la compañía que se ha registrado un nuevo visitante
      await this.companyService.notifyNewVisitor({
        companyId: company.id,
        visitorClientId: clientId,
      });
    }
  }
}
```

## Integración con WebSockets

Ejemplo del gateway de WebSockets para tiempo real:

```typescript
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealTimeWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    @Inject(CONNECTION_REPOSITORY)
    private readonly connectionRepository: ConnectionRepository,
    private readonly chatMessageEmitter: WsChatMessageEmitterService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // Validar token y obtener userId y roles
      const { userId, roles } = await this.validateToken(token);
      
      // Crear usuario de conexión
      const user = ConnectionUser.create(
        ConnectionUserId.create(userId),
        roles.map(role => ConnectionRole.create(role)),
      );
      
      // Conectar y guardar
      const connectedUser = user.connect(ConnectionSocketId.create(client.id));
      await this.connectionRepository.save(connectedUser);
      
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    // Implementación de desconexión
  }

  @SubscribeMessage('chat:message')
  async handleVisitorSendMessage(
    client: AuthenticatedSocket,
    event: { to: string; message: string },
  ): Promise<void> {
    // Implementación para enviar mensaje
  }
}
```

## Buenas Prácticas

### 1. Diseño Limpio de Value Objects

```typescript
export class UserEmail {
  private constructor(private readonly _value: string) {}

  static create(value: string): UserEmail {
    if (!this.isValidEmail(value)) {
      throw new InvalidEmailError(value);
    }
    return new UserEmail(value);
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  get value(): string {
    return this._value;
  }

  equals(other: UserEmail): boolean {
    return this._value === other.value;
  }
}
```

### 2. Uso Correcto de Repositorios

```typescript
// Definición
export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: UserEmail): Promise<User | null>;
  findByCompanyId(companyId: CompanyId): Promise<User[]>;
  remove(user: User): Promise<void>;
}

// Implementación
export class UserOrmRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly mapper: UserMapper,
  ) {}

  async save(user: User): Promise<void> {
    const entity = this.mapper.toEntity(user);
    await this.userRepository.save(entity);
  }

  async findById(id: UserId): Promise<User | null> {
    const entity = await this.userRepository.findOne({
      where: { id: id.value },
    });
    
    if (!entity) {
      return null;
    }
    
    return this.mapper.toDomain(entity);
  }

  // Otras implementaciones...
}
```

### 3. Diseño Efectivo de Agregados

- Mantener los agregados pequeños
- Definir claramente las fronteras
- Acceder siempre a través de la raíz del agregado
- Usar referencias entre agregados mediante IDs

### 4. Uso del Shared Kernel

Utiliza el contexto `shared` para elementos comunes como:

```typescript
// src/context/shared/domain/value-objects/uuid.ts
export class Uuid {
  private constructor(private readonly _value: string) {}

  static create(value?: string): Uuid {
    return new Uuid(value || this.random());
  }

  private static random(): string {
    return uuidv4();
  }

  get value(): string {
    return this._value;
  }

  equals(other: Uuid): boolean {
    return this._value === other.value;
  }
}
```