import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('messages')
export class MessageEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  chatId: string;

  @Column('uuid')
  senderId: string;

  @Column('text')
  content: string;

  @Column('timestamptz')
  createdAt: Date;
}
