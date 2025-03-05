import { ApiKeyEntity } from 'src/api-key-auth/api-key.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';

@Entity()
export class UserAuthEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @ManyToMany(() => ApiKeyEntity, (apiKey) => apiKey.commercialUsers, {
    cascade: true,
    eager: true,
  })
  @JoinTable({
    name: 'user_api_keys',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'api_key_id',
      referencedColumnName: 'id',
    },
  })
  apiKeys: ApiKeyEntity[];
}
