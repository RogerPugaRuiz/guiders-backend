#!/usr/bin/env node
// tools/cli.ts
import { config } from 'dotenv';
import { resolve } from 'path';

// Siempre carga el .env.production basado en la ubicación física del script
config({ path: resolve(__dirname, '..', '..', '.env.production') });

import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CommandBus } from '@nestjs/cqrs';
import { CreateCompanyCommand } from '../src/context/company/application/commands/create-company.command';
import { CreateCompanyWithAdminCommand } from '../src/context/company/application/commands/create-company-with-admin.command';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

const program = new Command();

program
  .command('hello')
  .description('Muestra un saludo')
  .action(async () => {
    const app = await NestFactory.createApplicationContext(AppModule);
    console.log('Hola desde CLI');
    await app.close();
  });

program
  .command('create-company')
  .description('Crea una nueva compañía desde CLI')
  .requiredOption('--name <companyName>', 'Nombre de la compañía')
  .requiredOption('--domain <domain>', 'Dominio de la compañía')
  .action(async (options: Record<string, string>) => {
    const app = await NestFactory.createApplicationContext(AppModule);
    const commandBus = app.get(CommandBus);
    // Construye el DTO solo con los datos de la compañía
    const createCompanyDto = {
      companyName: String(options.name),
      domain: String(options.domain),
    };
    await commandBus.execute(new CreateCompanyCommand(createCompanyDto));
    console.log('Compañía creada correctamente');
    await app.close();
  });

program
  .command('create-company-with-admin')
  .description('Crea una nueva compañía y su admin desde CLI')
  .requiredOption('--name <companyName>', 'Nombre de la compañía')
  .requiredOption('--domain <domain>', 'Dominio de la compañía')
  .requiredOption('--adminName <adminName>', 'Nombre del administrador')
  .requiredOption('--adminEmail <adminEmail>', 'Email del administrador')
  .option('--adminTel <adminTel>', 'Teléfono del administrador')
  .action(async (options: Record<string, string>) => {
    const app = await NestFactory.createApplicationContext(AppModule);
    const commandBus = app.get(CommandBus);
    // Construye el comando con los argumentos planos
    const command = new CreateCompanyWithAdminCommand({
      adminName: String(options.adminName),
      adminEmail: String(options.adminEmail),
      adminTel: options.adminTel ? String(options.adminTel) : undefined,
      companyName: String(options.name),
      domain: String(options.domain),
    });
    await commandBus.execute(command);
    // Espera explícita para asegurar que los eventos de dominio CQRS se procesen correctamente
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Ajusta el tiempo según sea necesario
    console.log('Compañía y admin creados correctamente');
    await app.close();
  });

program
  .command('clean-database')
  .description('Limpia todas las entidades de la base de datos')
  .option('--force', 'Fuerza la limpieza sin confirmación')
  .action(async (options: { force?: boolean }) => {
    if (!options.force) {
      console.log(
        '⚠️  ADVERTENCIA: Esta operación eliminará TODOS los datos de la base de datos.',
      );
      console.log('Para ejecutar, añade la opción --force');
      return;
    }

    const logger = new Logger('CleanDatabase');
    logger.log('Iniciando limpieza de la base de datos...');

    try {
      const app = await NestFactory.createApplicationContext(AppModule);
      const dataSource = app.get(DataSource);

      if (!dataSource.isInitialized) {
        await dataSource.initialize();
        logger.log('Conexión a la base de datos inicializada');
      }

      // Obtener todas las entidades registradas
      const entities = dataSource.entityMetadatas;
      
      // Desactivar restricciones de clave foránea temporalmente
      await dataSource.query('SET CONSTRAINTS ALL DEFERRED');
      
      // Truncar todas las tablas en orden inverso (para evitar problemas de dependencia)
      for (const entity of entities.reverse()) {
        try {
          logger.log(`Limpiando entidad: ${entity.name}`);
          await dataSource.query(`TRUNCATE TABLE ${entity.tableName} CASCADE`);
          logger.log(`Entidad ${entity.name} limpiada correctamente`);
        } catch (error: any) {
          logger.error(
            `Error al limpiar la entidad ${entity.name}: ${error?.message || 'Error desconocido'}`,
          );
        }
      }
      
      // Reactivar restricciones de clave foránea
      await dataSource.query('SET CONSTRAINTS ALL IMMEDIATE');
      
      logger.log('🧹 Base de datos limpiada correctamente');
      await app.close();
    } catch (error: any) {
      logger.error(`Error al limpiar la base de datos: ${error?.message || 'Error desconocido'}`);
      process.exit(1);
    }
  });

program
  .parseAsync(process.argv)
  .then(() => {
    console.log('Comando ejecutado con éxito');
  })
  .catch((error) => {
    console.error('Error al ejecutar el comando:', error);
  });
