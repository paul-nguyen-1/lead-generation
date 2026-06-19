import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateContractorPermissionsDto {
  @ApiProperty()
  @IsBoolean()
  leadsAccess: boolean;

  @ApiProperty()
  @IsBoolean()
  draftEmailAccess: boolean;
}
