import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyTypeOrmEntity } from '../entity/company-typeorm.entity';

/**
 * Entidad TypeORM para representar un sitio web de una empresa.
 * Almacena tanto dominios canónicos como aliases de dominio.
 */
@Entity('company_sites')
export class CompanySiteTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  domain: string;

  @Column({ type: 'boolean', default: false, name: 'is_canonical' })
  isCanonical: boolean;

  @Column({ type: 'uuid', name: 'company_id' })
  companyId: string;

  @ManyToOne(() => CompanyTypeOrmEntity, (company) => company.sites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company: CompanyTypeOrmEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
