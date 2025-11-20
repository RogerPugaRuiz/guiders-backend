import { S3Client } from '@aws-sdk/client-s3';

export interface S3ConfigOptions {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  avatarPrefix: string;
}

export class S3Config {
  private static instance: S3Client;
  private static config: S3ConfigOptions;

  static initialize(): void {
    if (!this.instance) {
      this.config = {
        region: process.env.AWS_REGION || 'eu-west-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        bucket: process.env.AWS_S3_BUCKET_NAME || 'guiders-avatars',
        avatarPrefix: process.env.AWS_S3_AVATAR_PREFIX || 'avatars/',
      };

      // En entorno de testing, permitir que las credenciales sean opcionales
      const isTestEnvironment = process.env.NODE_ENV === 'test';

      // Validar que las credenciales estén configuradas (excepto en tests)
      if (
        !isTestEnvironment &&
        (!this.config.accessKeyId || !this.config.secretAccessKey)
      ) {
        throw new Error(
          'AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.',
        );
      }

      // Solo crear cliente S3 si hay credenciales válidas
      if (this.config.accessKeyId && this.config.secretAccessKey) {
        this.instance = new S3Client({
          region: this.config.region,
          credentials: {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
          },
        });
      }
    }
  }

  static getClient(): S3Client {
    if (!this.instance) {
      this.initialize();
    }
    if (!this.instance) {
      throw new Error(
        'S3Client is not available. AWS credentials may not be configured.',
      );
    }
    return this.instance;
  }

  static getConfig(): S3ConfigOptions {
    if (!this.config) {
      this.initialize();
    }
    return this.config;
  }

  static getBucketName(): string {
    return this.getConfig().bucket;
  }

  static getAvatarPrefix(): string {
    return this.getConfig().avatarPrefix;
  }

  static getMaxFileSize(): number {
    // AWS_S3_MAX_FILE_SIZE ya viene en bytes desde .env
    const maxSizeBytes = parseInt(
      process.env.AWS_S3_MAX_FILE_SIZE || '5242880',
      10,
    );
    return maxSizeBytes;
  }

  static getAllowedMimeTypes(): string[] {
    const types =
      process.env.AWS_S3_ALLOWED_MIME_TYPES || 'image/png,image/jpeg';
    return types.split(',').map((type) => type.trim());
  }
}
