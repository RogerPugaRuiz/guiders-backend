import { ApiKeyEntity } from 'src/context/auth-context/api-key/infrastructure/api-key.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity()
export class VisitorAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  clientID: string;

  @Column()
  userAgent: string;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  lastLoginAt: Date | null | undefined;

  // Relación ManyToOne hacia ApiKeyEntity
  @ManyToOne(() => ApiKeyEntity, (apiKey) => apiKey.visitors)
  @JoinColumn({ name: 'apiKey', referencedColumnName: 'apiKey' })
  apiKey: ApiKeyEntity;
}
