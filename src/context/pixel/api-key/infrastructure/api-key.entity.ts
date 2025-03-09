import { VisitorAccountEntity } from 'src/context/pixel/auth-visitor/infrastructure/visitor-account.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity()
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  apiKey: string;

  @Column({ unique: true })
  domain: string;

  @Column('text')
  publicKey: string;

  // La clave privada se guarda cifrada
  @Column('text')
  privateKey: string;

  @Column({ unique: true })
  kid: string; // Identificador único de la clave usada para JWTs

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // Relación OneToMany con DeviceFingerprintsEntity
  @OneToMany(() => VisitorAccountEntity, (visitor) => visitor.apiKey)
  visitors: VisitorAccountEntity[];
}
