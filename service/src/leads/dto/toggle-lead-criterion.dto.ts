import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ToggleLeadCriterionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  criterionId: string;
}
