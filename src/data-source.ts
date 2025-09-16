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
  // Rutas específicas para entidades TypeORM (solo PostgreSQL, no Mongo)
  entities: [
    join(__dirname, 'context/auth/api-key/infrastructure/api-key.entity.js'),
    join(
      __dirname,
      'context/auth/auth-user/infrastructure/user-account.entity.js',
    ),
    join(
      __dirname,
      'context/auth/auth-user/infrastructure/persistence/entity/invite-typeorm.entity.js',
    ),
    join(
      __dirname,
      'context/auth/auth-visitor/infrastructure/visitor-account.entity.js',
    ),
    join(
      __dirname,
      'context/company/infrastructure/persistence/entity/company-typeorm.entity.js',
    ),
    join(
      __dirname,
      'context/company/infrastructure/persistence/typeorm/company-site.entity.js',
    ),
    join(
      __dirname,
      'context/conversations/infrastructure/conversation.entity.js',
    ),
    join(__dirname, 'context/conversations/infrastructure/message.entity.js'),
    join(
      __dirname,
      'context/tracking/infrastructure/persistence/entity/tracking-event.typeorm.entity.js',
    ),
    join(
      __dirname,
      'context/tracking/infrastructure/persistence/entity/visitor-intent.entity.js',
    ),
    join(
      __dirname,
      'context/visitors/infrastructure/persistence/visitor-typeorm.entity.js',
    ),
    join(__dirname, 'context/shared/domain/entities/test-entity.entity.js'),
  ],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: allowSync, // Solo si TYPEORM_SYNC=true
});

if (allowSync) {
  console.warn(
    '[DataSource] synchronize=TRUE habilitado por TYPEORM_SYNC (revertir a migraciones pronto).',
  );
}
