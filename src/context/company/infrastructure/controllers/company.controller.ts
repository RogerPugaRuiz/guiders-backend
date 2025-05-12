import { Body, Controller, Post } from '@nestjs/common';
import { CreateCompanyDto } from '../../application/dtos/create-company.dto';
import { CompanyService } from '../services/company.service';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}
  @Post()
  async createCompany(@Body() createCompanyDto: CreateCompanyDto) {
    await this.companyService.createCompany(createCompanyDto);
  }
}
