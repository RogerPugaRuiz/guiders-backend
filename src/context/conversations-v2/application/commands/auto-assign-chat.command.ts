import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { AssignmentStrategy } from '../../domain/services/chat-auto-assignment.domain-service';

/**
 * Command para solicitar auto-asignación de un chat
 */
export class AutoAssignChatCommand {
  @IsString()
  readonly chatId: string;

  @IsOptional()
  @IsEnum(AssignmentStrategy)
  readonly strategy?: AssignmentStrategy;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly requiredSkills?: string[];

  @IsOptional()
  @IsNumber()
  readonly maxWaitTimeSeconds?: number;

  @IsOptional()
  @IsString()
  readonly reason?: string;

  constructor(params: {
    chatId: string;
    strategy?: AssignmentStrategy;
    requiredSkills?: string[];
    maxWaitTimeSeconds?: number;
    reason?: string;
  }) {
    // Validaciones explícitas
    if (!params.chatId || params.chatId.trim() === '') {
      throw new Error('El ID del chat es requerido');
    }

    if (
      params.maxWaitTimeSeconds !== undefined &&
      params.maxWaitTimeSeconds <= 0
    ) {
      throw new Error('El tiempo máximo de espera debe ser mayor a 0');
    }

    if (
      params.requiredSkills !== undefined &&
      Array.isArray(params.requiredSkills) &&
      params.requiredSkills.length === 0
    ) {
      throw new Error(
        'Las habilidades requeridas no pueden estar vacías si se proporcionan',
      );
    }

    if (
      params.strategy !== undefined &&
      !Object.values(AssignmentStrategy).includes(params.strategy)
    ) {
      throw new Error('La estrategia de asignación proporcionada no es válida');
    }

    this.chatId = params.chatId;
    this.strategy = params.strategy;
    this.requiredSkills = params.requiredSkills;
    this.maxWaitTimeSeconds = params.maxWaitTimeSeconds;
    this.reason = params.reason;
  }
}
