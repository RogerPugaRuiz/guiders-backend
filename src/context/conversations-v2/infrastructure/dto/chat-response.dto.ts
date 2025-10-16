// DTO para respuesta de chat asignado
// Tipado para compatibilidad con mocks y test e2e
export interface ChatPrimitives {
  id: string;
  assignedCommercialId?: string;
  status?: string;
  priority?: string;
  visitorId?: string;
  visitorInfo?: any;
  [key: string]: any;
}

export interface AssignedCommercialData {
  id: string;
  name: string;
}

export class ChatResponseDto {
  id: string;
  assignedCommercialId?: string;
  assignedCommercial?: AssignedCommercialData | null;
  status?: string;
  priority?: string;
  visitorId?: string;
  visitorInfo?: any;
  [key: string]: any;

  static fromDomain(
    chat: {
      toPrimitives: () => ChatPrimitives;
    },
    assignedCommercialData?: AssignedCommercialData | null,
  ): ChatResponseDto {
    const primitives: Record<string, unknown> = chat.toPrimitives();
    const dto = new ChatResponseDto();
    // Asignar solo los campos conocidos
    if (typeof primitives.id === 'string') {
      dto.id = primitives.id;
    }
    if (typeof primitives.assignedCommercialId === 'string') {
      dto.assignedCommercialId = primitives.assignedCommercialId;
    }

    // Enriquecer con datos del comercial si están disponibles
    if (primitives.assignedCommercialId && assignedCommercialData) {
      dto.assignedCommercial = {
        id: assignedCommercialData.id,
        name: assignedCommercialData.name,
      };
    } else {
      dto.assignedCommercial = null;
    }

    if (typeof primitives.status === 'string') {
      dto.status = primitives.status;
    }
    if (typeof primitives.priority === 'string') {
      dto.priority = primitives.priority;
    }
    if (typeof primitives.visitorId === 'string') {
      dto.visitorId = primitives.visitorId;
    }
    if (primitives.visitorInfo !== undefined) {
      dto.visitorInfo = primitives.visitorInfo;
    }
    // Copiar cualquier campo adicional para compatibilidad con mocks/tests
    Object.keys(primitives).forEach((key) => {
      if (!(key in dto)) {
        (dto as Record<string, unknown>)[key] = primitives[key];
      }
    });
    return dto;
  }
}
