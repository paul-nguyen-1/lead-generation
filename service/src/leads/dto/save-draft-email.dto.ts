import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SaveDraftEmailDto {
  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  body: string;
}
