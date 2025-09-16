import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveSiteDto {
  @ApiProperty({
    description: 'Host del navegador a resolver (ej: landing.mytech.com)',
    example: 'landing.mytech.com',
  })
  @IsString()
  @IsNotEmpty()
  readonly host: string;
}
