import { IsString, IsOptional } from 'class-validator';

/**
 * Command para asignar manualmente un chat a un comercial
 */
export class AssignChatToCommercialCommand {
  @IsString()
  readonly chatId: string;

  @IsString()
  readonly commercialId: string;

  @IsOptional()
  @IsString()
  readonly assignedBy?: string;

  @IsOptional()
  @IsString()
  readonly reason?: string;

  constructor(params: {
    chatId: string;
    commercialId: string;
    assignedBy?: string;
    reason?: string;
  }) {
    // Validaciones explícitas
    if (!params.chatId || params.chatId.trim() === '') {
      throw new Error('El ID del chat es requerido');
    }

    if (!params.commercialId || params.commercialId.trim() === '') {
      throw new Error('El ID del comercial es requerido');
    }

    this.chatId = params.chatId;
    this.commercialId = params.commercialId;
    this.assignedBy = params.assignedBy;
    this.reason = params.reason || 'manual';
  }
}
