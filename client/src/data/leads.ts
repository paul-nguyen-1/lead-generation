export type LeadStatus =
  | 'new'
  | 'contractor_review'
  | 'pending_approval'
  | 'completed'
  | 'rejected'

export type EmailStatus = 'not_sent' | 'sent'

export type AdminDecision = 'approved' | 'rejected' | null

export interface Criterion {
  id: string
  label: string
  met: boolean
}

export interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  source: string
  notes: string
  dateAdded: string
  status: LeadStatus
  assignedTo: string
  criteria: Array<Criterion>
  contractorNotes: string
  contractorReviewedAt: string | null
  adminNotes: string
  adminDecision: AdminDecision
  adminReviewedAt: string | null
  emailStatus: EmailStatus
  emailSentAt: string | null
}

export const DEFAULT_CRITERIA: Array<Omit<Criterion, 'met'>> = [
  { id: 'budget', label: 'Budget confirmed' },
  { id: 'timeline', label: 'Timeline is realistic' },
  { id: 'contact', label: 'Contact info verified' },
  { id: 'fit', label: 'Project fits our services' },
]

export const STATUS_META: Record<
  LeadStatus,
  { label: string; color: string }
> = {
  new: { label: 'New', color: '#3b82f6' },
  contractor_review: { label: 'In Review', color: '#d97706' },
  pending_approval: { label: 'Pending Approval', color: '#7c3aed' },
  completed: { label: 'Completed', color: '#16a34a' },
  rejected: { label: 'Rejected', color: '#dc2626' },
}

function makeCriteria(met: Record<string, boolean> = {}): Array<Criterion> {
  return DEFAULT_CRITERIA.map((criterion) => ({
    ...criterion,
    met: met[criterion.id] ?? false,
  }))
}

