/**
 * Servicio para obtener contenido web usando Jina Reader API
 * Convierte páginas web a Markdown limpio para el LLM
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Result, ok, err } from 'src/context/shared/domain/result';
import { DomainError } from 'src/context/shared/domain/domain.error';
import {
  LlmToolExecutionError,
  LlmToolTimeoutError,
} from '../../domain/errors/llm.error';

/**
 * Resultado de fetch de contenido web
 */
export interface WebContentResult {
  /** Contenido en Markdown */
  content: string;
  /** URL original */
  sourceUrl: string;
  /** Tiempo de fetch en ms */
  fetchTimeMs: number;
  /** Tamaño original del contenido */
  originalSize: number;
  /** Si el contenido fue truncado */
  truncated: boolean;
}

/**
 * Opciones para el fetch de contenido
 */
export interface FetchOptions {
  /** Timeout en ms */
  timeoutMs?: number;
  /** Máximo de caracteres a devolver */
  maxChars?: number;
}

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_CHARS = 32000; // ~8000 tokens aproximadamente
const JINA_READER_BASE_URL = 'https://r.jina.ai';

/** Hostnames considerados locales (bypass de Jina Reader) */
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0'];

@Injectable()
export class WebContentFetcherService {
  private readonly logger = new Logger(WebContentFetcherService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Obtiene el contenido de una URL y lo convierte a Markdown
   * @param url URL completa a obtener
   * @param options Opciones de fetch
   * @returns Contenido en Markdown o error
   */
  async fetchContent(
    url: string,
    options: FetchOptions = {},
  ): Promise<Result<WebContentResult, DomainError>> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
    const startTime = Date.now();

    try {
      // Validar URL
      const validatedUrl = this.validateAndNormalizeUrl(url);
      if (!validatedUrl) {
        return err(
          new LlmToolExecutionError(
            'fetch_page_content',
            `URL inválida: ${url}`,
          ),
        );
      }

      // Detectar si es URL local (bypass Jina Reader)
      const isLocal = this.isLocalUrl(validatedUrl);

      let responseContent: string;

      if (isLocal) {
        // Fetch directo para URLs locales (Jina no puede acceder a localhost)
        this.logger.debug(
          `Fetching content from LOCAL URL: ${validatedUrl} (direct fetch, bypassing Jina)`,
        );

        const directResponse = await firstValueFrom(
          this.httpService.get<string>(validatedUrl, {
            timeout: timeoutMs,
            headers: {
              Accept: 'text/html,application/xhtml+xml,text/plain',
              'User-Agent': 'Guiders-LLM-Bot/1.0',
            },
            responseType: 'text',
          }),
        );

        // Convertir HTML a texto plano para el LLM
        responseContent = this.htmlToText(directResponse.data);
      } else {
        // Construir URL de Jina Reader para URLs remotas
        const jinaUrl = `${JINA_READER_BASE_URL}/${encodeURIComponent(validatedUrl)}`;

        this.logger.debug(
          `Fetching content from: ${validatedUrl} via Jina Reader`,
        );

        // Hacer request a Jina Reader
        const response = await firstValueFrom(
          this.httpService.get<string>(jinaUrl, {
            timeout: timeoutMs,
            headers: {
              Accept: 'text/markdown',
              'User-Agent': 'Guiders-LLM-Bot/1.0',
            },
            responseType: 'text',
          }),
        );

        responseContent = response.data;
      }

      const fetchTimeMs = Date.now() - startTime;
      const originalContent = responseContent;
      const originalSize = originalContent.length;

      // Truncar si es necesario
      let content = originalContent;
      let truncated = false;

      if (content.length > maxChars) {
        content = this.truncateContent(content, maxChars);
        truncated = true;
        this.logger.debug(
          `Content truncated from ${originalSize} to ${content.length} chars`,
        );
      }

      this.logger.debug(
        `Fetched ${originalSize} chars in ${fetchTimeMs}ms from ${validatedUrl}`,
      );

      return ok({
        content,
        sourceUrl: validatedUrl,
        fetchTimeMs,
        originalSize,
        truncated,
      });
    } catch (error) {
      const fetchTimeMs = Date.now() - startTime;

      // Detectar timeout
      if (this.isTimeoutError(error)) {
        this.logger.warn(`Timeout fetching ${url} after ${fetchTimeMs}ms`);
        return err(new LlmToolTimeoutError('fetch_page_content', timeoutMs));
      }

      // Otros errores
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error fetching ${url}: ${errorMessage}`);

      return err(
        new LlmToolExecutionError(
          'fetch_page_content',
          `Error al obtener contenido de ${url}: ${errorMessage}`,
        ),
      );
    }
  }

  /**
   * Construye una URL completa a partir de un dominio base y un path
   * @param baseDomain Dominio base (ej: www.ejemplo.com)
   * @param path Path relativo (ej: /productos)
   * @returns URL completa
   */
  buildFullUrl(baseDomain: string, path: string): string {
    // Asegurar que el dominio tenga protocolo
    const domain = baseDomain.startsWith('http')
      ? baseDomain
      : `https://${baseDomain}`;

    // Normalizar path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Construir URL
    const url = new URL(normalizedPath, domain);
    return url.toString();
  }

  /**
   * Valida que un path no contenga path traversal u otros problemas
   * @param path Path a validar
   * @returns true si es válido
   */
  isPathSafe(path: string): boolean {
    // No permitir path traversal
    if (path.includes('..')) {
      return false;
    }

    // No permitir protocolos en el path
    if (path.includes('://')) {
      return false;
    }

    // No permitir caracteres peligrosos
    const dangerousChars = ['<', '>', '"', "'", '\\', '\n', '\r'];
    if (dangerousChars.some((char) => path.includes(char))) {
      return false;
    }

    return true;
  }

  /**
   * Valida que una URL sea del dominio esperado
   * @param url URL a validar
   * @param allowedDomains Lista de dominios permitidos (puede ser hostname o URL completa)
   * @returns true si la URL pertenece a un dominio permitido
   */
  isUrlAllowed(url: string, allowedDomains: string[]): boolean {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      const port = parsedUrl.port;

      return allowedDomains.some((domain) => {
        // Extraer hostname del dominio permitido (puede ser URL completa o solo hostname)
        let allowedHostname: string;
        let allowedPort: string = '';

        if (domain.startsWith('http://') || domain.startsWith('https://')) {
          // Es una URL completa, parsearla
          try {
            const parsedDomain = new URL(domain);
            allowedHostname = parsedDomain.hostname.toLowerCase();
            allowedPort = parsedDomain.port;
          } catch {
            // Si no se puede parsear, usar como hostname directo
            allowedHostname = domain.toLowerCase();
          }
        } else {
          // Es un hostname simple
          allowedHostname = domain.toLowerCase();
        }

        const normalizedDomain = allowedHostname.replace(/^www\./, '');
        const normalizedHostname = hostname.replace(/^www\./, '');

        // Comparar hostname y puerto (si se especificó puerto en el dominio permitido)
        const hostnameMatch = normalizedHostname === normalizedDomain;
        const portMatch = !allowedPort || port === allowedPort;

        return hostnameMatch && portMatch;
      });
    } catch {
      return false;
    }
  }

