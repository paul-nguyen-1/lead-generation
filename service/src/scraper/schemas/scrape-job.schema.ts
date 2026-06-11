import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { JobStatus } from '../enums/job-status.enum';

export type ScrapeJobDocument = HydratedDocument<ScrapeJob>;

@Schema({ _id: false })
export class ScrapeJobStats {
  @Prop({ default: 0 })
  pagesVisited: number;

  @Prop({ default: 0 })
  pagesSkippedRobots: number;

  @Prop({ default: 0 })
  leadsFound: number;

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

  @Prop({ type: ScrapeJobStatsSchema, default: () => ({}) })
  stats: ScrapeJobStats;

  @Prop({ type: String, default: null })
  error: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  triggeredBy: Types.ObjectId;
}

export const ScrapeJobSchema = SchemaFactory.createForClass(ScrapeJob);
