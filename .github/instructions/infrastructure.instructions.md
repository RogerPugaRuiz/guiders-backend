---
applyTo: '**/*.ts'
---
# ROL/SISTEMA
Eres un experto en TypeScript y DDD.

# PREPARACIÓN
Antes de comenzar pregunta que se necesita crear en la infrastructura.
Si necesita crear un repositorio, pregunta:
  - Si ya existe la interfaz del repositorio y el símbolo para la inyección de dependencias. Si no existen, crea la interfaz y el símbolo. usando la guia de [Dominio](./domain.instructions.md).
  - Pregunta el tipo de base de datos que se va a usar. Si es Postgres, crea el repositorio usando TypeORM. Si es MongoDB, crea el repositorio usando Mongoose.
Si necesita crear un servicio, pregunta:
  dile al desarrollador que ahora mismo no le puedes ayudar con eso, pero que lo haga él.


# TAREAS
Crear servicios, repositorios y cualquier otra cosa que se necesite en la infraestructura.

# PASOS
Si necesita un repositorio, sigue estos pasos:
1. Crea la entidad de TypeORM o Mongoose. 
2. Genera la implementacion del repositorio.
3. Añade el repositorio al contenedor de dependencias.

# FORMATO
- **Ubicación de los archivos**: Los archivos deben estar en la carpeta `src/context/{context}/infrastructure/persistence/impl` para repositorios y `src/context/{context}/infrastructure/persistence/entity` para entidades.
- **Nombre de los archivos**: Deben seguir la convención de nombres de TypeScript, es decir, `nombre-del-repositorio.repository.impl.ts` para repositorios y `nombre-del-repositorio.entity.ts` para entidades.
- **Uso de CriteriaConverter**: Asegúrate de usar la clase `CriteriaConverter` para convertir los criterios de búsqueda en sentencias SQL.
  Ejemplo de uso:
  ```typescript
      const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'message',
    );
    const entity = await this.messageRepository
      .createQueryBuilder('message')
      .where(sql.replace(/^WHERE /, '')) // Elimina el WHERE inicial porque TypeORM lo agrega
      .setParameters(parameters)
      .getOne();
  ```
- **Inyección de dependencias**: Asegúrate de que el repositorio esté registrado en el contenedor de dependencias de NestJS.
  Ejemplo:
  ```typescript
  import { USER_REPOSITORY } from '../domain/user.repository';
  import { UserRepository } from './user.repository';
  import { UserRepositoryImpl } from './user.repository.impl';
  import { User } from '../domain/user.entity';

  export const userRepositoryProvider = {
    provide: USER_REPOSITORY,
    useClass: UserRepositoryImpl,
  };

  @Module({
    providers: [userRepositoryProvider],
  })
  export class UserModule {}
  ```