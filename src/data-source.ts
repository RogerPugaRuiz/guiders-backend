import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Usar CommonJS para compatibilidad con TypeORM CLI y Node.js
// __dirname está disponible y no requiere hacks de ES modules

dotenv.config({
  path: process.env.NODE_ENV === 'development' ? '.env' : '.env.production',
});

// Configuración de DataSource para TypeORM CLI y generación de migraciones
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
  // Ajuste: solo buscar entidades compiladas (.js) para generación de migraciones
  entities: [join(__dirname, '/../**/*.entity.js')],
  migrations: [join(__dirname, '/migrations/*{.ts,.js}')],
  synchronize: false,
});
