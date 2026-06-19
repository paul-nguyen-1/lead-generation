export type LeadStatus =
  | 'new'
  | 'contractor_review'
  | 'pending_approval'
  | 'completed'
  | 'rejected'

export type EmailStatus = 'not_sent' | 'draft' | 'sent'

export type AdminDecision = 'approved' | 'rejected' | null

export interface Criterion {
  id: string
  label: string
  met: boolean
}

export interface ExtraField {
  label: string
  value: string
}

export interface Lead {
  id: string
  firstName: string
  lastName: string
  name: string
  company: string
  jobTitle: string
  email: string
  linkedinUrl: string
  phone: string
  address: string
  website: string
  industry: string
  source: string
  notes: string
  extraFields: Array<ExtraField>
  dateAdded: string
  dateUpdated: string
  status: LeadStatus
  createdBy: string
  assignedTo: string
  criteria: Array<Criterion>
  contractorNotes: string
  contractorReviewedAt: string | null
  adminNotes: string
  adminDecision: AdminDecision
  adminReviewedAt: string | null
  emailStatus: EmailStatus
  emailSentAt: string | null
  approvedBy: string | null
  draftEmailSubject: string
  draftEmailBody: string
  draftEmailCreatedAt: string | null
}

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
