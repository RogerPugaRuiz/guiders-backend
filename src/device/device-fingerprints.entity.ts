import { ApiKeyEntity } from 'src/api-key-auth/api-key.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

@Entity()
export class DeviceFingerprintsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  fingerprint: string;

  @Column()
  userAgent: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @Column({
    type: 'int',
    default: 0,
  })
  timeConnectedInSeconds: number;

  // Relación ManyToOne hacia ApiKeyEntity
  @ManyToOne(() => ApiKeyEntity, (apiKey) => apiKey.devices)
  @JoinColumn({ name: 'clientId', referencedColumnName: 'clientId' })
  apiKey: ApiKeyEntity;
}
