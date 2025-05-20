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
}
