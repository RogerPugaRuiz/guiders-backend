/**
 * Tests unitarios para WebContentFetcherService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { WebContentFetcherService } from '../infrastructure/services/web-content-fetcher.service';
import {
  LlmToolExecutionError,
  LlmToolTimeoutError,
} from '../domain/errors/llm.error';

describe('WebContentFetcherService', () => {
  let service: WebContentFetcherService;
  let mockHttpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      head: jest.fn(),
      request: jest.fn(),
      axiosRef: {} as any,
    } as unknown as jest.Mocked<HttpService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebContentFetcherService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<WebContentFetcherService>(WebContentFetcherService);
  });

  describe('fetchContent', () => {
    it('debería obtener contenido exitosamente', async () => {
      const mockContent = '# Productos\n\nNuestros productos de calidad...';
      mockHttpService.get.mockReturnValue(
        of({
          data: mockContent,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      const result = await service.fetchContent(
        'https://example.com/productos',
      );

      expect(result.isOk()).toBe(true);
      const content = result.unwrap();
      expect(content.content).toBe(mockContent);
      expect(content.sourceUrl).toBe('https://example.com/productos');
      expect(content.truncated).toBe(false);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('r.jina.ai'),
        expect.any(Object),
      );
    });

    it('debería truncar contenido largo', async () => {
      // Crear contenido largo que supere el límite
      const longContent = 'A'.repeat(40000);
      mockHttpService.get.mockReturnValue(
        of({
          data: longContent,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      const result = await service.fetchContent('https://example.com/page', {
        maxChars: 1000,
      });

      expect(result.isOk()).toBe(true);
      const content = result.unwrap();
      expect(content.truncated).toBe(true);
      expect(content.content.length).toBeLessThanOrEqual(1100); // Con el mensaje de truncado
      expect(content.originalSize).toBe(40000);
    });

    it('debería retornar error para URL inválida', async () => {
      const result = await service.fetchContent('invalid-url');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LlmToolExecutionError);
      }
    });

    it('debería retornar error para protocolo no HTTP', async () => {
      const result = await service.fetchContent('ftp://example.com/file');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LlmToolExecutionError);
      }
    });

    it('debería manejar timeout correctamente', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('ETIMEDOUT')),
      );

      const result = await service.fetchContent(
        'https://example.com/slow-page',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LlmToolTimeoutError);
      }
    });

    it('debería manejar errores de red', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      const result = await service.fetchContent(
        'https://example.com/error-page',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(LlmToolExecutionError);
        expect(result.error.message).toContain('Network error');
      }
    });

    it('debería enviar headers correctos a Jina Reader', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: '# Content',
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as any,
        }),
      );

      await service.fetchContent('https://example.com/page');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'text/markdown',
            'User-Agent': expect.stringContaining('Guiders'),
          }),
        }),
      );
    });
  });

  describe('buildFullUrl', () => {
    it('debería construir URL con path relativo', () => {
      const url = service.buildFullUrl('example.com', '/productos');
      expect(url).toBe('https://example.com/productos');
    });

    it('debería agregar https si no tiene protocolo', () => {
      const url = service.buildFullUrl('example.com', '/page');
      expect(url).toContain('https://');
    });

    it('debería mantener https si ya tiene protocolo', () => {
      const url = service.buildFullUrl('https://example.com', '/page');
      expect(url).toBe('https://example.com/page');
    });

    it('debería normalizar path sin barra inicial', () => {
      const url = service.buildFullUrl('example.com', 'productos');
      expect(url).toBe('https://example.com/productos');
    });
  });

  describe('isPathSafe', () => {
    it('debería retornar true para paths seguros', () => {
      expect(service.isPathSafe('/productos')).toBe(true);
      expect(service.isPathSafe('/servicios/categoria')).toBe(true);
      expect(service.isPathSafe('/about-us')).toBe(true);
      expect(service.isPathSafe('/')).toBe(true);
    });

    it('debería retornar false para path traversal', () => {
      expect(service.isPathSafe('../etc/passwd')).toBe(false);
      expect(service.isPathSafe('/productos/../admin')).toBe(false);
      expect(service.isPathSafe('/../../../root')).toBe(false);
    });

    it('debería retornar false para protocolos en path', () => {
      expect(service.isPathSafe('http://malicious.com')).toBe(false);
      expect(service.isPathSafe('https://attacker.com')).toBe(false);
      expect(service.isPathSafe('javascript://alert(1)')).toBe(false);
    });

    it('debería retornar false para caracteres peligrosos', () => {
      expect(service.isPathSafe('/page<script>')).toBe(false);
      expect(service.isPathSafe('/page"onclick')).toBe(false);
      expect(service.isPathSafe("/page'alert")).toBe(false);
      expect(service.isPathSafe('/page\n\r')).toBe(false);
    });
  });

  describe('isUrlAllowed', () => {
    const allowedDomains = [
      'example.com',
      'www.example.com',
      'shop.example.com',
    ];

    it('debería permitir URLs del dominio exacto', () => {
      expect(
        service.isUrlAllowed('https://example.com/page', allowedDomains),
      ).toBe(true);
    });

    it('debería permitir URLs con www', () => {
      expect(
        service.isUrlAllowed('https://www.example.com/page', allowedDomains),
      ).toBe(true);
    });

    it('debería permitir subdominios permitidos', () => {
      expect(
        service.isUrlAllowed(
          'https://shop.example.com/products',
          allowedDomains,
        ),
      ).toBe(true);
    });

    it('debería rechazar dominios no permitidos', () => {
      expect(
        service.isUrlAllowed('https://malicious.com/page', allowedDomains),
      ).toBe(false);
    });

    it('debería rechazar subdominios no permitidos', () => {
      expect(
        service.isUrlAllowed('https://admin.example.com/page', allowedDomains),
      ).toBe(false);
    });

    it('debería ser case-insensitive', () => {
      expect(
        service.isUrlAllowed('https://EXAMPLE.COM/page', allowedDomains),
      ).toBe(true);
    });

    it('debería retornar false para URLs inválidas', () => {
      expect(service.isUrlAllowed('not-a-valid-url', allowedDomains)).toBe(
        false,
      );
    });

    it('debería normalizar www en la comparación', () => {
      // Si el dominio permitido no tiene www pero la URL sí
      const domains = ['example.com'];
      expect(
        service.isUrlAllowed('https://www.example.com/page', domains),
      ).toBe(true);
    });
  });
});
