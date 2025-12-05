/**
 * Servicio de upload de archivos para White Label
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { S3Config } from 'src/context/shared/infrastructure/config/s3.config';
import * as path from 'path';

/**
 * Tipos de archivo permitidos para cada categoría
 */
export const WHITE_LABEL_FILE_CONFIG = {
  logo: {
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
    maxSize: 2 * 1024 * 1024, // 2MB
    prefix: 'white-label/logos/',
  },
  favicon: {
    allowedMimeTypes: ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon'],
    maxSize: 500 * 1024, // 500KB
    prefix: 'white-label/favicons/',
  },
  font: {
    allowedExtensions: ['.ttf', '.otf', '.woff', '.woff2'],
    allowedMimeTypes: [
      'font/ttf',
      'font/otf',
      'font/woff',
      'font/woff2',
      'application/x-font-ttf',
      'application/x-font-otf',
      'application/font-woff',
      'application/font-woff2',
      'application/octet-stream', // Fallback para algunos navegadores
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    prefix: 'white-label/fonts/',
  },
} as const;

export type WhiteLabelFileType = keyof typeof WHITE_LABEL_FILE_CONFIG;

@Injectable()
export class WhiteLabelFileUploadService {
  private readonly logger = new Logger(WhiteLabelFileUploadService.name);

  private get client() {
    return S3Config.getClient();
  }

  private get bucket() {
    return S3Config.getBucketName();
  }

  /**
   * Sube un logo a S3
   */
  async uploadLogo(
    file: Express.Multer.File,
    companyId: string,
  ): Promise<string> {
    return this.uploadFile(file, companyId, 'logo');
  }

  /**
   * Sube un favicon a S3
   */
  async uploadFavicon(
    file: Express.Multer.File,
    companyId: string,
  ): Promise<string> {
    return this.uploadFile(file, companyId, 'favicon');
  }

  /**
   * Sube un archivo de fuente a S3
   */
  async uploadFont(
    file: Express.Multer.File,
    companyId: string,
  ): Promise<{ name: string; url: string }> {
    const url = await this.uploadFile(file, companyId, 'font');
    return {
      name: file.originalname,
      url,
    };
  }

  /**
   * Elimina un archivo de S3 por su URL
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) {
      this.logger.warn('URL de archivo vacía, nada que eliminar');
      return;
    }

    try {
      const urlParts = new URL(fileUrl);
      const key = urlParts.pathname.substring(1);

      this.logger.log(`Eliminando archivo White Label: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      this.logger.log(`Archivo eliminado exitosamente: ${key}`);
    } catch (error) {
      this.logger.error(
        `Error al eliminar archivo ${fileUrl}:`,
        (error as Error).stack,
      );
      // No lanzar error, solo loguear
    }
  }

  /**
   * Elimina múltiples archivos por sus URLs
   */
  async deleteFiles(fileUrls: string[]): Promise<void> {
    await Promise.all(fileUrls.map((url) => this.deleteFile(url)));
  }

  /**
   * Sube un archivo genérico a S3
   */
  private async uploadFile(
    file: Express.Multer.File,
    companyId: string,
    fileType: WhiteLabelFileType,
  ): Promise<string> {
    this.logger.log(`Subiendo ${fileType} para empresa: ${companyId}`);

    // Validar archivo
    this.validateFile(file, fileType);

    // Generar nombre único
    const config = WHITE_LABEL_FILE_CONFIG[fileType];
    const fileExtension = path.extname(file.originalname);
    const timestamp = Date.now();
    const baseName = path.basename(file.originalname, fileExtension);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${config.prefix}${companyId}/${sanitizedBaseName}-${timestamp}${fileExtension}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
        Metadata: {
          companyId,
          fileType,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.client.send(command);

      const region = S3Config.getConfig().region;
      const url = `https://${this.bucket}.s3.${region}.amazonaws.com/${fileName}`;

      this.logger.log(`${fileType} subido exitosamente: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Error al subir ${fileType} para empresa ${companyId}:`,
        (error as Error).stack,
      );
      throw new BadRequestException(`Error al subir ${fileType} a S3`);
    }
  }

  /**
   * Valida un archivo según el tipo
   */
  private validateFile(
    file: Express.Multer.File,
    fileType: WhiteLabelFileType,
  ): void {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (!file.mimetype || !file.size || !file.originalname) {
      throw new BadRequestException('Archivo inválido o corrupto');
    }

    const config = WHITE_LABEL_FILE_CONFIG[fileType];

    // Validar tipo MIME para logo y favicon
    if (fileType !== 'font') {
      const allowedMimeTypes = config.allowedMimeTypes as readonly string[];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `Tipo de archivo no permitido para ${fileType}. Tipos permitidos: ${config.allowedMimeTypes.join(', ')}`,
        );
      }
    } else {
      // Para fuentes, validar por extensión además de MIME type
      const ext = path.extname(file.originalname).toLowerCase();
      const fontConfig = WHITE_LABEL_FILE_CONFIG.font;
      const allowedExtensions =
        fontConfig.allowedExtensions as readonly string[];

      if (!allowedExtensions.includes(ext)) {
        throw new BadRequestException(
          `Extensión de archivo no permitida para fuentes. Extensiones permitidas: ${fontConfig.allowedExtensions.join(', ')}`,
        );
      }
    }

    // Validar tamaño
    if (file.size > config.maxSize) {
      const maxSizeFormatted =
        config.maxSize >= 1024 * 1024
          ? `${(config.maxSize / (1024 * 1024)).toFixed(1)}MB`
          : `${(config.maxSize / 1024).toFixed(0)}KB`;
      throw new BadRequestException(
        `El archivo ${fileType} es demasiado grande. Tamaño máximo: ${maxSizeFormatted}`,
      );
    }

    this.logger.debug(
      `Archivo ${fileType} validado: ${file.originalname}, tipo: ${file.mimetype}, tamaño: ${(file.size / 1024).toFixed(2)}KB`,
    );
  }
}
