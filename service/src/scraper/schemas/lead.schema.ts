import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LeadStatus } from '../enums/lead-status.enum';

export type LeadDocument = HydratedDocument<Lead>;

@Schema({ timestamps: true })
export class Lead {
  @Prop({ type: String, trim: true, default: null })
  businessName: string | null;

  @Prop({ type: String, trim: true, lowercase: true, default: null })
  email: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone: string | null;

  @Prop({ type: String, trim: true, default: null })
  address: string | null;

  @Prop({ type: String, trim: true, default: null })
  website: string | null;

  @Prop({ type: String, trim: true, default: null })
  contactName: string | null;

  @Prop({ required: true })
  sourceUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'ScrapeSource', required: true })
  sourceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ScrapeJob', required: true })
  jobId: Types.ObjectId;

  @Prop({ required: true, enum: LeadStatus, default: LeadStatus.New })
  status: LeadStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo: Types.ObjectId | null;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.index({ sourceId: 1, email: 1 });
LeadSchema.index({ sourceId: 1, website: 1 });
LeadSchema.index({ status: 1 });
