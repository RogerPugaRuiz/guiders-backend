# Servicios de Infraestructura

## Descripción

Adaptadores que implementan interfaces de dominio conectando con servicios externos (S3, APIs, etc.).

## Referencia

`src/context/white-label/infrastructure/services/white-label-file-upload.service.ts`

## Implementación de Interface de Dominio

```typescript
// Domain interface
export interface UserPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hashedPassword: string): Promise<boolean>;
}

export const USER_PASSWORD_HASHER = Symbol('UserPasswordHasher');

// Infrastructure implementation
@Injectable()
export class BcryptHashService implements UserPasswordHasher {
  private readonly saltRounds = 10;

  async hash(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}
```

## Servicio de Upload (S3)

```typescript
@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  private get client() {
    return S3Config.getClient();
  }

  private get bucket() {
    return S3Config.getBucketName();
  }

  async upload(
    file: Express.Multer.File,
    path: string,
  ): Promise<Result<string, DomainError>> {
    try {
      // Validar archivo
      if (file.size > MAX_FILE_SIZE) {
        return err(new FileValidationError('Archivo demasiado grande'));
      }

      // Generar key única
      const key = `${path}/${Date.now()}-${file.originalname}`;

      // Subir a S3
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
        }),
      );

      const url = `${S3Config.getBaseUrl()}/${this.bucket}/${key}`;
      this.logger.log(`Archivo subido: ${key}`);

      return ok(url);
    } catch (error) {
      this.logger.error(`Error al subir archivo: ${error.message}`);
      return err(new FilePersistenceError(error.message));
    }
  }

  async delete(fileUrl: string): Promise<Result<void, DomainError>> {
    try {
      const key = this.extractKeyFromUrl(fileUrl);

      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      this.logger.log(`Archivo eliminado: ${key}`);
      return okVoid();
    } catch (error) {
      this.logger.error(`Error al eliminar: ${error.message}`);
      return err(new FilePersistenceError(error.message));
    }
  }
}
```

## Servicio HTTP Externo

```typescript
@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);

  constructor(private readonly httpService: HttpService) {}

  async fetchData(endpoint: string): Promise<Result<ExternalData, DomainError>> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ExternalApiResponse>(endpoint, {
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${this.getApiKey()}`,
          },
        }),
      );

      return ok(this.mapToDomain(response.data));
    } catch (error) {
      if (error.response?.status === 404) {
        return err(new ExternalResourceNotFoundError(endpoint));
      }
      this.logger.error(`Error API externa: ${error.message}`);
      return err(new ExternalApiError(error.message));
    }
  }

  private getApiKey(): string {
    return process.env.EXTERNAL_API_KEY || '';
  }

  private mapToDomain(data: ExternalApiResponse): ExternalData {
    return {
      id: data.external_id,
      name: data.display_name,
      // ... mapeo
    };
  }
}
```

## Servicio de Cache (Redis)

```typescript
@Injectable()
export class RedisCacheService implements CacheService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }
}
```

## Registro en Módulo

```typescript
@Module({
  providers: [
    FileUploadService,
    {
      provide: USER_PASSWORD_HASHER,
      useClass: BcryptHashService,
    },
    {
      provide: CACHE_SERVICE,
      useClass: RedisCacheService,
    },
  ],
  exports: [
    FileUploadService,
    USER_PASSWORD_HASHER,
    CACHE_SERVICE,
  ],
})
export class SharedInfrastructureModule {}
```

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Service | `<Name>Service` | `FileUploadService` |
| Impl de interface | `<Technology><Interface>` | `BcryptHashService` |
| Archivo | `<name>.service.ts` | `file-upload.service.ts` |

## Anti-patrones

- Lógica de dominio en services de infraestructura
- Hardcodear configuración (usar ConfigService o env vars)
- No manejar errores con Result pattern
- No hacer logging de operaciones importantes
