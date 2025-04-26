import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tracking_visitor')
export class TrackingVisitorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  visitorName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  currentUrl: string | null;

  @Column({ type: 'numeric', nullable: false })
  connectionDuration: number;

  @Column({ type: 'boolean', default: false })
  isConnected: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  ultimateConnectionDate: Date | null;

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
