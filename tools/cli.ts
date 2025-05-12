#!/usr/bin/env ts-node
// tools/cli.ts
import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

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
  .command('migrar')
  .description('Ejecuta una migración simulada')
  .action(async () => {
    const app = await NestFactory.createApplicationContext(AppModule);
    console.log('Migración completada.');
    await app.close();
  });

program
  .parseAsync(process.argv)
  .then(() => {
    console.log('Comando ejecutado con éxito');
  })
  .catch((error) => {
    console.error('Error al ejecutar el comando:', error);
  });
