import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tracking_visitor')
export class TrackingVisitorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  visitorName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastVisitedUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastVisitedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isConnected: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  ultimateConnectionDate: Date | null;

  @Column({ type: 'int', default: 0 })
  pageViews: number;

  @Column({ type: 'int', default: 0 })
  sessionDurationSeconds: number;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
