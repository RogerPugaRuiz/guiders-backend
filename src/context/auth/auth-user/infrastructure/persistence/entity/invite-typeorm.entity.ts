import { Entity, Column, PrimaryColumn } from 'typeorm';

// Entidad de persistencia para Invite
@Entity('invites')
export class InviteTypeOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('varchar')
  email: string;

  @Column('varchar')
  token: string;

  @Column('timestamp')
  expiresAt: Date;
}
