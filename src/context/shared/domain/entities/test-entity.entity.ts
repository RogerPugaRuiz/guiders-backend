import { AggregateRoot } from '@nestjs/cqrs';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Entidad de prueba siguiendo DDD y compatible con TypeORM
@Entity('test_entity')
export class TestEntity extends AggregateRoot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'int', default: 0 })
  value: number;
}
