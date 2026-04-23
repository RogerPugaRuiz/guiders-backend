import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { LeadcarsApiService } from '../leadcars-api.service';
import {
  LeadcarsConfig,
  LeadcarsListStatesResponse,
  LeadcarsListSedesResponse,
  LeadcarsListCampanasResponse,
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

  // ─────────────────────────────────────────────────────────────────
  // listSedes
  // ─────────────────────────────────────────────────────────────────

  describe('listSedes', () => {
    const concesionarioId = 42;

    it('debe llamar a GET /sedes/:id y devolver el array de sedes', async () => {
      const mockSedes: LeadcarsListSedesResponse = [
        {
          id: 1,
          nombre: 'Sede Central',
          concesionario_id: concesionarioId,
          activo: true,
        },
        {
          id: 2,
          nombre: 'Sede Norte',
          concesionario_id: concesionarioId,
          activo: true,
        },
      ];

      httpService.get.mockReturnValue(of(mockAxiosResponse(mockSedes)));

      const result = await service.listSedes(concesionarioId, config);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(2);
      expect(httpService.get).toHaveBeenCalledWith(
        `https://apisandbox.leadcars.es/api/v2/sedes/${concesionarioId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'cliente-token': config.clienteToken,
          }),
        }),
      );
    });

    it('debe normalizar respuesta con wrapper { success, data }', async () => {
      const mockSedes: LeadcarsListSedesResponse = {
        success: true,
        data: [
          {
            id: 5,
            nombre: 'Sede Sur',
            concesionario_id: concesionarioId,
            activo: true,
          },
        ],
      };

      httpService.get.mockReturnValue(of(mockAxiosResponse(mockSedes)));

      const result = await service.listSedes(concesionarioId, config);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(1);
      expect(result.unwrap()[0].id).toBe(5);
    });

    it('debe devolver sedes incluso cuando concesionario_id no está presente en la respuesta', async () => {
      // La API puede devolver solo { id } sin otros campos
      const mockSedes = [{ id: 10 }] as any;

      httpService.get.mockReturnValue(of(mockAxiosResponse(mockSedes)));

      const result = await service.listSedes(concesionarioId, config);

      // El servicio devuelve el array tal cual; el fallback concesionario_id ?? param
      // se aplica en el controller, no aquí
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()[0].id).toBe(10);
    });

    it('debe propagar error de la API como CrmApiError', async () => {
      httpService.get.mockReturnValue(
        throwError(() => mockAxiosError(401, 'Token inválido')),
      );

      const result = await service.listSedes(concesionarioId, config);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Token inválido');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // listCampanas
  // ─────────────────────────────────────────────────────────────────

  describe('listCampanas', () => {
    const concesionarioId = 42;

    it('debe llamar a GET /campanas/:id y devolver el array de campañas', async () => {
      const mockCampanas: LeadcarsListCampanasResponse = [
        { id: 100, nombre: 'Campaña Verano', activo: true },
        { id: 101, nombre: 'Campaña Otoño', activo: false },
      ];

      httpService.get.mockReturnValue(of(mockAxiosResponse(mockCampanas)));

      const result = await service.listCampanas(concesionarioId, config);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(2);
      expect(httpService.get).toHaveBeenCalledWith(
        `https://apisandbox.leadcars.es/api/v2/campanas/${concesionarioId}`,
        expect.any(Object),
      );
    });

    it('debe retornar error sin llamar a la API si concesionarioId es 0', async () => {
      const result = await service.listCampanas(0, config);

      expect(result.isErr()).toBe(true);
      expect(httpService.get).not.toHaveBeenCalled();
      if (result.isErr()) {
        expect(result.error.message).toContain('concesionarioId inválido');
      }
    });

    it('debe retornar error sin llamar a la API si concesionarioId es negativo', async () => {
      const result = await service.listCampanas(-5, config);

      expect(result.isErr()).toBe(true);
      expect(httpService.get).not.toHaveBeenCalled();
    });

    it('debe normalizar respuesta con wrapper { success, data }', async () => {
      const mockCampanas: LeadcarsListCampanasResponse = {
        success: true,
        data: [{ id: 200, nombre: 'Campaña Invierno', activo: true }],
      };

      httpService.get.mockReturnValue(of(mockAxiosResponse(mockCampanas)));

      const result = await service.listCampanas(concesionarioId, config);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toHaveLength(1);
    });
  });
});
