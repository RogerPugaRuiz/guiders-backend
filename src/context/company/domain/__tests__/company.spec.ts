// Prueba unitaria para Company aggregate
// Ubicación: src/context/company/domain/__tests__/company.spec.ts
import { Company } from '../company';
import { CompanyName } from '../value-objects/company-name';
import { CompanyDomains } from '../value-objects/company-domains';
import { CompanyCreatedEvent } from '../events/company-created.event';
import { Uuid } from '../../../shared/domain/value-objects/uuid';

describe('Company', () => {
  let validId: Uuid;
  let validName: CompanyName;
  let validDomains: CompanyDomains;
  let validCreatedAt: Date;
  let validUpdatedAt: Date;

  beforeEach(() => {
    validId = Uuid.random();
    validName = new CompanyName('Empresa Test');
    validDomains = new CompanyDomains(['example.com', 'test.org']);
    validCreatedAt = new Date('2023-01-01T00:00:00.000Z');
    validUpdatedAt = new Date('2023-01-01T00:00:00.000Z');
  });

  describe('create', () => {
    it('debe crear empresa con parámetros válidos', () => {
      const company = Company.create({
        id: validId,
        companyName: validName,
        domains: validDomains,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      expect(company.getId()).toBe(validId);
      expect(company.getCompanyName()).toBe(validName);
      expect(company.getDomains()).toBe(validDomains);
      expect(company.getCreatedAt()).toBe(validCreatedAt);
      expect(company.getUpdatedAt()).toBe(validUpdatedAt);
    });

    it('debe aplicar evento CompanyCreatedEvent al crear', () => {
      const company = Company.create({
        id: validId,
        companyName: validName,
        domains: validDomains,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      const events = company.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(CompanyCreatedEvent);

      const event = events[0] as CompanyCreatedEvent;
      expect(event.attributes.id).toBe(validId.getValue());
      expect(event.attributes.companyName).toBe(validName.getValue());
      expect(event.attributes.domains).toEqual(validDomains.toPrimitives());
      expect(event.attributes.createdAt).toBe(validCreatedAt.toISOString());
      expect(event.attributes.updatedAt).toBe(validUpdatedAt.toISOString());
    });
  });

  describe('fromPrimitives', () => {
    it('debe reconstruir empresa desde datos primitivos', () => {
      const primitives = {
        id: validId.getValue(),
        companyName: 'Empresa Test',
        domains: ['example.com', 'test.org'],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const company = Company.fromPrimitives(primitives);

      expect(company.getId().getValue()).toBe(primitives.id);
      expect(company.getCompanyName().getValue()).toBe(primitives.companyName);
      expect(company.getDomains().toPrimitives()).toEqual(primitives.domains);
      expect(company.getCreatedAt()).toEqual(new Date(primitives.createdAt));
      expect(company.getUpdatedAt()).toEqual(new Date(primitives.updatedAt));
    });

    it('debe reconstruir con un solo dominio', () => {
      const primitives = {
        id: validId.getValue(),
        companyName: 'Empresa Test',
        domains: ['example.com'],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const company = Company.fromPrimitives(primitives);
      expect(company.getDomains().toPrimitives()).toEqual(['example.com']);
    });

    it('debe reconstruir con localhost como dominio', () => {
      const primitives = {
        id: validId.getValue(),
        companyName: 'Empresa Test',
        domains: ['localhost'],
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const company = Company.fromPrimitives(primitives);
      expect(company.getDomains().toPrimitives()).toEqual(['localhost']);
    });
  });

  describe('toPrimitives', () => {
    it('debe convertir empresa a objeto primitivo', () => {
      const company = Company.create({
        id: validId,
        companyName: validName,
        domains: validDomains,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      const primitives = company.toPrimitives();

      expect(primitives).toEqual({
        id: validId.getValue(),
        companyName: validName.getValue(),
        domains: validDomains.toPrimitives(),
        createdAt: validCreatedAt.toISOString(),
        updatedAt: validUpdatedAt.toISOString(),
      });
    });

    it('debe ser serializable a JSON', () => {
      const company = Company.create({
        id: validId,
        companyName: validName,
        domains: validDomains,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      const primitives = company.toPrimitives();
      const jsonString = JSON.stringify(primitives);
      const parsed = JSON.parse(jsonString);

      expect(parsed.id).toBe(validId.getValue());
      expect(parsed.companyName).toBe(validName.getValue());
      expect(parsed.domains).toEqual(validDomains.toPrimitives());
    });
  });

  describe('getters', () => {
    it('debe exponer id de solo lectura', () => {
      const company = Company.create({
        id: validId,
        companyName: validName,
        domains: validDomains,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      expect(company.getId()).toBe(validId);
      expect(company.getId()).toBeInstanceOf(Uuid);
    });

    it('debe exponer nombre de empresa de solo lectura', () => {
      const company = Company.create({
        id: validId,
        companyName: validName,
        domains: validDomains,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      expect(company.getCompanyName()).toBe(validName);
      expect(company.getCompanyName()).toBeInstanceOf(CompanyName);
    });

    it('debe exponer dominios de solo lectura', () => {
      const company = Company.create({
        id: validId,
        companyName: validName,
        domains: validDomains,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      expect(company.getDomains()).toBe(validDomains);
      expect(company.getDomains()).toBeInstanceOf(CompanyDomains);
    });

    it('debe exponer fecha de creación de solo lectura', () => {
      const company = Company.create({
        id: validId,
        companyName: validName,
        domains: validDomains,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      expect(company.getCreatedAt()).toBe(validCreatedAt);
      expect(company.getCreatedAt()).toBeInstanceOf(Date);
    });

    it('debe exponer fecha de actualización de solo lectura', () => {
      const company = Company.create({
        id: validId,
        companyName: validName,
        domains: validDomains,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      expect(company.getUpdatedAt()).toBe(validUpdatedAt);
      expect(company.getUpdatedAt()).toBeInstanceOf(Date);
    });
  });

  describe('event handling', () => {
    it('debe poder confirmar eventos aplicados', () => {
      const company = Company.create({
        id: validId,
        companyName: validName,
        domains: validDomains,
        createdAt: validCreatedAt,
        updatedAt: validUpdatedAt,
      });

      expect(company.getUncommittedEvents()).toHaveLength(1);

      company.commit();

      expect(company.getUncommittedEvents()).toHaveLength(0);
    });
  });
});
