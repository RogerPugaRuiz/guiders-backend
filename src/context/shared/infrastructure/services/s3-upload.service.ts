import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { S3Config } from '../config/s3.config';
import * as path from 'path';

@Injectable()
export class S3UploadService {
  private readonly logger = new Logger(S3UploadService.name);
  private readonly client = S3Config.getClient();
  private readonly bucket = S3Config.getBucketName();
  private readonly avatarPrefix = S3Config.getAvatarPrefix();

  /**
   * Sube un avatar a S3 y retorna la URL pública
   * @param file - Archivo de multer
   * @param userId - ID del usuario (para nombrar el archivo)
   * @returns URL pública del avatar en S3
   */
  async uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    this.logger.log(`Subiendo avatar para usuario: ${userId}`);

    // Validar tipo de archivo
    this.validateFile(file);

    // Generar nombre único del archivo
    const fileExtension = path.extname(file.originalname);
    const timestamp = Date.now();
    const fileName = `${this.avatarPrefix}${userId}-${timestamp}${fileExtension}`;

    try {
      // Subir archivo a S3
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read', // Hacer público para que sea accesible vía URL
        Metadata: {
          userId: userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.client.send(command);

      // Generar URL pública
      const region = S3Config.getConfig().region;
      const url = `https://${this.bucket}.s3.${region}.amazonaws.com/${fileName}`;

      this.logger.log(`Avatar subido exitosamente: ${url}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Error al subir avatar para usuario ${userId}:`,
        (error as Error).stack,
      );
      throw new BadRequestException('Error al subir el avatar a S3');
    }
  }

  /**
   * Elimina un avatar de S3 dada su URL
   * @param avatarUrl - URL completa del avatar en S3
   */
  async deleteAvatar(avatarUrl: string): Promise<void> {
    if (!avatarUrl || !avatarUrl.includes(this.bucket)) {
      this.logger.warn(
        `URL de avatar inválida o no pertenece a S3: ${avatarUrl}`,
      );
      return;
    }

    try {
      // Extraer el key (nombre del archivo) de la URL
      const urlParts = new URL(avatarUrl);
      const key = urlParts.pathname.substring(1); // Eliminar el '/' inicial

      this.logger.log(`Eliminando avatar: ${key}`);

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      this.logger.log(`Avatar eliminado exitosamente: ${key}`);
    } catch (error) {
      // No lanzar error si falla la eliminación, solo loguear
      this.logger.error(
        `Error al eliminar avatar ${avatarUrl}:`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Verifica si un avatar existe en S3
   * @param avatarUrl - URL del avatar
   * @returns true si existe, false en caso contrario
   */
  async avatarExists(avatarUrl: string): Promise<boolean> {
    if (!avatarUrl || !avatarUrl.includes(this.bucket)) {
      return false;
    }

    try {
      const urlParts = new URL(avatarUrl);
      const key = urlParts.pathname.substring(1);

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida que el archivo cumpla con los requisitos
   * @param file - Archivo a validar
   * @throws BadRequestException si no cumple
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // Validar que el archivo tiene las propiedades necesarias
    if (!file.mimetype || !file.size || !file.originalname) {
      throw new BadRequestException('Archivo inválido o corrupto');
    }

    // Validar tipo de archivo
    const allowedMimeTypes = S3Config.getAllowedMimeTypes();
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido. Solo se permiten: ${allowedMimeTypes.join(', ')}`,
      );
    }

    // Validar tamaño
    const maxSize = S3Config.getMaxFileSize();
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new BadRequestException(
        `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`,
      );
    }

    this.logger.debug(
      `Archivo validado: ${file.originalname}, tipo: ${file.mimetype}, tamaño: ${(file.size / 1024).toFixed(2)}KB`,
    );
  }
}
