import { Column, Entity, PrimaryColumn } from 'typeorm';

// Entidad de persistencia para VisitorIntent
@Entity('visitor_intent')
export class VisitorIntentEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid' })
  visitorId!: string;

  @Column({ type: 'varchar', length: 32 })
  type!: string;

  @Column({ type: 'varchar', length: 16 })
  confidence!: string;

  @Column({ type: 'timestamp' })
  detectedAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  priceRange?: { min: number; max: number };

  @Column({ type: 'jsonb', nullable: true })
  navigationPath?: string[];

  @Column({ type: 'varchar', length: 512, nullable: true })
  description?: string;
}
