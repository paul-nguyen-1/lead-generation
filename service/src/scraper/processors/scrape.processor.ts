import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Queue } from 'bullmq';
import { Model, Types } from 'mongoose';
import { JobStatus } from '../enums/job-status.enum';
import { LeadStatus } from '../enums/lead-status.enum';
import { SourceType } from '../enums/source-type.enum';
import { Lead, LeadDocument } from '../schemas/lead.schema';
import { ScrapeJob, ScrapeJobDocument } from '../schemas/scrape-job.schema';
import {
  ScrapeSource,
  ScrapeSourceDocument,
} from '../schemas/scrape-source.schema';
import { DomainThrottleService } from '../services/domain-throttle.service';
import { ExtractedLead, ExtractorService } from '../services/extractor.service';
import { FetcherService } from '../services/fetcher.service';
import { RobotsService } from '../services/robots.service';
import {
  SCRAPE_JOB_OPTIONS,
  SCRAPE_QUEUE,
  SCRAPE_TASK,
} from '../scraper.constants';
import { ScrapeTaskData } from '../scraper.types';

const DEFAULT_CONCURRENCY = 5;

@Processor(SCRAPE_QUEUE, {
  concurrency:
    Number(process.env.SCRAPER_WORKER_CONCURRENCY) || DEFAULT_CONCURRENCY,
})
export class ScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(
    @InjectModel(ScrapeSource.name)
    private readonly sourceModel: Model<ScrapeSourceDocument>,
    @InjectModel(ScrapeJob.name)
    private readonly jobModel: Model<ScrapeJobDocument>,
    @InjectModel(Lead.name)
    private readonly leadModel: Model<LeadDocument>,
    @InjectQueue(SCRAPE_QUEUE)
    private readonly queue: Queue<ScrapeTaskData>,
    private readonly robotsService: RobotsService,
    private readonly throttleService: DomainThrottleService,
    private readonly fetcherService: FetcherService,
    private readonly extractorService: ExtractorService,
  ) {
    super();
  }

  async process(job: Job<ScrapeTaskData>): Promise<void> {
    const { scrapeJobId, sourceId, url, type, depth } = job.data;

    try {
      const source = await this.sourceModel.findById(sourceId).exec();
      if (!source || !source.isActive) {
        return;
      }

      const allowed = await this.robotsService.isAllowed(url);
      if (!allowed) {
        await this.jobModel.findByIdAndUpdate(scrapeJobId, {
          $inc: { 'stats.pagesSkippedRobots': 1 },
        });
        this.logger.debug(`Skipping ${url} (disallowed by robots.txt)`);
        return;
      }

      const domain = new URL(url).hostname;
      const crawlDelayMs = await this.robotsService.getCrawlDelayMs(url);
      await this.throttleService.waitForTurn(domain, crawlDelayMs);

      const { html } = await this.fetcherService.fetch(url);
      await this.jobModel.findByIdAndUpdate(scrapeJobId, {
        $inc: { 'stats.pagesVisited': 1 },
      });

      if (type === SourceType.Directory) {
        await this.handleDirectoryPage(source, html, url, scrapeJobId, depth);
      } else {
        await this.handleCompanySitePage(source, html, url, scrapeJobId, depth);
      }
    } catch (err) {
      this.logger.warn(`Failed to process ${url}: ${String(err)}`);
      await this.jobModel.findByIdAndUpdate(scrapeJobId, {
        $inc: { 'stats.errors': 1 },
      });
    } finally {
      await this.completeTask(scrapeJobId);
    }
  }

  private async handleDirectoryPage(
    source: ScrapeSourceDocument,
    html: string,
    url: string,
    scrapeJobId: string,
    depth: number,
  ): Promise<void> {
    const listings = this.extractorService.extractDirectoryListings(
      html,
      url,
      source.selectors,
    );
    for (const listing of listings) {
      await this.upsertLead(
        listing,
        url,
        source._id,
        new Types.ObjectId(scrapeJobId),
      );
    }
    if (listings.length > 0) {
      await this.jobModel.findByIdAndUpdate(scrapeJobId, {
        $inc: { 'stats.leadsFound': listings.length },
      });
    }

    if (depth < source.maxDepth) {
      const nextPage = this.extractorService.findLink(
        html,
        url,
        source.selectors.nextPage,
      );
      if (
        nextPage &&
        this.extractorService.isAllowedDomain(nextPage, source.allowedDomains)
      ) {
        await this.enqueueTask(
          scrapeJobId,
          source._id.toString(),
          nextPage,
          SourceType.Directory,
          depth + 1,
        );
      }
    }
  }

  private async handleCompanySitePage(
    source: ScrapeSourceDocument,
    html: string,
    url: string,
    scrapeJobId: string,
    depth: number,
  ): Promise<void> {
    const contact = this.extractorService.extractContactInfo(html, url);
    if (contact.email || contact.phone) {
      await this.upsertLead(
        contact,
        url,
        source._id,
        new Types.ObjectId(scrapeJobId),
      );
      await this.jobModel.findByIdAndUpdate(scrapeJobId, {
        $inc: { 'stats.leadsFound': 1 },
      });
    }

    if (depth < source.maxDepth) {
      const links = this.extractorService.findContactPageLinks(
        html,
        url,
        source.contactPaths,
      );
      for (const link of links) {
        if (
          this.extractorService.isAllowedDomain(link, source.allowedDomains)
        ) {
          await this.enqueueTask(
            scrapeJobId,
            source._id.toString(),
            link,
            SourceType.CompanySite,
            depth + 1,
          );
        }
      }
    }
  }

  /** Upserts a lead, deduping on the strongest identifier available. */
  private async upsertLead(
    data: ExtractedLead,
    sourceUrl: string,
    sourceId: Types.ObjectId,
    jobId: Types.ObjectId,
  ): Promise<void> {
    const filter = this.buildLeadFilter(data, sourceId);
    const fields = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== null),
    );

    if (!filter) {
      await this.leadModel.create({
        ...fields,
        sourceId,
        jobId,
        sourceUrl,
        status: LeadStatus.New,
      });
      return;
    }

    await this.leadModel.updateOne(
      filter,
      {
        $setOnInsert: { sourceId, jobId, sourceUrl, status: LeadStatus.New },
        $set: fields,
      },
      { upsert: true },
    );
  }

  private buildLeadFilter(
    data: ExtractedLead,
    sourceId: Types.ObjectId,
  ): Record<string, unknown> | null {
    if (data.email) return { sourceId, email: data.email };
    if (data.website) return { sourceId, website: data.website };
    if (data.businessName && data.phone) {
      return { sourceId, businessName: data.businessName, phone: data.phone };
    }
    if (data.businessName && data.address) {
      return {
        sourceId,
        businessName: data.businessName,
        address: data.address,
      };
    }
    return null;
  }

  private async enqueueTask(
    scrapeJobId: string,
    sourceId: string,
    url: string,
    type: SourceType,
    depth: number,
  ): Promise<void> {
    await this.jobModel.findByIdAndUpdate(scrapeJobId, {
      $inc: { pendingTasks: 1 },
    });
    await this.queue.add(
      SCRAPE_TASK,
      { scrapeJobId, sourceId, url, type, depth },
      SCRAPE_JOB_OPTIONS,
    );
  }

  /** Decrements the job's pending task count and marks it complete once it hits zero. */
  private async completeTask(scrapeJobId: string): Promise<void> {
    const updated = await this.jobModel.findByIdAndUpdate(
      scrapeJobId,
      { $inc: { pendingTasks: -1 } },
      { new: true },
    );
    if (
      updated &&
      updated.pendingTasks <= 0 &&
      updated.status === JobStatus.Running
    ) {
      await this.jobModel.findByIdAndUpdate(scrapeJobId, {
        status: JobStatus.Completed,
        finishedAt: new Date(),
      });
    }
  }
}
