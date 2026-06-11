import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScrapeProcessor } from './processors/scrape.processor';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { ScrapeJob, ScrapeJobSchema } from './schemas/scrape-job.schema';
import {
  ScrapeSource,
  ScrapeSourceSchema,
} from './schemas/scrape-source.schema';
import { SCRAPE_QUEUE } from './scraper.constants';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { DomainThrottleService } from './services/domain-throttle.service';
import { ExtractorService } from './services/extractor.service';
import { FetcherService } from './services/fetcher.service';
import { RobotsService } from './services/robots.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScrapeSource.name, schema: ScrapeSourceSchema },
      { name: ScrapeJob.name, schema: ScrapeJobSchema },
      { name: Lead.name, schema: LeadSchema },
    ]),
    BullModule.registerQueue({ name: SCRAPE_QUEUE }),
  ],
  controllers: [ScraperController],
  providers: [
    ScraperService,
    ScrapeProcessor,
    RobotsService,
    DomainThrottleService,
    FetcherService,
    ExtractorService,
  ],
})
export class ScraperModule {}
