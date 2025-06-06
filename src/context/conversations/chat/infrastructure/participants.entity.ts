import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('participants')
export class ParticipantsEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  name: string;

  @Column({
    type: 'boolean',
    nullable: false,
  })
  isCommercial: boolean;

  @Column({
    type: 'boolean',
    nullable: false,
  })
  isVisitor: boolean;

  @Column({
    type: 'boolean',
    nullable: false,
  })
  isOnline: boolean;

  @Column({
    type: 'boolean',
    nullable: false,
  })
  isViewing: boolean;

  @Column({
    type: 'boolean',
    nullable: false,
  })
  isTyping: boolean;

  @Column({
    type: 'boolean',
    nullable: false,
    default: true,
  })
  isAnonymous: boolean;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;
}