  /**
   * Valida y normaliza una URL
   */
  private validateAndNormalizeUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url);

      // Solo permitir HTTP/HTTPS
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return null;
      }

      return parsedUrl.toString();
    } catch {
      return null;
    }
  }

  /**
   * Trunca el contenido de manera inteligente
   * Intenta cortar en un punto natural (párrafo, línea)
   */
  private truncateContent(content: string, maxChars: number): string {
    if (content.length <= maxChars) {
      return content;
    }

    // Intentar cortar en un párrafo
    const cutPoint = content.lastIndexOf('\n\n', maxChars);
    if (cutPoint > maxChars * 0.7) {
      return content.substring(0, cutPoint) + '\n\n[Contenido truncado...]';
    }

    // Intentar cortar en una línea
    const lineBreak = content.lastIndexOf('\n', maxChars);
    if (lineBreak > maxChars * 0.8) {
      return content.substring(0, lineBreak) + '\n\n[Contenido truncado...]';
    }

    // Cortar en el límite
    return content.substring(0, maxChars) + '\n\n[Contenido truncado...]';
  }

  /**
   * Detecta si un error es de timeout
   */
  private isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNABORTED')
      );
    }
    return false;
  }

  /**
   * Detecta si una URL apunta a un servidor local
   * @param url URL a verificar
   * @returns true si es una URL local (localhost, 127.0.0.1, etc.)
   */
  private isLocalUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      return LOCAL_HOSTNAMES.includes(hostname);
    } catch {
      return false;
    }
  }

  /**
   * Convierte HTML a texto plano para el LLM
   * Extrae el contenido relevante eliminando scripts, estilos y tags HTML
   * @param html Contenido HTML
   * @returns Texto plano con el contenido de la página
   */
  private htmlToText(html: string): string {
    let text = html;

    // Eliminar scripts y estilos
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

    // Eliminar comentarios HTML
    text = text.replace(/<!--[\s\S]*?-->/g, '');

    // Convertir algunos tags a formato legible
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/h[1-6]>/gi, '\n\n');
    text = text.replace(/<li[^>]*>/gi, '• ');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<\/tr>/gi, '\n');
    text = text.replace(/<td[^>]*>/gi, ' | ');
    text = text.replace(/<th[^>]*>/gi, ' | ');

    // Extraer atributos alt de imágenes
    text = text.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, '[Imagen: $1]');
    text = text.replace(/<img[^>]*>/gi, '');

    // Extraer texto de enlaces
    text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)');

    // Eliminar todos los demás tags HTML
    text = text.replace(/<[^>]+>/g, '');

    // Decodificar entidades HTML comunes
    text = text.replace(/&nbsp;/gi, ' ');
    text = text.replace(/&amp;/gi, '&');
    text = text.replace(/&lt;/gi, '<');
    text = text.replace(/&gt;/gi, '>');
    text = text.replace(/&quot;/gi, '"');
    text = text.replace(/&#39;/gi, "'");
    text = text.replace(/&euro;/gi, '€');
    text = text.replace(/&copy;/gi, '©');
    text = text.replace(/&reg;/gi, '®');

    // Limpiar espacios múltiples y líneas vacías
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    text = text.trim();

    return text;
  }
}
