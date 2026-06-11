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
  address: string
  website: string
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
