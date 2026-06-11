import { PartialType } from '@nestjs/swagger';
import { CreateScrapeSourceDto } from './create-scrape-source.dto';

export class UpdateScrapeSourceDto extends PartialType(CreateScrapeSourceDto) {}
