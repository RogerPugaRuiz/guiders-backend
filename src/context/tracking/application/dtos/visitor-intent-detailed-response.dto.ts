import { IntentTagDto } from './intent-tag.dto';
import { NavigationPathDto } from './navigation-path.dto';

// DTO para la respuesta detallada de la intención del visitante
export class VisitorIntentDetailedResponseDto {
  id: string;
  visitorId: string;
  type: string;
  confidence: string;
  detectedAt: string;
  description: string;
  tags: IntentTagDto[];
  priceRange?: { min: number; max: number };
  navigationPath: NavigationPathDto;

  constructor(params: {
    id: string;
    visitorId: string;
    type: string;
    confidence: string;
    detectedAt: string;
    description: string;
    tags: IntentTagDto[];
    priceRange?: { min: number; max: number };
    navigationPath: NavigationPathDto;
  }) {
    this.id = params.id;
    this.visitorId = params.visitorId;
    this.type = params.type;
    this.confidence = params.confidence;
    this.detectedAt = params.detectedAt;
    this.description = params.description;
    this.tags = params.tags;
    this.priceRange = params.priceRange;
    this.navigationPath = params.navigationPath;
  }
}
