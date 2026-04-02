import { LeadcarsCrmSyncAdapter } from '../leadcars-crm-sync.adapter';
import { LeadcarsApiService } from '../leadcars-api.service';
import { ok } from 'src/context/shared/domain/result';
import {
  CrmCompanyConfigPrimitives,
  LeadContactDataPrimitives,
} from '../../../../domain/services/crm-sync.service';

describe('LeadcarsCrmSyncAdapter', () => {
  let adapter: LeadcarsCrmSyncAdapter;
  let apiService: jest.Mocked<LeadcarsApiService>;

  const baseContactData: LeadContactDataPrimitives = {
    id: 'lead-contact-1',
    visitorId: 'visitor-123',
    companyId: 'company-456',
    nombre: 'Juan',
    email: 'juan@example.com',
    telefono: '+34600111222',
    extractedAt: new Date('2026-04-02T10:00:00Z'),
  };

  const baseConfig: CrmCompanyConfigPrimitives = {
    id: 'crm-config-1',
    companyId: 'company-456',
    crmType: 'leadcars',
    enabled: true,
    syncChatConversations: true,
    triggerEvents: ['lifecycle_to_lead'],
    config: {
      clienteToken: 'test-token-12345678901',
      useSandbox: true,
      concesionarioId: 7,
      sedeId: 3,
      campanaCode: 'CAMP-01',
      tipoLeadDefault: 5,
    },
    createdAt: new Date('2026-04-02T10:00:00Z'),
    updatedAt: new Date('2026-04-02T10:00:00Z'),
  };

  beforeEach(() => {
    apiService = {
      createLead: jest.fn().mockResolvedValue(
        ok({
          success: true,
          data: {
            id: 999,
            referencia: 'REF-999',
            nombre: 'Juan',
            estado: 'Nuevo',
            created_at: '2026-04-02T10:00:00Z',
            updated_at: '2026-04-02T10:00:00Z',
          },
        }),
      ),
      addChatConversation: jest.fn(),
      addComment: jest.fn(),
      listConcesionarios: jest.fn(),
      listSedes: jest.fn(),
      listCampanas: jest.fn(),
      listTipos: jest.fn(),
      listStates: jest.fn(),
      editLead: jest.fn(),
      testConnection: jest.fn(),
    } as any;

    adapter = new LeadcarsCrmSyncAdapter(apiService);
  });

  describe('syncLead', () => {
    it('debe enviar guiders_visitor_id y guiders_company_id dentro de custom', async () => {
      await adapter.syncLead(baseContactData, baseConfig);

      const request = apiService.createLead.mock.calls[0][0];

      expect(request.custom).toEqual(
        expect.objectContaining({
          guiders_visitor_id: 'visitor-123',
          guiders_company_id: 'company-456',
        }),
      );
      expect(
        Object.prototype.hasOwnProperty.call(request, 'guiders_visitor_id'),
      ).toBe(false);
      expect(
        Object.prototype.hasOwnProperty.call(request, 'guiders_company_id'),
      ).toBe(false);
    });

    it('debe mover additionalData permitido dentro de custom', async () => {
      await adapter.syncLead(
        {
          ...baseContactData,
          additionalData: {
            modelo_interes: 'Cupra Formentor',
            origen_formulario: 'widget',
          },
        },
        baseConfig,
      );

      const request = apiService.createLead.mock.calls[0][0];

      expect(request.custom).toEqual(
        expect.objectContaining({
          modelo_interes: 'Cupra Formentor',
          origen_formulario: 'widget',
        }),
      );
      expect(
        Object.prototype.hasOwnProperty.call(request, 'modelo_interes'),
      ).toBe(false);
      expect(
        Object.prototype.hasOwnProperty.call(request, 'origen_formulario'),
      ).toBe(false);
    });

    it('debe ignorar keys protegidas de additionalData para no sobrescribir campos conocidos', async () => {
      await adapter.syncLead(
        {
          ...baseContactData,
          additionalData: {
            nombre: 'Nombre malicioso',
            campana: 'OVERRIDE',
            custom_field_ok: 'valor-seguro',
          },
        },
        baseConfig,
      );

      const request = apiService.createLead.mock.calls[0][0];

      expect(request.nombre).toBe('Juan');
      expect(request.campana).toBe('CAMP-01');
      expect(request.custom).toEqual(
        expect.objectContaining({
          custom_field_ok: 'valor-seguro',
        }),
      );
      expect(request.custom).not.toEqual(
        expect.objectContaining({
          nombre: 'Nombre malicioso',
          campana: 'OVERRIDE',
        }),
      );
    });
  });
});
