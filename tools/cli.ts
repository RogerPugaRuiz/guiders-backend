#!/usr/bin/env ts-node
// tools/cli.ts
import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CommandBus } from '@nestjs/cqrs';
import { CreateCompanyCommand } from '../src/context/company/application/commands/create-company.command';
import { CreateCompanyWithAdminCommand } from '../src/context/company/application/commands/create-company-with-admin.command';

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
    console.log('Compañía y admin creados correctamente');
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
