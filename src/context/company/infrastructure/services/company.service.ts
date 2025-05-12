import { Injectable } from '@nestjs/common';
import { CreateCompanyDto } from '../../application/dtos/create-company.dto';

@Injectable()
export class CompanyService {
  constructor() {}

  async createCompany(createCompanyDto: CreateCompanyDto): Promise<void> {
    // Aquí iría la lógica para crear una empresa
    console.log('Creando empresa:', createCompanyDto);

    return Promise.resolve(); // Simulación de una operación asíncrona
  }
}
