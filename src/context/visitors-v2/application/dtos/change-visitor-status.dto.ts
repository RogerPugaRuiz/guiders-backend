import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

/**
 * Estados de conexión válidos para el visitante
 */
export enum VisitorConnectionStatusEnum {
  ONLINE = 'online',
  OFFLINE = 'offline',
  CHATTING = 'chatting',
  AWAY = 'away',
}

/**
 * DTO para cambiar el estado de conexión de un visitante manualmente
 */
export class ChangeVisitorStatusDto {
  @ApiProperty({
    description: 'ID del visitante',
    example: 'e7f8a9b0-1234-5678-9abc-def012345678',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Nuevo estado de conexión del visitante',
    enum: VisitorConnectionStatusEnum,
    example: 'away',
  })
  @IsEnum(VisitorConnectionStatusEnum, {
    message: 'El estado debe ser: online, offline, chatting o away',
  })
  @IsNotEmpty()
  status: VisitorConnectionStatusEnum;
}
