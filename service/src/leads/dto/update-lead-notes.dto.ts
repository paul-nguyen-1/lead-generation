import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateLeadNotesDto {
  @ApiProperty()
  @IsString()
  notes: string;
}
