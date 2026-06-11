import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model, Types } from 'mongoose';
import { CreateScrapeSourceDto } from './dto/create-scrape-source.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { UpdateScrapeSourceDto } from './dto/update-scrape-source.dto';
import { AdminDecision } from './enums/admin-decision.enum';
import { EmailStatus } from './enums/email-status.enum';
import { JobStatus } from './enums/job-status.enum';
import { LeadStatus } from './enums/lead-status.enum';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { ScrapeJob, ScrapeJobDocument } from './schemas/scrape-job.schema';
import {
  ScrapeSource,
  ScrapeSourceDocument,
} from './schemas/scrape-source.schema';
import {
  DEFAULT_LEAD_GENERATION_LIMIT,
  SCRAPE_JOB_OPTIONS,
  SCRAPE_QUEUE,
  SCRAPE_TASK,
} from './scraper.constants';
import { ScrapeTaskData } from './scraper.types';

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class ScraperService {
  constructor(
    @InjectModel(ScrapeSource.name)
    private readonly sourceModel: Model<ScrapeSourceDocument>,
    @InjectModel(ScrapeJob.name)
    private readonly jobModel: Model<ScrapeJobDocument>,
    @InjectModel(Lead.name)
    private readonly leadModel: Model<LeadDocument>,
    @InjectQueue(SCRAPE_QUEUE)
    private readonly queue: Queue<ScrapeTaskData>,
  ) {}

  createSource(dto: CreateScrapeSourceDto, userId: string) {
    return this.sourceModel.create({
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });
  }

  findAllSources() {
    return this.sourceModel.find().sort({ createdAt: -1 }).exec();
  }

  async findSource(id: string): Promise<ScrapeSourceDocument> {
    const source = await this.sourceModel.findById(id).exec();
    if (!source) throw new NotFoundException('Scrape source not found');
    return source;
  }

  async updateSource(
    id: string,
    dto: UpdateScrapeSourceDto,
  ): Promise<ScrapeSourceDocument> {
    const source = await this.sourceModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!source) throw new NotFoundException('Scrape source not found');
    return source;
  }

  async removeSource(id: string): Promise<void> {
    const result = await this.sourceModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Scrape source not found');
  }

  async runSource(
    id: string,
    userId: string,
    leadLimit: number = DEFAULT_LEAD_GENERATION_LIMIT,
  ): Promise<ScrapeJobDocument> {
    const source = await this.findSource(id);
    if (!source.isActive) {
      throw new BadRequestException('Scrape source is not active');
    }

    const job = await this.jobModel.create({
      sourceId: source._id,
      status: JobStatus.Running,
      startedAt: new Date(),
      pendingTasks: source.startUrls.length,
      leadLimit,
      triggeredBy: new Types.ObjectId(userId),
    });

    for (const url of source.startUrls) {
      const task: ScrapeTaskData = {
        scrapeJobId: job._id.toString(),
        sourceId: source._id.toString(),
        url,
        type: source.type,
        depth: 0,
      };
      await this.queue.add(SCRAPE_TASK, task, SCRAPE_JOB_OPTIONS);
    }

    return job;
  }

  /**
   * Kicks off a "Generate Leads" run against the most recently created
   * active source, capped at `limit` new (non-duplicate) leads.
   */
  async generateLeads(
    userId: string,
    limit: number = DEFAULT_LEAD_GENERATION_LIMIT,
  ): Promise<ScrapeJobDocument> {
    const source = await this.sourceModel
      .findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .exec();
    if (!source) {
      throw new BadRequestException(
        'No active scrape source is configured. Create one via POST /scraper/sources first.',
      );
    }

    return this.runSource(source._id.toString(), userId, limit);
  }

  /** Status of the most recent "Generate Leads" run, for polling. */
  async getGenerationStatus(): Promise<{
    running: boolean;
    jobId: string | null;
    status: JobStatus | null;
    leadsCreated: number;
    leadsDuplicate: number;
    leadLimit: number;
  }> {
    const job = await this.jobModel.findOne().sort({ createdAt: -1 }).exec();
    if (!job) {
      return {
        running: false,
        jobId: null,
        status: null,
        leadsCreated: 0,
        leadsDuplicate: 0,
        leadLimit: DEFAULT_LEAD_GENERATION_LIMIT,
      };
    }

    return {
      running: job.status === JobStatus.Running,
      jobId: job._id.toString(),
      status: job.status,
      leadsCreated: job.stats.leadsCreated,
      leadsDuplicate: job.stats.leadsDuplicate,
      leadLimit: job.leadLimit,
    };
  }

  findJobs(sourceId?: string) {
    const filter: Record<string, unknown> = sourceId
      ? { sourceId: new Types.ObjectId(sourceId) }
      : {};
    return this.jobModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findJob(id: string): Promise<ScrapeJobDocument> {
    const job = await this.jobModel.findById(id).exec();
    if (!job) throw new NotFoundException('Scrape job not found');
    return job;
  }

  async findLeads(query: QueryLeadsDto) {
    const { sourceId, status, search, page = 1, limit = 20 } = query;
    const filter: Record<string, unknown> = {};
    if (sourceId) filter.sourceId = new Types.ObjectId(sourceId);
    if (status) filter.status = status;
    if (search) {
      const regex = new RegExp(escapeRegExp(search), 'i');
      filter.$or = [{ businessName: regex }, { email: regex }];
    }

    const [items, total] = await Promise.all([
      this.leadModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.leadModel.countDocuments(filter).exec(),
    ]);

    return { items, total, page, limit };
  }

  async findLead(id: string): Promise<LeadDocument> {
    const lead = await this.leadModel.findById(id).exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async updateLeadStatus(
    id: string,
    status: LeadStatus,
  ): Promise<LeadDocument> {
    const lead = await this.leadModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async assignLead(id: string, userId: string): Promise<LeadDocument> {
    const lead = await this.leadModel
      .findByIdAndUpdate(
        id,
        { assignedTo: new Types.ObjectId(userId) },
        { new: true },
      )
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async toggleLeadCriterion(
    id: string,
    criterionId: string,
  ): Promise<LeadDocument> {
    const lead = await this.findLead(id);
    const criterion = lead.criteria.find((item) => item.id === criterionId);
    if (!criterion) throw new NotFoundException('Criterion not found');
    criterion.met = !criterion.met;
    if (lead.status === LeadStatus.New) {
      lead.status = LeadStatus.ContractorReview;
    }
    await lead.save();
    return lead;
  }

  async setLeadContractorNotes(
    id: string,
    notes: string,
  ): Promise<LeadDocument> {
    const lead = await this.findLead(id);
    lead.contractorNotes = notes;
    if (lead.status === LeadStatus.New) {
      lead.status = LeadStatus.ContractorReview;
    }
    await lead.save();
    return lead;
  }

  async setLeadAdminNotes(id: string, notes: string): Promise<LeadDocument> {
    const lead = await this.leadModel
      .findByIdAndUpdate(id, { adminNotes: notes }, { new: true })
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async submitLeadForApproval(id: string): Promise<LeadDocument> {
    const lead = await this.leadModel
      .findByIdAndUpdate(
        id,
        {
          status: LeadStatus.PendingApproval,
          contractorReviewedAt: new Date(),
        },
        { new: true },
      )
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async sendLeadBackToContractor(id: string): Promise<LeadDocument> {
    const lead = await this.leadModel
      .findByIdAndUpdate(
        id,
        { status: LeadStatus.ContractorReview },
        { new: true },
      )
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async approveLead(id: string): Promise<LeadDocument> {
    const now = new Date();
    const lead = await this.leadModel
      .findByIdAndUpdate(
        id,
        {
          status: LeadStatus.Completed,
          adminDecision: AdminDecision.Approved,
          adminReviewedAt: now,
          emailStatus: EmailStatus.Sent,
          emailSentAt: now,
        },
        { new: true },
      )
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async rejectLead(id: string): Promise<LeadDocument> {
    const lead = await this.leadModel
      .findByIdAndUpdate(
        id,
        {
          status: LeadStatus.Rejected,
          adminDecision: AdminDecision.Rejected,
          adminReviewedAt: new Date(),
        },
        { new: true },
      )
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}
