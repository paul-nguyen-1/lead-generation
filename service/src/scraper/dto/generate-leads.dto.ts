import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { DEFAULT_LEAD_GENERATION_LIMIT } from '../scraper.constants';

export class GenerateLeadsDto {
  @ApiPropertyOptional({
    default: DEFAULT_LEAD_GENERATION_LIMIT,
    description: 'Maximum number of new (non-duplicate) leads to create',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = DEFAULT_LEAD_GENERATION_LIMIT;
}
