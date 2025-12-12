# TypeORM Entities

## Descripción

Entidades de persistencia para PostgreSQL con TypeORM.

## Referencia

`src/context/company/infrastructure/persistence/entity/company-typeorm.entity.ts`

## Estructura Base

```typescript
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('companies')
export class CompanyTypeOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'company_name', type: 'varchar', length: 255 })
  companyName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relación One-to-Many
  @OneToMany(() => SiteTypeOrmEntity, (site) => site.company, {
    cascade: true,
    eager: true,
  })
  sites: SiteTypeOrmEntity[];
}
```

## Relaciones

### One-to-Many

```typescript
@Entity('companies')
export class CompanyTypeOrmEntity {
  @OneToMany(() => SiteTypeOrmEntity, (site) => site.company, {
    cascade: true,  // Operaciones en cascada
    eager: true,    // Cargar automáticamente
  })
  sites: SiteTypeOrmEntity[];
}

@Entity('sites')
export class SiteTypeOrmEntity {
  @ManyToOne(() => CompanyTypeOrmEntity, (company) => company.sites)
  @JoinColumn({ name: 'company_id' })
  company: CompanyTypeOrmEntity;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;
}
```

### Many-to-Many

```typescript
@Entity('users')
export class UserTypeOrmEntity {
  @ManyToMany(() => RoleTypeOrmEntity)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'role_id' },
  })
  roles: RoleTypeOrmEntity[];
}
```

## Convenciones de Naming

| TypeScript | PostgreSQL |
|------------|------------|
| `companyName` | `company_name` |
| `createdAt` | `created_at` |
| `userId` | `user_id` |
| `isActive` | `is_active` |

## Tipos de Columnas

| TypeScript | PostgreSQL | Decorador |
|------------|------------|-----------|
| `string` | `varchar` | `@Column({ type: 'varchar', length: 255 })` |
| `string` | `text` | `@Column({ type: 'text' })` |
| `number` | `integer` | `@Column({ type: 'integer' })` |
| `number` | `decimal` | `@Column({ type: 'decimal', precision: 10, scale: 2 })` |
| `boolean` | `boolean` | `@Column({ type: 'boolean' })` |
| `Date` | `timestamptz` | `@Column({ type: 'timestamptz' })` |
| `string[]` | `text[]` | `@Column({ type: 'simple-array' })` |
| `object` | `jsonb` | `@Column({ type: 'jsonb' })` |
| `string` | `uuid` | `@Column({ type: 'uuid' })` |

## Opciones de @Column

```typescript
@Column({
  name: 'column_name',       // Nombre en BD
  type: 'varchar',           // Tipo PostgreSQL
  length: 255,               // Longitud (varchar)
  nullable: true,            // Permite null
  default: 'value',          // Valor por defecto
  unique: true,              // Índice único
  select: false,             // No incluir en SELECT por defecto
})
```

## Índices

```typescript
import { Index } from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['companyId', 'status'])
export class UserTypeOrmEntity {
  // ...
}
```

## Registro en Módulo

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyTypeOrmEntity,
      SiteTypeOrmEntity,
    ]),
  ],
})
export class CompanyInfrastructureModule {}
```

## Reglas de Naming

| Elemento | Patrón | Ejemplo |
|----------|--------|---------|
| Entity | `<Entity>TypeOrmEntity` | `CompanyTypeOrmEntity` |
| Tabla | snake_case plural | `companies`, `user_accounts` |
| Archivo | `<entity>-typeorm.entity.ts` | `company-typeorm.entity.ts` |

## Anti-patrones

- Exponer entities fuera de infrastructure
- Nombres de columnas en camelCase
- Lógica de negocio en entities
- No usar `name` explícito para columnas
