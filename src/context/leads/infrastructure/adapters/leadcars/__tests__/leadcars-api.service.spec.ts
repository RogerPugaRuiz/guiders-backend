import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { LeadcarsApiService } from '../leadcars-api.service';
import {
  LeadcarsConfig,
  LeadcarsListStatesResponse,
  LeadcarsEditLeadRequest,
  LeadcarsEditLeadResponse,
} from '../leadcars.types';

/**
 * Crea una respuesta Axios simulada
 */
function mockAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as any,
  };
}

/**
 * Crea un error Axios simulado
 */
function mockAxiosError(status: number, message: string): AxiosError {
  const error = new AxiosError(message);
  error.response = {
    data: { success: false, error: { code: 'ERROR', message } },
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: {} } as any,
  };
  return error;
}

describe('LeadcarsApiService', () => {
  let service: LeadcarsApiService;
  let httpService: jest.Mocked<HttpService>;

  const config: LeadcarsConfig = {
    clienteToken: 'test-token-12345678901',
    useSandbox: true,
    concesionarioId: 1,
    tipoLeadDefault: 5,
  };

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        LeadcarsApiService,
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get<LeadcarsApiService>(LeadcarsApiService);
  });

  // ─────────────────────────────────────────────────────────────────
  // listStates
  // ─────────────────────────────────────────────────────────────────

  describe('listStates', () => {
    it('debe llamar a GET /listStates con header cliente-token correcto', async () => {
      const mockResponse: LeadcarsListStatesResponse = {
        Nuevo: {
          id: 1,
          group: 'Activo',
          fields: [
            {
              name: 'motivo',
              type: 'text',
              title: 'Motivo',
              required: false,
            },
          ],
        },
      };

      httpService.get.mockReturnValue(of(mockAxiosResponse(mockResponse)));

      const result = await service.listStates(config);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockResponse);

      // Verifica que se llamó a la URL correcta con sandbox
      expect(httpService.get).toHaveBeenCalledWith(
        'https://apisandbox.leadcars.es/api/v2/listStates',
        expect.objectContaining({
          headers: expect.objectContaining({
            'cliente-token': 'test-token-12345678901',
          }),
        }),
      );
    });

    it('debe propagar errores de la API via CrmApiError', async () => {
      httpService.get.mockReturnValue(
        throwError(() => mockAxiosError(401, 'Token inválido')),
      );

      const result = await service.listStates(config);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Token inválido');
      }
    });

    it('debe usar URL de producción cuando useSandbox es false', async () => {
      const prodConfig: LeadcarsConfig = { ...config, useSandbox: false };
      const mockResponse: LeadcarsListStatesResponse = {};

      httpService.get.mockReturnValue(of(mockAxiosResponse(mockResponse)));

      await service.listStates(prodConfig);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.leadcars.es/api/v2/listStates',
        expect.any(Object),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // editLead
  // ─────────────────────────────────────────────────────────────────

  describe('editLead', () => {
    const leadId = 123;
    const editRequest: LeadcarsEditLeadRequest = {
      estado: {
        id: 1,
        motivos: ['Interesado'],
        texto: 'Lead cualificado',
      },
      temperature: 'hot',
    };

    it('debe llamar a PUT /leads/123/submit con payload correcto', async () => {
      const mockResponse: LeadcarsEditLeadResponse = {
        success: true,
        data: {
          id: leadId,
          referencia: 'REF-001',
          nombre: 'Juan',
          estado: 'Activo',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      };

      httpService.put.mockReturnValue(of(mockAxiosResponse(mockResponse)));

      const result = await service.editLead(leadId, editRequest, config);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockResponse);

      expect(httpService.put).toHaveBeenCalledWith(
        'https://apisandbox.leadcars.es/api/v2/leads/123/submit',
        editRequest,
        expect.objectContaining({
          headers: expect.objectContaining({
            'cliente-token': 'test-token-12345678901',
          }),
        }),
      );
    });

    it('debe incluir el campo estado en el payload de editLead', async () => {
      const mockResponse: LeadcarsEditLeadResponse = { success: true };
      httpService.put.mockReturnValue(of(mockAxiosResponse(mockResponse)));

      await service.editLead(leadId, editRequest, config);

      const callArgs = httpService.put.mock.calls[0];
      const payload = callArgs[1] as LeadcarsEditLeadRequest;

      expect(payload.estado).toBeDefined();
      expect(payload.estado.id).toBe(1);
    });

    it('debe propagar errores via CrmApiError al editar lead', async () => {
      httpService.put.mockReturnValue(
        throwError(() => mockAxiosError(404, 'Lead no encontrado')),
      );

      const result = await service.editLead(leadId, editRequest, config);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Lead no encontrado');
      }
    });

    it('debe retornar error sin llamar a la API si leadId no es válido', async () => {
      const result = await service.editLead(0, editRequest, config);

      expect(result.isErr()).toBe(true);
      expect(httpService.put).not.toHaveBeenCalled();
      if (result.isErr()) {
        expect(result.error.message).toContain('leadId inválido');
      }
    });
  });
});
