import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch } from './api'
import { useAuth } from './auth-store'
import type {
  AdminDecision,
  Criterion,
  EmailStatus,
  Lead,
  LeadStatus,
} from '#/data/leads'

export interface CreateLeadInput {
  businessName?: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  website?: string
  source?: string
  notes?: string
}

interface LeadsContextValue {
  leads: Array<Lead>
  loading: boolean
  refetch: () => void
  createLead: (input: CreateLeadInput) => Promise<void>
  assignLead: (leadId: string, contractorId: string) => Promise<void>
  toggleCriterion: (leadId: string, criterionId: string) => Promise<void>
  setContractorNotes: (leadId: string, notes: string) => Promise<void>
  setAdminNotes: (leadId: string, notes: string) => Promise<void>
  saveDraftEmail: (leadId: string, subject: string, body: string) => Promise<void>
  autoAssignDraft: (leadId: string) => Promise<void>
  submitForApproval: (leadId: string) => Promise<void>
  sendBackToContractor: (leadId: string) => Promise<void>
  approveLead: (leadId: string) => Promise<void>
  rejectLead: (leadId: string) => Promise<void>
}

const LeadsContext = createContext<LeadsContextValue | null>(null)

interface ApiLead {
  _id: string
  businessName: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  source: string | null
  notes: string
  status: LeadStatus
  createdBy: string
  assignedTo: string | null
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
  createdAt: string
  updatedAt: string
}

function mapLead(raw: ApiLead): Lead {
  return {
    id: raw._id,
    name: raw.contactName ?? raw.businessName ?? 'Unknown',
    company: raw.contactName ? (raw.businessName ?? '') : '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    address: raw.address ?? '',
    website: raw.website ?? '',
    source: raw.source ?? '',
    notes: raw.notes,
    dateAdded: raw.createdAt,
    dateUpdated: raw.updatedAt,
    status: raw.status,
    createdBy: raw.createdBy ?? '',
    assignedTo: raw.assignedTo ?? '',
    criteria: raw.criteria,
    contractorNotes: raw.contractorNotes,
    contractorReviewedAt: raw.contractorReviewedAt,
    adminNotes: raw.adminNotes,
    adminDecision: raw.adminDecision,
    adminReviewedAt: raw.adminReviewedAt,
    emailStatus: raw.emailStatus,
    emailSentAt: raw.emailSentAt,
    approvedBy: raw.approvedBy ?? null,
    draftEmailSubject: raw.draftEmailSubject ?? '',
    draftEmailBody: raw.draftEmailBody ?? '',
    draftEmailCreatedAt: raw.draftEmailCreatedAt ?? null,
  }
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [leads, setLeads] = useState<Array<Lead>>([])
  const [loading, setLoading] = useState(false)
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    if (status !== 'authenticated') {
      setLeads([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    apiFetch<{ items: Array<ApiLead> }>('/leads/leads?limit=100')
      .then((data) => {
        if (!cancelled) setLeads(data.items.map(mapLead))
      })
      .catch(() => {
        if (!cancelled) setLeads([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [status, refreshIndex])

  function refetch() {
    setRefreshIndex((index) => index + 1)
  }

  function applyUpdate(leadId: string, updated: ApiLead) {
    setLeads((current) =>
      current.map((lead) => (lead.id === leadId ? mapLead(updated) : lead)),
    )
  }

  async function createLead(input: CreateLeadInput) {
    const created = await apiFetch<ApiLead>('/leads', {
      method: 'POST',
      body: input,
    })
    setLeads((current) => [...current, mapLead(created)])
  }

  async function assignLead(leadId: string, contractorId: string) {
    const updated = await apiFetch<ApiLead>(
      `/leads/${leadId}/assign`,
      { method: 'PATCH', body: { userId: contractorId } },
    )
    applyUpdate(leadId, updated)
  }

  async function toggleCriterion(leadId: string, criterionId: string) {
    const updated = await apiFetch<ApiLead>(
      `/leads/${leadId}/criteria`,
      { method: 'PATCH', body: { criterionId } },
    )
    applyUpdate(leadId, updated)
  }

  async function setContractorNotes(leadId: string, notes: string) {
    const updated = await apiFetch<ApiLead>(
      `/leads/${leadId}/contractor-notes`,
      { method: 'PATCH', body: { notes } },
    )
    applyUpdate(leadId, updated)
  }

  async function setAdminNotes(leadId: string, notes: string) {
    const updated = await apiFetch<ApiLead>(
      `/leads/${leadId}/admin-notes`,
      { method: 'PATCH', body: { notes } },
    )
    applyUpdate(leadId, updated)
  }

  async function saveDraftEmail(leadId: string, subject: string, body: string) {
    const updated = await apiFetch<ApiLead>(
      `/leads/${leadId}/draft-email`,
      { method: 'PATCH', body: { subject, body } },
    )
    applyUpdate(leadId, updated)
  }

  async function autoAssignDraft(leadId: string) {
    const updated = await apiFetch<ApiLead>(
      `/leads/${leadId}/auto-assign-draft`,
      { method: 'PATCH' },
    )
    applyUpdate(leadId, updated)
  }

  async function submitForApproval(leadId: string) {
    const updated = await apiFetch<ApiLead>(
      `/leads/${leadId}/submit`,
      { method: 'PATCH' },
    )
    applyUpdate(leadId, updated)
  }

  async function sendBackToContractor(leadId: string) {
    const updated = await apiFetch<ApiLead>(
      `/leads/${leadId}/send-back`,
      { method: 'PATCH' },
    )
    applyUpdate(leadId, updated)
  }

  async function approveLead(leadId: string) {
    const updated = await apiFetch<ApiLead>(
      `/leads/${leadId}/approve`,
      { method: 'PATCH' },
    )
    applyUpdate(leadId, updated)
  }

  async function rejectLead(leadId: string) {
    const updated = await apiFetch<ApiLead>(
      `/leads/${leadId}/reject`,
      { method: 'PATCH' },
    )
    applyUpdate(leadId, updated)
  }

  const value: LeadsContextValue = {
    leads,
    loading,
    refetch,
    createLead,
    assignLead,
    toggleCriterion,
    setContractorNotes,
    setAdminNotes,
    saveDraftEmail,
    autoAssignDraft,
    submitForApproval,
    sendBackToContractor,
    approveLead,
    rejectLead,
  }

  return (
    <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>
  )
}

export function useLeads() {
  const context = useContext(LeadsContext)
  if (!context) {
    throw new Error('useLeads must be used within a LeadsProvider')
  }
  return context
}
