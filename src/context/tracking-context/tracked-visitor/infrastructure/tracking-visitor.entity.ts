import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tracking_visitor')
export class TrackingVisitorEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  visitorName: string;

  @Column({ type: 'number', nullable: false })
  connectionDuration: number;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    transformer: {
      to: (value: Date) => value,
      from: (value: string) => new Date(value + 'Z'),
    },
  })
  createdAt: Date;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    transformer: {
      to: (value: Date) => value,
      from: (value: string) => new Date(value + 'Z'),
    },
  })
  updatedAt: Date;
}
