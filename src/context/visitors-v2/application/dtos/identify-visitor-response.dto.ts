import { ApiProperty } from '@nestjs/swagger';

export class IdentifyVisitorResponseDto {
  @ApiProperty({
    description: 'ID único del visitante',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  visitorId: string;

  @ApiProperty({
    description: 'ID de la sesión activa',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Estado del ciclo de vida del visitante',
    example: 'ANON',
    enum: ['ANON', 'ENGAGED', 'LEAD', 'CONVERTED'],
  })
  lifecycle: string;

  @ApiProperty({
    description: 'Indica si es un visitante nuevo o existente',
    example: false,
  })
  isNewVisitor: boolean;

  constructor(props: {
    visitorId: string;
    sessionId: string;
    lifecycle: string;
    isNewVisitor: boolean;
  }) {
    this.visitorId = props.visitorId;
    this.sessionId = props.sessionId;
    this.lifecycle = props.lifecycle;
    this.isNewVisitor = props.isNewVisitor;
  }
}