export const SEED_LEADS: Array<Lead> = [
  {
    id: 'lead-001',
    name: 'Maria Chen',
    company: 'Chen Family Residence',
    email: 'maria.chen@example.com',
    phone: '(555) 201-3344',
    source: 'Website Form',
    notes:
      'Interested in a full kitchen remodel, mentioned wanting quotes from 2-3 contractors.',
    dateAdded: '2026-06-08',
    status: 'new',
    assignedTo: 'contractor-1',
    criteria: makeCriteria(),
    contractorNotes: '',
    contractorReviewedAt: null,
    adminNotes: '',
    adminDecision: null,
    adminReviewedAt: null,
    emailStatus: 'not_sent',
    emailSentAt: null,
  },
  {
    id: 'lead-002',
    name: 'Devon Walker',
    company: 'Walker Properties LLC',
    email: 'devon@walkerprops.com',
    phone: '(555) 884-1290',
    source: 'Referral',
    notes:
      'Owns 3 rental units, wants bathroom upgrades across all units before the next lease cycle.',
    dateAdded: '2026-06-08',
    status: 'new',
    assignedTo: 'contractor-2',
    criteria: makeCriteria(),
    contractorNotes: '',
    contractorReviewedAt: null,
    adminNotes: '',
    adminDecision: null,
    adminReviewedAt: null,
    emailStatus: 'not_sent',
    emailSentAt: null,
  },
  {
    id: 'lead-003',
    name: 'Priya Natarajan',
    company: '',
    email: 'priya.n@example.com',
    phone: '(555) 432-7765',
    source: 'Google Ads',
    notes:
      'Asked about deck installation, budget unclear from the form submission.',
    dateAdded: '2026-06-07',
    status: 'new',
    assignedTo: 'contractor-1',
    criteria: makeCriteria(),
    contractorNotes: '',
    contractorReviewedAt: null,
    adminNotes: '',
    adminDecision: null,
    adminReviewedAt: null,
    emailStatus: 'not_sent',
    emailSentAt: null,
  },
  {
    id: 'lead-004',
    name: 'Jordan Lee',
    company: 'Lee & Sons Auto Body',
    email: 'jordan@leesons.com',
    phone: '(555) 110-2298',
    source: 'Facebook Ad',
    notes: 'Wants to expand the shop with a new paint booth bay.',
    dateAdded: '2026-06-06',
    status: 'contractor_review',
    assignedTo: 'contractor-1',
    criteria: makeCriteria({ contact: true, fit: true }),
    contractorNotes:
      'Verified phone and email - both active. Project is a commercial buildout, fits our services. Still need to confirm budget range and timeline before submitting.',
    contractorReviewedAt: null,
    adminNotes: '',
    adminDecision: null,
    adminReviewedAt: null,
    emailStatus: 'not_sent',
    emailSentAt: null,
  },
  {
    id: 'lead-005',
    name: 'Sandra Ortiz',
    company: '',
    email: 'sandra.ortiz@example.com',
    phone: '(555) 998-2210',
    source: 'Phone Inquiry',
    notes:
      'Called in asking about exterior painting for a two-story home, wants the work done before summer ends.',
    dateAdded: '2026-06-05',
    status: 'contractor_review',
    assignedTo: 'contractor-2',
    criteria: makeCriteria({ budget: true, contact: true }),
    contractorNotes:
      'Budget confirmed at $8-12k during the call. Email on file bounced once - reached her by phone instead, will need a working email for follow-up.',
    contractorReviewedAt: null,
    adminNotes: '',
    adminDecision: null,
    adminReviewedAt: null,
    emailStatus: 'not_sent',
    emailSentAt: null,
  },
  {
    id: 'lead-006',
    name: 'Marcus Webb',
    company: 'Webb Family Trust',
    email: 'marcus.webb@example.com',
    phone: '(555) 320-7741',
    source: 'Referral',
    notes:
      'Referred by a past client - wants a full basement finishing project.',
    dateAdded: '2026-06-03',
    status: 'pending_approval',
    assignedTo: 'contractor-1',
    criteria: makeCriteria({
      budget: true,
      timeline: true,
      contact: true,
      fit: true,
    }),
    contractorNotes:
      'All criteria check out. Budget is solid ($35k), timeline is flexible (start within 2 months), contact verified via email and phone. Strong fit - basement finishing is one of our core services. Recommend approval.',
    contractorReviewedAt: '2026-06-04T15:30:00.000Z',
    adminNotes: '',
    adminDecision: null,
    adminReviewedAt: null,
    emailStatus: 'not_sent',
    emailSentAt: null,
  },
  {
    id: 'lead-007',
    name: 'Elena Garcia',
    company: 'Garcia Dental Group',
    email: 'elena@garciadental.com',
    phone: '(555) 762-0093',
    source: 'Website Form',
    notes:
      'Looking to renovate the waiting room and two exam rooms in their dental practice.',
    dateAdded: '2026-06-02',
    status: 'pending_approval',
    assignedTo: 'contractor-2',
    criteria: makeCriteria({ timeline: true, contact: true, fit: true }),
    contractorNotes:
      "Timeline confirmed - they want to start in Q3. Contact info verified. Project fits our commercial renovation services. Budget wasn't explicitly confirmed, but the practice has done similar projects with us before. Flagging for your review on the budget point.",
    contractorReviewedAt: '2026-06-03T10:15:00.000Z',
    adminNotes: '',
    adminDecision: null,
    adminReviewedAt: null,
    emailStatus: 'not_sent',
    emailSentAt: null,
  },
  {
    id: 'lead-008',
    name: 'Tom Becker',
    company: 'Becker Landscaping Supply',
    email: 'tom@beckerlandscaping.com',
    phone: '(555) 554-9981',
    source: 'Trade Show',
    notes: 'Wants a new retail showroom built out at their supply yard.',
    dateAdded: '2026-05-28',
    status: 'completed',
    assignedTo: 'contractor-1',
    criteria: makeCriteria({
      budget: true,
      timeline: true,
      contact: true,
      fit: true,
    }),
    contractorNotes:
      'All criteria met. Budget, timeline and contact info confirmed. Great fit for our commercial build-out team.',
    contractorReviewedAt: '2026-05-29T09:00:00.000Z',
    adminNotes:
      'Approved - similar scope to the Henderson project from last year. Sales team notified.',
    adminDecision: 'approved',
    adminReviewedAt: '2026-05-30T13:45:00.000Z',
    emailStatus: 'sent',
    emailSentAt: '2026-05-30T13:46:00.000Z',
  },
  {
    id: 'lead-009',
    name: 'Renee Park',
    company: '',
    email: 'renee.park@example.com',
    phone: '(555) 217-6630',
    source: 'Instagram Ad',
    notes: 'Asked about a backyard patio and outdoor kitchen combo.',
    dateAdded: '2026-05-25',
    status: 'completed',
    assignedTo: 'contractor-2',
    criteria: makeCriteria({
      budget: true,
      timeline: true,
      contact: true,
      fit: true,
    }),
    contractorNotes:
      'Budget confirmed at $22k, timeline is open, contact info verified via text reply. Solid fit for our outdoor living team.',
    contractorReviewedAt: '2026-05-26T11:20:00.000Z',
    adminNotes: 'Approved - send the standard outdoor living intro packet.',
    adminDecision: 'approved',
    adminReviewedAt: '2026-05-27T16:00:00.000Z',
    emailStatus: 'sent',
    emailSentAt: '2026-05-27T16:02:00.000Z',
  },
  {
    id: 'lead-010',
    name: 'Chris Daniels',
    company: '',
    email: 'chris.d@example.com',
    phone: '(555) 109-4456',
    source: 'Website Form',
    notes:
      'Submitted a form asking about pricing for a new roof, but provided a disconnected phone number.',
    dateAdded: '2026-05-20',
    status: 'rejected',
    assignedTo: 'contractor-1',
    criteria: makeCriteria({ fit: true }),
    contractorNotes:
      "Phone number is disconnected and the email bounced as well. No reliable way to reach this lead. Project type fits our services but we can't verify any contact info.",
    contractorReviewedAt: '2026-05-21T08:30:00.000Z',
    adminNotes:
      'Agreed - no working contact info, not worth pursuing further. Rejecting.',
    adminDecision: 'rejected',
    adminReviewedAt: '2026-05-21T14:10:00.000Z',
    emailStatus: 'not_sent',
    emailSentAt: null,
  },
]
