import { SourceType } from './enums/source-type.enum';

export interface ScrapeTaskData {
  scrapeJobId: string;
  sourceId: string;
  url: string;
  type: SourceType;
  depth: number;
}
