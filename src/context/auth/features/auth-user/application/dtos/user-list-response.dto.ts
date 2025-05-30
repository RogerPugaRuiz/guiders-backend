// DTO para la respuesta de listado de usuarios por compañía
// Ubicación: src/context/auth/auth-user/application/dtos/user-list-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  roles: string[];

  @ApiProperty()
  companyId: string;

  @ApiProperty({ default: true })
  isActive: boolean;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserListItemDto] })
  users: UserListItemDto[];
}
