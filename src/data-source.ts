import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Usar CommonJS para compatibilidad con TypeORM CLI y Node.js
// __dirname está disponible y no requiere hacks de ES modules

// Selección de archivo .env según entorno (incluye staging)
const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : process.env.NODE_ENV === 'staging'
      ? '.env.staging'
      : '.env';

dotenv.config({ path: envFile });

// Control mediante variable de entorno TYPEORM_SYNC (true/false)
// Usar SOLO de forma puntual; en entornos estables preferir migraciones.
const allowSync = process.env.TYPEORM_SYNC === 'true';

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
  synchronize: allowSync, // Solo si TYPEORM_SYNC=true
});

if (allowSync) {
  console.warn(
    '[DataSource] synchronize=TRUE habilitado por TYPEORM_SYNC (revertir a migraciones pronto).',
  );
}
