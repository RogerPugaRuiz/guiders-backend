/**
 * Errores del dominio White Label
 */

import { DomainError } from 'src/context/shared/domain/domain.error';

export class WhiteLabelError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'WhiteLabelError';
  }
}

export class WhiteLabelConfigNotFoundError extends WhiteLabelError {
  constructor(public readonly companyId: string) {
    super(
      `No se encontró configuración White Label para la empresa ${companyId}`,
    );
    this.name = 'WhiteLabelConfigNotFoundError';
  }
}

export class WhiteLabelFileUploadError extends WhiteLabelError {
  constructor(
    public readonly fileType: string,
    public readonly reason: string,
  ) {
    super(`Error al subir ${fileType}: ${reason}`);
    this.name = 'WhiteLabelFileUploadError';
  }
}

export class WhiteLabelInvalidFileTypeError extends WhiteLabelError {
  constructor(
    public readonly fileType: string,
    public readonly allowedTypes: string[],
  ) {
    super(
      `Tipo de archivo no permitido: ${fileType}. Tipos permitidos: ${allowedTypes.join(', ')}`,
    );
    this.name = 'WhiteLabelInvalidFileTypeError';
  }
}

export class WhiteLabelFileTooLargeError extends WhiteLabelError {
  constructor(
    public readonly fileSize: number,
    public readonly maxSize: number,
  ) {
    super(
      `El archivo excede el tamaño máximo permitido. Tamaño: ${fileSize} bytes, Máximo: ${maxSize} bytes`,
    );
    this.name = 'WhiteLabelFileTooLargeError';
  }
}
