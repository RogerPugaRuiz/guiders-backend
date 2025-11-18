import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { S3UploadService } from '../services/s3-upload.service';
import { S3Config } from '../config/s3.config';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: S3Config.getMaxFileSize(), // 5MB por defecto
        files: 1, // Solo un archivo por request
      },
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = S3Config.getAllowedMimeTypes();
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(
              `Tipo de archivo no permitido. Solo se permiten: ${allowedMimeTypes.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  ],
  providers: [S3UploadService],
  exports: [S3UploadService, MulterModule],
})
export class UploadModule {}
