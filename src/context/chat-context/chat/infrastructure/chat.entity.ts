import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('chats')
export class ChatEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  commercialId: string | null;

  @Column({
    type: 'text',
    unique: true,
    nullable: false,
  })
  visitorId: string;

  @Column()
  status: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  lastMessage: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  visitorLastReadAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  commercialLastReadAt: Date | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
