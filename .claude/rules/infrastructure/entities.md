# TypeORM Entities

## Description

Persistence entities for PostgreSQL using TypeORM.

## Reference

`src/context/company/infrastructure/persistence/entity/company-typeorm.entity.ts`

## Base Structure

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

  // One-to-Many relation
  @OneToMany(() => SiteTypeOrmEntity, (site) => site.company, {
    cascade: true,
    eager: true,
  })
  sites: SiteTypeOrmEntity[];
}
```

## Relations

### One-to-Many

```typescript
@Entity('companies')
export class CompanyTypeOrmEntity {
  @OneToMany(() => SiteTypeOrmEntity, (site) => site.company, {
    cascade: true,  // Cascade operations
    eager: true,    // Auto-load
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

## Naming Conventions

| TypeScript | PostgreSQL |
|------------|------------|
| `companyName` | `company_name` |
| `createdAt` | `created_at` |
| `userId` | `user_id` |
| `isActive` | `is_active` |

## Column Types

| TypeScript | PostgreSQL | Decorator |
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

## @Column Options

```typescript
@Column({
  name: 'column_name',       // DB column name
  type: 'varchar',           // PostgreSQL type
  length: 255,               // Length (varchar)
  nullable: true,            // Allows null
  default: 'value',          // Default value
  unique: true,              // Unique index
  select: false,             // Exclude from SELECT by default
})
```

## Indexes

```typescript
import { Index } from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['companyId', 'status'])
export class UserTypeOrmEntity {
  // ...
}
```

## Module Registration

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

## Naming Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Entity | `<Entity>TypeOrmEntity` | `CompanyTypeOrmEntity` |
| Table | snake_case plural | `companies`, `user_accounts` |
| File | `<entity>-typeorm.entity.ts` | `company-typeorm.entity.ts` |

## Anti-patterns

- Exposing entities outside infrastructure
- Column names in camelCase
- Business logic in entities
- Not using explicit `name` for columns
