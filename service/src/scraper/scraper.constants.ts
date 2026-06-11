export const SCRAPE_QUEUE = 'scrape';
export const SCRAPE_TASK = 'scrape-task';

export const SCRAPE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 1000,
};

/** Default review criteria applied to every newly discovered lead. */
export const DEFAULT_LEAD_CRITERIA: ReadonlyArray<{
  id: string;
  label: string;
}> = [
  { id: 'budget', label: 'Budget confirmed' },
  { id: 'timeline', label: 'Timeline is realistic' },
  { id: 'contact', label: 'Contact info verified' },
  { id: 'fit', label: 'Project fits our services' },
];

/** Default cap on new (non-duplicate) leads per "Generate Leads" run. */
export const DEFAULT_LEAD_GENERATION_LIMIT = 15;
