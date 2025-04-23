import { Entity, PrimaryColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { ParticipantsEntity } from './participants.entity';

@Entity('chats')
export class ChatEntity {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToMany(() => ParticipantsEntity, { eager: true, cascade: true })
  @JoinTable({
    name: 'chat_participants',
    joinColumn: {
      name: 'chat_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'participant_id',
      referencedColumnName: 'id',
    },
  })
  participants: ParticipantsEntity[];

  @Column()
  status: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  lastMessage: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
