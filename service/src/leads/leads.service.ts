import {
  BadRequestException,
  ForbiddenException,
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
  draftLeads: number;
  approvalRate: number | null;
  leadsLast7Days: number;
  avgReviewHours: number | null;
  efficiencyScore: number;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectModel(Lead.name)
    private readonly leadModel: Model<LeadDocument>,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  async createLead(dto: CreateLeadDto, userId: string): Promise<LeadDocument> {
    if (!dto.firstName && !dto.lastName && !dto.businessName) {
      throw new BadRequestException(
        'At least one of firstName, lastName, or businessName is required',
      );
    }

    return this.leadModel.create({
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      jobTitle: dto.jobTitle ?? null,
      email: dto.email ?? null,
      linkedinUrl: dto.linkedinUrl ?? null,
      businessName: dto.businessName ?? null,
      website: dto.website ?? null,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      industry: dto.industry ?? null,
      notes: dto.notes ?? '',
      extraFields: dto.extraFields ?? [],
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
      .findByIdAndUpdate(id, { status }, { returnDocument: 'after' })
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async assignLead(id: string, userId: string): Promise<LeadDocument> {
    const lead = await this.leadModel
      .findByIdAndUpdate(
        id,
        { assignedTo: new Types.ObjectId(userId) },
        { returnDocument: 'after' },
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

  async autoAssignDraft(leadId: string): Promise<LeadDocument> {
    const drafters = await this.usersService.findEligibleDrafters();
    if (drafters.length === 0) {
      throw new BadRequestException(
        'No contractors have both Leads and Draft Email access enabled',
      );
    }
    // Balance load by picking the drafter with fewest currently assigned leads
    const counts = await Promise.all(
      drafters.map((d) =>
        this.leadModel.countDocuments({ assignedTo: d._id }).exec(),
      ),
    );
    const minIndex = counts.indexOf(Math.min(...counts));
    const chosen = drafters[minIndex];
    return this.assignLead(leadId, chosen._id.toString());
  }

  async saveDraftEmail(
    id: string,
    subject: string,
    body: string,
    callerId: string,
    callerRole: Role,
  ): Promise<LeadDocument> {
    if (callerRole === Role.Contractor) {
      const caller = await this.usersService.findById(callerId);
      if (!caller?.permissions?.draftEmailAccess) {
        throw new ForbiddenException(
          'Draft Email access is required to save a draft',
        );
      }
    }

    const lead = await this.leadModel
      .findByIdAndUpdate(
        id,
        {
          draftEmailSubject: subject,
          draftEmailBody: body,
          draftEmailCreatedAt: new Date(),
          emailStatus: EmailStatus.Draft,
          // Auto-assign the lead to the contractor saving the draft
          ...(callerRole === Role.Contractor && {
            assignedTo: new Types.ObjectId(callerId),
          }),
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async setLeadAdminNotes(id: string, notes: string): Promise<LeadDocument> {
    const lead = await this.leadModel
      .findByIdAndUpdate(id, { adminNotes: notes }, { returnDocument: 'after' })
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
        { returnDocument: 'after' },
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
        { returnDocument: 'after' },
      )
      .exec();
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async approveLead(id: string, adminId: string): Promise<LeadDocument> {
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
          approvedBy: new Types.ObjectId(adminId),
        },
        { returnDocument: 'after' },
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
        { returnDocument: 'after' },
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
      const draftLeads = contractorLeads.filter(
        (lead) => lead.draftEmailCreatedAt !== null,
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
        draftLeads,
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
