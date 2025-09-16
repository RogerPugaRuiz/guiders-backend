// Prueba unitaria para VisitorIntent aggregate
// Ubicación: src/context/tracking/domain/__tests__/visitor-intent.spec.ts
import { VisitorIntent, VisitorIntentProperties } from '../visitor-intent.aggregate';
import { Uuid } from '../../../shared/domain/value-objects/uuid';
import { VisitorId } from '../value-objects/visitor-id';
import { IntentType } from '../value-objects/intent-type';
import { IntentConfidence } from '../value-objects/intent-confidence';
import { IntentTag } from '../value-objects/intent-tag';
import { IntentPriceRange } from '../value-objects/intent-price-range';
import { NavigationPath } from '../value-objects/navigation-path';
import { IntentDetectedEvent } from '../events/intent-detected-event';

describe('VisitorIntent', () => {
  let validId: Uuid;
  let validVisitorId: VisitorId;
  let validIntentType: IntentType;
  let validConfidence: IntentConfidence;
  let validDetectedAt: Date;

  beforeEach(() => {
    validId = Uuid.random();
    validVisitorId = VisitorId.create(Uuid.generate());
    validIntentType = new IntentType(IntentType.PURCHASE);
    validConfidence = new IntentConfidence(IntentConfidence.HIGH);
    validDetectedAt = new Date('2023-01-01T12:00:00.000Z');
  });

  describe('create', () => {
    it('debe crear visitor intent con propiedades básicas', () => {
      const props: VisitorIntentProperties = {
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
      };

      const visitorIntent = VisitorIntent.create(props);

      expect(visitorIntent.id).toBe(validId);
      expect(visitorIntent.visitorId).toBe(validVisitorId);
      expect(visitorIntent.type).toBe(validIntentType);
      expect(visitorIntent.confidence).toBe(validConfidence);
      expect(visitorIntent.detectedAt).toBe(validDetectedAt);
      expect(visitorIntent.tags).toBeUndefined();
      expect(visitorIntent.priceRange).toBeUndefined();
      expect(visitorIntent.navigationPath).toBeUndefined();
      expect(visitorIntent.description).toBeUndefined();
    });

    it('debe crear visitor intent con todas las propiedades opcionales', () => {
      const tags = [new IntentTag('electronics'), new IntentTag('mobile')];
      const priceRange = new IntentPriceRange({ min: 100, max: 500 });
      const navigationPath = NavigationPath.fromPrimitives([
        '/home',
        '/products',
        '/mobile',
      ]);
      const description = 'Usuario interesado en comprar un móvil';

      const props: VisitorIntentProperties = {
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
        tags,
        priceRange,
        navigationPath,
        description,
      };

      const visitorIntent = VisitorIntent.create(props);

      expect(visitorIntent.tags).toBe(tags);
      expect(visitorIntent.priceRange).toBe(priceRange);
      expect(visitorIntent.navigationPath).toBe(navigationPath);
      expect(visitorIntent.description).toBe(description);
    });

    it('debe aplicar evento IntentDetectedEvent al crear', () => {
      const props: VisitorIntentProperties = {
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
      };

      const visitorIntent = VisitorIntent.create(props);

      const events = visitorIntent.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(IntentDetectedEvent);

      const event = events[0] as IntentDetectedEvent;
      expect(event.attributes.intent).toEqual(visitorIntent.toPrimitives());
    });

    it('debe crear con tags vacíos', () => {
      const props: VisitorIntentProperties = {
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
        tags: [],
      };

      const visitorIntent = VisitorIntent.create(props);
      expect(visitorIntent.tags).toEqual([]);
    });

    it('debe crear con descripción vacía', () => {
      const props: VisitorIntentProperties = {
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
        description: '',
      };

      const visitorIntent = VisitorIntent.create(props);
      expect(visitorIntent.description).toBe('');
    });
  });

  describe('fromPrimitives', () => {
    it('debe reconstruir visitor intent desde datos primitivos básicos', () => {
      const primitives = {
        id: validId.getValue(),
        visitorId: validVisitorId.value,
        type: 'PURCHASE',
        confidence: 'HIGH',
        detectedAt: '2023-01-01T12:00:00.000Z',
      };

      const visitorIntent = VisitorIntent.fromPrimitives(primitives);

      expect(visitorIntent.id.getValue()).toBe(primitives.id);
      expect(visitorIntent.visitorId.value).toBe(primitives.visitorId);
      expect(visitorIntent.type.value).toBe(primitives.type);
      expect(visitorIntent.confidence.value).toBe(primitives.confidence);
      expect(visitorIntent.detectedAt).toEqual(new Date(primitives.detectedAt));
    });

    it('debe reconstruir visitor intent con todas las propiedades', () => {
      const primitives = {
        id: validId.getValue(),
        visitorId: validVisitorId.value,
        type: 'PURCHASE',
        confidence: 'HIGH',
        detectedAt: '2023-01-01T12:00:00.000Z',
        tags: ['electronics', 'mobile'],
        priceRange: { min: 100, max: 500 },
        navigationPath: ['/home', '/products', '/mobile'],
        description: 'Usuario interesado en comprar un móvil',
      };

      const visitorIntent = VisitorIntent.fromPrimitives(primitives);

      expect(visitorIntent.tags).toHaveLength(2);
      expect(visitorIntent.tags![0].value).toBe('electronics');
      expect(visitorIntent.tags![1].value).toBe('mobile');
      expect(visitorIntent.priceRange!.value).toEqual({ min: 100, max: 500 });
      expect(visitorIntent.navigationPath!.toPrimitives()).toEqual([
        '/home',
        '/products',
        '/mobile',
      ]);
      expect(visitorIntent.description).toBe(
        'Usuario interesado en comprar un móvil',
      );
    });

    it('debe reconstruir con tags undefined', () => {
      const primitives = {
        id: validId.getValue(),
        visitorId: validVisitorId.value,
        type: 'RESEARCH',
        confidence: 'MEDIUM',
        detectedAt: '2023-01-01T12:00:00.000Z',
        tags: undefined,
      };

      const visitorIntent = VisitorIntent.fromPrimitives(primitives);
      expect(visitorIntent.tags).toBeUndefined();
    });

    it('debe reconstruir con priceRange undefined', () => {
      const primitives = {
        id: validId.getValue(),
        visitorId: validVisitorId.value,
        type: 'RESEARCH',
        confidence: 'MEDIUM',
        detectedAt: '2023-01-01T12:00:00.000Z',
        priceRange: undefined,
      };

      const visitorIntent = VisitorIntent.fromPrimitives(primitives);
      expect(visitorIntent.priceRange).toBeUndefined();
    });

    it('debe reconstruir con navigationPath undefined', () => {
      const primitives = {
        id: validId.getValue(),
        visitorId: validVisitorId.value,
        type: 'RESEARCH',
        confidence: 'MEDIUM',
        detectedAt: '2023-01-01T12:00:00.000Z',
        navigationPath: undefined,
      };

      const visitorIntent = VisitorIntent.fromPrimitives(primitives);
      expect(visitorIntent.navigationPath).toBeUndefined();
    });
  });

  describe('toPrimitives', () => {
    it('debe convertir visitor intent básico a primitivos', () => {
      const visitorIntent = VisitorIntent.create({
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
      });

      const primitives = visitorIntent.toPrimitives();

      expect(primitives).toEqual({
        id: validId.value,
        visitorId: validVisitorId.value,
        type: validIntentType.value,
        confidence: validConfidence.value,
        detectedAt: validDetectedAt.toISOString(),
        tags: undefined,
        priceRange: undefined,
        navigationPath: undefined,
        description: undefined,
      });
    });

    it('debe convertir visitor intent completo a primitivos', () => {
      const tags = [new IntentTag('electronics'), new IntentTag('mobile')];
      const priceRange = new IntentPriceRange({ min: 100, max: 500 });
      const navigationPath = NavigationPath.fromPrimitives([
        '/home',
        '/products',
      ]);
      const description = 'Test description';

      const visitorIntent = VisitorIntent.create({
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
        tags,
        priceRange,
        navigationPath,
        description,
      });

      const primitives = visitorIntent.toPrimitives();

      expect(primitives.tags).toEqual(['electronics', 'mobile']);
      expect(primitives.priceRange).toEqual({ min: 100, max: 500 });
      expect(primitives.navigationPath).toEqual(['/home', '/products']);
      expect(primitives.description).toBe('Test description');
    });

    it('debe ser serializable a JSON', () => {
      const visitorIntent = VisitorIntent.create({
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
      });

      const primitives = visitorIntent.toPrimitives();
      const jsonString = JSON.stringify(primitives);
      const parsed = JSON.parse(jsonString);

      expect(parsed.id).toBe(validId.value);
      expect(parsed.type).toBe(validIntentType.value);
      expect(parsed.confidence).toBe(validConfidence.value);
    });
  });

  describe('getters', () => {
    it('debe exponer todas las propiedades de solo lectura', () => {
      const tags = [new IntentTag('test')];
      const priceRange = new IntentPriceRange({ min: 50, max: 200 });
      const navigationPath = NavigationPath.fromPrimitives(['/test']);
      const description = 'Test intent description';

      const visitorIntent = VisitorIntent.create({
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
        tags,
        priceRange,
        navigationPath,
        description,
      });

      expect(visitorIntent.id).toBe(validId);
      expect(visitorIntent.visitorId).toBe(validVisitorId);
      expect(visitorIntent.type).toBe(validIntentType);
      expect(visitorIntent.confidence).toBe(validConfidence);
      expect(visitorIntent.detectedAt).toBe(validDetectedAt);
      expect(visitorIntent.tags).toBe(tags);
      expect(visitorIntent.priceRange).toBe(priceRange);
      expect(visitorIntent.navigationPath).toBe(navigationPath);
      expect(visitorIntent.description).toBe(description);
    });

    it('debe exponer propiedades opcionales como undefined cuando no están establecidas', () => {
      const visitorIntent = VisitorIntent.create({
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
      });

      expect(visitorIntent.tags).toBeUndefined();
      expect(visitorIntent.priceRange).toBeUndefined();
      expect(visitorIntent.navigationPath).toBeUndefined();
      expect(visitorIntent.description).toBeUndefined();
    });
  });

  describe('event handling', () => {
    it('debe poder confirmar eventos aplicados', () => {
      const visitorIntent = VisitorIntent.create({
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
      });

      expect(visitorIntent.getUncommittedEvents()).toHaveLength(1);

      visitorIntent.commit();

      expect(visitorIntent.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('round trip (create -> toPrimitives -> fromPrimitives)', () => {
    it('debe mantener consistencia en conversión completa', () => {
      const originalProps: VisitorIntentProperties = {
        id: validId,
        visitorId: validVisitorId,
        type: validIntentType,
        confidence: validConfidence,
        detectedAt: validDetectedAt,
        tags: [new IntentTag('electronics')],
        priceRange: new IntentPriceRange({ min: 100, max: 300 }),
        navigationPath: NavigationPath.fromPrimitives(['/home', '/products']),
        description: 'Test round trip',
      };

      const original = VisitorIntent.create(originalProps);
      const primitives = original.toPrimitives();
      const reconstructed = VisitorIntent.fromPrimitives(primitives);

      expect(reconstructed.id.getValue()).toBe(original.id.getValue());
      expect(reconstructed.visitorId.value).toBe(original.visitorId.value);
      expect(reconstructed.type.value).toBe(original.type.value);
      expect(reconstructed.confidence.value).toBe(original.confidence.value);
      expect(reconstructed.detectedAt).toEqual(original.detectedAt);
      expect(reconstructed.tags![0].value).toBe(original.tags![0].value);
      expect(reconstructed.priceRange!.value).toEqual(
        original.priceRange!.value,
      );
      expect(reconstructed.navigationPath!.toPrimitives()).toEqual(
        original.navigationPath!.toPrimitives(),
      );
      expect(reconstructed.description).toBe(original.description);
    });
  });
});
