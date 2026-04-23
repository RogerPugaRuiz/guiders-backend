import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { LeadsAdminController } from '../leads-admin.controller';
import { LeadcarsApiService } from '../../adapters/leadcars/leadcars-api.service';
import {
  ICrmCompanyConfigRepository,
  CRM_COMPANY_CONFIG_REPOSITORY,
} from '../../../domain/crm-company-config.repository';
import { CRM_SYNC_RECORD_REPOSITORY } from '../../../domain/crm-sync-record.repository';
import { LEAD_CONTACT_DATA_REPOSITORY } from '../../../domain/lead-contact-data.repository';
import { CRM_SYNC_SERVICE_FACTORY } from '../../../domain/services/crm-sync.service';
import { DualAuthGuard } from 'src/context/shared/infrastructure/guards/dual-auth.guard';
import { RolesGuard } from 'src/context/shared/infrastructure/guards/role.guard';
import { ok, err } from 'src/context/shared/domain/result';
import { CrmApiError } from 'src/context/leads/domain/errors/leads.error';

/**
 * Guard stub que siempre permite el acceso (para tests unitarios)
 */
class AllowAllGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

/**
 * Crea un mock de AuthenticatedRequest con companyId fijo
 */
function makeRequest(companyId = 'company-uuid-001'): any {
  return { user: { sub: 'user-uuid', roles: ['admin'], companyId } };
}

describe('LeadsAdminController - getLeadcarsSedes', () => {
  let controller: LeadsAdminController;
  let leadcarsApiService: jest.Mocked<LeadcarsApiService>;
  let configRepository: jest.Mocked<ICrmCompanyConfigRepository>;

  beforeEach(async () => {
    leadcarsApiService = {
      listSedes: jest.fn(),
      listCampanas: jest.fn(),
      listConcesionarios: jest.fn(),
      listTiposLead: jest.fn(),
      listStates: jest.fn(),
      createLead: jest.fn(),
      editLead: jest.fn(),
      addChatConversation: jest.fn(),
      addComment: jest.fn(),
    } as any;

    configRepository = {
      findByCompanyAndType: jest.fn(),
      findById: jest.fn(),
      findByCompany: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsAdminController],
      providers: [
        { provide: LeadcarsApiService, useValue: leadcarsApiService },
        { provide: CRM_COMPANY_CONFIG_REPOSITORY, useValue: configRepository },
        {
          provide: CRM_SYNC_RECORD_REPOSITORY,
          useValue: {
            findByCompany: jest.fn(),
            findFailed: jest.fn(),
            findByVisitorAndCompany: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: CRM_SYNC_SERVICE_FACTORY,
          useValue: { getService: jest.fn() },
        },
        {
          provide: LEAD_CONTACT_DATA_REPOSITORY,
          useValue: {
            findByVisitorAndCompany: jest.fn(),
            findByCompany: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(DualAuthGuard)
      .useClass(AllowAllGuard)
      .overrideGuard(RolesGuard)
      .useClass(AllowAllGuard)
      .compile();

    controller = module.get<LeadsAdminController>(LeadsAdminController);
  });

  describe('cuando concesionarioId no es un número válido', () => {
    it('debe lanzar BadRequestException si concesionarioId es texto', async () => {
      await expect(
        controller.getLeadcarsSedes(
          'abc',
          makeRequest(),
          'token-de-prueba-1234',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si concesionarioId es 0', async () => {
      await expect(
        controller.getLeadcarsSedes('0', makeRequest(), 'token-de-prueba-1234'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si concesionarioId es negativo', async () => {
      await expect(
        controller.getLeadcarsSedes(
          '-1',
          makeRequest(),
          'token-de-prueba-1234',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('mapper fallback de concesionario_id', () => {
    const concesionarioIdParam = '42';
    const concesionarioIdNum = 42;
    const clienteToken = 'token-de-prueba-12345678';

    it('debe usar concesionario_id de la sede si está presente en la respuesta', async () => {
      leadcarsApiService.listSedes.mockResolvedValue(
        ok([
          {
            id: 1,
            nombre: 'Sede Central',
            concesionario_id: concesionarioIdNum,
            activo: true,
          },
        ]),
      );

      const result = await controller.getLeadcarsSedes(
        concesionarioIdParam,
        makeRequest(),
        clienteToken,
      );

      expect(result).toHaveLength(1);
      expect(result[0].concesionarioId).toBe(concesionarioIdNum);
    });

    it('debe aplicar fallback al concesionarioId del path cuando concesionario_id es undefined en la respuesta', async () => {
      // La API puede devolver sedes sin concesionario_id
      leadcarsApiService.listSedes.mockResolvedValue(
        ok([
          {
            id: 7,
            nombre: 'Sede Sin Id',
            concesionario_id: undefined as any,
            activo: true,
          },
        ]),
      );

      const result = await controller.getLeadcarsSedes(
        concesionarioIdParam,
        makeRequest(),
        clienteToken,
      );

      expect(result).toHaveLength(1);
      // El fallback debe usar el param del path (42)
      expect(result[0].concesionarioId).toBe(concesionarioIdNum);
    });

    it('debe aplicar fallback cuando concesionario_id es null', async () => {
      leadcarsApiService.listSedes.mockResolvedValue(
        ok([
          {
            id: 8,
            nombre: 'Sede Null Id',
            concesionario_id: null as any,
            activo: true,
          },
        ]),
      );

      const result = await controller.getLeadcarsSedes(
        concesionarioIdParam,
        makeRequest(),
        clienteToken,
      );

      expect(result[0].concesionarioId).toBe(concesionarioIdNum);
    });

    it('debe mapear nombre a undefined cuando no está presente', async () => {
      leadcarsApiService.listSedes.mockResolvedValue(
        ok([
          {
            id: 9,
            nombre: undefined as any,
            concesionario_id: concesionarioIdNum,
            activo: true,
          },
        ]),
      );

      const result = await controller.getLeadcarsSedes(
        concesionarioIdParam,
        makeRequest(),
        clienteToken,
      );

      expect(result[0].nombre).toBeUndefined();
    });

    it('debe devolver array vacío cuando la API no retorna sedes', async () => {
      leadcarsApiService.listSedes.mockResolvedValue(ok([]));

      const result = await controller.getLeadcarsSedes(
        concesionarioIdParam,
        makeRequest(),
        clienteToken,
      );

      expect(result).toEqual([]);
    });
  });

  describe('cuando la API de LeadCars devuelve error', () => {
    it('debe lanzar InternalServerErrorException', async () => {
      leadcarsApiService.listSedes.mockResolvedValue(
        err(new CrmApiError('leadcars', 'Error de conexión con LeadCars')),
      );

      await expect(
        controller.getLeadcarsSedes(
          '42',
          makeRequest(),
          'token-de-prueba-12345678',
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
