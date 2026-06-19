/** Default review criteria applied to every newly logged lead. */
export const DEFAULT_LEAD_CRITERIA: ReadonlyArray<{
  id: string;
  label: string;
}> = [
  { id: 'budget', label: 'Budget confirmed' },
  { id: 'timeline', label: 'Timeline is realistic' },
  { id: 'contact', label: 'Contact info verified' },
  { id: 'fit', label: 'Project fits our services' },
];
