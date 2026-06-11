import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { JobStatus } from '../enums/job-status.enum';
import { DEFAULT_LEAD_GENERATION_LIMIT } from '../scraper.constants';

export type ScrapeJobDocument = HydratedDocument<ScrapeJob>;

@Schema({ _id: false })
export class ScrapeJobStats {
  @Prop({ default: 0 })
  pagesVisited: number;

  @Prop({ default: 0 })
  pagesSkippedRobots: number;

  @Prop({ default: 0 })
  leadsFound: number;

  /** New, non-duplicate leads inserted by this job. */
  @Prop({ default: 0 })
  leadsCreated: number;

  /** Leads that already existed in the database (deduped, not re-counted). */
  @Prop({ default: 0 })
  leadsDuplicate: number;

  @Prop({ default: 0 })
  errors: number;
}

export const ScrapeJobStatsSchema =
  SchemaFactory.createForClass(ScrapeJobStats);

@Schema({ timestamps: true })
export class ScrapeJob {
  @Prop({ type: Types.ObjectId, ref: 'ScrapeSource', required: true })
  sourceId: Types.ObjectId;

  @Prop({ required: true, enum: JobStatus, default: JobStatus.Running })
  status: JobStatus;

  @Prop({ default: Date.now })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  finishedAt: Date | null;

  /** Number of queued/in-flight scrape tasks belonging to this job; 0 means done. */
  @Prop({ default: 0 })
  pendingTasks: number;

  /** Stop creating new leads once stats.leadsCreated reaches this. */
  @Prop({ default: DEFAULT_LEAD_GENERATION_LIMIT })
  leadLimit: number;

  @Prop({ type: ScrapeJobStatsSchema, default: () => ({}) })
  stats: ScrapeJobStats;

  @Prop({ type: String, default: null })
  error: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  triggeredBy: Types.ObjectId;
}

export const ScrapeJobSchema = SchemaFactory.createForClass(ScrapeJob);
