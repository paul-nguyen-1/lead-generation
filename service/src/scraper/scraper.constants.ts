export const SCRAPE_QUEUE = 'scrape';
export const SCRAPE_TASK = 'scrape-task';

export const SCRAPE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 1000,
};
