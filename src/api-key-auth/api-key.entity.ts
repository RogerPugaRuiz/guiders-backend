import { DeviceFingerprintsEntity } from 'src/device/device-fingerprints.entity';
import { UserAuthEntity } from 'src/user-auth/user-auth.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';

@Entity()
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  clientId: string;

  @Column()
  publicKey: string;

  // La clave privada se guarda cifrada
  @Column()
  privateKey: string;

  // Relación OneToMany con DeviceFingerprintsEntity
  @OneToMany(() => DeviceFingerprintsEntity, (device) => device.apiKey)
  devices: DeviceFingerprintsEntity[];

  @ManyToMany(() => UserAuthEntity, (user) => user.apiKeys)
  commercialUsers: UserAuthEntity[];
}
