import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join, resolve } from 'path';
import * as fs from 'fs';

// Usar CommonJS para compatibilidad con TypeORM CLI y Node.js
// __dirname está disponible y no requiere hacks de ES modules

// Selección de archivo .env según entorno (incluye staging) usando ruta absoluta al root del proyecto
const selectedEnvName =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : process.env.NODE_ENV === 'staging'
      ? '.env.staging'
      : '.env';

// __dirname (compilado) -> dist/src => root = dist/.. => join(__dirname, '../..')
const projectRoot = resolve(__dirname, '../..');
let envPath = join(projectRoot, selectedEnvName);

if (!fs.existsSync(envPath)) {
  // Fallback: intentar en cwd (por si la estructura difiere)
  const alt = join(process.cwd(), selectedEnvName);
  if (fs.existsSync(alt)) {
    envPath = alt;
  } else {
    console.warn(
      `[DataSource] No se encontró archivo env (${selectedEnvName}) en ${envPath} ni ${alt}. Variables de entorno podrían faltar.`,
    );
  }
}

dotenv.config({ path: envPath });
console.log(`[DataSource] Archivo de entorno cargado: ${envPath}`);

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
