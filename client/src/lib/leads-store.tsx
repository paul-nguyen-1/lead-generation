import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { SEED_LEADS, type Lead } from '#/data/leads'

const STORAGE_KEY = 'lead-pipeline:leads'

interface LeadsContextValue {
  leads: Array<Lead>
  assignLead: (leadId: string, contractorId: string) => void
  toggleCriterion: (leadId: string, criterionId: string) => void
  setContractorNotes: (leadId: string, notes: string) => void
  setAdminNotes: (leadId: string, notes: string) => void
  submitForApproval: (leadId: string) => void
  sendBackToContractor: (leadId: string) => void
  approveLead: (leadId: string) => void
  rejectLead: (leadId: string) => void
  resetSampleData: () => void
}

const LeadsContext = createContext<LeadsContextValue | null>(null)

function nowIso() {
  return new Date().toISOString()
}

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Array<Lead>>(SEED_LEADS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setLeads(JSON.parse(raw) as Array<Lead>)
      }
    } catch {
      // malformed or unavailable storage - keep the seed data
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
  }, [leads, hydrated])

  function updateLead(leadId: string, updater: (lead: Lead) => Lead) {
    setLeads((current) =>
      current.map((lead) => (lead.id === leadId ? updater(lead) : lead)),
    )
  }

  function assignLead(leadId: string, contractorId: string) {
    updateLead(leadId, (lead) => ({ ...lead, assignedTo: contractorId }))
  }

  function toggleCriterion(leadId: string, criterionId: string) {
    updateLead(leadId, (lead) => ({
      ...lead,
      status: lead.status === 'new' ? 'contractor_review' : lead.status,
      criteria: lead.criteria.map((criterion) =>
        criterion.id === criterionId
          ? { ...criterion, met: !criterion.met }
          : criterion,
      ),
    }))
  }

  function setContractorNotes(leadId: string, notes: string) {
    updateLead(leadId, (lead) => ({
      ...lead,
      status: lead.status === 'new' ? 'contractor_review' : lead.status,
      contractorNotes: notes,
    }))
  }

  function setAdminNotes(leadId: string, notes: string) {
    updateLead(leadId, (lead) => ({ ...lead, adminNotes: notes }))
  }

  function submitForApproval(leadId: string) {
    updateLead(leadId, (lead) => ({
      ...lead,
      status: 'pending_approval',
      contractorReviewedAt: nowIso(),
    }))
  }

  function sendBackToContractor(leadId: string) {
    updateLead(leadId, (lead) => ({ ...lead, status: 'contractor_review' }))
  }

  function approveLead(leadId: string) {
    const timestamp = nowIso()
    updateLead(leadId, (lead) => ({
      ...lead,
      status: 'completed',
      adminDecision: 'approved',
      adminReviewedAt: timestamp,
      emailStatus: 'sent',
      emailSentAt: timestamp,
    }))
  }

  function rejectLead(leadId: string) {
    updateLead(leadId, (lead) => ({
      ...lead,
      status: 'rejected',
      adminDecision: 'rejected',
      adminReviewedAt: nowIso(),
    }))
  }

  function resetSampleData() {
    window.localStorage.removeItem(STORAGE_KEY)
    setLeads(SEED_LEADS)
  }

  const value: LeadsContextValue = {
    leads,
    assignLead,
    toggleCriterion,
    setContractorNotes,
    setAdminNotes,
    submitForApproval,
    sendBackToContractor,
    approveLead,
    rejectLead,
    resetSampleData,
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
