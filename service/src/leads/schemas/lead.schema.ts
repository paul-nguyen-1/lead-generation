import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DEFAULT_LEAD_CRITERIA } from '../leads.constants';
import { AdminDecision } from '../enums/admin-decision.enum';
import { EmailStatus } from '../enums/email-status.enum';
import { LeadStatus } from '../enums/lead-status.enum';

export type LeadDocument = HydratedDocument<Lead>;

@Schema({ _id: false })
export class ExtraField {
  @Prop({ required: true })
  label: string;

  @Prop({ default: '' })
  value: string;
}

export const ExtraFieldSchema = SchemaFactory.createForClass(ExtraField);

@Schema({ _id: false })
export class Criterion {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  label: string;

  @Prop({ default: false })
  met: boolean;
}

export const CriterionSchema = SchemaFactory.createForClass(Criterion);

export function defaultLeadCriteria(): Array<Criterion> {
  return DEFAULT_LEAD_CRITERIA.map((criterion) => ({
    ...criterion,
    met: false,
  }));
}

@Schema({ timestamps: true })
export class Lead {
  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: String, trim: true, default: null })
  firstName: string | null;

  @Prop({ type: String, trim: true, default: null })
  lastName: string | null;

  @Prop({ type: String, trim: true, default: null })
  jobTitle: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email: string | null;

  @Prop({ type: String, trim: true, default: null })
  linkedinUrl: string | null;

  @Prop({ type: String, trim: true, default: null })
  businessName: string | null;

  @Prop({ type: String, trim: true, default: null })
  website: string | null;

  @Prop({ type: String, trim: true, default: null })
  address: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone: string | null;

  @Prop({ type: String, trim: true, default: null })
  industry: string | null;

  @Prop({ type: String, trim: true, default: null })
  contactName: string | null;

  @Prop({ type: String, trim: true, default: null })
  source: string | null;

  @Prop({ type: String, trim: true, default: '' })
  notes: string;

  @Prop({ type: [ExtraFieldSchema], default: [] })
  extraFields: Array<ExtraField>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true, enum: LeadStatus, default: LeadStatus.New })
  status: LeadStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo: Types.ObjectId | null;

  @Prop({ type: [CriterionSchema], default: defaultLeadCriteria })
  criteria: Array<Criterion>;

  @Prop({ type: String, default: '' })
  contractorNotes: string;

  @Prop({ type: Date, default: null })
  contractorReviewedAt: Date | null;

  @Prop({ type: String, default: '' })
  adminNotes: string;

  @Prop({ type: String, enum: AdminDecision, default: null })
  adminDecision: AdminDecision | null;

  @Prop({ type: Date, default: null })
  adminReviewedAt: Date | null;

  @Prop({ type: String, enum: EmailStatus, default: EmailStatus.NotSent })
  emailStatus: EmailStatus;

  @Prop({ type: Date, default: null })
  emailSentAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy: Types.ObjectId | null;

  @Prop({ type: String, default: '' })
  draftEmailSubject: string;

  @Prop({ type: String, default: '' })
  draftEmailBody: string;

  @Prop({ type: Date, default: null })
  draftEmailCreatedAt: Date | null;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.index({ createdBy: 1 });
LeadSchema.index({ status: 1 });
