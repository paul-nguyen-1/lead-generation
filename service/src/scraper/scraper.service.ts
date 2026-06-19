import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailService } from '../email/email.service';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { AdminDecision } from './enums/admin-decision.enum';
import { EmailStatus } from './enums/email-status.enum';
import { LeadStatus } from './enums/lead-status.enum';
import { Lead, LeadDocument } from './schemas/lead.schema';

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MS_PER_HOUR = 1000 * 60 * 60;
const SEVEN_DAYS_MS = 7 * 24 * MS_PER_HOUR;

export interface ContractorAnalytics {
  id: string;
  name: string;
  rank: number;
  totalLeads: number;
  completedLeads: number;
  rejectedLeads: number;
  inProgressLeads: number;
  approvalRate: number | null;
  leadsLast7Days: number;
  avgReviewHours: number | null;
  efficiencyScore: number;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    @InjectModel(Lead.name)
    private readonly leadModel: Model<LeadDocument>,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  async createLead(dto: CreateLeadDto, userId: string): Promise<LeadDocument> {
    if (!dto.businessName && !dto.contactName) {
      throw new BadRequestException(
        'At least one of businessName or contactName is required',
      );
    }

    return this.leadModel.create({
      businessName: dto.businessName ?? null,
      contactName: dto.contactName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      website: dto.website ?? null,
      source: dto.source ?? null,
      notes: dto.notes ?? '',
      createdBy: new Types.ObjectId(userId),
      assignedTo: new Types.ObjectId(userId),
    });
  }

  async findLeads(query: QueryLeadsDto) {
    const { status, search, page = 1, limit = 20 } = query;
    const filter: Record<string, unknown> = {};
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

  async saveDraftEmail(
    id: string,
    subject: string,
    body: string,
  ): Promise<LeadDocument> {
    const lead = await this.leadModel
      .findByIdAndUpdate(
        id,
        {
          draftEmailSubject: subject,
          draftEmailBody: body,
          draftEmailCreatedAt: new Date(),
          emailStatus: EmailStatus.Draft,
        },
        { new: true },
      )
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
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
    const existing = await this.findLead(id);

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

    if (existing.draftEmailSubject && existing.email) {
      try {
        await this.emailService.sendEmail({
          to: existing.email,
          subject: existing.draftEmailSubject,
          body: existing.draftEmailBody,
        });
      } catch (err) {
        this.logger.error(`Failed to send approval email for lead ${id}`, err);
      }
    }

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

  /**
   * Per-contractor lead-generation efficiency, ranked for the home dashboard.
   */
  async getContractorAnalytics(): Promise<{
    contractors: Array<ContractorAnalytics>;
  }> {
    const contractors = await this.usersService.findAll(Role.Contractor);
    const contractorIds = contractors.map((contractor) => contractor._id);
    const leads = await this.leadModel
      .find({ createdBy: { $in: contractorIds } })
      .exec();

    const now = Date.now();

    const stats = contractors.map((contractor) => {
      const contractorLeads = leads.filter((lead) =>
        lead.createdBy.equals(contractor._id),
      );
      const totalLeads = contractorLeads.length;
      const completedLeads = contractorLeads.filter(
        (lead) => lead.status === LeadStatus.Completed,
      ).length;
      const rejectedLeads = contractorLeads.filter(
        (lead) => lead.status === LeadStatus.Rejected,
      ).length;
      const inProgressLeads = totalLeads - completedLeads - rejectedLeads;
      const decided = completedLeads + rejectedLeads;
      const approvalRate =
        decided > 0 ? Math.round((completedLeads / decided) * 100) : null;
      const leadsLast7Days = contractorLeads.filter(
        (lead) => now - lead.createdAt.getTime() <= SEVEN_DAYS_MS,
      ).length;

      const reviewedLeads = contractorLeads.filter(
        (lead) => lead.contractorReviewedAt,
      );
      const avgReviewHours =
        reviewedLeads.length > 0
          ? Math.round(
              (reviewedLeads.reduce((sum, lead) => {
                const hours =
                  ((lead.contractorReviewedAt as Date).getTime() -
                    lead.createdAt.getTime()) /
                  MS_PER_HOUR;
                return sum + hours;
              }, 0) /
                reviewedLeads.length) *
                10,
            ) / 10
          : null;

      const efficiencyScore =
        completedLeads * 2 - rejectedLeads + leadsLast7Days;

      return {
        id: contractor._id.toString(),
        name: contractor.name,
        totalLeads,
        completedLeads,
        rejectedLeads,
        inProgressLeads,
        approvalRate,
        leadsLast7Days,
        avgReviewHours,
        efficiencyScore,
      };
    });

    stats.sort((a, b) => b.efficiencyScore - a.efficiencyScore);

    return {
      contractors: stats.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })),
    };
  }
}
