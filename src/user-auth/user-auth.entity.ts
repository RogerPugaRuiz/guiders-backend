import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UserAuthEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;
}
