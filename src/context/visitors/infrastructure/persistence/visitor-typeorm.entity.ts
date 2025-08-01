import { Entity, PrimaryColumn, Column } from 'typeorm';

// Entidad de infraestructura para la persistencia de Visitor en la base de datos relacional.
// Esta clase representa la tabla 'visitors' y mapea los campos de dominio a columnas.
@Entity({ name: 'visitors' })
export class VisitorTypeOrmEntity {
  // Identificador único del visitante (UUID)
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  // Nombre del visitante
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  // Email del visitante
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  // Teléfono del visitante (opcional)
  @Column({ type: 'varchar', length: 50, nullable: true })
  tel: string | null;

  // Página actual del visitante (opcional)
  @Column({ type: 'varchar', length: 255, nullable: true })
  currentPage: string | null;

  // Tiempo de conexión del visitante en milisegundos (opcional)
  @Column({
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value ? parseInt(value, 10) : null),
    },
  })
  connectionTime: number | null;

  // Etiquetas asociadas al visitante (array de strings, opcional)
  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  // Notas adicionales sobre el visitante (opcional)
  @Column({ type: 'simple-array', nullable: true })
  notes: string[];
}
