import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { SourceType } from '../enums/source-type.enum';

export class CreateScrapeSourceDto {
  @ApiProperty({ description: 'Human-readable name for this scrape source' })
  @IsString()
  name: string;

  @ApiProperty({ enum: SourceType })
  @IsEnum(SourceType)
  type: SourceType;

  @ApiProperty({
    type: [String],
    description: 'URLs to start crawling from',
    example: ['https://example.com/directory'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUrl({}, { each: true })
  startUrls: string[];

  @ApiProperty({
    type: [String],
    description:
      'Domains the crawler may follow links into (e.g. ["example.com"])',
    example: ['example.com'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  allowedDomains: string[];

  @ApiPropertyOptional({
    type: Object,
    description:
      'CSS selectors used to extract data. For directory sources: listItem, name, phone, address, website, email, contactName, nextPage. Unused for company-site sources.',
    example: {
      listItem: '.listing',
      name: '.listing-name',
      phone: '.listing-phone',
      address: '.listing-address',
      website: 'a.listing-website',
      nextPage: 'a.next-page',
    },
  })
  @IsOptional()
  @IsObject()
  selectors?: Record<string, string>;

  @ApiPropertyOptional({
    type: [String],
    description:
      'URL path fragments used to find contact pages on company sites',
    example: ['/contact', '/contact-us', '/about'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactPaths?: string[];

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 5,
    description: 'How many link-hops to follow from each start URL',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  maxDepth?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
