import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('integration_api_keys')
export class IntegrationApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  companyId: string;

  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ unique: true, nullable: false })
  @Index()
  tokenHash: string;

  /** Primeros caracteres del token (e.g. "gdr_live_a1b2") para mostrar en UI sin exponer el token completo */
  @Column({ length: 20, nullable: false })
  tokenPrefix: string;

  @Column({ type: 'varchar', length: 10, default: 'live' })
  environment: string;

  @Column({ type: 'varchar', length: 10, default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  revokedAt: Date | null;
}
