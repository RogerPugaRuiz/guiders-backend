import { CreateAssignmentRulesDto } from '../../infrastructure/dto/assignment-rules.dto';

/**
 * Command para crear reglas de auto-asignación
 */
export class CreateAssignmentRulesCommand {
  constructor(public readonly data: CreateAssignmentRulesDto) {}
}
