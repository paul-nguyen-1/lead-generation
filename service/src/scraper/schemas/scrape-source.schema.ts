import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SourceType } from '../enums/source-type.enum';

export type ScrapeSourceDocument = HydratedDocument<ScrapeSource>;

@Schema({ timestamps: true })
export class ScrapeSource {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: SourceType })
  type: SourceType;

  @Prop({ type: [String], required: true })
  startUrls: string[];

  @Prop({ type: [String], required: true })
  allowedDomains: string[];

  @Prop({ type: Object, default: {} })
  selectors: Record<string, string>;

  @Prop({
    type: [String],
    default: ['/contact', '/contact-us', '/about', '/about-us'],
  })
  contactPaths: string[];

  @Prop({ default: 2, min: 0, max: 5 })
  maxDepth: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const ScrapeSourceSchema = SchemaFactory.createForClass(ScrapeSource);
